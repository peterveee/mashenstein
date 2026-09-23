# TERMINAL VELOCITY — the neon levels, re-lit

Plan, 23 Sep 2026. Nothing here is built yet. The looks come from two lab bake-offs
in the gallery (`neon-mood-bakeoff`, `neon-kana-bakeoff`). Their candidates live in
`src/dev/neon-mood-candidates.js` and `src/dev/neon-kana-candidates.js`.

## The arc

| Level | Opens on | During the level | Ends on |
| --- | --- | --- | --- |
| **neon-1** | Golden hour, sun rays all the way round | A **lightning strike** on the bar where the song turns minor turns the city to night. **Aurora** fades in halfway through. | Night + aurora |
| **neon-2** | Night + aurora | No change | Night + aurora |
| **neon-3** | Night + aurora | No change | Night + aurora |

Levels 2 and 3 open where level 1 finishes. They have no day→night change and no
strike.

## 0 · Prerequisite: the song

The strike is timed to SESERAGI, so SESERAGI has to be the cabinet's song. The plan
assumes **v17** (`seseragi-v17-unpaired`): v14's desk arrangement with v15's drum sound,
half-time drums in the major opening (bars 1–14) and the Shibuya breakdown (bars 45–52),
and every bar given its own section so desk edits cannot leak between bars.
It turns minor at **bar 15**, which is beat 56: 22.4 s in at 150 BPM. The half-time
drums end on the same bar, so the strike lands where the drums go full tempo.

- Wiring it in moves it out of the `imported` desk drawer and into the cabinet's
  track slot in `src/data/cabinets.js`. The levels tool (−22 dB) runs on it after
  that.
- **CPU:** v16 measured 0.49 cores (54 % of the rhythm theme). v17 plays the same notes,
  so it should cost about the same; a bench is running.
- The minor-turn bar is a **named constant that lives with the song**
  (`MINOR_TURN_BEAT = 56`), not a time. If the turn moves earlier, the strike moves
  with it: edit one number.

## 1 · The mood seam, promoted out of the lab

The shipped painter already reads `neonMood` (`sky`, `skyExtra`, `stars`, `moon`,
`haze`, `mass`, `wire`, `veil`). If it is absent, you get today's night. Steps:

1. Move the two chosen moods from `src/dev/` into the pack as real data, next to the
   neon background: **GOLDEN** and **AURORA NIGHT**. The other bake-off candidates
   (sunrise, day) stay in `src/dev/` until the bake-off section is retired.
2. The stage chooses the mood. Each neon stage gets a `mood` entry: neon-1 is
   `'golden→night'`, neon-2 and neon-3 are `'night'`. The run passes the current
   mood through `backgroundContext.neonMood`.

### Golden hour: rays all the way round

The bake-off sun sends nine rays up and to the right. The new sun is a full
sunburst:

- About 24 rays evenly spaced round the full circle, alternating wide and thin.
  They turn very slowly, around a full turn a minute, so the sky breathes without
  flickering.
- The sun sits a little higher (horizon −40 instead of −18). That way the rays
  pointing down still show between the towers instead of all going behind the
  city.
- The rays are additive, and their alpha fades with distance from the sun, so they
  never wash out the hazard band.
- Before shipping, check the drones, targets and coins against the warm sky. They
  were drawn for a dark one.

### Aurora: halfway through level 1

- The aurora is the bake-off's three sine curtains (mint, ice, violet), drawn in the
  night mood's `skyExtra`.
- In level 1 its strength is 0 until **progress 0.5**, then it fades up over about
  4 s. In levels 2 and 3 it is at full strength from the first frame.
- The aurora draws on the **night** mood: the shipped sky, moon and inks, plus the
  curtains. It does not use the bake-off's candidate D palette, which was a
  different night. If the shipped inks fight the curtains, the aurora night mood
  borrows D's mint wire ink.
- **Cost:** the curtains are about 600 small gradient fills per frame. Bake them
  once into a strip, or draw them at 6 px columns, and measure against the portrait
  budget.

## 2 · The strike (neon-1 only)

- **When:** it is placed on the song clock with `Audio.sfx({ inBeats })`, the same
  way beat cues are. The bolt lands on beat
  `MINOR_TURN_BEAT`, not on the frame the game notices the change.
