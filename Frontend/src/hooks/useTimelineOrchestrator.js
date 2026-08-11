import { useRef, useState, useCallback } from 'react';
import { buildTimeline, executeAction } from '../engine/actionRunner';
import { voiceEngine } from '../services/voiceEngine';

export function useTimelineOrchestrator(editorRef, onVoice) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const timersRef = useRef([]);
  const abortRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    abortRef.current = true;
  }, []);

  const runTimeline = useCallback((actions) => {
    clearTimers();
    abortRef.current = false;
    setIsPlaying(true);

    const timeline = buildTimeline(actions);
    // Client-side safety net: de-dup identical timestamps by nudging 100ms each
    const used = {};
    timeline.forEach(a => {
      while (used[a._ms]) a._ms += 100;
      used[a._ms] = true;
    });
    setProgress({ current: 0, total: timeline.length });

    // Kick off TTS fetches for every narration line now, in parallel, so each
    // one is normally already downloaded by the time its setTimeout fires.
    timeline.forEach(a => {
      if (a.action === 'voice' && a.content) voiceEngine.prefetch(a.content);
    });

    // Return a real Promise that resolves only when the last action fires,
    // so callers can properly `await runTimeline(...)` in sequence.
    return new Promise((resolve) => {
      if (!timeline.length) {
        setIsPlaying(false);
        resolve();
        return;
      }

      timeline.forEach((action, idx) => {
        const timer = setTimeout(async () => {
          // On abort, still resolve so the awaiting caller isn't left hanging
          if (abortRef.current) {
            if (idx === timeline.length - 1) resolve();
            return;
          }

          const editor = editorRef.current;
          if (editor) {
            try {
              await executeAction(editor, action, onVoice);
            } catch (err) {
              console.error('[Timeline] Action failed:', action.action, err);
            }
          }

          setProgress(p => ({ ...p, current: idx + 1 }));

          if (idx === timeline.length - 1) {
            setIsPlaying(false);
            resolve();
          }
        }, action._ms);

        timersRef.current.push(timer);
      });
    });
  }, [editorRef, onVoice, clearTimers]);

  const stop = useCallback(() => {
    clearTimers();
    setIsPlaying(false);
    setProgress({ current: 0, total: 0 });
  }, [clearTimers]);

  return { runTimeline, stop, isPlaying, progress };
}
