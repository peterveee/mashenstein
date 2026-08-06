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
// Both are checked against the real file with all editable presets in it, not
// against a fixture, because the fixture that matters is the one on disk: the imported
// Tone.js presets are JSON-stringified with double quotes, several notes are broken
// across lines with `+`, and the whole file is littered with braces inside strings.
// Those are exactly the shapes a scanner gets wrong.
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  readVoicesSource, entriesIn, emitEntry, upsertPreset, deletePreset, setMeasured,
  readMeasured, tableOf,
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
const userTone = entriesIn(SRC, 'USER_TONE');
const userNoise = entriesIn(SRC, 'USER_NOISE');
const userDrums = entriesIn(SRC, 'USER_DRUM');
const allTone = [...tone, ...userTone];
const allNoise = [...noise, ...userNoise];
const allDrums = [...drums, ...userDrums];
// The source-backed catalogue. A frozen starter carries a kind like anything else — it
// has to, since STARTER holds all three — but it does not live in one of the writable
// tables, and that is exactly the property that makes it frozen: `tableOf` cannot find
// it, so nothing here can write it. Counting it as a table entry would be asserting
// that the thing the editor cannot reach is reachable.
const editable = Object.values(VOICES).filter((v) => !v.starter);
const wantTone = editable.filter((v) => v.kind === 'tone');
const wantNoise = editable.filter((v) => v.kind === 'noise');
const wantDrum = editable.filter((v) => v.kind === 'drum');

assert(allTone.length === wantTone.length,
  `TONE and USER_TONE: every entry is found (${allTone.length} of ${wantTone.length})`);
assert(allNoise.length === wantNoise.length,
  `NOISE and USER_NOISE: every entry is found (${allNoise.length} of ${wantNoise.length})`);
assert(allDrums.length === wantDrum.length,
  `DRUM and USER_DRUM: every entry is found (${allDrums.length} of ${wantDrum.length})`);
// The failure mode this guards is a scanner counting `oscillator: {` as an entry.
// It does not throw — it silently reports a table with three times as many presets
// in it as there are, and then replaces the wrong span.
assert(tone.every((e) => VOICES[e.id]?.kind === 'tone'),
  'TONE: nothing nested inside a preset is mistaken for one');
assert(noise.every((e) => VOICES[e.id]?.kind === 'noise'),
  'NOISE: nothing nested inside a preset is mistaken for one');
assert(drums.every((e) => VOICES[e.id]?.kind === 'drum'),
  'DRUM: nothing nested inside a preset is mistaken for one');
assert(userTone.every((e) => VOICES[e.id]?.kind === 'tone' && VOICES[e.id]?.user),
  'USER_TONE: every entry is a user preset');
assert(userNoise.every((e) => VOICES[e.id]?.kind === 'noise' && VOICES[e.id]?.user),
  'USER_NOISE: every entry is a user preset');
assert(userDrums.every((e) => VOICES[e.id]?.kind === 'drum' && VOICES[e.id]?.user),
  'USER_DRUM: every entry is a user preset');
assert(tableOf(SRC, 'roundMono') === 'TONE' && tableOf(SRC, 'clap808') === 'NOISE'
  && tableOf(SRC, 'dsKick') === 'DRUM',
'a preset is found in the table it lives in');
assert(tableOf(SRC, 'engFilteredSaw') === null,
  'an ENGINE preset is in neither editable table — it is bank keys, not a synth');
assert(tableOf(SRC, 'neverExisted') === null, 'an unknown id is not claimed by a table');
assert(SRC.includes('const USER_TONE = {') && SRC.includes('const USER_NOISE = {')
  && SRC.includes('const USER_DRUM = {'),
  'the editable user tables exist separately from the read-only library tables');

// ---- the round trip ---------------------------------------------------------

