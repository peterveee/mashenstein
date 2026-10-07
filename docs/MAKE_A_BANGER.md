# MAKE A BANGER

A whole arranged song made from a few bars of another one. The song the bars came from
is not touched: the banger is a new song, it opens on the desk, and it plays.

## Where it is

- **Right-click a bar selection** on the timeline. *New Song From These Bars* → **Make a
  Banger…** uses the selected bars as the riff.
- **The Song Desk drawer**, under New song: **Make a Banger…** uses the selection, or the
  first four bars if nothing is selected. **Banger Sounds…** beside it opens the Banger
  Sounds page (below) through the desk launcher.
- **THE LAB in the game**: the jukebox's **NEW BANGER** makes one from a riff written on
  its own grid (*THE LAB, in the game*, below).

Every banger is saved in its own folder, `work/bangers/`, and listed on its own shelf in
the drawer's songs list: **Bangers**, just above Scratch songs. (Bangers made before 2 Oct
2026 sat in `work/scratch/`; the desk moves them into `work/bangers/` the first time it
starts with this change.)

The riff is **1 to 8 bars**. For a longer selection, the dialog starts on its first four
bars and you can change *From Bar* and *To Bar*. The riff is read the way the desk
hears it: unsaved edits are included, and muted or soloed-out tracks are left out.

## The dialog

**Simple** (how it opens, until you choose otherwise) is the bare minimum: **Style**, **Mood**,
**Length** (Short, Medium, Long) and the riff line (which bars, what it reads as, why it
cannot be made if it cannot). Everything else is the style's own — or, if you have set
things in **Full Options**, what you set there; Simple then says *+ your Full Options
settings*, with **Use the style's own** to put the rest back (keeping the style, the mood
and the length). The dialog remembers which of the two you last used.


The quick row has the choices you make every time:

