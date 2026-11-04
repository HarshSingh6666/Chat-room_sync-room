import React, { useState } from 'react';
import { Smile, Sparkles, Heart, Briefcase, ThumbsUp, X } from 'lucide-react';

interface EmojiPickerPopoverProps {
  onSelectEmoji: (emoji: string) => void;
  onSendReaction: (emoji: string) => void;
  onClose: () => void;
}

const CATEGORIES = [
  {
    id: 'reactions',
    name: 'Top Reactions',
    icon: ThumbsUp,
    emojis: ['👍', '❤️', '🔥', '🎉', '👏', '🚀', '💡', '💯', '✨', '🙌', '👀'],
  },
  {
    id: 'faces',
    name: 'Moods',
    icon: Smile,
    emojis: ['😀', '😂', '🥹', '😍', '😎', '🤔', '🥳', '🤩', '😇', '🤯', '😴', '🫡'],
  },
  {
    id: 'gestures',
    name: 'Hands',
    icon: Heart,
    emojis: ['👋', '✌️', '🤝', '🙏', '✍️', '💪', '👌', '🤙', '✊', '🤛', '🤜'],
  },
  {
    id: 'work',
    name: 'Work',
    icon: Briefcase,
    emojis: ['💻', '📱', '📊', '📝', '🎯', '⚡', '🔔', '📌', '🔒', '💡', '⏱️', '☕'],
  },
];

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  onSelectEmoji,
  onSendReaction,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('reactions');

  const activeCategory = CATEGORIES.find((c) => c.id === activeTab) || CATEGORIES[0];

  return (
    <div className="absolute bottom-12 sm:bottom-14 right-0 sm:right-2 w-[calc(100vw-2rem)] sm:w-72 max-w-xs bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2.5 sm:p-3 z-40 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
      {/* Category Tabs & Close */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`p-1.5 rounded-lg transition ${
                  activeTab === cat.id
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={cat.name}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-medium">{activeCategory.name}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close emoji picker"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-6 gap-1 max-h-36 sm:max-h-40 overflow-y-auto p-1">
        {activeCategory.emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-lg sm:text-xl rounded-xl hover:bg-slate-800 hover:scale-125 transition active:scale-95 select-none"
            title={`Insert ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Floating Reaction Quick Trigger Banner */}
      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Float to video:</span>
        <div className="flex gap-1">
          {['❤️', '🎉', '🚀', '🔥'].map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => onSendReaction(em)}
              className="px-1.5 py-0.5 rounded-md bg-slate-800 hover:bg-indigo-600/40 text-xs hover:scale-110 transition active:scale-90"
              title={`Float ${em} to screen`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
