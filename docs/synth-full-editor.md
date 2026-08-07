# The full-window MRDR-3 editor

Handoff note. Written 2026-08-08, at the end of the session that built it.

## What it is

MRDR-3's preset editor has two surfaces now. The **strip panel** (`#voiceedit`) is unchanged
in kind — 366px, three channel strips wide, one long scroll — and an **EDIT** button on its
SYNTH row opens a **full window** (`#synthfull`) holding the same 169 controls in a
six-column grid where nothing scrolls.

It came from a Claude Design handoff (`README.md` plus an interactive prototype, in Peter's
Downloads). The design is followed closely but not slavishly; every departure is noted below.

This is the first of twelve. Peter's plan is that every synth gets a simple face in the
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
`setSolo()`, `onFullClosed()`.

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
for a graph to move a sibling pot's needle live. And the strip's DOM goes stale while the
window is up — the two share the value, not the DOM — so `onFullClosed()` rebuilds it.

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
layer   [Osc][Pitch Env][   Filter (2)  ][Filt Env][Amp]         auto
shared  [Settings][Vib/Hum/Drive/LFO][ Global Filter (2)
                                     ][G.Filt Env][G.Amp]        1fr
```

- **Layer cells** hold live controls, not readings: WAVE (glyphs) + COLOUR (unlabelled,
  hidden unless noise), INTERVAL, DETUNE, GATE, and a full-width level fader.
- **Osc card** is what is left: UNISON, SPREAD, STEREO, DELAY, AMOUNT, plus the PWM
  sub-section (absent unless the wave is a pulse) and FM behind a header button.
- **Graphs**: five draggable ADSR envelopes, two draggable filter responses. Each handle is
  bound to a ROW — reads through its `read`, writes through it, clamps to its range and
  step. A second grip on existing controls, never a new one.
- **Header** on every card: 26px, capsule switch, title left, then solo / panel buttons.
  Solo is on the LAYER only.

Counts today: **169 controls, 93 on screen at once, 38 per hidden layer.**

## Open, in rough priority order

1. **Resonance range.** It is Q — dimensionless, `0.1 … 120`, cubic taper. Above roughly
   Q 20 a lowpass is a whistle, so most of the dial is unusable. Not changed because
   *lowering* a maximum clamps any preset above it. **Next step: check what the 46 MRDR-3
   presets actually reach for, then propose a ceiling** (a guess: nothing goes near 120 and
   ~24 would give the whole musical range across the full sweep).
2. **"Move the rest of the osc pots up."** Peter asked for this and it was not done. It is
   five more entries in `MIXER_ROWS`, but it empties the Osc card down to a header and a
   door — so it is really "delete the oscillator card and reassign its column", which is a
   layout decision. Options were put to him; no answer yet.
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
