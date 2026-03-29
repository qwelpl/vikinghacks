import React, { useState, useEffect } from 'react';
import { getSessionHistory } from '../../utils/storage';
import { formatDuration, timeAgo } from '../../utils/helpers';
import { Lock, Settings, Plus, BarChart2 } from 'lucide-react';

function computeStreak(sessions) {
  const MS_PER_DAY = 86400000;
  const completed = sessions.filter((s) => s.status === 'completed');
  if (!completed.length) return 0;
  const daySet = new Set(completed.map((s) => Math.floor((s.endTime || s.startTime) / MS_PER_DAY)));
  const days = Array.from(daySet).sort((a, b) => b - a);
  const todayDay = Math.floor(Date.now() / MS_PER_DAY);
  if (days[0] < todayDay - 1) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i - 1] - days[i] === 1) streak++;
    else break;
  }
  return streak;
}

export default function HomePage({ user, onStart, onSettings, onDashboard }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, totalTime: 0, streak: 0 });

  useEffect(() => {
    getSessionHistory().then((h) => {
      const all = (h || []).filter((s) => s.userId === user.id);
      setHistory(all.slice(0, 5));
      const completed = all.filter((s) => s.status === 'completed').length;
      const totalTime = all.reduce((acc, s) => acc + ((s.endTime || s.startTime) - s.startTime), 0);
      const streak = computeStreak(all);
      setStats({ total: all.length, completed, totalTime, streak });
    });
  }, [user.id]);

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-black to-gray-900 text-white animate-fade-in overflow-hidden">
      
      <div className="flex items-center justify-between px-5 py-4 border-b border-red-500/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-900/50">
            <Lock size={13} />
          </div>
          <span className="font-bold text-white text-[15px]">Warden</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">@{user.username}</span>
          <button
            onClick={onDashboard}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Dashboard"
          >
            <BarChart2 size={15} />
          </button>
          <button
            onClick={onSettings}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      
      <div className="flex-1 overflow-y-auto">
        
        <div className="px-4 pt-4 pb-3">
          <button
            onClick={onStart}
            className="w-full text-left rounded-2xl p-5 transition-all duration-200 group"
            style={{
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)',
              boxShadow: '0 8px 32px rgba(185, 28, 28, 0.25)',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Lock size={18} />
              </div>
              <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors flex items-center justify-center">
                <Plus size={14} />
              </div>
            </div>
            <h2 className="text-[17px] font-bold text-white mb-1">Start a Session</h2>
            <p className="text-sm text-red-200/60">Declare your goal, lock in, get it done.</p>
          </button>
        </div>


        {stats.streak > 0 && (
          <div className="px-4 pb-3">
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(239,68,68,0.1))', border: '1px solid rgba(251,146,60,0.3)' }}
            >
              <span className="text-2xl">🔥</span>
              <div>
                <p className="text-sm font-bold text-white">
                  {stats.streak} day{stats.streak !== 1 ? 's' : ''} in a row
                </p>
                <p className="text-[11px] text-orange-400/70">
                  {stats.streak >= 7 ? 'Unstoppable!' : stats.streak >= 3 ? 'Keep it going!' : 'Streak started!'}
                </p>
              </div>
            </div>
          </div>
        )}

        {stats.total > 0 && (
          <div className="px-4 pb-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sessions', value: stats.total},
                { label: 'Completed', value: stats.completed},
                { label: 'Focus Time', value: formatDuration(stats.totalTime)},
              ].map((s) => (
                <div key={s.label} className="bg-black/30 rounded-xl p-3 border border-red-500/30">
                  <div className="text-sm font-bold text-white">{s.value}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        
        {history.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Recent</p>
            <div className="space-y-2">
              {history.map((s) => (
                <div key={s.id} className="bg-black/30 rounded-xl p-3.5 border border-red-500/30">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-white line-clamp-1 flex-1">
                      {s.goal || s.tasks?.[0]?.description || 'Focus Session'}
                    </p>
                    <span
                      className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        s.status === 'completed'
                          ? 'bg-red-900/40 text-red-400 border border-red-800/50'
                          : s.status === 'overridden'
                          ? 'bg-red-900/30 text-red-500 border border-red-800/40'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {s.status === 'completed' ? '✓ Done' : s.status === 'overridden' ? 'Override' : 'Ended'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span>⏱ {formatDuration((s.endTime || Date.now()) - s.startTime)}</span>
                    <span>{timeAgo(s.startTime)}</span>
                    {(s.pageActivity?.length > 0) && (
                      <span>{s.pageActivity.length} pages scanned</span>
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
            <p className="text-sm text-gray-400">No sessions yet.</p>
            <p className="text-xs text-gray-600 mt-1">Start your first session above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
