/**
 * Vitrina: cuando el cliente pide VER una categoría («quiero ver camas»), el asistente le muestra hasta 10
 * modelos (no solo los 0–3 que nombra la IA) y el enlace al catálogo de la web ya filtrado. Si pide más,
 * le muestra los que todavía no vio. Todo se calcula con el catálogo (cero IA, cero KV extra) y sin Intl/ICU.
 *
 * Quién decide: la IA marca `vitrina` en el ESQUEMA (prompt.js); respaldo sin IA para frases explícitas.
 * Qué vio el cliente: una nota «[Vitrina «Camas»: Toronto, Milan, …]» que se agrega al mensaje del
 * asistente en el historial (KV en WhatsApp/Instagram; sessionStorage en la web).
 */
import { productos } from '../../../src/data/productos.js';
import { tarjeta, buscarProducto, categoriaPedida, plano } from './catalogo.js';

const SITIO = 'https://www.dekog.net';
export const MAX = 10; // filas de una lista de WhatsApp / tarjetas de un generic template de Instagram
export const PAGINA = 9; // si quedan más de 10, van 9 y el lugar 10 es «Ver más»

const esPuff = (p) => /^puff\b/i.test(p.nombre);
/** Sección de un producto en la vitrina: la línea en las camas; los puffs, aparte de los sofás. */
export const seccionDe = (p) => (p.categoria === 'Camas' ? p.subcategoria : esPuff(p) ? 'Puffs' : p.categoria);
const LINEA = { 'Camas Clásicas': 'Clásica', 'Camas Kids': 'Kids', 'Camas Alta Gama': 'Alta Gama', Sofás: 'Sofá', Puffs: 'Puff', Mesas: 'Mesa' };

// Las claves son el enum `vitrina` del ESQUEMA. `filtro` es el ?categoria= que entiende la web (Home.jsx).
const DEFINICION = {
  camas: { titulo: 'Camas', categoria: 'Camas', filtro: 'camas', boton: 'las {n} camas', mas: 'Ver más camas', grupos: [['Camas Clásicas', 3], ['Camas Kids', 2], ['Camas Alta Gama', 4]] },
  camas_clasicas: { titulo: 'Camas Clásicas', categoria: 'Camas', filtro: 'camas-clasicas', boton: 'las {n} Camas Clásicas', mas: 'Ver más Clásicas', grupos: [['Camas Clásicas', PAGINA]] },
  camas_kids: { titulo: 'Camas Kids', categoria: 'Camas', filtro: 'camas-kids', boton: 'las {n} Camas Kids', mas: 'Ver más Kids', grupos: [['Camas Kids', PAGINA]] },
  camas_alta_gama: { titulo: 'Camas Alta Gama', categoria: 'Camas', filtro: 'camas-alta-gama', boton: 'las {n} Camas Alta Gama', mas: 'Ver más Alta Gama', grupos: [['Camas Alta Gama', PAGINA]] },
  sofas: { titulo: 'Sofás', categoria: 'Sofás', filtro: 'sofas', boton: 'los {n} sofás y puffs', mas: 'Ver más sofás', grupos: [['Sofás', PAGINA]] },
  puffs: { titulo: 'Puffs', categoria: 'Sofás', filtro: 'sofas', boton: 'los {n} sofás y puffs', mas: 'Ver más puffs', grupos: [['Puffs', PAGINA]] },
  mesas: { titulo: 'Mesas', categoria: 'Mesas', filtro: 'mesas', boton: 'las {n} mesas', mas: 'Ver más mesas', grupos: [['Mesas', PAGINA]] },
};
export const CLAVES_VITRINA = Object.keys(DEFINICION);

// Lo que muestra la web con cada ?categoria= (mismo criterio que el filtro de Home.jsx): da el número del botón.
const EN_LA_WEB = {
  camas: (p) => p.categoria === 'Camas',
  'camas-clasicas': (p) => p.subcategoria === 'Camas Clásicas',
  'camas-kids': (p) => p.subcategoria === 'Camas Kids',
  'camas-alta-gama': (p) => p.subcategoria === 'Camas Alta Gama',
  sofas: (p) => p.categoria === 'Sofás',
  mesas: (p) => p.categoria === 'Mesas',
};

const porSeccion = new Map();
for (const p of productos) {
  const s = seccionDe(p);
  if (!porSeccion.has(s)) porSeccion.set(s, []);
  porSeccion.get(s).push(p);
}
for (const lista of porSeccion.values()) lista.sort((a, b) => a.precio - b.precio); // estable: a igual precio, el orden de la web

