import { InfiniteSlider } from '@/components/ui/infinite-slider';

export function LogoCloud({ logos }) {
  return (
    <div style={{
      overflow: 'hidden',
      padding: '28px 0',
      WebkitMaskImage: 'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
      maskImage: 'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
    }}>
      <InfiniteSlider gap={64} speed={40} speedOnHover={80}>
        {logos.map((logo) => (
          <div
            key={logo.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '0 8px',
              whiteSpace: 'nowrap',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 'clamp(22px, 3vw, 36px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              userSelect: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            {logo.icon && <span style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', opacity: 0.7 }}>{logo.icon}</span>}
            <span>{logo.name}</span>
          </div>
        ))}
      </InfiniteSlider>
    </div>
  );
}
