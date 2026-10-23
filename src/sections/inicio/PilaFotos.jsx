import React, { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useMotionValue } from 'framer-motion';
import Foto from '../../components/efectos/Foto';
import { AvatarDekog } from '../../components/asistente/LogoDekog';
import { EXPO, cx, useMenosMovimiento, usePunteroFino } from '../../lib/movimiento';

/**
 * Pila de tres fotos abiertas en abanico (portada). Cada 3,5 s la de arriba sale volando y pasa al fondo; se puede
 * arrastrar (dedo o ratón) o tocar para pasar a la siguiente. Se queda quieta si la tocan, si no está en pantalla o con
 * «reducir movimiento». `children` se pinta encima, posicionado respecto a la pila (chips…).
 */

/** Lugar de cada foto en el abanico (0 = arriba). x e y en fracciones del ancho de la foto. */
const LUGARES = [
  { x: 0, y: 0, rotate: -3, scale: 1 },
  { x: 0.25, y: 0.035, rotate: 7, scale: 0.92 },
  { x: -0.25, y: 0.07, rotate: -10, scale: 0.85 },
];

const RESORTE = { type: 'spring', stiffness: 170, damping: 23, mass: 1 };

/** Ancho de un elemento; con ResizeObserver si existe (iOS 13.4+), si no, al cambiar el tamaño de la ventana. */
function useAncho(ref) {
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return undefined;
    const medir = () => setAncho(nodo.getBoundingClientRect().width);
    medir();
    if (typeof ResizeObserver !== 'undefined') {
      const observador = new ResizeObserver(medir);
      observador.observe(nodo);
      return () => observador.disconnect();
    }
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [ref]);
  return ancho;
}

export default function PilaFotos({ fotos, listo, className, children }) {
  const menos = useMenosMovimiento();
  const fino = usePunteroFino();
  const caja = useRef(null);
  const enPantalla = useInView(caja, { amount: 0.3 });
  const ancho = useAncho(caja);
  const [orden, setOrden] = useState(() => fotos.map((_, i) => i)); // orden[0] = la de arriba
  const [abierta, setAbierta] = useState(false);
  const [expulsion, setExpulsion] = useState(null);
  const [tocando, setTocando] = useState(false);
  const [segundoPlano, setSegundoPlano] = useState(false);
  const reanudacion = useRef(0);

  // Primero aparece la pila cerrada; luego se abre en abanico.
  useEffect(() => {
    if (!listo) return undefined;
    const t = window.setTimeout(() => setAbierta(true), menos ? 0 : 520);
    return () => window.clearTimeout(t);
  }, [listo, menos]);

  useEffect(() => {
    const cambiar = () => setSegundoPlano(document.hidden);
    document.addEventListener('visibilitychange', cambiar);
    return () => {
      document.removeEventListener('visibilitychange', cambiar);
      window.clearTimeout(reanudacion.current);
    };
  }, []);

  const siguiente = useCallback((dir = 1) => setExpulsion((previa) => previa || { dir }), []);
  const alSalir = useCallback(() => {
    setOrden(([arriba, ...resto]) => [...resto, arriba]);
    setExpulsion(null);
  }, []);

  const pausar = () => {
    window.clearTimeout(reanudacion.current);
    setTocando(true);
  };
  const reanudar = (ms) => {
    window.clearTimeout(reanudacion.current);
    reanudacion.current = window.setTimeout(() => setTocando(false), ms);
  };

  const pausada = !abierta || menos || tocando || !enPantalla || segundoPlano || expulsion !== null;

  return (
    <div className={cx('relative', className)}>
      <motion.div
        ref={caja}
        className="relative w-full"
        style={{ paddingBottom: '140%' }}
        initial={{ opacity: 0, y: 48 }}
        animate={listo ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 1.1, ease: EXPO, delay: 0.12 }}
        onPointerEnter={(e) => e.pointerType === 'mouse' && pausar()}
        onPointerLeave={(e) => e.pointerType === 'mouse' && reanudar(500)}
        onPointerDown={pausar}
        onPointerUp={(e) => e.pointerType !== 'mouse' && reanudar(2600)}
        onPointerCancel={() => reanudar(2600)}
      >
        {fotos.map((foto, indice) => (
          <Carta
            key={foto.src}
            foto={foto}
            fotos={fotos}
            indice={indice}
            lugar={orden.indexOf(indice)}
            ancho={ancho}
            abierta={abierta}
            expulsion={orden[0] === indice ? expulsion : null}
            pausada={pausada}
            siguiente={siguiente}
            alSalir={alSalir}
            menos={menos}
            fino={fino}
          />
        ))}
      </motion.div>
      {children}
    </div>
  );
}

