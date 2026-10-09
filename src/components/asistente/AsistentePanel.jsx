import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUp, Banknote, BedDouble, ChevronLeft, ChevronRight, MapPin, RotateCcw, Ruler, X } from 'lucide-react';
import { AvatarDekog } from './LogoDekog';
import { CLAVE, Cabecera, IconoWhatsapp, nuevoId } from './comun';
import { propsWhatsapp, textoDeEnlace } from '../../utils/whatsapp';
import { saludoInicial } from '../../../asistente/src/lib/negocio.js';
import { ErrorDelAsistente, pedirAlAsistente } from './red';
import './asistente.css';

/**
 * AsistentePanel — la conversación del chat con IA de Dekog. Va en un archivo aparte que
 * AsistenteChat.jsx descarga en un momento libre (o al tocar el botón) y monta dentro de su marco.
 *
 * Habla con el Worker de Cloudflare del asistente (carpeta asistente/):
 *   POST {API}/chat   → respuesta, tarjetas de producto (o la vitrina de una categoría) y enlace a WhatsApp
 *   POST {API}/datos  → formulario de contacto, directo a la hoja de clientes
 * Los precios en bolívares y el enlace a WhatsApp vienen armados del servidor;
 * aquí solo se pintan. Los datos de contacto van en un formulario aparte y
 * nunca se envían a la IA.
 * La conversación se guarda en sessionStorage para no perderla al navegar.
 */

// Dirección del Worker de Cloudflare. En desarrollo, Vite reenvía /asistente-api
// al Worker local (npm run asistente:dev). VITE_ASISTENTE_API permite cambiarla.
const API = import.meta.env.VITE_ASISTENTE_API
  || (import.meta.env.DEV ? '/asistente-api' : 'https://dekog-asistente.dekog-web.workers.dev');

// El saludo que escribió la dueña, el mismo de WhatsApp (sin sus * y _): sus opciones 1, 2 y 3 valen también aquí
// porque cada pedido avisa `saludado: true` (el saludo no va en el historial: la IA empieza por el cliente).
const BIENVENIDA = saludoInicial;
const SUGERENCIAS = [
  'Quiero ver camas',
  '¿Cuánto es la Toronto queen en bolívares?',
  'Quiero cotizar un proyecto',
  '¿Dónde están ubicados?',
];
const ICONOS_SUGERENCIA = [BedDouble, Banknote, Ruler, MapPin];

// ── Movimiento ──────────────────────────────────────────────────────────────
// Solo opacity y transform escrito entero, con el mismo patrón en origen y destino: así lo anima el
// compositor sin recalcular la maquetación. Con «reducir movimiento» del sistema, solo la opacidad.
const desplazado = (x, y, escala = 1) => `translate3d(${x}px, ${y}px, 0px) scale(${escala})`;

function aparicion(reducir, { x = 0, y = 10, escala = 1, retraso = 0, duracion = 0.32, rebote = 0.12 } = {}) {
  // Sin `delay` propio cuando es 0: si lo lleva, framer ignora el escalonado del padre (staggerChildren).
  const espera = retraso ? { delay: retraso } : {};
  if (reducir) {
    return { oculto: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.2, ...espera } } };
  }
  return {
    oculto: { opacity: 0, transform: desplazado(x, y, escala) },
    visible: { opacity: 1, transform: desplazado(0, 0), transition: { type: 'spring', visualDuration: duracion, bounce: rebote, ...espera } },
  };
}

/** Entra animado solo si es nuevo: lo que se restaura de la sesión aparece quieto. */
const entra = (nuevo, reducir, opciones) => (nuevo
  ? { variants: aparicion(reducir, opciones), initial: 'oculto', animate: 'visible' }
  : {});

/** La respuesta nueva aparece palabra por palabra. El texto completo está en el DOM desde el
 * principio (el lector de pantalla lo lee entero); solo cambia la opacidad de cada palabra. */
function TextoAnimado({ texto, animar }) {
  const entero = String(texto ?? '');
  if (!animar) return entero;
  const partes = entero.split(/(\s+)/);
  const palabras = partes.filter((p) => p.trim()).length;
  if (palabras > 120) return entero;
  const paso = Math.min(22, 700 / palabras);
  let k = 0;
  return partes.map((p, i) => (p.trim()
    ? <span key={i} className="dk-palabra" style={{ '--d': `${Math.round(k++ * paso)}ms` }}>{p}</span>
    : p));
}

function Firma({ escribiendo = false }) {
  return (
    <p className="flex items-center gap-1.5 pl-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b6b6b]">
      <AvatarDekog tam={20} animacion={escribiendo ? 'ola' : undefined} />
      Dekog Home{escribiendo ? ' · escribiendo' : ''}
    </p>
  );
}

