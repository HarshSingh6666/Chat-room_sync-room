import React from 'react';
import { UserProfile } from '../types';
import { Video, LogOut } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onSignOut }) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white">
          <Video className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              SyncRoom
            </span>
            <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Web Room Call
            </span>
          </div>
          <p className="hidden sm:block text-[11px] text-slate-400">P2P Video &amp; Real-Time Room Chat</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Profile & Sign Out */}
        {user && (
          <div className="flex items-center gap-2.5">

            <div className="hidden lg:block text-left">
              <p className="text-xs font-medium text-slate-200 leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-500 leading-none mt-1 capitalize">{user.role || 'User'}</p>
            </div>
            <button
              onClick={onSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
