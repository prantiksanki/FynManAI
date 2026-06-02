const { spawn } = require('child_process');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const crypto = require('crypto');
const axios  = require('axios');

// ── Config ────────────────────────────────────────────────────────────────────
// On by default (ReportLab is pure-Python, installable via pip with no native
// deps). Set REPORT_ENABLED=false to disable the endpoints entirely.
const REPORT_ENABLED = String(process.env.REPORT_ENABLED || '').toLowerCase() !== 'false';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL          = 'anthropic/claude-haiku-4-5';

const REPORT_DIR = path.join(__dirname, '..', 'public', 'report-file');
fs.mkdirSync(REPORT_DIR, { recursive: true });

// Same Python discovery strategy as ttsController/manimController.
const PY_CANDIDATES = [
  ...(process.env.PYTHON_BIN ? [{ cmd: process.env.PYTHON_BIN, args: [] }] : []),
  { cmd: 'py', args: ['-3.13'] },
  { cmd: 'python3', args: [] },
  { cmd: 'python', args: [] },
];

const ONE_HOUR    = 3_600_000;
const WATCHDOG_MS = 90_000;

// In-memory job registry (per-process; dyno restarts drop in-flight jobs).
const jobs = new Map();   // jobId -> { status, file, error, createdAt }

// ── Cleanup ─────────────────────────────────────────────────────────────────
function pruneOldFiles() {
  const now = Date.now();
  try {
    for (const f of fs.readdirSync(REPORT_DIR)) {
      if (!f.endsWith('.pdf')) continue;
      try {
        const stat = fs.statSync(path.join(REPORT_DIR, f));
        if (now - stat.mtimeMs > ONE_HOUR) fs.unlinkSync(path.join(REPORT_DIR, f));
      } catch (_) {}
    }
  } catch (_) {}

  try {
    const tmp = os.tmpdir();
    for (const d of fs.readdirSync(tmp)) {
      if (!d.startsWith('report-')) continue;
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

// ── Report spec generation (OpenRouter) ──────────────────────────────────────
function buildReportPrompt() {
  return `You are a report writer. Given the user's query, produce a thorough, well-structured PDF report as JSON.

Output ONLY raw JSON — no markdown, no code fences, no prose. Use this exact shape:
{
  "title": "Report Title",
  "subtitle": "one-line summary",
  "stats": [ { "label": "Metric", "value": "42%", "sub": "context" } ],   // 0-4 items, optional
  "sections": [
    {
      "heading": "Section Heading",
      "body": "1-3 paragraph explanation. Use plain text.",
      "bullets": ["key point", "key point"],          // optional
      "table": { "headers": ["Col A","Col B"], "rows": [["v1","v2"],["v3","v4"]] }  // optional
    }
  ]
}

RULES:
- 4-7 sections. Be substantive and accurate.
- Use a table where tabular data helps; use bullets for lists; otherwise use body paragraphs.
- Keep text plain (no HTML/markdown). Respond in the same language as the user's query.`;
}

function extractJSON(text) {
  const stripped = String(text || '').replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

async function generateReportSpec(query) {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: MODEL,
      messages: [
        { role: 'system', content: buildReportPrompt() },
        { role: 'user',   content: query },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://fynmanai.onrender.com',
        'X-Title': 'FynmanAI Report Sandbox',
      },
      timeout: 45000,
    }
  );
  const raw = extractJSON(response.data.choices?.[0]?.message?.content || '');
  if (!raw) throw new Error('Failed to parse report JSON');
  return JSON.parse(raw);
}

// ── Async render pipeline (not awaited by the request) ──────────────────────
async function runJob(jobId, query) {
  const tmpDir = path.join(os.tmpdir(), `report-${jobId}`);
  try {
    const spec = await generateReportSpec(query);

    fs.mkdirSync(tmpDir, { recursive: true });
    const specPath = path.join(tmpDir, 'spec.json');
    fs.writeFileSync(specPath, JSON.stringify(spec), 'utf8');

    const py = spawnPython([
      path.join(__dirname, '..', 'report_worker.py'),
      specPath,
      REPORT_DIR,
    ]);

    let filename = '';
    let errOut   = '';
    const watchdog = setTimeout(() => { try { py.kill('SIGKILL'); } catch (_) {} }, WATCHDOG_MS);

    py.stdout.on('data', (d) => { filename += d.toString().trim(); });
    py.stderr.on('data', (d) => { errOut   += d.toString(); });

    py.on('error', (err) => {
      clearTimeout(watchdog);
      console.error('[Report] spawn error:', err.message);
      jobs.set(jobId, { ...jobs.get(jobId), status: 'error', error: 'Failed to start report process' });
      cleanup(tmpDir);
    });

    py.on('close', (code) => {
      clearTimeout(watchdog);
      if (code !== 0 || !filename) {
        console.error('[Report] worker exit', code, errOut.slice(-800));
        jobs.set(jobId, { ...jobs.get(jobId), status: 'error', error: errOut.slice(-500) || 'Render failed' });
      } else {
        jobs.set(jobId, { ...jobs.get(jobId), status: 'done', file: filename });
      }
      cleanup(tmpDir);
    });
  } catch (err) {
    console.error('[Report] job error:', err?.response?.data?.error?.message || err.message);
    jobs.set(jobId, { ...jobs.get(jobId), status: 'error', error: 'Report generation failed' });
    cleanup(tmpDir);
  }
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

// ── Handlers ────────────────────────────────────────────────────────────────
exports.renderReport = (req, res) => {
  if (!REPORT_ENABLED) {
    return res.status(503).json({ error: 'Report sandbox is disabled' });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not set' });
  }

  const query = (req.body?.query || req.body?.topic || '').toString().trim().slice(0, 2000);
  if (!query) return res.status(400).json({ error: 'query is required' });

  pruneOldFiles();

  const jobId = crypto.randomUUID();
  jobs.set(jobId, { status: 'pending', file: null, error: null, createdAt: Date.now() });

  // Respond immediately; render happens in the background.
  res.status(202).json({ jobId, status: 'pending' });

  runJob(jobId, query);
};

exports.reportStatus = (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'job not found' });
  res.json({
    status:  job.status,
    fileUrl: job.file ? `/api/report-file/${job.file}` : undefined,
    error:   job.error || undefined,
  });
};

exports.REPORT_ENABLED = REPORT_ENABLED;
