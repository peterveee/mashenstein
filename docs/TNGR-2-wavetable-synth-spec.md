# TNGR-2 — spectral wavetable synthesizer specification

> Implementation handoff for **5.6 LUNA Max**. Implement this specification in the
> current MASHENSTEIN checkout. Read the current source before editing; preserve unrelated
> worktree changes. Where a named seam has moved, follow the current equivalent rather than
> recreating an obsolete path.

## 0. Product decision

Build **TNGR-2**, a new native MASHENSTEIN melodic synth whose identity is spectral motion
through original wavetable families. It sits beside, and does not replace, the existing
instruments:

- **MRDR-3**: three-layer analogue/hybrid subtractive synthesis, pulse/PWM, hard sync and FM.
- **KLNG8**: multi-source synthesized percussion.
- **TNGR-2**: two-oscillator digital wavetable synthesis, continuously scanned spectra and
  evolving motion.

The stored engine name and user-facing name are both exactly `TNGR-2`. Its compact strip
abbreviation is `TN2`. Do not spell it `TNGR2`, `TNG-2`, `TNG8` or `TNGR-8` in the UI.

This is not a reskin of MRDR-3 and not a collection of basic waves in lookup tables. Sine,
saw, square and triangle may exist in the initial/default family, but the reason for this
instrument is movement that MRDR-3 cannot produce: vocal shifts, glass-to-metal evolution,
hollow harmonic travel, animated digital pads and changing transient spectra.

The first release includes:

- a production-safe synth engine;
- an original, band-limited wavetable library;
- Quick and full-window Advanced editors;
- live keyboard, sequencer, preview, export and stem support;
- **28 measured factory presets** across seven existing library categories;
- focused DSP, engine, editor, offline-render and performance tests;
- a small standalone `/TNGR2/` playground only if it can reuse the real editor and engine,
  as the MRDR-3 playground does. Do not build a parallel toy implementation.

No proprietary PPG, Waldorf, Serum or third-party ROM/table data may be copied, traced or
converted. The aesthetic reference can be early-1980s wavetable synthesis, but every shipped
table and preset must be original and have its generation/source recorded in the repository.

---

## 1. Non-negotiable MASHENSTEIN contracts

1. **Offline render is a release gate.** WAV bounce, stems and video use
   `OfflineAudioContext`. A sound that works live but renders silent or differently offline
   is not implemented.
2. **Determinism is required.** Rendering the same song/range twice must produce the same
   samples within the project's established tolerance, and separately rendered stems must
   sum back to the mix. Never use unseeded `Math.random()` in the audio result.
3. **Absolute scheduling is required.** Sequencer notes are scheduled ahead at explicit
   audio times. Worklet messages must carry effective audio frame/time; message arrival time
   must never become note time.
4. **Presets remain lane-agnostic.** Category describes sound type, not the lane on which it
   can play. Only add a lane restriction for a real mechanical incompatibility.
5. **Factory preset level data is measured, not guessed.** Every TNGR-2 preset ships with
   real `level` and `peak` values produced through the actual engine and existing measurement
   workflow.
6. **Editing is live and ownership is independent.** Existing song-local copy, duplicate,
   rename, save, preset switching and deep-copy semantics must work. A duplicated TNGR-2
   patch must not share mutable tables, modulation arrays or editor state with its source.
7. **Existing synths must be sample-unchanged.** Do not route MRDR-3, KLNG8 or pooled Tone
   voices through the new processor. A bank or song that does not select TNGR-2 must retain
   its existing render.
8. **Source/build evidence is not listening sign-off.** Complete focused tests and build,
   then explicitly report what was and was not heard in a live browser/device session.

The current engine comments document that a Tone synth built on an AudioWorklet renders
silent in the project's offline path. Do not assume that a custom worklet behaves better.
Prove it before committing the implementation to that architecture.

---

## 2. Architecture decision and proof gate

### 2.1 Preferred runtime

Use one persistent `AudioWorkletNode` **per TNGR-2 lane/context**, not one node per note.
The processor owns all active voices for that lane:

```text
sequencer / keyboard / piano roll
             |
             | timestamped note and patch events
             v
TNGR2 controller owned by VoiceRack
             |
             v
one TNGR2 AudioWorkletNode per lane
  +-- event queue and patch-version store
  +-- 16-note voice allocator
  +-- two wavetable oscillators per note
  +-- unison, envelopes and modulation
  +-- per-note stereo filter
  +-- voice summing and output trim
             |
             v
existing dry/wet lane routing -> existing effects -> mixer
```

