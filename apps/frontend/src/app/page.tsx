'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import ScheduledTable from '@/components/ScheduledTable';
import SentTable from '@/components/SentTable';
import ComposeModal from '@/components/ComposeModal';
import { Clock, Send, ShieldCheck, Sparkles, Server } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    totalScheduled: 0,
    sendersCount: 0,
  });

  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [sentEmails, setSentEmails] = useState([]);
  const [senders, setSenders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, scheduledRes, sentRes, sendersRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/emails/stats`),
        axios.get(`${API_BASE}/emails/scheduled`),
        axios.get(`${API_BASE}/emails/sent`),
        axios.get(`${API_BASE}/senders`),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
        setStats(statsRes.value.data.data);
      }
      if (scheduledRes.status === 'fulfilled' && scheduledRes.value.data.success) {
        setScheduledEmails(scheduledRes.value.data.data);
      }
      if (sentRes.status === 'fulfilled' && sentRes.value.data.success) {
        setSentEmails(sentRes.value.data.data);
      }
      if (sendersRes.status === 'fulfilled' && sendersRes.value.data.success) {
        setSenders(sendersRes.value.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard telemetry:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll telemetry every 4 seconds for live status updates
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* Subtle Glow Background Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-0 w-[400px] h-[300px] bg-cyan-500/5 blur-[100px] pointer-events-none rounded-full" />

      {/* Main Header Navbar */}
      <Header
        onOpenCompose={() => setIsComposeOpen(true)}
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Dashboard Body Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10">
        {/* Top Hero Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 p-6 rounded-2xl glass-card border border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">Outreach Operations Hub</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Rate Limiter Active
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Monitors Redis sliding window quotas, BullMQ worker queues (5 concurrency, 2000ms send delay), and Ethereal test inbox delivery links.
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex items-center gap-3 text-xs text-slate-400 font-mono bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-800">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Redis 7 • BullMQ 5 • MySQL 8.0</span>
          </div>
        </div>

        {/* Live Telemetry Stats */}
        <StatsCards stats={stats} />

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`pb-3 px-4 font-semibold text-xs flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'scheduled'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Scheduled Queue ({stats.pending + stats.processing})</span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`pb-3 px-4 font-semibold text-xs flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'sent'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent Logs ({stats.sent + stats.failed})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5 pb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Auto-refreshing live telemetry every 4s</span>
          </div>
        </div>

        {/* Tab Content Tables */}
        {activeTab === 'scheduled' ? (
          <ScheduledTable emails={scheduledEmails} isLoading={isLoading} />
        ) : (
          <SentTable emails={sentEmails} isLoading={isLoading} />
        )}
      </main>

      {/* Compose Campaign Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={fetchData}
        senders={senders}
      />
    </div>
  );
}
