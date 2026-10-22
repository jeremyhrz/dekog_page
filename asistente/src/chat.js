/**
 * El chat del asistente de Dekog, independiente de la plataforma: recibe el
 * cuerpo ya parseado y devuelve { status, datos }. El Worker (worker.js) lo
 * expone como POST /chat.
 *
 * Chat:   { mensajes: [{ role: "user" | "assistant", content: string }, ...] }
 *      →  { respuesta, productos: [tarjetas], vitrina: {…} | null, whatsapp: { url, linea } | null, tasa, formulario,
 *           interes, resumen }   (vitrina: ver lib/vitrina.js → armarVitrina)
 * Datos:  { conversacion, nombre, telefono, ciudad, interes, resumen } → { guardado }
 *
 * Privacidad: la IA no debe recibir datos personales. Antes de enviarle la
 * conversación se ocultan teléfonos, correos, cédulas y usuarios, y los datos
 * de contacto se dejan en un formulario aparte que va directo a la hoja.
 * (Nombres y direcciones escritos a mano no se pueden detectar con seguridad:
 * el widget le pide al cliente que no los escriba en el chat.)
 *
 * Los precios en bolívares y el enlace de WhatsApp los arma el servidor; la IA
 * solo decide qué decir, qué productos mostrar y cuándo pasar a una asesora.
 */
import { responder, proveedorActivo, RechazoDelModelo } from './lib/llm.js';
import {
  tarjeta, montosInventados, numerosDelCliente, categoriaPedida, fueraDeCategoria, totalesIncoherentes, recargoDeBoxEnAltaGama,
  sinNotasDeInstagram, preciosEnStock,
} from './lib/catalogo.js';
import { tasaBcv } from './lib/bcv.js';
import { resolverVitrina, armarVitrina, vitrinasPrevias, quitarNotas, calentarVitrina } from './lib/vitrina.js';
import { lineas, lineaPorArea, saludoInicial, saludoWhatsapp, opcionesDelSaludo, catalogosPdf } from './lib/negocio.js';
import { guardarCliente } from './lib/hoja.js';
import { imagenDeLaWeb } from './lib/imagen.js';
import {
  promoActiva, pideOfertas, pideCatalogoDeOfertas, ofertasDelModelo, hayOfertaEn, CATALOGO_DE_OFERTAS,
} from './lib/promo.js';
import { juntoAMoneda } from './lib/monedas.js';

const MAX_MENSAJES = 16;
// Tiempo total para la IA, contando una posible corrección. En la web el navegador espera hasta 40 s; en
// WhatsApp e Instagram la respuesta se arma después de contestarle a Meta y Cloudflare da 30 s para eso.
// El canal puede poner un plazo más corto (`hasta` de pensar), medido desde que llegó el mensaje.
const PRESUPUESTO_IA_MS = { web: 30000, whatsapp: 24000, instagram: 24000 };
const MINIMO_PARA_CORREGIR_MS = 6000;
const MAX_CARACTERES = 800;
const LIMITE_POR_IP = { pedidos: 20, ventanaMs: 5 * 60 * 1000, maxIps: 5000 };
const pedidosPorIp = new Map();

// Límite por IP en memoria: frena abusos dentro de una misma instancia (no es global).
function excedeLimite(ip) {
  const ahora = Date.now();
  const recientes = (pedidosPorIp.get(ip) ?? []).filter((t) => ahora - t < LIMITE_POR_IP.ventanaMs);
  recientes.push(ahora);
  pedidosPorIp.delete(ip);
  pedidosPorIp.set(ip, recientes); // al final: el Map queda ordenado del menos al más reciente
  if (pedidosPorIp.size > LIMITE_POR_IP.maxIps) {
    // Se descartan solo las IP más antiguas; nunca se reinician todos los contadores.
    for (const vieja of pedidosPorIp.keys()) {
      if (pedidosPorIp.size <= LIMITE_POR_IP.maxIps * 0.8) break;
      pedidosPorIp.delete(vieja);
    }
  }
  return recientes.length > LIMITE_POR_IP.pedidos;
}

const ORIGEN = { web: 'de la web', whatsapp: 'de WhatsApp', instagram: 'de Instagram' };

/**
 * El pase a una asesora, con el resumen ya escrito. `url`: la línea de esa área (la web saca de ahí el texto para sus
 * botones). `lineas`: las DOS asesoras en orden, Línea 1 y Línea 2 (pedido de la dueña, 21-oct: Instagram y WhatsApp
 * muestran los dos enlaces; la web, dos botones). WhatsApp también lo arma para un cliente sin número (whatsapp.js).
 */
export function enlaceWhatsapp(area, resumen, canal = 'web') {
  const codigo = lineaPorArea[area] ?? '01';
  const linea = lineas[codigo];
  const texto = `Hola Dekog, vengo del asistente ${ORIGEN[canal] ?? ORIGEN.web} 👋\n${resumen}`.trim();
  const url = (numero) => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  return {
    url: url(linea.numero),
    linea: linea.nombre,
    lineas: Object.values(lineas).map((l) => ({ etiqueta: l.etiqueta, visible: l.visible, url: url(l.numero) })),
  };
}

