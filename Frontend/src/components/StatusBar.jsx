export function StatusBar({ isPlaying, progress, intent, title, error, currentVoice }) {
  if (error) {
    return (
      <div className="status-bar status-error">
        <span className="status-icon">⚠</span>
        <span className="status-text">{error}</span>
      </div>
    );
  }

  if (isPlaying) {
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    return (
      <div className="status-bar status-playing">
        <div className="status-progress-track">
          <div className="status-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="status-info">
          <span className="status-badge">{Array.isArray(intent) ? intent.join(' · ') : intent}</span>
          {currentVoice && <span className="status-voice">🔊 {currentVoice}</span>}
          <span className="status-count">{progress.current}/{progress.total}</span>
        </div>
      </div>
    );
  }

  if (title) {
    return (
      <div className="status-bar status-done">
        <span className="status-icon">✓</span>
        <span className="status-text">{title}</span>
        <span className="status-badge">{Array.isArray(intent) ? intent.join(' · ') : intent}</span>
      </div>
    );
  }

  return (
    <div className="status-bar status-idle">
      <span className="status-text">Type anything — the canvas responds</span>
    </div>
  );
}
