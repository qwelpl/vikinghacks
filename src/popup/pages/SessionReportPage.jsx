import React from 'react';
import { formatDuration, timeAgo } from '../../utils/helpers';
import { Lock, AlertTriangle, Check, X } from 'lucide-react';

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

export default function SessionReportPage({ session, onDone }) {
  const distractions = session.distractionAttempts || [];
  const bypasses = distractions.filter(d => d.type === 'bypass');
  const blocks = distractions.filter(d => d.type === 'block');

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-black to-gray-900 text-white animate-fade-in overflow-hidden">
      
      <div className="px-4 py-3.5 border-b border-red-500/30 shrink-0">
        <h2 className="text-sm font-semibold text-white text-center">Session Report</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        
        <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white">{session.goal}</p>
            <span
              className={`shrink-0 text-xs px-2 py-1 rounded-full font-semibold ${
                session.status === 'completed'
                  ? 'bg-red-900/40 text-red-400 border border-red-800/50'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {session.status === 'completed' ? '✓ Completed' : 'Ended'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Duration</span><span className="text-white font-medium">{formatDuration(session.endTime - session.startTime)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Ended</span><span className="text-white font-medium">{timeAgo(session.endTime)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Pages Visited</span><span className="text-white font-medium">{session.pageActivity?.length || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Distractions</span><span className="text-white font-medium">{distractions.length}</span></div>
          </div>
        </div>

        
        {distractions.length > 0 && (
          <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Distraction Log</p>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {distractions.map((d, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-red-900/30 flex items-center justify-center">
                    {d.type === 'bypass' ? <AlertTriangle size={16} className="text-red-400" /> : <X size={16} className="text-red-400" />}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium truncate">{getDomain(d.url)}</p>
                    <p className="text-xs text-gray-400">{timeAgo(d.time)}</p>
                    {d.reason && <p className="text-xs text-gray-500 mt-1 italic">"{d.reason}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      
      <div className="px-4 py-4 border-t border-red-500/30 shrink-0">
        <button
          onClick={onDone}
          className="w-full py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}
