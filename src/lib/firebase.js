import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const PLACEHOLDER_VALUES = new Set([
  '',
  'your_api_key',
  'your_api_key_here',
  'your_project.firebaseapp.com',
  'your_project_id',
  'your_project.appspot.com',
  'your_sender_id',
  'your_app_id',
  '1:123:web:abc123',
  '123456789',
]);

const isMissingOrPlaceholder = (value) => {
  if (value === undefined || value === null) return true;
  const str = String(value).trim();
  return str.length === 0 || PLACEHOLDER_VALUES.has(str);
};

// Check if Firebase is configured (avoid treating placeholder values as configured)
export const isFirebaseConfigured = !(
  isMissingOrPlaceholder(firebaseConfig.apiKey) ||
  isMissingOrPlaceholder(firebaseConfig.authDomain) ||
  isMissingOrPlaceholder(firebaseConfig.projectId) ||
  isMissingOrPlaceholder(firebaseConfig.storageBucket) ||
  isMissingOrPlaceholder(firebaseConfig.messagingSenderId) ||
  isMissingOrPlaceholder(firebaseConfig.appId)
);

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // Helpful during local setup — avoids silent failures.
  console.warn('[firebase] Not configured. Set VITE_FIREBASE_* in .env.local and restart the dev server.');
}

export { auth, db };
