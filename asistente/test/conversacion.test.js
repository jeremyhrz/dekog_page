// La conversación que comparten la web, WhatsApp e Instagram (pensar en chat.js): lo que el servidor agrega o corrige
// según lo que respondió la IA, y el plazo que pone el canal. IA: un Gemini falso dentro del proceso que responde lo que
// cada prueba le dice (o el proveedor «prueba» de llm.js). No sale nada a internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { kvEnMemoria } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { PROMO } from '../src/lib/promo.js';
import { recargoDeBoxEnAltaGama, numerosDelCliente } from '../src/lib/catalogo.js';
import { catalogosPdf } from '../src/lib/negocio.js';
import { sistemaPara } from '../src/lib/prompt.js';
import { lineaPrecio } from '../src/canales/meta.js';
import { escalonar } from '../src/lib/llm.js';
import { pensar, prometeBotonDeAsesora } from '../src/chat.js';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
const TASA = JSON.stringify({ promedio: 100, moneda: 'EUR', fechaActualizacion: '2026-10-21T12:00:00-04:00' });

/** Sin red: solo la tasa del BCV. */
const sinRed = async (url) => {
  if (String(url).includes('dolarapi.com')) return new Response(TASA);
  throw new Error(`Sin red en las pruebas: ${url}`);
};

let pedidos; // lo que se le pidió a Gemini en la prueba

/** Gemini falso: responde, en orden, las salidas dadas (la última se repite en las correcciones). */
function gemini(...salidas) {
  config.ASISTENTE_PROVEEDOR = '';
  config.GEMINI_API_KEY = 'clave-falsa';
  pedidos = [];
  globalThis.fetch = async (url, opciones = {}) => {
    if (!String(url).startsWith(GEMINI)) return sinRed(url);
    pedidos.push(JSON.parse(opciones.body));
    const salida = salidas[Math.min(pedidos.length, salidas.length) - 1];
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(salida) }] } }] }));
  };
}

/** Lo que devuelve la IA (el ESQUEMA de prompt.js), con lo que no importa en cada prueba ya puesto. */
const salidaIa = (respuesta, otros = {}) => ({
  foto: '', vitrina: '', respuesta, productos: [], derivar: { necesario: false, area: 'home', resumen: '' }, ofrecer_formulario: false, ...otros,
});
const producto = (id, talla = '', otros = {}) => ({ id, talla, box: '', cantidad: 1, tela_premium: false, con_puff: false, oferta: 0, ...otros });
const cliente = (content) => [{ role: 'user', content }];

beforeEach(() => { globalThis.fetch = sinRed; });
afterEach(() => {
  config.ASISTENTE_PROVEEDOR = 'prueba';
  delete config.GEMINI_API_KEY;
  config.PROMO = 'no';
});

// ── El plazo del canal ──────────────────────────────────────────────────────────────────────────────────────────────

test('`hasta`: con la IA colgada, o con las hojas de una foto que no terminan de subir, el aviso de emergencia sale a tiempo', { timeout: 8000 }, async () => {
  config.ASISTENTE_PROVEEDOR = '';
  config.GEMINI_API_KEY = 'clave-falsa';
  // Gemini no contesta nunca (solo se rinde si le cancelan el pedido), y las hojas de referencia tampoco terminan de bajar.
  globalThis.fetch = (url, { signal } = {}) => (String(url).includes('dolarapi.com')
    ? Promise.resolve(new Response(TASA))
    : new Promise((_, fallar) => signal?.addEventListener('abort', () => fallar(signal.reason))));
  for (const imagen of [null, { mime: 'image/jpeg', datos: '/9j/4AAQSkZJRg==' }]) {
    const hasta = Date.now() + 400;
    const r = await pensar(cliente('¿Cuánto cuesta la Toronto queen?'), 'whatsapp', { hasta, imagen, kv: kvEnMemoria() });
    const tarde = Date.now() - hasta;
    assert.equal(r.emergencia, true);
    assert.equal(r.whatsapp?.lineas.length, 2); // el aviso lleva a las dos asesoras
    assert.ok(tarde < 500, `${imagen ? 'con' : 'sin'} foto: respondió ${tarde} ms después del plazo`);
  }
});

test('`hasta` cerca: no se pide la corrección y se quita el texto dudoso; sin `hasta` (o uno que no es un plazo), como siempre', async () => {
  const respuestaFija = 'Te muestro abajo el total exacto con todo lo que elegiste, también en bolívares.';
  for (const [hasta, llamadas] of [[Date.now() + 3000, 1], [undefined, 2], [Number.NaN, 2], [String(Date.now() + 3000), 2], [0, 2], [-5, 2]]) {
    gemini(salidaIa('La Toronto Queen cuesta REF 999.', { productos: [producto(48, 'Queen 1,60x1,90 M')] }));
    const r = await pensar(cliente('¿Cuánto cuesta la Toronto queen?'), 'whatsapp', { hasta });
    assert.equal(pedidos.length, llamadas, `hasta = ${hasta}`);
    assert.equal(r.respuesta, respuestaFija);
    assert.equal(r.productos[0].ref, 550);
  }
});

