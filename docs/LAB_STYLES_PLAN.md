# Lab styles: 80s–90s additions and colour families

*8 Oct 2026. Agreed in conversation with Peter, then revised after a design review the same
day. Built so far, all uncommitted: the seven sounds (Phase 0), per-note velocity and the acid
accent prototype (Phase 1, waiting on Peter's ear), and the `makeFlavour()` fix (Phase 4).*

## What we're doing

1. Add five new styles to the Lab: **Acid House, Rave, UK Garage, Techno, Freestyle**.
2. Bring **Boogie** back into the Lab. It is currently in `LAB_HIDDEN` in
   `src/game/banger/make.js`.
3. Add eight new flavours. Peter liked every sketch, so all of them are in.
4. Fold **Italo Disco** into Eurobeat and **French House** into Nu-Disco as flavours. That
   leaves 24 styles.
5. Group the FORMULA list into **families**. Each family has a coloured dot, and the list runs
   family by family. The groups don't have to be fours; the colour shows what belongs together.
   Colours only for now: shapes on the dots and family headings are deferred.

Titles keep the **base style**, not the flavour: `NAME (NU-DISCO/EUPHORIC)` even when the take
played French House (Peter, 8 Oct). The flavour is still saved with every take.

Dropped, and not to be built:

- **Big Beat.** It needs real guitars and real drums.
- **Goa.** Peter didn't care for the sketch.

## Why flavours, not more styles

In the Lab you can't pick a flavour directly. The mood picks it, and there's a surprise chance
that grows with voltage (`labFlavour`). That is the point of flavours. Peter: "I like that they
may be a surprise, that's the whole point of flavours, otherwise we'd just have 50 styles."
So a close relative of a style becomes its flavour, and the style list stays short. With no
flavours at all, this plan would be 42 styles.

Parked for another day: a **MORE** button in the FORMULA (and INFUSION) chooser that lists
every flavour as its own entry, so a player can pick one deliberately. The generator already
takes a named flavour and every take already saves one, so it's mostly chooser work when it
comes.

## The families, in order

Big-Room House and Trance come first, and Chillout Room comes last.

| Dot | Family | Styles (flavours in brackets) |
|---|---|---|
| blue | Festival & Euro | Big-Room House · Trance · Future Bass · 90s Dance · Eurobeat (Italo, Hi-NRG) |
| red | UK Rave | **Rave** (Happy Hardcore) · Drum and Bass (Jungle) · **UK Garage** (Speed Garage) |
| orange | Club | **Acid House** · **Techno** (Acid Techno) · Deep House (Piano House) · Afro House |
| yellow | Latin | Moombahton · Reggaeton · Merenhouse |
| purple | Disco & 80s | Nu-Disco (French House) · **Boogie** (New Jack Swing) · Electro · **Freestyle** |
| green | Synths & Games | Synthwave · 16-Bit · Chiptune |
| white | Chill | Shibuya-Kei · Chillout Room (Trip-Hop) |

Bold names are the new styles and Boogie's return. Flavours that already exist (Drum and
Bass, Reggaeton, Afro House, Synthwave) are kept and not listed.

## The sketches

Peter liked all eight flavour sketches, so every one is built. They are in
`work/auditions/rave-styles/`, and they're the reference for each flavour:

| Flavour | Sketch |
|---|---|
| Acid Techno (Techno) | `acid-techno.wav` |
| Happy Hardcore (Rave) | `rave-happy.wav` |
| Speed Garage (UK Garage) | `garage-speed.wav` |
| Hi-NRG (Eurobeat) | `italo-hinrg.wav` |
| Jungle (Drum and Bass) | `dnb-jungle.wav` |
| Piano House (Deep House) | `deep-house-piano.wav` |
| New Jack Swing (Boogie) | `boogie-newjack.wav` |
| Trip-Hop (Chillout Room) | `downtempo-triphop.wav` |

Italo and French House need no sketch: they are the existing styles, moved (Phase 4).

The new styles' own sketches are `acid-house`, `rave-hardcore`, `garage-2step`,
`electro-detroit` (for Techno) and `electro-freestyle` (for Freestyle). Every sketch was written
from the general idea of its genre, not checked against records. Peter's ear corrects them.

