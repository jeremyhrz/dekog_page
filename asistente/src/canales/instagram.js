/**
 * Instagram (API de Instagram con inicio de sesión de Instagram).
 *
 *   GET  /instagram  → verificación del webhook (IG_VERIFY_TOKEN)
 *   POST /instagram  → mensajes directos entrantes; 200 al instante y proceso en segundo plano
 *   GET  /instagram/conectar      → la dueña autoriza la cuenta (ver instagramConectar)
 *   POST /instagram/desautorizar  → Meta avisa que quitaron la app desde Instagram
 *   POST /instagram/borrar-datos  → Meta pide borrar los datos de la cuenta
 *
 * Secretos: IG_TOKEN (token de 60 días de la cuenta de Dekog; el Worker lo
 * renueva cada semana y guarda el nuevo en KV), IG_APP_SECRET (firma; se
 * acepta también META_APP_SECRET), IG_VERIFY_TOKEN. Opcionales: IG_API_VERSION
 * (v25.0), IG_API_BASE (pruebas), IG_VITRINA=tarjetas (la vitrina manda además
 * un carrusel con fotos; sin ella, solo la lista en texto con respuestas rápidas),
 * IG_USUARIO (la cuenta que se puede conectar; por defecto dekog.home).
 *
 * Si Instagram deja de aceptar el token (venció, cambiaron la contraseña o quitaron
 * el permiso), se borra de KV y queda UN aviso al día en la hoja, que llega por correo.
 *
 * Si el cliente escribe su número de WhatsApp, lo captura el servidor y va a
 * la hoja; la IA solo ve "[dato personal]". Si muestra interés sin dar número,
 * queda en la hoja igual, con su @usuario.
 *
 * Asesoras (21-oct): cuando una asesora escribe en un chat desde la cuenta de Dekog, el asistente se calla en ese chat
 * (PAUSA_ASESORA_MS desde su último mensaje). Si el cliente le escribe y pasa 1 hora sin que ella responda, el asistente
 * le pide su nombre y su WhatsApp (tarea programada cada 15 minutos) y, cuando los deja, van a la hoja (y al correo).
 */
import { config } from '../lib/config.js';
import { pensar, ocultarDatosPersonales } from '../chat.js';
import { guardarCliente } from '../lib/hoja.js';
import { tasaBcv } from '../lib/bcv.js';
import { fotoParaCanales } from '../lib/catalogo.js';
import { vitrinaSiguiente } from '../lib/vitrina.js';
import { descargarImagen } from '../lib/imagen.js';
import { NOTA_FOTO } from '../lib/negocio.js';
import { promoActiva, textoDeLaPromo } from '../lib/promo.js';
import { enlaceCorto } from '../lib/enlaces.js';
import {
  cargarEstado, guardarEstado, hayNovedadParaHoja, marcarEnHoja, yaAtendido, productosNuevos, unirSeguidos,
} from './memoria.js';
import {
  verificarSuscripcion, firmaValida, lineaPrecio, extraerTelefono, nombreEscrito, presentarse, pideBolivares,
  eleccionDe, fichaElegida, carruselDeVitrina, respuestasRapidas, cierreInstagram, recortar,
} from './meta.js';

const RAIZ = () => config.IG_API_BASE || 'https://graph.instagram.com';
const graph = () => `${RAIZ()}/${config.IG_API_VERSION || 'v25.0'}`;
// Límite de Instagram por mensaje de texto: 1000 bytes, menos los 3 de la MARCA que va al final.
const MAX_BYTES = 1000 - 3;

async function tokenActual(env) {
  return (await env.CONVERSACIONES?.get('ig:token')) || config.IG_TOKEN;
}

/*
 * Instagram avisa también lo que se manda DESDE la cuenta de Dekog (los «ecos»): las respuestas del asistente y lo que
 * escribe una asesora en la app. El aviso no dice quién lo mandó, así que cada texto del asistente termina con un
 * carácter invisible (MARCA): un eco de texto sin ella lo escribió una persona. Por si Instagram quitara la marca, la
 * pausa solo funciona después de ver un eco que la conserva (ig:marca en KV, se renueva cada semana); si un eco de un
 * texto del asistente vuelve sin ella, se desactiva sola. Así el asistente nunca se calla por error.
 */
export const MARCA = '⁣'; // INVISIBLE SEPARATOR: no se ve en ningún teléfono
const propios = new Set(); // ids (mid) y textos de lo que mandó el asistente desde esta instancia
function recordar(valor) {
  if (!valor) return;
  propios.add(valor);
  if (propios.size > 400) propios.delete(propios.values().next().value);
}
const sinMarca = (texto) => String(texto ?? '').replaceAll(MARCA, '').trim();

