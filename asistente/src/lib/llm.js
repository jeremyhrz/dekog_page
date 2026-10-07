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

// Gemini gratuito a veces tarda 10–25 s o se satura (429/503), y Google retira modelos (404). En vez de
// esperar a que un modelo falle para probar otro, se escalonan: arranca el principal y, si a los ESCALON_MS
// no contestó (o falló antes), arranca también el siguiente; gana la primera respuesta y las demás se
// cancelan. Cada modelo tiene su propio cupo gratuito. Una clave inválida (400/401/403) no se arregla
// cambiando de modelo.
// Sin httpOptions.timeout: la librería lo manda a Google como X-Server-Timeout y Google corta con 504
// respuestas que iban a llegar (pasó el 2026-10-07). El tope lo pone `hasta`, cancelando del lado del Worker.
const MODELOS_RESPALDO = ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];
const ESCALON_MS = 8000;
const TOPE_MS = 30000;

export function esReintentable(e) {
  if (e?.reintentable) return true;
  const texto = String(e?.message ?? '');
  const estado = Number(e?.status ?? e?.code ?? texto.match(/\b(404|429|500|502|503|504)\b/)?.[1]);
  return [404, 429, 500, 502, 503, 504].includes(estado) || /timeout|timed out|abort|unavailable|overloaded/i.test(`${texto} ${e?.name ?? ''}`);
}

/**
 * Pide lo mismo a varios modelos escalonados y devuelve la primera respuesta. `pedir(modelo, signal)` hace la
 * petición (y debe abandonarla si `signal` se cancela). Falla si todos fallan o si se llega a `hasta`.
 */
export function escalonar(modelos, pedir, { hasta = Date.now() + TOPE_MS, escalonMs = ESCALON_MS } = {}) {
  const cancelar = new AbortController();
  return new Promise((resolver, rechazar) => {
    let siguiente = 0;
    let enCurso = 0;
    let fin = false;
    let ultimoError;
    let escalon;
    const tope = setTimeout(
      () => terminar(undefined, ultimoError ?? new Error('Gemini no respondió a tiempo')),
      Math.max(0, hasta - Date.now()),
    );
    function terminar(datos, error) {
      if (fin) return;
      fin = true;
      clearTimeout(escalon);
      clearTimeout(tope);
      cancelar.abort(); // las que sigan en curso ya no hacen falta
      if (error) rechazar(error);
      else resolver(datos);
    }
    function lanzar() {
      clearTimeout(escalon);
      if (fin) return;
      if (siguiente >= modelos.length) {
        if (!enCurso) terminar(undefined, ultimoError);
        return;
      }
      const modelo = modelos[siguiente++];
      enCurso++;
      if (siguiente < modelos.length) escalon = setTimeout(lanzar, escalonMs);
      Promise.resolve()
        .then(() => pedir(modelo, cancelar.signal))
        .then((datos) => {
          if (!fin && modelo !== modelos[0]) console.log(`Respondió el modelo de respaldo ${modelo}`);
          terminar(datos);
        })
        .catch((e) => {
          enCurso--;
          if (fin) return;
          ultimoError = e;
          if (!esReintentable(e)) {
            terminar(undefined, e);
            return;
          }
          console.warn(`Gemini (${modelo}) no respondió:`, e?.status ?? e?.message, '— pruebo otro modelo');
          lanzar(); // falló antes del escalón: el siguiente arranca ya
        });
    }
    lanzar();
  });
}

let gemini;
function conGemini(mensajes, sistema, hasta) {
  gemini ??= new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  const principal = config.ASISTENTE_MODELO_GEMINI || 'gemini-3.5-flash-lite';
  const modelos = [principal, ...MODELOS_RESPALDO.filter((m) => m !== principal)];
  const contents = mensajes.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const responseJsonSchema = sinAdditionalProperties(ESQUEMA);
  return escalonar(modelos, async (modelo, signal) => {
    const r = await gemini.models.generateContent({
      model: modelo,
      contents,
      config: { systemInstruction: sistema, responseMimeType: 'application/json', responseJsonSchema, abortSignal: signal },
    });
    try {
      if (!r.text) throw new Error('Gemini devolvió una respuesta vacía');
      return JSON.parse(r.text);
    } catch (e) {
      e.reintentable = true; // vacía o JSON roto: otro modelo puede responder bien
      throw e;
    }
  }, { hasta });
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

/** `hasta`: momento (Date.now()) en que se deja de esperar a la IA; sin él, TOPE_MS desde ahora. */
export async function responder(mensajes, canal = 'web', { hasta } = {}) {
  const p = proveedorActivo();
  if (p === 'claude') return conClaude(mensajes, sistemaPara(canal));
  if (p === 'gemini') return conGemini(mensajes, sistemaPara(canal), hasta);
  if (p === 'prueba') return dePrueba(mensajes);
  throw new Error('No hay clave de IA configurada (ANTHROPIC_API_KEY o GEMINI_API_KEY).');
}
