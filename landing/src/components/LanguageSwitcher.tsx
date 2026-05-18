'use client';

import { useLocale } from '@/context/LocaleContext';

export default function LanguageSwitcher() {
  const { locale, t, toggleLocale } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={`${t.lang.label}: ${t.lang.switchTo}`}
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 50,
        background: 'rgba(15, 23, 42, 0.85)',
        color: '#f8fafc',
        border: '1px solid #475569',
        borderRadius: 9999,
        padding: '0.5rem 1rem',
        fontWeight: 700,
        cursor: 'pointer',
        backdropFilter: 'blur(6px)',
      }}
    >
      {locale === 'es' ? 'EN' : 'ES'}
    </button>
  );
}
