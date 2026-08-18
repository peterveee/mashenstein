# SONG MIXER TOUR — script

The running record of what the tour says and where it points, card by card, so the
writing can be finessed without reading `tools/mixer-tutorial.js` to find out what is
currently in it. **This file and that file have to agree** — change a line here and
change it there, in the same commit.

## Who it is for

Someone who already mixes. They know what a fader, a send and a compressor are, and a
card that explains one is a card that has wasted its turn. The words go on what is
*different* about this desk:

- every channel is a synthesiser rendered live, not a sample on a timeline;
- the instrument on a channel is a preset you can open and edit, in this song, without
  touching anything else;
- a song can be generated whole from a style pack and then mixed.

It is a DAW. Nothing in the copy refers to a game, a level, a cabinet or a hero, and
nothing mentions filing presets into the shared library — that has no server behind it
on the deployed desk.

## Rules

1. **Nothing is modal.** The card floats over the desk; the desk stays live behind it.
   If the song is playing when a card comes up, it keeps playing.
2. **It never blocks.** No card waits for you to do the thing it describes. Next always
   works, Back always works, and closing it never leaves a panel stranded.
3. **Every card points at something**, except the three that are about the desk as a
   whole — 1, 2 and 23.
4. **One idea per card.** Two or three sentences. If a card needs four, it is two cards.
5. **A card whose anchor is not on screen skips itself.** The desk sheds the Effects,
   Sends and EQ rows on a short window, and a tour that points at nothing is worse than
   a tour that is one card shorter.

## Staging

| | |
|---|---|
| Entry | the **?** in the toolbar, last group, after Undo |
| First visit | opens by itself at card 1, once, remembered in `mash-mixer-tutorial-seen` |
| Card | one floating panel, arrow pointing at the anchor, flipping above or below to fit |
| Target | an outline ring on the anchored element. No dimming, no backdrop, nothing made unclickable |
| Nav | Back · Next · ✕, and a `n / 23` counter |
| Keys | → or Enter next · ← back · Esc close |
| Cards | 23, in six chapters |

---

## Chapter I — What this is

### 1 — welcome

*No anchor. Card sits centred, low.*

> **A synth workstation, not a tape machine**
>
> There are no audio files here. Every channel is a synthesiser rendered live, so
> changing the bass sound means opening the bass and editing it, not swapping a sample.
>
> Twenty-odd cards. The desk stays live behind them — click anything at any point.

Buttons are `Start` and `No thanks`. **No thanks sets the remembered flag too**, or the
desk nags on every reload.

### 2 — the layout

*No anchor.*

> **Four regions**
>
> **Timeline** across the top. **Arrangement** — one row per track, one cell per bar.
> **Notes** — piano roll or kit grid for whichever track is selected. **Rack** — the
> channel strips. **Effects** — the parameters for whatever is selected above.
>
> Every header folds. Drag the seams between them.

### 3 — transport and loop

*Anchor `#play`. Key chip: `Space`.*

> **Transport**
>
> Space plays and pauses. Stop returns to where playback started; pause holds. Click the
> timeline to park the playhead, double-click to play from there.
>
> Drag across the timeline to pick out bars, then Loop to cycle them.

---

## Chapter II — The channel

### 4 — the strip

*Anchor the head of the first channel strip in the rack. Selects that lane on the way
in: cards 5 to 13 all use it as their subject.*

> **Signal path, top to bottom**
>
> Voice, three-band EQ, up to six inserts, fader and pan, mute, bus. The name at the top
> is the instrument; everything under it is what has been done to it.
>
> Click a strip to select it — the Effects panel and the note editor both follow the
> selection. ↑ and ↓ walk the rack.

### 5 — the gesture

*Anchor the HIGH row of the selected strip.*

> **Every number is a control**
>
> Drag up or down, hold shift for a fifth of the speed, click the number to type an
> exact one, double-click to reset. The same on every knob, fader and readout on the
> page.
>
> This EQ is fixed-frequency — 250, 1.2k and 4k, plus or minus 18 dB. For anything else,
> insert a parametric.

