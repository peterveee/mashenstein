
# M8TRX implementation handover

Date: 2026-08-15

This is the current handover for the Song Mixer rearranger, renamed M8TRX. The
older [REARRANGE_HANDOVER.md](./REARRANGE_HANDOVER.md) contains historical detail;
where it conflicts with this document, this document is authoritative.

## Product boundary

M8TRX is a temporary Mixer performance layer. It remaps the current song's
whole-band source material into a generated recipe. It does not rewrite the song's
arrangement, mix, MIDI, WAV export, catalogue data, or game playback data.

The recipe can be parked in the Mixer and explicitly saved as an M8TRX version.
That save is separate from normal song/arrangement save and never promotes the
recipe to a game alternate. Static desks use local storage; the dev desk uses the
/save seam and stores an m8trx export beside the desk-written mix, arrangement,
and variants.

## User decisions now implemented

- The feature is branded M8TRX in the toolbar, panel title, status/toast copy,
  tooltips, and saved-file slug. Internal IDs and the JSON kind remain compatible.
- The retired Glitches control and generation path are gone. Base material stays
  beat/grid aligned; sub-beat work is reserved for explicit section-end fills.
- Fill is a varied whole-band transition accent, not four identical repeats.
  Supported shapes are Burst, Rush, and Machine gun. Auto keeps fills sparse and is
  measured at roughly one section in three; `fillShapeFor`'s auto branch must retain a
  real no-fill outcome, because a budget alone let 92% of sections carry one.
- Fill is a TOOLBAR control (`#refillselected`), not a card button, and it names its own
  shape at the point of use: Burst, Rush, Machine gun, or No fill to take an existing one
  back off. It acts on the selected part's ending. Two things were wrong with the card
  button it replaced: it drew accent text on an accent background when lit, measured at
  1.00:1 — invisible — and it took its shape from the Advanced 'Fill on Generate' select,
  which is a GENERATION setting, so one control silently did two jobs. That select now
  only affects what Generate makes.
- Taking a fill off cannot un-chop the cells (the slices they replaced are gone), so it
  strips the fill tag and gathers the cells back into as few slices as their material
  allows — as close to before as the recipe can get.
- The toolbar action that replaces slices with neighbouring material is called Borrow
  neighbours — it and the fill used to share the name 'Fill' and mean different things.
- A part can be removed outright (`Delete part`). Copy and Paste act on the SELECTION —
  one slice, a run of them, or a whole part — via `replaceRearrangementSlices`; a part is
  only the case where the run happens to fill a section, and `replaceRearrangementSection`
  now resolves to indices and delegates. A paste is FITTED TO THE SPACE THAT IS THERE: the target keeps its own length, so pasting never moves a boundary or changes the
  song. Material longer than the slot is cut to fit (`trimOperations`); material shorter
  than it leaves the rest of the slot SILENT — muted padding slices — rather than
  stretching to cover ground it was not written for. Eight bars of chorus dropped into a
  four-bar verse is four bars of that chorus, which is what a paste into a fixed-size box
  should do; two bars into four is two bars and then two bars of nothing you can hear and
  then fill deliberately.
- Chord pacing defaults to song-like slow grammar: 1 1 1 1 | 4 4 | 5 | 6 for a
  long phrase, compressed sensibly for shorter sections. Steady and Active remain, and
  DRIVE is what reaches them now — the pace select is gone.
- The form is laid out as TIME: one full-width row per section, the section's own
  card at the head of it, and its slices across the rest as blocks whose widths are
  their share of that section. This is the latest layout decision and it replaced
  the earlier split section-rail/slice-list streams.
- ONE TIME SCALE across the whole panel, and a LINE IS AT MOST FOUR BARS
  (`REARRANGE_LINE_STEPS = 64`). A bar is the same width in every row, so a 2-bar part
  fills half a line and a part longer than four bars wraps onto as many lines as it
  needs rather than shrinking its slices to fit one. Wrapping is what leaves the tail of
  an odd part empty: five bars draws as a full line plus one bar with three bars of
  nothing after it. A slice that will not fit in what is left of a line moves down whole
  rather than being cut in two. Where no part reaches four bars, the longest one sets the
  scale instead, so a short song still uses the width it has. The panel is full viewport
  width, `calc(100vw - 24px)`.
- Sections are draggable as complete blocks. Reordering preserves their internal
  operations and rebuilds contiguous output ranges.
- Slice blocks use compact bar:beat.sixteenth notation, with the pass count on its own
  line beneath. Full source/output wording remains in hover titles and inspector detail.
- A REPEATED PART shows its seam. Doubling a part copies its slices rather than raising a
  repeat count — the SEQUENCE repeats and no single slice does — so nothing in the recipe
  records it. `rearrangeCycleLength` reads it back off the material instead, which also
  marks a part that repeats because it was generated that way. The first slice of every
  pass after the first takes `data-cycle` (border grows 2px as padding shrinks 2px, so the
  contents do not move), the card's bar range gains `· ×N`, and the chord line states the
  walk ONCE — sixteen bars of numerals is a wall, and the ×N already says the rest is the
  same again.
- A REPEATED slice is ruled at each pass boundary (`[data-repeats]`, a background
  gradient overlay starting one pass in, so the rules fall strictly BETWEEN passes — tiling
  the whole block put one at x=0 too, hard against the left border and on repeated slices
  only, which read as some blocks having a thicker edge than their neighbours), so four
  passes of a bar cannot be mistaken for one four-bar grab — they take the same time and used to draw the same block, with the
  '×4' as the only thing telling them apart.
