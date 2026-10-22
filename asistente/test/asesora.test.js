// Instagram con una asesora en el mismo chat (21-oct): cuando ella escribe desde la cuenta de Dekog, el asistente se
// calla en ese chat; si el cliente espera 1 hora sin respuesta, se le piden sus datos y, al dejarlos, van a la hoja.
// El orden importa: la primera prueba es ANTES de que Instagram devuelva la marca invisible (estado del módulo), y la
// última apaga la pausa. IA: proveedor «prueba». Fetch falso: no sale nada a internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SECRETO_IG, kvEnMemoria, metaFalso, entregar, avisoIg } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { instagramPost, seguimientosInstagram, esCierre, MARCA } from '../src/canales/instagram.js';
import worker from '../src/worker.js';

const HOJA = { HOJA_URL: 'https://hoja.falsa', HOJA_SECRETO: 'clave-hoja' };
const HORA = 60 * 60 * 1000;
let env;
let meta;
let filasHoja;
function usar(opciones) {
  meta = metaFalso(opciones);
  filasHoja = [];
  globalThis.fetch = async (url, o) => {
    if (String(url).startsWith('https://hoja.falsa')) {
      filasHoja.push(JSON.parse(o.body));
      return new Response(JSON.stringify({ ok: true }));
    }
    return meta.fetchFalso(url, o);
  };
}
beforeEach(() => { env = { CONVERSACIONES: kvEnMemoria() }; usar(); Object.assign(config, HOJA); });
afterEach(() => { for (const clave of Object.keys(HOJA)) delete config[clave]; });

const textosIg = () => meta.enviados.filter((e) => e.url.endsWith('/me/messages') && e.cuerpo.message.text).map((e) => e.cuerpo.message.text);
const textosA = (igsid) => meta.enviados.filter((e) => e.cuerpo?.recipient?.id === igsid && e.cuerpo.message.text).map((e) => e.cuerpo.message.text);
const ig = (msg, igsid = 'IGSID1') => entregar(instagramPost, avisoIg(msg, igsid), SECRETO_IG, env);
const estado = (igsid = 'IGSID1') => JSON.parse(env.CONVERSACIONES.datos.get(`ig:${igsid}`) ?? 'null');
let n = 0;
/**
 * Un mensaje que salió desde la cuenta de Dekog (eco): una asesora escribiendo en la app, o una respuesta del asistente.
 * `mid` y `timestamp` (ms), para repetir un eco o mandarlo atrasado; si no, uno nuevo con la hora fija de las pruebas.
 */
function eco(texto, igsid = 'IGSID1', { mid, timestamp = 1790700000 } = {}) {
  n += 1;
  const aviso = { object: 'instagram', entry: [{ id: 'IGDEKOG', time: 1790700000, messaging: [{
    sender: { id: 'IGDEKOG' }, recipient: { id: igsid }, timestamp, message: { mid: mid ?? `mid.eco.${n}`, text: texto, is_echo: true },
  }] }] };
  return entregar(instagramPost, aviso, SECRETO_IG, env);
}
/** La asesora escribe, el cliente pregunta y pasa 1 hora: le llega el pedido de datos. */
async function pedidoDeDatos(igsid = 'IGSID1') {
  await ig({ text: 'Hola' }, igsid);
  await eco('Hola, te atiende Carla', igsid);
  await ig({ text: '¿Tienen la Manila en queen?' }, igsid);
  await retroceder(61 * 60 * 1000, igsid);
  await seguimientosInstagram(env);
  assert.match(textosA(igsid).at(-1), /tu nombre y tu número de WhatsApp/);
}
/** Cuándo está programado el seguimiento de ese cliente (su clave ig:seg:<igsid>), o undefined. */
const seguimientoDe = (igsid = 'IGSID1') => env.CONVERSACIONES.metadatos.get(`ig:seg:${igsid}`)?.cuando;
/**
 * El id de una fila de la hoja sin la fecha («ig-IGSID1-espera»). La hoja (scripts/hoja-clientes.gs) manda un correo por
 * cada id NUEVO; con uno que ya existe, solo actualiza la fila y pisa lo que llegue con valor (el nombre, el resumen).
 */
const sinFecha = (fila) => fila.id.replace(/-\d{4}-\d{2}-\d{2}$/, '');
/** Mueve hacia atrás los tiempos de la conversación (y su seguimiento programado), como si hubieran pasado `ms`. */
async function retroceder(ms, igsid = 'IGSID1') {
  const e = estado(igsid);
  for (const campo of ['humano', 'esperaDesde', 'seguimiento', 'numeroTomado', 'datosTomados']) if (e[campo]) e[campo] -= ms;
  await env.CONVERSACIONES.put(`ig:${igsid}`, JSON.stringify(e));
  const cuando = seguimientoDe(igsid);
  if (cuando) await env.CONVERSACIONES.put(`ig:seg:${igsid}`, String(cuando - ms), { metadata: { cuando: cuando - ms } });
}

