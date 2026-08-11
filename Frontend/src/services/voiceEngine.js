// OpenAI TTS engine — singleton, event-driven
// Fetches narration audio from the backend (/api/tts) and plays it via <audio>.
// Requests are queued and played strictly one at a time: timeline actions fire
// on independent setTimeouts, so multiple speak() calls can land while a prior
// fetch/playback is still in flight — cutting one off would silently drop it.
import { generateTtsApi, resolveTtsUrl } from './canvasApi';

class VoiceEngine {
  constructor() {
    this.audio = (typeof window !== 'undefined') ? new Audio() : null;
    this.volume = 1.0;
    this._queue = [];
    this._playing = false;
    this._gen = 0; // bumped by stop() so in-flight items from before the stop are skipped

    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  speak(text, onEnd) {
    if (!text || !this.audio) { onEnd?.(); return; }
    this._queue.push({ text, onEnd, gen: this._gen });
    if (!this._playing) this._drainQueue();
  }

  async _drainQueue() {
    this._playing = true;
    while (this._queue.length) {
      const { text, onEnd, gen } = this._queue.shift();
      if (gen !== this._gen) { onEnd?.(); continue; } // dropped by an intervening stop()
      await this._playOne(text, onEnd, gen);
    }
    this._playing = false;
  }

  _playOne(text, onEnd, gen) {
    return new Promise(async (resolve) => {
      const finish = () => { onEnd?.(); resolve(); };
      try {
        const { audioUrl } = await generateTtsApi(text);
        if (gen !== this._gen) { finish(); return; }

        this.audio.src = resolveTtsUrl(audioUrl);
        this.audio.volume = this.volume;
        this.audio.onended = finish;
        this.audio.onerror = finish;
        await this.audio.play();
      } catch (e) {
        finish();
      }
    });
  }

  stop() {
    this._gen++;
    this._queue = [];
    if (this.audio) {
      try {
        this.audio.onended = null;
        this.audio.onerror = null;
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch (e) { /* ignore */ }
    }
  }

  setRate() { /* no-op: OpenAI TTS speed is fixed server-side */ }
  setVolume(v) {
    this.volume = v;
    if (this.audio) this.audio.volume = v;
  }
}

export const voiceEngine = new VoiceEngine();
