import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mideplanos.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'mideplanos — Medir Planos Online Gratis',
    template: '%s | mideplanos',
  },
  description:
    'Herramienta gratuita para medir distancias y áreas en planos de construcción, imágenes y PDFs. Calibración de escala de referencia. Sin registro, sin instalación.',
  keywords: [
    'medir planos online',
    'medir planos gratis',
    'medición de planos',
    'calcular área plano',
    'medir distancias imagen',
    'herramienta medición planos',
    'escala plano online',
    'medir PDF online',
  ],
  authors: [{ name: 'mideplanos', url: SITE_URL }],
  creator: 'mideplanos',
  publisher: 'mideplanos',
  openGraph: {
    title: 'mideplanos — Medir Planos Online Gratis',
    description:
      'Mide distancias y áreas en planos de construcción, imágenes y PDFs. Calibración de escala de referencia. Sin registro, sin instalación.',
    type: 'website',
    url: SITE_URL,
    siteName: 'mideplanos',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'mideplanos — Medir Planos Online Gratis',
    description:
      'Mide distancias y áreas en planos de construcción, imágenes y PDFs. Sin registro, sin instalación.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
