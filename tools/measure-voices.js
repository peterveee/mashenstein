// Measure every preset in the voice library, and write the levels back into it.
//
// A preset's level cannot be hand-written. Tone's synths do not put out the same
// amount for the same note — through this render pipeline a Synth peaks at 0.99, a
// MonoSynth 0.92, a DuoSynth 1.56, an FMSynth 0.32 and an AMSynth 0.19 — so the same
// number would mean five different loudnesses, and with presets going on any lane
// there is no one lane to tune them against by ear either.
//
// So: render each preset alone, on the lane it is for, and record what it reaches.
// `voiceGain()` divides the lane's own target by that number, and every preset arrives
// at roughly the level the lane's hand-written voice arrives at.
//
// ---- what changed, and why ---------------------------------------------------
//
// This measured a PEAK, and levelled the library by it. That is the wrong number and
// tools/lib/loudness.js has said so at the top of the file all along: the engine's own
// voices are blips that decay across the note, Tone's synths sustain, and matching
// their peaks put `monoBright` 5.5 LU over the lead it replaced and `hatTick` 5.4 LU
// under the hat it replaced. So the number that is divided is now `noteLevel` — the
// K-weighted RMS of the render, which is the energy the note actually delivers. The
// peak is still measured, because headroom is a real question, but it no longer sets
// anybody's level.
//
// Three things follow, and all three are why a re-measure moves numbers that no edit
// touched:
//
//   · every preset renders at its OWN `dur`, not one held note. How long a preset
//     sounds is part of how loud it is, and it is a thing the preset decides.
//   · a percussion preset renders on a percussion lane, where the lane supplies the
//     note. A kick is struck at 55 Hz and a hat at 800; measuring both at A2 on the
//     bass lane, as this did, is measuring neither.
//   · everything renders DRY (`echoLevel: 0`). The melodic lanes reach the delay by
//     default, and a lane's send is not a property of the preset sitting on it.
//
// Usage: node tools/measure-voices.js          measure and rewrite the tables
//        node tools/measure-voices.js --dry    print them, change nothing
//
// Re-run it after editing any preset's `options`: an envelope edit moves the energy,
// and a stale number is a preset that is quietly twice as loud as its neighbours.
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { noteLevel } from './lib/loudness.js';
import { oneNote, homeLane, measureVoiceAt } from './lib/measure-voice.js';
import { VOICES, VOICE_LANES, voiceGain } from '../src/data/voices.js';
import { SONGS } from '../src/data/songs/index.js';
import { writeSongFile } from './lib/song-file.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'src/data/voices.js');
const DRY = process.argv.includes('--dry');
/*
 * `--fill`: measure everything and report it, but only WRITE the presets that have no
 * measurement yet.
 *
 * A preset's level is what `voiceGain` divides by, so rewriting one changes how loud it
 * plays in every song that uses it. A full re-measure is therefore a mix change, and the
 * right thing when the presets have moved — but the wrong thing when what is actually
 * wanted is to fill in presets that were added without ever being measured, and which
 * currently carry the placeholder `level: 0` (silent) and `peak: 1`. This mode does only
 * that, so a gap can be closed without touching a balance somebody has already set by ear.
 */
const FILL = process.argv.includes('--fill');

