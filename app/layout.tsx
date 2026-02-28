import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'mideplanos — Mide distancias y áreas en planos',
  description:
    'Herramienta gratuita para medir distancias y áreas en planos de construcción, imágenes y PDFs. Calibración de escala real. Sin registro.',
  keywords: ['medir planos', 'distancias plano', 'área plano', 'escala plano', 'construcción'],
  authors: [{ name: 'mideplanos' }],
  openGraph: {
    title: 'mideplanos — Mide distancias y áreas en planos',
    description: 'Herramienta gratuita para medir planos de construcción con calibración de escala real.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        {children}
      </body>
    </html>
  );
}
