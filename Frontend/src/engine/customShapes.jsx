import { BaseBoxShapeUtil, HTMLContainer, T } from 'tldraw';
import { useState, useRef, useEffect } from 'react';

// ─── Typography ──────────────────────────────────────────────────────────────
const FONT_DISPLAY = "'Syne', 'Inter', system-ui, sans-serif";
const FONT_BODY    = "'DM Sans', 'Inter', system-ui, sans-serif";

// ─── Dark theme palette ───────────────────────────────────────────────────────
const C_BG_CARD    = '#12172a';
const C_BG_CARD2   = '#0c1020';
const C_BG_CODE    = '#0a0d18';
const C_BORDER     = '#2a3045';
const C_TEXT       = '#e8eaf0';
const C_TEXT_MUTED = '#7888a8';
const C_TEXT_DIM   = '#4a5570';

const ACCENT = {
  violet:  '#7c6af7',
  purple:  '#a855f7',
  blue:    '#3b82f6',
  green:   '#10b981',
  teal:    '#14b8a6',
  orange:  '#f59e0b',
  red:     '#ef4444',
  pink:    '#ec4899',
  yellow:  '#eab308',
};

const LEVEL_ACCENTS = ['violet', 'blue', 'green', 'orange', 'teal', 'pink'];

function accent(name) {
  return ACCENT[name] || ACCENT.violet;
}

// ─── Shared card wrapper styles ───────────────────────────────────────────────
function cardStyle(w, h, accentColor) {
  return {
    width: w,
    height: h,
    background: C_BG_CARD,
    border: `1px solid ${C_BORDER}`,
    borderLeft: `3px solid ${accent(accentColor)}`,
    borderRadius: 10,
    boxSizing: 'border-box',
    boxShadow: '0 4px 24px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 14px',
    fontFamily: FONT_BODY,
    pointerEvents: 'none',
  };
}


// ─── Minimal syntax highlighter (SQL / JS / Python / Bash / JSON) ─────────────
const TOKEN_RULES = [
  // SQL / JS keywords
  { re: /\b(SELECT|FROM|WHERE|JOIN|ON|AS|INSERT|UPDATE|DELETE|CREATE|TABLE|INDEX|AND|OR|NOT|IN|IS|NULL|LIMIT|ORDER|BY|GROUP|HAVING|INNER|LEFT|RIGHT|OUTER|UNION|function|return|const|let|var|if|else|for|while|class|import|export|default|new|this|async|await|true|false|def|print|elif|pass|lambda)\b/gi, color: '#c792ea' },
  // Strings
  { re: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, color: '#c3e88d' },
  // Numbers
  { re: /\b(\d+(?:\.\d+)?)\b/g, color: '#f78c6c' },
  // Comments
  { re: /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g, color: '#546e7a' },
  // JSON keys
  { re: /("[\w\s]+")\s*:/g, color: '#82aaff' },
];

function highlightLine(line) {
  // Build an array of {text, color} segments via regex replacement
  let segments = [{ text: line, color: C_TEXT }];

  TOKEN_RULES.forEach(({ re, color }) => {
    const next = [];
    segments.forEach(seg => {
      if (seg.color !== C_TEXT) { next.push(seg); return; }
      let last = 0;
      const src = seg.text;
      const localRe = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
      let m;
      while ((m = localRe.exec(src)) !== null) {
        if (m.index > last) next.push({ text: src.slice(last, m.index), color: C_TEXT });
        next.push({ text: m[0], color });
        last = localRe.lastIndex;
      }
      if (last < src.length) next.push({ text: src.slice(last), color: C_TEXT });
    });
    segments = next;
  });

  return segments;
}

// ─── 1. HeroCard ─────────────────────────────────────────────────────────────
export class HeroCardUtil extends BaseBoxShapeUtil {
  static type = 'hero-card';
  static props = {
    title:    T.string,
    subtitle: T.string,
    accent:   T.string,
    w:        T.number,
    h:        T.number,
  };

  getDefaultProps() {
    return { title: 'Title', subtitle: '', accent: 'violet', w: 680, h: 130 };
  }

  component(shape) {
    const { title, subtitle, accent: ac, w, h } = shape.props;
    const col = accent(ac);
    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: 'linear-gradient(135deg, #0e1525 0%, #12172a 100%)',
        border: `1px solid ${C_BORDER}`,
        borderBottom: `3px solid ${col}`,
        borderRadius: 12,
        boxSizing: 'border-box',
        boxShadow: `0 0 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)`,
        overflow: 'hidden',
        padding: '20px 24px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 8,
      }}>
        <div style={{
          fontSize: Math.min(36, Math.max(20, h * 0.26)),
          fontWeight: 800,
          color: C_TEXT,
          lineHeight: 1.15,
          letterSpacing: '-0.5px',
          fontFamily: FONT_DISPLAY,
        }}>{title}</div>
        {subtitle && (
          <div style={{
            fontSize: Math.min(16, Math.max(11, h * 0.11)),
            color: C_TEXT_MUTED,
            lineHeight: 1.5,
            maxWidth: w - 48,
          }}>{subtitle}</div>
        )}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 24,
          width: 60, height: 3,
          background: col,
          borderRadius: '3px 3px 0 0',
        }} />
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }
}

// ─── 2. FeatureCard ──────────────────────────────────────────────────────────
export class FeatureCardUtil extends BaseBoxShapeUtil {
  static type = 'feature-card';
  static props = {
    icon:   T.string,
    label:  T.string,
    body:   T.string,
    accent: T.string,
    w:      T.number,
    h:      T.number,
  };

  getDefaultProps() {
    return { icon: '⚡', label: 'Feature', body: '', accent: 'violet', w: 220, h: 110 };
  }

  component(shape) {
    const { icon, label, body, accent: ac, w, h } = shape.props;
    const col = accent(ac);
    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: `linear-gradient(160deg, ${col}14 0%, ${C_BG_CARD2} 100%)`,
        border: `1px solid ${col}33`,
        borderTop: `3px solid ${col}`,
        borderRadius: 10,
        boxSizing: 'border-box',
        boxShadow: `0 6px 28px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.03)`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 16px 12px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 18,
            lineHeight: 1,
            width: 36, height: 36,
            background: col + '20',
            border: `1px solid ${col}50`,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 0 10px ${col}30`,
          }}>{icon}</span>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: C_TEXT,
            lineHeight: 1.2,
            letterSpacing: '-0.2px',
            flex: 1,
            fontFamily: FONT_DISPLAY,
          }}>{label}</span>
        </div>
        {body && (
          <div style={{
            fontSize: 11.5,
            color: C_TEXT_MUTED,
            lineHeight: 1.6,
            flex: 1,
            paddingLeft: 2,
          }}>{body}</div>
        )}
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, ${col}40, transparent)`,
          marginTop: 'auto',
        }} />
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }
}

