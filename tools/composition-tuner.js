// THE COMPOSITION TUNER's server: bundles the page, and writes what it saves
// back into src/data/composition-profiles.js.
//
// The level editor's shape (tools/level-editor.js), for the level editor's
// reason: the page has to be built from the REAL game modules, because a
// composition is only worth judging if the picture under the bands was drawn
// by the code that plays the level. Bundling per request means a change to a
// style pack is in the next refresh.
//
// It writes ONE file, and only through tools/lib/composition-profiles-source.js:
// merge the incoming profile into what is already authored, snapshot the old
// copy into work/composition-history/, then atomically replace.
//
// Usage: node tools/composition-tuner.js     (or: npm run composition)
import esbuild from 'esbuild';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CABINET_BY_ID } from '../src/data/cabinets.js';
import { STAGE_BY_ID } from '../src/data/stages.js';
import { COMPOSITION_PROFILES } from '../src/data/composition-profiles.js';
import { validateCompositionProfile } from '../src/engine/composition-profile.js';
import {
  writeCompositionProfiles, snapshotCompositionProfiles, COMPOSITION_PROFILES_REL,
} from './lib/composition-profiles-source.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = process.env.MASH_COMPOSITION_HOST || '127.0.0.1';
// Not 8001 (the game's dev server) and not 8010 (Peter's mixer desk): this
// tool gets its own slot so starting it can never take either down.
const PORT = parseInt(process.env.MASH_COMPOSITION_PORT || '8030', 10);
const HISTORY_DIR = join(root, 'work/composition-history');
const SHOT_DIR = join(root, 'work/local/composition');

async function buildPage() {
  const result = await esbuild.build({
    entryPoints: [join(root, 'tools/composition-tuner-entry.js')],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    minify: false,          // dev tool: readable stacks beat bytes
    write: false,
    logLevel: 'warning',
  });
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const shell = readFileSync(join(root, 'tools/composition-tuner-shell.html'), 'utf8');
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
    // A PNG of a phone screen is a few hundred kilobytes. Past this it is a
    // mistake or a stranger, and either way it is not getting parsed.
    if (size > 16 * 1024 * 1024) { reject(new Error('payload too large')); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

/**
 * Fold one saved profile into everything already authored. The page sends a
 * FULL resolved profile for one cabinet or one stage; the writer decides what
 * is worth writing down by diffing it against the defaults.
 */
export function mergeProfile(existing, { cabinet, stage, profile }) {
  if (!cabinet || !CABINET_BY_ID[cabinet]) throw new Error(`unknown cabinet: ${cabinet}`);
  if (stage && !STAGE_BY_ID[stage]) throw new Error(`unknown stage: ${stage}`);
  if (stage && STAGE_BY_ID[stage].cabinet !== cabinet) {
    throw new Error(`${stage} is not a ${cabinet} stage`);
  }
  const validated = validateCompositionProfile(profile);
  const next = {};
  for (const [id, entry] of Object.entries(existing || {})) {
    next[id] = { ...entry, stages: { ...(entry.stages || {}) } };
  }
  if (!next[cabinet]) next[cabinet] = { stages: {} };
  if (stage) {
    next[cabinet].stages[stage] = { bands: validated.bands, groundAnchorRatio: validated.groundAnchorRatio };
  } else {
    next[cabinet].bands = validated.bands;
    next[cabinet].groundAnchorRatio = validated.groundAnchorRatio;
  }
  return next;
}

function writeSnapshotPng(payload) {
  const { png, stage, viewport } = payload || {};
  if (typeof png !== 'string' || !png.startsWith('data:image/png;base64,')) {
    throw new Error('expected a PNG data URL');
  }
  mkdirSync(SHOT_DIR, { recursive: true });
  const safeName = String(stage || 'stage').replace(/[^\w.-]+/g, '-');
  const safeView = String(viewport || 'viewport').replace(/[^\w.-]+/g, '-');
  const rel = join('work/local/composition', `${safeName}-${safeView}.png`);
  writeFileSync(join(root, rel), Buffer.from(png.slice(png.indexOf(',') + 1), 'base64'));
  return rel;
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try {
      const html = await buildPage();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      // A failed bundle is the common case while editing the entry, so it is
      // shown as the page rather than as a blank tab and a server log.
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`composition tuner failed to build:\n\n${err.message}`);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/profiles') {
    return json(res, 200, { ok: true, profiles: COMPOSITION_PROFILES });
  }

  if (req.method === 'POST' && url.pathname === '/save') {
    try {
      const payload = JSON.parse(await readBody(req));
      // Re-read the file rather than trusting this process's import: the
      // tuner may have been left open across an edit somewhere else.
      const current = await import(
        `${pathToFileURL(join(root, COMPOSITION_PROFILES_REL)).href}?t=${Date.now()}`);
      const merged = mergeProfile(current.COMPOSITION_PROFILES, payload);
      const snapshot = snapshotCompositionProfiles(root);
      const changed = writeCompositionProfiles(root, merged);
      return json(res, 200, {
        ok: true, changed,
        snapshot: snapshot ? snapshot.replace(`${root}/`, '') : null,
      });
    } catch (err) {
      return json(res, 400, { ok: false, errors: [err.message] });
    }
  }

  if (req.method === 'POST' && url.pathname === '/snapshot') {
    try {
      const path = writeSnapshotPng(JSON.parse(await readBody(req)));
      return json(res, 200, { ok: true, path });
    } catch (err) {
      return json(res, 400, { ok: false, errors: [err.message] });
    }
  }

  if (req.method === 'GET' && url.pathname === '/history') {
    const files = existsSync(HISTORY_DIR)
      ? readdirSync(HISTORY_DIR).filter((f) => f.startsWith('composition-profiles-')).sort().reverse()
      : [];
    return json(res, 200, { files });
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
}

// argv[1] is absent when this module is imported (tests, `node -e`), and the
// server must not start in that case.
const invokedDirectly = !!process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) json(res, 500, { ok: false, errors: [err.message] });
    });
  }).listen(PORT, HOST, () => {
    console.log(`COMPOSITION TUNER  http://${HOST}:${PORT}`);
    console.log(`  writes ${COMPOSITION_PROFILES_REL}; shots land in work/local/composition/`);
  });
}
