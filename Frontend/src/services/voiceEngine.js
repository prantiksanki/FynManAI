// OpenAI TTS engine — singleton, event-driven
// Fetches narration audio from the backend (/api/tts) and plays it via <audio>.
import { generateTtsApi, resolveTtsUrl } from './canvasApi';

class VoiceEngine {
  constructor() {
    this.audio = (typeof window !== 'undefined') ? new Audio() : null;
    this.volume = 1.0;
    this._token = 0; // guards against a stale fetch resolving after a newer speak()/stop()

    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  async speak(text, onEnd) {
    if (!text || !this.audio) { onEnd?.(); return; }

    const myToken = ++this._token;
    this._stopPlayback();

    try {
      const { audioUrl } = await generateTtsApi(text);
      if (myToken !== this._token) { onEnd?.(); return; } // superseded by a newer call

      this.audio.src = resolveTtsUrl(audioUrl);
      this.audio.volume = this.volume;
      this.audio.onended = () => onEnd?.();
      this.audio.onerror = () => onEnd?.();
      await this.audio.play();
    } catch (e) {
      if (myToken === this._token) onEnd?.();
    }
  }

  _stopPlayback() {
    try {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch (e) { /* ignore */ }
  }

  stop() {
    this._token++; // invalidate any in-flight fetch
    if (!this.audio) return;
    this._stopPlayback();
  }

  setRate() { /* no-op: OpenAI TTS speed is fixed server-side */ }
  setVolume(v) {
    this.volume = v;
    if (this.audio) this.audio.volume = v;
  }
}

export const voiceEngine = new VoiceEngine();