The lookup itself is cheap; the important efficiency gain is keeping polyphony inside one
DSP loop instead of constructing a large browser-node graph for each note. Do not create an
AudioWorkletNode per voice, per oscillator or per unison member.

### 2.2 Mandatory spike before feature implementation

First create a minimal temporary proof using the actual build and render shells. It must:

1. register a bundled processor on the live `AudioContext`;
2. register that same processor on a fresh `OfflineAudioContext`;
3. schedule a tone whose first note begins after time zero;
4. render non-silent audio at both 44.1 and 48 kHz;
5. render the same buffer twice with maximum sample difference below `5e-6`;
6. work in the production build path, not only the dev server;
7. work under the secure-context rules used by the deployed PWA;
8. demonstrate that a lane stem and the same lane in a mix are sample-consistent.

Keep the proof as a regression if it passes. If it fails, stop the main implementation and
report the exact browser/build/offline failure. Do **not** silently ship a live-only synth,
and do not imitate continuous wavetable motion with dozens of always-running
`OscillatorNode`s.

### 2.3 Shared DSP core

Keep the synthesis mathematics separate from the worklet wrapper:

```text
src/engine/tngr2/
  dsp.js                 pure voice/oscillator/filter/envelope processing
  tables.js              table catalogue metadata and runtime loader
  processor.js           thin AudioWorkletProcessor wrapper
  controller.js          context/lane lifecycle and timestamped event bridge
  schema.js              defaults, validation, migration and deep snapshot helpers
  generated-tables.js    or a generated binary asset plus manifest
tools/
  build-tngr2-tables.js   deterministic authoring/build tool
```

Exact filenames may follow current build conventions, but maintain these ownership
boundaries. `dsp.js` must not import DOM, Tone, mixer or game state. The processor wrapper
must not contain a second copy of oscillator mathematics.

If the worklet proof passes live but fails in `OfflineAudioContext`, the only acceptable
fallback is to drive the **same DSP core** in a deterministic ahead-of-time renderer and
feed its result into the existing offline graph. That fallback must render full lane event
state—including overlapping notes, mono/legato ownership, automation and tails—not isolated
notes that happen to resemble the live path. If parity cannot be demonstrated, stop and
report rather than maintaining two approximate synths.

---

## 3. Wavetable data model

### 3.1 Table family

A table family is an ordered spectral journey. Version the manifest from its first commit:

```js
{
  version: 1,
  id: 'vowelGlass',
  name: 'Vowel Glass',
  description: 'Open vowel harmonics becoming a thin glass spectrum',
  frames: 32,
  samplesPerFrame: 2048,
  mipLevels: 10,
  normalization: 'family-peak',
  source: 'procedural-original',
  authoringVersion: 1,
  hash: '...'
}
```

Requirements:

- 32 frames per family in v1. Permit the schema to grow later without assuming 32 in DSP.
- 2,048 samples per cycle, plus an optional duplicated wrap sample if it materially
  simplifies interpolation.
- Mono, zero-DC single cycles with a continuous wrap boundary.
- Store harmonic-domain authoring data where practical; generate runtime samples at build
  time.
- Generate band-limited mip levels for every frame. Each higher-pitch level removes
  harmonics that would exceed Nyquist at its intended fundamental.
- Preserve intentional energy changes across positions. Normalize once across the whole
  family, not independently per frame, because per-frame normalization turns timbral travel
  into artificial pumping.
- Validate manifest hashes so cached contexts cannot pair new metadata with stale samples.
- Tables are immutable shared assets. A preset stores a family ID and position parameters,
  never a mutable copy of the full sample data.

### 3.2 Original factory table library

Ship at least these **16 authored families**, with clearly audible movement between frames:

1. `basic` — sine -> triangle -> saw -> square; chiefly for Init and diagnostics.
2. `warmHarmonics` — rounded low partials opening into a rich but smooth spectrum.
3. `hollowPulse` — changing odd/even balance with pulse-like hollow regions.
4. `sawForm` — several differently weighted saw spectra, not duplicated native saws.
5. `vowelAEIOU` — original harmonic approximations of vowel-like resonances.
6. `vowelGlass` — vocal body thinning into glassy upper partials.
7. `choirBreath` — soft vocal clusters with a controlled noisy-sounding harmonic skirt;
   remain periodic and deterministic.
