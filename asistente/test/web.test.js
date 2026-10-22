// La web en iPhone viejos y las rutas que no existen, sin navegador: la guarda scripts/compatibilidad.mjs (corre antes y
// después de cada build, también en Vercel), adónde manda vercel.json cada ruta y qué muestra la página de una ruta
// desconocida (src/utils/rutas.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execPath } from 'node:process';
import { fileURLToPath } from 'node:url';
import { archivosDeLaWeb, revisar, revisarSalida } from '../../scripts/compatibilidad.mjs';
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
    // Lo que faltaba (22-oct): la cadena que empieza la línea y APIs más nuevas.
    'lista\n.at(-1)', 'Object.groupBy(piezas, (p) => p.medida)', 'Map.groupBy(piezas, f)', 'const otra = lista.with(0, x);',
    'await Promise.any([a, b])', 'const { promise, resolve } = Promise.withResolvers();', 'const id = crypto.randomUUID();',
  ]) assert.ok(revisar(codigo).length, codigo);
  assert.deepEqual(revisar('uno\nconst u = lista.at(-1);\ntres').map((h) => h.linea), [2]);
  // El escenario: una cadena como las de AsistentePanel.jsx, con el .at( al comienzo de su propia línea.
  assert.deepEqual(revisar("const ultimo = conversacionActual\n  .filter((i) => i.rol === 'cliente')\n  .at(-1);").map((h) => h.linea), [3]);
});

