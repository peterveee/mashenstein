# MAKE A BANGER

A whole arranged song made from a few bars of another one. The song the bars came from
is not touched: the banger is a new song, it opens on the desk, and it plays.

## Where it is

- **Right-click a bar selection** on the timeline. *New Song From These Bars* → **Make a
  Banger…** uses the selected bars as the riff.
- **The Song Desk drawer**, under New song: **Make a Banger…** uses the selection, or the
  first four bars if nothing is selected. **Banger Sounds…** beside it opens the Banger
  Sounds page (below) through the desk launcher.

Every banger is saved in its own folder, `work/bangers/`, and listed on its own shelf in
the drawer's songs list: **Bangers**, just above Scratch songs. (Bangers made before 2 Oct
2026 sat in `work/scratch/`; the desk moves them into `work/bangers/` the first time it
starts with this change.)

The riff is **1 to 8 bars**. For a longer selection, the dialog starts on its first four
bars and you can change *From Bar* and *To Bar*. The riff is read the way the desk
hears it: unsaved edits are included, and muted or soloed-out tracks are left out.

## The dialog

The quick row has the choices you make every time:

| Control | What it does |
|---|---|
| Style | The recipe. **Big-Room House** (128, the ABSOLUTE ZERO shape: pumping supersaws, off-beat bass), **Trance** (138: a rolling sixteenth bass, trance-gated supersaws, a long breakdown with the hook on a piano; Uplifting and Long by default), **Future Bass** (140 at half time: hat rolls, an 808 under a talking wobble, stuttered supersaws, a full-time second drop; Euphoric by default) or **Eurobeat** (155, HAIRPIN's shape: four on the floor, an octave bass in eighths, strings, brass stabs, the razor lead doubling the hook; Anthemic by default) or **Chipstep** (140, CHIPSTEP's shape: chip-house builds on an octave square bass, a half-time first drop with a wobble, full-time drops after it with the wobble stuttering, a Game Boy snare) or **Kraftwerk** (120, and not a banger at all: no build, riser, roll, crash or pump — its own 128-bar form, a part joining or leaving on each eight-bar block: a lone arp, the motorik kit, the piston bass, the hook on an analog lead, then a vocoder, an isolated breakdown, everything back at once, and a step-by-step power-down) or **Synthwave** (118, NIGHT DRIVE's outrun: a gated-reverb snare, a root–octave sixteenth bass, a string machine pumping, brass stabs, pre-chorus and chorus, the last chorus a whole step up). Picking a style resets every switch under More Options to that style's defaults. |
| Mood | Anthemic, Uplifting, Euphoric, Moody or Dark. Mood picks the chord progression, the chord colours (Moody uses sevenths, Uplifting adds ninths) and how bright the hook is. |
| Mode | **Keep**, **Major**, **Minor**, **Dorian** (minor with a raised 6th: bright, groovy), **Phrygian** (minor with a flat 2nd: dark, menacing), **Harmonic Minor** (minor with a raised 7th: dramatic, a big V), **Mixolydian** (major with a flat 7th: rocky, open) or **Lydian** (major with a raised 4th: dreamy, floating). Each mode brings its own chord walks, built on the chord that makes it (dorian's IV, phrygian's flat II, mixolydian's flat VII …), and its turnarounds land there instead of on the dominant. Each mode has a **bright** walk (leaning on its major chords) for Anthemic, Uplifting and Euphoric, and a **dark** one (leaning on its minor chords) for Moody and Dark, so the mood still steers the chords. The list marks which modes **suit** the chosen mood and which **fight** it — Dark suits Minor, Phrygian and Harmonic Minor and fights Major and Lydian; Euphoric suits Lydian and Major — and Surprise Me always rolls one of the modes that suit. Any mode can still be picked with any mood. |
| Riff Notes | Shown when Mode is not Keep. The banger stays on your riff's own home note either way — to move a finished banger higher or lower, select all its bars on the desk and use **Transpose**. **Keep As Written** (the default) never moves a note: the mode is in the chords — the mode's own wherever your riff sits on them, and your riff's own chords borrowed wherever it plays the note the mode changes, so nothing clashes. **Fit to the Mode** moves your notes into the mode, degree by degree — an A-minor riff in Dorian has every F raised to F♯ — so the riff itself takes on the colour. The readout says how many notes would move. |
| Length | Short (48 bars, about stage length), Medium (64 bars, two minutes at 128), Long (112 bars), or Custom (24–256 bars, in fours). |
| Tempo | The style's own tempo (128), the source song's, or a number you type. |
| Variation | **Faithful** keeps your notes exactly and varies only the setting: octaves, instruments, harmony, half speed. **Some** also moves the riff up the scale and turns the phrase ends round. **Wild** also develops fragments, shifts the rhythm by an eighth, leaps at the peak and adds a counter-line. |

Nothing ever turns the melody upside down. Peter turned that down for the remixes, and
the generator has no operation that could do it; the tests check this.

The readout line shows:

- what the riff is: how many bars and parts, and what key it reads as;
- which part is the **hook**: Auto picks the busiest melodic part, and you can choose
  another;
- the length and tempo the banger will come out at.

If those bars cannot make a banger (drums only, or more than eight bars), Make It is
switched off and the readout says why.

**Surprise Me** rolls the mood, a mode that suits it, the riff notes, the variation and
the tempo; flips each spice switch (percussion, extra layers, intro and ending FX, half
time, false ending …) about one time in four; re-rolls the key lift one time in four;
gives the riff a new sound (Riff Sound = Random) two times in three; and changes the backbone's sound — the kit, off-beat or rolling bass, supersaws or
piano or pad — one time in three. It never changes the style, the bars, the length or the
form, and never takes the backbone away: there is always a kick, a bass, chords, the
rolls and the riser.

### More Options

| Group | Switches |
|---|---|
| Form | Style's Own Form · Intro · Build in Layers (Off, Long Songs, Always) · Drums & Bass Intro · Build · Breakdown · Second Drop · Double Drop · Key Lift (none, half step, whole step, major third) · Hard Stop · False Ending · Half-Time Switch · Outro |
| Drums | Source Drums (Keep and Add / Replace / Keep As-Is) · Kit (Style, Studio, 909, 808, DS, CR-78) · Crashes · Fills · Snare Rolls · Impact · Shaker · Tambourine · Congas · Cowbell · Ride |
| Bass & Chords | Bass (Off-Beat, Rolling 16ths, Sub Only, None) · Sub Layer · Chords (Pumping Supersaws, Piano Stabs, Pad, None) · Square Double · Bell Octave · Octave Hook · Third Below · Arp · Choir · Counter-Melody · Riff Sound (Keep / Random) |
| FX | Riser · Filter Build · Stutter Before Drop · Sidechain Pump · Delay Throws · Low-Pass Intro · Bitcrush Intro · Tape-Stop Ending |

**Build in Layers** turns the intro into a build-up: the parts arrive one at a time, a few
bars apart — on a banger the kick alone, then the rest of the kit, the bass, the chords and
the arp, and the hook with its doubles last — and the outro takes them away again, last in
first out, down to the kick. Then the build and the drop as ever: build everything up, then
drop. **Long Songs** does it only on a song longer than Medium (more than 64 bars): on 48
bars there is no room for a build-up. **Always** does it at any length, closing the layers
up on a short song rather than losing them. The layers come a power-of-two number of bars
apart; whatever room is left over, the first layer plays alone. A style can name its own
order (`layers`).

**Drums & Bass Intro** opens on the beat and the bass alone, then everything comes in at
once — Pocket Calculator's way in. Where Build in Layers applies, it wins.

**Style's Own Form** plays the style's own arrangement, bar by bar, in place of every other
Form switch (only Key Lift still applies). Only Kraftwerk has one so far; on any other
style the switch does nothing. A script (`script` in the style file) is a list of sections,
each a run of blocks — `[bar of the section, the parts that play from it, extras]` — so a
part joins or leaves only on a block. It is written at its own length (Kraftwerk's at 128
bars); any other length scales every section and block in proportion, in fours from 56
bars and in twos below, the difference going to the section marked `grows`. The parts a
block can name: `arp`, `sonar`, `kick`, `snare`, `hats` (sixteenths, accented — the eighths
on HATS, the ones between on HATS SOFT a step down, since a bank holds no velocities),
`rim`, `bass` (and its sub), `lead` (the hook and its Square Double), `vocoder` (the hook
sung; an octave under the lead when both play), `word` (the vocoder repeating the phrase's
first note in eighths), `counter` and `chords`. A part switched off under More Options
stays off. The extras: `echo` (an eighth-note ping-pong over the block), `filterDown` (a
low-pass closing a step a bar, 5 kHz to 250 Hz), `fadeOut` (down to −40 dB across the
block) and `end` (the last bar's second half left to one dry low pulse on the tonic).

A drop straight after either intro (no Build) keeps every part from its first bar, so
nothing drops out again.

Every switch combines with every other, and a style only sets where they start: layers then
a build then a drop is a club track; drums and bass into the theme with the riser, the
rolls, the crashes and the pump off is Kraftwerk.

The drop is always in; it is what a banger is for (Kraftwerk calls it the Theme). A riff with no drums gets the whole
kit. A riff with drums:

- **Keep and Add**: a busy riff kick, backbeat or hat (two or more hits a bar) stands in
  for the kit's own, so there are never two kicks. The kit adds what the riff lacks, and
  the riff's other drums (a rim, a tom) carry on.
- **Replace**: the kit only.
- **Keep As-Is**: the riff's own groove, plus the transitions (crashes, rolls, impacts).

**Riff Sound** decides what the riff's own parts sound like.

- **Keep** (the default) plays them on the source song's presets, with their EQ, pan,
  sends and effects.
- **Random** gives each tuned part a new preset. It is random only within the style's
  shortlist for that part's job — the **Random Shortlists** on the
  [Banger Sounds page](#the-banger-sounds-page), seeded with sounds the cabinet remixes
  already used and kept.
  - The hook draws from grands and electric pianos, bells, squares, the screamer and
    mega saw, brass, and the crystal pluck.
  - A bass part draws from basses (Reese, detuned, FM…).
  - A chord part draws from supersaws, strings, pads and choirs.
  - A Moody or Dark banger skips the cute ones (music box, celeste) — each mood's skips
    are on the page too.
  - A busy part never lands on a CRLS-1.
  - No two parts get the same sound.
  - The source's insert effects stay behind with the old sound; the EQ, pan, sends and
    note FX stay with the part.
  - Drums keep their sounds; the **Kit** switch is how the drums change.
  - The pick follows the seed, so a take re-made from its recipe sounds the same and
    Another Take rolls new sounds.

**The drum sounds** come from a fixed set, not a random one (the page's **Drum Kits**).

- The **Kit** switch picks it:
  - **Style Kit** is ABSOLUTE ZERO's: 909 Punch kick, DS snare, Big Room clap, DS closed
    hat, 909 open hat, 808 long crash, 909 fill toms.
  - **Studio**, **909**, **808**, **DS** and **CR-78** are the step sequencer's kits, with
    the style's crash and fill toms wherever a kit has none.
- The impact (Deep Pew), the percussion (shaker, tambourine, conga, 808 cowbell, 909 ride)
  and the noise riser are the same in every kit.
- A riff drum that stands in for the kit keeps its own sound.

The dialog remembers your last settings, except the bars.

## The Banger Sounds page

```
npm run banger-sounds        # http://localhost:8022/  (also on the desk launcher)
```

Every sound a banger is made with lives in one table, `tools/lib/banger/sounds.js`, and
this page edits it. Pick a style, then:

| Section | What it holds |
|---|---|
| Test Banger | A banger made with the table as it stands on the page, saved or not: a riff (the built-in frost hook, or bars of any cabinet or theme), mood, variation, length, kit, Riff Sound, seed. Play it, change a sound, play it again. |
| Parts | One preset for each part the generator writes — bass, sub, the hook doubles (square, busy-hook square, bell, mega saw, third below), arp, counter-melody, choir, saws, pad, piano stabs, impact, percussion, and the riff fallback. |
| Drum Kits | Kick, snare, clap, hats, open hats, crash and fill toms for the Style Kit and the five step-sequencer kits. A kit may leave a drum out; the Style Kit's plays there. |
| Random Shortlists | What Riff Sound = Random may give the riff's hook, counter, bass and chord parts. A hook down in the bass register *is* the bass, so it is re-voiced from the bass list. The growly basses (Reese, Monster) are off the bass list; choose one deliberately if you want it. |
| Moods | Per mood, any part swapped (Dark → a Reese bass) and sounds skipped from the Random lists. Anything not overridden is the style's own choice. |
| Never Use | Presets no banger in this style may use. On a Random list it simply wins; a part or kit naming one is a problem to fix before Save. |
| From Your Songs | Every preset the songs on disk use, with how many songs use each — Remixes & Alternates and Saved Copies ticked by default, game songs, scratch songs, style auditions and MIDI imports a tick away. ▶ auditions it; **Use As…** puts it in any slot or shortlist the rules allow. Make more remixes on the desk and they show up here. |

Every dropdown offers what the rules allow in that slot — its usual category first — and
lists the rest shut, with the reason. Every ▶ plays the sound in its real job: two bars in
A minor at the style's tempo, through that part's own channel strip, with a quiet beat
under it (untick **Audition with a beat under it** to hear it alone).

**The rules** (`tools/lib/banger/sound-rules.js` — one rulebook for the page, the
generator and the tests):

- Blocked outright:
  - a song's own preset copy, or a name for a lane's built-in sound;
  - an engine preset (it plays nothing on the layer tracks a banger's parts use);
  - a drum on a tuned part, or a tuned sound on a drum part;
  - a CRLS-1 on a busy part (more than eight notes a bar: the bass, the arp, the hook
    doubles);
  - a JMJR-4 speech synth on a Random list;
  - a wobble or a growl (WUB …, … Growl) as the **main** bass, chosen or Random. It is
    too much to stand a banger on, though it can still be a layer, like future bass's
    WOBBLE;
  - anything on the never-use list.
- Allowed with a warning: a CRLS-1 on a Random list (a busy riff part skips it), a sound
  outside a Random job's usual categories.
- Frozen starter presets (the sub's Sub Sine) are allowed: they are library sounds frozen
  so nobody can change them under a generator.

**Save** writes the table, and refuses a table that breaks a rule or a page that loaded
before the file last changed (several sessions share the tree — reload and redo the
change). Revert throws the page's changes away. A Save needs no restart anywhere: the
desk rebuilds its page, and so picks the new table up, on the next refresh.

## Tuning a style on the desk

The Banger Sounds page chooses the sounds; the desk is where you hear them in a whole song.
Four tools join the two.

### Seed bangers

Each style has a **seed banger**: the style laid out to be tuned, with every part switched
on (the percussion, the third below, the counter-melody, the choir, …). The seven are on the
**Style Seeds** shelf of the desk's songs. They are tracked songs
(`src/data/imported/banger-seed-<style>.js`), so they can't be deleted from the desk.

1. Open a seed and tune it in context: swap the drum sounds, try other presets, edit a
   patch in the voice editor, ride the faders, change the EQ, sends, inserts and master.
2. Press **Use as Style…** in the drawer (it saves the seed first). It takes the seed's:
   - **sounds** into the style's sound table (what the Banger Sounds page edits);
   - **channels** (fader, pan, EQ, sends, inserts, note FX) and the **master** into
     `tools/lib/banger/channels.js`, over the recipe's own;
   - **balance**: new bangers' faders are matched to the seed from then on.
3. Reload the desk, and new bangers in that style start from the seed.

The chords' gate and the hook's exciter are switches of their own (Sidechain Pump, the
mood), so their settings are taken but they are never doubled.

**A patch you edited on the seed is kept.** Use as Style saves it as a library preset of
its own, named for the style and the part (for example "Wide Detune · Eurobeat", id
`seedEurobeatBass`), and measures it the way the voice editor's Save as New does. Using the
style again updates that same preset rather than adding another.

Patterns are not tuned this way: drum grooves, bass rhythms and chord walks are the
recipe's (`tools/lib/banger/styles/`).

A seed can be made again from the recipe (its tuning is lost):

```
node tools/banger-seeds.js make eurobeat --force
```

### A/B with the remix

On a seed whose style was copied from a remix, **A/B with HAIRPIN** (or SNOW GLOBE,
ABSOLUTE ZERO, CHIPSTEP or NIGHT DRIVE) flips between the two songs. Each keeps its own place, and the second plays
on if the first was playing.

### Sound Combos

**Save as Combo…** on any banger, seed or not, keeps its sounds, channels and balance under
a name ("Icy Anthem"). The same name again saves over it. Edited patches are kept as
presets of their own here too (`comboEurobeatIcyAnthemBass`).

In Make a Banger, **Sounds** offers the style's own sounds or any of its combos. The
choice only appears once the style has a combo. The Banger Sounds page's Test Banger has
the same choice.

```
node tools/banger-seeds.js combos                         # list them
node tools/banger-seeds.js delete-combo eurobeat icy-anthem
```

### Open on the Desk

The Banger Sounds page's Test Banger has **Open on the Desk**. It writes the test banger,
unsaved sound choices and all, as a banger of its own (on the Bangers shelf) and opens it
on the desk. Tune it there, then Save as Combo, or carry what you learned back to the page.

### The Banger Levels report

On the desk launcher, under AUDIO REPORTS, **BANGER LEVELS** makes test bangers in the
ticked styles and renders each channel alone. For each channel it shows how far the
channel lands from the part it is matched to, before levelling and after. After you use a
seed as the style, that part is the seed's. With **+ FIT**, each channel's average miss
is folded into the levels.

## Takes

A banger shows four extra buttons in the drawer's *This song* section:

- **Another Take** re-rolls the same settings with a new seed, into the same song.
- **Previous Take** and **Next Take** move between takes. Each appears only when there is
  a take to go to.
- **Banger Settings…** opens the dialog on this banger's recipe. Its riff is fixed;
  **Make a New Take** writes the result as the next take.

A take is never lost. Before a take is replaced, the whole file (music, mix and all) is
kept as `work/mix-history/banger-<id>-take-NNN.js`, and Previous Take puts it back byte
for byte. If you have unsaved changes on the desk, the desk asks before replacing the
take, because unsaved changes are not in the file. A take you have mixed and saved keeps
its mix. Deleting the song deletes its takes too.

On the deployed desk, which has no server, a take is kept as its seed and re-made when
you come back to it.

## What a banger is made of

The full form is ABSOLUTE ZERO's:

1. intro (the riff as written)
2. build
3. drop (two eight-bar phrases)
4. breakdown (the hook at half speed over a tonic pedal, with rootless ninths)
5. build
6. drop two
7. stop
8. lifted drop three
9. outro

Medium is exactly that. Short drops the outro and shortens the rest. Long grows the drops
and the breakdown.

Inside a drop, each eight-bar phrase plays the hook its own way. At Some, a one-bar riff
goes as written, a third up, as written, a fifth up, …, then a turnaround onto the
dominant, exactly as ABSOLUTE ZERO's drop does. Layers join phrase by phrase:

- the plain square double;
- the bell an octave up;
- percussion;
- then the arp;
- drop two adds the mega saw;
- the final drop adds the choir, the hook in octaves and the ride.

No two phrases sound the same, even at Faithful.

Chords suit the notes, never the other way round. The mood's progression is used wherever
the hook sits on it; otherwise the chord that fits the hook wins. A riff that changes
chord on the half bar (FIELD SERVICE's Am→F arpeggio) gets both chords.

**The mix** is ABSOLUTE ZERO's mix block, including Peter's edits:

- the multiband master;
- an exciter on the hook;
- the loud square double;
- a punchy snare;
- the riser at −2.7 dB with big reverb;
- supersaws pumping on every beat.

**The riff's own parts** keep their own sounds and channel settings. They are labelled
`RIFF …`, and the hook is `RIFF … · HOOK`.

**The FX** are written as the desk's own automation, so every one is visible and
editable afterwards:

- filter sweeps on the music through each build;
- a snare roll that fades up;
- a master Stutter roll on the last beat before a drop;
- hard-stop cuts;
- delay throws;
- the tape stop.

### Trance

The same shape, played the trance way:

- **138 BPM**, Uplifting and **Long** by default — an 8-bar intro, 24-bar drops and a
  **16-bar breakdown** (Medium keeps the long breakdown and gives up length elsewhere).
- A **rolling bass** — the kick on the beat, the bass on the three sixteenths after it —
  on a sequencer bass (Night Sequence).
- **Trance-gated supersaws**: chords chopped in sixteenths rather than pumped on the beat.
- **The breakdown** plays the hook as written on a bright piano, over wide ninth chords;
  the full supersaw lead takes it back in the drops.
- Its own chord walks per mood (the epic i–VI–III–VII in minor), a pluck arp in threes
  against fours, a longer reverb.

Its sounds are their own entry in the sounds table, editable on the Banger Sounds page
like big-room's.

### Future Bass

Kawaii future bass, the way SNOW GLOBE plays it:

- **140 BPM at half time**: the kick on the one and the "and" of two, the clap on three,
  hat rolls on the second bar of each pair. **Drop two goes full time** (four on the floor).
- **Stuttered supersaws**: the chords chopped in eighths.
- An **808** (long notes on the one and the "and" of two) under a **talking "yoi" wobble**
  answering in its gaps; the hook doubled by a vowel chop, a music box an octave up.
  Under a riff that is itself the bass there is no 808, so the wobble is left out too;
  it is a layer, never the whole low end.
- **The breakdown** is a bright pop grand playing the hook as written.
- The riff's own drums are **replaced** by default, because a backbeat on two and four
  would undo the half time (Source Drums brings them back).
- Sevenths and ninths throughout; Euphoric (the royal road, IV–V–iii–vi) by default. For
  SNOW GLOBE's full kawaii sound on a minor riff, pick Mode = Major and Riff Notes = Fit.

### Eurobeat

Initial D racing music, the way HAIRPIN plays it:

- **155 BPM**, four on the floor, off-beat open hats, sixteenth hats, Simmons tom fills.
- An **octave bass**: root and octave in eighths under everything (Rolling 16ths plays the
  octave in sixteenths). No sub, and no pump — eurobeat drives.
- **Strings** hold the chords; the **razor lead** (Sync Razor) doubles the hook; a **grand
  an octave up** joins from the second phrase.
- **Brass stabs**: triads on every off-beat eighth (the Counter-Melody switch, on by
  default here — in the other styles it is a new line in the hook's rests).
- Dramatic minor walks (Anthemic is Em G C D: i–III–VI–VII); the breakdown is the hook on
  a piano; the last drop goes up a whole step.

### Chipstep

Chip-house into dubstep, the way CHIPSTEP plays it:

- **140 BPM**. The intro, the builds and every drop after the first are **four on the
  floor**, with an **octave square bass** in eighths (Rolling 16ths plays the octave in
  sixteenths).
- **The first drop is half time**: the kick on the one and the "and" of two, the backbeat
  on three, eighth hats. A **wobble** (WUB Classic) holds each chord and the square bass
  hits only with the kick. In the full-time drops the wobble **stutters on the off-beats**
  instead.
- **The kit is chip**: a click-top kick, a Game Boy snare for the rolls, a 909 crack on the
  backbeat (the strip is BACKBEAT), six-bit hats, a **zap** on every drop, 909 tom fills.
  No shaker.
- **The hook**: doubled by a pulse, a square an octave up, the **arcade chorus** a third
  under it from drop two (Third Below, on by default here), a screamer an octave up at the
  peak, square arps through the chords.
- PWM chords pumping on the beat; the breakdown is the hook at half speed on its own sound.
- Anthemic walks CHIPSTEP's own Am F C G, two chords a bar. The riff's own drums are
  **replaced** by default, as in future bass, so the half-time drop stands.

The half-time first drop is the recipe's `halfTimeUntil` (future bass's `fullTimeFrom` the
other way round): the drops before it play its `drums.halfTime` and `rhythms.halfTime`.

### Kraftwerk

Kraftwerk — the melodic side of The Man-Machine and Computer World — and not a banger at all:

- **120 BPM**, dry, straight, the riff kept as written (Faithful) and an Uplifting walk by
  default. Its defaults switch off the Build, the Double Drop, the Key Lift, the Hard
  Stop, the riser, the snare rolls, the crashes, the impact, the fills, the pump, the
  stutter, the filter build, the delay throws and the chords.
- **Its own form** (Peter's re-model brief, 2 Oct 2026; Style's Own Form, 128 bars by
  default). Nothing is announced by a riser or a crash: parts simply arrive and leave on
  eight-bar blocks.

  | Bars | Section | What happens |
  |---|---|---|
  | 1–16 | Ignition | A lone sixteenth arp, high and dry, bouncing left and right; a low-passed sonar ping on the chord's root every two bars from 9 |
  | 17–32 | Motorik | The kick at 17 (no sub under it); the noise snare on two and four and sixteenth hats accented 100/75 at 25 |
  | 33–48 | Engine | The piston bass in rigid eighths at 33; the hook on a warm triangle analog lead at 41 |
  | 49–80 | Voice | The vocoder sings the hook at 49 (the lead stands aside); counter-arps under it and rim clicks on the off-beats at 65 |
  | 81–96 | Isolation | Kit, bass and sonar gone: the vocoder and the arp alone in an eighth-note ping-pong; from 89 the vocoder says one word — the phrase's first note — in eighths |
  | 97–112 | Full Power | Everything back at once, no swell: kick, bass, kit, arps, the lead and the vocoder an octave under it |
  | 113–128 | Power Down | Kick and bass out at 113; the lead and vocoder fade across 121–124 over the arp and the kit; the kit stops at 125 and the arp closes down a step a bar to one dry low pulse on the tonic |

  Short, Medium, Long and any custom length play the same seven sections, scaled.
- **The sounds**: a Simmons kit (kick, noise snare, metal hats), Clang Rim clicks, a
  Classic Mono piston bass, a Crystal Trigger arp, a Sine Tone sonar, a Triangle Tone lead,
  Square Tone counter-arps, BEST Robot Vox for the vocoder and its word. The sonar, the
  vocoder and the rim are Kraftwerk's own slots on the Banger Sounds page.
- **Style's Own Form off**, it is the switch-built form: four bars of drums and bass (the
  Drums & Bass Intro), then Theme, Interlude, Theme 2, Outro — or, on a **Long** song,
  layers in and out (the beat, the bass, the backbeat, the chords, the hook with its
  doubles). The Minimoog line there is the same piston eighths, and with Chords off there
  is no string machine unless you switch one on.
- No seed remix: its channels are set by hand, like trance's. The soft hats, rim, sonar,
  vocoder and word have no reference parts yet, so their faders are the style's own.

AUSSENDIENST's blips and Casio pi-po were tried and taken out: they are drums at a fixed
pitch (the Ping is always an A), so under a riff in another key they clash, and loops
lifted from one song's hook are clutter under any other. Chipstep's blip fills went for the
same reason. The sonar is tuned — the chord's root — so it is never in the wrong key.

What it cannot do yet: the robot or vocoder saying actual words (a JMJR-4 speaking preset
needs its phrase compiled, which the generator cannot do in the page). The Isolation's
"word" is the vocoder chanting one note.

A style's section names are its own (`sectionLabels`: Theme, Interlude; a script names its
own), and so is when its parts join a drop (`enter`, by phrase: a banger's bell and counter
from the second, its arp from the fourth).

### Synthwave

Outrun, the way NIGHT DRIVE plays it — built from our own remix and our style notes, so
correct it by ear:

- **118 BPM**, straight and driving. Song-shaped: the sections are the **Pre-Chorus** (the
  build, with its snare roll, riser and stutter) and the **Chorus**; no double drop, hard
  stop or impact. Intro, pre-chorus, chorus, breakdown, pre-chorus, chorus, outro.
- **The last chorus goes up a whole step** — the truck-driver key change (Key Lift).
- **The kit**: four on the floor, a **gated-reverb snare** (a reverb, then a noise gate, on
  the SNARE strip), sixteenth hats, open hats off the beat, **Simmons tom** fills.
- **The bass**: a brassy mono (Classic Mono) in **root–octave sixteenths** over a sine sub
  holding each half bar. (NIGHT DRIVE's own 80s Mono is a CRLS-1, which the rules keep off a
  part this busy.)
- **The chords**: a **string machine** (PWM Strings) pumping on the beat, every chord a
  seventh — NIGHT DRIVE's Am7 and Fmaj7; Anthemic walks its | Am F | C G | Am C | F G |.
- **The hook** doubled on a **hero lead** with an **ice bell** an octave over it; **brass
  stabs** answering (Counter-Melody, on by default here, on NIGHT DRIVE's rhythm); a crystal
  arp in threes against fours; a hollow PWM lead an octave up in the last chorus.
- The breakdown is the hook at half speed over a warm string pad and the glass choir.

What it has not got: NIGHT DRIVE's verse, the hook at half speed on a hollow lead with the
kick on one and three. The Half-Time Switch gives the first phrase of chorus two that kick.

### Levels

Every preset is levelled by the engine before any fader touches it: its loudness was
measured once (`tools/measure-voices.js`) and the lane divides that into its own target,
so one note of any sound lands at about the same loudness on any lane.

One note is not how a banger plays, though: a chord is three or four notes, a pad held for
a bar delivers more than the note it was measured on, a pluck in sixteenths less, and a
sound reads louder or quieter as it goes up the keyboard. So **each fader is predicted as
the banger is made** (`tools/lib/banger/levels.js`):

- **What the part plays**: every note in an eight-bar stretch of its fullest drop, with how
  many at once, how long and how high, read the way the loudness meter reads (400 ms
  blocks, silences left out). A part is judged by how loud it is while it plays.
- **What it plays on**: each banger sound's own loudness curve, measured at five note
  lengths and four pitches. A sound without a curve uses its one catalogue measurement and
  a typical shape.
- **What the channel was set for**: each style's channels were copied from a **seed
  remix**, so every channel is matched to the part it played there. For example, eurobeat's
  chords are matched to HAIRPIN's STRINGS in bars 49–56, at HAIRPIN's fader. A channel set
  by hand (trance's) is matched to the style's own default part.

Some parts are matched on the sound alone, against the same notes:
- **Drums**: a 909 kit's kick against the seed's kick, on the banger's own pattern. A
  half-time drop and a full-time one are meant to sound different.
- **The riff's own parts, the hook included**: kept sounds are left alone. A Random
  sound is matched to the sound it replaced. A kept part arrives with its own song's
  channel (EQ, inserts) that the prediction can't hear, and the check found kept hooks
  landed better left where they were.

A prediction never moves a fader more than 6 dB.

**The Stereo Widener is counted.** It raises the sides of a sound (by 2 × WIDTH) and
leaves the middle alone, so a wide sound on a widened channel comes up and a mono one
does not move. So every curve records how much of its sound is in the sides, and both
sides of a match go through their own channel's widener. (Until 2 Oct 2026 it traded the
middle away — a mono sound was 14 dB down at 0.9 and silent at 1.0 — and the styles put
one on the saws, pads and choirs by default. They no longer add any widener; add one by
hand where you want it.) Past WIDTH 0.5 it also makes a side out of the middle above
300 Hz, at 2 × WIDTH − 1 of it, and that is counted too: every curve also records how much of
its sound gets past that cut at each of its four pitches, and a part is read at the middle
of where it plays. A sound
with no curve gets the typical one (the median of the measured: 0.08, 0.19, 0.53 and 0.99
of it past the cut at A1, A2, C4 and A5), and a drum row 0.6. A curve measured before this
gets its four pitches with `node tools/banger-levels.js curves --songs=all --highs`, which
measures nothing else. (The widener's WET and MONO SPREAD were retired the same day; left
in a save they are ignored, by the engine and here.)

**Re-mixing a seed moves the bangers**, once you run `node tools/banger-levels.js refs`.
That reads the seeds as they are now: their notes, sounds and faders. `tests/banger.js`
prints a note when a seed has changed since. The seeds are:

| Style | Seed | Bars |
|---|---|---|
| Big-Room House | ABSOLUTE ZERO | 41–48 |
| Future Bass | SNOW GLOBE | 39–46 |
| Eurobeat | HAIRPIN | 49–56 |
| Chipstep | CHIPSTEP | 45–52 |
| Synthwave | NIGHT DRIVE | 45–52 |

Channels a style inherits from big-room use ABSOLUTE ZERO's.

```
node tools/banger-levels.js refs              # read the reference parts (no rendering)
node tools/banger-levels.js curves            # measure new or changed banger sounds
node tools/banger-levels.js check             # render bangers part by part: how far each
                                              # part lands from its reference, before
                                              # levelling and after (report-only)
node tools/banger-levels.js check --fit       # …and fold each channel's average miss in
node tools/banger-levels.js check --riff=crypt:5-8   # test on bars of your choosing
```

The check writes `work/local/reports/banger-levels.json`. Everything the prediction reads
lives in `tools/lib/banger/levels-data.js`, which the tool generates. Its renders take the
shared render slots, run niced, and close their browser.

**Strip names** say the part and the sound it plays — `PAD · Polar Drift`, `CHORDS Gate ·
Super Saw` — so they stay true when a sound is changed on the Banger Sounds page. Drums are
named by part alone (`KICK`, `HATS`).

## The files

| Path | What it is |
|---|---|
| `tools/lib/banger/` | The generator, browser-safe: `index.js` (`generateBanger`), `riff.js`, `options.js`, `analyse.js`, `variation.js`, `form.js`, `sections.js`, `lanes.js`, `fx.js`, `theory.js` (the remix toolkit), `styles/big-room.js`, `styles/trance.js`, `styles/future-bass.js`, `styles/eurobeat.js`, `styles/chipstep.js`, `styles/kraftwerk.js`, `styles/synthwave.js` |
| `tools/lib/banger/sounds.js` | The sounds table — written by the Banger Sounds page |
| `tools/lib/banger/sound-rules.js` | The rulebook: every slot, and what may go in it |
| `tools/lib/banger/sounds-source.js`, `audition.js` | The table's serialiser; the two-bar auditions |
| `tools/banger-sounds.js`, `banger-sounds-entry.js`, `banger-sounds-shell.html` | The Banger Sounds page (:8022) |
| `tools/lib/banger-file.js` | Writing a banger song into `work/bangers/`, its takes, and the one-time move out of `work/scratch/` |
| `tools/mixer-banger.js` | The dialog and the take buttons |
| `tools/mixer.js` | `POST /make-banger`, `GET /banger-takes`, `POST /banger-take` |
| `tools/banger-audition.js` | Make and render bangers from the command line |
| `tools/lib/banger/levels.js`, `levels-data.js` | The fader prediction, and what it reads (generated) |
| `tools/banger-levels.js` | Reads the seeds' reference parts, measures the sounds' curves, checks the prediction |
| `tools/lib/render-slots.js` | The machine-wide render slots both tools take |
| `tools/lib/banger-seeds.js`, `tools/banger-seeds.js` | Seed bangers, Use as Style, Sound Combos; the command line for them |
| `tools/lib/banger/channels.js`, `combos.js` | Each style's channels from its seed (generated); the Sound Combos (generated) |
| `tools/lib/banger-refs.js` | Reading reference parts out of seeds, remixes and bangers |
| `tools/mixer-banger-seeds.js` | The desk's Use as Style, Save as Combo and A/B |
| `src/data/imported/banger-seed-*.js` | The seven seed bangers |
| `tests/banger.js` | Tests for the generator, the riff reader, the song file and the takes |
| `tests/banger-sounds.js` | Tests for the sounds table, the rules, Save, and the generator playing the table |

The page makes the music and the server only writes the file. So a change to the
generator needs a refresh, not a server restart; only a change to the routes needs a
restart.

A banger is a scratch song in every mechanical sense, kept in its own folder
(`work/bangers/<id>.js`, group `banger`; `BANGER_DIR` in `tools/lib/imported-index.js`).
The scratch index, `work/scratch/index.js`, lists both folders. Its recipe (the riff, the
options, the seed and the take number) is `export const banger = {…}`, above the desk's
marker, where a save cannot touch it.

**A new style** is a new file in `tools/lib/banger/styles/` holding the same data as
`big-room.js`, plus one line in `styles/index.js`, plus an entry in the sounds table. A
recipe is data only; the section builders are shared.

## From the command line

```
node tools/banger-audition.js plumber 1-2                      # one take, rendered
node tools/banger-audition.js plumber 1-2 --seeds=3            # three takes
node tools/banger-audition.js crypt 5-8 --mood=dark --variation=faithful
node tools/banger-audition.js neon 9-12 --length=long --set=form.falseEnding=true
node tools/banger-audition.js plumber 1-2 --write              # and open it on the desk
```

WAVs go to `work/auditions/bangers/`, and each line reports LUFS and the form. Renders
take a machine-wide render slot, so a batch never pegs the machine you are listening on.
`--write` drops the song into `work/bangers/`, where the desk lists it under Bangers.
