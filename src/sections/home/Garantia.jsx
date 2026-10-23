import React from 'react';
import { motion } from 'framer-motion';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Contador from '../../components/efectos/Contador';
import { GARANTIA } from './datos';
import { VISTA, escalonar, variantes } from '../../lib/movimiento';

const Lista = motion.ul;
const Elemento = motion.li;

/**
 * Respaldo Dekog: la garantía estructural como una cita enorme en cursiva (los plazos en madera) y, debajo, los tres
 * plazos en cifras que suben al verse.
 */
export default function Garantia() {
  return (
    <section id="garantia" aria-labelledby="garantia-titulo" className="seccion relative overflow-hidden bg-papel">
      <div className="contenedor">
        <Revelar y={12} className="flex items-center justify-center text-madera-oscuro">
          <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
          <h2 id="garantia-titulo" className="etiqueta">Respaldo Dekog</h2>
          <span aria-hidden="true" className="ml-3 h-px w-8 bg-current" />
        </Revelar>

        <figure className="mx-auto mt-8 max-w-[64rem] text-center lg:mt-10">
          <TextoDividido
            como="blockquote"
            texto={`«${GARANTIA.cita}»`}
            escalon={0.035}
            className="font-display text-[clamp(2.1rem,5vw,4.4rem)] italic leading-[1.06] tracking-[-0.015em] [text-wrap:balance]"
          />
        </figure>

        {/* Tres columnas también en el teléfono: en él, «meses» va debajo de la cifra. */}
        <Lista
          className="mx-auto mt-12 grid max-w-5xl grid-cols-3 gap-x-3 border-t border-tinta/10 pt-8 sm:gap-x-8 lg:mt-20 lg:pt-12"
          initial="oculto"
          whileInView="visible"
          viewport={VISTA}
          variants={escalonar(0.12)}
        >
          {GARANTIA.plazos.map((plazo) => (
            <Elemento key={plazo.texto} variants={variantes.aparecer} className="text-center">
              <span className="block sm:flex sm:items-baseline sm:justify-center">
                <Contador valor={plazo.meses} className="block font-display text-[clamp(2.9rem,8vw,5.5rem)] leading-none tracking-[-0.02em]" />
                <span className="etiqueta mt-2 block text-madera-oscuro sm:ml-2 sm:mt-0">meses</span>
              </span>
              <span className="mt-3 block text-[13px] leading-snug text-grafito/75 sm:text-[15px]">{plazo.texto}</span>
            </Elemento>
          ))}
        </Lista>
      </div>
    </section>
  );
}
