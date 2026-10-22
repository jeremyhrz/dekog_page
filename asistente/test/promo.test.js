// La promo «Mobiliario en stock» (21-oct): el asistente dice que SÍ hay descuentos y manda el enlace, conoce las piezas en
// stock, manda UNA vez el mensaje de la promo después de la bienvenida, y en Instagram entiende lo que le comparten en vez
// de contestar «solo puedo leer mensajes de texto y fotos». IA: proveedor «prueba». Fetch falso: no sale nada a internet.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SECRETO_WA, SECRETO_IG, kvEnMemoria, metaFalso, entregar, avisoWa, textoWa, avisoIg, sinMarca } from './ayuda.js';
import { config } from '../src/lib/config.js';
import {
  PROMO, OFERTAS, COPETES, ofertaElegida, copeteElegido, ofertasDelModelo, hayOfertaEn, pideOfertas, pideCatalogoDeOfertas,
} from '../src/lib/promo.js';
import { tarjeta, montosInventados, totalesIncoherentes, buscarProducto } from '../src/lib/catalogo.js';
import { lineaPrecio, fichaElegida, nombreEscrito } from '../src/canales/meta.js';
import { unirSeguidos } from '../src/canales/memoria.js';
import { ESQUEMA, sistemaPara } from '../src/lib/prompt.js';
import { politicas } from '../src/lib/conocimiento.js';
import { catalogosPdf } from '../src/lib/negocio.js';
import { pensar } from '../src/chat.js';
import { whatsappPost } from '../src/canales/whatsapp.js';
import { instagramPost } from '../src/canales/instagram.js';

const TASA = { valor: 100, etiqueta: 'tasa BCV euro', fecha: '21/10/2026' };
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0xff, 0xd9]);

let env;
let meta;
let descargas;
/** Meta falso + la CDN de Instagram (fotos y videos de lo que comparte el cliente). */
function usar(opciones) {
  meta = metaFalso(opciones);
  descargas = [];
  globalThis.fetch = async (url, o) => {
    const u = String(url);
    if (u.startsWith('https://cdn.falso/')) {
      descargas.push(u);
      return u.endsWith('.mp4')
        ? new Response(new Uint8Array(64), { headers: { 'content-type': 'video/mp4' } })
        : new Response(JPEG, { headers: { 'content-type': 'image/jpeg' } });
    }
    return meta.fetchFalso(url, o);
  };
}
beforeEach(() => { env = { CONVERSACIONES: kvEnMemoria() }; usar(); delete config.PROMO; });
afterEach(() => { config.PROMO = 'no'; });

const mensajesWa = () => meta.enviados.filter((e) => e.url.endsWith('/PHONE123/messages') && e.cuerpo.type).map((e) => e.cuerpo);
const enviosIg = () => meta.enviados.filter((e) => e.url.endsWith('/me/messages')).map((e) => e.cuerpo.message);
const textosIg = () => enviosIg().filter((m) => m.text).map((m) => sinMarca(m.text));
const wa = (msg, tel) => entregar(whatsappPost, avisoWa(msg, tel), SECRETO_WA, env);
const ig = (msg, igsid) => entregar(instagramPost, avisoIg(msg, igsid), SECRETO_IG, env);
const estadoIg = (igsid = 'IGSID1') => JSON.parse(env.CONVERSACIONES.datos.get(`ig:${igsid}`) ?? 'null');
const estadoWa = (tel = '584140000001') => JSON.parse(env.CONVERSACIONES.datos.get(`wa:PHONE123:${tel}`) ?? 'null');

// ── Lo que sabe el asistente ─────────────────────────────────────────────────────────────────────────────────────