8. `crystal` — sparse high partials that progressively fill in.
9. `alloy` — inharmonic-feeling metallic colour represented by a periodic harmonic series.
10. `bellFold` — bell-like clusters folding toward a brighter digital edge.
11. `reedWire` — nasal reed spectra becoming narrow and wired.
12. `organShift` — drawbar-like registrations travelling through several harmonic balances.
13. `spectralPWM` — a table-domain PWM-like journey for movement distinct from MRDR-3 PWM.
14. `octaveCascade` — successive octave and fifth partial groups entering and leaving.
15. `digitalSteps` — deliberately stepped 1980s digital colours, smoothly interpolable.
16. `darkToAir` — low, nearly sinusoidal body opening into broad airy harmonics.

Names shown to the user may contain spaces and title case. Internal IDs remain stable once a
factory preset ships. Provide a development audition that sweeps every family from position
0 to 1 at C2, C4 and C6 so aliasing, level discontinuities and boring frames are easy to
hear.

### 3.3 Lookup and interpolation

For each oscillator sample:

1. advance a double-precision phase accumulator and wrap to `[0, 1)`;
2. choose the two surrounding table frames from the continuously smoothed position;
3. interpolate samples within each frame;
4. interpolate between those two frame values;
5. select or crossfade appropriate mip levels without audible pitch-boundary steps;
6. apply oscillator gain and continue through voice processing.

Start with linear interpolation within and between frames. Add four-point interpolation
only if alias/spectral measurements or blind listening show a meaningful improvement within
budget. Never calculate all 32 frames per sample: only the adjacent frame pair participates.

Pitch is `baseHz * 2^(semitones/12) * 2^(fineCents/1200)`, with bend, glide, pitch LFO and
unison detune composed in cents before conversion. Clamp invalid/inaudible values safely;
NaN or an unknown table ID must produce a controlled fallback, never poison the audio block.

---

## 4. Voice and signal architecture

### 4.1 Polyphony and key modes

- Maximum 16 held/releasing notes per lane.
- Support the existing `poly`, `legato` and `mono` meanings exactly.
- `poly`: allocate a voice per tone; steal the quietest release voice first, otherwise the
  oldest active voice, with a 3–5 ms anti-click transition.
- `mono`: choke/retrigger envelopes on a new note.
- `legato`: transfer latest-key ownership and glide pitch without retriggering the active
  amp/filter/position envelopes unless the previous note has actually ended.
- Held preview notes remain held until released. Sequencer notes honor their scheduled gate
  and release. Panic/stop/song switch disposes or fades all active voices and clears queued
  future events belonging to the old transport generation.

### 4.2 Two wavetable oscillators

Each note has Oscillator A and Oscillator B. A is always present; B can be switched off.
Each oscillator has:

| Control | Stored key | Range/default | Contract |
| --- | --- | --- | --- |
| Table | `table` | family ID / `basic` | Stable catalogue ID, searchable picker in Advanced. |
| Position | `position` | 0–1 / 0 | Base frame position. |
| Position env | `envAmount` | -1–1 / 0 | Bipolar travel produced by the shared position envelope. |
| Position LFO | `lfoAmount` | -1–1 / 0 | Bipolar travel from the selected LFO. |
| Octave | `octave` | -3…+3 / 0 | Integer octave. |
| Semitone | `semitone` | -24…+24 / 0 | Integer coarse tuning. |
| Fine | `fine` | -100…+100 cents / 0 | Fine tuning. |
| Level | `level` | 0–1 / A=0.8, B=0 | Equal-power-aware source level. |
| Pan | `pan` | -1–1 / 0 | Base stereo placement before per-note filter. |
| Phase | `phase` | 0–1 / 0 | Retrigger phase when phase mode is fixed. |
| Phase mode | `phaseMode` | `free`, `fixed`, `seeded` / `seeded` | `seeded` is deterministic per event. |
| Unison | `unison` | 1–4 / 1 | Number of internal copies. |
| Detune | `spread` | 0–50 cents / 12 | Symmetrical tuning spread. |
| Stereo | `stereo` | 0–1 / 0.5 | Alternating/equal-power stereo position of unison members. |

Unison level is normalized by `1 / sqrt(count)`. The two oscillators sum; do not normalize
them so aggressively that single-oscillator presets become louder merely by switching B
off. Define one consistent source-mix law and measure all factory presets through it.

