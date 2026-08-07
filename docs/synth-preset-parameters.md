# Synth Preset Parameter Reference

> Reference for every parameter label exposed in the desk's preset editor.
> Source: `tools/mixer-voice-editor.js`, `src/data/voices.js`, `src/engine/voices.js`.
> Labels are shown **as rendered** (label + unit, e.g. `CUTOFF Hz`).
>
> **Naming standard:** Roland/Korg conventions. All filter frequency knobs are `CUTOFF`,
> all filter type selectors are `TYPE`, and all sweep destinations are `SWEEP TO` —
> except the drum oscillator's, which is Microtonic's `FREQUENCY` / `AMOUNT` / `RATE`
> instead: a tuning, a signed depth in semitones, and a time. See its section below.
>
> **Envelope ranges:** every exposed envelope time control tops out at 10 seconds.
> Every envelope time knob uses the same non-linear response, with extra travel at the
> short-time end; ordinary non-envelope knobs remain linear.
> Sustain is shown and edited as 0–100%, while the engine continues to store 0–1.
>
> **Optional sections** (every `On`/`Off` switch in the panel) are a **bypass, not a
> delete**: what is switched off is kept on the preset under `bypassed`, keyed by the
> section's path (`osc`, `osc.fm`, …), and `On` puts it back exactly as it was left —
> across reloads, and through every copy of the preset, because `bypassed` is written to
> `voices.js` and to a song's own version of a sound like any other key. A section that
> has never been on still opens on the engine's own defaults, and the last hold to be
> switched back on takes the `bypassed` key with it.
>
> Nothing reads `bypassed` at play time. A preset carrying holds sounds exactly like the
> same preset with them deleted — which is what makes it safe to keep them in the file.

---

## Filter & Drive Naming Convention

All filter and drive controls follow Roland/Korg standards, applied consistently
across every synth type and drum section:

| Label | Applies To | Roland/Korg Equivalent |
|---|---|---|
| **`CUTOFF`** | Every filter frequency knob | CUTOFF / FREQUENCY |
| **`RESONANCE`** | Every filter Q knob | RESONANCE / PEAKING |
| **`TYPE`** | Every filter mode selector (LP/HP/BP/NOTCH) + drive shaper | TYPE / MODE |
| **`SLOPE`** | Filter rolloff (-12/-24/-48 dB/oct) | SLOPE |
| **`SWEEP TO`** | Every sweep destination frequency | (unified from FALLS TO / SWEEPS TO) |
| **`TONE`** | Post-drive LPF frequency | TONE (TR-808/909 convention) |
| **`STRIKE`** | Ring resonator excitation duration | (descriptive, no direct Roland equivalent) |

---

## 📋 Complete Parameter Catalogue

### Common Rows (Every Preset Panel)

| Label | Internal Path | Min | Max | Default | Unit | Notes |
|---|---|---|---|---|---|---|
| `LENGTH` | `$dur` | — | — | — | steps | Note length in 16th steps |
| `TRIM` | `$trim` | -24 | 0 | 0 | dB | Output trim |
| `FIXED LENGTH` | `$fixedLength` | — | — | — | — | Pill toggle |
| `TRANSPOSE` | `$transpose` | -24 | 24 | 0 | st | Semitones |
| `FINE` | `$fine` | -50 | 50 | 0 | ct | Cents |
| `VIB DEPTH` | `$vibrato.depth` | 0 | 12 | 0 | — | 0–12 (1 unit = 100 cents on GameSynth) |
| `VIB RATE` | `$vibrato.rate` | 0.1 | 20 | 5 | Hz | |
| `VIB DELAY` | `$vibrato.delay` | 0.001 | 1 | 0.001 | s | GameSynth only |
| `VOICING` | `$mono` | — | — | POLY | — | POLY / MONO pill |
| `GLIDE` | `$portamento` | 0 | 0.5 | 0 | s | Portamento time |

---

### GameSynth (`src/engine/voices.js` `_playGame`)

