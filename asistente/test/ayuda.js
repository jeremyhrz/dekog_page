/**
 * Ayudas de las pruebas del asistente (node --test asistente/test/): KV en memoria, un Meta falso dentro
 * del proceso (no sale nada a internet) y avisos firmados como los de Meta. IA: proveedor «prueba».
 */
import { createHmac } from 'node:crypto';
import { configurar } from '../src/lib/config.js';

export const SECRETO_WA = 'secreto-wa';
export const SECRETO_IG = 'secreto-ig';

configurar({
  ASISTENTE_PROVEEDOR: 'prueba',
  WA_TOKEN: 'token-wa', WA_APP_SECRET: SECRETO_WA, WA_VERIFY_TOKEN: 'verifica-wa', WA_API_BASE: 'https://meta.falso',
  IG_TOKEN: 'token-ig', IG_APP_SECRET: SECRETO_IG, IG_VERIFY_TOKEN: 'verifica-ig', IG_API_BASE: 'https://ig.falso',
});

export function kvEnMemoria() {
  const datos = new Map();
  return {
    datos,
    async get(clave, tipo) {
      const v = datos.get(clave);
      if (v === undefined) return null;
      return tipo === 'json' ? JSON.parse(v) : v;
    },
    async put(clave, valor) { datos.set(clave, String(valor)); },
  };
}

/** Meta falso: guarda lo que se le envía y responde 200, salvo lo que `rechazar(cuerpo)` diga. */
export function metaFalso({ rechazar = () => false } = {}) {
  const enviados = [];
  const fetchFalso = async (url, opciones = {}) => {
    const u = String(url);
    if (u.includes('dolarapi.com')) {
      return new Response(JSON.stringify({ promedio: 186.4321, moneda: 'EUR', fechaActualizacion: '2026-10-07T12:00:00-04:00' }));
    }
    const cuerpo = opciones.body ? JSON.parse(opciones.body) : null;
    if (cuerpo && rechazar(cuerpo)) return new Response(JSON.stringify({ error: { code: 131009, message: 'rechazado (prueba)' } }), { status: 400 });
    if (cuerpo) enviados.push({ url: u, cuerpo });
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.falso' }], recipient_id: 'x', message_id: 'm', username: 'cliente', name: 'Cliente' }));
  };
  return { enviados, fetchFalso };
}

export function firmar(objeto, secreto) {
  const crudo = JSON.stringify(objeto);
  return { crudo, firma: `sha256=${createHmac('sha256', secreto).update(crudo).digest('hex')}` };
}

let n = 0;
/** Aviso de WhatsApp: `mensaje` es el objeto de messages[] sin from/id/timestamp. */
export function avisoWa(mensaje, telefono = '584140000001') {
  n += 1;
  return { object: 'whatsapp_business_account', entry: [{ id: 'WABA', changes: [{ field: 'messages', value: {
    messaging_product: 'whatsapp', metadata: { display_phone_number: '15550001111', phone_number_id: 'PHONE123' },
    contacts: [{ profile: { name: 'Carla' }, wa_id: telefono }],
    messages: [{ from: telefono, id: `wamid.prueba.${n}`, timestamp: '1790700000', ...mensaje }],
  } }] }] };
}
export const textoWa = (body) => ({ type: 'text', text: { body } });
export const filaWa = (id, title) => ({ type: 'interactive', interactive: { type: 'list_reply', list_reply: { id, title, description: '' } } });

export function avisoIg(message, igsid = 'IGSID1') {
  n += 1;
  return { object: 'instagram', entry: [{ id: 'IGDEKOG', time: 1790700000, messaging: [{
    sender: { id: igsid }, recipient: { id: 'IGDEKOG' }, timestamp: 1790700000, message: { mid: `mid.prueba.${n}`, ...message },
  }] }] };
}

/** Llama al handler del webhook como lo haría el Worker y espera el trabajo en segundo plano (ctx.waitUntil). */
export async function entregar(handler, aviso, secreto, env) {
  const { crudo, firma } = firmar(aviso, secreto);
  const pendientes = [];
  const peticion = new Request('https://asistente.falso/webhook', { method: 'POST', body: crudo, headers: { 'X-Hub-Signature-256': firma } });
  const r = await handler(peticion, env, { waitUntil: (p) => pendientes.push(p) });
  await Promise.all(pendientes);
  return r.status;
}
