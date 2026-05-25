import { fetchVideoUrl } from './canvasApi';

const cache = new Map();

export async function getVideo(query) {
  const key = query.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key);

  try {
    const result = await fetchVideoUrl(query);
    // Cache even null-url results so we don't re-fetch
    cache.set(key, result);
    return result;
  } catch {
    // Network error — return null url so runner skips the video
    return { url: null, thumbnail: null, duration: 0, title: query, source: 'error' };
  }
}
