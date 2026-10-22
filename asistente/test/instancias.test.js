// Varias instancias del Worker a la vez, cada una con su memoria, y un solo KV (como en Cloudflare): la promo sale UNA vez
// aunque dos instancias atiendan los primeros mensajes del mismo cliente, un aviso que Meta repite en otra instancia se
// responde una vez, y si una apaga la pausa por asesora, las demás se enteran en minutos. IA: proveedor «prueba» o un
// Gemini falso que tarda. Fetch falso: no sale nada a internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SECRETO_IG, kvEnMemoria, metaFalso, entregar, avisoIg } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { PROMO } from '../src/lib/promo.js';
import { olvidarEnCurso } from '../src/canales/memoria.js';

// Cada copia del módulo es una instancia: su propia memoria (la marca leída, las promos mandadas, sus textos), el mismo KV.
const instancia = (nombre) => import(`../src/canales/instagram.js?instancia=${nombre}`);

let env;
let meta;
beforeEach(() => { env = { CONVERSACIONES: kvEnMemoria() }; meta = metaFalso(); globalThis.fetch = meta.fetchFalso; delete config.PROMO; });
afterEach(() => {
  config.PROMO = 'no';
  config.ASISTENTE_PROVEEDOR = 'prueba';
  delete config.GEMINI_API_KEY;
});

/**
 * Una IA (Gemini falso) que tarda: no responde hasta tener los dos pedidos y después les responde a la vez, como cuando
 * dos mensajes seguidos del cliente caen en dos instancias y la IA tarda unos segundos en cada uno.
 */
function iaQueRespondeALosDos() {
  const salida = {
    respuesta: 'La Toronto Queen (1,60 x 1,90 m) está en REF 550.', productos: [{ id: 48, talla: 'Queen 1,60x1,90 M' }],
    derivar: { necesario: false, area: 'home', resumen: '' }, ofrecer_formulario: false,
  };
  const esperando = [];
  globalThis.fetch = async (url, o) => {
    if (!String(url).includes('generativelanguage.googleapis.com')) return meta.fetchFalso(url, o);
    await new Promise((listo) => {
      esperando.push(listo);
      if (esperando.length === 2) for (const seguir of esperando) seguir();
    });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(salida) }] } }] }));
  };
  Object.assign(config, { ASISTENTE_PROVEEDOR: '', GEMINI_API_KEY: 'clave-falsa' });
}

const ig = (copia, msg, igsid) => entregar(copia.instagramPost, avisoIg(msg, igsid), SECRETO_IG, env);
const textosA = (igsid) => meta.enviados.filter((e) => e.cuerpo?.recipient?.id === igsid && e.cuerpo.message?.text).map((e) => e.cuerpo.message.text);
let n = 0;
/** Un texto que salió desde la cuenta de Dekog (eco) y le llega a esa instancia. */
function eco(copia, texto, igsid) {
  n += 1;
  const aviso = { object: 'instagram', entry: [{ id: 'IGDEKOG', time: 1790700000, messaging: [{
    sender: { id: 'IGDEKOG' }, recipient: { id: igsid }, timestamp: 1790700000, message: { mid: `mid.eco.i${n}`, text: texto, is_echo: true },
  }] }] };
  return entregar(copia.instagramPost, aviso, SECRETO_IG, env);
}

test('Promo: dos instancias atienden a la vez los primeros mensajes de un cliente nuevo → la promo sale UNA vez', async () => {
  const [a, b] = await Promise.all([instancia('promo-a'), instancia('promo-b')]);
  iaQueRespondeALosDos();
  await Promise.all([
    ig(a, { text: 'Buenas tardes, ¿cuánto cuesta la Toronto queen?' }, 'IGSID7'),
    ig(b, { text: '¿Y hacen envíos a Maracay?' }, 'IGSID7'),
  ]);
  assert.equal(meta.enviados.filter((e) => e.cuerpo.message?.attachment?.payload?.url === PROMO.imagen).length, 1);
  assert.equal(textosA('IGSID7').filter((t) => t.includes(PROMO.enlace)).length, 1);
  assert.equal(textosA('IGSID7').filter((t) => /Toronto Queen/.test(t)).length, 2); // las dos respuestas sí salen
  assert.ok(env.CONVERSACIONES.datos.get(`ig:promo:IGSID7:${PROMO.id}`), 'el turno de la promo queda en KV');
});

