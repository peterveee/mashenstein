# M8TRX form design — beyond Intro/Verse/Chorus in fours

Date: 2026-08-16

Status: **built**. What began as a design proposal is now shipped; this document is kept
as the record of why, including the two places its own evidence turned out to be wrong.

**What shipped**

| Piece | Where |
| --- | --- |
| Phrase-grid detection, and the generator honouring it | `detectPhraseGrid` in `rearrange-profile.js`, `sourceCandidates` in `rearrange.js` |
| Form grammars — Song, Dance, Loop, AABA, Arch | `REARRANGE_FORMS` in `rearrange.js`; **Form** select in Advanced |
| The song's own detected form as a grammar | `detectSongForm` in `rearrange-profile.js`; Form → *This song's own* |
| Letter / role / bars split into independent fields | `fitForm` in `rearrange.js` |
| GRAIN dial, Style demoted to an Advanced override | `grainStyle` in `rearrange.js`; **Grain** in the header |
| Chord walks at any part length of four bars or more | the gate in `rearrange.js`, `pacedChords` |
| Offline rendering of a recipe, for auditioning | `render-bank-page.js`, `render-bank-browser.js` |

Confirmed by ear on `smw-overworld`, `special-stage-1` and `shop`. The sections below are
the reasoning as it developed, corrections included.

M8TRX generates good arrangements and they all have the same skeleton. This document
says exactly which lines of code that skeleton lives in, why the constraint is
narrower than it looks, what other shapes are worth offering, and what breaks when
they are.

## The constraint, precisely

Two things are fixed, and only one of them is the one people notice.

**Every part is four bars.** `formFor` (`tools/lib/rearrange.js:1088`) divides the
output length by `PHRASE_STEPS = 64` and emits that many parts, each exactly 64 steps.
The only part that is ever a different length is the leftover remainder, and it is
always called Outro. Length as a dial changes how many parts there are; it has never
changed how long one is.

**The role sequence is one hardcoded ladder.** `formRoles` (`:1073`) is a lookup from
unit count to a role list, and past seven units it cycles
`Verse · Chorus · Verse · Chorus · Bridge · Chorus` and caps it with an Outro. There
is exactly one macro form in the generator, stretched to fit.

The less obvious one, and the reason this is more than a table of alternative
sequences:

**Role, letter and template are the same axis.** `formFor:1095` assigns letters *per
role* — every Verse in the song is letter B, and generation keys its template cache on
the letter (`:1579`). So all verses are not merely similar, they are the same generated
material by construction. A form with two contrasting verses is not currently
expressible; `Make unique` / Regenerate separately exists precisely because that is
sometimes wrong, and it is a per-part escape hatch from a structural decision.

Three smaller couplings follow from the four-bar assumption:

- **Harmony is gated on it.** A chord walk is only offered when
  `section.steps === PHRASE_STEPS` (`:1608`). A six-bar or two-bar part cannot walk at
  all today — it falls through to plain material. Odd lengths without touching this
  would read as "long parts lost their chords".
- **Source candidates step in fours.** `sourceCandidates` (`:1119`) offers phrase
  starts at 64-step intervals, so the material a part is built from is also
  four-bar-quantised at the point of choosing.
- **Role names carry real behaviour.** `chooseSource` (`:1140`) hardcodes Intro → the
  first candidate, Outro → the last, Chorus → densest, Verse → opening material; and
  `ROLE_ENERGY` (`:80`) is five named entries. A new vocabulary of part names needs
  those two behaviours re-expressed, or every new name scores as the neutral middle.

What is *already* ready and does not need work:

- The timeline draws parts of any length. `REARRANGE_LINE_STEPS` wraps anything past
  four bars onto more lines and scales down when nothing reaches four bars
  (`tools/mixer-entry.js:7310`).
- The validator checks contiguity and total coverage, not part lengths
  (`validateForm`, `:1375`). Odd-length forms validate today.
- Halve and double already produce non-four-bar parts by hand, and the recipe survives.

