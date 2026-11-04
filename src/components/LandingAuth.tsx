import React, { useState } from 'react';
import {
  Video,
  ShieldCheck,
  MessageSquare,
  Users,
  Mic,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface LandingAuthProps {
  onGoogleLogin: () => Promise<void> | void;
  onGuestJoin: (name: string, roomCode: string) => void;
  initialRoomCode?: string;
}

export const LandingAuth: React.FC<LandingAuthProps> = ({
  onGoogleLogin,
  onGuestJoin,
  initialRoomCode = '',
}) => {
  const [guestName, setGuestName] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [loading, setLoading] = useState(false);

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      alert('Please enter a valid room code');
      return;
    }
    const name = guestName.trim() || 'Guest-' + Math.floor(100 + Math.random() * 900);
    onGuestJoin(name, roomCode.trim().toUpperCase());
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    try {
      await onGoogleLogin();
    } catch (err) {
      console.error('Google login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-start md:justify-center items-center py-6 sm:py-8 px-4 sm:px-6 overflow-y-auto min-h-0 w-full pt-safe pb-safe">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: App Highlights */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Real-Time Video Rooms &amp; Chat</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Seamless Video Calls.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Instant Room Access.
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
            Create secure rooms instantly, manage calls as an Admin, and let guests join in one click with a room code without mandatory sign-ups.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-left">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">P2P Video Call</h4>
                <p className="text-[11px] text-slate-500">Encrypted peer audio &amp; video.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Live Chat</h4>
                <p className="text-[11px] text-slate-500">Real-time room messaging feed.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Guest Join</h4>
                <p className="text-[11px] text-slate-500">Join instantly using a room code.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Host Controls</h4>
                <p className="text-[11px] text-slate-500">Admin management &amp; ending calls.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Google Login (Host) & Guest Join Card */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white mb-3">
              <Mic className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Get Started</h2>
            <p className="text-xs text-slate-400 mt-1">Sign in as Host or join as Guest</p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3.5 px-4 rounded-xl shadow-lg transition active:scale-[0.98] disabled:opacity-70 group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-sm">
              {loading ? 'Connecting...' : 'Sign in with Google (Host)'}
            </span>
          </button>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-wider font-medium">
              or join via room code
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Guest Join Form */}
          <form onSubmit={handleGuestSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Your Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Morgan"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Room Code
              </label>
              <input
                type="text"
                placeholder="e.g. ABC-123"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs uppercase font-mono tracking-wider text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow"
            >
              <span>Enter Room as Guest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <p className="text-[11px] text-slate-500 text-center mt-4">
            Guests can join directly with a room link or code.
          </p>
        </div>

      </div>
    </div>
  );
};