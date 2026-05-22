import { useRef, useState, useCallback, useEffect } from 'react';

export function useVoiceInput({ onTranscript, lang = 'en-US' } = {}) {
  const recognitionRef = useRef(null);
  const [listening, setListening]   = useState(false);
  const [supported, setSupported]   = useState(false);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);

    const rec = new SR();
    rec.continuous      = false;
    rec.interimResults  = false;
    rec.lang            = lang;

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ')
        .trim();
      if (transcript) onTranscriptRef.current?.(transcript);
    };

    rec.onend  = () => setListening(false);
    rec.onerror = () => setListening(false);

    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch (_) {} };
  }, [lang]);

  const toggle = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try { rec.start(); setListening(true); } catch (_) {}
    }
  }, [listening]);

  return { listening, supported, toggle };
}