// Si un mensaje largo del asistente trae al final la nota de la vitrina («[Vitrina «Camas»: …]», lib/vitrina.js),
// se corta el texto y no la nota: es lo que le dice al servidor qué modelos ya vio el cliente.
// La nota se busca solo en la cola del texto y sin espacios delante: el contenido llega del navegador, y una regex
// que empieza con \s* sobre todo el texto se vuelve cuadrática (20 KB de espacios costaban ~460 ms de CPU).
const NOTA_AL_FINAL = /\[Vitrina «[^\]]{1,300}\]$/;
const MAX_ENTRADA = 4000;
function recortarMensaje({ role, content }) {
  const s = content.slice(0, MAX_ENTRADA).trim();
  if (s.length <= MAX_CARACTERES) return s;
  const nota = role === 'assistant' ? content.trim().slice(-320).match(NOTA_AL_FINAL)?.[0] ?? '' : '';
  return nota ? `${s.slice(0, MAX_CARACTERES - nota.length - 2).trimEnd()}\n\n${nota}` : s.slice(0, MAX_CARACTERES);
}

function limpiarMensajes(entrada) {
  if (!Array.isArray(entrada)) return null;
  const mensajes = entrada
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_MENSAJES)
    .map((m) => ({ role: m.role, content: recortarMensaje(m) }));
  while (mensajes.length && mensajes[0].role !== 'user') mensajes.shift();
  if (!mensajes.length || mensajes.at(-1).role !== 'user') return null;
  return mensajes;
}

const OCULTO = '[dato personal]';
const FECHA = /^\d{1,2}[-./]\d{1,2}[-./]\d{2,4}$/;

/**
 * Oculta datos personales antes de enviar el texto a la IA:
 *   - correos (también "maria arroba gmail punto com" o con espacios);
 *   - usuarios de redes (@usuario) y cédulas (V-12.345.678, "cédula 987654");
 *   - números de 7 dígitos o más (teléfonos, cuentas), con cualquier separador.
 * NO toca montos junto a una moneda (REF 1.290, Bs 1.003.955, 8.000.000 $) ni
 * fechas: los precios del catálogo y del cliente siguen siendo legibles.
 */
