// MIDI in: a .mid file becomes a music bank.
//
// The export side has existed for a while (tools/lib/render-midi-bank.js). This is
// the way back: quantise to the sequencer's sixteenth grid, slice into the two-bar
// blocks the song form is built from, fold identical blocks into sections, and print
// the result in the same `seq('A2 . A2 .')` shorthand the banks are authored in —
// not a wall of numbers. What comes out is source: readable, editable, diffable.
//
// A round trip is deliberately close but not lossless, and cannot be: the engine's
// timbres, glissando runs and per-section overrides have no MIDI equivalent, and
// anything off the sixteenth grid moves onto it. What survives is the notes.
//
// ---- one part in, one part out ----------------------------------------------
//
// NOTHING IS MERGED. Two MIDI tracks never share a lane, because a lane holds one
// value per step: the second part to reach it does not stack, it OVERWRITES, and a
// ten-track file used to arrive as five lanes with five parts silently eaten. The
// engine has six pitched lanes, so anything past them becomes a LAYER — `lead2`,
// `lead3` — which is an ordinary lane everywhere downstream (see the layer notes in
// src/engine/lanes.js) with its own strip, fader and voice.
//
// A layer arrives on a STARTER preset, not on the sound the part had in the DAW, which
// no MIDI file carries: a square on anything pitched, the Tom on a piece of kit
// (`defaultAddedVoice` in src/data/voices.js). Neutral rather than absent — an unvoiced
// layer used to arrive silent, so a fifteen-part import was fourteen strips of lit steps
// making no sound, and a drum starter on a lead was worse still. The import summary
// names the layers so the parts to re-voice are on the page rather than found by ear.
//
// The CLI is tools/import-midi.js; the desk posts files here through the mixer.
import { parseMidi, tempoOf, notesOf } from './midi-parse.js';
import { LANE_KEYS, lenKey, perNoteLengthLane } from '../../src/engine/lanes.js';
import { baseLane, seamFor } from '../../src/data/voices.js';
import { deskTail } from './song-source.js';

const STEPS_PER_BLOCK = 32;                    // two bars of 4/4 in sixteenths
const PERC_BASES = new Set(['kick', 'snare', 'clap', 'rim', 'hats', 'ohats', 'crash', 'tom']);
const CHORD_BASES = new Set(['chords', 'organChords']);
// Layers are lanes, so every test about what a lane HOLDS asks the base: `chords3`
// spells chords and `snare2` is a boolean, the same as the lanes they are copies of.
const isPerc = (lane) => PERC_BASES.has(baseLane(lane));
const isChordal = (lane) => CHORD_BASES.has(baseLane(lane));

// The names tools/render-midi-bank.js writes, so our own exports come home to the
// lanes they left from.
const NAME_TO_LANE = {
  bass: 'bass', lead: 'lead', 'lead harmony': 'leadHarm', chords: 'chords',
  organ: 'organChords', twinkle: 'twinkle', 'electro fx': 'electroFx',
  'gliss fx': 'gliss', 'organ swoop': 'organSwoop', vox: 'vox', shout: 'shout',
  'key gliss': 'keyGliss', 'organ gliss': 'organGliss',
};

