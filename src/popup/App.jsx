import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/storage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import StartSessionPage from './pages/StartSessionPage';
import ActiveSessionPage from './pages/ActiveSessionPage';
import SettingsPage from './pages/SettingsPage';
import SessionReportPage from './pages/SessionReportPage';
import { Lock } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [session, setSession] = useState(null);
  const [lastSession, setLastSession] = useState(null);
  const [loading, setLoading] = useState(true);

  
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

  
  useEffect(() => {
    const id = setInterval(async () => {
      const res = await chrome.runtime.sendMessage({ type: 'GET_SESSION' });
      if (res?.session) {
        setSession(res.session);
        if (page === 'home' || page === 'start') setPage('active');
      } else if (!res?.session && page === 'active') {
        
        setLastSession(session);
        setSession(null);
        setPage('report');
      }
    }, 2000);
    return () => clearInterval(id);
  }, [page, session]);

  function handleSessionEnd() {
    setLastSession(session);
    setSession(null);
    setPage('report');
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-black to-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/50">
            <Lock size={20} />
          </div>
          <div className="spinner w-5 h-5" />
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage onAuth={setUser} />;

  if (page === 'report' && lastSession) {
    return (
      <SessionReportPage
        session={lastSession}
        onDone={() => { setLastSession(null); setPage('home'); }}
      />
    );
  }

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
        onSessionEnd={handleSessionEnd}
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