// Every editable preset, re-emitted from the object the game loaded and read back. If
// the emitter drops a key, quotes a number, or breaks a note across lines in a way
// that welds two words together, this is where it shows.
let rt = SRC;
for (const e of [...allTone, ...allNoise, ...allDrums]) {
  const { id, kind, level, peak, ...rest } = VOICES[e.id];
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
assert(entriesIn(rt, 'TONE').length === tone.length
  && entriesIn(rt, 'NOISE').length === noise.length
  && entriesIn(rt, 'DRUM').length === drums.length
  && entriesIn(rt, 'USER_TONE').length === userTone.length
  && entriesIn(rt, 'USER_NOISE').length === userNoise.length
  && entriesIn(rt, 'USER_DRUM').length === userDrums.length,
'and rewriting every entry adds and loses none');

// ---- adding one -------------------------------------------------------------

const NEW_TONE = {
  label: 'Test Wobble', category: 'Bass', synth: 'MonoSynth', dur: 1.5,
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
  label: 'Test Clap', category: 'Clap', dur: 1, note: 'A clap the test made up.',
  noise: { type: 'bandpass', freq: 1900, Q: 1.4, decay: 0.11 },
  taps: [0, 0.011, 0.023], tapFalloff: 0.78,
};
const NEW_DRUM = {
  label: 'Test Thump', category: 'Kick', dur: 1, note: 'A drum-synth kick the test made up.',
  osc: { type: 'sine', from: 180, to: 50, sweep: 0.05, decay: 0.4, curve: 'exp', gain: 1 },
  noise: { type: 'lowpass', freq: 3000, Q: 0.7, decay: 0.02, gain: 0.4 },
  drive: 0.3,
};
// The additive stack. Its drawbars are the one ARRAY OF NUMBERS a preset carries that has
// to come back as an array — the desk writes bars by index (`additive.bars.3`), and a
// round trip that turned the list into `{ '3': 0.2 }` would load as a preset with no bars,
// which is silence rather than a wrong sound.
const NEW_ADDITIVE = {
  label: 'Test Organ', category: 'Organ', synth: 'AdditiveSynth',
  homeLane: 'organChords', dur: 6,
  note: 'An additive stack the test made up.',
  additive: {
    bars: [0, 0, 1, 0.55, 0.3, 0.2, 0, 0.1, 0],
    attack: 0.03, decay: 0, stretch: 0.02, damp: 0.5,
    perc: { ratio: 3, gain: 0.7, attack: 0.002, decay: 0.08 },
  },
};

// A user entry must round-trip through a USER_* table without inheriting the
// library/factory marker that makes built-in sounds read-only.
const userSource = upsertPreset(SRC, 'testUserPreset', NEW_TONE, 'USER_TONE');
const userLoaded = await load(userSource);
assert(tableOf(userSource, 'testUserPreset') === 'USER_TONE'
  && userLoaded.VOICES.testUserPreset?.user === true
  && !userLoaded.VOICES.testUserPreset?.factory,
  'a user preset is distinct from a library preset after it is loaded');

// The layer stack: nested sections THREE deep (osc1.filter.env), which is the shape the
// emitter's one-line-per-section rule has to keep readable — and survivable.
const NEW_LAYER = {
  label: 'Test Stack', category: 'Bass', synth: 'LayerSynth', dur: 1.8,
  note: 'A layered bass the test made up.',
  layer: {
    osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.006, decay: 0,
      filter: { type: 'lowpass', freq: 320, Q: 1.15, track: 0,
        env: { octaves: 1.845, attack: 0.001, decay: 0, sustain: 0 } } },
    osc2: { type: 'sine', ratio: 0.5, gain: 0.22, len: 1.05, attack: 0.008, decay: 0 },
    // A pulse with its width moving: a nested section three deep, on the layer that also
    // carries a plain `width`, so the round trip has to keep both.
    osc3: { type: 'pulse', width: 0.28, ratio: 2, gain: 0.3, attack: 0.01, decay: 0,
      pwm: { type: 'triangle', rate: 0.37, depth: 0.62, delay: 0.2 } },
    lfo: { type: 'sine', rate: 0.5, depth: 0.3, target: 'filter', delay: 0 },
  },
  // The stage the layers sum into — a second root key beside `layer`, nested two deep,
  // with its own filter envelope. It rides the same `optionsBlock` path, and a preset
  // that lost it on save would be a stack whose shared filter silently came off.
  global: {
    filter: { type: 'lowpass', freq: 900, Q: 1.4, track: 0.5,
      env: { octaves: -2.5, attack: 0.004, decay: 0.2, sustain: 0.3 } },
    vca: { attack: 0.01, decay: 0, sustain: 1, release: 0.08 },
  },
};

