# The Song Mixer

`npm run mixer` → http://127.0.0.1:8010/

A mixing desk for MASHENSTEIN's songs, running in a browser tab. It plays the game's
own audio engine — every fader on screen moves the same channel strip the game will
use, and the same one the offline renderer runs when it writes a WAV, a stem or a
video. Nothing in the tool reimplements audio.

What it writes is the current song's source file: built-in songs live under
[`src/data/songs/`](../src/data/songs/) and writable scratch songs under
[`src/data/imported/`](../src/data/imported/). Per-song trims, pans, EQ, sends,
effect chains, arrangements and note edits stay together in that file. Peter
reviews and commits; the mixer never touches git. Scratch files remain outside the
game catalogue.

- **Port / host** — `MASH_MIXER_PORT=8011 npm run mixer`, `MASH_MIXER_HOST=0.0.0.0`
  to reach it from another machine. Port 8010 by default; if it is taken the process
  says so and exits rather than fighting for it.
- **Live rebuild** — the page is bundled per request, so saving an edit to the engine
  or to the desk and refreshing picks it up. No restart, *unless* you add a server
  route (those live in the Node process).
- **Audio gate** — browsers will not make a sound before a gesture, hence the
  *Click to start audio* screen on load.

---

## The desk, top to bottom

| Panel | What it answers |
| --- | --- |
| **Header** | what is loaded, how it plays, where it is, what happens to the work |
| **Timeline** | where you are in the song, in bars |
| **Arrangement** | which instrument plays in which bar, and what it plays there |
| **Notes** | the piano roll for the selected channel, over the bars you picked |
| **Mixer** | the rack: master, channels, send returns |
| **Effects** | the selected strip's device chain, with room for parameters |
| **Keyboard** | a floating window: play the selected channel, and watch it play |
| **Footer** | song title, beat, master peak, keyboard help |

Timeline, arrangement, notes, mixer and effects each have a **fold chevron** on the
left of their caption, and the strips are sized to the window every time anything
moves.

**Why Notes sits where it does.** It is driven from both sides of that position.
Double-clicking a cell in the arrangement directly above is what opens the roll on
that lane and that bar; the selected strip in the mixer directly below is what the
roll stays scoped to. Effects keeps the bottom, hanging off the rack it belongs to.

**Where the space goes.** Exactly one region is elastic at a time, picked in this
order: the **rack**, then the **arrangement**, then the **notes panel**, then an
empty band of desk. That is a priority, not a position — it says who absorbs slack,
and it is unrelated to the order the panels appear in down the page. Whatever a region
cannot use passes on down that list — the arrangement is snapped to whole lanes, so
once it is showing all of them the rest goes to the notes panel rather than stopping
at the band. Fold the mixer and the arrangement grows and then the piano roll takes
what is left; fold all three and you get the plain band — with the footer still on the
bottom of the window in every combination. Header,
timeline and footer sit outside the resizable part of the page, so a window too short
for every panel's minimum scrolls the desk rather than pushing them off the screen.

---

### Dropdowns

Every dropdown on the desk is the desk's own — the closed field and the open list both.

A native `<select>` can be styled down to its border and no further: the list it opens
belongs to the operating system, its font included, and no CSS property reaches inside
it. On a desk with nine themes that made every dropdown a slab of Aqua dropped over the
mix the moment it was opened, and the one control here that could not be read at the size
everything else is read at. Fields and lists are now **12px** across the whole desk,
whatever column they sit in.

They behave the way the closed field says they do: click or `Enter` opens, arrows walk
the list (stepping past any row that is closed), `Enter` takes the row under them, `Esc`
and `Tab` shut it, and a list with no room below it opens upwards with its chevron turned
over. A list inside a dialog opens **in front** of the dialog.

Under the hood the native control is still there, out of the layout, holding the value —
which is why every panel's existing wiring works unchanged. See `tools/mixer-select.js`;
new dropdowns need no registration, because the sweep watches the document rather than a
list of call sites.

## Header

### Song

The **hamburger button** (far left) opens the unified Song Desk drawer. It slides over
the desk with a backdrop. New/Open, up to five recently opened songs (MRU-first), a
permanently visible title/ID search, and the action sections are open by default. The
single-column song list is grouped as *themes*, *cabinets*, *shop auditions*, *scratch
songs* and *MIDI imports*; each group starts collapsed and can be opened independently.
The current song is highlighted; selecting
one closes the drawer. The recent list is kept in browser localStorage.

**New song…** creates a source-backed scratch song without adding it to the game. The
dialog accepts a title, 1–64 bars, a **style**, and one of three starters: **Blank**
(a visible silent melody lane), **Beat** (the style's own kit), or **Full Band** (the
kit plus bass, chords and melody). The title is
prefilled with an adjective-and-noun name no other song is using — `PINK SCOOTER`,
`HAPPY DOLPHIN` — so a new song is memorable rather than `UNTITLED SONG 3`; clearing
the field lets the server pick one. The other defaults are 8 bars, Blank, and Auto
style. BPM starts **empty**, meaning "the tempo this style is written at"; a number
typed in the 40–240 field still wins.

