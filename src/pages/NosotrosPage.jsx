import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import CabeceraPagina from '../components/CabeceraPagina';
import Nosotros from '../components/Nosotros';
import Magnetico from '../components/efectos/Magnetico';
import { IconoWhatsapp } from '../components/asistente/comun';
import Trabajemos from '../sections/nosotros/Trabajemos';
import { CABECERA } from '../sections/nosotros/datos';
import { elegirWhatsapp } from '../utils/whatsapp';

/**
 * NosotrosPage — /nosotros, con el estilo editorial de la portada: la cabecera con el equipo en un arco, el cuerpo
 * (components/Nosotros.jsx: quiénes somos y las cifras, la historia y los valores) y el cierre en banda noche.
 */
export default function NosotrosPage() {
  return (
    <>
      <CabeceraPagina
        rotulo={CABECERA.rotulo}
        titulo={CABECERA.titulo}
        bajada={CABECERA.bajada}
        foto="/nosotros/PRINCIPAL.jpeg"
        alt="Dos integrantes del equipo de Dekog"
        posicion="50% 0%"
        parallax={0}
        acciones={(
          <>
            <Magnetico className="w-full sm:mr-3 sm:w-auto">
              <Link to="/proyectos" className="boton boton-oscuro group w-full sm:w-auto">
                <span>Ver proyectos</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
              </Link>
            </Magnetico>
            <Magnetico className="mt-3 w-full sm:mt-0 sm:w-auto">
              <button type="button" onClick={() => elegirWhatsapp(CABECERA.whatsapp)} className="boton boton-linea w-full sm:w-auto">
                <IconoWhatsapp size={17} />
                <span>Escríbenos</span>
              </button>
            </Magnetico>
          </>
        )}
      />
      <Nosotros />
      <Trabajemos />
    </>
  );
}
