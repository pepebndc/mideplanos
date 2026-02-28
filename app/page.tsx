import type { Metadata } from 'next';
import Link from 'next/link';
import GridCanvas from '@/components/GridCanvas';
import Attribution from '@/components/Attribution';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mideplanos.com';

export const metadata: Metadata = {
  title: 'Medir Planos Online Gratis — Distancias y Áreas en Imágenes y PDFs | mideplanos',
  description:
    'Herramienta gratuita para medir distancias y áreas en planos de construcción, imágenes y PDFs. Calibración de escala real. Sin registro, sin instalación. Todo en tu navegador.',
  keywords: [
    'medir planos online',
    'medir planos gratis',
    'medición de planos',
    'calcular área plano',
    'medir distancias imagen',
    'medir PDF online',
    'escala plano online',
    'herramienta medición planos',
    'medir plano arquitectura',
    'medir planos construcción',
    'medición imagen online',
    'calibrar escala plano',
    'medir superficie plano',
    'herramienta medir plano gratis',
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'Medir Planos Online Gratis | mideplanos',
    description:
      'Mide distancias y áreas en planos de construcción, imágenes y PDFs. Calibración de escala real. Sin registro, sin instalación.',
    type: 'website',
    url: SITE_URL,
    siteName: 'mideplanos',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Medir Planos Online Gratis | mideplanos',
    description:
      'Mide distancias y áreas en planos de construcción, imágenes y PDFs. Sin registro, sin instalación.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

// ─── Structured data ──────────────────────────────────────────────────────────

const webAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'mideplanos',
  url: `${SITE_URL}/herramienta`,
  description:
    'Herramienta web gratuita para medir distancias y áreas en planos de construcción, imágenes y PDFs con calibración de escala real.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  inLanguage: 'es',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
  featureList: [
    'Medición de distancias con múltiples segmentos',
    'Cálculo de áreas y superficies',
    'Calibración de escala real (m, cm, mm, ft, in)',
    'Soporte de archivos PDF multipágina',
    'Soporte de imágenes JPG, PNG y WEBP',
    'Exportación de medidas a CSV',
    'Múltiples capas de imagen',
    'Zoom y desplazamiento ilimitados',
    'Historial de acciones con deshacer',
    'Almacenamiento local de proyectos',
  ],
  screenshot: `${SITE_URL}/og-image.png`,
  browserRequirements: 'Requiere navegador moderno con soporte JavaScript y HTML5 Canvas.',
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Cómo puedo medir distancias en un plano online?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Carga tu plano en mideplanos (JPG, PNG, WEBP o PDF), calibra la escala trazando una línea de referencia conocida y, a continuación, usa la herramienta de distancia para trazar segmentos sobre el plano. La distancia real se calcula automáticamente en metros, centímetros o la unidad que elijas.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Puedo medir áreas y superficies en un plano?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. Con la herramienta de área puedes dibujar polígonos de cualquier forma sobre el plano para calcular superficies. Tras calibrar la escala, el área se muestra en metros cuadrados, centímetros cuadrados o la unidad seleccionada.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Puedo medir un plano en formato PDF?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. mideplanos admite archivos PDF, incluso de varias páginas. Puedes navegar entre páginas del mismo PDF y aplicar mediciones en cada una de ellas.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cómo se calibra la escala de un plano?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Selecciona la herramienta de calibración, traza una línea sobre una referencia cuya longitud real conoces (por ejemplo, un segmento de 5 metros en el plano) e introduce la medida real. La herramienta calculará el factor de escala y todas las mediciones posteriores serán automáticas.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Es gratis medir planos online con mideplanos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, mideplanos es completamente gratuito. No hay límite de mediciones, no requiere registro y no tiene coste alguno.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Mis archivos se suben a algún servidor?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Todo el procesamiento ocurre localmente en tu navegador. Tus planos e imágenes nunca abandonan tu dispositivo ni se envían a ningún servidor externo, lo que garantiza total privacidad.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué unidades de medida admite mideplanos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'mideplanos soporta metros (m), centímetros (cm), milímetros (mm), pies (ft) y pulgadas (in). Puedes elegir la unidad al calibrar la escala.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Puedo exportar las medidas?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. Puedes exportar todas tus mediciones a un archivo CSV con un solo clic, para abrirlo en Excel, Google Sheets o cualquier herramienta de hojas de cálculo.',
      },
    },
  ],
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Cómo medir un plano online con mideplanos',
  description:
    'Guía paso a paso para medir distancias y áreas en planos de construcción, imágenes y PDFs de forma gratuita.',
  totalTime: 'PT2M',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Carga tu plano',
      text: 'Arrastra tu imagen o PDF a la herramienta, o haz clic para seleccionarlo desde tu dispositivo. Se admiten formatos JPG, PNG, WEBP y PDF multipágina.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Calibra la escala',
      text: 'Usa la herramienta de calibración para trazar una línea sobre una referencia conocida (una longitud indicada en el plano) e introduce su medida real. Esto ajusta la escala para todas las mediciones.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Mide distancias y áreas',
      text: 'Selecciona la herramienta de distancia o área y traza mediciones sobre el plano. Los resultados aparecen en tiempo real con la unidad elegida.',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Exporta tus resultados',
      text: 'Renombra cada medición, organízalas en la lista y exporta todo a CSV para usarlas en Excel o tu software favorito.',
    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      <div className="min-h-screen relative" style={{ color: '#1A2C3D' }}>
        <GridCanvas />
        {/* Content above the fixed canvas */}
        <div className="relative" style={{ zIndex: 1 }}>

        {/* ── Nav ─────────────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-50 border-b"
          style={{
            borderColor: '#C8C4BB',
            backgroundColor: 'rgba(241,239,234,0.92)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DimensionIcon size={20} />
              <span className="text-sm font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                mideplanos
              </span>
            </div>
            <Link
              href="/herramienta"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-150"
              style={{ backgroundColor: '#1A2C3D', color: '#F1EFEA' }}
            >
              Abrir herramienta
              <ArrowRight size={14} />
            </Link>
          </div>
        </header>

        <main>
          {/* ── Hero ──────────────────────────────────────────────────────────── */}
          <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border"
              style={{ borderColor: '#C8C4BB', color: '#7A8A99' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#22C55E' }}
              />
              Gratuito · Sin registro · 100% en tu navegador
            </div>

            <h1
              className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight"
              style={{ letterSpacing: '-0.04em' }}
            >
              Mide planos online,{' '}
              <span style={{ color: '#5A6A79' }}>gratis</span>
            </h1>

            <p
              className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
              style={{ color: '#5A6A79' }}
            >
              Carga cualquier imagen o PDF y mide distancias, áreas y perímetros con{' '}
              <strong className="font-semibold" style={{ color: '#1A2C3D' }}>
                calibración de escala real
              </strong>
              . Perfecto para planos de arquitectura, construcción, reforma e ingeniería.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/herramienta"
                className="inline-flex items-center gap-2 font-semibold px-8 py-3.5 rounded-xl text-base transition-all duration-150 hover:opacity-90"
                style={{ backgroundColor: '#1A2C3D', color: '#F1EFEA' }}
              >
                Empezar a medir gratis
                <ArrowRight size={16} />
              </Link>
              <span className="text-sm" style={{ color: '#9A9590' }}>
                Sin tarjeta. Sin cuenta. Ahora mismo.
              </span>
        </div>

            {/* Trust badges */}
            <div
              className="flex flex-wrap gap-6 justify-center mt-12 pt-12 border-t"
              style={{ borderColor: '#C8C4BB' }}
            >
              {[
                { label: 'JPG, PNG, WEBP y PDF', icon: <FileIcon /> },
                { label: 'Calibración de escala real', icon: <CrosshairIcon /> },
                { label: 'Exportar a CSV', icon: <DownloadIcon /> },
                { label: 'Datos privados — procesado local', icon: <LockIcon /> },
              ].map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: '#5A6A79' }}
                >
                  <span style={{ color: '#7A8A99' }}>{b.icon}</span>
                  {b.label}
                </div>
              ))}
            </div>
          </section>

          {/* ── Features ──────────────────────────────────────────────────────── */}
          <section
            className="py-20 border-y"
            style={{ borderColor: '#C8C4BB', backgroundColor: 'rgba(241,239,234,0.75)' }}
          >
            <div className="max-w-5xl mx-auto px-6">
              <div className="text-center mb-14">
                <h2
                  className="text-3xl font-bold tracking-tight"
                  style={{ letterSpacing: '-0.03em' }}
                >
                  Todo lo que necesitas para medir planos
                </h2>
      </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="p-6 rounded-2xl border"
                    style={{
                      borderColor: '#C8C4BB',
                      backgroundColor: 'rgba(241,239,234,0.7)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: f.bg, color: f.color }}
                    >
                      {f.icon}
                    </div>
                    <h3 className="font-semibold mb-1.5 text-base">{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#5A6A79' }}>
                      {f.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── How it works ──────────────────────────────────────────────────── */}
          <section className="py-20 max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2
                className="text-3xl font-bold tracking-tight mb-3"
                style={{ letterSpacing: '-0.03em' }}
              >
                Cómo medir un plano en 4 pasos
              </h2>
              <p className="text-base" style={{ color: '#5A6A79' }}>
                Desde cero hasta tus primeras medidas en menos de dos minutos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_TO_STEPS.map((step, i) => (
                <div key={step.title} className="flex flex-col">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-4 shrink-0"
                    style={{ backgroundColor: '#1A2C3D', color: '#F1EFEA' }}
                  >
                    {i + 1}
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#5A6A79' }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                href="/herramienta"
                className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm transition-all duration-150 hover:opacity-90"
                style={{ backgroundColor: '#1A2C3D', color: '#F1EFEA' }}
              >
                Probar la herramienta
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>

          {/* ── Use cases ─────────────────────────────────────────────────────── */}
          <section
            className="py-20 border-y"
            style={{ borderColor: '#C8C4BB', backgroundColor: 'rgba(241,239,234,0.75)' }}
          >
            <div className="max-w-5xl mx-auto px-6">
              <div className="text-center mb-14">
                <h2
                  className="text-3xl font-bold tracking-tight mb-3"
                  style={{ letterSpacing: '-0.03em' }}
                >
                  ¿Para quién es mideplanos?
                </h2>
                <p className="text-base" style={{ color: '#5A6A79' }}>
                  Cualquier profesional o particular que necesite medir planos digitales.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {USE_CASES.map((uc) => (
                  <div
                    key={uc.role}
                    className="p-6 rounded-2xl border flex gap-4"
                    style={{ borderColor: '#C8C4BB', backgroundColor: 'rgba(241,239,234,0.7)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                      style={{ backgroundColor: '#E8E4DD' }}
                    >
                      {uc.emoji}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{uc.role}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#5A6A79' }}>
                        {uc.desc}
                      </p>
                    </div>
                  </div>
                ))}
          </div>
        </div>
          </section>

          {/* ── FAQ ───────────────────────────────────────────────────────────── */}
          <section className="py-20 max-w-3xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2
                className="text-3xl font-bold tracking-tight mb-3"
                style={{ letterSpacing: '-0.03em' }}
              >
                Preguntas frecuentes
              </h2>
              <p className="text-base" style={{ color: '#5A6A79' }}>
                Todo lo que necesitas saber sobre medir planos online.
              </p>
            </div>

            <div className="space-y-0">
              {FAQ_ITEMS.map((item, i) => (
                <div
                  key={item.q}
                  className={`py-6 ${i < FAQ_ITEMS.length - 1 ? 'border-b' : ''}`}
                  style={{ borderColor: '#C8C4BB' }}
                >
                  <h3 className="font-semibold mb-3 text-base">{item.q}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#5A6A79' }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Final CTA ─────────────────────────────────────────────────────── */}
          <section
            className="py-20 border-t"
            style={{ borderColor: '#C8C4BB' }}
          >
            <div className="max-w-2xl mx-auto px-6 text-center">
              <h2
                className="text-4xl font-bold tracking-tight mb-5"
                style={{ letterSpacing: '-0.03em' }}
              >
                Empieza a medir tu plano ahora
              </h2>
              <p className="text-lg mb-8" style={{ color: '#5A6A79' }}>
                Sin registro. Sin instalación. Tus archivos nunca salen de tu navegador.
              </p>
              <Link
                href="/herramienta"
                className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-xl text-base transition-all duration-150 hover:opacity-90"
                style={{ backgroundColor: '#1A2C3D', color: '#F1EFEA' }}
              >
                Abrir la herramienta gratis
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        </main>

        <Attribution className="pb-8 pt-4" />

        </div>{/* end relative content wrapper */}
    </div>
    </>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: 'Medir distancias en planos',
    desc: 'Traza líneas con múltiples segmentos para medir distancias reales sobre cualquier imagen o plano. Perfecto para planos de construcción y arquitectura.',
    icon: <RulerIcon />,
    bg: '#E0DDD7',
    color: '#1A2C3D',
  },
  {
    title: 'Calcular áreas y superficies',
    desc: 'Dibuja polígonos de cualquier forma para calcular áreas y superficies en metros cuadrados, centímetros cuadrados o cualquier otra unidad.',
    icon: <SquareIcon />,
    bg: '#E0DDD7',
    color: '#1A2C3D',
  },
  {
    title: 'Calibración de escala real',
    desc: 'Traza una referencia conocida en el plano y asigna su medida real. Todas las mediciones se convierten automáticamente a la escala del plano.',
    icon: <CrosshairIcon />,
    bg: '#E0DDD7',
    color: '#1A2C3D',
  },
  {
    title: 'Soporte de PDFs multipágina',
    desc: 'Carga planos en formato PDF, incluso de varias páginas, y mide en cualquier página. Compatible con los estándares de entrega de proyectos de arquitectura.',
    icon: <FileIcon />,
    bg: '#E0DDD7',
    color: '#1A2C3D',
  },
  {
    title: 'Múltiples capas de imagen',
    desc: 'Superpón varias imágenes o planos en el mismo lienzo, ajusta su posición y realiza mediciones cruzadas entre diferentes archivos.',
    icon: <LayersIcon />,
    bg: '#E0DDD7',
    color: '#1A2C3D',
  },
  {
    title: 'Privacidad total — sin servidor',
    desc: 'Ningún archivo se sube a ningún servidor. Todo el procesamiento ocurre localmente en tu navegador, garantizando la confidencialidad de tus planos.',
    icon: <LockIcon />,
    bg: '#E0DDD7',
    color: '#1A2C3D',
  },
];

const HOW_TO_STEPS = [
  {
    title: 'Carga tu plano o imagen',
    desc: 'Arrastra un archivo JPG, PNG, WEBP o PDF directamente a la herramienta. También puedes cargarlo desde tu dispositivo con un solo clic.',
  },
  {
    title: 'Calibra la escala',
    desc: 'Traza una línea sobre una longitud de referencia del plano (por ejemplo, un segmento indicado como 5 m) e introduce la medida real.',
  },
  {
    title: 'Mide distancias y áreas',
    desc: 'Activa la herramienta de distancia o área y dibuja sobre el plano. Las medidas aparecen al instante en la unidad que hayas elegido.',
  },
  {
    title: 'Exporta tus resultados',
    desc: 'Renombra y organiza cada medición. Exporta todo a CSV para importarlo en Excel, Google Sheets o tu presupuesto de obra.',
  },
];

const USE_CASES = [
  {
    emoji: '🏛️',
    role: 'Arquitectos y aparejadores',
    desc: 'Comprueba medidas en planos de proyecto sin abrir AutoCAD ni Revit. Ideal para revisiones rápidas de planos en PDF.',
  },
  {
    emoji: '🔨',
    role: 'Constructoras y jefes de obra',
    desc: 'Mide longitudes de tabiquería, superficie de pavimentos o cubiertas directamente sobre el plano escaneado para elaborar presupuestos.',
  },
  {
    emoji: '🏠',
    role: 'Agentes inmobiliarios y compradores',
    desc: 'Calcula la superficie real de estancias a partir del plano de la vivienda, sin depender de los datos del vendedor.',
  },
  {
    emoji: '🪛',
    role: 'Reformistas y autónomos',
    desc: 'Cuantifica metros lineales de zócalos, m² de azulejos o superficies a pintar directamente sobre la imagen del plano.',
  },
];

const FAQ_ITEMS = [
  {
    q: '¿Cómo puedo medir distancias en un plano online?',
    a: 'Carga tu plano en mideplanos (JPG, PNG, WEBP o PDF), calibra la escala trazando una línea de referencia conocida y usa la herramienta de distancia para trazar segmentos sobre el plano. La distancia real aparece automáticamente en la unidad que hayas elegido: metros, centímetros, milímetros, pies o pulgadas.',
  },
  {
    q: '¿Puedo medir áreas y superficies en una imagen?',
    a: 'Sí. La herramienta de área te permite dibujar polígonos de cualquier forma sobre la imagen para calcular superficies. Una vez calibrada la escala, el área se muestra en metros cuadrados, centímetros cuadrados o la unidad seleccionada.',
  },
  {
    q: '¿Funciona con archivos PDF?',
    a: 'Sí. mideplanos admite archivos PDF, incluidos los de varias páginas. Puedes navegar entre páginas y aplicar mediciones en cada una de ellas, sin límite de páginas.',
  },
  {
    q: '¿Cómo se calibra la escala de un plano?',
    a: 'Activa la herramienta de calibración, traza una línea sobre una longitud conocida del plano (por ejemplo, "5 m" indicado en el propio plano) e introduce esa medida real. La herramienta calculará el factor de escala y todas las medidas posteriores serán automáticas.',
  },
  {
    q: '¿Es gratis? ¿Hay límite de mediciones?',
    a: 'Sí, mideplanos es completamente gratuito. No hay límite de mediciones ni de archivos. No requiere registro ni tarjeta de crédito.',
  },
  {
    q: '¿Mis archivos se suben a Internet?',
    a: 'No. Todo el procesamiento ocurre localmente en tu navegador mediante la API Canvas de HTML5. Tus planos e imágenes nunca se envían a ningún servidor externo, lo que garantiza total privacidad y confidencialidad.',
  },
  {
    q: '¿Qué unidades de medida admite?',
    a: 'mideplanos soporta metros (m), centímetros (cm), milímetros (mm), pies (ft) y pulgadas (in). Puedes cambiar la unidad en cualquier momento recalibrando la escala.',
  },
  {
    q: '¿Puedo guardar y exportar mis mediciones?',
    a: 'Sí. Las mediciones se guardan automáticamente como proyectos en tu navegador. Además, puedes exportarlas a CSV con un clic para usarlas en Excel, Google Sheets o cualquier herramienta de cálculo.',
  },
];

// ─── SVG icons ────────────────────────────────────────────────────────────────

function DimensionIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <line x1="2" y1="11" x2="30" y2="11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="2" y1="6.5" x2="2" y2="15.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="6.5" x2="30" y2="15.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="22" x2="19" y2="22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="2" y1="17.5" x2="2" y2="26.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="19" y1="17.5" x2="19" y2="26.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  );
}

function ArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 12l9-9 9 9-9 9-9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 6l6 6M7 10l2 2M12 5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SquareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
    </svg>
  );
}

function CrosshairIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 12l10 5 10-5M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2v14M6 10l6 6 6-6M3 20h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
