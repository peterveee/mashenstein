// LEVEL THE CABINET SONGS AGAINST EACH OTHER, so a sound effect means the same
// thing on every stage.
//
// The problem this exists for: every song was mixed on its own day until it
// sounded good, and nothing ever compared them. The SFX are one fixed set, so a
// loud song buries a cue and a quiet one leaves it shouting — and the answer to
// "is this cue loud enough" came out different in every cabinet. Measured on 17
// Sep 2026 the nine cabinet songs spanned 7.2dB, Rhythm Bankruptcy to Neon
// Blasters. Levelling the songs once is worth more than levelling the cues nine
// times.
//
// WHAT IT MEASURES. Integrated loudness in LUFS (ITU-R BS.1770: K-weighted,
// 400ms blocks, absolute and relative gates) — how loud the song sounds, not how
// much energy it carries. Until 27 Sep 2026 this measured the loudest three
// seconds' plain RMS, and that is blind to sub-bass: the Crypt remix put 90% of
// its energy under 120Hz, read -22 RMS "on the line", and played ~5.5dB quieter
// than every other cabinet. K-weighting hears the song the way a player does.
// The relative gate drops quiet intros and breakdowns from the average, so a song
// with a soft opening is still not a quiet song. It is tools/lib/loudness.js, the
// same measurement the desk's bounce uses. Peak is reported too, because a
// trim that pushes a peak over 0dBFS is a trim that clips.
//
// WHAT IT CHANGES. One number per song, and which number depends on the song:
//
//   · A song with nothing on its master chain: `master` in its own mix block
//     (src/data/songs/<id>.js), dB on top of the bank's musicTrim — the desk's
//     master fader.
//   · A song WITH a master chain — a compressor, a limiter, an exciter — a Gain
//     effect at the END of that chain, added the first time and adjusted after.
//     The master fader sits in front of the chain (src/engine/mixer.js), so moving
//     it changes how hard the mix drives the compressor: levelling the Food Court
//     by its master took it 12dB down and un-slammed its limiter, a different sound
//     rather than a quieter one (27 Sep 2026, Peter's call). A gain after the chain
//     changes the level and nothing else. The master fader stays the mix's.
//
// The tool's gain is the LAST effect on the master chain when that is a Gain. Put
// another effect after it and the next run adds a fresh Gain at the end rather than
// guess. Nothing inside the mix is touched, no lane moves, and every value is
// reversible by putting the old number back.
//
// EVERY SONG THAT SHIPS, ON ONE OF TWO LINES (27 Sep 2026, Peter's call). The nine
// cabinets and the two payoff moments — the finale and the credits megamix — sit
// on the line. The three that play between games — the title, the Food Court and
// the shop counter — sit MENU_OFFSET under it, so gameplay is the loudest thing in
// the game. Before this the between-games songs were left alone "to stay softer",
// and measured they were not: the Food Court and the shop were ~4dB LOUDER than
// every cabinet, and the title 12dB quieter.
//
// RE-RUN IT AFTER A MIX CHANGE. Moving faders changes how loud a song is, so a
// song that has been re-mixed has left the line the others are on. That is the
// whole reason this is a tool and not a one-off measurement: `node
// tools/song-levels.js` re-measures and tells you who has drifted, and
// `--apply` puts them back. It is not automatic — nothing runs it for you.
//
// AND MIND THE DESK. `npm run mixer` rewrites a song file wholesale when it
// saves. If a song is open on the desk while this runs, save the desk first,
// then run this, or the desk's save will take the old master with it.
//
// Usage:
//   node tools/song-levels.js                 measure and print the table
//   node tools/song-levels.js --apply         ...and write the trims
//   node tools/song-levels.js --target -21.5  level to a different line (LUFS)
//   node tools/song-levels.js --repeats 4     longer renders (default 4)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { loudness } from './lib/loudness.js';
import { fmtEffects } from './lib/mix-source.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The nine cabinets, in play order. Ids are src/data/tracks.js ids, and each one
// is also the basename of its song file.
const CABINETS = ['plumber', 'speed', 'neon', 'frost', 'crypt', 'rhythm', 'cardboard', 'office', 'surge'];
const EVENTS = ['finale', 'megamix'];
const MENUS = ['title', 'hub', 'shop'];
const ALL = [...CABINETS, ...EVENTS, ...MENUS];
const groupOf = (id) => (CABINETS.includes(id) ? 'cabinet' : EVENTS.includes(id) ? 'event' : 'menu');

