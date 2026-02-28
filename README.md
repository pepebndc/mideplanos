# mideplanos

Herramienta web gratuita para medir distancias y áreas en planos de construcción, imágenes y PDFs. Todo ocurre en el navegador, sin registro ni subida de datos a servidores.

## Características

- **Carga de archivos**: JPG, PNG, WEBP y PDF (multipágina)
- **Herramienta de distancia**: Traza líneas con múltiples segmentos (clic para añadir punto, doble clic para finalizar)
- **Herramienta de área**: Dibuja polígonos para calcular superficies
- **Calibración de escala**: Traza una línea de referencia conocida y asigna la medida real para obtener resultados en unidades reales (m, cm, mm, ft, in)
- **Zoom y pan**: Rueda del ratón para zoom, modo selección para arrastrar
- **Lista de medidas**: Renombra, elimina y exporta medidas a CSV
- **Atajos de teclado**: S (selección), C (calibrar), D (distancia), A (área), Esc (cancelar), Ctrl+Z / ⌘Z (deshacer)

## Uso

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Deploy en Vercel

Conecta el repositorio a [Vercel](https://vercel.com) y despliega automáticamente. No se requiere configuración adicional.

## Tecnologías

- [Next.js 16](https://nextjs.org/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- Canvas API nativo para renderizado de medidas
- [PDF.js](https://mozilla.github.io/pdf.js/) para renderizado de PDFs
- [Lucide React](https://lucide.dev/) para iconos
