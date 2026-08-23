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
import { join, relative, sep } from 'path';

export const IMPORTED_DIR = 'src/data/imported';

// Scratch songs live in the disposable drawer, and the reason is the drawer's whole
// point: `work/` is the one directory that is always safe to delete (see CLAUDE.md), and
// a scratch song is by definition something you made to hear an idea. They had
// accumulated to 97 files in `src/data/imported/`, tracked, outnumbering the eleven
// genuine MIDI imports nine to one and making the folder's own name a lie.
//
// What stays in `src/data/imported/`: MIDI imports, the copies "Save a copy" takes, the
// style auditions, and game alternates. Those are either somebody's source arriving from
// outside or a deliberate keepsake — none of them is throwaway by construction.
//
// The consequence, stated because it is the trade and not a side effect: a scratch song
// is no longer in version control. A fresh clone has none, and deleting one is final.
export const SCRATCH_DIR = 'work/scratch';

// Every directory a desk song may be read from, and the order they win in when an id
// somehow exists in both. New scratch songs are written to SCRATCH_DIR; everything the
// desk creates that is NOT scratch keeps going to IMPORTED_DIR.
export const SONG_DIRS = [IMPORTED_DIR, SCRATCH_DIR];

/**
 * How `src/data/imported/index.js` reaches a bank in `dir` — the generated index lives
 * in the imported folder and now has to import across the tree to the scratch drawer.
 * Computed rather than written out so the two directories can move independently, and
 * forced to forward slashes because this string becomes an ES import specifier.
 */
const specifierFrom = (fromDir, dir, file) => {
  if (dir === fromDir) return `./${file}`;
  const rel = relative(fromDir, dir).split(sep).join('/');
  return `${rel.startsWith('.') ? rel : `./${rel}`}/${file}`;
};

/** "CHOPIN3.MID" -> "chopin3": the filename becomes the track id, so it must be one. */
export function slugFor(name) {
  const slug = String(name).replace(/\.midi?$/i, '').replace(/\.js$/i, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return slug || 'imported';
}

/** What is in the folders right now: one entry per bank file, sorted by id. */
export function readImported(root) {
  const out = [];
  const seen = new Set();
  for (const songDir of SONG_DIRS) readSongDir(root, songDir, out, seen);
  // Sorted across the two directories rather than within each, so the generated index
  // reads as one list of songs and stays byte-stable when a song changes drawer. By
  // FILE name, which is what a single-directory `readdirSync().sort()` gave before there
  // were two: sorting by id instead reorders `the-food-court-alt-2` against
  // `the-food-court-alt` — identical output, gratuitous diff in a tracked generated file.
  out.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  return out;
}

function readSongDir(root, songDir, out, seen) {
  const dir = join(root, songDir);
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.js') || file === 'index.js') continue;
    // One id, one song. A file that collides with one already found in an earlier
    // directory is skipped rather than merged: two entries under one key would make the
    // generated index quietly drop one of them, and which one would depend on the
    // object literal's ordering.
    const id = file.replace(/\.js$/, '');
    if (seen.has(id)) continue;
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
    // Which song this one is an alternate of, read from the file for the same reason
    // the group is: the file is the record. A parent inferred from an id would go on
    // being inferred after somebody renamed either end of it.
    const parentLiteral = /^export const alternateOf\s*=\s*("(?:\\.|[^"])*")\s*;?/m.exec(src);
    seen.add(id);
    out.push({
      id,
      constName: bank ? null : m[1],
      bankExport: bank ? 'bank' : m[1],
      title: title || m[1],
      group: bank ? (groupLiteral ? JSON.parse(groupLiteral[1]) : 'scratch') : 'imported',
      writable: bank && src.includes('// ---- THE DESK WRITES BELOW HERE'),
      alternateOf: bank && parentLiteral ? JSON.parse(parentLiteral[1]) : null,
      file,
      dir: songDir,
    });
  }
}