// Miniatura WebP de la foto (scripts/miniaturas.py: /muebles/oslo.png → /mini/muebles/oslo.png.webp), unas
// 50 veces más liviana que la original. Ruta relativa: vale en dekog.net, en las vistas previas de Vercel y en
// local. Si falta (un producto nuevo sin miniatura), Vercel responde index.html, la imagen falla y se carga
// la foto original.
const miniatura = (url) => {
  try { return `/mini${new URL(url).pathname}.webp`; } catch { return url; }
};

function Foto({ p, className }) {
  return (
    <img src={miniatura(p.imagen)} alt={p.nombre} width={160} height={200} loading="lazy" decoding="async"
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.dataset.original) { img.dataset.original = '1'; img.src = p.imagen; }
      }}
      className={className} />
  );
}

function DatosTarjeta({ p, tasa }) {
  const detalle = [p.talla ?? p.tipo, p.box].filter(Boolean).join(' · ');
  const etiquetas = [p.tela && 'Tela premium', p.telaPorConfirmar && 'Tela por confirmar', p.puff && 'Con puff'].filter(Boolean);
  return (
    <>
      <p className="truncate text-[12.5px] font-bold uppercase tracking-tight text-neutral-900">{p.nombre}</p>
      {detalle && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-500">{detalle}</p>}
      {etiquetas.length > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-1">
          {etiquetas.map((e) => (
            <span key={e} className="rounded-full bg-[#f4f0ec] px-2 py-0.5 text-[10px] font-semibold leading-tight text-neutral-700">{e}</span>
          ))}
        </p>
      )}
      {p.cantidad > 1 && (
        <p className="mt-1 text-[11px] text-neutral-500">{p.cantidad} × REF {p.unitario.toLocaleString('es-VE')}</p>
      )}
      {p.desde && <p className="mt-2 text-[9px] font-bold uppercase leading-none tracking-[0.18em] text-neutral-500">Desde</p>}
      <p className={`${p.desde ? 'mt-1' : 'mt-2'} text-[17px] font-black leading-none text-black`}>
        <span className="text-[0.72em] font-light">REF </span>{p.ref.toLocaleString('es-VE')}
      </p>
      {p.bs && (
        <>
          <p className="mt-1.5 text-[11px] leading-snug text-neutral-600">Bs {p.bs}</p>
          <p className="text-[10px] leading-snug text-neutral-500">{tasa?.etiqueta ?? 'tasa BCV'} {tasa?.fecha}</p>
        </>
      )}
    </>
  );
}

/** Un solo producto: tarjeta horizontal. */
function TarjetaSola({ p, tasa, nuevo, reducir }) {
  return (
    <motion.div {...entra(nuevo, reducir, { x: 16, y: 0, retraso: 0.1, duracion: 0.35, rebote: 0.15 })}
      className="flex w-fit max-w-[88%] gap-3 rounded-2xl bg-white p-2.5 pr-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
      <div className="h-[100px] w-20 shrink-0 overflow-hidden rounded-xl bg-[#ebe5df]">
        <Foto p={p} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 py-0.5"><DatosTarjeta p={p} tasa={tasa} /></div>
    </motion.div>
  );
}