## Musical briefs for the new styles

Different sounds alone won't keep five styles apart: each needs its own way of making a song.
These briefs are drafts taken from the sketches, for Peter to correct. **Lean** is the lowest
energy (`lean` in `tools/lib/banger/energy.js`); what a brief lists under it must still be
there when everything decorative is gone.

**Acid House** (122, light swing)
- *Driven by* one bass phrase that evolves: the notes stay, while the cutoff, the accents and
  the slides change from phrase to phrase.
- *Rhythm:* a 909 four on the floor, off-beat open hat, the clap arriving later.
- *Bass and harmony:* the acid line is the bass. One chord or none (Hypnotic by default), at
  most a single minor-seventh stab answering it.
- *Arrangement:* builds by opening the filter over long stretches, not by risers. A breakdown
  is the line alone with the filter shut.
- *Avoid:* supersaws, chord progressions, pianos.
- *Lean keeps:* the kick and the acid line.

**Techno** (128, swung hats)
- *Driven by* interlocking loops that change gradually: something added, dropped or shifted
  every few bars.
- *Rhythm:* a 909 four on the floor, swung sixteenth hats, a ride later on.
- *Bass and harmony:* a sequenced bass rolling in sixteenths. One minor-ninth shape moved in
  parallel (Chord Memory) over long held strings, with few changes.
- *Arrangement:* long phrases and no festival drop. Tension comes from filter and density.
- *Avoid:* a big melodic hook up front, risers.
- *Lean keeps:* the kick, the hats and the bass sequence.

**UK Garage** (132, heavy swing)
- *Driven by* the gaps: the 2-step kick leaves beats empty and the bass replies in them, with
  the swing deciding where they land.
- *Rhythm:* the kick skipping beat three, snare and clap on two and four, shuffled hats and a
  shaker.
- *Bass and harmony:* a short, bouncing organ bass. Minor-ninth and major-seventh organ stabs
  off the beat.
