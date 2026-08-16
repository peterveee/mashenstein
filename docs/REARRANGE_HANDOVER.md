# Rearrange feature handover (historical detail)

Date: 2026-08-15

This document covers the temporary Song Mixer Rearrange work. It describes the
Rearrange-specific changes made during this work; the repository also contains
other unrelated dirty-worktree changes that must be preserved.

> Current authoritative handover: read [M8TRX_HANDOVER.md](./M8TRX_HANDOVER.md)
> first. M8TRX replaced the old user-facing Rearrange name, retired the Glitches
> path in favor of fills, added variable-length/letter/clip workflows, and now uses
> a split section-rail/slice-stream layout. The detailed notes below document the
> earlier implementation and may use superseded labels or same-length assumptions.

## What the feature does

Rearrange is a session-only audition layer. It takes the current song's exact
transport length and builds a new performance from source slices. The source song,
mix, arrangement draft, normal Save data, WAV export, MIDI export, and catalogue
data are not rewritten.

The generated performance is song-shaped rather than a flat random shuffle:

- The source is divided into four-bar output sections where possible.
- Longer songs get an `Intro → Verse → Chorus → Verse → Chorus → Bridge → Chorus → Outro`
  style roadmap, shortened to fit the available length.
- Returning Verse and Chorus sections reuse their role's source phrase/template.
- Chorus source choices favour denser source material when a density profile is
  available; verses favour contrast/opening material.
- Within sections, half-bar and bar cells can alternate as `A–B–A–B`; longer
  two-bar grabs remain occasional.
- Every operation has an exact output duration, so the result is exactly the
  source song length and loops cleanly.

Three things make it sound played rather than assembled, and they are what the
15 August work added:

- **Style gates the cuts.** Phrase, Groove or Chop fixes what cell lengths may be
  emitted and what the source starts line up to. Sub-beat cuts and off-grid starts
  exist only behind an explicit Allow glitches switch.
- **The generator can see the song.** Where a source profile is available it scores
  candidate slices instead of only rolling them — avoiding boundaries that cut into
  held notes, matching neighbouring pitch content, and sizing sections to the form.
  Measured, that takes cuts landing in held material from ~50% to 0–7%.
- **The drums can stay put.** `drums: "song"` plays the song's authored percussion at
  the output clock, so the groove runs straight underneath a rearranged top.

And one thing changes how it is used: **edits made while it is playing are heard from
the next bar**, with no restart and no second count-in.

## Generator and recipe library

The browser-safe deterministic implementation is in `tools/lib/rearrange.js`.

Important exports:

- `generateRearrangement(sourceSteps, options)`
- `validateRearrangement(value, sourceSteps, options)`
- `rearrangementPosition(recipe, outputStep)`
- `rearrangementOutputSteps(recipe)`
- `transformRearrangement(recipe, indices, action)`
- `rearrangementDrumHit()` and `rearrangementDrumMode()`
- seeded helpers and the Rearrange constants

An operation is:

```json
{
  "from": 8,
  "length": 8,
  "repeats": 2,
  "transpose": 0
}
```

`from` and `length` are sixteenth-note source positions. `repeats` is 1–4 and
`transpose` is a shared semitone offset for pitched lanes.

The generator:

- Uses a stored unsigned seed and a deterministic PRNG. Same seed and same analysis,
  same recipe.
- Gates cell lengths and source alignment on the named **Style**; scores the choice
  within that gate when a rich profile is supplied.
- Weights one/two passes more heavily than three/four passes.
- Prevents adjacent duplicate operations whenever an alternate source position or
  permitted pitch change is available. The nudge that breaks a duplicate steps to the
  style's next aligned candidate, not a flat four sixteenths — otherwise a Groove
  recipe could acquire an off-beat slice by way of a duplicate that had to be broken.
- Preserves favourites as one-shot, untransposed operations, **exempt from style
  alignment**: a favourite is an exact user request, and the generator's rule about
  its own choices does not overrule one.
- Reuses kept section anchors and avoids disliked section source areas on the next
  generation.

**Two ways in, one generator.** Pass `style` and the gates apply; pass the older
continuous `extremeness`/`patterning` and the behaviour is exactly what it always was.
That legacy path is not a second generator kept alive alongside this one — it is this
one with `grid: null` and the original weights (`resolveStyle`). Likewise, a rich
`sourceProfile` object turns scoring on; the old flat per-bar density array still
works and keeps the original weighted-random choices.

