import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const MARQUEE_ITEMS = [
  'AI-Powered Insights',
  'Real-Time Analytics',
  'Visual Finance',
  'Smart Budgeting',
  'Portfolio Tracking',
  'Market Intelligence',
  'Financial Clarity',
  'Data-Driven Decisions',
];

function MagneticButton({ children, className = '', style = {}, onClick }) {
  const btnRef = useRef(null);

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, { x: x * 0.35, y: y * 0.35, duration: 0.3, ease: 'power2.out' });
    };

    const handleMouseLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <button ref={btnRef} className={className} style={style} onClick={onClick}>
      {children}
    </button>
  );
}

export function CinematicFooter({ onGetStarted }) {
  const sectionRef   = useRef(null);
  const titleRef     = useRef(null);
  const marqueeRef   = useRef(null);
  const marquee2Ref  = useRef(null);
  const contentRef   = useRef(null);
  const overlayRef   = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title reveal on scroll
      gsap.fromTo(
        titleRef.current,
        { y: 120, opacity: 0, scale: 0.85 },
        {
          y: 0, opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Content fade
      gsap.fromTo(
        contentRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 1, delay: 0.3, ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Overlay parallax
      gsap.to(overlayRef.current, {
        yPercent: -20,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Marquee rows
      const marqueeEls = [marqueeRef.current, marquee2Ref.current];
      marqueeEls.forEach((el, i) => {
        if (!el) return;
        gsap.to(el, {
          xPercent: i === 0 ? -50 : 50,
          ease: 'none',
          duration: 25,
          repeat: -1,
          modifiers: {
            xPercent: gsap.utils.wrap(-50, 0),
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={sectionRef}
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        background: '#08080a',
        paddingTop: '100px',
        paddingBottom: '60px',
        zIndex: 1,
      }}
    >
      {/* Gradient overlay */}
      <div
        ref={overlayRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,106,247,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Giant title */}
      <div
        ref={titleRef}
        style={{
          textAlign: 'center',
          fontSize: 'clamp(72px, 18vw, 200px)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          lineHeight: 0.85,
          color: 'transparent',
          WebkitTextStroke: '1px rgba(255,255,255,0.12)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          userSelect: 'none',
          pointerEvents: 'none',
          position: 'relative',
          zIndex: 1,
          marginBottom: '0px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        FINAI
      </div>

      {/* Marquee row 1 */}
      <div style={{ overflow: 'hidden', padding: '24px 0 0', position: 'relative', zIndex: 2 }}>
        <div
          ref={marqueeRef}
          style={{
            display: 'flex',
            gap: '32px',
            whiteSpace: 'nowrap',
            width: 'max-content',
          }}
        >
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span
              key={i}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#8888a0',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '6px 16px',
                border: '1px solid #2a2a32',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.02)',
                flexShrink: 0,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Marquee row 2 (reverse) */}
      <div style={{ overflow: 'hidden', padding: '12px 0 32px', position: 'relative', zIndex: 2 }}>
        <div
          ref={marquee2Ref}
          style={{
            display: 'flex',
            gap: '32px',
            whiteSpace: 'nowrap',
            width: 'max-content',
            transform: 'translateX(-50%)',
          }}
        >
          {[...MARQUEE_ITEMS.slice().reverse(), ...MARQUEE_ITEMS.slice().reverse()].map((item, i) => (
            <span
              key={i}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#7c6af7',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '6px 16px',
                border: '1px solid rgba(124,106,247,0.25)',
                borderRadius: '999px',
                background: 'rgba(124,106,247,0.06)',
                flexShrink: 0,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Main footer content */}
      <div
        ref={contentRef}
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '0 32px',
          position: 'relative',
          zIndex: 3,
        }}
      >
        {/* Glass card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '48px',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
            marginBottom: '48px',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(124,106,247,0.1)',
              border: '1px solid rgba(124,106,247,0.3)',
              fontSize: '12px',
              color: '#a78bfa',
              fontWeight: 500,
              letterSpacing: '0.05em',
            }}
          >
            <span>◈</span>
            <span>Built with ❤ by FinAI</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 48px)',
                fontWeight: 700,
                color: '#e2e2e8',
                marginBottom: '12px',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
              }}
            >
              Your money, finally
              <br />
              <span style={{ color: '#7c6af7' }}>understood.</span>
            </h2>
            <p style={{ fontSize: '16px', color: '#8888a0', maxWidth: '480px', lineHeight: 1.6 }}>
              Turn complex financial data into clear, actionable insights — powered by AI, built for everyone.
            </p>
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <MagneticButton
              style={{
                padding: '14px 32px',
                borderRadius: '12px',
                background: '#7c6af7',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
                transition: 'background 0.15s',
              }}
              onClick={onGetStarted}
              onMouseEnter={e => { e.currentTarget.style.background = '#a78bfa'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#7c6af7'; }}
            >
              Get Started Free →
            </MagneticButton>
            <MagneticButton
              style={{
                padding: '14px 32px',
                borderRadius: '12px',
                background: 'transparent',
                color: '#e2e2e8',
                border: '1px solid #2a2a32',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
                transition: 'border-color 0.15s',
              }}
            >
              View Demo
            </MagneticButton>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingTop: '24px',
            borderTop: '1px solid #1e1e24',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#7c6af7', fontSize: '16px' }}>◈</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: '#e2e2e8' }}>FinAI</span>
          </div>
          <span style={{ fontSize: '12px', color: '#8888a0' }}>© 2025 FinAI. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['Privacy', 'Terms', 'Contact'].map(link => (
              <a
                key={link}
                href="#"
                style={{
                  fontSize: '12px',
                  color: '#8888a0',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#e2e2e8'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#8888a0'; }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
