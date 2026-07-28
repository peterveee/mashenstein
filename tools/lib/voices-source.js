// Reading and rewriting src/data/voices.js as SOURCE, so the desk can author presets.
//
// The voice library is a hand-written file: prose notes, section comments, and a
// running argument with itself about why each sound exists. That is worth keeping.
// So the editor does not re-emit the file — it replaces ONE ENTRY at a time, in
// place, and leaves every byte around it alone. A saved preset shows up in `git diff`
// as the four lines that changed, which is the only way a generated edit to a
// hand-written file stays reviewable.
//
// Two machine-owned blocks already work this way: PEAKS and LANE_TARGETS are rewritten
// wholesale by tools/measure-voices.js and say so in a comment. This module adds the
// third move — a single peak spliced into PEAKS without disturbing the other hundred —
// so saving one preset does not require re-measuring the entire library.
//
// Nothing here parses JavaScript. It scans for the span of one entry, which needs
// only brace matching that knows about strings and comments; the file is data, and
// data with no expressions in it can be found without a parser.
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const VOICES_PATH = join(ROOT, 'src/data/voices.js');

/** The tables an editor may write to. ENGINE is bank keys the engine reads — see below. */
export const TABLES = { tone: 'TONE', noise: 'NOISE', drum: 'DRUM' };

// ---- scanning ---------------------------------------------------------------

/**
 * Walk `src` from `i`, which must be at an opening brace or bracket, and return the
 * index just past its match.
 *
 * Strings and comments are tracked because both can hold braces — the catalogue's
 * notes talk about "the 303 move" and its section rules are made of slashes — and a
 * scanner that counted those would close an entry in the middle of a sentence.
 */
function matchBrace(src, i) {
  const open = src[i];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  for (let n = i; n < src.length; n++) {
    const c = src[n];
    if (c === '\'' || c === '"' || c === '`') {
      // Skip the string. A backslash escapes the next character, including the quote.
      const quote = c;
      for (n++; n < src.length; n++) {
        if (src[n] === '\\') { n++; continue; }
        if (src[n] === quote) break;
      }
      continue;
    }
    if (c === '/' && src[n + 1] === '/') { n = src.indexOf('\n', n); if (n < 0) return -1; continue; }
    if (c === '/' && src[n + 1] === '*') { n = src.indexOf('*/', n); if (n < 0) return -1; n++; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (!depth) return n + 1; }
  }
  return -1;
}

/** The body span of a top-level table: `const TONE = {` … the matching `}`. */
function tableSpan(src, name) {
  const m = new RegExp(`\\bconst ${name} = \\{`).exec(src);
  if (!m) throw new Error(`src/data/voices.js has no ${name} table`);
  const open = m.index + m[0].length - 1;
  const end = matchBrace(src, open);
  if (end < 0) throw new Error(`${name} is not closed — refusing to edit a file that will not parse`);
  return { open, end, inner: [open + 1, end - 1] };
}

/**
 * Every entry in a table, as `{ id, start, end }` — spans that include the trailing
 * comma, so removing one leaves no orphan.
 *
 * Only keys at the table's own depth count. A preset's `options` holds `oscillator:
 * { … }`, which looks exactly like an entry to anything not counting braces.
 */
