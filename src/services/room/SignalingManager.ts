
import {
  addDoc,
  collection,
  query,
  onSnapshot,
} from 'firebase/firestore';

import { ChatManager } from './ChatManager';

export class SignalingManager extends ChatManager {

  // ==========================================
  // WEBRTC: SEND SIGNAL
  // ==========================================

  sendWebRTCSignal(
    roomId: string,
    fromUserId: string,
    targetUserId: string | null,
    signal: any
  ) {
    const payload = {
      fromUserId,
      targetUserId,
      signal,
      timestamp: Date.now(),
    };

    // Server
    fetch(`/api/rooms/${roomId}/signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.warn('WebRTC server signal error:', error);
    });

    // Firebase
    if (this.isFirebaseActive() && this.db) {
      try {
        addDoc(
          collection(this.db, 'rooms', roomId, 'signals'),
          payload
        ).catch((error) => {
          console.warn('Signaling Firestore error:', error);
        });
      } catch (error) {
        console.warn('Signaling Firestore error:', error);
      }
    }

    // Broadcast channel
    try {
      const bc = new BroadcastChannel(
        `syncroom_signals_${roomId}`
      );

      bc.postMessage(payload);
      bc.close();
    } catch {
      // ignore
    }

    // Local storage fallback
    try {
      localStorage.setItem(
        `syncroom_signal_pulse_${roomId}`,
        JSON.stringify(payload)
      );
    } catch {
      // ignore
    }
  }


  // ==========================================
  // WEBRTC: RECEIVE SIGNAL
  // ==========================================

  subscribeToWebRTCSignals(
    roomId: string,
    currentUserId: string,
    onSignal: (signal: any, fromUserId: string) => void
  ): () => void {

    let active = true;
    let lastSignalTimestamp = Date.now() - 5000;
    const seenSignalIds = new Set<string>();

    const dispatchSignal = (signal: any, fromUserId: string, sigId?: string) => {
      if (sigId) {
        if (seenSignalIds.has(sigId)) return;
        seenSignalIds.add(sigId);
        if (seenSignalIds.size > 500) {
          const first = seenSignalIds.values().next().value;
          if (first) seenSignalIds.delete(first);
        }
      }
      onSignal(signal, fromUserId);
    };

    // Server polling
    const pollServerSignals = async () => {
      if (!active) return;

      try {
        const querySince = Math.max(0, lastSignalTimestamp - 4000);
        const res = await fetch(
          `/api/rooms/${roomId}/signals?since=${querySince}&excludeUserId=${currentUserId}`
        );

        if (res.ok) {
          const data = await res.json();

          if (Array.isArray(data.signals)) {
            data.signals.forEach((s: any) => {
              if (s.timestamp > lastSignalTimestamp) {
                lastSignalTimestamp = s.timestamp;
              }

              if (s.targetUserId && s.targetUserId !== currentUserId) {
                return;
              }

              const sigId = s.id || `${s.fromUserId}_${s.timestamp}_${s.signal?.type || ''}`;
              dispatchSignal(s.signal, s.fromUserId, sigId);
            });
          }
        }
      } catch {
        // ignore
      }
    };

    const pollInterval = setInterval(
      pollServerSignals,
      300
    );

    // Firebase listener
    let unsubFirestore: (() => void) | null = null;

    if (this.isFirebaseActive() && this.db) {
      try {
        const q = query(
          collection(this.db, 'rooms', roomId, 'signals')
        );

        let firstSnapshot = true;

        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            if (!active) return;

            snapshot.docChanges().forEach((change) => {
              if (change.type !== 'added') return;

              const data = change.doc.data();

              // Ignore old signals
              if (firstSnapshot) return;

              if (data.fromUserId === currentUserId) return;

              if (
                data.targetUserId &&
                data.targetUserId !== currentUserId
              ) {
                return;
              }

              const sigId = data.id || `${data.fromUserId}_${data.timestamp}_${data.signal?.type || ''}`;
              dispatchSignal(
                data.signal,
                data.fromUserId,
                sigId
              );
            });

            firstSnapshot = false;
          },
          (error) => {
            console.warn(
              'Signaling snapshot error:',
              error
            );
          }
        );
      } catch (error) {
        console.warn(
          'Signaling listener error:',
          error
        );
      }
    }

    // Broadcast channel
    const channelName = `syncroom_signals_${roomId}`;

    let bc: BroadcastChannel | null = null;

    try {
      bc = new BroadcastChannel(channelName);

      bc.onmessage = (event) => {
        if (!active) return;

        const data = event.data;

        if (
          data &&
          data.fromUserId !== currentUserId
        ) {
          if (
            data.targetUserId &&
            data.targetUserId !== currentUserId
          ) {
            return;
          }

          onSignal(
            data.signal,
            data.fromUserId
          );
        }
      };
    } catch {
      // ignore
    }

    // Storage event
    const storageHandler = (event: StorageEvent) => {
      if (!active) return;

      if (
        event.key === `syncroom_signal_pulse_${roomId}` &&
        event.newValue
      ) {
        try {
          const data = JSON.parse(event.newValue);

          if (
            data &&
            data.fromUserId !== currentUserId
          ) {
            if (
              data.targetUserId &&
              data.targetUserId !== currentUserId
            ) {
              return;
            }

            onSignal(
              data.signal,
              data.fromUserId
            );
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener(
      'storage',
      storageHandler
    );

    // Cleanup
    return () => {
      active = false;

      clearInterval(pollInterval);

      if (unsubFirestore) {
        unsubFirestore();
      }

      if (bc) {
        bc.close();
      }

      window.removeEventListener(
        'storage',
        storageHandler
      );
    };
  }


  // ==========================================
  // EMOJI REACTIONS: SEND
  // ==========================================

  async sendReaction(
    roomId: string,
    senderName: string,
    emoji: string
  ) {

    const reactionId =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const payload = {
      id: reactionId,
      type: 'floating_reaction',
      senderName,
      emoji,
      timestamp: Date.now(),
    };

    // Firebase Firestore
    if (this.isFirebaseActive() && this.db) {
      try {
        await addDoc(
          collection(
            this.db,
            'rooms',
            roomId,
            'reactions'
          ),
          payload
        );
      } catch (error) {
        console.warn(
          'Firebase reaction error:',
          error
        );
      }
    }

    // Server fallback
    fetch(`/api/rooms/${roomId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.warn(
        'Reaction server error:',
        error
      );
    });

    // Broadcast channel
    try {
      const bc = new BroadcastChannel(
        `syncroom_channel_${roomId}`
      );

      bc.postMessage(payload);
      bc.close();
    } catch {
      // ignore
    }

    // Local storage fallback
    try {
      localStorage.setItem(
        `syncroom_reaction_pulse_${roomId}`,
        JSON.stringify(payload)
      );
    } catch {
      // ignore
    }
  }


