// WhatsApp (22-oct): el cupo de Meta se cuenta con UNA escritura por vuelta (KV admite 1 por segundo en la misma clave),
// la vitrina no se descarta cuando además pasa a una asesora, el pie de foto ya no corta los precios en Bs y el texto de
// un video o un documento se responde. La memoria se guarda antes de la hoja y de la IA, un cliente que vuelve abre otra
// fila de la hoja y uno sin número recibe a las asesoras (y su número, si llega después, va a la hoja). El historial
// guarda lo que de verdad le llegó del texto. IA: proveedor «prueba» o un Gemini falso. Fetch falso: no sale nada a
// internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SECRETO_WA, kvEnMemoria, metaFalso, entregar, avisoWa, textoWa } from './ayuda.js';
import { kvConLimite } from './kv-limite.js';
import { config } from '../src/lib/config.js';
import { whatsappPost, textoConCola } from '../src/canales/whatsapp.js';
import { olvidarEnCurso } from '../src/canales/memoria.js';
import { catalogosPdf } from '../src/lib/negocio.js';
import { PROMO } from '../src/lib/promo.js';

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
const ahoraReal = Date.now; // algunas pruebas mueven el reloj
beforeEach(() => { env = { CONVERSACIONES: kvEnMemoria() }; salidaIa = null; usar(); });
afterEach(() => {
  Date.now = ahoraReal;
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
  const guardado = (await estadoWa('584140000209')).mensajes.at(-1).content;
  assert.match(guardado, /\[Vitrina «Camas»: [^\]]+\]$/);
  // En el historial, el texto tal como entró en la lista (recortado), no la respuesta entera.
  const delTexto = guardado.slice(0, guardado.lastIndexOf('\n\n[Vitrina «'));
  assert.ok(delTexto.endsWith('…') && cuerpo.startsWith(`${delTexto}\n\nHabla con una asesora`), delTexto);
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
  await wa(textoWa('¿Cuánto cuestan la Manila, la Paris y la Florida queen?'), '584140000210'); // sin pedir ofertas: sin enlace
  const [foto] = mensajesWa();
  assert.equal(foto.type, 'image');
  const pie = foto.image.caption;
  assert.ok(pie.length <= 1024, `${pie.length} caracteres`);
  assert.match(pie, /…\n\n• Manila · Queen [^\n]+ahora REF 420 = Bs [\d.]+,\d\d \([^)]+\)\n• Paris · Queen [^\n]+ahora REF 750 = Bs [\d.]+,\d\d \([^)]+\)\n• Florida · Queen [^\n]+ahora REF 680 = Bs [\d.]+,\d\d \([^)]+\)$/);
  // En el historial, lo que le llegó: el texto del pie, sin las líneas de precio (la IA nunca ve bolívares).
  const dicho = (await estadoWa('584140000210')).mensajes.at(-1).content;
  assert.ok(pie.startsWith(`${dicho}\n\n• Manila · Queen`), dicho);
});

