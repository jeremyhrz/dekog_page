// La reconexión horaria del webhook de WhatsApp: qué le pide a Meta y cuándo avisa. Fetch falso: no sale nada a internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { kvEnMemoria } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { reconectarWebhookWhatsapp } from '../src/canales/whatsapp.js';
import worker from '../src/worker.js';

const AJUSTES = {
  WA_APP_ID: '111', WA_WABA_ID: '222', ASISTENTE_URL: 'https://asistente.falso',
  HOJA_URL: 'https://hoja.falsa', HOJA_SECRETO: 'clave-hoja',
};
let env;
let pedidos;
let filasHoja;

beforeEach(() => {
  env = { CONVERSACIONES: kvEnMemoria() };
  pedidos = [];
  filasHoja = [];
  Object.assign(config, AJUSTES);
});
afterEach(() => { for (const clave of Object.keys(AJUSTES)) delete config[clave]; });

function metaFalso({ falla = false } = {}) {
  globalThis.fetch = async (url, opciones = {}) => {
    const u = String(url);
    if (u.startsWith('https://hoja.falsa')) { filasHoja.push(JSON.parse(opciones.body)); return new Response(JSON.stringify({ ok: true })); }
    pedidos.push({ url: u, metodo: opciones.method, cuerpo: opciones.body ? String(opciones.body) : '', token: opciones.headers?.Authorization });
    if (falla) return new Response(JSON.stringify({ error: { code: 190, message: 'token no válido (prueba)' } }), { status: 400 });
    return new Response(JSON.stringify({ success: true }));
  };
}

test('Reconectar: el webhook de la app con los mismos campos y la app a la cuenta de WhatsApp', async () => {
  metaFalso();
  const r = await reconectarWebhookWhatsapp(env);
  assert.equal(r.ok, true);
  const [webhook, suscripcion] = pedidos;
  assert.match(webhook.url, /\/111\/subscriptions$/);
  assert.equal(webhook.metodo, 'POST');
  assert.equal(webhook.token, `Bearer 111|${config.WA_APP_SECRET}`);
  const p = new URLSearchParams(webhook.cuerpo);
  assert.equal(p.get('callback_url'), 'https://asistente.falso/whatsapp');
  assert.equal(p.get('object'), 'whatsapp_business_account');
  assert.ok(p.get('fields').split(',').includes('messages'));
  assert.ok(p.get('fields').split(',').length >= 10);
  assert.match(suscripcion.url, /\/222\/subscribed_apps$/);
  assert.equal(suscripcion.metodo, 'POST');
  assert.equal(filasHoja.length, 0);
  assert.match(await env.CONVERSACIONES.get('wa:webhook:ultima'), /^\d{4}-\d{2}-\d{2}T/);
});

test('Si Meta falla una hora no avisa; dos horas seguidas, UN aviso «Sistema» (y no otro el mismo día)', async () => {
  metaFalso({ falla: true });
  await reconectarWebhookWhatsapp(env);
  assert.equal(filasHoja.length, 0);
  await reconectarWebhookWhatsapp(env);
  await reconectarWebhookWhatsapp(env);
  assert.equal(filasHoja.length, 1);
  assert.equal(filasHoja[0].canal, 'Sistema');
  assert.equal(filasHoja[0].nombre, 'WhatsApp sin conexión');
});

test('Sin los ids de la app y de la cuenta no hace nada (por ejemplo, en desarrollo local)', async () => {
  metaFalso();
  delete config.WA_APP_ID;
  assert.equal(await reconectarWebhookWhatsapp(env), null);
  assert.equal(pedidos.length, 0);
});

test('La tarea programada: cada hora reconecta WhatsApp; la del lunes renueva Instagram y no toca WhatsApp', async () => {
  metaFalso();
  const pendientes = [];
  const ctx = { waitUntil: (p) => pendientes.push(p) };
  const conVars = { ...env, ...AJUSTES, WA_TOKEN: config.WA_TOKEN, WA_APP_SECRET: config.WA_APP_SECRET };
  await worker.scheduled({ cron: '7 * * * *' }, conVars, ctx);
  await Promise.all(pendientes);
  assert.ok(pedidos.some((x) => x.url.endsWith('/111/subscriptions')));

  pedidos = [];
  await worker.scheduled({ cron: '0 9 * * 1' }, conVars, ctx);
  await Promise.all(pendientes);
  assert.ok(!pedidos.some((x) => x.url.includes('/subscriptions') || x.url.includes('/subscribed_apps')));
});
