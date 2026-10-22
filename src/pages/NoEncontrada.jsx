import React, { Component, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LINEAS_WHATSAPP, lineaWhatsapp, propsWhatsapp } from '../utils/whatsapp';
import { rutaDesconocida } from '../utils/rutas';

/**
 * NoEncontrada — cualquier ruta que la web no tiene (App.jsx → <Route path="*">). Antes la página quedaba en blanco,
 * sin menú ni chat: React Router no pinta nada si ninguna ruta coincide. Va dentro del Layout, así que el menú, el pie
 * y el asistente siguen a la vista. Qué se muestra según la ruta: utils/rutas.js.
 *
 * ErrorDePagina — si una página falla al pintarse (un error de nuestro código, o su archivo no carga tras publicar una
 * versión nueva), se ve un aviso con los WhatsApp en vez de la página en blanco.
 */

const BOTON_NEGRO = 'btn-primary inline-flex items-center justify-center rounded-xl bg-black px-8 py-4 text-xs font-bold uppercase tracking-widest text-white';
const BOTON_CLARO = 'inline-flex items-center justify-center rounded-xl bg-[#FDFCFA] px-8 py-4 text-xs font-bold uppercase tracking-widest text-black ring-1 ring-black/10 transition hover:ring-black';
const ENLACE = 'text-xs font-semibold text-gray-600 underline hover:text-black';

/** Título, una frase y lo que se puede hacer. */
function Aviso({ titulo, texto, children }) {
  return (
    <section className="px-6 pb-24 pt-36 text-[#1a1a1a]">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight md:text-4xl">{titulo}</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500 md:text-base">{texto}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

/** Los WhatsApp de las dos asesoras, cada uno con su número a la vista (como en el selector de línea). */
function LineasWhatsapp() {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      {LINEAS_WHATSAPP.map((l) => (
        <a key={l.numero} href={lineaWhatsapp(l.linea)} target="_blank" rel="noopener noreferrer"
          aria-label={`WhatsApp de la Línea ${l.linea}, ${l.visible}`}
          className="flex items-center justify-between gap-3 rounded-2xl bg-[#0e7a3e] px-5 py-4 text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f0ec]">
          <span className="text-base font-semibold">Línea {l.linea}</span>
          <span className="text-sm text-white/85">{l.visible}</span>
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
      <Aviso titulo="Catálogo de ofertas" texto="Te estamos llevando al catálogo de ofertas…">
        <a href="/ofertas" className={BOTON_NEGRO}>Ver las ofertas</a>
      </Aviso>
    );
  }
  if (tipo === 'asesoras') {
    return (
      <Aviso titulo="Escríbele a una asesora"
        texto="Te atiende una asesora de Dekog por WhatsApp, de lunes a sábado de 9:00 a. m. a 6:00 p. m. Las dos líneas atienden muebles y arquitectura.">
        <LineasWhatsapp />
        <Link to="/" className={ENLACE}>Ir al inicio</Link>
      </Aviso>
    );
  }
  return (
    <Aviso titulo="No encontramos esta página" texto="Puede que el enlace esté incompleto o que la página ya no exista.">
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/" className={BOTON_NEGRO}>Ir al inicio</Link>
        <Link to="/?categoria=todos#catalogo" className={BOTON_CLARO}>Ver el catálogo</Link>
      </div>
      <a {...propsWhatsapp()} className={ENLACE}>¿Te ayudamos? Escríbenos por WhatsApp</a>
    </Aviso>
  );
}

/** Va alrededor de las rutas (App.jsx). Al cambiar de ruta (`ruta`: location.key) vuelve a intentarlo. */
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
    // Sin el Layout (también pudo fallar): a pantalla completa, y con enlaces de página entera.
    return (
      <div className="min-h-screen bg-[#f4f0ec]">
        <Aviso titulo="No pudimos mostrar esta página"
          texto="Recárgala o escríbenos por WhatsApp: una asesora te atiende de lunes a sábado de 9:00 a. m. a 6:00 p. m.">
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className={BOTON_NEGRO}>Recargar la página</button>
            <a href="/" className={BOTON_CLARO}>Ir al inicio</a>
          </div>
          <LineasWhatsapp />
        </Aviso>
      </div>
    );
  }
}
