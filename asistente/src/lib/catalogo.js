/**
 * Catálogo del asistente. Lee el MISMO archivo que usa la web
 * (src/data/productos.js), así que un precio cambiado en la web cambia
 * también aquí sin tocar nada más.
 */
import { productos } from '../../../src/data/productos.js';
import { recargosBox, nombresBox, porcentajesValidos, recargosTelaPremium, puffsOpcionales } from './negocio.js';
import { fichas } from './conocimiento.js';
import { promoActiva, montosDeLaPromo, ofertasDe, ofertaElegida, copeteElegido, describirPiezas } from './promo.js';

const SITIO = 'https://www.dekog.net';
// Líneas de camas que cobran el box alta gama o el nube aparte (Clásicas y Kids), cada una con sus recargos.
const CON_BOX = new Set(Object.keys(recargosBox));
const boxDe = (p) => (CON_BOX.has(p?.subcategoria) ? recargosBox[p.subcategoria] : null);
const MAX_CANTIDAD = 20;

const porId = new Map(productos.map((p) => [p.id, p]));

export function buscarProducto(id) {
  return porId.get(Number(id)) ?? null;
}

/**
 * Foto de un producto para WhatsApp e Instagram: su copia JPEG de public/wa (scripts/optimizar_imagenes.py),
 * /muebles/toronto.png → https://www.dekog.net/wa/muebles/toronto.jpg. Casi todas las originales son JPEG con
 * extensión .png y Vercel las sirve como image/png: WhatsApp rechaza esa foto (error 131053, el tipo no coincide)
 * y, como el texto va de pie de foto, el cliente se queda sin respuesta. La web sigue con las originales.
 */
export function fotoParaCanales(id) {
  const p = buscarProducto(id);
  return p ? SITIO + encodeURI(`/wa${p.imagen.replace(/\.[^./]+$/, '')}.jpg`) : null;
}

/**
 * Texto del catálogo para el prompt: una línea por producto, precios exactos, agrupado por
 * categoría (CAMAS, SOFÁS, MESAS) para que la IA no mezcle, por ejemplo, el sofá Dubai entre
 * las camas (pasó el 2026-10-05).
 */
export function catalogoParaPrompt() {
  const grupos = new Map();
  for (const p of productos) {
    const tipo = p.subcategoria ?? p.categoria;
    const precios = p.tallas?.length
      ? p.tallas.map((t) => `${t.nombre}: REF ${t.precio}`).join(' | ')
      : `REF ${p.precio}`;
    // La ficha del catálogo oficial 2026 (conocimiento.js); si un modelo no la tuviera, la etiqueta de la web.
    const ficha = fichas[p.id] ?? p.descripcion ?? p.desc ?? '';
    const grupo = p.categoria ?? 'Otros';
    if (!grupos.has(grupo)) grupos.set(grupo, []);
    grupos.get(grupo).push(`[${p.id}] ${p.nombre} — ${tipo} — ${precios} — ${ficha}`);
  }
  return [...grupos]
    .map(([grupo, lineas]) => `== ${grupo.toUpperCase()} (${lineas.length} modelos) ==\n${lineas.join('\n')}`)
    .join('\n\n');
}

/** Minúsculas y sin acentos, para comparar lo que escribe el cliente. */
export const plano = (texto) => String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const CATEGORIAS = [['Camas', /\bcamas?\b/], ['Sofás', /\bsofas?\b/], ['Mesas', /\bmesas?\b/]];

/** Categoría que pide el cliente ("quiero ver camas" → "Camas"); null si no nombra ninguna o nombra varias. */
export function categoriaPedida(texto) {
  const halladas = CATEGORIAS.filter(([, patron]) => patron.test(plano(texto))).map(([categoria]) => categoria);
  return halladas.length === 1 ? halladas[0] : null;
}

/**
 * Modelos sugeridos por la IA que NO son de la categoría pedida, salvo los que el
 * cliente nombró él mismo ("¿la Dubai también viene en cama?").
 */
