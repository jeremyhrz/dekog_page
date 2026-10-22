// WhatsApp (22-oct): el cupo de Meta se cuenta con UNA escritura por vuelta (KV admite 1 por segundo en la misma clave),
// la vitrina no se descarta cuando además pasa a una asesora, el pie de foto ya no corta los precios en Bs y el texto de
// un video o un documento se responde. IA: proveedor «prueba» o un Gemini falso. Fetch falso: no sale nada a internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SECRETO_WA, kvEnMemoria, metaFalso, entregar, avisoWa, textoWa } from './ayuda.js';
import { kvConLimite } from './kv-limite.js';
import { config } from '../src/lib/config.js';
import { whatsappPost, textoConCola } from '../src/canales/whatsapp.js';

const HOJA = { HOJA_URL: 'https://hoja.falsa', HOJA_SECRETO: 'clave-hoja' };
let env;
let meta;
let salidaIa; // lo que «responde» el Gemini falso (ver conIa)
let pasos; // lo que salió, en orden: cada mensaje que Meta aceptó y cada fila de la hoja
let filasHoja;

/** Meta falso, la hoja de clientes y Gemini, todo dentro del proceso. */
function usar(opciones) {
  meta = metaFalso(opciones);
  pasos = [];
  filasHoja = [];
  globalThis.fetch = async (url, o = {}) => {
    const u = String(url);
    if (u.includes('generativelanguage.googleapis.com')) {
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(salidaIa) }] } }] }));
    }
    if (u.startsWith('https://hoja.falsa')) {
      const fila = JSON.parse(o.body);
      filasHoja.push(fila);
      pasos.push(`hoja: ${fila.nombre}`);
      return new Response(JSON.stringify({ ok: true }));
    }
    const r = await meta.fetchFalso(url, o);
    const tipo = r.ok && o.body ? JSON.parse(o.body).type : null;
    if (tipo) pasos.push(`meta: ${tipo}`);
    return r;
  };
}
beforeEach(() => { env = { CONVERSACIONES: kvEnMemoria() }; salidaIa = null; usar(); });
afterEach(() => {
  config.PROMO = 'no';
  config.ASISTENTE_PROVEEDOR = 'prueba';
  for (const clave of ['GEMINI_API_KEY', 'ENLACE_CORTO_BASE', ...Object.keys(HOJA)]) delete config[clave];
});

/** Desde aquí responde un Gemini falso con `salida` (lo que falte, vacío como en el ESQUEMA). */
function conIa(salida) {
  config.ASISTENTE_PROVEEDOR = '';
  config.GEMINI_API_KEY = 'clave-falsa';
  salidaIa = { foto: '', vitrina: '', productos: [], derivar: { necesario: false, area: 'home', resumen: '' }, ofrecer_formulario: false, ...salida };
}

const wa = (msg, tel) => entregar(whatsappPost, avisoWa(msg, tel), SECRETO_WA, env);
const mensajesWa = () => meta.enviados.filter((e) => e.url.endsWith('/PHONE123/messages') && e.cuerpo.type).map((e) => e.cuerpo);
const claveCupo = () => `wa:cupo:PHONE123:${new Date().toISOString().slice(0, 7)}`;
const cupoWa = async () => Number(await env.CONVERSACIONES.get(claveCupo())) || 0;
const estadoWa = (tel) => env.CONVERSACIONES.get(`wa:PHONE123:${tel}`, 'json');

// ── El cupo: UNA escritura por vuelta ────────────────────────────────────────────────────────────────────────────

test('Cupo: «Hola» de un cliente nuevo con la promo → el saludo y la promo, y el contador en 2 con UNA escritura', async () => {
  env = { CONVERSACIONES: kvConLimite() };
  delete config.PROMO;
  await wa(textoWa('Hola'), '584140000201');
  assert.deepEqual(mensajesWa().map((m) => m.interactive?.type ?? m.type), ['text', 'cta_url']);
  assert.equal(await cupoWa(), 2);
  assert.equal(env.CONVERSACIONES.escritas.filter((clave) => clave === claveCupo()).length, 1);
});

