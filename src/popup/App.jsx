import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/storage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import StartSessionPage from './pages/StartSessionPage';
import ActiveSessionPage from './pages/ActiveSessionPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    async function init() {
      const u = await getCurrentUser();
      setUser(u || null);
      const res = await chrome.runtime.sendMessage({ type: 'GET_SESSION' });
      if (res?.session) { setSession(res.session); setPage('active'); }
      setLoading(false);
    }
    init();
  }, []);

  // Poll for session changes every 2 s
  useEffect(() => {
    const id = setInterval(async () => {
      const res = await chrome.runtime.sendMessage({ type: 'GET_SESSION' });
      if (res?.session) {
        setSession(res.session);
        if (page !== 'active') setPage('active');
      } else if (!res?.session && page === 'active') {
        setSession(null);
        setPage('home');
      }
    }, 2000);
    return () => clearInterval(id);
  }, [page]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <LockSVG size={20} />
          </div>
          <div className="spinner w-5 h-5" />
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage onAuth={setUser} />;

  if (page === 'settings') {
    return (
      <SettingsPage
        user={user}
        onBack={() => setPage(session ? 'active' : 'home')}
        onLogout={() => { setUser(null); setPage('home'); }}
      />
    );
  }

  if (page === 'active' && session) {
    return (
      <ActiveSessionPage
        session={session}
        user={user}
        onSessionUpdate={setSession}
        onSessionEnd={() => { setSession(null); setPage('home'); }}
        onSettings={() => setPage('settings')}
      />
    );
  }

  if (page === 'start') {
    return (
      <StartSessionPage
        user={user}
        onBack={() => setPage('home')}
        onSessionStart={(s) => { setSession(s); setPage('active'); }}
      />
    );
  }

  return (
    <HomePage
      user={user}
      onStart={() => setPage('start')}
      onSettings={() => setPage('settings')}
    />
  );
}

function LockSVG({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
