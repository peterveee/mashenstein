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
  dim: [0, 3, 6], maj7s11: [0, 4, 7, 11, 18], '6add9': [0, 4, 7, 9, 14], mmaj7: [0, 3, 7, 11], dim7: [0, 3, 6, 9],
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
export function voicing(sym, centre = 'E4', { drop = false, spread = false, memory = null } = {}) {
  const { root, ivs } = parseChord(sym);
  // CHORD MEMORY (9 Oct 2026): not this chord in the key, but one SHAPE — `memory` is a quality,
  // 'm7' or 'm9' — built on the chord's root, in root position, at the octave nearest `centre`.
  // Every chord the same shape moved whole, the way a chord-memory button plays it: Detroit's and
  // the rave stab's parallel harmony. The shape ignores the chord's own quality and the key.
  if (memory) {
    const shape = QUALITY[memory] || QUALITY.m7;
    const c = midi(centre);
    let best = null;
    for (let oct = 1; oct <= 7; oct++) {
      const notes = shape.map((i) => root + 12 * oct + i);
      const score = Math.abs(notes.reduce((a, b) => a + b, 0) / notes.length - c);
      if (!best || score < best.score) best = { notes, score };
    }
    return best.notes.map((m) => nameOf(clampMidi(m)));
  }
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
// VELOCITY (9 Oct 2026): a part may carry `vels` beside `notes` and `lens` — how hard each note
// is struck, 0 to 1, null for full strength — which packBank writes as `${lane}Velocity`. The
// acid line's accents are the one writer so far. Every helper below that builds a part from
// another carries it, and only when the source has one, so a part without it never grows one.
const withVels = (src, vels) => (src?.vels ? { vels } : {});

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
/** How hard a drum pattern's ghost note (`g`) is struck: a quarter or so of a hit. */
export const GHOST = 0.35;
/**
 * A drum bar from `x...x...` — `x` hits, `g` a GHOST note (9 Oct 2026: a hit at GHOST's
 * velocity, which packBank writes as `${lane}Velocity`), anything else rests.
 */
export function P(str) {
  const s = String(str).replace(/\s|\|/g, '');
  if (s.length !== 16) throw new Error(`drum bar needs 16 steps: ${str}`);
  return [...s].map((c) => (c === 'x' || c === 'X' ? true : c === 'g' ? GHOST : false));
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
    : { notes: part.notes.map((v) => (Array.isArray(v) ? [...v] : v)), lens: [...part.lens], ...withVels(part, part.vels && [...part.vels]) });

/** Every name in a part moved by `fn(midi) → midi`, folded into range. */
export function mapPitches(part, fn) {
  if (!part || Array.isArray(part)) return part;
  const mv = (name) => nameOf(clampMidi(fn(midi(name))));
  const f = (v) => (v == null ? v : Array.isArray(v) ? v.map(mv) : mv(v));
  return { notes: part.notes.map(f), lens: [...part.lens], ...withVels(part, part.vels && [...part.vels]) };
}
/** Move a melodic part by semitones. */
export const shift = (part, semis) => (semis ? mapPitches(part, (m) => m + semis) : clonePart(part));

/** Every note held until the next one starts, less `gap` sixteenths (legato). */
export function legato(parts, gap = 0, max = 16) {
  const flat = [];
  parts.forEach((p, b) => p.notes.forEach((v, i) => { if (v != null) flat.push({ b, i, at: b * 16 + i }); }));
  const total = parts.length * 16;
  const out = parts.map((p) => ({ notes: [...p.notes], lens: [...p.lens], ...withVels(p, p.vels && [...p.vels]) }));
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
export const lenAll = (part, len) => ({ notes: [...part.notes], lens: part.notes.map((v) => (v == null ? null : len)),
  ...withVels(part, part.vels && [...part.vels]) });

/**
 * The tune at half speed: each bar of it becomes two, every step doubled. The rhythm
 * is still the hook's — only broader.
 */
export function augment(part) {
  const a = blank(); const b = blank();
  if (part.vels) { a.vels = EMPTY16(); b.vels = EMPTY16(); }
  part.notes.forEach((v, i) => {
    if (v == null) return;
    const at = i * 2;
    const tgt = at < 16 ? a : b;
    tgt.notes[at % 16] = v;
    tgt.lens[at % 16] = (part.lens[i] ?? 1) * 2;
    if (part.vels) tgt.vels[at % 16] = part.vels[i];
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
    ...withVels(part, part.vels && part.vels.map((x, j) => (j >= from ? null : x))),
  };
}
/** A part whose note at `at` is shortened to `len` steps. */
export const clip = (part, at, len) => ({ notes: [...part.notes], lens: part.lens.map((l, j) => (j === at ? len : l)),
  ...withVels(part, part.vels && [...part.vels]) });
/** Every note doubled an octave up — the big-room piano. */
export const octaves = (part) => ({
  notes: part.notes.map((v) => (v == null ? v : Array.isArray(v) ? v : [v, nameOf(clampMidi(midi(v) + 12))])),
  lens: [...part.lens],
  ...withVels(part, part.vels && [...part.vels]),
});
/** Two parts on one lane: where both strike, the first wins. */
export function overlay(a, b) {
  if (!a) return clonePart(b);
  if (!b) return clonePart(a);
  if (Array.isArray(a)) return a.map((v, i) => v || b[i]);
  return {
    notes: a.notes.map((v, i) => (v != null ? v : b.notes[i])),
    lens: a.lens.map((l, i) => (a.notes[i] != null ? l : b.lens[i])),
    ...(a.vels || b.vels ? { vels: a.notes.map((v, i) => (v != null ? a.vels?.[i] ?? null : b.vels?.[i] ?? null)) } : {}),
  };
}

// ---------------------------------------------------------------- patterns over chords
const chordAt = (cs, i) => cs[Math.min(cs.length - 1, Math.floor(i / (16 / cs.length)))];

/**
 * How hard a pitch class grinds against a chord it is not in (6 Oct 2026): 1 for a flat ninth on
 * the root, the third the chord does not have (G over E major, C# over A minor) or the seventh it
 * does not have (F over Gmaj7) — no voicing sweetens those — 0.4 for a tritone on the root, 0 for
 * the rest. Ninths, fourths and sixths, and a seventh over a triad, are colour, not a grind.
 */
export function grindOf(pc, sym) {
  const { root, ivs, pcs } = parseChord(sym);
  if (pcs.includes(pc)) return 0;
  const iv = (((pc - root) % 12) + 12) % 12;
  if (iv === 1) return 1;
  const major = ivs.includes(4), minor = ivs.includes(3);
  if ((major && !minor && iv === 3) || (minor && !major && iv === 4)) return 1;
  const maj7 = ivs.includes(11), b7 = ivs.includes(10);
  if ((maj7 && !b7 && iv === 10) || (b7 && !maj7 && iv === 11)) return 1;
  return iv === 6 ? 0.4 : 0;
}

/**
 * A line made from the hook — a pre-chorus's sequenced head, a middle 8's fragment, a verse moved
 * up a step, the third below — fitted to the chords under it (6 Oct 2026): a note that grinds
 * (grindOf) moves to the nearest note of its chord, upward on a tie, so a G over E major becomes
 * the leading note G#. The riff as written never goes through this; its chords are chosen to suit
 * it instead (analyse.js chordFit).
 */
export function fitToChords(part, chords) {
  if (!part || Array.isArray(part) || chords == null) return part;
  const cs = Array.isArray(chords) ? chords : [chords];
  const fit = (name, i) => {
    const sym = chordAt(cs, i);
    const m = midi(name);
    if (!grindOf(((m % 12) + 12) % 12, sym)) return name;
    const { pcs } = parseChord(sym);
    for (let d = 1; d <= 6; d++) {
      for (const x of [m + d, m - d]) if (pcs.includes(((x % 12) + 12) % 12)) return nameOf(clampMidi(x));
    }
    return name;
  };
  return { notes: part.notes.map((v, i) => (v == null ? v : Array.isArray(v) ? v.map((x) => fit(x, i)) : fit(v, i))), lens: [...part.lens],
    ...withVels(part, part.vels && [...part.vels]) };
}

/**
 * A bass kept from grinding under a melody (6 Oct 2026): a bass note with a melody note a semitone
 * above it while it sounds — a flat ninth from the bottom — plays its chord's root instead, the
 * nearer octave. A walking bass's passing note, or a pedal under a hook leaning on the note above it.
 */
export function clearUnder(bass, line, chords) {
  if (!bass || !line || Array.isArray(bass) || Array.isArray(line) || chords == null) return bass;
  const cs = Array.isArray(chords) ? chords : [chords];
  const over = (i, len) => {
    const out = [];
    line.notes.forEach((v, j) => {
      if (v != null && j < i + len && j + (line.lens[j] ?? 1) > i) out.push(...(Array.isArray(v) ? v : [v]));
    });
    return out.map(midi);
  };
  return {
    notes: bass.notes.map((v, i) => {
      if (v == null || Array.isArray(v)) return v;
      const m = midi(v);
      if (!over(i, bass.lens[i] ?? 1).some((t) => (((t - m) % 12) + 12) % 12 === 1)) return v;
      const { root } = parseChord(chordAt(cs, i));
      const below = m - ((((m - root) % 12) + 12) % 12);
      return nameOf(clampMidi(m - below <= 6 ? below : below + 12));
    }),
    lens: [...bass.lens],
    ...withVels(bass, bass.vels && [...bass.vels]),
  };
}

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
  { id: 'up', label: 'Up', note: 'Root to the top, again and again', idx: '0 1 2 3 0 1 2 3 0 1 2 3 0 1 2 3' },
  { id: 'down', label: 'Down', note: 'From the top down to the root', idx: '3 2 1 0 3 2 1 0 3 2 1 0 3 2 1 0' },
  { id: 'upDown', label: 'Up & Down', note: 'Up and back down, a wave', idx: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1' },
  { id: 'downUp', label: 'Down & Up', note: 'Down and back up', idx: '4 3 2 1 0 1 2 3 4 3 2 1 0 1 2 3' },
  { id: 'climb', label: 'Two-Octave Climb', note: 'Up through two octaves', idx: '0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7' },
  { id: 'fall', label: 'Two-Octave Fall', note: 'Down through two octaves', idx: '7 6 5 4 3 2 1 0 7 6 5 4 3 2 1 0' },
  { id: 'threes', label: 'Three Against Four', note: 'Three notes against the four-beat bar — the trance pluck', idx: '0 1 2 0 1 2 0 1 2 0 1 2 0 1 2 3' },
  { id: 'pedal', label: 'Pedal Top', note: 'A held top note between climbing ones', idx: '0 3 1 3 2 3 1 3 0 3 1 3 2 3 1 3' },
  { id: 'alberti', label: 'Alberti', note: 'Low, high, middle, high — the classical left hand', idx: '0 2 1 2 0 2 1 2 0 2 1 2 0 2 1 2' },
  { id: 'octaves', label: 'Octave Jumps', note: 'Each chord tone and its octave', idx: '0 3 0 3 1 4 1 4 2 5 2 5 1 4 1 4' },
  { id: 'leapfrog', label: 'Leapfrog', note: 'Two up, one back, climbing', idx: '0 2 1 3 2 4 3 5 4 2 3 1 2 0 1 2' },
  { id: 'eighths', label: 'Eighths', note: 'Up and down in eighths — half as busy', idx: '0 . 1 . 2 . 3 . 4 . 3 . 2 . 1 .' },
  { id: 'syncopated', label: 'Syncopated', note: 'Off the beat, with gaps — funky', idx: '0 . 2 3 . 1 2 . 3 . 4 2 . 1 3 .' },
]);

/**
 * The basslines a banger can play beyond a style's own Off-Beat and Rolling, as bassBar
 * patterns (R root, O / 8 octave, 5 fifth, 3 third, 7 seventh, `:n` a length in
 * sixteenths). `tonic` plays the home note under every chord instead of the chord's root.
 * `lift` is the busier bass a later drop moves to when Bass Lifts is on — null stays put.
 * `echo` copies the line onto a channel of its own a sixteenth late (echoPart, below).
 * Off-Beat and Rolling are the style's own rhythms; their lifts are in BASS_LIFTS.
 */
export const BASS_FIGURES = Object.freeze([
  { id: 'octaves', label: 'Octave Eighths', note: 'Root and octave in eighths — disco, eurobeat', pat: 'R:2 . O:2 . R:2 . O:2 . R:2 . O:2 . R:2 . O:2 .', lift: 'gallop' },
  { id: 'rootFifth', label: 'Root–Fifth', note: 'Root, fifth, octave, fifth — bouncing', pat: 'R:2 . 5:2 . O:2 . 5:2 . R:2 . 5:2 . O:2 . 5:2 .', lift: 'octaves' },
  { id: 'funk', label: 'Funk Syncopated', note: 'Sixteenth pushes and a seventh — funk', pat: 'R:3 . . R:1 . O:1 R:2 . . 5:1 . R:1 7:2 . 5:2 .', lift: null },
  { id: 'long808', label: 'Long 808', note: 'One long note, then a short one — trap', pat: 'R:10 . . . . . . . . . R:6 . . . . .', lift: 'offbeat' },
  { id: 'reese', label: 'Reese Drone', note: 'Two held notes a bar — dark, D&B', pat: 'R:8 . . . . . . . R:8 . . . . . . .', lift: 'octaves' },
  { id: 'gallop', label: 'Gallop', note: 'Eighth, sixteenth, sixteenth — driving', pat: 'R:2 . R:1 R:1 R:2 . R:1 R:1 R:2 . R:1 R:1 R:2 . R:1 R:1', lift: 'rolling' },
  { id: 'arpeggiated', label: 'Arpeggiated', note: 'Root, third, fifth, seventh up and back', pat: 'R:1 3:1 5:1 7:1 O:1 7:1 5:1 3:1 R:1 3:1 5:1 7:1 O:1 7:1 5:1 3:1', lift: null },
  { id: 'pedal', label: 'Pedal', note: 'The home note held under every chord', pat: 'R:8 . . . . . . . R:8 . . . . . . .', tonic: true, lift: 'reese' },
  { id: 'walking', label: 'Walking', note: 'Quarter notes through the chord tones — jazzy', pat: 'R:4 . . . 3:4 . . . 5:4 . . . 7:4 . . .', lift: 'rootFifth' },
  // The echo, a sixteenth behind, fills the gaps between the eighths: the gallop is the
  // line and its delay together, as the record does it.
  { id: 'sequencer', label: 'Sequencer', note: 'Root, octave, fifth, seventh in eighths with an echo a sixteenth behind — Munich disco', pat: 'R:1 . O:1 . 5:1 . 7:1 . R:1 . O:1 . 5:1 . 7:1 .', lift: null, echo: true },
  // A 303 line (9 Oct 2026), written by `acidLine` for the take rather than read off `pat` — the
  // pattern is only what anything that wants one figure-shaped line gets. Its accents are
  // velocities and its slides are notes held into the next, so it wants a LEGATO voice that
  // hears velocity (Acid 303).
  { id: 'acid', label: 'Acid', note: 'A 303 line in sixteenths — octave jumps, slides and accents, the same notes evolving phrase by phrase', pat: 'R:1 R:1 O:1 R:1 . R:1 7:1 R:1 R:1 5:1 R:1 . 3:1 R:1 R:1 O:1', lift: null, acid: true },
]);
export const BASS_LIFTS = Object.freeze({ offbeat: 'octaves', rolling: 'gallop' });

/**
 * ACID (9 Oct 2026, docs/LAB_STYLES_PLAN.md). One bass phrase that evolves: the rhythm and the
 * notes are drawn once for the take, and the accents and slides are drawn again every phrase, so
 * the line changes while staying the same line.
 *
 * The rhythms are sixteenths with a few rests — four of them, so a line never comes out as mush.
 * The notes are degrees over each chord's root, the bass's own tokens (bassBar): mostly the root,
 * octave jumps, the flat seventh, the fifth, now and then the third. The second bar of every pair
 * keeps the first twelve steps and turns its last four round.
 */
const ACID_RHYTHMS = [
  'x x x x . x x x x x x . x x x x',
  'x . x x x x . x x x x x x . x x',
  'x x . x x . x x x x . x x x . x',
  'x x x . x x x x . x x x . x x x',
];
const ACID_DEGREES = [['R', 9], ['O', 4], ['7', 2], ['5', 2], ['3', 1]];
/** How hard a plain note of the line is struck; an accent is 1. The preset says what that does. */
export const ACID_PLAIN = 0.62;
const weighted = (rand, table) => {
  let x = rand() * table.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of table) { if ((x -= w) < 0) return v; }
  return table[0][0];
};
/** The line's notes for the take: `{ a, b }`, sixteen degrees (or null rests) for each bar of the pair. */
export function acidLine(rand) {
  const rhythm = ACID_RHYTHMS[Math.floor(rand() * ACID_RHYTHMS.length)].split(' ');
  const a = rhythm.map((x, i) => (x === '.' ? null : i === 0 ? 'R' : weighted(rand, ACID_DEGREES)));
  const b = a.map((d, i) => (i < 12 || d == null ? d : weighted(rand, ACID_DEGREES)));
  return { a, b };
}
/**
 * One phrase's accents and slides over the line's notes. A slide needs a sounding next step at a
 * different degree, or there is nothing to glide to; accents lean off the beat.
 */
export function acidMarks(rand, degs) {
  const accent = degs.map((d, i) => d != null && rand() < (i % 4 ? 0.3 : 0.12));
  const slide = degs.map((d, i) => d != null && i < 15 && degs[i + 1] != null && degs[i + 1] !== d && rand() < 0.28);
  return { accent, slide };
}
/** A bar of the acid line over `chords`: notes, lengths (a slide held past the next onset) and velocities. */
export function acidBar(chords, degs, marks, floor = 'E1') {
  const pat = degs.map((d) => (d == null ? '.' : d)).join(' ');
  const out = bassBar(chords, pat, floor);
  out.vels = EMPTY16();
  degs.forEach((d, i) => {
    if (d == null) return;
    out.lens[i] = marks.slide[i] ? 1.3 : 0.55;
    out.vels[i] = marks.accent[i] ? 1 : ACID_PLAIN;
  });
  return out;
}

/**
 * A delay written as notes: `from`'s part in every bar copied to `to`, `steps` sixteenths
 * late, the last notes of a bar carried over the barline into the next one — but only into
 * a bar that plays `from` too, so a stop or a breakdown stays clean. Notes and lengths are
 * kept. Changes `bars` in place.
 */
export function echoPart(bars, from, to, steps = 1) {
  const echoes = bars.map(() => null);
  bars.forEach((bar, b) => {
    const src = bar?.[from];
    if (!src) return;
    src.notes.forEach((v, i) => {
      if (v == null) return;
      const at = b * 16 + i + steps;
      const tb = Math.floor(at / 16);
      if (!bars[tb]?.[from]) return;
      const out = (echoes[tb] ||= blank());
      out.notes[at % 16] = v;
      out.lens[at % 16] = src.lens[i];
      if (src.vels) (out.vels ||= EMPTY16())[at % 16] = src.vels[i];
    });
  });
  echoes.forEach((part, b) => { if (part && hasNotes(part)) bars[b][to] = part; });
}

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
        if (!lane.some(Boolean)) continue;
        sec[k] = lane.map(Boolean);
        // A ghost note is a hit struck softer (`g` in a pattern, P above).
        if (lane.some((x) => typeof x === 'number')) sec[`${k}Velocity`] = lane.map((x) => (typeof x === 'number' ? x : null));
        continue;
      }
      const pa = a || blank(); const pb = b || blank();
      if (Array.isArray(pa) || Array.isArray(pb)) throw new Error(`lane ${k} is a drum lane in one bar and melodic in another`);
      const notes = [...pa.notes, ...pb.notes].map(toHz);
      if (!notes.some((v) => v != null)) continue;
      sec[k] = notes;
      const lens = [...pa.lens, ...pb.lens].map((l, j) => (notes[j] == null ? null : l ?? null));
      if (lens.some((l) => l != null)) sec[`${k}Len`] = lens;
      // How hard each note is struck, where a part says (an acid line's accents) — see `withVels`.
      if (pa.vels || pb.vels) {
        const vels = [...(pa.vels || EMPTY16()), ...(pb.vels || EMPTY16())].map((x, j) => (notes[j] == null ? null : x ?? null));
        if (vels.some((x) => x != null)) sec[`${k}Velocity`] = vels;
      }
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
/**
 * The riser for a RISER TYPE (build-ways.js RISER_WAYS), as a song-local voice: `bpm` the song's
 * tempo, `tonic` the pitch class a tonal riser (Pitch, Fifths) lands on. The Noise Riser is `riser`'s,
 * exactly as it always was.
 */
