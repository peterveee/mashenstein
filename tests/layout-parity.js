// Layout parity: the stage-layouts system is a NO-OP for un-edited stages.
//
// tests/fixtures/layout-baseline.json holds spawn ledgers captured from real
// headless runs BEFORE src/game/layout.js existed (tools/capture-layout-baseline.js).
// This suite replays the same (stage × seed) matrix through the current build
// and requires every ledger to match the recording — every checkpoint, every
// scripted pit, every route, and every single obstacle and pickup, in order,
// at the position it first appeared.
//
// What a failure means: the seeded generation of an UN-EDITED stage moved.
// Either a change disturbed one of the rng streams (an extra draw, a filter
// after the roll instead of before it), or generation behaviour changed on
// purpose — in which case re-capture with tools/capture-layout-baseline.js
// and say so in the commit. A failing run prints the first divergence, which
// names the stream that moved.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATRIX, FIXTURE_PATH } from './lib/layout-matrix.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(readFileSync(join(root, FIXTURE_PATH), 'utf8'));
const byKey = new Map(fixture.map((l) => [`${l.stage}:${l.seed}`, l]));

let failed = false;
function fail(msg) { console.error('FAIL:', msg); failed = true; }

for (const { stage, seeds } of MATRIX) {
  for (const seed of seeds) {
    const key = `${stage}:${seed}`;
    const want = byKey.get(key);
    if (!want) { fail(`${key}: missing from fixture — run tools/capture-layout-baseline.js`); continue; }

    const r = spawnSync('node', [join(root, 'tests/lib/capture-ledger.js'), stage, String(seed)], {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
    if (r.status !== 0) { fail(`${key}: capture crashed\n${r.stderr}`); continue; }
    const got = JSON.parse(r.stdout);

    // enter()-time resolution first: a mismatch here is cheaper to read than
    // its thousand-line consequence in the spawn list.
    for (const field of ['totalDist', 'duration', 'finishDogPlanned', 'loopAt']) {
      if (JSON.stringify(got[field]) !== JSON.stringify(want[field])) {
        fail(`${key}: ${field} = ${JSON.stringify(got[field])}, fixture has ${JSON.stringify(want[field])}`);
      }
    }
    for (const field of ['checkpoints', 'pitPlan', 'routes']) {
      if (JSON.stringify(got[field]) !== JSON.stringify(want[field])) {
        fail(`${key}: ${field} diverged\n  got:     ${JSON.stringify(got[field])}\n  fixture: ${JSON.stringify(want[field])}`);
      }
    }

    // The spawn ledger, entity by entity. Report the FIRST divergence with a
    // little context: the entity where the streams forked is the diagnosis,
    // everything after it is noise.
    const n = Math.max(got.spawns.length, want.spawns.length);
    let diverged = -1;
    for (let i = 0; i < n; i++) {
      if (JSON.stringify(got.spawns[i]) !== JSON.stringify(want.spawns[i])) { diverged = i; break; }
    }
    if (diverged >= 0) {
      const ctx = (list, i) => list.slice(Math.max(0, i - 2), i + 3).map((s) => JSON.stringify(s)).join(' ');
      fail(`${key}: spawn ledger diverged at index ${diverged} of ${want.spawns.length}\n`
        + `  got:     … ${ctx(got.spawns, diverged)} …\n`
        + `  fixture: … ${ctx(want.spawns, diverged)} …`);
    } else if (got.spawns.length !== want.spawns.length) {
      fail(`${key}: spawn count ${got.spawns.length} != fixture ${want.spawns.length}`);
    } else {
      console.log(`ok: ${key} — ${got.spawns.length} spawns match`);
    }
  }
}

console.log(failed ? 'LAYOUT-PARITY: FAILED' : 'LAYOUT-PARITY: PASSED');
process.exit(failed ? 1 : 0);
