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
// WHAT IT MEASURES. The loudest three-second window's RMS, not the whole file's:
// a song with a quiet intro is not a quiet song, and the window is what the
// player is actually standing in when a cue fires. Peak is reported too, because
// a trim that pushes a peak over 0dBFS is a trim that clips.
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
//   node tools/song-levels.js --target -21.5  level to a different line
//   node tools/song-levels.js --repeats 4     longer renders (default 4)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The nine cabinets, in play order. Ids are src/data/tracks.js ids, and each one
// is also the basename of its song file.
const CABINETS = ['plumber', 'speed', 'neon', 'frost', 'crypt', 'rhythm', 'cardboard', 'office', 'surge'];

// THE LINE EVERY CABINET SONG SITS ON, in dBFS, as the loudest-3s RMS of a
// render at unity. -22 is where the middle of the nine already sat when this was
// written, so adopting it moved the most songs the least — and it leaves ~4dB of
// peak headroom on the loudest song, which is what keeps a master trim from
// turning into a limiter decision.
const TARGET = -22.0;
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
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

// Minimal 16-bit PCM WAV reader. The renders are the game's own output and are
// always 16-bit; anything else is a bug worth failing on rather than guessing at.
function measure(path) {
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
  const win = Math.min(frames, Math.floor(fmt.sr * 3));
  const ring = new Float64Array(win);
  let peak = 0, acc = 0, best = 0, ri = 0, filled = 0;
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < fmt.ch; c++) s += buf.readInt16LE(data.off + (i * fmt.ch + c) * 2) / 32768;
    s /= fmt.ch;
    if (Math.abs(s) > peak) peak = Math.abs(s);
    const sq = s * s;
    acc += sq - ring[ri];
    ring[ri] = sq;
    ri = (ri + 1) % win;
    if (filled < win) filled++;
    else if (acc / win > best) best = acc / win;
  }
  if (filled < win) best = acc / Math.max(1, filled);
  return { secs: frames / fmt.sr, peak: db(peak), loud: db(Math.sqrt(best)) };
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
  process.stderr.write(`${m.loud.toFixed(1)} dB\n`);
}

rows.sort((a, b) => b.loud - a.loud);
console.log(`\ncabinet songs, levelled to ${target.toFixed(1)} dB (loudest 3s RMS, ${repeats} loop passes)\n`);
console.log('song        secs    peak    loud    master   ->  new master');
for (const r of rows) {
  const move = Math.abs(r.trim) >= DEADBAND;
  const next = Math.round((r.master + r.trim) * 10) / 10;
  // A trim that pushes the peak past -0.5 dBFS is flagged rather than refused:
  // it is the mix that wants looking at, and this tool does not get to decide.
  const clips = r.peak + r.trim > -0.5 ? '  ** peak would clip **' : '';
  console.log(`${r.id.padEnd(10)} ${r.secs.toFixed(0).padStart(4)}  ${r.peak.toFixed(1).padStart(6)}  ${r.loud.toFixed(1).padStart(6)}  ${r.master.toFixed(1).padStart(6)}   ->  ${move ? next.toFixed(1).padStart(5) : '    —'}${clips}`);
  if (APPLY && move) setMaster(r.id, next);
}
const moved = rows.filter((r) => Math.abs(r.trim) >= DEADBAND).length;
console.log(APPLY
  ? `\napplied ${moved} trim(s). Re-run without --apply to confirm they landed.`
  : `\n${moved} song(s) off the line by more than ${DEADBAND} dB. Re-run with --apply to write them.`);
