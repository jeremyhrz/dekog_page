import React, { Component, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, RotateCw } from 'lucide-react';
import TextoDividido, { Enfasis } from '../components/efectos/TextoDividido';
import Magnetico from '../components/efectos/Magnetico';
import { LogoDekog, MarcaD } from '../components/marca/Logo';
import { IconoWhatsapp } from '../components/asistente/comun';
import { LINEAS_WHATSAPP, lineaWhatsapp, propsWhatsapp } from '../utils/whatsapp';
import { rutaDesconocida } from '../utils/rutas';
import { EXPO } from '../lib/movimiento';
import { horasEnteras } from '../sections/contacto/texto';
import '../sections/contacto/aviso.css';

/**
 * NoEncontrada — cualquier ruta que la web no tiene (App.jsx → <Route path="*">). Antes la página quedaba en blanco,
 * sin menú ni chat: React Router no pinta nada si ninguna ruta coincide. Va dentro del Layout, así que el menú, el pie
 * y el asistente siguen a la vista. Qué se muestra según la ruta: utils/rutas.js.
 *
 * ErrorDePagina — si una página falla al pintarse (un error de nuestro código, o su archivo no carga tras publicar una
 * versión nueva), se ve un aviso con los WhatsApp en vez de la página en blanco.
 *
 * Estilo editorial de 2026: el rótulo con su filete, el titular en Bodoni (*énfasis* en cursiva madera) y la D de rayas
 * enorme de fondo, que se dibuja raya a raya (sections/contacto/aviso.css).
 */

const BOTONES = 'flex flex-col sm:flex-row sm:flex-wrap sm:items-center';
const ENLACE = 'group inline-flex min-h-[44px] items-center text-[0.9375rem] text-grafito transition-colors duration-300 hover:text-madera-oscuro';
const FLECHA = 'h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1';

/**
 * Lo que aparece con una entrada suave (rótulo, bajada, acciones). Sin `animar` (el aviso de error), un elemento quieto:
 * ese aviso tiene que pintarse aunque lo que falló sea justo lo que anima.
 */
function Entrar({ animar, como = 'div', retraso = 0, className, children }) {
  if (!animar) {
    const Elemento = como;
    return <Elemento className={className}>{children}</Elemento>;
  }
  const Elemento = motion[como];
  return (
    <Elemento
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.95, ease: EXPO, delay: retraso }}
    >
      {children}
    </Elemento>
  );
}

