/**
 * Textos con *énfasis*: los asteriscos marcan las palabras que van en cursiva madera.
 *   partirEnfasis('Espacios que *inspiran*') → [{ texto: 'Espacios que ', enfasis: false }, { texto: 'inspiran', enfasis: true }]
 */
export function partirEnfasis(texto) {
  return String(texto)
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((tramo) => (tramo.length > 2 && tramo.charAt(0) === '*' && tramo.charAt(tramo.length - 1) === '*'
      ? { texto: tramo.slice(1, -1), enfasis: true }
      : { texto: tramo, enfasis: false }));
}

/** El texto sin los asteriscos (para lectores de pantalla y atributos). */
export const textoPlano = (texto) => String(texto).replace(/\*/g, '');