test('Cupo: dos clientes atendidos a la vez → la suma de los dos (el que choca con el otro reintenta 1,1 s después)', async () => {
  env = { CONVERSACIONES: kvConLimite() };
  delete config.PROMO;
  await Promise.all([wa(textoWa('Hola'), '584140000202'), wa(textoWa('Hola'), '584140000203')]);
  assert.equal(mensajesWa().length, 4);
  assert.equal(await cupoWa(), 4);
});

test('Cupo: si escribir el contador da 429 (otra instancia lo escribió en ese segundo), relee y suma 1,1 s después', async () => {
  env = { CONVERSACIONES: kvConLimite() };
  const kv = env.CONVERSACIONES;
  const put = kv.put;
  let otraInstancia = true;
  kv.put = async (clave, valor, opciones) => {
    if (otraInstancia && clave === claveCupo()) {
      otraInstancia = false;
      await put(clave, '40'); // la otra instancia contó lo suyo un instante antes: van 40
    }
    return put(clave, valor, opciones); // la misma clave en menos de 1 s: 429
  };
  await wa(textoWa('¿Cuánto es la Toronto queen?'), '584140000204');
  assert.equal(mensajesWa().length, 1);
  assert.equal(await cupoWa(), 41);
});

test('Cupo: el aviso del 80 % sale al cruzarlo (799 → 801), después de los mensajes del cliente, y una sola vez', async () => {
  delete config.PROMO;
  Object.assign(config, HOJA);
  await env.CONVERSACIONES.put(claveCupo(), '799');
  await wa(textoWa('Hola'), '584140000205');
  assert.equal(await cupoWa(), 801);
  // Antes se anotaba dentro del envío de la respuesta: la promo esperaba a la hoja.
  assert.deepEqual(pasos, ['meta: text', 'meta: interactive', 'hoja: ⚠️ AVISO DEL ASISTENTE']);
  assert.equal(filasHoja[0].interes, 'WhatsApp: 801 de 1000 respuestas gratis usadas este mes');
  await wa(textoWa('Hola'), '584140000206');
  assert.equal(await cupoWa(), 803);
  assert.equal(filasHoja.length, 1);
});

test('Cupo: si un envío lanza a mitad de la vuelta (sin red), lo que ya salió se cuenta igual', async () => {
  delete config.PROMO;
  const conRed = globalThis.fetch;
  globalThis.fetch = async (url, o = {}) => {
    if (String(o.body ?? '').includes('"cta_url"')) throw new TypeError('fetch failed');
    return conRed(url, o);
  };
  const errores = [];
  const error = console.error;
  console.error = (...a) => errores.push(a.join(' '));
  try {
    await wa(textoWa('Hola'), '584140000207');
  } finally {
    console.error = error;
  }
  assert.deepEqual(mensajesWa().map((m) => m.type), ['text']); // el saludo; la promo no salió
  assert.equal(await cupoWa(), 1);
  assert.equal(errores.length, 1);
  assert.match(errores[0], /Error con un mensaje de WhatsApp/);
});

// ── La vitrina no se descarta ────────────────────────────────────────────────────────────────────────────────────

test('Vitrina: si el texto nombra el botón y una asesora, la lista sale igual (antes la tapaba el pase) y su nota queda', async () => {
  conIa({ vitrina: 'camas', respuesta: '¡Claro! Toca el botón «Ver modelos» y, cuando elijas una, una asesora te confirma la disponibilidad.' });
  await wa(textoWa('Quiero ver camas'), '584140000208');
  const enviados = mensajesWa();
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].interactive?.type, 'list');
  assert.match(enviados[0].interactive.body.text, /: https:\/\/www\.dekog\.net\/\?categoria=camas#catalogo$/);
  assert.match((await estadoWa('584140000208')).mensajes.at(-1).content, /\[Vitrina «Camas»: [^\]]+\]$/);
});

