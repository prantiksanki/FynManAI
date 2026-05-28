import { Component } from 'react';

export class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[FynmanAI] Canvas crash caught by ErrorBoundary:', error, info?.componentStack);
  }

  handleReload() {
    window.location.reload();
  }

  handleReset() {
    // Clear tldraw's IndexedDB so a fresh load doesn't re-crash on corrupted state
    if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
      indexedDB.databases().then(dbs => {
        dbs.forEach(db => {
          if (db.name && (
            db.name.startsWith('TLDRAW_DOCUMENT_') ||
            db.name.startsWith('TLDRAW_ASSET_STORE_') ||
            db.name.startsWith('TLDRAW_DB_NAME_INDEX_')
          )) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      }).catch(() => {}).finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = this.state.error?.message || 'Unknown error';

    return (
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0d18',
        zIndex: 9999,
        fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
      }}>
        <div style={{
          background: '#12172a',
          border: '1px solid #2a3045',
          borderTop: '3px solid #7c6af7',
          borderRadius: 16,
          padding: '32px 36px',
          maxWidth: 440,
          width: '90%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}>
          {/* Icon */}
          <div style={{ fontSize: 36, marginBottom: 16, textAlign: 'center' }}>⚡</div>

          {/* Title */}
          <div style={{
            fontSize: 18, fontWeight: 800, color: '#e8eaf0',
            textAlign: 'center', marginBottom: 8,
            fontFamily: "'Syne', 'Inter', system-ui, sans-serif",
          }}>
            Canvas encountered an error
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: 13, color: '#7888a8', textAlign: 'center',
            lineHeight: 1.6, marginBottom: 24,
          }}>
            A rendering error occurred in the canvas. Your session data is safe —
            refreshing will restore everything.
          </div>

          {/* Error detail (collapsible-style, always shown small) */}
          <div style={{
            background: '#0a0d18', border: '1px solid #2a3045',
            borderRadius: 8, padding: '8px 12px',
            fontSize: 11, color: '#4a5570',
            fontFamily: "'JetBrains Mono', 'Consolas', monospace",
            marginBottom: 24,
            wordBreak: 'break-word',
            maxHeight: 64, overflow: 'hidden',
          }}>
            {msg}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => this.handleReset()}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#7888a8', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear &amp; Reload
            </button>
            <button
              onClick={() => this.handleReload()}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10,
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c6af7 50%, #4f8aff 100%)',
                border: 'none',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(124,106,247,0.4)',
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
