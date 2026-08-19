'use client';

import { useSession, signOut } from 'next-auth/react';
import { Mail, Plus, LogOut, RefreshCw, Zap } from 'lucide-react';

interface HeaderProps {
  onOpenCompose: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Header({ onOpenCompose, onRefresh, isRefreshing }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="border-b border-slate-800 bg-[#090D16]/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight text-lg">ReachInbox</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Cold Email Scheduler & Rate Limiter</p>
          </div>
        </div>

        {/* Actions & User */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-all text-xs flex items-center gap-1.5"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={onOpenCompose}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2 px-4 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Compose Schedule</span>
          </button>

          {session?.user && (
            <div className="flex items-center gap-3 border-l border-slate-800 pl-3">
              <img
                src={session.user.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80'}
                alt={session.user.name || 'User'}
                className="w-8 h-8 rounded-full border border-indigo-500/30"
              />
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-200">{session.user.name}</p>
                <p className="text-[10px] text-slate-400">{session.user.email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
