const KEYS = {
  USERS: 'warden_users',
  CURRENT_USER: 'warden_current_user',
  ACTIVE_SESSION: 'warden_active_session',
  SESSION_HISTORY: 'warden_session_history',
  SETTINGS: 'warden_settings',
};

const get = (key) =>
  new Promise((resolve) => chrome.storage.local.get(key, (r) => resolve(r[key])));

const set = (key, value) =>
  new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve));

const remove = (key) =>
  new Promise((resolve) => chrome.storage.local.remove(key, resolve));

export const getUsers = () => get(KEYS.USERS);
export const setUsers = (v) => set(KEYS.USERS, v);

export const getCurrentUser = () => get(KEYS.CURRENT_USER);
export const setCurrentUser = (v) => set(KEYS.CURRENT_USER, v);
export const clearCurrentUser = () => remove(KEYS.CURRENT_USER);

export const getActiveSession = () => get(KEYS.ACTIVE_SESSION);
export const setActiveSession = (v) => set(KEYS.ACTIVE_SESSION, v);
export const clearActiveSession = () => remove(KEYS.ACTIVE_SESSION);

export const getSessionHistory = () => get(KEYS.SESSION_HISTORY);
export const setSessionHistory = (v) => set(KEYS.SESSION_HISTORY, v);

export const getSettings = () => get(KEYS.SETTINGS);
export const setSettings = (v) => set(KEYS.SETTINGS, v);

export async function addSessionToHistory(session) {
  const history = (await getSessionHistory()) || [];
  history.unshift(session);
  if (history.length > 100) history.pop();
  await setSessionHistory(history);
}

export { KEYS };
