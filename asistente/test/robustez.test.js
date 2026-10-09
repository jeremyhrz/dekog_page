// Lo que no puede fallar con clientes reales: KV agotado, reacciones y ediciones, audios, abusos, cupo mal escrito,
// avisos duplicados de Meta, pedidos sin Origin y textos armados para gastar CPU. IA: proveedor «prueba».
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SECRETO_WA, kvEnMemoria, metaFalso, entregar, avisoWa, textoWa, firmar } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { whatsappPost, cupoMensual } from '../src/canales/whatsapp.js';
import { eleccionDe, recortar } from '../src/canales/meta.js';
import { conservarNotas } from '../src/canales/memoria.js';
import { quitarNotas } from '../src/lib/vitrina.js';
import { montosInventados } from '../src/lib/catalogo.js';
import worker from '../src/worker.js';

let env;
let meta;
let escrituras;
beforeEach(() => {
  const kv = kvEnMemoria();
  const put = kv.put.bind(kv);
  escrituras = 0;
  kv.put = async (...a) => { escrituras += 1; return put(...a); };
  env = { CONVERSACIONES: kv };
  meta = metaFalso();
  globalThis.fetch = meta.fetchFalso;
});
afterEach(() => { delete config.WA_CUPO_MENSUAL; delete config.WA_TOPE_DIARIO; });

const alMeta = () => meta.enviados.filter((e) => e.url.endsWith('/PHONE123/messages'));
const mensajes = () => alMeta().filter((e) => e.cuerpo.type).map((e) => e.cuerpo);
const leidos = () => alMeta().filter((e) => e.cuerpo.status === 'read');
const wa = (msg, telefono) => entregar(whatsappPost, avisoWa(msg, telefono), SECRETO_WA, env);

test('Reacciones, ediciones, avisos del sistema y tipos nuevos: ni respuesta, ni «leído», ni cupo, ni escrituras', async () => {
  await wa({ type: 'reaction', reaction: { message_id: 'wamid.x', emoji: '👍' } });
  await wa({ type: 'unsupported', errors: [{ code: 131051 }] });
  await wa({ type: 'system', system: { body: 'cambió de número' } });
  await wa({ type: 'algo_nuevo' });
  assert.equal(alMeta().length, 0);
  assert.equal(escrituras, 0);
});

test('Nota de voz o foto: UN mensaje con el botón de la asesora (y se presenta si es lo primero que escribe)', async () => {
  await wa({ type: 'audio', audio: { id: 'a1' } });
  const [m] = mensajes();
  assert.equal(mensajes().length, 1);
  assert.equal(m.interactive.type, 'cta_url');
  assert.match(m.interactive.body.text, /asistente virtual de Dekog/);
  assert.match(m.interactive.action.parameters.url, /^https:\/\/wa\.me\/58414/);
});

test('Si KV no deja escribir (se acabaron las escrituras gratis del día), el cliente igual recibe su respuesta', async () => {
  env.CONVERSACIONES.put = async () => { throw new Error('KV put() limit exceeded for the day.'); };
  await wa(textoWa('Hola'));
  assert.equal(mensajes().length, 1);
});

test('El mismo aviso repetido por Meta solo se responde una vez', async () => {
  const aviso = avisoWa(textoWa('Hola'), '584140000009');
  await entregar(whatsappPost, aviso, SECRETO_WA, env);
  await entregar(whatsappPost, aviso, SECRETO_WA, env);
  assert.equal(mensajes().length, 1);
});

test('Tope por cliente y por día: 3 respuestas, UN aviso con la asesora y después silencio sin escrituras', async () => {
  config.WA_TOPE_DIARIO = '3';
  for (let i = 0; i < 4; i++) await wa(textoWa(`Hola ${i}`), '584140000002');
  assert.equal(mensajes().length, 4);
  assert.match(mensajes().at(-1).text.body, /escríbele directo a una asesora/);
  const antes = { meta: alMeta().length, kv: escrituras };
  await wa(textoWa('¿sigues ahí?'), '584140000002');
  assert.equal(alMeta().length, antes.meta);
  assert.equal(escrituras, antes.kv);
});

test('Cupo agotado: al cliente ya avisado no se le manda nada más (ni «escribiendo…») ni se escribe en KV', async () => {
  const mes = new Date().toISOString().slice(0, 7);
  await env.CONVERSACIONES.put(`wa:cupo:PHONE123:${mes}`, '990');
  await wa(textoWa('Hola'), '584140000003');
  assert.equal(mensajes().length, 1);
  const antes = { meta: alMeta().length, kv: escrituras };
  await wa(textoWa('¿hola?'), '584140000003');
  assert.equal(alMeta().length, antes.meta);
  assert.equal(leidos().length, 0);
  assert.equal(escrituras, antes.kv);
});

