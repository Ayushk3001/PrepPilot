// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Check, ShieldCheck, Zap, Sparkles, Building2, RefreshCw } from 'lucide-react';
import { SAMPLE_PRESETS } from '@/lib/resumeParser';

export interface CandidateAccount {
  name: string;
  email: string;
  role: string;
  company: string;
  presetId?: string;
}

const STORAGE_KEY = 'cadence_candidate_account';

export function getCandidateAccount(): CandidateAccount {
  if (typeof window === 'undefined') {
    return {
      name: '',
      email: '',
      role: '',
      company: '',
      presetId: ''
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    name: '',
    email: '',
    role: '',
    company: '',
    presetId: ''
  };
}

export function saveCandidateAccount(account: CandidateAccount) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  }
}

export default function CandidateProfileModal({
  isOpen,
  onClose,
  onAccountUpdated
}: {
  isOpen: boolean;
  onClose: () => void;
  onAccountUpdated?: (account: CandidateAccount) => void;
}) {
  const [account, setAccount] = useState<CandidateAccount>(getCandidateAccount());
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAccount(getCandidateAccount());
    }
  }, [isOpen]);

  const selectPreset = (presetId: string) => {
    const preset = SAMPLE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const updated: CandidateAccount = {
      name: preset.resume.candidateName,
      email: `${preset.resume.candidateName.toLowerCase().replace(' ', '.')}@enterprise.ai`,
      role: preset.resume.targetTitle,
      company: preset.jd.company,
      presetId
    };
    setAccount(updated);
    saveCandidateAccount(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
    onAccountUpdated?.(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCandidateAccount(account);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 1200);
    onAccountUpdated?.(account);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg border-2 border-line bg-paper shadow-[8px_8px_0_#111111]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-line bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink font-mono font-bold text-sm">
                  {account.name.charAt(0) || "P"}
                </span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-tight text-ink font-display">Candidate Account &amp; Profile</h3>
                  <p className="font-mono text-[10px] text-mut uppercase tracking-wider">[ IDENTITY &amp; CREDENTIALS ]</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="border-2 border-line p-1 bg-paper hover:bg-[#C7FF2F] text-ink cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Status Banner */}
              <div className="border-2 border-line bg-white p-4 space-y-2 shadow-[2px_2px_0_#111111]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#127533] font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#127533]" /> ENGINE STATUS: OPERATIONAL
                  </span>
                  <span className="chip !text-[10px] !bg-[#C7FF2F] !text-ink">
                    100% READY
                  </span>
                </div>
                <p className="text-xs text-ink2 leading-relaxed">
                  5-agent rubric scoring, STAR validation, resume-to-JD grounding, and acoustic telemetry running locally.
                </p>
              </div>

              {/* Persona Quick-Switch */}
              <div className="space-y-2">
                <p className="eyebrow">Switch Candidate Persona</p>
                <div className="grid grid-cols-3 gap-2">
                  {SAMPLE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPreset(p.id)}
                      className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                        account.presetId === p.id
                          ? 'border-line bg-[#C7FF2F] text-ink shadow-[2px_2px_0_#111111]'
                          : 'border-line bg-white hover:bg-paper'
                      }`}
                    >
                      <p className="text-[11px] font-bold text-ink truncate">{p.resume.candidateName}</p>
                      <p className="text-[9px] font-mono text-mut truncate mt-0.5">{p.resume.targetTitle.split(' ')[0]} Architect</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Form */}
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink font-mono">Candidate Full Name</label>
                  <input
                    type="text"
                    value={account.name}
                    onChange={(e) => setAccount({ ...account, name: e.target.value })}
                    className="input-warm text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink font-mono">Email Address</label>
                  <input
                    type="email"
                    value={account.email}
                    onChange={(e) => setAccount({ ...account, email: e.target.value })}
                    className="input-warm text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink font-mono">Primary Role</label>
                    <input
                      type="text"
                      value={account.role}
                      onChange={(e) => setAccount({ ...account, role: e.target.value })}
                      className="input-warm text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink font-mono">Target Company</label>
                    <input
                      type="text"
                      value={account.company}
                      onChange={(e) => setAccount({ ...account, company: e.target.value })}
                      className="input-warm text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t-2 border-line">
                  {savedNotice ? (
                    <span className="text-xs font-bold text-[#127533] flex items-center gap-1 font-mono">
                      <Check className="h-4 w-4 stroke-[3]" /> [ SAVED ]
                    </span>
                  ) : <span />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-ghost !text-xs cursor-pointer !py-2 !px-4"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-terra !text-xs cursor-pointer !py-2 !px-4"
                    >
                      Save Profile
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
