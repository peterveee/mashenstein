# Synth optimisation candidates

Written 21 October 2026.

Companion to [the audio audit plan](AUDIO_SYNTH_AUDIT_PLAN.md) and
[its supplemental review brief](AUDIO_SYNTH_AUDIT_SUPPLEMENT.md).

## Purpose

These are additional implementation experiments aimed at reducing synthesis CPU cost,
note-start spikes, allocation pressure, and retained memory while preserving sound.
They are candidates identified through source inspection, **not measured savings or
confirmed defects**. Recheck current code before starting: the audio audit is in progress.

This document records proposals; it does not direct an engine rewrite or replace the
existing audit. Existing caching, idle fast paths, shared modulation, and cleanup work
must be accounted for before claiming an additional improvement.

## Priorities

| Priority | Candidate | Expected area of benefit |
| --- | --- | --- |
| 1 | WNDR-9 compatible-partial fast path | Active oscillator/node count |
| 1 | TNGR-2 event queue | Audio-thread scheduling spikes and allocations |
| 1 | JMJR-4 intermediate calculation reuse | Note-start CPU and allocations |
| 2 | TNGR-2 immutable table sharing | Memory and lane startup |
| 2 | MRDR-3 / WNDR-9 static patch specialisation | Redundant graph stages and automation |
| 2 | Selective drum-component rendering | Repeated synthesis cost with bounded memory |
| 2 | CRLS-1 / RMND-7 pool shrinkage | Retained resources after polyphony bursts |

The ordering is a starting point, not a performance finding. Use the audit measurements
to select representative patches and change the order if the evidence warrants it.

## 1. WNDR-9: combine compatible partials

**Source:** `src/engine/voices.js`, `_playAdditive()`.

Each active drawbar currently creates its own oscillator and envelope gain. Investigate
representing compatible registrations with a single `PeriodicWave` oscillator per note,
keeping the percussion register separate.

Eligibility requires ratios expressible as integer harmonics of a common fundamental,
no inharmonic stretch, and matching effective partial envelopes. Sub-octave drawbars may
require choosing a lower common fundamental. Begin with sine partials; do not assume
other oscillator shapes have an equivalent simple coefficient mapping.

Preserve:

- Partial amplitudes, phase relationships, output level, and pitch behaviour.
- Existing frequency-dependent attack smoothing and damping behaviour.
- Nyquist handling and timbre during pitch bends and glides.
- Per-note drive placement and the independent percussion path.

The current attack smoothing may make apparently matching envelopes differ between
partials. Establish actual eligibility rather than accepting a patch solely because
`damp` is zero. Keep the existing implementation for ineligible patches.

**Experiment:** identify eligible library registrations, compare their node counts and
real-time cost, and render single notes, chords, low/high pitches, retriggers, and glides.
Check amplitude and transient differences before listening approval. Reject or narrow
the fast path if browser band-limiting or envelope differences change the sound.

## 2. TNGR-2: reduce event-queue work on the audio thread

**Sources:** `src/engine/tngr2/dsp.js`, `schedule()` and `scheduleAll()`;
`src/engine/tngr2/worklet.js` and `controller.js`.

The queue uses insertion with `splice()` and batch sorting. These operations execute in
the worklet environment, even when outside the per-sample processing loop. Investigate:

- Preparing sorted batches before delivery.
- Appending ordered events when they follow the current queue.
- Merging only when new events overlap pending events.
- Reusing bounded storage to reduce allocations and compaction work.

Do not replace the queue merely for a lower theoretical complexity. First measure queue
sizes and the cost of live scheduling, burst delivery, and long offline schedules.

Preserve stable same-frame ordering, sample-accurate event timing, late-event accounting,
panic, note cancellation, and the existing offline scheduling handshake. Test out-of-order
delivery and queue replacement as well as the common append case.

**Acceptance:** lower scheduling spikes or allocation pressure on representative workloads,
with unchanged event semantics and deterministic render parity. Define an explicit overflow
policy if fixed-capacity storage is introduced; silently dropping musical events is not an
acceptable optimisation.

## 3. JMJR-4: reuse expensive intermediate calculations

**Sources:** `src/engine/jmjr4/dsp.js`, `glottalHarmonics()`, `glottalWave()`,
`tractPower()`; `src/engine/jmjr4/note.js`, syllable compilation.

Waveform and tract-power results already have caches. On relevant misses, harmonic
coefficients are still calculated separately. Investigate a small, bounded, exact-key
cache of immutable harmonic coefficient arrays that both calculations can reuse.

Include every calculation input and sample rate in its key. Do not reuse the existing
rounded waveform key for exact calculations or introduce additional pitch quantisation.
Preserve the distinction between the existing waveform cache's behaviour and exact
tract-power calculations; a new cache must not make output depend on which nearby note
was played first.

Also profile repeated syllable compilation. Identical note parameters may allow reuse
of immutable compiled data while retaining independent playback and automation state.
Confirm whether downstream code mutates that data before sharing it.

**Experiment:** measure compilation and harmonic-calculation time separately, cold and
warm, on repeated pitches and highly variable pitches. Record hit rate, bytes retained,
and eviction behaviour. Check deterministic output after cache eviction and when notes
are requested in different orders.