export const VITRINAS = Object.fromEntries(Object.entries(DEFINICION).map(([clave, d]) => [clave, {
  clave,
  titulo: d.titulo,
  categoria: d.categoria,
  mas: d.mas,
  grupos: d.grupos.map(([seccion, cupo]) => ({ seccion, cupo })),
  todos: d.grupos.flatMap(([seccion]) => porSeccion.get(seccion) ?? []),
  boton: `Ver ${d.boton.replace('{n}', productos.filter(EN_LA_WEB[d.filtro]).length)}`,
  ruta: `/?categoria=${d.filtro}#catalogo`,
  url: `${SITIO}/?categoria=${d.filtro}#catalogo`,
}]));

/** k modelos de una lista ordenada por precio, de punta a punta (uno por precio distinto mientras alcancen). */
function repartir(lista, k) {
  if (lista.length <= k) return lista;
  if (k === 1) return [lista[0]];
  const unoPorPrecio = lista.filter((p, i) => i === 0 || p.precio !== lista[i - 1].precio);
  const base = unoPorPrecio.length >= k ? unoPorPrecio : lista;
  return [...new Set(Array.from({ length: k }, (_, i) => base[Math.round((i * (base.length - 1)) / (k - 1))]))];
}

/** Qué mostrar: lo que no ha visto (una sección de ≤ 10 va siempre entera); si todo cabe en 10, entero; si no, 9. */
export function seleccionar(v, sugeridos = [], vistos = new Set()) {
  let libres = v.todos.length <= MAX ? v.todos : v.todos.filter((p) => !vistos.has(p.id));
  if (!libres.length) libres = v.todos; // ya los vio todos: se empieza de nuevo
  const yaVistos = v.todos.length - libres.length;
  let elegidos;
  if (libres.length <= MAX) {
    elegidos = libres;
  } else {
    elegidos = [];
    const sobra = [];
    for (const { seccion, cupo } of v.grupos) {
      const delGrupo = libres.filter((p) => seccionDe(p) === seccion);
      const propios = sugeridos.map((id) => buscarProducto(id)).filter((p) => p && delGrupo.includes(p));
      const tomados = [...new Set([...propios, ...repartir(delGrupo, cupo)])].slice(0, cupo);
      elegidos.push(...tomados);
      sobra.push(...delGrupo.filter((p) => !tomados.includes(p)));
    }
    for (const p of sobra) { // un grupo con menos de su cupo: se completa con los otros
      if (elegidos.length >= PAGINA) break;
      elegidos.push(p);
    }
  }
  const orden = (p) => v.grupos.findIndex((g) => g.seccion === seccionDe(p));
  elegidos = [...elegidos].sort((a, b) => orden(a) - orden(b) || a.precio - b.precio);
  return { ids: elegidos.map((p) => p.id), yaVistos, quedan: libres.length - elegidos.length, total: v.todos.length };
}

// ── Nota del historial ───────────────────────────────────────────────────────────────────────────
const NOTA = /\[Vitrina «([^»\]]+)»: ([^\]]*)\]/g;
const idPorNombre = new Map(productos.map((p) => [p.nombre, p.id]));
const clavePorTitulo = new Map(Object.values(VITRINAS).map((v) => [v.titulo, v.clave]));

/** Modelos ya vistos en vitrinas (todas las notas del historial) y la clave de la última vitrina mostrada. */
export function vitrinasPrevias(mensajes = []) {
  const vistos = new Set();
  let ultima = null;
  for (const m of mensajes) {
    if (m?.role !== 'assistant' || typeof m.content !== 'string' || !m.content.includes('[Vitrina «')) continue;
    for (const [, titulo, nombres] of m.content.matchAll(NOTA)) {
      for (const n of nombres.split(', ')) if (idPorNombre.has(n)) vistos.add(idPorNombre.get(n));
      if (clavePorTitulo.has(titulo)) ultima = clavePorTitulo.get(titulo);
    }
  }
  return { vistos, ultima };
}

/** La IA nunca escribe la nota: si la copia, se quita de su texto. */
export const quitarNotas = (texto) => {
  const s = String(texto ?? '');
  // Sin \s* delante: con muchos espacios seguidos esa regex se vuelve cuadrática (el texto puede venir del navegador).
  return s.includes('[Vitrina «') ? s.replace(/\[Vitrina «[^\]]*\]/g, '').replace(/\n{3,}/g, '\n\n').trim() : s.trim();
};

