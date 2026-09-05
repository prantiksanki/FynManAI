import * as React from 'react';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

.fynmanai-footer-wrap {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

@keyframes fynmanai-breathe {
  0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.5; }
  100% { transform: translate(-50%,-50%) scale(1.15); opacity: 0.9; }
}

@keyframes fynmanai-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

@keyframes fynmanai-heartbeat {
  0%,100% { transform: scale(1);   filter: drop-shadow(0 0 5px rgba(239,68,68,0.5)); }
  15%,45% { transform: scale(1.2); filter: drop-shadow(0 0 10px rgba(239,68,68,0.8)); }
  30%     { transform: scale(1); }
}

.fynmanai-breathe   { animation: fynmanai-breathe  8s  ease-in-out infinite alternate; }
.fynmanai-marquee   { animation: fynmanai-marquee  40s linear      infinite; }
.fynmanai-heartbeat { animation: fynmanai-heartbeat 2s cubic-bezier(0.25,1,0.5,1) infinite; }

.fynmanai-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.fynmanai-glass-pill {
  background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
  box-shadow:
    0 10px 30px -10px rgba(0,0,0,0.5),
    inset 0 1px 1px rgba(255,255,255,0.10),
    inset 0 -1px 2px rgba(0,0,0,0.80);
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
  cursor: pointer;
}

.fynmanai-glass-pill:hover {
  background: linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%);
  border-color: rgba(255,255,255,0.22);
  box-shadow:
    0 20px 40px -10px rgba(0,0,0,0.7),
    inset 0 1px 1px rgba(255,255,255,0.20);
  color: #ffffff;
}

