require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const { generateCanvasTimeline } = require('./controller/canvasController');
const { fetchImage } = require('./controller/imageController');
const { generateTts } = require('./controller/ttsController');
const {
  createSession, listSessions, getSession, updateSession, deleteSession, saveSnapshot,
} = require('./controller/sessionController');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3000;

// ── Startup env audit (visible in Render logs) ────────────────────────────────
console.log('[FinAI] Env check:',
  'OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✓ set' : '✗ MISSING',
  '| MONGODB_URI:', process.env.MONGODB_URI ? '✓ set' : '✗ not set (sessions disabled)',
  '| FRONTEND_URL:', process.env.FRONTEND_URL || '(using hardcoded default)',
);

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://fynmanai.onrender.com',
  process.env.FRONTEND_URL,
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/tts-audio', express.static(path.join(__dirname, 'public', 'tts-audio')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', model: 'gemini-2.0-flash' }));

// Core canvas generation
app.post('/api/canvas/generate', generateCanvasTimeline);

// TTS generation
app.post('/api/tts', generateTts);

// Image proxy
app.get('/api/image/fetch', fetchImage);

// Session CRUD
app.post('/api/sessions',                          createSession);
app.get('/api/sessions',                           listSessions);
app.get('/api/sessions/:sessionId',                getSession);
app.put('/api/sessions/:sessionId/snapshot',       saveSnapshot);
app.put('/api/sessions/:sessionId',                updateSession);
app.delete('/api/sessions/:sessionId',             deleteSession);

app.use(notFound);
app.use(errorHandler);

// ── Startup: connect MongoDB then start server ────────────────────────────────
// Canvas generation (/api/canvas/generate) and image fetch (/api/image/fetch)
// do NOT need MongoDB — they work purely with OpenRouter + image APIs.
// If MONGODB_URI is not configured (e.g. Render free tier without Atlas),
// the server starts anyway; only session CRUD endpoints will be unavailable.
const MONGO_URI = process.env.MONGODB_URI;

function startServer() {
  app.listen(port, () => {
    console.log(`[FinAI] Server running on port ${port}`);
  });
}

if (!MONGO_URI || MONGO_URI === 'mongodb://localhost:27017/finai') {
  console.warn('[FinAI] WARNING: MONGODB_URI not set or is localhost — session persistence disabled.');
  console.warn('[FinAI] Set MONGODB_URI in Render environment variables to enable sessions.');
  startServer();
} else {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('[FinAI] MongoDB connected');
      startServer();
    })
    .catch(err => {
      console.error('[FinAI] MongoDB connection failed:', err.message);
      console.warn('[FinAI] Starting server without MongoDB — session endpoints will fail.');
      startServer();
    });
}
