// GENER8, in the game — the riff grid. 3 Oct 2026.
//
// What the jukebox's piano roll edits: two bars, one note at a time, G4 to C6 (it was A4 to
// A5 until Peter, 5 Oct 2026), in one of two modes (Peter, 3 Oct 2026):
//
//   SIMPLE    eighth notes on the eleven notes of A natural minor in range — no wrong notes
//   ADVANCED  sixteenth notes on all eighteen semitones
//
// One note per column keeps it a tune rather than a chord: tapping a second note into a
// column moves the one that was there. A grid is an array of row indices, -1 a rest.
//
// The grid turns into the same riff shape the desk's generator reads off a song
// (tools/lib/banger/riff.js), so the jukebox and the desk make their songs the same way.

// Pitches are counted in semitones above A4 throughout (G4 is -2); a grid row is an index
// into its mode's `semis`, the bottom row 0.
const NAMES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const nameOf = (semi) => NAMES[((semi % 12) + 12) % 12];
const octaveOf = (semi) => Math.floor((69 + semi) / 12) - 1;
/** The lowest and highest notes on the grid: G4 and C6. */
const LOWEST = -2;
const HIGHEST = 15;
/** A natural minor (also C major), in semitones above A4, G4 to C6. */
const SCALE = [-2, 0, 2, 3, 5, 7, 8, 10, 12, 14, 15];
const CHROMATIC = Array.from({ length: HIGHEST - LOWEST + 1 }, (_, i) => LOWEST + i);
/** The ADVANCED row of a semitone above A4. */
export const advancedRow = (semi) => semi - LOWEST;

export const RIFF_MODES = Object.freeze({
  simple: Object.freeze({ id: 'simple', label: 'SIMPLE', steps: 16, len: 2, semis: Object.freeze(SCALE) }),
  advanced: Object.freeze({ id: 'advanced', label: 'ADVANCED', steps: 32, len: 1, semis: Object.freeze(CHROMATIC) }),
});
export const modeOf = (id) => RIFF_MODES[id] || RIFF_MODES.simple;
export const RIFF_BPM = 120;

/**
 * What a stored grid's numbers mean. 1: the first day's eight scale notes in eighths
 * (SIMPLE, A4 to A5). 2: semitones in eighths, the afternoon's only grid. 3: a grid per
 * mode, A4 to A5. 4: a grid per mode, G4 to C6 — the same notes sit a row or two higher.
 * `upgradeDraft` / `upgradeRecipe` read any of them.
 */
export const RIFF_VERSION = 4;

/** Rows up from version 3 (and 1) to today: G4 under A4 in SIMPLE, G4 and G#4 in ADVANCED. */
const V3_SHIFT = { simple: SCALE.indexOf(0), advanced: advancedRow(0) };
const fromV3 = (notes, mode) => (Array.isArray(notes) ? notes.map((n) => (Number.isInteger(n) && n >= 0 ? n + V3_SHIFT[modeOf(mode).id] : -1)) : notes);

/** -1 is a rest. The SIMPLE tune the grid starts with, so GENER8 works on the first visit. */
export const DEFAULT_SIMPLE = Object.freeze(fromV3([0, -1, 2, -1, 4, 2, 7, -1, 6, -1, 4, -1, 5, 4, 2, 1], 'simple'));

/** Semitones above A4 of a row in a mode. */
export const semitoneOf = (mode, row) => modeOf(mode).semis[row];
/** A row's name, without its octave: 'A', 'C#'. */
export const rowName = (mode, row) => nameOf(semitoneOf(mode, row));
/** True for the black-key rows. */
export const isSharp = (mode, row) => rowName(mode, row).includes('#');
/** The pitch of a semitone above A4, in Hz. */
export const semitoneHz = (semi) => 440 * 2 ** (semi / 12);
export const rowHz = (mode, row) => semitoneHz(semitoneOf(mode, row));

/** A clean copy of `notes` for `mode`: one entry per step, each a row index or -1. */
export function normaliseNotes(notes, mode = 'simple') {
  const m = modeOf(mode);
  const out = new Array(m.steps).fill(-1);
  if (!Array.isArray(notes)) return out;
  for (let i = 0; i < m.steps; i++) {
    const n = notes[i];
    if (Number.isInteger(n) && n >= 0 && n < m.semis.length) out[i] = n;
  }
  return out;
}

export const hasNotes = (notes) => Array.isArray(notes) && notes.some((n) => Number.isInteger(n) && n >= 0);

