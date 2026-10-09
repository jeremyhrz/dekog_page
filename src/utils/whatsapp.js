// Números de WhatsApp de Dekog. El del asistente (el bot) es la puerta principal: responde al instante, a cualquier
// hora, y pasa a una asesora con el resumen de lo que el cliente quiere. Las líneas de las asesoras quedan para lo
// que ya pide una persona: comprar lo del carrito, el formulario de contacto, llamar y la salida del chat de la web.
export const WHATSAPP = {
  asistente: '584124423350',
  linea1: '584145847791', // Home
  linea2: '584244006086', // Arquitectura
};

export const enlaceWhatsapp = (numero, texto) => `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;

// Con «Hola» a secas el asistente contesta con el saludo de la dueña y sus opciones (1, 2 y 3).
export const asistenteWhatsapp = (texto = 'Hola') => enlaceWhatsapp(WHATSAPP.asistente, texto);
