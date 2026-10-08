/**
 * Piezas comunes de los webhooks de Meta (WhatsApp e Instagram).
 */
import { tarjeta, buscarProducto, miles, fotoParaCanales } from '../lib/catalogo.js';
import { fichas } from '../lib/conocimiento.js';
import { VITRINAS } from '../lib/vitrina.js';

/** GET de verificación: Meta manda hub.challenge y hay que devolverlo si el token coincide. */
export function verificarSuscripcion(url, tokenEsperado) {
  const modo = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const reto = url.searchParams.get('hub.challenge');
  if (modo === 'subscribe' && tokenEsperado && token === tokenEsperado && reto) {
    return new Response(reto, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

function igualesSinFiltrarTiempo(a, b) {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

/**
 * Comprueba X-Hub-Signature-256: HMAC-SHA256 del cuerpo CRUDO con el App Secret.
 * Acepta varios secretos (Instagram Login usa un secreto propio, distinto del de la app).
 */
export async function firmaValida(cuerpoCrudo, cabecera, ...secretos) {
  if (!cabecera?.startsWith('sha256=')) return false;
  const recibida = cabecera.slice('sha256='.length).toLowerCase();
  for (const secreto of secretos.filter(Boolean)) {
    const clave = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, cuerpoCrudo));
    const hex = [...firma].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (igualesSinFiltrarTiempo(hex, recibida)) return true;
  }
  return false;
}

/**
 * "• Toronto · Queen 1,60x1,90 M · box nube: REF 670 = Bs 653.058,87 (tasa BCV euro 29/09/2026)"
 * "• Mesa Kenia · 2 × REF 170: REF 340 = Bs …"
 * (REF con miles() de catalogo.js: 1.290 como es-VE, sin Intl.)
 */
export function lineaPrecio(p, tasa) {
  const partes = [p.nombre, p.talla, p.box, p.tela, p.puff];
  if (p.cantidad > 1) partes.push(`${p.cantidad} × REF ${miles(p.unitario)}`);
  const cual = partes.filter(Boolean).join(' · ');
  const ref = `${p.desde ? 'desde ' : ''}REF ${miles(p.ref)}`;
  const bs = p.bs ? ` = Bs ${p.bs} (${tasa?.etiqueta ?? 'tasa BCV'} ${tasa?.fecha ?? ''})` : '';
  return `• ${cual}: ${ref}${bs}`;
}

/**
 * En el primer mensaje de la conversación el cliente tiene que saber que le responde un
 * asistente virtual. La IA lo hace casi siempre; esto lo garantiza cuando se le olvida.
 */
export function presentarse(texto, esPrimero) {
  if (!esPrimero || /asistente/i.test(texto)) return texto;
  const resto = texto.replace(/^¡?\s*hola\s*!?[,.]?\s*/i, '');
  return `¡Hola! Soy el asistente virtual de Dekog 👋 ${resto.charAt(0).toUpperCase()}${resto.slice(1)}`;
}

export function recortar(texto, maximo) {
  if (texto.length <= maximo) return texto;
  // Sin partir un emoji: si el corte cae entre las dos mitades de un par sustituto, se corta una antes.
  const corte = maximo - 1 - (/[\uD800-\uDBFF]/.test(texto[maximo - 2] ?? '') ? 1 : 0);
  return `${texto.slice(0, corte)}…`;
}

// ── Vitrina («quiero ver camas») ─────────────────────────────────────────────────────────────────

/** El texto recortado para que la cola (guía + enlace) quepa siempre entera dentro de `maximo`. */
export function conCola(texto, cola, maximo) {
  return texto ? `${recortar(texto, Math.max(1, maximo - cola.length - 2))}\n\n${cola}` : recortar(cola, maximo);
}

/** "Desde REF 405" (varias medidas) o "REF 1.855" (una sola). Sin toLocaleString: nada de ICU. */
export const precioCorto = (t) => `${t.desde ? 'Desde ' : ''}REF ${miles(t.ref)}`;

/** La vitrina en texto (respaldo de WhatsApp y modo «texto» de Instagram). */
export function vitrinaEnTexto(v) {
  return [`${v.rotulo}:`, ...v.productos.map((t) => `• ${t.nombre} (${t.linea}): ${precioCorto(t)}`)].join('\n');
}

/** "prod:48" → { tipo: 'producto', id: 48 }; "mas:camas" → { tipo: 'mas', clave: 'camas' }; lo demás → null. */
export function eleccionDe(valor) {
  const s = String(valor ?? '');
  let m = /^prod:(\d{1,4})$/.exec(s);
  if (m && buscarProducto(m[1])) return { tipo: 'producto', id: Number(m[1]) };
  m = /^mas:([a-z_]{1,20})$/.exec(s);
  if (m && Object.hasOwn(VITRINAS, m[1])) return { tipo: 'mas', clave: m[1] }; // «mas:constructor» no vale
  return null;
}

/**
 * El cliente eligió un modelo: respuesta SIN IA con la primera frase de su ficha, el precio de cada medida en REF
 * y en Bs y la pregunta por la medida. `caption` va al cliente; `texto` (sin Bs: la IA nunca escribe bolívares)
 * queda en el historial para que la IA siga la conversación.
 */
export function fichaElegida(id, tasa) {
  const t = tarjeta(id, '', tasa);
  if (!t) return null;
  const p = buscarProducto(id);
  // La primera frase de la ficha, sin las notas internas para la IA («(según su foto en el catálogo)»).
  const frase = String(fichas[id] ?? p.descripcion ?? '').split(/(?<=\.)\s+/)[0].replace(/\s*\([^)]*cat[aá]logo[^)]*\)/g, '');
  const medidas = (p.tallas?.length ? p.tallas : [{ nombre: '', precio: p.precio }])
    .map((x) => tarjeta(id, x.nombre, tasa)).filter(Boolean);
  const pregunta = medidas.length > 1 ? '¿Qué medida necesitas?' : '¿Quieres que una asesora te confirme la disponibilidad, o te muestro otro modelo?';
  const linea = (c, conBs) => `• ${c.talla ?? t.nombre}: REF ${miles(c.ref)}${conBs && c.bs ? ` (Bs ${c.bs})` : ''}`;
  const nota = tasa ? `Bs a la ${tasa.etiqueta} del ${tasa.fecha}.` : 'El monto en bolívares te lo confirma una asesora.';
  return {
    tarjeta: t,
    interes: t.nombre,
    caption: [`*${t.nombre}* · ${t.tipo}`, frase, medidas.map((c) => linea(c, true)).join('\n'), nota, pregunta].filter(Boolean).join('\n'),
    texto: [`${t.nombre} · ${t.tipo}`, frase, medidas.map((c) => linea(c, false)).join('\n'), pregunta].filter(Boolean).join('\n'),
  };
}

