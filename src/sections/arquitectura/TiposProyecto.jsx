import React, { useRef, useState } from 'react';
import { motion as Motion, useScroll } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { TIPOS } from './datos';
import { EXPO, VISTA, cx, escalonar, useMedio, useMenosMovimiento, variantes } from '../../lib/movimiento';
import { elegirWhatsapp } from '../../utils/whatsapp';

const numero = (i) => String(i + 1).padStart(2, '0');
const CRECER = `flex-grow 0.95s cubic-bezier(${EXPO.join(', ')})`;

/**
 * Tipos de proyectos: los renders en tarjetas altas. Escritorio: cinco paneles en fila; el que está bajo el cursor (o
 * con el foco) se abre y deja ver el render casi entero, los otros quedan como franjas con el nombre en vertical.
 * Teléfono y tableta: un carril que se desliza con el dedo, con su hilo de avance. Cada tarjeta abre el selector de
 * WhatsApp con su tipo de proyecto ya escrito.
 */
export default function TiposProyecto() {
  const escritorio = useMedio('(min-width: 1024px)');
  return (
    <section id="tipos-de-proyectos" aria-labelledby="tipos-titulo" className="seccion relative bg-arena">
      <div className="contenedor lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8">
        <div className="lg:col-span-7">
          <Revelar como="p" className="etiqueta flex items-center text-madera-oscuro" y={12}>
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Tipos de proyectos
          </Revelar>
          <TextoDividido como="h2" id="tipos-titulo" texto="Espacios para *vivir y trabajar*" className="titulo-display mt-5" />
        </div>
        <Revelar retraso={0.15} className="mt-6 lg:col-span-4 lg:col-start-9 lg:mt-0 lg:pb-3">
          <p className="text-[1.0625rem] leading-relaxed text-grafito">
            Residencial, comercial, oficinas, remodelaciones e interiorismo, en todo el país. Elige el tuyo y cotízalo por WhatsApp.
          </p>
          <Link to="/proyectos" className="boton boton-linea group mt-6 text-tinta">
            <span>Ver proyectos realizados</span>
            <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.6} aria-hidden="true" />
          </Link>
        </Revelar>
      </div>

      {escritorio ? <Paneles /> : <Carril />}
    </section>
  );
}

/** Escritorio: la fila de paneles que se abren. Siempre hay uno abierto (el último que se señaló). */
function Paneles() {
  const [activo, setActivo] = useState(0);
  const menos = useMenosMovimiento();
  return (
    <Motion.div
      className="contenedor mt-20 flex"
      style={{ height: 'min(76vh, 660px)', minHeight: 500 }}
      initial="oculto"
      whileInView="visible"
      viewport={VISTA}
      variants={escalonar(0.08)}
    >
      {TIPOS.map((tipo, i) => {
        const abierto = i === activo;
        return (
          <Motion.button
            key={tipo.nombre}
            type="button"
            variants={variantes.aparecer}
            // Al mover el ratón (no al entrar): mientras los paneles se acomodan, el que pasa bajo un cursor quieto
            // recibe un mouseenter sin que nadie lo haya señalado, y se abría ese en vez del elegido con el teclado.
            onPointerMove={(evento) => evento.pointerType !== 'touch' && setActivo(i)}
            onFocus={() => setActivo(i)}
            // Con el dedo (tableta): el primer toque abre el panel y el segundo cotiza.
            onClick={() => (abierto ? elegirWhatsapp(tipo.mensaje) : setActivo(i))}
            data-cursor="Cotizar"
            aria-label={`${tipo.nombre}: cotizar por WhatsApp`}
            className={cx('group relative h-full min-w-0 overflow-hidden rounded-[18px] bg-piedra text-left', i < TIPOS.length - 1 && 'mr-3')}
            style={{ flexGrow: abierto ? 5 : 1, flexShrink: 1, flexBasis: 0, transition: menos ? 'none' : CRECER }}
          >
            <span className="absolute left-0 top-0 block h-full w-full transition-transform duration-[1400ms] ease-expo group-hover:scale-[1.035]">
              <Foto src={tipo.foto} alt={tipo.alt} rellenar posicion={tipo.posicion} sizes="(min-width: 1024px) 64vw, 100vw" />
            </span>
            {/* Velo negro suave arriba (para el número) y más hondo abajo (para el nombre) */}
            <span aria-hidden="true" className="absolute left-0 top-0 h-full w-full bg-gradient-to-b from-black/30 via-black/0 to-black/70" />
            <span
              aria-hidden="true"
              className={cx('absolute left-0 top-0 h-full w-full bg-black/35 transition-opacity duration-700 ease-suave', abierto ? 'opacity-0' : 'opacity-100')}
            />

            <span className="etiqueta absolute left-5 top-5 tabular-nums text-hueso/85">{numero(i)}</span>

            {/* Cerrado: el nombre en vertical, de abajo arriba */}
            <span
              aria-hidden="true"
              className={cx(
                'absolute bottom-6 left-1/2 -translate-x-1/2 transition-opacity ease-suave',
                abierto ? 'opacity-0 duration-200' : 'opacity-100 delay-300 duration-700',
              )}
            >
              <span className="block rotate-180 whitespace-nowrap font-display text-[1.7rem] leading-none text-hueso [writing-mode:vertical-rl]">
                {tipo.nombre}
              </span>
            </span>

            {/* Abierto: el nombre en grande y la invitación a cotizar */}
            <span
              aria-hidden="true"
              className={cx(
                'absolute bottom-0 left-0 right-0 p-7 text-hueso transition duration-700 ease-expo xl:p-8',
                abierto ? 'translate-y-0 opacity-100 delay-300' : 'translate-y-4 opacity-0',
              )}
            >
              <span className="block whitespace-nowrap font-display text-[clamp(2rem,3.1vw,3rem)] leading-none tracking-[-0.01em]">{tipo.nombre}</span>
              <span className="etiqueta mt-5 inline-flex items-center rounded-full bg-papel px-4 py-2.5 !text-[10.5px] text-tinta">
                <IconoWhatsapp size={14} />
                <span className="ml-2">Cotizar este proyecto</span>
              </span>
            </span>
          </Motion.button>
        );
      })}
    </Motion.div>
  );
}