// General MIDI percussion. The exact numbers we write come back exactly; the rest of
// the GM kit lands on the nearest lane this game actually has, and the CLI says so
// rather than dropping notes quietly.
const DRUM_LANE = {
  35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 39: 'clap', 40: 'snare',
  41: 'snare', 42: 'hats', 43: 'snare', 44: 'hats', 45: 'snare', 46: 'ohats',
  47: 'snare', 48: 'snare', 49: 'crash', 50: 'snare', 51: 'hats', 52: 'crash',
  53: 'hats', 55: 'crash', 57: 'crash', 59: 'hats',
};
const EXACT_DRUM = new Set([36, 38, 37, 39, 42, 46, 49]);

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (n) => `${NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;

// The chord qualities chordSeq() can spell. Anything else is written out as its
// actual notes instead of being forced into the nearest name.
const CHORD_IV = {
  maj: [0, 4, 7], min: [0, 3, 7], 7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], 9: [0, 4, 7, 14],
};
function chordName(notes) {
  const sorted = [...notes].sort((a, b) => a - b);
  const root = sorted[0];
  const iv = sorted.map((x) => x - root);
  for (const [quality, want] of Object.entries(CHORD_IV)) {
    if (iv.length === want.length && iv.every((x, i) => x === want[i])) {
      return `${noteName(root)}${quality === 'maj' ? '' : quality}`;
    }
  }
  return null;
}

/**
 * One part per MIDI track — and per CHANNEL within a track.
 *
 * A type 0 file is one MTrk carrying all sixteen channels, so reading it a track at
 * a time is reading the whole arrangement as a single part: bass, drums and melody
 * collapsed onto one lane before anything else gets a say. A type 1 file can do the
 * same thing on a smaller scale when one track was written with two channels on it.
 *
 * Both are the same fix — split on the channel, which is the only thing in a MIDI
 * file that says "this is a different instrument" when the track structure does not.
 * Single-channel tracks, which is nearly all of them, come through untouched and
 * keep their own name.
 */
function partsOf(parsed) {
  const parts = [];
  for (const track of parsed.tracks) {
    const notes = notesOf(track);
    if (!notes.length) continue;
    const name = (track.name || '').trim();
    const channels = [...new Set(notes.map((nt) => nt.ch))].sort((a, b) => a - b);
    if (channels.length < 2) { parts.push({ name, notes }); continue; }
    for (const ch of channels) {
      parts.push({
        name: `${name || 'track'} ch${ch + 1}`,
        notes: notes.filter((nt) => nt.ch === ch),
      });
    }
  }
  return parts;
}

// The six pitched lanes, ordered by what an unnamed part most wants — but ALL of
// them, every time. Every lane in this engine can hold a chord (see `polyLane`), so a
// tune sitting on `chords` is a tune, and a lane that already has a voice is a better
// home for the fifth part than a layer that has none. The pools differ only in which
// end they start from; a part reaches a layer when all six are spoken for and not
// before.
const PITCHED = ['lead', 'leadHarm', 'twinkle', 'bass', 'chords', 'organChords'];
const first = (...front) => [...front, ...PITCHED.filter((l) => !front.includes(l))];
const MELODIC_LANES = PITCHED;
const CHORD_LANES = first('chords', 'organChords');
const BASS_LANES = first('bass');

/**
 * Turn a MIDI file into a bank, as source.
 *
 * @param {Buffer} buf              the .mid
 * @param {object} [opts]
 * @param {string} [opts.id]        the track id the bank will be registered under
 * @param {string} [opts.name]      what to call the song
 * @param {number} [opts.bpm]       override the file's tempo
 * @param {string} [opts.map]       "Track name:lane,..." to place tracks by hand
 * @param {string} [opts.from]      the filename, for the comment at the top
 * @returns {{source, id, title, bpm, assignments, layers, blocks, sections, order,
 *            moved, foreignDrums, unknownLanes}}
 */
export function bankFromMidi(buf, {
  id: wantedId, name, bpm: bpmOverride, map = '', from = 'a MIDI file',
} = {}) {
const parsed = parseMidi(buf);
const fileBpm = tempoOf(parsed);
const bpm = Math.round(Number(bpmOverride) || fileBpm || 120);
const ticksPerStep = parsed.ppq / 4;
const title = String(name || from.replace(/\.midi?$/i, '')).toUpperCase();
const id = String(wantedId || from.replace(/\.midi?$/i, ''))
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'imported';

const manual = {};
for (const pair of String(map).split(',').filter(Boolean)) {
  const [nm, lane] = pair.split(':');
  if (lane) manual[nm.trim().toLowerCase()] = lane.trim();
}

// ---- decide what each track is ---------------------------------------------
//
// Every part gets a key of its own. `claim` hands back the lane if it is free and a
// layer of it — `lead2`, `lead3` — if it is not, so the answer to "where does the
// fifth melodic part go" is never "on top of the first".
const taken = new Set();
const claim = (want) => {
  // A key that is free is a key you get — including a LAYER key asked for by name,
  // which is how `Lead 2` comes back from a DAW onto `lead2` rather than onto
  // whatever the heuristics would have picked for it.
  if (!taken.has(want) && (LANE_KEYS.includes(want) || seamFor(want))) {
    taken.add(want);
    return want;
  }
  const base = baseLane(want);
  if (!taken.has(base)) { taken.add(base); return base; }
  for (let i = 2; i <= 64; i++) {
    const key = `${base}${i}`;
    // `seamFor` is the arbiter of what can be a layer: it is what gives the key its
    // own voice, gain and length, and a key it declines is a strip that plays nothing.
    if (taken.has(key) || LANE_KEYS.includes(key) || !seamFor(key)) continue;
    taken.add(key);
    return key;
  }
  return base;                                 // 64 copies of one lane: give up quietly
};

const parts = partsOf(parsed);
if (!parts.length) throw new Error('there are no notes in that file');

// Named parts are placed FIRST, in one pass of their own, so a file that says which
// lane it wants gets it. Placing in file order instead let an unnamed track ahead of
// a "Bass" take the bass lane and push the real one onto a layer.
const wanted = parts.map(({ name: partName, notes }) => {
  const key = partName.toLowerCase();
  const drums = notes.every((nt) => nt.ch === 9) || /drum|perc/i.test(partName);
  // `Lead 2` is what the export side calls a layer of the lead, so it is read back as
  // one. Only a trailing number on a name we already know — "Piano 2" is still just an
  // unnamed part, and guessing otherwise would put it on a silent strip.
  const numbered = /^(.*?)\s*(\d+)$/.exec(key);
  const asLayer = numbered && NAME_TO_LANE[numbered[1].trim()]
    ? `${NAME_TO_LANE[numbered[1].trim()]}${numbered[2]}`
    : null;
  const lane = manual[key] || (drums ? 'drums' : NAME_TO_LANE[key] || asLayer);
  if (lane && lane !== 'drums' && !LANE_KEYS.includes(lane) && !seamFor(lane)) {
    throw new Error(`unknown lane "${lane}" — try one of: ${LANE_KEYS.join(', ')}`);
  }
  return lane || null;
});

// A drum part is not one lane but a KIT — its notes fan out over kick, snare, hats
// and the rest — so its lanes are claimed piece by piece, as they are struck, down in
// the note loop. Claiming per PIECE rather than per part is what keeps our own export
// coming home: it writes one MTrk per kit piece, so a part-wide ordinal would read
// four drum tracks as four kits and land the snare on `snare2`.
const assignments = parts.map(({ name: partName, notes }, i) => ({
  name: partName || '(unnamed)',
  lane: wanted[i] === 'drums' ? 'drums' : null,
  ...(wanted[i] === 'drums' ? { kitMap: new Map() } : {}),
  notes,
}));

// Pass one: everything that ASKED for a lane, so a file that names its parts is
// taken at its word. In file order among themselves, which is how two tracks both
// called "Lead" decide which is the lead and which is the layer.
for (let i = 0; i < assignments.length; i++) {
  if (wanted[i] && wanted[i] !== 'drums') assignments[i].lane = claim(wanted[i]);
}
// Pass two: the rest, onto whatever the first pass left.
for (let i = 0; i < assignments.length; i++) {
  if (assignments[i].lane) continue;
  const { notes } = assignments[i];
  // Decide by what the part actually does. Anything that plays two notes at once is
  // a chord part, anything low is the bass, and the rest fill the melodic lanes.
  const byStart = new Map();
  for (const nt of notes) byStart.set(nt.on, (byStart.get(nt.on) || 0) + 1);
  const polyphonic = [...byStart.values()].filter((c) => c > 1).length > notes.length * 0.15;
  const median = notes.map((nt) => nt.note).sort((a, b) => a - b)[Math.floor(notes.length / 2)];
  const pool = polyphonic ? CHORD_LANES : median < 48 ? BASS_LANES : MELODIC_LANES;
  assignments[i].lane = claim(pool.find((l) => !taken.has(l)) || pool[0]);
}

// ---- quantise onto the sixteenth grid --------------------------------------
//
// A step on a pitched lane holds a LIST, whatever lane it is. It used to hold a list
// on `chords` and a single value everywhere else, so a part with a double-stop in it
// arrived on the lead with one of the two notes gone — the same silent overwrite that
// used to happen between tracks, happening inside one. Every pitched lane's step
// reader loops (see `polyLane` in src/data/voices.js); the list is collapsed back to
// a bare note at print time wherever it holds only one, so the ordinary line is still
// `lead: seq('C4 . E4 .')`.
const lanes = new Map();                       // lane -> step -> true | [{note, len}]
const stepsOf = (lane) => {
  if (!lanes.has(lane)) lanes.set(lane, new Map());
  return lanes.get(lane);
};
const put = (lane, step, value, len = null) => {
  const at = stepsOf(lane);
  if (isPerc(lane)) { at.set(step, true); return; }
  const pairs = at.get(step) || [];
  const hit = pairs.find((p) => p.note === value);
  if (hit) hit.len = Math.max(1, len ?? hit.len ?? 1);
  else pairs.push({ note: value, len: Math.max(1, len ?? 1) });
  pairs.sort((a, b) => a.note - b.note);
  at.set(step, pairs);
};

let lastStep = 0;
let moved = 0;
const foreignDrums = new Map();
for (const a of assignments) {
  for (const nt of a.notes) {
    const exact = nt.on / ticksPerStep;
    const step = Math.round(exact);
    if (Math.abs(exact - step) > 0.02) moved++;
    lastStep = Math.max(lastStep, step);
    if (a.lane === 'drums') {
      const base = DRUM_LANE[nt.note];
      if (!base) { foreignDrums.set(nt.note, (foreignDrums.get(nt.note) || 0) + 1); continue; }
      if (!EXACT_DRUM.has(nt.note)) {
        foreignDrums.set(`${nt.note}->${base}`, (foreignDrums.get(`${nt.note}->${base}`) || 0) + 1);
      }
      // Claimed as it is struck rather than up front: a part that only plays a kick
      // should not conjure six silent strips for the rest of a kit it never touches.
      // A second part reaching for a piece the first already has gets `kick2`.
      if (!a.kitMap.has(base)) a.kitMap.set(base, claim(base));
      put(a.kitMap.get(base), step, true);
    } else {
      const off = Math.round((nt.off ?? nt.on) / ticksPerStep);
      put(a.lane, step, nt.note, Math.max(1, off - step));
    }
  }
}

// ---- slice into two-bar blocks ---------------------------------------------
const blockCount = Math.max(1, Math.ceil((lastStep + 1) / STEPS_PER_BLOCK));
// A layer sits with the lane it is a copy of, in ordinal order — `lead`, `lead2`,
// `lead3`, then the next lane. The same rule `deskLanes` sorts the strips by, so the
// file reads in the order the desk shows it.
const laneRank = (key) => {
  const base = baseLane(key);
  const ordinal = key === base ? 1 : (parseInt(key.slice(base.length), 10) || 0);
  return LANE_KEYS.indexOf(base) * 100 + ordinal;
};
const laneKeys = [...lanes.keys()].sort((a, b) => laneRank(a) - laneRank(b));

/** One lane's 32 steps of a block, as the shorthand the banks are written in. */
function tokens(lane, block) {
  const at = lanes.get(lane);
  const out = [];
  let any = false;
  for (let i = 0; i < STEPS_PER_BLOCK; i++) {
    const v = at.get(block * STEPS_PER_BLOCK + i);
    if (v === undefined) { out.push('.'); continue; }
    any = true;
    if (isPerc(lane)) { out.push('C1'); continue; }
    const notes = v.map((p) => p.note);
    // A chord NAME only on the lanes that are spelled in chords. `[C4 E4 G4]` on a
    // lead is three notes that happen to be a triad, and writing it as `C4` there
    // would print one of them and play one of them.
    if (isChordal(lane)) out.push(chordName(notes) || `[${notes.map(noteName).join(' ')}]`);
    else if (notes.length > 1) out.push(`[${notes.map(noteName).join(' ')}]`);
    else out.push(noteName(notes[0]));
  }
  return any ? out : null;
}

// Lengths mirror the notes exactly: an array where the step holds more than one, a
// bare number where it holds one — the shape `stepLen`/`toneLen` in the engine read,
// and the shape the hand-written banks use.
function blockLengths(lane, block) {
  if (!perNoteLengthLane(lane)) return null;
  const at = lanes.get(lane);
  const out = [];
  let any = false;
  for (let i = 0; i < STEPS_PER_BLOCK; i++) {
    const v = at.get(block * STEPS_PER_BLOCK + i);
    if (v === undefined || v === true) { out.push(null); continue; }
    out.push(isChordal(lane) || v.length > 1 ? v.map((p) => p.len) : v[0].len);
    any = true;
  }
  return any ? out : null;
}

const blocks = [];
for (let b = 0; b < blockCount; b++) {
  const section = {};
  for (const lane of laneKeys) {
    const t = tokens(lane, b);
    if (!t) continue;
    section[lane] = t;
    const lens = blockLengths(lane, b);
    if (lens) section[lenKey(lane)] = lens;
  }
  blocks.push(section);
}

// Identical blocks become one section played twice, which is how the banks are
// written by hand and what makes a song form readable at a glance.
const sections = [];
const order = [];
const seen = new Map();
for (const block of blocks) {
  const key = JSON.stringify(block);
  if (!seen.has(key)) { seen.set(key, sections.length); sections.push(block); }
  order.push(seen.get(key));
}

// ---- print it as source ----------------------------------------------------
const bars = (t) => `${t.slice(0, 16).join(' ')} | ${t.slice(16).join(' ')}`;
const laneLine = (lane, t) => {
  // Notes stacked on one step are written as their own notes, which need n(), so the
  // whole lane goes out as an array rather than a seq/chordSeq string. True of a chord
  // with no name and equally of a double-stop on a lead: both are a step holding more
  // than one pitch, and the shorthand has no way to say that.
  if (t.some((x) => x.startsWith('['))) {
    const cells = t.map((x) => (x === '.' ? 'null'
      : x.startsWith('[') ? `[${x.slice(1, -1).split(' ').map((nm) => `n('${nm}')`).join(', ')}]`
      : isChordal(lane) ? `chord('${x}')` : `n('${x}')`));
    return `      ${lane}: [${cells.join(', ')}],`;
  }
  if (isChordal(lane)) return `      ${lane}: chordSeq('${bars(t)}'),`;
  if (isPerc(lane)) return `      ${lane}: seq('${bars(t)}').map((v) => !!v),`;
  return `      ${lane}: seq('${bars(t)}'),`;
};

const body = sections.map((section, i) => {
  const lines = Object.entries(section).map(([lane, t]) => (
    lane.endsWith('Len')
      ? `      ${lane}: ${JSON.stringify(t)},`
      : laneLine(lane, t)
  ));
  return `    // section ${i}\n    {\n${lines.join('\n')}\n    },`;
}).join('\n');

