import { useRef, useCallback } from 'react';

const SESSION_HEIGHT = 820;   // vertical space reserved per session
const SESSION_GAP    = 60;    // gap + divider between sessions
const DIVIDER_HEIGHT = 40;    // height of the divider label

export function useCanvasOffset() {
  const sessionCountRef = useRef(0);

  // Returns the current Y offset for the next session
  const getCurrentOffset = useCallback(() => {
    return sessionCountRef.current * (SESSION_HEIGHT + SESSION_GAP);
  }, []);

  // Call this BEFORE running a new timeline to get the offset and advance the counter
  const nextSession = useCallback(() => {
    const offset = sessionCountRef.current * (SESSION_HEIGHT + SESSION_GAP);
    sessionCountRef.current += 1;
    return offset;
  }, []);

  const reset = useCallback(() => {
    sessionCountRef.current = 0;
  }, []);

  return { nextSession, getCurrentOffset, reset, DIVIDER_HEIGHT, SESSION_GAP };
}

// Apply Y offset to all positioned actions in a timeline
export function offsetTimeline(timeline, yOffset) {
  if (yOffset === 0) return timeline;

  return timeline.map(action => {
    const a = { ...action };

    if (a.position) a.position = { ...a.position, y: a.position.y + yOffset };
    if (a.from)     a.from     = { ...a.from,     y: a.from.y     + yOffset };
    if (a.to)       a.to       = { ...a.to,       y: a.to.y       + yOffset };

    // For createNodeGraph / createTimeline, position is already covered above
    return a;
  });
}
