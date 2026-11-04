
import { UserProfile, Participant, RoomData } from '../../types';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { AuthManager } from './AuthManager';

export class RoomCoreManager extends AuthManager {

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';

    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }

  async createRoom(creator: UserProfile): Promise<RoomData> {
    const roomCode = this.generateRoomCode();
    const roomId = 'room_' + roomCode.replace('-', '').toLowerCase();

    const participant: Participant = {
      id: creator.id,
      name: creator.name,
      role: 'admin',
      isMuted: false,
      isCameraOff: false,
      joinedAt: Date.now(),
      photoURL: creator.photoURL,
    };

    const room: RoomData = {
      id: roomId,
      code: roomCode,
      adminId: creator.id,
      adminName: creator.name,
      createdAt: Date.now(),
      status: 'active',
      participants: {
        [creator.id]: participant,
      },
    };

    if (this.isFirebaseActive() && this.db) {
      try {
        await setDoc(doc(this.db, 'rooms', roomId), room);
      } catch (e) {
        console.error('Error creating room in Firestore:', e);
      }
    }

    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room),
    }).catch((err) => console.warn('Server room sync error:', err));

    try {
      localStorage.setItem(`syncroom_room_${roomId}`, JSON.stringify(room));
      localStorage.setItem(`syncroom_code_map_${roomCode}`, roomId);
    } catch {
      // ignore
    }

    return room;
  }

  async findRoomByCode(code: string): Promise<RoomData | null> {
    const normalized = code.trim().toUpperCase();
    const cleanId =
      'room_' + normalized.replace(/[^A-Z0-9]/g, '').toLowerCase();

    // Firestore
    if (this.isFirebaseActive() && this.db) {
      try {
        const snap = await getDoc(doc(this.db, 'rooms', cleanId));

        if (snap.exists()) {
          const room = snap.data() as RoomData;

          localStorage.setItem(
            `syncroom_room_${cleanId}`,
            JSON.stringify(room)
          );

          return room;
        }
      } catch (e) {
        console.warn('Firestore find room error:', e);
      }
    }

    // Server
    try {
      const res = await fetch(`/api/rooms/${normalized}`);

      if (res.ok) {
        const data = await res.json();

        if (data.room) {
          localStorage.setItem(
            `syncroom_room_${data.room.id}`,
            JSON.stringify(data.room)
          );

          return data.room;
        }
      }
    } catch {
      // ignore
    }

    // Local storage fallback
    try {
      const local = localStorage.getItem(`syncroom_room_${cleanId}`);

      if (local) {
        return JSON.parse(local);
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.startsWith('syncroom_room_')) {
          try {
            const item: RoomData = JSON.parse(
              localStorage.getItem(key) || ''
            );

            if (
              item.code.replace('-', '') ===
              normalized.replace('-', '')
            ) {
              return item;
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  async joinRoom(
    roomId: string,
    user: UserProfile,
    fallbackRoomData?: RoomData
  ): Promise<RoomData | null> {

    const participant: Participant = {
      id: user.id,
      name: user.name,
      role: user.role === 'admin' ? 'admin' : 'guest',
      isMuted: false,
      isCameraOff: false,
      joinedAt: Date.now(),
      photoURL: user.photoURL,
    };

    let room: RoomData | null = null;

    // Firebase
    if (this.isFirebaseActive() && this.db) {
      try {
        const roomRef = doc(this.db, 'rooms', roomId);
        const snap = await getDoc(roomRef);

        if (snap.exists()) {
          const fbRoom = snap.data() as RoomData;

          if (fbRoom.status === 'ended') {
            throw new Error(
              'This meeting has already been ended by the Host.'
            );
          }

          await updateDoc(roomRef, {
            [`participants.${user.id}`]: participant,
          });

          fbRoom.participants = fbRoom.participants || {};
          fbRoom.participants[user.id] = participant;

          room = fbRoom;
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.message ===
            'This meeting has already been ended by the Host.'
        ) {
          throw err;
        }

        console.error('Firebase join error:', err);
      }
    }

    // Server
    if (!room) {
      try {
        const res = await fetch(`/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user }),
        });

        if (res.ok) {
          const data = await res.json();

          if (data.room) {
            room = data.room;
          }
        } else if (res.status === 410 || res.status === 404) {
          throw new Error(
            'This meeting is no longer available.'
          );
        }
      } catch (err) {
        if (err instanceof Error &&
            err.message === 'This meeting is no longer available.') {
          throw err;
        }

        console.warn('Server join room error:', err);
      }
    }

    // Local fallback
    if (!room) {
      const local = localStorage.getItem(`syncroom_room_${roomId}`);

      if (local) {
        room = JSON.parse(local);
      } else if (fallbackRoomData) {
        room = { ...fallbackRoomData };
      }
    }

    if (room) {
      if (room.status === 'ended') {
        throw new Error(
          'This meeting has already been ended by the Host.'
        );
      }

      room.participants = room.participants || {};
      room.participants[user.id] = participant;

      try {
        localStorage.setItem(
          `syncroom_room_${roomId}`,
          JSON.stringify(room)
        );
      } catch {
        // ignore
      }

      this.notifyLocalUpdate(roomId, {
        type: 'room_update',
        room,
      });
    }

    return room;
  }

  async updateParticipantState(
    roomId: string,
    userId: string,
    updates: Partial<Participant>
  ) {
    fetch(`/api/rooms/${roomId}/participant-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, updates }),
    }).catch(() => {});

    if (this.isFirebaseActive() && this.db) {
      try {
        const updatePayload: Record<string, any> = {};

        Object.entries(updates).forEach(([key, value]) => {
          updatePayload[`participants.${userId}.${key}`] = value;
        });

        await updateDoc(doc(this.db, 'rooms', roomId), updatePayload);
      } catch (err) {
        console.warn('Firebase participant update error:', err);
      }
    }

    const local = localStorage.getItem(`syncroom_room_${roomId}`);

    if (local) {
      const room: RoomData = JSON.parse(local);

      if (room.participants[userId]) {
        room.participants[userId] = {
          ...room.participants[userId],
          ...updates,
        };

        localStorage.setItem(
          `syncroom_room_${roomId}`,
          JSON.stringify(room)
        );

        this.notifyLocalUpdate(roomId, {
          type: 'room_update',
          room,
        });
      }
    }
  }

  async endRoom(roomId: string) {
    // Broadcast room-ended signal
    try {
      await fetch(`/api/rooms/${roomId}/signals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromUserId: 'system',
          signal: { type: 'ROOM_ENDED' },
          timestamp: Date.now(),
        }),
      });
    } catch {
      // ignore
    }

    // End room on server
    try {
      await fetch(`/api/rooms/${roomId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.warn('Server end room error:', err);
    }

    // End room on Firestore
    if (this.isFirebaseActive() && this.db) {
      try {
        await updateDoc(doc(this.db, 'rooms', roomId), {
          status: 'ended',
          participants: {},
        });
      } catch (err) {
        console.error('Firebase end room error:', err);
      }
    }

    // End room in local storage
    const local = localStorage.getItem(`syncroom_room_${roomId}`);

    if (local) {
      try {
        const room: RoomData = JSON.parse(local);

        room.status = 'ended';
        room.participants = {};

        localStorage.setItem(
          `syncroom_room_${roomId}`,
          JSON.stringify(room)
        );
      } catch {
        // ignore
      }
    }

    this.notifyLocalUpdate(roomId, {
      type: 'room_ended',
    });
  }

  async leaveRoom(roomId: string, userId: string) {
    let isAdmin = false;

    const local = localStorage.getItem(`syncroom_room_${roomId}`);

    if (local) {
      try {
        const room: RoomData = JSON.parse(local);

        if (
          room.adminId === userId ||
          room.participants?.[userId]?.role === 'admin'
        ) {
          isAdmin = true;
        }
      } catch {
        // ignore
      }
    }

    if (isAdmin) {
      return this.endRoom(roomId);
    }

    fetch(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    }).catch(() => {});

    if (this.isFirebaseActive() && this.db) {
      try {
        const roomRef = doc(this.db, 'rooms', roomId);
        const snap = await getDoc(roomRef);

        if (snap.exists()) {
          const room = snap.data() as RoomData;

          delete room.participants[userId];

          await setDoc(roomRef, room);
        }
      } catch (err) {
        console.warn('Firebase leave error:', err);
      }
    }

    if (local) {
      try {
        const room: RoomData = JSON.parse(local);

        delete room.participants[userId];

        localStorage.setItem(
          `syncroom_room_${roomId}`,
          JSON.stringify(room)
        );

        this.notifyLocalUpdate(roomId, {
          type: 'room_update',
          room,
        });
      } catch {
        // ignore
      }
    }
  }

  subscribeToRoom(
    roomId: string,
    onUpdate: (room: RoomData) => void,
    onEnded: () => void
  ): () => void {
    let active = true;

    const pollServer = async () => {
      if (!active) return;

      try {
        const res = await fetch(`/api/rooms/${roomId}`);

        if (res.ok) {
          const data = await res.json();

          if (data.room) {
            if (data.room.status === 'ended') {
              onEnded();
            } else {
              onUpdate(data.room);
            }
          }
        }
      } catch {
        // ignore
      }
    };

    const pollInterval = setInterval(pollServer, 700);

    let unsubFirestore: (() => void) | null = null;

    if (this.isFirebaseActive() && this.db) {
      try {
        unsubFirestore = onSnapshot(
          doc(this.db, 'rooms', roomId),
          (snap) => {
            if (!active) return;

            if (snap.exists()) {
              const data = snap.data() as RoomData;

              if (data.status === 'ended') {
                onEnded();
              } else {
                onUpdate(data);
              }
            }
          },
          (err) => {
            console.warn(
              'Firestore room snapshot error (fallback active):',
              err
            );
          }
        );
      } catch (err) {
        console.warn('Error setting up Firestore room listener:', err);
      }
    }

    const channelName = `syncroom_channel_${roomId}`;
    let bc: BroadcastChannel | null = null;

    try {
      bc = new BroadcastChannel(channelName);

      bc.onmessage = (evt) => {
        if (!active) return;

        const msg = evt.data;

        if (msg.type === 'room_update' && msg.room) {
          onUpdate(msg.room);
        } else if (msg.type === 'room_ended') {
          onEnded();
        }
      };
    } catch {
      // ignore
    }

    const localEventHandler = (e: any) => {
      if (!active) return;

      const detail = e.detail;

      if (detail?.type === 'room_ended') {
        onEnded();
      } else if (detail?.type === 'room_update' && detail.room) {
        onUpdate(detail.room);
      }
    };

    window.addEventListener(
      `syncroom_local_event_${roomId}`,
      localEventHandler
    );

    const storageHandler = (e: StorageEvent) => {
      if (!active) return;

      if (e.key === `syncroom_room_${roomId}` && e.newValue) {
        try {
          const room: RoomData = JSON.parse(e.newValue);

          if (room.status === 'ended') {
            onEnded();
          } else {
            onUpdate(room);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', storageHandler);

    return () => {
      active = false;
      clearInterval(pollInterval);

      if (unsubFirestore) unsubFirestore();
      if (bc) bc.close();

      window.removeEventListener(
        `syncroom_local_event_${roomId}`,
        localEventHandler
      );

      window.removeEventListener('storage', storageHandler);
    };
  }

  protected notifyLocalUpdate(roomId: string, data: any) {
    try {
      const bc = new BroadcastChannel(`syncroom_channel_${roomId}`);

      bc.postMessage(data);
      bc.close();
    } catch {
      // ignore
    }

    try {
      window.dispatchEvent(
        new CustomEvent(`syncroom_local_event_${roomId}`, {
          detail: data,
        })
      );
    } catch {
      // ignore
    }
  }
}
