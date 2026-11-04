export interface ServerParticipant {
  id: string;
  name: string;
  role: 'admin' | 'guest';
  isMuted: boolean;
  isCameraOff: boolean;
  joinedAt: number;
  photoURL?: string;
  [key: string]: any;
}

export interface ServerRoom {
  id: string;
  code: string;
  adminId: string;
  adminName: string;
  createdAt: number;
  status: 'active' | 'ended';
  participants: Record<string, ServerParticipant>;
}

export interface ServerMessage {
  id?: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  text?: string;
  timestamp?: number;
  [key: string]: any;
}

export interface ServerSignal {
  fromUserId: string;
  targetUserId?: string;
  signal: any;
  timestamp: number;
}

export interface ServerReaction {
  emoji: string;
  senderName: string;
  timestamp: number;
}
