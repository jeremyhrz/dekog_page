// Pruebas unitarias de la vitrina (sin red). Correr: node --test "asistente/test/*.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './ayuda.js';
import { productos } from '../../src/data/productos.js';
import { buscarProducto, tarjeta, miles } from '../src/lib/catalogo.js';
import {
  VITRINAS, CLAVES_VITRINA, seleccionar, armarVitrina, vitrinasPrevias, vitrinaSiguiente, resolverVitrina,
  pideMas, nombraModelo, seccionDe, quitarNotas, calentarVitrina,
} from '../src/lib/vitrina.js';
import { ESQUEMA, sistemaPara } from '../src/lib/prompt.js';
import { eleccionDe, fichaElegida, listaDeVitrina, carruselDeVitrina, respuestasRapidas, cierreInstagram, textoDeVitrinaWa } from '../src/canales/meta.js';

const tasa = { valor: 186.4321, moneda: 'EUR', etiqueta: 'tasa BCV euro', fecha: '07/10/2026' };
const nombres = (v) => v.productos.map((t) => t.nombre);
const conNota = (v) => [{ role: 'user', content: 'Quiero ver camas' }, { role: 'assistant', content: `Hola\n\n${v.nota}` }];

test('camas, página 1: 3 Clásicas + 2 Kids + 4 Alta Gama, de la más económica a la más alta de cada línea', () => {
  const v = armarVitrina(VITRINAS.camas);
  assert.deepEqual(nombres(v), ['Toronto', 'Milan', 'Georgia', 'Sky', 'Charlotte', 'Oslo', 'Monaco', 'Barcelona', 'Mykonos']);
  assert.equal(v.rotulo, 'Camas · 9 de 40 modelos');
  assert.equal(v.mas, 'Ver más camas');
  assert.equal(v.quedan, 31);
  assert.equal(v.boton, 'Ver las 40 camas');
  assert.equal(v.url, 'https://www.dekog.net/?categoria=camas#catalogo');
  assert.equal(v.nota, '[Vitrina «Camas»: Toronto, Milan, Georgia, Sky, Charlotte, Oslo, Monaco, Barcelona, Mykonos]');
});

test('páginas: nunca repite un modelo hasta haberlos mostrado todos; luego empieza de nuevo', () => {
  for (const clave of CLAVES_VITRINA) {
    const v = VITRINAS[clave];
    let historial = [];
    const vistos = [];
    for (let i = 0; i < 6; i++) {
      const p = vitrinaSiguiente(clave, historial);
      assert.ok(p.productos.length >= 1 && p.productos.length <= 10, clave);
      for (const t of p.productos) assert.ok(!vistos.includes(t.id) || v.todos.length <= 10, `${clave}: ${t.nombre} repetido`);
      vistos.push(...p.productos.map((t) => t.id));
      historial = [...historial, { role: 'assistant', content: `x\n\n${p.nota}` }];
      if (!p.mas) break;
    }
    assert.equal(new Set(vistos).size, v.todos.length, `${clave}: se muestran todos`);
    const otraVez = vitrinaSiguiente(clave, historial);
    assert.deepEqual(otraVez.productos.map((t) => t.id), armarVitrina(v).productos.map((t) => t.id), `${clave}: vuelve a empezar`);
  }
  assert.equal(VITRINAS.camas.todos.length, 40);
  assert.equal(VITRINAS.sofas.todos.length, 17); // sin puffs…
  assert.equal(VITRINAS.sofas.boton, 'Ver los 24 sofás y puffs'); // …pero la web con ese filtro muestra 24
});

