# Nice-to-haves

A running list of non-urgent ideas — things that would be good to have but aren't
blocking anything. Move items to "Done" when shipped, or delete them if they stop
mattering.

## Ideas

### A shorter menu-board gag for phones
The board behind Dolores (`MENU_ROWS` in src/sprites/backwall.js) is the one
piece of hub signage that does not survive a regular-sized phone. Everything
else in the food court reads fine; this one is five item/price rows with
strikethroughs and substitute notes, and its scale is fitted to the LONGEST row
(`fitScale` over every line), so the whole board shrinks to whatever "WATER /
MARKET PRICE" needs. At HUB_ZOOM 1.3 on a ~23-degree phone picture that is
below reading size, and the joke is entirely in the words.

Not a zoom problem — the hub framing is right, and it is deliberately the same
on every device (see the note on HUB_ZOOM). The fix is fewer, shorter rows on a
phone: a two- or three-line variant of the same gag, chosen off the same
platform tier that picks the camera framing in game/run.js, set at a scale that
can actually be read. Bigger type on the existing five rows would only overflow
the panel.

### "You can afford an upgrade" nudge
A proactive reminder that pops when your coins first cross the price of the
cheapest bench upgrade you can still buy — a gentle "go treat yourself at the
Repair Bench," not a nag every frame.

- **What exists today:** only the *inverse* — Dolores' can't-afford quips
  (`BENCH_AFFORDABILITY_GAGS` in `src/game/hub/index.js`) that fire when you try
  to buy something you can't afford, plus the gold-vs-grey price coloring inside
  the bench menu. There is no positive "you have enough now" signal anywhere.
- **Natural home:** `HubState` (it already reads `slot.coins` for the corner
  readout). Fire once when coins cross the threshold, not every hub entry.
- **Affordability check:** cheapest next-tier `cost` across `BENCH_UPGRADES`,
  including the food-court surcharge (see `BenchState.options()` for how the
  surcharged cost is computed) — reuse that so the nudge and the counter agree.
- **Watch out for:** don't re-fire every time you re-enter the hub; gate it on a
  threshold-crossing (or a one-shot flag that resets after a purchase).

### Phase 2: cache the live toon rendering (real fix for CPU-bound devices)
The adaptive render-density work (shipped) proved that weak devices are **CPU-bound
on the character painting**, not fill/upload-bound: a cheap Android ran in the low
teens identically at 1×, 2×, and 3× density, so no rendering-density trick can help
it. The live toons re-rasterize their full vector rigs every frame; only static
sites (HUD faces, hub NPCs) are cached today.

- **The cost:** `src/sprites/toons.js` (~5,200 lines of procedural vector paint)
  runs `drawToon` per live character per frame. Static crops go through `cached()`
  (~`toons.js:5173`; see the comment at `toons.js:4922`), but animated on-field
  toons do not.
- **The fix:** rasterize each pose to an offscreen sprite once and stamp it, keyed
  by `(heroId, pose bucket, density)` — quantize the animation into a small number
  of pose buckets so the cache actually hits instead of missing every frame.
- **Profile first:** confirm the paint path dominates with `?renderer=2d` vs WebGL
  and a frame profile on a real weak device, so we cache the right thing.
- **Must verify cast-wide:** it touches the shared painter every hero uses, so it
  needs measured per-hero before/after across the whole cast before shipping (see
  the shared-painter-cast-wide-check rule).

### Fix the near-shoulder/torso disconnect on running humanoids
In the run cycle every light humanoid (all except grumpos) shows a slight
disconnect where the near arm meets the torso — the arm's rounded root cap
reads as separate/not quite attached instead of a shoulder growing out of
the body. Visible in the gallery's "Heroes — in-run render" tiles.

- **Root cause (diagnosed 2026-07-24):** the light rigs root the running near
  arm *flush with the torso edge* (`nearFlush` in `src/sprites/toons.js`) —
  exactly where `shoulderCap`'s fit-inside-the-body clamp (`bodyRoom`)
  collapses to zero. So no cap merges the joint and the arm's raw root cap +
  outline show.
- **Already tried and REJECTED:** giving the front-on depth run the turned
  rig's proud, outer-arc-stroked cap (`proud = turned || (depthRun && !heavy)`).
  At game scale it read as a bulge bolted onto the shoulder, not a deltoid —
  vetoed on sight. A REJECTED EXPERIMENT comment marks the spot in
  `shoulderCap`; don't re-try that shape.
