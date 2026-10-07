/**
 * Catálogo del asistente. Lee el MISMO archivo que usa la web
 * (src/data/productos.js), así que un precio cambiado en la web cambia
 * también aquí sin tocar nada más.
 */
import { productos } from '../../../src/data/productos.js';
import { recargosBox, nombresBox, porcentajesValidos, recargosTelaPremium, puffsOpcionales } from './negocio.js';
import { fichas } from './conocimiento.js';

const SITIO = 'https://www.dekog.net';
const CON_BOX = new Set(['Camas Clásicas', 'Camas Kids']);
const MAX_CANTIDAD = 20;

const porId = new Map(productos.map((p) => [p.id, p]));

export function buscarProducto(id) {
  return porId.get(Number(id)) ?? null;
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

const plano = (texto) => String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
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

// En las Camas Alta Gama el box no tiene un recargo fijo (lo confirma una asesora): el +80/+120 es solo de
// Clásicas y Kids. El detector de montos no lo ve, porque 80 o 120 también valen como tela premium en una cama.
// Dentro de la misma frase (sin cruzar «, ; .»), para no confundirlo con un recargo de tela dicho al lado.
const RECARGO_DE_BOX = new RegExp(
  String.raw`\bbox\b[^.!?\n;,]{0,80}(recargo|adicional|\+\s*ref|m[aá]s\s+ref|suma)`
  + String.raw`|\bbox\b[^.!?\n;,]{0,30}\b(cuesta|vale|sale)\b[^.!?\n;,]{0,20}\bref`
  + String.raw`|(recargo|adicional|\+\s*ref|m[aá]s\s+ref)[^.!?\n;,]{0,60}\bbox\b`,
  'i',
);

/** Camas Alta Gama a las que el texto les atribuye un recargo de box (si en la respuesta no hay también una
 * Clásica o Kids, a las que sí les corresponde). */
export function recargoDeBoxEnAltaGama(texto, sugeridos) {
  const elegidos = (sugeridos ?? []).map((s) => buscarProducto(s.id)).filter(Boolean);
  const altaGama = elegidos.filter((p) => p.subcategoria === 'Camas Alta Gama');
  if (!altaGama.length || elegidos.some((p) => CON_BOX.has(p.subcategoria)) || !RECARGO_DE_BOX.test(texto ?? '')) return [];
  return altaGama;
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
function montosDe(p) {
  const tallas = p.tallas?.length ? p.tallas : [{ nombre: '', precio: p.precio }];
  const boxes = CON_BOX.has(p.subcategoria) ? [0, ...Object.values(recargosBox)] : [0];
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

/**
 * Montos del texto que la IA no debería haber escrito:
 *   - REF, $, USD o "dólares" que no correspondan al catálogo (de los productos
 *     citados si se indican, o de todo el catálogo), salvo montos que el propio
 *     cliente escribió (un presupuesto, por ejemplo);
 *   - cualquier monto en bolívares (esos los calcula el sistema);
 *   - porcentajes no confirmados por Dekog.
 */
export function montosInventados(texto, { ids = [], delCliente = [] } = {}) {
  const citados = ids.map(buscarProducto).filter(Boolean);
  const validos = citados.length ? new Set(citados.flatMap((p) => [...montosDe(p)])) : montosDelCatalogo;
  const permitidos = new Set(delCliente);
  const malos = [];
  const revisar = (crudo, coincidencia) => {
    const n = leerMonto(crudo);
    if (Number.isFinite(n) && !validos.has(n) && !permitidos.has(n)) malos.push(coincidencia.trim());
  };
  const monedas = [
    /\bREF\.?\s*:?\s*\$?\s*(\d[\d.,]*)/gi,
    /(\d[\d.,]*)\s*REF\b/gi,
    /(?:US\$|\$|\bUSD)\s*(\d[\d.,]*)/gi,
    /(\d[\d.,]*)\s*(?:\$|\bUSD\b|d[oó]lares)/gi,
  ];
  for (const patron of monedas) {
    for (const m of texto.matchAll(patron)) revisar(m[1], m[0]);
  }
  for (const m of texto.matchAll(/(?:\bBs\.?|bol[ií]vares)\s*\d[\d.,]*|\d[\d.,]*\s*(?:\bBs\b\.?|bol[ií]vares)/gi)) malos.push(m[0].trim());
  for (const m of texto.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) {
    if (!porcentajesValidos.includes(leerMonto(m[1]))) malos.push(m[0]);
  }
  return [...new Set(malos)];
}

// Precios "de lista" de todo el catálogo (cada medida sin recargos): se pueden citar siempre.
const preciosDeLista = new Set(productos.flatMap((p) => [p.precio, ...(p.tallas ?? []).map((t) => t.precio)]));

/**
 * Totales del texto que contradicen las tarjetas. Si el cliente armó una configuración con
 * recargos (box, tela premium, puff o varias unidades), cada REF del texto debe ser un precio de
 * lista, un recargo de esa configuración o su total exacto. Así se caza «King con box nube y tela
 * premium: total REF 785» cuando la tarjeta suma 665 + 120 + 150 = 935 (785 es un monto válido de
 * otra combinación, por eso montosInventados no lo ve). Devuelve [{ dicho, correcto }].
 */
export function totalesIncoherentes(texto, tarjetas) {
  const conExtras = (tarjetas ?? []).filter((t) => t && !t.desde && (t.recargo || t.recargoTela || t.recargoPuff || t.cantidad > 1));
  if (!conExtras.length) return [];
  const validos = new Set(preciosDeLista);
  for (const t of conExtras) {
    [t.recargo, t.recargoTela, t.recargoPuff, t.unitario, t.ref].filter(Boolean).forEach((n) => validos.add(n));
  }
  const malos = [];
  for (const m of texto.matchAll(/\bREF\.?\s*:?\s*\$?\s*(\d[\d.,]*)|(\d[\d.,]*)\s*REF\b/gi)) {
    const n = leerMonto(m[1] ?? m[2]);
    if (Number.isFinite(n) && !validos.has(n)) malos.push({ dicho: m[0].trim(), correcto: conExtras.map((t) => `REF ${t.ref}`).join(' / ') });
  }
  return malos;
}

/** Números que escribió el cliente (presupuestos, cantidades): se pueden repetir. */
export function numerosDelCliente(mensajes) {
  return mensajes
    .filter((m) => m.role === 'user')
    .flatMap((m) => [...m.content.matchAll(/\d[\d.,]*/g)].map((x) => leerMonto(x[0])))
    .filter(Number.isFinite);
}

function formatoBs(n) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Tarjeta de producto. El precio en bolívares lo calcula el servidor con la
 * tasa del día (la IA nunca escribe montos en Bs) e incluye el box elegido
 * (solo Camas Clásicas y Kids), la tela premium (camas, según la medida), el
 * puff a juego (sofás que lo ofrecen) y la cantidad.
 */
export function tarjeta(id, tallaPedida, tasa, { box = '', cantidad = 1, telaPremium = false, puff = false } = {}) {
  const p = buscarProducto(id);
  if (!p) return null;
  const talla = elegirTalla(p, tallaPedida);
  const base = talla ? talla.precio : p.precio;
  const conBox = CON_BOX.has(p.subcategoria) && recargosBox[box] ? box : '';
  const recargo = conBox ? recargosBox[conBox] : 0;
  // Sin medida elegida, el "desde" de la tela premium es el de la medida más pequeña.
  const tela = telaPremium ? recargoTela(p, talla ?? p.tallas?.[0]) : null;
  const conPuff = puff ? precioPuff(p) : null;
  const unidades = Number.isInteger(cantidad) && cantidad > 1 ? Math.min(cantidad, MAX_CANTIDAD) : 1;
  const unitario = base + recargo + (tela ?? 0) + (conPuff ?? 0);
  const ref = unitario * unidades;
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
    bs: tasa ? formatoBs(ref * tasa.valor) : null,
    imagen: SITIO + encodeURI(p.imagen),
  };
}
