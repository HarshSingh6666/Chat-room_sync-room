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
    <div className="p-3 bg-slate-950/95 border-t border-slate-800/80 flex flex-col xl:flex-row items-center justify-between gap-3 shrink-0">
      {/* Quick Floating Emoji Reaction Bar */}
      <div className="flex flex-wrap justify-center items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-2xl border border-slate-800/80">
        <span className="text-[11px] text-slate-400 font-medium px-1 flex items-center gap-1">
          <Smile className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">React:</span>
        </span>
        {QUICK_REACTIONS.map((item) => (
          <button
            key={item.emoji}
            onClick={() => onSendReaction(item.emoji)}
            className="w-8 h-8 flex items-center justify-center text-lg rounded-xl hover:bg-slate-800 hover:scale-130 active:scale-95 transition"
            title={`Float ${item.label} to video`}
          >
            {item.emoji}
          </button>
        ))}
      </div>

      {/* Video, Mic, Screen Share Dock Buttons */}
      <div className="flex flex-wrap justify-center items-center gap-2.5">
        {/* Toggle Mic */}
        <button
          onClick={onToggleMic}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition shadow-lg ${
            isMicMuted
              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
          }`}
          title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Toggle Camera */}
        <button
          onClick={onToggleCamera}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition shadow-lg ${
            isCameraOff
              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
          }`}
          title={isCameraOff ? 'Turn On Camera' : 'Turn Off Camera'}
        >
          {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
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
            className={`px-3.5 h-11 rounded-2xl flex items-center gap-1.5 transition shadow-lg font-medium text-xs ${
              backgroundEffect !== 'none'
                ? 'bg-violet-600/30 text-violet-200 border border-violet-500/50 shadow-violet-600/20 ring-1 ring-violet-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Virtual Background & Blur Effects"
          >
            <Sparkles
              className={`w-4 h-4 ${
                backgroundEffect !== 'none'
                  ? 'text-violet-300 animate-pulse'
                  : 'text-indigo-400'
              }`}
            />
            <span className="hidden md:inline">
              {backgroundEffect === 'none'
                ? 'Background'
                : backgroundEffect.includes('blur')
                ? 'Blur'
                : 'Virtual BG'}
            </span>
          </button>
        </div>

        {/* Screen Share Button */}
        <button
          onClick={onToggleScreenShare}
          className={`px-3.5 h-11 rounded-2xl flex items-center gap-2 transition shadow-lg font-medium text-xs ${
            isScreenSharing
              ? 'bg-indigo-600 text-white border border-indigo-400 shadow-indigo-600/30 ring-2 ring-indigo-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        >
          {isScreenSharing ? (
            <>
              <MonitorX className="w-4 h-4 text-white" />
              <span>Stop Sharing</span>
            </>
          ) : (
            <>
              <MonitorUp className="w-4 h-4 text-indigo-400" />
              <span>Share Screen</span>
            </>
          )}
        </button>

        {/* Sound Test Chime */}
        <button
          onClick={onPlayChime}
          className="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition shadow-lg"
          title="Test Audio Chime"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Leave or End Call */}
        <button
          onClick={onLeaveRoom}
          className="w-11 h-11 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition shadow-lg shadow-rose-600/30"
          title={isAdmin ? 'End Meeting for All' : 'Leave Room Call'}
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