- **How to attempt it next time:** build 2–3 candidate treatments side by side
  as a gallery bake-off section (lab cluster) and pick by eye at real game
  scale BEFORE touching the shared painter — zoomed stills exaggerate the
  seam, which is how the rejected fix got shipped. Candidates worth mocking:
  a fill-only bridge wedge (no stroke) between arm root and torso, softening
  just the root cap's outline where it overlaps the body, or nudging the run
  root a hair inboard so `bodyRoom` leaves the clamped cap some room.
- **Must verify cast-wide:** shared painter — measured per-hero before/after
  (incl. grumpos unchanged, b33p's cannon arm exempt, dolores under her apron
  straps) before shipping.

### Auto-collect Grumpos' arm or axe when hovering nearby
When Grumpos throws his arm or the arm detaches and ends up hovering/idle on the
ground, the player has to walk directly over it to pick it back up. If the arm
(or the thrown axe) is hovering close by (within a small pickup radius), it
should auto-collect — saving the player from pixel-hunting the exact tile.

- **What exists today:** the arm (`src/game/heroes/grumpos/`) is thrown and
  lands, then waits to be walked over for pickup. There's no hover-state
  auto-collect radius.
- **Natural home:** Grumpos' arm state machine or the arm entity's update tick
  — check distance to Grumpos each frame while the arm is in its idle/landed
  state.
- **Watch out for:** don't auto-collect during the throw arc or while the arm
  is still in its landing animation; only when it's settled and hoverable.
  Also consider whether the axe behaves the same way (thrown axe pickup).

### Limit how much a stage regenerates between attempts
Right now a stage's layout is fully reseeded on every entry, so nothing about a
stage is learnable except its frame. Worth considering whether that should be
dialled back — a stage you can partly *learn* rewards a retry, and "the bit
right after the second checkpoint" only becomes a thing players talk about if
it survives a restart.

- **What exists today:** `seed: Date.now() ^ (stage.id.length * 7919)` in
  `src/main.js:259` for a fresh entry, and `seed + 1` on the death-restart path
  in `src/game/run.js:2495`. Both give a completely unrelated obstacle stream.
  Fixed per stage: duration, mission, challenge, cabinet pattern pool, and the
  appliance spot (`applianceAt`). Checkpoint recovery already replays the exact
  same stretch via `restoreSnapshot`, so the machinery for "same layout twice"
  exists.
- **Options, roughly in order of how much they change:** derive the seed from
  the stage id alone (fully fixed layouts, memorisable, guide-able); keep a
  small per-stage rotation of N seeds so it varies but repeats; or keep the
  reseed but pin the first ~15s so every attempt opens the same way and only
  the tail differs.
- **Watch out for:** the daily run (`dailySeed()`) and attract clips
  (`clipSeed`) already pin their seeds — don't double-fix those. Fixed layouts
  also raise the stakes on spawner fairness: today an unfair-feeling stretch is
  gone next attempt, whereas a pinned one is there forever. And the death
  restart deliberately reseeds so a run that killed you isn't handed straight
  back — decide whether that stays true.

### Bar editing in the mixing desk (arrangement pass)
Repeat a range of bars and drop instruments out of the repeats, live, while the song
plays — the build-up/breakdown move that is currently hand-typed into `order` arrays.
Right-click a bar to mute a lane or the whole kit; select a range to duplicate, cut,
paste or silence it; "Build up ▸ 8 bars" repeats a range and lets the kit back in one
lane at a time. **Full plan written:**
`~/.claude/plans/read-users-peter-claude-plans-it-is-diff-scalable-brooks.md`.

- **LANDED 2026-07-29 — everything but §8.** The desk arranges: drag a range on the
  grid, right-click for silence-a-lane / drop-the-kit / duplicate / build up /
  breakdown / delete, hollow cells where a bar drops a lane, `⌘Z` over all of it, and
  Save writes `src/data/arrangements.js` beside the mix. The engine reads bar plans
  (`barPlan` in `lanes.js`, ~6 lines of `scheduleStep`) and takes an edit mid-song
  via `Audio.setArrangement` without stopping. 84 assertions in
  `tests/arrangement.js`, in `npm test`.
