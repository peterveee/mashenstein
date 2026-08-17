# Sixteenth triplets — handover

The song format's note grid used to be sixteenths, with one optional refinement to
thirty-seconds. It now widens per song to hold triplets. The engine plays them, the desk
draws them, and songs round-trip through source unchanged.

This is the state after Stages 1–4b, what is left, and the traps.

---

## The arithmetic, once

A sixteenth triplet is three notes in the space of two sixteenths — **24 to the bar**,
which divides neither 16 nor 32. LCM(16, 24) = **48**, the coarsest grid holding straight
sixteenths and triplets together. 48 does not contain 32, so a song wanting thirty-seconds
as well needs LCM(32, 24) = **96**.

```js
export const RESOLUTIONS = [16, 32, 48, 96];   // src/data/arrangements.js
```

**The set is closed under LCM, and everything leans on that.** A lane written coarser than
the clock folds onto it by a WHOLE stride; there is no such thing as a note halfway
between two slots. Every promotion goes through `promoteResolution`, which takes the LCM
and snaps up to a member. Keep that property if the set is ever extended.

`resolution` is stored per song on the arrangement entry, absent meaning 16. Slots per bar
÷ 4 gives the PPQ equivalent, so the ceiling is **PPQ 24**.

---

## What is done

### Stage 1 — the transport counts ticks

`this.step` is now DERIVED from an integer counter rather than accumulated.
`step += tick` is exact at 1 and 0.5 and stops being exact at a third; dividing does not
have that problem, because `1/3` is inexact but `3/3` is exactly 1.

`step` is still the song position in sixteenths, fractional, and still the unit the whole
program reads — `% 16` is the bar line, `% 4` the beat, `Number.isInteger` the on-grid
test. It is an accessor pair (`get step` / `set step`, `src/engine/audio.js`) rather than a
method because `Audio.step = 0` is written from outside the engine
(`tools/lib/render-bank-page.js`, the desk transport) and those call sites are correct as
they stand.

The `|| 16` default in the accessor is load-bearing: a half-built transport reading NaN
does not throw, it propagates silently into every `% 16` and the song just stops.

### Stage 2 — resolution became data

Generalised across the four mirrors of the resolution walk, which must stay in step:

| mirror | where |
| --- | --- |
| `scheduleStep` | `src/engine/audio.js` |
| `prepareNoteCache` | `src/engine/audio.js` |
| `_rearrangeOutputSlot` | `src/engine/audio.js` |
| `buildRearrangeProfile` | `tools/lib/rearrange-profile.js` |

Plus `sequenceValue` in `src/engine/lanes.js`, whose `% 2` fold became a general stride,
and `tools/lib/freeze-span.js`.

**Rearrange stays on sixteenths.** `REARRANGE_GRID = 'sixteenth'` and its load-time version
check are untouched, so **no saved recipe needs migrating**. The profile collapses a whole
stride onto its sixteenth instead of only the other half.

**A triplet does not swing.** Swing is a claim about a PAIR of sixteenths — hold the first,
delay the second. A triplet is not in that pair and has no on/off-beat parity to inherit,
so it keeps the position it was written on. Extracted to `AudioSys._swingOffset(spb)` so
tests exercise the real formula, following the precedent `_rearrangeOutputSlot` set.

Also fixed here, unrelated to triplets: the offline render walk was sized
`transportResolution === 32 ? 2 : 1` (`tools/lib/render-bank-page.js`), which would have
silently truncated any 48/96 render. Now `transportResolution / 16`.

### Stage 3 — the round trip

`seq(str, slots)` and `chordSeq(str, slots)` take a slot count defaulting to 32, so all
~180 hand-written banks are untouched. `tools/lib/song-source.js` emits the count when it
is not 32 — `seq('…', 96)` — and its `arr.length !== 32` guard became a set of legal lane
lengths. That guard **failed quietly**: a 96-slot lane fell through to raw JSON with no
error, just a file that stopped being shorthand.

`normaliseArrangementResolution` now walks DOWN the enum. The subtle part, and a bug I
wrote and then caught:

> The target must be a grid **every lane separately accepts** — an intersection, not an
> LCM. The LCM of "this lane wants 16" and "that bank lane forces 32" is 32, but a 96-slot
> triplet lane cannot be expressed at 32 at all, and demoting to it leaves a lane whose
> length and whose flag disagree.

