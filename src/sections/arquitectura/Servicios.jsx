import React from 'react';
import { motion as Motion } from 'framer-motion';
import { TituloSeccion } from '../../components/CabeceraPagina';
import IconoTrazado from './IconoTrazado';
import { SERVICIOS } from './datos';
import { VISTA, cx, escalonar, variantes } from '../../lib/movimiento';

// Relleno de cada celda según su columna: la primera queda al ras del margen (alineada con el título) y las demás se
// separan de su filete. Clases completas para que Tailwind las vea.
const COLUMNA_SM = ['sm:pl-0 sm:pr-8', 'sm:pl-8 sm:pr-0'];
const COLUMNA_LG = ['lg:pl-0 lg:pr-10', 'lg:px-10', 'lg:pl-10 lg:pr-0'];

/**
 * Nuestro servicio integral (#servicio-integral, a donde baja el «Conoce más» de la cabecera): los seis servicios en
 * una retícula de filetes, como una lámina de planos. Cada ícono se dibuja a pluma al entrar en pantalla.
 * Teléfono: una lista con el ícono a la izquierda.
 */
export default function Servicios() {
  return (
    <section id="servicio-integral" aria-labelledby="servicio-titulo" className="seccion relative bg-papel">
      <div className="contenedor">
        <TituloSeccion
          id="servicio-titulo"
          rotulo="Nuestro servicio integral"
          titulo="De la idea *a la entrega*"
          texto="Un solo equipo diseña, planifica, construye y supervisa tu proyecto, con transparencia, calidad y compromiso."
        />

        {/* Los filetes son el fondo de la lista asomando por el hueco de 1 px entre celdas (y por el borde de arriba y
            de abajo): así no se duplican donde se tocan dos celdas. */}
        <Motion.ul
          className="mt-14 grid grid-cols-1 gap-px border-y border-tinta/10 bg-tinta/10 bg-clip-padding sm:grid-cols-2 lg:mt-20 lg:grid-cols-3"
          initial="oculto"
          whileInView="visible"
          viewport={VISTA}
          variants={escalonar(0.08)}
        >
          {SERVICIOS.map((servicio, i) => (
            // La celda (opaca) queda quieta y lo que sube es su contenido: si se fundiera la celda entera, el fondo de
            // los filetes se vería a través mientras aparece.
            <li key={servicio.titulo} className={cx('bg-papel py-8 sm:py-10 lg:pb-12 lg:pt-11', COLUMNA_SM[i % 2], COLUMNA_LG[i % 3])}>
              <Motion.div variants={variantes.aparecer} className="flex sm:block">
                <IconoTrazado icono={servicio.icono} retraso={0.15 + i * 0.1} size={34} className="mr-5 mt-0.5 shrink-0 text-tinta sm:hidden" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <span className="etiqueta tabular-nums text-madera-oscuro">{String(i + 1).padStart(2, '0')}</span>
                    <IconoTrazado icono={servicio.icono} retraso={0.25 + i * 0.12} size={46} className="hidden text-tinta sm:inline-block" />
                  </div>
                  <h3 className="mt-2 font-display text-[1.6rem] leading-[1.08] tracking-[-0.01em] sm:mt-12 lg:mt-16 lg:text-[1.9rem]">
                    {servicio.titulo}
                  </h3>
                  <p className="mt-2.5 max-w-[24rem] text-[15px] leading-relaxed text-grafito/80 sm:mt-3">{servicio.texto}</p>
                </div>
              </Motion.div>
            </li>
          ))}
        </Motion.ul>
      </div>
    </section>
  );
}
