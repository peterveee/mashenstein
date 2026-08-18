# TNGR-2 completion specification

> Handoff document for the next implementation model. This is a completion and
> recovery specification, not permission to describe the existing prototype as
> complete. Read the current source before editing and preserve unrelated worktree
> changes.

## 0. Why this document exists

The original TNGR-2 design specified a shared wavetable DSP core hosted in an
`AudioWorkletNode`, with a deterministic offline path using the same DSP mathematics.
The first implementation instead shipped a native Web Audio fallback:

- `src/engine/tngr2.js` generates harmonic coefficients and caches native
  `PeriodicWave` objects.
- `src/engine/voices.js::_playTngr2` creates browser oscillator, gain, panner and
  `BiquadFilterNode` graphs for each note, unison member and moving frame.
- `tests/tngr2.js` checks the catalogue/editor/native dispatch.
- `tests/tngr2-audio.js` checks one real `OfflineAudioContext` pad render.

That prototype contains useful sound, editor and catalogue work, but it does **not**
implement the required AudioWorklet core, shared DSP core, table asset pipeline, complete
parameter contract, diagnostics, or verification suite. Do not silently extend the
prototype until it appears to satisfy the old spec. Close the gaps explicitly.

The current native path may remain as a temporary compatibility branch while the new path
is proved. It must not become the final TNGR-2 architecture unless the proof gate below
fails and the fallback requirements are met in full.

## 1. Completion goals

The completed engine must:

1. Use one persistent TNGR-2 `AudioWorkletNode` per lane and audio context, not one node
   per note, oscillator, frame or unison member.
2. Keep all synthesis mathematics in a pure, deterministic DSP module usable by both the
   live processor and a deterministic offline renderer.
3. Render continuous, band-limited spectral motion without scheduling a chain of native
   `OscillatorNode`s as a substitute for wavetable interpolation.
4. Preserve MASHENSTEIN contracts: live playback, keyboard preview, sequencer scheduling,
   Bounce, stems, range render, freeze, PWA/offline reload, deterministic repeats and
   stem-to-mix consistency.
5. Expose the complete approved TNGR-2 parameter set in Quick and Advanced editors.
6. Ship exactly 28 measured, original factory presets in the seven approved categories,
   unless the product owner explicitly amends that number.
7. Provide evidence for every claim. Source inspection, unit tests and build success do
   not count as live listening or device CPU sign-off.

## 2. Non-goals and compatibility rules

- Do not route MRDR-3, KLNG8, pooled Tone voices or existing game voices through TNGR-2.
- Do not add hard sync, oscillator FM, conventional moving PWM, or a large warp-mode
  system in this completion pass. Those remain MRDR-3/later-extension territory.
- Do not copy PPG, Waldorf, Serum or other proprietary tables. All tables and presets are
  original; record procedural provenance.
- Do not make cross-origin isolation a new site requirement solely for table sharing.
  Prefer one-time transfer/copy when `SharedArrayBuffer` is not already supported by the
  deployed PWA.
- Do not maintain two approximate synths. If live and offline cannot share the same DSP
  math, stop and report the exact parity failure before adding more features.
- Do not delete the current native implementation until the replacement has passed the
  complete migration and regression gates.

## 3. Mandatory proof gate: AudioWorklet before feature migration

> **RESULT (2026-08-17): PASSED.** `tests/tngr2-worklet-proof.js`, kept as a permanent
> regression, with `src/engine/tngr2/proof.js` as the processor and loader. All eight
> conditions of §3.1 hold, in the dev bundle and the minified production bundle: live
> registration and a running processor, offline renders at 44.1 kHz and 48 kHz, a first
> note strictly after t=0, a repeat render matching **exactly** (0.0, against the 5e-6
> bar), stems summing to their mix within 1.5e-8, panic clearing both sounding notes and
> queued events, and clean teardown across context replacement.
>
> Two findings changed the plan and are load-bearing for the stages below.
>
> **(a) The "worklets render silent offline" belief was a harness artifact.** The notes at
> the top of `src/engine/effects.js` and `src/engine/voices.js` record Tone's Freeverb,
> JCReverb and PluckSynth rendering silence offline, and attribute it to worklets needing
> a secure context. The mechanism is real but the diagnosis stopped one step short:
> `tools/lib/render-bank-browser.js` builds its page with `page.setContent`, which leaves
> it on `about:blank` — an opaque origin where `isSecureContext` is false and Chromium
> does not expose `audioWorklet` on an AudioContext **at all**. Not a worklet that fails:
> no worklet to fail. Measured both ways in `work/local/worklet-probe.mjs`; serving the
> same bundle from an `https` origin (a Playwright route fulfilling locally — no server,
> no network) makes `OfflineAudioContext.audioWorklet` appear and everything above pass.
> **Stage 7 must move the render harness onto a secure origin before TNGR-2's DSP enters a
> worklet**, or every stem, bounce and null test renders silence. Nothing in the shipped
> game is affected: it is served over https or from localhost, both secure.
>
> **(b) The §5 event protocol cannot carry pre-scheduled events offline.** Posting
> `noteOn`/`noteOff` to `node.port` before `startRendering()` is a RACE the render usually
> wins: the offline graph can run to completion before the main thread's port messages are
> pumped to the audio thread, and the notes are still in the processor's queue when the
> buffer comes back silent. Measured directly in `work/local/worklet-probe2.mjs` — the
> processor's own counters report `queued: 1` at the final frame. It is dangerous
> precisely because the FIRST render in a page usually wins the race (compiling the module
> gives the messages time to land), so it looks like it works. Anything known before the
> first sample — a bounce, a stem, a range render, a scheduled bar — must arrive through
> `processorOptions` at node construction, which is delivered before `process()` is ever
> called. The port remains correct for genuinely LIVE interaction, where the audio thread
> runs continuously and messages are pumped between quanta. §5 is amended accordingly.

