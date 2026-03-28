import React, { useState, useEffect } from 'react';
import { formatTime } from '../../utils/helpers';
import EmergencyModal from '../components/EmergencyModal';
import ProofModal from '../components/ProofModal';

export default function ActiveSessionPage({ session, onSessionEnd, onSettings }) {
  const [now, setNow] = useState(Date.now());
  const [showEmergency, setShowEmergency] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [grantedMsg, setGrantedMsg] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = now - session.startTime;
  const isOnBreak = session.breaks?.onBreak;
  const breakTimeLeft = isOnBreak && session.breaks?.breakEndTime
    ? Math.max(0, session.breaks.breakEndTime - now) : 0;
  const nextBreak = !isOnBreak && session.breaks?.enabled && session.breaks?.nextBreak
    ? Math.max(0, session.breaks.nextBreak - now) : null;

  const pagesVisited = (session.pageActivity || []).length;

  function handleGranted(url, duration) {
    setGrantedMsg(`✓ Access granted to ${url} for ${duration}m`);
    setShowEmergency(false);
    setTimeout(() => setGrantedMsg(''), 6000);
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0f] animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1f1f2e] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute w-8 h-8 rounded-full"
              style={{ background: isOnBreak ? 'rgba(16,185,129,0.12)' : 'rgba(124,58,237,0.12)', animation: 'pulseRing 2s ease-out infinite' }}
            />
            <div
              className="relative w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: isOnBreak ? '#059669' : '#7c3aed' }}
            >
              {isOnBreak ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest leading-none">
              {isOnBreak ? 'On Break' : 'Locked In'}
            </p>
            <p className="text-sm font-bold text-white leading-tight mt-0.5 max-w-[220px] truncate">
              {session.goal || 'Focus Session'}
            </p>
          </div>
        </div>
        <button
          onClick={onSettings}
          className="p-1.5 text-[#6b6a7b] hover:text-white hover:bg-[#1f1f2e] rounded-lg transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
          </svg>
        </button>
      </div>

      {/* Timer section */}
      <div
        className="px-4 py-6 shrink-0 flex flex-col items-center border-b border-[#1f1f2e]"
        style={{ background: isOnBreak ? 'linear-gradient(135deg,rgba(5,150,105,0.08),transparent)' : 'linear-gradient(135deg,rgba(124,58,237,0.08),transparent)' }}
      >
        <div
          className="text-5xl font-bold tabular-nums tracking-tighter mb-2"
          style={{ color: isOnBreak ? '#10b981' : '#c4b5fd' }}
        >
          {formatTime(elapsed)}
        </div>
        <p className="text-xs text-[#6b6a7b]">
          {isOnBreak
            ? `Break ends in ${formatTime(breakTimeLeft)}`
            : nextBreak !== null
            ? `Next break in ${formatTime(nextBreak)}`
            : 'No break scheduled'}
        </p>
      </div>

      {/* Granted access message */}
      {grantedMsg && (
        <div className="mx-4 mt-3 px-3 py-2 bg-emerald-900/30 border border-emerald-700/40 rounded-xl text-emerald-400 text-xs animate-fade-in">
          {grantedMsg}
        </div>
      )}

      {/* Evidence counter + emergency access */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Pages scanned badge */}
        <div className="flex items-center justify-between bg-[#13131a] rounded-xl px-4 py-3 border border-[#1f1f2e]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 6px #10b981' }} />
            <span className="text-sm text-white font-medium">Evidence Collecting</span>
          </div>
          <span className="text-sm text-emerald-400 font-semibold tabular-nums">
            {pagesVisited} page{pagesVisited !== 1 ? 's' : ''} scanned
          </span>
        </div>

        {/* Active emergency access */}
        {session.emergencyAccess?.some((ea) => ea.grantedUntil > now) && (
          <div>
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-widest mb-2">Temporary Access</p>
            {session.emergencyAccess
              .filter((ea) => ea.grantedUntil > now)
              .map((ea, i) => (
                <div key={i} className="flex items-center justify-between bg-amber-950/20 border border-amber-800/30 rounded-xl px-3.5 py-2.5 mb-1.5">
                  <p className="text-xs text-amber-400 truncate flex-1 mr-2">{ea.url}</p>
                  <p className="text-[11px] text-amber-600 shrink-0">
                    {formatTime(Math.max(0, ea.grantedUntil - now))} left
                  </p>
                </div>
              ))}
          </div>
        )}

        {/* Goal reminder */}
        <div className="bg-[#13131a] rounded-xl px-4 py-3 border border-[#1f1f2e]">
          <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-1.5">Your Goal</p>
          <p className="text-sm text-[#c4b5fd] leading-relaxed">{session.goal}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-4 border-t border-[#1f1f2e] shrink-0 space-y-2">
        <button
          onClick={() => setShowProof(true)}
          className="w-full py-3 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
          style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          I'm Done — Verify My Work
        </button>

        <button
          onClick={() => setShowEmergency(true)}
          className="w-full py-2.5 bg-amber-950/20 hover:bg-amber-900/25 border border-amber-800/40 text-amber-500 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
            <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Emergency Tab Request
        </button>
      </div>

      {showEmergency && (
        <EmergencyModal session={session} onClose={() => setShowEmergency(false)} onGranted={handleGranted} />
      )}
      {showProof && (
        <ProofModal session={session} onClose={() => setShowProof(false)} onApproved={onSessionEnd} />
      )}
    </div>
  );
}
