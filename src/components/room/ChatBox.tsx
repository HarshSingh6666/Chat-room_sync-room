import React, { useRef, useEffect } from 'react';
import { ChatMessage, UserProfile } from '../../types';
import { EmojiPickerPopover } from '../EmojiPickerPopover';
import {
  MessageSquare,
  Sparkles,
  Smile,
  Send,
} from 'lucide-react';

interface ChatBoxProps {
  messages: ChatMessage[];
  currentUser: UserProfile;
  inputText: string;
  showEmojiPicker: boolean;
  smartReplies: string[];
  onChangeInputText: (text: string) => void;
  onToggleEmojiPicker: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSendReaction: (emoji: string) => void;
  onSendMessage: (text?: string) => void;
  onOpenAiModal: () => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  currentUser,
  inputText,
  showEmojiPicker,
  smartReplies,
  onChangeInputText,
  onToggleEmojiPicker,
  onSelectEmoji,
  onSendReaction,
  onSendMessage,
  onOpenAiModal,
}) => {
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg min-h-0 relative h-full">
      {/* Chat Header with AI Copilot Action */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-white">Live Room Chat</h3>
        </div>

        <button
          onClick={onOpenAiModal}
          className="text-[11px] font-semibold text-indigo-300 hover:text-white px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition flex items-center gap-1.5"
        >
          <Sparkles className="w-3 h-3 text-pink-400" />
          <span>AI Notes</span>
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-xs font-medium text-slate-400">No messages yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Send a message to chat with everyone in the room.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isMe ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-slate-300">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                      msg.senderRole === 'admin'
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {msg.senderRole === 'admin' ? 'Host' : 'Guest'}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl break-words relative group ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10'
                      : 'bg-slate-800/90 text-slate-200 rounded-tl-none border border-slate-750'
                  }`}
                >
                  {msg.text}

                  {/* Quick message reaction trigger on hover */}
                  <button
                    onClick={() => onSendReaction('👍')}
                    className="opacity-0 group-hover:opacity-100 transition absolute -bottom-3 right-1 bg-slate-900 border border-slate-700 text-[10px] px-1.5 py-0.5 rounded-full shadow hover:scale-110"
                    title="React with 👍"
                  >
                    👍
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* AI Smart Replies Bar */}
      {smartReplies.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-slate-500 font-medium flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">AI Replies:</span>
          </span>
          {smartReplies.map((reply, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSendMessage(reply)}
              className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/20 whitespace-nowrap transition"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input & Emoji Picker Area */}
      <div className="relative p-3 bg-slate-950/95 border-t border-slate-800 flex gap-2 shrink-0">
        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <EmojiPickerPopover
            onSelectEmoji={onSelectEmoji}
            onSendReaction={onSendReaction}
            onClose={onToggleEmojiPicker}
          />
        )}

        {/* Emoji Popover Toggle Button */}
        <button
          type="button"
          onClick={onToggleEmojiPicker}
          className={`p-2.5 rounded-xl border transition ${
            showEmojiPicker
              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Add emojis or reactions"
        >
          <Smile className="w-4 h-4" />
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSendMessage();
          }}
          className="flex-1 flex gap-2"
        >
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => onChangeInputText(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center shadow-lg shadow-indigo-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
