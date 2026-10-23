import React from 'react';
import Cinta from '../../components/efectos/Cinta';
import { MarcaD } from '../../components/marca/Logo';
import { BENEFICIOS, RUBROS } from '../../data/sitio';

/**
 * Cinta: banda noche con dos marquesinas que corren en sentidos opuestos. La de arriba, en Bodoni enorme alternando
 * redonda y cursiva (como un titular de revista), entre dos filetes. La de abajo es una cinta madera con los rubros,
 * inclinada al revés: las dos se cruzan como unas tijeras. Se aceleran y se sesgan con la velocidad del scroll.
 */
export default function CintaDekog() {
  return (
    <section aria-label="Lo que hacemos" className="relative isolate overflow-hidden bg-noche pb-16 pt-12 text-hueso md:pb-16 md:pt-16">
      <div className="relative z-10 -mx-[8%] -rotate-[2.5deg] border-y border-hueso/15 bg-noche md:-rotate-[1.2deg]">
        <Cinta
          elementos={BENEFICIOS}
          velocidad={2.2}
          direccion={-1}
          className="py-4 font-display text-[2.35rem] leading-[1.15] tracking-[-0.01em] md:py-6 md:text-[4.75rem] [&_span:nth-child(4n+3)]:italic [&_span:nth-child(4n+3)]:text-madera-claro"
          claseSeparador="text-[0.42em] text-madera"
        />
      </div>

      <div className="relative z-0 -mx-[8%] mt-3 rotate-[4deg] bg-madera text-noche md:mt-7 md:rotate-[2deg]">
        <Cinta
          elementos={RUBROS}
          velocidad={3}
          direccion={1}
          separador={<MarcaD className="inline-block h-[1.15em] w-[1.15em] align-middle" />}
          className="etiqueta py-3 !text-[0.78rem] !tracking-[0.26em] md:py-4 md:!text-[0.95rem]"
          claseSeparador="!px-[1.1em] text-noche"
        />
      </div>
    </section>
  );
}
