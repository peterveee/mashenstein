// GENER8, in the game — the riff grid. 3 Oct 2026.
//
// What the jukebox's piano roll edits: two bars, one note at a time, A4 to A5, in one
// of two modes (Peter, 3 Oct 2026):
//
//   SIMPLE    eighth notes on the eight notes of A natural minor — no wrong notes
//   ADVANCED  sixteenth notes on all thirteen semitones
//
// One note per column keeps it a tune rather than a chord: tapping a second note into a
// column moves the one that was there. A grid is an array of row indices, -1 a rest.
//
// The grid turns into the same riff shape the desk's generator reads off a song
// (tools/lib/banger/riff.js), so the jukebox and the desk make their songs the same way.

const NAMES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A'];
const OCTAVE = [4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
/** A natural minor (also C major), in semitones above A4. */
const SCALE = [0, 2, 3, 5, 7, 8, 10, 12];

export const RIFF_MODES = Object.freeze({
  simple: Object.freeze({ id: 'simple', label: 'SIMPLE', steps: 16, len: 2, semis: Object.freeze(SCALE) }),
  advanced: Object.freeze({ id: 'advanced', label: 'ADVANCED', steps: 32, len: 1, semis: Object.freeze(NAMES.map((_, i) => i)) }),
});
export const modeOf = (id) => RIFF_MODES[id] || RIFF_MODES.simple;
export const RIFF_BPM = 120;

/**
 * What a stored grid's numbers mean. 1: the first day's eight scale notes in eighths
 * (today's SIMPLE). 2: semitones in eighths, the afternoon's only grid. 3: a grid per
 * mode. `upgradeDraft` / `upgradeRecipe` read any of them.
 */
export const RIFF_VERSION = 3;

/** -1 is a rest. The SIMPLE tune the grid starts with, so GENER8 works on the first visit. */
export const DEFAULT_SIMPLE = Object.freeze([0, -1, 2, -1, 4, 2, 7, -1, 6, -1, 4, -1, 5, 4, 2, 1]);

/** Semitones above A4 of a row in a mode. */
export const semitoneOf = (mode, row) => modeOf(mode).semis[row];
/** A row's name, without its octave: 'A', 'C#'. */
export const rowName = (mode, row) => NAMES[semitoneOf(mode, row)];
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
    const semi = a[2 * i] >= 0 ? a[2 * i] : a[2 * i + 1];
    return semi >= 0 ? nearestScaleRow(semi) : -1;
  });
}

/** SIMPLE → ADVANCED: every eighth on the sixteenth it starts on, every scale note as its semitone. */
export function expand(simple) {
  const s = normaliseNotes(simple, 'simple');
  const out = new Array(RIFF_MODES.advanced.steps).fill(-1);
  s.forEach((row, i) => { if (row >= 0) out[2 * i] = SCALE[row]; });
  return out;
}

/** The grid as sixteenths of semitones, with each note's length in sixteenths. */
export function sixteenths(notes, mode = 'simple') {
  const m = modeOf(mode);
  const n = normaliseNotes(notes, mode);
  const per = 32 / m.steps;
  const semis = new Array(32).fill(-1);
  n.forEach((row, i) => { if (row >= 0) semis[i * per] = m.semis[row]; });
  return { semis, len: m.len };
}

/**
 * The grid as the generator's riff: one melodic hook lane, two bars on a 16th grid,
 * played on `voice` (make.js passes the style's own hook sound).
 */
export function riffFromNotes(notes, voice = 'simpleSquare', mode = 'simple') {
  const { semis, len } = sixteenths(notes, mode);
  const name = (s) => `${NAMES[s]}${OCTAVE[s]}`;
  const bar = (b) => semis.slice(b * 16, b * 16 + 16).map((s) => (s >= 0 ? `${name(s)}:${len}` : '.')).join(' ');
  const pitched = semis.filter((s) => s >= 0);
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

/** Version 2's eighths of semitones, as an ADVANCED grid. */
const v2ToAdvanced = (notes) => {
  const out = new Array(32).fill(-1);
  (Array.isArray(notes) ? notes : []).slice(0, 16).forEach((n, i) => {
    if (Number.isInteger(n) && n >= 0 && n <= 12) out[2 * i] = n;
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
  if (d.v === RIFF_VERSION) {
    const mode = modeOf(d.mode).id;
    return {
      mode,
      simple: normaliseNotes(d.simple, 'simple'),
      advanced: normaliseNotes(d.advanced, 'advanced'),
      simpleEdited: !!d.simpleEdited,
    };
  }
  if (d.v === 2) {
    const advanced = v2ToAdvanced(d.notes);
    return { mode: 'advanced', simple: simplify(advanced), advanced, simpleEdited: false };
  }
  const simple = Array.isArray(d.notes) ? normaliseNotes(d.notes, 'simple') : [...DEFAULT_SIMPLE];
  return { mode: 'simple', simple, advanced: expand(simple), simpleEdited: false };
}

/** A kept recipe's grid in today's shape: { mode, notes }. */
export function upgradeRecipeNotes(r) {
  if (r.v === RIFF_VERSION) return { mode: modeOf(r.mode).id, notes: normaliseNotes(r.notes, r.mode) };
  if (r.v === 2) return { mode: 'advanced', notes: v2ToAdvanced(r.notes) };
  return { mode: 'simple', notes: normaliseNotes(r.notes, 'simple') };
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
  const toRow = (scaleRow) => (mode === 'advanced' ? SCALE[scaleRow] : scaleRow);
  const walk = (from) => {
    const r = random();
    const move = r < 0.2 ? 0 : r < 0.55 ? 1 : r < 0.82 ? -1 : r < 0.92 ? 2 : -2;
    return Math.max(0, Math.min(SCALE.length - 1, from + move));
  };
  const bar = new Array(half).fill(-1);
  let at = random() < 0.6 ? 0 : 4;          // start on A or E
  for (let i = 0; i < half; i++) {
    if (i === 0 || random() < chance(i)) { bar[i] = toRow(at); at = walk(at); }
  }
  const second = [...bar];
  at = 2 + Math.floor(random() * 3);
  for (let i = Math.floor(half * 0.6); i < half; i++) {
    second[i] = random() < chance(i) ? toRow(at) : -1;
    at = walk(at);
  }
  const home = [0, 2, 4][Math.floor(random() * 3)];
  const lastOn = (i) => { for (let k = half - 1; k >= 0; k--) if (second[k] >= 0) return k; return i; };
  second[lastOn(half - 2)] = toRow(home);
  return normaliseNotes([...bar, ...second], mode);
}
