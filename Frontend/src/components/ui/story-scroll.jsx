'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export const FlowSection = ({
  className,
  style = {},
  children,
  'aria-label': ariaLabel,
}) => (
  <section
    data-flow-section
    aria-label={ariaLabel}
    style={{ background: style.background || '#000000' }}
    className={cx('relative min-h-screen w-full overflow-hidden', className)}
  >
    <div
      data-flow-inner
      className={cx(
        'flow-art-container relative flex min-h-screen w-full flex-col justify-between gap-6 px-[4vw] pt-[clamp(2rem,8vw,4vw)] pb-[4vw]',
        'will-change-transform',
      )}
      style={{ transformOrigin: 'bottom left', ...style }}
    >
      {children}
    </div>
  </section>
);

const childCount = (children) => React.Children.count(children);

const FlowArt = ({
  children,
  className,
  'aria-label': ariaLabel = 'Story scroll',
}) => {
  const containerRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useGSAP(
    () => {
      if (!containerRef.current || reducedMotion) return;

      const scroller = document.getElementById('root') || window;
      ScrollTrigger.defaults({ scroller });

      const sections = Array.from(
        containerRef.current.querySelectorAll('[data-flow-section]'),
      );
      if (sections.length === 0) return;

      const triggers = [];

      sections.forEach((section, i) => {
        gsap.set(section, { zIndex: i + 1 });

        const inner = section.querySelector('.flow-art-container');
        if (!inner) return;

        // Entry rotation: cards after the first sweep in from a tilt.
        // If the previous card has a tilt target, synchronize this card's
        // entry with that tilt so it only completes once the demo is fully flat.
        if (i > 0) {
          gsap.set(inner, { rotation: 15, transformOrigin: 'bottom center' });

          const prevSection = sections[i - 1];
          const prevHasTilt = !!prevSection.querySelector('[data-tilt-target]');

          const tween = gsap.to(inner, {
            rotation: 0,
            ease: 'none',
            scrollTrigger: prevHasTilt
              ? {
                  trigger: prevSection,
                  start: 'top top',
                  end: 'bottom top',
                  scrub: 1.5,
                }
              : {
                  trigger: section,
                  start: 'top bottom',
                  end: 'top top',
                  scrub: 1.5,
                },
          });
          if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
        }

        // Pin all cards except the last
        if (i < sections.length - 1) {
          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              start: 'top top',
              end: 'bottom top',
              pin: true,
              pinSpacing: false,
              anticipatePin: 1,
            }),
          );
        }

        // Mockup tilt: if the section has a [data-tilt-target] child,
        // animate its rotateX 28→0 during the pin's scroll window
        const tiltTarget = section.querySelector('[data-tilt-target]');
        if (tiltTarget) {
          gsap.set(tiltTarget, { rotateX: 28, transformOrigin: 'center bottom', transformPerspective: 1200 });
          const tiltTween = gsap.to(tiltTarget, {
            rotateX: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: 'bottom top',
              scrub: 1.5,
            },
          });
          if (tiltTween.scrollTrigger) triggers.push(tiltTween.scrollTrigger);
        }
      });

      ScrollTrigger.refresh();

      return () => {
        triggers.forEach((t) => t.kill());
        ScrollTrigger.defaults({ scroller: window });
      };
    },
    { scope: containerRef, dependencies: [childCount(children), reducedMotion] },
  );

  return (
    <main
      ref={containerRef}
      aria-label={ariaLabel}
      className={cx('w-full overflow-x-hidden', className)}
    >
      {children}
    </main>
  );
};

export default FlowArt;
