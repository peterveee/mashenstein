// One-time migration: 34 songs, spread across three files, become one file each.
//
//   node tools/migrate-songs.js [--write]
//
// Without --write it reports what it would do and verifies it, touching nothing.
//
// Two ways in, because the songs are two kinds:
//
//   MOVED   The 12 hand-authored banks — 9 cabinets, hub, title, finale. Their
//           source text is cut out and pasted across, so `seq('A2 . A2 .')`, the
//           arc comments and the per-section notes all survive exactly as written.
//   FROZEN  The 22 computed ones — the shop auditions built by `counterPair`, and
//           megamix, which derives itself from the cabinets. There is no authored
//           text to move, so their current value is serialised into readable source
//           (tools/lib/song-source.js) and frozen there.
//
// Either way the result is CHECKED: every song is imported back and deep-compared
// against what it was before the migration. A song that does not match exactly is
// reported and written as a frozen serialisation instead, which is always exact.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { songFile, bankSource } from './lib/song-source.js';
import { listTracks, resolveTrack } from '../src/data/tracks.js';
import { MIX } from '../src/data/mix.js';
import { ARRANGEMENTS } from '../src/data/arrangements.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/data/songs');
const WRITE = process.argv.includes('--write');

const cabinetsSrc = readFileSync(join(ROOT, 'src/data/cabinets.js'), 'utf8');

/** From `{` at `open`, the index just past its matching `}` — strings and comments aware. */
function matchBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      for (i++; i < src.length; i++) { if (src[i] === '\\') i++; else if (src[i] === q) break; }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}

/** The run of `//` comment lines immediately above `at`, as prose. */
function commentAbove(src, at) {
  const lines = src.slice(0, at).split('\n');
  const out = [];
  for (let i = lines.length - 2; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.startsWith('//')) break;
    out.unshift(line.replace(/^\/\/ ?/, ''));
  }
  return out.join('\n');
}

/** A cabinet's `music: { … }` block, as the text it was written as. */
function cabinetBank(id) {
  const at = cabinetsSrc.indexOf(`id: '${id}'`);
  if (at < 0) return null;
  const key = cabinetsSrc.indexOf('music: {', at);
  if (key < 0) return null;
  const open = cabinetsSrc.indexOf('{', key);
  const end = matchBrace(cabinetsSrc, open);
  if (end < 0) return null;
  return { text: cabinetsSrc.slice(open, end), note: commentAbove(cabinetsSrc, key) };
}

/** A named theme — `export const HUB_THEME = { … };` */
function namedBank(constName) {
  const decl = `export const ${constName} = {`;
  const at = cabinetsSrc.indexOf(decl);
  if (at < 0) return null;
  const open = cabinetsSrc.indexOf('{', at);
  const end = matchBrace(cabinetsSrc, open);
  if (end < 0) return null;
  return { text: cabinetsSrc.slice(open, end), note: commentAbove(cabinetsSrc, at) };
}

/**
 * A whole `const … = …;` declaration from `at`, however many lines it runs to.
 *
 * Not a line: `FT_DROP_BASE` is an object spanning six of them, and taking the first
 * line of it produced `const FT_DROP_BASE = {` — a file that will not parse, which
 * is at least the failure that says so immediately.
 */
function declarationAt(src, at) {
  let depth = 0;
  for (let i = at; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { const nl = src.indexOf('\n', i); if (nl < 0) break; i = nl; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      for (i++; i < src.length; i++) { if (src[i] === '\\') i++; else if (src[i] === q) break; }
      continue;
    }
    if ('{(['.includes(c)) depth++;
    else if ('})]'.includes(c)) depth--;
    else if (c === ';' && depth === 0) {
      // Take the trailing comment on that line too — it is part of what was written.
      const nl = src.indexOf('\n', i);
      return src.slice(at, nl < 0 ? i + 1 : nl);
    }
  }
  return null;
}

/**
 * The `const HT_… = …;` helpers a moved block leans on, copied with it.
 *
 * Resolved repeatedly, because a helper can lean on another: FINALE_THEME's sections
 * spread `FT_DROP_BASE`, which is itself built out of `FT_BASS` and friends.
 */
function helpersFor(text) {
  const names = [];
  const lines = [];
  const seen = new Set();
  let pending = [...new Set([...text.matchAll(/\b((?:HT|FT)_[A-Z0-9_]+)\b/g)].map((m) => m[1]))];
  while (pending.length) {
    const name = pending.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const at = cabinetsSrc.indexOf(`const ${name} = `);
    if (at < 0) continue;
    const decl = declarationAt(cabinetsSrc, at);
    if (!decl) continue;
    names.push(name);
    lines.push(decl);
    // Whatever this one refers to has to come with it.
    for (const m of decl.matchAll(/\b((?:HT|FT)_[A-Z0-9_]+)\b/g)) if (!seen.has(m[1])) pending.push(m[1]);
  }
  // Declaration order, as they appear in the file: a helper that spreads another has
  // to be defined after it.
  lines.sort((a, b) => cabinetsSrc.indexOf(a) - cabinetsSrc.indexOf(b));
  return { names, lines };
}

