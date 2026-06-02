import { useRef, useState, useCallback, useEffect } from 'react';
import { renderManim, getManimStatus, BASE } from '../services/canvasApi';
import { executeAction } from '../engine/actionRunner';

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS        = 60;   // ~150s ceiling

// Kicks off a Manim render in parallel with the canvas timeline, drops a
// "rendering…" placeholder onto the canvas, polls the backend job, then swaps
// the placeholder for the finished video (or removes it on failure).
export function useManimSandbox() {
  const timerRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);
  const [status, setStatus] = useState('idle');

  const stop = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setIsRendering(false);
  }, []);

  const start = useCallback(async (topic, { editorRef, slot }) => {
    const editor = editorRef?.current;
    if (!editor) return;

    let jobId;
    try {
      const res = await renderManim(topic);
      jobId = res?.jobId;
    } catch (err) {
      // Feature disabled (503) or backend unreachable — silently skip; the rest
      // of the canvas is unaffected.
      console.warn('[Manim] render request failed:', err?.message);
      return;
    }
    if (!jobId) return;

    setIsRendering(true);
    setStatus('pending');

    await executeAction(editor, {
      action:   'manimPlaceholder',
      jobId,
      label:    topic,
      position: slot.pos,
      size:     slot.size,
    });

    let polls = 0;
    const poll = async () => {
      polls += 1;
      let data;
      try {
        data = await getManimStatus(jobId);
      } catch (err) {
        // 404 (job evicted / process restarted) or network — give up cleanly.
        await executeAction(editor, { action: 'manimError', jobId });
        setStatus('error');
        stop();
        return;
      }

      if (data.status === 'done' && data.videoUrl) {
        await executeAction(editor, {
          action:   'manimVideo',
          jobId,
          url:      `${BASE}${data.videoUrl}`,
          position: slot.pos,
          size:     slot.size,
        });
        setStatus('done');
        stop();
        return;
      }

      if (data.status === 'error' || polls >= MAX_POLLS) {
        await executeAction(editor, { action: 'manimError', jobId });
        setStatus('error');
        stop();
        return;
      }

      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { start, stop, isRendering, status };
}
