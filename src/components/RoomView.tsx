
import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  RoomData,
  ChatMessage,
} from '../types';
import { roomManager } from '../services/roomManager';
import { createSyntheticStream } from '../services/webrtc';
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

  const [layoutMode, setLayoutMode] = useState<
    'split' | 'video-focus' | 'chat-focus'
  >('split');

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
  } = useMultiWebRTC(
    room.id,
    currentUser,
    isAdmin,
    localStream,
    room.participants
  );

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
  const originalCameraTrackRef = useRef<MediaStreamTrack | null>(null);

  // Initialize Media Streams and WebRTC
  useEffect(() => {
    let active = true;

    async function initMedia() {
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (err) {
        console.warn(
          'Real camera/mic denied or unavailable. Using synthetic stream:',
          err
        );

        const synth = createSyntheticStream(currentUser.name);

        stream = synth.stream;
        syntheticStreamStopperRef.current = synth.stop;
      }

      if (!active) {
        stream.getTracks().forEach((track) => track.stop());

        if (syntheticStreamStopperRef.current) {
          syntheticStreamStopperRef.current();
          syntheticStreamStopperRef.current = null;
        }

        return;
      }

      rawCameraStreamRef.current = stream;

      const processor = new VirtualBackgroundProcessor(stream);
      bgProcessorRef.current = processor;

      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
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

        handleSignal(signal, fromUserId);
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
  triggerFloatingReaction(emoji, currentUser.name);

  await roomManager.sendReaction(
    room.id,
    currentUser.name,
    emoji
  );
};

  // Toggle microphone
  const handleToggleMic = () => {
    if (!localStream) return;

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
  const handleToggleCamera = () => {
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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 sm:p-4 max-w-7xl w-full mx-auto relative">

      <FloatingReactions reactions={floatingReactions} />

      <RoomHeader
        room={room}
        currentUser={currentUser}
        isAdmin={isAdmin}
        copiedLink={copiedLink}
        connectionState={connectionState}
        participantCount={participantList.length}
        layoutMode={layoutMode}
        onCopyLink={copyRoomShareLink}
        onOpenAiModal={() => setShowAiModal(true)}
        onChangeLayout={setLayoutMode}
        onToggleParticipants={() =>
          setShowParticipantsDrawer(!showParticipantsDrawer)
        }
        onEndRoom={handleEndRoom}
        onLeaveRoom={handleExitCall}
      />

      {/* MAIN VIDEO + CHAT LAYOUT */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-3 min-h-0 overflow-hidden relative">

        {/* VIDEO SECTION */}
        <div
          className={`${
            layoutMode === 'chat-focus'
              ? 'hidden'
              : layoutMode === 'video-focus'
              ? 'w-full lg:col-span-12'
              : 'w-full lg:col-span-7'
          } flex flex-col bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden relative shadow-lg flex-1 lg:flex-none lg:min-h-[520px] min-h-0`}
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
          } flex flex-col flex-1 lg:flex-none lg:h-full min-h-0`}
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
