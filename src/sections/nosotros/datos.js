import { DEKOG } from '../../data/sitio';

/**
 * Textos y cifras de /nosotros (renovación de 2026). Los hechos son los de la página de siempre (src/data/sitio.js y
 * asistente/src/lib/negocio.js dicen lo mismo); los *asteriscos* van en cursiva madera (lib/texto.js).
 */

/** «Únete a nuestro equipo»: el correo de Dekog con el asunto de las postulaciones («Postulación CV»). */
export const CORREO_CV = `mailto:${DEKOG.correo}?subject=${encodeURIComponent('Postulación CV')}`;

/** Lo que dice la cabecera y el mensaje con el que abre el WhatsApp desde esta página. */
export const CABECERA = {
  rotulo: 'Somos Dekog',
  titulo: 'Pasión por *transformar* espacios',
  bajada: 'Un equipo de arquitectos, ingenieros y diseñadores que trabaja para *mejorar la vida* de las personas.',
  whatsapp: 'Hola, quiero hablar con el equipo de Dekog sobre mi proyecto.',
};

/** Quiénes forman el equipo (la cinta de «Sobre nosotros»). */
export const EQUIPO = ['Arquitectos', 'Ingenieros', 'Diseñadores'];

// Espacio duro: deja junto «100 %» (que no se parta en dos renglones).
const ESPACIO_DURO = String.fromCharCode(160);

/** Las cifras de siempre; suben al verse (Contador). */
export const CIFRAS = [
  { valor: 120, antes: '+', despues: '', titulo: 'Proyectos realizados', detalle: DEKOG.alcance },
  { valor: 2, antes: '', despues: '', titulo: 'Líneas de servicio', detalle: 'Arquitectura + Home' },
  { valor: 100, antes: '', despues: `${ESPACIO_DURO}%`, titulo: 'Acompañamiento', detalle: 'De inicio a fin' },
];

/** Los tres valores de la página de siempre, con lo que ya dice la web de cada uno. */
export const VALORES = [
  { numero: '01', titulo: 'Visión integral', texto: 'Arquitectura, interiorismo y mobiliario pensados juntos, en un solo proceso.' },
  { numero: '02', titulo: 'Atención personalizada', texto: 'Escuchamos lo que necesitas y lo hacemos a la medida, para ti.' },
  { numero: '03', titulo: 'Compromiso y transparencia', texto: 'Te acompañamos de inicio a fin, con supervisión en cada etapa.' },
];
