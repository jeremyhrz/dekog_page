import React from 'react';
import { motion } from 'framer-motion';
import Foto from '../../components/efectos/Foto';
import Revelar from '../../components/efectos/Revelar';
import Contador from '../../components/efectos/Contador';
import { MarcaD } from '../../components/marca/Logo';
import { DEKOG, PROCESO } from '../../data/sitio';
import { VISTA } from '../../lib/movimiento';
import './servicios.css';

// «+120 proyectos entregados»: la misma cifra de la portada (data/sitio.js).
const PROYECTOS = PROCESO.cifras.find((c) => /proyectos/.test(c.texto)) || PROCESO.cifras[0];
// Alias: el ESLint del proyecto no ve `motion` usado solo dentro del JSX.
const MotionDiv = motion.div;

/**
 * La foto central de /servicios, a lo ancho (21:9 en escritorio, más alta en el teléfono): se destapa al entrar y se
 * desplaza más lento que el scroll. Un sello que gira encima y, al pie, la cifra de proyectos y el alcance.
 */
export default function FotoCentral() {
  return (
    <section aria-label="Un espacio de Dekog" className="bg-hueso pb-[var(--aire)]">
      <figure className="contenedor">
        <div className="relative">
          <div className="servicios-marco relative overflow-hidden rounded-[18px] bg-arena pb-[118%] sm:pb-[62%] lg:rounded-[24px] lg:pb-[42.86%]">
            <Foto
              src="/servicios/imagen central.jpeg"
              alt="Cocina y comedor de un proyecto de interiorismo, con listones de madera y luz cálida"
              rellenar
              revelar
              parallax={0.08}
              prioridad
              sizes="(min-width: 1416px) 1320px, calc(100vw - 40px)"
            />
          </div>
          <MotionDiv
            className="absolute -top-12 right-4 z-10 sm:right-8 lg:-top-16 lg:right-16"
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={VISTA}
            transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.5 }}
          >
            <Sello />
          </MotionDiv>
        </div>

        <Revelar
          como="figcaption"
          y={14}
          className="mt-7 flex flex-col border-t border-tinta/10 pt-6 sm:flex-row sm:items-end sm:justify-between lg:mt-9"
        >
          <p className="flex items-end">
            <Contador
              valor={PROYECTOS.valor}
              antes={PROYECTOS.antes}
              despues={PROYECTOS.despues}
              className="font-display text-[2.75rem] leading-[0.85] tracking-[-0.02em] lg:text-[3.5rem]"
            />
            <span className="etiqueta mb-1 ml-4 text-grafito/75">{PROYECTOS.texto}</span>
          </p>
          <p className="etiqueta mt-4 flex items-center text-madera-oscuro sm:mt-0">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            {DEKOG.alcance}
          </p>
        </Revelar>
      </figure>
    </section>
  );
}

/** Sello redondo con el lema que gira alrededor de la D de Dekog (como los de la portada). */
function Sello() {
  return (
    <div
      aria-hidden="true"
      className="relative grid h-24 w-24 place-items-center rounded-full bg-tinta text-papel shadow-[0_20px_40px_-18px_rgb(21_19_17/0.6)] sm:h-[7.5rem] sm:w-[7.5rem] lg:h-36 lg:w-36"
    >
      <svg viewBox="0 0 120 120" className="girar-lento absolute left-0 top-0 h-full w-full">
        <defs>
          <path id="sello-servicios" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
        </defs>
        <text fill="currentColor" fontSize="9.2" fontWeight="500" letterSpacing="1.5">
          <textPath href="#sello-servicios" xlinkHref="#sello-servicios" textLength="274" lengthAdjust="spacing">
            DISEÑAMOS ✦ CONSTRUIMOS ✦ AMOBLAMOS ✦
          </textPath>
        </text>
      </svg>
      <MarcaD className="h-7 w-7 text-madera sm:h-9 sm:w-9 lg:h-11 lg:w-11" />
    </div>
  );
}