test('Antes de comprobar la marca invisible, un mensaje desde la cuenta de Dekog no calla al asistente', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, te atiende Carla de Dekog');
  await ig({ text: '¿Cuánto es la Toronto queen?' });
  assert.equal(textosIg().length, 2);
  assert.equal(estado().humano, 0);
});

test('Cada texto del asistente lleva la marca invisible al final; su eco la confirma (ig:marca) y no calla a nadie', async () => {
  await ig({ text: 'Hola' });
  const [texto] = textosIg();
  assert.ok(texto.endsWith(MARCA));
  assert.ok(!texto.slice(0, -1).includes(MARCA));
  await eco(texto);
  assert.ok(env.CONVERSACIONES.datos.get('ig:marca'));
  assert.equal(estado().humano, 0);
});

test('La asesora escribe → el asistente se calla en ESE chat (en otro sigue); lo que ella dijo queda sin datos personales', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, soy Carla 😊 Mi número es 0414-555-0000, escríbeme');
  assert.ok(estado().humano > 0);
  assert.equal(estado().mensajes.at(-1).role, 'assistant');
  assert.match(estado().mensajes.at(-1).content, /\[dato personal\]/);
  const antes = textosIg().length;
  await ig({ text: '¿Cuánto es la Toronto queen?' });
  assert.equal(textosIg().length, antes); // silencio en este chat
  assert.ok(estado().esperaDesde > estado().humano);
  assert.ok(seguimientoDe() > Date.now());
  await ig({ text: 'Hola' }, 'IGSID9');
  assert.equal(textosIg().length, antes + 1); // otro cliente: el asistente responde
});

test('1 hora esperando a la asesora → UN mensaje pidiendo sus datos; al dejarlos van a la hoja y se le confirma una vez', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, te atiende Carla');
  await ig({ text: '¿Tienen la Manila en queen?' });
  const antes = textosIg().length;
  await seguimientosInstagram(env); // aún no pasa la hora
  assert.equal(textosIg().length, antes);

  await retroceder(61 * 60 * 1000);
  await seguimientosInstagram(env);
  const pedido = textosIg().at(-1);
  assert.match(pedido, /Disculpa la espera.*tu nombre y tu número de WhatsApp/s);
  assert.ok(pedido.endsWith(MARCA)); // su eco no se confunde con la asesora
  assert.ok(estado().seguimiento > 0);
  assert.equal(env.CONVERSACIONES.datos.has('ig:seg:IGSID1'), false);
  await seguimientosInstagram(env);
  assert.equal(textosIg().length, antes + 1); // una sola vez

  await ig({ text: 'María Pérez 0414-555-1234' });
  assert.equal(filasHoja.length, 1);
  assert.match(filasHoja[0].id, /^ig-IGSID1-espera-\d{4}-\d{2}-\d{2}$/); // fila nueva: la hoja manda el correo
  assert.equal(filasHoja[0].canal, 'Instagram');
  assert.equal(filasHoja[0].telefono, '04145551234');
  assert.equal(filasHoja[0].nombre, 'María Pérez · @cliente (Cliente)');
  assert.match(filasHoja[0].resumen, /Esperó más de 1 hora a la asesora en Instagram/);
  assert.match(textosIg().at(-1), /^¡Gracias! 💛 Ya le pasé tus datos/);
  await ig({ text: 'Mi otro número es 0424-000-1111' });
  assert.equal(filasHoja.length, 1);
  assert.equal(textosIg().length, antes + 2);
});

test('Si la asesora responde antes de la hora, no se le piden datos', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, te atiende Carla');
  await ig({ text: '¿Hacen envíos a Maracay?' });
  await eco('Sí, enviamos a todo el país');
  await retroceder(2 * HORA);
  const antes = textosIg().length;
  await seguimientosInstagram(env);
  assert.equal(textosIg().length, antes);
});

test('24 horas después del último mensaje de la asesora, el asistente vuelve a responder en ese chat', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, te atiende Carla');
  await retroceder(25 * HORA);
  const antes = textosIg().length;
  await ig({ text: '¿Cuánto es la Toronto queen?' });
  assert.equal(textosIg().length, antes + 1);
});

test('La tarea de cada 15 minutos es la de los seguimientos de Instagram', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, te atiende Carla');
  await ig({ text: '¿Me ayudas?' });
  await retroceder(61 * 60 * 1000);
  const pendientes = [];
  await worker.scheduled({ cron: '*/15 * * * *' }, env, { waitUntil: (p) => pendientes.push(p) });
  await Promise.all(pendientes);
  assert.match(textosIg().at(-1), /Disculpa la espera/);
});