// ─── 3. CodeCard ─────────────────────────────────────────────────────────────
export class CodeCardUtil extends BaseBoxShapeUtil {
  static type = 'code-card';
  static props = {
    language: T.string,
    lines:    T.arrayOf(T.string),
    caption:  T.string,
    w:        T.number,
    h:        T.number,
  };

  getDefaultProps() {
    return { language: 'javascript', lines: ['// code here'], caption: '', w: 340, h: 200 };
  }

  component(shape) {
    const { language, lines, caption, w, h } = shape.props;
    const safeLines = Array.isArray(lines) ? lines : [String(lines)];
    const langColor = { sql: ACCENT.teal, javascript: ACCENT.yellow, python: ACCENT.blue, bash: ACCENT.green, json: ACCENT.orange }[language] || ACCENT.violet;

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: C_BG_CODE,
        border: `1px solid ${C_BORDER}`,
        borderRadius: 10,
        boxSizing: 'border-box',
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
        pointerEvents: 'none',
      }}>
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: '#0e1220',
          borderBottom: `1px solid ${C_BORDER}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: langColor, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'inherit' }}>
            {language}
          </span>
          <div style={{ flex: 1 }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', marginRight: 4 }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', marginRight: 4 }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
        </div>
        {/* Code lines */}
        <div style={{
          flex: 1,
          padding: '10px 0',
          overflow: 'hidden',
        }}>
          {safeLines.map((line, i) => {
            const segs = highlightLine(line);
            return (
              <div key={i} style={{
                display: 'flex',
                minHeight: 20,
                lineHeight: '20px',
              }}>
                <span style={{
                  width: 36, flexShrink: 0,
                  textAlign: 'right',
                  paddingRight: 12,
                  fontSize: 11,
                  color: C_TEXT_DIM,
                  userSelect: 'none',
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, whiteSpace: 'pre' }}>
                  {segs.map((s, j) => (
                    <span key={j} style={{ color: s.color }}>{s.text}</span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
        {caption && (
          <div style={{
            padding: '5px 14px',
            borderTop: `1px solid ${C_BORDER}`,
            fontSize: 10,
            color: C_TEXT_DIM,
            flexShrink: 0,
          }}>{caption}</div>
        )}
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }
}

// ─── 4. ProcessCard (single step) ────────────────────────────────────────────
export class ProcessCardUtil extends BaseBoxShapeUtil {
  static type = 'process-card';
  static props = {
    step:   T.string,
    label:  T.string,
    body:   T.string,
    accent: T.string,
    w:      T.number,
    h:      T.number,
  };

  getDefaultProps() {
    return { step: '01', label: 'Step', body: '', accent: 'violet', w: 160, h: 110 };
  }

  component(shape) {
    const { step, label, body, accent: ac, w, h } = shape.props;
    const col = accent(ac);
    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: C_BG_CARD,
        border: `1px solid ${C_BORDER}`,
        borderTop: `3px solid ${col}`,
        borderRadius: 10,
        boxSizing: 'border-box',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 12px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        gap: 6,
      }}>
        <div style={{
          width: 28, height: 28,
          borderRadius: '50%',
          background: col + '22',
          border: `1.5px solid ${col}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          color: col,
          letterSpacing: '-0.3px',
          flexShrink: 0,
        }}>{step}</div>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: C_TEXT,
          lineHeight: 1.25,
          flex: body ? 'unset' : 1,
          fontFamily: FONT_DISPLAY,
        }}>{label}</div>
        {body && (
          <div style={{
            fontSize: 10.5,
            color: C_TEXT_MUTED,
            lineHeight: 1.5,
            flex: 1,
          }}>{body}</div>
        )}
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }
}

// ─── 5. NodeCard (graph node) ─────────────────────────────────────────────────
export class NodeCardUtil extends BaseBoxShapeUtil {
  static type = 'node-card';
  static props = {
    label:    T.string,
    sublabel: T.string,
    level:    T.number,
    w:        T.number,
    h:        T.number,
  };

  getDefaultProps() {
    return { label: 'Node', sublabel: '', level: 0, w: 160, h: 64 };
  }

  component(shape) {
    const { label, sublabel, level, w, h } = shape.props;
    const ac = LEVEL_ACCENTS[level % LEVEL_ACCENTS.length];
    const col = accent(ac);
    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: C_BG_CARD,
        border: `1px solid ${C_BORDER}`,
        borderLeft: `3px solid ${col}`,
        borderRadius: 8,
        boxSizing: 'border-box',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '8px 12px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        gap: 3,
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: C_TEXT,
          lineHeight: 1.25,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: FONT_DISPLAY,
        }}>{label}</div>
        {sublabel && (
          <div style={{
            fontSize: 10,
            color: col,
            lineHeight: 1.2,
            fontWeight: 500,
          }}>{sublabel}</div>
        )}
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }
}

// ─── 6. TableCard ─────────────────────────────────────────────────────────────
export class TableCardUtil extends BaseBoxShapeUtil {
  static type = 'table-card';
  static props = {
    title:   T.string,
    headers: T.arrayOf(T.string),
    rows:    T.arrayOf(T.arrayOf(T.string)),
    accent:  T.string,
    w:       T.number,
    h:       T.number,
  };

  getDefaultProps() {
    return { title: 'Result', headers: ['id', 'name', 'value'], rows: [['1', 'Item', '—']], accent: 'teal', w: 340, h: 200 };
  }

