import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowRight,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { UserProfile } from '../types';

export interface PreJoinSettings {
  name: string;
  isCameraOff: boolean;
  isMicMuted: boolean;
}

interface PreJoinModalProps {
  isOpen: boolean;
  roomCode: string;
  isHost?: boolean;
  currentUser?: UserProfile | null;
  onJoin: (settings: PreJoinSettings) => void;
  onClose?: () => void;
  onSwitchToGoogleLogin?: () => void;
}

export const PreJoinModal: React.FC<PreJoinModalProps> = ({
  isOpen,
  roomCode,
  isHost = false,
  currentUser,
  onJoin,
  onClose,
  onSwitchToGoogleLogin,
}) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (currentUser?.name) {
      setName(currentUser.name);
    }
  }, [currentUser]);

  // Handle local camera preview in the lobby
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function startPreview() {
      if (isCameraOff) {
        if (previewStreamRef.current) {
          previewStreamRef.current.getVideoTracks().forEach((t) => t.stop());
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        previewStreamRef.current = stream;
        setPreviewStream(stream);
        setPermissionError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.warn('Lobby camera preview error:', err);
        setPermissionError('Camera is disabled or permission denied');
      }
    }

    startPreview();

    return () => {
      active = false;
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop());
        previewStreamRef.current = null;
      }
    };
  }, [isOpen, isCameraOff]);

  // Keep video ref attached when stream changes
  useEffect(() => {
    if (videoRef.current && previewStream && !isCameraOff) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream, isCameraOff]);

  if (!isOpen) return null;

  const handleToggleCamera = () => {
    const nextState = !isCameraOff;
    setIsCameraOff(nextState);

    if (nextState) {
      if (previewStreamRef.current) {
        previewStreamRef.current.getVideoTracks().forEach((t) => t.stop());
        previewStreamRef.current = null;
      }
      setPreviewStream(null);
    }
  };

  const handleToggleMic = () => {
    setIsMicMuted((prev) => !prev);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clean up preview camera hardware before handing over to RoomView
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    }

    const finalName =
      name.trim() ||
      currentUser?.name ||
      'Guest-' + Math.floor(100 + Math.random() * 900);

    onJoin({
      name: finalName,
      isCameraOff,
      isMicMuted,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                {isHost ? 'Start Meeting Lobby' : 'Join Room Check'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Room:{' '}
                <span className="font-mono text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                  {roomCode}
                </span>
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Video & Audio Preview Box */}
        <div className="relative aspect-video w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner mb-4">
          {!isCameraOff && !permissionError ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              webkit-playsinline="true"
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 p-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 mb-2 shadow">
                <VideoOff className="w-8 h-8" />
              </div>
              <p className="text-xs font-semibold text-slate-300">
                Camera is Turned OFF
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {permissionError || 'Your virtual avatar feed will be shown'}
              </p>
            </div>
          )}

          {/* Quick Controls floating over preview */}
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 z-10">
            {/* Mic Toggle */}
            <button
              type="button"
              onClick={handleToggleMic}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition active:scale-95 ${
                isMicMuted
                  ? 'bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-500'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 backdrop-blur-md'
              }`}
              title={isMicMuted ? 'Microphone is OFF' : 'Microphone is ON'}
            >
              {isMicMuted ? (
                <>
                  <MicOff className="w-4 h-4 text-white" />
                  <span>Mic Off</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span>Mic On</span>
                </>
              )}
            </button>

            {/* Camera Toggle */}
            <button
              type="button"
              onClick={handleToggleCamera}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition active:scale-95 ${
                isCameraOff
                  ? 'bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-500'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 backdrop-blur-md'
              }`}
              title={isCameraOff ? 'Camera is OFF' : 'Camera is ON'}
            >
              {isCameraOff ? (
                <>
                  <VideoOff className="w-4 h-4 text-white" />
                  <span>Camera Off</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 text-emerald-400" />
                  <span>Camera On</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form: Name & Join */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {(!currentUser || currentUser.isAnonymous) && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Your Display Name
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Taylor Brooks"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          )}

          {/* Join Settings Summary */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-[11px] text-slate-400 flex items-center justify-around">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isMicMuted ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              Audio: {isMicMuted ? 'Muted' : 'Unmuted'}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isCameraOff ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
              />
              Video: {isCameraOff ? 'Camera Off' : 'Camera On'}
            </span>
          </div>

          {/* Join Button */}
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-95"
          >
            <span>{isHost ? 'Enter Meeting as Host' : 'Join Room Now'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Switch to Google Login option for guests */}
        {!currentUser?.role && onSwitchToGoogleLogin && (
          <div className="mt-3.5 pt-3 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onSwitchToGoogleLogin}
              className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5 mx-auto"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Are you the Host? Sign in with Google</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

