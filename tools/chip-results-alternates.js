// 8-BIT RESULTS — the cabinets' 8-bit alternates. 8 Oct 2026. See tools/lib/chip-results-mixes.js.
//
//   node tools/chip-results-alternates.js make [cabinet song …]   make each `<id>-8bit` alternate
//         --force                                                 remake one that exists — its
//                                                                 mixing is lost
//   node tools/chip-results-alternates.js export                  the game's copy of them
//                                                                 (the desk does this on Save)
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeAll, exportChipMixes, CHIP_MIXES_FILE } from './lib/chip-results-mixes.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const command = argv[0];
const named = argv.slice(1).filter((a) => !a.startsWith('--'));

if (command === 'make') {
  const { made, exported } = await makeAll(ROOT, { force: argv.includes('--force'), only: named.length ? named : null });
  for (const m of made) console.log(m.kept ? `kept  ${m.id} (it exists; --force remakes it)` : `made  ${m.id}: ${m.changed} parts on the 8-Bit set`);
  console.log(exported.changed ? `wrote ${CHIP_MIXES_FILE}` : `${CHIP_MIXES_FILE} already matches`);
} else if (command === 'export') {
  const r = await exportChipMixes(ROOT);
  console.log(r.changed ? `wrote ${CHIP_MIXES_FILE} (${r.ids.join(', ')})` : `${CHIP_MIXES_FILE} already matches`);
} else {
  console.error('usage: node tools/chip-results-alternates.js make [song …] [--force] | export');
  process.exit(1);
}
