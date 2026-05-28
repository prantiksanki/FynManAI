import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { getSessionApi, updateSessionApi, saveSnapshotApi } from './services/canvasApi';
import { Tldraw, createShapeId } from 'tldraw';
import 'tldraw/tldraw.css';

import { useCanvasGeneration } from './hooks/useCanvasGeneration';
import { customShapeUtils } from './engine/customShapes';
import { useTimelineOrchestrator } from './hooks/useTimelineOrchestrator';
import { offsetTimeline } from './hooks/useCanvasOffset';
import { voiceEngine } from './services/voiceEngine';
import { useVoiceInput } from './hooks/useVoiceInput';
import { useAuth } from './context/AuthContext';
import './App.css';
import { MorphingSpinner } from './components/ui/morphing-spinner';
import { CanvasErrorBoundary } from './components/ui/CanvasErrorBoundary';

const SESSION_STRIDE = 880;

// ── Snapshot migration: strip v5-only props so tldraw v2 can load old snapshots ──
// v5 used `richText: { type, value }` on arrow/text/geo built-in shapes.
// v2 uses `text: string`. We strip richText and map it to text before loading.
function sanitizeSnapshot(snapshot) {
  if (!snapshot?.document?.store) return snapshot;
  const BUILTIN_TEXT_SHAPES = new Set(['arrow', 'text', 'geo', 'line', 'note', 'frame', 'draw']);
  const store = { ...snapshot.document.store };
  for (const [id, record] of Object.entries(store)) {
    if (record?.typeName !== 'shape') continue;
    if (!BUILTIN_TEXT_SHAPES.has(record.type)) continue;
    if (!record.props) continue;
    const props = { ...record.props };
    let changed = false;
    // richText was a {type,value} object in v5 — extract plain text and move to `text`
    if (props.richText !== undefined) {
      if (typeof props.richText === 'object' && props.richText !== null) {
        // v5 TipTap rich-text node: extract plain text from the paragraph nodes
        try {
          const paragraphs = props.richText?.content || [];
          const plain = paragraphs
            .flatMap(p => (p.content || []).map(n => n.text || ''))
            .join('\n');
          props.text = plain;
        } catch {
          props.text = '';
        }
      } else {
        props.text = String(props.richText || '');
      }
      delete props.richText;
      changed = true;
    }
    if (changed) {
      store[id] = { ...record, props };
    }
  }
  return {
    ...snapshot,
    document: { ...snapshot.document, store },
  };
}

function drawDivider(editor, yTop, label) {
  editor.createShape({
    id: createShapeId(), type: 'arrow', x: 30, y: yTop,
    props: { start: { x: 0, y: 0 }, end: { x: 1340, y: 0 }, color: 'grey', dash: 'dashed', size: 's', arrowheadStart: 'none', arrowheadEnd: 'none', text: '' },
  });
  editor.createShape({
    id: createShapeId(), type: 'text', x: 30, y: yTop + 8,
    props: { text: label, size: 's', font: 'sans', color: 'grey', w: 1000, autoSize: false, textAlign: 'start' },
  });
}

// ── Canvas dot-glow — only grid dots brighten near cursor ─────────────
const DOT_SPACING = 24; // must match CSS background-size
const GLOW_RADIUS = 72;

