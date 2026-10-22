// La memoria de cada conversación (KV) y la hoja de clientes: guardar dos veces en la misma vuelta no repite nada, el
// teléfono que ya llegó a la hoja se recuerda por sus 4 últimos dígitos, un interés nuevo es novedad, la fila de WhatsApp
// más reciente gana al juntar dos vueltas, y la hoja no se pasa del tiempo que le queda al Worker. KV en memoria y fetch
// falso: no sale nada a internet.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { kvEnMemoria } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { cargarEstado, guardarEstado, hayNovedadParaHoja, marcarEnHoja } from '../src/canales/memoria.js';
import { guardarCliente } from '../src/lib/hoja.js';

const HOJA = { HOJA_URL: 'https://hoja.falsa', HOJA_SECRETO: 'clave-hoja' };
afterEach(() => { for (const clave of Object.keys(HOJA)) delete config[clave]; });

const mensaje = (role, content) => ({ role, content });
const textos = async (kv, clave) => (await kv.get(clave, 'json')).mensajes.map((m) => m.content);

test('Guardar dos veces en la misma vuelta (antes y después de la hoja) no repite sus mensajes', async () => {
  const kv = kvEnMemoria();
  const vuelta = await cargarEstado(kv, 'ig:X');
  vuelta.mensajes.push(mensaje('user', '¿Cuánto es la Toronto queen?'), mensaje('assistant', 'Está en REF 550.'));
  assert.equal(await guardarEstado(kv, 'ig:X', vuelta), true);
  marcarEnHoja(vuelta, '04145551234');
  assert.equal(await guardarEstado(kv, 'ig:X', vuelta), true);
  assert.deepEqual(await textos(kv, 'ig:X'), ['¿Cuánto es la Toronto queen?', 'Está en REF 550.']);
  assert.equal((await kv.get('ig:X', 'json')).guardado, true);
});

test('Y si otra vuelta del mismo cliente guardó en el medio, cada mensaje queda una sola vez', async () => {
  const kv = kvEnMemoria();
  // Dos mensajes seguidos del cliente, atendidos a la vez: las dos vueltas leen la memoria vacía.
  const a = await cargarEstado(kv, 'ig:X');
  const b = await cargarEstado(kv, 'ig:X');
  a.mensajes.push(mensaje('user', 'hola'), mensaje('assistant', 'Hola 👋'));
  b.mensajes.push(mensaje('user', '¿hacen envíos?'), mensaje('assistant', 'Sí, a todo el país.'));
  await guardarEstado(kv, 'ig:X', a);
  await guardarEstado(kv, 'ig:X', b);
  marcarEnHoja(a);
  await guardarEstado(kv, 'ig:X', a);
  assert.deepEqual(await textos(kv, 'ig:X'), ['hola', 'Hola 👋', '¿hacen envíos?', 'Sí, a todo el país.']);
  assert.equal((await kv.get('ig:X', 'json')).guardado, true);
  // Lo que la vuelta agrega después de guardar también entra, una vez.
  a.mensajes.push(mensaje('user', 'gracias'));
  await guardarEstado(kv, 'ig:X', a);
  await guardarEstado(kv, 'ig:X', a);
  assert.deepEqual(await textos(kv, 'ig:X'), ['hola', 'Hola 👋', '¿hacen envíos?', 'Sí, a todo el país.', 'gracias']);
});

test('El teléfono que llegó a la hoja se recuerda por sus 4 últimos dígitos: el mismo número no se reenvía, otro sí', async () => {
  const kv = kvEnMemoria();
  const estado = await cargarEstado(kv, 'wa:X');
  const interesado = true;
  assert.ok(hayNovedadParaHoja(estado, { interesado, telefono: '+584145551234' })); // todavía no está en la hoja
  marcarEnHoja(estado, '+584145551234');
  assert.equal(estado.telefonoEnHoja, '1234');
  // WhatsApp pasa el número del cliente en cada mensaje: el mismo no es novedad, aunque venga escrito de otra forma.
  assert.ok(!hayNovedadParaHoja(estado, { interesado, telefono: '+584145551234' }));
  assert.ok(!hayNovedadParaHoja(estado, { interesado, telefono: '0414-555-1234' }));
  assert.ok(hayNovedadParaHoja(estado, { interesado, telefono: '04240001111' })); // otro número: se actualiza la fila
  assert.ok(!hayNovedadParaHoja(estado, { interesado: false, telefono: '04240001111' }));
  await guardarEstado(kv, 'wa:X', estado);
  assert.equal((await kv.get('wa:X', 'json')).telefonoEnHoja, '1234'); // en KV va la huella, nunca el número
});

