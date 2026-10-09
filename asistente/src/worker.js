/**
 * Worker de Cloudflare del asistente de Dekog.
 *
 *   POST /chat    → el chat de la web (ver chat.js)
 *   POST /datos   → formulario de contacto, directo a la hoja de clientes
 *   GET|POST /whatsapp   → webhook de WhatsApp (ver canales/whatsapp.js)
 *   GET|POST /instagram  → webhook de Instagram (ver canales/instagram.js), y /instagram/conectar,
 *                          /instagram/desautorizar y /instagram/borrar-datos
 *   GET  /salud   → comprobación rápida de que está vivo y configurado
 *
 * /chat y /datos solo aceptan llamadas desde dekog.net, sus links de prueba de
 * Vercel y la web en desarrollo local (CORS). Los webhooks se validan con la
 * firma de Meta. Una tarea semanal renueva el token de Instagram y otra, cada
 * hora, reconecta el webhook de WhatsApp (ver reconectarWebhookWhatsapp).
 */
import { configurar } from './lib/config.js';
import { atenderChat, atenderDatos } from './chat.js';
import { proveedorActivo } from './lib/llm.js';
import { hojaConfigurada } from './lib/hoja.js';
import { whatsappGet, whatsappPost, cupoMensual, diagnosticoWhatsapp, reconectarWebhookWhatsapp } from './canales/whatsapp.js';
import {
  instagramGet, instagramPost, instagramConectar, instagramDesautorizar, instagramBorrarDatos, renovarTokenInstagram,
} from './canales/instagram.js';

const ORIGENES_PERMITIDOS = [
  /^https:\/\/(www\.)?dekog\.net$/,
  // Solo los links de prueba del equipo de Vercel de Jeremy, no los de otras cuentas.
  /^https:\/\/dekog-page(-[a-z0-9]+)*-jeremy9070-1151s-projects\.vercel\.app$/,
  /^https:\/\/dekog-page\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
];

function cabecerasCors(origen) {
  const permitido = origen && ORIGENES_PERMITIDOS.some((r) => r.test(origen));
  return permitido
    ? {
        'Access-Control-Allow-Origin': origen,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : { Vary: 'Origin' };
}

function json(datos, status, cors) {
  return new Response(JSON.stringify(datos), {
    status,
    // no-store: ningún intermediario guarda una respuesta del chat.
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
  });
}

async function atender(request, env, ctx, url, origen, cors) {
  const webhooks = {
    '/whatsapp': { GET: () => whatsappGet(url), POST: () => whatsappPost(request, env, ctx) },
    '/instagram': { GET: () => instagramGet(url), POST: () => instagramPost(request, env, ctx) },
    // La dueña de la cuenta da permiso desde su teléfono; nadie comparte la contraseña.
    '/instagram/conectar': { GET: () => instagramConectar(url, env) },
    // Las dos URL que pide Meta en la configuración de inicio de sesión de la app (firmadas con su clave).
    '/instagram/desautorizar': { POST: () => instagramDesautorizar(request, env) },
    '/instagram/borrar-datos': { POST: () => instagramBorrarDatos(request, env) },
    // Solo para Jeremy (cabecera X-Clave = DIAG_CLAVE): cómo ve Meta el número y la suscripción del bot.
    '/diagnostico/whatsapp': { GET: () => diagnosticoWhatsapp(request, url, env) },
  };
  const webhook = webhooks[url.pathname]?.[request.method];
  if (webhook) return webhook();

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  if (url.pathname === '/salud' && request.method === 'GET') {
    return json({
      ok: true,
      ia: Boolean(proveedorActivo()),
      hoja: hojaConfigurada(),
      memoria: Boolean(env.CONVERSACIONES),
      whatsapp: Boolean(env.WA_TOKEN && env.WA_APP_SECRET && env.WA_VERIFY_TOKEN),
      // El tope de respuestas al mes que usa el bot (0 = sin tope): sirve para comprobar WA_CUPO_MENSUAL.
      cupo_whatsapp: cupoMensual().cupo,
      instagram: Boolean((env.IG_TOKEN || await env.CONVERSACIONES?.get('ig:token'))
        && (env.IG_APP_SECRET || env.META_APP_SECRET) && env.IG_VERIFY_TOKEN),
    }, 200, cors);
  }

  const rutas = { '/chat': atenderChat, '/datos': atenderDatos };
  const ruta = rutas[url.pathname];
  if (!ruta) return json({ error: 'No encontrado' }, 404, cors);
  if (request.method !== 'POST') return json({ error: 'Usa POST' }, 405, cors);
  if (!cors['Access-Control-Allow-Origin']) {
    // Sin Origin (un script) u origen ajeno: no se atiende. Un navegador siempre manda Origin en un POST a otro sitio,
    // así que la web no se ve afectada, y un script ya no gasta la cuota diaria de Gemini que comparten la web,
    // WhatsApp e Instagram. Queda registrado: en el navegador parece un corte de red.
    console.warn('Origen no permitido:', origen ?? '(sin Origin)', url.pathname);
    return json({ error: 'Origen no permitido' }, 403, cors);
  }
  let cuerpo;
  try {
    // Vale con Content-Type application/json o text/plain (la web lo manda así para ahorrarse la consulta
    // OPTIONS de CORS): request.json() no mira el tipo.
    cuerpo = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400, cors);
  }
  const { status, datos } = await ruta(cuerpo, request.headers.get('CF-Connecting-IP') ?? '');
  return json(datos, status, cors);
}

export default {
  async fetch(request, env, ctx) {
    // El CORS se calcula antes que nada: hasta la respuesta de un error inesperado lo lleva. Sin él, el
    // navegador solo ve «Load failed» y el chat no puede decir qué pasó.
    const origen = request.headers.get('Origin');
    const cors = cabecerasCors(origen);
    let url;
    try {
      configurar(env);
      url = new URL(request.url);
      return await atender(request, env, ctx, url, origen, cors);
    } catch (e) {
      // Nunca el contenido de la conversación en el registro: solo dónde y qué tipo de error.
      console.error('Error inesperado en', url?.pathname ?? '?', e?.name ?? 'error', e?.message ?? '');
      return json({ error: 'No pude responder en este momento. Intenta de nuevo o escríbenos por WhatsApp.' }, 500, cors);
    }
  },

  async scheduled(evento, env, ctx) {
    configurar(env);
    // Los lunes a las 9:00 UTC, el token de Instagram; cada hora, la reconexión del webhook de WhatsApp.
    if (evento.cron === '0 9 * * 1') ctx.waitUntil(renovarTokenInstagram(env));
    else ctx.waitUntil(reconectarWebhookWhatsapp(env));
  },
};
