import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';

const AuthContext = createContext(null);

// Only this email can access admin features
const ADMIN_EMAIL = 'lolibunge@gmail.com';

const BARN_ID = import.meta.env.VITE_BARN_ID || 'main-barn';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const derivePlayerNameFromEmail = (emailLower) => {
  const safe = normalizeEmail(emailLower);
  if (!safe) return 'Jugador';
  const localPart = safe.split('@')[0] || '';
  if (!localPart) return 'Jugador';
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'Jugador';
};

async function ensurePlayerRecordForUser(firebaseUser) {
  if (!db || !firebaseUser) return;

  const uid = firebaseUser.uid;
  const email = String(firebaseUser.email || '').trim();
  const emailLower = normalizeEmail(email);
  if (!uid || !emailLower) return;

  const playersCol = collection(db, `barns/${BARN_ID}/players`);

  // 1) If a player already exists with this email, link it to the uid.
  let existing = null;
  try {
    const q1 = query(playersCol, where('emailLower', '==', emailLower), limit(1));
    const s1 = await getDocs(q1);
    if (!s1.empty) existing = s1.docs[0];
  } catch {
    // Ignore: field may not exist yet in older data.
  }

  if (!existing) {
    try {
      const q2 = query(playersCol, where('email', '==', email), limit(1));
      const s2 = await getDocs(q2);
      if (!s2.empty) existing = s2.docs[0];
    } catch {
      // Ignore
    }
  }

  if (existing) {
    const playerRef = doc(db, `barns/${BARN_ID}/players`, existing.id);
    const data = existing.data() || {};
    const patch = {};

    if (data.uid !== uid) patch.uid = uid;
    if (String(data.email || '').trim() !== email) patch.email = email;
    if (String(data.emailLower || '') !== emailLower) patch.emailLower = emailLower;
    if (data.active !== true) patch.active = true;

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = serverTimestamp();
      await updateDoc(playerRef, patch);
    }
    return;
  }

  // 2) Otherwise create (or update) a player doc using uid as the document id.
  const playerRef = doc(db, `barns/${BARN_ID}/players`, uid);
  const snap = await getDoc(playerRef);

  const baseData = {
    uid,
    email,
    emailLower,
    active: true,
  };

  if (!snap.exists()) {
    await setDoc(playerRef, {
      ...baseData,
      name: derivePlayerNameFromEmail(emailLower),
      level: 0,
      createdAt: serverTimestamp(),
    });
    return;
  }

  const existingData = snap.data() || {};
  const update = {};
  if (existingData.uid !== uid) update.uid = uid;
  if (String(existingData.email || '').trim() !== email) update.email = email;
  if (String(existingData.emailLower || '') !== emailLower) update.emailLower = emailLower;
  if (existingData.active !== true) update.active = true;
  if (!existingData.name) update.name = derivePlayerNameFromEmail(emailLower);
  if (typeof existingData.level !== 'number') update.level = 0;

  if (Object.keys(update).length > 0) {
    update.updatedAt = serverTimestamp();
    await updateDoc(playerRef, update);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastEnsuredUidRef = useRef(null);

  useEffect(() => {
    // If Firebase isn't configured, stop loading
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Check if current user is admin
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (!isFirebaseConfigured || !user?.uid) return;
    if (lastEnsuredUidRef.current === user.uid) return;
    lastEnsuredUidRef.current = user.uid;

    ensurePlayerRecordForUser(user).catch((err) => {
      console.warn('Could not auto-provision player record:', err);
    });
  }, [user?.uid, isFirebaseConfigured, user]);

  const login = async (email, password) => {
    if (!auth) throw new Error('Firebase not configured');
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email, password) => {
    if (!auth) throw new Error('Firebase not configured');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Best-effort: create/link a Player record so the user can RSVP immediately.
    ensurePlayerRecordForUser(cred.user).catch((err) => {
      console.warn('Could not auto-provision player record after signup:', err);
    });
    return cred;
  };

  const logout = async () => {
    if (!auth) throw new Error('Firebase not configured');
    return signOut(auth);
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    isFirebaseConfigured,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
