// LIGHT VERSIONS — the trial songs' light alternates. 20 Oct 2026. See tools/lib/light-mixes.js.
//
//   node tools/light-alternates.js make [song …]   make each `<id>-light` alternate
//         --force                                   remake one that exists — its mixing is lost
//   node tools/light-alternates.js export          the game's copy of them (the desk does this
//                                                   on Save)
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeLightAlternate, exportLightMixes, LIGHT_RECIPES, LIGHT_MIXES_FILE } from './lib/light-mixes.js';
import { writeImportedIndex } from './lib/imported-index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const command = argv[0];
const named = argv.slice(1).filter((a) => !a.startsWith('--'));

if (command === 'make') {
  for (const id of named.length ? named : Object.keys(LIGHT_RECIPES)) {
    const m = await makeLightAlternate(ROOT, id, { force: argv.includes('--force') });
    console.log(m.kept ? `kept  ${m.id} (it exists; --force remakes it)` : `made  ${m.id}`);
  }
  writeImportedIndex(ROOT);
  const r = await exportLightMixes(ROOT);
  console.log(r.changed ? `wrote ${LIGHT_MIXES_FILE}` : `${LIGHT_MIXES_FILE} already matches`);
} else if (command === 'export') {
  const r = await exportLightMixes(ROOT);
  console.log(r.changed ? `wrote ${LIGHT_MIXES_FILE} (${r.ids.join(', ')})` : `${LIGHT_MIXES_FILE} already matches`);
} else {
  console.error('usage: node tools/light-alternates.js make [song …] [--force] | export');
  process.exit(1);
}
