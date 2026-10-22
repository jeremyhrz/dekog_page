// Enlaces cortos a la asesora en Instagram (21-oct): el wa.me con el resumen pasaba de 200 caracteres y Instagram solo
// ponía en azul el principio (el resto, letras grises sueltas). IA: proveedor «prueba». Fetch falso: nada sale a internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SECRETO_IG, kvEnMemoria, metaFalso, entregar, avisoIg, sinMarca } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { lineas as LINEAS } from '../src/lib/negocio.js';
import { enlaceCorto, enlacesCortos, irAlEnlace } from '../src/lib/enlaces.js';
import { instagramPost } from '../src/canales/instagram.js';
import worker from '../src/worker.js';

const LARGO = 'https://wa.me/584145847791?text=Hola%20Dekog%2C%20vengo%20del%20asistente%20de%20Instagram%20%F0%9F%91%8B%0A'
  + 'Cliente%20pregunta%20por%20env%C3%ADo%20a%20Caracas%20de%20la%20cama%20Florida%20en%20Queen';
const LARGO_2 = LARGO.replace('584145847791', '584244006086');
const LINEA_1 = 'https://wa.me/584145847791';
const LINEA_2 = 'https://wa.me/584244006086';
let env;
let meta;
beforeEach(() => { env = { CONVERSACIONES: kvEnMemoria() }; meta = metaFalso(); globalThis.fetch = meta.fetchFalso; });
afterEach(() => { delete config.ENLACE_CORTO_BASE; delete config.ASISTENTE_URL; });

test('Instagram: al pasar a la asesora, un mensaje aparte con las DOS líneas; cada enlace corto, solo en su línea y entero', async () => {
  config.ENLACE_CORTO_BASE = 'https://www.dekog.net/';
  await entregar(instagramPost, avisoIg({ text: 'Me gusta, quiero comprarla. ¿La envían a Maracay?' }), SECRETO_IG, env);
  const crudos = meta.enviados.filter((e) => e.url.endsWith('/me/messages') && e.cuerpo.message.text).map((e) => e.cuerpo.message.text);
  const pase = crudos.find((t) => t.startsWith('Habla con una asesora por WhatsApp'));
  // La marca va al final con un espacio delante: pegada al enlace, Instagram lo cortaba en la última «/».
  assert.ok(pase.endsWith(' \u2063'), JSON.stringify(pase.slice(-12)));
  const lineas = sinMarca(pase).split('\n');
  assert.deepEqual(lineas.filter((l) => l.includes('https://')).length, 2);
  for (const l of lineas.filter((x) => x.includes('https://'))) assert.match(l, /^https:\/\/www\.dekog\.net\/a\/[A-Za-z0-9]{6}[12]$/);
  assert.ok(lineas.includes('Línea 1 (0414-584 7791):') && lineas.includes('Línea 2 (0424-400 6086):'));
  const [uno, dos] = lineas.filter((l) => l.startsWith('https://')).map((l) => l.split('/a/')[1]);
  // Las 6 letras son las mismas (UNA escritura de KV por pase) y el último dígito es la línea del rótulo.
  assert.equal(uno.slice(-1), '1');
  assert.equal(dos, `${uno.slice(0, 6)}2`);
  assert.deepEqual([...env.CONVERSACIONES.datos.keys()].filter((k) => k.startsWith('enlace:')), [`enlace:${uno.slice(0, 6)}`]);
  const ir = async (codigo) => (await irAlEnlace(codigo, env.CONVERSACIONES)).headers.get('Location');
  assert.match(await ir(uno), /^https:\/\/wa\.me\/584145847791\?text=Hola%20Dekog%2C%20vengo%20del%20asistente%20de%20Instagram/);
  assert.match(await ir(dos), /^https:\/\/wa\.me\/584244006086\?text=Hola%20Dekog%2C%20vengo%20del%20asistente%20de%20Instagram/);
  // Y en ningún texto de Instagram hay un enlace pegado a otro texto.
  for (const t of crudos.map(sinMarca)) for (const l of t.split('\n')) if (l.includes('https://')) assert.match(l, /^https:\/\/\S+$/, l);
});

