import React, {useEffect, useRef, useState} from 'react';
import {getCurrentUser} from '../utils/storage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import StartSessionPage from './pages/StartSessionPage';
import ActiveSessionPage from './pages/ActiveSessionPage';
import SettingsPage from './pages/SettingsPage';
import SessionReportPage from './pages/SessionReportPage'; // Import SessionReportPage
import { Lock } from 'lucide-react'; // Import Lock icon

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [session, setSession] = useState(null);
  const [lastSession, setLastSession] = useState(null); // State to hold last session for report
  const [loading, setLoading] = useState(true);
  const pageRef = useRef('home');

  function navigateTo(p) {
    pageRef.current = p;
    setPage(p);
  }

  
  useEffect(() => {
    async function init() {
      const u = await getCurrentUser();
      setUser(u || null);
      const res = await chrome.runtime.sendMessage({ type: 'GET_SESSION' });
      if (res?.session) {
        setSession(res.session);
        navigateTo('active');
      }
      setLoading(false);
    }
    init();
  }, []);

  // Poll for session changes every 2 s
  useEffect(() => {
    const id = setInterval(async () => {
      const res = await chrome.runtime.sendMessage({ type: 'GET_SESSION' });
      
      // If background reports no session, but our state still has one, it means it ended externally
      if (!res?.session && session) {
        const lastSessionRes = await chrome.runtime.sendMessage({ type: 'GET_LAST_SESSION' });
        if (lastSessionRes?.lastSession) {
          setLastSession(lastSessionRes.lastSession);
          setSession(null);
          setPage('report');
        }
      } else if (res?.session && !session && page !== 'active') { // If background reports a session, but our state doesn't, and we're not already on active
        setSession(res.session);
        setPage('active');
      } else if (res?.session && session && res.session.id !== session.id) {
        // If session changed (e.g., new session started while on settings)
        setSession(res.session);
        setPage('active');
      }
    }, 500);
    return () => clearInterval(id);
  }, [session, page]); // Depend on session and page to re-evaluate logic

  async function handleSessionEnd() {
    // This is called when session ends via "I'm Done" or admin override from ActiveSessionPage
    const lastSessionRes = await chrome.runtime.sendMessage({ type: 'GET_LAST_SESSION' });
    if (lastSessionRes?.lastSession) {
      setLastSession(lastSessionRes.lastSession);
      setSession(null);
      setPage('report');
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/50">
            <Lock size={20} /> {/* Use Lock icon from lucide-react */}
          </div>
          <div className="spinner w-5 h-5" />
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage onAuth={setUser} />;

  // Render SessionReportPage if a session just ended
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
        onBack={() => navigateTo(session ? 'active' : 'home')}
        onLogout={() => { setUser(null); navigateTo('home'); }}
        onSessionEnd={() => { setSession(null); navigateTo('home'); }}
      />
    );
  }

  if (page === 'active' && session) {
    return (
      <ActiveSessionPage
        session={session}
        user={user}
        onSessionUpdate={setSession}
        onSessionEnd={handleSessionEnd} // Pass the new handler
        onSettings={() => setPage('settings')}
      />
    );
  }

  if (page === 'start') {
    return (
      <StartSessionPage
        user={user}
        onBack={() => navigateTo('home')}
        onSessionStart={(s) => { setSession(s); navigateTo('active'); }}
      />
    );
  }

  return (
    <HomePage
      user={user}
      onStart={() => navigateTo('start')}
      onSettings={() => navigateTo('settings')}
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