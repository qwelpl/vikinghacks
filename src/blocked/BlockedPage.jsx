import React, { useState, useEffect } from 'react';
import { judgeEmergencyRequest } from '../utils/aiApi';
import { formatTime } from '../utils/helpers';

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return { url: p.get('url') || '', tabId: p.get('tabId') };
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

// Floating background particles
function Particles() {
  const particles = [
    { size: 200, x: 10, y: 20, delay: 0 },
    { size: 120, x: 80, y: 60, delay: 1.5 },
    { size: 80,  x: 50, y: 80, delay: 0.7 },
    { size: 160, x: 20, y: 70, delay: 2 },
    { size: 100, x: 70, y: 10, delay: 1 },
  ];
  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: 'translate(-50%,-50%)',
            background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}

export default function BlockedPage() {
  const { url, tabId } = getParams();
  const domain = getDomain(url);
  const [session, setSession] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState('blocked'); // blocked | form | judging | approved | denied
  const [requestUrl, setRequestUrl] = useState(url);
  const [reason, setReason] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
      if (res?.session) setSession(res.session);
    });
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function submitRequest() {
    if (!requestUrl.trim() || !reason.trim() || !session) return;
    setView('judging');
    setError('');
    try {
      const v = await judgeEmergencyRequest(reason.trim(), session.goal || '', requestUrl.trim());
      setVerdict(v);
      if (v.approved) {
        await chrome.runtime.sendMessage({
          type: 'GRANT_EMERGENCY_ACCESS',
          url: requestUrl.trim(),
          duration: v.duration || 10,
        });
        setView('approved');
        // Redirect after 2 s
        setTimeout(() => { window.location.href = url; }, 2000);
      } else {
        setView('denied');
      }
    } catch (e) {
      setError(e.message);
      setView('form');
    }
  }

  const elapsed = session ? now - session.startTime : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center relative overflow-hidden px-4">
      <Particles />

      {/* Content card */}
      <div className="relative z-10 w-full max-w-lg">
        {/* ── Blocked state ── */}
        {view === 'blocked' && (
          <div className="text-center animate-fade-in">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center animate-glow animate-float"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4c1d95)' }}
              >
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            <h1 className="text-5xl font-black text-white tracking-tight mb-3">Blocked.</h1>
            <p className="text-xl text-[#6b6a7b] mb-2">You're locked in right now.</p>

            {/* Blocked domain badge */}
            <div className="inline-flex items-center gap-2 bg-red-950/30 border border-red-800/40 rounded-full px-4 py-2 mb-8">
              <div className="w-2 h-2 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px #ef4444' }} />
              <span className="text-red-400 font-mono text-sm">{domain}</span>
              <span className="text-red-600/60 text-xs">is blocked</span>
            </div>

            {/* Session info */}
            {session && (
              <div className="bg-[#13131a] rounded-2xl border border-[#1f1f2e] p-6 mb-6 text-left">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-1">Active Session</p>
                    <p className="text-base font-semibold text-white">{session.goal || 'Focus Session'}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-[11px] text-[#6b6a7b] mb-0.5">Elapsed</p>
                    <p className="text-lg font-bold text-violet-400 tabular-nums">{formatTime(elapsed)}</p>
                  </div>
                </div>

                {session.goal && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-2">Your Goal</p>
                    <p className="text-sm text-[#c4b5fd] leading-relaxed">{session.goal}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => setView('form')}
                className="w-full py-4 bg-amber-950/20 hover:bg-amber-900/25 border border-amber-700/40 text-amber-400 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-2 text-base"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Request Emergency Access
              </button>

              <button
                onClick={() => window.history.back()}
                className="w-full py-3 text-[#6b6a7b] hover:text-white text-sm transition-colors"
              >
                ← Go Back
              </button>
            </div>
          </div>
        )}

        {/* ── Request form ── */}
        {view === 'form' && (
          <div className="animate-fade-in">
            <button
              onClick={() => setView('blocked')}
              className="flex items-center gap-2 text-[#6b6a7b] hover:text-white mb-6 text-sm transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>

            <h2 className="text-2xl font-bold text-white mb-2">Emergency Access</h2>
            <p className="text-[#6b6a7b] text-sm mb-6 leading-relaxed">
              An AI judge will evaluate your request. Be specific and honest.
              Vague excuses are automatically denied.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6b6a7b] uppercase tracking-widest mb-2">
                  Website URL
                </label>
                <input
                  type="text"
                  value={requestUrl}
                  onChange={(e) => setRequestUrl(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#13131a] border border-[#1f1f2e] rounded-xl text-white text-sm placeholder-[#3d3d4e] transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6b6a7b] uppercase tracking-widest mb-2">
                  Why do you need this?
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Be specific — what do you need on this site, and how does it relate to your current task?"
                  className="w-full px-4 py-3.5 bg-[#13131a] border border-[#1f1f2e] rounded-xl text-white text-sm placeholder-[#3d3d4e] resize-none h-32 transition-colors"
                />
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-950/40 border border-red-800/50 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={submitRequest}
                disabled={!requestUrl.trim() || !reason.trim()}
                className="w-full py-4 text-white font-bold rounded-2xl text-base disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#d97706,#92400e)', boxShadow: '0 4px 20px rgba(217,119,6,0.3)' }}
              >
                Submit to AI Judge
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Judging ── */}
        {view === 'judging' && (
          <div className="flex flex-col items-center text-center gap-6 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-amber-900/30 border-2 border-amber-700/50 flex items-center justify-center">
              <div className="spinner w-8 h-8" style={{ borderTopColor: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Consulting the Judge…</h2>
              <p className="text-[#6b6a7b] mt-2">The AI is reviewing your request</p>
            </div>
          </div>
        )}

        {/* ── Approved ── */}
        {view === 'approved' && verdict && (
          <div className="flex flex-col items-center text-center gap-6 animate-fade-in">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', boxShadow: '0 0 40px rgba(16,185,129,0.2)' }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-emerald-400">Access Granted</h2>
              <p className="text-white mt-2 text-lg">{verdict.duration} minutes of access</p>
              {verdict.reasoning && (
                <p className="text-[#8b8a9b] text-sm mt-3 max-w-sm leading-relaxed">{verdict.reasoning}</p>
              )}
              {verdict.warning && (
                <p className="text-amber-500/80 text-sm mt-2">⚠ {verdict.warning}</p>
              )}
              <p className="text-[#4a4a5a] text-sm mt-4">Redirecting to your page…</p>
            </div>
          </div>
        )}

        {/* ── Denied ── */}
        {view === 'denied' && verdict && (
          <div className="flex flex-col items-center text-center gap-6 animate-fade-in">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)' }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div className="max-w-sm">
              <h2 className="text-3xl font-bold text-red-400">Request Denied</h2>
              {verdict.reasoning && (
                <p className="text-[#8b8a9b] text-sm mt-3 leading-relaxed">{verdict.reasoning}</p>
              )}
            </div>
            <div className="w-full max-w-sm space-y-3">
              <button
                onClick={() => { setView('form'); setVerdict(null); }}
                className="w-full py-3 bg-[#1f1f2e] hover:bg-[#2d2d3e] text-white rounded-2xl font-medium transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => setView('blocked')}
                className="w-full py-3 text-[#6b6a7b] hover:text-white text-sm transition-colors"
              >
                Back to Blocked Page
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom branding */}
      <div className="fixed bottom-6 flex items-center gap-1.5 text-[#3d3d4e] text-xs">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Warden — Stay focused. Stay honest.
      </div>
    </div>
  );
}
