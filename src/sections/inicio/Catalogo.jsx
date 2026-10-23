import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import ProductCard from '../../components/ProductCard';
import { productos } from '../../data/productos';
import { EXPO, cx } from '../../lib/movimiento';

const CATEGORIAS = ['Todos', 'Sofás', 'Camas', 'Mesas'];
const SUBCATEGORIAS = ['Camas', 'Camas Clásicas', 'Camas Alta Gama', 'Camas Kids'];

/**
 * El catálogo de la portada (#catalogo): mismo filtrado, búsqueda y «Cargar más» de siempre (el estado vive en
 * App.jsx; /?categoria=… lo filtra desde los enlaces del asistente). Barra de filtros fija con la píldora activa que
 * se desliza, y las piezas entran en ola por columnas.
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
  const navVisible = useNavegacionVisible();

  return (
    <section id="catalogo" ref={catalogRef} aria-labelledby="catalogo-titulo" className="relative bg-hueso pb-[var(--aire)] pt-[var(--aire)]" style={{ scrollMarginTop: 0 }}>
      <div className="contenedor">
        <div className="lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8">
          <div className="lg:col-span-8">
            <Revelar como="p" className="etiqueta flex items-center text-madera-oscuro" y={12}>
              <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
              Catálogo
            </Revelar>
            {searchQuery ? (
              <h2 id="catalogo-titulo" className="titulo-display mt-5">
                Resultados: <em>«{searchQuery}»</em>
              </h2>
            ) : (
              <TextoDividido como="h2" id="catalogo-titulo" texto="Encuentra tu *pieza*" className="titulo-display mt-5" />
            )}
          </div>
          <Revelar retraso={0.15} className="mt-6 lg:col-span-4 lg:mt-0 lg:pb-3">
            <p className="font-display text-[1.6rem] italic leading-tight">Hecho a la medida.</p>
            <p className="mt-2 max-w-sm text-[15px] text-grafito/80">
              {productos.length} piezas entre camas, sofás, puffs y mesas. Elige una para ver sus medidas y precios.
            </p>
          </Revelar>
        </div>
      </div>

      {/* Barra de filtros fija: baja con la navegación cuando esta se deja ver. */}
      <div
        className="sticky z-30 mt-12 border-b border-tinta/[0.06] bg-hueso/90 backdrop-blur-md transition-[top] duration-500 ease-expo"
        style={{ top: navVisible ? 'var(--alto-nav, 64px)' : '0px' }}
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
                className={cx('etiqueta relative mr-2 shrink-0 rounded-full px-5 py-2.5 transition-colors duration-300', activa ? 'text-papel' : 'text-grafito hover:text-tinta')}
              >
                {activa && (
                  <motion.span layoutId="catalogo-pildora" className="absolute left-0 top-0 -z-10 h-full w-full rounded-full bg-tinta" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
                )}
                <span className="relative">{c}</span>
              </button>
            );
          })}
          {searchQuery && (
            <button type="button" onClick={handleClearSearch} className="etiqueta ml-1 shrink-0 rounded-full px-4 py-2.5 text-madera-oscuro ring-1 ring-madera/40 hover:bg-madera/10">
              ✕ Limpiar búsqueda
            </button>
          )}
          <span className="etiqueta ml-auto hidden shrink-0 pl-4 text-grafito/60 sm:block">
            {Math.min(visibleCount, filtrados.length)} de {filtrados.length}
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
                  'mr-2 shrink-0 rounded-full px-4 py-1.5 text-[13px] transition-colors duration-300',
                  categoria === s ? 'bg-madera text-papel' : 'text-grafito ring-1 ring-tinta/10 hover:ring-tinta/30',
                )}
              >
                {s === 'Camas' ? 'Todas las camas' : s.replace('Camas ', '')}
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
          <p className="py-16 text-center font-display text-2xl italic text-grafito/70">No encontramos piezas con esa búsqueda.</p>
        )}

        {visibleCount < filtrados.length && (
          <div className="mt-16 text-center">
            <button type="button" onClick={() => setVisibleCount((prev) => prev + 12)} className="boton boton-oscuro">
              Ver más piezas
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** true si la navegación está a la vista (la misma lógica de Navbar.jsx: se esconde al bajar, vuelve al subir). */
function useNavegacionVisible() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(true);
  useMotionValueEvent(scrollY, 'change', (y) => {
    const previo = scrollY.getPrevious();
    const delta = y - (previo === undefined ? y : previo);
    if (y < 140) setVisible(true);
    else if (delta > 4) setVisible(false);
    else if (delta < -4) setVisible(true);
  });
  return visible;
}
