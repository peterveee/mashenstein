# The full-window MRDR-3 and KLNG8 editor

Handoff note. Written 2026-08-08, at the end of the session that built it.

## What it is

MRDR-3 and KLNG8's preset editors have two surfaces now. The **strip panel** (`#voiceedit`) remains
366px, three channel strips wide, and one long scroll; its pilot surfaces show Quick controls
and an **ADVANCED** button. That button opens the shared **full window** (`#synthfull`): MRDR-3
holds the same 169 controls in a six-column grid, while KLNG8 uses the same renderer for
its own source cards.

It came from a Claude Design handoff (`README.md` plus an interactive prototype, in Peter's
Downloads). The design is followed closely but not slavishly; every departure is noted below.

These are the first two of twelve. Peter's plan is that every synth gets a simple face in the
channel strip and an Advanced/Edit button over a full interface — 82 cards and 495 controls
across all of them. **Nothing here should be built in a way that only works for MRDR-3.**

## Files

| File | What it holds |
| --- | --- |
| [tools/mixer-synth-full.js](../tools/mixer-synth-full.js) | The window: layout renderer, card headers, capsule switches, popovers, choice rows, wave glyphs, mixer cells |
| [tools/mixer-synth-graphs.js](../tools/mixer-synth-graphs.js) | The ADSR envelope and filter-response graphs, and their arithmetic |
| [tools/mixer-voice-editor.js](../tools/mixer-voice-editor.js) | The panel definition, `fullLayout()`, and the **kit** the window is handed |
| [tools/mixer-shell.html](../tools/mixer-shell.html) | `#synthfull` markup and all its CSS |
| [tools/mixer-entry.js](../tools/mixer-entry.js) | `createFull` injection, and the ⎋ listener |
| [tests/synth-full-layout.js](../tests/synth-full-layout.js) | The completeness invariant |

## Architecture — read this before changing anything

**One `state`, one `touched()`, two surfaces.** `mixer-synth-full.js` is a LAYOUT, not a
second editor. It receives a **kit** built at the bottom of `createVoiceEditor` and has no
other handle on a preset: no `VOICES` import, no `setAt`, no `state`. So the two surfaces
cannot disagree about a value, because there is only one value.

The kit gives it: `voice()`, `get()`, `read(row)`, `layout()`, `write(row, x)`,
`writeMany(pairs)`, `pickWrite(row, o)`, `sectionOn()`, `toggleSection()`, the strip's own
widget builders (`numRow`, `pickRow`, `groupCard`, `knob`), `guards()`, `repaint()`,
`setSolo()`, `onFullClosed()`. Graphs are explicitly two-way: a graph gesture writes the
shared rows and moves the sibling pot needles through `onLive`; a pot gesture re-reads and
redraws the graph through a lightweight change callback, without rebuilding the card under
the pointer. The same kit exposes `UNDO`: the history is held by the shared editor state,
and continuous pot/graph drags are coalesced into one transaction. `Ctrl/Cmd+Z` and the
Advanced header button use that same path.

The title bar also carries **SOLO** — the *desk's* solo, on the channel this preset is
playing, not the `S` on the cards, which isolates a layer inside the sound. It is the
strip's own button reached from here (`laneSoloAvailable/laneSoloOn/toggleLaneSolo` on the
kit, wired to the desk's `setLaneSolo`), so it lights the strip and the desk's solo lamp
too, and it is left standing when the editor closes — monitoring the desk can still see.
A preset opened from the library has no channel to isolate, so the button is absent there.

`writeMany` exists because a graph handle moves two parameters per gesture frame, and
`touched()` re-banks the voice, tells the song, marks the desk dirty and schedules a
measurement — doing all four twice a frame stutters the drag.

### The layout is data, and it checks itself

`fullLayout(voice, {layer})` in `mixer-voice-editor.js`, beside `panelSpec`. It names CARDS
by a stable `key` and takes their rows from the panel definition.

> **Every row in `panelSpec({synth:'MRDR-3'})` appears exactly once as a live control.**

