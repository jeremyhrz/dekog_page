import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Imagen from '../Imagen';
import { recorteMovil } from '../../utils/imagenes';
import { VISTA, cx, useMenosMovimiento, variantes } from '../../lib/movimiento';

/**
 * Una foto de public/ con las variantes WebP de siempre (<Imagen>: srcset + respaldo a la original), sobre un fondo
 * arena mientras carga, y que se funde al llegar. Opciones:
 *   rellenar   ocupa todo su padre (absolute, arriba/abajo/izquierda/derecha 0)
 *   revelar    se destapa de abajo arriba al entrar en pantalla, mientras se asienta de 1,2 a 1
 *   parallax   0,1 = se desplaza un 10 % más lento que el scroll (y se agranda para no dejar bordes)
 *   retrato    usa el recorte vertical de las fotos del hero (/opt/hero/…-movil.webp): para tarjetas altas
 *   posicion   object-position ('50% 30%')
 */
export default function Foto({
  src, alt = '', sizes = '100vw', prioridad = false, rellenar = false, revelar = false, parallax = 0, retrato = false,
  posicion, className, claseImagen,
}) {
  const menos = useMenosMovimiento();
  const [cargada, setCargada] = useState(false);
  const img = retrato ? (
    <img
      src={recorteMovil(src)}
      alt={alt}
      loading={prioridad ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setCargada(true)}
      onError={(e) => {
        if (!e.currentTarget.dataset.original) {
          e.currentTarget.dataset.original = '1';
          e.currentTarget.src = src;
        }
      }}
      className={cx('block h-full w-full object-cover transition-opacity duration-700 ease-suave', cargada ? 'opacity-100' : 'opacity-0', claseImagen)}
      style={posicion ? { objectPosition: posicion } : undefined}
      draggable="false"
    />
  ) : (
    <Imagen
      src={src}
      alt={alt}
      sizes={sizes}
      prioridad={prioridad}
      loading={prioridad ? undefined : 'lazy'}
      onLoad={() => setCargada(true)}
      className={cx('block h-full w-full object-cover transition-opacity duration-700 ease-suave', cargada ? 'opacity-100' : 'opacity-0', claseImagen)}
      style={posicion ? { objectPosition: posicion } : undefined}
      draggable="false"
    />
  );

  const base = cx('overflow-hidden bg-arena', rellenar ? 'absolute left-0 top-0 h-full w-full' : 'relative block', className);
  const conParallax = parallax && !menos ? <CapaParallax fuerza={parallax}>{img}</CapaParallax> : img;

  if (revelar && !menos) {
    return (
      <motion.span className={base} style={{ display: 'block' }} initial="oculto" whileInView="visible" viewport={VISTA} variants={variantes.foto}>
        <motion.span className="block h-full w-full" variants={variantes.fotoInterior}>{conParallax}</motion.span>
      </motion.span>
    );
  }
  return <span className={base} style={{ display: 'block' }}>{conParallax}</span>;
}

function CapaParallax({ fuerza, children }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-fuerza * 100}%`, `${fuerza * 100}%`]);
  return (
    <span ref={ref} className="block h-full w-full overflow-hidden">
      <motion.span className="block h-full w-full" style={{ y, scale: 1 + fuerza * 2 }}>{children}</motion.span>
    </span>
  );
}