export function fueraDeCategoria(sugeridos, categoria, textoCliente) {
  const dicho = plano(textoCliente);
  const nombrado = (nombre) => new RegExp(`(^|[^a-z0-9])${plano(nombre).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(dicho);
  return (sugeridos ?? [])
    .map((s) => buscarProducto(s.id))
    .filter((p) => p && p.categoria !== categoria && !nombrado(p.nombre));
}

// En las Camas Alta Gama el box va incluido (alta gama, curvo o nube según el modelo; la dueña, 8-oct): el +80/+120 es solo de
// Clásicas y Kids. El detector de montos no lo ve, porque 80 o 120 también valen como tela premium en una cama.
// Dentro de la misma frase (sin cruzar «, ; .»), para no confundirlo con un recargo de tela dicho al lado.
const RECARGO_DE_BOX = new RegExp(
  String.raw`\bbox\b[^.!?\n;,]{0,80}(recargo|adicional|\+\s*ref|m[aá]s\s+ref|suma)`
  + String.raw`|\bbox\b[^.!?\n;,]{0,30}\b(cuesta|vale|sale)\b[^.!?\n;,]{0,20}\bref`
  + String.raw`|(recargo|adicional|\+\s*ref|m[aá]s\s+ref)[^.!?\n;,]{0,60}\bbox\b`,
  'i',
);

// Una oración que lo niega («va incluido y no suma nada», «sin costo adicional»: lo que enseñan el prompt y las
// ESPECIFICACIONES) no atribuye ningún recargo, salvo que lleve un monto pegado al box («no está incluido y suma REF 150»).
// Exigir solo el monto no basta: el precio de la cama suele ir en la misma oración.
const NIEGA = /\b(no|nunca|sin|ning[uú]n\w*|nada|incluid[oa]s?)\b/i;
const MONTO_DEL_BOX = /(recargo|adicional|suma|cuesta|vale|sale)\s+(?:de\s+|del\s+|un\s+)?(?:ref\.?\s*)?\d|\+\s*ref\.?\s*\d/i;
const MONTO_ANTES_DEL_BOX = /\+\s*ref\.?\s*\d[^.!?\n;,]{0,30}\bbox\b/i;
const atribuyeRecargoDeBox = (oracion) => RECARGO_DE_BOX.test(oracion)
  && (MONTO_DEL_BOX.test(oracion.slice(oracion.search(/\bbox\b/i))) || MONTO_ANTES_DEL_BOX.test(oracion) || !NIEGA.test(oracion));

/** Camas Alta Gama a las que el texto les atribuye un recargo de box (si en la respuesta no hay también una
 * Clásica o Kids, a las que sí les corresponde). */
export function recargoDeBoxEnAltaGama(texto, sugeridos) {
  const elegidos = (sugeridos ?? []).map((s) => buscarProducto(s.id)).filter(Boolean);
  const altaGama = elegidos.filter((p) => p.subcategoria === 'Camas Alta Gama');
  if (!altaGama.length || elegidos.some((p) => CON_BOX.has(p.subcategoria))) return [];
  // Por oración (un «.» seguido de un dígito es de un monto, «REF 1.125», y no la corta).
  return String(texto ?? '').split(/[!?\n;]|\.(?!\d)/).some(atribuyeRecargoDeBox) ? altaGama : [];
}

/** "Queen 1,60x1,90 M" → "queen160x190m", para comparar sin importar mayúsculas, espacios ni signos. */
function normalizar(texto) {
  return String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

/**
 * La medida que pidió la IA. Coincidencia exacta o, si no, por prefijo ÚNICO
 * ("Queen", "Modular en U"). Si hay duda devuelve null y la tarjeta dice
 * "Desde": nunca se muestra otra medida con otro precio.
 */
function elegirTalla(p, pedida) {
  const tallas = p.tallas ?? [];
  const buscada = normalizar(pedida);
  if (!buscada || !tallas.length) return null;
  const exacta = tallas.find((t) => normalizar(t.nombre) === buscada);
  if (exacta) return exacta;
  const candidatas = tallas.filter((t) => normalizar(t.nombre).startsWith(buscada));
  return candidatas.length === 1 ? candidatas[0] : null;
}

/**
 * Recargo de tela premium para una cama según su medida (Individual +80 … King +150). null si no
 * aplica: no es una cama, o la medida no se reconoce. En sofás y puffs lo confirma una asesora.
 */
export function recargoTela(p, talla) {
  if (p?.categoria !== 'Camas') return null;
  const nombre = normalizar(talla?.nombre ?? '');
  const clave = Object.keys(recargosTelaPremium).find((k) => nombre.startsWith(k));
  return clave ? recargosTelaPremium[clave] : null;
}

/** Puff a juego de un sofá (+REF), o null si ese sofá no lo ofrece. */
export function precioPuff(p) {
  return puffsOpcionales[p?.nombre] ?? null;
}

/**
 * Todos los montos REF válidos de un producto: cada medida, con o sin box (si aplica), con o sin
 * tela premium (camas, según la medida), con o sin su puff (sofás que lo ofrecen) y por cantidad.
 */
// Montos válidos de cada producto, calculados una vez por instancia (el catálogo completo ya se recorre al
// cargar el Worker): rearmarlos en cada mensaje costaba CPU en el plan gratis de 10 ms por pedido.
const montosPorProducto = new Map();
function montosDe(p) {
  if (!montosPorProducto.has(p.id)) montosPorProducto.set(p.id, calcularMontos(p));
  return montosPorProducto.get(p.id);
}
function calcularMontos(p) {
  const tallas = p.tallas?.length ? p.tallas : [{ nombre: '', precio: p.precio }];
  const porBox = boxDe(p);
  const boxes = porBox ? [0, ...Object.values(porBox)] : [0];
  const puff = precioPuff(p);
  const puffs = puff ? [0, puff] : [0];
  const unitarios = new Set();
  // Solo los recargos que aplican a ESTE producto se aceptan sueltos ("+REF 120 del box").
  const recargosPropios = new Set([...boxes.filter(Boolean), ...puffs.filter(Boolean)]);
  for (const t of [...tallas, { nombre: '', precio: p.precio }]) {
    const tela = recargoTela(p, t);
    if (tela) recargosPropios.add(tela);
    for (const b of boxes) for (const tl of tela ? [0, tela] : [0]) for (const pf of puffs) unitarios.add(t.precio + b + tl + pf);
  }
  const montos = new Set(recargosPropios);
  for (const u of unitarios) for (let k = 1; k <= MAX_CANTIDAD; k++) montos.add(u * k);
  return montos;
}

const montosDelCatalogo = new Set(productos.flatMap((p) => [...montosDe(p)]));

/** "1.290", "1,290", "550,00", "550." → número */
function leerMonto(texto) {
  const limpio = texto.replace(/[.,]+$/, '').replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.');
  return Number(limpio);
}

// Los montos de la promoción vigente (lib/promo.js): valen en la oración que habla de la oferta o del stock, o en la
// siguiente («Tenemos piezas en stock. La Manila Queen gris 02 está a REF 420.»). Por palabras enteras y por oración:
// «por ahora», «antes de fabricarla» o «elegantes» no hablan de la promo, así que un precio equivocado que coincide con
// uno de la promo no pasa («Por ahora la Bali Queen está en REF 790»: 790 es la Bali en stock; la Queen cuesta 990).
// «antes REF 520, ahora REF 420» sí habla de ella: es como lo escriben la ficha y lineaPrecio.
const montosDePromo = new Set(montosDeLaPromo());
const HABLA_DE_LA_PROMO = /\b(ofertas?|promos?|promoci[oó]n(es)?|promocional(es)?|descuentos?|rebajas?|rebajad[oa]s?|stock|copetes?|en vez de)\b|\b(antes|ahora)\s*:?\s*((de|a|en)\s+)?REF\b/i;
// Una oración termina en ! ? ; o un salto de línea, o en un punto que no va seguido de un dígito («REF 1.125» no se parte).
const FIN_DE_ORACION = /[!?;\n]|\.(?!\d)/g;

/**
 * (monto, posición en el texto) → ¿es un monto de la promo dicho donde se habla de ella? Las oraciones se arman solo
 * la primera vez que aparece un monto de la promo, y sin promo nunca vale.
 */
function promoDichaEn(texto) {
  let oraciones = null; // [fin, ¿habla de la promo?] de cada oración con algo escrito
  return (n, indice) => {
    if (!montosDePromo.has(n) || !promoActiva()) return false;
    if (!oraciones) {
      oraciones = [];
      let desde = 0;
      for (const fin of [...[...texto.matchAll(FIN_DE_ORACION)].map((m) => m.index + 1), texto.length]) {
        const oracion = texto.slice(desde, fin);
        if (oracion.trim()) oraciones.push([fin, HABLA_DE_LA_PROMO.test(oracion)]);
        desde = fin;
      }
    }
    const k = oraciones.findIndex(([fin]) => indice < fin);
    return k >= 0 && (oraciones[k][1] || (k > 0 && oraciones[k - 1][1]));
  };
}

/**
 * Montos del texto que la IA no debería haber escrito:
 *   - REF, $, USD o "dólares" que no correspondan al catálogo (de los productos
 *     citados si se indican, o de todo el catálogo), salvo montos que el propio
 *     cliente escribió (un presupuesto, por ejemplo) y los de las piezas de la
 *     promoción vigente en una oración que habla de ella;
 *   - cualquier monto en bolívares (esos los calcula el sistema);
 *   - porcentajes no confirmados por Dekog.
 */
export function montosInventados(texto, { ids = [], delCliente = [] } = {}) {
  const citados = ids.map(buscarProducto).filter(Boolean);
  // Se consultan los conjuntos de cada producto citado en vez de unirlos en uno nuevo en cada mensaje.
  const conjuntos = citados.length ? citados.map(montosDe) : [montosDelCatalogo];
  const permitidos = new Set(delCliente);
  const montoDeLaPromo = promoDichaEn(texto);
  const malos = [];
  const revisar = (crudo, coincidencia, indice) => {
    const n = leerMonto(crudo);
    if (!Number.isFinite(n) || conjuntos.some((c) => c.has(n)) || permitidos.has(n) || montoDeLaPromo(n, indice)) return;
    malos.push(coincidencia.trim());
  };
  const monedas = [
    /\bREF\.?\s*:?\s*\$?\s*(\d[\d.,]*)/gi,
    /(\d[\d.,]*)\s*REF\b/gi,
    /(?:US\$|\$|\bUSD)\s*(\d[\d.,]*)/gi,
    /(\d[\d.,]*)\s*(?:\$|\bUSD\b|d[oó]lares)/gi,
  ];
  for (const patron of monedas) {
    for (const m of texto.matchAll(patron)) revisar(m[1], m[0], m.index);
  }
  for (const m of texto.matchAll(/(?:\bBs\.?|bol[ií]vares)\s*\d[\d.,]*|\d[\d.,]*\s*(?:\bBs\b\.?|bol[ií]vares)/gi)) malos.push(m[0].trim());
  const promo = promoActiva();
  for (const m of texto.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) {
    // El 50 % confirmado es el del anticipo: pegado a un descuento, una promoción o Cashea sería inventado. El «hasta
    // 20 %» de la promoción vigente vale, salvo junto a Cashea. Se mira la misma oración (sin cruzar . ! ? ; ni saltos):
    // «hasta 20 % en stock; con el 50 % de anticipo te la apartamos» tiene los dos bien.
    const antes = texto.slice(Math.max(0, m.index - 50), m.index).split(/[.!?;\n]/).pop();
    const despues = texto.slice(m.index + m[0].length, m.index + m[0].length + 50).split(/[.!?;\n]/)[0];
    const cerca = `${antes}${m[0]}${despues}`;
    const n = leerMonto(m[1]);
    const deCashea = /cashea|inicial|cuota/i.test(cerca);
    // Si la oración habla de apartar o del anticipo, solo un descuento pegado al porcentaje lo hace inventado: «la pieza
    // en oferta se aparta con el 50 %» es lo que dicen las políticas, «apártala con 50 % de descuento» no.
    const pegadoADescuento = /^\s*(de\s+)?(descuento|rebaja|off)\b/i.test(despues)
      || /(descuento|rebaja)\s+(de|del)\s*((un|el|hasta)\s+)?$/i.test(antes);
    const delAnticipo = porcentajesValidos.includes(n) && !deCashea
      && (/anticipo|ap[aá]rt|abono/i.test(cerca) ? !pegadoADescuento : !/descuento|promoci|rebaja|oferta|\boff\b/i.test(cerca));
    const deLaPromo = Boolean(promo) && n === promo.hasta && !deCashea;
    if (!delAnticipo && !deLaPromo) malos.push(m[0]);
  }
  return [...new Set(malos)];
}

// Precios "de lista" de todo el catálogo (cada medida sin recargos): se pueden citar siempre.
const preciosDeLista = new Set(productos.flatMap((p) => [p.precio, ...(p.tallas ?? []).map((t) => t.precio)]));

/**
 * Totales del texto que contradicen las tarjetas. Si el cliente armó una configuración con
 * recargos (box, tela premium, puff o varias unidades), cada REF del texto debe ser un precio de
 * lista, un recargo de esa configuración o su total exacto. Así se caza «Toronto King con box nube y
 * tela premium: total REF 815» cuando la tarjeta suma 665 + 150 + 150 = 965 (815 es un monto válido
 * de otra combinación, solo el box o solo la tela, por eso montosInventados no lo ve). Un monto de la
 * promo vale solo en la oración que habla de ella. Devuelve [{ dicho, correcto }].
 */
export function totalesIncoherentes(texto, tarjetas) {
  const conExtras = (tarjetas ?? []).filter((t) => t && !t.desde && (t.recargo || t.recargoTela || t.recargoPuff || t.cantidad > 1));
  if (!conExtras.length) return [];
  const validos = new Set(preciosDeLista);
  for (const t of conExtras) {
    [t.recargo, t.recargoTela, t.recargoPuff, t.unitario, t.ref].filter(Boolean).forEach((n) => validos.add(n));
  }
  const montoDeLaPromo = promoDichaEn(texto); // «y la Toronto individual en stock está a REF 330»
  const malos = [];
  for (const m of texto.matchAll(/\bREF\.?\s*:?\s*\$?\s*(\d[\d.,]*)|(\d[\d.,]*)\s*REF\b/gi)) {
    const n = leerMonto(m[1] ?? m[2]);
    if (Number.isFinite(n) && !validos.has(n) && !montoDeLaPromo(n, m.index)) {
      malos.push({ dicho: m[0].trim(), correcto: conExtras.map((t) => `REF ${t.ref}`).join(' / ') });
    }
  }
  return malos;
}

// Lo que instagram.js agrega al mensaje del cliente cuando comparte una publicación o un reel (con su pie) o responde a
// una historia. Eso no lo escribió el cliente: la IA lo ve, pero no cuenta para los controles del servidor (el pie
// «Conoce nuestros modelos de camas» abría la vitrina de camas, y «Pide nuestro catálogo» mandaba los PDF).
const NOTAS_DE_INSTAGRAM = /\((?:compartió (?:una publicación|un reel) de Instagram(?::\s*«[\s\S]*?»)?|respondió a una historia de Dekog)\)/g;

/** «[Foto del cliente] (compartió una publicación de Instagram: «…») ¿precio?» → «[Foto del cliente] ¿precio?» */
export function sinNotasDeInstagram(texto) {
  return String(texto ?? '').replace(NOTAS_DE_INSTAGRAM, ' ').replace(/\s+/g, ' ').trim();
}

/** Números que escribió el cliente (presupuestos, cantidades): se pueden repetir. Los del pie de lo que compartió en
 * Instagram no los escribió él. */
export function numerosDelCliente(mensajes) {
  return mensajes
    .filter((m) => m.role === 'user')
    .flatMap((m) => [...sinNotasDeInstagram(m.content).matchAll(/\d[\d.,]*/g)].map((x) => leerMonto(x[0])))
    .filter(Number.isFinite);
}

/** 1500 → "1.500" como es-VE, sin Intl (los REF del catálogo son enteros); lo usan meta.js y la vitrina. */
// Cómo se llama el precio sin adicionales en el desglose de la tarjeta.
const BASE_DE = { Camas: 'cama', Sofás: 'sofá', Mesas: 'mesa' };

export const miles = (n) => (Number.isInteger(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : n.toLocaleString('es-VE'));

// 1.003.955,00 como es-VE, sin Intl: crear un formateador de idioma en cada tarjeta cuesta CPU, y el plan
// gratis de Cloudflare da 10 ms por pedido (mismo resultado que toLocaleString en 2.000.000 de montos de prueba).
export function formatoBs(n) {
  const texto = String(Math.abs(n));
  if (texto.includes('e')) return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Como Intl: parte de la representación decimal más corta del número (String(1.005) = «1.005») y redondea
  // a 2 decimales con la mitad hacia arriba. Multiplicar el binario por 100 daría 1,00 en vez de 1,01.
  const [entero, decimales = ''] = texto.split('.');
  const centimos = Number(entero) * 100 + Number(`${decimales}00`.slice(0, 2)) + (decimales[2] >= '5' ? 1 : 0);
  const conPuntos = String(Math.floor(centimos / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}${conPuntos},${String(centimos % 100).padStart(2, '0')}`;
}

/**
 * Tarjeta de una pieza en stock de la promoción vigente: su precio tal cual está (sin box, tela ni puff aparte, y de a
 * una: es una pieza ya fabricada) y de qué color y tela es. La de una cama en oferta lleva además el precio de antes.
 * La de un copete (solo el cabecero) no es una oferta, porque no tiene precio anterior: la distingue `copete`, va sin
 * `antes` (lineaPrecio escribiría «antes REF undefined») y con `oferta` y `enOferta` en false (la web diría «Oferta en
 * stock» y chat.js le agregaría la línea de las ofertas de la cama).
 */
function tarjetaEnStock(p, talla, piezas, tasa, { copete = false } = {}) {
  const [pieza] = piezas;
  const precio = copete ? pieza.precio : pieza.ahora;
  const medida = talla ?? (p.tallas ?? []).find((t) => normalizar(t.nombre).startsWith(normalizar(pieza.medida)));
  return {
    id: p.id,
    nombre: p.nombre,
    tipo: p.subcategoria ?? p.categoria,
    talla: medida?.nombre ?? pieza.medida,
    desde: false,
    box: null,
    recargo: 0,
    tela: null,
    recargoTela: 0,
    telaPorConfirmar: false,
    puff: null,
    recargoPuff: 0,
    cantidad: 1,
    unitario: precio,
    ref: precio,
    partes: null,
    ...(copete ? { copete: true, oferta: false, enOferta: false } : { oferta: true, enOferta: true, antes: pieza.antes }),
    pieza: describirPiezas(piezas),
    bs: tasa ? formatoBs(precio * tasa.valor) : null,
    imagen: SITIO + encodeURI(p.imagen),
  };
}

/**
 * Tarjeta de producto. El precio en bolívares lo calcula el servidor con la
 * tasa del día (la IA nunca escribe montos en Bs) e incluye el box elegido
 * (solo Camas Clásicas y Kids), la tela premium (camas, según la medida), el
 * puff a juego (sofás que lo ofrecen) y la cantidad. Con `oferta` (el precio de
 * una pieza en stock de la promoción vigente, de ese modelo y esa medida: una
 * cama en oferta o un copete), la tarjeta es la de esa pieza; si no coincide
 * con ninguna, la normal.
 */
export function tarjeta(id, tallaPedida, tasa, { box = '', cantidad = 1, telaPremium = false, puff = false, oferta = 0 } = {}) {
  const p = buscarProducto(id);
  if (!p) return null;
  const talla = elegirTalla(p, tallaPedida);
  const piezas = oferta ? ofertaElegida(p.id, talla?.nombre ?? '', oferta) : [];
  if (piezas.length) return tarjetaEnStock(p, talla, piezas, tasa);
  // Un copete en stock va con su precio, nunca como la cama completa con otro (el texto decía REF 455 y la tarjeta, la
  // Manila King entera a REF 760, también en bolívares).
  const copetes = oferta ? copeteElegido(p.id, talla?.nombre ?? '', oferta) : [];
  if (copetes.length) return tarjetaEnStock(p, talla, copetes, tasa, { copete: true });
  const base = talla ? talla.precio : p.precio;
  const porBox = boxDe(p);
  const conBox = porBox && Object.hasOwn(porBox, box) ? box : '';
  const recargo = conBox ? porBox[conBox] : 0;
  // Sin medida elegida, el "desde" de la tela premium es el de la medida más pequeña.
  const tela = telaPremium ? recargoTela(p, talla ?? p.tallas?.[0]) : null;
  const conPuff = puff ? precioPuff(p) : null;
  const unidades = Number.isInteger(cantidad) && cantidad > 1 ? Math.min(cantidad, MAX_CANTIDAD) : 1;
  const unitario = base + recargo + (tela ?? 0) + (conPuff ?? 0);
  const ref = unitario * unidades;
  // Desglose para el cliente («la cama REF 550 + tela premium REF 120 = REF 670»): solo si hay algún adicional.
  const adicionales = [[conBox ? nombresBox[conBox] : '', recargo], ['tela premium', tela ?? 0], ['puff', conPuff ?? 0]]
    .filter(([nombre, monto]) => nombre && monto > 0);
  const partes = adicionales.length ? [[BASE_DE[p.categoria] ?? 'base', base], ...adicionales] : null;
  return {
    id: p.id,
    nombre: p.nombre,
    tipo: p.subcategoria ?? p.categoria,
    talla: talla?.nombre ?? null,
    desde: !talla && Boolean(p.tallas?.length > 1),
    box: conBox ? nombresBox[conBox] : null,
    recargo,
    tela: tela ? 'tela premium' : null,
    recargoTela: tela ?? 0,
    // Pidió tela premium en un sofá o puff: ese recargo lo confirma una asesora (no se suma).
    telaPorConfirmar: Boolean(telaPremium && tela === null),
    puff: conPuff ? 'con puff' : null,
    recargoPuff: conPuff ?? 0,
    cantidad: unidades,
    unitario,
    ref,
    partes,
    // Hay piezas de este modelo en stock con descuento (la vitrina y la ficha lo avisan).
    enOferta: ofertasDe(p.id).length > 0,
    bs: tasa ? formatoBs(ref * tasa.valor) : null,
    imagen: SITIO + encodeURI(p.imagen),
  };
}
