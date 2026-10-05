/**
 * Catálogo del asistente. Lee el MISMO archivo que usa la web
 * (src/data/productos.js), así que un precio cambiado en la web cambia
 * también aquí sin tocar nada más.
 */
import { productos } from '../../../src/data/productos.js';
import { recargosBox, nombresBox, porcentajesValidos } from './negocio.js';

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
    const extra = p.descripcion ? ` — ${p.descripcion}` : '';
    const grupo = p.categoria ?? 'Otros';
    if (!grupos.has(grupo)) grupos.set(grupo, []);
    grupos.get(grupo).push(`[${p.id}] ${p.nombre} — ${tipo} — ${p.desc ?? ''} — ${precios}${extra}`);
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

/** Todos los montos REF válidos de un producto: cada medida, con box (si aplica) y por cantidad. */
function montosDe(p) {
  const bases = [p.precio, ...(p.tallas ?? []).map((t) => t.precio)];
  const recargos = CON_BOX.has(p.subcategoria) ? [0, ...Object.values(recargosBox)] : [0];
  const unitarios = bases.flatMap((b) => recargos.map((r) => b + r));
  const montos = new Set(Object.values(recargosBox));
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
 * (solo Camas Clásicas y Kids) y la cantidad.
 */
export function tarjeta(id, tallaPedida, tasa, { box = '', cantidad = 1 } = {}) {
  const p = buscarProducto(id);
  if (!p) return null;
  const talla = elegirTalla(p, tallaPedida);
  const base = talla ? talla.precio : p.precio;
  const conBox = CON_BOX.has(p.subcategoria) && recargosBox[box] ? box : '';
  const recargo = conBox ? recargosBox[conBox] : 0;
  const unidades = Number.isInteger(cantidad) && cantidad > 1 ? Math.min(cantidad, MAX_CANTIDAD) : 1;
  const unitario = base + recargo;
  const ref = unitario * unidades;
  return {
    id: p.id,
    nombre: p.nombre,
    tipo: p.subcategoria ?? p.categoria,
    talla: talla?.nombre ?? null,
    desde: !talla && Boolean(p.tallas?.length > 1),
    box: conBox ? nombresBox[conBox] : null,
    recargo,
    cantidad: unidades,
    unitario,
    ref,
    bs: tasa ? formatoBs(ref * tasa.valor) : null,
    imagen: SITIO + encodeURI(p.imagen),
  };
}
