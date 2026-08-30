// Capture the layout parity baseline: the golden spawn ledgers that
// tests/layout-parity.js replays against.
//
// The fixture is the pre-change truth. It exists so the stage-layouts system
// (src/game/layout.js, src/data/stage-layouts.js) can be proven a no-op for
// un-edited stages: capture on a tree WITHOUT the change, land the change,
// and the parity suite holds every run to the recorded ledger. Re-capturing
// is therefore a deliberate act — it means "the new generation behaviour is
// the intended one now" — and never something a failing test does for you.
//
// The fixture is TRACKED (tests/fixtures/), the one exception to work/ that a
// golden test is: a baseline nobody commits is a baseline every machine
// quietly regenerates around the very drift it was meant to catch.
//
// Usage: node tools/capture-layout-baseline.js
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATRIX, FIXTURE_PATH } from '../tests/lib/layout-matrix.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const runs = [];
for (const { stage, seeds } of MATRIX) {
  for (const seed of seeds) {
    const r = spawnSync('node', [join(root, 'tests/lib/capture-ledger.js'), stage, String(seed)], {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
    if (r.status !== 0) {
      console.error(`capture failed for ${stage} seed ${seed}:\n${r.stderr}`);
      process.exit(1);
    }
    const ledger = JSON.parse(r.stdout);
    if (!ledger.ended) {
      console.error(`run did not end: ${stage} seed ${seed} — refusing to bake a truncated ledger`);
      process.exit(1);
    }
    console.log(`${stage} seed ${seed}: ${ledger.spawns.length} spawns, success=${ledger.success}`);
    runs.push(ledger);
  }
}

const out = join(root, FIXTURE_PATH);
mkdirSync(dirname(out), { recursive: true });
// One run per line: a parity failure diffs readably instead of as one blob.
writeFileSync(out, '[\n' + runs.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n');
console.log(`wrote ${runs.length} ledgers to ${FIXTURE_PATH}`);