  // ==========================================
  // EMOJI REACTIONS: RECEIVE
  // ==========================================

  subscribeToReactions(
    roomId: string,
    onReaction: (
      emoji: string,
      senderName: string
    ) => void
  ): () => void {

    let active = true;

    const startTime = Date.now();

    let lastReactionTimestamp = startTime;

    // Prevent duplicate reactions
    const receivedReactions = new Set<string>();

    const handleReaction = (data: any) => {

      if (!active || !data) return;

      if (data.type !== 'floating_reaction') return;

      if (!data.emoji || !data.senderName) return;

      // Ignore old reactions
      if (
        data.timestamp &&
        data.timestamp < startTime
      ) {
        return;
      }

      const reactionId =
        data.id ||
        `${data.senderName}_${data.emoji}_${data.timestamp}`;

      if (receivedReactions.has(reactionId)) return;

      receivedReactions.add(reactionId);

      // Limit memory usage
      if (receivedReactions.size > 500) {
        const oldest =
          receivedReactions.values().next().value;

        if (oldest) {
          receivedReactions.delete(oldest);
        }
      }

      onReaction(
        data.emoji,
        data.senderName
      );
    };


    // ------------------------------------------
    // FIREBASE REAL-TIME LISTENER
    // ------------------------------------------

    let unsubFirestore: (() => void) | null = null;

    if (this.isFirebaseActive() && this.db) {
      try {

        const reactionsRef = collection(
          this.db,
          'rooms',
          roomId,
          'reactions'
        );

        const q = query(reactionsRef);

        let firstSnapshot = true;

        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {

            if (!active) return;

            snapshot.docChanges().forEach((change) => {

              if (change.type !== 'added') return;

              // Ignore previously existing reactions
              if (firstSnapshot) return;

              const data = change.doc.data();

              handleReaction({
                ...data,
                id: change.doc.id,
              });

            });

            firstSnapshot = false;
          },
          (error) => {
            console.warn(
              'Firebase reaction listener error:',
              error
            );
          }
        );

      } catch (error) {
        console.warn(
          'Firebase reaction setup error:',
          error
        );
      }
    }


    // ------------------------------------------
    // SERVER POLLING FALLBACK
    // ------------------------------------------

    const pollServerReactions = async () => {

      if (!active) return;

      try {

        const res = await fetch(
          `/api/rooms/${roomId}/reactions?since=${lastReactionTimestamp}`
        );

        if (!res.ok) return;

        const data = await res.json();

        if (Array.isArray(data.reactions)) {

          data.reactions.forEach((reaction: any) => {

            if (
              reaction.timestamp > lastReactionTimestamp
            ) {
              lastReactionTimestamp =
                reaction.timestamp;
            }

            handleReaction(reaction);
          });

        }

      } catch (error) {
        console.warn(
          'Server reaction polling error:',
          error
        );
      }
    };

    const pollInterval = setInterval(
      pollServerReactions,
      800
    );


    // ------------------------------------------
    // BROADCAST CHANNEL
    // ------------------------------------------

    let bc: BroadcastChannel | null = null;

    try {

      bc = new BroadcastChannel(
        `syncroom_channel_${roomId}`
      );

      bc.onmessage = (event) => {

        if (!active) return;

        handleReaction(event.data);

      };

    } catch {
      // ignore
    }


    // ------------------------------------------
    // LOCAL STORAGE FALLBACK
    // ------------------------------------------

    const storageHandler = (event: StorageEvent) => {

      if (!active) return;

      if (
        event.key === `syncroom_reaction_pulse_${roomId}` &&
        event.newValue
      ) {

        try {

          const data = JSON.parse(event.newValue);

          handleReaction(data);

        } catch {
          // ignore
        }

      }
    };

    window.addEventListener(
      'storage',
      storageHandler
    );


    // ------------------------------------------
    // CLEANUP
    // ------------------------------------------

    return () => {

      active = false;

      clearInterval(pollInterval);

      if (unsubFirestore) {
        unsubFirestore();
      }

      if (bc) {
        bc.close();
      }

      window.removeEventListener(
        'storage',
        storageHandler
      );

      receivedReactions.clear();

    };
  }
}
