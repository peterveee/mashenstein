// GALLERY PRUNE: `node tools/gallery-prune.js <section-id> [<section-id> ...]`.
//
// The companion to the checkbox picker in the lab gallery (see the "prune
// (lab)" block in gallery-entry.js). That page never touches a file — it only
// ever hands you this exact command. This is the one thing that edits
// tools/gallery-entry.js: it finds each requested section's own top-level
// `{ ... }` block by parsing the file with acorn (not regex or brace-
// counting, which a 7000-line file full of template literals and nested
// braces would silently miscount), deletes the block and its attached
// leading comment, drops any import that block was the last user of, prints
// the plan, asks you to confirm, then rebuilds the gallery.
//
// SECTIONS BEHIND A HELPER (the `ideaSheet(id, title, ...)` cluster) are
// reported and skipped rather than guessed at — their `section(id, ...)`
// call uses a parameter, not the literal id, so this tool has no safe way to
// find their boundary. Ask Claude for those, the same way as always.
//
// Nothing is written until the source has round-tripped through esbuild's
// parser clean; a bug in the block-finding here fails LOUD, before disk,
// never as a half-deleted file.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { spawnSync } from 'node:child_process';
import { parse } from 'acorn';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Overridable so this tool's own logic can be exercised against a scratch
// copy — never the real file — without touching Peter's tree.
const TARGET = process.env.GALLERY_PRUNE_TARGET || join(root, 'tools/gallery-entry.js');
const SKIP_BUILD = !!process.env.GALLERY_PRUNE_SKIP_BUILD;

const argv = process.argv.slice(2);
const yes = argv.includes('--yes') || argv.includes('-y');
const dryRun = argv.includes('--dry-run');
const ids = argv.filter((a) => !a.startsWith('-'));

if (ids.length === 0) {
  console.log('Usage: node tools/gallery-prune.js <section-id> [<section-id> ...] [--yes] [--dry-run]');
  console.log('Section ids come from the lab gallery\'s picker — tick sections, "Review & get command".');
  process.exit(1);
}

// ------------------------------------------------------------------ walk
// A generic ESTree walk: no per-type visitor table, just recurse into every
// own-enumerable object/array property. Slower than a real visitor, cheap
// enough for a one-shot CLI pass over one file.
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) walk(n, visit); return; }
  if (typeof node.type === 'string') visit(node);
  for (const key in node) {
    if (key === 'loc' || key === 'range') continue;
    const val = node[key];
    if (val && typeof val === 'object') walk(val, visit);
  }
}

// Every LITERAL id passed directly to section(...)/sectionEl(...) anywhere
// inside a node — not one behind a helper, where the argument is a variable.
function directSectionIds(node) {
  const found = [];
  walk(node, (n) => {
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier'
        && (n.callee.name === 'section' || n.callee.name === 'sectionEl')
        && n.arguments[0] && n.arguments[0].type === 'Literal'
        && typeof n.arguments[0].value === 'string') {
      found.push(n.arguments[0].value);
    }
  });
  return found;
}

// The comment block glued to the top of `node` — a contiguous run of `//`
// lines directly above it, stopping at the first blank line or non-comment.
// Mirrors the boundary check done by hand for every section removed before
// this tool existed: never eat a comment separated by a blank line, it
// belongs to whatever comes after it, not to `node`.
function attachedCommentStart(comments, nodeStart, src) {
  let cursor = nodeStart;
  let result = nodeStart;
  for (let k = comments.length - 1; k >= 0; k--) {
    const c = comments[k];
    if (c.end > cursor) continue;
    if (c.type !== 'Line') break;
    const gap = src.slice(c.end, cursor);
    if (gap.trim() !== '') break;
    if ((gap.match(/\n/g) || []).length > 1) break; // blank-line gap: not attached
    result = c.start;
    cursor = c.start;
  }
  return result;
}

// One trailing blank line, if the block left one, so removing it doesn't
// leave a doubled gap behind.
function endWithTrailingBlank(src, end) {
  let i = end;
  if (src[i] === '\n') i++;
  let j = i;
  while (src[j] === ' ' || src[j] === '\t') j++;
  if (src[j] === '\n') i = j + 1;
  return i;
}

function parseSource(src) {
  const comments = [];
  const ast = parse(src, {
    ecmaVersion: 2022,
    sourceType: 'module',
    locations: false,
    onComment: (block, text, start, end) => comments.push({ type: block ? 'Block' : 'Line', start, end }),
  });
  return { ast, comments };
}

// -------------------------------------------------------------- locate
const src0 = readFileSync(TARGET, 'utf8');
const { ast: ast0, comments: comments0 } = parseSource(src0);

const idToTop = new Map(); // id -> top-level Program.body node
for (const top of ast0.body) {
  for (const id of directSectionIds(top)) {
    if (idToTop.has(id)) throw new Error(`section id "${id}" registers twice — refusing to guess which`);
    idToTop.set(id, top);
  }
}

const ranges = [];
const skipped = [];
for (const id of ids) {
  const top = idToTop.get(id);
  if (!top) {
    skipped.push([id, 'not found as a direct section()/sectionEl() call — likely behind a helper (e.g. ideaSheet); ask Claude for this one']);
    continue;
  }
  const siblingIds = directSectionIds(top);
  if (siblingIds.length > 1) {
    skipped.push([id, `shares its top-level block with: ${siblingIds.filter((x) => x !== id).join(', ')} — needs manual handling`]);
    continue;
  }
  const start = attachedCommentStart(comments0, top.start, src0);
  const end = endWithTrailingBlank(src0, top.end);
  ranges.push({ id, start, end });
}

