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
  'tests/mixer-loop.js',
  // A song's own way in and repeat — `arrangement.loop`. Beside the locator loop above
  // because they arm the same machinery and only one of them is saved with the song.
  'tests/song-loop.js',
  // The arrangement layer, beside the mix layer it mirrors: that one is what a song
  // sounds like, this one is what plays when. Its first assertion is the one that
  // matters — an empty layer hands every song back the bank it always had — which is
  // tests/null-test.js's claim, made at the object rather than at the sample.
  'tests/arrangement.js',
  // The other end of the same control: `arrangement.js` covers the desk's setSwing,
  // which writes a number into a draft, and this covers the engine's, which moves it
  // under a running transport. Cheap and browserless, which is itself the claim — a
  // groove change builds nothing and disposes nothing.
  'tests/swing.js',
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
  'tests/effect-presets.js',
  // And the third thing a preset file has to be true about: that every key in it has a
  // control, and every control has a key behind it. Reads the engine's own `v.<key>`
  // accesses and the panel's row definitions and requires the two to agree per play path —
  // the drift it was written for had hidden eight GameSynth lengths, five tap arrays and
  // the whole shape of `clapEngine`. Source reading, so it also runs in a blink.
  'tests/pot-coverage.js',
  // And the half of that claim pot-coverage cannot make. It agrees at ROOT-key
  // granularity, so a leaf the full-window editor forgot to place hides behind the
  // hundred siblings sharing its root. This one is leaf-exact: every control the panel
  // defines appears in that layout, exactly once. Object walking, so it also blinks.
  'tests/synth-full-layout.js',
  // The same shape of claim for gameplay numbers: that the constants the dev
  // strip moves still exist, under those names, as plain numbers, in the files
  // the manifest names — and that the rewrite which makes them movable never
  // reaches a production build. Pure source reading, so it runs in a blink.
  'tests/tunables.js',
  // The behavioural half: builds the bundle the way `npm run dev` does and
  // proves a setter reaches the arithmetic across a module boundary, that a
  // stored tuning cannot poison a later session, and that COPY CONSTANTS emits
  // a diff rather than a dump.
  'tests/tune-store.js',
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
  'tests/toon-ink-scale.js',
  'tests/renderer.js',
  'tests/density.js',
  'tests/frame-health.js',
  'tests/camera-framing.js',
  'tests/rewind-pooling.js',
  'tests/art-warmup.js',
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
  // And the mirror image of it: a cabinet's treatment handing over to a level's mix
  // must do the opposite — keep the clock, keep the note ringing, change only the
  // presentation. Same claim, opposite sign. The first is the clock, in counters; the
  // second is the sound, in samples, and it is the one that caught a muted lane never
  // coming back — a failure every counter in the first was too happy to see.
  'tests/music-variant.js',
  'tests/music-variant-render.js',
  'tests/voices.js',
  'tests/null-test.js',
  'tests/new-effects.js',
  'tools/fairness-sim.js',
  'tools/economy-sim.js',
];

// The suites that launch a real Chromium and render the engine offline. They are the
// whole cost of a run: most of them finish in a blink, but tests/voices.js renders every
// preset in the catalogue and takes minutes on its own, which is more than the rest of
// the file put together.
//
// So they are ON DEMAND. `npm test` is the fast gate — the one worth running between
// edits and on every push — and `npm run test:all` is the full one. They also need a
// browser binary that `npm ci` does not install, so a machine that has never run
// `npx playwright install chromium` fails all of them at the launch rather than at an
// assertion; that is the second reason not to fire them off unasked.
const browserSuites = new Set([
  'tests/mixer-loop.js',
  'tests/song-loop.js',
  'tests/voice-edit.js',
  'tests/pitch-curve.js',
  'tests/sfx-routing.js',
  'tests/note-duration.js',
  'tests/song-switch.js',
  'tests/music-variant.js',
  'tests/music-variant-render.js',
  'tests/voices.js',
  'tests/null-test.js',
  'tests/new-effects.js',
]);

// A browser suite renamed out of the list above would quietly rejoin the fast gate and
// take the deploy down with it, which is exactly the failure this split exists to stop.
// Cheaper to notice here than in CI.
for (const s of browserSuites) {
  if (!suites.includes(s)) throw new Error(`browserSuites lists ${s}, which is not in suites`);
}

const withBrowser = process.argv.includes('--all') || process.env.MASH_ALL === '1';
const selected = suites.filter((s) => withBrowser || !browserSuites.has(s));
const skipped = suites.filter((s) => !selected.includes(s));

// Exit 2 is the one status that is neither pass nor fail: "passed, but something in
// here wants a human to look at it". So far that is tests/null-test.js reporting a mix
// that no longer matches its baseline — a deliberate edit, not a regression, but not
// something to discover three weeks later either. Collected here and repeated at the
// very end, because a warning halfway up a run this long is a warning nobody reads.
let failed = 0;
const warned = [];
for (const suite of selected) {
  console.log(`\n=== ${suite} ===`);
  const r = spawnSync('node', [join(root, suite)], { stdio: 'inherit', env: { ...process.env, SEEDS: process.env.SEEDS || '100' } });
  if (r.status === 2) warned.push(suite);
  else if (r.status !== 0) failed++;
}
// Said out loud, every time. A gate that silently covers less than it looks like it
// covers is worse than a slow one.
if (skipped.length) {
  console.log(`\nskipped ${skipped.length} browser suite(s): ${skipped.join(', ')}`);
  console.log('  run them with:  npm run test:all   (needs: npx playwright install chromium)');
}
if (warned.length) {
  console.log(`\n${warned.length} SUITE(S) PASSED WITH WARNINGS: ${warned.join(', ')}`);
  console.log('  scroll up to that suite for the detail — it did not fail the run.');
}
console.log(failed ? `\n${failed} SUITE(S) FAILED` : '\nALL SUITES PASSED');
process.exit(failed ? 1 : 0);
