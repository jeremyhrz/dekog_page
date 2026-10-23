import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Cinta from '../../components/efectos/Cinta';
import Magnetico from '../../components/efectos/Magnetico';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { proyectosData } from '../../data/proyectosData';
import { elegirWhatsapp } from '../../utils/whatsapp';
import { MENSAJES, nombreObra } from './datos';

const NOMBRES = proyectosData.map((p) => nombreObra(p.titulo));

/**
 * Cierre en banda noche: los nombres de las obras pasan en una cinta (redonda y cursiva, como un titular de revista)
 * y debajo, «¿Tienes un proyecto en mente?» con el WhatsApp (abre el selector de línea) y el enlace a contacto.
 */
export default function Cierre() {
  return (
    <section id="cotiza" aria-labelledby="cotiza-titulo" className="sobre-oscuro relative overflow-hidden bg-noche text-hueso">
      <div className="border-b border-hueso/15">
        <Cinta
          elementos={NOMBRES}
          velocidad={1.6}
          className="py-5 font-display text-[2.4rem] leading-[1.15] tracking-[-0.01em] text-hueso/90 md:py-7 md:text-[4.5rem] [&_span:nth-child(4n+3)]:italic [&_span:nth-child(4n+3)]:text-madera-claro"
          claseSeparador="text-[0.4em] text-madera"
        />
      </div>

      <div className="contenedor relative pb-[var(--aire)] pt-20 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8 lg:pt-28">
        <div className="lg:col-span-7">
          <Revelar como="p" y={12} className="etiqueta flex items-center text-madera-claro">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Tu proyecto
          </Revelar>
          <TextoDividido como="h2" id="cotiza-titulo" texto="¿Tienes un proyecto *en mente*?" className="titulo-display mt-5" />
        </div>

        <div className="mt-10 lg:col-span-5 lg:col-start-8 lg:mt-0 lg:pb-3">
          <Revelar como="p" retraso={0.15} className="max-w-sm text-[1.0625rem] leading-relaxed text-hueso/75 lg:text-[1.125rem]">
            Cuéntanos tu idea y hagamos realidad tu espacio ideal.
          </Revelar>
          {/* Márgenes y no `gap` (iOS < 14.5): si no caben en una fila, bajan con su aire. */}
          <Revelar retraso={0.25} className="mt-8 flex flex-col sm:-mb-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Magnetico className="w-full sm:mb-3 sm:mr-3 sm:w-auto">
              <button type="button" onClick={() => elegirWhatsapp(MENSAJES.proyecto)} className="boton boton-claro w-full sm:w-auto">
                <IconoWhatsapp size={17} />
                <span>Cotiza tu proyecto</span>
              </button>
            </Magnetico>
            <Magnetico className="mt-3 w-full sm:mb-3 sm:mt-0 sm:w-auto">
              <Link to="/contacto" className="boton boton-linea group w-full sm:w-auto">
                <span>Contáctanos</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
              </Link>
            </Magnetico>
          </Revelar>
        </div>
      </div>
    </section>
  );
}
