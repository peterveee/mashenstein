# The Song Mixer

`npm run mixer` → http://127.0.0.1:8010/

A mixing desk for MASHENSTEIN's songs, running in a browser tab. It plays the game's
own audio engine — every fader on screen moves the same channel strip the game will
use, and the same one the offline renderer runs when it writes a WAV, a stem or a
video. Nothing in the tool reimplements audio.

What it writes is [`src/data/mix.js`](../src/data/mix.js): per-song trims, pans, EQ,
sends and effect chains, which the game and every render tool then read. Peter
reviews and commits; the mixer never touches git.

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
| **Mixer** | the rack: master, channels, send returns |
| **Effects** | the selected strip's device chain, with room for parameters |
| **Keyboard** | a floating window: play the selected channel, and watch it play |
| **Footer** | song title, beat, master peak, keyboard help |

Timeline, arrangement, mixer and effects each have a **fold chevron** on the left of
their caption. Folding gives the space to the panels that are still open — the strips
are sized to the window every time anything moves.

---

## Header

### Song

The **folder button** (far left) opens the song picker: every track in
[`src/data/tracks.js`](../src/data/tracks.js), in three columns — *themes*,
*cabinets*, *shop auditions* — with the track id beside each title. The song you are
on shows in the footer, where its name has room, and is remembered across reloads.

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
| **BPM** | **draggable.** Audition tempo, 40–220. Never saved — the bpm belongs to the song. Teal while overridden; click to go back to the song's own tempo. |
| **CPU** | rough load: the engine's own ~10% plus every active effect's measured cost. Red past 45%. Hover for what is running. |

Tempo drags carry the tempo-synced delay and every division-based insert with them, so
half-speed really is the same mix at half speed.

### ⌨ — play the selected channel

The piano button, top right beside **A/B saved**, opens the **on-screen keyboard**: a
floating window that plays whatever channel is selected, and shows what it is playing
while the song runs. Over on the right rather than by the transport, because the
transport is what the *song* does and this is what *you* do. Drag it by its title bar;
it remembers where you put it. It is a window rather than a menu — it stays open while
you work, and clicking away does not close it.

| | |
| --- | --- |
| **A melodic channel** | two octaves of keys, opened at the octave that channel's own part is written in. ◀ ▶ shift it. Click a key, or drag across them to glide. |
| **A drum channel** | the song's whole **kit**, one pad per drum, rather than two octaves of keys that all play the same kick. Each pad plays its own channel; drag across them for a roll. |
| **catch keys** | plays from the computer keyboard — `A W S E D F T G Y H U J` for notes, `Z` `X` for the octave, the home row for pads. While it is lit the desk's own letter shortcuts (`M S R B L`) are yours to play with; `Esc` gives them back. |
| **MIDI** | plays from a real MIDI keyboard over Web MIDI (Chrome and Edge). Ports that arrive after you switch it on are picked up too. On a kit, General MIDI's drum notes land on the right pads — 36 on the kick, 38 on the snare, 42 on the hats — and anything unmapped falls back to pad order. |
| **The dot** | lit whenever the channel is sounding — including a drum, whose own note is nowhere near this keyboard. |

Notes only, from all three: **note-off and velocity are ignored on purpose.** A
preview's length and level are the channel's own, the way its voice is — the note
sounds exactly as the song plays it. Holding a key longer would need the voice rack to
sustain, which the hand-written voices cannot do at all. Both are worth revisiting the
day the desk plays notes *into* a song rather than only out of one.

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
hand the tail back.

While the song plays, the keys light with the notes coming through the channel — the
part as it is played, in the octave it is played in. Notes above or below the two
octaves shown light the ◀ or ▶ button instead, which is both "there is more" and which
way to go for it. On a kit, the whole row lights as the beat goes past.

All three inputs — the drawn keys, the computer keyboard and MIDI — are callers of the
same one-note seam, which is why the third one cost thirty lines. A fourth (a step
recorder, notes written back into the bank) would be another.

### Limiter · A/B · Undo