test('Un aviso repetido por Meta que cae en otra instancia mientras la IA piensa: se responde UNA vez', async () => {
  const [a, b] = await Promise.all([instancia('visto-a'), instancia('visto-b')]);
  // La IA (Gemini falso) no contesta hasta que la prueba la suelta. `pidio[i]` se cumple con su pedido número i + 1.
  const salida = {
    respuesta: 'La Toronto Queen (1,60 x 1,90 m) está en REF 550.', productos: [{ id: 48, talla: 'Queen 1,60x1,90 M' }],
    derivar: { necesario: false, area: 'home', resumen: '' }, ofrecer_formulario: false,
  };
  let pedidos = 0;
  const pidio = [Promise.withResolvers(), Promise.withResolvers()];
  const suelta = Promise.withResolvers();
  globalThis.fetch = async (url, o) => {
    if (!String(url).includes('generativelanguage.googleapis.com')) return meta.fetchFalso(url, o);
    pidio[pedidos]?.resolve();
    pedidos += 1;
    await suelta.promise;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(salida) }] } }] }));
  };
  Object.assign(config, { ASISTENTE_PROVEEDOR: '', GEMINI_API_KEY: 'clave-falsa' });
  const aviso = avisoIg({ text: '¿Cuánto es la Toronto queen?' }, 'IGSID8');
  const primera = entregar(a.instagramPost, aviso, SECRETO_IG, env);
  await pidio[0].promise; // A ya está esperando a la IA, sin haber guardado la memoria
  olvidarEnCurso(); // la repetición le llega a B, que no la tiene en su memoria
  const segunda = entregar(b.instagramPost, aviso, SECRETO_IG, env);
  // La IA sigue pensando hasta que B termina (o le pide otra respuesta, si no vio que A ya lo estaba atendiendo).
  await Promise.race([segunda, pidio[1].promise]);
  suelta.resolve();
  await Promise.all([primera, segunda]);
  assert.equal(pedidos, 1);
  assert.equal(textosA('IGSID8').filter((t) => t.includes('La Toronto Queen')).length, 1);
  const memoria = JSON.parse(env.CONVERSACIONES.datos.get('ig:IGSID8'));
  assert.equal(memoria.mensajes.filter((m) => m.role === 'user').length, 1);
  assert.ok(env.CONVERSACIONES.datos.has(`visto:${aviso.entry[0].messaging[0].message.mid}`));
});

test('Marca: si una instancia apaga la pausa, las demás se enteran en minutos y no callan el chat', async () => {
  const [a, b] = await Promise.all([instancia('marca-a'), instancia('marca-b')]);
  await env.CONVERSACIONES.put('ig:marca', new Date().toISOString());
  // Las dos ven la marca: a cada una le llega el eco de un texto del asistente que la conserva.
  await eco(a, `Hola ${a.MARCA}`, 'IGSID1');
  await eco(b, `Hola ${b.MARCA}`, 'IGSID1');
  // A B le vuelve SIN la marca un texto que mandó: Instagram la quitó y B apaga la pausa.
  await ig(b, { text: 'Hola' }, 'IGSID3');
  await eco(b, textosA('IGSID3').at(-1).replace(b.MARCA, ''), 'IGSID3');
  assert.equal(env.CONVERSACIONES.datos.get('ig:marca'), undefined);
  await ig(b, { text: '¿Cuánto es la Toronto queen?' }, 'IGSID3');
  const deB = textosA('IGSID3').at(-1);
  // Pasan 6 minutos y a A le llega, sin marca, el eco de ese texto de B: no es una asesora, A no calla el chat.
  const ahoraReal = Date.now;
  Date.now = () => ahoraReal() + 6 * 60 * 1000;
  try {
    await eco(a, deB.replace(a.MARCA, ''), 'IGSID3');
    assert.equal(JSON.parse(env.CONVERSACIONES.datos.get('ig:IGSID3')).humano, 0);
    const antes = textosA('IGSID3').length;
    await ig(a, { text: '¿Y en matrimonial?' }, 'IGSID3');
    assert.ok(textosA('IGSID3').length > antes); // A le sigue respondiendo
  } finally {
    Date.now = ahoraReal;
  }
});

test('Marca: ig:marca se reescribe una vez al día mientras se vea (vence a los 7 días); si es de hoy, no se toca', async () => {
  const hace2Dias = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
  for (const [nombre, guardada] of [['vieja', hace2Dias], ['sin-fecha', 'si']]) {
    env.CONVERSACIONES = kvEnMemoria();
    const poner = env.CONVERSACIONES.put;
    let vence;
    env.CONVERSACIONES.put = async (clave, valor, opciones) => {
      if (clave === 'ig:marca') vence = opciones?.expirationTtl;
      return poner(clave, valor, opciones);
    };
    await poner('ig:marca', guardada);
    const copia = await instancia(`renovar-${nombre}`);
    await eco(copia, `Hola ${copia.MARCA}`, 'IGSID1');
    const ahora = env.CONVERSACIONES.datos.get('ig:marca');
    assert.ok(Date.now() - Date.parse(ahora) < 60 * 1000, `${nombre}: ${ahora}`);
    assert.equal(vence, 7 * 86400, nombre);
  }
  const deHoy = new Date(Date.now() - 3600 * 1000).toISOString();
  await env.CONVERSACIONES.put('ig:marca', deHoy);
  const copia = await instancia('renovar-de-hoy');
  await eco(copia, `Hola ${copia.MARCA}`, 'IGSID1');
  assert.equal(env.CONVERSACIONES.datos.get('ig:marca'), deHoy); // sin gastar otra escritura
});