async function enviar(env, igsid, message) {
  const texto = typeof message.text === 'string' ? message.text : null;
  const r = await fetch(`${graph()}/me/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await tokenActual(env)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: igsid }, message: texto === null ? message : { ...message, text: `${texto}${MARCA}` } }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    console.warn('Instagram rechazó el envío:', r.status, j?.error?.code, j?.error?.message);
    if (j?.error?.code === 190) await avisarDesconexion(env, 'Instagram ya no acepta el permiso de la cuenta');
  } else {
    recordar((await r.json().catch(() => ({})))?.message_id);
    recordar(sinMarca(texto));
  }
  return r.ok;
}

const hoyCaracas = () => new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * El bot quedó sin permiso en Instagram: se borra el token (así /salud deja de decir que está conectado) y queda
 * UNA fila «Sistema» al día en la hoja, que llega por correo. Nunca lanza: corre dentro del envío de un mensaje.
 */
async function avisarDesconexion(env, motivo) {
  console.error('Instagram desconectado:', motivo);
  const kv = env.CONVERSACIONES;
  const hoy = hoyCaracas();
  try {
    if (await kv?.get(`ig:aviso:${hoy}`)) return; // ya se avisó hoy
    await kv?.put(`ig:aviso:${hoy}`, '1', { expirationTtl: 60 * 60 * 48 });
    await kv?.delete('ig:token');
  } catch (e) {
    console.warn('No se pudo marcar la desconexión de Instagram en KV:', e?.message);
  }
  await guardarCliente({
    conversacion: `sistema-ig-${hoy}`,
    cliente: { nombre: 'Instagram desconectado', telefono: '', ciudad: '' },
    interes: '',
    resumen: `El asistente ya no puede responder en Instagram (${motivo}). Hay que volver a conectar la cuenta: avísale a Jeremy.`,
    canal: 'Sistema',
  }).catch(() => false);
}

// "attachment" (un objeto) es la forma que Instagram aceptó con la cuenta real (13-oct); "attachments" con un
// objeto suelto la rechazaba con «attachments[0] must be a valid json object». Si un día la rechaza, va la lista.
async function enviarImagen(env, igsid, url) {
  const imagen = { type: 'image', payload: { url } };
  if (!(await enviar(env, igsid, { attachment: imagen }))) await enviar(env, igsid, { attachments: [imagen] });
}

/**
 * La vitrina en Instagram. IG_VITRINA=tarjetas: primero un generic template (fotos que se deslizan; no se ve en
 * Instagram de escritorio). Siempre, al final, un texto con los modelos, el enlace al catálogo y una respuesta rápida
 * por modelo (+ «Ver más …»). Si Instagram rechaza las respuestas rápidas, el mismo texto va sin ellas.
 */
async function enviarVitrina(env, igsid, v, tasa) {
  const conTarjetas = config.IG_VITRINA === 'tarjetas' && await enviar(env, igsid, { attachment: carruselDeVitrina(v) });
  const trozos = partirPorBytes(cierreInstagram(v, { conTarjetas, tasa })).slice(0, 3);
  for (const [i, trozo] of trozos.entries()) {
    const ultimo = i === trozos.length - 1;
    const ok = await enviar(env, igsid, ultimo ? { text: trozo, quick_replies: respuestasRapidas(v) } : { text: trozo });
    if (!ok && ultimo) await enviar(env, igsid, { text: trozo });
  }
}

/** Parte un texto en trozos de como mucho 1000 bytes, sin cortar palabras si se puede. */
export function partirPorBytes(texto, maximo = MAX_BYTES) {
  const codificador = new TextEncoder();
  const trozos = [];
  let resto = texto;
  while (codificador.encode(resto).length > maximo) {
    let corte = resto.length;
    while (codificador.encode(resto.slice(0, corte)).length > maximo) corte = Math.floor(corte * 0.9);
    const espacio = resto.lastIndexOf(' ', corte);
    if (espacio > corte * 0.6) corte = espacio;
    // No partir un emoji (par sustituto UTF-16) por la mitad: saldría "�".
    const previo = resto.charCodeAt(corte - 1);
    if (previo >= 0xd800 && previo <= 0xdbff) corte -= 1;
    trozos.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte).trim();
  }
  if (resto) trozos.push(resto);
  return trozos;
}

export function instagramGet(url) {
  return verificarSuscripcion(url, config.IG_VERIFY_TOKEN);
}

/*
 * Conexión de la cuenta de Instagram SIN compartir la contraseña (inicio de sesión de Instagram
 * para empresas). La dueña abre el enlace de enlaceConexion() en su teléfono, toca «Permitir» e
 * Instagram la devuelve aquí con un código. Se cambia por un token de 60 días, se guarda en KV
 * (lo renueva la tarea semanal) y se activan los avisos de mensajes de la cuenta.
 * Requiere IG_APP_ID, IG_APP_SECRET y IG_ESTADO (clave del enlace, para que nadie más conecte otra cuenta).
 */
const OAUTH = () => config.IG_OAUTH_BASE || 'https://api.instagram.com';
const AUTORIZAR = () => config.IG_AUTH_BASE || 'https://www.instagram.com';
const DIAS_60 = 60 * 60 * 24 * 60;

/** Las cuentas que se pueden conectar (IG_USUARIO, separadas por comas; por defecto dekog.home). */
export function cuentasPermitidas() {
  return (config.IG_USUARIO || 'dekog.home').split(',').map((c) => c.trim().replace(/^@/, '').toLowerCase()).filter(Boolean);
}

function redireccion(url) {
  return `${url.origin}/instagram/conectar`;
}

export function enlaceConexion(url) {
  const p = new URLSearchParams({
    client_id: config.IG_APP_ID ?? '',
    redirect_uri: redireccion(url),
    response_type: 'code',
    scope: 'instagram_business_basic,instagram_business_manage_messages',
    state: config.IG_ESTADO ?? '',
  });
  return `${AUTORIZAR()}/oauth/authorize?${p}`;
}

function pagina(titulo, texto, status = 200) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} | DEKOG</title><style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f4f0ec;color:#1a1a1a;display:grid;place-items:center;min-height:100vh;padding:16px}
main{background:#fff;border-radius:16px;padding:28px 24px;max-width:420px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08)}h1{font-size:22px;margin:0 0 10px}p{line-height:1.5;margin:0}</style></head>
<body><main><h1>${titulo}</h1><p>${texto}</p></main></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function instagramConectar(url, env) {
  if (!config.IG_ESTADO || url.searchParams.get('state') !== config.IG_ESTADO) {
    return pagina('Enlace no válido', 'Este enlace de conexión no es válido. Pídele a Jeremy uno nuevo.', 403);
  }
  if (url.searchParams.get('error')) {
    return pagina('No se conectó', 'No se dio el permiso en Instagram. Puedes volver a abrir el enlace y tocar «Permitir».', 400);
  }
  const codigo = (url.searchParams.get('code') ?? '').replace(/#_$/, '');
  if (!codigo) return pagina('Falta el permiso', 'Abre el enlace que te enviaron y toca «Permitir».', 400);
  try {
    const corto = await fetch(`${OAUTH()}/oauth/access_token`, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: config.IG_APP_ID ?? '',
        client_secret: config.IG_APP_SECRET ?? '',
        grant_type: 'authorization_code',
        redirect_uri: redireccion(url),
        code: codigo,
      }),
    }).then((r) => r.json());
    const datos = corto?.data?.[0] ?? corto; // Meta ha respondido en las dos formas
    if (!datos?.access_token) throw new Error(`código no aceptado (${corto?.error_type ?? corto?.error?.code ?? 'sin token'})`);

    const largo = await fetch(`${RAIZ()}/access_token?${new URLSearchParams({
      grant_type: 'ig_exchange_token', client_secret: config.IG_APP_SECRET ?? '', access_token: datos.access_token,
    })}`).then((r) => r.json());
    if (!largo?.access_token) throw new Error(`no se obtuvo el token largo (${largo?.error?.code ?? 'sin token'})`);

    // Antes de guardar nada: el enlace sirve con cualquier cuenta profesional, y otra cuenta pisaría el token de Dekog.
    const yo = await fetch(`${graph()}/me?fields=username`, { headers: { Authorization: `Bearer ${largo.access_token}` } })
      .then((r) => r.json()).catch(() => ({}));
    const usuario = String(yo.username ?? '').toLowerCase().replace(/[^a-z0-9._]/g, '');
    const [principal] = cuentasPermitidas();
    if (!cuentasPermitidas().includes(usuario)) {
      console.warn('Se intentó conectar otra cuenta de Instagram:', usuario || '(sin usuario)');
      return pagina('Esa no es la cuenta de Dekog',
        `Entraste con <b>@${usuario || '?'}</b>. Hay que conectar <b>@${principal}</b>: en Instagram cambia a @${principal} y vuelve a abrir el enlace.`, 403);
    }

    const segundos = Math.max(60, Math.min(Number(largo.expires_in) || DIAS_60, DIAS_60));
    await env.CONVERSACIONES.put('ig:token', largo.access_token, { expirationTtl: segundos });
    const suscrito = await fetch(`${graph()}/me/subscribed_apps?subscribed_fields=messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${largo.access_token}` },
    }).then((r) => r.json()).catch(() => ({}));
    console.log('Instagram conectado:', usuario, '| mensajes suscritos:', Boolean(suscrito?.success));
    return pagina('✅ Instagram conectado', `La cuenta <b>@${usuario}</b> quedó conectada al asistente de Dekog. Ya puedes cerrar esta página.`);
  } catch (e) {
    console.error('No se pudo conectar Instagram:', e?.message);
    return pagina('No se pudo conectar', 'Hubo un problema al conectar Instagram. Avísale a Jeremy para revisarlo.', 502);
  }
}

export async function instagramPost(request, env, ctx) {
  const crudo = await request.arrayBuffer();
  const firma = request.headers.get('X-Hub-Signature-256');
  if (!(await firmaValida(crudo, firma, config.IG_APP_SECRET, config.META_APP_SECRET))) {
    return new Response('Firma inválida', { status: 401 });
  }
  let aviso;
  try {
    aviso = JSON.parse(new TextDecoder().decode(crudo));
  } catch {
    return new Response('ok');
  }
  for (const entrada of aviso.entry ?? []) {
    for (const evento of entrada.messaging ?? []) {
      const m = evento.message;
      if (!m || m.is_deleted || m.is_self) continue;
      // Lo que salió desde la cuenta de Dekog: las respuestas del asistente o una asesora escribiendo (ver procesarEco).
      if (m.is_echo) ctx.waitUntil(procesarEco(evento, env).catch((e) => console.error('Error con un eco de Instagram:', e?.message)));
      else ctx.waitUntil(procesar(evento, env).catch((e) => console.error('Error con un mensaje de Instagram:', e)));
    }
  }
  return new Response('ok');
}

// ── La asesora en el chat ────────────────────────────────────────────────────────────────────────────────────────
const HORA_MS = 60 * 60 * 1000;
const PAUSA_ASESORA_MS = 24 * HORA_MS; // el asistente se calla en el chat desde el último mensaje de la asesora
const ESPERA_MS = HORA_MS; // sin respuesta de la asesora en 1 hora, se le piden sus datos al cliente
const CLAVE_SEGUIMIENTOS = 'ig:seguimientos';
const SEGUIMIENTO = '¡Hola de nuevo! 🙏 Disculpa la espera: nuestras asesoras están atendiendo a otros clientes. Para no '
  + 'hacerte esperar más, déjame aquí tu nombre y tu número de WhatsApp y una asesora de Dekog te escribe apenas se desocupe 💛';
const GRACIAS_POR_LOS_DATOS = '¡Gracias! 💛 Ya le pasé tus datos a una asesora de Dekog: te escribe muy pronto.';

let marcaVista = false;
async function marcaComprobada(env) {
  if (!marcaVista) marcaVista = Boolean(await env.CONVERSACIONES?.get('ig:marca').catch(() => null));
  return marcaVista;
}

/** Un eco volvió con la MARCA: Instagram la conserva y la pausa por asesora puede funcionar. */
async function confirmarMarca(env) {
  if (await marcaComprobada(env)) return;
  marcaVista = true;
  await env.CONVERSACIONES?.put('ig:marca', new Date().toISOString(), { expirationTtl: 7 * 86400 })
    .catch((e) => console.warn('No se pudo anotar la marca de Instagram:', e?.message));
  console.log('Instagram conserva la marca invisible del asistente: la pausa por asesora queda activa');
}

/**
 * Un mensaje que salió desde la cuenta de Dekog. Si es un texto del asistente (con la MARCA), nada. Si es un texto sin
 * ella, lo escribió una asesora: el asistente se calla en ese chat y lo que ella dijo queda en el historial. Fotos y
 * stickers sin texto no cuentan (no se sabe quién los mandó).
 */
async function procesarEco(evento, env) {
  const igsid = evento.recipient?.id; // en un eco, el destinatario es el cliente
  const texto = typeof evento.message.text === 'string' ? evento.message.text : '';
  if (!igsid || !sinMarca(texto)) return;
  if (texto.includes(MARCA)) {
    await confirmarMarca(env);
    return;
  }
  if (propios.has(evento.message.mid) || propios.has(sinMarca(texto))) {
    // Un texto del asistente volvió sin la marca: Instagram la quitó. Sin ella no se distingue a la asesora, así que la
    // pausa se apaga hasta que la marca vuelva a verse.
    console.warn('Instagram devolvió un mensaje del asistente sin la marca invisible: la pausa por asesora se desactiva');
    marcaVista = false;
    await env.CONVERSACIONES?.delete('ig:marca').catch(() => {});
    return;
  }
  if (!(await marcaComprobada(env))) {
    console.log('Instagram: escribieron desde la cuenta de Dekog, pero la marca aún no se comprobó; el asistente sigue');
    return;
  }
  const kv = env.CONVERSACIONES;
  const clave = `ig:${igsid}`;
  const estado = await cargarEstado(kv, clave);
  estado.humano = Date.now();
  estado.mensajes.push({ role: 'assistant', content: ocultarDatosPersonales(sinMarca(texto)).slice(0, 800) });
  await guardarEstado(kv, clave, estado);
  console.log('Instagram: una asesora escribió en un chat; el asistente se calla ahí');
}

/** Anota que a ese cliente hay que pedirle sus datos a esa hora si sigue esperando (lo revisa seguimientosInstagram). */
async function programarSeguimiento(env, igsid, cuando) {
  const kv = env.CONVERSACIONES;
  if (!kv) return;
  try {
    const lista = (await kv.get(CLAVE_SEGUIMIENTOS, 'json')) ?? {};
    lista[igsid] = cuando;
    await kv.put(CLAVE_SEGUIMIENTOS, JSON.stringify(lista), { expirationTtl: 3 * 86400 });
  } catch (e) {
    console.warn('No se pudo programar el seguimiento de Instagram:', e?.message);
  }
}

/**
 * La asesora está atendiendo este chat: el asistente no responde. Lo que escribe el cliente queda en el historial (sin
 * datos personales) y, si quedó esperando, se programa el pedido de datos para dentro de 1 hora. Si ya se le pidieron y
 * los está dando, van a la hoja (llega el correo a Dekog) y se le confirma, una sola vez.
 */
async function atenderEnPausa(env, igsid, clave, estado, { texto, nota, imagen, ahora }) {
  const escrito = ocultarDatosPersonales(texto);
  if (escrito || nota || imagen) {
    estado.mensajes.push({ role: 'user', content: [imagen ? NOTA_FOTO : '', nota, escrito].filter(Boolean).join(' ') });
  }
  if (!(estado.esperaDesde > estado.humano)) {
    estado.esperaDesde = ahora;
    await programarSeguimiento(env, igsid, ahora + ESPERA_MS);
  }
  const telefono = extraerTelefono(texto);
  const nombre = nombreEscrito(texto, telefono);
  if (estado.seguimiento > estado.humano && estado.datosTomados < estado.seguimiento && (telefono || nombre)) {
    const usuario = await nombreDeUsuario(env, igsid);
    const ok = await guardarCliente({
      // Fila propia del día: la hoja solo manda el correo con las filas NUEVAS, y este cliente quizá ya tenía la suya.
      conversacion: `ig-${igsid}-espera-${hoyCaracas()}`,
      cliente: { nombre: [nombre, usuario].filter(Boolean).join(' · '), telefono, ciudad: '' },
      interes: estado.interes,
      resumen: [estado.resumen, 'Esperó más de 1 hora a la asesora en Instagram y dejó sus datos: escríbele.'].filter(Boolean).join(' · '),
      canal: 'Instagram',
    });
    if (ok) {
      estado.datosTomados = ahora;
      await enviar(env, igsid, { text: GRACIAS_POR_LOS_DATOS });
    }
  }
  await guardarEstado(env.CONVERSACIONES, clave, estado);
}

/**
 * Tarea programada (cada 15 minutos): a los clientes que llevan 1 hora esperando a la asesora sin respuesta se les
 * piden su nombre y su WhatsApp, una vez por espera. Instagram deja escribirle hasta 24 h después de su último mensaje.
 */
export async function seguimientosInstagram(env, ahora = Date.now()) {
  const kv = env.CONVERSACIONES;
  if (!kv) return;
  const lista = (await kv.get(CLAVE_SEGUIMIENTOS, 'json').catch(() => null)) ?? {};
  const vencidos = Object.keys(lista).filter((igsid) => lista[igsid] <= ahora);
  if (!vencidos.length) return;
  for (const igsid of vencidos) {
    delete lista[igsid];
    const clave = `ig:${igsid}`;
    const estado = await cargarEstado(kv, clave);
    const esperando = estado.esperaDesde > estado.humano && estado.seguimiento < estado.esperaDesde;
    if (!esperando || ahora - estado.esperaDesde > 23 * HORA_MS) continue;
    if (await enviar(env, igsid, { text: SEGUIMIENTO })) {
      estado.seguimiento = ahora;
      await guardarEstado(kv, clave, estado);
      console.log('Instagram: un cliente esperó 1 hora a la asesora; se le pidieron sus datos');
    }
  }
  await kv.put(CLAVE_SEGUIMIENTOS, JSON.stringify(lista), { expirationTtl: 3 * 86400 })
    .catch((e) => console.warn('No se pudo actualizar los seguimientos de Instagram:', e?.message));
}

// ── El mensaje de la promo (lib/promo.js), una vez por cliente y por promo ───────────────────────────────────────────
const promoMandada = new Set(); // en esta instancia: dos mensajes seguidos del cliente se atienden a la vez

async function enviarPromoSiToca(env, igsid, clave, estado) {
  const promo = promoActiva();
  if (!promo || estado.promoVista === promo.id) return;
  estado.promoVista = promo.id;
  const marca = `${clave}|${promo.id}`;
  // Otra vuelta del mismo cliente pudo mandarla hace un instante: se mira la memoria justo antes.
  if (promoMandada.has(marca) || (await cargarEstado(env.CONVERSACIONES, clave)).promoVista === promo.id) return;
  promoMandada.add(marca);
  if (promoMandada.size > 500) promoMandada.delete(promoMandada.values().next().value);
  await enviarImagen(env, igsid, promo.imagen);
  await enviar(env, igsid, { text: textoDeLaPromo(promo) });
}

// ── Lo que mandó el cliente ─────────────────────────────────────────────────────────────────────────────────────────
const PUBLICACION = new Set(['ig_post', 'share', 'post']); // «share» es el tipo viejo (Meta lo retira desde feb-2026)
const REEL = new Set(['ig_reel', 'reel', 'story', 'ig_story']);
const SIN_LEER = new Set(['audio', 'video', 'file']);
const AVISO_SIN_LEER = 'Por ahora no puedo escuchar notas de voz ni ver videos 🙏 Escríbeme tu pregunta y te respondo al '
  + 'instante, o mándame una foto del modelo que te gusta.';

/** El pie de una publicación compartida (si Instagram lo manda), sin teléfonos, correos ni usuarios. */
function tituloDe(adjunto) {
  const t = ocultarDatosPersonales(String(adjunto?.payload?.title ?? '')).replaceAll('[dato personal]', '').replace(/\s+/g, ' ').trim();
  return t ? `: «${recortar(t, 160)}»` : '';
}

/**
 * Qué mandó, además del texto: una foto, una publicación o un reel compartidos, o la respuesta a una historia de Dekog
 * (con su imagen si se puede abrir, para reconocer el modelo), o algo que no se puede leer (audio, video, archivo).
 * `ignorar`: una mención en una historia o un tipo que Instagram no soporta (no se responde nada).
 */
async function contenidoDe(m) {
  const adjuntos = Array.isArray(m.attachments) ? m.attachments : [];
  if (m.is_unsupported || adjuntos.some((a) => a?.type === 'story_mention')) return { ignorar: true };
  const foto = adjuntos.find((a) => a?.type === 'image' && a.payload?.url);
  const publicacion = adjuntos.find((a) => PUBLICACION.has(a?.type));
  const reel = adjuntos.find((a) => REEL.has(a?.type));
  const historia = m.reply_to?.story;
  let url = foto?.payload?.url ?? '';
  let nota = '';
  if (publicacion) {
    nota = `(compartió una publicación de Instagram${tituloDe(publicacion)})`;
    url ||= publicacion.payload?.url ?? '';
  } else if (reel) {
    nota = `(compartió un reel de Instagram${tituloDe(reel)})`;
  } else if (historia) {
    nota = '(respondió a una historia de Dekog)';
    url ||= historia.url ?? '';
  }
  return {
    imagen: url ? await descargarImagen(url) : null,
    nota,
    sinLeer: adjuntos.some((a) => SIN_LEER.has(a?.type)),
  };
}

async function nombreDeUsuario(env, igsid) {
  try {
    const r = await fetch(`${graph()}/${igsid}?fields=username,name`, { headers: { Authorization: `Bearer ${await tokenActual(env)}` } });
    const j = await r.json();
    return j.username ? `@${j.username}${j.name ? ` (${j.name})` : ''}` : (j.name ?? '');
  } catch {
    return '';
  }
}

async function procesar(evento, env) {
  const igsid = evento.sender?.id;
  if (!igsid) return;
  if (await yaAtendido(env.CONVERSACIONES, evento.message.mid)) return; // aviso repetido de Meta
  const clave = `ig:${igsid}`;
  const estado = await cargarEstado(env.CONVERSACIONES, clave);
  if (estado.procesados.includes(evento.message.mid)) return;
  estado.procesados.push(evento.message.mid);

  const texto = (evento.message.text ?? '').trim().slice(0, 800);
  // Una foto, una publicación compartida o la respuesta a una historia: la IA compara la imagen con el catálogo
  // (lib/imagen.js). Instagram la manda como adjunto con su URL.
  const { imagen, nota, sinLeer, ignorar } = await contenidoDe(evento.message);
  if (ignorar) return;
  const ahora = Date.now();

  // Una asesora está atendiendo este chat: el asistente no le responde al cliente.
  if (estado.humano && ahora - estado.humano < PAUSA_ASESORA_MS) {
    await atenderEnPausa(env, igsid, clave, estado, { texto, nota, imagen, ahora });
    return;
  }

  if (!texto && !imagen && !nota) {
    // Nota de voz, video o archivo: UN aviso al día y después silencio. Un sticker o un GIF que no se pudo abrir: nada.
    // (Hasta el 21-oct salía «Por ahora solo puedo leer mensajes de texto y fotos» con cada publicación compartida, cada
    // sticker y cada audio, y a la dueña no le gustaba que se repitiera.)
    if (!sinLeer || estado.avisoSinLeer === hoyCaracas()) return;
    estado.avisoSinLeer = hoyCaracas();
    await enviar(env, igsid, { text: presentarse(AVISO_SIN_LEER, estado.mensajes.length === 0) });
    await enviarPromoSiToca(env, igsid, clave, estado);
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  const telefono = extraerTelefono(texto); // se guarda en la hoja; la IA no lo ve
  const escrito = ocultarDatosPersonales(texto);
  estado.mensajes.push({ role: 'user', content: [imagen ? NOTA_FOTO : '', nota, escrito].filter(Boolean).join(' ') });

  // Tocó una respuesta rápida de la vitrina: se responde SIN IA.
  const eleccion = eleccionDe(evento.message.quick_reply?.payload);
  if (eleccion?.tipo === 'producto') {
    const ficha = fichaElegida(eleccion.id, await tasaBcv());
    if (productosNuevos(estado, [ficha.tarjeta]).length) await enviarImagen(env, igsid, fotoParaCanales(ficha.tarjeta.id));
    // Instagram no tiene formato: sin los *asteriscos* de WhatsApp.
    for (const trozo of partirPorBytes(ficha.caption.replace(/\*/g, '')).slice(0, 3)) await enviar(env, igsid, { text: trozo });
    estado.mensajes.push({ role: 'assistant', content: ficha.texto });
    estado.interes = ficha.interes;
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }
  if (eleccion?.tipo === 'mas') {
    const tasa = config.IG_VITRINA === 'tarjetas' ? await tasaBcv() : null;
    const v = vitrinaSiguiente(eleccion.clave, estado.mensajes, tasa);
    await enviarVitrina(env, igsid, v, tasa);
    estado.mensajes.push({ role: 'assistant', content: `Más ${v.titulo.toLowerCase()} para elegir.\n\n${v.nota}` });
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  const r = await pensar(unirSeguidos(estado.mensajes), 'instagram', { imagen, kv: env.CONVERSACIONES });
  const respuesta = presentarse(r.respuesta, estado.mensajes.length === 1);
  const { vitrina } = r;

  // La foto y el precio solo van cuando cambian (no repetir la misma foto en cada respuesta).
  // Con vitrina, los modelos que nombró la IA ya van en ella: sin foto aparte.
  const nuevos = vitrina ? [] : productosNuevos(estado, r.productos);
  const [principal] = nuevos;
  if (principal) await enviarImagen(env, igsid, fotoParaCanales(principal.id));
  // Pidió el monto en bolívares (o la respuesta lo promete) del MISMO producto: la foto no se repite, el precio sí.
  const repetidos = !vitrina && !nuevos.length && pideBolivares(texto, respuesta) ? r.productos : [];
  let cuerpo = [respuesta, [...nuevos, ...repetidos].map((p) => lineaPrecio(p, r.tasa)).join('\n')].filter(Boolean).join('\n\n');
  // El enlace a la asesora, corto (lib/enlaces.js): el largo, con el resumen, Instagram lo mostraba a medias en gris.
  if (r.whatsapp) cuerpo += `\n\nHabla con una asesora por WhatsApp 👉 ${await enlaceCorto(env.CONVERSACIONES, r.whatsapp.url)}`;
  for (const trozo of partirPorBytes(cuerpo).slice(0, 3)) await enviar(env, igsid, { text: trozo });
  if (vitrina) await enviarVitrina(env, igsid, vitrina, r.tasa);
  // Después de la bienvenida (o de la primera respuesta desde que hay promo), la promo con su imagen y su enlace.
  await enviarPromoSiToca(env, igsid, clave, estado);
  // La nota le dice a la IA qué modelos vio (para «la tercera» u «otras») y a la vitrina qué no repetir.
  estado.mensajes.push({ role: 'assistant', content: vitrina ? `${respuesta}\n\n${vitrina.nota}` : respuesta });

  if (r.interes) estado.interes = r.interes;
  if (r.resumen) estado.resumen = r.resumen;
  // Dio su teléfono, mostró interés o pidió una asesora: queda en la hoja con su @usuario (la
  // asesora puede escribirle por Instagram) y con su teléfono si lo dio; la misma fila se completa
  // cuando lo da más tarde o cambia lo que pide.
  const interesado = Boolean(telefono) || r.formulario || Boolean(r.whatsapp);
  if (hayNovedadParaHoja(estado, { interesado, telefono })) {
    const ok = await guardarCliente({
      conversacion: `ig-${igsid}`,
      cliente: { nombre: await nombreDeUsuario(env, igsid), telefono, ciudad: '' },
      interes: estado.interes,
      resumen: estado.resumen,
      canal: 'Instagram',
    });
    if (ok) marcarEnHoja(estado, telefono);
  }
  await guardarEstado(env.CONVERSACIONES, clave, estado);
}

/** Tarea semanal: renueva el token de 60 días antes de que venza y lo guarda en KV. */
export async function renovarTokenInstagram(env) {
  const actual = await tokenActual(env);
  if (!actual || !env.CONVERSACIONES) return;
  const r = await fetch(`${RAIZ()}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(actual)}`);
  const j = await r.json().catch(() => ({}));
  if (j.access_token) {
    // Con su vencimiento: si la renovación dejara de funcionar, el token desaparece de KV cuando vence y /salud
    // dice la verdad (antes se guardaba sin vencimiento y seguía «conectado» con un token muerto).
    const segundos = Math.max(60, Math.min(Number(j.expires_in) || DIAS_60, DIAS_60));
    await env.CONVERSACIONES.put('ig:token', j.access_token, { expirationTtl: segundos });
    console.log('Token de Instagram renovado; vence en', Math.round(segundos / 86400), 'días');
  } else {
    console.warn('No se pudo renovar el token de Instagram:', j?.error?.message ?? `HTTP ${r.status}`);
    if (j?.error?.code === 190) await avisarDesconexion(env, 'no se pudo renovar el permiso de la cuenta');
  }
}

/** base64url → bytes. */
function bytesDeBase64Url(texto) {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
}

/**
 * El «signed_request» que Meta manda al desautorizar o al pedir el borrado: «firma.datos» en base64url, firmado con
 * HMAC-SHA256 y la clave de la app. Devuelve los datos si la firma vale (con IG_APP_SECRET o META_APP_SECRET), o null.
 */
export async function leerSignedRequest(request) {
  try {
    const firmado = (await request.formData()).get('signed_request');
    if (typeof firmado !== 'string' || !firmado.includes('.')) return null;
    const [firma, datos] = firmado.split('.', 2);
    for (const secreto of [config.IG_APP_SECRET, config.META_APP_SECRET].filter(Boolean)) {
      const clave = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
      );
      if (await crypto.subtle.verify('HMAC', clave, bytesDeBase64Url(firma), new TextEncoder().encode(datos))) {
        return JSON.parse(new TextDecoder().decode(bytesDeBase64Url(datos)));
      }
    }
  } catch {
    // cuerpo, base64 o JSON inválidos: como una firma que no vale
  }
  return null;
}

/** Quitaron la app desde Instagram: el token ya no sirve. Se borra y queda el aviso en la hoja. */
export async function instagramDesautorizar(request, env) {
  if (!(await leerSignedRequest(request))) return new Response('Firma inválida', { status: 400 });
  await avisarDesconexion(env, 'quitaron el permiso desde Instagram');
  return new Response('ok');
}

/**
 * Pedido de borrado de datos de la cuenta que conectó la app. De esa cuenta solo se guarda el token: se borra.
 * Meta exige responder con un código y una página donde se pueda consultar el pedido.
 */
export async function instagramBorrarDatos(request, env) {
  if (!(await leerSignedRequest(request))) return Response.json({ error: 'Firma inválida' }, { status: 400 });
  const codigo = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  await avisarDesconexion(env, 'pidieron borrar los datos de la cuenta');
  console.log('Instagram: pedido de borrado de datos atendido, código', codigo);
  return Response.json({ url: `https://www.dekog.net/eliminacion-datos.html?codigo=${codigo}`, confirmation_code: codigo });
}
