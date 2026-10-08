import React from 'react';
import { ChevronRight, Compass, Box, FileText, HardHat, ClipboardCheck, CheckCircle2, Users, Handshake, Award, Search, PenTool, CalendarClock, Hammer, PackageCheck, ShieldCheck } from 'lucide-react';
import Imagen from './Imagen';

export default function ArquitecturaSection() {
  const servicios = [
    {
      icon: Compass,
      title: 'DISEÑO\nARQUITECTÓNICO',
      desc: 'Desarrollamos propuestas creativas y funcionales adaptadas a tus necesidades.'
    },
    {
      icon: Box,
      title: 'MODELADO 3D Y\nVISUALIZACIÓN',
      desc: 'Creamos imágenes realistas para que visualices tu proyecto antes de construir.'
    },
    {
      icon: FileText,
      title: 'PLANOS Y\nDOCUMENTACIÓN',
      desc: 'Elaboramos planos técnicos detallados y documentos necesarios para la ejecución.'
    },
    {
      icon: HardHat,
      title: 'EJECUCIÓN\nDE OBRA',
      desc: 'Construimos tu proyecto con materiales de calidad y mano de obra especializada.'
    },
    {
      icon: ClipboardCheck,
      title: 'SUPERVISIÓN Y\nCONTROL',
      desc: 'Supervisamos cada etapa para asegurar el cumplimiento del diseño, tiempo y presupuesto.'
    },
    {
      icon: CheckCircle2,
      title: 'ENTREGA\nFINAL',
      desc: 'Entregamos tu obra lista para ser disfrutada, con cada detalle cuidado.'
    }
  ];

  const proyectos = [
    { title: 'RESIDENCIAL', img: '/arquitectura/residencial.jpeg' },
    { title: 'COMERCIAL', img: '/arquitectura/comercial2.jpeg' },
    { title: 'OFICINAS', img: '/arquitectura/oficina.jpeg' },
    { title: 'REMODELACIONES', img: '/arquitectura/interiorismo.jpeg' },
    { title: 'INTERIORISMO\nARQUITECTÓNICO', img: '/arquitectura/comercial.jpeg' },
  ];

  const enfoqueItems = [
    {
      icon: Search,
      title: 'PLANIFICACIÓN INTELIGENTE',
      desc: 'Analizamos cada detalle para crear estrategias eficientes y realistas.'
    },
    {
      icon: PenTool,
      title: 'DISEÑO FUNCIONAL Y ESTÉTICO',
      desc: 'Combinamos creatividad y técnica para diseñar espacios únicos.'
    },
    {
      icon: ShieldCheck,
      title: 'EJECUCIÓN CON CALIDAD',
      desc: 'Trabajamos con estándares altos y proveedores de confianza.'
    }
  ];

  const procesoSteps = [
    { num: '01', title: 'ESCUCHAMOS', desc: 'Entendemos tus necesidades, ideas y objetivos.' },
    { num: '02', title: 'DISEÑAMOS', desc: 'Desarrollamos la propuesta arquitectónica y visualizamos tu proyecto.' },
    { num: '03', title: 'PLANIFICAMOS', desc: 'Definimos tiempos, costos y recursos para una ejecución eficiente.' },
    { num: '04', title: 'CONSTRUIMOS', desc: 'Ejecutamos la obra con calidad y supervisión constante.' },
    { num: '05', title: 'ENTREGAMOS', desc: 'Culminamos tu proyecto y lo entregamos listo para vivir o trabajar.' }
  ];

  return (
    <section id="arquitectura" className="bg-[#f4f0ec] text-[#1a1a1a]">
      {/* 1. HERO */}
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-6 flex items-center gap-2">
            Inicio <ChevronRight size={12} /> <span className="text-black">DEKOG ARQUITECTURA</span>
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight mb-8" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            DEKOG<br />ARQUITECTURA
          </h1>
          <p className="text-base md:text-lg text-gray-800 leading-relaxed mb-4">
            Diseñamos, planificamos y construimos{' '}
            <strong>espacios funcionales, estéticos y duraderos.</strong>
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-10 max-w-md">
            Acompañamos cada proyecto desde la idea inicial hasta la entrega final, con transparencia, calidad y compromiso.
          </p>
          <a href="#contacto" className="inline-block bg-[#1a1a1a] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors">
            CONOCE MÁS
          </a>
        </div>
        <div>
          {/* Lo más grande de la página (LCP): no espera a estar a la vista. */}
          <Imagen
            src="/arquitectura/principal.jpeg"
            sizes="(min-width: 1024px) 50vw, 100vw"
            width={3840}
            height={2160}
            prioridad
            alt="Dekog Arquitectura - Proyecto Principal"
            className="w-full h-auto object-cover rounded-sm shadow-xl"
          />
        </div>
      </div>

      {/* 2. NUESTRO SERVICIO INTEGRAL */}
      <div className="py-20 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xl md:text-2xl font-light tracking-[0.2em] uppercase relative inline-block pb-4 after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-16 after:h-px after:bg-gray-400">
              NUESTRO SERVICIO INTEGRAL
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 text-center">
            {servicios.map((s, i) => (
              <div key={i} className="flex flex-col items-center group">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-5 group-hover:bg-black group-hover:text-white transition-all duration-300 border border-gray-100">
                  <s.icon size={28} strokeWidth={1.2} />
                </div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 whitespace-pre-line leading-relaxed">
                  {s.title}
                </h3>
                <p className="text-[11px] text-gray-500 leading-relaxed px-2">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. TIPOS DE PROYECTOS */}
      <div className="py-20 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xl md:text-2xl font-light tracking-[0.2em] uppercase relative inline-block pb-4 after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-16 after:h-px after:bg-gray-400">
              TIPOS DE PROYECTOS
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {proyectos.map((p, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-[3/4] overflow-hidden rounded-sm shadow-md mb-4 relative">
                  <Imagen
                    src={p.img}
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                    alt={p.title.replace('\n', ' ')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                </div>
                <h3 className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-800 group-hover:text-black transition-colors whitespace-pre-line leading-relaxed">
                  {p.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. CTA BANNER */}
      <div className="bg-[#1a1a1a] py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-light text-white tracking-tight mb-3" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              ¿Listo para construir tu proyecto?
            </h2>
            <p className="text-sm text-gray-400 mb-6">Hagamos realidad tu espacio ideal.</p>
            <a
              href="https://wa.me/584244006086?text=Hola,%20quiero%20cotizar%20un%20proyecto%20de%20arquitectura"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-white text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300"
            >
              COTIZA TU PROYECTO
            </a>
          </div>
          <div className="grid grid-cols-3 gap-8">
            {[
              { icon: Users, title: 'ATENCIÓN\nPERSONALIZADA' },
              { icon: Handshake, title: 'COMPROMISO\nY TRANSPARENCIA' },
              { icon: Award, title: 'CALIDAD EN CADA\nDETALLE' },
            ].map((v, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <v.icon size={32} strokeWidth={1} className="text-white/80 mb-3" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/80 whitespace-pre-line leading-relaxed">
                  {v.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. NUESTRO ENFOQUE */}
      <div className="py-24 px-6 bg-[#f4f0ec]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <Imagen
              src="/arquitectura/residencial.jpeg"
              sizes="(min-width: 768px) 50vw, 100vw"
              width={3840}
              height={2160}
              alt="Proyecto Residencial Dekog"
              className="w-full h-auto object-cover rounded-sm shadow-xl"
              loading="lazy"
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-4">NUESTRO ENFOQUE</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight text-black mb-12" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Construimos confianza,<br />entregamos resultados
            </h2>
            <div className="space-y-10">
              {enfoqueItems.map((item, i) => (
                <div key={i} className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon size={18} strokeWidth={1.5} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-2 text-black">{item.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. NUESTRO PROCESO - Así trabajamos */}
      <div className="bg-[#2a2a2a] py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-4">NUESTRO PROCESO</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-16 italic" style={{ fontFamily: 'Georgia, serif' }}>
              Así trabajamos
            </h2>

            <div className="relative border-l border-gray-600 ml-5 space-y-10 pb-4">
              {procesoSteps.map((step, i) => (
                <div key={i} className="relative pl-12">
                  <span className="absolute -left-5 top-0 bg-[#2a2a2a] text-gray-400 border border-gray-600 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold">
                    {step.num}
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-2 text-white">{step.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:block">
            <Imagen
              src="/arquitectura/interiorismo.jpeg"
              sizes="50vw"
              alt="Interiorismo Dekog"
              className="w-full h-full object-cover rounded-sm shadow-xl min-h-[500px]"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