### Generation controls

The panel has two controls in the open and two behind **Advanced**. They affect the
next Generate only; they do not modify an already-created recipe.

1. **Style** (`restyle`, a three-way radio group, default `groove`)

   A hard gate on cell length and source alignment, not a leaning — the point of
   naming a style is being able to rely on it. From `REARRANGE_STYLES`:

   | Style | Cell lengths | Source starts aligned to |
   | --- | --- | --- |
   | `phrase` | 16, 32, 64 | 16 |
   | `groove` | 8, 16, 32 | 8 |
   | `chop` | 4, 8, 16 | 4 |

   Alignment is applied to the **absolute** source position, not to an offset within
   the chosen four-bar phrase — a phrase base is only bar-aligned when the song
   divides evenly into four-bar blocks.

2. **Variation** (`revariation`, UI default 45%) — Familiar ↔ Different.

   Replaces Patterning. It controls motif reuse within a section, how likely the
   generator is to take the A/B pair or single-loop shapes, the repeat-count weights,
   and how far down the candidate ranking `pickOffset` may reach. At Familiar the
   pool is effectively the single best-scoring slice. **With a style named, Variation
   is also the intensity dial** — everything `extremeness` used to reach moves with
   it, so no unexposed parameter is left deciding things behind a preset.

3. **Allow glitches** (`reglitch`, Advanced, default off)

   The only thing that permits one/two-sixteenth cells and off-grid starts. Nothing
   reaches them by accident; `tests/rearrange.js` asserts both halves of that.

4. **Chord loop** (`rechords`, Advanced, default `auto`)

   The harmonic headline. A four-chord walk of the song's OWN key applied one chord
   per output bar across EVERY four-bar Verse/Chorus/Bridge — an earlier draft left
   some sections plain "for contrast" and it read as the feature not working; contrast
   is the Intro/Outro staying put and the i bars the walk mask holds.

   Two rules that came straight from listening:

   - **A walking section is ONE bar cell × 4** (`pickCell` on a bar length, scored as
     usual). Walking A/B pairs re-harmonised phrases already answering themselves —
     "disjointed" was the verdict. Pair/collage shapes remain for non-walking
     sections, and the assembly-level duplicate nudge is disabled inside a walked
     section so the riff cannot be swapped mid-walk.
   - **The walk has an amount** (`walk` option, `rewalk` select; moving-bar counts in
     `REARRANGE_WALKS`: full 4, half 2 — the default, turn 1). Reduction is by the
     palette's MOVEMENT, not by bar position (`walkedChords`): home for the held
     bars, then the palette's moving chords in order at the end. Position-based
     masking zeroed the anthem palette (VI–VII–i–i moves in bars 1-2) into four
     tonic bars; movement-based gives edm `i–i–III–VII` and the anthem its classic
     `i–i–VI–VII` lift.

   Recipe-side it is a per-operation
   `harmony` field (scale-degree offset, ±7) plus a recipe-level `key`
   (`{ tonic, minor }`); the movement is DIATONIC via `harmonicShift`, so Am stepped
   −2 degrees is F major — chord qualities fall out of the scale, which is the whole
   point and the thing a chromatic shift can never do.

   - Palettes in `REARRANGE_PROGRESSIONS`: `edm` i–VI–III–VII, `house` i–v–VI–iv,
     `anthem` VI–VII–i–i, `dark` i–iv–VI–v. Major-key songs always take the axis
     I–V–vi–IV. Auto picks per ROLE with the recipe rng, so every returning Chorus
     walks the same loop.
   - The key comes from `detectKey` (Krumhansl profiles over the summed chroma), and
     the BEST reading is used even when confidence is low — ambiguity is nearly always
     the relative major/minor pair, which share a scale, so the walk is the same notes
     either way. The desk marks a low-confidence key with `?`. A manual pick from the
     `rekey` select (`key` option to the generator) overrules detection outright and
     works even with no analysis at all. Analysis itself runs at any PARKED sync —
     panel open, song switch under an open panel, pause, Generate — and never during
     playback.
   - `applyHarmonyLoop` splits a repeated op where its passes cross a chord change
     (time is conserved); a single unrepeated slice longer than a bar is left alone
     rather than re-pitched mid-phrase. Favourites are never harmonised.
   - Engine: `scheduleStep` reads `operation.harmony` + `recipe.key` and maps
     `harmonicShift` per value inside the existing transpose pass — percussion
     excluded, frozen PCM untouched (same standing limitation as chromatic
     transpose), everything gated on a recipe being active.
   - **One pitch system per recipe.** While a chord loop is on and a key was found,
     the chromatic dial is ignored recipe-wide (`const chromatic = keyed ? 0 :
     transpose`), the duplicate-breaking nudge never adds a transpose to a harmonised
     op, and the desk disables the Transpose dial with a tooltip saying why. Tested:
     the dial at maximum changes nothing while chords walk.
   - **Visibility:** the detected key shows beside the control on panel open
     (`rechordskey`, from the same cached profile Generate reads, so they cannot
     disagree); rail cards carry the bar-by-bar walk read off the actual draft
     operations (`rearrangeSectionChordLine`); every row has a fixed-width chord
     column (`rechordbadge`, empty = as written, so rows stay aligned); the playback
     status names the sounding chord.

