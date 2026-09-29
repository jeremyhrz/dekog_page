/**
 * Configuración del asistente: claves y ajustes que en Cloudflare llegan como
 * variables y secretos del Worker (env). El Worker llama a configurar(env) en
 * cada petición; el resto del código lee `config`.
 */
export const config = {};

export function configurar(env = {}) {
  for (const [clave, valor] of Object.entries(env)) {
    if (typeof valor === 'string') config[clave] = valor;
  }
}
