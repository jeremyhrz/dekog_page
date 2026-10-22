/**
 * Memoria de cada conversación de WhatsApp e Instagram en Cloudflare KV
 * (plan gratuito: 1.000 escrituras al día). Por mensaje se escribe el estado al
 * final, y otra vez si la hoja respondió; si va a la IA, la marca de que se está
 * atendiendo (yaAtendidoEnOtra); en WhatsApp, además, el contador del cupo.
 * WhatsApp e Instagram no mandan el historial, así que se guarda aquí:
 *   mensajes   — últimos turnos, ya SIN datos personales (lo que ve la IA)
 *   procesados — ids de mensajes ya atendidos (Meta reintenta y duplica avisos)
 *   guardado   — si el cliente ya quedó en la hoja (en WhatsApp, en su fila de ahora)
 *   interes, resumen — lo último que mostró interés, para la hoja
 *   resumenEnHoja, interesEnHoja, telefonoEnHoja — lo que ya se envió a la hoja, para
 *              actualizar la fila solo cuando hay algo nuevo (del teléfono, solo sus 4
 *              últimos dígitos: el número no se guarda aquí)
 *   promoVista — id de la promoción cuyo mensaje ya recibió (lib/promo.js): una vez por promo
 *   avisoSinLeer — día (Caracas) en que se le dijo que no se leen audios ni videos: uno al día
 * Solo WhatsApp (whatsapp.js → elegirFila):
 *   filaHoja, filaHojaDesde — la fecha de su fila en la hoja (wa-<número>-<fecha>; '' en la
 *              de antes del 22-oct, wa-<número>) y desde cuándo la usa (0: todavía no tiene)
 * Solo Instagram, donde una asesora puede escribir en el mismo chat (instagram.js):
 *   humano     — cuándo escribió la asesora por última vez (el asistente se calla en ese chat)
 *   esperaDesde — primer mensaje del cliente que la asesora todavía no ha respondido
 *   seguimiento — cuándo se le escribió por haber esperado 1 hora (o cuándo le respondió el
 *              asistente, ya vencida la pausa): esa espera ya está atendida
 *   numeroTomado — cuándo llegó a la hoja el número que dejó durante una pausa (una vez por pausa). Hasta el 22-oct
 *              era datosTomados, que también ponía un nombre suelto: ese ya no cuenta como su número
 * Cada conversación se borra sola a los 30 días sin actividad.
 */
const TREINTA_DIAS = 60 * 60 * 24 * 30;

// Mensajes que esta instancia ya está atendiendo. Meta a veces repite el mismo aviso casi al instante: así se ignora sin
// tocar KV. Si la repetición cae en otra instancia, la frena estado.procesados, que se guarda al final de la vuelta, y,
// mientras baja la foto y piensa la IA, la marca de yaAtendidoEnOtra (WhatsApp e Instagram).
const enCurso = new Set();

/** true si el mensaje ya se está atendiendo en esta instancia; si no, lo marca. */
export function yaAtendido(_kv, idMensaje) {
  if (!idMensaje) return false;
  if (enCurso.has(idMensaje)) return true;
  enCurso.add(idMensaje);
  if (enCurso.size > 500) enCurso.delete(enCurso.values().next().value);
  return false;
}

/** Para las pruebas: esta instancia olvida lo que está atendiendo (el aviso siguiente es como si cayera en otra). */
export function olvidarEnCurso() {
  enCurso.clear();
}

/**
 * true si otra instancia ya está atendiendo este mensaje; si no, lo marca en KV. Para lo largo (bajar la foto y la IA,
 * hasta 21 s), cuando procesados aún no se guardó: una repetición de Meta que cae en otra instancia se respondía dos
 * veces. Una clave por mensaje, que vence a los 10 minutos: guardar antes la memoria de la conversación chocaba con los
 * guardados de otros mensajes seguidos del mismo cliente (KV admite una escritura por segundo en la misma clave) y se
 * perdían turnos.
 * KV no garantiza exclusión entre ubicaciones, pero la ventana baja de segundos a milisegundos. Nunca lanza.
 */
export async function yaAtendidoEnOtra(kv, idMensaje) {
  if (!kv || !idMensaje) return false;
  const clave = `visto:${idMensaje}`;
  try {
    if (await kv.get(clave)) return true;
    await kv.put(clave, '1', { expirationTtl: 600 });
  } catch (e) {
    console.warn('No se pudo marcar el mensaje en curso:', e?.message); // se responde igual
  }
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
    resumenEnHoja: null, interesEnHoja: null, telefonoEnHoja: '', filaHoja: '', filaHojaDesde: 0,
    avisoCupo: '', ultimaTarjeta: '', hoy: { fecha: '', n: 0, avisado: false },
    promoVista: '', avisoSinLeer: '', humano: 0, esperaDesde: 0, seguimiento: 0, numeroTomado: 0,
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
 * nuevo: aún no está, cambió lo que pide (el resumen o lo que le interesa), o dio
 * un teléfono distinto del último que se mandó (el mismo número en cada mensaje
 * no se reenvía). La hoja actualiza la misma fila, así que repetir no duplica.
 */
export function hayNovedadParaHoja(estado, { interesado, telefono = '' }) {
  if (!interesado) return false;
  // Hasta el 22-oct telefonoEnHoja era un sí/no: un true viejo no es una huella, así que el número se reenvía una vez. Y
  // lo que le interesaba no se anotaba (un interés nuevo con el mismo resumen no llegaba): el de antes cuenta una vez.
  return !estado.guardado || estado.resumen !== estado.resumenEnHoja
    || Boolean(estado.interes && estado.interes !== estado.interesEnHoja)
    || Boolean(telefono && huella(telefono) !== estado.telefonoEnHoja);
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
  estado.interesEnHoja = estado.interes;
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
  // La fila de la hoja (WhatsApp) es la más reciente, la de esta vuelta o la de KV, y `guardado` es de esa fila: una
  // nueva queda sin guardar hasta que la hoja responda. Si es la misma, basta con que una de las dos vueltas la guardara.
  const fila = (Number(estado.filaHojaDesde) || 0) > (Number(actual.filaHojaDesde) || 0) ? estado : actual;
  return {
    mensajes: conservarNotas([...base, ...nuevos], 16),
    procesados: [...new Set([...actual.procesados, ...estado.procesados])].slice(-50),
    guardado: estado.filaHoja === actual.filaHoja ? Boolean(actual.guardado || estado.guardado) : Boolean(fila.guardado),
    interes: estado.interes || actual.interes,
    resumen: estado.resumen || actual.resumen,
    resumenEnHoja: estado.resumenEnHoja ?? actual.resumenEnHoja,
    interesEnHoja: estado.interesEnHoja ?? actual.interesEnHoja,
    // La huella del último número que llegó a la hoja: la de esta vuelta si la cambió; si no, la de KV (otra vuelta pudo
    // mandar un número nuevo mientras tanto).
    telefonoEnHoja: estado.telefonoEnHoja !== estado.huellaLeida ? estado.telefonoEnHoja : actual.telefonoEnHoja,
    filaHoja: fila.filaHoja ?? '',
    filaHojaDesde: Number(fila.filaHojaDesde) || 0,
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
    numeroTomado: mayor(actual.numeroTomado, estado.numeroTomado),
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
 * Se puede llamar más de una vez en la misma vuelta (los dos canales guardan antes de la hoja y otra vez si la hoja
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