The composition half of a song file is never rewritten, so bank lane LENGTHS are a floor
while entry lane CONTENTS decide what can be narrowed. `laneTargets(arr, rewritable)`
carries that asymmetry.

`fineContent`, `anyFineContent` and `anyWideLane` were deleted. They asked yes/no questions
about the 32nd grid, which only works while there are two grids to choose between.

### Stage 4 core — drawing them

`tools/mixer-bar-grid.js` drew a column per slot of whatever grid the song is on; the
`=== 32 ? 32 : 16` clamp is gone. (Stage 4b below decoupled that again — the columns now
follow the SNAP — but everything else here stands.) Its lane fold mirrors `sequenceValue`
exactly — **the two must agree or the grid draws a note the scheduler will not play.**
House figures stamp onto every stride instead of squashing into the first sixteen slots.
`noteLengthName` gained triplet values.

`QUANTISE_OPTIONS` in `tools/mixer-piano-roll.js`:

| snap | 1/4 | 1/4T | 1/8 | 1/8T | 1/16 | 1/16T | 1/32 | 1/32T |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| grid | 16 | 48 | 16 | 48 | 16 | 48 | 32 | 48 |

**It stops at 1/32T deliberately.** 1/64T is reachable at 96 while plain 1/64 needs 192,
because a grid of `2ⁿ×3` always reaches one triplet level deeper than its plain notes.
Offering the triplet without the note it is a triplet OF reads as a bug.

Picking a snap promotes by LCM against what the song already has, and
`normaliseArrangementResolution` demotes on save. **There is deliberately no resolution
setting** — a raw dial would either be eaten by the normaliser or leave songs paying for
grids they never use.

Draw length gained a `Snap` option, now the default: a short click draws one snap division.
Two real bugs were fixed there — the picker's keyboard path read `dataset.length` as a
string (`Number('null')` is NaN, a zero-length note) and thirds do not survive a string
round trip, so options are keyed by INDEX now.

`Quantise starts to <snap>` in the transform menu (`kind: 'quantise'` in
`transformNotes`). Notes are **cleared before any are written** — two notes can snap onto
each other's old slots, and writing as we go eats one per collision, silently.

### Stage 4b — the display/storage split

A song with ONE triplet bar is stored at 48, and the roll drew 48 columns a bar for all
65 bars. The triplets were safe — the normaliser refuses to demote while one exists, and
that is tested — but a mostly-sixteenth song read as a triplet song. The argument was
**legibility, not cost**; an earlier decision skipped this after finding the roll
virtualises its columns, which answered the wrong question.

`displayCols(slots, snapSize)` in `tools/mixer-bar-grid.js` is the whole rule, and it
diverges from the plan in one word. The plan said the smallest divisor of `slots` that is
**>=** `max(16, slots / snapSize())`. That is not enough: 1/8T divides a bar twelve ways,
sixteen is more than twelve, and none of the sixteen lands on a triplet — so the coarse
triplet snaps drew a grid you could not aim at. It is a **MULTIPLE** of the snap
divisions, so three rules hold together:

| | why |
| --- | --- |
| divides `slots` evenly | `colStride` is whole; a column holds a whole number of slots |
| never fewer than 16 | a 1/4 snap must not draw four columns a bar |
| a multiple of the snap's divisions | every snap division gets a line of its own |

The whole matrix is pinned in `tests/piano-roll.js`. In short: **1/16 draws 16 columns on
any song, every triplet snap draws 24, 1/32 draws 32, 1/32T draws 48**, and a panel with
no snap of its own — the step grid — still draws one column per slot, exactly as before.

**The trick that kept it small.** A cell's `dataset.step` holds the STORAGE slot, not its
column index, so `setCell`, `globalStep`, `snappedStep`, the transforms and the
`movedNote`/`clampDelta` bounds all keep working in storage units untouched. Only the cell
ARRAYS and the build loops count columns.

**Two unit systems, and this is where the next bug will be.** `slotUnit()` is musical
sixteenths per STORAGE slot and is for POSITIONS. `colUnit()` is per COLUMN and is for
WIDTHS — `cellSpan`, the `--len` multiplier, the length readout, and **the `drawn`
argument `setCell` takes**, which is a width and therefore moved with the rest of them.
`colStride` is the only crossing: the places that needed one are `legato` (a distance
between two notes becoming a length) and `chop` (a length becoming positions).

