import { FirebaseCustomConfig } from '../../types';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from '../../../server/FirebaseConfig';

const STORAGE_KEY_CONFIG = 'syncroom_firebase_config';

export class FirebaseBase {
  protected customConfig: FirebaseCustomConfig | null = null;
  protected firebaseApp: FirebaseApp | null = null;
  protected db: Firestore | null = null;
  protected auth: Auth | null = null;

  constructor() {
    this.customConfig = firebaseConfig as FirebaseCustomConfig;
    this.initFirebase();
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
    if (config) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
      this.initFirebase();
    } else {
      localStorage.removeItem(STORAGE_KEY_CONFIG);
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
