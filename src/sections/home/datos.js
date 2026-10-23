import { Armchair, Gem, Lamp, Layers, Ruler, ShieldCheck, User } from 'lucide-react';
import { productos } from '../../data/productos';

/**
 * Textos y datos de /home (Dekog Home, la línea de muebles). Son los de la página de siempre, ordenados para el estilo
 * editorial de 2026. Los *asteriscos* marcan la cursiva madera (lib/texto.js).
 * Las cuentas salen de data/productos.js con los mismos filtros del catálogo de la portada (sections/inicio/Catalogo):
 * «Sofás» incluye los puffs, y las camas se parten por subcategoría.
 */

const contar = (cumple) => productos.filter(cumple).length;

/** El catálogo de la portada ya filtrado (pages/Home.jsx lee ?categoria= y baja a #catalogo). */
export const enCatalogo = (clave) => `/?categoria=${clave}#catalogo`;

export const TOTAL_PIEZAS = productos.length;

export const MENSAJES = {
  general: 'Hola, quiero información sobre el mobiliario a la medida de Dekog Home.',
  asesoria: 'Hola, quiero asesoría personalizada para elegir el mobiliario de mi espacio.',
  proyecto: 'Hola, quiero empezar un proyecto de mobiliario con Dekog Home.',
};

export const CATEGORIAS = [
  {
    clave: 'sofas',
    nombre: 'Sofás y\u00a0puffs', // espacio duro: en un teléfono angosto corta «Sofás / y puffs», no «Sofás y / puffs»
    cuenta: contar((p) => p.categoria === 'Sofás'),
    unidad: 'modelos',
    foto: '/catalogo/doha.png',
    alt: 'Sofá curvo de Dekog Home en una sala cálida',
  },
  {
    clave: 'camas',
    nombre: 'Camas',
    cuenta: contar((p) => p.categoria === 'Camas'),
    unidad: 'diseños',
    foto: '/catalogo/oslo.png',
    alt: 'Cama tapizada de Dekog Home en una habitación luminosa',
  },
  {
    clave: 'mesas',
    nombre: 'Mesas',
    cuenta: contar((p) => p.categoria === 'Mesas'),
    unidad: 'modelos',
    foto: '/mesas/amsterdam.png',
    alt: 'Mesa de noche Amsterdam de Dekog Home con luz cálida',
  },
];

/** Las tres líneas de camas, como los botones del catálogo (Clásicas, Alta Gama y Kids). */
export const LINEAS_CAMAS = [
  { clave: 'camas-clasicas', nombre: 'Clásicas', cuenta: contar((p) => p.subcategoria === 'Camas Clásicas') },
  { clave: 'camas-alta-gama', nombre: 'Alta Gama', cuenta: contar((p) => p.subcategoria === 'Camas Alta Gama') },
  { clave: 'camas-kids', nombre: 'Kids', cuenta: contar((p) => p.subcategoria === 'Camas Kids') },
];

/** «Lo que hacemos»: cada servicio lleva a donde llevaba antes (catálogo filtrado, /arquitectura o una asesora). */
export const SERVICIOS = [
  {
    numero: '01',
    titulo: 'Mobiliario a medida',
    texto: 'Diseñamos y fabricamos muebles personalizados que se adaptan perfectamente a tu espacio.',
    icono: Armchair,
    ir: { ruta: enCatalogo('sofas'), etiqueta: 'Ver sofás y puffs' },
  },
  {
    numero: '02',
    titulo: 'Decoración',
    texto: 'Seleccionamos piezas decorativas que aportan estilo, personalidad y armonía a cada ambiente.',
    icono: Lamp,
    ir: { ruta: enCatalogo('mesas'), etiqueta: 'Ver mesas' },
  },
  {
    numero: '03',
    titulo: 'Acabados y texturas',
    texto: 'Elegimos materiales y acabados de alta calidad que elevan el diseño de tus espacios.',
    icono: Layers,
    ir: { ruta: '/arquitectura', etiqueta: 'Ver arquitectura' },
  },
  {
    numero: '04',
    titulo: 'Asesoría personalizada',
    texto: 'Te acompañamos en la elección de cada detalle para crear un espacio único y funcional.',
    icono: User,
    ir: { whatsapp: MENSAJES.asesoria, etiqueta: 'Escríbenos' },
  },
];

export const ENFOQUE = {
  titulo: 'Diseñamos experiencias para *vivir mejor*',
  valores: [
    { titulo: 'Funcionalidad', texto: 'Cada pieza cumple un propósito en tu día a día.', icono: Ruler },
    { titulo: 'Calidad', texto: 'Trabajamos con materiales duraderos y procesos cuidadosos.', icono: ShieldCheck },
    { titulo: 'Estética', texto: 'Creamos ambientes que transmiten estilo y bienestar.', icono: Gem },
  ],
};

export const PASOS = [
  { numero: '01', titulo: 'Conocemos tu espacio', texto: 'Escuchamos tus necesidades y estilo de vida.' },
  { numero: '02', titulo: 'Diseñamos contigo', texto: 'Propuestas de mobiliario y materiales.' },
  { numero: '03', titulo: 'Seleccionamos', texto: 'Elegimos cada pieza por su calidad.' },
  { numero: '04', titulo: 'Transformamos', texto: 'Hacemos realidad tu espacio ideal.' },
];

export const GARANTIA = {
  // Espacio duro (\u00a0) entre la cifra y «meses»: TextoDividido no los separa en dos renglones.
  cita: 'Garantía estructural: *18\u00a0meses* en camas Alta Gama y Kids, *12\u00a0meses* en camas Clásicas y *6\u00a0meses* en muebles.',
  plazos: [
    { meses: 18, texto: 'Camas Alta Gama y Kids' },
    { meses: 12, texto: 'Camas Clásicas' },
    { meses: 6, texto: 'Muebles' },
  ],
};