5. **Transpose** (`retranspose`, Advanced, **UI default 0 / Off**)

   - Off: no generated melodic shifts. Low: ±2. Mid: ±2, ±5. High: ±2, ±5, ±7.
   - *Whether* to lift is still a roll. *Which* interval is not, where a rich profile
     exists: the one leaving the section agreeing best with the previous slice's
     pitch content wins (`chromaMatch`).
   - Generated recipes never choose ±12; the v1 validator still accepts them on load.
   - Phrase-wide and shared by melodic, chord and layer lanes; percussion excluded.
   - `REARRANGE_TRANSPOSE_DEFAULT` stays `1` in the library — the generator API keeps
     the full palette. Off is a **UI** default, set on the control in the shell.

### Source profile and scoring

`tools/lib/rearrange-profile.js` walks the resolved song once and returns
`{ steps, bars, onsets, sustains, percussion, chroma, energy }`. Passing that object
as `sourceProfile` is what turns **scoring** on; passing the old flat per-bar density
array (or nothing) keeps the original weighted-random behaviour exactly.

Scored choices weigh, in order of importance:

- `cutCost` at both boundaries — held voices a cut would slice through, discounted
  where a kit accent masks the seam;
- `chromaMatch` with the previous slice's end — harmonic agreement;
- `energyOver` against `ROLE_ENERGY` — a chorus should feel bigger than a verse;
- a continuity bonus when a slice carries straight on from the last one.

The safety rule is a **floor, not a refusal**: `pickCell` rolls a length, and if the
best slice at that length still crosses more than `CUT_TOLERANCE` held voices it
reaches for the next longer cell the style allows and asks again. Measured on a
fixture where every odd bar is one held chord, that takes boundaries landing in held
material from ~50% (chance) to 0–7%.

Three approximations are deliberate and documented in the module header: note
duration is the lane's drawn or legacy length rather than the engine's full semantics;
the walk is a third mirror of the bank resolution (after `scheduleStep` and
`Audio.prepareNoteCache`); everything feeds a preference, never playback.

**Playback wins.** The desk builds the profile when the Rearrange panel is opened
while parked and caches it against the `viewBank()` object. Generating during playback
uses the cache, or falls back to the cheap per-bar density — it never starts a
full-song walk on the main thread underneath a running audio graph.

## Editing and refinement workflow

The operation list supports:

- Select individual rows or all rows.
- **Split halves**: interleaves the two halves of a slice, preserving duration.
- **Unroll repeats**: turns a compact repeated row into separately selectable passes.
- **×2 loops**: halves the source cell and doubles its repeat count.
- **÷2 loops**: joins adjacent repeated source space and halves the repeat count.
- **Reroll selected**: chooses different source material for selected rows.
- **Remove selected**: replaces selected output time with neighbouring material and
  compacts adjacent repeats where possible; duration remains exact.

Each section has:

- `▶` to play from its start.
- Double-click on a row to play from that output position.
- `👍` to keep the section as an anchor for the next Generate.
- `👎` to request a different source area for the next Generate.

Regenerate replaces the current recipe; it does not append extra operations. Kept
sections, disliked sections, and piano-roll favourites remain armed for that next
generation.

### Edits install at the next bar, without restarting

Every edit on the panel — Generate, the drum cycle, all six slice transforms — goes
through `applyRearrangeEdit()`, which routes to `Audio.queueRearrangement(recipe)` when
Rearrange is playing. Nobody auditions an arrangement by restarting it after each
change, and restarting cost the count-in, the note cache's warmth and the listener's
place in the song.