// ── Cuándo empieza la espera y qué se le pide (22-oct) ──────────────────────────────────────────────────────────────

/**
 * La IA (un Gemini falso) tarda: mientras «piensa» pasa `durante()` (la asesora contesta) y después responde la Toronto
 * Queen. Al terminar se vuelve a la IA de prueba.
 */
async function conIaLenta(durante, fn) {
  const fetchMeta = globalThis.fetch;
  const salida = {
    respuesta: 'La Toronto Queen (1,60 x 1,90 m) está en REF 550.', productos: [{ id: 48, talla: 'Queen 1,60x1,90 M' }],
    derivar: { necesario: false, area: 'home', resumen: '' }, ofrecer_formulario: false,
  };
  globalThis.fetch = async (url, o) => {
    if (!String(url).includes('generativelanguage.googleapis.com')) return fetchMeta(url, o);
    await durante();
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(salida) }] } }] }));
  };
  Object.assign(config, { ASISTENTE_PROVEEDOR: '', GEMINI_API_KEY: 'clave-falsa' });
  try {
    await fn();
  } finally {
    globalThis.fetch = fetchMeta;
    config.ASISTENTE_PROVEEDOR = 'prueba';
    delete config.GEMINI_API_KEY;
  }
}

test('esCierre: «gracias», «ok», «listo, dale», «a la orden» o un emoji suelto no piden respuesta; una pregunta sí', () => {
  for (const t of ['¡Muchas gracias! 🙌', 'ok', 'Listo, dale', 'Perfecto, a la orden', '👍', 'Excelente, muy amable 🙏']) assert.ok(esCierre(t), t);
  for (const t of ['?', 'Gracias, ¿y el envío?', 'ok, la quiero en queen', '2', 'Hola']) assert.ok(!esCierre(t), t);
});

test('esCierre: las despedidas de verdad («Está bien, gracias», «Chao», «Graciasss»); «sí», un saludo o un pedido, no', () => {
  for (const t of [
    'Está bien, gracias', 'Gracias bella, quedo atenta', 'Chao, gracias', 'Feliz día', 'Graciasss', 'Okkk', 'Okis',
    'Sí, gracias', 'No, gracias', 'Ok, quedo atenta', 'Amén, Dios te bendiga', 'Gracias a ti', 'Gracias mi amor',
    'Gracias por la información', 'Ah ok', 'Jajaja ok', 'Dale pues', 'Gracias, buenas noches', 'Hasta luego',
    'Muchas gracias por la información, feliz resto de día',
  ]) assert.ok(esCierre(t), t);
  for (const t of [
    'Sí, ¿y el envío?', 'Sí', 'No', 'Sí, dale', 'Sí, por favor', 'Buenas tardes', 'Buen día', 'Holaaa', 'La info', 'Ya va',
    'Por la tarde', 'Quedo atenta a la foto', 'Está bien, mándame la foto', 'Gracias, cuánto es la queen',
  ]) assert.ok(!esCierre(t), t);
});

test('La asesora cierra y el cliente da las gracias o manda un sticker: no queda esperando; con una nota de voz, sí', async () => {
  await ig({ text: 'Hola' });
  await eco('Listo, ya te aparté la tuya, mañana te escribo 😊');
  await ig({ text: '¡Muchas gracias! 🙌' });
  await ig({ attachments: [{ type: 'image', payload: { url: 'https://cdn.falso/sticker.gif' } }] }); // no se pudo abrir
  assert.equal(seguimientoDe(), undefined);
  await retroceder(61 * 60 * 1000);
  const antes = textosIg().length;
  await seguimientosInstagram(env);
  assert.equal(textosIg().length, antes); // sin «Disculpa la espera»
  await ig({ attachments: [{ type: 'audio', payload: { url: 'https://cdn.falso/a.mp4' } }] });
  assert.ok(seguimientoDe() > Date.now());
});

test('Si la pausa vence y el asistente ya le respondió, a la hora no le llega «Disculpa la espera»', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, te atiende Carla');
  await retroceder(23.5 * HORA);
  await ig({ text: '¿Tienen la Manila en queen?' }); // todavía en pausa: queda esperando
  assert.ok(seguimientoDe() > Date.now());
  await retroceder(36 * 60 * 1000); // vence la pausa
  const antes = textosIg().length;
  await ig({ text: '¿Hola?' });
  assert.ok(textosIg().length > antes); // le responde el asistente
  await retroceder(30 * 60 * 1000); // y se cumple la hora de esa espera
  const despues = textosIg().length;
  await seguimientosInstagram(env);
  assert.equal(textosIg().length, despues);
  assert.equal(env.CONVERSACIONES.datos.has('ig:seg:IGSID1'), false);
});

