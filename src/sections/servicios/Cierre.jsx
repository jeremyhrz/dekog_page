import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Cinta from '../../components/efectos/Cinta';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Magnetico from '../../components/efectos/Magnetico';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { MENSAJE_COTIZAR, SERVICIOS } from './datos';
import { DEKOG } from '../../data/sitio';
import { propsWhatsapp } from '../../utils/whatsapp';

/**
 * Cierre de /servicios: banda noche que abre con una marquesina de los cinco servicios y termina en «Cotiza tu
 * proyecto» (WhatsApp, con el selector de línea) en Bodoni enorme, como el «Un solo equipo» de la portada. Un filete
 * abajo la separa del pie, que también es noche.
 * Lo de la consulta inicial gratuita, presencial o virtual, es del asistente (asistente/src/lib/negocio.js).
 */
export default function Cierre() {
  return (
    <section aria-labelledby="cierre-titulo" className="sobre-oscuro relative overflow-hidden bg-noche text-hueso">
      <div className="border-b border-hueso/15">
        <Cinta
          elementos={SERVICIOS.map((s) => s.nombre)}
          velocidad={2}
          inclinar={false}
          className="py-5 font-display text-[2.1rem] leading-[1.15] tracking-[-0.01em] md:py-7 md:text-[4rem] [&_span:nth-child(4n+3)]:italic [&_span:nth-child(4n+3)]:text-madera-claro"
          claseSeparador="text-[0.42em] text-madera"
        />
      </div>

      <div className="contenedor pt-[var(--aire)]">
        <div className="border-b border-hueso/15 pb-[var(--aire)]">
          <Revelar className="flex items-center justify-between border-b border-hueso/20 pb-4" y={12}>
            <p className="etiqueta text-madera-claro">¿Tienes un proyecto en mente?</p>
            <p className="etiqueta hidden text-hueso/60 md:block">{DEKOG.horario}</p>
          </Revelar>

          <div className="mt-10 lg:mt-16 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8">
            <h2
              id="cierre-titulo"
              className="font-display text-[clamp(3.4rem,15vw,10.5rem)] font-normal leading-[0.86] tracking-[-0.035em] lg:col-span-7 lg:text-[clamp(7rem,11vw,10.5rem)]"
            >
              <TextoDividido texto="Cotiza tu" className="block" />
              <span className="block pl-[9vw] lg:pl-[7vw]">
                <TextoDividido texto="*proyecto*" claseEnfasis="italic text-madera-claro" retraso={0.12} />
              </span>
            </h2>

            <div className="mt-10 lg:col-span-5 lg:col-start-8 lg:mt-0 lg:pb-4">
              <Revelar como="p" retraso={0.15} className="font-display text-[1.75rem] italic leading-[1.08] lg:text-[2.1rem]">
                La consulta inicial es gratuita.
              </Revelar>
              <Revelar como="p" retraso={0.25} className="mt-4 max-w-md text-[1.0625rem] leading-relaxed text-hueso/75">
                Presencial o virtual: cuéntanos qué tienes en mente y te asesoramos en el diseño, la obra y el mobiliario.
              </Revelar>
              <Revelar retraso={0.35} className="mt-9 flex flex-col sm:flex-row lg:flex-col xl:flex-row">
                <Magnetico className="w-full sm:mr-3 sm:w-auto lg:mr-0 xl:mr-3">
                  <a {...propsWhatsapp(MENSAJE_COTIZAR)} className="boton boton-claro w-full sm:w-auto">
                    <IconoWhatsapp size={17} />
                    <span>Cotiza tu proyecto</span>
                  </a>
                </Magnetico>
                <Magnetico className="mt-3 w-full sm:mt-0 sm:w-auto lg:mt-3 xl:mt-0">
                  <Link to="/proyectos" className="boton boton-linea group w-full sm:w-auto">
                    <span>Ver proyectos</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
                  </Link>
                </Magnetico>
              </Revelar>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
