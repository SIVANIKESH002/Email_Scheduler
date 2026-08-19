'use client';

import { useState } from 'react';
import { Send, Search, ExternalLink, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface SentEmail {
  id: string;
  recipientEmail: string;
  subject: string;
  scheduledAt: string;
  updatedAt: string;
  status: 'SENT' | 'FAILED';
  sender: {
    name: string;
    email: string;
  };
  sendLogs: Array<{
    id: string;
    attemptedAt: string;
    status: 'SENT' | 'FAILED';
    error?: string | null;
    previewUrl?: string | null;
  }>;
}

interface SentTableProps {
  emails: SentEmail[];
  isLoading: boolean;
}

export default function SentTable({ emails, isLoading }: SentTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmails = emails.filter(
    (item) =>
      item.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sender.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-400" />
            <span>Sent & Execution Log</span>
          </h2>
          <p className="text-xs text-slate-400">Completed jobs with Ethereal SMTP preview links & status audit trail.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sent recipient, subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs"
          />
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/60 uppercase text-[11px] tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Recipient</th>
              <th className="py-3.5 px-4 font-semibold">Subject</th>
              <th className="py-3.5 px-4 font-semibold">Sender</th>
              <th className="py-3.5 px-4 font-semibold">Sent Timestamp</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold">Ethereal Inbox Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    <span>Loading execution logs...</span>
                  </div>
                </td>
              </tr>
            ) : filteredEmails.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <Send className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-medium text-slate-400">No sent emails recorded yet</p>
                  <p className="text-[11px] text-slate-600 mt-1">When BullMQ workers dispatch jobs, preview links will appear here.</p>
                </td>
              </tr>
            ) : (
              filteredEmails.map((item) => {
                const latestLog = item.sendLogs[0];
                const sentDate = new Date(item.updatedAt);

                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {item.recipientEmail}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                      {item.subject}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-indigo-300">{item.sender.name}</span>
                      <div className="text-[10px] text-slate-500 font-mono">{item.sender.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {sentDate.toLocaleDateString()} {sentDate.toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status === 'SENT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>SENT</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30" title={latestLog?.error || 'Execution failed'}>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>FAILED</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {latestLog?.previewUrl ? (
                        <a
                          href={latestLog.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all"
                        >
                          <span>View Email</span>
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-600 italic">No URL available</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