/**
 * Tap a square: the same square again clears it, any other square in the column
 * replaces what was there. Returns a new array.
 */
export function toggleNote(notes, step, row, mode = 'simple') {
  const out = normaliseNotes(notes, mode);
  if (step < 0 || step >= out.length) return out;
  out[step] = out[step] === row ? -1 : row;
  return out;
}

/** Per-note lengths in sixteenths; empty entries use the mode's usual length. */
export function normaliseLengths(lengths, notes, mode = 'simple') {
  const m = modeOf(mode);
  const n = normaliseNotes(notes, mode);
  return Array.from({ length: m.steps }, (_, i) => n[i] < 0 ? 0
    : Number.isFinite(lengths?.[i]) ? Math.max(m.len, Math.min(32, lengths[i])) : m.len);
}

/** The scale row nearest a semitone; a tie goes down. */
function nearestScaleRow(semi) {
  let best = 0;
  for (let r = 1; r < SCALE.length; r++) if (Math.abs(SCALE[r] - semi) < Math.abs(SCALE[best] - semi)) best = r;
  return best;
}

/**
 * ADVANCED → SIMPLE: each eighth takes the first note that starts in it, moved to the
 * nearest note of the scale.
 */
export function simplify(advanced) {
  const a = normaliseNotes(advanced, 'advanced');
  return Array.from({ length: RIFF_MODES.simple.steps }, (_, i) => {
    const row = a[2 * i] >= 0 ? a[2 * i] : a[2 * i + 1];
    return row >= 0 ? nearestScaleRow(CHROMATIC[row]) : -1;
  });
}

/** SIMPLE → ADVANCED: every eighth on the sixteenth it starts on, every scale note as its semitone. */
export function expand(simple) {
  const s = normaliseNotes(simple, 'simple');
  const out = new Array(RIFF_MODES.advanced.steps).fill(-1);
  s.forEach((row, i) => { if (row >= 0) out[2 * i] = advancedRow(SCALE[row]); });
  return out;
}

/** The grid as sixteenths of semitones above A4 (null a rest: G4 is -2), with each note's length in sixteenths. */
export function sixteenths(notes, mode = 'simple', noteLengths = null) {
  const m = modeOf(mode);
  const n = normaliseNotes(notes, mode);
  const per = 32 / m.steps;
  const semis = new Array(32).fill(null);
  const lengths = normaliseLengths(noteLengths, n, mode);
  n.forEach((row, i) => { if (row >= 0) semis[i * per] = m.semis[row]; });
  return { semis, len: m.len, lengths };
}

/**
 * The grid as the generator's riff: one melodic hook lane, two bars on a 16th grid,
 * played on `voice` (make.js passes the style's own hook sound).
 */
export function riffFromNotes(notes, voice = 'simpleSquare', mode = 'simple', noteLengths = null) {
  const { semis, len, lengths } = sixteenths(notes, mode, noteLengths);
  const name = (s) => `${nameOf(s)}${octaveOf(s)}`;
  const per = 32 / modeOf(mode).steps;
  const bar = (b) => semis.slice(b * 16, b * 16 + 16).map((s, i) => {
    if (s == null) return '.';
    const at = b * 16 + i;
    const noteIndex = Math.floor(at / per);
    return `${name(s)}:${lengths[noteIndex] || len}`;
  }).join(' ');
  const pitched = semis.filter((s) => s != null);
  const meanPitch = pitched.length ? 69 + pitched.reduce((t, s) => t + s, 0) / pitched.length : 72;
  return {
    version: 1,
    source: { id: 'jukebox', title: 'MY RIFF', from: 0, to: 1, bpm: RIFF_BPM },
    bars: 2, grid: 16, stats: {},
    parts: [{
      key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch,
      voice, voiceParams: null, engineKeys: null, strip: null,
      bars: [bar(0), bar(1)],
    }],
  };
}

/** Version 2's eighths of semitones above A4, as an ADVANCED grid. */
const v2ToAdvanced = (notes) => {
  const out = new Array(32).fill(-1);
  (Array.isArray(notes) ? notes : []).slice(0, 16).forEach((n, i) => {
    if (Number.isInteger(n) && n >= 0 && n <= 12) out[2 * i] = advancedRow(n);
  });
  return out;
};

/**
 * A stored draft in today's shape: { mode, simple, advanced, simpleEdited }.
 * `advanced` is what ADVANCED remembers; `simpleEdited` says SIMPLE has been written
 * in since it was converted down, so going back up converts SIMPLE rather than
 * restoring the memory.
 */