test('Pie de foto: si el texto con el enlace del catálogo de ofertas no cabe, va todo en UN mensaje de texto, con el enlace', async () => {
  delete config.PROMO;
  const tel = '584140000225';
  await env.CONVERSACIONES.put(`wa:PHONE123:${tel}`, JSON.stringify({
    mensajes: [{ role: 'user', content: 'Hola' }, { role: 'assistant', content: '¡Hola! Soy el asistente virtual de Dekog 👋 ¿En qué te ayudo?' }],
    procesados: [], promoVista: PROMO.id,
  }));
  conIa({ respuesta: SOBRE_LAS_OFERTAS, productos: OFERTAS_QUEEN });
  await wa(textoWa('¿Qué camas queen tienen en oferta?'), tel);
  const [mensaje, ...otros] = mensajesWa();
  assert.equal(otros.length, 0);
  assert.equal(mensaje.type, 'text');
  const cuerpo = mensaje.text.body;
  assert.ok(cuerpo.startsWith(SOBRE_LAS_OFERTAS), cuerpo); // el texto de la IA entero, con su pregunta
  assert.ok(cuerpo.includes(`🏷️ Catálogo de ofertas:\n${PROMO.enlace}\n\n• Manila · Queen`), cuerpo);
  assert.match(cuerpo, /• Florida · Queen [^\n]+ahora REF 680 = Bs [\d.]+,\d\d \([^)]+\)$/);
  assert.ok((await estadoWa(tel)).mensajes.at(-1).content.includes(PROMO.enlace)); // ya se le dio: no se repite
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
    const { mensaje: r, dicho } = textoConCola(texto, cola, maximo);
    assert.ok(r.length <= maximo && r === `${dicho}\n\n${cola}`, `${maximo}: ${r}`);
    // Entero, sin el párrafo del enlace (el de antes completo, sin «…») o cortado antes del enlace, con «…».
    assert.ok([texto, 'Te cuento de las piezas en stock.'].includes(dicho) || (dicho.endsWith('…') && !/Catálogo|http/.test(dicho)), `${maximo}: ${dicho}`);
  }
  // Un enlace dentro del primer párrafo: se corta antes del enlace, nunca en medio.
  const suelto = 'Aquí ves todas las piezas https://www.dekog.net/ofertas y me dices cuál te gusta';
  for (let maximo = 1; maximo <= suelto.length; maximo++) {
    const { mensaje: r, dicho } = textoConCola(suelto, '', maximo);
    assert.ok(r.length <= maximo && r === dicho, `${maximo}: ${r}`);
    assert.ok(!r.includes('http') || r === suelto, `${maximo}: ${r}`);
  }
});

