import React, { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence, cubicBezier, interpolate, motion, useMotionValueEvent, useScroll, useTransform,
} from 'framer-motion';
import { Link } from 'react-router-dom';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { LINEAS } from '../../data/sitio';
import { EXPO, cx, useMenosMovimiento } from '../../lib/movimiento';
import { irA } from '../../lib/scroll';
import { elegirWhatsapp } from '../../utils/whatsapp';
import './inicio.css';

/**
 * «Un solo equipo», el momento estrella de la portada: un escenario fijo (sticky) por el que pasan las cuatro líneas de
 * Dekog, alrededor de una pantalla de scroll cada una. La foto se destapa dentro de un arco, el nombre gigante entra
 * letra a letra y TODA la sección se tiñe del color de la línea que está en pantalla.
 */

const N = LINEAS.length;
const NUMEROS = LINEAS.map((l) => l.numero);
const TOTAL = String(N).padStart(2, '0');
const NOCHE = '#161412'; // el de la cinta de arriba: la sección nace de ahí
const PAUSA = 0.2; // fracción de cada tramo en que la línea se queda quieta

// Avance escalonado: el scroll (0→1) se convierte en t (0→N-1) con una meseta sobre cada línea.
const ENTRADAS = [];
const SALIDAS = [];
LINEAS.forEach((_, k) => {
  const desde = Math.max(0, k - PAUSA);
  const hasta = Math.min(N - 1, k + PAUSA);
  ENTRADAS.push(desde / (N - 1));
  SALIDAS.push(k);
  if (hasta > desde) {
    ENTRADAS.push(hasta / (N - 1));
    SALIDAS.push(k);
  }
});
const TRAMO = cubicBezier(0.45, 0, 0.25, 1);

const colorDeLinea = interpolate(LINEAS.map((_, k) => k), LINEAS.map((l) => l.fondo));
const colorDeEntrada = interpolate([0.05, 0.75], [NOCHE, LINEAS[0].fondo]);

export default function Lineas() {
  const pista = useRef(null);
  const menos = useMenosMovimiento();
  const { scrollYProgress: entrada } = useScroll({ target: pista, offset: ['start end', 'start start'] });
  const { scrollYProgress: avance } = useScroll({ target: pista, offset: ['start start', 'end end'] });
  const t = useTransform(avance, ENTRADAS, SALIDAS, { ease: TRAMO });
  const fondo = useTransform([entrada, t], ([e, paso]) => (e < 1 ? colorDeEntrada(e) : colorDeLinea(paso)));

  return (
    <motion.section
      id="lineas"
      aria-labelledby="lineas-titulo"
      className="sobre-oscuro relative text-hueso"
      style={{ backgroundColor: fondo }}
    >
      <Encabezado />
      <Escenario pista={pista} t={t} entrada={entrada} avance={avance} menos={menos} />
    </motion.section>
  );
}

function Encabezado() {
  return (
    <header className="contenedor pb-12 pt-[var(--aire)] lg:pb-24">
      <Revelar className="flex items-center justify-between border-b border-hueso/20 pb-4" y={12}>
        <p className="etiqueta">Lo que hacemos</p>
        <p className="etiqueta tabular-nums text-hueso/70">01 — {TOTAL}</p>
      </Revelar>

      <div className="mt-8 lg:mt-14 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8">
        <h2 id="lineas-titulo" className="font-display text-[clamp(3.4rem,17vw,11.5rem)] font-normal leading-[0.86] tracking-[-0.035em] lg:col-span-8">
          <TextoDividido texto="Un solo" className="block" />
          <span className="block pl-[11vw] lg:pl-[12vw]">
            <TextoDividido texto="*equipo*" claseEnfasis="italic text-madera-claro" retraso={0.12} />
          </span>
        </h2>

        <div className="mt-10 lg:col-span-4 lg:mt-0 lg:pb-5">
          <Revelar como="p" retraso={0.15} className="font-display text-[1.75rem] italic leading-[1.08] lg:text-[2.1rem]">
            Para todo tu proyecto.
          </Revelar>
          <Revelar como="p" retraso={0.25} className="mt-4 max-w-sm text-[1.0625rem] leading-relaxed text-hueso/80">
            Diseñamos, construimos y amoblamos: cuatro áreas que trabajan juntas para que no tengas que coordinar a nadie.
          </Revelar>
        </div>
      </div>
    </header>
  );
}