/** Lo que devuelve pensar() en `vitrina`: tarjetas «desde» con su sección y su línea, el enlace y la nota. */
export function armarVitrina(v, { sugeridos = [], vistos = new Set(), tasa = null } = {}) {
  const s = seleccionar(v, sugeridos, vistos);
  const tarjetas = s.ids.map((id) => {
    const t = tarjeta(id, '', tasa);
    const seccion = seccionDe(buscarProducto(id));
    return t && { ...t, seccion, linea: LINEA[seccion] ?? seccion };
  }).filter(Boolean);
  const n = tarjetas.length;
  return {
    clave: v.clave,
    titulo: v.titulo,
    total: s.total,
    quedan: s.quedan,
    mas: s.quedan > 0 ? v.mas : null, // texto de la fila / respuesta rápida «Ver más …», o null
    // «Camas · 9 de 40 modelos», «Camas · otros 9 de 40 modelos», «Mesas · 8 modelos»
    rotulo: n === s.total ? `${v.titulo} · ${n} modelos` : `${v.titulo} · ${s.yaVistos ? 'otros ' : ''}${n} de ${s.total} modelos`,
    boton: v.boton,
    ruta: v.ruta,
    url: v.url,
    nota: `[Vitrina «${v.titulo}»: ${tarjetas.map((t) => t.nombre).join(', ')}]`,
    productos: tarjetas,
  };
}

/** «Ver más …» tocado en WhatsApp o Instagram (sin IA): la página siguiente de esa vitrina. */
export function vitrinaSiguiente(clave, mensajes, tasa = null) {
  return VITRINAS[clave] ? armarVitrina(VITRINAS[clave], { vistos: vitrinasPrevias(mensajes).vistos, tasa }) : null;
}

// ── Detección sin IA ─────────────────────────────────────────────────────────────────────────────
const SECCION = String.raw`(camas?|sofas?|mesas?|puffs?)`;
const PIDE_VER = [
  new RegExp(String.raw`\b(?:ver|mirar|conocer|mostrar|muestrame|ensename|mandame)\s+(?:(?:las|los|unas|unos|sus|mas|otras|otros|todas|todos)\s+)*(?:(?:modelos|opciones)\s+de\s+)?${SECCION}\b`),
  new RegExp(String.raw`\bque\s+(?:modelos\s+de\s+)?${SECCION}\s+(?:tienen|tienes|hay|venden|manejan|ofrecen)\b`),
  new RegExp(String.raw`\b(?:opciones|modelos|catalogo|fotos)\s+de\s+${SECCION}\b`),
  new RegExp(String.raw`\b(?:tienen|tienes|hay|venden)\s+${SECCION}\s*\??$`),
  new RegExp(String.raw`\b(?:tienen|tienes|hay|venden)\s+(camas?)\s+(?:para\s+)?(?:ninos?|ninas?|kids|infantiles?|juveniles?)\b`),
];
const PIDE_MAS = [
  /\b(?:mas|otr[oa]s)\s+(?:opciones|modelos|camas?|sofas?|mesas?|puffs?)\b/, // «más camas», «otras opciones»
  /\b(?:ver|muestrame|ensename|mandame|dame|pasame|tienes|tienen|hay)\s+(?:mas|otr[oa]s?)\s*[?!.]*\s*$/, // «¿tienes más?»
  /\bque\s+(?:mas|otr[oa]s)\s+(?:tienen|tienes|hay)\b/, // «¿qué más tienen?»
  /\b(?:los|las)\s+demas\b/, // «¿y las demás?»
  /^\s*(?:y\s+)?(?:mas|otr[oa]s?)\s*[?!.]*\s*$/, // «¿más?», «otras»
];
// «máximo» (la cama MÁXIMO) es también una palabra común: «camas de máximo 600» no nombra un modelo.
const NOMBRES = productos.map((p) => ` ${plano(p.nombre).replace(/[^a-z0-9]+/g, ' ').trim()} `).filter((n) => n !== ' maximo ');

/** ¿Nombra un modelo concreto? Entonces pregunta por ese modelo: no hay vitrina. */
export function nombraModelo(texto) {
  const dicho = ` ${plano(texto).replace(/[^a-z0-9]+/g, ' ').trim()} `;
  return NOMBRES.some((n) => dicho.includes(n));
}