test('Prompt y políticas: hay descuentos (hasta 20 % en stock) y ya no dice «no hay promociones»', () => {
  const sistema = sistemaPara('instagram');
  assert.match(sistema, /PROMOCIÓN VIGENTE/);
  assert.match(sistema, /\[48\] Toronto · Individual · gris 02 en chenille paño: REF 405 → REF 330/);
  assert.match(sistema, /Zoe · Individual · gris 01 en terciopelo: REF 580 → REF 465 \(no está en el CATÁLOGO/);
  assert.match(sistema, /\[44\] Sydney · Queen · gris 01 en terciopelo: REF 435/);
  assert.doesNotMatch(sistema, /no hay promociones vigentes|no hay ninguna vigente/);
  assert.ok(politicas.some((p) => /hasta 20 % de descuento en mobiliario en stock/.test(p)));
  const items = ESQUEMA.properties.productos.items;
  assert.equal(items.properties.oferta.type, 'integer');
  assert.ok(items.required.includes('oferta'));
});

test('Las piezas de la promo: cada id es del modelo que dice y su precio de antes coincide con el catálogo (salvo las anotadas)', () => {
  // Diferencias del PDF con el catálogo, anotadas en promo.js: las confirma la dueña.
  const anotadas = new Set(['Paris|Queen|930', 'Bruselas|King|890', 'Aurora|Matrimonial|980', 'Manila|Matrimonial|635']);
  for (const o of [...OFERTAS, ...COPETES]) {
    if (o.id === null) continue;
    const p = buscarProducto(o.id);
    assert.ok(p, `${o.modelo}: el id ${o.id} no existe`);
    assert.equal(p.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), o.modelo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
    if (!o.antes || anotadas.has(`${o.modelo}|${o.medida}|${o.antes}`)) continue;
    const talla = p.tallas.find((t) => t.nombre.startsWith(o.medida));
    assert.equal(talla.precio, o.antes, `${o.modelo} ${o.medida}`);
  }
  for (const o of OFERTAS) assert.ok(o.ahora < o.antes && o.ahora >= o.antes * 0.79, `${o.modelo}: ${o.antes} → ${o.ahora}`);
  assert.equal(OFERTAS.length, 36);
  assert.equal(COPETES.length, 12);
});

test('Montos: los de la promo valen cuando el texto habla de ella; el «hasta 20 %» vale, otro descuento o Cashea no', () => {
  assert.deepEqual(montosInventados('Tenemos hasta 20 % de descuento en mobiliario en stock 🏷️'), []);
  assert.deepEqual(montosInventados('La Toronto individual en stock está a REF 330 en vez de REF 405.', { ids: [48] }), []);
  assert.deepEqual(montosInventados('Hasta 20 % en stock; con el 50 % de anticipo te la apartamos.'), []);
  assert.deepEqual(montosInventados('La Toronto Queen cuesta REF 330.', { ids: [48] }), ['REF 330.']); // sin hablar de la oferta
  assert.deepEqual(montosInventados('Hoy tenemos 30 % de descuento.'), ['30 %']);
  assert.deepEqual(montosInventados('Hoy tenemos 50 % de descuento.'), ['50 %']);
  assert.deepEqual(montosInventados('Con Cashea pagas un 20 % de inicial.'), ['20 %']);
  config.PROMO = 'no';
  assert.deepEqual(montosInventados('Tenemos hasta 20 % de descuento.'), ['20 %']);
});

test('Montos de la promo: desde la oración que habla de ella, nunca antes; «por ahora» o «elegantes» no cuentan', () => {
  // La Bali Queen cuesta REF 990 y la Toronto Queen REF 550: 790 y 580 son montos de la promo, no sus precios.
  assert.deepEqual(montosInventados('Por ahora la Bali Queen está en REF 790', { ids: [6] }), ['REF 790']);
  assert.deepEqual(montosInventados('La Bali Queen ahora está en REF 790', { ids: [6] }), ['REF 790']);
  assert.deepEqual(montosInventados('Antes de fabricarla, la Bali Queen está en REF 790.', { ids: [6] }), ['REF 790.']);
  assert.deepEqual(montosInventados('Ahora mismo la Toronto Queen está en REF 580', { ids: [48] }), ['REF 580']);
  assert.deepEqual(montosInventados('La Toronto Queen es de líneas elegantes y cuesta REF 580.', { ids: [48] }), ['REF 580.']);
  // Otra oración del mismo texto que sí habla de la promo no salva un precio equivocado.
  assert.deepEqual(montosInventados('La Bali Queen está en REF 790. Si quieres, te cuento de las piezas en stock.', { ids: [6] }), ['REF 790.']);
  // Como lo escriben la ficha y lineaPrecio, la oración de antes, y un monto con punto de miles («REF 1.060»).
  assert.deepEqual(montosInventados('La Manila Queen gris 02: antes REF 520, ahora REF 420.', { ids: [31] }), []);
  assert.deepEqual(montosInventados('Tenemos piezas en stock. La Manila Queen gris 02 está a REF 420.', { ids: [31] }), []);
  assert.deepEqual(montosInventados('La Hamburgo Queen en oferta está a REF 850 en vez de REF 1.060.', { ids: [24] }), []);
  assert.deepEqual(montosInventados('El copete de la Manila King en stock está a REF 455.', { ids: [31] }), []);
  assert.deepEqual(montosInventados('La Manila Queen gris 02 está rebajada: antes a REF 520, ahora a REF 420.', { ids: [31] }), []);
});

test('Montos de la promo en una lista de piezas o copetes (lo que pide el prompt): valen en todos los renglones', () => {
  // Una frase sobre la promo y después una pieza por renglón, con viñetas o numerada (el «1.» corta la oración).
  const vinetas = '¡Sí! Tenemos camas en stock con descuento 🏷️:\n'
    + '• Toronto Individual gris 02 en chenille paño: REF 405 → REF 330\n'
    + '• Manila Queen gris 02 en chenille paño: REF 520 → REF 420\n'
    + '• Hamburgo Matrimonial gris 01 en terciopelo: REF 980 → REF 785';
  assert.deepEqual(montosInventados(vinetas, { ids: [48, 31, 24] }), []);
  const numerada = 'Estas son algunas camas en oferta:\n1. Toronto Individual: REF 405 → REF 330\n'
    + '2. Manila Queen: REF 520 → REF 420\n3. Hamburgo Matrimonial: REF 980 → REF 785';
  assert.deepEqual(montosInventados(numerada, { ids: [48, 31, 24] }), []);
  const copetes = '¡Claro! Tenemos copetes en stock (solo el cabecero):\n• Sydney Queen gris 01 en terciopelo: REF 435\n'
    + '• Manila King gris 01 en terciopelo: REF 455\n• Venecia Matrimonial rosa en zaga: REF 310';
  assert.deepEqual(montosInventados(copetes), []);
  // En prosa, dos oraciones después de la que habla de la promo; y el pase de una pieza.
  assert.deepEqual(montosInventados('La Toronto cuesta desde REF 405 en individual. Además, tenemos dos piezas ya fabricadas con '
    + 'descuento. Hay una individual gris 02 en chenille paño a REF 330. Y una matrimonial gris en sedoso a REF 395.', { ids: [48] }), []);
  assert.deepEqual(montosInventados('Esa pieza en oferta se vende rápido. Una asesora te confirma que sigue disponible y te la '
    + 'aparta. La Manila Queen gris 02 te queda en REF 420. Escríbele a la que prefieras con los enlaces de abajo.', { ids: [31] }), []);
  // Antes de que hable de la promo, un monto de la promo sigue marcado, también en renglones.
  assert.deepEqual(montosInventados('La Bali Queen está en REF 790.\nSi quieres, te cuento de las piezas en stock con descuento 🏷️', { ids: [6] }),
    ['REF 790.']);
  assert.deepEqual(montosInventados('La Bali Queen:\n• REF 790\nY tenemos piezas en stock con descuento.', { ids: [6] }), ['REF 790']);
});

test('El 50 % de anticipo vale aunque la oración hable de una pieza en oferta; pegado a un descuento o a Cashea, no', () => {
  assert.deepEqual(montosInventados('Las piezas en oferta se apartan con el 50 % de anticipo.'), []);
  assert.deepEqual(montosInventados('Para apartar la Toronto individual en oferta pagas el 50 % de anticipo.'), []);
  assert.deepEqual(montosInventados('Apártala con 50 % de descuento.'), ['50 %']);
  assert.deepEqual(montosInventados('Te damos un descuento del 50 % si la apartas hoy.'), ['50 %']);
  assert.deepEqual(montosInventados('Te hacemos una rebaja de hasta 50 % al apartarla.'), ['50 %']);
  assert.deepEqual(montosInventados('Con Cashea das el 50 % de inicial para apartarla.'), ['50 %']);
});

test('totalesIncoherentes: un monto de la promo vale desde donde se habla de ella, no antes; un total mal sumado se caza igual', () => {
  const king = tarjeta(48, 'King', null, { box: 'nube', telaPremium: true }); // 665 + 150 + 150 = 965
  assert.equal(king.ref, 965);
  // 785 es la Hamburgo en stock: la segunda oración, que sí habla de la promo, no la vuelve válida en la primera.
  assert.deepEqual(
    totalesIncoherentes('La Toronto King con box nube y tela premium te queda en REF 785. Y si te sirve, tenemos una Toronto individual en stock a REF 330 en vez de REF 405.', [king]),
    [{ dicho: 'REF 785.', correcto: 'REF 965' }],
  );
  assert.deepEqual(totalesIncoherentes('Con box nube y tela premium la Toronto King te queda en REF 815.', [king]), [{ dicho: 'REF 815.', correcto: 'REF 965' }]);
  assert.deepEqual(totalesIncoherentes('La Toronto individual con box nube te queda en REF 635.', [tarjeta(48, 'Individual', null, { box: 'nube' })]),
    [{ dicho: 'REF 635.', correcto: 'REF 555' }]);
  assert.deepEqual(totalesIncoherentes('Te queda en REF 965. Y en stock tenemos la Toronto individual a REF 330 en vez de REF 405.', [king]), []);
});

test('totalesIncoherentes: los precios de las piezas en stock y de los copetes de las tarjetas valen en todo el texto', () => {
  const manila = tarjeta(31, 'Queen', null, { oferta: 420 });
  const mesas = tarjeta(67, '', null, { cantidad: 2 }); // 2 x 170 = 340
  // Ninguna oración nombra la oferta: REF 420 salía «mal sumado», con el total de la otra tarjeta como el exacto.
  assert.deepEqual(totalesIncoherentes('La Manila Queen gris 02 te queda en REF 420 y las 2 mesas Kenia en REF 340.', [manila, mesas]), []);
  assert.deepEqual(totalesIncoherentes('La Toronto Queen con box nube te queda en REF 700. Si la prefieres ya fabricada, la Manila '
    + 'Queen gris 02 te queda en REF 420.', [tarjeta(48, 'Queen', null, { box: 'nube' }), manila]), []);
  assert.deepEqual(totalesIncoherentes('El cabecero de la Manila King gris 01 te queda en REF 455 y las 2 mesas Kenia en REF 340.',
    [tarjeta(31, 'King', null, { oferta: 455 }), mesas]), []);
  // Un total mal sumado se sigue cazando, y ya no arrastra el precio de la pieza.
  const king = tarjeta(48, 'King', null, { box: 'nube', telaPremium: true }); // 665 + 150 + 150 = 965
  assert.deepEqual(totalesIncoherentes('La Toronto King con box nube y tela premium te queda en REF 815. También está la Toronto '
    + 'individual gris 02 a REF 330.', [king, tarjeta(48, 'Individual', null, { oferta: 330 })]), [{ dicho: 'REF 815.', correcto: 'REF 965' }]);
});

test('Tarjeta de una pieza en oferta: su precio en REF y en Bs, el de antes, color y tela; si no coincide, la normal', () => {
  const t = tarjeta(48, 'Individual', TASA, { oferta: 330, box: 'nube', telaPremium: true, cantidad: 2 });
  assert.equal(t.oferta, true);
  assert.equal(t.ref, 330);
  assert.equal(t.antes, 405);
  assert.equal(t.cantidad, 1); // la pieza es una sola, tal cual está
  assert.equal(t.box, null);
  assert.equal(t.talla, 'Individual 1,00x1,90 M');
  assert.equal(t.pieza, 'gris 02 en chenille paño');
  assert.equal(t.bs, '33.000,00');
  assert.equal(tarjeta(48, '', null, { oferta: 330 }).talla, 'Individual 1,00x1,90 M'); // sin medida: la de la pieza
  // Otra medida con ese precio no existe en la promo: tarjeta normal (Queen REF 550), nunca un precio cruzado.
  assert.equal(tarjeta(48, 'Queen', null, { oferta: 330 }).ref, 550);
  assert.equal(tarjeta(48, 'Queen', null, { oferta: 330 }).oferta, undefined);
  // Varias piezas al mismo precio: van todas en la descripción.
  assert.equal(tarjeta(39, 'Matrimonial', null, { oferta: 580 }).pieza, 'gris 01 en terciopelo / fucsia en terciopelo / rosa vieja en terciopelo');
  assert.equal(tarjeta(48, '', null).enOferta, true);
  assert.equal(tarjeta(1, '', null).enOferta, false);
  assert.deepEqual(ofertaElegida(29, 'Matrimonial 1,40x1,90 M', 495).map((o) => o.color), ['rosa viejo']);
});

test('Tarjeta con medida: «Hay oferta» solo si hay piezas en stock en esa medida; sin medida, si el modelo tiene alguna', async () => {
  assert.equal(tarjeta(48, 'Queen', null).enOferta, false); // las Toronto en stock son individual y matrimonial
  assert.equal(tarjeta(53, 'Queen 1,60x1,90 M', null).enOferta, false); // las Bruselas en stock son King
  assert.equal(tarjeta(53, 'King', null).enOferta, true);
  assert.equal(tarjeta(31, 'Queen', null).enOferta, true);
  assert.equal(tarjeta(48, 'Individual', null).enOferta, true);
  assert.equal(tarjeta(48, '', null).enOferta, true); // «desde»: el modelo tiene piezas en alguna medida
  // La web pinta «Hay oferta» con enOferta: la tarjeta de la Toronto Queen ya no lo dice.
  const r = await pensar([{ role: 'user', content: '¿Cuánto cuesta la Toronto queen?' }], 'web');
  assert.deepEqual(r.productos.map((t) => [t.nombre, t.talla, t.enOferta]), [['Toronto', 'Queen 1,60x1,90 M', false]]);
  config.PROMO = 'no';
  assert.equal(tarjeta(31, 'Queen', null).enOferta, false);
});

test('WhatsApp e Instagram: la línea del precio de la pieza y la ficha del modelo con sus piezas en oferta', () => {
  const t = tarjeta(48, 'Individual', TASA, { oferta: 330 });
  assert.equal(lineaPrecio(t, TASA),
    '• Toronto · Individual 1,00x1,90 M · 🏷️ oferta en stock (gris 02 en chenille paño): antes REF 405, ahora REF 330 = Bs 33.000,00 (tasa BCV euro 21/10/2026)');
  const ficha = fichaElegida(48, TASA);
  assert.match(ficha.caption, /🏷️ En stock con descuento: Individual gris 02 en chenille paño, a REF 330 \(antes REF 405\); Matrimonial gris en sedoso, a REF 395 \(antes REF 495\)\./);
  assert.match(ficha.texto, /En stock con descuento/);
  assert.doesNotMatch(fichaElegida(1, TASA).caption, /En stock con descuento/); // un sofá sin piezas en oferta
});

test('Copete en stock: su propia tarjeta con su precio (no la cama completa) y su línea sin «antes»', () => {
  const t = tarjeta(31, 'King', TASA, { oferta: 455 });
  assert.equal(t.ref, 455);
  assert.equal(t.unitario, 455);
  assert.equal(t.copete, true);
  assert.equal(t.oferta, false); // no es un descuento: no tiene precio anterior
  assert.equal(t.enOferta, false);
  assert.equal(t.antes, undefined);
  assert.equal(t.talla, 'King 2,00x2,00 M');
  assert.equal(t.pieza, 'gris 01 en terciopelo');
  assert.equal(t.bs, '45.500,00');
  assert.equal(t.cantidad, 1);
  assert.equal(t.partes, null);
  const linea = lineaPrecio(t, TASA);
  assert.equal(linea, '• Copete (solo el cabecero) Manila · King 2,00x2,00 M · en stock (gris 01 en terciopelo): REF 455 = Bs 45.500,00 (tasa BCV euro 21/10/2026)');
  assert.doesNotMatch(linea, /antes/);
  assert.equal(tarjeta(31, '', null, { oferta: 455 }).talla, 'King 2,00x2,00 M'); // sin medida: la del copete
  assert.equal(tarjeta(28, 'Matrimonial', null, { oferta: 330 }).pieza, 'gris 01 en terciopelo / gris 01 en chenille paño');
  for (const [id, talla, precio] of [[44, 'Queen', 435], [45, 'King', 835], [30, 'King', 835], [32, 'Individual', 315]]) {
    assert.equal(tarjeta(id, talla, null, { oferta: precio }).ref, precio, `${id} ${talla}`);
  }
  assert.deepEqual(copeteElegido(31, 'King 2,00x2,00 M', 455).map((c) => c.color), ['gris 01']);
  // En otra medida no hay copete a ese precio: la tarjeta normal de la cama (Manila Queen REF 520).
  assert.equal(tarjeta(31, 'Queen', null, { oferta: 455 }).ref, 520);
  config.PROMO = 'no';
  assert.equal(tarjeta(31, 'King', null, { oferta: 455 }).ref, 760);
});

test('«¿Qué camas tienen en oferta?»: sin la vitrina de camas a precio de catálogo, que taparía las piezas en oferta', async () => {
  for (const pregunta of ['¿Qué camas tienen en oferta?', 'Muéstrame las camas en descuento', 'quiero ver las camas de la promo']) {
    const r = await pensar([{ role: 'user', content: pregunta }], 'whatsapp');
    assert.equal(r.vitrina, null, pregunta);
    assert.ok(r.productos.length > 0, pregunta); // las tarjetas que eligió la IA
  }
  assert.equal((await pensar([{ role: 'user', content: 'Quiero ver camas' }], 'whatsapp')).vitrina?.clave, 'camas');
  // Sin promo no hay piezas que mostrar: la vitrina de siempre.
  config.PROMO = 'no';
  assert.equal((await pensar([{ role: 'user', content: '¿Qué camas tienen en oferta?' }], 'whatsapp')).vitrina?.clave, 'camas');
});

test('Pregunta por ofertas en sofás, mesas o puffs (no hay piezas en stock que tapar): su vitrina va igual; en camas, no', async () => {
  for (const [pregunta, clave] of [
    ['¿Qué sofás tienen en oferta?', 'sofas'],
    ['Muéstrame las mesas de noche. ¿Hay alguna promo?', 'mesas'],
    ['¿Qué puffs tienen? ¿Y hay ofertas?', 'puffs'],
    ['Vi la promo, ¿qué sofás tienen?', 'sofas'],
    ['¿Qué camas tienen en oferta?', null],
    ['Me interesa la promo, ¿qué camas hay?', null],
  ]) {
    assert.equal((await pensar([{ role: 'user', content: pregunta }], 'whatsapp')).vitrina?.clave ?? null, clave, pregunta);
  }
});

test('La línea de las piezas en oferta y el enlace del catálogo de ofertas van una vez, no en cada respuesta', async () => {
  const historial = [];
  const turno = async (texto) => {
    historial.push({ role: 'user', content: texto });
    const r = await pensar([...historial], 'whatsapp');
    historial.push({ role: 'assistant', content: r.respuesta }); // como lo guardan WhatsApp e Instagram
    return r.respuesta;
  };
  // La IA de prueba responde la Manila Queen sin hablar de ofertas en los tres turnos.
  const manila = [await turno('¿Cuánto cuesta la Manila queen?'), await turno('¿Y la Manila cuánto tarda?'), await turno('La Manila la quiero en Zaga roja')];
  assert.deepEqual(manila.map((r) => r.includes('🏷️ En stock con descuento: Queen')), [true, false, false]);
  // El enlace: la primera vez que pregunta por descuentos; después, solo si vuelve a pedir el catálogo de ofertas.
  const enlace = [await turno('¿Tienen descuentos?'), await turno('¿Y qué otros descuentos hay?'), await turno('Pásame otra vez el catálogo de ofertas')];
  assert.deepEqual(enlace.map((r) => r.includes(PROMO.enlace)), [true, false, true]);
});

test('Si la IA no menciona las piezas en oferta del modelo que preguntan, el servidor agrega la línea', async () => {
  assert.equal(ofertasDelModelo(31, 'Queen 1,60x1,90 M'),
    '🏷️ En stock con descuento: Queen gris 02 en chenille paño / gris oscuro en lino / gris 01 en terciopelo, a REF 420 (antes REF 520).');
  assert.equal(ofertasDelModelo(1), ''); // un sofá sin piezas en oferta
  // La IA de prueba responde la Manila Queen sin hablar de ofertas: hay tres Manila Queen en stock, va la línea.
  const r = await pensar([{ role: 'user', content: '¿Cuánto es la Manila queen?' }], 'whatsapp');
  assert.ok(r.respuesta.endsWith('🏷️ En stock con descuento: Queen gris 02 en chenille paño / gris oscuro en lino / gris 01 en terciopelo, a REF 420 (antes REF 520).'), r.respuesta);
  // La Toronto Queen no tiene piezas en stock en esa medida: a quien la quiere no le sirven la individual ni la matrimonial.
  assert.doesNotMatch((await pensar([{ role: 'user', content: '¿Cuánto es la Toronto queen?' }], 'whatsapp')).respuesta, /En stock con descuento/);
  assert.ok(hayOfertaEn(48, '') && hayOfertaEn(48, 'Individual 1,00x1,90 M') && !hayOfertaEn(48, 'Queen 1,60x1,90 M'));
  config.PROMO = 'no';
  assert.doesNotMatch((await pensar([{ role: 'user', content: '¿Cuánto es la Manila queen?' }], 'whatsapp')).respuesta, /En stock con descuento/);
});

test('dekog.net/ofertas abre el PDF de la promo y trae su vista previa (JPEG 1200 x 630); los rewrites van antes del comodín', () => {
  const leer = (ruta) => readFileSync(new URL(`../../${ruta}`, import.meta.url));
  const html = leer('public/ofertas.html').toString('utf8');
  assert.equal(PROMO.enlace, 'https://www.dekog.net/ofertas');
  // Página de verdad, la misma para todos: sin redirección (Instagram no la mostraba como enlace, 21-oct).
  assert.ok(!/location\.(replace|assign|href)|http-equiv="refresh"/i.test(html), 'ofertas.html no redirige');
  assert.ok(html.includes(`href="${PROMO.pdf}"`), 'el botón lleva al PDF de promo.js');
  assert.ok(html.includes(`src="${PROMO.pdf.replace(/\/view.*$/, '/preview')}"`), 'el visor muestra el PDF de promo.js');
  for (const numero of ['584145847791', '584244006086']) assert.ok(html.includes(`https://wa.me/${numero}?text=`), `falta la línea ${numero}`);
  const imagen = /property="og:image" content="https:\/\/www\.dekog\.net\/([^"]+)"/.exec(html)[1];
  const bytes = leer(`public/${imagen}`);
  assert.deepEqual([...bytes.subarray(0, 3)], [0xff, 0xd8, 0xff], `${imagen} no es JPEG`);
  let i = 2;
  while (i < bytes.length && !(bytes[i] === 0xff && bytes[i + 1] === 0xc0)) i += 2 + bytes.readUInt16BE(i + 2);
  assert.deepEqual([bytes.readUInt16BE(i + 7), bytes.readUInt16BE(i + 5)], [1200, 630], 'ancho y alto de la vista previa');
  const { rewrites } = JSON.parse(leer('vercel.json').toString('utf8'));
  const comodin = rewrites.findIndex((r) => r.destination === '/index.html');
  for (const [origen, destino] of [['/ofertas', '/ofertas.html'], ['/a/:codigo', 'https://dekog-asistente.dekog-web.workers.dev/a/:codigo']]) {
    const k = rewrites.findIndex((r) => r.source === origen && r.destination === destino);
    assert.ok(k >= 0 && k < comodin, `${origen} va antes del comodín`);
  }
});