- Controls were enlarged and kept in fixed-width slots. Section actions stay in a
  horizontal row on the card; slice actions moved to a horizontal toolbar above the
  timeline and act on the selection.
- The section card is two lines: name with the walk and bar range on the top line,
  actions beneath. Rows measure 67px (they were 138px before this pass). The card and the
  slices beside it are the SAME height — `.restrip` uses `align-content: stretch`, since a
  band whose halves are different heights reads as two things that happen to be adjacent.
- The HELD part wears an accent bar down its left edge, not a ring: a ring is the mark the
  LOCK already draws, so a held part and a kept one read alike. The border grows by three
  and the padding gives three back, so nothing inside the card moves when it is taken —
  a selection that nudged its own contents would be the one thing you noticed about it.
- Double-clicking a part card plays from it AND keeps the part held
  (`selectRearrangeSectionSlices`, a force-select): the two single clicks that precede a
  double-click would otherwise select the part and then let go of it again.
- The chord numeral sits flush left under the source label. Its old fixed 26px
  right-aligned box was a COLUMN in the vertical list, where every row needed its chord in
  the same place; inside a slice it only pushed the numeral in from the edge.
- Thumbs up/down are gone. The lock is the one "keep this" and it is what feeds
  generation anchors; the dislike vote had no replacement and was dropped with it.
- A part is picked by clicking its card, and exactly one part is held at a time —
  picking another replaces the selection rather than adding to it. Runs that cross
  parts are still reachable by dragging across the slices themselves.
- A slice is coloured by its source MATERIAL and nothing else — a 30% background wash,
  no coloured edge, neutral 1px outline — so the same piece of the song is recognisable
  wherever it returns. A block already reads as one block; a rule down its side was a
  second mark for the one thing its fill already says. Material identity is
  `from:length`, so stuttering a slice into shorter cells gives them their own colour.
  The part
  needs no colour on the slice now that each part owns a row. The wash holds its colour
  mid-lightness and spends its budget on chroma: a light bright hue washed into a dark
  theme's button measured 3.3–4.2:1 under the label, where this measures 4.79:1 at worst
  across all nine themes. Hues come from a twelve-entry hand-ordered list
  (`REARRANGE_MATERIAL_HUES`), picked by a stable hash of the material's own `from:length`
  (`rearrangeMaterialHueIndex`) — not by the order slices are first encountered while
  drawing the timeline. That first-seen scheme was tried and is wrong: a reroll or a
  from-scratch rebuild of one part can change how many distinct materials it contains,
  which shifted the index — and therefore the colour — of every material appearing later
  in the song, so editing one part read as the whole recipe having changed. The hash makes
  a material's colour a property of the material alone, so an edit anywhere on the
  timeline can never repaint a slice it did not touch.
- Transpose accepts every semitone from −12 to +12. The old ±2/5/7/12 shortlist is what
  the GENERATOR picks from and still is (`REARRANGE_GENERATED_TRANSPOSES`), but there was
  no reason a person reaching for a minor third on one slice should be told it is not a
  supported interval.
- Both pitch systems sit in one Pitch cluster in the toolbar, because they are one
  decision: a part either walks its own key by scale degrees or is shifted a fixed
  chromatic distance, never both. The slice's single pitch badge shows whichever
  applies — the roman numeral when it walks, the interval when it is transposed.

> Control-by-control reference, with what each one acts on and a list of names that read
> wrong: [M8TRX_CONTROLS.md](./M8TRX_CONTROLS.md).

## UI surface

### Toolbar and panel

Toolbar button is #rearrangebtn, displayed as M8TRX or M8TRX · ON. The main panel
is #rearrangepanel.

### The four dials

Variation is gone. It was one slider doing six jobs — candidate reach, motif reuse,
repeat weights, pair/loop chances, source-pool width, and transpose chance — which is
why "Familiar ↔ Different" never quite answered anything. It is four questions, so it
is four dials, each 0–100 with a five-word readout:

- **MOOD** (Noir · Brooding · Bittersweet · Golden · Euphoric) — the emotion, and the
  only dial that touches harmony. At the dark end a major song is re-read in its
  RELATIVE minor and at the bright end a minor song in its relative major: the same
  seven notes with a different home, so every note stays a scale tone and
  `harmonicShift` walks it cleanly. Parallel keys were rejected for exactly that reason
  — they push a third of the material onto the nearest-scale-tone-below branch on every
  walked bar. Mood also picks the palette (dark · house · pop · edm · anthem, with pop
  at the centre so a resting dial is the old Auto behaviour), the walk amount
  (`moodWalk`: full when dark, turn when bright, half at rest), and which way a
  chromatic lift leans. A key named at the desk is NEVER re-read — that is a statement
  about the song. Because the bright end re-keys INTO major, majors get their own two
  palettes: the axis progression, and `MAJOR_LIFT` (IV–V–I) above 0.8.
- **HYPNOSIS** (Scatter · Restless · Woven · Circling · Trance) — how much the song
  repeats itself: pair/loop chances, motif reuse, repeat weights. Note it is not "more
  repeats per slice": the A/B pair it favours at the top is a returning motif written as
  single passes, so the measurable claim is fewer distinct cells, returned to more often.
- **CHAOS** (Tame · Playful · Frisky · Unruly · Feral) — how far from the safest answer
  a choice may land: `pickOffset` reach, source-pool width, transpose chance, and the
  fill-shape skew. It does NOT chop the song into more pieces; that is Hypnosis.
