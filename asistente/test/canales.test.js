// WhatsApp, Instagram y la web de punta a punta con un Meta falso dentro del proceso. IA: proveedor «prueba».
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SECRETO_WA, SECRETO_IG, kvEnMemoria, metaFalso, entregar, avisoWa, textoWa, filaWa, avisoIg } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { whatsappPost } from '../src/canales/whatsapp.js';
import { instagramPost } from '../src/canales/instagram.js';
import { pensar } from '../src/chat.js';

let env;
let meta;
const usar = (opciones) => { meta = metaFalso(opciones); globalThis.fetch = meta.fetchFalso; };
beforeEach(() => { env = { CONVERSACIONES: kvEnMemoria() }; usar(); });
afterEach(() => { delete config.IG_VITRINA; });

const mensajesWa = () => meta.enviados.filter((e) => e.url.endsWith('/PHONE123/messages') && e.cuerpo.type).map((e) => e.cuerpo);
const cupoWa = () => Number([...env.CONVERSACIONES.datos].find(([k]) => k.startsWith('wa:cupo:PHONE123:'))?.[1] ?? 0);
const enviosIg = () => meta.enviados.filter((e) => e.url.endsWith('/me/messages')).map((e) => e.cuerpo.message);
const estadoWa = () => JSON.parse(env.CONVERSACIONES.datos.get('wa:PHONE123:584140000001'));
const filasDe = (m) => m.interactive.action.sections.flatMap((s) => s.rows);
const bytes = (s) => new TextEncoder().encode(s).length;
const wa = (msg) => entregar(whatsappPost, avisoWa(msg), SECRETO_WA, env);
const ig = (msg, igsid) => entregar(instagramPost, avisoIg(msg, igsid), SECRETO_IG, env);

