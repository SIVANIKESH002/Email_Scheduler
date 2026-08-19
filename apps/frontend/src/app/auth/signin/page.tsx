'use client';

import { signIn } from 'next-auth/react';
import { Mail, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function SignInPage() {
  const [loading, setLoading] = useState(false);

  const handleDemoSignIn = async () => {
    setLoading(true);
    await signIn('credentials', {
      email: 'admin@reachinbox.com',
      password: 'admin123',
      callbackUrl: '/',
    });
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-modal rounded-2xl p-8 relative z-10 border border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">ReachInbox</h1>
            <p className="text-xs text-indigo-400 font-medium">Email Automation & Scheduling</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-100 mb-2">Welcome Back</h2>
        <p className="text-slate-400 text-sm mb-6">
          Sign in to manage outbound cold email schedules, rate limits, and live send logs.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 px-4 rounded-xl font-medium border border-slate-700 transition-all hover:border-slate-600 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0f172a] px-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Or
            </span>
          </div>

          <button
            onClick={handleDemoSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 px-4 rounded-xl font-medium shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Sign in as Admin Demo User</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protected with NextAuth OAuth 2.0 & Redis Rate Limiter</span>
        </div>
      </div>
    </div>
  );
}
