# Game Synth & Drum Synth Instruments

> How MASHENSTEIN's non-Tone.js, non-engine voice paths work — `_playGame`, `_playNoise`, and `_playDrum` in `src/engine/voices.js`.

---

## 1. Architecture Overview

The audio engine has **five** voice paths, dispatched by `kind` in `VoiceRack.play()`:

| `kind` | Play method | Sounds like | Uses Tone.js? | Pooled? |
|--------|------------|-------------|---------------|---------|
| `'engine'` | (hand-written in `scheduleStep`) | Bass, lead, organ, chords, engine percussion | No | No |
| `'tone'` | `VoiceRack.play()` → Tone pool | Full Tone.js synths (Synth, MonoSynth, FMSynth, etc.) | **Yes** | Yes |
| `'tone'` via `synth: 'GameSynth'` | `_playGame()` | Simple square/saw/triangle/sine tones | **No** | No |
| `'noise'` | `_playNoise()` | Filtered noise bursts (snares, claps, hats, shakers) | **No** | No |
| `'drum'` | `_playDrum()` | Dual-source drum synthesis (kicks, toms, zaps, etc.) | **No** | No |

**This document covers GameSynth, Noise, and Drum** — the three paths that are built entirely from native Web Audio nodes and never touch `Tone.Synth` or its relatives.

### Pitch curves

Two of those paths sweep a pitch — GameSynth onto the written note (`sweep`/`sweepTime`), the drum synth from `osc.from` down to `osc.to` over `osc.sweep` — and both write it through one helper, `pitchRamp` in `src/engine/voices.js`. The **shape** is a choice, because where the sweep spends its time is most of what the drop sounds like:

| Curve | What it is | Halfway through 800→100 Hz | Sounds like |
|-------|-----------|---------------------------|-------------|
| `'exp'` *(default)* | `exponentialRampToValueAtTime` — a constant **ratio** per second, so a constant number of semitones per second: a straight line on a piano roll | 283 Hz (the geometric mean) | An even glide. The 808 flavour |
| `'lin'` | `linearRampToValueAtTime` — a constant number of **hertz** per second | 450 Hz (the arithmetic mean) | Hangs up top, then plunges: half the hertz is only a third of the octaves. A whip |
| `'snap'` | `setTargetAtTime` — an RC discharge, hardest at the very start, settling onto the target | 195 Hz | The analogue drum machine's own pitch envelope: the click, then the body. A kick that goes *thud* rather than *boing* |

`setTargetAtTime` never arrives, so `'snap'` runs a **time constant of a quarter of the stated sweep** (98% of the way by the end) and then plants the value there. The `SWEEP` knob goes on meaning "it is over by here" whichever shape is on it.

**Default `'exp'` is load-bearing**: it is what every preset written before the curve existed rendered as, so a preset that names no curve is byte-identical to what the null test's baselines hold. `tests/pitch-curve.js` renders all three and counts zero crossings to prove each shape lands where this table says.

---

