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
 *              la fila solo cuando hay algo nuevo (del teléfono, solo sus 4 últimos
 *              dígitos: el número no se guarda aquí)
 *   promoVista — id de la promoción cuyo mensaje ya recibió (lib/promo.js): una vez por promo
 *   avisoSinLeer — día (Caracas) en que se le dijo que no se leen audios ni videos: uno al día
 * Solo Instagram, donde una asesora puede escribir en el mismo chat (instagram.js):
 *   humano     — cuándo escribió la asesora por última vez (el asistente se calla en ese chat)
 *   esperaDesde — primer mensaje del cliente que la asesora todavía no ha respondido
 *   seguimiento — cuándo se le escribió por haber esperado 1 hora (o cuándo le respondió el
 *              asistente, ya vencida la pausa): esa espera ya está atendida
 *   datosTomados — cuándo dejó su número durante una pausa (ya está en la hoja: una vez por pausa)
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
    resumenEnHoja: null, telefonoEnHoja: '', avisoCupo: '', ultimaTarjeta: '', hoy: { fecha: '', n: 0, avisado: false },
    promoVista: '', avisoSinLeer: '', humano: 0, esperaDesde: 0, seguimiento: 0, datosTomados: 0,
    ...(guardado ?? {}),
  };
  return comoBase(estado);
}

/**
 * Lo que se acaba de leer (o de guardar) es la base de esta vuelta: lo que se agregue o cambie después es de ella, aunque
 * guardarEstado se llame más de una vez en la misma vuelta. No se guarda en KV.
 */
function comoBase(estado) {
  estado.desde = estado.mensajes.length;
  estado.huellaLeida = estado.telefonoEnHoja;
  return estado;
}

/** Los 4 últimos dígitos de un teléfono: alcanzan para saber si es otro número sin guardarlo en KV. */
const huella = (telefono) => String(telefono).replace(/\D/g, '').slice(-4);

/**
 * ¿Hay que (re)enviar el cliente a la hoja? Solo si mostró interés y hay algo
 * nuevo: aún no está, cambió lo que pide, o dio un teléfono distinto del último
 * que se mandó (el mismo número en cada mensaje no se reenvía). La hoja
 * actualiza la misma fila, así que repetir no duplica.
 */
export function hayNovedadParaHoja(estado, { interesado, telefono = '' }) {
  if (!interesado) return false;
  // Hasta el 22-oct telefonoEnHoja era un sí/no: un true viejo no es una huella, así que el número se reenvía una vez.
  return !estado.guardado || estado.resumen !== estado.resumenEnHoja || Boolean(telefono && huella(telefono) !== estado.telefonoEnHoja);
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
  if (telefono) estado.telefonoEnHoja = huella(telefono);
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
    // La huella del último número que llegó a la hoja: la de esta vuelta si la cambió; si no, la de KV (otra vuelta pudo
    // mandar un número nuevo mientras tanto).
    telefonoEnHoja: estado.telefonoEnHoja !== estado.huellaLeida ? estado.telefonoEnHoja : actual.telefonoEnHoja,
    avisoCupo: estado.avisoCupo || actual.avisoCupo, // mes en que ya se le avisó del cupo agotado
    ultimaTarjeta: estado.ultimaTarjeta || actual.ultimaTarjeta, // última foto/precio mostrados
    hoy: (estado.hoy?.fecha ?? '') >= (actual.hoy?.fecha ?? '') ? estado.hoy : actual.hoy, // mensajes del cliente hoy
    promoVista: estado.promoVista || actual.promoVista || '',
    avisoSinLeer: [estado.avisoSinLeer ?? '', actual.avisoSinLeer ?? ''].sort().at(-1),
    ...turnosDeLaAsesora(actual, estado),
  };
}

const mayor = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);

/**
 * Lo de la asesora de Instagram al juntar dos vueltas: lo más reciente de cada cosa. La espera es la del primer mensaje
 * del cliente que llegó DESPUÉS del último de la asesora (si ella escribió después, ya no espera).
 */
function turnosDeLaAsesora(actual, estado) {
  const humano = mayor(actual.humano, estado.humano);
  const esperas = [actual.esperaDesde, estado.esperaDesde].map(Number).filter((t) => t > humano);
  return {
    humano,
    esperaDesde: esperas.length ? Math.min(...esperas) : 0,
    seguimiento: mayor(actual.seguimiento, estado.seguimiento),
    datosTomados: mayor(actual.datosTomados, estado.datosTomados),
  };
}

/**
 * El historial con los mensajes seguidos del mismo lado unidos en uno (mientras la asesora atiende, el cliente puede
 * escribir varias veces seguidas, o ella mandar dos mensajes): la IA lo recibe alternado, como espera.
 */
export function unirSeguidos(mensajes) {
  const unidos = [];
  for (const m of mensajes) {
    const previo = unidos.at(-1);
    if (previo && previo.role === m.role) unidos[unidos.length - 1] = { role: m.role, content: `${previo.content}\n${m.content}` };
    else unidos.push(m);
  }
  return unidos;
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
 * cliente ya tiene su respuesta y solo se pierde la memoria de este turno. Devuelve si se pudo guardar.
 * Se puede llamar más de una vez en la misma vuelta (instagram.js guarda antes de la hoja y otra vez si la hoja
 * respondió): lo guardado pasa a ser la base y la segunda vez no se repiten los mensajes de esta vuelta. */
export async function guardarEstado(kv, clave, estado) {
  if (!kv) return false;
  // KV admite 1 escritura por segundo en la misma clave: si dos mensajes terminan a la vez,
  // el segundo reintenta un instante después, volviendo a juntar con lo último guardado.
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const final = fusionar(await cargarEstado(kv, clave), estado);
      await kv.put(clave, JSON.stringify(final), { expirationTtl: TREINTA_DIAS });
      comoBase(Object.assign(estado, final));
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
