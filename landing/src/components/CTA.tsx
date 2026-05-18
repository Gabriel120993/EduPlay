'use client';

import { APP_LOGIN_URL } from '@/config/appUrls';
import { useLocale } from '@/context/LocaleContext';

export default function CTA() {
  const { t } = useLocale();
  const section = t.cta;

  return (
    <section
      id="download"
      style={{
        padding: '4rem 1rem',
        textAlign: 'center',
        background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
      }}
    >
      <h2 style={{ fontSize: '2rem' }}>{section.heading}</h2>
      <p style={{ opacity: 0.9, maxWidth: 520, margin: '1rem auto 2rem' }}>{section.body}</p>
      <a
        href="#"
        style={{
          background: '#facc15',
          color: '#1e3a8a',
          padding: '1rem 2rem',
          borderRadius: 9999,
          fontWeight: 800,
        }}
      >
        {section.button}
      </a>
      <p style={{ marginTop: '1.25rem' }}>
        <a href={APP_LOGIN_URL} style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline' }}>
          {section.login}
        </a>
      </p>
    </section>
  );
}
