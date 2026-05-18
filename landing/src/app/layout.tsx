import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduPlay â€” Red social educativa para niÃ±os',
  description:
    'Donde los niÃ±os hacen amigos mientras aprenden. Juegos, biblioteca y control parental en un lugar seguro.',
  openGraph: {
    title: 'EduPlay',
    description: 'Red social educativa segura para menores.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

