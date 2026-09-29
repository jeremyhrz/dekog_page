import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Solo en desarrollo: /api lo atiende scripts/api-dev.mjs.
    // En Vercel, /api lo sirven las funciones de la carpeta api/.
    proxy: { '/api': 'http://localhost:3001' },
  },
})