test('Vitrina y pase a la vez: UNA lista con las dos asesoras enteras dentro, aunque el texto sea largo', async () => {
  conIa({
    vitrina: 'camas',
    respuesta: `¡Claro! ${'Tenemos camas para cada espacio y cada estilo. '.repeat(30)}Toca «Ver modelos» para verlas. `
      + 'Si prefieres, toca el botón de abajo y te atiende una asesora.',
  });
  await wa(textoWa('Quiero ver camas'), '584140000209');
  const enviados = mensajesWa();
  assert.equal(enviados.length, 1); // 1 del cupo
  assert.equal(enviados[0].interactive?.type, 'list');
  const cuerpo = enviados[0].interactive.body.text;
  assert.ok(cuerpo.length <= 1024, `${cuerpo.length} caracteres`);
  assert.match(cuerpo, /…\n\nHabla con una asesora por WhatsApp 👇\n\nLínea 1 \(0414-584 7791\):\nhttps:\/\/\S+\/a\/[A-Za-z0-9]+\n\nLínea 2 \(0424-400 6086\):\nhttps:\/\/\S+\/a\/[A-Za-z0-9]+\n\n/);
  assert.match(cuerpo, /: https:\/\/www\.dekog\.net\/\?categoria=camas#catalogo$/);
  assert.match((await estadoWa('584140000209')).mensajes.at(-1).content, /\[Vitrina «Camas»: [^\]]+\]$/);
});

// ── El pie de foto no corta los precios ──────────────────────────────────────────────────────────────────────────

const OFERTAS_QUEEN = [{ id: 31, talla: 'Queen', oferta: 420 }, { id: 40, talla: 'Queen', oferta: 750 }, { id: 21, talla: 'Queen', oferta: 680 }];
const SOBRE_LAS_OFERTAS = '¡Sí! En queen tenemos varias camas en stock con descuento 🏷️ La Manila Queen en stock está a REF 420 en vez '
  + 'de REF 520, en gris 02 en chenille paño, gris oscuro en lino o gris 01 en terciopelo. La Paris Queen en stock está a REF 750 '
  + 'en vez de REF 930, en beige o gris 01 en chenille paño. La Florida Queen en stock está a REF 680 en vez de REF 850, en gris '
  + 'veteado o crema en zaga. Son piezas ya fabricadas, cada una tal cual está, y se venden rápido. ¿Cuál te gusta más?';

test('Pie de foto: con un texto largo se recorta el texto de la IA, nunca las líneas de precio en Bs (van al final)', async () => {
  delete config.PROMO; // las piezas en oferta son de la promo
  conIa({ respuesta: SOBRE_LAS_OFERTAS, productos: OFERTAS_QUEEN });
  await wa(textoWa('¿La Manila, la Paris o la Florida queen las tienen en oferta?'), '584140000210');
  const [foto] = mensajesWa();
  assert.equal(foto.type, 'image');
  const pie = foto.image.caption;
  assert.ok(pie.length <= 1024, `${pie.length} caracteres`);
  assert.match(pie, /…\n\n• Manila · Queen [^\n]+ahora REF 420 = Bs [\d.]+,\d\d \([^)]+\)\n• Paris · Queen [^\n]+ahora REF 750 = Bs [\d.]+,\d\d \([^)]+\)\n• Florida · Queen [^\n]+ahora REF 680 = Bs [\d.]+,\d\d \([^)]+\)$/);
});