test('Deja su WhatsApp antes de la hora: va a la hoja ya, sin decir que esperó 1 hora, y no se le vuelve a pedir', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, te atiende Carla');
  const antes = textosIg().length;
  await ig({ text: 'La Toronto queen. Me llamo Ana, mi WhatsApp es 0414-555-1234, escríbeme por ahí' });
  assert.equal(filasHoja.length, 1);
  assert.match(filasHoja[0].id, /^ig-IGSID1-espera-\d{4}-\d{2}-\d{2}$/);
  assert.equal(filasHoja[0].telefono, '04145551234');
  assert.match(filasHoja[0].resumen, /Dejó su WhatsApp mientras esperaba a la asesora en Instagram/);
  assert.doesNotMatch(filasHoja[0].resumen, /más de 1 hora/);
  assert.equal(textosIg().length, antes); // el chat sigue siendo de la asesora: sin «¡Gracias!»
  await retroceder(61 * 60 * 1000);
  await seguimientosInstagram(env);
  assert.match(textosIg().at(-1), /Disculpa la espera.*Ya tienen tu número/s);
  assert.doesNotMatch(textosIg().at(-1), /déjame/);
  assert.equal(filasHoja.length, 1);
});

test('Ya dejó su número en una espera anterior: en la siguiente solo se le pide disculpas', async () => {
  await pedidoDeDatos();
  await ig({ text: 'María Pérez 0414-555-1234' });
  assert.equal(filasHoja.length, 1);
  await eco('¡Hola María! Sí la tenemos, ya te escribo por WhatsApp');
  await ig({ text: '¿Y la tienen en matrimonial?' });
  await retroceder(61 * 60 * 1000);
  const antes = textosIg().length;
  await seguimientosInstagram(env);
  assert.equal(textosIg().length, antes + 1);
  assert.match(textosIg().at(-1), /Ya tienen tu número/);
  assert.doesNotMatch(textosIg().at(-1), /tu nombre y tu número/);
});

test('«Soy de Maracay, ¿…?» no es su nombre: ni fila ni «¡Gracias!», y el número que manda después sí llega', async () => {
  await pedidoDeDatos();
  const antes = textosIg().length;
  await ig({ text: 'Soy de Maracay, ¿cuánto sale el envío?' });
  assert.equal(filasHoja.length, 0);
  assert.equal(textosIg().length, antes);
  await ig({ text: '0414-555-1234' });
  assert.equal(filasHoja.length, 1);
  assert.equal(filasHoja[0].telefono, '04145551234');
  assert.match(filasHoja[0].resumen, /Esperó más de 1 hora a la asesora en Instagram/);
  assert.match(textosIg().at(-1), /^¡Gracias! 💛 Ya le pasé tus datos/);
});

test('El nombre en un mensaje y el número en otro: se le pide el número y, cuando llega, va a la hoja y se le agradece', async () => {
  await pedidoDeDatos();
  await ig({ text: 'Soy María' });
  assert.equal(filasHoja.length, 0);
  assert.match(textosIg().at(-1), /^¡Gracias! 💛 ¿Me dejas también tu número de WhatsApp\?/);
  await ig({ text: '0414-555-1234' });
  assert.equal(filasHoja.length, 1);
  assert.equal(filasHoja[0].telefono, '04145551234');
  assert.match(filasHoja[0].nombre, /@cliente/);
  assert.match(textosIg().at(-1), /^¡Gracias! 💛 Ya le pasé tus datos/);
});

test('Mientras la tarea le escribe a un cliente, otro empieza a esperar: su seguimiento no se pierde', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, te atiende Carla');
  await ig({ text: '¿Tienen la Manila en queen?' });
  await retroceder(61 * 60 * 1000);
  await ig({ text: 'Hola' }, 'IGSID2');
  await eco('Hola, te atiende Carla', 'IGSID2');
  // Instagram tarda en aceptar el pedido de datos de IGSID1 y en ese rato IGSID2 le escribe a la asesora.
  const fetchMeta = globalThis.fetch;
  globalThis.fetch = async (url, o) => {
    if (/Disculpa la espera/.test(o?.body ?? '')) await ig({ text: '¿Hacen envíos a Maracay?' }, 'IGSID2');
    return fetchMeta(url, o);
  };
  try {
    await seguimientosInstagram(env);
  } finally {
    globalThis.fetch = fetchMeta;
  }
  assert.match(textosA('IGSID1').at(-1), /Disculpa la espera/);
  assert.equal(env.CONVERSACIONES.datos.has('ig:seg:IGSID1'), false);
  assert.ok(seguimientoDe('IGSID2') > Date.now(), 'se perdió el seguimiento de IGSID2');
  await retroceder(61 * 60 * 1000, 'IGSID2');
  await seguimientosInstagram(env);
  assert.match(textosA('IGSID2').at(-1), /Disculpa la espera/);
});