- *Arrangement:* vocal chops stuttering on the syncopations.
- *Avoid:* a straight four on the floor (that's Speed Garage), long held bass notes.
- *Lean keeps:* the 2-step kick and snare, the swung hats and the bass.

**Rave** (140)
- *Driven by* the hoover riff and the rave stab over a breakbeat riding a four-on-the-floor
  kick.
- *Rhythm:* the kick on every beat, with a programmed break and its ghost notes on top.
- *Bass and harmony:* a deep sub pulsing on a 3-3-2. Minor; the stab is one shape moved in
  parallel (Chord Memory). The hoover swoops between notes.
- *Arrangement:* a breakdown on the stab alone, then the hoover crashes back in.
- *Avoid:* supersaws (Big-Room and Trance), clean pop piano (Happy Hardcore's job).
- *Lean keeps:* the kick, the break, the sub and the stab.

**Freestyle** (116)
- *Driven by* an electro drum machine with Latin syncopation, orchestra hits on the corners,
  and a melodic lead.
- *Rhythm:* a syncopated 808 kick, claps, sixteenth hats, congas and cowbell.
- *Bass and harmony:* a sequenced synth bass in octaves. A dramatic minor walk to the big V,
  with strings holding.
- *Arrangement:* a Pop Song, with orchestra hits marking each section's start.
- *Avoid:* a four on the floor, house piano.
- *Lean keeps:* the syncopated beat, the bass and the lead.

## Phase 0: sounds (done, uncommitted)

Seven MRDR-3 presets in `src/data/voices.js`. Their levels are measured, and pot-coverage and
voice-source pass. `sounds-tour.wav` plays each one on its own.

| Preset | Used by |
|---|---|
| Acid 303, and Acid 303 · Accent | Acid House; Techno · Acid Techno |
| Hoover | Rave |
| Rave Stab | Rave, Techno |
| Organ Bass | UK Garage, Deep House · Piano House |
| Orchestra Hit | Freestyle, Boogie · New Jack Swing |
| Garage Wobble Bass | UK Garage · Speed Garage |

They are all MRDR-3 because the acid line and the hoover play on busy lanes. A busy lane on a
Tone synth (CRLS-1 or RMND-2) keeps costing CPU for the rest of the song.

## Phase 1: acid articulation prototype (do this first)

Acid House stands or falls on accents and slides working together, and right now they can't.

**The catch.** The generator builds extra lanes as independent instruments
(`tools/lib/banger/lanes.js`), and MRDR-3 only remembers the note to glide from within one lane
and one preset. So a slide can never cross from the plain line into an accented note on another
lane, or back. Overlapping the notes doesn't fix it. The sketches dodge the problem: `acid()` in
`work/local/_rave-sketches.mjs` silently drops a slide into an accent.

**The proper fix: per-note velocity.** A song bank stores no velocity at all today; the old
sketches' `${lane}Vel` arrays were never read. Carrying velocity through the song format, and
letting MRDR-3 turn it into an accent (more filter envelope, resonance and level), would put
pitch and accent in one monophonic voice. The worklet version, MRDR-3 AW, already takes a
velocity at note-on. The native MRDR-3 path, which the new presets use, only takes a gain, so
it needs the accent added too, unless the acid presets move to AW. The same change also gives
every style real ghost notes on its drums. Prototype it and size the work:

1. Audition plain→accented and accented→plain slides on one voice.
2. If carrying velocity through the format turns out too large, define the approximation
   explicitly and audition it the same way before building on it.

Whichever way it goes, the accent is a **semantic role** (`bassAccent`), not a fixed `bass2`.
Lane allocation already sorts out competing bass parts.

**Status, 9 Oct: done.** Peter prefers the one-voice version, and a slide into an accent
glides in plain (file 2) rather than restriking it (file 4).
- A lane may carry `${lane}Velocity` (0–1, null = full strength) beside its notes
  (`velocityKey`/`stepVelocity` in `src/engine/lanes.js`). Not `${lane}Vel`: speed, crypt
  and their remixes carry `Vel` arrays nothing has ever read, and reading them would remix
  those songs.
- The scheduler passes it to `playVoice` and the rack (`play` in `src/engine/voices.js`).
  Every instrument hears it as level. MRDR-3 takes it whole: a preset's `velocity` block says
  how much reaches the level (`level`) and how many octaves of filter envelope a soft note
  loses (`filter`). The desk shows them as VEL LEVEL and VEL FILTER on MRDR-3's Humanise
  card. Song files write the arrays as plain numbers.
- Acid 303 is now the accented note with `velocity: { level: 0.4, filter: 2.6 }`, so plain
  notes are struck at about 0.62.
- A slide is a hand-over, never a strike: a slid-into accent keeps the envelope already
  running (Peter's pick, 2 over 4).
- `tests/note-velocity.js` covers it; songs without velocity render identically.
- Renders: `work/auditions/acid-accent/` (`work/local/_acid-accent-proto.mjs`) — the old
  two-lane way, one voice with velocity, and one voice under the acid-house drums.
- Not yet: the desk's piano roll and bar tools don't show or move velocities, and MRDR-3 AW
  (the worklet A/B backend) hears velocity as level only.

**Also done ahead of Phase 4:** `makeFlavour()` now lets a flavour keep its own progressions,
mode harmony and moods. The eight existing flavours build byte-identically, and
`tests/banger-flavours.js` checks the new behaviour.

## Phase 2: generator additions

1. **An acid bass pattern.** Sixteenths with rests and octave jumps, with slides and accents
   per Phase 1.
2. **Slow movements, reusable.** A few bounded shapes across phrases or sections: open, close,
   rise-and-fall, stepped. Not only one long sweep up, and not only for acid. Each movement
   belongs to its part.
3. **Ownership under INFUSION.** A part's movement and expression travel with that part, so an
   acid bass keeps its sweep when its style is the groove in a fusion. New roles need owners
   too, not just new recipe keys in `FUSION_KEYS` (`styles/fusion.js`): `bassAccent` follows the
   bass, and ghost notes follow the groove.
4. **Chord Memory as a harmony technique, not a mood.** An internal recipe setting that moves
   one chord shape in parallel, used by Rave and Techno, with no Lab control. That way a dark
   mood and a bright one can both use it. Right now `sections.js` voices each chord to the key.
   The sound is in the `electro-detroit` and `rave-hardcore` sketches.

**Status, 9 Oct: built; waiting on Peter's ear** (`work/auditions/lab-phase2/`, made by
`work/local/_phase2-auditions.mjs`).
- Parts carry `vels`, and every part helper keeps them (`withVels` in `theory.js`); `packBank`
  writes `${lane}Velocity`.
- The **Acid** bass figure (`theory.js` `acidLine`, `acidMarks`, `acidBar`): one line per take
  from its own random stream (`rng.acid`); accents and slides redrawn every eight bars; the
  second bar of each pair turns its last four steps round.
- **Filter moves** (`fx.js` `filterMoveSections`): `filterMoves: { role: { shape, lo, hi, Q, over } }`
  with open, close, riseFall and stepped, per section or per phrase, never over a build. A split
  key in fusions, so each move follows its part.
- **Chord Memory** (`theory.js` `voicing({ memory })`, `chordMemory` on a recipe): the main chord
  part plays one shape on every root and is kept out of voice leading.
- Existing takes are unchanged: 290 takes across every style and flavour hash the same before
  and after (`work/local/_banger-hash.mjs`).
- Draft **Acid House** and **Techno** recipes exist so the features can be heard; both are hidden
  in the Lab (`LAB_HIDDEN`) until Peter approves them. Two more 303s for Acid House's Random bass:
  Acid 303 · Square and · Deep.

**Later, its own track:** more phrase behaviour for every style — recurring patterns with
occasional turnarounds, bass replies, selective drum drop-outs, and controlled changes every
few bars. It would help all 24 styles, but it doesn't block the new ones.

## Phase 3: the five new styles

**Status, 9 Oct: built, hidden in the Lab, waiting on Peter's ear** (`work/auditions/lab-styles/`,
made by `work/local/_style-auditions.mjs`: each style from a sparse hook at its own energy and a
busy hook at Maximum, plus Deep House Moody and Afro House Dark with Chord Memory). Recipes,
sounds rows, seeds, level references (spliced for the five only), Lab descriptions, bass rolls,
LED slogans, energy and production profiles, desk choices and `docs/MAKE_A_BANGER.md` are done.
Rave's break uses ghost notes (`g` in a pattern). Deep House and Afro House now take Chord Memory
by mood (generator v10) — Peter asked for both. Every existing take outside those moods hashes the
same as before.

For each of Acid House, Rave, UK Garage, Techno and Freestyle, follow its brief and do the same
set of steps the Latin and pop styles took:

- Write `tools/lib/banger/styles/<id>.js` and register it in `styles/index.js`.
- Add its row to `tools/lib/banger/sounds.js`. Write it through the page's serialiser
  (`soundsSource(tidyTable(T))`); hand-formatted entries fail the source test.
- Add it to the desk's report choices in `tools/desk.js`.
- Add its production and energy profiles in `tools/lib/banger/production.js` and `energy.js`.
- Add its level refs and curves: `node tools/banger-levels.js refs`, then `curves`.
- Make its seed song: `node tools/banger-seeds.js make <id>`.
- In the Lab: add a `STYLE_DESCRIPTIONS` line in `make.js`, bass rolls, and LED slogans in
  `led-slogans.js`.
- Write its section in `docs/MAKE_A_BANGER.md`.
- Give every new recipe key and role an owner in `styles/fusion.js`; `tests/banger-fusion.js`
  fails on a key with none.

Rules that carry over:

- Never put CRLS-1 or RMND-2 on a busy lane.
- Never name a real record or artist in any text a player or the desk sees.

## Phase 4: flavours, Boogie, and the Italo/French House migration

**Status, 9 Oct: built, waiting on Peter's ear** (`work/auditions/lab-flavours/`, made by
`work/local/_flavour-auditions.mjs`, each flavour in a mood that picks it). The eight flavours are
real flavours with sounds rows and seeds. **Italo Disco and French House were done differently from
the plan below:** rather than re-expressing their recipes as overlays, the Lab treats each as a
*whole style played as a flavour* (`STYLE_FLAVOURS` in `make.js`) — a take that lands on Italo is
made as Italo Disco itself, so nothing about either can drift, saved songs need no mapping, and the
desk keeps both as styles. `tests/banger-flavours.js` proves a Lab take on Italo is the same samples
as an Italo Disco take. Takes kept before their style had flavours stay the style's own
(`FLAVOURED_SINCE`). The `makeFlavour()` fix below is in anyway.

