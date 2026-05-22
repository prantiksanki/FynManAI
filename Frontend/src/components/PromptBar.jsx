import { useState, useRef, useEffect } from 'react';

const EXAMPLES = [
  'Tell me about Pythagoras',
  'Explain how Kubernetes works',
  'Plan a startup for sustainable fashion',
  'I feel overwhelmed today',
  'Tell me a bedtime story',
  'How does a neural network learn?',
  'Design a REST API for a todo app',
];

export function PromptBar({ onSubmit, loading, disabled }) {
  const [value, setValue] = useState('');
  const [placeholder, setPlaceholder] = useState(EXAMPLES[0]);
  const inputRef = useRef(null);
  const cycleRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      cycleRef.current = (cycleRef.current + 1) % EXAMPLES.length;
      setPlaceholder(EXAMPLES[cycleRef.current]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading || disabled) return;
    onSubmit(trimmed);
    setValue('');
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
  }

  return (
    <form className="prompt-bar" onSubmit={handleSubmit}>
      <div className="prompt-input-wrap">
        <span className="prompt-icon">✦</span>
        <input
          ref={inputRef}
          className="prompt-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={loading || disabled}
          autoFocus
          autoComplete="off"
          spellCheck="false"
        />
        <button
          className={`prompt-btn ${loading ? 'loading' : ''}`}
          type="submit"
          disabled={loading || disabled || !value.trim()}
        >
          {loading ? <span className="spinner" /> : '→'}
        </button>
      </div>
    </form>
  );
}
