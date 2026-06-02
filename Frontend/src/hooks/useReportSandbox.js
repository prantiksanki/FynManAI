import { useRef, useState, useCallback, useEffect } from 'react';
import { renderReport, getReportStatus, BASE } from '../services/canvasApi';

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS        = 48;   // ~120s ceiling

// Kicks off a PDF report job in parallel with the canvas, polls the backend, and
// reports back via callbacks so the caller can surface a download link in chat.
export function useReportSandbox() {
  const timerRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('idle');

  const stop = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setIsGenerating(false);
  }, []);

  // start(query, { onStart, onReady(absoluteUrl), onError })
  const start = useCallback(async (query, { onStart, onReady, onError } = {}) => {
    let jobId;
    try {
      const res = await renderReport(query);
      jobId = res?.jobId;
    } catch (err) {
      // Feature disabled (503) or backend unreachable — silently skip.
      console.warn('[Report] request failed:', err?.message);
      return;
    }
    if (!jobId) return;

    setIsGenerating(true);
    setStatus('pending');
    onStart?.();

    let polls = 0;
    const poll = async () => {
      polls += 1;
      let data;
      try {
        data = await getReportStatus(jobId);
      } catch (err) {
        setStatus('error'); stop(); onError?.();
        return;
      }

      if (data.status === 'done' && data.fileUrl) {
        setStatus('done'); stop();
        onReady?.(`${BASE}${data.fileUrl}`);
        return;
      }

      if (data.status === 'error' || polls >= MAX_POLLS) {
        setStatus('error'); stop(); onError?.();
        return;
      }

      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { start, stop, isGenerating, status };
}
