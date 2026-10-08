/**
 * Script de la hoja "Clientes Dekog" (Google Sheets → Extensiones → Apps Script).
 * Recibe los clientes que dejan sus datos en el asistente (web, WhatsApp e
 * Instagram) y los guarda, una fila por conversación. Cada conversación nueva
 * llega además por correo a CORREO_AVISOS; las que solo se actualizan, no.
 *
 * 1. Cambia SECRETO por la misma clave que se guarda en el Worker de Cloudflare:
 *      npx wrangler secret put HOJA_SECRETO --config asistente/wrangler.toml
 * 2. Elige probarAviso arriba y dale a Ejecutar una vez: Google pide el permiso
 *    para mandar correos y te llega a ti un aviso de ejemplo.
 * 3. Implementar → Nueva implementación → Aplicación web,
 *    Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 *    Si ya estaba publicada: Implementar → Gestionar implementaciones → lápiz →
 *    Versión: Nueva versión. Así la URL sigue siendo la misma.
 * 4. La URL que te da (termina en /exec) va al Worker:
 *      npx wrangler secret put HOJA_URL --config asistente/wrangler.toml
 *
 * Prueba local, sin Google: node scripts/hoja-clientes.test.mjs
 */
const SECRETO = 'PEGA_AQUI_EL_SECRETO';
const ENCABEZADOS = ['Conversación', 'Fecha', 'Nombre', 'Teléfono', 'Ciudad', 'Le interesa', 'Resumen para la asesora', 'Canal'];
const CORREO_AVISOS = 'dekog.inf@gmail.com'; // a quién le llega el aviso de cada cliente nuevo
// Tope de avisos por hora: Gmail personal manda 100 correos al día, y alguien que envíe formularios en masa los
// agotaría. Pasado el tope llega UN correo de resumen por hora y los clientes siguen quedando en la hoja.
const MAX_AVISOS_HORA = 15;

function doPost(e) {
  let datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ ok: false, error: 'JSON inválido' });
  }
  if (datos.secreto !== SECRETO) return responder({ ok: false, error: 'no autorizado' });

  const candado = LockService.getScriptLock();
  candado.waitLock(10000);
  let nueva = null; // la fila recién agregada, para avisar por correo ya soltado el candado
  try {
    const hoja = obtenerHoja();
    const fila = [
      texto(datos.id),
      texto(datos.fecha) || new Date(),
      texto(datos.nombre),
      telefono(datos.telefono),
      texto(datos.ciudad),
      texto(datos.interes),
      texto(datos.resumen),
      texto(datos.canal),
    ];
    const ultima = hoja.getLastRow();
    const ids = ultima > 1 ? hoja.getRange(2, 1, ultima - 1, 1).getValues().map(function (f) { return f[0]; }) : [];
    const posicion = datos.id ? ids.indexOf(datos.id) : -1;
    if (posicion >= 0) {
      const numero = posicion + 2;
      const anterior = hoja.getRange(numero, 1, 1, ENCABEZADOS.length).getValues()[0];
      fila[1] = anterior[1]; // se conserva la fecha del primer contacto
      for (let i = 2; i < fila.length; i++) if (!fila[i]) fila[i] = i === 3 ? telefono(anterior[i]) : texto(anterior[i]);
      hoja.getRange(numero, 1, 1, fila.length).setValues([fila]);
    } else {
      hoja.appendRow(fila);
      nueva = { fila: fila, enlace: enlaceFila(hoja, hoja.getLastRow()) };
    }
  } finally {
    candado.releaseLock();
  }
  // Gmail puede tardar un segundo: fuera del candado no frena a los demás guardados.
  if (nueva) avisarClienteNuevo(nueva.fila, nueva.enlace);
  return responder({ ok: true });
}

