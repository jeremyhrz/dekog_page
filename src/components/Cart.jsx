import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Imagen from './Imagen';
import { IconoWhatsapp } from './asistente/comun';
import { EXPO } from '../lib/movimiento';
import { elegirWhatsapp } from '../utils/whatsapp';

const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Carrito (panel lateral, renovación de 2026): las piezas elegidas con su cantidad y el total estimado; «Pedir por
 * WhatsApp» abre el selector de línea con la lista ya escrita. No se guarda entre visitas.
 */
export default function Cart({ carrito, setCarrito, abierto, setAbierto }) {
  const total = carrito.reduce((s, p) => s + (p.precio * p.cant), 0);

  // Escape cierra el carrito.
  useEffect(() => {
    if (!abierto) return undefined;
    const tecla = (e) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abierto, setAbierto]);

  const updateQty = (id, delta) => {
    setCarrito(carrito.map((x) => {
      if (x.id === id) {
        const newCant = x.cant + delta;
        return newCant > 0 ? { ...x, cant: newCant } : x;
      }
      return x;
    }).filter((x) => x.cant > 0));
  };

  const sendWA = () => {
    const items = carrito.map((p) => `• ${p.cant}x ${p.nombre} (REF ${p.precio} c/u)`).join('\n');
    const mensaje = `¡Hola Dekog Home! 👋\n\nQuiero solicitar información sobre estos productos:\n\n${items}\n\n*Total estimado: REF ${total}*\n\n¿Podrían confirmarme disponibilidad? Gracias.`;
    elegirWhatsapp(mensaje);
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[55] flex justify-end" role="dialog" aria-modal="true" aria-label="Carrito" data-lenis-prevent>
      <motion.div
        className="absolute inset-0 bg-noche/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        onClick={() => setAbierto(false)}
      />
      <motion.div
        className="relative flex h-full w-full max-w-md flex-col bg-hueso text-tinta shadow-[0_0_60px_-20px_rgb(21_19_17/0.5)]"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.7, ease: EXPO }}
      >
        <div className="flex items-center justify-between border-b border-tinta/10 px-6 py-5">
          <div className="flex items-baseline">
            <h2 className="font-display text-[1.9rem] leading-none">Tu carrito</h2>
            <span className="etiqueta ml-3 text-grafito/60">
              {carrito.length} {carrito.length === 1 ? 'pieza' : 'piezas'}
            </span>
          </div>
          <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar el carrito" className="grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-tinta/5">
            <X className="h-5 w-5" strokeWidth={1.4} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {carrito.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="mb-5 h-12 w-12 text-madera" strokeWidth={1} />
              <p className="font-display text-[1.6rem] italic">Tu carrito está vacío</p>
              <p className="mt-2 text-sm text-grafito/70">Explora el catálogo y elige tus piezas.</p>
              <Link to="/?categoria=todos#catalogo" onClick={() => setAbierto(false)} className="boton boton-oscuro mt-7">
                Ver el catálogo
              </Link>
            </div>
          ) : (
            <ul>
              {carrito.map((p) => (
                <li key={p.id} className="flex border-b border-tinta/10 py-4 first:pt-0">
                  <span className="block h-[88px] w-[70px] shrink-0 overflow-hidden rounded-lg bg-arena">
                    <Imagen src={p.imagen} sizes="70px" className="h-full w-full object-cover" alt={p.nombre} />
                  </span>
                  <div className="ml-4 min-w-0 flex-1">
                    <h4 className="font-display text-[1.2rem] leading-tight">{p.nombre}</h4>
                    <p className="etiqueta mt-1 !text-[9px] text-grafito/60">{p.categoria}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-full ring-1 ring-tinta/15">
                        <button type="button" onClick={() => updateQty(p.id, -1)} aria-label="Uno menos" className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-tinta/5">
                          <Minus className="h-3.5 w-3.5" strokeWidth={1.6} />
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums">{p.cant}</span>
                        <button type="button" onClick={() => updateQty(p.id, 1)} aria-label="Uno más" className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-tinta/5">
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.6} />
                        </button>
                      </div>
                      <span className="font-display text-[1.25rem]">REF {miles(p.precio * p.cant)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCarrito(carrito.filter((x) => x.id !== p.id))}
                    aria-label={`Quitar ${p.nombre}`}
                    className="ml-2 grid h-9 w-9 shrink-0 place-items-center self-start rounded-full text-grafito/50 transition-colors hover:bg-tinta/5 hover:text-tinta"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {carrito.length > 0 && (
          <div className="border-t border-tinta/10 bg-papel px-6 py-6">
            <div className="mb-5 flex items-baseline justify-between">
              <span className="etiqueta text-grafito/70">Total estimado</span>
              <span className="font-display text-[2rem] leading-none">REF {miles(total)}</span>
            </div>
            <button type="button" onClick={sendWA} className="boton boton-oscuro w-full">
              <IconoWhatsapp size={17} />
              <span>Pedir por WhatsApp</span>
            </button>
            <button type="button" onClick={() => setCarrito([])} className="etiqueta mt-3 w-full py-2 text-grafito/60 transition-colors hover:text-tinta">
              Vaciar el carrito
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