### 6 — the sends

*Anchor a send row on the selected strip.*

> **Two buses, and they are absolute**
>
> Delay and reverb, with their own return strips pinned to the right of the rack.
>
> Unlike the fader and the EQ, these are not relative trims: 1.00 sends the same amount
> of the kick as it does of the lead, in every bar. Melodic tracks tap the delay
> pre-fader; everything else is post.

### 7 — fader and meter

*Anchor the fader column of the selected strip.*

> **Level**
>
> The taper is a console law, not a straight line: the bottom of the travel is silence,
> three-quarters up is unity, and the top quarter is the only gain there is.
> Double-click to put it back to unity.
>
> The meter holds its peak for a second and a half. A red border means it clipped.

---

## Chapter III — Effects

### 8 — add an insert

*Anchor the empty insert slot at the foot of the selected strip.*

> **Six slots per channel**
>
> The dashed outline at the bottom of a strip is an empty insert. Click it — or
> right-click anywhere in the block — for the catalogue.
>
> Order is the signal path. Drag one slot onto another to reorder the chain.

### 9 — the catalogue

*Anchor the picker. Opens it on the way in; closes it again on the way out unless
something was chosen.*

> **Grouped, and priced**
>
> Level & EQ, delay, modulation, drive, space & stereo, dynamics. Thirty-odd effects,
> and each one shows what it costs — a percentage of one core, measured rather than
> guessed.
>
> Most are under a fifth of a percent. The phaser is two. Watch the CPU readout in the
> toolbar if you stack them.

### 10 — the effects panel

*Anchor the device rack at the bottom of the desk.*

> **Where the parameters live**
>
> One card per insert, for the selected channel, in chain order. Drag the title bar to
> reorder — dragging the body would fight the sliders. The power mark bypasses, the ✕
> removes.
>
> Tempo Mode on a delay or an LFO swaps free time for a note division, dotted and
> triplet included, and the readout says what that is in ms or Hz at this tempo.

### 11 — the chain

*Anchor the insert block on the selected strip.*

> **Managing it from the strip**
>
> Hover a slot: the power mark on the left bypasses, the cross on the right removes.
> ⌥-click anywhere on it bypasses. Click the name to jump to its card below.
>
> Right-click for the rest — copy and paste settings between two of the same effect,
> duplicate, insert before or after, reset to defaults.

---

## Chapter IV — Sound design

### 12 — change the instrument

*Anchor the preset name at the head of the selected strip.*

> **Swap the voice**
>
> Click the name at the top of a strip for the preset picker. Sixty-odd presets, filed
> by what they sound like — bass, lead, pad, keys, pluck, organ, bells, orch, FX and a
> kit set — rather than by which track they belong on. Search covers the descriptions
> too, so "808" and "detune" find things.
>
> A voice is a bank key rather than a live node, so choosing one restarts the sequencer:
> about half a second of silence with the playhead held.

### 13 — open the synth

*Anchor the strip head. There is no button to point at — the way in is the strip's own
right-click menu.*

> **Edit it**
>
> Right-click a strip for EDIT PRESET, which opens the synthesiser itself right where you
> clicked. It is a window, not a dialogue: leave it open, drag it wherever you want it,
> and work while the sound changes under your hands.
>
> Editing from a strip copies the preset into this song first, so you are working on
> this song's own version of it. Your edits ride the undo stack and belong to the song.

### 14 — inside the synth

*Anchor the voice editor. Opens it on the way in.*

> **What is in there**
>
> A pitched preset opens with SYNTH at the top, picking the construction — game synth,
> additive, mono, FM, AM, duo, membrane, metal — and changing it rebuilds the patch from
> that class's defaults, so it is a fresh start rather than a conversion. A drum preset
> has no class: it is the sections themselves, from the oscillator down through noise,
> ring and metal.
>
> Optional sections carry an on/off switch in their bar, and off is a bypass rather than
> a delete — it keeps what you had and puts it back exactly as you left it.

