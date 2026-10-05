/**
 * Script de la hoja "Clientes Dekog" (Google Sheets → Extensiones → Apps Script).
 * Recibe los clientes que dejan sus datos en el asistente (web, WhatsApp e
 * Instagram) y los guarda, una fila por conversación.
 *
 * 1. Cambia SECRETO por la misma clave que se guarda en el Worker de Cloudflare:
 *      npx wrangler secret put HOJA_SECRETO --config asistente/wrangler.toml
 * 2. Implementar → Nueva implementación → Aplicación web,
 *    Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 * 3. La URL que te da (termina en /exec) va al Worker:
 *      npx wrangler secret put HOJA_URL --config asistente/wrangler.toml
 */
const SECRETO = 'PEGA_AQUI_EL_SECRETO';
const ENCABEZADOS = ['Conversación', 'Fecha', 'Nombre', 'Teléfono', 'Ciudad', 'Le interesa', 'Resumen para la asesora', 'Canal'];

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
    }
    return responder({ ok: true });
  } finally {
    candado.releaseLock();
  }
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
