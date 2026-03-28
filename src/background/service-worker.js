// Warden Service Worker — handles tab blocking, break alarms, and message routing

// ─── Storage helpers (inline to avoid import issues in SW) ─────────────────

const getActiveSession = () =>
  new Promise((resolve) =>
    chrome.storage.local.get('warden_active_session', (r) =>
      resolve(r['warden_active_session'] || null)
    )
  );

const setActiveSession = (v) =>
  new Promise((resolve) =>
    chrome.storage.local.set({ warden_active_session: v }, resolve)
  );

const clearActiveSession = () =>
  new Promise((resolve) =>
    chrome.storage.local.remove('warden_active_session', resolve)
  );

const addToHistory = async (session) => {
  const key = 'warden_session_history';
  const data = await new Promise((r) => chrome.storage.local.get(key, (v) => r(v[key] || [])));
  data.unshift(session);
  if (data.length > 100) data.pop();
  return new Promise((r) => chrome.storage.local.set({ [key]: data }, r));
};

// ─── URL matching ───────────────────────────────────────────────────────────

function matchUrl(url, pattern) {
  if (!url || !pattern) return false;
  try {
    const u = new URL(url);
    const p = pattern.replace(/https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const h = u.hostname.replace(/^www\./, '').toLowerCase();
    return h === p || h.endsWith('.' + p) || u.href.toLowerCase().includes(p);
  } catch {
    return url.toLowerCase().includes(pattern.toLowerCase());
  }
}

function isAllowed(url, session) {
  if (!url || !session) return true;

  if (
    url.startsWith('chrome-extension://') ||
    url.startsWith('chrome://') ||
    url.startsWith('moz-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://')
  ) return true;

  for (const item of session.whitelist || []) {
    if (matchUrl(url, item)) return true;
  }

  const now = Date.now();
  for (const ea of session.emergencyAccess || []) {
    if (ea.grantedUntil > now && matchUrl(url, ea.url)) return true;
  }

  for (const site of session.allowedSites || []) {
    if (matchUrl(url, site.url)) return true;
  }

  return false;
}

// ─── Tab blocking ───────────────────────────────────────────────────────────

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const session = await getActiveSession();
  if (!session) return;

  // Allow navigation during breaks
  if (session.breaks?.onBreak) return;

  const url = details.url;
  if (isAllowed(url, session)) return;

  const blockedUrl =
    chrome.runtime.getURL('blocked.html') +
    '?url=' + encodeURIComponent(url) +
    '&tabId=' + details.tabId;

  chrome.tabs.update(details.tabId, { url: blockedUrl });
});

// ─── Break alarms ───────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'warden-break-start') {
    const session = await getActiveSession();
    if (!session?.breaks?.enabled) return;

    session.breaks.onBreak = true;
    session.breaks.lastBreak = Date.now();
    session.breaks.breakEndTime = Date.now() + session.breaks.duration * 60 * 1000;
    await setActiveSession(session);

    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: 'Break Time!',
      message: `You earned a ${session.breaks.duration}-minute break. Step away!`,
    });

    chrome.alarms.create('warden-break-end', { delayInMinutes: session.breaks.duration });
  }

  if (alarm.name === 'warden-break-end') {
    const session = await getActiveSession();
    if (!session) return;

    session.breaks.onBreak = false;
    session.breaks.breakEndTime = null;
    session.breaks.nextBreak = Date.now() + session.breaks.interval * 60 * 1000;
    await setActiveSession(session);

    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: 'Break Over',
      message: "Time to get back to it. You're locked in.",
    });

    if (session.breaks.enabled) {
      chrome.alarms.create('warden-break-start', { delayInMinutes: session.breaks.interval });
    }
  }
});

// ─── Page activity tracker ──────────────────────────────────────────────────
// Runs in the page context via chrome.scripting — must be a standalone function
function extractPageContent() {
  const candidates = [
    'article', 'main', '[role="main"]', '.content', '#content',
    '#main-content', '.main-content', '.post-body', '.entry-content',
  ];
  let text = '';
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el) {
      text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
      if (text.length > 300) break;
    }
  }
  if (text.length < 300) {
    text = (document.body?.innerText || '').trim().replace(/\s+/g, ' ');
  }
  return { title: document.title || '', content: text.slice(0, 2000) };
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const url = tab.url || '';
  if (!url || url.startsWith('chrome') || url.startsWith('chrome-extension')) return;

  const session = await getActiveSession();
  if (!session) return;
  if (!isAllowed(url, session)) return; // only track pages the user is allowed on

  // Capture page content via scripting API
  let title = tab.title || url;
  let content = '';
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractPageContent,
    });
    if (result?.result) {
      title = result.result.title || title;
      content = result.result.content || '';
    }
  } catch {
    // Page may have blocked scripting (PDFs, some SPAs) — continue without content
  }

  if (!session.pageActivity) session.pageActivity = [];

  // Merge with existing entry for this URL (dedup + accumulate visits)
  const existing = session.pageActivity.find((p) => p.url === url);
  if (existing) {
    existing.visits = (existing.visits || 1) + 1;
    existing.lastVisit = Date.now();
    if (content.length > existing.content.length) existing.content = content;
    if (title) existing.title = title;
  } else {
    if (session.pageActivity.length >= 30) session.pageActivity.shift(); // cap at 30 pages
    session.pageActivity.push({ url, title, content, firstVisit: Date.now(), lastVisit: Date.now(), visits: 1 });
  }

  await setActiveSession(session);
});

