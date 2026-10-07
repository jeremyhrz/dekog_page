import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Fuentes servidas desde el propio sitio (antes, de Google Fonts: una conexión aparte que frenaba el primer
// pintado). Son variables (un archivo para todos los grosores) y solo se baja el juego de caracteres que se usa.
import '@fontsource-variable/inter'
import '@fontsource-variable/playfair-display'
import './index.css'
import './tailwind.css' // después de index.css, como cargaba el CDN
import { Analytics } from '@vercel/analytics/react'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>,
)