Create a focused proof regression before implementing the full synth. Use the actual
production bundler, served shell and render harness, not a toy standalone page.

### 3.1 Proof processor

Implement a temporary processor that:

- registers on a live `AudioContext`;
- registers on a fresh `OfflineAudioContext` at 44.1 kHz and 48 kHz;
- receives timestamped `noteOn`, `noteOff` and `panic` messages;
- starts its first note strictly after time zero;
- produces a finite, non-silent sine or impulse-derived tone;
- uses a deterministic phase seed;
- renders the same offline buffer twice with maximum sample difference below `5e-6`;
- works in the production build and deployed secure-context rules;
- proves a lane stem and the equivalent lane in a mix are sample-consistent;
- tears down cleanly on context replacement, stop, song switch and panic.

Keep this proof as a permanent regression if it passes. If it fails, record browser,
sample rate, build mode, error, and whether the failure is live, offline, routing or
teardown. Only then may the implementation use an offline fallback, and that fallback
must call the same pure DSP core described below for the complete lane event state.

### 3.2 No false proof

Do not call a native `OscillatorNode` graph a Worklet proof. Do not prove only a note at
time zero. Do not prove only isolated notes. Do not claim CPU improvement from offline
wall time. A successful proof requires the conditions above and recorded evidence.

## 4. Required source architecture

Add a TNGR-specific module boundary. Exact filenames may follow current build conventions,
but ownership must remain equivalent to this:

```text
src/engine/tngr2/
  dsp.js                 pure voice/oscillator/filter/envelope processing
  tables.js              immutable catalogue metadata and runtime table loader
  processor.js           thin AudioWorkletProcessor wrapper
  controller.js          lane/context lifecycle and timestamped event bridge
  schema.js              defaults, validation, migration and deep snapshots
  generated-tables.js    generated binary/table payload, or asset loader
tools/
  build-tngr2-tables.js  deterministic authoring/build tool
tests/
  tngr2-worklet-proof.js
  tngr2-dsp.js
  tngr2-tables.js
  tngr2-schema.js
  tngr2-audio.js
```

> **Stage 2 landed 2026-08-17.** `dsp.js` and the processor wrapper exist, the wrapper
> named `worklet.js` rather than `processor.js` + `controller.js` — it is forty lines and
> splitting it three ways would be filing, not ownership; the split happens when the
> controller grows lane lifecycle in stage 7. `proof.js` stays beside them as the frozen
> §3 artifact.
>
> **The core is source text, not a module, and that is deliberate.** An
> AudioWorkletProcessor cannot import the modules around it — it runs in its own global
> scope reached only through a URL — so the one thing §2 forbids, two copies of the
> maths, is what the obvious arrangement produces. Instead `dsp.js` holds the core as one
> string: the worklet gets it concatenated into its processor and loaded as a Blob, and
> Node evaluates it once and imports the classes. One string cannot drift from itself,
> where a second build entry plus a checked-in generated copy is exactly the pair that
> does. `new Function` runs in Node only — the browser always reaches this code through
> the worklet — so no page needs `unsafe-eval`.
>
> The core takes its sample rate as an argument and is handed the frame to render, so it
> touches no worklet global; `tests/tngr2-dsp.js` is browserless and asserts that purity
> against the source text. `tests/tngr2-dsp-parity.js` renders the same events through a
> real worklet and through the Node reference renderer and requires them **exactly**
> equal — zero tolerance, not 5e-6 — at both sample rates, including a lane pushed past
> its voice pool so the allocator is compared too. Block size is proven not to be a time:
> rendering at 1, 128, 512 and 997 frames per block gives identical samples.
>
> What is in the core so far is the SHAPE of §7: the 16-voice allocator with §7.1's
> steal order, the frame-stamped event queue with late-event counting, a per-sample ADSR,
> seeded phase per §7.2, equal-power pan, and placeholders for the two things stages 3–6
> replace — a sine where the mipped table lookup goes, and a one-pole where the stereo
> SVF goes. Output trim is not in it yet: five voices sum past 1.0, which is correct
> summation and missing gain staging, and lands with §7.2's level/pan handling in stage 5.

