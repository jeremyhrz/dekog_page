import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ProductCard from '../../components/ProductCard';
import { productos } from '../../data/productos';
import { EXPO, cx } from '../../lib/movimiento';

const CATEGORIAS = ['Todos', 'Sofás', 'Camas', 'Mesas'];
const SUBCATEGORIAS = ['Camas', 'Camas Clásicas', 'Camas Alta Gama', 'Camas Kids'];

/**
 * El catálogo de la portada (#catalogo): mismo filtrado, búsqueda y «Cargar más» de siempre (el estado vive en
 * App.jsx; /?categoria=… lo filtra desde los enlaces del asistente). Barra de filtros fija con la píldora activa que
 * se desliza, y las piezas entran en ola por columnas. Los textos, con la letra de la web de antes (24-oct).
 */
export default function Catalogo({
  categoria, searchQuery, visibleCount, setVisibleCount, catalogRef, add, setQuickViewProduct,
  handleCategoryClick, handleClearSearch,
}) {
  const filtrados = useMemo(() => {
    let resultado = productos;
    if (categoria !== 'Todos') {
      resultado = SUBCATEGORIAS.indexOf(categoria) > 0
        ? productos.filter((p) => p.subcategoria === categoria)
        : productos.filter((p) => p.categoria === categoria);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      resultado = productos.filter((p) => p.nombre.toLowerCase().includes(q)
        || p.desc.toLowerCase().includes(q)
        || p.categoria.toLowerCase().includes(q)
        || (p.subcategoria && p.subcategoria.toLowerCase().includes(q)));
    }
    return resultado;
  }, [categoria, searchQuery]);

  const esCamas = categoria === 'Camas' || SUBCATEGORIAS.indexOf(categoria) > 0;

  return (
    <section id="catalogo" ref={catalogRef} aria-labelledby="catalogo-titulo" className="relative bg-hueso pb-[var(--aire)] pt-[var(--aire)]" style={{ scrollMarginTop: 0 }}>
      <div className="contenedor">
        <div className="text-center">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.4em] text-gray-400">Catálogo Completo</p>
          <h2 id="catalogo-titulo" className="font-display text-3xl font-black uppercase tracking-tight text-[#1a1a1a] md:text-4xl">
            {searchQuery ? `Resultados: "${searchQuery}"` : 'Nuestras Piezas'}
          </h2>
        </div>
      </div>

      {/* Barra de filtros fija: baja con la navegación cuando esta se deja ver. */}
      <div
        className="sticky z-30 mt-12 border-b border-tinta/[0.06] bg-hueso/90 backdrop-blur-md transition-[top] duration-500 ease-expo"
        style={{ top: 'var(--alto-nav, 72px)' }}
      >
        <div className="contenedor flex items-center overflow-x-auto py-3 [scrollbar-width:none]">
          {CATEGORIAS.map((c) => {
            const activa = !searchQuery && (categoria === c || (c === 'Camas' && esCamas));
            return (
              <button
                key={c}
                type="button"
                onClick={() => handleCategoryClick(c)}
                aria-pressed={activa}
                className={cx('relative mr-2 shrink-0 rounded-full px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors duration-300', activa ? 'text-white' : 'text-gray-400 hover:text-black')}
              >
                {activa && (
                  <motion.span layoutId="catalogo-pildora" className="absolute left-0 top-0 -z-10 h-full w-full rounded-full bg-black shadow-lg shadow-black/20" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
                )}
                <span className="relative">{c}</span>
              </button>
            );
          })}
          {searchQuery && (
            <button type="button" onClick={handleClearSearch} className="ml-1 shrink-0 rounded-full border border-red-200 bg-red-50 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-red-500 transition-colors hover:bg-red-100">
              ✕ Limpiar búsqueda
            </button>
          )}
          <span className="ml-auto hidden shrink-0 pl-4 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 sm:block">
            Mostrando {Math.min(visibleCount, filtrados.length)} de {filtrados.length} piezas
          </span>
        </div>
        {esCamas && !searchQuery && (
          <div className="contenedor flex overflow-x-auto pb-3 [scrollbar-width:none]">
            {SUBCATEGORIAS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleCategoryClick(s)}
                aria-pressed={categoria === s}
                className={cx(
                  'mr-2 shrink-0 rounded-full px-4 py-2 text-[9px] font-bold uppercase tracking-widest transition-colors duration-300',
                  categoria === s ? 'bg-gray-800 text-white' : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-100',
                )}
              >
                {s === 'Camas' ? 'Todas las Camas' : s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="contenedor mt-10">
        <motion.div layout className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtrados.slice(0, visibleCount).map((p, i) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 44 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -8% 0px' }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.22, ease: 'easeIn' } }}
                transition={{ duration: 0.9, ease: EXPO, delay: (i % 4) * 0.08, layout: { duration: 0.65, ease: EXPO } }}
              >
                <ProductCard product={p} onAdd={add} onQuickView={setQuickViewProduct} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filtrados.length === 0 && (
          <p className="py-16 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">No encontramos piezas con esa búsqueda</p>
        )}

        {visibleCount < filtrados.length && (
          <div className="mt-16 text-center">
            <button type="button" onClick={() => setVisibleCount((prev) => prev + 12)} className="btn-primary rounded-xl bg-black px-12 py-4 text-xs font-bold uppercase tracking-widest text-white">
              Cargar Más Productos
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
