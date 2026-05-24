// Web Speech API TTS engine — singleton, event-driven
// Gracefully degrades when Web Speech API is unavailable (some browsers/contexts)
class VoiceEngine {
  constructor() {
    this.synth = (typeof window !== 'undefined' && window.speechSynthesis) || null;
    this.voice = null;
    this.rate = 0.95;
    this.pitch = 1.0;
    this.volume = 1.0;
    this._ready = false;
    this._queue = [];
    if (this.synth) this._init();
  }

  _init() {
    const load = () => {
      const voices = this.synth.getVoices();
      // Prefer a natural English voice
      this.voice =
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices[0] || null;
      this._ready = true;
    };

    try {
      if (this.synth.getVoices().length > 0) {
        load();
      } else {
        this.synth.addEventListener('voiceschanged', load, { once: true });
      }
    } catch (e) {
      // Speech API unavailable — voice narration silently disabled
    }
  }

  speak(text, onEnd) {
    if (!text || !this.synth) { onEnd?.(); return; }
    try {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) utterance.voice = this.voice;
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;
      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
      this.synth.speak(utterance);
    } catch (e) {
      onEnd?.();
    }
  }

  stop() {
    try { this.synth?.cancel(); } catch (e) { /* ignore */ }
  }

  setRate(r) { this.rate = r; }
  setVolume(v) { this.volume = v; }
}

export const voiceEngine = new VoiceEngine();
