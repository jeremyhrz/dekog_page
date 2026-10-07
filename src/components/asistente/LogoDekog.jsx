import React from 'react';

/**
 * La «D» de rayas de Dekog, vectorizada desde public/logo.png (coincide un 99,5 % con el original).
 * Va dentro del HTML, sin imagen que descargar. Cada raya es un <path> para poder animarlas una a una
 * (`dk-logo-entra` y `dk-logo-ola`, en asistente.css). Sin ids ni clipPath: se puede repetir en la página.
 */
const RAYAS = [
  'M0 2.3H45.8L44.5 0.2H74.3A61.1 61.1 0 0 1 83 7.8H0Z',
  'M0 17.2H53.7L53.2 15.2H89.1A61.1 61.1 0 0 1 93.6 22.8H0Z',
  'M0 32.7H57.2L56.9 30.7H96.9A61.1 61.1 0 0 1 98.8 38.2H0Z',
  'M0 48.1H56.5L56.9 46.1H99.8A61.1 61.1 0 0 1 99.9 53.7H0Z',
  'M0 63.6H51.8L52.8 61.5H98.9A61.1 61.1 0 0 1 96.9 69.1H0Z',
  'M0 79H41.9L43.5 77H93.7A61.1 61.1 0 0 1 89.2 84.6H0Z',
  'M0 94.5H20.7L24.9 92.4H82.9A61.1 61.1 0 0 1 74 100H0Z',
];

/** animacion: 'entra' (las rayas se dibujan de izquierda a derecha) u 'ola' (mientras escribe). */
export function MarcaD({ className = '', style, animacion }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" focusable="false" style={style}
      className={`dk-logo${animacion ? ` dk-logo-${animacion}` : ''} ${className}`}>
      {RAYAS.map((d, i) => <path key={i} d={d} style={{ '--i': i }} />)}
    </svg>
  );
}

/** Ícono de la marca: círculo negro con la D blanca al 40 % (la proporción del favicon). */
export function AvatarDekog({ tam = 40, animacion, className = '', children }) {
  const marca = Math.round(tam * 0.4);
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-full bg-black text-white ${className}`}
      style={{ width: tam, height: tam }}>
      <MarcaD animacion={animacion} className="block" style={{ width: marca, height: marca }} />
      {children}
    </span>
  );
}