## 2. GameSynth (`_playGame`)

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

  pitch: note × pitchShift(v) × detune × 2^(sweep/12)  ──→  note × pitchShift(v) × detune
         └──── over sweepTime, shaped by sweepCurve ────┘
  (`pitch` is the oscillator's frequency, or the bandpass centre for noise)
```

- **One source** per note — from `v.waveform`:
  - `'square'`, `'sawtooth'`, `'triangle'`, `'sine'` → an `OscillatorNode`
  - `'noise'` → the engine's **seeded** buffer, looped, through a **bandpass that tracks the note** (fixed `Q` 2). This is the chip noise channel: the library's 28 noise and drum presets are percussion whose filter ignores the note, and pitched noise is what none of them could say. A rack built without a seeded buffer returns `false` rather than playing silence, so the caller falls back to the engine's own voice
- **One `GainNode`** with an **AR envelope** (Attack → Release, no sustain):
  1. Start at `0.0001`
  2. Attack: `exponentialRampToValueAtTime(gain, peakAt)` where `peakAt = t + min(attack, dur × 0.45)`
  3. Release: `exponentialRampToValueAtTime(0.0001, end)` then `linearRampToValueAtTime(0, end + release)`
- **Pitch sweep** (`sweep`, default `0` = none): the note starts `sweep` semitones away from its written pitch and ramps **onto** it over `sweepTime`. That direction is deliberate — a voice that walks *off* its note can only be a sound effect, and these are lane presets. The ramp is clamped to arrive by note-off, so a 40 ms sixteenth still lands on the note it is written as
- **Sweep curve** (`sweepCurve`, default `'exp'`): *where in `sweepTime` the pitch actually travels* — see [Pitch curves](#pitch-curves). On a melody lane it is mostly the difference between a slide you hear moving and a scoop that is at the note before you notice it left
- **Vibrato** (`vibrato.depth`, default `0` = none): one LFO per note-on. **One LFO for the whole chord** — per-note LFOs drift apart on rate rounding, and a chord whose notes wobble independently is a chorus. Built and stopped with the voices, unlike the Tone path's pool LFO which free-runs. Three stages, because the two waveform families need the same wobble in different units: the LFO stays at unit amplitude, `vibEnv` carries the onset, and the last gain scales it — **cents** into an oscillator's `detune` (shared), or **hertz** into the bandpass for noise, which depends on the note and so needs a gain per note (a semitone is 13 Hz at 220 and 105 Hz at 1760)
- **Delayed vibrato** (`vibrato.delay`, default `0`): the depth grows from nothing to full over this many seconds from note-on — a chip lead holding a note and then leaning into it. A **fade, not a gate**: a wobble switching on at full depth mid-note reads as a fault. This is the one vibrato key the **Tone path cannot honour** — its LFO lives in the pool and free-runs across notes, so there is no note-on to measure an onset from
- **Tone filter** (`filter`, default **absent** = none): an optional filter between the source and the AR gain, switched on as a section in the panel rather than dialled to a no-op. Absent, **not one node is built** and a preset written before it existed sounds identical — "no filter" and "a filter doing nothing" are different sounds. It is the **same `_filterChain`** the noise and drum voices use, so the keys mean the same thing: `type` and `slope` are the filter, `freq` is where it starts, and `to` over `sweep` is where it goes. That last pair is why it earns its place — a cutoff falling into a noise burst is an explosion and one climbing out of a square is a power-up, neither of which the pitch sweep alone can say. Resonance lands on the **first stage only**; the stages behind it carry the slope at `Q` 0.7071 and would multiply the peak if they resonated too. Built **per note**, because its sweep starts at note-on
- **No drive** — past the filter the amplitude path is still gain and nothing else
- **Polyphonic**: If `freq` is an array (a chord), one oscillator+gain pair is created per note. `dur` may be an array too, positionally aligned with `freq`, the way the Tone path reads it
- **Never pooled** — native nodes created and torn down per hit
- **Deterministic offline**: No randomness anywhere in the path. The LFO is a scheduled oscillator started at an absolute time, so its phase is a function of the note's position

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `waveform` | `'square'` | `'square'`, `'sawtooth'`, `'triangle'`, `'sine'` — or `'noise'`, which swaps the oscillator for the seeded buffer through a note-tracking bandpass |
| `attack` | `0.01` | Attack time in seconds (min `0.001`) |
| `release` | `0.015` | Release time in seconds |
| `sweep` | `0` | Semitones the note starts away from its pitch. `+24` over 60 ms is a coin, `−36` over 200 ms a laser |
| `sweepTime` | `0.06` | Seconds to arrive at the written pitch — clamped to the note's own length |
| `sweepCurve` | `'exp'` | The sweep's shape: `'exp'`, `'lin'` or `'snap'` — see [Pitch curves](#pitch-curves) |
| `vibrato.depth` | `0` | Vibrato depth in **semitones**, `1` = ±100 cents. `0` builds no LFO. The panel runs to **12** — a full octave of wobble — and the native paths honour all of it; a **Tone** preset is capped at `1` because `Tone.Vibrato.depth` is a NormalRange and would reject more |
| `vibrato.rate` | `5` | Vibrato rate in Hz. The panel runs to **60**: past about 20 it stops being a wobble and becomes frequency modulation, where the sidebands are the sound |
| `vibrato.delay` | `0` | Seconds for the wobble to fade in from note-on. **GameSynth-only** — see above |
| `vibrato.type` | `'sine'` | LFO waveform (engine-only; no control on the panel) |
| `filter.type` | `'lowpass'` | Tone-filter shape: `lowpass`, `highpass`, `bandpass`, `notch`. The whole `filter` key is **absent by default** — the panel's Filter section is a switch, and off means no node |
| `filter.slope` | `-12` | dB per octave: `-12`, `-24` or `-48`, built as 1, 2 or 4 stages |
| `filter.freq` | `4000` | Cutoff in Hz at note-on |
| `filter.to` | — | Cutoff to arrive at. Equal to `freq` (or absent) is no sweep at all |
| `filter.sweep` | `0.12` | Seconds to travel from `freq` to `to`, exponentially |
| `filter.Q` | `0.7` | Resonance, up to 40. First stage only. A high `Q` can raise the peak several times over — measured at `Q` 20 on a square, three times the unfiltered peak — so it is a level change as well as a tone one |
| `fixedLength` | `0` | An absolute note length in seconds that **overrides `dur` and the tempo both** — `noteSeconds` returns it verbatim and stops. `0` means not set. Not GameSynth's: it is read before the voice is dispatched, so it works on every path. The panel allows up to **4 s**, which is a sound-effect length rather than a note one — an explosion or a power-down runs past two |

**Declared but not read on this path:** `mono` and `portamento` appear on several GameSynth entries in `src/data/voices.js` and are ignored — `play()` dispatches to `_playGame` before the pool that implements them. Glide needs the voice to remember its last pitch, and that state is what a stem render does not carry.

**Not read anywhere:** `minLength` and `maxLength` were listed here as parameters and are read by no code and declared by no preset. There is no such clamp — `fixedLength` is the only absolute length control.

### Presets (4 total)

| ID | Label | Waveform | Category |
|----|-------|----------|----------|
| `toneSquare` | Square Tone | square | Lead |
| `toneSawtooth` | Sawtooth Tone | sawtooth | Lead |
| `toneTriangle` | Triangle Tone | triangle | Lead |
| `toneSine` | Sine Tone | sine | Keys |

### Why It Exists

The engine's hand-written square/saw/triangle/sine voices are baked into `scheduleStep` — they can't be selected from the voice picker. GameSynth presets expose the same basic waveforms as choosable presets, so a lane can opt into "just a square wave" without writing engine code. They use native Web Audio nodes rather than Tone.js to stay lightweight and avoid the Tone synth pool overhead for the simplest possible sound.

---

## 3. Noise Presets (`_playNoise`)

**File:** `src/engine/voices.js` lines ~390–430

### Purpose
Filtered noise bursts with an optional pitched body — the snare, clap, hat, and shaker sounds where the sound is mostly air rather than pitch. Based on the same construction the engine's own snare uses.

### Sound Generation

```
                     ┌─ Noise path ───────────────────────────┐
                     │                                          │
  seeded noiseBuf ──→ BiquadFilterNode ──→ GainNode ──→ dry    │
                     (type, freq, Q)     (exp decay)     │     │
                                                         wet   │
                     ┌─ Body path (optional) ──────────────────┤
                     │                                          │
  OscillatorNode ────→ GainNode ───────────────────────→ dry   │
  (type, from→to)    (exp decay)                        │     │
                                                         wet   │
                     ┌─ Taps ──────────────────────────────────┘
                     Each tap at time + taps[i], gain × tapFalloff^i
```

- **Noise burst**: The engine's **seeded** `AudioSys.noiseBuf` → `BiquadFilterNode` → `GainNode` with exponential decay
  - Filter: configurable `type`, `frequency`, `Q`
  - Envelope: instant attack, exponential decay over `noise.decay` seconds
- **Optional pitched body**: `OscillatorNode` with a pitch envelope (`from` → `to` Hz over `decay` seconds) — what tells a snare from a hiss
- **Taps**: Optional repeats at millisecond offsets — a clap is one hit heard several times in a small room. Each tap is quieter by `tapFalloff^i`
- **Never pooled** — one-shot native nodes per hit
- **Deterministic offline**: Uses the engine's seeded noise buffer, never `Tone.Noise` or `Math.random()`

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `noise.type` | `'bandpass'` | Filter type: `'bandpass'`, `'highpass'`, `'lowpass'` |
| `noise.freq` | `2600` | Filter cutoff frequency in Hz |
| `noise.Q` | `0.7` | Filter resonance |
| `noise.decay` | `0.09` | Decay time in seconds |
| `noise.gain` | `1` | Noise section level |
| `noise.attack` | (instant) | Attack time |
| `noise.color` | `'white'` | `pink`/`brown`/`blue`/`violet` — see §Colours |
| `noise.slope` | `-12` | `-24` / `-48` cascade the filter |
| `humanize.*` | `0` | Per-hit level/pitch/tone variation |
| `tapDetune` / `tapTone` | `1` | Per-tap pitch and filter walks |
| `body.type` | `'triangle'` | Body oscillator waveform |
| `body.from` | `210` | Starting pitch in Hz |
| `body.to` | `140` | Ending pitch in Hz |
| `body.decay` | `0.06` | Body decay time |
| `body.gain` | `0.375` | Body level |
| `taps[]` | `[0]` | Tap offsets in seconds |
| `tapFalloff` | `1` | Per-tap gain multiplier |

### Presets (15 total)

| ID | Label | Category | Key Feature |
|----|-------|----------|-------------|
| `snareCrisp` | Snare | Snare | Engine's own snare — bright band, short decay, triangle body |
| `snareFat` | Fat Snare | Snare | Lower band, longer tail, more body |
| `snareTight` | Tight Snare | Snare | Gated — cut off almost before it starts |
| `snareBrush` | Brush | Snare | Highpassed sweep, no body |
| `snareRim` | Rimshot | Snare | Narrow, high, instant — the stick not the skin |
| `clap808` | Clap | Clap | 4 bursts, 11–36ms apart |
| `clapTight` | Tight Clap | Clap | 3 closer, shorter bursts |
| `clapRoom` | Big Room Clap | Clap | 5 bursts spread wider, long tail |
| `hatClosed` | Closed Hat | Hats | Very short highpassed tick (28ms) |
| `hatOpen` | Open Hat | Hats | Same band ringing for 330ms |
| `hatPedal` | Pedal Hat | Hats | Duller, lower — foot-closing sound |
| `shaker` | Shaker | Perc | Soft band, no attack |
| `tambourine` | Tambourine | Perc | Bright with pitch body |
| `noiseSweep` | Noise Hit | FX | Wide unfiltered burst, long fall |

---

## 4. Drum Synth Presets (`_playDrum`)

**File:** `src/engine/voices.js` lines ~444–550

### Purpose
Full drum synthesis in the "Microtonic" style — **four** independent sources (oscillator, noise, resonator, metal cluster), each with its own envelope, summed and optionally driven into a waveshaper. This is a drum designed from first principles rather than a filtered noise burst with a thump under it.

The osc and noise sections are the original pair. The resonator and the cluster were added because filtered noise cannot make two sounds the kit needs: something **struck that then rings** (a rim, a clave, the shell of a snare) and something genuinely **metallic** (a hat, a cowbell, a cymbal). Every addition is default-off, and a preset that names none of the new keys renders sample-identically to how it did before they existed — verified by re-measuring the whole library.

### Sound Generation

```
  ┌─ Osc section (optional) ───────────────────────────────┐
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
                        [Drive: tanh | fold | crush]       │
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

### The Four Sources

#### Osc Section (`v.osc`)
- **Waveform**: `'sine'`, `'triangle'`, `'square'`, `'sawtooth'`
- **Pitch envelope**: `from` Hz → `to` Hz over `sweep` seconds (e.g., a kick drops from 165→48 Hz), shaped by `pitchCurve` — see [Pitch curves](#pitch-curves)
- **Amp envelope**: Attack (default instant) → optional Hold → Decay, with curve `'exp'` (struck) or `'lin'` (gated). `curve` is the **level**; `pitchCurve` is the **pitch**, and a kick usually wants a different shape for each
- **FM** (`osc.fm`): a second oscillator at `ratio` × the carrier's *starting* frequency, its gain enveloped, wired into `osc.frequency`. Depth is `index` × that frequency, in Hz — the same reading Tone's `modulationIndex` gives. The modulator does **not** track the carrier's sweep: a fixed ratio through a kick's octave-and-a-half drop is a siren, and a drum wants a clang.
- **Gain**: Per-section level

#### Noise Section (`v.noise`)
- **Source**: The engine's seeded noise buffer, **looped**, optionally re-**coloured** (see §Noise Buffers)
- **Filter**: 1, 2 or 4 cascaded `BiquadFilterNode`s — `slope: -12 | -24 | -48`. Resonance is applied to the **first stage only**; Q on every stage of a cascade multiplies into a howl
- **Filter sweep**: The cutoff can itself sweep — `freq` → `to` over `sweep` seconds
- **Amp envelope**: Same AHD + curve as the osc section

#### Ring Section (`v.ring`) — the resonator
- A **click** (`hit`, default 2ms of noise) into a **narrow bandpass** (`Q`, default 40). The pitch is the filter's resonance, not an oscillator, so it arrives already decaying and is inharmonic at the edges
- Ring time ≈ `Q / (π × freq)`, so the amp envelope can only ever cut it **shorter**. A rim wants Q 40+; below ~10 a bandpass colours rather than rings
- `hit` is the character control: 2ms is a stick, 20ms a mallet, past 50ms it stops being a strike

#### Knock (`v.knock`) — a level, not a section
The engine's kick is *three* layers: a sine body, a noise click, and between them a short triangle punch around 300 Hz — the band the bass mostly leaves open, which is what lets a kick read on a phone speaker where the sub is felt rather than heard. `scheduleStep` has always had it as `kickKnock`.

It takes a level and nothing else. Its shape is the engine's — 300 → 180 Hz over 40 ms, up in 4 ms, gone in 50 — because it is the second oscillator a kick needs and the only one, and every parameter it could expose is one more control on a panel pinned to a strip's width. `0` builds nothing.

#### Metal Section (`v.metal`) — the cluster
- `count` (≤6) square oscillators at inharmonic `ratios` (default `[1, 1.342, 1.2312, 1.6532, 1.9523, 2.1523]` — the 808's) through a highpass. `spread` stretches the ratios around the fundamental: 0 collapses them onto one note, 2 is twice the 808's spacing
- The whole cluster can **sag**: `to`/`sweep` slide every partial together, each keeping its ratio. The engine's rimshot does exactly this (three squares falling 6% as they ring), and it is what stops struck metal sounding like a held chord
- The same circuit Tone's `MetalSynth` implements with the ratios welded shut, at roughly half the nodes per hit (no FM operator per oscillator)
- Its filter is stated in its own keys (`hp`, `hpTo`, `hpSweep`, `filter`, `Q`, `slope`) — `metal.freq` already means the pitch

### Drive Shaper

A `WaveShaperNode` applied to the summed sections, in one of three shapes (`v.shape`):

- `'tanh'` (default) — a desk being pushed. **Square-law scaling**: `k = 1 + amount² × 24`, so the bottom half of the travel is warmth and near-square crunch lives in the top quarter
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

1. **Either section can be omitted** — a tom is all osc, a clap (like `dsClap`) is all noise
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
| `noise.slope` | `-12` | Filter slope: `-12` (1 biquad), `-24` (2), `-48` (4) |
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
| `shape` | `'tanh'` | Shaper: `tanh` \| `fold` \| `crush` |
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

## 5. How They're Dispatched

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
  │                ├─ kind === 'noise'  → _playNoise(v, {...})
  │                ├─ kind === 'drum'   → _playDrum(v, {...})
  │                ├─ synth === 'GameSynth' → _playGame(v, {...})
  │                └─ else → Tone pool (_pool() → triggerAttackRelease())
  │
  └─ If voiced() returned false → run the engine's hand-written
     oscillator code (bassFilteredSaw, drawbar organ, etc.)
```

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
- **All noise-based presets** (`_playNoise`, `_playDrum`) and engine percussion use these buffers — never `Tone.Noise`
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

## 6. The Mixer Pipeline They Flow Through

All three voice paths connect to the same channel strip nodes (`dry` and `wet`):

```
GameSynth/Noise/Drum output ──→ dry (GainNode, stereo) ──→
                                  vol (fader) →
                                  panner (StereoPanner) →
                                  EQ (3-band Biquad: lowshelf@250, peaking@1200, highshelf@4000) →
                                  [effect chain slot: up to 6 inserts] →
                                  stereo width (M/S matrix) →
                                  monitor → musicBus → songTrim → analyser → musicGain → master

GameSynth/Noise/Drum output ──→ wet (GainNode) → delay send → echoBus → ... → songTrim
```

---

## 7. Comparison: GameSynth vs Noise vs Drum

| Aspect | GameSynth | Noise | Drum Synth |
|--------|-----------|-------|------------|
| **Purpose** | Simple pitched tones | Filtered noise percussion | Full drum synthesis |
| **Sound sources** | 1 oscillator, **or** noise through a note-tracking bandpass | 1 noise burst + optional pitched body | 4 independent sources (osc, noise, ring, metal), each optional |
| **Pitch envelope** | `sweep` semitones → the note, over `sweepTime`, shaped by `sweepCurve` | Body: `from`→`to` Hz | Osc: `from`→`to` over `sweep`, shaped by `pitchCurve` (+ optional FM); Noise/ring/metal: filter sweeps |
| **Filter** | One bandpass, on the `noise` waveform only, centred on the note | Biquad cascade on the burst (`slope`) | Biquad cascade per section, plus a tone filter after the shaper |
| **Drive** | None | None | WaveShaper: `tanh`, `fold` or `crush`, square-law scaled |
| **Envelope** | AR only (attack, release) | Exponential decay only (instant attack) | Full AHD per section, `'exp'` or `'lin'` curve |
| **Modulation** | Vibrato LFO shared by the chord, with an onset delay | None | None |
| **Per-hit variation** | None | `humanize` + tap walks | `humanize` + tap walks |
| **Taps** | No | Yes | Yes |
| **Polyphony** | Yes (chord = multiple nodes) | No (one-shot) | No (one-shot) |
| **Pooling** | Never | Never | Never |
| **Preset count** | 4 | 15 | 13 |
| **Location in `voices.js`** | `_playGame()` lines ~280 | `_playNoise()` lines ~390 | `_playDrum()` lines ~444 |

### When to Use Which

- **GameSynth**: When you want a simple, lightweight waveform replacement for the engine's built-in square/saw/triangle/sine — no Tone.js overhead, just the source and an AR gain. Good for chip-style leads and basic tones, and — with `sweep`, `vibrato` and the `noise` waveform — the arcade-cabinet end of that: coins, lasers, power-ups, explosions, and the wobble a chip lead leans into a held note with.

  The line against the noise and drum tables is **whether the sound follows the melody**. A hat is a hat at whatever pitch the lane is playing, so it belongs in `NOISE` or `DRUM`; chip noise is a *part*, and its filter tracks the note.

- **Noise**: When the sound is mostly air — snares, claps, hats, shakers. The pitched body (triangle knock) tells a snare from a hiss. Taps make claps. This is the engine's own snare construction, extracted into presets.

- **Drum Synth**: When you want to design a drum from first principles — a kick with a sine drop and a noise click, a snare with a triangle knock and a noise band, a tom that's all pitch. The drive shaper adds warmth or crunch. This is the Microtonic model: two sources, each fully enveloped, summed and shaped.

---

## 8. Key Files

| File | Role |
|------|------|
| `src/engine/voices.js` | `VoiceRack` class — `_playGame()`, `_playNoise()`, `_playDrum()`, pool management, preset refresh/retire |
| `src/engine/audio.js` | `AudioSys` class — sequencer, noise buffer creation, `playVoice()` dispatch, `previewNote()` |
| `src/data/voices.js` | All preset catalogues: `NOISE`, `DRUM`, GameSynth entries in `TONE`, plus `VOICE_LANES`, `voiceGain()`, `laneTrim()` |
| `src/engine/mixer.js` | Channel strip construction — fader, pan, EQ, stereo width, effect chain, aux sends, master chain |
| `tools/measure-voices.js` | Measures each preset at unity on its home lane — fills the `LEVELS` table used by `voiceGain()`, and `PEAKS` beside it |
| `tools/lib/measure-voice.js` | The one definition of that measurement, shared with the desk's `/voice-save` |
| `tools/mixer-entry.js` | The mixing desk UI — imports the engine, drives it via `createMixer`, `VoiceRack` |
