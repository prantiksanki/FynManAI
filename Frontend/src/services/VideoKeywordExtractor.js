// Maps intent to supplementary keyword hints appended when the AI query is short (< 3 words)
const INTENT_HINTS = {
  emotional: 'calm nature serene',
  story:     'cinematic scene',
  travel:    'landmark aerial cityscape',
};

/**
 * Enhances a video search query for better stock video results.
 *
 * @param {string} rawQuery  - The `query` field from an insertVideo action (AI-generated)
 * @param {string} intent    - The detected intent: 'story'|'emotional'|'travel'|'general'|etc.
 * @returns {string}         - An enhanced query string safe to pass to the video API
 */
export function enhanceVideoQuery(rawQuery = '', intent = 'general') {
  const q = rawQuery.trim();
  if (!q) return INTENT_HINTS[intent] || 'nature landscape';

  // If already descriptive (3+ words), use as-is
  if (q.split(/\s+/).length >= 3) return q;

  // Append intent-specific hint to short queries
  const hint = INTENT_HINTS[intent];
  return hint ? `${q} ${hint}` : q;
}