- **Still open: §8** — re-importing a MIDI into an existing song's chosen lanes
  rather than minting a new bank. The write path it needs (`writeBarNotes`,
  `compactSections`) is built and tested; what is missing is the import dialog's
  second mode and exporting from the bar plan.
- **What exists today:** the desk's arrangement grid is already bar-unit
  (`buildArrangement()` in `tools/mixer-entry.js`), with a single-bar select
  (`markBar`), a read-only piano-roll popup per bar (`showBar`), whole-lane
  mute/solo, bar-range looping, and a working MIDI round-trip
  (`tools/lib/midi-import.js`). None of it can edit `order`.
- **The engine change is small:** expand `order` into a per-bar plan (`barPlan` in
  `src/engine/lanes.js`) and swap ~6 lines of `scheduleStep`'s section lookup. For
  every existing song the expansion is provably identical to today, which
  `tests/null-test.js` confirms sample-for-sample.
- **Two format additions:** an order entry may be `{s, bars, from, off}` — `bars: 1`
  gives single-bar granularity, `off: ['snare','clap']` is the mute mask. Plain
  numbers keep working.
- **Saves to a layer**, `src/data/arrangements.js`, the way `src/data/mix.js`
  already does: the game plays the edited version and `cabinets.js` — the note
  strings and the arrangement rationale — is never machine-rewritten. Deleting an
  entry reverts a song exactly.
- **Watch out for:** lane arrays are shared by object identity across sections *and*
  across lane keys (in `FINALE_THEME`, one array is on seven sections' `ohats` and
  another section's `hats`), so any note write must deep-clone first. `order` also
  reuses sections, so editing "bar 3" has to fork and repoint only bar 3 or bar 1
  changes too.
- **Follows on:** making `showBar`'s roll writable (needs a pitch range not derived
  from current content, and one-shot note audition), then re-importing an edited
  MIDI into *chosen lanes* of an existing song rather than minting a new bank —
  which is what keeps mute masks and section sharing alive across a round trip.

### Spin the visualizer out as an MP4 maker for any audio file
Drop in an MP3/WAV, preview a visualizer reacting to it live, export an MP4 carrying
the original track. Self-contained — no game, no music bank. **Full plan:**
`docs/visualizer-spinout-plan.md`.

- **Cheaper than it sounds.** `createVisualizer` (`src/engine/visualizers.js:2517`)
  is already a pure function of an analysis feed and only reads `.bpm` off the track
  object; `tools/render-video.js` is already the whole export pipeline bar one line
  (`renderBankBrowser`); and `analyseSong()` (`render-video.js:192`) takes raw PCM and
  doesn't care where it came from. Rough estimate: 2–3 days for a crude working
  version, 1–2 weeks for a good one.
- **The one hard part is beat detection.** Today beat is a perfect procedural clock
  from the sequencer. An arbitrary MP3 has none, and the presets lean on it hard
  (`ringRotationAt`, `beatPulse`) — wrong beat reads as broken, not as degraded.
  Manual BPM + tap tempo gets 90% of it; onset detection + autocorrelation is the
  real fix and is much easier offline than realtime.
- **Watch out for loudness.** `dynamics` and `MOTION_FLOOR` were tuned against our
  own mixes; a commercial master crushed to −8 LUFS pins `dynamics` at 1 and nothing
  ever breathes. Needs a normalization pass — `tools/lib/loudness.js` already
  measures BS.1770.
- **Biggest risk isn't code:** the presets are tuned to our music. Test against varied
  real tracks (drum-and-bass, solo piano) before committing to the idea.
- **Art decision, not a technical one:** 14 of 17 presets are abstract and ship clean;
  ARCADE ART GALLERY and TOASTER SKY PARADE draw MASHENSTEIN heroes and appliances.

### MRDR-3 leftovers from the 2026-08-07 review pass

Six real findings from a review of `_playLayer` that were deliberately not taken, because
each one either has no shipped preset that reaches it or can only be fixed by re-voicing
the library. Kept because they are all still true, and the first one that gets a preset
built on it stops being theoretical.

- **PWM duty still drifts under vibrato and FM.** The glide half of this is fixed (see
  Done). What is left is the modulation that arrives as a CONNECTION to `.detune` rather
  than as automation the engine schedules: vibrato and FM move `f(t)` without anything
  being able to mirror them onto `delayTime`. At the depths this library uses that is
  ±1.2% of duty, against the octave the glide was worth, so it is genuinely small — but
  it is the part that only an AudioWorklet oscillator can close properly.