The native game oscillator — no Tone.js ADSR, direct Web Audio nodes.

#### Oscillator
| Label | Path | Min | Max | Default | Unit |
|---|---|---|---|---|---|
| `WAVE` | `$waveform` | — | — | square | — (sine/square/sawtooth/triangle/noise) |
| `ATTACK` | `$attack` | 0.001 | 10 | 0.01 | s |
| `RELEASE` | `$release` | 0 | 10 | 0.015 | s |
| `AMOUNT` | `$pitch.semitones` | -48 | 48 | 0 | semi | How far from the written note the bend starts — the same row a MRDR-3 layer's Pitch Env has |
| `ATTACK` | `$pitch.attack` | 0 | 10 | 0 | s |
| `DECAY` | `$pitch.decay` | 0 | 10 | 0.06 | s |
| `SUSTAIN` | `$pitch.sustain` | 0 | 100 | 0 | % |
| `RELEASE` | `$pitch.release` | 0 | 10 | 0.015 | s |

#### Filter (optional section)
| Label | Path | Min | Max | Default | Unit | ⚠️ |
|---|---|---|---|---|---|---|
| `TYPE` | `$filter.type` | — | — | lowpass | — |
| `SLOPE` | `$filter.slope` | — | — | -12 | dB/oct | ⚠️ Should be ROLLOFF or POLES |
| `CUTOFF` | `$filter.freq` | 20 | 18000 | 4000 | Hz |
| `RESONANCE` | `$filter.Q` | 0.1 | 40 | 0.7 | — | ✅ Standard |
| `SWEEP TO` | `$filter.to` | 20 | 18000 | 4000 | Hz |
| `SWEEP TIME` | `$filter.sweep` | 0.005 | 2 | 0.12 | s | |

---

### MonoSynth (Tone.MonoSynth)

| Section | Label | Path | Min | Max | Default | Unit | ⚠️ |
|---|---|---|---|---|---|---|---|
| Oscillator | `WAVE` | `oscillator.type` | — | — | sawtooth | — | |
| Oscillator | `VOICING` | `oscillator.type` | — | — | single | — | Prefix: single/fat/am/fm |
| Oscillator | `STACK` | `oscillator.count` | 1 | 8 | 3 | — | Fat voicing only |
| Oscillator | `SPREAD` | `oscillator.spread` | 0 | 100 | 20 | cents | Fat voicing only |
| Amp Env | `ATTACK` | `envelope.attack` | 0.001 | 10 | 0.01 | s | |
| Amp Env | `DECAY` | `envelope.decay` | 0.01 | 10 | 0.2 | s | |
| Amp Env | `SUSTAIN` | `envelope.sustain` | 0 | 100 | 50 | % | |
| Amp Env | `RELEASE` | `envelope.release` | 0.01 | 10 | 0.3 | s | |
| Amp Env | `ATK`/`DEC`/`REL` (one row) | `envelope.attackCurve`/`decayCurve`/`releaseCurve` | — | — | linear/exponential/exponential | — | linear or exponential only |
| **Filter** | `TYPE` | `filter.type` | — | — | lowpass | — |
| **Filter** | **`SLOPE`** | `filter.rolloff` | — | — | -12 | dB/oct | **⚠️ Should be ROLLOFF** |
| **Filter** | `CUTOFF` | `filterEnvelope.baseFrequency` | 20 | 8000 | 200 | Hz |
| **Filter** | `RESONANCE` | `filter.Q` | 0 | 20 | 1 | — | ✅ Standard |
| **Filter** | `SWEEP` | `filterEnvelope.octaves` | 0 | 8 | 2 | oct | |
| Filter Env | `ATTACK` | `filterEnvelope.attack` | 0.001 | 10 | 0.01 | s | |
| Filter Env | `DECAY` | `filterEnvelope.decay` | 0.01 | 10 | 0.2 | s | |
| Filter Env | `SUSTAIN` | `filterEnvelope.sustain` | 0 | 100 | 50 | % | |
| Filter Env | `RELEASE` | `filterEnvelope.release` | 0.01 | 10 | 0.3 | s | |
| Filter Env | `ATK`/`DEC`/`REL` (one row) | `filterEnvelope.attackCurve`/`decayCurve`/`releaseCurve` | — | — | linear/exponential/exponential | — | linear or exponential only |