  component(shape) {
    const { title, headers, rows, accent: ac, w, h } = shape.props;
    const col = accent(ac);
    const safeHeaders = Array.isArray(headers) ? headers : [];
    const safeRows = Array.isArray(rows) ? rows : [];
    const colW = safeHeaders.length > 0 ? Math.floor((w - 28) / safeHeaders.length) : 80;

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: C_BG_CODE,
        border: `1px solid ${C_BORDER}`,
        borderRadius: 10,
        boxSizing: 'border-box',
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
      }}>
        <div style={{
          padding: '8px 14px',
          background: '#0e1220',
          borderBottom: `1px solid ${C_BORDER}`,
          fontSize: 11,
          fontWeight: 700,
          color: col,
          letterSpacing: 0.5,
          flexShrink: 0,
          fontFamily: FONT_DISPLAY,
        }}>{title}</div>
        {/* Header row */}
        <div style={{
          display: 'flex',
          padding: '6px 14px',
          background: '#0e1525',
          borderBottom: `1px solid ${C_BORDER}`,
          flexShrink: 0,
        }}>
          {safeHeaders.map((h2, i) => (
            <div key={i} style={{
              width: colW,
              fontSize: 10,
              fontWeight: 700,
              color: C_TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{h2}</div>
          ))}
        </div>
        {/* Data rows */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {safeRows.map((row, ri) => (
            <div key={ri} style={{
              display: 'flex',
              padding: '5px 14px',
              borderBottom: ri < safeRows.length - 1 ? `1px solid ${C_BORDER}22` : 'none',
              background: ri % 2 === 0 ? 'transparent' : '#ffffff04',
            }}>
              {(Array.isArray(row) ? row : []).map((cell, ci) => (
                <div key={ci} style={{
                  width: colW,
                  fontSize: 11,
                  color: ci === 0 ? col : C_TEXT,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{cell}</div>
              ))}
            </div>
          ))}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }
}

// ─── VideoPlayer — defined OUTSIDE the class so React never recreates the component type ──
// Each instance gets a small random stagger (0–800ms) so 3 parallel videos
// don't all start buffering at exactly the same moment.
let _vpMountCount = 0;

function VideoPlayer({ url, thumbnail }) {
  const videoRef  = useRef(null);
  const staggerMs = useRef((_vpMountCount++ % 3) * 300); // 0 / 300 / 600 ms
  const [ready,  setReady]  = useState(false);
  const [muted,  setMuted]  = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !url) return;

    vid.muted = true;

    const tryPlay = () => {
      vid.play().catch(() => setFailed(true));
    };

    // Stagger load start so parallel videos don't spike bandwidth together
    const t = setTimeout(() => {
      vid.preload = 'auto';
      vid.load();                             // trigger buffering after stagger

      if (vid.readyState >= 3) {
        tryPlay();
      } else {
        vid.addEventListener('canplay', tryPlay, { once: true });
      }
    }, staggerMs.current);

    return () => {
      clearTimeout(t);
      vid.removeEventListener('canplay', tryPlay);
    };
  }, [url]);   // re-run only when URL changes

  const toggleMute = (e) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setMuted(vid.muted);
  };

  return (
    <div style={{ position: 'relative', flex: 1, background: '#000', overflow: 'hidden', minHeight: 0 }}>

      {/* ── Video — always in DOM, poster shows while buffering ─────────── */}
      <video
        ref={videoRef}
        src={url}
        poster={thumbnail || undefined}
        loop
        muted
        playsInline
        preload="none"
        onCanPlay={() => setReady(true)}
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* ── Spinner overlay until ready ──────────────────────────────────── */}
      {!ready && !failed && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: thumbnail ? `url(${thumbnail}) center/cover no-repeat` : '#0d1120',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.12)',
            borderTopColor: '#7c6af7',
            animation: 'vpSpin 0.75s linear infinite',
          }} />
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {failed && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          background: '#0d1120',
        }}>
          <span style={{ fontSize: 22 }}>📵</span>
          <span style={{ fontSize: 10, color: '#7888a8' }}>Video unavailable</span>
        </div>
      )}

      {/* ── Mute toggle badge ─────────────────────────────────────────────── */}
      {ready && !failed && (
        <div onClick={toggleMute} style={{
          position: 'absolute', bottom: 7, right: 7,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.13)',
          borderRadius: 6, padding: '2px 7px',
          fontSize: 10, color: '#fff', cursor: 'pointer', userSelect: 'none',
        }}>
          {muted ? '🔇 Sound' : '🔊'}
        </div>
      )}
    </div>
  );
}

// ─── 7. VideoCard ─────────────────────────────────────────────────────────────
export class VideoCardUtil extends BaseBoxShapeUtil {
  static type = 'video-card';
  static props = {
    url:       T.string,
    thumbnail: T.string,
    title:     T.string,
    duration:  T.number,
    source:    T.string,
    w:         T.number,
    h:         T.number,
  };

  getDefaultProps() {
    return {
      url: '', thumbnail: '', title: 'Video', duration: 0,
      source: 'pexels', w: 320, h: 210,
    };
  }