// Imported from what was actually written, not from a flag set three branches away:
// a lane of mixed named and unnamed chords used to emit chord() without importing it,
// and the file only failed when something tried to load it.
const HELPERS = ['seq', 'chordSeq', 'chord', 'n'];
const imports = HELPERS.filter((h) => new RegExp(`\\b${h}\\(`).test(body));

// ---- the layers, and the mix that declares them -----------------------------
//
// A layer is declared in the MIX, never in the composition — that is the rule
// `deskBank` is built on and this does not bend it. The NOTES are the song's, written
// into the bank above like any other lane; the entry below is what makes them a lane
// the desk, the game and the renderers can see.
//
// `independent: true` on every one of them, and it is load-bearing: an ordinary layer
// is a DOUBLE, and `deskBank` fills any section where it finds no notes with a copy of
// the lane it came from. A layer that carries a part of its own would gain the lead's
// notes in every section it happens to rest through.
const layers = [];
for (const a of assignments) {
  // A drum part that struck nothing this engine has a lane for has no keys at all —
  // `drums` is the name of a decision, not of a lane, and must never reach a mix.
  for (const key of a.kitMap ? [...a.kitMap.values()] : [a.lane]) {
    if (LANE_KEYS.includes(key)) continue;
    layers.push({
      key,
      from: baseLane(key),
      independent: true,
    });
  }
}
const mix = layers.length ? { layers } : null;

