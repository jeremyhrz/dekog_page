import React from 'react';
import ArquitecturaSection from '../components/ArquitecturaSection';

/**
 * Arquitectura — Página /arquitectura
 *
 * Usa íntegramente ArquitecturaSection.jsx que contiene:
 *   - Hero con imagen principal + descripción
 *   - Servicio Integral (6 íconos: diseño, 3D, planos, ejecución, supervisión, entrega)
 *   - Tipos de Proyectos (galería con renders: Residencial, Comercial, Oficinas, etc.)
 *   - CTA Banner oscuro con valorres
 *   - Nuestro Enfoque (imagen + 3 pilares)
 *   - Proceso "Así trabajamos" (timeline 01-05 sobre fondo oscuro)
 *
 * El pt-24 compensa la Navbar fija (h ≈ 80px).
 */
export default function Arquitectura() {
  return (
    <div className="pt-24">
      <ArquitecturaSection />
    </div>
  );
}