function Carta({ foto, fotos, indice, lugar, ancho, abierta, expulsion, pausada, siguiente, alSalir, menos, fino }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(LUGARES[0].rotate);
  const scale = useMotionValue(1);
  const saliendo = useRef(false);
  const arrastrada = useRef(false);
  const arriba = lugar === 0;

  // A su lugar del abanico (cerrada: todas juntas, en el lugar de arriba).
  useEffect(() => {
    if (!ancho || saliendo.current) return undefined;
    const destino = LUGARES[abierta ? lugar : 0] || LUGARES[LUGARES.length - 1];
    const abre = window.innerWidth >= 1024 ? 1.45 : 1; // en escritorio sobra sitio: abanico más abierto
    const t = menos ? { duration: 0 } : { ...RESORTE, delay: abierta ? lugar * 0.05 : 0 };
    const animaciones = [
      animate(x, destino.x * ancho * abre, t),
      animate(y, destino.y * ancho, t),
      animate(rotate, destino.rotate, t),
      animate(scale, destino.scale, t),
    ];
    return () => animaciones.forEach((a) => a.stop());
  }, [lugar, ancho, abierta, menos, x, y, rotate, scale]);

  const salir = useCallback((dir, velocidad = 0) => {
    if (saliendo.current) return;
    saliendo.current = true;
    const destinoX = dir * (ancho * 1.3 + 32);
    const restante = Math.abs(destinoX - x.get());
    const duracion = menos ? 0 : Math.min(0.5, Math.max(0.26, restante / Math.max(Math.abs(velocidad), 1150)));
    const t = { duration: duracion, ease: [0.22, 0.75, 0.35, 1] };
    animate(rotate, LUGARES[0].rotate + dir * 16, t);
    animate(y, y.get() - ancho * 0.07, t);
    animate(x, destinoX, t).then(() => {
      saliendo.current = false;
      alSalir();
    });
  }, [ancho, menos, x, y, rotate, alSalir]);

  useEffect(() => {
    if (expulsion) salir(expulsion.dir);
  }, [expulsion, salir]);

  const soltar = (_, { offset, velocity }) => {
    const lejos = Math.abs(offset.x) > ancho * 0.3;
    if (lejos || Math.abs(velocity.x) > 520) {
      salir(Math.sign(lejos ? offset.x : velocity.x) || 1, velocity.x);
    } else {
      animate(x, 0, { ...RESORTE, velocity: velocity.x });
      animate(y, 0, { ...RESORTE, velocity: velocity.y });
      animate(rotate, LUGARES[0].rotate, RESORTE);
    }
    window.setTimeout(() => { arrastrada.current = false; }, 0);
  };

  const activa = arriba && abierta && !menos;

  return (
    <motion.div
      className={cx(
        'absolute left-0 top-0 h-full w-full select-none overflow-hidden rounded-[18px] bg-arena shadow-[0_28px_60px_-24px_rgb(21_19_17/0.55)] ring-1 ring-tinta/5 will-change-transform lg:rounded-[22px]',
        arriba && 'cursor-grab active:cursor-grabbing',
      )}
      style={{ x, y, rotate, scale, zIndex: 10 - lugar, touchAction: arriba ? 'pan-y' : undefined }}
      drag={arriba && abierta ? (fino ? true : 'x') : false}
      dragMomentum={false}
      onDragStart={() => {
        arrastrada.current = true;
        rotate.stop();
        scale.stop();
      }}
      onDrag={(_, info) => rotate.set(LUGARES[0].rotate + info.offset.x * 0.065)}
      onDragEnd={soltar}
      onClick={() => arriba && !arrastrada.current && siguiente(1)}
      onKeyDown={(e) => {
        if (arriba && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          siguiente(1);
        }
      }}
      role={arriba ? 'button' : undefined}
      tabIndex={arriba ? 0 : -1}
      aria-label={arriba ? `${foto.alt}. Ver la siguiente foto` : undefined}
      aria-hidden={arriba ? undefined : true}
      data-cursor={arriba ? 'Arrastra' : undefined}
    >
      <Foto src={foto.src} alt="" retrato rellenar prioridad={indice === 0} posicion={foto.posicion} />

      {/* Cabecera tipo historia: barras de progreso y la línea de Dekog. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-0 right-0 top-0 h-28 bg-gradient-to-b from-black/45 via-black/15 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute left-2.5 right-2.5 top-2.5 flex lg:left-3 lg:right-3 lg:top-3">
        {fotos.map((f, j) => (
          <span key={f.src} className="historia-barra">
            <i
              className={cx((j < indice || (menos && j === indice)) && 'is-llena', j === indice && activa && 'is-activa')}
              style={{ animationPlayState: pausada ? 'paused' : 'running' }}
              onAnimationEnd={j === indice ? () => siguiente(indice % 2 ? -1 : 1) : undefined}
            />
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute left-2.5 top-[18px] flex items-center text-white lg:left-3 lg:top-5">
        <AvatarDekog tam={26} className="ring-[1.5px] ring-white/80" />
        <span className="ml-1.5 text-[11px] font-medium tracking-wide [text-shadow:0_1px_8px_rgb(0_0_0/0.45)] lg:text-xs">
          {foto.linea}
        </span>
      </div>
    </motion.div>
  );
}
