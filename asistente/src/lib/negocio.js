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
- DEKOG HOME: mobiliario (camas, sofás, puffs, mesas) de fabricación propia.
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

Camas:
- Se fabrican en madera de pino secada al horno y espuma de alta densidad, con el textil y el color
  de preferencia del cliente. Garantía estructural de Dekog.
- Medidas: Individual 1,00 x 1,90 m · Matrimonial 1,40 x 1,90 m · Queen 1,60 x 1,90 m · King 2,00 x 2,00 m.
- Box (base) de las Camas Clásicas: liso de 5 a 7 cm incluido; alta gama de 7 a 10 cm +REF 80;
  nube de 10 a 15 cm +REF 120. Altura del copete: 1,20 a 1,30 m.
- Box de las Camas Kids: liso de 6 a 7 cm incluido; alta gama de 8 a 10 cm +REF 80; nube +REF 120.
- Camas Alta Gama: vienen con box alta gama (7 a 10 cm) o nube (10 a 15 cm). El precio de cada
  box en esta línea lo confirma una asesora.
- Los precios del catálogo están en REF. Si el cliente paga en bolívares, se calculan a la tasa oficial del BCV
  del EURO del día del pago.
`.trim();

export const pendientes = [
  'formas de pago (Pago Móvil, Zelle, efectivo, Cashea u otras)',
  'costo y tiempo de envío a cada ciudad',
  'tiempo de fabricación y de entrega',
  'telas y colores disponibles en este momento',
  'precio del box en las Camas Alta Gama',
  'descuentos, promociones o apartados',
  'disponibilidad exacta de un modelo',
];

// Recargo del box en Camas Clásicas y Kids (el liso va incluido).
export const recargosBox = { alta_gama: 80, nube: 120 };
export const nombresBox = { alta_gama: 'box alta gama', nube: 'box nube' };
export const recargosValidos = Object.values(recargosBox);

// Porcentajes que el asistente puede mencionar (anticipo, descuentos...). Vacío
// hasta que Dekog los confirme: cualquier "%" en una respuesta se trata como inventado.
export const porcentajesValidos = [];
