import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import Nosotros from '../components/Nosotros';

/**
 * NosotrosPage — /nosotros
 * Wrappea el componente Nosotros.jsx existente
 * y le añade un hero de cabecera + CTA final.
 */
export default function NosotrosPage() {
  return (
    <div className="pt-24">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src="/nosotros/PRINCIPAL.jpeg"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-6xl mx-auto text-center z-10">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-4">
            SOMOS DEKOG
          </p>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6">
            Nosotros
          </h1>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Un equipo de arquitectos, ingenieros y diseñadores apasionados por
            transformar espacios y mejorar la vida de las personas.
          </p>
        </div>
      </section>

      {/* ── Contenido original del componente Nosotros ───────────────── */}
      <Nosotros />

      {/* ── CTA Final ────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-6">
            ¿Listo para trabajar juntos?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Cuéntanos sobre tu proyecto y descubre cómo podemos transformar tu espacio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:dekog.inf@gmail.com?subject=Postulación%20CV"
              className="border border-white/30 text-white px-12 py-4 text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
            >
              <Mail size={16} /> Únete al equipo
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
