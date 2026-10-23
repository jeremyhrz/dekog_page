/**
 * Datos y textos de la web renovada (2026). Los hechos del negocio son los mismos que tiene el asistente
 * (asistente/src/lib/negocio.js): showroom, horario, líneas de WhatsApp, Instagram. Si cambia uno, cambian los dos.
 * Los *asteriscos* marcan las palabras que van en cursiva madera (lib/texto.js).
 */

export const DEKOG = {
  lema: 'Diseñamos · Construimos · Amoblamos',
  showroom: 'CC Vía Veneto, Nivel Roma, Local R17',
  zona: 'Mañongo, Naguanagua · Carabobo',
  horario: 'Lunes a sábado · 9:00 a. m. a 6:00 p. m.',
  alcance: 'Trabajamos a nivel nacional',
  correo: 'dekog.inf@gmail.com',
  telefono: '+58 414 584 7791',
  instagram: { home: 'https://www.instagram.com/dekog.home/', arquitectura: 'https://www.instagram.com/dekog.arquitectura/' },
  mapa: 'https://www.google.com/maps/place/Dekog+Home/@10.2337844,-68.0020215,17z',
};

/** Enlaces de la navegación (las rutas de siempre: el chat saluda distinto en cada una, ver AsistenteChat.jsx). */
export const ENLACES = [
  { nombre: 'Inicio', ruta: '/', foto: '/hero/IMG_3917.PNG' },
  { nombre: 'Nosotros', ruta: '/nosotros', foto: '/nosotros/PRINCIPAL.jpeg' },
  { nombre: 'Home', ruta: '/home', foto: '/hero/IMG_3918.PNG' },
  { nombre: 'Arquitectura', ruta: '/arquitectura', foto: '/arquitectura/principal.jpeg' },
  { nombre: 'Proyectos', ruta: '/proyectos', foto: '/hero/02_6 - Foto.jpg.jpeg' },
  { nombre: 'Servicios', ruta: '/servicios', foto: '/servicios/imagen central.jpeg' },
];

export const PORTADA = {
  rotulo: 'Arquitectura · Interiorismo · Mobiliario',
  titular: 'Espacios que *inspiran,* muebles que *perduran*',
  bajada: 'Un solo equipo para todo tu proyecto: diseñamos, construimos y *amoblamos* a la medida, del primer trazo al último detalle.',
  // Las tarjetas de la pila (recorte vertical de las fotos del hero).
  fotos: [
    { src: '/hero/IMG_3918.PNG', alt: 'Habitación con cama tapizada de Dekog Home', linea: 'Dekog Home' },
    { src: '/hero/IMG_3917.PNG', alt: 'Sala con sofá modular de Dekog Home', linea: 'Dekog Home' },
    { src: '/hero/02_6 - Foto.jpg.jpeg', alt: 'Fachada con listones de madera diseñada por Dekog Arquitectura', linea: 'Dekog Arquitectura', posicion: '42% 50%' },
  ],
};

export const BENEFICIOS = ['Diseñamos', 'Construimos', 'Amoblamos', 'Hecho a la medida', 'Llave en mano', 'A nivel nacional'];
export const RUBROS = ['Camas', 'Sofás', 'Puffs', 'Mesas', 'Interiorismo', 'Arquitectura', 'Modelado 3D', 'Remodelaciones', 'Supervisión de obra'];

/**
 * Las cuatro líneas de trabajo, para el escenario fijo de la portada (Lineas.jsx): al bajar, la sección se tiñe del
 * color de cada una. El texto va en hueso: contrasta ≥ 7:1 con los cuatro fondos.
 */
export const LINEAS = [
  {
    numero: '01',
    nombre: 'Mobiliario',
    marca: 'Dekog Home',
    frase: 'Camas, sofás y mesas hechos a la medida',
    foto: '/hero/IMG_3918.PNG',
    ruta: '/home',
    fondo: '#4A3A2E',
    mensaje: 'Hola, quiero información sobre el mobiliario a la medida de Dekog Home.',
  },
  {
    numero: '02',
    nombre: 'Arquitectura',
    marca: 'Dekog Arquitectura',
    frase: 'Diseño arquitectónico y modelado 3D',
    foto: '/arquitectura/principal.jpeg',
    ruta: '/arquitectura',
    fondo: '#26323B',
    mensaje: 'Hola, quiero cotizar un proyecto de arquitectura.',
  },
  {
    numero: '03',
    nombre: 'Construcción',
    marca: 'Ejecución de obra',
    frase: 'Construimos y supervisamos cada etapa',
    foto: '/servicios/Supervisión de obra4.PNG',
    ruta: '/servicios',
    fondo: '#6E4332',
    mensaje: 'Hola, quiero información sobre construcción y supervisión de obra.',
  },
  {
    numero: '04',
    nombre: 'Interiorismo',
    marca: 'Llave en mano',
    frase: 'Espacios completos, listos para vivirlos',
    foto: '/servicios/imagen central.jpeg',
    ruta: '/proyectos',
    fondo: '#3B463E',
    mensaje: 'Hola, quiero un proyecto de interiorismo llave en mano.',
  },
];

export const PROCESO = {
  cita: 'Del primer trazo al último *detalle*',
  pasos: [
    { numero: '01', titulo: 'Diseño arquitectónico', texto: 'Escuchamos lo que necesitas y lo llevamos a planos.' },
    { numero: '02', titulo: 'Modelado 3D', texto: 'Ves tu espacio terminado antes de construirlo.' },
    { numero: '03', titulo: 'Ejecución de obra', texto: 'Construimos con supervisión en cada etapa.' },
    { numero: '04', titulo: 'Mobiliario y decoración', texto: 'Lo amoblamos con piezas hechas a la medida.' },
  ],
  cifras: [
    { valor: 120, antes: '+', despues: '', texto: 'proyectos entregados' },
    { valor: 2, antes: '', despues: '', texto: 'líneas: Home y Arquitectura' },
    { valor: 100, antes: '', despues: ' %', texto: 'acompañamiento' },
  ],
};
