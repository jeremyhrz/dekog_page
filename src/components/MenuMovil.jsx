import React from 'react';
import { motion } from 'framer-motion';
import { Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import Foto from './efectos/Foto';
import { IconoWhatsapp } from './asistente/comun';
import { DEKOG, ENLACES } from '../data/sitio';
import { CORTINA, cx, escalonar, transicion, useMenosMovimiento, variantes } from '../lib/movimiento';
import { elegirWhatsapp } from '../utils/whatsapp';

const miniatura = {
  oculto: { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.25 },
  visible: { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, transition: transicion({ duration: 0.9 }) },
};

/**
 * Menú del teléfono a pantalla completa (fondo noche): las páginas en Bodoni grande, que suben escalonadas, cada una
 * con su miniatura; WhatsApp e Instagram abajo. Lo monta Navbar dentro de <AnimatePresence>.
 */
export default function MenuMovil({ ruta, alElegir }) {
  const menos = useMenosMovimiento();
  const telon = menos
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 } }
    : {
      initial: { clipPath: 'inset(0% 0% 100% 0%)' },
      animate: { clipPath: 'inset(0% 0% 0% 0%)' },
      exit: { clipPath: 'inset(0% 0% 100% 0%)', transition: { duration: 0.6, ease: CORTINA } },
      transition: { duration: 0.75, ease: CORTINA },
    };

  return (
    <motion.div
      id="menu-movil"
      role="dialog"
      aria-modal="true"
      aria-label="Menú"
      className="sobre-oscuro fixed left-0 top-0 z-menu flex h-full w-full flex-col bg-noche text-hueso lg:hidden"
      {...telon}
    >
      <motion.nav
        aria-label="Páginas"
        data-lenis-prevent
        className="contenedor flex min-h-0 flex-1 flex-col overflow-y-auto pb-7 pt-[5.5rem]"
        initial="oculto"
        animate="visible"
        variants={escalonar(0.055, menos ? 0 : 0.2)}
      >
        <ul className="border-t border-hueso/10">
          {ENLACES.map((enlace, i) => {
            const actual = enlace.ruta === '/' ? ruta === '/' : ruta.indexOf(enlace.ruta) === 0;
            return (
              <motion.li key={enlace.ruta} variants={escalonar(0.05)} className="border-b border-hueso/10">
                <Link
                  to={enlace.ruta}
                  onClick={alElegir(enlace.ruta)}
                  aria-current={actual ? 'page' : undefined}
                  className="flex items-center py-3"
                >
                  <motion.span variants={variantes.fundido} className="etiqueta w-10 shrink-0 text-madera">
                    {String(i + 1).padStart(2, '0')}
                  </motion.span>
                  <span className="mascara min-w-0 flex-1">
                    <motion.span
                      variants={variantes.mascara}
                      className={cx(
                        'block whitespace-nowrap font-display text-[clamp(2rem,9.2vw,3.6rem)] leading-[1.05] tracking-[-0.01em]',
                        actual && 'italic text-madera-claro',
                      )}
                    >
                      {enlace.nombre}
                    </motion.span>
                  </span>
                  <motion.span variants={miniatura} className="relative ml-4 block h-[50px] w-10 shrink-0 overflow-hidden rounded-[5px]">
                    <Foto src={enlace.foto} rellenar sizes="40px" />
                  </motion.span>
                </Link>
              </motion.li>
            );
          })}
        </ul>

        <motion.p
          variants={variantes.aparecer}
          className="mt-auto pt-10 font-display text-[1.25rem] italic leading-snug text-hueso/75 [@media(max-height:700px)]:hidden"
        >
          {DEKOG.lema}
        </motion.p>

        <motion.div variants={variantes.aparecer} className="mt-6 grid grid-cols-2 gap-3 [@media(max-height:700px)]:mt-auto [@media(max-height:700px)]:pt-8">
          <button type="button" onClick={() => elegirWhatsapp()} className="boton boton-claro px-3 tracking-[0.12em]">
            <IconoWhatsapp size={17} />
            <span>WhatsApp</span>
          </button>
          <a href={DEKOG.instagram.home} target="_blank" rel="noopener noreferrer" className="boton boton-linea px-3 tracking-[0.12em]">
            <Instagram className="h-[1.2em] w-[1.2em] shrink-0" strokeWidth={1.5} />
            <span>Instagram</span>
          </a>
        </motion.div>
        <motion.p variants={variantes.aparecer} className="etiqueta mt-5 flex flex-wrap justify-between text-hueso/60">
          <span className="mr-4">{DEKOG.showroom}</span>
          <span>{DEKOG.alcance}</span>
        </motion.p>
      </motion.nav>
    </motion.div>
  );
}
