// Espacio que no corta (U+00A0), escrito así para que se vea en el código.
const DURO = String.fromCharCode(160);

/**
 * Las horas no se parten entre dos renglones: «9:00 a. m.» queda entera (en el teléfono se leía «9:00 a.» y, abajo,
 * «m.»). Para los textos de /contacto y de los avisos de pages/NoEncontrada.jsx.
 *   horasEnteras('de 9:00 a. m. a 6:00 p. m.') → 'de 9:00 a. m. a 6:00 p. m.' (con espacios duros dentro de cada hora)
 */
export const horasEnteras = (texto) => String(texto).replace(/(\d) ([ap])\. m\./g, `$1${DURO}$2.${DURO}m.`);
