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
    },
  },
  plugins: [],
};
