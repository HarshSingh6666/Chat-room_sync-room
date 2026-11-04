import React from 'react';
import { Participant, UserProfile } from '../../types';
import { Users, X, Shield, UserX } from 'lucide-react';

interface ParticipantsDrawerProps {
  isOpen: boolean;
  participants: Participant[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onClose: () => void;
  onKickParticipant: (participantId: string) => void;
  onEndRoom: () => void;
}

export const ParticipantsDrawer: React.FC<ParticipantsDrawerProps> = ({
  isOpen,
  participants,
  currentUser,
  isAdmin,
  onClose,
  onKickParticipant,
  onEndRoom,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Tap backdrop to close on mobile */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-xs sm:w-80 h-full bg-slate-900 border-l border-slate-800 p-4 sm:p-5 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800 mb-3 sm:mb-4 shrink-0">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Participants ({participants.length})</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
          {participants.map((p) => {
            const isMe = p.id === currentUser.id;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-950 border border-slate-800/80 gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {p.name} {isMe && '(You)'}
                    </p>
                    <span
                      className={`text-[10px] font-semibold flex items-center gap-1 ${
                        p.role === 'admin'
                          ? 'text-indigo-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {p.role === 'admin' && <Shield className="w-2.5 h-2.5" />}
                      {p.role === 'admin' ? 'Room Admin' : 'Guest'}
                    </span>
                  </div>
                </div>

                {isAdmin && !isMe && (
                  <button
                    onClick={() => onKickParticipant(p.id)}
                    className="text-[11px] px-2 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition shrink-0 flex items-center gap-1"
                    title="Remove participant"
                  >
                    <UserX className="w-3 h-3" />
                    <span>Kick</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div className="pt-3 border-t border-slate-800 mt-auto shrink-0">
            <button
              onClick={onEndRoom}
              className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold transition active:scale-95"
            >
              End Meeting for Everyone
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
