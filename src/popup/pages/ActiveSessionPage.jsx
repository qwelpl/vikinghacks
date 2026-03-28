import React, { useState, useEffect } from 'react';
import { formatTime } from '../../utils/helpers';
import EmergencyModal from '../components/EmergencyModal';
import ProofModal from '../components/ProofModal';
import { Lock, Settings, Coffee, AlertTriangle, Check } from 'lucide-react';

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
    <div className="flex-1 flex flex-col bg-gradient-to-br from-black to-gray-900 text-white animate-fade-in overflow-hidden">
      
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-red-500/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute w-8 h-8 rounded-full"
              style={{ background: isOnBreak ? 'rgba(185, 28, 28, 0.12)' : 'rgba(185, 28, 28, 0.12)', animation: 'pulseRing 2s ease-out infinite' }}
            />
            <div
              className="relative w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: isOnBreak ? '#b91c1c' : '#b91c1c' }}
            >
              {isOnBreak ? <Coffee size={13} /> : <Lock size={13} />}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest leading-none">
              {isOnBreak ? 'On Break' : 'Locked In'}
            </p>
            <p className="text-sm font-bold text-white leading-tight mt-0.5 max-w-[220px] truncate">
              {session.goal || 'Focus Session'}
            </p>
          </div>
        </div>
        <button
          onClick={onSettings}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <Settings size={15} />
        </button>
      </div>

      
      <div
        className="px-4 py-6 shrink-0 flex flex-col items-center border-b border-red-500/30"
        style={{ background: 'linear-gradient(135deg,rgba(185, 28, 28, 0.08),transparent)' }}
      >
        <div
          className="text-5xl font-bold tabular-nums tracking-tighter mb-2"
          style={{ color: '#f87171' }}
        >
          {formatTime(elapsed)}
        </div>
        <p className="text-xs text-gray-400">
          {isOnBreak
            ? `Break ends in ${formatTime(breakTimeLeft)}`
            : nextBreak !== null
            ? `Next break in ${formatTime(nextBreak)}`
            : 'No break scheduled'}
        </p>
      </div>

      
      {grantedMsg && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-900/30 border border-red-700/40 rounded-xl text-red-400 text-xs animate-fade-in">
          {grantedMsg}
        </div>
      )}

      
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        
        <div className="flex items-center justify-between bg-black/30 rounded-xl px-4 py-3 border border-red-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px #b91c1c' }} />
            <span className="text-sm text-white font-medium">Evidence Collecting</span>
          </div>
          <span className="text-sm text-red-400 font-semibold tabular-nums">
            {pagesVisited} page{pagesVisited !== 1 ? 's' : ''} scanned
          </span>
        </div>

        
        {session.emergencyAccess?.some((ea) => ea.grantedUntil > now) && (
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2">Temporary Access</p>
            {session.emergencyAccess
              .filter((ea) => ea.grantedUntil > now)
              .map((ea, i) => (
                <div key={i} className="flex items-center justify-between bg-red-950/20 border border-red-800/30 rounded-xl px-3.5 py-2.5 mb-1.5">
                  <p className="text-xs text-red-400 truncate flex-1 mr-2">{ea.url}</p>
                  <p className="text-xs text-red-600 shrink-0">
                    {formatTime(Math.max(0, ea.grantedUntil - now))} left
                  </p>
                </div>
              ))}
          </div>
        )}

        
        <div className="bg-black/30 rounded-xl px-4 py-3 border border-red-500/30">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Your Goal</p>
          <p className="text-sm text-red-300 leading-relaxed">{session.goal}</p>
        </div>
      </div>

      
      <div className="px-4 py-4 border-t border-red-500/30 shrink-0 space-y-2">
        <button
          onClick={() => setShowProof(true)}
          className="w-full py-3 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
          style={{ background: 'linear-gradient(135deg,#991b1b,#7f1d1d)', boxShadow: '0 4px 16px rgba(185, 28, 28, 0.3)' }}
        >
          <Check size={15} />
          I'm Done — Verify My Work
        </button>

        <button
          onClick={() => setShowEmergency(true)}
          className="w-full py-2.5 bg-red-950/20 hover:bg-red-900/25 border border-red-800/40 text-red-500 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <AlertTriangle size={14} />
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
