import React, { useState } from 'react';
import Modal from './Modal';
import { judgeProofOfCompletion } from '../../utils/aiApi';
import { getDomain } from '../../utils/helpers';

function EvidenceItem({ page }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-[#13131a] rounded-xl border border-[#1f1f2e] overflow-hidden">
      <button
        onClick={() => page.content && setExpanded(!expanded)}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-[#1a1a26] transition-colors"
      >
        <span className="text-emerald-500 text-xs mt-0.5 shrink-0">✓</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{page.title || getDomain(page.url)}</p>
          <p className="text-[11px] text-[#6b6a7b] truncate mt-0.5">{getDomain(page.url)}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[11px] text-[#6b6a7b]">{page.visits}×</span>
          {page.content && (
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="#6b6a7b" strokeWidth="2.5"
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
        </div>
      </button>
      {expanded && page.content && (
        <div className="px-3 pb-3 border-t border-[#1f1f2e]">
          <p className="text-[11px] text-[#8b8a9b] leading-relaxed mt-2 line-clamp-4">
            {page.content.slice(0, 400)}…
          </p>
        </div>
      )}
    </div>
  );
}

export default function ProofModal({ session, onClose, onApproved }) {
  const [proof, setProof] = useState('');
  const [step, setStep] = useState('form'); // form | judging | approved | rejected
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState('');

  const pageActivity = session.pageActivity || [];
  const hasEvidence = pageActivity.length > 0;

  async function submit() {
    setStep('judging');
    setError('');
    try {
      const v = await judgeProofOfCompletion(session.goal, proof.trim(), pageActivity);
      setVerdict(v);
      setStep(v.approved ? 'approved' : 'rejected');
      if (v.approved) {
        await chrome.runtime.sendMessage({ type: 'END_SESSION', status: 'completed' });
        onApproved();
      }
    } catch (e) {
      setError(e.message);
      setStep('form');
    }
  }

  return (
    <Modal title="✅ Submit Proof of Completion" onClose={onClose} wide>
      <div className="px-5 py-4">

        
        {step === 'form' && (
          <div className="space-y-4 animate-fade-in">

            
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">
                  📊 Browsing Evidence
                </p>
                <span className="text-[11px] text-[#6b6a7b]">
                  {hasEvidence ? `${pageActivity.length} page(s) captured` : 'None captured'}
                </span>
              </div>

              {hasEvidence ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {pageActivity.map((p, i) => <EvidenceItem key={i} page={p} />)}
                </div>
              ) : (
                <div className="px-3 py-3 bg-amber-950/20 border border-amber-800/30 rounded-xl">
                  <p className="text-amber-500/80 text-xs leading-relaxed">
                    No page visits were recorded. Make sure you actually visited the sites you needed.
                    Without browsing evidence, your written explanation must be very specific.
                  </p>
                </div>
              )}
            </div>

            
            <div className="bg-[#0a0a0f] rounded-xl p-3 border border-[#1f1f2e]">
              <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-2">Your Tasks</p>
              <ul className="space-y-1.5">
                {(session.tasks || []).map((t, i) => (
                  <li key={t.id} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 shrink-0 ${t.completed ? 'text-emerald-500' : 'text-[#3d3d4e]'}`}>
                      {t.completed ? '✓' : `${i + 1}.`}
                    </span>
                    <span className={t.completed ? 'text-[#6b6a7b] line-through' : 'text-white'}>
                      {t.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            
            <div>
              <label className="block text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-1.5">
                Your Explanation {hasEvidence ? '(optional but helps)' : '(required — be specific)'}
              </label>
              <textarea
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder={
                  hasEvidence
                    ? 'Describe what you accomplished. The AI can already see your browsing history above.'
                    : 'No browsing data was recorded — describe specifically what you did, what you produced, scores achieved, etc.'
                }
                className="w-full px-3 py-3 bg-[#0a0a0f] border border-[#1f1f2e] rounded-xl text-white text-sm placeholder-[#3d3d4e] resize-none h-24 transition-colors"
                autoFocus={!hasEvidence}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 px-3 py-2 rounded-xl">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={!hasEvidence && proof.trim().length < 10}
              className="w-full py-3 text-white font-bold rounded-xl text-sm disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Submit to AI Evaluator
            </button>
          </div>
        )}

        
        {step === 'judging' && (
          <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: '320px' }}>
            <div className="w-14 h-14 rounded-full bg-violet-900/30 border border-violet-700/50 flex items-center justify-center">
              <div className="spinner w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Evaluating your work…</p>
              <p className="text-xs text-[#6b6a7b] mt-1">
                Scanning {pageActivity.length} page(s) against your tasks
              </p>
            </div>
          </div>
        )}

        
        {step === 'approved' && verdict && (
          <div className="flex flex-col items-center py-8 text-center gap-5 animate-fade-in">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', boxShadow: '0 0 30px rgba(16,185,129,0.2)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-white">You're Free!</p>
              <p className="text-sm text-emerald-400 mt-1">Lockdown ended · verified ✓</p>
              {verdict.feedback && (
                <p className="text-xs text-[#8b8a9b] mt-3 leading-relaxed max-w-[280px] mx-auto">
                  {verdict.feedback}
                </p>
              )}
            </div>
            <div className="text-3xl">🎉</div>
          </div>
        )}

        
        {step === 'rejected' && verdict && (
          <div className="flex flex-col items-center py-6 text-center gap-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-red-400">Proof Insufficient</p>
              {verdict.feedback && (
                <p className="text-xs text-[#8b8a9b] mt-2 leading-relaxed max-w-[300px]">
                  {verdict.feedback}
                </p>
              )}
              {verdict.missing && (
                <div className="mt-3 px-3 py-2.5 bg-[#1f1f2e] rounded-xl text-left">
                  <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-1">What's missing</p>
                  <p className="text-xs text-white leading-relaxed">{verdict.missing}</p>
                </div>
              )}
            </div>
            <div className="w-full space-y-2">
              <button
                onClick={() => { setStep('form'); setVerdict(null); }}
                className="w-full py-2.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-700/60 text-violet-400 rounded-xl text-sm font-medium transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-[#6b6a7b] hover:text-white text-sm transition-colors"
              >
                Keep Working
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
