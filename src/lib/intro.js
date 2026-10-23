import { useSyncExternalStore } from 'react';

/**
 * ¿Hay intro en esta carga? Solo la primera visita de la sesión, solo en la portada (/) y nunca con ?sinintro o al
 * llegar con ?categoria= (un enlace del asistente al catálogo: tiene que bajar directo). ?intro=1 la fuerza.
 * Se decide una vez al cargar y se anota en la sesión: al recargar ya no sale.
 *
 * La Intro llama a terminarIntro() cuando su cortina empieza a subir (o si la tocan para saltarla); la portada y la
 * navegación esperan a useIntroTerminada() para hacer su entrada.
 */

const CLAVE = 'dekog:intro-vista';

function decidir() {
  if (typeof window === 'undefined') return false;
  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get('intro') === '1') return true;
  if (window.location.pathname !== '/' || parametros.has('sinintro') || parametros.has('categoria') || window.location.hash) {
    return false;
  }
  try {
    if (window.sessionStorage.getItem(CLAVE)) return false;
    window.sessionStorage.setItem(CLAVE, '1');
  } catch {
    // sin sessionStorage: la intro sale (es corta y se puede saltar)
  }
  return true;
}

export const HAY_INTRO = decidir();

let terminada = !HAY_INTRO;
const oyentes = new Set();

/** Avisa a quien espera la intro (portada, navegación…). Llamarla de más no hace nada. */
export function terminarIntro() {
  if (terminada) return;
  terminada = true;
  oyentes.forEach((avisar) => avisar());
}

// Red de seguridad: si la intro no avisa, la página no se queda esperando.
if (HAY_INTRO) window.setTimeout(terminarIntro, 2800);

const suscribir = (avisar) => {
  oyentes.add(avisar);
  return () => oyentes.delete(avisar);
};

/** true cuando la intro ya terminó (o si no hay intro). */
export function useIntroTerminada() {
  return useSyncExternalStore(suscribir, () => terminada, () => true);
}