test('Qué cuenta como pedir ofertas y como pedir el catálogo de ofertas', () => {
  for (const s of ['¿Tienen descuentos?', 'hay alguna promo?', 'Vi la promoción', 'Pudiera enviarme el catálogo de ofertas', 'qué tienen en stock']) {
    assert.ok(pideOfertas(s), s);
  }
  for (const s of ['¿Cuánto sale la Toronto?', 'Pásame el catálogo', 'hola']) assert.ok(!pideOfertas(s), s);
  assert.ok(pideCatalogoDeOfertas('Buenas noches... Pudiera por favor enviarme el catálogo de ofertas... Gracias'));
  assert.ok(!pideCatalogoDeOfertas('Pásame el catálogo de camas'));
  for (const s of ['Pásame el catálogo de la promo', 'el catálogo de la promoción', 'catálogo de la oferta', 'el catálogo con las ofertas',
    'el catálogo de productos en oferta', 'el catálogo en descuento', 'catálogo de las ofertas', 'catálogo de stock', 'catálogo de descuentos',
    'catalogo de la promo', 'el catálogo de mobiliario en stock']) {
    assert.ok(pideCatalogoDeOfertas(s), s);
  }
  for (const s of ['el catálogo', 'el catálogo de mobiliario', 'catálogo de sofás', '¿hacen modelos fuera del catálogo?', 'el catálogo de camas no tiene descuentos']) {
    assert.ok(!pideCatalogoDeOfertas(s), s);
  }
});

