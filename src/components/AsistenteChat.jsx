import React, { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { MarcaD } from './asistente/LogoDekog';
import { CLAVE, Cabecera, IconoWhatsapp, WHATSAPP_DIRECTO } from './asistente/comun';

/**
 * AsistenteChat — botón flotante del asistente con IA de Dekog (esquina inferior derecha), su saludo
 * y el marco animado del chat.
 *
 * Va con la carga inicial de la página y pesa poco. La conversación entera (asistente/AsistentePanel.jsx:
 * API, sesión, formulario y tarjetas) es un archivo aparte: se descarga en un momento libre después de
 * cargar la página y se deja montado y oculto, así que al tocar el botón el chat abre al instante.
 * Con datos limitados (modo ahorro o 2G) solo se descarga si el cliente se acerca al botón.
 */

let PanelListo = null;
let promesaPanel = null;
function cargarPanel() {
  promesaPanel ??= import('./asistente/AsistentePanel').then(
    (m) => { PanelListo = m.default; return m; },
    (e) => { promesaPanel = null; throw e; }, // si falló la red, el próximo intento vuelve a pedirlo
  );
  return promesaPanel;
}
const PanelPerezoso = lazy(cargarPanel);
const precargar = () => { cargarPanel().catch(() => {}); };

// Saludo: una vez por visita, a los 7 s, con un texto según la página (en /contacto no: tiene su formulario).
const SALUDOS = {
  '/': '¡Hola! 👋 ¿Buscas algo para tu espacio? Te ayudo con modelos y precios.',
  '/home': '¿Sofá, cama o mesa? Te digo modelos y precios en REF y Bs al instante.',
  '/arquitectura': '¿Tienes un proyecto en mente? Te ayudo a cotizarlo.',
  '/servicios': '¿Tienes un proyecto en mente? Te ayudo a cotizarlo.',
  '/proyectos': '¿Te gustó algún proyecto? Te ayudo a cotizar el tuyo.',
  '/nosotros': '¿Buscas muebles o un proyecto? Te ayudo al instante.',
};
const SALUDO_TRAS_MS = 7000;
const SALUDO_DURA_MS = 12000;
const SALUDO_PAUSA_MS = 7 * 24 * 60 * 60 * 1000; // si lo cierra con la X, no vuelve en una semana

/** Solo saluda si en esta visita no saludó ni se abrió el chat, no hay conversación y no lo cerró hace poco. */
function puedeSaludar() {
  try {
    if (sessionStorage.getItem(`${CLAVE}-saludo`)) return false;
    const guardada = JSON.parse(sessionStorage.getItem(CLAVE));
    if (Array.isArray(guardada) && guardada.length) return false;
    const cerrado = Number(localStorage.getItem(`${CLAVE}-saludo-cerrado`));
    return !(cerrado && Date.now() - cerrado < SALUDO_PAUSA_MS);
  } catch {
    return false; // sin almacenamiento no se puede recordar que ya saludó: mejor no insistir
  }
}

function useMedia(consulta) {
  const [coincide, setCoincide] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const alCambiar = () => setCoincide(mq.matches);
    alCambiar();
    if (mq.addEventListener) mq.addEventListener('change', alCambiar);
    else mq.addListener(alCambiar); // Safari < 14
    return () => (mq.removeEventListener ? mq.removeEventListener('change', alCambiar) : mq.removeListener(alCambiar));
  }, [consulta]);
  return coincide;
}

// Teléfono (o pantalla muy baja): a pantalla completa, a la altura de la parte visible (AsistentePanel la
// ajusta al abrir el teclado). Escritorio: tarjeta flotante que no bloquea la página.
const MARCO_MOVIL = 'fixed inset-x-0 top-[var(--dk-vvtop,0px)] z-[54] flex h-[var(--dk-vvh,100dvh)] flex-col overflow-hidden bg-[#f4f0ec] overscroll-none focus:outline-none';
const MARCO_ESCRITORIO = 'fixed bottom-6 right-6 z-[54] flex h-[min(680px,calc(100dvh-48px))] w-[400px] flex-col overflow-hidden rounded-[28px] bg-[#f4f0ec] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,0,0,0.08)] focus:outline-none';

