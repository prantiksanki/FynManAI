const axios = require('axios');

async function fetchVideo(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query is required' });

  const PEXELS_KEY  = process.env.PEXELS_API_KEY;
  const PIXABAY_KEY = process.env.PIXABAY_API_KEY;

  // ── 1. Pexels Video API ───────────────────────────────────────────────────────
  if (PEXELS_KEY && PEXELS_KEY !== 'your_pexels_api_key_here') {
    try {
      const r = await axios.get('https://api.pexels.com/videos/search', {
        params: { query, per_page: 5, orientation: 'landscape' },
        headers: { Authorization: PEXELS_KEY },
        timeout: 8000,
      });
      const best = pickBestPexelsVideo(r.data.videos || [], query);
      if (best) return res.json(best);
    } catch (e) { console.warn('[PexelsVideo]', e.message); }
  }

  // ── 2. Pixabay Video API ──────────────────────────────────────────────────────
  if (PIXABAY_KEY) {
    try {
      const r = await axios.get('https://pixabay.com/api/videos/', {
        params: {
          key:         PIXABAY_KEY,
          q:           query,
          video_type:  'film',
          orientation: 'horizontal',
          per_page:    5,
        },
        timeout: 8000,
      });
      const best = pickBestPixabayVideo(r.data.hits || []);
      if (best) return res.json(best);
    } catch (e) { console.warn('[PixabayVideo]', e.message); }
  }

  // ── 3. No video found — frontend will skip insertVideo action ─────────────────
  return res.json({ url: null, thumbnail: null, duration: 0, title: query, source: 'none' });
}

// ── Pexels: pick landscape MP4 with highest resolution ───────────────────────
function pickBestPexelsVideo(videos, query) {
  for (const video of videos) {
    if (!video.video_files?.length) continue;

    // Keep only landscape MP4s, sorted by width ascending
    const files = video.video_files
      .filter(f => f.file_type === 'video/mp4' && f.width >= f.height)
      .sort((a, b) => a.width - b.width);

    if (!files.length) continue;

    // Target 640px wide — smallest that still looks sharp on the 320px canvas card.
    // Falls back to next size up if 640 isn't available.
    // Never picks anything over 960px so 3 parallel videos never stall.
    const MAX_WIDTH = 960;
    const TARGET    = 640;

    const candidates = files.filter(f => f.width <= MAX_WIDTH);
    // Pick the one closest to TARGET from below (prefer equal-or-larger than target)
    const file = candidates.find(f => f.width >= TARGET)   // first >= 640 within cap
               || candidates[candidates.length - 1]         // largest under cap
               || files[0];                                 // absolute fallback (smallest)

    if (!file?.link) continue;

    return {
      url:       file.link,
      thumbnail: video.image,
      duration:  video.duration || 0,
      title:     video.user?.name ? `${video.user.name} — ${query}` : query,
      width:     file.width,
      height:    file.height,
      source:    'pexels',
    };
  }
  return null;
}

// ── Pixabay: prefer small (640p) > medium for low-buffering parallel playback ──
function pickBestPixabayVideo(hits) {
  for (const hit of hits) {
    const vids = hit.videos || {};
    // Prefer small (≈640px) → medium → large  (reverse of original priority)
    const file = vids.small?.url  ? vids.small
               : vids.medium?.url ? vids.medium
               : vids.large?.url  ? vids.large
               : null;
    if (!file?.url) continue;
    return {
      url:       file.url,
      thumbnail: hit.picture_id
        ? `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`
        : null,
      duration:  hit.duration || 0,
      title:     hit.tags?.split(',')[0]?.trim() || 'video',
      width:     file.width  || 1280,
      height:    file.height || 720,
      source:    'pixabay',
    };
  }
  return null;
}

module.exports = { fetchVideo };
