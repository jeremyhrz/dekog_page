/**
 * Conexión con el proveedor de IA. Se elige solo según la clave configurada
 * (secretos del Worker de Cloudflare, ver config.js):
 *   ANTHROPIC_API_KEY → Claude    (modelo: ASISTENTE_MODELO_CLAUDE, por defecto claude-opus-5)
 *   GEMINI_API_KEY    → Gemini    (modelo: ASISTENTE_MODELO_GEMINI, por defecto gemini-3.5-flash-lite)
 *   ASISTENTE_PROVEEDOR=prueba → respuestas fijas, solo para probar la pantalla sin gastar.
 * Devuelve siempre { respuesta, productos, derivar, ofrecer_formulario } ya parseado.
 * `canal` (web, whatsapp o instagram) agrega las instrucciones propias de ese canal.
 */
import { config } from './config.js';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { sistemaPara, ESQUEMA } from './prompt.js';

export function proveedorActivo() {
  if (config.ASISTENTE_PROVEEDOR === 'prueba') return 'prueba';
  if (config.ANTHROPIC_API_KEY) return 'claude';
  if (config.GEMINI_API_KEY) return 'gemini';
  return null;
}

export class RechazoDelModelo extends Error {}

let anthropic;
async function conClaude(mensajes, sistema) {
  // Máximo 20 s por intento: un cliente no debe quedarse viendo "escribiendo…".
  anthropic ??= new Anthropic({ apiKey: config.ANTHROPIC_API_KEY, timeout: 20000, maxRetries: 1 });
  const modelo = config.ASISTENTE_MODELO_CLAUDE || 'claude-opus-5';
  const esHaiku = modelo.startsWith('claude-haiku');
  const pedido = {
    model: modelo,
    max_tokens: 4000,
    system: [{ type: 'text', text: sistema, cache_control: { type: 'ephemeral' } }],
    messages: mensajes,
    output_config: {
      // Haiku 4.5 no acepta "effort"; en los demás, "low" basta para un chat de ventas.
      ...(esHaiku ? {} : { effort: 'low' }),
      format: { type: 'json_schema', schema: ESQUEMA },
    },
  };
  const respuesta = esHaiku
    ? await anthropic.messages.create(pedido)
    : await anthropic.beta.messages.create({
      ...pedido,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  if (respuesta.stop_reason === 'refusal') throw new RechazoDelModelo();
  const texto = respuesta.content.find((b) => b.type === 'text')?.text;
  return JSON.parse(texto);
}

function sinAdditionalProperties(nodo) {
  if (Array.isArray(nodo)) return nodo.map(sinAdditionalProperties);
  if (nodo && typeof nodo === 'object') {
    const copia = {};
    for (const [k, v] of Object.entries(nodo)) {
      if (k !== 'additionalProperties') copia[k] = sinAdditionalProperties(v);
    }
    return copia;
  }
  return nodo;
}

// Si el modelo principal está saturado (429/500/503/504), tarda demasiado o Google lo retiró (404), se
// prueba con otros modelos gratuitos (cada uno tiene su propio cupo), sin pasar de PRESUPUESTO_MS en total.
// Visto el 2026-10-07: ráfagas de 504 y respuestas de 10-20 s; gemini-2.5-flash-lite ya no se ofrece a
// usuarios nuevos (404). Una clave inválida (400/401/403) no se arregla cambiando de modelo.
const MODELOS_RESPALDO = ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
const PRESUPUESTO_MS = 30000;

export function esReintentable(e) {
  const texto = String(e?.message ?? '');
  const estado = Number(e?.status ?? e?.code ?? texto.match(/\b(404|429|500|502|503|504)\b/)?.[1]);
  return [404, 429, 500, 502, 503, 504].includes(estado) || /timeout|timed out|abort|unavailable|overloaded/i.test(`${texto} ${e?.name ?? ''}`);
}

let gemini;
async function conGemini(mensajes, sistema) {
  // Hasta 15 s el principal y 12 s cada respaldo, sin pasar de PRESUPUESTO_MS: si todos fallan, el chat
  // responde con el paso a una asesora.
  gemini ??= new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  const principal = config.ASISTENTE_MODELO_GEMINI || 'gemini-3.5-flash-lite';
  const modelos = [principal, ...MODELOS_RESPALDO.filter((m) => m !== principal)];
  const inicio = Date.now();
  let ultimoError;
  for (const [i, modelo] of modelos.entries()) {
    const restante = PRESUPUESTO_MS - (Date.now() - inicio);
    if (i > 0 && restante < 4000) break; // no alcanza el tiempo para otro intento útil
    try {
      const r = await gemini.models.generateContent({
        model: modelo,
        contents: mensajes.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        config: {
          systemInstruction: sistema,
          responseMimeType: 'application/json',
          responseJsonSchema: sinAdditionalProperties(ESQUEMA),
          httpOptions: { timeout: Math.min(i === 0 ? 15000 : 12000, restante) },
        },
      });
      if (!r.text) throw new Error('Gemini devolvió una respuesta vacía');
      return JSON.parse(r.text);
    } catch (e) {
      ultimoError = e;
      if (!esReintentable(e)) throw e;
      console.warn(`Gemini (${modelo}) no respondió:`, e?.status ?? e?.message, modelo === modelos.at(-1) ? '— sin más respaldo' : '— pruebo el modelo de respaldo');
    }
  }
  throw ultimoError;
}

/** Respuestas fijas para revisar la pantalla sin clave ni costo. */
function dePrueba(mensajes) {
  const ultimo = mensajes.at(-1).content.toLowerCase();
  if (ultimo.includes('proyecto') || ultimo.includes('remodel')) {
    return {
      respuesta: '¡Qué bueno! Para orientarte mejor: ¿qué espacio quieres transformar y en qué ciudad está?',
      productos: [],
      derivar: { necesario: false, area: 'arquitectura', resumen: '' },
      ofrecer_formulario: false,
    };
  }
  if (ultimo.includes('comprar') || ultimo.includes('envío') || ultimo.includes('envio')) {
    return {
      respuesta: '¡Perfecto! Una asesora te confirma el envío y las formas de pago. Toca el botón de WhatsApp y te atiende con tu pedido ya escrito.',
      productos: [{ id: 48, talla: 'Queen 1,60x1,90 M' }],
      derivar: { necesario: true, area: 'home', resumen: 'Cama Toronto · Queen 1,60x1,90 M · box liso · REF 550 · pregunta por envío' },
      ofrecer_formulario: false,
    };
  }
  return {
    respuesta: 'La Toronto Queen (1,60 x 1,90 m) está en REF 550, con el box liso incluido. Abajo te muestro el precio en bolívares a la tasa BCV de hoy.',
    productos: [{ id: 48, talla: 'Queen 1,60x1,90 M' }],
    derivar: { necesario: false, area: 'home', resumen: '' },
    ofrecer_formulario: false,
  };
}

export async function responder(mensajes, canal = 'web') {
  const p = proveedorActivo();
  if (p === 'claude') return conClaude(mensajes, sistemaPara(canal));
  if (p === 'gemini') return conGemini(mensajes, sistemaPara(canal));
  if (p === 'prueba') return dePrueba(mensajes);
  throw new Error('No hay clave de IA configurada (ANTHROPIC_API_KEY o GEMINI_API_KEY).');
}
