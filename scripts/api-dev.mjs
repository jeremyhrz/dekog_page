/**
 * Servidor local para probar /api/asistente sin Vercel.
 *   node scripts/api-dev.mjs      (en otra terminal: npm run dev)
 * Lee las claves de .env.local (ANTHROPIC_API_KEY o GEMINI_API_KEY).
 * Vite reenvía /api a este puerto (ver vite.config.js).
 */
import http from 'node:http';
import fs from 'node:fs';

const PUERTO = 3001;

if (fs.existsSync('.env.local')) {
  for (const linea of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { default: asistente } = await import('../api/asistente.js');

http.createServer(async (req, res) => {
  if (!req.url.startsWith('/api/asistente')) {
    res.writeHead(404).end();
    return;
  }
  let cuerpo = '';
  for await (const trozo of req) cuerpo += trozo;
  try { req.body = cuerpo ? JSON.parse(cuerpo) : {}; } catch { req.body = {}; }
  res.status = (codigo) => { res.statusCode = codigo; return res; };
  res.json = (datos) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(datos));
    return res;
  };
  await asistente(req, res);
}).listen(PUERTO, () => console.log(`API del asistente en http://localhost:${PUERTO}`));