Do not add hard sync, oscillator FM, conventional moving PWM or a large warp-mode system in
v1. Those belong to MRDR-3 or a later approved extension. TNGR-2 earns its scope through
table position and spectral modulation.

### 4.3 Modulation

Provide these sources:

- velocity;
- key tracking;
- position envelope;
- filter envelope;
- LFO 1;
- LFO 2;
- mod wheel/automation when the existing performance path exposes it.

LFO shapes: sine, triangle, saw up, saw down, square and deterministic sample-and-hold.
Each LFO supports free Hz and the existing musical divisions (`1/64` through `1/2`) using
the sequencer's seconds-per-sixteenth convention. It has `rate`, `sync`, `division`, `phase`,
`delay` and optional retrigger/free mode.

Use an explicit six-slot modulation matrix in Advanced:

```js
mod: [
  { source: 'lfo1', destination: 'oscA.position', amount: 0.35 },
  { source: 'velocity', destination: 'filter.cutoff', amount: 0.2 },
]
```

Destinations in v1: A position, B position, both positions, pitch, filter cutoff, amplitude,
pan and LFO rate. Amount is bipolar. Fixed dedicated position-envelope and LFO amounts may
be represented as normalized matrix slots internally, but the two obvious position controls
must remain visible without opening a matrix.

All discontinuous control changes are smoothed. Suggested defaults: 5 ms for gain/pan,
10–20 ms for position/cutoff, and no smoothing for an explicitly stepped S&H destination
beyond the anti-click required at the audio result.

### 4.4 Envelopes

Provide three envelopes:

- AMP ADSR: attack, decay, sustain, release;
- FILTER ADSR plus bipolar amount;
- POSITION ADHSR: attack, hold, decay, sustain, release.

Use the project's established logarithmic time mapping from 1 ms to 10 s and existing curve
vocabulary where possible. An envelope reaches a normalized modulation value; oscillator
`envAmount` determines its direction and travel. Clamp final position to `[0, 1]` after all
modulation sums, using a very short soft boundary or smoothing if hard clamping clicks.

### 4.5 Filter and output

Use one stereo, per-note topology-preserving state-variable filter after the two oscillators
and their unison sums:

- low-pass, high-pass, band-pass and notch;
- cutoff 20 Hz to 20 kHz, clamped below the context Nyquist limit;
- resonance 0–1 mapped to a stable Q range;
- bipolar envelope amount, at least ±8 octaves;
- key tracking 0–1;
- optional 0–1 drive into the filter only if stability and level tests pass.

The filter must remain stable under maximum resonance, cutoff modulation and 48 kHz output.
Prefer a tested TPT/ZDF state-variable implementation. If the filter is not demonstrably
stable, use a simpler stable design rather than shipping occasional NaNs.

After voice summing provide master gain and an optional gentle, explicitly visible drive.
Do not hide a limiter that changes every preset. Denormal protection and a final finite-value
guard are acceptable; a non-finite sample must zero/fade the affected voice and increment a
diagnostic counter rather than destroy the lane.

---

## 5. Event, lifecycle and patch protocol

The worklet/controller protocol is versioned. Use compact structured-clone messages during
setup and small scheduled events during playback:

```js
{ type: 'installTables', protocol: 1, manifestHash, payload }
{ type: 'installPatch', protocol: 1, patchId, revision, snapshot }
{ type: 'noteOn', frame, eventId, patchId, revision, hz, velocity, channel }
{ type: 'noteOff', frame, eventId }
{ type: 'param', frame, patchId, revision, path, value, rampFrames }
{ type: 'panic', frame, transportGeneration }
```

- Convert audio time to integer frame using the target context sample rate at the
  controller boundary.
- The processor keeps a frame-sorted queue and applies events inside the correct render
  quantum, not just at 128-sample block boundaries.
- Send events within the existing sequencer lookahead. Late messages increment a diagnostic
  and apply at the first safe sample; they must not be silently backdated.
- Notes bind to the exact patch revision active at note-on. Decide explicitly which live
  controls affect already-sounding notes: continuous controls should; structural changes
  such as table family, unison count and phase mode apply to new notes or crossfade safely.
- Table assets are installed once per context and shared by every TNGR-2 lane processor via
  `SharedArrayBuffer` only if current isolation/deployment policy supports it. Otherwise
  transfer/copy once per node and measure memory. Do not make cross-origin isolation a new
  site requirement merely for this optimization.
