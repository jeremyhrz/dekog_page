/**
 * El chat del asistente de Dekog, independiente de la plataforma: recibe el
 * cuerpo ya parseado y devuelve { status, datos }. El Worker (worker.js) lo
 * expone como POST /chat.
 *
 * Chat:   { mensajes: [{ role: "user" | "assistant", content: string }, ...] }
 *      →  { respuesta, productos: [tarjetas], whatsapp: { url, linea } | null, tasa, formulario, interes, resumen }
 * Datos:  { conversacion, nombre, telefono, ciudad, interes, resumen } → { guardado }
 *
 * Privacidad: la IA no debe recibir datos personales. Antes de enviarle la
 * conversación se ocultan teléfonos, correos, cédulas y usuarios, y los datos
 * de contacto se dejan en un formulario aparte que va directo a la hoja.
 * (Nombres y direcciones escritos a mano no se pueden detectar con seguridad:
 * el widget le pide al cliente que no los escriba en el chat.)
 *
 * Los precios en bolívares y el enlace de WhatsApp los arma el servidor; la IA
 * solo decide qué decir, qué productos mostrar y cuándo pasar a una asesora.
 */
import { responder, proveedorActivo, RechazoDelModelo } from './lib/llm.js';
import {
  tarjeta, montosInventados, numerosDelCliente, categoriaPedida, fueraDeCategoria, totalesIncoherentes, recargoDeBoxEnAltaGama,
} from './lib/catalogo.js';
import { tasaBcv } from './lib/bcv.js';
import { lineas, lineaPorArea } from './lib/negocio.js';
import { guardarCliente } from './lib/hoja.js';

const MAX_MENSAJES = 16;
// Tiempo total para la IA, contando una posible corrección. En la web el navegador espera hasta 40 s; en
// WhatsApp e Instagram la respuesta se arma después de contestarle a Meta y Cloudflare da 30 s para eso.
const PRESUPUESTO_IA_MS = { web: 30000, whatsapp: 24000, instagram: 24000 };
const MINIMO_PARA_CORREGIR_MS = 6000;
const MAX_CARACTERES = 800;
const LIMITE_POR_IP = { pedidos: 20, ventanaMs: 5 * 60 * 1000, maxIps: 5000 };
const pedidosPorIp = new Map();

// Límite por IP en memoria: frena abusos dentro de una misma instancia (no es global).
function excedeLimite(ip) {
  const ahora = Date.now();
  const recientes = (pedidosPorIp.get(ip) ?? []).filter((t) => ahora - t < LIMITE_POR_IP.ventanaMs);
  recientes.push(ahora);
  pedidosPorIp.delete(ip);
  pedidosPorIp.set(ip, recientes); // al final: el Map queda ordenado del menos al más reciente
  if (pedidosPorIp.size > LIMITE_POR_IP.maxIps) {
    // Se descartan solo las IP más antiguas; nunca se reinician todos los contadores.
    for (const vieja of pedidosPorIp.keys()) {
      if (pedidosPorIp.size <= LIMITE_POR_IP.maxIps * 0.8) break;
      pedidosPorIp.delete(vieja);
    }
  }
  return recientes.length > LIMITE_POR_IP.pedidos;
}

const ORIGEN = { web: 'de la web', whatsapp: 'de WhatsApp', instagram: 'de Instagram' };

function enlaceWhatsapp(area, resumen, canal = 'web') {
  const codigo = lineaPorArea[area] ?? '01';
  const linea = lineas[codigo];
  const texto = `Hola Dekog, vengo del asistente ${ORIGEN[canal] ?? ORIGEN.web} 👋\n${resumen}`.trim();
  return { url: `https://wa.me/${linea.numero}?text=${encodeURIComponent(texto)}`, linea: linea.nombre };
}

function limpiarMensajes(entrada) {
  if (!Array.isArray(entrada)) return null;
  const mensajes = entrada
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_MENSAJES)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CARACTERES) }));
  while (mensajes.length && mensajes[0].role !== 'user') mensajes.shift();
  if (!mensajes.length || mensajes.at(-1).role !== 'user') return null;
  return mensajes;
}

const OCULTO = '[dato personal]';
const MONEDA_ANTES = /(?:\bref\.?|\bbs\.?|\$|\busd|€)\s*$/i;
const MONEDA_DESPUES = /^\s*(?:ref\b|bs\b|bol[ií]vares|\$|usd\b|€|d[oó]lares)/i;
const FECHA = /^\d{1,2}[-./]\d{1,2}[-./]\d{2,4}$/;

