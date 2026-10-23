import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import ProjectModal from '../../components/ProjectModal';
import { proyectosData } from '../../data/proyectosData';
import { useMedio, useMenosMovimiento } from '../../lib/movimiento';

const portadaDe = (p) => `/assets/PROYECTOS/${p.imageFolder || p.imageFolders[0].folder}/${p.portada}`;
const fotosDe = (p) => (p.imageFolders ? p.imageFolders.reduce((n, f) => n + f.images.length, 0) : p.images.length);
const nombre = (titulo) => titulo.charAt(0) + titulo.slice(1).toLowerCase();

/**
 * Proyectos (#proyectos): en escritorio, un carril horizontal que avanza con el scroll vertical (la sección queda fija
 * mientras pasan las tarjetas); en el teléfono, un carrusel que se desliza con el dedo. Cada tarjeta abre la galería
 * del proyecto (ProjectModal, el mismo de /proyectos).
 */
export default function ProyectosCarril() {
  const [elegido, setElegido] = useState(null);
  const escritorio = useMedio('(min-width: 1024px)');
  const menos = useMenosMovimiento();

  return (
    <section id="proyectos" aria-labelledby="proyectos-titulo" className="relative bg-arena">
      {escritorio && !menos
        ? <CarrilFijo alElegir={setElegido} />
        : <CarrilDeslizable alElegir={setElegido} />}
      <ProjectModal project={elegido} onClose={() => setElegido(null)} />
    </section>
  );
}

function Encabezado({ className }) {
  return (
    <div className={className}>
      <Revelar como="p" className="etiqueta flex items-center text-madera-oscuro" y={12}>
        <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
        Proyectos · {proyectosData.length} obras
      </Revelar>
      <TextoDividido como="h2" id="proyectos-titulo" texto="Espacios que ya *se viven*" className="titulo-display mt-5" />
      <Revelar retraso={0.2} className="mt-7">
        <Link to="/proyectos" className="boton boton-oscuro group">
          <span>Ver todos los proyectos</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
        </Link>
      </Revelar>
    </div>
  );
}

function Tarjeta({ proyecto, alElegir, className }) {
  return (
    <button
      type="button"
      onClick={() => alElegir(proyecto)}
      data-cursor="Ver"
      className={`group block text-left ${className || ''}`}
      aria-label={`Ver el proyecto ${nombre(proyecto.titulo)}`}
    >
      <span className="relative block overflow-hidden rounded-[18px] bg-piedra" style={{ paddingBottom: '125%' }}>
        <span className="absolute left-0 top-0 block h-full w-full transition-transform duration-[1200ms] ease-expo group-hover:scale-[1.05]">
          {/* Renders 16:9 recortados a 4:5: la foto real es ~1,8 veces más ancha que la tarjeta. */}
          <Foto src={portadaDe(proyecto)} rellenar sizes="(min-width: 1024px) 800px, 175vw" />
        </span>
        <span className="absolute left-0 top-0 h-full w-full bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
        <span className="etiqueta absolute left-4 top-4 rounded-full bg-papel/85 px-3 py-1.5 !text-[10px] text-tinta backdrop-blur-sm">
          {proyecto.categoria === 'RESIDENCIAL' ? 'Residencial' : 'Comercial'}
        </span>
        <span className="absolute bottom-4 left-5 right-5 text-hueso">
          <span className="block font-display text-[2rem] leading-none">{nombre(proyecto.titulo)}</span>
          <span className="etiqueta mt-2 block !text-[10px] text-hueso/75">{fotosDe(proyecto)} fotos</span>
        </span>
      </span>
    </button>
  );
}

/** Escritorio: la sección es alta y el carril, fijo, se corre a la izquierda tanto como se baja. */
function CarrilFijo({ alElegir }) {
  const pista = useRef(null);
  const carril = useRef(null);
  const [recorrido, setRecorrido] = useState(0);

  useEffect(() => {
    const medir = () => {
      if (carril.current) setRecorrido(Math.max(0, carril.current.scrollWidth - window.innerWidth));
    };
    medir();
    window.addEventListener('resize', medir);
    const t = window.setTimeout(medir, 600); // después de que carguen las fuentes
    return () => {
      window.removeEventListener('resize', medir);
      window.clearTimeout(t);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: pista, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -recorrido]);

  return (
    <div ref={pista} className="relative" style={{ height: `calc(100vh + ${recorrido}px)` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div ref={carril} className="flex items-center pl-[var(--margen)] pr-[8vw]" style={{ x }}>
          <Encabezado className="mr-[6vw] w-[30vw] max-w-[440px] shrink-0" />
          {proyectosData.map((p, i) => (
            <Tarjeta key={p.id} proyecto={p} alElegir={alElegir} className={`mr-6 w-[min(26vw,360px)] shrink-0 ${i % 2 ? 'mt-24' : '-mt-10'}`} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/** Teléfono (o reducir movimiento): encabezado y un carrusel con scroll horizontal y ajuste por tarjeta. */
function CarrilDeslizable({ alElegir }) {
  return (
    <div className="seccion">
      <Encabezado className="contenedor" />
      <div className="mt-12 flex snap-x snap-mandatory overflow-x-auto pb-4 pl-[var(--margen)] [scrollbar-width:none]" data-lenis-prevent>
        {proyectosData.map((p) => (
          <Tarjeta key={p.id} proyecto={p} alElegir={alElegir} className="mr-4 w-[78vw] max-w-[340px] shrink-0 snap-start" />
        ))}
        <span aria-hidden="true" className="w-1 shrink-0" />
      </div>
    </div>
  );
}
