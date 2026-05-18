'use client';

import { useLocale } from '@/context/LocaleContext';

export default function Testimonials() {
  const { t } = useLocale();
  const section = t.testimonials;

  return (
    <section style={{ padding: '4rem 1rem', background: '#1e293b' }}>
      <h2 style={{ textAlign: 'center' }}>{section.heading}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          maxWidth: 1100,
          margin: '2rem auto 0',
        }}
      >
        {section.items.map((item) => (
          <blockquote
            key={item.name}
            style={{ background: '#334155', padding: '1.25rem', borderRadius: 12, margin: 0 }}
          >
            <p>&ldquo;{item.text}&rdquo;</p>
            <footer style={{ marginTop: '1rem', opacity: 0.85 }}>
              {item.country} {item.name} — {item.role}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