---

### Synth (Tone.Synth — simplest oscillator+envelope)

| Label | Path | Notes |
|---|---|---|
| `WAVE` / `VOICING` / `STACK` / `SPREAD` | `oscillator.*` | Same as MonoSynth oscillator |
| `ATTACK` / `DECAY` / `SUSTAIN` / `RELEASE` + curves | `envelope.*` | Same ADSR as above |

---

### FMSynth (Tone.FMSynth)

| Label | Path | Min | Max | Default | Unit |
|---|---|---|---|---|---|
| `RATIO` | `harmonicity` | 0.1 | 12 | 1 | — |
| `INDEX` | `modulationIndex` | 0 | 32 | 5 | — |
| `CARRIER` | `oscillator.type` | — | — | sine | — |
| `MODULATOR` | `modulation.type` | — | — | sine | — |
| `ATTACK`/`DECAY`/`SUSTAIN`/`RELEASE` + curves | `envelope.*` | | | | |
| `ATTACK`/`DECAY`/`SUSTAIN`/`RELEASE` + curves | `modulationEnvelope.*` | | | | |

---

### AMSynth (Tone.AMSynth)

Same layout as FMSynth: `RATIO`, `CARRIER`, `MODULATOR`, two envelopes.

---

### DuoSynth (Tone.DuoSynth)

| Label | Path | Notes |
|---|---|---|
| `DETUNE` | `harmonicity` | Frequency ratio between voices |
| `VIBRATO` | `vibratoAmount` | Built-in vibrato depth (0–1) |
| `VIB RATE` | `vibratoRate` | Built-in vibrato rate |
| Voice 1 / Voice 2 | `voice0.*`, `voice1.*` | Independent oscillator + envelope per voice |

---

### MembraneSynth (Tone.MembraneSynth — pitched drum)

| Label | Path | Min | Max | Default | Unit |
|---|---|---|---|---|---|
| `PITCH DROP` | `pitchDecay` | 0.01 | 1 | 0.05 | s |
| `DEPTH` | `octaves` | 0.5 | 12 | 5 | oct |
| `WAVE` | `oscillator.type` | — | — | sine | — |
| `ATTACK`/`DECAY`/`SUSTAIN`/`RELEASE` + curves | `envelope.*` | | | | |

---

### MetalSynth (Tone.MetalSynth)

| Label | Path | Notes |
|---|---|---|
| `RATIO` | `harmonicity` | |
| `INDEX` | `modulationIndex` | |
| `RESONANCE` | `resonance` | Filter Q for the partials |
| `SPREAD` | `octaves` | |
| `ATTACK`/`DECAY`/`RELEASE` + curves | `envelope.*` | No sustain — struck sound |

---

### AdditiveSynth (Drawbar Organ — native path `_playAdditive`)

| Label | Path | Notes |
|---|---|---|
| `16′` `5⅓′` `8′` `4′` `2⅔′` `2′` `1⅗′` `1⅓′` `1′` | `$additive.bars.0–8` | Drawbar levels (0–1). Order matches the console. |
| `WAVE` | `$additive.type` | Waveform per partial |
| `STRETCH` | `$additive.stretch` | Inharmonic stretch |
| `DAMP` | `$additive.damp` | High-frequency damping |
| `PARTIALS` | `$additive.count` | |
| `ATTACK`/`DECAY`/`SUSTAIN`/`RELEASE` | `$additive.*` | |
| `ATK`/`DEC`/`REL` (one row) | `$additive.attackCurve`/`curve`/`releaseCurve` | linear or exponential only |
| `FROM` | `$additive.pitch.from` | Pitch sweep start ratio |
| `TO` | `$additive.pitch.to` | Pitch sweep end ratio |
| `SWEEP` | `$additive.pitch.sweep` | Sweep duration |
| `HARMONIC` | `$additive.perc.ratio` | Percussion harmonic |
| `LEVEL` | `$additive.perc.gain` | Percussion level |
| `ATTACK`/`DECAY` | `$additive.perc.*` | Percussion envelope |

