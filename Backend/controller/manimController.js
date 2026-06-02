const { spawn } = require('child_process');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const crypto = require('crypto');
const axios  = require('axios');

// ── Config ────────────────────────────────────────────────────────────────────
const MANIM_ENABLED = String(process.env.MANIM_ENABLED || '').toLowerCase() === 'true';
const NO_LATEX      = String(process.env.MANIM_NO_LATEX || '').toLowerCase() === 'true';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL          = 'anthropic/claude-haiku-4-5';

const VIDEO_DIR = path.join(__dirname, '..', 'public', 'manim-video');
fs.mkdirSync(VIDEO_DIR, { recursive: true });

// Same Python discovery strategy as ttsController, plus an explicit PYTHON_BIN
// override at the front (the absolute path below is machine-specific and will
// not exist on Render — PYTHON_BIN is how you point at the right interpreter).
const PY_CANDIDATES = [
  ...(process.env.PYTHON_BIN ? [{ cmd: process.env.PYTHON_BIN, args: [] }] : []),
  { cmd: 'py', args: ['-3.13'] },
  { cmd: 'python3', args: [] },
  { cmd: 'python', args: [] },
];

const ONE_HOUR = 3_600_000;
const WATCHDOG_MS = 120_000;   // force-fail a job that never finishes

// In-memory job registry. Per-process (matches the app's no-Mongo-required
// posture); a dyno restart drops in-flight jobs and the frontend tolerates 404.
const jobs = new Map();   // jobId -> { status, file, error, createdAt }

// ── Cleanup ─────────────────────────────────────────────────────────────────
// Delete rendered MP4s older than 1h, stale `manim-*` temp dirs, and evict old
// job entries. Fire-and-forget, never throws (mirrors ttsController.pruneOldFiles).
function pruneOldFiles() {
  const now = Date.now();
  try {
    for (const f of fs.readdirSync(VIDEO_DIR)) {
      if (!f.endsWith('.mp4')) continue;
      try {
        const stat = fs.statSync(path.join(VIDEO_DIR, f));
        if (now - stat.mtimeMs > ONE_HOUR) fs.unlinkSync(path.join(VIDEO_DIR, f));
      } catch (_) {}
    }
  } catch (_) {}

  try {
    const tmp = os.tmpdir();
    for (const d of fs.readdirSync(tmp)) {
      if (!d.startsWith('manim-')) continue;
      const full = path.join(tmp, d);
      try {
        const stat = fs.statSync(full);
        if (now - stat.mtimeMs > ONE_HOUR) fs.rmSync(full, { recursive: true, force: true });
      } catch (_) {}
    }
  } catch (_) {}

  for (const [id, job] of jobs) {
    if (now - job.createdAt > ONE_HOUR) jobs.delete(id);
  }
}

function spawnPython(scriptArgs) {
  for (const { cmd, args } of PY_CANDIDATES) {
    try {
      return spawn(cmd, [...args, ...scriptArgs]);
    } catch (_) {}
  }
  throw new Error('No usable Python interpreter found');
}

// ── Scene generation (OpenRouter) ───────────────────────────────────────────
function buildScenePrompt() {
  const mathRule = NO_LATEX
    ? 'Do NOT use MathTex or Tex (no LaTeX is installed). Render every formula with Text() or MarkupText() instead.'
    : 'You may use MathTex/Tex for formulas; keep them simple so they compile with a basic TeX install.';

  return `You write a SINGLE Manim Community (v0.18) Scene in Python that visually explains the user's topic.

Output ONLY raw Python source code. No markdown, no code fences, no prose, no explanation.

HARD RULES:
- The only import allowed is: from manim import *
- Define EXACTLY ONE class named GeneratedScene that subclasses Scene, with a construct(self) method.
- Total animation runtime must be <= 18 seconds.
- Allowed objects/animations only: Text, MarkupText, MathTex, Tex, Circle, Square, Rectangle, Line,
  Arrow, Dot, Axes, NumberPlane, NumberLine, VGroup, Create, Write, FadeIn, FadeOut, Transform,
  GrowFromCenter, self.play, self.wait.
- ${mathRule}
- FORBIDDEN: importing os, sys, subprocess, socket, requests, urllib, pathlib, shutil; the functions
  open, exec, eval, __import__, compile, input, globals, locals; any file or network access; any
  external image/SVG/asset loading; and unbounded loops such as 'while True'.
- Keep the scene self-contained and deterministic.`;
}

