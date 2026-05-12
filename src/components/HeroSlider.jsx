import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export default function HeroSlider({ slides, onAddToCart, setCategoria }) {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      goNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [current]);

  const goNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsAnimating(false), 700);
  };

  const goPrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
    setTimeout(() => setIsAnimating(false), 700);
  };

  const handleVerCatalogo = (nombre) => {
    let cat = 'Todos';
    let targetId = 'catalogo';

    // Logic based on slide name
    if (nombre.includes('MOBILIARIO')) {
      cat = 'Sofás';
    } else if (nombre.includes('DESCANSAR') || nombre.includes('INTERIORISMO')) {
      cat = 'Camas';
    } else if (nombre === 'PROYECTOS' || nombre === 'DEKOG') {
      // Si es Proyectos o Dekog (Planos), lo mandamos a la página de Proyectos real
      window.location.href = '/proyectos';
      return;
    }

    // Apply category filter if it's a catalog target
    if (setCategoria) setCategoria(cat);

    // Reliable scrolling to catalog
    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, null, `#${targetId}`);
      }
    }, 100);
  };

  const slide = slides[current];

  return (
    <section id="hero" className="relative w-full h-[85vh] md:h-[90vh] bg-black overflow-hidden">
      {/* Background slides */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent z-10" />
          <img
            src={s.imagen}
            alt={s.nombre}
            className="w-full h-full object-cover object-center"
            style={{ transform: i === current ? 'scale(1.05)' : 'scale(1)', transition: 'transform 8s ease-out' }}
          />
        </div>
      ))}
      {/* Content overlay */}
      <div className="absolute inset-0 z-20 flex items-center">
        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
          <div key={current} className="max-w-xl md:max-w-2xl lg:max-w-3xl">
            <p className="text-white/60 text-[10px] md:text-xs uppercase tracking-[0.4em] mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
            </p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-up leading-[1.1] tracking-tight" style={{ animationDelay: '0.2s', opacity: 0 }}>
              {slide.nombre}
            </h2>
            <p className="text-white/80 text-sm md:text-lg lg:text-xl font-light tracking-wide mb-8 max-w-xl animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.3s', opacity: 0 }}>
              {slide.desc}
            </p>
            {slide.precio && (
              <p className="text-white text-xl md:text-3xl font-bold mb-8 animate-fade-in-up" style={{ animationDelay: '0.35s', opacity: 0 }}>
                <span className="font-light mr-2 text-[0.8em]">REF</span>{slide.precio}
              </p>
            )}
            <div className={`flex flex-col sm:flex-row gap-4 animate-fade-in-up ${!slide.precio ? 'mt-8' : ''}`} style={{ animationDelay: '0.4s', opacity: 0 }}>
              {slide.isProduct !== false ? (
                <button
                  onClick={() => onAddToCart(slide)}
                  className="btn-primary bg-white text-black px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-gray-100 w-full sm:w-auto text-center shadow-lg"
                >
                  Añadir al Carrito
                </button>
              ) : (
                <a
                  href={`https://wa.me/584145847791?text=Hola, quiero más información sobre ${slide.nombre}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn-primary flex items-center justify-center bg-white text-black px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-gray-100 w-full sm:w-auto shadow-lg"
                >
                  Consultar Proyecto
                </a>
              )}
              <button
                onClick={() => handleVerCatalogo(slide.nombre)}
                className="btn-primary border border-white/40 text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-white/10 w-full sm:w-auto text-center"
              >
                {(slide.nombre === 'PROYECTOS' || slide.nombre === 'DEKOG') ? 'Ver Proyecto' : 'Ver Catálogo'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de Scroll — Diseño Ultra-Premium & Luminoso */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center group cursor-pointer"
        onClick={() => {
          const el = document.getElementById('catalogo');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        {/* Flecha Chevron animada - Sutil pero visible */}
        <div className="mb-2 transition-all duration-500 group-hover:translate-y-1">
          <ChevronDown size={24} className="text-white/60 group-hover:text-white drop-shadow-md transition-all" strokeWidth={1.5} />
        </div>

        {/* Línea de scroll vertical estilizada */}
        <div className="relative w-[1px] h-12 bg-white/20 overflow-hidden rounded-full">
          <div className="absolute top-0 left-0 w-full h-full bg-white animate-scroll-down" />
        </div>
        
        {/* Etiqueta minimalista */}
        <div className="mt-4">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.5em] font-bold group-hover:text-white transition-all duration-700 ease-out">
            Catálogo
          </span>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goPrev}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full transition-all hidden md:flex"
        aria-label="Anterior"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={goNext}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full transition-all hidden md:flex"
        aria-label="Siguiente"
      >
        <ChevronRight size={24} />
      </button>

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-8 md:w-12 h-1 transition-all duration-500 ${i === current ? 'bg-white' : 'bg-white/20'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
