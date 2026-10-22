/**
 * Guarda de la web para iPhone viejos: falla (exit 1) si lo que llega al navegador usa una API o una sintaxis que un
 * iPhone que se quedó en un iOS viejo no tiene (la mayoría llegó con iOS 15.4; cada patrón dice desde cuándo existe).
 * Vite no agrega polyfills, así que una sola API dejaba el chat fallando en cada mensaje (`.at(-1)`, 13-oct) o la página
 * en blanco (Object.hasOwn), sin ningún aviso en el build. La sintaxis nueva sí la rebaja esbuild, porque vite.config.js
 * compila para Safari 13 (antes, para Safari 16: la asignación lógica dejaba el sitio entero en blanco). Corre en cada
 * build, también en Vercel, que publica con el push a main antes de que nadie corra las pruebas:
 *
 *   node scripts/compatibilidad.mjs [carpeta]            antes («prebuild»): el código de la web
 *   node scripts/compatibilidad.mjs --salida [carpeta]   después («postbuild»): lo que se publica, en dist/
 *
 * Sin carpeta, este proyecto. Antes revisa src/ y los archivos de fuera que la web importa (hoy
 * asistente/src/lib/negocio.js, promo.js y config.js), siguiendo los import: si mañana la web importa otro archivo del
 * asistente, también se revisa. Los patrones piden código: «ni .at()» u «Object.hasOwn:» en un comentario no cuentan.
 * Después lee cada .js de dist/, ya con las dependencias, como lo lee iOS 13.0: ES2020 (acorn) sin ?., ?? ni BigInt,
 * que llegaron con iOS 13.4 y 14. Lo que no se lea así (campos de clase, ??=, ?.…) es un SyntaxError en esos iPhone y el
 * archivo entero no carga; con el target de vite.config.js esbuild lo rebaja todo, así que si aparece es que se perdió.
 * Ahí las APIs solo avisan (revisarSalida).
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ESTE_ARCHIVO = fileURLToPath(import.meta.url);
const RAIZ = resolve(dirname(ESTE_ARCHIVO), '..');
// Corre solo si se lo llama directamente (las pruebas lo importan). Node arma import.meta.url con la ruta real del
// archivo: comparar con la ruta tal como se escribió fallaría con un enlace simbólico, y la guarda no correría nunca.
const esPrincipal = () => {
  try {
    return realpathSync(process.argv[1]) === ESTE_ARCHIVO;
  } catch {
    return false;
  }
};

// [patrón, qué es y desde qué Safari existe]. Las versiones son las de iOS: Safari va con el sistema. Una llamada
// encadenada puede empezar la línea («  .at(-1)», como las cadenas de AsistentePanel.jsx): también cuenta. Lo marcado
// «solo en el código» no se busca en dist/: ahí esbuild ya lo rebajó, y lo que quede está dentro de un texto
// (react-router trae «(self.__FLIGHT_DATA||=[])» en una plantilla).
export const PROHIBIDOS = [
  [/(?:^\s*|[\w$)\]?])\.at\(/, '.at() — iOS 15.4'],
  [/\bObject\.hasOwn\(/, 'Object.hasOwn — iOS 15.4'],
  [/\.findLast(Index)?\(/, 'findLast / findLastIndex — iOS 15.4'],
  [/\bstructuredClone\(/, 'structuredClone — iOS 15.4'],
  [/\bcrypto\.randomUUID\(/, 'crypto.randomUUID() — iOS 15.4 (crypto.randomUUID?.() con otro id de respaldo, sí)'],
  [/\.(toSorted|toReversed|toSpliced)\(/, 'toSorted / toReversed / toSpliced — iOS 16'],
  [/(?:^\s*|[\w$)\]?])\.with\(/, '.with() de un array — iOS 16'],
  [/\bAbortSignal\.(timeout|any)\(/, 'AbortSignal.timeout / any — iOS 16 y 17.4'],
  [/\bPromise\.any\(/, 'Promise.any — iOS 14'],
  [/\bPromise\.withResolvers\(/, 'Promise.withResolvers — iOS 17.4'],
  [/\b(Object|Map)\.groupBy\(/, 'Object.groupBy / Map.groupBy — iOS 17.4'],
  [/\?\?=|\|\|=|&&=/, 'asignación lógica (??= ||= &&=) — iOS 14: el archivo entero no carga', 'solo en el código'],
  [/\(\?<[=!]/, 'lookbehind en una regex — iOS 16.4: el archivo entero no carga'],
];

const ES_CODIGO = /\.(js|jsx|mjs)$/;
// import … from '…', export … from '…', import '…' e import('…'): solo rutas relativas (lo de node_modules no se sigue).
const IMPORTA = /(?:\bfrom|\bimport)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g;

function codigoDe(carpeta) {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(carpeta, e.name);
    if (e.isDirectory()) return codigoDe(ruta);
    return ES_CODIGO.test(e.name) ? [ruta] : [];
  });
}

function resolverImport(desde, ruta) {
  const base = resolve(desde, ruta);
  return [base, `${base}.js`, `${base}.jsx`, join(base, 'index.js'), join(base, 'index.jsx')]
    .find((c) => ES_CODIGO.test(c) && existsSync(c) && statSync(c).isFile()) ?? null;
}

/** Los archivos que van al navegador: los de src/ y, siguiendo sus import, los de fuera que usan. */
export function archivosDeLaWeb(raiz = RAIZ) {
  const pendientes = codigoDe(join(raiz, 'src'));
  const vistos = new Set();
  while (pendientes.length) {
    const archivo = pendientes.pop();
    if (vistos.has(archivo)) continue;
    vistos.add(archivo);
    for (const [, ruta] of readFileSync(archivo, 'utf8').matchAll(IMPORTA)) {
      const destino = resolverImport(dirname(archivo), ruta);
      if (destino) pendientes.push(destino);
    }
  }
  return [...vistos].sort();
}

