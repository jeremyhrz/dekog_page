import React from 'react';
import { MessageCircle, ShieldCheck, CreditCard, Truck, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productos, heroSlides, categorias } from '../data/productos';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';

/**
 * Home — Página de inicio (/)
 *
 * Contiene:
 *   1. Hero Slider (imágenes a pantalla completa)
 *   2. Trust Bar (garantías)
 *   3. Colecciones / Categorías
 *   4. Catálogo filtrable con paginación
 *   5. Testimonios
 *   6. CTA Banner final
 *
 * Las secciones Nosotros, Arquitectura, Proyectos y Servicios
 * ahora son páginas independientes accesibles desde la Navbar.
 */
export default function Home({
  categoria, setCategoria,
  carrito, setCarrito,
  abierto, setAbierto,
  quickViewProduct, setQuickViewProduct,
  searchQuery, setSearchQuery,
  visibleCount, setVisibleCount,
  catalogRef,
  add,
  handleSearch,
  handleCategoryClick,
  handleClearSearch,
}) {
  const filtrados = React.useMemo(() => {
    let result = productos;
    if (categoria !== 'Todos') {
      if (['Camas Clásicas', 'Camas Alta Gama', 'Camas Kids'].includes(categoria)) {
        result = productos.filter(p => p.subcategoria === categoria);
      } else {
        result = productos.filter(p => p.categoria === categoria);
      }
    }
    if (searchQuery) {
      result = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.subcategoria && p.subcategoria.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return result;
  }, [categoria, searchQuery]);

  const isCamasCategory =
    categoria === 'Camas' ||
    ['Camas Clásicas', 'Camas Alta Gama', 'Camas Kids'].includes(categoria);

  return (
    <>
      {/* ── 1. Hero Slider ──────────────────────────────────────────── */}
      <HeroSlider
        slides={heroSlides}
        onAddToCart={add}
        setCategoria={setCategoria}
      />

      {/* ── 2. Catálogo ─────────────────────────────────────────────── */}
      <section id="catalogo" ref={catalogRef} className="py-20 px-6 bg-[#f4f0ec] text-[#1a1a1a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-3">
              Catálogo Completo
            </p>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight font-display">
              {searchQuery ? `Resultados: "${searchQuery}"` : 'Nuestras Piezas'}
            </h2>
          </div>

          {/* Filtros */}
            <div className="flex flex-wrap justify-center gap-2">
              {['Todos', 'Sofás', 'Camas', 'Mesas'].map(c => (
                <button
                  key={c}
                  onClick={() => handleCategoryClick(c)}
                  className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                    (categoria === c || (c === 'Camas' && isCamasCategory)) && !searchQuery
                      ? 'bg-black text-white shadow-lg shadow-black/20 scale-105'
                      : 'bg-[#FDFCFA] text-gray-400 hover:bg-[#eae6e1] border border-gray-200'
                  }`}
                >
                  {c}
                </button>
              ))}
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  ✕ Limpiar búsqueda
                </button>
              )}
            </div>
            {isCamasCategory && !searchQuery && (
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {['Camas', 'Camas Clásicas', 'Camas Alta Gama', 'Camas Kids'].map(subc => (
                  <button
                    key={subc}
                    onClick={() => handleCategoryClick(subc)}
                    className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all duration-300 ${
                      categoria === subc
                        ? 'bg-gray-800 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {subc === 'Camas' ? 'Todas las Camas' : subc}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-12">
              Mostrando {Math.min(visibleCount, filtrados.length)} de {filtrados.length} piezas exclusivas
            </p>

            {/* Grid de productos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtrados.slice(0, visibleCount).map((p, i) => (
                <div
                  key={p.id}
                  className="transition-all duration-700"
                  style={{ transitionDelay: `${(i % 4) * 0.1}s` }}
                >
                  <ProductCard
                    product={p}
                    onAdd={add}
                    onQuickView={setQuickViewProduct}
                  />
                </div>
              ))}
            </div>

            {/* Cargar más */}
            {visibleCount < filtrados.length && (
              <div className="text-center mt-12">
                <button
                  onClick={() => setVisibleCount(prev => prev + 12)}
                  className="btn-primary bg-black text-white px-12 py-4 rounded-xl font-bold uppercase text-xs tracking-widest"
                >
                  Cargar Más Productos
                </button>
              </div>
            )}
          </div>
        </section>
    </>
  );
}