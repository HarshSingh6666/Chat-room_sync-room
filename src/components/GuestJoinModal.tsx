import React, { useState } from 'react';
import { Video, ArrowRight, UserCheck, Shield } from 'lucide-react';

interface GuestJoinModalProps {
  roomCode: string;
  onJoinAsGuest: (name: string) => void;
  onSwitchToGoogleLogin: () => void;
}

export const GuestJoinModal: React.FC<GuestJoinModalProps> = ({
  roomCode,
  onJoinAsGuest,
  onSwitchToGoogleLogin,
}) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const guestName = name.trim() || 'Guest-' + Math.floor(100 + Math.random() * 900);
    onJoinAsGuest(guestName);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl relative text-center my-auto">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-4">
          <UserCheck className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">Join Room as Guest</h2>
        <p className="text-xs text-slate-400 mb-6">
          You've been invited to join room{' '}
          <span className="font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
            {roomCode}
          </span>
          . No account required!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Enter Your Display Name
            </label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Taylor Brooks"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <span>Enter Meeting Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={onSwitchToGoogleLogin}
            className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5 mx-auto"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Are you the Host? Sign in with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
