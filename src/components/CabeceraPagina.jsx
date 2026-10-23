import React from 'react';
import { motion } from 'framer-motion';
import TextoDividido, { Enfasis } from './efectos/TextoDividido';
import Revelar from './efectos/Revelar';
import Foto from './efectos/Foto';
import { EXPO, cx } from '../lib/movimiento';

/**
 * Cabecera de las páginas interiores (renovación de 2026), la misma en todas para que la web se sienta una sola:
 * el rótulo con su filete, el título enorme en Bodoni que sube por palabras (*énfasis* en cursiva madera), la bajada,
 * los botones y la foto en un arco que se destapa (con un parallax suave).
 *
 *   <CabeceraPagina
 *     rotulo="Dekog Arquitectura"
 *     titulo="Diseñamos espacios que *duran*"
 *     bajada="Planificamos y construimos espacios funcionales, estéticos y duraderos."
 *     foto="/arquitectura/principal.jpeg"
 *     acciones={<button className="boton boton-oscuro">…</button>}
 *   />
 *
 * `oscura`: fondo noche y texto hueso (para una página que quiere abrir en oscuro). `retrato`: la foto es del hero
 * (usa su recorte vertical). `posicion`: object-position de la foto. `parallax`: 0,06 por defecto; 0 lo apaga (la foto
 * se agranda un poco para moverse: con caras cerca del borde, conviene bajarlo).
 */
export default function CabeceraPagina({
  rotulo, titulo, bajada, foto, alt = '', acciones, oscura = false, retrato = false, posicion, parallax = 0.06, children,
}) {
  return (
    <header className={cx('relative overflow-hidden', oscura ? 'sobre-oscuro bg-noche text-hueso' : 'bg-hueso text-tinta')}>
      <div className="contenedor grid items-end gap-y-12 pb-16 pt-28 lg:min-h-[86vh] lg:grid-cols-12 lg:gap-x-8 lg:pb-24 lg:pt-36">
        <div className={cx('relative z-10', foto ? 'lg:col-span-7' : 'lg:col-span-10')}>
          <motion.p
            className={cx('etiqueta flex items-center', oscura ? 'text-madera-claro' : 'text-madera-oscuro')}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EXPO, delay: 0.1 }}
          >
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            {rotulo}
          </motion.p>
          <TextoDividido
            como="h1"
            texto={titulo}
            alVer={false}
            retraso={0.15}
            escalon={0.06}
            duracion={1.05}
            className="titulo-display mt-5 text-[clamp(3rem,10vw,7.25rem)] lg:mt-7"
          />
          {bajada && (
            <Revelar retraso={0.45} y={20}>
              <Enfasis como="p" texto={bajada} className={cx('mt-7 max-w-xl text-[1.0625rem] leading-relaxed lg:text-[1.15rem]', oscura ? 'text-hueso/75' : 'text-grafito')} />
            </Revelar>
          )}
          {acciones && (
            <Revelar retraso={0.55} y={20} className="mt-9 flex flex-col sm:flex-row sm:flex-wrap sm:items-center">
              {acciones}
            </Revelar>
          )}
          {children}
        </div>

        {foto && (
          <div className="relative mx-auto w-[82%] max-w-[460px] lg:col-span-5 lg:mx-0 lg:w-full lg:justify-self-end">
            <div className="relative overflow-hidden rounded-b-[24px] rounded-t-full bg-arena" style={{ paddingBottom: '128%' }}>
              <Foto src={foto} alt={alt} rellenar revelar parallax={parallax} retrato={retrato} posicion={posicion} prioridad sizes="(min-width: 1024px) 40vw, 82vw" />
            </div>
            <div
              aria-hidden="true"
              className={cx('pointer-events-none absolute -bottom-3 -left-3 -right-3 -top-3 rounded-b-[30px] rounded-t-full border', oscura ? 'border-hueso/20' : 'border-tinta/10')}
            />
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Encabezado de una sección: rótulo con filete, título en Bodoni (*énfasis*) y, a la derecha en escritorio, una
 * frase o un párrafo. `centrado` para secciones cortas.
 */
export function TituloSeccion({ rotulo, titulo, texto, id, oscura = false, centrado = false, className }) {
  return (
    <div className={cx(centrado ? 'mx-auto max-w-3xl text-center' : 'lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8', className)}>
      <div className={centrado ? '' : 'lg:col-span-8'}>
        {rotulo && (
          <Revelar
            como="p"
            y={12}
            className={cx('etiqueta flex items-center', centrado && 'justify-center', oscura ? 'text-madera-claro' : 'text-madera-oscuro')}
          >
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            {rotulo}
          </Revelar>
        )}
        <TextoDividido como="h2" id={id} texto={titulo} className="titulo-display mt-5" />
      </div>
      {texto && (
        <Revelar retraso={0.15} className={cx(centrado ? 'mx-auto mt-6 max-w-xl' : 'mt-6 lg:col-span-4 lg:mt-0 lg:pb-3')}>
          <p className={cx('text-[1.0625rem] leading-relaxed', oscura ? 'text-hueso/75' : 'text-grafito')}>{texto}</p>
        </Revelar>
      )}
    </div>
  );
}
