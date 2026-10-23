import React from 'react';
import { motion } from 'framer-motion';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Magnetico from '../../components/efectos/Magnetico';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { MENSAJES, PASOS } from './datos';
import { VISTA, escalonar, variantes } from '../../lib/movimiento';
import { elegirWhatsapp } from '../../utils/whatsapp';

const Lista = motion.ol;
const Elemento = motion.li;
const TOTAL = String(PASOS.length).padStart(2, '0');

/**
 * Así trabajamos: banda oscura con los cuatro pasos como el sumario de una revista (número, paso en Bodoni y su frase,
 * en filas con filete). «Empezar proyecto» abre el selector de WhatsApp con el mensaje ya escrito.
 */
export default function Metodologia() {
  return (
    <section id="metodologia" aria-labelledby="metodologia-titulo" className="sobre-oscuro seccion relative overflow-hidden bg-noche text-hueso">
      <div className="contenedor">
        <Revelar y={12} className="flex items-center justify-between border-b border-hueso/15 pb-4">
          <p className="etiqueta flex items-center text-madera-claro">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Metodología
          </p>
          <p className="etiqueta tabular-nums text-hueso/60">01 — {TOTAL}</p>
        </Revelar>

        <div className="mt-10 lg:mt-16 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8">
          <TextoDividido como="h2" id="metodologia-titulo" texto="Así *trabajamos*" className="titulo-display lg:col-span-7" />
          <Revelar retraso={0.15} className="mt-8 lg:col-span-4 lg:col-start-9 lg:mt-0 lg:pb-3">
            <p className="max-w-sm text-[1.0625rem] leading-relaxed text-hueso/75">
              Cuatro pasos, de escucharte a transformar tu espacio.
            </p>
            <Magnetico className="mt-6">
              <button type="button" onClick={() => elegirWhatsapp(MENSAJES.proyecto)} className="boton boton-claro">
                <IconoWhatsapp size={16} />
                <span>Empezar proyecto</span>
              </button>
            </Magnetico>
          </Revelar>
        </div>

        <Lista
          className="mt-14 border-t border-hueso/15 lg:mt-20"
          initial="oculto"
          whileInView="visible"
          viewport={VISTA}
          variants={escalonar(0.12)}
        >
          {PASOS.map((paso) => (
            <Elemento
              key={paso.numero}
              variants={variantes.aparecer}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline border-b border-hueso/15 py-6 lg:grid-cols-12 lg:gap-x-8 lg:py-9"
            >
              <span className="etiqueta tabular-nums text-madera-claro lg:col-span-1">{paso.numero}</span>
              <span className="font-display text-[clamp(1.9rem,4.2vw,3.5rem)] leading-[1.02] tracking-[-0.01em] lg:col-span-6">{paso.titulo}</span>
              <span className="col-start-2 mt-2 text-[15px] leading-relaxed text-hueso/70 lg:col-span-5 lg:col-start-auto lg:mt-0 lg:text-[1.0625rem]">
                {paso.texto}
              </span>
            </Elemento>
          ))}
        </Lista>
      </div>
    </section>
  );
}