  component(shape) {
    const { url, thumbnail, title, duration, w, h } = shape.props;
    const TITLE_H = 32;

    // Inject keyframes once into <head>
    if (typeof document !== 'undefined') {
      if (!document.getElementById('video-card-kf')) {
        const s = document.createElement('style');
        s.id = 'video-card-kf';
        s.textContent = [
          '@keyframes videoFadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}',
          '@keyframes vpSpin{to{transform:rotate(360deg)}}',
        ].join('');
        document.head.appendChild(s);
      }
    }

    const fmtDuration = (sec) => {
      if (!sec) return '';
      return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    };

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: C_BG_CARD2,
        border: `1px solid ${C_BORDER}`,
        borderTop: `3px solid ${ACCENT.violet}`,
        borderRadius: 10,
        boxSizing: 'border-box',
        boxShadow: '0 6px 28px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT_BODY,
        pointerEvents: 'all',
        animation: 'videoFadeIn 0.5s ease forwards',
      }}>

        {/* ── Title bar ──────────────────────────────────────────────────────── */}
        <div style={{
          height: TITLE_H,
          display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 6,
          background: '#0d1020',
          borderBottom: `1px solid ${C_BORDER}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, lineHeight: 1 }}>🎬</span>
          <span style={{
            flex: 1, fontSize: 11, fontWeight: 600, color: C_TEXT,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{title}</span>
          {duration > 0 && (
            <span style={{
              fontSize: 10, color: ACCENT.violet,
              background: ACCENT.violet + '22',
              border: `1px solid ${ACCENT.violet}44`,
              borderRadius: 4, padding: '1px 5px', flexShrink: 0,
            }}>{fmtDuration(duration)}</span>
          )}
        </div>

        {/* ── VideoPlayer — stable component ref, defined outside this class ── */}
        <VideoPlayer url={url} thumbnail={thumbnail} />

      </HTMLContainer>
    );
  }

  indicator(shape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={10}
        ry={10}
      />
    );
  }
}

// ─── 8. StatCard — KPI with animated progress bar + trend sparkline ──────────
export class StatCardUtil extends BaseBoxShapeUtil {
  static type = 'stat-card';
  static props = {
    label:   T.string,
    value:   T.string,
    sub:     T.string,
    trend:   T.string,   // 'up' | 'down' | 'flat'
    percent: T.number,   // 0–100 fill for progress bar
    accent:  T.string,
    w:       T.number,
    h:       T.number,
  };

  getDefaultProps() {
    return { label: 'Metric', value: '0', sub: '', trend: 'up', percent: 70, accent: 'green', w: 220, h: 120 };
  }

  component(shape) {
    const { label, value, sub, trend, percent, accent: ac, w, h } = shape.props;
    const col = accent(ac);
    const clampedPct = Math.max(0, Math.min(100, percent));
    const trendIcon  = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—';
    const trendColor = trend === 'up' ? ACCENT.green : trend === 'down' ? ACCENT.red : C_TEXT_MUTED;

    return (
      <HTMLContainer style={{
        ...cardStyle(w, h, ac),
        justifyContent: 'space-between',
        gap: 0,
      }}>
        {/* Label row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C_TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {label}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>{trendIcon}</span>
        </div>

        {/* Big value */}
        <div style={{ fontSize: Math.min(32, Math.max(20, h * 0.26)), fontWeight: 800, color: C_TEXT, fontFamily: FONT_DISPLAY, lineHeight: 1.1 }}>
          {value}
        </div>

        {/* Sub-label */}
        {sub && (
          <div style={{ fontSize: 10, color: C_TEXT_MUTED, marginBottom: 6 }}>{sub}</div>
        )}

        {/* Progress bar */}
        <div style={{ width: '100%', height: 4, background: C_BORDER, borderRadius: 4, overflow: 'hidden', marginTop: 'auto' }}>
          <div style={{
            height: '100%', width: `${clampedPct}%`,
            background: `linear-gradient(90deg, ${col}99, ${col})`,
            borderRadius: 4,
            transition: 'width 1s ease',
          }} />
        </div>
        <div style={{ fontSize: 9, color: col, marginTop: 3, textAlign: 'right' }}>{clampedPct}%</div>
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }
}

// ─── 9. QuoteCard — pull-quote with large decorative quotation mark ───────────
export class QuoteCardUtil extends BaseBoxShapeUtil {
  static type = 'quote-card';
  static props = {
    quote:  T.string,
    author: T.string,
    accent: T.string,
    w:      T.number,
    h:      T.number,
  };

  getDefaultProps() {
    return { quote: 'Insert quote here', author: '— Author', accent: 'violet', w: 340, h: 140 };
  }

  component(shape) {
    const { quote, author, accent: ac, w, h } = shape.props;
    const col = accent(ac);

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: `linear-gradient(135deg, ${col}18 0%, ${C_BG_CARD2} 60%)`,
        border: `1px solid ${col}44`,
        borderLeft: `4px solid ${col}`,
        borderRadius: 12,
        boxSizing: 'border-box',
        boxShadow: `0 4px 24px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.03)`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '14px 16px 12px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        position: 'relative',
      }}>
        {/* Giant decorative quote mark */}
        <div style={{
          position: 'absolute', top: -4, left: 12,
          fontSize: 72, lineHeight: 1, color: col,
          opacity: 0.13, fontFamily: 'Georgia, serif', userSelect: 'none',
        }}>"</div>

        {/* Quote text */}
        <div style={{
          fontSize: Math.min(13, Math.max(10, h * 0.088)),
          color: C_TEXT,
          lineHeight: 1.55,
          fontStyle: 'italic',
          zIndex: 1,
          flex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
        }}>
          {quote}
        </div>

        {/* Author */}
        <div style={{
          fontSize: 10, color: col, fontWeight: 700,
          marginTop: 8, letterSpacing: '0.04em',
        }}>
          {author}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={10} ry={10} />;
  }
}

// ─── 10. CalloutCard — tip / warning / info / danger callout box ──────────────
export class CalloutCardUtil extends BaseBoxShapeUtil {
  static type = 'callout-card';
  static props = {
    type:    T.string,   // 'tip' | 'warning' | 'info' | 'danger' | 'success'
    title:   T.string,
    body:    T.string,
    w:       T.number,
    h:       T.number,
  };

  getDefaultProps() {
    return { type: 'tip', title: 'Pro Tip', body: 'Add useful information here.', w: 300, h: 90 };
  }

  component(shape) {
    const { type, title, body, w, h } = shape.props;

    const CONFIG = {
      tip:     { icon: '💡', color: ACCENT.yellow,  bg: ACCENT.yellow  + '18' },
      warning: { icon: '⚠️', color: ACCENT.orange,  bg: ACCENT.orange  + '18' },
      info:    { icon: 'ℹ️', color: ACCENT.blue,    bg: ACCENT.blue    + '18' },
      danger:  { icon: '🚨', color: ACCENT.red,     bg: ACCENT.red     + '18' },
      success: { icon: '✅', color: ACCENT.green,   bg: ACCENT.green   + '18' },
    };
    const cfg = CONFIG[type] || CONFIG.tip;

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: cfg.bg,
        border: `1px solid ${cfg.color}55`,
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: 10,
        boxSizing: 'border-box',
        boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 14px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
      }}>
        {/* Icon */}
        <span style={{ fontSize: 18, lineHeight: 1.3, flexShrink: 0 }}>{cfg.icon}</span>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 10.5, color: C_TEXT, lineHeight: 1.5, overflow: 'hidden' }}>{body}</div>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }
}

// ─── 11. TimelineCard — vertical milestone timeline ───────────────────────────
export class TimelineCardUtil extends BaseBoxShapeUtil {
  static type = 'timeline-card';
  static props = {
    title:     T.string,
    milestones: T.arrayOf(T.jsonValue),  // [{date, label, done}]
    accent:    T.string,
    w:         T.number,
    h:         T.number,
  };

  getDefaultProps() {
    return {
      title: 'Roadmap',
      milestones: [
        { date: 'Q1 2024', label: 'Phase 1', done: true },
        { date: 'Q2 2024', label: 'Phase 2', done: true },
        { date: 'Q3 2024', label: 'Phase 3', done: false },
      ],
      accent: 'violet',
      w: 240,
      h: 200,
    };
  }

  component(shape) {
    const { title, milestones, accent: ac, w, h } = shape.props;
    const col = accent(ac);
    const safe = Array.isArray(milestones)
      ? milestones.filter(m => m && typeof m === 'object').slice(0, 6)
      : [];

    return (
      <HTMLContainer style={{
        ...cardStyle(w, h, ac),
        gap: 0,
      }}>
        {/* Header */}
        <div style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {title}
        </div>

        {/* Milestones */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {safe.map((m, i) => {
            const done = !!(m?.done);
            const isLast = i === safe.length - 1;
            return (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {/* Line + dot column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: done ? col : C_BG_CARD,
                    border: `2px solid ${done ? col : C_BORDER}`,
                    boxShadow: done ? `0 0 6px ${col}88` : 'none',
                    marginTop: 2,
                  }} />
                  {!isLast && (
                    <div style={{ width: 2, flex: 1, minHeight: 14, background: done ? col + '55' : C_BORDER, marginTop: 2 }} />
                  )}
                </div>

                {/* Text column */}
                <div style={{ paddingBottom: isLast ? 0 : 10, flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 9, color: done ? col : C_TEXT_MUTED, fontWeight: 700, letterSpacing: '0.06em' }}>{m?.date ?? ''}</div>
                  <div style={{ fontSize: 11, color: done ? C_TEXT : C_TEXT_MUTED, fontWeight: done ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m?.label ?? ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }
}

// ─── 12. CompareCard — Pro/Con or A vs B side-by-side comparison ──────────────
export class CompareCardUtil extends BaseBoxShapeUtil {
  static type = 'compare-card';
  static props = {
    leftLabel:  T.string,
    rightLabel: T.string,
    leftItems:  T.arrayOf(T.string),
    rightItems: T.arrayOf(T.string),
    leftAccent: T.string,
    rightAccent:T.string,
    w:          T.number,
    h:          T.number,
  };

  getDefaultProps() {
    return {
      leftLabel: 'Pros', rightLabel: 'Cons',
      leftItems: ['Fast', 'Scalable'], rightItems: ['Expensive', 'Complex'],
      leftAccent: 'green', rightAccent: 'red',
      w: 360, h: 180,
    };
  }

  component(shape) {
    const { leftLabel, rightLabel, leftItems, rightItems, leftAccent, rightAccent, w, h } = shape.props;
    const lCol = accent(leftAccent);
    const rCol = accent(rightAccent);
    const lSafe = Array.isArray(leftItems)  ? leftItems.slice(0, 5)  : [];
    const rSafe = Array.isArray(rightItems) ? rightItems.slice(0, 5) : [];
    const colW  = (w - 3) / 2;

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: C_BG_CARD,
        border: `1px solid ${C_BORDER}`,
        borderRadius: 12,
        boxSizing: 'border-box',
        boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
        overflow: 'hidden',
        display: 'flex',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
      }}>
        {/* Left column */}
        <div style={{ width: colW, padding: '12px 12px', borderRight: `1px solid ${C_BORDER}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: lCol, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {leftLabel}
          </div>
          {lSafe.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: lCol, flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, color: C_TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Right column */}
        <div style={{ width: colW, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: rCol, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {rightLabel}
          </div>
          {rSafe.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: rCol, flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, color: C_TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
            </div>
          ))}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={10} ry={10} />;
  }
}

