'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { translations, type Locale, type Translation } from '@/i18n/translations';

const STORAGE_KEY = 'eduplay-landing-locale';

type LocaleContextValue = {
  locale: Locale;
  t: Translation;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'es';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'es' || stored === 'en') return stored;
  const lang = navigator.language.toLowerCase();
  return lang.startsWith('es') ? 'es' : 'en';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(detectInitialLocale());
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    document.title = translations[next].meta.title;
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'es' ? 'en' : 'es');
  }, [locale, setLocale]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.title = translations[locale].meta.title;
  }, [locale, ready]);

  const value = useMemo(
    () => ({
      locale,
      t: translations[locale],
      setLocale,
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale],
  );

  if (!ready) {
    return <div style={{ minHeight: '100vh', background: '#0f172a' }} aria-hidden />;
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
