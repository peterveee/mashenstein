// The song mixer workbench: `npm run mixer`.
//
// Bundles tools/mixer-entry.js into tools/mixer-shell.html the same way
// build-gallery.js does, then serves it — because unlike the gallery this tool
// writes back. "Save to game" POSTs the whole mix and this process rewrites
// src/data/mix.js, which the game and every render tool then read. Peter reviews
// and commits; nothing here touches git.
import { createServer } from 'http';
import { spawn } from 'child_process';
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, rmSync,
  copyFileSync, readdirSync, statSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer } from './lib/wav.js';
import { loudness, gainToTarget } from './lib/loudness.js';
import { midiBuffer } from './lib/render-midi-bank.js';
import { bankFromMidi } from './lib/midi-import.js';
import { writeImportedIndex, importId, slugFor, IMPORTED_DIR } from './lib/imported-index.js';
// Through lib/tracks.js, not src/data/tracks.js: that is what registers the songs in
// src/data/imported/ as tracks, so an import is renderable without a restart.
import { resolveTrack, listTracks, registerTrack } from './lib/tracks.js';
import { isDefaultMasterChain } from '../src/engine/effects.js';
import { renderArrangementsFile } from './lib/arrangements-source.js';
// The sends' defaults, read from the engine rather than written out again here: a
// value equal to its default is left out of the file, so a number that drifted apart
// from the engine's would quietly stop being saved.
import { AUX_DEFAULTS } from '../src/engine/mixer.js';
import {
  readVoicesSource, writeVoicesSource, upsertPreset, deletePreset, setPeak, tableOf,
} from './lib/voices-source.js';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIX_PATH = join(ROOT, 'src/data/mix.js');
// The other half of what the desk writes: what plays when, as opposed to what it
// sounds like. Saved in the same breath and snapshotted beside it.
const ARRANGEMENTS_PATH = join(ROOT, 'src/data/arrangements.js');
// Every version of mix.js this process has overwritten, oldest kept last. Gitignored:
// it is a safety net under a session, not a second history beside git.
const HISTORY_DIR = join(ROOT, '.mix-history');
// Roughly a month of hard mixing at a save every few minutes. Small files — a whole
// mix is ~12KB — so the cap is about keeping the folder readable, not about disk.
const HISTORY_KEEP = 300;

const HOST = process.env.MASH_MIXER_HOST || '127.0.0.1';
const PORT = Number(process.env.MASH_MIXER_PORT) || 8010;

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
  return shell.replace('/*__BUNDLE__*/', () => js);
}