test('Memoria de antes del 22-oct (telefonoEnHoja: true): el número se reenvía UNA vez y después queda su huella', async () => {
  const kv = kvEnMemoria();
  await kv.put('ig:X', JSON.stringify({ mensajes: [], guardado: true, resumen: '', resumenEnHoja: '', telefonoEnHoja: true }));
  const estado = await cargarEstado(kv, 'ig:X');
  assert.ok(!hayNovedadParaHoja(estado, { interesado: true })); // sin número en el mensaje, nada
  assert.ok(hayNovedadParaHoja(estado, { interesado: true, telefono: '04145551234' }));
  marcarEnHoja(estado, '04145551234');
  await guardarEstado(kv, 'ig:X', estado);
  assert.ok(!hayNovedadParaHoja(await cargarEstado(kv, 'ig:X'), { interesado: true, telefono: '04145551234' }));
});

test('Dos vueltas a la vez, una manda un número nuevo: queda su huella, guarde quien guarde último', async () => {
  for (const orden of [['a', 'b'], ['b', 'a']]) {
    const kv = kvEnMemoria();
    await kv.put('ig:X', JSON.stringify({ mensajes: [], guardado: true, resumen: '', resumenEnHoja: '', telefonoEnHoja: '1234' }));
    const vueltas = { a: await cargarEstado(kv, 'ig:X'), b: await cargarEstado(kv, 'ig:X') };
    marcarEnHoja(vueltas.a, '04240005678'); // «a» mandó otro número a la hoja; «b» no tocó el teléfono
    for (const quien of orden) await guardarEstado(kv, 'ig:X', vueltas[quien]);
    assert.equal((await kv.get('ig:X', 'json')).telefonoEnHoja, '5678', orden.join(' y luego '));
  }
});

test('Instagram, dos vueltas a la vez en una pausa: queda cuándo llegó su número a la hoja; el datosTomados de antes se va', async () => {
  for (const orden of [['a', 'b'], ['b', 'a']]) {
    const kv = kvEnMemoria();
    // datosTomados: lo que anotaba la versión de antes del 22-oct, también con un nombre suelto.
    await kv.put('ig:X', JSON.stringify({ mensajes: [], humano: 1000, datosTomados: 2000 }));
    const vueltas = { a: await cargarEstado(kv, 'ig:X'), b: await cargarEstado(kv, 'ig:X') };
    vueltas.a.numeroTomado = 3000; // «a» mandó su número a la hoja; «b» no
    for (const quien of orden) await guardarEstado(kv, 'ig:X', vueltas[quien]);
    const guardado = await kv.get('ig:X', 'json');
    assert.equal(guardado.numeroTomado, 3000, orden.join(' y luego '));
    assert.equal(guardado.datosTomados, undefined, orden.join(' y luego '));
  }
});

test('Lo que le interesa también es novedad para la hoja: otro modelo sí, el mismo o ninguno no; el de antes del 22-oct, una vez', async () => {
  const kv = kvEnMemoria();
  const interesado = true;
  const estado = await cargarEstado(kv, 'wa:X');
  Object.assign(estado, { interes: 'Toronto Queen', resumen: 'Quiere la Toronto' });
  marcarEnHoja(estado);
  assert.ok(!hayNovedadParaHoja(estado, { interesado }));
  estado.interes = 'Manila Queen'; // el mismo resumen, otro modelo
  assert.ok(hayNovedadParaHoja(estado, { interesado }));
  marcarEnHoja(estado);
  assert.ok(!hayNovedadParaHoja(estado, { interesado }));
  // Una memoria de antes no dice qué interés llegó a la hoja: se manda una vez. Sin interés, nada.
  await kv.put('wa:Y', JSON.stringify({ mensajes: [], guardado: true, interes: 'Toronto Queen', resumen: '', resumenEnHoja: '' }));
  assert.ok(hayNovedadParaHoja(await cargarEstado(kv, 'wa:Y'), { interesado }));
  await kv.put('wa:Z', JSON.stringify({ mensajes: [], guardado: true, interes: '', resumen: '', resumenEnHoja: '' }));
  assert.ok(!hayNovedadParaHoja(await cargarEstado(kv, 'wa:Z'), { interesado }));
});