test('Web: preguntar por descuentos trae el enlace del catálogo de ofertas; «el catálogo de ofertas» no manda los otros dos', async () => {
  const r = await pensar([{ role: 'user', content: '¿Tienen descuentos o alguna promoción?' }], 'web');
  assert.ok(r.respuesta.endsWith(`🏷️ Catálogo de ofertas:\n${PROMO.enlace}`), r.respuesta); // el enlace solo en su línea
  for (const pedido of ['Buenas noches... Pudiera por favor enviarme el catálogo de ofertas... Gracias', 'Pásame el catálogo de la promo']) {
    const o = await pensar([{ role: 'user', content: pedido }], 'web');
    assert.ok(o.respuesta.includes(PROMO.enlace), pedido);
    for (const [, url] of catalogosPdf) assert.ok(!o.respuesta.includes(url), pedido);
  }
  const c = await pensar([{ role: 'user', content: 'Pásame el catálogo' }], 'web');
  assert.ok(catalogosPdf.every(([, url]) => c.respuesta.includes(url)));
  assert.ok(!c.respuesta.includes(PROMO.enlace));
  // Sin promo, nada de enlace.
  config.PROMO = 'no';
  assert.ok(!(await pensar([{ role: 'user', content: '¿Tienen descuentos?' }], 'web')).respuesta.includes(PROMO.enlace));
});