// Solo opacity y transform (en el compositor). En el teléfono sube como una hoja; en escritorio sale del botón.
function variantesMarco(pantallaCompleta, reducir) {
  if (reducir) {
    return { oculto: { opacity: 0, transition: { duration: 0.15 } }, visible: { opacity: 1, transition: { duration: 0.2 } } };
  }
  if (pantallaCompleta) {
    return {
      oculto: { transform: 'translate3d(0px, 100%, 0px)', transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } },
      visible: { transform: 'translate3d(0px, 0%, 0px)', transition: { duration: 0.44, ease: [0.32, 0.72, 0, 1] } },
    };
  }
  return {
    oculto: { opacity: 0, transform: 'translate3d(0px, 12px, 0px) scale(0.6)', transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
    visible: { opacity: 1, transform: 'translate3d(0px, 0px, 0px) scale(1)', transition: { type: 'spring', visualDuration: 0.42, bounce: 0.18 } },
  };
}

/** Si el archivo del chat no carga (red caída o una versión vieja de la página tras publicar), el resto
 * del sitio sigue en pie y el cliente tiene el WhatsApp a mano. */
class ErrorDelPanel extends Component {
  constructor(props) {
    super(props);
    this.state = { fallo: false };
  }

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Cabecera onCerrar={this.props.onCerrar} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-[15px] text-neutral-800">No pudimos cargar el asistente.</p>
          <a href={WHATSAPP_DIRECTO} target="_blank" rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0e7a3e] px-5 text-[14px] font-semibold text-white transition hover:brightness-110">
            <IconoWhatsapp />
            Escríbenos por WhatsApp
          </a>
          <button type="button" onClick={() => window.location.reload()}
            className="text-[13px] font-semibold text-neutral-700 underline hover:text-black">
            Recargar la página
          </button>
        </div>
      </div>
    );
  }
}

/** Mientras llega el archivo del chat (solo si lo abren antes de que se descargue solo). */
function PanelEsqueleto({ onCerrar }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Cabecera onCerrar={onCerrar} />
      <div className="flex-1 space-y-3 px-3 pt-6 sm:px-4">
        <div className="h-10 w-3/4 animate-pulse rounded-[20px] rounded-tl-md bg-white/80" />
        <div className="h-10 w-1/2 animate-pulse rounded-[20px] rounded-tl-md bg-white/80" />
      </div>
      <div className="h-[92px] shrink-0 border-t border-black/[0.06] bg-white" />
    </div>
  );
}

