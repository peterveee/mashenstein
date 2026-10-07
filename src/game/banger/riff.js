// GENER8, in the game — the riff grid. 3 Oct 2026.
//
// What the jukebox's piano roll edits: two bars, or four (Peter, 6 Oct 2026), one note at a
// time, G4 to C6 (it was A4 to A5 until Peter, 5 Oct 2026), in one of two modes (Peter, 3 Oct 2026):
//
//   SIMPLE    eighth notes on the eleven notes of A natural minor in range — no wrong notes
//   ADVANCED  sixteenth notes on all eighteen semitones
//
// One note per column keeps it a tune rather than a chord: tapping a second note into a
// column moves the one that was there. A grid is an array of row indices, -1 a rest, and how
// many bars it holds is its length: a mode's `steps` are two bars' columns, and twice that is
// four. Two bars is the grid as it always was, so every grid and recipe from before reads as
// it did.
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
/** The lengths a grid can be, in bars: 2 BARS and 4 BARS (maker.js). */
export const RIFF_BARS = Object.freeze([2, 4]);
/** Sixteenths a column covers: two in SIMPLE, one in ADVANCED. */
export const perOf = (mode) => 32 / modeOf(mode).steps;
/** A grid's columns at `bars` bars. */
export const stepsOf = (mode, bars = 2) => (modeOf(mode).steps * bars) / 2;
/** How many bars a grid holds, read off its length: more than two bars' columns is four. */
export const barsOf = (notes, mode) => (Array.isArray(notes) && notes.length > modeOf(mode).steps ? 4 : 2);

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

/**
 * A clean copy of `notes` for `mode`: one entry per step, each a row index or -1. `bars` is
 * the grid's own unless asked for: a two-bar grid asked for four comes back with two bars of rest.
 */
