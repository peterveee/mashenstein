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
  // The desk's way OUT — the WAV and the MIDI. Beside the layout suite because it is
  // the same kind of claim about the same tool, and browserless for the same reason:
  // what it pins is that both exports are built by code that can run without Node,
  // which is the whole of why the deployed desk can make them at all.
  'tests/mixer-export.js',
  // And the desk's way IN, which is the same claim from the other side: a MIDI file
  // arrives as one lane per part and NOTHING is merged onto anything else. Directly
  // after the export suite because the two share a round trip — a part that comes home
  // onto a layer has to be able to leave again on one.
  'tests/midi-import.js',
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
  // The other way a song file is born: a game song's music kept under another name
  // until somebody decides it is the version to ship. Beside new-song.js because it is
  // the same writer and the same folder — what it adds is the one line that makes an
  // alternate an alternate, and the proof that an ordinary save does not eat it.
  'tests/song-alternates.js',
  // And the third way, which is the same writer again with every claim taken OUT: a
  // copy names no parent, so nothing can promote it and the game bundle cannot see it.
  // Directly after the alternates suite because the two are read together — what makes
  // a copy safe is exactly the line an alternate carries.
  'tests/song-copies.js',
  // The note semantics under the piano roll: what a cell becomes when it is drawn,
  // which is the difference between a bad pixel and a bank that throws.
  'tests/piano-roll.js',
  // Musical note processors are nondestructive and shared by live game playback and
  // offline export. Keep their ordering and duration arithmetic browserless and exact.
  'tests/note-fx.js',
  // Freeze is a ranged render: sparse tracks walk only their active bars, while Note
  // FX and written gates can extend the end into what will actually sound.
  'tests/freeze-span.js',
  'tests/mash-freeze.js',
  // The audio-routing half of Note FX's neighbours: a bar-only effect keeps its tail
  // after the next bar switches back to direct, while frozen PCM replaces source notes
  // before the live fader. Measured in Chromium because both claims are about samples.
  'tests/song-processing.js',
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
  'tests/mrdr3-playground.js',
  'tests/formants.js',
  'tests/effect-presets.js',
  // And the third thing a preset file has to be true about: that every key in it has a
  // control, and every control has a key behind it. Reads the engine's own `v.<key>`
  // accesses and the panel's row definitions and requires the two to agree per play path —
  // the drift it was written for had hidden eight GameSynth lengths, five tap arrays and
  // the whole shape of `clapEngine`. Source reading, so it also runs in a blink.
  'tests/pot-coverage.js',
  'tests/key-mode.js',
  'tests/lfo.js',
  'tests/osc-sync.js',
  // And the half of that claim pot-coverage cannot make. It agrees at ROOT-key
  // granularity, so a leaf the full-window editor forgot to place hides behind the
  // hundred siblings sharing its root. This one is leaf-exact: every control the panel
  // defines appears in that layout, exactly once. Object walking, so it also blinks.
  'tests/synth-full-layout.js',
  // The graphs are a second grip on those controls: graph gestures move the pots, and pot
  // gestures redraw the graphs without rebuilding the card under the pointer.
  'tests/synth-graphs.js',
  // Undo uses one snapshot per completed edit, with continuous pot/graph drags coalesced
  // into one step rather than filling the stack with pointermove frames.
  'tests/mixer-undo.js',
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
  // The other half of the desk's shape decisions: layers.js is which tracks a song has,
  // this is what order they sit in.
  'tests/track-order.js',
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
  // A lane trimmed over a range of bars. Also a claim about the speakers and not the
  // graph: the trim routed every note on that lane through a gain pair BUILT PER STEP,
  // and a new pair is a new graph to the voice rack, which answered it by disposing
  // the pool the lookahead's notes were already booked on. The arrangement unit tests
  // all passed — the dB was written correctly and read correctly; the bar just had no
  // sound in it.
  'tests/bar-gain.js',
  // The same bar, moved rather than trimmed — and it cannot be done the same way, which
  // is why it has a suite of its own. Pan does not compose, so the offset is added to
  // the CHANNEL's pan instead of getting a node in front of it, and what that has to
  // prove is arithmetic: a lane at +10 with a bar of -20 sounds like a lane at -10, the
  // bar before it does not drift on its way there, and the pot itself never moves.
  'tests/bar-pan.js',
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
  'tests/bar-gain.js',
  'tests/bar-pan.js',
  'tests/music-variant.js',
  'tests/music-variant-render.js',
  'tests/voices.js',
  'tests/null-test.js',
  'tests/new-effects.js',
  'tests/song-processing.js',
]);

