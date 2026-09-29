import React, { useEffect, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';

/**
 * AsistenteChat — chat con IA de Dekog (esquina inferior derecha).
 *
 * Habla con el Worker de Cloudflare del asistente (carpeta asistente/):
 *   POST {API}/chat   → respuesta, tarjetas de producto y enlace a WhatsApp
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

const CLAVE = 'dekog-asistente-chat';
const WHATSAPP_DIRECTO = 'https://wa.me/584145847791?text=Hola,%20tengo%20una%20consulta%20sobre%20sus%20servicios.';
const BIENVENIDA = '¡Hola! Soy el asistente de Dekog 👋 Te ayudo con modelos, medidas y precios (también en bolívares) o con tu proyecto de arquitectura. ¿Qué estás buscando?';
const SUGERENCIAS = [
  'Quiero ver camas',
  '¿Cuánto es la Toronto queen en bolívares?',
  'Quiero cotizar un proyecto',
  '¿Dónde están ubicados?',
];

function IconoWhatsapp({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function FormularioContacto({ onEnviar }) {
  const [datos, setDatos] = useState({ nombre: '', telefono: '', ciudad: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const campo = (nombre) => ({
    value: datos[nombre],
    onChange: (e) => setDatos((d) => ({ ...d, [nombre]: e.target.value })),
    className: 'w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[13.5px] outline-none focus:border-black',
  });
  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    const problema = await onEnviar(datos);
    if (problema) setError(problema);
    setEnviando(false);
  }
  return (
    <form onSubmit={enviar} className="space-y-2 rounded-xl border border-black/10 bg-white p-3 shadow-sm">
      <p className="text-[13px] font-semibold">¿Quieres que una asesora te contacte?</p>
      <input {...campo('nombre')} placeholder="Tu nombre" required maxLength={80} autoComplete="name" aria-label="Tu nombre" />
      <input {...campo('telefono')} placeholder="Tu teléfono (WhatsApp)" required maxLength={30} inputMode="tel" autoComplete="tel" aria-label="Tu teléfono" />
      <input {...campo('ciudad')} placeholder="Tu ciudad (opcional)" maxLength={60} aria-label="Tu ciudad" />
      {error && <p className="text-[12px] text-red-700">{error}</p>}
      <button type="submit" disabled={enviando} className="w-full rounded-lg bg-black py-2 text-[13px] font-semibold text-white disabled:opacity-50">
        {enviando ? 'Enviando…' : 'Enviar mis datos'}
      </button>
      <p className="text-center text-[10.5px] text-gray-400">Solo los usa Dekog para contactarte.</p>
    </form>
  );
}

function TarjetaProducto({ p, tasa }) {
  return (
    <div className="flex gap-3 rounded-xl bg-white border border-black/10 p-2.5 shadow-sm">
      <img src={p.imagen} alt={p.nombre} loading="lazy" className="h-16 w-16 shrink-0 rounded-lg bg-[#f4f0ec] object-contain" />
      <div className="min-w-0 text-[13px] leading-snug">
        <p className="font-semibold text-black">{p.nombre}</p>
        <p className="text-[11px] text-gray-500">{p.talla ?? p.tipo}</p>
        <p className="mt-1 font-semibold">{p.desde ? 'Desde ' : ''}REF {p.ref.toLocaleString('es-VE')}</p>
        {p.bs && (
          <p className="text-[11px] text-gray-600">Bs {p.bs} · {tasa?.etiqueta ?? 'tasa BCV'} {tasa?.fecha}</p>
        )}
      </div>
    </div>
  );
}

export default function AsistenteChat() {
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(CLAVE)) ?? []; } catch { return []; }
  });
  // Identifica la conversación en la hoja de clientes (una fila por conversación).
  const [conversacion] = useState(() => {
    try {
      const guardada = sessionStorage.getItem(`${CLAVE}-id`);
      if (guardada) return guardada;
      const nueva = crypto.randomUUID();
      sessionStorage.setItem(`${CLAVE}-id`, nueva);
      return nueva;
    } catch {
      return crypto.randomUUID();
    }
  });
  const [registrado, setRegistrado] = useState(() => {
    try { return sessionStorage.getItem(`${CLAVE}-registrado`) === '1'; } catch { return false; }
  });
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const finRef = useRef(null);
  const entradaRef = useRef(null);

  useEffect(() => {
    try { sessionStorage.setItem(CLAVE, JSON.stringify(items)); } catch { /* modo privado: no se guarda */ }
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [items, cargando, abierto]);

  useEffect(() => {
    if (abierto) entradaRef.current?.focus();
  }, [abierto]);

  async function enviar(mensaje) {
    const limpio = mensaje.trim();
    if (!limpio || cargando) return;
    const conNuevo = [...items, { rol: 'cliente', texto: limpio }];
    setItems(conNuevo);
    setTexto('');
    setCargando(true);
    try {
      const r = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensajes: conNuevo
            .filter((i) => !i.error)
            .map((i) => ({ role: i.rol === 'cliente' ? 'user' : 'assistant', content: i.texto })),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No pude responder en este momento.');
      setItems((a) => [...a, {
        rol: 'asistente',
        texto: j.respuesta,
        productos: j.productos,
        whatsapp: j.whatsapp,
        tasa: j.tasa,
        formulario: j.formulario,
        interes: j.interes,
        resumen: j.resumen,
      }]);
    } catch (e) {
      setItems((a) => [...a, {
        rol: 'asistente',
        error: true,
        texto: `${e.message} Si prefieres, escríbenos directo por WhatsApp.`,
        whatsapp: { url: WHATSAPP_DIRECTO, linea: 'Línea 01' },
      }]);
    } finally {
      setCargando(false);
    }
  }

  // Envía el formulario de contacto. Devuelve un texto de error, o null si se guardó.
  async function enviarDatos(datos) {
    const contexto = [...items].reverse().find((i) => i.rol === 'asistente' && (i.interes || i.resumen)) ?? {};
    try {
      const r = await fetch(`${API}/datos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversacion, ...datos, interes: contexto.interes ?? '', resumen: contexto.resumen ?? '' }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return j.error || 'No pudimos guardar tus datos. Escríbenos por WhatsApp.';
    } catch {
      return 'No pudimos guardar tus datos. Escríbenos por WhatsApp.';
    }
    setRegistrado(true);
    setFormularioAbierto(false);
    try { sessionStorage.setItem(`${CLAVE}-registrado`, '1'); } catch { /* modo privado */ }
    const nombre = datos.nombre.trim().split(' ')[0];
    setItems((a) => [...a, { rol: 'asistente', registrado: true, texto: `¡Listo, ${nombre}! Tus datos quedaron registrados. Una asesora de Dekog te contactará pronto.` }]);
    return null;
  }

  const ultimoAsistente = items.findLastIndex((i) => i.rol === 'asistente');
  const mostrarFormulario = !registrado && !cargando
    && (formularioAbierto || Boolean(items[ultimoAsistente]?.formulario));

  return (
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-black py-3 pl-3 pr-5 text-white shadow-2xl transition-transform duration-300 hover:scale-105"
          aria-label="Abrir el asistente de Dekog"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white font-display text-lg font-bold text-black">
            D
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-black bg-[#25D366]" />
          </span>
          <span className="text-sm font-semibold">¿Te ayudo?</span>
        </button>
      )}

      {abierto && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#f4f0ec] shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[640px] sm:max-h-[calc(100vh-3rem)] sm:w-[390px] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-black/10">
          {/* Encabezado */}
          <div className="flex items-center gap-3 bg-black px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-display text-lg font-bold text-black">D</span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[15px] font-semibold tracking-wide">Dekog Home</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
                Asistente · responde al instante
              </p>
            </div>
            <a href={WHATSAPP_DIRECTO} target="_blank" rel="noopener noreferrer" className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Hablar con una asesora por WhatsApp" title="Hablar con una asesora">
              <IconoWhatsapp />
            </a>
            <button type="button" onClick={() => setAbierto(false)} className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Cerrar el asistente">
              <X size={20} />
            </button>
          </div>

          {/* Conversación */}
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
            <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[14px] leading-relaxed shadow-sm">{BIENVENIDA}</div>

            {items.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGERENCIAS.map((s) => (
                  <button key={s} type="button" onClick={() => enviar(s)} className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-[12.5px] hover:border-black">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {items.map((m, i) => (m.rol === 'cliente' ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-black px-3.5 py-2.5 text-[14px] leading-relaxed text-white">{m.texto}</div>
            ) : (
              <div key={i} className="max-w-[92%] space-y-2">
                <div className={`rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[14px] leading-relaxed shadow-sm ${m.error ? 'bg-amber-50 text-amber-900' : m.registrado ? 'bg-green-50 text-green-900' : 'bg-white'}`}>{m.texto}</div>
                {m.productos?.map((p) => <TarjetaProducto key={`${p.id}-${p.talla}`} p={p} tasa={m.tasa} />)}
                {m.whatsapp && (
                  <a href={m.whatsapp.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:brightness-95">
                    <IconoWhatsapp />
                    Seguir por WhatsApp con una asesora
                  </a>
                )}
              </div>
            )))}

            {mostrarFormulario && <FormularioContacto onEnviar={enviarDatos} />}

            {cargando && (
              <div className="flex w-16 items-center justify-center gap-1 rounded-2xl rounded-tl-md bg-white px-3.5 py-3 shadow-sm" aria-label="Escribiendo">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
            <div ref={finRef} />
          </div>

          {/* Entrada */}
          <form
            onSubmit={(e) => { e.preventDefault(); enviar(texto); }}
            className="flex items-center gap-2 border-t border-black/10 bg-white px-3 py-2.5"
          >
            <input
              ref={entradaRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={800}
              placeholder="Escribe tu pregunta…"
              className="min-w-0 flex-1 rounded-full bg-[#f4f0ec] px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-black/20"
              aria-label="Tu mensaje"
            />
            <button type="submit" disabled={cargando || !texto.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white disabled:opacity-30" aria-label="Enviar">
              <Send size={17} />
            </button>
          </form>
          <p className="bg-white pb-2 text-center text-[10.5px] text-gray-400">
            Asistente con IA · una asesora confirma tu pedido
            {!registrado && !mostrarFormulario && (
              <>
                {' · '}
                <button type="button" onClick={() => setFormularioAbierto(true)} className="underline hover:text-gray-600">Dejar mis datos</button>
              </>
            )}
          </p>
        </div>
      )}
    </>
  );
}
