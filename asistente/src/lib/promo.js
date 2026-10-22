/**
 * La promoción vigente de Dekog: el catálogo de ofertas «Mobiliario en stock» (PDF en Drive que mandó la dueña el
 * 21-oct-2026). La usan el asistente en WhatsApp, Instagram y la web, y el chat de la web (tarjeta de la promo).
 *
 * Qué hace con ella el asistente:
 *   - dice que SÍ hay descuentos (hasta 20 % en mobiliario en stock) y manda el enlace del catálogo de ofertas;
 *   - a cada cliente le manda UNA vez por promo, después de la bienvenida, un mensaje con la imagen y el enlace;
 *   - conoce cada pieza en stock (medida, color, tela, precio normal y de oferta) y la muestra en la tarjeta.
 *
 * Otra promo: cambiar `id` (así cada cliente vuelve a ver el mensaje), el PDF (`pdf` aquí y en public/ofertas.html), las
 * imágenes (promo/generar_flyer.py en dekog_trabajo) y la lista de piezas. Sin promo: PROMO = null, y todo vuelve a «por
 * ahora no hay promociones».
 */
import { config } from './config.js';

export const PROMO = {
  id: 'stock-2026-10',
  titulo: 'Hasta 20 % de descuento en mobiliario en stock',
  hasta: 20,
  // El enlace que se manda: una página de dekog.net (public/ofertas.html) con la promo, el PDF dentro, el botón para
  // abrirlo y las dos asesoras; su vista previa en Instagram y WhatsApp es la imagen de la promo (la del PDF de Drive
  // salía rota en Instagram, 21-oct).
  enlace: 'https://www.dekog.net/ofertas',
  pdf: 'https://drive.google.com/file/d/11zOVmCloih4kKsjbuVt7HLGT4EvPrU2-/view?usp=sharing',
  // JPEG de verdad (WhatsApp rechaza una imagen cuyo tipo no coincide con la extensión) y una WebP liviana para la web.
  imagen: 'https://www.dekog.net/promo/promo-stock.jpg',
  imagenWeb: '/promo/promo-stock.webp',
};

/** La promo, o null si no hay (o si la variable PROMO=no del Worker apaga el mensaje y el enlace; las pruebas la usan). */
export const promoActiva = () => (PROMO && config.PROMO !== 'no' ? PROMO : null);

/*
 * Las piezas del PDF, transcritas una por una el 21-oct-2026. `id`: el modelo en src/data/productos.js (null si no está
 * en el catálogo de la web). `antes` y `ahora` son los del PDF, aunque no coincidan con el catálogo: la París Queen dice
 * REF 930 (el catálogo, 990) y las dos Bruselas están en «King» a REF 890 (el precio de la Queen). Lo confirma la dueña.
 */
