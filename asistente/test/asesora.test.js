// Instagram con una asesora en el mismo chat (21-oct): cuando ella escribe desde la cuenta de Dekog, el asistente se
// calla en ese chat; si el cliente espera 1 hora sin respuesta, se le piden sus datos y, al dejarlos, van a la hoja.
// El orden importa: la primera prueba es ANTES de que Instagram devuelva la marca invisible (estado del módulo), y la
// última apaga la pausa. IA: proveedor «prueba». Fetch falso: no sale nada a internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SECRETO_IG, kvEnMemoria, metaFalso, entregar, avisoIg } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { instagramPost, seguimientosInstagram, MARCA } from '../src/canales/instagram.js';
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
const ig = (msg, igsid = 'IGSID1') => entregar(instagramPost, avisoIg(msg, igsid), SECRETO_IG, env);
const estado = (igsid = 'IGSID1') => JSON.parse(env.CONVERSACIONES.datos.get(`ig:${igsid}`) ?? 'null');
let n = 0;
/** Un mensaje que salió desde la cuenta de Dekog (eco): una asesora escribiendo en la app, o una respuesta del asistente. */
function eco(texto, igsid = 'IGSID1') {
  n += 1;
  const aviso = { object: 'instagram', entry: [{ id: 'IGDEKOG', time: 1790700000, messaging: [{
    sender: { id: 'IGDEKOG' }, recipient: { id: igsid }, timestamp: 1790700000, message: { mid: `mid.eco.${n}`, text: texto, is_echo: true },
  }] }] };
  return entregar(instagramPost, aviso, SECRETO_IG, env);
}
/** Mueve hacia atrás los tiempos de la conversación (y su seguimiento programado), como si hubieran pasado `ms`. */
async function retroceder(ms, igsid = 'IGSID1') {
  const e = estado(igsid);
  for (const campo of ['humano', 'esperaDesde', 'seguimiento', 'datosTomados']) if (e[campo]) e[campo] -= ms;
  await env.CONVERSACIONES.put(`ig:${igsid}`, JSON.stringify(e));
  const lista = JSON.parse(env.CONVERSACIONES.datos.get('ig:seguimientos') ?? '{}');
  if (lista[igsid]) lista[igsid] -= ms;
  await env.CONVERSACIONES.put('ig:seguimientos', JSON.stringify(lista));
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
  assert.ok(JSON.parse(env.CONVERSACIONES.datos.get('ig:seguimientos')).IGSID1 > Date.now());
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
  assert.equal(JSON.parse(env.CONVERSACIONES.datos.get('ig:seguimientos')).IGSID1, undefined);
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
