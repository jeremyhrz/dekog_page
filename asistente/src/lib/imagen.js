/**
 * Fotos que mandan los clientes (WhatsApp, Instagram o el chat de la web) para que la IA reconozca el modelo.
 *
 * La IA recibe la foto junto con dos hojas de referencia (public/ia/, hechas por scripts/hojas_catalogo_ia.py) con
 * todas las fotos del catálogo, cada una con su número (el id del producto) y su nombre, y responde con ese id.
 * En el historial queda solo NOTA_FOTO (más el pie de foto): la foto no se guarda en KV ni se reenvía.
 */
import { Buffer } from 'node:buffer';
import { config } from './config.js';

const SITIO = 'https://www.dekog.net';
export const MAX_BYTES_FOTO = 5 * 1024 * 1024;
const TIPOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const tipoDe = (mime) => String(mime ?? '').split(';')[0].trim().toLowerCase();

/** {mime, datos (base64)} lista para la IA, o null si no es una imagen que se pueda usar. */
export function imagenValida(mime, bytes) {
  const tipo = tipoDe(mime);
  if (!TIPOS.has(tipo) || !bytes?.byteLength || bytes.byteLength > MAX_BYTES_FOTO) return null;
  return { mime: tipo, datos: Buffer.from(bytes).toString('base64') };
}

/** La foto que manda el chat de la web ({mime, datos} en base64, ya achicada en el navegador), o null. */
export function imagenDeLaWeb(dato) {
  if (!dato || typeof dato.datos !== 'string' || !TIPOS.has(tipoDe(dato.mime))) return null;
  if (!dato.datos || dato.datos.length > Math.ceil(MAX_BYTES_FOTO / 3) * 4 || !BASE64.test(dato.datos)) return null;
  return { mime: tipoDe(dato.mime), datos: dato.datos };
}

/** Descarga una foto (con el token de Meta si hace falta) y la deja lista para la IA; null si algo falla. */
export async function descargarImagen(url, { token, mime } = {}) {
  try {
    const r = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    if (Number(r.headers.get('content-length') ?? 0) > MAX_BYTES_FOTO) throw new Error('la foto pesa demasiado');
    const imagen = imagenValida(mime || r.headers.get('content-type'), await r.arrayBuffer());
    if (!imagen) throw new Error('no es una imagen que se pueda leer');
    return imagen;
  } catch (e) {
    console.warn('No se pudo descargar la foto del cliente:', e?.message);
    return null;
  }
}

// Las hojas NO viajan en cada pedido (eran ~900 KB y costaban ~28 ms de CPU por foto el 13-oct): se suben una vez al
// servicio de archivos de Gemini, que las guarda 48 h, y cada foto manda solo su referencia. La referencia se guarda en
// KV (la comparten todos los isolates) y en memoria, y se renueva a las 46 h.
const ARCHIVOS_GEMINI = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
const CLAVE_HOJAS = 'ia:hojas';
const DURAN_MS = 46 * 3600 * 1000;
const HOJAS = ['catalogo-camas.jpg', 'catalogo-muebles.jpg'];
let enMemoria = null; // { hasta, hojas: [{ mime, uri }] }

async function subirHoja(nombre) {
  const r = await fetch(`${SITIO}/ia/${nombre}`);
  // Sin la hoja, Vercel puede responder 200 con la portada (HTML): eso no se sube como hoja.
  if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('image/')) {
    throw new Error(`${nombre}: HTTP ${r.status} ${r.headers.get('content-type') ?? ''}`);
  }
  const subida = await fetch(ARCHIVOS_GEMINI, {
    method: 'POST',
    headers: { 'x-goog-api-key': config.GEMINI_API_KEY ?? '', 'X-Goog-Upload-Protocol': 'raw', 'Content-Type': 'image/jpeg' },
    body: await r.arrayBuffer(),
  });
  const j = await subida.json().catch(() => ({}));
  if (!j?.file?.uri) throw new Error(`no se pudo subir ${nombre}: ${j?.error?.message ?? `HTTP ${subida.status}`}`);
  return { mime: 'image/jpeg', uri: j.file.uri };
}

/** Las referencias de las dos hojas en Gemini ([{ mime, uri }]); [] si no se pudieron tener (la IA mira solo la foto). */
export async function hojasDeReferencia(kv) {
  if (enMemoria?.hasta > Date.now()) return enMemoria.hojas;
  try {
    const guardadas = await kv?.get(CLAVE_HOJAS, 'json').catch(() => null);
    if (guardadas?.hasta > Date.now() + 60 * 1000) {
      enMemoria = guardadas;
      return guardadas.hojas;
    }
    const hojas = await Promise.all(HOJAS.map(subirHoja));
    enMemoria = { hasta: Date.now() + DURAN_MS, hojas };
    await kv?.put(CLAVE_HOJAS, JSON.stringify(enMemoria), { expirationTtl: DURAN_MS / 1000 })
      .catch((e) => console.warn('No se pudo guardar la referencia de las hojas:', e?.message));
    return hojas;
  } catch (e) {
    console.warn('Sin hojas de referencia del catálogo:', e?.message);
    return [];
  }
}

/** Gemini dijo que una hoja ya no existe: se olvida la referencia para subirla de nuevo. */
export async function olvidarHojas(kv) {
  enMemoria = null;
  await kv?.delete?.(CLAVE_HOJAS).catch(() => null);
}