// ── El mensaje de la promo después de la bienvenida ─────────────────────────────────────────────────────────────

test('WhatsApp: «Hola» → el saludo de la dueña y DESPUÉS la promo (imagen, texto y botón «Ver ofertas»); solo una vez', async () => {
  await wa(textoWa('Hola'));
  const [saludo, promo] = mensajesWa();
  assert.equal(mensajesWa().length, 2);
  assert.match(saludo.text.body, /Bienvenido a \*DEKOG\*/);
  assert.equal(promo.interactive.type, 'cta_url');
  assert.equal(promo.interactive.header.image.link, PROMO.imagen);
  assert.match(promo.interactive.body.text, /^🏷️ \*¡Tenemos promo!\* Hasta \*20 % de descuento\* en mobiliario en stock/);
  assert.deepEqual(promo.interactive.action.parameters, { display_text: 'Ver ofertas', url: PROMO.enlace });
  assert.equal(estadoWa().promoVista, PROMO.id);
  await wa(textoWa('¿Cuánto es la Toronto queen?'));
  assert.equal(mensajesWa().length, 3); // la respuesta, sin otra promo
});

test('WhatsApp: si Meta rechaza el botón, la imagen con el enlace; un cliente que ya escribía antes la recibe una vez', async () => {
  usar({ rechazar: (c) => c.interactive?.type === 'cta_url' && Boolean(c.interactive.header?.image?.link?.includes('/promo/')) });
  // Otro número: el que ya recibió la promo en la prueba anterior queda recordado en la memoria del módulo.
  await env.CONVERSACIONES.put('wa:PHONE123:584140000005', JSON.stringify({ mensajes: [{ role: 'user', content: 'hola' }, { role: 'assistant', content: 'Hola' }] }));
  await wa(textoWa('¿Cuánto es la Toronto queen en bolívares?'), '584140000005');
  const promo = mensajesWa().at(-1);
  assert.equal(promo.type, 'image');
  assert.equal(promo.image.link, PROMO.imagen);
  assert.ok(promo.image.caption.includes(PROMO.enlace));
});

