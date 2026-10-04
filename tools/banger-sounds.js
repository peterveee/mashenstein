// BANGER SOUNDS — the page that decides what a banger sounds like. 2 Oct 2026.
//
//   npm run banger-sounds        http://localhost:8022/
//
// Every sound Make a Banger… uses lives in one table, tools/lib/banger/sounds.js: one
// preset per generated part, the drum kits, the shortlists Riff Sound = Random draws
// from, per-mood overrides and a never-use list. This page edits it. Every slot offers
// only what the rulebook (tools/lib/banger/sound-rules.js) allows there and says why the
// rest is shut; every slot can be auditioned in its real job through the game's engine;
// a test banger plays the table as it stands, saved or not; and FROM YOUR SONGS lists
// every preset the songs on disk use — the remixes first — so a sound that has already
// worked can go straight onto a list.
//
// The page does the music; this process only serves it, reads the songs, and writes the
// table on Save — refusing a table the rulebook rejects, and a Save made against a file
// that changed on disk after the page loaded (several sessions share this tree).
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { soundsSource, tidyTable } from './lib/banger/sounds-source.js';
import { tableIssues } from './lib/banger/sound-rules.js';
import { VOICES, baseLane, seamFor } from '../src/data/voices.js';
import { bangerIssues, writeBangerSong } from './lib/banger-file.js';
import { slugFor, songFileIn, writeImportedIndex } from './lib/imported-index.js';
import { paletteIssues, tidyPalette } from './lib/banger/palette.js';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.MASH_BANGER_SOUNDS_PORT) || 8022;
const SOUNDS_FILE = join(root, 'tools/lib/banger/sounds.js');
const PALETTE_FILE = join(root, 'tools/lib/banger/palette.json');

// ------------------------------------------------------------------- bundle
// Rebuilt on every page load, like the SFX desk: a fresh bundle cannot go stale against a
// Save this process just wrote, or against a generator edit made in another window.
function bundle(entry = 'tools/banger-sounds-entry.js', name = 'banger-sounds') {
  const esbuild = require('esbuild');
  const out = esbuild.buildSync({
    entryPoints: [join(root, entry)],
    bundle: true,
    format: 'iife',
    write: false,
    logLevel: 'warning',
    define: { __MASH_BUILD__: JSON.stringify(name) },
  });
  return out.outputFiles[0].text;
}

// ------------------------------------------------------------------- the table
const hashOf = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);
let importSeq = 0;
const fresh = (path) => import(`${pathToFileURL(path).href}?v=${Date.now()}-${++importSeq}`);

async function readTable() {
  const text = readFileSync(SOUNDS_FILE, 'utf8');
  const mod = await fresh(SOUNDS_FILE);
  return { table: mod.BANGER_SOUNDS, hash: hashOf(text) };
}

/** Write a table, or say why not. */
export function saveTable(table, baseHash, file = SOUNDS_FILE) {
  const now = hashOf(readFileSync(file, 'utf8'));
  if (baseHash && baseHash !== now) {
    return { status: 409, body: { error: 'the sounds file changed on disk since this page loaded — reload to see it, then make your change again' } };
  }
  const tidy = tidyTable(table);
  const issues = tableIssues(tidy);
  if (issues.length) return { status: 422, body: { error: 'the table breaks the rules', issues } };
  const source = soundsSource(tidy);
  writeFileSync(file, source);
  return { status: 200, body: { hash: hashOf(source) } };
}

const paletteHash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);
export function readPalette(file = PALETTE_FILE) {
  const source = readFileSync(file, 'utf8');
  return { palette: tidyPalette(JSON.parse(source)), hash: paletteHash(source) };
}
export function savePalette(palette, baseHash, file = PALETTE_FILE) {
  const current = readFileSync(file, 'utf8');
  if (baseHash && baseHash !== paletteHash(current)) {
    return { status: 409, body: { error: 'the palette changed on disk since this page loaded — reload to see it, then make your change again' } };
  }
  const tidy = tidyPalette(palette);
  const issues = paletteIssues(tidy);
  if (issues.length) return { status: 422, body: { error: 'the palette breaks the rules', issues } };
  const source = `${JSON.stringify(tidy, null, 2)}\n`;
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(temp, source, { flag: 'wx' });
    renameSync(temp, file);
  } catch (err) {
    try { unlinkSync(temp); } catch { /* no temporary file to clean up */ }
    throw err;
  }
  return { status: 200, body: { hash: paletteHash(source) } };
}

// ------------------------------------------------------------------- the songs
// Every preset the songs on disk use, per song, for FROM YOUR SONGS. A song file is read
// again only when it changed, so the panel opening twice costs one scan.
const SONG_DIRS = ['src/data/songs', 'src/data/imported', 'work/scratch'];
const songCache = new Map();   // path -> { mtime, song }