export function ocultarDatosPersonales(entrada) {
  let s = String(entrada).normalize('NFKC');
  // Atajos: cada expresión corre solo si el texto tiene lo mínimo que ella exige. Las Unicode costaban ~8 ms
  // de CPU la primera vez en cada instancia aunque el mensaje no trajera datos (plan gratis: 10 ms por pedido).
  if (/@|arroba|\(at\)/i.test(s)) s = s.replace(/[\p{L}\p{N}._%+-]+\s?(?:@|\barroba\b|\(at\))\s?[\p{L}\p{N}-]+(?:(?:\.(?=[\p{L}\p{N}])|\s+punto\s+)[\p{L}\p{N}-]+)*/giu, OCULTO);
  if (s.includes('@')) s = s.replace(/(^|[\s:(])@[\w.]{3,30}/g, `$1${OCULTO}`);
  if (!/\d/.test(s)) return s; // lo que sigue (cédulas y teléfonos) exige dígitos
  // Cédula / RIF: letra en mayúscula y al menos 6 dígitos ("tipo P 1.200" no es una cédula).
  s = s.replace(/\b[VEJGP]\s*[-:.]?\s*\d[\d.\s]{3,}\d\b/g, (m) => (m.replace(/\D/g, '').length >= 6 ? OCULTO : m));
  s = s.replace(/\bc[eé]dula(?:\s+(?:es|n[uú]mero|nro\.?))?\s*[-:.]?\s*(?:[VEJGP]\s*-?\s*)?\d[\d.\s]{3,}\d/giu, OCULTO);
  s = s.replace(/\+?\d[\d\s().\-/_·*‐‑‒–—―−]{5,}\d/g, (m, desde, todo) => {
    if (m.replace(/\D/g, '').length < 7) return m;
    if (FECHA.test(m.trim())) return m;
    if (juntoAMoneda(todo, desde, desde + m.length)) return m;
    return OCULTO;
  });
  return s;
}

const texto = (valor, max) => String(valor ?? '').trim().slice(0, max);

// Después de este texto van los enlaces (o, en la web, los botones) de las dos asesoras.
const AVISO_EMERGENCIA = {
  web: 'Disculpa, en este momento no puedo responder 🙏 Escríbele a una asesora de Dekog por WhatsApp con los botones de abajo.',
  whatsapp: 'Disculpa, en este momento no puedo responder 🙏 Escríbele directo a una asesora de Dekog.',
  instagram: 'Disculpa, en este momento no puedo responder 🙏 Escríbele directo a una asesora de Dekog.',
};

function respuestaDeEmergencia(canal) {
  return {
    respuesta: AVISO_EMERGENCIA[canal] ?? AVISO_EMERGENCIA.web,
    productos: [],
    derivar: { necesario: true, area: 'home', resumen: '' },
    ofrecer_formulario: false,
    emergencia: true,
  };
}

/** Motivo breve para el registro: nunca el contenido de la conversación. */
function motivo(e) {
  if (e instanceof SyntaxError) return 'el modelo devolvió JSON inválido';
  return e?.status ? `HTTP ${e.status}` : (e?.name ?? 'error');
}

/**
 * Lo que dé la promesa, o un TimeoutError al llegar a `hasta` (un momento como Date.now()). Pase lo que pase dentro de
 * la IA (la cascada de modelos, una corrección, las hojas de referencia de una foto que no terminan de subir), el canal
 * recibe su respuesta a tiempo.
 */
function aTiempo(promesa, hasta) {
  let reloj;
  const tarde = new Promise((_, rechazar) => {
    reloj = setTimeout(() => rechazar(Object.assign(new Error('no respondió a tiempo'), { name: 'TimeoutError' })),
      Math.max(0, hasta - Date.now()));
  });
  return Promise.race([promesa, tarde]).finally(() => clearTimeout(reloj));
}

export async function atenderChat(cuerpo, ip, env) {
  if (excedeLimite(ip)) {
    return { status: 429, datos: { error: 'Estás escribiendo muy rápido. Espera un momento e intenta de nuevo.' } };
  }
  const limpios = limpiarMensajes(cuerpo?.mensajes);
  if (!limpios) return { status: 400, datos: { error: 'No recibí tu mensaje. Intenta de nuevo.' } };
  if (!proveedorActivo()) {
    return { status: 503, datos: { error: 'El asistente no está disponible en este momento.' } };
  }
  const mensajes = limpios.map((m) => ({ ...m, content: ocultarDatosPersonales(m.content) }));
  // La web ya mostró el saludo de la dueña en su globo de bienvenida (no va en el historial). Si el cliente
  // mandó una foto, llega aparte (`imagen`, ya achicada en el navegador) y la IA la compara con el catálogo.
  const datos = await pensar(mensajes, 'web', {
    yaSaludo: cuerpo?.saludado === true, imagen: imagenDeLaWeb(cuerpo?.imagen), kv: env?.CONVERSACIONES,
  });
  // Si el cliente escribió un dato personal en el chat, se le ofrece el formulario.
  if (mensajes.at(-1).content !== limpios.at(-1).content) datos.formulario = true;
  return { status: 200, datos };
}

// La IA a veces escribe Markdown (**negrita**, sobre todo gemini-3.5-flash con las fotos). WhatsApp solo entiende
// *negrita* con un asterisco; la web e Instagram no tienen formato, así que ahí se quitan los asteriscos.
export function negritasPara(canal, texto) {
  if (canal === 'whatsapp') return texto.replace(/\*\*([^*\n]+)\*\*/g, '*$1*');
  return texto.replace(/\*{1,2}([^*\n]+)\*{1,2}/g, '$1');
}

/** Pide «el catálogo» (no «algo fuera del catálogo»). */
export function pideCatalogo(texto) {
  return /\bcat[aá]logos?\b/i.test(texto ?? '') && !/fuera del cat[aá]logo/i.test(texto ?? '');
}

/** El texto sin las oraciones que nombran «Ver modelos» (puede quedar vacío). */
const sinVerModelos = (texto) => texto.split('\n')
  .map((linea) => linea.split(/(?<=[.!?])\s+/).filter((o) => !/ver modelos/i.test(o)).join(' ')).join('\n').trim();

/**
 * El texto con un punto en lugar de cada cláusula que nombra «Ver modelos» (cortadas en . ! ? ; , : saltos de línea, «o»
 * e «y»): lo demás de su oración se queda, pero sin unirse por encima de lo quitado («toca el botón de abajo, «Ver
 * modelos», y una asesora te confirma…» habla de la lista). La «o» y la «y» con un solo espacio a cada lado: con \s+ la
 * expresión retrocede de forma cuadrática ante un tramo largo de espacios.
 */
const sinClausulasVerModelos = (texto) => texto.split(/([.!?;,:\n]+|\s[oy]\s)/i)
  .map((parte, i) => (i % 2 === 0 && /ver modelos/i.test(parte) ? '.' : parte)).join('');

// La IA dice que el enlace de las ofertas va en este mensaje («en el catálogo de ofertas que te dejo abajo 👇», «aquí
// tienes el enlace»). Por oración y solo si nombra el enlace, el catálogo o las ofertas: «te muestro abajo la pieza en
// oferta» habla de su tarjeta. Sin las cláusulas del pase («escríbele a una asesora con los enlaces de abajo», «los links
// de WhatsApp»): el de las ofertas es uno solo, así que «enlaces» o «links» en plural son los de las asesoras. Y si la
// oración habla de ellas, «toca el enlace de abajo» a secas también es el suyo: ahí cuenta solo si nombra el catálogo o
// las ofertas («te dejo abajo el catálogo de ofertas; si te gusta alguna, una asesora te la aparta»).
const ANUNCIA_ABAJO = /abajo|👇|te (?:l[oa]s? )?dejo|aqu[ií] (?:tienes|est[aá])/i;
const DEL_PASE = /asesor|whatsapp|\b(?:enlaces|links)\b/i;
const anunciaElEnlace = (texto) => texto.split(/[.!?\n]+/).some((oracion) => {
  const resto = oracion.split(/[,;:]/).filter((c) => !DEL_PASE.test(c)).join(',');
  const nombra = DEL_PASE.test(oracion) ? /cat[aá]logo|ofertas/i : /\b(?:enlace|link)\b|cat[aá]logo|ofertas/i;
  return ANUNCIA_ABAJO.test(resto) && nombra.test(resto);
});

// «¿Me pasas otra vez el link?», «no me abre el enlace»: pide de nuevo un enlace sin decir cuál. Es el de las ofertas si
// fue el último que recibió (ultimoEnlace; los de las asesoras no quedan en el historial), si no habla de la asesora ni
// de WhatsApp, y si nombra el enlace o la IA lo anuncia («¿me lo reenvías?» → «te dejo el enlace aquí abajo 👇»):
// «¿me reenvías la foto?» no lo es. El «no» como palabra: «bueno me abrió el link» no lo pide.
const OTRA_VEZ = /otra vez|de nuevo|nuevamente|reenv|\bno (?:me |se |lo |la )?(?:puedo |pude )?(?:abr|carg|funcion|sirv|lleg|sal)/i;
const pideOtraVezUnEnlace = (texto, respuesta) => OTRA_VEZ.test(texto) && !/asesor|whatsapp/i.test(texto)
  && (/\b(?:enlaces?|links?)\b/i.test(texto) || anunciaElEnlace(respuesta));

/** El último enlace que recibió el cliente en un mensaje del asistente ('' si ninguno). */
function ultimoEnlace(mensajes) {
  for (let i = mensajes.length - 1; i >= 0; i -= 1) {
    const enlaces = mensajes[i].role === 'assistant' ? mensajes[i].content.match(/https?:\/\/\S+/g) : null;
    if (enlaces) return enlaces[enlaces.length - 1];
  }
  return '';
}

/** Quita las oraciones que prometen «Ver modelos» (solo se llama cuando no va ninguna vitrina). */
export function sinPromesaDeVitrina(texto) {
  return sinVerModelos(texto) || texto;
}

/** «Toca el botón de hablar con asesora» (o «escríbele a una asesora por los enlaces de abajo»): la respuesta promete
 * el pase a una asesora aunque la IA no lo marcó. */
export function prometeBotonDeAsesora(texto) {
  // «el enlace del catálogo; una asesora te confirma…» no cuenta: solo el botón o los enlaces (o links) «de abajo» o «de
  // WhatsApp», que es lo que promete en Instagram, donde no hay botón.
  return /bot[oó]n[^.!?\n]{0,60}asesor|asesor[^.!?\n]{0,60}bot[oó]n|(enlaces?|links?)\s+(de\s+)?(abajo|whatsapp)[^.!?\n]{0,40}asesor|asesor[^.!?\n]{0,60}(enlaces?|links?)\s+(de\s+)?(abajo|whatsapp)/i
    .test(texto ?? '');
}

// La IA a veces dice «te lo muestro abajo en bolívares» aunque no mande ningún producto: sin tarjeta, esa frase
// promete algo que el cliente no ve. Con tarjeta solo sobra si lo PREGUNTA («¿Te lo muestro abajo…?»), porque la
// tarjeta llega sola. Se quita la oración entera (por líneas y oraciones: lineal, sin regex que retroceda).
export function sinBolivaresAbajo(texto, { soloPreguntas = false } = {}) {
  const sobra = (o) => /abajo/i.test(o) && /bol[ií]var|\bBs\b|tasa/i.test(o) && (!soloPreguntas || /^¿|\?$/.test(o.trim()));
  const limpio = texto.split('\n').map((linea) => linea.split(/(?<=[.!?])\s+/).filter((o) => !sobra(o)).join(' ')).join('\n').trim();
  return limpio || texto;
}

// Palabras de un saludo suelto («hola», «buenas tardes», «hola, ¿cómo estás?»): ninguna pregunta todavía.
const SALUDO = new Set(['hola', 'holaa', 'holaaa', 'holi', 'buenas', 'buenos', 'buen', 'dia', 'dias', 'tardes', 'noches', 'hey',
  'saludos', 'que', 'tal', 'epa', 'alo', 'como', 'estas', 'esta', 'estan', 'dekog', 'amiga', 'amigo', 'equipo']);
const INICIO_SALUDO = new Set(['hola', 'holaa', 'holaaa', 'holi', 'buenas', 'buenos', 'buen', 'hey', 'saludos', 'epa', 'alo']);
export function esSoloSaludo(texto) {
  const palabras = String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, ' ').trim().split(' ').filter(Boolean);
  return palabras.length > 0 && palabras.length <= 6 && INICIO_SALUDO.has(palabras[0]) && palabras.every((p) => SALUDO.has(p));
}

