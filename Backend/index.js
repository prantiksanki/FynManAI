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

// Connect to MongoDB then start server
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finai';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('[FinAI] MongoDB connected');
    app.listen(port, () => {
      console.log(`[FinAI] Server running on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('[FinAI] MongoDB connection failed:', err.message);
    process.exit(1);
  });
