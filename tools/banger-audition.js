// MAKE A BANGER, from the command line — hear what the desk's "Make a Banger…" would make
// of some bars, without opening the desk. 2 Oct 2026.
//
//   node tools/banger-audition.js <song> <from-to> [options]
//
//   <song>        any track id: a cabinet (frost), a theme (title), a scratch or imported id
//   <from-to>     the riff's bars, counted from 1 the way the timeline counts: 1-2, 9-12
//   --seeds=N     render N takes (seeds 1..N, or from --seed)        default 1
//   --seed=S      the first seed                                     default 1
//   --mood=…      anthemic | uplifting | euphoric | moody | dark | gothic | heroic | nostalgic | funky
//   --variation=… faithful | some | wild
//   --length=…    short | medium | long, or a bar count (custom)
//   --mode=…      keep | major | minor | dorian | phrygian | harmonic | mixolydian | lydian
//   --riff-notes=… keep (the riff's notes never move) | fit (moved into the mode)
//   --set=g.k=v   any switch, e.g. --set=form.falseEnding=true --set=parts.bass=rolling
//   --no-wav      generate and measure the form only (no render)
//   --write       also drop the banger into work/bangers so the desk can open it
//
// WAVs go to work/auditions/bangers/. Renders take a machine-wide render slot (the same
// slots work/local/_remix-bounce.mjs uses), so a batch never pegs the machine Peter is
// listening on.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveTrack } from './lib/tracks.js';
import { deskBank, laneList } from '../src/engine/lanes.js';
import { draftOf } from './lib/arrangement-edit.js';
import { extractRiff, generateBanger, riffSummary } from './lib/banger/index.js';
import { writeBangerSong } from './lib/banger-file.js';
import { writeImportedIndex } from './lib/imported-index.js';
import { takeRenderSlot, releaseRenderSlot } from './lib/render-slots.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const has = (name) => args.includes(`--${name}`);
const [songId, range] = args.filter((a) => !a.startsWith('--'));
if (!songId || !/^\d+-\d+$/.test(range || '')) {
  console.error('usage: node tools/banger-audition.js <song> <from-to> [--seeds=N] [--mood=…] [--variation=…] [--length=…] [--write]');
  process.exit(1);
}
const [a, b] = range.split('-').map(Number);

// ---------------------------------------------------------------- the song as the desk hears it
const track = resolveTrack(songId);
if (!track) { console.error(`no song called "${songId}"`); process.exit(1); }
// A song's mix and arrangement live in its own file; the registry only holds the bank.
async function songState(id) {
  for (const dir of ['src/data/songs', 'src/data/imported', 'work/scratch', 'work/bangers']) {
    try {
      const mod = await import(pathToFileURL(join(ROOT, dir, `${id}.js`)).href);
      return { mix: mod.mix ?? null, arrangement: mod.arrangement ?? null };
    } catch { /* not in this drawer */ }
  }
  return { mix: null, arrangement: null };
}
const { mix, arrangement } = await songState(songId);
const bank = deskBank(track.bank, mix);
const draft = draftOf(bank, arrangement);
if (b > draft.plan.length || a < 1 || b < a) {
  console.error(`${songId} has ${draft.plan.length} bars — bars ${a}–${b} are not in it`);
  process.exit(1);
}
const riff = extractRiff({
  bank, draft, mix, from: a - 1, to: b - 1, laneKeys: laneList(bank).map((l) => l.key),
  source: { id: songId, title: track.title },
});
const rs = riffSummary(riff);
console.log(`${track.title}, bars ${a}–${b}: ${rs.parts} parts, hook ${rs.hookLabel} (${rs.hook})`
  + `${rs.drums ? `, ${rs.drums} drum parts` : ''}${rs.quantised ? `, ${rs.quantised} notes quantised` : ''}`);

// ---------------------------------------------------------------- options
const options = {};
if (flag('mood')) options.mood = flag('mood');
if (flag('variation')) options.variation = flag('variation');
if (flag('key')) options.key = flag('key');            // the old Keep / Major / Minor
if (flag('mode')) options.mode = flag('mode');
if (flag('riff-notes')) options.riffNotes = flag('riff-notes');
if (flag('length')) {
  const l = flag('length');
  if (/^\d+$/.test(l)) { options.length = 'custom'; options.customBars = Number(l); } else options.length = l;
}
for (const set of args.filter((x) => x.startsWith('--set='))) {
  const [path, raw] = set.slice(6).split('=');
  const [group, key] = path.split('.');
  const value = raw === 'true' ? true : raw === 'false' ? false : raw;
  if (key) (options[group] ||= {})[key] = value; else options[group] = value;
}
const seeds = Number(flag('seeds') || 1);
const first = Number(flag('seed') || 1);

// ---------------------------------------------------------------- render slots
// Machine-wide (tools/lib/render-slots.js): a sweep never pegs the machine Peter is listening on.

// ---------------------------------------------------------------- make, render, measure
const outDir = join(ROOT, 'work/auditions/bangers');
mkdirSync(outDir, { recursive: true });
let renderer = null;
try {
  for (let s = first; s < first + seeds; s++) {
    const out = generateBanger({ riff, options, seed: s });
    const sm = out.summary;
    console.log(`\nseed ${s}: ${sm.style} · ${sm.mood} · ${sm.key} · ${sm.variation} · ${sm.bars} bars at ${sm.bpm} BPM (${sm.seconds}s)`);
    console.log(out.form.map((f) => `${f.from}–${f.to} ${f.label}${f.lifted ? '↑' : ''}`).join(' · '));
    for (const w of out.warnings) console.log(`  warning: ${w}`);
    const name = `${songId}-b${a}-${b}-${out.banger.options.style}-${out.banger.options.mood}-${out.banger.options.variation}-s${s}`;
    if (has('write')) {
      const id = `${songId}-banger-s${s}`;
      const { file } = writeBangerSong(ROOT, { id, title: `${out.title} S${s}`, generated: out });
      writeImportedIndex(ROOT);
      console.log(`  wrote ${file} — open it on the desk as ${out.title} S${s}`);
    }
    if (has('no-wav')) continue;
    if (!renderer) {
      const { openRenderer } = await import('./lib/render-bank-browser.js');
      renderer = await openRenderer();
    }
    const { wavBuffer } = await import('./lib/wav.js');
    const { loudness } = await import('./lib/loudness.js');
    await takeRenderSlot();
    let res;
    try {
      res = await renderer.render(out.bank, {
        mix: out.mix, trackId: `banger-audition-${s}`, arrangement: out.arrangement, songLoop: false, tail: 2,
      });
    } finally { releaseRenderSlot(); }
    const L = loudness([res.outL, res.outR]);
    const wav = join(outDir, `${name}.wav`);
    writeFileSync(wav, wavBuffer([res.outL, res.outR], 1));
    console.log(`  ${res.seconds.toFixed(1)}s  ${L.lufs.toFixed(1)} LUFS  peak ${L.peakDb.toFixed(1)} dBFS\n  ${wav}`);
  }
} finally {
  releaseRenderSlot();
  if (renderer) await renderer.close();
}