export const OFERTAS = [
  { id: 32, modelo: 'Máximo', medida: 'Individual', color: 'negro y blanco', tela: 'terciopelo', antes: 520, ahora: 420 },
  { id: null, modelo: 'Zoe', medida: 'Individual', color: 'gris 01', tela: 'terciopelo', antes: 580, ahora: 465 },
  { id: null, modelo: 'Nube', medida: 'Individual', color: 'rosa', tela: 'chenille paño', antes: 635, ahora: 510 },
  { id: 48, modelo: 'Toronto', medida: 'Individual', color: 'gris 02', tela: 'chenille paño', antes: 405, ahora: 330 },
  { id: 28, modelo: 'Italia', medida: 'Individual', color: 'beige', tela: 'chenille paño', antes: 480, ahora: 385 },
  { id: null, modelo: 'Toledo', medida: 'Individual', color: 'gris 01', tela: 'chenille paño', antes: 735, ahora: 590 },
  { id: 39, modelo: 'Noa', medida: 'Matrimonial', color: 'gris 01', tela: 'terciopelo', antes: 720, ahora: 580 },
  { id: 39, modelo: 'Noa', medida: 'Matrimonial', color: 'fucsia', tela: 'terciopelo', antes: 720, ahora: 580 },
  { id: 39, modelo: 'Noa', medida: 'Matrimonial', color: 'rosa vieja', tela: 'terciopelo', antes: 720, ahora: 580 },
  { id: 29, modelo: 'Jana', medida: 'Matrimonial', color: 'gris 01', tela: 'terciopelo', antes: 620, ahora: 580 },
  { id: 29, modelo: 'Jana', medida: 'Matrimonial', color: 'rosa viejo', tela: 'terciopelo', antes: 620, ahora: 495 },
  { id: 4, modelo: 'Aurora', medida: 'Matrimonial', color: 'gris 01', tela: 'terciopelo', antes: 810, ahora: 650 },
  { id: 4, modelo: 'Aurora', medida: 'Matrimonial', color: 'rosa vieja', tela: 'zaga', antes: 810, ahora: 650 },
  { id: 4, modelo: 'Aurora', medida: 'Matrimonial', color: 'rosa vieja', tela: 'terciopelo', antes: 980, ahora: 780, nota: 'con box individual dúplex' },
  { id: 11, modelo: 'Chicago', medida: 'Matrimonial', color: 'gris 01', tela: 'chenille paño', antes: 640, ahora: 515 },
  { id: 24, modelo: 'Hamburgo', medida: 'Matrimonial', color: 'gris 01', tela: 'terciopelo', antes: 980, ahora: 785 },
  { id: 24, modelo: 'Hamburgo', medida: 'Matrimonial', color: 'beige', tela: 'chenille paño', antes: 980, ahora: 785 },
  { id: 33, modelo: 'Milan', medida: 'Matrimonial', color: 'plata', tela: 'cedrito', antes: 510, ahora: 410 },
  { id: 48, modelo: 'Toronto', medida: 'Matrimonial', color: 'gris', tela: 'sedoso', antes: 495, ahora: 395 },
  { id: 31, modelo: 'Manila', medida: 'Matrimonial', color: 'café oscuro', tela: '', antes: 635, ahora: 510, nota: 'con box nube' },
  { id: 71, modelo: 'Oslo', medida: 'Matrimonial', color: 'gris oscuro', tela: 'chenille rasgado', antes: 655, ahora: 525 },
  { id: 28, modelo: 'Italia', medida: 'Matrimonial', color: 'gris 01', tela: 'terciopelo', antes: 550, ahora: 440 },
  { id: 31, modelo: 'Manila', medida: 'Queen', color: 'gris 02', tela: 'chenille paño', antes: 520, ahora: 420 },
  { id: 31, modelo: 'Manila', medida: 'Queen', color: 'gris oscuro', tela: 'lino', antes: 520, ahora: 420 },
  { id: 31, modelo: 'Manila', medida: 'Queen', color: 'gris 01', tela: 'terciopelo', antes: 520, ahora: 420 },
  { id: 24, modelo: 'Hamburgo', medida: 'Queen', color: 'gris azulado', tela: 'marmolizado', antes: 1060, ahora: 850 },
  { id: 6, modelo: 'Bali', medida: 'Queen', color: 'beige', tela: 'chenille paño', antes: 990, ahora: 790 },
  { id: 40, modelo: 'Paris', medida: 'Queen', color: 'beige', tela: 'chenille paño', antes: 930, ahora: 750 },
  { id: 40, modelo: 'Paris', medida: 'Queen', color: 'gris 01', tela: 'chenille paño', antes: 930, ahora: 750 },
  { id: 21, modelo: 'Florida', medida: 'Queen', color: 'gris', tela: 'veteado', antes: 850, ahora: 680 },
  { id: 21, modelo: 'Florida', medida: 'Queen', color: 'crema', tela: 'zaga', antes: 850, ahora: 680 },
  { id: 8, modelo: 'Barcelona', medida: 'Queen', color: 'gris 01', tela: 'chenille paño', antes: 1125, ahora: 900 },
  { id: 22, modelo: 'Georgia', medida: 'Queen', color: 'plata', tela: 'cedritos', antes: 665, ahora: 535 },
  { id: 53, modelo: 'Bruselas', medida: 'King', color: 'gris azulado', tela: '', antes: 890, ahora: 715 },
  { id: 53, modelo: 'Bruselas', medida: 'King', color: 'crema', tela: 'mirandela', antes: 890, ahora: 715 },
  { id: null, modelo: 'Lyon', medida: 'King', color: 'gris', tela: 'veteado', antes: 755, ahora: 605 },
];