/**
 * The path of the song file with this id, in whichever song directory holds it.
 *
 * The one place that knows a song can be in more than one drawer, so every caller that
 * used to ask `existsSync(join(root, IMPORTED_DIR, id + '.js'))` asks this instead and
 * cannot go on being right about only half the tree.
 */
export function songFileIn(root, id) {
  for (const dir of SONG_DIRS) {
    const path = join(root, dir, `${id}.js`);
    if (existsSync(path)) return path;
  }
  return null;
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
  // A bank already at that id is this song coming back, whatever else claims the
  // name — which is what makes the suffixed case land on itself the second time too:
  // plumber.mid becomes plumber-2 once, and plumber-2 every time after. Asked of every
  // song directory, or an import would take the id of a scratch song in the drawer and
  // the two would fight over one entry in the index.
  const free = (id) => songFileIn(root, id) || !isTaken(id);
  let id = slug;
  for (let i = 2; !free(id); i++) id = `${slug}-${i}`;
  return id;
}

/**
 * One generated index file: the imports, the id map, and the registration loop.
 *
 * Two of these are written rather than one, and the split is the whole point. The
 * tracked index may name only TRACKED files — `work/` is gitignored, so a tracked file
 * that imports across into the scratch drawer resolves on the machine that made it and
 * nowhere else. A fresh clone (CI is one) then fails to load it, and it fails as a
 * module-resolution stack trace from whatever imported it, three layers from the cause.
 * The scratch index lives in the drawer beside the banks it names, so it is missing
 * exactly when they are.
 */
function indexSource(entries, fromDir, { header, tracksPath, mapName }) {
  // Two files can export the same const name — song.mid and SONG.mid — so a name
  // that is already spoken for comes in under an alias. Per file, because these are
  // separate modules and a name only has to be unique within the one it lands in.
  const used = new Set();
  const local = new Map();
  for (const e of entries) {
    let name = e.constName || e.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    for (let i = 2; used.has(name); i++) name = `${e.constName || e.id}_${i}`;
    used.add(name);
    local.set(e.id, name);
  }

  const from = (e) => specifierFrom(fromDir, e.dir, e.file);
  const imports = entries.map((e) => e.constName
    ? (local.get(e.id) === e.constName
      ? `import { ${e.constName} } from '${from(e)}';`
      : `import { ${e.constName} as ${local.get(e.id)} } from '${from(e)}';`)
    : `import * as ${local.get(e.id)} from '${from(e)}';`).join('\n');
  const body = entries.map((e) => {
    const bank = e.constName ? local.get(e.id) : `${local.get(e.id)}.bank`;
    const title = e.constName ? JSON.stringify(e.title) : `${local.get(e.id)}.title`;
    const group = JSON.stringify(e.group || 'imported');
    const writable = e.writable ? 'true' : 'false';
    const parent = e.alternateOf ? `, alternateOf: ${JSON.stringify(e.alternateOf)}` : '';
    return `  ${JSON.stringify(e.id)}: `
      + `{ bank: ${bank}, title: ${title}, group: ${group}, writable: ${writable}${parent} },`;
  }).join('\n');

  return `${header}import { registerTrack } from '${tracksPath}';
${imports}${imports ? '\n' : ''}
export const ${mapName} = {
${body}${body ? '\n' : ''}};

for (const [id, entry] of Object.entries(${mapName})) registerTrack({ id, ...entry });
`;
}

const IMPORTED_HEADER = `// Imported songs — GENERATED by tools/lib/imported-index.js. Do not edit by hand.
//
// One entry per bank in this folder. Importing this module registers all of them as
// tracks, so the desk's song picker and every render tool can find them by id; the
// bank files themselves are ordinary source and are yours to edit.
//
// Rewritten whenever a .mid is converted, and again every time the desk builds its
// page — so adding, renaming or deleting a bank in here by hand needs nothing but a
// refresh. For everything else, \`node tools/import-midi.js --reindex\` rebuilds it.
//
// TRACKED songs only. Scratch banks are indexed by work/scratch/index.js, next to the
// banks themselves — see indexSource() for why they cannot be named from here.
//
// The game does not import this file. src/data/tracks.js resolves imported songs
// through a runtime registry precisely so a scratch import never reaches the build.
`;

