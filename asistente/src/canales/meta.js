/**
 * Piezas comunes de los webhooks de Meta (WhatsApp e Instagram).
 */
import { tarjeta, buscarProducto, miles, fotoParaCanales } from '../lib/catalogo.js';
import { fichas } from '../lib/conocimiento.js';
import { VITRINAS } from '../lib/vitrina.js';
import { ofertasDelModelo } from '../lib/promo.js';
import { juntoAMoneda } from '../lib/monedas.js';
import { lineas, numeroDelAsistente } from '../lib/negocio.js';

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

/** El cliente pidió el monto en bolívares, o la respuesta dice que lo muestra «abajo». */
export function pideBolivares(textoCliente, respuesta) {
  return /bol[ií]var|\bbs\b|\btasa\b|cu[aá]nto (es|ser[ií]a|queda|sale) en/i.test(textoCliente ?? '')
    || /abajo en bol[ií]var/i.test(respuesta ?? '');
}

/**
 * "• Toronto · Queen 1,60x1,90 M · box nube: REF 670 = Bs 653.058,87 (tasa BCV euro 29/09/2026)"
 * "• Mesa Kenia · 2 × REF 170: REF 340 = Bs …"
 * (REF con miles() de catalogo.js: 1.290 como es-VE, sin Intl.)
 */
export function lineaPrecio(p, tasa) {
  const bs = p.bs ? ` = Bs ${p.bs} (${tasa?.etiqueta ?? 'tasa BCV'} ${tasa?.fecha ?? ''})` : '';
  // Una pieza en stock de la promoción: «• Toronto · Individual 1,00x1,90 M · 🏷️ oferta en stock (gris 02 en chenille
  // paño): antes REF 405, ahora REF 330 = Bs …».
  if (p.oferta) return `• ${p.nombre} · ${p.talla} · 🏷️ oferta en stock (${p.pieza}): antes REF ${miles(p.antes)}, ahora REF ${miles(p.ref)}${bs}`;
  // Un copete en stock, sin precio anterior: «• Copete (solo el cabecero) Manila · King 2,00x2,00 M · en stock (gris 01
  // en terciopelo): REF 455 = Bs …».
  if (p.copete) return `• Copete (solo el cabecero) ${p.nombre} · ${p.talla} · en stock (${p.pieza}): REF ${miles(p.ref)}${bs}`;
  const partes = [p.nombre, p.talla, p.box, p.tela, p.puff];
  if (p.cantidad > 1) partes.push(`${p.cantidad} × REF ${miles(p.unitario)}`);
  const cual = partes.filter(Boolean).join(' · ');
  const ref = `${p.desde ? 'desde ' : ''}REF ${miles(p.ref)}`;
  if (!p.partes) return `• ${cual}: ${ref}${bs}`;
  // Con adicionales, de dónde sale el total: «cama REF 550 + tela premium REF 120 = REF 670».
  const suma = p.partes.map(([nombre, monto]) => `${nombre} REF ${miles(monto)}`).join(' + ');
  const veces = p.cantidad > 1 ? ` = REF ${miles(p.unitario)} × ${p.cantidad}` : '';
  return `• ${cual}\n   ${suma}${veces} = ${ref}${bs}`;
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

/**
 * Los enlaces de las DOS asesoras (pedido de la dueña, 21-oct), cada uno solo en su línea: Instagram no detecta bien
 * un enlace pegado a otro texto o a un emoji (el de ofertas salió sin azul y el de la asesora, cortado).
 *   Habla con una asesora por WhatsApp 👇
 *
 *   Línea 1 (0414-584 7791):
 *   https://www.dekog.net/a/k3P9xQ1
 *
 *   Línea 2 (0424-400 6086):
 *   https://www.dekog.net/a/k3P9xQ2
 * `enlaces`: [{ etiqueta, visible, url }] (chat.js → enlaceWhatsapp().lineas, o negocio.js → asesorasDirectas()).
 * Sin `titulo` (null), solo las líneas.
 */
export function bloqueAsesoras(enlaces, titulo = 'Habla con una asesora por WhatsApp 👇') {
  return [titulo, ...enlaces.map((l) => `${l.etiqueta} (${l.visible}):\n${l.url}`)].filter(Boolean).join('\n\n');
}

/**
 * Cada enlace solo en su línea, sin la puntuación pegada al final (Instagram, 21-oct: «🏷️ Catálogo de ofertas:
 * https://www.dekog.net/ofertas» salió sin azul, y un enlace pegado a otro texto se detecta a medias). No cambia un
 * texto que ya cumple, así que se puede aplicar dos veces.
 */
export function enlacesEnSuLinea(texto) {
  return String(texto).replace(/[ \t]*(https?:\/\/[^\s]*[^\s.,;:!?)\]}»"'])[.,;:!?)\]}»"']*[ \t]*/g, (m, url, desde, todo) => {
    const antes = desde === 0 || todo[desde - 1] === '\n' ? '' : '\n';
    const fin = desde + m.length;
    const despues = fin >= todo.length || todo[fin] === '\n' ? '' : '\n';
    return `${antes}${url}${despues}`;
  });
}