/** Dos o más productos (hasta 10 en una vitrina): carrusel con fotos grandes (en escritorio, con flechas si no caben). */
function Carrusel({ productos, tasa, nuevo, reducir }) {
  const pistaRef = useRef(null);
  const [bordes, setBordes] = useState({ desborda: false, inicio: true, fin: true });
  const medir = useCallback(() => {
    const el = pistaRef.current;
    if (!el) return;
    const ahora = {
      desborda: el.scrollWidth > el.clientWidth + 1,
      inicio: el.scrollLeft < 4,
      fin: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    };
    setBordes((b) => (b.desborda === ahora.desborda && b.inicio === ahora.inicio && b.fin === ahora.fin ? b : ahora));
  }, []);
  useLayoutEffect(() => {
    medir();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(medir);
    observador.observe(pistaRef.current);
    return () => observador.disconnect();
  }, [medir]);
  const mover = (sentido) => pistaRef.current?.scrollBy({ left: sentido * 174, behavior: reducir ? 'auto' : 'smooth' });
  const flecha = 'absolute top-[84px] z-10 hidden h-8 w-8 place-items-center rounded-full bg-white/95 text-neutral-900 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)] ring-1 ring-black/10 transition hover:bg-white active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black [@media(pointer:fine)]:grid';
  return (
    <div className="relative">
      <div ref={pistaRef} onScroll={medir} role="group" aria-label="Productos sugeridos" tabIndex={0}
        className="-mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-3 px-3 pb-1 scrollbar-hide overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/60 sm:-mx-4 sm:scroll-px-4 sm:px-4">
        {productos.map((p, i) => (
          <motion.article key={`${p.id}-${p.talla}-${p.box ?? ''}-${i}`}
            {...entra(nuevo, reducir, { x: 16, y: 0, retraso: 0.1 + i * 0.06, duracion: 0.35, rebote: 0.15 })}
            className="w-[156px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_24px_-16px_rgba(0,0,0,0.35)] ring-1 ring-black/5 sm:w-[164px]">
            {/* Alto fijo (4:5 del ancho) en vez de aspect-ratio: así también se ve en iPhone viejos. */}
            <div className="relative h-[195px] bg-[#ebe5df] sm:h-[205px]">
              <Foto p={p} className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="p-3"><DatosTarjeta p={p} tasa={tasa} /></div>
          </motion.article>
        ))}
      </div>
      {bordes.desborda && !bordes.inicio && (
        <button type="button" onClick={() => mover(-1)} aria-label="Productos anteriores" className={`${flecha} -left-1`}>
          <ChevronLeft size={18} />
        </button>
      )}
      {bordes.desborda && !bordes.fin && (
        <button type="button" onClick={() => mover(1)} aria-label="Más productos" className={`${flecha} -right-1`}>
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}

/** «Escribiendo…», con avisos si la respuesta tarda (la petición puede durar hasta 40 s). */
function Escribiendo({ reducir }) {
  const [espera, setEspera] = useState(0);
  useEffect(() => {
    const a = setTimeout(() => setEspera(1), 8000);
    const b = setTimeout(() => setEspera(2), 20000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  return (
    <motion.div {...entra(true, reducir, { y: 6, duracion: 0.25 })} className="space-y-1.5">
      <Firma escribiendo />
      <div role="status" className="flex w-[68px] items-center justify-center gap-1.5 rounded-[20px] rounded-tl-md bg-white py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]">
        {[0, 150, 300].map((d) => (
          <span key={d} className="dk-punto h-1.5 w-1.5 rounded-full bg-neutral-700" style={{ animationDelay: `${d}ms` }} />
        ))}
        <span className="sr-only">Dekog está escribiendo…</span>
      </div>
      {espera === 1 && <p className="pl-1 text-[12px] text-[#6b6b6b]">Sigo buscando la mejor opción para ti…</p>}
      {espera === 2 && (
        <p className="pl-1 text-[12px] text-[#6b6b6b]">
          Está tardando más de lo normal. Puedes esperar o{' '}
          <a {...propsWhatsapp()} className="font-semibold underline hover:text-black">escribirnos por WhatsApp</a>.
        </p>
      )}
    </motion.div>
  );
}

/**
 * Formulario de contacto. Cuando lo ofrece la IA aparece primero compacto (pregunta +
 * "Sí, dejar mis datos" / "Ahora no") para no tapar el chat; los campos se abren solo si el
 * cliente dice que sí, o directamente si lo pidió desde el enlace del pie (`expandido`).
 */
function FormularioContacto({ onEnviar, onDescartar, expandido: expandidoInicial = false }) {
  const [expandido, setExpandido] = useState(expandidoInicial);
  const [datos, setDatos] = useState({ nombre: '', telefono: '', ciudad: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);
  useEffect(() => {
    if (expandido) formRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [expandido]);
  const campo = (nombre) => ({
    value: datos[nombre],
    onChange: (e) => setDatos((d) => ({ ...d, [nombre]: e.target.value })),
    // 16 px en teléfono: con menos, Safari de iPhone hace zoom al tocar el campo.
    className: 'h-11 w-full rounded-xl border border-black/10 bg-[#f7f5f2] px-3.5 text-[16px] text-neutral-900 outline-none transition placeholder:text-[#6b6b6b] focus:border-black focus:bg-white sm:text-[14px]',
  });
  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    const problema = await onEnviar(datos);
    if (problema) setError(problema);
    setEnviando(false);
  }
  if (!expandido) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
        <p className="text-[13.5px] font-semibold text-neutral-900">¿Quieres que una asesora te contacte?</p>
        <p className="mt-0.5 text-[12.5px] text-neutral-600">Te escribe por WhatsApp para ayudarte con tu pedido.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onDescartar} className="h-11 rounded-xl px-4 text-[13.5px] font-medium text-neutral-700 ring-1 ring-black/15 transition hover:ring-black">
            Ahora no
          </button>
          <button type="button" onClick={() => setExpandido(true)} className="h-11 flex-1 rounded-xl bg-black text-[13.5px] font-semibold text-white transition hover:bg-black/85 active:scale-[0.98]">
            Sí, dejar mis datos
          </button>
        </div>
      </div>
    );
  }
  return (
    <form ref={formRef} onSubmit={enviar} className="space-y-2.5 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13.5px] font-semibold text-neutral-900">Tus datos para que una asesora te contacte</p>
        <button type="button" onClick={onDescartar} aria-label="Cerrar el formulario" title="Cerrar" className="-mr-1.5 -mt-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-neutral-500 transition hover:bg-black/5 hover:text-black">
          <X size={16} />
        </button>
      </div>
      <input {...campo('nombre')} placeholder="Tu nombre" required maxLength={80} autoComplete="name" aria-label="Tu nombre" autoFocus />
      <input {...campo('telefono')} placeholder="Tu teléfono (WhatsApp)" required maxLength={30} inputMode="tel" autoComplete="tel" aria-label="Tu teléfono" />
      <input {...campo('ciudad')} placeholder="Tu ciudad (opcional)" maxLength={60} aria-label="Tu ciudad" />
      {error && <p role="alert" className="text-[12px] text-red-700">{error}</p>}
      <button type="submit" disabled={enviando} className="h-11 w-full rounded-xl bg-black text-[13.5px] font-semibold text-white transition hover:bg-black/85 disabled:opacity-50">
        {enviando ? 'Enviando…' : 'Enviar mis datos'}
      </button>
      <p className="text-center text-[11px] text-neutral-600">Solo los usa Dekog para contactarte.</p>
    </form>
  );
}

/** Preguntas sugeridas: en el teléfono, píldoras que se deslizan; en escritorio, baldosas de 2 × 2. */
function Sugerencias({ onElegir, animar, reducir }) {
  return (
    <div className="relative shrink-0">
      <motion.div variants={{ oculto: {}, visible: { transition: { delayChildren: 0.3, staggerChildren: 0.04 } } }}
        initial="oculto" animate={animar ? 'visible' : 'oculto'}
        className="flex gap-2 overflow-x-auto px-3 pb-3 pt-1 scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-4">
        {SUGERENCIAS.map((s, i) => {
          const Icono = ICONOS_SUGERENCIA[i];
          return (
            <motion.div key={s} variants={aparicion(reducir, { y: 8, duracion: 0.3 })} className="shrink-0">
              <button type="button" onClick={() => onElegir(s)}
                className="flex h-10 w-full items-center gap-2 rounded-full bg-white px-4 text-[13px] font-medium text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/10 transition hover:ring-black active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black sm:h-full sm:min-h-[52px] sm:items-start sm:rounded-2xl sm:px-3.5 sm:py-2.5 sm:text-left sm:leading-snug">
                <Icono className="mt-px h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
                <span>{s}</span>
              </button>
            </motion.div>
          );
        })}
      </motion.div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#f4f0ec] to-transparent sm:hidden" />
    </div>
  );
}

/** Caja de escritura con su propio estado: teclear no vuelve a pintar la conversación. */
function CajaEscritura({ cargando, onEnviar, entradaRef, registrado, onPedirFormulario }) {
  const [texto, setTexto] = useState('');
  return (
    <div className="shrink-0 border-t border-black/[0.06] bg-white px-3 pt-2.5 sm:px-4">
      <form
        onSubmit={(e) => { e.preventDefault(); if (onEnviar(texto)) setTexto(''); }}
        className="flex h-[52px] items-center gap-2 rounded-full bg-[#f4f0ec] pl-4 pr-1.5 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-black/15 sm:h-12"
      >
        <input
          ref={entradaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={800}
          placeholder="Escribe tu pregunta…"
          aria-label="Tu mensaje"
          enterKeyHint="send"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-neutral-900 outline-none placeholder:text-[#6b6b6b] sm:text-[14.5px]"
        />
        <button type="submit" disabled={cargando || !texto.trim()} aria-label="Enviar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white transition duration-200 ease-out disabled:scale-90 disabled:bg-black/15 enabled:hover:scale-105 enabled:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2">
          <ArrowUp size={18} strokeWidth={2.4} />
        </button>
      </form>
      <p className="px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 text-center text-[11px] leading-snug text-neutral-600">
        Asistente con IA · una asesora confirma tu pedido.
        {!registrado && (
          <>
            {' '}No escribas aquí tu teléfono ni tu dirección:{' '}
            <button type="button" onClick={onPedirFormulario} className="font-semibold underline hover:text-black">déjalos en el formulario</button>.
          </>
        )}
      </p>
    </div>
  );
}

const esTactil = () => window.matchMedia('(pointer: coarse)').matches;

/** Lo que viaja a la IA: ni los errores ni la confirmación del formulario. */
const paraLaIa = (lista) => lista
  .filter((i) => !i.error && !i.registrado)
  // La nota de la vitrina («[Vitrina «Camas»: Toronto, …]») le dice al servidor y a la IA qué modelos vio.
  .map((i) => ({ role: i.rol === 'cliente' ? 'user' : 'assistant', content: i.nota ? `${i.texto}\n\n${i.nota}` : i.texto }));

/** Burbuja de error: qué pasó, dicho para el cliente, y si tiene sentido «Reintentar». */
function burbujaDeError(e) {
  const conocido = e instanceof ErrorDelAsistente;
  // Un error de NUESTRO código (no de la red) ya no se disfraza de «Se cortó la conexión».
  if (!conocido) console.error('Error inesperado del chat:', e);
  const reintentar = !conocido || ['red', 'tiempo', 'incompleta', 'servidor'].includes(e.tipo);
  const motivo = !conocido
    ? 'No pude mostrar la respuesta.'
    : e.tipo === 'red' ? 'No pude conectarme con el asistente (puede ser la señal).' : e.message;
  // El Worker a veces ya trae «…escríbenos por WhatsApp»: no se repite.
  const cierre = /whatsapp/i.test(motivo) ? ''
    : reintentar ? ' Toca «Reintentar» o escríbenos directo por WhatsApp.' : ' Escríbenos directo por WhatsApp.';
  return {
    rol: 'asistente',
    error: true,
    reintentar,
    tipoError: conocido ? e.tipo : 'interno',
    texto: `${motivo}${cierre}`,
    whatsapp: { texto: 'Hola, tengo una consulta sobre sus servicios.', linea: 'Asesoras' },
  };
}

export default function AsistentePanel({ abierto, onCerrar, pantallaCompleta, marcoRef }) {
  const reducir = useReducedMotion();
  const [items, setItems] = useState(() => {
    try {
      const guardados = JSON.parse(sessionStorage.getItem(CLAVE));
      return Array.isArray(guardados) ? guardados : [];
    } catch { return []; }
  });
  // Identifica la conversación en la hoja de clientes (una fila por conversación).
  const [conversacion, setConversacion] = useState(() => {
    try {
      const guardada = sessionStorage.getItem(`${CLAVE}-id`);
      if (guardada) return guardada;
      const nueva = nuevoId();
      sessionStorage.setItem(`${CLAVE}-id`, nueva);
      return nueva;
    } catch {
      return nuevoId();
    }
  });
  const [registrado, setRegistrado] = useState(() => {
    try { return sessionStorage.getItem(`${CLAVE}-registrado`) === '1'; } catch { return false; }
  });
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  // "Ahora no": el formulario no vuelve a aparecer solo en esta visita (el enlace del pie sigue ahí).
  const [formularioDescartado, setFormularioDescartado] = useState(() => {
    try { return sessionStorage.getItem(`${CLAVE}-descartado`) === '1'; } catch { return false; }
  });
  const [cargando, setCargando] = useState(false);
  // El panel se monta oculto antes de que el cliente lo abra: la bienvenida se anima en la primera apertura.
  const [vistoAbierto, setVistoAbierto] = useState(abierto);
  if (abierto && !vistoAbierto) setVistoAbierto(true);

  const logRef = useRef(null);
  const entradaRef = useRef(null);
  const ultimoGrupoRef = useRef(null);
  const pegadoAbajo = useRef(true);
  const primeraApertura = useRef(true);
  const idInicial = useRef(conversacion);
  // Mensajes que ya estaban (restaurados de la sesión): esos no se animan.
  const iniciales = useRef(null);
  if (!iniciales.current) iniciales.current = new Set(items);

  const bajarAlFinal = useCallback((comportamiento) => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: comportamiento });
  }, []);

  function descartarFormulario() {
    setFormularioAbierto(false);
    setFormularioDescartado(true);
    try { sessionStorage.setItem(`${CLAVE}-descartado`, '1'); } catch { /* modo privado */ }
  }

  /** "Nueva conversación": vuelve al saludo y a las preguntas sugeridas, con otro id para la hoja. */
  function reiniciar() {
    if (cargando) return;
    const nueva = nuevoId();
    setItems([]);
    setConversacion(nueva);
    setRegistrado(false);
    setFormularioAbierto(false);
    setFormularioDescartado(false);
    try {
      sessionStorage.setItem(`${CLAVE}-id`, nueva);
      sessionStorage.removeItem(`${CLAVE}-registrado`);
      sessionStorage.removeItem(`${CLAVE}-descartado`);
    } catch { /* modo privado */ }
  }

  // Tras «Nueva conversación», el cursor vuelve a la caja (en el teléfono no: abriría el teclado).
  useEffect(() => {
    if (conversacion !== idInicial.current && !esTactil()) entradaRef.current?.focus({ preventScroll: true });
  }, [conversacion]);

  useEffect(() => {
    try { sessionStorage.setItem(CLAVE, JSON.stringify(items)); } catch { /* modo privado: no se guarda */ }
  }, [items]);

  // Al llegar una respuesta, que se lea desde su principio (con tarjetas y formulario puede no caber
  // entera en un teléfono); al enviar o mientras escribe, abajo del todo. Con scrollTo del contenedor:
  // scrollIntoView movía la página entera en iPhone.
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const comportamiento = reducir ? 'auto' : 'smooth';
    const grupo = ultimoGrupoRef.current;
    if (!cargando && items[items.length - 1]?.rol === 'asistente' && grupo) {
      const arriba = log.scrollTop + grupo.getBoundingClientRect().top - log.getBoundingClientRect().top - 12;
      log.scrollTo({ top: Math.min(arriba, log.scrollHeight - log.clientHeight), behavior: comportamiento });
    } else {
      bajarAlFinal(comportamiento);
    }
  }, [items, cargando, reducir, bajarAlFinal]);

  // Al abrir: la primera vez, a lo último de la conversación; el foco, a la caja de texto en escritorio
  // y al panel en el teléfono (abrir el teclado solo taparía la bienvenida y las sugerencias).
  useLayoutEffect(() => {
    if (!abierto) return;
    if (primeraApertura.current) {
      primeraApertura.current = false;
      bajarAlFinal('auto');
    }
    (esTactil() ? marcoRef.current : entradaRef.current)?.focus({ preventScroll: true });
  }, [abierto, bajarAlFinal, marcoRef]);

  // Teclado del teléfono: el panel se ajusta a la parte visible de la pantalla (visualViewport),
  // para que la caja de escritura nunca quede debajo del teclado.
  useEffect(() => {
    const vv = window.visualViewport;
    const marco = marcoRef.current;
    if (!abierto || !pantallaCompleta || !vv || !marco) return undefined;
    let cuadro = 0;
    const ajustar = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        marco.style.setProperty('--dk-vvh', `${Math.round(vv.height)}px`);
        marco.style.setProperty('--dk-vvtop', `${Math.round(vv.offsetTop)}px`);
        if (pegadoAbajo.current) bajarAlFinal('auto');
      });
    };
    ajustar();
    vv.addEventListener('resize', ajustar);
    vv.addEventListener('scroll', ajustar);
    return () => {
      cancelAnimationFrame(cuadro);
      vv.removeEventListener('resize', ajustar);
      vv.removeEventListener('scroll', ajustar);
      marco.style.removeProperty('--dk-vvh');
      marco.style.removeProperty('--dk-vvtop');
    };
  }, [abierto, pantallaCompleta, bajarAlFinal, marcoRef]);

  // Al abrir, se adelanta la conexión con el Worker (DNS + TLS) para que el primer mensaje salga antes.
  useEffect(() => {
    if (!abierto) return;
    try {
      const origen = new URL(API, window.location.href).origin;
      if (origen === window.location.origin || document.querySelector(`link[rel="preconnect"][href="${origen}"]`)) return;
      const enlace = document.createElement('link');
      enlace.rel = 'preconnect';
      enlace.href = origen;
      enlace.crossOrigin = '';
      document.head.appendChild(enlace);
    } catch { /* no es imprescindible */ }
  }, [abierto]);

  /** Devuelve true si aceptó el mensaje (la caja de escritura se vacía solo entonces). */
  function enviar(mensaje) {
    const limpio = mensaje.trim();
    if (!limpio || cargando) return false;
    const conNuevo = [...items, { rol: 'cliente', texto: limpio }];
    setItems(conNuevo);
    setCargando(true);
    pedirRespuesta(conNuevo);
    return true;
  }

  /** Pide la respuesta de la conversación tal como está. Con un reintento silencioso ante cortes de red
   * (ver red.js): el mensaje del cliente NO se repite, se reenvía la misma conversación. */
  async function pedirRespuesta(conversacionActual) {
    try {
      const j = await pedirAlAsistente(`${API}/chat`, { mensajes: paraLaIa(conversacionActual), saludado: true }, {
        valida: (d) => typeof d.respuesta === 'string',
      });
      // Si pidió ver una categoría llega `vitrina`: hasta 10 tarjetas, el enlace al catálogo filtrado y la nota.
      const tarjetas = j.vitrina?.productos ?? j.productos ?? [];
      // Si son exactamente las mismas tarjetas que la última vez (mismo modelo, medida, box, tela, puff y
      // precio), no se repiten: el cliente ya las tiene a la vista y repetirlas se siente robótico.
      const clave = tarjetas
        .map((p) => [p.id, p.talla, p.box, p.tela, p.puff, p.telaPorConfirmar, p.cantidad, p.ref].join('|')).join(';');
      setItems((a) => [...a, {
        rol: 'asistente',
        texto: j.respuesta,
        ...(clave && clave === [...a].reverse().find((i) => i.claveTarjeta)?.claveTarjeta
          ? { productos: [] }
          : { productos: tarjetas, claveTarjeta: clave || undefined, nota: j.vitrina?.nota }),
        catalogo: j.vitrina ? { ruta: j.vitrina.ruta, texto: j.vitrina.boton } : undefined,
        whatsapp: j.whatsapp,
        tasa: j.tasa,
        formulario: j.formulario,
        emergencia: j.emergencia,
        interes: j.interes,
        resumen: j.resumen,
      }]);
    } catch (e) {
      setItems((a) => [...a, burbujaDeError(e)]);
    } finally {
      setCargando(false);
    }
  }

  /** «Reintentar» de la burbuja de error: vuelve a pedir la respuesta del último mensaje sin repetirlo. */
  function reintentar() {
    if (cargando) return;
    const ultimo = items[items.length - 1];
    const sinError = ultimo?.error ? items.slice(0, -1) : items;
    if (sinError[sinError.length - 1]?.rol !== 'cliente') return;
    setItems(sinError);
    setCargando(true);
    pedirRespuesta(sinError);
  }

  // Envía el formulario de contacto. Devuelve un texto de error, o null si se guardó.
  async function enviarDatos(datos) {
    // Lo último que mostró interés, por separado, sin contar respuestas de emergencia.
    const utiles = [...items].reverse().filter((i) => i.rol === 'asistente' && !i.emergencia && !i.error);
    const interes = utiles.find((i) => i.interes)?.interes ?? '';
    const resumen = utiles.find((i) => i.resumen)?.resumen ?? '';
    try {
      // Reintentar no duplica la fila: la hoja actualiza por id de conversación (lib/hoja.js).
      await pedirAlAsistente(`${API}/datos`, { conversacion, ...datos, interes, resumen }, {
        plazoMs: 30000, // el Worker puede reintentar la hoja (2 × 10 s)
        valida: (d) => d.guardado === true,
      });
    } catch (e) {
      return e instanceof ErrorDelAsistente && ['pedido', 'limite', 'servidor'].includes(e.tipo)
        ? e.message
        : 'No pudimos guardar tus datos. Escríbenos por WhatsApp.';
    }
    setRegistrado(true);
    setFormularioAbierto(false);
    try { sessionStorage.setItem(`${CLAVE}-registrado`, '1'); } catch { /* modo privado */ }
    setItems((a) => [...a, { rol: 'asistente', registrado: true, texto: '¡Listo! Tus datos quedaron registrados. Una asesora de Dekog te contactará pronto.' }]);
    return null;
  }

  // El formulario se ofrece si la IA ve interés (y el cliente no dijo "Ahora no") o si lo pidió en el pie.
  // Sigue montado mientras el asistente responde, para no perder lo que el cliente ya escribió.
  // Sin findLastIndex ni .at(): no existen antes de iOS 15.4 y romperían el chat en iPhone viejos.
  let ultimoAsistente = -1;
  for (let k = items.length - 1; k >= 0; k -= 1) {
    if (items[k].rol === 'asistente') { ultimoAsistente = k; break; }
  }
  const mostrarFormulario = !registrado
    && (formularioAbierto || (!formularioDescartado && Boolean(items[ultimoAsistente]?.formulario)));
  const bienvenida = aparicion(reducir, { y: 10, retraso: 0.22, duracion: 0.32 });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Cabecera onCerrar={onCerrar} onReiniciar={items.length > 0 ? reiniciar : undefined} cargando={cargando} />

      <div
        ref={logRef}
        onScroll={() => {
          const log = logRef.current;
          // Puede llegar un scroll tardío sin la referencia (pasó en WebKit al navegar desde el botón del catálogo).
          if (log) pegadoAbajo.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
        }}
        role="log"
        aria-live="polite"
        aria-label="Conversación con el asistente"
        className="dk-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4 pt-5 sm:px-4"
      >
        {/* Presentación: centrada en el hueco libre; la conversación queda abajo, junto a la caja de escritura. */}
        <motion.div key={`intro-${conversacion}`} variants={aparicion(reducir, { y: 8, duracion: 0.4 })}
          initial="oculto" animate={vistoAbierto ? 'visible' : 'oculto'}
          className="my-auto flex flex-col items-center py-6 text-center">
          <AvatarDekog tam={56} animacion={vistoAbierto ? 'entra' : undefined} className="shadow-[0_12px_28px_-12px_rgba(0,0,0,0.6)]" />
          <p className="mt-3.5 text-[17px] font-light uppercase leading-none tracking-[0.32em] text-neutral-900">Dekog Home</p>
          <p className="mt-2 text-[12px] text-[#6b6b6b]">Asistente virtual con IA · te respondo al instante</p>
        </motion.div>

        <div className="space-y-3">
          <motion.div key={`bienvenida-${conversacion}`} variants={bienvenida} initial="oculto"
            animate={vistoAbierto ? 'visible' : 'oculto'} className="space-y-2">
            <Firma />
            <div className="w-fit max-w-[88%] whitespace-pre-line break-words rounded-[20px] rounded-tl-md bg-white px-4 py-2.5 text-[15px] leading-[1.5] text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] sm:text-[14.5px]">
              {BIENVENIDA}
            </div>
          </motion.div>

          {items.map((m, i) => {
            const nuevo = !iniciales.current.has(m);
            if (m.rol === 'cliente') {
              return (
                <motion.div key={i} {...entra(nuevo, reducir, { y: 10, escala: 0.98, duracion: 0.3 })} style={{ transformOrigin: '100% 100%' }}
                  className="ml-auto w-fit max-w-[85%] whitespace-pre-line break-words rounded-[20px] rounded-tr-md bg-black px-4 py-2.5 text-[15px] leading-[1.5] text-white sm:text-[14.5px]">
                  {m.texto}
                </motion.div>
              );
            }
            const tono = m.error
              ? 'bg-amber-50 text-amber-900 ring-amber-900/10'
              : m.registrado ? 'bg-green-50 text-green-900 ring-green-900/10' : 'bg-white text-neutral-900 ring-black/[0.04]';
            const productos = m.productos ?? [];
            return (
              <div key={i} ref={i === ultimoAsistente ? ultimoGrupoRef : undefined} className="space-y-2">
                <Firma />
                <motion.div {...entra(nuevo, reducir, { y: 10, escala: 0.98, duracion: 0.32 })} style={{ transformOrigin: '0% 0%' }}
                  className={`w-fit max-w-[88%] whitespace-pre-line break-words rounded-[20px] rounded-tl-md px-4 py-2.5 text-[15px] leading-[1.5] shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 sm:text-[14.5px] ${tono}`}>
                  <TextoAnimado texto={m.texto} animar={nuevo && !reducir} />
                </motion.div>
                {m.error && m.reintentar && i === items.length - 1 && !cargando && (
                  <button type="button" onClick={reintentar}
                    className="ml-1 flex h-10 w-fit items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/15 transition hover:ring-black active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                    <RotateCcw size={15} aria-hidden="true" />
                    Reintentar
                  </button>
                )}
                {productos.length === 1 && <TarjetaSola p={productos[0]} tasa={m.tasa} nuevo={nuevo} reducir={reducir} />}
                {productos.length > 1 && <Carrusel productos={productos} tasa={m.tasa} nuevo={nuevo} reducir={reducir} />}
                {m.catalogo && (
                  // El catálogo de la página ya filtrado (Home.jsx lee ?categoria=). En el teléfono el chat tapa la
                  // página, así que se cierra (la conversación se conserva en sessionStorage).
                  <motion.div {...entra(nuevo, reducir, { x: 16, y: 0, retraso: 0.16 + productos.length * 0.06, duracion: 0.35, rebote: 0.15 })}>
                    <Link to={m.catalogo.ruta} onClick={() => { if (pantallaCompleta) onCerrar(); }}
                      className="flex h-11 w-fit items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/10 transition hover:ring-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                      {m.catalogo.texto} en el catálogo
                      <ChevronRight size={16} aria-hidden="true" />
                    </Link>
                  </motion.div>
                )}
                {m.whatsapp && (
                  <motion.div {...entra(nuevo, reducir, { x: 16, y: 0, retraso: 0.16 + productos.length * 0.06, duracion: 0.35, rebote: 0.15 })}>
                    {/* El pase del asistente (o un error): se elige la línea, con el resumen ya escrito. */}
                    <a {...propsWhatsapp(m.whatsapp.texto ?? textoDeEnlace(m.whatsapp.url))}
                      className={`relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#0e7a3e] px-4 text-[14px] font-semibold text-white shadow-[0_12px_24px_-14px_rgba(14,122,62,0.9)] transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f0ec]${nuevo ? ' dk-brillo' : ''}`}>
                      <IconoWhatsapp />
                      Seguir por WhatsApp con una asesora
                    </a>
                  </motion.div>
                )}
              </div>
            );
          })}

          {mostrarFormulario && (
            <motion.div {...entra(true, reducir, { y: 10, retraso: 0.2, duracion: 0.32 })}>
              <FormularioContacto
                key={formularioAbierto ? 'pedido' : 'ofrecido'} // el enlace del pie lo abre expandido aunque ya se viera compacto
                onEnviar={enviarDatos}
                onDescartar={descartarFormulario}
                expandido={formularioAbierto}
              />
            </motion.div>
          )}

          {cargando && <Escribiendo reducir={reducir} />}
        </div>
      </div>

      {/* Claves distintas entre hermanos: si las dos fueran el id, React confundiría la caja con las
          sugerencias al quitarlas y estas se quedarían en pantalla. */}
      {items.length === 0 && <Sugerencias key={`sugerencias-${conversacion}`} onElegir={enviar} animar={vistoAbierto} reducir={reducir} />}

      <CajaEscritura
        key={`caja-${conversacion}`} // «Nueva conversación» también vacía lo que estuviera escrito
        cargando={cargando}
        onEnviar={enviar}
        entradaRef={entradaRef}
        registrado={registrado}
        onPedirFormulario={() => setFormularioAbierto(true)}
      />
    </div>
  );
}
