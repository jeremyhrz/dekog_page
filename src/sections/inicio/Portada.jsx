import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Magnetico from '../../components/efectos/Magnetico';
import TextoDividido, { Enfasis } from '../../components/efectos/TextoDividido';
import { MarcaD } from '../../components/marca/Logo';
import { IconoWhatsapp } from '../../components/asistente/comun';
import PilaFotos from './PilaFotos';
import { PORTADA } from '../../data/sitio';
import { promoActiva } from '../../../asistente/src/lib/promo';
import { useIntroTerminada } from '../../lib/intro';
import { EXPO, cx } from '../../lib/movimiento';
import { irA } from '../../lib/scroll';
import { elegirWhatsapp } from '../../utils/whatsapp';
import './inicio.css';

/**
 * Portada (#inicio): el titular enorme, revelado por palabras cuando termina la intro, y una pila de fotos de Dekog
 * que se baraja sola y se puede arrastrar. Chips con lo que distingue a Dekog alrededor de la pila.
 */
export default function Portada() {
  const listo = useIntroTerminada();
  const seccion = useRef(null);
  const promo = promoActiva();

  const chips = [
    promo
      ? { clase: 'left-[-12%] top-[12%] lg:left-[-26%]', variante: '', contenido: <>Hasta <strong className="font-semibold">20 %</strong> en piezas en stock</> }
      : { clase: 'left-[-12%] top-[12%] lg:left-[-26%]', variante: '', contenido: 'Proyectos llave en mano' },
    { clase: 'right-[-12%] top-[48%] lg:right-[-24%]', variante: 'flotar-b', contenido: <>Hecho <strong className="font-semibold">a la medida</strong></> },
    { clase: 'bottom-[8%] left-[-8%] lg:left-[-20%]', variante: 'flotar-c', contenido: 'Trabajamos a nivel nacional' },
  ];

  const entrar = (retraso) => ({
    initial: { opacity: 0, y: 26 },
    animate: listo ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 1.05, ease: EXPO, delay: retraso },
  });

  const bajar = () => {
    const caja = seccion.current && seccion.current.getBoundingClientRect();
    if (caja) irA(caja.bottom + window.scrollY);
  };

  return (
    <section id="inicio" ref={seccion} className="relative isolate overflow-hidden bg-hueso">
      <div className="contenedor portada-reticula relative pb-16 pt-[5.75rem] lg:min-h-screen lg:pb-28 lg:pt-28">
        <div className="portada-titular relative z-10 lg:self-end">
          <motion.p {...entrar(0)} className="etiqueta flex items-center text-madera-oscuro">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            {PORTADA.rotulo}
          </motion.p>
          <TextoDividido
            como="h1"
            texto={PORTADA.titular}
            alVer={false}
            animate={listo ? 'visible' : 'oculto'}
            retraso={0.1}
            escalon={0.065}
            duracion={1.1}
            className="titulo-display text-portada mt-4 text-tinta lg:mt-6 lg:text-[clamp(4.5rem,7vw,8rem)]"
          />
        </div>

        <div className="portada-pila relative mt-10 lg:mt-0">
          <PilaFotos fotos={PORTADA.fotos} listo={listo} className="mx-auto w-[min(60vw,270px)] lg:w-[clamp(250px,22vw,330px)]">
            {/* Brillo cálido y la D de rayas enorme de fondo */}
            <div aria-hidden="true" className="portada-brillo pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[175%] w-[175%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[52%] -z-10 hidden w-[135%] -translate-x-1/2 -translate-y-1/2 text-arena/70 lg:block"
              initial={{ opacity: 0 }}
              animate={listo ? { opacity: 1 } : undefined}
              transition={{ duration: 1.6, delay: 0.5 }}
            >
              <MarcaD className="h-auto w-full" />
            </motion.div>

            {chips.map((chip, i) => (
              <motion.div
                key={i}
                aria-hidden="true"
                className={cx('pointer-events-none absolute z-20', chip.clase)}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={listo ? { opacity: 1, scale: 1 } : undefined}
                transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 1.05 + i * 0.16 }}
              >
                <div
                  className={cx(
                    'flotar flex items-center whitespace-nowrap rounded-full bg-papel/90 py-2 pl-3 pr-3.5 text-[12px] font-medium text-tinta shadow-[0_12px_30px_-12px_rgb(21_19_17/0.4)] ring-1 ring-tinta/[0.06] backdrop-blur-sm lg:py-2.5 lg:pl-3.5 lg:pr-4 lg:text-[13px]',
                    chip.variante,
                  )}
                >
                  <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-madera" />
                  <span>{chip.contenido}</span>
                </div>
              </motion.div>
            ))}

            {/* Indicador de scroll del teléfono, a la izquierda de la pila */}
            <IndicadorScroll listo={listo} alPulsar={bajar} vertical className="absolute bottom-0 left-[calc(-50vw+50%+20px)] lg:hidden" />
          </PilaFotos>
        </div>

        <div className="portada-bajada relative z-10 mt-12 lg:mt-9 lg:self-start">
          <motion.div {...entrar(0.5)}>
            <Enfasis como="p" texto={PORTADA.bajada} className="max-w-[28rem] text-[15px] leading-[1.65] text-grafito lg:text-[17px]" />
          </motion.div>
          <motion.div {...entrar(0.62)} className="mt-7 flex flex-col sm:flex-row sm:items-center lg:mt-9">
            <Magnetico className="w-full sm:mr-3 sm:w-auto">
              <a
                href="#catalogo"
                onClick={(evento) => {
                  evento.preventDefault();
                  irA('#catalogo', { offset: -24 });
                }}
                className="boton boton-oscuro group w-full sm:w-auto"
              >
                <span>Ver el catálogo</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
              </a>
            </Magnetico>
            <Magnetico className="mt-3 w-full sm:mt-0 sm:w-auto">
              <button type="button" onClick={() => elegirWhatsapp()} className="boton boton-linea w-full sm:w-auto">
                <IconoWhatsapp size={17} />
                <span>Escríbenos</span>
              </button>
            </Magnetico>
          </motion.div>
        </div>
      </div>

      <IndicadorScroll listo={listo} alPulsar={bajar} className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 lg:flex" />
    </section>
  );
}

/** «Descubre» con una gota que baja por un hilo; al pulsarlo, baja a la sección siguiente. */
function IndicadorScroll({ listo, alPulsar, vertical = false, className }) {
  return (
    <div className={className}>
      <motion.button
        type="button"
        onClick={alPulsar}
        aria-label="Bajar a la siguiente sección"
        className="flex flex-col items-center text-grafito/80 transition-colors hover:text-madera-oscuro"
        initial={{ opacity: 0 }}
        animate={listo ? { opacity: 1 } : undefined}
        transition={{ duration: 0.9, delay: 1.5 }}
      >
        <span className={cx('etiqueta mb-3 text-[10px]', vertical && 'texto-vertical')}>Descubre</span>
        <span aria-hidden="true" className="hilo-scroll" />
      </motion.button>
    </div>
  );
}
