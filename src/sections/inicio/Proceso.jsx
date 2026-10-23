import React from 'react';
import { motion } from 'framer-motion';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import Contador from '../../components/efectos/Contador';
import { MarcaD } from '../../components/marca/Logo';
import { PROCESO } from '../../data/sitio';
import { VISTA, escalonar, variantes } from '../../lib/movimiento';

/**
 * Cómo trabajamos: los planos en un arco con un sello que gira, la frase enorme en cursiva y los cuatro pasos (los de
 * /servicios), más las cifras de /nosotros que suben al verse.
 */
export default function Proceso() {
  return (
    <section id="proceso" aria-labelledby="proceso-titulo" className="seccion relative overflow-hidden bg-hueso">
      <div className="contenedor grid items-center gap-y-16 lg:grid-cols-12 lg:gap-x-8">
        <figure className="relative mx-auto w-[76%] max-w-[420px] lg:col-span-4 lg:col-start-2 lg:w-full">
          <div className="relative overflow-hidden rounded-b-[28px] rounded-t-full bg-arena" style={{ paddingBottom: '125%' }}>
            <Foto src="/hero/IMG_3919.PNG" alt="Planos y muestras de materiales sobre la mesa de diseño" retrato rellenar revelar posicion="50% 40%" />
          </div>
          <Sello />
        </figure>

        <div className="lg:col-span-6 lg:col-start-7">
          <p className="etiqueta flex items-center text-madera-oscuro">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Cómo trabajamos
          </p>
          <TextoDividido
            como="h2"
            id="proceso-titulo"
            texto={`«${PROCESO.cita}»`}
            className="mt-6 font-display text-[clamp(2.5rem,8.5vw,5rem)] italic leading-[0.98] tracking-[-0.02em] [text-wrap:balance]"
          />

          <motion.ol className="mt-12 border-t border-tinta/10" initial="oculto" whileInView="visible" viewport={VISTA} variants={escalonar(0.12)}>
            {PROCESO.pasos.map((paso) => (
              <motion.li key={paso.numero} variants={variantes.aparecer} className="flex items-baseline border-b border-tinta/10 py-5">
                <span className="etiqueta w-12 shrink-0 tabular-nums text-madera-oscuro">{paso.numero}</span>
                <span>
                  <span className="block font-display text-[1.6rem] leading-tight">{paso.titulo}</span>
                  <span className="mt-1 block text-[15px] text-grafito/75">{paso.texto}</span>
                </span>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>

      <div className="contenedor mt-24 grid grid-cols-1 gap-y-10 border-t border-tinta/10 pt-12 sm:grid-cols-3 lg:mt-32">
        {PROCESO.cifras.map((cifra, i) => (
          <Revelar key={cifra.texto} retraso={i * 0.1} className="text-center sm:text-left">
            <Contador
              valor={cifra.valor}
              antes={cifra.antes}
              despues={cifra.despues}
              className="block font-display text-[clamp(3.5rem,9vw,6rem)] leading-none tracking-[-0.02em]"
            />
            <p className="etiqueta mt-3 text-grafito/70">{cifra.texto}</p>
          </Revelar>
        ))}
      </div>
    </section>
  );
}

function Sello() {
  return (
    <div aria-hidden="true" className="absolute -bottom-7 -left-9 grid h-[7.5rem] w-[7.5rem] place-items-center rounded-full bg-tinta text-papel shadow-[0_20px_40px_-18px_rgb(21_19_17/0.6)] lg:-left-16 lg:h-36 lg:w-36">
      <svg viewBox="0 0 120 120" className="girar-lento absolute left-0 top-0 h-full w-full">
        <defs>
          <path id="sello-proceso" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
        </defs>
        <text fill="currentColor" fontSize="9.2" fontWeight="500" letterSpacing="1.5">
          <textPath href="#sello-proceso" xlinkHref="#sello-proceso" textLength="274" lengthAdjust="spacing">DISEÑAMOS ✦ CONSTRUIMOS ✦ AMOBLAMOS ✦</textPath>
        </text>
      </svg>
      <MarcaD className="h-9 w-9 text-madera lg:h-11 lg:w-11" />
    </div>
  );
}
