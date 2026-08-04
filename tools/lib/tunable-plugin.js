// Makes the tunable constants assignable — in the watch build only.
//
// The problem this solves: the numbers worth tuning are top-level `const`s, and
// a `const` cannot be assigned to. The obvious fixes all cost something the
// shipping game should not pay. `export let` leaves a mutable module-scope
// binding in the 60Hz hot path forever and cannot reach a constant that is not
// exported. A runtime override object costs a read and a branch per constant
// per frame. Threading a tuning bag through the call graph means touching forty
// shipping call sites to serve a dev tool.
//
// So the rewrite happens at bundle time, and only for the bundle the dev build
// makes for itself. `npm run build` never loads this plugin: production keeps
// `const`, V8 keeps folding it, and src/game/player.js on disk is the file that
// ships. What the watch build gets instead is `let` plus a registration call
// handing the dev strip a getter and a setter per constant.
//
// It fails loudly on purpose. If a manifest name is not found in the file it
// claims, esbuild.build() throws and the watch build prints the error. The
// alternative — a silently dead row in the strip that moves a number nothing
// reads — is the kind of bug that costs an afternoon.
import { readFile } from 'fs/promises';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { TUNABLES } from './tunables.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const REGISTRY = join(ROOT, 'src/dev/tunables.js');

// Blank every byte inside a string literal or a comment, preserving length and
// line structure, so the declaration search looks at code and only code. Shares
// its rules with the identical mask in tests/tunables.js: a `const GRAVITY`
// written inside a comment must not count as a declaration in either place.
export function codeMask(src) {
  const out = src.split('');
  let i = 0;
  const blank = (from, to) => {
    for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') {
      let j = src.indexOf('\n', i); if (j < 0) j = src.length;
      blank(i, j); i = j; continue;
    }
    if (c === '/' && d === '*') {
      let j = src.indexOf('*/', i + 2); j = j < 0 ? src.length : j + 2;
      blank(i, j); i = j; continue;
    }
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

// Anchored at column 0: indentation means function scope, and rewriting a
// function-scoped const to a let would produce a fresh local on every call that
// no setter could ever reach.
const declRe = (name) =>
  new RegExp(`(^|\\n)((?:export\\s+)?)const(\\s+${name}\\s*=\\s*-?\\d+(?:\\.\\d+)?\\s*;)`, 'g');

/**
 * Rewrite every named declaration in `src` from `const` to `let`.
 * Throws on a name that is missing or declared more than once — both mean the
 * manifest and the source have drifted apart, and guessing which one is right
 * is not this function's job.
 */
export function makeAssignable(src, names, rel) {
  const mask = codeMask(src);
  const edits = [];
  for (const name of names) {
    const hits = [...mask.matchAll(declRe(name))];
    if (hits.length !== 1) {
      throw new Error(
        `tunable "${name}" is declared ${hits.length} times in ${rel} — expected exactly one `
        + 'top-level `const NAME = <number>;`. Has it been renamed, moved into a function, '
        + 'or turned into an expression? Fix tools/lib/tunables.js or the source, not this plugin.',
      );
    }
    const m = hits[0];
    // Offset of the `const` keyword itself: match start, plus the leading
    // newline the pattern consumed, plus any `export `.
    const at = m.index + m[1].length + m[2].length;
    edits.push({ at, len: 'const'.length });
  }
  // Right to left, so an earlier edit never invalidates a later offset.
  edits.sort((a, b) => b.at - a.at);
  let out = src;
  for (const e of edits) out = `${out.slice(0, e.at)}let${out.slice(e.at + e.len)}`;
  return out;
}

/** The registration call appended to a transformed module. */
export function registrationFor(rel, names, registryPath) {
  const pairs = names
    .map((n) => `  ${n}: { get: () => ${n}, set: (v) => { ${n} = v; } },`)
    .join('\n');
  // The import sits at the bottom because that is where the generated code is;
  // ESM hoists it regardless, and keeping it here means src/ never mentions the
  // dev registry in a file anybody reads.
  return `\nimport { __registerTunables } from ${JSON.stringify(registryPath)};\n`
    + `__registerTunables(${JSON.stringify(rel)}, {\n${pairs}\n});\n`;
}

export function tunablePlugin(rows = TUNABLES) {
  const byFile = new Map();
  for (const row of rows) {
    if (!byFile.has(row.file)) byFile.set(row.file, []);
    byFile.get(row.file).push(row.name);
  }
  return {
    name: 'mash-tunables',
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async (args) => {
        const rel = relative(ROOT, args.path);
        const names = byFile.get(rel);
        if (!names) return null;            // every other file takes the default loader
        const src = await readFile(args.path, 'utf8');
        const contents = makeAssignable(src, names, rel) + registrationFor(rel, names, REGISTRY);
        return { contents, loader: 'js', resolveDir: dirname(args.path) };
      });
    },
  };
}