// La sección «Copetes» del PDF: solo el cabecero, en stock, con un precio (sin precio anterior: no se dice descuento).
export const COPETES = [
  { id: 32, modelo: 'Máximo', medida: 'Individual', color: 'blanco y negro', tela: 'terciopelo', precio: 315 },
  { id: 39, modelo: 'Noa', medida: 'Individual', color: 'rosa vieja', tela: 'terciopelo', precio: 390 },
  { id: 74, modelo: 'Venecia', medida: 'Matrimonial', color: 'rosa', tela: 'zaga', precio: 310 },
  { id: 31, modelo: 'Manila', medida: 'Matrimonial', color: 'gris 01', tela: 'chenille paño', precio: 290 },
  { id: 28, modelo: 'Italia', medida: 'Matrimonial', color: 'gris 01', tela: 'terciopelo', precio: 330 },
  { id: 28, modelo: 'Italia', medida: 'Matrimonial', color: 'gris 01', tela: 'chenille paño', precio: 330 },
  { id: 29, modelo: 'Jana', medida: 'Matrimonial', color: 'gris 01', tela: 'chenille paño', precio: 375 },
  { id: 29, modelo: 'Jana', medida: 'Matrimonial', color: 'rosa bebé', tela: 'terciopelo', precio: 375 },
  { id: 44, modelo: 'Sydney', medida: 'Queen', color: 'gris 01', tela: 'terciopelo', precio: 435 }, // el PDF dice «Sidney»
  { id: 45, modelo: 'Tailandia', medida: 'King', color: 'gris', tela: 'cedrito', precio: 835 },
  { id: 30, modelo: 'London', medida: 'King', color: 'gris 01', tela: 'terciopelo', precio: 835 },
  { id: 31, modelo: 'Manila', medida: 'King', color: 'gris 01', tela: 'terciopelo', precio: 455 },
];

/** Todos los montos REF de la promo: los de antes, los de oferta y los copetes (catalogo.js los acepta en el texto). */
export function montosDeLaPromo() {
  return PROMO ? [...OFERTAS.flatMap((o) => [o.antes, o.ahora]), ...COPETES.map((c) => c.precio)] : [];
}

const plano = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Las piezas en oferta de un modelo del catálogo (por su id). */
export function ofertasDe(id) {
  return promoActiva() ? OFERTAS.filter((o) => o.id !== null && o.id === Number(id)) : [];
}

/** Los copetes en stock de un modelo del catálogo (por su id). */
export function copetesDe(id) {
  return promoActiva() ? COPETES.filter((c) => c.id === Number(id)) : [];
}

/**
 * Las piezas de ese modelo con ese precio de oferta (y en esa medida, si se sabe: «Queen 1,60x1,90 M» o «Queen»).
 * Varias si hay más de un color al mismo precio (las tres Noa matrimoniales); [] si no hay ninguna así.
 */
export function ofertaElegida(id, medida, precio) {
  const m = plano(medida);
  return ofertasDe(id).filter((o) => o.ahora === Number(precio) && (!m || m.startsWith(plano(o.medida))));
}

/**
 * Los copetes en stock de ese modelo con ese precio (y en esa medida, si se sabe: «King 2,00x2,00 M» o «King»). Varios si
 * hay más de una tela al mismo precio (los dos de la Italia matrimonial); [] si no hay ninguno así.
 */
export function copeteElegido(id, medida, precio) {
  const m = plano(medida);
  return copetesDe(id).filter((c) => c.precio === Number(precio) && (!m || m.startsWith(plano(c.medida))));
}

/** ¿Tiene ese modelo piezas en oferta en esa medida («Queen 1,60x1,90 M» o «Queen»)? Sin medida, ¿tiene alguna? */
export function hayOfertaEn(id, medida = '') {
  const m = plano(medida);
  return ofertasDe(id).some((o) => !m || m.startsWith(plano(o.medida)));
}

/** «gris 01 en terciopelo / fucsia en terciopelo», con la nota de la pieza si la tiene. */
export function describirPiezas(piezas) {
  return piezas.map((o) => `${[o.color, o.tela].filter(Boolean).join(' en ')}${o.nota ? ` (${o.nota})` : ''}`).join(' / ');
}

const conPuntos = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // 1060 → «1.060», como miles() de catalogo.js

