/**
 * Tasa oficial del BCV (bolívares por dólar) para mostrar precios en Bs.
 * Fuente: ve.dolarapi.com, que replica la tasa publicada en bcv.org.ve.
 * Se guarda en memoria unas horas; si la fuente falla, el chat sigue
 * funcionando y solo muestra los precios en REF.
 */
const FUENTE = 'https://ve.dolarapi.com/v1/dolares/oficial';
const VIGENCIA_MS = 3 * 60 * 60 * 1000;

let cache = null;

export async function tasaBcv() {
  if (cache && Date.now() - cache.leida < VIGENCIA_MS) return cache.tasa;
  try {
    const r = await fetch(FUENTE, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const valor = Number(j.promedio);
    if (!(valor > 0)) throw new Error('tasa vacía');
    const fecha = new Date(j.fechaActualizacion);
    const tasa = {
      valor,
      fecha: fecha.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Caracas' }),
    };
    cache = { tasa, leida: Date.now() };
    return tasa;
  } catch (e) {
    console.warn('No se pudo leer la tasa BCV:', e.message);
    return cache?.tasa ?? null;
  }
}
