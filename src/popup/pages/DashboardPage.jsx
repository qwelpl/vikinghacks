import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { getSessionHistory } from '../../utils/storage';
import { formatDuration } from '../../utils/helpers';

export default function DashboardPage({ user, onBack, onViewSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    overriddenSessions: 0,
    totalFocusTime: 0,
    totalDistractions: 0,
    totalBypasses: 0,
  });
  const [distractionData, setDistractionData] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      const history = await getSessionHistory();
      const userSessions = history.filter(s => s.userId === user.id);
      // Sort sessions by end time descending for trend
      userSessions.sort((a, b) => (b.endTime || b.startTime) - (a.endTime || a.startTime));
      setSessions(userSessions);

      const newStats = userSessions.reduce((acc, s) => {
        acc.totalSessions++;
        if (s.status === 'completed') acc.completedSessions++;
        if (s.status === 'overridden') acc.overriddenSessions++;
        acc.totalFocusTime += (s.endTime - s.startTime);
        acc.totalDistractions += (s.distractionAttempts?.filter(d => d.type === 'block').length || 0);
        acc.totalBypasses += (s.distractionAttempts?.filter(d => d.type === 'bypass').length || 0);
        return acc;
      }, {
        totalSessions: 0,
        completedSessions: 0,
        overriddenSessions: 0,
        totalFocusTime: 0,
        totalDistractions: 0,
        totalBypasses: 0,
      });
      setStats(newStats);

      // Prepare data for distraction graph (last 7 sessions)
      const dataForGraph = userSessions.slice(0, 7).map(s => ({
        id: s.id,
        distractions: (s.distractionAttempts?.filter(d => d.type === 'block').length || 0) + (s.distractionAttempts?.filter(d => d.type === 'bypass').length || 0),
        date: new Date(s.endTime || s.startTime).getDate(), // Get day of the month
      })).reverse(); // Reverse to show oldest first
      setDistractionData(dataForGraph);

      setLoading(false);
    }
    fetchHistory();
  }, [user.id]);

  const maxDistractions = Math.max(...distractionData.map(d => d.distractions), 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-black to-gray-900 text-white">
        <div className="spinner w-5 h-5" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-black to-gray-900 text-white animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-red-500/30 shrink-0">
        <button onClick={onBack} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-sm font-semibold text-white">Dashboard</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Summary Stats */}
        <div className="bg-black/30 rounded-xl p-4 border border-red-500/30 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Total Sessions</p>
            <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Completed</p>
            <p className="text-2xl font-bold text-red-400">{stats.completedSessions}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Overridden</p>
            <p className="text-2xl font-bold text-red-400">{stats.overriddenSessions}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Focus Time</p>
            <p className="text-2xl font-bold text-white">{formatDuration(stats.totalFocusTime)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Distractions</p>
            <p className="text-2xl font-bold text-red-400">{stats.totalDistractions}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Bypasses</p>
            <p className="text-2xl font-bold text-red-400">{stats.totalBypasses}</p>
          </div>
        </div>

        {/* Distraction Trend Graph */}
        {distractionData.length > 0 && (
          <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Distraction Trend (Last 7 Sessions)</p>
            <div className="flex items-end h-24 gap-1 relative">
              {/* Max distractions indicator */}
              {maxDistractions > 0 && (
                <div className="absolute top-0 left-0 right-0 h-px bg-red-800/50" style={{ bottom: `${(maxDistractions / (maxDistractions || 1)) * 100}%` }}>
                  <span className="absolute -left-3 -top-2 text-[10px] text-gray-500">{maxDistractions}</span>
                </div>
              )}
              {distractionData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                  <div
                    className="w-3/4 bg-red-600 rounded-t-sm transition-all duration-300 hover:bg-red-500"
                    style={{ height: `${(data.distractions / (maxDistractions || 1)) * 100}%` }}
                  />
                  <span className="text-[10px] text-gray-500 mt-1">{data.date}</span>
                  <div className="absolute bottom-full mb-1 p-1 bg-black/70 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {data.distractions}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-2">
              <span>Fewer Distractions →</span>
              <span>← More Distractions</span>
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent Sessions</p>
            <div className="space-y-2">
              {sessions.slice(0, 5).map(s => (
                <button
                  key={s.id}
                  onClick={() => onViewSession(s)}
                  className="w-full flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <p className="text-white truncate flex-1 text-left">{s.goal || 'Focus Session'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    s.status === 'completed' ? 'bg-red-900/40 text-red-400' : 'bg-red-900/40 text-red-400'
                  }`}>
                    {s.status === 'completed' ? 'Completed' : 'Ended'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p>No sessions recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