- The boundary is the next **output** bar line, computed like `setLoopAtBoundary`.
  `applyPendingRearrangement()` runs at the top of `scheduleStep` beside the existing
  pending step/loop/swing hand-offs, after them because both can move `this.step`.
- Queueing again before the boundary **replaces** what is waiting. Several quick edits
  collapse into one install of the latest draft, which is correct because the desk's
  draft is already cumulative.
- The desk's `rearrangeRecipe` updates immediately; `rearrangePending` marks the panel
  (`#rearrangepanel.pending`) until `Audio.onRearrangementInstalled` fires. That listener
  is the *only* thing that clears the mark: with a wide sequencer read-ahead the "next
  bar" can genuinely be the one after it, and anything self-timed would clear the mark
  while the old arrangement was still coming out of the speakers.
- **Play Rearrangement** and any seek install the draft immediately — asking to hear it
  from somewhere means hearing what you have made.
- `setBank` (both pausing and playing) takes any waiting edit rather than leaving it
  queued against a transport position that no longer means anything.
- `setRearrangement(null)`, a song switch and the source-length mismatch clear all drop
  the pending recipe with the active one. A recipe of a *different* source length
  installs immediately rather than queueing, because the output wrap is computed from it.
- `pendingRearrangement` is carried through `rebuildRealtimeContext`'s snapshot beside
  `pendingLoop`/`pendingStep`; the memoised output bar is dropped, since `applyMix`
  returns a new bank object.

### Piano-roll favourites

The Notes/Piano Roll selection header has **Fav +**. A selected range up to four bars
can be added as a session favourite. Every later generated recipe includes each
favourite once, as an exact whole-band source slice with no transpose. Favourites
are cleared when the source song changes and are not written into the song or JSON
recipe.

## Four-bar indicator and playback UI

The Rearrange toolbar button opens a non-blocking panel. The panel now includes a
four-bar roadmap strip (`#rearrangeform`) above the operation list. Each segment shows
the form name and output bar range, for example `Verse · Bars 5–8`.

- Clicking a roadmap segment plays from that section.
- The active roadmap segment highlights during playback.
- The active operation row and repetition update from the output timeline.
- The operation list and roadmap remain useful while the source arrangement
  playhead jumps between mapped source positions.
- Closing the panel leaves the recipe armed and marks the toolbar button active.
- **Return to Song** stops playback, clears Rearrange, resets the parked position to
  step 0, and restores normal loop controls.
- Switching to another source song clears the active recipe, votes and favourites.
- Selected-range looping and Game Loop controls are disabled while Rearrange owns
  the temporary output loop, then restored on exit.

## Audio engine integration

`src/engine/audio.js` owns the real-time mapping and exposes:

- `Audio.setRearrangement(recipe|null)` — install or clear at once
- `Audio.queueRearrangement(recipe)` — install at the next output bar; returns
  `'queued'` or `'installed'`
- `Audio.applyPendingRearrangement()` — the hand-off, called from `scheduleStep`
- `Audio.onRearrangementInstalled(fn)` — fires when the scheduler actually took it
- `Audio.rearrangementPosition(step)`

When a recipe is active, `Audio.step` remains the new song's output position. Each
scheduled tick resolves a mapped source step for:

- Notes, chords and layers.
- Arrangement section metadata and per-bar transpose.
- Bar effects, Note FX, freezes, lane offsets and per-bar pan.
- Source bar transitions and source-position reporting.

Swing, rhythmic effect phase and transport wrapping remain continuous on the output
timeline. Note releases, delay and reverb tails are not forcibly cut at slice
boundaries. The completed recipe wraps at its exact output boundary.

The existing scheduler path is unchanged when no recipe is installed. A recipe
transpose is applied after existing per-bar transpose, uniformly to pitched lanes,
and never to percussion.

## Drum modes

Three, cycled by one button (`redrums`) and named identically everywhere they appear —
button, status line and toast — because "original" and "song" both describe the song's
own drums and neither word can carry the distinction alone.

| Recipe value | Label | What plays |
| --- | --- | --- |
| `"song"` | **Song groove** | The song's authored percussion at the **output** clock |
| absent / `"original"` | **Chopped drums** | Percussion chopped with everything else |
| `"basic4"` | **Steady 4/4** | A generated four-on-the-floor, output clock |

`REARRANGE_DRUM_DEFAULT` is `song`, and newly generated recipes carry it. A saved
recipe with **no** `drums` field still means chopped, so every file written before this
existed keeps the behaviour it was auditioned with.

