/**
 * Una petición del chat al Worker del asistente, con UN reintento silencioso.
 *
 * Por qué hace falta: en el navegador interno de Instagram/Facebook/WhatsApp (WKWebView en iPhone,
 * WebView en Android) y con datos móviles, una petición que espera 10–30 s se corta mucho más que en una
 * PC: la app pasa a segundo plano y iOS corta su red, el teléfono cambia de antena, se reusa una conexión
 * que el servidor ya cerró (iOS no reintenta un POST por su cuenta), o el Worker excede los 10 ms de CPU
 * del plan gratis y Cloudflare responde el error 1102 SIN cabeceras CORS. En todos esos casos fetch() solo
 * dice «Load failed» (Safari) o «Failed to fetch» (Chrome): no se puede saber cuál fue. Un reintento
 * resuelve la mayoría sin que el cliente vea nada.
 *
 * El reintento reenvía la MISMA conversación: el mensaje del cliente no se duplica en pantalla ni en la IA.
 */

export class ErrorDelAsistente extends Error {
  /**
   * tipo:
   *   'red'        no hubo respuesta legible: sin conexión, DNS, TLS, CORS (incluye los errores 1101/1102/1027
   *                de Cloudflare, que llegan sin CORS) o la app pasó a segundo plano
   *   'tiempo'     pasó el plazo sin respuesta
   *   'incompleta' llegó algo que no es el JSON del Worker (cuerpo cortado, página de error HTML…)
   *   'limite'     429 del Worker (límite por IP)
   *   'servidor'   5xx con mensaje del Worker
   *   'pedido'     4xx con mensaje del Worker
   */
  constructor(tipo, mensaje, { status = 0, reintentable = false } = {}) {
    super(mensaje);
    this.name = 'ErrorDelAsistente';
    this.tipo = tipo;
    this.status = status;
    this.reintentable = reintentable;
    this.intentos = 1;
  }
}

// AbortSignal.timeout no existe en iOS < 16 ni en el WebView de Android < 103: ahí lanzaba un TypeError al
// armar la petición y el chat decía «Se cortó la conexión» en CADA mensaje. AbortController sí existe.
function conPlazo(ms) {
  const control = new AbortController();
  const id = setTimeout(() => control.abort(), ms);
  return { signal: control.signal, vencio: () => control.signal.aborted, soltar: () => clearTimeout(id) };
}

const pausa = (ms) => new Promise((listo) => { setTimeout(listo, ms); });
const oculta = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

/** Espera a que la página vuelva a verse y `ms` más: Safari de iOS 18 hace fallar con «Load failed» un fetch
 * lanzado justo al volver a la app (developer.apple.com/forums/thread/771127). */
function cuandoEsteVisible(ms) {
  if (!oculta()) return pausa(ms);
  return new Promise((listo) => {
    const alCambiar = () => {
      if (oculta()) return;
      document.removeEventListener('visibilitychange', alCambiar);
      setTimeout(listo, ms);
    };
    document.addEventListener('visibilitychange', alCambiar);
  });
}

/** Un intento. Devuelve el JSON del Worker o lanza un ErrorDelAsistente ya clasificado. */
async function unIntento(url, cuerpo, { plazoMs, valida }) {
  const plazo = conPlazo(plazoMs);
  try {
    let r;
    try {
      r = await fetch(url, {
        method: 'POST',
        // Tipo «simple»: el navegador no manda antes la consulta OPTIONS (un viaje menos por la red móvil y
        // una ocasión menos de fallar). El Worker lee el cuerpo como JSON igual: request.json() no mira el tipo.
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        credentials: 'omit',
        body: JSON.stringify(cuerpo),
        signal: plazo.signal,
      });
    } catch {
      // fetch solo rechaza cuando no hubo respuesta legible (o se canceló): nunca por un error de nuestro código.
      if (plazo.vencio()) throw new ErrorDelAsistente('tiempo', 'El asistente tardó demasiado en responder.');
      throw new ErrorDelAsistente('red', 'Se cortó la conexión con el asistente.', { reintentable: true });
    }
    let datos = null;
    try {
      datos = JSON.parse(await r.text());
    } catch {
      if (plazo.vencio()) throw new ErrorDelAsistente('tiempo', 'El asistente tardó demasiado en responder.', { status: r.status });
      // Cuerpo cortado a mitad de camino, o una página de error (HTML) de un intermediario: queda en null.
    }
    if (r.ok && datos && valida(datos)) return datos;
    const mensaje = typeof datos?.error === 'string' ? datos.error.trim() : '';
    if (r.ok || !mensaje) {
      throw new ErrorDelAsistente('incompleta', 'La respuesta del asistente llegó incompleta.', {
        status: r.status, reintentable: r.ok || r.status >= 500,
      });
    }
    if (r.status === 429) throw new ErrorDelAsistente('limite', mensaje, { status: 429 });
    throw new ErrorDelAsistente(r.status >= 500 ? 'servidor' : 'pedido', mensaje, { status: r.status });
  } finally {
    plazo.soltar();
  }
}

/**
 * POST al Worker con un reintento silencioso. Reintenta solo si no hubo respuesta legible ('red' o
 * 'incompleta') y el primer intento falló pronto, o si la página pasó a segundo plano mientras esperaba
 * (iOS corta la red de la app suspendida): en ese caso espera a que el cliente vuelva y reintenta.
 * Un 429, un 4xx o un 5xx con mensaje del Worker no se reintentan: ahí el mensaje es para el cliente.
 */
export async function pedirAlAsistente(url, cuerpo, {
  plazoMs = 40000,
  reintentos = 1,
  esperaMs = 1200,
  reintentarSiFallaAntesDeMs = 25000,
  valida = () => true,
  alReintentar,
} = {}) {
  const inicio = Date.now();
  let fueOculta = false;
  const vigilar = () => { if (oculta()) fueOculta = true; };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', vigilar);
  try {
    for (let intento = 1; ; intento++) {
      fueOculta = oculta();
      try {
        return await unIntento(url, cuerpo, { plazoMs, valida });
      } catch (e) {
        const error = e instanceof ErrorDelAsistente
          ? e
          : new ErrorDelAsistente('red', 'Se cortó la conexión con el asistente.', { reintentable: true });
        error.intentos = intento;
        const porSegundoPlano = fueOculta && (error.tipo === 'red' || error.tipo === 'tiempo');
        const pronto = Date.now() - inicio < reintentarSiFallaAntesDeMs;
        if (intento > reintentos || !(porSegundoPlano || (error.reintentable && pronto))) throw error;
        alReintentar?.(error);
        await cuandoEsteVisible(esperaMs);
      }
    }
  } finally {
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', vigilar);
  }
}
