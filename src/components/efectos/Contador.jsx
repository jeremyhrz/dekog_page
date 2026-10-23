import React, { useEffect, useRef } from 'react';
import { animate, useInView } from 'framer-motion';
import { EXPO, useMenosMovimiento } from '../../lib/movimiento';

const enteros = new Intl.NumberFormat('es-VE');

/**
 * Número que sube hasta `valor` la primera vez que entra en pantalla. Escribe directo en el DOM (sin re-render por
 * cuadro). Lectores de pantalla: el valor final.
 *   <Contador valor={120} antes="+" />
 */
export default function Contador({ valor, antes = '', despues = '', duracion = 1.8, retraso = 0, className }) {
  const ref = useRef(null);
  const visto = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const menos = useMenosMovimiento();
  const formato = (n) => `${antes}${enteros.format(Math.round(n))}${despues}`;

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return undefined;
    const escribir = (n) => {
      nodo.textContent = `${antes}${enteros.format(Math.round(n))}${despues}`;
    };
    if (!visto || menos) {
      escribir(visto || menos ? valor : 0);
      return undefined;
    }
    const control = animate(0, valor, { duration: duracion, delay: retraso, ease: EXPO, onUpdate: escribir });
    return () => control.stop();
  }, [visto, menos, valor, duracion, retraso, antes, despues]);

  return (
    <span className={className}>
      <span className="sr-only">{formato(valor)}</span>
      <span ref={ref} aria-hidden="true" className="tabular-nums">{formato(menos ? valor : 0)}</span>
    </span>
  );
}