### How song groove is scheduled

`scheduleStep` normally resolves one bar per tick — the mapped source bar. Song groove
needs a **second** resolution, because the drums are somewhere else in the song from
everything above them:

- `Audio._rearrangeOutputBank(bar)` merges the output bar's section over the bank and
  nulls its mute/delete mask, exactly as the source path does. It is **memoised on the
  bar object and the bank**: `barPlan` hands back stable bar objects until an
  arrangement edit replaces them and `setBank` replaces the bank, so that is the whole
  invalidation. One merge per bar, not sixteen — this lands in the hot path the
  performance work has been thinning, where lane resolution was measured at 21:1
  against note construction.
- `Audio._rearrangeOutputSlot(bar, resolution)` is the source `s` formula for the
  output clock. A method rather than an expression so a test can reach it without an
  AudioContext.
- `rawAt()` intercepts percussion keys and reads `sequenceValue(outputBank, key,
  sOutput, resolution)`; the source read is not consulted for them at all.
- Per-bar Note FX and `effectiveStepLen` for those lanes resolve against the output bar.
- Frozen percussion stems schedule at `this.step` instead of `sourceStep` — a freeze is
  the song rendered against its own transport, so the same PCM serves both modes and
  only the launch point moves. Nothing needs re-rendering.

**Known simplification:** percussion bar *effects* and per-bar pan still follow the
source bar in this mode. Revisit only if it turns out audible.

Every one of those paths is gated on a recipe being installed, and `tests/null-test.js`
passes unchanged — the no-recipe scheduler is untouched.

### Steady 4/4

The generated kit uses the output clock, independent of chopped source positions:

- Kick: beats 1, 2, 3, 4.
- Snare and clap: beats 2 and 4 only.
- Hi-hat: eighth notes.
- Occasional rim, open-hat, tom and crash fills.

The mode uses existing available kit voices and respects authored lane availability,
mutes and arrangement gating. Authored percussion triggers and frozen percussion
stems are not allowed to leak underneath the generated pattern. Melodic freezes still
follow the mapped source.

## Count-in

**Only the deliberate from-the-top start counts in.** Playing from a roadmap segment or
a list row is a jump, and a jump that answers four beats late stops being aimable, so
`playRearrangementAt` starts at once. Queued edits never count in either — they land at
a bar line in music that is already playing.

The count itself is "ONE two three four": a single accented click, then three identical
lower ones. The last beat is deliberately NOT lifted — a raised beat 4 read as a pickup
pointing at itself instead of landing on the downbeat (`_scheduleCountIn`,
`const accent = index === 0`).

`Audio.setBank()` accepts `{ countIn }`; the clicks are short square waves through the
SFX gain, and the start gap is extended so the first downbeat lands after the count.
Normal playback passes `countIn: 0` and keeps its existing timing path.

## JSON save/load

The recipe format is versioned and readable:

```json
{
  "kind": "mashenstein-rearrangement",
  "version": 1,
  "source": {
    "song": "song-id",
    "title": "Song Title",
    "steps": 128
  },
  "seed": 123456789,
  "grid": "sixteenth",
  "operations": [
    { "from": 8, "length": 8, "repeats": 2, "transpose": 0 }
  ]
}
```

Generated recipes also carry the form roadmap. The validator checks:

- Kind, version and sixteenth grid.
- Current source step count and optional source song ID.
- Unsigned integer seed.
- Source bounds and integer operation fields.
- Repeat range 1–4.
- Allowed transpose values.
- Exact total output duration.
- Supported drum mode and contiguous form ranges.

Load never auto-plays. If the JSON names another available song, the Mixer asks
whether to switch first. Missing songs and source-length mismatches are rejected.
The JSON stores instructions against the named song; it does not embed notes, mix,
voices or arrangement data.

## Tests and verification

Focused checks currently passing:

```text
node tests/rearrange.js
node tests/rearrange-profile.js
node tests/rearrange-drums.js
node tests/mixer-layout.js
node tests/fine-tick-scheduling.js
node tests/null-test.js
node tests/run-all.js
npm run build
git diff --check
```

All three Rearrange suites are registered in `tests/run-all.js`, in both `suites` and
`soundSuites`.

