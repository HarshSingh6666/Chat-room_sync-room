import React from 'react';
import { Participant, UserProfile } from '../../types';
import { Users, X } from 'lucide-react';

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
    <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-800 p-5 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>Participants ({participants.length})</span>
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">
                  {p.name} {p.id === currentUser.id && '(You)'}
                </p>
                <span
                  className={`text-[10px] font-semibold ${
                    p.role === 'admin'
                      ? 'text-indigo-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {p.role === 'admin' ? 'Room Admin' : 'Guest'}
                </span>
              </div>
            </div>

            {isAdmin && p.id !== currentUser.id && (
              <button
                onClick={() => onKickParticipant(p.id)}
                className="text-[11px] px-2 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
              >
                Kick
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={onEndRoom}
            className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold transition"
          >
            End Meeting for Everyone
          </button>
        </div>
      )}
    </div>
  );
};
