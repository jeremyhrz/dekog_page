import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Handshake, User } from 'lucide-react';
import { TituloSeccion } from '../../components/CabeceraPagina';
import { VALORES } from './datos';
import { VISTA, escalonar, transicion, variantes } from '../../lib/movimiento';

const ICONOS = { '01': Eye, '02': User, '03': Handshake };

// El filete de cada fila se dibuja de izquierda a derecha mientras la fila sube.
const FILETE = {
  oculto: { scaleX: 0 },
  visible: { scaleX: 1, transition: transicion({ duration: 1.3 }) },
};

/**
 * Nuestros valores: tres filas numeradas entre filetes, como el sumario de una revista. El título en Bodoni, lo que
 * significa cada valor y su ícono de línea fina (los de la página de siempre).
 */
export default function Valores() {
  return (
    <section id="valores" aria-labelledby="valores-titulo" className="seccion relative bg-arena">
      <div className="contenedor">
        <TituloSeccion
          id="valores-titulo"
          rotulo="Nuestros valores"
          titulo="Lo que nos *define*"
          texto="Guían cada proyecto, del primer trazo al último detalle."
        />

        <motion.div className="mt-14 lg:mt-20" initial="oculto" whileInView="visible" viewport={VISTA} variants={escalonar(0.14)}>
          <ol>
            {VALORES.map((valor) => {
              const Icono = ICONOS[valor.numero];
              return (
                <motion.li
                  key={valor.numero}
                  variants={variantes.aparecer}
                  className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline py-8 lg:grid-cols-12 lg:gap-x-8 lg:py-11"
                >
                  <motion.span aria-hidden="true" variants={FILETE} className="absolute left-0 right-0 top-0 h-px origin-left bg-tinta/15" />
                  <span className="etiqueta tabular-nums text-madera-oscuro lg:col-span-1">{valor.numero}</span>
                  <h3 className="font-display text-[clamp(2.1rem,5vw,4.25rem)] leading-[1.02] tracking-[-0.015em] lg:col-span-6">
                    {valor.titulo}
                  </h3>
                  <p className="col-start-2 mt-3 max-w-md text-[15px] leading-relaxed text-grafito/75 [text-wrap:pretty] lg:col-span-4 lg:col-start-auto lg:mt-0 lg:text-base">
                    {valor.texto}
                  </p>
                  <Icono aria-hidden="true" strokeWidth={1} className="hidden h-10 w-10 self-center justify-self-end text-madera lg:col-span-1 lg:block" />
                </motion.li>
              );
            })}
          </ol>
          <motion.div aria-hidden="true" variants={FILETE} className="h-px origin-left bg-tinta/15" />
        </motion.div>
      </div>
    </section>
  );
}