async function songVoices(path, dir) {
  const mtime = statSync(path).mtimeMs;
  const held = songCache.get(path);
  if (held && held.mtime === mtime) return held.song;
  let song = null;
  try {
    const mod = await fresh(path);
    if (mod.bank && !mod.banger) {
      const mix = mod.mix || {};
      const keys = new Set([
        ...Object.keys(mix.voice || {}), ...Object.keys(mix.voiceParams || {}),
        ...Object.keys(mod.bank).filter((k) => /Voice$/.test(k)),
      ]);
      const voices = [];
      for (const vk of keys) {
        const lane = vk.replace(/Voice$/, '');
        if (!seamFor(lane)) continue;
        // The library preset the lane names. A frozen copy keeps that name beside it in
        // `voice`; the composition's own choice is the fallback.
        const id = mix.voice?.[vk] ?? mod.bank[vk];
        if (!id || !VOICES[id] || VOICES[id].songLocal) continue;
        voices.push({ lane, family: baseLane(lane), id, edited: !!mix.voiceParams?.[vk] && mix.voiceParams[vk].songOrigin === 'user' });
      }
      const group = dir === 'src/data/songs' ? 'game' : (mod.group || (dir === 'work/scratch' ? 'scratch' : 'imported'));
      song = { id: mod.id || path.split('/').pop().slice(0, -3), title: mod.title || '', group, alternateOf: mod.alternateOf || null, voices };
    }
  } catch { song = null; }
  songCache.set(path, { mtime, song });
  return song;
}

async function harvest() {
  const songs = [];
  for (const dir of SONG_DIRS) {
    const full = join(root, dir);
    if (!existsSync(full)) continue;
    for (const file of readdirSync(full).sort()) {
      if (!file.endsWith('.js') || file === 'index.js') continue;
      const song = await songVoices(join(full, file), dir);
      if (song && song.voices.length) songs.push(song);
    }
  }
  return songs;
}

// ------------------------------------------------------------------- server
const send = (res, code, type, body) => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
};
const json = (res, code, body) => send(res, code, 'application/json', JSON.stringify(body));
const readBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 4e6) req.destroy(); });
  req.on('end', () => resolve(body));
  req.on('error', reject);
});

export function startServer(port = PORT) {
  const server = createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/sounds') return json(res, 200, await readTable());
      if (req.method === 'GET' && req.url === '/palette') return json(res, 200, readPalette());
      if (req.method === 'GET' && req.url === '/harvest') return json(res, 200, { songs: await harvest() });
      if (req.method === 'POST' && req.url === '/save') {
        const { table, hash } = JSON.parse((await readBody(req)) || '{}');
        const out = saveTable(table, hash);
        if (out.status === 200) console.log(`saved ${SOUNDS_FILE.slice(root.length + 1)}`);
        else console.warn(`refused a save: ${out.body.error}`);
        return json(res, out.status, out.body);
      }
      if (req.method === 'POST' && req.url === '/palette/save') {
        const { palette, hash } = JSON.parse((await readBody(req)) || '{}');
        const out = savePalette(palette, hash);
        if (out.status === 200) console.log(`saved ${PALETTE_FILE.slice(root.length + 1)}`);
        else console.warn(`refused a palette save: ${out.body.error}`);
        return json(res, out.status, out.body);
      }
      if (req.url === '/banger-palette-bundle.js') {
        try { return send(res, 200, 'application/javascript', bundle('tools/banger-palette-entry.js', 'banger-palette')); }
        catch (err) { return send(res, 500, 'application/javascript', `document.body.textContent = ${JSON.stringify(`bundle failed: ${err.message}`)};`); }
      }
      // Open on the Desk: the page's test banger, written into work/bangers like any banger
      // the desk makes, so the desk (which reads that folder on every load) opens it.
      if (req.method === 'POST' && req.url === '/open-on-desk') {
        const { generated } = JSON.parse((await readBody(req)) || '{}');
        const issues = bangerIssues(generated);
        if (issues.length) return json(res, 422, { error: `not a banger: ${issues.join('; ')}` });
        const title = `${String(generated.title || 'BANGER').replace(/ BANGER$/, '')} TEST BANGER`;
        let id = slugFor(title);
        for (let i = 2; songFileIn(root, id); i++) id = `${slugFor(title)}-${i}`;
        const { file } = writeBangerSong(root, { id, title, generated });
        writeImportedIndex(root);
        console.log(`wrote ${file} for the desk`);
        return json(res, 200, { id, title, file });
      }
      if (req.url === '/banger-sounds-bundle.js') {
        try { return send(res, 200, 'application/javascript', bundle()); } catch (err) {
          return send(res, 500, 'application/javascript',
            `document.body.textContent = ${JSON.stringify(`bundle failed: ${err.message}`)};`);
        }
      }
      const shell = join(root, req.url === '/advanced' ? 'tools/banger-sounds-shell.html' : 'tools/banger-palette-shell.html');
      if (!existsSync(shell)) return send(res, 500, 'text/plain', 'shell missing');
      return send(res, 200, 'text/html', readFileSync(shell));
    } catch (err) {
      return json(res, 500, { error: String(err?.message || err) });
    }
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Banger Sound Palette on http://localhost:${port}/`);
    console.log('  add scoped presets, trims and channel effects; Save writes tools/lib/banger/palette.json. Ctrl-C to stop.');
  });
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) startServer();
