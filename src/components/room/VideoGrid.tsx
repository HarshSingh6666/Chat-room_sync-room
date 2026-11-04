import React, { useEffect, useRef, useState } from 'react';
import { UserProfile, Participant } from '../../types';
import { BackgroundEffect } from '../../services/virtualBackground';
import {
  MicOff,
  MonitorUp,
  Sparkles,
  Users,
  Check,
  Share2,
} from 'lucide-react';

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteStreams: Record<string, MediaStream>;
  participants: Participant[];
  currentUser: UserProfile;
  isCameraOff: boolean;
  isMicMuted: boolean;
  isScreenSharing: boolean;
  backgroundEffect: BackgroundEffect;
  roomCode: string;
  copiedLink: boolean;
  onCopyLink: () => void;
}

const RemoteVideoTile: React.FC<{
  participant: Participant;
  stream: MediaStream | null;
}> = ({ participant, stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) {
      if (video) video.srcObject = null;
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const playVideo = () => {
      if (video.srcObject === stream) {
        video.play().catch((err) => {
          console.error('Remote video play error:', err);
        });
      }
    };

    const onTrackChange = () => {
      if (video && video.srcObject === stream) {
        playVideo();
      }
    };

    stream.addEventListener('addtrack', onTrackChange);
    stream.addEventListener('removetrack', onTrackChange);
    video.addEventListener('loadedmetadata', playVideo);
    video.addEventListener('canplay', playVideo);

    if (video.readyState >= 1) {
      playVideo();
    }

    return () => {
      video.removeEventListener('loadedmetadata', playVideo);
      video.removeEventListener('canplay', playVideo);
      stream.removeEventListener('addtrack', onTrackChange);
      stream.removeEventListener('removetrack', onTrackChange);
    };
  }, [stream]);

  return (
    <div className="relative bg-slate-950 rounded-xl sm:rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center h-full w-full min-h-0 shadow-inner group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        webkit-playsinline="true"
        className={`w-full h-full absolute inset-0 ${
          participant.isScreenSharing
            ? 'object-contain bg-black'
            : 'object-contain object-center bg-slate-950'
        } ${stream ? 'block' : 'hidden'}`}
      />

      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/95">
          <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
          <p className="text-xs text-slate-400">
            Connecting to {participant.name}...
          </p>
        </div>
      )}

      {stream && (
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-slate-900/85 backdrop-blur-md px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-800 text-[11px] sm:text-xs font-medium text-white flex items-center gap-1.5 shadow z-10 max-w-[85%] truncate">
          <span className="truncate">{participant.name}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>

          {participant.isScreenSharing && (
            <span className="hidden xs:inline-flex text-[9px] sm:text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 rounded-full items-center gap-1 shrink-0">
              <MonitorUp className="w-2.5 h-2.5 text-emerald-400" />
              <span>Screen</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const VideoGrid: React.FC<VideoGridProps> = ({
  localVideoRef,
  remoteStreams,
  participants,
  currentUser,
  isCameraOff,
  isMicMuted,
  isScreenSharing,
  backgroundEffect,
  roomCode,
  copiedLink,
  onCopyLink,
}) => {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;

    const playVideo = () => {
      if (video.srcObject) {
        video.play().catch((err) => {
          console.error('Local video play error:', err);
        });
      }
    };

    playVideo();
  }, [localVideoRef]);

  // Track screen orientation changes (portrait vs rotated landscape)
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        const landscape =
          window.innerWidth > window.innerHeight && window.innerHeight < 600;
        setIsLandscape(landscape);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const remoteParticipants = participants.filter(
    (p) => p.id !== currentUser.id
  );

  const totalTiles = 1 + remoteParticipants.length;

  // Compute dynamic responsive grid classes based on tile count & orientation:
  // 1 Tile: Full container
  // 2 Tiles:
  //    - Portrait phone: grid-cols-1 grid-rows-2 (stacked 50/50 top & bottom)
  //    - Landscape / Desktop: grid-cols-2 grid-rows-1 (side-by-side 50/50 left & right)
  // 3-4 Tiles: grid-cols-2 grid-rows-2 (2x2 grid fitting screen)
  // 5+ Tiles: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-fr with scroll
  let layoutClasses = 'grid-cols-1 grid-rows-1';

  if (totalTiles === 2) {
    layoutClasses = isLandscape
      ? 'grid-cols-2 grid-rows-1'
      : 'grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1';
  } else if (totalTiles <= 4) {
    layoutClasses = 'grid-cols-2 grid-rows-2';
  } else if (totalTiles <= 6) {
    layoutClasses = isLandscape
      ? 'grid-cols-3 grid-rows-2'
      : 'grid-cols-2 sm:grid-cols-3 auto-rows-fr';
  } else {
    layoutClasses = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-fr';
  }

  return (
    <div
      className={`flex-1 p-1.5 sm:p-2.5 grid ${layoutClasses} gap-1.5 sm:gap-2.5 h-full w-full min-h-0 overflow-y-auto overflow-x-hidden`}
    >
      {/* LOCAL VIDEO TILE */}
      <div className="relative bg-slate-950 rounded-xl sm:rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center h-full w-full min-h-0 shadow-inner group">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          webkit-playsinline="true"
          muted
          className={`absolute inset-0 w-full h-full ${
            isScreenSharing
              ? 'object-contain bg-black'
              : 'object-contain object-center bg-slate-950'
          } ${isCameraOff && !isScreenSharing ? 'hidden' : 'block'}`}
        />

        {/* CAMERA OFF AVATAR */}
        {isCameraOff && !isScreenSharing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-indigo-400 p-2">
            <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center text-xl sm:text-2xl font-bold text-white mb-2 shadow-lg shadow-indigo-500/10">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-slate-400">
              Camera is paused
            </span>
          </div>
        )}

        {/* LOCAL NAME AND STATUS BADGE */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-slate-900/85 backdrop-blur-md px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-800 text-[11px] sm:text-xs font-medium text-white flex items-center gap-1.5 shadow z-10 max-w-[90%] truncate">
          <span className="truncate">{currentUser.name} (You)</span>

          {isMicMuted ? (
            <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400 shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          )}

          {isScreenSharing && (
            <span className="hidden xs:inline-flex text-[9px] sm:text-[10px] font-bold text-indigo-300 bg-indigo-500/30 border border-indigo-500/40 px-1.5 py-0.2 rounded-full items-center gap-1 shrink-0">
              <MonitorUp className="w-2.5 h-2.5 text-indigo-400" />
              <span>Screen</span>
            </span>
          )}

          {backgroundEffect !== 'none' && !isScreenSharing && (
            <span className="hidden sm:inline-flex text-[9px] sm:text-[10px] font-bold text-violet-300 bg-violet-500/25 border border-violet-500/40 px-1.5 py-0.2 rounded-full items-center gap-1 shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-violet-400" />
              <span>
                {backgroundEffect.includes('blur') ? 'Blur' : 'Virtual BG'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* REMOTE VIDEO TILES */}
      {remoteParticipants.map((p) => (
        <RemoteVideoTile
          key={p.id}
          participant={p}
          stream={remoteStreams[p.id] || null}
        />
      ))}

      {/* WAITING FOR PEERS TILE (WHEN ALONE) */}
      {remoteParticipants.length === 0 && (
        <div className="relative bg-slate-950 rounded-xl sm:rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center h-full w-full min-h-0 shadow-inner">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/95">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2 shadow">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" />
            </div>

            <h4 className="text-xs sm:text-sm font-semibold text-slate-200 mb-0.5">
              Waiting for others to join...
            </h4>

            <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mb-3">
              Share code{' '}
              <span className="font-mono text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                {roomCode}
              </span>{' '}
              with participants.
            </p>

            <button
              onClick={onCopyLink}
              className="text-xs px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600/80 hover:bg-indigo-500 active:scale-95 text-white rounded-xl transition flex items-center gap-1.5 font-medium shadow-lg shadow-indigo-600/20"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