- **DRIVE** (Ambient · Cruise · Rolling · Charged · Peak-time) — energy: role energy
  targets, fill budget, chord pace (`drivePace`), and the kit Auto drums resolve to.

`variation` remains a library option and maps onto the dials exactly — `hypnosis = 1−v`,
`chaos = v` — so an older caller generates identically; `tests/rearrange.js` pins that
identity, and a dial passed outright overrules `variation` on its own axis. Defaults
(mood 50, hypnosis 55, chaos 45, drive 50) are the exact image of Variation 45, and every
formula is an identity at those values. Only the `pattern` term differs, by one float ulp.

### Dice and the seed

- **Lucky dip (🎲)** rolls all four dials somewhere musical, rolls a fresh seed, and
  generates. Not uniform — a uniform roll spends its time in the corners, and the corners
  are where this stops being music. Mood roams the full range (every reading of it is a
  real song); hypnosis and chaos are drawn to the middle; drive never sleeps or redlines;
  and feral-with-nothing-repeating is pulled back rather than shipped. The dials MOVE to
  what was rolled, so a happy accident can be kept and tweaked.
- **Seed hold (📌)** pins the current recipe's seed, so moving a dial reshapes the song
  you are already listening to instead of rolling an unrelated one — until now a tweak
  between two Generates told you nothing, because everything else moved too. The dice
  ignores the pin for its own roll without releasing it. Cleared on song switch. The
  status line says `seed N held`.

### Advanced, slimmed

Chord loop, Walk and Chord pace are gone: Mood and Drive decide all three, and a select
that asked the same question again would be a second dial quietly overruling the first.
Key, Fill on Generate and Transpose remain. The Key picker gained **None · chromatic**, which
is the chromatic escape — it turns the loops off and hands the song back to the Transpose
dial, which is otherwise dead on any song with a detectable key.

The key readout shows the key Generate will ACTUALLY walk in, marked `· Mood` when the
dial re-read it, so the panel and the generator cannot disagree.

Drums gained **Auto · Drive**, which resolves to a real kit from the Drive dial BEFORE
the recipe is built, so `auto` never reaches a file, the validator, or the engine. Note
this makes the drums choice desk-owned: before it, a fresh Generate emitted no `drums`
field at all and played chopped, while the select snapped back to Chopped every time.

Saved M8TRX versions now carry `{ recipe, settings }`. A bare recipe — everything saved
before the dials existed — is still restored, told apart by its own `kind` rather than a
version number somebody has to remember to bump; its dials simply stay where they are.

### The chrome: five bands, and a control's band is its scope

The panel's real problem was never density, it was **scope**: four different things can be
acted on — the selection, one part, the whole arrangement, and what the next Go will build
— and almost nothing on screen said which one a control touched. Two controls were both
called Fill for that reason.

The answer is **position**. Five bands stack in a fixed order down the panel, and a
control's band IS its scope, permanently, so the meaning of a row never changes under you.
Every band carries a **212px rail down its right** naming the scope and explaining it in one
line; controls therefore start hard against the same left edge on every row instead of being
indented by their own label, and the eye scans one column of first buttons.

1. **Generate** (`.reband.regen`) — recessed onto `--panel2`, rail border dashed. Five dials
   — **Style** (Phrase ▸ Groove ▸ Chop ▸ Mix, a dial now rather than four segmented buttons),
   Mood, Hypnosis, Chaos, Drive — then **`Advanced ⌄`**, **`📌 Vary this one`**,
   **`🎲 Lucky dip`** and **`Go ▸`** (`.reprime`, the one solid control in the band).
   Key, Fill new sections, New length and Transpose live in the Advanced popover
   (`#readvancedpop`, a native `popover` placed under its button). That button **counts
   whatever is off its default** (`Advanced · 2 set`, `syncRearrangeAdvanced`) so a popup can
   never hide a setting the next Go will read — the desk's rule against hidden preset
   parameters bites hardest on controls put behind a door.
   The dials are the DESK's dials: the deferred dash stops at bordered controls, because a
   slider here has to be the same object as a slider on a channel strip.
2. **Arrangement** (`.reband.rearr`) — M8TRX drums, Clear locks & shelf, Lock what's
   playing, Save version, JSON save/load, Exit M8TRX. Nothing else: what is loaded and
   what just happened live in the DESK's status bar (`#m8status`, holding `#remetasong` and
   `#rearrangestatus`), which the panel stops above rather than covering. There is no close
   button — the toolbar's M8TRX button is the way in and the way out.

**The panel is edge to edge and opaque**, `top: var(--headh)` to `bottom: var(--footh)`,
full width, full height whether or not a recipe exists. Both edges are MEASURED
(`measureDeskEdges`, re-run on resize, on open, and when the footer line appears): the
header wraps to a second row at some widths — a hardcoded 56px covered the row carrying
Undo M8TRX and the `?` — and the footer grows when M8TRX's own line joins it.
3. **Selection · material** (`.rebar.rematerial`) — what the held slices are MADE of: Clear,
   Play from here, **Reroll material**, Pitch, Chord, Stutter, Repeat ±.
4. **Selection · arrangement** (`.rebar.rearrops`) — what they ARE and where they sit: Copy,
   Paste, **Mute**, Join, Split, Separate passes, Borrow neighbours, Loop a neighbour,
   To shelf ⌁, Delete slices.
