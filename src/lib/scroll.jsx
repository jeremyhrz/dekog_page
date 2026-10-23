import { createContext, useContext, useEffect, useState } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Scroll suave con Lenis, solo con ratón o trackpad (pointer: fine) y si no se pidió reducir el movimiento. En el
 * teléfono manda el scroll nativo. Lenis mueve el scroll de verdad (window.scrollY): useScroll de framer-motion y
 * position: sticky funcionan igual con o sin él.
 *
 * Los paneles que ya existían (carrito, vista rápida, chat, modal de proyectos, búsqueda) bloquean el scroll con
 * overflow: hidden en <html> o <body>: mientras eso pase, Lenis no mueve la página. Y la rueda sobre un panel con
 * scroll propio (data-lenis-prevent o role="dialog") la maneja el navegador, no Lenis.
 */

const ContextoScroll = createContext(null);
let lenisActivo = null; // para irA() y useBloquearScroll(), que viven fuera del árbol

const curvaExpo = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

const bloqueado = () => {
  const html = document.documentElement;
  return html.style.overflow === 'hidden' || document.body.style.overflow === 'hidden';
};

export function ProveedorScroll({ children }) {
  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    const fino = window.matchMedia('(pointer: fine)').matches;
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fino || reducir) return undefined;
    const instancia = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      stopInertiaOnNavigate: true,
      prevent: (nodo) => Boolean(nodo.closest && nodo.closest('[data-lenis-prevent], [role="dialog"]')),
      virtualScroll: () => !bloqueado(),
    });
    lenisActivo = instancia;
    setLenis(instancia);
    return () => {
      instancia.destroy();
      lenisActivo = null;
      setLenis(null);
    };
  }, []);

  return <ContextoScroll.Provider value={lenis}>{children}</ContextoScroll.Provider>;
}

/** La instancia de Lenis (o null en el teléfono / con reducir movimiento). */
export function useLenis() {
  return useContext(ContextoScroll);
}

/**
 * Lleva el scroll a un ancla ('#catalogo'), a un elemento o a un número de píxeles.
 * `offset` resta (negativo) o suma píxeles al destino; `inmediato` salta sin animar.
 */
export function irA(destino, { offset = 0, inmediato = false } = {}) {
  const elemento = typeof destino === 'string' ? document.querySelector(destino) : destino;
  if (elemento == null) return;
  if (lenisActivo) {
    // Lenis mide el alto de la página 250 ms después de que cambie y recorta scrollTo a ese alto: al llegar desde una
    // página corta (el 404, por ejemplo) el catálogo de la portada quedaba fuera de su alcance. Se mide justo antes.
    lenisActivo.resize();
    lenisActivo.scrollTo(elemento, { offset, immediate: inmediato, duration: 1.4, easing: curvaExpo, force: true });
    return;
  }
  // Igual que Lenis con un elemento: resta su scroll-margin-top y el scroll-padding-top del html (el alto de la barra,
  // index.css). Así el mismo botón deja el destino en el mismo sitio en el teléfono y en el escritorio.
  const raiz = document.documentElement;
  const margen = typeof elemento === 'number'
    ? 0
    : (parseFloat(getComputedStyle(elemento).scrollMarginTop) || 0) + (parseFloat(getComputedStyle(raiz).scrollPaddingTop) || 0);
  const y = (typeof elemento === 'number' ? elemento : elemento.getBoundingClientRect().top + window.scrollY - margen) + offset;
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!inmediato && !reducir) {
    window.scrollTo({ top: y, behavior: 'smooth' });
    return;
  }
  // Por si una hoja de estilos pone scroll-behavior: smooth en el html: para saltar de golpe se apaga un instante.
  raiz.style.scrollBehavior = 'auto';
  window.scrollTo(0, y);
  raiz.style.scrollBehavior = '';
}

let bloqueos = 0;

/**
 * Congela el scroll de la página mientras `activo` sea true (menú, intro). Admite varios a la vez. Dentro del panel,
 * un contenedor con scroll propio debe llevar `data-lenis-prevent`.
 */
export function useBloquearScroll(activo) {
  useEffect(() => {
    if (!activo) return undefined;
    bloqueos += 1;
    if (bloqueos === 1) {
      document.documentElement.style.overflow = 'hidden';
      if (lenisActivo) lenisActivo.stop();
    }
    return () => {
      bloqueos -= 1;
      if (bloqueos === 0) {
        document.documentElement.style.overflow = '';
        if (lenisActivo) lenisActivo.start();
      }
    };
  }, [activo]);
}