`dsp.js` must not import DOM, Tone, `VoiceRack`, mixer state or game state. The processor
must not contain a second implementation of oscillator or envelope mathematics. The
controller owns context registration and message scheduling; it does not synthesize.

## 5. Worklet runtime and event protocol

Use one persistent node per `{audioContext, laneKey}`. The processor owns active voices,
the event queue, patch revisions and output trim for that lane.

The versioned protocol is:

```js
{ type: 'installTables', protocol: 1, manifestHash, payload }
{ type: 'installPatch', protocol: 1, patchId, revision, snapshot }
{ type: 'noteOn', frame, eventId, patchId, revision, hz, velocity, channel }
{ type: 'noteOff', frame, eventId }
{ type: 'param', frame, patchId, revision, path, value, rampFrames }
{ type: 'panic', frame, transportGeneration }
```

Rules:

- **Amended 2026-08-17, per the §3 proof.** The port is for LIVE interaction only.
  Every event known before the first sample is rendered — the whole schedule for a
  bounce, stem, range render or freeze, and the patch and tables they use — is handed to
  the node in `processorOptions` at construction. Port delivery is not ordered against
  `startRendering()` and silently loses the schedule; see §3 finding (b). A node that
  takes both must apply its constructor events first and then accept port events on top.
- Convert audio time to integer frames at the controller boundary using the target
  context sample rate.
- Keep a frame-sorted queue and apply events at the correct sample inside the render
  quantum; never use message-arrival time as note time.
- Notes bind to the exact patch revision active at note-on.
- Continuous parameters may affect sounding notes. Structural changes such as table
  family, unison count and phase mode apply to new notes or crossfade safely.
- Late events increment a diagnostic and apply at the first safe sample; they are not
  silently backdated.
- `panic` clears active voices and queued events for the old transport generation.
- Context suspend/resume, device change, preset switch, editor close and full audio
  teardown must release nodes, listeners, buffers and repeating LFO state.

## 6. Wavetable asset pipeline

### 6.1 Runtime format