- Each of the eight new flavours gets an entry in its style's flavour list (`flavours.js`), its own
  sounds row `<style>-<flavour>`, and its own seed (`banger-seeds.js make <style>-<flavour>`).
  Tests are in `tests/banger-flavours.js`.
- Take `electro-funk` out of `LAB_HIDDEN`. New Jack Swing is its flavour.

**Italo Disco → Eurobeat · Italo, French House → Nu-Disco · French House.** Treat this as a
musical migration: both have to keep their identity.

- **Fix `makeFlavour()` first.** It lays the flavour's recipe on, then rebuilds progressions,
  mode harmony and moods from the base style, so a flavour's own versions are silently thrown
  away. Italo would end up on Eurobeat's chord walks. Let a flavour keep its own.
- Re-express each current recipe (`styles/italo-disco.js`, `styles/french-house.js`) as an
  overlay. Move their sounds rows, seeds and level refs to the flavour ids. Take both off the
  style list and out of `LAB_STYLE_ORDER`.
- **Compare before and after** on fixed seeds and hooks: defaults, tempo, arrangement, energy
  behaviour and production settings, as well as sounds.
- **Map old ids explicitly** to their flavour wherever a saved one can appear, `recipe.style`
  and `recipe.infusion` included. Never let an old id be re-rolled as Eurobeat or Nu-Disco, or
  it could come back as a different flavour.

