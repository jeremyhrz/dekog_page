/**
 * Prueba local de scripts/hoja-clientes.gs, sin dependencias ni cuenta de Google:
 *   node scripts/hoja-clientes.test.mjs
 * Carga el script con la hoja, el correo y los demás servicios de Apps Script
 * simulados, y comprueba el guardado y el aviso por correo a Dekog.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const codigo = readFileSync(new URL('./hoja-clientes.gs', import.meta.url), 'utf8');
let fallas = 0;
const ok = (nombre, condicion) => { if (!condicion) fallas++; console.log(condicion ? 'OK   ' : 'FALLA', nombre); };

// Al leer una celda, Sheets no devuelve el apóstrofo que la marca como texto.
const visible = (v) => (typeof v === 'string' ? v.replace(/^'/, '') : v);

/** Un Apps Script recién cargado: hoja vacía, y correo, candado y registros simulados. */
function entorno({ correoFalla = false, cupoCorreos = 100 } = {}) {
  const cache = new Map(); // CacheService del script (tope de avisos por hora)
  const filas = []; // lo que el script escribió en «Clientes»; la fila 1 son los encabezados
  const correos = [];
  const registros = [];
  const eventos = []; // en qué orden se toma el candado, se suelta y sale el correo
  let clientes = null;
  const rango = (fila, columna, nFilas, nColumnas) => ({
    getValues: () => Array.from({ length: nFilas }, (_, i) =>
      Array.from({ length: nColumnas }, (_, j) => visible((filas[fila - 1 + i] ?? [])[columna - 1 + j] ?? ''))),
    setValues: (valores) => valores.forEach((f, i) => f.forEach((v, j) => { (filas[fila - 1 + i] ??= [])[columna - 1 + j] = v; })),
    setFontWeight() { return this; },
    setBackground() { return this; },
  });
  const hoja = { getLastRow: () => filas.length, getRange: rango, appendRow: (f) => { filas.push([...f]); }, setFrozenRows() {}, getSheetId: () => 77 };
  const libro = {
    getSheetByName: (n) => (n === 'Clientes' ? clientes : null),
    insertSheet: () => (clientes = hoja),
    getUrl: () => 'https://docs.google.com/spreadsheets/d/HOJA/edit',
  };
  const contexto = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => libro },
    LockService: { getScriptLock: () => ({ waitLock: () => eventos.push('candado'), releaseLock: () => eventos.push('suelta') }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
    MailApp: {
      getRemainingDailyQuota: () => cupoCorreos,
      sendEmail: (mensaje) => {
        eventos.push('correo');
        if (correoFalla) throw new Error('Service invoked too many times for one day: email.');
        correos.push(mensaje);
      },
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (contenido) => ({ contenido, setMimeType() { return this; } }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'dueno@ejemplo.com' }) },
    Logger: { log: (m) => registros.push(String(m)) },
    Utilities: { formatDate: (fecha, zona, formato) => `[${formato} ${zona}]` },
    console: { log() {}, warn: (...a) => registros.push(a.join(' ')), error: (...a) => registros.push(a.join(' ')) },
  });
  vm.runInContext(codigo, contexto, { filename: 'hoja-clientes.gs' });
  const secreto = vm.runInContext('SECRETO', contexto);
  const post = (cuerpo) => JSON.parse(contexto.doPost({ postData: { contents: cuerpo } }).contenido);
  const enviar = (datos) => post(JSON.stringify({ secreto, ...datos }));
  return { contexto, filas, correos, registros, eventos, post, enviar };
}