// THE LINE EVERY CABINET SONG SITS ON, in LUFS integrated, of a render at
// unity. -21 is where the middle of the nine already sat when the tool moved to
// LUFS (they had been levelled to -22 RMS, which read -19.5 to -21.6 LUFS), so
// adopting it moved the most songs the least and left the SFX levelled against
// the same beds.
const TARGET = -21.0;
// How far under the line the between-games songs sit. Three dB is a step you hear
// as "calmer" without reaching for the volume when a stage starts.
const MENU_OFFSET = -3.0;
// Under this, a song is close enough that moving it is churn: the desk's own
// fader steps are 0.1dB and nobody can hear two tenths on a song.
const DEADBAND = 0.3;

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const APPLY = argv.includes('--apply');
const target = Number(flag('target', TARGET));
const repeats = Number(flag('repeats', 4));
const only = argv.filter((a) => !a.startsWith('--') && ALL.includes(a));
const songs = only.length ? only : ALL;
const targetOf = (id) => (groupOf(id) === 'menu' ? target + MENU_OFFSET : target);

const outDir = join(root, 'work/local/levels');
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------- measuring
// Minimal 16-bit PCM WAV reader. The renders are the game's own output and are
// always 16-bit; anything else is a bug worth failing on rather than guessing at.
function readWav(path) {
  const buf = readFileSync(path);
  let off = 12, fmt = null, data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') {
      fmt = { ch: buf.readUInt16LE(off + 10), sr: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    }
    if (id === 'data') { data = { off: off + 8, size }; break; }
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data || fmt.bits !== 16) throw new Error(`${path}: not 16-bit PCM`);
  const frames = Math.floor(data.size / 2 / fmt.ch);
  const channels = Array.from({ length: fmt.ch }, () => new Float64Array(frames));
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < fmt.ch; c++) channels[c][i] = buf.readInt16LE(data.off + (i * fmt.ch + c) * 2) / 32768;
  }
  return { sr: fmt.sr, channels };
}

function measure(path) {
  const { sr, channels } = readWav(path);
  const { lufs, peakDb } = loudness(channels, sr);
  return { secs: channels[0].length / sr, peak: peakDb, loud: lufs };
}

// ----------------------------------------------------------------- applying
// The `master` line inside a song's own `export const mix = {`. Written by the
// desk, so it is matched where the desk puts it rather than anywhere in the file
// — a bank can carry its own `master` key for a synth voice, and rewriting one
// of those would be a silent, ugly bug.
function setMaster(id, value) {
  const path = join(root, 'src/data/songs', `${id}.js`);
  if (!existsSync(path)) throw new Error(`no song file for ${id}`);
  const src = readFileSync(path, 'utf8');
  const start = src.indexOf('export const mix = {');
  if (start < 0) throw new Error(`${id}: no mix block`);
  const head = src.slice(start, start + 600);
  const rounded = Math.round(value * 10) / 10;
  const existing = head.match(/\n {2}master: (-?[\d.]+),/);
  if (existing) {
    const at = start + head.indexOf(existing[0]);
    return writeFileSync(path, src.slice(0, at) + `\n  master: ${rounded},` + src.slice(at + existing[0].length));
  }
  const at = start + 'export const mix = {'.length;
  return writeFileSync(path, `${src.slice(0, at)}\n  master: ${rounded},${src.slice(at)}`);
}