// ── Vitrina («quiero ver camas») ─────────────────────────────────────────────────────────────────

/** El texto recortado para que la cola (guía + enlace) quepa siempre entera dentro de `maximo`. */
export function conCola(texto, cola, maximo) {
  return texto ? `${recortar(texto, Math.max(1, maximo - cola.length - 2))}\n\n${cola}` : recortar(cola, maximo);
}

/** "Desde REF 405" (varias medidas) o "REF 1.855" (una sola). Sin toLocaleString: nada de ICU. */
export const precioCorto = (t) => `${t.desde ? 'Desde ' : ''}REF ${miles(t.ref)}`;

/** «· 🏷️ en oferta» si el modelo tiene piezas en stock con descuento (lib/promo.js). */
const conOferta = (t) => (t.enOferta ? ' · 🏷️ en oferta' : '');

/** La vitrina en texto (respaldo de WhatsApp y modo «texto» de Instagram). */
export function vitrinaEnTexto(v) {
  return [`${v.rotulo}:`, ...v.productos.map((t) => `• ${t.nombre} (${t.linea}): ${precioCorto(t)}${conOferta(t)}`)].join('\n');
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
  const oferta = ofertasDelModelo(id); // sus piezas en stock con descuento, si tiene
  return {
    tarjeta: t,
    interes: t.nombre,
    caption: [`*${t.nombre}* · ${t.tipo}`, frase, medidas.map((c) => linea(c, true)).join('\n'), nota, oferta, pregunta].filter(Boolean).join('\n'),
    texto: [`${t.nombre} · ${t.tipo}`, frase, medidas.map((c) => linea(c, false)).join('\n'), oferta, pregunta].filter(Boolean).join('\n'),
  };
}