// 1. Conversación nueva: se guarda y llega un correo a Dekog, con lo del cliente escapado
{
  const h = entorno();
  const r = h.enviar({
    id: 'web-abc', fecha: '7/10/2026, 3:25:14 p. m.',
    nombre: 'Ana <img src=x onerror=alert(1)> & "Co"', telefono: '0414-123.45.67', ciudad: 'Valencia',
    interes: 'Cama <b>Toronto</b> Queen', resumen: 'Quiere <script>alert(1)</script>\nen gris', canal: 'Web',
  });
  ok('nueva: responde ok', r.ok === true);
  ok('nueva: queda en la hoja, debajo de los encabezados', h.filas.length === 2 && h.filas[0][0] === 'Conversación' && h.filas[1][0] === 'web-abc');
  ok('nueva: 1 correo', h.correos.length === 1);
  const c = h.correos[0] ?? {};
  const html = c.htmlBody ?? '';
  const plano = c.body ?? '';
  ok('nueva: va a dekog.inf@gmail.com', c.to === 'dekog.inf@gmail.com');
  ok(`nueva: asunto «${c.subject}»`, c.subject === 'Nuevo cliente: Ana <img src=x onerror=alert(1)> & "Co" — Cama <b>Toronto</b> Queen');
  ok('nueva: nada de lo que escribió el cliente queda como etiqueta en el HTML', !/<img src=x|<script|<b>Toronto/.test(html));
  ok('nueva: el HTML lo muestra escapado', html.includes('Ana &lt;img src=x onerror=alert(1)&gt; &amp; &quot;Co&quot;')
    && html.includes('Quiere &lt;script&gt;alert(1)&lt;/script&gt;<br>en gris') && html.includes('Cama &lt;b&gt;Toronto&lt;/b&gt; Queen'));
  ok('nueva: enlace de WhatsApp con el número en 58…', html.includes('href="https://wa.me/584141234567"') && plano.includes('WhatsApp: https://wa.me/584141234567'));
  ok('nueva: enlace a la fila del cliente en la hoja', plano.includes('Hoja de clientes: https://docs.google.com/spreadsheets/d/HOJA/edit#gid=77&range=A2')
    && html.includes('href="https://docs.google.com/spreadsheets/d/HOJA/edit#gid=77&amp;range=A2"'));
  ok('nueva: el texto trae fecha, teléfono, ciudad, interés, resumen y canal', ['Fecha: 7/10/2026, 3:25:14 p. m.', 'Teléfono: 0414-123.45.67', 'Ciudad: Valencia',
    'Le interesa: Cama <b>Toronto</b> Queen', 'Resumen para la asesora: Quiere <script>alert(1)</script>\nen gris', 'Canal: Web'].every((t) => plano.includes(t)));
  ok('nueva: con remitente «Asistente Dekog»', c.name === 'Asistente Dekog');
  ok('nueva: el correo sale después de soltar el candado', h.eventos.join(' ') === 'candado suelta correo');

  // 2. La misma conversación vuelve a escribir: se actualiza su fila y no hay correo
  const r2 = h.enviar({ id: 'web-abc', fecha: '7/10/2026, 4:02:00 p. m.', nombre: 'Ana', telefono: '', ciudad: 'Naguanagua', interes: 'Sofá Milán', resumen: '', canal: 'Web' });
  ok('actualización: responde ok', r2.ok === true);
  ok('actualización: sigue siendo una sola fila', h.filas.length === 2);
  ok('actualización: cambia la ciudad y conserva el teléfono y la fecha del primer contacto',
    h.filas[1][4] === 'Naguanagua' && visible(h.filas[1][3]) === '0414-123.45.67' && h.filas[1][1] === '7/10/2026, 3:25:14 p. m.');
  ok('actualización: 0 correos nuevos', h.correos.length === 1);
}

// 3. Nombre que empieza por «PRUEBA»: se guarda, pero no se avisa
{
  const h = entorno();
  h.enviar({ id: 'web-p1', nombre: 'PRUEBA Jeremy', telefono: '04141234567', canal: 'Web' });
  h.enviar({ id: 'web-p2', nombre: '  prueba 2', telefono: '04141234567', canal: 'Web' });
  ok('PRUEBA: las dos filas se guardan', h.filas.length === 3);
  ok('PRUEBA: 0 correos', h.correos.length === 0 && !h.eventos.includes('correo'));
}

