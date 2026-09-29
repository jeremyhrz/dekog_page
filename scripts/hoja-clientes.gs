/**
 * Script de la hoja "Clientes Dekog" (Google Sheets → Extensiones → Apps Script).
 * Recibe los clientes que dejan sus datos en el asistente de dekog.net y los
 * guarda, una fila por conversación.
 *
 * 1. Cambia SECRETO por la misma clave que se pone en Vercel como HOJA_SECRETO.
 * 2. Implementar → Nueva implementación → Aplicación web,
 *    Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 * 3. La URL que te da es HOJA_URL en Vercel.
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
      datos.id || '',
      datos.fecha || new Date(),
      datos.nombre || '',
      datos.telefono ? "'" + datos.telefono : '',
      datos.ciudad || '',
      datos.interes || '',
      datos.resumen || '',
      datos.canal || '',
    ];
    const ultima = hoja.getLastRow();
    const ids = ultima > 1 ? hoja.getRange(2, 1, ultima - 1, 1).getValues().map(function (f) { return f[0]; }) : [];
    const posicion = datos.id ? ids.indexOf(datos.id) : -1;
    if (posicion >= 0) {
      const numero = posicion + 2;
      const anterior = hoja.getRange(numero, 1, 1, ENCABEZADOS.length).getValues()[0];
      fila[1] = anterior[1]; // se conserva la fecha del primer contacto
      for (let i = 2; i < fila.length; i++) if (!fila[i]) fila[i] = anterior[i];
      hoja.getRange(numero, 1, 1, fila.length).setValues([fila]);
    } else {
      hoja.appendRow(fila);
    }
    return responder({ ok: true });
  } finally {
    candado.releaseLock();
  }
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
