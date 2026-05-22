const { spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');

const AUDIO_DIR = path.join(__dirname, '..', 'public', 'tts-audio');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Python 3.13 is the version that has gTTS installed on this machine.
// We try the py launcher first (works from any shell), then fall back to
// the absolute path so the Node child_process spawn always finds it.
const PY_CANDIDATES = [
  { cmd: 'py', args: ['-3.13'] },
  { cmd: 'C:\\Users\\Prantik sanki\\AppData\\Local\\Programs\\Python\\Python313\\python.exe', args: [] },
];

// Delete MP3 files older than 1 hour — fire-and-forget, never throws
function pruneOldFiles() {
  try {
    const now = Date.now();
    const files = fs.readdirSync(AUDIO_DIR);
    for (const f of files) {
      if (!f.endsWith('.mp3')) continue;
      try {
        const stat = fs.statSync(path.join(AUDIO_DIR, f));
        if (now - stat.mtimeMs > 3_600_000) fs.unlinkSync(path.join(AUDIO_DIR, f));
      } catch (_) {}
    }
  } catch (_) {}
}

function spawnPython(scriptArgs) {
  for (const { cmd, args } of PY_CANDIDATES) {
    try {
      const proc = spawn(cmd, [...args, ...scriptArgs]);
      return proc;
    } catch (_) {}
  }
  throw new Error('No usable Python 3.13 found');
}

exports.generateTts = (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

  // gTTS silently truncates at ~5000 chars; hard-cap here too
  const safe = text.trim().slice(0, 5000);

  pruneOldFiles();

  let py;
  try {
    py = spawnPython([
      path.join(__dirname, '..', 'tts_worker.py'),
      safe,
      AUDIO_DIR,
    ]);
  } catch (err) {
    console.error('[TTS] spawn error:', err.message);
    return res.status(500).json({ error: 'Failed to start TTS process' });
  }

  let filename = '';
  let errOut   = '';

  py.stdout.on('data', (d) => { filename += d.toString().trim(); });
  py.stderr.on('data', (d) => { errOut   += d.toString(); });

  py.on('close', (code) => {
    if (code !== 0 || !filename) {
      console.error('[TTS] Python exit', code, errOut);
      return res.status(500).json({ error: 'TTS generation failed', detail: errOut });
    }
    res.json({ audioUrl: `/tts-audio/${filename}` });
  });

  py.on('error', (err) => {
    console.error('[TTS] process error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to start TTS process' });
  });
};