Unplaced, placed twice, or naming a card that does not exist → `fullLayout` throws with the
path and label, and `tests/synth-full-layout.js` fails. This is not optional decoration:
`pot-coverage.js` works at ROOT-key granularity (`layer.osc2.filter.env.attack` counts as
`layer`), so a leaf the window forgot hides behind the hundred siblings sharing its root.
**This invariant caught three real mistakes during the build.** Trust it.

Three additive tags on the panel data support it: `key` on every group, `part` on the Note
card's rows (splits SETTINGS from VIBRATO), and `pull:` in the layout for rows that move
between cards.

### Two bug classes that cost hours — do not reintroduce

1. **A shown-but-empty `#synthfull`.** It is full-screen with `pointer-events: auto`, so an
   empty one sits invisibly over the desk and swallows every click *including on the strip
   panel*. The symptom reads as "the whole mixer stopped responding" and points nowhere near
   this file. Guards: the deferred `show` re-checks `showing`; a throwing `render()` closes.
   Both asserted in `tests/mixer-layout.js`.
2. **State decided at build time that a write cannot change.** Card folding was computed in
   `groupCard`, so turning an LFO's DEPTH up left its other four controls unreachable.
   Rebuilding on write is not the fix — it drops the pot out from under the pointer. The fix
   is a **class toggled per write**, which is how greying already worked. See `guardSet`'s
   `hide` flag.

Also: `numRow`'s `set` is display-only (does not fire `onInput`), which is what makes it safe
for a graph to move a sibling pot's needle live. The graph refresh callback redraws only the
SVGs, so a pot never drops out from under the pointer. And the strip's DOM goes stale while
the window is up — the two share the value, not the DOM — so `onFullClosed()` rebuilds it.

## Decisions taken

| | |
| --- | --- |
| PWM / LFO / Humanise switches | **Removed from both panels.** Depth 0 is off; the engine already tested the value. Needed: depth defaults to 0, `seedless` on those groups so `applyDefaults` does not seed them, an LFO `target` fallback in `_playLayer`, per-layer PWM rates moved onto the rows, two `tests/voices.js` assertions rewritten. **Verified: no shipped preset changes sound.** |
| Those cards fold instead | On the STRIP only, to their one lead control (`DEPTH` / `LEVEL VAR`) — the switch used to be the way back, so folding cannot hide everything. |
| Curve popovers | **Amp envelopes only.** `centsEnv` is linear-only, so pitch/filter env curves would be dead pots the coverage test cannot see. |
| Window | **Non-modal.** Slides down, no backdrop, nothing dimmed or inert, ✕ to close. The desk stays live underneath. |
| Size | Fluid `min(1600px, 100vw−24px)` × `min(900px, 100vh−24px)`. The spec's fixed 1600×900 does not fit a 1440×900 laptop. A board whose band fixes its own column width (`track`) overrides the width with `--sf-winw` and is exactly as wide as its cards — TNGR-2, KLNG8 (1598px with its second oscillator, capped at the viewport on a narrower screen) and the scoped families. |
| Pot geometry | The desk's, not the prototype's — 290° sweep, 150px travel, click-the-readout to type. Only the size changed (42→46px, CSS only). |
| A/B, COPY→, INIT | Deferred. |

## The layout as it stands

Three bands, six columns, **columns aligned between bands** (verified: both bands' cell
lefts are identical).

```
mixer   [ LAYER 1 (2) ] [ LAYER 2 (2) ] [ LAYER 3 (2) ]          168px
layer   [Osc][Pitch Env][Filter][Filt Env][Amp][Settings]        auto
shared  [Humanise][LFO][G.Filter][G.Filt Env][G.Amp][Effects]    1fr
```

The shared band's last three columns line up with the layer band's — filter, filter
envelope, amp in both rows — so the shared stage reads as the same three stages again,
once for the whole stack. **Effects** ends the row because it is the only card there that
is not part of the voice's shaping but the stages after it: DRIVE (with PLACE, which is
the one control that can move a stage in front of the Global Filter) and CHORUS.

