/**
 * El chat del asistente de Dekog, independiente de la plataforma: recibe el
 * cuerpo ya parseado y devuelve { status, datos }. El Worker (worker.js) lo
 * expone como POST /chat.
 *
 * Chat:   { mensajes: [{ role: "user" | "assistant", content: string }, ...] }
 *      →  { respuesta, productos: [tarjetas], whatsapp: { url, linea } | null, tasa, formulario, interes, resumen }
 * Datos:  { conversacion, nombre, telefono, ciudad, interes, resumen } → { guardado }
 *
 * Privacidad: la IA nunca recibe datos personales. Antes de enviarle la
 * conversación se ocultan teléfonos, correos y cédulas, y los datos de
 * contacto se dejan en un formulario aparte que va directo a la hoja.
 *
 * Los precios en bolívares y el enlace de WhatsApp los arma el servidor; la IA
 * solo decide qué decir, qué productos mostrar y cuándo pasar a una asesora.
 */
import { responder, proveedorActivo, RechazoDelModelo } from './lib/llm.js';
import { tarjeta, montosInventados } from './lib/catalogo.js';
import { tasaBcv } from './lib/bcv.js';
import { lineas, lineaPorArea } from './lib/negocio.js';
import { guardarCliente } from './lib/hoja.js';

const MAX_MENSAJES = 16;
const MAX_CARACTERES = 800;
const LIMITE_POR_IP = { pedidos: 20, ventanaMs: 5 * 60 * 1000 };
const pedidosPorIp = new Map();

// Límite por IP en memoria: frena abusos dentro de una misma instancia; no es global.
function excedeLimite(ip) {
  const ahora = Date.now();
  const recientes = (pedidosPorIp.get(ip) ?? []).filter((t) => ahora - t < LIMITE_POR_IP.ventanaMs);
  recientes.push(ahora);
  pedidosPorIp.set(ip, recientes);
  if (pedidosPorIp.size > 5000) pedidosPorIp.clear();
  return recientes.length > LIMITE_POR_IP.pedidos;
}

function enlaceWhatsapp(area, resumen) {
  const codigo = lineaPorArea[area] ?? '01';
  const linea = lineas[codigo];
  const texto = `Hola Dekog, vengo del asistente de la web 👋\n${resumen}`.trim();
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

/**
 * Oculta datos personales antes de enviar el texto a la IA: correos y
 * cualquier número de 7 dígitos o más (teléfonos, cédulas, cuentas).
 * Los precios del catálogo tienen 4 dígitos como mucho, así que no se tocan.
 */
export function ocultarDatosPersonales(texto) {
  return texto
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[dato personal]')
    .replace(/\+?\d[\d\s().\-]{5,}\d/g, (m) => (m.replace(/\D/g, '').length >= 7 ? '[dato personal]' : m));
}

const texto = (valor, max) => String(valor ?? '').trim().slice(0, max);

const RESPUESTA_DE_EMERGENCIA = {
  respuesta: 'Disculpa, en este momento no puedo responder. Toca el botón de WhatsApp y una asesora de Dekog te atiende.',
  productos: [],
  derivar: { necesario: true, area: 'home', resumen: 'Cliente desde el asistente de la web' },
};

export async function atenderChat(cuerpo, ip) {
  if (excedeLimite(ip)) {
    return { status: 429, datos: { error: 'Demasiados mensajes seguidos. Espera un momento e intenta de nuevo.' } };
  }
  const limpios = limpiarMensajes(cuerpo?.mensajes);
  if (!limpios) return { status: 400, datos: { error: 'Mensaje vacío o inválido' } };
  const mensajes = limpios.map((m) => ({ ...m, content: ocultarDatosPersonales(m.content) }));
  if (!proveedorActivo()) {
    return { status: 503, datos: { error: 'El asistente todavía no tiene clave de IA configurada.' } };
  }

  const tasaPromesa = tasaBcv();
  let salida;
  try {
    salida = await responder(mensajes);
    const inventados = montosInventados(salida.respuesta);
    if (inventados.length) {
      // Un precio que no está en el catálogo: se pide una sola corrección.
      console.warn('Montos fuera del catálogo:', inventados);
      salida = await responder([
        ...mensajes,
        { role: 'assistant', content: salida.respuesta },
        { role: 'user', content: `(Nota del sistema: ${inventados.join(', ')} no existe en el catálogo. Reescribe tu respuesta anterior usando solo precios exactos del catálogo.)` },
      ]);
      if (montosInventados(salida.respuesta).length) {
        salida = { ...salida, respuesta: 'Te muestro abajo los precios exactos del catálogo.' };
      }
    }
  } catch (e) {
    if (!(e instanceof RechazoDelModelo)) console.error('Error del asistente:', e);
    salida = RESPUESTA_DE_EMERGENCIA;
  }

  const tasa = await tasaPromesa;
  const productos = (salida.productos ?? [])
    .slice(0, 3)
    .map((p) => tarjeta(p.id, p.talla, tasa))
    .filter(Boolean);
  const whatsapp = salida.derivar?.necesario
    ? enlaceWhatsapp(salida.derivar.area, salida.derivar.resumen)
    : null;

  return {
    status: 200,
    datos: {
      respuesta: salida.respuesta,
      productos,
      whatsapp,
      tasa,
      // El formulario de contacto se ofrece cuando la IA ve interés o cuando pasa al cliente a una asesora.
      formulario: Boolean(salida.ofrecer_formulario || whatsapp),
      // Lo que el formulario enviará a la hoja como "le interesa" y "resumen".
      interes: productos.map((p) => [p.nombre, p.talla].filter(Boolean).join(' ')).join(', '),
      resumen: salida.derivar?.resumen ?? '',
    },
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
  });
  if (!guardado) {
    return { status: 503, datos: { error: 'No pudimos guardar tus datos en este momento. Escríbenos por WhatsApp.' } };
  }
  return { status: 200, datos: { guardado: true } };
}
