import React from 'react';
import { ArrowDown } from 'lucide-react';
import CabeceraPagina, { TituloSeccion } from '../components/CabeceraPagina';
import Magnetico from '../components/efectos/Magnetico';
import { IconoWhatsapp } from '../components/asistente/comun';
import Formulario from '../sections/contacto/Formulario';
import Datos from '../sections/contacto/Datos';
import RespuestaInmediata from '../sections/contacto/RespuestaInmediata';
import Mapa from '../sections/contacto/Mapa';
import Preguntas from '../sections/contacto/Preguntas';
import { irA } from '../lib/scroll';
import { elegirWhatsapp } from '../utils/whatsapp';

/**
 * Contacto (/contacto), con el estilo editorial de la renovación de 2026:
 *   Cabecera (el letrero del showroom en un arco) → Envíanos un mensaje (el formulario, que se envía por WhatsApp, y los
 *   datos de contacto) → ¿Necesitas respuesta inmediata? (banda noche) → Encuéntranos (el mapa) → Preguntas frecuentes.
 * Las secciones viven en src/sections/contacto/.
 */
export default function Contacto() {
  const alFormulario = (evento) => {
    evento.preventDefault();
    irA('#formulario', { offset: -24 });
  };

  return (
    <>
      <CabeceraPagina
        rotulo="Contáctanos"
        titulo="Hablemos de tu *proyecto*"
        bajada="Estamos aquí para escuchar tus ideas y ayudarte a hacer realidad tu visión. La consulta inicial es *gratuita*."
        foto="/links/manongo-ubicacion.webp"
        alt="Letrero de Dekog en el showroom de Mañongo"
        posicion="30% 50%"
        acciones={(
          <>
            <Magnetico className="w-full sm:mr-3 sm:w-auto">
              <button type="button" onClick={() => elegirWhatsapp()} className="boton boton-oscuro w-full sm:w-auto">
                <IconoWhatsapp size={17} />
                <span>Escríbenos por WhatsApp</span>
              </button>
            </Magnetico>
            <Magnetico className="mt-3 w-full sm:mt-0 sm:w-auto">
              <a href="#formulario" onClick={alFormulario} className="boton boton-linea group w-full sm:w-auto">
                <span>Enviar un mensaje</span>
                <ArrowDown className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-y-0.5" strokeWidth={1.6} aria-hidden="true" />
              </a>
            </Magnetico>
          </>
        )}
      />

      <section id="formulario" aria-labelledby="formulario-titulo" className="seccion relative bg-papel">
        <div className="contenedor">
          <TituloSeccion
            rotulo="Formulario"
            id="formulario-titulo"
            titulo="Envíanos un *mensaje*"
            texto="Completa el formulario y te lo enviamos por WhatsApp con tus datos ya escritos."
          />
          <div className="mt-14 grid gap-y-20 lg:mt-20 lg:grid-cols-12 lg:gap-x-8">
            <div className="lg:col-span-7">
              <Formulario />
            </div>
            <Datos className="lg:col-span-5 lg:col-start-8 lg:pl-8 xl:col-span-4 xl:col-start-9 xl:pl-0" />
          </div>
        </div>
      </section>

      <RespuestaInmediata />
      <Mapa />
      <Preguntas />
    </>
  );
}