export function riserVoice(way, bpm, tonic = 9) {
  const pc = ((tonic % 12) + 12) % 12;
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const bar = 240 / bpm;
  // Undriven, so the level is the gains' alone: each set so the riser sits where the Noise Riser does
  // on the same fader (measured 9 Oct 2026). Peter's by-ear trims on top are the fader's (build-ways.js
  // RISER_WAYS trimDb): a section gain here also reshapes its exponential swell.
  const sweep = (seconds, label, note, noise, extra = {}) => ({
    label, category: 'Sweep', homeLane: 'crash', kind: 'drum', dur: seconds, note, noise, drive: 0, peak: 0.034, ...extra,
  });
  if (way === 'long') return { ...riser(4 * bar), label: 'Long Riser' };
  // The Noise Riser, gated (fx.js RISER_GATE) — the gate takes about half of it away, so it runs hotter.
  if (way === 'stutter') {
    const r = riser(2 * bar);
    return { ...r, label: 'Stutter Riser', note: `${r.note} Chopped by a quickening gate.`, noise: { ...r.noise, gain: 1.5 } };
  }
  if (way === 'whoosh') {
    const s = bar;
    return sweep(s, 'Whoosh', `White noise rushing 600 Hz to 12 kHz over ${s.toFixed(2)}s.`,
      { type: 'bandpass', freq: 600, to: 12000, sweep: s, Q: 1.2, slope: -24, color: 'white', attack: s * 0.85, hold: 0, decay: s * 0.15, curve: 'exp', gain: 0.95 });
  }
  if (way === 'wind') {
    const s = 2 * bar;
    return sweep(s, 'Wind', `Pink noise through a low-pass opening 300 Hz to 9 kHz over ${s.toFixed(2)}s.`,
      { type: 'lowpass', freq: 300, to: 9000, sweep: s, Q: 2.5, slope: -24, color: 'pink', attack: s * 0.95, hold: 0, decay: s * 0.05, curve: 'exp', gain: 0.12 });
  }
  if (way === 'fifths') {
    // Two saws a fifth apart, climbing together to the root and fifth of the chord to come.
    const s = 2 * bar;
    const from = 36 + pc;
    const saw = (m) => ({ type: 'sawtooth', from: hz(m), to: hz(m + 36), sweep: s, pitchCurve: 'exp', attack: s * 0.9, hold: 0, decay: s * 0.1, curve: 'exp', gain: 0.16 });
    return sweep(s, 'Fifths Riser', `Two saws a fifth apart climbing three octaves to the chord to come over ${s.toFixed(2)}s, over a little noise.`,
      { type: 'bandpass', freq: 250, to: 8000, sweep: s, Q: 1.6, slope: -24, color: 'white', attack: s * 0.92, hold: 0, decay: s * 0.08, curve: 'exp', gain: 0.3 },
      { osc: saw(from), osc2: saw(from + 7) });
  }
  if (way === 'pitch') {
    const s = 2 * bar;
    const from = 36 + pc;
    return sweep(s, 'Pitch Riser', `A saw climbing three octaves to the home note over ${s.toFixed(2)}s, over a little noise.`,
      { type: 'bandpass', freq: 250, to: 8000, sweep: s, Q: 1.6, slope: -24, color: 'white', attack: s * 0.92, hold: 0, decay: s * 0.08, curve: 'exp', gain: 0.37 },
      { osc: { type: 'sawtooth', from: hz(from), to: hz(from + 36), sweep: s, pitchCurve: 'exp', attack: s * 0.9, hold: 0, decay: s * 0.1, curve: 'exp', gain: 0.22 } });
  }
  if (way === 'reverse') {
    const s = bar / 2;
    return sweep(s, 'Reverse Cymbal', `Bright noise swelling into the downbeat over ${s.toFixed(2)}s.`,
      { type: 'highpass', freq: 2500, to: 9000, sweep: s, Q: 0.9, slope: -24, color: 'white', attack: s * 0.97, hold: 0, decay: s * 0.03, curve: 'exp', gain: 0.4 });
  }
  return riser(2 * bar);
}