- **Limiter** — the master limiter, on or off. It costs 6 ms of output latency
  whenever it is on, so a song renders differently with it than without; fix the peak
  on the channel causing it first.
- **A/B saved** — *hold* to hear what is on disk, release to come back to your draft.
- **Undo** — one step back (`⌘Z`). Slider drags coalesce: a continuous move is one
  gesture, not one step per pixel. 200 steps deep, and it spans songs — undoing back
  past a song switch takes you to that song.

### Project

- **⋯** — everything you do once an hour rather than once a minute, saving included.
  Writing the file is not a mix control, and a green Save button lit whether or not
  there was anything to write — with a red badge beside it saying so a second time —
  was the loudest thing in a header full of controls you actually touch.
- **The dot on ⋯** — this song has changes that are not in its song file yet.
  Never an alarm: drafts are kept in `localStorage` and survive a reload, so the only
  thing the dot is about is whether the *game* has heard the song.

| Menu item | Does |
| --- | --- |
| Save song | writes this song into `src/data/songs/<id>.js` after a confirm. Mix, arrangement and editable notes are written together. |
| Discard unsaved changes | throws this song's complete draft away (undoable) |
| Open an earlier version… | loads an earlier complete version of this song, ready to review before saving. See [Going back](#going-back) |
| Zero every channel | zeroes every strip in this song (undoable) |
| Render WAV | renders this song offline and reports LUFS and peak |
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
**⋯ → Playhead ms** if you would rather type it.

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
- **Right-click a name** (or anywhere in the row's header) — the same menu the strip
  below takes, mute · solo · duplicate · delete included. The row and the strip are two
  views of one track, so what you can do to it does not depend on which you were
  looking at. See [Duplicate and delete a track](#duplicate-and-delete-a-track).
- **Drag across a row** — select a **range of bars for that instrument**. This can
  refine a timeline selection before a lane-specific operation.
- **Right-click a bar** — open the same selected-bars editor targeted at that
  instrument. Mute/delete/copy/paste stay above; exact transpose, timing and gain
  controls stay together below.
- **Selected bars / Entire track** — the scope switch at the top of a track editor
  applies those same exact adjustments either to the current range or every bar of
  that instrument.
- **Fold chevron** — collapse the whole panel.
- **Splitter** (the grip below) — drag to give the arrangement more or less of the
  window; it snaps to whole lanes and never takes the rack's last strip. Drag it up
  past the first lane to fold the panel. **Double-click** hands the height back to the
  automatic fit. The dragged height is remembered.

The arrangement always shows *every* lane, whatever the mixer is filtered to.

### Selected-bars editor

Right-clicking no longer opens a long list of fixed values. It opens one inspector
showing the selected bars and the target at the top. Values are staged until
**Apply changes**, so moving several controls creates one undo point.

The scope is the **timeline selection** if you right-clicked inside one, and the
single bar otherwise. A row right-click adds the instrument target to that same
range — so "select bars 1–4 on the timeline, right-click Bass, copy" is unambiguous.

Right-click the **timeline** for whole-song structure:

| Item | Does |
| --- | --- |
| Cut / Copy / Paste | moves the complete section, every track included |
| Repeat | duplicates the selected range once, immediately after itself |
| Insert silence | inserts the same number of empty bars at the selection start |
| Mute bars | silences every track without changing the song length; right-click again to unmute |
| Delete bars | removes the bars and moves everything after them earlier. The final bar is protected |

Right-click an **arrangement lane** for that track only:

| Item | Does |
| --- | --- |
| Edit notes | opens the selected bars in the step editor |
| Mute / Unmute | silences or restores that track in the selected bars |
| Delete / Restore | removes that track region while keeping its notes recoverable |
| Copy track / Paste track | copies only that instrument's notes; paste may target a different instrument |
| Reset region / Reset track | returns that track's bar edits to its written state (notes are kept) |

Right-clicking a track name or mixer strip also offers **Adjust entire track…**,
which opens the inspector directly on every bar. The scope switch can return to the
previous bar selection without changing it.

The adjustment controls are exact rather than presets:

| Control | Range |
| --- | --- |
| Transpose | every semitone from `-12` to `+12`; shown on the arrangement as `+5`, `-7`, etc. Available for one melodic lane or every melodic track from the timeline |
| Timing | every `1/32` step from a quarter-note early to a quarter-note late |
| Gain | `-12` to `+12` dB in `0.5` dB steps |

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

### Track-family filters

Along the mixer's header, one button per family present in this song — **drums**,
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
| Head | number, name, family | click anywhere on the strip to select it; **double-click the head** to play from where that channel comes in |
| Body | **voice** | what the channel is played *by* — see below. Bass, lead, harmony and chords only |
| Body | **HIGH / MID / LOW** | ±18 dB — shelf at 4 kHz, peak at 1.2 kHz, shelf at 250 Hz |
| Body | **DELAY SEND / REVERB SEND** | 0–2, 0 = shut |
| Foot | **insert slots** | up to 6 effects |
| Foot | **pan pot** | −100…+100 |
| Foot | **fader + meter + dB** | −60…+6 dB, console taper — see below |
| Foot | **M / S** | mute (saved) · solo (never saved) |

- Every value is **relative**: 0 dB is "as authored". Banks vary their own lanes per
  section, and a trim rides on top of that rather than flattening it.
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

### Voice — what the channel is played by

The button at the top of every strip that can take one: the six melodic lanes and all
seven drums. It reads **ENGINE** until you change it, and lights teal when you have.

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
  purpose; stepping off the end of Kicks into Snares would answer a question nobody
  asked. With **ENGINE** showing, the arrows are the way in to the lane's own kind.
- **Clicking the row** opens the panel, which is where you go to jump families, read
  what a preset is for, or search.

Points worth knowing:

- **Drums or pitched, at the top of the panel.** The one split the eleven categories do
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
  and claps), and the **drum synth** (`ds` presets): the Microtonic construction, an
  oscillator with a pitch envelope and a filtered noise source, each with its own
  envelope, summed into a drive. None of them touch `Tone.Noise`, whose buffer comes
  from `Math.random` and would stop two renders of a song being identical — everything
  noisy here is built on the engine's seeded buffer, so stems still sum to the mix.
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
- Saved as a `voice` block in `src/data/mix.js`, per song, like everything else here.
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
- **Right-click the strip** → *Edit …* and *New preset from …*, next to *Change preset…*

Not in the preset picker. Choosing a sound and shaping one are different jobs, and the
panel that answers the first is the wrong place to hide the second.

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
  A **drum-synth** preset (the `ds` kit) shows the Microtonic layout: an **oscillator**
  section — waveform, a pitch that falls `PITCH → FALLS TO` over `SWEEP`, its own
  attack/decay with an `EXP`/`LIN` curve — a **noise** section whose filter cutoff can
  itself sweep, with the same envelope controls, a **drive**, and the taps. Either
  section switches off whole: a tom is all oscillator, a clap all noise, and a preset
  with neither is silent, which the save refuses.
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
path, and a Parametric EQ in an insert slot is a better EQ than three fixed bands.

---

## Effects

Six inserts per strip — channels, sends and master alike. The **slots** live on the
strip; the **parameters** live in the panel along the bottom, where there is room for
them.

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
| Level & EQ | Gain, Parametric EQ, Filter |
| Delay | Advanced Delay, Delay, Ping-Pong Delay |
| Modulation | Chorus, Phaser, Tremolo, Vibrato, Auto Filter, Auto Wah, Auto Panner |
| Drive | Exciter, Distortion, Chebyshev |
| Space & stereo | Reverb, Doubler, Stereo Widener, Frequency Shifter, Pitch Shift |
| Dynamics | L7 Limiter, Compressor, Mid/Side Compressor, Multiband Compressor |

The prices are not intuitive and are worth reading: a Phaser costs about 2% of a core
— roughly 24× a Distortion, and more than twice anything else in the list.

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
| **DRY PAN** / **WET PAN** | where each half goes, separately |
| **WET / DRY** | how much of the doubling you keep |

**DRY PAN −1 with WET PAN +1 and WIDTH 0** is the oldest double-tracking trick there
is: the original hard left, both doubles hard right. That is why there are two pan
controls rather than one — placing the pair together and placing them apart are
different gestures, and one knob cannot say both.

The detune is a **real varispeed pitch shift**, not a modulated delay imitating one,
which is what separates this from the Chorus: measured, both voices land within 0.02
cents of the dial across the whole range. It is deliberately the one modulation effect
with no **Tempo Mode** — a drift that lands on the beat is a rhythm part, and the whole
claim of the effect is that the second voice is not counting.

Two things worth knowing. It is **stereo out whatever goes in**, so a mono lane comes
out of it spread. And at WET 0 it is sample-exact transparent, dry pan included, so it
costs nothing but CPU when it is turned down.

Everything here has been verified to render in an offline context, because WAVs, stems
and videos are produced by rendering the engine offline. BitCrusher, JCReverb and
Freeverb are deliberately absent: they measure silent offline, so they would sound
right while you mixed them and then vanish from everything you exported.

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

## Right-click a strip

Or an arrangement row's header — same menu, same track.

| Item | Notes |
| --- | --- |
| Mute / Unmute | the same state as the strip's **M**, saved with the mix |
| Solo / Unsolo | the same state as **S**, never saved |
| Change preset… | the voice library, opened against this strip — the same panel the voice row opens. Only lanes a voice can play |
| Edit *preset*… | its parameters, in the rack beside this strip — see [Editing a preset](#editing-a-preset-and-writing-new-ones). Absent on a lane playing the engine's own voice, which has no entry to edit |
| New preset from *preset*… | a copy of it, onto this lane, leaving the original alone |
| Duplicate | a second strip playing the same part — see below. Channels only, and only lanes a voice can play |
| Delete *name*… | asks first, and says what goes with it — see below |
| Copy channel / send / master | the whole strip |
| Paste … | only onto the same kind of strip — a channel's sends mean nothing on a bus |
| Paste *n* effects from … | works between any two strips: a chain means the same thing everywhere |
| Bypass / enable all effects | |
| Reset channel / send / master | back to defaults (`R`) — including the voice, so the channel goes back to the engine's own. A duplicated track keeps its preset: that is the lane, not a setting on it |

### Duplicate and delete a track

Every other edit on this desk is about **balance**. These two are about the song's
**shape** — which tracks it has — and they are the only edits that add or remove a
strip and an arrangement row.

Neither touches a composition file. Both are stored in the mix (`layers`, `off` in
`src/data/mix.js`), applied by `deskBank()` in `src/engine/lanes.js`, and undone by
`⌘Z` like any other edit. Deleting a song's mix entry puts it back exactly as it was
composed.

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

The way back is **⋯ → Restore deleted tracks…**, which appears only when there is one
and lists them by name. It is there because delete is the one edit with nothing left on
screen to undo it *from*. A restored track comes back with the channel you had, not one
at unity. `⌘Z` also works, and also brings back a deleted layer, which Restore does not.

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
| `[` `]` | playhead sync, ±10 ms — see below |
| `⌘Z` | undo |

Keys never fire while you are typing into a field.

While the on-screen keyboard is **catching keys**, the letters play notes instead:
`A W S E D F T G Y H U J` up the octave, `Z` `X` to shift it, the home row for drum
pads. `space`, the arrows and `⌘Z` still belong to the desk, and `Esc` hands the
letters back.

---

## What is saved, and where

| Thing | Where it lives |
| --- | --- |
| Gains, pans, EQ, sends, mutes, effect chains, master trim, limiter | `src/data/mix.js`, on **Save to game** |
| Which bars play, in what order, with what dropped out of them | `src/data/arrangements.js`, on the same button. The song's own file is never rewritten |
| Duplicated tracks (`layers`) and deleted ones (`off`) | the same file, the same button. The song's own file is never rewritten |
| Every version of that file this desk has overwritten | `.mix-history/`, automatically, on every save. Gitignored — see [Going back](#going-back) |
| Presets — new ones and edits to existing ones | `src/data/voices.js`, on the editor's own **Save to Library**. Library-wide, not per song, so it is a separate button from **Save to game** |
| Unsaved edits, per song | browser localStorage — switching songs and coming back picks up where you left off |
| Solo | nowhere. Monitoring only. |
| Tempo drag | nowhere. The bpm belongs to the song. |
| Hidden families, font, playhead offset, arrangement height, folds, last song | browser localStorage |

`src/data/mix.js` is emitted as readable source rather than a JSON blob, because it is
committed and reviewed in a diff. Only tracks carrying real decisions are written; a
song you opened and did not change leaves no entry.

**Saving is not committing.** The game and every render tool read the file the moment
it is written, but nothing is final until Peter commits it.

### Going back

Undo covers the desk; git covers what has been committed. **Between them sat nothing**
— two saves in an evening and the first one was gone, because the only copy of it was
the file the second one overwrote.

So every write copies the file it is about to replace into **`.mix-history/`**, named
for what the save was about and stamped to the second:
`mix-2026-07-28T213011-shop-theme.js`. The last 300 are kept, a whole mix is about
12KB, and the folder is gitignored — it is a safety net under a mixing session, not a
second history beside git.

**⋯ → Restore a previous save…** lists them, newest first, as *when* and *what*:
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

The desk now sends only the songs the save is about, and the server folds them into
the file as it stands on disk. What comes back is that file, re-read, which is what
the desk then believes — so **A/B saved** and the dirty dot on ⋯ tell the truth about
the file even after another tab, or a hand, has been in it.

---

## Server routes

The Node process behind the page does the things a browser cannot. `/save`, `/history`,
`/render`, `/audition`, `/midi` and `/import-midi` are wired to buttons; `/measure` is
there for the command line.

| Route | Does |
| --- | --- |
| `POST /save` | copies `src/data/mix.js` into `.mix-history/`, then rewrites it. Takes `{ids, entries}` — the songs this save is about, merged here against the file as it stands — and answers with the file re-read. A whole-mix body, the shape the desk used to post, is still accepted and still taken as authoritative |
| `GET /history` | the snapshots, newest first |
| `GET /history/<file>` | one of them, parsed. It is a module, so this is an `import()` — the name is matched against the pattern this process writes rather than merely checked for `..` |
| `GET /midi?track=<id>&patches=1` | the song as a MIDI file |
| `POST /import-midi?file=<name>` | a `.mid` in; a bank in `src/data/imported/`, a new track id, and the notes themselves back out |
| `POST /render` | renders one track through the real engine with a mix applied, writes `dist/<slug>-mix.wav`, and reports peak / LUFS against a −16 LUFS target |
| `POST /audition` | the same render, then opens `tools/audition` on it — the plugin host runs where the mixer runs, because that is where the plugins are |
| `POST /measure` | the same measurement across many tracks without writing files — the half of "get the volume right" that a one-song desk cannot show |
| `POST /voice-save` | writes one preset into `src/data/voices.js`, renders it to measure its peak, and splices that into `PEAKS`. A preset that renders silent is put back rather than saved |
| `POST /voice-delete` | removes a preset and its peak. Refused with `409` and the list of songs while any of them still names it, unless `force` |
| `GET /voice-refs?id=<id>` | which songs play a preset — asked before a delete, shown across the top of the editor |
| `GET /tracks` | the track list |

Renders are written at unity, **not** peak-normalised: normalising would silently undo
the master trim you just set.

The three voice routes are the only ones that write source *outside* `src/data/mix.js`,
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
  - **The filename is the track id.** `Cool Song.mid` becomes `cool-song`, and
    importing that name again *replaces* it — take a song out to a DAW, bring it back
    over itself. A name a hand-written song already owns gets a suffix instead: an
    import can never shadow a cabinet.
  - **What a MIDI file cannot carry** is timbre, glissando runs and per-section engine
    overrides. Those are yours to set by hand in the bank file.
  - Add, rename or delete a bank in that folder by hand and refresh the desk — the
    list is rebuilt from the folder on every page load. `node tools/import-midi.js
    --reindex` does the same from the command line.
  - The game never imports that folder, so nothing in it ships in a build.
