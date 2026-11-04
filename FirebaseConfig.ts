import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 🔍 Debug log to verify keys are loading in the browser
console.log("Firebase Config Loaded Check:", {
  hasApiKey: !!firebaseConfig.apiKey,
  projectId: firebaseConfig.projectId
});

const app = initializeApp(firebaseConfig);

// 🔑 Export auth so your sign-in functions can use it!
export const auth = getAuth(app);

export default app;