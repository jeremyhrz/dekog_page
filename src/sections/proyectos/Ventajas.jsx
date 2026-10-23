import React from 'react';
import { motion } from 'framer-motion';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import { VISTA, escalonar, variantes } from '../../lib/movimiento';
import { VENTAJAS } from './datos';

/**
 * Franja papel con lo que distingue a Dekog (las cinco de siempre): en el teléfono, un índice con filetes; en
 * escritorio, cinco columnas que entran en ola.
 */
export default function Ventajas() {
  return (
    <section aria-labelledby="ventajas-titulo" className="relative bg-papel py-20 lg:py-28">
      <div className="contenedor">
        <div className="lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8">
          <div className="lg:col-span-7">
            <Revelar como="p" y={12} className="etiqueta flex items-center text-madera-oscuro">
              <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
              Por qué Dekog
            </Revelar>
            <TextoDividido
              como="h2"
              id="ventajas-titulo"
              texto="Un solo equipo para todo tu *proyecto*"
              className="mt-5 font-display text-[clamp(2.25rem,5.2vw,4rem)] font-normal leading-[0.98] tracking-[-0.015em] [text-wrap:balance]"
            />
          </div>
          <Revelar retraso={0.15} className="mt-6 lg:col-span-4 lg:col-start-9 lg:mt-0 lg:pb-2">
            <p className="max-w-md text-[1.0625rem] leading-relaxed text-grafito">
              Diseñamos, construimos y amoblamos a la medida, del primer trazo al último detalle.
            </p>
          </Revelar>
        </div>

        <motion.ul
          className="mt-12 border-t border-tinta/10 lg:mt-16 lg:grid lg:grid-cols-5 lg:gap-x-8 lg:border-t-0"
          initial="oculto"
          whileInView="visible"
          viewport={VISTA}
          variants={escalonar(0.09)}
        >
          {VENTAJAS.map((ventaja, i) => {
            const Icono = ventaja.Icono;
            const numero = String(i + 1).padStart(2, '0');
            return (
              <motion.li
                key={ventaja.titulo}
                variants={variantes.aparecer}
                className="flex items-center border-b border-tinta/10 py-5 lg:block lg:border-b-0 lg:border-t lg:border-tinta/15 lg:pb-0 lg:pt-6"
              >
                <span className="etiqueta w-11 shrink-0 tabular-nums text-madera-oscuro lg:hidden">{numero}</span>
                <span className="hidden items-center justify-between lg:flex">
                  <span className="etiqueta tabular-nums text-madera-oscuro">{numero}</span>
                  <Icono className="h-5 w-5 text-madera" strokeWidth={1.4} aria-hidden="true" />
                </span>
                <span className="block font-display text-[1.45rem] leading-[1.1] lg:mt-10 lg:text-[1.6rem]">{ventaja.titulo}</span>
                <Icono className="ml-auto h-5 w-5 shrink-0 text-madera lg:hidden" strokeWidth={1.4} aria-hidden="true" />
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
