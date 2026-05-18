import type { Metadata } from 'next';
import { LocaleProvider } from '@/context/LocaleContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduPlay — Red social educativa para niños',
  description:
    'Donde los niños hacen amigos mientras aprenden. Juegos, biblioteca y control parental en un lugar seguro.',
  openGraph: {
    title: 'EduPlay',
    description: 'Red social educativa segura para menores.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>
        <LocaleProvider>
          <LanguageSwitcher />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
