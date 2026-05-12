import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { productos, categorias } from '../data/productos';
import HomeSection from '../components/HomeSection';
import ProductCard from '../components/ProductCard';

/**
 * HomeMueblesPage — /home
 * Muestra la sección DEKOG HOME (muebles, sofás, camas, mesas)
 * como página independiente con catálogo filtrable.
 *
 * Props recibidas desde App.jsx:
 *   categoria, setCategoria, handleCategoryClick, add, setQuickViewProduct
 */
export default function HomeMueblesPage({
  categoria = 'Todos',
  setCategoria = () => {},
  handleCategoryClick = () => {},
  add = () => {},
  setQuickViewProduct = () => {},
}) {
  const [visibleCount, setVisibleCount] = useState(12);
  const catalogRef = useRef(null);

  const filtrados = React.useMemo(() => {
    if (categoria === 'Todos') return productos;
    if (['Camas Clásicas', 'Camas Alta Gama', 'Camas Kids'].includes(categoria)) {
      return productos.filter(p => p.subcategoria === categoria);
    }
    return productos.filter(p => p.categoria === categoria);
  }, [categoria]);

  const isCamasCategory =
    categoria === 'Camas' ||
    ['Camas Clásicas', 'Camas Alta Gama', 'Camas Kids'].includes(categoria);

  return (
    <div className="pt-24">
      {/* ── Sección HomeSection existente (hero + categorías visuales) ── */}
      <HomeSection
        setCategoria={(cat) => {
          // Si el usuario hace clic en una categoría aquí, 
          // lo llevamos a la página de inicio (/) donde está el catálogo real
          handleCategoryClick(cat); // Usamos handleCategoryClick que ya viene de props
          window.location.href = '/#catalogo';
        }}
      />

      {/* ── CTA hacia Arquitectura ────────────────────────────────────── */}
      <section className="relative py-24 px-6 bg-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src="/muebles/qatar.png" alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center z-10">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-4">
            ¿Necesitas también el espacio?
          </p>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-6">
            Descubre Dekog Arquitectura
          </h2>
          <p className="text-gray-400 text-sm mb-8 max-w-lg mx-auto">
            Diseñamos, construimos y amoblamos. Un solo equipo para todo tu proyecto.
          </p>
          <Link
            to="/arquitectura"
            className="bg-white text-black px-10 py-4 text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
          >
            Ver Arquitectura <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
