# The Native Synths

> How MASHENSTEIN's non-Tone.js, non-engine voice paths work — `_playGame`,
> `_playAdditive`, `_playLayer` and `_playDrum` in `src/engine/voices.js`.

---

## 1. Architecture Overview

The audio engine has **six** voice paths, dispatched in `VoiceRack.play()`:

| Path | Play method | Sounds like | Uses Tone.js? | Pooled? |
|--------|------------|-------------|---------------|---------|
| `kind: 'engine'` | (hand-written in `scheduleStep`) | Bass, lead, organ, chords, engine percussion | No | No |
| `kind: 'tone'` + Tone class | `VoiceRack.play()` → Tone pool | Full Tone.js synths (Synth, MonoSynth, FMSynth, etc.) | **Yes** | Yes |
| `synth: 'KNDO-5'` | `_playGame()` | One oscillator or pitched noise — the chip channel | **No** | No |
| `synth: 'WNDR-9'` | `_playAdditive()` | Stacked sine partials — drawbar organs, bells, glass | **No** | No |
| `synth: 'MRDR-3'` | `_playLayer()` | Up to three complete voices summed — the engine's own layered voices, editable | **No** | No |
| `kind: 'drum'` | `_playDrum()` | Multi-source KLNG8esis (kicks, toms, zaps, cymbals) | **No** | No |

**This document covers the four native paths** — the ones built entirely from Web Audio
nodes that never touch `Tone.Synth` or its relatives. The native synths are dispatched
**by name before** the Tone allowlist is consulted; `SYNTHS[]` knowing nothing about
them would otherwise return `false`, which looks exactly like a preset doing nothing.

Two rules every native pitched path shares, stated once:

- **The `adsr` helper** (`voices.js` ~196) is the one HELD envelope — attack (clamped
  to 45% of the note), decay to sustain, an explicit plateau (a ramp interpolates from
  the event *before* it — without the `setValueAtTime` the release starts falling the
  moment decay ends), release, then a linear ramp to true zero. It returns the absolute
  time the tail ends, which is what callers `stop()` on. Every stage is a plain time in
  seconds — there is no magic zero — and a decay longer than the note is clamped to it,
  so a preset written for a 1.8s note still behaves on a 0.5s one. `sustain` is where
  the fall lands, not something a short decay switches off.
- **`NATIVE_WAVES` only**: an `OscillatorNode` takes `sine | square | sawtooth |
  triangle`. Tone's `pwm`, `pulse` and voicing prefixes (`fatsawtooth`) all THROW on
  assignment — killing that note and every note after it on the lane — so every
  waveform is coerced through `nativeWave()`.

### Pitch curves

The **drum** synth sweeps a pitch — from `osc.from` down to `osc.to` over `osc.sweep` — through `pitchRamp` in `src/engine/voices.js`, and its **shape** is a choice, because where the sweep spends its time is most of what the drop sounds like:

| Curve | What it is | Halfway through 800→100 Hz | Sounds like |
|-------|-----------|---------------------------|-------------|
| `'exp'` *(default)* | `exponentialRampToValueAtTime` — a constant **ratio** per second, so a constant number of semitones per second: a straight line on a piano roll | 283 Hz (the geometric mean) | An even glide. The 808 flavour |
| `'lin'` | `linearRampToValueAtTime` — a constant number of **hertz** per second | 450 Hz (the arithmetic mean) | Hangs up top, then plunges: half the hertz is only a third of the octaves. A whip |
| `'snap'` | `setTargetAtTime` — an RC discharge, hardest at the very start, settling onto the target | 195 Hz | The analogue drum machine's own pitch envelope: the click, then the body. A kick that goes *thud* rather than *boing* |

`setTargetAtTime` never arrives, so `'snap'` runs a **time constant of a quarter of the stated sweep** (98% of the way by the end) and then plants the value there. The `SWEEP` knob goes on meaning "it is over by here" whichever shape is on it.

The **melodic** paths do not take these three. A pitch envelope is written in cents on `.detune`, and linear in cents *is* exponential in hertz — so a bend has exactly one shape, and it is `'exp'`, which is what every preset written before the envelope existed already rendered as. `tests/pitch-curve.js` measures that equivalence directly.

**Default `'exp'` is load-bearing**: it is what every preset written before the curve existed rendered as, so a preset that names no curve is byte-identical to what the null test's baselines hold. `tests/pitch-curve.js` renders all three and counts zero crossings to prove each shape lands where this table says.

---

## 2. KNDO-5 (`_playGame`)

**File:** `src/engine/voices.js` lines ~280–300

### Purpose
A bare single-oscillator replacement for the engine's hand-written square/saw/triangle/sine voices. The simplest voice path in the system — one oscillator, one gain node, an AR envelope, and optionally an echo send.

### Sound Generation

```
  [one LFO per note-on, shared by the chord]
   LFO ──→ vibEnv ──┬──→ ×cents ─────────────→ OscillatorNode.detune   (shared)
   (rate)  (0→1 over │                                                   │
            delay)   └──→ ×hz(note) ─────────→ BiquadFilter.frequency   │ (per note)
                                                                         │
  ── pitched ──────────────────────────────────────────────────────────┤
  OscillatorNode ─────────────────────────────────┐                     │
                                                   ├─→ [tone filter] ──→ GainNode ──→ dry
  ── noise ──────────────────────────────────────┤     (optional, 1–4        │
  seeded buf (looped) ──→ BiquadFilter (bp, Q 2) ─┘      stages)             └──→ wet (echo)

  frequency: note × pitchShift(v) × detune          (set once, and stays there)
  detune:    +semitones×100 cents ──→ 0             (the pitch envelope, A/D/S/R)
  (`.detune` is the oscillator's, or the tracking bandpass's — cents on either)
```

- **One source** per note — from `v.waveform`:
  - `'square'`, `'sawtooth'`, `'triangle'`, `'sine'` → an `OscillatorNode`
  - `'noise'` → the engine's **seeded** buffer, looped, through a **bandpass that tracks the note** (fixed `Q` 2). This is the chip noise channel: the library's 28 noise and drum presets are percussion whose filter ignores the note, and pitched noise is what none of them could say. A rack built without a seeded buffer returns `false` rather than playing silence, so the caller falls back to the engine's own voice
- **One `GainNode`** with an **AR envelope** (Attack → Release, no sustain):
  1. Start at `0.0001`
  2. Attack: `exponentialRampToValueAtTime(gain, peakAt)` where `peakAt = t + min(attack, dur × 0.45)`
  3. Release: `exponentialRampToValueAtTime(0.0001, end)` then `linearRampToValueAtTime(0, end + release)`