The style is a **pack** — [`tools/lib/song-styles.js`](../tools/lib/song-styles.js) —
and it decides the whole character of the generated song: its tempo, its key and mode,
its harmony, its kit, its melodic grammar, which lanes it uses at all, and which voices
those lanes play. Auto lets the creation seed pick one. The eleven are *Electropop*
(120 BPM, the engine's own voices — the starter the desk has always opened with),
*Half-time Dirge* (72, reed organ and a taiko), *Surf Spy* (152, harmonic minor,
plucked lead), *Boom Bap* (88, dorian sevenths on an electric piano), *Motorik Driver*
(168, one chord and straight eighths), *Bell Box* (96, **no drums at all** — music box,
celeste and a glass pad), *Parade March* (112, major, brass and strings), *Dub
Chamber* (76, one drop, organ skank, everything in the echo), *House* (124, clap on the
backbeat, open hat off it, seventh-chord piano stabs), *Techno* (136, phrygian, dirty
kick and cowbell over a rolling acid bass) and *Electro* (126, robot pop — a sequenced
bell arpeggio over handclaps, with a hollow vocoder-ish lead).

Within a pack the stored creation seed picks the key, the progression, the harmonic
rhythm, the kit patterns, the bass figure and the melody's rhythm and contour — so
each new song is different while remaining repeatable and musical. Transposition is
real: a pack's harmony and melody are written as scale degrees, so the same pack in D
reads D minor, with per-lane registers keeping the bass and the tune where they were
written for. Rhythm and contour are chosen separately, which is what gives a generated
melody rests and syncopation rather than an unbroken run of eighth notes.

A pack writes its instruments into the **bank** — `leadVoice`, `kickVoice` and the
rest — because the instrument a song is composed for is part of the composition, and
because the desk only ever rewrites the half of the file below its own marker. Every
strip therefore opens at 0 dB with no mix at all, and the desk's voice picker shows the
pack's choice as the lane's engine default; choosing a preset on the strip still
overrides it. Each pack also carries a measured `drumGain`/`musicTrim` pair: `drumGain` puts the
pack's kit 0.8 LU under its instruments — the balance the Electropop starter measured
when it played the engine's own voices — and `musicTrim` lands the whole pack on
−22 LUFS, where the game's own cabinet songs measure, so the picker does not shout at
you every third choice. Both are re-derived by measurement whenever the voice library
is re-levelled; see the note at the top of `tools/lib/song-styles.js` for how. Techno is the one deliberate exception: its kit is
meant to lead, and its numbers keep it leading rather than flattening it to the pop
balance. A pack may only name Tone, Noise or Drum presets — an `eng*` preset is a
bundle of bank keys that nothing expands on a song with no mix, so it would silently
do nothing.

Every voice a pack names is a **frozen starter** — `stRoundMono`, `stKickPunch` — held
in the `STARTER` table of `src/data/voices.js` and written only by
`tools/freeze-starter-voices.js`. They are complete copies of library presets, taken
once, and nothing can edit them: `TABLES` in `tools/lib/voices-source.js` does not list
`STARTER`, so `tableOf` cannot find one, the desk's voice editor refuses to open one,
and `POST /voice-save` refuses to write one. That is what makes a starter a starter. The
library preset each was copied from is a read-only reference too; duplicate it to create
an editable user preset. User presets live in the `USER_TONE`, `USER_NOISE` or
`USER_DRUM` table and can be updated or deleted from the desk. Regular users edit a
library copy and use **Save as New**; the local developer can additionally enable
in-place library updates and library-preset creation/deletion. `npm run mixer` starts
in DEV mode by default; add `?dev=0` to the URL for a regular-user tab, or set
`MASH_MIXER_DEV_USER=0` for a server-wide regular-user session. In dev mode, **Save** offers **Update** or
**Save as New**; the latter writes another library preset. Every song naming a
library preset continues to use the shipped sound, while a song-local copy remains
editable for that song. Starters are left out of the picker, since they would be a second row
for a sound already listed; a lane already playing one still shows it, and duplicating
one gives you an ordinary editable preset of your own. Scratch songs can be
edited, saved, rendered, exported and restored like built-in songs; marker-less legacy
MIDI imports remain read-only.

### Transport

| Button | Does |
| --- | --- |
| ⏮▶ **Play from top** | jumps to bar 1 and plays |
| ■ **Stop** | stops and returns to where playback last *started* |
| ▶ **Play** | plays from where the playhead is parked (`space`) |
| ⏸ **Pause** | stops where you are; Play carries on from there (`space`) |

Four buttons rather than one that changes its meaning: Pause holds position, Stop goes
back to the top of the take, and a button you have to read before aiming at is a
button you cannot aim at.

### Rearrange

**Rearrange** is a temporary audition layer. **Generate** builds a same-length recipe
with a song-shaped roadmap — verse, chorus, verse, bridge and final chorus/outro where
the source is long enough — then fills each four-bar section with repeatable, musical
source slices. Most sections alternate half-bar or bar cells (A–B–A–B), with longer
source grabs kept occasional. The four-bar roadmap above the list shows each output block
and its bar range; click a block to play from its beginning. The list shows the section name,
source range, repeat count, output position and any small shared melodic transpose. Tap the **👍** beside a section to keep
that section as an anchor; the next **Generate** reuses it (and returning sections of the
same role) while rebuilding the other sections. When used, a transpose is a gentle
whole tone, perfect fourth, or perfect fifth shared by the pitched lanes. Chorus source phrases favour the
denser parts of the current arrangement, while verses and bridges provide contrast.
#### Style and Variation

**Style** decides how big the cuts are and what they line up to. It is a hard rule
rather than a leaning, so a chosen style can be relied on:

| Style | Cell lengths | Source starts land on |
| --- | --- | --- |
| **Phrase** | one, two or four bars | bar lines |
| **Groove** (default) | half-bar and bar, occasionally two | eight-step boundaries |
| **Chop** | beat and half-bar | beats |

**Variation** dials between motifs that keep coming back and fresh material each time.
At **Familiar** a section establishes a cell and returns to it, and the generator takes
the best-sounding slice available. At **Different** it reaches further for material it
has not used.

Under **Advanced**:

- **Chord loop** (default Auto) walks every four-bar Verse, Chorus and Bridge around a
  four-chord loop of the song's own key, one chord per bar — the way modern pop and
  dance music moves; Intros and Outros stay put. The movement is *diatonic*: each note
  steps within the scale, so an Am riff played "as the VI" comes back as F major with
  the right chord quality, not as a flat pitch-shift. The minor palettes are the club
  standards — `i–VI–III–VII` (the EDM loop), `i–v–VI–iv` (house), `VI–VII–i` (the
  anthem build), `i–iv–VI–v` (dark pop) — and Auto picks one per part, the same one
  for every return of that part. Major-key songs always take the axis progression
  `I–V–vi–IV`. The key travels in the saved JSON so the recipe replays identically
  anywhere.
- A part that walks is built as **one bar-length cell repeated four times** — the club
  shape. Progressions over alternating A/B cells re-harmonised phrases that were
  already answering themselves, and sounded like it; the A/B and collage shapes still
  appear in parts that play their written harmony.
- **Walk** sets how much of each four-bar part actually changes chord: **Last two
  bars** (default — the riff holds home, then moves: `i–i–III–VII`), **Turnaround
  only** (`i–i–i–VII`, the subtlest), or **Full loop** (every bar).
- **The key** comes from the song analysis, which runs at any parked moment — opening
  the panel, switching songs under it, pausing, or pressing Generate — never during
  playback, which always wins. The readout beside the picker shows what was found; an
  unclear reading is shown with a `?` and still used (ambiguity is nearly always the
  relative major/minor pair, which walk the same notes). The **key picker** overrules
  the analysis outright: name the key and the loops trust you.
- **Allow glitches** is the only thing that permits one and two-sixteenth cuts and
  starts off any musical boundary — nothing else reaches them.
- **Transpose** (Off by default) is the older *chromatic* lift — every note the same
  distance. When it is on, the interval chosen is the one that leaves the section
  agreeing best with what was just heard. **One pitch system per recipe:** while a
  chord loop is on, this dial is disabled and ignored entirely — set the loop to Off
  to hand pitch back to it.

The chords are visible everywhere they act: the detected key sits beside the Chord
loop control the moment the panel opens (or says "no clear key" / "no analysis yet"),
each rail card states its walk bar by bar (`i – VI – III – VII`), every list row has a
fixed chord column showing the numeral it plays as (empty means as written), and the
playback status names the chord currently sounding.

Where the song can be analysed, Generate also **scores** its choices instead of only
rolling them. It avoids cutting into notes that are still sounding — preferring a
longer phrase to a boundary that would slice a chord in half — matches the pitches of
neighbouring slices, and draws choruses from busier material than verses. The analysis
runs when the panel is opened while parked; generating during playback uses the last
one rather than interrupting the audio to walk the song again.

These settings affect the next **Generate** only. The saved JSON contains the resulting
operations, so loading a recipe does not depend on where the controls are.

#### Playing and editing

Use **▶** or double-click a row to audition from that section/bar — these jump straight
in, with no count-in. **👎** marks a section for replacement, asking the next Generate
to choose a different source area. **Play Rearrangement** is the one start that counts
in: four beats — one accented click, then three identical — before the recipe's top,
while the ordinary transport controls continue to play and pause it. **Exit M8TRX**
clears the recipe and restores the ordinary loop controls.

**Edits made while it is playing are heard from the next bar.** Generate, the drum mode
and every slice transform install at the next output bar line rather than stopping the
transport — no restart, no second count-in, and the note cache stays warm. The panel
marks the rows as a draft until the change is actually consumed by the scheduler, which
with a wide sequencer read-ahead can be a bar later than the arithmetic suggests. Making
several edits before the boundary installs the latest one, once.

#### Drums

The **Drums** button cycles three treatments, all Rearrange-only and all stored in the
recipe JSON without ever changing the song's own drum lanes:

- **Song groove** (the default for new recipes) plays the song's authored percussion at
  the *output* clock, so the groove runs straight underneath a rearranged top. The output
  bar's own section, mute mask and bar are resolved for it, and a frozen percussion stem
  simply plays from the output position. This is what makes a chopped arrangement sound
  played rather than assembled.
- **Chopped drums** cuts the drums along with everything else, following each slice's
  source position. This is what a recipe with no `drums` field means, so every recipe
  saved before Song groove existed keeps the behaviour it was auditioned with.
- **Steady 4/4** leaves the source kit voices and their arrangement mutes in place, but
  replaces their authored triggers with exact kick beats 1–4, snare/clap beats 2 and 4,
  eighth-note hats, and restrained rim, tom, open-hat and crash fills.

In the piano roll, drag a beat range and press **Fav +** to make that range a session
favourite. Favourites are whole-band source slices: every later **Generate** includes
each one once (untransposed) while the surrounding sections are rebuilt. The Rearrange
status shows how many are armed; they are cleared when you switch source songs, and are
not written into song, mix, arrangement, or recipe JSON data.

Each operation row also has a square selector for targeted remixing. Select just the
16th/eighth-note pieces you want, then use **Split halves** to interleave the two halves,
**Unroll repeats** to turn a compact repeated row into individually selectable pieces,
**×2 loops** to turn a cell into a tighter repeated figure, **÷2 loops** to join repeated
passes into a longer source phrase, **Reroll selected** to choose new source material
for only those rows, or **Remove selected** to replace a slice with nearby material.
Remove also preserves the exact output duration, compacting adjacent repeats where it
can; unsupported combinations stay unchanged and explain why in the toast.

The recipe does not change the mix, arrangement, normal Save, WAV, or MIDI export. Use
**Save JSON…** and **Load JSON…** in the Rearrange list to keep the versioned recipe. A
loaded file must name an available source song with the same number of transport steps;
loading never starts playback automatically. Generated JSON also carries a readable
`form` array with contiguous output ranges for the named sections; older v1 files that
only contain `operations` remain loadable.

### S — clear solo

Lit whenever *anything* on the desk is soloed, channel or send, wherever it is in the
rack. One click clears the lot. Solo is monitoring only: it is never written to the
mix and never appears in a diff, which is exactly why it needs a light that can always
be seen.

### Loop

| Control | Does |
| --- | --- |
| **Loop** | arms the loop over the shaded region on the timeline (`L`) |
| **1 / 2 / 4 / 8 / All bars** | how long the loop is (`1` `2` `4` `8` `0`) |

The region starts at the bar containing the playhead and snaps to bar lines. With a
loop armed, clicking the timeline *moves the loop* rather than escaping it. Default is
1 bar, but the loop starts **off** — pressing Play gives you the whole song.

### Readouts

| Readout | Meaning |
| --- | --- |
| **Bar** | bar under the playhead, of the song's total |
| **Time** | position / length of the song form |
| **BPM** | **draggable.** The tempo the song is played at, 40–240. **Saved with the song**, on its `arrangement` — the bank keeps the tempo it was written at. Teal while it differs from that; click to go back to it. |
| **Swing** | **draggable.** How far off its own grid the whole song is played, 50–75%. Saved the same way, on the same `arrangement`. Teal while it is not straight; click to go back to straight. |
| **CPU** | rough load: the engine's own ~10% plus every active effect's measured cost. Red past 45%. Hover for what is running. |

Tempo drags carry the tempo-synced delay and every division-based insert with them, so
half-speed really is the same mix at half speed. The drag is an ordinary song edit —
⌘Z undoes it, the dot on the hamburger notices it, **Save song** writes it, and the game
and every render tool then play the song at it.

**Swing** is the same kind of edit about feel rather than speed, and travels the same
way. Every song here is written as a grid of sixteenths; this is how far off that grid it
is played. The number is the on-grid sixteenth's share of its pair:

| | |
| --- | --- |
| **50%** | straight — the grid, and what every song is written as |
| **54–62%** | where most funk, hip-hop and house actually sit |
| **66%** | the triplet shuffle — a true 2:1 |
| **75%** | dotted, hard shuffle — 3:1 |

Only the **off-beat** sixteenth moves. The beats stay exactly where they were composed,
which is why one number can cover a whole song: a pad or a chord on a downbeat does not
shift at all, and the groove is entirely in the notes between the beats. A note keeps its
written length and simply arrives later, so a swung off-beat on a legato lane runs a
little further into the next beat — audible as slight legato, and nothing at all on a
kit.

Swing reaches every lane the same way, whether it plays on the engine's own voice or one
you assigned from the library — those are two code paths for the same note, and they are
held to the same clock.

**Rhythmic gate inserts follow the swing too.** A gate is handed the step number by the
sequencer, so it knows which sixteenth each of its pulses lands on and moves the off-beat
ones exactly as a note moves. At 1/16 it tracks the shuffle; at 1/8 dotted it alternates
on-beat and off-beat, which is the pattern only something that knows the grid can play.

**The delay cannot, and that is a real limit rather than an oversight.** A delay line
applies one fixed interval to whatever arrives; swing is a grid that moves every other
sixteenth. Whether the two agree comes down to **parity**:

| Division | in sixteenths | Under swing |
| --- | --- | --- |
| 1 bar, 1/2, **1/4 dotted**, 1/4, 1/8 | 16, 8, **6**, 4, 2 | lands on the groove exactly |
| **1/8 dotted** | 3 | flams — 42ms at 120bpm, 66% |
| 1/16 | 1 | flams — 42ms |
| 1/16 dotted, 1/32 | 1.5, 0.5 | flams — 63ms |
| any triplet | 8/3, 4/3, 2/3 | flams — 83ms |

An even number of sixteenths maps on-beat to on-beat and off-beat to off-beat, so the
echo inherits the swing for nothing. Anything else crosses to the other side of the beat
at its straight position, which is where the groove isn't. Note that dotted **quarter**
is safe while dotted **eighth** — the familiar one — is the worst of the common choices.

There is no fix inside a delay line: the interval a swung note needs depends on which
side of the beat it started from, and a delay has no way to know. On a swung song, stay
on the safe divisions, or use the flam on purpose.

Continuous modulation — pan across a bar, filter sweeps, tremolo depth — is unaffected
and wants nothing done to it. There is no attack for the ear to place against the grid.

The step grid and the piano roll stay evenly spaced through all of this. Swing is a feel,
not a re-gridding — the notes are still on those steps, and moving the drawing would only
make them harder to edit.

### The four panel buttons

Top right, before **A/B saved**, one square button per panel you can put on the desk —
all four the same box, because they are the same kind of control:

| Button | Opens | Key |
| --- | --- | --- |
| **piano keys** | the on-screen keyboard — play the selected channel | |
| **step grid** | the kit's step sequencer, as a floating window | `G` |
| **piano roll** | the selected channel's part, in the effects region | `N` |
| **faders** | the preset library | |

The grid and the roll are **two buttons because they are two panels**: either can be up
without the other, and one control could not say which. The roll's button and the
region's **Notes** chip are the same switch in two places and light together.

Hovering any of them — and **A/B saved** and **Undo** beside them — brings up a tooltip
card naming the panel, saying what it is for, and showing its key. A picture is not a
label, so the sentence is the point; the browser's own one-line tooltip could not carry
it. Reaching a button by keyboard shows the same card at once.

### ⌨ — play the selected channel

The piano button opens the **on-screen keyboard**: a
floating window that plays whatever channel is selected, and shows what it is playing
while the song runs. Over on the right rather than by the transport, because the
transport is what the *song* does and this is what *you* do. Drag it by its title bar;
it remembers where you put it. It is a window rather than a menu — it stays open while
you work, and clicking away does not close it.

The desk remembers this workspace per song: whether the keyboard is visible, whether
the step grid or piano roll is open, and which melodic lane the roll is editing. A
song you have not visited yet inherits the current workspace once; returning to it
restores its own layout. This is browser desk state, not a Save-to-game edit.

Splitter positions are remembered too, and the desk now honours them further than it
used to: the mixer's floor is a bare strip rather than a full-size one, so a height
that was quietly clamped before is applied in full. The first launch after that
change may not look quite like the last one — double-click either grip to go back to
the automatic fit.

| | |
| --- | --- |
| **A melodic channel** | two octaves of keys, opened at the octave that channel's own part is written in. ◀ ▶ shift it. Click a key, or drag across them to glide. |
| **A drum channel** | the song's whole **kit**, one pad per drum, rather than two octaves of keys that all play the same kick. Each pad plays its own channel; drag across them for a roll. |
| **Keyboard** | plays from the computer keyboard. `Z S X D C V G B H N J M` is the lower octave with its black keys, `Q 2 W 3 E R 5 T 6 Y 7 U` the one above, carrying on through `I O P` and `[ = ]`; `−` and `+` shift the whole board, and `,` is the C above M. The home row plays pads on a kit. While it is lit the desk's own letter shortcuts (`M S R B L`, `[` `]`) are yours to play with; `Alt-click` the timeline to place the two loop locators. `Esc` gives the shortcuts back. Shifted keys are never claimed, which is what leaves `⇧R` free to arm recording with your hands still on the notes. |
| **MIDI** | plays from a real MIDI keyboard over Web MIDI (Chrome and Edge). Ports that arrive after you switch it on are picked up too. On a kit, General MIDI's drum notes land on the right pads — 36 on the kick, 38 on the snare, 42 on the hats — and anything unmapped falls back to pad order. |
| **Record** | writes what you play into the song. See below. |
| **The dot** | lit whenever the channel is sounding — including a drum, whose own note is nowhere near this keyboard. |

**Velocity is ignored on purpose**, from all three: a preview's level is the channel's
own, the way its voice is, and a note at half of it is a preview of a mix decision
nobody made. There is nowhere for it to go either — a bank has no per-note velocity
field, because level is a property of the channel rather than of the note.

Note-off *is* read now, and only recording has a use for it: see **Record**.

#### Record

Arm it and play, and the notes are kept. All three inputs write — the drawn keys, the
computer keyboard and MIDI — because all three arrive at the same one-note seam.

**Record is in the transport**, last, after Pause — where a record button has been on
every deck since tape, because it arms what the transport is about to do. A red dot at
rest; while it is writing the whole button goes red with a white dot in it.

**MIDI is on the right**, with the panel toggles, because that is what it is: *which
instrument plays this channel* — the same question the ⌨ button answers.

Neither needs this window. A MIDI keyboard is a real instrument, your eyes are on your
hands or on the roll filling up, and a window you are not looking at is a window in the
way. Only the *computer* keyboard needs the keys open, because that is where the desk
hands its letters over.

Recording is realtime: the transport rolls, you play along, and everything lands on the
nearest sixteenth. The natural gesture is the desk's own — **loop two bars, arm, play,
and hear it come round on the next pass.** Arming while stopped is legal and is the
count-in you get for nothing: capture begins the instant you hit space. There is no
click track to count you in with, and looping is a better one anyway, since you hear
the bar before your entry on every single pass.

| | |
| --- | --- |
| **Armed** (amber, hollow dot) | waiting for the transport. Nothing is being written yet. |
| **Recording** (red, pulsing) | writing. The keyboard's border and the playhead say so too, and the header button goes red with a pulsing white dot. |
| `⇧R` | arm or stop, from anywhere on the desk. |
| `Esc` | stop, and drop whatever has not been written yet — half a second's worth at most, since the take is written every beat. Use `⌘Z` for the part already in the song. |
| `⌘Z` | a bar's worth of playing is one undo step. |

**Keeping it.** Nothing to do to keep a take *on the desk* — each beat's worth goes
straight into the song's arrangement draft, which is written to `localStorage` and is
still there after a refresh. It is the same draft a painted note or a moved fader lands
in, so the song shows as changed and `A/B saved` will hold it against what is on disk.

To keep it **on disk you have to Save the song**, exactly as with every other edit. Until
then it is a draft: `Revert` throws it away with the rest of them, and a song imported
from a `.mid` cannot be saved at all.

What it does and does not do:

- **How long you hold a key becomes the note's length**, written into the lane's
  `*Len` array exactly as the piano roll's resize handle writes it. On a chord channel
  every tone keeps its own, so an arpeggio held down into a chord records as the shape
  you played rather than as one block. Worth knowing what
  that buys: a length is a *scheduled duration*, not a gate, and most of the
  hand-written voices cannot sustain — so a three-second hold on a voice with a 200 ms
  envelope still sounds like 200 ms. It is the difference between a stab and a held
  note on the lanes that can ring, and nothing at all on a kick. Drums get no length.
- **It only adds.** Recording never removes a note; erasing is the piano roll's job.
  A recorder you could leave armed and a recorder that could delete are two different
  tools, and this is the first one. Play a wrong note and it joins the part — `⌘Z`, or
  rub it out in the roll. Notes accumulate across passes of the loop, so building a part
  up one note at a time over several passes is exactly what it is for.
- **Chords record on any pitched channel**, whatever it is voiced with — bass, lead,
  harmony, twinkle and the two chord channels alike. Nothing has to be set up first.
  Notes struck within about 45ms of each other are treated as one chord and land on the
  same step, so a hand that spans a rounding boundary does not come out as a note plus a
  dyad a step later.
- **Four channels cannot**, and none of it is about the synth: the **drums** (a step is a
  hit, not a pitch), the **gesture** channels — glissando, sweeps, organ swoop, electro fx
  — where a step starts a shape whose timing lives inside the gesture rather than a note,
  and **vox** / **shout**, where a step picks a *word* and the formant path is keyed to it.
  Two words at once is not a chord. The desk says which, once per take.
- **The piano roll has the same reach**, via the roll's own **CHANNEL** switch — see
  [Mono and Poly](#mono-and-poly) below. It starts *Mono* on a single-note part, so
  clicking a new pitch on an occupied step still replaces it, which is what you want
  while you are correcting a line. Set it to *Poly* and the mouse stacks the way the
  recorder does.
- **It changes the pattern, not one bar.** A note played into a looping section lands
  in every bar that plays that part, which is the same choice the step grid's "edit all
  repeats" makes. The alternative would put your note in bar 1 of a four-bar section and
  bring it back every fourth pass, which reads as dropped notes rather than as an edit.
- **Recorded starts and held lengths are quantised to sixteenths**, because a bank holds
  sixteen note-start steps to the bar. Once a note is in the piano roll, its per-note
  length is independent of that start grid and may be fractional; the **Length** menu
  can explicitly quantise selected notes or the whole track back to 16ths.
- **A drag is not a note.** A glide across the keys or a roll across the pads is a
  gesture for *finding* a note, so only the press is recorded. A roll is a real musical
  gesture and one day should be recordable; a glide never was.
- **On a song imported from a .mid**, recording works and survives a refresh, but Save
  is off on those songs — there is no desk marker to write below — so the take can never
  reach disk. Arming says so.

A take is buffered and written **once per beat**, not once per note: a note edit pushes
an undo step, revalidates the arrangement and rebuilds the timeline, so a per-note commit
would mean one undo step per key and a desk rebuild between them. A beat is about half a
second at 120bpm, which is how long a note takes to appear in the roll after you play it.

Those writes are free because they *coalesce*: edits less than 700ms apart collapse into
one undo snapshot, so a continuous phrase is a single `⌘Z` rather than one per beat. Leave
a gap longer than that and the next thing you play becomes its own undo step — which is
the useful way round, because `⌘Z` then takes back the phrase you just played instead of
the whole session. The intermediate writes are silent rather than toasting four times a
bar. When the take ends, one completion toast reports the number of notes and the lanes,
and reminds you that `⌘Z` undoes it and **Save** keeps it. The engine takes each write
without stopping, which is what lets you hear the take on the next pass.

Nothing here is a second synthesiser. The sequencer plays the note, handed a bank with
nothing in it but that note ([`soloBank`](../src/engine/lanes.js) →
[`AudioSys.previewNote`](../src/engine/audio.js)), so a key sounds the channel's own
voice, gain and note length through its own strip — **fader, pan, EQ, sends and every
effect on it** — and onto the master, meters included, whether or not the song is
running. Which also means a muted channel is silent here, and a channel goes quiet
while another is soloed; the title bar says which, in amber, when it happens.

Stopping the desk pulls the song bus down to silence — that is how it kills whatever
the sequencer had already queued into its lookahead — so a preview opens it again at
the song's own trim, or every key on a stopped desk would land 80 dB down. A song
*change* still gets its half-second gap: that one is there so the old song's tail
cannot run into the new one's downbeat, and a key pressed inside it is not a reason to
hand the tail back. Opening a song *stops* the one that was playing rather than merely
ducking it — every note it still had sounding is cut, which a drawn note bars long
needs and a note a step and a half long never did. What rings on is only what is past
the channels: the reverb and echo returns, decaying with nothing left feeding them.

While the song plays, the keys light with the notes coming through the channel — the
part as it is played, in the octave it is played in. Notes above or below the two
octaves shown light the ◀ or ▶ button instead, which is both "there is more" and which
way to go for it. On a kit, the whole row lights as the beat goes past.

All three inputs — the drawn keys, the computer keyboard and MIDI — are callers of the
same one-note seam, which is why the third one cost thirty lines. Recording is the
fourth, and cost about as little for the same reason: it hangs off the same two
functions, and the part that decides what a note *is* it borrows from the piano roll
rather than restating ([`note-recorder.js`](../tools/lib/note-recorder.js) owns the
clock and the buffer, and nothing else).

The fifth would be a **step recorder** — transport parked, each note landing on the
playhead and advancing it — which is the same take buffer and the same flush with a
different clock in front of it.

### Quantise, and what the grid is showing you

**QUANTISE** is the roll's snap: where a note you draw or drag lands, from `1/4` down to
`1/32`, and the triplet of each — `1/4T`, `1/8T`, `1/16T`, `1/32T`. It stops there on
purpose. A `1/64T` is reachable on the grid a `1/32T` needs, but a plain `1/64` is not,
and offering the triplet without the note it is a triplet *of* reads as a bug.

**It is also the only control over the song's note grid**, and that is deliberate. Songs
hold sixteen note starts to the bar; picking a triplet snap widens that to 48 (or 96,
where the song also uses thirty-seconds), and saving narrows it again to the coarsest
grid that still holds every note written. There is no resolution setting to go with it —
a raw one would either be undone on save or leave songs paying for a grid they never use.

**The roll draws a column per snap division**, which is not the same as a column per slot
the song can hold. One triplet keeps a whole song on the wide grid, and drawing all
forty-eight columns a bar for a song that is otherwise straight sixteenths makes it read
as a triplet song. So on `1/16` you get the sixteen columns you expect, and any note that
falls between two of them is drawn *between* them — a shorter mark standing a third or a
half of the way across its cell. Nothing is hidden and nothing has moved: click it, drag
it, stretch it, rub it out, exactly as with any other note. Move the snap to `1/16T` and
the same bar is drawn in twenty-four columns with the triplets on lines of their own and
the straight sixteenths now the ones in between.

The **step grid** has no snap of its own yet and draws every slot, so it is where a wide
song looks widest. To put a triplet on a drum lane, set the snap in the roll first.

### Mono and Poly

**CHANNEL**, the first switch in the piano roll's left gutter, above **DRAW LENGTH**.
It says how many notes the selected channel holds on one step, and the two words mean
what they mean on any other desk:

| | |
| --- | --- |
| **Mono** | one note a step. Drawing another pitch on an occupied step **replaces** what was there, which is how you correct a note. |
| **Poly** | a chord. Drawing another pitch **adds** to it; clicking a note that is already in the chord takes that one out. |

**Chord channels start Poly, every other channel starts Mono.** That default is the
point of the switch rather than an oversight it works around: most of the parts in the
game are single-note lines, and on those the click that lands on a note you already
drew is nearly always you fixing the pitch, not you asking for a dyad. Making every
channel chordal would turn that one gesture into stack-then-erase across some thirty-five
parts to buy something four of them wanted.

Nothing underneath is monophonic. A step has always been allowed to hold a list of
frequencies, and every pitched voice loops over that list, so **bass**, **lead**,
harmony and twinkle play a chord as readily as the chord channels do — the keyboard
recorder has been stacking on them all along. The switch is the same capability handed
to the mouse.

Three things worth knowing:

- **It is remembered per channel, and only where you changed it.** Setting *bass* to
  Poly does not follow you to *lead*, and *chords* is still Poly when you get to it.
- **It is not remembered between sessions.** A stale Poly on a bassline a week later
  turns the click that corrects a note into the click that stacks onto it, and the
  wrong default here costs work rather than a keystroke.
- **A step that already holds a chord stays a chord either way.** Mono governs what a
  *new* note does; it never flattens a chord you recorded or imported, so you can pick
  one tone back out of it without touching the switch. Right-click still rubs out the
  wrong one.

On **vox** and **shout** the Poly button is struck through: a step there picks a *word*
and the formant path is keyed to it, so two at once is not a chord and the engine would
drop the extra tone. Shown rather than removed, so the switch does not change shape as
you move down the channels.

### Limiter · A/B · Undo

- **Limiter** — the master limiter, on or off. It costs 6 ms of output latency
  whenever it is on, so a song renders differently with it than without; fix the peak
  on the channel causing it first.
- **A/B saved** — *hold* to hear what is on disk, release to come back to your draft.
- **Undo** — one step back (`⌘Z`). Slider drags coalesce: a continuous move is one
  gesture, not one step per pixel. 200 steps deep, and it spans songs — undoing back
  past a song switch takes you to that song.

### Project

The **Song Desk drawer** keeps the project actions together: save or discard this
song, open history, reset channels, render or audition, import/export MIDI and JSON,
open the preset library, and adjust desk settings. The hamburger carries the existing
unsaved-work dot. Drafts remain in `localStorage`; the dot means the current source
file does not yet contain those changes.

The **piano**, **step-grid** and **preset library** buttons share the header toolbar.
The Arrangement header has a plain white **+** at its right edge. Clicking it stages a
brand-new independent track and opens the preset selector beside the plus; the track is
created only after a sound is chosen, so closing the selector leaves no empty channel.
Then edit its pattern in the step grid or piano roll. Duplicate and delete stay on the
arrangement track's right-click menu, with `⌘Z` restoring a deleted track.

| Menu item | Does |
| --- | --- |
| Save song | writes this song into `src/data/songs/<id>.js`, or a scratch song into `src/data/imported/<id>.js`, after a confirm. Mix, arrangement and editable notes are written together. Scratch files remain outside the game. |
| Save a copy… | Save As. The whole song under a new name — its music, this mix, this arrangement with every bar edit and note in it, and its cabinet screen — as a song of its own. Nothing else is written and nothing in the game moves. See [Copies](#copies) |
| Save as alternate… | keeps what is on the desk as a *named* song of its own — this song's music, your mix and arrangement — and leaves this song alone. See [Alternates](#alternates) |
| Save over *the song*… | only on an alternate, and it names the song it would write. Makes that alternate the game song. See [Alternates](#alternates) |
| Delete scratch song… | appears for scratch songs only. After confirmation it removes the source module and its desk history, then clears that song's browser draft and recent entry. Built-in songs and legacy MIDI imports cannot be deleted here. |
| Discard unsaved changes | throws this song's complete draft away (undoable) |
| Open an earlier version… | loads an earlier complete version of this song, ready to review before saving. See [Going back](#going-back) |
| Zero every channel | zeroes every strip in this song (undoable) |
| Render WAV | renders this song offline and reports LUFS and peak. **What you are hearing** — your unsaved mix *and* your unsaved arrangement: the tempo and swing you dragged, the bars you muted, the order, and the song's own start-and-loop |
| Audition through a plugin… | the same song render, opened in [`tools/audition`](../tools/audition.py) — a real AU over it, previewed before you keep it |
| Export MIDI | downloads `<slug>.mid` — the notes, with GM patch names |
| Import MIDI… | turns a `.mid` into a song, and switches the desk to it |
| Export song as JSON | all current song drafts, as a file |
| Font | typeface for the desk — only fonts actually installed are offered |
| Playhead *ms* | shifts the playhead right to match what you hear (default 50 ms; `[` and `]` nudge it by 10 while the song plays) |

---

## Timeline

A bar ruler over the song form: ticks per bar, numbered every 2/4/8/16 depending on
length. The red line is the playhead; the teal band is the armed loop.

- **Click** — park the playhead there (stopped) or jump there (playing).
- **Double-click** — play from there.
- **Drag across the timeline** — select a bar range. The hatched band is the current
  structural selection, and it is the range used by copy, cut, repeat, silence and
  delete.
- **Right-click the timeline** — open the selected-bars editor. Its **Song
  structure** buttons are cut/copy/paste, repeat, insert silence, mute and delete.
  Beneath them, exact controls adjust every melodic track in the selection.
- **Fold chevron** — reveals the **section blocks**: one coloured pair of bars per
  two-bar block, hued by which section it belongs to, so a verse/lift/bridge shape is
  readable at a glance. Remembered across reloads.

The playhead is drawn from what is being *heard*, not what has been scheduled: the
sequencer runs a lookahead of a tenth of a second or so, and the browser is asked how
far behind the graph the speakers are, so both are taken back off.

What cannot be computed is the trip from a frame being painted to it reaching your
eye. Two or three frames of display buffering leaves the line trailing the kick with
everything else about it correct, so it is a **setting, dialled by eye**: press `]`
while the song plays if the line still lags, `[` if it runs ahead. Ten milliseconds a
press, shown in a toast, remembered per machine, and the same number lives in
**Song Desk → Playhead ms** if you would rather type it.

---

## Arrangement

One row per instrument, one cell per bar (per beat on short songs), shaded by how busy
that bar is — hue identifies the channel, lightness the density. Bars a lane plays in
are tinted end to end, so a region reads as one block rather than a bar chart of its
own sixteenths.

Each row carries, left to right: the **track number** (desk order — the number on the
strip below), **M** and **S**, the family mark, and the name.

- **Click a bar** — parks the playhead there, selects that channel, and marks the bar.
  What it plays is named in the status line and in the cell's own tooltip.
- **Double-click a bar** — play from there.
- **Click a name** — select that channel.
- **Double-click a name** — play from where that channel *comes in*: the first bar it
  sounds in, marked in its row. A lane already playing in the first two bars starts
  from the top instead — it comes in with the song, and skipping to bar 2 would only
  cost you the bar it arrived on. Same double-click as the **strip head** below.
- **Right-click a name** (or anywhere in the row's header) — the **track panel**:
  name · sound · part · adjustments. This row is the track itself; the strip below is
  its channel, and right-clicking that gives the signal-path menu instead. See
  [Right-click a track](#right-click-a-track).
- **Drag across a row** — select a **range of bars for that instrument**. This can
  refine a timeline selection before a lane-specific operation.
- **Right-click a bar** — open the same selected-bars editor targeted at that
  instrument. Mute, the note verbs and Reset Edits stay above; exact transpose, timing
  and gain controls stay together below.
- **Double-click a bar** — open that lane's note editor: the step grid for a kit
  channel, the piano roll for a pitched one.
- **Drag a row's header** — move the track. Where it lands is where the strip lands
  too; see [Reorder the tracks](#reorder-the-tracks).
- **Fold chevron** — collapse the whole panel.
- **Splitter** (the grip below) — drag to give the arrangement more or less of the
  window; it snaps to whole lanes and never takes the rack below a bare strip.
  It trades with the **rack only**: the effects panel stays exactly where you left it.
  Drag it up past the first lane to fold the panel. **Double-click** hands the height
  back to the automatic fit. The dragged height is remembered, and the grip is hidden
  while the mixer is folded — there is nothing on the other side of it to trade with.

The arrangement always shows *every* lane, whatever the mixer is filtered to.

### Selected-bars editor

Right-clicking no longer opens a long list of fixed values. It opens one inspector
showing the selected bars and the target at the top. Values are staged until
**Apply changes**, so moving several controls creates one undo point.

The scope is the **timeline selection** if you right-clicked inside one, and the
single bar otherwise. A row right-click adds the instrument target to that same
range — so "select bars 1–4 on the timeline, right-click Bass, copy" is unambiguous.

What you right-clicked stays the scope. The panel has no scope switch: a bar
right-click only ever edits that track in those bars, and whole-track work is on the
track's own menu. Nothing here can grow to cover the song while you are reading it.

Right-click the **timeline** for whole-song structure:

| Item | Does |
| --- | --- |
| Cut / Copy / Paste | moves the complete section, every track included |
| Repeat | duplicates the selected range once, immediately after itself |
| Insert Silence | inserts the same number of empty bars at the selection start |
| Mute Bars | silences every track without changing the song length; right-click again to unmute |
| Delete Bars | removes the bars and moves everything after them earlier. The final bar is protected |
| Transpose | the only adjustment here — see below |

Right-click an **arrangement lane** for that track only:

| Item | Does |
| --- | --- |
| Mute / Unmute | silences or restores that track in the selected bars |
| Copy Notes / Paste Notes | copies only that instrument's notes; paste may target a different instrument |
| Erase Notes | empties those bars of that track. The notes are gone, not flagged; `⌘Z` brings them back |
| Reset Edits | sets that track's mute, transpose, timing, gain and pan in those bars back to none. The notes are not touched |

Whole-track work is not on this panel: **Delete Track**, **Duplicate**, the preset and
the track's name are on the [track panel](#right-click-a-track), which the row's
header opens. Neither panel offers *Edit notes* — **double-click a bar** opens the
right editor for that lane, and both editors have a button and a key of their own.

One verb, one meaning, in both lane panels: **Notes** is the part, **Edits** are the
desk's bar-level adjustments, and **Track** is the channel and its row. Only *Delete
Track* removes anything from the desk.

The adjustment controls are exact rather than presets:

| Control | Range |
| --- | --- |
| Transpose | every semitone from `-12` to `+12`; shown on the arrangement as `+5`, `-7`, etc. One melodic lane, or every melodic track at once from the timeline |
| Timing | every `1/64` step from a quarter-note early to a quarter-note late. The stored unit stays the `1/32` note, so the desk writes halves of it — `-0.5` is one `1/64` early — and the readout names the real fraction. One track only |
| Gain | `-12` to `+12` dB in `0.5` dB steps. One track only |
| Pan | `-100` to `+100` in steps of `5`, in the pan pot's own numbers. An **offset from where the channel is panned**, never a position: a lane sitting at `+10` with a bar of `-20` plays that bar at `-10`, and re-panning the channel later carries every bar edit with it. Shown on the arrangement as `L20` / `R20`. One track only |

Timing, gain and pan are **not** on the timeline panel: nudging every melodic track by
the same sixteenth moves nothing relative to anything, a bar of gain across the whole
band is the master fader with extra steps, and panning the whole band is the master
balance. Transpose does mean something across a section — a key change for four bars —
so it stays.

A bar's pan is the one adjustment that lands on the **channel's own pan**, because pan
does not compose: two panners in series at hard right and hard left leave the signal
hard left rather than centred, so an offset can only mean what it says if one panner
holds the sum. That is also what it costs — as with pan automation in any DAW, a note
still ringing from the bar before travels with the move. The pot itself does not turn:
it goes on showing where the channel lives, and the bar says how far this bar is from
there.

A bar where a lane is silenced draws **hollow** — outlined in the lane's colour with
nothing in it — which is a different thing from a bar the lane simply does not play
in, and you have to be able to tell them apart to build anything.

Nothing here rewrites the composition above the song file's desk marker. Arrangement
decisions are saved beside that song's notes and channel settings by **Save song**.
**Discard unsaved changes** returns the arrangement and channel settings to the saved
song together. `⌘Z` undoes a region edit like any other, and the song does not stop
while you make it.

### Step sequencer

Open the **step-grid** button in the toolbar (or press **G**) to edit the drum pattern
as sixteen sixteenths per bar. The selected arrangement bars are the sequencer's
scope; with no selection it opens on the bar currently playing.

It is a **floating window** — drag it by its title bar, it remembers where you put it,
and clicking away does not close it. It is deliberately not one of the effects region's
views: the region shows *this channel*, and the kit belongs to the song. So the grid and
the piano roll are open **at the same time** if you want them — "move the snare while I
look at the bassline" is one job, not two. They have a button each (**G** and **N**) for
the same reason.

- Click or drag across steps to paint or erase one undoable gesture. Enter/Space also
  toggles the focused step.
- **Groove ▾** lays down a complete kit figure; each lane's ▾ offers figures for that
  instrument. Right-clicking a lane opens the same list.
- **Selected bars** edits only the visible bars. **Shared pattern** changes every bar
  that plays the same underlying part.
- Click a channel name to silence or restore that lane in the shown bars without
  deleting its steps. The playhead remains live while the song runs.

Step edits are arrangement deltas saved with the song. They inherit the desk's undo,
A/B and save path, and never rewrite the composition above the song-file desk marker.

---

## Mixer

### Strip-part switches

First along the mixer's header, three buttons — **EQ**, **Sends**, **Effects** — all on
by default, each hiding that part of every strip on the desk: the three EQ bands, the
send rows, the insert slots. Master and send returns included. With all three off a
strip is its voice, fader, pan pot and mute/solo pair, and the height the rows gave up
goes to the faders — the balancing desk, for when balancing is all you are doing.

Like the family switches beside them these are a **view, not a mix control**: a hidden
EQ is still doing whatever it was set to, a hidden send still sends, and a hidden chain
still plays. Nothing is bypassed, reset or muted, and the effect cards in the shelf
below still open from the selected strip. All three may be off at once. Remembered
across reloads.

### Track-family filters

Along the mixer's header after them, one button per family present in this song — **drums**,
**melodic**, **fx**, **vocal** — with a count. They hide strips from the **rack only**:
the arrangement keeps every lane, nothing is muted, and the song keeps sounding like
the song while you work on four of its channels. Hiding the last visible family is
refused. Remembered across reloads. Track numbers come from the whole song, so hiding
the drums never renumbers the bass.

### Channel strips

Left to right: **master** (in the column the arrangement spends on names, so channel 1
starts where bar 1 does), the **channels**, then the **send returns** pinned to the
right where they never scroll away from the channels feeding them.

A strip, top to bottom:

| Part | Control | Range |
| --- | --- | --- |
| Head | number, name, family | click anywhere on the strip to select it; **double-click the head** to play from where that channel comes in; **drag the head** to move the track — see [Reorder the tracks](#reorder-the-tracks) |
| Body | **voice** | what the channel is played *by* — see below. Bass, lead, harmony and chords only |
| Body | **HIGH / MID / LOW** | ±18 dB — shelf at 4 kHz, peak at 1.2 kHz, shelf at 250 Hz |
| Body | **DELAY SEND / REVERB SEND** | 0–2, 0 = shut — absolute, and the same on every channel |
| Foot | **insert slots** | up to 6 effects |
| Foot | **pan pot** | −100…+100 |
| Foot | **fader + meter + dB** | −60…+6 dB, console taper — see below |
| Foot | **M / S** | mute (saved) · solo (never saved) |

- Every value is **relative**: 0 dB is "as authored". Banks vary their own lanes per
  section, and a trim rides on top of that rather than flattening it.
- **The sends are the exception, and are absolute.** A send taps the whole channel and
  nothing scales it on the way, so DELAY SEND 1.00 sends the same amount of the kick as
  it does of the lead, in every bar of every song. It was not always so: the echo bus
  was scaled by the playing section's `echoLevel`, a number the desk never showed — a
  section saying `echoLevel: 0` swallowed the send whole and the control did nothing at
  any position. That key is inert now, and each song's sends were rescaled by it so
  nothing changed level.
- **Any readout is a control**: drag it up and down to change it, `shift` for a fifth
  of the speed, click it to type an exact number, double-click to reset. The row's
  **label** is a reset button too.
- **Pan pot**: drag in either axis, double-click to centre, click the number to type.
- **Fader law**: dB is already logarithmic, but the dB are not spread evenly along the
  travel — the fader is **tapered**, like a console's. Unity sits three quarters of the
  way up, so the six dB above it that a mix actually lives in get the top quarter of
  the fader instead of a tenth of it:

  | Position up the travel | 0% | 15% | 30% | 50% | 75% | 100% |
  | --- | --- | --- | --- | --- | --- | --- |
  | dB | −60 | −35 | −20 | −10 | **0** | +6 |

  Straight lines between those points, which is all a printed fader scale is. One law
  and one range on every strip, master included — a fader whose knee means a different
  gain from the one beside it is a desk you have to remember exceptions about.
- **Meter**: dB scale bottoming at −48, with a held peak line showing the loudest
  moment of the last second and a half. The border goes red on clipping. Its scale is
  its own — meters are read against the numbers beside them, not against the fader.
- **Mute and solo appear twice** — here and on the arrangement row — and are the same
  state in both places.
- **Sends**: how a channel *reaches* the delay differs per lane (melodic voices tap it
  pre-fader, as the engine's echo always did; everything else routes the whole channel
  in post-fader). The row's tooltip says which.

### When the window is short

The fader is the shock absorber and goes first: uncapped upwards, so a tall window
ends up with long faders rather than a band of empty desk, and squeezed down to a
grip you can still hit before anything else is touched.

When even that is not enough the desk starts **shedding whole blocks**, always in the
same order — the same three blocks the switches at the top of the mixer hide:

| Goes | Why in this order |
| --- | --- |
| 1. **Effects** | the insert slots: set once, then left alone |
| 2. **Sends** | consulted, but not constantly |
| 3. **EQ** | the one you are most likely reaching for while the window is small |

What is left at the bottom is the strip you balance on: **name, voice, fader, dB
readout, pan, mute/solo**. Nothing below that goes.

**A strip body never scrolls.** A row half out of sight is a row you can neither read
nor click, and it goes without saying that it has gone — so the desk hides the whole
block instead and **strikes the block's switch through** in the header. That mark is
what makes the shedding allowed: a switch that is still ticked but struck through
reads as "there is no room for this", which is a different thing from the dimmed
switch that means "you turned this off". Give the mixer more height and the block
comes straight back.

The desk never sheds something you have already hidden by hand, and growing the window
back restores exactly what is ticked and nothing more.

The docked preset editor is sent away when the rack reaches the bottom of the ladder:
it is given the same height as a strip, and a full editor squashed to a bare one is no
use to anybody. The `»` on the strip head reopens it as soon as there is room.

### Voice — what the channel is played by

The button at the top of every strip that can take one: the six melodic lanes and all
seven drums. It lights teal when you have chosen one. Until you do it names, in dim
italics, the hand-written voice the lane is *already* playing — `Square`, `Shop Bass`,
`Arcade Kick` — because a strip that only said **ENGINE** was withholding what the
library already knew. It falls back to **ENGINE** where a song's bank has been tuned
past every preset, which is the honest answer rather than a name that is nearly right.

Everything else on the strip is what has been *done to* a channel; this is what the
channel *is*. Clicking it opens the **voice library**
([`src/data/voices.js`](../src/data/voices.js)) — sixty-five presets in a panel, laid
out by category the way the effect catalogue is, with a line on each saying what it is
for.

Two kinds sit side by side, and the panel marks the difference:

- **`built in`** — the game's own hand-written voices, named. `Filtered Saw`, `80s
  Bass`, the drawbar organ and the plain waveforms have always been in the engine,
  reachable only by typing the right key into a bank by hand. They are presets now,
  and they are *literally* those keys: choosing one writes what you would have typed.
- Everything else is a **synth**, built from a table of options rather than from
  another branch in the engine.

Two ways in, and the quick one is on the strip:

- **`‹` and `›`, on the row itself.** Hover the voice button and an arrow appears at
  each end: one preset along, within the group the strip is already in. Auditioning a
  family — which kick, which pad — is the commonest thing anyone does with the library,
  and this is that loop with the panel taken out of it. It stays inside one category on
  purpose; stepping off the end of Kick into Snare would answer a question nobody
  asked. With **ENGINE** showing, the arrows are the way in to the lane's own kind.
- **Clicking the row** opens the panel, which is where you go to jump families, read
  what a preset is for, or search.

Points worth knowing:

- **Drums or pitched, at the top of the panel.** The one split the sixteen categories do
  not make, and the only one that is about the lane rather than the sound: a lead strip
  opens on `pitched`, a drum strip on `drums`, and `all` is one click away. A search
  that finds nothing under the filter says so and offers what the rest of the library
  holds.
- **Categories describe the sound, not the lane.** A bass preset on the lead is a
  lead; `Cowbell` on the chords lane is a chord of cowbells. The lane you opened the
  panel on only decides which category comes *first*. The handful of entries a lane
  hides are the engine ones that are genuinely lane-specific code paths — `Filtered
  Saw` lives inside the bass block, and offering it on the lead would offer nothing.
- **Drums included.** The percussion lanes hold hits rather than notes, so a Tone
  preset is struck at the lane's own pitch — a kick at 55Hz, hats at 800. Three
  constructions sit in the kit columns: the Tone drums (MembraneSynth and MetalSynth —
  oscillator-based, so they read as 808), the **noise presets** (a filtered burst on
  the engine's own seeded buffer, with an optional pitched body — the hissing snares
  and claps), and the **KLNG8** (`ds` presets): the Microtonic construction, an
  oscillator with a pitch envelope and a filtered noise source, each with its own
  envelope, summed into a drive — plus, since, a struck **resonator** (a click into a
  filter narrow enough to ring, which is what a rim, a clave and a snare shell are) and
  a **metal cluster** (six inharmonic squares through a highpass — the 808's cymbal
  circuit). None of them touch `Tone.Noise`, whose buffer comes
  from `Math.random` and would stop two renders of a song being identical — everything
  noisy here is built on the engine's seeded buffer, so stems still sum to the mix.
- **The kit names itself.** The `Arcade` presets are the engine's own eight drums —
  the 808 kick, the 2.6kHz snare crack, the three-burst clap, the two hats, the
  rimshot, the tom and the filtered crash — written down so an untuned drum lane can
  say what it plays. Five of them set no bank keys because their bodies read none, so
  they name without appearing in the panel: *Engine default* is already the way back
  to them. The three with knobs (kick, tom, crash) are ordinary entries you can pick,
  which is how a song whose kick was tuned to `Shop Kick` gets the plain one back.
- **A voice replaces the lane**, it does not sit on top of it. The written-in bass
  slapback comes back on the new voice; the lead's octave-sine brightener belongs to
  the engine's lead and goes with it. To put a second sound *under* a part rather than
  in place of it, duplicate the track — see
  [Duplicate and delete a track](#duplicate-and-delete-a-track).
- **A duplicated track has no ENGINE to fall back on.** Its button reads `PICK A VOICE`
  until it has one, and its panel offers neither *Engine default* nor the `built in`
  presets: those are bank keys the hand-written lane reads, and a layer has no
  hand-written lane. The arrows work on it like any other strip.
- **Levels are measured, not chosen.** Every preset is scaled so it arrives at the
  peak the voice it replaces arrives at — on the melodic lanes within a tenth of a dB.
  Percussion is within about 5dB: a struck-metal synth's peak depends on the note it
  is struck at, and a preset is measured at one pitch. `node tools/measure-voices.js`
  re-measures the lot and writes the numbers back into the library; run it after
  editing any preset's options, because an envelope edit moves its peak.
- **It is the one control that has to re-bank.** A fader moves a live node; a voice is
  a property of the song, so the sequencer is restarted around the change — half a
  second of silence, with the playhead left exactly where it was. Undo re-banks too.
- Saved as a `voice` block in the song's source file, per song, like everything else here.
  **Engine default** is a real choice in the panel, not just the absence of one:
  putting a lane back writes nothing at all to the file.
- **The CPU readout does not count them**, and says so: with any voice in use it reads
  `~12%+` rather than `~12%`, and its tooltip names the lanes. The effects have all
  been cost-measured; the voices have not, and a number that quietly leaves them out
  is worse than a plus sign that admits it.

### Editing a preset, and writing new ones

The library is data, so it can be edited from the desk. It writes
[`src/data/voices.js`](../src/data/voices.js), which is source the game and every render
tool read. Three ways in, all on the strip:

- **`✎` on the strip's header**, on hover.
- **`✎` on the voice row**, beside the `‹ ›` arrows.
- **Right-click the arrangement row** → *Edit Preset*, beside *Preset* — see
  [Right-click a track](#right-click-a-track).

Not in the preset picker. Choosing a sound and shaping one are different jobs, and the
panel that answers the first is the wrong place to hide the second.

#### `S` on a layer — solo one oscillator

A **MRDR-3** preset is up to three complete voices summed into one output, which is
exactly the sound you cannot take apart by ear. Every `Osc` card carries an **`S`** beside
its On/Off, and `Osc 1` has one even though it has no switch — "what is osc 1 doing under
the other two" is the same question.

It behaves like the channel solo it borrows its letter from:

- **Additive.** Two lit buttons means those two, together.
- **Monitoring, never saved.** The set lives on the engine, not on the preset, so it is
  never written to the library, never reaches a song, and cannot move a measured level.
  Clicking it does not mark the preset unsaved, because it has not changed the sound —
  only what you are hearing of it.
- **Gone when the panel closes**, or when it opens another preset. A solo that outlived
  the panel showing it would be a stack playing with a layer missing and nothing on screen
  to say why.
- A layer that is **switched off stays silent**: solo removes the others, it does not turn
  anything on. The global filter and VCA stay in circuit — you are hearing that layer
  through the patch, not raw.

MRDR-3 only. No other synth has more than one source to take apart.

Opening it does not put a panel next to a channel — it makes that channel **wider**.
The strip and the editor become one container in the rack: one border, one background,
one selected outline, and one header band running across both, so the channel's name and
its preset's name sit under the same coloured rule with a divider between the controls.
Everything else in the rack shuffles along, which is what a rack does when you put
something in it. It is not a window over the desk: you can play, move faders and step
lanes with it open, and it stays where it is until you close it.

There is no preview button, because there is nothing to preview. An edit mutates the
catalogue entry and drops the synths built from the old one, so the next note is already
the new sound — what you are hearing *is* the preset. (Not a re-bank: that restarts the
song with a deliberate half-second gap, which on a slider drag is half a second of
silence per pixel. See `VoiceRack.refresh`.)

- **What you get depends on what builds it.** A synth preset shows the parameters its
  Tone class actually has — a `MonoSynth` its filter and two envelopes, a `MetalSynth`
  its harmonicity and partial spread. Grouped by what they DO rather than by where Tone
  files them: a `MonoSynth`'s **filter** section holds its shape, slope, starting
  frequency, resonance and sweep together, because `baseFrequency` and `octaves` are the
  range the envelope moves the filter across, not timings — and reading them next to an
  attack in milliseconds told you nothing about either. The **filter envelope** is left
  as what an envelope is: four times. A noise preset shows the burst, an optional
  pitched **body** under it, and its **taps**: the repeats that turn one hit into a
  clap, each with its own offset so an unevenly-spaced 808 clap stays unevenly spaced.
  A **KLNG8** preset (the `ds` kit) shows the Microtonic layout: an **oscillator**
  section — waveform, a pitch that falls `PITCH → FALLS TO` over `SWEEP` in the shape
  `SWEEP CURVE` names (`EXP` an even glide, `LIN` a hang then a plunge, `SNAP` the
  analogue drum machine's own: the click, then the body), its own attack/hold/decay with
  an `EXP`/`LIN` curve of its own — an **FM** section that bends it with a
  second oscillator (`RATIO`, `INDEX` and an envelope of its own — clangs, bells, rims),
  a `KNOCK` — the engine kick's own 300 Hz mid punch, as a level and nothing else —
  a **noise** section whose filter cutoff can itself sweep, with a `COLOUR` and a
  `SLOPE` as well as the envelope controls, a **ring** section (`STRIKE` into a
  `RESONANCE` narrow enough to hold a pitch), a **metal** section (`PARTIALS` at a
  `SPREAD` around a `PITCH`, through their own filter), the **drive** with its shaper
  `SHAPE` and the `TONE` after it, a `SAG` on every envelope — the two-stage decay that
  makes a drum read as struck rather than faded — and **feel**, behind a switch of its
  own: per-hit `LEVEL`/`PITCH`/`TONE VAR`, with the two per-tap walks living in the
  Taps card where there is something for them to walk. Every section switches off whole: a tom is all oscillator, a
  clap all noise, a rim mostly ring, and a preset with none of them is silent, which
  the save refuses.
- **Pots, not sliders.** The desk's own knob at the desk's own size — the same 42px as
  the pan pot on every strip, sweeping from one end rather than from the centre — with
  the name above it and the reading inside it. Drag either axis, shift for fine, click
  the number to type an exact value, double-click or click the label to reset. Four fit
  across a strip's width, because the label sets the column and the knob does not: a
  slider has to be long enough to aim along, a knob only big enough to grab. Units live
  on the label (`SWEEP oct`, `FROM Hz`) because the ring has room for about five
  characters and the unit never changes.
- **Choices are pills, not dropdowns.** Four filter shapes is a set you can see, and a
  menu hides three of them behind a click. Abbreviated to fit — `LP HP BP NTCH`,
  `SIN SQR SAW TRI` — with the full word on the tooltip. A group whose only control is
  one of these drops the row label and lets the card's own title do it: an `oscillator`
  card with `WAVE` written under it was saying the same word twice.
- **The panel holds only what you can hear.** How a preset FILES — its category, its
  description — is asked on the way out, on a small sheet over the controls when you
  hit Save. Neither is a sound, and between them they were costing two rows of controls
  on every edit. On an existing preset both are already filled in and Enter takes them.
  The one dropdown left in the panel is the synth class, which changes the sound.
- **The class dropdown offers seven.** They are the ones measured rendering under an
  `OfflineAudioContext`. `PluckSynth` and `PolySynth` are not there because they render
  *silent* — a preset built on one would sound right in the editor and be missing from
  every WAV, stem and video.
- **New preset from … is a copy**, put straight onto the lane you made it from. Sound
  design from a blank envelope is a long way from anything usable; the preset you were
  just listening to is the best guess at the one you want. Rename it and the id follows —
  until the first save, after which the id is what mixes and banks name and a rename is
  just a label.
- **The level tracks as you work.** After every edit the preset is rendered offline here
  in the page — about 10ms — and its level scaled by how much the peak moved. The footer
  reads `peak ≈ 0.9005` while that is what you are hearing.

  It is a ratio, not a reading: the peak on file is measured through the whole render
  pipeline and the one taken here is the synth's own, and they are not the same number
  (`roundMono` is 0.9005 on file and renders 1.29 in the page). Everything between the
  synth and the master is linear in its output, so the constant between the two scales
  divides out and what is left — how much it moved — is right whatever that constant is.
- **Save measures properly**, and that is the pause. The server renders the real engine
  offline and writes that number, which is the one every render will use; any drift the
  ratio accumulated ends there. Same measurement `tools/measure-voices.js` makes, so
  running the full sweep afterwards changes nothing.

  The level is shown on the **save sheet**, not in the panel, because a peak is a number
  you only act on at the moment you commit. It goes amber when there is something to do
  about it: a preset measuring under 0.02 is not a quiet preset, it is one the engine
  multiplies by hundreds — the sheet says by how much — and one measuring zero renders
  to nothing and is refused.
- **A silent preset is refused.** If it renders to nothing offline, the file is put back
  and the desk says so, because that is the one failure that is inaudible where you are
  standing.
- **Editing a preset changes every song that plays it.** The editor says which ones
  across the top, and a delete is refused while a song still names it — you can force
  it, but not by accident. A song that loses its preset does not break; it quietly falls
  back to the engine's own voice for that lane, which is exactly the kind of change
  nobody notices until a render sounds wrong.
- **The engine's `built in` voices have no editor.** They are bundles of the bank keys
  the hand-written lanes read (`bassFilteredSaw`, `organPercussion`), not synths — so
  there are no parameters here to reach. Their *keys* are editable by hand, and a new
  engine preset is a new bundle of them; anything deeper is a change to `scheduleStep`.
- **Diffs stay readable.** A save rewrites the one entry in place and splices the one
  peak — the surrounding 1200 hand-written lines are untouched, so a saved preset shows
  up in `git diff` as the three or four lines that changed.

### Send returns — Delay, Reverb

The same strip as a channel: a return EQ, a fader (the return level), a pan pot, mute
and solo, and its own insert slots. Its **device summary** at the top — `375ms · 0.35
· 2.8k` for the delay, `2.2s · pre 12ms` for the reverb — is a button: it opens that
return's built-in card in the effects panel.

Soloing a return leaves the channels feeding it and mutes everything else, so you hear
the effect on its own.

### Master

Master trim on top of the bank's own `musicTrim`, the limiter as a
built-in card, and six insert slots. Its fader is the same fader as every channel's —
same −60…+6 range, same taper. It used to run −24…+12, which made it the one strip
that could be pushed somewhere none of the channels feeding it could follow. No EQ rows: there is no EQ node on the master
path, and a Channel EQ in an insert slot is a better EQ than three fixed bands.

---

## Effects

Six inserts per strip — channels, sends and master alike. The **slots** live on the
strip; the **parameters** live in the panel along the bottom, where there is room for
them.

**Splitter** (the grip above the panel) — drag to trade height between the **rack and
the effects panel**, and those two only: the arrangement does not move, whichever way
you drag. It stops when the rack is visibly down to a bare strip rather than at an
invisible wall well above it. **Double-click** hands the height back to the
measured card height. The grip is hidden when either panel is folded, and the dragged
height is remembered across reloads.

The panel sizes itself to what it is *showing*, not to one number for both views: the
effect cards ask for the tallest card in the catalogue, and the piano roll asks for
its whole keyboard. Switching to **Notes** therefore gives the roll the room and puts
the rack at the bottom of its shrink ladder — writing notes and balancing are
different jobs, and a
channel you are not balancing needs a name, a fader and a mute. Switching back to
**Effects** restores the strips.

### Insert slots

| Gesture | Does |
| --- | --- |
| Click an empty block | opens the catalogue |
| Click a slot's name | selects that strip and scrolls its card into view, flashing it |
| Power mark (hover, left) | bypass / enable without leaving the fader (`⌥`-click anywhere on the slot does the same) |
| Cross (hover, right) | remove |
| Drag a slot onto another | reorder the chain — the order **is** the signal path |
| Right-click a slot | open below · bypass · copy/paste settings · duplicate · insert before/after · move up/down · reset to defaults · remove |

A lit (teal) slot is active; a grey one is bypassed. Every strip reserves the same
slot block, so the row lands on one line across the whole rack.

### The catalogue

Grouped, and **priced** with each effect's measured cost as a percentage of one core:

| Group | Effects |
| --- | --- |
| Level & EQ | Gain, Channel EQ, Bell EQ, Vowel Filter, Filter |
| Delay | Advanced Delay, Delay, Ping-Pong Delay |
| Modulation | Chorus, Phaser, Tremolo, Vibrato, Auto Filter, Auto Wah, Auto Panner |
| Drive | Exciter, Distortion, Chebyshev |
| Space & stereo | Reverb, Doubler, Stereo Widener, Frequency Shifter, Pitch Shift |
| Dynamics | L7 Limiter, Compressor, Mid/Side Compressor, Multiband Compressor |

#### Vowel Filter

An insert made from three parallel native band-pass resonances. **VOICE** selects the
formant table, **VOWEL STACK** chooses the fixed sequence, and **RATE** walks it either on
the song grid or at a free rate. **DEPTH** controls how far each target travels from the
first vowel; **GLIDE** changes the boundary from a stepped change into a continuous
transition; **RESO** multiplies the bandwidth-derived Q; and **FX** is the equal-power wet
blend. **SPREAD** places the low, middle, and high formants left, centre, and right for
a wider vocal image. A one-vowel stack or zero depth is a static formant colour.

**WAVE SHAPE** chooses the stack trajectory (`step`, `sine`, `triangle`, `saw up`, `saw
down`, `square`, or deterministic `random`) without changing RATE's one-slot timing.
**ARTICULATION** makes each scheduled target boundary speak as a syllable. **EXCITE** adds
harmonics to the wet source before the formant bank, and **BREATH** adds an input-derived
high-passed attack; neither touches the dry path, and both remain silent on zero input.

Three band-passes on their own are a reed, not a voice: measured against its own input,
the bank alone sits about 15 dB down under F1 and 35 dB down above 3 kHz, so every vowel
arrives with no weight and no air. **BODY** and **AIR** are the two returns that fix
that, and both scale with the wet blend. BODY is a low-pass return whose corner follows
F1, so the vowel keeps the glottal weight it is supposed to have; AIR is a high-passed
pass-through above F3 carrying the singer's F4/F5 as two peaking resonances, because
above the third formant a vocal tract mostly passes what the source gives it. At their
defaults the full-wet response runs about 6 dB under the input in the bass and 12–18 dB
under it from 3 kHz up, rather than falling off a cliff. Set both to zero for the bare
bank.

**INTENSITY** runs the signal through the formant bank twice instead of once while
progressively reducing the unshaped BODY/AIR floor. Squaring the response doubles every dB
of formant contrast — on the bare bank, 17.6 dB of peak-to-valley becomes 31.0 dB — and it
is the only control that pushes past what RESO can do, because narrowing a peak cannot lower
the floor between peaks. It now derives its effective leakage directly from the current
state, so it is path-independent and does not require manually retuning BODY and AIR.

The source-backed Vowel card also offers named starting points through the reusable effect
PRESET dropdown: Talking Robot, Monster O-A, Breathy Choir, Chopped I-A, and Hard Talkbox.
Selecting one stores a snapshot on the current effect; later edits become Custom.

The expanded native graph measures about **0.80% of one core** at default settings and
**0.94%** in dramatic excitation/articulation mode on the current desktop bench.

**TILT** is how much of the table's *singer's* amplitude rolloff to keep — 1 is the
published rolloff, 0 is flat like the `robotic` voice. It defaults to 0.45 because the
published values put F3 20 to 32 dB down, which is inaudible, and F3 is exactly where the
VOICE types differ from each other. Be warned that VOICE is a subtler control than VOWEL
STACK and always will be: Csound's table gives alto and soprano the identical F1 and F2
for /a/, so two vowels in one voice are about five times further apart than two voices on
one vowel. It reads as a different singer, not as a different word.

The table's human values are the first three formants from Csound's published Formant
Table III; the `robotic` voice is an authored equal-amplitude variant. The effect is a
native custom insert and therefore follows the current custom-effect boundary: live
parameter edits and rhythmic scheduling are supported, while scheduled variant
automation is not.

The prices are not intuitive and are worth reading: a Phaser costs about 2% of a core
— roughly 24× a Distortion, and more than twice anything else in the list.

Every left/right control in the catalogue is called **BALANCE** — the Gain's, the
Advanced Delay's, the Doubler's two. One word for one gesture, so there is nothing to
learn per effect. (The saved parameter behind it still reads `pan`, `dryPan` or `wetPan`
on the older three: the keys are what mixes on disk hold, and renaming those would read
as a reset of every song carrying one.)

#### Channel EQ

Five bands, and the card is the curve rather than thirteen sliders.

| Band | | Default | Range |
| --- | --- | --- | --- |
| **LOW** | low shelf | 120 Hz | 20 Hz – 500 Hz |
| **LOW-MID** | peak | 500 Hz | 80 Hz – 2 kHz |
| **MID** | peak | 1 kHz | 250 Hz – 4 kHz |
| **HIGH-MID** | peak | 2 kHz | 400 Hz – 8 kHz |
| **HIGH** | high shelf | 6 kHz | 2 kHz – 16 kHz |

Gains are ±18 dB; the three peaks take a Q of 0.2–10, and the shelves say `SHELF` where
their Q would be, because a `BiquadFilterNode` shelf ignores it and a control the effect
will not read is worse than no control.

The middle band is the one a four-band EQ makes you borrow a neighbour for. Presence,
honk, the body of a snare and the fundamental of most vocals all sit within an octave of
1 kHz, and reaching it used to mean dragging LOW-MID up from 500 or HIGH-MID down from
2 k and then having nowhere left to put the band you had moved.

**Drag** a handle to move a band; **shift** for gain only, **alt** for frequency only,
**wheel** over a peak for its Q, **double-click** to reset that band. The numbers under
the graph are draggable and typable too — `2.4k`, `2400` and `2k4` all mean the same
thing — and clicking a band's name resets it.

The band being touched is drawn faintly on its own behind the total, so a dip you are
making can be told apart from what the four you are not are doing. A band sitting at 0 dB
greys its own gain readout: it is not doing anything, and it says so before you read it.

*Behind the card:* five native `BiquadFilterNode`s in series, and nothing from Tone —
Tone.Filter is one band, Tone.EQ3 is a fixed three-way crossover, and each Tone.Filter
would bring four `ConstantSourceNode`s along to drive its parameters, which is twenty
permanently-running generators for five filters that need none. The order they run in is
for reading, not for sound: biquads in series commute. With every band at 0 dB the card
is exactly transparent.

#### Bell EQ

One parametric band — **FREQ**, **GAIN**, **Q** — and nothing else.

The Channel EQ next to it is five bands and a graph, and it is the right card when the
question is *what shape does this channel want*. It is the wrong card when the question
is *there is a ring at 800Hz*: you open a thirteen-parameter surface, work out which
band's range covers 800, and leave four bands you never touched sitting in the saved mix.
This is the surgical one. Two of them in a chain are two problems fixed, in the order you
fixed them, each on its own slot you can bypass on its own.

A peaking bell, with no shape dropdown: at Q 0.4 it is already a broad tilt and at Q 8
it is already a notch, so the ends of the Q pot cover what a shelf and a cut would have
needed a menu for. FREQ spans 20Hz–18kHz on the same log taper the Channel EQ's graph
uses, and GAIN stops at ±18dB — the Channel EQ's band range, not the Gain card's ±24,
because the same control must not have more travel on one card than on the other.

At 0dB it is exactly transparent: a peaking biquad at unity gain has an identical
numerator and denominator, so a Bell EQ you inserted and did not touch renders the
samples the strip always did.

#### EQ presets

Both EQ cards carry a **PRESET** row, the same one the Vowel Filter has, and both call
their untouched state **Flat** rather than Default — it is the entry you reach for to
reset the card, so it says what it does. Picking a preset writes every one of the card's
parameters, so what you hear is the whole preset and not the preset over whatever was
there before; changing anything afterwards drops the row to **Custom**.

| Bell EQ | | Channel EQ | |
| --- | --- | --- | --- |
| **Flat** | the reset | **Flat** | the reset |
| **Sub Lift** | 45Hz, +5, wide | **Bass Boost** | low shelf up, a touch off the top |
| **Bass Boost** | 80Hz, +6, wide | **Treble Boost** | high shelf up with the upper mids behind it |
| **Mud Cut** | 300Hz, −5 | **Air Lift** | 12kHz shelf only — top without brightness |
| **Boxy Cut** | 450Hz, −6, tight | **Smiley** | loudness curve: lows and highs up, mids dipped |
| **Presence** | 3kHz, +4 | **Mid Scoop** | the dip on its own, no shelves |
| **De-Harsh** | 3.2kHz, −6, narrow | **Vocal Lift** | lows and mud down, presence and air up |
| **Treble Boost** | 8kHz, +5, wide | **Drum Punch** | thump up, box out, attack and air up |
| **Air** | 12kHz, +4 | **Warm & Round** | weight up, top rolled off |
| | | **De-Harsh** | one narrow cut at 3.2kHz |
| | | **Honk Cut** | the middle band alone, −6 at 900Hz |
| | | **Telephone** | both shelves buried, the mids left standing |

The rule the boosts and cuts follow is the one an engineer works by: **boost wide, cut
narrow**. A boost is shaping and wants to sound like nothing in particular; a cut is
fixing one thing and wants to leave everything either side of it alone.

#### Gain

Two controls, in the order of the two questions: **how loud**, then **where**.

| Control | Does |
| --- | --- |
| **GAIN** | ±24dB, where the strip's fader stops at +6. Some lanes are authored very quiet — the organ sits at 0.009 against the bass at 0.1 — and this reaches them. Anywhere in the chain, so it is also a trim before a distortion or a make-up after a compressor |
| **BALANCE** | left/right, and the only one on the desk that is not the strip's own pot. Use it to place the output of an effect that has moved the image, or to keep the strip's pan free for the gesture you want to automate |

**Centred, it is bit-for-bit the input** — a true balance, riding one side down from
unity rather than the equal-power pan a strip uses, which would cost a mono lane 3dB off
its mono sum just for being inserted. And it is **stereo out whatever goes in**, since a
balance has nothing to move otherwise.

#### Exciter

The other two in the Drive group shape the **whole** signal, which is why opening the
top with either costs you the body: push a Distortion far enough to hear the air arrive
and the bass has gone woolly on the way. This one only ever adds to the top. Everything
below TUNE is filtered out before the distortion stage sees it, and the dry path runs
straight from input to output at unity — so what you get is harmonics laid over the mix
you already had, not a version of it.

Reach for it when something is *dull* rather than *quiet*, and when an EQ has not
worked: a shelf can only lift what is already there, and on a lane with nothing above
6kHz there is nothing to lift. This makes the missing content out of the content below
it, which is the difference.

| Control | Does |
| --- | --- |
| **TUNE** | where it starts listening, 700Hz–10kHz. Everything below is untouched — this is the knob that decides whether you get air or presence |
| **DRIVE** | how hard the band is pushed into the distortion, and so how much harmonic content comes back. Not a volume: the make-up after it is set so the level holds while the harmonics climb |
| **TIMBRE** | which harmonics. At 0 they are **odd** — a fifth and a third above, hard and edgy, the same family a Distortion makes. At 1 they are **even** — an octave and two octaves above, and nothing else, which reads as shimmer rather than as distortion |
| **MIX** | how much of it is added on top. **0 is exactly transparent**, sample for sample, so it is safe to leave in a chain at zero |

Three things worth knowing:

- **It works on peaks, not on levels.** Above 3kHz this game's tracks run an rms two
  orders of magnitude under their peaks — music up there is nearly all transient. So the
  exciter does most of its work on hits and almost none between them, which is why it
  brightens without thickening. It also means DRIVE bites at a different point on a
  cymbal lane than on a pad.
- **DRIVE saturates, and saturation compresses.** Held loud material at the top of the
  travel gets squared rather than excited, and the effect quietly gets *smaller* — the
  measured worst case is a sustained tone at transient level, which loses 17dB by drive
  1.0. On real material this is not reachable; if you hear it, come down to about
  two-thirds, where the harmonics are already fully up.
- **TIMBRE is the knob to move first**, not DRIVE. The two ends are different effects,
  and most of the time one of them is obviously right for the lane.

It costs **0.35% of a core**, four times a Distortion, and nearly all of that is 4×
oversampling in the distortion stage. That is not an optimisation to look at: without it
the harmonics of anything above 7kHz fold back down the spectrum as a metallic ring,
sitting exactly where the effect is supposed to sound like air.

`tools/measure-exciter.js` is the bench it was built on — it drives the effect with
tones under an offline context and measures the harmonics, the leakage below TUNE, the
aliasing, the DC and the cost. Run it after touching any of this;
`tools/render-exciter-auditions.js` renders a song through it at six settings, dry take
first, for the half no spectrum answers.

#### L7 Limiter

A lookahead brickwall limiter, and the thing to reach for when a bus needs to be
*loud* rather than merely under control. It is not the master's Limiter switch, which
is a seatbelt with no controls; this is an insert you push into.

The one thing to know is that **THRESHOLD and OUT CEILING are coupled**. The gap
between them is applied as gain for you, so pulling the threshold down is the same
gesture as turning it up, and the ceiling never moves while you do it. One knob, one
direction: down is louder. Nothing ever leaves above the ceiling.

| Control | Does |
| --- | --- |
| **THRESHOLD** | where it starts working, 0 to −30dB — and how much gain it applies, which is the same number |
| **OUT CEILING** | where the output stops, 0 to −12dB. −0.3 by default, which leaves room for a codec |
| **RELEASE** | how fast it lets go, 10ms–2s |
| **LOOKAHEAD** | how far ahead it sees, 0.2–10ms. Short is aggressive and distorts bass; long is clean and costs latency |
| **Auto Release (ARC)** | release adapts to the material — an isolated transient lets go at the dialled time, sustained loudness five times slower. On by default |

It costs **LOOKAHEAD of latency**, 3ms at the default, so a lane carrying one sits
that far behind the others — put it on the master rather than one channel unless the
lateness is what you are after. Bypassed it costs nothing at all, and it is
sample-exact transparent whenever the signal is under the threshold.

#### Doubler

A part played twice. Copying a lane onto a second strip does **not** do this — a
duplicate at the same pitch and the same time is the first one 6dB louder, and every
comb filter in between. What makes two takes sound like two people is that they are
never quite together, so the Doubler builds the three ways they differ and gives one
control to each.

| Control | Does |
| --- | --- |
| **DETUNE** | how far out of tune the two voices are, in cents — one sharp, one flat. Under 20 is a double; 50 is a quarter tone and a harmony part |
| **TIME** | how far behind the original they come in, 11–60ms. Under about 10 the two fuse into one comb-filtered voice; past 50 they are an echo |
| **RATE** / **DEPTH** | how fast the voices drift and how far. Without it the detune is static, which is the one thing a human never is. Slow is the useful half — the default is a third of a hertz |
| **WIDTH** | how far apart the two voices sit |
| **DRY BALANCE** / **WET BALANCE** | where each half goes, separately |
| **WET / DRY** | how much of the doubling you keep |

**DRY BALANCE −1 with WET BALANCE +1 and WIDTH 0** is the oldest double-tracking trick
there is: the original hard left, both doubles hard right. That is why there are two
left/right controls rather than one — placing the pair together and placing them apart
are different gestures, and one knob cannot say both.

The detune is a **real varispeed pitch shift**, not a modulated delay imitating one,
which is what separates this from the Chorus: measured, both voices land within 0.02
cents of the dial across the whole range. It is deliberately the one modulation effect
with no **Tempo Mode** — a drift that lands on the beat is a rhythm part, and the whole
claim of the effect is that the second voice is not counting.

Two things worth knowing. It is **stereo out whatever goes in**, so a mono lane comes
out of it spread. And at WET 0 it is sample-exact transparent, dry balance included, so it
costs nothing but CPU when it is turned down.

Everything here has been verified to render in an offline context, because WAVs, stems
and videos are produced by rendering the engine offline. JCReverb and Freeverb remain
deliberately absent because their AudioWorklet versions measure silent offline. Bit
Crusher is native and offline-safe; its card is intentionally limited to BITS,
DOWNSAMPLE, and MIX, leaving distortion to the separate Distortion effect.

### Cards

Each card is one effect: a power button, its position and name, a close cross, and its
parameters. Cards grow **sideways** into a second column past four rows, and the panel
reserves a fixed height for the tallest card the catalogue can produce, so it never
moves under you as you click between channels.

- **Drag a card's title bar** to reorder the chain.
- **Tempo Mode** on a delay or a modulation effect swaps a free time/rate for a note
  division: `1/8 dotted`, `1/4 triplet`, up to 8 bars. Synced effects follow the
  song's tempo — and the desk's tempo drag — instead of drifting against it.
- **Built-in cards** (badged `BUILT IN`) are pinned first and cannot be removed or
  bypassed: they are what the strip *is*. The master's limiter; the delay's TIME,
  FEEDBACK and DAMPING; the reverb's DECAY and PRE-DELAY. Tone a reverb tail with the
  return EQ on its strip — it is a convolution reverb, so it has no other damping.

---

## Right-click a track

Where you right-click is what you get. The **arrangement row header** is the *track* —
what it is called, what plays it, what it plays — and opens the **track panel**. The
**mixer strip** is that track's *signal path*, and keeps a short channel menu. The two
used to share one menu, which put one set of buttons behind two gestures and made the
result of a right-click unguessable from the thing under the pointer.

The track panel is the window a bar opens, scoped to the whole track: staged values,
one **Apply changes**, one undo point. It is titled the way the desk names a track
everywhere else — `Track 3. Bass`.

**Mute and solo are not in it.** Both views already carry those buttons, permanently
and with their state showing; a copy inside a panel you have to close to see the strip
would be a worse switch than the one on the strip. Neither is **Edit notes…**: both
note editors have a toolbar button and a key of their own (`G`, `N`), they open on the
selected channel, and either can be left up while you work.

| Section | Holds |
| --- | --- |
| Track name | a desk-owned duplicate or added track's display name. Authored song lanes keep their source names, so the field is not shown for them |
| Sound | **Preset** (the voice library, opened against this strip) and **Edit Preset** (its parameters in the rack beside it — see [Editing a preset](#editing-a-preset-and-writing-new-ones)). Only lanes a voice can play; Edit Preset is absent on the engine's own voice, which has no entry to edit. Neither label carries the preset's name — that is on the line under the title |
| Track | **Duplicate** (a second strip playing the same part — see below), **Copy Notes** / **Paste Notes** (the part itself; paste may target a different instrument), **Erase Notes** (empties every bar — the notes are gone, not flagged; the track, its channel and its sound stay, and `⌘Z` brings the part back), **Reset Edits**, **Delete Track** (asks first, naming the track, and says what goes with it) |
| Adjust | exact transpose, timing, gain and pan across every bar of that track |

Making a **new preset** from this one is not here: the preset editor's own *Save as new*
is the same gesture at the moment you actually want it — after you have moved something
and decided to keep it, rather than before you have opened the panel.

Right-clicking a **channel strip** — or a send return, or the master — gives the five
items about the signal path, built by the one function all three share: **Copy
Channel**, **Paste Channel** (only onto the same kind of strip: a channel's sends mean
nothing on a bus), **Paste *n* Effects** (works between any two strips — a chain means
the same thing everywhere), **Bypass / Enable All Effects**, and **Reset Channel** back
to defaults (`R`). Reset includes the voice, so the channel goes back to the engine's
own; a duplicated track keeps its preset, because that is the lane, not a setting on
it. The noun changes with the strip — *Copy Send*, *Reset Master*.

### Reorder the tracks

**Drag a track by its header** — the arrangement row header, or the strip head below —
and it moves. Dragged down it lands after the track you drop it on, dragged up it lands
before it: the same gesture as the effect slots, and the same one every list with a
handle in it takes.

The arrangement and the mixer are two views of **one order**, so a drag in either moves
both, and the track numbers follow. That is the point of the number: it is a position,
not a name, so "mute 7" means a different channel after you have reordered — the same
way it would on a console you had re-patched.

- **Only the header drags.** Everything below it on a strip is a control with a drag of
  its own, and the bars beside an arrangement row select a range. The preset name and
  the M/S pair opt out too — they are buttons living on the handle.
- **A track takes its layers with it**, as long as they are actually sitting under it.
  A layer dragged somewhere else on purpose was separated on purpose and stays put.
- **The mixer's family filters hide, they do not reorder.** A drop resolves against the
  whole song, so dragging past a hidden family does what it looks like it does.
- Order is a decision this song carries, not a preference: it is per song, it is saved,
  and `⌘Z` takes it back like any other edit.

Until this existed, order was **derived** — the kit, then the bass, then whatever the
engine's lane list says — which is a good order for the songs the game ships and no
order at all for an imported one, where every part is a layer and nine melodic strips
arrive in the sequence the MIDI happened to be written in.

A song nobody has dragged has no `order` in its file and is ordered exactly as it always
was. A stored order is read as decisions about the tracks it **names** and nothing about
the tracks it does not, so a track added after the drag — a fresh duplicate, a lane the
engine gains next year — lands beside the track it belongs beside rather than in a pile
at the bottom.

### Duplicate and delete a track

Every other edit on this desk is about **balance**. These two are about the song's
**shape** — which tracks it has — and they are the only edits that add or remove a
strip and an arrangement row.

Neither touches a composition file. Both are stored in the song's mix export
(`layers`, `off`), applied by `deskBank()` in `src/engine/lanes.js`, and undone by
`⌘Z` like any other edit. Deleting a song's mix entry puts it back exactly as it was
composed. Track **order** (`order`) is stored the same way, for the same reasons.

**Duplicate** gives you a second strip playing the *same part*: same notes, its own
voice, fader, pan, EQ, sends and effect chain. That is how you layer — a sub under the
bass, a pad under the chords, a rimshot doubling the snare — none of which was possible
before, because there was only ever one strip per part.

- The new track lands **immediately after** the one it copies, named `Bass 2`, in the
  same colour a shade over. Duplicate it again for `Bass 3`.
- The **channel comes with it**, minus mute: a layer arriving at unity under a part
  sitting at −6 is not under it.
- The **voice does not**, unless it is a library preset. A layer has no hand-written
  body in the engine, so it plays a preset and nothing else — which is also why two
  layers on the same voice would just be the original, louder.
- So a fresh layer is **silent until you give it a voice**, its voice button reads
  `PICK A VOICE` in amber, and the library opens on the spot. There is no *Engine
  default* in it, and no built-in presets: those are bank keys the hand-written lane
  reads, and a layer has no hand-written lane.
- Lanes no voice can play — the glisses, sweeps, organ swoop, vox and shout — cannot be
  duplicated, and the menu says so rather than offering it.

**Delete** takes a track off *this mix*. The song keeps the part; this mix stops having
the channel, so the row and the strip both go. It asks first, and names any layers
standing on the track, which go with it — a layer of a part that is no longer in the
song is a row playing nothing. Deleting a **layer** removes it outright, settings and
all; it only ever existed in this mix.

The Arrangement **+** is intentionally a single action: stage a new independent track
and choose its preset from the selector beside the plus. The lane is not written until
that choice is made; closing the selector cancels it. Structural choices such as
duplicate and delete remain on the arrangement track's right-click menu. `⌘Z` also
restores a deleted layer.

---

## Keyboard

| Key | Does |
| --- | --- |
| `space` | play / pause |
| `L` | loop on/off |
| `1` `2` `4` `8` `0` | loop length in bars (`0` = the whole song) |
| `←` `→` | one bar back / forward |
| `↑` `↓` | previous / next channel |
| `M` `S` `R` | mute · solo · reset the selected channel |
| `B` | bypass (or re-enable) every effect on the selected channel |
| `G` | the kit's **step grid** — a window, open or shut |
| `N` | the effects region's **Notes** view — the selected channel's part |
| `[` `]` | playhead sync, ±10 ms — see below |
| `⇧R` | arm or stop **recording** — opens the keyboard if it is shut |
| `⌘Z` | undo |

Keys never fire while you are typing into a field.

While the on-screen keyboard has **Keyboard** lit, the letters play notes instead:
`Z S X D C V G B H N J M` is the lower octave with its black keys, `Q 2 W 3 E R 5 T 6 Y
7 U` the one above, carrying on through `I O P` and `[ = ]`; `−` and `+` shift the whole
board, `,` is the C above M, and the home row plays drum pads. `space`, the arrows and
`⌘Z` still belong to the desk, and `Esc` hands the letters back.

Shifted keys are never claimed by the on-screen keyboard, which is what leaves `⇧R`
working while your hands are on the notes. Note that plain `R` is the channel reset and
shifted `R` is record — the two are one keystroke apart on purpose, so that the one you
reach for mid-take is the one with the modifier on it.

---

## What is saved, and where

| Thing | Where it lives |
| --- | --- |
| Gains, pans, EQ, sends, mutes, effect chains, master trim, limiter | the song's `mix` export, on **Save song** |
| Which bars play, in what order, with what dropped out of them | the song's `arrangement` export, on the same button |
| The tempo it is played at, when that is not the tempo it was written at | the same `arrangement` export, as `bpm` |
| The swing it is played with, when that is not straight | the same `arrangement` export, as `swing` |
| Duplicated tracks (`layers`) and deleted ones | the same song source file, on the same button |
| The order the tracks sit in, once one has been dragged (`order`) | the song's `mix` export, on the same button |
| Every version of a writable song this desk has overwritten | `work/mix-history/`, automatically, on every save. Gitignored — see [Going back](#going-back) |
| A version of a game song you want to keep without shipping it | its own file in `src/data/imported/`, on **Save as alternate…** — tracked, so it survives. See [Alternates](#alternates) |
| The whole song as it stands right now, kept under a second name | its own file in `src/data/imported/`, on **Save a copy…** — tracked, and reachable by nothing but the desk. See [Copies](#copies) |
| Presets — user-created sounds and edits | `src/data/voices.js`, in the `USER_*` tables, on the editor's own **Save**. Library-wide, not per song, so it is separate from **Save song** |
| Unsaved edits, per song | browser localStorage — switching songs and coming back picks up where you left off |
| Solo | nowhere. Monitoring only. |
| Composition — the notes, the sections, the tempo the song is WRITTEN at | nowhere. Above the desk's marker in the song file, and never rewritten by it. |
| Hidden families, hidden strip parts, font, playhead offset, arrangement height, folds, last song | browser localStorage |

Song files are emitted as readable source rather than a JSON blob, because they are
committed and reviewed in a diff. Only tracks carrying real decisions are written; a
song you opened and did not change leaves `mix = null` and `arrangement = null`.

**Saving is not committing.** The game and every render tool read the file the moment
it is written, but nothing is final until Peter commits it.

### Going back

Undo covers the desk; git covers what has been committed. **Between them sat nothing**
— two saves in an evening and the first one was gone, because the only copy of it was
the file the second one overwrote.

So every write copies the file it is about to replace into **`work/mix-history/`**, named
for what the save was about and stamped to the second:
`mix-2026-07-28T213011-shop-theme.js`. The last 300 are kept, a whole mix is about
12KB, and the folder is gitignored — it is a safety net under a mixing session, not a
second history beside git.

**Song Desk → Open an earlier version…** lists them, newest first, as *when* and *what*:
`21:30 today — shop-theme`. Pick one and it asks which:

- **Restore *this song* from it** — the ordinary case. An evening on one mix, saved,
  and then an hour spent making it worse.
- **Restore every song from it** — for when a save went in wide and took songs with it.
  It says how many unsaved drafts it would replace, by name, first.

Either way **nothing is written**: the snapshot is loaded into the draft, so it is
audible immediately, `⌘Z` takes it back — a whole-song restore is one undo step, not
thirty-four — and it only reaches the file when you Save it. A song that is not in a
snapshot at all was a song with no decisions in it when the snapshot was taken, and
restoring it puts the strips back to zero, which is the honest answer.

The snapshots are the *file*, byte for byte, not a re-rendering of it: `cp` one back
by hand and you have exactly what was there, and `diff` reads in the syntax the file
is actually written in.

### One song, and only that song

**Save writes the song it names and nothing else.** It used to post the desk's whole
idea of the file — all thirty-four songs, as read when the page loaded — so a tab left
open since the morning wrote the morning's copy of every *other* song back over
anything that had landed since. Two tabs, or a hand-edit between load and save, and
the loser never knew.

The desk now sends only the song the save is about, and the server rewrites that
source file as it stands on disk. What comes back is re-read, which is what the desk
then believes — so **A/B saved** and the dirty dot on the hamburger tell the truth
about the file even after another tab, or a hand, has been in it.

### Copies

Save As. **Song Desk → Save a copy…**, a name, and the whole song exists a second time:
the music copied verbatim, the mix on the faders, the arrangement with every bar edit
and painted note in it, and the cabinet screen — written into
`src/data/imported/<id>.js` as `group: "copy"` and listed in the picker under **Saved
copies**. From then on it is an ordinary song: open it, mix it, render it, save it,
delete it.

It is a snapshot, and it **promises nothing**. That is the whole difference from an
alternate below, and it is one line of source: a copy has no `export const alternateOf`,
so nothing can promote it over another song, no cabinet can select it, and the generated
`src/data/game-alternates.js` does not import it — the game bundle cannot see a copy at
all. Nothing is written but the new file. The song it was taken from is untouched, and
so is everything the game plays.

Offered on every song with a bank, which includes the read-only legacy MIDI imports:
a copy is a fresh file with the desk's marker in it, so this is the one way an import
that cannot be saved becomes a song that can.

Two things worth knowing:

- It copies **what the desk has**, draft over file — what you are listening to, not
  what was last written. Preset sounds are frozen into it the same way a save freezes
  them, so a copy still sounds like itself after somebody edits the library preset it
  was using.
- The draft you copied is still sitting on the song you copied it from, exactly as with
  an alternate. The toast says so when it applies.

### Alternates

Save writes over the song. That is right while you are mixing one and wrong at the
moment you have a version of NEON BLASTERS you like *without* being ready to say it is
NEON BLASTERS. A [copy](#copies) is the move when you want a snapshot and no claim; an
alternate is the move when the claim is the point.

**Song Desk → Save as alternate…** is the other move. Name it, and the desk writes a
whole song file of its own into `src/data/imported/<id>.js`: the parent's music copied
verbatim, the mix and arrangement on the desk right now on top of it, and one line —
`export const alternateOf` — saying which song it came from. It appears in the picker
under **Alternate Game Songs**, next to the Cabinets, and from then on it behaves like
any other song: mix it, render it, export it, Save it, delete it. **The song it was
taken from is not written.** Saved alternates whose parent is the hub or a cabinet can
also be run in local dev builds: open **DEV MENU → GAME ALTERNATES**, or use
`?goto=hub&alt=<id>` for the hub loop and `?goto=stage&cab=<parent>&stage=<stage>&alt=<id>`
for a stage. The alternate's bank, mix, arrangement and select treatment carry from
the stage list through Start and into the game loop; ordinary builds keep the shipped
cabinet music.

Later, if it turns out to be the one: open it and press **Save over NEON BLASTERS…**,
which is the only button on the desk that writes a file other than the one you are on.
It saves the alternate first — so what gets written is what you were listening to —
then writes that alternate's mix, arrangement and cabinet screen into the parent's
source file, through the same writer and the same `work/mix-history/` snapshot every
other save goes through. The music is not touched at either end, and the alternate
stays exactly where it is.

The parent is read out of the file, never chosen in the desk. That is what keeps this
inside [one song, and only that song](#one-song-and-only-that-song): there is still no
way to land one song's balance on another song's parts, because an alternate carries
the other song's parts. An alternate of an alternate belongs to the same original, so
the chain can never grow a middle for a promotion to walk past.

Two things worth knowing:

- The draft you forked from is still sitting on the song you forked it from — saving
  the alternate does not clear it. The toast says so when it applies.
- If the parent has unsaved changes of its own when you promote, they are left alone —
  and saving them afterwards would write over the promotion. The confirm says that too.

---

## Server routes

The Node process behind the page does the things a browser cannot. `/new-song`,
`/save`, `/history`, `/render`, `/audition`, `/midi` and `/import-midi` are wired to
buttons; `/measure` is there for the command line.

| Route | Does |
| --- | --- |
| `POST /new-song` | accepts `{title, bpm, bars, template, style}` — template is `blank`, `beat` or `full-band`; style is `auto` or a pack id from `tools/lib/song-styles.js`; a null/absent `bpm` takes the style's own tempo. Writes a collision-safe, seeded source module under `src/data/imported/`, registers it as a writable scratch track, and returns `{file, style, key, bpm, track}` |
| `POST /delete-song` | removes one writable scratch source and its desk-history snapshots; built-in and marker-less MIDI tracks are refused |
| `POST /save` | snapshots and rewrites the selected built-in or scratch song source. It preserves the other desk-owned export when a patch omits it and answers with the files re-read |
| `POST /save-alternate` | accepts `{sourceId, title, mix, arrangement, variants}`. Writes a new song file under `src/data/imported/` carrying the source song's music, `group: "alternate"` and `alternateOf`, registers it, and answers with the track plus what the file holds, read back. The source song is not written. An alternate of an alternate is filed under the same original |
| `POST /promote-alternate` | accepts `{id}` and makes that alternate the song it names as its parent. Reads the alternate's *file* — not the desk — validates its arrangement against the parent's music as it stands now, snapshots the parent and rewrites it. The one route by which one song's decisions reach another's file, and it can only go the way the file already says |
| `GET /history` | the snapshots, newest first |
| `GET /history/<file>` | one of them, parsed. It is a module, so this is an `import()` — the name is matched against the pattern this process writes rather than merely checked for `..` |
| `GET /midi?track=<id>&patches=1` | the song as a MIDI file |
| `POST /import-midi?file=<name>` | a `.mid` in; a song file in `src/data/imported/`, a new track id, and the notes themselves back out — along with the `mix` the file holds, which is where the layer lanes an import needs are declared |
| `POST /render` | renders one track through the real engine with a mix applied, writes `dist/<slug>-mix.wav`, and reports peak / LUFS against a −16 LUFS target |
| `POST /audition` | the same render, then opens `tools/audition` on it — the plugin host runs where the mixer runs, because that is where the plugins are |
| `POST /measure` | the same measurement across many tracks without writing files — the half of "get the volume right" that a one-song desk cannot show |
| `POST /voice-save` | writes one preset into `src/data/voices.js`, renders it to measure it, and splices the result into `LEVELS` and `PEAKS`. Regular users write `USER_*`; dev mode can also update or create library-table entries. A preset that renders silent is put back rather than saved |
| `POST /voice-delete` | removes a user preset and its peak; dev mode may also remove a library preset. Refused with `409` and the list of songs while any of them still names it, unless `force` |
| `GET /voice-refs?id=<id>` | which songs play a preset — asked before a delete, shown across the top of the editor |
| `GET /tracks` | the track list |

Renders are written at unity, **not** peak-normalised: normalising would silently undo
the master trim you just set.

The three voice routes are the only ones that write source *outside* song files,
and the only ones that drop the warm Chromium: `openRenderer` bundles once at open time,
so measuring an edited preset in a browser holding the bundle from before the edit would
measure the preset it replaced — silently, and with a plausible number.

---

## Notes

- **Cross-checking loudness** is what `/measure` exists for. Balancing a song against
  itself is the desk's job; balancing it against the other thirty-three is a
  measurement, and −16 LUFS is the target — game music has to sit under effects and
  dialogue without anyone reaching for the volume between cabinets.
- **The limiter changes the render.** 6 ms of latency, always, whenever it is on.
- **An imported MIDI becomes a song and the desk switches to it.** The bank is written
  to `src/data/imported/<id>.js` and the folder is its own registry, so the song is in
  the picker under **imported**, renders, exports MIDI and takes a mix like any other.
  The dialog lists which MIDI track landed on which lane.
  - **One part in, one strip out — nothing is merged.** A lane holds one value per
    step, so two parts sharing one would not stack, they would overwrite: a ten-track
    file used to arrive as five lanes with five parts silently eaten. Every part now
    gets a key of its own. A track that names a lane gets it; the rest fill the six
    pitched lanes; anything past those becomes a **layer** (`lead2`, `lead3`) — an
    ordinary strip with its own fader, EQ and sends, wearing the MIDI track's name.
    A type 0 file, which is one MTrk carrying every channel, is split on the channel
    first, and a second drum part strikes a second kit (`kick2`, `snare2`).
  - **A layer arrives silent.** A layer is a preset and nothing else, so the notes are
    there and play nothing until you choose a voice for it — the price of keeping
    every part, and one you can hear and undo. The import dialog names them.
  - **The filename is the track id.** `Cool Song.mid` becomes `cool-song`, and
    importing that name again *replaces* it — take a song out to a DAW, bring it back
    over itself. A name a hand-written song already owns gets a suffix instead: an
    import can never shadow a cabinet. Export MIDI writes a layer as `Lead 2`, and
    that is what the importer reads back onto `lead2`, so the round trip keeps them.
  - **What a MIDI file cannot carry** is timbre, glissando runs and per-section engine
    overrides. Those are yours to set by hand in the bank file.
  - Add, rename or delete a bank in that folder by hand and refresh the desk — the
    list is rebuilt from the folder on every page load. `node tools/import-midi.js
    --reindex` does the same from the command line.
  - The game never imports that folder, so nothing in it ships in a build.
