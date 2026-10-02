// MAKE A BANGER — the composer's toolkit. 2 Oct 2026.
//
// The browser-safe half of work/local/_remix-lib.mjs, the kit every hand-written cabinet
// remix was composed with (ABSOLUTE ZERO, HOSTILE TAKEOVER, RAISE THE DEAD …), brought
// into the tree so the desk's banger generator can run it in the page and in Node alike.
// That file stays where it is — it is untracked and other scripts import it — and this
// one is a copy of its musical parts plus the helpers the remix scripts each wrote for
// themselves (`upChord`, `cut`, `clip`, `octaves`, HOSTILE TAKEOVER's `automate`).
//
// No `node:*` imports, ever: the static mixer runs this in a browser.
//
// THE SHAPES. A bar is `{ lane: part }`. A melodic part is `{ notes: [16], lens: [16] }`
// where a note is a NAME ('A4'), an array of names (a chord) or null; a drum part is 16
// booleans. Names use sharps only, because `n()` in src/engine/notes.js reads nothing
// else — and only octaves 0–9, so every name written here is checked on the way out.
import { n } from '../../../src/engine/notes.js';

// ---------------------------------------------------------------- pitch
export const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', Fb: 'E' };

export const pcOfName = (name) => NAMES.indexOf(FLAT[name] || name);

