import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where,
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const BARN_ID = import.meta.env.VITE_BARN_ID || 'main-barn';

// ============ HORSES ============

export function useHorses() {
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const horsesRef = collection(db, `barns/${BARN_ID}/horses`);
    const q = query(horsesRef, where('active', '==', true), orderBy('name'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const horsesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHorses(horsesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching horses:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { horses, loading, error };
}

export function useHorse(horseId) {
  const [horse, setHorse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!horseId) {
      setLoading(false);
      return;
    }

    const horseRef = doc(db, `barns/${BARN_ID}/horses`, horseId);
    
    const unsubscribe = onSnapshot(horseRef,
      (doc) => {
        if (doc.exists()) {
          setHorse({ id: doc.id, ...doc.data() });
        } else {
          setHorse(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching horse:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [horseId]);

  return { horse, loading, error };
}

export async function addHorse(horseData) {
  const horsesRef = collection(db, `barns/${BARN_ID}/horses`);
  return addDoc(horsesRef, {
    ...horseData,
    active: true,
    createdAt: serverTimestamp()
  });
}

export async function updateHorse(horseId, horseData) {
  const horseRef = doc(db, `barns/${BARN_ID}/horses`, horseId);
  return updateDoc(horseRef, {
    ...horseData,
    updatedAt: serverTimestamp()
  });
}

export async function deleteHorse(horseId) {
  // Soft delete - just mark as inactive
  const horseRef = doc(db, `barns/${BARN_ID}/horses`, horseId);
  return updateDoc(horseRef, { 
    active: false,
    updatedAt: serverTimestamp()
  });
}

// ============ HORSE LOGS ============

export function useHorseLogs(horseId, limit = 30) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!horseId) {
      setLoading(false);
      return;
    }

    const logsRef = collection(db, `barns/${BARN_ID}/horses/${horseId}/logs`);
    const q = query(logsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLogs(logsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching logs:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [horseId, limit]);

  return { logs, loading, error };
}

export async function addHorseLog(horseId, logData) {
  const logsRef = collection(db, `barns/${BARN_ID}/horses/${horseId}/logs`);
  return addDoc(logsRef, {
    ...logData,
    createdAt: serverTimestamp()
  });
}

export async function deleteHorseLog(horseId, logId) {
  const logRef = doc(db, `barns/${BARN_ID}/horses/${horseId}/logs`, logId);
  return deleteDoc(logRef);
}

// ============ WORKLOAD HELPERS ============

export function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

export function calculateTodayWorkload(logs) {
  const today = getTodayDateString();
  return logs
    .filter(log => log.date === today && log.type === 'workload')
    .reduce((sum, log) => sum + (log.chukkersDelta || 0), 0);
}

export function calculateWeekWorkload(logs) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  
  return logs
    .filter(log => log.date >= weekAgoStr && log.type === 'workload')
    .reduce((sum, log) => sum + (log.chukkersDelta || 0), 0);
}

// ============ PLAYERS ============

export function usePlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const playersRef = collection(db, `barns/${BARN_ID}/players`);
    const q = query(playersRef, where('active', '==', true), orderBy('name'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const playersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPlayers(playersData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching players:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { players, loading, error };
}

export async function addPlayer(playerData) {
  const playersRef = collection(db, `barns/${BARN_ID}/players`);
  return addDoc(playersRef, {
    ...playerData,
    active: true,
    createdAt: serverTimestamp()
  });
}

export async function updatePlayer(playerId, playerData) {
  const playerRef = doc(db, `barns/${BARN_ID}/players`, playerId);
  return updateDoc(playerRef, {
    ...playerData,
    updatedAt: serverTimestamp()
  });
}

export async function deletePlayer(playerId) {
  // Soft delete
  const playerRef = doc(db, `barns/${BARN_ID}/players`, playerId);
  return updateDoc(playerRef, { 
    active: false,
    updatedAt: serverTimestamp()
  });
}

// ============ PRACTICES ============

export function usePractices() {
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const practicesRef = collection(db, `barns/${BARN_ID}/practices`);
    const q = query(practicesRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const practicesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPractices(practicesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching practices:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { practices, loading, error };
}

export function usePractice(practiceId) {
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!practiceId) {
      setLoading(false);
      return;
    }

    const practiceRef = doc(db, `barns/${BARN_ID}/practices`, practiceId);
    
    const unsubscribe = onSnapshot(practiceRef,
      (doc) => {
        if (doc.exists()) {
          setPractice({ id: doc.id, ...doc.data() });
        } else {
          setPractice(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching practice:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [practiceId]);

  return { practice, loading, error };
}

export async function addPractice(practiceData) {
  const practicesRef = collection(db, `barns/${BARN_ID}/practices`);
  return addDoc(practicesRef, {
    ...practiceData,
    status: 'planned', // planned | in-progress | completed
    createdAt: serverTimestamp()
  });
}

export async function updatePractice(practiceId, practiceData) {
  const practiceRef = doc(db, `barns/${BARN_ID}/practices`, practiceId);
  return updateDoc(practiceRef, {
    ...practiceData,
    updatedAt: serverTimestamp()
  });
}

export async function deletePractice(practiceId) {
  const practiceRef = doc(db, `barns/${BARN_ID}/practices`, practiceId);
  return deleteDoc(practiceRef);
}

// Complete a practice and log workload for all horses
export async function completePractice(practiceId, practice) {
  const practiceRef = doc(db, `barns/${BARN_ID}/practices`, practiceId);
  
  // Count chukkers per horse
  const horseChukkers = {};
  practice.chukkers.forEach(chukker => {
    chukker.assignments.forEach(assignment => {
      if (assignment.horseId) {
        horseChukkers[assignment.horseId] = (horseChukkers[assignment.horseId] || 0) + 1;
      }
    });
  });

  // Log workload for each horse
  const logPromises = Object.entries(horseChukkers).map(([horseId, chukkerCount]) => {
    return addHorseLog(horseId, {
      date: practice.date,
      type: 'workload',
      chukkersDelta: chukkerCount,
      note: `Practice: ${practice.name || 'Unnamed'}`
    });
  });

  await Promise.all(logPromises);

  // Mark practice as completed
  return updateDoc(practiceRef, {
    status: 'completed',
    completedAt: serverTimestamp()
  });
}

