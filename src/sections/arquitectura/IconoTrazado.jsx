import React, { useLayoutEffect, useRef } from 'react';
import { useInView } from 'framer-motion';
import { VISTA, cx, useMenosMovimiento } from '../../lib/movimiento';

const TRAZOS = 'path, circle, rect, line, polyline, polygon, ellipse';
const CURVA = 'cubic-bezier(0.65, 0, 0.35, 1)';

/**
 * Un ícono de lucide que se dibuja trazo a trazo, como a pluma, la primera vez que entra en pantalla: cada trazo mide
 * su largo (getTotalLength) y se destapa con stroke-dashoffset. El hueco del guion es más largo que el trazo, así que
 * escondido no deja ni un punto con las puntas redondas. Con «reducir movimiento», o en un navegador que no sepa medir
 * un trazo, el ícono se ve entero desde el principio.
 *   <IconoTrazado icono={DraftingCompass} retraso={0.2} size={44} />
 * `grosor`: el trazo en px de pantalla, sea cual sea el tamaño (absoluteStrokeWidth de lucide).
 */
export default function IconoTrazado({ icono, retraso = 0, duracion = 1.6, size = 40, grosor = 1.15, className }) {
  const Icono = icono;
  const ref = useRef(null);
  const visto = useInView(ref, VISTA);
  const menos = useMenosMovimiento();

  // Antes de pintar: si no, el ícono se vería entero un cuadro antes de esconderse.
  useLayoutEffect(() => {
    const caja = ref.current;
    if (!caja || menos) return;
    caja.querySelectorAll(TRAZOS).forEach((trazo) => {
      let largo = 0;
      try {
        largo = trazo.getTotalLength();
      } catch {
        largo = 0;
      }
      if (!largo) return;
      trazo.style.strokeDasharray = `${largo} ${largo + 4}`;
      trazo.style.transition = visto ? `stroke-dashoffset ${duracion}s ${CURVA} ${retraso}s` : 'none';
      trazo.style.strokeDashoffset = visto ? '0' : `${largo + 2}`;
    });
  }, [visto, menos, retraso, duracion]);

  return (
    <span ref={ref} aria-hidden="true" className={cx('inline-block leading-none', className)}>
      <Icono size={size} strokeWidth={grosor} absoluteStrokeWidth className="block" />
    </span>
  );
}