test('Si el cliente empieza otra espera mientras la tarea revisa la anterior, la clave nueva no se borra', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, te atiende Carla');
  await ig({ text: '¿Tienen la Manila en queen?' });
  await eco('Sí, la tenemos en queen'); // le respondió antes de la hora: esa espera ya no cuenta
  await retroceder(61 * 60 * 1000);
  // Justo después de que la tarea lee la conversación, el cliente vuelve a preguntar (otra espera, otra hora).
  const leer = env.CONVERSACIONES.get;
  let primera = true;
  env.CONVERSACIONES.get = async (clave, tipo) => {
    const valor = await leer(clave, tipo);
    if (clave === 'ig:IGSID1' && primera) {
      primera = false;
      await ig({ text: '¿Y la tienen en matrimonial?' });
    }
    return valor;
  };
  const antes = textosIg().length;
  await seguimientosInstagram(env);
  env.CONVERSACIONES.get = leer;
  assert.equal(textosIg().length, antes);
  assert.ok(seguimientoDe() > Date.now(), 'la tarea borró el seguimiento de la espera nueva');
});

test('Las esperas que quedaron en ig:seguimientos (la lista de antes del 22-oct) pasan a su clave y se atienden', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, te atiende Carla');
  await ig({ text: '¿Tienen la Manila en queen?' });
  await retroceder(61 * 60 * 1000);
  // Como las dejó la versión anterior: todas en una sola clave.
  const enMediaHora = Date.now() + 30 * 60 * 1000;
  await env.CONVERSACIONES.delete('ig:seg:IGSID1');
  await env.CONVERSACIONES.put('ig:seguimientos', JSON.stringify({ IGSID1: Date.now() - 60 * 1000, IGSID9: enMediaHora }));
  await seguimientosInstagram(env);
  assert.match(textosA('IGSID1').at(-1), /Disculpa la espera/);
  assert.equal(env.CONVERSACIONES.datos.has('ig:seguimientos'), false);
  assert.equal(seguimientoDe('IGSID9'), enMediaHora);
});

test('Si la asesora contesta mientras la IA piensa, el asistente no manda nada (ni foto, ni texto, ni promo)', async () => {
  await ig({ text: 'Hola' }, 'IGSID3');
  const antes = meta.enviados.length;
  await conIaLenta(() => eco('Hola! Te atiende Carla, ya te paso el precio', 'IGSID3'), () => ig({ text: '¿Cuánto es la Toronto queen?' }, 'IGSID3'));
  assert.equal(meta.enviados.length, antes);
  const e = estado('IGSID3');
  assert.ok(e.humano > 0);
  assert.ok(e.mensajes.some((m) => m.content === '¿Cuánto es la Toronto queen?')); // su mensaje queda en la memoria
  assert.equal(seguimientoDe('IGSID3'), undefined); // ella ya contestó: no hay espera
});

test('Un eco repetido de la asesora (mismo mid) no duplica su texto ni le quita la espera al cliente', async () => {
  await ig({ text: 'Hola' });
  await eco('¿Qué medida buscas?', 'IGSID1', { mid: 'mid.eco.medida' });
  await ig({ text: 'Queen. ¿Y cuánto tarda la fabricación?' });
  await eco('¿Qué medida buscas?', 'IGSID1', { mid: 'mid.eco.medida' });
  assert.equal(estado().mensajes.filter((m) => m.content === '¿Qué medida buscas?').length, 1);
  assert.ok(estado().esperaDesde > estado().humano);
  // Si el repetido cae en otra instancia (que no lo tiene en su memoria), lo frena la memoria de la conversación.
  const e = estado();
  e.procesados.push('mid.eco.otra-instancia');
  await env.CONVERSACIONES.put('ig:IGSID1', JSON.stringify(e));
  await eco('Ya te paso el precio', 'IGSID1', { mid: 'mid.eco.otra-instancia' });
  assert.ok(estado().esperaDesde > estado().humano);
  assert.ok(!estado().mensajes.some((m) => m.content === 'Ya te paso el precio'));
  await retroceder(61 * 60 * 1000);
  await seguimientosInstagram(env);
  assert.match(textosIg().at(-1), /Disculpa la espera/);
});

test('Un eco atrasado (con la hora de Meta, de antes de la pregunta del cliente) no da por respondida la espera', async () => {
  await ig({ text: 'Hola' });
  await eco('Hola, te atiende Carla');
  await ig({ text: '¿Tienen la Manila en queen?' });
  // Lo que ella escribió 2 s ANTES de esa pregunta llega recién ahora.
  await eco('Ya te reviso', 'IGSID1', { timestamp: estado().esperaDesde - 2000 });
  assert.ok(estado().esperaDesde > estado().humano);
  // Uno de después de la pregunta (1 s después) sí la responde.
  await eco('Sí, la tenemos', 'IGSID1', { timestamp: estado().esperaDesde + 1000 });
  assert.ok(!(estado().esperaDesde > estado().humano));
});

