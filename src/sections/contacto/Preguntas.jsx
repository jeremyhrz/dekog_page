import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import { EXPO, VISTA, cx, escalonar, useMenosMovimiento, variantes } from '../../lib/movimiento';
import { elegirWhatsapp } from '../../utils/whatsapp';
import { horasEnteras } from './texto';

const PREGUNTAS = [
  {
    pregunta: '¿Cuál es el tiempo de respuesta para consultas?',
    respuesta: 'Nuestras asesoras responden por WhatsApp (Línea 1 o Línea 2) de lunes a sábado, de 9:00 a. m. a 6:00 p. m. Fuera de ese horario, el chat de esta página te responde al instante, a cualquier hora.',
  },
  {
    pregunta: '¿Ofrecen consultas gratuitas?',
    respuesta: 'Sí, ofrecemos una consulta inicial gratuita para entender tu proyecto y necesidades. Puede ser presencial o virtual según tu preferencia.',
  },
  {
    pregunta: '¿Trabajan en todo el país?',
    respuesta: 'Sí, trabajamos a nivel nacional. Para proyectos fuera de Valencia, coordinamos visitas periódicas y supervisión remota.',
  },
  {
    pregunta: '¿Cuál es el proceso para comenzar un proyecto?',
    pasos: ['Consulta inicial', 'Propuesta de diseño', 'Aprobación y contratación', 'Desarrollo del proyecto', 'Entrega y seguimiento'],
  },
];

/**
 * Preguntas frecuentes: un acordeón accesible (cada pregunta es un <button aria-expanded> que controla su respuesta),
 * con filetes entre filas; la respuesta se abre con su alto y un fundido. Se pueden abrir varias a la vez: así una
 * fila que se cierra arriba no corre la que se acaba de tocar. La primera viene abierta.
 */
export default function Preguntas() {
  const [abiertas, setAbiertas] = useState([0]);
  const alternar = (i) => setAbiertas((antes) => (antes.indexOf(i) >= 0 ? antes.filter((n) => n !== i) : antes.concat(i)));

  return (
    <section aria-labelledby="preguntas-titulo" className="seccion relative bg-papel">
      <div className="contenedor grid gap-y-12 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:sticky lg:top-32 lg:col-span-5 lg:self-start lg:pr-10">
          <Revelar como="p" y={12} className="etiqueta flex items-center text-madera-oscuro">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Preguntas frecuentes
          </Revelar>
          <TextoDividido
            como="h2"
            id="preguntas-titulo"
            texto="Lo que más nos *preguntan*"
            className="titulo-display mt-5 text-[clamp(2.75rem,5.6vw,5.25rem)]"
          />
          <Revelar como="p" retraso={0.15} className="mt-6 max-w-sm text-[1.0625rem] leading-relaxed text-grafito">
            Resolvemos tus dudas más comunes sobre nuestros servicios.
          </Revelar>
          <Revelar retraso={0.25} className="mt-8">
            <button
              type="button"
              onClick={() => elegirWhatsapp('Hola, tengo una pregunta sobre sus servicios.')}
              className="etiqueta group inline-flex min-h-[44px] items-center text-tinta transition-colors duration-300 hover:text-madera-oscuro"
            >
              <span className="enlace-linea pb-1">¿Otra pregunta? Escríbenos</span>
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
            </button>
          </Revelar>
        </div>

        <motion.ul
          className="border-t border-tinta/10 lg:col-span-7 lg:col-start-6"
          initial="oculto"
          whileInView="visible"
          viewport={VISTA}
          variants={escalonar(0.1)}
        >
          {PREGUNTAS.map((p, i) => (
            <Pregunta key={p.pregunta} indice={i} {...p} abierta={abiertas.indexOf(i) >= 0} alAlternar={() => alternar(i)} />
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

function Pregunta({ indice, pregunta, respuesta, pasos, abierta, alAlternar }) {
  const menos = useMenosMovimiento();
  const id = `pregunta-${indice + 1}`;
  const numero = String(indice + 1).padStart(2, '0');
  const transicion = menos
    ? { duration: 0.2 }
    : { height: { duration: 0.65, ease: EXPO }, opacity: { duration: 0.45, ease: 'easeOut' } };

  return (
    <motion.li variants={variantes.aparecer} className="border-b border-tinta/10">
      <h3>
        <button
          type="button"
          id={`${id}-boton`}
          aria-expanded={abierta}
          aria-controls={abierta ? `${id}-respuesta` : undefined}
          onClick={alAlternar}
          className="group flex w-full items-start py-6 text-left lg:py-7"
        >
          <span className="etiqueta w-10 shrink-0 pt-[0.6em] tabular-nums text-madera-oscuro lg:w-14">{numero}</span>
          <span
            className={cx(
              'min-w-0 flex-1 font-display text-[1.4rem] leading-[1.2] tracking-[-0.01em] transition-colors duration-300 lg:text-[1.75rem]',
              abierta ? 'text-tinta' : 'text-tinta/85 group-hover:text-madera-titulo',
            )}
          >
            {pregunta}
          </span>
          <Signo abierta={abierta} />
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            key="respuesta"
            id={`${id}-respuesta`}
            role="region"
            aria-labelledby={`${id}-boton`}
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transicion}
          >
            <div className="pb-8 pl-10 pr-2 text-[1.0625rem] leading-relaxed text-grafito sm:pr-14 lg:pl-14">
              {respuesta && <p className="max-w-xl">{horasEnteras(respuesta)}</p>}
              {pasos && (
                <ol className="max-w-xl border-l border-madera/40 pl-5">
                  {pasos.map((paso, n) => (
                    <li key={paso} className={cx('flex items-baseline', n > 0 && 'mt-2.5')}>
                      <span className="etiqueta w-9 shrink-0 tabular-nums text-madera-oscuro">{String(n + 1).padStart(2, '0')}</span>
                      <span>{paso}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/** Más que se vuelve menos: la raya vertical gira hasta acostarse sobre la horizontal. El círculo se llena al abrir. */
function Signo({ abierta }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'relative ml-4 mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 ring-inset transition-colors duration-500 ease-expo',
        abierta ? 'bg-tinta text-papel ring-tinta' : 'text-tinta ring-tinta/20 group-hover:ring-tinta/50',
      )}
    >
      <span className="absolute h-px w-3.5 bg-current" />
      <span className={cx('absolute h-3.5 w-px bg-current transition-transform duration-500 ease-expo', abierta && 'rotate-90')} />
    </span>
  );
}