// Un texto que empieza con = + - @ Google Sheets lo ejecutaría como fórmula:
// se antepone un apóstrofo para que quede como texto.
function texto(valor) {
  const s = valor === undefined || valor === null ? '' : String(valor);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

// El teléfono siempre como texto, para no perder el 0 inicial.
function telefono(valor) {
  const s = valor === undefined || valor === null ? '' : String(valor).replace(/^'/, '');
  return s ? "'" + s : '';
}

function obtenerHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName('Clientes');
  if (!hoja) {
    hoja = libro.insertSheet('Clientes');
    hoja.appendRow(ENCABEZADOS);
    hoja.getRange(1, 1, 1, ENCABEZADOS.length).setFontWeight('bold').setBackground('#f4f0ec');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

// Aviso por correo de una conversación nueva. Si el correo falla (por ejemplo, se acabó
// el cupo diario de correos de Google), el cliente ya quedó guardado: solo se deja el registro.
function avisarClienteNuevo(fila, enlace) {
  if (/^prueba/i.test(mostrar(fila[2]))) return; // «PRUEBA …» son pruebas: no se avisa a Dekog
  try {
    const cache = CacheService.getScriptCache();
    const hora = 'avisos-' + new Date().toISOString().slice(0, 13);
    const enviados = Number(cache.get(hora) || 0);
    if (enviados >= MAX_AVISOS_HORA || MailApp.getRemainingDailyQuota() < 5) {
      if (!cache.get(hora + '-resumen') && MailApp.getRemainingDailyQuota() > 0) {
        cache.put(hora + '-resumen', '1', 3600);
        MailApp.sendEmail({
          to: CORREO_AVISOS,
          subject: 'Hay más clientes nuevos en la hoja',
          body: 'Llegaron muchos clientes seguidos y no se mandó un correo por cada uno. Revísalos en la hoja: ' + enlace,
        });
      }
      return;
    }
    cache.put(hora, String(enviados + 1), 3600);
    MailApp.sendEmail(armarAviso(fila, enlace, CORREO_AVISOS));
  } catch (err) {
    console.warn('No se pudo mandar el aviso por correo:', err && err.message ? err.message : String(err));
  }
}

// El correo de una fila: asunto, texto y HTML. En el HTML todo se escapa: un nombre
// como <img src=…> tiene que verse como texto, no volverse parte del correo.
function armarAviso(fila, enlace, para) {
  const nombre = mostrar(fila[2]);
  const tel = mostrar(fila[3]);
  const interes = mostrar(fila[5]);
  const canal = mostrar(fila[7]);
  const esAviso = canal === 'Sistema'; // avisos del propio asistente o de Meta: no son clientes
  const whatsapp = tel ? 'https://wa.me/' + numeroWhatsapp(tel) : '';
  const campos = [
    ['Fecha', mostrar(fila[1])],
    ['Nombre', nombre],
    ['Teléfono', tel],
    ['Ciudad', mostrar(fila[4])],
    ['Le interesa', interes],
    ['Resumen para la asesora', mostrar(fila[6])],
    ['Canal', canal],
  ].filter(function (c) { return c[1] || !esAviso; });
  const titulo = esAviso ? 'Aviso del asistente de Dekog' : 'Nuevo cliente en el asistente de Dekog';
  // Sin enlaces en el asunto: el nombre y el interés los escribe el cliente.
  const asunto = ((esAviso ? '' : 'Nuevo cliente: ') + (nombre || 'sin nombre') + (interes ? ' — ' + interes : ''))
    .replace(/https?:\/\/\S+|www\.\S+/gi, '[enlace]');

  const plano = [titulo, ''].concat(campos.map(function (c) {
    return c[0] + ': ' + (c[1] || '—') + (c[0] === 'Teléfono' && whatsapp ? '\nWhatsApp: ' + whatsapp : '');
  }), ['', 'Hoja de clientes: ' + enlace]).join('\n');

  const html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#f4f0ec;color:#0a0a0a">' +
    '<div style="background:#0a0a0a;color:#ffffff;padding:16px 20px;font-size:17px;font-weight:bold">' + titulo + '</div>' +
    (esAviso ? '<div style="padding:12px 20px 0;font-size:13px;color:#6b6b6b">No es un cliente: es un aviso automático del asistente.</div>' : '') +
    campos.map(function (c) {
      let valor = c[1] ? escapar(c[1]) : '—';
      if (c[0] === 'Teléfono' && whatsapp) {
        valor += ' &nbsp;<a href="' + escapar(whatsapp) + '" style="color:#0e7a3e;font-weight:bold">Escribirle por WhatsApp</a>';
      }
      return '<div style="padding:10px 20px;border-bottom:1px solid #ebe5df">' +
        '<div style="font-size:12px;color:#6b6b6b">' + c[0] + '</div>' +
        '<div style="font-size:15px;margin-top:2px">' + valor + '</div></div>';
    }).join('') +
    '<div style="padding:16px 20px"><a href="' + escapar(enlace) + '" style="color:#0a0a0a;font-weight:bold">Abrir la hoja de clientes</a></div>' +
    '</div>';

  return { to: para, subject: recortar(asunto.replace(/\s+/g, ' '), 200), body: plano, htmlBody: html, name: 'Asistente Dekog' };
}

// Número para https://wa.me/: los de Venezuela pasan a formato internacional (58…);
// si no parece venezolano, va tal cual (solo sus dígitos).
function numeroWhatsapp(valor) {
  const d = String(valor).replace(/\D/g, '').replace(/^00/, '');
  if (/^580?[24]\d{9}$/.test(d)) return '58' + d.slice(-10); // +58 414…, +58 0414…
  if (/^0[24]\d{9}$/.test(d)) return '58' + d.slice(1); // 0414…, 0212…
  if (/^4(1[246]|2[246])\d{7}$/.test(d)) return '58' + d; // 414… sin el 0
  return d;
}

// El valor como se ve en la hoja: sin el apóstrofo que lo protege de fórmulas.
function mostrar(valor) {
  if (valor instanceof Date) return Utilities.formatDate(valor, 'America/Caracas', 'dd/MM/yyyy HH:mm');
  return valor === undefined || valor === null ? '' : String(valor).replace(/^'/, '').trim();
}

// Para el HTML del correo: lo que escribió el cliente se ve como texto, nunca como código.
function escapar(valor) {
  return String(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\r?\n/g, '<br>');
}

// MailApp no acepta asuntos muy largos: se corta con «…».
function recortar(s, max) {
  const letras = Array.from(s);
  return letras.length > max ? letras.slice(0, max - 1).join('').trim() + '…' : s;
}

// Enlace que abre la hoja justo en la fila del cliente.
function enlaceFila(hoja, numero) {
  return SpreadsheetApp.getActiveSpreadsheet().getUrl() + '#gid=' + hoja.getSheetId() + '&range=A' + numero;
}

// Ejecútala una vez desde el editor: Google pide el permiso para mandar correos y
// te llega a ti (el dueño del script) un aviso de ejemplo, igual a los que recibe Dekog.
function probarAviso() {
  const para = Session.getEffectiveUser().getEmail();
  if (!para) throw new Error('No se pudo saber tu correo: ejecuta probarAviso desde el editor de Apps Script.');
  const ejemplo = ['ejemplo', new Date(), 'María Pérez (ejemplo)', "'0414-123.45.67", 'Valencia', 'Cama Toronto Queen',
    'Quiere la cama Toronto Queen en gris y pregunta si la entregan en Valencia.', 'Web'];
  const aviso = armarAviso(ejemplo, SpreadsheetApp.getActiveSpreadsheet().getUrl(), para);
  aviso.subject = '[Ejemplo] ' + aviso.subject;
  MailApp.sendEmail(aviso);
  Logger.log('Aviso de ejemplo enviado a ' + para + '. Los avisos de verdad llegan a ' + CORREO_AVISOS + '.');
}
