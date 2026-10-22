// Formato de los enlaces (21-oct): en Instagram, un enlace pegado a otro texto o a la marca invisible salía cortado o
// sin azul (el de la asesora llevaba a dekog.net/a). Y la dueña pidió las DOS asesoras en cada pase. IA: «prueba».
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SECRETO_WA, SECRETO_IG, kvEnMemoria, metaFalso, entregar, avisoWa, textoWa, avisoIg } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { enlacesEnSuLinea, bloqueAsesoras, conCola } from '../src/canales/meta.js';
import { textoParaInstagram, partirPorBytes, instagramPost, MARCA } from '../src/canales/instagram.js';
import { whatsappPost } from '../src/canales/whatsapp.js';
import { lineas, asesorasDirectas, numeroDelAsistente } from '../src/lib/negocio.js';
import { LINEAS_WHATSAPP, WHATSAPP } from '../../src/utils/whatsapp.js';
import { pensar, prometeBotonDeAsesora } from '../src/chat.js';

let env;
let meta;
beforeEach(() => { env = { CONVERSACIONES: kvEnMemoria() }; meta = metaFalso(); globalThis.fetch = meta.fetchFalso; });
const mensajesWa = () => meta.enviados.filter((e) => e.url.endsWith('/PHONE123/messages') && e.cuerpo.type).map((e) => e.cuerpo);

test('enlacesEnSuLinea: cada enlace solo en su línea, sin la puntuación pegada; lo que ya cumple no cambia', () => {
  assert.equal(enlacesEnSuLinea('🏷️ Catálogo de ofertas: https://www.dekog.net/ofertas'), '🏷️ Catálogo de ofertas:\nhttps://www.dekog.net/ofertas');
  assert.equal(enlacesEnSuLinea('Mira aquí https://www.dekog.net/ofertas. ¿Te ayudo?'), 'Mira aquí\nhttps://www.dekog.net/ofertas\n¿Te ayudo?');
  assert.equal(enlacesEnSuLinea('(https://wa.me/584145847791)'), '(\nhttps://wa.me/584145847791');
  const listo = 'Línea 1 (0414-584 7791):\nhttps://www.dekog.net/a/k3P9xQ\n\nLínea 2 (0424-400 6086):\nhttps://www.dekog.net/a/Zt7mQ2';
  assert.equal(enlacesEnSuLinea(listo), listo);
  assert.equal(enlacesEnSuLinea(enlacesEnSuLinea('ver https://a.b/c, y https://d.e/f')), 'ver\nhttps://a.b/c\ny\nhttps://d.e/f');
  assert.equal(enlacesEnSuLinea('sin enlaces, REF 1.290.'), 'sin enlaces, REF 1.290.');
});

test('Instagram: la marca va al final con un espacio delante, nunca pegada a un enlace', () => {
  assert.equal(textoParaInstagram('Escríbele aquí:\nhttps://www.dekog.net/a/p4Xed8'), `Escríbele aquí:\nhttps://www.dekog.net/a/p4Xed8 ${MARCA}`);
  assert.equal(textoParaInstagram('Hola 👋\n\n'), `Hola 👋 ${MARCA}`);
  assert.equal(textoParaInstagram('ver https://www.dekog.net/ofertas'), `ver\nhttps://www.dekog.net/ofertas ${MARCA}`);
});

test('Instagram: al partir un texto largo nunca se parte un enlace, y ningún trozo pasa de 1000 bytes con la marca', () => {
  const relleno = 'palabra '.repeat(120);
  const texto = `${relleno}https://www.dekog.net/a/k3P9xQ ${relleno}https://www.dekog.net/ofertas fin`;
  const trozos = partirPorBytes(texto);
  assert.ok(trozos.length >= 2);
  for (const t of trozos) {
    assert.ok(new TextEncoder().encode(textoParaInstagram(t)).length <= 1000, `${t.length} caracteres`);
    for (const l of t.split('\n')) if (l.includes('https://')) assert.match(l, /^https:\/\/www\.dekog\.net\/(a\/k3P9xQ|ofertas)$/);
  }
});

test('Instagram: una respuesta de 997 bytes pasa por procesar y enviar en trozos de 1000 bytes como mucho, con la marca', async () => {
  const bytes = (s) => new TextEncoder().encode(s).length;
  // Lo justo para que, sin contar el espacio de la marca, un trozo de 997 bytes saliera con 1001.
  const respuesta = `${`Soy el asistente de Dekog y te cuento: ${'palabra '.repeat(130)}`.slice(0, 996)}x`;
  assert.equal(bytes(respuesta), 997);
  const anterior = globalThis.fetch;
  const salida = { respuesta, productos: [], derivar: { necesario: false, area: 'home', resumen: '' }, ofrecer_formulario: false };
  globalThis.fetch = async (url, o) => (String(url).includes('generativelanguage.googleapis.com')
    ? new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(salida) }] } }] }))
    : meta.fetchFalso(url, o));
  Object.assign(config, { ASISTENTE_PROVEEDOR: '', GEMINI_API_KEY: 'clave-falsa' });
  try {
    await entregar(instagramPost, avisoIg({ text: '¿Cuánto tarda la fabricación?' }, 'IGSID997'), SECRETO_IG, env);
  } finally {
    globalThis.fetch = anterior;
    config.ASISTENTE_PROVEEDOR = 'prueba';
    delete config.GEMINI_API_KEY;
  }
  const textos = meta.enviados.filter((e) => e.url.endsWith('/me/messages') && e.cuerpo.message.text).map((e) => e.cuerpo.message.text);
  assert.ok(textos.length >= 2, `${textos.length} mensajes`);
  for (const t of textos) assert.ok(bytes(t) <= 1000 && t.endsWith(` ${MARCA}`), `${bytes(t)} bytes`);
  assert.equal(textos.map((t) => t.slice(0, -2)).join(' '), respuesta); // no se perdió ni se repitió nada
});

