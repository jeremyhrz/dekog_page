/**
 * Qué mostrar en una ruta que la web no tiene (App.jsx → <Route path="*"> → pages/NoEncontrada.jsx). Llegan sobre todo
 * enlaces nuestros cortados o con algo pegado: el de la asesora, que Instagram mostró solo hasta «dekog.net/a» (21-oct;
 * /a y /a/ ya los manda vercel.json a /links.html), y el de ofertas con la marca invisible (U+2063) o un punto detrás.
 * `ruta` es location.pathname, que llega codificado: /ofertas%E2%81%A3.
 *
 *   'asesoras'      /a, /a/… o /a con algo pegado: los WhatsApp de las dos asesoras
 *   'ofertas'       /ofertas, sola o con algo pegado: va al catálogo. La promo terminó el 3-nov y su página se quitó,
 *                   pero los mensajes y las publicaciones viejas siguen trayendo el enlace
 *   'no-encontrada' todo lo demás
 */
export function rutaDesconocida(ruta) {
  if (/^\/a(?![a-z0-9])/i.test(ruta)) return 'asesoras';
  if (/^\/ofertas/i.test(ruta)) return 'ofertas';
  return 'no-encontrada';
}
