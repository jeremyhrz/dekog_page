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

// Con el script ya despierto la hoja responde en 1 a 3 s: con menos tiempo que esto no vale la pena reintentar.
const MINIMO_REINTENTO_MS = 3000;

/**
 * Manda (o actualiza) la fila de una conversación. `hasta` (opcional): Date.now() en que hay que haber terminado.
 * WhatsApp e Instagram trabajan dentro de los 30 s que da Cloudflare después de responderle a Meta: cada intento dura
 * como mucho lo que quede, y el segundo solo va si alcanza (si no, la fila queda para el próximo mensaje del cliente).
 */
export async function guardarCliente({ conversacion, cliente, interes, resumen, canal = 'Web' }, { hasta = Infinity } = {}) {
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
    const queda = hasta - Date.now();
    if (queda <= 0 || (intento > 1 && queda < MINIMO_REINTENTO_MS)) {
      console.warn('Sin tiempo para guardar el cliente en la hoja: queda para el próximo mensaje');
      break;
    }
    try {
      const r = await fetch(config.HOJA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
        signal: AbortSignal.timeout(Math.min(10000, queda)),
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
