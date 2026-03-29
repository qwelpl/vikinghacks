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
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-gradient-to-br from-black to-gray-900 text-white animate-fade-in">
      
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-xl shadow-red-900/50">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Warden</h1>
          <p className="text-sm text-gray-400 mt-1">Stay focused. Stay honest.</p>
        </div>
      </div>

      
      <div className="w-full bg-black/30 rounded-xl p-1 flex mb-5 border border-red-500/30">
        {[['login', 'Sign In'], ['signup', 'Create Account']].map(([t, label]) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              tab === t ? 'bg-red-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 bg-black/30 border border-red-500/30 rounded-xl text-white text-sm placeholder-gray-500 transition-colors"
          required
          autoFocus
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-black/30 border border-red-500/30 rounded-xl text-white text-sm placeholder-gray-500 transition-colors"
          required
          autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
        />

        {error && (
          <div className="px-4 py-2.5 bg-red-900/40 border border-red-800/60 rounded-xl">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <><div className="spinner w-4 h-4" /><span>Please wait…</span></>
          ) : tab === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-xs text-gray-600 text-center">
        Your data is stored locally on this device only.
      </p>
    </div>
  );
}
