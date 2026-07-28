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
- **The dot on ⋯** — this song has changes that are not in `src/data/mix.js` yet.
  Never an alarm: drafts are kept in `localStorage` and survive a reload, so the only
  thing the dot is about is whether the *game* has heard the mix.

| Menu item | Does |
| --- | --- |
| Save *song* to the game | writes this song into `src/data/mix.js` after a confirm. Only this song: other songs holding unsaved edits are named in the dialog and left alone. Reads *“song is saved”*, dimmed, when the file already matches |
| Save every changed song | writes every dirty draft in one go |
| Revert to the saved mix | throws this song's draft away (undoable) |
| Reset every channel | zeroes every strip in this song (undoable) |
| Render WAV | renders this song offline with the mix on the desk, writes `dist/<slug>-mix.wav`, and reports LUFS and peak |
| Audition through a plugin… | the same render, opened in [`tools/audition`](../tools/audition.py) — a real AU over this mix, its own GUI, previewed before you keep it |
| Export MIDI | downloads `<slug>.mid` — the notes, with GM patch names |
| Import MIDI… | turns a `.mid` into a song, and switches the desk to it |
| Export mix as JSON | all drafts, as a file |
| Import mix JSON | paste a whole file or one track entry |
| Font | typeface for the desk — only fonts actually installed are offered |
| Playhead *ms* | shifts the playhead right to match what you hear (default 50 ms; `[` and `]` nudge it by 10 while the song plays) |

---

## Timeline

A bar ruler over the song form: ticks per bar, numbered every 2/4/8/16 depending on
length. The red line is the playhead; the teal band is the armed loop.

- **Click** — park the playhead there (stopped) or jump there (playing).
- **Double-click** — play from there.
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

- **Click a bar** — parks the playhead there, selects that channel, and opens a
  **piano roll** of that bar: sixteenths across, pitch up the side, C of each octave
  picked out. Percussion gets a single *hit* row. Silent bars say so.
- **Double-click a bar** — play from there.
- **Click a name** — select that channel.
- **Double-click a name** — play from where that channel *comes in*: the first bar it
  sounds in, marked in its row. A lane already playing in the first two bars starts
  from the top instead — it comes in with the song, and skipping to bar 2 would only
  cost you the bar it arrived on. Same double-click as the **strip head** below.
- **Fold chevron** — collapse the whole panel.
- **Splitter** (the grip below) — drag to give the arrangement more or less of the
  window; it snaps to whole lanes and never takes the rack's last strip. Drag it up
  past the first lane to fold the panel. **Double-click** hands the height back to the
  automatic fit. The dragged height is remembered.

The arrangement always shows *every* lane, whatever the mixer is filtered to, and it
never mutes anything.

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
| Body | **HIGH / MID / LOW** | ±18 dB — shelf at 4 kHz, peak at 1.2 kHz, shelf at 250 Hz |
| Body | **DELAY SEND / REVERB SEND** | 0–2, 0 = shut |
| Foot | **insert slots** | up to 6 effects |
| Foot | **pan pot** | −100…+100 |
| Foot | **fader + meter + dB** | −60…+6 dB |
| Foot | **M / S** | mute (saved) · solo (never saved) |

- Every value is **relative**: 0 dB is "as authored". Banks vary their own lanes per
  section, and a trim rides on top of that rather than flattening it.
- **Any readout is a control**: drag it up and down to change it, `shift` for a fifth
  of the speed, click it to type an exact number, double-click to reset. The row's
  **label** is a reset button too.
- **Pan pot**: drag in either axis, double-click to centre, click the number to type.
- **Meter**: dB scale bottoming at −48, with a held peak line showing the loudest
  moment of the last second and a half. The border goes red on clipping.
- **Mute and solo appear twice** — here and on the arrangement row — and are the same
  state in both places.
- **Sends**: how a channel *reaches* the delay differs per lane (melodic voices tap it
  pre-fader, as the engine's echo always did; everything else routes the whole channel
  in post-fader). The row's tooltip says which.

### Send returns — Delay, Reverb

The same strip as a channel: a return EQ, a fader (the return level), a pan pot, mute
and solo, and its own insert slots. Its **device summary** at the top — `375ms · 0.35
· 2.8k` for the delay, `2.2s · pre 12ms` for the reverb — is a button: it opens that
return's built-in card in the effects panel.

Soloing a return leaves the channels feeding it and mutes everything else, so you hear
the effect on its own.

### Master

Master trim (−24…+12 dB, on top of the bank's own `musicTrim`), the limiter as a
built-in card, and six insert slots. No EQ rows: there is no EQ node on the master
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
| Drive | Distortion, Chebyshev |
| Space & stereo | Reverb, Stereo Widener, Frequency Shifter, Pitch Shift |
| Dynamics | Compressor, Mid/Side Compressor, Multiband Compressor |

The prices are not intuitive and are worth reading: a Phaser costs about 2% of a core
— roughly 24× a Distortion, and more than twice anything else in the list.

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

| Item | Notes |
| --- | --- |
| Copy channel / send / master | the whole strip |
| Paste … | only onto the same kind of strip — a channel's sends mean nothing on a bus |
| Paste *n* effects from … | works between any two strips: a chain means the same thing everywhere |
| Bypass / enable all effects | |
| Reset channel / send / master | back to defaults (`R`) |

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

---

## What is saved, and where

| Thing | Where it lives |
| --- | --- |
| Gains, pans, EQ, sends, mutes, effect chains, master trim, limiter | `src/data/mix.js`, on **Save to game** |
| Unsaved edits, per song | browser localStorage — switching songs and coming back picks up where you left off |
| Solo | nowhere. Monitoring only. |
| Tempo drag | nowhere. The bpm belongs to the song. |
| Hidden families, font, playhead offset, arrangement height, folds, last song | browser localStorage |

`src/data/mix.js` is emitted as readable source rather than a JSON blob, because it is
committed and reviewed in a diff. Only tracks carrying real decisions are written; a
song you opened and did not change leaves no entry.

**Saving is not committing.** The game and every render tool read the file the moment
it is written, but nothing is final until Peter commits it.

---

## Server routes

The Node process behind the page does the things a browser cannot. `/save`, `/render`,
`/audition`, `/midi` and `/import-midi` are wired to buttons; `/measure` is there for
the command line.

| Route | Does |
| --- | --- |
| `POST /save` | rewrites `src/data/mix.js` |
| `GET /midi?track=<id>&patches=1` | the song as a MIDI file |
| `POST /import-midi?file=<name>` | a `.mid` in; a bank in `src/data/imported/`, a new track id, and the notes themselves back out |
| `POST /render` | renders one track through the real engine with a mix applied, writes `dist/<slug>-mix.wav`, and reports peak / LUFS against a −16 LUFS target |
| `POST /audition` | the same render, then opens `tools/audition` on it — the plugin host runs where the mixer runs, because that is where the plugins are |
| `POST /measure` | the same measurement across many tracks without writing files — the half of "get the volume right" that a one-song desk cannot show |
| `GET /tracks` | the track list |

Renders are written at unity, **not** peak-normalised: normalising would silently undo
the master trim you just set.

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
