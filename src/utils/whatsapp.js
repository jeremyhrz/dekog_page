// Números de WhatsApp de Dekog. En la web, los botones de WhatsApp abren SelectorWhatsapp («¿Con quién quieres
// hablar?»: Línea 1 o Línea 2) con su mensaje ya escrito: la página ya tiene su propio chat, así que no manda a nadie al
// asistente de WhatsApp (pedido de la dueña, 9-oct). El número del asistente solo sale en /links (la bio de Instagram).
export const WHATSAPP = {
  asistente: '584124423350',
  linea1: '584145847791',
  linea2: '584244006086',
};

// Las dos líneas atienden todo (muebles y arquitectura).
export const LINEAS_WHATSAPP = [
  { linea: 1, numero: WHATSAPP.linea1, visible: '0414-584 7791' },
  { linea: 2, numero: WHATSAPP.linea2, visible: '0424-400 6086' },
];

export const enlaceWhatsapp = (numero, texto) => `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;

export const lineaWhatsapp = (linea, texto = 'Hola') => enlaceWhatsapp(linea === 2 ? WHATSAPP.linea2 : WHATSAPP.linea1, texto);

// Solo /links: con «Hola» a secas el asistente contesta con el saludo de la dueña y sus opciones (1, 2 y 3).
export const asistenteWhatsapp = (texto = 'Hola') => enlaceWhatsapp(WHATSAPP.asistente, texto);

export const EVENTO_WHATSAPP = 'dekog:whatsapp';
const TEXTO = 'Hola, tengo una consulta sobre sus servicios.';

/** Abre el selector de línea con ese mensaje ya escrito. */
export function elegirWhatsapp(texto = TEXTO) {
  window.dispatchEvent(new CustomEvent(EVENTO_WHATSAPP, { detail: { texto } }));
}

/** Para un <a>: sin JavaScript abre la Línea 1; con JavaScript, el selector. */
export const propsWhatsapp = (texto = TEXTO) => ({
  href: lineaWhatsapp(1, texto),
  target: '_blank',
  rel: 'noopener noreferrer',
  onClick: (e) => { e.preventDefault(); elegirWhatsapp(texto); },
});

/** El mensaje de un enlace wa.me (?text=…), para reusarlo en el selector. */
export function textoDeEnlace(url) {
  try {
    return new URL(url).searchParams.get('text') || TEXTO;
  } catch {
    return TEXTO;
  }
}
