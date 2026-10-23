import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Magnetico from '../../components/efectos/Magnetico';
import { MarcaD } from '../../components/marca/Logo';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { MENSAJES, enCatalogo } from './datos';
import { elegirWhatsapp } from '../../utils/whatsapp';

/** El cierre de /home: la pregunta en grande y el catálogo completo (o una asesora por WhatsApp). */
export default function Llamado() {
  return (
    <section aria-labelledby="llamado-titulo" className="seccion relative overflow-hidden bg-hueso">
      <div className="contenedor text-center">
        <Revelar y={16}>
          <MarcaD className="mx-auto h-10 w-10 text-madera" />
        </Revelar>
        <TextoDividido
          como="h2"
          id="llamado-titulo"
          texto="¿Listo para transformar tu *hogar*?"
          className="titulo-display mx-auto mt-8 max-w-4xl"
        />
        <Revelar como="p" retraso={0.15} className="mx-auto mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-grafito">
          Explora nuestro catálogo completo y encuentra la pieza perfecta con la garantía y calidad que solo Dekog puede ofrecer.
        </Revelar>
        <Revelar retraso={0.25} className="mt-10 flex flex-col items-center sm:flex-row sm:justify-center">
          <Magnetico className="w-full sm:mr-3 sm:w-auto">
            <Link to={enCatalogo('todos')} className="boton boton-oscuro group w-full sm:w-auto">
              <span>Ver el catálogo completo</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
            </Link>
          </Magnetico>
          <Magnetico className="mt-3 w-full sm:mt-0 sm:w-auto">
            <button type="button" onClick={() => elegirWhatsapp(MENSAJES.general)} className="boton boton-linea w-full sm:w-auto">
              <IconoWhatsapp size={17} />
              <span>Escríbenos</span>
            </button>
          </Magnetico>
        </Revelar>
      </div>
    </section>
  );
}