// Emitted rather than JSON.stringify'd wholesale so the file stays readable and
// reviewable in a diff — this is source that gets committed, not a blob.
// Exported so it can be round-tripped in a test without standing a server up.
export function renderMixFile(mix) {
  const header = readFileSync(MIX_PATH, 'utf8').split('export const MIX')[0];
  const ids = Object.keys(mix).sort();
  if (!ids.length) return `${header}export const MIX = {};\n${tail()}`;

  // An effect chain, written out so it stays readable in a diff. This was the one
  // part of a mix the file did not carry: a chain could be built on the desk, sound
  // right, and vanish the moment it was saved.
  // A parameter name is emitted as source, so anything that is not a bare identifier
  // has to be quoted: the nested compressors address their bands as `mid.threshold`,
  // and an unquoted dot there is a syntax error in the file the whole game reads.
  const fmtKey = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
  const fmtParams = (params = {}) => Object.entries(params)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${fmtKey(k)}: ${typeof v === 'string' ? JSON.stringify(v) : round(v)}`)
    .join(', ');
  const fmtEffects = (list = []) => `[${list.map((e) => {
    const bits = [`id: ${JSON.stringify(e.id)}`];
    if (e.bypass) bits.push('bypass: true');
    const p = fmtParams(e.params);
    if (p) bits.push(`params: { ${p} }`);
    return `{ ${bits.join(', ')} }`;
  }).join(', ')}]`;

  const laneLine = (key, L) => {
    const parts = [];
    if (L.gain) parts.push(`gain: ${round(L.gain)}`);
    if (L.pan) parts.push(`pan: ${round(L.pan)}`);
    // Compared against 1, not against falsy: width 0 is mono, which is a decision,
    // and `if (L.width)` would drop it. There is no desk control for width yet — this
    // is here so a value written into mix.js by hand survives the next Save rather
    // than being quietly erased by a desk that never knew about it.
    if (L.width != null && L.width !== 1) parts.push(`width: ${round(L.width)}`);
    if (L.mute) parts.push('mute: true');
    const send = L.send || {};
    const sendParts = [];
    // Anything but zero gets written. This used to skip `delay: 1` as "the default",
    // which is exactly how a channel's echo stayed invisible: the value the engine
    // used never reached the file. Both sends default to shut now.
    if (send.delay) sendParts.push(`delay: ${round(send.delay)}`);
    if (send.reverb) sendParts.push(`reverb: ${round(send.reverb)}`);
    if (sendParts.length) parts.push(`send: { ${sendParts.join(', ')} }`);
    const eq = L.eq || {};
    const eqParts = [];
    for (const b of ['low', 'mid', 'high']) if (eq[b]) eqParts.push(`${b}: ${round(eq[b])}`);
    if (eqParts.length) parts.push(`eq: { ${eqParts.join(', ')} }`);
    if (L.effects && L.effects.length) parts.push(`effects: ${fmtEffects(L.effects)}`);
    return parts.length ? `      ${key}: { ${parts.join(', ')} },\n` : '';
  };

  let body = '';
  for (const id of ids) {
    const e = mix[id] || {};
    const lanes = Object.entries(e.lanes || {})
      .map(([k, L]) => laneLine(k, L)).filter(Boolean).join('');
    // The desk seeds the master with a bypassed bus compressor, which is a starting
    // point rather than a decision — writing it out would put a masterEffects line in
    // every song in the game for a chain nobody has touched.
    const masterFx = isDefaultMasterChain(e.masterEffects) ? null : e.masterEffects;
    // The song's shape, as opposed to its balance: tracks duplicated on the desk and
    // tracks deleted from it. Written before the lanes, because `bass2` in the lane
    // list below only means anything once the layer that mints it has been declared.
    const layers = (e.layers || []).filter((l) => l && l.key && l.from);
    const off = (e.off || []).filter(Boolean);
    // Everything this entry has to say, built before it is decided whether it has
    // anything to say. Tracks that carry no decisions are skipped, so the file only
    // holds real edits — and the test for that is now the lines themselves, rather
    // than a second hand-written list of the fields below it. That list was a copy of
    // a copy: it read `e.fx` as "the sends say something", so a mix whose only fx was
    // a return put back to its defaults wrote an entry with nothing in it.
    let ent = '';
    if (e.master) ent += `    master: ${round(e.master)},\n`;
    if (e.masterPan) ent += `    masterPan: ${round(e.masterPan)},\n`;
    if (e.limiter) ent += '    limiter: true,\n';
    // An empty chain is written out as an empty chain. The desk seeds an untouched
    // master with the bus compressor, so a song that says nothing about its master
    // gets it back on the next load — taking it off is a decision, and the file has
    // to carry it or it does not survive the trip.
    if (masterFx) {
      ent += masterFx.length
        ? `    masterEffects: ${fmtEffects(masterFx)},\n`
        : '    masterEffects: [],\n';
    }
    if (layers.length) {
      ent += `    layers: [${layers
        .map((l) => `{ key: ${JSON.stringify(l.key)}, from: ${JSON.stringify(l.from)} }`)
        .join(', ')}],\n`;
    }
    if (off.length) ent += `    off: ${JSON.stringify(off)},\n`;
    if (e.voice && Object.keys(e.voice).length) ent += `    voice: ${JSON.stringify(e.voice)},\n`;
    if (e.fx && Object.keys(e.fx).length) {
      const d = e.fx.delay || {}, rv = e.fx.reverb || {};
      // The return EQ, on both sends. The desk has always had these three rows — on a
      // reverb they are the damping control in everything but name, since a
      // convolution tail has no other — and applied them to the live aux, so they
      // survived a refresh through localStorage and were lost on Save. A knob that
      // works until you commit it is worse than one that does not work at all.
      const eqLine = (eq = {}) => {
        const bits = ['low', 'mid', 'high'].filter((b) => eq[b]).map((b) => `${b}: ${round(eq[b])}`);
        return bits.length ? `eq: { ${bits.join(', ')} }` : null;
      };
      const dp = [];
      if (d.division != null && d.division !== AUX_DEFAULTS.delay.division) dp.push(`division: ${round(d.division)}`);
      if (d.feedback != null && d.feedback !== AUX_DEFAULTS.delay.feedback) dp.push(`feedback: ${round(d.feedback)}`);
      if (d.tone != null && d.tone !== AUX_DEFAULTS.delay.tone) dp.push(`tone: ${round(d.tone)}`);
      if (d.level != null && d.level !== AUX_DEFAULTS.delay.level) dp.push(`level: ${round(d.level)}`);
      if (d.pan) dp.push(`pan: ${round(d.pan)}`);
      if (d.mute) dp.push('mute: true');
      if (eqLine(d.eq)) dp.push(eqLine(d.eq));
      if (d.effects && d.effects.length) dp.push(`effects: ${fmtEffects(d.effects)}`);
      const rp = [];
      if (rv.decay != null && rv.decay !== AUX_DEFAULTS.reverb.decay) rp.push(`decay: ${round(rv.decay)}`);
      if (rv.preDelay != null && rv.preDelay !== AUX_DEFAULTS.reverb.preDelay) rp.push(`preDelay: ${round(rv.preDelay)}`);
      if (rv.level != null && rv.level !== AUX_DEFAULTS.reverb.level) rp.push(`level: ${round(rv.level)}`);
      if (rv.pan) rp.push(`pan: ${round(rv.pan)}`);
      if (rv.mute) rp.push('mute: true');
      if (eqLine(rv.eq)) rp.push(eqLine(rv.eq));
      if (rv.effects && rv.effects.length) rp.push(`effects: ${fmtEffects(rv.effects)}`);
      const bits = [];
      if (dp.length) bits.push(`delay: { ${dp.join(', ')} }`);
      if (rp.length) bits.push(`reverb: { ${rp.join(', ')} }`);
      if (bits.length) ent += `    fx: { ${bits.join(', ')} },\n`;
    }
    if (lanes) ent += `    lanes: {\n${lanes}    },\n`;
    if (!ent) continue;
    body += `  ${JSON.stringify(id)}: {\n${ent}  },\n`;
  }
  return `${header}export const MIX = {\n${body}};\n${tail()}`;
}

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
function listHistory(dir = HISTORY_DIR) {
  if (!existsSync(dir)) return [];
  const all = readdirSync(dir);
  return all
    .filter((f) => /^mix-.*\.js$/.test(f))
    .sort().reverse()
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

/** One snapshot's MIX, parsed by loading it — it is a module, so this is free. */
async function readHistory(file, dir = HISTORY_DIR) {
  const path = join(dir, file);
  if (!existsSync(path)) return null;
  const mod = await freshImport(path);
  return mod.MIX || null;
}

/** And its arrangement half, if there was one when it was taken. */
async function readHistoryArrangements(file, dir = HISTORY_DIR) {
  const path = join(dir, file);
  if (!existsSync(path)) return null;
  const mod = await freshImport(path);
  return mod.ARRANGEMENTS || null;
}

/** The mix as the FILE currently holds it, whatever this process last wrote. */
async function readCurrentMix() {
  const mod = await freshImport(MIX_PATH);
  return JSON.parse(JSON.stringify(mod.MIX || {}));
}

/** The same, for the arrangement layer. Absent file is an empty layer, not an error. */
async function readCurrentArrangements() {
  if (!existsSync(ARRANGEMENTS_PATH)) return {};
  const mod = await freshImport(ARRANGEMENTS_PATH);
  return JSON.parse(JSON.stringify(mod.ARRANGEMENTS || {}));
}

/**
 * The arrangement layer's own snapshot, taken with the mix's and named to match.
 *
 * The pair is the point: `mix-<stamp>-<label>.js` and `arr-<stamp>-<label>.js` share
 * a timestamp, so restoring a moment restores both halves of it. A balance from one
 * evening laid over a bar plan from another is a song neither of them was.
 */
const snapshotArrangements = (label) => snapshotMix(label, HISTORY_DIR, ARRANGEMENTS_PATH, 'arr');

/**
 * Fold a desk's edits into the mix that is on disk RIGHT NOW.
 *
 * The desk used to post the whole file — its own copy of all thirty-four songs,
 * read when the page loaded — so a save from a tab left open since this morning
 * wrote this morning's version of every OTHER song back over the file. Two tabs, or
 * a hand-edit between page load and save, and the loser never knew.
 *
 * Now it posts only the songs it means, and the merge happens here against the file
 * as it stands. `entries[id] == null` means the song carries no decisions any more,
 * which is a removal, not "leave it alone" — that is what Reset every channel writes.
 */
export function mergeMix(current, ids, entries = {}) {
  const out = { ...current };
  for (const id of ids) {
    const e = entries[id];
    if (e == null) delete out[id];
    else out[id] = e;
  }
  return out;
}

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

// One note, held, with nothing else in the song — the same measurement
// tools/measure-voices.js makes, so a peak saved from the desk and a peak from a full
// re-measure are the same number rather than two conventions that nearly agree.
const A2 = 110;
const MEASURE_BANK = { bpm: 120, bass: Array.from({ length: 32 }, (_, i) => (i === 0 ? A2 : null)) };

/** The peak one note of a preset reaches through the render pipeline, at unity. */
const measureVoice = (id) => withRenderer((r) => r.render(
  { ...MEASURE_BANK, bassVoice: id, bassGain: 1, bassDur: 8 },
  { repeat: 1, mix: null, trackId: null },
).then((out) => out.peak));

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

// Render one track through the real engine with the mix applied, and measure it.
async function renderTrack(trackId, mix, { repeat = 1, write = true } = {}) {
  const track = resolveTrack(trackId);
  if (!track) throw new Error(`unknown track ${trackId}`);
  const out = await withRenderer((r) => r.render(track.bank, { repeat, mix, trackId }));
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

// -16 LUFS: a sensible target for game music that has to sit under effects and
// dialogue without anyone reaching for the volume between cabinets.
const LOUDNESS_TARGET = -16;

const server = createServer(async (req, res) => {
  try {
    // Write the mix file, keeping the version being replaced.
    //
    // Two shapes, because a desk left open from before this route changed is still a
    // desk holding an evening's work:
    //   { ids, entries }  — the songs this save is about, merged HERE against the
    //                       file as it stands. What the desk sends now.
    //   { <trackId>: … }  — the whole file, as the desk used to post it. Taken as
    //                       authoritative, which is what it was; the snapshot is what
    //                       makes that survivable.
    if (req.method === 'POST' && req.url === '/save') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const scoped = Array.isArray(body?.ids);
      const ids = scoped ? body.ids : Object.keys(body);
      const mix = scoped
        ? mergeMix(await readCurrentMix(), body.ids, body.entries || {})
        : body;
      // Before the write, not after: the point is the file as it was a moment ago.
      const label = ids.length === 1 ? ids[0] : `${ids.length}-songs`;
      const snap = snapshotMix(label);
      writeFileSync(MIX_PATH, renderMixFile(mix));

      // The arrangement layer, written in the same breath and snapshotted into the
      // same timestamped pair — a mix and an arrangement saved together have to come
      // back together, or a restore gives you this evening's balance over last
      // night's bar plan and no way to tell.
      //
      // `arrangements` absent means the desk did not send any, which is not the same
      // as sending none: an older desk against this server must not silently wipe the
      // file. Only an explicit object rewrites it.
      let arrSnap = null;
      if (body.arrangements && typeof body.arrangements === 'object') {
        arrSnap = snapshotArrangements(label);
        writeFileSync(ARRANGEMENTS_PATH, renderArrangementsFile(body.arrangements, ARRANGEMENTS_PATH));
      }

      const n = Object.keys(mix).length;
      console.log(`saved src/data/mix.js — ${ids.length} of ${n} track${n === 1 ? '' : 's'}`
        + (snap ? `  (was: .mix-history/${snap})` : '')
        + (arrSnap ? `\nsaved src/data/arrangements.js  (was: .mix-history/${arrSnap})` : ''));
      res.writeHead(200, { 'content-type': 'application/json' });
      // The file re-read, not the object just written: the desk's idea of "what is on
      // disk" then matches the disk exactly, including the three-decimal rounding the
      // serialiser applies and any song another tab changed while this one was open.
      res.end(JSON.stringify({
        ok: true, snapshot: snap, arrangementSnapshot: arrSnap,
        mix: await readCurrentMix(), arrangements: await readCurrentArrangements(),
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
      const snapshots = track ? all.filter((s) => s.label === slug(track)) : all;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ dir: '.mix-history', keep: HISTORY_KEEP, track, snapshots }));
      return;
    }
    if (req.method === 'GET' && req.url.startsWith('/history/')) {
      const file = decodeURIComponent(req.url.slice('/history/'.length));
      // Matched against the name we write, not merely checked for `..`: this reads a
      // path off the wire and hands it to import().
      if (!/^mix-[\w.-]+\.js$/.test(file)) { res.writeHead(400); res.end('bad snapshot name'); return; }
      const mix = await readHistory(file);
      if (!mix) { res.writeHead(404); res.end('no such snapshot'); return; }
      // Both halves of the moment, so a restore puts back the balance AND the bar
      // plan it was made against. Null when that save predates the arrangement layer.
      const pair = `arr-${file.slice('mix-'.length)}`;
      const arrangements = existsSync(join(HISTORY_DIR, pair))
        ? await readHistoryArrangements(pair) : null;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ file, mix, arrangements }));
      return;
    }
    if (req.method === 'POST' && req.url === '/render') {
      const { trackId, mix, repeat } = await readJson(req);
      const info = await renderTrack(trackId, mix, { repeat: repeat || 1 });
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
      const { trackId, mix, repeat } = await readJson(req);
      // Checked before the render rather than after: a minute of Chromium is a
      // poor way to arrive at "the venv was never created".
      if (!existsSync(join(ROOT, 'tools/.venv-audio/bin/python'))) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end('tools/audition needs its virtualenv, and there is not one here:\n\n'
          + '  python3 -m venv tools/.venv-audio\n'
          + '  tools/.venv-audio/bin/pip install pedalboard pyobjc-framework-Cocoa');
        return;
      }
      const info = await renderTrack(trackId, mix, { repeat: repeat || 1 });
      // Detached and unref'd: the plugin host outlives the request, and a mixer
      // restart must not take the window down with it.
      const child = spawn(join(ROOT, 'tools/audition'), ['--src', info.file], {
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

    // ---- the voice library, written back ----------------------------------
    //
    // A preset is data, so the desk can author one: the entry is rewritten in place
    // in src/data/voices.js, then MEASURED, and the measured peak spliced into PEAKS.
    //
    // The measure is not optional and it is not a nicety. `voiceGain` derives a
    // preset's level by dividing the lane's target by its measured peak, so a preset
    // whose envelope moved and whose peak did not is a preset that is quietly the
    // wrong loudness in every song and every render. Saving without measuring would
    // be the one thing this file's own comments warn against.
    if (req.method === 'POST' && req.url === '/voice-save') {
      const { id, preset, table } = await readJson(req);
      let src = readVoicesSource();
      const where = tableOf(src, id) || table;
      if (!where) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end(`no table for "${id}" — a new preset has to say whether it is TONE, NOISE or DRUM`);
        return;
      }
      // Written before it is measured, because the measurement runs the real engine
      // over the real file: there is no way to render a preset that is not in it.
      const before = src;
      src = upsertPreset(src, id, preset, where);
      writeVoicesSource(src);
      await restartRenderer();          // or the render measures the preset it replaced
      let peak;
      try {
        peak = await measureVoice(id);
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
      if (!(peak > 0)) {
        writeVoicesSource(before);
        await restartRenderer();
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id, peak: 0, silent: true, saved: false }));
        console.log(`"${id}" renders SILENT — not saved`);
        return;
      }
      // Nearly silent is its own hazard, and a worse one than it looks: `voiceGain`
      // divides the lane's target by this number, so a preset measuring 0.0001 is not
      // a quiet preset — it is one the engine multiplies by about eleven hundred, and
      // whatever noise floor it has comes up with it. Saved anyway, because
      // tools/measure-voices.js saves it too and the two must not disagree, but said.
      const quiet = peak < 0.02;
      writeVoicesSource(setPeak(src, id, peak));
      console.log(`saved voice ${id} to src/data/voices.js — peak ${peak.toFixed(4)}`
        + (quiet ? '  ** very quiet: check its envelope **' : ''));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id, peak: Number(peak.toFixed(4)), silent: false, quiet, saved: true }));
      return;
    }

    if (req.method === 'POST' && req.url === '/voice-delete') {
      const { id, force } = await readJson(req);
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
      let out;
      try {
        out = bankFromMidi(Buffer.concat(chunks), {
          name: q.get('name') || undefined,
          bpm: q.get('bpm') || undefined,
          from: q.get('file') || 'a MIDI file',
        });
      } catch (err) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end(String(err.message || err));
        return;
      }
      // The filename is the track id, so importing the same file twice edits the same
      // song rather than growing a second one.
      const id = importId(ROOT, slugFor(q.get('file') || out.constName), (x) => !!resolveTrack(x));
      const dir = join(ROOT, IMPORTED_DIR);
      const existed = existsSync(join(dir, `${id}.js`));
      mkdirSync(dir, { recursive: true });
      const file = join(IMPORTED_DIR, `${id}.js`);
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
      try {
        bank = (await freshImport(join(ROOT, file)))[out.constName];
        if (!bank) throw new Error(`no export const ${out.constName} in the bank it just wrote`);
      } catch (err) {
        if (!existed) rmSync(join(ROOT, file), { force: true });
        console.error(`import failed to load: ${file}\n${err.stack || err}`);
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end(`the bank written from that file will not load — this is a bug in the `
          + `importer, not in your MIDI:\n\n${err.message || err}`);
        return;
      }
      writeImportedIndex(ROOT);
      registerTrack({ id, bank, title: out.title, slug: id });
      console.log(`imported ${file} — export const ${out.constName}`
        + ` (${out.bpm}bpm, ${out.blocks} blocks -> ${out.sections} sections)`
        + `  [track: ${id}]`);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        ...out, source: undefined, file,
        track: { id, title: out.title, slug: id, bank },
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
      res.end(JSON.stringify({ mix: await readCurrentMix() }));
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

// Only when run as `npm run mixer`; importing this module (a test round-tripping
// renderMixFile, say) must not take the port.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, HOST, () => {
    console.log(`song mixer: http://${HOST}:${PORT}/`);
    console.log(`  "Save to game" writes ${MIX_PATH.replace(ROOT + '/', '')}`);
  });
}
