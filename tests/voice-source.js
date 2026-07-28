// The preset editor writes SOURCE — src/data/voices.js, the hand-written file the game
// and every render tool import. That is the thing worth testing hardest here.
//
// A mix file can be re-emitted wholesale, because it is generated. The voice library
// cannot: it is prose, section comments, and a running argument with itself about why
// each sound exists. So tools/lib/voices-source.js replaces ONE ENTRY at a time and
// leaves every byte around it alone, which is a claim with two halves:
//
//   · what it writes, the module system reads back as the same preset  — round trip
//   · what it does not write, it does not touch                        — byte identity
//
// Both are checked against the real file with all 104 editable presets in it, not
// against a fixture, because the fixture that matters is the one on disk: the imported
// Tone.js presets are JSON-stringified with double quotes, several notes are broken
// across lines with `+`, and the whole file is littered with braces inside strings.
// Those are exactly the shapes a scanner gets wrong.
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  readVoicesSource, entriesIn, emitEntry, upsertPreset, deletePreset, setPeak, tableOf,
} from '../tools/lib/voices-source.js';
import { VOICES } from '../src/data/voices.js';

let failed = 0;
const assert = (cond, msg) => {
  if (cond) { console.log(`ok: ${msg}`); } else { console.error(`FAIL: ${msg}`); failed++; }
};

const SRC = readVoicesSource();
const TMP = mkdtempSync(join(tmpdir(), 'mash-voices-'));
let seq = 0;

/** Write a candidate source out and import it, which is the only real proof it parses. */
const load = async (src) => {
  const file = join(TMP, `voices-${++seq}.js`);
  writeFileSync(file, src);
  return import(`file://${file}`);
};

// ---- finding entries --------------------------------------------------------

const tone = entriesIn(SRC, 'TONE');
const noise = entriesIn(SRC, 'NOISE');
const drums = entriesIn(SRC, 'DRUM');
const wantTone = Object.values(VOICES).filter((v) => v.kind === 'tone');
const wantNoise = Object.values(VOICES).filter((v) => v.kind === 'noise');
const wantDrum = Object.values(VOICES).filter((v) => v.kind === 'drum');

assert(tone.length === wantTone.length,
  `TONE: every entry is found (${tone.length} of ${wantTone.length})`);
assert(noise.length === wantNoise.length,
  `NOISE: every entry is found (${noise.length} of ${wantNoise.length})`);
assert(drums.length === wantDrum.length,
  `DRUM: every entry is found (${drums.length} of ${wantDrum.length})`);
// The failure mode this guards is a scanner counting `oscillator: {` as an entry.
// It does not throw — it silently reports a table with three times as many presets
// in it as there are, and then replaces the wrong span.
assert(tone.every((e) => VOICES[e.id]?.kind === 'tone'),
  'TONE: nothing nested inside a preset is mistaken for one');
assert(noise.every((e) => VOICES[e.id]?.kind === 'noise'),
  'NOISE: nothing nested inside a preset is mistaken for one');
assert(drums.every((e) => VOICES[e.id]?.kind === 'drum'),
  'DRUM: nothing nested inside a preset is mistaken for one');
assert(tableOf(SRC, 'roundMono') === 'TONE' && tableOf(SRC, 'clap808') === 'NOISE'
  && tableOf(SRC, 'dsKick') === 'DRUM',
'a preset is found in the table it lives in');
assert(tableOf(SRC, 'engFilteredSaw') === null,
  'an ENGINE preset is in neither editable table — it is bank keys, not a synth');
assert(tableOf(SRC, 'neverExisted') === null, 'an unknown id is not claimed by a table');

// ---- the round trip ---------------------------------------------------------

