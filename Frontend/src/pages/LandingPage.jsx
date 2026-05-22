import { useState } from 'react';
import AuthModal from './AuthModal';
import { SimpleHeader } from '@/components/ui/simple-header';
import { Hero } from '@/components/ui/hero-1';
import { LogoCloud } from '@/components/ui/logo-cloud-3';
import { Footer } from '@/components/ui/footer';
import FlowArt, { FlowSection } from '@/components/ui/story-scroll';
import './LandingPage.css';

// ── Design tokens — pure monochrome ──────────────────────────────────────────
const C = {
  bg0:      '#000000',
  bg1:      '#080808',
  bg2:      '#0f0f0f',
  bg3:      '#141414',
  border:   'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,255,255,0.18)',
  dim:      'rgba(255,255,255,0.18)',
  muted:    'rgba(255,255,255,0.38)',
  body:     'rgba(255,255,255,0.55)',
  text:     '#f0f0f0',
  white:    '#ffffff',
  gSilver:  'linear-gradient(180deg, #ffffff 0%, #888888 100%)',
  gGhost:   'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%)',
  gRule:    'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
};

const LOGOS = [
  { name: 'Goldman Sachs',  icon: '◆' },
  { name: 'Bloomberg',      icon: '◈' },
  { name: 'OpenAI',         icon: '✦' },
  { name: 'Stripe',         icon: '⬡' },
  { name: 'Sequoia',        icon: '◉' },
  { name: 'BlackRock',      icon: '◼' },
  { name: 'Anthropic',      icon: '⬢' },
  { name: 'Morgan Stanley', icon: '◆' },
  { name: 'JPMorgan',       icon: '◈' },
  { name: 'Fidelity',       icon: '✦' },
];

const FEATURES = [
  { icon: '◈', title: 'AI-Powered Canvas',  body: 'Describe anything in plain language and watch a rich visual canvas materialize in real time.' },
  { icon: '⬡', title: 'Voice Narration',    body: 'Every canvas comes alive with synchronized voice narration that guides you through the content.' },
  { icon: '∞', title: 'Multi-Session',      body: 'Stack unlimited sessions on the same infinite canvas. Your whole thinking space, always in view.' },
  { icon: '◉', title: 'Live Charts',        body: 'Dynamic charts generated from your prompt — always accurate, always current.' },
  { icon: '◼', title: 'Private & Secure',   body: 'Your financial data stays yours. Encrypted, per-user, always secure.' },
  { icon: '◆', title: 'Any Device',         body: 'Full fidelity on desktop, tablet, and mobile. Your canvas follows you everywhere.' },
];

const Rule = () => (
  <div style={{ height: '1px', background: C.gRule, width: '100%', flexShrink: 0 }} />
);

function Label({ n, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.25em', color: C.muted }}>{n}</span>
      <div style={{ height: '1px', width: '32px', background: C.border }} />
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.muted }}>{text}</span>
    </div>
  );
}

