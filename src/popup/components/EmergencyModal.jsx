import React, {useState} from 'react';
import Modal from './Modal';
import {judgeEmergencyRequest} from '../../utils/aiApi';

export default function EmergencyModal({ session, onClose, onGranted }) {
  const [url, setUrl] = useState('');
  const [reason, setReason] = useState('');
  const [step, setStep] = useState('form'); 
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submit() {
    if (!url.trim() || !reason.trim()) return;
    setStep('judging');
    setError('');
    try {
      const verdict = await judgeEmergencyRequest(reason.trim(), session.goal, url.trim());
      setResult(verdict);
      setStep('result');

      if (verdict.approved) {
        await chrome.runtime.sendMessage({
          type: 'GRANT_EMERGENCY_ACCESS',
          url: url.trim(),
          duration: verdict.duration || 10,
        });
        onGranted(url.trim(), verdict.duration || 10);
      }
    } catch (e) {
      setError(e.message);
      setStep('form');
    }
  }

  return (
    <Modal title="🚨 Emergency Tab Request" onClose={onClose}>
      <div className="px-5 py-4">
        {step === 'form' && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs text-[#8b8a9b] leading-relaxed">
              Explain what you need and why. An AI judge will decide if your reason is legitimate.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-1.5">
                Website URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-xl text-white text-sm placeholder-[#3d3d4e] transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-1.5">
                Why do you need this?
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Be specific. Why is this site necessary for your current work?"
                className="w-full px-3 py-3 bg-[#0a0a0f] border border-[#1f1f2e] rounded-xl text-white text-sm placeholder-[#3d3d4e] resize-none h-24 transition-colors"
              />
            </div>
            {error && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 px-3 py-2 rounded-xl">
                {error}
              </p>
            )}
            <button
              onClick={submit}
              disabled={!url.trim() || !reason.trim()}
              className="w-full py-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/50 text-amber-400 font-semibold rounded-xl text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Submit to AI Judge
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {step === 'judging' && (
          <div className="flex flex-col items-center py-10 gap-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-amber-900/30 border border-amber-700/50 flex items-center justify-center">
              <div className="spinner w-5 h-5" style={{ borderTopColor: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Consulting AI Judge…</p>
              <p className="text-xs text-[#6b6a7b] mt-1">Evaluating your request</p>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="animate-fade-in">
            {result.approved ? (
              <div className="flex flex-col items-center py-6 text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-bold text-emerald-400">Access Granted</p>
                  <p className="text-sm text-white mt-1">{result.duration} minutes of access</p>
                  {result.reasoning && (
                    <p className="text-xs text-[#6b6a7b] mt-2 leading-relaxed">{result.reasoning}</p>
                  )}
                  {result.warning && (
                    <p className="text-xs text-amber-500/80 mt-2 leading-relaxed">{result.warning}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 rounded-xl text-sm font-medium"
                >
                  Got it, thanks
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-bold text-red-400">Request Denied</p>
                  {result.reasoning && (
                    <p className="text-xs text-[#8b8a9b] mt-2 leading-relaxed">{result.reasoning}</p>
                  )}
                </div>
                <div className="w-full space-y-2">
                  <button
                    onClick={() => setStep('form')}
                    className="w-full py-2.5 bg-[#1f1f2e] hover:bg-[#2d2d3e] text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 text-[#6b6a7b] hover:text-white text-sm transition-colors"
                  >
                    Back to Work
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
