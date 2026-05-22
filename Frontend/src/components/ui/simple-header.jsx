import React from 'react';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { MenuToggle } from '@/components/ui/menu-toggle';
import { cn } from '@/lib/utils';

const links = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
];

export function SimpleHeader({ onSignIn, onGetStarted }) {
  const [open, setOpen] = React.useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <nav
        style={{
          margin: '0 auto',
          display: 'flex',
          height: '56px',
          width: '100%',
          maxWidth: '900px',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ffffff', fontSize: '20px' }}>◈</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: 700,
              background: 'linear-gradient(180deg, #ffffff 0%, #999999 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            FinAI
          </span>
          <span
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.38)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '20px',
              padding: '2px 8px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Agentic Canvas
          </span>
        </div>

        {/* Desktop nav */}
        <div
          className="lg-nav"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.45)',
                textDecoration: 'none',
                transition: 'color 0.15s, background 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {link.label}
            </a>
          ))}

          <button
            onClick={onSignIn}
            style={{
              marginLeft: '8px',
              padding: '7px 18px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.75)',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s, background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
            }}
          >
            Sign In
          </button>

          <button
            onClick={onGetStarted}
            style={{
              marginLeft: '4px',
              padding: '7px 18px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#000000',
              background: 'linear-gradient(180deg, #ffffff 0%, #b0b0b0 100%)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 0 24px rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.4)',
              transition: 'box-shadow 0.15s, filter 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 0 40px rgba(255,255,255,0.32), 0 2px 12px rgba(0,0,0,0.5)';
              e.currentTarget.style.filter = 'brightness(1.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 0 24px rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.4)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            Get Started
          </button>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <button
            className="mobile-menu-btn"
            onClick={() => setOpen(!open)}
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <MenuToggle strokeWidth={2.5} open={open} onOpenChange={setOpen} className="size-6" />
          </button>

          <SheetContent
            style={{ background: 'rgba(0,0,0,0.97)', borderColor: 'rgba(255,255,255,0.07)' }}
            showClose={false}
            side="left"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px' }}>
              <span style={{ color: '#ffffff', fontSize: '20px' }}>◈</span>
              <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>FinAI</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '15px',
                    color: 'rgba(255,255,255,0.5)',
                    textDecoration: 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <SheetFooter style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'transparent', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => { setOpen(false); onSignIn?.(); }}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.75)', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Sign In
              </button>
              <button
                onClick={() => { setOpen(false); onGetStarted?.(); }}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, color: '#000000', background: 'linear-gradient(180deg, #ffffff 0%, #b0b0b0 100%)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Get Started
              </button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </nav>

      <style>{`
        @media (max-width: 1023px) {
          .lg-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