- Context suspend/resume, device change, song switch, preset switch, editor close and full
  Audio teardown must have explicit cleanup. No orphan processors or repeating LFO state.

Seeded phase and S&H values must derive from stable inputs such as voice/preset identity,
event time/frame, note identity and unison index. They must not depend on mutable playback
history that differs when a stem begins at a later bar.

---

## 6. Preset schema

A factory preset follows existing top-level catalogue conventions and adds a `tngr2` block:

```js
{
  label: 'Burnt Horizon',
  category: 'Pad',
  synth: 'TNGR-2',
  dur: 8,
  note: 'A slow glass-and-vowel pad that opens across held chords.',
  mode: 'poly',
  level: 0, // replaced by measured value before shipping
  peak: 0,  // replaced by measured value before shipping
  tngr2: {
    version: 1,
    oscA: { table: 'vowelGlass', position: 0.12, envAmount: 0.55,
      lfoAmount: 0.08, octave: 0, semitone: 0, fine: -4,
      level: 0.78, pan: -0.08, phaseMode: 'seeded', phase: 0,
      unison: 2, spread: 9, stereo: 0.55 },
    oscB: { on: true, table: 'darkToAir', position: 0.3, envAmount: 0.25,
      lfoAmount: -0.1, octave: -1, semitone: 0, fine: 5,
      level: 0.42, pan: 0.08, phaseMode: 'seeded', phase: 0,
      unison: 2, spread: 7, stereo: 0.55 },
    amp: { attack: 0.7, decay: 1.8, sustain: 0.78, release: 3.2 },
    positionEnv: { attack: 2.4, hold: 0, decay: 3.4, sustain: 0.5, release: 1.2 },
    filter: { type: 'lowpass', cutoff: 5200, resonance: 0.22,
      keyTrack: 0.3, envAmount: 1.4 },
    filterEnv: { attack: 1.1, decay: 2.2, sustain: 0.55, release: 2.8 },
    lfo1: { shape: 'sine', sync: true, division: '1/2', rate: 0.3,
      phase: 0, delay: 0.2, retrigger: false },
    lfo2: { shape: 'triangle', sync: false, rate: 0.11,
      phase: 0.25, delay: 0, retrigger: false },
    mod: [],
    master: { gain: 0.72, drive: 0 },
  }
}
```

The exact nesting may be adjusted to fit current editor utilities, but it must remain
versioned, JSON-safe, deep-copyable and self-contained apart from immutable factory table
IDs. Unknown future keys should be ignored; missing v1 keys receive documented defaults.
Unknown table IDs fall back to `basic` and surface an editor warning rather than throwing in
the scheduler.

Add schema validation and migration for saved/song-local patches from the first version.
Do not postpone versioning until after users have stored presets.

---

## 7. Editors and interaction

### 7.1 Instrument identity

TNGR-2 should look like a sibling of MRDR-3 and KLNG8, not a third-party plugin. Use the
existing full-window editor structure, typography, knobs, cards, focus rules and close/save
behaviour. Give it a restrained burnt-orange/amber identity and a spectral waveform display;
do not change shared MRDR-3/KLNG8 geometry merely to brand this editor.

The waveform/spectrum display must be generated by canvas/SVG/code from the actual selected
tables. It is an editor visualization, not a decorative bitmap. It should show:

- the selected family across its horizontal frame strip;
- the current base position and modulated travel range;
- the current single-cycle shape at the cursor/current position;
- A and B in distinguishable but accessible colours;
- reduced-motion behaviour that stops decorative animation while controls remain accurate.

### 7.2 Quick editor

Expose six immediately musical controls plus the Advanced action:

1. **POSITION** — moves A and B positions together while preserving their authored offset.
2. **MOTION** — scales position-envelope and position-LFO amounts from the preset baseline.
3. **BRIGHTNESS** — moves the filter cutoff using the existing path-independent Quick macro
   pattern; Advanced edits must refresh its baseline.
4. **WIDTH** — scales unison stereo/spread only when unison is active; its tooltip explains
   the audible prerequisite.
5. **ATTACK** — scales amp attack from the current preset state.
6. **RELEASE** — scales amp release from the current preset state.

Quick controls must be reversible and path-independent: setting a value directly must equal
reaching it through intermediate values, and returning to the starting value must restore
the stored patch. Do not let macro baselines become stale after Advanced edits.