/** Lo prohibido en un texto, línea por línea: [{ linea, motivo, codigo }]. */
export function revisar(texto) {
  return String(texto).split('\n').flatMap((codigo, i) => PROHIBIDOS
    .filter(([patron]) => patron.test(codigo))
    .map(([, motivo]) => ({ linea: i + 1, motivo, codigo: codigo.trim() })));
}

/** acorn, el lector de JS que trae eslint (espree), o null si no está instalado. */
function lectorDeJs() {
  const requerir = createRequire(import.meta.url);
  try {
    return requerir('acorn');
  } catch {
    try {
      return createRequire(requerir.resolve('espree'))('acorn'); // por si npm lo dejó dentro de espree
    } catch {
      return null;
    }
  }
}

/** Si el token `t` de acorn es ES2020 que iOS 13.0 todavía no tiene, qué es y desde qué iOS existe; si no, null. */
function faltaEnIos13(t) {
  if (t.type.label === '?.') return 'encadenamiento opcional (?.) — iOS 13.4';
  if (t.type.label === '??') return 'el operador ?? — iOS 13.4';
  return typeof t.value === 'bigint' ? 'un BigInt (10n) — iOS 14' : null;
}

/**
 * Por qué iOS 13.0 no lee `texto` (un módulo, o un script clásico si se copió de public/): { motivo, pos }, o null si lo
 * lee. Tiene que leerse como ES2020 y, además, no traer lo de ES2020 que ese iOS no tiene. Se miran los tokens, no el
 * texto: un «?.» dentro de un texto, una regex o un comentario no cuenta, ni el ternario minificado «n?.85:1».
 */
function errorDeSintaxis(acorn, texto) {
  let primero = null;
  for (const sourceType of ['module', 'script']) {
    let falta = null;
    const onToken = (t) => {
      const que = !falta && faltaEnIos13(t);
      if (que) falta = { motivo: `no se lee en iOS 13.0: ${que}`, pos: t.start };
    };
    try {
      acorn.parse(texto, { ecmaVersion: 2020, sourceType, onToken });
      return falta;
    } catch (e) {
      if (!primero) primero = { motivo: `no se lee como ES2020: ${e.message}`, pos: e.pos ?? 0 };
    }
  }
  return primero;
}

/** Un trozo del código minificado alrededor de `i`, para decir dónde está lo que se encontró. */
const alrededor = (texto, i) => texto.slice(Math.max(0, i - 50), i + 50).trim();

