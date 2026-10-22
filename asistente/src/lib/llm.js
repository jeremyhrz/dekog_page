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
import { sistemaPara, ESQUEMA } from './prompt.js';
import { hojasDeReferencia, olvidarHojas } from './imagen.js';

// Plan gratis de Cloudflare: 10 ms de CPU por petición (si se pasa de forma sostenida, Cloudflare corta con el
// error 1102, que llega al navegador SIN cabeceras CORS: «Se cortó la conexión»). Por eso Gemini va por su
// API REST con un solo fetch (la librería @google/genai pesaba ~875 KB y compilarla costaba ~5 ms en el
// primer pedido de cada instancia) y la librería de Claude solo se carga si se usa (en producción no hay clave).

export function proveedorActivo() {
  if (config.ASISTENTE_PROVEEDOR === 'prueba') return 'prueba';
  if (config.ANTHROPIC_API_KEY) return 'claude';
  if (config.GEMINI_API_KEY) return 'gemini';
  return null;
}

export class RechazoDelModelo extends Error {}

let anthropic;
async function conClaude(mensajes, sistema, hasta) {
  // Máximo 20 s por intento: un cliente no debe quedarse viendo "escribiendo…". Y nunca después de `hasta`: para
  // entonces pensar() ya respondió con el aviso de emergencia, así que el pedido se cancela.
  const opciones = Number.isFinite(hasta) ? { signal: AbortSignal.timeout(Math.max(1, hasta - Date.now())) } : undefined;
  if (!anthropic) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY, timeout: 20000, maxRetries: 1 });
  }
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
    ? await anthropic.messages.create(pedido, opciones)
    : await anthropic.beta.messages.create({
      ...pedido,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    }, opciones);
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
// gemini-3.5-flash es de otra familia que las lite: el 13-oct, con las lite saturadas (503), respondia.
const MODELOS_RESPALDO = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];
const ESCALON_MS = 8000;
// Los 503 de Google son picos de segundos (8 y 13-oct: los cuatro modelos a la vez). Si todos fallan con 5xx y queda
// al menos este tiempo, se les da una vuelta más, más seguida, en vez de mandar el mensaje de emergencia.
const MINIMO_SEGUNDA_VUELTA_MS = 5000;
const PAUSA_SEGUNDA_VUELTA_MS = 1000;
const SATURADO = new Set([500, 502, 503, 504]);
const TOPE_MS = 30000;

export function esReintentable(e) {
  if (e?.reintentable) return true;
  const texto = String(e?.message ?? '');
  const estado = Number(e?.status ?? e?.code ?? texto.match(/\b(404|429|500|502|503|504)\b/)?.[1]);
  return [404, 429, 500, 502, 503, 504].includes(estado) || /timeout|timed out|abort|unavailable|overloaded/i.test(`${texto} ${e?.name ?? ''}`);
}

/**
 * Pide lo mismo a varios modelos escalonados y devuelve la primera respuesta. `pedir(modelo, signal)` hace la
 * petición (y debe abandonarla si `signal` se cancela). Si todos fallan y los que dieron 5xx tienen tiempo, una
 * segunda vuelta con ellos. Falla si todos fallan o si se llega a `hasta`.
 */
