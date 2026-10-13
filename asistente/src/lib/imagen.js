/**
 * Fotos que mandan los clientes (WhatsApp, Instagram o el chat de la web) para que la IA reconozca el modelo.
 *
 * La IA recibe la foto junto con dos hojas de referencia (public/ia/, hechas por scripts/hojas_catalogo_ia.py) con
 * todas las fotos del catálogo, cada una con su número (el id del producto) y su nombre, y responde con ese id.
 * En el historial queda solo NOTA_FOTO (más el pie de foto): la foto no se guarda en KV ni se reenvía.
 */
import { Buffer } from 'node:buffer';

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

// Las hojas se descargan una vez por isolate y quedan en memoria (unos 700 KB en base64).
let hojas = null;
export function hojasDeReferencia() {
  hojas ??= Promise.all(['catalogo-camas.jpg', 'catalogo-muebles.jpg'].map(async (nombre) => {
    const r = await fetch(`${SITIO}/ia/${nombre}`, { cf: { cacheTtl: 86400, cacheEverything: true } });
    // Sin la hoja, Vercel puede responder 200 con la portada (HTML): eso no se guarda como hoja.
    if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('image/')) {
      throw new Error(`${nombre}: HTTP ${r.status} ${r.headers.get('content-type') ?? ''}`);
    }
    return { mime: 'image/jpeg', datos: Buffer.from(await r.arrayBuffer()).toString('base64') };
  })).catch((e) => {
    hojas = null; // se reintenta con la próxima foto
    console.warn('Sin hojas de referencia del catálogo:', e?.message);
    return [];
  });
  return hojas;
}
