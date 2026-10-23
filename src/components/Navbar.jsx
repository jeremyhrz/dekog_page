import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Instagram, Search, ShoppingBag, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogoDekog } from './marca/Logo';
import MenuMovil from './MenuMovil';
import { ENLACES, DEKOG } from '../data/sitio';
import { useIntroTerminada } from '../lib/intro';
import { EXPO, cx } from '../lib/movimiento';
import { irA, useBloquearScroll } from '../lib/scroll';

/**
 * Navegación fija (renovación de 2026): el logo arriba a la izquierda, las páginas al centro y búsqueda, Instagram y
 * carrito a la derecha. En la portada empieza transparente; al bajar, hueso translúcido con desenfoque. Se esconde al
 * bajar y vuelve al subir. Teléfono: menú a pantalla completa (MenuMovil).
 * Props (de App.jsx, vía Layout): cartCount, onCartOpen, onSearch, onCategoryClick.
 */
export default function Navbar({ cartCount = 0, onCartOpen = () => {}, onSearch = () => {} }) {
  const listo = useIntroTerminada();
  const location = useLocation();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [oculta, setOculta] = useState(false);
  const [solida, setSolida] = useState(false);
  const { scrollY } = useScroll();

  useBloquearScroll(abierto);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const previo = scrollY.getPrevious();
    const delta = y - (previo === undefined ? y : previo);
    setSolida(y > 24);
    if (y < 140) setOculta(false);
    else if (delta > 4) setOculta(true);
    else if (delta < -4) setOculta(false);
  });

  // Una pieza entró al carrito: la barra se deja ver para que se note el número (aunque se esté bajando).
  useEffect(() => {
    if (cartCount > 0) setOculta(false);
  }, [cartCount]);

  // Al cambiar de página: menú cerrado y barra a la vista.
  useEffect(() => {
    setAbierto(false);
    setOculta(false);
  }, [location.pathname]);

  // Escape cierra el menú.
  useEffect(() => {
    if (!abierto) return undefined;
    const tecla = (e) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abierto]);

  const enPortada = location.pathname === '/';
  const conFondo = (solida || !enPortada) && !abierto;

  const alPulsar = (ruta) => () => {
    if (location.pathname === ruta) irA(0);
    setAbierto(false);
  };

  return (
    <>
      <AnimatePresence>{abierto && <MenuMovil ruta={location.pathname} alElegir={alPulsar} />}</AnimatePresence>

      <motion.header
        className={cx('fixed left-0 right-0 top-0 transition-colors duration-500', abierto ? 'z-[59] text-hueso' : 'z-nav text-tinta')}
        initial={false}
        animate={{ y: oculta && !abierto && !buscando ? '-100%' : '0%' }}
        transition={{ duration: 0.6, ease: EXPO }}
      >
        <div
          aria-hidden="true"
          className={cx(
            'absolute left-0 top-0 h-full w-full border-b border-tinta/[0.06] bg-hueso/90 backdrop-blur-xl transition-opacity duration-500',
            conFondo ? 'opacity-100' : 'opacity-0',
          )}
        />
        <motion.div
          className="contenedor relative flex h-16 items-center justify-between lg:h-20"
          initial={{ opacity: 0, y: -18 }}
          animate={listo ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: EXPO, delay: 0.3 }}
        >
          <Link to="/" onClick={alPulsar('/')} aria-label="Dekog, ir al inicio" className="-ml-1 block rounded-md p-1">
            <LogoDekog tono={abierto ? 'blanco' : 'negro'} alt="" className="h-9 w-auto lg:h-11" />
          </Link>

          <nav aria-label="Páginas" className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
            <ul className="flex items-center">
              {ENLACES.map((enlace) => {
                const actual = enlace.ruta === '/' ? location.pathname === '/' : location.pathname.indexOf(enlace.ruta) === 0;
                return (
                  <li key={enlace.ruta} className="px-3 xl:px-[1.1rem]">
                    <Link
                      to={enlace.ruta}
                      onClick={alPulsar(enlace.ruta)}
                      aria-current={actual ? 'page' : undefined}
                      className={cx(
                        'etiqueta relative block whitespace-nowrap py-2 tracking-[0.18em] transition-colors duration-300 hover:text-madera-oscuro',
                        actual && 'text-madera-oscuro',
                      )}
                    >
                      {enlace.nombre}
                      {actual && (
                        <motion.span
                          layoutId="nav-activo"
                          className="absolute bottom-0 left-0 right-0 h-px bg-madera"
                          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="-mr-2 flex items-center">
            <button
              type="button"
              onClick={() => { setAbierto(false); setBuscando(true); }}
              aria-label="Buscar en el catálogo"
              className="grid h-11 w-11 place-items-center rounded-full transition-colors duration-300 hover:text-madera-oscuro"
            >
              <Search className="h-[20px] w-[20px]" strokeWidth={1.4} aria-hidden="true" />
            </button>
            <a
              href={DEKOG.instagram.home}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de Dekog Home"
              className="hidden h-11 w-11 place-items-center rounded-full transition-colors duration-300 hover:text-madera-oscuro md:grid"
            >
              <Instagram className="h-[20px] w-[20px]" strokeWidth={1.4} aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => { setAbierto(false); onCartOpen(); }}
              aria-label={cartCount ? `Abrir el carrito (${cartCount})` : 'Abrir el carrito (vacío)'}
              className="relative grid h-11 w-11 place-items-center rounded-full transition-colors duration-300 hover:text-madera-oscuro"
            >
              <ShoppingBag className="h-[21px] w-[21px]" strokeWidth={1.4} aria-hidden="true" />
              <motion.span
                aria-hidden="true"
                className="absolute right-[3px] top-[5px] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-madera px-1 text-[10px] font-semibold leading-none text-papel"
                initial={false}
                animate={{ scale: cartCount > 0 ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 22 }}
              >
                {cartCount > 0 ? cartCount : ''}
              </motion.span>
            </button>
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              aria-controls="menu-movil"
              aria-label={abierto ? 'Cerrar el menú' : 'Abrir el menú'}
              className="relative grid h-11 w-11 place-items-center lg:hidden"
            >
              <span
                className="absolute h-[1.5px] w-[22px] rounded-full bg-current transition-transform duration-500 ease-expo"
                style={{ transform: abierto ? 'rotate(45deg)' : 'translateY(-4px)' }}
              />
              <span
                className="absolute h-[1.5px] w-[22px] rounded-full bg-current transition-transform duration-500 ease-expo"
                style={{ transform: abierto ? 'rotate(-45deg)' : 'translateY(4px)' }}
              />
            </button>
          </div>
        </motion.div>
      </motion.header>

      <AnimatePresence>
        {buscando && (
          <Busqueda
            alCerrar={() => setBuscando(false)}
            alBuscar={(q) => {
              onSearch(q);
              setBuscando(false);
              // El catálogo solo está en la portada: desde otra página, se va allí con los resultados.
              if (location.pathname !== '/') navigate('/#catalogo');
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** Búsqueda a pantalla completa: escribe y Enter lleva al catálogo con los resultados (handleSearch de App.jsx). */
function Busqueda({ alCerrar, alBuscar }) {
  const [texto, setTexto] = useState('');
  const campo = useRef(null);
  useBloquearScroll(true);
  useEffect(() => {
    const t = window.setTimeout(() => campo.current && campo.current.focus(), 60);
    const tecla = (e) => e.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', tecla);
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', tecla); };
  }, [alCerrar]);
  const enviar = (e) => {
    e.preventDefault();
    if (texto.trim()) alBuscar(texto.trim());
  };
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar en el catálogo"
      data-lenis-prevent
      className="fixed left-0 top-0 z-[60] flex h-full w-full items-start justify-center bg-noche/95 pt-[22vh] text-hueso backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onClick={alCerrar}
    >
      <div className="contenedor max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <p className="etiqueta text-madera-claro">Catálogo</p>
        <form onSubmit={enviar} className="relative mt-4">
          <input
            ref={campo}
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="¿Qué buscas? Cama, sofá, mesa…"
            className="w-full border-b border-hueso/30 bg-transparent py-4 pr-12 font-display text-[clamp(2rem,6vw,3.6rem)] leading-tight text-hueso outline-none transition-colors placeholder:text-hueso/30 focus:border-hueso"
          />
          <button type="button" onClick={alCerrar} aria-label="Cerrar la búsqueda" className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-hueso/60 hover:text-hueso">
            <X className="h-7 w-7" strokeWidth={1.3} />
          </button>
        </form>
        <p className="etiqueta mt-5 text-hueso/40">Presiona Enter para buscar</p>
      </div>
    </motion.div>
  );
}