export default function AsistenteChat() {
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false); // una vez montado, el panel no se desmonta (conserva todo)
  const [visible, setVisible] = useState(false); // sigue visible mientras dura la animación de cierre
  const [saludo, setSaludo] = useState(false);
  const [ondas, setOndas] = useState(0);
  const pantallaCompleta = useMedia('(max-width: 639px), (max-height: 520px)');
  const reducir = useReducedMotion();
  const { pathname } = useLocation();
  const lanzadorRef = useRef(null);
  const marcoRef = useRef(null);
  const abiertoRef = useRef(false);
  const yaAbrio = useRef(false);
  // El tipo de componente del panel queda FIJO desde que se monta: si cambiara de PanelPerezoso a
  // PanelListo, React lo desmontaría y se perderían el borrador, la petición en curso, etc.
  const tipoPanel = useRef(null);
  if (montado && !tipoPanel.current) tipoPanel.current = PanelListo ?? PanelPerezoso;
  const Panel = tipoPanel.current;
  abiertoRef.current = abierto;

  function abrir() {
    precargar();
    yaAbrio.current = true;
    setMontado(true);
    setVisible(true);
    setAbierto(true);
    setSaludo(false);
    try { sessionStorage.setItem(`${CLAVE}-saludo`, '1'); } catch { /* modo privado */ }
  }

  function cerrar() {
    setAbierto(false);
    setTimeout(() => lanzadorRef.current?.focus({ preventScroll: true }), 0);
  }

  function cerrarSaludo() {
    setSaludo(false);
    try { localStorage.setItem(`${CLAVE}-saludo-cerrado`, String(Date.now())); } catch { /* modo privado */ }
  }

  // Descarga y monta el panel (oculto) en un momento libre después de cargar la página.
  useEffect(() => {
    const red = navigator.connection;
    if (red?.saveData || /2g/.test(red?.effectiveType ?? '')) return undefined;
    let cancelado = false;
    let idReposo = 0;
    let temporizador = 0;
    const premontar = () => cargarPanel().then(() => { if (!cancelado) setMontado(true); }, () => {});
    const enReposo = () => {
      if ('requestIdleCallback' in window) idReposo = window.requestIdleCallback(premontar, { timeout: 4000 });
      else temporizador = setTimeout(premontar, 1500); // Safari
    };
    if (document.readyState === 'complete') enReposo();
    else window.addEventListener('load', enReposo, { once: true });
    return () => {
      cancelado = true;
      window.removeEventListener('load', enReposo);
      if (idReposo) window.cancelIdleCallback(idReposo);
      clearTimeout(temporizador);
    };
  }, []);

  // Saludo: aparece a los 7 s en cada página que tenga texto y se va solo a los 12 s o al cambiar de página.
  const textoSaludo = SALUDOS[pathname];
  useEffect(() => {
    setSaludo(false);
    if (!textoSaludo) return undefined;
    let ocultar = 0;
    const mostrar = setTimeout(() => {
      if (document.hidden || abiertoRef.current || !puedeSaludar()) return;
      try { sessionStorage.setItem(`${CLAVE}-saludo`, '1'); } catch { /* modo privado */ }
      setSaludo(true);
      setOndas((n) => n + 1);
      precargar();
      ocultar = setTimeout(() => setSaludo(false), SALUDO_DURA_MS);
    }, SALUDO_TRAS_MS);
    return () => { clearTimeout(mostrar); clearTimeout(ocultar); };
  }, [pathname, textoSaludo]);

  // Escape cierra el chat y devuelve el foco al botón que lo abrió.
  useEffect(() => {
    if (!abierto) return undefined;
    const alPulsar = (e) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [abierto]);

  // A pantalla completa, la página de atrás no se desplaza mientras el chat está abierto.
  useEffect(() => {
    if (!abierto || !pantallaCompleta) return undefined;
    const { documentElement: html, body } = document;
    const antes = [html.style.overflow, body.style.overflow];
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => { html.style.overflow = antes[0]; body.style.overflow = antes[1]; };
  }, [abierto, pantallaCompleta]);

  // A pantalla completa el chat es modal: Tab recorre solo sus botones.
  function atraparFoco(e) {
    if (e.key !== 'Tab' || !pantallaCompleta || !marcoRef.current) return;
    const enfocables = [...marcoRef.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.getClientRects().length > 0);
    if (!enfocables.length) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    const activo = document.activeElement;
    if (e.shiftKey && (activo === primero || activo === marcoRef.current)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && activo === ultimo) { e.preventDefault(); primero.focus(); }
  }

  const transicionLanzador = abierto
    ? { duration: 0.15 }
    : reducir
      ? { duration: 0.2, delay: yaAbrio.current ? 0.1 : 0.6 }
      : { type: 'spring', visualDuration: 0.45, bounce: 0.3, delay: yaAbrio.current ? 0.1 : 0.6 };

  return (
    <>
      {/* ── Botón flotante: círculo con la D en el teléfono, píldora «¿Te ayudo?» en escritorio ── */}
      <motion.div
        data-asistente
        inert={abierto}
        initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translate3d(0px, 12px, 0px) scale(0.8)' }}
        animate={reducir
          ? { opacity: abierto ? 0 : 1 }
          : { opacity: abierto ? 0 : 1, transform: `translate3d(0px, 0px, 0px) scale(${abierto ? 0.85 : 1})` }}
        transition={transicionLanzador}
        className="fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))] right-[max(1rem,calc(env(safe-area-inset-right)+0.75rem))] z-50 sm:bottom-6 sm:right-6"
      >
        <button
          ref={lanzadorRef}
          type="button"
          onClick={abrir}
          onPointerEnter={precargar}
          onFocus={precargar}
          onTouchStart={precargar}
          aria-label="¿Te ayudo? Abrir el asistente de Dekog"
          aria-haspopup="dialog"
          aria-expanded={abierto}
          aria-controls="dk-chat"
          className="relative flex h-14 w-14 select-none items-center justify-center rounded-full bg-black text-white shadow-[0_14px_34px_-10px_rgba(0,0,0,0.6),0_4px_12px_-4px_rgba(0,0,0,0.3)] ring-1 ring-white/15 transition-transform duration-200 ease-out [-webkit-tap-highlight-color:transparent] hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f0ec] sm:h-[60px] sm:w-auto sm:justify-start sm:gap-3 sm:pl-2 sm:pr-6"
        >
          <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full sm:h-11 sm:w-11 sm:ring-1 sm:ring-white/20">
            <span key={ondas} aria-hidden="true"
              className="dk-onda pointer-events-none absolute inset-0 rounded-full ring-2 ring-black/40 sm:ring-white/40"
              style={ondas ? { animationDelay: '0.2s', animationIterationCount: 1 } : undefined} />
            <MarcaD className="h-[22px] w-[22px] sm:h-[18px] sm:w-[18px]" />
            <span aria-hidden="true" className="absolute right-1 top-1 h-3 w-3 rounded-full bg-[#25D366] ring-2 ring-black sm:-right-0.5 sm:-top-0.5" />
          </span>
          <span className="hidden flex-col items-start leading-none sm:flex">
            <span className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/55">Asistente Dekog</span>
            <span className="mt-1.5 text-[15px] font-semibold">¿Te ayudo?</span>
          </span>
        </button>
      </motion.div>

      {/* ── Saludo (una vez por visita) ── */}
      <AnimatePresence>
        {saludo && textoSaludo && (
          <motion.div
            key="saludo"
            data-asistente
            initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translate3d(0px, 10px, 0px) scale(0.96)' }}
            animate={reducir
              ? { opacity: 1, transition: { duration: 0.2 } }
              : { opacity: 1, transform: 'translate3d(0px, 0px, 0px) scale(1)', transition: { type: 'spring', visualDuration: 0.38, bounce: 0.25 } }}
            exit={reducir
              ? { opacity: 0, transition: { duration: 0.16 } }
              : { opacity: 0, transform: 'translate3d(0px, 6px, 0px) scale(0.98)', transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
            style={{ transformOrigin: '100% 100%' }}
            className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-50 w-[min(280px,calc(100vw-2rem))] sm:bottom-[100px] sm:right-6"
          >
            <div className="relative rounded-[20px] rounded-br-md bg-white shadow-[0_18px_40px_-14px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
              <button type="button" onClick={abrir}
                className="block w-full rounded-[20px] rounded-br-md p-4 pr-11 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  <span aria-hidden="true" className="dk-latido relative h-1.5 w-1.5 rounded-full bg-[#25D366]" />
                  Dekog Home · en línea
                </span>
                <span className="mt-1.5 block text-[14.5px] leading-snug text-neutral-900">{textoSaludo}</span>
              </button>
              <button type="button" onClick={cerrarSaludo} aria-label="Cerrar saludo"
                className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-black">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Marco del chat: se monta una vez (oculto) y desde ahí solo se muestra u oculta ── */}
      {montado && (
        <motion.section
          ref={marcoRef}
          id="dk-chat"
          data-asistente
          role="dialog"
          aria-modal={pantallaCompleta}
          aria-labelledby="dk-chat-titulo"
          tabIndex={-1}
          inert={!abierto}
          onKeyDown={atraparFoco}
          initial="oculto"
          animate={abierto ? 'visible' : 'oculto'}
          variants={variantesMarco(pantallaCompleta, reducir)}
          onAnimationComplete={(definicion) => { if (definicion === 'oculto') setVisible(false); }}
          style={{
            // `visibility` no se anima con framer: llegaría un fotograma tarde y el foco del abrir fallaría.
            visibility: abierto || visible ? 'visible' : 'hidden',
            transformOrigin: pantallaCompleta ? '50% 100%' : 'calc(100% - 30px) calc(100% - 30px)',
          }}
          className={pantallaCompleta ? MARCO_MOVIL : MARCO_ESCRITORIO}
        >
          <ErrorDelPanel onCerrar={cerrar}>
            <Suspense fallback={<PanelEsqueleto onCerrar={cerrar} />}>
              <Panel abierto={abierto} onCerrar={cerrar} pantallaCompleta={pantallaCompleta} marcoRef={marcoRef} />
            </Suspense>
          </ErrorDelPanel>
        </motion.section>
      )}
    </>
  );
}
