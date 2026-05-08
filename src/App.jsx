import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, ShieldCheck, CreditCard, Truck, Star, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { productos, heroSlides, categorias } from './data/productos';
import Navbar from './components/Navbar';
import HeroSlider from './components/HeroSlider';
import Cart from './components/Cart';
import ProductCard from './components/ProductCard';
import QuickView from './components/QuickView';
import Footer from './components/Footer';
import Nosotros from './components/Nosotros';
import HomeSection from './components/HomeSection';
import ArquitecturaSection from './components/ArquitecturaSection';
import ServiciosSection from './components/ServiciosSection';
import ProjectsSection from './components/ProjectsSection';

export default function App() {
  const [categoria, setCategoria] = useState('Todos');
  const [carrito, setCarrito] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const catalogRef = useRef(null);

  const add = (p) => {
    const existe = carrito.find(x => x.id === p.id);
    if (existe) {
      setCarrito(carrito.map(x => x.id === p.id ? { ...x, cant: x.cant + 1 } : x));
    } else {
      setCarrito([...carrito, { ...p, cant: 1 }]);
    }
  };

  let filtrados = productos;
  if (categoria !== 'Todos') {
    if (['Camas Clásicas', 'Camas Alta Gama', 'Camas Kids'].includes(categoria)) {
      filtrados = productos.filter(p => p.subcategoria === categoria);
    } else {
      filtrados = productos.filter(p => p.categoria === categoria);
    }
  }
  
  if (searchQuery) {
    filtrados = productos.filter(p =>
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.subcategoria && p.subcategoria.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  const isCamasCategory = categoria === 'Camas' || ['Camas Clásicas', 'Camas Alta Gama', 'Camas Kids'].includes(categoria);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCategoria('Todos');
    setVisibleCount(12);
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCategoryClick = (cat) => {
    setCategoria(cat);
    setSearchQuery('');
    setVisibleCount(12);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCategoria('Todos');
  };

  // Intersection observer for reveal animations
  useEffect(() => {
    const observe = () => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
      return observer;
    };

    const obs = observe();
    // Re-check after a small delay to catch dynamically loaded content
    const timeout = setTimeout(observe, 500);

    return () => {
      obs.disconnect();
      clearTimeout(timeout);
    };
  }, [filtrados, visibleCount]);

  return (
    <div className="bg-[#f4f0ec] min-h-screen text-gray-900 overflow-x-hidden">
      {/* WhatsApp Float */}
      <a href="https://wa.me/584145847791?text=Hola,%20tengo%20una%20consulta%20sobre%20sus%20muebles."
        target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 hover:shadow-green-500/30 transition-all duration-300 group"
        aria-label="WhatsApp"
      >
        <MessageCircle size={26} />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-black text-xs font-bold py-2 px-4 rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          ¿Necesitas ayuda?
        </span>
      </a>

      {/* Navbar */}
      <Navbar
        cartCount={carrito.length}
        onCartOpen={() => setAbierto(true)}
        onSearch={handleSearch}
        onCategoryClick={handleCategoryClick}
      />

      {/* Hero Slider */}
      <HeroSlider slides={heroSlides} onAddToCart={add} setCategoria={setCategoria} />



      {/* Trust Bar */}
      <section className="py-16 px-6 border-b reveal">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: ShieldCheck, title: '100% Seguro', sub: 'Compra protegida' },
            { icon: CreditCard, title: 'Pagos Fáciles', sub: 'Múltiples métodos' },
            { icon: Truck, title: 'Envío Nacional', sub: 'A toda Venezuela' },
            { icon: Star, title: 'Calidad Top', sub: 'Materiales premium' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-3 text-center group">
              <div className="w-14 h-14 rounded-2xl bg-[#eae6e1] flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-300">
                <item.icon size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest">{item.title}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 px-6 reveal">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-3">Explora por categoría</p>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight font-display">Nuestras Colecciones</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categorias.map((cat) => (
              <button
                key={cat.nombre}
                onClick={() => { handleCategoryClick(cat.nombre); catalogRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                className="category-card relative h-80 rounded-2xl overflow-hidden group text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                <img src={cat.imagen} alt={cat.nombre} className="category-image absolute inset-0 w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
                  <h3 className="text-white text-2xl font-black uppercase tracking-tight">{cat.nombre}</h3>
                  <p className="text-white/60 text-xs mt-1">{cat.count}+ diseños exclusivos</p>
                  <div className="flex items-center gap-1 mt-3 text-white text-xs font-semibold">
                    <span className="uppercase tracking-widest text-[10px]">Explorar</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section id="catalogo" ref={catalogRef} className="py-20 px-6 bg-[#f4f0ec]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-3">Catálogo Completo</p>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight font-display">
              {searchQuery ? `Resultados: "${searchQuery}"` : 'Nuestras Piezas'}
            </h2>
          </div>

          {/* Filters */}
          <div className="flex flex-col items-center gap-4 mb-12">
            <div className="flex flex-wrap justify-center gap-2">
              {['Todos', 'Muebles', 'Camas', 'Mesas'].map(c => (
                <button key={c} onClick={() => handleCategoryClick(c)}
                  className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                    (categoria === c || (c === 'Camas' && isCamasCategory)) && !searchQuery
                      ? 'bg-black text-white shadow-lg shadow-black/20 scale-105'
                      : 'bg-[#FDFCFA] text-gray-400 hover:bg-[#eae6e1] border border-gray-200'
                    }`}>
                  {c}
                </button>
              ))}
              {searchQuery && (
                <button onClick={handleClearSearch}
                  className="px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors">
                  ✕ Limpiar Búsqueda
                </button>
              )}
            </div>
            {isCamasCategory && !searchQuery && (
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {['Camas', 'Camas Clásicas', 'Camas Alta Gama', 'Camas Kids'].map(subc => (
                  <button key={subc} onClick={() => handleCategoryClick(subc)}
                    className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all duration-300 ${categoria === subc
                        ? 'bg-gray-800 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                      }`}>
                    {subc === 'Camas' ? 'Todas las Camas' : subc}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold">
              Mostrando {Math.min(visibleCount, filtrados.length)} de {filtrados.length} piezas exclusivas
            </p>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtrados.slice(0, visibleCount).map((p, i) => (
              <div key={p.id} className="reveal" style={{ transitionDelay: `${(i % 4) * 0.1}s` }}>
                <ProductCard product={p} onAdd={add} onQuickView={setQuickViewProduct} />
              </div>
            ))}
          </div>

          {/* Load More */}
          {visibleCount < filtrados.length && (
            <div className="text-center mt-12">
              <button onClick={() => setVisibleCount(prev => prev + 12)}
                className="btn-primary bg-black text-white px-12 py-4 rounded-xl font-bold uppercase text-xs tracking-widest">
                Cargar Más Productos
              </button>
            </div>
          )}
        </div>
      </section>

      <Nosotros />

      {/* Home Section */}
      <div className="reveal">
        <HomeSection setCategoria={setCategoria} />
      </div>

      {/* Arquitectura Section */}
      <div className="reveal">
        <ArquitecturaSection />
      </div>

      {/* Proyectos Section */}
      <div className="reveal">
        <ProjectsSection />
      </div>

      {/* Servicios Section */}
      <div className="reveal">
        <ServiciosSection setCategoria={setCategoria} />
      </div>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-[#F9F8F6] reveal">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-3">Testimonios</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight font-display mb-12">Lo que dicen nuestros clientes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { text: 'El sofá Dubai superó todas mis expectativas. La calidad es increíble y el servicio fue impecable.', author: 'María R.', role: 'Valencia' },
              { text: 'Gran asesoría por WhatsApp. Me ayudaron a elegir el mueble perfecto para mi sala. 100% recomendado.', author: 'Carlos M.', role: 'Caracas' },
              { text: 'La cama Aurora es hermosa y muy cómoda. El envío fue rápido y todo llegó en perfectas condiciones.', author: 'Ana P.', role: 'Maracaibo' },
            ].map((t, i) => (
              <div key={i} className="bg-[#FDFCFA] p-8 rounded-2xl border border-gray-100 text-left hover:shadow-lg transition-shadow duration-300">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} className="fill-black text-black" />)}
                </div>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed italic">"{t.text}"</p>
                <div>
                  <p className="text-xs font-bold uppercase">{t.author}</p>
                  <p className="text-[10px] text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-24 px-6 bg-black text-white overflow-hidden reveal">
        <div className="absolute inset-0 opacity-20">
          <img src="/muebles/qatar.png" alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center z-10">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-4">¿Listo para transformar tu hogar?</p>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight font-display mb-6">Tu espacio merece lo mejor</h2>
          <p className="text-gray-400 text-sm mb-8 max-w-lg mx-auto">
            Contáctanos hoy y descubre cómo podemos crear el ambiente perfecto para ti. Asesoría personalizada sin compromiso.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wa.me/584145847791?text=Hola,%20quiero%20cotizar%20un%20mueble"
              target="_blank" rel="noopener noreferrer"
              className="btn-primary bg-white text-black px-10 py-4 text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2">
              <MessageCircle size={16} /> Solicitar Cotización
            </a>
            <a href="https://www.instagram.com/dekog.home/" target="_blank" rel="noopener noreferrer"
              className="btn-primary border border-white/30 text-white px-10 py-4 text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 hover:bg-white/10">
              Ver Instagram
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Cart Drawer */}
      <Cart carrito={carrito} setCarrito={setCarrito} abierto={abierto} setAbierto={setAbierto} />

      {/* Quick View Modal */}
      <QuickView product={quickViewProduct} onClose={() => setQuickViewProduct(null)} onAdd={add} />
    </div>
  );
}