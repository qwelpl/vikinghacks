import React, { useState, useEffect } from 'react';
import { getSessionHistory } from '../../utils/storage';
import { formatDuration, timeAgo } from '../../utils/helpers';

export default function HomePage({ user, onStart, onSettings }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, totalTime: 0 });

  useEffect(() => {
    getSessionHistory().then((h) => {
      const all = (h || []).filter((s) => s.userId === user.id);
      setHistory(all.slice(0, 5));
      const completed = all.filter((s) => s.status === 'completed').length;
      const totalTime = all.reduce((acc, s) => acc + ((s.endTime || s.startTime) - s.startTime), 0);
      setStats({ total: all.length, completed, totalTime });
    });
  }, [user.id]);

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0f] animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f2e] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="font-bold text-white text-[15px]">Warden</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6b6a7b]">@{user.username}</span>
          <button
            onClick={onSettings}
            className="p-1.5 text-[#6b6a7b] hover:text-white hover:bg-[#1f1f2e] rounded-lg transition-colors"
            title="Settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* CTA */}
        <div className="px-4 pt-4 pb-3">
          <button
            onClick={onStart}
            className="w-full text-left rounded-2xl p-5 transition-all duration-200 group"
            style={{
              background: 'linear-gradient(135deg, #5b21b6 0%, #4c1d95 50%, #3b0764 100%)',
              boxShadow: '0 8px 32px rgba(124,58,237,0.25)',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
            </div>
            <h2 className="text-[17px] font-bold text-white mb-1">Start a Session</h2>
            <p className="text-sm text-violet-200/60">Declare your goal, lock in, get it done.</p>
          </button>
        </div>

        {/* Stats */}
        {stats.total > 0 && (
          <div className="px-4 pb-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sessions', value: stats.total, emoji: '📋' },
                { label: 'Completed', value: stats.completed, emoji: '✅' },
                { label: 'Focus Time', value: formatDuration(stats.totalTime), emoji: '⏱' },
              ].map((s) => (
                <div key={s.label} className="bg-[#13131a] rounded-xl p-3 border border-[#1f1f2e]">
                  <div className="text-base mb-1">{s.emoji}</div>
                  <div className="text-sm font-bold text-white">{s.value}</div>
                  <div className="text-[11px] text-[#6b6a7b] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent sessions */}
        {history.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-2">Recent</p>
            <div className="space-y-2">
              {history.map((s) => (
                <div key={s.id} className="bg-[#13131a] rounded-xl p-3.5 border border-[#1f1f2e]">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-white line-clamp-1 flex-1">
                      {s.goal || s.tasks?.[0]?.description || 'Focus Session'}
                    </p>
                    <span
                      className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        s.status === 'completed'
                          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
                          : s.status === 'overridden'
                          ? 'bg-amber-900/30 text-amber-500 border border-amber-800/40'
                          : 'bg-[#1f1f2e] text-[#6b6a7b]'
                      }`}
                    >
                      {s.status === 'completed' ? '✓ Done' : s.status === 'overridden' ? 'Override' : 'Ended'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#6b6a7b]">
                    <span>⏱ {formatDuration((s.endTime || Date.now()) - s.startTime)}</span>
                    <span>{timeAgo(s.startTime)}</span>
                    {(s.pageActivity?.length > 0) && (
                      <span>📄 {s.pageActivity.length} pages scanned</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center px-4">
            <p className="text-3xl mb-3">🔒</p>
            <p className="text-sm text-[#6b6a7b]">No sessions yet.</p>
            <p className="text-xs text-[#3d3d4e] mt-1">Start your first session above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