The card has to be true of either, because which one the tour lands on depends on the
song. It prefers a melodic channel carrying a preset; THE FOOD COURT has none — its
melodic lanes are on engine bundles, which have no editor — so on the shipped song this
card opens a drum.

### 15 — the library

*Anchor the preset library button in the toolbar.*

> **Every preset, with no song in front of it**
>
> A browsing bench. Filter by pitched or drums, filter by which synth class a preset is
> built from — an FM bell and an additive bell want completely different edits — and
> audition anything on the keyboard beside it.
>
> Use it to find a sound. Do the editing back on the strip, where it belongs to a song.

---

## Chapter V — Committing

### 16 — master

*Anchor the master strip.*

> **The master strip**
>
> Left of the rack, with its own six inserts and a limiter that has no controls.
>
> The limiter costs 6 ms of latency, which means it changes what gets rendered as well
> as what you hear. It is a seatbelt, not a mastering chain.

### 17 — A/B and undo

*Anchor the A/B button.*

> **Hear what you changed**
>
> Hold A/B to hear the saved version; let go and you are back on yours. Hold-to-compare
> rather than a toggle, so you cannot lose track of which one you are on.
>
> ⌘Z goes back two hundred steps and crosses songs. A parameter drag is one step, not
> two hundred.

### 18 — save

*Anchor the menu button, then the Save button once the drawer is open. Leaves the drawer
open for card 19.*

> **Keep it**
>
> The menu holds your songs and Save. The dialog names which halves it is writing, and
> the dot on the menu button is the unsaved mark.
>
> Your mixes are kept in this browser, on this computer.

---

## Chapter VI — Starting from nothing

### 19 — a new song

*Anchor the New song button in the open drawer.*

> **Roll one**
>
> New song generates a whole arrangement from a style pack. Eleven of them: electropop,
> half-time dirge, surf spy, boom bap, motorik driver, bell box, parade march, dub
> chamber, house, techno, electro.
>
> Leave Style on **Auto** and it picks one. A seed then chooses the key, the mode, the
> chord progression, the harmonic rhythm, the kick, snare and hat patterns, the bass
> figure, and each melody's rhythm and shape.

### 20 — what you get

*Same anchor as 19.*

> **The three starters**
>
> Full Song gives you kit, bass, chords and lead, playable the moment it appears. Beats
> Only gives you the kit. Blank gives you one silent track to write into.
>
> Bars sets the length, and the tempo comes from the pack unless you untick it. Every
> track arrives at unity with no effects — the mix is yours to make. There is no
> re-roll; if you do not like what came out, make another.

### 21 — the note editors

*Anchor the piano roll button; the step grid button is in the ring too.*

> **Two ways in**
>
> The piano roll is the melodic view of whichever track is selected — drum tracks get a
> kit grid instead. The step grid is the same notes as a pattern, steps you toggle.
>
> Both are windows: leave them open and they follow the selection while the song runs.
> Sixteenths are the floor. There is nothing finer to draw.

### 22 — play it in

*Anchor the MIDI button, then the Record button. Two cards on one line of copy, so the
ring moves through the sentence.*

> **Record**
>
> Turn on MIDI and the desk listens to your controller. Without one, the keyboard button
> puts two octaves on screen — or the song's own kit on a drum track — and the computer
> keys play it.
>
> Record writes what you play into the selected track, quantised to sixteenths and
> copied everywhere that part repeats. It only ever adds. ⌘Z takes back a phrase; Esc
> silences everything and drops whatever has not landed yet.

### 23 — done

*No anchor.*

> **That's the desk**
>
> Right-click is worth exploring — strips, track rows, effect slots and bars all have
> their own menus. Hover anything to find out what it is.
>
> The **?** brings this back.

Single button: `Close`.
