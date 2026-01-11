import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';

const AuthContext = createContext(null);

// Only this email can access admin features
const ADMIN_EMAIL = 'lolibunge@gmail.com';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const login = async (email, password) => {
    if (!auth) throw new Error('Firebase not configured');
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email, password) => {
    if (!auth) throw new Error('Firebase not configured');
    return createUserWithEmailAndPassword(auth, email, password);
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
