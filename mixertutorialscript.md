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
on the deployed desk. M8TRX is deliberately absent too: it ships disabled to begin with,
and a tour is not the place to advertise a button that is not there.

## Rules

1. **Nothing is modal.** The card floats over the desk; the desk stays live behind it.
   If the song is playing when a card comes up, it keeps playing.
2. **It never blocks.** No card waits for you to do the thing it describes. Next always
   works, Back always works, and closing it never leaves a panel stranded.
3. **Every card points at something**, except the two that are about the desk as a
   whole — 1 and 10.
4. **One subject per card, two paragraphs.** Not one *fact* per card: at ten cards a card
   is a subject — the strip, the levels, the effects — and it gets two paragraphs to
   cover it. The test is whether a reader could name the subject from the title; if a card
   needs a third paragraph, it is two subjects.
5. **A card whose anchor is not on screen skips itself.** The desk sheds the Effects,
   Sends and EQ rows on a short window, and a tour that points at nothing is worse than
   a tour that is one card shorter.
6. **The rack is fetched before the plan is drawn up.** The bottom half of the desk holds
   the mixer *or* a note editor, never both, so a tour opened over the piano roll would
   otherwise write off every card from 3 to 7. `makeRoomForStrips` switches the lower
   half back to the mixer and, if the shrink ladder is still eating the strips, pushes
   the splitter up. Both are put back on close, and neither is remembered. It runs
   **twice**: the switch is asynchronous, so the first pass asks whether the strips are
   being shed at a moment when there is no rack on screen to shed anything, and always
   hears no.
7. **A card that opens a panel closes it again, and says so in `available`.** The Effects
   panel and the synth editor are both in the document at all times and off screen until
   something opens them — which is their own `setup`, long after the plan was drawn, so
   asking `onScreen` would drop them before they ever ran. Each is put back on the way out
   **only if the tour is what opened it**; a visitor already mixing with the Effects panel
   up does not want it shut behind them.
8. **The card outranks everything it opens.** `#tut` is `z-index: 80`. The drawer, the
   pickers and the synth editor all sit at 69–72, so a lower card went behind the very
   panel it was describing, taking its own Back and Next with it.

Measured against the shipped desk at 1440×900: **9 of 10 cards on THE FOOD COURT**, and
10 on a song whose melodic channels carry presets. The one that stands down is 7, the
synth editor — the food court's melodic lanes are on engine bundles, which have no editor
to open. `work/local/check-mixer-tour.js` walks it and checks every card is inside the
window, rings its anchor, and leaves the desk as it found it.

## Staging

| | |
|---|---|
| Entry | the **?** in the toolbar, last of all, after Undo and Settings |
| First visit | opens by itself at card 1, once, remembered in `mash-mixer-tutorial-seen` |
| Card | one floating panel, arrow pointing at the anchor, flipping above, below or beside to fit |
| Target | an outline ring on the anchored element. No dimming, no backdrop, nothing made unclickable |
| Nav | Back · Next · ✕, and a `n / 10` counter |
| Keys | → or Enter next · ← back · Esc close |
| Cards | 10 |

## How it got from 23 to 10

Three pillars had to survive, and they are what the cuts were measured against: every
channel is a live synth (card 1), the instrument is a preset you can open and edit in
this song (cards 6 and 7), and a song can be generated whole from a style pack (card 8).

Most of the loss was a **second card about a subject that already had one**:

| Gone | Where it went |
|---|---|
| *Four regions* + *Transport* | 2, one card about where you are and how you move |
| *Every number is a control* | 3, with the signal path |
| *Two buses, and they are absolute* | 4, with the fader |
| *Grouped, and priced* + *Managing it from the strip* | 5, one card about effects |
| *Every preset, with no song in front of it* | one sentence on card 6 |
| *Edit it* | 7, with what is inside the editor |
| *Keep it* + *Roll one* + *The three starters* | 8, all of them in the same drawer |
| *Record* | 9, with the note editors |

Two came out for good:

- **A/B.** Hold-to-compare is discoverable from a button that reads A/B SAVED and
  explains itself in its tooltip. Undo was the half worth keeping and moved to card 8.