**Acceptance:** reduced note-start work without unbounded retention, changed tuning, or
history-dependent output. Do not add a second cache if low reuse makes its bookkeeping
more expensive than the calculation it avoids.

## 4. TNGR-2: share immutable tables between lane processors

**Sources:** `src/engine/tngr2/controller.js`, table preparation cache;
`src/engine/tngr2/worklet.js`, node creation and table delivery.

The controller caches table preparation, but tables are structured-cloned per processor.
Investigate a registry inside the worklet module so processors in the same context can
reference immutable table sets by ID. This is a candidate for avoiding duplicate lane
copies without introducing a `SharedArrayBuffer` or cross-origin-isolation requirement.

Establish the module/global-scope behaviour on the supported engines before designing
around it. Include explicit readiness, immutable versions, reference ownership, and
release rules. Never mutate tables still used by sounding voices.

Preserve offline startup guarantees: events and tables must be installed before rendering
begins. Separate contexts need independent lifecycle handling. Keep the existing path as
a comparison and fallback while proving the design.

**Acceptance:** measured reduction in retained table bytes or startup cost across multiple
lanes, no first-note omissions, unchanged samples, and bounded retention after lane removal
and repeated preset changes.

## 5. MRDR-3 / WNDR-9: specialise static patches

**Source:** `src/engine/voices.js`, native voice graph construction and lane stages.

Investigate compiling fixed patches into the smallest graph that preserves their behaviour:

- Fold constant gains into an existing gain stage where signal order permits.
- Share identical envelope control signals when timing and effective values truly match.
- Avoid redundant unity stages in fixed gameplay patches.
- Retain flexible routing where live edits must affect already-playing notes.

Do not move distortion across summing points, combine independently modulated filters,
or replace per-note drive with chord-wide drive. Those operations can change the sound.
Likewise, an apparently unused branch may be needed by later automation or a live edit.

Use explicit eligibility and invalidation rules. Account for the cost of any shared
control nodes: sharing an envelope is not automatically cheaper than direct automation.

**Acceptance:** a measured reduction in graph or scheduling cost, with preserved automation,
tails, live edits, and routing. Start with a common, simple topology rather than a general
graph optimiser.

## 6. Drums: selectively render reusable components

**Source:** `src/engine/voices.js`, `_playDrum()`.

Beyond the existing MRDR-3 note-cache proposal, investigate caching a repeatable expensive
drum component, such as a fixed metallic body, while synthesising variable attack/noise
components normally.

Start with one frequently used expensive drum. Determine whether its component is truly
repeatable under the existing tuning, pitch envelopes, humanisation, phase, and random
seed rules. Preserve choke behaviour and full tails.

Keep nonlinear processing in the correct location. Independently rendered components
cannot simply be summed after a shared distortion stage and assumed equivalent to the
original graph. Pitch-shifting a cached component may also change duration, envelopes,
and spectral behaviour; treat that as a sound change unless equivalence is established.

**Experiment:** compare native synthesis with a narrowly eligible component cache, including
preparation cost, cold misses, retained bytes, and repeated-hit variation. Specify cache
invalidation for preset edits and sample-rate changes.

**Acceptance:** a useful playback saving within an explicit memory budget, without losing
variation, choke correctness, or sound quality. Avoid expanding this into whole-kit caching
before the first component demonstrates a worthwhile trade-off.

## 7. CRLS-1 / RMND-7: shrink excess pool capacity after bursts

**Source:** `src/engine/voices.js`, Tone pool ownership, allocation, and retirement.

The audit already considers parking quiet pools. Separately, investigate reclaiming excess
slots from a pool that remains active after a brief high-polyphony passage.

Retain enough warm slots for normal demand. Reclaim surplus slots only after their releases
and scheduled notes finish. Use a delay and hysteresis before shrinking so alternating dense
and sparse passages do not cause repeated destruction and rebuilding.

Respect Tone source retirement and the engine's lookahead. A slot with future scheduled
notes is not idle simply because it is silent now. Confirm the current allocator does not
already provide equivalent shrinkage.

**Acceptance:** reduced retained Tone objects, parameter sources, or standing load after a
burst, without truncated notes, extra startup spikes, or allocation churn in repeated
dense passages.

## Validation and decision rules

For each experiment:

1. Record the current baseline and the exact eligible workload.
2. Make the candidate independently selectable for an honest A/B comparison.
3. Measure the resource it targets: audio-thread headroom, main-thread note-start time,
   allocation pressure, retained bytes, or startup cost. Do not substitute one for another.
4. Check samples, timing, tails, and deterministic behaviour as appropriate. Explain any
   numerical difference rather than relying only on similar loudness or spectral centroid.
5. Run whole-song/session validation and confirm relevant gains on the target device.
6. Retain a regression test for the optimisation's eligibility and behaviour.

Do not claim a percentage saving before measuring it. If a candidate changes the sound,
document the change and seek listening acceptance before making it the default. If the
benefit is negligible or the memory/complexity cost outweighs it, record the result and
keep the existing implementation.

Recommended first experiments: **WNDR-9 compatible partials, TNGR-2 event scheduling, and
JMJR-4 intermediate calculation reuse**. No implementation or benchmark is recorded as
completed by this document.
