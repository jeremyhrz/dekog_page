import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Fuentes servidas desde el propio sitio (sin Google Fonts). Renovación de 2026: Bodoni Moda (con tamaño óptico: en
// los títulos enormes toma el corte fino de exhibición) para los títulos y Jost para el resto. Cada archivo trae su
// unicode-range: el navegador solo baja el juego latino que usa el español.
import '@fontsource-variable/bodoni-moda/opsz.css'
import '@fontsource-variable/bodoni-moda/opsz-italic.css'
import '@fontsource-variable/jost'
import './index.css'
import './tailwind.css' // después de index.css, como cargaba el CDN
import { Analytics } from '@vercel/analytics/react'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>,
)