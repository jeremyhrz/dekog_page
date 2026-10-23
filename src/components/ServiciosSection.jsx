import React, { useRef, useState } from 'react';
import { motion, motionValue, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Revelar from './efectos/Revelar';
import TextoDividido from './efectos/TextoDividido';
import Foto from './efectos/Foto';
import { TituloSeccion } from './CabeceraPagina';
import { IconoWhatsapp } from './asistente/comun';
import { SERVICIOS, TOTAL_SERVICIOS, idServicio, irAlServicio } from '../sections/servicios/datos';
import { cx, useMedio, useMenosMovimiento } from '../lib/movimiento';
import { elegirWhatsapp } from '../utils/whatsapp';
import '../sections/servicios/servicios.css';

/**
 * Los cinco servicios de /servicios (#servicios), contados como una historia:
 *  - Escritorio: el texto de cada servicio sube por la izquierda y, a la derecha, un arco fijo (sticky) destapa su
 *    foto atada al scroll, como el escenario de las líneas de la portada. Debajo del arco, el número que rueda y unas
 *    barras que llevan a cada servicio.
 *  - Teléfono y tableta: una fila por servicio, con la foto en un arco que se destapa y el número en contorno.
 */

// Alias de los elementos animados: el ESLint del proyecto no ve `motion` usado solo dentro del JSX.
const MotionDiv = motion.div;
const MotionSpan = motion.span;

const N = SERVICIOS.length;
const CERO = motionValue(0);
// La foto de un servicio se destapa mientras su bloque sube: desde que su borde de arriba pasa el 85 % de la pantalla
// hasta que llega al 20 %. La de debajo, mientras tanto, sube un poco y se oscurece.
const TRAMO = ['start 85%', 'start 20%'];
const TAMANOS_ARCO = '(min-width: 1024px) 38vw, 90vw';

export default function ServiciosSection() {
  const escritorio = useMedio('(min-width: 1024px)');
  return (
    <section id="servicios" aria-labelledby="servicios-titulo" className="relative bg-papel pt-[var(--aire)]">
      <TituloSeccion
        id="servicios-titulo"
        rotulo={`Servicios · 01 — ${TOTAL_SERVICIOS}`}
        titulo="Cinco servicios, *un solo equipo*"
        texto="Cada etapa se conecta con la siguiente: así entregamos proyectos llave en mano."
        className="contenedor"
      />
      {escritorio ? <Historia /> : <Filas />}
    </section>
  );
}

/** «Cotizar este servicio»: abre el selector de WhatsApp con el mensaje del servicio. */
function Cotizar({ servicio }) {
  return (
    <button
      type="button"
      onClick={() => elegirWhatsapp(servicio.mensaje)}
      className="group inline-flex min-h-[44px] items-center text-tinta transition-colors duration-300 hover:text-madera-oscuro"
    >
      <IconoWhatsapp size={16} />
      <span className="etiqueta ml-3 border-b border-tinta/20 pb-1 transition-colors duration-300 group-hover:border-madera-oscuro">
        Cotizar este servicio
      </span>
      <ArrowUpRight
        className="ml-1.5 h-4 w-4 transition-transform duration-500 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        strokeWidth={1.6}
        aria-hidden="true"
      />
    </button>
  );
}

// ── Escritorio: la historia con el arco fijo ─────────────────────────────────────────────────────────────────────

function Historia() {
  const menos = useMenosMovimiento();
  const [activo, setActivo] = useState(0);
  // Un avance por servicio (0 → 1 mientras su bloque sube): lo escribe cada <Paso> y lo leen las capas del arco y las
  // barras. Fuera de React (motionValue), para no repintar en cada cuadro.
  const [avances] = useState(() => SERVICIOS.map(() => motionValue(0)));
  // t: 0 = primer servicio … N-1 = último (la suma de los avances, que no se pisan: uno empieza cuando el otro acabó).
  const t = useTransform(avances.slice(1), (valores) => valores.reduce((suma, v) => suma + v, 0));
  useMotionValueEvent(t, 'change', (v) => setActivo(Math.min(N - 1, Math.round(v))));

  return (
    <div className="contenedor mt-10 grid grid-cols-12 gap-x-8">
      <ol className="col-span-6 pb-[14vh]">
        {SERVICIOS.map((servicio, k) => (
          <Paso key={servicio.numero} servicio={servicio} avance={avances[k]} activo={k === activo} />
        ))}
      </ol>
      <div className="col-span-5 col-start-8">
        {/* Centrado bajo la navegación y un poco arriba: abajo a la derecha flota el botón del asistente. */}
        <div className="sticky top-0 flex h-screen items-center justify-center pb-14 pt-[var(--alto-nav)]">
          <Escenario avances={avances} t={t} activo={activo} menos={menos} />
        </div>
      </div>
    </div>
  );
}

function Paso({ servicio, avance, activo }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: TRAMO });
  useMotionValueEvent(scrollYProgress, 'change', (v) => avance.set(v));

  return (
    <li ref={ref} id={idServicio(servicio)} className="flex min-h-[78vh] flex-col justify-center border-t border-tinta/10 py-20 first:border-t-0">
      <span
        aria-hidden="true"
        className={cx(
          'servicios-numero block font-display text-[clamp(6.5rem,10vw,9.5rem)] leading-[0.8] tracking-[-0.04em]',
          activo && 'is-activo',
        )}
      >
        {servicio.numero}
      </span>
      <TextoDividido
        como="h3"
        texto={servicio.titulo}
        className="mt-10 font-display text-[clamp(2.75rem,4.4vw,4.25rem)] font-normal leading-[1] tracking-[-0.02em] [text-wrap:balance]"
      />
      <Revelar como="p" retraso={0.1} className="mt-6 max-w-md text-[1.0625rem] leading-relaxed text-grafito">
        {servicio.texto}
      </Revelar>
      <Revelar retraso={0.2} className="mt-7">
        <Cotizar servicio={servicio} />
      </Revelar>
    </li>
  );
}