- **Pitch envelope** (`pitch.semitones`, default `0` = none): the note starts that many semitones away from its written pitch and the envelope brings it **onto** it. That direction is deliberate — a voice that walks *off* its note can only be a sound effect, and these are lane presets. Written as cents on `.detune`, so the frequency itself is never moved and the decay is clamped to the note: a 40 ms sixteenth still lands on the note it is written as. The **same five rows** a MRDR-3 layer's Pitch Env card has, on the same keys
- **Sustain and release**, which the old single ramp could not say at all: a sustaining pitch envelope holds the note *off* its written pitch for as long as it is held, and lets go on release. An attack — 0 by default — scoops out to the offset first instead of starting there
- **Vibrato** (`vibrato.depth`, default `0` = none): one LFO per note-on. **One LFO for the whole chord** — per-note LFOs drift apart on rate rounding, and a chord whose notes wobble independently is a chorus. Built and stopped with the voices, unlike the Tone path's pool LFO which free-runs. Three stages, because the two waveform families need the same wobble in different units: the LFO stays at unit amplitude, `vibEnv` carries the onset, and the last gain scales it — **cents** into an oscillator's `detune` (shared), or **hertz** into the bandpass for noise, which depends on the note and so needs a gain per note (a semitone is 13 Hz at 220 and 105 Hz at 1760)
- **Delayed vibrato** (`vibrato.delay`, default `0`): the depth grows from nothing to full over this many seconds from note-on — a chip lead holding a note and then leaning into it. A **fade, not a gate**: a wobble switching on at full depth mid-note reads as a fault. This is the one vibrato key the **Tone path cannot honour** — its LFO lives in the pool and free-runs across notes, so there is no note-on to measure an onset from
- **Tone filter** (`filter`, default **absent** = none): an optional filter between the source and the AR gain, switched on as a section in the panel rather than dialled to a no-op. Absent, **not one node is built** and a preset written before it existed sounds identical — "no filter" and "a filter doing nothing" are different sounds. It is the **same `_filterChain`** the noise and drum voices use, so the keys mean the same thing: `type` and `slope` are the filter, `freq` is where it starts, and `to` over `sweep` is where it goes. That last pair is why it earns its place — a cutoff falling into a noise burst is an explosion and one climbing out of a square is a power-up, neither of which the pitch sweep alone can say. Resonance lands on the **first stage only**; the stages behind it carry the slope at `Q` 0.7071 and would multiply the peak if they resonated too. Built **per note**, because its sweep starts at note-on
- **`drive`/`shape`/`tone`/`drivePlace`** — the Effects card MRDR-3, TNGR-2 and the
  drawbar organ carry, on the same voice-level keys: one waveshaper with its tone filter
  hanging off it, built only when `drive > 0`. **PLACE is here**, unlike the organ's,
  because this synth has a stage for the shaper to be pre or post *of* — its own tone
  filter and the AR gain. `post` (the default) puts the shaper after the envelope, so the
  grit falls with the note, and the note's level moves **behind** the shaper, so a preset
  drives the same however loud its lane is. `pre` puts it in front of the filter, hearing
  the raw waveform — a fold there is a different waveform rather than the same one
  dirtied
- **`chorus`** `{mix, rate, depth, width}` — the same lane insert MRDR-3, TNGR-2 and the
  drawbar organ run, off the same `buildChorusLeg` and the same `_ensureMrdrLaneStage`.
  MIX is the switch. A preset with **no `chorus` block at all** never sees a node and
  connects straight to the strip, as this path always has; a preset that has the block
  gets the lane bus whether or not it is turned up, which is what lets a chorus edit
  reach a note already sounding. The echo send is tapped **after** it, as on every other
  synth that runs one — the bus hears the instrument, not its guts
- **Polyphonic**: If `freq` is an array (a chord), one oscillator+gain pair is created per note. `dur` may be an array too, positionally aligned with `freq`, the way the Tone path reads it
- **Never pooled** — native nodes created and torn down per hit
- **Deterministic offline**: No randomness anywhere in the path. The LFO is a scheduled oscillator started at an absolute time, so its phase is a function of the note's position

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `waveform` | `'square'` | `'square'`, `'sawtooth'`, `'triangle'`, `'sine'` — or `'noise'`, which swaps the oscillator for the seeded buffer through a note-tracking bandpass |
| `attack` | `0.01` | Attack time in seconds (min `0.001`) |
| `release` | `0.015` | Release time in seconds |
| `pitch.semitones` | `0` | Semitones the note starts away from its pitch. `+24` falling over 60 ms is a coin, `−36` a laser. Zero schedules nothing |
| `pitch.attack` | `0` | Seconds out to the offset. Zero — the default — means the note is already there when it starts |
| `pitch.decay` | `0` | Seconds to fall onto the written pitch, clamped to the note's own length |
| `pitch.sustain` | `0` | Where the fall lands, as a fraction of AMOUNT. Above zero the note stays off its pitch |
| `pitch.release` | `0.015` | Seconds back to the written pitch after note-off |
| `vibrato.depth` | `0` | Vibrato depth in **semitones**, `1` = ±100 cents. `0` builds no LFO. The panel runs to **12** — a full octave of wobble — and the native paths honour all of it; a **Tone** preset is capped at `1` because `Tone.Vibrato.depth` is a NormalRange and would reject more |
| `vibrato.rate` | `5` | Vibrato rate in Hz. The panel runs to **60**: past about 20 it stops being a wobble and becomes frequency modulation, where the sidebands are the sound |
| `vibrato.delay` | `0` | Seconds for the wobble to fade in from note-on. **KNDO-5-only** — see above |
| `vibrato.type` | `'sine'` | LFO waveform (engine-only; no control on the panel) |
| `filter.type` | `'lowpass'` | Tone-filter shape: `lowpass`, `highpass`, `bandpass`, `notch`. The whole `filter` key is **absent by default** — the panel's Filter section is a switch, and off means no node |
| `filter.slope` | `-12` | dB per octave: `-12` or `-24`, built as 1 or 2 stages. `-48` (4 stages) is still read for stored presets but is no longer offered on the desk |
| `filter.freq` | `4000` | Cutoff in Hz at note-on |
| `filter.to` | — | Cutoff to arrive at. Equal to `freq` (or absent) is no sweep at all |
| `filter.sweep` | `0.12` | Seconds to travel from `freq` to `to`, exponentially |
| `filter.Q` | `0.7` | Resonance, up to 40. First stage only. A high `Q` can raise the peak several times over — measured at `Q` 20 on a square, three times the unfiltered peak — so it is a level change as well as a tone one |
| `drive` / `shape` | `0` / `'soft'` | Waveshaper; `soft`, `fold`, `crush`. Zero builds nothing |
| `drivePlace` | `'post'` | `post` after the filter and the AR gain, `pre` in front of both. Read only when `drive > 0` |
| `tone.{freq,type,Q}` | 8000, lowpass, 0.7 | The drive's own tone filter — absent means no filter |
| `chorus.{mix,rate,depth,width}` | 0, 0.8, 0.5, 1 | The lane chorus insert. MIX at zero is off; no `chorus` key at all is no lane bus |
| `fixedLength` | `0` | An absolute note length in seconds that **overrides `dur` and the tempo both** — `noteSeconds` returns it verbatim and stops. `0` means not set. Not KNDO-5's: it is read before the voice is dispatched, so it works on every path. The panel allows up to **4 s**, which is a sound-effect length rather than a note one — an explosion or a power-down runs past two |

**Declared but not read on this path:** `mono` and `portamento` appear on several KNDO-5 entries in `src/data/voices.js` and are ignored — `play()` dispatches to `_playGame` before the pool that implements them. Glide needs the voice to remember its last pitch, and that state is what a stem render does not carry.

**Not read anywhere:** `minLength` and `maxLength` were listed here as parameters and are read by no code and declared by no preset. There is no such clamp — `fixedLength` is the only absolute length control.

### Presets (6 library + user copies)

| ID | Label | Waveform | Category |
|----|-------|----------|----------|
| `toneSquare` | Square Tone | square | Lead |
| `toneSawtooth` | Sawtooth Tone | sawtooth | Lead |
| `toneTriangle` | Triangle Tone | triangle | Lead |
| `toneSine` | Sine Tone | sine | Keys |
| `squareTone2` | Square Tone | square | Lead |
| `squareOrgan` | Square Organ | square | Organ |

(plus whatever `USER_TONE` holds — user saves land there, not here.)

### Why It Exists

The engine's hand-written square/saw/triangle/sine voices are baked into `scheduleStep` — they can't be selected from the voice picker. KNDO-5 presets expose the same basic waveforms as choosable presets, so a lane can opt into "just a square wave" without writing engine code. They use native Web Audio nodes rather than Tone.js to stay lightweight and avoid the Tone synth pool overhead for the simplest possible sound.

---

## 3. WNDR-9 (`_playAdditive`)

### Purpose

A stack of up to nine sine (or triangle) partials at drawbar ratios, each with its own
level, under one `adsr` envelope. This is the engine's `organChords` voice — which is
five sines and *nothing else* — made editable, then generalised past the organ with two
knobs that are each one control where the honest version is nine.

### Sound Generation