// 4. El correo falla: el cliente igual queda guardado, la respuesta es ok y queda el registro
{
  const h = entorno({ correoFalla: true });
  const r = h.enviar({ id: 'wa-584141234567', nombre: 'Luis', telefono: '+584141234567', interes: 'Juego de comedor', canal: 'WhatsApp' });
  ok('correo falla: responde ok', r.ok === true);
  ok('correo falla: el cliente quedó guardado', h.filas.length === 2 && h.filas[1][2] === 'Luis');
  ok('correo falla: se intentó mandar, ya soltado el candado', h.eventos.join(' ') === 'candado suelta correo');
  ok('correo falla: queda el registro con el motivo', h.registros.some((m) => m.includes('No se pudo mandar el aviso por correo') && m.includes('too many times')));
}

// 5. Secreto incorrecto o pedido roto: no autorizado, sin fila y sin correo
{
  const h = entorno();
  const r = h.post(JSON.stringify({ secreto: 'otro', id: 'web-x', nombre: 'Intruso', telefono: '04141234567' }));
  ok('secreto incorrecto: no autorizado', r.ok === false && r.error === 'no autorizado');
  ok('secreto incorrecto: ni fila, ni candado, ni correo', h.filas.length === 0 && h.eventos.length === 0 && h.correos.length === 0);
  const sinSecreto = h.post(JSON.stringify({ id: 'web-x', nombre: 'Sin clave' }));
  ok('sin secreto: no autorizado y sin correo', sinSecreto.ok === false && sinSecreto.error === 'no autorizado' && h.correos.length === 0);
  const roto = h.post('{esto no es JSON');
  ok('JSON roto: error y sin correo', roto.ok === false && roto.error === 'JSON inválido' && h.correos.length === 0);
}

// 6. Instagram sin teléfono, avisos del sistema, fórmulas, asuntos largos y fila sin fecha
{
  const h = entorno();
  h.enviar({ id: 'ig-123', nombre: '@ana.deco (Ana)', telefono: '', interes: 'Sofá', resumen: 'Pregunta por las telas', canal: 'Instagram' });
  const ig = h.correos[0] ?? {};
  ok('Instagram sin teléfono: avisa, sin enlace de WhatsApp', h.correos.length === 1 && !ig.body.includes('wa.me') && !ig.htmlBody.includes('wa.me') && ig.body.includes('Teléfono: —'));

  h.enviar({ id: 'aviso-meta-account_update-1-2', nombre: '📣 AVISO DE META', telefono: '', ciudad: '', interes: 'account_update · APPROVED', resumen: '{"event":"APPROVED"}', canal: 'Sistema' });
  const meta = h.correos[1] ?? {};
  ok(`aviso de Meta: el asunto no dice «Nuevo cliente» («${meta.subject}»)`, meta.subject === '📣 AVISO DE META — account_update · APPROVED');
  ok('aviso de Meta: aclara que no es un cliente y no pone los campos vacíos', (meta.htmlBody ?? '').includes('No es un cliente')
    && !meta.body.includes('Teléfono') && !meta.body.includes('Ciudad') && meta.htmlBody.includes('{&quot;event&quot;:&quot;APPROVED&quot;}'));

  h.enviar({ id: 'web-f', nombre: '=HYPERLINK("http://malo";"clic")', telefono: '04121234567', canal: 'Web' });
  ok('fórmula: en la hoja queda como texto', h.filas.at(-1)[2] === `'=HYPERLINK("http://malo";"clic")`);
  ok('fórmula: el correo la muestra como texto, sin el apóstrofo (y el asunto sin el enlace)', h.correos[2]?.subject === 'Nuevo cliente: =HYPERLINK("[enlace]'
    && h.correos[2].htmlBody.includes('=HYPERLINK(&quot;http://malo&quot;;&quot;clic&quot;)'));

  h.enviar({ id: 'web-largo', nombre: 'Rosa\n\tMaría', telefono: '04121234567', interes: 'Cama King con box Alta Gama, '.repeat(12), canal: 'Web' });
  const largo = h.correos[3]?.subject ?? '';
  ok(`asunto largo: una sola línea de ${Array.from(largo).length} letras (máximo 200), cortada con «…»`,
    Array.from(largo).length <= 200 && !/[\r\n\t]/.test(largo) && largo.startsWith('Nuevo cliente: Rosa María — Cama King') && largo.endsWith('…'));

  h.enviar({ id: 'web-sin-fecha', nombre: 'Pedro', telefono: '04261234567', canal: 'Web' });
  ok('sin fecha: la hoja guarda la hora del script', Object.prototype.toString.call(h.filas.at(-1)[1]) === '[object Date]');
  ok('sin fecha: el correo la muestra con la hora de Venezuela', (h.correos[4]?.body ?? '').includes('Fecha: [dd/MM/yyyy HH:mm America/Caracas]'));
  ok('Instagram, Meta, fórmula, asunto largo y sin fecha: 5 filas y 5 correos', h.filas.length === 6 && h.correos.length === 5);
}

