/**
 * Enlaces cortos a las asesoras (Instagram desde el 21-oct, WhatsApp desde el 22-oct). El enlace de WhatsApp lleva el
 * resumen del pedido ya escrito (`wa.me/…?text=Hola%20Dekog%2C…`) y pasa de 200 caracteres: Instagram solo pone en
 * azul el principio y el resto se ve como letras grises sueltas (lo vio la dueña). Ahora va
 * `https://www.dekog.net/a/k3P9xQ1`: 6 letras al azar y la línea de la asesora (1 o 2). Los destinos de un pase van en
 * UNA clave de KV, enlace:<6 letras> = {"1": url1, "2": url2} (una escritura por pase, no una por asesora: el plan
 * gratis da 1.000 al día, compartidas con la memoria), y GET /a/<código> redirige al de su línea. dekog.net/a/* llega
 * al Worker por un rewrite de vercel.json.
 *
 * Duran 180 días (antes 30): en WhatsApp el chat no se borra y los clientes vuelven a tocar enlaces viejos; vivir más
 * solo ocupa almacenamiento, no suma escrituras. Y si el código ya venció, su dígito igual lleva a la línea del rótulo.
 *
 * ENLACE_CORTO_BASE (variable del Worker) es el dominio de los enlaces; sin ella, el del propio Worker (ASISTENTE_URL).
 * Si KV falla, va el wa.me de la asesora sin el texto: corto y siempre en azul.
 */
import { config } from './config.js';
import { lineas } from './negocio.js';

const CIENTO_OCHENTA_DIAS = 180 * 24 * 60 * 60;
const LETRAS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/l/I: se leen sin dudas
// 6 letras y la línea, si el número es de una asesora. Los enlaces del 21-oct no llevan línea (solo las 6 letras).
const CODIGO = /^([A-Za-z0-9]{6})([12])?$/;
// La marca invisible de Instagram (U+2063) pegada al final del enlace, tal cual o como la escribe la URL.
const MARCA_PEGADA = /(?:\u2063|%E2%81%A3)+$/i;

const base = () => (config.ENLACE_CORTO_BASE || config.ASISTENTE_URL || 'https://dekog-asistente.dekog-web.workers.dev').replace(/\/+$/, '');

function codigoAlAzar() {
  return [...crypto.getRandomValues(new Uint8Array(6))].map((b) => LETRAS[b % LETRAS.length]).join('');
}

/** La línea de un wa.me ('1' o '2', según negocio.js → lineas); '' si el número no es de una asesora. */
function lineaDe(url) {
  const numero = /^https:\/\/wa\.me\/(\d+)/.exec(url)?.[1];
  const codigo = Object.keys(lineas).find((k) => lineas[k].numero === numero) ?? '';
  return /^0[12]$/.test(codigo) ? codigo[1] : '';
}

/**
 * Las asesoras ([{ etiqueta, visible, url }]) con su enlace corto, en el mismo orden. Una sola escritura de KV para
 * todas; nunca lanza.
 */
export async function enlacesCortos(kv, asesoras = []) {
  const letras = codigoAlAzar();
  const destinos = {};
  const cortos = asesoras.map((a) => {
    const url = String(a.url);
    const linea = lineaDe(url);
    // Solo a wa.me (el destino lo escribe el servidor, nunca el visitante) y uno por línea: el dígito es la clave.
    if (!url.startsWith('https://wa.me/') || linea in destinos) return null;
    destinos[linea] = url;
    return `${base()}/a/${letras}${linea}`;
  });
  const sencillos = asesoras.map((a) => ({ ...a, url: String(a.url).split('?')[0] }));
  if (!kv || !Object.keys(destinos).length) return sencillos;
  try {
    await kv.put(`enlace:${letras}`, JSON.stringify(destinos), { expirationTtl: CIENTO_OCHENTA_DIAS });
  } catch (e) {
    console.warn('No se pudo guardar el enlace corto:', e?.message);
    return sencillos;
  }
  return sencillos.map((a, i) => (cortos[i] ? { ...a, url: cortos[i] } : a));
}

/** El enlace corto que lleva a `url` (un wa.me de una asesora). Nunca lanza. */
export async function enlaceCorto(kv, url) {
  const [corto] = await enlacesCortos(kv, [{ url }]);
  return corto.url;
}

/** El destino que se guardó para esa línea: {"1": …, "2": …}, o el texto plano de un enlace del 21-oct (sin línea). */
function destinoGuardado(guardado, linea) {
  if (typeof guardado !== 'string' || !guardado.startsWith('{')) return guardado;
  try {
    return JSON.parse(guardado)?.[linea];
  } catch {
    return null;
  }
}

/**
 * GET /a/<código>: redirige al WhatsApp guardado. Un código vencido, desconocido o que KV no pudo leer lleva a la línea
 * de su dígito (la Línea 01 si no lo trae o no se entiende), sin texto: nunca a una página de error, ni a la Línea 1
 * desde un enlace que dice «Línea 2». Solo se redirige a wa.me (el destino lo escribe el servidor, no el visitante).
 */
export async function irAlEnlace(codigo, kv) {
  const partes = CODIGO.exec(String(codigo).replace(MARCA_PEGADA, ''));
  const linea = partes?.[2] ?? '';
  const guardado = partes ? await kv?.get(`enlace:${partes[1]}`).catch(() => null) : null;
  const elegido = destinoGuardado(guardado, linea);
  const destino = typeof elegido === 'string' && elegido.startsWith('https://wa.me/')
    ? elegido
    : `https://wa.me/${(lineas[`0${linea}`] ?? lineas['01']).numero}`;
  return new Response(null, { status: 302, headers: { Location: destino, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
