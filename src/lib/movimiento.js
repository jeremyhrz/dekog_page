import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Lenguaje de movimiento de la web (renovación de 2026). Todo anima transform, opacity o clip-path.
 * Con «reducir movimiento», <MotionConfig reducedMotion="user"> (App.jsx) apaga los desplazamientos y quedan
 * fundidos; lo que no sea transform (clip-path, pathLength) se resuelve a mano con useMenosMovimiento().
 */

export const EXPO = [0.16, 1, 0.3, 1];
export const SUAVE = [0.22, 1, 0.36, 1];
export const CORTINA = [0.76, 0, 0.24, 1];

export const DURACION = { revelado: 1, interaccion: 0.3 };

/** Opciones de `viewport` para whileInView: una sola vez, un poco antes del borde inferior. */
export const VISTA = { once: true, margin: '0px 0px -12% 0px' };

export const transicion = (extra) => ({ duration: DURACION.revelado, ease: EXPO, ...extra });

/** Variantes con estados `oculto` → `visible`. */
export const variantes = {
  aparecer: {
    oculto: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: transicion() },
  },
  mascara: {
    oculto: { y: '120%' },
    visible: { y: '0%', transition: transicion() },
  },
  foto: {
    oculto: { clipPath: 'inset(100% 0% 0% 0%)' },
    visible: { clipPath: 'inset(0% 0% 0% 0%)', transition: transicion({ duration: 1.2 }) },
  },
  fotoInterior: {
    oculto: { scale: 1.2 },
    visible: { scale: 1, transition: transicion({ duration: 1.4 }) },
  },
  fundido: {
    oculto: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  },
};

/** Padre que escalona a sus hijos: `variants={escalonar(0.06)}`. */
export const escalonar = (escalon = 0.06, retraso = 0) => ({
  oculto: {},
  visible: { transition: { staggerChildren: escalon, delayChildren: retraso } },
});

/** true si quien visita pidió reducir el movimiento. */
export function useMenosMovimiento() {
  return useReducedMotion() ?? false;
}

/**
 * Escucha un media query. addListener y no addEventListener('change'): Safari lo trae recién en iOS 14, y en un
 * efecto el error dejaba la página en blanco en iPhone viejos.
 */
export function useMedio(consulta) {
  const [cumple, setCumple] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches);
  useEffect(() => {
    const medio = window.matchMedia(consulta);
    const cambiar = () => setCumple(medio.matches);
    cambiar();
    if (medio.addEventListener) medio.addEventListener('change', cambiar);
    else medio.addListener(cambiar);
    return () => {
      if (medio.removeEventListener) medio.removeEventListener('change', cambiar);
      else medio.removeListener(cambiar);
    };
  }, [consulta]);
  return cumple;
}

/** true en escritorio con ratón o trackpad (puntero fino que puede hacer hover). */
export const usePunteroFino = () => useMedio('(pointer: fine) and (hover: hover)');

/** Une clases condicionales: cx('a', cond && 'b'). */
export const cx = (...clases) => clases.filter(Boolean).join(' ');