// ── whatsapp.js ──
export const GUIA_WA = 'Toca «Ver modelos» y elige uno: te mando su foto y sus precios en bolívares.';
/** La vitrina como UNA lista interactiva (1 mensaje del cupo). `texto`: lo que dice el asistente (va en el cuerpo). */
export function listaDeVitrina(v, texto) {
  const secciones = new Map();
  for (const t of v.productos) {
    if (!secciones.has(t.seccion)) secciones.set(t.seccion, []);
    secciones.get(t.seccion).push({ id: `prod:${t.id}`, title: recortar(t.nombre, 24), description: recortar(`${precioCorto(t)} · ${t.linea}`, 72) });
  }
  const sections = [...secciones].map(([titulo, rows]) => ({ title: recortar(titulo, 24), rows }));
  if (v.mas) sections.push({ title: 'Más modelos', rows: [{ id: `mas:${v.clave}`, title: recortar(v.mas, 24), description: recortar(`Otros ${v.quedan} modelos`, 72) }] });
  const guia = /ver modelos/i.test(texto) ? '' : `${GUIA_WA}\n`;
  return {
    type: 'list',
    header: { type: 'text', text: recortar(v.rotulo, 60) },
    body: { text: conCola(texto, `${guia}${v.boton}: ${v.url}`, 1024) },
    footer: { text: 'Precios en REF · al elegir, también en Bs' },
    action: { button: 'Ver modelos', sections },
  };
}
/** Respaldo si Meta rechaza la lista: el mismo contenido en texto (≤ 4096). */
export function textoDeVitrinaWa(v, texto) {
  const mas = v.mas ? '\nEscríbeme «más» para ver otros modelos.' : '';
  return conCola(texto, `${vitrinaEnTexto(v)}${mas}\n\n${v.boton}: ${v.url}`, 4096);
}

