import React, { Fragment, useRef } from 'react';
import {
  motion, useAnimationFrame, useInView, useMotionValue, useScroll, useSpring, useTransform, useVelocity,
} from 'framer-motion';
import { cx, useMenosMovimiento } from '../../lib/movimiento';

/**
 * Marquesina infinita que se acelera con la velocidad del scroll, cambia de sentido al subir y, si `inclinar`, se
 * sesga un poco con el impulso. Se pausa fuera de pantalla y queda quieta con «reducir movimiento».
 *   <Cinta elementos={['Diseñamos', 'Construimos']} className="py-5 font-display text-4xl" />
 * - `velocidad`: % del recorrido por segundo en reposo (3 por defecto).
 * - `direccion`: -1 hacia la izquierda (por defecto) o 1 hacia la derecha.
 * - `repetir`: cuántas veces se repite la lista en cada mitad (súbelo si la lista es corta).
 */
export default function Cinta({
  elementos,
  velocidad = 3,
  direccion = -1,
  separador = '✦',
  repetir = 2,
  inclinar = true,
  className,
  claseElemento,
  claseSeparador,
}) {
  const ref = useRef(null);
  const enPantalla = useInView(ref, { margin: '15% 0px' });
  const menos = useMenosMovimiento();

  const avance = useMotionValue(0);
  const { scrollY } = useScroll();
  const impulso = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(impulso, [-1000, 0, 1000], [-4, 0, 4], { clamp: false });
  const sesgo = useTransform(impulso, [-3000, 0, 3000], [7, 0, -7]);
  const sentido = useRef(direccion);

  useAnimationFrame((_, delta) => {
    if (!enPantalla || menos) return;
    const f = factor.get();
    if (f < 0) sentido.current = -direccion;
    else if (f > 0) sentido.current = direccion;
    const paso = sentido.current * velocidad * (delta / 1000) * (1 + Math.abs(f));
    // Dos mitades idénticas: recorre de 0 a -50 % y vuelve a empezar sin costura.
    avance.set((((avance.get() + paso) % 50) - 50) % 50);
  });

  const x = useTransform(avance, (v) => `${v}%`);
  const lista = Array.from({ length: repetir }, () => elementos).flat();
  const mitad = (
    <div className="flex shrink-0 items-center">
      {lista.map((elemento, i) => (
        <Fragment key={i}>
          <span className={cx('shrink-0 whitespace-nowrap', claseElemento)}>{elemento}</span>
          <span className={cx('shrink-0 px-[0.6em]', claseSeparador)}>{separador}</span>
        </Fragment>
      ))}
    </div>
  );

  return (
    <div ref={ref} className={cx('overflow-hidden', className)}>
      {elementos.every((e) => typeof e === 'string') && (
        <ul className="sr-only">
          {elementos.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <motion.div aria-hidden="true" className="flex w-max" style={{ x, skewX: inclinar && !menos ? sesgo : 0 }}>
        {mitad}
        {mitad}
      </motion.div>
    </div>
  );
}
