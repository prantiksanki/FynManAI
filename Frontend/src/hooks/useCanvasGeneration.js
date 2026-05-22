import { useState, useCallback } from 'react';
import { generateTimeline } from '../services/canvasApi';

export function useCanvasGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const generate = useCallback(async (prompt, conversationHistory = []) => {
    if (!prompt?.trim()) return null;
    setLoading(true);
    setError(null);

    try {
      const result = await generateTimeline(prompt.trim(), conversationHistory);
      setLastResult(result);
      return result;
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Generation failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error, lastResult };
}