// 7. El número del enlace de WhatsApp
{
  const { contexto } = entorno();
  const casos = [
    ['0414-123.45.67', '584141234567'],
    ['04141234567', '584141234567'],
    ['4141234567', '584141234567'],
    ['+58 414 1234567', '584141234567'],
    ['+58 (0414) 123 4567', '584141234567'],
    ['0058 424 7654321', '584247654321'],
    ['0212 555 1234', '582125551234'],
    ['+1 (305) 555-1234', '13055551234'],
    ['+34 612 345 678', '34612345678'],
    ['555-1234', '5551234'],
  ];
  for (const [entrada, esperado] of casos) {
    const numero = contexto.numeroWhatsapp(entrada);
    ok(`wa.me: «${entrada}» → ${numero}`, numero === esperado);
  }
}

// 8. probarAviso: manda un ejemplo al dueño del script, no a Dekog
{
  const h = entorno();
  h.contexto.probarAviso();
  const c = h.correos[0] ?? {};
  ok('probarAviso: 1 correo, al dueño del script', h.correos.length === 1 && c.to === 'dueno@ejemplo.com');
  ok(`probarAviso: asunto de ejemplo («${c.subject}»)`, (c.subject ?? '').startsWith('[Ejemplo] Nuevo cliente: María Pérez (ejemplo) — Cama Toronto Queen'));
  ok('probarAviso: trae el enlace de WhatsApp y el de la hoja', (c.body ?? '').includes('https://wa.me/584141234567') && c.body.includes('https://docs.google.com/spreadsheets/d/HOJA/edit'));
  ok('probarAviso: deja el registro de a quién se mandó', h.registros.some((m) => m.includes('dueno@ejemplo.com') && m.includes('dekog.inf@gmail.com')));
}

{
  // Formularios en masa: como mucho 15 avisos por hora y UN correo de resumen; los clientes quedan en la hoja.
  const h = entorno();
  for (let i = 0; i < 20; i++) h.enviar({ id: `masa-${i}`, nombre: `Cliente ${i}`, telefono: '04141234567', canal: 'Web' });
  const resumenes = h.correos.filter((c) => c.subject === 'Hay más clientes nuevos en la hoja');
  ok(`tope por hora: 15 avisos + 1 resumen (${h.correos.length})`, h.correos.length === 16 && resumenes.length === 1);
  ok('tope por hora: los 20 clientes quedan en la hoja', h.filas.length === 21);
}
{
  // Cupo diario de Gmail casi agotado: no se avisa por cada cliente (y el cliente queda guardado).
  const h = entorno({ cupoCorreos: 3 });
  h.enviar({ id: 'cupo-1', nombre: 'Ana', telefono: '04141234567', canal: 'Web' });
  ok('cupo de Gmail casi agotado: solo el resumen', h.correos.length === 1 && h.correos[0].subject === 'Hay más clientes nuevos en la hoja');
}
{
  // Un enlace en el nombre o en el interés no llega al asunto del correo.
  const h = entorno();
  h.enviar({ id: 'enlace-1', nombre: 'Gana premio http://malo.example/x', interes: 'ver www.malo.example', telefono: '04141234567', canal: 'Web' });
  ok(`sin enlaces en el asunto («${h.correos[0]?.subject}»)`, h.correos.length === 1 && !/https?:|www\./i.test(h.correos[0].subject));
}
console.log(fallas ? `\n${fallas} FALLAS` : '\nTODO OK');
process.exitCode = fallas ? 1 : 0;