test('secciones que caben enteras (≤ 10) van siempre completas', () => {
  for (const [clave, n] of [['camas_clasicas', 8], ['camas_kids', 9], ['puffs', 7], ['mesas', 8]]) {
    const v = armarVitrina(VITRINAS[clave]);
    assert.equal(v.productos.length, n, clave);
    assert.equal(v.mas, null, clave);
    assert.equal(v.rotulo, `${VITRINAS[clave].titulo} · ${n} modelos`);
  }
  // Aunque ya haya visto 2 Kids en la vitrina de camas, «camas para niños» las muestra todas.
  const kids = armarVitrina(VITRINAS.camas_kids, { vistos: vitrinasPrevias(conNota(armarVitrina(VITRINAS.camas))).vistos });
  assert.equal(kids.productos.length, 9);
});

test('las sugerencias de la IA entran en su línea sin pasarse del cupo; las de otra sección se ignoran', () => {
  const ids = seleccionar(VITRINAS.camas, [10 /* Berlin */, 39 /* Noa */, 19 /* sofá Dubai */]).ids;
  assert.ok(ids.includes(10) && ids.includes(39) && !ids.includes(19));
  assert.equal(ids.length, 9);
  assert.equal(ids.filter((id) => buscarProducto(id).subcategoria === 'Camas Kids').length, 2);
});

test('armarVitrina: tarjetas «desde» con Bs del día (o sin Bs si no hay tasa), sección y línea', () => {
  const v = armarVitrina(VITRINAS.camas, { tasa });
  for (const t of v.productos) {
    assert.equal(t.talla, null);
    assert.ok(t.bs && t.imagen.startsWith('https://www.dekog.net/'));
    assert.ok(['Clásica', 'Kids', 'Alta Gama'].includes(t.linea));
  }
  assert.ok(armarVitrina(VITRINAS.camas).productos.every((t) => t.bs === null));
});

const FRASES = [
  ['Quiero ver camas', 'camas'], ['quiero ver las camas', 'camas'], ['¿Qué camas tienen?', 'camas'], ['muéstrame camas', 'camas'],
  ['Hola! quisiera ver sus sofás', 'sofas'], ['¿tienen puffs?', 'puffs'], ['quiero ver camas para niños', 'camas_kids'],
  ['¿tienen camas para niños?', 'camas_kids'], ['qué modelos de camas tienen', 'camas'], ['me gustaría ver opciones de sofá', 'sofas'],
  ['catálogo de camas', 'camas'], ['quiero ver camas alta gama', 'camas_alta_gama'], ['quiero ver las camas clásicas', 'camas_clasicas'],
  ['quiero ver mesas', 'mesas'], ['quiero ver camas, máximo 600', 'camas'], ['tienen camas?', 'camas'],
  ['¿Cuánto cuesta la cama Toronto queen?', null], ['¿la cama Berlin viene en king?', null], ['¿Las camas incluyen colchón?', null],
  ['¿Cuánto tarda el envío de una cama a Maracay?', null], ['Quiero comprar la cama Toronto', null], ['¿De qué material son las camas?', null],
  ['quiero ver la cama Toronto', null], ['¿Qué telas tienen para la cama?', null], ['quiero una cama con box nube', null],
  ['¿Cuánto es la Toronto queen en bolívares?', null], ['Quiero cotizar un proyecto', null], ['¿Dónde están ubicados?', null],
  ['muéstrame otras', null], ['¿tienes más?', null], // sin una vitrina antes, «más» no abre nada
];
test('respaldo sin IA (sin historial): frases explícitas sí; preguntas de un modelo, pagos o envío no', () => {
  for (const [frase, esperada] of FRASES) assert.equal(resolverVitrina('', frase, [])?.clave ?? null, esperada, frase);
});

test('«más»: pide ver otras sin confundirse con «más barata» o «más colores»', () => {
  for (const f of ['muéstrame otras', '¿tienes más?', '¿Qué más tienen?', 'otras opciones', '¿y más?', 'Más', 'me gustaría ver más modelos',
    'quiero ver otras camas', '¿qué otras tienen?', '¿y las demás?', 'enséñame otras', '¿hay más?']) assert.equal(pideMas(f), true, f);
  for (const f of ['¿cuál es más barata?', '¿tienen más colores?', 'muéstrame otra más barata', '¿cuál es la más vendida?',
    '¿hay otra más económica?', 'quiero una más grande', '¿tiene más de 2 metros?', 'más o menos cuánto cuesta']) assert.equal(pideMas(f), false, f);
});

