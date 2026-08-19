'use client';

import { Clock, Send, AlertTriangle, Users, Layers, Activity } from 'lucide-react';

interface StatsProps {
  stats: {
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    totalScheduled: number;
    sendersCount: number;
  };
}

export default function StatsCards({ stats }: StatsProps) {
  const cards = [
    {
      title: 'Total Queued Jobs',
      value: stats.totalScheduled,
      icon: Layers,
      color: 'from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30',
    },
    {
      title: 'Pending & Scheduled',
      value: stats.pending,
      icon: Clock,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
    },
    {
      title: 'Currently Processing',
      value: stats.processing,
      icon: Activity,
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
    },
    {
      title: 'Successfully Sent',
      value: stats.sent,
      icon: Send,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      title: 'Failed Deliveries',
      value: stats.failed,
      icon: AlertTriangle,
      color: 'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30',
    },
    {
      title: 'Active Senders',
      value: stats.sendersCount,
      icon: Users,
      color: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="glass-card rounded-2xl p-4 flex flex-col justify-between border transition-all hover:border-slate-700"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 font-medium">{c.title}</span>
              <div className={`p-2 rounded-xl bg-gradient-to-br ${c.color} border`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-100 tracking-tight">{c.value}</div>
          </div>
        );
      })}
    </div>
  );
}
