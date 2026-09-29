/**
 * POST /api/asistente — el chat del asistente de Dekog.
 *
 * Entrada:  { conversacion: id, mensajes: [{ role: "user" | "assistant", content: string }, ...] }
 * Salida:   { respuesta, productos: [tarjetas], whatsapp: { url, linea } | null, tasa, guardado }
 *
 * Si el cliente dejó nombre y teléfono, se guardan en la hoja de clientes
 * (una fila por conversación) y "guardado" vuelve en true.
 *
 * Los precios en bolívares y el enlace de WhatsApp los arma el servidor; la IA
 * solo decide qué decir, qué productos mostrar y cuándo pasar a una asesora.
 */
import { responder, proveedorActivo, RechazoDelModelo } from './_lib/llm.js';
import { tarjeta, montosInventados } from './_lib/catalogo.js';
import { tasaBcv } from './_lib/bcv.js';
import { lineas, lineaPorArea } from './_lib/negocio.js';
import { guardarCliente } from './_lib/hoja.js';

const MAX_MENSAJES = 16;
const MAX_CARACTERES = 800;
const LIMITE_POR_IP = { pedidos: 20, ventanaMs: 5 * 60 * 1000 };
const pedidosPorIp = new Map();

function excedeLimite(ip) {
  const ahora = Date.now();
  const recientes = (pedidosPorIp.get(ip) ?? []).filter((t) => ahora - t < LIMITE_POR_IP.ventanaMs);
  recientes.push(ahora);
  pedidosPorIp.set(ip, recientes);
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
 * Datos del cliente listos para guardar, o null. El teléfono tiene que estar
 * escrito por el cliente en la conversación: si la IA lo "completa" o lo
 * inventa, no se guarda nada.
 */
function clienteParaGuardar(cliente, mensajes) {
  const telefono = String(cliente?.telefono ?? '').trim();
  const digitos = telefono.replace(/\D/g, '');
  if (digitos.length < 7) return null;
  const escritoPorCliente = mensajes
    .filter((m) => m.role === 'user')
    .map((m) => m.content.replace(/\D/g, ''))
    .join(' ');
  if (!escritoPorCliente.includes(digitos.slice(-7))) return null;
  return {
    nombre: String(cliente.nombre ?? '').trim().slice(0, 80),
    telefono: telefono.slice(0, 30),
    ciudad: String(cliente.ciudad ?? '').trim().slice(0, 60),
  };
}

const RESPUESTA_DE_EMERGENCIA = {
  respuesta: 'Disculpa, en este momento no puedo responder. Toca el botón de WhatsApp y una asesora de Dekog te atiende.',
  productos: [],
  derivar: { necesario: true, area: 'home', resumen: 'Cliente desde el asistente de la web' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Usa POST' });
  }
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? '').split(',')[0].trim();
  if (excedeLimite(ip)) {
    return res.status(429).json({ error: 'Demasiados mensajes seguidos. Espera un momento e intenta de nuevo.' });
  }
  const mensajes = limpiarMensajes(req.body?.mensajes);
  if (!mensajes) return res.status(400).json({ error: 'Mensaje vacío o inválido' });
  if (!proveedorActivo()) {
    return res.status(503).json({ error: 'El asistente todavía no tiene clave de IA configurada.' });
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

  let guardado = false;
  const cliente = clienteParaGuardar(salida.cliente, mensajes);
  const conversacion = String(req.body?.conversacion ?? '').replace(/[^\w-]/g, '').slice(0, 64);
  if (cliente && conversacion) {
    guardado = await guardarCliente({
      conversacion,
      cliente,
      interes: productos.map((p) => [p.nombre, p.talla].filter(Boolean).join(' ')).join(', '),
      resumen: salida.derivar?.resumen ?? '',
    });
  }

  return res.status(200).json({ respuesta: salida.respuesta, productos, whatsapp, tasa, guardado });
}