const NUMERO_DE_OPCION = { 1: 1, uno: 1, 2: 2, dos: 2, 3: 3, tres: 3 };

/** Lo que eligió la IA para un producto (box, cantidad, tela, puff y pieza en oferta), como lo pide tarjeta(). */
const opcionesDe = (p) => ({
  box: p.box, cantidad: p.cantidad, telaPremium: p.tela_premium === true, puff: p.con_puff === true, oferta: Number(p.oferta) || 0,
});

/** «Toronto Individual 1,00x1,90 M oferta en stock», para la hoja y el resumen de la asesora. */
const queEs = (p) => [p.nombre, p.talla, p.box, p.tela, p.puff,
  p.oferta ? `oferta en stock (${p.pieza})` : p.copete ? `copete en stock (${p.pieza})` : ''].filter(Boolean);

/**
 * Si el cliente respondió al saludo con el número de una opción («2», «la 3», «opción 1», «2️⃣»), el historial con
 * ese mensaje cambiado por lo que dice la opción; si no, el mismo historial.
 */
export function conOpcionDelSaludo(mensajes) {
  const ultimo = mensajes.at(-1);
  const anterior = mensajes.at(-2);
  // El saludo guardado puede venir con el formato de WhatsApp (*negrita*, _cursiva_): se compara sin los signos.
  if (ultimo?.role !== 'user' || anterior?.role !== 'assistant'
    || !anterior.content.replace(/[*_]/g, '').startsWith(saludoInicial)) return mensajes;
  const m = /^(?:(?:la|el|opci[oó]n|n[uú]mero)\s*)?(\d|uno|dos|tres)[.)!]?$/i
    .exec(ultimo.content.replace(/[️⃣]/g, '').trim().toLowerCase());
  const n = m ? NUMERO_DE_OPCION[m[1]] : null;
  return n ? [...mensajes.slice(0, -1), { role: 'user', content: opcionesDelSaludo[n] }] : mensajes;
}

