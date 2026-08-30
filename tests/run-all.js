// Test runner: smoke + integration + invariants + sims.
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const suites = [
  'tests/migration.js',
  'tests/difficulty-identity.js',
  'tests/run-complete.js',
  // The golden ledger: real headless runs held spawn-for-spawn to the recording
  // in tests/fixtures/layout-baseline.json, so the stage-layout system stays a
  // provable no-op for every stage nobody has edited.
  'tests/layout-parity.js',
  // And the file that system reads: schema, and the registry names a section
  // can quietly stop matching when an obstacle is renamed.
  'tests/stage-layouts.js',
  'tests/story-beats.js',
  'tests/tutorial.js',
  'tests/hero-kits.js',
  'tests/mid-air-slide-kick.js',
  'tests/beat-chart.js',
  'tests/reliability.js',
  'tests/flyer-motion.js',
  'tests/mouse-controls.js',
  'tests/settings-menu.js',
  'tests/sound-test-menu.js',
  'tests/visualisers.js',
  // The other end of the same pack: the presets driven by an imported file instead
  // of by the sequencer. song-analysis pins the engine mirror that render-video and
  // the page now share; beat-detect pins the estimates that stand in for a
  // sequencer that isn't there; beat-detect-audio checks those estimates against
  // real renders whose tempo is known, because a synthetic fixture can always be
  // tuned until it passes.
  'tests/song-analysis.js',
  'tests/beat-detect.js',
  'tests/beat-detect-audio.js',
  'tests/visualiser-page.js',
  'tests/megamix.js',
  'tests/mix.js',
  'tests/mixer-layout.js',
  // The desk's watchdog decides whether to reduce its own drawing. Beside the layout
  // suite because it is the same kind of claim — a contract about the desk, provable
  // without a browser — and browserless for a sharper reason: a threshold machine
  // tested through requestAnimationFrame is tested through the thing it throttles.
  'tests/performance-relief.js',
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
  'tests/rearrange.js',
  // What Rearrange is allowed to believe about the song it is cutting up. Ahead of the
  // recipe suite's own concerns because the generator's boundary choices are only as
  // good as this, and a wrong number here makes worse music rather than an error.
  'tests/rearrange-profile.js',
  // And the two claims about a recipe that is already PLAYING: the song's own drums
  // running straight underneath a rearranged top, and an edit that waits for the bar
  // line instead of restarting the transport.
  'tests/rearrange-drums.js',
  // The arrangement layer, beside the mix layer it mirrors: that one is what a song
  // sounds like, this one is what plays when. Its first assertion is the one that
  // matters — an empty layer hands every song back the bank it always had — which is
  // tests/null-test.js's claim, made at the object rather than at the sample.
  'tests/arrangement.js',
  // Which half steps the scheduler owes the song. Beside the arrangement suite because
  // it is the same subject from the clock's side: a 1/32 arpeggiator anywhere promotes
  // the transport everywhere, and what may be skipped on the promoted ticks is a claim
  // about lane array lengths that has to hold for every song, not just the one measured.
  'tests/fine-tick-scheduling.js',
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
  'tests/note-fx-render.js',
  // Freeze is a ranged render: sparse tracks walk only their active bars, while Note
  // FX and written gates can extend the end into what will actually sound.
  'tests/freeze-span.js',
  'tests/mash-freeze.js',
  // And what a frozen track actually DEPENDS on. Beside the freeze suites because it is
  // the third question about the same feature: freeze-span picks what to render,
  // mash-freeze pins the file it goes into, and this decides when the render is stale.
  // Getting it wrong in one direction wastes minutes of rendering; in the other it
  // plays stale audio under a song that has moved.
  'tests/freeze-fingerprint.js',
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
  'tests/tngr2.js',
  'tests/tngr2-audio.js',
  // The gate the whole TNGR-2 completion plan hangs off: whether this project can host
  // an AudioWorkletProcessor live AND in the OfflineAudioContext its stems come out of.
  // Kept as a permanent regression now that it passes — see docs/TNGR-2-completion-spec.md §3.
  'tests/tngr2-worklet-proof.js',
  // The same gate, asked again for MRDR-3 — and worth asking twice rather than inheriting,
  // because MRDR-3 puts one thing in front of the mechanism that TNGR-2 never did: a CHORD
  // is ONE event whose tones sum into one shaper (docs/MRDR-3-worklet-spec.md §5.1), so the
  // unit that has to survive a stem, a panic and a teardown is the GROUP, not the note.
  'tests/mrdr3-worklet-proof.js',
  // The rule about a STRING that nothing else would enforce: two dispatch identities
  // exist during the worklet project and only one may ever be seen by a player, and the
  // native-only cache machinery must stay unreachable from the family predicate — which
  // is what makes "an AW lane never caches" a fact rather than an intention (§1.1, §10).
  // Browserless: every claim is about the catalogue or about source text.
  'tests/mrdr3-identity.js',
  // The Tier-A claim, node by node: the fidelity strategy says most of MRDR-3's path is
  // built from nodes the spec DEFINES, so porting them is transcription rather than
  // redesign — and that assertion is worth exactly what this suite measures. It is also
  // where the a-rate coefficient question was settled by measurement rather than
  // assumption (docs/MRDR-3-worklet-spec.md §3.1, §13).
  'tests/mrdr3-primitives.js',
  // And the fourth Tier-A port, which is the one the migration's SIZE depends on: if the
  // timeline evaluates automation the way an AudioParam does, the engine's envelope
  // builders can be shared rather than re-derived, and envelope shape drops off the
  // ear-approval list entirely (docs/MRDR-3-worklet-spec.md §3.2).
  'tests/mrdr3-params.js',
  // The one primitive the spec does NOT define, so the one that cannot be a
  // transcription: the band-limited oscillator. Browserless, because what can be settled
  // without the ear is whether it is band-limited at all, whether it steps at a mip
  // boundary, and whether it is deterministic — which are the three ways a wavetable
  // oscillator goes wrong (docs/MRDR-3-worklet-spec.md §3.3).
  'tests/mrdr3-osc.js',
  'tests/mrdr3-finite.js',
  // What the core does with a backlog when the pull comes back. Its own suite because the
  // strand it describes is invisible from every other angle — the port answers, no fault
  // is raised, and the counters that would show it only move inside `process`.
  'tests/mrdr3-stale.js',
  // A KEY THAT COMES UP ENDS THE NOTE. Beside the stale suite because it is the same kind
  // of invisible: a held note is the one kind nothing sequenced can reach, so no render,
  // no bounce and no baseline can see a note-off that does nothing — and MRDR-3's did
  // nothing at all, leaving every preset in the catalogue ringing for its thirty-second
  // backstop after the finger came up.
  'tests/mrdr3-release.js',
  'tests/note-cache-urgent.js',
  // The rule the whole project depends on, made checkable: ONE core string, two hosts,
  // compared at ZERO tolerance. The moment the live path and the render path compute
  // anything differently, a stem stops matching the mix it came from and every baseline
  // becomes a guess. Carries the purity scan, block-size invariance and the stray-backtick
  // guard with it, because they are the same claim (docs/MRDR-3-worklet-spec.md §11).
  'tests/mrdr3-dsp-parity.js',
  // Lifecycle: one persistent node per lane, notes as messages, a patch edit reaching a
  // standing lane without rebuilding it, and the two delivery paths that TNGR-2's proof
  // gate showed are not interchangeable (docs/MRDR-3-worklet-spec.md §6).
  'tests/mrdr3-controller.js',
  // The DSP core on its own, in Node — browserless, which is itself the claim: the core
  // takes its rate as an argument and is handed its frame, so it reaches for no worklet
  // global and the same source runs in both hosts.
  'tests/tngr2-dsp.js',
  // The wavetable assets: finite, zero-DC, cyclic, band-limited per mip level, and —
  // the one that rots quietly — still matching the authoring they were generated from.
  'tests/tngr2-tables.js',
  // The preset schema: defaults, validation, and the migration that has to carry all 43
  // prototype-shaped presets into v1 without changing what any of them was measured at.
  'tests/tngr2-schema.js',
  // Lifecycle and exports: one node per lane, stems summing to their mix, and a range
  // render matching the same range inside a full one.
  'tests/tngr2-controller.js',
  // A key pressed on a lane that has not finished building. The rack's bookkeeping, not
  // the worklet's — a held note queued against a missing lane used to come back sounding
  // with nothing left that could release it, which on a keyboard glide is every key.
  'tests/tngr2-queue.js',
  // And the offline half of the same question: a lane that does not enter until after the
  // bounce's just-in-time horizon. Its worklet takes the schedule at construction, so the
  // walk has to be complete before the render starts or the part is simply not there.
  'tests/tngr2-jit-bounce.js',
  // ...and the proof that it IS both hosts: the same events through a real worklet and
  // through the reference renderer, compared at zero tolerance. §2's "do not maintain two
  // approximate synths" is only worth something if something checks it.
  'tests/tngr2-dsp-parity.js',
  'tests/effect-presets.js',
  // And the third thing a preset file has to be true about: that every key in it has a
  // control, and every control has a key behind it. Reads the engine's own `v.<key>`
  // accesses and the panel's row definitions and requires the two to agree per play path —
  // the drift it was written for had hidden eight KNDO-5 lengths, five tap arrays and
  // the whole shape of `clapEngine`. Source reading, so it also runs in a blink.
  'tests/pot-coverage.js',
  // The choke: a hit releasing whatever else in its group is still ringing, across the
  // drum path and the pooled one. Runs on a stub context, because what it asserts is
  // which automation gets written and when, not what it sounds like.
  'tests/drum-choke.js',
  'tests/key-mode.js',
  // The other half of KEY MODE, and the half nothing sequenced can reach: three keys
  // DOWN and one let go. A note with a length has no note-off, so the whole of last-note
  // priority under a finger — who is speaking, who comes up in silence, and what the note
  // falls back to — lives only here. Every path that can sound a held note is in it,
  // because each of them had a different half of it wrong.
  'tests/held-keys.js',
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
  // And the control that is neither pot nor pill: the long-list dropdown WAVE TABLE is
  // drawn as. It has to redraw ITSELF on a pick — nothing on either surface repaints the
  // card for it — or it names the wrong family and then refuses the click back.
  'tests/synth-dropdown.js',
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
  // And the same rig again for the game synth's Effects card, which is the newest thing
  // in the rack that a stub could not judge: a WaveShaper curve and a delay-line chorus.
  // Six renders of one preset, and the check that matters most is the cheapest one: a
  // preset naming the new keys at zero comes back bit-for-bit identical to what this
  // path rendered before the card existed.
  'tests/game-synth-effects.js',
  'tests/shop-themes.js',
  'tests/shop-menu.js',
  'tests/trophy-workshop.js',
  'tests/breaker-bonus.js',
  'tests/props.js',
  // The peel: a hazard defined by the escape hatches it does NOT have, which is
  // the kind of fact a later tidy-up quietly grants it. Beside the prop suites
  // because half of what it pins is the 5px drawing.
  'tests/banana-peel.js',
  // The five standing hazards. Same reason as the peel beside it: most of what
  // they are is what they are NOT — not puntable, mostly not breakable — and
  // those facts live in absent registry keys that a tidy-up would supply.
  'tests/standing-hazards.js',
  // The finish-line dog and its sign. Third in this little group for the same
  // reason as the two above: the dog's identity is `breakable: false` and the
  // sign's is `action: 'none'`, single registry lines holding up a jump-only
  // hazard and a hint that must never be jumped.
  'tests/finish-dog.js',
  'tests/debris.js',
  'tests/star-power.js',
  'tests/character-rendering.js',
  'tests/toon-ink-scale.js',
  'tests/renderer.js',
  'tests/density.js',
  'tests/frame-health.js',
  'tests/camera-framing.js',
  'tests/routes.js',
  // The set piece built out of them: four jumps over a spiked break on three
  // island stones. Beside the routes suite because the stones ARE routes — what
  // it adds is the half no cabinet road has, which is a landing that can be
  // overshot, and therefore a claim about every hero's arc rather than about
  // the geometry alone.
  'tests/spike-crossing.js',
  // NOTHING VANISHES IN PLAIN VIEW, enforced over whole played stages: every
  // sweep, cut and cull in the game may only remove what is off screen or what
  // the player visibly destroyed. The rule several sweeps state locally,
  // checked globally — this is the suite that catches the next sweep written
  // without the guard.
  'tests/no-visible-popout.js',
  // A hole is fatal, and invulnerability makes the floor there rather than
  // launching the hero back out of it.
  'tests/unpressed-launches.js',
  'tests/loop.js',
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
  // Beside the null test because it is the same kind of claim about the same walk, one
  // level cruder: the null test says the samples are right, this says there ARE samples
  // all the way to the end. A render that stopped at the halfway bar came back the right
  // LENGTH with its back half silent, and every baseline comparison above was happy.
  'tests/render-length.js',
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
  'tests/held-keys.js',
  'tests/tngr2-audio.js',
  'tests/tngr2-jit-bounce.js',
  'tests/tngr2-worklet-proof.js',
  'tests/mrdr3-worklet-proof.js',
  'tests/mrdr3-primitives.js',
  'tests/mrdr3-params.js',
  'tests/mrdr3-dsp-parity.js',
  'tests/mrdr3-controller.js',
  'tests/tngr2-dsp-parity.js',
  'tests/beat-detect-audio.js',
  'tests/mixer-loop.js',
  'tests/song-loop.js',
  'tests/voice-edit.js',
  'tests/synth-dropdown.js',
  'tests/pitch-curve.js',
  'tests/game-synth-effects.js',
  'tests/sfx-routing.js',
  'tests/note-duration.js',
  'tests/song-switch.js',
  'tests/bar-gain.js',
  'tests/bar-pan.js',
  'tests/music-variant.js',
  'tests/music-variant-render.js',
  'tests/voices.js',
  'tests/null-test.js',
  'tests/render-length.js',
  'tests/new-effects.js',
  'tests/song-processing.js',
  // Both open a browser and neither said so, which is how a push-triggered deploy came
  // to run them on a runner with no chromium installed: `npm ci` fetches the playwright
  // package, not its browsers. A suite that launches one belongs in this set.
  'tests/note-fx-render.js',
  'tests/tngr2-controller.js',
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
  'tests/sound-test-menu.js', 'tests/visualisers.js', 'tests/megamix.js', 'tests/mix.js',
  'tests/song-analysis.js', 'tests/beat-detect.js', 'tests/beat-detect-audio.js',
  'tests/visualiser-page.js',
  'tests/mixer-layout.js', 'tests/performance-relief.js', 'tests/mixer-export.js', 'tests/midi-import.js',
  'tests/mixer-undo.js', 'tests/mixer-loop.js', 'tests/song-loop.js', 'tests/new-song.js',
  'tests/song-copies.js', 'tests/song-alternates.js',
  'tests/rearrange.js', 'tests/rearrange-profile.js', 'tests/rearrange-drums.js',
  'tests/arrangement.js', 'tests/fine-tick-scheduling.js', 'tests/swing.js',
  'tests/piano-roll.js', 'tests/note-recorder.js',
  'tests/song-processing.js',
  'tests/preview.js', 'tests/key-mode.js', 'tests/held-keys.js', 'tests/layers.js', 'tests/track-order.js', 'tests/lfo.js',
  'tests/formants.js', 'tests/osc-sync.js', 'tests/mrdr3-playground.js', 'tests/tngr2-audio.js',
  'tests/tngr2-worklet-proof.js', 'tests/mrdr3-worklet-proof.js', 'tests/mrdr3-primitives.js', 'tests/mrdr3-params.js', 'tests/mrdr3-dsp-parity.js', 'tests/mrdr3-controller.js',
  'tests/tngr2-dsp.js', 'tests/tngr2-dsp-parity.js',
  'tests/tngr2-tables.js', 'tests/tngr2-schema.js', 'tests/tngr2-controller.js',
  // The preset schema: defaults, validation, and the migration that has to carry all 43
  // prototype-shaped presets into v1 without changing what any of them was measured at.
  'tests/tngr2-schema.js',
  // Lifecycle and exports: one node per lane, stems summing to their mix, and a range
  // render matching the same range inside a full one.
  'tests/tngr2-controller.js',
  'tests/synth-full-layout.js', 'tests/synth-graphs.js', 'tests/synth-dropdown.js',
  'tests/pot-coverage.js',
  'tests/effect-presets.js', 'tests/voice-edit.js', 'tests/voice-source.js',
  'tests/sfx-routing.js', 'tests/pitch-curve.js', 'tests/game-synth-effects.js',
  'tests/note-duration.js', 'tests/song-switch.js', 'tests/bar-gain.js', 'tests/music-variant.js',
  'tests/music-variant-render.js', 'tests/null-test.js', 'tests/render-length.js',
  'tests/new-effects.js',
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