/** Teléfono y tableta: el carril con ajuste por tarjeta y un hilo que se llena según lo deslizado. */
function Carril() {
  const carril = useRef(null);
  const { scrollXProgress } = useScroll({ container: carril });
  return (
    <div className="mt-12">
      <Motion.div
        ref={carril}
        className="flex snap-x snap-mandatory overflow-x-auto pb-1 pl-[var(--margen)] scroll-pl-[var(--margen)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-lenis-prevent
        initial="oculto"
        whileInView="visible"
        viewport={VISTA}
        variants={escalonar(0.08)}
      >
        {TIPOS.map((tipo, i) => (
          <Motion.button
            key={tipo.nombre}
            type="button"
            variants={variantes.aparecer}
            onClick={() => elegirWhatsapp(tipo.mensaje)}
            aria-label={`${tipo.nombre}: cotizar por WhatsApp`}
            className="group relative mr-4 block w-[74vw] max-w-[340px] shrink-0 snap-start text-left"
          >
            <span className="relative block overflow-hidden rounded-[18px] bg-piedra" style={{ paddingBottom: '132%' }}>
              <span className="absolute left-0 top-0 block h-full w-full transition-transform duration-[1200ms] ease-expo group-hover:scale-[1.04]">
                <Foto src={tipo.foto} alt={tipo.alt} rellenar posicion={tipo.posicion} sizes="(min-width: 640px) 340px, 74vw" />
              </span>
              <span aria-hidden="true" className="absolute left-0 top-0 h-full w-full bg-gradient-to-t from-black/70 via-black/5 to-black/0" />
              <span aria-hidden="true" className="etiqueta absolute left-4 top-4 rounded-full bg-papel/85 px-3 py-1.5 !text-[10px] tabular-nums text-tinta backdrop-blur-sm">
                {numero(i)}
              </span>
              <span aria-hidden="true" className="absolute bottom-0 left-0 right-0 p-5 text-hueso">
                <span className="block font-display text-[1.85rem] leading-[1.02]">{tipo.nombre}</span>
                <span className="etiqueta mt-3 flex items-center !text-[10px] text-hueso/85">
                  <IconoWhatsapp size={13} />
                  <span className="ml-2">Cotizar</span>
                </span>
              </span>
            </span>
          </Motion.button>
        ))}
        <span aria-hidden="true" className="w-1 shrink-0" />
      </Motion.div>

      <div aria-hidden="true" className="contenedor mt-7 flex items-center">
        <span className="etiqueta text-grafito/70">Desliza</span>
        <span className="relative mx-4 block h-px flex-1 overflow-hidden bg-tinta/15">
          <Motion.span className="absolute left-0 top-0 block h-full w-full origin-left bg-tinta" style={{ scaleX: scrollXProgress }} />
        </span>
        <span className="etiqueta tabular-nums text-grafito/70">{numero(TIPOS.length - 1)}</span>
      </div>
    </div>
  );
}
