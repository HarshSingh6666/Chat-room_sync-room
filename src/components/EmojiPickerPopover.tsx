import React, { useState } from 'react';
import { Smile, Sparkles, Heart, Briefcase, ThumbsUp } from 'lucide-react';

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
    name: 'Smiles & Moods',
    icon: Smile,
    emojis: ['😀', '😂', '🥹', '😍', '😎', '🤔', '🥳', '🤩', '😇', '🤯', '😴', '🫡'],
  },
  {
    id: 'gestures',
    name: 'Hands & People',
    icon: Heart,
    emojis: ['👋', '✌️', '🤝', '🙏', '✍️', '💪', '👌', '🤙', '✊', '🤛', '🤜'],
  },
  {
    id: 'work',
    name: 'Work & Tools',
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
    <div className="absolute bottom-14 right-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-40 backdrop-blur-xl">
      {/* Category Tabs */}
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
        <span className="text-[10px] text-slate-400 font-medium">{activeCategory.name}</span>
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-6 gap-1.5 max-h-40 overflow-y-auto p-1">
        {activeCategory.emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-slate-800 hover:scale-125 transition active:scale-95 select-none"
            title={`Insert ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Floating Reaction Quick Trigger Banner */}
      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Float to video call:</span>
        <div className="flex gap-1">
          {['❤️', '🎉', '🚀', '🔥'].map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => onSendReaction(em)}
              className="px-1.5 py-0.5 rounded-md bg-slate-800 hover:bg-indigo-600/40 text-xs hover:scale-110 transition"
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