- **Layer cells** hold live controls, not readings: INTERVAL, DETUNE, GATE, UNISON,
  SPREAD, STEREO, DELAY, and a full-width level fader. The header names the layer *and its
  waveform* — `LAYER 1 · SQUARE` — which is a reading of the picker on the OSC card, not a
  control; "sub, saw, noise" is how a three-layer stack is read at a glance. Right of the
  name sit the layer's two whole-layer controls, **S** and **COPY**: solo, and a menu that
  replaces this layer entirely — oscillator, filter, all four envelopes, bypassed sections
  included — with another. COPY was on the OSC card's header, which put a whole-layer
  action inside the smallest part of the layer and read as "copy the oscillator".
- **OSC card** (first cell of the layer band, still 1/6 wide) is the wave and whatever
  modulates it: WAVE (glyphs), COLOUR (unlabelled, hidden unless noise), and then **one**
  modulator sub-section, chosen by the wave —
  - a **pulse** gets PWM in the grid (PLS WIDTH, DEPTH, WAVE, RATE, ONSET) and **FM behind
    the header's FM button**;
  - **any other wave** gets FM in the grid, with the FM section's own switch riding on the
    `FM` rule line, and no PWM at all (there is no width to move).

  A sub-section that is switched off is dimmed in place, never removed — the switch on its
  rule is the way back on, so it may not hide the controls it governs.
- **Graphs**: five draggable ADSR envelopes, two draggable filter responses. Each handle is
  bound to a ROW — reads through its `read`, writes through it, clamps to its range and
  step. A second grip on existing controls, never a new one.
- **Header** on every card: 26px, capsule switch, title left, then panel buttons.
  Solo and COPY are on the LAYER only.

Counts today: **167 controls, 97 on screen at once, 35 per hidden layer.** (Printed by
`node tests/synth-full-layout.js`, which derives them — never type them here without
running it.)

KLNG8 uses the same renderer without MRDR's layer mixer, and now in **one band of six
single-column cells** — OSC 1 and OSC 2, *each with its own FM stacked under it*, then NOISE,
RING, METAL and MASTER (with DRIVE and HUMANISE as sub-sections, and TAPS behind a door in
its header). The second oscillator took the sixth column when it arrived, and the window
grew by one track rather than the cards shrinking — which is what fixing the track buys, and
is true in both directions. It was nine
cards on three bands, each two columns wide; at 525px a card seats eight pot columns, so
every section drew its source pots and its envelope on one undifferentiated line. Halved in
width and roughly doubled in height, the same pots are two rows of four with the envelope on
its own — see `startRow` on every drum ATTACK. Its Advanced layout currently places **90**
controls, including Master Tune and Ring/Metal Attack — 73 of them before the second
oscillator, which brought its own twelve and its modulator's five.

**FM shares its oscillator's column** rather than standing in one of its own. It is the
modulator of that one source and nothing else — the pairing TNGR-2's board makes four times
over — and a column is as wide as every other column and as tall as the tallest card in the
band, so three pots and a two-stage envelope alone in a fifth of the window was mostly air
while the window itself was a whole column wider than the instrument needed. Stacked, FM
keeps its own header, its own switch and its own envelope: a stacked column is two *cards*,
not one card with a rule in it. The column is **not** an equal pair the way TNGR-2's are —
`.sfband-chain .sfcell.sfstack` gives it `grid-template-rows: auto 1fr`, so the oscillator
takes what it needs and FM takes the rest, which also brings FM's envelope down onto the same
floor line as NOISE, RING and METAL's.

**The band fixes its own column width** (`track: 259`) rather than dividing the window into
fractions, exactly as TNGR-2's and the scoped boards' do: the renderer sizes `--sf-boardw`
and `--sf-winw` from it, so dropping a column makes the *window* 259px narrower instead of
making the cards thinner. 259px is what a sixth of the old 1600px window came to, which is
the width the four-pot grid was tuned against.

**The five source LEVELs are faders**, not pots — `fader: 'LEVEL'` on the OSC 1, OSC 2,
NOISE, RING and METAL cells, drawn by the same `fader()` that lays TNGR-2's two oscillator
levels along the top of their cards. Same row, same range, same write path: a pot lying down.
What it buys is that the five levels read off the top of the band as one line — which is the
balance of the drum — and that the pot grid below now starts at the controls saying what the
source *is*. MASTER keeps its pots: TRIM DB is a trim, not a mix.