So the timeline and the file format are not the obstacle. The generator's form
constructor is.

## The shape of the fix

Replace `formFor`'s two hardcoded functions with a **form grammar**: a table of named
structures, each a list of parts, each part carrying three independent fields.

    { letter: 'B', role: 'verse', bars: 8 }

- `letter` is **identity** — what shares a template with what. Two parts with the same
  letter are the same material returning.
- `role` is **intent** — what the part should feel like, which is what feeds source
  choice and energy target.
- `bars` is **length**, free of the other two.

Splitting letter from role is the change that pays for itself beyond this feature:
`A B C B D B` (two verses that differ, one chorus that returns) becomes sayable, and
`Regenerate separately` becomes a normal setting of the letter rather than a special
case bolted on the side.

A grammar entry then also declares how it fits a requested output length. Two
strategies cover everything below: **repeat a middle block** (verse/chorus forms grow
by adding another cycle) and **scale the unit** (a build/drop form grows by making
each part longer, not by adding more drops).

## Candidate structures

> **Built.** Five of these shipped as `REARRANGE_FORMS`, plus a sixth that is not a shape
> at all — *This song's own*, read off the material by `detectSongForm`. Odd part lengths
> came free with the letter/role/bars split rather than needing a modifier of their own.

Six worth having. Bar counts are the unit shape; the length dial multiplies or repeats
per the entry's own strategy.

**1. Song (current).** `Intro 4 · Verse 4 · Chorus 4 · Verse 4 · Chorus 4 · Bridge 4 ·
Chorus 4 · Outro 4`. Stays the default, unchanged, so every existing recipe and test
keeps its meaning.

**2. Dance.** `Intro 8 · Build 4 · Drop 8 · Breakdown 8 · Build 4 · Drop 8 · Outro 8`.
No verse or chorus at all. This is the one the feature most obviously wants — M8TRX is
already a loop instrument with Techno and Deep house kits in the box, and it is
currently forced to describe its output in band vocabulary. Needs two new roles:
**build** (rising energy, short, ends into the next part — a natural fill site) and
**drop** (highest energy, longest, the densest source material).

**3. Loop-and-mutate.** One letter, six to twelve parts, all the same source, energy
climbing then falling: `A 8 × n` with the energy target as an arc rather than a
per-role constant. No contrast by material at all; the contrast is what accretes and
drops away. This is the minimalist/phase shape and it is nearly free — it is the
existing generator with one letter and a moving energy target.

**4. AABA.** `A 8 · A 8 · B 8 · A 8`. No chorus. The eight-bar unit is the point; on
four it collapses into the current form with different labels.

**5. Arch.** `Intro 4 · Verse 8 · Verse 8 · Prechorus 4 · Chorus 8 · Verse 8 ·
Chorus 8 · Chorus 8 · Outro 4`. Hook deliberately late — the payoff is the delay. This
is the form that most needs variable lengths; at a fixed four bars it is just the
current ladder with the chorus moved.

**6. Odd metre.** Not a form but a modifier: allow part lengths from
`[2, 3, 4, 6, 8, 12]` rather than `[4]`, applied to whichever grammar is selected. Six-
and twelve-bar parts are what make a form stop sounding machine-cut even when the role
sequence is ordinary.

My read: **Dance** and **Loop-and-mutate** buy the most for the least, because they are
the shapes the existing kits and dials already imply. **Arch** buys the most musically
and costs the most, because it is the one that genuinely needs harmony at non-four-bar
lengths.

## What it touches

In rough order of difficulty.

1. **`formFor` / `formRoles` → a grammar table.** New module or a new export block in
   `rearrange.js`. Everything else in generation reads `sections` and does not care how
   it was built.
2. **Letter assignment leaves role.** Letters come from the grammar entry, not from
   `letters.set(role, …)`. `uniqueLetters` and `letterTemplates` keep working
   unchanged, since they were always keyed on letter.
