// Measure every preset in the voice library, and write the peaks back into it.
//
// A preset's level cannot be hand-written. Tone's synths do not peak in the same
// place for the same note — through this render pipeline a Synth reaches 0.99, a
// MonoSynth 0.92, a DuoSynth 1.56, an FMSynth 0.32 and an AMSynth 0.19 — so the same
// number would mean five different loudnesses, and with presets going on any lane
// there is no one lane to tune them against by ear either.
//
// So: render each preset alone, at unity, on one lane, and record the peak it
// reaches. `voiceGain()` divides the lane's own target by that number, and every
// preset arrives at roughly the level the lane's hand-written voice arrives at.
//
// Usage: node tools/measure-voices.js          measure and rewrite the PEAKS block
//        node tools/measure-voices.js --dry    print the table, change nothing
//
// Re-run it after editing any preset's `options`: an envelope edit moves the peak,
// and a stale number is a preset that is quietly twice as loud as its neighbours.
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { VOICES, VOICE_LANES, PERCUSSION_LANES } from '../src/data/voices.js';
import { SONGS } from '../src/data/songs/index.js';
import { writeSongFile } from './lib/song-file.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'src/data/voices.js');
const DRY = process.argv.includes('--dry');

// One note, held, with nothing else in the song. A2 is low enough that a bass preset
// is in its range and high enough that a bell is not absurd; the point is a number
// that is comparable across presets, not a musical audition.
const A2 = 110;
const BANK = { bpm: 120, bass: Array.from({ length: 32 }, (_, i) => (i === 0 ? A2 : null)) };

// Measured on the bass lane with its gain forced to 1, so the number is the synth's
// own peak and nothing else. `voiceGain` then scales it per lane.
const measure = (render, id) => render(
  { ...BANK, bassVoice: id, bassGain: 1, bassDur: 8 },
  { repeat: 1, mix: null, trackId: null },
);

// The same measurement for a preset that is NOT in the library — a copy a song keeps
// in its own mix, under `voiceParams`. It reaches the renderer the way the song hands
// it over, through the mix, so there is nothing to write anywhere first. Identical
// bank and identical pipeline, so the number means what every other peak here means.
const measureCopy = (render, preset) => render(
  { ...BANK, bassGain: 1, bassDur: 8 },
  { repeat: 1, mix: { voiceParams: { bassVoice: preset } }, trackId: null },
);

// A single note on one lane, with nothing else in the song.
//
// Three shapes, because a bank holds three: percussion is booleans, the two chord
// lanes hold an ARRAY of frequencies per step, and everything else holds one. A bare
// number on a chord lane is not a quiet chord — `for (const cf of 110)` throws, and
// the render dies with a page error rather than a bad number.
const CHORD_LANES = ['chords', 'organChords'];
const oneNote = (lane) => {
  const value = PERCUSSION_LANES.includes(lane) ? true
    : CHORD_LANES.includes(lane) ? [A2] : A2;
  const rest = PERCUSSION_LANES.includes(lane) ? false : null;
  return { bpm: 120, [lane]: Array.from({ length: 32 }, (_, i) => (i === 0 ? value : rest)) };
};

