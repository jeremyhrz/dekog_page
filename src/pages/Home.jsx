import React, { useEffect } from 'react';
import { MessageCircle, ShieldCheck, CreditCard, Truck, Star, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { heroSlides } from '../data/productos';
import HeroSlider from '../components/HeroSlider';
// El catálogo de la renovación de 2026 (barra de filtros fija, tarjetas nuevas): la dueña pidió la web de antes salvo esto.
import Catalogo from '../sections/inicio/Catalogo';

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
 *
 * /?categoria=camas#catalogo abre el catálogo ya filtrado: lo usan el botón «Ver las 40 camas» del
 * asistente y los enlaces que manda por WhatsApp e Instagram (asistente/src/lib/vitrina.js).
 * /?categoria=todos#catalogo, el catálogo entero: el botón de la página «No encontramos esta página».
 */
const CATEGORIA_DE_URL = {
  todos: 'Todos',
  camas: 'Camas',
  'camas-clasicas': 'Camas Clásicas',
  'camas-kids': 'Camas Kids',
  'camas-alta-gama': 'Camas Alta Gama',
  sofas: 'Sofás',
  mesas: 'Mesas',
};

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
  // ?categoria=… : filtra y baja al catálogo. Solo al llegar por un enlace (cambia search o key), no en cada
  // render: handleCategoryClick es una función nueva en cada render de App y lo re-filtraría sin parar.
  const { search, key } = useLocation();
  useEffect(() => {
    // Solo las claves propias: con ?categoria=valueOf (o toString…) el objeto devolvería una función heredada y la
    // página quedaba en blanco. Con hasOwnProperty.call y no Object.hasOwn, que no existe antes de iOS 15.4: ahí este
    // mismo efecto dejaba en blanco la página entera (scripts/compatibilidad.mjs lo vigila).
    const valor = new URLSearchParams(search).get('categoria');
    const cat = valor && Object.prototype.hasOwnProperty.call(CATEGORIA_DE_URL, valor) ? CATEGORIA_DE_URL[valor] : null;
    if (!cat) return undefined;
    handleCategoryClick(cat);
    // Después del scrollTo(0, 0) de App.jsx al cambiar de página y de que el catálogo se pinte.
    const espera = setTimeout(() => catalogRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, key]);

  return (
    <>
      {/* ── 1. Hero Slider ──────────────────────────────────────────── */}
      <HeroSlider
        slides={heroSlides}
        onAddToCart={add}
        setCategoria={setCategoria}
      />

      {/* ── 2. Catálogo (el de la renovación de 2026) ───────────────── */}
      <Catalogo
        categoria={categoria}
        searchQuery={searchQuery}
        visibleCount={visibleCount}
        setVisibleCount={setVisibleCount}
        catalogRef={catalogRef}
        add={add}
        setQuickViewProduct={setQuickViewProduct}
        handleCategoryClick={handleCategoryClick}
        handleClearSearch={handleClearSearch}
      />
    </>
  );
}
