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
import { cargarEstado, guardarEstado } from './memoria.js';
import { verificarSuscripcion, firmaValida, lineaPrecio, recortar } from './meta.js';

const graph = () => `${config.WA_API_BASE || 'https://graph.facebook.com'}/${config.WA_API_VERSION || 'v25.0'}`;

async function enviar(phoneId, carga) {
  const r = await fetch(`${graph()}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...carga }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    console.warn('WhatsApp rechazó el envío:', r.status, j?.error?.code, j?.error?.message);
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
  const usuario = mensaje.from ?? mensaje.from_user_id;
  const phoneId = valor.metadata?.phone_number_id;
  if (!usuario || !phoneId) return;
  const clave = `wa:${phoneId}:${usuario}`;
  const estado = await cargarEstado(env.CONVERSACIONES, clave);
  if (estado.procesados.includes(mensaje.id)) return; // aviso duplicado de Meta
  estado.procesados.push(mensaje.id);

  // "Leído" y "escribiendo…" mientras piensa (no consume cupo).
  await enviar(phoneId, { status: 'read', message_id: mensaje.id, typing_indicator: { type: 'text' } });
  const destino = mensaje.from ? { to: mensaje.from } : { recipient: mensaje.from_user_id };
  const base = { recipient_type: 'individual', ...destino };

  const texto = textoDe(mensaje).trim().slice(0, 800);
  if (!texto) {
    await enviar(phoneId, { ...base, type: 'text', text: { body: 'Por ahora solo puedo leer mensajes de texto 🙂 Escríbeme tu pregunta y te ayudo.' } });
    await guardarEstado(env.CONVERSACIONES, clave, estado);
    return;
  }

  estado.mensajes.push({ role: 'user', content: ocultarDatosPersonales(texto) });
  const r = await pensar(estado.mensajes, 'whatsapp');
  const [principal] = r.productos;
  const cuerpo = [r.respuesta, r.productos.map((p) => lineaPrecio(p, r.tasa)).join('\n')].filter(Boolean).join('\n\n');

  let enviado = false;
  if (r.whatsapp) {
    enviado = await enviar(phoneId, {
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
    enviado = await enviar(phoneId, { ...base, type: 'image', image: { link: principal.imagen, caption: recortar(cuerpo, 1024) } });
  }
  if (!enviado) {
    const conEnlace = r.whatsapp ? `${cuerpo}\n\nHabla con una asesora: ${r.whatsapp.url}` : cuerpo;
    await enviar(phoneId, { ...base, type: 'text', text: { body: recortar(conEnlace, 4096), preview_url: false } });
  }
  estado.mensajes.push({ role: 'assistant', content: r.respuesta });

  if (r.interes) estado.interes = r.interes;
  if (r.resumen) estado.resumen = r.resumen;
  // Mostró interés: queda en la hoja con su número de WhatsApp, para que la asesora le escriba.
  if (r.formulario && !estado.guardado && mensaje.from) {
    const nombre = valor.contacts?.find((c) => c.wa_id === mensaje.from)?.profile?.name ?? '';
    estado.guardado = await guardarCliente({
      conversacion: `wa-${mensaje.from}`,
      cliente: { nombre, telefono: `+${mensaje.from}`, ciudad: '' },
      interes: estado.interes,
      resumen: estado.resumen,
      canal: 'WhatsApp',
    });
  }
  await guardarEstado(env.CONVERSACIONES, clave, estado);
}
