import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mideplanos.com';

export const metadata: Metadata = {
  title: 'Herramienta de Medición de Planos Online | mideplanos',
  description: 'Mide distancias y áreas en planos, imágenes y PDFs directamente en tu navegador. Calibración de escala real. Gratuito, sin registro, sin instalación.',
  alternates: {
    canonical: `${SITE_URL}/herramienta`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HerramientaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}
