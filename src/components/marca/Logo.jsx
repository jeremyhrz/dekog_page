import React from 'react';
import { motion } from 'framer-motion';
import { MarcaD } from '../asistente/LogoDekog';
import { CORTINA, EXPO } from '../../lib/movimiento';

/**
 * El logo de Dekog (la D de rayas + «Dekog»), recortado de public/logo.png por
 * dekog_trabajo/scripts_cambios/logo_web.py: public/marca/dekog-logo-{negro,blanco}.{webp,png}, 572 × 200.
 * WebP con respaldo PNG: iOS 13 no lee WebP.
 */
export function LogoDekog({ tono = 'negro', className = '', alt = 'Dekog' }) {
  return (
    <picture>
      <source type="image/webp" srcSet={`/marca/dekog-logo-${tono}.webp`} />
      <img src={`/marca/dekog-logo-${tono}.png`} alt={alt} width="572" height="200" className={className} draggable="false" />
    </picture>
  );
}

// Proporciones del logo original (alto = 1): la D es cuadrada; la palabra empieza en 1,258, arriba en 0,316, mide
// 0,459 de alto y 1,601 de ancho (logo_palabra.py). Así la versión animada calza con la imagen.
const PALABRA = { izquierda: 1.258, arriba: 0.316, alto: 0.459, ancho: 1.601 };
export const PROPORCION_LOGO = 2.86;

/**
 * El logo armado por piezas para animarlo (la intro y el pie): las rayas de la D entran de izquierda a derecha, una
 * tras otra, y «Dekog» sube desde una máscara. `alto` en px o cualquier medida CSS; `retraso` en segundos.
 */
export function LogoAnimado({ tono = 'negro', alto = 64, retraso = 0, animar = true, className = '' }) {
  const medida = typeof alto === 'number' ? `${alto}px` : alto;
  const color = tono === 'blanco' ? 'text-papel' : 'text-tinta';
  return (
    <span
      role="img"
      aria-label="Dekog"
      className={`relative inline-block ${color} ${className}`}
      style={{ height: medida, width: `calc(${medida} * ${PROPORCION_LOGO})` }}
    >
      <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" className="absolute left-0 top-0 h-full" style={{ width: medida }}>
        {RAYAS.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            style={{ transformBox: 'fill-box', originX: 0 }}
            initial={animar ? { scaleX: 0 } : false}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.75, ease: CORTINA, delay: retraso + i * 0.07 }}
          />
        ))}
      </svg>
      <span
        aria-hidden="true"
        className="absolute overflow-hidden"
        style={{
          left: `calc(${medida} * ${PALABRA.izquierda})`,
          top: `calc(${medida} * ${PALABRA.arriba})`,
          height: `calc(${medida} * ${PALABRA.alto})`,
          width: `calc(${medida} * ${PALABRA.ancho})`,
        }}
      >
        <motion.span
          className="block h-full w-full"
          initial={animar ? { y: '110%' } : false}
          animate={{ y: '0%' }}
          transition={{ duration: 0.9, ease: EXPO, delay: retraso + 0.45 }}
        >
          <picture>
            <source type="image/webp" srcSet={`/marca/dekog-palabra-${tono}.webp`} />
            <img src={`/marca/dekog-palabra-${tono}.png`} alt="" className="block h-full w-full" draggable="false" />
          </picture>
        </motion.span>
      </span>
    </span>
  );
}

// Las 7 rayas de la D (las mismas de asistente/LogoDekog.jsx → MarcaD), para animarlas una a una.
const RAYAS = [
  'M0 2.3H45.8L44.5 0.2H74.3A61.1 61.1 0 0 1 83 7.8H0Z',
  'M0 17.2H53.7L53.2 15.2H89.1A61.1 61.1 0 0 1 93.6 22.8H0Z',
  'M0 32.7H57.2L56.9 30.7H96.9A61.1 61.1 0 0 1 98.8 38.2H0Z',
  'M0 48.1H56.5L56.9 46.1H99.8A61.1 61.1 0 0 1 99.9 53.7H0Z',
  'M0 63.6H51.8L52.8 61.5H98.9A61.1 61.1 0 0 1 96.9 69.1H0Z',
  'M0 79H41.9L43.5 77H93.7A61.1 61.1 0 0 1 89.2 84.6H0Z',
  'M0 94.5H20.7L24.9 92.4H82.9A61.1 61.1 0 0 1 74 100H0Z',
];

export { MarcaD };
