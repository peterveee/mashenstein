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
// WHAT IT CHANGES. One number per song: `master` in that song's own mix block
// (src/data/songs/<id>.js), which is dB on top of the bank's musicTrim — the
// same field the desk writes. Nothing inside the mix is touched, no lane moves,
// and every value is reversible by putting the old number back.
//
// CABINET SONGS ONLY. The hub, the title, the finale, the shop and the megamix
// are deliberately not gameplay-loud and are left alone.
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
import { loudness } from './lib/loudness.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The nine cabinets, in play order. Ids are src/data/tracks.js ids, and each one
// is also the basename of its song file.
const CABINETS = ['plumber', 'speed', 'neon', 'frost', 'crypt', 'rhythm', 'cardboard', 'office', 'surge'];

// THE LINE EVERY CABINET SONG SITS ON, in LUFS integrated, of a render at
// unity. -21 is where the middle of the nine already sat when the tool moved to
// LUFS (they had been levelled to -22 RMS, which read -19.5 to -21.6 LUFS), so
// adopting it moved the most songs the least and left the SFX levelled against
// the same beds.
const TARGET = -21.0;
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
const only = argv.filter((a) => !a.startsWith('--') && CABINETS.includes(a));
const songs = only.length ? only : CABINETS;

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

// --------------------------------------------------------------------- main
const rows = [];
for (const id of songs) {
  const wav = join(outDir, `${id}.wav`);
  process.stderr.write(`rendering ${id}… `);
  execFileSync('node', [join(root, 'tools/render-track.js'), id, String(repeats), wav],
    { cwd: root, stdio: ['ignore', 'ignore', 'ignore'] });
  const m = measure(wav);
  rows.push({ id, ...m, master: currentMaster(id), trim: target - m.loud });
  process.stderr.write(`${m.loud.toFixed(1)} LUFS\n`);
}

rows.sort((a, b) => b.loud - a.loud);
console.log(`\ncabinet songs, levelled to ${target.toFixed(1)} LUFS (integrated, gated, ${repeats} loop passes)\n`);
console.log('song        secs    peak    loud    master   ->  new master');
const at = new Date().toISOString();
for (const r of rows) {
  const move = Math.abs(r.trim) >= DEADBAND;
  const next = Math.round((r.master + r.trim) * 10) / 10;
  // A trim that pushes the peak past -0.5 dBFS is flagged rather than refused:
  // it is the mix that wants looking at, and this tool does not get to decide.
  const clips = r.peak + r.trim > -0.5;
  console.log(`${r.id.padEnd(10)} ${r.secs.toFixed(0).padStart(4)}  ${r.peak.toFixed(1).padStart(6)}  ${r.loud.toFixed(1).padStart(6)}  ${r.master.toFixed(1).padStart(6)}   ->  ${move ? next.toFixed(1).padStart(5) : '    —'}${clips ? '  ** peak would clip **' : ''}`);
  if (APPLY && move) setMaster(r.id, next);
  Object.assign(r, { at, next: move ? next : null, clips, applied: APPLY && move });
}

// THE REPORT FILE, for the desk's /reports page (tools/desk.js). Merged by song, so
// measuring one song does not wipe the other eight off the page; each row carries
// when it was measured.
const reportPath = join(root, 'work/local/reports/song-levels.json');
mkdirSync(dirname(reportPath), { recursive: true });
let previous = [];
try { previous = JSON.parse(readFileSync(reportPath, 'utf8')).rows || []; } catch { /* first run */ }
const merged = [...previous.filter((p) => !rows.some((r) => r.id === p.id)), ...rows]
  .filter((r) => CABINETS.includes(r.id))
  .sort((a, b) => CABINETS.indexOf(a.id) - CABINETS.indexOf(b.id));
writeFileSync(reportPath, JSON.stringify({ at, target, deadband: DEADBAND, repeats, applied: APPLY, rows: merged }, null, 2));
const moved = rows.filter((r) => Math.abs(r.trim) >= DEADBAND).length;
console.log(APPLY
  ? `\napplied ${moved} trim(s). Re-run without --apply to confirm they landed.`
  : `\n${moved} song(s) off the line by more than ${DEADBAND} dB. Re-run with --apply to write them.`);