test('Pie de foto: si los precios y las asesoras no le dejan lugar al texto, va todo en UN mensaje de texto, sin foto', async () => {
  delete config.PROMO;
  // Enlaces cortos larguísimos: así la cola (tres líneas de precio y las dos asesoras) no cabe en un pie de foto.
  config.ENLACE_CORTO_BASE = `https://www.dekog.net/${'enlace-de-prueba/'.repeat(12)}`;
  conIa({ respuesta: SOBRE_LAS_OFERTAS, productos: OFERTAS_QUEEN, derivar: { necesario: true, area: 'home', resumen: 'Quiere apartar una cama queen en stock' } });
  await wa(textoWa('Quiero apartar una de esas camas queen en oferta: ¿la Manila, la Paris o la Florida?'), '584140000211');
  const [mensaje] = mensajesWa();
  assert.equal(mensaje.type, 'text');
  const cuerpo = mensaje.text.body;
  assert.ok(cuerpo.includes(SOBRE_LAS_OFERTAS)); // el texto de la IA, entero
  assert.match(cuerpo, /• Florida · Queen [^\n]+ahora REF 680 = Bs [\d.]+,\d\d \([^)]+\)\n\nHabla con una asesora por WhatsApp 👇\n\n/);
  assert.match(cuerpo, /\nLínea 2 \(0424-400 6086\):\nhttps:\/\/\S+\/a\/[A-Za-z0-9]+$/);
});

test('textoConCola: la cola siempre entera; un párrafo con un enlace va entero o no va (nunca un enlace partido)', () => {
  // Así termina el texto cuando el cliente habla de ofertas: chat.js pega el enlace del catálogo de ofertas al final.
  const texto = 'Te cuento de las piezas en stock.\n\n🏷️ Catálogo de ofertas:\nhttps://www.dekog.net/ofertas';
  const cola = '• Manila · Queen: REF 420 = Bs 42.000,00';
  for (let maximo = cola.length + 3; maximo <= texto.length + cola.length + 2; maximo++) {
    const r = textoConCola(texto, cola, maximo);
    assert.ok(r.length <= maximo && r.endsWith(`\n\n${cola}`), `${maximo}: ${r}`);
    const delTexto = r.slice(0, -cola.length - 2);
    assert.ok(delTexto === texto || (delTexto.endsWith('…') && !/Catálogo|http/.test(delTexto)), `${maximo}: ${delTexto}`);
  }
  // Un enlace dentro del primer párrafo: se corta antes del enlace, nunca en medio.
  const suelto = 'Aquí ves todas las piezas https://www.dekog.net/ofertas y me dices cuál te gusta';
  for (let maximo = 1; maximo <= suelto.length; maximo++) {
    const r = textoConCola(suelto, '', maximo);
    assert.ok(r.length <= maximo, `${maximo}: ${r}`);
    assert.ok(!r.includes('http') || r === suelto, `${maximo}: ${r}`);
  }
});

// ── Un video o un documento con texto ────────────────────────────────────────────────────────────────────────────

test('Video o documento con texto: lo responde la IA, con una nota de que no lo ve; dos seguidos, dos respuestas', async () => {
  const tel = '584140000212';
  await wa({ type: 'video', video: { id: 'v1', mime_type: 'video/mp4', caption: '¿cuánto cuesta esta en queen?' } }, tel);
  await wa({ type: 'video', video: { id: 'v2', mime_type: 'video/mp4', caption: '¿y en king?' } }, tel);
  await wa({ type: 'document', document: { id: 'd1', filename: 'cama.pdf', mime_type: 'application/pdf', caption: '¿tienen esta?' } }, tel);
  assert.equal(mensajesWa().length, 3);
  assert.ok(!mensajesWa().some((m) => /no puedo (ver videos|abrir archivos)/.test(m.text?.body ?? m.image?.caption ?? '')));
  const delCliente = (await estadoWa(tel)).mensajes.filter((m) => m.role === 'user').map((m) => m.content);
  assert.deepEqual(delCliente, [
    '[Video del cliente: no lo puedes ver] ¿cuánto cuesta esta en queen?',
    '[Video del cliente: no lo puedes ver] ¿y en king?',
    '[Documento del cliente: no lo puedes abrir] ¿tienen esta?',
  ]);
  // Sin texto, el aviso de siempre (uno al día).
  await wa({ type: 'video', video: { id: 'v3', mime_type: 'video/mp4' } }, tel);
  assert.equal(mensajesWa().length, 4);
  assert.match(mensajesWa().at(-1).text.body, /no puedo ver videos/);
});
