/**
 * Historial de clientes en una hoja de Google.
 *
 * La hoja tiene un script (scripts/hoja-clientes.gs) publicado como aplicación
 * web; aquí solo se le envía cada cliente que dejó sus datos. Si una misma
 * conversación vuelve a enviar datos (por ejemplo, agrega la ciudad), el
 * script actualiza la fila de esa conversación en vez de duplicarla.
 *
 * Variables: HOJA_URL (URL de la aplicación web) y HOJA_SECRETO (la misma
 * clave que se pone en el script). Sin ellas, simplemente no se guarda nada.
 */
import { config } from './config.js';
export function hojaConfigurada() {
  return Boolean(config.HOJA_URL && config.HOJA_SECRETO);
}

/**
 * Un texto que empieza con = + - @ Google Sheets lo interpreta como fórmula:
 * un "nombre" como =IMPORTXML(...) se ejecutaría dentro de la hoja de Dekog.
 * Se antepone un apóstrofo para que quede como texto.
 */
export function comoTexto(valor) {
  const s = String(valor ?? '');
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export async function guardarCliente({ conversacion, cliente, interes, resumen, canal = 'Web' }) {
  if (!hojaConfigurada()) return false;
  const t = comoTexto;
  const cuerpo = JSON.stringify({
    secreto: config.HOJA_SECRETO,
    id: conversacion,
    fecha: new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
    nombre: t(cliente.nombre),
    telefono: cliente.telefono,
    ciudad: t(cliente.ciudad),
    interes: t(interes),
    resumen: t(resumen),
    canal,
  });
  // Google tarda varios segundos en "despertar" el script si llevaba rato sin uso
  // (la primera prueba en vivo falló así). Un segundo intento no duplica la fila:
  // el script actualiza por id de conversación.
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const r = await fetch(config.HOJA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
        signal: AbortSignal.timeout(10000),
      });
      const j = await r.json().catch(() => ({}));
      if (j.ok) return true;
      console.warn(`La hoja no guardó el cliente (intento ${intento}):`, j.error ?? `HTTP ${r.status}`);
      if (j.error === 'no autorizado') return false; // clave mal puesta: reintentar no sirve
    } catch (e) {
      console.warn(`No se pudo guardar el cliente en la hoja (intento ${intento}):`, e.message);
    }
  }
  return false;
}