### 7.3 Full-window Advanced editor

At desktop width, organize the signal flow in one primary screen:

```text
[ OSC A + table strip ] [ OSC B + table strip ] [ MOTION ] [ FILTER ] [ AMP/VOICE ]
```

- Oscillator cards show table, position, tuning, level/pan, phase and unison.
- Motion holds the position envelope, both LFOs and the six modulation slots.
- Filter holds filter type/cutoff/resonance/tracking/amount and filter ADSR.
- Amp/Voice holds amp ADSR, poly/legato/mono, glide, master gain/drive and performance
  settings.
- The table picker is searchable and previews a family without committing it until chosen.
- Every non-obvious control has the existing focusable tooltip affordance. Position and
  Motion receive concise in-product guidance because they are the synthesis method.
- Preserve keyboard audition while the editor is open. Pointer gestures on knobs/table
  displays must not trigger notes accidentally.
- At narrow/mobile widths, stack cards without microscopic controls and preserve the close,
  preset picker and keyboard access. Follow existing responsive editor policy.

The preset picker shows only TNGR-2 presets in the full editor and includes category plus
search. Unsaved-change confirmation, save-as, rename, duplicate and reset use the existing
shared state rather than TNGR-specific dialogs.

---

## 8. Factory preset programme — exactly 28 presets

Create and tune all 28 presets below. Labels may receive small wording refinements only to
avoid a real catalogue collision. Each preset must have an individual purpose, a descriptive
`note`, measured `level`/`peak`, appropriate default `dur`, and an audible use of wavetable
position. Do not satisfy the count with near-duplicates or simple transpositions.

### Bass — 5

1. **Orange Current** — rounded moving low harmonics; reliable general sequenced bass.
2. **Glass Motor** — short glass transient settling into a firm dark fundamental.
3. **Night Sequence** — tempo-synced subtle table motion for repeated sixteenth notes.
4. **Hollow Vector** — hollow pulse/formant travel with mono glide and restrained resonance.
5. **Digital Growl** — opposing A/B position movement; aggressive but pitch-readable.

### Lead — 5

6. **Berlin Signal** — clear bright mono lead with slow spectral animation and useful glide.
7. **Neon Reed** — reed-to-wire scan with velocity opening the filter.
8. **Ruby Scanner** — rhythmic position LFO, crisp articulation and moderate stereo spread.
9. **Horizon Solo** — expressive legato lead with position movement during held notes.
10. **Satellite Wire** — thin upper-register digital lead that remains controlled at C6.

### Pad — 6

11. **Burnt Horizon** — flagship slow glass/vowel motion across sustained chords.
12. **Cloud Memory** — soft, low-motion warm pad; useful under dialogue and game ambience.
13. **Glass Choir** — vocal/glass cross-layer movement without using the Vowel insert.
14. **Polar Drift** — wide, cold sparse partials with independent slow LFO movement.
15. **Dream Circuit** — unmistakably 1980s evolving digital pad, musical rather than noisy.
16. **Blue Cathedral** — organ-shift and octave-cascade layers with a long dignified release.

### Keys — 4

17. **Digital EP 84** — bright struck transient moving quickly to a warmer sustained frame.
18. **Hollow Keys** — playable poly key with gentle odd/even spectral response to velocity.
19. **Phase Clav** — short nasal scan with tight release for rhythmic comping.
20. **Memory Organ** — slowly shifting drawbar-like spectrum with stable chord level.

### Pluck — 3

21. **Crystal Trigger** — sparkling high-partial attack with a clean, short body.
22. **Wire Harp** — metallic/reed onset decaying toward a simpler waveform.
23. **Data Marimba** — woody-digital table travel; distinct from KLNG8 percussion.

### Bells — 2

24. **Ice Bell** — sparse crystal partials, long decay, no abrasive high-note aliasing.
25. **Alloy Chime** — darker metallic evolution with controlled beating between A and B.

### FX — 3

26. **Scanner Sweep** — tempo-synced full-table travel suitable for transitions.
27. **Transmission** — vowel/digital talking movement that remains tonal.
28. **Event Horizon** — long dark-to-air rise demonstrating the position envelope range.

Also provide one non-library **Init TNGR-2** editor state using Osc A `basic`, Osc B off,
filter open, no modulation, short safe amp envelope and unity-conservative output. It is a
sound-design starting point, not one of the 28 picker presets.

### Preset quality rules