/**
 * El cerebro compartido por la web, WhatsApp e Instagram. Recibe la
 * conversación YA SIN datos personales y devuelve lo que hay que mostrar:
 * texto, tarjetas de producto con Bs, enlace a la asesora y si conviene
 * ofrecer que lo contacten.
 * `hasta` (opcional): el plazo que pone el canal, un momento como Date.now() medido desde que LLEGÓ el mensaje (la
 * descarga de la foto y lo demás que hizo antes ya cuentan). La IA tiene hasta lo que llegue primero, ese plazo o el
 * presupuesto del canal; si no alcanza, sale el aviso de emergencia. Sin él (o si no es un número mayor que 0), solo el
 * presupuesto, como siempre.
 */
export async function pensar(entrada, canal = 'web', { yaSaludo = false, imagen = null, kv = null, hasta: plazo = null } = {}) {
  // yaSaludo: el cliente ya vio el saludo de la dueña fuera del historial (el globo de bienvenida de la web). Se
  // antepone solo para entender «1», «2» o «3»; a la IA no le llega (su conversación empieza por el cliente).
  const conSaludo = yaSaludo && entrada[0]?.role === 'user';
  const mensajes = conSaludo
    ? conOpcionDelSaludo([{ role: 'assistant', content: saludoInicial }, ...entrada]).slice(1)
    : conOpcionDelSaludo(entrada);
  // Primer mensaje y es solo un saludo: el saludo que escribió la dueña, tal cual y sin IA (al instante y sin gastar
  // Gemini). Si ya trae una pregunta, o si ya lo vio, responde la IA.
  // Un «1», «2» o «3» suelto como primer mensaje (vio el menú en otra conversación que ya no se recuerda): el saludo
  // de nuevo, con sus opciones, en vez de que la IA adivine qué quiso decir.
  const primero = mensajes.filter((m) => m.role === 'user').length === 1 ? mensajes.at(-1)?.content ?? '' : null;
  if (!imagen && !yaSaludo && primero !== null && (esSoloSaludo(primero) || /^\s*[123]\s*[.)]?\s*$/.test(primero))) {
    return {
      respuesta: canal === 'whatsapp' ? saludoWhatsapp : saludoInicial, productos: [], vitrina: null, whatsapp: null, tasa: null,
      formulario: false, emergencia: false, interes: '', resumen: '',
    };
  }
  const tasaPromesa = tasaBcv();
  const delCliente = numerosDelCliente(mensajes);
  // Lo que escribió el cliente, sin el pie de lo que compartió en Instagram: ese texto no es suyo, así que no abre la
  // vitrina ni manda los PDF («Conoce nuestras camas…» en una publicación). El enlace de ofertas sí lo mira (más abajo).
  const ultimoCompleto = mensajes.at(-1)?.content ?? '';
  const ultimo = sinNotasDeInstagram(ultimoCompleto);
  // Si el cliente pidió una categoría ("quiero ver camas"), los modelos sugeridos deben ser de ella.
  const categoria = categoriaPedida(ultimo);
  const ajenos = (s) => (categoria ? fueraDeCategoria(s.productos, categoria, ultimo) : []);
  // Las tarjetas que mostraría esta salida (sin tasa: solo importan los REF) y los totales del texto que las contradicen.
  const tarjetasDe = (s) => (s.productos ?? []).slice(0, 3).map((p) => tarjeta(p.id, p.talla, null, opcionesDe(p))).filter(Boolean);
  const incoherentes = (s) => totalesIncoherentes(s.respuesta ?? '', tarjetasDe(s));
  // Los precios de las piezas en stock que eligió la IA valen en todo el texto, como los números del cliente y como en
  // totalesIncoherentes (preciosEnStock, en lib/catalogo.js).
  const revisar = (s, texto) => montosInventados(texto ?? '', {
    ids: (s.productos ?? []).map((p) => p.id), delCliente: [...delCliente, ...preciosEnStock(tarjetasDe(s))],
  });
  const boxAltaGama = (s) => recargoDeBoxEnAltaGama(s.respuesta, s.productos);

  const presupuesto = Date.now() + (PRESUPUESTO_IA_MS[canal] ?? PRESUPUESTO_IA_MS.whatsapp);
  const hasta = Number.isFinite(plazo) && plazo > 0 ? Math.min(plazo, presupuesto) : presupuesto;
  let salida;
  try {
    salida = await aTiempo(responder(mensajes, canal, { hasta, imagen, kv }), hasta);
    const inventados = revisar(salida, salida.respuesta);
    const deOtraCategoria = ajenos(salida);
    const malSumados = incoherentes(salida);
    const boxInventado = boxAltaGama(salida);
    if (inventados.length || deOtraCategoria.length || malSumados.length || boxInventado.length) {
      // Un monto que no está en el catálogo, un modelo de otra categoría o un total mal sumado: se pide UNA corrección.
      if (inventados.length) console.warn('Montos fuera del catálogo:', inventados);
      if (deOtraCategoria.length) console.warn('Modelos de otra categoría:', deOtraCategoria.map((p) => p.nombre));
      if (malSumados.length) console.warn('Totales que no coinciden con la tarjeta:', malSumados.map((m) => m.dicho));
      if (boxInventado.length) console.warn('Recargo de box en una cama Alta Gama:', boxInventado.map((p) => p.nombre));
      const notas = [];
      if (inventados.length) {
        notas.push(`${inventados.join(', ')} no corresponde al catálogo o a un dato confirmado: usa solo precios exactos del catálogo en REF, sin montos en bolívares ni porcentajes`);
      }
      if (deOtraCategoria.length) {
        const nombres = deOtraCategoria.map((p) => `${p.nombre} (${p.categoria.toLowerCase()})`).join(', ');
        notas.push(`el cliente pidió ${categoria.toLowerCase()} y ${nombres} no es de esa categoría: menciona y muestra solo modelos de la sección ${categoria.toUpperCase()} del catálogo`);
      }
      if (boxInventado.length) {
        const nombres = boxInventado.map((p) => p.nombre).join(', ');
        notas.push(`${nombres} es de la línea Alta Gama: ahí cada modelo trae su box incluido en el precio (alta gama, curvo o nube) y nunca suma nada, así que no des ningún monto para el box; si pide un box distinto al de su modelo, di que eso lo confirma una asesora`);
      }
      if (malSumados.length) {
        notas.push(`${malSumados.map((m) => m.dicho).join(', ')} está mal sumado: con todo lo que eligió el cliente (medida, box, tela, puff y cantidad) el total exacto es ${malSumados[0].correcto}`);
      }
      const primera = salida;
      if (hasta - Date.now() < MINIMO_PARA_CORREGIR_MS) {
        // La IA ya tardó casi todo el presupuesto: abajo se quita el texto dudoso y quedan las tarjetas exactas.
        console.warn('Sin tiempo para la corrección; se conserva la primera respuesta sin el texto dudoso');
      } else {
        try {
          salida = await aTiempo(responder([
            ...mensajes,
            { role: 'assistant', content: primera.respuesta },
            { role: 'user', content: `(Nota del sistema: ${notas.join('; ')}. Reescribe tu respuesta anterior.)` },
          ], canal, { hasta }), hasta);
        } catch (e) {
          console.warn('Falló la corrección; se conserva la primera respuesta sin el texto dudoso:', motivo(e));
          salida = primera;
        }
      }
      if (boxAltaGama(salida).length) {
        salida = {
          ...salida,
          respuesta: 'En la línea Alta Gama cada cama trae su box incluido en el precio (alta gama, curvo o nube, según el modelo), sin pagar nada adicional. Abajo te muestro el precio de la cama, también en bolívares.',
        };
      } else if (revisar(salida, salida.respuesta).length || incoherentes(salida).length) {
        salida = {
          ...salida,
          respuesta: salida.productos?.length
            ? 'Te muestro abajo el total exacto con todo lo que elegiste, también en bolívares.'
            : 'Disculpa, ese precio te lo confirma una asesora de Dekog.',
        };
      }
      // Si aún sugiere modelos de otra categoría, al menos no se muestran sus tarjetas.
      const quedan = new Set(ajenos(salida).map((p) => p.id));
      if (quedan.size) salida = { ...salida, productos: salida.productos.filter((p) => !quedan.has(p.id)) };
    }
  } catch (e) {
    if (!(e instanceof RechazoDelModelo)) console.error('Error del asistente:', motivo(e));
    salida = respuestaDeEmergencia(canal);
  }

  // La IA nunca escribe la nota «[Vitrina …]» del historial: si la copió, se quita.
  salida = { ...salida, respuesta: quitarNotas(salida.respuesta) };

  // La tasa tampoco se espera más allá del plazo: sin ella, los precios salen en REF y una asesora confirma los Bs.
  const tasa = await aTiempo(tasaPromesa, hasta).catch(() => null);
  // Sin tarjetas repetidas: la IA a veces pone el mismo modelo dos veces (21-oct: «Paris» + «Paris Queen en oferta» + «Paris»).
  const productos = (salida.productos ?? [])
    .slice(0, 3)
    .map((p) => tarjeta(p.id, p.talla, tasa, opcionesDe(p)))
    .filter((t, i, todas) => t && todas.findIndex((o) => o && o.id === t.id && o.talla === t.talla && o.ref === t.ref) === i);

  // Pidió VER una categoría («quiero ver camas») o ver más: hasta 10 modelos que no haya visto y el enlace al catálogo.
  // No cuando pasa a una asesora ni en una respuesta de emergencia. En WhatsApp la lista no lleva Bs (van al elegir).
  // Tampoco si pide lo que está en oferta («¿qué camas tienen en oferta?») en una sección con piezas en stock (hoy, solo
  // camas): la vitrina, a precio de catálogo, taparía las tarjetas de esas piezas. No va la del respaldo, ni la que marcó
  // la IA si mostró alguna pieza (sin piezas, su texto está escrito para la lista). En sofás, mesas y puffs no hay nada
  // que tapar: su vitrina va aunque pregunte por ofertas.
  const promo = promoActiva();
  const previas = vitrinasPrevias(mensajes);
  const resuelta = !salida.emergencia && !salida.derivar?.necesario
    ? resolverVitrina(salida.vitrina, ultimo, mensajes, previas)
    : null;
  const tapaLasOfertas = Boolean(resuelta && promo) && pideOfertas(ultimo) && resuelta.todos.some((p) => hayOfertaEn(p.id))
    && (salida.vitrina !== resuelta.clave || productos.some((p) => p.oferta || p.copete));
  const pedida = tapaLasOfertas ? null : resuelta;
  const vitrina = pedida ? armarVitrina(pedida, {
    sugeridos: (salida.productos ?? []).map((p) => p.id),
    vistos: previas.vistos,
    tasa: canal === 'whatsapp' ? null : tasa,
  }) : null;
  // Para medir en los logs cuántas vitrinas marca la IA y cuántas salen por el respaldo (sin datos del cliente).
  if (vitrina) console.log('Vitrina:', vitrina.clave, salida.vitrina === vitrina.clave ? '(IA)' : '(respaldo)');
  // Igual con las fotos: qué vio la IA y cuántos modelos ofreció (para revisar el reconocimiento con wrangler tail).
  if (imagen) console.log('Foto:', salida.foto || '(sin clasificar)', '·', (salida.productos ?? []).map((p) => p.id).join(',') || 'ningún modelo');

  // El resumen para la asesora tampoco puede llevar montos inventados: si los
  // trae, se arma con los datos verificados de las tarjetas.
  let resumen = salida.derivar?.resumen ?? '';
  if (resumen && revisar(salida, resumen).length) {
    resumen = productos
      .map((p) => [...queEs(p), p.cantidad > 1 ? `${p.cantidad} unidades` : '', `REF ${p.ref}`].filter(Boolean).join(' · '))
      .join(' | ') || 'Consulta desde el asistente';
  }

  // Solo hay algo «abajo» con bolívares si va una tarjeta, o la vitrina de la web (la de WhatsApp no lleva Bs).
  const conTarjeta = Boolean(productos.length || (vitrina && canal !== 'whatsapp'));
  let respuesta = negritasPara(canal, sinBolivaresAbajo(salida.respuesta, { soloPreguntas: conTarjeta }));
  if (!vitrina) {
    // Sin vitrina no hay «Ver modelos»: si la IA lo promete, esa frase se quita (13-oct: el cliente pidió el catálogo,
    // le dijeron «toca Ver modelos» y no le llegó nada). Si pidió «el catálogo», van los dos en PDF; si pidió «el
    // catálogo de ofertas», solo el de la promo (abajo).
    respuesta = sinPromesaDeVitrina(respuesta);
    if (pideCatalogo(ultimo) && !pideCatalogoDeOfertas(ultimo) && !catalogosPdf.some(([, url]) => respuesta.includes(url))) {
      // Cada enlace solo en su línea: Instagram no detecta bien uno pegado a otro texto (21-oct).
      respuesta += `\n\n${catalogosPdf.map(([nombre, url]) => `📖 ${nombre}:\n${url}`).join('\n\n')}`;
    }
  }
  // Lo que agrega el servidor va una vez: el historial guarda lo que ya recibió el cliente (en la web, lo que muestra
  // el chat), y como la IA no repite lo que ya dijo, el servidor lo volvía a pegar en cada respuesta.
  const yaDicho = (s) => mensajes.some((m) => m.role === 'assistant' && m.content.includes(s));
  // La IA a veces no dice que el modelo por el que preguntan tiene piezas en stock con descuento (21-oct: «¿Cuánto cuesta
  // la Manila queen?» → REF 520, sin las tres a REF 420): si su respuesta no habla de ofertas, se agrega la línea. Solo
  // si hay piezas en la medida que pidió (o no dijo medida), que es lo que dice enOferta: a quien quiere la Toronto Queen
  // no le sirve la individual.
  const conOferta = !vitrina && !/oferta|stock|descuento|promo|rebaja|en vez de/i.test(respuesta)
    && productos.find((p) => p.enOferta && !p.oferta);
  const lineaDeOfertas = promo && !salida.emergencia && conOferta ? ofertasDelModelo(conOferta.id, conOferta.talla ?? '') : '';
  if (lineaDeOfertas && !yaDicho(lineaDeOfertas)) respuesta += `\n\n${lineaDeOfertas}`;
  // Preguntó por ofertas, descuentos o promociones (también con lo que compartió en Instagram), o la IA habla del
  // catálogo de ofertas: va su enlace. Lo agrega el servidor, no la IA, para que nunca llegue mal escrito (21-oct: la
  // promo de la dueña). Si ya se lo mandó, solo de nuevo cuando lo vuelve a pedir (el catálogo, o el enlace o el link de
  // las ofertas) o cuando la IA igual lo anuncia abajo: nombrar el catálogo no basta, porque lo nombra en cada respuesta.
  // También si pide «otra vez el link» sin decir cuál y el último que recibió fue este (startsWith: si lo escribió la IA,
  // puede llevar un punto pegado), salvo en un pase («los enlaces de abajo» son los de las asesoras). Con vitrina no
  // cuenta lo que hay «abajo»: es la lista (y en la web, el botón del catálogo de la página).
  const loPideOtraVez = pideCatalogoDeOfertas(ultimo) || (pideOfertas(ultimo) && /\b(enlaces?|links?)\b/i.test(ultimo));
  const otraVezElUltimo = Boolean(promo) && !vitrina && !salida.derivar?.necesario && pideOtraVezUnEnlace(ultimo, respuesta)
    && ultimoEnlace(mensajes).startsWith(promo.enlace);
  if (promo && !salida.emergencia && !respuesta.includes(promo.enlace) && (otraVezElUltimo
    || ((pideOfertas(ultimoCompleto) || CATALOGO_DE_OFERTAS.test(respuesta))
      && (!yaDicho(promo.enlace) || loPideOtraVez || (!vitrina && anunciaElEnlace(respuesta)))))) {
    respuesta += `\n\n🏷️ Catálogo de ofertas:\n${promo.enlace}`;
  }
  if ((productos.length || vitrina) && !tasa) {
    respuesta += '\n\n(Nota: ahora mismo no pude consultar la tasa BCV, así que el monto en bolívares te lo confirma una asesora.)';
  }
  // La IA a veces dice «toca el botón de la asesora» sin marcar el pase: se agregan las asesoras, así no promete algo
  // que el cliente no ve. Con vitrina no cuentan las cláusulas de «Ver modelos» («toca el botón «Ver modelos» y una
  // asesora te confirma…» habla de la lista: WhatsApp cambiaba la lista por el pase y el cliente no veía los modelos),
  // pero sí lo demás de su oración («…para verlas; si prefieres, escríbele a una asesora por los enlaces de abajo»).
  const prometeAsesora = prometeBotonDeAsesora(vitrina ? sinClausulasVerModelos(respuesta) : respuesta);
  const whatsapp = salida.derivar?.necesario || prometeAsesora
    ? enlaceWhatsapp(salida.derivar?.area ?? 'home', resumen, canal)
    : null;

  return {
    respuesta,
    productos,
    vitrina,
    whatsapp,
    tasa,
    formulario: Boolean(salida.ofrecer_formulario),
    emergencia: Boolean(salida.emergencia),
    // Lo que se guarda en la hoja como "le interesa" y "resumen".
    interes: productos.map((p) => queEs(p).join(' ')).join(', '),
    resumen,
  };
}