.fynmanai-giant-text {
  font-size: clamp(180px, 38vw, 680px);
  line-height: 0.82;
  font-weight: 900;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 2px rgba(255,255,255,0.13);
  background: linear-gradient(
    180deg,
    rgba(255,255,255,0.22) 0%,
    rgba(255,255,255,0.10) 40%,
    rgba(255,255,255,0.02) 75%,
    transparent 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  user-select: none;
  pointer-events: none;
  white-space: nowrap;
  text-transform: uppercase;
}
`;

// ─── Magnetic button ──────────────────────────────────────────────────────────
const MagneticButton = React.forwardRef(function MagneticButton(
  { as: Tag = 'button', className = '', children, ...props },
  forwardedRef,
) {
  const localRef = useRef(null);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top  - r.height / 2;
        gsap.to(el, {
          x: x * 0.35, y: y * 0.35,
          rotationX: -y * 0.12, rotationY: x * 0.12,
          scale: 1.05,
          ease: 'power2.out', duration: 0.4,
        });
      };
      const onLeave = () => {
        gsap.to(el, {
          x: 0, y: 0, rotationX: 0, rotationY: 0, scale: 1,
          ease: 'elastic.out(1,0.3)', duration: 1.2,
        });
      };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      return () => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      };
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <Tag
      ref={(node) => {
        localRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      className={className}
      {...props}
    >
      {children}
    </Tag>
  );
});

// ─── Marquee items ────────────────────────────────────────────────────────────
function MarqueeItem() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '48px', padding: '0 24px', whiteSpace: 'nowrap' }}>
      <span>AI-Powered Insights</span>
      <span style={{ color: 'rgba(255,255,255,0.3)' }}>✦</span>
      <span>Real-Time Analytics</span>
      <span style={{ color: 'rgba(255,255,255,0.2)' }}>✦</span>
      <span>Visual Finance</span>
      <span style={{ color: 'rgba(255,255,255,0.3)' }}>✦</span>
      <span>Smart Budgeting</span>
      <span style={{ color: 'rgba(255,255,255,0.2)' }}>✦</span>
      <span>Financial Clarity</span>
      <span style={{ color: 'rgba(255,255,255,0.3)' }}>✦</span>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function Footer({ onGetStarted }) {
  const wrapperRef   = useRef(null);
  const headingRef   = useRef(null);
  const ctaRef       = useRef(null);
  const giantTextRef = useRef(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const scroller = document.getElementById('root') || window;

    const ctx = gsap.context(() => {
      // Heading fade-up on scroll
      gsap.fromTo(
        headingRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, ease: 'power3.out',
          scrollTrigger: {
            trigger: wrapperRef.current,
            scroller,
            start: 'top 75%',
            end: 'top 35%',
            scrub: false,
            toggleActions: 'play none none reverse',
          },
        },
      );

      // CTA stagger
      gsap.fromTo(
        ctaRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, ease: 'power3.out', delay: 0.1,
          scrollTrigger: {
            trigger: wrapperRef.current,
            scroller,
            start: 'top 70%',
            end: 'top 30%',
            scrub: false,
            toggleActions: 'play none none reverse',
          },
        },
      );

      // Giant ghost text parallax
      gsap.fromTo(
        giantTextRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, ease: 'none',
          scrollTrigger: {
            trigger: wrapperRef.current,
            scroller,
            start: 'top 90%',
            end: 'bottom bottom',
            scrub: 1.5,
          },
        },
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    const root = document.getElementById('root');
    if (root) root.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <footer
        ref={wrapperRef}
        className="fynmanai-footer-wrap"
        style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'clip',
          color: '#f0f0f0',
        }}
      >
        {/* Aurora glow — monochrome silver */}
        <div
          className="fynmanai-breathe"
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: '70vw', height: '55vh',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 45%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Grid background */}
        <div
          className="fynmanai-bg-grid"
          style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        />

        {/* Giant ghost FYNMANAI text */}
        <div
          ref={giantTextRef}
          className="fynmanai-giant-text"
          style={{
            position: 'absolute',
            bottom: '-8vh',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 0,
            width: 'max-content',
          }}
        >
          FYNMANAI
        </div>

        {/* ── Top marquee strip ── */}
        <div
          style={{
            width: '100%',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.5)',
            padding: '14px 0',
            zIndex: 10,
            position: 'relative',
          }}
        >
          <div
            className="fynmanai-marquee"
            style={{
              display: 'flex',
              width: 'max-content',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.3em',
              color: 'rgba(255,255,255,0.28)',
              textTransform: 'uppercase',
            }}
          >
            <MarqueeItem /><MarqueeItem />
          </div>
        </div>

        {/* ── Main center content ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px 60px',
            width: '100%',
            maxWidth: '900px',
            margin: '0 auto',
          }}
        >
          {/* Eyebrow */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '32px',
          }}>
            <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
            }}>
              One prompt away
            </span>
            <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
          </div>

          {/* Heading */}
          <div ref={headingRef} style={{ textAlign: 'center', marginBottom: '52px' }}>
            <div style={{ fontSize: 'clamp(42px, 9vw, 104px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.9 }}>
              <span style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #888888 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline',
              }}>
                See it.
              </span>
            </div>
            <div style={{ fontSize: 'clamp(42px, 9vw, 104px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.9, marginTop: '4px' }}>
              <span style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #555555 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline',
              }}>
                Understand it.
              </span>
            </div>
            <p style={{
              marginTop: '24px',
              fontSize: 'clamp(14px, 1.8vw, 18px)',
              color: 'rgba(255,255,255,0.38)',
              fontWeight: 400,
              maxWidth: '460px',
              margin: '24px auto 0',
              lineHeight: 1.6,
            }}>
              Type a prompt. FynmanAI builds a live visual canvas — charts, flows, timelines — all in under 3 seconds.
            </p>
          </div>

          {/* CTA buttons */}
          <div ref={ctaRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px' }}>
              {/* Primary — white gradient */}
              <MagneticButton
                style={{
                  padding: '18px 40px',
                  borderRadius: '999px',
                  fontWeight: 700,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'linear-gradient(180deg, #ffffff 0%, #b0b0b0 100%)',
                  border: 'none',
                  color: '#000000',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 0 40px rgba(255,255,255,0.18), 0 4px 20px rgba(0,0,0,0.5)',
                  transition: 'box-shadow 0.2s, filter 0.2s',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 0 60px rgba(255,255,255,0.32), 0 4px 24px rgba(0,0,0,0.6)';
                  e.currentTarget.style.filter = 'brightness(1.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(255,255,255,0.18), 0 4px 20px rgba(0,0,0,0.5)';
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
                onClick={onGetStarted}
              >
                <span style={{ fontSize: '18px' }}>◈</span>
                Get Started Free
              </MagneticButton>

              {/* Secondary — ghost */}
              <MagneticButton
                as="a"
                href="#"
                className="fynmanai-glass-pill"
                style={{
                  padding: '18px 40px',
                  borderRadius: '999px',
                  color: 'rgba(255,255,255,0.55)',
                  fontWeight: 600,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textDecoration: 'none',
                  fontFamily: 'inherit',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6"  y1="20" x2="6"  y2="14" />
                </svg>
                View Demo
              </MagneticButton>
            </div>

            {/* Small links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '4px' }}>
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Support', href: 'mailto:support@fynman.xyz' },
              ].map(({ label, href }) => (
                <MagneticButton
                  key={label}
                  as="a"
                  href={href}
                  className="fynmanai-glass-pill"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '999px',
                    color: 'rgba(255,255,255,0.32)',
                    fontWeight: 500,
                    fontSize: '11px',
                    textDecoration: 'none',
                    fontFamily: 'inherit',
                    letterSpacing: '0.03em',
                  }}
                >
                  {label}
                </MagneticButton>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 20,
            width: '100%',
            padding: '24px 48px 36px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Copyright */}
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.22)',
          }}>
            © 2025 FynmanAI. All rights reserved.
          </div>

          {/* Crafted badge */}
          <div
            className="fynmanai-glass-pill"
            style={{
              padding: '10px 22px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'default',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.28)' }}>
              Crafted with
            </span>
            <span className="fynmanai-heartbeat" style={{ fontSize: '14px', color: '#ef4444' }}>❤</span>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.28)' }}>
              by
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: 900,
              marginLeft: '4px',
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}>
              FynmanAI
            </span>
          </div>

          {/* Back to top */}
          <MagneticButton
            className="fynmanai-glass-pill"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.45)',
              padding: 0,
              fontFamily: 'inherit',
            }}
            onClick={scrollToTop}
            title="Back to top"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </MagneticButton>
        </div>
      </footer>
    </>
  );
}
