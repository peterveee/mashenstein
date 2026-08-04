// The tunable manifest is a contract between three things that never see each
// other run: the esbuild plugin that makes a constant assignable, the dev strip
// that moves it, and the source file that ships it. Everything here is a source
// assertion — read the .js, look at the text — because the failure this suite
// exists to catch is a rename, and a rename is invisible to any test that only
// exercises behaviour.
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { TUNABLES, TUNABLE_FILES, GROUPS, clampTunable } from '../tools/lib/tunables.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`ok: ${msg}`);
  else { console.error(`FAIL: ${msg}`); failures++; }
}

// Blank every byte inside a string literal or a comment, preserving length, so
// a regex can look at code and only code. The plugin does the same thing to the
// same files; if this drifts from that, a `const GRAVITY` written inside a
// comment starts counting as a declaration in one place and not the other.
function codeMask(src) {
  const out = src.split('');
  let i = 0;
  const blank = (from, to) => { for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' '; };
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = src.length; blank(i, j); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? src.length : j + 2; blank(i, j); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { j++; break; }
        j++;
      }
      blank(i + 1, j - 1); i = j; continue;
    }
    i++;
  }
  return out.join('');
}

const masks = new Map(TUNABLE_FILES.map((f) => [f, codeMask(read(f))]));

// The declaration form the plugin rewrites and the writer would splice: a plain
// numeric literal, optionally exported. An expression initialiser is rejected on
// purpose — `GRAVITY * 1.25` cannot be moved by a slider without deciding which
// half moved, which is exactly why HEAVY_GRAVITY_MULT was extracted.
//
// Anchored at column 0. Indentation means function scope, and a `let` rewrite of
// a function-scoped const would produce a fresh local per call that no setter
// could ever reach.
const declRe = (name) =>
  new RegExp(`(?:^|\\n)(?:export\\s+)?const\\s+${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)\\s*;`, 'g');

// ---- 1. every manifest name exists, exactly once, as a plain number ---------
const values = new Map();
for (const row of TUNABLES) {
  const mask = masks.get(row.file);
  const hits = [...mask.matchAll(declRe(row.name))];
  ok(hits.length === 1,
    `${row.name} is declared exactly once in ${row.file} as a numeric const (found ${hits.length})`);
  if (hits.length === 1) values.set(row.name, Number(hits[0][1]));
}

// ---- 2. slider bounds and labels are usable ---------------------------------
for (const row of TUNABLES) {
  const v = values.get(row.name);
  if (v == null) continue;
  ok(v >= row.min && v <= row.max,
    `${row.name}'s shipped value ${v} is inside its slider range [${row.min}, ${row.max}]`);
  ok(row.step <= row.coarse, `${row.name} coarse step is not finer than its fine step`);
  ok(row.short.length <= 11, `${row.name} strip label "${row.short}" fits the strip (<=11 chars)`);
  ok(GROUPS.includes(row.group), `${row.name} is in a known group`);
  // A value the strip cannot express is a value the strip would silently move
  // the moment you touched it.
  ok(clampTunable(row, v) === v,
    `${row.name} survives a clamp/round round-trip unchanged (${v})`);
}

