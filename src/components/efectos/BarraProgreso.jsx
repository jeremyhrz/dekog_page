import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

/** Hilo madera de progreso de lectura, arriba del todo (sobre la navegación). */
export default function BarraProgreso() {
  const { scrollYProgress } = useScroll();
  const escala = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 top-0 z-progreso h-[2px] origin-left bg-madera"
      style={{ scaleX: escala }}
    />
  );
}
