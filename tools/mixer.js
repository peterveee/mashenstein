// The song mixer workbench: `npm run mixer`.
//
// Bundles tools/mixer-entry.js into tools/mixer-shell.html the same way
// build-gallery.js does, then serves it — because unlike the gallery this tool
// writes back. "Save song" posts one song and this process rewrites that song's
// source file, which the game and every render tool then read. Peter reviews and
// commits; nothing here touches git.
import { createServer } from 'http';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, rmSync,
  copyFileSync, readdirSync, statSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer } from './lib/wav.js';
import { loudness, gainToTarget, LOUDNESS_TARGET } from './lib/loudness.js';
import { midiBuffer } from './lib/render-midi-bank.js';
import { bankFromMidi } from './lib/midi-import.js';
import { writeImportedIndex, importId, slugFor, IMPORTED_DIR, SCRATCH_DIR, SONG_DIRS, songFileIn } from './lib/imported-index.js';
import { buildVisualiserHtml } from './build-visualiser.js';
import { MIXER_BRAND } from './mixer-brand.js';
// Through lib/tracks.js, not src/data/tracks.js: that is what registers the songs in
// src/data/imported/ as tracks, so an import is renderable without a restart.
import { resolveTrack, listTracks, registerTrack, unregisterTrack } from './lib/tracks.js';
import { isDefaultMasterChain, EFFECT_BY_ID, paramRange } from '../src/engine/effects.js';
import { renderArrangementsFile } from './lib/arrangements-source.js';
import { bpmOf, arrangementIssues } from '../src/data/arrangements.js';
import { writeSongFile, writableSongPath, snapshotSongFile, notesImport } from './lib/song-file.js';
// Both applied on the way to disk, not while editing, and in this order.
//
// `compactArrangement` empties the bar of each forked section the plan cannot reach — a
// per-bar edit materialises a whole two-bar lane and only one bar of it is ever read —
// and `normaliseArrangementResolution` then asks how fine the surviving music really is.
// That order is the point: the second refuses to demote while ANY lane holds a note off
// the coarser grid and cannot tell a played note from a stranded one, so a song promoted
// to a fine grid by the quantise picker stays promoted forever on the strength of bars
// nothing plays — and the flag costs the sequencer its whole-tick fast path for the
// whole song. Compact first and it sees only the music.
import { normaliseArrangementResolution, compactArrangement } from './lib/arrangement-edit.js';
// The same builder scratch songs are born through — an alternate is a song file like
// any other, so it is written by the one function that knows that shape.
import { songFile } from './lib/song-source.js';
import { validateVariants } from './lib/mix-source.js';
import { writeSongsIndex } from './lib/songs-index.js';
import { newScratchSong } from './lib/new-song.js';
import { randomSongName } from './lib/song-names.js';
// The sends' defaults, read from the engine rather than written out again here: a
// value equal to its default is left out of the file, so a number that drifted apart
// from the engine's would quietly stop being saved.
import { AUXES, AUX_DEFAULTS } from '../src/engine/mixer.js';
import {
  EFFECT_PRESETS_PATH, readEffectPresets, writeEffectPresetsAtomic, normalizeKnownDefaults,
} from './lib/effect-presets-source.js';
import {
  readVoicesSource, writeVoicesSource, upsertPreset, deletePreset, setMeasured,
  readMeasured, tableOf, TABLES, USER_TABLES,
} from './lib/voices-source.js';
import { measureVoiceAt, homeLane } from './lib/measure-voice.js';
import { VOICES } from '../src/data/voices.js';
// Read once, at start-up: the starter set is written by tools/freeze-starter-voices.js,
// which is a script somebody types, not something this server can cause to happen.
const STARTER_IDS = new Set(Object.values(VOICES).filter((v) => v.starter).map((v) => v.id));
const LIBRARY_IDS = new Set(Object.values(VOICES).filter((v) => v.factory).map((v) => v.id));

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIX_PATH = join(ROOT, 'src/data/mix.js');
// The other half of what the desk writes: what plays when, as opposed to what it
// sounds like. Saved in the same breath and snapshotted beside it.
const ARRANGEMENTS_PATH = join(ROOT, 'src/data/arrangements.js');
// Every version of mix.js this process has overwritten, oldest kept last. Gitignored:
// it is a safety net under a session, not a second history beside git.
const HISTORY_DIR = join(ROOT, 'work/mix-history');
// Roughly a month of hard mixing at a save every few minutes. Small files — a whole
// mix is ~12KB — so the cap is about keeping the folder readable, not about disk.
const HISTORY_KEEP = 300;

const HOST = process.env.MASH_MIXER_HOST || '127.0.0.1';
const PORT = Number(process.env.MASH_MIXER_PORT) || 8010;
// This process is the development server, so every page it serves starts as DEV.
// Regular-user mode is a per-tab choice in mixer-entry.js: append `?dev=0`.
const DEV_USER = true;
const randomSongSeed = () => randomBytes(4).readUInt32LE(0);

// Rebuilt per request so a save-and-refresh picks up engine edits without a restart.
async function buildPage() {
  // And the imported list with it. It is generated from the folder, so an import
  // writes it — but a scratch bank deleted by hand left a dead import behind, and a
  // dead import is not a missing song: esbuild cannot resolve it, so the whole desk
  // came back as a stack trace. Rebuilding it here is a directory scan against a
  // bundle, and it means the folder is what the desk shows, always.
  writeImportedIndex(ROOT);
  const out = await esbuild.build({
    entryPoints: [join(ROOT, 'tools/mixer-entry.js')],
    bundle: true, format: 'iife', target: ['es2020'],
    minify: false,               // dev tool: readable stacks beat bytes
    write: false, logLevel: 'warning',
    outdir: join(ROOT, 'dist'),
  });
  const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const shell = readFileSync(join(ROOT, 'tools/mixer-shell.html'), 'utf8');
  return shell
    .replaceAll('/*__MIXER_BRAND__*/', () => MIXER_BRAND)
    .replace('/*__MIXER_DEV_USER__*/', () => String(DEV_USER))
    .replace('/*__BUNDLE__*/', () => js);
}

// The desk's render frame: a second, unbound copy of the audio engine, loaded in a
// hidden iframe when you press Render WAV. See tools/mixer-render-entry.js for why
// it has to be a separate document.
//
// Request-built like the desk itself, so a voice change lands in the next bounce
// without restarting the server — which is the same promise `npm run mixer` has
// always made, now extended to the thing that writes the WAV.
async function buildRenderFramePage() {
  const out = await esbuild.build({
    entryPoints: [join(ROOT, 'tools/mixer-render-entry.js')],
    bundle: true, format: 'iife', target: ['es2020'],
    minify: false, write: false, logLevel: 'warning', outdir: join(ROOT, 'dist'),
  });
  const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const shell = readFileSync(join(ROOT, 'tools/mixer-render-shell.html'), 'utf8');
  return shell.replace('/*__BUNDLE__*/', () => js);
}

// The file-driven visualiser: the jukebox presets played against an imported MP3
// or WAV instead of against a song the sequencer is playing. It needs nothing from
// this server but the bundle — the file never leaves the browser — so it is a
// read-only route with none of the save or history machinery anywhere near it.
//
// Request-built like everything else here, so an edit to the analyser or to a
// preset lands on refresh. Built by the same function that writes the standalone
// dist/visualiser.html rather than a second copy of the configuration — that
// configuration is what keeps the cast out of the bundle, and a served page that
// quietly carried them while the built one did not would be the worst of both.
const buildVisualiserPage = async () => (await buildVisualiserHtml(ROOT)).html;

// The standalone MRDR-3 playground shares the editor and keyboard bundle with the
// desk, but has its own full-window shell. Keep it request-built in development so
// edits to the editor, catalogue, or audio path are picked up without restarting the
// server (the production builder emits the same shell into dist/MRDR3/).
async function buildMrdr3Page() {
  const out = await esbuild.build({
    entryPoints: [join(ROOT, 'tools/mrdr3-entry.js')],
    bundle: true, format: 'iife', target: ['es2020'],
    minify: false, write: false, logLevel: 'warning', outdir: join(ROOT, 'dist'),
  });
  const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const mixerShell = readFileSync(join(ROOT, 'tools/mixer-shell.html'), 'utf8');
  const styleStart = mixerShell.indexOf('<style>') + '<style>'.length;
  const styleEnd = mixerShell.indexOf('</style>', styleStart);
  if (styleStart < '<style>'.length || styleEnd < styleStart) {
    throw new Error('mixer shell has no injectable style block');
  }
  const style = mixerShell.slice(styleStart, styleEnd);
  const shell = readFileSync(join(ROOT, 'tools/mrdr3-shell.html'), 'utf8');
  return shell.replace('/*__MIXER_STYLE__*/', () => style)
    .replace('/*__BUNDLE__*/', () => js);
}

// `renderMixFile` used to live here: it rebuilt src/data/mix.js from all thirty-four
// songs at once. It is deleted rather than merely unused, because while it existed a
// desk or a server started before the songs moved could still call it — and it kept
// "everything above `export const MIX`" as a header, so writing through it under the
// new mix.js produced a file that imported the song folder AND redefined MIX beneath
// it. That parses, exports, and silently shadows every song file. It cost a mix.
//
// One song is written by one function now: writeSongFile, in lib/song-file.js.
const round = (n) => Math.round(n * 1000) / 1000;

