/**
 * Datos del negocio que usa el asistente.
 *
 * Todo lo que está aquí sale de dekog.net o de los catálogos PDF de Dekog.
 * Lo que la dueña todavía no ha confirmado va en `pendientes`: el asistente
 * NO lo responde, lo deriva a una asesora. Cuando Dekog dé esas respuestas,
 * se agregan en `datos` y se quitan de `pendientes`.
 */

export const lineas = {
  // Línea que recibe hoy todos los botones de la web.
  '01': { numero: '584145847791', nombre: 'Línea 01 · Asesorías y ventas' },
  '02': { numero: '584244006086', nombre: 'Línea 02 · Asesorías y ventas' },
  '03': { numero: '584124423350', nombre: 'Línea 03 · El Viñedo' },
};

// Dekog convierte sus precios REF a bolívares con la tasa oficial del BCV del euro.
export const monedaTasa = 'EUR';

// Qué línea recibe cada tipo de cliente. Por confirmar con Dekog.
export const lineaPorArea = {
  home: '01',
  arquitectura: '01',
};

export const datos = `
DEKOG — "Diseñamos, Construimos, Amoblamos". Un solo equipo de arquitectos, ingenieros y diseñadores
con dos líneas de servicio:
- DEKOG HOME: mobiliario (camas, sofás, puffs, mesas). Dekog es fabricante (confirmado por la dueña el 7-oct):
  hace cualquier modelo, también fuera del catálogo, a la medida y con el diseño que el cliente quiera.
  El precio y el tiempo de un modelo personalizado los cotiza una asesora con una foto de referencia y las medidas.
- DEKOG ARQUITECTURA: diseño arquitectónico, modelado 3D, planos, ejecución y supervisión de obra,
  interiorismo y proyectos llave en mano. Tipos: residencial, comercial, oficinas, remodelaciones,
  interiorismo. Más de 120 proyectos realizados (ejemplos: un área médica, oficinas corporativas,
  una funeraria, el spa Kaella, la tienda Maviz, el salón de belleza Piel Morena y la Casa MOS83).
  La consulta inicial de un proyecto es gratuita, presencial o virtual. Proceso: consulta inicial,
  propuesta de diseño, aprobación y contratación, desarrollo del proyecto, entrega y seguimiento.

Showroom: Centro Comercial Vía Veneto, Nivel Roma, Local R18 (Mañongo, Naguanagua, Carabobo).
Horario publicado en la web: lunes a viernes de 9:00 a. m. a 6:00 p. m. y sábados de 9:00 a. m. a 2:00 p. m.
Trabajan a nivel nacional.
Correo: dekog.inf@gmail.com · Instagram: @dekog.home y @dekog.arquitectura · Web: dekog.net

Precios: el catálogo está en REF. Si el cliente paga en bolívares, se calculan a la tasa oficial del BCV
del EURO del día del pago.
`.trim();

// Las especificaciones de cada línea, las telas y la ficha de cada modelo están en conocimiento.js.

export const pendientes = [
  'formas de pago (Pago Móvil, Zelle, efectivo, Cashea u otras)',
  'costo y tiempo de envío a cada ciudad',
  'tiempo de fabricación y de entrega',
  'disponibilidad en este momento de un modelo, una tela o un color concretos',
  'precio del box en las Camas Alta Gama',
  'si las camas incluyen colchón',
  'plazo de la garantía estructural',
  'recargo de las telas premium en sofás, puffs y otros muebles (en camas sí está confirmado)',
  'descuentos, promociones o apartados',
];

// Recargo del box en Camas Clásicas y Kids (el liso va incluido).
export const recargosBox = { alta_gama: 80, nube: 120 };
export const nombresBox = { alta_gama: 'box alta gama', nube: 'box nube' };

// Telas premium (LOFT y las que Dekog indicó «igual que la loft»): recargo en CAMAS según la
// medida, confirmado por Dekog el 2026-10-06. En sofás y puffs ese recargo lo confirma una asesora.
export const recargosTelaPremium = { individual: 80, matrimonial: 100, queen: 120, king: 150 };

// Sofás que pueden llevar su puff a juego (catálogo de mobiliario 2026), por nombre exacto en productos.js.
export const puffsOpcionales = { Amsterdam: 200, Mississippi: 300, Dubai: 130 };

export const recargosValidos = [
  ...Object.values(recargosBox),
  ...Object.values(recargosTelaPremium),
  ...Object.values(puffsOpcionales),
];

// Porcentajes que el asistente puede mencionar (anticipo, descuentos...). Vacío
// hasta que Dekog los confirme: cualquier "%" en una respuesta se trata como inventado.
export const porcentajesValidos = [];
