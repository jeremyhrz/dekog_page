/**
 * Memoria de cada conversación de WhatsApp e Instagram en Cloudflare KV
 * (plan gratuito: 1.000 escrituras al día; aquí se hace una por mensaje).
 * WhatsApp e Instagram no mandan el historial, así que se guarda aquí:
 *   mensajes   — últimos turnos, ya SIN datos personales (lo que ve la IA)
 *   procesados — ids de mensajes ya atendidos (Meta reintenta y duplica avisos)
 *   guardado   — si el cliente ya quedó en la hoja
 *   interes, resumen — lo último que mostró interés, para la hoja
 * Cada conversación se borra sola a los 30 días sin actividad.
 */
const TREINTA_DIAS = 60 * 60 * 24 * 30;

export async function cargarEstado(kv, clave) {
  const guardado = kv ? await kv.get(clave, 'json') : null;
  return { mensajes: [], procesados: [], guardado: false, interes: '', resumen: '', ...(guardado ?? {}) };
}

export async function guardarEstado(kv, clave, estado) {
  if (!kv) return;
  const recortado = {
    mensajes: estado.mensajes.slice(-16),
    procesados: estado.procesados.slice(-50),
    guardado: estado.guardado,
    interes: estado.interes,
    resumen: estado.resumen,
  };
  await kv.put(clave, JSON.stringify(recortado), { expirationTtl: TREINTA_DIAS });
}
