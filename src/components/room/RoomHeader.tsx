
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
    <div className="relative z-40 shrink-0 mb-3 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-3 sm:px-4 sm:py-3 shadow-md">

      {/* TOP SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-3">

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">

          {/* Room Code */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 shadow-inner">
            <span className="text-xs font-medium text-slate-400">
              Room:
            </span>

            <span className="font-mono text-sm font-bold tracking-wider text-indigo-400">
              {room.code}
            </span>

            <button
              onClick={onCopyLink}
              title="Copy room invite link"
              className="ml-1 rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              {copiedLink ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Role */}
          <span
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
              isAdmin
                ? 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300'
                : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {isAdmin && <Shield className="h-3 w-3" />}
            {isAdmin ? 'Admin' : 'Guest'}
          </span>

          {/* AI Copilot */}
          <button
            onClick={onOpenAiModal}
            title="Open AI Meeting Assistant"
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600/30 via-violet-600/30 to-pink-600/30 px-3 py-1.5 text-xs font-bold text-indigo-200 shadow-sm transition hover:from-indigo-600/50 hover:to-pink-600/50"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-pink-400" />
            <span>AI Copilot</span>
          </button>

          {/* Connection Status */}
          <div className="hidden items-center gap-1.5 text-xs sm:flex">
            <span
              className={`h-2 w-2 rounded-full ${
                connectionState === 'connected'
                  ? 'animate-pulse bg-emerald-400'
                  : 'bg-amber-400'
              }`}
            />

            <span
              className={`capitalize ${
                connectionState === 'connected'
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {connectionState === 'connected'
                ? 'P2P Live'
                : 'P2P Standby'}
            </span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">

          {/* Layout Controls */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs">

            {/* Split: Desktop only */}
            <button
              onClick={() => onChangeLayout('split')}
              className={`hidden rounded-lg px-3 py-1.5 font-medium transition sm:inline-flex ${
                layoutMode === 'split'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Split
            </button>

            {/* Video */}
            <button
              onClick={() => onChangeLayout('video-focus')}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                layoutMode === 'video-focus'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Video
            </button>

            {/* Chat */}
            <button
              onClick={() => onChangeLayout('chat-focus')}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                layoutMode === 'chat-focus'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chat
            </button>
          </div>

          {/* Participants */}
          <button
            onClick={onToggleParticipants}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
          >
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span>{participantCount}</span>
          </button>

          {/* End Room */}
          {isAdmin && (
            <button
              onClick={onEndRoom}
              className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-600/20 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-600/30"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">End Room</span>
              <span className="xs:hidden">End</span>
            </button>
          )}

          {/* Leave */}
          <button
            onClick={onLeaveRoom}
            className="rounded-xl bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};