---

### Noise Presets (native `_playNoise` path)

#### Burst Section
| Label | Path | Min | Max | Default | Unit |
|---|---|---|---|---|---|
| `TYPE` | `$noise.type` | — | — | bandpass | — |
| `COLOUR` | `$noise.color` | — | — | white | — |
| `SLOPE` | `$noise.slope` | — | — | -12 | dB/oct |
| `LEVEL` | `$noise.gain` | 0 | 2 | 1 | — | |
| `CUTOFF` | `$noise.freq` | 100 | 12000 | 2600 | Hz |
| `RESONANCE` | `$noise.Q` | 0.1 | 40 | 0.7 | — | ✅ Standard |
| `DECAY` | `$noise.decay` | 0.005 | 10 | 0.09 | s | |

#### Body Section (optional)
| Label | Path | Min | Max | Default | Unit | ⚠️ |
|---|---|---|---|---|---|---|
| `WAVE` | `$body.type` | — | — | triangle | — | |
| `LEVEL` | `$body.gain` | 0 | 1 | 0.375 | — | |
| `PITCH` | `$body.from` | 30 | 4000 | 210 | Hz | Start of pitch drop |
| `SWEEP TO` | `$body.to` | 20 | 4000 | 140 | Hz |
| `DECAY` | `$body.decay` | 0.005 | 10 | 0.06 | s | |

---

### Drum Synth Presets (native `_playDrum` path)

#### Oscillator Section (optional)
| Label | Path | Min | Max | Default | Unit |
|---|---|---|---|---|---|
| `WAVE` | `$osc.type` | — | — | sine | — |
| `CURVE` | `$osc.curve` | — | — | exp | — |
| `RATE CURVE` | `$osc.pitchCurve` | — | — | exp | — |
| `LEVEL` | `$osc.gain` | 0 | 2 | 1 | — |
| `KNOCK` | `$knock` | 0 | 1 | 0 | — |
| `FREQUENCY` | `$osc.from` | 20 | 10000 | 190 | Hz |
| `AMOUNT` | `$osc.to` | -96 | +96 | 0 | semi |
| `RATE` | `$osc.sweep` | 0.005 | 10 | 0.07 | s |
| `ATTACK` | `$osc.attack` | 0.001 | 10 | 0.001 | s |
| `HOLD` | `$osc.hold` | 0 | 10 | 0 | s |
| `DECAY` | `$osc.decay` | 0.01 | 10 | 0.35 | s |
| `SAG` | `$osc.sag` | 0 | 1 | 0 | — |

`AMOUNT` is the one control here that is not stored as it is shown. The catalogue keeps
the destination in hertz (`osc.to`) because that is what `_playDrum` ramps to and what
every preset on file already holds; the pot shows the **interval** between the two
frequencies — `12·log2(to/from)` — centred on zero, where the engine skips the ramp
entirely. Moving `FREQUENCY` carries `osc.to` with it so the interval is preserved, and
the destination is held inside 1 Hz–20 kHz, so ±96 semitones is only fully reachable
from the lower tunings.

`FREQUENCY` uses the non-linear knob response (a cubic, against the envelope times'
quadratic): 25% of the travel is ~175 Hz, 50% ~1.3 kHz, 75% ~4.2 kHz.

