import React from 'react';
import { RoomData, UserProfile } from '../../types';
import {
  Shield,
  Copy,
  Check,
  Sparkles,
  Users,
  AlertCircle,
} from 'lucide-react';

interface RoomHeaderProps {
  room: RoomData;
  currentUser: UserProfile;
  isAdmin: boolean;
  copiedLink: boolean;
  connectionState: string;
  participantCount: number;
  layoutMode: 'split' | 'video-focus' | 'chat-focus';
  onCopyLink: () => void;
  onOpenAiModal: () => void;
  onChangeLayout: (mode: 'split' | 'video-focus' | 'chat-focus') => void;
  onToggleParticipants: () => void;
  onEndRoom: () => void;
  onLeaveRoom: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  room,
  currentUser,
  isAdmin,
  copiedLink,
  connectionState,
  participantCount,
  layoutMode,
  onCopyLink,
  onOpenAiModal,
  onChangeLayout,
  onToggleParticipants,
  onEndRoom,
  onLeaveRoom,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl px-4 py-3 mb-3 flex flex-wrap items-center justify-between gap-3 shadow-md shrink-0">
      <div className="flex items-center gap-3">
        {/* Room Code Badge */}
        <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-inner">
          <span className="text-xs text-slate-400 font-medium">Room:</span>
          <span className="font-mono text-indigo-400 font-bold text-sm tracking-wider">
            {room.code}
          </span>
          <button
            onClick={onCopyLink}
            title="Copy room invite link"
            className="ml-1 text-slate-400 hover:text-white transition p-1 hover:bg-slate-800 rounded-lg"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Role Badge */}
        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
            isAdmin
              ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          }`}
        >
          {isAdmin && <Shield className="w-3 h-3" />}
          {isAdmin ? 'Admin (Host)' : 'Guest'}
        </span>

        {/* AI Copilot Quick Launcher Button */}
        <button
          onClick={onOpenAiModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/30 via-violet-600/30 to-pink-600/30 hover:from-indigo-600/50 hover:to-pink-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-bold transition shadow-sm"
          title="Open AI Meeting Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
          <span>AI Copilot</span>
        </button>

        {/* WebRTC Connection Status */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionState === 'connected'
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          ></span>
          <span
            className={`capitalize ${
              connectionState === 'connected'
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {connectionState === 'connected' ? 'P2P Live' : 'P2P Standby'}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Layout Mode Toggles */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] sm:text-xs">
          <button
            onClick={() => onChangeLayout('split')}
            className={`px-2 py-1 sm:px-2.5 rounded-lg font-medium transition ${
              layoutMode === 'split'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => onChangeLayout('video-focus')}
            className={`px-2 py-1 sm:px-2.5 rounded-lg font-medium transition ${
              layoutMode === 'video-focus'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Video
          </button>
          <button
            onClick={() => onChangeLayout('chat-focus')}
            className={`px-2 py-1 sm:px-2.5 rounded-lg font-medium transition ${
              layoutMode === 'chat-focus'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chat
          </button>
        </div>

        {/* Participants Button */}
        <button
          onClick={onToggleParticipants}
          className="text-xs px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition"
        >
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>{participantCount}</span>
        </button>

        {/* Admin End Room Button */}
        {isAdmin && (
          <button
            onClick={onEndRoom}
            className="text-xs px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold transition flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>End Room</span>
          </button>
        )}

        {/* Leave Call */}
        <button
          onClick={onLeaveRoom}
          className="text-xs px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
        >
          Leave
        </button>
      </div>
    </div>
  );
};
