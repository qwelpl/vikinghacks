



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



function matchUrl(url, pattern) {
  if (!url || !pattern) return false;
  try {
    const u = new URL(url);
    // Normalize pattern: strip protocol, www, trailing slash, and path
    const p = pattern.toLowerCase()
      .replace(/https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .split('/')[0];

    const h = u.hostname.replace(/^www\./, '').toLowerCase();

    // Exact match, or the URL is a subdomain OF the pattern
    // e.g. pattern "docs.google.com" matches "www.docs.google.com"
    // but pattern "google.com" does NOT match "docs.google.com"
    return h === p || h.endsWith('.' + p);
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

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const session = await getActiveSession();
  if (!session) return;

  
  if (session.breaks?.onBreak) return;

  const url = details.url;
  if (isAllowed(url, session)) return;

  if (!session.distractionAttempts) session.distractionAttempts = [];
  session.distractionAttempts.push({ url, time: Date.now(), type: 'block' });
  await setActiveSession(session);

  const blockedUrl =
    chrome.runtime.getURL('blocked.html') +
    '?url=' + encodeURIComponent(url) +
    '&tabId=' + details.tabId;

  chrome.tabs.update(details.tabId, { url: blockedUrl });
});



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
  if (!isAllowed(url, session)) return; 

  
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
    
  }

  if (!session.pageActivity) session.pageActivity = [];

  
  const existing = session.pageActivity.find((p) => p.url === url);
  if (existing) {
    existing.visits = (existing.visits || 1) + 1;
    existing.lastVisit = Date.now();
    if (content.length > existing.content.length) existing.content = content;
    if (title) existing.title = title;
  } else {
    if (session.pageActivity.length >= 30) session.pageActivity.shift(); 
    session.pageActivity.push({ url, title, content, firstVisit: Date.now(), lastVisit: Date.now(), visits: 1 });
  }

  await setActiveSession(session);
});



chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handle(msg).then(sendResponse).catch((e) => sendResponse({ error: e.message }));
  return true; 
});

async function swFetchOpenAI(system, userMsg) {
  const res = await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system,
      userMsg,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}

async function handle(msg) {
  switch (msg.type) {
    case 'GET_SESSION':
      return { session: await getActiveSession() };

    case 'START_SESSION': {
      const s = msg.session;
      s.distractionAttempts = [];
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
      const siteUrl = new URL(url).origin;
      s.emergencyAccess = s.emergencyAccess.filter(
        (a) => a.url !== siteUrl
      );
      s.emergencyAccess.push({
        url: siteUrl,
        grantedAt: Date.now(),
        grantedUntil: Date.now() + duration * 60 * 1000,
        duration,
      });
      await setActiveSession(s);
      return { success: true };
    }

    case 'LOG_BYPASS_ATTEMPT': {
      const s = await getActiveSession();
      if (!s) return { error: 'No active session' };
      if (!s.distractionAttempts) s.distractionAttempts = [];
      s.distractionAttempts.push({ ...msg.request, type: 'bypass' });
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
      const { system, userMsg } = msg;
      const text = await swFetchOpenAI(system, userMsg);
      return { text };
    }

    default:
      return { error: 'Unknown message type' };
  }
}