export function entriesIn(src, name) {
  const { inner } = tableSpan(src, name);
  const [from, to] = inner;
  const out = [];
  for (let n = from; n < to; n++) {
    const c = src[n];
    if (c === '\'' || c === '"' || c === '`') {
      const quote = c;
      for (n++; n < to; n++) { if (src[n] === '\\') { n++; continue; } if (src[n] === quote) break; }
      continue;
    }
    if (c === '/' && src[n + 1] === '/') { n = src.indexOf('\n', n); continue; }
    if (c === '/' && src[n + 1] === '*') { n = src.indexOf('*/', n) + 1; continue; }
    if (c === '{' || c === '[') { n = matchBrace(src, n) - 1; continue; }
    // A key at this depth: an identifier, a colon, then the value.
    const key = /^([A-Za-z_$][\w$]*)\s*:\s*\{/.exec(src.slice(n, n + 120));
    if (!key) continue;
    const brace = src.indexOf('{', n + key[1].length);
    const close = matchBrace(src, brace);
    if (close < 0) break;
    // Take the comma with it, and the newline after that, so a delete closes the gap.
    let end = close;
    if (src[end] === ',') end++;
    out.push({ id: key[1], start: n, end });
    n = end - 1;
  }
  return out;
}

/** Which table an id lives in, or null if it is not in the file. */
export function tableOf(src, id) {
  for (const name of Object.values(TABLES)) {
    if (entriesIn(src, name).some((e) => e.id === id)) return name;
  }
  return null;
}

// ---- emitting ---------------------------------------------------------------

// Trailing float noise is the enemy of a reviewable diff: a slider that lands on
// 0.30000000000000004 should be written as 0.3. Six places is finer than any control
// on the desk and coarse enough to never print an artefact.
const num = (n) => {
  const r = Number(n.toFixed(6));
  return Object.is(r, -0) ? 0 : r;
};

/**
 * A string, in the file's own idiom.
 *
 * The notes are prose and they run long, so the catalogue breaks them across lines
 * with `+`. Emitting one line of 300 characters would be valid and would also be the
 * single ugliest line in the repo, so a long note is wrapped the way the hand-written
 * ones are — at word boundaries, continued at `indent + 2`.
 */
function str(s, indent = 0, width = 92) {
  const quote = (t) => `'${t.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
  const pad = ' '.repeat(indent);
  if (indent + s.length + 2 <= width) return quote(s);
  const words = s.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    // The `+ ` prefix and the closing quote both have to fit, hence the slack.
    if (line && indent + line.length + w.length + 6 > width) { lines.push(line); line = ''; }
    line += (line ? ' ' : '') + w;
  }
  if (line) lines.push(line);
  // Every line but the last keeps its trailing space: the pieces are concatenated,
  // and a join that drops the space between them silently welds two words together.
  return lines
    .map((l, i) => (i === lines.length - 1 ? quote(l) : quote(`${l} `)))
    .map((l, i) => (i ? `${pad}  + ${l}` : l))
    .join('\n');
}

// Tone's own parameter names are all bare identifiers; a preset that grew one that is
// not would still have to be valid source.
const key = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));

/** A value, flat: `{ type: 'lowpass', Q: 1.2 }`. Used for the leaf objects. */
function flat(v) {
  if (v === null) return 'null';
  if (typeof v === 'string') return str(v);
  if (typeof v === 'number') return String(num(v));
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map(flat).join(', ')}]`;
  const body = Object.entries(v)
    .filter(([, x]) => x !== undefined)
    .map(([k, x]) => `${key(k)}: ${flat(x)}`)
    .join(', ');
  return body ? `{ ${body} }` : '{}';
}

/**
 * `options`, which is the one nested part: a line per top-level parameter, so an
 * envelope reads as an envelope rather than as a paragraph.
 */
function optionsBlock(options, indent = 4) {
  const pad = ' '.repeat(indent);
  const rows = Object.entries(options)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${pad}  ${key(k)}: ${flat(v)},`);
  return `{\n${rows.join('\n')}\n${pad}}`;
}

// The identity scalars, which share the head line the way the hand-written entries do:
// what it is called, where it files, what builds it, how long it rings.
const HEAD = ['label', 'category', 'lanes', 'synth', 'dur', 'velocity'];

// Everything that gets a line of its own, in the order it is worth reading: what the
// sound is for, where it came from, then how it is built. `taps` and `tapFalloff`
// share a line — they are two halves of one idea and both are short.
const BODY = ['note', 'origin', 'options', 'osc', 'noise', 'body', 'drive', 'taps', 'tapFalloff'];

/**
 * One catalogue entry, as source, indented to sit in a table.
 *
 * Deliberately shaped like the hand-written entries rather than like JSON: the head
 * line carries the identity, the note gets its own lines, and the shape of the sound
 * follows. A preset saved from the desk should be indistinguishable from one typed in.
 */
export function emitEntry(id, preset) {
  const v = { ...preset };
  delete v.id; delete v.kind; delete v.peak;   // derived at load; never written here
  const has = (k) => v[k] !== undefined;

  const head = HEAD.filter(has).map((k) => `${key(k)}: ${flat(v[k])}`).join(', ');
  const lines = [head ? `  ${id}: { ${head},` : `  ${id}: {`];

  if (has('note')) lines.push(`    note: ${str(v.note, 4)},`);
  if (has('origin')) lines.push(`    origin: ${str(v.origin, 4)},`);
  if (has('options')) lines.push(`    options: ${optionsBlock(v.options)},`);
  if (has('osc')) lines.push(`    osc: ${flat(v.osc)},`);
  if (has('noise')) lines.push(`    noise: ${flat(v.noise)},`);
  if (has('body')) lines.push(`    body: ${flat(v.body)},`);
  if (has('drive')) lines.push(`    drive: ${flat(v.drive)},`);
  // The two tap keys travel together and are short — one line reads better than two.
  const taps = ['taps', 'tapFalloff'].filter(has).map((k) => `${k}: ${flat(v[k])}`);
  if (taps.length) lines.push(`    ${taps.join(', ')},`);
  // Anything this module has never heard of, so a key added to the catalogue by hand
  // survives being saved from the desk rather than being quietly dropped.
  for (const k of Object.keys(v)) {
    if (!HEAD.includes(k) && !BODY.includes(k)) lines.push(`    ${key(k)}: ${flat(v[k])},`);
  }

  // Close on the last line, the way the file does, rather than on a line of its own.
  const last = lines.length - 1;
  lines[last] = `${lines[last].replace(/,$/, '')} },`;
  return lines.join('\n');
}

// ---- writing ----------------------------------------------------------------

/**
 * Add or replace one preset, returning the new source.
 *
 * An existing id is replaced where it stands — a preset keeps its place among its
 * neighbours and its section comment, and the diff is the entry. A new one is
 * appended to the end of its table, which is the only place a new entry can go that
 * does not claim to belong to a section someone else wrote.
 */
export function upsertPreset(src, id, preset, table) {
  if (!/^[A-Za-z_$][\w$]*$/.test(id)) throw new Error(`"${id}" is not usable as a preset id`);
  const name = table || tableOf(src, id);
  if (!name) throw new Error(`no table given for the new preset "${id}"`);
  const existing = entriesIn(src, name).find((e) => e.id === id);
  const body = emitEntry(id, preset);
  if (existing) {
    return src.slice(0, existing.start) + body.trimStart() + src.slice(existing.end);
  }
  // Appended before the table's closing brace, on its own line.
  const { end } = tableSpan(src, name);
  const at = src.lastIndexOf('\n', end - 1) + 1;
  return `${src.slice(0, at)}${body}\n${src.slice(at)}`;
}

/** Remove a preset and its peak. Returns the new source. */
export function deletePreset(src, id) {
  const name = tableOf(src, id);
  if (!name) throw new Error(`"${id}" is not in the catalogue`);
  const e = entriesIn(src, name).find((x) => x.id === id);
  // The span starts at the id, so the indentation in front of it is not part of it —
  // and left behind, that indentation lands on whatever line follows. Deleting the
  // last entry in a table is what makes it visible: the table's own `};` ends up
  // indented under the entry that used to be there.
  let start = e.start;
  while (start > 0 && (src[start - 1] === ' ' || src[start - 1] === '\t')) start--;
  // And take the line ending with it, or a delete leaves a blank line behind and a
  // table edited a few times becomes a column of gaps.
  let end = e.end;
  while (src[end] === ' ' || src[end] === '\t') end++;
  if (src[end] === '\n') end++;
  return setPeak(src.slice(0, start) + src.slice(end), id, null);
}

/**
 * Write one measured peak into the PEAKS block, leaving the other hundred alone.
 *
 * The block is reflowed rather than patched in place: it is packed to 80 columns by
 * tools/measure-voices.js, so a longer number in the middle would push the line over
 * and a shorter one would leave it ragged. Same packing, same result — running the
 * full measure after this changes nothing but the numbers it re-measured.
 *
 * `peak === null` removes the entry, which is what a deleted preset needs.
 */
export function setPeak(src, id, peak) {
  const m = /const PEAKS = \{([\s\S]*?)\n\};/.exec(src);
  if (!m) throw new Error('src/data/voices.js has no PEAKS block');
  const peaks = {};
  for (const [, k, v] of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*:\s*(-?[\d.eE+-]+)/g)) {
    peaks[k] = Number(v);
  }
  if (peak === null) delete peaks[id]; else peaks[id] = Number(peak.toFixed(4));

  const rows = [];
  let line = ' ';
  for (const [k, p] of Object.entries(peaks)) {
    const piece = ` ${k}: ${p},`;
    if (line.length + piece.length > 80) { rows.push(line); line = ' '; }
    line += piece;
  }
  rows.push(line.replace(/,$/, ''));
  return src.replace(/const PEAKS = \{[\s\S]*?\n\};/, () => `const PEAKS = {\n${rows.join('\n')}\n};`);
}

export const readVoicesSource = () => readFileSync(VOICES_PATH, 'utf8');
export const writeVoicesSource = (src) => writeFileSync(VOICES_PATH, src);
