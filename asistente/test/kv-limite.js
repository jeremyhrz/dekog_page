/**
 * KV en memoria con el límite real de Cloudflare: 1 escritura por segundo en la MISMA clave. La segunda lanza un 429,
 * como KV («Writes made to the same key within 1 second will cause rate limiting (429) errors to be thrown»). Claves
 * distintas no se estorban. kvEnMemoria (ayuda.js) acepta escrituras sin límite y no podía ver un contador que las pierde.
 */
import { kvEnMemoria } from './ayuda.js';

export function kvConLimite() {
  const kv = kvEnMemoria();
  const put = kv.put.bind(kv);
  const ultima = new Map(); // clave → cuándo se escribió por última vez
  /** Las claves escritas con éxito, en orden (para contar cuántas veces se escribió una). */
  kv.escritas = [];
  kv.put = async (clave, valor, opciones) => {
    const ahora = Date.now();
    if (ultima.has(clave) && ahora - ultima.get(clave) < 1000) throw new Error('KV PUT failed: 429 Too Many Requests');
    ultima.set(clave, ahora);
    kv.escritas.push(clave);
    return put(clave, valor, opciones);
  };
  return kv;
}
