import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Los archivos con hash van a /static/ (y no a /assets/, donde están las fotos de public/assets): así
    // vercel.json puede pedirle al navegador que los guarde un año, porque cada versión cambia el nombre.
    assetsDir: 'static',
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
