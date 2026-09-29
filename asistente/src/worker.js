/**
 * Worker de Cloudflare del asistente de Dekog.
 *
 *   POST /chat    → el chat de la web (ver chat.js)
 *   POST /datos   → formulario de contacto, directo a la hoja de clientes
 *   GET  /salud   → comprobación rápida de que está vivo y configurado
 *
 * Solo acepta llamadas desde dekog.net, sus links de prueba de Vercel y la
 * web en desarrollo local (CORS).
 */
import { configurar } from './lib/config.js';
import { atenderChat, atenderDatos } from './chat.js';
import { proveedorActivo } from './lib/llm.js';
import { hojaConfigurada } from './lib/hoja.js';

const ORIGENES_PERMITIDOS = [
  /^https:\/\/(www\.)?dekog\.net$/,
  /^https:\/\/dekog-page(-[a-z0-9-]+)?\.vercel\.app$/,
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
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });
}

export default {
  async fetch(request, env) {
    configurar(env);
    const url = new URL(request.url);
    const origen = request.headers.get('Origin');
    const cors = cabecerasCors(origen);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (url.pathname === '/salud' && request.method === 'GET') {
      return json({ ok: true, proveedor: proveedorActivo(), hoja: hojaConfigurada() }, 200, cors);
    }

    const rutas = { '/chat': atenderChat, '/datos': atenderDatos };
    const atender = rutas[url.pathname];
    if (atender) {
      if (request.method !== 'POST') return json({ error: 'Usa POST' }, 405, cors);
      if (origen && !cors['Access-Control-Allow-Origin']) return json({ error: 'Origen no permitido' }, 403, cors);
      let cuerpo;
      try {
        cuerpo = await request.json();
      } catch {
        return json({ error: 'JSON inválido' }, 400, cors);
      }
      const ip = request.headers.get('CF-Connecting-IP') ?? '';
      const { status, datos } = await atender(cuerpo, ip);
      return json(datos, status, cors);
    }

    return json({ error: 'No encontrado' }, 404, cors);
  },
};