test('GET /a/<código>: redirige al WhatsApp de su línea; vencido, raro o ajeno → esa línea sin texto (sin línea, la 01)', async () => {
  await env.CONVERSACIONES.put('enlace:k3P9xQ', LARGO); // un enlace del 21-oct: sin línea y el destino en texto plano
  await env.CONVERSACIONES.put('enlace:ma1123', 'https://evil.example/robo');
  await env.CONVERSACIONES.put('enlace:Vb7kTq', JSON.stringify({ 1: LARGO, 2: LARGO_2 }));
  await env.CONVERSACIONES.put('enlace:Xy3pQr', JSON.stringify({ 1: LARGO, 2: 'https://evil.example/robo' }));
  const ir = (ruta, method = 'GET') => worker.fetch(new Request(`https://asistente.falso${ruta}`, { method }), env, { waitUntil() {} });
  let r = await ir('/a/Vb7kTq2');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('Location'), LARGO_2);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.equal((await ir('/a/Vb7kTq1', 'HEAD')).headers.get('Location'), LARGO); // la vista previa de Instagram
  for (const [ruta, destino] of [
    ['/a/k3P9xQ', LARGO],
    // Con la marca invisible de Instagram pegada (los pases del 21 y el 22-oct): se quita y vale el código.
    ['/a/k3P9xQ%E2%81%A3', LARGO], ['/a/k3P9xQ%e2%81%a3', LARGO], ['/a/Vb7kTq2\u2063', LARGO_2],
    // Vencido o desconocido: la línea de su dígito, sin texto. Así la «Línea 2» nunca abre la Línea 1.
    ['/a/zzzzzz2', LINEA_2], ['/a/zzzzzz1', LINEA_1], ['/a/zzzzzz', LINEA_1],
    // Un destino que no es wa.me nunca se sigue: tampoco ahí se cambia de línea.
    ['/a/ma1123', LINEA_1], ['/a/ma11232', LINEA_2], ['/a/Xy3pQr2', LINEA_2], ['/a/Xy3pQr1', LARGO],
    // Sin línea en un pase nuevo, o un código que no se entiende: la Línea 01.
    ['/a/Vb7kTq', LINEA_1], ['/a/..%2Fsalud', LINEA_1], ['/a/abc', LINEA_1], ['/a/Vb7kTq3', LINEA_1],
  ]) {
    r = await ir(ruta);
    assert.equal(r.status, 302, ruta);
    assert.equal(r.headers.get('Location'), destino, ruta);
  }
  // Si KV no se puede leer, también la línea de su dígito.
  const caido = { get: async () => { throw new Error('KV no responde'); } };
  assert.equal((await irAlEnlace('Vb7kTq2', caido)).headers.get('Location'), LINEA_2);
  assert.equal((await irAlEnlace('Vb7kTq1', caido)).headers.get('Location'), LINEA_1);
  assert.equal((await irAlEnlace('Vb7kTq2', undefined)).headers.get('Location'), LINEA_2);
});