test('WhatsApp: un sticker no se responde; dos notas de voz el mismo día → UN aviso', async () => {
  await wa({ type: 'sticker', sticker: { id: 's1' } });
  assert.equal(meta.enviados.length, 0);
  await wa({ type: 'audio', audio: { id: 'a1' } });
  await wa({ type: 'audio', audio: { id: 'a2' } });
  const avisos = mensajesWa().filter((m) => /notas de voz/.test(m.text?.body ?? ''));
  assert.equal(avisos.length, 1);
});

test('Instagram: «Hola» → el saludo, la imagen de la promo y su texto con el enlace; la segunda vez, sin promo', async () => {
  await ig({ text: 'Hola' });
  const envios = enviosIg();
  assert.match(sinMarca(envios[0].text), /Bienvenido a DEKOG/);
  assert.equal(envios[1].attachment.payload.url, PROMO.imagen);
  assert.ok(sinMarca(envios[2].text).includes(`Mira todas las ofertas aquí 👇\n${PROMO.enlace}\n\n`), envios[2].text);
  await ig({ text: '¿Cuánto es la Toronto queen?' });
  assert.equal(enviosIg().filter((m) => m.attachment?.payload?.url === PROMO.imagen).length, 1);
  assert.equal(estadoIg().promoVista, PROMO.id);
});