export function midi(name) {
  const m = /^([A-G][b#]?)(-?\d+)$/.exec(name);
  if (!m) throw new Error(`not a note: ${name}`);
  const i = pcOfName(m[1]);
  if (i < 0) throw new Error(`not a note: ${name}`);
  return i + 12 * (Number(m[2]) + 1);
}
export const nameOf = (m) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
export const tr = (name, semis) => nameOf(midi(name) + semis);
/** The lowest and highest MIDI notes `n()` can spell: C0 and B9. */
export const MIDI_MIN = 12;
export const MIDI_MAX = 131;
/** Folded into the playable range by octaves — a generated line never spells `C-1`. */
export const clampMidi = (m) => {
  let x = m;
  while (x < MIDI_MIN) x += 12;
  while (x > MIDI_MAX) x -= 12;
  return x;
};

// ---------------------------------------------------------------- chords
// Intervals above the root, named the way a chart would name them.
export const QUALITY = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
  m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14],
  6: [0, 4, 7, 9], m6: [0, 3, 7, 9], sus4: [0, 5, 7], sus2: [0, 2, 7], '7sus4': [0, 5, 7, 10],
  9: [0, 4, 7, 10, 14], 13: [0, 4, 7, 10, 14, 21], '7#9': [0, 4, 7, 10, 15], m7b5: [0, 3, 6, 10],
  dim: [0, 3, 6], maj7s11: [0, 4, 7, 11, 18], '6add9': [0, 4, 7, 9, 14],
};
export function parseChord(sym) {
  const m = /^([A-G][b#]?)(.*)$/.exec(sym);
  if (!m || !(m[2] in QUALITY)) throw new Error(`unknown chord: ${sym}`);
  const root = pcOfName(m[1]);
  return { root, quality: m[2], ivs: QUALITY[m[2]], pcs: QUALITY[m[2]].map((i) => (root + i) % 12) };
}
/** A chord symbol from a root pitch class and a quality: chordSym(2, 'm') → 'Dm'. */
export const chordSym = (root, quality = '') => `${NAMES[((root % 12) + 12) % 12]}${quality}`;
/** The chord's root as a note in octave `oct`. */
export const rootOf = (sym, oct) => nameOf(parseChord(sym).root + 12 * (oct + 1));
/** A chord symbol (or a list of them) moved by semitones. */
export const upChord = (c, s) => (Array.isArray(c) ? c.map((x) => upChord(x, s))
  : c.replace(/^([A-G][b#]?)/, (r) => NAMES[(pcOfName(r) + s + 120) % 12]));
/** The same chord with a different colour: withQuality('Dm', 'm9') → 'Dm9'. */
export const withQuality = (sym, quality) => chordSym(parseChord(sym).root, quality);

/**
 * A close-position voicing of `sym` nearest `centre` (a note name): every rotation of
 * its pitch classes, stacked upward inside an octave, at the octave whose average sits
 * closest. `drop` leaves the root out (the bass has it); `spread` drops the lowest
 * note an octave, which opens a close voicing into a pad.
 */
export function voicing(sym, centre = 'E4', { drop = false, spread = false } = {}) {
  const { root, ivs } = parseChord(sym);
  let pcs = [...new Set(ivs.map((i) => (root + i) % 12))];
  if (drop && pcs.length > 3) pcs = pcs.filter((pc) => pc !== root);
  pcs.sort((a, b) => a - b);
  const c = midi(centre);
  let best = null;
  for (let r = 0; r < pcs.length; r++) {
    const rot = [...pcs.slice(r), ...pcs.slice(0, r)];
    for (let oct = 1; oct <= 7; oct++) {
      const notes = [];
      let m = rot[0] + 12 * oct;
      notes.push(m);
      for (const pc of rot.slice(1)) {
        m += 1;
        while (((m % 12) + 12) % 12 !== pc) m++;
        notes.push(m);
      }
      const avg = notes.reduce((a, b) => a + b, 0) / notes.length;
      const score = Math.abs(avg - c);
      if (!best || score < best.score) best = { notes, score };
    }
  }
  let out = best.notes;
  if (spread && out.length >= 3) out = [out[0] - 12, ...out.slice(1)];
  return out.map(nameOf);
}

/**
 * An OPEN, rootless voicing — third and seventh low, ninth and fifth high — the way
 * ABSOLUTE ZERO hand-voiced its breakdown (Dm9 as F3 C4 E4 A4). The close voicer stacks a
 * five-note chord into a cluster of seconds; this never puts two tones a second apart.
 */
export function openVoicing(sym, centre = 'E4') {
  const { root, ivs } = parseChord(sym);
  const third = ivs.find((i) => i === 3 || i === 4) ?? ivs[1];
  const fifth = ivs.includes(7) ? 7 : ivs[2];
  const seventh = ivs.find((i) => i === 10 || i === 11);
  const ninth = ivs.find((i) => i === 14);
  // Ordered as stacked from the bottom: 3, 7 (or 5), 9 (or 8ve), 5 above.
  const stack = [third, seventh ?? fifth, ninth ?? 12, fifth + 12];
  const c = midi(centre);
  let best = null;
  for (let oct = 2; oct <= 6; oct++) {
    const base = root + 12 * (oct + 1);
    const notes = stack.map((i) => base + i);
    const avg = notes.reduce((a, b) => a + b, 0) / notes.length;
    const score = Math.abs(avg - c);
    if (!best || score < best.score) best = { notes, score };
  }
  return best.notes.map((m) => nameOf(clampMidi(m)));
}

/** Chord tones as note names, ascending from `from` (a note), `count` of them. */
export function chordRun(sym, from, count) {
  const { pcs } = parseChord(sym);
  const out = [];
  let m = midi(from);
  while (out.length < count) {
    if (pcs.includes(((m % 12) + 12) % 12)) out.push(nameOf(m));
    m++;
  }
  return out;
}

// ---------------------------------------------------------------- scales
const MODE_STEPS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};
/** The pitch classes of a key: scaleOf('E', 'minor'), scaleOf(2, 'major'). */
export function scaleOf(tonic, mode = 'minor') {
  const t = typeof tonic === 'number' ? tonic : pcOfName(tonic);
  const steps = MODE_STEPS[mode];
  if (!steps) throw new Error(`unknown mode: ${mode}`);
  return steps.map((x) => (t + x) % 12);
}

// ---------------------------------------------------------------- bars
export const EMPTY16 = () => Array(16).fill(null);
export const blank = () => ({ notes: EMPTY16(), lens: EMPTY16() });
export const silentDrum = () => Array(16).fill(false);
export const isDrumPart = (part) => Array.isArray(part);
export const hasNotes = (part) => !!part && (Array.isArray(part)
  ? part.some(Boolean)
  : part.notes.some((v) => v != null));

/**
 * One bar of notes from shorthand: `A4 . C5 E5:3 . A3+C4+E4:16 …`, sixteen tokens.
 * `:n` is a length in sixteenths, `+` joins a chord, `.` is a rest, `-` too.
 */
export function L(str) {
  const toks = String(str).replace(/\|/g, ' ').trim().split(/\s+/);
  if (toks.length !== 16) throw new Error(`bar needs 16 tokens, got ${toks.length}: ${str}`);
  const out = blank();
  toks.forEach((t, i) => {
    if (t === '.' || t === '-') return;
    const [body, len] = t.split(':');
    const names = body.split('+');
    for (const name of names) midi(name);
    out.notes[i] = names.length > 1 ? names : names[0];
    if (len) {
      const l = Number(len);
      if (!(l > 0)) throw new Error(`bad length in ${t}`);
      out.lens[i] = l;
    }
  });
  return out;
}
/** A drum bar from `x...x...` — `x` hits, anything else rests. */
export function P(str) {
  const s = String(str).replace(/\s|\|/g, '');
  if (s.length !== 16) throw new Error(`drum bar needs 16 steps: ${str}`);
  return [...s].map((c) => c === 'x' || c === 'X');
}
/** A melodic bar from events: [[step, note|notes, len?], …]. */
export function E(events) {
  const out = blank();
  for (const [step, note, len] of events) {
    if (step < 0 || step > 15) throw new Error(`step ${step} outside a bar`);
    out.notes[step] = note;
    if (len != null) out.lens[step] = len;
  }
  return out;
}
/** A melodic part back to `L()` shorthand — what a riff is stored as. */
export function partToL(part) {
  return part.notes.map((v, i) => {
    if (v == null) return '.';
    const body = Array.isArray(v) ? v.join('+') : v;
    const len = part.lens[i];
    return len != null ? `${body}:${Number(len.toFixed(4))}` : body;
  }).join(' ');
}
/** A drum part back to `P()` shorthand. */
export const partToP = (part) => part.map((v) => (v ? 'x' : '.')).join('');
export const clonePart = (part) => (part == null ? part
  : Array.isArray(part) ? [...part]
    : { notes: part.notes.map((v) => (Array.isArray(v) ? [...v] : v)), lens: [...part.lens] });

/** Every name in a part moved by `fn(midi) → midi`, folded into range. */
export function mapPitches(part, fn) {
  if (!part || Array.isArray(part)) return part;
  const mv = (name) => nameOf(clampMidi(fn(midi(name))));
  const f = (v) => (v == null ? v : Array.isArray(v) ? v.map(mv) : mv(v));
  return { notes: part.notes.map(f), lens: [...part.lens] };
}
/** Move a melodic part by semitones. */
export const shift = (part, semis) => (semis ? mapPitches(part, (m) => m + semis) : clonePart(part));

/** Every note held until the next one starts, less `gap` sixteenths (legato). */
export function legato(parts, gap = 0, max = 16) {
  const flat = [];
  parts.forEach((p, b) => p.notes.forEach((v, i) => { if (v != null) flat.push({ b, i, at: b * 16 + i }); }));
  const total = parts.length * 16;
  const out = parts.map((p) => ({ notes: [...p.notes], lens: [...p.lens] }));
  flat.forEach((e, k) => {
    const next = k + 1 < flat.length ? flat[k + 1].at : total;
    out[e.b].lens[e.i] = Math.max(1, Math.min(max, next - e.at - gap));
  });
  return out;
}

/**
 * Move a part by `steps` scale degrees inside a key — `scale` is its pitch classes. A
 * third below is -2. Notes outside the scale move by the nearest scale note first.
 */
export function diatonic(part, steps, scale) {
  if (!steps) return clonePart(part);
  const pcs = [...scale].sort((x, y) => x - y);
  const inScale = (m) => pcs.includes(((m % 12) + 12) % 12);
  return mapPitches(part, (m0) => {
    let m = m0;
    const dir = Math.sign(steps);
    for (let k = 0; k < Math.abs(steps); k++) {
      do { m += dir; } while (!inScale(m));
    }
    return m;
  });
}

/** Set one fixed length on every note of a part. */
export const lenAll = (part, len) => ({ notes: [...part.notes], lens: part.notes.map((v) => (v == null ? null : len)) });

/**
 * The tune at half speed: each bar of it becomes two, every step doubled. The rhythm
 * is still the hook's — only broader.
 */
export function augment(part) {
  const a = blank(); const b = blank();
  part.notes.forEach((v, i) => {
    if (v == null) return;
    const at = i * 2;
    const tgt = at < 16 ? a : b;
    tgt.notes[at % 16] = v;
    tgt.lens[at % 16] = (part.lens[i] ?? 1) * 2;
  });
  return [a, b];
}

/** A part with everything from `from` on taken out — the hole before a drop. */
export function cut(part, from) {
  if (!part) return part;
  if (Array.isArray(part)) return part.map((v, j) => (j >= from ? false : v));
  return {
    notes: part.notes.map((v, j) => (j >= from ? null : v)),
    lens: part.lens.map((l, j) => {
      if (j >= from) return null;
      // A note struck before the hole does not ring into it.
      return part.notes[j] != null && l != null && j + l > from ? from - j : l;
    }),
  };
}
/** A part whose note at `at` is shortened to `len` steps. */
export const clip = (part, at, len) => ({ notes: [...part.notes], lens: part.lens.map((l, j) => (j === at ? len : l)) });
/** Every note doubled an octave up — the big-room piano. */
export const octaves = (part) => ({
  notes: part.notes.map((v) => (v == null ? v : Array.isArray(v) ? v : [v, nameOf(clampMidi(midi(v) + 12))])),
  lens: [...part.lens],
});
/** Two parts on one lane: where both strike, the first wins. */
export function overlay(a, b) {
  if (!a) return clonePart(b);
  if (!b) return clonePart(a);
  if (Array.isArray(a)) return a.map((v, i) => v || b[i]);
  return {
    notes: a.notes.map((v, i) => (v != null ? v : b.notes[i])),
    lens: a.lens.map((l, i) => (a.notes[i] != null ? l : b.lens[i])),
  };
}

// ---------------------------------------------------------------- patterns over chords
const chordAt = (cs, i) => cs[Math.min(cs.length - 1, Math.floor(i / (16 / cs.length)))];

/**
 * A bass line over one bar of chords. `chords` is one symbol (the bar) or two (half
 * bars). `pat` is sixteen tokens: `R` root, `O` root an octave up, `5` the fifth,
 * `3` the third, `7` the seventh, `b` the root an octave DOWN, `.` rest; `:n` a
 * length. The root sits at the first instance at or above `floor`.
 */
export function bassBar(chords, pat, floor = 'E1') {
  const cs = Array.isArray(chords) ? chords : [chords];
  const toks = pat.trim().split(/\s+/);
  if (toks.length !== 16) throw new Error(`bass pattern needs 16 tokens: ${pat}`);
  const out = blank();
  const f = midi(floor);
  toks.forEach((t, i) => {
    if (t === '.' || t === '-') return;
    const sym = chordAt(cs, i);
    const [kind, len] = t.split(':');
    const { root, ivs } = parseChord(sym);
    let r = f;
    while (((r % 12) + 12) % 12 !== root) r++;
    const fifth = r + (ivs.includes(7) ? 7 : ivs[2]);
    const note = { R: r, O: r + 12, 5: fifth, 8: r + 12, b: r - 12, 3: r + ivs[1], 7: r + (ivs[3] ?? 10), 9: r + 14 }[kind];
    if (note == null) throw new Error(`bass token ${t}`);
    out.notes[i] = nameOf(clampMidi(note));
    if (len) out.lens[i] = Number(len);
  });
  return out;
}
/** Chord hits over one bar: `x` strikes the current chord (voiced near `centre`), `x:n` with a length. */
export function chordBar(chords, pat, centre = 'E4', opts = {}) {
  const cs = Array.isArray(chords) ? chords : [chords];
  const toks = pat.trim().split(/\s+/);
  if (toks.length !== 16) throw new Error(`chord pattern needs 16 tokens: ${pat}`);
  const out = blank();
  toks.forEach((t, i) => {
    if (t === '.' || t === '-') return;
    const [, len] = t.split(':');
    out.notes[i] = voicing(chordAt(cs, i), centre, opts);
    if (len) out.lens[i] = Number(len);
  });
  return out;
}
/** A held chord for each chord in the bar (a pad). */
export function padBar(chords, centre = 'E4', opts = {}) {
  const cs = Array.isArray(chords) ? chords : [chords];
  const each = 16 / cs.length;
  const out = blank();
  cs.forEach((sym, k) => {
    out.notes[k * each] = opts.open ? openVoicing(sym, centre) : voicing(sym, centre, opts);
    out.lens[k * each] = each;
  });
  return out;
}
/**
 * An arpeggio: `idx` is sixteen chord-tone indices (or `.`), counted up from `from`
 * through the chord's tones — 0 is the first tone at or above `from`.
 */
export function arpBar(chords, idx, from = 'A3', len = null) {
  const cs = Array.isArray(chords) ? chords : [chords];
  const toks = idx.trim().split(/\s+/);
  if (toks.length !== 16) throw new Error(`arp needs 16 tokens: ${idx}`);
  const out = blank();
  toks.forEach((t, i) => {
    if (t === '.' || t === '-') return;
    const run = chordRun(chordAt(cs, i), from, 12);
    out.notes[i] = run[Number(t)];
    if (len) out.lens[i] = len;
  });
  return out;
}

/**
 * The arp figures a banger can play, as arpBar index strings: each number is a chord tone
 * counted up from the arp's centre (0 the root, 1 the third, 2 the fifth, 3 the root an
 * octave up …), `.` a rest. A style's own figure is its `rhythms.arp`; these are the others
 * the Arp Pattern switch, and Varied, choose between.
 */
export const ARP_FIGURES = Object.freeze([
  { id: 'up', label: 'Up', idx: '0 1 2 3 0 1 2 3 0 1 2 3 0 1 2 3' },
  { id: 'down', label: 'Down', idx: '3 2 1 0 3 2 1 0 3 2 1 0 3 2 1 0' },
  { id: 'upDown', label: 'Up & Down', idx: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1' },
  { id: 'downUp', label: 'Down & Up', idx: '4 3 2 1 0 1 2 3 4 3 2 1 0 1 2 3' },
  { id: 'climb', label: 'Two-Octave Climb', idx: '0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7' },
  { id: 'fall', label: 'Two-Octave Fall', idx: '7 6 5 4 3 2 1 0 7 6 5 4 3 2 1 0' },
  { id: 'threes', label: 'Three Against Four', idx: '0 1 2 0 1 2 0 1 2 0 1 2 0 1 2 3' },
  { id: 'pedal', label: 'Pedal Top', idx: '0 3 1 3 2 3 1 3 0 3 1 3 2 3 1 3' },
  { id: 'alberti', label: 'Alberti', idx: '0 2 1 2 0 2 1 2 0 2 1 2 0 2 1 2' },
  { id: 'octaves', label: 'Octave Jumps', idx: '0 3 0 3 1 4 1 4 2 5 2 5 1 4 1 4' },
  { id: 'leapfrog', label: 'Leapfrog', idx: '0 2 1 3 2 4 3 5 4 2 3 1 2 0 1 2' },
  { id: 'eighths', label: 'Eighths', idx: '0 . 1 . 2 . 3 . 4 . 3 . 2 . 1 .' },
  { id: 'syncopated', label: 'Syncopated', idx: '0 . 2 3 . 1 2 . 3 . 4 2 . 1 3 .' },
]);

/**
 * The basslines a banger can play beyond a style's own Off-Beat and Rolling, as bassBar
 * patterns (R root, O / 8 octave, 5 fifth, 3 third, 7 seventh, `:n` a length in
 * sixteenths). `tonic` plays the home note under every chord instead of the chord's root.
 * `lift` is the busier bass a later drop moves to when Bass Lifts is on — null stays put.
 * Off-Beat and Rolling are the style's own rhythms; their lifts are in BASS_LIFTS.
 */
export const BASS_FIGURES = Object.freeze([
  { id: 'octaves', label: 'Octave Eighths', pat: 'R:2 . O:2 . R:2 . O:2 . R:2 . O:2 . R:2 . O:2 .', lift: 'gallop' },
  { id: 'rootFifth', label: 'Root–Fifth', pat: 'R:2 . 5:2 . O:2 . 5:2 . R:2 . 5:2 . O:2 . 5:2 .', lift: 'octaves' },
  { id: 'funk', label: 'Funk Syncopated', pat: 'R:3 . . R:1 . O:1 R:2 . . 5:1 . R:1 7:2 . 5:2 .', lift: null },
  { id: 'long808', label: 'Long 808', pat: 'R:10 . . . . . . . . . R:6 . . . . .', lift: 'offbeat' },
  { id: 'reese', label: 'Reese Drone', pat: 'R:8 . . . . . . . R:8 . . . . . . .', lift: 'octaves' },
  { id: 'gallop', label: 'Gallop', pat: 'R:2 . R:1 R:1 R:2 . R:1 R:1 R:2 . R:1 R:1 R:2 . R:1 R:1', lift: 'rolling' },
  { id: 'arpeggiated', label: 'Arpeggiated', pat: 'R:1 3:1 5:1 7:1 O:1 7:1 5:1 3:1 R:1 3:1 5:1 7:1 O:1 7:1 5:1 3:1', lift: null },
  { id: 'pedal', label: 'Pedal', pat: 'R:8 . . . . . . . R:8 . . . . . . .', tonic: true, lift: 'reese' },
  { id: 'walking', label: 'Walking', pat: 'R:4 . . . 3:4 . . . 5:4 . . . 7:4 . . .', lift: 'rootFifth' },
]);
export const BASS_LIFTS = Object.freeze({ offbeat: 'octaves', rolling: 'gallop' });

// ---------------------------------------------------------------- the song
/** The Hz `n()` makes of a name — and a throw, rather than a silent rest, if it cannot. */
function hz(name) {
  const f = n(name);
  if (f == null) throw new Error(`"${name}" is not a note the engine can play`);
  return f;
}

/**
 * Pack bars into a bank: a silent default for every lane anyone uses, one section per
 * bar pair naming only what that pair plays, and the order that walks them. `drums` is
 * the set of lane keys that hold booleans.
 */
export function packBank(bars, { bpm, musicTrim = 0.93, drums }) {
  const DRUM = new Set(drums);
  const lanes = new Set();
  for (const b of bars) for (const k of Object.keys(b)) lanes.add(k);
  const toHz = (v) => (v == null ? null : Array.isArray(v) ? v.map(hz) : hz(v));
  const bank = { bpm, musicTrim };
  for (const k of lanes) bank[k] = DRUM.has(k) ? Array(32).fill(false) : Array(32).fill(null);
  const sections = [];
  for (let i = 0; i < bars.length; i += 2) {
    const pair = [bars[i], bars[i + 1] || {}];
    const sec = {};
    for (const k of lanes) {
      const a = pair[0][k]; const b = pair[1][k];
      if (!a && !b) continue;
      if (DRUM.has(k)) {
        if ((a && !Array.isArray(a)) || (b && !Array.isArray(b))) throw new Error(`lane ${k} holds notes in a drum lane`);
        const lane = [...(a || Array(16).fill(false)), ...(b || Array(16).fill(false))];
        if (lane.some(Boolean)) sec[k] = lane;
        continue;
      }
      const pa = a || blank(); const pb = b || blank();
      if (Array.isArray(pa) || Array.isArray(pb)) throw new Error(`lane ${k} is a drum lane in one bar and melodic in another`);
      const notes = [...pa.notes, ...pb.notes].map(toHz);
      if (!notes.some((v) => v != null)) continue;
      sec[k] = notes;
      const lens = [...pa.lens, ...pb.lens].map((l, j) => (notes[j] == null ? null : l ?? null));
      if (lens.some((l) => l != null)) sec[`${k}Len`] = lens;
    }
    sections.push(sec);
  }
  bank.sections = sections;
  const order = sections.map((_, i) => i);
  if (bars.length % 2) order[order.length - 1] = { s: sections.length - 1, bars: 1 };
  bank.order = order;
  return bank;
}

/**
 * Per-bar arrangement moves — `{ [bar]: { inlineFx, gain } }`, bars 1-based — as the
 * ARRANGEMENT's order: the pair a bar lives in is split into two one-bar entries so the
 * move reaches that bar and no other. HOSTILE TAKEOVER's `automate()`. The bank keeps
 * packBank's plain numeric order: a composed bank order has to survive the desk's
 * bars-and-back unchanged (tests/arrangement.js), so per-bar moves never go into it.
 */
export function orderWithBarExtras(order, byBar) {
  const out = [];
  order.forEach((e, k) => {
    const s = typeof e === 'number' ? e : e.s;
    const count = typeof e === 'number' ? 2 : (e.bars ?? 2);
    const a = byBar[2 * k + 1]; const b = byBar[2 * k + 2];
    if (!a && !(count > 1 && b)) { out.push(e); return; }
    for (let h = 0; h < count; h++) out.push({ s, bars: 1, ...(h ? { from: 1 } : {}), ...(byBar[2 * k + 1 + h] || {}) });
  });
  return out;
}

/**
 * A song-local noise riser, `seconds` long: white noise through a band climbing from
 * 250 Hz to 8 kHz while it fades in, then cut. For `voiceParams` on a crash layer — the
 * library's sweeps all end inside a second, and a build wants two bars.
 */
export function riser(seconds) {
  return {
    label: 'Noise Riser', category: 'Sweep', homeLane: 'crash', kind: 'drum', dur: seconds,
    note: `White noise through a band climbing 250 Hz to 8 kHz over ${seconds.toFixed(2)}s as it fades in: the lift into a drop.`,
    noise: {
      type: 'bandpass', freq: 250, to: 8000, sweep: seconds, Q: 1.6, slope: -24, color: 'white',
      attack: seconds * 0.92, hold: 0, decay: seconds * 0.08, curve: 'exp', gain: 1,
    },
    drive: 0.08,
    peak: 0.034,
  };
}
