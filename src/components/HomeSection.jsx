import { ChevronRight, Armchair, Lamp, Layers, User, Settings, ShieldCheck, Gem, Shield, Clock, CheckCircle2 } from 'lucide-react';
import { productos } from '../data/productos';

export default function HomeSection({ setCategoria }) {
  const handleNavigation = (targetId, cat = 'Todos') => {
    if (setCategoria) setCategoria(cat);
    
    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        // Usar replaceState en lugar de pushState para no afectar la navegación de React Router
        window.history.replaceState(null, null, window.location.pathname + `#${targetId}`);
      }
    }, 100);
  };

  return (
    <section id="home" className="bg-[#f4f0ec] text-[#1a1a1a] font-sans">
      {/* 1. DEKOG HOME Hero */}
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div className="order-2 lg:order-1">
          <nav className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-8 flex items-center gap-2">
            Inicio <ChevronRight size={10} /> <span className="text-black">DEKOG HOME</span>
          </nav>
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-light tracking-tight mb-4" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            DEKOG HOME
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 font-light italic mb-10 tracking-wide">
            Mobiliario arquitectónico
          </p>
          <div className="space-y-6 mb-12 max-w-lg">
            <p className="text-lg md:text-xl text-gray-800 leading-snug font-medium">
              Mobiliario, decoración y acabados que complementan cada espacio y lo convierten en un hogar.
            </p>
            <p className="text-sm md:text-base text-gray-500 leading-relaxed">
              Seleccionamos cada pieza pensando en diseño, funcionalidad y calidad, para que tu espacio refleje tu estilo de vida.
            </p>
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-black/5 rounded-full border border-black/10">
              <ShieldCheck size={18} className="text-black" />
              <span className="text-xs font-bold uppercase tracking-widest text-black">Garantía estructural de 2 años</span>
            </div>
          </div>
          <button 
            onClick={() => handleNavigation('catalogo', 'Todos')}
            className="group flex items-center gap-4 bg-[#1a1a1a] text-white px-10 py-5 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition-all duration-300 hover:gap-6 shadow-xl"
          >
            CONOCE MÁS <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <div className="order-1 lg:order-2 relative group cursor-pointer" onClick={() => handleNavigation('catalogo', 'Sofás')}>
          <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500 z-10" />
          <img 
            src="/catalogo/dubai.png" 
            alt="Dekog Home Sofa" 
            className="w-full h-auto object-cover rounded-sm shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]" 
          />
          <div className="absolute -bottom-6 -left-6 bg-[#FDFCFA] p-6 shadow-xl hidden md:block z-20 border border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Modelo Destacado</p>
            <p className="text-sm font-bold text-black uppercase tracking-widest">Sofá Dubai — Colección 2026</p>
          </div>
        </div>
      </div>

      {/* 2. LO QUE HACEMOS */}
      <div className="bg-[#f4f0ec] py-24 px-6 border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-gray-400 mb-4">Servicios Especializados</h2>
            <div className="h-px w-20 bg-gray-200 mx-auto mb-6" />
            <h3 className="text-3xl md:text-4xl font-light uppercase tracking-widest">LO QUE HACEMOS</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 text-center">
            {[
              { icon: Armchair, title: 'MOBILIARIO\nA MEDIDA', desc: 'Diseñamos y fabricamos muebles personalizados que se adaptan perfectamente a tu espacio.', target: 'catalogo', cat: 'Sofás' },
              { icon: Lamp, title: 'DECORACIÓN', desc: 'Seleccionamos piezas decorativas que aportan estilo, personalidad y armonía a cada ambiente.', target: 'catalogo', cat: 'Mesas' },
              { icon: Layers, title: 'ACABADOS Y\nTEXTURAS', desc: 'Elegimos materiales y acabados de alta calidad que elevan el diseño de tus espacios.', target: 'arquitectura', cat: 'Todos' },
              { icon: User, title: 'ASESORÍA\nPERSONALIZADA', desc: 'Te acompañamos en la elección de cada detalle para crear un espacio único y funcional.', target: 'contacto', cat: 'Todos' }
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

      {/* 3. MAIN SECTION (GRID LAYOUT) */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-12 gap-16">
          
          {/* CATEGORÍAS (Left Column) */}
          <div className="lg:col-span-8">
            <div className="mb-12">
              <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-gray-400 mb-4">Explora nuestra selección</h2>
              <h3 className="text-3xl md:text-4xl font-light uppercase tracking-widest">CATEGORÍAS DESTACADAS</h3>
              <div className="h-px w-20 bg-gray-800 mt-6" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                { title: 'SOFÁS', img: '/catalogo/qatar.png', count: `${productos.filter(p => p.categoria === 'Sofás').length} Modelos`, cat: 'Sofás' },
                { title: 'CAMAS', img: '/catalogo/berna.png', count: `${productos.filter(p => p.categoria === 'Camas').length} Diseños`, cat: 'Camas' },
                { title: 'MESAS', img: '/mesas/luxemburgo.png', count: `${productos.filter(p => p.categoria === 'Mesas').length} Modelos`, cat: 'Mesas' }
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

          {/* SIDEBAR (Right Column) */}
          <div className="lg:col-span-4 space-y-16">
            
            {/* NUESTRO ENFOQUE */}
            <div className="bg-[#FDFCFA] p-10 shadow-xl border border-gray-100">
              <div className="mb-10">
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 mb-4">NUESTRO ENFOQUE</p>
                <h3 className="text-2xl font-light tracking-tight leading-tight">Diseñamos experiencias para vivir mejor</h3>
              </div>
              
              <div className="space-y-10">
                {[
                  { icon: Settings, title: 'FUNCIONALIDAD', desc: 'Cada pieza cumple un propósito en tu día a día.' },
                  { icon: ShieldCheck, title: 'CALIDAD', desc: 'Trabajamos con materiales duraderos y procesos cuidadosos.' },
                  { icon: Gem, title: 'ESTÉTICA', desc: 'Creamos ambientes que transmiten estilo y bienestar.' }
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
              
              <div className="mt-12 pt-10 border-t border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <Shield size={24} className="text-black" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Respaldo Dekog</span>
                </div>
                <p className="text-xs text-gray-500 italic">"Garantía estructural de 2 años en todas nuestras piezas mobiliarias."</p>
              </div>
            </div>

            {/* PROCESO */}
            <div className="bg-[#1a1a1a] text-white p-10 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10">
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40 mb-4">METODOLOGÍA</p>
                <h3 className="text-2xl font-light tracking-tight mb-12">Así trabajamos</h3>
                
                <div className="space-y-10">
                  {[
                    { num: '01', title: 'CONOCEMOS TU ESPACIO', desc: 'Escuchamos tus necesidades y estilo de vida.' },
                    { num: '02', title: 'DISEÑAMOS CONTIGO', desc: 'Propuestas de mobiliario y materiales.' },
                    { num: '03', title: 'SELECCIONAMOS', desc: 'Elegimos cada pieza por su calidad.' },
                    { num: '04', title: 'TRANSFORMAMOS', desc: 'Hacemos realidad tu espacio ideal.' }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-6 items-center group/step">
                      <span className="text-2xl font-light text-white/20 group-hover/step:text-white transition-colors duration-500">{step.num}</span>
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1">{step.title}</h4>
                        <p className="text-[11px] text-white/40 group-hover/step:text-white/60 transition-colors">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => handleNavigation('contacto', 'Todos')}
                  className="mt-12 w-full py-4 border border-white/20 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-500"
                >
                  EMPEZAR PROYECTO
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* FINAL CALL TO ACTION */}
      <div className="bg-[#f4f0ec] py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#eae6e1] rounded-full mb-8">
            <CheckCircle2 size={32} strokeWidth={1} className="text-gray-800" />
          </div>
          <h3 className="text-4xl md:text-5xl font-light tracking-tight mb-8">¿Listo para transformar tu hogar?</h3>
          <p className="text-gray-500 mb-12 max-w-lg mx-auto">
            Explora nuestro catálogo completo y encuentra la pieza perfecta con la garantía y calidad que solo Dekog puede ofrecer.
          </p>
          <button 
            onClick={() => handleNavigation('catalogo', 'Todos')}
            className="bg-black text-white px-12 py-5 text-xs font-bold uppercase tracking-[0.3em] hover:scale-105 transition-transform shadow-2xl"
          >
            VER CATÁLOGO COMPLETO
          </button>
        </div>
      </div>
    </section>
  );
}
