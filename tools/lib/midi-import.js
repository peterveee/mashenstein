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
// The CLI is tools/import-midi.js; the desk posts files here through the mixer.
import { parseMidi, tempoOf, notesOf } from './midi-parse.js';
import { LANE_KEYS } from '../../src/engine/lanes.js';

const STEPS_PER_BLOCK = 32;                    // two bars of 4/4 in sixteenths
const PERC = new Set(['kick', 'snare', 'clap', 'rim', 'hats', 'ohats', 'crash']);
const CHORDAL = new Set(['chords', 'organChords']);

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
 * Turn a MIDI file into a bank, as source.
 *
 * @param {Buffer} buf              the .mid
 * @param {object} [opts]
 * @param {string} [opts.name]      what to call the song (and its export)
 * @param {number} [opts.bpm]       override the file's tempo
 * @param {string} [opts.map]       "Track name:lane,..." to place tracks by hand
 * @param {string} [opts.from]      the filename, for the comment at the top
 * @returns {{source, constName, title, bpm, assignments, blocks, sections, order,
 *            moved, foreignDrums, unknownLanes}}
 */
export function bankFromMidi(buf, { name, bpm: bpmOverride, map = '', from = 'a MIDI file' } = {}) {
const parsed = parseMidi(buf);
const fileBpm = tempoOf(parsed);
const bpm = Math.round(Number(bpmOverride) || fileBpm || 120);
const ticksPerStep = parsed.ppq / 4;
const title = String(name || from.replace(/\.midi?$/i, '')).toUpperCase();
const constName = title.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase() || 'IMPORTED';

const manual = {};
for (const pair of String(map).split(',').filter(Boolean)) {
  const [nm, lane] = pair.split(':');
  if (lane) manual[nm.trim().toLowerCase()] = lane.trim();
}

// ---- decide what each track is ---------------------------------------------
const taken = new Set();
const MELODIC_FALLBACK = ['lead', 'leadHarm', 'twinkle', 'bass'];
const notesByTrack = parsed.tracks.map((t) => ({ track: t, notes: notesOf(t) }))
  .filter((x) => x.notes.length);

const assignments = [];
for (const { track, notes } of notesByTrack) {
  const name = (track.name || '').trim();
  const key = name.toLowerCase();
  const drums = notes.every((nt) => nt.ch === 9) || /drum|perc/i.test(name);
  let lane = manual[key] || (drums ? 'drums' : NAME_TO_LANE[key]);
  if (lane && lane !== 'drums' && !LANE_KEYS.includes(lane)) {
    throw new Error(`unknown lane "${lane}" — try one of: ${LANE_KEYS.join(', ')}`);
  }
  if (!lane) {
    // No name we recognise: decide by what the part actually does. Anything that
    // plays two notes at once is a chord part, anything low is the bass, and the
    // rest fill the melodic lanes in order.
    const byStart = new Map();
    for (const nt of notes) byStart.set(nt.on, (byStart.get(nt.on) || 0) + 1);
    const polyphonic = [...byStart.values()].filter((c) => c > 1).length > notes.length * 0.15;
    const median = notes.map((nt) => nt.note).sort((a, b) => a - b)[Math.floor(notes.length / 2)];
    lane = polyphonic ? 'chords'
      : median < 48 && !taken.has('bass') ? 'bass'
      : MELODIC_FALLBACK.find((l) => !taken.has(l)) || 'lead';
  }
  if (lane !== 'drums') taken.add(lane);
  assignments.push({ name: name || '(unnamed)', lane, notes });
}
if (!assignments.length) throw new Error('there are no notes in that file');

// ---- quantise onto the sixteenth grid --------------------------------------
const lanes = new Map();                       // lane -> step -> value
const put = (lane, step, value) => {
  if (!lanes.has(lane)) lanes.set(lane, new Map());
  const at = lanes.get(lane);
  if (CHORDAL.has(lane)) {
    const held = at.get(step) || [];
    if (!held.includes(value)) held.push(value);
    at.set(step, held);
  } else {
    at.set(step, value);                       // last note on a step wins
  }
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
      const lane = DRUM_LANE[nt.note];
      if (!lane) { foreignDrums.set(nt.note, (foreignDrums.get(nt.note) || 0) + 1); continue; }
      if (!EXACT_DRUM.has(nt.note)) {
        foreignDrums.set(`${nt.note}->${lane}`, (foreignDrums.get(`${nt.note}->${lane}`) || 0) + 1);
      }
      put(lane, step, true);
    } else {
      put(a.lane, step, nt.note);
    }
  }
}

