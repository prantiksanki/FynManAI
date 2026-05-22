import { fetchImageUrl } from './canvasApi';

const cache = new Map();

export async function getImage(query) {
  const key = query.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key);

  try {
    const result = await fetchImageUrl(query);
    // Cache even null-url results so we don't re-fetch
    cache.set(key, result);
    return result;
  } catch {
    // Network error — return null url so runner skips the image
    return { url: null, alt: query, source: 'error' };
  }
}