function currentMaster(id) {
  const src = readFileSync(join(root, 'src/data/songs', `${id}.js`), 'utf8');
  const start = src.indexOf('export const mix = {');
  if (start < 0) return 0;
  const m = src.slice(start, start + 600).match(/\n {2}master: (-?[\d.]+),/);
  return m ? Number(m[1]) : 0;
}


// The song's own master chain, read by importing the file rather than parsing it:
// the line is JS, not JSON. A cache-busting query, because this tool rewrites the
// file between passes and Node would otherwise hand back the first import.
async function chainOf(id) {
  const url = `${pathToFileURL(join(root, 'src/data/songs', `${id}.js`)).href}?t=${Date.now()}`;
  const mod = await import(url);
  return Array.isArray(mod.mix?.masterEffects) ? mod.mix.masterEffects : [];
}
const endGain = (chain) => (chain.at(-1)?.id === 'gain' ? chain.at(-1) : null);

async function currentLevel(id) {
  const chain = await chainOf(id);
  if (!chain.length) return { control: 'master', value: currentMaster(id) };
  const g = endGain(chain);
  return { control: 'gain', value: g ? Number(g.params?.gain ?? 0) : 0 };
}

// Where the level goes. The masterEffects line is matched inside the mix block, as
// `master` is, and rewritten with the desk's own formatter.
async function setLevel(id, value) {
  const chain = await chainOf(id);
  if (!chain.length) return setMaster(id, value);
  const rounded = Math.round(value * 10) / 10;
  const g = endGain(chain);
  const next = g
    ? [...chain.slice(0, -1), { ...g, params: { ...(g.params || {}), gain: rounded } }]
    : [...chain, { id: 'gain', params: { gain: rounded } }];
  const path = join(root, 'src/data/songs', `${id}.js`);
  const src = readFileSync(path, 'utf8');
  const start = src.indexOf('export const mix = {');
  // The whole bracketed value, however it is laid out: the desk writes one line, but a
  // hand-authored song (the title) spreads its chain over twenty. Brackets are counted
  // outside string literals, and what goes back is the desk's own one-line form.
  const key = src.indexOf('\n  masterEffects: [', start);
  if (start < 0 || key < 0) throw new Error(`${id}: no masterEffects in its mix block`);
  const open = src.indexOf('[', key);
  let depth = 0, quote = null, end = -1;
  for (let i = open; i < src.length && end < 0; i++) {
    const c = src[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) end = i;
  }
  if (end < 0 || src[end + 1] !== ',') throw new Error(`${id}: could not find the end of its masterEffects`);
  writeFileSync(path, `${src.slice(0, key)}\n  masterEffects: ${fmtEffects(next)}${src.slice(end + 1)}`);
}

// --------------------------------------------------------------------- main
// APPLY REPEATS UNTIL THE SONGS LAND. A song with a compressor or limiter on its
// master chain sits after the trim (src/engine/mixer.js), so moving the trim by N dB
// moves the loudness by less than N: neon took two passes on 27 Sep. So --apply
// writes, re-measures only the songs it moved, and goes again — up to MAX_PASSES —
// and what it reports is where they actually landed, not where it aimed.
const MAX_PASSES = 3;
const at = new Date().toISOString();

async function measureSongs(ids) {
  const out = [];
  for (const id of ids) {
    const wav = join(outDir, `${id}.wav`);
    process.stderr.write(`rendering ${id}… `);
    execFileSync('node', [join(root, 'tools/render-track.js'), id, String(repeats), wav],
      { cwd: root, stdio: ['ignore', 'ignore', 'ignore'] });
    const m = measure(wav);
    process.stderr.write(`${m.loud.toFixed(1)} LUFS\n`);
    const level = await currentLevel(id);
    out.push({ id, ...m, group: groupOf(id), target: targetOf(id), master: currentMaster(id), control: level.control, level: level.value, trim: targetOf(id) - m.loud });
  }
  return out;
}
const isOff = (r) => Math.abs(r.trim) >= DEADBAND;
const nextOf = (r) => Math.round((r.level + r.trim) * 10) / 10;

