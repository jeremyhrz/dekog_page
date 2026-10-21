// Enlaces cortos a la asesora en Instagram (21-oct): el wa.me con el resumen pasaba de 200 caracteres y Instagram solo
// ponía en azul el principio (el resto, letras grises sueltas). IA: proveedor «prueba». Fetch falso: nada sale a internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SECRETO_IG, kvEnMemoria, metaFalso, entregar, avisoIg, sinMarca } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { enlaceCorto, irAlEnlace } from '../src/lib/enlaces.js';
import { instagramPost } from '../src/canales/instagram.js';
import worker from '../src/worker.js';

const LARGO = 'https://wa.me/584145847791?text=Hola%20Dekog%2C%20vengo%20del%20asistente%20de%20Instagram%20%F0%9F%91%8B%0A'
  + 'Cliente%20pregunta%20por%20env%C3%ADo%20a%20Caracas%20de%20la%20cama%20Florida%20en%20Queen';
let env;
let meta;
beforeEach(() => { env = { CONVERSACIONES: kvEnMemoria() }; meta = metaFalso(); globalThis.fetch = meta.fetchFalso; });
afterEach(() => { delete config.ENLACE_CORTO_BASE; delete config.ASISTENTE_URL; });

test('Instagram: al pasar a la asesora, el enlace es corto (todo azul) y lleva al WhatsApp con el resumen', async () => {
  config.ENLACE_CORTO_BASE = 'https://www.dekog.net/';
  await entregar(instagramPost, avisoIg({ text: 'Me gusta, quiero comprarla. ¿La envían a Maracay?' }), SECRETO_IG, env);
  const textos = meta.enviados.filter((e) => e.url.endsWith('/me/messages') && e.cuerpo.message.text).map((e) => sinMarca(e.cuerpo.message.text));
  const conEnlace = textos.find((t) => t.includes('Habla con una asesora por WhatsApp'));
  const enlaces = conEnlace.match(/https:\/\/\S+/g);
  assert.equal(enlaces.length, 1);
  assert.match(enlaces[0], /^https:\/\/www\.dekog\.net\/a\/[A-Za-z0-9]{6}$/);
  const r = await irAlEnlace(enlaces[0].split('/a/')[1], env.CONVERSACIONES);
  assert.equal(r.status, 302);
  assert.match(r.headers.get('Location'), /^https:\/\/wa\.me\/584145847791\?text=Hola%20Dekog%2C%20vengo%20del%20asistente%20de%20Instagram/);
});

test('GET /a/<código>: redirige al WhatsApp guardado; vencido, raro o ajeno → la Línea 01 sin texto', async () => {
  await env.CONVERSACIONES.put('enlace:k3P9xQ', LARGO);
  await env.CONVERSACIONES.put('enlace:ma1123', 'https://evil.example/robo');
  const ir = (ruta, method = 'GET') => worker.fetch(new Request(`https://asistente.falso${ruta}`, { method }), env, { waitUntil() {} });
  let r = await ir('/a/k3P9xQ');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('Location'), LARGO);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.equal((await ir('/a/k3P9xQ', 'HEAD')).headers.get('Location'), LARGO); // la vista previa de Instagram
  for (const ruta of ['/a/zzzzzz', '/a/ma1123', '/a/..%2Fsalud', '/a/abc']) {
    r = await ir(ruta);
    assert.equal(r.status, 302, ruta);
    assert.equal(r.headers.get('Location'), 'https://wa.me/584145847791', ruta);
  }
});

test('Si KV no deja guardar, va el wa.me de la asesora sin texto (corto); sin ENLACE_CORTO_BASE, el dominio del Worker', async () => {
  const roto = { put: async () => { throw new Error('KV put() limit exceeded for the day.'); } };
  assert.equal(await enlaceCorto(roto, LARGO), 'https://wa.me/584145847791');
  assert.equal(await enlaceCorto(null, LARGO), 'https://wa.me/584145847791');
  config.ASISTENTE_URL = 'https://dekog-asistente.dekog-web.workers.dev';
  assert.match(await enlaceCorto(env.CONVERSACIONES, LARGO), /^https:\/\/dekog-asistente\.dekog-web\.workers\.dev\/a\/[A-Za-z0-9]{6}$/);
});