// ── La despedida, el número que pidió la asesora y la promesa «Ya tienen tu número» (revisión del 22-oct) ──────────────

test('La asesora cierra y el cliente se despide («Está bien, gracias», «Gracias bella, quedo atenta»): a la hora, nada', async () => {
  for (const [igsid, despedida] of [['IGSID1', 'Está bien, gracias'], ['IGSID2', 'Gracias bella, quedo atenta'], ['IGSID3', 'Chao, gracias 🙏']]) {
    await ig({ text: 'Hola' }, igsid);
    await eco('Listo, ya te aparté la tuya. Mañana te escribo para coordinar la entrega', igsid);
    await ig({ text: despedida }, igsid);
    assert.equal(seguimientoDe(igsid), undefined, despedida);
    await retroceder(61 * 60 * 1000, igsid);
  }
  const antes = textosIg().length;
  await seguimientosInstagram(env);
  assert.equal(textosIg().length, antes); // sin «Disculpa la espera»
});

test('La asesora le pide el número y se lo da: va a la hoja sin decir que espera y a la hora no le llega nada', async () => {
  for (const [igsid, respuesta] of [['IGSID1', '04145551234'], ['IGSID2', 'Ana Pérez 0414-555-1234'], ['IGSID3', 'Sí, mi número es 0414-555-1234, gracias 🙏']]) {
    await ig({ text: 'Hola, ¿tienen la Toronto en queen?' }, igsid);
    await eco('¡Hola! Sí la tenemos. ¿Me pasas tu número y te escribo por WhatsApp con los detalles?', igsid);
    await ig({ text: respuesta }, igsid);
    assert.equal(seguimientoDe(igsid), undefined, respuesta); // no queda esperando
    await retroceder(61 * 60 * 1000, igsid);
  }
  assert.deepEqual(filasHoja.map((f) => f.telefono), ['04145551234', '04145551234', '04145551234']);
  for (const fila of filasHoja) {
    assert.match(fila.id, /^ig-IGSID\d-espera-\d{4}-\d{2}-\d{2}$/);
    assert.match(fila.resumen, /^Dejó su WhatsApp en el chat con la asesora de Instagram/);
    assert.doesNotMatch(fila.resumen, /esperaba|Esperó|escríbele/);
  }
  assert.equal(filasHoja[1].nombre, 'Ana Pérez · @cliente (Cliente)');
  const antes = textosIg().length;
  await seguimientosInstagram(env);
  assert.equal(textosIg().length, antes); // sin «Disculpa la espera»
  // Con el número y una pregunta, sí queda esperando.
  await ig({ text: 'Hola' }, 'IGSID4');
  await eco('¿Me pasas tu número?', 'IGSID4');
  await ig({ text: '0414-555-1234. ¿Y cuánto sale el envío a Maracay?' }, 'IGSID4');
  assert.ok(seguimientoDe('IGSID4') > Date.now());
  assert.match(filasHoja.at(-1).resumen, /^Dejó su WhatsApp mientras esperaba a la asesora en Instagram: escríbele/);
});

test('Con la asesora, el número de una línea de Dekog no es el suyo: ni fila ni «Ya tienen tu número»; a la hora se le pide', async () => {
  // Como sale en el pase y como lo publica la web (22-oct: «+58 424 400 6086» quedaba como su número «+58424400»).
  for (const [igsid, numero] of [['IGSID1', '0424-400 6086'], ['IGSID2', '+58 424 400 6086']]) {
    await ig({ text: 'Hola' }, igsid);
    await eco('Hola, te atiende Carla', igsid);
    await ig({ text: `Ya le escribí al ${numero} y nadie me contesta, ¿me ayudas?` }, igsid);
    assert.equal(filasHoja.length, 0, numero);
    assert.equal(estado(igsid).numeroTomado, 0, numero); // no cierra la captura
    await retroceder(61 * 60 * 1000, igsid);
  }
  await seguimientosInstagram(env);
  for (const igsid of ['IGSID1', 'IGSID2']) {
    assert.match(textosA(igsid).at(-1), /tu nombre y tu número de WhatsApp/);
    await ig({ text: 'Ana Pérez 0412-111-2233' }, igsid);
  }
  assert.deepEqual(filasHoja.map((f) => [sinFecha(f), f.telefono]),
    [['ig-IGSID1-espera', '04121112233'], ['ig-IGSID2-espera', '04121112233']]);
});

