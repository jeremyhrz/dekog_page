import React from 'react';
import { motion } from 'framer-motion';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import { MarcaD } from '../../components/marca/Logo';
import { ENFOQUE } from './datos';
import { VISTA, escalonar, variantes } from '../../lib/movimiento';

const Lista = motion.ul;
const Elemento = motion.li;

/**
 * Nuestro enfoque: una habitación de Dekog Home en un arco (se destapa al entrar, con parallax suave) y un sello que gira
 * con los tres valores; al lado, la frase en grande y los valores en filas con filete.
 */
export default function Enfoque() {
  return (
    <section id="enfoque" aria-labelledby="enfoque-titulo" className="seccion relative overflow-hidden bg-hueso">
      <div className="contenedor grid items-center gap-y-16 lg:grid-cols-12 lg:gap-x-8">
        <figure className="relative mx-auto w-[78%] max-w-[440px] lg:col-span-5 lg:w-full">
          <div className="relative overflow-hidden rounded-b-[24px] rounded-t-full bg-arena" style={{ paddingBottom: '125%' }}>
            <Foto src="/hero/IMG_3918.PNG" alt="Habitación con cama tapizada de Dekog Home" retrato rellenar revelar parallax={0.06} />
          </div>
          <Sello />
        </figure>

        <div className="lg:col-span-6 lg:col-start-7">
          <Revelar como="p" y={12} className="etiqueta flex items-center text-madera-oscuro">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Nuestro enfoque
          </Revelar>
          <TextoDividido
            como="h2"
            id="enfoque-titulo"
            texto={ENFOQUE.titulo}
            className="titulo-display mt-6 text-[clamp(2.5rem,5.4vw,4.6rem)] leading-[0.98]"
          />

          <Lista className="mt-12 border-t border-tinta/10" initial="oculto" whileInView="visible" viewport={VISTA} variants={escalonar(0.12)}>
            {ENFOQUE.valores.map((valor) => {
              const Icono = valor.icono;
              return (
                <Elemento key={valor.titulo} variants={variantes.aparecer} className="flex items-start border-b border-tinta/10 py-6">
                  <span className="mr-5 grid h-12 w-12 shrink-0 place-items-center rounded-full text-madera-oscuro ring-1 ring-tinta/15">
                    <Icono className="h-5 w-5" strokeWidth={1.3} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-display text-[1.6rem] leading-tight">{valor.titulo}</span>
                    <span className="mt-1 block text-[15px] leading-relaxed text-grafito/75">{valor.texto}</span>
                  </span>
                </Elemento>
              );
            })}
          </Lista>
        </div>
      </div>
    </section>
  );
}

/** Sello redondo con los tres valores girando alrededor de la D de Dekog. */
function Sello() {
  return (
    <div
      aria-hidden="true"
      className="absolute -bottom-7 -right-6 grid h-[7.5rem] w-[7.5rem] place-items-center rounded-full bg-tinta text-papel shadow-[0_20px_40px_-18px_rgb(21_19_17/0.6)] lg:-right-14 lg:h-36 lg:w-36"
    >
      <svg viewBox="0 0 120 120" className="girar-lento absolute left-0 top-0 h-full w-full">
        <defs>
          <path id="sello-enfoque" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
        </defs>
        <text fill="currentColor" fontSize="9.2" fontWeight="500" letterSpacing="1.5">
          <textPath href="#sello-enfoque" xlinkHref="#sello-enfoque" textLength="274" lengthAdjust="spacing">
            FUNCIONALIDAD ✦ CALIDAD ✦ ESTÉTICA ✦
          </textPath>
        </text>
      </svg>
      <MarcaD className="h-9 w-9 text-madera lg:h-11 lg:w-11" />
    </div>
  );
}