5. **Part** (`.rebar.repartbar`, tinted) — **Chord walk**, **Reroll walk**, **Fill this
   ending**, Regenerate separately ⌁, ½, ×2, Delete part.

Then the timeline and the clip shelf, unchanged.

**Dashed means it waits.** A solid border acts the moment you press it; a dashed one
(`.defer`, plus a `⌁` on the two buttons where it needs saying twice) does nothing until the
next Go. This extends a word the panel already had — a pending edit already drew the
timeline dashed — rather than inventing one.

**Scope is named in words, never in colour.** Four scope hues were the obvious answer and the
wrong one: they collide with four of the five fixed part-role hues (rose Intro, blue Verse,
amber Chorus, purple Bridge, grey Outro — Intro was a sage green until it turned out to sit
beside the teal accent that means SELECTED / PLAYING, which made a whole Intro row read as a
row that was lit, once slices began taking their fill from the role), so a blue badge would
mean "selection" in the rail and "Verse" on the card two inches below it. Each rail states
its subject as a sentence instead — "2 slices in B · Verse", "all of B", "nothing held", "no
part" — and the accent stays reserved for the one thing it has always meant: on, selected, or
moving.

**The blurb is a first run, not a wall.** The three paragraphs that used to hold the middle
of the header are behind the `?`, opened as a native `popover` — the top layer, so neither
the panel's own `overflow: hidden` nor the desk's z-order (panel 34, slice menu 37) can clip
it, and light dismiss comes free.

**M8TRX carries no Undo of its own.** While a recipe is live the DESK's Undo becomes M8TRX's
and relabels itself `Undo M8TRX` — the same borrowing `#looptoggle` already does for Recipe
Once / Recipe Loop — routed through `undoGesture()` and kept honest by `syncUndoButton()`.
The two stacks never merge: a desk edit made while a recipe is up waits on the desk's stack
and is handed back intact on Exit M8TRX, so a recipe edit can never be undone into a
fader move. Two Undo buttons a few inches apart was the alternative, and "which one am I
about to press" is exactly the confusion the rest of this panel was rebuilt to kill.

Edits made during playback are marked pending and installed at the next output bar.
The draft can be edited cumulatively while the previous recipe is being heard.

### Timeline

The timeline is #rearrangeform: a vertical stack of `.rerow` rows, one per form
section, each row a `.reformseg` card (372px, fixed) followed by a `.restrip` lane
of `.reslice` blocks. #rearrangelist and #rearrangecontent are gone.

A slice's width is stated outright as its share of its section —
`flex: 0 0 calc(var(--slicespan) / var(--sectionspan) * 100%)`, where `--slicespan`
is the operation's `length * repeats` and `--sectionspan` is the sum over the lane.
Growing from a zero basis was tried first and is wrong: each block then pays for its
own padding and border before the proportional share is handed out, which in a
ten-slice row spends a tenth of the row equally on slices of unequal length
(measured: a 50% slice drew at 45%). Border-box keeps padding inside the share and
the lane has no gap, so the shares add to the row exactly. `min-width: 14px` is the
floor that keeps a one-sixteenth fill visible and clickable; where the floor is what
binds, the lane overflows into its own horizontal scroll rather than misreporting
the other slices.

Each section card is two lines. The top line carries the role square, the letter and
name (a button that plays from here), the chord walk in roman numerals joined by ARROWS
(`i i → iv → v`; a walk goes somewhere, and the pipe it used to use is the mark a bar line
carries everywhere else on this desk, so `i i | iv | v` read as three bars), and the output
bar range. Beneath it sit Lock/unlock, the part dice, halve, double, and To shelf. Halve
and double are also on the Part rail (`#rehalvepart`, `#redoublepart`), on whichever part is
held; the card keeps its pair because the card is how you reach a part you are NOT holding.

Clicking the card anywhere that is not one of its buttons takes that whole part into
the selection, and only that part — there is no separate checkbox and no way to hold
two parts at once. The card keeps its own drag-and-drop reorder; the timeline scrolls
vertically as a whole.

### Slice selection and the inspector

A slice block is only as wide as the time it takes, so it carries no controls.
Selection is the control:

- click a slice to select it alone (clicking the lone selected slice clears it);
- ctrl/cmd/shift-click to add or remove one;
- press and drag across a run to select it — across rows too, since the range is
  over contiguous operation indices;
- click a section card to take that whole part, replacing the selection;
- Clear selection sits in the toolbar. There is no Select all: a whole-arrangement
  selection put an edit that hits every slice in the song one click away, and picking a
  part or dragging a run says what you actually meant;
- double-click a slice to play from it, keeping it held. The double-click is counted in
  the pointer handler, NOT left to the browser's `dblclick`: a single click selects,
  selecting re-renders the timeline, so the second click of a pair lands on a freshly
  built element and the browser dispatches nothing. It also meant the pair selected and
  then deselected, so a double-click on a slice did precisely nothing.

The drag is delegated once to #rearrangeform (`wireRearrangeTimelineSelection`), so
re-renders never orphan it, and is painted straight onto the elements while the
pointer is down — the commit at release is the only render. Pointer capture pins
`event.target`, so the slice under the pointer is resolved with `elementFromPoint`.

The editor is #reinspector, now the container for the **three rails that act now**
(Selection · material, Selection · arrangement, Part) sitting between the Arrangement band
and the timeline. Each rail is STATIC markup — the same controls in the same places whether
one slice is selected or twenty — and only the subjects, the enabled states and the collapse
flag are rewritten per render.