// A browser suite renamed out of the list above would quietly rejoin the fast gate and
// take the deploy down with it, which is exactly the failure this split exists to stop.
// Cheaper to notice here than in CI.
for (const s of browserSuites) {
  if (!suites.includes(s)) throw new Error(`browserSuites lists ${s}, which is not in suites`);
}

// ---- the SOUND group -------------------------------------------------------
//
// Everything whose subject is audio: the engine, the desk, the synth, the songs. It
// exists because the full run is minutes long and most of it is about characters,
// physics and pixels — none of which an afternoon on MRDR-3 or the mixing desk can
// reach. `npm run test:sound` is the gate to run between edits down there.
//
// It INCLUDES the browser suites, because the claims that actually matter about audio
// are claims about samples, and a browserless subset of them would be a gate that
// passes while the sound is wrong. It excludes exactly one: `tests/voices.js` renders
// every preset in the catalogue and takes longer than everything else here put
// together, and it is a catalogue-wide sweep rather than a regression gate.
//
// `tests/null-test.js` is deliberately IN. It is the one suite that says the engine
// still renders what it always did, so an audio change that moved it is the single
// most important thing to find out about — and it is the reason this group is not
// simply "the fast ones".
const soundSuites = [
  'tests/sound-test-menu.js', 'tests/visualizers.js', 'tests/megamix.js', 'tests/mix.js',
  'tests/mixer-layout.js', 'tests/mixer-export.js', 'tests/midi-import.js',
  'tests/mixer-undo.js', 'tests/mixer-loop.js', 'tests/song-loop.js', 'tests/new-song.js',
  'tests/song-copies.js', 'tests/song-alternates.js',
  'tests/arrangement.js', 'tests/swing.js', 'tests/piano-roll.js', 'tests/note-recorder.js',
  'tests/song-processing.js',
  'tests/preview.js', 'tests/key-mode.js', 'tests/layers.js', 'tests/track-order.js', 'tests/lfo.js',
  'tests/formants.js', 'tests/osc-sync.js', 'tests/mrdr3-playground.js',
  'tests/synth-full-layout.js', 'tests/synth-graphs.js', 'tests/pot-coverage.js',
  'tests/effect-presets.js', 'tests/voice-edit.js', 'tests/voice-source.js',
  'tests/sfx-routing.js', 'tests/pitch-curve.js',
  'tests/note-duration.js', 'tests/song-switch.js', 'tests/music-variant.js',
  'tests/music-variant-render.js', 'tests/null-test.js', 'tests/new-effects.js',
];
// A suite renamed out of `suites` would silently vanish from this group too, and a
// gate that covers less than it looks like it covers is the failure this file already
// refuses elsewhere. Cheaper to notice here than after shipping a broken sound.
for (const s of soundSuites) {
  if (!suites.includes(s)) throw new Error(`soundSuites lists ${s}, which is not in suites`);
}

const soundOnly = process.argv.includes('--sound') || process.env.MASH_SOUND === '1';
const withBrowser = soundOnly
  || process.argv.includes('--all') || process.env.MASH_ALL === '1';
const pool = soundOnly ? suites.filter((s) => soundSuites.includes(s)) : suites;
const selected = pool.filter((s) => withBrowser || !browserSuites.has(s));
const skipped = pool.filter((s) => !selected.includes(s));

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
// Said out loud for the same reason: this group is a subset by choice, and the choice
// has to be visible from the run rather than from the source.
if (soundOnly) {
  const left = suites.filter((s) => !soundSuites.includes(s));
  console.log(`\nSOUND ONLY: ran ${selected.length} audio suite(s); skipped ${left.length}`
    + ' non-audio suite(s) and tests/voices.js (the catalogue-wide preset render).');
  console.log('  before pushing anything that touches the engine:  npm run test:all');
}
if (warned.length) {
  console.log(`\n${warned.length} SUITE(S) PASSED WITH WARNINGS: ${warned.join(', ')}`);
  console.log('  scroll up to that suite for the detail — it did not fail the run.');
}
console.log(failed ? `\n${failed} SUITE(S) FAILED` : '\nALL SUITES PASSED');
process.exit(failed ? 1 : 0);