- **The master strip.** A strip is a strip and card 3 already taught them. The one fact
  worth rescuing was the limiter — off by default, because the 6 ms of lookahead a
  compressor node cannot give up would change what gets rendered — and it is now the tail
  of card 4, where it sits next to the clip indicator that would make you reach for it.

One thing was genuinely given up rather than moved: **card 5 no longer opens the effect
catalogue.** It can ring the catalogue or the Effects panel, not both, and the panel is
where the time is spent — so the catalogue is described rather than shown.

---

### 1 — welcome

*No anchor. Card sits centred, low.*

> **A synth workstation, not a tape machine**
>
> There are no audio files here. Every channel is a synthesiser rendered live, so
> changing the bass sound means opening the bass and editing it, not swapping a sample.
>
> Ten cards. The desk stays live behind them — click anything at any point.

Buttons are `Start` and `No thanks`. **No thanks sets the remembered flag too**, or the
desk nags on every reload.

### 2 — the desk

*Anchor `#play`. Key chip: `Space`.*

> **Getting around the desk**
>
> TIMELINE and ARRANGEMENT fill the top half — one row per track, one cell per bar. The
> bottom half holds one of three, switched from the toolbar: MIXER, PIANO ROLL, STEP GRID.
> EFFECTS is a panel down one side, right or left, and drag the bar between the halves to
> give one of them more room.
>
> Space plays and pauses; Stop returns to where playback started, pause holds where you
> are. Click the timeline to park the playhead, double-click to play from there, and drag
> across it to pick out bars for Loop.

The layout card used to have no anchor. Merged with the transport it has one, which is
why rule 3 now names two unanchored cards rather than three.

### 3 — the strip

*Anchor the head of the tour's chosen strip. Selects that lane on the way in: cards 4 to
7 all use it as their subject.*

> **The channel strip**
>
> Voice, three-band EQ, two sends, up to six inserts, then fader, pan, mute and solo.
> Click a strip to select it — the Effects panel and the note editors follow the
> selection, and ↑ and ↓ walk the rack.
>
> Every number on the page is a control: drag it, hold shift for a fifth of the speed,
> click it to type an exact one, double-click to reset. The EQ is fixed at 250, 1.2k and
> 4k, plus or minus 18 dB — for anything else, insert a Channel EQ.

### 4 — levels

*Anchor the fader column; the send rows are in the ring too.*

> **Levels, and two buses**
>
> The fader taper is a console law, not a straight line: the bottom of the travel is
> silence, three-quarters up is unity, and the top quarter is the only gain there is. The
> meter's peak line sits where the loudest moment was, and a red border means it clipped —
> though the master's own LIMITER is off on purpose, because the 6 ms of lookahead it
> cannot give up would change what gets rendered.
>
> Delay and reverb have their own return strips at the right of the rack. Both read in dB
> and tap the channel AFTER its fader, and both are absolute rather than relative trims —
> the same reading sends the same amount of the kick as it does of the lead, in every bar.

The old copy said 1.00, and said melodic tracks tapped the delay pre-fader. Both are
gone: every aux taps `pres`, the fader's own output, which is what lets a ramped send
survive you hitting solo. See the note beside `AUXES` in `src/engine/mixer.js`.

This is the tallest card in the tour — 492px, against a 900px window. It is the one to
watch if anything is ever added to it.

### 5 — effects

*Anchor the device rack; the strip's insert block and empty slot are in the ring too.
Key chip: `E`. Opens the panel on the way in, and shuts it again on the way out unless it
was already up.*

> **Effects**
>
> The dashed outline on a strip, under the sends, is an empty insert — click it for a
> catalogue of thirty-odd in six groups, each showing what it costs as a percentage of one
> core, measured rather than guessed. Six slots per channel, and their order is the signal
> path.
>
> Their parameters live here, one card per insert in chain order. The arrow in the header
> moves the panel to the other side of the desk; drag a title bar to reorder, the power
> mark bypasses and the ✕ removes. Tempo Mode on a delay or an LFO swaps free time for a
> note division, and says what that is at this tempo.