// Noise and KLNG8 presets are measured too: they are built from native nodes
// rather than a Tone class, but their level is derived exactly the same way.
const tone = Object.values(VOICES).filter((v) => ['tone', 'noise', 'drum'].includes(v.kind));
const levels = {};
const peaks = {};
const targets = {};
const copies = [];
let frames = 0;
const sameWindow = (n, what) => {
  if (!frames) frames = n;
  else if (n !== frames) throw new Error(`${what} rendered ${n} frames, not ${frames} — `
    + 'the levels are a mean over the render and stop being comparable');
};
const renderer = await openRenderer();
try {
  // Half the calibration: what one note of each lane's OWN voice reaches. Measured
  // rather than taken from the authored gain constants — those are pre-pipeline, and
  // the bass lane's 0.1 arrives as 0.06 by the time it reaches the master.
  for (const lane of Object.keys(VOICE_LANES)) {
    const out = await renderer.render(oneNote(lane), { repeat: 1, mix: null, trackId: null });
    sameWindow(out.outL.length, `lane ${lane}`);
    targets[lane] = { level: noteLevel([out.outL, out.outR]), peak: out.peak };
    console.log(`  lane ${lane.padEnd(13)} its own voice: level ${targets[lane].level.toFixed(4)}`
      + `  peak ${targets[lane].peak.toFixed(4)}`);
  }
  console.log('');

  for (const v of tone) {
    const lane = homeLane(v);
    const { level, peak, frames: n } = await measureVoiceAt(renderer.render, v, lane);
    sameWindow(n, v.id);
    levels[v.id] = level;
    peaks[v.id] = peak;
    // How far the preset MOVES on its own lane, which is the only reading here that
    // says whether a re-measure is a formality or a re-mix.
    const was = voiceGain(v, lane);
    const now = targets[lane].level / (level > 0 ? level : 1);
    const moved = was > 0 && level > 0 ? `  ${(20 * Math.log10(now / was)).toFixed(1).padStart(5)} dB` : '';
    const warn = level <= 0 ? '  ** SILENT — it will not render **'
      : level < 0.0004 ? '  (very quiet: check its envelope)' : '';
    console.log(`  ${v.id.padEnd(18)} ${(v.synth || v.kind).padEnd(14)} ${lane.padEnd(6)}`
      + ` level ${level.toFixed(4)}  peak ${peak.toFixed(4)}${moved}${warn}`);
  }

  // And the copies songs keep for themselves.
  //
  // A song can carry its own version of a preset — the desk's Save to Song — and it
  // needs a level for exactly the reason a library preset does: `voiceGain` divides the
  // lane's target by it. Nothing measures one while it is being edited, deliberately;
  // a copy inherits the level of what it was made from, which is the right ballpark,
  // and the fader is the control for the rest. This is where the numbers are settled,
  // in a batch, on purpose — the same bargain the library has always had.
  //
  // On the copy's OWN lane, which its key names: a copy is not lane-agnostic the way a
  // library preset is, it is one lane of one song's mix and nowhere else.
  for (const [id, song] of Object.entries(SONGS)) {
    const params = song.mix?.voiceParams;
    if (!params) continue;
    for (const [voiceKey, preset] of Object.entries(params)) {
      const lane = Object.keys(VOICE_LANES).find((k) => VOICE_LANES[k].voiceKey === voiceKey);
      if (!lane) {
        console.log(`  ${id}/${voiceKey}`.padEnd(38) + ' ** no such lane — skipped **');
        continue;
      }
      const { level, peak, frames: n } = await measureVoiceAt(renderer.render, preset, lane,
        { mix: { voiceParams: { [voiceKey]: preset } } });
      sameWindow(n, `${id}/${voiceKey}`);
      const was = preset.level;
      copies.push({ id, voiceKey, preset, level, peak });
      const warn = level <= 0 ? '  ** SILENT — it will not render **'
        : level < 0.0004 ? '  (very quiet: check its envelope)' : '';
      const moved = was > 0 ? ` (was ${Number(was).toFixed(4)})` : '';
      console.log(`  ${id}/${voiceKey}`.padEnd(38)
        + ` ${(preset.label || '?').padEnd(16)} level ${level.toFixed(4)}${moved}${warn}`);
    }
  }
} finally {
  await renderer.close();
}

const silent = [
  ...Object.entries(levels).filter(([, p]) => !(p > 0)).map(([id]) => id),
  ...copies.filter((c) => !(c.level > 0)).map((c) => `${c.id}/${c.voiceKey}`),
];
if (silent.length) {
  console.error(`\n${silent.length} preset(s) render SILENT: ${silent.join(', ')}`);
  console.error('Fix or remove them — a silent preset sounds fine on the desk and '
    + 'is missing from every WAV, stem and video.');
}

/**
 * The songs' own copies, back into the song files they came from.
 *
 * Not into the PEAKS block: a copy is not in the library and must not appear to be —
 * its home is the `voiceParams` of one song's mix, under that song's own DESK WRITES
 * BELOW HERE line. `writeSongFile` rewrites exactly that half, which is the same
 * writer the mixing desk saves through, so a batch re-measure and a desk save leave
 * the file in the same shape.
 *
 * A silent one is written anyway. The peak is reported and the exit code says so, but
 * refusing to write would leave the file claiming a peak we have just proved wrong.
 */
