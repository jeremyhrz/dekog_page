import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Los archivos con hash van a /static/ (y no a /assets/, donde están las fotos de public/assets): así
    // vercel.json puede pedirle al navegador que los guarde un año, porque cada versión cambia el nombre.
    assetsDir: 'static',
    // La web tiene que andar en iPhone viejos (desde iOS 13): esbuild rebaja la sintaxis nueva de la web y de sus
    // dependencias (campos de clase, ??=, ?. y ?? en el JS; inset en el CSS). Sin esto Vite compila para Safari 16. Las
    // APIs (.at(), Object.hasOwn…) no se rebajan: las frena scripts/compatibilidad.mjs antes del build, y después del
    // build comprueba que iOS 13.0 lea lo publicado (ES2020 sin ?., ?? ni BigInt): si falla, revisa esta línea.
    target: ['es2020', 'safari13'],
  },
  server: {
    // Solo en desarrollo: el chat del asistente habla con el Worker local
    // (npm run asistente:dev, puerto 8787). En producción usa VITE_ASISTENTE_API.
    proxy: {
      '/asistente-api': {
        target: 'http://localhost:8787',
        rewrite: (ruta) => ruta.replace(/^\/asistente-api/, ''),
      },
    },
  },
})
