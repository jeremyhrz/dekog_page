/**
 * Conexión con el proveedor de IA. Se elige solo según la clave configurada:
 *   ANTHROPIC_API_KEY → Claude    (modelo: ASISTENTE_MODELO_CLAUDE, por defecto claude-opus-5)
 *   GEMINI_API_KEY    → Gemini    (modelo: ASISTENTE_MODELO_GEMINI, por defecto gemini-3.5-flash-lite)
 *   ASISTENTE_PROVEEDOR=prueba → respuestas fijas, solo para probar la pantalla sin gastar.
 * Devuelve siempre { respuesta, productos, derivar } ya parseado.
 */
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM, ESQUEMA } from './prompt.js';

export function proveedorActivo() {
  if (process.env.ASISTENTE_PROVEEDOR === 'prueba') return 'prueba';
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return null;
}

export class RechazoDelModelo extends Error {}

let anthropic;
async function conClaude(mensajes) {
  anthropic ??= new Anthropic();
  const modelo = process.env.ASISTENTE_MODELO_CLAUDE || 'claude-opus-5';
  const esHaiku = modelo.startsWith('claude-haiku');
  const pedido = {
    model: modelo,
    max_tokens: 4000,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
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

let gemini;
async function conGemini(mensajes) {
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const r = await gemini.models.generateContent({
    model: process.env.ASISTENTE_MODELO_GEMINI || 'gemini-3.5-flash-lite',
    contents: mensajes.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: 'application/json',
      responseJsonSchema: sinAdditionalProperties(ESQUEMA),
    },
  });
  return JSON.parse(r.text);
}

/** Respuestas fijas para revisar la pantalla sin clave ni costo. */
function dePrueba(mensajes) {
  const ultimo = mensajes.at(-1).content.toLowerCase();
  if (ultimo.includes('proyecto') || ultimo.includes('remodel')) {
    return {
      respuesta: '¡Qué bueno! Para orientarte mejor: ¿qué espacio quieres transformar y en qué ciudad está?',
      productos: [],
      derivar: { necesario: false, area: 'arquitectura', resumen: '' },
    };
  }
  if (ultimo.includes('comprar') || ultimo.includes('envío') || ultimo.includes('envio')) {
    return {
      respuesta: '¡Perfecto! Una asesora te confirma el envío y las formas de pago. Toca el botón de WhatsApp y te atiende con tu pedido ya escrito.',
      productos: [{ id: 48, talla: 'Queen 1,60x1,90 M' }],
      derivar: { necesario: true, area: 'home', resumen: 'Cama Toronto · Queen 1,60x1,90 M · box liso · REF 550 · pregunta por envío' },
    };
  }
  return {
    respuesta: 'La Toronto Queen (1,60 x 1,90 m) está en REF 550, con el box liso incluido. Abajo te muestro el precio en bolívares a la tasa BCV de hoy.',
    productos: [{ id: 48, talla: 'Queen 1,60x1,90 M' }],
    derivar: { necesario: false, area: 'home', resumen: '' },
  };
}

export async function responder(mensajes) {
  const p = proveedorActivo();
  if (p === 'claude') return conClaude(mensajes);
  if (p === 'gemini') return conGemini(mensajes);
  if (p === 'prueba') return dePrueba(mensajes);
  throw new Error('No hay clave de IA configurada (ANTHROPIC_API_KEY o GEMINI_API_KEY).');
}
