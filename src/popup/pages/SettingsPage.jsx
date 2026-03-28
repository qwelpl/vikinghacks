import React, { useState, useEffect } from 'react';
import { getSettings, setSettings } from '../../utils/storage';
import { logout } from '../../utils/auth';

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile',  label: 'Llama 3.3 70B (Recommended)' },
  { id: 'llama-3.1-8b-instant',     label: 'Llama 3.1 8B (Fastest)' },
  { id: 'mixtral-8x7b-32768',       label: 'Mixtral 8x7B' },
  { id: 'gemma2-9b-it',             label: 'Gemma 2 9B' },
];

const OLLAMA_MODELS = [
  { id: 'llama3.2',   label: 'Llama 3.2 (Recommended)' },
  { id: 'llama3.1',   label: 'Llama 3.1' },
  { id: 'mistral',    label: 'Mistral 7B' },
  { id: 'phi3',       label: 'Phi-3 Mini' },
  { id: 'gemma2',     label: 'Gemma 2' },
  { id: 'qwen2.5',    label: 'Qwen 2.5' },
];

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-violet-600' : 'bg-[#2d2d3e]'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function SettingsPage({ user, onBack, onLogout }) {
  const [cfg, setCfg]         = useState({ aiProvider: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3.2', groqApiKey: '', groqModel: 'llama-3.3-70b-versatile' });
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [override, setOverride] = useState('');
  const [overrideMsg, setOverrideMsg] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      if (s) setCfg((prev) => ({ ...prev, ...s }));
    });
  }, []);

  function update(key, value) {
    setCfg((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const cur = (await getSettings()) || {};
    await setSettings({ ...cur, ...cfg });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testConnection() {
    setTesting(true);
    setTestMsg('');
    try {
      await save();
      const { judgeProofOfCompletion } = await import('../../utils/aiApi');
      const result = await judgeProofOfCompletion(
        [{ id: 'test', description: 'Test task' }],
        'This is a test — respond with approved: true'
      );
      setTestMsg(result.approved !== undefined
        ? `✓ Connected! AI responded correctly.`
        : '⚠ Connected but response format unexpected.');
    } catch (e) {
      setTestMsg(`✗ ${e.message}`);
    } finally {
      setTesting(false);
    }
  }

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
    <div className="flex-1 flex flex-col bg-[#0a0a0f] animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1f1f2e] shrink-0">
        <button onClick={onBack} className="p-1.5 text-[#8b8a9b] hover:text-white hover:bg-[#1f1f2e] rounded-lg transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h2 className="text-sm font-semibold text-white">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Account */}
        <div className="bg-[#13131a] rounded-xl p-4 border border-[#1f1f2e]">
          <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-3">Account</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{user.username}</p>
              <p className="text-xs text-[#6b6a7b] mt-0.5">Since {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={handleLogout}
              className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-800/40 rounded-lg hover:bg-red-950/30 transition-colors">
              Sign Out
            </button>
          </div>
        </div>

        {/* AI Provider */}
        <div className="bg-[#13131a] rounded-xl p-4 border border-[#1f1f2e]">
          <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-3">AI Provider</p>

          {/* Provider toggle */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { id: 'ollama', label: 'Ollama', sub: 'Local · No key needed', icon: '🖥' },
              { id: 'groq',   label: 'Groq',   sub: 'Free tier · Fast',      icon: '⚡' },
            ].map((p) => (
              <button key={p.id} onClick={() => update('aiProvider', p.id)}
                className={`p-3 rounded-xl border text-left transition-all ${cfg.aiProvider === p.id ? 'border-violet-600 bg-violet-950/30' : 'border-[#1f1f2e] hover:border-[#3d3d4e]'}`}>
                <div className="text-lg mb-1">{p.icon}</div>
                <div className="text-sm font-semibold text-white">{p.label}</div>
                <div className="text-[11px] text-[#6b6a7b]">{p.sub}</div>
              </button>
            ))}
          </div>

          {/* Ollama config */}
          {cfg.aiProvider === 'ollama' && (
            <div className="space-y-3">
              <div className="px-3 py-2.5 bg-blue-950/20 border border-blue-800/30 rounded-xl text-xs text-blue-400 leading-relaxed">
                Requires <span className="font-semibold">Ollama</span> running locally.
                Install at <span className="font-mono">ollama.com</span>, then run:{' '}
                <code className="bg-blue-900/30 px-1.5 py-0.5 rounded font-mono">ollama pull {cfg.ollamaModel}</code>
                <br />
                <span className="text-blue-500/70 mt-1 block">
                  If requests fail: <code className="font-mono">OLLAMA_ORIGINS=* ollama serve</code>
                </span>
              </div>
              <div>
                <label className="block text-xs text-[#6b6a7b] mb-1.5">Server URL</label>
                <input type="text" value={cfg.ollamaUrl} onChange={(e) => update('ollamaUrl', e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-white text-sm transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-[#6b6a7b] mb-1.5">Model</label>
                <select value={cfg.ollamaModel} onChange={(e) => update('ollamaModel', e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-white text-sm transition-colors">
                  {OLLAMA_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  <option value="custom">Custom…</option>
                </select>
                {cfg.ollamaModel === 'custom' && (
                  <input type="text" placeholder="Enter model name…"
                    onChange={(e) => update('ollamaModel', e.target.value)}
                    className="mt-2 w-full px-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-white text-sm transition-colors" />
                )}
              </div>
            </div>
          )}

          {/* Groq config */}
          {cfg.aiProvider === 'groq' && (
            <div className="space-y-3">
              <div className="px-3 py-2.5 bg-emerald-950/20 border border-emerald-800/30 rounded-xl text-xs text-emerald-400 leading-relaxed">
                Free tier at <span className="font-semibold">console.groq.com</span> — no credit card required.
                Get your API key from API Keys → Create API Key.
              </div>
              <div>
                <label className="block text-xs text-[#6b6a7b] mb-1.5">API Key</label>
                <div className="relative">
                  <input type={showKey ? 'text' : 'password'} value={cfg.groqApiKey}
                    onChange={(e) => update('groqApiKey', e.target.value)}
                    placeholder="gsk_..."
                    className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-white text-sm pr-9 transition-colors" />
                  <button onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b6a7b] hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {showKey
                        ? <><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18.4 18.4 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      }
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#6b6a7b] mb-1.5">Model</label>
                <select value={cfg.groqModel} onChange={(e) => update('groqModel', e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-white text-sm transition-colors">
                  {GROQ_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Save + Test */}
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                saved
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
                  : 'bg-violet-600/20 hover:bg-violet-600/30 border border-violet-700 text-violet-400 disabled:opacity-40'
              }`}>
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={testConnection} disabled={testing}
              className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-[#1f1f2e] hover:bg-[#2d2d3e] text-[#8b8a9b] hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
              {testing ? <><div className="spinner w-3.5 h-3.5" />Testing…</> : 'Test Connection'}
            </button>
          </div>

          {testMsg && (
            <p className={`text-xs mt-2 leading-relaxed ${testMsg.startsWith('✓') ? 'text-emerald-400' : testMsg.startsWith('⚠') ? 'text-amber-400' : 'text-red-400'}`}>
              {testMsg}
            </p>
          )}
        </div>

        {/* Emergency Override */}
        <div className="bg-[#13131a] rounded-xl p-4 border border-[#1f1f2e]">
          <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-1">Emergency Override</p>
          <p className="text-xs text-[#6b6a7b] mb-3">End an active session using the admin password set at session start.</p>
          <div className="flex gap-2">
            <input type="password" value={override} onChange={(e) => setOverride(e.target.value)}
              placeholder="Admin password…"
              className="flex-1 px-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-white text-sm placeholder-[#3d3d4e] transition-colors" />
            <button onClick={handleOverride} disabled={!override.trim()}
              className="px-3 py-2 bg-red-950/40 hover:bg-red-900/40 border border-red-800/50 text-red-400 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
              End
            </button>
          </div>
          {overrideMsg && (
            <p className={`text-xs mt-2 ${overrideMsg.includes('ended') ? 'text-emerald-400' : 'text-red-400'}`}>{overrideMsg}</p>
          )}
        </div>

        {/* About */}
        <div className="bg-[#13131a] rounded-xl p-4 border border-[#1f1f2e]">
          <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-2">About</p>
          <div className="space-y-1 text-xs text-[#6b6a7b]">
            <div className="flex justify-between"><span>Version</span><span className="text-white">1.0.0</span></div>
            <div className="flex justify-between"><span>AI</span><span className="text-white capitalize">{cfg.aiProvider} · {cfg.aiProvider === 'ollama' ? cfg.ollamaModel : cfg.groqModel}</span></div>
            <div className="flex justify-between"><span>Storage</span><span className="text-white">Local device</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
