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
 * Bs + botón a la asesora) para gastar lo mínimo del cupo gratis de Meta.
 * El número y el nombre del cliente nunca se envían a la IA.
 */
import { config } from '../lib/config.js';
import { pensar, ocultarDatosPersonales } from '../chat.js';
import { guardarCliente } from '../lib/hoja.js';
import { lineas } from '../lib/negocio.js';
import { cargarEstado, guardarEstado, hayNovedadParaHoja, marcarEnHoja, yaAtendido } from './memoria.js';
import { verificarSuscripcion, firmaValida, lineaPrecio, recortar, presentarse } from './meta.js';

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

function cupoMensual() {
  const n = Number(config.WA_CUPO_MENSUAL ?? 1000);
  const cupo = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1000;
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
      for (const mensaje of valor.messages ?? []) {
        ctx.waitUntil(procesar(valor, mensaje, env).catch((e) => console.error('Error con un mensaje de WhatsApp:', e)));
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

async function procesar(valor, mensaje, env) {
  // Clave estable de la conversación: el BSUID (from_user_id) llega siempre; el número (from)
  // puede faltar si el cliente usa nombre de usuario en WhatsApp.
  const usuario = mensaje.from_user_id ?? mensaje.from;
  const phoneId = valor.metadata?.phone_number_id;
  if (!usuario || !phoneId) return;
  if (await yaAtendido(env.CONVERSACIONES, mensaje.id)) return; // aviso repetido de Meta
  const clave = `wa:${phoneId}:${usuario}`;
  const estado = await cargarEstado(env.CONVERSACIONES, clave);
  if (estado.procesados.includes(mensaje.id)) return; // aviso duplicado de Meta
  estado.procesados.push(mensaje.id);

  // "Leído" y "escribiendo…" mientras piensa (no consume cupo).
  await enviar(env, phoneId, { status: 'read', message_id: mensaje.id, typing_indicator: { type: 'text' } });
  const destino = mensaje.from ? { to: mensaje.from } : { recipient: mensaje.from_user_id };
  const base = { recipient_type: 'individual', ...destino };
  const contacto = valor.contacts?.find((c) => (mensaje.from && c.wa_id === mensaje.from)
    || (mensaje.from_user_id && c.user_id === mensaje.from_user_id));
  const nombre = contacto?.profile?.name ?? '';

  // Cupo del mes casi agotado: sin IA, UN mensaje con el enlace a la asesora (una vez al mes por
  // cliente) y el cliente queda en la hoja para que lo llamen.
  const { cupo, tope } = cupoMensual();
  if (cupo > 0 && (await enviadosEsteMes(env, phoneId)) >= tope) {
    if (estado.avisoCupo !== mesActual()) {
      estado.avisoCupo = mesActual();
      const asesora = `https://wa.me/${lineas['01'].numero}`;
      await enviar(env, phoneId, {
        ...base,
        type: 'text',
        text: { body: `¡Hola! 👋 Gracias por escribir a Dekog. Para atenderte ahora mismo, escríbele directo a nuestra asesora: ${asesora}`, preview_url: false },
      });
      if (mensaje.from) {
        await guardarCliente({
          conversacion: `wa-${mensaje.from}`,
          cliente: { nombre, telefono: `+${mensaje.from}`, ciudad: '' },
          interes: estado.interes,
          resumen: 'Escribió al WhatsApp del asistente cuando ya no le quedaban respuestas gratis este mes: escríbele tú.',
          canal: 'WhatsApp',
        });
      }
    }
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  const texto = textoDe(mensaje).trim().slice(0, 800);
  if (!texto) {
    await enviar(env, phoneId, { ...base, type: 'text', text: { body: 'Por ahora solo puedo leer mensajes de texto 🙂 Escríbeme tu pregunta y te ayudo.' } });
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  estado.mensajes.push({ role: 'user', content: ocultarDatosPersonales(texto) });
  const r = await pensar(estado.mensajes, 'whatsapp');
  const respuesta = presentarse(r.respuesta, estado.mensajes.length === 1);
  const [principal] = r.productos;
  const cuerpo = [respuesta, r.productos.map((p) => lineaPrecio(p, r.tasa)).join('\n')].filter(Boolean).join('\n\n');

  let enviado = false;
  if (r.whatsapp) {
    enviado = await enviar(env, phoneId, {
      ...base,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        ...(principal ? { header: { type: 'image', image: { link: principal.imagen } } } : {}),
        body: { text: recortar(cuerpo, 1024) },
        action: { name: 'cta_url', parameters: { display_text: 'Hablar con asesora', url: r.whatsapp.url } },
      },
    });
  } else if (principal) {
    enviado = await enviar(env, phoneId, { ...base, type: 'image', image: { link: principal.imagen, caption: recortar(cuerpo, 1024) } });
  }
  if (!enviado) {
    const conEnlace = r.whatsapp ? `${cuerpo}\n\nHabla con una asesora: ${r.whatsapp.url}` : cuerpo;
    await enviar(env, phoneId, { ...base, type: 'text', text: { body: recortar(conEnlace, 4096), preview_url: false } });
  }
  estado.mensajes.push({ role: 'assistant', content: respuesta });

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
