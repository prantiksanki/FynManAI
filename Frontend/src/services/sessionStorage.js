const KEY = 'finai_sessions';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function save(sessions) {
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

export function getSessions() {
  return load().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function createSession(prompt) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const title = prompt.length > 48 ? prompt.slice(0, 48).trimEnd() + '…' : prompt;
  const session = { id, title, prompt, createdAt: now, updatedAt: now };
  const sessions = load();
  sessions.unshift(session);
  save(sessions);
  return id;
}

export function updateSession(id, fields) {
  const sessions = load();
  const idx = sessions.findIndex(s => s.id === id);
  if (idx === -1) return;
  sessions[idx] = { ...sessions[idx], ...fields, updatedAt: new Date().toISOString() };
  save(sessions);
}

export function deleteSession(id) {
  save(load().filter(s => s.id !== id));
}

export function getSession(id) {
  return load().find(s => s.id === id) || null;
}

export function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}
