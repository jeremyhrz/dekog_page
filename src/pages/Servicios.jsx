import React from 'react';
import ServiciosSection from '../components/ServiciosSection';

/**
 * Servicios — Página /servicios
 *
 * Usa ServiciosSection.jsx original que contiene:
 *   - Hero "SERVICIOS" con tipografía grande
 *   - Imagen central cinematográfica
 *   - 5 pasos con fotos reales alternadas (diseño, 3D, ejecución, supervisión, mobiliario)
 */
export default function Servicios() {
  return (
    <div className="pt-24">
      <ServiciosSection />
    </div>
  );
}