function tail() {
  const src = readFileSync(MIX_PATH, 'utf8');
  const i = src.indexOf('export const LANE_DEFAULTS');
  return i >= 0 ? `\n${src.slice(i)}` : '';
}

// ---- history: every version of mix.js this process has replaced ---------------
//
// Saving is not committing, and between two saves there was nothing holding the
// version you just wrote over: undo lives in the desk, but the moment a mix reaches
// the file the only way back was git — and git only has what Peter has committed.
// So every write takes a byte copy of the file as it stood first.
//
// Byte copies of the .js, not JSON dumps of the parsed mix: the snapshot is then the
// exact file, restorable by hand with `cp`, diffable against the current one in the
// syntax it is actually written in, and — because it is a real ES module — loadable
// by this process to hand the desk one song out of it. JSON would be a re-rendering
// of the file rather than the file.

/** `2026-07-28T1934` — sortable, readable, and legal in a filename on every OS. */
function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    + `T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Filename-safe, and short enough that the timestamp stays readable beside it. */
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '').slice(0, 40) || 'save';

/**
 * Copy mix.js aside before it is overwritten. `label` is what the save was about —
 * the track id for a one-song save, `3-songs` for a sweep — so the folder reads as a
 * list of decisions rather than a wall of timestamps.
 *
 * Returns the snapshot's filename, or null if there was no file to copy (a first
 * save on a fresh checkout, which has nothing to lose).
 */
export function snapshotMix(label, dir = HISTORY_DIR, path = MIX_PATH, prefix = 'mix') {
  if (!existsSync(path)) return null;
  mkdirSync(dir, { recursive: true });
  const name = `${prefix}-${stamp()}-${slug(label)}.js`;
  copyFileSync(path, join(dir, name));
  // Oldest out once the folder is full, counted per KIND: a mix save and the
  // arrangement save beside it are one moment in two files, and pruning them against
  // a shared total would drop the older halves of pairs first.
  const all = readdirSync(dir).filter((f) => f.startsWith(`${prefix}-`) && f.endsWith('.js')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - HISTORY_KEEP))) {
    rmSync(join(dir, old), { force: true });
  }
  return name;
}

/**
 * The snapshots, newest first: what the desk lists in Restore a previous save.
 *
 * Only the mix ones are listed. The arrangement snapshot beside each is found by its
 * matching name rather than shown as a second entry — they are one moment, and a
 * list that showed both would ask you to pick a half.
 */
export function listHistory(dir = HISTORY_DIR) {
  if (!existsSync(dir)) return [];
  const all = readdirSync(dir);
  const legacy = all
    .filter((f) => /^mix-.*\.js$/.test(f))
    .map((file) => {
      // The label is what is left after `mix-<date>T<time>-`; the mtime is when the
      // copy was taken, which is the same instant the stamp records but does not
      // need parsing back out of the name.
      const m = /^mix-(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})-(.*)\.js$/.exec(file);
      const pair = `arr-${file.slice('mix-'.length)}`;
      return {
        file,
        arrangements: all.includes(pair) ? pair : null,
        at: statSync(join(dir, file)).mtimeMs,
        date: m ? `${m[1]} ${m[2]}:${m[3]}:${m[4]}` : file,
        label: m ? m[5] : '',
        bytes: statSync(join(dir, file)).size,
      };
    });
  // Current saves are one song file, one snapshot. Its data half exports `mix` and
  // `arrangement` together, so there is no paired filename to find and no chance of
  // restoring two different moments by accident.
  const current = all
    .filter((f) => /^song-\d{4}-\d{2}-\d{2}T\d{6}-.+\.js$/.test(f))
    .map((file) => {
      const m = /^song-(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})-(.+)\.js$/.exec(file);
      const track = m?.[5] || '';
      return {
        file,
        track,
        arrangements: file,
        at: statSync(join(dir, file)).mtimeMs,
        date: m ? `${m[1]} ${m[2]}:${m[3]}:${m[4]}` : file,
        label: track,
        bytes: statSync(join(dir, file)).size,
      };
    });
  return [...legacy, ...current].sort((a, b) => b.at - a.at);
}

/**
 * Load a file this process may have rewritten since it last looked.
 *
 * Node caches an ES module by its full URL, so a plain `import()` of mix.js hands back
 * the parse from the first time it was read — which is why every reader here bumps a
 * counter into the query string. EVERY reader, through this one function, off this ONE
 * counter, and that is the whole point of it existing.
 *
 * There used to be two counters, `historySeq` and `importSeq`, both starting at zero
 * and both busting the cache for `src/data/mix.js`. The moment one of them reached a
 * number the other had already used on that path, the import came back from the cache:
 * the file as it had been at that earlier moment. And the reader that got the stale
 * copy was the one behind Save — which merges the song being written into "the file as
 * it stands" and rewrites the lot. So a save of one song silently put every OTHER song
 * back to an older version of itself, and the desk, which takes its idea of what is on
 * disk from the same read, believed it. That is what Revert then reverted to.
 *
 * `shop` lost its voices, its delay EQ and its distortion this way, twice, to saves of
 * `title` and `megamix` — recoverable only because every write leaves a snapshot.
 */
let importSeq = 0;
export const freshImport = (path) => import(`${pathToFileURL(path).href}?v=${++importSeq}`);

/**
 * Read one exported desk-state field directly from every authoritative song file.
 *
 * Re-importing mix.js is not enough now that it imports songs/index.js: Node may give
 * that dependency back from cache, which makes a save's readback report the version
 * from before the save. Each song module gets the cache-buster itself here.
 */
export async function readSongStateDir(dir, field) {
  if (!existsSync(dir)) return {};
  const out = {};
  const files = readdirSync(dir)
    .filter((f) => f !== 'index.js' && f.endsWith('.js'))
    .sort();
  for (const file of files) {
    const id = file.slice(0, -3);
    const mod = await freshImport(join(dir, file));
    if (mod[field] != null) out[id] = JSON.parse(JSON.stringify(mod[field]));
  }
  return out;
}

/** One snapshot's MIX, parsed by loading it — it is a module, so this is free. */
async function readHistory(file, dir = HISTORY_DIR) {
  const path = join(dir, file);
  if (!existsSync(path)) return null;
  const mod = await loadSnapshot(path);
  return mod?.MIX || null;
}

/**
 * Load a snapshot, whatever shape it is.
 *
 * New ones are data with no imports and load straight. The ones already in the
 * folder are byte copies of src/data/mix.js from before the songs moved, and their
 * header imports `./songs/index.js` — a path that does not exist from in here, so
 * they will not load at all. That is a backup you cannot open, which is the whole
 * job it had.
 *
 * So: the import lines are stripped and what is left is loaded from memory. Nothing
 * in a snapshot needs them — a saved mix is numbers.
 */
async function loadSnapshot(path) {
  try {
    return await freshImport(path);
  } catch (err) {
    const message = String(err && err.message);
    // A snapshot written before `notesImport` existed: its arrangement is in `seq(…)`
    // shorthand and the header that promised "no imports" left the helper undefined,
    // so the file throws on the way in. Repaired in place rather than worked around —
    // the aim is a folder of backups that open, not a reader that copes.
    if (/\b(seq|chordSeq|chord|n) is not defined\b/.test(message)) {
      const text = readFileSync(path, 'utf8');
      writeFileSync(path, notesImport(ROOT, dirname(path), text) + text);
      console.log(`  (repaired ${path.split('/').pop()} — it was missing the note-shorthand import)`);
      return freshImport(path);
    }
    if (!/Cannot find module|ERR_MODULE_NOT_FOUND/.test(message)) throw err;
    const text = readFileSync(path, 'utf8');
    // Whatever those imports BOUND has to keep existing, or the file throws instead:
    // the old mix.js and arrangements.js shims read `MIX_BY_ID` in their own bodies.
    // Declared empty, which is the truth about a snapshot of a shim — it held no data
    // of its own, only a pointer at the song folder.
    const bound = [...text.matchAll(/^\s*import\s+\{([^}]*)\}/gm)]
      .flatMap((m) => m[1].split(',').map((x) => x.trim().split(/\s+as\s+/).pop()))
      .filter(Boolean);
    const stripped = text.replace(/^\s*import\s.*$/gm, '');
    const shim = bound.length ? `const ${bound.map((b) => `${b} = {}`).join(', ')};\n` : '';
    const url = `data:text/javascript;base64,${Buffer.from(shim + stripped).toString('base64')}`;
    console.log(`  (read ${path.split('/').pop()} without its imports — a snapshot from before the songs moved)`);
    return import(url);
  }
}

/** And its arrangement half, if there was one when it was taken. */
async function readHistoryArrangements(file, dir = HISTORY_DIR) {
  const path = join(dir, file);
  if (!existsSync(path)) return null;
  const mod = await loadSnapshot(path);
  return mod.ARRANGEMENTS || null;
}

/** One historical moment in the map shape the desk consumes. */
export async function readHistoryVersion(file, dir = HISTORY_DIR) {
  if (file.startsWith('song-')) {
    const m = /^song-\d{4}-\d{2}-\d{2}T\d{6}-(.+)\.js$/.exec(file);
    const path = join(dir, file);
    if (!m || !existsSync(path)) return null;
    const id = m[1];
    const mod = await loadSnapshot(path);
    return {
      mix: { [id]: mod.mix ?? null },
      arrangements: { [id]: mod.arrangement ?? null },
    };
  }
  const mix = await readHistory(file, dir);
  if (!mix) return null;
  const pair = `arr-${file.slice('mix-'.length)}`;
  const arrangements = existsSync(join(dir, pair))
    ? await readHistoryArrangements(pair, dir) : null;
  return { mix, arrangements };
}

/** The mix as the FILE currently holds it, whatever this process last wrote. */
async function readCurrentMix() {
  return {
    ...await readSongStateDir(join(ROOT, 'src/data/songs'), 'mix'),
    ...await readSongStateDir(join(ROOT, IMPORTED_DIR), 'mix'),
    ...await readSongStateDir(join(ROOT, SCRATCH_DIR), 'mix'),
  };
}

/** The same, for the arrangement layer. Absent file is an empty layer, not an error. */
async function readCurrentArrangements() {
  return {
    ...await readSongStateDir(join(ROOT, 'src/data/songs'), 'arrangement'),
    ...await readSongStateDir(join(ROOT, IMPORTED_DIR), 'arrangement'),
    ...await readSongStateDir(join(ROOT, SCRATCH_DIR), 'arrangement'),
  };
}

async function readCurrentM8trx() {
  return {
    ...await readSongStateDir(join(ROOT, 'src/data/songs'), 'm8trx'),
    ...await readSongStateDir(join(ROOT, IMPORTED_DIR), 'm8trx'),
    ...await readSongStateDir(join(ROOT, SCRATCH_DIR), 'm8trx'),
  };
}

/**
 * The arrangement layer's own snapshot, taken with the mix's and named to match.
 *
 * The pair is the point: `mix-<stamp>-<label>.js` and `arr-<stamp>-<label>.js` share
 * a timestamp, so restoring a moment restores both halves of it. A balance from one
 * evening laid over a bar plan from another is a song neither of them was.
 */
const snapshotArrangements = (label) => snapshotMix(label, HISTORY_DIR, ARRANGEMENTS_PATH, 'arr');


// One Chromium, opened on first use and kept warm. A launch is ~1s and the desk
// renders repeatedly while a mix is being dialled in.
let renderer = null;
async function getRenderer() {
  // A warm singleton that is never checked is one crash away from a desk that can
  // only render again after a restart: Chromium goes away — a crash, a sleep, a
  // stray pkill — and every render from then on comes back as "Target page, context
  // or browser has been closed", which reads like a bug in the song.
  if (renderer && !renderer.isAlive?.()) {
    console.log('the render engine went away — starting another');
    renderer = null;
  }
  if (!renderer) {
    console.log('starting the render engine (headless Chromium)...');
    renderer = await openRenderer();
  }
  return renderer;
}

// Whether this is Chromium having died rather than the render itself failing. The
// browser can also go down BETWEEN the liveness check and the render, so the retry
// matters as much as the check.
const engineGone = (err) => /target (page|browser|closed)|has been closed|browser has disconnected|browser closed/i
  .test(String((err && err.message) || err));

/** Render, and if the engine died under us, stand a new one up and try once more. */
async function withRenderer(fn) {
  try {
    return await fn(await getRenderer());
  } catch (err) {
    if (!engineGone(err)) throw err;
    console.log('the render engine died mid-render — starting another and retrying');
    try { await renderer?.close(); } catch { /* it is already gone; that is the point */ }
    renderer = null;
    return fn(await getRenderer());
  }
}

/**
 * Drop the warm Chromium, so the next render bundles the source as it is NOW.
 *
 * openRenderer runs esbuild once, at open time, and the page keeps that bundle for
 * its life. That is right for a mixing session — the mix is data the desk posts in,
 * not source — but a preset edit IS source, and measuring it in a browser holding the
 * bundle from before the edit would measure the preset it replaced. Silently, and
 * with a plausible number.
 */
async function restartRenderer() {
  if (!renderer) return;
  try { await renderer.close(); } catch { /* already gone, which is the goal */ }
  renderer = null;
}

/**
 * What one note of a preset reaches through the render pipeline, at unity.
 *
 * The bank, the lane and the arithmetic are tools/lib/measure-voice.js, which is also
 * what tools/measure-voices.js measures the whole library with — so a level saved from
 * the desk and a level from a full re-measure are the same number rather than two
 * conventions that nearly agree.
 *
 * Takes the preset from the request and its current numbers from the SOURCE, because
 * this process cannot see either: its own copy of src/data/voices.js was imported at
 * start-up, and the entry being measured was written to the file a moment ago.
 */
const measureVoice = (id, preset, src) => withRenderer((r) => {
  // What the RENDERER will play it at: it bundles the file that was just written, and
  // the measured blocks in there still hold the previous numbers — or none at all, for
  // a preset being saved for the first time. `measureVoiceAt` divides exactly that back
  // out, so what it hands back is the preset at unity either way.
  const voice = { ...preset, id, ...readMeasured(src, id) };
  return measureVoiceAt(r.render, voice, homeLane(voice));
});

/**
 * Everywhere a preset is named: the saved mixes, and the banks themselves.
 *
 * Deleting a preset that a song plays does not fail loudly — `voiceOf` returns null
 * for an id that is not in the catalogue, deliberately, so a renamed preset loses the
 * preset rather than taking the game down. Which means the song quietly goes back to
 * its engine voice and nothing says so. The desk asks first instead.
 *
 * Read from disk each time rather than from the module this process imported at
 * start-up: the desk has been saving over both files all session.
 */
async function voiceRefs(id) {
  const used = [];
  const MIX = (await freshImport(MIX_PATH)).MIX || {};
  for (const [trackId, entry] of Object.entries(MIX)) {
    if (entry?.voice && Object.values(entry.voice).includes(id)) used.push(trackId);
  }
  // And the banks, where a voice can be set on the song itself or on any one section.
  const named = (o) => !!o && Object.entries(o)
    .some(([k, v]) => k.endsWith('Voice') && v === id);
  for (const t of listTracks()) {
    const bank = resolveTrack(t.id)?.bank;
    if (!bank) continue;
    if (named(bank) || (bank.sections || []).some(named)) used.push(t.id);
  }
  return [...new Set(used)];
}

const readJson = async (req) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

// A rendered WAV coming back from the desk, which is the one thing posted here that
// is measured in tens of megabytes rather than kilobytes. Capped so a bad request
// cannot make this process eat the machine: four minutes of 16-bit stereo is ~42MB,
// and the desk will not render more than sixteen passes.
const MAX_RENDER_BYTES = 512 * 1024 * 1024;
const readBytes = async (req, limit = MAX_RENDER_BYTES) => {
  const chunks = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > limit) return null;
    chunks.push(c);
  }
  return Buffer.concat(chunks);
};

function presetTarget(scope, id) {
  if (scope === 'inserts') {
    const def = EFFECT_BY_ID[id];
    return def ? { params: def.params || [], fallback: def.defaults || {}, def } : null;
  }
  if (scope === 'returns') {
    const aux = AUXES.find((a) => a.id === id);
    if (!aux) return null;
    return {
      params: aux.presetParams || [],
      fallback: Object.fromEntries((aux.presetParams || []).map((key) => [key, AUX_DEFAULTS[id][key]])),
      aux,
    };
  }
  return null;
}

function validatePresetValue(scope, id, key, value) {
  if (scope === 'inserts') {
    const range = paramRange(key, EFFECT_BY_ID[id]);
    if (range.options) {
      if (!range.options.includes(value)) throw new Error(`${id}.${key} must be one of ${range.options.join(', ')}`);
      return;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${id}.${key} must be a finite number`);
    if (value < range.min || value > range.max) {
      throw new Error(`${id}.${key} must be between ${range.min} and ${range.max}`);
    }
    return;
  }
  const range = paramRange(key);
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${id}.${key} must be a finite number`);
  if (value < range.min || value > range.max) {
    throw new Error(`${id}.${key} must be between ${range.min} and ${range.max}`);
  }
}

function normalizePresetParams(scope, id, params) {
  const target = presetTarget(scope, id);
  if (!target) throw new Error(`unknown ${scope} effect "${id}"`);
  const out = normalizeKnownDefaults(params, target.params, target.fallback);
  for (const key of target.params) {
    const value = out[key];
    if (value === undefined) throw new Error(`${scope}.${id} has no fallback for "${key}"`);
    validatePresetValue(scope, id, key, value);
  }
  return out;
}

// Render one track through the real engine with the mix applied, and measure it.
async function renderTrack(trackId, mix, { repeat = 1, write = true, arrangement } = {}) {
  const track = resolveTrack(trackId);
  if (!track) throw new Error(`unknown track ${trackId}`);
  // The desk's own bounce is the one render that is supposed to BE the desk, so it is
  // the one that passes the arrangement: `setArrangement` in the page then applies the
  // order, the layer sections, the tempo and the swing together, and the song loop is
  // armed the way the game arms it. Every other caller here still renders the composed
  // form — see the note over `render` in render-bank-browser.js.
  //
  // `arrangement === undefined` means the caller has no opinion (the loudness sweep
  // below); `null` means the desk says this song has no arrangement, which is a
  // different statement and has to reach the page as one.
  const named = arrangement !== undefined;
  const out = await withRenderer((r) => r.render(track.bank, {
    repeat, mix, trackId,
    ...(named ? { arrangement, songLoop: true } : {}),
  }));
  const m = loudness([out.outL, out.outR]);
  let file = null;
  if (write) {
    mkdirSync(join(ROOT, 'dist'), { recursive: true });
    // Written at unity, NOT peak-normalised: the whole point is to hear the mix as
    // balanced, and normalising would silently undo the master trim being set.
    file = join('dist', `${track.slug}-mix.wav`);
    writeFileSync(join(ROOT, file), wavBuffer([out.outL, out.outR], 1));
  }
  return {
    trackId, title: track.title, file,
    seconds: out.seconds, peak: out.peak,
    peakDb: m.peakDb, lufs: m.lufs,
    toTarget: gainToTarget(m.lufs, LOUDNESS_TARGET),
    clipping: out.peak > 1,
  };
}

function idTaken(id, root, resolver) {
  return !!songFileIn(root, id)
    || existsSync(join(root, 'src/data/songs', `${id}.js`))
    || !!resolver(id);
}

/** A New Song always gets a fresh scratch id; importing reuses an existing id. */
export function newScratchId(title, root = ROOT, resolver = resolveTrack) {
  const base = slugFor(title || randomSongName());
  let id = base;
  for (let i = 2; ; i++) {
    if (!idTaken(id, root, resolver)) return id;
    id = `${base}-${i}`;
  }
}

/**
 * The name an unnamed New Song is born with. Picking one whose slug is still free
 * keeps the title and the filename saying the same thing — a numbered id would
 * otherwise reappear behind a perfectly good name.
 */
export function newScratchName(root = ROOT, resolver = resolveTrack) {
  return randomSongName({ isTaken: (name) => idTaken(slugFor(name), root, resolver) });
}

const server = createServer(async (req, res) => {
  try {
    // Create a source-backed scratch song. It is registered immediately for this
    // mixer tab, indexed beside MIDI imports, and deliberately kept out of the
    // game's src/data/songs catalogue.
    if (req.method === 'POST' && req.url === '/new-song') {
      const body = await readJson(req);
      let spec;
      try {
        const title = String(body?.title ?? '').trim() || newScratchName();
        spec = newScratchSong({
          id: newScratchId(title),
          title,
          bpm: body?.bpm,
          bars: body?.bars,
          template: body?.template,
          // Absent or `auto` and the seed picks the style pack — see song-styles.js.
          style: body?.style,
          seed: body?.seed ?? randomSongSeed(),
          // `work/scratch/` is two levels under the root like the in-tree song folders,
          // but it reaches the engine through `src/` rather than out of it.
          notesPath: '../../src/engine/notes.js',
        });
      } catch (err) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end(String(err.message || err));
        return;
      }
      // Into the disposable drawer, not `src/data/imported/` — see SCRATCH_DIR.
      const file = join(ROOT, SCRATCH_DIR, `${spec.id}.js`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, spec.source);
      writeImportedIndex(ROOT);
      const mod = await freshImport(file);
      const registered = registerTrack({
        id: spec.id,
        bank: mod.bank,
        title: mod.title,
        slug: mod.slug,
        group: 'scratch',
        writable: true,
      });
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        file: `${SCRATCH_DIR}/${spec.id}.js`,
        // What the seed decided, so the desk can say it rather than leaving the style
        // to be guessed at from the sound.
        style: spec.styleLabel, key: spec.key, bpm: spec.bpm,
        track: { id: registered.id, title: registered.title, slug: registered.slug,
          group: 'scratch', writable: true, bank: registered.bank },
      }));
      return;
    }

    // Scratch sources are deliberately disposable. Deleting one is explicit and
    // narrow: catalogue songs and marker-less MIDI imports can never be removed by
    // this route, and the desk's local draft is discarded by the client afterwards.
    if (req.method === 'POST' && req.url === '/delete-song') {
      const body = await readJson(req);
      const id = String(body?.id || '');
      const track = resolveTrack(id);
      const target = id ? writableSongPath(ROOT, id) : null;
      // Both song drawers, because scratch material now lives in `work/scratch/` and a
      // guard naming one directory would have quietly stopped deleting the very group
      // this route exists for. Still a whitelist of roots and not a blacklist: the point
      // is that `src/data/songs` — the game's own catalogue — can never be reached.
      const songRoots = SONG_DIRS.map((dir) => join(ROOT, dir) + '/');
      // A style audition is a scratch song under its own heading — same directory, same
      // marker, same disposability. See the group list in src/data/tracks.js.
      // Alternates too: a candidate you decided against is exactly the kind of file
      // that should be removable from the desk that made it. Deleting one cannot reach
      // the song it was an alternate of — that lives in src/data/songs, which the
      // `importedRoot` guard below refuses outright.
      // And copies, which are the most disposable of the lot: a copy is a snapshot
      // somebody took, and the whole point of taking them freely is being able to throw
      // them away just as freely.
      const madeHere = track && (track.group === 'scratch' || track.group === 'styleAudition'
        || track.group === 'alternate' || track.group === 'copy');
      if (!madeHere || track.writable !== true
        || !target || !songRoots.some((root) => target.startsWith(root))) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('only writable scratch songs can be deleted');
        return;
      }
      rmSync(target);
      if (existsSync(HISTORY_DIR)) {
        for (const file of readdirSync(HISTORY_DIR)) {
          if (file.startsWith('song-') && file.endsWith(`-${id}.js`)) {
            rmSync(join(HISTORY_DIR, file), { force: true });
          }
        }
      }
      unregisterTrack(id);
      writeImportedIndex(ROOT);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id }));
      return;
    }

    // ---- copies: this song, as it stands right now, under a second name -------------
    //
    // Save As. A whole song file of its own — the music copied verbatim, the desk's
    // current mix, arrangement and cabinet treatment on top — and NOTHING claimed about
    // what it is for. That last part is the difference from an alternate: an alternate
    // carries `alternateOf`, which puts it in the game's dev bundle, on the cabinet
    // picker and one button away from overwriting the song it names. A copy carries no
    // such line, so it is unreachable from the game, from any cabinet, and from
    // /promote-alternate. It is a snapshot: mix it, render it, save it, delete it, or
    // never open it again.
    //
    // Made from ANY song with a bank, including a read-only MIDI import — the copy is a
    // new file with the desk's marker, so this is also the way a legacy import becomes
    // something that can be saved at all.
    if (req.method === 'POST' && req.url === '/save-copy') {
      const body = await readJson(req);
      const sourceId = String(body?.sourceId || '');
      const source = resolveTrack(sourceId);
      if (!source?.bank) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end(`no song called "${sourceId}" to copy`);
        return;
      }
      const title = String(body?.title ?? '').trim() || `${source.title} COPY`;
      const mix = body?.mix ?? null;
      const arrangement = body?.arrangement ?? null;
      const variants = body?.variants ?? null;
      const bad = validateVariants(variants);
      if (bad.length) {
        res.writeHead(422, { 'content-type': 'text/plain' });
        res.end(`cabinet treatments:\n  ${bad.join('\n  ')}`);
        return;
      }
      // Against the music being copied, which is the music this file will hold — so a
      // copy is never born with a loop pointing past the end of its own song.
      const arrBad = arrangementIssues(source.bank, arrangement);
      if (arrBad.length) {
        res.writeHead(422, { 'content-type': 'text/plain' });
        res.end(`arrangement:\n  ${arrBad.join('\n  ')}`);
        return;
      }
      const id = newScratchId(title);
      const copySource = songFile({
        id,
        title,
        slug: id,
        group: 'copy',
        bank: source.bank,
        mix,
        arrangement: normaliseArrangementResolution(source.bank, compactArrangement(source.bank, arrangement)),
        variants,
        note: `A copy of ${source.title} (${sourceId}), taken from the ${MIXER_BRAND}.\n`
          + `Everything below is that song as the desk had it at the moment of the copy.\n`
          + `It is a snapshot and nothing more: the game does not play this file, no\n`
          + `cabinet can select it, and ${source.title} is untouched by anything done here.`,
      });
      const file = join(ROOT, IMPORTED_DIR, `${id}.js`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, copySource);
      writeImportedIndex(ROOT);
      // Read back off the file rather than echoing the request, so what the desk then
      // holds as "saved" is what is actually on disk, round-trip and all.
      const mod = await freshImport(file);
      const registered = registerTrack({
        id, bank: mod.bank, title: mod.title, slug: mod.slug,
        group: 'copy', writable: true,
      });
      console.log(`saved copy src/data/imported/${id}.js  (of ${sourceId})`);
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        file: `${IMPORTED_DIR}/${id}.js`,
        track: {
          id: registered.id, title: registered.title, slug: registered.slug,
          group: 'copy', writable: true, bank: registered.bank,
        },
        mix: mod.mix ?? null,
        arrangement: mod.arrangement ?? null,
        variants: mod.variants ?? null,
      }));
      return;
    }

    // ---- alternates: a game song's music, somebody else's decisions on it ----------
    //
    // The desk saves one song at a time and a save writes over what was there. That is
    // the right rule for mixing and the wrong one for the moment you have a version of
    // NEON BLASTERS you like without being ready to say it is NEON BLASTERS. So an
    // alternate is a whole song file of its own: the parent's music copied verbatim,
    // the desk's current mix and arrangement on top, filed under its own name in
    // src/data/imported and listed under its own heading. It renders, exports and
    // saves like any other song, and the song it came from is untouched.
    //
    // What makes it an alternate rather than a scratch copy is `alternateOf`, written
    // above the marker with the music. That one line is what /promote-alternate aims
    // at — the ONLY route by which one song's decisions can land on another's file,
    // and it can only ever go the one way the file already says.
    if (req.method === 'POST' && req.url === '/save-alternate') {
      const body = await readJson(req);
      const sourceId = String(body?.sourceId || '');
      const source = resolveTrack(sourceId);
      if (!source?.bank) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end(`no song called "${sourceId}" to make an alternate of`);
        return;
      }
      // An alternate of an alternate is an alternate of the same parent. Otherwise the
      // chain grows a middle that promotion would have to walk, and a walk is a thing
      // that can go one hop too far and write over a song nobody named.
      const parentId = source.alternateOf || sourceId;
      const parent = resolveTrack(parentId);
      if (!parent?.bank) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end(`"${sourceId}" points at "${parentId}", and there is no such song`);
        return;
      }
      const title = String(body?.title ?? '').trim() || `${source.title} alt`;
      const mix = body?.mix ?? null;
      const arrangement = body?.arrangement ?? null;
      const variants = body?.variants ?? null;
      const bad = validateVariants(variants);
      if (bad.length) {
        res.writeHead(422, { 'content-type': 'text/plain' });
        res.end(`cabinet treatments:\n  ${bad.join('\n  ')}`);
        return;
      }
      // Against the PARENT's bank, which is the bank being copied — so an alternate is
      // never born holding a loop the music it carries cannot reach.
      const arrBad = arrangementIssues(parent.bank, arrangement);
      if (arrBad.length) {
        res.writeHead(422, { 'content-type': 'text/plain' });
        res.end(`arrangement:\n  ${arrBad.join('\n  ')}`);
        return;
      }
      const id = newScratchId(title);
      const source_ = songFile({
        id,
        title,
        slug: id,
        group: 'alternate',
        alternateOf: parentId,
        bank: parent.bank,
        mix,
        arrangement: normaliseArrangementResolution(parent.bank, compactArrangement(parent.bank, arrangement)),
        variants,
        note: `An alternate of ${parent.title} (${parentId}), saved from the ${MIXER_BRAND}.\n`
          + `The music below is ${parent.title}'s, copied as it stood. The game can play\n`
          + `this file when the alternate is selected; "Save over ${parent.title}" in the desk\n`
          + `is still the separate operation that replaces the parent song.`,
      });
      const file = join(ROOT, IMPORTED_DIR, `${id}.js`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, source_);
      writeImportedIndex(ROOT);
      // Read back off the file rather than echoing the request: what the desk then
      // holds as "saved" is what is actually on disk, round-trip and all.
      const mod = await freshImport(file);
      const registered = registerTrack({
        id, bank: mod.bank, title: mod.title, slug: mod.slug,
        group: 'alternate', writable: true, alternateOf: parentId,
      });
      console.log(`saved alternate src/data/imported/${id}.js  (of ${parentId})`);
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        file: `${IMPORTED_DIR}/${id}.js`,
        track: {
          id: registered.id, title: registered.title, slug: registered.slug,
          group: 'alternate', writable: true, alternateOf: parentId, bank: registered.bank,
        },
        mix: mod.mix ?? null,
        arrangement: mod.arrangement ?? null,
        variants: mod.variants ?? null,
      }));
      return;
    }

    // Make an alternate the song. Reads the alternate's own file — not the desk's
    // drafts — and writes what it holds into the song it names as its parent, through
    // the same writeSongFile every save goes through, snapshot included. The desk
    // saves the alternate first, so the file is the version you were listening to.
    if (req.method === 'POST' && req.url === '/promote-alternate') {
      const body = await readJson(req);
      const id = String(body?.id || '');
      const alt = resolveTrack(id);
      const parentId = alt?.alternateOf;
      if (!alt || alt.group !== 'alternate' || !parentId) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end(`"${id}" is not an alternate of anything`);
        return;
      }
      const altPath = writableSongPath(ROOT, id);
      const target = writableSongPath(ROOT, parentId);
      if (!altPath || !target) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end(`no writable file for ${!altPath ? id : parentId}`);
        return;
      }
      const from = await freshImport(altPath);
      const parent = resolveTrack(parentId);
      const mix = from.mix ?? null;
      const arrangement = from.arrangement ?? null;
      const variants = from.variants ?? null;
      const bad = validateVariants(variants);
      if (bad.length) {
        res.writeHead(422, { 'content-type': 'text/plain' });
        res.end(`"${id}" cabinet treatments:\n  ${bad.join('\n  ')}`);
        return;
      }
      // Against the parent's bank as it stands NOW, not the copy the alternate carries:
      // the music above a song's marker is hand-edited, and an alternate forked before
      // an edit can be holding a loop the song no longer has.
      const arrBad = parent?.bank ? arrangementIssues(parent.bank, arrangement) : [];
      if (arrBad.length) {
        res.writeHead(422, { 'content-type': 'text/plain' });
        res.end(`"${parentId}" arrangement:\n  ${arrBad.join('\n  ')}\n\n`
          + `${alt.title} was forked before ${parent.title}'s music changed.`);
        return;
      }
      const snap = snapshotSongFile(ROOT, parentId, HISTORY_DIR, stamp());
      writeSongFile(ROOT, parentId, {
        mix,
        arrangement: normaliseArrangementResolution(parent?.bank, compactArrangement(parent?.bank, arrangement)),
        variants,
      });
      writeSongsIndex(join(ROOT, 'src/data/songs'));
      console.log(`promoted ${id} over ${parentId}`
        + (snap ? `  (was: work/mix-history/${snap})` : ''));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        ok: true, id, into: parentId, snapshot: snap || null, variants,
        mix: await readCurrentMix(), arrangements: await readCurrentArrangements(),
        m8trx: await readCurrentM8trx(),
      }));
      return;
    }

    // Save one song: its mix and its arrangement, into its own file.
    //
    // One file per song is what makes this simple. It used to rewrite
    // src/data/mix.js — thirty-four songs' balances in one file — so every save
    // touched every song, two desks could not save at once, and "restore the mix"
    // could only ever mean the whole file. Now a save is one song, and the version
    // it replaced is copied aside under that song's own name.
    //
    // The music is never written. `writeSongFile` rewrites only what is below the
    // desk's marker and refuses outright if the marker is missing.
    if (req.method === 'POST' && req.url === '/save') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      // New saves are partial patches: omitted `mix` or `arrangement` means preserve
      // the other half already on disk; an explicit null means clear that half. The
      // old `{ ids, entries, arrangements }` shape is still accepted for a tab that
      // was open during the migration, but it uses the same presence semantics.
      const patchMode = body?.patch && body?.id;
      const ids = patchMode
        ? [body.id]
        : (Array.isArray(body?.ids) ? body.ids : Object.keys(body?.entries || body || {}));
      const entries = body.entries || body || {};
      const arrangements = body.arrangements || {};
      const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

      const written = [];
      const snaps = [];
      for (const id of ids) {
        const target = writableSongPath(ROOT, id);
        if (!target) {
          res.writeHead(404, { 'content-type': 'text/plain' });
          res.end(`no writable song file for "${id}" — legacy MIDI imports cannot be saved`);
          return;
        }
        const current = await freshImport(target);
        const mix = patchMode
          ? (has(body.patch, 'mix') ? body.patch.mix : (current.mix ?? null))
          : (has(entries, id) ? entries[id] : (current.mix ?? null));
        const arrangement = patchMode
          ? (has(body.patch, 'arrangement') ? body.patch.arrangement : (current.arrangement ?? null))
          : (has(arrangements, id) ? arrangements[id] : (current.arrangement ?? null));
        // Same presence semantics for the cabinet treatments — and load-bearing, because
        // writeSongFile rewrites the whole tail of the file. Without this line, saving a
        // fader on a song would silently delete the treatment its cabinet screen plays.
        const variants = patchMode
          ? (has(body.patch, 'variants') ? body.patch.variants : (current.variants ?? null))
          : (current.variants ?? null);
        const m8trx = patchMode
          ? (has(body.patch, 'm8trx') ? body.patch.m8trx : (current.m8trx ?? null))
          : (current.m8trx ?? null);
        const bad = validateVariants(variants);
        if (bad.length) {
          // In front of whoever wrote it, rather than going quiet in a level six screens
          // away from the thing that caused it.
          res.writeHead(422, { 'content-type': 'text/plain' });
          res.end(`"${id}" cabinet treatments:\n  ${bad.join('\n  ')}`);
          return;
        }
        // And the arrangement itself, for the same reason. Only the things a save can
        // put wrong that the engine then has to guess about — a loop that ends past the
        // end of the song is the one this exists for, because the bars can be deleted
        // from under it long after it was set and nothing else would ever say so.
        const track = resolveTrack(id);
        const arrBad = track?.bank ? arrangementIssues(track.bank, arrangement) : [];
        if (arrBad.length) {
          res.writeHead(422, { 'content-type': 'text/plain' });
          res.end(`"${id}" arrangement:\n  ${arrBad.join('\n  ')}`);
          return;
        }
        // Before the write, so the folder holds the version being replaced. Data
        // only — see snapshotSongFile for why a copy of the whole file is no good.
        const snap = snapshotSongFile(ROOT, id, HISTORY_DIR, stamp());
        if (snap) snaps.push(snap);
        writeSongFile(ROOT, id, {
          mix,
          arrangement: normaliseArrangementResolution(track?.bank, compactArrangement(track?.bank, arrangement)),
          variants,
          m8trx,
        });
        written.push(id);
      }
      // Keep whichever catalogue contains the saved file in sync. The generated
      // index is what makes a new scratch source visible after a page rebuild.
      if (written.some((id) => SONG_DIRS.some((dir) => writableSongPath(ROOT, id)?.includes(`/${dir}/`)))) {
        writeImportedIndex(ROOT);
      }
      writeSongsIndex(join(ROOT, 'src/data/songs'));

      console.log(`saved ${written.map((id) => `src/data/songs/${id}.js`).join(', ')}`
        + (snaps.length ? `  (was: work/mix-history/${snaps.join(', ')})` : ''));
      res.writeHead(200, { 'content-type': 'application/json' });
      // Read back off disk, so the desk's idea of what is saved matches the files.
      res.end(JSON.stringify({
        ok: true, saved: written, snapshot: snaps[0] || null,
        mix: await readCurrentMix(), arrangements: await readCurrentArrangements(),
        m8trx: await readCurrentM8trx(),
      }));
      return;
    }

    // The versions of mix.js this process has replaced — the list, and then one of
    // them parsed. Restoring is not a route: the desk loads a snapshot into its
    // drafts, so it arrives as an ordinary unsaved edit that ⌘Z undoes and Save
    // commits, rather than as a write nobody asked for.
    if (req.method === 'GET' && (req.url === '/history' || req.url.startsWith('/history?'))) {
      // `?track=` narrows the list to that song's own saves, which is what the desk
      // asks for: a restore only ever puts THIS song back, so a list holding the
      // moments some other song was written is a list of choices that do nothing you
      // would recognise. Matched through the same `slug` the filename was written
      // with, rather than against the raw id — the name is slugged and capped, so an
      // id longer than the cap does not match itself.
      const track = new URL(req.url, `http://${HOST}:${PORT}`).searchParams.get('track');
      const all = listHistory();
      const snapshots = track
        ? all.filter((s) => s.track === track || (!s.track && s.label === slug(track)))
        : all;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ dir: 'work/mix-history', keep: HISTORY_KEEP, track, snapshots }));
      return;
    }
    if (req.method === 'GET' && req.url.startsWith('/history/')) {
      const file = decodeURIComponent(req.url.slice('/history/'.length));
      // Matched against the name we write, not merely checked for `..`: this reads a
      // path off the wire and hands it to import().
      if (!/^(?:mix|song)-[\w.-]+\.js$/.test(file)) {
        res.writeHead(400); res.end('bad snapshot name'); return;
      }
      const version = await readHistoryVersion(file);
      if (!version) { res.writeHead(404); res.end('no such snapshot'); return; }
      const { mix, arrangements } = version;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ file, mix, arrangements }));
      return;
    }
    // Where the desk's own bounce lands. The render happened in the browser — this
    // route is the disk, not a renderer.
    //
    // It exists because `dist/<slug>-mix.wav` is where every render has gone since
    // there were renders: it is what tools/audition opens, what a listening session
    // reaches for, and what the machine running the mixer has, which is not
    // necessarily the machine the desk is open on. Dropping the file in whichever
    // browser's Downloads folder happened to press the button would have quietly
    // broken all of that. The deployed desk, which has no server and no disk to
    // write to, downloads instead — see renderBounce in mixer-entry.js.
    if (req.method === 'POST' && req.url.startsWith('/write-render')) {
      const q = new URL(req.url, `http://${HOST}:${PORT}`).searchParams;
      const track = resolveTrack(q.get('track'));
      if (!track) { res.writeHead(404); res.end('unknown track'); return; }
      const bytes = await readBytes(req);
      if (!bytes) {
        res.writeHead(413, { 'content-type': 'text/plain' });
        res.end(`that render is over ${Math.round(MAX_RENDER_BYTES / 1048576)}MB — render fewer passes`);
        return;
      }
      mkdirSync(join(ROOT, 'dist'), { recursive: true });
      const file = join('dist', `${track.slug}-mix.wav`);
      writeFileSync(join(ROOT, file), bytes);
      console.log(`${file} — ${(bytes.length / 1048576).toFixed(1)} MB, rendered on the desk`);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ file }));
      return;
    }

    // Loop Diagnostics, straight onto the disk of the machine the desk is running on.
    //
    // The CSV has always been downloadable, which is right for keeping one and wrong for
    // reading one: a performance question is usually "what did the last two passes do",
    // asked by somebody who is not sitting at the browser. Downloading, finding and
    // pasting it is three steps of friction on the one artefact the whole investigation
    // turns on. The desk posts it here instead, and it lands at a stable path anyone —
    // or anything — can just read.
    //
    // Overwritten rather than appended: the desk sends the whole log each time, and it
    // already bounds itself to the most recent records. `work/local/` because it is
    // generated, disposable, and gitignored — see CLAUDE.md.
    if (req.method === 'POST' && req.url === '/diagnostics-log') {
      // A tight limit of its own: the log is bounded by its record cap and is a few
      // hundred KB at worst, so the render-sized default would only ever let a mistake
      // through quietly.
      const bytes = await readBytes(req, 16 * 1024 * 1024);
      if (!bytes) { res.writeHead(413); res.end('diagnostics log too large'); return; }
      mkdirSync(join(ROOT, 'work', 'local'), { recursive: true });
      const file = join('work', 'local', 'mixer-diagnostics.csv');
      writeFileSync(join(ROOT, file), bytes);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ file, bytes: bytes.length }));
      return;
    }

    // Still here, and still the renderer the AUDITION button and the loudness sweep
    // below go through: those two run on this machine by necessity — one opens a
    // plugin window, the other renders thirty-four songs to compare them — and
    // headless Chromium is how a process with no Web Audio gets samples. The desk's
    // own Render WAV no longer comes through here; it renders in the browser it is
    // open in, which is why the deployed build can do it too.
    if (req.method === 'POST' && req.url === '/render') {
      const { trackId, mix, repeat, arrangement } = await readJson(req);
      const info = await renderTrack(trackId, mix, { repeat: repeat || 1, arrangement });
      console.log(`rendered ${info.file}  ${info.lufs.toFixed(1)} LUFS  peak ${info.peakDb.toFixed(1)} dBFS`
        + (info.clipping ? '  ** CLIPPING **' : ''));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(info));
      return;
    }

    // The same render, handed to tools/audition — the plugin host, where a real
    // AU is applied to it with its own GUI open and previewed before anything is
    // committed. The desk's effects are the game's; this is for the ones that are
    // not, and Audition's OK writes its own WAV beside this one.
    //
    // The GUI belongs to this machine, so it can only be spawned by the process
    // serving the page: a browser cannot open a plugin window, and a mixer being
    // driven from another machine over MASH_MIXER_HOST will open it on the host.
    if (req.method === 'POST' && req.url === '/audition') {
      const { trackId, mix, repeat, arrangement } = await readJson(req);
      // Checked before the render rather than after: a minute of Chromium is a
      // poor way to arrive at "the venv was never created".
      if (!existsSync(join(ROOT, 'tools/.venv-audio/bin/python'))) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end('tools/audition needs its virtualenv, and there is not one here:\n\n'
          + '  python3 -m venv tools/.venv-audio\n'
          + '  tools/.venv-audio/bin/pip install pedalboard pyobjc-framework-Cocoa');
        return;
      }
      const info = await renderTrack(trackId, mix, { repeat: repeat || 1, arrangement });
      // Detached and unref'd: the plugin host outlives the request, and a mixer
      // restart must not take the window down with it.
      // `--loops 1`, and it is load-bearing. Audition renders a TRACK at its loop count,
      // so the repeats come out of the sequencer and the reverb and delay tails carry
      // across each boundary. A file handed to it with `--src` cannot do that: it tiles
      // the audio instead, which copies the render's own two-second tail into the middle
      // of the song. The result is the song, a gap full of the last chord's echo, then
      // the song again from bar 1 — the loop markers ignored, because a WAV has none.
      //
      // This render already IS the passes: `repeat` went to the sequencer above, which
      // walks the intro once and the looped bars N times in a single continuous pass.
      // So there is nothing left to tile, and tiling it would be the bug.
      const child = spawn(join(ROOT, 'tools/audition'), ['--src', info.file, '--loops', '1'], {
        cwd: ROOT, detached: true, stdio: 'ignore',
      });
      child.unref();
      console.log(`rendered ${info.file}  ${info.lufs.toFixed(1)} LUFS  peak ${info.peakDb.toFixed(1)} dBFS`
        + (info.clipping ? '  ** CLIPPING **' : '') + '  -> audition');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ...info, auditioning: true }));
      return;
    }

    if (req.method === 'POST' && req.url === '/measure') {
      // Measure many tracks so they can be balanced against EACH OTHER, which is
      // the half of "get the volume right" that a single-song desk cannot show.
      const { trackIds, mixes } = await readJson(req);
      const rows = [];
      for (const id of trackIds) {
        const info = await renderTrack(id, mixes?.[id], { write: false });
        rows.push(info);
        console.log(`  ${id.padEnd(28)} ${info.lufs.toFixed(1)} LUFS  peak ${info.peakDb.toFixed(1)} dBFS`
          + (info.clipping ? '  ** CLIPPING **' : ''));
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ target: LOUDNESS_TARGET, rows }));
      return;
    }

    // ---- effect defaults, DEV only ---------------------------------------
    //
    // The browser sends a complete snapshot of the effect-local controls. The
    // server re-validates it against the catalogue, so a stale page cannot write a
    // removed parameter or a value outside the control's range. The source module is
    // rewritten atomically and the named-preset objects are carried through intact.
    if (req.method === 'POST' && req.url === '/effect-default-save') {
      if (!DEV_USER || req.headers['x-mixer-role'] !== 'dev') {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end('effect defaults can only be saved from DEV mode');
        return;
      }
      const body = await readJson(req);
      const scope = body?.scope;
      const id = String(body?.id || '');
      let params;
      try {
        params = normalizePresetParams(scope, id, body?.params);
      } catch (err) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end(String(err.message || err));
        return;
      }

      let presets;
      try {
        presets = await readEffectPresets(EFFECT_PRESETS_PATH);
        const group = { ...(presets[scope] || {}) };
        const current = { ...(group[id] || {}) };
        group[id] = {
          ...current,
          default: params,
          presets: current.presets && typeof current.presets === 'object' ? current.presets : {},
        };
        const next = { ...presets, [scope]: group };
        await writeEffectPresetsAtomic(next, EFFECT_PRESETS_PATH);
        // Read back through the cache-busting loader, not the in-memory catalogue.
        // This proves the exact file the next build will bundle is valid.
        await readEffectPresets(EFFECT_PRESETS_PATH);
      } catch (err) {
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end(`could not save effect defaults: ${err.message || err}`);
        return;
      }
      console.log(`saved ${scope}.${id} defaults to src/data/effect-presets.js`);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, scope, id, params }));
      return;
    }

    // ---- the voice library, written back ----------------------------------
    //
    // A preset is data, so the desk can author one: the entry is rewritten in place in
    // src/data/voices.js, then MEASURED, and the measurement spliced into LEVELS and
    // PEAKS.
    //
    // The measure is not optional and it is not a nicety. `voiceGain` derives a
    // preset's gain by dividing the lane's target by its measured level, so a preset
    // whose envelope moved and whose level did not is a preset that is quietly the
    // wrong loudness in every song and every render. Saving without measuring would
    // be the one thing this file's own comments warn against.
    if (req.method === 'POST' && req.url === '/voice-save') {
      const { id, preset, table, library: requestedLibrary } = await readJson(req);
      let src = readVoicesSource();
      const existingTable = tableOf(src, id);
      const devUpdate = DEV_USER && req.headers['x-mixer-role'] === 'dev';
      const libraryTable = LIBRARY_IDS.has(id)
        || (existingTable && Object.values(TABLES).includes(existingTable));
      const devLibraryCreate = devUpdate && requestedLibrary === true && !existingTable
        && Object.values(TABLES).includes(table);
      // Built-in library entries are shipped reference sounds, not user documents.
      // A client-side guard makes the UI clear, but this server-side check is the
      // actual boundary so a stale page or hand-written request cannot overwrite one.
      if (libraryTable && !devUpdate) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end(`"${id}" is a library preset and cannot be edited. Save it as a new user preset.`);
        return;
      }
      // The starter table is not writable and this is where that is enforced. A pack
      // names these, and the whole reason they exist is that a song generated next
      // month sounds like the pack was written to sound rather than like whatever the
      // library holds by then — see STARTER in src/data/voices.js. `tableOf` cannot
      // find one either, so without this the editor's `table` hint would have it write
      // a SECOND entry under the same id into TONE, and the catalogue would hold two
      // definitions of one sound.
      if (STARTER_IDS.has(id)) {
        res.writeHead(409, { 'content-type': 'text/plain' });
        res.end(`"${id}" is a starter sound — the New Song generator is written for it,`
          + ' so it cannot be saved over. Use Save as new to keep your edit under its'
          + ' own name.');
        return;
      }
      // A song's own copy is keyed `chordsVoice@bitter-lullaby` — which lane of which
      // song owns it — and that is not a usable identifier in a source file. `commit`
      // in the editor takes a library name before it ever gets here, so an id like this
      // arriving means the flag that says "this belongs to a song" was lost somewhere.
      // Said plainly, because `upsertPreset` throwing on it reaches the desk as a 500
      // and a stack trace in a terminal nobody is looking at.
      if (!/^[A-Za-z_$][\w$]*$/.test(id)) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end(`"${id}" is not a library name — it is a song's own copy of a preset.`
          + ' Rename it and save again, and it becomes a preset of its own.');
        return;
      }
      const where = existingTable || table;
      if (!where) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end(`no table for "${id}" — a new preset has to say whether it is user TONE, NOISE or DRUM`);
        return;
      }
      if (!Object.values(USER_TABLES).includes(where)
        && !(devUpdate && (libraryTable || devLibraryCreate)
          && Object.values(TABLES).includes(where))) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end(devUpdate
          ? 'presets must be saved to a USER_* table or an existing library table'
          : 'new presets must be saved to a USER_* table; built-in library tables are read-only');
        return;
      }
      // Written before it is measured, because the measurement runs the real engine
      // over the real file: there is no way to render a preset that is not in it.
      const before = src;
      src = upsertPreset(src, id, preset, where);
      writeVoicesSource(src);
      await restartRenderer();          // or the render measures the preset it replaced
      let level; let peak;
      try {
        ({ level, peak } = await measureVoice(id, preset, src));
      } catch (err) {
        // Put the file back. A preset that cannot be rendered is one that would sit
        // in the catalogue sounding fine on the desk and missing from every export,
        // and leaving it there because the measurement threw is the worst of both.
        writeVoicesSource(before);
        await restartRenderer();
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end(`could not render "${id}", so it was not saved:\n\n${err.message || err}`);
        return;
      }
      // Silent is a real outcome, not an error: Tone builds plenty of things that
      // make no sound. It is reported rather than saved, for the same reason.
      if (!(level > 0)) {
        writeVoicesSource(before);
        await restartRenderer();
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id, level: 0, peak: 0, silent: true, saved: false }));
        console.log(`"${id}" renders SILENT — not saved`);
        return;
      }
      // Nearly silent is its own hazard, and a worse one than it looks: `voiceGain`
      // divides the lane's target by this number, so a preset measuring a thousandth
      // of one is not a quiet preset — it is one the engine multiplies by about
      // eleven hundred, and whatever noise floor it has comes up with it. Saved
      // anyway, because tools/measure-voices.js saves it too and the two must not
      // disagree, but said.
      const quiet = level < 0.0004;
      writeVoicesSource(setMeasured(src, id, { level, peak }));
      console.log(`saved voice ${id} to src/data/voices.js — level ${level.toFixed(6)}`
        + `  peak ${peak.toFixed(4)}`
        + (quiet ? '  ** very quiet: check its envelope **' : ''));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        id, level: Number(level.toFixed(6)), peak: Number(peak.toFixed(4)),
        silent: false, quiet, saved: true,
      }));
      return;
    }

    if (req.method === 'POST' && req.url === '/voice-delete') {
      const { id, force } = await readJson(req);
      const sourceTable = tableOf(readVoicesSource(), id);
      const devDelete = DEV_USER && req.headers['x-mixer-role'] === 'dev';
      const libraryTable = Object.values(TABLES).includes(sourceTable);
      // Deletion is narrower than editing: only an entry currently stored in a
      // USER_* table is a user preset. A dev may also remove a library entry; unknown
      // ids and library deletes from a regular user are refused.
      if (!Object.values(USER_TABLES).includes(sourceTable) && !(devDelete && libraryTable)) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end(`"${id}" is not an editable user preset and cannot be deleted.`);
        return;
      }
      const used = await voiceRefs(id);
      // Refused rather than warned about, unless the desk says it asked: a song that
      // loses its voice does not break, it just quietly plays something else, and
      // that is exactly the kind of change nobody notices until a render sounds wrong.
      if (used.length && !force) {
        res.writeHead(409, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id, used }));
        return;
      }
      writeVoicesSource(deletePreset(readVoicesSource(), id));
      await restartRenderer();
      console.log(`deleted voice ${id} from src/data/voices.js`
        + (used.length ? `  ** ${used.length} song(s) were using it: ${used.join(', ')} **` : ''));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id, used, deleted: true }));
      return;
    }

    // Who is playing a preset — asked before a delete, and shown on the editor so a
    // built-in that four songs depend on does not look like a scratch pad.
    if (req.method === 'GET' && req.url.startsWith('/voice-refs')) {
      const id = new URL(req.url, `http://${HOST}:${PORT}`).searchParams.get('id');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id, used: id ? await voiceRefs(id) : [] }));
      return;
    }

    // MIDI in: the desk posts a .mid and gets back a bank, written as source next to
    // the hand-written ones. Same conversion the CLI runs — see lib/midi-import.js.
    if (req.method === 'POST' && req.url.startsWith('/import-midi')) {
      const q = new URL(req.url, `http://${HOST}:${PORT}`).searchParams;
      const chunks = [];
      for await (const c of req) chunks.push(c);
      // The filename is the track id, so importing the same file twice edits the same
      // song rather than growing a second one. Settled before the conversion: the bank
      // writes its own id into the file, the way every other song file does.
      const base = slugFor(q.get('file') || 'imported');
      // An explicit id is the ANSWER to the question below: the desk asking again with
      // the name somebody chose. It may be the existing one — replace, deliberately —
      // or a free one, which leaves the old song alone entirely.
      const chosen = q.get('id') ? slugFor(q.get('id')) : null;
      const id = chosen || importId(ROOT, base, (x) => !!resolveTrack(x));
      const dir = join(ROOT, IMPORTED_DIR);
      const existed = existsSync(join(dir, `${id}.js`));

      // REPLACING A SONG IS NOT A SIDE EFFECT OF WHAT A FILE ON YOUR DISK IS CALLED.
      //
      // Re-importing lands on the same id on purpose — that is how a DAW edit comes back
      // over itself — but the write is the whole file, so it takes the desk's half with
      // the notes: voices, faders, sends, arrangement, M8TRX. Deriving all of that from
      // a filename, with no question asked, made "import" the one destructive button
      // here that never checked. So the first ask returns the collision instead, having
      // written nothing, and the desk comes back with a name.
      if (existed && !chosen) {
        const known = resolveTrack(id);
        res.writeHead(409, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          code: 'exists', id, title: known?.title || id, suggested: newScratchId(base),
        }));
        return;
      }
      let out;
      try {
        out = bankFromMidi(Buffer.concat(chunks), {
          id,
          name: q.get('name') || undefined,
          bpm: q.get('bpm') || undefined,
          from: q.get('file') || 'a MIDI file',
        });
      } catch (err) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end(String(err.message || err));
        return;
      }
      mkdirSync(dir, { recursive: true });
      const file = join(IMPORTED_DIR, `${id}.js`);
      // AN IMPORT OVER AN EXISTING SONG IS THE MOST DESTRUCTIVE WRITE THE DESK MAKES.
      //
      // Re-importing deliberately lands on the same id — that is how a DAW edit comes
      // back over itself — and rewrites the file WHOLE, so the desk's half goes with the
      // notes: every voice chosen, every fader, every send, the arrangement, the M8TRX
      // recipe. A save replaces strictly less than that and has always left a snapshot
      // first; this left none, which made the safer operation the protected one.
      //
      // Only when something was there: a first import has nothing to lose, and
      // `snapshotSongFile` returns null for a legacy bank with no desk marker, which is
      // the honest answer for a file that never had a desk half to keep.
      const snap = existed ? snapshotSongFile(ROOT, id, HISTORY_DIR, stamp()) : null;
      writeFileSync(join(ROOT, file), out.source);

      // Load the bank we just wrote, so this process can render and export the new
      // song straight away — and so the desk gets the notes back and can switch to it
      // on the spot instead of asking for a restart. The query string is a
      // cache-buster: re-importing over a song must not get the old module back.
      //
      // Loading it is also what proves the file is good, which is why it happens
      // before the folder's index lists it: every tool imports that index, so one
      // unloadable bank in there is a mixer that will not start.
      let bank;
      let mix = null;
      try {
        const mod = await freshImport(join(ROOT, file));
        bank = mod.bank;
        // The mix comes back from the FILE rather than from the converter's own copy,
        // so what the desk switches to is what is on disk — the same rule every other
        // save here follows, and the reason a layer the file did not keep cannot show
        // up on a strip.
        mix = mod.mix ?? null;
        if (!bank) throw new Error('no export const bank in the bank it just wrote');
      } catch (err) {
        if (!existed) rmSync(join(ROOT, file), { force: true });
        console.error(`import failed to load: ${file}\n${err.stack || err}`);
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end(`the bank written from that file will not load — this is a bug in the `
          + `importer, not in your MIDI:\n\n${err.message || err}`);
        return;
      }
      writeImportedIndex(ROOT);
      registerTrack({ id, bank, title: out.title, slug: id, writable: true });
      console.log(`imported ${file} — ${out.title}`
        + ` (${out.bpm}bpm, ${out.blocks} blocks -> ${out.sections} sections)`
        + (out.layers.length ? `, ${out.layers.length} on layers: ${out.layers.map((l) => l.key).join(', ')}` : '')
        + `  [track: ${id}]`
        + (snap ? `  (replaced — was: work/mix-history/${snap})` : ''));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        ...out, source: undefined, file, mix, replaced: existed, snapshot: snap,
        track: { id, title: out.title, slug: id, bank, group: 'imported', writable: true },
      }));
      return;
    }

    // The song as MIDI, straight from the desk. The notes are the one part of a
    // song that belongs somewhere other than here — a DAW, a phone, a collaborator —
    // and tools/import-midi.js reads this format back.
    // HEAD as well as GET: a HEAD that 404s where a GET succeeds is a confusing
    // thing to meet with curl at midnight.
    if ((req.method === 'GET' || req.method === 'HEAD') && req.url.startsWith('/midi')) {
      const q = new URL(req.url, `http://${HOST}:${PORT}`).searchParams;
      const track = resolveTrack(q.get('track'));
      if (!track) { res.writeHead(404); res.end('unknown track'); return; }
      const repeat = Math.max(1, Number(q.get('repeat')) || 1);
      // Channel 1 for everything; ?patches=1 adds the GM programs (still channel 1
      // — Logic externalizes multi-channel files), and ?gm=1 is the full per-channel
      // GM layout for hardware. See render-midi-bank.js.
      const gm = q.get('gm') === '1';
      const midi = midiBuffer(track.bank, {
        repeat, title: track.title, gmChannels: gm, patches: gm || q.get('patches') === '1',
        // The tempo the song is PLAYED at: the desk saves a retuned tempo onto the
        // song's arrangement. Read off the files as they stand rather than the table
        // this process started with, for the same reason the mix is — a server left
        // running all day has the morning's version of everything it imported once.
        bpm: bpmOf(track.bank, track.id, await readCurrentArrangements()),
      });
      console.log(`midi: ${track.slug}.mid — ${midi.trackNames.length} instrument tracks`);
      res.writeHead(200, {
        'content-type': 'audio/midi',
        'content-length': midi.buffer.length,
        'content-disposition': `attachment; filename="${track.slug}.mid"`,
      });
      res.end(req.method === 'HEAD' ? undefined : midi.buffer);
      return;
    }

    if (req.url === '/tracks') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(listTracks()));
      return;
    }

    // The mix file as it stands, for a desk that wants to be sure rather than to
    // remember. The page is bundled with the file it was built from and updates that
    // copy on its own saves, which is right until something else writes it — another
    // tab, a hand edit, a git checkout under the server. Revert asks here first,
    // because "the saved mix" has to mean the one on disk now or it means nothing.
    if (req.method === 'GET' && req.url === '/mix') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        mix: await readCurrentMix(), arrangements: await readCurrentArrangements(),
        m8trx: await readCurrentM8trx(),
      }));
      return;
    }

    if (req.method === 'GET' && (req.url === '/MRDR3/' || req.url.startsWith('/MRDR3/?'))) {
      const html = await buildMrdr3Page();
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // Both spellings, with or without the trailing slash. The desk's own code
    // says "visualiser" and the preset pack says "visualiser", so whichever one
    // you have in your fingers is the one that should answer.
    if (req.method === 'GET' && /^\/visuali[sz]er\/?(\?|$)/.test(req.url)) {
      const html = await buildVisualiserPage();
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && (req.url === '/render-frame' || req.url.startsWith('/render-frame?'))) {
      const html = await buildRenderFramePage();
      // Never cached: the desk asks for a fresh one per render precisely so the
      // engine in it is the engine on disk right now.
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(html);
      return;
    }

    if (req.url === '/' || req.url.startsWith('/?')) {
      const html = await buildPage();
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    res.writeHead(404); res.end('not found');
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(err && err.stack ? err.stack : err));
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is in use — a mixer is probably already running.`);
    console.error(`  stop it:      pkill -f 'tools/mixer.js'`);
    console.error(`  or move it:   MASH_MIXER_PORT=8011 npm run mixer\n`);
    process.exit(3);
  }
  throw err;
});

// Only when run as `npm run mixer`; importing this module (a test round-tripping a
// song file, say) must not take the port.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, HOST, () => {
    console.log(`${MIXER_BRAND}: http://${HOST}:${PORT}/`);
    // Named as the folder rather than as one file: a save rewrites the song you are
    // on, below its own desk marker. Saying src/data/mix.js was true when every mix
    // lived in one file and stopped being true the moment they did not — and a
    // startup line that names the wrong file is how you go looking in the wrong diff.
    console.log('  "Save song" writes src/data/songs/<id>.js; scratch songs use src/data/imported/<id>.js (outside the game)');
  });
}
