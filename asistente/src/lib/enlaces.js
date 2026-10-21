/**
 * Enlaces cortos a la asesora para Instagram (21-oct). El enlace de WhatsApp lleva el resumen del pedido ya escrito
 * (`wa.me/…?text=Hola%20Dekog%2C…`) y pasa de 200 caracteres: Instagram solo pone en azul el principio y el resto se ve
 * como letras grises sueltas (lo vio la dueña). Ahora va `https://www.dekog.net/a/k3P9xQ`: el destino completo se guarda
 * en KV (30 días) y GET /a/<código> redirige a él. dekog.net/a/* llega al Worker por un rewrite de vercel.json.
 *
 * ENLACE_CORTO_BASE (variable del Worker) es el dominio de los enlaces; sin ella, el del propio Worker (ASISTENTE_URL).
 * Si KV falla, va el wa.me de la asesora sin el texto: corto y siempre en azul.
 */
import { config } from './config.js';
import { lineas } from './negocio.js';

const TREINTA_DIAS = 30 * 24 * 60 * 60;
const LETRAS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/l/I: se leen sin dudas
const CODIGO = /^[A-Za-z0-9]{6}$/;

const base = () => (config.ENLACE_CORTO_BASE || config.ASISTENTE_URL || 'https://dekog-asistente.dekog-web.workers.dev').replace(/\/+$/, '');

function codigoAlAzar() {
  return [...crypto.getRandomValues(new Uint8Array(6))].map((b) => LETRAS[b % LETRAS.length]).join('');
}

/** El enlace corto que lleva a `url` (un wa.me de una asesora). Nunca lanza. */
export async function enlaceCorto(kv, url) {
  const sencillo = String(url).split('?')[0];
  if (!kv || !String(url).startsWith('https://wa.me/')) return sencillo;
  const codigo = codigoAlAzar();
  try {
    await kv.put(`enlace:${codigo}`, url, { expirationTtl: TREINTA_DIAS });
    return `${base()}/a/${codigo}`;
  } catch (e) {
    console.warn('No se pudo guardar el enlace corto:', e?.message);
    return sencillo;
  }
}

/**
 * GET /a/<código>: redirige al WhatsApp guardado. Un código vencido, desconocido o mal escrito lleva a la Línea 01 (sin
 * texto), nunca a una página de error; y solo se redirige a wa.me (el destino lo escribe el servidor, no el visitante).
 */
export async function irAlEnlace(codigo, kv) {
  const guardado = CODIGO.test(codigo) ? await kv?.get(`enlace:${codigo}`).catch(() => null) : null;
  const destino = typeof guardado === 'string' && guardado.startsWith('https://wa.me/') ? guardado : `https://wa.me/${lineas['01'].numero}`;
  return new Response(null, { status: 302, headers: { Location: destino, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