// ── instagram.js ──
export const GUIA_IG = 'Toca o escríbeme el nombre del modelo que te guste y te mando su foto y sus precios en bolívares.';
/** Generic template (IG_VITRINA=tarjetas): una tarjeta por modelo; tocarla abre el catálogo filtrado. */
export function carruselDeVitrina(v) {
  return {
    type: 'template',
    payload: {
      template_type: 'generic',
      elements: v.productos.slice(0, 10).map((t) => ({
        title: recortar(`${t.nombre} · ${t.linea}`, 80),
        subtitle: recortar(`${precioCorto(t)}${t.bs ? ` · Bs ${t.bs}` : ''}`, 80),
        image_url: fotoParaCanales(t.id),
        default_action: { type: 'web_url', url: v.url },
      })),
    },
  };
}
/** Una respuesta rápida por modelo (+ «Ver más …»): Instagram admite 13, de 20 caracteres como mucho. */
export function respuestasRapidas(v) {
  const r = v.productos.map((t) => ({ content_type: 'text', title: recortar(t.nombre, 20), payload: `prod:${t.id}` }));
  if (v.mas) r.push({ content_type: 'text', title: recortar(v.mas, 20), payload: `mas:${v.clave}` });
  return r.slice(0, 13);
}
/** Mensaje que cierra la vitrina en Instagram (lleva las respuestas rápidas). */
export function cierreInstagram(v, { conTarjetas, tasa }) {
  const lista = conTarjetas ? `Modelos: ${v.productos.map((t) => t.nombre).join(', ')}.` : vitrinaEnTexto(v);
  const bs = conTarjetas && tasa ? `\nBs a la ${tasa.etiqueta} del ${tasa.fecha}.` : '';
  const mas = v.mas ? '\nEscríbeme «más» para ver otros modelos.' : '';
  return `${lista}${bs}\n\n${GUIA_IG}${mas}\n${v.boton}: ${v.url}`;
}

/** Primer número de teléfono (7 a 15 dígitos) escrito en el texto, o ''. */
export function extraerTelefono(texto) {
  for (const candidato of texto.match(/\+?\d[\d\s().\-]{5,}\d/g) ?? []) {
    const digitos = candidato.replace(/\D/g, '');
    if (digitos.length >= 7 && digitos.length <= 15) return candidato.trim().startsWith('+') ? `+${digitos}` : digitos;
  }
  return '';
}

// Precalentado al cargar el Worker (ver chat.js): lo que usa el primer mensaje de WhatsApp o Instagram.
try {
  lineaPrecio({ nombre: 'Toronto', talla: 'Queen', box: 'box nube', cantidad: 2, unitario: 670, ref: 1340, bs: '1.318.908,40' },
    { etiqueta: 'tasa BCV euro', fecha: '07/10/2026' });
  recortar(presentarse('Hola, te ayudo con modelos y precios.', true), 1024);
  extraerTelefono('mi número es 0414-555-1234');
  // La vitrina: la lista de WhatsApp (y su respaldo en texto), el cierre de Instagram y la ficha al tocar un modelo.
  // Con una vitrina de muestra de 2 modelos: compila lo mismo y asigna poco (ver calentarVitrina en lib/vitrina.js).
  const tasa = { valor: 984.26, etiqueta: 'tasa BCV euro', fecha: '07/10/2026' };
  const v = {
    ...VITRINAS.camas,
    quedan: 38,
    rotulo: 'Camas · 2 de 40 modelos',
    productos: [48, 33].map((id) => ({ ...tarjeta(id, '', tasa), seccion: 'Camas Clásicas', linea: 'Clásica' })), // Toronto y Milan
  };
  for (const texto of ['Tenemos tres líneas de camas. ¿Para qué medida la buscas?', 'Mira estas 👋 Toca «Ver modelos» y elige una.']) {
    listaDeVitrina(v, texto);
  }
  textoDeVitrinaWa(v, 'Tenemos tres líneas de camas.');
  cierreInstagram(v, { conTarjetas: false, tasa });
  cierreInstagram(v, { conTarjetas: true, tasa });
  respuestasRapidas(v);
  carruselDeVitrina(v);
  for (const valor of ['prod:48', 'mas:camas', undefined]) eleccionDe(valor);
  fichaElegida(18, tasa);
} catch { /* solo es una optimización */ }