function writeCopies() {
  const round = (x) => Number(x.toFixed(x < 0.01 ? 6 : 4));
  const bySong = new Map();
  for (const c of copies) {
    // Already right in both numbers, or there is nothing to write.
    if (Number(c.preset.level) === round(c.level)
      && Number(c.preset.peak) === Number(c.peak.toFixed(4))) continue;
    if (!bySong.has(c.id)) bySong.set(c.id, []);
    bySong.get(c.id).push(c);
  }
  for (const [id, list] of bySong) {
    const song = SONGS[id];
    const mix = JSON.parse(JSON.stringify(song.mix));
    for (const c of list) {
      mix.voiceParams[c.voiceKey].level = round(c.level);
      mix.voiceParams[c.voiceKey].peak = Number(c.peak.toFixed(4));
    }
    writeSongFile(ROOT, id, { mix, arrangement: song.arrangement || null });
    console.log(`  wrote src/data/songs/${id}.js — ${list.map((c) => c.voiceKey).join(', ')}`);
  }
  return bySong.size;
}

// One `id: number,` per entry, wrapped at 80 columns, formatted the way the file
// already is. A level is small enough that four decimals would quantise the quiet end
// of the library into steps of a decibel, so those get six.
const table = (name, values, digits = 4) => {
  const rows = [];
  let line = ' ';
  for (const [id, p] of Object.entries(values)) {
    const piece = ` ${id}: ${Number(p.toFixed(digits))},`;
    if (line.length + piece.length > 80) { rows.push(line); line = ' '; }
    line += piece;
  }
  rows.push(line.replace(/,$/, ''));
  return `const ${name} = {\n${rows.join('\n')}\n};`;
};

if (DRY) {
  console.log('\n--dry: src/data/voices.js not written.');
  if (copies.length) console.log(`--dry: ${copies.length} song copies not written either.`);
} else {
  // Rewritten in place. The blocks are machine-owned and say so; everything around
  // them is hand-written and is not touched.
  // In fill mode the stored number wins wherever there IS one — see FILL above.
  const keep = (measured, stored) => {
    if (!FILL) return measured;
    const out = {};
    for (const [id, value] of Object.entries(measured)) {
      const was = stored[id];
      out[id] = Number(was) > 0 && Number(was) !== 1 ? Number(was) : value;
    }
    return out;
  };
  const storedLevels = {};
  const storedPeaks = {};
  for (const v of tone) {
    if (v.level !== undefined) storedLevels[v.id] = v.level;
    if (v.peak !== undefined) storedPeaks[v.id] = v.peak;
  }
  const block = table('PEAKS', keep(peaks, storedPeaks));
  const lblock = table('LEVELS', keep(levels, storedLevels), 6);
  if (FILL) {
    const filled = Object.keys(levels).filter((id) => !(Number(storedLevels[id]) > 0));
    console.log(`\n--fill: writing ${filled.length} preset(s) that had no measurement: `
      + `${filled.join(', ') || 'none'}`);
  }

  // A lane target is two numbers, so it gets a line each rather than a wrapped run.
  const tblock = `const LANE_TARGETS = {\n${Object.entries(targets).map(
    ([lane, t]) => `  ${lane}: { level: ${Number(t.level.toFixed(6))}, peak: ${Number(t.peak.toFixed(4))} },`,
  ).join('\n').replace(/,$/, '')}\n};`;

  const src = readFileSync(FILE, 'utf8');
  const next = src
    .replace(/const LANE_TARGETS = \{[\s\S]*?\n\};/, () => tblock)
    .replace(/const LEVELS = \{[\s\S]*?\n\};/, () => lblock)
    .replace(/const PEAKS = \{[\s\S]*?\n\};/, () => block);
  if (next === src) {
    console.error('\nCould not find the LEVELS block in src/data/voices.js — not written.');
    process.exit(1);
  }
  writeFileSync(FILE, next);
  console.log(`\nwrote ${tone.length} preset levels and ${Object.keys(targets).length}`
    + ' lane targets into src/data/voices.js');
  const songs = writeCopies();
  if (songs) console.log(`and ${copies.length} song copies across ${songs} song file(s)`);
  else if (copies.length) console.log(`${copies.length} song copies were already correct`);
}
process.exit(silent.length ? 1 : 0);
