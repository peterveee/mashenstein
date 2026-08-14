# Rearrange feature handover

Date: 2026-08-14

This document covers the temporary Song Mixer Rearrange work. It describes the
Rearrange-specific changes made during this work; the repository also contains
other unrelated dirty-worktree changes that must be preserved.

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

- Uses a stored unsigned seed and a deterministic PRNG.
- Weights starts toward bars/beats at low Extremeness and permits odd sixteenth
  boundaries at high Extremeness.
- Weights lengths toward 4, 8, and 16 steps, with occasional 1–2 step glitches.
- Weights one/two passes more heavily than three/four passes.
- Prevents adjacent duplicate operations whenever an alternate source position or
  permitted pitch change is available.
- Preserves favourites as one-shot, untransposed operations.
- Reuses kept section anchors and avoids disliked section source areas on the next
  generation.

### Generation dials

The Rearrange panel has three controls. They affect the next Generate only; they do
not modify an already-created recipe.

1. **Extremeness** (`reextreme`, UI default 35%)
   - Low: longer, bar-aligned phrases, fewer jumps and fewer glitches.
   - High: shorter cells, more source changes, odd boundaries and more variation.
   - Constant: `REARRANGE_EXTREMENESS_DEFAULT = 0.35`.

2. **Transpose** (`retranspose`, UI default 45%)
   - Off: no generated melodic shifts.
   - Low: only ±2 semitone whole-tone shifts.
   - Mid: ±2 and ±5 (perfect fourth) shifts.
   - High: ±2, ±5 and ±7 (perfect fifth) shifts.
   - Generated recipes never choose ±12 octave jumps. The version-1 validator still
     accepts the older ±12 values in imported JSON for compatibility.
   - Transposition is phrase-wide and shared by melodic, chord and layer lanes;
     percussion is excluded.

3. **Patterning** (`repattern`, UI default 55%)
   - Loose: more one-off source choices and fewer repeated passes.
   - Motif: more repeated cells, two-pass figures and returning A/B motifs.
   - This is the additional musical control intended to make the result feel more
     like a constructed arrangement and less like unrelated random cuts.

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

Regenerate replaces the current recipe; it does not append extra operations. If it
was playing, the old recipe is stopped and the new one starts from the beginning.
Kept sections, disliked sections, and piano-roll favourites remain armed for that
next generation.

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

- `Audio.setRearrangement(recipe|null)`
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

Recipes default to authored/original drum patterns. The panel can switch to
**Steady 4/4 drums**, stored as `drums: "basic4"` in the session recipe.

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

Starting **Play Rearrangement**, or playing from a roadmap/list section, requests a
four-beat count-in. `Audio.setBank()` accepts `{ countIn }`; the count-in is generated
as short square-wave clicks through the SFX gain and extends the start gap so the first
downbeat lands after the count. Normal playback passes `countIn: 0` and keeps its
existing timing path.

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
node tests/mixer-layout.js
npm run build
git diff --check
```

The Rearrange tests cover deterministic seeds, exact output duration, source bounds,
repeat compaction, transpose controls and allowed intervals, form coverage and
Verse/Chorus reuse, favourites, keep/dislike anchors, all row transforms, JSON
rejection, output wrapping, source-position reporting, and steady drum positions.

The Mixer layout contract covers the toolbar/panel, roadmap strip, dials, file
actions, count-in wiring, scheduler mapping, piano-roll favourite action and drum
mode wiring.

The served local page was checked for the Rearrange controls and four-bar roadmap.
Audible/browser scheduler acceptance was not completed in this environment because
Chromium launch has previously failed with the macOS `MachPortRendezvous`/
`bootstrap_check_in` permission error. Do not treat static tests or served markup as
an audible listening sign-off; listening should still confirm that the cuts stay
rhythmically coherent, the steady drums remain on the backbeat, and phrase-wide
transposition moves pitched parts together.

## Important follow-up checks

- Re-run a live browser session after starting/restarting the Mixer server and listen
  through several generated recipes at low, mid and high Extremeness.
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

- `tools/lib/rearrange.js` — deterministic generator, validator, mapping, transforms
  and steady drum pattern.
- `src/engine/audio.js` — output-to-source scheduling, transpose, drum mode and count-in.
- `tools/mixer-entry.js` — Rearrange state, generation, playback, UI actions, favourites,
  votes, roadmap rendering and JSON actions.
- `tools/mixer-shell.html` — toolbar button, panel markup and styling.
- `tests/rearrange.js` — pure generator/validator/position/drum tests.
- `tests/mixer-layout.js` — Mixer/audio/UI source contract checks.
- `docs/SONG_MIXER.md` — user-facing Rearrange behavior and controls.

