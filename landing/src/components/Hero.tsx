'use client';

import { APP_LOGIN_URL } from '@/config/appUrls';
import { useLocale } from '@/context/LocaleContext';

export default function Hero() {
  const { t } = useLocale();
  const h = t.hero;

  return (
    <section
      id="inicio"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        color: '#fff',
        padding: '2rem 1rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: '1.5rem' }}>
          {h.titleLine1}
          <span style={{ display: 'block', color: '#fde047' }}>{h.titleLine2}</span>
        </h1>
        <p style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', opacity: 0.9, marginBottom: '2rem' }}>
          {h.subtitle}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
          <a
            href="#download"
            style={{
              background: '#facc15',
              color: '#1e3a8a',
              padding: '1rem 2rem',
              borderRadius: 9999,
              fontWeight: 700,
            }}
          >
            {h.ctaPrimary}
          </a>
          <a
            href="#features"
            style={{
              border: '2px solid #fff',
              padding: '1rem 2rem',
              borderRadius: 9999,
              fontWeight: 700,
            }}
          >
            {h.ctaSecondary}
          </a>
          <a
            href={APP_LOGIN_URL}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.6)',
              padding: '1rem 2rem',
              borderRadius: 9999,
              fontWeight: 700,
            }}
          >
            {h.ctaLogin}
          </a>
        </div>
        <div
          style={{
            marginTop: '3rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.5rem',
            justifyContent: 'center',
            fontSize: '0.9rem',
            opacity: 0.85,
          }}
        >
          {h.badges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