let added = upsertPreset(SRC, 'testWobble', NEW_TONE, 'TONE');
added = setMeasured(added, 'testWobble', { level: 0.0876543, peak: 0.876543 });
added = upsertPreset(added, 'testClap', NEW_NOISE, 'NOISE');
added = setMeasured(added, 'testClap', { level: 0.02, peak: 0.2 });
added = upsertPreset(added, 'testThump', NEW_DRUM, 'DRUM');
added = setMeasured(added, 'testThump', { level: 0.05, peak: 0.5 });
added = upsertPreset(added, 'testOrgan', NEW_ADDITIVE, 'TONE');
added = setMeasured(added, 'testOrgan', { level: 0.07, peak: 0.9 });
added = upsertPreset(added, 'testStack', NEW_LAYER, 'TONE');
added = setMeasured(added, 'testStack', { level: 0.06, peak: 0.6 });
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
// A LIST, not an object with numeric keys. The desk writes drawbars by index, so if a
// round trip turned `[0, 0, 1, …]` into `{ '0': 0, '2': 1, … }` the preset would load
// with `Array.isArray(bars)` false and `_playAdditive` would refuse it — silence, and
// silence that looks like the engine rather than like the emitter.
assert(Array.isArray(grown.VOICES.testOrgan?.additive?.bars)
  && JSON.stringify(grown.VOICES.testOrgan.additive.bars) === JSON.stringify(NEW_ADDITIVE.additive.bars),
'an additive stack’s drawbars come back as a list, in order');
assert(grown.VOICES.testOrgan?.additive?.perc?.ratio === 3
  && grown.VOICES.testOrgan?.additive?.stretch === 0.02,
'an additive preset’s nested percussion and character controls survive the trip');
// Three levels of nesting — a layer, the filter inside it, and that filter's envelope —
// plus two zeroes that MEAN something (`track: 0` is key follow off, `decay: 0` is
// "across the note"), so neither may be dropped as a default on the way through.
assert(grown.VOICES.testStack?.layer?.osc1?.filter?.freq === 320
  && grown.VOICES.testStack?.layer?.osc1?.filter?.track === 0
  && grown.VOICES.testStack?.layer?.osc1?.filter?.env?.octaves === 1.845
  && grown.VOICES.testStack?.layer?.osc1?.decay === 0
  && grown.VOICES.testStack?.layer?.lfo?.target === 'filter',
'a layer preset’s nested filter, its envelope, the LFO and meaningful zeroes survive the trip');
// The global stage is a SECOND root key on the same preset, and its ENV AMOUNT is
// negative — a filter closing from above, which is exactly the value a "tidy up the
// defaults" pass would be tempted to drop. A stack that came back without it would play
// with its shared filter wide open and sound like a different preset.
assert(grown.VOICES.testStack?.layer?.osc3?.width === 0.28
  && grown.VOICES.testStack?.layer?.osc3?.pwm?.rate === 0.37
  && grown.VOICES.testStack?.layer?.osc3?.pwm?.depth === 0.62,
'a pulse keeps its width AND the section that moves it');
assert(grown.VOICES.testStack?.global?.filter?.freq === 900
  && grown.VOICES.testStack?.global?.filter?.track === 0.5
  && grown.VOICES.testStack?.global?.filter?.env?.octaves === -2.5
  && grown.VOICES.testStack?.global?.vca?.decay === 0
  && grown.VOICES.testStack?.global?.vca?.release === 0.08,
'the global filter, its bipolar envelope and the VCA survive the trip beside the layers');
// The measurement is the point of the whole save path: a preset whose level is the
// placeholder is one that arrives at the wrong level on every lane. Both numbers,
// because a save writes both and a save that wrote one would leave the two describing
// two different sounds.
assert(grown.VOICES.testWobble?.level === 0.087654 && grown.VOICES.testClap?.level === 0.02,
  'each carries the level that was spliced in, rounded the way the block is');
assert(grown.VOICES.testWobble?.peak === 0.8765 && grown.VOICES.testClap?.peak === 0.2,
  'each carries the peak that was spliced in, rounded the way the block is');
// And the source can be read back for them, which is how the desk knows what the
// renderer is about to play a preset at while its own copy of voices.js is stale.
assert(readMeasured(added, 'testClap').level === 0.02
  && readMeasured(added, 'testClap').peak === 0.2,
'readMeasured finds both numbers it just wrote');
assert(readMeasured(added, 'noSuchPreset').level === 0
  && readMeasured(added, 'noSuchPreset').peak === 1,
'and answers an unmeasured id with the defaults VOICES would have built it with');
assert(Object.keys(grown.VOICES).length === Object.keys(VOICES).length + 5,
  'and nothing else appeared or vanished');

// Splicing one measurement must not disturb the other hundred — the blocks are
// machine-owned, but they are machine-owned by tools/measure-voices.js too, and the
// two have to agree.
const measuredIn = (m) => Object.fromEntries(Object.values(m.VOICES)
  .filter((v) => v.peak !== undefined).map((v) => [v.id, `${v.level}/${v.peak}`]));
const before = measuredIn({ VOICES });
const now = measuredIn(grown);
assert(Object.entries(before).every(([id, p]) => now[id] === p),
  `splicing one in leaves the other ${Object.keys(before).length} untouched`);

// ---- editing one in place ---------------------------------------------------

const edited = upsertPreset(SRC, 'roundMono', {
  ...(() => { const { id, kind, level, peak, ...r } = VOICES.roundMono; return r; })(),
  label: 'Round Mono, Edited',
  options: { ...VOICES.roundMono.options, envelope: { attack: 0.5, decay: 0.2, sustain: 0.7, release: 0.25 } },
});
const rewritten = await load(edited);
assert(rewritten.VOICES.roundMono?.label === 'Round Mono, Edited'
  && rewritten.VOICES.roundMono?.options.envelope.attack === 0.5,
'an edit to an existing preset lands on that preset');
// Read from the source rather than hardcoded. The claim is that a key the editor has no
// control for SURVIVES the round-trip — that is a statement about the serialiser, not
// about what roundMono's filter happens to be tuned to this week. Pinned to a literal it
// failed the first time that preset was re-voiced, which is a test reporting on the
// wrong thing: the sound had changed, and the serialiser had not.
assert(rewritten.VOICES.roundMono?.options.filterEnvelope.baseFrequency
  === VOICES.roundMono.options.filterEnvelope.baseFrequency,
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
assert(deletePreset(deletePreset(deletePreset(deletePreset(deletePreset(added, 'testWobble'), 'testClap'), 'testThump'), 'testOrgan'), 'testStack') === SRC,
  'adding five presets and deleting them again restores the file byte for byte');

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