/**
 * «🏷️ En stock con descuento: Queen gris 02 en chenille paño / gris oscuro en lino, a REF 420 (antes REF 520).» Las piezas
 * del mismo precio van juntas. Con `medida` («Queen 1,60x1,90 M»), solo las de esa medida si las hay; si no, todas las
 * del modelo. '' si el modelo no tiene piezas en oferta.
 */
export function ofertasDelModelo(id, medida = '') {
  const todas = ofertasDe(id);
  const m = plano(medida);
  const deEsaMedida = m ? todas.filter((o) => m.startsWith(plano(o.medida))) : [];
  const grupos = new Map();
  for (const o of deEsaMedida.length ? deEsaMedida : todas) {
    const clave = `${o.medida}|${o.antes}|${o.ahora}`;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(o);
  }
  if (!grupos.size) return '';
  const lista = [...grupos.values()]
    .map((g) => `${g[0].medida} ${describirPiezas(g)}, a REF ${conPuntos(g[0].ahora)} (antes REF ${conPuntos(g[0].antes)})`);
  return `🏷️ En stock con descuento: ${lista.join('; ')}.`;
}

const linea = (o) => `- ${o.id ? `[${o.id}] ` : ''}${o.modelo} · ${o.medida} · ${describirPiezas([o])}: REF ${o.antes} → REF ${o.ahora}`
  + `${o.id ? '' : ' (no está en el CATÁLOGO: solo existe esta pieza; no la pongas en "productos")'}`;

/** La sección PROMOCIÓN VIGENTE del prompt (vacía si no hay promo). */
export function promoParaPrompt() {
  if (!PROMO) return '';
  return `PROMOCIÓN VIGENTE (catálogo de ofertas «Mobiliario en stock» de Dekog)
Hay descuentos vigentes: ${PROMO.titulo.toLowerCase()}. Son piezas ya fabricadas, cada una en la medida, el color y la
tela que se indican, y se venden hasta agotar existencia. Fuera de estas piezas no hay otros descuentos: lo demás se
fabrica a pedido al precio del CATÁLOGO (otra medida, otro color, otra tela u otro box no llevan el descuento).
Camas en stock con descuento (precio normal → precio de oferta):
${OFERTAS.map(linea).join('\n')}
Copetes (solo el cabecero, sin la base) en stock, a este precio:
${COPETES.map((c) => `- [${c.id}] ${c.modelo} · ${c.medida} · ${describirPiezas([c])}: REF ${c.precio}`).join('\n')}
Cómo usarla:
- Si preguntan por promociones, descuentos u ofertas, o piden el catálogo de ofertas: di que SÍ hay descuentos vigentes
  (${PROMO.titulo.toLowerCase()}) y que en el catálogo de ofertas están todas las piezas con sus fotos y precios; si viene
  al caso, nombra 2 o 3 ejemplos. El enlace del catálogo de ofertas lo agrega el sistema al final de tu mensaje la
  primera vez y cuando el cliente lo vuelve a pedir: no lo escribas tú. Si ya está en uno de tus mensajes anteriores y
  no lo vuelve a pedir, no digas que va abajo ni lo anuncies: dile que es el que le pasaste más arriba. Si lo vuelve a
  pedir o no le abre, nómbralo «el catálogo de ofertas» (por ejemplo: «aquí tienes otra vez el catálogo de ofertas 👇»).
- Si pide ver lo que está en oferta o en stock (por ejemplo, «¿qué camas tienen en oferta?»), no marques vitrina: nombra
  2 o 3 piezas con su precio de oferta y ponlas en "productos" con su oferta.
- Si preguntan por un modelo que tiene piezas en oferta, da su precio del catálogo y cuéntale también de la pieza en
  stock, con su medida, color, tela y precio de oferta (por ejemplo: «y tenemos una Toronto individual en stock, gris en
  chenille paño, a REF 330 en vez de REF 405»). Si pide una medida que no está en oferta, dile cuáles sí lo están.
- Para que la tarjeta muestre el precio de oferta, pon el modelo en "productos" con la medida de esa pieza y en "oferta"
  su precio de oferta (por ejemplo 330). Con un copete es igual: el modelo con la medida del copete y en "oferta" el
  precio del copete (por ejemplo 455, el de la Manila King), y la tarjeta muestra el precio del copete, no el de la cama
  completa. En cualquier otro caso, oferta = 0.
- No calcules cuánto se ahorra ni el porcentaje de cada pieza: da el precio normal y el de oferta.
- Las piezas en stock van tal cual: no se cambian de tela, color ni box (si quiere otra cosa, es un pedido normal al
  precio del catálogo). No prometas entrega inmediata ni plazos: el día de la entrega lo coordina una asesora.
- Si preguntan por copetes o por comprar solo el cabecero, nombra 2 o 3 de los copetes en stock de la lista, con su
  medida y su precio. El cabecero solo de cualquier otro modelo lo cotiza una asesora.
- Se venden rápido: si quiere una, ofrécele que una asesora le confirme que sigue disponible y se la aparte (derivar,
  área home, con la pieza y su precio de oferta en el resumen).
- No hace falta hablar de la promoción en cada mensaje: a cada cliente nuevo el sistema ya le manda un mensaje con ella.
  Menciónala cuando venga al caso.`;
}

