import React, { useState } from 'react';
import { signup, login } from '../../utils/auth';

export default function AuthPage({ onAuth }) {
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = tab === 'login' ? await login(username, password) : await signup(username, password);
      onAuth(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-[#0a0a0f] animate-fade-in">
      {/* Brand */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-xl shadow-violet-900/50">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Warden</h1>
          <p className="text-sm text-[#6b6a7b] mt-1">Stay focused. Stay honest.</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="w-full bg-[#13131a] rounded-xl p-1 flex mb-5 border border-[#1f1f2e]">
        {[['login', 'Sign In'], ['signup', 'Create Account']].map(([t, label]) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              tab === t ? 'bg-violet-600 text-white shadow-sm' : 'text-[#8b8a9b] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 bg-[#13131a] border border-[#1f1f2e] rounded-xl text-white text-sm placeholder-[#3d3d4e] transition-colors"
          required
          autoFocus
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-[#13131a] border border-[#1f1f2e] rounded-xl text-white text-sm placeholder-[#3d3d4e] transition-colors"
          required
          autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
        />

        {error && (
          <div className="px-4 py-2.5 bg-red-950/40 border border-red-800/60 rounded-xl">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <><div className="spinner w-4 h-4" /><span>Please wait…</span></>
          ) : tab === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-xs text-[#3d3d4e] text-center">
        Your data is stored locally on this device only.
      </p>
    </div>
  );
}
