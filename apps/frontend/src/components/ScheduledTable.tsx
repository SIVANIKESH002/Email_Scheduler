'use client';

import { useState } from 'react';
import { Clock, Search, Mail, User, Hash } from 'lucide-react';

interface ScheduledEmail {
  id: string;
  recipientEmail: string;
  subject: string;
  scheduledAt: string;
  status: 'PENDING' | 'PROCESSING';
  idempotencyKey: string;
  sender: {
    name: string;
    email: string;
  };
}

interface ScheduledTableProps {
  emails: ScheduledEmail[];
  isLoading: boolean;
}

export default function ScheduledTable({ emails, isLoading }: ScheduledTableProps) {
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
            <Clock className="w-5 h-5 text-amber-400" />
            <span>Scheduled & Pending Emails</span>
          </h2>
          <p className="text-xs text-slate-400">Emails queued in BullMQ awaiting worker dispatch & rate windows.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search recipient, subject..."
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
              <th className="py-3.5 px-4 font-semibold">Sender Account</th>
              <th className="py-3.5 px-4 font-semibold">Scheduled Date & Time</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold">Idempotency Key</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <span>Loading queue telemetry...</span>
                  </div>
                </td>
              </tr>
            ) : filteredEmails.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <Mail className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-medium text-slate-400">No scheduled emails in queue</p>
                  <p className="text-[11px] text-slate-600 mt-1">Use the "Compose Schedule" button to queue new campaigns.</p>
                </td>
              </tr>
            ) : (
              filteredEmails.map((item) => {
                const scheduledDate = new Date(item.scheduledAt);
                const isPast = scheduledDate.getTime() <= Date.now();

                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {item.recipientEmail}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                      {item.subject}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-indigo-300">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{item.sender.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{item.sender.email}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-300">
                        {scheduledDate.toLocaleDateString()} {scheduledDate.toLocaleTimeString()}
                      </div>
                      <span
                        className={`text-[10px] ${
                          isPast ? 'text-cyan-400 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {isPast ? '⚡ Ready for Worker Pickup' : '⏳ Waiting for Schedule'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          item.status === 'PROCESSING'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 animate-pulse'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500 max-w-[120px] truncate" title={item.idempotencyKey}>
                      <span className="inline-flex items-center gap-1">
                        <Hash className="w-3 h-3 text-slate-600" />
                        {item.idempotencyKey.slice(0, 12)}...
                      </span>
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