- At least 20 presets must audibly move position during an ordinary held note without the
  user touching a control.
- At least 8 must use both oscillators for complementary—not duplicated—table motion.
- At least 6 must use tempo-synced motion, but a preset must still render deterministically
  from a later offline start range.
- At least 5 must demonstrate velocity meaningfully.
- Include usable restrained sounds as well as showcase sounds; not every preset should be
  wide, long or bright.
- Bass presets must retain a stable fundamental. High leads and bells must be specifically
  checked for aliasing. Pads must be checked in four-note chords, not only single notes.
- Effects may be dramatic, but all melodic categories must remain pitch-readable.
- Avoid baked-in reverb/delay inside TNGR-2. Presets may use the existing mixer effects only
  where the current preset snapshot contract supports them consistently.
- Audition presets in musical phrases and in a representative mix. A technically different
  waveform is not automatically a worthwhile preset.

---

## 9. Repository integration

Follow current equivalents of these seams:

1. Add the TNGR-2 dispatch before the Tone allowlist in `VoiceRack.play`, as is done for
   other native engines.
2. Add `TNGR-2` to editable/native synth lists, labels and the `TN2` compact abbreviation.
3. Extend preset validation so TNGR-2 requires a valid versioned block, at least Osc A, real
   table IDs, bounded values and measured `level`/`peak`.
4. Add factory presets to the appropriate current voice catalogue collection with
   `factory: true` emerging through the existing construction path.
5. Make preset filtering, save, song-local snapshots, duplication, import/export and track
   identity understand the new engine without special shallow-copy behaviour.
6. Add a TNGR-2 Quick panel and full-window layout using shared editor infrastructure.
7. Register processor/table assets in dev, production build, PWA/offline cache and any
   standalone playground build. A reload while offline must still instantiate TNGR-2.
8. Ensure build hashes/cache invalidation update when processor or table assets change.
9. Ensure Bounce, range render, stems, freeze, preset measurement, visualizer audio and
   note-cache decisions either support TNGR-2 correctly or explicitly take the uncached
   synthesis path. Never let an existing cache silently replay the wrong patch revision.
10. Add teardown to transport stop/song switch/audio-context replacement and editor panic.

Do not make the worklet or table loader global mutable state tied to the first context. Live
and offline contexts must each get correctly registered assets, just as existing
`PeriodicWave` caches are context-specific.

---

## 10. Diagnostics and performance budgets

Expose development diagnostics, preferably through the existing Loop Diagnostics surface:

- TNGR-2 active notes and releasing notes per lane;
- oscillator streams after unison expansion;
- worklet event queue depth;
- late-event count and worst lateness in frames;
- render quantum peak/average DSP time or a safe overload counter;
- non-finite/stability guard count;
- installed table bytes and manifest hash;
- voice-steal count.

Initial budgets on a representative desktop Chromium build at 48 kHz:

- one lane, 8 held notes, 2 oscillators, unison 1, both LFOs and per-note filter: target
  below 5% of one audio-render thread;
- four such lanes: target below 20%;
- worst allowed patch (16 notes, 2 oscillators, unison 4): it may consume materially more,
  but must not underrun and should degrade safely if a hard stream cap is required;
- no allocations in the processor's steady-state `process()` loop;
- no per-sample object creation, array resizing, string lookup or message posting;
- table memory target below 12 MiB decoded for the factory library unless measurement
  justifies and documents more.

Measure on at least one Apple desktop browser and one representative mobile device/browser.
If CPU protection is necessary, use a documented maximum oscillator-stream budget and
predictable voice stealing; do not dynamically lower audio quality in a way that makes
offline and live renders differ.

---

## 11. Verification requirements

### 11.1 Unit/DSP tests

- Phase increment produces correct fundamental at 44.1 and 48 kHz.
- Cycle and frame interpolation are continuous at wrap and frame boundaries.
- Position 0 and 1 reach the first and last frames exactly.
- Mip selection never includes harmonics above Nyquist; transitions have no large level
  jump.
- Every table is finite, zero-DC within tolerance, correctly sized, cyclic and hash-stable.
- Unison detune is symmetric and normalization follows the chosen law.
- ADSR/ADHSR stage times, note-off and legato transfer are sample-accurate within one frame.
- Filter remains finite under maximum resonance/modulation across the supported sample
  rates.