// ---- slice into two-bar blocks ---------------------------------------------
const blockCount = Math.max(1, Math.ceil((lastStep + 1) / STEPS_PER_BLOCK));
const laneKeys = [...lanes.keys()].sort((a, b) => LANE_KEYS.indexOf(a) - LANE_KEYS.indexOf(b));

/** One lane's 32 steps of a block, as the shorthand the banks are written in. */
function tokens(lane, block) {
  const at = lanes.get(lane);
  const out = [];
  let any = false;
  for (let i = 0; i < STEPS_PER_BLOCK; i++) {
    const v = at.get(block * STEPS_PER_BLOCK + i);
    if (v === undefined) { out.push('.'); continue; }
    any = true;
    if (PERC.has(lane)) out.push('C1');
    else if (CHORDAL.has(lane)) out.push(chordName(v) || `[${v.map(noteName).join(' ')}]`);
    else out.push(noteName(v));
  }
  return any ? out : null;
}

const blocks = [];
for (let b = 0; b < blockCount; b++) {
  const section = {};
  for (const lane of laneKeys) {
    const t = tokens(lane, b);
    if (t) section[lane] = t;
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
  // A chord that has no name is written as its own notes; those need n(), so the
  // whole lane goes out as an array rather than a chordSeq string.
  if (CHORDAL.has(lane) && t.some((x) => x.startsWith('['))) {
    const cells = t.map((x) => (x === '.' ? 'null'
      : x.startsWith('[') ? `[${x.slice(1, -1).split(' ').map((nm) => `n('${nm}')`).join(', ')}]`
      : `chord('${x}')`));
    return `      ${lane}: [${cells.join(', ')}],`;
  }
  if (CHORDAL.has(lane)) return `      ${lane}: chordSeq('${bars(t)}'),`;
  if (PERC.has(lane)) return `      ${lane}: seq('${bars(t)}').map((v) => !!v),`;
  return `      ${lane}: seq('${bars(t)}'),`;
};

const body = sections.map((section, i) => {
  const lines = Object.entries(section).map(([lane, t]) => laneLine(lane, t));
  return `    // section ${i}\n    {\n${lines.join('\n')}\n    },`;
}).join('\n');

// Imported from what was actually written, not from a flag set three branches away:
// a lane of mixed named and unnamed chords used to emit chord() without importing it,
// and the file only failed when something tried to load it.
const HELPERS = ['seq', 'chordSeq', 'chord', 'n'];
const imports = HELPERS.filter((h) => new RegExp(`\\b${h}\\(`).test(body));

const source = `// ${title} — imported from ${from} by tools/import-midi.js.
//
// Quantised to sixteenths and sliced into two-bar blocks; identical blocks share a
// section. Timbre, glissando runs and per-section engine overrides are not in a MIDI
// file, so they are not here either — set those by hand.
import { ${imports.join(', ')} } from '../../engine/notes.js';

export const ${constName} = {
  bpm: ${bpm},
  musicTrim: 0.7,
  sections: [
${body}
  ],
  order: [${order.join(', ')}],
};
`;


  return {
    source, constName, title, bpm, blocks: blockCount, sections: sections.length, order,
    assignments: assignments.map((a) => ({ name: a.name, lane: a.lane, notes: a.notes.length })),
    moved, foreignDrums: [...foreignDrums.entries()].map(([k, c]) => `${k} x${c}`),
    unknownLanes: laneKeys.filter((l) => !LANE_KEYS.includes(l)),
    fromFileTempo: fileBpm != null,
    ppq: parsed.ppq, format: parsed.format,
  };
}
