/**
 * Tasa oficial del BCV para mostrar los precios REF en bolívares.
 *
 * Dekog cobra a la tasa oficial del EURO (monedaTasa en negocio.js). Fuente:
 * ve.dolarapi.com, que replica la tasa publicada en bcv.org.ve. Se guarda en
 * memoria una hora; si la fuente falla se usa la última tasa leída, y si no
 * hay ninguna el chat sigue funcionando y solo muestra los precios en REF.
 */
import { monedaTasa } from './negocio.js';

const FUENTES = {
  EUR: 'https://ve.dolarapi.com/v1/euros/oficial',
  USD: 'https://ve.dolarapi.com/v1/dolares/oficial',
};
const VIGENCIA_MS = 60 * 60 * 1000;

let cache = null;

// Fecha de Caracas (UTC−4 fijo: Venezuela no cambia la hora desde 2016) sin Intl: el primer formato con zona
// horaria de una instancia cuesta varios ms de CPU, y el plan gratis da 10 ms por pedido.
function fechaCaracas(iso) {
  const d = new Date(Date.parse(iso) - 4 * 60 * 60 * 1000);
  if (Number.isNaN(d.getTime())) return '';
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

export async function tasaBcv() {
  if (cache && Date.now() - cache.leida < VIGENCIA_MS) return cache.tasa;
  try {
    // Corre en paralelo con la IA (que tarda más), así que esperar hasta 8 s no demora la respuesta.
    const r = await fetch(FUENTES[monedaTasa], { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const valor = Number(j.promedio);
    if (!(valor > 0)) throw new Error('tasa vacía');
    if (j.moneda !== monedaTasa) throw new Error(`la fuente devolvió ${j.moneda}, se esperaba ${monedaTasa}`);
    const tasa = {
      valor,
      moneda: monedaTasa,
      etiqueta: monedaTasa === 'EUR' ? 'tasa BCV euro' : 'tasa BCV dólar',
      fecha: fechaCaracas(j.fechaActualizacion),
    };
    cache = { tasa, leida: Date.now() };
    return tasa;
  } catch (e) {
    console.warn('No se pudo leer la tasa BCV:', e.message);
    return cache?.tasa ?? null;
  }
}
