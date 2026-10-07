/**
 * Piezas comunes de los webhooks de Meta (WhatsApp e Instagram).
 */

/** GET de verificación: Meta manda hub.challenge y hay que devolverlo si el token coincide. */
export function verificarSuscripcion(url, tokenEsperado) {
  const modo = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const reto = url.searchParams.get('hub.challenge');
  if (modo === 'subscribe' && tokenEsperado && token === tokenEsperado && reto) {
    return new Response(reto, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

function igualesSinFiltrarTiempo(a, b) {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

/**
 * Comprueba X-Hub-Signature-256: HMAC-SHA256 del cuerpo CRUDO con el App Secret.
 * Acepta varios secretos (Instagram Login usa un secreto propio, distinto del de la app).
 */
export async function firmaValida(cuerpoCrudo, cabecera, ...secretos) {
  if (!cabecera?.startsWith('sha256=')) return false;
  const recibida = cabecera.slice('sha256='.length).toLowerCase();
  for (const secreto of secretos.filter(Boolean)) {
    const clave = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, cuerpoCrudo));
    const hex = [...firma].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (igualesSinFiltrarTiempo(hex, recibida)) return true;
  }
  return false;
}

/**
 * "• Toronto · Queen 1,60x1,90 M · box nube: REF 670 = Bs 653.058,87 (tasa BCV euro 29/09/2026)"
 * "• Mesa Kenia · 2 × REF 170: REF 340 = Bs …"
 */
// 1.290 como es-VE, sin Intl (como formatoBs en catalogo.js). Los REF del catálogo son enteros.
const miles = (n) => (Number.isInteger(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : n.toLocaleString('es-VE'));

export function lineaPrecio(p, tasa) {
  const partes = [p.nombre, p.talla, p.box, p.tela, p.puff];
  if (p.cantidad > 1) partes.push(`${p.cantidad} × REF ${miles(p.unitario)}`);
  const cual = partes.filter(Boolean).join(' · ');
  const ref = `${p.desde ? 'desde ' : ''}REF ${miles(p.ref)}`;
  const bs = p.bs ? ` = Bs ${p.bs} (${tasa?.etiqueta ?? 'tasa BCV'} ${tasa?.fecha ?? ''})` : '';
  return `• ${cual}: ${ref}${bs}`;
}

/**
 * En el primer mensaje de la conversación el cliente tiene que saber que le responde un
 * asistente virtual. La IA lo hace casi siempre; esto lo garantiza cuando se le olvida.
 */
export function presentarse(texto, esPrimero) {
  if (!esPrimero || /asistente/i.test(texto)) return texto;
  const resto = texto.replace(/^¡?\s*hola\s*!?[,.]?\s*/i, '');
  return `¡Hola! Soy el asistente virtual de Dekog 👋 ${resto.charAt(0).toUpperCase()}${resto.slice(1)}`;
}

export function recortar(texto, maximo) {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
}

/** Primer número de teléfono (7 a 15 dígitos) escrito en el texto, o ''. */
export function extraerTelefono(texto) {
  for (const candidato of texto.match(/\+?\d[\d\s().\-]{5,}\d/g) ?? []) {
    const digitos = candidato.replace(/\D/g, '');
    if (digitos.length >= 7 && digitos.length <= 15) return candidato.trim().startsWith('+') ? `+${digitos}` : digitos;
  }
  return '';
}

// Precalentado al cargar el Worker (ver chat.js): lo que usa el primer mensaje de WhatsApp o Instagram.
try {
  lineaPrecio({ nombre: 'Toronto', talla: 'Queen', box: 'box nube', cantidad: 2, unitario: 670, ref: 1340, bs: '1.318.908,40' },
    { etiqueta: 'tasa BCV euro', fecha: '07/10/2026' });
  recortar(presentarse('Hola, te ayudo con modelos y precios.', true), 1024);
  extraerTelefono('mi número es 0414-555-1234');
} catch { /* solo es una optimización */ }