test('textoConCola: si se va un párrafo con enlace (los PDF del catálogo, el de ofertas), el «…» no queda pegado a una URL', () => {
  // Como lo arma chat.js cuando piden «el catálogo» y hablan de ofertas: el texto de la IA y después cada catálogo, con
  // su enlace solo en su línea.
  const catalogos = [...catalogosPdf.map(([nombre, url]) => [`📖 ${nombre}`, url]), ['🏷️ Catálogo de ofertas', PROMO.enlace]];
  const texto = ['¡Claro! Aquí tienes nuestros catálogos, con todos los modelos y sus medidas. ¿Te ayudo a elegir alguno?',
    ...catalogos.map(([rotulo, url]) => `${rotulo}:\n${url}`)].join('\n\n');
  const cola = '• Manila · Queen 1,60x1,90 M · 🏷️ oferta en stock (gris 02 en chenille paño): antes REF 520, ahora REF 420 = Bs 78.301,48';
  for (let maximo = cola.length + 3; maximo <= texto.length + cola.length + 2; maximo++) {
    const { mensaje, dicho } = textoConCola(texto, cola, maximo);
    assert.ok(mensaje.length <= maximo && mensaje === `${dicho}\n\n${cola}`, `${maximo}: ${mensaje}`);
    assert.doesNotMatch(dicho, /https?:\/\/\S*…/, `${maximo}`); // antes: «…/view…» al quitar el PDF de mobiliario
    for (const [url] of dicho.matchAll(/https?:\/\/\S+/g)) assert.ok(catalogos.some(([, u]) => u === url), `${maximo}: ${url}`);
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

// ── La memoria antes de la hoja, y los plazos desde que llegó el aviso ─────────────────────────────────────────────

const COMPRA = 'Me gusta, quiero comprarla. ¿La envían a Maracay?'; // la IA de prueba pasa a la asesora

test('Memoria: cuando se llama a la hoja el turno ya está guardado; si la hoja responde, otra vez, sin repetir mensajes', async () => {
  Object.assign(config, HOJA);
  const tel = '584140000213';
  let enKvAlLlamarALaHoja;
  const conHoja = globalThis.fetch;
  globalThis.fetch = async (url, o = {}) => {
    if (String(url).startsWith('https://hoja.falsa')) enKvAlLlamarALaHoja = await estadoWa(tel);
    return conHoja(url, o);
  };
  await wa(textoWa(COMPRA), tel);
  assert.equal(filasHoja.length, 1);
  assert.equal(enKvAlLlamarALaHoja?.mensajes.at(-1)?.role, 'assistant', 'al llamar a la hoja, la memoria no tenía la respuesta');
  assert.equal(enKvAlLlamarALaHoja.guardado, false);
  const despues = await estadoWa(tel);
  assert.equal(despues.guardado, true);
  assert.deepEqual(despues.mensajes.map((m) => m.role), ['user', 'assistant']);
});

test('Plazos desde que llegó el aviso: con 25 s gastados antes de la IA, la emergencia sale ya, la memoria queda y la hoja corta a los 27 s', { timeout: 8000 }, async () => {
  Object.assign(config, HOJA);
  conIa({});
  const tel = '584140000214';
  // Gemini y la hoja no contestan nunca: solo se rinden cuando se les cancela el pedido.
  const colgado = (signal) => new Promise((_, fallar) => signal.addEventListener('abort', () => fallar(signal.reason)));
  let intentosHoja = 0;
  let adelanto = 0;
  const conMeta = globalThis.fetch;
  globalThis.fetch = async (url, o = {}) => {
    const u = String(url);
    if (u.includes('generativelanguage.googleapis.com')) return colgado(o.signal);
    if (u.startsWith('https://hoja.falsa')) {
      intentosHoja += 1;
      return colgado(o.signal);
    }
    // El «leído» y la foto (o Meta lento) se llevaron 25 s de los 30 que da Cloudflare.
    if (JSON.parse(o.body ?? '{}').status === 'read') adelanto = 25000;
    return conMeta(url, o);
  };
  Date.now = () => ahoraReal() + adelanto;
  const inicio = ahoraReal();
  await wa(textoWa('¿Cuánto es la Toronto queen?'), tel);
  assert.ok(ahoraReal() - inicio < 4500, `tardó ${ahoraReal() - inicio} ms`); // antes: 24 s de IA y hasta 20 s de hoja
  const [aviso] = mensajesWa();
  assert.match(aviso.text.body, /en este momento no puedo responder[\s\S]*Línea 1[\s\S]*Línea 2/);
  assert.equal(intentosHoja, 1); // con 2 s por delante, sin segundo intento
  const memoria = await estadoWa(tel);
  assert.deepEqual(memoria.mensajes.map((m) => m.role), ['user', 'assistant']);
  assert.equal(memoria.guardado, false); // la hoja no respondió: va de nuevo con su próximo mensaje
});

// ── Un aviso repetido en otra instancia ──────────────────────────────────────────────────────────────────────────

test('Aviso repetido por Meta que cae en otra instancia mientras la IA piensa: se responde UNA vez', { timeout: 8000 }, async () => {
  env = { CONVERSACIONES: kvConLimite() };
  conIa({ respuesta: 'La Toronto Queen (1,60 x 1,90 m) está en REF 550.', productos: [{ id: 48, talla: 'Queen 1,60x1,90 M' }] });
  // La IA tarda: no contesta hasta que la prueba la suelta. `pidio[i]` se cumple con su pedido número i + 1.
  let pedidos = 0;
  const pidio = [Promise.withResolvers(), Promise.withResolvers()];
  const suelta = Promise.withResolvers();
  const conIaFalsa = globalThis.fetch;
  globalThis.fetch = async (url, o = {}) => {
    if (String(url).includes('generativelanguage.googleapis.com')) {
      pidio[pedidos]?.resolve();
      pedidos += 1;
      await suelta.promise;
    }
    return conIaFalsa(url, o);
  };
  const tel = '584140000215';
  const aviso = avisoWa(textoWa('¿Cuánto es la Toronto queen?'), tel);
  const primera = entregar(whatsappPost, aviso, SECRETO_WA, env);
  await pidio[0].promise; // la primera instancia ya está esperando a la IA
  olvidarEnCurso(); // la repetición le llega a otra instancia, que no la tiene en su memoria
  const segunda = entregar(whatsappPost, aviso, SECRETO_WA, env);
  // La IA sigue pensando hasta que la segunda termina (o le pide otra respuesta, si no vio que ya se estaba atendiendo).
  await Promise.race([segunda, pidio[1].promise]);
  suelta.resolve();
  await Promise.all([primera, segunda]);
  assert.equal(pedidos, 1);
  assert.equal(mensajesWa().length, 1);
  assert.equal(meta.enviados.filter((e) => e.cuerpo.status === 'read').length, 1);
  assert.equal((await estadoWa(tel)).mensajes.filter((m) => m.role === 'user').length, 1);
  // La marca va en su propia clave y la memoria se escribe una sola vez: guardarla también antes de la IA chocaba (1
  // escritura por segundo en la misma clave) con los guardados de otros mensajes seguidos del cliente, y se perdían turnos.
  const { id } = aviso.entry[0].changes[0].value.messages[0];
  assert.deepEqual(env.CONVERSACIONES.escritas.filter((k) => !k.startsWith('wa:cupo:')), [`visto:${id}`, `wa:PHONE123:${tel}`]);
});

// ── La fila de la hoja: la hoja solo manda el correo con las filas NUEVAS ──────────────────────────────────────────

const hoyCaracas = () => new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);

test('Hoja: un cliente nuevo abre su fila con la fecha (wa-<número>-<fecha>); en la memoria queda la fecha, no el número', async () => {
  Object.assign(config, HOJA);
  const tel = '584140000216';
  await wa(textoWa(COMPRA), tel);
  assert.deepEqual(filasHoja.map((f) => f.id), [`wa-${tel}-${hoyCaracas()}`]);
  assert.equal(filasHoja[0].telefono, `+${tel}`);
  const memoria = await estadoWa(tel);
  assert.equal(memoria.filaHoja, hoyCaracas());
  assert.ok(!JSON.stringify(memoria).includes(tel));
});

test('Hoja: dentro de los 7 días, un interés nuevo actualiza su misma fila (antes solo contaba el resumen)', async () => {
  Object.assign(config, HOJA);
  const tel = '584140000217';
  await wa(textoWa(COMPRA), tel); // la Toronto: pasa a la asesora
  conIa({
    respuesta: '¡La Manila queen te va a encantar! Una asesora de Dekog te escribirá a tu WhatsApp para contarte cómo pagarla.',
    productos: [{ id: 31, talla: 'Queen 1,60x1,90 M' }],
    ofrecer_formulario: true,
  });
  await wa(textoWa('¿Y cómo pago la Manila queen?'), tel);
  assert.equal(filasHoja.length, 2);
  assert.equal(filasHoja[1].id, filasHoja[0].id);
  assert.match(filasHoja[1].interes, /^Manila/);
  await wa(textoWa('¿Y cómo pago la Manila queen?'), tel); // lo mismo: nada nuevo para la hoja
  assert.equal(filasHoja.length, 2);
});

test('Hoja: si su fila tiene 7 días o más, lo que muestre ahora va en una fila nueva (y llega el correo); con 6, en la suya', async () => {
  Object.assign(config, HOJA);
  for (const [dias, tel] of [[6, '584140000218'], [8, '584140000219']]) {
    Date.now = () => ahoraReal() - dias * 86400 * 1000; // su primer mensaje, hace `dias` días
    await wa(textoWa(COMPRA), tel);
    Date.now = ahoraReal;
    await wa(textoWa(COMPRA), tel); // hoy, lo mismo que entonces
  }
  const filasDe = (tel) => filasHoja.filter((f) => f.telefono === `+${tel}`).map((f) => f.id);
  assert.equal(filasDe('584140000218').length, 1); // nada nuevo, y su fila es de esta semana
  const [vieja, nueva] = filasDe('584140000219');
  assert.notEqual(vieja, nueva);
  assert.equal(nueva, `wa-584140000219-${hoyCaracas()}`);
  assert.equal((await estadoWa('584140000219')).guardado, true);
});

test('Hoja: quien ya estaba en la hoja antes del 22-oct sigue en su fila wa-<número> (ni fila ni correo repetidos)', async () => {
  Object.assign(config, HOJA);
  const tel = '584140000220';
  // Su memoria como la dejó la versión anterior: ya en la hoja y sin fecha de fila.
  await env.CONVERSACIONES.put(`wa:PHONE123:${tel}`, JSON.stringify({
    mensajes: [{ role: 'user', content: '¿Cuánto es la Toronto queen?' }, { role: 'assistant', content: 'Está en REF 550.' }],
    procesados: [], guardado: true, interes: 'Toronto Queen 1,60x1,90 M', resumen: '', resumenEnHoja: '', telefonoEnHoja: false,
  }));
  await wa(textoWa(COMPRA), tel);
  assert.deepEqual(filasHoja.map((f) => f.id), [`wa-${tel}`]);
  const memoria = await estadoWa(tel);
  assert.equal(memoria.filaHoja, '');
  assert.ok(memoria.filaHojaDesde > 0); // sus 7 días empiezan ahora
});

test('Hoja: el aviso del cupo agotado va en la fila del cliente; uno nuevo abre la suya con la fecha', async () => {
  Object.assign(config, HOJA);
  const tel = '584140000221';
  await wa(textoWa(COMPRA), tel);
  await env.CONVERSACIONES.put(claveCupo(), '990');
  await wa(textoWa('Hola, ¿siguen ahí?'), tel);
  assert.equal(filasHoja.length, 2);
  assert.equal(filasHoja[1].id, filasHoja[0].id);
  assert.match(filasHoja[1].resumen, /ya no le quedaban respuestas gratis/);
  await wa(textoWa('Hola'), '584140000222');
  assert.equal(filasHoja.at(-1).id, `wa-584140000222-${hoyCaracas()}`);
});

// ── Un cliente sin número (usa nombre de usuario: solo llega su BSUID) ──────────────────────────────────────────────

/** El aviso de un cliente con nombre de usuario: Meta manda su BSUID (from_user_id) y no su número. */
function avisoSinNumero(mensaje, bsuid) {
  const aviso = avisoWa(mensaje);
  const valor = aviso.entry[0].changes[0].value;
  valor.contacts = [{ profile: { name: 'Carla' }, user_id: bsuid }];
  delete valor.messages[0].from;
  valor.messages[0].from_user_id = bsuid;
  return aviso;
}

const PROMESA = '¡Excelente elección! 😍 La Toronto Queen está en REF 550. Una asesora de Dekog te escribirá a tu WhatsApp para coordinar el pago.';

test('Sin número: en vez de prometerle que le escribirán, las dos asesoras con su pedido ya escrito, y queda en la hoja', async () => {
  Object.assign(config, HOJA);
  conIa({ respuesta: PROMESA, productos: [{ id: 48, talla: 'Queen 1,60x1,90 M' }], ofrecer_formulario: true });
  await entregar(whatsappPost, avisoSinNumero(textoWa('Quiero la Toronto queen, ¿cómo pago?'), 'VE.1234567890'), SECRETO_WA, env);
  const [foto] = mensajesWa();
  assert.equal(foto.recipient, 'VE.1234567890');
  const pie = foto.image.caption;
  assert.doesNotMatch(pie, /te escribirá/);
  assert.match(pie, /La Toronto Queen está en REF 550\.\n\nPara seguir, escríbele a la asesora que prefieras con los enlaces de abajo/);
  assert.match(pie, /\n\nLínea 1 \(0414-584 7791\):\nhttps:\/\/\S+\/a\/[A-Za-z0-9]{6}1\n\nLínea 2 \(0424-400 6086\):\nhttps:\/\/\S+\/a\/[A-Za-z0-9]{6}2$/);
  // El enlace abre el chat de la asesora con lo que le interesa ya escrito.
  const [destinos] = [...env.CONVERSACIONES.datos].filter(([k]) => k.startsWith('enlace:')).map(([, v]) => JSON.parse(v));
  assert.match(decodeURIComponent(destinos[2]), /^https:\/\/wa\.me\/584244006086\?text=Hola Dekog, vengo del asistente de WhatsApp 👋\nToronto Queen/);
  // En la hoja, sin teléfono y con el porqué: Dekog sabe del interés aunque no pueda escribirle.
  assert.equal(filasHoja.length, 1);
  assert.match(filasHoja[0].id, /^wa-VE\.1234567890-\d{4}-\d{2}-\d{2}$/);
  assert.equal(filasHoja[0].telefono, '');
  assert.equal(filasHoja[0].nombre, 'Carla');
  assert.match(filasHoja[0].resumen, /WhatsApp no da su número/);
  // Con su número, la promesa se queda: la asesora le escribe con lo que quedó en la hoja.
  await wa(textoWa('Quiero la Toronto queen, ¿cómo pago?'), '584140000223');
  const conNumero = mensajesWa().at(-1).image.caption;
  assert.match(conNumero, /te escribirá a tu WhatsApp/);
  assert.doesNotMatch(conNumero, /Línea 1/);
  assert.equal(filasHoja.at(-1).telefono, '+584140000223');
});

test('Sin número: si la IA además pasa a la asesora, tampoco queda la promesa de que le escribirán', async () => {
  conIa({ respuesta: '¡Con gusto! Una asesora de Dekog te escribirá a tu WhatsApp para apartarla.', ofrecer_formulario: true,
    derivar: { necesario: true, area: 'home', resumen: 'Quiere apartar la Toronto queen' } });
  await entregar(whatsappPost, avisoSinNumero(textoWa('Quiero apartar la Toronto queen'), 'VE.777'), SECRETO_WA, env);
  const cuerpo = mensajesWa().at(-1).text.body;
  assert.doesNotMatch(cuerpo, /te escribirá/);
  assert.match(cuerpo, /Para seguir, escríbele a la asesora que prefieras/);
  assert.match(cuerpo, /Línea 2 \(0424-400 6086\):\nhttps:\/\/\S+\/a\/[A-Za-z0-9]{6}2$/);
});

test('Sin número: también se quitan «te va a contactar», «que te escriba», «se pondrá en contacto» y «ya tiene tu número»', async () => {
  const frases = ['Una asesora te va a contactar pronto 😊', '¿Quieres que una asesora te escriba?', 'Una asesora se pondrá en contacto contigo.', 'Dekog ya tiene tu número.'];
  for (const [i, frase] of frases.entries()) {
    conIa({ respuesta: `¡Claro que sí! Hacemos envíos a todo el país. ${frase}`, ofrecer_formulario: true });
    await entregar(whatsappPost, avisoSinNumero(textoWa('Quiero comprar, ¿hacen envíos?'), `VE.99${i}`), SECRETO_WA, env);
    const cuerpo = mensajesWa().at(-1).text.body;
    assert.ok(!cuerpo.includes(frase), cuerpo);
    assert.match(cuerpo, /Hacemos envíos a todo el país\.\n\nPara seguir, escríbele a la asesora que prefieras/, frase);
    assert.match(cuerpo, /Línea 2 \(0424-400 6086\):\nhttps:\/\/\S+\/a\/[A-Za-z0-9]{6}2$/, frase);
  }
});

test('Sin número y después con él (el mismo cliente): su teléfono llega a la hoja, en otra fila y una sola vez', async () => {
  Object.assign(config, HOJA);
  const bsuid = 'VE.5551234';
  conIa({ respuesta: PROMESA, productos: [{ id: 48, talla: 'Queen 1,60x1,90 M' }], ofrecer_formulario: true });
  await entregar(whatsappPost, avisoSinNumero(textoWa('Quiero apartar la Toronto queen, ¿cómo pago?'), bsuid), SECRETO_WA, env);
  assert.deepEqual(filasHoja.map((f) => f.telefono), ['']);
  // Desde el segundo mensaje Meta manda también su número (ya escribió en los últimos 30 días): la misma conversación.
  const conNumero = (texto) => {
    const aviso = avisoWa(textoWa(texto), '584141112233');
    const valor = aviso.entry[0].changes[0].value;
    valor.messages[0].from_user_id = bsuid;
    valor.contacts[0].user_id = bsuid;
    return aviso;
  };
  conIa({ respuesta: '¡Claro! Hacemos envíos a Valencia. Una asesora de Dekog te escribirá a tu WhatsApp para coordinar el pago.', ofrecer_formulario: true });
  await entregar(whatsappPost, conNumero('¿Y hacen envíos a Valencia?'), SECRETO_WA, env);
  const [, promesa] = mensajesWa();
  assert.equal(promesa.to, '584141112233');
  assert.match(promesa.text.body, /te escribirá a tu WhatsApp/); // ahora la asesora sí tiene a quién escribirle
  assert.deepEqual(filasHoja.slice(1).map((f) => [f.id, f.telefono]), [[`wa-584141112233-${hoyCaracas()}`, '+584141112233']]);
  // Lo mismo otra vez: nada nuevo para la hoja.
  await entregar(whatsappPost, conNumero('¿Y hacen envíos a Valencia?'), SECRETO_WA, env);
  assert.equal(filasHoja.length, 2);
  // Una sola memoria (la clave es su BSUID) y sin su número.
  assert.deepEqual([...env.CONVERSACIONES.datos.keys()].filter((k) => k.startsWith('wa:PHONE123:')), [`wa:PHONE123:${bsuid}`]);
  assert.ok(!env.CONVERSACIONES.datos.get(`wa:PHONE123:${bsuid}`).includes('584141112233'));
});