Each factory family has an immutable manifest entry equivalent to:

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
  hash: 'sha256:...'
}
```

Requirements:

- 16 stable factory family IDs from the original spec.
- 32 frames per family in v1.
- 2,048 mono samples per cycle, optionally plus a duplicated wrap sample.
- zero DC and finite values; continuous cyclic wrap.
- family-level normalization, not independent per-frame normalization.
- explicit band-limited mip levels; no harmonic above the intended Nyquist limit.
- deterministic generated output and stable manifest hash.
- presets store only family ID and control values, never mutable table copies.
- table assets are installed once per context and shared by all TNGR-2 lane processors.

> **Stage 3 landed 2026-08-17.** `tools/build-tngr2-tables.js` generates
> `src/engine/tngr2/generated-tables.js`; `src/engine/tngr2/tables.js` expands it;
> `tests/tngr2-tables.js` holds both to the contract above. The spectral authoring moved
> out of the native compat module into `src/engine/tngr2/families.js` — verbatim, proven
> audio-null by the engine null test — so the sixteen families outlive the module that is
> due to be retired, and the native path and the worklet path derive from ONE authoring.
>
> **What ships is the spectra, not the samples.** 16 × 32 × 96 coefficients, int16 at a
> scale of 15000, base64: 96 KiB in the bundle, against the 8.01 MiB the expanded pyramid
> would be. `tables.js` expands a family the first time it is asked for, in a few ms. The
> third option — calling the authoring at runtime — was rejected because it makes the
> shipped sound depend on expressions nobody has frozen, so a family edit would silently
> restyle presets already measured against it. Freezing the spectra as hashed data and
> deriving the samples keeps both properties: one authoring, and a shipped asset that
> changes visibly. `node tools/build-tngr2-tables.js --check` is the drift alarm and the
> test runs the same comparison.
>
> **Seven mip levels, not ten.** A level holds half the harmonics of the one below,
> starting from the authoring's 96: 96, 48, 24, 12, 6, 3, 1. Level 6 is a single harmonic,
> already correct for a fundamental anywhere up to Nyquist, so levels 7–9 would be three
> more copies of that sine. Lengths halve with the harmonic count, floored at 64. Measured
> total for all sixteen families: **8.01 MiB**, inside §11's 12 MiB budget.
>
> Normalisation is family-wide as specified, and the test proves the negative too: no
> family is normalised frame by frame, because that would turn every position sweep into a
> compressor. The audition sweep is `node tools/build-tngr2-tables.js --audition` — 48
> files, every family at C2, C4 and C6, into `work/auditions/tngr2/`.

### 6.2 Lookup algorithm

For every oscillator sample in `dsp.js`:

1. Advance a double-precision phase accumulator and wrap to `[0, 1)`.
2. Smooth/clamp position and choose only its adjacent frame pair.
3. Interpolate within each frame.
4. Interpolate between the two frames.
5. Select or crossfade the appropriate mip level without pitch-boundary steps.
6. Apply oscillator gain/pan and continue through the voice filter and mix.

Start with linear interpolation. Add four-point interpolation only if spectral tests or
blind listening demonstrate a benefit within the measured budget. Never calculate all 32
frames per sample.

> **Stage 4 landed 2026-08-17.** The lookup is in the shared core, so it is one
> implementation running in both hosts: double-precision phase accumulator, linear
> interpolation inside a frame, linear interpolation across the adjacent frame PAIR, and a
> **crossfade** between mip levels rather than a switch — four reads a sample, never the
> other thirty frames. Levels are crossfaded because switching them steps audibly the
> moment a pitch glides across a boundary; the fraction is computed from `log2`, so the
> blend is continuous.
>
> The frame pair and the mip pair are resolved ONCE PER NOTE, not per sample, and the
> family is resolved from its string id at note-on and handed to the voice as an array
> reference — §7.4's "no string lookup in the steady-state loop", satisfied by not having
> a lookup there at all. (Stage 5 moves mip selection per-block when glide can move pitch
> mid-note.)
>
> Tables are always expanded on the main thread and installed finished, never built in the
> processor: a family takes milliseconds, which is thirty render quanta. Each node gets its
> own structured-cloned copy, the trade §2 explicitly asks for in place of requiring
> cross-origin isolation.
>
> Measured: a C6 note on a 96-harmonic family aliases at 1.4% of its harmonic energy;
> POSITION interpolates between frames rather than snapping to the nearest of 32; an
> unknown table id falls back to `basic` and is counted rather than rendering NaN (§8); and
> a core with no tables renders silence and says so, rather than inventing a sound that
> would then differ from every host that did install them. `tests/tngr2-dsp-parity.js` now
> compares four families at five pitches spanning C2–C6 and both hosts still agree
> **exactly**.

The generator must provide a deterministic audition sweep for every family at C2, C4 and
C6, with rendered artifacts or a reproducible command for review.

## 7. DSP and voice contract

### 7.1 Polyphony and modes

- Maximum 16 held/releasing notes per lane.
- `poly`: allocate one voice per note; steal the quietest release first, otherwise the
  oldest active voice, with a 3–5 ms anti-click fade.
- `mono`: choke/retrigger envelopes on a new note.
- `legato`: transfer latest-key ownership and glide pitch without retriggering amp,
  filter or position envelopes unless the prior note ended.
- Scheduled notes honor their gate and release. Preview notes remain held until release.
- Panic, stop and song switch remove active voices and future events from the old
  transport generation.

### 7.2 Oscillators

Oscillator A is always present; B may be off. Both support:

```text
table       family ID
position    0..1
envAmount   -1..1
lfoAmount   -1..1
octave      -3..3
semitone    -24..24
fine        -100..100 cents
level       0..1
pan         -1..1
phase       0..1
phaseMode   free | fixed | seeded
unison      1..4
spread      0..50 cents
stereo      0..1
```

Use `1 / sqrt(unison)` source normalization. Compose tuning in cents before frequency
conversion. `seeded` phase must derive from stable inputs: preset/patch identity, event
identity, note and unison index—not mutable playback history.

### 7.3 Modulation

Provide velocity, key tracking, mod wheel/automation, position envelope, LFO1 and LFO2.
LFOs support sine, triangle, saw, square and deterministic sample-and-hold, with free or
tempo-synced rate, phase, delay and retrigger behavior.

Implement an explicit six-slot matrix. Each slot stores:

```js
{ source, destination, amount, curve, enabled }
```

Validate source/destination IDs, clamp amount, and define destination accumulation order.
At minimum support position, oscillator pitch, oscillator level, filter cutoff, filter
resonance and amp level destinations.

### 7.4 Envelopes and filter

- AMP: ADSR.
- FILTER: bipolar ADSR amount.
- POSITION: ADHSR with attack, hold, decay, sustain and release.
- One stereo per-note state-variable/TPT-style filter with low-pass, high-pass, band-pass
  and notch modes.
- Filter supports cutoff, resonance, key tracking, bipolar envelope amount and optional
  drive.
- All stages are sample/frame accurate within one render frame and remain finite at
  maximum supported resonance and both supported sample rates.

No per-sample allocation, array resize, string lookup or message posting is permitted in
the steady-state processor loop.

> **Stages 5 and 6 landed 2026-08-18.** Both oscillators, unison 1–4 with `1/sqrt(n)`
> normalisation and equal-power pan, cents composed before conversion, all three phase
> modes, poly/mono/legato with glide, master trim; then the position ADHSR, both LFOs, the
> six-slot matrix, the stereo TPT filter with key tracking and drive. Everything is in the
> shared core, so `tests/tngr2-dsp-parity.js` — which now turns ALL of it on at once and
> adds a mono-glide-plus-live-param case — still finds the two hosts **exactly** equal.
>
> **Four decisions worth knowing.**
>
> 1. **Modulation is evaluated on a 16-frame grid, aligned to the ABSOLUTE frame** — not
> per block. Pitch needs a `pow`, the filter a `tan`, a position change a `floor` and a new
> frame pair; doing those per sample for eight sources across sixteen voices is most of the
> budget spent on resolution nobody can hear. 16 frames is 2.76 kHz at 44.1 kHz. Aligning
> to the absolute frame rather than the block is what keeps the parity claim true. LEVEL
> and AMP are deliberately NOT gridded — they are a multiply, and stepping a gain at
> 2.76 kHz buzzes.
> 2. **The filter is a TPT state-variable filter, not a biquad.** A direct-form biquad with
> an envelope on its cutoff is the classic source of a noise burst on a sweep. This one
> stays bounded at the resonance ceiling under full modulation at both rates, which is
> asserted rather than assumed, and it carries its own NaN guard so a bad coefficient
> cannot lodge in the state for the life of a note.
> 3. **`free` phase and non-retriggered LFOs lock to the TRANSPORT**, not to playback
> history — the phase is where a global oscillator started at frame zero would be now.
> That gives the drift-between-notes that "free" is for while keeping a stem identical to
> its mix, which a phase carried over from whatever played last could never do.
> 4. **Destination accumulation is a SUM applied to the base value.** Two slots pointed at
> one destination cooperate instead of the second overwriting the first, and modulation is
> never compounded with its own previous output. An unknown source or destination disables
> its slot and is counted (measured: 2), rather than being quietly treated as slot zero.
>
> One bug worth recording, because the test caught what review would not have: DRIVE used
> the Padé approximation of tanh unguarded. That curve reaches 1 at x=3 and then turns
> around and grows like x/9 — so as a limiter it did the opposite of its job, making a hot
> signal louder and un-clipped. Clamped at ±3 where it meets ±1 continuously, output peaks
> at exactly 1.000.

### 7.5 Controls the spec asked for and the synth does not have

**Amended 2026-08-18 (product decision, Peter).** This spec was written as a wish list, and
several of its controls were built, measured against the bank, and then taken out again.
None of them changes a single preset's sound; each removes a control nothing in the bank
ever set. Recorded here so the spec stops reading as a to-do list for work that was done
and then deliberately undone:

| Asked for | What happened |
| --- | --- |
| Six-slot mod matrix (§7.3) | Removed. One preset used one slot, by accident. The envelope and LFO amounts on each oscillator are the routing this synth actually needs. |
| LFO2 (§7.3) | Removed with the matrix — its only destination was through it. |
| Tempo-synced LFO rate and division (§7.3) | Removed. LFO1 moves table POSITION, which is a timbre; a timbre snapped to the beat is a rhythm the sequencer already owns. |
| LFO delay and retrigger (§7.3) | Removed. The LFO starts with the note, which is what a player expects. The shared Note-card VIBRATO keeps its own delay. |
| Position envelope HOLD (§7.4) | Removed. It was the only hold stage on any engine in the desk, and no preset used it. POSITION is a plain ADSR. |
| Per-oscillator `pan` (§7.2) | Removed. The lane has a pan and STEREO spreads a unison stack; three ways to place the same sound is two too many. |
| `phase` and `phaseMode` (§7.2) | Removed. The start phase is always SEEDED from the note's own identity — a chord does not comb-filter itself and a stem matches its mix. `fixed` and `free` were an expert choice with one right answer, and nothing in the bank ever picked either. |
| `octave` / `semitone` / `fine` (§7.2) | Collapsed to MRDR-3's INTERVAL (semitones) and DETUNE (cents), so both synths name tuning the same way. Migration folds the three into the two. |
| `master.gain` and `master.drive` (§8) | Removed. Every preset carries a measured level that normalises a patch gain straight back out, and the desk's TRIM is the control for tweaking one. DRIVE moved to the effects card with a pre/post switch. |

What stayed, and is on the panel: both oscillators with table, position, env/LFO amounts,
interval, detune, level, unison, spread, stereo; amp, position and
filter ADSRs each with per-stage curves; the TPT filter with type, cutoff, resonance,
slope, key follow and bipolar envelope amount; LFO shape, rate and amount; mode, glide and
vibrato; drive and chorus.

## 8. Versioned preset schema

Every stored preset must contain `tngr2.version === 1`, a valid Osc A, real table IDs,
bounded values and the complete sections below:

```js
{
  version: 1,
  oscA: { table, position, envAmount, lfoAmount, octave, semitone, fine,
    level, pan, phase, phaseMode, unison, spread, stereo },
  oscB: { on, table, position, envAmount, lfoAmount, octave, semitone, fine,
    level, pan, phase, phaseMode, unison, spread, stereo },
  amp: { attack, decay, sustain, release },
  positionEnv: { attack, hold, decay, sustain, release },
  filter: { type, cutoff, resonance, keyTrack, drive },
  filterEnv: { attack, decay, sustain, release, amount },
  lfo1: { shape, sync, rate, division, phase, delay, retrigger },
  lfo2: { shape, sync, rate, division, phase, delay, retrigger },
  mod: [ /* zero to six validated matrix slots */ ],
  master: { gain, drive }
}
```

Implement defaults, validation, migration from the current prototype shape, deep snapshot
and unknown-key diagnostics. An invalid table ID falls back to `basic` with a visible
development warning; it must never poison audio with NaN.

**Amended 2026-08-17 (product decision): the release target is the whole bank, not 28.**
The original spec's 28 is superseded. Every TNGR-2 entry in the tree ships, currently 43
across Bass, Lead, Pad, Keys, Pluck, Bells and Orch/FX — 42 at the time this document
was written, plus `memoryOrgan2`. The count is no longer a target to hit; what is
mandatory is that every shipped preset is MEASURED, which is where the bank presently
falls short: the 15 conventional-instrument presets and `memoryOrgan2` still carry
placeholder `level: 0` / `peak: 1`, and `tngrBlueCathedral` carries a measurement its
own render no longer matches. `tests/voices.js` fails on exactly those and is the list
to work from.

Factory measurement must run through the real engine at the intended measurement note,
record non-placeholder `level` and `peak`, and verify every preset twice for deterministic
output.

## 9. Editor and interaction requirements

### 9.1 Quick editor

Retain the existing Quick panel, but ensure its macros write real engine paths and expose
the active baseline:

- Position
- Motion
- Brightness
- Attack
- Release

Quick changes must update Advanced values and remain live on sounding notes where the
parameter is continuous.

### 9.2 Advanced editor

Add all missing controls, grouped as:

- Osc A and Osc B: table picker, waveform/spectrum preview, position, env/LFO amounts,
  octave, semitone, fine, level, pan, phase, phase mode, unison, spread, stereo.
- Motion: position ADHSR, LFO1, LFO2, tempo/free rate, phase, delay, retrigger.
- Modulation: six matrix slots with source/destination/amount/curve/enable.
- Filter: type, cutoff, resonance, key tracking, bipolar envelope, drive and full filter
  envelope.
- Amp/voice: full ADSR, master gain/drive, mode and glide.

Table selection must support search, preview, commit and cancel. Preview must not mutate
the saved patch until committed. Controls require keyboard focus, accessible names,
focus-visible styling and useful tooltips. Preserve the existing shared editor and deep
copy/duplicate semantics.

## 10. MASHENSTEIN integration

Implement and test the following seams:

1. Dispatch TNGR-2 to the controller/worklet before the Tone allowlist.
2. Keep `TNGR-2` and compact `TN2` labels unchanged.
3. Create/destroy one node per lane/context and connect it through existing dry/wet lane
   routing and effects.
4. Register processor and table assets in dev, production, PWA/offline cache and any
   real-engine playground. Cache hashes must change when either processor or tables
   change.
5. Ensure Bounce, range render, stems, freeze, visualizer audio and note-cache decisions
   either use the shared DSP renderer or explicitly choose an uncached path. A cache must
   never replay the wrong patch revision.
6. Verify lane stems equal the equivalent mix contribution within the project tolerance.
7. Verify a range render beginning after bar zero matches that range extracted from a
   full render, including synced LFO and seeded phase behavior.
8. Add teardown for transport stop, song switch, context replacement, preset switch,
   editor close and panic.

## 11. Diagnostics and budgets

Expose development diagnostics, preferably through Loop Diagnostics:

- active and releasing notes per lane;
- oscillator streams after unison expansion;
- event queue depth;
- late-event count and worst lateness in frames;
- processor render-quantum peak/average time or safe overload count;
- non-finite/stability guard count;
- installed table bytes and manifest hash;
- voice-steal count;
- current patch ID/revision and transport generation.

Initial 48 kHz targets on a representative Apple desktop browser:

- one lane, eight held notes, two oscillators, unison 1, both LFOs and filter: below 5%
  of one audio-render thread;
- four such lanes: below 20%;
- worst 16-note/unison-4 patch must not underrun;
- no steady-state processor allocations;
- factory table memory below 12 MiB decoded unless measured and documented otherwise.

Measure at least one Apple desktop browser and one representative mobile/browser. Report
method, sample rate, browser, device and patch. Offline render wall time is not a live CPU
percentage.

## 12. Required verification

### 12.1 DSP/table tests

Cover:

- correct phase increment at 44.1 and 48 kHz;
- cyclic sample and frame interpolation continuity;
- exact position 0/1 endpoints;
- mip selection with no above-Nyquist harmonics;
- finite, zero-DC, correctly sized, cyclic and hash-stable tables;
- symmetric unison detune and chosen normalization;
- ADSR/ADHSR stages, note-off and legato transfer;
- stable filter at maximum modulation/resonance;
- repeatable seeded phase and sample-and-hold independent of prior playback;
- bounded anti-click voice stealing and panic;
- schema defaults, validation, migration and invalid-table fallback.

### 12.2 Browser/offline tests

Add focused tests for:

- the complete Worklet proof at 44.1 and 48 kHz;
- delayed first note (`t > 0`) and non-silent output;
- all 28 release presets, measured level/peak and deterministic double render;
- poly chord, mono retrigger, legato glide, keyboard hold and scheduled release;
- live parameter edits and structural patch revision behavior;
- stem/mix sum parity;
- range-after-bar-zero parity;
- stop, panic and song switch with no old tail or queued event;
- production build and offline/PWA asset loading.

### 12.3 UI/persistence tests

Cover table picker search/preview/commit/cancel, every stored parameter having an intended
editor control, Quick/Advanced round-trip, duplicate independence, JSON/song persistence,
modulation-array retention, accessible names/focus, narrow layout and no duplicate or
unplaced Advanced controls.

### 12.4 Evidence commands

Run the focused TNGR tests, relevant voice/editor/export suites, production build,
served-shell checks where applicable and `git diff --check`. Run the full suite when
practical and name unrelated failures precisely. Restart the dev server after builder or
template changes. Report source/test/build evidence separately from browser, device and
musical listening evidence.

## 13. Implementation order

Keep each stage buildable and leave a focused regression behind it:

1. Worklet proof and teardown proof.
2. Pure DSP skeleton and deterministic offline renderer using the same core.
3. Table generator, 16 families, 32-frame assets, mips, manifest and hash validation.
4. One-oscillator DSP, phase/interpolation and amp envelope.
5. Two oscillators, 16-note allocator, poly/mono/legato, unison and seeded phase.
6. Position ADHSR, LFOs, six-slot matrix, stereo filter, key tracking and drive.
7. Controller/VoiceRack integration, routing, offline exports, cache and lifecycle.
8. Schema migration and editor controls, Quick first and Advanced second.
9. Preset migration, exact release bank, measurement and audition.
10. Diagnostics, desktop/mobile performance, PWA/offline verification and listening QA.

Do not spend the remaining effort polishing native `PeriodicWave` crossfades while the
proof gate, shared DSP core and event protocol are absent.

## 13a. Where the work actually stands (2026-08-18)

Stages 1–8 are built, tested and verified. Stages 9 and 10 are complete except for the
two things that are not mine to do: the decision to switch, and the listening.

**Built and passing.** `tests/tngr2-worklet-proof.js`, `tngr2-dsp.js`, `tngr2-tables.js`,
`tngr2-schema.js`, `tngr2-dsp-parity.js`, `tngr2-controller.js`, plus the pre-existing
`tngr2.js` and `tngr2-audio.js`. All registered in `tests/run-all.js`; full suite green.

**The switch is OFF.** `VoiceRack.setTngr2Worklet(true)` moves TNGR-2 onto the worklet;
`warmTngr2Lane` prepares a lane ahead of the notes that use it, and any lane not yet ready
plays natively, so the switch is safe to flip mid-song. The default is off because **the
worklet is a different synthesis engine from the native path**: flipping it changes what
all 43 presets sound like, every one of which carries a level and peak measured against
the native path, and songs on the desk have been mixed against it. §2 and §14 both say the
native path stays until the replacement has passed its listening gate.

**CPU, measured** (`work/local/tngr2-bench.mjs`, 8-second offline renders at 48 kHz, best
of three, Apple desktop Chromium). Reported as a share of one audio thread estimated from
offline wall time — §3.2 forbids calling that a live figure:

| case | native | worklet | change |
| --- | --- | --- | --- |
| 8 held notes, 2 osc, unison 2 | 4.63% | **3.57%** | 1.30× |
| 4-note pad chord | 2.33% | 1.93% | 1.21× |
| 16th-note bass line (64 notes) | 2.56% | **0.66%** | **3.85×** |
| 16 notes, unison 3+2 (worst case) | 9.83% | 7.71% | 1.28× |

Against §11's targets: eight held notes **3.39% < 5%** ✓; four such lanes ≈ **13.6% < 20%**
✓; the worst case does not come close to underrunning ✓. The 16th-note line is where the
architecture pays off — the native path builds a graph per note, so its cost scales with
note density, while the worklet's scales with voices sounding.

**§10.4, asset registration: there is nothing to register.** The processor is loaded from a
Blob built out of the bundle (see `proof.js` for why), and the tables are 96 KiB of spectra
inside the bundle. No second build output, no service-worker cache entry, no manifest hash
to keep in step, and no cross-origin isolation — so the PWA needs no change and cannot
serve a stale processor against fresh tables.

**Diagnostics** (§11) are on `VoiceRack.runtimeHealth().tngr2` — worklet on/off, controller
lanes, families, table bytes, plus the native path's poly lanes/voices and wave-cache size
— and on the core's own `health()`: active voices, oscillator streams after unison
expansion, queue depth, late-event count and worst lateness in frames, voice steals,
non-finite guard count, bad table count, bad mod slots.

### Outstanding, and why

1. **Listening across a full mix** (§14). The A/B pass covered six presets in isolation;
   what no test can sign off is how the bank sits inside songs that were balanced against
   the native path. `barber-7` is the first to check — it uses `tngrBlueCathedral`.
2. ~~Re-measuring the 43 presets~~ — **done**. All 43 levels and peaks now describe the
   worklet. Only those 43 entries were rewritten: a full `measure-voices` run also
   "corrects" 83 unrelated presets whose stored numbers had drifted, which is a
   library-wide loudness change and a separate decision.
3. **A pre-existing measurement gap, not caused by this work**: one preset carries
   a stale measurement: `tngrBlueCathedral` predicts a peak its own render does not
   produce, and measures about 16 dB out. The 15 conventional instruments that carried
   placeholder `level: 0` / `peak: 1` have been filled (`measure-voices.js --fill`).
4. **Mobile CPU** (§11 asks for one mobile browser). Measured on Apple desktop only.

## 14. Definition of done

TNGR-2 is complete only when all of the following are evidenced:

- AudioWorklet live/offline proof passes, or a formally documented same-DSP fallback
  passes the identical parity requirements.
- No per-note native oscillator graph is used by the final TNGR-2 path.
- Tables are generated, band-limited, hashed, provenance-recorded and tested.
- Full oscillator, modulation, envelope, filter, schema and editor contracts are live.
- Live, preview, sequencer, Bounce, stems, range render, freeze and offline/PWA work.
- Repeated renders are deterministic and stems sum to mix.
- Exactly 28 measured release presets ship, or the product owner has amended the count.
- Cleanup, diagnostics and performance budgets are measured.
- Focused tests, relevant regressions, production build and diff checks pass.
- Listening covers bass, leads, four-note pads, bells, synced movement, range renders and
  a representative full mix on the supported browser/device matrix.

If any item is unverified, report it as outstanding rather than calling TNGR-2 finished.

## 15. Required handoff report from the implementing model

The implementing model must finish with:

1. Files changed and why.
2. Which completion stages passed.
3. Commands run and their results.
4. Browser/device/sample-rate performance measurements.
5. Live listening coverage and anything not auditioned.
6. Any remaining divergence from this document, with a proposed follow-up—not a claim of
   completion.
