
import React, { useEffect, useRef } from 'react';
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
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center min-h-[320px] lg:min-h-[420px] shadow-inner">

      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full absolute inset-0 ${
          participant.isScreenSharing
            ? 'object-contain bg-black'
            : 'object-contain object-center'
        } ${stream ? 'block' : 'hidden'}`}
      />

      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
          <p className="text-xs text-slate-400">
            Connecting to {participant.name}...
          </p>
        </div>
      )}

      {stream && (
        <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-medium text-white flex items-center gap-2 shadow z-10">
          <span>{participant.name}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>

          {participant.isScreenSharing && (
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <MonitorUp className="w-3 h-3 text-emerald-400" />
              <span>Screen Presentation</span>
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
  const remoteParticipants = participants.filter(
    (p) => p.id !== currentUser.id
  );

  const totalTiles = 1 + remoteParticipants.length;

  let gridClass = 'grid-cols-1';

  if (totalTiles === 2) {
    gridClass = 'grid-cols-1 lg:grid-cols-2';
  } else if (totalTiles <= 4) {
    gridClass = 'grid-cols-1 sm:grid-cols-2';
  } else if (totalTiles <= 9) {
    gridClass = 'grid-cols-2 lg:grid-cols-3';
  } else {
    gridClass = 'grid-cols-2 lg:grid-cols-4';
  }

  return (
    <div
      className={`flex-1 p-3 grid ${gridClass} gap-3 min-h-0 overflow-y-auto content-start`}
    >
      {/* LOCAL VIDEO TILE */}
      <div className="relative bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center min-h-[320px] lg:min-h-[420px] group shadow-inner">

        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full ${
            isScreenSharing
              ? 'object-contain bg-black'
              : 'object-contain object-center'
          } ${isCameraOff && !isScreenSharing ? 'hidden' : 'block'}`}
        />

        {/* CAMERA OFF AVATAR */}
        {isCameraOff && !isScreenSharing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-indigo-400">
            <div className="w-20 h-20 rounded-2xl bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center text-2xl font-bold text-white mb-2 shadow-lg shadow-indigo-500/10">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>

            <span className="text-xs font-medium text-slate-400">
              Camera is paused
            </span>
          </div>
        )}

        {/* LOCAL NAME AND STATUS */}
        <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-medium text-white flex items-center gap-2 shadow z-10">
          <span>{currentUser.name} (You)</span>

          {isMicMuted ? (
            <MicOff className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          )}

          {isScreenSharing && (
            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/30 border border-indigo-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <MonitorUp className="w-3 h-3 text-indigo-400" />
              <span>Your Screen Share</span>
            </span>
          )}

          {backgroundEffect !== 'none' && !isScreenSharing && (
            <span className="text-[10px] font-bold text-violet-300 bg-violet-500/25 border border-violet-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-violet-400" />
              <span>
                {backgroundEffect.includes('blur')
                  ? 'Bokeh Blur'
                  : 'Virtual BG'}
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

      {/* WAITING FOR PEERS */}
      {remoteParticipants.length === 0 && (
        <div className="relative bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center min-h-[320px] lg:min-h-[420px] shadow-inner">

          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3 shadow">
              <Users className="w-8 h-8 text-indigo-400" />
            </div>

            <h4 className="text-sm font-semibold text-slate-200 mb-1">
              Waiting for Peers to Join...
            </h4>

            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Send room code{' '}
              <span className="font-mono text-indigo-400 font-bold">
                {roomCode}
              </span>{' '}
              or invite via link.
            </p>

            <button
              onClick={onCopyLink}
              className="text-xs px-4 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-xl transition flex items-center gap-2 font-medium shadow-lg shadow-indigo-600/20"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}

              <span>
                {copiedLink ? 'Copied!' : 'Copy Share Link'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
