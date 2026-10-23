import React from 'react';
import { Mail } from 'lucide-react';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Magnetico from '../../components/efectos/Magnetico';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { CORREO_CV } from './datos';
import { elegirWhatsapp } from '../../utils/whatsapp';

/**
 * Cierre en banda noche, centrado como el final de un artículo: «¿Listo para trabajar juntos?», con el WhatsApp para
 * contar un proyecto (abre el selector de línea) y «Únete al equipo» (el correo con el asunto de las postulaciones).
 */
export default function Trabajemos() {
  return (
    <section id="trabajemos" aria-labelledby="trabajemos-titulo" className="sobre-oscuro seccion relative overflow-hidden bg-noche text-hueso">
      <div className="contenedor text-center">
        <Revelar como="p" className="etiqueta flex items-center justify-center text-madera-claro" y={12}>
          <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
          Hablemos
          <span aria-hidden="true" className="ml-3 h-px w-8 bg-current" />
        </Revelar>
        <TextoDividido
          como="h2"
          id="trabajemos-titulo"
          texto="¿Listo para trabajar *juntos*?"
          className="titulo-display mx-auto mt-6 max-w-5xl lg:mt-8 lg:text-[clamp(5rem,8vw,7.5rem)]"
        />
        <Revelar como="p" retraso={0.15} className="mx-auto mt-8 max-w-md text-[1.0625rem] leading-relaxed text-hueso/75 lg:mt-10 lg:text-[1.125rem]">
          Cuéntanos sobre tu proyecto y descubre cómo podemos transformar tu espacio.
        </Revelar>
        <Revelar retraso={0.25} className="mt-10 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
          <Magnetico className="w-full sm:mr-3 sm:w-auto">
            <button
              type="button"
              onClick={() => elegirWhatsapp('Hola, quiero contarles sobre mi proyecto.')}
              className="boton boton-claro w-full sm:w-auto"
            >
              <IconoWhatsapp size={17} />
              <span>Cuéntanos tu proyecto</span>
            </button>
          </Magnetico>
          <Magnetico className="mt-3 w-full sm:mt-0 sm:w-auto">
            <a href={CORREO_CV} className="boton boton-linea w-full sm:w-auto">
              <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Únete al equipo</span>
            </a>
          </Magnetico>
        </Revelar>
      </div>
    </section>
  );
}