test('WA_CUPO_MENSUAL se lee bien aunque se escriba a mano: «1.000», «2,000», « 1000 », vacío, inválido y 0', () => {
  const con = (v) => { config.WA_CUPO_MENSUAL = v; return cupoMensual().cupo; };
  assert.equal(con('1.000'), 1000);
  assert.equal(con('2,000'), 2000);
  assert.equal(con(' 1000 '), 1000);
  assert.equal(con(''), 1000);
  assert.equal(con('abc'), 1000);
  assert.equal(con('0'), 0);
});

test('/chat y /datos sin Origin (un script) → 403; desde dekog.net se atienden', async () => {
  const pedir = (ruta, origen) => worker.fetch(new Request(`https://asistente.falso${ruta}`, {
    method: 'POST',
    headers: origen ? { Origin: origen, 'Content-Type': 'text/plain' } : { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ mensajes: [{ role: 'user', content: 'Hola' }] }),
  }), env, { waitUntil() {} });
  assert.equal((await pedir('/chat')).status, 403);
  assert.equal((await pedir('/datos')).status, 403);
  assert.equal((await pedir('/chat', 'https://evil.example')).status, 403);
  assert.equal((await pedir('/chat', 'https://www.dekog.net')).status, 200);
});

test('Un aviso firmado con otra clave no se procesa', async () => {
  const { crudo } = firmar(avisoWa(textoWa('Hola')), SECRETO_WA);
  const r = await whatsappPost(new Request('https://x/whatsapp', { method: 'POST', body: crudo, headers: { 'X-Hub-Signature-256': 'sha256=00' } }), env, { waitUntil() {} });
  assert.equal(r.status, 401);
  assert.equal(alMeta().length, 0);
});

test('Ids manipulados en las listas: «mas:constructor» o «mas:__proto__» no valen', () => {
  assert.equal(eleccionDe('mas:constructor'), null);
  assert.equal(eleccionDe('mas:__proto__'), null);
  assert.deepEqual(eleccionDe('mas:camas'), { tipo: 'mas', clave: 'camas' });
});

test('Recortar no parte un emoji en dos', () => {
  const r = recortar(`${'a'.repeat(8)}😀😀😀`, 10);
  assert.ok(!/[\uD800-\uDBFF]…$/.test(r), r);
});

test('Textos armados para gastar CPU (miles de espacios) se procesan rápido', () => {
  const malo = `${' '.repeat(100000)}x`;
  const t0 = performance.now();
  quitarNotas(`${malo}[Vitrina «Camas»: Toronto`);
  quitarNotas(malo);
  assert.ok(performance.now() - t0 < 50, 'quitarNotas tardó demasiado');
});

test('Al recortar el historial a 16 mensajes, las notas de vitrina viejas no se pierden', () => {
  const historial = [{ role: 'user', content: 'quiero ver camas' }, { role: 'assistant', content: 'Mira 👇\n\n[Vitrina «Camas»: Toronto, Milan]' }];
  for (let i = 0; i < 20; i++) historial.push({ role: i % 2 ? 'assistant' : 'user', content: `mensaje ${i}` });
  const quedan = conservarNotas(historial, 16);
  assert.equal(quedan.length, 16);
  assert.ok(quedan.some((m) => m.content.includes('[Vitrina «Camas»: Toronto, Milan]')));
});

test('Porcentajes: el 50 % del anticipo vale; un 50 % de descuento o de inicial de Cashea no', () => {
  assert.deepEqual(montosInventados('Con el 50 % de anticipo empezamos a fabricar tu cama.'), []);
  assert.deepEqual(montosInventados('Hoy tenemos 50 % de descuento.'), ['50 %']);
  assert.deepEqual(montosInventados('Con Cashea pagas un 50 % de inicial.'), ['50 %']);
});

test('Primer mensaje que es solo un saludo: el saludo de la dueña, tal cual y sin IA; con pregunta, responde la IA', async () => {
  const { pensar, esSoloSaludo } = await import('../src/chat.js');
  const { saludoInicial } = await import('../src/lib/negocio.js');
  for (const t of ['hola', 'Hola!', 'buenas tardes', 'Hola, buenas noches 👋', '¡Hola! ¿cómo estás?', 'holaaa', 'Buenos días Dekog']) {
    assert.ok(esSoloSaludo(t), t);
  }
  for (const t of ['hola, ¿cuánto cuesta la Toronto?', 'quiero ver camas', 'buenas, tienen sofás?', 'precio', '']) {
    assert.ok(!esSoloSaludo(t), t);
  }
  const r = await pensar([{ role: 'user', content: 'Hola' }], 'web');
  assert.equal(r.respuesta, saludoInicial);
  // El segundo «hola» de la misma conversación ya no es el primer mensaje: lo responde la IA.
  const r2 = await pensar([{ role: 'user', content: 'hola' }, { role: 'assistant', content: saludoInicial }, { role: 'user', content: 'hola' }], 'web');
  assert.notEqual(r2.respuesta, saludoInicial);
});