// ---- 3. the shipping game carries no tuning layer ---------------------------
// The plugin runs only in the watch build, so the gameplay modules must still
// declare plain consts. If one of these ever reads `let`, a production bundle
// has lost its constant folding in the 60Hz hot path.
for (const row of TUNABLES) {
  const mask = masks.get(row.file);
  ok(!new RegExp(`(?:^|\\n)[ \\t]*(?:export\\s+)?let\\s+${row.name}\\s*=`).test(mask),
    `${row.name} still ships as a const, not a let`);
}
for (const rel of ['src/game/player.js', 'src/game/run.js', 'src/sprites/toons.js', 'src/game/spawner.js']) {
  const src = read(rel);
  ok(!/__registerTunables/.test(src), `${rel} has no registration hook baked into it`);
  ok(!/from ['"].*dev\/tunables/.test(src), `${rel} does not import the dev registry`);
  ok(!/from ['"].*\.\.\/\.\.\/tools\//.test(src), `${rel} does not import from tools/`);
}

// ---- 4. the plugin is watch-only -------------------------------------------
{
  const build = read('build/build.js');
  ok(/tunablePlugin/.test(build), 'build/build.js wires up the tunable plugin');
  // The call must sit inside a `watch ?` ternary. A plugin that ran for
  // `npm run build` would ship `let` in the gameplay hot path.
  ok(/plugins:\s*watch\s*\?\s*\[\s*tunablePlugin\(/.test(build),
    'the tunable plugin is applied only when watch is set');
  // The watch path builds through esbuild.context({...options, plugins: [...]}),
  // and an assignment there SHADOWS options.plugins rather than adding to it.
  // That is how this shipped broken the first time: the strip moved its numbers
  // and the game ignored every one of them, with nothing on screen to say why.
  // Every plugins: list after the options object must spread options.plugins.
  const after = build.slice(build.indexOf('const options = {'));
  const lists = [...after.matchAll(/plugins:\s*\[/g)];
  for (const m of lists) {
    const tail = after.slice(m.index + m[0].length, m.index + m[0].length + 40);
    ok(/^\s*\.\.\.options\.plugins/.test(tail),
      'every plugins: array after `options` spreads options.plugins rather than replacing it'
      + ` (found "${tail.split('\n')[0].trim().slice(0, 30)}")`);
  }
}

// ---- 5. the two halves of the landing squash agree --------------------------
{
  const landed = values.get('LANDED_T');
  const squash = values.get('SQUASH_T');
  ok(landed != null && squash != null && landed === squash,
    `LANDED_T (player.js, ${landed}) equals SQUASH_T (toons.js, ${squash}) — `
    + 'the timer and the blend that reads it must describe the same duration');
}

// ---- 6. no tunable strands an eval-time derivation --------------------------
// A constant computed at MODULE-EVAL from another constant is frozen at import
// and goes stale the moment a slider moves its input — silently, because the
// stale value is still a perfectly good number.
//
// Only module scope matters, hence the column-0 anchor. A `const g = GRAVITY *
// HEAVY_GRAVITY_MULT` inside a function body is a call-time read and is exactly
// what makes the sliders work; flagging those would flag the mechanism itself.
{
  const names = new Set(TUNABLES.map((t) => t.name));
  for (const rel of TUNABLE_FILES.concat(['src/engine/camera.js'])) {
    const mask = masks.get(rel) || codeMask(read(rel));
    const derived = [...mask.matchAll(/(?:^|\n)(?:export\s+)?const\s+(\w+)\s*=\s*([^;\n]*);/g)];
    for (const [, lhs, rhs] of derived) {
      const refs = (rhs.match(/\b[A-Z][A-Z0-9_]{2,}\b/g) || []).filter((r) => names.has(r));
      ok(refs.length === 0,
        `${rel}: const ${lhs} does not derive from a tunable at module-eval`
        + (refs.length ? ` (reads ${refs.join(', ')})` : ''));
    }
  }
}

// ---- 7. REACT_FLOOR carries its live-object sync hook -----------------------
{
  const row = TUNABLES.find((t) => t.name === 'REACT_FLOOR');
  ok(row && row.sync === 'spawner.react',
    'REACT_FLOOR declares the spawner.react sync hook — RunState.enter copies it '
    + 'at construction, so moving the constant alone would change nothing visible');
  ok(!TUNABLES.some((t) => t.name === 'REACT_FLOOR_MAX'),
    'REACT_FLOOR_MAX is not tunable — it only applies under UNPLUGGED/maxspeed');
  // Anything with a sync hook must name a property that RunState actually has.
  const run = read('src/game/run.js');
  for (const t of TUNABLES.filter((x) => x.sync)) {
    const [obj, prop] = t.sync.split('.');
    ok(new RegExp(`this\\.${obj}\\s*=\\s*new `).test(run),
      `${t.name}'s sync target this.${obj} is built by RunState`);
    ok(new RegExp(`this\\.${prop}\\s*=`).test(read(t.file)),
      `${t.name}'s sync target .${prop} is assigned in ${t.file}`);
  }
}

console.log(`\ntunables: ${TUNABLES.length} constants across ${TUNABLE_FILES.length} files`);
if (failures) {
  console.error(`TUNABLES: FAILED (${failures})`);
  process.exit(1);
}
console.log('TUNABLES: PASSED');
