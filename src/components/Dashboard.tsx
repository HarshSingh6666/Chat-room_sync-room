import React, { useState } from 'react';
import { UserProfile, RoomData } from '../types';
import {
  Plus,
  ArrowRight,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  Users,
  Video,
} from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  onCreateRoom: () => Promise<RoomData>;
  onJoinRoom: (code: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [lastCreatedRoom, setLastCreatedRoom] = useState<RoomData | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const room = await onCreateRoom();
      setLastCreatedRoom(room);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoom(joinCode.trim().toUpperCase());
  };

  const copyShareLink = (code: string) => {
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const openSimulatedGuestTab = (code: string) => {
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-8 px-4 sm:px-6">
      <div className="max-w-3xl w-full space-y-6">
        {/* User Welcome Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950/60 via-slate-900/90 to-violet-950/40 border border-indigo-900/40 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
           
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Welcome, {user.name}
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{user.email || 'Authenticated User'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Role: Room Creator &amp; Meeting Host
              </p>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 shrink-0 disabled:opacity-60"
          >
            <Plus className="w-5 h-5" />
            <span>{isCreating ? 'Creating Room...' : 'Create a Room'}</span>
          </button>
        </div>

        {/* Room Join & Quick Test Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Join Room */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Join Existing Room</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Enter a 6-digit room code to join an active meeting.
              </p>

              <form onSubmit={handleJoin} className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. ABC-123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full uppercase font-mono tracking-widest text-center text-lg bg-slate-950 border border-slate-800 rounded-xl p-3 text-indigo-300 placeholder-slate-700 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  <span>Enter Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Card 2: Instant Multi-Tab Testing Helper */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-4">
                <Laptop className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Multi-Device &amp; Tab Testing</h3>
              <p className="text-xs text-slate-400 mt-1 mb-3">
                SyncRoom allows testing real WebRTC audio/video calling immediately across
                two browser tabs or on another device using STUN signaling.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-300 font-medium">
                  <Video className="w-3.5 h-3.5" />
                  <span>How to test WebRTC in 10 seconds:</span>
                </div>
                <p>1. Click <strong>Create a Room</strong> above.</p>
                <p>2. Copy the generated invite link.</p>
                <p>3. Open it in a second tab or incognito window.</p>
                <p>4. Type any Guest name &amp; watch both videos link up!</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>WebRTC STUN Signaling: Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