**Off-grid notes render as insets** — a real `.ssqcell` carrying its own bar, storage step
and row, positioned inside its column at `--at` of the way across it. That is why
selection, dragging, resizing, the marquee and the keyboard reach one without knowing it
exists. It is a `div[role=button]` rather than a `button` because it is drawn INSIDE the
column's button; it is one column wide so every gesture that measures a cell measures a
column; and the BOX takes no pointer events while its `::before` does, or it would swallow
presses over the column to its right.

`drawnSpan` gained a `from` argument and inset awareness: a note is clipped by the first
off-grid note after it as well as by the next filled column, and an inset is measured from
where it really starts rather than from its column line.

Two things fixed in passing, both squarely in the blast radius: the beat strip numbered `1..8`
on a 32-slot song (and would have said `1..12` on a 48) because it labelled every fourth
CELL; and `syncPlayingKeys` still read `resolution === 32 ? 32 : 16`, a Stage-2 leftover
that would have lit the wrong keys on any 48/96 song. The grid now exposes `slotsPerBar()`
and `colsPerBar()` for it, and `noteActiveAt` takes `cols` so it can read a `--len` that
counts columns.

---

## Then

1. **The step grid cannot instigate.** It renders any grid but has no snap picker, so it
   also draws every slot — it is where a wide song looks widest. `customPicker` lives
   inside the piano roll's closure and needs extracting to a shared module so both panels
   use literally the same control; `snapSlots` is already the only thing `displayCols`
   wants from it. Until then a triplet hi-hat means setting the snap in the roll first.
2. **Measure the ruler DOM cost at 48.** Less pressing than it was: the ruler builds one
   element per COLUMN now, so a 65-bar song at 48 on the default snap is 1,040 again
   rather than 3,120. It is still 3,120 at a 1/32T snap and 6,240 on a 96-slot song in the
   step grid, and the reasoning that this is fine still comes from reading the code.
3. **Grid readout.** `_fineBarsReason` already names why a song runs a fine clock
   (`native-48-step-bank`, `track-level-1/32-arp`). Surfacing it on the desk turns an
   invisible cost into something actionable. Wants `tools/mixer-entry.js`.
4. **Stage 5 — MIDI.** Export is small: `TPS = 24` already divides by 3, so PPQ 96 carries
   48 and 96 exactly; the walk just has to visit slots rather than whole steps. Import is
   the real work — `tools/lib/midi-import.js` still rounds every onset to a sixteenth and
   only TALLIES the damage in `moved`. That becomes the decision: test onsets against a
   sixteenth grid and a triplet grid, import at 48 when they fit the latter. The `0.02`
   tolerance needs tightening first, or merely-swung playing will read as triplets.

---

## Facts worth not rediscovering

- **PPQ.** Slots per bar ÷ 4. Today's ceiling is 24. The SMF format's own limit is 32,767,
  so it will never bind. Our MIDI export is PPQ 96 = 384 ticks/bar, which represents a
  384-slot grid at exactly one tick per slot.
- **What another grid would buy.** Each doubling adds one level of both. 192 (PPQ 48) adds
  64th notes; 384 (PPQ 96) adds 128ths. Nothing on this ladder gets quintuplets — those
  need a factor of 5, which is why DAWs pick 480 or 960. **Decision taken: stop at 96**
  unless plain 64ths are ever wanted, at which point 192 is one line plus a realtime bench.
- **Cost, measured.** A dense 16-lane 32-bar song rendered offline at every grid from 16 to
  384: 1,024 → 24,576 scheduler calls for **1.00× → 1.05×** render time, non-monotonic and
  inside noise. A finer grid creates no new notes, so voice building — which dominates — is
  unchanged. **This was offline**, where wall-clock does not bind; realtime main-thread cost
  is unmeasured and is what the one-core budget rule cares about.
- **Verification.** `node tests/run-all.js` skips 17 browser suites. The ones that matter
  here are `null-test` (existing songs must render unchanged), `render-length`,
  `mixer-export`. Run them directly. The null-test harness is **not** bit-reproducible
  run-to-run — values wander in a 1.19–2.38e-7 band on an unmodified engine — so compare
  against a multi-run baseline of HEAD, not a single reading.
- **The contract suite** is `tests/fine-tick-scheduling.js`: the promotion rule, LCM
  closure, the stride fold, transport exactness at every grid, the swing rule, the demotion
  cases, and the source round trip.

## Where the working plan lives

`~/.claude/plans/could-we-change-the-hazy-emerson.md` — the original five-stage plan with
Stage 4b written into it.
