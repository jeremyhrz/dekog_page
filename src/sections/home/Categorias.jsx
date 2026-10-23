import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { TituloSeccion } from '../../components/CabeceraPagina';
import Revelar from '../../components/efectos/Revelar';
import Foto from '../../components/efectos/Foto';
import Contador from '../../components/efectos/Contador';
import { CATEGORIAS, LINEAS_CAMAS, TOTAL_PIEZAS, enCatalogo } from './datos';
import { VISTA, cx, escalonar, variantes } from '../../lib/movimiento';

const Lista = motion.ul;
const Elemento = motion.li;
const dos = (n) => String(n).padStart(2, '0');

/**
 * Categorías destacadas: Sofás y puffs, Camas y Mesas en tarjetas grandes con su foto (se destapa al entrar y se acerca
 * al pasar el cursor) y cuántos modelos hay. Cada una abre el catálogo de la portada ya filtrado (/?categoria=…#catalogo);
 * debajo, las tres líneas de camas y el catálogo entero.
 */
export default function Categorias() {
  return (
    <section id="categorias" aria-labelledby="categorias-titulo" className="seccion bg-hueso">
      <div className="contenedor">
        <TituloSeccion
          id="categorias-titulo"
          rotulo="Explora nuestra selección"
          titulo="Categorías *destacadas*"
          texto={`Camas, sofás, puffs y mesas hechos a la medida: ${TOTAL_PIEZAS} piezas para elegir. Entra por la que buscas.`}
        />

        <Lista
          className="mt-12 grid grid-cols-1 gap-y-5 sm:grid-cols-3 sm:gap-x-4 lg:mt-20 lg:gap-x-8"
          initial="oculto"
          whileInView="visible"
          viewport={VISTA}
          variants={escalonar(0.12)}
        >
          {CATEGORIAS.map((categoria, i) => (
            <Elemento key={categoria.clave} variants={variantes.aparecer} className={cx(i === 1 && 'lg:mt-24')}>
              <Tarjeta categoria={categoria} numero={i + 1} />
            </Elemento>
          ))}
        </Lista>

        <LineasDeCamas />
      </div>
    </section>
  );
}

function Tarjeta({ categoria, numero }) {
  return (
    <Link
      to={enCatalogo(categoria.clave)}
      data-cursor="Ver"
      aria-label={`${categoria.nombre}: ${categoria.cuenta} ${categoria.unidad}. Ver en el catálogo`}
      className="group block"
    >
      <span className="relative isolate block overflow-hidden rounded-[20px] bg-arena pb-[112%] sm:pb-[125%]">
        <span className="absolute left-0 top-0 block h-full w-full transition-transform duration-[1400ms] ease-expo group-hover:scale-[1.06]">
          <Foto
            src={categoria.foto}
            alt={categoria.alt}
            rellenar
            revelar
            parallax={0.06}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 32vw, 92vw"
          />
        </span>
        <span aria-hidden="true" className="absolute left-0 top-0 h-full w-full bg-gradient-to-t from-black/60 via-black/5 to-transparent" />

        <span className="etiqueta absolute left-4 top-4 rounded-full bg-papel/85 px-3 py-1.5 !text-[10px] tabular-nums text-tinta backdrop-blur-sm lg:left-5 lg:top-5">
          {dos(numero)} / {dos(CATEGORIAS.length)}
        </span>

        <span className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-hueso lg:bottom-7 lg:left-7 lg:right-7">
          <span className="min-w-0">
            <span className="etiqueta block text-hueso/80">
              <Contador valor={categoria.cuenta} /> {categoria.unidad}
            </span>
            <span className="mt-2 block font-display text-[2.4rem] leading-[0.95] tracking-[-0.01em] sm:text-[1.7rem] lg:text-[clamp(2.25rem,3.1vw,3.1rem)]">
              {categoria.nombre}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="ml-4 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-hueso/40 transition-colors duration-500 ease-expo group-hover:border-hueso group-hover:bg-hueso group-hover:text-tinta sm:hidden lg:grid"
          >
            <ArrowUpRight className="h-5 w-5 transition-transform duration-500 ease-expo group-hover:rotate-45" strokeWidth={1.5} />
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Las tres líneas de camas (Clásicas, Alta Gama, Kids) y el catálogo completo, en una fila con filete. */
function LineasDeCamas() {
  return (
    <Revelar className="mt-14 border-t border-tinta/10 pt-6 lg:mt-20 lg:flex lg:items-center">
      <p className="etiqueta text-grafito/70 lg:mr-8 lg:shrink-0">Camas por línea</p>
      <ul className="mt-4 flex flex-wrap lg:mt-0">
        {LINEAS_CAMAS.map((linea) => (
          <li key={linea.clave} className="mb-2 mr-2 lg:mb-0">
            <Link
              to={enCatalogo(linea.clave)}
              aria-label={`Camas ${linea.nombre}: ${linea.cuenta} diseños`}
              className="group inline-flex min-h-[44px] items-center rounded-full pl-4 pr-3.5 text-[15px] leading-none ring-1 ring-tinta/15 transition-colors duration-300 hover:bg-tinta hover:text-papel hover:ring-tinta"
            >
              <span>{linea.nombre}</span>
              <span className="ml-2 text-[12px] tabular-nums text-madera-oscuro transition-colors duration-300 group-hover:text-madera-claro">
                {linea.cuenta}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to={enCatalogo('todos')} className="etiqueta group mt-5 inline-flex items-center text-tinta lg:ml-auto lg:mt-0">
        <span className="enlace-linea pb-1">Ver las {TOTAL_PIEZAS} piezas</span>
        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
      </Link>
    </Revelar>
  );
}