// Every editable preset, re-emitted from the object the game loaded and read back. If
// the emitter drops a key, quotes a number, or breaks a note across lines in a way
// that welds two words together, this is where it shows.
let rt = SRC;
for (const e of [...tone, ...noise, ...drums]) {
  const { id, kind, peak, ...rest } = VOICES[e.id];
  rt = upsertPreset(rt, e.id, rest);
}
const after = await load(rt);
const changed = Object.keys(VOICES).filter((id) => {
  const a = { ...VOICES[id] }, b = { ...(after.VOICES[id] || {}) };
  return JSON.stringify(a) !== JSON.stringify(b);
});
assert(!changed.length,
  `all ${Object.keys(VOICES).length} presets survive being written and read back`
  + (changed.length ? ` — ${changed.slice(0, 5).join(', ')} did not` : ''));
assert(entriesIn(rt, 'TONE').length === tone.length && entriesIn(rt, 'NOISE').length === noise.length
  && entriesIn(rt, 'DRUM').length === drums.length,
'and rewriting every entry adds and loses none');

// ---- adding one -------------------------------------------------------------

const NEW_TONE = {
  label: 'Test Wobble', category: 'Basses', synth: 'MonoSynth', dur: 1.5,
  // Long enough to need wrapping, which is where a naive emitter loses the space
  // between the last word of one line and the first word of the next.
  note: 'A preset the test invents to prove the desk can add one, with a note long '
    + 'enough that it has to be broken across more than a single line of source.',
  options: {
    oscillator: { type: 'sawtooth' },
    // Straight off a slider, where floating point leaves a tail. A file full of
    // 0.30000000000000004 is a file nobody wants to review.
    envelope: { attack: 0.30000000000000004, decay: 0.2, sustain: 0.7, release: 0.25 },
  },
};
const NEW_NOISE = {
  label: 'Test Clap', category: 'Claps', dur: 1, note: 'A clap the test made up.',
  noise: { type: 'bandpass', freq: 1900, Q: 1.4, decay: 0.11 },
  taps: [0, 0.011, 0.023], tapFalloff: 0.78,
};
const NEW_DRUM = {
  label: 'Test Thump', category: 'Kicks', dur: 1, note: 'A drum-synth kick the test made up.',
  osc: { type: 'sine', from: 180, to: 50, sweep: 0.05, decay: 0.4, curve: 'exp', gain: 1 },
  noise: { type: 'lowpass', freq: 3000, Q: 0.7, decay: 0.02, gain: 0.4 },
  drive: 0.3,
};

let added = upsertPreset(SRC, 'testWobble', NEW_TONE, 'TONE');
added = setPeak(added, 'testWobble', 0.876543);
added = upsertPreset(added, 'testClap', NEW_NOISE, 'NOISE');
added = setPeak(added, 'testClap', 0.2);
added = upsertPreset(added, 'testThump', NEW_DRUM, 'DRUM');
added = setPeak(added, 'testThump', 0.5);
const grown = await load(added);

assert(grown.VOICES.testWobble?.kind === 'tone' && grown.VOICES.testClap?.kind === 'noise'
  && grown.VOICES.testThump?.kind === 'drum',
'a new preset in each table loads with the right kind');
assert(grown.VOICES.testThump?.osc.from === 180 && grown.VOICES.testThump?.drive === 0.3
  && grown.VOICES.testThump?.noise.gain === 0.4,
'a drum preset’s osc, noise and drive all survive the trip through the emitter');
assert(grown.VOICES.testWobble?.options.envelope.attack === 0.3,
  'a slider’s floating-point tail is written as the number it meant (0.3)');
assert(grown.VOICES.testWobble?.note === NEW_TONE.note,
  'a note long enough to wrap comes back as the same string, spaces and all');
assert(JSON.stringify(grown.VOICES.testClap?.taps) === JSON.stringify(NEW_NOISE.taps),
  'a tap list survives, in order');
// The measurement is the point of the whole save path: a preset whose peak is the
// placeholder is one that arrives at the wrong level on every lane.
assert(grown.VOICES.testWobble?.peak === 0.8765 && grown.VOICES.testClap?.peak === 0.2,
  'each carries the peak that was spliced in, rounded the way the block is');
assert(Object.keys(grown.VOICES).length === Object.keys(VOICES).length + 3,
  'and nothing else appeared or vanished');

