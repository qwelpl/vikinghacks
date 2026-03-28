export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function formatDuration(ms) {
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs > 0 && rem > 0) return `${hrs}h ${rem}m`;
  if (hrs > 0) return `${hrs}h`;
  if (mins === 0) return '< 1m';
  return `${mins}m`;
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

export function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

export function isUrlMatch(url, pattern) {
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

export function isUrlAllowed(url, session) {
  if (!url || !session) return true;

  
  if (
    url.startsWith('chrome-extension://') ||
    url.startsWith('chrome://') ||
    url.startsWith('moz-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://')
  ) return true;

  
  for (const item of session.whitelist || []) {
    if (isUrlMatch(url, item)) return true;
  }

  
  const now = Date.now();
  for (const ea of session.emergencyAccess || []) {
    if (ea.grantedUntil > now && isUrlMatch(url, ea.url)) return true;
  }

  
  for (const site of session.allowedSites || []) {
    if (isUrlMatch(url, site.url)) return true;
  }

  return false;
}

export async function hashPassword(password, salt = 'warden_salt_2024') {
  const data = new TextEncoder().encode(password + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