/** Formulario de contacto: va directo a la hoja de clientes, sin pasar por la IA. */
export async function atenderDatos(cuerpo, ip) {
  if (excedeLimite(ip)) {
    return { status: 429, datos: { error: 'Demasiados envíos seguidos. Espera un momento e intenta de nuevo.' } };
  }
  const nombre = texto(cuerpo?.nombre, 80);
  const telefono = texto(cuerpo?.telefono, 30);
  const digitos = telefono.replace(/\D/g, '');
  if (nombre.length < 2) return { status: 400, datos: { error: 'Escribe tu nombre.' } };
  if (digitos.length < 7 || digitos.length > 15) return { status: 400, datos: { error: 'Revisa tu número de teléfono.' } };
  const conversacion = texto(cuerpo?.conversacion, 64).replace(/[^\w-]/g, '') || crypto.randomUUID();
  const guardado = await guardarCliente({
    conversacion,
    cliente: { nombre, telefono, ciudad: texto(cuerpo?.ciudad, 60) },
    interes: texto(cuerpo?.interes, 200),
    resumen: texto(cuerpo?.resumen, 300),
    canal: 'Web',
  });
  if (!guardado) {
    return { status: 503, datos: { error: 'No pudimos guardar tus datos en este momento. Escríbenos por WhatsApp.' } };
  }
  return { status: 200, datos: { guardado: true } };
}