// Noise and drum-synth presets are measured too: they are built from native nodes
// rather than a Tone class, but their level is derived from a measured peak exactly
// the same way.
const tone = Object.values(VOICES).filter((v) => ['tone', 'noise', 'drum'].includes(v.kind));
const peaks = {};
const targets = {};
const copies = [];
const renderer = await openRenderer();
try {
  // Half the calibration: what one note of each lane's OWN voice peaks at. Measured
  // rather than taken from the authored gain constants — those are pre-pipeline, and
  // the bass lane's 0.1 arrives as 0.06 by the time it reaches the master.
  for (const lane of Object.keys(VOICE_LANES)) {
    const { peak } = await renderer.render(oneNote(lane), { repeat: 1, mix: null, trackId: null });
    targets[lane] = peak;
    console.log(`  lane ${lane.padEnd(13)} its own voice peaks at ${peak.toFixed(4)}`);
  }
  console.log('');

  for (const v of tone) {
    const { peak } = await measure(renderer.render, v.id);
    peaks[v.id] = peak;
    const warn = peak <= 0 ? '  ** SILENT — it will not render **'
      : peak < 0.02 ? '  (very quiet: check its envelope)' : '';
    console.log(`  ${v.id.padEnd(18)} ${(v.synth || v.kind).padEnd(14)} peak ${peak.toFixed(4)}${warn}`);
  }

  // And the copies songs keep for themselves.
  //
  // A song can carry its own version of a preset — the desk's Save to Song — and it
  // needs a peak for exactly the reason a library preset does: `voiceGain` divides the
  // lane's target by it. Nothing measures one while it is being edited, deliberately;
  // a copy inherits the peak of what it was made from, which is the right ballpark,
  // and the fader is the control for the rest. This is where the numbers are settled,
  // in a batch, on purpose — the same bargain the library has always had.
  for (const [id, song] of Object.entries(SONGS)) {
    const params = song.mix?.voiceParams;
    if (!params) continue;
    for (const [voiceKey, preset] of Object.entries(params)) {
      const { peak } = await measureCopy(renderer.render, preset);
      const was = preset.peak;
      copies.push({ id, voiceKey, preset, peak });
      const warn = peak <= 0 ? '  ** SILENT — it will not render **'
        : peak < 0.02 ? '  (very quiet: check its envelope)' : '';
      const moved = was > 0 ? ` (was ${Number(was).toFixed(4)})` : '';
      console.log(`  ${id}/${voiceKey}`.padEnd(38)
        + ` ${(preset.label || '?').padEnd(16)} peak ${peak.toFixed(4)}${moved}${warn}`);
    }
  }
} finally {
  await renderer.close();
}

const silent = [
  ...Object.entries(peaks).filter(([, p]) => !(p > 0)).map(([id]) => id),
  ...copies.filter((c) => !(c.peak > 0)).map((c) => `${c.id}/${c.voiceKey}`),
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
  const bySong = new Map();
  for (const c of copies) {
    if (Number(c.preset.peak) === Number(c.peak.toFixed(4))) continue;   // already right
    if (!bySong.has(c.id)) bySong.set(c.id, []);
    bySong.get(c.id).push(c);
  }
  for (const [id, list] of bySong) {
    const song = SONGS[id];
    const mix = JSON.parse(JSON.stringify(song.mix));
    for (const c of list) mix.voiceParams[c.voiceKey].peak = Number(c.peak.toFixed(4));
    writeSongFile(ROOT, id, { mix, arrangement: song.arrangement || null });
    console.log(`  wrote src/data/songs/${id}.js — ${list.map((c) => c.voiceKey).join(', ')}`);
  }
  return bySong.size;
}

if (DRY) {
  console.log('\n--dry: src/data/voices.js not written.');
  if (copies.length) console.log(`--dry: ${copies.length} song copies not written either.`);
} else {
  // Rewritten in place, formatted the way the file already is. The block is machine
  // -owned and says so; everything around it is hand-written and is not touched.
  const rows = [];
  let line = ' ';
  for (const [id, p] of Object.entries(peaks)) {
    const piece = ` ${id}: ${Number(p.toFixed(4))},`;
    if (line.length + piece.length > 80) { rows.push(line); line = ' '; }
    line += piece;
  }
  rows.push(line.replace(/,$/, ''));
  const block = `const PEAKS = {\n${rows.join('\n')}\n};`;

  const trows = [];
  let tline = ' ';
  for (const [lane, p] of Object.entries(targets)) {
    const piece = ` ${lane}: ${Number(p.toFixed(4))},`;
    if (tline.length + piece.length > 80) { trows.push(tline); tline = ' '; }
    tline += piece;
  }
  trows.push(tline.replace(/,$/, ''));
  const tblock = `const LANE_TARGETS = {\n${trows.join('\n')}\n};`;

  const src = readFileSync(FILE, 'utf8');
  const next = src
    .replace(/const LANE_TARGETS = \{[\s\S]*?\n\};/, () => tblock)
    .replace(/const PEAKS = \{[\s\S]*?\n\};/, () => block);
  if (next === src) {
    console.error('\nCould not find the PEAKS block in src/data/voices.js — not written.');
    process.exit(1);
  }
  writeFileSync(FILE, next);
  console.log(`\nwrote ${tone.length} preset peaks and ${Object.keys(targets).length}`
    + ' lane targets into src/data/voices.js');
  const songs = writeCopies();
  if (songs) console.log(`and ${copies.length} song copies across ${songs} song file(s)`);
  else if (copies.length) console.log(`${copies.length} song copies were already correct`);
}
process.exit(silent.length ? 1 : 0);
