'use client';

import { useLocale } from '@/context/LocaleContext';

export default function FAQ() {
  const { t } = useLocale();
  const section = t.faq;

  return (
    <section id="faq" style={{ padding: '4rem 1rem', maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>{section.heading}</h2>
      {section.items.map((item) => (
        <details
          key={item.q}
          style={{ marginTop: '1rem', background: '#1e293b', padding: '1rem', borderRadius: 12 }}
        >
          <summary style={{ fontWeight: 700, cursor: 'pointer' }}>{item.q}</summary>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>{item.a}</p>
        </details>
      ))}
    </section>
  );
}
