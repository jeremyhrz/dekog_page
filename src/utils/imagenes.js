import variantes from '../data/variantes.json';

/**
 * Variantes WebP de las fotos de public/, generadas por scripts/optimizar_imagenes.py en public/opt/:
 *   /muebles/toronto.png → /opt/muebles/toronto.png-480.webp, -800.webp y -1200.webp
 * Los anchos de cada carpeta están en src/data/variantes.json (los lee también el script).
 * Las fotos originales no cambian: son el respaldo si a una foto nueva le falta su variante. (Por WhatsApp e
 * Instagram el asistente manda otra copia: el JPEG de public/wa/, que genera el mismo script.)
 */
export function anchosDe(ruta) {
  const carpeta = ruta.replace(/^\//, '').split('/')[0];
  return variantes.anchos[carpeta] ?? variantes.anchos.otros;
}

// encodeURI: hay nombres con espacios y acentos, y dentro de srcset un espacio separa la URL de su ancho.
export const variante = (ruta, ancho) => encodeURI(`/opt${ruta}-${ancho}.webp`);

/** La variante más chica que cubra un ancho (para fondos CSS, que no admiten srcset). */
export function varianteHasta(ruta, ancho) {
  const anchos = anchosDe(ruta);
  return variante(ruta, anchos.find((a) => a >= ancho) ?? anchos[anchos.length - 1]);
}

/** Recorte vertical del centro de una foto del hero, para teléfonos en vertical. */
export const recorteMovil = (ruta) => encodeURI(`/opt${ruta}-movil.webp`);

/**
 * Encuadre de una foto que no es vertical (src/data/variantes.json, «encuadre»): el punto que queda a la vista cuando la
 * tarjeta 4:5 o la vista rápida la recortan, para el object-position. undefined si no tiene: se ve centrada, como siempre.
 */
export function encuadreDe(ruta) {
  const punto = variantes.encuadre[String(ruta || '').replace(/^\//, '')];
  return Array.isArray(punto) ? `${Math.round(punto[0] * 100)}% ${Math.round(punto[1] * 100)}%` : undefined;
}

/** Miniatura 4:5 (320×400) de un producto de /muebles o /mesas: chat y carrito. */
export const miniatura = (ruta) => encodeURI(`/mini${ruta}.webp`);