// Precalentado al cargar el Worker. Cloudflare da 1 s de CPU para el arranque, aparte de los 10 ms por pedido
// del plan gratis: aquí se compilan las funciones y expresiones regulares que el primer pedido de cada instancia
// usaría por primera vez. Cada texto va una vez sin emoji y otra con emoji, porque V8 compila aparte las dos
// variantes de cada expresión (y el saludo y las respuestas traen emoji). Sin red, y nunca lanza.
try {
  for (const extra of ['', ' 👋✨']) {
    const muestra = `Quiero ver camas${extra}. Correo maria arroba gmail punto com, @maria.vzla, cédula V-12.345.678, `
      + 'tlf 0414-555-1234, el 07/10/2026, REF 1.290 o Bs 1.003.955';
    limpiarMensajes([{ role: 'user', content: muestra }]);
    ocultarDatosPersonales(muestra);
    numerosDelCliente([{ role: 'user', content: muestra }]);
    categoriaPedida(muestra);
    fueraDeCategoria([{ id: 48 }, { id: 18 }], 'Camas', muestra);
    montosInventados(`REF 550, 999 $, 10 USD, 5 dólares, Bs 100, 10%${extra}`, { ids: [48], delCliente: [] });
    montosInventados(`Hasta 20 % de descuento: la Toronto en stock a REF 330 en vez de REF 405${extra}`, { ids: [48], delCliente: [] });
    pideOfertas(muestra);
    pideCatalogoDeOfertas(muestra);
    totalesIncoherentes(`total REF 670${extra}`, [tarjeta(48, 'Queen', null, { box: 'nube' })]);
    recargoDeBoxEnAltaGama(`el box nube tiene un recargo de REF 120${extra}`, [{ id: 52 }]);
  }
  tarjeta(48, 'Queen 1,60x1,90 M', { valor: 984.26 }, { box: 'nube', cantidad: 2, telaPremium: true });
  tarjeta(48, 'Individual', { valor: 984.26 }, { oferta: 330 });
  enlaceWhatsapp('home', 'Cama Toronto · Queen', 'web');
  calentarVitrina(); // «quiero ver camas», «muéstrame otras» y la nota del historial (lib/vitrina.js)
} catch { /* solo es una optimización */ }
