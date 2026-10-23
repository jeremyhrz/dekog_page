import React, { useRef } from 'react';
import { useInView } from 'framer-motion';
import { ArrowUp, Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LogoAnimado } from './marca/Logo';
import { Enfasis } from './efectos/TextoDividido';
import { IconoWhatsapp } from './asistente/comun';
import { DEKOG, ENLACES } from '../data/sitio';
import { irA } from '../lib/scroll';
import { elegirWhatsapp } from '../utils/whatsapp';

const externo = { target: '_blank', rel: 'noopener noreferrer' };

// Enlaces al catálogo ya filtrado: los mismos ?categoria= que manda el asistente (pages/Home.jsx).
const CATALOGO = [
  ['Camas', '/?categoria=camas#catalogo'],
  ['Camas Alta Gama', '/?categoria=camas-alta-gama#catalogo'],
  ['Camas Kids', '/?categoria=camas-kids#catalogo'],
  ['Sofás y puffs', '/?categoria=sofas#catalogo'],
  ['Mesas', '/?categoria=mesas#catalogo'],
];

/** El logo a todo el ancho; se arma (rayas y palabra) la primera vez que se ve. */
function Firma() {
  const ref = useRef(null);
  const visto = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
  return (
    <div ref={ref} className="w-full" style={{ height: 'min(26vw, 230px)' }}>
      {visto && <LogoAnimado tono="blanco" alto="min(26vw, 230px)" retraso={0.1} />}
    </div>
  );
}

/**
 * Pie (renovación de 2026): la frase de Dekog en Bodoni, las páginas, el catálogo por categorías, el contacto y el
 * showroom, y el logo enorme que se arma al entrar en pantalla. id="contacto": lo usan los «#contacto» de las páginas.
 */
export default function Footer() {
  return (
    // pb-24 en teléfono: deja libre la última fila bajo el botón flotante del asistente.
    <footer id="contacto" className="sobre-oscuro relative overflow-hidden bg-noche pb-24 text-hueso sm:pb-0">
      <div className="contenedor grid grid-cols-1 gap-y-14 pt-20 lg:grid-cols-12 lg:gap-x-6 lg:pt-28">
        <div className="lg:col-span-6">
          <p className="etiqueta text-madera-claro">Dekog · {DEKOG.lema}</p>
          <Enfasis
            como="p"
            texto="Diseñamos, construimos y *amoblamos* espacios completos."
            className="mt-5 max-w-xl font-display text-[2.15rem] leading-[1.05] tracking-[-0.01em] lg:text-[3.3rem]"
          />
          <p className="mt-6 max-w-md text-hueso/65">Un solo equipo para todo tu proyecto. {DEKOG.alcance}.</p>
          <div className="mt-8 flex flex-wrap">
            <button type="button" onClick={() => elegirWhatsapp()} className="boton boton-claro mb-3 mr-3">
              <IconoWhatsapp size={17} />
              <span>Escríbenos</span>
            </button>
            <a href={DEKOG.mapa} {...externo} className="boton boton-linea mb-3">
              <MapPin className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Cómo llegar</span>
            </a>
          </div>
        </div>

        <nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-6">
          <div>
            <p className="etiqueta text-hueso/45">Explora</p>
            <ul className="mt-4 space-y-2.5">
              {ENLACES.map((e) => (
                <li key={e.ruta}>
                  <Link to={e.ruta} className="enlace-linea pb-0.5 hover:text-madera-claro">{e.nombre}</Link>
                </li>
              ))}
              <li><Link to="/contacto" className="enlace-linea pb-0.5 hover:text-madera-claro">Contacto</Link></li>
            </ul>
          </div>
          <div>
            <p className="etiqueta text-hueso/45">Catálogo</p>
            <ul className="mt-4 space-y-2.5">
              {CATALOGO.map(([texto, ruta]) => (
                <li key={ruta}>
                  <Link to={ruta} className="enlace-linea pb-0.5 hover:text-madera-claro">{texto}</Link>
                </li>
              ))}
              {/* ofertas.html y no /ofertas: el rewrite de vercel.json no existe en npm run dev. */}
              <li><a href="/ofertas.html" className="enlace-linea pb-0.5 hover:text-madera-claro">Ofertas en stock</a></li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="etiqueta text-hueso/45">Visítanos</p>
            <a href={DEKOG.mapa} {...externo} className="mt-4 block text-sm leading-relaxed text-hueso/80 hover:text-madera-claro">
              {DEKOG.showroom}
              <br />
              {DEKOG.zona}
            </a>
            <p className="mt-3 text-sm leading-relaxed text-hueso/60">{DEKOG.horario}</p>
            <ul className="mt-5 space-y-2.5 text-sm">
              <li>
                <a href={`tel:${DEKOG.telefono.replace(/\s/g, '')}`} className="enlace-linea inline-flex items-center pb-0.5 hover:text-madera-claro">
                  <Phone className="mr-2 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  {DEKOG.telefono}
                </a>
              </li>
              <li>
                <a href={`mailto:${DEKOG.correo}`} className="enlace-linea inline-flex items-center pb-0.5 hover:text-madera-claro">
                  <Mail className="mr-2 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  {DEKOG.correo}
                </a>
              </li>
              <li>
                <a href={DEKOG.instagram.home} {...externo} className="enlace-linea inline-flex items-center pb-0.5 hover:text-madera-claro">
                  <Instagram className="mr-2 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  @dekog.home
                </a>
              </li>
              <li>
                <a href={DEKOG.instagram.arquitectura} {...externo} className="enlace-linea inline-flex items-center pb-0.5 hover:text-madera-claro">
                  <Instagram className="mr-2 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  @dekog.arquitectura
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/share/1Hfbm8dQrs/?mibextid=wwXIfr" {...externo} className="enlace-linea inline-flex items-center pb-0.5 hover:text-madera-claro">
                  <Facebook className="mr-2 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <div className="lg:col-span-12">
          <Firma />
        </div>
      </div>

      <div className="contenedor">
        <div className="mt-10 flex flex-col border-t border-hueso/10 py-7 text-sm text-hueso/55 sm:flex-row sm:items-center sm:justify-between sm:pr-60">
          <p>© 2026 DEKOG · Todos los derechos reservados.</p>
          <p className="mt-3 sm:mt-0">
            <a href="/privacidad.html" className="enlace-linea pb-0.5 hover:text-hueso">Privacidad</a>
            <span aria-hidden="true" className="mx-3 text-hueso/25">·</span>
            <a href="/eliminacion-datos.html" className="enlace-linea pb-0.5 hover:text-hueso">Eliminar mis datos</a>
          </p>
          <button
            type="button"
            onClick={() => irA(0)}
            className="etiqueta mt-3 inline-flex min-h-[44px] items-center self-start text-hueso/75 transition-colors hover:text-madera-claro sm:mt-0 sm:self-auto"
          >
            Volver arriba
            <ArrowUp className="ml-2 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
