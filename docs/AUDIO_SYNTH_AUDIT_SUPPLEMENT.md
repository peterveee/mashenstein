# Audio synth audit — supplemental review brief

Written 21 October 2026. Companion to [AUDIO_SYNTH_AUDIT_PLAN.md](AUDIO_SYNTH_AUDIT_PLAN.md).

## Purpose and scope

This brief is for Claude to review and strengthen the audio audit already underway in
`/Users/Peter/mashenstein`. The objective is better performance, reliability, and bounded
memory use across **all sound/music generation and playback**, not just individual synths.

The items below are review questions and proposed additions, not confirmed defects or
completed measurements. Verify them against the current code: work is ongoing and some
may already have been addressed.

Read the existing plan, including its latest status notes, then inspect:

- `tools/audio-audit.js` and `tests/audio-leaks.js`.
- Audio lifecycle, scheduling, synth, mixer, effect, worklet, and cache code.
- Banger generation, preparation, offline rendering, calibration, and recording/export.
- Browser test registration and automation.

This is a **review and plan-update task**, not authorization to implement engine changes.
Preserve completed work, valid measurements, existing listening approvals, and unrelated
working-tree changes. Extend the active audit rather than restarting it.

## 1. Validate the audit harness

Check whether its instrumentation:

- Tracks connections into `AudioParam` as well as `AudioNode`, including modulation paths.
- Represents connection input/output indices and all `disconnect()` overloads correctly.
- Updates records only when the underlying operation succeeds.
- Retains objects through strong references, potentially contaminating memory measurements.
- Handles long releases, effect tails, bounded pools, and small persistent leaks without
  misleading verdicts.
- Preserves raw measurement samples rather than only summaries.

Propose harness self-tests using deliberately broken fixtures: orphaned modulation
sources, retained buffers, incomplete cleanup, and slow leaks. Preserve the existing
KNDO-5 before/after proof.

Specify reproducibility metadata: source revision and relevant dirty changes,
browser/device/OS, sample rate, actual audio configuration, seed, preset/mix settings,
instrumentation mode, and run duration. Verify that the silent measurement setup still
exercises the intended processing paths.

## 2. Add a dedicated memory audit

Flat node counts do not establish bounded memory. Cover:

- AudioBuffers, impulse responses, wavetables, and note caches.
- Voice pools, retired racks, contexts, and worklet resources.
- Pending render jobs, stale results, listeners, timers, and retained song data.
- Peak memory during generation/rendering and retained memory after cleanup.
- Cache bytes, hits, misses, evictions, and cancelled/stale jobs.

Verify current cache limits and their intended scope. The code inspected during the
initial review had a 320 MiB note-cache limit and a 192 MiB preparation budget. These are
configured limits, not measured consumption; verify whether the budgets overlap rather
than adding them together as assumed usage.

Define workflow/device budgets and acceptance based on a bounded plateau after warm-up.
Distinguish measurable application-owned allocations from browser/native memory estimates.
Run memory tests without instrumentation that itself prevents collection. Explain any
expected retained baseline and the limits of available device memory telemetry.

## 3. Add whole-song and repeated-session lifecycle tests

Verify the distinction between testing song-specific lane presets with a synthetic phrase
and playing actual songs with their arrangements, automation, and transitions.

Cover:

- Multiple full song loops.
- Repeated start/stop, seek, retry, and song replacement.
- Gameplay, menus, jukebox, and Mixer transitions.
- Live preset/effect edits.
- Background/foreground, screen lock, and audio interruptions.
- Stopping or replacing a song while preparation is pending.

Check duplicate playback, stale queued notes, stuck voices, accumulating contexts, and
cleanup returning to an explained baseline. Separate quick regression checks from longer
soak tests. Include both normal completion and interrupted/error cleanup paths.

## 4. Audit generation and preparation alongside playback

Include Banger generation, arrangement resolution, cache preparation, offline rendering,
calibration, and recording/export.

Measure elapsed time, main-thread stalls, peak memory, cancellation, and interference with
live playback.

Explicitly test: start expensive work, cancel or replace it, then start different work.
Verify stale work cannot install outdated results, keep filling caches, or leave resources
behind. Identify where bounded queues, backpressure, or cancellation need investigation.
Distinguish cancelling computation from discarding its eventual result where the platform
does not support immediate cancellation.

## 5. Separate scheduling failures from audio-processing overload

Include scheduler lateness, lookahead remaining, late/dropped notes, main-thread stalls,
worklet readiness/errors, and audio-clock behaviour.

Do not treat increased scheduling lookahead as a remedy for sustained DSP overload.

Supplement the worst-four-second budget with short-window evidence around chord entries,
effect wake-up, preset changes, and cache misses. Explain measurement uncertainty and
avoid claiming precise CPU percentages where the method only estimates headroom. Use
repeated controls when differences approach the measurement noise.

## 6. Expand workload and capability coverage

Retain the standard phrase for comparisons, but add targeted cases:

- Maximum supported chords/unison and overlapping releases.
- Legato, slides, sustain, rapid retriggers, and automation.
- Effect extremes, feedback tails, and sleep/wake cycles.
- Cold and warm caches.
- Music combined with sound effects, speech, and transitions.
- Reproducible generated Banger seeds and arrangements.
- Supported worklet and fallback paths.

An unavailable or silent synth must not pass as inexpensive. Report tested, failed,
unavailable, and untested paths explicitly. Test worklet startup and failure handling, not
just steady-state playback. Include relevant sample rates and actual device configurations
without expanding every test into an impractical full Cartesian product.

## 7. Tighten conclusions and sound-quality evidence

Check whether conclusions exceed their evidence. In particular:

- An offline sweep of default effect settings does not establish that effects are
  inexpensive in every real-time chain or device configuration.
- Near-identical spectral centroids do not establish identical spectra or sound.
- Desktop scaling is an estimate, not device confirmation.
- Absence of audible glitches in one run is not proof of bounded memory or reliable cleanup.

Keep performance measurements, sample-level correctness, listening acceptance, and device
validation distinct. Retain listening approval already given without extending it to
unreviewed changes. Specify suitable checks for invalid samples, unintended silence,
truncated tails, timing changes, and audible discontinuities where optimisations affect
those behaviours.

## 8. Make regression prevention operational

Verify that browser tests actually run on a scheduled runner rather than merely appearing
in a suite list.

Propose:

- Quick cleanup/lifecycle checks.
- Nightly representative browser tests.
- Broader preset and generated-song sweeps.
- Periodic device soak tests.

Specify report retention, failure reporting, and actionable acceptance criteria. Keep
deterministic resource-count checks distinct from noisy performance thresholds, and report
skipped or unavailable coverage explicitly.

For the deferred guard recovery, retain its position after the main audit. Add acceptance
requirements for cancelling queued notes, genuinely reducing processing load, preserving
musical/game timing, resuming correctly, and avoiding repeated recovery loops. Output
silence alone does not prove the processing load has stopped.

## Deliverable and priorities

Update `docs/AUDIO_SYNTH_AUDIT_PLAN.md` with verified gaps, prioritised additions, practical
stages, and measurable exit criteria. Clearly distinguish implemented, measured, proposed,
and still-unverified work. Reconcile outdated sections with the latest status rather than
leaving contradictory instructions. Use this supplement as the review brief, not evidence
that any suspected issue exists.

Prioritise **harness correctness, memory accounting, and repeated-session lifecycle
testing**, while allowing the ongoing synth/effect sweep to continue.

Finish with a concise summary of what changed in the plan, the most consequential
findings, and what remains unverified. Do not claim to have run benchmarks or device tests
unless you actually did.