test('WhatsApp: «hola» como primer mensaje → el saludo de la dueña, sin el «Soy el asistente virtual» repetido', async () => {
  const { saludoWhatsapp } = await import('../src/lib/negocio.js');
  await wa(textoWa('hola'), '584140000077');
  const [m] = mensajes();
  assert.equal(m.text?.body ?? m.interactive?.body?.text, saludoWhatsapp);
  assert.match(saludoWhatsapp, /\*DEKOG\*/);
  assert.ok(!/comedores/.test(saludoWhatsapp));
  // Responde «3» al saludo (guardado con el formato de WhatsApp): se entiende como hablar con una asesora.
  const { conOpcionDelSaludo } = await import('../src/chat.js');
  const { opcionesDelSaludo } = await import('../src/lib/negocio.js');
  const h = conOpcionDelSaludo([{ role: 'user', content: 'hola' }, { role: 'assistant', content: saludoWhatsapp }, { role: 'user', content: '3' }]);
  assert.equal(h.at(-1).content, opcionesDelSaludo[3]);
});

test('Responder al saludo con el número de una opción: «3» → hablar con una asesora; «2️⃣», «la 1», «dos» también', async () => {
  const { conOpcionDelSaludo } = await import('../src/chat.js');
  const { saludoInicial, opcionesDelSaludo } = await import('../src/lib/negocio.js');
  const con = (t) => conOpcionDelSaludo([{ role: 'user', content: 'hola' }, { role: 'assistant', content: saludoInicial }, { role: 'user', content: t }]).at(-1).content;
  assert.equal(con('3'), opcionesDelSaludo[3]);
  assert.equal(con('2️⃣'), opcionesDelSaludo[2]);
  assert.equal(con('la 1'), opcionesDelSaludo[1]);
  assert.equal(con('dos'), opcionesDelSaludo[2]);
  assert.equal(con('Opción 3.'), opcionesDelSaludo[3]);
  assert.equal(con('3 camas queen'), '3 camas queen'); // no es solo el número: se deja como está
  // Sin el saludo justo antes, un «2» es solo un «2» (por ejemplo, la cantidad que quiere).
  const sinSaludo = conOpcionDelSaludo([{ role: 'user', content: 'quiero la toronto' }, { role: 'assistant', content: '¿Cuántas?' }, { role: 'user', content: '2' }]);
  assert.equal(sinSaludo.at(-1).content, '2');
});

test('Sin tarjeta no se promete «te lo muestro abajo en bolívares»; el resto del mensaje queda igual', async () => {
  const { sinBolivaresAbajo } = await import('../src/chat.js');
  assert.equal(
    sinBolivaresAbajo('La fabricación toma unos 15 días hábiles ✨. Te lo muestro abajo en bolívares a la tasa BCV del euro de hoy.'),
    'La fabricación toma unos 15 días hábiles ✨.',
  );
  assert.equal(
    sinBolivaresAbajo('Sí, aceptamos Zelle. Te lo muestro abajo en bolívares a la tasa BCV del euro de hoy. 💳✨\n\n¿Algo más?'),
    'Sí, aceptamos Zelle. 💳✨\n\n¿Algo más?',
  );
  // Con tarjeta, la afirmación se queda y la pregunta se va (la tarjeta llega sola).
  assert.equal(
    sinBolivaresAbajo('La Toronto Queen cuesta REF 550. Te lo muestro abajo en bolívares a la tasa BCV del euro de hoy.', { soloPreguntas: true }),
    'La Toronto Queen cuesta REF 550. Te lo muestro abajo en bolívares a la tasa BCV del euro de hoy.',
  );
  assert.equal(
    sinBolivaresAbajo('Una asesora te confirma la disponibilidad. ¿Te lo muestro abajo en bolívares a la tasa BCV del euro de hoy?', { soloPreguntas: true }),
    'Una asesora te confirma la disponibilidad.',
  );
  // «Abajo» sin bolívares (el formulario) se queda.
  assert.equal(sinBolivaresAbajo('Déjanos tus datos en el formulario de abajo.'), 'Déjanos tus datos en el formulario de abajo.');
  const t0 = performance.now();
  sinBolivaresAbajo(`${'a '.repeat(2000)}abajo bolívares`);
  assert.ok(performance.now() - t0 < 20);
});

test('Web con el saludo ya mostrado (saludado): «2» es la opción 2 y «hola» no repite el saludo', async () => {
  const { pensar } = await import('../src/chat.js');
  const { saludoInicial } = await import('../src/lib/negocio.js');
  const r = await pensar([{ role: 'user', content: 'hola' }], 'web', { yaSaludo: true });
  assert.notEqual(r.respuesta, saludoInicial);
  const { conOpcionDelSaludo } = await import('../src/chat.js');
  // Lo que pensar() le pasa a la IA con yaSaludo: el «2» ya convertido y sin el saludo delante.
  const visto = conOpcionDelSaludo([{ role: 'assistant', content: saludoInicial }, { role: 'user', content: '2' }]).slice(1);
  assert.equal(visto.length, 1);
  assert.match(visto[0].content, /mobiliario a medida/);
  assert.ok(!/camas/.test(visto[0].content), 'la opción 2 no debe empujar a mostrar camas');
});
