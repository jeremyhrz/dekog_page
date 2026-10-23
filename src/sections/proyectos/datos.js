import { CircleCheck, Globe, PenLine, ShieldCheck, Sofa } from 'lucide-react';
import { proyectosData } from '../../data/proyectosData';
import { irA } from '../../lib/scroll';

/**
 * Textos y reglas de /proyectos (renovación de 2026). Los hechos son los de la página de siempre y los de
 * src/data/sitio.js; los *asteriscos* van en cursiva madera (lib/texto.js). Las obras salen de src/data/proyectosData.js.
 */

export const CABECERA = {
  rotulo: `Portafolio · ${proyectosData.length} obras`,
  titulo: 'Proyectos que *se viven*',
  bajada: 'Espacios diseñados, construidos y *amoblados* para mejorar la vida de las personas.',
  foto: '/hero/IMG_3919.PNG',
  alt: 'Planos y muestras de materiales sobre la mesa de diseño',
};

/** Los filtros de siempre (la categoría de cada obra en proyectosData). */
export const FILTROS = [
  { valor: 'TODOS', texto: 'Todos' },
  { valor: 'RESIDENCIAL', texto: 'Residencial' },
  { valor: 'COMERCIAL', texto: 'Comercial' },
];

/** «Destacados» es el orden de proyectosData (el que eligió Dekog). */
export const ORDENES = [
  { valor: 'destacados', texto: 'Destacados' },
  { valor: 'az', texto: 'Nombre A–Z' },
];

/** Lo que distingue a Dekog: la franja de siempre de la página. */
export const VENTAJAS = [
  { titulo: 'Cobertura nacional', Icono: Globe },
  { titulo: 'Diseño integral', Icono: PenLine },
  { titulo: 'Ejecución y supervisión', Icono: ShieldCheck },
  { titulo: 'Mobiliario personalizado', Icono: Sofa },
  { titulo: 'De inicio a fin', Icono: CircleCheck },
];

/** Mensajes de WhatsApp (los de siempre): abren el selector de línea con el texto ya escrito. */
export const MENSAJES = {
  similar: (titulo) => `Hola DEKOG, me interesa un proyecto como ${titulo}`,
  proyecto: 'Hola DEKOG, tengo un proyecto en mente y me gustaría una asesoría.',
};

/**
 * Encuadre de cada portada en las tarjetas altas: las fotos son renders 16:9 y una tarjeta vertical solo muestra
 * la mitad del ancho, así que se corre hacia lo que importa (el letrero, la cruz, los listones de la fachada…).
 */
export const ENCUADRE = {
  'area-medica': '72% 50%',
  consorcio: '64% 50%',
  funeraria: '20% 50%',
  kaella: '60% 50%',
  maviz: '30% 50%',
  'piel-morena': '56% 50%',
  'casa-mos83': '24% 50%',
};

/**
 * Lleva el scroll al principio de las obras (#proyectos), con la barra de filtros arriba. Con un número y no con el
 * elemento: Lenis le resta al elemento el scroll-padding-top del sitio (80 px, index.css) y parte de su propia cuenta
 * del scroll, que puede ir atrasada. Al subir, la navegación vuelve a aparecer: se le deja su alto.
 */
export function irAObras({ subiendo = false } = {}) {
  const seccion = document.getElementById('proyectos');
  if (!seccion) return;
  const nav = subiendo ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--alto-nav')) || 64 : 0;
  irA(Math.round(seccion.getBoundingClientRect().top + window.scrollY - nav));
}

export const portadaDe = (obra) => `/assets/PROYECTOS/${obra.imageFolder || obra.imageFolders[0].folder}/${obra.portada}`;

export const fotosDe = (obra) => (obra.imageFolders
  ? obra.imageFolders.reduce((n, carpeta) => n + carpeta.images.length, 0)
  : obra.images.length);

/** «ÁREA MÉDICA» → «Área Médica»; lo que lleva cifras queda como está («CASA MOS83» → «Casa MOS83»). */
export const nombreObra = (titulo) => titulo
  .split(' ')
  .map((palabra) => (/\d/.test(palabra) ? palabra : palabra.charAt(0) + palabra.slice(1).toLowerCase()))
  .join(' ');

/**
 * Reparte las obras en filas de revista (escritorio, retícula de 12): una pareja ancha + alta, un trío de altas, la
 * pareja al revés, otro trío… Si al final sobran dos, van en pareja; si sobra una, va sola a todo lo ancho.
 * En cada fila, una tarjeta alta baja un escalón (`desfase`) para que la retícula respire.
 * Las clases van completas (Tailwind no ve las que se arman por partes).
 */
export function maquetar(total) {
  const piezas = [];
  let i = 0;
  let fila = 0;
  let anchaPrimero = true;
  while (i < total) {
    const quedan = total - i;
    if (quedan === 1) {
      piezas.push({ forma: 'sola', lg: 'lg:col-span-12 lg:col-start-1', desfase: false });
      i += 1;
    } else if (fila % 2 === 0 || quedan === 2) {
      if (anchaPrimero) {
        piezas.push(
          { forma: 'ancha', lg: 'lg:col-span-8 lg:col-start-1', desfase: false },
          { forma: 'alta', lg: 'lg:col-span-4 lg:col-start-9', desfase: true },
        );
      } else {
        piezas.push(
          { forma: 'alta', lg: 'lg:col-span-4 lg:col-start-1', desfase: true },
          { forma: 'ancha', lg: 'lg:col-span-8 lg:col-start-5', desfase: false },
        );
      }
      anchaPrimero = !anchaPrimero;
      i += 2;
    } else {
      piezas.push(
        { forma: 'alta', lg: 'lg:col-span-4 lg:col-start-1', desfase: false },
        { forma: 'alta', lg: 'lg:col-span-4 lg:col-start-5', desfase: true },
        { forma: 'alta', lg: 'lg:col-span-4 lg:col-start-9', desfase: false },
      );
      i += 3;
    }
    fila += 1;
  }
  return piezas;
}
