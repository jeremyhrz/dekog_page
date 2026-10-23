/**
 * WhatsApp (Cloud API de Meta, integración directa).
 *
 *   GET  /whatsapp  → verificación del webhook (WA_VERIFY_TOKEN)
 *   POST /whatsapp  → mensajes entrantes; se responde 200 al instante y se
 *                     procesa en segundo plano (Meta reintenta y duplica avisos)
 *
 * Secretos: WA_TOKEN (token del usuario del sistema), WA_APP_SECRET (firma),
 * WA_VERIFY_TOKEN. Opcionales: WA_API_VERSION (v25.0), WA_API_BASE (pruebas).
 *
 * Cada respuesta va en UN solo mensaje (foto del producto + texto + precio en
 * Bs + los enlaces de las dos asesoras) para gastar lo mínimo del cupo gratis
 * de Meta. Si pide ver una categoría, ese mensaje es una lista con los modelos
 * (vitrina): al tocar uno le llega su foto con los precios, también en UN
 * mensaje y sin IA.
 * El número y el nombre del cliente nunca se envían a la IA.
 */
import { config } from '../lib/config.js';
import { pensar, ocultarDatosPersonales, enlaceWhatsapp } from '../chat.js';
import { guardarCliente } from '../lib/hoja.js';
import { NOTA_FOTO, asesorasDirectas } from '../lib/negocio.js';
import { tasaBcv } from '../lib/bcv.js';
import { fotoParaCanales } from '../lib/catalogo.js';
import { vitrinaSiguiente } from '../lib/vitrina.js';
import {
  cargarEstado, guardarEstado, hayNovedadParaHoja, marcarEnHoja, yaAtendido, yaAtendidoEnOtra, productosNuevos,
} from './memoria.js';
import { descargarImagen } from '../lib/imagen.js';
import { enlacesCortos } from '../lib/enlaces.js';
import { promoActiva, promoParaWhatsapp, promoParaWhatsappSinBoton, textoDeLaPromo } from '../lib/promo.js';
import {
  verificarSuscripcion, firmaValida, lineaPrecio, recortar, presentarse, eleccionDe, fichaElegida, listaDeVitrina, textoDeVitrinaWa,
  pideBolivares, bloqueAsesoras, conCola,
} from './meta.js';

const graph = () => `${config.WA_API_BASE || 'https://graph.facebook.com'}/${config.WA_API_VERSION || 'v25.0'}`;

/*
 * Cupo gratis de Meta (desde el 1-oct-2026): 1.000 mensajes de servicio entregados al mes POR
 * NÚMERO. Sin método de pago, desde el 1.001 Meta deja de entregarlos —sin avisar— hasta el mes
 * siguiente. Aquí se cuentan los envíos aceptados para:
 *   - dejar un aviso en la hoja de clientes al llegar al 80 %;
 *   - al acercarse al tope, dejar de usar la IA y pasar a cada cliente nuevo, con UN mensaje,
 *     directo a las dos asesoras (Línea 1 y Línea 2), y anotarlo en la hoja, en vez de que el asistente quede mudo.
 * WA_CUPO_MENSUAL cambia el tope; 0 lo desactiva (cuando Dekog cargue un método de pago en Meta).
 */
const CUARENTA_DIAS = 60 * 60 * 24 * 40;

export function cupoMensual() {
  // Se escribe a mano en una emergencia: «1.000», «2,000» o « 1000 » valen lo mismo que 1000; vacío o inválido = 1000.
  const limpio = String(config.WA_CUPO_MENSUAL ?? '').replace(/[.,\s]/g, '');
  const n = /^\d+$/.test(limpio) ? Number(limpio) : 1000;
  const cupo = Math.floor(n);
  const reserva = Math.max(1, Math.min(30, Math.floor(cupo * 0.03))); // para los avisos del final
  return { cupo, tope: cupo - reserva, aviso: Math.floor(cupo * 0.8) };
}

const mesActual = () => new Date().toISOString().slice(0, 7); // "2026-10" (UTC)
const claveCupo = (phoneId) => `wa:cupo:${phoneId}:${mesActual()}`;

async function enviadosEsteMes(env, phoneId) {
  return Number(await env.CONVERSACIONES?.get(claveCupo(phoneId))) || 0;
}

/**
 * Suma al cupo los mensajes de esta vuelta que aún no se contaron, con UNA escritura. KV admite 1 escritura por segundo
 * en la misma clave (la segunda lanza 429): contando cada envío, la promo que sale justo después de la respuesta no se
 * contaba (22-oct). Si otra vuelta escribió el contador en ese segundo (dos clientes a la vez), se reintenta 1,1 s
 * después sumando sobre lo último guardado, como guardarEstado. Nunca lanza.
 */
async function contarEnvios(env, vuelta) {
  const n = vuelta.enviados - vuelta.contados;
  if (n <= 0 || !env.CONVERSACIONES) return;
  vuelta.contados = vuelta.enviados;
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const antes = await enviadosEsteMes(env, vuelta.phoneId);
      await env.CONVERSACIONES.put(claveCupo(vuelta.phoneId), String(antes + n), { expirationTtl: CUARENTA_DIAS });
      // Al cruzar el 80 % (una vuelta puede sumar 2: de 799 a 801), el aviso en la hoja. Se espera al final de la vuelta
      // (atenderMensaje): no demora la memoria ni la hoja del cliente.
      const { cupo, aviso } = cupoMensual();
      if (cupo > 0 && antes < aviso && antes + n >= aviso) vuelta.avisoDelCupo = avisarCupo(antes + n);
      return;
    } catch (e) {
      if (intento === 2) {
        console.warn('No se pudo contar el envío:', e?.message);
        return;
      }
      await new Promise((listo) => setTimeout(listo, 1100));
    }
  }
}

