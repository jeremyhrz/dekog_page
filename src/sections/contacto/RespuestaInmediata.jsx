import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Magnetico from '../../components/efectos/Magnetico';
import { MarcaD } from '../../components/marca/Logo';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { VISTA, cx, escalonar, variantes } from '../../lib/movimiento';
import { propsWhatsapp } from '../../utils/whatsapp';
import { horasEnteras } from './texto';
import './aviso.css';

const QUIEN_RESPONDE = [
  ['Asesoras por WhatsApp', 'Lunes a sábado · 9:00 a. m. a 6:00 p. m.'],
  ['Chat de esta página', 'A cualquier hora, al instante'],
];

/**
 * ¿Necesitas respuesta inmediata?: banda noche con la D de rayas apenas visible (grande a la derecha en escritorio; en
 * el teléfono, junto al titular), que se dibuja raya a raya al llegar (aviso.css); el titular, quién responde y cuándo,
 * y el botón que abre el selector de WhatsApp.
 */
export default function RespuestaInmediata() {
  const banda = useRef(null);
  const vista = useInView(banda, { once: true, margin: '0px 0px -25% 0px' });

  return (
    <section ref={banda} aria-labelledby="inmediata-titulo" className="sobre-oscuro seccion relative isolate overflow-hidden bg-noche text-hueso">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[var(--margen)] top-[calc(var(--aire)+1.75rem)] -z-10 w-[36%] max-w-[560px] text-hueso/[0.06] sm:w-[30%] lg:right-[3%] lg:top-1/2 lg:w-[36%] lg:-translate-y-1/2 lg:text-hueso/[0.035]"
      >
        <MarcaD animacion={vista ? 'aviso' : undefined} className={cx('h-auto w-full', !vista && 'opacity-0')} />
      </div>

      <div className="contenedor grid gap-y-12 lg:grid-cols-12 lg:items-end lg:gap-x-8">
        <div className="lg:col-span-7">
          <Revelar como="p" y={12} className="etiqueta flex items-center text-madera-claro">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Atención por WhatsApp
          </Revelar>
          <TextoDividido como="h2" id="inmediata-titulo" texto="¿Necesitas respuesta *inmediata*?" className="titulo-display mt-5" />
        </div>

        <div className="lg:col-span-5 lg:pb-2">
          <Revelar retraso={0.15}>
            <p className="max-w-md text-[1.0625rem] leading-relaxed text-hueso/75">
              Escríbenos por WhatsApp: elige la Línea 1 o la Línea 2 y te atiende una asesora. Fuera de horario, el chat de
              esta página te responde al instante.
            </p>
          </Revelar>

          <motion.dl className="mt-8 border-t border-hueso/15" initial="oculto" whileInView="visible" viewport={VISTA} variants={escalonar(0.1, 0.2)}>
            {QUIEN_RESPONDE.map(([quien, cuando]) => (
              <motion.div key={quien} variants={variantes.aparecer} className="border-b border-hueso/15 py-4">
                <dt className="etiqueta text-madera-claro">{quien}</dt>
                <dd className="mt-1.5 text-hueso/90">{horasEnteras(cuando)}</dd>
              </motion.div>
            ))}
          </motion.dl>

          <Revelar retraso={0.3} className="mt-9">
            <Magnetico className="w-full sm:w-auto">
              <a {...propsWhatsapp()} className="boton boton-claro w-full sm:w-auto">
                <IconoWhatsapp size={17} />
                <span>Escribir por WhatsApp</span>
              </a>
            </Magnetico>
          </Revelar>
        </div>
      </div>
    </section>
  );
}
