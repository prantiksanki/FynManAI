import { ChevronRight } from 'lucide-react';

export function Hero({ eyebrow, title, subtitle, ctaLabel = 'Get Started', onCtaClick }) {
  return (
    <section style={{
      position: 'relative',
      width: '100%',
      minHeight: 'calc(100vh - 56px)',
      overflow: 'hidden',
      paddingTop: '160px',
      paddingLeft: '24px',
      paddingRight: '24px',
      textAlign: 'center',
      /* dark → transparent → grey → white, exactly matching reference dark mode */
      background: 'linear-gradient(to bottom, #000 0%, #000 30%, #898e8e 78%, #ffffff 99%)',
      borderBottomLeftRadius: '16px',
      borderBottomRightRadius: '16px',
    }}>

      {/* Grid — dark lines, radial-masked so they fade out mid-section */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        height: '600px',
        width: '100%',
        opacity: 0.8,
        backgroundImage:
          'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)',
        backgroundSize: '6rem 5rem',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
        maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
      }} />

      {/* Arc — positioned from top so it always anchors to the bottom of the section */}
      <div style={{
        position: 'absolute',
        top: 'calc(100% - 150px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '140%',
        height: '750px',
        borderRadius: '100%',
        /* dark center fading to white at edges — the key: dark bg so center blends in */
        background: 'radial-gradient(closest-side, #000 82%, #ffffff)',
        zIndex: 1,
        pointerEvents: 'none',
        animation: 'hfadeup 0.9s ease 0.5s forwards',
        opacity: 0,
      }} />

      {/* Eyebrow */}
      {eyebrow && (
        <a href="#" style={{
          position: 'relative', zIndex: 10,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '8px 20px',
          borderRadius: '999px',
          border: '2px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(to top right, rgba(212,212,216,0.05), rgba(156,163,175,0.05), transparent)',
          color: 'rgba(156,163,175,1)',
          fontSize: '13px', fontWeight: 500,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          textDecoration: 'none',
          marginBottom: '24px',
          animation: 'hfade 0.6s ease 0s forwards', opacity: 0,
        }}>
          {eyebrow}
          <ChevronRight style={{ width: '16px', height: '16px', display: 'inline' }} />
        </a>
      )}

      {/* Title */}
      <h1 style={{
        position: 'relative', zIndex: 10,
        fontSize: 'clamp(48px, 7vw, 96px)',
        fontWeight: 600,
        lineHeight: 1.0,
        letterSpacing: '-3px',
        paddingTop: '24px',
        paddingBottom: '24px',
        marginBottom: '0',
        /* Safe gradient text: white → white/40 */
        background: 'linear-gradient(to bottom right, #ffffff 30%, rgba(255,255,255,0.4))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'block',
        animation: 'hfadeslide 0.7s ease 0.1s forwards',
        opacity: 0,
        transform: 'translateY(-16px)',
      }}>
        {title}
      </h1>

      {/* Subtitle */}
      <p style={{
        position: 'relative', zIndex: 10,
        fontSize: 'clamp(16px, 1.8vw, 20px)',
        color: 'rgba(156,163,175,1)',
        maxWidth: '600px',
        margin: '0 auto 48px',
        lineHeight: 1.6,
        letterSpacing: '-0.3px',
        animation: 'hfadeslide 0.7s ease 0.25s forwards',
        opacity: 0,
        transform: 'translateY(-16px)',
      }}>
        {subtitle}
      </p>

      {/* CTA */}
      {ctaLabel && (
        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', justifyContent: 'center',
          animation: 'hfade 0.6s ease 0.35s forwards', opacity: 0,
        }}>
          <button
            onClick={onCtaClick}
            style={{
              padding: '12px 48px',
              borderRadius: '8px',
              fontSize: '17px', fontWeight: 500,
              color: '#111', background: '#fff',
              border: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '-0.3px',
              width: '208px',
              transition: 'background 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e8e8e8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {ctaLabel}
          </button>
        </div>
      )}

      <style>{`
        @keyframes hfade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes hfadeslide {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hfadeup {
          from { opacity: 0; transform: translateX(-50%) translateY(40px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </section>
  );
}