test('WhatsApp: «Quiero ver camas» → UNA lista (9 modelos + «Ver más camas»), 1 del cupo, nota en el historial', async () => {
  assert.equal(await wa(textoWa('Quiero ver camas')), 200);
  const enviados = mensajesWa();
  assert.equal(enviados.length, 1);
  const [lista] = enviados;
  assert.equal(lista.interactive.type, 'list');
  assert.deepEqual(lista.interactive.action.sections.map((s) => s.title), ['Camas Clásicas', 'Camas Kids', 'Camas Alta Gama', 'Más modelos']);
  const filas = filasDe(lista);
  assert.equal(filas.length, 10);
  assert.equal(filas.at(-1).id, 'mas:camas');
  assert.match(lista.interactive.body.text, /Ver las 40 camas: https:\/\/www\.dekog\.net\/\?categoria=camas#catalogo$/);
  assert.equal(cupoWa(), 1);
  assert.match(estadoWa().mensajes.at(-1).content, /\[Vitrina «Camas»: Toronto, Milan, Georgia, Sky, Charlotte, Oslo, Monaco, Barcelona, Mykonos\]$/);
});

test('WhatsApp: elegir una fila → foto + REF y Bs al instante, sin IA; la misma fila otra vez → solo texto', async () => {
  await wa(textoWa('Quiero ver camas'));
  await wa(filaWa('prod:48', 'Toronto'));
  let foto = mensajesWa()[1];
  assert.equal(foto.type, 'image');
  assert.equal(foto.image.link, 'https://www.dekog.net/wa/muebles/toronto.jpg'); // la copia JPEG (ver fotos.test.js)
  assert.match(foto.image.caption, /REF 550 \(Bs [\d.]+,\d\d\)/);
  assert.match(foto.image.caption, /¿Qué medida necesitas\?/); // la IA de prueba nunca dice esto: no pasó por la IA
  assert.equal(cupoWa(), 2);
  assert.equal(estadoWa().mensajes.at(-2).content, 'Toronto');
  assert.doesNotMatch(estadoWa().mensajes.at(-1).content, /Bs/); // la IA nunca ve montos en bolívares
  await wa(filaWa('prod:48', 'Toronto'));
  foto = mensajesWa()[2];
  assert.equal(foto.type, 'text');
  assert.equal(cupoWa(), 3); // un mensaje por mensaje del cliente, siempre
});

test('WhatsApp: «Ver más camas» (fila) y «muéstrame otras» (escrito) → los siguientes 9, sin repetir', async () => {
  await wa(textoWa('Quiero ver camas'));
  await wa(filaWa('mas:camas', 'Ver más camas'));
  await wa(textoWa('muéstrame otras'));
  const [p1, p2, p3] = mensajesWa().map((m) => filasDe(m).filter((f) => f.id.startsWith('prod:')).map((f) => f.title));
  assert.deepEqual(p2, ['Manila', 'Venecia', 'Houston', 'MÁXIMO', 'Aurora', 'Chicago', 'Bruselas', 'Hamburgo', 'Vienna']);
  assert.equal(new Set([...p1, ...p2, ...p3]).size, 27);
  assert.equal(mensajesWa()[1].interactive.header.text, 'Camas · otros 9 de 40 modelos');
  assert.equal(cupoWa(), 3);
});

test('WhatsApp: si Meta rechaza la lista, va el texto con los modelos y el enlace (el rechazo no cuenta)', async () => {
  usar({ rechazar: (c) => c.interactive?.type === 'list' });
  await wa(textoWa('Quiero ver camas'));
  const [texto] = mensajesWa();
  assert.equal(texto.type, 'text');
  assert.match(texto.text.body, /• Toronto \(Clásica\): Desde REF 405/);
  assert.match(texto.text.body, /Escríbeme «más» para ver otros modelos/);
  assert.match(texto.text.body, /Ver las 40 camas: https:\/\/www\.dekog\.net\/\?categoria=camas#catalogo$/);
  assert.equal(cupoWa(), 1);
});

test('WhatsApp: lo de antes sigue igual (modelo concreto → foto; comprar → botón de asesora; id viejo → IA)', async () => {
  await wa(textoWa('¿Cuánto es la Toronto queen en bolívares?'));
  await wa(textoWa('Me gusta, quiero comprarla. ¿La envían a Maracay?'));
  await wa(filaWa('prod:9999', 'Modelo retirado'));
  const tipos = mensajesWa().map((m) => m.interactive?.type ?? m.type);
  assert.deepEqual(tipos.slice(0, 2), ['image', 'cta_url']);
  assert.notEqual(tipos[2], 'list');
});

test('WhatsApp: con el cupo casi agotado, ni lista ni foto: el aviso de siempre', async () => {
  const mes = new Date().toISOString().slice(0, 7);
  await env.CONVERSACIONES.put(`wa:cupo:PHONE123:${mes}`, '975');
  await wa(filaWa('prod:48', 'Toronto'));
  const [aviso] = mensajesWa();
  assert.equal(aviso.type, 'text');
  assert.match(aviso.text.body, /escríbele directo a nuestra asesora/);
});

test('Instagram (modo texto, por defecto): texto de la IA + lista en texto con 10 respuestas rápidas', async () => {
  await ig({ text: 'Quiero ver camas' });
  const envios = enviosIg();
  assert.ok(envios.every((m) => !m.attachment && !m.attachments)); // sin fotos ni tarjetas
  const cierre = envios.at(-1);
  assert.ok(bytes(cierre.text) <= 1000);
  assert.match(cierre.text, /• Toronto \(Clásica\): Desde REF 405/);
  assert.match(cierre.text, /\?categoria=camas#catalogo$/);
  assert.equal(cierre.quick_replies.length, 10);
  assert.deepEqual(cierre.quick_replies.at(-1), { content_type: 'text', title: 'Ver más camas', payload: 'mas:camas' });
});

test('Instagram (IG_VITRINA=tarjetas): generic template de 9 tarjetas + cierre; si rechaza las tarjetas, la lista en texto', async () => {
  config.IG_VITRINA = 'tarjetas';
  await ig({ text: 'Quiero ver camas' });
  const plantilla = enviosIg().find((m) => m.attachment?.type === 'template');
  assert.equal(plantilla.attachment.payload.elements.length, 9);
  assert.equal(plantilla.attachment.payload.elements[0].image_url, 'https://www.dekog.net/wa/muebles/toronto.jpg');
  assert.match(plantilla.attachment.payload.elements[0].subtitle, /^Desde REF 405 · Bs [\d.]+,\d\d$/);
  assert.match(enviosIg().at(-1).text, /^Modelos: Toronto, Milan/);

  env = { CONVERSACIONES: kvEnMemoria() };
  usar({ rechazar: (c) => c.message?.attachment?.type === 'template' });
  await ig({ text: 'Quiero ver sofás' }, 'IGSID2');
  assert.match(enviosIg().at(-1).text, /• Amsterdam \(Sofá\): Desde REF 400/);
});

test('Instagram: si rechaza las respuestas rápidas, el mismo texto va sin ellas', async () => {
  usar({ rechazar: (c) => Boolean(c.message?.quick_replies) });
  await ig({ text: 'Quiero ver camas' });
  const cierre = enviosIg().at(-1);
  assert.equal(cierre.quick_replies, undefined);
  assert.match(cierre.text, /• Toronto \(Clásica\)/);
});

test('Instagram: tocar un modelo → foto + precios sin IA ni asteriscos; «Ver más» → los siguientes', async () => {
  await ig({ text: 'Quiero ver camas' });
  let antes = enviosIg().length;
  await ig({ text: 'Toronto', quick_reply: { payload: 'prod:48' } });
  const [imagen, texto] = enviosIg().slice(antes);
  assert.equal(imagen.attachments.payload.url, 'https://www.dekog.net/wa/muebles/toronto.jpg');
  assert.match(texto.text, /REF 665 \(Bs [\d.]+,\d\d\)/);
  assert.doesNotMatch(texto.text, /\*/);
  antes = enviosIg().length;
  await ig({ text: 'Ver más camas', quick_reply: { payload: 'mas:camas' } });
  const [mas] = enviosIg().slice(antes);
  assert.match(mas.text, /^Camas · otros 9 de 40 modelos:\n• Manila/);
});

test('Web: pensar() devuelve la vitrina (9 tarjetas con Bs, enlace y nota) sin tocar productos ni interés', async () => {
  const r = await pensar([{ role: 'user', content: 'Quiero ver camas' }], 'web');
  assert.equal(r.vitrina.clave, 'camas');
  assert.equal(r.vitrina.productos.length, 9);
  assert.ok(r.vitrina.productos.every((t) => t.bs));
  assert.equal(r.vitrina.ruta, '/?categoria=camas#catalogo');
  assert.ok(r.productos.length <= 3);
  assert.ok(!r.interes.includes('Mykonos')); // la hoja no se llena con lo que solo miró
  const r2 = await pensar([
    { role: 'user', content: 'Quiero ver camas' }, { role: 'assistant', content: `${r.respuesta}\n\n${r.vitrina.nota}` },
    { role: 'user', content: 'muéstrame otras' },
  ], 'web');
  assert.equal(r2.vitrina.productos[0].nombre, 'Manila');
  assert.equal((await pensar([{ role: 'user', content: '¿Cuánto es la Toronto queen en bolívares?' }], 'web')).vitrina, null);
});