`tests/rearrange.js` covers deterministic seeds, exact output duration, source bounds,
repeat compaction, transpose controls and allowed intervals, form coverage and
Verse/Chorus reuse, favourites, keep/dislike anchors, all row transforms, JSON
rejection, output wrapping, source-position reporting, and steady drum positions —
plus, now: each style's cell lengths and source alignment asserted absolutely, glitches
appearing only behind their switch, odd-length favourites surviving every style intact,
the measured drop in boundaries landing in held material, a song held everywhere still
producing an exact-length recipe, determinism with the scorer in the loop, and chorus
energy ordering above verse.

`tests/rearrange-profile.js` covers pitch classes, onsets, the sustain rule including
the lane-default case and the one-bar cap, accent masking, arrangement mute masks and
section reads, chroma agreement under transposition, energy normalisation, and safe
answers from every accessor with no profile at all.

`tests/rearrange-drums.js` covers the drum-mode enum and its round trip, output-bar
resolution with sections/mutes/halves, the memoisation as behaviour, the whole
collage-moves-groove-does-not claim across a scrambled recipe, and the full queued
install lifecycle.

The Mixer layout contract covers the toolbar/panel, roadmap strip, the Style/Variation/
Advanced controls, file actions, count-in wiring, scheduler mapping, piano-roll
favourite action, the three drum-mode names, song-groove output resolution, and the
queued-install wiring on both sides.

The served local page was checked for the Rearrange controls and four-bar roadmap.
Audible/browser scheduler acceptance was not completed in this environment because
Chromium launch has previously failed with the macOS `MachPortRendezvous`/
`bootstrap_check_in` permission error. Do not treat static tests or served markup as
an audible listening sign-off; listening should still confirm that the cuts stay
rhythmically coherent, the steady drums remain on the backbeat, and phrase-wide
transposition moves pitched parts together.

## Listening acceptance still owed

Nothing below can be settled by a test. Static checks and served markup are not a
listening sign-off.

1. **Three contrasting songs, default Groove.** Do the cuts sound phrase- and
   beat-coherent? Do long notes still leave chopped holes? This is the whole point of
   the scorer, and the only place it can be judged.
2. **Song groove on each.** Does the original groove stay stable and feel like the
   song's own, underneath a rearranged top?
3. **The stress song — `smw-all-instruments-newest` — with the accepted four freezes,
   in Song groove, watching Clock min.** This is the performance guard for the second
   bar resolution and for frozen percussion launching at the output position. The
   known-good band is roughly 0.94–0.97x; a drop from that is this work's regression,
   not the song's.
4. **Editing while playing.** Generate, cycle Drums, and run a slice transform mid-pass.
   Each should be heard from the next bar with no restart and no second count-in, and
   the panel's draft marking should clear when it actually lands. Try it at Maximum
   read-ahead too, where "the next bar" may audibly be the bar after.
5. **Chop + Allow glitches** still delivers the deliberate glitch aesthetic.

## Other follow-up checks

- Re-run a live browser session after starting/restarting the Mixer server and listen
  through several generated recipes at each Style.
- Check the four-bar roadmap highlight against the actual output clock while the source
  playhead jumps.
- Confirm count-in clicks do not overlap an old recipe's tail when regenerating while
  playing.
- Confirm the Steady 4/4 pattern with songs that have different combinations of kick,
  snare, clap and hat lanes.
- The earlier `pianoRoll.redraw is not a function` report should remain on the QA list:
  several locator paths use optional redraw calls, but direct redraw calls still exist
  in the locator move/clear callbacks and should be hardened if the error reproduces.

## Main files

- `tools/lib/rearrange.js` — deterministic generator, styles, candidate scoring,
  validator, mapping, transforms and steady drum pattern.
- `tools/lib/rearrange-profile.js` — the source analysis the scorer reads: onsets,
  sustain hazards, kit accents, per-bar chroma and energy. Pure and browserless.
- `src/engine/audio.js` — output-to-source scheduling, transpose, drum mode and count-in.
- `tools/mixer-entry.js` — Rearrange state, generation, playback, UI actions, favourites,
  votes, roadmap rendering and JSON actions.
- `tools/mixer-shell.html` — toolbar button, panel markup and styling.
- `tests/rearrange.js` — generator, styles, scoring, validator, position, drum tests.
- `tests/rearrange-profile.js` — the source analysis, on hand-readable fixtures.
- `tests/rearrange-drums.js` — song groove scheduling and queued installs.
- `tests/mixer-layout.js` — Mixer/audio/UI source contract checks.
- `docs/SONG_MIXER.md` — user-facing Rearrange behavior and controls.