const MOVED = {
  hub: 'HUB_THEME', title: 'TITLE_THEME', finale: 'FINALE_THEME',
};

const rows = listTracks();
const before = new Map();
for (const row of rows) before.set(row.id, JSON.stringify(resolveTrack(row.id).bank));

mkdirSync(OUT, { recursive: true });
const report = [];

for (const row of rows) {
  const track = resolveTrack(row.id);
  const meta = { id: row.id, title: track.title, slug: track.slug, group: row.group };
  let src = null;
  let how = 'frozen';

  const moved = MOVED[row.id] ? namedBank(MOVED[row.id]) : cabinetBank(row.id);
  if (moved) {
    const { names, lines } = helpersFor(moved.text);
    const usesPercOff = /\bPERC_OFF\b/.test(moved.text);
    const head = `// ${track.title} — one song: what it plays, how it is arranged, how it sounds.\n//\n`
      + (moved.note ? `${moved.note.split('\n').map((l) => `// ${l}`).join('\n')}\n//\n` : '')
      + `// Moved here verbatim from src/data/cabinets.js — the notes, the shorthand and\n`
      + `// the comments are exactly as they were written. Everything under THE DESK\n`
      + `// WRITES BELOW HERE is machine-written and rewritten on every save.\n`
      + `import { seq, chordSeq } from '../../engine/notes.js';\n`
      + (usesPercOff ? `import { PERC_OFF } from './shared.js';\n` : '')
      + `\nexport const id = ${JSON.stringify(row.id)};\n`
      + `export const title = ${JSON.stringify(track.title)};\n`
      + `export const slug = ${JSON.stringify(track.slug)};\n`
      + `export const group = ${JSON.stringify(row.group)};\n\n`
      + (lines.length ? `${lines.join('\n')}\n\n` : '')
      // Dedented by the four spaces it sat at inside a cabinet object, so the song
      // reads from the left margin in its own file.
      + `export const bank = ${moved.text.replace(/\n {4}/g, '\n')};\n\n`;
    src = head
      + `// ---- THE DESK WRITES BELOW HERE ----------------------------------------------\n`
      + `// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.\n\n`
      + `export const mix = ${MIX[row.id] ? bankSource(MIX[row.id]) : 'null'};\n\n`
      + `export const arrangement = ${ARRANGEMENTS[row.id] ? bankSource(ARRANGEMENTS[row.id]) : 'null'};\n`;
    how = names.length ? `moved (+${names.length} helpers)` : 'moved';
  } else {
    src = songFile({ ...meta, bank: track.bank, mix: MIX[row.id] || null,
      arrangement: ARRANGEMENTS[row.id] || null,
      note: row.id === 'megamix'
        ? 'FROZEN. This was computed from the cabinets at import time — it lifted their\nmelodies and rebuilt them into 32 sections. It is written out here as it stood,\nso it no longer follows edits to the songs it was made from.'
        : 'Frozen from the counterPair factory it used to be built by, so this song is\nnow its own: editing it changes nothing else.' });
  }

  report.push({ id: row.id, how, bytes: src.length });
  if (WRITE) writeFileSync(join(OUT, `${row.id}.js`), src);
}

if (WRITE) {
  writeFileSync(join(OUT, 'shared.js'),
    `// The one musical constant more than one song uses. Everything else a song needs\n`
    + `// lives in the song's own file.\n`
    + `import { seq } from '../../engine/notes.js';\n\n`
    + `// A silent percussion lane, for a section that switches a drum off.\n`
    + `export const PERC_OFF = seq('.').map((v) => !!v);\n`);
}

// ---- verify ------------------------------------------------------------------
let exact = 0;
const broken = [];
if (WRITE) {
  for (const row of rows) {
    const path = join(OUT, `${row.id}.js`);
    if (!existsSync(path)) { broken.push(`${row.id}: not written`); continue; }
    let mod;
    try { mod = await import(`${pathToFileURL(path).href}?v=${Date.now()}`); }
    catch (err) { broken.push(`${row.id}: will not load — ${err.message}`); continue; }
    if (JSON.stringify(mod.bank) === before.get(row.id)) exact++;
    else broken.push(`${row.id}: bank differs from what it was`);
  }
}

for (const r of report) console.log(`  ${r.id.padEnd(46)} ${r.how.padEnd(22)} ${(r.bytes / 1024).toFixed(1)}KB`);
console.log(`\n${report.length} songs${WRITE ? ` written to src/data/songs/` : ' (dry run — pass --write)'}`);
if (WRITE) {
  console.log(`banks identical to before: ${exact}/${rows.length}`);
  for (const b of broken) console.log(`  ** ${b}`);
  process.exit(broken.length ? 1 : 0);
}