test('Un pase: UNA escritura de KV con los dos destinos ({"1", "2"}), que dura más de 30 días; mismo orden y forma', async () => {
  config.ENLACE_CORTO_BASE = 'https://www.dekog.net';
  const escritas = [];
  const kv = kvEnMemoria();
  const put = kv.put.bind(kv);
  kv.put = async (clave, valor, opciones) => { escritas.push({ clave, valor, opciones }); return put(clave, valor); };
  const asesoras = Object.values(LINEAS).map((l, i) => ({ etiqueta: l.etiqueta, visible: l.visible, url: [LARGO, LARGO_2][i] }));
  const cortos = await enlacesCortos(kv, asesoras);
  assert.equal(escritas.length, 1);
  const letras = escritas[0].clave.replace(/^enlace:/, '');
  assert.match(letras, /^[A-Za-z0-9]{6}$/);
  assert.deepEqual(JSON.parse(escritas[0].valor), { 1: LARGO, 2: LARGO_2 });
  // 180 días: en WhatsApp el chat no se borra y los clientes vuelven a tocar enlaces viejos.
  assert.ok(escritas[0].opciones.expirationTtl >= 180 * 24 * 60 * 60, String(escritas[0].opciones.expirationTtl));
  assert.deepEqual(cortos, [
    { etiqueta: 'Línea 1', visible: '0414-584 7791', url: `https://www.dekog.net/a/${letras}1` },
    { etiqueta: 'Línea 2', visible: '0424-400 6086', url: `https://www.dekog.net/a/${letras}2` },
  ]);
  assert.equal(asesoras[0].url, LARGO); // no toca lo que recibe
  for (const [i, destino] of [[0, LARGO], [1, LARGO_2]]) {
    assert.equal((await irAlEnlace(cortos[i].url.split('/a/')[1], kv)).headers.get('Location'), destino);
  }
  // Un wa.me que no es de una asesora (el del propio asistente): el código va sin línea y también funciona.
  const otro = 'https://wa.me/584124423350?text=Hola';
  const [suelto] = await enlacesCortos(kv, [{ etiqueta: 'Asistente', url: otro }]);
  assert.match(suelto.url, /^https:\/\/www\.dekog\.net\/a\/[A-Za-z0-9]{6}$/);
  assert.equal((await irAlEnlace(suelto.url.split('/a/')[1], kv)).headers.get('Location'), otro);
  // Y si no hay nada que guardar (ningún wa.me), no se escribe.
  assert.deepEqual(await enlacesCortos(kv, [{ url: 'https://www.dekog.net/ofertas?x=1' }]), [{ url: 'https://www.dekog.net/ofertas' }]);
  assert.equal(escritas.length, 2);
});

test('Si KV no deja guardar, va el wa.me de la asesora sin texto (corto); sin ENLACE_CORTO_BASE, el dominio del Worker', async () => {
  const roto = { put: async () => { throw new Error('KV put() limit exceeded for the day.'); } };
  assert.equal(await enlaceCorto(roto, LARGO), 'https://wa.me/584145847791');
  assert.equal(await enlaceCorto(null, LARGO), 'https://wa.me/584145847791');
  assert.deepEqual((await enlacesCortos(roto, [{ url: LARGO }, { url: LARGO_2 }])).map((a) => a.url), [LINEA_1, LINEA_2]);
  config.ASISTENTE_URL = 'https://dekog-asistente.dekog-web.workers.dev';
  assert.match(await enlaceCorto(env.CONVERSACIONES, LARGO), /^https:\/\/dekog-asistente\.dekog-web\.workers\.dev\/a\/[A-Za-z0-9]{6}1$/);
});

test('dekog.net/a y /a/ (el enlace que Instagram cortó en la última «/») abren /links.html, que muestra las dos líneas', () => {
  const leer = (ruta) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8');
  const { rewrites } = JSON.parse(leer('vercel.json'));
  const comodin = rewrites.findIndex((r) => r.destination === '/index.html');
  for (const origen of ['/a', '/a/']) {
    const k = rewrites.findIndex((r) => r.source === origen);
    assert.ok(k >= 0 && k < comodin, `${origen} va antes del comodín`);
    assert.equal(rewrites[k].destination, '/links.html', origen);
  }
  // El código corto sigue siendo UN segmento (7 caracteres desde el 22-oct): /a/:codigo lo manda al Worker.
  assert.ok(rewrites.some((r) => r.source === '/a/:codigo' && r.destination.endsWith('/a/:codigo')));
  // Cada línea con su número a la vista, el mismo que dice el pase («Línea 2 (0424-400 6086)»).
  const html = leer('public/links.html');
  for (const l of Object.values(LINEAS)) {
    assert.ok(html.includes(`https://wa.me/${l.numero}?text=`), `falta el enlace de la ${l.etiqueta}`);
    assert.ok(html.includes(`>${l.etiqueta}<`) && html.includes(`>${l.visible}<`), `falta el número de la ${l.etiqueta}`);
  }
});
