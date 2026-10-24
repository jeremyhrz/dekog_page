import React from 'react';
import ProjectsSection from '../components/ProjectsSection';

/**
 * Proyectos — Página /proyectos
 *
 * Usa ProjectsSection.jsx original que tiene:
 *   - Galería modal de proyectos reales con imágenes
 *   - Categorías: Residencial, Comercial, Remodelaciones, Interiores
 *   - Modal con carrusel de fotos por proyecto
 */
export default function Proyectos() {
  return (
    <div className="pt-24">
      <ProjectsSection />
    </div>
  );
}