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
  'tests/flyer-motion.js',
  'tests/mouse-controls.js',
  'tests/settings-menu.js',
  'tests/sound-test-menu.js',
  'tests/visualizers.js',
  'tests/megamix.js',
  'tests/mix.js',
  'tests/mixer-layout.js',
  // The arrangement layer, beside the mix layer it mirrors: that one is what a song
  // sounds like, this one is what plays when. Its first assertion is the one that
  // matters — an empty layer hands every song back the bank it always had — which is
  // tests/null-test.js's claim, made at the object rather than at the sample.
  'tests/arrangement.js',
  // Source-backed scratch creation: starter patterns, writable saves, history,
  // collision-safe ids, and a mixed legacy/scratch imported index.
  'tests/new-song.js',
  // The note semantics under the piano roll: what a cell becomes when it is drawn,
  // which is the difference between a bad pixel and a bank that throws.
  'tests/piano-roll.js',
  // The fourth caller of the one-note seam: a note PLAYED into a song rather than
  // drawn into one. Same note semantics as the roll — deliberately, it imports them —
  // so what this pins is the half the roll never needed: a heard position rounded to a
  // step, and a take that overdubs without deleting the part it landed on.
  'tests/note-recorder.js',
  // The other half of the voice library: tests/voices.js proves the presets sound,
  // this proves the desk can write one back into src/data/voices.js without
  // disturbing the 1200 hand-written lines around it. Up here rather than beside its
  // sibling because it needs no browser and runs in a blink.
  'tests/voice-source.js',
  'tests/layers.js',
  'tests/preview.js',
  // The other side of preview.js: that one is a note through a CHANNEL, this is a note
  // through none — the preset library's bench, where a sound that belongs to no song is
  // heard with no strip on it. Its sharpest claim is that the desk gets its channel
  // strips back afterwards, including when the engine throws.
  'tests/bench.js',
  // The third of the trio, and the one about time rather than signal: what the rack
  // does to a note that is ALREADY PLAYING when the preset under it is edited. Turning
  // a knob on the desk used to stop the bar you were listening to.
  'tests/voice-edit.js',
  // Beside it because it is the same rig — a rack on a real context in Chromium — and
  // the same subject from the other end: not what an edit does to a playing note, but
  // what one particular control does to the SOUND. It renders three drum hits and three
  // notes and counts their zero crossings, so it is a browser suite that finishes in
  // about a second.
  'tests/pitch-curve.js',
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
  'tests/sfx-routing.js',
  'tests/title-toasters.js',
  'tests/title-weapons.js',
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
  // Last three: all render the engine offline in Chromium, which is slower than every
  // other suite put together. MASH_NULL_ALL=1 widens the null test from two tracks
  // to five; tests/voices.js renders every voice in the catalogue once.
  //
  // Per-note duration — `bassLen` beside `bass`. Down here because its last five claims
  // are about what comes out of the speakers: a length that reads correctly in the file
  // and changes nothing about the sound is the one failure the unit half cannot see.
  'tests/note-duration.js',
  // What a length that long does to the song AFTER it: opening another song has to
  // stop the note that is still ringing, not merely duck it for half a second.
  'tests/song-switch.js',
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
