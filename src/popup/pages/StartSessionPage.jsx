import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../utils/helpers';

function Steps({ current, total }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current ? 'bg-violet-500' : i === current ? 'bg-violet-400' : 'bg-[#1f1f2e]'
          }`}
          style={{ width: i === current ? 24 : 10 }}
        />
      ))}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-violet-600' : 'bg-[#2d2d3e]'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

const STEPS = ['Your Goal', 'Allowed Sites', 'Settings', 'Review & Lock'];

export default function StartSessionPage({ user, onBack, onSessionStart }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [sites, setSites] = useState([]);
  const [siteUrl, setSiteUrl] = useState('');
  const [siteReason, setSiteReason] = useState('');
  const [breaksEnabled, setBreaksEnabled] = useState(true);
  const [breakInterval, setBreakInterval] = useState(60);
  const [breakDuration, setBreakDuration] = useState(5);
  const [adminPwd, setAdminPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canNext = step === 0 ? goal.trim().length > 0 : true;

  function addSite() {
    if (!siteUrl.trim()) return;
    setSites([...sites, { id: uuidv4(), url: siteUrl.trim(), reason: siteReason.trim() }]);
    setSiteUrl('');
    setSiteReason('');
  }

  async function startSession() {
    setLoading(true);
    setError('');
    try {
      let adminPasswordHash = null;
      if (adminPwd.trim()) {
        adminPasswordHash = await hashPassword(adminPwd.trim(), 'warden_admin');
      }

      const session = {
        id: uuidv4(),
        userId: user.id,
        goal: goal.trim(),
        allowedSites: sites,
        whitelist: ['chrome://newtab', 'chrome://extensions', 'chrome://settings'],
        breaks: {
          enabled: breaksEnabled,
          interval: breakInterval,
          duration: breakDuration,
          onBreak: false,
          lastBreak: null,
          breakEndTime: null,
          nextBreak: breaksEnabled ? Date.now() + breakInterval * 60 * 1000 : null,
        },
        adminPasswordHash,
        emergencyAccess: [],
        pageActivity: [],
        startTime: Date.now(),
        endTime: null,
        status: 'active',
      };

      const res = await chrome.runtime.sendMessage({ type: 'START_SESSION', session });
      if (res?.error) throw new Error(res.error);
      onSessionStart(session);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0f] animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1f1f2e] shrink-0">
        <button
          onClick={step === 0 ? onBack : () => setStep(step - 1)}
          className="p-1.5 text-[#8b8a9b] hover:text-white hover:bg-[#1f1f2e] rounded-lg transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-sm font-semibold text-white">{STEPS[step]}</h2>
            <span className="text-xs text-[#6b6a7b]">{step + 1} / {STEPS.length}</span>
          </div>
          <Steps current={step} total={STEPS.length} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* ── Step 0: Goal ── */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-2">
                What do you need to get done?
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe your goal for this session. Be specific — the AI will verify you actually completed it."
                className="w-full px-4 py-3 bg-[#13131a] border border-[#1f1f2e] rounded-xl text-white text-sm placeholder-[#3d3d4e] resize-none h-32 transition-colors"
                autoFocus
              />
              <p className="text-xs text-[#4a4a5a] mt-2 leading-relaxed">
                The AI will scan the pages you visit during your session and cross-reference them against this goal to verify completion.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 1: Allowed Sites ── */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs text-[#6b6a7b] leading-relaxed">
              Everything is blocked by default. Add only what you genuinely need.
            </p>

            <div className="bg-[#13131a] rounded-xl p-3.5 border border-[#1f1f2e] space-y-2">
              <input
                type="text"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="Website (e.g. docs.google.com)"
                className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-white text-sm placeholder-[#3d3d4e] transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && addSite()}
              />
              <input
                type="text"
                value={siteReason}
                onChange={(e) => setSiteReason(e.target.value)}
                placeholder="Why do you need this? (optional)"
                className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-white text-sm placeholder-[#3d3d4e] transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && addSite()}
              />
              <button
                onClick={addSite}
                className="w-full py-2 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-700/60 text-violet-400 rounded-lg text-sm font-medium transition-colors"
              >
                + Add Site
              </button>
            </div>

            {sites.length === 0 ? (
              <p className="text-center text-xs text-[#3d3d4e] py-4">No sites added — all will be blocked.</p>
            ) : (
              <div className="space-y-2">
                {sites.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 bg-[#13131a] rounded-xl px-3.5 py-3 border border-[#1f1f2e]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{s.url}</p>
                      {s.reason && <p className="text-xs text-[#6b6a7b] mt-0.5">{s.reason}</p>}
                    </div>
                    <button
                      onClick={() => setSites(sites.filter((x) => x.id !== s.id))}
                      className="p-1 text-[#3d3d4e] hover:text-red-400 transition-colors shrink-0"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Settings ── */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#13131a] rounded-xl p-4 border border-[#1f1f2e]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Break Schedule</h3>
                  <p className="text-xs text-[#6b6a7b] mt-0.5">Scheduled breaks improve sustained focus</p>
                </div>
                <Toggle value={breaksEnabled} onChange={setBreaksEnabled} />
              </div>
              {breaksEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Every', value: breakInterval, onChange: setBreakInterval, options: [30, 45, 60, 90, 120] },
                    { label: 'Break length', value: breakDuration, onChange: setBreakDuration, options: [5, 10, 15, 20] },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="block text-xs text-[#6b6a7b] mb-1.5">{f.label}</label>
                      <select
                        value={f.value}
                        onChange={(e) => f.onChange(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-white text-sm transition-colors"
                      >
                        {f.options.map((v) => <option key={v} value={v}>{v} min</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#13131a] rounded-xl p-4 border border-[#1f1f2e]">
              <h3 className="text-sm font-semibold text-white mb-1">Override Password</h3>
              <p className="text-xs text-[#6b6a7b] mb-3">
                Emergency escape hatch. Leave empty to disable.
              </p>
              <input
                type="password"
                value={adminPwd}
                onChange={(e) => setAdminPwd(e.target.value)}
                placeholder="Leave empty to disable override…"
                className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-white text-sm placeholder-[#3d3d4e] transition-colors"
              />
              {adminPwd && (
                <p className="text-xs text-amber-500/80 mt-2">⚠ Write this down — there is no recovery option.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-[#13131a] rounded-xl p-4 border border-[#1f1f2e]">
              <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-2">Goal</p>
              <p className="text-sm text-white leading-relaxed">{goal}</p>
            </div>

            <div className="bg-[#13131a] rounded-xl p-4 border border-[#1f1f2e]">
              <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-2">
                Allowed Sites ({sites.length})
              </p>
              {sites.length === 0
                ? <p className="text-sm text-[#6b6a7b]">None — all sites blocked</p>
                : <ul className="space-y-1">{sites.map((s) => <li key={s.id} className="text-sm text-white truncate">{s.url}</li>)}</ul>
              }
            </div>

            <div className="bg-[#13131a] rounded-xl p-4 border border-[#1f1f2e]">
              <p className="text-[11px] font-semibold text-[#6b6a7b] uppercase tracking-widest mb-2">Settings</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-[#6b6a7b]">Breaks</span><span className="text-white">{breaksEnabled ? `Every ${breakInterval}m (${breakDuration}m)` : 'Off'}</span></div>
                <div className="flex justify-between"><span className="text-[#6b6a7b]">Override</span><span className="text-white">{adminPwd ? '✓ Set' : 'Disabled'}</span></div>
              </div>
            </div>

            <div className="rounded-xl p-3.5 border border-amber-700/40" style={{ background: 'rgba(120,53,15,0.15)' }}>
              <p className="text-amber-400 text-xs font-semibold mb-1">⚠ About to lock down</p>
              <p className="text-amber-500/70 text-xs">All unlisted websites will be blocked. The AI will scan your browsing history to verify you completed your goal.</p>
            </div>

            {error && (
              <div className="px-4 py-2.5 bg-red-950/40 border border-red-800/60 rounded-xl">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#1f1f2e] shrink-0">
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            Continue
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ) : (
          <button
            onClick={startSession}
            disabled={loading}
            className="w-full py-3 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
          >
            {loading ? (
              <><div className="spinner w-4 h-4" /><span>Activating…</span></>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Lock It Down
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
