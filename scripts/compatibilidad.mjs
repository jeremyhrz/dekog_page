/**
 * Guarda de la web para iPhone viejos: falla (exit 1) si el código que llega al navegador usa una API o una sintaxis
 * que un iPhone que se quedó en un iOS viejo no tiene (la mayoría llegó con iOS 15.4; cada patrón dice desde cuándo
 * existe). Vite no agrega polyfills ni rebaja la sintaxis (compila para safari16), así que una sola dejaba el chat
 * fallando en cada mensaje (`.at(-1)`, 13-oct) o la página en blanco (Object.hasOwn, la asignación lógica), sin ningún
 * aviso en el build. Corre antes de cada build («prebuild» en package.json), también en Vercel, que publica con el push
 * a main antes de que nadie corra las pruebas:
 *
 *   node scripts/compatibilidad.mjs [carpeta]      (sin carpeta, este proyecto)
 *
 * Revisa src/ y los archivos de fuera que la web importa (hoy asistente/src/lib/negocio.js, promo.js y config.js),
 * siguiendo los import: si mañana la web importa otro archivo del asistente, también se revisa. Los patrones piden
 * código: «ni .at()» u «Object.hasOwn:» en un comentario no cuentan.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
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

// [patrón, qué es y desde qué Safari existe]. Las versiones son las de iOS: Safari va con el sistema.
export const PROHIBIDOS = [
  [/[\w$)\]?]\.at\(/, '.at() — iOS 15.4'],
  [/\bObject\.hasOwn\(/, 'Object.hasOwn — iOS 15.4'],
  [/\.findLast(Index)?\(/, 'findLast / findLastIndex — iOS 15.4'],
  [/\bstructuredClone\(/, 'structuredClone — iOS 15.4'],
  [/\.(toSorted|toReversed|toSpliced)\(/, 'toSorted / toReversed / toSpliced — iOS 16'],
  [/\bAbortSignal\.(timeout|any)\(/, 'AbortSignal.timeout / any — iOS 16 y 17.4'],
  [/\?\?=|\|\|=|&&=/, 'asignación lógica (??= ||= &&=) — iOS 14: el archivo entero no carga'],
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

if (esPrincipal()) {
  const raiz = process.argv[2] ? resolve(process.argv[2]) : RAIZ;
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
