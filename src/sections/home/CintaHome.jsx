import React from 'react';
import Cinta from '../../components/efectos/Cinta';

const PIEZAS = ['Camas', 'Sofás', 'Puffs', 'Mesas', 'Decoración', 'Acabados y texturas', 'Hecho a la medida'];

/**
 * Cinta de /home: una marquesina en Bodoni entre dos filetes, con las piezas y los servicios de Dekog Home (redonda y
 * cursiva madera, como un titular de revista). Se acelera con el scroll y queda quieta con «reducir movimiento».
 */
export default function CintaHome() {
  return (
    <section aria-label="Lo que encuentras en Dekog Home" className="relative overflow-hidden border-y border-tinta/10 bg-hueso">
      <Cinta
        elementos={PIEZAS}
        velocidad={2}
        className="py-4 font-display text-[2.1rem] leading-[1.15] tracking-[-0.01em] text-tinta md:py-6 md:text-[3.75rem] [&_span:nth-child(4n+3)]:italic [&_span:nth-child(4n+3)]:text-madera-titulo"
        claseSeparador="text-[0.42em] text-madera"
      />
    </section>
  );
}
