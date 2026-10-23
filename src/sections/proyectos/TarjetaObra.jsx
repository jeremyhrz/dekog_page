import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Foto from '../../components/efectos/Foto';
import Revelar from '../../components/efectos/Revelar';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { VISTA, cx } from '../../lib/movimiento';
import { ENCUADRE, fotosDe, nombreObra, portadaDe } from './datos';

/**
 * Una obra del portafolio: la portada (se destapa al entrar y se acerca al pasar el cursor, que dice «Ver»), con la
 * categoría, el nombre en Bodoni y cuántas fotos tiene; debajo, la descripción, «Ver proyecto» (la galería) y el
 * presupuesto por WhatsApp. `forma`: 'alta' (vertical), 'ancha' o 'sola' (a todo lo ancho) — la decide la retícula.
 * La foto es un botón solo para el ratón y el dedo: con teclado y lector de pantalla se llega por «Ver proyecto».
 */
export default function TarjetaObra({ obra, forma, clases, alto, tamanos, retraso = 0, alAbrir, alCotizar }) {
  const nombre = nombreObra(obra.titulo);
  const grande = forma !== 'alta';
  const tituloId = `obra-${obra.id}`;

  return (
    <article aria-labelledby={tituloId} className={cx('relative', clases)}>
      <div className="relative">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={alAbrir}
          data-cursor="Ver"
          className="pry-marco group relative block w-full overflow-hidden rounded-[18px] bg-piedra lg:rounded-[22px]"
        >
          <span className={cx('relative block', alto)}>
            <span className="absolute left-0 top-0 block h-full w-full transition-transform duration-[1200ms] ease-expo group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
              <Foto src={portadaDe(obra)} rellenar revelar parallax={0.06} posicion={ENCUADRE[obra.id]} sizes={tamanos} />
            </span>
          </span>
        </button>

        {/* Rótulos sobre la foto: llegan cuando la foto ya se destapó. No atrapan el cursor (el clic va a la foto). */}
        <motion.div
          className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-hidden rounded-[18px] lg:rounded-[22px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={VISTA}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.45 + retraso }}
        >
          <span aria-hidden="true" className="absolute bottom-0 left-0 h-3/4 w-full bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
          <span className="etiqueta absolute left-4 top-4 rounded-full bg-papel/85 px-3 py-1.5 !text-[10px] text-tinta backdrop-blur-sm lg:left-5 lg:top-5">
            {obra.categoria === 'RESIDENCIAL' ? 'Residencial' : 'Comercial'}
          </span>
          <div className={cx('absolute bottom-5 left-5 right-5 text-hueso', grande && 'lg:bottom-8 lg:left-8 lg:right-8')}>
            <h3
              id={tituloId}
              className={cx(
                'font-display font-normal leading-[0.95] tracking-[-0.01em]',
                grande ? 'text-[2.1rem] md:text-[clamp(2.4rem,4vw,3.6rem)]' : 'text-[2.1rem] lg:text-[clamp(1.8rem,2.4vw,2.3rem)]',
              )}
            >
              {nombre}
            </h3>
            <p className="etiqueta mt-2.5 !text-[10px] text-hueso/80">{fotosDe(obra)} fotos</p>
          </div>
        </motion.div>
      </div>

      <Revelar retraso={0.12 + retraso} y={18} className="mt-5 lg:mt-6">
        <p className={cx('text-[15px] leading-relaxed text-grafito', grande ? 'max-w-2xl' : 'max-w-md')}>{obra.descripcion}</p>
        {/* Si la tarjeta es angosta (escritorio chico), el presupuesto baja a otra línea en vez de partir las palabras. */}
        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-tinta/10 pt-2">
          <button
            type="button"
            onClick={alAbrir}
            aria-label={`Ver proyecto ${nombre}`}
            className="group/ver etiqueta -ml-1 mr-3 inline-flex min-h-[44px] items-center whitespace-nowrap px-1 !text-[11px] tracking-[0.18em] text-tinta"
          >
            <span className="enlace-linea pb-0.5">Ver proyecto</span>
            <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform duration-500 ease-expo group-hover/ver:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={alCotizar}
            aria-label={`Presupuesto similar a ${nombre}, por WhatsApp`}
            className="etiqueta -ml-1 -mr-1 inline-flex min-h-[44px] items-center whitespace-nowrap px-1 !text-[11px] tracking-[0.18em] text-madera-oscuro transition-colors duration-300 hover:text-tinta"
          >
            <IconoWhatsapp size={15} />
            <span className="ml-2">Presupuesto similar</span>
          </button>
        </div>
      </Revelar>
    </article>
  );
}
