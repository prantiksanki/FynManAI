// OpenAI TTS engine — singleton, event-driven
// Fetches narration audio from the backend (/api/tts) and plays it via <audio>.
//
// Timeline actions (incl. 'voice') fire on independent setTimeouts scheduled by
// the LLM's script, not sequential awaits. Network TTS can't start as instantly
// as the old local Web Speech API, so callers should prefetch() each line's
// audio as soon as the full timeline is known — by the time a voice action's
// timer actually fires, its clip is normally already downloaded and speak()
// just plays it, keeping narration in sync with the visuals instead of
// queuing up and drifting further behind with every line.
import { generateTtsApi, resolveTtsUrl } from './canvasApi';

class VoiceEngine {
  constructor() {
    this.audio = (typeof window !== 'undefined') ? new Audio() : null;
    this.volume = 1.0;
    this._cache = new Map(); // text -> Promise<audioUrl>
    this._gen = 0; // bumped by stop() so stale playback from before a stop is ignored
    this._unlocked = false; // browsers block audio.play() until a user gesture "unlocks" the element

    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  // Call this synchronously inside a real user-gesture handler (e.g. the
  // click/submit that kicks off generation) BEFORE any await. Browsers only
  // allow the first audio.play() to succeed if it happens inside the
  // gesture's own call stack; every later play() (after network awaits)
  // rides on this unlock instead of needing its own gesture.
  unlock() {
    if (!this.audio || this._unlocked) return;
    const p = this.audio.play();
    if (p?.catch) p.catch(() => {});
    this.audio.pause();
    this.audio.currentTime = 0;
    this._unlocked = true;
  }

  // Kick off the TTS fetch early without playing it. Safe to call repeatedly
  // for the same text — the in-flight/resolved promise is reused.
  prefetch(text) {
    if (!text || this._cache.has(text)) return;
    this._cache.set(text, generateTtsApi(text).then(r => r.audioUrl).catch(e => {
      console.error('[voiceEngine] prefetch failed:', e.message);
      this._cache.delete(text); // let a later speak() retry instead of replaying the same failure
      throw e;
    }));
  }

  async speak(text, onEnd) {
    if (!text || !this.audio) { onEnd?.(); return; }

    const myGen = this._gen;
    this.prefetch(text); // no-op if already prefetched

    try {
      const audioUrl = await this._cache.get(text);
      if (myGen !== this._gen) { onEnd?.(); return; } // superseded by a stop()

      this.audio.src = resolveTtsUrl(audioUrl);
      this.audio.volume = this.volume;
      this.audio.onended = () => onEnd?.();
      this.audio.onerror = () => onEnd?.();
      await this.audio.play();
    } catch (e) {
      console.error('[voiceEngine] playback failed:', e.name, e.message);
      if (myGen === this._gen) onEnd?.();
    }
  }

  stop() {
    this._gen++;
    if (this.audio) {
      try {
        this.audio.onended = null;
        this.audio.onerror = null;
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch (e) { /* ignore */ }
    }
  }

  clearCache() {
    this._cache.clear();
  }

  setRate() { /* no-op: OpenAI TTS speed is fixed server-side */ }
  setVolume(v) {
    this.volume = v;
    if (this.audio) this.audio.volume = v;
  }
}

export const voiceEngine = new VoiceEngine();