// ── Lo que el cliente comparte en Instagram ─────────────────────────────────────────────────────────────────────

test('Instagram: compartir una publicación ya no responde «solo puedo leer…»: la IA ve su imagen y su pie', async () => {
  const titulo = 'Hasta 20% de descuento en todo nuestro stock. Escríbenos al 0412-4423350 o a @dekog.home';
  await ig({ attachments: [{ type: 'ig_post', payload: { url: 'https://cdn.falso/post.jpg', title: titulo } }] });
  assert.deepEqual(descargas, ['https://cdn.falso/post.jpg']);
  assert.ok(!textosIg().some((t) => /solo puedo leer/i.test(t)));
  const [primero] = estadoIg().mensajes;
  assert.match(primero.content, /^\[Foto del cliente\] \(compartió una publicación de Instagram: «Hasta 20% de descuento en todo nuestro stock\./);
  assert.doesNotMatch(primero.content, /dato personal|0412|@dekog/); // el pie es de la publicación: sin teléfonos ni usuarios
  assert.ok(textosIg()[0].includes(PROMO.enlace)); // habla de descuentos: va el enlace de las ofertas
});

test('Instagram: reel compartido y respuesta a una historia en video → la IA sabe qué es (sin descargar el video)', async () => {
  await ig({ attachments: [{ type: 'ig_reel', payload: { url: 'https://cdn.falso/reel.mp4', title: 'Cama Toronto' } }] });
  assert.match(estadoIg().mensajes[0].content, /^\(compartió un reel de Instagram: «Cama Toronto»\)$/);
  await ig({ text: '¿Precio?', reply_to: { story: { url: 'https://cdn.falso/historia.mp4', id: '1' } } }, 'IGSID2');
  assert.equal(estadoIg('IGSID2').mensajes[0].content, '(respondió a una historia de Dekog) ¿Precio?');
  assert.ok(textosIg().length >= 2);
});

test('Instagram: nota de voz → UN aviso al día; mención en una historia y GIF que no abre → silencio', async () => {
  await ig({ attachments: [{ type: 'audio', payload: { url: 'https://cdn.falso/a.mp4' } }] });
  await ig({ attachments: [{ type: 'audio', payload: { url: 'https://cdn.falso/b.mp4' } }] });
  assert.equal(textosIg().filter((t) => /no puedo escuchar notas de voz/.test(t)).length, 1);
  const antes = enviosIg().length;
  await ig({ attachments: [{ type: 'story_mention', payload: { url: 'https://cdn.falso/m.jpg' } }] }, 'IGSID3');
  await ig({ attachments: [{ type: 'image', payload: { url: 'https://cdn.falso/gif.mp4' } }] }, 'IGSID4');
  assert.equal(enviosIg().length, antes);
});

// ── Piezas sueltas ───────────────────────────────────────────────────────────────────────────────────────────────

test('nombreEscrito: el nombre al dejar los datos, solo con teléfono o con «me llamo / soy»', () => {
  assert.equal(nombreEscrito('María Pérez 0414-555-1234', '04145551234'), 'María Pérez');
  assert.equal(nombreEscrito('hola, soy Ana y mi número es 0412 123 4567', '04121234567'), 'Ana');
  assert.equal(nombreEscrito('me llamo José Luis', ''), 'José Luis');
  assert.equal(nombreEscrito('ok gracias', ''), '');
  assert.equal(nombreEscrito('04145551234', '04145551234'), '');
});

test('unirSeguidos: dos mensajes seguidos del mismo lado van en uno', () => {
  const unidos = unirSeguidos([
    { role: 'user', content: 'a' }, { role: 'user', content: 'b' }, { role: 'assistant', content: 'c' }, { role: 'assistant', content: 'd' }, { role: 'user', content: 'e' },
  ]);
  assert.deepEqual(unidos, [{ role: 'user', content: 'a\nb' }, { role: 'assistant', content: 'c\nd' }, { role: 'user', content: 'e' }]);
});
