import React from 'react';
import { BackgroundEffect } from '../../services/virtualBackground';
import { VirtualBackgroundPopover } from '../VirtualBackgroundPopover';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  MonitorX,
  Volume2,
  Sparkles,
  Smile,
} from 'lucide-react';

interface VideoControlsDockProps {
  isAdmin?: boolean;
  isMicMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  backgroundEffect: BackgroundEffect;
  showBackgroundPopover: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleBackgroundPopover: () => void;
  onSelectBackground: (effect: BackgroundEffect) => void;
  onCloseBackgroundPopover: () => void;
  onPlayChime: () => void;
  onLeaveRoom: () => void;
  onSendReaction: (emoji: string) => void;
}

const QUICK_REACTIONS = [
  { emoji: '❤️', label: 'Heart' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '👍', label: 'Thumbs Up' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '💡', label: 'Idea' },
];

export const VideoControlsDock: React.FC<VideoControlsDockProps> = ({
  isAdmin,
  isMicMuted,
  isCameraOff,
  isScreenSharing,
  backgroundEffect,
  showBackgroundPopover,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleBackgroundPopover,
  onSelectBackground,
  onCloseBackgroundPopover,
  onPlayChime,
  onLeaveRoom,
  onSendReaction,
}) => {
  return (
    <div className="p-1.5 sm:p-2.5 bg-slate-950/95 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-1.5 sm:gap-2.5 shrink-0">
      {/* Quick Floating Emoji Reaction Bar */}
      <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 sm:py-1 rounded-xl sm:rounded-2xl border border-slate-800/80 overflow-x-auto max-w-full no-scrollbar">
        <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium px-1 flex items-center gap-1 shrink-0">
          <Smile className="w-3 h-3 text-indigo-400" />
          <span className="hidden sm:inline">React:</span>
        </span>
        {QUICK_REACTIONS.map((item) => (
          <button
            key={item.emoji}
            onClick={() => onSendReaction(item.emoji)}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-base sm:text-lg rounded-lg sm:rounded-xl hover:bg-slate-800 hover:scale-125 active:scale-90 transition shrink-0"
            title={`Float ${item.label} to video`}
          >
            {item.emoji}
          </button>
        ))}
      </div>

      {/* Video, Mic, Background, Screen Share Dock Buttons */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 w-full md:w-auto">
        {/* Toggle Mic */}
        <button
          onClick={onToggleMic}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center transition shadow-lg active:scale-95 ${
            isMicMuted
              ? 'bg-rose-600/25 text-rose-300 border border-rose-500/40 ring-1 ring-rose-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
          }`}
          title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          aria-label={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMicMuted ? (
            <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
          ) : (
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>

        {/* Toggle Camera */}
        <button
          onClick={onToggleCamera}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center transition shadow-lg active:scale-95 ${
            isCameraOff
              ? 'bg-rose-600/25 text-rose-300 border border-rose-500/40 ring-1 ring-rose-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
          }`}
          title={isCameraOff ? 'Turn On Camera' : 'Turn Off Camera'}
          aria-label={isCameraOff ? 'Turn On Camera' : 'Turn Off Camera'}
        >
          {isCameraOff ? (
            <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
          ) : (
            <Video className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>

        {/* Virtual Background & Blur Popover + Button */}
        <div className="relative">
          {showBackgroundPopover && (
            <VirtualBackgroundPopover
              currentEffect={backgroundEffect}
              onSelectEffect={onSelectBackground}
              onClose={onCloseBackgroundPopover}
            />
          )}
          <button
            onClick={onToggleBackgroundPopover}
            className={`h-10 sm:h-11 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl flex items-center gap-1.5 transition shadow-lg font-medium text-xs active:scale-95 ${
              backgroundEffect !== 'none'
                ? 'bg-violet-600/30 text-violet-200 border border-violet-500/50 shadow-violet-600/20 ring-1 ring-violet-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Virtual Background & Blur Effects"
            aria-label="Virtual Background & Blur Effects"
          >
            <Sparkles
              className={`w-4 h-4 ${
                backgroundEffect !== 'none'
                  ? 'text-violet-300 animate-pulse'
                  : 'text-indigo-400'
              }`}
            />
            <span className="hidden sm:inline">
              {backgroundEffect === 'none'
                ? 'BG'
                : backgroundEffect.includes('blur')
                ? 'Blur'
                : 'Virtual'}
            </span>
          </button>
        </div>

        {/* Screen Share Button */}
        <button
          onClick={onToggleScreenShare}
          className={`h-10 sm:h-11 px-2.5 sm:px-3.5 rounded-xl sm:rounded-2xl flex items-center gap-1.5 transition shadow-lg font-medium text-xs active:scale-95 ${
            isScreenSharing
              ? 'bg-indigo-600 text-white border border-indigo-400 shadow-indigo-600/30 ring-2 ring-indigo-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          aria-label={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        >
          {isScreenSharing ? (
            <>
              <MonitorX className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Stop Share</span>
            </>
          ) : (
            <>
              <MonitorUp className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Share</span>
            </>
          )}
        </button>

        {/* Audio Test Chime Button */}
        <button
          onClick={onPlayChime}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition shadow-lg active:scale-95"
          title="Play Test Chime"
          aria-label="Play Test Chime"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Leave or End Call Button */}
        <button
          onClick={onLeaveRoom}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition shadow-lg shadow-rose-600/30 active:scale-95"
          title={isAdmin ? 'End Meeting for All' : 'Leave Room Call'}
          aria-label={isAdmin ? 'End Meeting for All' : 'Leave Room Call'}
        >
          <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};