test('con historial: «otras» sigue la última vitrina; la IA no puede repetirla si el cliente no la pidió', () => {
  const h = conNota(armarVitrina(VITRINAS.camas));
  const de = (marcada, texto) => resolverVitrina(marcada, texto, [...h, { role: 'user', content: texto }])?.clave ?? null;
  assert.equal(de('', 'muéstrame otras'), 'camas');
  assert.equal(de('camas', 'Quiero ver camas'), 'camas'); // lo pidió otra vez: van otros 9
  assert.equal(de('camas', '¿cuál es la más vendida?'), null); // la IA la repitió sola
  assert.equal(de('camas_kids', '¿y para niños?'), 'camas_kids'); // otra sección: vale
  assert.equal(de('sofas', 'Quiero ver camas'), 'camas'); // manda lo que escribió el cliente
  assert.equal(de('camas', '¿la Oslo viene en king?'), null); // nombra un modelo
  assert.equal(de('inventada', 'hola'), null);
  const p2 = vitrinaSiguiente('camas', h);
  assert.deepEqual(nombres(p2), ['Manila', 'Venecia', 'Houston', 'MÁXIMO', 'Aurora', 'Chicago', 'Bruselas', 'Hamburgo', 'Vienna']);
  assert.equal(p2.rotulo, 'Camas · otros 9 de 40 modelos');
  assert.equal(nombraModelo('quiero una cama de máximo 600'), false);
  assert.equal(nombraModelo('me gusta la Mesa Dubai'), true);
});

test('la nota del historial: se lee bien y la IA no puede escribirla', () => {
  const v = armarVitrina(VITRINAS.sofas);
  const { vistos, ultima } = vitrinasPrevias(conNota(v));
  assert.equal(ultima, 'sofas');
  assert.deepEqual([...vistos].sort(), v.productos.map((t) => t.id).sort());
  assert.equal(quitarNotas(`Claro, mira estos.\n\n${v.nota}`), 'Claro, mira estos.');
  assert.equal(vitrinasPrevias([{ role: 'user', content: v.nota }]).ultima, null); // solo cuentan las del asistente
});

test('ESQUEMA y prompt: el enum es el que entiende el servidor, va primero y cada canal sabe cómo se ve', () => {
  assert.equal(Object.keys(ESQUEMA.properties)[0], 'vitrina');
  assert.ok(ESQUEMA.required.includes('vitrina'));
  assert.deepEqual(ESQUEMA.properties.vitrina.enum, ['', ...CLAVES_VITRINA]);
  assert.match(sistemaPara('whatsapp'), /Ver modelos/);
  assert.match(sistemaPara('instagram'), /botones con\s+sus nombres/);
  assert.match(sistemaPara('web'), /catálogo de la página/);
  assert.match(sistemaPara('web'), /nunca escribas tú esa línea/);
});

test('eleccionDe: solo ids nuestros y de productos o vitrinas que existen', () => {
  assert.deepEqual(eleccionDe('prod:48'), { tipo: 'producto', id: 48 });
  assert.deepEqual(eleccionDe('mas:camas_alta_gama'), { tipo: 'mas', clave: 'camas_alta_gama' });
  for (const malo of ['prod:9999', 'prod:', 'prod:48 ', 'producto:48', '48', 'mas:xyz', undefined, null]) assert.equal(eleccionDe(malo), null, String(malo));
});