3. **Role behaviour becomes a table, not a switch.** `ROLE_ENERGY` and `chooseSource`'s
   Intro/Outro/Chorus/Verse special cases become per-role data: an energy target, and a
   source preference (earliest / latest / densest / sparsest / same-as-letter). New
   roles are then a table row, not a new branch.
4. **Harmony at any length.** The `section.steps === PHRASE_STEPS` gate at `:1608` has
   to become "the part is at least N bars and divides into whole bars", and
   `pacedChords` already takes a bar count. This is the real work item and the one
   where listening decides — a walk over eight bars at slow pace may want a different
   grammar from the four-bar `1 1 1 1 | 4 4 | 5 | 6`.
5. **Source candidates off the four-bar grid.** `sourceCandidates` needs to offer
   starts matching the part length requested, not always 64.
6. **Fill budget is per part.** `fillBudget` counts parts (`:1562`); a form with fewer,
   longer parts gets proportionally fewer fills. Should probably count bars.
7. **The UI.** A **Form** select in Advanced beside Key and Fill on Generate, with the
   same *next Generate only* semantics. It is a generation setting and belongs with the
   other two.

Not touched: the recipe format, the validator, the engine, the timeline, save/load. A
form is already just contiguous named ranges, and it stays that.

## Open questions

> **Resolved.** Form ships as a select in Advanced and Style became GRAIN, a dial in the
> header, with Style surviving in Advanced as an exact override defaulting to Auto. The
> two never contradict each other because Auto means "follow the dial", and the dial greys
> out while a named style is in force. The dial's two ENDS are hard gates, which is what
> answers the objection recorded below.

