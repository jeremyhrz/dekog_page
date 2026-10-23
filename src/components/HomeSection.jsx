import React from 'react';
import CintaHome from '../sections/home/CintaHome';
import Categorias from '../sections/home/Categorias';
import LoQueHacemos from '../sections/home/LoQueHacemos';
import Enfoque from '../sections/home/Enfoque';
import Metodologia from '../sections/home/Metodologia';
import Garantia from '../sections/home/Garantia';
import Llamado from '../sections/home/Llamado';

/**
 * HomeSection — el cuerpo de /home (Dekog Home, la línea de muebles), renovado en 2026 con el estilo editorial:
 *   Cinta → Categorías destacadas → Lo que hacemos → Nuestro enfoque → Así trabajamos → Respaldo Dekog → Cierre.
 * Cada sección vive en src/sections/home/ y sus textos en src/sections/home/datos.js. Los enlaces al catálogo van a la
 * portada ya filtrada (/?categoria=…#catalogo, que lee pages/Home.jsx): nada recarga la página.
 */
export default function HomeSection() {
  return (
    <>
      <CintaHome />
      <Categorias />
      <LoQueHacemos />
      <Enfoque />
      <Metodologia />
      <Garantia />
      <Llamado />
    </>
  );
}