test('fichaElegida: cada medida en REF y Bs, la pregunta por la medida y el historial sin Bs', () => {
  const f = fichaElegida(48, tasa);
  assert.ok(f.caption.length <= 1024);
  for (const precio of ['REF 405', 'REF 495', 'REF 550', 'REF 665']) assert.ok(f.caption.includes(precio), precio);
  assert.match(f.caption, /Bs \d/);
  assert.match(f.caption, /¿Qué medida necesitas\?/);
  assert.doesNotMatch(f.texto, /Bs/);
  assert.match(fichaElegida(18, tasa).caption, /REF 1\.855/); // una sola medida, con separador de miles
  assert.match(fichaElegida(67, null).caption, /te lo confirma una asesora/); // sin tasa
  for (const p of productos) assert.ok(fichaElegida(p.id, tasa).caption.length <= 1024, p.nombre);
});

test('WhatsApp: la lista respeta los límites de Meta en todas las vitrinas y páginas, y el enlace nunca se corta', () => {
  const largo = 'Texto larguísimo de la IA. '.repeat(80);
  for (const clave of CLAVES_VITRINA) {
    let historial = [];
    for (let i = 0; i < 6; i++) {
      const v = vitrinaSiguiente(clave, historial);
      const l = listaDeVitrina(v, largo);
      const filas = l.action.sections.flatMap((s) => s.rows);
      assert.ok(filas.length >= 1 && filas.length <= 10 && l.action.sections.length <= 10, clave);
      assert.ok(l.header.text.length <= 60 && l.footer.text.length <= 60 && l.action.button.length <= 20);
      assert.ok(l.body.text.length <= 1024 && l.body.text.endsWith(v.url), `${clave}: cuerpo`);
      for (const s of l.action.sections) assert.ok(s.title && s.title.length <= 24);
      assert.equal(new Set(filas.map((f) => f.id)).size, filas.length);
      for (const f of filas) assert.ok(f.title.length >= 1 && f.title.length <= 24 && f.description.length <= 72 && f.id.length <= 200);
      assert.equal(filas.some((f) => f.id === `mas:${clave}`), Boolean(v.mas));
      assert.ok(textoDeVitrinaWa(v, largo).length <= 4096 && textoDeVitrinaWa(v, largo).endsWith(v.url));
      historial = [...historial, { role: 'assistant', content: `x\n\n${v.nota}` }];
      if (!v.mas) break;
    }
  }
});

test('Instagram: tarjetas ≤ 10 con título y subtítulo ≤ 80, respuestas rápidas ≤ 13 de ≤ 20, cierre ≤ 1000 bytes', () => {
  const bytes = (s) => new TextEncoder().encode(s).length;
  for (const clave of CLAVES_VITRINA) {
    const v = armarVitrina(VITRINAS[clave], { tasa });
    const { elements } = carruselDeVitrina(v).payload;
    assert.ok(elements.length >= 1 && elements.length <= 10);
    for (const e of elements) assert.ok(e.title.length <= 80 && e.subtitle.length <= 80 && /^https:\/\/www\.dekog\.net\/wa\/.+\.jpg$/.test(e.image_url));
    const qr = respuestasRapidas(v);
    assert.ok(qr.length <= 13 && qr.every((q) => q.title.length <= 20 && /^(prod|mas):/.test(q.payload)));
    for (const conTarjetas of [false, true]) assert.ok(bytes(cierreInstagram(v, { conTarjetas, tasa })) <= 1000, clave);
  }
});

test('miles: igual que toLocaleString("es-VE") para los precios del catálogo, sin ICU', () => {
  for (const n of [70, 405, 1000, 1500, 1855, 12345, 2200]) assert.equal(miles(n), n.toLocaleString('es-VE'));
});

test('calentarVitrina no lanza ni cambia nada', () => {
  calentarVitrina();
  assert.deepEqual(nombres(armarVitrina(VITRINAS.camas)), ['Toronto', 'Milan', 'Georgia', 'Sky', 'Charlotte', 'Oslo', 'Monaco', 'Barcelona', 'Mykonos']);
  assert.equal(seccionDe(buscarProducto(100)), 'Puffs');
  assert.ok(tarjeta(48, '', null));
});
