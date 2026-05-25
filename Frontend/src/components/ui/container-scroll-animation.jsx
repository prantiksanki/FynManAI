import React, { useRef, useEffect, useState } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';

export function ContainerScroll({ titleComponent, children }) {
  const containerRef = useRef(null);
  const [scroller, setScroller]   = useState(null);
  const [isMobile, setIsMobile]   = useState(false);

  useEffect(() => {
    setScroller(document.getElementById('root') || null);
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const scrollerRef = scroller ? { current: scroller } : undefined;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollerRef,
    offset: ['start end', 'end start'],
  });

  const rotate    = useTransform(scrollYProgress, [0, 0.5], [28, 0]);
  const scale     = useTransform(scrollYProgress, [0, 0.5], isMobile ? [0.75, 0.95] : [0.88, 1]);
  const translateY = useTransform(scrollYProgress, [0, 0.5], [60, 0]);
  const opacity   = useTransform(scrollYProgress, [0, 0.2], [0.4, 1]);

  return (
    <div
      key={scroller ? 'mounted' : 'pending'}
      ref={containerRef}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
      }}
    >
      {/* Title slides up as window tilts in */}
      <motion.div
        style={{ translateY, opacity }}
        className="w-full text-left mb-8 px-2"
      >
        {titleComponent}
      </motion.div>

      {/* Tilt window */}
      <div style={{ width: '100%', perspective: '1200px' }}>
        <motion.div
          style={{
            rotateX: rotate,
            scale,
            transformOrigin: 'center bottom',
            boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
            borderRadius: '20px',
          }}
        >
          {/* Browser chrome bar */}
          <div style={{
            background: '#1a1a1f',
            borderRadius: '20px 20px 0 0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840' }} />
            <div style={{
              flex: 1, marginLeft: '12px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '6px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '10px',
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                app.fynmanai.ai/canvas
              </span>
            </div>
          </div>

          {/* Screen content */}
          <div style={{
            overflow: 'hidden',
            borderRadius: '0 0 20px 20px',
            background: '#111114',
            aspectRatio: '16 / 9',
          }}>
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
