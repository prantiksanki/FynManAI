import { BaseBoxShapeUtil, HTMLContainer, T } from 'tldraw';

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

function indicatorPath(w, h) {
  const p = new Path2D();
  p.rect(0, 0, w, h);
  return p;
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

  getIndicatorPath(shape) {
    return indicatorPath(shape.props.w, shape.props.h);
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

  getIndicatorPath(shape) {
    return indicatorPath(shape.props.w, shape.props.h);
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

  getIndicatorPath(shape) {
    return indicatorPath(shape.props.w, shape.props.h);
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

  getIndicatorPath(shape) {
    return indicatorPath(shape.props.w, shape.props.h);
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

  getIndicatorPath(shape) {
    return indicatorPath(shape.props.w, shape.props.h);
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

  getIndicatorPath(shape) {
    return indicatorPath(shape.props.w, shape.props.h);
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
];