const FRASE = {
  entra: (dir) => ({ opacity: 0, y: dir >= 0 ? 26 : -26 }),
  quieto: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EXPO, delay: 0.18 } },
  sale: (dir) => ({ opacity: 0, y: dir >= 0 ? -18 : 18, transition: { duration: 0.3, ease: 'easeIn' } }),
};

function Escenario({ pista, t, entrada, avance, menos }) {
  const [activo, setActivo] = useState(0);
  const [dir, setDir] = useState(1);
  const [visto, setVisto] = useState(false);
  const [fijo, setFijo] = useState(false);
  const previo = useRef(0);

  useMotionValueEvent(t, 'change', (v) => {
    const i = Math.round(v);
    if (i === previo.current) return;
    setDir(i > previo.current ? 1 : -1);
    previo.current = i;
    setActivo(i);
  });
  useMotionValueEvent(entrada, 'change', (e) => {
    if (e > 0.45) setVisto(true);
    setFijo(e >= 0.98 && avance.get() < 0.995);
  });
  useMotionValueEvent(avance, 'change', (a) => setFijo(entrada.get() >= 0.98 && a < 0.995));

  // En el teléfono, la barra del navegador se tiñe del color de la línea mientras el escenario está fijo.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta || !fijo) return undefined;
    const original = meta.getAttribute('content');
    meta.setAttribute('content', LINEAS[activo].fondo);
    return () => meta.setAttribute('content', original);
  }, [fijo, activo]);

  const linea = LINEAS[activo];

  /** Lleva el scroll a la meseta de la línea k (las barras o el sumario). */
  const irALinea = (k) => {
    const el = pista.current;
    if (!el) return;
    const inicio = el.getBoundingClientRect().top + window.scrollY;
    irA(inicio + (k / (N - 1)) * (el.offsetHeight - window.innerHeight));
  };

  return (
    <div ref={pista} className="relative" style={{ height: `${N * 100 + 50}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="contenedor flex h-full flex-col pb-5 pt-3 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:py-0">
          {/* Barras tipo historia (teléfono) */}
          <div className="flex items-center lg:hidden">
            <p className="mr-4 flex shrink-0 items-end">
              <span className="sr-only">Línea </span>
              <NumeroRodante t={t} numeros={NUMEROS} activo={activo} menos={menos} className="font-display text-[1.65rem] italic tracking-[-0.02em]" />
              <span className="etiqueta ml-1.5 pb-[0.2em] tabular-nums text-hueso/60">/ {TOTAL}</span>
            </p>
            <div className="flex flex-1">
              {LINEAS.map((l, k) => (
                <BarraHistoria
                  key={l.numero}
                  indice={k}
                  t={t}
                  entrada={entrada}
                  activa={k === activo}
                  etiqueta={`Ver ${l.nombre}`}
                  alTocar={() => irALinea(k)}
                />
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-center lg:contents">
            {/* La foto en su arco, con el nombre gigante entrando y saliendo */}
            <div className="relative flex items-center justify-center pb-[15vw] pt-4 lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:h-full lg:pb-[13vh] lg:pt-[5vh]">
              <div className="lineas-arco">
                <NombreGigante
                  linea={visto ? linea : null}
                  dir={dir}
                  menos={menos}
                  className="absolute bottom-0 left-1/2 z-0 -translate-x-1/2 translate-y-[40%] font-display text-[12.5vw] leading-none lg:text-[6.2vw]"
                />
                <div className="lineas-arco__filete z-10" />
                <div className="lineas-arco__marco z-10 bg-black/20">
                  {LINEAS.map((l, k) => (
                    <CapaFoto key={l.numero} linea={l} indice={k} t={t} entrada={entrada} menos={menos} visible={k <= activo} />
                  ))}
                </div>
                <NombreGigante
                  linea={visto ? linea : null}
                  dir={dir}
                  menos={menos}
                  contorno
                  className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 translate-y-[40%] font-display text-[12.5vw] leading-none lg:text-[6.2vw]"
                />
              </div>
            </div>

            {/* Ficha: la marca, la frase y los botones */}
            <div className="relative z-30 text-center lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:self-center lg:text-left">
              <div className="hidden items-end lg:flex">
                <NumeroRodante t={t} numeros={NUMEROS} activo={activo} menos={menos} className="lineas-contorno font-display text-[8.5rem] tracking-[-0.04em]" />
                <p className="etiqueta mb-3 ml-6 text-hueso/70">
                  Línea
                  <br />
                  de {TOTAL}
                </p>
              </div>

              <div className="grid min-h-[2.5em] items-center text-[clamp(1.3rem,6vw,1.65rem)] lg:mt-8 lg:min-h-[2.3em] lg:text-[2.4rem]">
                <AnimatePresence custom={dir}>
                  {visto && (
                    <motion.div key={linea.numero} className="[grid-area:1/1]" custom={dir} variants={FRASE} initial="entra" animate="quieto" exit="sale">
                      <p className="etiqueta mb-2 !text-[0.7rem] text-madera-claro lg:mb-3">{linea.marca}</p>
                      <p className="font-display italic leading-[1.1]">{linea.frase}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="sr-only" aria-live="polite">{`${linea.nombre}: ${linea.frase}`}</p>

              <div className="mt-5 grid grid-cols-2 gap-2.5 lg:mt-9 lg:flex">
                <Link to={linea.ruta} className="boton boton-claro w-full !px-4 lg:mr-3 lg:w-auto lg:!px-8" data-cursor="Ver">
                  Conocer más
                </Link>
                <button
                  type="button"
                  onClick={() => elegirWhatsapp(linea.mensaje)}
                  className="boton boton-linea w-full !px-4 lg:w-auto lg:!px-8"
                >
                  <IconoWhatsapp size={16} />
                  <span>Cotizar</span>
                </button>
              </div>

              {/* Sumario de revista (escritorio) */}
              <ol className="mt-14 hidden border-t border-hueso/20 lg:block">
                {LINEAS.map((l, k) => (
                  <li key={l.numero} className="border-b border-hueso/20">
                    <button
                      type="button"
                      onClick={() => irALinea(k)}
                      aria-current={k === activo ? 'true' : undefined}
                      className="group flex w-full items-center py-3 text-left"
                    >
                      <span className="etiqueta mr-5 w-6 tabular-nums text-hueso/70">{l.numero}</span>
                      <span
                        className={cx(
                          'font-display text-[1.6rem] leading-none transition duration-500 ease-expo',
                          k === activo ? 'translate-x-2 italic text-hueso' : 'text-hueso/45 group-hover:text-hueso/80',
                        )}
                      >
                        {l.nombre}
                      </span>
                      <span className={cx('ml-auto h-px w-10 origin-right bg-hueso transition-transform duration-700 ease-expo', k === activo ? 'scale-x-100' : 'scale-x-0')} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Piezas del escenario: todas leen `t` (0 = primera línea, 1 = segunda…) y `entrada` (0→1 hasta quedar fijo) ──

const SALIDA = [0.7, 0, 0.84, 0];
const TAMANOS = '(min-width: 1024px) 34vw, 72vw';

function useRevelado(indice, t, entrada) {
  return useTransform(indice === 0 ? entrada : t, indice === 0 ? [0.3, 0.92] : [indice - 1, indice], [0, 1]);
}

/** Una foto dentro del arco: se destapa de abajo arriba atada al scroll; la de debajo sube y se oscurece. */
function CapaFoto({ linea, indice, t, entrada, menos, visible }) {
  const revelado = useRevelado(indice, t, entrada);
  const tapado = useTransform(t, [indice, indice + 1], [0, 1]);
  const clipPath = useTransform(revelado, (r) => `inset(${((1 - r) * 100).toFixed(2)}% 0% 0% 0%)`);
  const scale = useTransform(revelado, [0, 1], [1.32, 1]);
  const y = useTransform(tapado, [0, 1], ['0%', '-9%']);
  const velo = useTransform(tapado, [0, 1], [0, 0.55]);

  if (menos) {
    return (
      <motion.div className="absolute left-0 top-0 h-full w-full" initial={false} animate={{ opacity: visible ? 1 : 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
        <Foto src={linea.foto} rellenar sizes={TAMANOS} />
      </motion.div>
    );
  }
  return (
    <motion.div className="absolute left-0 top-0 h-full w-full" style={{ clipPath, WebkitClipPath: clipPath }}>
      <motion.div className="absolute left-0 top-0 h-full w-full" style={{ scale, y }}>
        <Foto src={linea.foto} rellenar sizes={TAMANOS} />
      </motion.div>
      <motion.div aria-hidden="true" className="absolute left-0 top-0 h-full w-full bg-black" style={{ opacity: velo }} />
    </motion.div>
  );
}

/** Raya de progreso tipo historia: se llena mientras se destapa su línea. */
function BarraHistoria({ indice, t, entrada, activa, etiqueta, alTocar }) {
  const scaleX = useRevelado(indice, t, entrada);
  return (
    <button type="button" onClick={alTocar} aria-label={etiqueta} aria-current={activa ? 'true' : undefined} className="mx-[3px] flex h-11 flex-1 items-center">
      <span className="relative block h-[2px] w-full overflow-hidden rounded-full bg-hueso/25">
        <motion.span className="absolute left-0 top-0 h-full w-full origin-left rounded-full bg-hueso" style={{ scaleX }} />
      </span>
    </button>
  );
}

/** Número que rueda como un cuentakilómetros, atado al scroll (01 → 04). */
function NumeroRodante({ t, numeros, activo, menos, className }) {
  const y = useTransform(t, (v) => `${(-v * 100) / numeros.length}%`);
  return (
    <span aria-hidden="true" className={cx('block h-[1em] overflow-hidden leading-none', className)}>
      {menos ? (
        <span className="block h-[1em] leading-none">{numeros[activo]}</span>
      ) : (
        <motion.span className="block" style={{ y }}>
          {numeros.map((n) => <span key={n} className="block h-[1em] leading-none">{n}</span>)}
        </motion.span>
      )}
    </span>
  );
}

const PADRE = {
  entra: {},
  quieto: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
  sale: { transition: { staggerChildren: 0.025 } },
};
const LETRA = {
  entra: (dir) => ({ y: dir >= 0 ? '118%' : '-118%' }),
  quieto: { y: '0%', transition: { duration: 0.95, ease: EXPO } },
  sale: (dir) => ({ y: dir >= 0 ? '-118%' : '118%', transition: { duration: 0.5, ease: SALIDA } }),
};
const FUNDIDO = {
  entra: { opacity: 0 },
  quieto: { opacity: 1, transition: { duration: 0.4 } },
  sale: { opacity: 0, transition: { duration: 0.25 } },
};

/** Nombre gigante de la línea, letra a letra desde una máscara: sólido detrás del arco y en contorno delante. */
function NombreGigante({ linea, dir, menos, contorno = false, className }) {
  return (
    <div aria-hidden="true" className={cx('pointer-events-none grid select-none justify-items-center', className)}>
      <AnimatePresence custom={dir}>
        {linea && (
          <motion.span
            key={linea.numero}
            className={cx('flex whitespace-nowrap [grid-area:1/1]', contorno && 'lineas-contorno')}
            custom={dir}
            variants={menos ? FUNDIDO : PADRE}
            initial="entra"
            animate="quieto"
            exit="sale"
          >
            {[...linea.nombre].map((letra, i) => (
              <span key={i} className="mascara">
                <motion.span className="inline-block" custom={dir} variants={menos ? undefined : LETRA}>{letra}</motion.span>
              </span>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
