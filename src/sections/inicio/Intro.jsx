import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LogoAnimado } from '../../components/marca/Logo';
import { terminarIntro } from '../../lib/intro';
import { CORTINA, EXPO, useMenosMovimiento } from '../../lib/movimiento';
import { useBloquearScroll } from '../../lib/scroll';
import { DEKOG } from '../../data/sitio';

/**
 * Intro (solo la 1.ª visita de la sesión a la portada; lo decide src/lib/intro.js): sobre hueso, las rayas de la D se
 * dibujan, «Dekog» sube desde una máscara y un telón con el borde curvo se levanta y deja ver la portada, que ya
 * estaba pintada debajo. Dura ≤ 2 s y se salta con un toque, la rueda o una tecla.
 * Con «reducir movimiento»: el logo quieto y un fundido corto.
 */
export default function Intro() {
  const menos = useMenosMovimiento();
  const [fase, setFase] = useState('logo'); // logo → sube → fin

  useBloquearScroll(fase === 'logo');

  useEffect(() => {
    const t = window.setTimeout(() => setFase((f) => (f === 'logo' ? 'sube' : f)), menos ? 600 : 1300);
    return () => window.clearTimeout(t);
  }, [menos]);

  // La portada y la navegación entran mientras el telón sube. Si la animación no avisa al terminar, la intro se quita
  // igual: nunca puede quedarse tapando la página.
  useEffect(() => {
    if (fase !== 'sube') return undefined;
    terminarIntro();
    const t = window.setTimeout(() => setFase('fin'), 1100);
    return () => window.clearTimeout(t);
  }, [fase]);

  useEffect(() => {
    if (fase !== 'logo') return undefined;
    const saltar = () => setFase('sube');
    const eventos = ['pointerdown', 'wheel', 'touchmove', 'keydown'];
    eventos.forEach((e) => window.addEventListener(e, saltar, { passive: true }));
    return () => eventos.forEach((e) => window.removeEventListener(e, saltar));
  }, [fase]);

  if (fase === 'fin') return null;

  const sube = fase === 'sube';
  return (
    <motion.div
      aria-hidden="true"
      className="fixed left-0 top-0 z-intro h-full w-full bg-hueso text-tinta"
      style={{ pointerEvents: sube ? 'none' : 'auto' }}
      animate={sube ? (menos ? { opacity: 0 } : { y: -1.2 * window.innerHeight }) : undefined}
      transition={menos ? { duration: 0.35 } : { duration: 0.75, ease: CORTINA }}
      onAnimationComplete={() => sube && setFase('fin')}
    >
      <motion.div
        className="grid h-full place-items-center"
        animate={sube && !menos ? { y: -90, opacity: 0 } : undefined}
        transition={{ duration: 0.5, ease: [0.5, 0, 0.75, 0] }}
      >
        <div className="flex flex-col items-center">
          <LogoAnimado alto="min(15vw, 84px)" retraso={0.1} animar={!menos} />
          <motion.p
            className="etiqueta mt-7 text-madera-oscuro"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: menos ? 0 : 0.85, ease: EXPO }}
          >
            {DEKOG.lema}
          </motion.p>
        </div>
      </motion.div>

      {/* Borde curvo del telón: se estira mientras sube y se recoge al final. */}
      <motion.div
        className="absolute left-[-10%] top-[calc(100%-2px)] h-[18vh] w-[120%] origin-top rounded-b-[50%] bg-hueso"
        initial={{ scaleY: 0 }}
        animate={sube && !menos ? { scaleY: [0, 1, 0.35] } : undefined}
        transition={{ duration: 0.75, times: [0, 0.45, 1], ease: 'easeOut' }}
      />
    </motion.div>
  );
}