test('Instagram: a un trozo de partirPorBytes, textoParaInstagram solo le agrega el espacio y la marca (4 bytes)', () => {
  const bytes = (s) => new TextEncoder().encode(s).length;
  const relleno = 'palabra '.repeat(110);
  const texto = `${relleno}https://www.dekog.net/a/k3P9xQ, ${relleno}(mira https://www.dekog.net/ofertas). ${relleno}y Línea 2:\nhttps://www.dekog.net/a/Zt7mQ2`;
  const trozos = partirPorBytes(texto);
  assert.ok(trozos.length >= 3);
  for (const t of trozos) {
    assert.equal(textoParaInstagram(t), `${t} ${MARCA}`);
    assert.equal(bytes(textoParaInstagram(t)), bytes(t) + 4);
  }
});

test('Las dos asesoras: los mismos números y nombres en el bot y en la web', () => {
  assert.deepEqual(
    Object.values(lineas).map((l) => [l.numero, l.etiqueta, l.visible]),
    LINEAS_WHATSAPP.map((l) => [l.numero, `Línea ${l.linea}`, l.visible]),
  );
  assert.equal(bloqueAsesoras(asesorasDirectas(), null),
    'Línea 1 (0414-584 7791):\nhttps://wa.me/584145847791\n\nLínea 2 (0424-400 6086):\nhttps://wa.me/584244006086');
});

test('El número del asistente es el mismo en el bot y en la web (/links): si un cliente lo escribe, no es el suyo', () => {
  assert.equal(numeroDelAsistente, WHATSAPP.asistente);
});

test('WhatsApp: el pase con foto lleva las DOS asesoras al pie, enteras aunque el texto sea largo (1024 máximo)', async () => {
  await wa(textoWa('Quiero comprar la Toronto, ¿hacen envío a Maracay?'));
  const [foto] = mensajesWa();
  assert.equal(foto.type, 'image');
  assert.ok(foto.image.caption.length <= 1024);
  assert.match(foto.image.caption, /\n\nHabla con una asesora por WhatsApp 👇\n\nLínea 1 \(0414-584 7791\):\nhttps:\/\/\S+\n\nLínea 2 \(0424-400 6086\):\nhttps:\/\/\S+$/);
  const largo = conCola('x'.repeat(2000), bloqueAsesoras(asesorasDirectas()), 1024);
  assert.ok(largo.length <= 1024 && largo.endsWith('https://wa.me/584244006086'));
});

test('Emergencia: el texto no promete un botón que no existe y el pase lleva las dos asesoras', async () => {
  const anterior = globalThis.fetch;
  try {
    const { config } = await import('../src/lib/config.js');
    const proveedor = config.ASISTENTE_PROVEEDOR;
    config.ASISTENTE_PROVEEDOR = '';
    config.GEMINI_API_KEY = 'clave-falsa';
    globalThis.fetch = async () => new Response('{}', { status: 400 }); // la IA falla: respuesta de emergencia
    for (const canal of ['whatsapp', 'instagram', 'web']) {
      const r = await pensar([{ role: 'user', content: '¿Cuánto cuesta la Toronto?' }], canal);
      assert.equal(r.emergencia, true, canal);
      assert.doesNotMatch(r.respuesta, /Hablar con asesora|por WhatsApp:$/, canal);
      assert.equal(r.whatsapp.lineas.length, 2, canal);
    }
    config.ASISTENTE_PROVEEDOR = proveedor;
    delete config.GEMINI_API_KEY;
  } finally {
    globalThis.fetch = anterior;
  }
});

test('Promete el pase (botón o enlaces de abajo) → se agregan las asesoras; el enlace del catálogo no cuenta', () => {
  assert.ok(prometeBotonDeAsesora('Toca el botón y una asesora te atiende.'));
  assert.ok(prometeBotonDeAsesora('Escríbele a una asesora por los enlaces de abajo.'));
  assert.ok(prometeBotonDeAsesora('Usa los enlaces de WhatsApp para hablar con una asesora.'));
  assert.ok(!prometeBotonDeAsesora('Aquí tienes el enlace del catálogo de ofertas; una asesora te confirma la disponibilidad.'));
});

function wa(mensaje, telefono) {
  return entregar(whatsappPost, avisoWa(mensaje, telefono), SECRETO_WA, env);
}
