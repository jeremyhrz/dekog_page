// Instagram antes de conectarlo: solo la cuenta de Dekog, aviso si se desconecta, token con vencimiento y las dos URL
// que pide Meta (desautorizar y borrar datos). Y lo que va a la hoja: el teléfono del cliente (no un monto) y la memoria
// guardada antes de la hoja. Todo con fetch falso: no sale nada a internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHmac } from 'node:crypto';
import { SECRETO_IG, kvEnMemoria, avisoIg, entregar } from './ayuda.js';
import { config } from '../src/lib/config.js';
import {
  instagramConectar, instagramPost, instagramDesautorizar, instagramBorrarDatos, renovarTokenInstagram, cuentasPermitidas,
} from '../src/canales/instagram.js';
import { extraerTelefono, nombreEscrito } from '../src/canales/meta.js';

let env;
let filasHoja;
let ttls;
let mensajes; // lo que se le mandó al cliente
let llamadas; // cada URL que se pidió
const AJUSTES = { IG_ESTADO: 'estado-prueba', IG_APP_ID: 'app-ig', HOJA_URL: 'https://hoja.falsa', HOJA_SECRETO: 'clave-hoja' };

beforeEach(() => {
  const kv = kvEnMemoria();
  const put = kv.put.bind(kv);
  ttls = {};
  kv.put = async (clave, valor, opciones) => { ttls[clave] = opciones?.expirationTtl; return put(clave, valor, opciones); };
  env = { CONVERSACIONES: kv };
  filasHoja = [];
  mensajes = [];
  llamadas = [];
  Object.assign(config, AJUSTES);
});
afterEach(() => {
  for (const clave of [...Object.keys(AJUSTES), 'IG_USUARIO']) delete config[clave];
});

