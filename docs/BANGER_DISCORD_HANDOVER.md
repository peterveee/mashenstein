# Banger discord in bars 3–4 — handover

7 Oct 2026. Peter still hears "some discord with bars 3/4 on occasion" in Lab bangers made
from a four-bar riff. This is after generator v8 ("nothing grinds", 6 Oct), which cut harsh
clashes from 3.2% to about 1% of melodic notes across 2,016 Lab songs. The 1% is an average
over every bar of every song. Nobody has measured where in the phrase the remaining clashes
fall, or whether four-bar riffs carry more of them.

Nothing below has been changed yet. This is a map of how the harmony works and the suspects
to check, in order.

---

## Peter's two questions, answered

**How do the chord progressions deal with the different moods?**

- Each mood is an eight-bar progression of numerals, written once with a **major** side and
  once with a **minor** side (`tools/lib/banger/moods.js` for the 17 shared moods; the first
  nine live in each style's recipe). A bar holds one chord or two half-bar chords. A quality
  written on a numeral (`I7`, `imaj7`, `IVmaj7`) belongs to the mood.
- **The riff picks the side, not the mood.** The key is detected from the riff's notes
  (`analyse.js analyseRiff`, Krumhansl profiles, with the first bass note and the hook's last
  note given extra weight). A minor riff plays the mood's minor side. The mood's `preferMinor`
  only settles a riff too ambiguous to call (confidence < 0.04), e.g. A minor or C major.
- The numerals become chords in that key (`romanChord`). Then, **bar by bar,** the mood's
  chord is kept *if the hook sits on it*: it gets a +0.25 bonus in the scoring. Otherwise the
  best-fitting chord from the key replaces it (`sections.js chordsUnder`, line 55). So a mood
  is a strong preference, not a guarantee.
- After that the mood **colours** the chord (`sections.js colour`, line 40): sevenths, ninths
  or add9 per its `colour` map, as long as the coloured chord stays in the key.
- Modes other than major and minor (dorian, phrygian …) swap in the style's `modeHarmony`
  walks. Only the desk sets a mode; the Lab always plays in the riff's detected key.

**Are the riff's notes changed to fit the key?**

**No.** The riff is never moved to suit a chord; the chords are chosen to suit the riff. This
is a standing rule (the `analyse.js` header; the memory note `banger-nothing-grinds`). In the Lab
nothing changes the riff's key: `make.js makeBanger` never sets `mode`, `riffNotes` or `to`,
so the defaults apply (`keep`, `keep`, `keep`). The riff's own notes therefore always count as
"in key", because the key was read off them.

What *does* move notes:

| What | Where | Fitted to the chords? |
| --- | --- | --- |
| Key lift: the last drop up a major third, 1 take in 3 at top voltage | `make.js` line 350 | Everything moves together, so nothing new clashes |
| Drop variations: `k2`/`k4` sequence, `frag`, `turn`, `leap`, `chop`, `disp` | `variation.js realise` | The chords are re-chosen for the *moved* hook (`chordsUnder` scores the realised bar) |
| Derived lines: third below, pre-chorus, middle 8, verse, breakdown bell | `theory.js fitToChords` | Yes, since v8 |
| Fill In (repeat / passing / neighbour notes) | `embellish.js` | **No.** See suspect 3 |
| Desk only: Mode + Riff Notes = Fit (Surprise rolls Fit 3 times in 10) | `analyse.js chooseKey` | The riff moves into the mode degree by degree |

---

## Why four bars are a new surface

A two-bar riff loops: riff bars 0 and 1 alternate under mood numerals 1–8. A four-bar riff
meets the mood's progression differently:

- **Plan positions.** `variation.js` `PLANS[4]` (line 193) plays riff bars 0 1 2 3 0 1 2 3.
  Riff bar 3 always lands on phrase bars 4 and 8. Phrase bar 8 is the **`turn`**: the first
  half of riff bar 3 is kept and the second half is rewritten onto the dominant.
- **Numerals 3, 4, 7 and 8 are where the moods go furthest from home.** Examples: Bittersweet
  `iv` and `Vsus4 V`; Wonder `bIII` and `bVII`; Boss `VI V`; Playful `#Idim7`. Riff bars 2–3
  meet these chords in every phrase. A two-bar riff only met them on alternate passes, with
  bars it had already shown sat on most chords.
- **ZAP at four bars** writes material the two-bar ZAP never did. Bar 3 is bar 1 moved along
  the scale; bar 4 goes home to A. One take in three is a cabinet's own four-bar phrase
  (`game-riffs.js` lines 86–140). Some of these carry a leading note or long held notes, e.g.
  `crypt-theremin-4`: `G#4:10`, `A4:9`, a `D5:3` on step 14 ringing over the bar line.

---

## Suspects, most likely first

1. **Colour is applied after the choice, without listening to the hook.**
   `chordsUnder` scores **triads** and picks one; `chordPart` → `colourAll` (sections.js 297,
   40) then adds the mood's 7th or 9th, checked only against the *key* (`mood.fits = inKey`).
   - A hook note that was harmless over the triad can grind on the added note. Example: a ♭7
     in the hook under a chord coloured `maj7`; under `grindOf` "the other seventh" is a
     full grind.
   - The written-quality path has a guard against this (`hookClashes`, line 88). The colour
     path has none.
   - Cheap to test: count grinds against the coloured chord vs its triad.

2. **The mood bonus can outweigh a small grind.** In `chordsUnder` the mood chord gets +0.25
   and the riff's own chord +0.15 (+0.3 at Faithful). A grind costs `0.6 × outside + 1.0 ×
   grind` as a share of the bar's weight, so a grinding note under ~12% of the bar's weight
   survives. The two-chord path keeps both halves at fit ≥ 0.2, which is loose. The breakdown
   walk allows up to 5% grind (`sections.js` line 818). Short passing notes may be fine there;
   held or downbeat ones are not. Weigh by length and beat when you measure.

3. **Fills are added after the chord is chosen.** `phraseBar` (line 363) chooses chords from
   `plainPart` but plays `filledCell` on filled passes. A neighbour note above the root is
   in the scale but can still be a flat ninth: E→F over E major in A minor. The style
   defaults and voltage rolls decide whether the Lab uses fills; check `options.parts.fillIn`
   in a Lab take.

4. **The turnaround is forced.** `chordsUnder(..., { turn: true })` returns `[best first
   half, dominant]` without scoring the second half. `turnaround()` (variation.js 63) rewrites
   steps 8 and 12 onto V's chord tones. But `cut(part, 8)` may leave a note from the first
   half sounding into the V. Riff bar 3 is the turn bar in every four-bar plan.

5. **Notes that ring over the bar line.** `barWeights` caps a note's weight at 8 steps but
   never at the bar's end (`analyse.js` line 30). A long note late in bar 2 is weighed in
   bar 2 but sounds over bar 3's chord. A two-bar riff has the same seam at 1→2, but four
   bars adds a 2→3 seam under a fresh numeral. The Lab grid allows lengths past the bar.

6. **Chromatic notes in ADVANCED or ZAP cabinet phrases have no chord.** The chord pool is
   the key's diatonic triads, plus the mood's own chords, plus V in natural minor
   (`diatonicChords`, analyse.js 214). A G# or C# in bars 3–4 that the rest of the riff does
   not set up has nothing to sit on. SIMPLE grids are all A natural minor, so this only
   applies to ADVANCED and the cabinet phrases.

---

## How to measure

The template already exists: `tests/banger.js` lines 1404–1447. It generates four-bar
`luckyNotes` riffs and walks the bank. For every hook note it finds the chord the pad is
holding and counts a flat ninth or "other third" on it. That test covers only pre-choruses
and middle 8s. Copy it to `work/local/_bars34-grind.mjs` and extend it:

- **Every section**, not just pre-chorus and middle 8.
- **Bin by phrase bar (1–8) and by riff bar (0–3)**, and record the plan op (`as`, `turn`,
  `k2` …), the mood, the chord the generator chose vs the mood's numeral, and whether a fill
  was playing.
- **Score against the coloured chord as played**, not the triad. This separates suspect 1
  from suspect 2.
- **Riffs from three places:** `luckyNotes('simple', rng, 4)`, `luckyNotes('advanced', rng, 4)`
  and each four-bar `GAME_RIFFS` entry.
- **Go through `make.js makeBanger`**, not `generateBanger` directly, so the Lab's voltage
  rolls, flavours and defaults apply. Sweep all 26 moods and the Lab styles, with seeds held
  fixed.
- **Compare two-bar riffs against four-bar riffs.** The question is whether bars 3–4 are
  worse, not whether the clash count is zero.

**Fastest route to the real case:** ask Peter for the take. A Lab song is stored as a recipe
(notes, style, mood, seed, voltage; `store.js`, `save.data.bangers`), so his draft or kept
song replays exactly. One bar he can name is worth more than a sweep.

---

## Rules that still hold

- **The riff's notes are never changed to suit a chord.** Fix the chord choice, the colour, or
  the derived line, never the riff. A new derived line goes through `fitToChords`.
- **"X is discordant" scopes the fix to X.** Don't re-voice moods that aren't implicated.
  Changing kept songs needs Peter's say-so. He gave it for v8; ask again for this. A change
  to the generator's output bumps `BANGER_GENERATOR_VERSION`.
- **No renders unless asked.** Measure from the bank data. Any live-browser harness must be
  silent (gain-0 sink, see memory). Don't commit; the tree is shared, so stage by path if
  asked.
- **Don't rerun the v8 measurement as proof** that bars 3–4 are fine. It is an average over
  every bar, which is what hid this.
