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
| Size | Fluid `min(1600px, 100vw−24px)` × `min(900px, 100vh−24px)`. The spec's fixed 1600×900 does not fit a 1440×900 laptop. |
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
single-column cards** — OSCILLATOR, FM, NOISE, RING, METAL and MASTER (with DRIVE and
HUMANISE as sub-sections, and TAPS behind a door in its header). It was nine cards on three bands, each
two columns wide; at 525px a card seats eight pot columns, so every section drew its source
pots and its envelope on one undifferentiated line. Halved in width and roughly doubled in
height, the same pots are two rows of four with the envelope on its own — see `startRow` on
every drum ATTACK. Its Advanced layout currently contains 60 live controls, including Master
Tune and Ring/Metal Attack.

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
the band. MRDR needs none of this: bottom-aligned already, its ADSR blocks share a baseline
by construction.

**Taps is a door, not a column** (`tapsDoor`), and the count rides on the button — `TAPS` at
one hit, `TAPS 3` at three, so what the door hides is the detail and never the fact. It is
the one section that is not part of the signal path, and the one most presets have nothing
in: fifteen drums in the catalogue use taps and every other one is a single hit. Freeing
that column is what let FM out of the oscillator card and onto its own, next to the wave it
bends. Inside, the taps are a **table — a row per hit, a column per number** (TIME, LEVEL,
DECAY; which columns exist is per path, see `TAP_KEYS`), with FALLOFF/PITCH/TONE under a
rule of their own because they are ratios *between* hits rather than values on one. The
panel **redraws its own body** rather than calling `kit.repaint()`: the stepper inside it
changes how many controls the panel has, and a window repaint would take the popover down
with the card it hangs off, on the first press of a button that lives inside it.

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
For driving it here, serve `dist/SongMixer/` on a scratch port and kill it afterwards.

**Test with real pointer events.** Both of the bugs above survived synthetic `.click()`
testing and died on the first real drag and the first open/close cycle.
