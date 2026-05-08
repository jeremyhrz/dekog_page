import React from 'react';
import { ChevronRight, Armchair, BedDouble, Layers, User, Settings, ShieldCheck, Gem, Shield, CheckCircle2 } from 'lucide-react';

export default function ServiciosSection({ setCategoria }) {
  const handleNavigation = (targetId, cat = 'Todos') => {
    if (setCategoria) setCategoria(cat);
    
    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, null, `#${targetId}`);
      }
    }, 100);
  };

  return (
    <section id="servicios" className="bg-[#f4f0ec] text-[#1a1a1a] font-sans border-t border-gray-200">
      {/* 1. DEKOG HOME Hero for Servicios */}
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div className="order-2 lg:order-1">
          <nav className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-8 flex items-center gap-2">
            Inicio <ChevronRight size={10} /> <span className="text-black">NUESTROS SERVICIOS</span>
          </nav>
          <h2 className="text-6xl md:text-7xl lg:text-8xl font-light tracking-tight mb-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            DEKOG HOME
          </h2>
          <p className="text-sm md:text-base text-gray-500 font-normal mb-10 tracking-widest uppercase">
            mobiliario arquitectónico
          </p>
          <div className="space-y-6 mb-12 max-w-lg">
            <p className="text-lg md:text-xl text-gray-800 leading-snug font-medium">
              Diseñamos y fabricamos <strong>mobiliario arquitectónico a la medida</strong> que se adapta perfectamente a tu espacio.
            </p>
            <p className="text-sm md:text-base text-gray-500 leading-relaxed">
              En DEKOG integramos arquitectura, ejecución y mobiliario en un solo proceso para elevar tu estilo de vida.
            </p>
          </div>
          <a 
            href="https://wa.me/584145847791?text=Hola,%20quisiera%20solicitar%20asesoría%20para%20un%20proyecto"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 bg-[#1a1a1a] text-white px-10 py-5 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition-all duration-300 hover:gap-6 shadow-xl w-fit"
          >
            SOLICITAR ASESORÍA <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
        <div className="order-1 lg:order-2 relative group cursor-pointer" onClick={() => handleNavigation('arquitectura')}>
          <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500 z-10" />
          <img 
            src="/arquitectura/comercial2.jpeg" 
            alt="Proyecto Arquitectónico" 
            className="w-full h-auto object-cover rounded-sm shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]" 
            loading="lazy"
          />
          <div className="absolute -bottom-6 -left-6 bg-[#FDFCFA] p-6 shadow-xl hidden md:block z-20 border border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Visión Integral</p>
            <p className="text-sm font-bold text-black uppercase tracking-widest">Planificación & Arquitectura</p>
          </div>
        </div>
      </div>

      {/* 2. LO QUE HACEMOS - SERVICIOS */}
      <div className="bg-[#f4f0ec] py-24 px-6 border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-gray-400 mb-4">Especialidades</h2>
            <div className="h-px w-20 bg-gray-200 mx-auto mb-6" />
            <h3 className="text-3xl md:text-4xl font-light uppercase tracking-widest">SOLUCIONES INTEGRALES</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 text-center">
            {[
              { icon: Armchair, title: 'MOBILIARIO ARQUITECTÓNICO\nA LA MEDIDA', desc: 'Diseñamos y fabricamos mobiliario arquitectónico a la medida que se adapta perfectamente a tu espacio.', target: 'catalogo', cat: 'Muebles' },
              { icon: BedDouble, title: 'COLCHONES', desc: 'Seleccionamos las mejores piezas para garantizar un descanso premium.', target: 'catalogo', cat: 'Camas' },
              { icon: Layers, title: 'ACABADOS Y\nTEXTURAS', desc: 'Elegimos materiales y acabados de alta calidad que elevan el diseño de tus espacios.', target: 'arquitectura', cat: 'Todos' },
              { icon: User, title: 'ASESORÍA\nPERSONALIZADA', desc: 'Te acompañamos en la elección de cada detalle para crear un espacio único.', target: 'contacto', cat: 'Todos' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center group cursor-pointer" onClick={() => handleNavigation(item.target, item.cat)}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gray-50 mb-8 group-hover:bg-black group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-xl">
                  <item.icon size={32} strokeWidth={1} />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 leading-relaxed whitespace-pre-line">{item.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed px-4 max-w-[240px]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. MAIN SECTION - SERVICIOS (GRID LAYOUT) */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-12 gap-16">
          
          {/* CATEGORÍAS/SERVICIOS (Left Column) */}
          <div className="lg:col-span-8">
            <div className="mb-12">
              <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-gray-400 mb-4">Líneas de Producción</h2>
              <h3 className="text-3xl md:text-4xl font-light uppercase tracking-widest">ÁREAS DE DISEÑO</h3>
              <div className="h-px w-20 bg-gray-800 mt-6" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[
                { title: 'SALA Y COMEDOR', img: '/muebles/estambul.png', count: 'Proyectos a medida', cat: 'Muebles' },
                { title: 'DORMITORIOS', img: '/muebles/aurora.png', count: 'Soluciones de descanso', cat: 'Camas' },
                { title: 'COCINAS', img: '/muebles/milan.png', count: 'Mobiliario técnico', cat: 'Mesas' },
                { title: 'COLCHONES', img: '/muebles/naia.png', count: 'Línea de descanso', cat: 'Camas' }
              ].map(cat => (
                <div key={cat.title} onClick={() => handleNavigation('catalogo', cat.cat)} className="group cursor-pointer relative overflow-hidden bg-[#FDFCFA] shadow-lg">
                  <div className="aspect-[4/5] overflow-hidden">
                    <img 
                      src={cat.img} 
                      alt={cat.title} 
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">{cat.count}</p>
                    <h4 className="text-sm font-bold text-white uppercase tracking-[0.2em]">{cat.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SIDEBAR - SERVICIOS (Right Column) */}
          <div className="lg:col-span-4 space-y-16">
            
            {/* NUESTRO ENFOQUE - SERVICIOS */}
            <div className="bg-[#FDFCFA] p-10 shadow-xl border border-gray-100">
              <div className="mb-10">
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 mb-4">NUESTRO ENFOQUE</p>
                <h3 className="text-2xl font-light tracking-tight leading-tight">diseñamos mobiliario arquitectónico para elevar tu descanso</h3>
              </div>
              
              <div className="space-y-10">
                {[
                  { icon: Settings, title: 'FUNCIONALIDAD', desc: 'Cada pieza cumple un propósito en tu día a día.' },
                  { icon: ShieldCheck, title: 'CALIDAD', desc: 'Trabajamos con materiales duraderos.' },
                  { icon: Gem, title: 'ESTÉTICA', desc: 'Creamos ambientes que transmiten estilo.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 items-start">
                    <div className="bg-gray-50 p-3 rounded-sm">
                      <item.icon size={24} strokeWidth={1} className="text-gray-800" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2">{item.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PROCESO - SERVICIOS */}
            <div className="bg-[#1a1a1a] text-white p-10 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10">
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40 mb-4">METODOLOGÍA</p>
                <h3 className="text-2xl font-light tracking-tight mb-12">Así trabajamos</h3>
                
                <div className="space-y-10">
                  {[
                    { num: '01', title: 'AUDITORÍA DE ESPACIO', desc: 'Analizamos medidas y necesidades reales.' },
                    { num: '02', title: 'DISEÑO TÉCNICO', desc: 'Planos y visualización 3D.' },
                    { num: '03', title: 'FABRICACIÓN', desc: 'Producción con altos estándares.' },
                    { num: '04', title: 'ENTREGA', desc: 'Instalación y montaje final.' }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-6 items-center group/step">
                      <span className="text-2xl font-light text-white/20 group-hover/step:text-white transition-colors duration-500">{step.num}</span>
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1">{step.title}</h4>
                        <p className="text-[11px] text-white/40 group-hover/step:text-step transition-colors">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
