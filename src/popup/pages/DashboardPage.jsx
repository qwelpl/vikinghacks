import React, { useState, useEffect } from 'react';
import { getSessionHistory } from '../../utils/storage';
import { formatDuration, timeAgo } from '../../utils/helpers';
import { ChevronLeft, AlertTriangle, X, Check } from 'lucide-react';

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

export default function DashboardPage({ user, onBack }) {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getSessionHistory().then((h) => {
      setSessions((h || []).filter((s) => s.userId === user.id));
    });
  }, [user.id]);

  const totalTime = sessions.reduce((acc, s) => acc + ((s.endTime || s.startTime) - s.startTime), 0);
  const completed = sessions.filter((s) => s.status === 'completed').length;
  const overridden = sessions.filter((s) => s.status === 'overridden').length;
  const totalDistractions = sessions.reduce((acc, s) => acc + (s.distractionAttempts?.filter(d => d.type === 'block').length || 0), 0);
  const totalBypasses = sessions.reduce((acc, s) => acc + (s.distractionAttempts?.filter(d => d.type === 'bypass').length || 0), 0);

  if (selected) {
    const distractions = selected.distractionAttempts || [];
    const bypasses = distractions.filter(d => d.type === 'bypass');
    const blocks = distractions.filter(d => d.type === 'block');

    return (
      <div className="flex-1 flex flex-col bg-gradient-to-br from-black to-gray-900 text-white animate-fade-in overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-red-500/30 shrink-0">
          <button onClick={() => setSelected(null)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm font-semibold text-white flex-1 truncate">{selected.goal}</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
            selected.status === 'completed' ? 'bg-red-900/40 text-red-400 border border-red-800/50'
            : selected.status === 'overridden' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50'
            : 'bg-gray-800 text-gray-400'
          }`}>
            {selected.status === 'completed' ? '✓ Done' : selected.status === 'overridden' ? 'Override' : 'Ended'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Duration', value: formatDuration((selected.endTime || Date.now()) - selected.startTime) },
              { label: 'Pages Visited', value: selected.pageActivity?.length || 0 },
              { label: 'Blocked', value: blocks.length },
              { label: 'AI Bypass Requests', value: bypasses.length },
            ].map((s) => (
              <div key={s.label} className="bg-black/30 rounded-xl p-3 border border-red-500/30">
                <div className="text-sm font-bold text-white">{s.value}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {(selected.tasks || []).length > 0 && (
            <div className="bg-black/30 rounded-xl p-3.5 border border-red-500/30">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Tasks</p>
              <ul className="space-y-1.5">
                {selected.tasks.map((t, i) => (
                  <li key={t.id || i} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 shrink-0 ${t.completed ? 'text-red-400' : 'text-gray-600'}`}>
                      {t.completed ? <Check size={13} /> : <span className="text-xs">{i + 1}.</span>}
                    </span>
                    <span className={t.completed ? 'text-gray-500 line-through' : 'text-white'}>{t.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {distractions.length > 0 && (
            <div className="bg-black/30 rounded-xl p-3.5 border border-red-500/30">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Distraction Log</p>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {distractions.map((d, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-red-900/30 flex items-center justify-center">
                      {d.type === 'bypass' ? <AlertTriangle size={13} className="text-yellow-400" /> : <X size={13} className="text-red-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-white font-medium truncate">{getDomain(d.url)}</p>
                      <p className="text-[11px] text-gray-500">{d.type === 'bypass' ? 'AI bypass request' : 'Blocked'} · {timeAgo(d.time)}</p>
                      {d.reason && <p className="text-[11px] text-gray-500 italic">"{d.reason}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-600 text-center">{timeAgo(selected.startTime)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-black to-gray-900 text-white animate-fade-in overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-red-500/30 shrink-0">
        <button onClick={onBack} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-sm font-semibold text-white">Dashboard</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-3xl mb-3">📊</p>
            <p className="text-sm text-gray-400">No sessions yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Total Sessions', value: sessions.length },
                { label: 'Completed', value: completed },
                { label: 'Overridden', value: overridden },
                { label: 'Focus Time', value: formatDuration(totalTime) },
                { label: 'Sites Blocked', value: totalDistractions },
                { label: 'AI Bypass Requests', value: totalBypasses },
              ].map((s) => (
                <div key={s.label} className="bg-black/30 rounded-xl p-3 border border-red-500/30">
                  <div className="text-sm font-bold text-white">{s.value}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">All Sessions</p>
              <div className="space-y-2">
                {sessions.map((s) => {
                  const distractions = s.distractionAttempts || [];
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="w-full bg-black/30 rounded-xl p-3.5 border border-red-500/30 text-left hover:border-red-500/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium text-white line-clamp-1 flex-1">{s.goal || 'Focus Session'}</p>
                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          s.status === 'completed' ? 'bg-red-900/40 text-red-400 border border-red-800/50'
                          : s.status === 'overridden' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50'
                          : 'bg-gray-800 text-gray-400'
                        }`}>
                          {s.status === 'completed' ? '✓' : s.status === 'overridden' ? 'Override' : 'Ended'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span>⏱ {formatDuration((s.endTime || Date.now()) - s.startTime)}</span>
                        <span>{timeAgo(s.startTime)}</span>
                        {distractions.length > 0 && <span>⚠ {distractions.length}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
