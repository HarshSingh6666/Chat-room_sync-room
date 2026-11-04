import { FirebaseCustomConfig } from '../../types';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from '../../../server/FirebaseConfig';

const STORAGE_KEY_CONFIG = 'syncroom_firebase_config';

const getStaticViteConfig = (): FirebaseCustomConfig | null => {
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_FIREBASE_API_KEY
  ) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    };
  }
  return null;
};

export class FirebaseBase {
  protected customConfig: FirebaseCustomConfig | null = null;
  protected firebaseApp: FirebaseApp | null = null;
  protected db: Firestore | null = null;
  protected auth: Auth | null = null;
  private configPromise: Promise<boolean> | null = null;

  constructor() {
    // 1. Try static Vite environment variables
    const staticConfig = getStaticViteConfig();
    if (staticConfig?.apiKey) {
      this.customConfig = staticConfig;
    } else if (firebaseConfig && (firebaseConfig as any).apiKey) {
      this.customConfig = firebaseConfig as FirebaseCustomConfig;
    }
    this.initFirebase();

    // 2. If not active yet, attempt loading from localStorage
    if (!this.isFirebaseActive()) {
      this.loadSavedConfig();
    }
  }

  loadSavedConfig(): FirebaseCustomConfig | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        this.customConfig = JSON.parse(stored);
        this.initFirebase();
      }
    } catch (e) {
      console.warn('Failed to parse stored Firebase config:', e);
    }
    return this.customConfig;
  }

  saveConfig(config: FirebaseCustomConfig | null) {
    this.customConfig = config;
    if (config && config.apiKey) {
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
      } catch {}
      this.initFirebase();
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY_CONFIG);
      } catch {}
      this.firebaseApp = null;
      this.db = null;
      this.auth = null;
    }
  }

  getConfig(): FirebaseCustomConfig | null {
    return this.customConfig;
  }

  isFirebaseActive(): boolean {
    return !!(this.customConfig && this.db && this.auth);
  }

  async ensureConfigured(): Promise<boolean> {
    if (this.isFirebaseActive()) return true;

    if (this.configPromise) return this.configPromise;

    this.configPromise = (async () => {
      // 1. Check local storage
      this.loadSavedConfig();
      if (this.isFirebaseActive()) return true;

      // 2. Check static Vite config
      const staticConfig = getStaticViteConfig();
      if (staticConfig?.apiKey) {
        this.customConfig = staticConfig;
        this.initFirebase();
        if (this.isFirebaseActive()) return true;
      }

      // 3. Fetch from server /api/firebase-config endpoint
      try {
        const res = await fetch('/api/firebase-config');
        if (res.ok) {
          const data = await res.json();
          if (data.configured && data.config?.apiKey) {
            this.saveConfig(data.config);
            return this.isFirebaseActive();
          }
        }
      } catch (err) {
        console.warn('Failed to fetch /api/firebase-config from server:', err);
      }

      return this.isFirebaseActive();
    })().finally(() => {
      this.configPromise = null;
    });

    return this.configPromise;
  }

  protected initFirebase() {
    if (!this.customConfig || !this.customConfig.apiKey) return;
    try {
      if (getApps().length === 0) {
        this.firebaseApp = initializeApp(this.customConfig);
      } else {
        this.firebaseApp = getApp();
      }
      this.db = getFirestore(this.firebaseApp);
      this.auth = getAuth(this.firebaseApp);
    } catch (err) {
      console.error('Failed to initialize Firebase instance:', err);
    }
  }
}
