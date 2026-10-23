import React, { Fragment } from 'react';
import { motion } from 'framer-motion';
import { EXPO, VISTA, cx, useMenosMovimiento } from '../../lib/movimiento';
import { partirEnfasis, textoPlano } from '../../lib/texto';

/**
 * Titular que entra por palabras (o letras) subiendo desde una máscara.
 *   <TextoDividido como="h1" texto="Espacios que *inspiran*" className="titulo-display" />
 *   <TextoDividido texto="Dekog" por="letra" alVer={false} retraso={0.4} />
 * - *asteriscos* = énfasis: cursiva madera (clase `enfasis`, cámbiala con `claseEnfasis`).
 * - `alVer` (true): anima al entrar en pantalla; con false, al montar (o con `animate` desde fuera).
 * El texto completo queda para lectores de pantalla; los trozos animados van aria-hidden.
 */
export default function TextoDividido({
  texto,
  como = 'span',
  por = 'palabra',
  retraso = 0,
  escalon,
  duracion = 0.95,
  alVer = true,
  claseEnfasis = 'enfasis',
  className,
  ...resto
}) {
  const menos = useMenosMovimiento();
  const Contenedor = motion[como];
  const pieza = menos
    ? { oculto: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } } }
    : { oculto: { y: '120%' }, visible: { y: '0%', transition: { duration: duracion, ease: EXPO } } };

  // Palabras con su énfasis; los espacios quedan como texto normal para que el renglón corte bien.
  const palabras = partirEnfasis(texto).flatMap(({ texto: tramo, enfasis }) =>
    // Solo los espacios normales separan palabras: un espacio duro (\u00a0) mantiene juntos «20 %».
    tramo.split(/( +)/).filter(Boolean).map((p) => ({ p, enfasis })));

  const disparo = alVer ? { whileInView: 'visible', viewport: VISTA } : { animate: 'visible' };
  const escalonado = escalon ?? (por === 'letra' ? 0.035 : 0.06);

  return (
    <Contenedor
      className={className}
      initial="oculto"
      {...disparo}
      variants={{ oculto: {}, visible: { transition: { staggerChildren: escalonado, delayChildren: retraso } } }}
      {...resto}
    >
      <span className="sr-only">{textoPlano(texto)}</span>
      <span aria-hidden="true">
        {palabras.map(({ p, enfasis }, i) => (/^ +$/.test(p) ? (
          <Fragment key={i}> </Fragment>
        ) : por === 'letra' ? (
          <span key={i} className={cx('inline-block whitespace-nowrap', enfasis && claseEnfasis)}>
            {[...p].map((letra, j) => (
              <span key={j} className="mascara">
                <motion.span className="inline-block" variants={pieza}>{letra}</motion.span>
              </span>
            ))}
          </span>
        ) : (
          <span key={i} className="mascara">
            <motion.span className={cx('inline-block', enfasis && claseEnfasis)} variants={pieza}>{p}</motion.span>
          </span>
        )))}
      </span>
    </Contenedor>
  );
}

/** Párrafo con los *énfasis* en cursiva, sin animación. */
export function Enfasis({ texto, como = 'span', claseEnfasis = 'enfasis', className }) {
  const Elemento = como;
  return (
    <Elemento className={className}>
      {partirEnfasis(texto).map(({ texto: tramo, enfasis }, i) => (enfasis
        ? <em key={i} className={claseEnfasis}>{tramo}</em>
        : <Fragment key={i}>{tramo}</Fragment>))}
    </Elemento>
  );
}
