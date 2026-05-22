import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 35000 });

// ── Canvas generation ──────────────────────────────────────
export async function generateTimeline(prompt, conversationHistory = []) {
  const { data } = await api.post('/canvas/generate', { prompt, conversationHistory });
  return data;
}

export async function fetchImageUrl(query) {
  const { data } = await api.get('/image/fetch', { params: { query } });
  return data;
}

// ── Session CRUD ───────────────────────────────────────────
export async function createSessionApi(userId, title) {
  const { data } = await api.post('/sessions', { userId, title });
  return data; // { sessionId, _id }
}

export async function getSessionsApi(userId) {
  const { data } = await api.get('/sessions', { params: { userId } });
  return data; // array of session summaries
}

export async function getSessionApi(sessionId) {
  const { data } = await api.get(`/sessions/${sessionId}`);
  return data; // full session with prompts[]
}

export async function updateSessionApi(sessionId, fields) {
  // fields: { title?, prompt?, timeline?, yOffset? }
  await api.put(`/sessions/${sessionId}`, fields);
}

export async function deleteSessionApi(sessionId) {
  await api.delete(`/sessions/${sessionId}`);
}

export async function saveSnapshotApi(sessionId, snapshot) {
  await api.put(`/sessions/${sessionId}/snapshot`, { snapshot });
}

