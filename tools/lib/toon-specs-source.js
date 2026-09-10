import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchBrace, topLevelProps } from './source-scan.js';
import {
  CAST, EDITOR_BLOCK_END, EDITOR_BLOCK_HEADER, HERO_DIALS, SPEC_HOMES,
  dialByKey, isDefault, operationFor,
} from './hero-dials.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(HERE, '..', '..');
const HISTORY_DIR = 'work/toon-specs-history';
const HISTORY_CAP = 20;

const hash = (src) => createHash('sha256').update(src).digest('hex');
const relPath = (root, file) => join(root, file);

function homeFor(id) {
  if (!CAST.includes(id)) throw new Error(`unknown character: ${id}`);
  return SPEC_HOMES[id] || SPEC_HOMES['*'];
}

function anchorSpan(src, home) {
  const m = home.anchor.exec(src);
  if (!m) throw new Error(`could not find the source table for ${home.file}`);
  const open = src.indexOf('{', m.index + m[0].length - 1);
  if (open < 0) throw new Error(`source table in ${home.file} has no opening brace`);
  const endExclusive = matchBrace(src, open);
  return { open, close: endExclusive - 1 };
}

export function heroEntrySpan(src, home, id) {
  const table = anchorSpan(src, home);
  if (home.entry === null) return table;
  const props = topLevelProps(src, table.open + 1, table.close);
  const prop = props.find((p) => p.key === home.entry(id));
  if (!prop) throw new Error(`${id} is not present in ${home.file}`);
  if (src[prop.valueStart] !== '{') throw new Error(`${id} is not an object literal`);
  return { open: prop.valueStart, close: matchBrace(src, prop.valueStart) - 1 };
}

function lineStart(src, i) {
  const n = src.lastIndexOf('\n', i - 1);
  return n < 0 ? 0 : n + 1;
}
function lineEnd(src, i) {
  const n = src.indexOf('\n', i);
  return n < 0 ? src.length : n;
}
function indentAt(src, i) { return src.slice(lineStart(src, i), i).match(/^\s*/)?.[0] || ''; }

function blockInfo(src, open, close) {
  const header = src.indexOf(EDITOR_BLOCK_HEADER, open + 1);
  if (header < 0 || header > close) return null;
  const start = lineStart(src, header);
  const endMark = src.indexOf(EDITOR_BLOCK_END, header + EDITOR_BLOCK_HEADER.length);
  if (endMark < 0 || endMark > close) throw new Error('character editor block has no end marker');
  const end = lineEnd(src, endMark) + (src[lineEnd(src, endMark)] === '\n' ? 1 : 0);
  return { start, end, propsFrom: lineEnd(src, header) + 1, propsTo: lineStart(src, endMark) };
}

function fmt(row, value) {
  if (row.kind === 'enum') return typeof value === 'string' ? `'${value.replaceAll("'", "\\'")}'` : String(value);
  return String(Math.round(value * 1e4) / 1e4);
}

function sourcePropValue(src, prop) { return src.slice(prop.valueStart, prop.valueEnd).trim(); }

function deleteSpan(src, prop) {
  let start = prop.keyStart;
  // Remove indentation and the newline before an editor-owned property when
  // possible. Never consume a previous hand-written property's text.
  const ls = lineStart(src, start);
  if (/^\s*$/.test(src.slice(ls, start))) start = ls;
  let end = prop.end;
  if (src[end] === '\n') end++;
  return [start, end, ''];
}

function ensureComma(src, close) {
  let i = close - 1;
  while (i >= 0 && /\s/.test(src[i])) i--;
  return src[i] === ',' ? src : src.slice(0, i + 1) + ',' + src.slice(i + 1);
}

function applyEdits(src, edits) {
  let next = src;
  for (const e of edits.sort((a, b) => b[0] - a[0])) next = next.slice(0, e[0]) + e[2] + next.slice(e[1]);
  return next;
}

export function renderHeroDials(src, home, id, changes) {
  const span = heroEntrySpan(src, home, id);
  const info = blockInfo(src, span.open, span.close);
  const operations = new Map();
  for (const [key, raw] of Object.entries(changes || {})) operations.set(key, operationFor(key, raw));
  const props = topLevelProps(src, span.open + 1, span.close);
  const byKey = new Map(props.map((p) => [p.key, p]));
  const editorProps = info ? topLevelProps(src, info.propsFrom, info.propsTo) : [];
  const edits = [];
  const changed = [];
  const append = [];
  for (const [key, op] of operations) {
    const row = dialByKey(key);
    const prop = byKey.get(key);
    const editorProp = editorProps.find((p) => p.key === key);
    if (op.op === 'set') {
      const text = fmt(row, op.value);
      if (prop && !editorProp) {
        if (sourcePropValue(src, prop) !== text) { edits.push([prop.valueStart, prop.valueEnd, text]); changed.push(key); }
      } else if (editorProp) {
        if (sourcePropValue(src, editorProp) !== text) { edits.push([editorProp.valueStart, editorProp.valueEnd, text]); changed.push(key); }
      } else {
        append.push([key, text]); changed.push(key);
      }
    } else if (prop) {
      const target = editorProp || prop;
      edits.push(deleteSpan(src, target));
      changed.push(key);
    }
  }
  if (append.length) {
    const entryIndent = indentAt(src, span.open);
    const propIndent = `${entryIndent}  `;
    const oldClose = info ? info.propsTo : span.close;
    let insert = '';
    let before = oldClose - 1;
    while (before >= 0 && /\s/.test(src[before])) before--;
    const needsComma = src[before] !== ',';
    if (needsComma) insert += ',';
    const markerNeeded = !info;
    if (markerNeeded) insert += `\n${propIndent}${EDITOR_BLOCK_HEADER}\n`;
    for (const [key, value] of append) insert += `${propIndent}${key}: ${value},\n`;
    if (markerNeeded) insert += `${propIndent}${EDITOR_BLOCK_END}\n${entryIndent}`;
    edits.push([oldClose, oldClose, insert]);
  }
  let next = applyEdits(src, edits);
  // If all editor-owned props were removed, remove the markers too. This keeps a
  // reset from leaving a false claim of machine-owned content in the source.
  if (info) {
    const afterSpan = heroEntrySpan(next, home, id);
    const afterInfo = blockInfo(next, afterSpan.open, afterSpan.close);
    if (afterInfo && topLevelProps(next, afterInfo.propsFrom, afterInfo.propsTo).length === 0) {
      next = next.slice(0, afterInfo.start) + next.slice(afterInfo.end);
    }
  }
  return { next, changed: next === src ? [] : [...new Set(changed)] };
}

