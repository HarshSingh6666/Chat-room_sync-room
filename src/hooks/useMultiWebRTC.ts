import { useState, useRef, useEffect, useCallback } from 'react';
import { WebRTCConnection } from '../services/webrtc';
import { roomManager } from '../services/roomManager';
import { UserProfile } from '../types';
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

  const localStreamRef = useRef<MediaStream | null>(localStream);
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  const startedCallsRef = useRef<Set<string>>(new Set());
  const pendingSignalsRef = useRef<Array<{ signal: any; fromUserId: string }>>([]);

  const participantIds = Object.keys(roomParticipants || {})
    .filter((id) => id !== currentUser.id)
    .sort()
    .join('|');

  const startCallOnce = useCallback(async (userId: string, rtc: WebRTCConnection) => {
    if (!rtc.isInitiator || startedCallsRef.current.has(userId)) return;

    startedCallsRef.current.add(userId);
    const sent = await rtc.startCall();
    if (!sent) {
      startedCallsRef.current.delete(userId);
    }
  }, []);

  const getOrCreatePeer = useCallback(
    (userId: string) => {
      const activeStream = localStreamRef.current || localStream;
      if (userId === currentUser.id || !activeStream) return null;

      if (peersRef.current[userId]) {
        return peersRef.current[userId];
      }

      const isInitiator = currentUser.id > userId;

      const rtc = new WebRTCConnection(
        (signal) => {
          roomManager.sendWebRTCSignal(
            roomId,
            currentUser.id,
            userId,
            signal
          );
        },
        {
          onRemoteStream: (remStream) => {
            if (!remStream) return;

            setRemoteStreams((prev) => ({
              ...prev,
              [userId]: remStream,
            }));

            setConnectionState('connected');
            sounds.playJoinChime();
          },

          onConnectionStateChange: (state) => {
            if (state === 'failed' || state === 'closed') {
              setRemoteStreams((prev) => {
                const next = { ...prev };
                delete next[userId];
                return next;
              });

              peersRef.current[userId]?.close();
              delete peersRef.current[userId];
              startedCallsRef.current.delete(userId);

              if (Object.keys(peersRef.current).length === 0) {
                setConnectionState('standby');
              }
            }
          },

          onIceConnectionStateChange: (iceState) => {
            if (iceState === 'connected' || iceState === 'completed') {
              setConnectionState('connected');
            }
          },
        },
        isInitiator
      );

      peersRef.current[userId] = rtc;
      rtc.init(activeStream);

      return rtc;
    },
    [localStream, currentUser.id, roomId]
  );

  // Establish connections whenever participants or local stream change
  useEffect(() => {
    if (!localStream) return;

    // Notify existing participants that this peer is ready
    roomManager.sendWebRTCSignal(roomId, currentUser.id, null, {
      type: 'peer_ready',
      userId: currentUser.id,
    });

    // Connect with all existing participants
    participantIds.split('|').filter(Boolean).forEach((id) => {
      const rtc = getOrCreatePeer(id);

      if (rtc) {
        startCallOnce(id, rtc);
      }
    });
  }, [
    localStream,
    participantIds,
    roomId,
    currentUser.id,
    getOrCreatePeer,
    startCallOnce,
  ]);

  // Handle incoming WebRTC signals
  const handleSignal = useCallback(
    (signal: any, fromUserId: string) => {
      if (!signal || !fromUserId || fromUserId === currentUser.id) return;

      const activeStream = localStreamRef.current || localStream;

      // Save signals until local media is ready
      if (!activeStream) {
        pendingSignalsRef.current.push({ signal, fromUserId });
        return;
      }

      if (signal.type === 'peer_ready') {
        const rtc = getOrCreatePeer(fromUserId);

        if (rtc) {
          startCallOnce(fromUserId, rtc);
        }

        return;
      }

      const rtc = getOrCreatePeer(fromUserId);

      if (rtc) {
        rtc.handleSignal(signal);
      }
    },
    [localStream, currentUser.id, getOrCreatePeer, startCallOnce]
  );

  // Process signals received before local media became available
  useEffect(() => {
    if (!localStream || pendingSignalsRef.current.length === 0) return;

    const pending = [...pendingSignalsRef.current];
    pendingSignalsRef.current = [];

    pending.forEach(({ signal, fromUserId }) => {
      handleSignal(signal, fromUserId);
    });
  }, [localStream, handleSignal]);

  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach((rtc) => rtc.close());

    peersRef.current = {};
    startedCallsRef.current.clear();
    pendingSignalsRef.current = [];

    setRemoteStreams({});
    setConnectionState('standby');
  }, []);

  const replaceTrack = useCallback((track: MediaStreamTrack) => {
    Object.values(peersRef.current).forEach((rtc) => {
      rtc.replaceVideoTrack(track);
    });
  }, []);

  const replaceAudioTrack = useCallback((track: MediaStreamTrack) => {
    Object.values(peersRef.current).forEach((rtc) => {
      rtc.replaceAudioTrack(track);
    });
  }, []);

  return {
    remoteStreams,
    connectionState,
    handleSignal,
    cleanup,
    replaceTrack,
    replaceAudioTrack,
    peersRef,
  };
}
