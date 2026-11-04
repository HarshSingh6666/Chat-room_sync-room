
import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  RoomData,
  ChatMessage,
} from '../types';
import { roomManager } from '../services/roomManager';
import {
  createSyntheticStream,
  createSilentAudioTrack,
} from '../services/webrtc';
import { useMultiWebRTC } from '../hooks/useMultiWebRTC';
import { sounds } from '../utils/audioChime';
import { fetchSmartReplies } from '../services/aiService';
import {
  VirtualBackgroundProcessor,
  BackgroundEffect,
} from '../services/virtualBackground';
import { FloatingReactions, FloatingEmoji } from './FloatingReactions';
import { AiMeetingCopilotModal } from './AiMeetingCopilotModal';

import { RoomHeader } from './room/RoomHeader';
import { VideoGrid } from './room/VideoGrid';
import { VideoControlsDock } from './room/VideoControlsDock';
import { ChatBox } from './room/ChatBox';
import { ParticipantsDrawer } from './room/ParticipantsDrawer';

interface RoomViewProps {
  room: RoomData;
  currentUser: UserProfile;
  onLeaveRoom: () => void;
  onEndRoom: () => void;
}

export const RoomView: React.FC<RoomViewProps> = ({
  room: initialRoom,
  currentUser,
  onLeaveRoom,
  onEndRoom,
}) => {
  const [room, setRoom] = useState<RoomData>(initialRoom);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showParticipantsDrawer, setShowParticipantsDrawer] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const [layoutMode, setLayoutMode] = useState<
    'split' | 'video-focus' | 'chat-focus'
  >(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024
      ? 'split'
      : 'video-focus'
  );

  const layoutModeRef = useRef(layoutMode);
  useEffect(() => {
    layoutModeRef.current = layoutMode;
    if (layoutMode === 'chat-focus' || layoutMode === 'split') {
      setUnreadChatCount(0);
    }
  }, [layoutMode]);

  // Handle phone rotate or screen resize between mobile and desktop
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 1024 && layoutModeRef.current === 'split') {
          setLayoutMode('video-focus');
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Media & WebRTC state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const isAdmin =
    currentUser.role === 'admin' || room.adminId === currentUser.id;

  const {
    remoteStreams,
    connectionState,
    handleSignal,
    cleanup: cleanupWebRTC,
    replaceTrack,
    replaceAudioTrack,
  } = useMultiWebRTC(
    room.id,
    currentUser,
    isAdmin,
    localStream,
    room.participants
  );

  const handleSignalRef = useRef(handleSignal);
  useEffect(() => {
    handleSignalRef.current = handleSignal;
  });

  // Emojis & Floating Reactions
  const [floatingReactions, setFloatingReactions] = useState<FloatingEmoji[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Virtual Background
  const [backgroundEffect, setBackgroundEffect] =
    useState<BackgroundEffect>('none');

  const [showBackgroundPopover, setShowBackgroundPopover] = useState(false);

  const bgProcessorRef = useRef<VirtualBackgroundProcessor | null>(null);
  const rawCameraStreamRef = useRef<MediaStream | null>(null);

  // AI Copilot
  const [showAiModal, setShowAiModal] = useState(false);

  const [smartReplies, setSmartReplies] = useState<string[]>([
    'Sounds good to me!',
    'Let’s move to the next item.',
    'I will take ownership of this.',
  ]);

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const syntheticStreamStopperRef = useRef<(() => void) | null>(null);
  const silentAudioStopperRef = useRef<(() => void) | null>(null);
  const originalCameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const hasRealVideoRef = useRef(false);
  const hasRealAudioRef = useRef(false);

  // Initialize Media Streams and WebRTC
  useEffect(() => {
    let active = true;

    async function initMedia() {
      let videoTrack: MediaStreamTrack | null = null;
      let audioTrack: MediaStreamTrack | null = null;
      let silentAudioStopper: (() => void) | null = null;
      let hasRealVideo = false;
      let hasRealAudio = false;

      // 1. Try requesting BOTH camera and microphone together
      try {
        const streamBoth = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        videoTrack = streamBoth.getVideoTracks()[0] || null;
        audioTrack = streamBoth.getAudioTracks()[0] || null;
        hasRealVideo = !!videoTrack;
        hasRealAudio = !!audioTrack;
      } catch (errBoth) {
        console.warn(
          'Could not acquire both video and audio together, trying independently...',
          errBoth
        );

        // 2. Try requesting CAMERA alone
        try {
          const streamVideo = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          videoTrack = streamVideo.getVideoTracks()[0] || null;
          hasRealVideo = !!videoTrack;
        } catch (errVid) {
          console.warn('Camera permission denied or unavailable:', errVid);
        }

        // 3. Try requesting MICROPHONE alone
        try {
          const streamAudio = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          audioTrack = streamAudio.getAudioTracks()[0] || null;
          hasRealAudio = !!audioTrack;
        } catch (errAud) {
          console.warn('Microphone permission denied or unavailable:', errAud);
        }
      }

      hasRealVideoRef.current = hasRealVideo;
      hasRealAudioRef.current = hasRealAudio;

      let finalStream: MediaStream;

      if (hasRealVideo && videoTrack) {
        // User permitted CAMERA!
        finalStream = new MediaStream();
        finalStream.addTrack(videoTrack);

        if (hasRealAudio && audioTrack) {
          finalStream.addTrack(audioTrack);
        } else {
          // If mic was not permitted or unavailable, attach silent audio track for complete WebRTC handshake
          const silentAudio = createSilentAudioTrack();
          if (silentAudio) {
            finalStream.addTrack(silentAudio.track);
            silentAudioStopper = silentAudio.stop;
            silentAudioStopperRef.current = silentAudio.stop;
          }
          setIsMicMuted(true);
          roomManager.updateParticipantState(room.id, currentUser.id, {
            isMuted: true,
          });
        }
      } else if (hasRealAudio && audioTrack) {
        // User permitted MIC alone: show avatar video + real mic
        const synth = createSyntheticStream(currentUser.name);
        syntheticStreamStopperRef.current = synth.stop;

        finalStream = new MediaStream();
        const synthVideoTrack = synth.stream.getVideoTracks()[0];
        if (synthVideoTrack) finalStream.addTrack(synthVideoTrack);
        finalStream.addTrack(audioTrack);

        setIsCameraOff(true);
        roomManager.updateParticipantState(room.id, currentUser.id, {
          isCameraOff: true,
        });
      } else {
        // Neither was permitted: use full synthetic stream
        const synth = createSyntheticStream(currentUser.name);
        syntheticStreamStopperRef.current = synth.stop;
        finalStream = synth.stream;

        setIsCameraOff(true);
        setIsMicMuted(true);
        roomManager.updateParticipantState(room.id, currentUser.id, {
          isCameraOff: true,
          isMuted: true,
        });
      }

      if (!active) {
        finalStream.getTracks().forEach((track) => track.stop());

        if (syntheticStreamStopperRef.current) {
          syntheticStreamStopperRef.current();
          syntheticStreamStopperRef.current = null;
        }

        if (silentAudioStopper) {
          silentAudioStopper();
        }

        return;
      }

      rawCameraStreamRef.current = finalStream;

      if (hasRealVideo) {
        const processor = new VirtualBackgroundProcessor(finalStream);
        bgProcessorRef.current = processor;
      }

      setLocalStream(finalStream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = finalStream;
      }
    }

    initMedia();

    const unsubRoom = roomManager.subscribeToRoom(
      room.id,
      (updatedRoom) => {
        setRoom(updatedRoom);
      },
      () => {
        sounds.playLeaveChime();
        onEndRoom();
      }
    );

    const unsubChat = roomManager.subscribeToMessages(
      room.id,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev;
          }

          return [...prev, newMsg];
        });

        if (newMsg.senderId !== currentUser.id) {
          sounds.playMessageChime();
          if (layoutModeRef.current === 'video-focus') {
            setUnreadChatCount((prev) => prev + 1);
          }
        }
      },
      (list) => {
        setMessages(list);
      }
    );

    const unsubSignals = roomManager.subscribeToWebRTCSignals(
      room.id,
      currentUser.id,
      (signal, fromUserId) => {
        if (signal?.type === 'ROOM_ENDED') {
          sounds.playLeaveChime();
          onEndRoom();
          return;
        }

        handleSignalRef.current?.(signal, fromUserId);
      }
    );

    const unsubReactions = roomManager.subscribeToReactions(
      room.id,
      (emoji, senderName) => {
        triggerFloatingReaction(emoji, senderName);
      }
    );

    return () => {
      active = false;

      unsubRoom();
      unsubChat();
      unsubSignals();
      unsubReactions();

      cleanupWebRTC();

      if (bgProcessorRef.current) {
        bgProcessorRef.current.destroy();
        bgProcessorRef.current = null;
      }

      if (rawCameraStreamRef.current) {
        rawCameraStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        rawCameraStreamRef.current = null;
      }

      if (syntheticStreamStopperRef.current) {
        syntheticStreamStopperRef.current();
        syntheticStreamStopperRef.current = null;
      }

      if (silentAudioStopperRef.current) {
        silentAudioStopperRef.current();
        silentAudioStopperRef.current = null;
      }

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [room.id]);

  // Keep video connected
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Smart replies
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(async () => {
        const replies = await fetchSmartReplies({
          roomCode: room.code,
          participantCount: Object.keys(room.participants || {}).length,
          messages,
        });

        if (replies.length > 0) {
          setSmartReplies(replies);
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Floating reactions
  const triggerFloatingReaction = (
    emoji: string,
    senderName: string
  ) => {
    const id =
      'reac_' +
      Date.now() +
      '_' +
      Math.random().toString(36).substring(2, 6);

    const leftPercent = 15 + Math.random() * 70;

    const item: FloatingEmoji = {
      id,
      emoji,
      senderName,
      leftPercent,
    };

    setFloatingReactions((prev) => [...prev, item]);

    sounds.playMessageChime();

    setTimeout(() => {
      setFloatingReactions((prev) =>
        prev.filter((reaction) => reaction.id !== id)
      );
    }, 3000);
  };

  const handleSendReaction = async (emoji: string) => {
    await roomManager.sendReaction(room.id, currentUser.name, emoji);
  };

  // Toggle microphone
  const handleToggleMic = async () => {
    if (!localStream) return;

    if (!hasRealAudioRef.current) {
      try {
        const streamAudio = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        const realTrack = streamAudio.getAudioTracks()[0];
        if (realTrack) {
          hasRealAudioRef.current = true;
          if (silentAudioStopperRef.current) {
            silentAudioStopperRef.current();
            silentAudioStopperRef.current = null;
          }
          const oldTrack = localStream.getAudioTracks()[0];
          if (oldTrack) {
            localStream.removeTrack(oldTrack);
            oldTrack.stop();
          }
          localStream.addTrack(realTrack);
          replaceAudioTrack(realTrack);
          setIsMicMuted(false);
          roomManager.updateParticipantState(room.id, currentUser.id, {
            isMuted: false,
          });
          return;
        }
      } catch (err) {
        console.warn('Microphone permission still denied or unavailable:', err);
      }
    }

    const audioTrack = localStream.getAudioTracks()[0];

    if (audioTrack) {
      const newMuted = !isMicMuted;

      audioTrack.enabled = !newMuted;
      setIsMicMuted(newMuted);

      roomManager.updateParticipantState(
        room.id,
        currentUser.id,
        {
          isMuted: newMuted,
        }
      );
    }
  };

  // Toggle camera
  const handleToggleCamera = async () => {
    if (!hasRealVideoRef.current) {
      try {
        const streamVideo = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const realTrack = streamVideo.getVideoTracks()[0];
        if (realTrack) {
          hasRealVideoRef.current = true;
          if (syntheticStreamStopperRef.current) {
            syntheticStreamStopperRef.current();
            syntheticStreamStopperRef.current = null;
          }
          const oldTrack = localStream?.getVideoTracks()[0];
          if (oldTrack) {
            localStream?.removeTrack(oldTrack);
            oldTrack.stop();
          }
          localStream?.addTrack(realTrack);
          rawCameraStreamRef.current = new MediaStream([realTrack]);
          const processor = new VirtualBackgroundProcessor(rawCameraStreamRef.current);
          bgProcessorRef.current = processor;

          replaceTrack(realTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
          setIsCameraOff(false);
          roomManager.updateParticipantState(room.id, currentUser.id, {
            isCameraOff: false,
          });
          return;
        }
      } catch (err) {
        console.warn('Camera permission still denied or unavailable:', err);
      }
    }

    const newCameraOff = !isCameraOff;

    setIsCameraOff(newCameraOff);

    if (rawCameraStreamRef.current) {
      rawCameraStreamRef.current
        .getVideoTracks()
        .forEach((track) => {
          track.enabled = !newCameraOff;
        });
    }

    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !newCameraOff;
      });
    }

    roomManager.updateParticipantState(
      room.id,
      currentUser.id,
      {
        isCameraOff: newCameraOff,
      }
    );
  };

  // Change virtual background
  const handleSelectBackground = (effect: BackgroundEffect) => {
    setBackgroundEffect(effect);

    if (effect === 'none' && rawCameraStreamRef.current) {
      if (bgProcessorRef.current) {
        bgProcessorRef.current.setEffect(effect);
      }

      const rawTrack =
        rawCameraStreamRef.current.getVideoTracks()[0];

      if (rawTrack && !isScreenSharing) {
        replaceTrack(rawTrack);
      }

      setLocalStream(rawCameraStreamRef.current);
    } else {
      if (bgProcessorRef.current) {
        bgProcessorRef.current.setEffect(effect);

        const processedTrack =
          bgProcessorRef.current.getVideoTrack();

        if (processedTrack && !isScreenSharing) {
          replaceTrack(processedTrack);
        }

        setLocalStream(
          bgProcessorRef.current.getOutputStream()
        );
      }
    }
  };

  // Toggle screen sharing
  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream =
          await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });

        const screenTrack = screenStream.getVideoTracks()[0];

        originalCameraTrackRef.current =
          bgProcessorRef.current?.getVideoTrack() ||
          localStream?.getVideoTracks()[0] ||
          null;

        replaceTrack(screenTrack);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);

        roomManager.updateParticipantState(
          room.id,
          currentUser.id,
          {
            isScreenSharing: true,
          }
        );

        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    const camTrack =
      bgProcessorRef.current?.getVideoTrack() ||
      originalCameraTrackRef.current;

    if (camTrack) {
      replaceTrack(camTrack);
    }

    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }

    setIsScreenSharing(false);

    roomManager.updateParticipantState(
      room.id,
      currentUser.id,
      {
        isScreenSharing: false,
      }
    );
  };

  // Send chat message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();

    if (!text) return;

    setInputText('');
    setShowEmojiPicker(false);

    await roomManager.sendMessage(
      room.id,
      currentUser,
      text
    );
  };

  const copyRoomShareLink = () => {
    const url =
      `${window.location.origin}${window.location.pathname}?room=${room.code}`;

    navigator.clipboard.writeText(url);

    setCopiedLink(true);

    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Host ends meeting
  const handleEndRoom = async () => {
    if (!isAdmin) return;

    if (
      window.confirm(
        'Are you sure you want to end this room for all participants?'
      )
    ) {
      await roomManager.endRoom(room.id);
      onEndRoom();
    }
  };

  // Leave or end meeting
  const handleExitCall = async () => {
    if (isAdmin) {
      if (
        window.confirm(
          'Are you sure you want to end this meeting for all participants?'
        )
      ) {
        await roomManager.endRoom(room.id);
        onEndRoom();
      }
    } else {
      if (
        window.confirm(
          'Are you sure you want to leave this meeting?'
        )
      ) {
        await roomManager.leaveRoom(room.id, currentUser.id);
        onLeaveRoom();
      }
    }
  };

  // Kick participant
  const handleKickParticipant = async (participantId: string) => {
    if (!isAdmin || participantId === currentUser.id) return;

    if (
      window.confirm(
        'Remove this participant from the room?'
      )
    ) {
      await roomManager.leaveRoom(room.id, participantId);
    }
  };

  const participantList = Object.values(
    room.participants || {}
  );


  

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-1.5 sm:p-2.5 md:p-3.5 pt-safe pb-safe pl-safe pr-safe max-w-7xl w-full h-full mx-auto relative">

      <FloatingReactions reactions={floatingReactions} />

      <RoomHeader
        room={room}
        currentUser={currentUser}
        isAdmin={isAdmin}
        copiedLink={copiedLink}
        connectionState={connectionState}
        participantCount={participantList.length}
        unreadCount={unreadChatCount}
        layoutMode={layoutMode}
        onCopyLink={copyRoomShareLink}
        onOpenAiModal={() => setShowAiModal(true)}
        onChangeLayout={(mode) => {
          setLayoutMode(mode);
          if (mode === 'chat-focus' || mode === 'split') {
            setUnreadChatCount(0);
          }
        }}
        onToggleParticipants={() =>
          setShowParticipantsDrawer(!showParticipantsDrawer)
        }
        onEndRoom={handleEndRoom}
        onLeaveRoom={handleExitCall}
      />

      {/* MAIN VIDEO + CHAT LAYOUT */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-2 sm:gap-3 min-h-0 overflow-hidden relative h-full">

        {/* VIDEO SECTION */}
        <div
          className={`${
            layoutMode === 'chat-focus'
              ? 'hidden'
              : layoutMode === 'video-focus'
              ? 'w-full lg:col-span-12'
              : 'w-full lg:col-span-7'
          } flex flex-col bg-slate-900/60 border border-slate-800/80 rounded-xl sm:rounded-2xl overflow-hidden relative shadow-lg flex-1 min-h-0 h-full`}
        >
          <VideoGrid
            localVideoRef={localVideoRef}
            remoteStreams={remoteStreams}
            participants={participantList}
            currentUser={currentUser}
            isCameraOff={isCameraOff}
            isMicMuted={isMicMuted}
            isScreenSharing={isScreenSharing}
            backgroundEffect={backgroundEffect}
            roomCode={room.code}
            copiedLink={copiedLink}
            onCopyLink={copyRoomShareLink}
          />

          <VideoControlsDock
            isAdmin={isAdmin}
            isMicMuted={isMicMuted}
            isCameraOff={isCameraOff}
            isScreenSharing={isScreenSharing}
            backgroundEffect={backgroundEffect}
            showBackgroundPopover={showBackgroundPopover}
            onToggleMic={handleToggleMic}
            onToggleCamera={handleToggleCamera}
            onToggleScreenShare={handleToggleScreenShare}
            onToggleBackgroundPopover={() =>
              setShowBackgroundPopover(!showBackgroundPopover)
            }
            onSelectBackground={handleSelectBackground}
            onCloseBackgroundPopover={() =>
              setShowBackgroundPopover(false)
            }
            onPlayChime={() => sounds.playJoinChime()}
            onLeaveRoom={handleExitCall}
            onSendReaction={handleSendReaction}
          />
        </div>

        {/* CHAT SECTION */}
        <div
          className={`${
            layoutMode === 'video-focus'
              ? 'hidden'
              : layoutMode === 'chat-focus'
              ? 'w-full lg:col-span-12'
              : 'w-full lg:col-span-5'
          } flex flex-col flex-1 lg:h-full min-h-0 h-full`}
        >
          <ChatBox
            messages={messages}
            currentUser={currentUser}
            inputText={inputText}
            showEmojiPicker={showEmojiPicker}
            smartReplies={smartReplies}
            onChangeInputText={setInputText}
            onToggleEmojiPicker={() =>
              setShowEmojiPicker(!showEmojiPicker)
            }
            onSelectEmoji={(emoji) =>
              setInputText((prev) => prev + emoji)
            }
            onSendReaction={handleSendReaction}
            onSendMessage={handleSendMessage}
            onOpenAiModal={() => setShowAiModal(true)}
          />
        </div>
      </div>

      {/* PARTICIPANTS DRAWER */}
      <ParticipantsDrawer
        isOpen={showParticipantsDrawer}
        participants={participantList}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onClose={() => setShowParticipantsDrawer(false)}
        onKickParticipant={handleKickParticipant}
        onEndRoom={handleEndRoom}
      />

      {/* AI COPILOT */}
      <AiMeetingCopilotModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        context={{
          roomCode: room.code,
          participantCount: participantList.length,
          messages,
        }}
        onSendChatMessage={(text) =>
          handleSendMessage(text)
        }
      />
    </div>
  );


  
};
