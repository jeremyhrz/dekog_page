// Fotos de WhatsApp e Instagram: cada producto tiene su copia JPEG en public/wa (scripts/optimizar_imagenes.py) y todo
// envío con foto la usa. Las originales de /muebles y /mesas son casi todas JPEG con extensión .png, Vercel las sirve como
// image/png y WhatsApp las rechaza (error 131053): como el texto va de pie de foto, el cliente se quedaba sin respuesta.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECRETO_WA, SECRETO_IG, kvEnMemoria, metaFalso, entregar, avisoWa, textoWa, filaWa, avisoIg } from './ayuda.js';
import { config } from '../src/lib/config.js';
import { productos } from '../../src/data/productos.js';
import { fotoParaCanales, buscarProducto, tarjeta } from '../src/lib/catalogo.js';
import { whatsappPost } from '../src/canales/whatsapp.js';
import { instagramPost } from '../src/canales/instagram.js';

const PUBLICO = fileURLToPath(new URL('../../public/', import.meta.url));
const SITIO = 'https://www.dekog.net';
const MAX_BYTES = 5 * 1024 * 1024; // tope de WhatsApp para una imagen (Instagram admite 8 MB)
const LADO = 1080;

/** Marcadores, tamaño y componentes de un JPEG (lee las cabeceras hasta donde empiezan los datos de la imagen). */
function cabeceraJpeg(bytes) {
  const marcadores = [];
  let ancho = 0;
  let alto = 0;
  let componentes = 0;
  for (let i = 2; i + 4 <= bytes.length && bytes[i] === 0xff;) {
    const m = bytes[i + 1];
    if (m === 0xff) { i += 1; continue; } // relleno entre marcadores
    marcadores.push(m);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { // SOF: alto, ancho y componentes
      alto = bytes.readUInt16BE(i + 5);
      ancho = bytes.readUInt16BE(i + 7);
      componentes = bytes[i + 9];
    }
    if (m === 0xda) break;
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  return { marcadores, ancho, alto, componentes };
}

// Con los nombres exactos de cada carpeta: Vercel distingue mayúsculas y Windows no (existsSync diría que sí).
const listados = new Map();
function existeExacto(ruta) {
  const carpeta = dirname(ruta);
  if (!listados.has(carpeta)) listados.set(carpeta, new Set(existsSync(carpeta) ? readdirSync(carpeta) : []));
  return listados.get(carpeta).has(ruta.slice(carpeta.length + 1));
}

/** Una URL de foto para canales: el archivo de public/ que serviría Vercel, revisado como lo recibiría WhatsApp. */
function revisarFoto(url, quien = url) {
  assert.match(url ?? '', /^https:\/\/www\.dekog\.net\/wa\/[^?#]+\.jpg$/, quien);
  const relativa = decodeURI(url.slice(SITIO.length + 1)); // wa/muebles/toronto.jpg
  const ruta = join(PUBLICO, ...relativa.split('/'));
  assert.ok(existeExacto(ruta), `${quien}: falta public/${relativa} (python scripts/optimizar_imagenes.py)`);
  const bytes = readFileSync(ruta);
  assert.ok(bytes.length <= MAX_BYTES, `${quien}: ${bytes.length} bytes`);
  assert.deepEqual([...bytes.subarray(0, 3)], [0xff, 0xd8, 0xff], `${quien}: no es un JPEG`);
  assert.deepEqual([...bytes.subarray(-2)], [0xff, 0xd9], `${quien}: JPEG cortado`);
  const { marcadores, ancho, alto, componentes } = cabeceraJpeg(bytes);
  assert.ok(ancho > 0 && alto > 0 && Math.max(ancho, alto) <= LADO, `${quien}: ${ancho}×${alto}`);
  assert.equal(componentes, 3, `${quien}: no es a color (RGB)`);
  // Sin EXIF ni XMP (APP1), perfil ICC (APP2), IPTC (APP13) ni comentarios (COM).
  assert.deepEqual(marcadores.filter((m) => [0xe1, 0xe2, 0xed, 0xfe].includes(m)), [], `${quien}: trae metadatos`);
}

test('cada producto tiene su copia en public/wa: JPEG de verdad, ≤ 1080 px, ≤ 5 MB, RGB y sin metadatos', () => {
  for (const p of productos) revisarFoto(fotoParaCanales(p.id), `${p.nombre} (${p.imagen})`);
});

test('fotoParaCanales: la ruta de la original en /wa con .jpg, codificada como la web; null si el producto no existe', () => {
  assert.equal(fotoParaCanales(48), `${SITIO}/wa/muebles/toronto.jpg`);
  assert.equal(fotoParaCanales('48'), `${SITIO}/wa/muebles/toronto.jpg`); // el id de una fila llega como texto
  assert.equal(fotoParaCanales(9999), null);
  const p = buscarProducto(48);
  const original = p.imagen;
  try {
    for (const [imagen, esperada] of [
      ['/muebles/IMG_4353.JPG.jpeg', '/wa/muebles/IMG_4353.JPG.jpg'], // solo cambia la última extensión, como en el script
      ['/muebles/IMG_4456.PNG', '/wa/muebles/IMG_4456.jpg'],
      ['/muebles/Cama Niña 2.png', '/wa/muebles/Cama%20Ni%C3%B1a%202.jpg'], // espacios y acentos: encodeURI, como la web
    ]) {
      p.imagen = imagen;
      assert.equal(fotoParaCanales(48), SITIO + esperada);
    }
  } finally {
    p.imagen = original;
  }
  // La web no cambia: su tarjeta sigue con la foto original (de ahí saca la miniatura WebP).
  assert.equal(tarjeta(48, '', null).imagen, `${SITIO}/muebles/toronto.png`);
});

let env;
let meta;
const usar = (opciones) => { meta = metaFalso(opciones); globalThis.fetch = meta.fetchFalso; };
beforeEach(() => { env = { CONVERSACIONES: kvEnMemoria() }; usar(); });
afterEach(() => { delete config.IG_VITRINA; });
const wa = (msg, telefono) => entregar(whatsappPost, avisoWa(msg, telefono), SECRETO_WA, env);
const ig = (msg, igsid) => entregar(instagramPost, avisoIg(msg, igsid), SECRETO_IG, env);

/** Cada foto que se le mandó a Meta: [dónde iba, URL]. */
function fotosEnviadas() {
  const fotos = [];
  for (const { cuerpo } of meta.enviados) {
    const m = cuerpo.message ?? cuerpo; // Instagram: { recipient, message }; WhatsApp: el mensaje mismo
    if (m.image) fotos.push(['WhatsApp: imagen', m.image.link]);
    if (m.interactive?.header?.image) fotos.push(['WhatsApp: cabecera del botón', m.interactive.header.image.link]);
    for (const adjunto of [m.attachments, m.attachment].filter(Boolean)) {
      if (adjunto.type === 'image') fotos.push(['Instagram: imagen', adjunto.payload.url]);
      for (const e of adjunto.payload?.elements ?? []) fotos.push(['Instagram: tarjeta', e.image_url]);
    }
  }
  return fotos;
}

test('WhatsApp e Instagram: toda foto que sale es la copia JPEG de public/wa, nunca una original', async () => {
  const fotos = [];
  const crudos = [];
  const juntar = () => { fotos.push(...fotosEnviadas()); crudos.push(JSON.stringify(meta.enviados)); };
  // WhatsApp: vitrina → tocar un modelo (foto sin IA) → preguntar por una medida (foto de la respuesta de la IA);
  // y «comprar» como primer mensaje de otro cliente (botón de la asesora con la foto en la cabecera).
  await wa(textoWa('Quiero ver camas'));
  await wa(filaWa('prod:48', 'Toronto'));
  await wa(textoWa('¿Cuánto es la Toronto queen en bolívares?'));
  await wa(textoWa('Quiero comprar la Toronto, ¿hacen envío a Maracay?'), '584140000002');
  juntar();
  // Instagram con tarjetas (generic template), tocar un modelo y preguntar por otro.
  usar();
  config.IG_VITRINA = 'tarjetas';
  await ig({ text: 'Quiero ver sofás' });
  await ig({ text: 'Doha', quick_reply: { payload: 'prod:18' } });
  await ig({ text: '¿Cuánto es la Toronto queen en bolívares?' });
  juntar();
  // Si Instagram rechaza la forma oficial de la foto («attachments»), la otra («attachment») también va con la copia.
  usar({ rechazar: (c) => Boolean(c.message?.attachments) });
  await ig({ text: '¿Cuánto es la Toronto queen en bolívares?' }, 'IGSID2');
  juntar();

  assert.deepEqual([...new Set(fotos.map(([donde]) => donde))].sort(),
    ['Instagram: imagen', 'Instagram: tarjeta', 'WhatsApp: cabecera del botón', 'WhatsApp: imagen']);
  assert.ok(fotos.length >= 14, `solo ${fotos.length} fotos`); // 2 de WhatsApp + 1 cabecera + 9 tarjetas + 3 de Instagram
  for (const [donde, url] of fotos) revisarFoto(url, donde);
  assert.ok(fotos.some(([, url]) => url === `${SITIO}/wa/muebles/doha.jpg`));
  for (const crudo of crudos) assert.doesNotMatch(crudo, /dekog\.net\/(muebles|mesas)\/|\.png/i);
});