test('Con el plazo ya vencido (las hojas de la foto tardaron), la cascada de modelos ni pregunta: sería un pedido perdido', async () => {
  let preguntas = 0;
  await assert.rejects(escalonar(['a', 'b'], async () => { preguntas += 1; return { respuesta: 'tarde' }; }, { hasta: Date.now() - 1 }));
  assert.equal(preguntas, 0);
});

// ── El pase a una asesora ───────────────────────────────────────────────────────────────────────────────────────────

test('Vitrina con «toca el botón «Ver modelos»… una asesora te confirma»: va la lista, sin pase a la asesora', async () => {
  for (const respuesta of [
    '¡Claro! Toca el botón «Ver modelos» y, cuando elijas una, una asesora te confirma la disponibilidad.',
    '¡Claro! Toca el botón «Ver modelos» y elige la que te guste; si quieres, una asesora te ayuda con la medida.',
  ]) {
    gemini(salidaIa(respuesta, { vitrina: 'camas' }));
    const r = await pensar(cliente('Quiero ver camas'), 'whatsapp');
    assert.equal(r.vitrina?.clave, 'camas', respuesta);
    assert.equal(r.whatsapp, null, respuesta);
  }
  // Si en otra oración promete de verdad a la asesora, van las dos cosas.
  gemini(salidaIa('Toca «Ver modelos» para verlas. Si prefieres, toca el botón de abajo y te atiende una asesora.', { vitrina: 'camas' }));
  const r = await pensar(cliente('Quiero ver camas'), 'whatsapp');
  assert.equal(r.vitrina?.clave, 'camas');
  assert.equal(r.whatsapp?.lineas.length, 2);
});

test('La IA promete el enlace (o el link) de la asesora sin marcar el pase: también se reconoce, como el botón', async () => {
  for (const s of [
    'Toca el enlace de abajo y una asesora te confirma el costo del envío.',
    'Una asesora te confirma el costo: toca el link de WhatsApp de abajo.',
    'El costo te lo confirma una asesora: toca el enlace de abajo 💛',
    'Toca uno de los links de abajo y te atiende una asesora.',
    'Toca el botón de hablar con asesora para darte más detalles.',
  ]) assert.ok(prometeBotonDeAsesora(s), s);
  for (const s of [
    'Te dejo el enlace del catálogo de ofertas; si quieres, una asesora te aparta la pieza.',
    'Una asesora te pasa el enlace de pago cuando confirmes.',
    'En el link de ofertas están todas; si te gusta una, una asesora te la aparta.',
    'Toca el enlace de abajo para ver todas las ofertas.',
  ]) assert.ok(!prometeBotonDeAsesora(s), s);
  gemini(salidaIa('Una asesora te confirma el costo del envío a Maracay: toca el link de WhatsApp de abajo.'));
  const r = await pensar(cliente('¿Cuánto cuesta el envío a Maracay?'), 'instagram');
  assert.equal(r.whatsapp?.lineas.length, 2);
});

test('Las dos asesoras: el prompt ya no manda los muebles a una línea y la arquitectura a otra', () => {
  for (const canal of ['web', 'whatsapp', 'instagram']) {
    const sistema = sistemaPara(canal);
    assert.doesNotMatch(sistema, /por la Home|por la de Arquitectura|con la línea de Arquitectura/, canal);
    assert.match(sistema, /dos líneas, Línea 1 y Línea 2/, canal);
  }
});

// ── Lo que el servidor controla del texto de la IA ──────────────────────────────────────────────────────────────────

test('Alta Gama: «el box va incluido y no suma nada» no es un recargo inventado; «el box nube suma REF 150» sí', async () => {
  const altaGama = (texto, id = 44) => recargoDeBoxEnAltaGama(texto, [{ id }]).length > 0;
  for (const [texto, id] of [
    ['En la Chicago el box va incluido y no suma nada.', 11],
    ['La Sydney trae el box curvo incluido sin costo adicional', 44],
    ['El box curvo de la Sydney va incluido en el precio, sin ningún recargo.', 44],
    ['El box de la Paris ya viene incluido: no pagas nada adicional.', 40],
    ['La Berna trae SU box incluido en el precio y no se paga nada adicional.', 52],
  ]) assert.ok(!altaGama(texto, id), texto);
  for (const texto of ['El box nube tiene un recargo de REF 120.', 'El box nube no está incluido y suma REF 150.', 'Son +REF 150 del box nube.',
    'El box nube cuesta REF 120 adicionales.', 'En la Sydney, el box nube tiene un recargo adicional.']) assert.ok(altaGama(texto), texto);
  // Con la Sydney: una sola llamada a la IA y su respuesta queda tal cual (antes se cambiaba por un texto fijo).
  const respuesta = 'La Sydney Queen cuesta REF 720 y trae el box curvo incluido sin costo adicional. ¿Para qué habitación la buscas?';
  gemini(salidaIa(respuesta, { productos: [producto(44, 'Queen 1,60x1,90 M')] }));
  const r = await pensar(cliente('¿La Sydney queen trae box? ¿Cuánto cuesta?'), 'whatsapp');
  assert.equal(pedidos.length, 1);
  assert.equal(r.respuesta, respuesta);
});

