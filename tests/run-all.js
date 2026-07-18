// Test runner: smoke + integration + invariants + sims.
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const suites = [
  'tests/migration.js',
  'tests/difficulty-identity.js',
  'tests/run-complete.js',
  'tests/minigames.js',
  'tests/boss.js',
  'tests/smoke.js',
  'tools/fairness-sim.js',
  'tools/economy-sim.js',
];

let failed = 0;
for (const suite of suites) {
  console.log(`\n=== ${suite} ===`);
  const r = spawnSync('node', [join(root, suite)], { stdio: 'inherit', env: { ...process.env, SEEDS: process.env.SEEDS || '100' } });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} SUITE(S) FAILED` : '\nALL SUITES PASSED');
process.exit(failed ? 1 : 0);
