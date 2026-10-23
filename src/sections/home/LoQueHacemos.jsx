import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { TituloSeccion } from '../../components/CabeceraPagina';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { SERVICIOS } from './datos';
import { VISTA, escalonar, variantes } from '../../lib/movimiento';
import { elegirWhatsapp } from '../../utils/whatsapp';

const Lista = motion.ul;
const Elemento = motion.li;

/**
 * Lo que hacemos: los cuatro servicios de Dekog Home en columnas con filete (el filete se tiñe de madera al pasar el
 * cursor). Cada uno lleva a donde llevaba la página de antes: el catálogo filtrado, /arquitectura o una asesora por
 * WhatsApp (el selector «¿Con quién quieres hablar?»).
 */
export default function LoQueHacemos() {
  return (
    <section id="lo-que-hacemos" aria-labelledby="hacemos-titulo" className="seccion bg-papel">
      <div className="contenedor">
        <TituloSeccion
          id="hacemos-titulo"
          rotulo="Servicios especializados"
          titulo="Lo que *hacemos*"
          texto="Mobiliario, decoración y acabados que complementan cada espacio y lo convierten en un hogar."
        />

        <Lista
          className="mt-14 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-8 lg:mt-20 lg:grid-cols-4"
          initial="oculto"
          whileInView="visible"
          viewport={VISTA}
          variants={escalonar(0.1)}
        >
          {SERVICIOS.map((servicio) => (
            <Elemento key={servicio.numero} variants={variantes.aparecer}>
              <Servicio servicio={servicio} />
            </Elemento>
          ))}
        </Lista>
      </div>
    </section>
  );
}

function Servicio({ servicio }) {
  const Icono = servicio.icono;
  const { ir } = servicio;
  // Columna flexible a toda la altura de la fila: el enlace de abajo queda alineado en las cuatro.
  const clase = 'group relative flex h-full w-full flex-col border-t border-tinta/15 pt-6 text-left';
  const contenido = (
    <>
      <span aria-hidden="true" className="absolute -top-px left-0 h-px w-full origin-left scale-x-0 bg-madera transition-transform duration-700 ease-expo group-hover:scale-x-100" />
      <span className="flex items-center justify-between">
        <span className="etiqueta tabular-nums text-madera-oscuro">{servicio.numero}</span>
        <Icono className="h-7 w-7 text-grafito/55 transition-colors duration-500 group-hover:text-madera-oscuro" strokeWidth={1.1} aria-hidden="true" />
      </span>
      <span className="mt-6 block font-display text-[1.9rem] leading-[1.05] tracking-[-0.01em] [text-wrap:balance] lg:mt-12 lg:text-[2rem]">{servicio.titulo}</span>
      <span className="mt-3 block max-w-sm text-[15px] leading-relaxed text-grafito/75">{servicio.texto}</span>
      <span className="etiqueta mt-auto inline-flex items-center self-start pt-7 text-tinta">
        {ir.whatsapp && <IconoWhatsapp size={14} />}
        <span className={ir.whatsapp ? 'ml-2' : undefined}>{ir.etiqueta}</span>
        <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
      </span>
    </>
  );

  if (ir.whatsapp) {
    return (
      <button type="button" onClick={() => elegirWhatsapp(ir.whatsapp)} className={clase}>
        {contenido}
      </button>
    );
  }
  return (
    <Link to={ir.ruta} className={clase}>
      {contenido}
    </Link>
  );
}