The six group names come from `EFFECT_GROUP_ROWS` in `tools/mixer-entry.js`. The card
gives a count rather than a list, both because a comma list made six read as seven and
because the catalogue is no longer on screen to be read along with.

### 6 — change the instrument

*Anchor the preset name at the head of the selected strip.*

> **Swap the voice**
>
> Click the name at the top of a strip for the preset picker: four hundred and fifty-odd
> presets, filed by what they SOUND like — bass, lead, pad, keys, organ, bells, orch, FX
> and ten kit categories — rather than by which track they belong on. Search covers the
> descriptions, so "808" and "detune" find things.
>
> A voice is a bank key rather than a live node, so choosing one restarts the sequencer:
> about half a second of silence with the playhead held. The preset library in the
> toolbar is the same catalogue with no song in front of it.

460 in `VOICES` at the time of writing. "Sixty-odd" was true of a catalogue seven times
smaller; if this number is ever wrong again, count it rather than guessing.

### 7 — open the synth

*Anchor the voice editor. Opens it on the way in and closes it on the way out, unless the
visitor already had one open.*

> **Open the instrument**
>
> Right-click a strip for Edit Simple — or Edit Advanced, where that instrument has a
> full window. It opens where you clicked and stays open, so you can work while the sound
> changes under your hands, and the preset is copied into this song first: your edits
> belong to the song and ride its undo stack.
>
> SYNTH at the top names which of six instruments builds a pitched preset — KNDO-5,
> WNDR-9, MRDR-3, TNGR-2, CRLS-1, RMND-2 — and changing it rebuilds the patch from the new
> one's defaults rather than converting it. A drum preset names none: it is the sections
> themselves, and each one switches off as a bypass rather than a delete.

The card has to be true of either, because which one the tour lands on depends on the
song, and it lands on a drum more often than not.

The roster is `EDITABLE_SYNTHS` in `tools/mixer-voice-editor.js`, and `docs/synth-naming.md`
is the decision record behind the names. The old list — game synth, additive, mono, FM,
AM, duo, membrane, metal — named twelve architectures that four rounds of consolidation
have since merged into seven.

### 8 — songs

*Anchor the Save button, opening the drawer to reach it; New song is in the ring too.
Closes the drawer on the way out.*

> **Songs**
>
> The menu holds your songs and Save; the dot on the menu button is the unsaved mark, and
> your mixes are kept in this browser, on this computer. ⌘Z goes back two hundred steps
> and crosses songs, a whole parameter drag counting as one of them.
>
> New song generates a complete arrangement from one of eleven style packs — leave Style
> on AUTO and a seed picks the key, the chord progression, the drum patterns and each
> melody's shape. Full Song gives you kit, bass, chords and lead; Beats Only the kit;
> Blank one silent track. There is no re-roll.

Three cards in one, and they merge cleanly because all three were already in the same
drawer with the same `setup`. The eleven packs are `SONG_STYLES` in
`tools/lib/song-styles.js`; the card counts them rather than reciting them, because the
dialog itself lists them.

### 9 — notes

*Anchor the piano roll button; the step grid and Record buttons are in the ring too.
Key chip: `N · G`.*

> **Drawing and playing**
>
> N puts the piano roll in the bottom half of the desk, where the rack was — what the
> SELECTED CHANNEL plays, as notes against bars. G puts the step grid there — what the
> KIT plays, sixteen squares a bar. The mixer button beside them brings the strips back.
>
> Record — ⇧R — writes what you play into the selected track, from MIDI, the on-screen
> keys or the computer keyboard, quantised to sixteenths and copied everywhere that part
> repeats. It only ever adds; ⌘Z takes back a phrase, and Esc silences everything and
> drops whatever has not landed.

They used to be floating windows you left open alongside the rack. They are one
three-position view switch over `#lowerwork` now — see `setLowerView` — which is why the
card names the mixer button as the way back.

### 10 — done

*No anchor.*

> **That's the desk**
>
> Right-click is worth exploring — strips, track rows, effect slots and bars all have
> their own menus. Hover anything to find out what it is, and the gear beside this ?
> holds appearance, playback and diagnostics.
>
> The **?** brings this back.

Single button: `Close`.