export function upgradeDraft(d = {}) {
  if (d.v === 3) d = { ...d, v: RIFF_VERSION, simple: fromV3(d.simple, 'simple'), advanced: fromV3(d.advanced, 'advanced') };
  if (d.v === RIFF_VERSION) {
    const mode = modeOf(d.mode).id;
    return {
      mode,
      simple: normaliseNotes(d.simple, 'simple'),
      advanced: normaliseNotes(d.advanced, 'advanced'),
      simpleLengths: normaliseLengths(d.simpleLengths, d.simple, 'simple'),
      advancedLengths: normaliseLengths(d.advancedLengths, d.advanced, 'advanced'),
      simpleEdited: !!d.simpleEdited,
    };
  }
  if (d.v === 2) {
    const advanced = v2ToAdvanced(d.notes);
    return { mode: 'advanced', simple: simplify(advanced), advanced,
      simpleLengths: normaliseLengths(null, simplify(advanced), 'simple'),
      advancedLengths: normaliseLengths(null, advanced, 'advanced'), simpleEdited: false };
  }
  const simple = Array.isArray(d.notes) ? normaliseNotes(fromV3(d.notes, 'simple'), 'simple') : [...DEFAULT_SIMPLE];
  return { mode: 'simple', simple, advanced: expand(simple),
    simpleLengths: normaliseLengths(null, simple, 'simple'),
    advancedLengths: normaliseLengths(null, expand(simple), 'advanced'), simpleEdited: false };
}

/** A kept recipe's grid in today's shape: { mode, notes }. */
export function upgradeRecipeNotes(r) {
  if (r.v === 3) r = { ...r, v: RIFF_VERSION, notes: fromV3(r.notes, r.mode) };
  if (r.v === RIFF_VERSION) return { mode: modeOf(r.mode).id, notes: normaliseNotes(r.notes, r.mode),
    lengths: normaliseLengths(r.lengths, r.notes, r.mode) };
  if (r.v === 2) { const notes = v2ToAdvanced(r.notes); return { mode: 'advanced', notes, lengths: normaliseLengths(null, notes, 'advanced') }; }
  const notes = normaliseNotes(fromV3(r.notes, 'simple'), 'simple'); return { mode: 'simple', notes, lengths: normaliseLengths(null, notes, 'simple') };
}

/**
 * ZAP: a random riff for `mode` that still sounds like a hook. Notes land on the
 * beat more often than off it, the tune walks the scale by small steps from a home note,
 * and the second bar repeats the first and answers it — the last notes are new and it
 * comes home to A, C or E. ADVANCED gets the same walk on its semitone rows, plus the odd
 * sixteenth.
 */
export function luckyNotes(mode = 'simple', random = Math.random) {
  const m = modeOf(mode);
  const half = m.steps / 2;
  const per = 16 / half;                    // sixteenths per step
  const chance = (i) => {
    const s = i * per;                      // position in sixteenths within the bar
    if (s % 4 === 0) return 0.85;           // the beat
    if (s % 2 === 0) return 0.5;            // the eighth between
    return 0.22;                            // a sixteenth
  };
  const toRow = (scaleRow) => (mode === 'advanced' ? advancedRow(SCALE[scaleRow]) : scaleRow);
  const A = SCALE.indexOf(0);               // scale indices are counted from G4
  const walk = (from) => {
    const r = random();
    const move = r < 0.2 ? 0 : r < 0.55 ? 1 : r < 0.82 ? -1 : r < 0.92 ? 2 : -2;
    return Math.max(0, Math.min(SCALE.length - 1, from + move));
  };
  const bar = new Array(half).fill(-1);
  let at = A + (random() < 0.6 ? 0 : 4);    // start on A or E
  for (let i = 0; i < half; i++) {
    if (i === 0 || random() < chance(i)) { bar[i] = toRow(at); at = walk(at); }
  }
  const second = [...bar];
  at = A + 2 + Math.floor(random() * 3);
  for (let i = Math.floor(half * 0.6); i < half; i++) {
    second[i] = random() < chance(i) ? toRow(at) : -1;
    at = walk(at);
  }
  const home = A + [0, 2, 4][Math.floor(random() * 3)];
  const lastOn = (i) => { for (let k = half - 1; k >= 0; k--) if (second[k] >= 0) return k; return i; };
  second[lastOn(half - 2)] = toRow(home);
  return normaliseNotes([...bar, ...second], mode);
}
