import React from 'react';
import { motion } from 'framer-motion';
import { Enfasis } from '../../components/efectos/TextoDividido';
import { SERVICIOS, idServicio, irAlServicio } from './datos';
import { escalonar, variantes } from '../../lib/movimiento';

// Alias: el ESLint del proyecto no ve `motion` usado solo dentro del JSX.
const MotionOl = motion.ol;
const MotionLi = motion.li;

/**
 * Sumario de revista al pie de la cabecera (solo escritorio): los cinco servicios con su número; cada uno baja hasta
 * su bloque, con la foto ya destapada en el arco.
 */
export default function Sumario() {
  const ir = (servicio) => (evento) => {
    evento.preventDefault();
    irAlServicio(servicio);
  };

  return (
    <nav aria-label="Los servicios" className="mt-16 hidden lg:block">
      <MotionOl
        className="grid grid-cols-5 border-t border-tinta/10"
        initial="oculto"
        animate="visible"
        variants={escalonar(0.07, 0.8)}
      >
        {SERVICIOS.map((servicio) => (
          <MotionLi
            key={servicio.numero}
            variants={variantes.aparecer}
            className="border-l border-tinta/10 pl-5 first:border-l-0 first:pl-0"
          >
            <a
              href={`#${idServicio(servicio)}`}
              onClick={ir(servicio)}
              className="group block h-full pb-2 pr-3 pt-5 transition-colors duration-300 hover:text-madera-oscuro"
            >
              <span className="etiqueta block tabular-nums text-madera-oscuro">{servicio.numero}</span>
              {/* En dos renglones: la palabra de siempre y, debajo, su *énfasis* en cursiva madera. */}
              <Enfasis
                texto={servicio.titulo}
                claseEnfasis="enfasis block"
                className="mt-2 block font-display text-[1.35rem] leading-[1.12] transition-transform duration-500 ease-expo group-hover:translate-x-1"
              />
            </a>
          </MotionLi>
        ))}
      </MotionOl>
    </nav>
  );
}