**Drum cards SPREAD** (`top`, `flowSub`, `spread` → `.sfspread`), where MRDR's hang
everything from the bottom. Three ways to fill a card, and this is the third: bottom-aligning
drops the whole stack to the floor and opens the gap under the header, reading from the top
banks every spare pixel at the foot — which is what left Master's DRIVE and HUMANISE huddled
under the title with a third of the card empty beneath them. So the slack is *divided*:
`margin-top: auto` on every block after the first, and several auto margins in one flex
column take an equal share each, so the blocks step evenly down and the last lands on the
floor. **That is also what lines the envelopes up.** `foot` on every drum ATTACK cuts the
envelope off the end of its card's rows (`splitFoot`) and it is drawn as a block of its own;
being last on all five source cards, and one row of pots on each, the five come to rest on
one line across the band — the alignment `startRow` gives the block inside a card, given to
the band. MRDR's envelopes need none of this: bottom-aligned already, its ADSR blocks share
a baseline by construction. Its SETTINGS and EFFECTS cards *are* spread, because they are
two concepts in one frame rather than a stack of blocks — see **Seamed cards** below, which
is the same mechanism generalised to every board.

**Taps is a door, not a column** (`tapsDoor`), and the count rides on the button — `TAPS` at
one hit, `TAPS 3` at three, so what the door hides is the detail and never the fact. It is
the one section that is not part of the signal path, and the one most presets have nothing
in: fifteen drums in the catalogue use taps and every other one is a single hit. Inside, the
taps are a **table — a row per hit, a column per number** (TIME, LEVEL,
DECAY; which columns exist is per path, see `TAP_KEYS`), with FALLOFF/PITCH/TONE under a
rule of their own because they are ratios *between* hits rather than values on one. The
panel **redraws its own body** rather than calling `kit.repaint()`: the stepper inside it
changes how many controls the panel has, and a window repaint would take the popover down
with the card it hangs off, on the first press of a button that lives inside it.

## Seamed cards — one frame, two concepts

Several cards on these boards are two unrelated things sharing a frame. SETTINGS is how a
preset is tuned and played *and then* its vibrato; EFFECTS is what the drive is *and then*
its chorus; TNGR-2's MOTION is an envelope *and then* an LFO; KNDO-5's own card is a
waveform *and then* the amp envelope over it. Run together as one list they read as one
list, and the reader has to find the seam.

So the card is **hung from the top and its second block pinned to the floor**, and the
card's spare height opens up between them as the rule. `splitCard(card, label)` in
`mixer-voice-editor.js` does it in one call: it cuts the rows at a LABEL, puts the tail in
`foot`, and stamps `SEAMED` — `top` (`.sftop`, so the first block sits under the header
instead of bottom-aligning) and `spread` (`.sfspread`, so the slack goes to the block after
the first). The renderer draws `foot` as a grid of its own, `.devgrid.sfenv`.

**The seam has a floor.** `margin-top: auto` gives the pinned block whatever the card had
spare, which on a board whose tallest card is only a little taller than this one is a few
pixels — and a seam you have to look for is not a seam. `.sfenv` carries a 14px minimum, so
a card with slack opens by all of it and a card with none grows by that much instead of
closing up. Cards get a little taller; two concepts read as two.

**By label, and only in the window layout.** It is this board's *arrangement*, not a
property of the rows — the strip shows the same controls as one list and is right to. A
label the card does not carry leaves it whole, so a seam named for a control an engine
lacks costs nothing. `CARD_SEAM` names the two seams every pitched family shares
(`note` → `VIB DEPTH`/`VIBRATO`, `effects` → `CHORUS`) so they cannot drift apart between
boards; per-engine seams are named at their own call site.

**The floor is also a baseline.** A pinned block lands on the card's floor, which is where
every bottom-aligned card beside it puts its last pot row — so seaming a card does not cost
the band its one row of knobs across. TNGR-2's SETTINGS vibrato, its EFFECTS chorus and its
MOTION LFO all sit on the line the filter's CUTOFF and the two envelopes' ATTACK sit on.

