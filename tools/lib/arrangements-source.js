// Writing src/data/arrangements.js — the counterpart of `renderMixFile` in
// tools/mixer.js, and split out here for the same reason voices-source.js is: the
// server should not also be a code generator.
//
// Emitted as readable source rather than JSON.stringify'd, because this file is
// committed and reviewed in a diff. An arrangement is mostly a line of numbers —
// `order: [0, 0, { s: 1, bars: 1, off: ['snare'] }, 1, 2, 3]` — and that line IS the
// edit: which bars play, in which order, with what dropped out of them. A blob would
// hide it.
//
// Only songs carrying real decisions are written. A song that was opened on the desk
// and not arranged leaves no entry, so deleting an entry reverts a song exactly.
import { readFileSync, existsSync } from 'fs';

const round = (n) => Math.round(n * 1000) / 1000;

/**
 * One step of a lane. Types are preserved exactly, which matters: a percussion lane
 * holds `true`, a melodic one a frequency, a chord an array of them, and a rest
 * null. Writing a hit as `1` would sound identical and still be a different file
 * from the one that was saved.
 */
const fmtStep = (v) => {
  if (v == null) return 'null';
  if (v === true || v === false) return String(v);
  if (Array.isArray(v)) return `[${v.map((x) => round(x)).join(', ')}]`;
  return String(round(v));
};

/**
 * A 32-step lane, as one line.
 *
 * A plain array, not `seq('C1 . . .')`: seq CYCLES its tokens to fill 32 steps, so a
 * line a person wrote is four tokens where a machine's is always thirty-two.
 * Printing this as seq would dress up a generated line as an authored one — and the
 * whole reason this file exists is that the authored ones live elsewhere and are
 * never rewritten.
 */
const fmtLane = (arr) => `[${Array.from({ length: 32 }, (_, i) => fmtStep(arr[i])).join(', ')}]`;

const fmtOrderEntry = (e) => {
  if (typeof e === 'number') return String(e);
  const bits = [`s: ${e.s}`];
  if (e.bars != null && e.bars !== 2) bits.push(`bars: ${e.bars}`);
  if (e.from) bits.push(`from: ${e.from}`);
  // Spaced and single-quoted, like the examples in the file's own header and like
  // every hand-written line in the banks. `JSON.stringify` would pack it to
  // `["clap","crash"]`, which is correct and reads like a log line.
  if (e.off && e.off.length) bits.push(`off: [${e.off.map((k) => `'${k}'`).join(', ')}]`);
  return `{ ${bits.join(', ')} }`;
};

/**
 * A layer section. `base` first, because it says what the rest of the line is
 * relative to — a section that inherits everything except its lead is one line
 * naming one lane, and that is the whole point of the format.
 */
function fmtSection(sec) {
  const parts = [];
  if (sec.base != null) parts.push(`base: ${sec.base}`);
  for (const [k, v] of Object.entries(sec)) {
    if (k === 'base') continue;
    if (Array.isArray(v)) parts.push(`${k}: ${fmtLane(v)}`);
    else if (v == null) parts.push(`${k}: null`);
    else if (typeof v === 'number') parts.push(`${k}: ${round(v)}`);
    else parts.push(`${k}: ${JSON.stringify(v)}`);
  }
  return `{ ${parts.join(', ')} }`;
}

// Everything from here down in src/data/arrangements.js is hand-written code —
// `orderOf`, `expandOrder`, `resolveSection`, `applyArrangement` — and has to be
// copied through untouched. mix.js has the same split at `export const LANE_DEFAULTS`;
// this one is an explicit marker rather than a declaration, because the code below it
// will grow and the boundary should not depend on which function happens to be first.
const TAIL_MARKER = '// ---- THE FORMAT, IN CODE';

/**
 * The whole file: the documented header, the generated object, and the file's own
 * code beneath it — the last two of those read back off disk, so a save rewrites the
 * arrangements and nothing else. A generator that ate either half would leave nobody
 * able to read the file it writes, or nothing able to run it.
 */
export function renderArrangementsFile(arrangements, path) {
  const src = path && existsSync(path) ? readFileSync(path, 'utf8') : '';
  const header = src ? src.split('export const ARRANGEMENTS')[0] : '';
  const marker = src.indexOf(TAIL_MARKER);
  const tail = marker >= 0 ? `\n${src.slice(marker)}` : '';
  const ids = Object.keys(arrangements || {}).sort();
  let body = '';
  for (const id of ids) {
    const entry = arrangements[id];
    if (!entry) continue;
    const order = entry.order || [];
    const sections = entry.sections || [];
    // A song with neither is a song nobody arranged. Skipped rather than written as
    // an empty object, so the file holds decisions and nothing else.
    if (!order.length && !sections.length) continue;
    body += `  ${JSON.stringify(id)}: {\n`;
    if (order.length) {
      // Wrapped at eight entries a line: an order is read as a shape — where the
      // build-ups are, where the breakdown is — and a single 44-entry line is not a
      // shape anybody can see. `finale` is 44 blocks long.
      const toks = order.map(fmtOrderEntry);
      const lines = [];
      for (let i = 0; i < toks.length; i += 8) lines.push(toks.slice(i, i + 8).join(', '));
      body += `    order: [\n      ${lines.join(',\n      ')},\n    ],\n`;
    }
    if (sections.length) {
      body += `    sections: [\n${sections.map((s) => `      ${fmtSection(s)},\n`).join('')}    ],\n`;
    }
    body += '  },\n';
  }
  return `${header}export const ARRANGEMENTS = {\n${body}};\n${tail}`;
}
