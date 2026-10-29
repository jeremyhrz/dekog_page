// El asistente de Instagram apagado (IG_ASISTENTE = "0", 29-oct): Meta recibe su 200, el cliente no recibe nada, ni
// respuesta ni «disculpa la espera», y no se guarda ni se anota nada. Encendido otra vez, contesta como siempre.
// Archivo aparte: las pruebas de asesora.test.js dependen del orden y del estado del módulo. Fetch falso.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SECRETO_IG, kvEnMemoria, metaFalso, entregar, avisoIg } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { instagramPost, seguimientosInstagram } from '../src/canales/instagram.js';
import worker from '../src/worker.js';

let env;
let meta;
beforeEach(() => {
  env = { CONVERSACIONES: kvEnMemoria() };
  meta = metaFalso();
  globalThis.fetch = meta.fetchFalso;
});
afterEach(() => { delete config.IG_ASISTENTE; });

const enviados = () => meta.enviados.filter((e) => e.url.endsWith('/me/messages'));
const ig = (texto) => entregar(instagramPost, avisoIg({ text: texto }, 'IGSID1'), SECRETO_IG, env);

test('Apagado: el mensaje recibe 200 (Meta no da el webhook por caído) y el cliente no recibe respuesta', async () => {
  config.IG_ASISTENTE = '0';
  assert.equal(await ig('Hola, ¿cuánto cuesta la Toronto queen?'), 200);
  assert.equal(enviados().length, 0);
  assert.equal(env.CONVERSACIONES.datos.has('ig:IGSID1'), false); // ni conversación guardada
});

test('Apagado: un reel compartido varias veces tampoco recibe nada', async () => {
  config.IG_ASISTENTE = '0';
  const reel = { attachments: [{ type: 'ig_reel', payload: { url: 'https://instagram.falso/reel', title: 'dekog.home' } }] };
  for (let i = 0; i < 3; i++) {
    assert.equal(await entregar(instagramPost, avisoIg(reel, 'IGSID1'), SECRETO_IG, env), 200);
  }
  assert.equal(enviados().length, 0);
});

test('Apagado: una firma falsa sigue rechazándose (401)', async () => {
  config.IG_ASISTENTE = '0';
  assert.equal(await entregar(instagramPost, avisoIg({ text: 'Hola' }, 'IGSID1'), 'otro-secreto', env), 401);
});

test('Apagado: la tarea de cada 15 minutos no le escribe a quien esperaba a la asesora', async () => {
  config.IG_ASISTENTE = '0';
  const hace2h = Date.now() - 2 * 60 * 60 * 1000;
  await env.CONVERSACIONES.put('ig:IGSID1', JSON.stringify({ mensajes: [], humano: hace2h - 1000, esperaDesde: hace2h, seguimiento: 0 }));
  await env.CONVERSACIONES.put('ig:seg:IGSID1', String(hace2h + 60 * 60 * 1000), { metadata: { cuando: hace2h + 60 * 60 * 1000 } });
  await seguimientosInstagram(env);
  assert.equal(enviados().length, 0);
});

test('/salud dice si el asistente de Instagram contesta', async () => {
  const salud = async (valor) => {
    const r = await worker.fetch(new Request('https://asistente.falso/salud'), { ...env, IG_ASISTENTE: valor }, { waitUntil() {} });
    return (await r.json()).instagram_asistente;
  };
  assert.equal(await salud('0'), false);
  assert.equal(await salud('1'), true);
});

test('Encendido ("1" o sin la variable): contesta como siempre', async () => {
  config.IG_ASISTENTE = '1';
  await ig('Hola');
  assert.ok(enviados().length > 0);
});
