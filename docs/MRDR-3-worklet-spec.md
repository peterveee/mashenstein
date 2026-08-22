# MRDR-3 on an AudioWorklet backend — implementation specification

Approved in principle 2026-08-20 ("no problem with an audio worklet if it is going to be
more CPU efficient"). This is the full specification, grown from the seed written the same
day. It follows the pattern that made TNGR-2 dependable
(`docs/TNGR-2-completion-spec.md`) and cites the measurements that justify the project
(`docs/audio-performance-2026-08.md`, `work/local/mrdr3-anatomy-findings.md`).

Every census number below was counted from `src/data/voices.js` as it stands
(68 MRDR-3 presets, 181 distinct preset key paths). Re-count before trusting any of them
after a library change; the counts decide what gets built and in what order.

---

## 0. Handover status at the time of writing

*Updated 2026-08-20, end of Phase 2.*

- **Implemented:** native `MRDR-3` in `src/engine/voices.js::_playLayer` and everything
  around it. **Phases 0-2 of this document:** `src/engine/mrdr3/{identity,proof,params,
  primitives,osc,tables,dsp,worklet,compile}.js`, the dev view in `src/dev/mrdr3-aw.js`,
  and the suites `mrdr3-{worklet-proof,identity,primitives,params,osc,dsp-parity}.js`.
  The core renders one layer through an optional global stage, with poly allocation and
  group-aware stealing.
- **Measured, and the numbers that matter:** Tier-A ports agree with the real nodes to
  <=7e-8 (biquad/shaper/panner) and <=3e-7 (the automation timeline). Chromium rebuilds
  biquad coefficients PER SAMPLE — per-block is 430,000x further from the node. The
  worklet and the Node reference renderer are **sample-identical** at both rates,
  including a lane pushed past its pool. Phase 0's cost proof is in
  `work/local/mrdr3-phase0-verdict.md` with its contingency stated.
- **Approved by ear (2026-08-20):** the 15 presets the core renders as authored, A/B'd
  against `_playLayer` in `work/auditions/mrdr3-ab/` — "those sound totally fine across
  the board". Pinned at both rates by `work/local/mrdr3-null-oracle.mjs`. This is a
  Phase 2 smoke set, NOT one of §3.5's batches; those still require their own approval
  with level re-measurement.
- **Not implemented:** the other two layers, unison, PWM, noise, FM, hard sync, the LFOs,
  vibrato, glide, mono/legato and drive (Phases 3-4); the lane controller and therefore
  `setMrdrComparisonBackend`, which needs a dispatch path inside `VoiceRack`; the §3.2
  refactor of the engine's envelope builders into shared host-neutral form.
- **Unverified:** that the COMPLETE core is materially cheaper — Phase 0 benched a spike,
  not this; browser/device support beyond headless Chromium; and every listening claim
  about a preset outside the 15 above.

This document is an implementation/acceptance specification, not evidence that an AW
prototype exists or that the migration is complete.

## 1. What this is, and is not

**It is a backend swap.** The subtractive model the user sees — oscillators into a
filter into a VCA, three layers, one global stage — is untouched. Every panel, every pot,
every preset key keeps its name, range and meaning. The end state is one engine,
`synth: 'MRDR-3'`, rendered per-sample. A player never learns that anything changed.

**`MRDR-3 AW` is scaffolding, not a product.** A second dispatch identity exists during
the project so both renderers can sound in the same song, on different lanes, at the same
time — which is the only way to compare them properly, and is more than a global override
can do. It is dev-only, it is never offered to a player, and **removing it is a required
deliverable of the last phase** (§1.1, §12).

**It is not a copied preset library.** There is one canonical MRDR payload per patch. The
test identity selects the renderer; it never forks the sound-design data. No `-aw`
preset copies are checked in, ever.

**It is not a preset migration.** Converting presets to TNGR-2's wavetable model was
considered and declined: users think in subtractive terms. That decision stands and this
project is its complement, not its reversal.

**It is not a sound redesign.** Two things change audibly because the native path only
approximates them (§3.4). The new implementations are intended to be better, but that is
a hypothesis until they pass the named listening gates. Everything else is a fidelity
target.

### 1.1 The scaffold rule

The game has no players yet and no saved songs outside this repository, so this project
owes nothing to backward compatibility. That is what keeps it small: no load migration,
no engine picker, no user-facing choice, no versioned patch format. Say so here because
the absence of those things is a decision, not an oversight.

Three constraints hold the scaffold in place:

- **It cannot ship.** `MRDR-3 AW` never enters `VOICES`, never appears in a player-facing
  picker, and never lands in a tracked song under `src/data/`. It rides a dev-only view —
  the same seam `src/dev/` gives proposed heroes — and a test in `tests/mrdr3-identity.js`
  asserts that no factory preset and no tracked song carries `synth: 'MRDR-3 AW'`.
- **It is comparison surface, nothing more.** Test songs that use it live under `work/`.
  Bounce and stems honour the identity so an A/B render is real, and that is the whole
  persistence requirement — no undo semantics, no badges, no URL contract.
- **It is deleted when the last batch is approved.** At that point `synth: 'MRDR-3'`
  dispatches to the worklet, `_playLayer` goes, and the identity goes with it. There is
  no world in which both survive; see §9.4.

## 2. Why (the measured case)

- Per-note native graphs cost ~10× what TNGR-2's worklet costs on dense material
  (0.52% vs 7.79% of a core for the same 16th-note line).
- The August campaign built FOUR layers of machinery purely to manage per-note graph
  cost: the note cache, cost-aware planning, the playback trickle (three brakes), the
  prepared-start flow and pause-to-catch-up, plus a 320 MB capacity raise. Every fragile
  live moment of that campaign — cache thrash, audible warm-ups, cold restarts, and
  glitches when swapping presets or dragging pots on a heavy song — lived in that
  machinery or in the per-note builds it compensates for.
- AW has none of the **rendered-note-cache** machinery: cost is predictable per active
  oscillator/filter slot, with no note-cache fill or invalidation. It still has an
  explicit module/table/patch warm-up before transport (§6). A pot drag is a bounded
  parameter message to the processor, not a graph rebuild.
- Bounces always synthesize (a bounce must be the synthesis, not a recording of it), so
  offline render time gets MRDR's share back too — 18% on smw-class songs, the largest
  single synth family in the standing-graph census.

### 2.1 Where the native cost actually is

From `work/local/mrdr3-anatomy-findings.md` (one axis at a time, 12 s of dense material,
best of 3, base case 14.62 ms/audio-s):

| component | marginal ms/audio-s | what the worklet pays instead |
| --- | --- | --- |
| moving PWM on one layer | **+35** — the dearest feature measured | one pulse loop + two edge corrections (§3.4) |
| one extra layer | +14 first, +5 after | one more oscillator loop |
| one biquad stage (global, per chord tone) | +6.6 | ~10 flops/sample/channel |
| one layer-filter stage | +5.8 | same |
| one extra unison oscillator | +5.0 | one table lookup + lerp |
| stereo placement per unison voice | +3.1 | two multiplies |
| release 0.12 → 1.2 s (overlapping tails) | +5.4 | voices already allocated |
| keyTrack 0 → 0.6 | +0.04 — free | free |

The native numbers are **node-graph overhead**, not arithmetic: per-node dispatch,
per-quantum AudioParam handling, allocation and the GC behind it. That is what a worklet
deletes, and it is why the dearest native feature (PWM, 13 presets) becomes one of the
cheapest per-sample ones.

## 3. The fidelity strategy

This is the part the seed did not have, and it is what decides how much of §9's ear
approval is real work. The claim is narrow and testable: **most of MRDR-3's signal path is
built from Web Audio nodes whose normative transfer/automation behavior is specified, so
the port has a formula-level reference rather than only a listening description.** This
does not waive listening: implementation precision, oscillator band-limiting and the two
deliberate redesigns can still change a preset.

### 3.1 Tier A — normatively specified; port the formulas, then measure implementation drift

| native construction | where MRDR-3 uses it | what the spec fixes |
| --- | --- | --- |
| `AudioParam` automation: `setValueAtTime`, `linearRampToValueAtTime`, `exponentialRampToValueAtTime`, `cancelAndHoldAtTime` | every envelope and ramp in `_playLayer` | the value formula at every instant, and the intrinsic-value + summed-input rule |
| `BiquadFilterNode` | layer filters, global filter, the noise bandpass, the drive TONE filter | the Web Audio transfer function and coefficient formulae per type, `detune` as `f · 2^(d/1200)`, zero initial state |
| `WaveShaperNode`, `oversample: 'none'` | the drive shaper (MRDR sets no oversample) | index map `(N−1)/2·(x+1)`, linear interpolation, clamp outside [−1,1] |
| `StereoPannerNode` | unison stereo placement | the equal-power sin/cos law |
| `GainNode` | everywhere | a multiply |
| `ConstantSourceNode` | the sample-and-hold LFO | a constant plus automation |
| `AudioBufferSourceNode`, `loop`, rate 1 | noise layers | sample-for-sample playback at the context rate, including the same loop boundary |

Normative reference: the [Web Audio API specification](https://webaudio.github.io/web-audio-api/),
especially AudioParam value computation, Biquad filter characteristics, WaveShaper
interpolation and StereoPanner processing. Pin the spec snapshot/date used by Phase 2 in
the primitive-test evidence so a later standards change is visible.

“Specified” does not mean “bit-identical to Chromium”. A conforming browser may use a
numerically different but equivalent filter form, coefficient precision, or state update
order. The Worklet and Node reference must be bit-identical because they run the same
core; the custom primitives and the native nodes are compared with measured tolerances
and frequency/impulse-response bounds in `tests/mrdr3-primitives.js`. Do not widen a
tolerance merely until a test passes: record the maximum error, the tested browser build,
sample rate, modulation case and audible result.

### 3.2 The automation timeline — the single most load-bearing decision

Build a `ParamTimeline` in the DSP core: an object that accepts **the same logical
automation event list** the native path writes, and evaluates it per sample using the
specified formulas, plus a summed modulation input.

The point is not economy of code. It is that `adsr`, `gateAdsr`, `centsEnv`,
`gateCentsEnv`, `filterEnv`, `pitchEnv`, `pitchRamp` and `releaseNow` are *already* pure
functions from a preset section to a list of param events — including all the tuning
nobody wants to re-derive: `gateFloor`'s per-frequency minimum attack, the exponential
hand-over at 1e-4 that keeps the authored curve while removing the crawl along the bottom,
the −120 dB sustain floor from the denormal fix, `attackCurve: 'lin'`, and the
`cancelAndHoldAtTime` mono choke sized to a cycle and a half of the note being cut.

**Refactor those functions into host-neutral event builders.** They accept an abstract
start/duration domain and return ordered logical events. The native adapter supplies
seconds and writes them to an `AudioParam`; the AW controller supplies absolute integer
frames/durations, and the core invokes the same builders when a note, release, choke or
LEGATO retarget is applied. No seconds-to-frames conversion occurs in the core. The
formula and event ordering are shared, not the host object. This is more precise than
making `ParamTimeline` pretend to be an `AudioParam`, and it permits the native renderer
to remain unchanged at its boundary.

Envelope construction therefore has one authored implementation, but still needs
numeric regression coverage: rounding event times to frames, browser handling at equal
timestamps, and `cancelAndHoldAtTime` can expose edge differences even when the intended
curve is shared.

**The refactor itself is a change to the shipping engine and is gated as one.** Turning
`gateAdsr` and its siblings into builders-plus-a-native-adapter rewires the hot path of
every native MRDR-3, drum and Additive note, before the worklet exists to benefit. It
lands as its own commit, and the gate is `tests/null-test.js` **byte-identical** — no
re-render, no re-approval, the same WAVs. If the refactor cannot pass that, it was not
the mechanical change this section claims it is, and that is worth knowing in Phase 2
rather than in Phase 5.

Requirements on the timeline:

- `write(kind, frame, value, extra)` accepting `setValue`, `linearRamp`,
  `exponentialRamp`, `setTarget`, `cancelScheduled`, and `cancelAndHold`; events remain
  stable-sorted by `{frame, insertionOrder}`; `valueAt(frame)` follows the Web Audio
  automation rules. `setTarget` is there because the builders are SHARED: `pitchRamp`'s
  `snap` curve emits it (drums today, one vocabulary tomorrow), and the live filter walk
  in `_walkLiveFilters` is an 8 ms `setTargetAtTime` slew that an AW `param` event must
  reproduce — a pot drag that slides on native and ticks on AW would fail the A/B for a
  reason that has nothing to do with synthesis.
- `valueAt(frame)` is the only current-value read in the core. `releaseNow` snapshots it
  at the release frame before it cancels/replaces future events; it must not read a
  main-thread `.value` that describes a different render instant.
- A summed modulation input: `computed = automation + Σ inputs`, which is the rule the
  vibrato-into-`.detune` and LFO-into-`.detune` connections rely on.
- Times converted to integer frames **once, at the controller boundary** (TNGR-2's
  `frameAt` rule), never inside the core.
- Boundary tests for: two events at one frame; a ramp whose endpoints quantise to one
  frame; cancel during every envelope stage; exponential endpoints at/below zero;
  note-off on the same frame as note-on; and release of a held LEGATO note after a
  retarget.

### 3.3 Tier B — not specified, but the machinery already exists

`OscillatorNode` band-limiting is the one primitive the spec does not pin down. Chromium
builds a pyramid of band-limited tables from the wave's Fourier coefficients and
interpolates between the two bracketing the note. That is *exactly* the machinery TNGR-2
already ships and already parity-tests — `tools/build-tngr2-tables.js`,
`src/engine/tngr2/tables.js`, and the mip lookup in `dsp.js`.

**Reuse it, feeding it MRDR-3's own coefficient sets, which are already in code:**

- `phasedWave`'s four classic series (sine, square, sawtooth, triangle) — the same series
  Chromium uses for the four built-in types.
- `pulseTable`'s rectangle series, including the φ = πd rotation that slides the plateau
  to start at phase 0 and removes the note-on tick.
- `hardSyncTable`'s numerical projection, for the static-sync case.

Two things must be reproduced or levels shift: Chromium's **peak normalisation** of a
`PeriodicWave` built with `disableNormalization: false` (which every MRDR table is), and
smooth selection between adjacent mip levels. Do not freeze the mip pair at note-on:
glide, pitch envelope, vibrato and FM can move the instantaneous frequency across a mip
boundary. The implementation may select/crossfade per sample, or conservatively select
per control block using a proven maximum-frequency bound, but `tests/mrdr3-dsp.js` must
sweep every modulation source across every mip boundary without a level step or an
out-of-band partial above the stated tolerance.

Noise is Tier B only in that its buffer has to travel: `Audio` seeds the 0.5 s and 2.5 s
buffers for offline renders and uses `Math.random()` live, so the processor cannot
regenerate them and still match the native side/session. Hand over only the colour/length
variants the compiled patch needs: at 44.1 kHz one mono Float32 buffer is about 88 KiB
short or 431 KiB long, before structured-clone copies. The colouring (`_noise`'s
pink/brown/blue/violet filters and RMS renormalisation) is done on the main thread and
handed over already coloured, the same rule as TNGR-2's “the processor never builds a
table”. Track installed noise bytes per context/lane and include them in the memory soak.

### 3.4 Tier C — deliberately different, and better

Two constructions exist only because native nodes could not do the thing directly. Both
disappear, and both change the sound of the presets that use them.

**Moving PWM — 13 presets, 27 oscillators.** Today: `pulse(t) = saw(t) − saw(t − Δ)` with
`Δ = duty / f(t)`, which needs two oscillators, a delay line, an inverter and a sum per
unison voice; needs the reciprocal glide correction so a glided note does not start at the
wrong width; needs the 0.249 s delay-line clamp; and at duty 1.0 the two saws cancel and
the layer drops out. Per sample the duty is a comparator threshold on the phase, so the
whole apparatus goes: the glide correction becomes unnecessary rather than exact, the
clamp becomes unnecessary, and the cancellation cannot happen. A raw comparator is not
acceptable—it aliases. Band-limit with correction at **both** discontinuities (polyBLEP/
minBLEP), or by interpolating a duty-aware mip representation; decide by the Phase 3
alias, CPU and listening measurements. The sweep must include duty 0.05, 0.5 and 0.95,
the top supported note, fast duty modulation and a glide while PWM is moving.

**Hard sync — 5 presets.** Today: static sync is one projected `PeriodicWave` at the
master frequency; sync *with* a pitch envelope (`syncBend`) is 32 ms grains, each its own
oscillator with its own projected table, crossfaded over 4 ms. Per sample, hard sync is
`if (masterPhase wrapped) slavePhase = 0`, exact, and `syncBend` stops being a special
case at all — the slave ratio simply follows the envelope. A raw slave reset also aliases,
so correct reset timing and band-limiting are separate gates: correct the reset
discontinuity (BLEP or an equivalently measured method) without smearing its intended
edge. This removes `hardSyncTable`, the grain loop, `pitchEnvValue`'s sync-boundary
sampling, and the `SYNC_TABLE_CACHE` only after the new path passes both gates.

The 13 PWM and 5 hard-sync sets do not overlap in the current catalogue, so these are 18
distinct high-risk presets today. Re-run the census before batching. **All 68 presets
still require an A/B listening decision**; the distinction is depth, not permission to
skip. The other 50 may use a shorter sweep if their numeric, level and spectral gates are
green.

### 3.5 What the ear must approve, and in what order

| batch | presets | why it changes | risk |
| --- | --- | --- | --- |
| 1 — moving PWM | 13 | Tier C, by construction | high; the biggest audible delta |
| 2 — hard sync | 5 | Tier C, by construction | high; `syncBend` is a new sound |
| 3 — noise layers | 7 (incl. all six strings) | buffer + bandpass port; should be near-exact | low, but barber-96 depends on it |
| 4 — unison/stereo-heavy | 28 with unison > 1 | mip-table difference multiplied by 4 detuned voices | medium |
| 5 — everything else | remainder | oscillator band-limiting only | low |

Levels are re-measured per batch with `tools/measure-voices.js`; the `peak` and `level`
keys are part of the preset and a change to either is a mix change.

## 4. Source architecture

Ownership mirrors `src/engine/tngr2/`, for the reason §4 of the TNGR-2 spec gives: an
`AudioWorkletProcessor` cannot import the modules around it, so the core is **one source
string**, evaluated by Node for the reference renderer and concatenated into the processor
for the browser. One string cannot drift from itself.

```text
src/engine/mrdr3/
  identity.js            the two dispatch IDs + `isMrdrSynth` / `isMrdrVoice`; main thread only
  dsp.js                 MRDR3_DSP_SOURCE — the whole per-sample core, as a template
                         literal; plus `renderMrdr3()`, the Node reference renderer
  params.js              ParamTimeline (§3.2) — also a string, concatenated ahead of dsp
  primitives.js          the Tier-A ports: biquad, shaper, panner — string, as above
  worklet.js             the thin processor wrapper + `ensureMrdr3Dsp` / `createMrdr3Node`
  controller.js          lane/context lifecycle, the event bridge, frame conversion
  compile.js             preset → flat numeric patch, on the main thread
  tables.js              MRDR's coefficient sets fed through TNGR-2's mip pipeline
tests/
  mrdr3-worklet-proof.js      the §12 proof gate, kept as a permanent regression
  mrdr3-dsp.js                browserless core tests + the purity scan
  mrdr3-dsp-parity.js         worklet vs Node reference, zero tolerance, both rates
  mrdr3-primitives.js         Tier-A ports vs a real OfflineAudioContext, per node
  mrdr3-compile.js            preset → patch, defaults, bypass, solo, migration
  mrdr3-identity.js           catalogue, persistence and exact-engine routing
  mrdr3-audio.js              lane behaviour, held notes, mono/legato, panic, teardown
work/local/
  mrdr3-worklet-bench.mjs     the Phase 0 cost proof
  mrdr3-null-oracle.mjs       SHA-256 of all approved presets at both rates
```

Rules carried over verbatim from TNGR-2 §4: `dsp.js` imports no DOM, no Tone, no
`VoiceRack`, no mixer or game state; the processor contains no second implementation of
any oscillator, filter or envelope mathematics; the controller owns registration and
scheduling and does not synthesize. `new Function` runs in Node only, so no page needs
`unsafe-eval`.

Do not spread new `voice.synth === 'MRDR-3' || voice.synth === 'MRDR-3 AW'` checks
through the tree. The current checkout has ~232 MRDR string references but only **17
exact equality guards** across engine/editor/tests, and the guards are the migration.
Introduce `isMrdrSynth` and `isMrdrVoice`, move family-level behaviour onto them, and
leave renderer dispatch as the one deliberate exact-identity branch. This is Phase 1
work, after the proof gate (§12).

## 5. The DSP core contract

### 5.1 The note group — the structural difference from TNGR-2

TNGR-2 allocates one voice per note. MRDR-3 cannot, and the reason is load-bearing and
documented in `_playLayer`: at POST placement **a chord's tones sum into ONE drive shaper
and intermodulate**, "which is much of what makes a stack read as one instrument". The
core therefore has two levels:

```text
note group  (one per note-on message)
  owns:  vibrato LFOs (1 shared, or up to MAX_UNISON with SPREAD > 0)
         the routable LFO (oscillator, or ConstantSource for sample-and-hold)
         the tremolo gain          (LFO target 'level')
         the POST drive: shaper + TONE filter
         the output gain           (gain × humanize fade; no tail-cull ramp — an AW
                                     voice frees itself when its envelope ends, §10)
  contains 1..N tone voices, summed before the tremolo

tone voice  (one per sounding chord tone)
  owns:  the global filter chain   (1|2|4 biquad sections, keyTrack from THIS note's hz)
         the global VCA            (gateAdsr over the drawn note length)
         the PRE drive, when drivePlace is 'pre' and a global stage exists
  contains up to 3 layers

layer       (osc1..osc3, after the gain>0 / bypass / solo filter)
  owns:  the layer gain            (gateAdsr, or the 'through' gate)
         the layer filter chain    (1|2|4 sections)
         one FM operator, fanned across the whole unison stack
         one PWM modulator (the layer's, not the voice's)
  contains 1..MAX_UNISON unison voices

unison voice
  the oscillator (or the noise source + tracking bandpass), its detune, its stereo
  placement, its 1/√count normalisation and — for noise — the bandwidth makeup
```

**Channel discipline.** Everything up to the `StereoPanner` is mono; everything from it on
is stereo. That is where the native graph goes stereo, and it is the cheap arrangement:
the unison oscillators are the bulk of the cost and stay mono, while the layer filter, the
global filter, the VCA and the shaper run two channels. A group with no panner anywhere
runs mono end to end and is duplicated at the lane output, which is what native up-mixing
does.

**Filter cascade quirk to port exactly:** `_filterChain` gives stage 0 the authored Q and
every later stage 0.7071; `slope: -48` → 4 sections, `-24` → 2, anything else → 1. MRDR
never passes `to`, so the `swept` branch is dead on this path and is not ported.

### 5.2 Allocation and stealing

The native path has no voice limit — it builds nodes. A processor has a pool, so a policy
is needed where there was none.

- **Budget in oscillator slots, not voices.** Cost scales with layers × unison, and the
  census spread is wide: `bestVowelPad` is 14 slots per note, `mrdrViolinSection` is 8,
  `initSquare` is 3. A flat `maxVoices` either starves the pads or over-allocates for the
  basses.
- Phase 0 must produce the initial `MAX_GROUPS`, `MAX_TONES` and `MAX_OSC_SLOTS` budgets
  for the named reference device. Store voices in preallocated typed/object pools; no
  array growth, object creation, string lookup, JSON parsing, table construction or
  message posting is allowed inside `process()`. A health report may snapshot counters
  only in response to a main-thread request.
- Steal order, following TNGR-2 §7.1: oldest released first, then oldest sounding; never
  steal a voice younger than one control period; a stolen voice fades over the same cycle-
  and-a-half rule the mono choke uses rather than stopping dead.
- Late events increment a diagnostic and apply at the first safe sample; they are not
  silently backdated.
- **The mono choke and glide origin move in-core.** `_last` is per
  `{laneKey, voiceId, preview}` and is read for `gated`/`fingered`/`glideFrom`; the whole
  FINGERED rule (a glide needs the previous note still *gated*, and `gateKey` outlasts
  `gateUntil` for a held preview) ports as core state, which finally makes it survive
  independently of the graph that used to hold it.
- Stealing is group-aware. Prefer freeing a complete released group. If a sounding group
  must lose capacity, fade/steal its oldest tone as a unit with all of that tone's
  layers; never remove one unison member or one layer and silently redesign the patch.
  Record group steals and tone steals separately, and freeze the final policy only after
  the Phase 4 barber-96 audition.

### 5.3 Determinism

- Same events → same samples, at both sample rates, at any block size (1, 128, 512, 997).
- The frozen ensemble stays frozen: `hitRandom` seeded from `ENSEMBLE_FIXED_TIME` rather
  than the note's time, so entry stagger and scattered vibrato phases are the same section
  every occurrence. `MRDR_ENSEMBLE_JITTER` remains a switch and remains off; the humanize
  hooks are present in the core and read exactly 1 while it is off.
- No `Date.now()`, no `Math.random()`, no context globals inside the core — the purity
  scan asserts this against the source text, as `tests/tngr2-dsp.js` does.
- A stem and the same lane inside the mix must be sample-consistent, which is why the
  noise buffer is handed in rather than generated.

## 6. Event protocol and the controller

Use one persistent `AudioWorkletNode` per `{audioContext, laneKey, scope}`, where `scope`
distinguishes song playback from isolated preview. It is not one node per note, chord,
preset or unison member. Patch revisions and note groups coexist inside that lane node;
the node connects once to the existing MRDR lane stage. Do not share a processor across
lanes: lane-local drive intermodulation, panic, stealing and stem isolation are part of
the sound contract.

Controller state is owned by a `WeakMap<AudioContext, ContextState>` as in TNGR-2. It
registers the module once per context, creates lanes lazily after explicit warm-up,
attaches one `processorerror` listener, and releases ports/nodes/listeners on lane removal,
song switch, panic generation, context replacement and context close. A diagnostic
comparison toggle may leave native tails and new AW notes overlapping on the existing
lane bus; it must not rebuild/cut the node to make the display change immediately.

The versioned protocol, following TNGR-2 §5 and its two amendments:

```js
{ type: 'installPatch', protocol: 1, patchId, revision, patch } // compiled, flat
{ type: 'installNoise', protocol: 1, manifestHash, buffers }    // only required colours/lengths
{ type: 'noteOn', protocol: 1, frame, eventId, patchId, revision,
  hz, velocity, durFrames, hold, spb, gateKey }
{ type: 'noteOff', protocol: 1, frame, eventId, gateKey }
{ type: 'param', protocol: 1, frame, patchId, revision, paramId, value, rampFrames }
{ type: 'panic',   frame, transportGeneration }
```

- **A chord is one message and one `eventId`.** The message creates one note group; its
  `hz` array creates the member tones, which is how they reach the same shaper. Do not
  send one message per chord tone and attempt to reconstruct simultaneity in the
  processor.
- **`durFrames` per tone**, because `dur` aligns positionally with the original chord and
  a mono preset keeps the *last* tone's own drawn length.
- For sequenced notes the core releases each tone from its own `durFrames`; `noteOff` is
  for held/interactive ownership, and a held chord releases **tone by tone**: a `noteOff`
  addresses the tone whose `gateKey` matches (the native path's per-tone
  `${laneKey}|${hz}` books, in protocol form), and one with no `gateKey` releases the
  whole group. `gateKey` also carries latest-key LEGATO ownership and must not be
  confused with the stable `eventId` used for determinism.
- **`spb`** rides on the note because the tempo-synced LFO rate is derived from it.
  `LFO_TEMPO_STEPS` is a compile-time table; zero presets currently use tempo sync, so
  this is protocol surface with no library behind it — build it, do not optimise it.
- **The port is for live interaction only.** Everything known before the first sample —
  the whole schedule for a bounce, stem, range render or freeze, and the patch and noise
  it uses — is handed to the node in `processorOptions` at construction. This is TNGR-2
  §3 finding (b) and it is not negotiable: port delivery is not ordered against
  `startRendering()` and silently loses the schedule.
- Offline follows `_collectTngr2`/`flushTngr2Offline` exactly, **including the counter
  that outlives the booking** — an event-id counter reset per flush stretch is the bug
  that sustained one French Horn note for the rest of a song.
- Notes bind to the exact `{patchId, revision}` named at note-on. The controller retains
  an installed revision until no active or queued event references it; it must never
  mutate the only patch object underneath an old tail. Continuous `param` events are
  applied to the addressed revision and may move its sounding notes; structural changes
  install a new revision and affect new notes only. Define the continuous/structural
  parameter table in `compile.js` and test every editor path against it. This replaces
  `heldLive` without turning patch ownership into an implicit convention.
- Reject an unknown protocol, patch revision, non-finite number, mismatched array length,
  or out-of-range `paramId` without throwing from `process()`: increment a typed
  diagnostic counter, ignore the event safely, and surface the error in controller
  health. Protocol tests must fuzz malformed messages and prove finite output afterward.
- Warm every AW lane/module needed by the selected song before the final transport start,
  and resume the context immediately before that handoff. A delayed module registration
  must queue the first live note with its original target frame or report it late; it must
  not drop it or start it at message-arrival time.
- If the worklet cannot run (insecure origin, module registration failure, processor
  error), **do not silently substitute `_playLayer`** — that would make every A/B a lie
  in the one direction nobody checks. The lane fails loud and names itself in the log,
  the TNGR-2 rule. This is a dev-only identity (§1.1), so a named failure is the whole
  contract: no fallback flow, no conversion UI.

## 7. What stays native

**The lane chorus.** It is already outside the core for TNGR-2 (`_tngr2Output`) and is
built by the same `buildChorusLeg` MRDR uses, which is what makes "the two synths run one
chorus" provable rather than asserted. Two presets use it. The persistent lane stage
(`_ensureMrdrLaneStage`, `_updateMrdrLaneStage`, `_retireMrdrChorus`, `MRDR_STAGE_DRAIN_MS`)
survives, minus the `laneEffects: false` bypass, which exists only for cache renders.

**The channel strip, aux sends and echo** — unchanged; the lane node connects to `dry` and
`wet` exactly as the note-on chain's output gain did.

## 8. The compile step

`compile.js` turns a preset into a flat numeric patch on the main thread, off the audio
thread (TNGR-2's `installCompiledPatch` pattern). It resolves, once, everything the core
should never have to reason about:

- `bypassed` — the editor's reversible OFF store, authoritative over any stale live value.
- `soloLayers` — a soloed audition builds exactly the layers that layer builds alone.
- gain-0 layers, absent sections, `lfo.depth === 0`, `chorus.mix === 0`, `vibrato.depth === 0`
  — DEPTH and MIX are the switches; a zero builds nothing, and that must stay true or the
  cost model changes silently.
- `drivePlace: 'pre'` with no global stage → ignored, so the key can never become the
  difference between two takes of a patch with no stage to move. (Zero presets use `pre`
  today; the panel offers it, so it must work.)
- The drive curve — `_driveCurve`'s 1025-point table, unchanged, shipped as an array so
  the shaper port is a table lookup and stays bit-comparable with the native shaper.
- The coloured noise buffer for any noise layer's `color`.
- `clampUnison` against `MAX_UNISON`, and the waveform/type coercions `scrubOscTypes` and
  `nativeWave` do — a malformed preset must not reach the audio thread.

A patch hash comes out of this step and pins the preset for §11's oracle.

### 8.1 Complete path coverage, not a hand-maintained shortlist

Add a machine-readable classifier for every canonical MRDR leaf path:

```text
dsp-continuous       reaches sounding AW notes through a param event
dsp-structural       compiled into a new revision; applies at next note-on
main-thread-audio    chorus, lane gain/routing or another deliberately native stage
identity-metadata    id, label, category, note, factory/user provenance, calibration
legacy-migrated      accepted input rewritten to a canonical path
unsupported          blocked with an explicit reason and UI behavior
```

`tests/mrdr3-compile.js` walks all 68 factory objects and fails on any unclassified leaf;
it also walks the editor's declared MRDR control paths and fails if a sound control has no
engine read. A new preset key or editor pot therefore creates a failing handover task
instead of becoming an inert control. Keep the generated coverage report with the Phase
4 evidence; do not freeze “181” as a schema limit.

## 9. Migration and approval

- The sound cannot cross bit-exactly, so during the project **two dispatch identities
  coexist**: `MRDR-3` goes to `_playLayer`, `MRDR-3 AW` goes to the lane worklet. Neither
  is an `auto` router whose answer can change under a library update — which one plays is
  written in the lane.
- Batches are §3.5's, in that order. Per batch: A/B renders through the campaign's
  existing tooling, ear approval, `tools/measure-voices.js` re-measurement of `level` and
  `peak`, then the null-test baselines re-rendered and ear-approved.
- **Approval is staged on the canonical preset, then promoted.** A block such as
  `mrdrAw: { approved: true, level, peak, oracleHash44, oracleHash48 }` holds the new
  calibration while the old one is still in use, so the A/B level difference cannot
  vanish into catalogue drift. It is a staging area with an end: at cutover its `level`
  and `peak` replace the top-level values, its hashes become the preset's hashes, and the
  block is deleted. It is not a permanent second calibration.
- **Native keeps working until its last preset has crossed.** The cache keeps serving
  every lane still on `_playLayer`, which is what makes an unfinished migration a working
  song rather than a broken one.

### 9.1 One patch library, one test identity

The whole contract, and it is deliberately short — there are no players, no shipped songs
and no compatibility debt to service:

- Factory data is authored once under `synth: 'MRDR-3'`. A dev-only view in `src/dev/`
  derives `{ ...canonical, synth: 'MRDR-3 AW' }` for presets whose `mrdrAw.approved` is
  set. It adds nothing to `VOICES` and resolves by value, not by an ID lookup that would
  land back on the native object.
- Choosing that view writes the lane's song-local snapshot with the AW identity. Bounce,
  stems, freeze and reload read the snapshot, so an A/B render renders what you chose.
- Everything else about the family — Quick and Advanced editors, MIDI, Note FX,
  Brightness, bypass, layer copy, the standalone editor — is shared by asking "is this an
  MRDR voice", not "is this exactly `MRDR-3`". That helper does not exist yet; the tree
  carries ~232 textual `MRDR-3` references but only **17 exact equality guards**, and the
  guards are the whole job — the comments stay as they are. A day of mechanical work,
  done once, as a family predicate rather than a second literal sprinkled beside the
  first.
- `tests/mrdr3-identity.js`: no factory preset and no tracked song carries the AW
  identity; a `work/` test song round-trips through save, reload, bounce and stem with
  its renderer intact; and the AW dispatch reaches no cache, planner, tail-cull or
  Performance-quality path.

That is all. No engine picker entry, no user-patch semantics, no badge, no URL parameter,
no undo-of-conversion, no load migration — those exist to protect people who are not
there.

### 9.2 Both engines at once — the comparison instruments

Approval routing is not comparison. Routing answers "which backend plays this preset";
comparison needs the *same* preset played both ways, on demand. Three instruments, and
they are three different jobs:

**An explicit comparison override.** `setMrdrComparisonBackend(null | 'native' |
'worklet')` is diagnostic/session-only and never serialized. `null` honours the saved
engine; the other values force the same canonical patch through one renderer. Name it as
a comparison override rather than the production router so it cannot quietly become a
third engine mode. This lands in Phase 2 at the first sound.

**`work/local/mrdr3-ab.mjs`** — files, on the `tngr2-ab.mjs` pattern that settled TNGR-2:
each preset rendered both ways to `work/auditions/mrdr3-ab/<preset>-a-native.wav` and
`-b-worklet.wav`, so they sort next to each other and A always comes first. One
phrase per preset shape — a chord for the pads and orchestral presets, a line for the
basses and leads — so each preset is heard doing the thing it exists to do. Add a
`--batch` selector for §3.5's five batches, since that is the unit approval moves in.

**A live toggle on the desk and in the MRDR-3 playground.** TNGR-2 never had this — its
A/B was files only — and MRDR-3 needs it, because §11's headline acceptance test is a
live soak: preset swaps and pot drags *during playback* on a heavy song. A defect that
only appears under a moving hand cannot be heard in a rendered pair.

The file tool emits two sets: raw-level files for gain-staging/null diagnosis and a
peak-matched listening pair, because louder reliably sounds better. The listening pair
scales each side independently to the same non-clipping target peak and records both
original peaks and both scale factors in a JSON manifest. Never use those independently
normalised files for a null, level or calibration test; those use the raw pair.

### 9.3 What the switch cannot honestly do

Three limits, worth stating in the UI rather than discovering by ear:

- **It takes effect at the next note-on.** A sounding native note cannot be handed to the
  processor mid-flight, so the toggle switches the *next* note, not the current one. On a
  pad with a four-second release the two backends overlap for a bar; that is correct
  behaviour and it looks like a bug.
- **A live A/B of GLITCHING is confounded by the cache.** The native side is being helped
  by four layers of machinery the worklet side does not have — that is the whole point of
  the project, but it means "does it glitch" is not a like-for-like question unless the
  cache is off. The live toggle therefore needs a second switch beside it that disables
  the note cache for the native side, and an honest reading is taken with it off.
- **A live A/B of COST is confounded by muting.** Campaign rule 1: `setMute` zeroes a
  fader, it does not stop the voices being built. Comparing backend cost by muting one of
  two lanes measures both. Cost readings come from `work/local/mrdr3-worklet-bench.mjs`
  with `Audio.setSilentLaneSkip(true)`, never from the desk toggle.

### 9.4 When native goes

Not *whether* — the end state is one engine. The only question is when, and the answer is
evidence, not a date: `_playLayer` and the comparison tooling stand until the last batch
of §3.5 is approved and a soak has run over the shipped songs, the heavy barber-96 case,
the game, the desk and the standalone editor.

Keeping native standing through Phase 6 is not indecision — it is what makes a regression
during the cache retirement bisectable. Retiring the machinery in §10 is the riskiest
stretch of the project, and being able to flip one preset back to `_playLayer` is the
difference between a bisect and a guess.

What the soak has to produce before the deletion commit, because these are the numbers
that go into `docs/audio-performance-2026-08.md` afterwards either way:

- per-preset listening sign-off, and any preset still refusing to cross;
- live audio-thread cost and memory on the desk, and offline Bounce/stem timings at both
  rates;
- the late-event, steal and failure counters from the soak.

Then, in one commit: `synth: 'MRDR-3'` dispatches to the worklet, the `mrdrAw` blocks are
promoted and deleted, and `_playLayer`, the AW identity, the dev view and the A/B tooling
all go.

## 10. The retirement inventory

`MRDR-3 AW` never enters the note cache, prepared-note planner, tail-culling path or
Performance-quality caps. Its dispatch bypasses them by construction, and its health
report must show zero cache lookups and zero cache renders for AW lanes — that is the
proof the bypass is real rather than intended.

The machinery below goes when native goes (§9.4), not when Phase 5 finishes: every item
is still carrying the lanes that have not crossed yet. Re-run `rg` at the time of each
removal — reference counts already moved during the performance campaign and a stale
count is not a deletion contract.

| identifier | what goes with it |
| --- | --- |
| `noteCacheState`, `noteCache`, `_trimNoteCache` | the store and its 320 MB cap |
| `noteCacheHealth` | the desk's cache readout and its banner |
| `setNoteCachePlaybackActive`, `pumpCache`, `trickleAllowed` | the trickle and its three brakes |
| `prepareNoteCache`, `beginPreparedNotePlan`, `commitPreparedNotePlan`, `prioritisePreparedNotes`, `_recordPreparedMrdr` | cost-aware planning and the prepared-start flow |
| `_cacheableLayer`, `_cacheablePool` | the gates |
| `_playCachedLayer`, `_playCached`, `_layerCacheEntry`, `_layerCacheDescriptor` | the replay path |
| `estimateMrdrEventCost`, `MRDR_PLAN_*` | the planner's cost model |
| `_recordMrdrTailOpportunity`, `setMrdrTailCulling`, `_mrdrTailStats` | tail culling — a worklet voice frees itself when its envelope ends |
| `mrdrQuality`, `setMrdrQuality`, `_unisonCap`, `_filterStageCap`, `PERFORMANCE_*` | native Performance mode; AW always renders its authored topology |
| `hardSyncTable`, `SYNC_TABLE_CACHE`, `pitchEnvValue` | superseded in AW by §3.4; still used by native until cutover. `HOLD_SECONDS` itself SURVIVES — the TNGR-2 held-note backstop and `_playAdditive` read it too; only `_playLayer`'s use of it goes |

Each is its own small, test-gated change, and `pause-to-catch-up` and the overload banner
come out only with the machinery they explain. Until then the desk labels its cache and
quality controls **Native MRDR-3**, so an AW lane is never told its sound is warming or
degraded when neither is true.

**The Tone pool path keeps the cache if it still earns it there.** That is a separate
measurement and a separate decision. Do not couple it to this project or use it as an
acceptance gate.

## 11. Verification

- **Proof gate first** (§12, Phase 1). TNGR-2's eight conditions, re-run for MRDR-3:
  live registration; offline at 44.1 and 48 kHz; timestamped note-on/off/panic; a first
  note strictly after t=0; finite non-silent output; deterministic phase; a repeat render
  matching exactly; a lane stem sample-consistent with the same lane in the mix; clean
  teardown across context replacement, stop, song switch and panic. Both build modes.
- **`tests/mrdr3-primitives.js` — the Tier-A claim, node by node.** Each ported primitive
  rendered against a real `OfflineAudioContext` running the actual node, at a tolerance
  tight enough to catch a wrong coefficient (start at 1e-6 and record what each one
  actually achieves). This is where a-rate versus k-rate coefficient recomputation gets
  settled by measurement rather than by assumption: a modulated biquad recomputes its
  coefficients per sample, an unmodulated one does not, and **54 of the library's 80
  filter instances are modulated** — 39 of 40 global filters (a filter envelope, or an
  LFO targeting `filter`) and 15 of 40 layer filters. Getting this wrong is not a
  tolerance question; it is a different filter.
- **`tests/mrdr3-dsp-parity.js`** — worklet vs Node reference, **zero tolerance**, both
  rates, block sizes 1/128/512/997, including a lane pushed past its pool so the allocator
  is compared too.
- **Purity scan** of the DSP source text; determinism (two renders, one file).
- **`work/local/mrdr3-null-oracle.mjs`** — SHA-256 of every approved preset at both rates,
  green from the moment a preset is approved. Uses the same fixed score as TNGR-2's
  oracle (one sustained note, a chord, a retrigger pair on integer frames).
- **`MASH_NULL_ALL`** green after each batch's baselines are re-rendered.
- **Identity and failure behaviour** (`tests/mrdr3-identity.js`, §9.1): the AW identity
  reaches no factory preset and no tracked song; a `work/` test song round-trips through
  save, reload, bounce and stem with its renderer intact; dispatch is exact, with no
  silent fallback to `_playLayer` and no silent offline render. A lane that cannot build
  its node says so — the TNGR-2 rule, where a lane that fails is a lane that renders
  silence and must name itself in the log rather than leave a gap that looks like an
  arrangement decision.
- **Spectral gates:** classic waves, pulse/PWM and hard sync swept over pitch, duty,
  glide, pitch envelope, vibrato and FM. Compare against a high-rate/downsampled reference;
  freeze the allowed in-band alias residual before tuning the algorithm, and require no
  discontinuity at mip boundaries. Report spectra as well as a pass/fail number.
- **Level gates:** retain raw (unmatched) peak and integrated/RMS measurements for every
  A/B. For the 50 non-Tier-C presets, investigate any sustained-level delta above 0.25 dB
  or peak delta above 1 dB rather than calibrating it away. Tier-C changes still require
  finite/non-clipping output and explicit new `mrdrAw.level`/`peak` values.
- **Completed-core performance:** repeat Phase 0 with the shipping processor and the same
  frozen device/method. The final core must still pass the predeclared go/no-go bar, stay
  within its oscillator/group pools on the acceptance songs or report every steal, and
  show no unbounded memory growth across a 30-minute loop with preset edits.
- **Host coverage, before the cutover commit.** After cutover there is no second
  synthesis path — the TNGR-2 rule — so a host without a working worklet has no MRDR-3
  at all, which is most of the library. Confirm registration and a sounding note on the
  production build across the four hosts (§13) and the declared browser matrix, plus
  context replacement, suspend/resume, and a device or sample-rate change. Declare that
  matrix before Phase 5, not after.
- The **21 browser suites `tests/run-all.js` skips** are run explicitly; two real bugs
  this campaign were caught only that way.
- **The headline acceptance test is a live soak on the desk:** preset swaps and pot drags
  *during playback* on a heavy song, with no glitch. That is the symptom this project
  exists to remove.

## 12. Phasing

Each phase is independently verifiable and independently abandonable.

**Phase 0 — the cost proof.** `work/local/mrdr3-worklet-bench.mjs`: a per-sample spike of
the *dearest* preset shapes (`bestVowelPad`, 14 slots; `bestPwmDrift`, 12;
`mrdrViolinSection`, 8), benched against the same music through `_playLayer`, under the
campaign's measurement rules — silent-lane skip on, fresh page per render, best of 3
round-robin, in situ. The whole project's justification is a CPU claim, and TNGR-2's 10×
was measured on a *wavetable* synth; MRDR-3's shape is many band-limited oscillators plus
biquads and has not been benched per-sample. Before running the bench, freeze the target
device and go/no-go bar: provisionally, each of the three shapes must be at least 2×
cheaper than native and their geometric mean at least 3×, after adding a 30% allowance
for controller/event/diagnostic work omitted by the spike. Do not move the bar after the
result. **If Phase 0 misses it, stop here.** Deliverable: raw runs,
browser/build/sample-rate/device, calculation and a written verdict. Offline wall time
is supporting evidence, not live audio-thread CPU.

**Phase 1 — the proof gate and the harness.** `worklet.js`, `controller.js`, an empty
core, `tests/mrdr3-worklet-proof.js` passing all eight conditions, the parity harness and
the oracle skeleton green over nothing. Then the family predicate and the dev view, with
`tests/mrdr3-identity.js` — in that order, because the predicate is a mechanical sweep of
~232 sites and there is no reason to spend it before the gate says the worklet works at
all. No synthesis.

**Phase 2 — Tier A, and the switch.** `ParamTimeline`, the biquad, the shaper, the
panner, and `tests/mrdr3-primitives.js` holding each to a measured tolerance against the
real node. Then the first sound: one layer, the four classic waveforms off the mip
pyramid, the global filter and VCA, poly allocation and stealing.
**`setMrdrComparisonBackend` and
`work/local/mrdr3-ab.mjs` land here, at the first sound** — every later phase is judged
through them, and a comparison instrument retrofitted in Phase 5 would be a comparison
instrument nobody trusts. Gate: parity zero, primitives within tolerance, one preset
audibly recognisable, and an A/B pair on disk for it.

**Phase 3 — the voice.** Three layers, the note-group structure and the shared drive,
unison with spread and stereo placement, static pulse, noise layers, FM, the pitch
envelope, `vca: 'through'`, per-layer delay and `len`. Then moving PWM (§3.4) with the
band-limiting method chosen by measurement. Gate: batches 1, 3, 4 of §3.5 renderable and
A/B-able.

**Phase 4 — the performance.** Exact hard sync, the routable LFO including deterministic
sample-and-hold, vibrato with the frozen ensemble semantics, glide, mono and legato with
the FINGERED rule and the choke, drive placement, tone. Gate: the full parity suite,
including a lane pushed past its pool, and the oracle over every preset the batches have
reached.

**Phase 5 — approval.** The live toggle on the desk and in the playground (§9.2), with
§9.3's three limits surfaced beside it, then §3.5's five batches: ear approval, level
re-measurement into the `mrdrAw` staging block, oracle hashes, baseline re-renders. This
is the long phase and the only one whose length is not under our control. If a batch
stalls, that is a signal about the DSP, not a reason to let both paths sit — the two
drift while they wait (§13).

**Phase 6 — the soak, the retirement, the deletion.** Run the §9.4 soak and repeat the
Phase 0 bench against the completed core with no 30% estimate. Then §10's inventory, one
test-gated removal at a time, **with `_playLayer` still standing** so anything that breaks
can be bisected against it. Then the cutover commit: `synth: 'MRDR-3'` dispatches to the
worklet, the `mrdrAw` blocks are promoted and deleted, and `_playLayer`, the AW identity,
the dev view and the A/B tooling go with them. Finally
`docs/audio-performance-2026-08.md` gets the after-numbers, and §4b's "recommended
long-term project" is replaced by what happened.

## 13. Risks, and what would change the plan

- **Phase 0 comes back thin.** The honest stop point. Named first for that reason.
- **A-rate coefficient behaviour is not what we assume.** `tests/mrdr3-primitives.js`
  finds this in Phase 2, before anything depends on it, which is why the primitives suite
  is a phase gate and not a footnote.
- **Mip-table band-limiting reads differently across 68 presets at once.** Mitigated by
  batching the sweep last (§3.5 batch 5) and by the fact that TNGR-2 crossed the same
  ground with the same machinery.
- **The note group makes stealing awkward.** Stealing a *group* mid-chord is not the same
  as stealing a voice; the policy in §5.2 is a starting position, not a settled one, and
  it should be re-examined once barber-96's string section is running per-sample.
- **Four hosts, not one.** The game, the desk, the MRDR-3 playground (`dist/MRDR3`) and
  the offline render harness all reach `VoiceRack`. The harness's secure-origin fix has
  landed; the playground is a single inlined HTML file, so its Blob-URL `addModule` works
  when served over https and **not** when the file is opened from disk. Say so in the
  page rather than letting it render silence.
- **The two paths drift while both are live.** This is the cost of the scaffold, and it
  is bounded only by how long the scaffold stands. Phases 2–6 run two synths meant to
  resemble each other, which TNGR-2 §2 forbids as a steady state and which is survivable
  only because it is temporary: one canonical patch payload, one shared event-builder
  layer, and every approved preset pinned by its oracle hash the moment it crosses. The
  failure mode if Phase 5 stalls is not "we wait" — it is "they drift while we wait". Set
  a stop date alongside the stop condition.
- **Scope creep into the panel.** Nothing here changes a pot, a label or a preset key.
  A worklet makes several new controls cheap; that is a separate conversation, after.
