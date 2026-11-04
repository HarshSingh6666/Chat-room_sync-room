import React from 'react';
import { RoomData, UserProfile } from '../../types';
import {
  Shield,
  Copy,
  Check,
  Sparkles,
  Users,
  AlertCircle,
  PhoneOff,
  Video,
  MessageSquare,
  Columns,
} from 'lucide-react';

interface RoomHeaderProps {
  room: RoomData;
  currentUser: UserProfile;
  isAdmin: boolean;
  copiedLink: boolean;
  connectionState: string;
  participantCount: number;
  unreadCount?: number;
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
  unreadCount = 0,
  layoutMode,
  onCopyLink,
  onOpenAiModal,
  onChangeLayout,
  onToggleParticipants,
  onEndRoom,
  onLeaveRoom,
}) => {
  return (
    <div className="relative z-40 shrink-0 mb-2 sm:mb-3 rounded-xl sm:rounded-2xl border border-slate-800/80 bg-slate-900/95 backdrop-blur-md p-2 sm:px-3 sm:py-2.5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5">
        {/* LEFT: Room info, Role, AI Copilot */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Room Code with Copy */}
          <div className="flex items-center gap-1.5 rounded-lg sm:rounded-xl border border-slate-800 bg-slate-950 px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-inner">
            <span className="text-[10px] sm:text-xs font-medium text-slate-400">
              Room:
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-indigo-400">
              {room.code}
            </span>
            <button
              onClick={onCopyLink}
              title="Copy room invite link"
              className="ml-0.5 rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white active:scale-95"
            >
              {copiedLink ? (
                <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              )}
            </button>
          </div>

          {/* Role Badge */}
          <span
            className={`hidden xs:flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] sm:text-[11px] font-bold ${
              isAdmin
                ? 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300'
                : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {isAdmin && <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
            {isAdmin ? 'Host' : 'Guest'}
          </span>

          {/* AI Copilot Button */}
          <button
            onClick={onOpenAiModal}
            title="Open AI Meeting Assistant"
            className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600/30 via-violet-600/30 to-pink-600/30 px-2 py-1 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold text-indigo-200 shadow-sm transition hover:from-indigo-600/50 hover:to-pink-600/50 active:scale-95"
          >
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-pulse text-pink-400" />
            <span className="hidden sm:inline">AI Copilot</span>
            <span className="sm:hidden text-[10px]">AI</span>
          </button>

          {/* Connection Status indicator */}
          <div className="flex items-center gap-1 text-[10px] sm:text-xs px-1 text-slate-400">
            <span
              className={`h-2 w-2 rounded-full ${
                connectionState === 'connected'
                  ? 'animate-pulse bg-emerald-400'
                  : 'bg-amber-400'
              }`}
              title={
                connectionState === 'connected' ? 'P2P Live' : 'P2P Standby'
              }
            />
            <span className="hidden md:inline capitalize text-[11px]">
              {connectionState === 'connected' ? 'P2P Live' : 'P2P Standby'}
            </span>
          </div>
        </div>

        {/* RIGHT: View controls (Video/Chat), Participants, Leave */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Layout Switcher (Video vs Chat vs Split) */}
          <div className="flex items-center gap-0.5 rounded-lg sm:rounded-xl border border-slate-800 bg-slate-950 p-0.5 text-xs">
            {/* Split (Desktop/Tablet only) */}
            <button
              onClick={() => onChangeLayout('split')}
              title="Split View (Video + Chat)"
              className={`hidden lg:inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition ${
                layoutMode === 'split'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>

            {/* Video Focus */}
            <button
              onClick={() => onChangeLayout('video-focus')}
              title="Video View"
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] sm:text-xs font-medium transition ${
                layoutMode === 'video-focus'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Video</span>
            </button>

            {/* Chat Focus with unread badge */}
            <button
              onClick={() => onChangeLayout('chat-focus')}
              title="Chat View"
              className={`relative inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] sm:text-xs font-medium transition ${
                layoutMode === 'chat-focus'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Chat</span>
              {unreadCount > 0 && layoutMode !== 'chat-focus' && (
                <span className="ml-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Participants Button */}
          <button
            onClick={onToggleParticipants}
            title="View participants"
            className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-slate-800 bg-slate-950 px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs text-slate-300 transition hover:bg-slate-800 active:scale-95"
          >
            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-400" />
            <span className="font-semibold">{participantCount}</span>
          </button>

          {/* End Room (Admin only) */}
          {isAdmin && (
            <button
              onClick={onEndRoom}
              title="End meeting for all participants"
              className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-500/30 bg-rose-600/20 px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-rose-300 transition hover:bg-rose-600/30 active:scale-95"
            >
              <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">End</span>
            </button>
          )}

          {/* Leave Room Button */}
          <button
            onClick={onLeaveRoom}
            title={isAdmin ? 'Leave or End Meeting' : 'Leave Meeting'}
            className="flex items-center gap-1 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-rose-600 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium text-slate-200 hover:text-white transition active:scale-95"
          >
            <PhoneOff className="h-3 w-3 sm:hidden" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
};
