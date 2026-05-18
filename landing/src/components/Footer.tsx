'use client';

import { useLocale } from '@/context/LocaleContext';

export default function Footer() {
  const { t } = useLocale();
  const section = t.footer;

  return (
    <footer
      style={{
        padding: '2rem 1rem',
        borderTop: '1px solid #334155',
        textAlign: 'center',
        opacity: 0.8,
      }}
    >
      <p>
        © {new Date().getFullYear()} EduPlay. {section.tagline}
      </p>
      <p style={{ marginTop: '0.5rem' }}>
        <a href="#faq">{section.faq}</a> · <a href="#pricing">{section.pricing}</a> ·{' '}
        <a href="mailto:hola@eduplay.app">{section.contact}</a>
      </p>
    </footer>
  );
}