function print(rows, heading) {
  console.log(`\n${heading}\n`);
  console.log('song        secs    peak    loud  target    level         ->  new level');
  for (const r of [...rows].sort((a, b) => ALL.indexOf(a.id) - ALL.indexOf(b.id))) {
    // A trim that pushes the peak past -0.5 dBFS is flagged rather than refused:
    // it is the mix that wants looking at, and this tool does not get to decide.
    const clips = r.peak + r.trim > -0.5;
    console.log(`${r.id.padEnd(10)} ${r.secs.toFixed(0).padStart(4)}  ${r.peak.toFixed(1).padStart(6)}  ${r.loud.toFixed(1).padStart(6)}  ${r.target.toFixed(1).padStart(6)}  ${`${r.control} ${r.level.toFixed(1)}`.padStart(12)}   ->  ${isOff(r) ? nextOf(r).toFixed(1).padStart(5) : '    —'}${clips ? '  ** peak would clip **' : ''}`);
  }
}

const first = await measureSongs(songs);
const final = new Map(first.map((r) => [r.id, r]));
const from = new Map(first.map((r) => [r.id, r.level]));
print(first, `every shipped song: cabinets and events on ${target.toFixed(1)} LUFS, menus on ${(target + MENU_OFFSET).toFixed(1)} (integrated, gated, ${repeats} loop passes)`);

let stillOff = first.filter(isOff);
if (APPLY) {
  for (let pass = 1; stillOff.length && pass <= MAX_PASSES; pass++) {
    for (const r of stillOff) await setLevel(r.id, nextOf(r));
    console.log(`\npass ${pass}: wrote ${stillOff.map((r) => `${r.id} ${nextOf(r)}`).join(', ')} — re-measuring them`);
    const again = await measureSongs(stillOff.map((r) => r.id));
    for (const r of again) final.set(r.id, r);
    stillOff = again.filter(isOff);
  }
  if (from.size && [...final.values()].some((r) => r.level !== from.get(r.id))) {
    print([...final.values()], 'where they landed');
  }
}

const rows = [...final.values()].map((r) => ({
  ...r, at,
  next: isOff(r) ? nextOf(r) : null,
  clips: r.peak + r.trim > -0.5,
  applied: r.level !== from.get(r.id),
  from: from.get(r.id),
}));

// THE REPORT FILE, for the desk's /reports page (tools/desk.js). Merged by song, so
// measuring one song does not wipe the other eight off the page; each row carries
// when it was measured.
const reportPath = join(root, 'work/local/reports/song-levels.json');
mkdirSync(dirname(reportPath), { recursive: true });
let previous = [];
try { previous = JSON.parse(readFileSync(reportPath, 'utf8')).rows || []; } catch { /* first run */ }
const merged = [...previous.filter((p) => !rows.some((r) => r.id === p.id)), ...rows]
  .filter((r) => ALL.includes(r.id))
  .map((r) => ({ ...r, group: groupOf(r.id), target: r.target ?? targetOf(r.id) }))
  .sort((a, b) => ALL.indexOf(a.id) - ALL.indexOf(b.id));
writeFileSync(reportPath, JSON.stringify({ at, target, menuTarget: target + MENU_OFFSET, deadband: DEADBAND, repeats, applied: APPLY, rows: merged }, null, 2));

const moved = rows.filter((r) => r.applied);
if (!APPLY) {
  console.log(`\n${stillOff.length} song(s) off the line by more than ${DEADBAND} dB. Re-run with --apply to write them.`);
} else if (stillOff.length) {
  console.log(`\n${stillOff.map((r) => r.id).join(', ')} still off the line after ${MAX_PASSES} passes — that mix wants a look (a limiter pinned at its ceiling will not come down with the trim).`);
} else {
  console.log(`\n${moved.length ? `moved ${moved.map((r) => `${r.id} ${r.control} ${r.from} -> ${r.level}`).join(', ')}. ` : ''}All on the line.`);
}
