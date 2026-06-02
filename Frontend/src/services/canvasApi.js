import axios from 'axios';

// In production VITE_API_URL is set to the backend Render URL (baked in at build time by Vite).
// In local dev it is empty/undefined, so relative /api is used (Vite proxy forwards to localhost:3000).
const BASE = import.meta.env.VITE_API_URL || 'https://fynmanai-backend.onrender.com';
const api = axios.create({ baseURL: `${BASE}/api`, timeout: 35000 });

// ── Canvas generation ──────────────────────────────────────
export async function generateTimeline(prompt, conversationHistory = []) {
  const { data } = await api.post('/canvas/generate', { prompt, conversationHistory });
  return data;
}

export async function fetchImageUrl(query) {
  const { data } = await api.get('/image/fetch', { params: { query } });
  return data;
}

export async function fetchVideoUrl(query) {
  const { data } = await api.get('/video/fetch', { params: { query } });
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

// ── Manim sandbox (async job model) ──────────────────────────────────────────
// Renders take 10–60s+ (longer than the axios timeout), so we kick off a job and
// poll its status. videoUrl comes back as '/api/manim-video/<file>'; prefix with
// BASE to build an absolute <video> src that points at the backend.
export async function renderManim(topic) {
  const { data } = await api.post('/manim/render', { topic });
  return data;                       // { jobId, status }
}

export async function getManimStatus(jobId) {
  const { data } = await api.get(`/manim/status/${jobId}`);
  return data;                       // { status, videoUrl?, error? }
}

// ── Report sandbox (async PDF generation) ────────────────────────────────────
// fileUrl comes back as '/api/report-file/<file>.pdf'; prefix with BASE for an
// absolute download link.
export async function renderReport(query) {
  const { data } = await api.post('/report/render', { query });
  return data;                       // { jobId, status }
}

export async function getReportStatus(jobId) {
  const { data } = await api.get(`/report/status/${jobId}`);
  return data;                       // { status, fileUrl?, error? }
}

// Backend origin — exported so callers can build absolute MP4 / PDF URLs.
export { BASE };