/**
 * Drop Hit's Sub Drop (build-ways.js DROP_HIT_WAYS): a sine from the home note (`tonic`, a pitch class)
 * an octave under middle C, falling two octaves over most of a bar, with a short dark noise thump.
 */
export function subDropVoice(bpm, tonic = 9) {
  const s = Math.min(2.4, 240 / bpm);
  const from = 440 * 2 ** ((48 + (((tonic % 12) + 12) % 12) - 69) / 12);
  return {
    label: 'Sub Drop', category: 'Impact', homeLane: 'tom', kind: 'drum', dur: s,
    note: `A sine falling two octaves from the home note over ${s.toFixed(2)}s, a dark thump on the front.`,
    // Levelled to sit where the style's own impacts do on the same fader (measured 9 Oct 2026).
    osc: { type: 'sine', from, to: from / 4, sweep: s * 0.85, pitchCurve: 'exp', attack: 0.002, hold: 0.04, decay: s, curve: 'exp', gain: 0.03 },
    noise: { type: 'lowpass', freq: 2500, to: 150, sweep: 0.3, Q: 0.7, slope: -12, color: 'white', attack: 0.001, hold: 0, decay: 0.3, curve: 'exp', gain: 0.0075 },
    drive: 0, peak: 0.034,
  };
}

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