/** El arco fijo con las cinco fotos apiladas, el número que rueda y las barras de avance. */
function Escenario({ avances, t, activo, menos }) {
  const actual = SERVICIOS[activo];

  return (
    <figure className="relative w-full" style={{ maxWidth: 'calc((100vh - 19rem) * 0.8)' }}>
      <div className="relative">
        <div className="servicios-marco servicios-arco relative overflow-hidden bg-arena" style={{ paddingBottom: '125%' }}>
          {SERVICIOS.map((servicio, k) => (
            <Capa
              key={servicio.numero}
              servicio={servicio}
              revelado={avances[k]}
              tapado={k + 1 < N ? avances[k + 1] : CERO}
              menos={menos}
              visible={k <= activo}
            />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="servicios-arco-filete pointer-events-none absolute -bottom-3.5 -left-3.5 -right-3.5 -top-3.5 border border-tinta/10"
        />
      </div>

      <figcaption className="mt-9 flex items-center">
        <p className="flex shrink-0 items-end">
          <span className="sr-only" aria-live="polite">{`Servicio ${actual.numero} de ${TOTAL_SERVICIOS}: ${actual.nombre}`}</span>
          <NumeroRodante t={t} activo={activo} menos={menos} className="font-display text-[1.75rem] italic tracking-[-0.02em] text-madera-titulo" />
          <span aria-hidden="true" className="etiqueta mb-[0.2em] ml-1.5 tabular-nums text-grafito/60">/ {TOTAL_SERVICIOS}</span>
        </p>
        <div className="ml-5 flex flex-1">
          {SERVICIOS.map((servicio, k) => (
            <Barra
              key={servicio.numero}
              avance={avances[k]}
              activa={k === activo}
              etiqueta={`Ir a ${servicio.nombre}`}
              alTocar={() => irAlServicio(servicio)}
            />
          ))}
        </div>
      </figcaption>
    </figure>
  );
}

/** Una foto dentro del arco: se destapa de abajo arriba atada al scroll; cuando la tapa la siguiente, sube y se oscurece. */
function Capa({ servicio, revelado, tapado, menos, visible }) {
  const clipPath = useTransform(revelado, (r) => `inset(${((1 - r) * 100).toFixed(2)}% 0% 0% 0%)`);
  const scale = useTransform(revelado, [0, 1], [1.3, 1]);
  const y = useTransform(tapado, [0, 1], ['0%', '-10%']);
  const velo = useTransform(tapado, [0, 1], [0, 0.5]);

  // Las fotos acompañan al texto de cada servicio: decorativas para los lectores de pantalla (alt vacío).
  if (menos) {
    return (
      <MotionDiv
        className="absolute left-0 top-0 h-full w-full"
        initial={false}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <Foto src={servicio.foto} rellenar sizes={TAMANOS_ARCO} />
      </MotionDiv>
    );
  }
  return (
    <MotionDiv className="absolute left-0 top-0 h-full w-full" style={{ clipPath, WebkitClipPath: clipPath }}>
      <MotionDiv className="absolute left-0 top-0 h-full w-full" style={{ scale, y }}>
        <Foto src={servicio.foto} rellenar sizes={TAMANOS_ARCO} />
      </MotionDiv>
      <MotionDiv aria-hidden="true" className="absolute left-0 top-0 h-full w-full bg-black" style={{ opacity: velo }} />
    </MotionDiv>
  );
}

/** Raya de avance de un servicio: se llena mientras se destapa su foto. Al pulsarla, baja hasta él. */
function Barra({ avance, activa, etiqueta, alTocar }) {
  return (
    <button
      type="button"
      onClick={alTocar}
      aria-label={etiqueta}
      aria-current={activa ? 'step' : undefined}
      className="group mx-[3px] flex h-11 flex-1 items-center"
    >
      <span className="relative block h-[2px] w-full overflow-hidden rounded-full bg-tinta/15 transition-colors duration-300 group-hover:bg-tinta/30">
        <MotionSpan className="absolute left-0 top-0 h-full w-full origin-left rounded-full bg-madera" style={{ scaleX: avance }} />
      </span>
    </button>
  );
}

/** Número que rueda como un cuentakilómetros, atado al scroll (01 → 05). */
function NumeroRodante({ t, activo, menos, className }) {
  const y = useTransform(t, (v) => `${(-v * 100) / N}%`);
  return (
    <span aria-hidden="true" className={cx('block h-[1em] overflow-hidden leading-none', className)}>
      {menos ? (
        <span className="block h-[1em] leading-none">{SERVICIOS[activo].numero}</span>
      ) : (
        <MotionSpan className="block" style={{ y }}>
          {SERVICIOS.map((s) => <span key={s.numero} className="block h-[1em] leading-none">{s.numero}</span>)}
        </MotionSpan>
      )}
    </span>
  );
}

// ── Teléfono y tableta: una fila por servicio ───────────────────────────────────────────────────────────────────

function Filas() {
  return (
    <ol className="contenedor mt-14 pb-[var(--aire)] md:mt-20">
      {SERVICIOS.map((servicio, k) => <Fila key={servicio.numero} servicio={servicio} derecha={k % 2 === 1} />)}
    </ol>
  );
}

function Fila({ servicio, derecha }) {
  return (
    <li
      id={idServicio(servicio)}
      className="border-t border-tinta/10 pb-16 pt-12 md:grid md:grid-cols-12 md:items-center md:gap-x-8 md:py-20"
    >
      <figure
        className={cx(
          'relative w-[80%] md:col-span-5 md:w-full',
          derecha ? 'ml-auto md:order-2 md:col-start-8' : 'md:col-start-1',
        )}
      >
        <div className="servicios-marco servicios-arco relative overflow-hidden bg-arena" style={{ paddingBottom: '125%' }}>
          <Foto src={servicio.foto} alt={servicio.alt} rellenar revelar parallax={0.06} sizes="(min-width: 768px) 40vw, 80vw" />
        </div>
        <div
          aria-hidden="true"
          className="servicios-arco-filete pointer-events-none absolute -bottom-2.5 -left-2.5 -right-2.5 -top-2.5 border border-tinta/10"
        />
        {/* El número en contorno, medio fuera del arco (solo en el teléfono; en la tableta va sobre el título). */}
        <span
          aria-hidden="true"
          className={cx(
            'servicios-numero absolute bottom-[-0.3em] font-display text-[clamp(5.5rem,25vw,8rem)] leading-none tracking-[-0.04em] md:hidden',
            derecha ? 'left-0 -translate-x-[55%]' : 'right-0 translate-x-[55%]',
          )}
        >
          {servicio.numero}
        </span>
      </figure>

      <div className={cx('mt-16 md:col-span-6 md:mt-0', derecha ? 'md:order-1 md:col-start-1' : 'md:col-start-7')}>
        <span aria-hidden="true" className="servicios-numero mb-6 hidden font-display text-[7rem] leading-[0.8] tracking-[-0.04em] md:block">
          {servicio.numero}
        </span>
        <p className="etiqueta flex items-center text-madera-oscuro">
          <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
          {`Servicio ${servicio.numero} / ${TOTAL_SERVICIOS}`}
        </p>
        <TextoDividido
          como="h3"
          texto={servicio.titulo}
          className="mt-4 font-display text-[clamp(2.5rem,10.5vw,3.75rem)] font-normal leading-[1] tracking-[-0.02em] [text-wrap:balance]"
        />
        <Revelar como="p" retraso={0.1} className="mt-5 max-w-md text-grafito">
          {servicio.texto}
        </Revelar>
        <Revelar retraso={0.2} className="mt-6">
          <Cotizar servicio={servicio} />
        </Revelar>
      </div>
    </li>
  );
}
