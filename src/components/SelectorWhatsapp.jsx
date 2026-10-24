import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { EVENTO_WHATSAPP, LINEAS_WHATSAPP, lineaWhatsapp } from '../utils/whatsapp';

/**
 * SelectorWhatsapp — «¿Con quién quieres hablar?»: Línea 1 o Línea 2. Lo abre cualquier botón de WhatsApp de la web
 * (utils/whatsapp.js → elegirWhatsapp / propsWhatsapp) con su mensaje ya escrito. Va montado una sola vez en App.
 * En la web no se manda a nadie al asistente de WhatsApp: la página ya tiene su propio chat (pedido de la dueña, 9-oct).
 */
export default function SelectorWhatsapp() {
  const [texto, setTexto] = useState(null);
  const reducir = useReducedMotion();
  const primero = useRef(null);
  const antes = useRef(null);

  useEffect(() => {
    const abrir = (e) => {
      antes.current = document.activeElement;
      setTexto(e.detail?.texto || 'Hola');
    };
    window.addEventListener(EVENTO_WHATSAPP, abrir);
    return () => window.removeEventListener(EVENTO_WHATSAPP, abrir);
  }, []);

  const abierto = texto !== null;
  const cerrar = () => {
    setTexto(null);
    antes.current?.focus?.();
  };

  useEffect(() => {
    if (!abierto) return undefined;
    primero.current?.focus();
    const tecla = (e) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abierto]);

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          key="selector-whatsapp"
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducir ? 0 : 0.18 }}
          onClick={cerrar}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="selector-whatsapp-titulo"
            className="relative w-full max-w-sm rounded-3xl bg-[#f4f0ec] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-neutral-900 shadow-2xl"
            initial={{ y: reducir ? 0 : 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reducir ? 0 : 24, opacity: 0 }}
            transition={{ duration: reducir ? 0 : 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={cerrar} aria-label="Cerrar"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-neutral-600 transition hover:bg-black/5 hover:text-black">
              <X size={20} />
            </button>
            <h2 id="selector-whatsapp-titulo" className="pr-8 text-lg font-bold">¿Con quién quieres hablar?</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Te atiende una asesora de Dekog por WhatsApp, de lunes a sábado de 9:00 a. m. a 6:00 p. m.
              Las dos líneas atienden muebles y arquitectura.
            </p>
            <div className="mt-5 space-y-3">
              {LINEAS_WHATSAPP.map((l, i) => (
                <a
                  key={l.numero}
                  ref={i === 0 ? primero : undefined}
                  href={lineaWhatsapp(l.linea, texto)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={cerrar}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#0e7a3e] px-5 py-4 text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f0ec]"
                >
                  <span className="text-base font-semibold">Línea {l.linea}</span>
                  <span className="text-sm text-white/85">{l.visible}</span>
                </a>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