/**
 * Oculta datos personales antes de enviar el texto a la IA:
 *   - correos (también "maria arroba gmail punto com" o con espacios);
 *   - usuarios de redes (@usuario) y cédulas (V-12.345.678, "cédula 987654");
 *   - números de 7 dígitos o más (teléfonos, cuentas), con cualquier separador.
 * NO toca montos junto a una moneda (REF 1.290, Bs 1.003.955, 8.000.000 $) ni
 * fechas: los precios del catálogo y del cliente siguen siendo legibles.
 */
export function ocultarDatosPersonales(entrada) {
  let s = String(entrada).normalize('NFKC');
  s = s.replace(/[\p{L}\p{N}._%+-]+\s?(?:@|\barroba\b|\(at\))\s?[\p{L}\p{N}-]+(?:(?:\.(?=[\p{L}\p{N}])|\s+punto\s+)[\p{L}\p{N}-]+)*/giu, OCULTO);
  s = s.replace(/(^|[\s:(])@[\w.]{3,30}/g, `$1${OCULTO}`);
  // Cédula / RIF: letra en mayúscula y al menos 6 dígitos ("tipo P 1.200" no es una cédula).
  s = s.replace(/\b[VEJGP]\s*[-:.]?\s*\d[\d.\s]{3,}\d\b/g, (m) => (m.replace(/\D/g, '').length >= 6 ? OCULTO : m));
  s = s.replace(/\bc[eé]dula(?:\s+(?:es|n[uú]mero|nro\.?))?\s*[-:.]?\s*(?:[VEJGP]\s*-?\s*)?\d[\d.\s]{3,}\d/giu, OCULTO);
  s = s.replace(/\+?\d[\d\s().\-/_·*‐‑‒–—―−]{5,}\d/g, (m, desde, todo) => {
    if (m.replace(/\D/g, '').length < 7) return m;
    if (FECHA.test(m.trim())) return m;
    if (MONEDA_ANTES.test(todo.slice(Math.max(0, desde - 8), desde))) return m;
    if (MONEDA_DESPUES.test(todo.slice(desde + m.length, desde + m.length + 12))) return m;
    return OCULTO;
  });
  return s;
}

const texto = (valor, max) => String(valor ?? '').trim().slice(0, max);

const AVISO_EMERGENCIA = {
  web: 'Disculpa, en este momento no puedo responder. Toca el botón de WhatsApp y una asesora de Dekog te atiende.',
  whatsapp: 'Disculpa, en este momento no puedo responder. Toca «Hablar con asesora» y te atiende una persona de Dekog.',
  instagram: 'Disculpa, en este momento no puedo responder. Escríbele a una asesora de Dekog por WhatsApp:',
};

function respuestaDeEmergencia(canal) {
  return {
    respuesta: AVISO_EMERGENCIA[canal] ?? AVISO_EMERGENCIA.web,
    productos: [],
    derivar: { necesario: true, area: 'home', resumen: '' },
    ofrecer_formulario: false,
    emergencia: true,
  };
}

/** Motivo breve para el registro: nunca el contenido de la conversación. */
function motivo(e) {
  if (e instanceof SyntaxError) return 'el modelo devolvió JSON inválido';
  return e?.status ? `HTTP ${e.status}` : (e?.name ?? 'error');
}

export async function atenderChat(cuerpo, ip) {
  if (excedeLimite(ip)) {
    return { status: 429, datos: { error: 'Estás escribiendo muy rápido. Espera un momento e intenta de nuevo.' } };
  }
  const limpios = limpiarMensajes(cuerpo?.mensajes);
  if (!limpios) return { status: 400, datos: { error: 'No recibí tu mensaje. Intenta de nuevo.' } };
  if (!proveedorActivo()) {
    return { status: 503, datos: { error: 'El asistente no está disponible en este momento.' } };
  }
  const mensajes = limpios.map((m) => ({ ...m, content: ocultarDatosPersonales(m.content) }));
  const datos = await pensar(mensajes, 'web');
  // Si el cliente escribió un dato personal en el chat, se le ofrece el formulario.
  if (mensajes.at(-1).content !== limpios.at(-1).content) datos.formulario = true;
  return { status: 200, datos };
}

/**
 * El cerebro compartido por la web, WhatsApp e Instagram. Recibe la
 * conversación YA SIN datos personales y devuelve lo que hay que mostrar:
 * texto, tarjetas de producto con Bs, enlace a la asesora y si conviene
 * ofrecer que lo contacten.
 */
export async function pensar(mensajes, canal = 'web') {
  const tasaPromesa = tasaBcv();
  const delCliente = numerosDelCliente(mensajes);
  const revisar = (s, texto) => montosInventados(texto ?? '', { ids: (s.productos ?? []).map((p) => p.id), delCliente });
  // Si el cliente pidió una categoría ("quiero ver camas"), los modelos sugeridos deben ser de ella.
  const ultimo = mensajes.at(-1)?.content ?? '';
  const categoria = categoriaPedida(ultimo);
  const ajenos = (s) => (categoria ? fueraDeCategoria(s.productos, categoria, ultimo) : []);
  // Las tarjetas que mostraría esta salida (sin tasa: solo importan los REF) y los totales del texto que las contradicen.
  const tarjetasDe = (s) => (s.productos ?? []).slice(0, 3).map((p) => tarjeta(p.id, p.talla, null, {
    box: p.box, cantidad: p.cantidad, telaPremium: p.tela_premium === true, puff: p.con_puff === true,
  })).filter(Boolean);
  const incoherentes = (s) => totalesIncoherentes(s.respuesta ?? '', tarjetasDe(s));
  const boxAltaGama = (s) => recargoDeBoxEnAltaGama(s.respuesta, s.productos);

  const hasta = Date.now() + (PRESUPUESTO_IA_MS[canal] ?? PRESUPUESTO_IA_MS.whatsapp);
  let salida;
  try {
    salida = await responder(mensajes, canal, { hasta });
    const inventados = revisar(salida, salida.respuesta);
    const deOtraCategoria = ajenos(salida);
    const malSumados = incoherentes(salida);
    const boxInventado = boxAltaGama(salida);
    if (inventados.length || deOtraCategoria.length || malSumados.length || boxInventado.length) {
      // Un monto que no está en el catálogo, un modelo de otra categoría o un total mal sumado: se pide UNA corrección.
      if (inventados.length) console.warn('Montos fuera del catálogo:', inventados);
      if (deOtraCategoria.length) console.warn('Modelos de otra categoría:', deOtraCategoria.map((p) => p.nombre));
      if (malSumados.length) console.warn('Totales que no coinciden con la tarjeta:', malSumados.map((m) => m.dicho));
      if (boxInventado.length) console.warn('Recargo de box en una cama Alta Gama:', boxInventado.map((p) => p.nombre));
      const notas = [];
      if (inventados.length) {
        notas.push(`${inventados.join(', ')} no corresponde al catálogo o a un dato confirmado: usa solo precios exactos del catálogo en REF, sin montos en bolívares ni porcentajes`);
      }
      if (deOtraCategoria.length) {
        const nombres = deOtraCategoria.map((p) => `${p.nombre} (${p.categoria.toLowerCase()})`).join(', ');
        notas.push(`el cliente pidió ${categoria.toLowerCase()} y ${nombres} no es de esa categoría: menciona y muestra solo modelos de la sección ${categoria.toUpperCase()} del catálogo`);
      }
      if (boxInventado.length) {
        const nombres = boxInventado.map((p) => p.nombre).join(', ');
        notas.push(`${nombres} es de la línea Alta Gama: ahí el box no tiene un recargo fijo, así que no des ningún monto para el box; di que su precio lo confirma una asesora`);
      }
      if (malSumados.length) {
        notas.push(`${malSumados.map((m) => m.dicho).join(', ')} está mal sumado: con todo lo que eligió el cliente (medida, box, tela, puff y cantidad) el total exacto es ${malSumados[0].correcto}`);
      }
      const primera = salida;
      if (hasta - Date.now() < MINIMO_PARA_CORREGIR_MS) {
        // La IA ya tardó casi todo el presupuesto: abajo se quita el texto dudoso y quedan las tarjetas exactas.
        console.warn('Sin tiempo para la corrección; se conserva la primera respuesta sin el texto dudoso');
      } else {
        try {
          salida = await responder([
            ...mensajes,
            { role: 'assistant', content: primera.respuesta },
            { role: 'user', content: `(Nota del sistema: ${notas.join('; ')}. Reescribe tu respuesta anterior.)` },
          ], canal, { hasta });
        } catch (e) {
          console.warn('Falló la corrección; se conserva la primera respuesta sin el texto dudoso:', motivo(e));
          salida = primera;
        }
      }
      if (boxAltaGama(salida).length) {
        salida = {
          ...salida,
          respuesta: 'En la línea Alta Gama el precio del box te lo confirma una asesora de Dekog. Abajo te muestro el precio de la cama, también en bolívares.',
        };
      } else if (revisar(salida, salida.respuesta).length || incoherentes(salida).length) {
        salida = {
          ...salida,
          respuesta: salida.productos?.length
            ? 'Te muestro abajo el total exacto con todo lo que elegiste, también en bolívares.'
            : 'Disculpa, ese precio te lo confirma una asesora de Dekog.',
        };
      }
      // Si aún sugiere modelos de otra categoría, al menos no se muestran sus tarjetas.
      const quedan = new Set(ajenos(salida).map((p) => p.id));
      if (quedan.size) salida = { ...salida, productos: salida.productos.filter((p) => !quedan.has(p.id)) };
    }
  } catch (e) {
    if (!(e instanceof RechazoDelModelo)) console.error('Error del asistente:', motivo(e));
    salida = respuestaDeEmergencia(canal);
  }

  const tasa = await tasaPromesa;
  const productos = (salida.productos ?? [])
    .slice(0, 3)
    .map((p) => tarjeta(p.id, p.talla, tasa, {
      box: p.box, cantidad: p.cantidad, telaPremium: p.tela_premium === true, puff: p.con_puff === true,
    }))
    .filter(Boolean);

  // El resumen para la asesora tampoco puede llevar montos inventados: si los
  // trae, se arma con los datos verificados de las tarjetas.
  let resumen = salida.derivar?.resumen ?? '';
  if (resumen && revisar(salida, resumen).length) {
    resumen = productos
      .map((p) => [p.nombre, p.talla, p.box, p.tela, p.puff, p.cantidad > 1 ? `${p.cantidad} unidades` : '', `REF ${p.ref}`].filter(Boolean).join(' · '))
      .join(' | ') || 'Consulta desde el asistente';
  }

  let respuesta = salida.respuesta;
  if (productos.length && !tasa) {
    respuesta += '\n\n(Nota: ahora mismo no pude consultar la tasa BCV, así que el monto en bolívares te lo confirma una asesora.)';
  }
  const whatsapp = salida.derivar?.necesario ? enlaceWhatsapp(salida.derivar.area, resumen, canal) : null;

  return {
    respuesta,
    productos,
    whatsapp,
    tasa,
    formulario: Boolean(salida.ofrecer_formulario),
    emergencia: Boolean(salida.emergencia),
    // Lo que se guarda en la hoja como "le interesa" y "resumen".
    interes: productos.map((p) => [p.nombre, p.talla, p.box, p.tela, p.puff].filter(Boolean).join(' ')).join(', '),
    resumen,
  };
}

/** Formulario de contacto: va directo a la hoja de clientes, sin pasar por la IA. */
export async function atenderDatos(cuerpo, ip) {
  if (excedeLimite(ip)) {
    return { status: 429, datos: { error: 'Demasiados envíos seguidos. Espera un momento e intenta de nuevo.' } };
  }
  const nombre = texto(cuerpo?.nombre, 80);
  const telefono = texto(cuerpo?.telefono, 30);
  const digitos = telefono.replace(/\D/g, '');
  if (nombre.length < 2) return { status: 400, datos: { error: 'Escribe tu nombre.' } };
  if (digitos.length < 7 || digitos.length > 15) return { status: 400, datos: { error: 'Revisa tu número de teléfono.' } };
  const conversacion = texto(cuerpo?.conversacion, 64).replace(/[^\w-]/g, '') || crypto.randomUUID();
  const guardado = await guardarCliente({
    conversacion,
    cliente: { nombre, telefono, ciudad: texto(cuerpo?.ciudad, 60) },
    interes: texto(cuerpo?.interes, 200),
    resumen: texto(cuerpo?.resumen, 300),
    canal: 'Web',
  });
  if (!guardado) {
    return { status: 503, datos: { error: 'No pudimos guardar tus datos en este momento. Escríbenos por WhatsApp.' } };
  }
  return { status: 200, datos: { guardado: true } };
}