/** fetch falso de Instagram, de la hoja y del BCV. `usuario` es la cuenta que «autorizó»; `error` hace fallar los envíos. */
function instagramFalso({ usuario = 'dekog.home', error = null, renovar = { access_token: 'renovado', expires_in: 5184000 } } = {}) {
  globalThis.fetch = async (url, opciones = {}) => {
    const u = String(url);
    llamadas.push(u);
    const json = (datos, status = 200) => new Response(JSON.stringify(datos), { status });
    if (u.startsWith('https://hoja.falsa')) { filasHoja.push(JSON.parse(opciones.body)); return json({ ok: true }); }
    if (u.includes('/me/messages') && !error) mensajes.push(JSON.parse(opciones.body).message);
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

test('Si KV falla al leer el token, el cliente igual recibe su respuesta (con el último token bueno o IG_TOKEN)', async () => {
  instagramFalso();
  env.CONVERSACIONES.get = async () => { throw new Error('KV GET failed: 503'); };
  await entregar(instagramPost, avisoIg({ text: '¿Cuánto es la Toronto queen?' }, 'IGSID5'), SECRETO_IG, env);
  assert.ok(mensajes.some((m) => /Toronto/.test(m.text ?? '')), 'no se le respondió');
});

test('Con KV caído, un 190 del token de respaldo no avisa ni borra el token de KV; la renovación queda para otra semana', async () => {
  instagramFalso({ error: 190 });
  await env.CONVERSACIONES.put('ig:token', 'bueno');
  const leer = env.CONVERSACIONES.get;
  env.CONVERSACIONES.get = async (clave, tipo) => {
    if (clave === 'ig:token') throw new Error('KV GET failed: 503');
    return leer(clave, tipo);
  };
  await entregar(instagramPost, avisoIg({ text: 'Hola' }, 'IGSID6'), SECRETO_IG, env);
  await renovarTokenInstagram(env);
  assert.equal(sistema().length, 0);
  assert.equal(env.CONVERSACIONES.datos.get('ig:token'), 'bueno');
  assert.ok(!llamadas.some((u) => u.includes('/refresh_access_token')));
});

test('extraerTelefono: solo números con forma de teléfono, sin montos, cédulas ni fechas', () => {
  for (const [texto, telefono] of [
    ['Mi número es 0414-555-1234', '04145551234'],
    ['0412 123 4567', '04121234567'],
    ['+58 414 5551234', '+584145551234'],
    ['414-555-1234', '4145551234'],
    ['Escríbeme al 0241-8123456', '02418123456'],
    ['(0416) 555.12.34', '04165551234'],
    ['+1 (305) 555-1234', '+13055551234'],
    ['Pago los Bs 1.318.908 y mi número es 0414-555-1234', '04145551234'],
    ['REF 550 0414-555-1234', '04145551234'], // dos números seguidos: se toma el que es teléfono
    ['¿Puedo pagar los Bs 1.318.908 en dos partes?', ''],
    ['Tengo un presupuesto de 1.500.000 bs', ''],
    ['Bs 4.123.456.789', ''], // con forma de teléfono, pero es un monto
    ['V-12.345.678', ''],
    ['mi cédula es 12345678', ''],
    ['V-4141234567', ''],
    ['C.I.: 4141234567', ''],
    ['Me la entregan el 21-10-2026', ''],
    ['2026-10-21', ''],
  ]) assert.equal(extraerTelefono(texto), telefono, texto);
  const t0 = performance.now();
  extraerTelefono('1 '.repeat(400)); // un texto armado para gastar CPU (800 caracteres, lo más que se lee)
  assert.ok(performance.now() - t0 < 50, 'extraerTelefono tardó demasiado');
});

test('nombreEscrito: una pregunta o «soy de / la / un…» no traen un nombre', () => {
  assert.equal(nombreEscrito('Soy de Maracay, ¿cuánto sale el envío?'), '');
  assert.equal(nombreEscrito('Soy de Valencia'), '');
  assert.equal(nombreEscrito('soy la mamá de Luis'), '');
  assert.equal(nombreEscrito('Soy una clienta de ustedes'), '');
  assert.equal(nombreEscrito('Soy María, ¿tienen la Toronto?'), '');
  assert.equal(nombreEscrito('Soy María'), 'María');
  assert.equal(nombreEscrito('Soy Elena'), 'Elena'); // «el» dentro de un nombre no cuenta
  assert.equal(nombreEscrito('Laura Pérez 0414-555-1234', '04145551234'), 'Laura Pérez');
});

test('Un monto en bolívares no es su teléfono: no crea la fila; el número de verdad sí llega, y uno nuevo la actualiza', async () => {
  instagramFalso();
  const ig = (text) => entregar(instagramPost, avisoIg({ text }, 'IGSID7'), SECRETO_IG, env);
  await ig('¿Cuánto es la Toronto queen?');
  await ig('¿Puedo pagar los Bs 1.318.908 en dos partes?');
  assert.equal(filasHoja.length, 0);
  await ig('Mi número es 0414-555-1234');
  assert.equal(filasHoja.length, 1);
  assert.equal(filasHoja[0].id, 'ig-IGSID7');
  assert.equal(filasHoja[0].telefono, '04145551234');
  await ig('Mejor escríbeme al 0424-000-1111');
  assert.equal(filasHoja.length, 2);
  assert.equal(filasHoja[1].id, 'ig-IGSID7'); // la misma fila, con el número nuevo
  assert.equal(filasHoja[1].telefono, '04240001111');
  await ig('Dale, al 0424-000-1111 entonces');
  assert.equal(filasHoja.length, 2); // el mismo número: nada nuevo para la hoja
  assert.equal(JSON.parse(env.CONVERSACIONES.datos.get('ig:IGSID7')).telefonoEnHoja, '1111'); // en KV, solo la huella
});

test('La memoria del turno se guarda ANTES de la hoja (y otra vez si la hoja respondió), sin repetir mensajes', async () => {
  instagramFalso();
  const fetchFalso = globalThis.fetch;
  let enKvAlLlamarALaHoja;
  let perfilConTope = false;
  globalThis.fetch = async (url, opciones = {}) => {
    const u = String(url);
    if (u.startsWith('https://hoja.falsa')) enKvAlLlamarALaHoja = env.CONVERSACIONES.datos.get('ig:IGSID8');
    if (u.includes('?fields=username,name')) perfilConTope = opciones.signal instanceof AbortSignal;
    return fetchFalso(url, opciones);
  };
  await entregar(instagramPost, avisoIg({ text: 'Me gusta, quiero comprarla. ¿La envían a Maracay?' }, 'IGSID8'), SECRETO_IG, env);
  assert.equal(filasHoja.length, 1);
  const antes = JSON.parse(enKvAlLlamarALaHoja ?? 'null');
  assert.ok(antes, 'la memoria no estaba guardada cuando se llamó a la hoja');
  assert.equal(antes.mensajes.at(-1).role, 'assistant'); // con la respuesta de este turno
  assert.equal(antes.guardado, false);
  const despues = JSON.parse(env.CONVERSACIONES.datos.get('ig:IGSID8'));
  assert.equal(despues.guardado, true);
  assert.equal(despues.mensajes.length, 2);
  assert.ok(perfilConTope, 'el @usuario se pide sin tope de tiempo');
});
