import React from 'react';
import { ArrowDown } from 'lucide-react';
import CabeceraPagina from '../components/CabeceraPagina';
import ServiciosSection from '../components/ServiciosSection';
import Magnetico from '../components/efectos/Magnetico';
import { IconoWhatsapp } from '../components/asistente/comun';
import FotoCentral from '../sections/servicios/FotoCentral';
import Sumario from '../sections/servicios/Sumario';
import Cierre from '../sections/servicios/Cierre';
import { MENSAJE_COTIZAR } from '../sections/servicios/datos';
import { irA } from '../lib/scroll';
import { propsWhatsapp } from '../utils/whatsapp';

/**
 * Servicios — /servicios (renovación de 2026, estilo editorial):
 *   Cabecera («Cotiza tu proyecto» por WhatsApp y el sumario de los servicios) → la foto central a lo ancho →
 *   los cinco servicios (historia con el arco fijo en escritorio, filas en el teléfono) → cierre noche «Cotiza tu
 *   proyecto». Las piezas viven en sections/servicios/ y components/ServiciosSection.jsx.
 */
export default function Servicios() {
  return (
    <>
      <CabeceraPagina
        rotulo="Nuestros servicios"
        titulo="Del primer trazo al último *detalle*"
        bajada="Arquitectos, ingenieros y diseñadores para todo tu proyecto: lo diseñamos, lo construimos y lo *amoblamos*."
        acciones={(
          <>
            <Magnetico className="w-full sm:mr-3 sm:w-auto">
              <a {...propsWhatsapp(MENSAJE_COTIZAR)} className="boton boton-oscuro w-full sm:w-auto">
                <IconoWhatsapp size={17} />
                <span>Cotiza tu proyecto</span>
              </a>
            </Magnetico>
            <Magnetico className="mt-3 w-full sm:mt-0 sm:w-auto">
              <a
                href="#servicios"
                onClick={(evento) => {
                  evento.preventDefault();
                  irA('#servicios');
                }}
                className="boton boton-linea group w-full sm:w-auto"
              >
                <span>Ver los servicios</span>
                <ArrowDown className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-y-0.5" strokeWidth={1.6} aria-hidden="true" />
              </a>
            </Magnetico>
          </>
        )}
      >
        <Sumario />
      </CabeceraPagina>
      <FotoCentral />
      <ServiciosSection />
      <Cierre />
    </>
  );
}