```
  per partial k with bars[k] > 0:
  OscillatorNode ──→ GainNode (adsr, decay·r⁻ᵈᵃᵐᵖ) ──→ [shaper → tone] ──→ out
   freq = note × ratio[k] × √(1 + stretch·r²)                                 │
                                                             [lane chorus] ←──┘
                                                                   └──→ dry (+ wet)

  perc partial ──→ [its own shaper → tone] ──→ ALWAYS-DRY bus ──→ dry
                                               (no echo, and no chorus)

  [one vibrato LFO per note-on, cents into every .detune]
```

- **`bars`** — nine levels in **console order** (16′ 5⅓′ 8′ 4′ 2⅔′ 2′ 1⅗′ 1⅓′ 1′ =
  ratios 0.5, 1.5, 1, 2, 3, 4, 5, 6, 8), so any registration ever written down types
  straight in. A bar at zero builds **no oscillator**. `ratios` may override the set;
  `count` caps how many build; partials at or above Nyquist are culled.
- **`stretch`** — inharmonicity, `r′ = r·√(1 + stretch·r²)`. Zero is a Hammond; wound
  up it is a bell, a gong, a struck bar.
- **`damp`** — partial *n* decays over `decay · r⁻ᵈᵃᵐᵖ`: the top of the stack falls
  first, which is every struck sound there is. A bell needs BOTH — an inharmonic stack
  with no damping is a siren, not a bell.
- **`pitch`** `{from, to, sweep, curve}` — the whole registration bends together, each
  partial keeping its ratio (this is `organSwoop`). Through `pitchRamp`, so the bend
  speaks the same `exp | lin | snap` vocabulary as every other pitch move.
- **`perc`** — the Hammond percussion register: one louder partial, struck and gone,
  **always dry** so repeated off-beat stabs stay crisp. Its decay is in **seconds** —
  a circuit constant, fast or slow whatever the player holds — not steps.
- **`drive`/`shape`/`tone`** — the Effects card MRDR-3 and TNGR-2 carry, on the same
  voice-level keys: one waveshaper with its tone filter hanging off it, **before** the
  note's level (a preset drives the same however loud its lane is). There is **no PLACE
  pill** and no `drivePlace` read: pre or post is only a question where there is a filter
  to be pre or post of, and a drawbar stack has none. The percussion register takes the
  drive on its own bus — an organ through a driven amp drives all of it.
- **`chorus`** `{mix, rate, depth, width}` — the same lane insert MRDR-3 and TNGR-2 run,
  off the same `buildChorusLeg`, so a combo organ is a drawbar stack through a driven amp
  and a chorus rather than the stack alone. MIX is the switch; at zero the lane bus is
  three unity gains, which is what lets a chorus edit reach a note already sounding. The
  percussion pip stays out of it, as it stays out of the echo.
- Honours chords, per-tone `dur` arrays, `taps`/`tapFalloff`/`tapDetune`, `humanize`,
  and `$vibrato` (one LFO per note-on shared by every partial — nine independent LFOs
  would drift, and a stack wobbling out of step with itself is a chorus).

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `additive.type` | `'sine'` | Partial waveform: `sine` or `triangle` (reedier) |
| `additive.bars` | — | Nine levels 0–1 in console order. Zero builds nothing |
| `additive.ratios` | `DRAWBAR_RATIOS` | Optional override — inharmonic clusters live here |
| `additive.count` | 9 | How many partials build |
| `additive.attack/decay/sustain/release/curve` | `adsr` defaults | Plain seconds; a decay longer than the note is clamped to it |
| `additive.stretch` | 0 | Inharmonicity — see above |
| `additive.damp` | 0 | Per-partial decay tilt — see above |
| `additive.echo` | `true` | `false` keeps the stack off the wet send |
| `additive.pitch.{from,to,sweep,curve}` | — | Registration bend, ratios of the note; `sweep` in seconds |
| `additive.perc.{ratio,gain,attack,decay}` | ×3, 0.72 | The key-attack pip, always dry |
| `drive` / `shape` | `0` / `'soft'` | Waveshaper before the note level; `soft`, `fold`, `crush` |
| `tone.{freq,type,Q}` | 8000, lowpass, 0.7 | The drive's own tone filter — absent means no filter |
| `chorus.{mix,rate,depth,width}` | 0, 0.8, 0.5, 1 | The lane chorus insert. MIX at zero is off |

### Presets (8)

`addDrawbar`, `addDrawbarBright`, `addDrawbarPerc` — the engine organ's two
registrations, transcribed. `addShopOrgan` — the shop's own (bright + perc, short,
dry). `addSwoop` — the registration bending up a fourth into the note. `addBell` and
`addGlassPad` — `stretch`/`damp` doing what the organ never could. Plus user saves.

---

## 4. MRDR-3 (`_playLayer`)

### Purpose