**The rails keep a fixed height in both of their states**, and that is what protects the
timeline: it never steps up and down while you are aiming at a slice in it. The old bar kept
that promise by never changing at all; these keep it by never changing SIZE.

**A rail whose scope holds nothing collapses to its invitation.** With nothing held, thirty
greyed-out controls read as a broken panel, so `.rebar.empty` swaps `.reops` for one line of
`--faint` instruction at the same height — "Click a slice in the timeline to change what it
is made of.", "Click a slice to move, join, split or delete it.", "Click a part card at the
left of the timeline to hold the whole part." The rail keeps naming its scope either way, so
a collapsed row still reads as a row that exists. The flag is one line in
`renderRearrangeInspector`, driven off `data-scope` on the rail. Enablement within an open
rail is unchanged: still greyed, never gone.

Note that a **held part is derived from the selection** (`rearrangeSelectedSectionIndex()`),
not stored separately, so the Part rail is open exactly when the selection sits inside one
part — the two selection rails and the part rail open together. Clicking a part card takes
that part's slices, which is what makes the Part rail's subject appear.

It holds:

- Clear selection (there is still no Select all — see above);
- the Pitch cluster: transpose (EVERY semitone, −12…+12), the slice chord picker, the
  Walk button, and the walk dice.
  Transpose is disabled while the selected slices walk, and the walk sits right beside
  it so the exclusion reads as one decision rather than a control that mysteriously
  greys. The Walk button is asymmetric on purpose: turning a walk ON is a decision
  about the whole part (a progression needs bars to move across, via
  `toggleRearrangeSectionWalk`), but turning it OFF is per-slice, through the library's
  `walk-off` and `walk-on` transforms. A run of bars is a run of bars whether or not it
  happens to be a whole part, and picking three of four and getting all four is not what
  selecting means; to walk a whole part, select the part. A short run steps every bar
  (`active` pacing) rather than using the slow phrase grammar, which over one or two bars
  holds the tonic for the whole run and moves nothing at all.
  Freeing slices this way immediately re-enables transpose for them. Beyond on/off, the
  chord picker sets ANY degree of the key on the selected slices (`harmony` transform),
  so a walked part can be mixed and matched a slice at a time — one bar moved to the 4,
  another left as written — instead of the walk being all or nothing;
- Reroll, Repeat +/−, Split, Separate passes;
- Borrow neighbours (preserves output duration), Delete selected, Loop a neighbour;
- Split, which now goes down to TWO sixteenths rather than eight. The old floor
  ruled out halving a beat into two eighths, the most ordinary chop there is; the real
  limit is that there must be two sixteenths to make halves out of;
- Join, the opposite of Split: the first of a contiguous run keeps its place and grows
  to cover the whole run, the rest go, and the song keeps its exact length (so no part
  changes length and no boundary moves). Disabled unless the selection is a real run.
  It is also how a chopped run becomes one slice again — stutter then Join round-trips
  exactly back to the original operation — so the result is a PLAIN slice: the `fill` tag
  is dropped, because one continuous grab claiming to be a transition accent would be
  treated as whole-band by the engine and drawn with a fill tick on the panel;
- Silence / Unsilence, which stops the selected slices sounding without removing them:
  the time is still taken, the parts around them do not move, and turning it off returns
  the material that was always there. It is an operation flag (`mute`) gated in
  `src/engine/audio.js` — `rawAt` returns null and the frozen-lane walk is skipped — so
  nothing sounds at all, authored, generated or frozen, while the transport, groove and
  wrap machinery keep running underneath;
- Stutter, one dropdown: ×2, ×4, ×8, and the named rhythms Gallop (long short short),
  Ramp (slowing) and Build (quickening), which are relative cell WEIGHTS in
  `REARRANGE_STUTTER_SHAPES` so they land on any slice long enough to divide by their sum.
  Options that will not divide the current selection are GREYED rather than offered and
  then refused. There is deliberately no ×3 or ×6: on a sixteenth grid a slice divides by
  three only when its duration is a multiple of three, and generated durations are powers
  of two — measured across 2367 slices, they applied to 1.4% of them. Gallop carries the
  swung, triplet-ish feel instead and fits any slice.
  Note the value arrives from the `<select>` as a STRING; parse it with `Number`, not the
  library's `int()`, which answers null for strings — that bug silently made every
  numeric choice behave as ×4;
- undo, on its OWN history (`rearrangeUndoStack`, 40 deep), reached through the DESK's Undo
  button rather than a button of M8TRX's own — see the bands section above. The stacks stay
  strictly apart: the desk's Undo is for the song (mix, arrangement, notes), M8TRX never
  touches any of those, so an edit here has no business in that stack and a song edit has no
  business being undone from this panel. Recipes are replaced wholesale rather than mutated,
  so the previous recipe IS the undo state and no snapshot is needed;
  `installRearrangement` pushes unless told not to, which covers Go and JSON load as well as
  edits;
- To shelf, Regenerate separately, Play from here.

**Stutter** is a fill aimed at one slice, which is what a section-end fill is to a
section. The slice's opening fragment is retriggered across its own time — a beat
becomes four sixteenths of that beat — so its duration is unchanged and only its rhythm
moves. The library's `stutter` transform tags every cell it emits as a `machinegun`
fill, deliberately: fills are whole-band and bypass Song groove for their own span, and
that is what makes the kit stutter WITH the music rather than playing a straight bar
underneath a stuttering top. The buttons disable when no selected slice's duration
divides by the count.

