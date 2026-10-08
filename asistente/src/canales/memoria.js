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

// Mensajes que esta instancia ya está atendiendo. Meta a veces repite el mismo aviso casi al instante: así se
// ignora sin gastar una escritura de KV (el plan gratis da 1.000 al día). Entre instancias distintas, el
// duplicado lo frena estado.procesados.
const enCurso = new Set();

/** true si el mensaje ya se está atendiendo en esta instancia; si no, lo marca. */
export function yaAtendido(_kv, idMensaje) {
  if (!idMensaje) return false;
  if (enCurso.has(idMensaje)) return true;
  enCurso.add(idMensaje);
  if (enCurso.size > 500) enCurso.delete(enCurso.values().next().value);
  return false;
}

export async function cargarEstado(kv, clave) {
  let guardado = null;
  try {
    guardado = kv ? await kv.get(clave, 'json') : null;
  } catch (e) {
    // Sin memoria se responde igual: mejor una respuesta sin contexto que ninguna.
    console.warn('No se pudo leer la memoria de la conversación:', e?.message);
  }
  const estado = {
    mensajes: [], procesados: [], guardado: false, interes: '', resumen: '',
    resumenEnHoja: null, telefonoEnHoja: false, avisoCupo: '', ultimaTarjeta: '', hoy: { fecha: '', n: 0, avisado: false },
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

/**
 * Las tarjetas (foto + precio) que vale la pena mostrar: si son exactamente las mismas que la última
 * vez —mismo modelo, medida, box, cantidad y precio— no se repiten. Recuerda lo que se mostró.
 */
export function productosNuevos(estado, productos = []) {
  if (!productos.length) return [];
  const clave = productos.map((p) => [p.id, p.talla, p.box, p.cantidad, p.ref].join('|')).join(';');
  if (clave === estado.ultimaTarjeta) return [];
  estado.ultimaTarjeta = clave;
  return productos;
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
    mensajes: conservarNotas([...base, ...nuevos], 16),
    procesados: [...new Set([...actual.procesados, ...estado.procesados])].slice(-50),
    guardado: Boolean(actual.guardado || estado.guardado),
    interes: estado.interes || actual.interes,
    resumen: estado.resumen || actual.resumen,
    resumenEnHoja: estado.resumenEnHoja ?? actual.resumenEnHoja,
    telefonoEnHoja: Boolean(actual.telefonoEnHoja || estado.telefonoEnHoja),
    avisoCupo: estado.avisoCupo || actual.avisoCupo, // mes en que ya se le avisó del cupo agotado
    ultimaTarjeta: estado.ultimaTarjeta || actual.ultimaTarjeta, // última foto/precio mostrados
    hoy: (estado.hoy?.fecha ?? '') >= (actual.hoy?.fecha ?? '') ? estado.hoy : actual.hoy, // mensajes del cliente hoy
  };
}

/**
 * Los últimos `maximo` mensajes, pero sin perder las notas de vitrina de los que se descartan: pasan al primer
 * mensaje del asistente que queda. Así «Ver más» no repite modelos ya vistos en una conversación larga.
 */
export function conservarNotas(mensajes, maximo) {
  if (mensajes.length <= maximo) return mensajes;
  const quedan = mensajes.slice(-maximo);
  const notas = mensajes.slice(0, -maximo)
    .flatMap((m) => (m.role === 'assistant' && m.content.includes('[Vitrina «') ? m.content.match(/\[Vitrina «[^\]]*\]/g) ?? [] : []));
  const i = quedan.findIndex((m) => m.role === 'assistant');
  if (notas.length && i >= 0) {
    const propias = quedan[i].content.match(/\[Vitrina «[^\]]*\]/g) ?? [];
    const texto = quedan[i].content.replace(/\[Vitrina «[^\]]*\]/g, '').trim();
    // Las más viejas primero (la última vitrina sigue siendo la última nota) y como mucho 6.
    quedan[i] = { ...quedan[i], content: `${texto}\n\n${[...notas, ...propias].slice(-6).join('\n')}` };
  }
  return quedan;
}

/** Guarda la conversación. Nunca lanza: si KV falla (por ejemplo, se acabaron las escrituras gratis del día), el
 * cliente ya tiene su respuesta y solo se pierde la memoria de este turno. Devuelve si se pudo guardar. */
export async function guardarEstado(kv, clave, estado) {
  if (!kv) return false;
  // KV admite 1 escritura por segundo en la misma clave: si dos mensajes terminan a la vez,
  // el segundo reintenta un instante después, volviendo a juntar con lo último guardado.
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const final = fusionar(await cargarEstado(kv, clave), estado);
      await kv.put(clave, JSON.stringify(final), { expirationTtl: TREINTA_DIAS });
      return true;
    } catch (e) {
      if (intento === 2) {
        console.warn('No se pudo guardar la memoria de la conversación:', e?.message);
        return false;
      }
      await new Promise((listo) => setTimeout(listo, 1100));
    }
  }
  return false;
}