function CanvasGlow() {
  const canvasRef = useRef(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const rafRef    = useRef(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const parent = cvs.parentElement;

    // Keep canvas sized to parent
    const ro = new ResizeObserver(() => {
      cvs.width  = parent.offsetWidth;
      cvs.height = parent.offsetHeight;
    });
    ro.observe(parent);
    cvs.width  = parent.offsetWidth;
    cvs.height = parent.offsetHeight;

    const onMove = (e) => {
      const r = parent.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

    parent.addEventListener('mousemove', onMove);
    parent.addEventListener('mouseleave', onLeave);

    function draw() {
      const { x: mx, y: my } = mouseRef.current;
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      // Find grid dots within the glow radius
      const col0 = Math.floor((mx - GLOW_RADIUS) / DOT_SPACING);
      const col1 = Math.ceil ((mx + GLOW_RADIUS) / DOT_SPACING);
      const row0 = Math.floor((my - GLOW_RADIUS) / DOT_SPACING);
      const row1 = Math.ceil ((my + GLOW_RADIUS) / DOT_SPACING);

      for (let c = col0; c <= col1; c++) {
        for (let r = row0; r <= row1; r++) {
          const dx = c * DOT_SPACING - mx;
          const dy = r * DOT_SPACING - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > GLOW_RADIUS) continue;

          // Gaussian falloff — bright at centre, fades to zero at edge
          const t = 1 - dist / GLOW_RADIUS;
          const alpha = t * t * 0.35;

          const dotX = c * DOT_SPACING;
          const dotY = r * DOT_SPACING;

          // Soft halo
          const grad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 3);
          grad.addColorStop(0,   `rgba(255,255,255,${alpha})`);
          grad.addColorStop(1,   'rgba(255,255,255,0)');
          ctx.beginPath();
          ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Crisp core
          ctx.beginPath();
          ctx.arc(dotX, dotY, 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      parent.removeEventListener('mousemove', onMove);
      parent.removeEventListener('mouseleave', onLeave);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  );
}

// ── Typing cursor animation ────────────────────────────────────────────
function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center', marginLeft: '2px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: '4px', height: '4px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.5)',
          animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </span>
  );
}

export default function App() {
  const editorRef          = useRef(null);
  const sessionNumRef      = useRef(0);
  const yOffsetRef         = useRef(0);
  const chatEndRef         = useRef(null);
  const narrationBufRef    = useRef([]);   // collects lines during playback
  const shouldSnapshotRef  = useRef(false);

  const [editorReady,   setEditorReady]   = useState(false);
  const [currentVoice,  setCurrentVoice]  = useState('');
  const [sessionResult, setSessionResult] = useState(null);
  const [showStyle,     setShowStyle]     = useState(false);
  const [inputValue,    setInputValue]    = useState('');
  const [chatMessages,        setChatMessages]       = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);

  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [searchParams] = useSearchParams();
  const sessionId      = searchParams.get('session');
  const initialPrompt  = location.state?.initialPrompt || null;
  const autoSubmittedRef = useRef(false);

  const { generate, loading, error } = useCanvasGeneration();

  // Collect each narration line; show it live as currentVoice but don't log yet
  const handleVoice = useCallback((text) => {
    setCurrentVoice(text);
    setTimeout(() => setCurrentVoice(v => (v === text ? '' : v)), 8000);
    narrationBufRef.current.push(text);
  }, []);

  const { runTimeline, stop, isPlaying, progress } = useTimelineOrchestrator(editorRef, handleVoice);

  // When playback finishes, flush narration and capture canvas snapshot
  const prevIsPlayingRef = useRef(false);
  useEffect(() => {
    if (prevIsPlayingRef.current && !isPlaying) {
      const lines = narrationBufRef.current;
      if (lines.length > 0) {
        setChatMessages(prev => [...prev, { role: 'narration-full', lines: [...lines] }]);
        narrationBufRef.current = [];
      }
      if (shouldSnapshotRef.current && sessionId && sessionId !== 'new') {
        shouldSnapshotRef.current = false;
        const editor = editorRef.current;
        if (editor) {
          const snapshot = editor.getSnapshot();
          saveSnapshotApi(sessionId, snapshot).catch(err =>
            console.warn('[FynmanAI] Snapshot save failed:', err.message)
          );
        }
      }
    }
    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying, sessionId]);

  const handleMount = useCallback((editor) => {
    // One-time wipe of any stale tldraw v5 IndexedDB data so v2 starts clean.
    // Guarded by a localStorage flag so it only runs once per browser.
    if (!localStorage.getItem('tldraw_v2_clean')) {
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
        }).catch(() => {});
      }
      localStorage.setItem('tldraw_v2_clean', '1');
    }

    editorRef.current = editor;
    editor.setCamera({ x: 0, y: 0, z: 0.75 });
    setEditorReady(true);
  }, []);

  // Scroll chat to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentVoice]);

  const handleSubmit = useCallback(async (prompt) => {
    if (!prompt.trim()) return;
    const editor = editorRef.current;
    if (!editor) return;

    stop();
    voiceEngine.stop();

    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', text: prompt }]);

    const result = await generate(prompt, conversationHistory);
    if (!result?.timeline?.length) return;

    setSessionResult(result);

    // Add AI response summary to chat
    setChatMessages(prev => [...prev, {
      role: 'ai',
      text: result.title || 'Canvas generated.',
      intent: Array.isArray(result.intent) ? result.intent.join(' · ') : result.intent,
    }]);

    setConversationHistory(prev => [
      ...prev,
      { role: 'user',      content: prompt },
      { role: 'assistant', content: result.title || '' },
    ]);

    const yOffset    = yOffsetRef.current;
    const sessionNum = sessionNumRef.current;

    yOffsetRef.current    += SESSION_STRIDE;
    sessionNumRef.current += 1;

    if (sessionNum > 0) drawDivider(editor, yOffset - 48, `◈ Q${sessionNum + 1}: ${prompt}`);

    const intentStamped   = result.timeline.map(a => ({ ...a, _intent: result.intent }));
    const shiftedTimeline = offsetTimeline(intentStamped, yOffset);

    if (sessionId && sessionId !== 'new') {
      const title = prompt.length > 48 ? prompt.slice(0, 48).trimEnd() + '…' : prompt;
      updateSessionApi(sessionId, { title, prompt, timeline: result, yOffset }).catch(() => {});
    }

    setTimeout(() => {
      editor.centerOnPoint({ x: 700, y: yOffset + 380 }, { animation: { duration: 500 } });
    }, 150);

    if (sessionId && sessionId !== 'new') shouldSnapshotRef.current = true;
    runTimeline(shiftedTimeline);
  }, [generate, runTimeline, stop, sessionId, conversationHistory]);

  const replaySession = useCallback(async (prompts) => {
    for (const entry of prompts) {
      if (!entry.timeline?.timeline?.length) continue;
      const yOffset = entry.yOffset ?? yOffsetRef.current;
      if (yOffset >= yOffsetRef.current) {
        yOffsetRef.current    = yOffset + SESSION_STRIDE;
        sessionNumRef.current += 1;
      }
      const intentStamped = (entry.timeline.timeline || []).map(a => ({ ...a, _intent: entry.timeline?.intent }));
      const shifted = offsetTimeline(intentStamped, yOffset);
      if (sessionNumRef.current > 1 && editorRef.current) drawDivider(editorRef.current, yOffset - 48, `◈ ${entry.prompt}`);
      await runTimeline(shifted);
    }
    if (editorRef.current && yOffsetRef.current > 0) {
      editorRef.current.centerOnPoint({ x: 700, y: yOffsetRef.current - SESSION_STRIDE + 380 }, { animation: { duration: 500 } });
    }
  }, [runTimeline]);

  const restoreChatMessages = useCallback((prompts) => {
    const messages = [];
    const history  = [];
    for (const entry of prompts) {
      messages.push({ role: 'user', text: entry.prompt });
      const tl      = entry.timeline;
      const aiTitle = tl?.title || 'Canvas generated.';
      messages.push({
        role: 'ai',
        text: aiTitle,
        intent: Array.isArray(tl?.intent) ? tl.intent.join(' · ') : (tl?.intent || ''),
      });
      const voiceLines = (tl?.timeline || [])
        .filter(a => a.action === 'voice')
        .map(a => a.content)
        .filter(Boolean);
      if (voiceLines.length > 0) {
        messages.push({ role: 'narration-full', lines: voiceLines });
      }
      history.push({ role: 'user',      content: entry.prompt });
      history.push({ role: 'assistant', content: aiTitle });
    }
    setChatMessages(messages);
    setConversationHistory(history);
  }, []);

  useEffect(() => {
    if (!sessionId || sessionId === 'new' || !editorReady) return;
    getSessionApi(sessionId).then(data => {
      if (!data) return;
      if (data.canvasSnapshot) {
        const editor = editorRef.current;
        if (!editor) return;
        editor.loadSnapshot(sanitizeSnapshot(data.canvasSnapshot));
        if (data.prompts?.length) {
          const last = data.prompts[data.prompts.length - 1];
          yOffsetRef.current    = (last.yOffset ?? 0) + SESSION_STRIDE;
          sessionNumRef.current = data.prompts.length;
          setTimeout(() => {
            editor.centerOnPoint(
              { x: 700, y: (last.yOffset ?? 0) + 380 },
              { animation: { duration: 400 } }
            );
          }, 50);
        }
        restoreChatMessages(data.prompts);
      } else if (data.prompts?.length) {
        // Restore chat immediately so the sidebar shows history during replay
        restoreChatMessages(data.prompts);
        // Flag snapshot BEFORE replay so the isPlaying→false useEffect picks it up
        if (sessionId && sessionId !== 'new') {
          shouldSnapshotRef.current = true;
        }
        // Replay the timeline actions sequentially; save snapshot when isPlaying→false fires
        replaySession(data.prompts).catch(() => {});
      }
    }).catch(() => {});
  }, [sessionId, editorReady, replaySession, restoreChatMessages]);

  useEffect(() => {
    if (!editorReady || !initialPrompt || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    handleSubmit(initialPrompt);
  }, [editorReady, initialPrompt, handleSubmit]);

  const handleClear = useCallback(() => {
    stop(); voiceEngine.stop(); setCurrentVoice(''); setSessionResult(null);
    sessionNumRef.current = 0; yOffsetRef.current = 0;
    narrationBufRef.current = [];
    setChatMessages([]);
    setConversationHistory([]);
    const editor = editorRef.current;
    if (!editor) return;
    const allIds = editor.getCurrentPageShapeIds();
    if (allIds.size > 0) editor.deleteShapes([...allIds]);
    editor.setCamera({ x: 0, y: 0, z: 0.75 });
  }, [stop]);

  const handleStop = useCallback(() => {
    stop(); voiceEngine.stop(); setCurrentVoice('');
    narrationBufRef.current = [];
  }, [stop]);

  const handleLogout = useCallback(() => {
    stop(); voiceEngine.stop(); logout(); navigate('/');
  }, [stop, logout, navigate]);

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && editorReady && inputValue.trim()) {
        handleSubmit(inputValue.trim());
        setInputValue('');
      }
    }
  }

  const { listening: micListening, supported: micSupported, toggle: toggleMic } =
    useVoiceInput({ onTranscript: (text) => setInputValue(prev => (prev ? prev + ' ' : '') + text) });

  const pct = isPlaying && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const glowState = loading ? 'thinking' : currentVoice ? 'speaking' : 'idle';

  return (
    <div className="app-root">
      <style>{`
        /* Hide tldraw style panel unless toggled */
        .tlui-style-panel__wrapper { display: ${showStyle ? 'flex' : 'none'} !important; }

        @keyframes aiDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1; }
        }

        /* ══ Floating panel — three-state aurora glow ══ */
        @property --panel-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }

        /* Keyframes */
        @keyframes panelSpinFast { to { --panel-angle: 360deg; } }
        @keyframes panelSpinSlow { to { --panel-angle: 360deg; } }
        @keyframes panelPulse    { 0%,100%{opacity:0.75} 50%{opacity:1} }
        @keyframes idlePulse     { 0%,100%{opacity:0.22} 50%{opacity:0.38} }
        @keyframes speakWave     { 0%,100%{opacity:0.55} 40%{opacity:0.9} 70%{opacity:0.65} }

        @keyframes scanLineAcross{ 0%{left:-40%;opacity:0} 8%{opacity:1} 90%{opacity:0.7} 100%{left:110%;opacity:0} }
        @keyframes orbFloat1     { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(18px,-22px) scale(1.12)} 66%{transform:translate(-12px,14px) scale(0.92)} }
        @keyframes orbFloat2     { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-20px,16px) scale(1.08)} 70%{transform:translate(14px,-10px) scale(0.95)} }
        @keyframes orbFloat3     { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(10px,20px) scale(1.15)} }
        @keyframes msgSlideIn    { from{opacity:0;transform:translateX(-14px) translateY(4px)} to{opacity:1;transform:none} }

        @property --neon-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
        @keyframes neonSpin  { to { --neon-angle: 360deg; } }
        @keyframes neonPulse { 0%,100%{opacity:0.45} 50%{opacity:0.85} }

        .neon-input-wrap {
          position: relative;
          border-radius: 16px;
          padding: 1.5px;
          background: conic-gradient(from var(--neon-angle),
            #7c6af7 0%,  #4f8aff 18%, #14b8a6 36%,
            #a855f7 54%, #ec4899 72%, #7c6af7 100%
          );
          animation: neonSpin 3s linear infinite, neonPulse 2.4s ease-in-out infinite;
          box-shadow:
            0 0 8px  rgba(124,106,247,0.35),
            0 0 22px rgba(79,138,255,0.2),
            0 0 44px rgba(168,85,247,0.12);
        }
        .neon-input-wrap::before {
          content: '';
          position: absolute;
          inset: 1.5px;
          border-radius: 14.5px;
          background: #09090f;
          z-index: 0;
        }
        .neon-input-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 10px 10px 10px 14px;
          background: transparent;
          border-radius: 14px;
        }

        /* ── Outer wrap ── */
        .chat-panel-wrap {
          position: relative;
          width: 304px; min-width: 304px;
          height: 100%; flex-shrink: 0;
          background: #06060a;
        }

        /* ── Floating glass card — transitions on shadow+border for state changes ── */
        .chat-panel-inner {
          position: absolute;
          inset: 10px 0 10px 10px;
          border-radius: 18px;
          overflow: hidden;
          display: flex; flex-direction: column;
          background:
            linear-gradient(160deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 60%, transparent 100%),
            rgba(10, 8, 18, 0.82);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.09);
          z-index: 10;
          transition: box-shadow 0.7s ease, border-color 0.7s ease;
        }

        /* card shadow per state */
        [data-glow="idle"]     .chat-panel-inner {
          box-shadow:
            0 0 0 1px rgba(120,80,255,0.08),
            0 8px 32px rgba(0,0,0,0.55),
            0 2px 8px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.3);
        }
        [data-glow="thinking"] .chat-panel-inner {
          border-color: rgba(100,140,255,0.18);
          box-shadow:
            0 0 0 1px rgba(80,120,255,0.22),
            0 0 40px 8px rgba(60,100,255,0.18),
            0 8px 32px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.1),
            inset 0 -1px 0 rgba(0,0,0,0.3);
        }
        [data-glow="speaking"] .chat-panel-inner {
          border-color: rgba(200,100,255,0.22);
          box-shadow:
            0 0 0 1px rgba(180,80,255,0.2),
            0 0 36px 6px rgba(180,80,255,0.14),
            0 8px 32px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.3);
        }

        /* ── Aurora orbs — base ── */
        .chat-orb {
          position: absolute; border-radius: 50%;
          pointer-events: none; z-index: 0;
        }
        .chat-orb-1 {
          width: 200px; height: 200px; top: -40px; left: -60px;
          background: radial-gradient(circle, rgba(99,60,255,0.35) 0%, transparent 70%);
          filter: blur(50px);
          animation: orbFloat1 9s ease-in-out infinite;
          transition: opacity 0.7s, filter 0.7s;
        }
        .chat-orb-2 {
          width: 160px; height: 160px; bottom: 60px; right: -40px;
          background: radial-gradient(circle, rgba(0,140,255,0.28) 0%, transparent 70%);
          filter: blur(50px);
          animation: orbFloat2 11s ease-in-out infinite;
          transition: opacity 0.7s, filter 0.7s;
        }
        .chat-orb-3 {
          width: 130px; height: 130px; top: 45%; left: 20%;
          background: radial-gradient(circle, rgba(180,60,255,0.18) 0%, transparent 70%);
          filter: blur(50px);
          animation: orbFloat3 13s ease-in-out infinite;
          transition: opacity 0.7s, filter 0.7s;
        }

        /* orbs — thinking: faster, brighter, tighter blur */
        [data-glow="thinking"] .chat-orb-1 {
          filter: blur(38px); opacity: 1.0;
          animation-duration: 4s;
        }
        [data-glow="thinking"] .chat-orb-2 {
          filter: blur(35px); opacity: 1.0;
          animation-duration: 5s;
        }
        [data-glow="thinking"] .chat-orb-3 {
          filter: blur(32px); opacity: 1.0;
          animation-duration: 3.5s;
        }

        /* orbs — speaking: pink-violet-indigo, medium speed */
        [data-glow="speaking"] .chat-orb-1 {
          background: radial-gradient(circle, rgba(200,60,255,0.32) 0%, transparent 70%);
          filter: blur(46px); opacity: 0.9;
          animation-duration: 6s;
        }
        [data-glow="speaking"] .chat-orb-2 {
          background: radial-gradient(circle, rgba(80,60,255,0.28) 0%, transparent 70%);
          filter: blur(44px); opacity: 0.85;
          animation-duration: 8s;
        }
        [data-glow="speaking"] .chat-orb-3 {
          background: radial-gradient(circle, rgba(255,80,200,0.22) 0%, transparent 70%);
          filter: blur(40px); opacity: 0.8;
          animation-duration: 7s;
        }

        /* ── Border conic ring (panel-glow-fill) ── */
        .chat-panel-wrap .panel-glow-fill {
          position: absolute;
          inset: 10px 0 10px 10px;
          border-radius: 18px;
          pointer-events: none;
          z-index: 18;
          padding: 1.5px;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          transition: opacity 0.6s ease;
        }

        /* idle — dim, slow purple-blue spin */
        [data-glow="idle"] .panel-glow-fill {
          background: conic-gradient(
            from var(--panel-angle) at 50% 60%,
            transparent 0deg,
            rgba(100,60,255,0.45) 60deg,
            rgba(160,100,255,0.55) 120deg,
            rgba(60,80,255,0.35) 180deg,
            transparent 240deg
          );
          opacity: 0.55;
          animation: panelSpinSlow 10s linear infinite;
        }
        /* thinking — bright, fast, electric blue-cyan */
        [data-glow="thinking"] .panel-glow-fill {
          background: conic-gradient(
            from var(--panel-angle) at 50% 100%,
            transparent 0deg,
            rgba(40,120,255,0.9) 50deg,
            rgba(120,200,255,1) 100deg,
            rgba(200,80,255,0.85) 160deg,
            transparent 210deg
          );
          opacity: 1;
          animation: panelSpinFast 1.8s linear infinite, panelPulse 2s ease-in-out infinite;
        }
        /* speaking — violet-pink-indigo, medium speed */
        [data-glow="speaking"] .panel-glow-fill {
          background: conic-gradient(
            from var(--panel-angle) at 50% 80%,
            transparent 0deg,
            rgba(160,60,255,0.75) 55deg,
            rgba(255,80,200,0.9)  110deg,
            rgba(100,80,255,0.75) 165deg,
            transparent 215deg
          );
          opacity: 0.85;
          animation: panelSpinSlow 4s linear infinite, speakWave 1.8s ease-in-out infinite;
        }

        /* ── Inner radial fill (panel-glow-shimmer) ── */
        .chat-panel-wrap .panel-glow-shimmer {
          position: absolute;
          inset: 10px 0 10px 10px;
          border-radius: 18px;
          pointer-events: none;
          z-index: 9;
          transition: opacity 0.6s ease;
        }
        [data-glow="idle"] .panel-glow-shimmer {
          background: radial-gradient(
            ellipse 100% 45% at 50% 105%,
            rgba(100,60,255,0.14) 0%,
            rgba(80,40,200,0.07) 50%,
            transparent 75%
          );
          opacity: 1;
          animation: idlePulse 4s ease-in-out infinite;
        }
        [data-glow="thinking"] .panel-glow-shimmer {
          background: radial-gradient(
            ellipse 110% 55% at 50% 105%,
            rgba(60,80,255,0.28) 0%,
            rgba(100,60,255,0.15) 45%,
            transparent 72%
          );
          opacity: 1;
          animation: panelPulse 2s ease-in-out infinite;
        }
        [data-glow="speaking"] .panel-glow-shimmer {
          background: radial-gradient(
            ellipse 110% 55% at 50% 105%,
            rgba(180,60,255,0.20) 0%,
            rgba(255,80,180,0.10) 50%,
            transparent 75%
          );
          opacity: 1;
          animation: speakWave 1.8s ease-in-out infinite;
        }

        /* ── Sweep line (panel-glow-border) ── */
        .chat-panel-wrap .panel-glow-border {
          position: absolute;
          inset: 10px 0 10px 10px;
          border-radius: 18px;
          overflow: hidden;
          pointer-events: none;
          z-index: 19;
          transition: opacity 0.5s ease;
        }
        .chat-panel-wrap .panel-glow-border::after {
          content: '';
          position: absolute;
        }

        /* idle — no sweep line */
        [data-glow="idle"] .panel-glow-border { opacity: 0; }

        /* thinking — no scan line */
        [data-glow="thinking"] .panel-glow-border { opacity: 0; }

        /* speaking — horizontal wave left→right, pink-violet */
        [data-glow="speaking"] .panel-glow-border { opacity: 1; }
        [data-glow="speaking"] .panel-glow-border::after {
          top: 0; bottom: 0; left: -40%;
          width: 40%;
          background: linear-gradient(180deg, transparent 0%, rgba(200,80,255,0.14) 30%, rgba(255,120,220,0.24) 50%, rgba(200,80,255,0.14) 70%, transparent 100%);
          box-shadow: 4px 0 20px 4px rgba(180,80,255,0.20);
          animation: scanLineAcross 2s ease-in-out infinite;
        }

        /* ── Thin scrollbar ── */
        .chat-panel::-webkit-scrollbar { width: 3px; }
        .chat-panel::-webkit-scrollbar-track { background: transparent; }
        .chat-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

        /* ── Message animation ── */
        .ai-msg-in { animation: msgSlideIn 0.32s cubic-bezier(0.2,0,0,1) forwards; }
      `}</style>

      {/* ══════ TOP HEADER (minimal) ══════ */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: '44px', flexShrink: 0,
        background: '#0d0d0f',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        zIndex: 20,
      }}>
        {/* Left: back + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', padding: '4px 8px', borderRadius: '6px', transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: '5px' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Dashboard
          </button>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: '#fff', fontSize: '16px' }}>◈</span>
          <span style={{ fontWeight: 700, fontSize: '14px', fontFamily: 'monospace', background: 'linear-gradient(180deg,#fff 0%,#999 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>FynmanAI</span>
        </div>

        {/* Right: toolbar actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Progress pill when playing */}
          {isPlaying && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', animation: 'aiDot 1s ease-in-out infinite', display: 'inline-block' }} />
              Building canvas… {pct}%
            </div>
          )}

          {isPlaying && (
            <button onClick={handleStop} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(248,113,113,0.3)', fontSize: '12px', cursor: 'pointer', background: 'rgba(248,113,113,0.08)', color: '#f87171', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              ■ Stop
            </button>
          )}

          <button onClick={handleClear} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            Clear
          </button>

          <button
            onClick={() => setShowStyle(v => !v)}
            style={{ padding: '5px 12px', borderRadius: '6px', border: `1px solid ${showStyle ? 'rgba(124,106,247,0.6)' : 'rgba(255,255,255,0.1)'}`, fontSize: '12px', cursor: 'pointer', background: showStyle ? 'rgba(124,106,247,0.12)' : 'transparent', color: showStyle ? '#a78bfa' : 'rgba(255,255,255,0.45)', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px' }}
            onMouseEnter={e => { if (!showStyle) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; } }}
            onMouseLeave={e => { if (!showStyle) { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; } }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="5" r="2"/></svg>
            Style
          </button>

          {user && (
            <>
              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
              {user.picture && <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }} />}
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
              <button onClick={handleLogout} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.35)', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >Sign Out</button>
            </>
          )}
        </div>
      </header>

      {/* ══════ BODY: sidebar + canvas ══════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT CHAT PANEL ── */}
        <div className="chat-panel-wrap" data-glow={glowState}>
          {/* Aurora orbs behind the glass */}
          <div className="chat-orb chat-orb-1" />
          <div className="chat-orb chat-orb-2" />
          <div className="chat-orb chat-orb-3" />

          {/* Thinking glow layers */}
          <div className="panel-glow-fill" />
          <div className="panel-glow-shimmer" />
          <div className="panel-glow-border" />

          {/* ── Floating glass card ── */}
          <div className="chat-panel-inner">

            {/* Panel header */}
            <div style={{
              padding: '14px 16px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.055)',
              flexShrink: 0,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Pulsing live dot */}
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: loading ? '#a78bfa' : isPlaying ? '#4ade80' : 'rgba(255,255,255,0.2)',
                  boxShadow: loading ? '0 0 8px 2px rgba(167,139,250,0.6)' : isPlaying ? '0 0 8px 2px rgba(74,222,128,0.5)' : 'none',
                  display: 'inline-block',
                  transition: 'background 0.4s, box-shadow 0.4s',
                }} />
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', fontFamily: "'Syne', system-ui, sans-serif" }}>
                  Canvas Thread
                </span>
              </div>
              {chatMessages.length > 0 && (
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', fontVariantNumeric: 'tabular-nums' }}>
                  {chatMessages.length}
                </span>
              )}
            </div>

            {/* Messages */}
            <div
              className="chat-panel"
              style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {chatMessages.length === 0 && (
                <div style={{ padding: '32px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(120,80,255,0.25) 0%, transparent 70%)',
                    border: '1px solid rgba(120,80,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', opacity: 0.6,
                  }}>◈</div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', lineHeight: 1.7, margin: 0 }}>
                    Type a prompt below.<br />FynmanAI builds the canvas<br />and narrates it here.
                  </p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className="ai-msg-in" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>

                  {msg.role === 'user' ? (
                    <div style={{
                      maxWidth: '88%', padding: '9px 13px',
                      borderRadius: '14px 14px 4px 14px',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.06) 100%)',
                      border: '1px solid rgba(255,255,255,0.11)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                      fontSize: '13px', color: '#ececec', lineHeight: 1.55,
                    }}>
                      {msg.text}
                    </div>

                  ) : msg.role === 'narration-full' ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '50%',
                          background: 'linear-gradient(135deg,rgba(74,222,128,0.5),rgba(74,222,128,0.2))',
                          border: '1px solid rgba(74,222,128,0.35)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', flexShrink: 0,
                        }}>♪</div>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(74,222,128,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Full Narration</span>
                      </div>
                      <div style={{
                        padding: '11px 13px', borderRadius: '4px 14px 14px 14px',
                        background: 'linear-gradient(160deg, rgba(74,222,128,0.05) 0%, rgba(74,222,128,0.02) 100%)',
                        border: '1px solid rgba(74,222,128,0.1)',
                        fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, fontStyle: 'italic',
                      }}>
                        {msg.lines.map((line, j) => (
                          <p key={j} style={{ margin: j > 0 ? '7px 0 0' : 0 }}>{line}</p>
                        ))}
                      </div>
                    </div>

                  ) : (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: 'linear-gradient(135deg,rgba(124,106,247,0.7),rgba(80,160,255,0.4))',
                          border: '1px solid rgba(124,106,247,0.35)',
                          boxShadow: '0 0 8px rgba(124,106,247,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', flexShrink: 0,
                        }}>◈</div>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>FynmanAI</span>
                        {msg.intent && (
                          <span style={{
                            fontSize: '9px', padding: '2px 7px', borderRadius: '999px',
                            background: 'rgba(124,106,247,0.14)', border: '1px solid rgba(124,106,247,0.25)',
                            color: '#a78bfa',
                          }}>{msg.intent}</span>
                        )}
                      </div>
                      <div style={{
                        padding: '10px 13px', borderRadius: '4px 14px 14px 14px',
                        background: 'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                        fontSize: '13px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.65,
                        fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 600,
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Live voice narration */}
              {currentVoice && (
                <div className="ai-msg-in" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: 'linear-gradient(135deg,rgba(74,222,128,0.5),rgba(74,222,128,0.2))',
                      border: '1px solid rgba(74,222,128,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', flexShrink: 0,
                    }}>♪</div>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(74,222,128,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Speaking</span>
                  </div>
                  <div style={{
                    padding: '10px 13px', borderRadius: '4px 14px 14px 14px',
                    background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.1)',
                    fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, fontStyle: 'italic',
                  }}>
                    {currentVoice}
                  </div>
                </div>
              )}

              {/* Thinking indicator */}
              {loading && (
                <div className="ai-msg-in" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 2px' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'linear-gradient(135deg,rgba(124,106,247,0.7),rgba(80,160,255,0.4))',
                    border: '1px solid rgba(124,106,247,0.35)',
                    boxShadow: '0 0 10px rgba(124,106,247,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', flexShrink: 0,
                  }}>◈</div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Thinking</span>
                  <TypingDots />
                </div>
              )}

              {error && (
                <div style={{
                  padding: '10px 13px', borderRadius: '10px',
                  background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)',
                  fontSize: '12px', color: '#f87171',
                }}>
                  ⚠ {error}
                </div>
              )}

              <div ref={chatEndRef} style={{ height: '14px' }} />
            </div>

            {/* ── Input box ── */}
            <div style={{
              padding: '10px 12px 12px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              flexShrink: 0,
              background: 'linear-gradient(0deg, rgba(0,0,0,0.25) 0%, transparent 100%)',
            }}>
              <div className="neon-input-wrap">
              <div className="neon-input-inner">
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask anything…"
                  disabled={loading || !editorReady}
                  autoFocus
                  rows={1}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#f0f0f0', fontSize: '13px', fontFamily: 'inherit',
                    resize: 'none', lineHeight: 1.5, maxHeight: '96px', overflowY: 'auto',
                    caretColor: '#a78bfa',
                  }}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
                  }}
                />
                {micSupported && (
                  <button
                    onClick={toggleMic}
                    disabled={loading || !editorReady}
                    title={micListening ? 'Stop recording' : 'Speak to input'}
                    style={{
                      width: '30px', height: '30px', borderRadius: '9px', border: 'none', flexShrink: 0,
                      background: micListening
                        ? 'linear-gradient(135deg,#f87171 0%,#ef4444 100%)'
                        : 'rgba(255,255,255,0.06)',
                      color: micListening ? '#fff' : 'rgba(255,255,255,0.35)',
                      cursor: loading || !editorReady ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                      boxShadow: micListening ? '0 0 14px rgba(248,113,113,0.55)' : 'none',
                    }}
                  >
                    {micListening ? (
                      /* recording: filled mic with pulse */
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <rect x="9" y="2" width="6" height="13" rx="3"/>
                        <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      /* idle: outline mic */
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="9" y="2" width="6" height="13" rx="3"/>
                        <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8"/>
                      </svg>
                    )}
                  </button>
                )}
                <button
                  onClick={() => { if (!loading && editorReady && inputValue.trim()) { handleSubmit(inputValue.trim()); setInputValue(''); } }}
                  disabled={loading || !editorReady || !inputValue.trim()}
                  style={{
                    width: '30px', height: '30px', borderRadius: '9px', border: 'none', flexShrink: 0,
                    background: inputValue.trim() && !loading
                      ? 'linear-gradient(135deg,#a78bfa 0%,#7c6af7 50%,#4f8aff 100%)'
                      : 'rgba(255,255,255,0.06)',
                    color: inputValue.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.2)',
                    cursor: inputValue.trim() && !loading ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.25s, color 0.25s, box-shadow 0.25s',
                    boxShadow: inputValue.trim() && !loading ? '0 0 16px rgba(124,106,247,0.5), 0 2px 8px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  {loading
                    ? <MorphingSpinner size="sm" />
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                  }
                </button>
              </div>{/* end neon-input-inner */}
              </div>{/* end neon-input-wrap */}
            </div>
          </div>{/* end chat-panel-inner */}
        </div>{/* end chat-panel-wrap */}

        {/* ── CANVAS ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <CanvasGlow />
          <CanvasErrorBoundary>
          <Tldraw
            colorScheme="dark"
            shapeUtils={customShapeUtils}
            onMount={handleMount}
            onError={(error) => {
              console.error('[FynmanAI] Tldraw internal error:', error);
            }}
          />
          </CanvasErrorBoundary>
          {loading && (
            <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 18px', borderRadius: '999px', background: 'rgba(13,13,15,0.9)', border: '1px solid rgba(124,106,247,0.3)', backdropFilter: 'blur(12px)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', animation: 'aiDot 0.8s ease-in-out infinite', display: 'inline-block' }} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>Thinking visually…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