#### FM Section (optional, nested under oscillator)
| Label | Path | Min | Max | Default | Unit |
|---|---|---|---|---|---|
| `WAVE` | `$osc.fm.type` | — | — | sine | — |
| `RATIO` | `$osc.fm.ratio` | 0.1 | 12 | 1.4 | — |
| `INDEX` | `$osc.fm.index` | 0 | 8 | 1 | — |
| `ATTACK` | `$osc.fm.attack` | 0.001 | 10 | 0.001 | s |
| `DECAY` | `$osc.fm.decay` | 0.005 | 10 | 0.35 | s |

#### Noise Section (optional)
| Label | Path | Min | Max | Default | Unit | ⚠️ |
|---|---|---|---|---|---|---|
| `TYPE` | `$noise.type` | — | — | bandpass | — |
| `CURVE` | `$noise.curve` | — | — | exp | — |
| `COLOUR` | `$noise.color` | — | — | white | — |
| `SLOPE` | `$noise.slope` | — | — | -12 | dB/oct |
| `LEVEL` | `$noise.gain` | 0 | 2 | 1 | — |
| `CUTOFF` | `$noise.freq` | 100 | 12000 | 2600 | Hz |
| `SWEEP TO` | `$noise.to` | 100 | 12000 | 2600 | Hz |
| `SWEEP` | `$noise.sweep` | 0.005 | 1.5 | 0.12 | s | |
| `RESONANCE` | `$noise.Q` | 0.1 | 40 | 0.7 | — | ✅ |
| `ATTACK` | `$noise.attack` | 0.001 | 10 | 0.001 | s | |
| `HOLD` | `$noise.hold` | 0 | 10 | 0 | s | |
| `DECAY` | `$noise.decay` | 0.005 | 10 | 0.12 | s | |
| `SAG` | `$noise.sag` | 0 | 1 | 0 | — | |

#### Ring Section (optional — resonant filter)
| Label | Path | Min | Max | Default | Unit | ⚠️ |
|---|---|---|---|---|---|---|
| `TYPE` | `$ring.type` | — | — | bandpass | — |
| `CURVE` | `$ring.curve` | — | — | exp | — |
| `LEVEL` | `$ring.gain` | 0 | 2 | 1 | — |
| `PITCH` | `$ring.freq` | 40 | 8000 | 400 | Hz |
| `SWEEP TO` | `$ring.to` | 40 | 8000 | 400 | Hz |
| `STRIKE` | `$ring.hit` | 0.0005 | 0.05 | 0.002 | s | Excitation duration |
| `RESONANCE` | `$ring.Q` | 1 | 120 | 40 | — | ✅ Up to 120 for ringing |
| `DECAY` | `$ring.decay` | 0.005 | 10 | 0.25 | s | |
| `SAG` | `$ring.sag` | 0 | 1 | 0 | — | |

#### Metal Section (optional — inharmonic cluster)
| Label | Path | Min | Max | Default | Unit | ⚠️ |
|---|---|---|---|---|---|---|
| `WAVE` | `$metal.wave` | — | — | square | — | |
| `TYPE` | `$metal.filter` | — | — | highpass | — |
| `LEVEL` | `$metal.gain` | 0 | 2 | 1 | — | |
| `PITCH` | `$metal.freq` | 40 | 4000 | 800 | Hz | Cluster base pitch |
| `SPREAD` | `$metal.spread` | 0 | 2 | 1 | — | Ratio spread |
| `PARTIALS` | `$metal.count` | 1 | 6 | 6 | — | |
| `CUTOFF` | `$metal.hp` | 200 | 12000 | 3000 | Hz |
| `RESONANCE` | `$metal.Q` | 0.1 | 20 | 0.7 | — | ✅ |
| `DECAY` | `$metal.decay` | 0.005 | 10 | 0.2 | s | |
| `SAG` | `$metal.sag` | 0 | 1 | 0 | — | |

#### Drive Section
| Label | Path | Min | Max | Default | Unit | ⚠️ |
|---|---|---|---|---|---|---|
| `SHAPE` | `$shape` | — | — | soft | — |
| `DRIVE` | `$drive` | 0 | 1 | 0 | — | Drive amount |
| `TONE` | `$tone.freq` | 200 | 16000 | 16000 | Hz |

