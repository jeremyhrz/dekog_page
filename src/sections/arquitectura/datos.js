import {
  Box, ClipboardCheck, DraftingCompass, HardHat, KeyRound, PencilRuler, PenTool, ScanSearch, ShieldCheck,
} from 'lucide-react';

/**
 * Textos de /arquitectura (Dekog Arquitectura), los mismos de siempre de esta página, en el estilo de la renovación de
 * 2026. Los *asteriscos* marcan la cursiva madera (lib/texto.js). Las cifras salen de data/sitio.js.
 */

/** El mensaje de los botones de cotizar (el mismo de la línea Arquitectura en la portada, data/sitio.js → LINEAS). */
export const MENSAJE = 'Hola, quiero cotizar un proyecto de arquitectura.';

/** Nuestro servicio integral: los seis pasos que hace el mismo equipo. */
export const SERVICIOS = [
  {
    icono: DraftingCompass,
    titulo: 'Diseño arquitectónico',
    texto: 'Desarrollamos propuestas creativas y funcionales, adaptadas a tus necesidades.',
  },
  {
    icono: Box,
    titulo: 'Modelado 3D y visualización',
    texto: 'Creamos imágenes realistas para que visualices tu proyecto antes de construir.',
  },
  {
    icono: PencilRuler,
    titulo: 'Planos y documentación',
    texto: 'Elaboramos los planos técnicos detallados y los documentos necesarios para la ejecución.',
  },
  {
    icono: HardHat,
    titulo: 'Ejecución de obra',
    texto: 'Construimos tu proyecto con materiales de calidad y mano de obra especializada.',
  },
  {
    icono: ClipboardCheck,
    titulo: 'Supervisión y control',
    texto: 'Supervisamos cada etapa para que se cumplan el diseño, los tiempos y el presupuesto.',
  },
  {
    icono: KeyRound,
    titulo: 'Entrega final',
    texto: 'Entregamos tu obra lista para disfrutarla, con cada detalle cuidado.',
  },
];

/**
 * Tipos de proyectos: los renders de public/arquitectura (16:9) en tarjetas altas, así que cada uno lleva el punto de
 * la foto que queda a la vista (`posicion`). Cada tarjeta abre el selector de WhatsApp con su propio mensaje.
 */
export const TIPOS = [
  {
    nombre: 'Residencial',
    foto: '/arquitectura/residencial.jpeg',
    posicion: '18% 50%',
    alt: 'Render de la fachada de una casa con columnas de listones de madera',
    mensaje: 'Hola, quiero cotizar un proyecto residencial.',
  },
  {
    nombre: 'Comercial',
    foto: '/arquitectura/comercial2.jpeg',
    posicion: '24% 50%',
    alt: 'Render de un local comercial: un área médica con mostrador de mármol y estantes iluminados',
    mensaje: 'Hola, quiero cotizar un proyecto comercial.',
  },
  {
    nombre: 'Oficinas',
    foto: '/arquitectura/oficina.jpeg',
    posicion: '52% 50%',
    alt: 'Render de unas oficinas con sala de espera y despachos de vidrio',
    mensaje: 'Hola, quiero cotizar un proyecto de oficinas.',
  },
  {
    nombre: 'Remodelaciones',
    foto: '/arquitectura/interiorismo.jpeg',
    posicion: '46% 50%',
    alt: 'Render de una cocina abierta remodelada, con isla de mármol y sillas azules',
    mensaje: 'Hola, quiero cotizar una remodelación.',
  },
  {
    nombre: 'Interiorismo arquitectónico',
    foto: '/arquitectura/comercial.jpeg',
    posicion: '84% 50%',
    alt: 'Render de un salón con sofás claros y un muro de mármol iluminado',
    mensaje: 'Hola, quiero cotizar un proyecto de interiorismo arquitectónico.',
  },
];

/** Lo que acompaña al «Cotiza tu proyecto» de la banda oscura. */
export const VALORES = ['Atención personalizada', 'Compromiso y transparencia', 'Calidad en cada detalle'];

/** Nuestro enfoque. */
export const ENFOQUE = [
  {
    icono: ScanSearch,
    titulo: 'Planificación inteligente',
    texto: 'Analizamos cada detalle para crear estrategias eficientes y realistas.',
  },
  {
    icono: PenTool,
    titulo: 'Diseño funcional y estético',
    texto: 'Combinamos creatividad y técnica para diseñar espacios únicos.',
  },
  {
    icono: ShieldCheck,
    titulo: 'Ejecución con calidad',
    texto: 'Trabajamos con estándares altos y proveedores de confianza.',
  },
];

/** Así trabajamos: los cinco pasos de la línea de tiempo. */
export const PASOS = [
  { numero: '01', titulo: 'Escuchamos', texto: 'Entendemos tus necesidades, ideas y objetivos.' },
  { numero: '02', titulo: 'Diseñamos', texto: 'Desarrollamos la propuesta arquitectónica y visualizamos tu proyecto.' },
  { numero: '03', titulo: 'Planificamos', texto: 'Definimos tiempos, costos y recursos para una ejecución eficiente.' },
  { numero: '04', titulo: 'Construimos', texto: 'Ejecutamos la obra con calidad y supervisión constante.' },
  { numero: '05', titulo: 'Entregamos', texto: 'Culminamos tu proyecto y lo entregamos listo para vivir o trabajar.' },
];
