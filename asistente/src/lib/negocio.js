/**
 * Datos del negocio que usa el asistente.
 *
 * Todo lo que está aquí sale de dekog.net, de los catálogos PDF de Dekog o de las respuestas de la dueña (las
 * del 8-oct: local, horario, líneas, box, y pagos, envíos y garantía en conocimiento.js → politicas).
 * Lo que la dueña todavía no ha confirmado va en `pendientes`: el asistente
 * NO lo responde, lo deriva a una asesora. Cuando Dekog dé esas respuestas,
 * se agregan en `datos` y se quitan de `pendientes`.
 */

// Líneas de WhatsApp de las asesoras, con los nombres que usa la dueña (8-oct). La que era «Home 2»
// (0412-4423350) pasó a ser el número de ESTE asistente el 8-oct: nunca se usa para pasar clientes a una persona.
export const lineas = {
  // Home: la de los muebles; recibe los botones de la web salvo los de proyectos, que van a Arquitectura.
  '01': { numero: '584145847791', nombre: 'Home' },
  '02': { numero: '584244006086', nombre: 'Arquitectura' },
};

// Dekog convierte sus precios REF a bolívares con la tasa oficial del BCV del euro.
export const monedaTasa = 'EUR';

// El saludo que escribió la dueña (8-oct), tal cual: sale cuando el primer mensaje del cliente es solo un saludo.
export const saludoInicial = '¡Hola! 💛\nBienvenido a Dekog 🙌\n'
  + 'Soy tu asistente virtual y con gusto te ayudo a elegir mobiliario o planificar tu espacio.\n'
  + '¿Buscas un arquitecto o diseñador para remodelar un espacio? ¿O estás interesado en amoblar tu espacio con camas, '
  + 'sofás u otro mueble en particular?';

// Qué línea recibe cada tipo de cliente: los de arquitectura van a la suya (confirmado por la dueña el 8-oct).
export const lineaPorArea = {
  home: '01',
  arquitectura: '02',
};

export const datos = `
DEKOG — "Diseñamos, Construimos, Amoblamos". Un solo equipo de arquitectos, ingenieros y diseñadores
con dos líneas de servicio:
- DEKOG HOME: mobiliario (camas, sofás, puffs, mesas). Dekog es fabricante (confirmado por la dueña el 7-oct):
  hace cualquier modelo, también fuera del catálogo, a la medida y con el diseño que el cliente quiera.
  El precio y el tiempo de un modelo personalizado los cotiza una asesora con una foto de referencia y las medidas.
  Medidas especiales: sí se hacen; lo personalizado o fuera de medida varía de precio según los centímetros extra o
  las modificaciones.
- DEKOG ARQUITECTURA: diseño arquitectónico, modelado 3D, planos, ejecución y supervisión de obra,
  interiorismo y proyectos llave en mano. Tipos: residencial, comercial, oficinas, remodelaciones,
  interiorismo. Proyectos en todo el país. Más de 120 proyectos realizados (ejemplos: un área médica, oficinas
  corporativas, una funeraria, el spa Kaella, la tienda Maviz, el salón de belleza Piel Morena y la Casa MOS83).
  La asesoría (consulta inicial) de un proyecto es gratuita, presencial o virtual, y no incluye renders; se pide en
  la tienda o por WhatsApp, con la línea de Arquitectura. Proceso: consulta inicial, propuesta de diseño, aprobación
  y contratación, desarrollo del proyecto, entrega y seguimiento.

Showroom: Centro Comercial Vía Veneto, Nivel Roma, Local R17 (Mañongo, Naguanagua, Carabobo).
Horario de atención: lunes a sábado de 9:00 a. m. a 6:00 p. m.
Trabajan a nivel nacional.
Asesoras por WhatsApp: línea Home (muebles) y línea de Arquitectura (proyectos de arquitectura e interiorismo).
El WhatsApp 0412-4423350 es el de este asistente virtual (atiende a cualquier hora).
Correo: dekog.inf@gmail.com · Instagram: @dekog.home y @dekog.arquitectura · Web: dekog.net

Precios: el catálogo está en REF. Si el cliente paga en bolívares, se calculan a la tasa oficial del BCV
del EURO del día del pago (con Cashea cambia: ver CÓMO SE COMPRA).
`.trim();

// Las especificaciones de cada línea, las telas y la ficha de cada modelo están en conocimiento.js.

// Lo que la dueña respondió el 8-oct (pagos, anticipo, envíos, fabricación, garantía, promociones) salió de aquí y
// está en conocimiento.js → politicas. Quedan los detalles que no dijo.
export const pendientes = [
  'el costo exacto de un envío, o de la entrega o la instalación en Valencia (depende de la dirección)',
  'el tiempo de fabricación de mesas, puffs y modelos personalizados (el de camas y sofás sí lo tienes)',
  'disponibilidad en este momento de un modelo, una tela o un color concretos, o si un pedido urgente se puede adelantar',
  'cuánto suma el box nube en una Cama Alta Gama',
  'si las camas incluyen colchón',
  'el plazo de la garantía de las Camas Kids, los puffs y las mesas',
  'recargo de las telas premium en sofás, puffs y otros muebles (en camas sí está confirmado)',
  'si hay alguna promoción vigente hoy',
  'cuándo se paga el resto después del anticipo',
  'los datos para pagar (cuentas, Pago Móvil, Zelle…) y el monto exacto con Cashea',
];

// Recargo del box por línea de camas (el liso va incluido). Clásicas: lo dijo la dueña el 2026-10-08 (el catálogo
// 2026 decía nube +120). Kids: catálogo 2026 (la dueña no las mencionó). Las Alta Gama no están: el box alta gama ya
// va incluido en su precio y el nube lo confirma una asesora, así que no tienen recargo fijo.
export const recargosBox = {
  'Camas Clásicas': { alta_gama: 80, nube: 150 },
  'Camas Kids': { alta_gama: 80, nube: 120 },
};
export const nombresBox = { alta_gama: 'box alta gama', nube: 'box nube' };

// Telas premium (LOFT y las que Dekog indicó «igual que la loft»): recargo en CAMAS según la
// medida, confirmado por Dekog el 2026-10-06. En sofás y puffs ese recargo lo confirma una asesora.
export const recargosTelaPremium = { individual: 80, matrimonial: 100, queen: 120, king: 150 };

// Sofás que pueden llevar su puff a juego (catálogo de mobiliario 2026), por nombre exacto en productos.js.
export const puffsOpcionales = { Amsterdam: 200, Mississippi: 300, Dubai: 130 };

export const recargosValidos = [
  ...Object.values(recargosBox).flatMap((porBox) => Object.values(porBox)),
  ...Object.values(recargosTelaPremium),
  ...Object.values(puffsOpcionales),
];

// Porcentajes que el asistente puede mencionar: el 50 % del anticipo (con él se empieza a fabricar o, si el modelo
// está en stock, se aparta; lo dijo la dueña el 2026-10-08). Cualquier otro "%", o un 50 % pegado a un descuento, a
// una promoción o a Cashea, se trata como inventado (catalogo.js → montosInventados).
export const porcentajesValidos = [50];