## Phase 5: the Lab

**Status, 9 Oct: done.** `LAB_FAMILIES` in `make.js` sets the order and each style's family; the
FORMULA and INFUSION choosers draw a coloured dot by every name (`drawFamilyDot` in `maker.js`).
The five new styles and Boogie are in; Italo Disco and French House are hidden (flavours). Checked
in the real game in landscape and portrait: all 24 fit (`work/local/lab-families/`).

**Families.**
- Add a `STYLE_FAMILIES` map in `src/game/banger/make.js` (style id → family), with one colour
  per family. Pick colours that read on the chooser's dark plate.
- Draw the dot just left of each style's name in the FORMULA and INFUSION choosers
  (`drawChooser` in `maker.js`), where the MOOD PAIR mark already sits.
- Set `LAB_STYLE_ORDER` to the family order above.
- The jukebox uses the same order. Whether it shows dots too is Peter's call.

**Titles stay as they are.** `NAME (STYLE/MOOD)` (`bangerTitle` in `store.js`) keeps the base
style. Every take since 6 Oct saves its flavour (`recipe.flavour`, and `recipe.infusion` for the
infusion's), and BOLT keeps it on a re-roll, so showing it later is display work only. Takes
saved before 6 Oct carry no flavour: theirs is worked out from seed, mood and voltage under
today's rules. That's a couple of days of Peter's own takes, and nothing to fix.

## Phase 6: checks

- **Record the test baseline before starting.** Run the banger suites (`banger`,
  `banger-flavours`, `banger-fusion`, `banger-production`) and `tests/voices.js`, write down
  exactly what fails, and require no new failures. Don't rely on an old count:
  `tests/voices.js` was failing in other sessions' presets on 8 Oct.
- **A fixed audition set** instead of one song per style, so a lucky seed can't hide a weak
  generator: the same two hooks (one sparse, one busy) across every new style and flavour, three
  seeds each, Lean against Maximum, plus a few representative INFUSION pairings.
- Drive the Lab in the real game (`__mash_cur.openMaker()`) in landscape and portrait, and check
  the dots and the order.
- Run a whole-song CPU bench for each new style. The acid line and the hoover are the busy
  lanes to watch.
- Peter listens to the audition set before a style or flavour is called done.
- Later, if listening shows a need: weight which surprise flavour a mood draws. Voltage would
  still decide how often a surprise happens; the weights would decide which ones fit.
