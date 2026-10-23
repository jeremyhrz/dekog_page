import React, { useRef } from 'react';
import { motion as Motion, useScroll, useTransform } from 'framer-motion';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import Magnetico from '../../components/efectos/Magnetico';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { MENSAJE, PASOS } from './datos';
import { EXPO, VISTA, cx, useMenosMovimiento, variantes } from '../../lib/movimiento';
import { elegirWhatsapp } from '../../utils/whatsapp';

// La línea de tiempo se llena hasta esta altura de la pantalla: cada paso se enciende al cruzarla.
const ALTURA = '72%';

/**
 * Así trabajamos: los cinco pasos en una línea de tiempo vertical. Cada número sube desde su máscara, en contorno, al
 * entrar en pantalla; la línea madera baja con el scroll y, al llegar a un paso, enciende su punto y rellena su número.
 * Escritorio: el título y un render quedan fijos a la izquierda mientras pasan los pasos.
 */
export default function ComoTrabajamos() {
  return (
    <section id="como-trabajamos" aria-labelledby="proceso-titulo" className="seccion relative bg-papel">
      <div className="contenedor lg:grid lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Revelar como="p" className="etiqueta flex items-center text-madera-oscuro" y={12}>
              <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
              Nuestro proceso
            </Revelar>
            <TextoDividido como="h2" id="proceso-titulo" texto="Así *trabajamos*" className="titulo-display mt-5" />
            <Revelar como="p" retraso={0.15} className="mt-6 max-w-sm text-[1.0625rem] leading-relaxed text-grafito">
              Cinco pasos, de la primera conversación a la entrega de tu obra.
            </Revelar>
            <div className="relative mt-10 hidden overflow-hidden rounded-[22px] bg-arena lg:block" style={{ paddingBottom: '80%' }}>
              <Foto
                src="/arquitectura/interiorismo.jpeg"
                alt="Render de una cocina abierta con isla de mármol y comedor"
                rellenar
                revelar
                parallax={0.06}
                posicion="42% 50%"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
            </div>
          </div>
        </div>

        <div className="mt-14 lg:col-span-6 lg:col-start-7 lg:mt-3">
          <ol>
            {PASOS.map((paso, i) => (
              <Paso key={paso.numero} paso={paso} ultimo={i === PASOS.length - 1} />
            ))}
          </ol>

          <Revelar className="mt-14 sm:pl-[8.5rem] lg:mt-16">
            <Magnetico className="w-full sm:w-auto">
              <button type="button" onClick={() => elegirWhatsapp(MENSAJE)} className="boton boton-oscuro w-full sm:w-auto">
                <IconoWhatsapp size={17} />
                <span>Cuéntanos tu proyecto</span>
              </button>
            </Magnetico>
          </Revelar>
        </div>
      </div>
    </section>
  );
}

const NUMERO = {
  oculto: { y: '115%' },
  visible: { y: '0%', transition: { duration: 1.15, ease: EXPO } },
};
const NUMERO_QUIETO = {
  oculto: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

// Mismo tamaño y renglón para el número en contorno y el relleno que se le superpone.
const CIFRA = 'block font-display text-[2.5rem] leading-[0.95] tracking-[-0.02em] sm:text-[4.25rem]';
// El eje de la línea de tiempo: el borde derecho de la columna de los números.
const EJE = 'left-[4.5rem] sm:left-24';

/** Un paso: número en contorno, el tramo de línea hasta el paso siguiente y el punto que se enciende. */
function Paso({ paso, ultimo }) {
  const ref = useRef(null);
  const menos = useMenosMovimiento();
  // 0 cuando el paso toca la altura de encendido, 1 cuando la deja atrás: el tramo mide lo mismo que el paso.
  const { scrollYProgress } = useScroll({ target: ref, offset: [`start ${ALTURA}`, `end ${ALTURA}`] });
  const encendido = useTransform(scrollYProgress, [0, 0.04], [0, 1]);

  return (
    <Motion.li
      ref={ref}
      className={cx('relative grid grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[6rem_minmax(0,1fr)]', !ultimo && 'pb-14 lg:pb-20')}
      initial="oculto"
      whileInView="visible"
      viewport={VISTA}
    >
      {!ultimo && (
        <>
          <span aria-hidden="true" className={cx('absolute -bottom-[0.95rem] top-[0.95rem] w-px bg-tinta/10', EJE)} />
          <Motion.span
            aria-hidden="true"
            className={cx('absolute -bottom-[0.95rem] top-[0.95rem] w-px origin-top bg-madera', EJE)}
            style={{ scaleY: scrollYProgress }}
          />
        </>
      )}
      <span aria-hidden="true" className={cx('absolute top-[0.95rem] -ml-[5px] -mt-[5px] h-[11px] w-[11px] rounded-full border border-tinta/25 bg-papel', EJE)} />
      <Motion.span
        aria-hidden="true"
        className={cx('absolute top-[0.95rem] -ml-[5px] -mt-[5px] h-[11px] w-[11px] rounded-full bg-madera', EJE)}
        style={{ opacity: encendido, scale: encendido }}
      />

      <span aria-hidden="true" className="mascara self-start">
        <Motion.span className="relative block" variants={menos ? NUMERO_QUIETO : NUMERO}>
          <span className={cx(CIFRA, 'text-transparent [-webkit-text-stroke:1px_theme(colors.madera.titulo)]')}>{paso.numero}</span>
          <Motion.span className={cx(CIFRA, 'absolute left-0 top-0 text-madera-titulo')} style={{ opacity: encendido }}>
            {paso.numero}
          </Motion.span>
        </Motion.span>
      </span>

      <div className="pl-6 sm:pl-10">
        <Motion.h3 variants={variantes.aparecer} className="font-display text-[1.8rem] leading-[1.05] sm:text-[2.25rem]">
          {paso.titulo}
        </Motion.h3>
        <Motion.p variants={variantes.aparecer} className="mt-2.5 max-w-md text-[15px] leading-relaxed text-grafito/80 sm:text-base">
          {paso.texto}
        </Motion.p>
      </div>
    </Motion.li>
  );
}
