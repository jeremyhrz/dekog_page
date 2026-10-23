import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { ArrowDownUp, ChevronDown } from 'lucide-react';
import ProjectModal from './ProjectModal';
import TarjetaObra from '../sections/proyectos/TarjetaObra';
import { FILTROS, MENSAJES, ORDENES, irAObras, maquetar } from '../sections/proyectos/datos';
import { proyectosData } from '../data/proyectosData';
import { cx } from '../lib/movimiento';
import { elegirWhatsapp } from '../utils/whatsapp';
// Los estilos del modal de proyectos (.project-modal-*) y las dos clases de esta sección (.pry-*).
import './ProjectsSection.css';

/**
 * Las obras de /proyectos (#proyectos): barra fija con el filtro (la píldora activa se desliza) y el orden, y una
 * retícula de revista que alterna tarjetas anchas y altas. Cada obra abre su galería (ProjectModal, el mismo de la
 * portada) o pide un presupuesto parecido por WhatsApp (el selector de línea).
 */
export default function ProjectsSection() {
  const [filtro, setFiltro] = useState('TODOS');
  const [orden, setOrden] = useState('destacados');
  const [elegido, setElegido] = useState(null);
  const seccion = useRef(null);
  const navVisible = useNavegacionVisible();

  const obras = useMemo(() => {
    const lista = filtro === 'TODOS' ? proyectosData : proyectosData.filter((p) => p.categoria === filtro);
    return orden === 'az' ? lista.slice().sort((a, b) => a.titulo.localeCompare(b.titulo, 'es')) : lista;
  }, [filtro, orden]);
  const piezas = useMemo(() => maquetar(obras.length), [obras.length]);

  // Si se cambia con la barra ya pegada arriba, la retícula nueva se ve desde el principio.
  const alPrincipio = () => {
    const nodo = seccion.current;
    if (nodo && nodo.getBoundingClientRect().top < -1) irAObras({ subiendo: true });
  };
  const elegirFiltro = (valor) => {
    if (valor === filtro) return;
    setFiltro(valor);
    alPrincipio();
  };
  const elegirOrden = (valor) => {
    setOrden(valor);
    alPrincipio();
  };

  const total = obras.length;
  const cuenta = `${String(total).padStart(2, '0')} ${total === 1 ? 'obra' : 'obras'}`;
  const ordenActual = ORDENES.find((o) => o.valor === orden) || ORDENES[0];

  return (
    <section id="proyectos" ref={seccion} aria-labelledby="proyectos-titulo" className="relative bg-hueso pb-[var(--aire)]">
      <h2 id="proyectos-titulo" className="sr-only">Obras de Dekog</h2>

      {/* Barra fija: baja con la navegación cuando esta se deja ver (como la del catálogo de la portada). */}
      <div
        className="sticky z-30 border-y border-tinta/[0.07] bg-hueso/90 backdrop-blur-md transition-[top] duration-500 ease-expo"
        style={{ top: navVisible ? 'var(--alto-nav, 64px)' : '0px' }}
      >
        <div className="contenedor flex items-center py-2.5 lg:py-3">
          <div role="group" aria-label="Filtrar por tipo de obra" className="pry-sin-barra flex min-w-0 items-center overflow-x-auto [scrollbar-width:none]">
            {FILTROS.map((f) => {
              const activo = filtro === f.valor;
              return (
                <button
                  key={f.valor}
                  type="button"
                  onClick={() => elegirFiltro(f.valor)}
                  aria-pressed={activo}
                  className={cx(
                    // En el teléfono, un poco menos de aire y de espaciado entre letras: caben los tres y el orden.
                    'etiqueta relative mr-0.5 shrink-0 rounded-full px-2.5 py-2.5 tracking-[0.16em] transition-colors duration-300 last:mr-0 min-[390px]:mr-1 min-[390px]:px-3 sm:mr-2 sm:px-5 sm:tracking-etiqueta',
                    activo ? 'text-papel' : 'text-grafito hover:text-tinta',
                  )}
                >
                  {activo && (
                    <motion.span
                      layoutId="proyectos-pildora"
                      className="absolute left-0 top-0 -z-10 h-full w-full rounded-full bg-tinta"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="relative">{f.texto}</span>
                </button>
              );
            })}
          </div>

          <p className="etiqueta ml-auto hidden shrink-0 pl-4 tabular-nums text-grafito/60 md:block" aria-live="polite">{cuenta}</p>
          <span aria-hidden="true" className="mx-4 hidden h-4 w-px shrink-0 bg-tinta/15 md:block lg:mx-5" />

          {/* El <select> de verdad va encima, transparente: en el teléfono abre la lista nativa del sistema. overflow-hidden:
              Safari cuenta el texto de la opción (más ancho que los 44 px) y la página se corría 13 px de lado. */}
          <label className="relative ml-auto flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full text-tinta transition-colors duration-300 hover:text-madera-oscuro md:ml-0 md:w-auto md:justify-start md:px-1 [&:has(select:focus-visible)]:outline [&:has(select:focus-visible)]:outline-2 [&:has(select:focus-visible)]:outline-offset-2 [&:has(select:focus-visible)]:outline-madera-oscuro">
            <ArrowDownUp className="h-[18px] w-[18px] shrink-0 lg:hidden" strokeWidth={1.5} aria-hidden="true" />
            <span className="etiqueta hidden text-grafito/60 lg:inline">Ordenar</span>
            <span className="etiqueta ml-2 hidden md:inline">{ordenActual.texto}</span>
            <ChevronDown className="ml-1.5 hidden h-3.5 w-3.5 md:block" strokeWidth={1.6} aria-hidden="true" />
            <select
              value={orden}
              onChange={(e) => elegirOrden(e.target.value)}
              aria-label="Ordenar las obras"
              className="absolute left-0 top-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0"
            >
              {ORDENES.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="contenedor mt-10 lg:mt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${filtro}-${orden}`}
            className="grid grid-cols-1 gap-y-14 md:grid-cols-2 md:gap-x-6 md:gap-y-16 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {obras.map((obra, k) => {
              const pieza = piezas[k];
              // Tableta (2 columnas): la primera a todo lo ancho; si después quedan impares, la última también.
              const completaMd = k === 0 || (k === total - 1 && (total - 1) % 2 === 1);
              const derechaMd = !completaMd && (k - 1) % 2 === 1;
              return (
                <TarjetaObra
                  key={obra.id}
                  obra={obra}
                  forma={pieza.forma}
                  clases={cx(
                    completaMd ? 'md:col-span-2' : 'md:col-span-1',
                    derechaMd && 'md:mt-16',
                    pieza.lg,
                    pieza.desfase ? 'lg:mt-28' : 'lg:mt-0',
                  )}
                  alto={cx(
                    pieza.forma === 'alta' ? 'pb-[118%]' : 'pb-[78%]',
                    completaMd ? 'md:pb-[56%]' : 'md:pb-[125%]',
                    pieza.forma === 'alta' && 'lg:pb-[125%]',
                    pieza.forma === 'ancha' && 'lg:pb-[60%]',
                    pieza.forma === 'sola' && 'lg:pb-[44%]',
                  )}
                  tamanos={`(min-width: 1024px) ${pieza.forma === 'sola' ? '100vw' : '70vw'}, (min-width: 768px) 110vw, ${pieza.forma === 'alta' ? '190vw' : '130vw'}`}
                  retraso={pieza.desfase ? 0.08 : 0}
                  alAbrir={() => setElegido(obra)}
                  alCotizar={() => elegirWhatsapp(MENSAJES.similar(obra.titulo))}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>

        {total === 0 && (
          <p className="py-16 text-center font-display text-2xl italic text-grafito/70">No hay obras en esta categoría por ahora.</p>
        )}
      </div>

      <ProjectModal project={elegido} onClose={() => setElegido(null)} />
    </section>
  );
}

/** true si la navegación está a la vista (la lógica de Navbar.jsx: se esconde al bajar, vuelve al subir). */
function useNavegacionVisible() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(true);
  useMotionValueEvent(scrollY, 'change', (y) => {
    const previo = scrollY.getPrevious();
    const delta = y - (previo === undefined ? y : previo);
    if (y < 140) setVisible(true);
    else if (delta > 4) setVisible(false);
    else if (delta < -4) setVisible(true);
  });
  return visible;
}
