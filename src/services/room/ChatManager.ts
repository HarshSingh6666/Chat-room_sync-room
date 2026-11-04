import { UserProfile, ChatMessage } from '../../types';
import { addDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { RoomCoreManager } from './RoomCoreManager';

export class ChatManager extends RoomCoreManager {
  async sendMessage(
    roomId: string,
    sender: UserProfile,
    text: string
  ): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role || 'guest',
      text: text.trim(),
      timestamp: Date.now(),
    };

    fetch(`/api/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    }).catch(() => {});

    if (this.isFirebaseActive() && this.db) {
      try {
        await addDoc(collection(this.db, 'rooms', roomId, 'messages'), msg);
      } catch (err) {
        console.error('Firebase send message error:', err);
      }
    }

    const key = `syncroom_messages_${roomId}`;
    const list: ChatMessage[] = JSON.parse(localStorage.getItem(key) || '[]');
    list.push(msg);
    localStorage.setItem(key, JSON.stringify(list));
    this.notifyLocalUpdate(roomId, { type: 'chat_message', message: msg });

    return msg;
  }

  subscribeToMessages(
    roomId: string,
    onNewMessage: (message: ChatMessage) => void,
    onInitialList: (messages: ChatMessage[]) => void
  ): () => void {
    let active = true;
    let knownMessageIds = new Set<string>();

    const key = `syncroom_messages_${roomId}`;
    const initialList: ChatMessage[] = JSON.parse(localStorage.getItem(key) || '[]');
    initialList.forEach((m) => knownMessageIds.add(m.id));
    onInitialList(initialList);

    const pollServer = async () => {
      if (!active) return;
      try {
        const res = await fetch(`/api/rooms/${roomId}/messages`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages)) {
            data.messages.forEach((msg: ChatMessage) => {
              if (!knownMessageIds.has(msg.id)) {
                knownMessageIds.add(msg.id);
                onNewMessage(msg);
              }
            });
          }
        }
      } catch {
        // ignore
      }
    };
    const pollInterval = setInterval(pollServer, 1000);

    let unsubFirestore: (() => void) | null = null;
    if (this.isFirebaseActive() && this.db) {
      try {
        const q = query(
          collection(this.db, 'rooms', roomId, 'messages'),
          orderBy('timestamp', 'asc')
        );
        let isFirstSnapshot = true;
        unsubFirestore = onSnapshot(
          q, 
          (snap) => {
            if (!active) return;
            if (isFirstSnapshot) {
              isFirstSnapshot = false;
              const msgs: ChatMessage[] = [];
              snap.forEach((doc) => {
                const m = doc.data() as ChatMessage;
                msgs.push(m);
                knownMessageIds.add(m.id);
              });
              onInitialList(msgs);
            } else {
              snap.docChanges().forEach((change) => {
                if (change.type === 'added') {
                  const m = change.doc.data() as ChatMessage;
                  if (!knownMessageIds.has(m.id)) {
                    knownMessageIds.add(m.id);
                    onNewMessage(m);
                  }
                }
              });
            }
          },
          (err) => {
            console.warn('Firestore messages snapshot error (fallback active):', err);
          }
        );
      } catch (err) {
        console.warn('Error setting up Firestore messages listener:', err);
      }
    }

    const channelName = `syncroom_channel_${roomId}`;
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(channelName);
      bc.onmessage = (evt) => {
        if (!active) return;
        const data = evt.data;
        if (data.type === 'chat_message' && data.message) {
          if (!knownMessageIds.has(data.message.id)) {
            knownMessageIds.add(data.message.id);
            onNewMessage(data.message);
          }
        }
      };
    } catch {
      // ignore
    }

    const storageHandler = (e: StorageEvent) => {
      if (!active) return;
      if (e.key === key && e.newValue) {
        try {
          const list: ChatMessage[] = JSON.parse(e.newValue);
          list.forEach((m) => knownMessageIds.add(m.id));
          onInitialList(list);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', storageHandler);

    const localEventHandler = (evt: Event) => {
      if (!active) return;
      const data = (evt as CustomEvent).detail;
      if (data && data.type === 'chat_message' && data.message) {
        if (!knownMessageIds.has(data.message.id)) {
          knownMessageIds.add(data.message.id);
          onNewMessage(data.message);
        }
      }
    };
    window.addEventListener(`syncroom_local_event_${roomId}`, localEventHandler);

    return () => {
      active = false;
      clearInterval(pollInterval);
      if (unsubFirestore) unsubFirestore();
      if (bc) bc.close();
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener(`syncroom_local_event_${roomId}`, localEventHandler);
    };
  }
}
