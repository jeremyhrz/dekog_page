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

test('Vitrina con la promesa de la asesora en la misma oración que «Ver modelos» («…; si prefieres, …»): van las dos cosas', async () => {
  for (const respuesta of [
    '¡Claro! Toca el botón «Ver modelos» para verlas; si prefieres, escríbele a una asesora por los enlaces de abajo.',
    'Toca «Ver modelos» para verlas, o el botón de abajo si prefieres hablar con una asesora',
    '¡Claro! Toca «Ver modelos» para verlas o escríbele a una asesora por los enlaces de abajo 😊',
    'Toca «Ver modelos» para verlas y, si quieres hablar con una asesora, toca uno de los enlaces de abajo.',
  ]) {
    gemini(salidaIa(respuesta, { vitrina: 'camas' }));
    const r = await pensar(cliente('Quiero ver camas'), 'whatsapp');
    assert.equal(r.vitrina?.clave, 'camas', respuesta);
    assert.equal(r.whatsapp?.lineas.length, 2, respuesta);
  }
  // El botón «Ver modelos» dicho de otras formas sigue siendo el de la lista, no el de la asesora.
  for (const respuesta of [
    'Toca el botón *Ver modelos* y una asesora te confirma la disponibilidad.',
    'Toca el botón que dice «Ver modelos» y una asesora te confirma la disponibilidad.',
    'Toca «Ver modelos» (el botón de abajo) y una asesora te confirma la disponibilidad.',
    'Toca el botón de abajo, «Ver modelos», para verlas y una asesora te ayuda a elegir.',
  ]) {
    gemini(salidaIa(respuesta, { vitrina: 'camas' }));
    const r = await pensar(cliente('Quiero ver camas'), 'whatsapp');
    assert.equal(r.vitrina?.clave, 'camas', respuesta);
    assert.equal(r.whatsapp, null, respuesta);
  }
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

test('Alta Gama: el precio de la cama dicho después del box («trae su box incluido y cuesta REF 720») no es un recargo', async () => {
  const altaGama = (texto, id = 44) => recargoDeBoxEnAltaGama(texto, [{ id }]).length > 0;
  for (const [texto, id] of [
    ['La Sydney Queen con su box curvo incluido cuesta REF 720.', 44],
    ['La Sydney Queen trae su box curvo incluido y cuesta REF 720.', 44],
    ['Sí, la Sydney Queen trae su box curvo incluido y no suma nada: cuesta REF 720.', 44],
    ['La Sydney Queen trae el box curvo incluido en su precio: cuesta REF 720.', 44],
    ['La Chicago Queen con su box incluido cuesta REF 700.', 11],
    ['La Berna Queen trae su box curvo incluido y cuesta REF 1.060.', 52],
  ]) assert.ok(!altaGama(texto, id), texto);
  // Un monto que no es un precio de la cama sigue siendo un recargo inventado.
  for (const texto of ['Con el box nube la Sydney Queen cuesta REF 840.', 'La Sydney Queen con box nube cuesta REF 870.',
    'La Sydney Queen cuesta REF 720, pero el box nube no está incluido y suma REF 150.']) assert.ok(altaGama(texto), texto);
  const respuesta = 'Sí, la Sydney Queen trae su box curvo incluido y no suma nada: cuesta REF 720. ¿Para qué habitación la buscas?';
  gemini(salidaIa(respuesta, { productos: [producto(44, 'Queen 1,60x1,90 M')] }));
  const r = await pensar(cliente('¿La Sydney queen trae box?'), 'whatsapp');
  assert.equal(pedidos.length, 1);
  assert.equal(r.respuesta, respuesta);
  // Con la promo, el precio de su pieza en stock tampoco es un recargo.
  delete config.PROMO;
  assert.ok(!altaGama('La Bali Queen en stock trae su box incluido y cuesta REF 790 (antes REF 990).', 6));
  assert.ok(altaGama('La Bali Queen en stock trae su box incluido y cuesta REF 790 (antes REF 990), y el box nube suma REF 150.', 6));
});

test('Alta Gama: el precio de un copete en stock («solo el cabecero, sin el box: cuesta REF 435») tampoco es un recargo', async () => {
  delete config.PROMO;
  const altaGama = (texto, id) => recargoDeBoxEnAltaGama(texto, [{ id }]).length > 0;
  for (const [texto, id] of [
    ['El copete de la Sydney Queen gris 01 (solo el cabecero, sin la base ni el box) cuesta REF 435.', 44],
    ['El copete de la Tailandia King (solo el cabecero, sin box) cuesta REF 835.', 45],
    ['El copete de la London King (solo el cabecero, sin la base ni el box) cuesta REF 835.', 30],
  ]) assert.ok(!altaGama(texto, id), texto);
  assert.ok(altaGama('El copete de la Sydney cuesta REF 435 y si lo quieres con el box curvo suma REF 285.', 44));
  // Una sola llamada, su texto y la tarjeta del copete (antes, el texto fijo de «cada cama trae su box incluido»).
  const copete = 'No, el copete es solo el cabecero, sin el box: cuesta REF 435. Es gris 01 en terciopelo. ¿Quieres que una asesora te lo aparte?';
  gemini(salidaIa(copete, { productos: [producto(44, 'Queen 1,60x1,90 M', { oferta: 435 })] }));
  const r = await pensar(cliente('¿El copete de la Sydney trae el box?'), 'whatsapp');
  assert.equal(pedidos.length, 1);
  assert.equal(r.respuesta, copete);
  assert.deepEqual(r.productos.map((t) => [t.nombre, t.ref, t.copete]), [['Sydney', 435, true]]);
  // Sin promo no hay copetes en stock: 435 no es un precio de la Sydney.
  config.PROMO = 'no';
  assert.ok(altaGama('El copete de la Sydney Queen gris 01 (solo el cabecero, sin la base ni el box) cuesta REF 435.', 44));
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

test('Pregunta por ofertas y la IA marca una vitrina sin piezas en stock que tapar: la lista va, como promete su texto', async () => {
  delete config.PROMO;
  gemini(salidaIa('¡Claro! Tenemos sofás modulares, clásicos y seccionales. Toca o escríbeme el nombre del que te guste 😊', { vitrina: 'sofas' }));
  assert.equal((await pensar(cliente('Quiero ver sofás, ¿tienen descuentos?'), 'instagram')).vitrina?.clave, 'sofas');
  // Camas, pero sin ninguna pieza en stock entre sus tarjetas: no hay nada que tapar.
  gemini(salidaIa('Aquí abajo tienes nuestras camas: desliza las fotos para verlas. ¿Para quién es? 🛏️', { vitrina: 'camas' }));
  assert.equal((await pensar(cliente('Quiero ver camas, ¿tienen alguna promo?'), 'web')).vitrina?.clave, 'camas');
});

test('Promo: una lista de piezas o copetes, y el pase de una pieza (sola o con 2 mesas), pasan con una sola llamada y el texto intacto', async () => {
  delete config.PROMO;
  const vinetas = '¡Sí! Tenemos camas en stock con descuento 🏷️:\n'
    + '• Toronto Individual gris 02 en chenille paño: REF 405 → REF 330\n'
    + '• Manila Queen gris 02 en chenille paño: REF 520 → REF 420\n'
    + '• Hamburgo Matrimonial gris 01 en terciopelo: REF 980 → REF 785';
  gemini(salidaIa(vinetas, { productos: [producto(48, 'Individual 1,00x1,90 M', { oferta: 330 }),
    producto(31, 'Queen 1,60x1,90 M', { oferta: 420 }), producto(24, 'Matrimonial 1,40x1,90 M', { oferta: 785 })] }));
  const lista = await pensar(cliente('¿Qué camas tienen en oferta?'), 'whatsapp');
  assert.equal(pedidos.length, 1);
  assert.ok(lista.respuesta.startsWith(vinetas), lista.respuesta); // y después el enlace de las ofertas
  // Copetes sin tarjetas: la primera frase habla de ellos.
  const copetes = '¡Claro! Tenemos copetes en stock (solo el cabecero):\n• Sydney Queen gris 01 en terciopelo: REF 435\n'
    + '• Manila King gris 01 en terciopelo: REF 455\n• Venecia Matrimonial rosa en zaga: REF 310';
  gemini(salidaIa(copetes));
  const cabecero = await pensar(cliente('¿Venden solo el cabecero?'), 'whatsapp');
  assert.equal(pedidos.length, 1);
  assert.equal(cabecero.respuesta, copetes);
  // El pase de una pieza sin nombrar la oferta: REF 420 es el precio de la pieza que eligió la IA.
  const pase = 'La Manila Queen gris 02 te queda en REF 420. Escríbele a una asesora con los enlaces de abajo y te la aparta 💛';
  gemini(salidaIa(pase, {
    productos: [producto(31, 'Queen 1,60x1,90 M', { oferta: 420 })],
    derivar: { necesario: true, area: 'home', resumen: 'Manila Queen en stock (oferta) · gris 02 en chenille paño · REF 420' },
  }));
  const aparta = await pensar(cliente('Quiero apartar la Manila queen gris'), 'whatsapp');
  assert.equal(pedidos.length, 1);
  assert.equal(aparta.respuesta, pase);
  assert.equal(aparta.resumen, 'Manila Queen en stock (oferta) · gris 02 en chenille paño · REF 420');
  // Junto a 2 mesas de noche (una tarjeta con cantidad, que activa el control de los totales): REF 420 tampoco sale «mal
  // sumado» (la nota pedía cambiarlo por REF 340, el total de las mesas).
  const conMesas = 'La Manila Queen gris 02 te queda en REF 420 y las 2 mesas Kenia en REF 340. Escríbele a una asesora con los '
    + 'enlaces de abajo y te las aparta 💛';
  gemini(salidaIa(conMesas, {
    productos: [producto(31, 'Queen 1,60x1,90 M', { oferta: 420 }), producto(67, '', { cantidad: 2 })],
    derivar: { necesario: true, area: 'home', resumen: 'Manila Queen en stock (oferta) · gris 02 · REF 420 | 2 Mesas Kenia · REF 340' },
  }));
  const mesas = await pensar(cliente('Quiero apartar la Manila queen gris y 2 mesas de noche Kenia'), 'whatsapp');
  assert.equal(pedidos.length, 1);
  assert.equal(mesas.respuesta, conMesas);
  assert.deepEqual(mesas.productos.map((t) => [t.nombre, t.ref]), [['Manila', 420], ['Mesa Kenia', 340]]);
});

test('Si la IA habla del «catálogo de la promo», va el enlace aunque el cliente no haya dicho «ofertas»', async () => {
  delete config.PROMO;
  gemini(salidaIa('¡Claro! En el catálogo de la promo las ves todas, con sus fotos y precios 🏷️'));
  const r = await pensar(cliente('¿Tienen algo más económico?'), 'web');
  assert.ok(r.respuesta.endsWith(`🏷️ Catálogo de ofertas:\n${PROMO.enlace}`), r.respuesta);
});

test('El enlace de las ofertas ya enviado vuelve si la IA lo anuncia abajo o el cliente lo pide otra vez; si no, no', async () => {
  delete config.PROMO;
  const enlace = `🏷️ Catálogo de ofertas:\n${PROMO.enlace}`;
  const historial = [
    { role: 'user', content: '¿Tienen descuentos?' },
    { role: 'assistant', content: `¡Sí! Tenemos hasta 20 % de descuento en mobiliario en stock 🏷️\n\n${enlace}` },
  ];
  const otraPregunta = async (texto, respuesta) => {
    gemini(salidaIa(respuesta));
    return (await pensar([...historial, { role: 'user', content: texto }], 'web')).respuesta;
  };
  // La IA dice que va abajo: va otra vez, así no apunta a algo que no llega.
  assert.ok((await otraPregunta('¿Y en sofás hay algo en oferta?', 'Por ahora las piezas con descuento son camas en stock. '
    + 'En el catálogo de ofertas que te dejo aquí abajo las ves todas 👇')).endsWith(enlace));
  // Lo nombra como el que ya le pasó: no se repite.
  assert.ok(!(await otraPregunta('¿Y en sofás hay algo en oferta?', 'Por ahora las piezas con descuento son camas en stock: '
    + 'están todas en el catálogo de ofertas que te pasé más arriba 🏷️')).includes(PROMO.enlace));
  // Lo vuelve a pedir, aunque no diga «catálogo».
  assert.ok((await otraPregunta('No me abre, ¿me pasas otra vez el link de la promo?', '¡Claro! Aquí lo tienes:')).endsWith(enlace));
  // El prompt ya no le dice que el sistema lo agrega siempre.
  assert.match(sistemaPara('web'), /al final de tu mensaje la\s+primera vez y cuando el cliente lo vuelve a pedir/);
  assert.match(sistemaPara('web'), /y\s+no lo vuelve a pedir, no digas que va abajo ni lo anuncies: dile que es el que le pasaste más arriba/);
});

test('El pase a las asesoras («con los enlaces de abajo») o una vitrina no vuelven a pegar el enlace de las ofertas ya enviado', async () => {
  delete config.PROMO;
  const enlace = `🏷️ Catálogo de ofertas:\n${PROMO.enlace}`;
  const historial = [
    { role: 'user', content: '¿Tienen descuentos?' },
    { role: 'assistant', content: `¡Sí! Tenemos hasta 20 % de descuento en mobiliario en stock 🏷️\n\n${enlace}` },
  ];
  const derivar = { necesario: true, area: 'home', resumen: 'Manila Queen en stock (oferta) · gris 02 en chenille paño · REF 420' };
  for (const canal of ['whatsapp', 'instagram']) {
    for (const [texto, respuesta] of [
      ['Quiero apartar la Manila queen gris en oferta',
        '¡Buena elección! Esa pieza en stock se vende rápido: escríbele a una asesora con los enlaces de abajo y te la aparta 💛'],
      ['¿Esa oferta incluye el envío?', 'El envío lo confirma una asesora. Escríbele a la que prefieras con los enlaces de abajo 👇'],
      ['Quiero la de la promo', 'Te dejo aquí abajo los links de WhatsApp de nuestras asesoras 👇'],
      // «El enlace» a secas, en una oración que habla de la asesora, también es el suyo.
      ['¿Esa oferta incluye el envío?', 'El envío te lo confirma una asesora: toca el enlace de abajo 💛'],
    ]) {
      gemini(salidaIa(respuesta, { productos: [producto(31, 'Queen 1,60x1,90 M', { oferta: 420 })], derivar }));
      const r = await pensar([...historial, { role: 'user', content: texto }], canal);
      assert.equal(r.whatsapp?.lineas.length, 2, respuesta);
      assert.ok(!r.respuesta.includes(PROMO.enlace), `${canal}: ${respuesta}`);
    }
  }
  // Con vitrina, lo de abajo es la lista (y en la web, el botón del catálogo de la página).
  for (const [texto, respuesta, clave] of [
    ['¿Y en mesas hay ofertas?', 'En mesas no hay piezas en stock, pero aquí abajo tienes todas: con el botón las ves en el '
      + 'catálogo de la página 😊', 'mesas'],
    ['Quiero ver de nuevo las camas', '¡Claro! Aquí abajo tienes el catálogo de camas para que elijas 😊', 'camas'],
  ]) {
    gemini(salidaIa(respuesta, { vitrina: clave }));
    const r = await pensar([...historial, { role: 'user', content: texto }], 'web');
    assert.equal(r.vitrina?.clave, clave, respuesta);
    assert.ok(!r.respuesta.includes(PROMO.enlace), respuesta);
  }
  // El catálogo anunciado abajo sigue contando aunque otra cláusula de la oración nombre a la asesora.
  gemini(salidaIa('Te dejo abajo el catálogo de ofertas; si te gusta alguna, una asesora te la aparta 💛'));
  assert.ok((await pensar([...historial, { role: 'user', content: '¿Qué más hay en oferta?' }], 'whatsapp')).respuesta.endsWith(enlace));
});

test('El enlace de las ofertas, pedido otra vez sin decir cuál («¿me pasas otra vez el link?»): va si fue el último que recibió', async () => {
  delete config.PROMO;
  const enlace = `🏷️ Catálogo de ofertas:\n${PROMO.enlace}`;
  const conOfertas = [
    { role: 'user', content: '¿Tienen descuentos?' },
    { role: 'assistant', content: `¡Sí! Tenemos hasta 20 % de descuento en mobiliario en stock 🏷️\n\n${enlace}` },
  ];
  const turno = async (historial, texto, respuesta, { otros = {}, canal = 'web' } = {}) => {
    gemini(salidaIa(respuesta, otros));
    return (await pensar([...historial, { role: 'user', content: texto }], canal)).respuesta;
  };
  for (const canal of ['web', 'whatsapp', 'instagram']) {
    for (const [texto, respuesta] of [
      ['¿Me pasas otra vez el link?', '¡Claro! Aquí tienes el enlace 👇'],
      ['¿Me pasas otra vez el link?', '¡Claro! Aquí lo tienes de nuevo 👇'],
      ['No me abre el enlace', '¡Disculpa! Te lo dejo de nuevo aquí abajo 👇'],
      ['No puedo abrir el link', '¡Disculpa! Aquí tienes el link de las ofertas 👇'],
      ['Mándame el link de nuevo porfa', '¡Claro! Aquí tienes el enlace 👇'],
      ['¿Me lo reenvías? No me carga', '¡Claro! Te dejo el enlace aquí abajo 👇'],
    ]) assert.ok((await turno(conOfertas, texto, respuesta, { canal })).endsWith(enlace), `${canal}: ${texto}`);
  }
  // También si el último lo escribió la IA, con un punto pegado.
  const escritoPorLaIa = [conOfertas[0], { role: 'assistant', content: `¡Sí! Las ves todas aquí: ${PROMO.enlace}.` }];
  assert.ok((await turno(escritoPorLaIa, '¿Me pasas otra vez el link?', '¡Claro! Aquí tienes el enlace 👇')).endsWith(enlace));
  // El de la asesora, otra cosa («la foto»), un «bueno me abrió», un último enlace que no es el de las ofertas (los PDF) o
  // uno que nunca se le mandó: no va.
  const deriva = { derivar: { necesario: true, area: 'home', resumen: 'Consulta' } };
  const conPdf = [...conOfertas, { role: 'user', content: 'Pásame el catálogo' },
    { role: 'assistant', content: catalogosPdf.map(([nombre, url]) => `📖 ${nombre}:\n${url}`).join('\n\n') }];
  const sinEnlace = [{ role: 'user', content: '¿Cuánto cuesta la Toronto?' }, { role: 'assistant', content: 'La Toronto cuesta desde REF 405.' }];
  for (const [historial, texto, respuesta, otros] of [
    [conOfertas, '¿Me pasas otra vez el link de la asesora?', 'Escríbele a la que prefieras con los enlaces de abajo 👇', deriva],
    [conOfertas, '¿Me reenvías la foto de la Toronto?', '¡Claro! Aquí abajo te la dejo 👇'],
    [conOfertas, 'Bueno me abrió el link, gracias', '¡Genial! Si te gusta alguna, escríbeme su nombre 💛'],
    [conPdf, 'No me abre el link', '¡Disculpa! Aquí tienes el enlace 👇'],
    [sinEnlace, '¿Me pasas otra vez el link?', '¡Claro! Aquí tienes el enlace 👇'],
  ]) assert.ok(!(await turno(historial, texto, respuesta, { otros })).includes(PROMO.enlace), texto);
  // Al reenviarlo, la IA lo nombra como lo reconoce el servidor (CATALOGO_DE_OFERTAS).
  assert.match(sistemaPara('web'), /Si lo vuelve a\s+pedir o no le abre, nómbralo «el catálogo de ofertas»/);
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
