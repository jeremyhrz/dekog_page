import React from 'react';
import { ArrowDown } from 'lucide-react';
import CabeceraPagina from './CabeceraPagina';
import Magnetico from './efectos/Magnetico';
import { IconoWhatsapp } from './asistente/comun';
import Servicios from '../sections/arquitectura/Servicios';
import TiposProyecto from '../sections/arquitectura/TiposProyecto';
import CitaCotizar from '../sections/arquitectura/CitaCotizar';
import Enfoque from '../sections/arquitectura/Enfoque';
import ComoTrabajamos from '../sections/arquitectura/ComoTrabajamos';
import { MENSAJE } from '../sections/arquitectura/datos';
import { irA } from '../lib/scroll';
import { elegirWhatsapp } from '../utils/whatsapp';

/**
 * Dekog Arquitectura (/arquitectura), con el estilo editorial de la renovación de 2026:
 *   cabecera (render de la tienda Maviz en el arco) → Nuestro servicio integral (retícula de filetes, íconos dibujados)
 *   → Tipos de proyectos (paneles que se abren; carril en el teléfono) → banda oscura «¿Listo para construir tu
 *   proyecto?» con la fachada que se dibuja → Nuestro enfoque (+120 proyectos) → Así trabajamos (línea de tiempo).
 * Las secciones viven en src/sections/arquitectura/; los textos, en su datos.js.
 */
export default function ArquitecturaSection() {
  return (
    <div id="arquitectura">
      <CabeceraPagina
        rotulo="Dekog Arquitectura"
        titulo="Diseñamos espacios que *duran*"
        bajada="Planificamos y construimos espacios funcionales, estéticos y duraderos. Te acompañamos *desde la idea inicial hasta la entrega final*, con transparencia, calidad y compromiso."
        foto="/arquitectura/principal.jpeg"
        alt="Render de la fachada de una tienda de dos niveles, proyecto comercial de Dekog Arquitectura"
        posicion="38% 50%"
        acciones={(
          <>
            <Magnetico className="w-full sm:mr-3 sm:w-auto">
              <a
                href="#servicio-integral"
                onClick={(evento) => {
                  evento.preventDefault();
                  irA('#servicio-integral');
                }}
                className="boton boton-oscuro group w-full sm:w-auto"
              >
                <span>Conoce más</span>
                <ArrowDown className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-y-0.5" strokeWidth={1.6} aria-hidden="true" />
              </a>
            </Magnetico>
            <Magnetico className="mt-3 w-full sm:mt-0 sm:w-auto">
              <button type="button" onClick={() => elegirWhatsapp(MENSAJE)} className="boton boton-linea w-full sm:w-auto">
                <IconoWhatsapp size={17} />
                <span>Cotiza tu proyecto</span>
              </button>
            </Magnetico>
          </>
        )}
      />
      <Servicios />
      <TiposProyecto />
      <CitaCotizar />
      <Enfoque />
      <ComoTrabajamos />
    </div>
  );
}
