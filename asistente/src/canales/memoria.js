/**
 * Memoria de cada conversación de WhatsApp e Instagram en Cloudflare KV
 * (plan gratuito: 1.000 escrituras al día; aquí se hacen 2 o 3 por mensaje:
 * la marca de "visto", el estado y, en WhatsApp, el contador del cupo).
 * WhatsApp e Instagram no mandan el historial, así que se guarda aquí:
 *   mensajes   — últimos turnos, ya SIN datos personales (lo que ve la IA)
 *   procesados — ids de mensajes ya atendidos (Meta reintenta y duplica avisos)
 *   guardado   — si el cliente ya quedó en la hoja
 *   interes, resumen — lo último que mostró interés, para la hoja
 *   resumenEnHoja, telefonoEnHoja — lo que ya se envió a la hoja, para actualizar
 *              la fila solo cuando hay algo nuevo
 * Cada conversación se borra sola a los 30 días sin actividad.
 */
const TREINTA_DIAS = 60 * 60 * 24 * 30;

const UN_DIA = 60 * 60 * 24;

/**
 * Marca el mensaje como atendido apenas llega (clave propia por mensaje) y devuelve true si ya
 * lo estaba: Meta a veces repite el mismo aviso, y así se ignora aunque el primero siga en curso.
 */
export async function yaAtendido(kv, idMensaje) {
  if (!kv || !idMensaje) return false;
  const clave = `visto:${idMensaje}`;
  if (await kv.get(clave)) return true;
  await kv.put(clave, '1', { expirationTtl: UN_DIA });
  return false;
}

export async function cargarEstado(kv, clave) {
  const guardado = kv ? await kv.get(clave, 'json') : null;
  const estado = {
    mensajes: [], procesados: [], guardado: false, interes: '', resumen: '',
    resumenEnHoja: null, telefonoEnHoja: false, avisoCupo: '',
    ...(guardado ?? {}),
  };
  estado.desde = estado.mensajes.length; // lo que se agregue después es de esta vuelta (no se guarda)
  return estado;
}

/**
 * ¿Hay que (re)enviar el cliente a la hoja? Solo si mostró interés y hay algo
 * nuevo: aún no está, cambió lo que pide, o recién dio su teléfono. La hoja
 * actualiza la misma fila, así que repetir no duplica.
 */
export function hayNovedadParaHoja(estado, { interesado, telefono = '' }) {
  if (!interesado) return false;
  return !estado.guardado || estado.resumen !== estado.resumenEnHoja || Boolean(telefono && !estado.telefonoEnHoja);
}

export function marcarEnHoja(estado, telefono = '') {
  estado.guardado = true;
  estado.resumenEnHoja = estado.resumen;
  if (telefono) estado.telefonoEnHoja = true;
}

/**
 * Junta lo de esta vuelta con lo que haya ahora en KV. Si el cliente mandó dos mensajes seguidos
 * ("hola" + "¿precio?"), cada uno se atiende en paralelo; así ninguno de los dos turnos se pierde
 * del historial.
 */
export function fusionar(actual, estado) {
  const desde = estado.desde ?? 0;
  const nuevos = estado.mensajes.slice(desde);
  // Si KV devolvió menos de lo que ya se había leído (vencido o desactualizado), se usa lo leído.
  const base = actual.mensajes.length >= desde ? actual.mensajes : estado.mensajes.slice(0, desde);
  return {
    mensajes: [...base, ...nuevos].slice(-16),
    procesados: [...new Set([...actual.procesados, ...estado.procesados])].slice(-50),
    guardado: Boolean(actual.guardado || estado.guardado),
    interes: estado.interes || actual.interes,
    resumen: estado.resumen || actual.resumen,
    resumenEnHoja: estado.resumenEnHoja ?? actual.resumenEnHoja,
    telefonoEnHoja: Boolean(actual.telefonoEnHoja || estado.telefonoEnHoja),
    avisoCupo: estado.avisoCupo || actual.avisoCupo, // mes en que ya se le avisó del cupo agotado
  };
}

export async function guardarEstado(kv, clave, estado) {
  if (!kv) return;
  // KV admite 1 escritura por segundo en la misma clave: si dos mensajes terminan a la vez,
  // el segundo reintenta un instante después, volviendo a juntar con lo último guardado.
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const final = fusionar(await cargarEstado(kv, clave), estado);
      await kv.put(clave, JSON.stringify(final), { expirationTtl: TREINTA_DIAS });
      return;
    } catch (e) {
      if (intento === 2) throw e;
      await new Promise((listo) => setTimeout(listo, 1100));
    }
  }
}