/**
 * Lo que publica el build (dist/, con las dependencias ya dentro): `errores`, los .js que iOS 13.0 no lee, y
 * `avisos`, las APIs de PROHIBIDOS que aparecen. Las APIs no frenan el build: ahí no se distingue lo de la web (eso ya lo
 * frenó la revisión de antes) de lo de una dependencia, que puede usarlas con su propio respaldo. `sinLector`: no se
 * encontró acorn y la sintaxis no se revisó.
 */
export function revisarSalida(raiz = RAIZ) {
  const acorn = lectorDeJs();
  const carpeta = join(raiz, 'dist');
  const archivos = existsSync(carpeta) ? codigoDe(carpeta).sort() : [];
  const errores = [];
  const avisos = [];
  for (const archivo of archivos) {
    const texto = readFileSync(archivo, 'utf8');
    const e = acorn && errorDeSintaxis(acorn, texto);
    if (e) {
      const linea = acorn.getLineInfo(texto, e.pos).line;
      errores.push({ archivo, linea, motivo: e.motivo, codigo: alrededor(texto, e.pos) });
    }
    for (const [patron, motivo, soloEnElCodigo] of PROHIBIDOS) {
      const m = !soloEnElCodigo && new RegExp(patron.source, 'm').exec(texto);
      if (m) avisos.push({ archivo, motivo, codigo: alrededor(texto, m.index) });
    }
  }
  return { archivos, errores, avisos, sinLector: !acorn };
}

function guardaDelCodigo(raiz) {
  const archivos = archivosDeLaWeb(raiz);
  const hallados = archivos.flatMap((a) => revisar(readFileSync(a, 'utf8')).map((h) => ({ archivo: relative(raiz, a), ...h })));
  for (const h of hallados) console.error(`${h.archivo}:${h.linea}  ${h.motivo}\n    ${h.codigo}`);
  if (hallados.length) {
    console.error(`\n${hallados.length} uso(s) que rompen la web en iPhone viejos (al lado, desde qué iOS existe).`
      + ' Cámbialos por algo que ya exista ahí: lista[lista.length - 1] en vez de .at(-1), un if en vez de ??=…');
    process.exitCode = 1;
  } else {
    console.log(`Compatibilidad con iPhone viejos: ${archivos.length} archivos revisados, nada que corregir.`);
  }
}

function guardaDeLaSalida(raiz) {
  const { archivos, errores, avisos, sinLector } = revisarSalida(raiz);
  if (!archivos.length) {
    console.error('Compatibilidad con iPhone viejos: no hay ningún .js en dist/ (¿cambió outDir en vite.config.js?).');
    process.exitCode = 1;
    return;
  }
  for (const a of avisos) console.warn(`${relative(raiz, a.archivo)}  ${a.motivo}\n    …${a.codigo}…`);
  if (avisos.length) {
    console.warn(`\n${avisos.length} aviso(s), que no frenan el build: APIs que no existen en iPhone viejos dentro de lo que`
      + ' se publica. Si son de la web, cámbialas; si son de una dependencia, revisa que tenga su respaldo.\n');
  }
  if (sinLector) {
    console.warn('⚠️ No se encontró acorn (lo trae eslint): no se revisó la sintaxis de dist/. Instálalo con npm i -D acorn.');
    return;
  }
  for (const e of errores) console.error(`${relative(raiz, e.archivo)}:${e.linea}  ${e.motivo}\n    …${e.codigo}…`);
  if (errores.length) {
    console.error(`\n${errores.length} archivo(s) de dist/ con sintaxis que un iPhone viejo no entiende: el archivo entero no`
      + " carga. ¿Sigue target: ['es2020', 'safari13'] en vite.config.js?");
    process.exitCode = 1;
  } else {
    console.log(`Compatibilidad con iPhone viejos: ${archivos.length} archivos revisados, la sintaxis de dist/ se lee desde iOS 13.`);
  }
}

if (esPrincipal()) {
  const salida = process.argv[2] === '--salida';
  const carpeta = process.argv[salida ? 3 : 2];
  const raiz = carpeta ? resolve(carpeta) : RAIZ;
  if (salida) guardaDeLaSalida(raiz);
  else guardaDelCodigo(raiz);
}
