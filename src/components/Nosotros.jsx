import React from 'react';
import { FileText, GitMerge, CheckCircle, Eye, User, Handshake, Mail } from 'lucide-react';

export default function Nosotros() {
  return (
    <section id="nosotros" className="py-24 px-6 bg-[#f4f0ec]">
      {/* First Block - Image 1 */}
      <div className="max-w-6xl mx-auto mb-32">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center mb-16">
          <div className="order-2 md:order-1">
            <p className="text-[10px] uppercase tracking-[0.3em] font-semibold mb-4 text-gray-500">
              SOMOS DEKOG
            </p>
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-8 text-[#1a1a1a]" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
              Sobre nosotros
            </h2>
            <div className="space-y-6 text-sm text-[#4a4a4a] leading-relaxed max-w-md">
              <p>
                Somos un equipo de arquitectos, ingenieros y diseñadores apasionados por transformar espacios y mejorar la vida de las personas.
              </p>
              <p>
                Integramos diseño, construcción y mobiliario en un solo proceso, acompañándote desde <strong>la idea inicial hasta el último detalle.</strong>
              </p>
              <p>
                Nos involucramos en cada etapa para hacer realidad espacios funcionales, estéticos y hechos para ti.
              </p>
            </div>

            <a 
              href="mailto:dekog.inf@gmail.com?subject=Postulaci%C3%B3n%20CV"
              className="inline-flex items-center gap-3 mt-8 border-2 border-[#1a1a1a] text-[#1a1a1a] px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#1a1a1a] hover:text-white transition-all duration-300"
            >
              <Mail size={16} /> Únete a nuestro equipo
            </a>
          </div>
          <div className="order-1 md:order-2">
            <img src="/nosotros/PRINCIPAL.jpeg" alt="Equipo Dekog" className="w-full h-auto shadow-2xl object-cover rounded-sm" loading="lazy" />
          </div>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-t border-gray-300">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <FileText size={36} className="text-[#333]" strokeWidth={1} />
            <div>
              <p className="text-lg font-bold text-[#1a1a1a] leading-tight">+120</p>
              <p className="text-xs text-[#4a4a4a] leading-snug">Proyectos<br/>realizados</p>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <GitMerge size={36} className="text-[#333]" strokeWidth={1} />
            <div>
              <p className="text-lg font-bold text-[#1a1a1a] leading-tight">2</p>
              <p className="text-xs text-[#4a4a4a] leading-snug">Líneas de servicio<br/>Arquitectura + Home</p>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <CheckCircle size={36} className="text-[#333]" strokeWidth={1} />
            <div>
              <p className="text-lg font-bold text-[#1a1a1a] leading-tight">100%</p>
              <p className="text-xs text-[#4a4a4a] leading-snug">Acompañamiento<br/>de inicio a fin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Second Block - Image 2 */}
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-8 text-[#1a1a1a]" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
          Nuestra historia
        </h2>
        <p className="text-sm text-[#4a4a4a] leading-relaxed mb-12 max-w-2xl mx-auto">
          DEKOG nace de la pasión por el diseño y la arquitectura, con el propósito de ofrecer un servicio integral que combine creatividad, funcionalidad y calidad.
        </p>
        
        <img src="/nosotros/SECUNDARIA NOSOTROS.PNG" alt="Diseño Interior Dekog" className="w-full h-auto mb-12 shadow-xl rounded-sm" loading="lazy" />

        <p className="text-sm text-[#4a4a4a] leading-relaxed mb-16 max-w-xl mx-auto">
          Creamos un modelo de trabajo donde el cliente no tiene que preocuparse por coordinar distintos proveedores. Nosotros nos encargamos de todo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
          <div className="flex flex-col items-center text-center gap-4">
            <Eye size={48} className="text-[#333]" strokeWidth={1} />
            <p className="text-sm font-semibold text-[#1a1a1a]">Visión integral</p>
          </div>
          <div className="flex flex-col items-center text-center gap-4">
            <User size={48} className="text-[#333]" strokeWidth={1} />
            <p className="text-sm font-semibold text-[#1a1a1a]">Atención<br/>personalizada</p>
          </div>
          <div className="flex flex-col items-center text-center gap-4">
            <Handshake size={48} className="text-[#333]" strokeWidth={1} />
            <p className="text-sm font-semibold text-[#1a1a1a]">Compromiso y<br/>transparencia</p>
          </div>
        </div>
      </div>
    </section>
  );
}
