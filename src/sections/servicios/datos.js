import { irA } from '../../lib/scroll';

/**
 * Los cinco servicios de /servicios (los de siempre, con sus fotos de public/servicios/ y su texto). `titulo` lleva el
 * *énfasis* en cursiva madera; `nombre`, el texto plano (marquesina, etiquetas). `mensaje`: lo que se escribe solo en
 * WhatsApp al pulsar «Cotizar este servicio».
 */
export const SERVICIOS = [
  {
    numero: '01',
    nombre: 'Diseño arquitectónico',
    titulo: 'Diseño *arquitectónico*',
    foto: '/servicios/Diseño arquitectónico1.PNG',
    alt: 'Boceto a mano de la fachada principal de un proyecto',
    texto: 'Conceptualización y planificación detallada de tus espacios, integrando funcionalidad y estética desde el primer trazo.',
    mensaje: 'Hola, quisiera cotizar el diseño arquitectónico de un proyecto.',
  },
  {
    numero: '02',
    nombre: 'Modelado 3D',
    titulo: 'Modelado *3D*',
    foto: '/servicios/Modelado 3D2.jpeg',
    alt: 'Render en 3D de la misma fachada, con su estacionamiento',
    texto: 'Visualización hiperrealista para que experimentes y apruebes el diseño final antes de iniciar la construcción.',
    mensaje: 'Hola, quisiera cotizar el modelado 3D de un proyecto.',
  },
  {
    numero: '03',
    nombre: 'Ejecución de obra',
    titulo: 'Ejecución *de obra*',
    foto: '/servicios/03.png',
    alt: 'Obra en construcción: estructura de concreto y materiales en el terreno',
    texto: 'Llevamos el diseño a la realidad con los más altos estándares de construcción, respetando plazos y calidad.',
    mensaje: 'Hola, quisiera cotizar la ejecución de una obra.',
  },
  {
    numero: '04',
    nombre: 'Supervisión de obra',
    titulo: 'Supervisión *de obra*',
    foto: '/servicios/Supervisión de obra4.PNG',
    alt: 'Supervisión en obra: revisión de los planos frente a la fachada',
    texto: 'Control riguroso de cada etapa del proyecto para garantizar fidelidad absoluta al diseño original.',
    mensaje: 'Hola, quisiera cotizar la supervisión de una obra.',
  },
  {
    numero: '05',
    nombre: 'Mobiliario y decoración',
    titulo: 'Mobiliario *y decoración*',
    foto: '/servicios/mobiliario y decoracion5.PNG',
    alt: 'Sala amoblada y decorada, con un sofá modular y una mesa de centro tapizada',
    texto: 'Selección e instalación de piezas exclusivas y mobiliario a medida que completan la experiencia del espacio.',
    mensaje: 'Hola, quisiera cotizar mobiliario y decoración para un espacio.',
  },
];

export const TOTAL_SERVICIOS = String(SERVICIOS.length).padStart(2, '0');

/** El mensaje de «Cotiza tu proyecto» (el de la página de siempre). */
export const MENSAJE_COTIZAR = 'Hola, quisiera solicitar asesoría para un proyecto';

/** El id de cada servicio en la página (el sumario de la cabecera y las barras del arco bajan hasta él). */
export const idServicio = (servicio) => `servicio-${servicio.numero}`;

/**
 * Baja hasta un servicio con su borde de arriba al 10 % de la pantalla: en escritorio, su foto ya está entera en el
 * arco. A una posición y no al elemento: con un elemento, Lenis resta además el scroll-padding-top de index.css
 * (80 px) y sin Lenis (teléfono, tableta) no; así cae en el mismo sitio con y sin él.
 */
export function irAlServicio(servicio) {
  const destino = document.getElementById(idServicio(servicio));
  if (!destino) return;
  irA(destino.getBoundingClientRect().top + window.scrollY - Math.round(window.innerHeight * 0.1));
}
