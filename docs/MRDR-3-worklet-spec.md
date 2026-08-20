# MRDR-3 worklet backend — specification seed

Approved in principle 2026-08-20 ("no problem with an audio worklet if it is going to
be more CPU efficient"). This is the seed for the full spec, written while the
evidence is fresh; it follows the pattern that made TNGR-2 dependable
(`docs/TNGR-2-completion-spec.md`) and cites the measurements that justify the project
(`docs/audio-performance-2026-08.md`).

## 1. What this is, and is not

**It is a backend swap.** The subtractive model the user sees — oscillators into a
filter into a VCA, three layers, one global stage — is untouched. Every panel, every
pot, every preset key keeps its name, range and meaning. A user who understands
MRDR-3 today understands it after.

**It is not a preset migration.** Converting presets to TNGR-2's wavetable model was
considered and declined: users think in subtractive terms. That decision stands and
this project is its complement, not its reversal.

## 2. Why (the measured case)

- Per-note native graphs cost ~10× what TNGR-2's worklet costs on dense material
  (0.52% vs 7.79% of a core for the same 16th-note line).
- The August campaign built FOUR layers of machinery purely to manage per-note graph
  cost: the note cache, cost-aware planning, the playback trickle (three brakes), the
  prepared-start flow and pause-to-catch-up, plus a 320 MB capacity raise. Every
  fragile live moment of that campaign — cache thrash, audible warm-ups, cold
  restarts, and glitches when swapping presets or dragging pots on a heavy song —
  lived in that machinery or in the per-note builds it compensates for.
- A worklet has none of it: flat deterministic cost per voice, no cache, no warm-up,
  no invalidation. A pot drag is a message to the processor, not a graph rebuild.
- Bounces always synthesize (a bounce must be the synthesis, not a recording of it),
  so offline render time gets MRDR's share back too (~18% on smw-class songs).

## 3. Architecture (the TNGR-2 pattern, proven)

- **One DSP source string** (`src/engine/mrdr3/dsp.js` as a template literal),
  evaluated by BOTH a Node reference renderer and the browser AudioWorklet. One copy
  of the maths; the parity test compares the two hosts at zero tolerance.
- **Block-size agnostic, absolute-frame scheduling** — 128 vs whole-buffer renders
  must be sample-identical (this is what makes stems sum to the mix).
- **No Tone, no DOM, no context globals in the DSP string** (purity test, as TNGR-2's).
- **A preset hash oracle** from day one (`tngr2-null-oracle.mjs` pattern): once a
  preset's worklet rendering is ear-approved, its hash pins it.
- **Main-thread compile**: presets compiled to flat numeric patches off the audio
  thread, installed by message (TNGR-2's `installCompiledPatch` pattern).
- One persistent node per lane, events posted with absolute frames; mono/legato/glide
  handled in-core (TNGR-2 already solves all of these — steal the solutions).

## 4. DSP inventory (what per-sample code must cover)

From `_playLayer` as it stands. Items marked ✦ get EASIER or more exact per-sample
than the native-node construction they replace.

- Three layers; per-layer: waveform (sine/tri/saw/square/pulse/noise), ratio, detune,
  gain, own ADSR or `vca:'through'` gate, delay/len scheduling, per-layer filter
  (1/2/4-stage SVF), key-followed like today.
- Unison (≤ MAX_UNISON) with spread and stereo placement; equal-power law as today.
- ✦ Moving PWM — per-sample duty is trivial (no two-saw + a-rate delay trick, no
  duty-in-seconds reciprocal glide correction; duty is just a comparator threshold on
  band-limited pulses — use polyBLEP or a mip table for band-limiting).
- ✦ Hard sync (1+2, 1+3, 1+2+3) — exact phase reset per master cycle, replacing the
  32 ms grain-crossfade approximation entirely. `syncBend` stops being special.
- FM operator per layer, as today.
- Noise layers from the SEEDED stream (determinism: same rule as the native path).
- Global stage: 1/2/4-stage SVF with keyTrack (per chord tone — cheap in-core), global
  VCA ADSR; drive (soft/fold/crush) + tone as TNGR-2 spells them (shared card).
- Vibrato with the FROZEN ensemble semantics (fixed-seed spread phases and entry
  stagger — see `MRDR_ENSEMBLE_JITTER`); routable LFO incl. deterministic samplehold.
- Pitch envelope, glide with duty-stable behaviour, mono/legato/poly key modes,
  humanize hooks present but reading zero (matching the frozen-jitter decision).
- Amp envelopes floored (the denormal lesson is free in a worklet — flush manually).

## 5. Migration and approval

- Sound CANNOT cross bit-exactly — different primitives. Every one of the 68 presets
  needs ear approval, in batches, with levels re-measured (`tools/measure-voices.js`)
  and A/B renders per batch (the campaign's A/B tooling all applies).
- Per-batch cutover: a preset renders on the worklet only once approved; unapproved
  presets keep the native path. Both paths coexist behind the same `synth: 'MRDR-3'`
  until the last batch lands.
- Null-test baselines re-render per approved batch, by ear, as with every audible
  change in the campaign.

## 6. What retires at the end (not before)

The note cache and its state, cost-aware planning, the trickle and its brakes, the
prepared-start budget machinery, pause-to-catch-up, the 320 MB caps, the idle-pool
reaper's MRDR involvement, `estimateMrdrEventCost`, the MRDR tail-culling telemetry.
Each removal is its own small, test-gated change. The Tone pool path (other synth
families) is unaffected and keeps the cache if it still earns it there.

## 7. Acceptance gates

- Host parity: worklet vs Node reference, zero tolerance, both sample rates, incl.
  voice stealing, glide, sync, PWM — TNGR-2's parity suite shape.
- Purity scan of the DSP string; block-size invariance; determinism (two renders,
  one file).
- The oracle green over all approved presets; `MASH_NULL_ALL` null test green after
  each batch's baseline re-render; the desk's browser suites run explicitly.
- A live soak on the desk: preset swaps and pot drags DURING playback on a heavy song
  must not glitch — that is the symptom this project exists to remove, so it is the
  headline acceptance test.

## 8. Phasing (each phase independently verifiable)

1. Spec completion + parity harness + oracle skeleton (empty core passing).
2. Core voice: one layer, saw/square/sine/tri, global SVF + VCA, poly + stealing.
3. Layers, unison/spread/stereo, pulse + PWM, noise, FM, pitch env.
4. Hard sync (exact), LFOs, vibrato frozen-ensemble, glide/mono/legato, drive/tone.
5. Batch conversions with ear approval; dual-path routing.
6. Retirement of the cache machinery; campaign doc updated with the after-numbers.
