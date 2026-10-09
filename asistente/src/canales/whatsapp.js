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
 * Bs + botón a la asesora) para gastar lo mínimo del cupo gratis de Meta. Si
 * pide ver una categoría, ese mensaje es una lista con los modelos (vitrina):
 * al tocar uno le llega su foto con los precios, también en UN mensaje y sin IA.
 * El número y el nombre del cliente nunca se envían a la IA.
 */
import { config } from '../lib/config.js';
import { pensar, ocultarDatosPersonales } from '../chat.js';
import { guardarCliente } from '../lib/hoja.js';
import { lineas } from '../lib/negocio.js';
import { tasaBcv } from '../lib/bcv.js';
import { fotoParaCanales } from '../lib/catalogo.js';
import { vitrinaSiguiente } from '../lib/vitrina.js';
import { cargarEstado, guardarEstado, hayNovedadParaHoja, marcarEnHoja, yaAtendido, productosNuevos } from './memoria.js';
import {
  verificarSuscripcion, firmaValida, lineaPrecio, recortar, presentarse, eleccionDe, fichaElegida, listaDeVitrina, textoDeVitrinaWa,
} from './meta.js';

const graph = () => `${config.WA_API_BASE || 'https://graph.facebook.com'}/${config.WA_API_VERSION || 'v25.0'}`;

/*
 * Cupo gratis de Meta (desde el 1-oct-2026): 1.000 mensajes de servicio entregados al mes POR
 * NÚMERO. Sin método de pago, desde el 1.001 Meta deja de entregarlos —sin avisar— hasta el mes
 * siguiente. Aquí se cuentan los envíos aceptados para:
 *   - dejar un aviso en la hoja de clientes al llegar al 80 %;
 *   - al acercarse al tope, dejar de usar la IA y pasar a cada cliente nuevo, con UN mensaje,
 *     directo a la Línea 01 (y anotarlo en la hoja), en vez de que el asistente quede mudo.
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

async function contarEnvio(env, phoneId) {
  if (!env.CONVERSACIONES) return;
  const n = (await enviadosEsteMes(env, phoneId)) + 1;
  await env.CONVERSACIONES.put(claveCupo(phoneId), String(n), { expirationTtl: CUARENTA_DIAS });
  const { cupo, tope, aviso } = cupoMensual();
  if (cupo > 0 && n === aviso) {
    await guardarCliente({
      conversacion: `aviso-cupo-whatsapp-${mesActual()}`,
      cliente: { nombre: '⚠️ AVISO DEL ASISTENTE', telefono: '', ciudad: '' },
      interes: `WhatsApp: ${n} de ${cupo} respuestas gratis usadas este mes`,
      resumen: `Al llegar a ${tope}, el asistente de WhatsApp pasará a los clientes nuevos directo a la Línea 01 hasta el día 1 del próximo mes. Para no tener tope, carguen un método de pago en Meta.`,
      canal: 'Sistema',
    });
  }
}

async function enviar(env, phoneId, carga) {
  const r = await fetch(`${graph()}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...carga }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    console.warn('WhatsApp rechazó el envío:', r.status, j?.error?.code, j?.error?.message);
  } else if (carga.type) {
    // Solo los mensajes cuentan para el cupo; "leído" y "escribiendo…" no son mensajes entregados.
    await contarEnvio(env, phoneId).catch((e) => console.warn('No se pudo contar el envío:', e?.message));
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

// Lo que el cliente manda sin texto: con estos se le ofrece la asesora; el resto (reacciones, ediciones, avisos
// del sistema, tipos nuevos) se ignora sin responder ni gastar cupo ni escrituras de KV.
const SIN_TEXTO = new Set(['image', 'audio', 'video', 'document', 'sticker', 'location', 'contacts']);
const CON_TEXTO = new Set(['text', 'interactive', 'button']);

// Tope por cliente y por día: alguien que manda cientos de mensajes, o el contestador automático de otra empresa
// respondiéndole al bot, se comería en una tarde el cupo del mes, las escrituras de KV y la IA de todos.
const topeDiario = () => {
  const n = Number(String(config.WA_TOPE_DIARIO ?? '').replace(/[.,\s]/g, ''));
  return Number.isInteger(n) && n > 0 ? n : 30;
};
const hoyCaracas = () => new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);

async function avisarCambioDeCuenta(cambio, idCuenta) {
  const valor = cambio.value ?? {};
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
        ctx.waitUntil(procesar(valor, mensaje, env).catch((e) => console.error('Error con un mensaje de WhatsApp:', e)));
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

function textoDe(mensaje) {
  if (mensaje.type === 'text') return mensaje.text?.body ?? '';
  if (mensaje.type === 'interactive') return mensaje.interactive?.button_reply?.title ?? mensaje.interactive?.list_reply?.title ?? '';
  if (mensaje.type === 'button') return mensaje.button?.text ?? '';
  return '';
}

/** Lo que eligió en una lista o botón nuestro ("prod:48", "mas:camas"), o null si escribió. */
function eleccionDeMensaje(mensaje) {
  return eleccionDe(mensaje.interactive?.list_reply?.id ?? mensaje.interactive?.button_reply?.id ?? mensaje.button?.payload);
}

