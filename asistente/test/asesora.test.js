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
/** Mueve hacia atrás los tiempos de la conversación (y su seguimiento programado), como si hubieran pasado `ms`. */
async function retroceder(ms, igsid = 'IGSID1') {
  const e = estado(igsid);
  for (const campo of ['humano', 'esperaDesde', 'seguimiento', 'datosTomados']) if (e[campo]) e[campo] -= ms;
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