test('Ya le había dejado su número al asistente: a la hora, la disculpa y una fila nueva de la espera, que llega por correo', async () => {
  await ig({ text: 'Quiero comprar la Toronto queen. Mi WhatsApp es 0414-555-1234' });
  assert.deepEqual(filasHoja.map((f) => f.id), ['ig-IGSID1']);
  await eco('¿La quieres con box liso?');
  await ig({ text: 'Sí, con el liso. ¿Y cuánto tarda la fabricación?' });
  await retroceder(61 * 60 * 1000);
  await seguimientosInstagram(env);
  assert.match(textosIg().at(-1), /Disculpa la espera.*Ya tienen tu número/s);
  assert.equal(filasHoja.length, 2);
  const aviso = filasHoja[1];
  assert.match(aviso.id, /^ig-IGSID1-aviso-\d{4}-\d{2}-\d{2}$/); // fila nueva: la hoja manda el correo
  assert.equal(aviso.telefono, ''); // en KV no está su número, solo la huella
  assert.match(aviso.nombre, /@cliente \(Cliente\)$/);
  assert.match(aviso.resumen, /Esperó más de 1 hora a la asesora en Instagram y ya había dejado su WhatsApp \(termina en 1234\)/);
  await seguimientosInstagram(env);
  assert.equal(filasHoja.length, 2); // una vez por espera
});

test('Dejó su número en una espera de otro día: la disculpa y el aviso de hoy; si deja otro, va en su fila de la espera', async () => {
  const hace3Dias = Date.now() - 72 * HORA;
  await env.CONVERSACIONES.put('ig:IGSID1', JSON.stringify({
    mensajes: [], humano: hace3Dias, esperaDesde: hace3Dias + 1, seguimiento: hace3Dias + HORA, numeroTomado: hace3Dias + 2 * HORA,
  }));
  await eco('¡Hola María! ¿Te la mando en gris?');
  await ig({ text: '¿Y cuándo me la entregan?' });
  await retroceder(61 * 60 * 1000);
  await seguimientosInstagram(env);
  assert.match(textosIg().at(-1), /Ya tienen tu número/);
  assert.equal(filasHoja.length, 1);
  assert.match(filasHoja[0].id, /^ig-IGSID1-aviso-\d{4}-\d{2}-\d{2}$/);
  assert.match(filasHoja[0].resumen, /ya había dejado su WhatsApp: está en sus filas anteriores \(ig-IGSID1\)/);
  // El número que deje ahora va en la fila de la espera de hoy, nueva (su correo lleva el número), y se le agradece.
  await ig({ text: 'María Pérez 0424-000-1111' });
  assert.equal(filasHoja.length, 2);
  assert.match(filasHoja[1].id, /^ig-IGSID1-espera-\d{4}-\d{2}-\d{2}$/);
  assert.equal(filasHoja[1].telefono, '04240001111');
  assert.match(filasHoja[1].resumen, /^Esperó más de 1 hora a la asesora en Instagram y dejó sus datos: escríbele/);
  assert.match(textosIg().at(-1), /^¡Gracias! 💛 Ya le pasé tus datos/);
});

test('Dejó su número en otra pausa de hoy y otra pregunta espera 1 hora: el aviso va en su propia fila, con su correo', async () => {
  await ig({ text: 'Hola, ¿tienen la Toronto en queen?' });
  await eco('¿Me pasas tu nombre y número y te escribo por WhatsApp?');
  await ig({ text: 'Ana Pérez 0414-555-1234' });
  await eco('¡Gracias Ana! Ya te escribo');
  await ig({ text: '¿Y cuánto tarda la entrega a Maracay?' });
  await retroceder(61 * 60 * 1000);
  await seguimientosInstagram(env);
  assert.match(textosIg().at(-1), /Disculpa la espera.*Ya tienen tu número/s);
  // Dos filas nuevas (dos correos), y la del número no se vuelve a mandar: conserva su nombre.
  assert.deepEqual(filasHoja.map(sinFecha), ['ig-IGSID1-espera', 'ig-IGSID1-aviso']);
  assert.equal(filasHoja[0].nombre, 'Ana Pérez · @cliente (Cliente)');
  assert.equal(filasHoja[0].telefono, '04145551234');
  assert.match(filasHoja[1].resumen, /^Esperó más de 1 hora .* ya había dejado su WhatsApp: está en sus filas anteriores/);
});