/** Envía la vitrina como UNA lista; si Meta la rechaza, el mismo contenido en texto. Siempre 1 mensaje del cupo. */
async function enviarVitrina(env, phoneId, base, v, texto) {
  const ok = await enviar(env, phoneId, { ...base, type: 'interactive', interactive: listaDeVitrina(v, texto) });
  if (!ok) await enviar(env, phoneId, { ...base, type: 'text', text: { body: textoDeVitrinaWa(v, texto), preview_url: false } });
}

async function procesar(valor, mensaje, env) {
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
  const asesora = `https://wa.me/${lineas['01'].numero}`;

  // Tope por cliente y por día: pasado el tope, UN aviso con la asesora y luego silencio (sin escribir en KV).
  const hoy = hoyCaracas();
  if (estado.hoy?.fecha !== hoy) estado.hoy = { fecha: hoy, n: 0, avisado: false };
  estado.hoy.n += 1;
  if (estado.hoy.n > topeDiario()) {
    if (estado.hoy.avisado) return;
    estado.hoy.avisado = true;
    await enviar(env, phoneId, {
      ...base,
      type: 'text',
      text: { body: `Para seguir atendiéndote hoy, escríbele directo a una asesora de Dekog 😊 ${asesora}`, preview_url: false },
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
    await enviar(env, phoneId, {
      ...base,
      type: 'text',
      text: { body: `¡Hola! 👋 Gracias por escribir a Dekog. Para atenderte ahora mismo, escríbele directo a nuestra asesora: ${asesora}`, preview_url: false },
    });
    // Primero la memoria y después la hoja: si la hoja tarda, al menos no se le vuelve a avisar.
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    if (mensaje.from) {
      await guardarCliente({
        conversacion: `wa-${mensaje.from}`,
        cliente: { nombre, telefono: `+${mensaje.from}`, ciudad: '' },
        interes: estado.interes,
        resumen: 'Escribió al WhatsApp del asistente cuando ya no le quedaban respuestas gratis este mes: escríbele tú.',
        canal: 'WhatsApp',
      });
    }
    return;
  }

  // "Leído" y "escribiendo…" mientras piensa (no consume cupo).
  await enviar(env, phoneId, { status: 'read', message_id: mensaje.id, typing_indicator: { type: 'text' } });

  const texto = textoDe(mensaje).trim().slice(0, 800);
  if (!texto) {
    // Nota de voz, foto, video…: en Venezuela la nota de voz es lo normal, y Dekog fabrica a partir de fotos. Se le
    // ofrece la asesora en el mismo mensaje (y se presenta si es lo primero que escribe).
    const aviso = 'Por ahora no puedo escuchar audios ni ver fotos 🙏 Escríbeme tu pregunta y te ayudo, o habla directo con una asesora de Dekog.';
    await enviar(env, phoneId, {
      ...base,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text: presentarse(aviso, estado.mensajes.length === 0) },
        action: { name: 'cta_url', parameters: { display_text: 'Hablar con asesora', url: asesora } },
      },
    });
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  estado.mensajes.push({ role: 'user', content: ocultarDatosPersonales(texto) });

  // Tocó una fila de la vitrina: se responde SIN IA (al instante y sin gastar Gemini), con UN mensaje.
  const eleccion = eleccionDeMensaje(mensaje);
  if (eleccion?.tipo === 'producto') {
    const ficha = fichaElegida(eleccion.id, await tasaBcv());
    // La misma foto que acaba de ver: solo el texto.
    const conFoto = productosNuevos(estado, [ficha.tarjeta]).length > 0;
    const listo = conFoto && await enviar(env, phoneId, { ...base, type: 'image', image: { link: fotoParaCanales(ficha.tarjeta.id), caption: recortar(ficha.caption, 1024) } });
    if (!listo) await enviar(env, phoneId, { ...base, type: 'text', text: { body: recortar(ficha.caption, 4096), preview_url: false } });
    estado.mensajes.push({ role: 'assistant', content: ficha.texto });
    estado.interes = ficha.interes;
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }
  if (eleccion?.tipo === 'mas') {
    const v = vitrinaSiguiente(eleccion.clave, estado.mensajes);
    const intro = `Más ${v.titulo.toLowerCase()} para elegir.`;
    await enviarVitrina(env, phoneId, base, v, intro);
    estado.mensajes.push({ role: 'assistant', content: `${intro}\n\n${v.nota}` });
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  const r = await pensar(estado.mensajes, 'whatsapp');
  const respuesta = presentarse(r.respuesta, estado.mensajes.length === 1);
  // Pidió ver una categoría: UNA lista (la foto va cuando elige un modelo). Con asesora, manda su botón.
  const vitrina = r.whatsapp ? null : r.vitrina;
  // La foto y el precio solo van cuando cambian: si el cliente pregunta por el pago o el envío del
  // mismo producto, repetir la misma foto se siente robótico. Con vitrina, los modelos van en la lista.
  const nuevos = vitrina ? [] : productosNuevos(estado, r.productos);
  const [principal] = nuevos;
  const cuerpo = [respuesta, nuevos.map((p) => lineaPrecio(p, r.tasa)).join('\n')].filter(Boolean).join('\n\n');

  let enviado = false;
  if (vitrina) {
    await enviarVitrina(env, phoneId, base, vitrina, cuerpo);
    enviado = true;
  } else if (r.whatsapp) {
    enviado = await enviar(env, phoneId, {
      ...base,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        ...(principal ? { header: { type: 'image', image: { link: fotoParaCanales(principal.id) } } } : {}),
        body: { text: recortar(cuerpo, 1024) },
        action: { name: 'cta_url', parameters: { display_text: 'Hablar con asesora', url: r.whatsapp.url } },
      },
    });
  } else if (principal) {
    enviado = await enviar(env, phoneId, { ...base, type: 'image', image: { link: fotoParaCanales(principal.id), caption: recortar(cuerpo, 1024) } });
  }
  if (!enviado) {
    const conEnlace = r.whatsapp ? `${cuerpo}\n\nHabla con una asesora: ${r.whatsapp.url}` : cuerpo;
    await enviar(env, phoneId, { ...base, type: 'text', text: { body: recortar(conEnlace, 4096), preview_url: false } });
  }
  // La nota le dice a la IA qué modelos vio (para «la tercera» u «otras») y a la vitrina qué no repetir.
  estado.mensajes.push({ role: 'assistant', content: vitrina ? `${respuesta}\n\n${vitrina.nota}` : respuesta });

  if (r.interes) estado.interes = r.interes;
  if (r.resumen) estado.resumen = r.resumen;
  // Mostró interés o pidió una asesora: queda en la hoja con su número de WhatsApp, para que
  // la asesora le escriba. Si después pide otra cosa, se actualiza su misma fila.
  const interesado = r.formulario || Boolean(r.whatsapp);
  if (mensaje.from && hayNovedadParaHoja(estado, { interesado })) {
    const ok = await guardarCliente({
      conversacion: `wa-${mensaje.from}`,
      cliente: { nombre, telefono: `+${mensaje.from}`, ciudad: '' },
      interes: estado.interes,
      resumen: estado.resumen,
      canal: 'WhatsApp',
    });
    if (ok) marcarEnHoja(estado);
  }
  await guardarEstado(env.CONVERSACIONES, clave, estado);
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
  if (ok) return { ok, webhook, suscripcion };

  console.error('No se pudo reconectar el webhook de WhatsApp:', webhook.error?.message ?? '', '|', suscripcion.error?.message ?? '');
  const kv = env.CONVERSACIONES;
  try {
    // Un fallo suelto de Meta no avisa: solo el segundo seguido (el contador vence a las 3 horas).
    const fallos = Number(await kv?.get('wa:webhook:fallos') ?? 0) + 1;
    await kv?.put('wa:webhook:fallos', String(fallos), { expirationTtl: 3 * 3600 });
    const hoy = hoyCaracas();
    if (fallos >= 2 && !(await kv?.get(`wa:webhook:aviso:${hoy}`))) {
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
    numero: telefono ? await pedirMeta(`${telefono}?fields=display_phone_number,verified_name,name_status,status,quality_rating,code_verification_status,platform_type,messaging_limit_tier`) : null,
    cuenta: cuenta ? await pedirMeta(`${cuenta}?fields=name,account_review_status`) : null,
    suscripcion: cuenta ? await pedirMeta(`${cuenta}/subscribed_apps`) : null,
  });
}