const SCRATCH_HEADER = `// Scratch songs — GENERATED by tools/lib/imported-index.js. Do not edit by hand.
//
// The disposable half of the song list. It lives in the drawer with the banks it names
// so that it is missing exactly when they are: \`work/\` is gitignored, and a fresh
// clone has neither this file nor a single import that would fail to resolve.
//
// Written on every reindex even when there are no scratch songs, because the desk
// bundle imports it by name — an empty index registers nothing and bundles clean.
`;

/** Rewrite the generated song indexes from the folders. Returns what they listed. */
export function writeImportedIndex(root) {
  const entries = readImported(root);
  mkdirSync(join(root, IMPORTED_DIR), { recursive: true });
  mkdirSync(join(root, SCRATCH_DIR), { recursive: true });

  // Only when it actually changed: the desk regenerates this on every page load, and
  // rewriting a byte-identical file still moves its mtime — which is enough to show
  // up as a change in an editor and to re-trigger anything watching the tree.
  const writeIfChanged = (path, source) => {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== source) writeFileSync(path, source);
  };

  writeIfChanged(join(root, IMPORTED_DIR, 'index.js'),
    indexSource(entries.filter((e) => e.dir === IMPORTED_DIR), IMPORTED_DIR,
      { header: IMPORTED_HEADER, tracksPath: '../tracks.js', mapName: 'IMPORTED_BY_ID' }));

  writeIfChanged(join(root, SCRATCH_DIR, 'index.js'),
    indexSource(entries.filter((e) => e.dir === SCRATCH_DIR), SCRATCH_DIR,
      { header: SCRATCH_HEADER, tracksPath: '../../src/data/tracks.js', mapName: 'SCRATCH_BY_ID' }));

  // Game alternates are the one deliberate exception to the rule above: they are
  // authored in the imported folder but are allowed into the game dev bundle. Keep
  // this second index generated from the folder too, so a newly saved alternate is
  // selectable without a hand edit or a hardcoded id list. Scratch/MIDI imports stay
  // out of it and therefore stay out of the game bundle.
  // Never from the scratch drawer, and not merely because nothing there is marked
  // `alternate` today: this index reaches the GAME bundle, and `work/` is gitignored, so
  // a build from a fresh clone would be missing a file the game imports by name.
  const alternates = entries.filter((e) => e.group === 'alternate' && !e.constName
    && e.dir === IMPORTED_DIR);
  const altUsed = new Set();
  const altLocal = (e) => {
    let name = `GAME_ALT_${e.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
    for (let i = 2; altUsed.has(name); i++) name = `${name}_${i}`;
    altUsed.add(name);
    return name;
  };
  const altImports = alternates.map((e) => {
    const name = altLocal(e);
    return `import * as ${name} from '${specifierFrom('src/data', e.dir, e.file)}';`;
  }).join('\n');
  const altNames = alternates.map((e, i) => {
    const name = [...altUsed][i];
    return `  ${name},`;
  }).join('\n');
  const altSource = `// Game alternates — GENERATED by tools/lib/imported-index.js. Do not edit by hand.
//
// Only saved songs explicitly marked group: "alternate" are imported here. Scratch
// songs and MIDI auditions remain desk-only and never enter the game bundle.
${altImports}${altImports ? '\n' : ''}
export const GAME_ALTERNATES = Object.fromEntries([
${altNames}${altNames ? '\n' : ''}].map((song) => [song.id, song]));

export function gameAlternate(id, parentId = null) {
  const song = id ? GAME_ALTERNATES[id] : null;
  return song && (!parentId || song.alternateOf === parentId) ? song : null;
}
`;
  const altPath = join(root, 'src/data/game-alternates.js');
  mkdirSync(join(root, 'src/data'), { recursive: true });
  if (!existsSync(altPath) || readFileSync(altPath, 'utf8') !== altSource) writeFileSync(altPath, altSource);
  return entries;
}
