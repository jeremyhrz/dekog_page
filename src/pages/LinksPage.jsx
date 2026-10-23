import { useEffect } from 'react';

/**
 * /links en `npm run dev`. En producción vercel.json sirve public/links.html y esta página no llega a usarse: aquí se
 * va a ese mismo archivo, así hay una sola versión (antes había una copia en React que se cambiaba a mano).
 */
export default function LinksPage() {
  useEffect(() => {
    window.location.replace(`/links.html${window.location.search}${window.location.hash}`);
  }, []);
  return null;
}