- **Unison normalization is not correlation-aware.** `norm = 1/√count` regardless of
  detune or stereo spread. That is right for decorrelated voices and wrong for phase-aligned
  ones, which sum as `count` — at spread 0 a five-voice stack lands ~7 dB hot and drives the
  shaper that much harder. No layer ships `unison > 1` at spread 0, so this is editor
  extremes only. Interpolating between `1/count` and `1/√count` means recalibrating every
  preset that uses unison.
- **Noise unison sums coherently.** Every unison voice of a noise layer reads the *same*
  buffer at the *same* offset, with the detune applied to the bandpass rather than the
  playback rate — so N voices are one noise N times louder through N slightly different
  bands. Same recalibration problem as above; a per-voice `loopStart` offset would fix the
  correlation for free, but changes the render.
- **Noise Q is not a layer parameter.** COLOUR is done (see Done). `NOISE_Q` is still a
  hard-coded `2` in `src/engine/voices.js`, so a pitched noise layer's bandpass is that
  wide and no preset can say otherwise. One pot, one key, and the same schema / editor /
  parity work COLOUR just had.
- **The drive shaper is shared across the whole note-on.** `chainFor()` memoizes one
  `WaveShaper` per `_playLayer` call and it sits *after* the summed global VCA, so a
  four-note chord hits the drive roughly four times harder than the single note each preset
  was tuned on. Real, and the reason a pad's drive character changes with chord density.
  Moving it per-note re-voices all 18 drive presets.
- **No voice budget and no audio diagnostics.** `_playLayer` returns before the pool is
  consulted, so the only ceilings are unison ≤ 5 and the nyquist skip. `bestVowelPad` is
  ~59 nodes per note plus ~14 shared, so a four-note chord allocates ~250 AudioNodes and
  holds them ~10s. The renderer has `rendererDiagnostics()`; audio has no equivalent. First
  step is counters — active notes, oscillators, filters, scheduled tails — not culling.
  Any threshold has to come from real device profiling, not from a guess.

## Done
<!-- move shipped items here with a date -->

### 2026-08-07 — MRDR-3 review pass
Renamed the layer synth to **MRDR-3**, and took the reachable half of a review of
`_playLayer`. Everything below has a test in `tests/voices.js` that fails on the engine
as it stood.

- **Vibrato depth uncapped.** `_playLayer` clamped to one semitone while `_playGame` and
  `_playAdditive` did not, so the editor's 0–12 pot rendered bit-identical audio above 1.
- **Phase-wave cache capped** at 256 per context. It was keyed on a phase drawn fresh
  from each note's start time, so it grew without limit; eviction rebuilds the identical
  wave, and a two-render bit comparison proves it.
- **Preview modulators stop on key-up.** PWM, FM, vibrato and the routable LFO were never
  in the held record, so a released preview note left them running to the 30s safety stop.
  Reference-counted, so releasing one key of a chord leaves the others' wobble alone.
- **Mono choke holds the automated value.** `cancelScheduledValues` + `gain.value` read
  the level NOW for a choke scheduled up to a lookahead ahead; overlapping notes peaked
  1.041× a single note, where a choke should only ever remove energy. Now 0.961×.
- **Noise layers take the long buffer** when they outlast the short one, through the
  existing `_bufFor` rule. `bestChoirOoh` was looping 0.5s of noise sixteen times; the
  seam correlation fell from 0.277 to 0.151.
- **PWM duty holds through a glide.** The delay was set once from the destination pitch,
  so a glided note swept its width from `width × interval` down to `width` — an
  accidental PWM sweep on every note of `bestVoiceBox70s`, `bestPwmBass`,
  `bestPwmGrowlBass` and `bestPwmHollowLead`, starting at a duty of 1.000 (delay = one
  whole period, both saws nulling) on an octave drop. `delayTime` and the PWM swing gain
  now take an exponential ramp between the reciprocal endpoints, which is the exact
  inverse of `pitchRamp`'s exponential pitch glide rather than an approximation of one.
- **Noise COLOUR is a layer parameter.** `_noise` already built white/pink/brown/blue/
  violet buffers and the drum panels already had the pick; the layer card now has the
  same one, with the same label, options and default.
