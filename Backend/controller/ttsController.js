const path = require('path');
const fs   = require('fs');
const axios = require('axios');

const AUDIO_DIR = path.join(__dirname, '..', 'public', 'tts-audio');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const OPENAI_TTS_MODEL = 'gpt-4o-mini-tts';
const OPENAI_TTS_VOICE = 'alloy';

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

exports.generateTts = async (req, res) => {
  const { text, voice } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) {
    console.error('[TTS] OPENAI_KEY is not set');
    return res.status(500).json({ error: 'TTS is not configured' });
  }

  // OpenAI TTS caps input at 4096 characters
  const safe = text.trim().slice(0, 4096);

  pruneOldFiles();

  try {
    const response = await axios.post(
      OPENAI_TTS_URL,
      {
        model: OPENAI_TTS_MODEL,
        input: safe,
        voice: voice || OPENAI_TTS_VOICE,
        response_format: 'mp3',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
    fs.writeFileSync(path.join(AUDIO_DIR, filename), response.data);

    res.json({ audioUrl: `/tts-audio/${filename}` });
  } catch (err) {
    const detail = err.response?.data
      ? Buffer.from(err.response.data).toString('utf8')
      : err.message;
    console.error('[TTS] OpenAI request failed:', detail);
    res.status(500).json({ error: 'TTS generation failed', detail });
  }
};