/** Clave de vitrina si el texto pide explícitamente ver una categoría; '' si no. */
export function pideVerCategoria(texto) {
  const t = plano(texto);
  const m = PIDE_VER.map((r) => t.match(r)).find(Boolean);
  if (!m) return '';
  const seccion = m[1].replace(/s$/, '');
  if (seccion === 'cama') {
    if (/\b(ninos?|ninas?|kids|infantil(es)?|juvenil(es)?|hij[oa]s?|bebes?)\b/.test(t)) return 'camas_kids';
    if (/\bclasicas?\b/.test(t)) return 'camas_clasicas';
    if (/(?<!box\s)\balta gama\b/.test(t)) return 'camas_alta_gama';
    return 'camas';
  }
  return { sofa: 'sofas', mesa: 'mesas', puff: 'puffs' }[seccion] ?? '';
}

/** ¿Pide ver más u otras opciones («muéstrame otras», «¿tienes más?»)? No: «¿cuál es más barata?». */
export function pideMas(texto) {
  const t = plano(texto).replace(/[¿¡]/g, '').trim();
  return PIDE_MAS.some((r) => r.test(t));
}

/**
 * La vitrina a mostrar (de VITRINAS) o null. `marcada`: lo que puso la IA; `ultimo`: el último mensaje del
 * cliente; `mensajes`: el historial con las notas.
 *  - Manda lo que escribió el cliente: si nombra otra categoría que la marcada, se ignora la marca.
 *  - Sin marca, vale la frase explícita («quiero ver camas») o «muéstrame más» (sigue la última vitrina).
 *  - Si nombra un modelo concreto, no hay vitrina.
 *  - La misma vitrina que la última mostrada solo se repite (con modelos nuevos) si el cliente lo pidió, y nunca si
 *    ya vio todos sus modelos.
 * `previas` (de vitrinasPrevias) se calcula una sola vez por mensaje en quien llama.
 */
export function resolverVitrina(marcada, ultimo, mensajes = [], previas = vitrinasPrevias(mensajes)) {
  const pedida = categoriaPedida(ultimo);
  const explicita = pideVerCategoria(ultimo);
  const mas = pideMas(ultimo);
  const { ultima, vistos } = previas;
  const marcadaOk = Object.hasOwn(VITRINAS, marcada) && !(pedida && VITRINAS[marcada].categoria !== pedida);
  // «¿tienes otras?» sigue la última vitrina solo si el último mensaje del asistente la mostró.
  let anterior = null;
  for (let i = mensajes.length - 1; i >= 0 && !anterior; i--) if (mensajes[i]?.role === 'assistant') anterior = mensajes[i];
  const recien = typeof anterior?.content === 'string' && anterior.content.includes('[Vitrina «');
  const clave = marcadaOk ? marcada : explicita || (mas && recien && ultima ? ultima : '');
  if (!clave) return null;
  // Nombrar un modelo solo anula el respaldo sin IA: «quiero ver camas, soy de Barcelona» no nombra la cama Barcelona.
  if (!marcadaOk && nombraModelo(ultimo)) return null;
  if (clave === ultima && !explicita && !mas) return null;
  if (clave === ultima && VITRINAS[clave].todos.every((p) => vistos.has(p.id))) return null;
  return VITRINAS[clave];
}

/**
 * Para el precalentado de chat.js: compila en el arranque las expresiones y funciones de la vitrina (puro y
 * síncrono). Cada texto va con y sin emoji: V8 compila aparte cada expresión para texto de 1 y de 2 bytes.
 * La vitrina se arma UNA sola vez: lo que se asigna en el arranque adelanta la primera recolección de memoria,
 * y si cae en el primer pedido de la instancia le suma ~1,5 ms (medido en workerd).
 */
export function calentarVitrina() {
  let vistos;
  for (const extra of ['', ' 👋']) {
    const historial = [{ role: 'assistant', content: `Hola${extra}\n\n[Vitrina «Camas»: Toronto, Milan]` }];
    for (const t of [`Quiero ver camas${extra}`, `muéstrame otras${extra}`, `¿tienen camas para niños?${extra}`]) {
      resolverVitrina('', t, historial);
      quitarNotas(`${t}\n\n[Vitrina «Camas»: Toronto]`);
    }
    ({ vistos } = vitrinasPrevias(historial));
  }
  armarVitrina(VITRINAS.camas, { sugeridos: [48], vistos, tasa: { valor: 1, etiqueta: '', fecha: '' } });
}
