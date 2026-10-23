import React from 'react';
import SobreNosotros from '../sections/nosotros/SobreNosotros';
import Historia from '../sections/nosotros/Historia';
import Valores from '../sections/nosotros/Valores';

/**
 * El cuerpo de /nosotros (renovación de 2026): quiénes somos y las cifras, cómo nace Dekog y sus valores. La cabecera
 * y el cierre los pone pages/NosotrosPage.jsx; cada sección vive en src/sections/nosotros/.
 */
export default function Nosotros() {
  return (
    <>
      <SobreNosotros />
      <Historia />
      <Valores />
    </>
  );
}
