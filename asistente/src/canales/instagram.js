/**
 * Instagram (API de Instagram con inicio de sesión de Instagram).
 *
 *   GET  /instagram  → verificación del webhook (IG_VERIFY_TOKEN)
 *   POST /instagram  → mensajes directos entrantes; 200 al instante y proceso en segundo plano
 *
 * Secretos: IG_TOKEN (token de 60 días de la cuenta de Dekog; el Worker lo
 * renueva cada semana y guarda el nuevo en KV), IG_APP_SECRET (firma; se
 * acepta también META_APP_SECRET), IG_VERIFY_TOKEN. Opcionales: IG_API_VERSION
 * (v25.0), IG_API_BASE (pruebas).
 *
 * Si el cliente escribe su número de WhatsApp, lo captura el servidor y va a
 * la hoja; la IA solo ve "[dato personal]". Si muestra interés sin dar número,
 * queda en la hoja igual, con su @usuario.
 */
import { config } from '../lib/config.js';
import { pensar, ocultarDatosPersonales } from '../chat.js';
import { guardarCliente } from '../lib/hoja.js';
import { cargarEstado, guardarEstado, hayNovedadParaHoja, marcarEnHoja } from './memoria.js';
import { verificarSuscripcion, firmaValida, lineaPrecio, extraerTelefono, presentarse } from './meta.js';

const RAIZ = () => config.IG_API_BASE || 'https://graph.instagram.com';
const graph = () => `${RAIZ()}/${config.IG_API_VERSION || 'v25.0'}`;
const MAX_BYTES = 1000; // límite de Instagram por mensaje de texto

async function tokenActual(env) {
  return (await env.CONVERSACIONES?.get('ig:token')) || config.IG_TOKEN;
}

async function enviar(env, igsid, message) {
  const r = await fetch(`${graph()}/me/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await tokenActual(env)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: igsid }, message }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    console.warn('Instagram rechazó el envío:', r.status, j?.error?.code, j?.error?.message);
  }
  return r.ok;
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
      if (!m || m.is_echo || m.is_deleted || m.is_self) continue; // ecos de nuestras propias respuestas
      ctx.waitUntil(procesar(evento, env).catch((e) => console.error('Error con un mensaje de Instagram:', e)));
    }
  }
  return new Response('ok');
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
  const clave = `ig:${igsid}`;
  const estado = await cargarEstado(env.CONVERSACIONES, clave);
  if (estado.procesados.includes(evento.message.mid)) return;
  estado.procesados.push(evento.message.mid);

  const texto = (evento.message.text ?? '').trim().slice(0, 800);
  if (!texto) {
    await enviar(env, igsid, { text: 'Por ahora solo puedo leer mensajes de texto 🙂 Escríbeme tu pregunta y te ayudo.' });
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  const telefono = extraerTelefono(texto); // se guarda en la hoja; la IA no lo ve
  estado.mensajes.push({ role: 'user', content: ocultarDatosPersonales(texto) });
  const r = await pensar(estado.mensajes, 'instagram');
  const respuesta = presentarse(r.respuesta, estado.mensajes.length === 1);

  const [principal] = r.productos;
  if (principal) {
    // La doc de Instagram Login usa "attachments" para imágenes; la de Messenger, "attachment".
    // Se envía la forma oficial y, si Instagram la rechaza, la otra.
    const imagen = { type: 'image', payload: { url: principal.imagen } };
    if (!(await enviar(env, igsid, { attachments: imagen }))) await enviar(env, igsid, { attachment: imagen });
  }
  let cuerpo = [respuesta, r.productos.map((p) => lineaPrecio(p, r.tasa)).join('\n')].filter(Boolean).join('\n\n');
  if (r.whatsapp) cuerpo += `\n\nHabla con una asesora por WhatsApp: ${r.whatsapp.url}`;
  for (const trozo of partirPorBytes(cuerpo).slice(0, 3)) await enviar(env, igsid, { text: trozo });
  estado.mensajes.push({ role: 'assistant', content: respuesta });

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
    await env.CONVERSACIONES.put('ig:token', j.access_token);
    console.log('Token de Instagram renovado; vence en', Math.round((j.expires_in ?? 0) / 86400), 'días');
  } else {
    console.warn('No se pudo renovar el token de Instagram:', j?.error?.message ?? `HTTP ${r.status}`);
  }
}
