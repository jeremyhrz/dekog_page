import React from 'react';
import './LinksPage.css';
import { varianteHasta } from '../utils/imagenes';
import { asistenteWhatsapp, lineaWhatsapp } from '../utils/whatsapp';

const CARDS = [
  {
    tag: 'WHATSAPP · 24/7',
    title: 'Asistente Dekog',
    subtitle: 'MODELOS Y PRECIOS AL INSTANTE',
    href: asistenteWhatsapp(),
    image: '/links/vinedo.webp',
    type: 'whatsapp',
    span: 3,
  },
  {
    tag: 'CONTACTO',
    title: 'Línea 1',
    subtitle: 'ASESORÍAS Y VENTAS',
    href: lineaWhatsapp(1),
    image: '/links/vinedo.webp', // la misma foto que el asistente: se baja una vez
    type: 'whatsapp',
    span: 1,
  },
  {
    tag: 'CONTACTO',
    title: 'Línea 2',
    subtitle: 'ASESORÍAS Y VENTAS',
    href: lineaWhatsapp(2),
    image: '/links/vinedo.webp', // la misma foto que el asistente: se baja una vez
    type: 'whatsapp',
    span: 1,
  },
  {
    tag: 'ENLACE',
    title: 'Sitio Web',
    subtitle: 'www.dekog.net',
    href: '/',
    image: '/links/tarjeta-web.webp',
    type: 'web',
    span: 1,
  },
  {
    tag: 'CATÁLOGO',
    title: 'Camas',
    subtitle: 'VER COLECCIÓN',
    href: 'https://drive.google.com/file/d/1sTpDlNajdFht5YtRc7kBNWWN0eb5Wm6D/view',
    image: '/links/camas-catalogo.webp',
    type: 'catalog',
    span: 1,
    posicion: 'left center', // el texto de la portada está a la izquierda
  },
  {
    tag: 'CATÁLOGO',
    title: 'Mobiliario',
    subtitle: 'VER COLECCIÓN',
    href: 'https://drive.google.com/file/d/177KJwPkHzjgh88FgSTqLXcRNWTrR3byE/view',
    image: '/links/mobiliario-catalogo.webp',
    type: 'catalog',
    span: 1,
    posicion: 'left center',
  },
  {
    tag: 'UBICACIÓN',
    title: 'Showroom Vía Veneto',
    subtitle: 'NIVEL ROMA · LOCAL R17',
    href: 'https://www.google.com/maps/place/Dekog+Home/@10.2337844,-68.0020215,17z/data=!3m1!4b1!4m6!3m5!1s0x8e8067bc8767db79:0x47e49c019b1dfaea!8m2!3d10.2337844!4d-67.9994466!16s%2Fg%2F11t4t66cy3?hl=es&entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D',
    image: '/links/manongo-ubicacion.webp',
    type: 'map',
    span: 1,
  }
];

export default function LinksPage() {
  return (
    <div className="g-page">
      <div className="g-bg" aria-hidden="true"></div>

      <main className="g-content">
        <h1 className="g-title">DEKOG</h1>
        <p className="g-subtitle">DISEÑAMOS · CONSTRUIMOS · AMOBLAMOS</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto mt-12 px-6">
          {CARDS.map((c, i) => {
            const isMap = c.type === 'map';
            // Variante WebP de 1200 px (scripts/optimizar_imagenes.py): las originales pesan 1,2–1,7 MB cada una.
            const fondo = varianteHasta(c.image, 1200);

            /* Overlay reforzado en tarjetas de ubicación para legibilidad
               bajo luz solar directa (stop 1: 0.55 → stop 2: 0.90) */
            const bgStyle = isMap
              ? {
                  backgroundImage: `linear-gradient(
                    to bottom,
                    rgba(11,11,13,0.55) 0%,
                    rgba(11,11,13,0.90) 100%
                  ), url("${fondo}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }
              : {
                  backgroundImage: `url("${fondo}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: c.posicion ?? 'center',
                  backgroundRepeat: 'no-repeat',
                };

            return (
              <a
                key={i}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`g-card ${c.span === 2 ? 'md:col-span-2' : ''} ${c.span === 3 ? 'md:col-span-2 lg:col-span-3' : ''} ${c.clase ?? ''}`}
                aria-label={`${c.title} — ${c.subtitle}`}
              >
                <span className="g-tag" aria-hidden="true">{c.tag}</span>
                <div className="g-screen">
                  <div className="g-card-bg" style={bgStyle} role="img" aria-label={c.title}></div>
                  <div className="g-card-text">
                    <div className="g-card-t">{c.title}</div>
                    <div className="g-card-s">{c.subtitle}</div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        <footer className="g-footer">
          <nav className="g-socials" aria-label="Redes sociales">
            <a
              href="https://www.instagram.com/dekog.home/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de Dekog Home"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a
              href="https://www.facebook.com/dekog.home"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook de Dekog Home"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
          </nav>
          <p className="g-copy">
            Copyright &copy; {new Date().getFullYear()} Dekog Home
          </p>
        </footer>
      </main>
    </div>
  );
}
