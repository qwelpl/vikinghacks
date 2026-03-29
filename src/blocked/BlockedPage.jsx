import React, { useState, useEffect } from 'react';
import { judgeEmergencyRequest } from '../utils/aiApi';
import { formatTime } from '../utils/helpers';
import {
  Lock,
  AlertTriangle,
  Check,
  X,
  ChevronLeft
} from 'lucide-react';

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return { url: p.get('url') || '', tabId: p.get('tabId') };
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function BlockedPage() {
  const { url, tabId } = getParams();
  const domain = getDomain(url);
  const [session, setSession] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState('blocked');
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
          tabId: tabId,
        });
        setView('approved');
      } else {
        setView('denied');
      }
    } catch (e) {
      setError(e.message || 'Something went wrong');
      setView('form');
    }
  }

  const elapsed = session ? now - session.startTime : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 flex flex-col items-center justify-center relative overflow-hidden px-4">
      <div className="relative z-10 w-full" style={{ maxWidth: 480 }}>
        {view === 'blocked' && (
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center animate-glow animate-float"
                style={{ background: 'linear-gradient(135deg,#b91c1c,#7f1d1d)' }}
              >
                <Lock size={44} />
              </div>
            </div>

            <h1 className="text-5xl font-black text-white tracking-tight mb-3">Blocked.</h1>
            <p className="text-xl text-gray-400 mb-2">You're locked in right now.</p>

            <div className="inline-flex items-center gap-2 bg-red-900/30 border border-red-800/40 rounded-full px-4 py-2 mb-8">
              <div className="w-2 h-2 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px #ef4444' }} />
              <span className="text-red-400 font-mono text-sm">{domain}</span>
              <span className="text-red-600/60 text-xs">is blocked</span>
            </div>

            {session && (
              <div className="bg-black/30 rounded-2xl border border-red-500/30 p-4 mb-5 text-left">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Active Session</p>
                    <p className="text-sm font-semibold text-white">{session.goal || 'Focus Session'}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-gray-400 mb-0.5">Elapsed</p>
                    <p className="text-base font-bold text-red-400 tabular-nums">{formatTime(elapsed)}</p>
                  </div>
                </div>

                {session.goal && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Your Goal</p>
                    <p className="text-xs text-red-300 leading-relaxed">{session.goal}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={() => setView('form')}
                className="w-full py-3 bg-amber-900/20 hover:bg-amber-800/20 border border-amber-700/40 text-amber-400 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <AlertTriangle size={16} />
                Request Emergency Access
              </button>

              <button
                onClick={() => window.history.back()}
                className="w-full py-2.5 text-gray-400 hover:text-white text-sm transition-colors"
              >
                ← Go Back
              </button>
            </div>
          </div>
        )}

        {view === 'form' && (
          <div>
            <button
              onClick={() => setView('blocked')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition-colors"
            >
              <ChevronLeft size={14} />
              Back
            </button>

            <h2 className="text-2xl font-bold text-white mb-2">Emergency Access</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              An AI judge will evaluate your request. Be specific and honest.
              Vague excuses are automatically denied.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Website URL
                </label>
                <input
                  type="text"
                  value={requestUrl}
                  onChange={(e) => setRequestUrl(e.target.value)}
                  className="w-full px-4 py-3.5 bg-black/30 border border-red-500/30 rounded-xl text-white text-sm placeholder-gray-500 transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Why do you need this?
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Be specific!"
                  className="w-full px-4 py-3.5 bg-black/30 border border-red-500/30 rounded-xl text-white text-sm placeholder-gray-500 resize-none h-32 transition-colors"
                />
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-900/40 border border-red-800/50 rounded-xl">
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
              </button>
            </div>
          </div>
        )}

        {view === 'judging' && (
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-amber-900/30 border-2 border-amber-700/50 flex items-center justify-center">
              <div className="spinner w-8 h-8" style={{ borderTopColor: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Consulting the Judge...</h2>
              <p className="text-gray-400 mt-2">The AI is reviewing your request</p>
            </div>
          </div>
        )}

        {view === 'approved' && verdict && (
          <div className="flex flex-col items-center text-center gap-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(185, 28, 28, 0.15)', border: '2px solid rgba(185, 28, 28, 0.4)', boxShadow: '0 0 40px rgba(185, 28, 28, 0.2)' }}
            >
              <Check size={36} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-red-400">Access Granted</h2>
              <p className="text-white mt-2 text-lg">{verdict.duration} minutes of access</p>
              {verdict.reasoning && (
                <p className="text-gray-400 text-sm mt-3 max-w-sm leading-relaxed">{verdict.reasoning}</p>
              )}
              {verdict.warning && (
                <p className="text-amber-500/80 text-sm mt-2">{verdict.warning}</p>
              )}
              <p className="text-gray-600 text-sm mt-4">You may now close this tab.</p>
            </div>
          </div>
        )}

        {view === 'denied' && verdict && (
          <div className="flex flex-col items-center text-center gap-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)' }}
            >
              <X size={36} className="text-red-400" />
            </div>
            <div className="max-w-sm">
              <h2 className="text-3xl font-bold text-red-400">Request Denied</h2>
              {verdict.reasoning && (
                <p className="text-gray-400 text-sm mt-3 leading-relaxed">{verdict.reasoning}</p>
              )}
            </div>
            <div className="w-full max-w-sm space-y-3">
              <button
                onClick={() => {
                  setView('form');
                  setVerdict(null);
                }}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-medium transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => setView('blocked')}
                className="w-full py-3 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Back to Blocked Page
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-6 flex items-center gap-1.5 text-gray-600 text-xs">
        <Lock size={12} />
        Warden: Stay focused. Stay honest.
      </div>
    </div>
  );
}