/** El cliente pregunta por ofertas, descuentos o promociones (o pide el catálogo de ofertas). */
export function pideOfertas(texto) {
  return /\b(ofertas?|promos?|promoci[oó]n(es)?|descuentos?|rebajas?|liquidaci[oó]n|stock)\b/i.test(texto ?? '');
}

/**
 * «El catálogo de ofertas», dicho de cualquier forma: «de las ofertas», «de la promo», «con las ofertas», «de productos en
 * oferta», «en descuento», «de stock». No es «el catálogo» a secas ni el de camas o el de mobiliario. Vale para lo que
 * escribe el cliente (pideCatalogoDeOfertas) y para lo que escribe la IA (chat.js agrega el enlace).
 */
export const CATALOGO_DE_OFERTAS = /cat[aá]logos?\s+(?:(?:de|del|con|en)\s+)?(?:(?:la|las|los|el)\s+)?(?:(?:productos|piezas|camas|muebles|modelos|mobiliario)\s+(?:en|de|con)\s+(?:(?:la|las|los|el)\s+)?)?(?:ofertas?|promos?|promoci[oó]n(?:es)?|descuentos?|rebajas?|liquidaci[oó]n|stock)\b/i;

/** «El catálogo de ofertas»: no es el catálogo de camas ni el de mobiliario. */
export function pideCatalogoDeOfertas(texto) {
  return CATALOGO_DE_OFERTAS.test(texto ?? '');
}

// ── El mensaje de la promo que va después de la bienvenida (una vez por cliente y por promo) ──────────────────────
const PIE = 'Si te gusta alguna, escríbeme su nombre y te ayudo 💛';

/** WhatsApp: la imagen arriba, el texto y el botón «Ver ofertas» (1 mensaje del cupo). */
export function promoParaWhatsapp(p = promoActiva()) {
  return {
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      header: { type: 'image', image: { link: p.imagen } },
      body: { text: `🏷️ *¡Tenemos promo!* ${p.titulo.replace(/^Hasta (\d+ %) de descuento/, 'Hasta *$1 de descuento*')}: camas ya fabricadas, a precio especial.\n\nToca «Ver ofertas» para ver todos los modelos con sus medidas y precios. ${PIE}` },
      footer: { text: 'Hasta agotar existencia' },
      action: { name: 'cta_url', parameters: { display_text: 'Ver ofertas', url: p.enlace } },
    },
  };
}

/** WhatsApp, si Meta rechaza el botón: la imagen con el texto y el enlace de pie de foto. */
export function promoParaWhatsappSinBoton(p = promoActiva()) {
  return { type: 'image', image: { link: p.imagen, caption: textoDeLaPromo(p, { formato: true }) } };
}

/** El texto de la promo con el enlace (Instagram, y el respaldo de WhatsApp). */
export function textoDeLaPromo(p = promoActiva(), { formato = false } = {}) {
  const titulo = formato ? p.titulo.replace(/^Hasta (\d+ %) de descuento/, 'Hasta *$1 de descuento*') : p.titulo;
  return `🏷️ ${formato ? '*¡Tenemos promo!*' : '¡Tenemos promo!'} ${titulo}: camas ya fabricadas, a precio especial (hasta agotar existencia).\n\n`
    + `Mira todas las ofertas aquí 👇\n${p.enlace}\n\n${PIE}`; // el enlace solo en su línea (Instagram, 21-oct)
}
