/**
 * Catálogo del asistente. Lee el MISMO archivo que usa la web
 * (src/data/productos.js), así que un precio cambiado en la web cambia
 * también aquí sin tocar nada más.
 */
import { productos } from '../../../src/data/productos.js';
import { recargosValidos } from './negocio.js';

const SITIO = 'https://www.dekog.net';

const porId = new Map(productos.map((p) => [p.id, p]));

export function buscarProducto(id) {
  return porId.get(Number(id)) ?? null;
}

/** Texto del catálogo para el prompt: una línea por producto, precios exactos. */
export function catalogoParaPrompt() {
  return productos
    .map((p) => {
      const tipo = p.subcategoria ?? p.categoria;
      const precios = p.tallas?.length
        ? p.tallas.map((t) => `${t.nombre}: REF ${t.precio}`).join(' | ')
        : `REF ${p.precio}`;
      const extra = p.descripcion ? ` — ${p.descripcion}` : '';
      return `[${p.id}] ${p.nombre} — ${tipo} — ${p.desc ?? ''} — ${precios}${extra}`;
    })
    .join('\n');
}

/**
 * Todos los montos REF que pueden aparecer legítimamente en una respuesta:
 * precios del catálogo, recargos de box y, en Camas Clásicas y Kids, el total
 * de cada medida con su recargo.
 */
const conBox = new Set(['Camas Clásicas', 'Camas Kids']);
export const montosValidos = new Set([
  ...recargosValidos,
  ...productos.flatMap((p) => {
    const precios = [p.precio, ...(p.tallas ?? []).map((t) => t.precio)];
    if (!conBox.has(p.subcategoria)) return precios;
    return [...precios, ...precios.flatMap((x) => recargosValidos.map((r) => x + r))];
  }),
]);

/** Devuelve los montos "REF n" del texto que no existen en el catálogo. */
export function montosInventados(texto) {
  const malos = [];
  for (const m of texto.matchAll(/REF\s*\$?\s*([\d.,]+)/gi)) {
    const n = Number(m[1].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
    if (!montosValidos.has(n)) malos.push(m[0]);
  }
  return malos;
}

function formatoBs(n) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Tarjeta de producto para el chat. El precio en bolívares lo calcula el
 * servidor con la tasa del día: la IA nunca escribe montos en Bs.
 */
export function tarjeta(id, tallaPedida, tasa) {
  const p = buscarProducto(id);
  if (!p) return null;
  const talla = p.tallas?.find((t) => t.nombre === tallaPedida)
    ?? p.tallas?.find((t) => tallaPedida && t.nombre.toLowerCase().startsWith(tallaPedida.toLowerCase().split(' ')[0]))
    ?? null;
  const ref = talla ? talla.precio : p.precio;
  return {
    id: p.id,
    nombre: p.nombre,
    tipo: p.subcategoria ?? p.categoria,
    talla: talla?.nombre ?? null,
    desde: !talla && Boolean(p.tallas?.length > 1),
    ref,
    bs: tasa ? formatoBs(ref * tasa.valor) : null,
    imagen: SITIO + encodeURI(p.imagen),
  };
}