/** El aviso del 80 % del cupo: una fila «Sistema» en la hoja de clientes (llega por correo). Nunca lanza. */
function avisarCupo(n) {
  const { cupo, tope } = cupoMensual();
  return guardarCliente({
    conversacion: `aviso-cupo-whatsapp-${mesActual()}`,
    cliente: { nombre: '⚠️ AVISO DEL ASISTENTE', telefono: '', ciudad: '' },
    interes: `WhatsApp: ${n} de ${cupo} respuestas gratis usadas este mes`,
    resumen: `Al llegar a ${tope}, el asistente de WhatsApp pasará a los clientes nuevos directo a las asesoras (Línea 1 y Línea 2) hasta el día 1 del próximo mes. Para no tener tope, carguen un método de pago en Meta.`,
    canal: 'Sistema',
  }).catch((e) => console.warn('No se pudo anotar el aviso del cupo:', e?.message));
}

/** Manda un mensaje (o el «leído») desde el número de esta vuelta. Lo que Meta acepta queda en `vuelta.enviados`. */
async function enviar(vuelta, carga) {
  const r = await fetch(`${graph()}/${vuelta.phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...carga }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    console.warn('WhatsApp rechazó el envío:', r.status, j?.error?.code, j?.error?.message);
  } else if (carga.type) {
    // Solo los mensajes cuentan para el cupo; "leído" y "escribiendo…" no son mensajes entregados. Se guardan en KV una
    // sola vez por vuelta (contarEnvios).
    vuelta.enviados += 1;
  }
  return r.ok;
}

export function whatsappGet(url) {
  return verificarSuscripcion(url, config.WA_VERIFY_TOKEN);
}

/*
 * Avisos de Meta sobre la CUENTA (desbloqueo, restricción, verificación del negocio, calidad o
 * nombre del número). Quedan en la hoja de clientes como una fila «📣 AVISO DE META», para
 * enterarse sin tener que mandar mensajes de prueba. No traen datos de clientes.
 */
const CAMPOS_DE_CUENTA = new Set([
  'account_update', 'account_review_update', 'account_alerts',
  'business_capability_update', 'phone_number_quality_update', 'phone_number_name_update',
  'security', // cambios del PIN o de la verificación del número: la única alarma si alguien los toca
]);

// Lo que el cliente manda sin texto: con estos se le ofrece la asesora (un aviso al día, salvo la foto que no se pudo
// abrir); el resto (stickers, reacciones, ediciones, avisos del sistema, tipos nuevos) se ignora sin responder ni gastar
// cupo ni escrituras de KV. Un sticker es un «👍» o un «gracias»: contestarle «no puedo ver videos» sobraba (21-oct).
// Una foto, un video o un documento pueden traer texto (su pie): ese lo responde la IA.
const SIN_TEXTO = new Set(['image', 'audio', 'video', 'document', 'location', 'contacts']);
const CON_TEXTO = new Set(['text', 'interactive', 'button']);
// Delante del pie de un video o un documento, en el historial: la IA sabe que no lo ve (si es de un modelo, pide una
// captura) en vez de responder como si lo hubiera visto.
const NOTA_SIN_VER = {
  video: '[Video del cliente: no lo puedes ver]',
  document: '[Documento del cliente: no lo puedes abrir]',
};
const AVISO_SIN_TEXTO = {
  audio: 'Por ahora no puedo escuchar notas de voz 🙏 Escríbeme tu pregunta y te respondo al instante, o habla directo con una asesora de Dekog.',
  video: 'Por ahora no puedo ver videos 🙏 Si es de un modelo, mándame una foto o una captura y te digo cuál es, o habla directo con una asesora de Dekog.',
  location: 'Recibí tu ubicación 📍 El costo y el día de la entrega te los confirma una asesora de Dekog.',
  otro: 'Por ahora no puedo abrir archivos ni contactos 🙏 Escríbeme qué necesitas, o habla directo con una asesora de Dekog.',
};

// Tope por cliente y por día: alguien que manda cientos de mensajes, o el contestador automático de otra empresa
// respondiéndole al bot, se comería en una tarde el cupo del mes, las escrituras de KV y la IA de todos.
const topeDiario = () => {
  const n = Number(String(config.WA_TOPE_DIARIO ?? '').replace(/[.,\s]/g, ''));
  return Number.isInteger(n) && n > 0 ? n : 30;
};
const hoyCaracas = () => new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);

// Cada vez que la tarea de cada hora vuelve a suscribir el webhook (reconectarWebhookWhatsapp), Meta lo avisa con un
// account_update de event «WEBHOOK…»: no es nada de la cuenta, y en la hoja era una fila y un correo vacío por hora
// (23-oct, captura de la dueña). Los avisos de verdad (restricción, verificación, bloqueo…) traen otros event.
export const esEcoDeReconexion = (cambio) => cambio?.field === 'account_update' && /^WEBHOOK/i.test(String(cambio?.value?.event ?? ''));

async function avisarCambioDeCuenta(cambio, idCuenta) {
  const valor = cambio.value ?? {};
  if (esEcoDeReconexion(cambio)) {
    console.log('Meta confirmó la reconexión del webhook:', valor.event);
    return;
  }
  const detalle = JSON.stringify(valor).slice(0, 280);
  console.warn('Aviso de Meta sobre la cuenta:', cambio.field, detalle);
  await guardarCliente({
    conversacion: `aviso-meta-${cambio.field}-${idCuenta ?? ''}-${Date.now()}`,
    cliente: { nombre: '📣 AVISO DE META', telefono: '', ciudad: '' },
    interes: [cambio.field, valor.event, valor.decision].filter(Boolean).join(' · '),
    resumen: detalle,
    canal: 'Sistema',
  });
}

export async function whatsappPost(request, env, ctx) {
  const crudo = await request.arrayBuffer();
  if (!(await firmaValida(crudo, request.headers.get('X-Hub-Signature-256'), config.WA_APP_SECRET))) {
    return new Response('Firma inválida', { status: 401 });
  }
  let aviso;
  try {
    aviso = JSON.parse(new TextDecoder().decode(crudo));
  } catch {
    return new Response('ok');
  }
  for (const entrada of aviso.entry ?? []) {
    for (const cambio of entrada.changes ?? []) {
      const valor = cambio.value ?? {};
      if (CAMPOS_DE_CUENTA.has(cambio.field)) {
        ctx.waitUntil(avisarCambioDeCuenta(cambio, entrada.id).catch((e) => console.error('No se pudo anotar el aviso de Meta:', e?.message)));
        continue;
      }
      if (cambio.field !== 'messages') continue; // otros avisos (plantillas, ecos…) no son de clientes
      for (const mensaje of valor.messages ?? []) {
        ctx.waitUntil(atenderMensaje(valor, mensaje, env).catch((e) => console.error('Error con un mensaje de WhatsApp:', e)));
      }
      // Meta acepta el envío y, si luego no puede entregarlo, avisa aquí con el código del error.
      // Solo se registra el código (nunca el teléfono ni el texto) para poder diagnosticar.
      for (const estado of valor.statuses ?? []) {
        if (estado.status === 'failed') {
          for (const error of estado.errors ?? [{}]) {
            console.warn('WhatsApp no entregó un mensaje:', error.code, error.title, error.error_data?.details ?? '');
          }
        }
      }
    }
  }
  return new Response('ok');
}

/** La foto que mandó el cliente: Meta da primero su URL (con el token) y después los bytes; null si falla. */
async function fotoDeWhatsapp(idMedia) {
  if (!idMedia) return null;
  const datos = await fetch(`${graph()}/${idMedia}`, { headers: { Authorization: `Bearer ${config.WA_TOKEN}` } })
    .then((r) => r.json()).catch(() => ({}));
  if (!datos?.url) {
    console.warn('WhatsApp no dio la URL de la foto:', datos?.error?.message ?? 'sin url');
    return null;
  }
  return descargarImagen(datos.url, { token: config.WA_TOKEN, mime: datos.mime_type });
}

function textoDe(mensaje) {
  if (mensaje.type === 'text') return mensaje.text?.body ?? '';
  if (mensaje.type === 'interactive') return mensaje.interactive?.button_reply?.title ?? mensaje.interactive?.list_reply?.title ?? '';
  if (mensaje.type === 'button') return mensaje.button?.text ?? '';
  // El pie de la foto, del video o del documento (la Cloud API lo manda en los tres).
  if (mensaje.type === 'image' || mensaje.type === 'video' || mensaje.type === 'document') return mensaje[mensaje.type]?.caption ?? '';
  return '';
}

/** Lo que eligió en una lista o botón nuestro ("prod:48", "mas:camas"), o null si escribió. */
function eleccionDeMensaje(mensaje) {
  return eleccionDe(mensaje.interactive?.list_reply?.id ?? mensaje.interactive?.button_reply?.id ?? mensaje.button?.payload);
}

const promoMandada = new Set(); // en esta instancia: dos mensajes seguidos del cliente se atienden a la vez

/**
 * La promo (lib/promo.js) UNA vez por cliente y por promo, después de la bienvenida: la imagen, el texto y el botón
 * «Ver ofertas» en un solo mensaje (1 del cupo). Si Meta rechaza el botón, la imagen con el enlace; si tampoco, el texto.
 */
async function enviarPromoSiToca(env, vuelta, base, clave, estado) {
  const promo = promoActiva();
  if (!promo || estado.promoVista === promo.id) return;
  estado.promoVista = promo.id;
  const marca = `${clave}|${promo.id}`;
  // Otra vuelta del mismo cliente pudo mandarla hace un instante: se mira la memoria justo antes.
  if (promoMandada.has(marca) || (await cargarEstado(env.CONVERSACIONES, clave)).promoVista === promo.id) return;
  promoMandada.add(marca);
  if (promoMandada.size > 500) promoMandada.delete(promoMandada.values().next().value);
  if (await enviar(vuelta, { ...base, ...promoParaWhatsapp(promo) })) return;
  if (await enviar(vuelta, { ...base, ...promoParaWhatsappSinBoton(promo) })) return;
  await enviar(vuelta, { ...base, type: 'text', text: { body: textoDeLaPromo(promo, { formato: true }), preview_url: true } });
}

// El pie de una foto admite 1024 caracteres: si los precios y las asesoras le dejan menos que esto al texto de la IA (y
// el texto no cabe entero), va todo en un mensaje de texto (4096), sin la foto. También es 1 mensaje del cupo.
const MINIMO_TEXTO_DEL_PIE = 120;

/**
 * El texto con la cola que arma el servidor al final (los precios en Bs, las asesoras), siempre entera: si no cabe todo
 * en `maximo`, se recorta el texto (conCola de meta.js). Sin cola, solo el texto recortado. Devuelve el `mensaje` y lo
 * que entró del texto (`dicho`), que es lo que va al historial: chat.js mira ahí si ya le mandó el enlace del catálogo
 * de ofertas o la línea de las piezas en stock (yaDicho), y con la respuesta entera los daba por dichos aunque el pie los
 * hubiera recortado, así que no volvían a salir (22-oct).
 */
export function textoConCola(texto, cola, maximo) {
  const dicho = sinEnlacePartido(texto, recortar(texto, cola ? Math.max(1, maximo - cola.length - 2) : maximo));
  return { mensaje: cola ? conCola(dicho, cola, maximo) : dicho, dicho };
}

/**
 * Un párrafo con un enlace va entero o no va: los enlaces de los catálogos van al final del texto de la IA (los pega
 * chat.js), que es lo que se recorta, y partido no abre o abre otra página. Si el corte cae en un párrafo con un
 * enlace, se va ese párrafo y los de antes quedan enteros, sin «…»: pegado al final del enlace de un PDF del catálogo,
 * algunos teléfonos lo toman como parte de la dirección. Si es el primero, se corta antes del enlace.
 * `corto`: el texto ya recortado con «…».
 */
function sinEnlacePartido(texto, corto) {
  if (corto === texto) return texto;
  const queda = corto.length - 1; // lo que quedó del texto, sin el «…»
  let inicio = 0;
  for (const parrafo of texto.split('\n\n')) {
    const fin = inicio + parrafo.length;
    if (queda <= fin) {
      const enlace = parrafo.search(/https?:\/\/|www\./i);
      if (enlace < 0 || (inicio === 0 && enlace >= queda)) return corto;
      return inicio > 0 ? texto.slice(0, inicio - 2).trimEnd() : `${texto.slice(0, enlace).trimEnd()}…`;
    }
    inicio = fin + 2;
  }
  return corto;
}

/**
 * Envía la vitrina como UNA lista; si Meta la rechaza, el mismo contenido en texto. Siempre 1 mensaje del cupo.
 * `asesoras`: si en la misma respuesta pasa a una asesora, sus enlaces van dentro del cuerpo, enteros. Devuelve lo que
 * entró del texto (el `dicho` de textoConCola).
 */
async function enviarVitrina(vuelta, base, v, texto, asesoras = '') {
  // La lista (1024) termina con la guía y el enlace del catálogo (meta.js): el texto y las asesoras van en lo que queda.
  // El texto se recorta aquí, sin partir un enlace, también sin asesoras (antes lo cortaba meta.js en cualquier punto):
  // así se sabe qué le llegó.
  const { mensaje: cuerpo, dicho } = textoConCola(texto, asesoras, 1024 - listaDeVitrina(v, '').body.text.length - 2);
  const ok = await enviar(vuelta, { ...base, type: 'interactive', interactive: listaDeVitrina(v, cuerpo) });
  if (!ok) await enviar(vuelta, { ...base, type: 'text', text: { body: textoDeVitrinaWa(v, cuerpo), preview_url: false } });
  return dicho;
}

// Cloudflare corta lo que siga en waitUntil 30 s después de responderle a Meta: los plazos se cuentan desde que llegó el
// aviso, como en Instagram. La IA (con el «leído» y la foto ya descontados) y después la hoja, que deja tiempo para
// guardar la memoria otra vez.
const PLAZO_IA_MS = 21000;
const PLAZO_HOJA_MS = 27000;
// La hoja solo manda el correo con las filas NUEVAS (y conserva la fecha del primer contacto): pasados 7 días, lo nuevo de
// un cliente va en otra fila.
const SIETE_DIAS_MS = 7 * 24 * 3600 * 1000;

/**
 * Elige la fila de este cliente en la hoja (estado.filaHoja): la suya mientras tenga menos de 7 días; si no tiene, o ya es
 * más vieja, una nueva con la fecha de hoy, sin guardar hasta que la hoja responda. Hasta el 22-oct era siempre
 * wa-<número>: un cliente que volvía (la memoria vence a los 30 días) actualizaba en silencio su fila vieja, sin correo.
 * Quien ya está en una de esas sigue en ella (ni fila ni correo repetidos) y sus 7 días cuentan desde ahora.
 */
function elegirFila(estado) {
  const ahora = Date.now();
  if (!estado.filaHojaDesde && estado.guardado) {
    estado.filaHojaDesde = ahora;
  } else if (!estado.filaHojaDesde || ahora - estado.filaHojaDesde >= SIETE_DIAS_MS) {
    Object.assign(estado, { filaHoja: hoyCaracas(), filaHojaDesde: ahora, guardado: false });
  }
}

/** El id de esa fila: wa-<número (o BSUID)>-<fecha>, o wa-<número> si es de antes del 22-oct. En KV va solo la fecha. */
const idDeLaFila = (estado, cliente) => `wa-${cliente}${estado.filaHoja ? `-${estado.filaHoja}` : ''}`;

// Sin número a la vista (usa nombre de usuario en WhatsApp: solo llega su BSUID) nadie puede escribirle. Si la IA le
// ofrece que lo contacten («una asesora te escribirá a tu WhatsApp», como le pide el prompt, «te va a contactar», «se
// pondrá en contacto contigo», «ya tenemos tu número»), esa oración se quita y va el pase a las dos asesoras.
const PROMETE_CONTACTO = /\b(?:te|le)\s+(?:van?\s+a\s+)?(?:escrib|contact|llam)|\b(?:escribir|contactar|llamar)te\b|\bse\s+(?:comunic|pondr)|\btu\s+n[uú]mero\b/i;
const ESCRIBELE = 'Para seguir, escríbele a la asesora que prefieras con los enlaces de abajo y te atiende con gusto 😊';
const SIN_NUMERO = 'WhatsApp no da su número (usa nombre de usuario): se le pasaron los enlaces de las dos asesoras para que les escriba él.';

/** El texto sin las oraciones que prometen escribirle (por líneas y oraciones, como sinPromesaDeVitrina en chat.js) y con
 * la invitación a escribirle él a una asesora. */
function sinPromesaDeContacto(texto) {
  const queda = texto.split('\n')
    .map((linea) => linea.split(/(?<=[.!?])\s+/).filter((o) => !PROMETE_CONTACTO.test(o)).join(' '))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return [queda, ESCRIBELE].filter(Boolean).join('\n\n');
}

/**
 * Atiende un mensaje y cuenta en el cupo lo que se le mandó al cliente. procesar lo cuenta en cuanto sale todo, antes de
 * la memoria y de la hoja; lo que quede, aquí al final. Si algo lanza a mitad de la vuelta (un fetch a Meta que falla por
 * la red), lo que ya salió se cuenta igual.
 */
async function atenderMensaje(valor, mensaje, env) {
  const vuelta = { phoneId: valor.metadata?.phone_number_id, enviados: 0, contados: 0, avisoDelCupo: null };
  try {
    await procesar(valor, mensaje, env, vuelta);
  } finally {
    await contarEnvios(env, vuelta);
    await vuelta.avisoDelCupo; // el aviso del 80 %, si esta vuelta lo cruzó
  }
}

async function procesar(valor, mensaje, env, vuelta) {
  const t0 = Date.now(); // llegó el aviso: desde aquí corren los 30 s de Cloudflare
  // Clave estable de la conversación: el BSUID (from_user_id) llega siempre; el número (from)
  // puede faltar si el cliente usa nombre de usuario en WhatsApp.
  const usuario = mensaje.from_user_id ?? mensaje.from;
  const phoneId = valor.metadata?.phone_number_id;
  if (!usuario || !phoneId) return;
  // Reacciones, ediciones, avisos del sistema o tipos nuevos: ni respuesta, ni cupo, ni escrituras.
  if (!CON_TEXTO.has(mensaje.type) && !SIN_TEXTO.has(mensaje.type)) return;
  if (yaAtendido(env.CONVERSACIONES, mensaje.id)) return; // aviso repetido de Meta en esta instancia
  const clave = `wa:${phoneId}:${usuario}`;
  const estado = await cargarEstado(env.CONVERSACIONES, clave);
  if (estado.procesados.includes(mensaje.id)) return; // aviso duplicado de Meta
  estado.procesados.push(mensaje.id);

  const destino = mensaje.from ? { to: mensaje.from } : { recipient: mensaje.from_user_id };
  const base = { recipient_type: 'individual', ...destino };
  const contacto = valor.contacts?.find((c) => (mensaje.from && c.wa_id === mensaje.from)
    || (mensaje.from_user_id && c.user_id === mensaje.from_user_id));
  const nombre = contacto?.profile?.name ?? '';
  // Las dos asesoras (Línea 1 y Línea 2) con su wa.me sin texto, para los avisos cortos (pedido de la dueña, 21-oct).
  const asesoras = bloqueAsesoras(asesorasDirectas(), null);

  // Tope por cliente y por día: pasado el tope, UN aviso con la asesora y luego silencio (sin escribir en KV).
  const hoy = hoyCaracas();
  if (estado.hoy?.fecha !== hoy) estado.hoy = { fecha: hoy, n: 0, avisado: false };
  estado.hoy.n += 1;
  if (estado.hoy.n > topeDiario()) {
    if (estado.hoy.avisado) return;
    estado.hoy.avisado = true;
    await enviar(vuelta, {
      ...base,
      type: 'text',
      text: { body: `Para seguir atendiéndote hoy, escríbele directo a una asesora de Dekog 😊\n\n${asesoras}`, preview_url: false },
    });
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  // Cupo del mes casi agotado: sin IA, UN mensaje con el enlace a la asesora (una vez al mes por
  // cliente) y el cliente queda en la hoja para que lo llamen. Al que ya se le avisó, silencio: ni
  // «escribiendo…» ni escrituras.
  const { cupo, tope } = cupoMensual();
  const enviados = cupo > 0 ? await enviadosEsteMes(env, phoneId).catch(() => 0) : 0;
  if (cupo > 0 && enviados >= tope) {
    if (estado.avisoCupo === mesActual()) return;
    estado.avisoCupo = mesActual();
    await enviar(vuelta, {
      ...base,
      type: 'text',
      text: { body: `¡Hola! 👋 Gracias por escribir a Dekog. Para atenderte ahora mismo, escríbele directo a una de nuestras asesoras:\n\n${asesoras}`, preview_url: false },
    });
    // Primero el cupo y la memoria (con su fila de la hoja), después la hoja: si la hoja tarda, el aviso ya quedó contado
    // y no se le vuelve a dar.
    if (mensaje.from) elegirFila(estado);
    await contarEnvios(env, vuelta);
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    if (mensaje.from) {
      await guardarCliente({
        conversacion: idDeLaFila(estado, mensaje.from),
        cliente: { nombre, telefono: `+${mensaje.from}`, ciudad: '' },
        interes: estado.interes,
        resumen: 'Escribió al WhatsApp del asistente cuando ya no le quedaban respuestas gratis este mes: escríbele tú.',
        canal: 'WhatsApp',
      }, { hasta: t0 + PLAZO_HOJA_MS });
    }
    return;
  }

  // Nota de voz, video, ubicación o archivo SIN texto cuando ya se le avisó hoy que no se pueden leer: silencio, sin
  // «escribiendo…» (si sigue mandando audios, no se le repite el mismo aviso cada vez; 21-oct). Con texto, se responde.
  const texto = textoDe(mensaje).trim().slice(0, 800);
  const sinLeer = !CON_TEXTO.has(mensaje.type) && mensaje.type !== 'image' && !texto;
  if (sinLeer && estado.avisoSinLeer === hoy) {
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  // Lo que sigue (bajar la foto y la IA) puede tardar hasta 21 s y procesados se guarda al final: si Meta repite el aviso
  // y la repetición cae en otra instancia, la frena esta marca (al tocar una fila de la vitrina se responde al instante).
  const eleccion = eleccionDeMensaje(mensaje);
  if ((mensaje.type === 'image' || (texto && !eleccion)) && await yaAtendidoEnOtra(env.CONVERSACIONES, mensaje.id)) return;

  // "Leído" y "escribiendo…" mientras piensa (no consume cupo).
  await enviar(vuelta, { status: 'read', message_id: mensaje.id, typing_indicator: { type: 'text' } });

  // Una foto (de la web, del catálogo o de cualquier lado): la IA la compara con el catálogo (lib/imagen.js).
  const imagen = mensaje.type === 'image' ? await fotoDeWhatsapp(mensaje.image?.id) : null;
  if (!texto && !imagen) {
    // Nota de voz, video, ubicación, archivo o una foto que no se pudo abrir: en Venezuela la nota de voz es lo normal.
    // Se le ofrece la asesora en el mismo mensaje (y se presenta si es lo primero que escribe). Salvo la foto, UN aviso
    // al día (arriba).
    const foto = mensaje.type === 'image';
    if (!foto) estado.avisoSinLeer = hoy;
    const aviso = foto
      ? 'No pude abrir esa foto 🙏 ¿Me la reenvías, o me escribes qué modelo buscas? También puedes hablar directo con una asesora de Dekog.'
      : AVISO_SIN_TEXTO[mensaje.type] ?? AVISO_SIN_TEXTO.otro;
    await enviar(vuelta, {
      ...base,
      type: 'text',
      text: { body: `${presentarse(aviso, estado.mensajes.length === 0)}\n\n${asesoras}`, preview_url: false },
    });
    await enviarPromoSiToca(env, vuelta, base, clave, estado);
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  const escrito = ocultarDatosPersonales(texto);
  const nota = imagen ? NOTA_FOTO : NOTA_SIN_VER[mensaje.type] ?? '';
  estado.mensajes.push({ role: 'user', content: [nota, escrito].filter(Boolean).join(' ') });

  // Tocó una fila de la vitrina: se responde SIN IA (al instante y sin gastar Gemini), con UN mensaje.
  if (eleccion?.tipo === 'producto') {
    const ficha = fichaElegida(eleccion.id, await tasaBcv());
    // La misma foto que acaba de ver: solo el texto.
    const conFoto = productosNuevos(estado, [ficha.tarjeta]).length > 0;
    const listo = conFoto && await enviar(vuelta, { ...base, type: 'image', image: { link: fotoParaCanales(ficha.tarjeta.id), caption: recortar(ficha.caption, 1024) } });
    if (!listo) await enviar(vuelta, { ...base, type: 'text', text: { body: recortar(ficha.caption, 4096), preview_url: false } });
    estado.mensajes.push({ role: 'assistant', content: ficha.texto });
    estado.interes = ficha.interes;
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }
  if (eleccion?.tipo === 'mas') {
    const v = vitrinaSiguiente(eleccion.clave, estado.mensajes);
    const intro = `Más ${v.titulo.toLowerCase()} para elegir.`;
    await enviarVitrina(vuelta, base, v, intro);
    estado.mensajes.push({ role: 'assistant', content: `${intro}\n\n${v.nota}` });
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  const r = await pensar(estado.mensajes, 'whatsapp', { imagen, kv: env.CONVERSACIONES, hasta: t0 + PLAZO_IA_MS });
  // Sin número (solo su BSUID), si la IA le ofrece que lo contacten, el pase a las dos asesoras con lo que le interesa ya
  // escrito, para que les escriba él, y sin esa promesa (también cuando además deriva: nadie puede escribirle).
  const sinNumero = !mensaje.from && Boolean(r.formulario || r.whatsapp);
  const pase = r.whatsapp ?? (sinNumero ? enlaceWhatsapp('home', r.interes || estado.interes, 'whatsapp') : null);
  const respuesta = presentarse(sinNumero ? sinPromesaDeContacto(r.respuesta) : r.respuesta, estado.mensajes.length === 1);
  // Pidió ver una categoría: UNA lista (la foto va cuando elige un modelo). Si en la misma respuesta pasa a una asesora,
  // sus enlaces van dentro de la lista: la vitrina nunca se descarta (antes salía solo el pase, con un texto que pedía
  // tocar un «Ver modelos» que no llegaba).
  const { vitrina } = r;
  // La foto y el precio solo van cuando cambian: si el cliente pregunta por el pago o el envío del
  // mismo producto, repetir la misma foto se siente robótico. Con vitrina, los modelos van en la lista.
  const nuevos = vitrina ? [] : productosNuevos(estado, r.productos);
  const [principal] = nuevos;
  // Pidió el monto en bolívares (o la respuesta lo promete) del MISMO producto: la foto no se repite, el precio sí.
  const repetidos = !vitrina && !nuevos.length && pideBolivares(texto, respuesta) ? r.productos : [];
  const precios = [...nuevos, ...repetidos].map((p) => lineaPrecio(p, r.tasa)).join('\n');

  // Pasa a una asesora: los enlaces de las DOS (Línea 1 y Línea 2) con el resumen ya escrito, cortos (lib/enlaces.js),
  // al final del mismo mensaje y siempre enteros (conCola). Antes era un botón con una sola línea (21-oct).
  const asesorasDelPase = pase ? bloqueAsesoras(await enlacesCortos(env.CONVERSACIONES, pase.lineas)) : '';
  // Los precios en REF y Bs y las asesoras los arma el servidor: van enteros al final y, si no cabe todo, se recorta el
  // texto de la IA (antes el pie de foto cortaba por el final y lo primero que se perdía eran los precios en Bs).
  const cola = [precios, asesorasDelPase].filter(Boolean).join('\n\n');
  const libre = 1024 - cola.length - 2; // lo que le queda al texto de la IA en el pie de foto
  let enviado = false;
  let dicho; // lo que le llegó del texto (el pie o la lista pueden recortarlo): eso queda en el historial
  // Un texto que no cabe en el pie solo se recorta si no trae enlaces: el del catálogo de ofertas (o los PDF) lo pega el
  // servidor al final y sería lo primero en perderse. Entonces va todo en un mensaje de texto (también 1 del cupo).
  if (vitrina) {
    dicho = await enviarVitrina(vuelta, base, vitrina, respuesta, asesorasDelPase);
    enviado = true;
  } else if (principal && (respuesta.length <= libre || (libre >= MINIMO_TEXTO_DEL_PIE && !/https?:\/\//i.test(respuesta)))) {
    const pie = textoConCola(respuesta, cola, 1024);
    enviado = await enviar(vuelta, { ...base, type: 'image', image: { link: fotoParaCanales(principal.id), caption: pie.mensaje } });
    dicho = pie.dicho;
  }
  if (!enviado) {
    const cuerpo = textoConCola(respuesta, cola, 4096);
    await enviar(vuelta, { ...base, type: 'text', text: { body: cuerpo.mensaje, preview_url: false } });
    dicho = cuerpo.dicho;
  }
  // Después de la bienvenida (o de la primera respuesta desde que hay promo), la promo con su imagen y su botón.
  await enviarPromoSiToca(env, vuelta, base, clave, estado);
  // Ya salió todo: el cupo se cuenta ahora, con una sola escritura, antes de la memoria y de la hoja.
  await contarEnvios(env, vuelta);
  // La nota le dice a la IA qué modelos vio (para «la tercera» u «otras») y a la vitrina qué no repetir.
  estado.mensajes.push({ role: 'assistant', content: vitrina ? `${dicho}\n\n${vitrina.nota}` : dicho });

  if (r.interes) estado.interes = r.interes;
  if (r.resumen) estado.resumen = r.resumen;
  // Mostró interés o pidió una asesora: va a la hoja con su número de WhatsApp, para que la asesora le escriba (sin
  // número, para que Dekog sepa del interés). Su fila se elige ya, así queda en la memoria aunque la hoja no responda.
  const interesado = r.formulario || Boolean(r.whatsapp);
  if (interesado) elegirFila(estado);
  // Primero la memoria y después la hoja: con la IA lenta y Apps Script dormido se pasaban los 30 s y Cloudflare cortaba
  // antes de guardar el turno (historial, procesados y promo). Ahora lo que se corta es la hoja, que se reintenta con el
  // próximo mensaje.
  await guardarEstado(env.CONVERSACIONES, clave, estado);
  // Su número también cuenta como novedad, como en Instagram: quien escribió primero sin número (solo su BSUID) y ahora
  // llega con él va a la hoja con su teléfono, en otra fila y con correo. Antes la IA le prometía que una asesora le
  // escribiría y su única fila decía que WhatsApp no da su número (22-oct). A quien ya estaba en la hoja con su número,
  // como mucho una actualización más de su misma fila, sin correo.
  if (hayNovedadParaHoja(estado, { interesado, telefono: mensaje.from ?? '' })) {
    const ok = await guardarCliente({
      conversacion: idDeLaFila(estado, mensaje.from ?? usuario),
      cliente: { nombre, telefono: mensaje.from ? `+${mensaje.from}` : '', ciudad: '' },
      interes: estado.interes,
      resumen: mensaje.from ? estado.resumen : [estado.resumen, SIN_NUMERO].filter(Boolean).join(' · '),
      canal: 'WhatsApp',
    }, { hasta: t0 + PLAZO_HOJA_MS });
    if (ok) {
      marcarEnHoja(estado, mensaje.from ?? '');
      await guardarEstado(env.CONVERSACIONES, clave, estado);
    }
  }
}

// Los mismos campos que tenía la app el 9-oct (si se manda solo «messages», Meta deja solo ese).
const CAMPOS_WEBHOOK = 'account_alerts,account_review_update,account_update,calls,message_template_quality_update,'
  + 'message_template_status_update,messages,phone_number_name_update,phone_number_quality_update,security';

async function pedirMeta(ruta, { token = config.WA_TOKEN, metodo = 'GET', cuerpo } = {}) {
  try {
    const r = await fetch(`${graph()}/${ruta}`, { method: metodo, body: cuerpo, headers: { Authorization: `Bearer ${token}` } });
    return { http: r.status, ...(await r.json().catch(() => ({}))) };
  } catch (e) {
    return { error: { message: e?.message ?? 'sin respuesta' } };
  }
}

/**
 * Vuelve a suscribir el webhook de WhatsApp de la app (los mismos datos que ya tiene) y la app a la cuenta de WhatsApp.
 * El 9-oct Meta dejó de entregar los mensajes durante horas aunque todo figuraba «activo», y esto lo destrabó al
 * instante: la tarea de cada hora lo repite, así una caída así dura como mucho una hora. Si falla dos horas seguidas,
 * queda UN aviso «Sistema» al día en la hoja (llega por correo). Necesita WA_APP_ID, WA_WABA_ID y ASISTENTE_URL.
 */
export async function reconectarWebhookWhatsapp(env, origen = config.ASISTENTE_URL) {
  const app = config.WA_APP_ID;
  const cuenta = config.WA_WABA_ID;
  if (!app || !cuenta || !origen || !config.WA_APP_SECRET || !config.WA_TOKEN) return null;
  const webhook = await pedirMeta(`${app}/subscriptions`, {
    token: `${app}|${config.WA_APP_SECRET}`,
    metodo: 'POST',
    cuerpo: new URLSearchParams({
      object: 'whatsapp_business_account',
      callback_url: `${origen}/whatsapp`,
      verify_token: config.WA_VERIFY_TOKEN ?? '',
      fields: CAMPOS_WEBHOOK,
    }),
  });
  const suscripcion = await pedirMeta(`${cuenta}/subscribed_apps`, { metodo: 'POST' });
  const ok = Boolean(webhook.success && suscripcion.success);
  if (ok) {
    // La hora de la última reconexión buena, para verla en /salud (24 escrituras de KV al día, de las 1.000 gratis).
    await env.CONVERSACIONES?.put('wa:webhook:ultima', new Date().toISOString(), { expirationTtl: 7 * 86400 })
      .catch((e) => console.warn('No se pudo anotar la reconexión:', e?.message));
    return { ok, webhook, suscripcion };
  }

  console.error('No se pudo reconectar el webhook de WhatsApp:', webhook.error?.message ?? '', '|', suscripcion.error?.message ?? '');
  const kv = env.CONVERSACIONES;
  try {
    // Un fallo suelto de Meta no avisa: hace falta otro (el contador vence a las 3 horas) y que la última reconexión
    // buena tenga más de 2 horas. El contador no se reinicia al reconectar bien: fallo, éxito y fallo no son dos horas
    // seguidas sin WhatsApp, y avisaban igual.
    const fallos = Number(await kv?.get('wa:webhook:fallos') ?? 0) + 1;
    await kv?.put('wa:webhook:fallos', String(fallos), { expirationTtl: 3 * 3600 });
    const ultima = await kv?.get('wa:webhook:ultima');
    const reconectoHacePoco = Boolean(ultima) && Date.now() - Date.parse(ultima) < 2 * 3600 * 1000;
    const hoy = hoyCaracas();
    if (fallos >= 2 && !reconectoHacePoco && !(await kv?.get(`wa:webhook:aviso:${hoy}`))) {
      await kv?.put(`wa:webhook:aviso:${hoy}`, '1', { expirationTtl: 48 * 3600 });
      await guardarCliente({
        conversacion: `sistema-wa-${hoy}`,
        cliente: { nombre: 'WhatsApp sin conexión', telefono: '', ciudad: '' },
        interes: '',
        resumen: `El asistente no pudo reconectarse con WhatsApp (${webhook.error?.message ?? suscripcion.error?.message ?? 'error de Meta'}). `
          + 'Puede que no esté recibiendo mensajes: avísale a Jeremy.',
        canal: 'Sistema',
      });
    }
  } catch (e) {
    console.warn('No se pudo registrar el fallo del webhook de WhatsApp:', e?.message);
  }
  return { ok, webhook, suscripcion };
}

/**
 * Diagnóstico para cuando el bot deja de recibir mensajes: le pregunta a Meta, con el token del bot, cómo están el
 * número, la cuenta de WhatsApp, la suscripción de la app y su webhook. Solo responde con la cabecera X-Clave igual a
 * DIAG_CLAVE (secreto del Worker); si no, 404. Nunca devuelve el token ni datos de clientes.
 *   GET /diagnostico/whatsapp            → estado
 *   GET /diagnostico/whatsapp?reparar=1  → además, reconecta el webhook (reconectarWebhookWhatsapp)
 */
export async function diagnosticoWhatsapp(request, url, env) {
  if (!env.DIAG_CLAVE || request.headers.get('X-Clave') !== env.DIAG_CLAVE) return new Response('No encontrado', { status: 404 });
  const { WA_APP_ID: app, WA_WABA_ID: cuenta } = config;
  const reparado = url.searchParams.get('reparar') === '1' ? await reconectarWebhookWhatsapp(env, url.origin) : null;
  const telefono = (url.searchParams.get('telefono') ?? '').replace(/\D/g, '');
  return Response.json({
    reparado,
    webhook_app: app && config.WA_APP_SECRET ? await pedirMeta(`${app}/subscriptions`, { token: `${app}|${config.WA_APP_SECRET}` }) : null,
    // El nombre «Dekog Home» arriba del chat solo sale con name_status APPROVED (lo revisa Meta: ver CONTEXTO_DEKOG.md).
    numero: telefono ? await pedirMeta(`${telefono}?fields=display_phone_number,verified_name,name_status,new_name_status,status,quality_rating,code_verification_status,platform_type,messaging_limit_tier,is_official_business_account`) : null,
    cuenta: cuenta ? await pedirMeta(`${cuenta}?fields=name,account_review_status,business_verification_status`) : null,
    suscripcion: cuenta ? await pedirMeta(`${cuenta}/subscribed_apps`) : null,
  });
}