/** Rótulo, título, una frase y lo que se puede hacer, con la D de rayas de fondo. `conLogo`: sin el Layout (error). */
function Aviso({ rotulo, titulo, texto, animar = true, conLogo = false, children }) {
  const claseTitulo = 'titulo-display mt-5 text-[clamp(2.75rem,7.4vw,6.1rem)] lg:mt-7';
  return (
    <section className="relative isolate overflow-hidden bg-hueso text-tinta">
      {/* La D entera (su curva es lo que la hace reconocible): a la derecha en escritorio; en el teléfono, de marca de
          agua detrás del aviso. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[55%] -z-10 w-[86%] max-w-[600px] -translate-x-1/2 -translate-y-1/2 text-arena/60 sm:left-auto sm:right-[3%] sm:top-1/2 sm:w-[46%] sm:translate-x-0 lg:right-[4%] lg:top-[calc(50%+2.5rem)] lg:w-[38%] lg:text-arena"
      >
        <MarcaD animacion="aviso" className="h-auto w-full" />
      </div>

      {conLogo && (
        <div className="absolute left-0 right-0 top-0 z-10">
          <div className="contenedor flex h-16 items-center lg:h-20">
            <a href="/" aria-label="Dekog, ir al inicio" className="-ml-1 block rounded-md p-1">
              <LogoDekog alt="" className="h-9 w-auto lg:h-11" />
            </a>
          </div>
        </div>
      )}

      <div className="contenedor relative flex min-h-[82vh] flex-col justify-center pb-24 pt-32 lg:min-h-[90vh] lg:pb-28 lg:pt-40">
        <div className="max-w-[50rem]">
          <Entrar animar={animar} como="p" retraso={0.05} className="etiqueta flex items-center text-madera-oscuro">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            {rotulo}
          </Entrar>
          {animar ? (
            <TextoDividido como="h1" texto={titulo} alVer={false} retraso={0.15} escalon={0.06} duracion={1.05} className={claseTitulo} />
          ) : (
            <Enfasis como="h1" texto={titulo} className={claseTitulo} />
          )}
          <Entrar animar={animar} retraso={0.45} className="mt-7 max-w-md">
            <p className="text-[1.0625rem] leading-relaxed text-grafito lg:text-[1.15rem]">{texto}</p>
          </Entrar>
          <Entrar animar={animar} retraso={0.55} className="mt-10">
            {children}
          </Entrar>
        </div>
      </div>
    </section>
  );
}

/** Los WhatsApp de las dos asesoras, cada uno con su número a la vista (como en el selector de línea). */
function LineasWhatsapp() {
  return (
    <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
      {LINEAS_WHATSAPP.map((l) => (
        <a
          key={l.numero}
          href={lineaWhatsapp(l.linea)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp de la Línea ${l.linea}, ${l.visible}`}
          className="group flex items-center rounded-[18px] bg-tinta px-5 py-4 text-papel transition-colors duration-500 ease-expo hover:bg-madera-oscuro"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-papel/10">
            <IconoWhatsapp size={18} />
          </span>
          <span className="ml-4 min-w-0 flex-1 text-left">
            <span className="block font-display text-[1.6rem] leading-none">Línea {l.linea}</span>
            <span className="etiqueta mt-2 block text-papel/70">{l.visible}</span>
          </span>
          <ArrowUpRight
            className="ml-3 h-5 w-5 shrink-0 text-papel/70 transition-transform duration-500 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </a>
      ))}
    </div>
  );
}

export default function NoEncontrada() {
  const { pathname } = useLocation();
  const tipo = rutaDesconocida(pathname);

  useEffect(() => {
    // replace: «atrás» no vuelve a la ruta rota.
    if (tipo === 'ofertas') window.location.replace('/ofertas');
  }, [tipo]);

  if (tipo === 'ofertas') {
    return (
      <Aviso rotulo="Ofertas en stock" titulo="Catálogo de *ofertas*" texto="Te estamos llevando al catálogo de ofertas…">
        <a href="/ofertas" className="boton boton-oscuro group w-full sm:w-auto">
          <span>Ver las ofertas</span>
          <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.6} aria-hidden="true" />
        </a>
      </Aviso>
    );
  }
  if (tipo === 'asesoras') {
    return (
      <Aviso
        rotulo="Asesoras de Dekog"
        titulo="Escríbele a una *asesora*"
        texto={horasEnteras('Te atiende una asesora de Dekog por WhatsApp, de lunes a sábado de 9:00 a. m. a 6:00 p. m. Las dos líneas atienden muebles y arquitectura.')}
      >
        <LineasWhatsapp />
        <Link to="/" className={`${ENLACE} mt-7`}>
          <span className="enlace-linea pb-0.5">Ir al inicio</span>
          <ArrowRight className={`ml-2 ${FLECHA}`} strokeWidth={1.6} aria-hidden="true" />
        </Link>
      </Aviso>
    );
  }
  return (
    <Aviso rotulo="Error 404" titulo="No encontramos esta *página*" texto="Puede que el enlace esté incompleto o que la página ya no exista.">
      <div className={BOTONES}>
        <Magnetico className="w-full sm:mr-3 sm:w-auto">
          <Link to="/" className="boton boton-oscuro group w-full sm:w-auto">
            <span>Ir al inicio</span>
            <ArrowRight className={FLECHA} strokeWidth={1.6} aria-hidden="true" />
          </Link>
        </Magnetico>
        <Magnetico className="mt-3 w-full sm:mt-0 sm:w-auto">
          <Link to="/?categoria=todos#catalogo" className="boton boton-linea w-full sm:w-auto">Ver el catálogo</Link>
        </Magnetico>
      </div>
      <a {...propsWhatsapp()} className={`${ENLACE} mt-7`}>
        <IconoWhatsapp size={15} />
        <span className="enlace-linea ml-2 pb-0.5">¿Te ayudamos? Escríbenos por WhatsApp</span>
      </a>
    </Aviso>
  );
}

/**
 * Va alrededor de las rutas (App.jsx). Al cambiar de ruta (`ruta`: location.key) vuelve a intentarlo.
 * El estado va en el constructor, nunca como campo de clase («state = …»): iOS 13 no lee campos de clase y la web
 * entera quedaría en blanco (lo vigila scripts/compatibilidad.mjs --salida).
 */
export class ErrorDePagina extends Component {
  constructor(props) {
    super(props);
    this.state = { fallo: false };
  }

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidUpdate(antes, estadoAntes) {
    // Solo si el fallo ya estaba: en el mismo cambio de ruta que falló, reintentar fallaría otra vez.
    if (this.state.fallo && estadoAntes.fallo && antes.ruta !== this.props.ruta) this.setState({ fallo: false });
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    // Sin el Layout (también pudo fallar): a pantalla completa, sin animaciones y con enlaces de página entera.
    return (
      <div className="min-h-screen bg-hueso">
        <Aviso
          animar={false}
          conLogo
          rotulo="Algo falló"
          titulo="No pudimos mostrar esta *página*"
          texto={horasEnteras('Recárgala o escríbenos por WhatsApp: una asesora te atiende de lunes a sábado de 9:00 a. m. a 6:00 p. m.')}
        >
          <div className={BOTONES}>
            <button type="button" onClick={() => window.location.reload()} className="boton boton-oscuro w-full sm:mr-3 sm:w-auto">
              <RotateCw className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
              <span>Recargar la página</span>
            </button>
            <a href="/" className="boton boton-linea mt-3 w-full sm:mt-0 sm:w-auto">Ir al inicio</a>
          </div>
          <p className="etiqueta mt-12 text-grafito/70">O escríbele a una asesora</p>
          <div className="mt-4">
            <LineasWhatsapp />
          </div>
        </Aviso>
      </div>
    );
  }
}