**Does Form belong in Advanced, or on a dial?** Advanced is my recommendation — a form
is a choice, not a continuum, and the four dials are already each doing one honest job.
But note the tension the handover is explicit about: controls were removed from
Advanced precisely because a dial already answered them. **Hypnosis** ("how much the
song repeats itself") is adjacent to Loop-and-mutate, and **Drive** already resolves the
kit. If Form ships as a select, its Auto entry should read the dials — high Drive plus
high Hypnosis is a Dance or Loop form — so the two never state contradictory intents.

**Does Style survive?** The *axis* must — Style gates slice lengths where Form gates
part lengths, and those are genuinely different questions. The *control* probably
should not.

Style is the last categorical control on a panel that decided everything else is a
dial, and `Mix` is an admission that the categories are too rigid: it exists only to
say "do not commit to one of these." Slice grain is a continuum — 64 → 32 → 16 → 8 → 4
steps — which is a dial's shape, not a radio group's.

> Proposal: **GRAIN**, a fifth dial (Phrases · Bars · Groove · Beats · Shards), and
> `Mix` disappears. Varying the grain per letter is "how far from the safest answer a
> choice may land," which is exactly what CHAOS already means — so Mix becomes an
> emergent behaviour of a high Chaos setting rather than a fourth entry in a list.

The loss is real and this document should not pretend otherwise. The whole point of
naming a style is being able to *rely* on it: Groove currently promises bar and
half-bar cells on eight-step boundaries and nothing else, and a dial at 90% that
"usually" gives beats is a weaker promise. The answer is that the dial's two ends stay
hard gates — 0 is phrases only, 100 is beats only — and only the middle interpolates.
Worth deciding deliberately, because it is a design principle the panel has held to
until now.

Either way, Phrase-grain material inside a two-bar part has almost no room to work.
Some Form/grain combinations need greying rather than offering-then-refusing, the same
treatment Stutter already gets.

**How much does the grammar author, and how much does the generator?** A fully written
grammar (Arch) is a strong opinion; a parameterised one (part count, unit length,
energy curve) is more general and less musical. Proposal: ship written grammars,
because the whole complaint is that the generator's own opinion is too uniform.

## Would AI help here?

In three places, none of them at runtime — and the largest single win available is not
AI at all.

### First, the thing that is not AI — now measured

**The generator never asks where the source song actually changes.**
`sourceCandidates` (`:1119`) offers phrase starts every 64 steps and `chooseSource`
ranks them by mean energy, so "find the chorus" currently means "find the loudest four
bars". The source song's own form is never consulted.

This has now been prototyped — `work/local/detect-form.js`, throwaway — and it works
better than expected.

A self-similarity matrix over per-bar features (chroma, onset pattern, kit accents,
energy) with a Foote novelty curve down its diagonal, scored against the songs' own
authored section changes across all 28 songs that have an arrangement:

> **mean precision 100%, mean recall 94%.**

Every boundary it finds is a real one. `finale` (88 bars) comes back as
`A B C D E F G D H E F G D H E F G I` with a 24-bar repeat cycle, and the letters are
*exactly* right — D is always authored section 2, E always 4, F always 5, H always 11.
The 6% it misses are two-bar interjections.

**The imported catalogue is the real test**, and it is far more emphatic. M8TRX is
heading for a standalone tool where people bring their own music, so the songs that
matter are the 138 in `src/data/imported/` — full-length MIDI, most with no authored
arrangement at all. Nothing can be read off those files. Detection is the only path.

> **CORRECTION, same day.** The accuracy figures first written here were illusory, and
> listening caught it. See *What the listening test found* below before trusting any
> number in this section. The detected forms and part lengths still stand; the claim
> that they were *validated* does not.

Across 75 imported songs, detected forms:

| Song | Bars | Period | Form | Part lengths |
| --- | --- | --- | --- | --- |
| `special-stage-1` | 128 | 24 | `A B C D C D C D C D C E` | 3 5 **16 8 16 8 16 8 16 8 16 8** |
| `smw-overworld` | 46 | 22 | `A B C D E B C D F` | 2 8 4 4 6 8 4 6 4 |
| `min-new` | 70 | 24 | `A B C D B E D F G H B D I` | 2 4 4 8 8 8 8 4 4 4 8 6 2 |
| `castle` | 76 | 24 | `A B C D E F` | 2 16 4 4 **44** 6 |
| `shopping-full` | 34 | 16 | `A B C D E` | 1 **13** 4 **14** 2 |
| `everything-is-looking-up-m3` | 108 | 4 | `A B C D E F` | 2 6 **50** 8 **36** 6 |
| `wipl-bgm-shop` | 36 | 4 | `A B C D` | 2 4 **28** 2 |

`special-stage-1` is the one to look at: a 16-bar part alternating with an 8-bar part,
five times, on a 24-bar cycle. That is a completely legible musical form, and there is
no reading of it in which the parts are four bars long.

Four findings change this document.

**1. Four bars is measurably wrong, and badly.** Across all 75 imported songs only
**29%** of detected parts are four bars; among the 26 long enough to have a form,
**41%**. The part lengths actually present are **1, 2, 3, 4, 5, 6, 8, 10, 12, 13, 14,
16, 20, 22, 26, 28, 36, 44 and 50 bars**. The repeat period is 4 bars in 57 songs but
**24 in six, 22 in four, 16 in three, 8 in three**. Variable part length is not a
stylistic preference — it is what the material already is, and the generator currently
flattens all of it.

**2. Parts return, and the detector sees it.** A part recurs in **53 of 75** songs, and
the letters are right where there is ground truth to check them. That is the evidence
for splitting letter from role: `smw-overworld`'s `A B C D E B C D F` cannot be said in
the current model at all.

**3. Two scales, two questions, two kernels.** A fine kernel finds every genuine
material change including two-bar interjections — the *boundary safety* question, where
may a slice start without chopping something. A coarse kernel finds the parts a
listener would name. Using the fine reading for form turns `finale`'s legible eighteen
parts into confetti; using the coarse reading for cuts misses real edges. Both are
cheap and should be kept separate.

**4. An order entry is a TWO-BAR BLOCK, not a section.** This is what made the four-bar
assumption look reasonable in the game catalogue. `finale`'s order runs
`… 2,2,2,2, 4,4, 5,5,6,6,5,6 …` — one chorus authored as six blocks. Anything reasoning
about form must collapse blocks into parts first.

**On reading the authored `order` instead:** where a song HAS one it is exact and free.
But it is a bonus, not the path. An imported MIDI arrives with no meaningful
arrangement, and that is the case the standalone tool is built for.

### What the listening test found — the detector has a phase bug

`work/local/mark-form.js` renders a song with a blip at each detected boundary. On
`smw-overworld` the blips are **consistently one bar early**. Chasing that produced two
corrections, one of them to this document's own evidence.

**The detector can only ever propose EVEN bars.** Not a bias — a structural
impossibility. Lanes in this engine are 32-slot **two-bar patterns**, and `bar.half`
alternates 0/1, so same-parity bars resemble each other for reasons that have nothing
to do with musical form. That puts a period-2 comb straight into the novelty curve: on
`smw-overworld` the mean novelty is **+0.52 on even bars and −0.05 on odd**, and every
local maximum across all 46 bars is even. Detrending against the neighbouring bars
makes it *worse* (+0.68 / −0.68), so it is not a removable offset — it is baked into
the representation.

**And the validation was largely vacuous.** An imported MIDI's `sections` are just its
two-bar blocks, so its "section changes" land on nearly every even bar and never an odd
one. Scoring an even-bars-only detector against an even-bars-only truth cannot fail.
**26 of the 40 songs scored had exactly that** — the 100%/97% figures above were
measuring nothing. Restricted to the 14 songs with genuinely informative structure, at
**zero** tolerance (the earlier ±1 tolerance could not tell "exact" from "one bar
early"): **100% precision, 70% recall**, and shifting by ±1 collapses it to ~10%.

So the detector faithfully reports the *data*. On `smw-overworld` the data itself is a
bar out of phase with the music — a one-bar pickup means phrases start on odd bars,
while the import's two-bar block grid starts on even ones. Both the file's sections and
the detector inherit the wrong phase.

### The phrase grid offset is a first-class requirement

`smw-overworld` has a **three-bar intro** — the music proper starts around 5s, which at
132 bpm is bar 3. Its phrases therefore begin on odd bars, and the blips are one bar
early because the detector is locked to the even lattice.

**Songs generally have intros of arbitrary length.** So a phrase grid begins at some
offset φ, not at bar 0, and "even or odd" is only the special case of φ mod 2. This is
not an edge case to patch — it is a property of ordinary music that the whole pipeline
currently assumes away.

**It is not only a detection problem.** `sourceCandidates` (`:1119`) walks phrase starts
from bar 0 in 64-step strides, and `formFor` divides from bar 0. On a song with a
three-bar intro, *every four-bar phrase M8TRX cuts is displaced by a bar* — independent
of anything else in this document. That is a live defect in shipped behaviour, not a
consequence of the proposal.

**A signal that works, not yet a solution.** Rhythm and kit features cannot answer this:
being two-bar patterns, they favour even bars whatever the music does. **Chroma can** —
harmony moves on phrase boundaries and does not inherit the lane grid. Scoring four-bar
units by internal chroma agreement minus agreement with the next unit
(`work/local/phase2.js`):

| Song | Phase called | Margin | Expected |
| --- | --- | --- | --- |
| `smw-overworld` | odd | 0.0162 | odd (3-bar intro, confirmed by ear) |
| `special-stage-1` | odd | 0.0159 | odd |
| `finale` | even | −0.0139 | even |
| `megamix` | even | −0.0262 | even |
| `hub`, `neon`, `shop`, `speed` | odd | 0.0012–0.0063 | even — **wrong** |

Eight of twelve. But the songs known to be offset separate cleanly at margins around
0.016, while every error sits at the noise floor below 0.007. A threshold near 0.01
would score twelve of twelve — which is a threshold fitted to twelve songs, so it is a
lead and not a result. The expected values for the four misses are themselves inferred
rather than ground truth.

### Built, and confirmed by ear

**Shipped.** `detectPhraseGrid` in `tools/lib/rearrange-profile.js`, consumed by
`sourceCandidates` in `tools/lib/rearrange.js`.

The estimator scores four-bar units by how much the bar-to-bar chroma distance piles up
ON a candidate grid versus off it, and returns a **confidence** alongside the offset.
Callers apply it only when confident and otherwise stride from zero exactly as before —
a wrong offset displaces every phrase of a song that was previously right, so the
conservative direction is not shifting. `hub`, the case the estimator gets wrong, is
correctly rejected at a margin of 0.0009; the ear-confirmed songs sit at 0.06–0.07.

**The correction is one line of arithmetic in one function**, and the reason is worth
keeping: a whole-bar offset is a multiple of 16, and the styles align cells to 16, 8 or
4 steps — all of which divide 16. Bar and beat alignment are therefore untouched by it.
The four-bar phrase stride is the only grid an offset in bars can break.

Bar 0 stays a candidate whenever the offset is non-zero: the material before the first
full phrase *is* the song's intro, and that is exactly what an Intro part should reach
for.

**Verified by listening**, which is the only thing that could settle it. `smw-overworld`
(offset 1) and `special-stage-1` (offset 3) were bounced with and without the
correction, identical in seed, style and form —
`work/local/render-m8trx.js` — and the phased renders were judged better on both.

Supporting change: the offline renderer now accepts a recipe (`rearrangement` through
`render-bank-browser.js` into `render-bank-page.js`, installed after the arrangement
resolves), so any M8TRX performance can be bounced to WAV for audition. Opt-in; omit it
and every existing render is byte-identical.

**Still open.** The confidence threshold is calibrated on twelve songs, four of them
labelled by inference rather than by listening. `shop` reports offset 1 *above* the
threshold on one of those unverified labels — if that call is wrong, the threshold is
too loose. That is the next thing to put through the same A/B.

### Where a model genuinely fits

**1. Authoring grammars, offline.** This document recommends shipping *written*
grammars because the generator's own opinion is too uniform. Drafting thirty of them
across genres is squarely a language model's strength, and the output is committed
data — no runtime dependency, determinism untouched. Cheapest real win of the three.

**2. Learned scorer weights.** `scoreOffset` combines cut cost, chroma match, energy
target and continuity under hand-tuned weights — a small linear model already, just
fitted by ear. The 👍/👎 votes are in the UI. Train offline on the accumulated
judgements, ship roughly twenty numbers, keep every runtime property. The obstacle is
cold start: this needs a corpus of decisions that does not exist yet, so the actionable
step now is to **record votes durably** (which recipe, which seed, which settings,
which sections) and train once there is something to train on.

**3. Natural language to recipe, on the desk only.** The recipe JSON is small,
documented and validated, which makes it a good target: "sixteen bars, build, drop,
breakdown, hook late" → a form grammar. It needs network and a key, so it belongs on
the Mixer desk and never in the shipped game.

### What is ruled out

Anything neural in the playback path, on three independent grounds. It breaks
**determinism**, and same-seed-same-recipe is load-bearing for save/load and for every
test in `tests/rearrange.js`. It breaks the **one-core audio budget**, against a
standing rule that playback wins. And the game **ships as static files** with no server
to call. A model that generates arrangements at runtime is the wrong shape for this
codebase, not merely an expensive one.

## Verification this would need

- `tests/rearrange.js` pins `Intro → Verse → Chorus → Verse → Chorus → Bridge →
  Chorus → Outro` verbatim (`:256`) and the chorus-above-verse energy ordering
  (`:424`). Both stay valid as the default form's tests; new forms need their own.
- Contiguity and exact output coverage must hold for every grammar at every length
  multiple — that is a generated matrix test, not a handful of cases.
- Harmony at non-four-bar lengths cannot be settled by a test. Eight-bar walks and
  six-bar parts need listening on three contrasting songs before the gate at `:1608`
  is widened for real.