test('Le dio su número a la asesora que se lo pidió y después pregunta otra cosa: a la hora, la disculpa y el aviso', async () => {
  await ig({ text: 'Hola, ¿tienen la Toronto en queen?' });
  await eco('¡Hola! Sí la tenemos. ¿Me pasas tu número y te escribo por WhatsApp con los detalles?');
  await ig({ text: '04145551234' });
  await retroceder(5 * 60 * 1000); // 5 minutos después pregunta otra cosa y nadie le contesta
  await ig({ text: '¿Y cuánto tarda la entrega a Maracay?' });
  await retroceder(61 * 60 * 1000);
  await seguimientosInstagram(env);
  assert.match(textosIg().at(-1), /Disculpa la espera.*Ya tienen tu número/s);
  assert.deepEqual(filasHoja.map(sinFecha), ['ig-IGSID1-espera', 'ig-IGSID1-aviso']);
  assert.match(filasHoja[0].resumen, /revisa si ella ya le escribió/); // su correo no decía que esperaba
  assert.match(filasHoja[1].resumen, /^Esperó más de 1 hora a la asesora en Instagram y ya había dejado su WhatsApp/);
  await seguimientosInstagram(env);
  assert.equal(filasHoja.length, 2); // una vez por espera
});

test('Con la hora de Meta adelantada, el número que deja mientras espera es de esa espera: a la hora, sin otro aviso', async () => {
  await ig({ text: 'Hola' });
  const adelantada = Date.now() + 5000; // la hora del eco, 5 s por delante del reloj del Worker
  await eco('Hola, te atiende Carla', 'IGSID1', { timestamp: adelantada });
  await ig({ text: 'La Toronto queen. Me llamo Ana, mi WhatsApp es 0414-555-1234, escríbeme por ahí' });
  assert.equal(estado().esperaDesde, adelantada + 1); // la espera empieza detrás del eco, también adelantada
  assert.match(filasHoja[0].resumen, /Dejó su WhatsApp mientras esperaba a la asesora en Instagram: escríbele/);
  await retroceder(61 * 60 * 1000);
  await seguimientosInstagram(env);
  assert.match(textosIg().at(-1), /Disculpa la espera.*Ya tienen tu número/s);
  assert.equal(filasHoja.length, 1); // su fila ya decía que esperaba: no hace falta otro aviso
});

test('Memoria de antes del 22-oct con telefonoEnHoja: true (a veces era un monto o una cédula): a la hora se le piden', async () => {
  await env.CONVERSACIONES.put('ig:IGSID1', JSON.stringify({ mensajes: [], guardado: true, resumen: '', resumenEnHoja: '', telefonoEnHoja: true }));
  await eco('Hola, te atiende Carla');
  await ig({ text: '¿Me confirmas si la tienen en gris?' });
  await retroceder(61 * 60 * 1000);
  await seguimientosInstagram(env);
  assert.match(textosIg().at(-1), /tu nombre y tu número de WhatsApp/);
  await ig({ text: 'Soy María' });
  assert.match(textosIg().at(-1), /^¡Gracias! 💛 ¿Me dejas también tu número de WhatsApp\?/);
  assert.equal(filasHoja.length, 0);
});

test('Un datosTomados de antes del 22-oct (también lo ponía un nombre suelto) no es su número ni cierra la captura', async () => {
  // En esta pausa ya se le pidieron los datos, y la versión anterior anotó un nombre suelto como datos tomados.
  const ahora = Date.now();
  await env.CONVERSACIONES.put('ig:IGSID1', JSON.stringify({
    mensajes: [], humano: ahora - 2 * HORA, esperaDesde: ahora - 2 * HORA + 1, seguimiento: ahora - 50 * 60 * 1000,
    datosTomados: ahora - 40 * 60 * 1000,
  }));
  await ig({ text: '0414-555-1234' });
  assert.equal(filasHoja.length, 1);
  assert.equal(filasHoja[0].telefono, '04145551234');
  assert.match(textosIg().at(-1), /^¡Gracias! 💛 Ya le pasé tus datos/);
  // En una pausa de otro día, a la hora se le piden sus datos (no «Ya tienen tu número»).
  await env.CONVERSACIONES.put('ig:IGSID2', JSON.stringify({ mensajes: [], humano: ahora - 72 * HORA, datosTomados: ahora - 71 * HORA }));
  await eco('Hola, te atiende Carla', 'IGSID2');
  await ig({ text: '¿Me confirmas si la tienen en gris?' }, 'IGSID2');
  await retroceder(61 * 60 * 1000, 'IGSID2');
  await seguimientosInstagram(env);
  assert.match(textosA('IGSID2').at(-1), /tu nombre y tu número de WhatsApp/);
});

test('Si Instagram devuelve un texto del asistente SIN la marca, la pausa se apaga sola (nunca se calla por error)', async () => {
  await env.CONVERSACIONES.put('ig:marca', 'si');
  await ig({ text: 'Hola' });
  const [texto] = textosIg();
  await eco(texto.replace(MARCA, '')); // Instagram quitó la marca
  assert.equal(env.CONVERSACIONES.datos.get('ig:marca'), undefined);
  await eco('Hola, te atiende Carla');
  assert.equal(estado().humano, 0);
  await ig({ text: '¿Cuánto es la Toronto queen?' });
  assert.equal(textosIg().length, 2);
});
