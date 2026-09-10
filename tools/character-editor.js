// Development-only character body editor. The browser edits a draft; only the
// explicit Apply to source action reaches the hand-authored spec files.
import esbuild from 'esbuild';
import { createServer } from 'node:http';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CAST, HERO_DIALS, dialByKey, operationFor } from './lib/hero-dials.js';
import { HISTORY_DIR, readHeroDials, writeHeroDials } from './lib/toon-specs-source.js';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const HOST = process.env.MASH_CHARACTERS_HOST || '127.0.0.1';
export const PORT = Number(process.env.MASH_CHARACTERS_PORT || 8030);
const TOKEN = process.env.MASH_CHARACTERS_TOKEN || `character-editor-${process.pid}`;

export async function buildPage() {
  const result = await esbuild.build({
    entryPoints: [join(root, 'tools/character-editor-entry.js')],
    bundle: true, format: 'iife', target: ['es2020'], minify: false, write: false,
    logLevel: 'warning', define: { __CHARACTER_EDITOR_TOKEN__: JSON.stringify(TOKEN) },
  });
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const shell = (await import('node:fs')).readFileSync(join(root, 'tools/character-editor-shell.html'), 'utf8');
  return shell.replace('/*__BUNDLE__*/', () => js);
}

const json = (res, code, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (chunk) => { size += chunk.length; if (size > 256 * 1024) { reject(new Error('payload too large')); req.destroy(); } else chunks.push(chunk); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validateOperations(hero, operations) {
  if (!CAST.includes(hero)) throw new Error(`unknown character: ${hero}`);
  if (!operations || typeof operations !== 'object' || Array.isArray(operations)) throw new Error('operations must be an object');
  const out = {};
  for (const [key, raw] of Object.entries(operations)) {
    if (!dialByKey(key)) throw new Error(`unknown body dial: ${key}`);
    out[key] = operationFor(key, raw);
  }
  return out;
}

export async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(await buildPage()); }
    catch (err) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(`character editor failed to build:\n\n${err.stack || err.message}`); }
    return;
  }
  if (req.method === 'GET' && url.pathname === '/shipped') {
    try {
      const hero = url.searchParams.get('hero');
      return json(res, 200, { ok: true, ...readHeroDials(root, hero) });
    } catch (err) { return json(res, 400, { ok: false, errors: [err.message] }); }
  }
  if (req.method === 'GET' && url.pathname === '/history') {
    const dir = join(root, HISTORY_DIR);
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.js')).sort().reverse() : [];
    return json(res, 200, { files });
  }
  if (req.method === 'POST' && url.pathname === '/save') {
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return json(res, 415, { ok: false, errors: ['save requires application/json'] });
    const origin = req.headers.origin;
    if (origin) {
      try { if (new URL(origin).host !== (req.headers.host || `${HOST}:${PORT}`)) return json(res, 403, { ok: false, errors: ['cross-origin save refused'] }); }
      catch { return json(res, 403, { ok: false, errors: ['invalid save origin'] }); }
    }
    if (req.headers['x-character-editor-token'] !== TOKEN) return json(res, 403, { ok: false, errors: ['invalid editor token'] });
    try {
      const body = JSON.parse(await readBody(req));
      const operations = validateOperations(body.hero, body.operations || body.dials);
      const result = writeHeroDials(root, body.hero, operations, { baseRevision: body.baseRevision });
      return json(res, result.conflict ? 409 : result.ok ? 200 : 400, result);
    } catch (err) { return json(res, 400, { ok: false, errors: [err.message] }); }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('not found');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createServer((req, res) => handle(req, res).catch((err) => { console.error(err); if (!res.headersSent) json(res, 500, { ok: false, errors: [err.message] }); }))
    .listen(PORT, HOST, () => console.log(`CHARACTER EDITOR  http://${HOST}:${PORT}`));
}