- Seeded phase and S&H are repeatable and independent of prior playback history.
- Voice stealing and panic produce bounded anti-click discontinuities.
- Patch/schema defaults, validation, migration and unknown-table fallback are covered.

### 11.2 Browser/offline engine tests

- A TNGR-2 note starting at `t > 0` renders audibly in `OfflineAudioContext`.
- All 28 presets render non-silent at their intended measurement note and carry non-placeholder
  measured level/peak data.
- Render each preset twice; maximum difference stays within the existing deterministic
  tolerance.
- A mix equals the sum of its independently rendered stems within the existing tolerance.
- Offline range render beginning after bar zero matches the same range from a full render,
  including synced LFO and seeded phase behaviour.
- Poly chord, mono retrigger, legato glide, held keyboard preview and scheduled release work.
- Live parameter edits affect the intended sounding/new notes and never throw in scheduler
  lookahead.
- Stop, panic and song switch leave no audible tail or future queued note from the old song.
- Existing non-TNGR null/baseline tests remain unchanged.

### 11.3 Spectral/audio tests

- Run high-note sweeps for every family and compare out-of-band/aliased energy against an
  explicitly defined threshold and reference method.
- Check position sweeps for frame-boundary clicks using maximum adjacent-sample delta and
  short-window energy discontinuity.
- Check preset peak across C1–C7 and velocities 0.25/0.6/1.0; no preset may unexpectedly
  exceed the project headroom policy.
- Render an automated family audition artifact at three pitches for listening review.

### 11.4 UI and persistence tests

- Every stored TNGR-2 parameter has an engine read and an editor control where intended.
- Quick macros are direct-vs-via path-independent and round-trip to the original patch.
- Advanced edits update Quick readings/baselines.
- Table picker search/preview/commit/cancel and keyboard focus work.
- Factory preset -> song-local edit -> save/rename -> duplicate yields independent ownership.
- JSON/song persistence round-trips without dropping modulation slots or table IDs.
- Full-window layout has no unplaced/duplicate controls and remains usable at supported
  desktop and narrow widths.
- Focus-visible controls expose useful tooltips and accessible names.

### 11.5 Completion commands and evidence

Run the focused TNGR-2 tests, the relevant existing voice/editor/export suites, production
build, served-shell markers where applicable, and `git diff --check`. Run the full suite if
practical; if unrelated failures remain, name them precisely.

After any builder/template changes, restart `npm run dev` and verify the served UI rather
than asking the user to restart it. Browser/device/audio listening evidence must be reported
separately from source, tests, build and served-marker evidence.

---

## 12. Implementation sequence

Implement in reviewable vertical stages. Do not create all UI before proving audio.

1. **Worklet/offline proof:** production-bundled tone, late start, determinism and stem test.
2. **Table pipeline:** schema, deterministic generator, 16 families, validation and audition
   renderer.
3. **DSP core:** one oscillator, interpolation, mip choice, amp envelope and event queue.
4. **Voice engine:** two oscillators, 16-note allocation, modes, unison and seeded phase.
5. **Motion/filter:** position envelope, LFOs, matrix and stable per-note stereo filter.
6. **MASHENSTEIN integration:** dispatch, lane/context lifecycle, routing, offline exports,
   persistence and diagnostics.
7. **Editors:** Quick first, then full-window Advanced and optional real-engine playground.
8. **Preset bank:** create in category batches, measure, audition and refine all 28.
9. **Hardening:** performance/mobile, PWA offline assets, full regression and listening QA.

At the end of every stage, leave the repository buildable and retain a focused regression
for the seam just proved.

---

## 13. Definition of done

TNGR-2 is complete only when:

- it is audibly and visually a distinct third instrument beside MRDR-3 and KLNG8;
- continuous position movement is smooth, band-limited and useful over the playable range;
- live, preview, sequencer, Bounce, stems, range render and offline/PWA use all work;
- repeated offline renders are deterministic and stems retain their sum-to-mix contract;
- Quick and Advanced editors expose the complete approved engine without hidden dead keys;
- exactly 28 worthwhile, measured factory presets ship in the seven stated categories;
- table and preset content is original and provenance is recorded;
- performance budgets and cleanup behaviour are measured rather than assumed;
- focused tests, relevant regressions, production build and diff checks pass;
- musical listening has covered bass lines, leads, four-note pad chords, high bells, synced
  sequences and at least one representative full mix.

If any of these are unverified, report them as outstanding rather than describing the synth
as finished.