// ─── 13. BadgeCard — pill labels / tag cloud / status badges row ──────────────
export class BadgeCardUtil extends BaseBoxShapeUtil {
  static type = 'badge-card';
  static props = {
    title:  T.string,
    badges: T.arrayOf(T.jsonValue),   // [{label, accent}]
    w:      T.number,
    h:      T.number,
  };

  getDefaultProps() {
    return {
      title: 'Tags',
      badges: [
        { label: 'React',      accent: 'blue'   },
        { label: 'TypeScript', accent: 'violet' },
        { label: 'Node.js',    accent: 'green'  },
        { label: 'MongoDB',    accent: 'teal'   },
      ],
      w: 300,
      h: 110,
    };
  }

  component(shape) {
    const { title, badges, w, h } = shape.props;
    const safe = Array.isArray(badges)
      ? badges.filter(b => b && typeof b === 'object').slice(0, 12)
      : [];

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: C_BG_CARD,
        border: `1px solid ${C_BORDER}`,
        borderRadius: 10,
        boxSizing: 'border-box',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 12px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        gap: 8,
      }}>
        {/* Title */}
        {title && (
          <div style={{ fontSize: 10, fontWeight: 700, color: C_TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {title}
          </div>
        )}

        {/* Badge pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1, alignContent: 'flex-start' }}>
          {safe.map((b, i) => {
            const col = accent(b.accent || 'violet');
            return (
              <div key={i} style={{
                padding: '3px 9px',
                borderRadius: 20,
                background: col + '22',
                border: `1px solid ${col}55`,
                fontSize: 10, fontWeight: 600,
                color: col,
                whiteSpace: 'nowrap',
              }}>
                {b.label}
              </div>
            );
          })}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }
}

// ─── 14. RadialCard — SVG donut ring with percentage fill ─────────────────────
export class RadialCardUtil extends BaseBoxShapeUtil {
  static type = 'radial-card';
  static props = {
    label:   T.string,
    value:   T.string,
    percent: T.number,   // 0–100
    sub:     T.string,
    accent:  T.string,
    w:       T.number,
    h:       T.number,
  };

  getDefaultProps() {
    return { label: 'Progress', value: '72%', percent: 72, sub: 'of goal', accent: 'violet', w: 180, h: 180 };
  }

  component(shape) {
    const { label, value, percent, sub, accent: ac, w, h } = shape.props;
    const col    = accent(ac);
    const clamp  = Math.max(0, Math.min(100, percent));
    const R      = 52;                        // ring radius
    const STROKE = 10;
    const circ   = 2 * Math.PI * R;
    const dash   = (clamp / 100) * circ;
    const cx     = w / 2;
    const cy     = h / 2;

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: C_BG_CARD,
        border: `1px solid ${C_BORDER}`,
        borderRadius: 14,
        boxSizing: 'border-box',
        boxShadow: `0 6px 28px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        position: 'relative',
        gap: 0,
      }}>
        {/* Label at top */}
        <div style={{
          position: 'absolute', top: 12, left: 0, right: 0,
          textAlign: 'center',
          fontSize: 9, fontWeight: 700, color: C_TEXT_MUTED,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>{label}</div>

        {/* SVG ring */}
        <svg width={w} height={h - 32} style={{ overflow: 'visible', marginTop: 8 }}>
          {/* Track */}
          <circle
            cx={cx} cy={(h - 32) / 2} r={R}
            fill="none"
            stroke={C_BORDER}
            strokeWidth={STROKE}
          />
          {/* Glow shadow ring */}
          <circle
            cx={cx} cy={(h - 32) / 2} r={R}
            fill="none"
            stroke={col}
            strokeWidth={STROKE + 4}
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={circ / 4}  /* start at top */
            strokeLinecap="round"
            opacity={0.15}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${(h - 32) / 2}px` }}
          />
          {/* Foreground arc */}
          <circle
            cx={cx} cy={(h - 32) / 2} r={R}
            fill="none"
            stroke={col}
            strokeWidth={STROKE}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${(h - 32) / 2}px`, transition: 'stroke-dasharray 1s ease' }}
          />
          {/* Center value */}
          <text
            x={cx} y={(h - 32) / 2 + 1}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={18} fontWeight={800} fill={C_TEXT}
            fontFamily={FONT_DISPLAY}
          >{value}</text>
          {/* Center sub */}
          {sub && (
            <text
              x={cx} y={(h - 32) / 2 + 18}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={8} fill={C_TEXT_MUTED}
              fontFamily={FONT_BODY}
            >{sub}</text>
          )}
        </svg>

        {/* Percentage at bottom */}
        <div style={{
          position: 'absolute', bottom: 10, left: 0, right: 0,
          textAlign: 'center',
          fontSize: 9, color: col, fontWeight: 700,
        }}>{clamp}%</div>
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}

// ─── 15. GlowCard — card with animated neon glow border + mesh pattern ─────────
// Injects a global CSS animation once; safe for SSR (document guard).
export class GlowCardUtil extends BaseBoxShapeUtil {
  static type = 'glow-card';
  static props = {
    icon:   T.string,
    title:  T.string,
    body:   T.string,
    accent: T.string,
    w:      T.number,
    h:      T.number,
  };

  getDefaultProps() {
    return { icon: '✦', title: 'Glow Card', body: 'Hover to feel the energy.', accent: 'violet', w: 280, h: 150 };
  }

  component(shape) {
    const { icon, title, body, accent: ac, w, h } = shape.props;
    const col = accent(ac);

    // Inject keyframes once
    if (typeof document !== 'undefined' && !document.getElementById('glow-card-kf')) {
      const s = document.createElement('style');
      s.id = 'glow-card-kf';
      s.textContent = `
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 10px ${col}66, 0 0 30px ${col}33, inset 0 0 20px ${col}0a; }
          50%      { box-shadow: 0 0 20px ${col}aa, 0 0 50px ${col}55, inset 0 0 30px ${col}18; }
        }
        @keyframes glowOrb {
          0%,100% { transform: translate(-50%,-50%) scale(1);   opacity: 0.22; }
          50%      { transform: translate(-50%,-50%) scale(1.3); opacity: 0.38; }
        }
      `;
      document.head.appendChild(s);
    }

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: `linear-gradient(140deg, ${col}1a 0%, ${C_BG_CARD2} 60%)`,
        border: `1.5px solid ${col}55`,
        borderRadius: 14,
        boxSizing: 'border-box',
        boxShadow: `0 0 14px ${col}55, 0 0 40px ${col}22, inset 0 0 24px ${col}0d`,
        animation: 'glowPulse 3s ease-in-out infinite',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '18px 20px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        position: 'relative',
        gap: 8,
      }}>
        {/* Ambient orb */}
        <div style={{
          position: 'absolute',
          top: '30%', left: '60%',
          width: w * 0.7, height: w * 0.7,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${col}44 0%, transparent 70%)`,
          animation: 'glowOrb 4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Dot grid texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle, ${col}22 1px, transparent 1px)`,
          backgroundSize: '18px 18px',
          opacity: 0.6,
          pointerEvents: 'none',
        }} />

        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          <span style={{
            fontSize: 22, lineHeight: 1,
            width: 42, height: 42, borderRadius: '50%',
            background: `radial-gradient(circle, ${col}33, ${col}0d)`,
            border: `1.5px solid ${col}77`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 12px ${col}55`,
            flexShrink: 0,
          }}>{icon}</span>
          <div style={{
            fontSize: 14, fontWeight: 800, color: C_TEXT,
            fontFamily: FONT_DISPLAY, lineHeight: 1.2,
            letterSpacing: '-0.3px',
          }}>{title}</div>
        </div>

        {/* Body */}
        {body && (
          <div style={{
            fontSize: 11, color: C_TEXT_MUTED, lineHeight: 1.6,
            position: 'relative', zIndex: 1,
          }}>{body}</div>
        )}

        {/* Shimmer line at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${col}, transparent)`,
          opacity: 0.7,
        }} />
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}