const source = `// ${title} — imported from ${from} by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
//
// ${parts.length} part${parts.length === 1 ? '' : 's'} in the file, ${laneKeys.length} lane${laneKeys.length === 1 ? '' : 's'} here — nothing was merged onto anything else.${layers.length ? `
// ${layers.length} of them ${layers.length === 1 ? 'is a layer' : 'are layers'} (${layers.map((l) => l.key).join(', ')}): real lanes with the
// notes below, declared in the mix at the foot of this file. Each starts on the
// neutral starter preset for its lane — a square if it is pitched — until you choose
// one on the desk. A layer is a preset and nothing else.` : ''}
import { ${imports.join(', ')} } from '../../engine/notes.js';

export const id = ${JSON.stringify(id)};
export const title = ${JSON.stringify(title)};
export const slug = ${JSON.stringify(id)};
export const group = "imported";

export const bank = {
  bpm: ${bpm},
  musicTrim: 0.7,
  sections: [
${body}
  ],
  order: [${order.join(', ')}],
};

${deskTail({ mix })}`;


  return {
    source, id, title, bpm, blocks: blockCount, sections: sections.length, order,
    assignments: assignments.map((a) => ({
      name: a.name,
      // A drum part is a kit, so what it became is a list of lanes rather than one.
      lane: a.kitMap
        ? [...a.kitMap.values()].sort((x, y) => laneRank(x) - laneRank(y)).join(' ') || 'drums'
        : a.lane,
      notes: a.notes.length,
    })),
    layers, mix,
    moved, foreignDrums: [...foreignDrums.entries()].map(([k, c]) => `${k} x${c}`),
    unknownLanes: laneKeys.filter((l) => !LANE_KEYS.includes(l) && !seamFor(l)),
    fromFileTempo: fileBpm != null,
    ppq: parsed.ppq, format: parsed.format,
  };
}
