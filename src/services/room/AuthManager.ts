import { UserProfile } from '../../types';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { FirebaseBase } from './FirebaseBase';

const STORAGE_KEY_USER = 'syncroom_current_user';
const SESSION_KEY_USER = 'syncroom_session_user';

export class AuthManager extends FirebaseBase {
  async signInWithGoogle(): Promise<UserProfile> {
    if (!this.auth || !this.db) {
      await this.ensureConfigured();
    }

    if (!this.auth || !this.db) {
      throw new Error(
        'Firebase is not configured. Please ensure Firebase environment variables (VITE_FIREBASE_API_KEY, etc.) are set in your environment.'
      );
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(this.auth, provider);
    const firebaseUser = result.user;

    if (!firebaseUser.uid || !firebaseUser.email) {
      await signOut(this.auth);
      throw new Error('Google account did not provide a valid user identity.');
    }

    const user: UserProfile = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL || undefined,
      isAnonymous: false,
      role: 'admin',
    };

    this.saveLocalUser(user);
    return user;
  }

  joinAsGuest(guestName: string): UserProfile {
    const user: UserProfile = {
      id: 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: guestName.trim() || 'Guest',
      email: '',
      isAnonymous: true,
      role: 'guest',
    };
    this.saveLocalUser(user);
    return user;
  }

  saveLocalUser(user: UserProfile) {
    try {
      sessionStorage.setItem(SESSION_KEY_USER, JSON.stringify(user));
      if (!user.isAnonymous) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      }
    } catch {
      // ignore
    }
  }

  getLocalUser(): UserProfile | null {
    try {
      const sessionUser = sessionStorage.getItem(SESSION_KEY_USER);
      if (sessionUser) return JSON.parse(sessionUser);

      const hasRoomParam = typeof window !== 'undefined' && window.location.search.includes('room=');
      if (hasRoomParam) {
        return null;
      }

      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
    return null;
  }

  async signOut(): Promise<void> {
    if (this.auth) {
      try {
        await signOut(this.auth);
      } catch (err) {
        console.warn('SignOut error:', err);
      }
    }
    try {
      sessionStorage.removeItem(SESSION_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_USER);
    } catch {
      // ignore
    }
  }
}
