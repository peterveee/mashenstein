// Writing a bank back out as readable source — for the one-file-per-song migration,
// and for anything later that has to freeze a computed song into a written one.
//
// The banks are authored in `seq('A2 . A2 .')` shorthand, and anything this writes
// should read like the ones a person wrote. But a lane is only shorthand-able if
// every value in it IS a note: megamix carries 1524 frequencies of which 155 do not
// round-trip through a note name at all (it holds bare numbers like `15` that are
// parameters, not pitches). So every lane is CHECKED before it is prettified —
// serialise, parse back, compare — and falls back to raw numbers when it is not
// exactly recoverable.
//
// The rule this file exists to keep: what comes back must equal what went in. A
// song that reads beautifully and plays differently is worse than an ugly array.
import { noteName, n, chord } from '../../src/engine/notes.js';

const NOTE_RE = /^[A-G]#?-?\d+$/;

/** `A2` if that name resolves back to exactly this frequency, else null. */
function exactName(hz) {
  if (typeof hz !== 'number' || !(hz > 0)) return null;
  const name = noteName(hz);
  if (!name || !NOTE_RE.test(name)) return null;
  return n(name) === hz ? name : null;
}

/** `A3min7` if that chord name resolves back to exactly these frequencies. */
function exactChord(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const root = exactName(list[0]);
  if (!root) return null;
  for (const q of ['', 'min7', 'maj7', 'min', 'maj', '9', '7']) {
    const name = `${root}${q}`;
    const back = chord(name);
    if (back && back.length === list.length && back.every((v, i) => v === list[i])) return name;
  }
  return null;
}

// Percussion needs at least one real boolean in it. A lane of 32 nulls is SILENCE —
// a melodic lane that plays nothing — and `.map((v) => !!v)` would turn every one of
// those nulls into `false`, which is a different value and a different file.
const isPerc = (arr) => arr.some((v) => v === true || v === false)
  && arr.every((v) => v === true || v === false || v == null);
const isChordLane = (arr) => arr.some((v) => Array.isArray(v));

/** 32 tokens as two bars, the way the hand-written banks are laid out. */
const twoBars = (toks) => `${toks.slice(0, 16).join(' ')} | ${toks.slice(16).join(' ')}`;

/**
 * One lane, as source. Shorthand when it round-trips exactly, a raw array when it
 * does not — and the raw form is still correct, just less pretty.
 */
export function laneSource(arr) {
  if (!Array.isArray(arr)) return null;
  if (arr.length !== 32) return JSON.stringify(arr);

  if (isPerc(arr)) {
    // Percussion is booleans. `seq(...).map((v) => !!v)` is how every bank spells it.
    const toks = arr.map((v) => (v ? 'C1' : '.'));
    return `seq('${twoBars(toks)}').map((v) => !!v)`;
  }

  if (isChordLane(arr)) {
    const toks = [];
    for (const v of arr) {
      if (v == null) { toks.push('.'); continue; }
      const name = Array.isArray(v) ? exactChord(v) : null;
      if (!name) return JSON.stringify(arr);
      toks.push(name);
    }
    return `chordSeq('${twoBars(toks)}')`;
  }

  const toks = [];
  for (const v of arr) {
    if (v == null) { toks.push('.'); continue; }
    const name = exactName(v);
    if (!name) return JSON.stringify(arr);   // not a pitch — keep the number
    toks.push(name);
  }
  return `seq('${twoBars(toks)}')`;
}

const isLane = (v) => Array.isArray(v) && v.length === 32
  && v.every((x) => x == null || typeof x === 'number' || typeof x === 'boolean' || Array.isArray(x));

function valueSource(v, indent) {
  if (v === null) return 'null';
  if (Array.isArray(v)) {
    if (isLane(v)) return laneSource(v);
    // A list of objects — `sections`, most of the time. Recursed rather than
    // stringified: a section is a partial bank full of lanes, and dumping the lot as
    // one JSON line puts the whole song on one unreadable row. That is the opposite
    // of the reason these files exist.
    if (v.length && v.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
      const inner = `${indent}  `;
      return `[\n${v.map((x) => `${inner}${objectSource(x, inner)},`).join('\n')}\n${indent}]`;
    }
    return JSON.stringify(v);
  }
  if (typeof v === 'object') return objectSource(v, indent);
  return JSON.stringify(v);
}

function objectSource(obj, indent = '  ') {
  const inner = `${indent}  `;
  const lines = Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${inner}${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${valueSource(v, inner)},`);
  return `{\n${lines.join('\n')}\n${indent}}`;
}

/** A whole bank as source, sections and order included. */
export function bankSource(bank, indent = '') {
  return objectSource(bank, indent);
}

/**
 * One song, one file.
 *
 * Above the marker is the music, which is the song as composed — hand-written for
 * the songs that were, frozen from what it computed for the ones that were not.
 * Below it is what the desk writes. The desk rewrites only that half, so a comment
 * anybody adds to the music stays where it was put.
 */
export function songFile({ id, title, slug, group, bank, mix, arrangement, note, seed }) {
  const head = `// ${title} — one song: what it plays, how it is arranged, how it sounds.\n`
    + `//\n`
    + (note ? `${note.split('\n').map((l) => `// ${l}`).join('\n')}\n//\n` : '')
    + `// The music below is the composition. Everything under THE DESK WRITES BELOW HERE\n`
    + `// is written by \`npm run mixer\` and will be rewritten on every save — put notes\n`
    + `// about the song up here, where they survive.\n`
    + `import { seq, chordSeq } from '../../engine/notes.js';\n\n`
    + `export const id = ${JSON.stringify(id)};\n`
    + `export const title = ${JSON.stringify(title)};\n`
    + `export const slug = ${JSON.stringify(slug)};\n`
    + `export const group = ${JSON.stringify(group)};\n`
    + (seed == null ? '' : `export const seed = ${JSON.stringify(seed)};\n`)
    + `\n`
    + `export const bank = ${bankSource(bank)};\n\n`;

  const tail = `// ---- THE DESK WRITES BELOW HERE ----------------------------------------------\n`
    + `// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,\n`
    + `// and nothing above it is ever touched by the desk.\n\n`
    + `export const mix = ${mix ? objectSource(mix, '') : 'null'};\n\n`
    + `export const arrangement = ${arrangement ? objectSource(arrangement, '') : 'null'};\n`;

  return head + tail;
}

export const DESK_MARKER = '// ---- THE DESK WRITES BELOW HERE';