Up to three oscillator layers, each a **complete voice** — its own ratio, level, note
length, envelope, filter, pitch envelope, FM operator and unison — summed into the
drum path's drive. This is the shape every hand-written melodic voice in
`scheduleStep` is ("a square, a sine an octave down, a triangle an octave up, each at
its own level and its own length"), which no Tone class can say. Structurally a Roland
partial. The 24 `layer*` presets are the engine voices transcribed from their exact
numbers, shipped alongside the originals for A/B.

### Sound Generation

```
  per layer (osc1|osc2|osc3), per note:
  [unison ×1–4 on .detune] OscillatorNode(s) ──→ [_filterChain] ──→ GainNode (adsr)
        │                        │ pitchRamp        │ + filter env  │ × 1/√count
        │                        │ (pitch env/glide) │  (cents on   ▼
        │  [fm modulator, one per stack] ─→ freq     │   .detune)   │
        │                                                           ▼
  [vibrato LFO → every .detune]                    ┌─── the three layers sum here ───┐
                                                   │  [global filter] → [global VCA] │  per NOTE, both optional
                                                   └─────────────────┬───────────────┘
                                                                     ▼
                                                   shaper → tone → trem → out      per NOTE-ON
  [lfo → EVERY filter's .detune | trem gains]                        │
                                                                dry (+ wet)
```

- **`len`** — this layer's own note length as a multiple of the drawn one. The control
  with no commercial parallel and the reason the engine voices sound like themselves:
  `bass80s`' octave tick dies inside the note its sub is still holding.
- **One output chain per note**, and every layer sums into it — which is much of what
  makes a stack read as one instrument rather than three. `wet` taps after the shaper
  (the echo bus hears the instrument, not its guts); the per-note level sits after it
  too (`voiceGain` linearity). Whether the echo bus hears the voice is the LANE's
  decision alone: a per-layer send/dry flag existed briefly and lost — a routing choice
  no synth offers, hiding on a synth panel.
- **No taps.** A tap is one hit repeated milliseconds later — a clap, a flam — which is
  a percussion idea; on a melodic voice the slapback belongs on the strip's delay
  insert. `taps`/`tapFalloff`/`tapDetune`/`tapTone` are not read here and the panel
  draws no Taps card.
- **`lfo`** `{type, rate, depth, target: 'filter'|'level', delay}` — key-synced per
  note (deterministic, and `delay` means something). One 0–1 depth knob: 2400 cents of
  filter movement or full tremolo. **No `pitch` target** — pitch wobble is `$vibrato`,
  one key with one meaning on every preset.
- **`$vibrato.spread` + `$humanize.entry` — the ensemble.** Spread gives every unison voice
  its own vibrato RATE (±10% at full) and its own starting PHASE, built by rotating the
  waveform's harmonic series by `n·φ` rather than by delaying it — no silence at the start
  and no node in the path. Entry staggers when each voice comes in, up to 80 ms.
  - Seeded on the **unison index alone**, which is the design rather than a detail: voice 2
    is the same singer in osc1, osc2 and osc3, because a person has one larynx feeding all
    of their formants. Seeded per (layer, index) it would pull one voice apart instead of
    adding voices. The note's time is in the seed too, so the second note is a slightly
    different section rather than a copy.
  - At spread 0 the path builds ONE modulator shared by every voice — the graph it always
    built — and renders bit-identical. Verified at 0.00e+0.
- **`mono` + `portamento`** — the first native path to honour them: one glide origin
  per (lane, voice, preview), the previous note choked over 5 ms, and a chord sounds
  its **last** note (the pool path's own semantics). Stem-safe: a stem render deletes
  the *other* lanes, so the kept lane sees the identical note sequence and glides
  identically.
- Reuses the drum voice's `drive`/`shape`/`tone` entry keys — the two panels' DRIVE
  pots are provably one control. Honours chords, per-tone `dur`, `humanize`, `$vibrato`.
- **`global: { filter, vca }`** — one filter and one amp envelope the three layers sum
  into, before the drive. Both sections optional, and **both absent is the default**: a
  preset with no `global` block builds not one extra node and renders the samples it
  always did. Either present and the stack is one instrument rather than three sounds —
  the difference between a layered patch and a synth voice.
  - Built **per NOTE**, not per note-on, which is what makes it polyphonic rather than
    paraphonic: KEY FOLLOW reads *that* note's frequency, each tone of a chord gets its
    own filter and VCA, and a held chord releases note by note.
  - The VCA's length is the **drawn note**, never a layer's `len` — `len` is what makes
    one layer die inside another, and a layer at GATE 62% still ends where it did. Its
    tail extends how long the modulators run; the oscillators still stop at their own
    layer's end, because a VCA can only shape what is playing.
  - The filter is a layer filter in every respect — same keys, same `_filterChain`, the
    same bipolar `filterEnv` helper — so the two cannot drift apart. `lfo.target:
    'filter'` breathes **every** filter in the patch, layer and global alike.

### SOLO is not a preset key

The panel's S buttons play one layer on its own. They are **monitoring**: the set lives on
`AudioSys` (`soloLayers`, `voiceId → Set<'osc1'…>`), never on the voice, so a solo is never
saved, never reaches a song, and is invisible to `tools/measure-voices.js` — which builds
its own rack. `_playLayer` applies it at the same filter that drops a layer at gain 0, so a
soloed audition builds exactly the nodes that layer builds alone rather than attenuating
the others into the shared drive. It is MRDR-3's alone: no other panel has one.

### Parameters (per layer)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `type` | osc1 `'square'`, others `'sine'` | `NATIVE_WAVES` **plus `pulse` and `noise`** — two waveforms an `OscillatorNode` does not have. `noise` is a band that follows the note; `pulse` is a `PeriodicWave` at any duty |
| `width` | `0.5` | The pulse's duty, `0.05`–`0.95`. 50% **is** a square (its even harmonics null out exactly); narrower brings them back — 20% reedy, 10% nasal |
| `pwm.{type,rate,depth,delay}` | — | Moves `width`. Absent, the layer is one oscillator reading a table; present, it is **two sawtooths differenced through a delay line** — `pulse(t) = saw(t) − saw(t − duty/f)` — because a table cannot be swept. Zero DC by construction (both saws share a mean) and still band-limited. Depth is clamped to what the centre width leaves room for |
| | | **Each layer has its own rate**, deliberately. One LFO driving three widths in lockstep is one oscillator getting fatter; three rates that never line up is a section. The panel seeds 0.4 / 0.53 / 0.31 Hz for exactly this reason |
| `ratio` | 1 | × the note — 0.5 is the sub, 2 the octave. Drawn as INTERVAL, in semitones |
| `detune` | 0 | Cents, static |
| `gain` | 1 | Layer level. **Zero skips the layer entirely** |
| `len` | 1 | × the drawn note length. Drawn as GATE, in per cent |
| `vca` | `'env'` | Which envelope shapes this layer. `'env'` is its own, as it always was; **`'through'` takes it out** and hands the shaping to the global VCA — three oscillators into a mixer, one filter, one envelope, which is the classic mono-synth architecture. Through, the layer contributes a flat gate at its LEVEL, closed over 4 ms when the global VCA has finished, and `len`/GATE stops meaning anything |
| `attack/decay/sustain/release` | `adsr` defaults | Plain seconds, clamped to the note; `sustain` is where the fall lands |
| `attackCurve` / `curve` / `releaseCurve` | `'exp'` | Per stage, `'exp'` or `'lin'`. `curve` is the decay's, and keeps its historical name |
| `unison` / `spread` | 1 / 20 | 1–4 voices across `spread` cents, 1/√count normalised (MAX_UNISON) |
| `stereo` | `0` | Where those voices STAND. Zero builds no panner and is mono, exactly as this path always was; 1 puts the outer voices hard left and right. One `StereoPannerNode` per voice, placed BEFORE the layer's filter so the filter stays one node handling two channels rather than becoming a filter per voice. Costs ~29% CPU on a three-layer unison-5 patch and nothing at all at zero. Folding to mono loses ~2.9 dB — the equal-power pan law, not cancellation — which the measured level absorbs |
| `pitch.{semitones,attack,decay,sustain,release}` | — | The bend, in semitones on `.detune` — so it COMPOSES with a glide instead of fighting it for `.frequency`. Attack defaults to 0: the note is already away when it starts |
| `filter.{type,slope,freq,Q,track}` | — | `_filterChain`; `track` = key follow, referenced to A2 = 110 Hz. **No sweep pair** — the cutoff sits still and the envelope moves it |
| `filter.env.{octaves,attack,decay,sustain,release}` | — | ENV AMOUNT ±10 octaves, **bipolar** — negative closes from above. Written in cents on the cascade's `.detune`, where it sums with the LFO. Zero schedules nothing |
| `fm.{type,ratio,index,attack,decay}` | — | One operator per unison stack, index in Hz as a multiple of the carrier's start |

### Parameters (the global stage, once per preset)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `global.filter.{type,slope,freq,Q,track}` | — | A layer filter in every respect, through the same `_filterChain`. `track` = key follow, A2 = 110 Hz. Absent builds nothing |
| `global.filter.env.{octaves,attack,decay,sustain,release}` | — | The same bipolar ±10 octaves as a layer's, through the same `filterEnv` helper |
| `global.vca.{attack,decay,sustain,release}` | — | The NOTE's own envelope, over all three layers. Peak is 1 — the level lives on the layers and the strip |
| `global.vca.{attackCurve,curve,releaseCurve}` | `'exp'` | Per stage, as on a layer's amp envelope |


### Presets (24)

The four core constructions — `layerBass80s`, `layerFilteredSaw`, `layerLeadBright`,
`layerTwinkle` — then the songs' own voicings (`layerTitleBass`, `layerShopLead`,
`layerFinaleStab`, …) minus the organs, which live on WNDR-9. The two that
carried a written-in slapback are their base timbre; the strip's delay says it now.
`layerDreamPad` demonstrates the two controls no engine recreation exercises: unison
and the filter LFO.

---

## 5. Noise Presets — retired into KLNG8

There was a seventh path, `_playNoise`, and a `kind: 'noise'` preset kind: filtered
bursts of the seeded buffer with an optional pitched thump under them — snares, claps,
hats, shakers. It is gone, and nothing was lost with it.

It was the drum path twice. The burst was the same `_bufFor` buffer through the same
`_filterChain`; the thump was one oscillator with a pitch envelope, which is what `osc`
already is. The only real difference was vocabulary: the noise path called that section
`body` and swept its pitch over the amp decay, where `osc` states `sweep` separately.

So every preset moved into the DRUM tables with `body` rewritten as `osc` (the sweep
takes the decay's number, so the sound is unchanged), and one-shots have one kind, one
play path, one panel and one pair of source tables.

**Songs are the exception, and they are handled at the door.** A song carries a complete
copy of its presets rather than a reference (see `registerSongVoice`), so every mix saved
before the merge still says `kind: 'noise'` and still has a `body` in it, for good.
`noiseCopyAsDrum` in `src/data/voices.js` translates those copies as they enter the
catalogue — a shim for data nobody can rewrite, rather than a branch left in the engine.

What the merge added, going the other way: a burst preset can now have a resonator, a
metal cluster, a drive shaper, a two-stage `sag` and a `pitchCurve`, none of which the
noise path could express.

---

## 6. KLNG8 Presets (`_playDrum`)

**File:** `src/engine/voices.js` lines ~444–550

### Purpose
Full KLNG8esis in the "Microtonic" style — **five** independent sources (two oscillators, noise, resonator, metal cluster), each with its own envelope, summed and optionally driven into a waveshaper. This is a drum designed from first principles rather than a filtered noise burst with a thump under it.

The osc and noise sections are the original pair. The resonator and the cluster were added because filtered noise cannot make two sounds the kit needs: something **struck that then rings** (a rim, a clave, the shell of a snare) and something genuinely **metallic** (a hat, a cowbell, a cymbal). Every addition is default-off, and a preset that names none of the new keys renders sample-identically to how it did before they existed — verified by re-measuring the whole library.

### Sound Generation

```
  ┌─ Osc sections ×2 (both optional) ──────────────────────┐
  │  OscillatorNode ──→ GainNode ──┐                       │
  │  (type, from→to Hz)   (AHD env)│                       │
  │      ↑ [FM: modulator osc → gain(env) → .frequency]    │
  ├─ Noise section (optional) ─────┤                       │
  │  seeded buf ──→ Biquad×N ──→ GainNode                  │
  │  (colour, looped) (type, freq→to, Q, slope)            │
  ├─ Ring section (optional) ──────┤                       │
  │  seeded buf ──→ hit gain ──→ Biquad ──→ GainNode       │
  │  (2ms strike)   (bandpass, Q 40–120: rings)            │
  ├─ Metal section (optional) ─────┤                       │
  │  6 × square @ inharmonic ratios ──→ Biquad×N ──→ Gain  │
  └────────────────────────────────┤                       │
                                   ↓                       │
                        [Drive: soft | fold | crush]       │
                                   ↓                       │
                        [Tone: lowpass after the shaper]   │
                                   ↓                       │
                            GainNode (note level) ──→ dry / wet

  ┌─ Taps (optional) ─┐
  Each tap at time + taps[i]: gain × tapFalloff^i,
  pitch × tapDetune^i, filter × tapTone^i
  ┌─ Humanise (optional) ─┐
  Per-hit gain/pitch/filter jitter, seeded from the SCHEDULED TIME
```

### The Five Sources

#### Osc Sections (`v.osc`, `v.osc2`)

**Two of them, and they are the same section twice.** `_playDrum` builds both from one
`buildOsc` closure, so every key below reads identically on either — the panel draws the
two cards from one `oscRows` builder for the same reason, and `tests/synth-full-layout.js`
compares the two card shapes so a control cannot grow on one alone.

Why a second one at all: three classic drums are a *pair* of tuned bodies and cannot be
stated as one. The 808 snare is two bridged-T oscillators around 185 and 330 Hz under its
noise; a Simmons tom is two detuned sines falling at *different rates*, and the drifting
beat between them is the sound; a 909 kick is a body with a separately tuned click on
top, not one oscillator with a fast front on it. `knock` covered exactly one of those
cases with its shape welded shut — see below, where it stays.

`osc2` is absent from every preset written before it, so the whole library renders
sample-identically without it.
- **Waveform**: `'sine'`, `'triangle'`, `'square'`, `'sawtooth'`
- **Pitch envelope**: `from` Hz → `to` Hz over `sweep` seconds (e.g., a kick drops from 165→48 Hz), shaped by `pitchCurve` — see [Pitch curves](#pitch-curves)
- **Amp envelope**: Attack (default instant) → optional Hold → Decay, with curve `'exp'` (struck) or `'lin'` (gated). `curve` is the **level**; `pitchCurve` is the **pitch**, and a kick usually wants a different shape for each
- **FM** (`osc.fm`): a second oscillator at `ratio` × the carrier's *starting* frequency, its gain enveloped, wired into `osc.frequency`. Depth is `index` × that frequency, in Hz — the same reading Tone's `modulationIndex` gives. The modulator does **not** track the carrier's sweep: a fixed ratio through a kick's octave-and-a-half drop is a siren, and a drum wants a clang.
- **Gain**: Per-section level

#### Noise Section (`v.noise`)
- **Source**: The engine's seeded noise buffer, **looped**, optionally re-**coloured** (see §Noise Buffers)
- **Filter**: 1, 2 or 4 cascaded `BiquadFilterNode`s — `slope: -12 | -24`, with `-48` still read for stored presets. Resonance is applied to the **first stage only**; Q on every stage of a cascade multiplies into a howl (which is exactly what Tone's own `Filter` does, and why `-48` came off the desk)
- **Filter sweep**: The cutoff can itself sweep — `freq` → `to` over `sweep` seconds
- **Amp envelope**: Same AHD + curve as the osc section

#### Ring Section (`v.ring`) — the resonator
- A **click** (`hit`, default 2ms of noise) into a **narrow bandpass** (`Q`, default 40). The pitch is the filter's resonance, not an oscillator, so it arrives already decaying and is inharmonic at the edges
- Ring time ≈ `Q / (π × freq)`, so the amp envelope can only ever cut it **shorter**. A rim wants Q 40+; below ~10 a bandpass colours rather than rings
- `hit` is the character control: 2ms is a stick, 20ms a mallet, past 50ms it stops being a strike

#### Knock (`v.knock`) — a level, not a section
The engine's kick is *three* layers: a sine body, a noise click, and between them a short triangle punch around 300 Hz — the band the bass mostly leaves open, which is what lets a kick read on a phone speaker where the sub is felt rather than heard. `scheduleStep` has always had it as `kickKnock`.

It takes a level and nothing else. Its shape is the engine's — 300 → 180 Hz over 40 ms, up in 4 ms, gone in 50 — because it is the punch a *kick* wants, already voiced, and every parameter it could expose is one more control on a panel pinned to a strip's width. `0` builds nothing.

`osc2` did not retire it and could not: 179 presets and every song's frozen copy of them carry `knock`, so it stays exactly what it was. What changed is the claim around it — it is no longer *the* second oscillator, it is a preset shortcut for one particular one. It is gated on `v.osc`, not on either oscillator: a preset with only an `osc2` has already reached for the general tool.

#### Metal Section (`v.metal`) — the cluster
- `count` (≤6) square oscillators at inharmonic `ratios` (default `[1, 1.342, 1.2312, 1.6532, 1.9523, 2.1523]` — the 808's) through a highpass. `spread` stretches the ratios around the fundamental: 0 collapses them onto one note, 2 is twice the 808's spacing
- The whole cluster can **sag**: `to`/`sweep` slide every partial together, each keeping its ratio. The engine's rimshot does exactly this (three squares falling 6% as they ring), and it is what stops struck metal sounding like a held chord
- The same circuit Tone's `MetalSynth` implements with the ratios welded shut, at roughly half the nodes per hit (no FM operator per oscillator)
- Its filter is stated in its own keys (`hp`, `hpTo`, `hpSweep`, `filter`, `Q`, `slope`) — `metal.freq` already means the pitch

### Drive Shaper

A `WaveShaperNode` applied to the summed sections, in one of three shapes (`v.shape`):

- `'soft'` (default) — a desk being pushed. **Square-law scaling**: `k = 1 + amount² × 24`, so the bottom half of the travel is warmth and near-square crunch lives in the top quarter
- `'fold'` — a sine folder: past full scale the transfer turns over rather than clipping, so more level makes a *different* sound instead of a louder one. Ring-modulator territory
- `'crush'` — quantisation, 12 bits down to ~1.5 across the dial. Rounded rather than truncated so the curve stays odd-symmetric

All three: **inside the voice**, before the per-note level (a preset drives the same however loud its lane is), **normalized**, and **cached** per `shape:amount` key — formulas, not noise, so they render deterministically offline.

### Tone Filter (`v.tone`)

A lowpass (or any `BiquadFilterNode` type) **after** the shaper and before the note level. What it is for is the fizz the drive just added, and it would have nothing to do in front of it.

### Humanise (`v.humanize`)

`gain`, `pitch` and `filter`, each a ± fraction applied per hit. The random number comes from `hitRandom(time, salt)` — an integer xorshift over the **scheduled time**, not a counter and not `Math.random`. That matters: a counter is state, and state does not survive a lane being rendered on its own, so a stem would stop containing the same noise as the full mix. Integer ops only, so it is bit-exact between a browser and a headless render.

### The Envelope Helper

```js
env(param, t, level, section, defaultDecay)
```

Reads `attack`, `hold`, `decay`, `curve`, `sag` and `sagAt` off the section itself, so every section takes the same five controls without six call sites repeating the list. `defaultDecay` is the one number the sections genuinely disagree about.

- Sets `1e-4` at `t`
- Linear ramp to `level` at `t + attack`
- If `hold > 0`: holds `level` until `t + attack + hold`
- If `sag`: falls to `level × sag` at `+ sagAt` (default 20 ms), then carries on
- `'lin'`: linear ramp to `0` at the end; otherwise exponential to `0.0001`

**`sag` is the two-stage decay**, and it is the one the engine's own kit needed. Its rimshot drops to 16% in twenty milliseconds and then rings out over the next fifty-five. One exponential cannot be both a transient and a tail — set to the fast one it has no ring, set to the slow one it has no crack — and the ear reads the join as the thing being *struck*.

### Key Design Decisions

1. **Any section can be omitted** — a tom is all osc, a clap (like `dsClap`) is all noise
2. **Level applied AFTER the shaper** — the shaper sees the preset's own levels and nothing else. If the shaper were after the lane's gain, the sound would change depending on how loud the lane happens to be
3. **Taps work here too** — `dsClap` has 4 taps 10–33ms apart
4. **Never pooled** — one-shot native nodes per hit, same as noise presets
5. **Deterministic offline** — the only noise source is the seeded buffer, so stems still sum to the mix

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `osc.type` | `'sine'` | Oscillator waveform |
| `osc.from` | `190` | Starting frequency in Hz — the desk's `FREQUENCY` |
| `osc.to` | `52` | Ending frequency in Hz. The desk does not show this number: its `AMOUNT` pot is the interval between the two, signed, in semitones (`12·log2(to/from)`), so tuning a drum leaves the size of its drop alone. Presets still store hertz |
| `osc.sweep` | `0.07` | Pitch sweep duration in seconds — the desk's `RATE`, up to 10 s |
| `osc.pitchCurve` | `'exp'` | The pitch sweep's shape: `'exp'`, `'lin'` or `'snap'` — see [Pitch curves](#pitch-curves) |
| `osc.attack` | `0.001` | Osc amp attack time |
| `osc.decay` | `0.35` | Osc amp decay time |
| `osc.curve` | `'exp'` | **Amp** envelope curve: `'exp'` or `'lin'` |
| `osc.gain` | `1` | Osc section level |
| `osc2.*` | (osc's) | **The second oscillator — every key above, read identically.** Both are built by one `buildOsc`, so `osc2.from` falls back to the same 190 Hz `osc.from` does. Absent by default |
| `noise.type` | `'bandpass'` | Noise filter type |
| `noise.freq` | `2600` | Filter cutoff in Hz |
| `noise.to` | (none) | Filter cutoff sweep target |
| `noise.sweep` | (auto) | Filter sweep duration |
| `noise.Q` | `0.7` | Filter resonance |
| `noise.attack` | `0.001` | Noise amp attack time |
| `noise.decay` | `0.12` | Noise amp decay time |
| `noise.curve` | `'exp'` | Envelope curve |
| `noise.gain` | `1` | Noise section level |
| `osc.hold` / `noise.hold` | `0` | Seconds held at full level before the decay |
| `osc.fm.type` | `'sine'` | Modulator waveform |
| `osc.fm.ratio` | `1.4` | Modulator pitch, × the carrier's starting frequency |
| `osc.fm.index` | `1` | Modulation depth, × the carrier's starting frequency (Hz) |
| `osc.fm.attack` / `.decay` / `.curve` / `.hold` | (osc's) | The modulator's own envelope |
| `knock` | `0` | Level of the engine kick's 300→180 Hz mid punch |
| `<section>.sag` | (none) | Two-stage decay: the fraction it falls to first |
| `<section>.sagAt` | `0.02` | When that first fall lands, in seconds |
| `noise.color` | `'white'` | `white` \| `pink` \| `brown` \| `blue` \| `violet` |
| `noise.long` / `ring.long` | (auto) | Force the 2.5s buffer; picked automatically past 0.5s |
| `metal.to` / `metal.sweep` | (none) | The whole cluster sagging, each partial keeping its ratio |
| `noise.slope` | `-12` | Filter slope: `-12` (1 biquad) or `-24` (2). `-48` (4) is read but not offered |
| `ring.freq` | `400` | Resonance pitch in Hz |
| `ring.to` / `ring.sweep` | (none) | Resonance sweep target and duration |
| `ring.Q` | `40` | Narrowness — and so the ring time, `Q / (π·freq)` |
| `ring.hit` | `0.002` | Length of the excitation: stick (2ms) → mallet (20ms) |
| `ring.type` | `'bandpass'` | Resonator filter type |
| `ring.attack` / `.hold` / `.decay` / `.curve` / `.gain` | AHD | The ring's own amp envelope |
| `metal.freq` | `800` | The pitch the partials are built from |
| `metal.ratios[]` | 808's six | Inharmonic ratios |
| `metal.count` | `6` | How many of them to build |
| `metal.spread` | `1` | Stretch around the fundamental: 0 = one note, 2 = double |
| `metal.wave` | `'square'` | Cluster waveform |
| `metal.hp` / `.hpTo` / `.hpSweep` | `3000` | The cluster's filter cutoff and sweep |
| `metal.filter` / `.Q` / `.slope` | `'highpass'` | Its shape, resonance and slope |
| `metal.attack` / `.hold` / `.decay` / `.curve` / `.gain` | AHD | The cluster's own amp envelope |
| `drive` | `0` | Drive amount, 0–1 |
| `shape` | `'soft'` | Shaper: `soft` \| `fold` \| `crush` |
| `tone.freq` / `.type` / `.Q` | (none) | Filter after the shaper |
| `humanize.gain` / `.pitch` / `.filter` | `0` | Per-hit variation, ± this fraction |
| `taps[]` | `[0]` | Tap offsets in seconds |
| `tapFalloff` | `1` | Per-tap gain multiplier |
| `tapDetune` | `1` | Per-tap pitch multiplier (osc, ring, metal) |
| `tapTone` | `1` | Per-tap filter-cutoff multiplier |

### Presets (13 total)

| ID | Label | Category | Osc | Noise | Drive | Key Feature |
|----|-------|----------|-----|-------|-------|-------------|
| `dsKick` | DS Kick | Kick | sine 165→48, 0.45s decay | lowpass click, 15ms | 0.20 | 808-style sub kick |
| `dsKickHard` | DS Hard Kick | Kick | sine 230→55, 0.22s decay | bandpass click, 18ms | 0.55 | Faster, harder, pushed into shaper |
| `dsSnare` | DS Snare | Snare | triangle 210→165, 0.11s | bandpass 2100Hz, 0.17s | 0.18 | Two-source snare, noise outlasts body |
| `dsSnareCrack` | DS Crack Snare | Snare | square 255→200, 50ms | highpass 2900Hz, 85ms | 0.35 | Tight, driven — backbeat for fast songs |
| `dsClap` | DS Clap | Clap | (none) | bandpass 1550→1050 sweep, 4 taps | — | Filter sweeps down as clap decays |
| `dsHatClosed` | DS Closed Hat | Hats | (none) | highpass 7800Hz, 32ms | — | Resonant highpassed tick |
| `dsHatOpen` | DS Open Hat | Hats | (none) | highpass 6800Hz, 420ms | — | Same band left ringing |
| `dsShaker` | DS Shaker | Perc | (none) | bandpass 6300Hz, 18ms attack | — | Only drum with an attack ramp |
| `dsTom` | DS Tom | Tom | sine 220→105, 0.32s | lowpass skin, 30ms | 0.12 | Pitched tom, tune via lane note |
| `dsRim` | DS Rim | Perc | square 460→635, 0.12s | bandpass 4300Hz, 0.23s | 0.24 | Stick sound, both sections gone in 30ms |
| `dsZap` | DS Zap | FX | sawtooth 1900→50, 85ms | (none) | 0.50 | Laser tom — saw falls 5 octaves |
| `dsCrackSnare2` | DS Crack Snare 2 | Snare | square 255→440, 50ms | highpass 2900Hz, 0.3s | 0.35 | Variant with rising pitch |
| `dsClosedHat2` | DS Closed Hat 3 | Hats | (none) | highpass 6275→2800 sweep, Q=5.1 | — | Sweeping resonant closed hat |
| `hatSnap` | = Snap Hat | Hats | (none) | highpass 6200→11000, Q=1.6, 30ms | 0.30 | Cutoff climbs as it decays |
| `hatSnapOpen` | = Snap Open Hat | Hats | (none) | highpass 8000→5200, 0.42s | 0.25 | The sweep the other way — a cymbal darkening |
| `hatGrit` | = Grit Hat | Hats | square 3900→1950, 28ms | bandpass 5600→3600, Q=4.5 | 0.50 | Resonant and mid-forward |
| `hatGritOpen` | = Grit Open Hat | Hats | square 3900→1950, 55ms | bandpass 5600→2600, 0.5s | 0.50 | The open half of the pair |

**Using the sections added since:**

| ID | Label | Category | What it demonstrates |
|----|-------|----------|----------------------|
| `rimRing` | = Ring Rim | Perc | **Resonator**: a violet-noise crack over a Q=90 ring at 1720 Hz |
| `rimWood` | = Wood Rim | Perc | **Resonator + tone**: square knock, Q=60 shell at 780 Hz, lowpassed at 7k |
| `rimClang` | = Clang Rim | Perc | **FM + fold**: ratio 3.7, index 2.2, folded rather than clipped |
| `hatCluster` | = Cluster Hat | Hats | **Metal cluster**: the 808's six partials, −24 dB/oct highpass, humanised |
| `hatClusterOpen` | = Cluster Open Hat | Hats | The same cluster held for 460ms |
| `snarePink` | = Pink Snare | Snare | **Coloured noise + slope + humanise**: pink at −24 dB/oct |
| `clapHands` | = Hands Clap | Clap | **tapTone + humanise**: four hands, none of them identical |
| `kickCrush` | = Crushed Kick | Kick | **crush + tone**: bit-crushed 808 with the top pulled off |

**Using the second oscillator:**

| ID | Label | Category | What it demonstrates |
|----|-------|----------|----------------------|
| `snareTwoBody` | = Two-Body Snare | Snare | The 808's construction: two tuned bodies at 185 and 330 Hz, each barely falling, with the noise outlasting both |
| `tomSimmons` | = Simmons Tom | Tom | **Two pitch envelopes.** Two sines starting 6 Hz apart and falling at different *rates*, so the beat between them slows as the drum drops |
| `kickClickTop` | = Click-Top Kick | Kick | **A separately tuned click.** 1.6 kHz → 320 Hz in four milliseconds over a body that has barely started to move — the 909's two circuits, not one oscillator with a fast front |

**The engine's own kit, transcribed.** All eight hand-written drums in `scheduleStep`, stated as data. Not new sounds — the point is the claim: everything the engine's kit does, this construction can now say. Verified by rendering each lane twice, the engine's own voice and then the preset, and comparing band by band:

| ID | Label | overall | low | mid | high |
|----|-------|---------|-----|-----|------|
| `kickEngine` | = Engine Kick | −0.0 dB | −0.0 | −0.2 | +0.3 |
| `snareEngine` | = Engine Snare | +0.1 dB | +0.2 | +0.1 | −0.1 |
| `clapEngine` | = Engine Clap | +0.0 dB | +0.1 | +0.0 | +0.0 |
| `hatEngine` | = Engine Hat | −0.0 dB | −0.2 | −0.1 | +0.0 |
| `ohatEngine` | = Engine Open Hat | −0.0 dB | −0.0 | −0.0 | +0.0 |
| `tomEngine` | = Engine Tom | −0.0 dB | −0.0 | +0.0 | +0.0 |
| `rimEngine` | = Engine Rim | −0.0 dB | −0.8 | −0.0 | +0.0 |
| `crashEngine` | = Engine Crash | −0.0 dB | −0.2 | −0.1 | +0.0 |

Each needed something the construction did not have until it grew it: the kick a **knock**, the rim a **two-stage decay** and a **sagging cluster**, the clap **per-tap gains and decays** (its three bursts are 0.16, 0.16 and 0.26 — the last both loudest and longest, which no falloff curve passes through), the crash the **long buffer**.

**Deriving the decays.** The engine's blocks ramp to an absolute `0.001`; `env` ramps to `0.0001` from whatever level the section asks for. Same curve, different floor — so a decay cannot be copied across, it has to be re-derived to give the same time constant:

```
τ      = decay_engine / ln(level_engine / 0.001)
decay  = τ × ln(gain_section / 0.0001)
```

That is why `= Engine Hat` says 93 ms where the engine block says 50, and why they measure the same.

---

## 7. How They're Dispatched

The dispatch chain, from sequencer to speaker:

```
scheduleStep()                       audio.js ~line 1997
  │
  ├─ voiced(key, value, opts)        calls playVoice()
  │     │
  │     ├─ voiceOf(b, key) → VOICES[voiceId]
  │     │
  │     ├─ kind === 'engine' → return false → hand-written code runs
  │     │
  │     └─ else → this.voices.play(key, v.id, freq, {...})
  │                │
  │                ├─ kind === 'drum'   → _playDrum(v, {...})
  │                ├─ synth === 'KNDO-5'     → _playGame(v, {...})
  │                ├─ synth === 'WNDR-9' → _playAdditive(v, {...})
  │                ├─ synth === 'MRDR-3'    → _playLayer(v, {...})
  │                └─ else → Tone pool (_pool() → triggerAttackRelease())
  │
  └─ If voiced() returned false → run the engine's hand-written
     oscillator code (bassFilteredSaw, drawbar organ, etc.)
```

All **22 lanes** carry a voice seam — including `organSwoop`, `electroFx`, `vox`,
`shout`, `gliss`, `sweeps`, and the two runs (`organGliss`, `keyGliss`), whose
branches play a preset **eight times** at rising scale offsets, on the same per-call
`delay` that `bassRepeat` has always used for its ghost note. A lane holding a marker
rather than a pitch (`sweeps`, the kit) carries the note its voice is struck at.

### Gain Calculation

Before the voice is played, its gain is computed:

```
voiceGain(v, key) = LANE_TARGETS[lane].level / v.level
```

- `LANE_TARGETS[lane].level` — the measured ENERGY of one note of that lane's hand-written voice through the full render pipeline (K-weighted RMS, `noteLevel` in `tools/lib/loudness.js`)
- `v.level` — the same measurement of the preset at unity, on the lane its category is for (from `tools/measure-voices.js`)
- This normalizes every preset to the same perceived level as the engine voice it replaces. It divides energy rather than peak because the engine's hand-written voices decay across a note while Tone's synths sustain: matched at the peak, a sustained lead lands ~5 LU hot and a MetalSynth hat ~5 LU quiet
- `v.peak` is still measured, for headroom, and is the fallback for a song copy saved before levels existed
- For drum lanes, `laneTrim()` additionally applies the bank's kit trim product (`drumGain × kickGain` etc.)

### The Noise Buffer

Critical for deterministic offline rendering:

- **Created in `AudioSys.ensure()`**: A 0.5s buffer filled with seeded `mulberry32` PRNG (offline) or `Math.random()` (live)
- **Separate 2.5s `crashBuf`** for crash cymbals that outlast the main buffer
- **Every drum preset** (`_playDrum`) and all engine percussion use these buffers — never `Tone.Noise`
- **This is what makes stems sum back to the mix** in offline renders — two renders of the same song produce identical PCM

In `_playDrum`, the noise buffer is **looped** (`src.loop = true`) because a 0.5s buffer may be shorter than an open hat's envelope. The filter takes the edge off the loop seam.

### Colours (`_noise(color)`)

White noise is flat per hertz, and hearing is not — half of a white buffer's energy sits in its top octave, which is why every hat in the library is a highpass and every snare is a fight to keep fizz off it. A colour moves that energy *before* the filter sees it:

| Colour | Slope | Built by | Good for |
|--------|-------|----------|----------|
| `white` | flat | the buffer itself | everything it always did |
| `pink` | −3 dB/oct | Paul Kellet's three one-poles | snares, toms — body the highpass cannot invent |
| `brown` | −6 dB/oct | leaky integrator | thunder, floor toms, room noise |
| `blue` | +3 dB/oct | pink, differentiated | shakers, brushes |
| `violet` | +6 dB/oct | white, differentiated | hats and stick cracks with no rumble to remove |

Each is **derived from the seeded buffer** rather than generated, so a colour is a pure function of it and two renders of a song still match sample for sample. Each is normalised back to the white buffer's RMS, so choosing one is a timbre change and not a level change. Built lazily, once per colour per rack.

---

## 8. The Mixer Pipeline They Flow Through

All five native paths connect to the same channel strip nodes (`dry` and `wet`):

```
native synth output ──→ dry (GainNode, stereo) ──→
                                  vol (fader) →
                                  panner (StereoPanner) →
                                  EQ (3-band Biquad: lowshelf@250, peaking@1200, highshelf@4000) →
                                  [effect chain slot: up to 6 inserts] →
                                  stereo width (M/S matrix) →
                                  monitor → musicBus → songTrim → analyser → musicGain → master

native synth output ──→ wet (GainNode) → delay send → echoBus → ... → songTrim
```

---

## 9. Comparison: KNDO-5 vs KLNG8

| Aspect | KNDO-5 | KLNG8 |
|--------|-----------|------------|
| **Purpose** | Simple pitched tones | Every one-shot in the catalogue |
| **Sound sources** | 1 oscillator, **or** noise through a note-tracking bandpass | 4 independent sources (osc, noise, ring, metal), each optional, plus the knock |
| **Pitch envelope** | `pitch.semitones` → the note, over its own A/D/S/R, in cents | Osc: `from`→`to` over `sweep`, shaped by `pitchCurve` (+ optional FM); noise/ring/metal: filter sweeps |
| **Filter** | One bandpass, on the `noise` waveform only, centred on the note | Biquad cascade per section, plus a tone filter after the shaper |
| **Drive** | None | WaveShaper: `soft`, `fold` or `crush`, square-law scaled |
| **Envelope** | AR only (attack, release) | Full AHD per section, `'exp'` or `'lin'` curve, two-stage `sag` |
| **Modulation** | Vibrato LFO shared by the chord, with an onset delay | None |
| **Per-hit variation** | None | `humanize` + tap walks |
| **Taps** | No | Yes |
| **Choke** | No | `monoGroup` — a hit releases whatever else in its group is ringing, across this path and the pooled one |
| **Polyphony** | Yes (chord = multiple nodes) | No (one-shot) |
| **Pooling** | Never | Never |
| **Preset count** | 4 | 105 |
| **Location in `voices.js`** | `_playGame()` | `_playDrum()` |

### The pitched natives, side by side

| Aspect | KNDO-5 | WNDR-9 | MRDR-3 |
|--------|-----------|---------------|------------|
| **Model** | one source | one stack of partials | up to three complete voices |
| **The one thing it owns** | pitched noise + the arcade `sweep` | `stretch`/`damp` — organ to bell on two knobs | per-layer `len` — layers that outlive each other |
| **Filter** | optional, one section | none (a partial IS a band) | optional per layer, with key follow |
| **Pitch envelope** | `sweep` onto the note | whole registration bends together | per layer, plus glide |
| **FM** | no | no | per layer |
| **Unison** | no | no | 1–5 per layer |
| **LFO** | vibrato only | vibrato only | vibrato + routable filter/level LFO |
| **Drive** | no | no | the drum path's shaper |
| **mono/glide** | ignored | ignored | **honoured** — the one native path |
| **Taps / humanize** | no | yes | yes |
| **Presets** | 6 + user | 8 | 24 |

### When to Use Which

- **KNDO-5**: When you want a simple, lightweight waveform replacement for the engine's built-in square/saw/triangle/sine — no Tone.js overhead, just the source and an AR gain. Good for chip-style leads and basic tones, and — with `sweep`, `vibrato` and the `noise` waveform — the arcade-cabinet end of that: coins, lasers, power-ups, explosions, and the wobble a chip lead leans into a held note with.

  The line against the noise and drum tables is **whether the sound follows the melody**. A hat is a hat at whatever pitch the lane is playing, so it belongs in `NOISE` or `DRUM`; chip noise is a *part*, and its filter tracks the note.

- **KLNG8**: Every one-shot. A kick with a sine drop and a noise click, a snare with a triangle knock and a noise band, a tom that's all pitch, a clap that is all air and taps, a cymbal that is six inharmonic squares. The drive shaper adds warmth or crunch, and `monoGroup` makes two of them one channel. This is the Microtonic model: independent sources, each fully enveloped, summed and shaped — and since the noise path folded into it, the only place a drum is built.

- **WNDR-9**: When the sound is a *spectrum you place by hand* — an organ
  registration, a bell, glass. If you find yourself wanting a filter on it, you
  probably wanted a partial pushed in instead; that is the additive move.

- **MRDR-3**: When the sound is *parts stacked* — a body plus a sub plus an
  octave, each with its own life. Every hand-written melodic voice in the engine is
  this shape, and the `layer*` presets are those voices with the lid off. Reach for it
  over a Tone class when the parts need different lengths, different filters, or a
  dry sub under an echoed body.

---

## 10. Key Files

| File | Role |
|------|------|
| `src/engine/voices.js` | `VoiceRack` class — all five native play methods, `adsr`, `pitchRamp`, `_filterChain`, `_noise` colours, pool management, preset refresh/retire |
| `src/engine/audio.js` | `AudioSys` class — sequencer, noise buffer creation, `playVoice()` dispatch, `previewNote()` |
| `src/data/voices.js` | All preset catalogues: `TONE` (Tone classes + the three native synths), `NOISE`, `DRUM`, the `USER_*` tables, `STARTER`, plus `VOICE_LANES` (22 seams), `voiceGain()`, `laneTrim()` |
| `src/engine/mixer.js` | Channel strip construction — fader, pan, EQ, stereo width, effect chain, aux sends, master chain |
| `tools/measure-voices.js` | Measures each preset at unity on its home lane — fills the `LEVELS` table used by `voiceGain()`, and `PEAKS` beside it |
| `tools/lib/measure-voice.js` | The one definition of that measurement, shared with the desk's `/voice-save` |
| `tools/mixer-entry.js` | The mixing desk UI — imports the engine, drives it via `createMixer`, `VoiceRack` |
| `tests/pot-coverage.js` | No hidden parameters, no dead pots — the engine's `v.<key>` reads and the panel's controls must match, per path, both directions |
