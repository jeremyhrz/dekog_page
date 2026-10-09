// Instagram antes de conectarlo: solo la cuenta de Dekog, aviso si se desconecta, token con vencimiento y las dos URL
// que pide Meta (desautorizar y borrar datos). Todo con fetch falso: no sale nada a internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { SECRETO_IG, kvEnMemoria, avisoIg, entregar } from './ayuda.js';
import { config } from '../src/lib/config.js';
import {
  instagramConectar, instagramPost, instagramDesautorizar, instagramBorrarDatos, renovarTokenInstagram, cuentasPermitidas,
} from '../src/canales/instagram.js';

let env;
let filasHoja;
let ttls;
const AJUSTES = { IG_ESTADO: 'estado-prueba', IG_APP_ID: 'app-ig', HOJA_URL: 'https://hoja.falsa', HOJA_SECRETO: 'clave-hoja' };

beforeEach(() => {
  const kv = kvEnMemoria();
  const put = kv.put.bind(kv);
  ttls = {};
  kv.put = async (clave, valor, opciones) => { ttls[clave] = opciones?.expirationTtl; return put(clave, valor); };
  env = { CONVERSACIONES: kv };
  filasHoja = [];
  Object.assign(config, AJUSTES);
});
afterEach(() => {
  for (const clave of [...Object.keys(AJUSTES), 'IG_USUARIO']) delete config[clave];
});

/** fetch falso de Instagram, de la hoja y del BCV. `usuario` es la cuenta que «autorizó»; `error` hace fallar los envíos. */
function instagramFalso({ usuario = 'dekog.home', error = null, renovar = { access_token: 'renovado', expires_in: 5184000 } } = {}) {
  globalThis.fetch = async (url, opciones = {}) => {
    const u = String(url);
    const json = (datos, status = 200) => new Response(JSON.stringify(datos), { status });
    if (u.startsWith('https://hoja.falsa')) { filasHoja.push(JSON.parse(opciones.body)); return json({ ok: true }); }
    if (u.includes('dolarapi.com')) return json({ promedio: 186.4321, moneda: 'EUR', fechaActualizacion: '2026-10-07T12:00:00-04:00' });
    if (u.includes('/oauth/access_token')) return json({ access_token: 'corto', user_id: 17841400000000000 });
    if (u.includes('grant_type=ig_exchange_token')) return json({ access_token: 'largo', expires_in: 5184000 });
    if (u.includes('/refresh_access_token')) return renovar.access_token ? json(renovar) : json({ error: renovar.error }, 400);
    if (u.includes('/me?fields=username')) return json({ username: usuario });
    if (u.includes('/subscribed_apps')) return json({ success: true });
    if (u.includes('/me/messages') && error) return json({ error: { code: error, message: 'token no válido (prueba)' } }, 400);
    return json({ message_id: 'm', username: 'cliente', name: 'Cliente' });
  };
}

const conectar = () => instagramConectar(new URL('https://asistente.falso/instagram/conectar?state=estado-prueba&code=abc#_'), env);
const sistema = () => filasHoja.filter((f) => f.canal === 'Sistema');

function firmado(datos, secreto = SECRETO_IG) {
  const cuerpo = Buffer.from(JSON.stringify(datos)).toString('base64url');
  const firma = createHmac('sha256', secreto).update(cuerpo).digest('base64url');
  return new Request('https://asistente.falso/instagram/x', {
    method: 'POST', body: new URLSearchParams({ signed_request: `${firma}.${cuerpo}` }),
  });
}

test('Conectar @dekog.home: guarda el token con su vencimiento (60 días)', async () => {
  instagramFalso();
  const r = await conectar();
  assert.equal(r.status, 200);
  assert.match(await r.text(), /@dekog\.home/);
  assert.equal(await env.CONVERSACIONES.get('ig:token'), 'largo');
  assert.equal(ttls['ig:token'], 5184000);
});

