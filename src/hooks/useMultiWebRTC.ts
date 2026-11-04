import { useState, useRef, useEffect, useCallback } from 'react';
import { WebRTCConnection } from '../services/webrtc';
import { roomManager } from '../services/roomManager';
import { UserProfile, RoomData } from '../types';
import { sounds } from '../utils/audioChime';

export function useMultiWebRTC(
  roomId: string,
  currentUser: UserProfile,
  isAdmin: boolean,
  localStream: MediaStream | null,
  roomParticipants: Record<string, any>
) {
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const peersRef = useRef<Record<string, WebRTCConnection>>({});
  const [connectionState, setConnectionState] = useState<string>('standby');

  const getOrCreatePeer = useCallback(
    (userId: string) => {
      if (peersRef.current[userId]) return peersRef.current[userId];
      if (!localStream) return null;

      // Consistent tie-breaker for who initiates the call
      const isInitiator = currentUser.id > userId;

      const rtc = new WebRTCConnection(
        (signal) => {
          roomManager.sendWebRTCSignal(roomId, currentUser.id, userId, signal);
        },
        {
          onRemoteStream: (remStream) => {
            setRemoteStreams((prev) => ({ ...prev, [userId]: remStream }));
            setConnectionState('connected');
            sounds.playJoinChime();
          },
          onConnectionStateChange: (state) => {
            if (state === 'disconnected' || state === 'failed') {
              setRemoteStreams((prev) => {
                const next = { ...prev };
                delete next[userId];
                return next;
              });
              peersRef.current[userId]?.close();
              delete peersRef.current[userId];
            }
          },
          onIceConnectionStateChange: (iceState) => {
            if (iceState === 'connected') setConnectionState('connected');
          },
        },
        isInitiator
      );

      rtc.init(localStream);
      peersRef.current[userId] = rtc;
      return rtc;
    },
    [localStream, currentUser.id, roomId]
  );

  // When local stream is ready, establish connections with all existing participants
  useEffect(() => {
    if (!localStream) return;
    
    // Broadcast peer_ready to all (targetUserId = null)
    setTimeout(() => {
      roomManager.sendWebRTCSignal(roomId, currentUser.id, null, {
        type: 'peer_ready',
        userId: currentUser.id,
      });
    }, 300);

    // Create peers for existing participants
    Object.keys(roomParticipants).forEach((id) => {
      if (id !== currentUser.id) {
        const rtc = getOrCreatePeer(id);
        if (rtc && rtc.isInitiator) {
          setTimeout(() => rtc.startCall(), 500);
        }
      }
    });
  }, [localStream]); // Run once when local stream is ready

  // Handle incoming signals
  const handleSignal = useCallback(
    (signal: any, fromUserId: string) => {
      if (signal.type === 'peer_ready') {
        const rtc = getOrCreatePeer(fromUserId);
        if (rtc && rtc.isInitiator) {
          rtc.startCall();
        }
        return;
      }

      const rtc = getOrCreatePeer(fromUserId);
      if (rtc) {
        rtc.handleSignal(signal);
      }
    },
    [getOrCreatePeer]
  );

  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach((rtc) => rtc.close());
    peersRef.current = {};
    setRemoteStreams({});
  }, []);

  const replaceTrack = useCallback((track: MediaStreamTrack) => {
    Object.values(peersRef.current).forEach((rtc) => rtc.replaceVideoTrack(track));
  }, []);

  return {
    remoteStreams,
    connectionState,
    handleSignal,
    cleanup,
    replaceTrack,
    peersRef,
  };
}