// Splicing one peak must not disturb the other hundred — the block is machine-owned,
// but it is machine-owned by tools/measure-voices.js too, and the two have to agree.
const peaksOf = (m) => Object.fromEntries(Object.values(m.VOICES)
  .filter((v) => v.peak !== undefined).map((v) => [v.id, v.peak]));
const before = peaksOf({ VOICES });
const now = peaksOf(grown);
assert(Object.entries(before).every(([id, p]) => now[id] === p),
  `splicing a peak in leaves the other ${Object.keys(before).length} untouched`);

// ---- editing one in place ---------------------------------------------------

const edited = upsertPreset(SRC, 'roundMono', {
  ...(() => { const { id, kind, peak, ...r } = VOICES.roundMono; return r; })(),
  label: 'Round Mono, Edited',
  options: { ...VOICES.roundMono.options, envelope: { attack: 0.5, decay: 0.2, sustain: 0.7, release: 0.25 } },
});
const rewritten = await load(edited);
assert(rewritten.VOICES.roundMono?.label === 'Round Mono, Edited'
  && rewritten.VOICES.roundMono?.options.envelope.attack === 0.5,
'an edit to an existing preset lands on that preset');
assert(rewritten.VOICES.roundMono?.options.filterEnvelope.baseFrequency === 120,
  'and the keys the editor has no control for are carried through, not dropped');
assert(Object.keys(rewritten.VOICES).length === Object.keys(VOICES).length,
  'editing one preset does not add or lose another');
assert(rewritten.VOICES.fmGrowl && JSON.stringify(rewritten.VOICES.fmGrowl) === JSON.stringify(VOICES.fmGrowl),
  'the preset that follows it in the table is untouched');
// The whole reason this module patches instead of re-emitting: the file is 1200 lines
// of hand-written prose, and a save that reflowed it would make every diff unreadable.
const editedLines = edited.split('\n').length - SRC.split('\n').length;
assert(Math.abs(editedLines) <= 2,
  `an edit changes the entry, not the file (${editedLines >= 0 ? '+' : ''}${editedLines} lines)`);

// ---- deleting one -----------------------------------------------------------

// Round-tripping to byte identity is the strongest statement available: not "the
// presets still load", but "the file is character-for-character the one we started
// with", comments, blank lines, indentation and all.
assert(deletePreset(deletePreset(deletePreset(added, 'testWobble'), 'testClap'), 'testThump') === SRC,
  'adding three presets and deleting them again restores the file byte for byte');

// The last entry in a table is the case that catches a span starting at the id rather
// than at the start of its line: the indentation left behind lands on the table's `};`.
const lastTone = tone[tone.length - 1].id;
const gone = await load(deletePreset(SRC, lastTone));
assert(!gone.VOICES[lastTone] && Object.keys(gone.VOICES).length === Object.keys(VOICES).length - 1,
  `deleting the last entry in a table (${lastTone}) leaves a file that still parses`);
assert(gone.VOICES[tone[tone.length - 2].id],
  'and takes only the one it was asked for');
assert(deletePreset(SRC, lastTone).includes('const PEAKS'),
  'a delete keeps the PEAKS block, minus its own line');

let threw = false;
try { deletePreset(SRC, 'neverExisted'); } catch { threw = true; }
assert(threw, 'deleting a preset that is not there is refused rather than guessed at');

threw = false;
try { upsertPreset(SRC, 'not an id', NEW_TONE, 'TONE'); } catch { threw = true; }
assert(threw, 'an id that is not a usable identifier is refused before it reaches the file');

// ---- what the emitter writes ------------------------------------------------

const emitted = emitEntry('demo', NEW_TONE);
assert(emitted.startsWith('  demo: { label: '),
  'an entry is emitted in the file’s own shape — identity on the head line');
assert(!/\n\s*\}\s*,\s*$/.test(emitted) && emitted.trimEnd().endsWith('} },'),
  'and closes on the last line, the way the hand-written ones do');
assert(emitted.split('\n').every((l) => l.length < 110),
  'no line runs past what a reviewer can read');

console.log(failed ? `\nVOICE SOURCE: ${failed} FAILED` : '\nVOICE SOURCE: PASSED');
process.exit(failed ? 1 : 0);