test('La fila de la hoja (WhatsApp): queda la más reciente, con su `guardado`; en la misma fila, basta con una vuelta', async () => {
  const hace8Dias = Date.now() - 8 * 86400 * 1000;
  for (const orden of [['a', 'b'], ['b', 'a']]) {
    const kv = kvEnMemoria();
    await kv.put('wa:X', JSON.stringify({ mensajes: [], guardado: true, filaHoja: '2026-10-14', filaHojaDesde: hace8Dias }));
    // Dos vueltas a la vez: «a» abre una fila nueva (sin guardar hasta que la hoja responda), «b» no toca la hoja.
    const vueltas = { a: await cargarEstado(kv, 'wa:X'), b: await cargarEstado(kv, 'wa:X') };
    Object.assign(vueltas.a, { filaHoja: '2026-10-22', filaHojaDesde: Date.now(), guardado: false });
    for (const quien of orden) await guardarEstado(kv, 'wa:X', vueltas[quien]);
    const antes = await kv.get('wa:X', 'json');
    assert.deepEqual([antes.filaHoja, antes.guardado], ['2026-10-22', false], orden.join(' y luego '));
    // La hoja le respondió a «a»: su fila queda guardada, aunque «b» la haya escrito sin guardar en el medio.
    marcarEnHoja(vueltas.a);
    await guardarEstado(kv, 'wa:X', vueltas.a);
    assert.equal((await kv.get('wa:X', 'json')).guardado, true, orden.join(' y luego '));
  }
});

test('guardarCliente con `hasta`: cada intento dura lo que queda y no reintenta sin tiempo; sin `hasta`, dos intentos', async () => {
  Object.assign(config, HOJA);
  const cliente = { conversacion: 'ig-X', cliente: { nombre: '@cliente', telefono: '', ciudad: '' }, interes: '', resumen: '', canal: 'Instagram' };
  let intentos = 0;
  // La hoja dormida: no responde hasta que se corta la espera.
  globalThis.fetch = (url, { signal }) => {
    intentos += 1;
    return new Promise((_, rechazar) => signal.addEventListener('abort', () => rechazar(signal.reason)));
  };
  const t = Date.now();
  assert.equal(await guardarCliente(cliente, { hasta: Date.now() + 150 }), false);
  // Sin el tope serían 10 s; el margen es amplio porque las pruebas corren en paralelo y la máquina puede ir cargada.
  assert.ok(Date.now() - t < 5000, `tardó ${Date.now() - t} ms`);
  assert.equal(intentos, 1);
  intentos = 0;
  assert.equal(await guardarCliente(cliente, { hasta: Date.now() - 1 }), false); // ya no queda tiempo: ni lo intenta
  assert.equal(intentos, 0);

  // La hoja falla al instante: el segundo intento va si queda tiempo para que responda (3 s); si no, no.
  globalThis.fetch = async () => {
    intentos += 1;
    return new Response(JSON.stringify({ ok: false, error: 'ocupada' }));
  };
  intentos = 0;
  await guardarCliente(cliente); // como la llaman chat.js y whatsapp.js
  assert.equal(intentos, 2);
  intentos = 0;
  await guardarCliente(cliente, { hasta: Date.now() + 20000 });
  assert.equal(intentos, 2);
  intentos = 0;
  await guardarCliente(cliente, { hasta: Date.now() + 2000 });
  assert.equal(intentos, 1);
});