// ─── Message handler ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handle(msg).then(sendResponse).catch((e) => sendResponse({ error: e.message }));
  return true; // keep channel open for async response
});

// ─── AI fetch helpers (run in SW to bypass CORS) ────────────────────────────

async function swFetchOllama(baseUrl, model, system, userMsg) {
  let res;
  try {
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: system  },
          { role: 'user',   content: userMsg },
        ],
      }),
    });
  } catch (e) {
    throw new Error(
      `Cannot reach Ollama at ${baseUrl}. ` +
      `Make sure it is running (ollama serve) and the model is pulled (ollama pull ${model}).`
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 404)
      throw new Error(`Model "${model}" not found. Run: ollama pull ${model}`);
    throw new Error(`Ollama error ${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  return data.message?.content || '';
}

async function swFetchGroq(apiKey, model, system, userMsg) {
  if (!apiKey) throw new Error('Groq API key not set. Add your free key in Settings (console.groq.com).');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      messages: [
        { role: 'system', content: system  },
        { role: 'user',   content: userMsg },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq error ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function handle(msg) {
  switch (msg.type) {
    case 'GET_SESSION':
      return { session: await getActiveSession() };

    case 'START_SESSION': {
      const s = msg.session;
      await setActiveSession(s);
      if (s.breaks?.enabled) {
        chrome.alarms.create('warden-break-start', { delayInMinutes: s.breaks.interval });
      }
      return { success: true };
    }

    case 'END_SESSION': {
      const s = await getActiveSession();
      if (s) {
        s.status = msg.status || 'completed';
        s.endTime = Date.now();
        await addToHistory(s);
        await clearActiveSession();
      }
      chrome.alarms.clearAll();
      return { success: true };
    }

    case 'GRANT_EMERGENCY_ACCESS': {
      const s = await getActiveSession();
      if (!s) return { error: 'No active session' };

      const { url, duration } = msg;
      if (!s.emergencyAccess) s.emergencyAccess = [];

      // Remove any existing access for same domain
      s.emergencyAccess = s.emergencyAccess.filter((a) => !matchUrl(url, a.url));
      s.emergencyAccess.push({
        url,
        grantedAt: Date.now(),
        grantedUntil: Date.now() + duration * 60 * 1000,
        duration,
      });

      await setActiveSession(s);
      return { success: true };
    }

    case 'UPDATE_SESSION': {
      const s = await getActiveSession();
      if (!s) return { error: 'No active session' };
      await setActiveSession({ ...s, ...msg.updates });
      return { success: true };
    }

    case 'ADMIN_OVERRIDE': {
      const s = await getActiveSession();
      if (!s) return { error: 'No active session' };
      if (!s.adminPasswordHash) return { error: 'No admin password set for this session' };

      // Hash the provided password and compare
      const enc = new TextEncoder();
      const data = enc.encode(msg.password + 'warden_admin');
      const hashBuf = await crypto.subtle.digest('SHA-256', data);
      const hash = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (hash !== s.adminPasswordHash) return { error: 'Incorrect password' };

      s.status = 'overridden';
      s.endTime = Date.now();
      await addToHistory(s);
      await clearActiveSession();
      chrome.alarms.clearAll();
      return { success: true };
    }

    case 'CALL_AI': {
      // Runs in the service worker so host_permissions bypasses Ollama's CORS restriction
      const { provider, ollamaUrl, ollamaModel, groqApiKey, groqModel, system, userMsg } = msg;
      let text;
      if (provider === 'groq') {
        text = await swFetchGroq(groqApiKey, groqModel, system, userMsg);
      } else {
        text = await swFetchOllama(ollamaUrl || 'http://localhost:11434', ollamaModel || 'llama3.2', system, userMsg);
      }
      return { text };
    }

    default:
      return { error: 'Unknown message type' };
  }
}