function stripFences(text) {
  return String(text || '')
    .replace(/```(?:python)?\s*/gi, '')
    .replace(/```/g, '')
    .trim();
}

// Cheap, high-value static guard run before we ever spawn the renderer.
const DENY_PATTERNS = [
  /\bimport\s+(os|sys|subprocess|socket|shutil|requests|urllib|pathlib)\b/,
  /\bfrom\s+(os|sys|subprocess|socket|shutil|requests|urllib|pathlib)\b/,
  /\b(open|exec|eval|__import__|compile|input|globals|locals)\s*\(/,
  /\bwhile\s+True\b/,
  /\bsystem\s*\(/,
  /`/,
];

function isSceneSafe(code) {
  if (!/class\s+GeneratedScene\s*\(\s*Scene\s*\)/.test(code)) return false;
  if (!/def\s+construct\s*\(/.test(code)) return false;
  return !DENY_PATTERNS.some((re) => re.test(code));
}

async function generateSceneCode(topic) {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: MODEL,
      messages: [
        { role: 'system', content: buildScenePrompt() },
        { role: 'user',   content: `Topic: ${topic}` },
      ],
      temperature: 0.6,
      max_tokens: 1800,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://fynmanai.onrender.com',
        'X-Title': 'FynmanAI Manim Sandbox',
      },
      timeout: 30000,
    }
  );
  return stripFences(response.data.choices?.[0]?.message?.content || '');
}

// ── Async render pipeline (not awaited by the request) ──────────────────────
async function runJob(jobId, topic) {
  const tmpDir = path.join(os.tmpdir(), `manim-${jobId}`);
  try {
    const code = await generateSceneCode(topic);
    if (!isSceneSafe(code)) {
      jobs.set(jobId, { ...jobs.get(jobId), status: 'error', error: 'Generated scene failed safety check' });
      return;
    }

    fs.mkdirSync(tmpDir, { recursive: true });
    const scenePath = path.join(tmpDir, 'scene.py');
    fs.writeFileSync(scenePath, code, 'utf8');

    const py = spawnPython([
      path.join(__dirname, '..', 'manim_worker.py'),
      scenePath,
      VIDEO_DIR,
      tmpDir,
    ]);

    let filename = '';
    let errOut   = '';
    const watchdog = setTimeout(() => { try { py.kill('SIGKILL'); } catch (_) {} }, WATCHDOG_MS);

    py.stdout.on('data', (d) => { filename += d.toString().trim(); });
    py.stderr.on('data', (d) => { errOut   += d.toString(); });

    py.on('error', (err) => {
      clearTimeout(watchdog);
      console.error('[Manim] spawn error:', err.message);
      jobs.set(jobId, { ...jobs.get(jobId), status: 'error', error: 'Failed to start Manim process' });
      cleanup(tmpDir);
    });

    py.on('close', (code) => {
      clearTimeout(watchdog);
      if (code !== 0 || !filename) {
        console.error('[Manim] worker exit', code, errOut.slice(-800));
        jobs.set(jobId, { ...jobs.get(jobId), status: 'error', error: errOut.slice(-500) || 'Render failed' });
      } else {
        jobs.set(jobId, { ...jobs.get(jobId), status: 'done', file: filename });
      }
      cleanup(tmpDir);
    });
  } catch (err) {
    console.error('[Manim] job error:', err?.response?.data?.error?.message || err.message);
    jobs.set(jobId, { ...jobs.get(jobId), status: 'error', error: 'Scene generation failed' });
    cleanup(tmpDir);
  }
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

// ── Handlers ────────────────────────────────────────────────────────────────
exports.renderManim = (req, res) => {
  if (!MANIM_ENABLED) {
    return res.status(503).json({ error: 'Manim sandbox is disabled' });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not set' });
  }

  const topic = (req.body?.topic || '').toString().trim().slice(0, 500);
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  pruneOldFiles();

  const jobId = crypto.randomUUID();
  jobs.set(jobId, { status: 'pending', file: null, error: null, createdAt: Date.now() });

  // Respond immediately; render happens in the background.
  res.status(202).json({ jobId, status: 'pending' });

  runJob(jobId, topic);
};

exports.manimStatus = (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'job not found' });
  res.json({
    status:   job.status,
    videoUrl: job.file ? `/api/manim-video/${job.file}` : undefined,
    error:    job.error || undefined,
  });
};

exports.MANIM_ENABLED = MANIM_ENABLED;
exports.VIDEO_DIR = VIDEO_DIR;