---

### Feel / Humanize (optional, all native presets)

| Label | Path | Min | Max | Default | Unit |
|---|---|---|---|---|---|
| `LEVEL VAR` | `$humanize.gain` | 0 | 0.5 | 0 | — |
| `PITCH VAR` | `$humanize.pitch` | 0 | 0.2 | 0 | — |
| `TONE VAR` | `$humanize.filter` | 0 | 0.5 | 0 | — |

---

### Taps (optional, all presets)

Tap repeats at millisecond offsets with gain falloff. Individual tap levels, decays, and
per-tap detune/tone walks are stated in the preset data but not exposed as individual
knobs on the panel (they are edited as structured data in the tap card).

---

## 🔑 Internal Data Parameter Names (for reference)

When hand-editing presets in `src/data/voices.js`, these are the internal keys used
(separate from the UI labels above):

### Noise preset data shape (`NOISE` table)
```
noise: { type, freq, to, sweep, Q, decay, attack, hold, sag, gain, slope, color, long }
body:  { type, from, to, decay, gain }
taps: [offsets], tapFalloff, tapGains, tapDecays, tapDetune, tapTone
```

### Drum preset data shape (`DRUM` table)
```
osc:   { type, from, to, sweep, attack, hold, decay, sag, curve, pitchCurve, gain,
         fm: { type, ratio, index, attack, decay } }
noise: { type, freq, to, sweep, Q, attack, hold, decay, sag, gain, slope, color, curve }
ring:  { type, freq, to, sweep, Q, hit, decay, sag, gain, curve }
metal: { wave, filter, freq, hp, Q, spread, count, ratios, decay, sag, gain, slope,
         hpTo, hpSweep }
drive, shape (drive shape), tone: { type, freq, Q }
knock (0–1)
humanize: { gain, pitch, filter }
```

### Tone preset data shape (`TONE` table)
```
synth: 'Synth'|'MonoSynth'|'FMSynth'|'AMSynth'|'DuoSynth'|'MembraneSynth'|'MetalSynth'
options: { oscillator, envelope, filter, filterEnvelope, modulation, modulationEnvelope,
           harmonicity, modulationIndex, vibratoAmount, vibratoRate, portamento, ... }
```
Tone's `options` bag goes directly to the class constructor. See [Tone.js docs](https://tonejs.github.io/docs/).

---

## 📝 Resolved Naming Issues (2026-08-01)

All non-standard labels have been renamed to Roland/Korg conventions:

| # | Old Label | New Label | Rationale |
|---|---|---|---|
| 1 | `FROM Hz` (MonoSynth filter cutoff) | **`CUTOFF Hz`** | Roland/Korg standard for filter frequency |
| 2 | `SHAPE` (filter type selector) | **`TYPE`** | Roland/Korg standard for filter mode |
| 3 | `SHAPE` (drive type selector) | **`TYPE`** | Consistent with filter type naming |
| 4 | `FALLS TO` / `SWEEPS TO` (sweep destination) | **`SWEEP TO`** | Unified across all sections |
| 5 | `FILTER` (metal HP cutoff) | **`CUTOFF`** | Same as every other filter frequency knob |
| 6 | `FREQ` (filter frequency) | **`CUTOFF`** | Roland/Korg standard — applied to all filter freq knobs |
| 7 | `CONTOUR` (filter envelope exponent) | **`CURVE`**, later dropped entirely | Non-standard control, unused by nearly every preset |
| 8 | `SLOPE` | (kept) | Roland/Korg use SLOPE on digital gear (TR-8S, etc.) |
| 9 | `TONE` (post-drive LPF) | (kept) | Roland TR-808/909 convention for post-drive filter |
| 10 | `STRIKE` (ring excitation) | (kept) | Descriptive; no direct Roland equivalent |