function moduleScript(root, id, modulePath = null) {
  const home = homeFor(id);
  const target = (modulePath || home.file).replaceAll('\\', '/');
  const access = home.entry === null ? 'm.RUSTY_W3B' : `m.TOON_SPECS[${JSON.stringify(id)}]`;
  return `
    const { installDom } = await import('./tests/dom-stub.js');
    installDom();
    const m = await import('./${target}?v=${Date.now()}');
    const value = ${access};
    console.log(JSON.stringify(value));
  `;
}

function validateCandidate(root, id, candidate) {
  const rel = candidate.slice(root.length + 1).replaceAll('\\', '/');
  const raw = execFileSync(process.execPath, ['--input-type=module', '-e', moduleScript(root, id, rel)], {
    cwd: root, timeout: 15000, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  }).trim().split('\n').pop();
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error(`candidate ${id} did not resolve to an object`);
  return value;
}

function resolveSpec(root, id) {
  const raw = execFileSync(process.execPath, ['--input-type=module', '-e', moduleScript(root, id)], {
    cwd: root, timeout: 15000, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  }).trim().split('\n').pop();
  return JSON.parse(raw);
}

function localKeys(src, home, id) {
  const span = heroEntrySpan(src, home, id);
  const info = blockInfo(src, span.open, span.close);
  const props = topLevelProps(src, span.open + 1, span.close);
  return {
    local: props.filter((p) => !info || p.keyStart < info.start).map((p) => p.key),
    editor: info ? topLevelProps(src, info.propsFrom, info.propsTo).map((p) => p.key) : [],
  };
}

export function readHeroDials(root = DEFAULT_ROOT, id) {
  const home = homeFor(id);
  const file = relPath(root, home.file);
  const src = readFileSync(file, 'utf8');
  const spec = resolveSpec(root, id);
  const keys = localKeys(src, home, id);
  const dials = {};
  for (const row of HERO_DIALS) if (Object.prototype.hasOwnProperty.call(spec, row.key)) dials[row.key] = spec[row.key];
  return { hero: id, file: home.file, revision: hash(src), spec, dials, ...keys };
}

function snapshot(root, file) {
  const src = relPath(root, file);
  const dir = join(root, HISTORY_DIR);
  mkdirSync(dir, { recursive: true });
  const base = file.split('/').pop().replace(/\.js$/, '');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = join(dir, `${base}-${stamp}.js`);
  copyFileSync(src, out);
  const all = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  for (const f of all.slice(0, Math.max(0, all.length - HISTORY_CAP))) unlinkSync(join(dir, f));
  return out;
}

export function writeHeroDials(root = DEFAULT_ROOT, id, changes, options = {}) {
  const home = homeFor(id);
  const file = home.file;
  const out = relPath(root, file);
  const before = readFileSync(out, 'utf8');
  const currentRevision = hash(before);
  if (options.baseRevision && options.baseRevision !== currentRevision) {
    return { ok: false, conflict: true, errors: ['source changed since this draft was loaded'], revision: currentRevision };
  }
  const rendered = renderHeroDials(before, home, id, changes);
  if (!rendered.changed.length) return { ok: true, changed: [], snapshot: null, file, revision: currentRevision };
  const tmp = `${out}.character-editor.tmp.js`;
  const snap = snapshot(root, file);
  try {
    writeFileSync(tmp, rendered.next);
    execFileSync(process.execPath, ['--check', tmp], { cwd: root, timeout: 15000, encoding: 'utf8' });
    validateCandidate(root, id, tmp);
    // The source may have changed while the candidate was checked.
    if (hash(readFileSync(out, 'utf8')) !== currentRevision) throw new Error('source changed during save');
    renameSync(tmp, out);
    const authoritative = readHeroDials(root, id);
    return { ok: true, changed: rendered.changed, snapshot: snap.replace(`${root}/`, ''), file, revision: authoritative.revision, authoritative };
  } catch (err) {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch {}
    try { if (readFileSync(out, 'utf8') === rendered.next) copyFileSync(join(root, snap.replace(`${root}/`, '')), out); } catch {}
    return { ok: false, errors: [err.message], rolledBack: true, snapshot: snap.replace(`${root}/`, '') };
  }
}

export { hash as sourceRevision, HISTORY_DIR };
