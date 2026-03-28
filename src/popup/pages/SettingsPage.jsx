import React, {useState} from 'react';
import {logout} from '../../utils/auth';
import {ChevronLeft} from 'lucide-react';

export default function SettingsPage({ user, onBack, onLogout }) {
  const [override, setOverride] = useState('');
  const [overrideMsg, setOverrideMsg] = useState('');

  async function handleOverride() {
    setOverrideMsg('');
    const res = await chrome.runtime.sendMessage({ type: 'ADMIN_OVERRIDE', password: override });
    setOverrideMsg(res?.success ? 'Session ended.' : res?.error || 'Failed.');
  }

  async function handleLogout() {
    await logout();
    onLogout();
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-black to-gray-900 text-white animate-fade-in overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-red-500/30 shrink-0">
        <button onClick={onBack} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-sm font-semibold text-white">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Account</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{user.username}</p>
              <p className="text-xs text-gray-400 mt-0.5">Since {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={handleLogout}
              className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-800/40 rounded-lg hover:bg-red-900/30 transition-colors">
              Sign Out
            </button>
          </div>
        </div>

        <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Emergency Override</p>
          <p className="text-xs text-gray-400 mb-3">End an active session using the admin password set at session start.</p>
          <div className="flex gap-2">
            <input type="password" value={override} onChange={(e) => setOverride(e.target.value)}
              placeholder="Admin password…"
              className="flex-1 px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 transition-colors" />
            <button onClick={handleOverride} disabled={!override.trim()}
              className="px-3 py-2 bg-red-900/40 hover:bg-red-800/40 border border-red-800/50 text-red-400 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
              End
            </button>
          </div>
          {overrideMsg && (
            <p className={`text-xs mt-2 ${overrideMsg.includes('ended') ? 'text-red-400' : 'text-red-400'}`}>{overrideMsg}</p>
          )}
        </div>

        <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">About</p>
          <div className="space-y-1 text-xs text-gray-400">
            <div className="flex justify-between"><span>Version</span><span className="text-white">1.0.0</span></div>
            <div className="flex justify-between"><span>Storage</span><span className="text-white">Local device</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
