import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import Imagen from './Imagen';
import { IconoWhatsapp } from './asistente/comun';
import { EXPO, cx } from '../lib/movimiento';
import { propsWhatsapp } from '../utils/whatsapp';

const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Vista rápida de un producto (renovación de 2026): la foto, el nombre en Playfair, las medidas para elegir y el precio
 * de la elegida; «Añadir al carrito» o «Consultar por WhatsApp» con el producto, la medida y el precio ya escritos.
 */
export default function QuickView({ product, onClose, onAdd }) {
  const [selectedTalla, setSelectedTalla] = useState(null);

  useEffect(() => {
    if (product && product.tallas && product.tallas.length > 0) setSelectedTalla(product.tallas[0]);
    else setSelectedTalla(null);
  }, [product]);

  // Escape cierra la vista rápida.
  useEffect(() => {
    if (!product) return undefined;
    const tecla = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [product, onClose]);

  if (!product) return null;

  const displayPrice = selectedTalla ? selectedTalla.precio : product.precio;

  const handleAdd = () => {
    if (selectedTalla) {
      onAdd({
        ...product,
        id: `${product.id}-${selectedTalla.nombre}`,
        nombre: `${product.nombre} (${selectedTalla.nombre})`,
        precio: selectedTalla.precio,
      });
    } else {
      onAdd(product);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={product.nombre} data-lenis-prevent>
      <motion.div className="absolute inset-0 bg-noche/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} />
      <motion.div
        className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-y-auto rounded-[24px] bg-hueso text-tinta shadow-[0_40px_80px_-30px_rgb(21_19_17/0.6)] md:flex-row"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EXPO }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 bg-arena md:w-1/2">
          <div className="relative md:h-full" style={{ paddingBottom: '100%' }}>
            <Imagen src={product.imagen} sizes="(min-width: 768px) 450px, 100vw" alt={product.nombre} className="absolute left-0 top-0 h-full w-full object-cover" />
          </div>
        </div>

        <div className="flex flex-col justify-between p-7 md:w-1/2 md:p-9">
          <div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-hueso/80 backdrop-blur-sm transition-colors hover:bg-hueso">
              <X className="h-5 w-5" strokeWidth={1.4} />
            </button>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-gray-400">{product.subcategoria || product.categoria}</p>
            <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight">{product.nombre}</h2>
            <p className="mt-2 text-sm text-gray-500">{product.desc}</p>

            {product.tallas && product.tallas.length > 0 && (
              <div className="mt-7">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Elige la medida</p>
                <div className="mt-3 flex flex-wrap">
                  {product.tallas.map((talla) => {
                    const elegida = selectedTalla && selectedTalla.nombre === talla.nombre;
                    return (
                      <button
                        key={talla.nombre}
                        type="button"
                        onClick={() => setSelectedTalla(talla)}
                        aria-pressed={elegida}
                        className={cx(
                          'mb-2 mr-2 rounded-full px-4 py-2 text-xs font-bold transition-colors duration-300',
                          elegida ? 'bg-tinta text-papel' : 'text-grafito ring-1 ring-tinta/15 hover:ring-tinta/40',
                        )}
                      >
                        {talla.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mt-6 text-4xl font-black"><span className="mr-1 text-[0.7em] font-light">REF</span>{miles(displayPrice)}</p>
            <ul className="mt-6 space-y-2 text-[14px] text-grafito/75">
              <li className="flex items-center"><span className="mr-3 h-1.5 w-1.5 rounded-full bg-madera" />Hecho a la medida</li>
              <li className="flex items-center"><span className="mr-3 h-1.5 w-1.5 rounded-full bg-madera" />Garantía de calidad Dekog Home</li>
              <li className="flex items-center"><span className="mr-3 h-1.5 w-1.5 rounded-full bg-madera" />Consulta los colores y telas disponibles</li>
            </ul>
          </div>

          <div className="mt-8">
            <button type="button" onClick={handleAdd} className="boton boton-oscuro w-full !font-bold !text-xs !tracking-widest">
              <Plus className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
              <span>Añadir al carrito</span>
            </button>
            <a
              {...propsWhatsapp(`Hola, me interesa el producto: ${product.nombre}${selectedTalla ? ` (${selectedTalla.nombre})` : ''} (REF ${displayPrice})`)}
              className="boton boton-linea mt-3 w-full !font-bold !text-xs !tracking-widest"
            >
              <IconoWhatsapp size={16} />
              <span>Consultar por WhatsApp</span>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