| Control | What it does |
|---|---|
| Style | The recipe. **Big-Room House** (128, the ABSOLUTE ZERO shape: pumping supersaws, off-beat bass), **Trance** (138: a rolling sixteenth bass, trance-gated supersaws, a long breakdown with the hook on a piano; Uplifting and Long by default), **Future Bass** (140 at half time: hat rolls, an 808 under a talking wobble, stuttered supersaws, a full-time second drop; Euphoric by default) or **Eurobeat** (155, HAIRPIN's shape: four on the floor, an octave bass in eighths, strings, brass stabs, the razor lead doubling the hook; Anthemic by default) or **Chipstep** (140, CHIPSTEP's shape: chip-house builds on an octave square bass, a half-time first drop with a wobble, full-time drops after it with the wobble stuttering, a Game Boy snare) or **Synthwave** (118, NIGHT DRIVE's outrun: a gated-reverb snare, a root–octave sixteenth bass, a string machine pumping, brass stabs, pre-chorus and chorus, the last chorus a whole step up). Picking a style resets every switch under More Options to that style's defaults. **Shibuya-Kei** (126 with a light swing: a breakbeat with a rim click, a bossa bass, nylon guitar comping, vibes doubling the hook and a flute answering it, strings, organ and a ba-ba choir; a Pop Song in the Lounge mood by default — written from the idea of the genre, not checked against the records). **Drum & Bass** (174: the two-step beat with ghost notes and shuffling hats, a reese bass under held pads, a pluck doubling the hook; Moody by default, the riff's own drums replaced), **Electro** (126: an 808 kit with a syncopated kick, an 808 bass locked to it, stabs on the off-beats, a robot vocoder doubling the hook, no pump; Dark by default) and **16-Bit** (150, sixteen-bit FM: a slap-FM bass in octaves, FM keys on the off-beats, the hook on an FM lead with an FM bell over it, FM toms; a Pop Song in the Heroic mood, no riser, pump or filter build). These three are also written from the idea of the genre — correct them by ear. The chill styles: **Deep House** (122, swung: Rhodes stabs over a pad that breathes with the kick, a Groove with no drops), **Nu-Disco** (112: congas, a picked guitar, walking bass, strings, a flute; a Pop Song) and **Downtempo** (94, swung: a slow crushed break, Rhodes and strings, a muted trumpet; a Groove). |
| Mood | Anthemic, Uplifting, Euphoric, Moody, Dark, Gothic, Heroic, Nostalgic or Funky — or one of the seventeen every style shares (`tools/lib/banger/moods.js`), each its own progression: Bittersweet (I–IVmaj7–iv–I–vi7–II7–IVmaj7–Vsus4), Disco (the ii7–V7 vamp, or i7–iv7 in a minor key), Sunshine Pop (Imaj7–iii7–IVmaj7–V, home by ♭VII), Doo-Wop (I–vi–IV–V), Lament (the falling circle of fifths), Lo-Fi (IVmaj7–iii7–ii7–Imaj7), Dreamy (I–II), Wonder (I–♭VI–I–♭III), Boogie (eight-bar blues), Lounge (Imaj7–VI7–ii7–V7, then sliding down by semitones), Boss Fight (i and ♭II a half-bar each, turning on the big V) and Flamenco (called Andalusian until 6 Oct 2026: i–VII–VI–V two chords a bar, resting on the big V — Gothic's descent at twice the pace, without the church) and Hypnotic (I–♭III–IV–V: four bars on I over the new **Sequencer** bass — root, octave, fifth, seventh in sixteenths — then shifting up in blocks; it lifts key by the plain jump) and Fiesta (the Latin party: merengue's I–V7–V7–I–I–IV–V7–I in plain triads in major, the montuno vamp i–iv–V7–iv in minor, over a Root–Fifth bass) and Soulful (gospel house: Imaj7–I7–IVmaj7, home by iii7–VI7–ii7–V7, over a walking bass; it lifts by the walk-up) and Mystery (the line cliché: i–i(maj7)–i7–i6, then the same on iv, then the big V, over a walking bass) and Playful (cartoon mischief: I–♯I°7–ii–V7, then ragtime's VI7–II7–V7; in minor the i–V7 oom-pah and a ♯IV°7 creeping up from the iv; over a Root–Fifth bass). Hopeful was retired on 6 Oct 2026 (it was Moody's major walk and Uplifting's minor one); a banger made in it is made in Uplifting, and one made in Andalusian is made in Flamenco. A quality written on a mood's numeral (I7, i(maj7), i6) is played as written wherever the mood's chord wins the bar, unless the hook leans on a note it drops or rubs a semitone against one it adds — before 6 Oct 2026 it was cut back to the triad and given the mood's colour. Mood picks the chord progression, the chord colours (Moody uses sevenths, Uplifting adds ninths, Funky ninths on the major chords) and how bright the hook is, and can swap parts' sounds (Gothic: organ, harpsichord, tolling bell, timpani; every shared mood has its own too — see `docs/audio/banger-style-parts.md`) and suggest a bass (Funky → Funk Syncopated). |
| Mode | **Keep**, **Major**, **Minor**, **Dorian** (minor with a raised 6th: bright, groovy), **Phrygian** (minor with a flat 2nd: dark, menacing), **Harmonic Minor** (minor with a raised 7th: dramatic, a big V), **Mixolydian** (major with a flat 7th: rocky, open) or **Lydian** (major with a raised 4th: dreamy, floating). Each mode brings its own chord walks, built on the chord that makes it (dorian's IV, phrygian's flat II, mixolydian's flat VII …), and its turnarounds land there instead of on the dominant. Each mode has a **bright** walk (leaning on its major chords) for Anthemic, Uplifting and Euphoric, and a **dark** one (leaning on its minor chords) for Moody and Dark, so the mood still steers the chords. The list marks which modes **suit** the chosen mood and which **fight** it — Dark suits Minor, Phrygian and Harmonic Minor and fights Major and Lydian; Euphoric suits Lydian and Major — and Surprise Me always rolls one of the modes that suit. Any mode can still be picked with any mood. |
| Riff Notes | Shown when Mode is not Keep. The banger stays on your riff's own home note either way — to move a finished banger higher or lower, select all its bars on the desk and use **Transpose**. **Keep As Written** (the default) never moves a note: the mode is in the chords — the mode's own wherever your riff sits on them, and your riff's own chords borrowed wherever it plays the note the mode changes, so nothing clashes. **Fit to the Mode** moves your notes into the mode, degree by degree — an A-minor riff in Dorian has every F raised to F♯ — so the riff itself takes on the colour. The readout says how many notes would move. |
| Length | Short (48 bars, about stage length), Medium (64 bars, two minutes at 128), Long (112 bars), or Custom (24–256 bars, in fours). |
| Tempo | The style's own tempo (128), the source song's, or a number you type. |
| Variation | **Faithful** keeps your notes exactly and varies only the setting: octaves, instruments, harmony, half speed. **Some** also moves the riff up the scale and turns the phrase ends round. **Wild** also develops fragments, shifts the rhythm by an eighth and leaps at the peak — and each of those comes back: the fragment returns in the same bar of the phrase's second half, and consecutive phrases differ in one bar only. |

Nothing ever turns the melody upside down. Peter turned that down for the remixes, and
the generator has no operation that could do it; the tests check this.

The readout line shows:

- what the riff is: how many bars and parts, and what key it reads as;
- which part is the **hook**: Auto picks the busiest melodic part, and you can choose
  another;
- the length and tempo the banger will come out at.

If those bars cannot make a banger (drums only, or more than eight bars), Make It is
switched off and the readout says why.

### The Form row

The song's shape, drawn as a strip: one block a section, as wide as it is long, as tall as
it hits (its energy), coloured by its kind. The buttons choose the form:

| Form | The shape |
|---|---|
| **Club** | The build-and-drop banger below (*What a banger is made of*), shaped by the Form switches under More Options. |
| **Pop Song** | Intro (the chorus quoted, through an opening low-pass) · Verse · Pre-Chorus · Chorus · Verse 2 · Pre-Chorus 2 · Chorus 2 · **Middle 8** · Final Chorus (lifted) · Outro (the chorus tagged, then home held). A Short song loses the second verse and chorus first — the radio edit. |
| **Anthem** | Intro · Build · First Drop · a long Breakdown with the hook alone over a pad (the choir and the pedal join halfway) · Rebuild (the arp from the first bar) · one huge lifted Final Drop · Outro. The breakdown is the last thing a short song gives up. |
| **Groove** | No drops: eight-bar sections over one groove. The style's layers arrive over the first two-fifths, everything plays through the middle with one section of the drums out, and the last two sections take them away. No riser, impact or roll. |

A riff with its own bassline: **Riff Bass** (More Options → Bass & Chords) says what
happens to it. **Replace** (the default) plays the Bass setting's line in the drops — your
bassline plays in the intro and outro, where the riff plays as written. **Keep** plays your
bassline in the drops wherever the hook plays as written; where the hook is varied, moved
or set over other chords, the Bass setting fills in. The readout says which, when the riff
has a bassline.

A breakdown's hook is the **Breakdown Hook** switch (More Options → Form, every form):
**Half Speed** (the default — every note twice as long), **As Written** (its own speed over
the pad), or **No Hook** (the pad, the choir and the pedal alone). A breakdown in the Form
row can say its own (Plays: Half-Speed Hook, Hook As Written, Hook Alone, No Hook).

Half time is its own kind of section, the **Half-Time Drop**: the hook and chords at full
speed over a half-time kick and backbeat. A **Drop** or **Chorus** is always full time.
Chipstep's and Future Bass's first drop shows on their Club strip as a Half-Time Drop —
change it to a Drop to play it full time, or turn any drop in any style into one. (The
Half-Time Switch under More Options still halves just the first eight bars of the Club
form's drop two.) Every block, button and choice in the row has a tooltip, and the
section lists show a one-line note beside each kind.

Click a block to change it — its kind, its name, its bars (± four), its energy (five
steps), what it plays (an intro can be the riff, a chorus quote, layers or drums and bass;
an outro the riff, a chorus tag, a fade, a cold end or layers; a breakdown the half-speed
hook or the hook alone), and Lift on a chorus or drop. Add a section after it, remove it,
or drag a block to move it (or Alt+←/→; + and − resize; Delete removes). The first change
makes it a **drawn** form: the request carries it, every take re-makes it, Banger Settings
reopens it, and changing Length rescales it. **Reset**, another form, or another style
goes back to the form's own. The switches under More Options that only shape the Club
form are dimmed when another form, or a drawn one, is chosen.

Each style starts on a form that suits it: **Synthwave** and **Eurobeat** a Pop Song,
**Trance** an Anthem, the rest the Club form.

**Style Defaults** puts every setting back to the chosen style's own — mood, mode, length,
tempo, variation, the form and everything under More Options — keeping the riff's bars.
**Classic** is the style as it was before the variety: its own sounds every take (Part
Sounds: Style's Own), its own arp figure throughout, no Bass Lifts, the Club form — for
Big-Room House, ABSOLUTE ZERO's shape and sound.

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
| Form | (the form itself is the Form row) Style's Own Form · Intro · Build in Layers (Off, Long Songs, Always) · Drums & Bass Intro · Build · Breakdown · Second Drop · Double Drop · Key Lift (none, half step, whole step, major third) · Second Mood (None or any mood: its chords, chord colours, the bass it suggests — unless the bass was picked by hand — and its key-change approach; the sounds stay the first mood's) · Switch At (After the Break — from the breakdown or middle 8 on; Final Chorus — the last drop or chorus on; Choruses Only — the drops and choruses, the verses and builds keep the first mood) · Key Change (how the lift arrives, on the last half-bar before it: Mood's Own, Straight, Pivot — the new V7, Two-Step — ii7–V7, Borrowed Step — ♭VI–♭VII, Walk-Up — the bass climbing in by semitones; Mood's Own gives each kind of lifted section the same approach every time, the mood's first for the first kind) · Hard Stop · False Ending · Half-Time Switch · Outro. Intro, Outro, Build in Layers, Drums & Bass Intro, Key Lift, Hard Stop (as the pause before a final chorus) and False Ending (before the final chorus) shape every form; the rest only the Club form. |
| Drums | Source Drums (Keep and Add / Replace / Keep As-Is) · Kit (Style, Studio, 909, 808, DS, CR-78) · Crashes · Fills · Snare Rolls · Impact · Shaker · Tambourine · Congas · Cowbell · Ride |
| Bass & Chords | Bass (Off-Beat, Rolling 16ths, Octave Eighths, Root–Fifth, Funk Syncopated, Long 808, Reese Drone, Gallop, Arpeggiated, Pedal, Walking, Sub Only, None) · Bass Lifts (later drops move to a busier related bass) · Sub Layer · Chords (Pumping Supersaws, Piano Stabs, Pad, None) · Square Double · Bell Octave · Octave Hook · Third Below · Arp · Arp Pattern (Varied, Style's Own, or one of thirteen figures) · Choir · Counter-Melody · Write a Lead (When Needed / Always / Off) · Riff Sound (Keep / Random) · Part Sounds (Roll / Style's Own) · Fill In (`tools/lib/banger/embellish.js`: Off, Repeat — the first half of each bar's long notes struck twice, Passing — a scale note between notes a third or more apart, Neighbour — long notes stepping up and back; every added note in the banger's key) · Fill Every (Every Pass, Every 2nd, Every 4th — the last pass of each group is the filled one, so it answers the plain ones) · Fill Notes (One, Two, Every Gap — figures a filled bar gets, earliest first). The same bar on the same pass is always filled the same way; the chords are chosen under the plain tune; a busy riff has no room and is left alone |
| Spot FX | Effects chosen by what they are for — each **Style** (the switches' own moves) by default. **Into a Drop** (the last bar before every drop or chorus: Stutter, Beat Repeat, High-Pass Sweep, Reverb Wash, Tape Stop, None) · **Out of a Drop** (the last bar before the song drops down: Delay Throw, Reverb Wash, Low-Pass Down, Tape Stop, None — a transition's Tape Stop winds the mix down over the bar's last beat, two from 160 BPM, and stands still on the bar line) · **Breakdowns** (over every breakdown and middle 8: Underwater, Ping-Pong Echo, Big Reverb) · **Intro FX** (Low-Pass, Bitcrush, Radio, None) · **Ending** (Tape Stop, Echo Out, Fade, None). Surprise Me rolls each one time in four. All written as the desk's Spot FX, so they can be edited afterwards |
| FX | Riser · Filter Build · Stutter Before Drop (in Big-Room, Trance, Future Bass, Chipstep, Electro and Drum & Bass · Neuro, one build in three closes instead with the **Machine-Gun Sweep**: the last half bar held in 1/32s through a low-pass closing 18 kHz → 200 Hz — the desk's Machine Gun + Sweep Down presets) · Sidechain Pump · **Chord Gate** (Style's Own — Trance sixteenths, Future Bass eighths, the rest a quarter-note pump — or Pump, Eighths, Sixteenths, Dotted Eighths, or By Energy: a pump in quiet sections, eighths building, sixteenths in the drops) · Delay Throws · Low-Pass Intro · Bitcrush Intro · Tape-Stop Ending |

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
Form switch (only Key Lift still applies). No style has one at present
(Kraftwerk's was the only one, and Kraftwerk was removed on 3 Oct 2026), so the switch does nothing. A script (`script` in the style file) is a list of sections,
each a run of blocks — `[bar of the section, the parts that play from it, extras]` — so a
part joins or leaves only on a block. It is written at its own length; any other length scales every section and block in proportion, in fours from 56
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
a build then a drop is a club track.

The drop is always in; it is what a banger is for. A riff with no drums gets the whole
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
on (the percussion, the third below, the counter-melody, the choir, …). They are on the
**Style Seeds** shelf of the desk's songs. They are tracked songs
(`src/data/imported/banger-seed-<style>.js`), so they can't be deleted from the desk.

**Each flavour has a seed of its own** (6 Oct 2026), such as REGGAETON · ROMÁNTICO SEED
(`banger-seed-reggaeton-romantico.js`). It is made in that flavour, on its own sounds. Use as Style
on it writes that flavour's row of `sounds.js`, its own entry in `channels.js` and its own level
references, and leaves the base style alone. A flavour never takes its base style's seed
channels. Those were set for the base style's sounds, and they used to replace every flavour's
own mix. Until a flavour's seed is used, its bangers play the flavour recipe's own channels.
Make one with `node tools/banger-seeds.js make reggaeton-romantico`.

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
its own, named for the style and the part (for example "Wide Detune Bass · Eurobeat", id
`seedEurobeatBass`), and measures it the way the voice editor's Save as New does. Using the
style again updates that same preset rather than adding another. The style in the name is for
the desk's library; the game's sound buttons leave it off.

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

### Sound Sets

**Sound Set** (Bass & Chords → Instrument sounds) plays the style's music on another set of
sounds. Built 5 Oct 2026:

| Style | Set | What it is |
| --- | --- | --- |
| Chipstep | Light | the cheap synths only — KNDO-5, TNGR-2, RMND-2 — light enough for a phone |
| Chipstep | 8-Bit | KNDO-5 alone (square, saw, triangle, sine), every tuned note cut to a sixteenth, pumping supersaws played as stabs; a console kit in every Kit slot — Simmons triangle kick, Game Boy snare, the game's own noise hats, clap, crash and triangle toms — and blip percussion |
| Synthwave | Light | wavetable (TNGR-2) and FM (RMND-2) voices in place of every MRDR-3 one |

A style without the set asked for is made with its own sounds, and says so. A Sound Combo
does not go over a Sound Set: its sounds would undo the set's budget.

Each set is a recipe of its own in `tools/lib/banger/styles/` (`chipstep-lite.js`,
`chipstep-8bit.js`, `synthwave-lite.js`) with `base` (its style) and `soundSet`, listed in
`BANGER_SOUND_SETS`, and its own row in `sounds.js`: pick **Chipstep · Light** etc. on the
Banger Sounds page to edit it. Every set is a **phone** set: the rulebook shuts MRDR-3 and
JMJR-4 out of every slot in it. Its channels, combos, fader references and per-style tables
are its base style's.

Why: in WebKit (the iPhone's engine) a synthwave banger ran at 49% median and saturated by
its last chorus; the same song with its MRDR-3 parts blanked ran flat at 18%
(`work/local/_banger-lanes-webkit-2026-10-04.txt`). THE LAB in the game plays chipstep (as
CHIPTUNE) and synthwave on Light, and a chiptune take comes out on 8-Bit now and then, by its
seed — one in six at Safe, one in four at Charged, one in three at Surge, one in two at
Overload (`src/game/banger/make.js` `LAB_SOUND_SETS`).

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

## THE LAB, in the game

The jukebox's **THE LAB** makes bangers with the same generator (`src/game/banger/make.js`).
**NEW BANGER** opens a piano roll with four selectors: **FORMULA** (the style), **INFUSION**
(another style's sound, or NONE), **ELEMENT** (the mood) and **MUTATION** (Voltage and DNA
together). **BRING TO LIFE** makes the song. A kept song is stored as its recipe (notes, style, mood, seed) and made
again each time it plays.

**INFUSION** (7 Oct 2026) is the selector beside FORMULA. It starts on NONE. Picking another
formula plays that formula's **sound** (its chords, instruments and arrangement) over
FORMULA's **groove** (its drums, bass and tempo). See [Fusions](#fusions).

- **What FORMULA keeps.** FORMULA keeps its flavour (`flavour`, rolled as ever), and that
  flavour is the groove.
- **Phones.** Both formulas play on their Lab Sound Sets (chipstep and synthwave on Light).
- **Tempo.** The preview loop keeps FORMULA's tempo.
- **Edge cases.** INFUSION's list leaves FORMULA out. Moving FORMULA onto the infusion's own
  style sets INFUSION back to NONE.
- **EXPERIMENT** rolls an INFUSION one time in three.
- **What a kept take stores.** It keeps `infusion`: the style, or the flavour of it that the
  take's mood plays (`make.js labInfusion`). A flavour added to that style later never changes
  the song.
- **Older songs.** A song kept in the first hour of fusions, when the sound was `style` and
  the groove `fusion`, is rewritten on load (`make.js upgradeFusionRecipe`) and plays as it did.

**MUTATION** (7 Oct 2026) is VOLTAGE and DNA in one selector, which reads `SURGE · SPLICED`.

- **The grid.** Its chooser is a 4×4 grid. Down the side is ENERGY (Safe, Charged, Surge,
  Overload); across the top is YOUR NOTES (Pure, Hybrid, Spliced, Mutant). Under the grid, the
  chosen or focused cell's two descriptions are shown. One tap picks any of the sixteen
  pairings, so an Overload take can still keep the riff as written.
- **The arrows** step a ladder of six (`maker.js MUTATION_LADDER`), from wherever the selector
  is: Safe · Pure, Charged · Pure, Charged · Hybrid (where NEW BANGER opens), Surge · Spliced,
  Overload · Pure, Overload · Mutant. The grid marks those six with small dots.
- **Saved songs** still keep `voltage` and `variation` separately, so nothing kept changes.

**The grid** is SIMPLE (eighths on the eleven notes of A minor, G4 to C6) or ADVANCED
(sixteenths on every semitone), and two bars or four (Peter, 6 Oct 2026):

- Small bar numbers run along the top of the grid. A **+** at their end adds bars 3–4; a
  **−** takes them away again. A tap puts up a floatie (BARS 3-4 ADDED, BACK TO 2 BARS) and
  a mouse resting on it gets a tooltip (ADD BARS 3-4, BACK TO 2 BARS). The grid opens on two
  bars, as simple as it always was, under the same title row: NEW BANGER (EDIT BANGER for
  a kept song) and SIMPLE / ADVANCED.
- Bars 3–4 come in as a dim **repeat** of bars 1–2 that follows them: an edit in bars 1–2 is
  copied on into 3–4 until a note is written in 3–4 itself, which makes them the riff's own.
  Until then BRING TO LIFE makes the two-bar song (`riff.js settleBars`): four bars count
  only once they say something of their own. **−** hides bars of their own and remembers
  them, the way ADVANCED is remembered; a repeat is let go.
- **Every bar is on show.** One line in landscape and on a desktop (ADVANCED's four bars are
  sixty-four columns); in portrait four bars stack two over two, each line under its own bar
  numbers, like the lines of a score. Turning pages between bars 1–2 and 3–4 was tried and
  dropped.
- A grid's bar count is its length (`riff.js barsOf`): a mode's `steps` are two bars, and
  twice that is four. Every recipe and draft from before reads as two bars, so nothing needed
  a new version.

**ZAP** writes as many bars as are set. Its own four bars are a question and its answer:
bar 2 stops open, on C, D or E; bar 3 is bar 1 moved along the scale (two steps up, three up
or two down), the same shape so it is heard as the same tune, on other notes so another chord
goes under it; bar 4 walks home to A. One ZAP in three is a cabinet's own riff instead, as
long as the grid (`src/game/banger/game-riffs.js`), and the floatie names the song:

| Song | Two bars | Four bars |
|---|---|---|
| FIELD SERVICE | the drop hook (B minor), its answer, the pan-flute whistle | the whistle and its answer; the drop hook in B minor |
| SPEED ZONE | the lead | the pad's melody |
| FROST FORTRESS | the lead | none: its hook is one bar four times |
| RHYTHM BANKRUPTCY | the lead's entrance, the arpeggio, the drop | the drop with its run-up; the arpeggio climbing out |
| CRYPT SHIFT | the theremin | the theremin, round to its G♯ |
| TERMINAL VELOCITY | the chime | the chime, over C and then G |
| THE FOOD COURT | its arpeggio loop | the loop and its repeat |

The riffs are read off the songs as the desk hears them and kept in the remix shorthand;
only stretches that fit G4–C6 are taken. THE FOOD COURT's tune is moved up a minor sixth
(A minor to F minor) to fit, so it is ADVANCED only, as are the B-minor hook and the
theremin's four bars; SIMPLE gets the riffs that sit on its A-minor rows. CARDBOARD KINGDOM,
CORPORATE KOMBAT and THE SURGE have none: their song files are two-bar loops.

**Why four bars.** On Pure, a ZAP's two bars sat the whole drop on one chord in about one
take in five; four bars of its own give a four-chord progression in about seven in ten
(measured 6 Oct 2026). Bars 3–4 that only repeat 1–2 with a new ending barely change the song.

The grid's preview loop plays every bar that is set, and a held note plays as long as it is
drawn (before 6 Oct 2026 it read the wrong column's length).

## Forms beyond the drop

Everything but the Club form is a list of typed sections (`tools/lib/banger/form-types.js`):
intro, verse, pre-chorus, build, chorus, drop, breakdown, middle 8, groove, false ending,
outro — each with a label, a colour, a default **energy** (0–1), a range of bars and its
variants. The templates (`templates.js`) are data: their sections at 64 bars, what a
shorter song gives up first, what a longer one grows, fitted the way the Club form is.
`form.js formFromList` gives each section the role its music is written from: the hook
sections are drop, drop2, drop3 in turn, so each chorus hits harder than the last (the
second brings the mega saw and every part in from its first bar), and the last — or a
lifted one — is final (the octave hook, the choir, the ride).

**It hangs together** because everything that is not the chorus is grown from the hook
(`cohesion.js`):

- **Verse** — the hook's own rhythm thinned to its strong eighths, written lower and
  narrower (a fifth to an octave under the hook) over chords that are not the chorus's
  (i–iv–VI–VII in minor, I–IV–vi–V in major, two bars a chord; under a mode, the mode's
  other walk — a dark verse under a bright chorus). Verse 2 is verse 1 again, its second
  half a step up. Sung on the hook's own channel, two dB under the chorus. The kit by
  energy: half time at the quietest, four on the floor and the backbeat from the middle,
  open hats and shaker from halfway up.
- **Pre-Chorus** — the hook's head sequenced up a step a bar over a climbing walk (iv–v–VI
  in minor, ii–iii–IV in major) that lands on the dominant; the music opens through a
  low-pass across it and the roll swells in its last two bars.
- **Middle 8** — somewhere else: IV and vi, then the borrowed bVI–bVII in major; VI and iv,
  then III–VII in minor; the dominant last. Its melody is the hook's tail motif developed
  (`variation.js fragment` — sequenced, never turned over), over half-time drums, a
  Walking bass and an open pad, the choir joining for its second half; its last bar is
  silent until the hook's first beat comes in early as the pickup home.
- **Intro** can quote the chorus; **outro** can tag it.

The verse, pre-chorus and middle 8 lines are each fitted to the chords under them, so none
of them grinds (*Nothing grinds*, below).

**The joins** between sections (`transitions.js`) are chosen by how much the energy
changes. A big rise into a chorus gets a riser and one of: the kick and bass dropping out
for the last two beats, stop-time on the last beat, the mix stuttering, or — into the
final chorus, with Hard Stop on — the pause; and a two-note pickup in the hook, walking up
through notes that fit the chord under it. A smaller
rise gets a fill and the pickup; a level join a fill; a fall a delay throw off the hook or
a half-time last bar. The switches still say yes or no (Fills, Riser, Hard Stop, Stutter,
Delay Throws), and every join is listed in the song's header note under **Joins**. A Club
form drawn out in the editor keeps the Club form's own builds, stops and throws.

**For a new style:** `defaults.form.template` is the form it starts on; `drums.sections[type]`
gives a section type its own drum patterns; `harmony[type]` its own chord walk (an 8-bar
numeral walk per mode family); `sectionLabels[type]` its own names.

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

**Nothing grinds** (6 Oct 2026, generator v8: Peter heard four-bar Lab songs that were "a
little discordant"). A note *grinds* on a chord it is not in when it is a flat ninth on the
root, the third the chord does not have (G over E major, C♯ over A minor) or the seventh it
does not have (F over Gmaj7); a tritone on the root grinds a little. Ninths, fourths, sixths
and a seventh over a triad are colour, not grinds (`theory.js grindOf`). The generator keeps
grinds out four ways:

- **Choosing a chord**, a note that would grind on it costs the chord again
  (`analyse.js chordFit`), so a bar that leans on F sits on C, not on E minor. The riff as
  written is never moved.
- **The lines made from the hook** — the verse, the pre-chorus, the middle 8, the third below,
  the breakdown's bell — are fitted to the chords under them (`theory.js fitToChords`): a
  grinding note moves to the nearest note of its chord, upward on a tie, so a G over the
  pre-chorus's E major becomes the leading note G♯.
- **The breakdown's walk** gives way where the hook grinds on it, and its colours add no
  grind of their own. **A pedal or a walking bass** a semitone under the tune steps onto its
  chord's root (`theory.js clearUnder`).
- **The pickup** at a join walks up through notes that fit the chord under it
  (`transitions.js`): into A over E major it plays E, G♯ rather than F, G.

Measured over 2,016 Lab songs, the share of melodic notes that grind fell from 3.2% to about
1%, and a four-bar riff's pre-chorus from 17% to 0.2%; the number of different chords in a
drop did not change. A kept Lab song is made again from its recipe, so the songs already
kept changed with it.

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

### Drum & Bass, Electro and 16-Bit

Three styles added on 3 Oct 2026, written from the general idea of each genre and not
checked against the records — correct them by ear. None has a seed remix yet: their
channels are set by hand, like trance's, and the levels match each part to the style's
own default banger.

- **Drum & Bass** (`styles/dnb.js`): **174**. The **two-step** — the kick on the one and
  the "and" of three, the snare (the BACKBEAT strip, labelled SNARE Two-Step) on two and
  four — with a ghost kick and a ghost snare on the second bar, and **shuffling sixteenth
  hats**. A **Reese Bass** holding two notes a bar (Bass = Reese Drone) over a sine sub;
  **held pads** (Chords = Pad, Polar Drift) instead of pumping supersaws, no pump; a Wire
  Harp pluck doubling the hook and an Ice Bell over it; a ride in the final drop. Every
  mood's plain triads become sevenths and ninths. The riff's own drums are replaced.
- **Electro** (`styles/electro.js`): **126**, the **808 kit** throughout (Kit = 808): the
  kick on the one, the "a" of two and the "and" of three, pushing one more in on the
  second bar; **808 tom runs** for fills. The **Distorted 808** bass rides the kick;
  **Brass Stab** chords on the off-beats (Chords = Piano Stabs); the hook doubled by **BEST
  Robot Vox** (VOCODER) with **Hard FM** an octave up later. Dry and straight: no pump, no
  exciter, a short room. Dark by default. The 808 cowbell is left off on purpose — it is
  a fixed pitch, and would clash with a riff in another key.
- **16-Bit** (`styles/megadrive.js`, id `megadrive`; called Mega Drive until 5 Oct 2026, renamed to keep a console's brand off a style): **150**, the FM chip — chipstep's older sibling.
  A **DX Slap** bass bouncing root to octave with a push before the three; **FM Keys** on
  the off-beats; the hook on **Megamix Lead**, an **FM Bell** an octave over it, **Hard FM**
  later; a **crushed kick**, a crack snare, an **FM Clap** backbeat and Simmons tom runs.
  Song-shaped like synthwave (Pre-Chorus and Chorus), Heroic by default, and none of a
  banger's studio moves — no riser, pump, filter build or stutter — and a short room.

**Sounds they could use** that the catalogue does not have yet: for 16-Bit an **FM
brass**, an **orchestra hit** and **low-bit PCM drums**; for Drum & Bass a **break snare
and kick** (tight, ringing, high-tuned). Each style plays the nearest sound we have.

### Deep House, Nu-Disco and Downtempo

Three chill styles added on 5 Oct 2026. Peter chose them from eight-bar sketches
(`work/local/_chill-sketches.mjs`, WAVs in `work/auditions/chill-styles/`). Like the three
above, they are written from the general idea of each genre and not checked against the
records, so correct them by ear. None of them is a banger. They have no riser, roll, impact,
stutter or key lift by default, but each of those is still a switch. Every mood's plain
triads become sevenths, or minor ninths in Deep House and Downtempo. The starting faders
come from the sketches' solo-balanced mixes. The levels match each part to the style's own
default banger.

- **Deep House** (`styles/deep-house.js`): **122**, swing 54. A soft 909 four on the floor
  with a clap on two and four. Sixteenth hats play around open hats on the off-beats, over
  a shaker. A **Round Bass** is pushed around the kick. **Tine EP** minor-ninth stabs
  (Chords = Piano Stabs) have an echo after them. A pad (Cloud Memory) holds **under** the
  stabs and breathes with the kick. That uses the recipe's `padUnder`, and the pad takes
  the pump. An "ooh" (Choir Ooh) sings the Counter-Melody in the hook's rests. It is a
  **Groove** in the Moody mood: parts arrive and leave, with no drops.
- **Nu-Disco** (`styles/nu-disco.js`): **112**, swing 52. Peter's pick of the "balearic"
  sketch. An easy four on the floor with a 909 **snare** on the backbeat (the style kit's
  clap slot), open hats on the off-beats, a tambourine on every off sixteenth, and congas.
  A **Picked Bass** walks root, octave and fifth. A **picked acoustic guitar** is the arp
  (Arp Pattern = Style's Own, a fixed broken-chord figure), with soft **Warm Strings** as
  the chords (Chords = Pad, no pump). The Riff Sound shortlist starts on the **Concert
  Flute**, which is also the octave lead in the later choruses. It is a **Pop Song** in the
  Nostalgic mood.
- **Downtempo** (`styles/downtempo.js`): **94**, swing 56. A slow break: the kick plays on
  one, the "and" of two and the "and" of three, with a late kick in the second bar. A
  **Fat Snare** sits on two and four. A bitcrusher on the kick, snare and hats gives the
  break its crushed edge. A deep **Round Bass** leaves room. **Tine EP** chords are two
  long hits a bar through a tremolo, with **Warm Strings** under them (`padUnder` again).
  The Riff Sound shortlist starts on the **Muted Trumpet**. Tape wear (wow, flutter, a
  little drive) sits before the master compressor. It is a **Groove** in the Moody mood,
  with the riff's own drums replaced. In the Lab, one take in five gets a bitcrushed
  intro.

**New sounds for them** (5 Oct 2026, MRDR-3 and WNDR-9): three organ stabs, **House
Organ Stab**, **Deep Organ Stab** and **Drawbar Stab**, now on Deep House's Random chord
list (Deep Organ Stab also on its hook list). **Clean Funk Guitar** is on Nu-Disco's chord
and counter lists, with a **Funk Guitar · Muted** scratch to go with it. The defaults have
not changed: Deep House still stabs on the Tine EP and Nu-Disco still picks its acoustic
guitar. Auditions are in `work/auditions/chill-styles/`. Still missing: a **vinyl crackle**
bed for Downtempo.

### 90s Dance, Italo Disco, Boogie, French House and Reggaeton

Five pop and dance styles added on 5 Oct 2026. Peter chose them from eight-bar sketches
(`work/local/_pop-sketches.mjs`, WAVs in `work/auditions/pop-styles/`). Like the chill
styles, they are written from the general idea of each genre and not checked against the
records, so correct them by ear. The starting faders come from the sketches' solo-balanced
mixes. Every sound is already in the catalogue: none of them needed a new preset.

- **90s Dance** (`styles/eurodance.js`, id `eurodance`, the 90s Eurodance sound; renamed so
  it never reads as Eurobeat): **136**. A pounding 909 four on the floor, open
  hats and the bass on the off-beats (up an octave on the last one), syncopated **Pop
  Grand** piano stabs (Chords = Piano Stabs) with **Synth Strings** holding under them and
  pumping (`padUnder`). The Riff Sound shortlist starts on the **Super Saw**, and the last
  chorus plays the hook in octaves. A **Pop Song** in the Anthemic mood, with a riser and a
  snare roll into each chorus. It is not Eurobeat, which is faster and drives on brass and
  an octave bass.
- **Italo Disco** (`styles/italo-disco.js`): **118**. A machine four on the floor, a
  **galloping** sixteenth octave bass (Bass = Rolling, on the **FM 80s bass**), a **Crystal
  Trigger** arpeggio in its own figure from the first phrase, **Polar Drift** strings
  (Chords = Pad), and a **disco tom** falling into the end of each eight (the fill slot).
  The Riff Sound shortlist starts on the **Robot Vox** vocoder. A Pop Song in the Anthemic
  mood, with no riser, roll, pump or stutter.
- **Boogie** (`styles/electro-funk.js`, id `electro-funk`; renamed from Electro-Funk so it never reads as Electro): **108**, swing 55. An 808 boogie kick over
  two bars, a cowbell, a **Synth Slap** bass popping octaves, and a **Wire Clav** comping
  sixteenths through an auto-wah (Chords = Piano Stabs). **Horn stabs** answer in the
  hook's rests (the Counter-Melody slot). The Riff Sound shortlist starts on the **Voice
  Box 70s** talkbox. A Pop Song in the Funky mood.
- **French House** (`styles/french-house.js`): **124**, swing 52. A looped disco phrase:
  chopped **Electric Keys** chords (Chords = Piano Stabs, through a phaser), a **wah
  guitar** scratching through the chords (the arp, in its own figure from the start) and a
  funky **Picked Bass**. All three pump hard against a plain 909 four on the floor. The
  pump sits on those strips themselves, not the Chord Gate, because piano stabs are never
  gated. In place of a riser and a roll, every build opens through a low-pass (Filter
  Build). It uses the **Club** form with no double drop and no key lift.
- **Reggaeton** (`styles/reggaeton.js`): **96**. The first Latin style. The **dembow**:
  a kick on every beat, and a tight snare on the "a" of one, the "and" of two, the "a" of
  three and the "and" of four (the style kit's clap slot). Under it, a **Distorted 808**
  (with its top filtered off), a low-passed **Dream Circuit** pad (Chords = Pad), congas
  and a shaker. **"Aah" chops** answer the hook (Counter-Melody). The Riff Sound shortlist
  starts on the **Data Marimba**. **The beat switch:** every half-time bar is Latin trap,
  with a half-time kick, one snare on three and sixteenth hats that roll (the recipe's new
  `halfHats`, which any style may set). A Pop Song's **middle 8** is the switch. Half-Time
  Switch, or a Half-Time Drop in the Form row, puts one in a chorus too. A Pop Song in the
  Uplifting mood (i–VI–III–VII in minor).
  **Filled out on 5 Oct 2026** after Peter found it bare. An **Acoustic Guitar** now strums
  the chords on the 3-3-2 (Chords = Piano Stabs), with the pad held underneath (`padUnder`)
  and opened up to 3.2 kHz. A **Data Marimba** arp plays in the gaps of the dembow. Each
  chorus gets a sweep and a boom on its way in, and the last one plays the hook in octaves.
  The verses have eighth-note hats, and the hook and chops are 3 dB louder.

**Sounds they could use** that the catalogue does not have yet: **timbales** for
Reggaeton's fills (the 808 tom stands in) and a real **vocoder** for Italo Disco that
follows the chords (Robot Vox is a fixed vowel).

### Moombahton

Added on 5 Oct 2026, picked from the Latin sketches (`work/local/_latin-sketches.mjs`, WAVs
in `work/auditions/latin-styles/`). Like the others, it is written from the general idea of
the genre and not checked against the records. The starting faders come from the sketch's
solo-balanced mix. Every sound was already in the catalogue: no new presets.

- **Moombahton** (`styles/moombahton.js`): **110**. The dembow made festival-sized: a
  **=909 Kick Punch** on every beat, a **Tight Snare** on the dembow (the style kit's clap
  slot), a **Big Room Clap** on three (the Tambourine slot, labelled CLAP) and **tribal
  toms** on the =808 Tom (the Congas slot). A **Reese Bass** plays the dembow too, with
  its top filtered off. **Festival Stabs** play the same rhythm (Chords = Supersaw Stabs)
  and pump on their own strip, because stabs are never gated. The Riff Sound shortlist
  starts on the **Data Marimba**. It uses the **Club** form with snare-roll builds, a riser
  into every drop and a harder second drop, in the Uplifting mood (i–VI–III–VII in minor).

### Merenhouse

Added on 5 Oct 2026, picked from the same Latin sketches. It is written from the general
idea of the genre and not checked against the records. The starting faders come from the
sketch's solo-balanced mix.

- **Merenhouse** (`styles/merenhouse.js`): **132**. Merengue on a house kick: a 909 four on
  the floor and clap. The **güira** is the hat. Short scrapes (**Güira · Chk**, the style
  kit's hats) play every sixteenth under a long scrape on each beat (**Güira · Scrape**, the
  Shaker slot). The **Tambora** knocks the merengue pattern (the Congas slot) and plays the
  fills. Under them, a **DX Slap** bass bounces root to fifth ahead of the beat, and
  **Bright Pop Grand** chords hit the off-beats (Chords = Piano Stabs). **Brass Section**
  horns answer the hook (Counter-Melody), and the Riff Sound shortlist starts on the
  **Saxophone**. It is a Pop Song in the **Fiesta** mood, merengue's own walk (the shared
  mood, so any style can play it).

**New presets** (`src/data/voices.js`, Perc): **Güira · Scrape** is six ridges 14 ms apart,
each louder and brighter than the last, with the final one left to ring. **Güira · Chk**
is two ridges and a tin edge. **Tambora** is a stick knock on the shell over a low falling
skin.

### Afro House, and flavours

Added on 6 Oct 2026. Peter picked three of the Afro sketches (`work/local/_afro-sketches.mjs`,
WAVs in `work/auditions/afro-styles/`) and wanted them as **one style**, so the other two
became **flavours** of it. Like the other styles, it is written from the general idea of
the sound and not checked against records.

- **Afro House** (`styles/afro-house.js`): **122**, swing 52, on the Club form. Every build
  opens through a low-pass (Filter Build), with no snare roll, riser, stutter or key lift.
  All three flavours share four on the floor and a **Talking Drum** calling into each eight
  (the fill slot).
  - **Organic** (the style's own): a **Shekere** on the sixteenths (the style kit's hats),
    **Djembe · Tone** on a 3-3-2 (Congas) and **Djembe · Slap** (Tambourine). Under them, a
    warm syncopated bass, a minor-seventh pad, a kalimba hook and choir answers. The
    **agogô** bell (Cowbell) comes in at Huge energy.
  - **Melodic** (120): every chord held for two bars, a rolling sixteenth bass, a plucked
    arp from the first bar of each drop, the pan flute on the hook, a Glass Choir pad, and
    congas, rim and shaker.
  - **Tech** (124): one chord for six bars, then the walk's last two. The pad becomes an
    off-beat clav stab (Chords = Pad plays as Piano Stabs). Under it, a syncopated mono
    bass, tribal toms and an agogô.

**Flavours** (`styles/flavours.js`) are a style's other arrangements. Each one is a recipe
with `base` and `flavour`, built from the style and its shared moods, with its own `recipe`
laid over the top. A recipe can carry drums, rhythms, strips, labels and tempo. On top of
that, a flavour can have:

- a `reshape`, which rewrites every progression, so the mood still picks the chords and
  the flavour picks how long each one is held;
- a `remapParts`, which works the way a Sound Set's does.

Each flavour's sounds are its own row of `sounds.js` (`afro-house-melodic`), editable on
the Banger Sounds page. They are not in the style list. What decides the flavour:

- **The mood**, by default (the `flavour` option is `'mood'`; the recipe's
  `flavourByMood`). For Afro House: Moody, Nostalgic and any mood not named play Organic.
  Uplifting, Euphoric, Dreamy, Wonder, Sunshine, Anthemic and Heroic play
  Melodic. Dark, Hypnotic, Gothic, Boss Fight, Flamenco and Mystery play Tech.
- **The desk's Flavour list**, shown only for a style that has flavours: By Mood (it names
  the flavour that mood plays), each flavour by name, or Random. Random is drawn from the
  take's seed, so Another Take can land on any of them.
- **The Lab**, with no control of its own (`make.js labFlavour`). It plays the mood's
  flavour, and sometimes another: never on Safe, 1 take in 5 on Charged, 1 in 3 on Surge
  and 1 in 2 on Overload. A re-roll can surprise you.

**New presets** (`src/data/voices.js`, Perc): **Djembe · Bass**, **Djembe · Tone**, **Djembe
· Slap**, **Talking Drum** (its pitch bends up) and **Shekere**.

**More flavours** (6 Oct 2026, from `work/local/_flavour-sketches.mjs`, WAVs in
`work/auditions/flavour-sketches/`). In each style below, the first one listed is its own
sound. Unless noted, the moods not named play the style's own sound.

- **Reggaeton**: Clásico (its own).
  - **Romántico**, 92: the dembow on a rim, **Bongo · Macho** playing the martillo (the
    Congas slot) and **Bongo · Hembra** in the fills, a güira, and a nylon guitar picking
    the chords (the arp) over a warm pad. Each chord is held for two bars. There is no
    sweep or boom into a chorus. Played by Moody, Nostalgic, Bittersweet, Dreamy, Lo-Fi,
    Soulful and Lament.
  - **Perreo**, 100: a distorted 808, a loud dry dembow snare, rolling hats, the first chord
    held for half the walk and stabbed on a clav, and a pluck riff. Played by Dark, Boss
    Fight, Gothic, Hypnotic, Flamenco and Funky.
- **Synthwave**: Night Drive (its own).
  - **Outrun**, 128: an octave bass racing (Bass = Off-Beat plays Rolling), the arp from the
    first bar, two-bar chords and a hero lead. Played by Uplifting, Euphoric, Heroic,
    Sunshine and Wonder.
  - **Darksynth**, 112: a half-time kick, a huge gated snare on three, a distorted bass in
    jabs, and brass stabbing the chords (the second brass is turned off). Played by Dark,
    Gothic, Boss Fight, Hypnotic, Flamenco, Lament and Mystery.
  - Both are **phone-light** (`phone: true`, no MRDR-3 or JMJR-4). The Lab plays synthwave's
    own sound on the Light set, and when it lands on one of these flavours it plays the
    flavour instead.
- **Drum & Bass**: Rolling (its own).
  - **Liquid**: a round bass holding long notes and **Rhodes** in sevenths and ninths
    (`recolour`), with the pad held under them. Played by Nostalgic, Dreamy, Lo-Fi,
    Bittersweet, Lounge, Soulful and Uplifting.
  - **Neuro**: a reese in sixteenth jabs, a **Digital Growl** biting on the off-beats (the
    Sub, switched on) and a clipped clav stab, with one chord held for six bars. Played by
    Dark, Gothic, Boss Fight, Hypnotic, Flamenco and Mystery.

Besides `reshape` and `remapParts`, a flavour can have:

- `remap`, which moves any switch in any group, off as well as on (Romántico turns the
  riser and impact off);
- `recolour`, which rewrites every mood's chord colours.

A mood that picks a flavour leaves the bass to the flavour, instead of switching to the
mood's suggested bass. **The Lab keeps the flavour with the saved song** (`recipe.flavour`),
so a flavour added later never changes a song that is already saved.

**To give another style flavours:** add `flavours` (its own first) and `flavourByMood` to
the style, export the flavour definitions from its file and add them to `BANGER_FLAVOURS`
in `styles/index.js`, then give each flavour a row in `sounds.js`.

### Fusions

Added on 7 Oct 2026, when Peter asked whether styles could be combined. A **fusion** plays
one style's **sound** over another style's **groove** (`styles/fusion.js`). Peter chose the
names SOUND and GROOVE; the code calls the two `music` and `beat`, because `sound` already
names the sounds table. Every part comes from exactly one of the two styles. Its sound, its channel strip, its section FX and the
seed part its fader is matched to are all that style's, so nothing has to be invented.

| From the GROOVE (`beat`) | From the SOUND (`music`, the style) |
|---|---|
| tempo, tempo range, swing | progressions, moods, mode walks, breakdown |
| every drum pattern, fill, roll and the half- and full-time drops | the arp and stab figures, `enter`, `padUnder`, `arpFixed` |
| the bass and sub rhythms (`offbeat`, `rolling`, `sub`, `subOff`, `pedal`), `bassFloor` / `subFloor` | every other register |
| the pump (the sidechain on the kick) | the master, the exciter, the riser, the FX moves, the form, the section labels |
| the kit, the percussion, the bass and sub sounds, and the bass's Random list | the hook doubles, the arp, the chords, the pad, the choir, the hook's Random list |
| the drum switches, the Bass and Sub settings and the pump in the defaults | every other default |

- **The tempo is the groove's.** A dembow at 138 is not a dembow. Overload's tempo boost
  applies to the groove's tempo, within the groove's range.
- **What a groove can be.** A groove is a style, one of its flavours (they are grooves of
  their own: Reggaeton · Romántico is 92 with a rim dembow), or one of its Sound Sets. Sound Set =
  Light puts both styles on their Light sets, where they have one.
- **Not combined yet:**
  - **A Sound Combo.** It is dropped with a warning.
  - **A groove's mood flavour on the desk.** The desk plays the groove as named; the Lab names
    the mood's flavour.
- **The name.** A fusion is a recipe like a flavour, never listed. It is named
  `fusion:<music>+<beat>`, and `styleFor` makes it again from that name. It has no seed song
  of its own:
  - its sounds are the two rows of `sounds.js` put together slot by slot (`sound-rules.js
    soundsRow`);
  - its channels are the two seeds' put together role by role (`fusion.js fuseChannels`);
  - its fader references are the two seeds', role by role (`levels.js`).
- **On the desk**, the dialog's **Infusion** list sits under Style, as INFUSION sits beside
  FORMULA in the Lab. It offers None, then every other style followed by its flavours.
  - **Which does what.** Style is the groove: it plays as it would alone, with its Flavour list,
    and keeps its tempo. The infusion is the sound.
  - **Picking an infusion** is like picking a style: everything under Full Options goes to the
    fusion's defaults (the style's drum switches, Bass, Sub and pump, and the infusion's
    everything else), keeping the mood, the length and the variation. With an infusion chosen,
    Style Defaults and Classic reset to the same.
  - **The generator's option** is `infusion`, the same fusion asked for from the groove's side.
  - **Older desk takes.** A desk take made earlier on 7 Oct, when this was a Groove field
    (`fusion`), re-makes as it was. Banger Settings… shows it the new way round; Modify keeps its
    groove unseen.
- **A take without a fusion** is exactly what it was before fusions existed: 840 takes across
  every style, checked byte for byte against the generator before the change.

Every key a recipe holds is either the groove's, the sound's, shared out part by part, or the
fusion's own. `tests/banger-fusion.js` fails on a new key until it is placed. **A new recipe
key** therefore goes in one of `FUSION_KEYS`' lists in `styles/fusion.js`, and a new rhythm
goes in `BEAT_RHYTHMS` or `MUSIC_RHYTHMS`.

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
| `tools/lib/banger/` | The generator, browser-safe: `index.js` (`generateBanger`), `riff.js`, `options.js`, `analyse.js`, `variation.js`, `form.js`, `sections.js`, `lanes.js`, `fx.js`, `theory.js` (the remix toolkit), `styles/big-room.js`, `styles/trance.js`, `styles/future-bass.js`, `styles/eurobeat.js`, `styles/chipstep.js`, `styles/kraftwerk.js`, `styles/synthwave.js`, `styles/shibuya.js`, `styles/dnb.js`, `styles/electro.js`, `styles/megadrive.js`, `styles/deep-house.js`, `styles/nu-disco.js`, `styles/downtempo.js`, `styles/eurodance.js`, `styles/italo-disco.js`, `styles/electro-funk.js`, `styles/french-house.js`, `styles/reggaeton.js`, `styles/moombahton.js`, `styles/merenhouse.js`, `styles/afro-house.js`, `styles/flavours.js` (a style's other arrangements), `styles/fusion.js` (one style's sound over another's groove) |
| `tools/lib/banger/sounds.js` | The sounds table — written by the Banger Sounds page |
| `tools/lib/banger/sound-rules.js` | The rulebook: every slot, and what may go in it |
| `tools/lib/banger/sounds-source.js`, `audition.js` | The table's serialiser; the two-bar auditions |
| `tools/banger-sounds.js`, `banger-sounds-entry.js`, `banger-sounds-shell.html` | The Banger Sounds page (:8022) |
| `tools/lib/banger-file.js` | Writing a banger song into `work/bangers/`, its takes, and the one-time move out of `work/scratch/` |
| `tools/lib/banger/form-types.js`, `templates.js`, `cohesion.js`, `transitions.js`, `form-edit.js`, `lead.js` | The kinds of section; the Pop Song, Anthem and Groove forms; the verse, pre-chorus and middle 8 grown from the hook; the joins; the form editor's moves; Write a Lead |
| `tools/lib/banger/theory.js` `grindOf`, `fitToChords`, `clearUnder`; `analyse.js` `chordFit`, `grindShare` | What grinds, and how the generator keeps it out |
| `src/game/banger/` | THE LAB: `riff.js` (the grid, two bars or four, ZAP's own riffs, `settleBars`), `maker.js` (the screen: bar numbers, + / −, the repeat, the lines), `game-riffs.js` (the cabinet riffs, two bars and four), `make.js` (the game's call into the generator), `store.js` (what is kept) |
| `tools/mixer-banger.js`, `tools/mixer-banger-form.js` | The dialog and the take buttons; the Form row's strip and editor |
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
| `tests/banger.js` | Tests for the generator, the riff reader, the song file and the takes, and that nothing grinds |
| `tests/jukebox-banger.js`, `tests/banger-game-riffs.js` | Tests for THE LAB: the grid, + / −, the repeat, the lines, ZAP and the cabinet riffs |
| `tests/banger-sounds.js` | Tests for the sounds table, the rules, Save, and the generator playing the table |
| `tests/banger-flavours.js` | Tests for the flavours: chosen by the mood, by name, by the seed and by the Lab's voltage, and what each one changes |
| `tests/banger-fusion.js` | Tests for fusions: every recipe key placed, every pair of styles made at its groove's tempo, each part on its owner's sound and fader, the Lab's FUSION box |
| `tests/banger-forms.js` | Tests for the forms: every length exact, every style valid, drawn forms re-made exactly, the verse/pre/middle 8 promises, the joins, the groove, the editor's moves |

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