// ── whatsapp.js ──
export const GUIA_WA = 'Toca «Ver modelos» y elige uno: te mando su foto y sus precios en bolívares.';
/** La vitrina como UNA lista interactiva (1 mensaje del cupo). `texto`: lo que dice el asistente (va en el cuerpo). */
export function listaDeVitrina(v, texto) {
  const secciones = new Map();
  for (const t of v.productos) {
    if (!secciones.has(t.seccion)) secciones.set(t.seccion, []);
    secciones.get(t.seccion).push({ id: `prod:${t.id}`, title: recortar(t.nombre, 24), description: recortar(`${precioCorto(t)} · ${t.linea}${conOferta(t)}`, 72) });
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
  // El enlace solo en su línea (Instagram no detecta bien un enlace pegado a otro texto).
  return `${lista}${bs}\n\n${GUIA_IG}${mas}\n\n${v.boton}:\n${v.url}`;
}

// Un teléfono venezolano, con o sin el 58 y el 0 de adelante: móviles 0412/14/16/22/24/26 y fijos 02xx (el mismo criterio
// de numeroWhatsapp en scripts/hoja-clientes.gs). Con «+» adelante vale cualquier número de 8 a 15 dígitos, salvo con
// +58: ese es de aquí y tiene que tener esta forma («+58 414 584», un pedazo de uno, no la tiene).
const TELEFONO_VE = /^(?:58)?0?(?:4(?:1[246]|2[246])|2\d{2})\d{7}$/;
// Lo que va delante de una cédula o un RIF: «V-12.345.678», «V12345678», «cédula 12345678», «C.I.: …», «RIF J-…».
const ANTES_DE_DOCUMENTO = /(?:\b[VEJGP]-?|(?:\bc[eé]dula(?: de identidad)?|\bc\.?\s?i\b\.?|\brif)\s*[:#]?\s*)$/i;
// Los números de Dekog por sus 10 dígitos nacionales: las dos líneas, que salen en cada pase, y el del asistente.
const DE_DEKOG = new Set([...Object.values(lineas).map((l) => l.numero), numeroDelAsistente].map((n) => n.slice(-10)));
// Los 10 dígitos nacionales de un número escrito entero, con o sin el 58 y el 0.
const NACIONAL = /^(?:58)?0?(\d{10})$/;

/**
 * El primer teléfono que escribió el cliente, o '': «0414-555-1234» → 04145551234, «+58 414 5551234» → +584145551234.
 * Solo un número con forma de teléfono que no vaya junto a una moneda ni detrás de una cédula o un RIF (22-oct: «Bs
 * 1.318.908», «V-12.345.678» o «21-10-2026» llegaban a la hoja como su teléfono y tapaban el de verdad), y que no sea
 * de Dekog («ya le escribí al 0414-584 7791» pisaba su número en la hoja y, con la asesora, contaba como que lo dejó).
 */
export function extraerTelefono(texto) {
  const s = String(texto ?? '');
  for (const grupo of s.matchAll(/\+?\d[\d\s().-]{5,}\d/g)) {
    // Un grupo puede juntar dos números separados por espacios («REF 550 0414-555-1234»): se prueba cada tramo de
    // palabras seguidas, de las más largas a las más cortas. Un teléfono se escribe en 6 pedazos como mucho («+58 (414)
    // 555 12 34»): así un texto lleno de números sueltos no se come los 10 ms de CPU del plan gratis.
    const palabras = [...grupo[0].matchAll(/\S+/g)];
    for (let i = 0; i < palabras.length; i++) {
      for (let j = Math.min(palabras.length, i + 6) - 1; j >= i; j--) {
        const inicio = grupo.index + palabras[i].index;
        const fin = grupo.index + palabras[j].index + palabras[j][0].length;
        const candidato = s.slice(inicio, fin);
        const digitos = candidato.replace(/\D/g, '');
        // Justo un número de Dekog: sus pedazos tampoco son el suyo («+58 414 584 7791», como lo publica la web, daba
        // «+58414584»), pero el suyo puede venir después.
        if (DE_DEKOG.has(NACIONAL.exec(digitos)?.[1])) break;
        const internacional = candidato.startsWith('+');
        const forma = internacional && !digitos.startsWith('58')
          ? digitos.length >= 8 && digitos.length <= 15 : TELEFONO_VE.test(digitos);
        if (forma && !juntoAMoneda(s, inicio, fin) && !ANTES_DE_DOCUMENTO.test(s.slice(Math.max(0, inicio - 24), inicio))) {
          return internacional ? `+${digitos}` : digitos;
        }
      }
    }
  }
  return '';
}

// Lo que rodea al nombre cuando el cliente deja sus datos («hola, soy María y mi número es…»).
const RELLENO = new Set(['hola', 'buenas', 'buenos', 'dias', 'días', 'tardes', 'noches', 'gracias', 'ok', 'okey', 'dale', 'listo',
  'claro', 'si', 'sí', 'aqui', 'aquí', 'te', 'dejo', 'mis', 'datos', 'mi', 'nombre', 'es', 'me', 'llamo', 'soy', 'y', 'el', 'la',
  'numero', 'número', 'telefono', 'teléfono', 'tlf', 'whatsapp', 'wsp', 'ws', 'celular', 'cel', 'de', 'para', 'contacto']);

/**
 * El nombre que escribió el cliente al dejar sus datos en Instagram («María Pérez 0414…», «me llamo Ana»), o ''. Solo
 * si dejó también un teléfono o dijo «me llamo», «mi nombre es» o «soy»: un «ok, gracias» suelto no es un nombre. Va
 * solo a la hoja, nunca a la IA.
 */
export function nombreEscrito(texto, telefono = '') {
  const s = String(texto ?? '');
  // Una pregunta no trae su nombre, ni «soy de Maracay», «soy la mamá de…» o «soy un cliente» (22-oct: «Soy de Maracay,
  // ¿cuánto sale el envío?» llegaba a la hoja como el nombre «Maracay cuánto sale envío»).
  if (/[?¿]/.test(s) || /\bsoy\s+(?:de|del|la|el|un|una)\b/i.test(s)) return '';
  if (!telefono && !/\b(me llamo|mi nombre es|soy)\b/i.test(s)) return '';
  const palabras = s.replace(/\+?\d[\d\s().-]{5,}\d/g, ' ').replace(/[^\p{L}\s'-]/gu, ' ')
    .split(/\s+/).filter((p) => p && !RELLENO.has(p.toLowerCase()));
  const nombre = palabras.join(' ');
  return palabras.length >= 1 && palabras.length <= 5 && nombre.length <= 60 ? nombre : '';
}

/**
 * El mensaje sin los datos que dejó: sin teléfonos, sin su nombre y sin el RELLENO (de «Ana Pérez, mi número es
 * 0414-555-1234» solo queda la coma). Lo que queda dice si además pidió algo: la puntuación se conserva («¿y el envío?»).
 */
export function sinSusDatos(texto, telefono = extraerTelefono(texto)) {
  const nombre = nombreEscrito(texto, telefono).toLowerCase().match(/\p{L}+/gu) ?? [];
  return String(texto ?? '').replace(/\+?\d[\d\s().-]{5,}\d/g, ' ')
    .replace(/\p{L}+/gu, (p) => (RELLENO.has(p.toLowerCase()) || nombre.includes(p.toLowerCase()) ? ' ' : p));
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
