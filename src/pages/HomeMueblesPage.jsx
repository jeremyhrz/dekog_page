import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import CabeceraPagina from '../components/CabeceraPagina';
import HomeSection from '../components/HomeSection';
import Magnetico from '../components/efectos/Magnetico';
import Revelar from '../components/efectos/Revelar';
import { IconoWhatsapp } from '../components/asistente/comun';
import BandaArquitectura from '../sections/home/BandaArquitectura';
import { MENSAJES, enCatalogo } from '../sections/home/datos';
import { elegirWhatsapp } from '../utils/whatsapp';

/**
 * HomeMueblesPage — /home: Dekog Home, la línea de muebles, como página propia (renovación de 2026).
 * La cabecera común de las páginas interiores (el Sofá Dubai en el arco), el cuerpo de la línea (HomeSection) y la banda
 * oscura que lleva a Dekog Arquitectura.
 *
 * App.jsx le pasa el estado del catálogo (categoria, setCategoria, handleCategoryClick, add, setQuickViewProduct), pero
 * aquí ya no hace falta: los enlaces a una categoría van a /?categoria=…#catalogo con <Link>, y la portada filtra y
 * baja sola (pages/Home.jsx). Antes se cambiaba la categoría y se recargaba con window.location, y el filtro se perdía.
 */
export default function HomeMueblesPage() {
  return (
    <>
      <CabeceraPagina
        rotulo="Dekog Home · Mobiliario"
        titulo="Muebles que hacen *hogar*"
        bajada="Mobiliario *arquitectónico*: seleccionamos cada pieza pensando en diseño, funcionalidad y calidad, para que tu espacio refleje tu estilo de vida."
        foto="/catalogo/dubai.png"
        alt="Sofá Dubai de Dekog Home en una sala luminosa"
        acciones={(
          <>
            <Magnetico className="w-full sm:mr-3 sm:w-auto">
              <Link to={enCatalogo('todos')} className="boton boton-oscuro group w-full sm:w-auto">
                <span>Ver el catálogo</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
              </Link>
            </Magnetico>
            <Magnetico className="mt-3 w-full sm:mt-0 sm:w-auto">
              <button type="button" onClick={() => elegirWhatsapp(MENSAJES.general)} className="boton boton-linea w-full sm:w-auto">
                <IconoWhatsapp size={17} />
                <span>Escríbenos</span>
              </button>
            </Magnetico>
          </>
        )}
      >
        <Ficha />
      </CabeceraPagina>

      <HomeSection />
      <BandaArquitectura />
    </>
  );
}

/** Debajo de los botones: la garantía y la pieza de la foto (lleva a los sofás del catálogo). */
function Ficha() {
  return (
    <Revelar retraso={0.65} y={16} className="mt-12 grid max-w-lg grid-cols-2 border-t border-tinta/10 lg:mt-14">
      <div className="pr-4 pt-5">
        <p className="etiqueta flex items-center text-grafito/70">
          <ShieldCheck className="mr-2 h-3.5 w-3.5 shrink-0 text-madera-oscuro" strokeWidth={1.6} aria-hidden="true" />
          Garantía estructural
        </p>
        <p className="mt-2 font-display text-[1.35rem] leading-tight sm:text-[1.45rem] lg:text-[1.6rem]">
          Hasta <span className="enfasis whitespace-nowrap">18 meses</span>
        </p>
      </div>
      <div className="border-l border-tinta/10 pl-4 pt-5 lg:pl-6">
        <p className="etiqueta text-grafito/70">En la foto</p>
        <Link to={enCatalogo('sofas')} className="group mt-2 inline-flex items-center font-display text-[1.35rem] leading-tight sm:text-[1.45rem] lg:text-[1.6rem]">
          <span className="enlace-linea whitespace-nowrap">Sofá Dubai</span>
          <ArrowUpRight
            className="ml-1 h-5 w-5 text-madera-oscuro transition-transform duration-500 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            strokeWidth={1.4}
            aria-hidden="true"
          />
        </Link>
      </div>
    </Revelar>
  );
}