The footer keeps generation, drums, transport, and saving. Every slice action routes
through `transformSelectedRearrange(action, label, options)` — the old per-row
`transformRearrangeIndex` is gone, so single and multi are one code path.

**The selection survives an in-place edit.** `applyRearrangeEdit` keeps it when the
new recipe has the same operation count, because then every index still means what
it meant. Without that, pressing Repeat + twice would need the selection made again
between presses, now that the button lives in the inspector. Count-changing edits
(split, unroll, delete, remove-loop, halve/double, Generate, JSON load) still clear
it through `installRearrangement`, because those indices are gone.

### Edits stay inside the part they were aimed at

`rebuildForm` used to rescale every boundary by `total / oldTotal` and re-snap to the
nearest slice edge, so an edit anywhere resized the whole song's form: measured, ONE
delete in the chorus moved eight slices out of the verse. Three rules replaced that, and
`work/local/m8trx-edit-isolation.mjs` checks all thirteen edit types across six songs:

1. An edit that does not change the song's LENGTH does not move a boundary at all.
2. When the length does change, each part is exactly as long as the slices that belong
   to it. `transformRearrangement` computes per-slice ownership from the old form and
   passes it to `rebuildForm`; a part that loses all its slices is dropped.
3. `compactAdjacentOperations` takes `boundaries` and `touched`. It never merges across a
   part boundary (which would read as the next part losing a slice to its neighbour), and
   never merges at a join the edit did not reach — folding two blocks together in an
   untouched part is audibly identical but visually a change to a part you did not edit.
   `removeSelectedWithLoop` additionally re-gathers untouched slices from their own
   passes rather than leaving them to the compactor.

The proportional pass survives only as a fallback for callers with no ownership to hand.

### Playhead

**Playing and selected are drawn differently on purpose.** The accent OUTLINE means
"this is what an edit will land on" and belongs to the selection alone; playback gets a
soft ground on the part's card and the growing bar under the sounding slice. The
playhead used to borrow the accent border, which made the thing that looked selected
walk from part to part on its own — a selection you did not make is worse than no
highlight. Nothing in the playback path touches `rearrangeSelectedOperations`; the
selection survives playback untouched, and `tests/mixer-layout.js` pins the two states
as distinct CSS.

The sounding slice takes `.active` and carries a bar along its foot that grows as it
plays — and that bar is the WHOLE playhead. It briefly also wore an accent ring round the
block, which was two marks for one fact (the bar already says which slice AND how far
through it) and put a bright rectangle round each block in turn, which reads as the
selection walking the song on its own. `tests/mixer-layout.js` now pins the ring's
absence, not just the bar's presence: `syncRearrangeProgress` writes `--replayed` from
`(outputStep - outputStart + 1) / (outputEnd - outputStart + 1)` off
`Audio.rearrangementPosition`, and the CSS draws
`width: calc(var(--replayed, 0) * 100%)`. One style write on one element per tick.
A whole-block highlight could only say which slice; this says how far through it.
Follow behaviour is unchanged — `scrollIntoView({ block: 'nearest' })` on the active
slice only when the operation changes, held off for 4s by wheel/touch.

### Shared geometry

`rearrangeTimelineGeometry()` walks the operation list once and returns
`{ total, sections, ops }` with each slice's `start`, `end`, `span` and
`sectionIndex` (a slice belongs to the part its START falls in). Rendering, the
status line, the inspector and `rearrangeSectionOperationIndices` all read it
instead of re-walking the recipe per card and per button.

### Clip shelf

The session shelf is #reclipstrip.

- A part card's To shelf saves that whole part as a reusable verbatim template.
- To shelf saves only the currently selected slices; the same name on a part card saves the whole part.
- Each clip has a readable label, letter assignment select, and remove button.
- Assigned clips are passed to generation as letterTemplates.
- Clips are verbatim and resizable: a different target slot repeats/trims the
  saved material instead of silently replacing it with random material.
- **A letter carries at most one clip.** `rearrangeClipLetterTaken` is the single check
  behind that: reassigning onto a taken letter already refused; `addRearrangeClip` now
  makes the same check at CREATION, because a freshly snapshotted clip inherits its
  source section's letter and two sections can share one (two Choruses are both 'C').
  Two clips silently sharing a letter used to be invisible in the UI, and at Generate
  `letterTemplates` is built with `Object.fromEntries`, which keeps only the LAST
  same-keyed entry — so the first clip did not just go unused, it looked ready right up
  until the moment it silently was not. A collision at creation strips the new clip's
  letter instead (saved, just unassigned) and toasts why.
