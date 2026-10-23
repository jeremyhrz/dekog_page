import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import { EVENTO_WHATSAPP, LINEAS_WHATSAPP, lineaWhatsapp } from '../utils/whatsapp';
import { IconoWhatsapp } from './asistente/comun';

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
          /* z por encima del modal de proyectos (10000): su «Consultar proyecto similar» abre este selector. */
          className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/50 p-4 sm:items-center"
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
            className="relative w-full max-w-sm rounded-3xl bg-hueso p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-tinta shadow-2xl"
            initial={{ y: reducir ? 0 : 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reducir ? 0 : 24, opacity: 0 }}
            transition={{ duration: reducir ? 0 : 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={cerrar} aria-label="Cerrar"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-grafito/70 transition hover:bg-tinta/5 hover:text-tinta">
              <X size={20} />
            </button>
            <h2 id="selector-whatsapp-titulo" className="pr-8 font-display text-[1.6rem] leading-tight">¿Con quién quieres <em className="enfasis">hablar?</em></h2>
            <p className="mt-2 text-sm leading-relaxed text-grafito/80">
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
                  className="group flex items-center rounded-[18px] bg-tinta px-5 py-4 text-papel transition-colors duration-500 ease-expo hover:bg-madera-oscuro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-madera focus-visible:ring-offset-2 focus-visible:ring-offset-hueso"
                >
                  {/* Las mismas tarjetas que las líneas de /a… (NoEncontrada): oscuras, con el ícono y el número a la vista. */}
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-papel/10">
                    <IconoWhatsapp size={18} />
                  </span>
                  <span className="ml-4 min-w-0 flex-1 text-left">
                    <span className="block font-display text-[1.6rem] leading-none">Línea {l.linea}</span>
                    <span className="etiqueta mt-2 block text-papel/70">{l.visible}</span>
                  </span>
                  <ArrowUpRight
                    className="ml-3 h-5 w-5 shrink-0 text-papel/70 transition-transform duration-500 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </a>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