// ─── 16. AvatarCard — circular avatar stack (team members / contributors) ──────
export class AvatarCardUtil extends BaseBoxShapeUtil {
  static type = 'avatar-card';
  static props = {
    title:   T.string,
    members: T.arrayOf(T.jsonValue),  // [{name, accent, emoji?}]
    sub:     T.string,
    w:       T.number,
    h:       T.number,
  };

  getDefaultProps() {
    return {
      title: 'Team',
      members: [
        { name: 'Alice',   accent: 'violet', emoji: '👩‍💻' },
        { name: 'Bob',     accent: 'blue',   emoji: '👨‍🔬' },
        { name: 'Charlie', accent: 'green',  emoji: '👨‍🎨' },
        { name: 'Dana',    accent: 'orange', emoji: '👩‍🚀' },
      ],
      sub: '4 contributors',
      w: 300, h: 140,
    };
  }

  component(shape) {
    const { title, members, sub, w, h } = shape.props;
    const safe = Array.isArray(members)
      ? members.filter(m => m && typeof m === 'object').slice(0, 8)
      : [];
    const AV_SIZE = 46;
    const OVERLAP = 14;

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: C_BG_CARD,
        border: `1px solid ${C_BORDER}`,
        borderRadius: 14,
        boxSizing: 'border-box',
        boxShadow: '0 6px 28px rgba(0,0,0,0.55)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '14px 16px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        gap: 10,
      }}>
        {/* Title */}
        <div style={{ fontSize: 10, fontWeight: 700, color: C_TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
          {title}
        </div>

        {/* Avatar row */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {safe.map((m, i) => {
            const col = accent(m?.accent || LEVEL_ACCENTS[i % LEVEL_ACCENTS.length]);
            const initials = (m?.name || '?').slice(0, 2).toUpperCase();
            return (
              <div key={i} style={{
                width: AV_SIZE, height: AV_SIZE,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, ${col}55, ${col}22)`,
                border: `2.5px solid ${C_BG_CARD}`,
                outline: `1.5px solid ${col}88`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: i === 0 ? 0 : -OVERLAP,
                fontSize: m?.emoji ? 22 : 14,
                fontWeight: 800,
                color: m?.emoji ? undefined : col,
                boxShadow: `0 2px 10px rgba(0,0,0,0.5), 0 0 8px ${col}44`,
                flexShrink: 0,
                zIndex: safe.length - i,
                transition: 'transform 0.2s ease',
              }}>
                {m?.emoji || initials}
              </div>
            );
          })}

          {/* "+N more" badge */}
          {safe.length >= 5 && (
            <div style={{
              width: AV_SIZE, height: AV_SIZE, borderRadius: '50%',
              background: C_BORDER,
              border: `2.5px solid ${C_BG_CARD}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: C_TEXT_MUTED,
              marginLeft: -OVERLAP, flexShrink: 0,
            }}>
              +{safe.length - 4}
            </div>
          )}
        </div>

        {/* Sub text */}
        {sub && (
          <div style={{ fontSize: 10, color: C_TEXT_MUTED }}>{sub}</div>
        )}
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}

// ─── 17. PillBanner — wide gradient announcement / highlight strip ─────────────
export class PillBannerUtil extends BaseBoxShapeUtil {
  static type = 'pill-banner';
  static props = {
    emoji:   T.string,
    text:    T.string,
    sub:     T.string,
    accent:  T.string,
    w:       T.number,
    h:       T.number,
  };

  getDefaultProps() {
    return { emoji: '🚀', text: 'New Feature Live', sub: 'Click to explore →', accent: 'violet', w: 420, h: 68 };
  }

  component(shape) {
    const { emoji, text, sub, accent: ac, w, h } = shape.props;
    const col  = accent(ac);
    const col2 = ACCENT.blue;

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: `linear-gradient(110deg, ${col}33 0%, ${col2}22 50%, ${col}11 100%)`,
        border: `1px solid ${col}55`,
        borderRadius: h / 2,      // full pill shape
        boxSizing: 'border-box',
        boxShadow: `0 4px 24px ${col}33, 0 0 0 1px ${col}22`,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        gap: 12,
        position: 'relative',
      }}>
        {/* Shimmer sweep */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)`,
          pointerEvents: 'none',
        }} />

        {/* Emoji badge */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: col + '33',
          border: `1.5px solid ${col}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, lineHeight: 1,
          boxShadow: `0 0 10px ${col}44`,
        }}>{emoji}</div>

        {/* Text stack */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            fontSize: 13, fontWeight: 800, color: C_TEXT,
            fontFamily: FONT_DISPLAY, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
          }}>{text}</div>
          {sub && (
            <div style={{
              fontSize: 10, color: col, fontWeight: 600, marginTop: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{sub}</div>
          )}
        </div>

        {/* Right glow dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: col,
          boxShadow: `0 0 8px ${col}, 0 0 16px ${col}88`,
          flexShrink: 0,
          animation: 'glowPulse 2s ease-in-out infinite',
        }} />
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={shape.props.h / 2} ry={shape.props.h / 2} />;
  }
}

// ─── 18. StepCircleCard — numbered circle steps in a horizontal arc ────────────
export class StepCircleCardUtil extends BaseBoxShapeUtil {
  static type = 'step-circle-card';
  static props = {
    title:  T.string,
    steps:  T.arrayOf(T.jsonValue),   // [{label, icon?, accent?}]
    w:      T.number,
    h:      T.number,
  };

  getDefaultProps() {
    return {
      title: 'How It Works',
      steps: [
        { label: 'Define',   icon: '🎯', accent: 'violet' },
        { label: 'Design',   icon: '✏️', accent: 'blue'   },
        { label: 'Build',    icon: '🔨', accent: 'green'  },
        { label: 'Launch',   icon: '🚀', accent: 'orange' },
      ],
      w: 480, h: 160,
    };
  }

  component(shape) {
    const { title, steps, w, h } = shape.props;
    const safe   = Array.isArray(steps)
      ? steps.filter(s => s && typeof s === 'object').slice(0, 6)
      : [];
    const CIRC   = 52;
    const CONN_H = 2;

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: C_BG_CARD,
        border: `1px solid ${C_BORDER}`,
        borderRadius: 14,
        boxSizing: 'border-box',
        boxShadow: '0 6px 28px rgba(0,0,0,0.55)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        gap: 8,
      }}>
        {/* Title */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: C_TEXT_MUTED,
          textTransform: 'uppercase', letterSpacing: '0.09em', alignSelf: 'flex-start',
        }}>{title}</div>

        {/* Steps row */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
          {safe.map((step, i) => {
            const col   = accent(step.accent || LEVEL_ACCENTS[i % LEVEL_ACCENTS.length]);
            const isLast = i === safe.length - 1;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 'none' : 1 }}>
                {/* Circle */}
                <div style={{
                  width: CIRC, height: CIRC, borderRadius: '50%', flexShrink: 0,
                  background: `radial-gradient(circle at 35% 35%, ${col}44, ${col}18)`,
                  border: `2px solid ${col}`,
                  boxShadow: `0 0 14px ${col}55, inset 0 0 8px ${col}22`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 1,
                }}>
                  <span style={{ fontSize: step?.icon ? 18 : 14, lineHeight: 1 }}>{step?.icon || String(i + 1)}</span>
                  {!step?.icon && (
                    <span style={{ fontSize: 8, color: col, fontWeight: 800 }}>{i + 1}</span>
                  )}
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div style={{
                    flex: 1, height: CONN_H,
                    background: `linear-gradient(90deg, ${col}88, ${accent(safe[i + 1]?.accent || LEVEL_ACCENTS[(i + 1) % LEVEL_ACCENTS.length])}88)`,
                    margin: '0 4px',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Labels row */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
          {safe.map((step, i) => {
            const col = accent(step?.accent || LEVEL_ACCENTS[i % LEVEL_ACCENTS.length]);
            return (
              <div key={i} style={{
                width: CIRC, textAlign: 'center',
                fontSize: 9, fontWeight: 700, color: col,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{step?.label ?? ''}</div>
            );
          })}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={14} ry={14} />;
  }
}

// ─── 19. EmojiSticker — large floating emoji with glow halo + optional caption ──
// Sizes: 'sm'=60px, 'md'=90px, 'lg'=130px, 'xl'=180px
export class EmojiStickerUtil extends BaseBoxShapeUtil {
  static type = 'emoji-sticker';
  static props = {
    emoji:   T.string,
    caption: T.string,   // optional label below
    size:    T.string,   // 'sm' | 'md' | 'lg' | 'xl'
    accent:  T.string,   // glow color
    w:       T.number,
    h:       T.number,
  };

  getDefaultProps() {
    return { emoji: '🚀', caption: '', size: 'lg', accent: 'violet', w: 140, h: 140 };
  }

  component(shape) {
    const { emoji, caption, size: sz, accent: ac, w, h } = shape.props;
    const col = accent(ac);
    const FONT_SIZE = { sm: 36, md: 54, lg: 80, xl: 120 }[sz] || 80;
    const GLOW_SIZE = { sm: 60, md: 88, lg: 126, xl: 176 }[sz] || 126;
    const CAPTION_H = caption ? 22 : 0;

    // Inject floating keyframe once
    if (typeof document !== 'undefined' && !document.getElementById('emoji-sticker-kf')) {
      const s = document.createElement('style');
      s.id = 'emoji-sticker-kf';
      s.textContent = `
        @keyframes emojiFloat {
          0%,100% { transform: translateY(0px) rotate(-2deg); }
          50%      { transform: translateY(-6px) rotate(2deg); }
        }
        @keyframes emojiHalo {
          0%,100% { transform: scale(1);   opacity: 0.25; }
          50%      { transform: scale(1.15); opacity: 0.45; }
        }
      `;
      document.head.appendChild(s);
    }

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: 'transparent',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        gap: 6,
        position: 'relative',
      }}>
        {/* Glow halo disc */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: GLOW_SIZE, height: GLOW_SIZE,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${col}55 0%, ${col}18 50%, transparent 75%)`,
          transform: 'translate(-50%, -50%)',
          animation: 'emojiHalo 3s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* The emoji */}
        <div style={{
          fontSize: FONT_SIZE,
          lineHeight: 1,
          animation: 'emojiFloat 4s ease-in-out infinite',
          userSelect: 'none',
          filter: `drop-shadow(0 4px 16px ${col}66)`,
          zIndex: 1,
        }}>
          {emoji}
        </div>

        {/* Caption */}
        {caption && (
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: col,
            background: col + '22',
            border: `1px solid ${col}44`,
            borderRadius: 20,
            padding: '2px 10px',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            zIndex: 1,
          }}>
            {caption}
          </div>
        )}
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={shape.props.w / 2} ry={shape.props.h / 2} />;
  }
}

// ─── 20. ReactionBubble — chat-style reaction pill cluster ────────────────────
// reactions: [{emoji, count, accent}]
export class ReactionBubbleUtil extends BaseBoxShapeUtil {
  static type = 'reaction-bubble';
  static props = {
    reactions: T.arrayOf(T.jsonValue),  // [{emoji, count, accent}]
    w:         T.number,
    h:         T.number,
  };

  getDefaultProps() {
    return {
      reactions: [
        { emoji: '🔥', count: 42,  accent: 'orange' },
        { emoji: '❤️', count: 38,  accent: 'red'    },
        { emoji: '🚀', count: 27,  accent: 'violet' },
        { emoji: '💡', count: 19,  accent: 'yellow' },
        { emoji: '✅', count: 14,  accent: 'green'  },
      ],
      w: 340, h: 60,
    };
  }

  component(shape) {
    const { reactions, w, h } = shape.props;
    const safe = Array.isArray(reactions)
      ? reactions.filter(r => r && typeof r === 'object').slice(0, 8)
      : [];

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: 'transparent',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
      }}>
        {safe.map((r, i) => {
          const col = accent(r?.accent || LEVEL_ACCENTS[i % LEVEL_ACCENTS.length]);
          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 24,
              background: `linear-gradient(135deg, ${col}28 0%, ${col}12 100%)`,
              border: `1.5px solid ${col}55`,
              boxShadow: `0 2px 10px ${col}33, inset 0 1px 0 rgba(255,255,255,0.07)`,
              backdropFilter: 'blur(4px)',
              cursor: 'default',
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{r?.emoji ?? ''}</span>
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: col,
                letterSpacing: '-0.2px',
                fontFamily: FONT_DISPLAY,
              }}>
                {typeof r?.count === 'number' ? r.count.toLocaleString() : (r?.count ?? '')}
              </span>
            </div>
          );
        })}
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={30} ry={30} />;
  }
}

// ─── 21. EmojiCloud — scattered emoji mood/topic cluster ──────────────────────
// items: [{emoji, label?, size?}]   size: 'sm'|'md'|'lg'
export class EmojiCloudUtil extends BaseBoxShapeUtil {
  static type = 'emoji-cloud';
  static props = {
    title: T.string,
    items: T.arrayOf(T.jsonValue),   // [{emoji, label, size, accent}]
    accent: T.string,
    w:      T.number,
    h:      T.number,
  };

  getDefaultProps() {
    return {
      title: 'Vibes',
      items: [
        { emoji: '🎯', label: 'Focus',      size: 'lg', accent: 'violet' },
        { emoji: '⚡', label: 'Speed',       size: 'md', accent: 'yellow' },
        { emoji: '🧠', label: 'Smart',       size: 'lg', accent: 'blue'   },
        { emoji: '🔥', label: 'Hot',         size: 'sm', accent: 'orange' },
        { emoji: '🌊', label: 'Flow',        size: 'md', accent: 'teal'   },
        { emoji: '✨', label: 'Magic',       size: 'sm', accent: 'pink'   },
      ],
      accent: 'violet',
      w: 380, h: 180,
    };
  }

  component(shape) {
    const { title, items, accent: ac, w, h } = shape.props;
    const col  = accent(ac);
    const safe = Array.isArray(items)
      ? items.filter(i => i && typeof i === 'object').slice(0, 10)
      : [];

    const FONT_SIZES = { sm: 22, md: 32, lg: 44 };

    return (
      <HTMLContainer style={{
        width: w, height: h,
        background: `linear-gradient(135deg, ${col}14 0%, ${C_BG_CARD2} 70%)`,
        border: `1px solid ${col}33`,
        borderRadius: 16,
        boxSizing: 'border-box',
        boxShadow: `0 6px 30px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04)`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 14px 10px',
        fontFamily: FONT_BODY,
        pointerEvents: 'none',
        gap: 8,
      }}>
        {/* Title */}
        {title && (
          <div style={{
            fontSize: 9, fontWeight: 700, color: col,
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>{title}</div>
        )}

        {/* Emoji cloud — wrapping flex */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignContent: 'flex-start',
          flex: 1,
          overflow: 'hidden',
        }}>
          {safe.map((item, i) => {
            const icol   = accent(item?.accent || LEVEL_ACCENTS[i % LEVEL_ACCENTS.length]);
            const fSize  = FONT_SIZES[item?.size || 'md'] || 32;
            const delay  = (i * 0.18).toFixed(2);
            return (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 8px',
                borderRadius: 12,
                background: icol + '18',
                border: `1px solid ${icol}33`,
                boxShadow: `0 0 12px ${icol}22`,
                animation: `emojiFloat 4s ease-in-out ${delay}s infinite`,
              }}>
                <span style={{
                  fontSize: fSize, lineHeight: 1,
                  filter: `drop-shadow(0 2px 8px ${icol}55)`,
                  userSelect: 'none',
                }}>
                  {item?.emoji ?? ''}
                </span>
                {item?.label && (
                  <span style={{
                    fontSize: 8, fontWeight: 700,
                    color: icol,
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.04em',
                  }}>
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />;
  }
}

// ─── Export all custom shape utils ───────────────────────────────────────────
export const customShapeUtils = [
  HeroCardUtil,
  FeatureCardUtil,
  CodeCardUtil,
  ProcessCardUtil,
  NodeCardUtil,
  TableCardUtil,
  VideoCardUtil,
  StatCardUtil,
  QuoteCardUtil,
  CalloutCardUtil,
  TimelineCardUtil,
  CompareCardUtil,
  BadgeCardUtil,
  RadialCardUtil,
  GlowCardUtil,
  AvatarCardUtil,
  PillBannerUtil,
  StepCircleCardUtil,
  EmojiStickerUtil,
  ReactionBubbleUtil,
  EmojiCloudUtil,
];