test('Guarda de iPhone viejos: no salta con los comentarios que las nombran ni con código parecido', () => {
  for (const codigo of [
    '// Sin findLastIndex ni .at(): no existen antes de iOS 15.4 y romperían el chat en iPhone viejos.',
    '// Object.hasOwn: con ?categoria=valueOf (o toString…) el objeto devolvería una función heredada',
    '// AbortSignal.timeout no existe en iOS < 16 ni en el WebView de Android < 103',
    'lista[lista.length - 1]', 'Object.prototype.hasOwnProperty.call(o, k)', 'if (!promesaPanel) promesaPanel = p;',
    'const a = b ?? c; const d = e || f; const g = h && i; if (a === b || c <= d || e >= f) g();',
    'texto.concat(otro).format(1)', 'datos.atras(1)', 'const f = lista.at;', 'const r = /(?<letras>[A-Za-z0-9]{6})/;',
    ' * .at(-1) y .with() no existen antes de iOS 15.4 y 16;', "texto.startsWith('a') || texto.endsWith('b')", 'datos.withdraw(1)',
    // Con respaldo, como en src/components/asistente/comun.jsx.
    'export const nuevoId = () => crypto.randomUUID?.() ?? `${Date.now()}`;', '// Promise.any y Object.groupBy tampoco existen',
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

test('Después de cada build: un .js de dist/ que iOS 13 no lee (un campo de clase, ?. o ??) sale con error; una API solo avisa', () => {
  assert.match(JSON.parse(leer('package.json')).scripts.postbuild, /^node scripts\/compatibilidad\.mjs --salida$/);
  // esbuild rebaja la sintaxis de la web y de sus dependencias; sin el target, Vite compila para Safari 16.
  assert.match(leer('vite.config.js'), /target: \['es2020', 'safari13'\]/);
  const raiz = mkdtempSync(join(tmpdir(), 'dekog-salida-'));
  const guarda = () => spawnSync(execPath, [GUARDA, '--salida', raiz], { encoding: 'utf8' });
  try {
    assert.equal(guarda().status, 1, 'sin dist/ no hay nada que revisar: ¿cambió la carpeta del build?');
    mkdirSync(join(raiz, 'dist', 'static'), { recursive: true });
    const archivo = join(raiz, 'dist', 'static', 'index-a1b2c3.js');
    // Un campo de clase sin el target (ErrorDePagina escrita con «state = …», en el paquete principal): en iOS 13, la web
    // entera en blanco.
    writeFileSync(archivo, 'import{C as c}from"./react.js";class l extends c{state={fallo:!1};render(){return null}}export{l as E};');
    const mal = guarda();
    assert.equal(mal.status, 1, mal.stdout + mal.stderr);
    assert.match(mal.stderr, /dist[\\/]static[\\/]index-a1b2c3\.js:1 +no se lee como ES2020/);
    // Sin el target (o con solo 'es2020') el paquete principal trae ?. y ??: son ES2020, pero llegaron con iOS 13.4, y en
    // iOS 13.0–13.3 la web también queda en blanco.
    writeFileSync(archivo, 'export const f=(o)=>o?.a??1;');
    const sinTarget = guarda();
    assert.equal(sinTarget.status, 1, sinTarget.stdout + sinTarget.stderr);
    assert.match(sinTarget.stderr, /index-a1b2c3\.js:1 +no se lee en iOS 13\.0: encadenamiento opcional \(\?\.\) — iOS 13\.4/);
    // Como sale con el target: se lee bien. La cadena minificada queda en una sola línea y su .at() se ve, pero solo
    // avisa: en dist/ no se distingue de una dependencia que lo usa con su propio respaldo.
    writeFileSync(archivo, 'import{C as c}from"./react.js";class l extends c{constructor(){super(...arguments),this.state={fallo:!1}}}'
      + 'const u=o=>o.filter(i=>i.rol==="cliente").at(-1);export{l as E,u};');
    const bien = guarda();
    assert.equal(bien.status, 0, bien.stdout + bien.stderr);
    assert.match(bien.stderr, /index-a1b2c3\.js +\.at\(\) — iOS 15\.4/);
    assert.match(bien.stdout, /la sintaxis de dist\/ se lee desde iOS 13\./);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('Después de cada build: ?., ?? y 10n son ES2020 que iOS 13.0 no lee; en un texto, una regex o un comentario no cuentan', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'dekog-salida-'));
  const errores = (codigo) => {
    writeFileSync(join(raiz, 'dist', 'index.js'), codigo);
    return revisarSalida(raiz).errores.map((e) => `${e.linea}  ${e.motivo}`);
  };
  try {
    mkdirSync(join(raiz, 'dist'));
    assert.deepEqual(errores('const a=1;\nexport const f=(o)=>o?.a;'), ['2  no se lee en iOS 13.0: encadenamiento opcional (?.) — iOS 13.4']);
    assert.deepEqual(errores('export const f=(a,b)=>a??b;'), ['1  no se lee en iOS 13.0: el operador ?? — iOS 13.4']);
    assert.deepEqual(errores('export const n=10n;'), ['1  no se lee en iOS 13.0: un BigInt (10n) — iOS 14']);
    // Lo que no es código, y el ternario que deja el minificador: «abierto ? 0.85 : 1» (AsistenteChat.jsx) sale «n?.85:1».
    assert.deepEqual(errores('const s="o?.a??1",r=/a??b/,t=`o?.a ${n?.85:1}`;/* o?.a??10n */export{s,r,t};'), []);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
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

test('vercel.json: /a y /a/ a /links.html, /a/<código> (también con la barra del final) al Worker y lo demás de /a… a la web', () => {
  const { rewrites } = JSON.parse(leer('vercel.json'));
  // Vercel compila cada `source` con path-to-regexp, estricto (la barra del final cuenta) y sensible a mayúsculas, y usa
  // la PRIMERA regla que coincide. Aquí se emulan las formas de este vercel.json: segmentos fijos, :parámetros de un
  // segmento y el comodín con su grupo; una regla de otra forma pide enseñarle a esta prueba a leerla.
  const comoRegex = (source) => {
    if (/^\/\(\(\?![^()]*\)\.\*\)$/.test(source)) return new RegExp(`^${source}$`); // el comodín: su grupo ya es una regex
    assert.ok(/^(\/([\w-]+|:\w+))*\/?$/.test(source), `la prueba no sabe leer ${source}`);
    return new RegExp(`^${source.replace(/:(\w+)/g, '(?<$1>[^/]+?)')}$`);
  };
  const destino = (ruta) => {
    for (const { source, destination } of rewrites) {
      const m = comoRegex(source).exec(ruta);
      if (m) return destination.replace(/:(\w+)/g, (_, nombre) => m.groups[nombre]);
    }
    return null; // ninguna regla: el 404 de Vercel (si no es un archivo)
  };
  const worker = (codigo) => `https://dekog-asistente.dekog-web.workers.dev/a/${codigo}`;
  assert.equal(destino('/a'), '/links.html');
  assert.equal(destino('/a/'), '/links.html');
  assert.equal(destino('/a/k3P9xQ1'), worker('k3P9xQ1'));
  assert.equal(destino('/a/k3P9xQ1/'), worker('k3P9xQ1')); // el Worker solo acepta /a/<código>, sin la barra
  // Lo demás que empieza con /a llega a la web, que muestra las dos asesoras (antes, /a/x/y daba el 404 de Vercel).
  for (const ruta of ['/a/x/y', '/a/k3P9xQ1/x', '/a%E2%81%A3', '/a.']) {
    assert.equal(destino(ruta), '/index.html', ruta);
    assert.equal(rutaDesconocida(ruta), 'asesoras', ruta);
  }
  // Una foto de /wa/ o de /ia/ que no existe sigue dando 404, no la página de la web.
  for (const ruta of ['/wa/no-existe.webp', '/ia/no-existe.png']) assert.equal(destino(ruta), null, ruta);
  assert.equal(destino('/ofertas/'), '/ofertas.html');
  assert.equal(destino('/producto/123'), '/index.html');
});
