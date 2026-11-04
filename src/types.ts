export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
  isAnonymous: boolean;
  role?: 'admin' | 'guest';
}

export interface Participant {
  id: string;
  name: string;
  role: 'admin' | 'guest';
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing?: boolean;
  joinedAt: number;
  photoURL?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'guest';
  text: string;
  timestamp: number;
  reaction?: string;
  isSystem?: boolean;
}

export interface RoomData {
  id: string;
  code: string;
  adminId: string;
  adminName: string;
  createdAt: number;
  status: 'active' | 'ended';
  participants: Record<string, Participant>;
}

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}
