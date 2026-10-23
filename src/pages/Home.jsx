import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Intro from '../sections/inicio/Intro';
import Portada from '../sections/inicio/Portada';
import CintaDekog from '../sections/inicio/CintaDekog';
import Lineas from '../sections/inicio/Lineas';
import PromoStock from '../sections/inicio/PromoStock';
import Catalogo from '../sections/inicio/Catalogo';
import ProyectosCarril from '../sections/inicio/ProyectosCarril';
import Proceso from '../sections/inicio/Proceso';
import Visitanos from '../sections/inicio/Visitanos';
import { HAY_INTRO } from '../lib/intro';
import { irA } from '../lib/scroll';

/**
 * Home — Portada (/), renovada en 2026 con el estilo editorial (scroll suave, revelados, escenario fijo):
 *   Intro (1.ª visita) → Portada → Cinta → Un solo equipo (las 4 líneas) → Promo en stock → Catálogo → Proyectos →
 *   Cómo trabajamos → Visítanos.
 *
 * /?categoria=camas#catalogo abre el catálogo ya filtrado: lo usan el botón «Ver las 40 camas» del asistente y los
 * enlaces que manda por WhatsApp e Instagram (asistente/src/lib/vitrina.js). /?categoria=todos#catalogo, el catálogo
 * entero: el botón de la página «No encontramos esta página». /#catalogo: la búsqueda desde otra página.
 */
const CATEGORIA_DE_URL = {
  todos: 'Todos',
  camas: 'Camas',
  'camas-clasicas': 'Camas Clásicas',
  'camas-kids': 'Camas Kids',
  'camas-alta-gama': 'Camas Alta Gama',
  sofas: 'Sofás',
  mesas: 'Mesas',
};

export default function Home(props) {
  const { catalogRef, handleCategoryClick } = props;
  // ?categoria=… : filtra y baja al catálogo. Solo al llegar por un enlace (cambia search o key), no en cada render:
  // handleCategoryClick es una función nueva en cada render de App y lo re-filtraría sin parar.
  const { search, hash, key } = useLocation();
  useEffect(() => {
    // Solo las claves propias: con ?categoria=valueOf (o toString…) el objeto devolvería una función heredada y la
    // página quedaba en blanco. Con hasOwnProperty.call y no Object.hasOwn, que no existe antes de iOS 15.4
    // (scripts/compatibilidad.mjs lo vigila).
    const valor = new URLSearchParams(search).get('categoria');
    const cat = valor && Object.prototype.hasOwnProperty.call(CATEGORIA_DE_URL, valor) ? CATEGORIA_DE_URL[valor] : null;
    if (cat) handleCategoryClick(cat);
    if (!cat && hash !== '#catalogo') return undefined;
    // Después de que el catálogo se pinte (y de las fuentes: si no, el destino se corre).
    const espera = setTimeout(() => catalogRef.current && irA(catalogRef.current, { offset: -24 }), 250);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, key]);

  return (
    <>
      {HAY_INTRO && <Intro />}
      <Portada />
      <CintaDekog />
      <Lineas />
      <PromoStock />
      <Catalogo {...props} />
      <ProyectosCarril />
      <Proceso />
      <Visitanos />
    </>
  );
}
