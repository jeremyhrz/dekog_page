// La web en iPhone viejos y las rutas que no existen, sin navegador: la guarda scripts/compatibilidad.mjs (corre antes de
// cada build, también en Vercel) y qué muestra la página de una ruta desconocida (src/utils/rutas.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execPath } from 'node:process';
import { fileURLToPath } from 'node:url';
import { archivosDeLaWeb, revisar } from '../../scripts/compatibilidad.mjs';
import { rutaDesconocida } from '../../src/utils/rutas.js';

const GUARDA = fileURLToPath(new URL('../../scripts/compatibilidad.mjs', import.meta.url));
const leer = (ruta) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8');

test('Guarda de iPhone viejos: encuentra cada API y sintaxis que no existe ahí', () => {
  for (const codigo of [
    'const imagen = ultimoCliente === conversacionActual.at(-1) ? f() : undefined;', // el chat fallaba en cada mensaje
    'x[0].at(1)', 'f().at(0)', 'lista?.at(-1)', 'texto.at(-1)',
    'const cat = valor && Object.hasOwn(CATEGORIA_DE_URL, valor);', // la página en blanco con ?categoria=
    "promesaPanel ??= import('./asistente/AsistentePanel');", 'a ||= b;', 'a &&= b;', // el sitio en blanco en iOS 13
    'items.findLast((i) => i.rol)', 'items.findLastIndex((i) => i.rol)', 'const copia = structuredClone(estado);',
    'lista.toSorted()', 'lista.toReversed()', 'lista.toSpliced(0, 1)',
    'fetch(url, { signal: AbortSignal.timeout(8000) })', 'AbortSignal.any([a, b])',
    'texto.split(/(?<=[.!?])\\s+/)', 'if (/(?<!box\\s)\\balta gama\\b/.test(t)) {}',
  ]) assert.ok(revisar(codigo).length, codigo);
  assert.deepEqual(revisar('uno\nconst u = lista.at(-1);\ntres').map((h) => h.linea), [2]);
});

test('Guarda de iPhone viejos: no salta con los comentarios que las nombran ni con código parecido', () => {
  for (const codigo of [
    '// Sin findLastIndex ni .at(): no existen antes de iOS 15.4 y romperían el chat en iPhone viejos.',
    '// Object.hasOwn: con ?categoria=valueOf (o toString…) el objeto devolvería una función heredada',
    '// AbortSignal.timeout no existe en iOS < 16 ni en el WebView de Android < 103',
    'lista[lista.length - 1]', 'Object.prototype.hasOwnProperty.call(o, k)', 'if (!promesaPanel) promesaPanel = p;',
    'const a = b ?? c; const d = e || f; const g = h && i; if (a === b || c <= d || e >= f) g();',
    'texto.concat(otro).format(1)', 'datos.atras(1)', 'const f = lista.at;', 'const r = /(?<letras>[A-Za-z0-9]{6})/;',
  ]) assert.deepEqual(revisar(codigo), [], codigo);
});

test('La web de hoy pasa la guarda: src/ y lo que importa del asistente (negocio.js, promo.js y config.js), no el Worker', () => {
  const archivos = archivosDeLaWeb();
  const rutas = archivos.map((a) => a.replace(/\\/g, '/'));
  for (const lib of ['negocio.js', 'promo.js', 'config.js']) assert.ok(rutas.some((a) => a.endsWith(`/asistente/src/lib/${lib}`)), lib);
  assert.ok(!rutas.some((a) => /\/asistente\/src\/(chat|lib\/vitrina|lib\/enlaces)\.js$/.test(a)), 'el Worker no va al navegador');
  assert.deepEqual(archivos.flatMap((a) => revisar(readFileSync(a, 'utf8')).map((h) => `${a}:${h.linea} ${h.motivo}`)), []);
});

test('Antes de cada build: si algo no existe en iPhone viejos sale con error y dice dónde, aunque venga de un import', () => {
  assert.match(JSON.parse(leer('package.json')).scripts.prebuild, /^node scripts\/compatibilidad\.mjs$/);
  const raiz = mkdtempSync(join(tmpdir(), 'dekog-compatibilidad-'));
  try {
    mkdirSync(join(raiz, 'src'));
    mkdirSync(join(raiz, 'asistente', 'src', 'lib'), { recursive: true });
    writeFileSync(join(raiz, 'src', 'main.jsx'), "import { elegir } from '../asistente/src/lib/vitrina.js';\nexport default elegir;\n");
    writeFileSync(join(raiz, 'asistente', 'src', 'lib', 'vitrina.js'), 'export const elegir = (o, k) => Object.hasOwn(o, k);\n');
    const mal = spawnSync(execPath, [GUARDA, raiz], { encoding: 'utf8' });
    assert.equal(mal.status, 1, mal.stdout + mal.stderr);
    assert.match(mal.stderr, /asistente[\\/]src[\\/]lib[\\/]vitrina\.js:1 +Object\.hasOwn/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
  const bien = spawnSync(execPath, [GUARDA], { encoding: 'utf8' });
  assert.equal(bien.status, 0, bien.stdout + bien.stderr);
  assert.match(bien.stdout, /nada que corregir/);
});

test('Ruta que no existe: /a… a las asesoras, /ofertas… a /ofertas (sin bucle) y lo demás «No encontramos esta página»', () => {
  // Las rutas llegan codificadas (location.pathname): la marca de Instagram es %E2%81%A3.
  for (const ruta of ['/a', '/a/', '/a/k3P9xQ1/', '/a/x/y', '/a%E2%81%A3', '/a.', '/A']) {
    assert.equal(rutaDesconocida(ruta), 'asesoras', ruta);
  }
  for (const ruta of ['/ofertas%E2%81%A3', '/ofertas.', '/ofertas/x', '/Ofertas', '/ofertas.html']) {
    assert.equal(rutaDesconocida(ruta), 'ofertas', ruta);
  }
  // /ofertas misma nunca se redirige: si llega a la web es que no hay rewrite, y volvería aquí sin parar.
  for (const ruta of ['/ofertas', '/ofertas/', '/abc', '/arquitecturas', '/producto/123']) {
    assert.equal(rutaDesconocida(ruta), 'no-encontrada', ruta);
  }
  // Y la ruta comodín existe, dentro del Layout (menú, pie y asistente a la vista), con el aviso de error alrededor.
  const app = leer('src/App.jsx');
  const comodin = app.indexOf('<Route path="*"');
  // Entre el comienzo del Layout y /links, que va fuera de él.
  assert.ok(comodin > app.indexOf('<Route element={<Layout') && comodin < app.indexOf('<Route path="/links"'), 'falta <Route path="*"> en el Layout');
  assert.ok(app.includes('<ErrorDePagina'), 'falta el aviso de error alrededor de las rutas');
});
