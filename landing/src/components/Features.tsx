'use client';

import { useLocale } from '@/context/LocaleContext';

export default function Features() {
  const { t } = useLocale();
  const f = t.features;

  return (
    <section id="features" style={{ padding: '4rem 1rem', background: '#1e293b' }}>
      <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '2rem' }}>{f.heading}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        {f.items.map((item) => (
          <article
            key={item.title}
            style={{
              background: '#334155',
              borderRadius: 16,
              padding: '1.5rem',
            }}
          >
            <span style={{ fontSize: '2rem' }} aria-hidden>
              {item.icon}
            </span>
            <h3 style={{ margin: '0.75rem 0 0.5rem' }}>{item.title}</h3>
            <p style={{ margin: 0, opacity: 0.85, lineHeight: 1.5 }}>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
