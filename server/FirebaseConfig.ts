// server/FirebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";

const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[`VITE_${key}`];
  }
  return undefined;
};

export const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID'),
  measurementId: getEnv('FIREBASE_MEASUREMENT_ID'),
};

let app = null;
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } catch (err) {
    console.warn('Firebase init warning:', err);
  }
}

export default app;
