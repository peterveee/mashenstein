// MIDI in, one part at a time.
//
// The claim this suite exists to keep is a single sentence: NOTHING IS MERGED. A lane
// holds one value per step, so two parts sharing one do not stack — the second
// overwrites the first, note by note, and the loss is silent. An eleven-track file
// used to arrive as five lanes.
//
// So the properties pinned here are about IDENTITY rather than about sound:
//
//   1. n parts in, n lanes out. Named, unnamed, drums, and the same name twice.
//   2. Every part's own notes are on its own lane, unmarked by the ones beside it.
//   3. A part past the engine's six pitched lanes becomes a LAYER, and the layer is
//      declared in the mix — which is what makes it a lane to `deskBank` and to every
//      strip, renderer and arrangement row downstream.
//   4. `independent: true` on every one of them, and this is the assertion that would
//      be missed by hand: an ordinary layer is a DOUBLE, so `deskBank` fills a section
//      where it finds no notes with a copy of the lane it came from. Get this wrong
//      and a part that rests for eight bars comes back playing the lead's notes.
//
// The files are built here, byte by byte, rather than read from disk: what is being
// tested is what the importer does with a SHAPE — a type 0 file, two tracks with one
// name, a second drum kit — and a fixture folder cannot be read to find out which
// shapes are covered.
import { writeFileSync, mkdirSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bankFromMidi } from '../tools/lib/midi-import.js';
import { midiBuffer } from '../tools/lib/render-midi-bank.js';
import { deskBank, activeLanes, LANE_KEYS } from '../src/engine/lanes.js';
import { seamFor, baseLane, isLayer } from '../src/data/voices.js';
import { n } from '../src/engine/notes.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// ---- a standard MIDI file, written from a description -----------------------
const PPQ = 96;
const vlq = (n) => {
  const out = [n & 0x7f];
  let v = n >> 7;
  while (v > 0) { out.unshift((v & 0x7f) | 0x80); v >>= 7; }
  return out;
};
const be32 = (n) => [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const be16 = (n) => [(n >> 8) & 0xff, n & 0xff];
const ascii = (s) => [...s].map((c) => c.charCodeAt(0) & 0x7f);

/** `{ name, notes: [{ ch, note, at, dur }] }` — `at` and `dur` in sixteenths. */
function trackChunk(spec, { tempo = null } = {}) {
  const events = [];
  if (spec.name) events.push({ tick: 0, bytes: [0xff, 0x03, spec.name.length, ...ascii(spec.name)] });
  if (tempo) events.push({ tick: 0, bytes: [0xff, 0x51, 0x03, (tempo >> 16) & 0xff, (tempo >> 8) & 0xff, tempo & 0xff] });
  for (const nt of spec.notes || []) {
    const ch = nt.ch ?? 0;
    const on = nt.at * (PPQ / 4);
    const off = on + Math.max(1, nt.dur ?? 1) * (PPQ / 4);
    events.push({ tick: on, bytes: [0x90 | ch, nt.note, 96] });
    events.push({ tick: off, bytes: [0x80 | ch, nt.note, 0] });
  }
  events.sort((a, b) => a.tick - b.tick);
  const body = [];
  let last = 0;
  for (const e of events) { body.push(...vlq(e.tick - last), ...e.bytes); last = e.tick; }
  body.push(...vlq(0), 0xff, 0x2f, 0x00);
  return [...ascii('MTrk'), ...be32(body.length), ...body];
}

function midiFile(tracks, { format = 1, tempo = 500000 } = {}) {
  const chunks = tracks.map((t, i) => trackChunk(t, { tempo: i === 0 ? tempo : null }));
  return Buffer.from([
    ...ascii('MThd'), ...be32(6), ...be16(format), ...be16(tracks.length), ...be16(PPQ),
    ...chunks.flat(),
  ]);
}

/** A part that plays one note per beat, so every part is telling them apart. */
const run = (note, { ch = 0, from = 0, count = 8 } = {}) =>
  Array.from({ length: count }, (_, i) => ({ ch, note: note + i, at: from + i * 4, dur: 1 }));

const lanesOf = (out) => out.assignments.flatMap((a) => a.lane.split(' '));

// ---- 1. eleven parts, eleven lanes ------------------------------------------
//
// Eight melodic parts is two past every pitched lane this engine has, which is the
// case that used to lose four of them: `lead` took the overflow and each new part
// wrote over the last.
const many = bankFromMidi(midiFile([
  { name: 'Piano', notes: run(60) },
  { name: 'Strings', notes: run(48) },
  { name: 'Flute', notes: run(72) },
  { name: 'Recorder', notes: run(67) },
  { name: 'Vibraphone', notes: run(74) },
  { name: 'Guitar', notes: run(55) },
  { name: 'Sub', notes: run(31) },
  { name: 'Bells', notes: run(84) },
]), { id: 'many', from: 'many.mid' });

const manyLanes = lanesOf(many);
assert(manyLanes.length === 8 && new Set(manyLanes).size === 8,
  `eight parts land on eight lanes of their own, none shared (${manyLanes.join(', ')})`);
assert(manyLanes.filter((k) => !LANE_KEYS.includes(k)).length === 2,
  'the two parts past the engine\'s six pitched lanes become layers, not passengers');

// Every part's notes are still there, on the lane it was given. Counted off the
// SOURCE, which is what actually gets written — a bank that reads right and prints
// wrong is the bug this file is here to catch.
for (const a of many.assignments) {
  const line = many.source.split('\n').find((l) => l.trim().startsWith(`${a.lane}:`));
  const played = (line || '').match(/[A-G]#?-?\d+/g) || [];
  assert(played.length === 8, `${a.name} keeps all eight of its notes on ${a.lane}`);
}

// ---- 1b. and nothing merged inside a part either -----------------------------
//
// The same overwrite, one level down: a double-stop on a melodic lane used to keep
// whichever of the two notes was read last. Every pitched lane's step reader loops,
// so both belong there.
const stacked = bankFromMidi(midiFile([
  { name: 'Lead', notes: [{ note: 60, at: 0 }, { note: 67, at: 0 }, { note: 62, at: 4 }] },
]), { id: 'stacked', from: 'stacked.mid' });
assert(/lead: \[\[n\('C4'\), n\('G4'\)\]/.test(stacked.source),
  'two notes on one step of a lead are both kept, written as the pair they are');
assert(/leadLen: \[\[1,1\],/.test(stacked.source),
  'and each of the two carries its own length, the way the engine reads them');

// ---- 2. the same name twice --------------------------------------------------
const twins = bankFromMidi(midiFile([
  { name: 'Lead', notes: run(60) },
  { name: 'Lead', notes: run(48) },
  { name: 'Bass', notes: run(36) },
]), { id: 'twins', from: 'twins.mid' });
assert(lanesOf(twins).join(',') === 'lead,lead2,bass',
  'two tracks called Lead are the lead and a layer of it, in file order');

// A part that ASKS for a lane gets it, even when an earlier unnamed part would have
// taken it. Placing in file order used to hand `bass` to whatever came first.
const named = bankFromMidi(midiFile([
  { name: 'Untitled', notes: run(36) },              // low: would claim bass on its own
  { name: 'Bass', notes: run(38) },
]), { id: 'named', from: 'named.mid' });
assert(lanesOf(named)[1] === 'bass',
  'a part that names its lane gets it, whatever an unnamed part ahead of it wanted');

// ---- 3. a type 0 file is not one part ----------------------------------------
const flat = bankFromMidi(midiFile([{
  name: 'All',
  notes: [...run(60, { ch: 0 }), ...run(43, { ch: 1 }), ...run(72, { ch: 2 })],
}], { format: 0 }), { id: 'flat', from: 'flat.mid' });
assert(new Set(lanesOf(flat)).size === 3,
  'a type 0 file splits on the channel — three instruments, three lanes, not one');

// ---- 4. a second drum kit ----------------------------------------------------
const kits = bankFromMidi(midiFile([
  { name: 'Drums', notes: [{ ch: 9, note: 36, at: 0 }, { ch: 9, note: 38, at: 4 }] },
  { name: 'Perc', notes: [{ ch: 9, note: 36, at: 2 }, { ch: 9, note: 38, at: 6 }] },
  { name: 'Lead', notes: run(60) },
]), { id: 'kits', from: 'kits.mid' });
assert(lanesOf(kits).join(',') === 'kick,snare,kick2,snare2,lead',
  'a second drum part strikes a second kit rather than sharing the first');
assert(!kits.layers.some((l) => l.key === 'drums'),
  '"drums" is the name of a decision, not of a lane, and never reaches the mix');

// ---- 5. what a layer is declared as ------------------------------------------
for (const l of many.layers.concat(kits.layers)) {
  assert(l.independent === true, `${l.key} is declared independent — it carries its own part`);
  assert(LANE_KEYS.includes(l.from) && l.from === baseLane(l.key),
    `${l.key} names the lane it is a copy of`);
  assert(!!seamFor(l.key) && isLayer(l.key),
    `${l.key} resolves to a seam of its own, so its voice cannot reach into ${l.from}`);
}
assert(kits.layers.find((l) => l.key === 'kick2')?.label === 'Perc kick',
  'a layer wears the MIDI track\'s own name on the strip');

// ---- 6. through deskBank, which is what makes it a lane ----------------------
//
// The one that would be missed by reading the output: a layer that RESTS through a
// section must rest, not inherit. Two parts on the lead, the second playing only in
// the first two bars, so the second section has no `lead2` in it at all.
const resting = bankFromMidi(midiFile([
  { name: 'Lead', notes: [...run(60, { count: 8 }), ...run(60, { from: 32, count: 8 })] },
  { name: 'Lead', notes: run(48, { count: 8 }) },
]), { id: 'resting', from: 'resting.mid' });

const temp = mkdtempSync(join(tmpdir(), 'mash-midi-import-'));
try {
  const dir = join(temp, 'src/data/imported');
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(temp, 'src/engine'), { recursive: true });
  // The generated module imports the repository's note helpers by relative path, so
  // one copy of that file is what makes the source genuinely loadable from here.
  copyFileSync(join(process.cwd(), 'src/engine/notes.js'), join(temp, 'src/engine/notes.js'));
  const file = join(dir, 'resting.js');
  writeFileSync(file, resting.source);
  const mod = await import(pathToFileURL(file).href);

  assert(mod.bank && mod.id === 'resting' && mod.group === 'imported',
    'an import is written in the shape every other song file has — id, title, bank');
  assert(mod.mix?.layers?.length === 1 && mod.mix.layers[0].key === 'lead2',
    'the layer is declared in the mix, where a layer belongs, not in the composition');

  const desk = deskBank(mod.bank, mod.mix);
  assert(activeLanes(desk).some((l) => l.key === 'lead2'),
    'deskBank turns the declaration into a lane, so the part gets a strip');
  const section = desk.sections[desk.order[1]];
  assert(section.lead2.every((v) => v == null),
    'a layer that rests through a section rests — it does not inherit the lead\'s notes');
  assert(desk.sections[desk.order[0]].lead2.some((v) => v != null),
    'and the section it does play in still holds its own part');
  assert(JSON.stringify(desk.sections[desk.order[0]].lead2)
    !== JSON.stringify(desk.sections[desk.order[0]].lead),
    'the two parts are two parts — neither is a copy of the other');
} finally {
  rmSync(temp, { recursive: true, force: true });
}

// ---- 7. and out again --------------------------------------------------------
//
// The way back. A song exports to a DAW and comes home edited, so a layer that the
// export side did not know about would be a part that survives the import and then
// disappears the first time the song goes out — the same loss, one door along.
const roundTrip = bankFromMidi(Buffer.from(midiBuffer({
  bpm: 120,
  lead: [n('C4'), ...new Array(31).fill(null)],
  lead2: [n('G4'), ...new Array(31).fill(null)],
  bass: [n('C2'), ...new Array(31).fill(null)],
  kick: [true, ...new Array(31).fill(false)],
  kick2: [false, true, ...new Array(30).fill(false)],
  snare: [false, false, false, false, true, ...new Array(27).fill(false)],
}, { title: 'round trip' }).buffer), { id: 'round-trip', from: 'round-trip.mid' });

const back = lanesOf(roundTrip);
assert(back.includes('lead') && back.includes('lead2'),
  `a layer exports as "Lead 2" and comes home to lead2 (${back.join(', ')})`);
assert(back.includes('kick') && back.includes('kick2') && back.includes('snare'),
  'a drum layer makes the trip too — and the kit it came from stays one kit');

console.log(failed ? '\nMIDI IMPORT: FAILED' : '\nMIDI IMPORT: PASSED');
process.exit(failed ? 1 : 0);