export function normaliseNotes(notes, mode = 'simple', bars = barsOf(notes, mode)) {
  const m = modeOf(mode);
  const steps = stepsOf(mode, bars);
  const out = new Array(steps).fill(-1);
  if (!Array.isArray(notes)) return out;
  for (let i = 0; i < steps; i++) {
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
export function normaliseLengths(lengths, notes, mode = 'simple', bars = barsOf(notes, mode)) {
  const m = modeOf(mode);
  const n = normaliseNotes(notes, mode, bars);
  return Array.from({ length: n.length }, (_, i) => n[i] < 0 ? 0
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
  return Array.from({ length: stepsOf('simple', barsOf(a, 'advanced')) }, (_, i) => {
    const row = a[2 * i] >= 0 ? a[2 * i] : a[2 * i + 1];
    return row >= 0 ? nearestScaleRow(CHROMATIC[row]) : -1;
  });
}

/** SIMPLE → ADVANCED: every eighth on the sixteenth it starts on, every scale note as its semitone. */
export function expand(simple) {
  const s = normaliseNotes(simple, 'simple');
  const out = new Array(stepsOf('advanced', barsOf(s, 'simple'))).fill(-1);
  s.forEach((row, i) => { if (row >= 0) out[2 * i] = advancedRow(SCALE[row]); });
  return out;
}

/** The grid as sixteenths of semitones above A4 (null a rest: G4 is -2), with each note's length in sixteenths. */
export function sixteenths(notes, mode = 'simple', noteLengths = null) {
  const m = modeOf(mode);
  const n = normaliseNotes(notes, mode);
  const per = perOf(mode);
  const semis = new Array(16 * barsOf(n, mode)).fill(null);
  const lengths = normaliseLengths(noteLengths, n, mode);
  n.forEach((row, i) => { if (row >= 0) semis[i * per] = m.semis[row]; });
  return { semis, len: m.len, lengths };
}

/**
 * The grid as the generator's riff: one melodic hook lane, two or four bars on a 16th grid,
 * played on `voice` (make.js passes the style's own hook sound).
 */
export function riffFromNotes(notes, voice = 'simpleSquare', mode = 'simple', noteLengths = null) {
  const { semis, len, lengths } = sixteenths(notes, mode, noteLengths);
  const name = (s) => `${nameOf(s)}${octaveOf(s)}`;
  const per = perOf(mode);
  const bars = semis.length / 16;
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
    source: { id: 'jukebox', title: 'MY RIFF', from: 0, to: bars - 1, bpm: RIFF_BPM },
    bars, grid: 16, stats: {},
    parts: [{
      key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch,
      voice, voiceParams: null, engineKeys: null, strip: null,
      bars: Array.from({ length: bars }, (_, b) => bar(b)),
    }],
  };
}

/**
 * The grid as BRING TO LIFE hands it on: four bars whose 3–4 are still a copy of 1–2 (what
 * 4 BARS starts them as, maker.js) are two bars, so the song is the one two bars would make.
 * A riff is four bars once bars 3–4 have something of their own.
 */
export function settleBars(notes, lengths, mode = 'simple') {
  const n = normaliseNotes(notes, mode);
  const l = normaliseLengths(lengths, n, mode);
  const half = stepsOf(mode, 2);
  const repeats = (a) => a.length > half && a.slice(0, half).join() === a.slice(half).join();
  return repeats(n) && repeats(l) ? { notes: n.slice(0, half), lengths: l.slice(0, half) } : { notes: n, lengths: l };
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
 * A stored draft in today's shape: { mode, bars, simple, advanced, simpleEdited }.
 * `advanced` is what ADVANCED remembers; `simpleEdited` says SIMPLE has been written
 * in since it was converted down, so going back up converts SIMPLE rather than
 * restoring the memory. `bars` is 2 BARS or 4 BARS; the grids may hold four bars at
 * either, as 2 BARS remembers the bars 3–4 it hides. Every draft before 4 BARS is two.
 */
export function upgradeDraft(d = {}) {
  if (d.v === 3) d = { ...d, v: RIFF_VERSION, simple: fromV3(d.simple, 'simple'), advanced: fromV3(d.advanced, 'advanced') };
  if (d.v === RIFF_VERSION) {
    const mode = modeOf(d.mode).id;
    return {
      mode,
      bars: d.bars === 4 ? 4 : 2,
      simple: normaliseNotes(d.simple, 'simple'),
      advanced: normaliseNotes(d.advanced, 'advanced'),
      simpleLengths: normaliseLengths(d.simpleLengths, d.simple, 'simple'),
      advancedLengths: normaliseLengths(d.advancedLengths, d.advanced, 'advanced'),
      simpleEdited: !!d.simpleEdited,
    };
  }
  if (d.v === 2) {
    const advanced = v2ToAdvanced(d.notes);
    return { mode: 'advanced', bars: 2, simple: simplify(advanced), advanced,
      simpleLengths: normaliseLengths(null, simplify(advanced), 'simple'),
      advancedLengths: normaliseLengths(null, advanced, 'advanced'), simpleEdited: false };
  }
  const simple = Array.isArray(d.notes) ? normaliseNotes(fromV3(d.notes, 'simple'), 'simple') : [...DEFAULT_SIMPLE];
  return { mode: 'simple', bars: 2, simple, advanced: expand(simple),
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
 *
 * FOUR BARS (Peter, 6 Oct 2026) are a question and its answer. Bar 2 stops open, on C, D or
 * E; bar 3 is bar 1 moved along the scale — its shape, so it is heard as the same tune, on
 * other notes, so another chord goes under it; and bar 4 walks on from there and comes home
 * to A. Bars 3–4 that only repeat 1–2 with a new ending barely move the song the generator
 * writes; a bar 3 of its own gives it a four-chord turn (measured 6 Oct 2026).
 */
export function luckyNotes(mode = 'simple', random = Math.random, bars = 2) {
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
  // The bars are written in scale indices, -1 a rest, and turned into the mode's rows at the end.
  const lastOn = (b, i) => { for (let k = half - 1; k >= 0; k--) if (b[k] >= 0) return k; return i; };
  const bar = new Array(half).fill(-1);
  let at = A + (random() < 0.6 ? 0 : 4);    // start on A or E
  for (let i = 0; i < half; i++) {
    if (i === 0 || random() < chance(i)) { bar[i] = at; at = walk(at); }
  }
  const second = [...bar];
  at = A + 2 + Math.floor(random() * 3);
  for (let i = Math.floor(half * 0.6); i < half; i++) {
    second[i] = random() < chance(i) ? at : -1;
    at = walk(at);
  }
  second[lastOn(second, half - 2)] = A + (bars === 4 ? [2, 3, 4] : [0, 2, 4])[Math.floor(random() * 3)];
  const tune = [bar, second];
  if (bars === 4) {
    // Two steps up, three up or two down: C, D or F under a tune that sat on A.
    const fits = (k) => bar.every((x) => x < 0 || (x + k >= 0 && x + k < SCALE.length));
    const moves = [2, 3, -2].filter(fits);
    const k = moves.length ? moves[Math.floor(random() * moves.length)] : 0;
    const third = bar.map((x) => (x < 0 ? -1 : x + k));
    const fourth = new Array(half).fill(-1);
    at = walk(third[lastOn(third, 0)]);
    for (let i = 0; i < half; i++) {
      if (i === 0 || random() < chance(i)) { fourth[i] = at; at = walk(at); }
    }
    // home: the A nearer where the walk has got to, A4 or A5
    fourth[lastOn(fourth, half - 2)] = Math.abs(at - A) <= Math.abs(at - (A + 7)) ? A : A + 7;
    tune.push(third, fourth);
  }
  return normaliseNotes(tune.flat().map((x) => (x < 0 ? -1 : toRow(x))), mode, bars);
}