- **Clear locks & shelf** (`#reclearkept`, `clearRearrangeKeptState`) empties locks, the
  shelf, and `rearrangeUniqueLetters` together — the same bundle every other reset in this
  file already treats as one (see `clearRearrangement`, `loadRearrangeJson`) — without
  discarding the recipe on the timeline. Disabled when there is nothing to clear; enabling
  it requires nudging `renderRearrangeInspector()` from every path that can add a lock or
  a clip outside the normal `renderRearrangeList()` flow (`toggleRearrangeLock`,
  `grabRearrangeSection`, `addRearrangeClip`, the shelf row's remove button) — those used
  to call only `renderRearrangeTimeline()`/`renderRearrangeClips()`, which never touched
  the toolbar's disabled attributes.
- Clips, locks, votes, and favourites clear on song switch. Saved M8TRX versions
  and the plain JSON export are separate from that, and now carry locks/shelf/
  `uniqueLetters` too (`rearrangeEditorSnapshot`, `applyRearrangeEditorState`) — the recipe
  is the RESULT, but those are the editorial state that produced it, and losing them on
  save loses exactly the work that got there. `editor` rides nested under the M8TRX
  version's `{recipe, settings}` wrapper, and directly on the plain JSON export's top
  level (which IS the bare recipe by contract) — read back from the raw parsed file
  BEFORE `validateRearrangement` runs, since the validator rebuilds a fixed-shape object
  from a field whitelist and would silently drop anything it does not recognise.
  `sanitizeRearrangeClip` treats a restored shelf item as untrusted the way a loaded
  recipe already is: basic shape/bounds only, dropped rather than crashing the next
  Generate, with the drop count folded into whichever toast follows rather than issued on
  its own — `applyRearrangeEditorState` returns `{ dropped }` instead of toasting, because
  it always runs one line before a caller's own toast, which would otherwise replace it
  before anyone read it. A restore that finds no `editor` block leaves the current
  session's locks/shelf untouched, matching how a missing `settings` block already leaves
  the dials alone — no opinion is not the same as an opinion of empty.

## Generator and recipe behavior

The browser-safe deterministic implementation is tools/lib/rearrange.js.

### Recipe contract

- REARRANGE_KIND remains mashenstein-rearrangement.
- Generated recipes use REARRANGE_VERSION 2; the validator still accepts version 1.
- source.steps is the source address space. Optional output.steps is generated
  output length; old same-length recipes omit output.
- Operations retain from, length, repeats, and transpose, with optional harmony and
  fill fields.
- form entries carry contiguous start/end output ranges, name/role, optional letter,
  and optional chord palette. Form source values are display hints; stale hints are
  discarded rather than used as playback authority.
- Optional key, fills, drums, and output fields are validated.

### Generation

- Seeded generation is deterministic for the same seed, source, profile, and options.
- Output can be shorter or longer than the source on beat boundaries. The desk
  offers half, three-quarter, original, five-quarter, and one-and-a-half lengths.
- Output-to-source mapping, playhead, time display, loop publication, and queued
  transport hand-off all use generated output length.
- Form sections use letters and stable repeated-letter templates. Energy still shapes
  source choices, but Intro/Verse/Chorus names are no longer fixed source slots.
- Styles are Phrase, Groove, Chop, and Mix. Mix chooses a stable style per letter.
- The source profile scores boundaries, chroma, energy, continuity, and held-note
  cut hazards. Rerolls snap to the row grid and use this scoring when available.
- REROLL is the random one, and rolls all three things a slice is: where it comes from
  (always), how its time is cut up (~a third of the time — one grab of it, or its front
  retriggered), and what pitch it plays (~a third — another degree if it walks, another
  interval if it does not, never both since a recipe carries one pitch system). It used to
  move only the source, which made it the mildest control in the panel while reading as
  the boldest. What it will NOT change is DURATION: that is the one property every edit
  here holds still, because the moment it moves everything after it moves too and a reroll
  stops being a local decision. Verified over 240 rerolled slices: duration identical
  every time, same seed same result, recipe still validates.
- Favourites are exact whole-band, untransposed source slices included once.
- Kept/locked sections are verbatim anchors; dislikes bias away from their source
  areas. Locked material keeps its step count under variable output lengths.
- uniqueLetters and assigned letterTemplates allow deliberate template exceptions.

### Harmony

- Chord walks are diatonic scale-degree offsets applied at playback using the recipe
  key, not static chromatic transposes.
- Palettes include Pop, EDM, House, Anthem, and Dark for minor keys, and the axis
  progression plus MAJOR_LIFT for major ones. The desk no longer picks between them:
  MOOD does, through `moodPalette`, and a caller naming one outright still wins.
- Slow pacing holds tonic before the lift; Steady and Active retain faster movement.
  Walk shapes include Auto, Full, Half, Turn, and Cadence. Pace comes from DRIVE
  (`drivePace`) and walk amount from MOOD (`moodWalk`) when a caller passes neither.
- MOOD re-reads a DETECTED key in its relative minor/major at the ends of the dial
  (`moodWalkKey`); a key given by name is never re-read.
- Walkable sections are scored with triadMatch, onsetRate, and walkCellScore.
  Below-threshold sections fall back to plain material.
- Per-section Walk and walk-dice edits preserve material and change harmony only.
- Walking sections and chromatic transpose are mutually exclusive. The UI disables
  incompatible transpose controls and the library rejects conflicting transforms.

### Fills and drums

- Normal slices remain beat aligned. Fill overlays replace only the final boundary
  with a seeded varied pattern made from nearby source fragments.
- Fills carry explicit names in operations and a top-level fills summary.
- Fills are whole-band edits. Even in Song groove mode, the affected fill follows
  output mapping so the kit and pitched lanes transition together.
- Drum modes are a DROPDOWN of eleven: Chopped drums, Song groove, and nine generated
  kits — Steady 4/4, Half-time, Breakbeat, Boom bap, Two-step, Disco, House, Deep house,
  Techno. The last four share a kick on every beat, so what separates them is everything
  else: where the backbeat is and whether it is a snare or a clap, how the hats sit
  against the kick, and how much is left out. They are written as four patterns rather
  than one with switches — "house is disco with less" is a description, not an
  implementation. The generated kits are
  one family (`REARRANGE_GENERATED_DRUMS`): one output clock, one pattern function
  (`rearrangementDrumHit(lane, step, seed, style)`), each written out per lane because
  where the kick sits against the backbeat IS the style. The old three-way cycling
  button could name the mode or offer the alternatives, never both. A recipe saved with
  a new kit name will not validate on an older build — same compatibility rule as any
  enum addition here.
- The recipe LOOP is a real switch. `looptoggle` used to draw 'Recipe Loop'
  permanently on and permanently disabled while a recipe was armed, which left no way
  to hear an arrangement END. It now toggles Recipe Loop / Recipe Once, DEFAULT ONCE —
  M8TRX is for auditioning an arrangement, and an arrangement that never ends never
  shows you its ending. The engine publishes the recipe's wrap boundary with
  `{ rearrangement: true, looping }` and the desk stops the transport at the HEARD
  boundary (`loop.when`), not the scheduled one, because the scheduler runs a lookahead
  ahead of the ear and parking early would cut the final bar off.

## Audio and transport

src/engine/audio.js owns the real-time mapping.

- Audio.setRearrangement(recipe|null) installs or clears immediately.
- Audio.queueRearrangement(recipe) queues a same-source recipe for the next output
  bar and installs a different-source recipe immediately. Different output lengths
  are allowed; source bounds remain protected.
- Audio.applyPendingRearrangement performs the scheduler hand-off.
- Audio.onRearrangementInstalled drives the UI pending marker.
- Audio.rearrangementPosition(step) reports section, operation, repeat, and source
  mapping for playhead and Grab behavior.
- Normal no-recipe scheduling is unchanged.
- Recipe transpose/harmony applies uniformly to pitched lanes and excludes percussion.
- Output loop callbacks publish recipe output length rather than source length.
- Section fills bypass Song groove for their affected operation.

## Refusals say why

`rearrangeEditRefusal(action, indices, options)` in tools/mixer-entry.js produces the
message when a transform reports `changed: 0`, and the disabled Split button uses it as
its tooltip. It replaced one line — "needs a longer slice or a compatible repeat count" —
that covered every refusal and explained none of them. Each reason is read off the
selection so it names real numbers: a stutter that will not divide says which count and
which slice length, a transpose refused by a chord walk says so, and Split at the floor
says the slice is already one sixteenth long.

## Z-order

`#rearrangepanel` sits at z-index 34. The nav drawer and its backdrop were BELOW it (32
and 31) and are now above (36 and 35): the drawer is a modal surface over the whole desk,
so whatever working panel happens to be open, the menu opens on top of it.

## Persistence seams

The explicit M8TRX save path is separate from ordinary song save:

- tools/mixer-entry.js: state, generation, playback, transforms, clips, locks,
  votes, save/load, restore, and UI rendering.
- tools/lib/song-source.js: desk-written export const m8trx tail.
- tools/lib/song-file.js: passes m8trx through the writer.
- tools/mixer.js: reads, returns, validates, and writes the parked version through
  the dev /mix and /save responses.

The worktree also contains existing dirty song-data edits in
src/data/imported/everything-is-looking-up-m3.js. Preserve them; do not reset or
discard unrelated work while handing this feature over.

## Verification completed

Current focused checks pass:

    node tests/mixer-layout.js
    node tests/rearrange.js
    npm run build
    git diff --check

The elevated npm run test:sound verification previously completed all 51 audio
suites with ALL SUITES PASSED.

Earlier live browser smoke verification covered M8TRX opening, Generate, Play,
selecting two slices, To shelf, assigning the clip to another letter, Generate
again, and playback telemetry around 0.975x with no browser warnings/errors.

The timeline layout was verified in a real browser on a disposable port (8077):
rows render one per section with widths exactly proportional (measured: zero
mismatch against ideal across every row), click/ctrl-click/drag selection all work,
the selection survives repeated inspector edits, the playhead underline grows within
a slice and never marks more than one, and no console or page errors appear.
Slice label and chord-numeral contrast was measured on all nine desk themes and is
4.60:1 or better everywhere — the chord numeral and fill tick are drawn in `--ink`
rather than the accent because the accent measured 1.09:1 against the role wash on
`midday`. Static tests are not a listening sign-off.

## Remaining handover QA

Run a temporary Mixer server on a disposable port and check:

- the rows read as time at a glance, and a very chopped section stays legible;
- section drag/drop updates section and slice mapping correctly;
- section controls do not widen the row head unexpectedly;
- several generated recipes sound coherent with the slow chord grammar;
- Burst, Rush, Machine gun, and Auto fills sound like varied transitions;
- Generate, section ×2, slice delete, loop removal, transpose, walk toggle, and fill
  all land at the next output bar without a restart;
- the pending marker clears only after the queued recipe is installed;
- saving/restoring an M8TRX version leaves the normal game arrangement untouched;
- malformed/stale JSON still produces a clear dialog without a half-loaded panel.

## Primary files

- tools/lib/rearrange.js — generator, validator, output mapping, letters/templates,
  styles, harmony, fills, and pure transforms.
- tools/lib/rearrange-profile.js — source profile and walk scoring.
- src/engine/audio.js — scheduler mapping, output length, queueing, drums/fills.
- tools/mixer-entry.js — M8TRX state and UI behavior.
- tools/mixer-shell.html — panel markup and layout.
- tools/mixer.js, tools/lib/song-source.js, tools/lib/song-file.js — save seam.
- tests/rearrange.js — generator, transform, validator, and output contracts.
- tests/mixer-layout.js — UI/audio source contract.
- work/local/m8trx-plan.md — living plan and design decisions.

