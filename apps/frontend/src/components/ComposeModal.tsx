'use client';

import { useState, useEffect } from 'react';
import { X, Upload, FileText, Send, Clock, Users, Zap, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import axios from 'axios';

interface Sender {
  id: string;
  name: string;
  email: string;
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  senders: Sender[];
}

export default function ComposeModal({ isOpen, onClose, onSuccess, senders }: ComposeModalProps) {
  const [recipientsInput, setRecipientsInput] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(0);

  const [multiSenderMode, setMultiSenderMode] = useState<'round-robin' | 'single-sender'>('round-robin');
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default schedule time to current time + 2 minutes formatted for datetime-local input
  useEffect(() => {
    const now = new Date(Date.now() + 2 * 60 * 1000);
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setScheduledAt(now.toISOString().slice(0, 16));

    if (senders.length > 0 && !selectedSenderId) {
      setSelectedSenderId(senders[0].id);
    }
  }, [senders]);

  // Update parsed email list when manual text changes
  const handleManualTextChange = (text: string) => {
    setRecipientsInput(text);
    if (!csvFileName) {
      const emails = text
        .split(/[\n,;]+/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0 && e.includes('@'));
      setParsedEmails(emails);
    }
  };

  // CSV & Plain TXT File Handler
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      // Extract all email addresses via regex matching (works for .txt, .csv, raw lists)
      const emailMatches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const uniqueEmails = Array.from(new Set(emailMatches.map((e) => e.trim().toLowerCase())));

      if (uniqueEmails.length > 0) {
        setParsedEmails(uniqueEmails);
        setRecipientsInput(uniqueEmails.join('\n'));
      } else {
        setErrorMsg('No valid email addresses found in file.');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedEmails.length === 0) {
      setErrorMsg('Please specify at least one recipient email address.');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Email subject is required.');
      return;
    }
    if (!body.trim()) {
      setErrorMsg('Email body content is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const scheduledIsoDate = new Date(scheduledAt).toISOString();

      await axios.post('http://localhost:5000/api/emails/schedule', {
        recipients: parsedEmails,
        subject,
        body,
        scheduledAt: scheduledIsoDate,
        multiSenderMode,
        senderId: multiSenderMode === 'single-sender' ? selectedSenderId : undefined,
        senderIds: senders.map((s) => s.id),
        delayBetweenEmailsMs: delaySeconds * 1000,
      });

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to schedule emails.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-modal rounded-2xl w-full max-w-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">Schedule Email Campaign</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Recipient Source: CSV Drag & Drop or Manual Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Recipients (CSV Upload or Manual List)</span>
              {parsedEmails.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {parsedEmails.length} Recipient(s) Loaded
                </span>
              )}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* CSV Upload Dropzone */}
              <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-900/40 transition-colors text-center">
                <Upload className="w-6 h-6 text-indigo-400 mb-2" />
                <span className="text-xs font-medium text-slate-200">
                  {csvFileName ? csvFileName : 'Click to Upload CSV'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">Parses email columns automatically</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                />
              </label>

              {/* Manual Input Textarea */}
              <div>
                <textarea
                  rows={3}
                  value={recipientsInput}
                  onChange={(e) => handleManualTextChange(e.target.value)}
                  placeholder="Or enter emails separated by commas or newlines..."
                  className="w-full glass-input rounded-xl p-3 text-xs resize-none h-full"
                />
              </div>
            </div>
          </div>

          {/* Multi-Sender Configuration */}
          <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Multi-Sender Strategy</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMultiSenderMode('round-robin')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  multiSenderMode === 'round-robin'
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800/80'
                }`}
              >
                <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold">Round-Robin (Recommended)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Distributes recipients evenly across {senders.length} active senders
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMultiSenderMode('single-sender')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  multiSenderMode === 'single-sender'
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800/80'
                }`}
              >
                <FileText className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold">Single Sender Account</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Sends all emails in batch using one specified identity
                  </div>
                </div>
              </button>
            </div>

            {multiSenderMode === 'single-sender' && senders.length > 0 && (
              <div className="mt-3">
                <label className="text-[11px] text-slate-400 mb-1 block font-medium">Select Sender Identity</label>
                <select
                  value={selectedSenderId}
                  onChange={(e) => setSelectedSenderId(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                >
                  {senders.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Schedule Timing & Staggered Delay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Start Date & Time</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Stagger Delay Between Sends (Seconds)
              </label>
              <input
                type="number"
                min={0}
                max={3600}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value || '0', 10))}
                placeholder="e.g. 10 (0 = parallel queue)"
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question regarding cold outreach scaling..."
              className="w-full glass-input rounded-xl px-3 py-2 text-xs"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Email Body (HTML / Plain Text)</label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="<p>Hi there,</p><p>We noticed your outreach performance could use automated rate limiting...</p>"
              className="w-full glass-input rounded-xl p-3 text-xs font-mono resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Scheduling Batch...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Enqueue Schedule ({parsedEmails.length})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
