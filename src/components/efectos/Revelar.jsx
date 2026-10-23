import React from 'react';
import { motion } from 'framer-motion';
import { DURACION, EXPO, VISTA, useMenosMovimiento } from '../../lib/movimiento';

/**
 * Aparece (sube y se funde) la primera vez que entra en pantalla.
 *   <Revelar>…</Revelar>
 *   <Revelar como="p" retraso={0.15} y={20} className="max-w-md">…</Revelar>
 * Con «reducir movimiento» solo se funde. El resto de props van al elemento (onClick, id…).
 */
export default function Revelar({ como = 'div', retraso = 0, y = 32, duracion = DURACION.revelado, children, ...resto }) {
  const menos = useMenosMovimiento();
  const Elemento = motion[como];
  return (
    <Elemento
      initial={{ opacity: 0, y: menos ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VISTA}
      transition={{ duration: menos ? 0.4 : duracion, ease: EXPO, delay: retraso }}
      {...resto}
    >
      {children}
    </Elemento>
  );
}
