import React from 'react';
import './LinksPage.css';

const CARDS = [
  {
    tag: 'ENLACE',
    title: 'Sitio Web',
    subtitle: 'www.dekog.net',
    href: '/',
    image: '/links/tarjeta-web.png',
    type: 'web',
    span: 2,
  },
  {
    tag: 'CONTACTO',
    title: 'Mañongo I',
    subtitle: 'ASESORÍA Y VENTAS',
    href: 'https://wa.me/584145847791?text=Hola',
    image: '/links/manongo1.png',
    type: 'whatsapp',
    span: 1,
  },
  {
    tag: 'CONTACTO',
    title: 'Mañongo II',
    subtitle: 'ASESORÍA Y VENTAS',
    href: 'https://wa.me/584244006086?text=Hola',
    image: '/links/manongo2.png',
    type: 'whatsapp',
    span: 1,
  },
  {
    tag: 'CONTACTO',
    title: 'El Viñedo',
    subtitle: 'SEDE PRINCIPAL',
    href: 'https://wa.me/584124423350?text=Hola',
    image: '/links/vinedo.png',
    type: 'whatsapp',
    span: 1,
  },
  {
    tag: 'CATÁLOGO',
    title: 'Camas',
    subtitle: 'VER COLECCIÓN',
    href: 'https://drive.google.com/file/d/1sTpDlNajdFht5YtRc7kBNWWN0eb5Wm6D/view',
    image: '/links/camas-catalogo.png',
    type: 'catalog',
    span: 2,
  },
  {
    tag: 'CATÁLOGO',
    title: 'Mobiliario',
    subtitle: 'VER COLECCIÓN',
    href: 'https://drive.google.com/file/d/177KJwPkHzjgh88FgSTqLXcRNWTrR3byE/view',
    image: '/links/mobiliario-catalogo.png',
    type: 'catalog',
    span: 2,
  },
  {
    tag: 'UBICACIÓN',
    title: 'Sede Mañongo',
    subtitle: 'CÓMO LLEGAR',
    href: 'https://www.google.com/maps/dir/Av.+168+Salvador+Feo+La+Cruz+Este+-+Oeste,+Naguanagua+2005,+Carabobo/Centro+Comercial+Via+Veneto,+local+V29,+Nivel+Venezia,+Avenida+168+Salvador+Feo+La+Cruz+Este+-+Oeste,+CC+V%C3%ADa+Veneto,+Naguanagua+2005,+Carabobo/@10.233883,-67.9997324,20z',
    image: '/links/manongo-ubicacion.png',
    type: 'map',
    span: 2,
  },
  {
    tag: 'UBICACIÓN',
    title: 'Sede El Viñedo',
    subtitle: 'CÓMO LLEGAR',
    href: 'https://www.google.com/maps/search/?api=1&query=Marvica+C.A.+Valencia',
    image: '/links/vinedo-ubicacion.png',
    type: 'map',
    span: 2,
  },
];

export default function LinksPage() {
  return (
    <div className="g-page">
      <div className="g-bg" aria-hidden="true"></div>

      <main className="g-content">
        <h1 className="g-title">DEKOG</h1>
        <p className="g-subtitle">DISEÑAMOS · CONSTRUIMOS · AMOBLAMOS</p>

        <div className="g-grid-wrapper">
          <div className="g-grid">
            {CARDS.map((c, i) => {
              const isMap = c.type === 'map';

              /* Overlay reforzado en tarjetas de ubicación para legibilidad
                 bajo luz solar directa (stop 1: 0.55 → stop 2: 0.90) */
              const bgStyle = isMap
                ? {
                    backgroundImage: `linear-gradient(
                      to bottom,
                      rgba(11,11,13,0.55) 0%,
                      rgba(11,11,13,0.90) 100%
                    ), url(${c.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }
                : {
                    backgroundImage: `url(${c.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  };

              return (
                <a
                  key={i}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="g-card"
                  style={{ '--col-span': c.span }}
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
