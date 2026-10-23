/**
 * Tailwind se compila al construir el sitio (antes se cargaba el «Play CDN» en index.html, que
 * generaba el CSS en el navegador de cada visitante: lento y no apto para producción).
 * Las clases se toman de los archivos de `content`: si se arma un nombre de clase por partes (p. ej.
 * `bg-${color}-500`), Tailwind no lo ve; usar siempre clases completas, aunque sea dentro de una condición.
 *
 * Renovación de 2026 (estilo editorial): la paleta vive AQUÍ y src/tailwind.css la expone también como
 * variables CSS (--hueso, --tinta…). Bodoni Moda para los títulos y Jost para el resto (src/main.jsx).
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hueso: '#F3EEE7', // fondo
        papel: '#FAF7F2', // paneles claros
        arena: '#E5DCD0',
        piedra: '#CFC4B6',
        tinta: '#151311', // texto y logo
        grafito: '#2A2724',
        noche: '#161412', // secciones oscuras
        madera: {
          DEFAULT: '#A47A52', // acento (decorativo, fondos, sobre oscuro)
          titulo: '#95704B', // texto grande sobre claro (contraste ≥ 3:1)
          oscuro: '#7A5B3D', // texto pequeño sobre claro (contraste ≥ 4,5:1)
          claro: '#C9A27C', // texto sobre oscuro
        },
      },
      fontFamily: {
        sans: ['"Jost Variable"', 'Jost', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Bodoni Moda Variable"', '"Bodoni 72"', 'Didot', 'Georgia', 'serif'],
      },
      fontSize: {
        portada: ['clamp(3rem, 11.5vw, 9rem)', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        seccion: ['clamp(2.5rem, 8.5vw, 6rem)', { lineHeight: '0.95', letterSpacing: '-0.015em' }],
      },
      letterSpacing: {
        etiqueta: '0.22em',
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
        suave: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      zIndex: {
        nav: '50',
        progreso: '51',
        menu: '58',
        intro: '100',
        // Por encima de todo, también del modal de proyectos (10000) y del selector de WhatsApp (1000).
        cursor: '20000',
      },
      maxWidth: {
        contenedor: '1320px',
      },
    },
  },
  plugins: [],
};
