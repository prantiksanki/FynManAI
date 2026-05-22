import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../services/sessionStorage';
import { createSessionApi, getSessionsApi, deleteSessionApi } from '../services/canvasApi';
import { useVoiceInput } from '../hooks/useVoiceInput';
import {
  TrendingUp, BarChart2, PieChart, Wallet, Layers, ArrowUpRight,
  Plus, LogOut, Trash2, Sparkles, Send, PanelLeftClose, PanelLeftOpen,
  Clock, MessageSquare,
} from 'lucide-react';

// ── Auto-resize textarea hook ─────────────────────────────────────────────────
function useAutoResize({ minHeight = 56, maxHeight = 180 } = {}) {
  const ref = useRef(null);
  const adjust = useCallback((reset) => {
    const el = ref.current;
    if (!el) return;
    if (reset) { el.style.height = `${minHeight}px`; return; }
    el.style.height = `${minHeight}px`;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [minHeight, maxHeight]);
  useEffect(() => { if (ref.current) ref.current.style.height = `${minHeight}px`; }, [minHeight]);
  return { ref, adjust };
}

const QUICK_ACTIONS = [
  { icon: TrendingUp,   label: 'How does a neural network learn?' },
  { icon: BarChart2,    label: 'Explain the Greek gods and their powers' },
  { icon: PieChart,     label: 'How does the human immune system work?' },
  { icon: Layers,       label: 'What is the Big Bang theory?' },
  { icon: Wallet,       label: 'How does blockchain work?' },
  { icon: ArrowUpRight, label: 'Explain the water cycle' },
];

const COLLAPSED_W = 56;
const EXPANDED_W  = 260;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions]               = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [prompt, setPrompt]                   = useState('');
  const [hoveredItem, setHoveredItem]         = useState(null);
  const [focused, setFocused]                 = useState(false);
  const [collapsed, setCollapsed]             = useState(false);
  const [animating, setAnimating]             = useState(false);
  const { ref: textareaRef, adjust }          = useAutoResize({ minHeight: 56, maxHeight: 180 });

  const { listening: micListening, supported: micSupported, toggle: toggleMic } =
    useVoiceInput({ onTranscript: (text) => { setPrompt(prev => (prev ? prev + ' ' : '') + text); adjust(); } });

  // Animated orb mouse tracking
  const orbRef   = useRef(null);
  const orbRef2  = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const orbPos   = useRef({ x: 50, y: 50 });
  const orbPos2  = useRef({ x: 60, y: 40 });
  const rafId    = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      const el = document.getElementById('dash-main');
      if (!el) return;
      const r = el.getBoundingClientRect();
      mousePos.current = {
        x: ((e.clientX - r.left) / r.width)  * 100,
        y: ((e.clientY - r.top)  / r.height) * 100,
      };
    };
    window.addEventListener('mousemove', onMove);
    function tick() {
      const lerp = (a, b, t) => a + (b - a) * t;
      orbPos.current.x  = lerp(orbPos.current.x,  mousePos.current.x,       0.035);
      orbPos.current.y  = lerp(orbPos.current.y,  mousePos.current.y,       0.035);
      orbPos2.current.x = lerp(orbPos2.current.x, 100 - mousePos.current.x, 0.02);
      orbPos2.current.y = lerp(orbPos2.current.y, 100 - mousePos.current.y, 0.02);
      if (orbRef.current)  { orbRef.current.style.left  = `${orbPos.current.x}%`;  orbRef.current.style.top  = `${orbPos.current.y}%`; }
      if (orbRef2.current) { orbRef2.current.style.left = `${orbPos2.current.x}%`; orbRef2.current.style.top = `${orbPos2.current.y}%`; }
      rafId.current = requestAnimationFrame(tick);
    }
    rafId.current = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(rafId.current); };
  }, []);

  useEffect(() => {
    if (!user?.sub) return;
    setLoadingSessions(true);
    getSessionsApi(user.sub)
      .then(setSessions).catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false));
  }, [user?.sub]);

  function toggleSidebar() {
    setAnimating(true);
    setCollapsed(v => !v);
    setTimeout(() => setAnimating(false), 400);
  }

  async function handleNewCanvas(promptText) {
    const text = (promptText || prompt).trim();
    if (!text) return;
    const title = text.length > 48 ? text.slice(0, 48).trimEnd() + '…' : text;
    const { sessionId } = await createSessionApi(user.sub, title);
    navigate(`/canvas?session=${sessionId}`, { state: { initialPrompt: text } });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNewCanvas(); }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    await deleteSessionApi(id);
    setSessions(prev => prev.filter(s => s.sessionId !== id));
  }

  const firstName = user?.name?.split(' ')[0] || 'there';
  const sidebarW  = collapsed ? COLLAPSED_W : EXPANDED_W;

  return (
    <>
      {/* Inject sidebar transition styles */}
      <style>{`
        .db-sidebar {
          transition: width 0.38s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: width;
        }
        .db-fade-text {
          transition: opacity 0.18s ease, transform 0.22s ease;
        }
        .db-sidebar.collapsed .db-fade-text {
          opacity: 0;
          pointer-events: none;
          transform: translateX(-6px);
        }
        .db-sidebar:not(.collapsed) .db-fade-text {
          opacity: 1;
          transform: translateX(0);
        }
        .db-toggle-btn {
          transition: transform 0.38s cubic-bezier(0.4,0,0.2,1), background 0.15s;
        }
        .db-toggle-btn:hover { background: rgba(255,255,255,0.08) !important; }

        .db-session-item {
          transition: background 0.12s, padding 0.38s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
          white-space: nowrap;
        }
        .db-new-btn {
          transition: width 0.38s cubic-bezier(0.4,0,0.2,1), background 0.15s, filter 0.15s;
          overflow: hidden;
          white-space: nowrap;
        }
        /* Ripple on toggle */
        @keyframes db-ripple {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.35; }
          100% { transform: translate(-50%,-50%) scale(4); opacity: 0; }
        }
        .db-ripple {
          position: absolute; width: 60px; height: 60px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          animation: db-ripple 0.5s ease-out forwards;
          pointer-events: none;
        }

        /* Thin scroll for session list */
        .db-session-list::-webkit-scrollbar { width: 3px; }
        .db-session-list::-webkit-scrollbar-track { background: transparent; }
        .db-session-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      <div style={{ display: 'flex', height: '100%', width: '100%', background: '#000000', color: '#f0f0f0', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' }}>

        {/* ══════════════ SIDEBAR ══════════════ */}
        <aside
          className={`db-sidebar${collapsed ? ' collapsed' : ''}`}
          style={{
            width: `${sidebarW}px`,
            minWidth: `${sidebarW}px`,
            height: '100%',
            background: 'rgba(255,255,255,0.025)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backdropFilter: 'blur(12px)',
            position: 'relative',
          }}
        >
          {/* ── Top: brand + toggle ── */}
          <div style={{
            padding: collapsed ? '14px 0' : '16px 12px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: '8px',
            transition: 'padding 0.38s cubic-bezier(0.4,0,0.2,1)',
            minHeight: '64px',
          }}>
            {/* Brand — hidden when collapsed */}
            {!collapsed && (
              <div className="db-fade-text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', color: '#ffffff', flexShrink: 0 }}>◈</span>
                <span style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'monospace', background: 'linear-gradient(180deg,#fff 0%,#999 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>FinAI</span>
              </div>
            )}

            {/* Toggle button */}
            <button
              className="db-toggle-btn"
              onClick={toggleSidebar}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '8px',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.45)',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
              }}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed
                ? <PanelLeftOpen  size={15} />
                : <PanelLeftClose size={15} />
              }
            </button>
          </div>

          {/* ── New canvas button ── */}
          <div style={{
            padding: collapsed ? '10px 0' : '10px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'center',
            transition: 'padding 0.38s cubic-bezier(0.4,0,0.2,1)',
          }}>
            <button
              className="db-new-btn"
              onClick={() => navigate('/canvas?session=new')}
              style={{
                width: collapsed ? '32px' : '100%',
                height: '32px',
                padding: collapsed ? '0' : '0 12px',
                borderRadius: '8px',
                background: 'linear-gradient(180deg,#ffffff 0%,#b0b0b0 100%)',
                color: '#000',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 0 16px rgba(255,255,255,0.1)',
                letterSpacing: '-0.01em',
                flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
              title="New Canvas"
            >
              <Plus size={14} style={{ flexShrink: 0 }} />
              {!collapsed && <span className="db-fade-text">New Canvas</span>}
            </button>
          </div>

          {/* ── Session list ── */}
          <div
            className="db-session-list"
            style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '8px 0' : '8px 6px' }}
          >
            {!collapsed && (
              <>
                {loadingSessions ? (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)', padding: '16px 10px', textAlign: 'center' }}>Loading…</p>
                ) : sessions.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)', padding: '16px 10px', textAlign: 'center', lineHeight: 1.6 }}>No canvases yet.<br />Start one below!</p>
                ) : (
                  <>
                    <div className="db-fade-text" style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 8px 4px' }}>Recent</div>
                    {sessions.map(s => (
                      <div
                        key={s.sessionId}
                        className="db-session-item db-fade-text"
                        style={{
                          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                          padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
                          marginBottom: '2px', gap: '8px',
                          background: hoveredItem === s.sessionId ? 'rgba(255,255,255,0.05)' : 'transparent',
                        }}
                        onClick={() => navigate(`/canvas?session=${s.sessionId}`)}
                        onMouseEnter={() => setHoveredItem(s.sessionId)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '13px', color: '#f0f0f0', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', marginTop: '2px' }}>{timeAgo(s.updatedAt)}</div>
                        </div>
                        <button
                          style={{
                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                            cursor: 'pointer', padding: '2px', flexShrink: 0,
                            opacity: hoveredItem === s.sessionId ? 1 : 0,
                            transition: 'opacity 0.12s', display: 'flex', alignItems: 'center',
                          }}
                          onClick={(e) => handleDelete(e, s.sessionId)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {/* Collapsed: show icon-only session dots */}
            {collapsed && sessions.map(s => (
              <div
                key={s.sessionId}
                onClick={() => navigate(`/canvas?session=${s.sessionId}`)}
                title={s.title}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '8px',
                  margin: '2px auto', cursor: 'pointer',
                  background: hoveredItem === s.sessionId ? 'rgba(255,255,255,0.08)' : 'transparent',
                  transition: 'background 0.12s',
                  color: 'rgba(255,255,255,0.35)',
                }}
                onMouseEnter={() => setHoveredItem(s.sessionId)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <MessageSquare size={14} />
              </div>
            ))}
          </div>

          {/* ── User ── */}
          <div style={{
            padding: collapsed ? '10px 0' : '12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '10px',
            transition: 'padding 0.38s cubic-bezier(0.4,0,0.2,1)',
          }}>
            {user?.picture ? (
              <img src={user.picture} alt={user.name} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} referrerPolicy="no-referrer" />
            ) : (
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {firstName[0]}
              </div>
            )}
            {!collapsed && (
              <>
                <span className="db-fade-text" style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</span>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="db-fade-text"
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.15s', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
            {/* Sign out in collapsed mode as icon below avatar */}
            {collapsed && (
              <button
                onClick={() => { logout(); navigate('/'); }}
                style={{
                  position: 'absolute', bottom: '52px', left: '50%', transform: 'translateX(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)',
                  cursor: 'pointer', padding: '4px', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            )}
          </div>
        </aside>

        {/* ══════════════ MAIN ══════════════ */}
        <main
          id="dash-main"
          style={{
            flex: 1, height: '100%', position: 'relative',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '48px 24px', overflow: 'hidden',
            transition: 'padding-left 0.38s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* ── Animated orbs ── */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div ref={orbRef} style={{ position: 'absolute', left: '50%', top: '45%', width: 'min(700px,80vw)', height: 'min(700px,80vw)', borderRadius: '50%', background: 'radial-gradient(circle at center, rgba(180,180,255,0.13) 0%, rgba(120,120,255,0.07) 35%, transparent 70%)', filter: 'blur(40px)', transform: 'translate(-50%,-50%)', willChange: 'left,top' }} />
            <div ref={orbRef2} style={{ position: 'absolute', left: '60%', top: '40%', width: 'min(500px,60vw)', height: 'min(500px,60vw)', borderRadius: '50%', background: 'radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, rgba(200,200,255,0.04) 40%, transparent 70%)', filter: 'blur(60px)', transform: 'translate(-50%,-50%)', willChange: 'left,top' }} />
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: '600px', height: '300px', borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)', filter: 'blur(80px)', transform: 'translate(-50%,-50%)' }} />
          </div>

          {/* ── Greeting ── */}
          <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '5px 16px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Sparkles size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>FinAI Canvas</span>
            </div>
            <h1 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '12px' }}>
              <span style={{ background: 'linear-gradient(180deg,#ffffff 0%,#888888 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Good to see you, {firstName}.
              </span>
            </h1>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.38)', fontWeight: 400 }}>
              What would you like to visualize today?
            </p>
          </div>

          {/* ── Input box ── */}
          <div style={{
            width: '100%', maxWidth: '680px', position: 'relative', zIndex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${focused ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.09)'}`,
            borderRadius: '16px',
            backdropFilter: 'blur(20px)',
            boxShadow: focused ? '0 0 0 1px rgba(255,255,255,0.08), 0 8px 48px rgba(0,0,0,0.5)' : '0 4px 32px rgba(0,0,0,0.4)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            overflow: 'hidden',
          }}>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => { setPrompt(e.target.value); adjust(); }}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Describe anything — a concept, a plan, a financial idea…"
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f0', fontSize: '15px', fontFamily: 'inherit', resize: 'none', lineHeight: 1.65, padding: '20px 20px 0', minHeight: '56px', boxSizing: 'border-box', caretColor: '#ffffff' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 14px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.02em' }}>Enter to send · Shift+Enter for newline</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {micSupported && (
                <button
                  onClick={toggleMic}
                  title={micListening ? 'Stop recording' : 'Speak to input'}
                  style={{
                    width: '34px', height: '34px', borderRadius: '10px', border: 'none',
                    background: micListening
                      ? 'linear-gradient(135deg,#f87171 0%,#ef4444 100%)'
                      : 'rgba(255,255,255,0.06)',
                    color: micListening ? '#fff' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                    boxShadow: micListening ? '0 0 14px rgba(248,113,113,0.55)' : 'none',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { if (!micListening) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={e => { if (!micListening) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                >
                  {micListening ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <rect x="9" y="2" width="6" height="13" rx="3"/>
                      <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="2" width="6" height="13" rx="3"/>
                      <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8"/>
                    </svg>
                  )}
                </button>
              )}
              <button
                onClick={() => handleNewCanvas()}
                disabled={!prompt.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 20px', borderRadius: '10px',
                  background: prompt.trim() ? 'linear-gradient(180deg,#ffffff 0%,#b0b0b0 100%)' : 'rgba(255,255,255,0.07)',
                  color: prompt.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                  border: 'none', cursor: prompt.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 700,
                  boxShadow: prompt.trim() ? '0 0 20px rgba(255,255,255,0.15)' : 'none',
                  transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => { if (prompt.trim()) e.currentTarget.style.filter = 'brightness(1.08)'; }}
                onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
              >
                <Send size={13} />
                Visualize
              </button>
              </div>
            </div>
          </div>

          {/* ── Quick action chips ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '680px', marginTop: '20px', position: 'relative', zIndex: 1 }}>
            {QUICK_ACTIONS.map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => handleNewCanvas(label)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '8px 16px', borderRadius: '999px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
