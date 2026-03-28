import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../utils/helpers';
import { suggestWebsites } from '../../utils/aiApi';
import { ChevronLeft, ChevronRight, Lock, X, Sparkles } from 'lucide-react';

const DRAFT_KEY = 'warden_session_draft';

// A custom hook to keep state in chrome.storage.local
function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(DRAFT_KEY, (result) => {
      const draft = result[DRAFT_KEY] || {};
      if (draft[key] !== undefined) {
        setValue(draft[key]);
      }
      setHydrated(true);
    });
  }, [key]);

  const setStickyValue = useCallback((newValue) => {
    if (hydrated) {
      chrome.storage.local.get(DRAFT_KEY, (result) => {
        const draft = result[DRAFT_KEY] || {};
        chrome.storage.local.set({ [DRAFT_KEY]: { ...draft, [key]: newValue } });
      });
    }
    setValue(newValue);
  }, [key, hydrated]);

  return [value, setStickyValue];
}


function Steps({ current, total }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current ? 'bg-red-500' : i === current ? 'bg-red-400' : 'bg-white/10'
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
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-red-600' : 'bg-white/10'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

const STEPS = ['Your Goal', 'Allowed Sites', 'Settings', 'Review & Lock'];

export default function StartSessionPage({ user, onBack, onSessionStart }) {
  const [step, setStep] = useStickyState(0, 'step');
  const [goal, setGoal] = useStickyState('', 'goal');
  const [sites, setSites] = useStickyState([], 'sites');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteReason, setSiteReason] = useState('');
  const [breaksEnabled, setBreaksEnabled] = useStickyState(true, 'breaksEnabled');
  const [breakInterval, setBreakInterval] = useStickyState(60, 'breakInterval');
  const [breakDuration, setBreakDuration] = useStickyState(5, 'breakDuration');
  const [adminPwd, setAdminPwd] = useStickyState('', 'adminPwd');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [tabs, setTabs] = useState([]);

  useEffect(() => {
    async function fetchTabs() {
      const allTabs = await chrome.tabs.query({});
      setTabs(allTabs.filter(t => t.url && !t.url.startsWith('chrome://')));
    }
    if (step === 1) fetchTabs();
  }, [step]);

  const canNext = step === 0 ? goal.trim().length > 0 : true;

  function addSite(url, reason = 'AI Suggestion') {
    if (!url.trim()) return;
    try {
      const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      if (sites.find(s => s.url === hostname)) return;
      setSites([...sites, { id: uuidv4(), url: hostname, reason }]);
    } catch (e) {
      // Invalid URL, do nothing
    }
  }

  function handleAddSiteManual() {
    if (!siteUrl.trim()) return;
    addSite(siteUrl, siteReason);
    setSiteUrl('');
    setSiteReason('');
  }

  async function generateSuggestions() {
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const suggested = await suggestWebsites(goal);
      setSuggestions(suggested);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSuggestions(false);
    }
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
      
      // Clear the draft after starting the session
      await chrome.storage.local.remove(DRAFT_KEY);

      onSessionStart(session);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-black to-gray-900 text-white animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-red-500/30 shrink-0">
        <button
          onClick={step === 0 ? onBack : () => setStep(step - 1)}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-sm font-semibold text-white">{STEPS[step]}</h2>
            <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>
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
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                What do you need to get done?
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe your goal for this session. Be specific — the AI will verify you actually completed it."
                className="w-full px-4 py-3 bg-black/30 border border-red-500/30 rounded-xl text-white text-sm placeholder-gray-500 resize-none h-32 transition-colors"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                The AI will scan the pages you visit during your session and cross-reference them against this goal to verify completion.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 1: Allowed Sites ── */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs text-gray-400 leading-relaxed">
              Everything is blocked by default. Add only what you genuinely need.
            </p>

            <div className="bg-black/30 rounded-xl p-3.5 border border-red-500/30 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Open Tabs</p>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {tabs.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <input type="checkbox" id={`tab-${t.id}`}
                      checked={sites.some(s => s.url === new URL(t.url).hostname)}
                      onChange={(e) => {
                        const hostname = new URL(t.url).hostname;
                        if (e.target.checked) {
                          addSite(t.url, 'From open tabs');
                        } else {
                          setSites(sites.filter(s => s.url !== hostname));
                        }
                      }}
                      className="form-checkbox bg-black/50 border-red-500/30 text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor={`tab-${t.id}`} className="text-sm text-white truncate flex-1">{t.title}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/30 rounded-xl p-3.5 border border-red-500/30 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Manual Entry</p>
              <input
                type="text"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="Website (e.g. docs.google.com)"
                className="w-full px-3 py-2.5 bg-black/50 border border-red-500/30 rounded-lg text-white text-sm placeholder-gray-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSiteManual()}
              />
              <input
                type="text"
                value={siteReason}
                onChange={(e) => setSiteReason(e.target.value)}
                placeholder="Why do you need this? (optional)"
                className="w-full px-3 py-2.5 bg-black/50 border border-red-500/30 rounded-lg text-white text-sm placeholder-gray-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSiteManual()}
              />
              <button
                onClick={handleAddSiteManual}
                className="w-full py-2 bg-red-600/15 hover:bg-red-600/25 border border-red-700/60 text-red-400 rounded-lg text-sm font-medium transition-colors"
              >
                + Add Site
              </button>
            </div>

            <div className="bg-black/30 rounded-xl p-3.5 border border-red-500/30 space-y-2">
              <button
                onClick={generateSuggestions}
                disabled={loadingSuggestions}
                className="w-full py-2 bg-red-600/15 hover:bg-red-600/25 border border-red-700/60 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loadingSuggestions ? <><div className="spinner w-4 h-4" /><span>Generating...</span></> : <><Sparkles size={14} /> AI Suggestions</>}
              </button>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => addSite(s)} className="px-2 py-1 bg-red-900/40 text-red-300 text-xs rounded-md hover:bg-red-800/40">
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {sites.length === 0 ? (
              <p className="text-center text-xs text-gray-600 py-4">No sites added — all will be blocked.</p>
            ) : (
              <div className="space-y-2">
                {sites.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 bg-black/30 rounded-xl px-3.5 py-3 border border-red-500/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{s.url}</p>
                      {s.reason && <p className="text-xs text-gray-400 mt-0.5">{s.reason}</p>}
                    </div>
                    <button
                      onClick={() => setSites(sites.filter((x) => x.id !== s.id))}
                      className="p-1 text-gray-600 hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={12} />
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
            <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Break Schedule</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Scheduled breaks improve sustained focus</p>
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
                      <label className="block text-xs text-gray-400 mb-1.5">{f.label}</label>
                      <select
                        value={f.value}
                        onChange={(e) => f.onChange(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-black/50 border border-red-500/30 rounded-lg text-white text-sm transition-colors"
                      >
                        {f.options.map((v) => <option key={v} value={v}>{v} min</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
              <h3 className="text-sm font-semibold text-white mb-1">Override Password</h3>
              <p className="text-xs text-gray-400 mb-3">
                Emergency escape hatch. Leave empty to disable.
              </p>
              <input
                type="password"
                value={adminPwd}
                onChange={(e) => setAdminPwd(e.target.value)}
                placeholder="Leave empty to disable override…"
                className="w-full px-3 py-2.5 bg-black/50 border border-red-500/30 rounded-lg text-white text-sm placeholder-gray-500 transition-colors"
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
            <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Goal</p>
              <p className="text-sm text-white leading-relaxed">{goal}</p>
            </div>

            <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Allowed Sites ({sites.length})
              </p>
              {sites.length === 0
                ? <p className="text-sm text-gray-400">None — all sites blocked</p>
                : <ul className="space-y-1">{sites.map((s) => <li key={s.id} className="text-sm text-white truncate">{s.url}</li>)}</ul>
              }
            </div>

            <div className="bg-black/30 rounded-xl p-4 border border-red-500/30">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Settings</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Breaks</span><span className="text-white">{breaksEnabled ? `Every ${breakInterval}m (${breakDuration}m)` : 'Off'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Override</span><span className="text-white">{adminPwd ? '✓ Set' : 'Disabled'}</span></div>
              </div>
            </div>

            <div className="rounded-xl p-3.5 border border-amber-700/40 bg-amber-900/20">
              <p className="text-amber-400 text-xs font-semibold mb-1">⚠ About to lock down</p>
              <p className="text-amber-500/70 text-xs">All unlisted websites will be blocked. The AI will scan your browsing history to verify you completed your goal.</p>
            </div>

            {error && (
              <div className="px-4 py-2.5 bg-red-900/40 border border-red-800/60 rounded-xl">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-red-500/30 shrink-0">
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            Continue
            <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={startSession}
            disabled={loading}
            className="w-full py-3 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#b91c1c,#991b1b)', boxShadow: '0 4px 20px rgba(185, 28, 28, 0.4)' }}
          >
            {loading ? (
              <><div className="spinner w-4 h-4" /><span>Activating…</span></>
            ) : (
              <>
                <Lock size={15} />
                Lock It Down
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