test('Conectar OTRA cuenta con el mismo enlace: no se guarda nada y la página dice cuál hay que usar', async () => {
  instagramFalso({ usuario: 'otra.cuenta' });
  const r = await conectar();
  assert.equal(r.status, 403);
  const html = await r.text();
  assert.match(html, /@otra\.cuenta/);
  assert.match(html, /@dekog\.home/);
  assert.equal(await env.CONVERSACIONES.get('ig:token'), null);
});

test('IG_USUARIO acepta varias cuentas, con o sin @ y sin importar mayúsculas', () => {
  config.IG_USUARIO = '@Dekog.Home, dekog.arquitectura';
  assert.deepEqual(cuentasPermitidas(), ['dekog.home', 'dekog.arquitectura']);
});

test('Instagram dejó de aceptar el token (error 190): se borra y llega UN aviso «Sistema» al día, aunque sigan escribiendo', async () => {
  instagramFalso({ error: 190 });
  await env.CONVERSACIONES.put('ig:token', 'viejo');
  for (let i = 0; i < 3; i++) await entregar(instagramPost, avisoIg({ text: `Hola ${i}` }, `IGSID${i}`), SECRETO_IG, env);
  assert.equal(await env.CONVERSACIONES.get('ig:token'), null);
  assert.equal(sistema().length, 1);
  assert.equal(sistema()[0].nombre, 'Instagram desconectado');
  assert.match(sistema()[0].resumen, /volver a conectar/);
});

test('Otro error de envío (no el 190) no desconecta ni avisa', async () => {
  instagramFalso({ error: 10 });
  await env.CONVERSACIONES.put('ig:token', 'bueno');
  await entregar(instagramPost, avisoIg({ text: 'Hola' }), SECRETO_IG, env);
  assert.equal(await env.CONVERSACIONES.get('ig:token'), 'bueno');
  assert.equal(sistema().length, 0);
});

test('Renovación semanal: guarda el token nuevo con su vencimiento; si Instagram dice 190, avisa', async () => {
  instagramFalso();
  await env.CONVERSACIONES.put('ig:token', 'actual');
  await renovarTokenInstagram(env);
  assert.equal(await env.CONVERSACIONES.get('ig:token'), 'renovado');
  assert.equal(ttls['ig:token'], 5184000);

  instagramFalso({ renovar: { error: { code: 190, message: 'vencido' } } });
  await renovarTokenInstagram(env);
  assert.equal(await env.CONVERSACIONES.get('ig:token'), null);
  assert.equal(sistema().length, 1);
});

test('Desautorizar (Meta, firmado): borra el token y avisa; sin firma válida, 400 y no toca nada', async () => {
  instagramFalso();
  await env.CONVERSACIONES.put('ig:token', 'bueno');
  assert.equal((await instagramDesautorizar(firmado({ user_id: '1', algorithm: 'HMAC-SHA256' }, 'otra-clave'), env)).status, 400);
  assert.equal((await instagramDesautorizar(new Request('https://x/', { method: 'POST', body: 'basura' }), env)).status, 400);
  assert.equal(await env.CONVERSACIONES.get('ig:token'), 'bueno');

  const r = await instagramDesautorizar(firmado({ user_id: '1', algorithm: 'HMAC-SHA256' }), env);
  assert.equal(r.status, 200);
  assert.equal(await env.CONVERSACIONES.get('ig:token'), null);
  assert.equal(sistema().length, 1);
});

test('Borrar datos (Meta, firmado): responde la página de consulta y el código; sin firma válida, 400', async () => {
  instagramFalso();
  await env.CONVERSACIONES.put('ig:token', 'bueno');
  assert.equal((await instagramBorrarDatos(firmado({ user_id: '1' }, 'otra-clave'), env)).status, 400);
  const r = await instagramBorrarDatos(firmado({ user_id: '1', algorithm: 'HMAC-SHA256' }), env);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.match(j.confirmation_code, /^[0-9a-f]{12}$/);
  assert.equal(j.url, `https://www.dekog.net/eliminacion-datos.html?codigo=${j.confirmation_code}`);
  assert.equal(await env.CONVERSACIONES.get('ig:token'), null);
});