- **Where:** the bolt lands on the skyline ahead of the hero, at the same place as
  the bake-off (about 0.44 W, 0.43 H).
- **The conversion:** the city goes to night outward from the strike point, using
  `strikeWipeRadius`.
  - During the wipe, both moods are drawn and the night is clipped to a growing
    circle. That doubles the background cost, but only for about 1 s.
  - After the wipe, only the night mood is drawn.
- **Sound:** a thunder crack on the beat. It is a new cue rendered to WAV for
  audition and levelled by RMS against the kick.
- **Retry and rewind:** the mood depends on song position, not on an event that
  "has fired". A retry after the turn opens at night, and a rewind to before the
  turn opens at golden hour. There is no replayed strike and no stuck flag.

## 3 · The Japanese writing

### A · Blade signs: some buildings, one on screen at a time

- The signs hang off real towers in the mid city layer, not at free positions.
  Only a few towers are picked.
- Spacing is enforced in **screen** terms at that layer's parallax, so two signs are
  never visible together. The next sign appears only after the last one has left
  the frame, plus a gap.
- The words rotate through いそげ · しぶや · がんばれ · やまのて.
- Each sign's tube colour takes the current mood's wire ink, so on golden hour they
  read as unlit shop signs that come on with the strike.

### C · Destination board on the train: moved off the windows

Today the board overlaps the windows. At the car height (34 px) the window row
starts about 9 px below the roof, and the 7 px board was drawn from roof+3, so the
board runs into the tops of the windows. **Fix: give the board a pier of its own.**

- On a real E235, the side destination display sits in the solid panel just
  forward of the door. The plan does the same: drop the **first window after the
  door** on each car, and set the board at window height in that gap.
  - The hull stays solid there, and the board never touches glass.
  - The aperture list (`tronCarApertures`) loses that window, so the shell and the
    car painter stay in step automatically.
- The board is narrower than the mock (about 26 px instead of 64). It already
  scrolls, so つぎは しぶや · NEXT · SHIBUYA simply takes longer to pass.
- The alternative is a slim 4 px strip in the band above the windows. That keeps
  every window, but at 4 px the kana become dots, so the plan does not use it.

### D · The platform announcement, once per level

- まもなく でんしゃが まいります。, with the English underneath, appears as a speech
  card when the level's **first** train lands. It never repeats.
- In neon-1 the first train lands at about 0.10 progress, about 9 s in. That is well
  clear of the strike at about 22 s.
- The card plays the JR two-tone. The strike does not overlap it.

### B · Kana floaties

Not adopted. You didn't pick them. They stay in the lab.

### The font

- **M PLUS Rounded 1c**, loaded as a **subset of only the kana the level uses**.
  Google Fonts' `text=` parameter serves a font with just those glyphs. For the
  roughly 40 characters above that is a few kilobytes, not the megabytes of the full
  Japanese face.
  - It loads lazily when a neon stage starts, not at the gate, so the title screen
    and the other cabinets pay nothing.
  - Until the font arrives, the sign draws in the system face. The system face was
    judged acceptable, so a slow network costs nothing visible.
- The LED board uses **DotGothic16** the same way: subset, lazy, and only about 10
  characters.
- The subset strings are generated from the phrase list, so adding a word
  automatically adds its glyphs.

## 4 · Order of work

1. Wire SESERAGI v17 to the cabinet. Add `MINOR_TURN_BEAT`.
2. Promote the moods. Build the 360° golden sun and aurora night. Gallery tiles go
   in the **production** section, and the gallery is archived.
3. Build the neon-1 strike: clock-placed, radial wipe, thunder cue. Then the
   aurora fade at 0.5, with neon-2/3 opening on aurora night.
4. Move the destination board into the pier. Update the train gallery tile.
5. Blade signs with one-on-screen spacing, then the announcement card, then the
   lazy subset fonts.
6. Test portrait, the hazard read on golden hour, and retry/rewind across the turn.
   Then retire the two bake-off lab sections
  .

## Open questions

- ~~Levels 2 and 3 open on aurora night?~~ **Confirmed (23 Sep):** they open where
  level 1 ends — night with the aurora, from the first frame.
- **The strike bar may move earlier.** Nothing else in this plan depends on where it
  lands, as long as it stays after the first train's announcement (about 9 s).
