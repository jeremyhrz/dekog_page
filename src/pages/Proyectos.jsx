import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight } from 'lucide-react';
import CabeceraPagina from '../components/CabeceraPagina';
import ProjectsSection from '../components/ProjectsSection';
import Magnetico from '../components/efectos/Magnetico';
import Ventajas from '../sections/proyectos/Ventajas';
import Cierre from '../sections/proyectos/Cierre';
import { CABECERA, irAObras } from '../sections/proyectos/datos';

/**
 * Proyectos — /proyectos, portafolio con el estilo editorial de la portada: la cabecera (los planos en un arco), las
 * obras con su filtro y su orden (components/ProjectsSection.jsx; cada una abre su galería), la franja de lo que
 * distingue a Dekog y el cierre en banda noche con el WhatsApp.
 */
export default function Proyectos() {
  return (
    <>
      <CabeceraPagina
        rotulo={CABECERA.rotulo}
        titulo={CABECERA.titulo}
        bajada={CABECERA.bajada}
        foto={CABECERA.foto}
        alt={CABECERA.alt}
        acciones={(
          <>
            <Magnetico className="w-full sm:mr-3 sm:w-auto">
              <a
                href="#proyectos"
                onClick={(evento) => {
                  evento.preventDefault();
                  irAObras();
                }}
                className="boton boton-oscuro group w-full sm:w-auto"
              >
                <span>Ver las obras</span>
                <ArrowDown className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-y-0.5" strokeWidth={1.6} aria-hidden="true" />
              </a>
            </Magnetico>
            <Magnetico className="mt-3 w-full sm:mt-0 sm:w-auto">
              <Link to="/servicios" className="boton boton-linea group w-full sm:w-auto">
                <span>Conoce nuestro proceso</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
              </Link>
            </Magnetico>
          </>
        )}
      />
      <ProjectsSection />
      <Ventajas />
      <Cierre />
    </>
  );
}