// Guard against two requested ids somehow resolving to overlapping text —
// should be impossible given the checks above, but never splice blind.
ranges.sort((a, b) => a.start - b.start);
for (let i = 1; i < ranges.length; i++) {
  if (ranges[i].start < ranges[i - 1].end) {
    throw new Error(`overlapping deletion ranges for "${ranges[i - 1].id}" and "${ranges[i].id}" — aborting`);
  }
}

if (ranges.length === 0) {
  console.log('Nothing to remove.');
  for (const [id, why] of skipped) console.log(`  SKIP ${id} — ${why}`);
  process.exit(skipped.length ? 1 : 0);
}

// ---------------------------------------------------------------- splice
let pruned = src0;
for (let i = ranges.length - 1; i >= 0; i--) {
  const r = ranges[i];
  pruned = pruned.slice(0, r.start) + pruned.slice(r.end);
}

// ------------------------------------------------------- orphaned imports
// Re-parse the pruned text fresh so import ranges are correct against it,
// then drop any specifier this pass was the last user of.
const { ast: ast1 } = parseSource(pruned);
const importDecls = ast1.body.filter((n) => n.type === 'ImportDeclaration');
const droppedImports = []; // whole lines removed
const trimmedImports = []; // {source, kept: [names], dropped: [names]}
const edits = []; // {start, end, text} applied after scanning, in one pass

function specifierText(spec) {
  if (spec.type === 'ImportDefaultSpecifier') return spec.local.name;
  if (spec.type === 'ImportNamespaceSpecifier') return `* as ${spec.local.name}`;
  return spec.imported.name === spec.local.name ? spec.local.name : `${spec.imported.name} as ${spec.local.name}`;
}

for (const decl of importDecls) {
  const declText = pruned.slice(decl.start, decl.end);
  const orphaned = decl.specifiers.filter((spec) => {
    const name = spec.local.name;
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const whole = pruned.slice(0, decl.start) + pruned.slice(decl.end);
    return !re.test(whole);
  });
  if (orphaned.length === 0) continue;
  if (orphaned.length === decl.specifiers.length) {
    let end = decl.end;
    if (pruned[end] === '\n') end++;
    edits.push({ start: decl.start, end, text: '' });
    droppedImports.push(decl.source.value);
    continue;
  }
  const kept = decl.specifiers.filter((s) => !orphaned.includes(s));
  const defaultPart = kept.find((s) => s.type === 'ImportDefaultSpecifier');
  const named = kept.filter((s) => s.type !== 'ImportDefaultSpecifier');
  const parts = [];
  if (defaultPart) parts.push(defaultPart.local.name);
  if (named.length) parts.push(`{ ${named.map(specifierText).join(', ')} }`);
  const rebuilt = `import ${parts.join(', ')} from '${decl.source.value}';`;
  edits.push({ start: decl.start, end: decl.end, text: rebuilt });
  trimmedImports.push({
    source: decl.source.value,
    kept: named.map((s) => s.local.name).concat(defaultPart ? [defaultPart.local.name] : []),
    dropped: orphaned.map((s) => s.local.name),
  });
  void declText; // kept for a future --explain flag; unused today
}

edits.sort((a, b) => a.start - b.start);
for (let i = 1; i < edits.length; i++) {
  if (edits[i].start < edits[i - 1].end) throw new Error('overlapping import edits — aborting');
}
let finalSrc = pruned;
for (let i = edits.length - 1; i >= 0; i--) {
  const e = edits[i];
  finalSrc = finalSrc.slice(0, e.start) + e.text + finalSrc.slice(e.end);
}

// ------------------------------------------------------------------ plan
console.log(`Removing ${ranges.length} section(s):`);
for (const r of ranges) console.log(`  - ${r.id}`);
if (skipped.length) {
  console.log(`\nSkipped ${skipped.length} (not touched):`);
  for (const [id, why] of skipped) console.log(`  - ${id} — ${why}`);
}
if (droppedImports.length) {
  console.log(`\nImports dropped entirely (${droppedImports.length}):`);
  for (const s of droppedImports) console.log(`  - ${s}`);
}
if (trimmedImports.length) {
  console.log(`\nImports trimmed:`);
  for (const t of trimmedImports) console.log(`  - ${t.source}: dropping ${t.dropped.join(', ')}`);
}

// -------------------------------------------------------------- validate
// Parse-only, no bundling — catches a boundary bug here before it ever
// touches the file Peter actually keeps.
try {
  esbuild.transformSync(finalSrc, { loader: 'js', format: 'esm' });
} catch (err) {
  console.error('\nRefusing to write: the pruned source does not parse.');
  console.error(String(err.message || err));
  process.exit(1);
}

if (dryRun) {
  console.log('\n--dry-run: nothing written.');
  process.exit(0);
}

async function confirmAndWrite() {
  if (!yes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => rl.question('\nWrite this and rebuild the gallery? [y/N] ', resolve));
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) {
      console.log('Aborted — nothing written.');
      process.exit(1);
    }
  }
  writeFileSync(TARGET, finalSrc);
  console.log(`\nWrote ${TARGET}.`);
  if (SKIP_BUILD) { console.log('GALLERY_PRUNE_SKIP_BUILD set — not rebuilding.'); return; }
  const build = spawnSync('node', [join(root, 'tools/build-gallery.js')], { stdio: 'inherit', cwd: root });
  if (build.status !== 0) {
    console.error('\ngallery-entry.js was written but the rebuild failed — see the error above.');
    process.exit(build.status || 1);
  }
  console.log('\nDone. Reload the gallery page to see the change.');
}

await confirmAndWrite();
