import React, { useRef } from 'react';
import { motion, useSpring } from 'framer-motion';
import { cx, useMenosMovimiento, usePunteroFino } from '../../lib/movimiento';

/**
 * Envuelve un botón o enlace para que se deje atraer por el cursor (solo escritorio).
 *   <Magnetico><a className="boton boton-oscuro" href="#catalogo">Ver el catálogo</a></Magnetico>
 * `fuerza`: cuánto sigue al cursor (0,2 sutil · 0,35 por defecto · 0,5 marcado).
 */
export default function Magnetico({ fuerza = 0.35, como = 'div', className, children }) {
  const ref = useRef(null);
  const fino = usePunteroFino();
  const menos = useMenosMovimiento();
  const resorte = { stiffness: 170, damping: 14, mass: 0.35 };
  const x = useSpring(0, resorte);
  const y = useSpring(0, resorte);
  const Elemento = motion[como];
  const activo = fino && !menos;

  const mover = (evento) => {
    const caja = ref.current.getBoundingClientRect();
    x.set((evento.clientX - (caja.left + caja.width / 2)) * fuerza);
    y.set((evento.clientY - (caja.top + caja.height / 2)) * fuerza);
  };
  const soltar = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <Elemento
      ref={ref}
      className={cx('inline-block', className)}
      style={activo ? { x, y } : undefined}
      onPointerMove={activo ? mover : undefined}
      onPointerLeave={activo ? soltar : undefined}
    >
      {children}
    </Elemento>
  );
}
