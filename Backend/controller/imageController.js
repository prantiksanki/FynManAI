const axios = require('axios');

async function fetchImage(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query is required' });

  // Read keys at request time so dotenv has already loaded them
  const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
  const PEXELS_KEY = process.env.PEXELS_API_KEY;

  // 1. Unsplash
  if (UNSPLASH_KEY && UNSPLASH_KEY !== 'your_unsplash_access_key_here') {
    try {
      const r = await axios.get('https://api.unsplash.com/search/photos', {
        params: { query, per_page: 1, orientation: 'landscape' },
        headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
        timeout: 8000,
      });
      const photo = r.data.results?.[0];
      if (photo) {
        return res.json({
          url: photo.urls.regular,
          alt: photo.alt_description || query,
          source: 'unsplash',
          credit: photo.user.name,
        });
      }
    } catch (e) { console.warn('[Unsplash]', e.message); }
  }

  // 2. Pexels
  if (PEXELS_KEY && PEXELS_KEY !== 'your_pexels_api_key_here') {
    try {
      const r = await axios.get('https://api.pexels.com/v1/search', {
        params: { query, per_page: 1, orientation: 'landscape' },
        headers: { Authorization: PEXELS_KEY },
        timeout: 8000,
      });
      const photo = r.data.photos?.[0];
      if (photo) {
        return res.json({
          url: photo.src.large,
          alt: photo.alt || query,
          source: 'pexels',
          credit: photo.photographer,
        });
      }
    } catch (e) { console.warn('[Pexels]', e.message); }
  }

  // 3. Wikipedia thumbnail — free, relevant, no key needed
  try {
    const term = query.split(' ').slice(0, 5).join(' ');
    const r = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        titles: term,
        prop: 'pageimages',
        format: 'json',
        pithumbsize: 640,
        origin: '*',
      },
      timeout: 6000,
    });
    const pages = r.data.query?.pages || {};
    const page = Object.values(pages)[0];
    if (page?.thumbnail?.source) {
      return res.json({
        url: page.thumbnail.source,
        alt: query,
        source: 'wikipedia',
      });
    }
  } catch (e) { console.warn('[Wikipedia]', e.message); }

  // 4. No image found — frontend will skip insertImage action
  return res.json({ url: null, alt: query, source: 'none' });
}

module.exports = { fetchImage };