test('«…en oferta pagas el 50 % de anticipo» no se corrige: es lo que dicen las políticas', async () => {
  delete config.PROMO;
  const respuesta = 'Para apartar la Toronto individual en oferta pagas el 50 % de anticipo, y una asesora te la reserva.';
  gemini(salidaIa(respuesta, { productos: [producto(48, 'Individual 1,00x1,90 M', { oferta: 330 })] }));
  const r = await pensar(cliente('¿Cómo aparto la Toronto individual?'), 'whatsapp');
  assert.equal(pedidos.length, 1);
  assert.equal(r.respuesta, respuesta);
});

test('Copete: la tarjeta es la del copete (REF 455), no la Manila King entera, y en la hoja queda «copete en stock»', async () => {
  delete config.PROMO;
  gemini(salidaIa('El copete de la Manila King en stock (gris 01 en terciopelo) está a REF 455. Te lo muestro abajo en bolívares.',
    { productos: [producto(31, 'King 2,00x2,00 M', { oferta: 455 })] }));
  const r = await pensar(cliente('¿Cuánto cuesta el copete de la Manila king en bolívares?'), 'whatsapp');
  assert.equal(pedidos.length, 1);
  const [t] = r.productos;
  assert.equal(t.copete, true);
  assert.equal(t.ref, 455);
  assert.equal(t.bs, '45.500,00');
  assert.match(r.interes, /^Manila King 2,00x2,00 M copete en stock \(gris 01 en terciopelo\)$/);
  assert.doesNotMatch(lineaPrecio(t, r.tasa), /antes|760/);
});

test('Pide lo que está en oferta y la IA marca la vitrina de camas: no sale, quedan las tarjetas de las piezas', async () => {
  delete config.PROMO;
  gemini(salidaIa('Tenemos camas en stock con descuento: la Toronto individual a REF 330 y la Manila Queen a REF 420 🏷️', {
    vitrina: 'camas',
    productos: [producto(48, 'Individual 1,00x1,90 M', { oferta: 330 }), producto(31, 'Queen 1,60x1,90 M', { oferta: 420 })],
  }));
  const r = await pensar(cliente('¿Qué camas tienen en oferta?'), 'web');
  assert.equal(r.vitrina, null);
  assert.deepEqual(r.productos.map((t) => [t.nombre, t.ref, t.oferta]), [['Toronto', 330, true], ['Manila', 420, true]]);
});

test('Si la IA habla del «catálogo de la promo», va el enlace aunque el cliente no haya dicho «ofertas»', async () => {
  delete config.PROMO;
  gemini(salidaIa('¡Claro! En el catálogo de la promo las ves todas, con sus fotos y precios 🏷️'));
  const r = await pensar(cliente('¿Tienen algo más económico?'), 'web');
  assert.ok(r.respuesta.endsWith(`🏷️ Catálogo de ofertas:\n${PROMO.enlace}`), r.respuesta);
});

// ── Lo que el cliente comparte en Instagram ─────────────────────────────────────────────────────────────────────────

test('Instagram: el pie de lo que comparte no cuenta como escrito por el cliente (vitrina, PDF y montos)', async () => {
  const camas = '[Foto del cliente] (compartió una publicación de Instagram: «Conoce nuestros modelos de camas a la medida») ¿precio?';
  assert.equal((await pensar(cliente(camas), 'instagram')).vitrina, null);
  const pdf = await pensar(cliente('(compartió una publicación de Instagram: «Pide nuestro catálogo por DM») ¿precio?'), 'instagram');
  for (const [, url] of catalogosPdf) assert.ok(!pdf.respuesta.includes(url), url);
  // Lo que sí escribe él cuenta como siempre.
  assert.equal((await pensar(cliente('[Foto del cliente] quiero ver camas'), 'instagram')).vitrina?.clave, 'camas');
  const reel = await pensar(cliente('(compartió un reel de Instagram: «Cama Toronto») Pásame el catálogo'), 'instagram');
  assert.ok(catalogosPdf.every(([, url]) => reel.respuesta.includes(url)));
  // Un monto del pie no queda permitido como si lo hubiera dicho el cliente.
  assert.deepEqual(numerosDelCliente(cliente('(compartió una publicación de Instagram: «Cama Manila a REF 790») ¿y en king? Tengo 600')), [600]);
});