// ── Inline canvas preview — always visible, no network dependency ─────────────
function CanvasPreview() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0d0d10',
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
      display: 'flex', overflow: 'hidden', position: 'relative',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Left chat panel */}
      <div style={{
        width: '22%', minWidth: '100px', height: '100%', flexShrink: 0,
        background: 'rgba(10,8,18,0.9)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column', padding: '10px 8px', gap: '7px',
      }}>
        <div style={{ fontSize: '7px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '4px' }}>Canvas Thread</div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px 8px 2px 8px', padding: '5px 7px', fontSize: '6.5px', color: '#e0e0e0', lineHeight: 1.4 }}>
          Explain binary search
        </div>
        <div style={{ maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(124,106,247,0.7),rgba(80,160,255,0.4))', border: '1px solid rgba(124,106,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', flexShrink: 0 }}>◈</div>
            <span style={{ fontSize: '6px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>FinAI</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px 8px 8px 8px', padding: '5px 7px', fontSize: '6.5px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            Binary Search Algorithm
          </div>
        </div>
        <div style={{ borderRadius: '2px 8px 8px 8px', background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.1)', padding: '5px 7px', fontSize: '6px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, fontStyle: 'italic' }}>
          Binary search divides the sorted array in half each step, achieving O(log n) time…
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Hero card */}
        <div style={{
          position: 'absolute', top: '10%', left: '3%', width: '44%',
          background: 'linear-gradient(135deg, rgba(124,106,247,0.18) 0%, rgba(80,160,255,0.1) 100%)',
          border: '1px solid rgba(124,106,247,0.3)', borderRadius: '10px', padding: '10px 12px',
        }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '4px' }}>Binary Search</div>
          <div style={{ fontSize: '6.5px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>O(log n) · Sorted arrays · Divide &amp; conquer</div>
        </div>

        {/* Flow nodes */}
        {[
          { top: '46%', left: '3%',  label: 'Start', accent: 'rgba(74,222,128,0.7)' },
          { top: '46%', left: '26%', label: 'Mid?',  accent: 'rgba(167,139,250,0.8)' },
          { top: '46%', left: '49%', label: 'Left',  accent: 'rgba(96,165,250,0.8)' },
          { top: '46%', left: '72%', label: 'Right', accent: 'rgba(251,146,60,0.8)' },
        ].map(({ top, left, label, accent }) => (
          <div key={label} style={{
            position: 'absolute', top, left,
            width: '14%', padding: '5px 0', borderRadius: '6px',
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '6.5px', fontWeight: 700, color: accent,
          }}>{label}</div>
        ))}

        {/* SVG connector lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {[[17, 49, 26, 49], [40, 49, 49, 49], [63, 49, 72, 49]].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
              stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 2" />
          ))}
        </svg>

        {/* Stat cards */}
        {[
          { v: 'O(log n)', l: 'Time', left: '3%' },
          { v: 'O(1)',     l: 'Space', left: '30%' },
          { v: '50%',     l: 'Reduction', left: '57%' },
        ].map(({ v, l, left }) => (
          <div key={l} style={{
            position: 'absolute', bottom: '8%', left,
            width: '22%', padding: '6px 8px', borderRadius: '7px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{v}</div>
            <div style={{ fontSize: '5.5px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab]   = useState('signup');

  function openSignup() { setAuthTab('signup'); setShowAuth(true); }
  function openLogin()  { setAuthTab('login');  setShowAuth(true); }

  return (
    <div className="landing-root">
      <div className="landing-mesh" aria-hidden="true">
        <div className="mesh-orb mesh-orb--1" />
        <div className="mesh-orb mesh-orb--2" />
        <div className="mesh-orb mesh-orb--3" />
      </div>

      <SimpleHeader onSignIn={openLogin} onGetStarted={openSignup} />

      <Hero
        eyebrow="Prompt · Visualize · Understand"
        title="Prompt. Visualize. Understand."
        subtitle="Describe any financial concept in plain words — FinAI builds a live, interactive canvas in seconds."
        ctaLabel="Start for Free"
        onCtaClick={openSignup}
      />

      <FlowArt aria-label="FinAI Features">

        {/* ══ CARD 1 — TRUSTED BY ══ */}
        <FlowSection aria-label="Trusted by leaders" style={{ background: C.bg1, color: C.text }}>
          <Label n="01" text="Trusted by leaders" />
          <Rule />

          <div style={{
            fontSize: 'clamp(3.5rem, 10vw, 11rem)',
            fontWeight: 900, lineHeight: 0.86,
            letterSpacing: '-0.05em', textTransform: 'uppercase',
          }}>
            <div style={{ color: C.white }}>The world's</div>
            <div>
              <span style={{ background: C.gSilver, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                sharpest minds
              </span>
            </div>
            <div style={{ color: C.dim }}>trust FinAI.</div>
          </div>

          <Rule />

          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, marginBottom: '28px' }}>
              Backed by institutions. Loved by individuals.
            </p>
            <LogoCloud logos={LOGOS} />
          </div>

          <Rule />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '24px' }}>
            <p style={{ fontSize: 'clamp(15px, 1.6vw, 20px)', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.75, color: C.body, maxWidth: '48ch' }}>
              "From hedge funds to first-time investors — FinAI translates every level of financial complexity into language you actually understand."
            </p>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1 }}>
                <span style={{ background: C.gSilver, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>10K+</span>
              </div>
              <div style={{ fontSize: '10px', color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '6px' }}>users worldwide</div>
            </div>
          </div>
        </FlowSection>

        {/* ══ CARD 2 — PRODUCT PREVIEW ══ */}
        <FlowSection aria-label="See it in action" style={{ background: C.bg0, color: C.text }}>
          {/* Subtle glow behind mockup */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', width: '80vw', height: '50vw',
              background: 'radial-gradient(circle, rgba(255,255,255,0.04), transparent 65%)',
              bottom: 0, left: '50%', transform: 'translateX(-50%)',
              borderRadius: '50%', filter: 'blur(60px)',
            }} />
          </div>

          <Label n="02" text="See it in action" />
          <Rule />

          {/* Headline */}
          <div style={{
            fontSize: 'clamp(3rem, 8vw, 9rem)',
            fontWeight: 900, lineHeight: 0.86,
            letterSpacing: '-0.05em', textTransform: 'uppercase',
            position: 'relative', zIndex: 1,
          }}>
            <div style={{ color: C.dim, fontWeight: 300 }}>One prompt.</div>
            <div>
              <span style={{ background: C.gSilver, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Infinite clarity.
              </span>
            </div>
          </div>

          {/* Tilt perspective wrapper */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', zIndex: 1, minHeight: 0, perspective: '1200px' }}>
            {/* data-tilt-target: GSAP animates rotateX 28→0 during the pin */}
            <div
              data-tilt-target
              style={{
                width: '100%',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07)',
                background: '#1a1a1f',
                willChange: 'transform',
              }}
            >
              {/* Chrome bar */}
              <div style={{
                background: '#1a1a1f',
                padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: '7px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ff5f57', flexShrink: 0 }} />
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#febc2e', flexShrink: 0 }} />
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#28c840', flexShrink: 0 }} />
                <div style={{
                  flex: 1, marginLeft: '10px', background: 'rgba(255,255,255,0.06)',
                  borderRadius: '5px', height: '22px',
                  display: 'flex', alignItems: 'center', paddingLeft: '10px',
                }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                    app.finai.ai/canvas
                  </span>
                </div>
              </div>
              {/* Screen — fixed aspect ratio */}
              <div style={{ aspectRatio: '16 / 9', background: '#111114', overflow: 'hidden' }}>
                <CanvasPreview />
              </div>
            </div>
          </div>
        </FlowSection>

        {/* ══ CARD 3 — FEATURES ══ */}
        <FlowSection aria-label="Everything you need" style={{ background: C.bg2, color: C.text }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', width: '50vw', height: '50vw',
              background: 'radial-gradient(circle, rgba(255,255,255,0.05), transparent 70%)',
              top: '-10%', right: '-8%',
              borderRadius: '50%', filter: 'blur(80px)',
            }} />
          </div>

          <Label n="03" text="Capabilities" />
          <Rule />

          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            gap: '4vw', flexWrap: 'wrap', position: 'relative', zIndex: 1,
          }}>
            <div style={{ flex: '1 1 auto' }}>
              <div style={{ fontSize: 'clamp(2rem, 5vw, 5.5rem)', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.04em', textTransform: 'uppercase', color: C.dim }}>
                Built for
              </div>
              <div style={{ fontSize: 'clamp(3.5rem, 8.5vw, 10rem)', fontWeight: 900, lineHeight: 0.86, letterSpacing: '-0.05em', textTransform: 'uppercase' }}>
                <span style={{ background: C.gSilver, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  how you think.
                </span>
              </div>
            </div>
            <p style={{ flex: '0 0 clamp(220px, 26ch, 340px)', fontSize: 'clamp(14px, 1.4vw, 17px)', lineHeight: 1.8, color: C.body, fontWeight: 400, paddingBottom: '6px' }}>
              Every tool is designed around the way your brain actually works — not spreadsheets, not jargon. Just clear, visual thinking.
            </p>
          </div>

          <Rule />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1px', background: C.border, borderRadius: '20px', overflow: 'hidden',
            position: 'relative', zIndex: 1,
          }}>
            {FEATURES.map(({ icon, title, body }, i) => (
              <div
                key={title}
                style={{ background: C.bg1, padding: 'clamp(22px, 2.5vw, 36px)', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'background 0.2s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.background = C.bg3; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.bg1; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', color: C.muted }}>0{i + 1}</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', color: C.white }}>{icon}</div>
                </div>
                <div style={{ fontSize: 'clamp(15px, 1.4vw, 18px)', fontWeight: 700, color: C.white, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{title}</div>
                <div style={{ fontSize: 'clamp(13px, 1.1vw, 14px)', lineHeight: 1.75, color: C.body, fontWeight: 400 }}>{body}</div>
                <div style={{ marginTop: 'auto', height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.15), transparent)' }} />
              </div>
            ))}
          </div>

          <Rule />

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: 'clamp(28px, 5vw, 64px)', flexWrap: 'wrap' }}>
              {[{ n: '6', label: 'core capabilities' }, { n: '∞', label: 'canvas sessions' }, { n: '100%', label: 'AI-generated' }].map(({ n, label }) => (
                <div key={label}>
                  <div style={{ fontSize: 'clamp(30px, 4.5vw, 52px)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1 }}>
                    <span style={{ background: C.gSilver, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{n}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '7px' }}>{label}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 'clamp(13px, 1.3vw, 16px)', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.8, color: C.body, maxWidth: '40ch', textAlign: 'right' }}>
              "Every feature exists for one reason — to make your financial world less confusing, and more actionable."
            </p>
          </div>
        </FlowSection>

        {/* ══ CARD 4 — FOOTER ══ */}
        <FlowSection aria-label="Footer" className="footer-section" style={{ background: C.bg0 }}>
          <Footer onGetStarted={openSignup} />
        </FlowSection>

      </FlowArt>

      {showAuth && (
        <AuthModal defaultTab={authTab} onClose={() => setShowAuth(false)} />
      )}
    </div>
  );
}
