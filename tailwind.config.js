/**
 * Tailwind se compila al construir el sitio (antes se cargaba el «Play CDN» en index.html, que
 * generaba el CSS en el navegador de cada visitante: lento y no apto para producción).
 * Mismo tema que tenía el CDN. Las clases se toman de los archivos de `content`: si se arma un
 * nombre de clase por partes (p. ej. `bg-${color}-500`), Tailwind no lo ve; usar siempre clases
 * completas, aunque sea dentro de una condición.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Fuentes servidas desde el propio sitio (@fontsource-variable, importadas en src/main.jsx).
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display Variable', 'Playfair Display', 'serif'],
      },
      // Los colores de esas piezas, con los de la web de antes (el fondo #f4f0ec, el negro #1a1a1a): sin marrón.
      colors: {
        hueso: '#f4f0ec',
        papel: '#FDFCFA',
        arena: '#eae6e1',
        piedra: '#e2ded9',
        tinta: '#1a1a1a',
        grafito: '#4a4a4a',
        noche: '#111111',
        madera: { DEFAULT: '#4a4a4a', titulo: '#6b6b6b', oscuro: '#6b6b6b', claro: '#bdbdbd' },
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
        suave: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      zIndex: {
        // El cursor circular, por encima de todo (también del modal de proyectos y del selector de WhatsApp).
        cursor: '20000',
      },
    },
  },
  plugins: [],
};
