// The list of imported songs, kept in step with the folder.
//
// A .mid becomes src/data/imported/<id>.js, and that file is nothing until something
// knows it exists: the desk's song picker, the render tools and a saved mix all work
// off track ids. src/data/imported/index.js is that list, and it is generated from
// whatever is actually in the folder rather than hand-maintained, so an import is
// playable the moment it lands and a file deleted by hand stops being a track.
//
// Generated rather than globbed at runtime because the desk is a bundle: esbuild has
// to see the imports to include the banks, and the game must NOT — src/data/tracks.js
// deliberately does not import this file, so nobody's scratch MIDI ships in the game.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export const IMPORTED_DIR = 'src/data/imported';

/** "CHOPIN3.MID" -> "chopin3": the filename becomes the track id, so it must be one. */
export function slugFor(name) {
  const slug = String(name).replace(/\.midi?$/i, '').replace(/\.js$/i, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return slug || 'imported';
}

/** What is in the folder right now: one entry per bank file, sorted by id. */
export function readImported(root) {
  const dir = join(root, IMPORTED_DIR);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.js') || file === 'index.js') continue;
    const src = readFileSync(join(dir, file), 'utf8');
    const bank = /export const bank\s*=/m.test(src);
    const m = /^export const ([A-Za-z_$][\w$]*)\s*=/m.exec(src);
    if (!m) continue;                              // not a bank — leave it alone
    // Scratch songs have the standard song-file shape and expose `bank` plus title
    // metadata. Legacy MIDI imports expose one uppercase bank constant instead; keep
    // that format working so existing scratch material remains playable.
    const titleLiteral = /^export const title\s*=\s*("(?:\\.|[^"])*")\s*;?/m.exec(src);
    const title = bank
      ? (titleLiteral ? JSON.parse(titleLiteral[1]) : undefined)
      : (/^\/\/ (.+?) — imported from/m.exec(src) || [])[1];
    // A song file may NAME its group, and one that does is taken at its word: the
    // style auditions are scratch songs by shape but their own section in the picker,
    // and the shape is all this scan can see. Only a written group counts — the file
    // is the record, and a scan that inferred one would go on inferring it after the
    // file said otherwise. Everything that does not name one is what it always was.
    const groupLiteral = /^export const group\s*=\s*("(?:\\.|[^"])*")\s*;?/m.exec(src);
    out.push({
      id: file.replace(/\.js$/, ''),
      constName: bank ? null : m[1],
      bankExport: bank ? 'bank' : m[1],
      title: title || m[1],
      group: bank ? (groupLiteral ? JSON.parse(groupLiteral[1]) : 'scratch') : 'imported',
      writable: bank && src.includes('// ---- THE DESK WRITES BELOW HERE'),
      file,
    });
  }
  return out;
}

/**
 * A free id for a new import.
 *
 * Re-importing the same file keeps its id, which is how you edit a song in a DAW and
 * bring it back over itself. A name a hand-written song already owns gets a suffix
 * instead: an import called "plumber" must never quietly shadow the cabinet.
 *
 * @param {string} root      repo root
 * @param {string} slug      the wanted id
 * @param {(id: string) => boolean} isTaken  usually resolveTrack
 */
export function importId(root, slug, isTaken = () => false) {
  const dir = join(root, IMPORTED_DIR);
  // A bank already at that id is this song coming back, whatever else claims the
  // name — which is what makes the suffixed case land on itself the second time too:
  // plumber.mid becomes plumber-2 once, and plumber-2 every time after.
  const free = (id) => existsSync(join(dir, `${id}.js`)) || !isTaken(id);
  let id = slug;
  for (let i = 2; !free(id); i++) id = `${slug}-${i}`;
  return id;
}

/** Rewrite src/data/imported/index.js from the folder. Returns what it listed. */
export function writeImportedIndex(root) {
  const entries = readImported(root);
  const dir = join(root, IMPORTED_DIR);
  mkdirSync(dir, { recursive: true });

  // Two files can export the same const name — song.mid and SONG.mid — so a name
  // that is already spoken for comes in under an alias.
  const used = new Set();
  const local = new Map();
  for (const e of entries) {
    let name = e.constName || e.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    for (let i = 2; used.has(name); i++) name = `${e.constName || e.id}_${i}`;
    used.add(name);
    local.set(e.id, name);
  }

  const imports = entries.map((e) => e.constName
    ? (local.get(e.id) === e.constName
      ? `import { ${e.constName} } from './${e.file}';`
      : `import { ${e.constName} as ${local.get(e.id)} } from './${e.file}';`)
    : `import * as ${local.get(e.id)} from './${e.file}';`).join('\n');
  const body = entries.map((e) => {
    const bank = e.constName ? local.get(e.id) : `${local.get(e.id)}.bank`;
    const title = e.constName ? JSON.stringify(e.title) : `${local.get(e.id)}.title`;
    const group = JSON.stringify(e.group || 'imported');
    const writable = e.writable ? 'true' : 'false';
    return `  ${JSON.stringify(e.id)}: `
      + `{ bank: ${bank}, title: ${title}, group: ${group}, writable: ${writable} },`;
  }).join('\n');

  const source = `// Imported songs — GENERATED by tools/lib/imported-index.js. Do not edit by hand.
//
// One entry per bank in this folder. Importing this module registers all of them as
// tracks, so the desk's song picker and every render tool can find them by id; the
// bank files themselves are ordinary source and are yours to edit.
//
// Rewritten whenever a .mid is converted, and again every time the desk builds its
// page — so adding, renaming or deleting a bank in here by hand needs nothing but a
// refresh. For everything else, \`node tools/import-midi.js --reindex\` rebuilds it.
//
// The game does not import this file. src/data/tracks.js resolves imported songs
// through a runtime registry precisely so a scratch import never reaches the build.
import { registerTrack } from '../tracks.js';
${imports}${imports ? '\n' : ''}
export const IMPORTED_BY_ID = {
${body}${body ? '\n' : ''}};

for (const [id, entry] of Object.entries(IMPORTED_BY_ID)) registerTrack({ id, ...entry });
`;
  // Only when it actually changed: the desk regenerates this on every page load, and
  // rewriting a byte-identical file still moves its mtime — which is enough to show
  // up as a change in an editor and to re-trigger anything watching the tree.
  const path = join(dir, 'index.js');
  if (!existsSync(path) || readFileSync(path, 'utf8') !== source) writeFileSync(path, source);
  return entries;
}
