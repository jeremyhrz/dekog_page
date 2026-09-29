import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