export function escalonar(modelos, pedir, {
  hasta = Date.now() + TOPE_MS, escalonMs = ESCALON_MS, pausaMs = PAUSA_SEGUNDA_VUELTA_MS,
} = {}) {
  // Sin tiempo (por ejemplo, las hojas de una foto tardaron más que el plazo): ni se pregunta, sería un pedido perdido.
  if (Date.now() >= hasta) return Promise.reject(new Error('Gemini no respondió a tiempo'));
  const cancelar = new AbortController();
  return new Promise((resolver, rechazar) => {
    let lista = modelos;
    let segundaVuelta = false;
    const saturados = new Set();
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
      if (siguiente >= lista.length) {
        if (enCurso) return;
        if (!segundaVuelta && saturados.size && hasta - Date.now() > MINIMO_SEGUNDA_VUELTA_MS) {
          segundaVuelta = true;
          lista = modelos.filter((m) => saturados.has(m));
          siguiente = 0;
          console.warn(`Todos los modelos fallaron; segunda vuelta con ${lista.join(', ')}`);
          escalon = setTimeout(lanzar, pausaMs);
          return;
        }
        terminar(undefined, ultimoError);
        return;
      }
      const modelo = lista[siguiente++];
      enCurso++;
      // En la segunda vuelta queda poco tiempo: los modelos arrancan casi juntos.
      if (siguiente < lista.length) escalon = setTimeout(lanzar, segundaVuelta ? escalonMs / 4 : escalonMs);
      Promise.resolve()
        .then(() => pedir(modelo, cancelar.signal))
        .then((datos) => {
          if (!fin && (modelo !== modelos[0] || segundaVuelta)) {
            console.log(`Respondió ${segundaVuelta ? 'en la segunda vuelta' : 'el modelo de respaldo'} ${modelo}`);
          }
          terminar(datos);
        })
        .catch((e) => {
          enCurso--;
          if (fin) return;
          ultimoError = e;
          if (!segundaVuelta && SATURADO.has(Number(e?.status))) saturados.add(modelo);
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

// ── Gemini por su API REST ───────────────────────────────────────────────────
// El mismo pedido que armaba @google/genai 2.24 (comprobado byte a byte con llamadas reales): POST a
// v1beta/models/<modelo>:generateContent con la clave en la cabecera x-goog-api-key, sin reintentos y sin
// X-Server-Timeout (el tope lo pone `hasta`, cancelando del lado del Worker).
const RAIZ_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
const ESQUEMA_GEMINI = sinAdditionalProperties(ESQUEMA);

// La parte fija del cuerpo (el prompt de ~36 KB y el esquema) se serializa una vez por canal y se reutiliza.
const partesFijas = new Map();
function parteFija(canal) {
  if (!partesFijas.has(canal)) {
    partesFijas.set(canal, JSON.stringify({
      systemInstruction: { parts: [{ text: sistemaPara(canal) }], role: 'user' },
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: ESQUEMA_GEMINI },
    }).slice(1, -1)); // sin las llaves externas: va pegada dentro del cuerpo
  }
  return partesFijas.get(canal);
}
// Se preparan al cargar el Worker (eso tiene su propio presupuesto de 1 s), no en el primer pedido.
for (const canal of ['web', 'whatsapp', 'instagram']) parteFija(canal);

function cuerpoGemini(mensajes, canal, fotos) {
  const contents = mensajes.map((m) => ({ parts: [{ text: m.content }], role: m.role === 'assistant' ? 'model' : 'user' }));
  if (fotos) {
    // La foto del cliente va en su último mensaje, después de las hojas del catálogo con las que se compara.
    const dato = (f) => ({ inlineData: { mimeType: f.mime, data: f.datos } });
    const archivo = (h) => ({ fileData: { mimeType: h.mime, fileUri: h.uri } });
    const ultimo = contents.at(-1);
    ultimo.parts = [
      ...(fotos.hojas.length
        ? [{ text: 'Hojas de referencia de Dekog. Las del catálogo: debajo de cada foto están su número (el id del producto en el CATÁLOGO) y su nombre. La última es de los proyectos de arquitectura de Dekog: cada foto dice «Proyecto · nombre».' }, ...fotos.hojas.map(archivo)]
        : []),
      { text: 'Foto que mandó el cliente:' },
      dato(fotos.cliente),
      ...ultimo.parts,
    ];
  }
  return `{"contents":${JSON.stringify(contents)},${parteFija(canal)}}`;
}

/** Una petición a un modelo. Devuelve el JSON del asistente o lanza un Error con .status (HTTP) o .reintentable. */
async function pedirGemini(modelo, cuerpo, signal) {
  const r = await fetch(`${RAIZ_GEMINI}${encodeURIComponent(modelo)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': config.GEMINI_API_KEY },
    body: cuerpo,
    signal,
  });
  if (!r.ok) {
    let detalle = '';
    try { detalle = (await r.text()).slice(0, 300); } catch { /* sin cuerpo legible */ }
    const e = new Error(`Gemini respondió HTTP ${r.status}: ${detalle}`);
    e.name = 'ApiError';
    e.status = r.status;
    throw e;
  }
  const datos = await r.json();
  // Como el .text de la librería: las partes de texto del primer candidato que no son «pensamiento».
  const partes = datos?.candidates?.[0]?.content?.parts ?? [];
  const texto = partes.filter((p) => typeof p.text === 'string' && p.thought !== true).map((p) => p.text).join('');
  try {
    if (!texto) {
      const motivo = datos?.promptFeedback?.blockReason ?? datos?.candidates?.[0]?.finishReason ?? 'sin candidatos';
      throw new Error(`Gemini devolvió una respuesta vacía (${motivo})`);
    }
    return JSON.parse(texto);
  } catch (e) {
    e.reintentable = true; // vacía o JSON roto: otro modelo puede responder bien
    throw e;
  }
}

// Para las fotos, primero el que las reconoce bien Y rápido (13-oct, 27 fotos con las hojas de 10: 26/27 bien, en
// ~6 s). gemini-3.5-flash va de respaldo porque su cuota gratis se agota (429), y 3.5-flash-lite tardaba hasta 16 s en
// devolver 503: con él primero, una foto en WhatsApp se pasaba de los 24 s.
const MODELOS_FOTOS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

async function conGemini(mensajes, canal, hasta, imagen, kv) {
  const principal = config.ASISTENTE_MODELO_GEMINI || 'gemini-3.5-flash-lite';
  const orden = imagen ? [...MODELOS_FOTOS, principal, ...MODELOS_RESPALDO] : [principal, ...MODELOS_RESPALDO];
  const modelos = [...new Set(orden)];
  const fotos = imagen ? { cliente: imagen, hojas: await hojasDeReferencia(kv) } : null;
  const cuerpo = cuerpoGemini(mensajes, canal, fotos); // uno solo para todos los modelos del escalonado
  try {
    return await escalonar(modelos, (modelo, signal) => pedirGemini(modelo, cuerpo, signal), { hasta });
  } catch (e) {
    // Una hoja vencida o borrada en Gemini: se olvida (la próxima foto la sube de nuevo) y se responde sin hojas.
    if (!fotos?.hojas.length || !/file/i.test(e?.message ?? '') || ![400, 403, 404].includes(e?.status)) throw e;
    console.warn('Gemini no encontró las hojas de referencia; van de nuevo la próxima vez:', e.message);
    await olvidarHojas(kv);
    const sinHojas = cuerpoGemini(mensajes, canal, { ...fotos, hojas: [] });
    return escalonar(modelos, (modelo, signal) => pedirGemini(modelo, sinHojas, signal), { hasta });
  }
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
  if (ultimo.includes('manila')) {
    return {
      respuesta: 'La Manila Queen (1,60 x 1,90 m) está en REF 520, con el box liso incluido.',
      productos: [{ id: 31, talla: 'Queen 1,60x1,90 M' }],
      derivar: { necesario: false, area: 'home', resumen: '' },
      ofrecer_formulario: false,
    };
  }
  if (ultimo.includes('comprar') || ultimo.includes('envío') || ultimo.includes('envio')) {
    return {
      respuesta: '¡Perfecto! Una asesora te confirma el envío y las formas de pago. Escríbele a la que prefieras con los enlaces de abajo y te atiende con tu pedido ya escrito.',
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

/**
 * `hasta`: momento (Date.now()) en que se deja de esperar a la IA; sin él, TOPE_MS desde ahora.
 * `imagen`: la foto que mandó el cliente ({mime, datos}, lib/imagen.js), para reconocer el modelo (solo Gemini).
 * `kv`: dónde se guarda la referencia de las hojas del catálogo en Gemini.
 */
export async function responder(mensajes, canal = 'web', { hasta, imagen, kv } = {}) {
  const p = proveedorActivo();
  if (p === 'claude') return conClaude(mensajes, sistemaPara(canal), hasta);
  if (p === 'gemini') return conGemini(mensajes, canal, hasta, imagen, kv);
  if (p === 'prueba') return dePrueba(mensajes);
  throw new Error('No hay clave de IA configurada (ANTHROPIC_API_KEY o GEMINI_API_KEY).');
}
