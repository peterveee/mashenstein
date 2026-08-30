// THE LEVEL EDITOR's server: bundles the page, and writes what it saves back
// into src/data/stage-layouts.js.
//
// Same shape as tools/mixer.js, and for the same reason. The page has to be
// built from the REAL game modules — the cabinets, the stages, the obstacle
// and pickup registries, the actual Spawner — because everything the editor
// claims about a level is only true if it was computed by the code that plays
// it. Bundling per request rather than once at boot means an edit to
// src/game/spawner.js is in the forecast on the next refresh, and a new
// obstacle in src/game/entities.js is in the palette without this file, or the
// editor, knowing anything about it.
//
// It writes ONE file, and only through tools/lib/stage-layouts-source.js:
// validate, snapshot the old copy into work/level-history/, then atomically
// replace. The editor never edits stages.js — missions, challenges and dialog
// are writing, and a generator would flatten them.
//
// Usage: node tools/level-editor.js      (or: npm run levels)
//        node tools/level-editor.js --baseline   re-migrate from stages.js
import esbuild from 'esbuild';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { STAGE_BY_ID } from '../src/data/stages.js';
import { CABINET_BY_ID } from '../src/data/cabinets.js';
import { OBSTACLES, PICKUPS } from '../src/game/entities.js';
import {
  writeStageLayouts, snapshotStageLayouts, validateLayouts,
} from './lib/stage-layouts-source.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = process.env.MASH_LEVELS_HOST || '127.0.0.1';
const PORT = parseInt(process.env.MASH_LEVELS_PORT || '8020', 10);
// Where PLAY sends you: the game's own dev server (build/dev.js), which is a
// separate process on its own port. The editor does not host the game.
const GAME_URL = process.env.MASH_GAME_URL || 'http://localhost:8001';
const HISTORY_DIR = join(root, 'work/level-history');

async function buildPage() {
  const result = await esbuild.build({
    entryPoints: [join(root, 'tools/level-editor-entry.js')],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    minify: false,          // dev tool: readable stacks beat bytes
    write: false,
    logLevel: 'warning',
    define: { __GAME_URL__: JSON.stringify(GAME_URL) },
  });
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const shell = readFileSync(join(root, 'tools/level-editor-shell.html'), 'utf8');
  return shell.replace('/*__BUNDLE__*/', () => js);
}

const json = (res, code, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
};

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    // A layout file is kilobytes. Anything at this scale is a mistake or a
    // stranger, and either way it is not getting parsed.
    if (size > 4 * 1024 * 1024) { reject(new Error('payload too large')); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

// The entries as the writer wants them: one flat object per stage, carrying
// its own id and cabinet so nothing downstream has to look them up.
function entriesFrom(payload) {
  if (!payload || typeof payload !== 'object' || !payload.layouts) throw new Error('no layouts in payload');
  return Object.entries(payload.layouts).map(([id, v]) => ({
    id, cabinet: STAGE_BY_ID[id]?.cabinet, ...v,
  }));
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try {
      const html = await buildPage();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      // The bundle failing is the common case while editing the entry, so it
      // is shown as the page rather than as a blank tab and a server log.
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`level editor failed to build:\n\n${err.message}`);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/save') {
    try {
      const entries = entriesFrom(JSON.parse(await readBody(req)));
      const { errors, warnings } = validateLayouts(entries, {
        STAGE_BY_ID, CABINET_BY_ID, OBSTACLES, PICKUPS,
      });
      // Errors refuse the save. The page keeps the edit either way, so a
      // refusal costs a message rather than the work.
      if (errors.length) return json(res, 400, { ok: false, errors, warnings });
      const snapshot = snapshotStageLayouts(root);
      const changed = writeStageLayouts(root, entries);
      return json(res, 200, {
        ok: true, changed, warnings,
        snapshot: snapshot ? snapshot.replace(`${root}/`, '') : null,
      });
    } catch (err) {
      return json(res, 400, { ok: false, errors: [err.message] });
    }
  }

  if (req.method === 'GET' && url.pathname === '/history') {
    const files = existsSync(HISTORY_DIR)
      ? readdirSync(HISTORY_DIR).filter((f) => f.startsWith('stage-layouts-')).sort().reverse()
      : [];
    return json(res, 200, { files });
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--baseline')) {
    const { migratedLayouts } = await import('./migrate-stage-layouts.js');
    snapshotStageLayouts(root);
    const changed = writeStageLayouts(root, migratedLayouts());
    console.log(changed ? 'rewrote src/data/stage-layouts.js from stages.js' : 'already up to date');
  } else {
    createServer((req, res) => {
      handle(req, res).catch((err) => {
        console.error(err);
        if (!res.headersSent) json(res, 500, { ok: false, errors: [err.message] });
      });
    }).listen(PORT, HOST, () => {
      console.log(`LEVEL EDITOR  http://${HOST}:${PORT}`);
      console.log(`  PLAY opens ${GAME_URL} — run \`npm run dev\` in another shell for that half.`);
    });
  }
}