Where the seams are, across all eight boards — checked by `tests/synth-full-layout.js`,
which asserts `top`, `spread`, and the control at the head of `foot` for every one:

| Board | Card | Seams at |
| --- | --- | --- |
| MRDR-3 | SETTINGS, Effects | VIB DEPTH, CHORUS |
| TNGR-2 | SETTINGS, Effects, Motion | VIB DEPTH, CHORUS, LFO WAVE |
| KNDO-5 | SETTINGS, Effects, Game Synth | VIB DEPTH, CHORUS, ATTACK |
| WNDR-9 | SETTINGS, Effects, Percussion | VIB DEPTH, CHORUS, ATTACK |
| RMND-2 | SETTINGS | VIB DEPTH |
| KLNG8 | Osc 1, FM 1, Osc 2, FM 2, Noise, Ring, Metal | ATTACK (per-row `foot`, see below) |

One of these is composed by hand rather than through `splitCard`, because the rows to pin
are not in the card's own list to cut. (DuoSynth was the other, pinning its native
VIBRATO/VIB RATE pair out of the Duo group; it is retired into MRDR-3.) **KLNG8's source
cards** were the first to do this, before it was a rule: they mark `foot` per ROW
(`splitFoot`) rather than by label, which is what lands envelopes of different lengths
on one line across the band.

**Choice rows pair up.** Two adjacent word choices in the same grid share one line, half the
card each (`pairChoices`) — TYPE|SLOPE, CURVE|RATE CURVE, COLOUR|SLOPE. Drawn rows (WAVE),
rows that can vanish (COLOUR on an MRDR layer) and rows marked `startRow` never take a
partner from the row above them (`.sfownline`). Whether the two actually FIT is measured once
the window is up: `splitTightPairs` puts back any pair whose options overflow, which is why
`.sfpair .sfopts` may not wrap.

**Noise leads with COLOUR**, directly under LEVEL — where WAVE sits on the Oscillator and on
Metal, and for the same reason: it is the one pick that says what the source *is*, and the
filter under it is what is then done to it. It was last on the card, below the filter, which
read as colouring the noise after shaping it. TYPE carries `startRow` so that COLOUR cannot
take it as a partner and strand SLOPE, TYPE's own other half. The `noise`-kind Burst card
holds the same three keys and now states them in the same order.

## Open, in rough priority order

1. **Resonance range.** It is Q — dimensionless, `0.1 … 120`, cubic taper. Above roughly
   Q 20 a lowpass is a whistle, so most of the dial is unusable. Not changed because
   *lowering* a maximum clamps any preset above it. **Next step: check what the 46 MRDR-3
   presets actually reach for, then propose a ceiling** (a guess: nothing goes near 120 and
   ~24 would give the whole musical range across the full sweep).
2. ~~**"Move the rest of the osc pots up."**~~ Done. They are all in `MIXER_ROWS`; the Osc
   card did not empty out, it changed subject — it is the wave and its modulator now (see
   the layout above), and WAVE/COLOUR came back DOWN to it to make that card whole.
3. **Radio dots.** Present and rendering (21 of them, 7×7). Peter said "still wrong" against
   a pre-rebuild screenshot, so it may be resolved — or it may be the shape rather than the
   absence. Check before changing.
4. **The label fit rule on the strip.** The window drops a unit that will not fit onto the
   tooltip (`fitLabels`). The strip still truncates (`FIXED LENGTH sec`). Applying it there
   too would change labels on a panel Peter has tuned — his call.
5. **A/B, COPY→, INIT.** `replaceVoiceContents` was extracted ready for this.
6. **The other eleven panels.** Peter has a detailed plan coming. Do not start without it.

## Verifying

```
npm test                        # includes pot-coverage, synth-full-layout, mixer-layout
node tests/voices.js            # browser suite; needs chromium
node tools/build-mixer-static.js
```

Peter's desk runs on **8010** — never start or kill a server there; rebuild and he refreshes.
For driving it here, serve `dist/TRK24/` on a scratch port and kill it afterwards.

**Test with real pointer events.** Both of the bugs above survived synthetic `.click()`
testing and died on the first real drag and the first open/close cycle.
