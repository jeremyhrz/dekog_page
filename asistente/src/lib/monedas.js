/**
 * Un número junto a una moneda es un monto («REF 1.290», «Bs 1.318.908», «8.000.000 $»): ni un teléfono ni un dato
 * personal. Lo miran chat.js (ocultarDatosPersonales: a la IA le llegan los montos) y canales/meta.js (extraerTelefono:
 * un monto no va a la hoja como el teléfono del cliente).
 */
export const MONEDA_ANTES = /(?:\bref\.?|\bbs\.?|\$|\busd|€)\s*$/i;
export const MONEDA_DESPUES = /^\s*(?:ref\b|bs\b|bol[ií]vares|\$|usd\b|€|d[oó]lares)/i;

/** ¿El número que ocupa [inicio, fin) de `texto` va junto a una moneda? Las mismas ventanas que ocultarDatosPersonales. */
export function juntoAMoneda(texto, inicio, fin) {
  return MONEDA_ANTES.test(texto.slice(Math.max(0, inicio - 8), inicio)) || MONEDA_DESPUES.test(texto.slice(fin, fin + 12));
}
