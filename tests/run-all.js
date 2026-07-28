// Test runner: smoke + integration + invariants + sims.
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const suites = [
  'tests/migration.js',
  'tests/difficulty-identity.js',
  'tests/run-complete.js',
  'tests/story-beats.js',
  'tests/tutorial.js',
  'tests/hero-kits.js',
  'tests/reliability.js',
  'tests/mouse-controls.js',
  'tests/settings-menu.js',
  'tests/sound-test-menu.js',
  'tests/visualizers.js',
  'tests/megamix.js',
  'tests/mix.js',
  // The arrangement layer, beside the mix layer it mirrors: that one is what a song
  // sounds like, this one is what plays when. Its first assertion is the one that
  // matters — an empty layer hands every song back the bank it always had — which is
  // tests/null-test.js's claim, made at the object rather than at the sample.
  'tests/arrangement.js',
  // The other half of the voice library: tests/voices.js proves the presets sound,
  // this proves the desk can write one back into src/data/voices.js without
  // disturbing the 1200 hand-written lines around it. Up here rather than beside its
  // sibling because it needs no browser and runs in a blink.
  'tests/voice-source.js',
  'tests/layers.js',
  'tests/preview.js',
  'tests/shop-themes.js',
  'tests/shop-menu.js',
  'tests/trophy-workshop.js',
  'tests/breaker-bonus.js',
  'tests/props.js',
  'tests/debris.js',
  'tests/star-power.js',
  'tests/character-rendering.js',
  'tests/renderer.js',
  'tests/density.js',
  'tests/title-sign.js',
  'tests/title-toasters.js',
  'tests/minigames.js',
  'tests/plug-tally.js',
  'tests/boss.js',
  'tests/attract.js',
  'tests/dev-menu.js',
  'tests/cast.js',
  'tests/mobile-lifecycle.js',
  'tests/gate.js',
  'tests/gate-dev.js',
  'tests/gate-allowed.js',
  'tests/gate-font-wait.js',
  'tests/build-shell.js',
  'tests/smoke.js',
  'tests/touch-smoke.js',
  // Last two: both render the engine offline in Chromium, which is slower than every
  // other suite put together. MASH_NULL_ALL=1 widens the null test from two tracks
  // to five; tests/voices.js renders every voice in the catalogue once.
  'tests/voices.js',
  'tests/null-test.js',
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
