# JMJR-4: round-two performance handover for Luna Max

## 1. Objective and boundaries

Reduce JMJR-4 CPU cost in the Desktop Mixer. Preserve the first pass’s accepted improvements.

Peter’s decisions:

- Revise existing engine defaults and factory presets; do not add a quality selector or duplicate economy presets.
- Slight audible changes are acceptable for **at least 10% improvement on an affected complete workload**.
- Effectively unchanged sound may justify any reliably measurable saving.
- Peter decides whether a changed sound is acceptable from auditions.

The September 6 document is historical evidence. Its sound-preservation restriction does not override these decisions.

Work sequentially and independently. Preserve unrelated dirty/untracked files; do not stash, reset, commit or restore whole files. Before editing, reread relevant code because other work may be occurring concurrently.

Do not introduce graph pooling, sample substitution, worklets, cross-key tract sharing, polyphony reductions or shared-effect rewrites. Public preset IDs, saved-preset schema and export interfaces remain unchanged.

At implementation start, save this handover as `work/local/jmjr4-performance-plan-round2-2026-09-07.md`, using a numbered suffix if occupied. Record results in that document as work progresses.

## 2. Prepare trustworthy measurement

Extend `work/local/jmjr4-perf.mjs` **before freezing the baseline**. Its browser harness must remain identical across compared snapshots.

Create a new run directory, `work/local/jmjr4-perf-round2-2026-09-07`, with a numbered suffix if necessary. Preserve all existing September 6/7 evidence. Snapshot the current tree, including dirty and untracked engine inputs, rather than using HEAD.

### Harness changes

- Retain separate cold-build, warm-build and render measurements, raw paired observations, browser/machine metadata, full-buffer comparisons and source-lifetime diagnostics.
- Compare each candidate against both the original round-two baseline and the last accepted stage.
- Freeze each tested candidate during comparison. Acceptance must promote that exact snapshot, not rebuild possibly changed current source.
- Require an explicit result-file path for acceptance; do not choose the “latest” result lexicographically.
- Add `--policy unchanged|audible` and `--target <workload-id>` to comparison. Require a target for audible candidates.
- Support a targeted fifteen-pair follow-up linked to its original full result through `--rerun-of <result.json>`. A targeted follow-up supplements full-suite evidence; it cannot replace it.
- Preserve sound failures as failures in reports. Store Peter’s subsequent audition decision separately, with the stage, candidate hash and conversation evidence. Never invent approval or widen the numerical sound threshold.

### Performance gates

For each metric, let:

```text
B = median baseline time
C = median candidate time
MB, MC = median absolute deviations
gain = (B − C) / B
noise = 2 × max(MB / B, MC / C)
```

Use seven alternating baseline/candidate pairs initially.

- A reliable improvement requires `gain > noise` and at least **6/7 wins**.
- For gains below 3%, require one fifteen-pair confirmation with `gain > noise` and at least **12/15 wins**.
- Audible candidates additionally require `gain >= 0.10` in **render time on their declared target**, measured against the previous accepted stage.
- A regression is a loss exceeding `max(0.05, noise)` with at least 6/7 losses, or 12/15 in confirmation.
- Reject a candidate with a confirmed regression in any core workload’s build or render metric.
- Keep the existing 2 ms timing floor. Metrics below it are inconclusive.
- Allow at most one fifteen-pair follow-up per disputed target/metric. If still inconclusive, drop the optimisation.
- Stages A and B may qualify through build savings alone, but label that outcome “note-on improvement”; do not claim sustained CPU savings.
- Require an incremental improvement. Savings inherited from earlier stages cannot qualify a later change.

Baseline-against-itself must pass sound, note-acceptance and frame-count checks. If it produces a qualifying performance “win,” investigate benchmark bias before measuring candidates.

## 3. Execute these experiments in order

### A — Remove redundant terminal automation

In `src/engine/jmjr4/dsp.js`, change `automate` so a final run of equal transformed values retains only its first point. Preserve the existing treatment of interior plateaus.

Example:

```text
Times:  [0, .048, .08, .32]
Values: [200, 200, 750, 750]

Keep:   [0, .048, .08]
Values: [200, 200, 750]
```

Keep the ramp that reaches 750. Omitting the final duplicate must leave the parameter constant afterward.

Preserve transformed-value evaluation order, strict-time adjustments, initial scheduled events, cancellation and retarget behaviour. Do not approximate near-equal values or replace scheduled state with `.value`.

Start under `unchanged` policy. Numerically different output may result from different native filter arithmetic; if the sound gate fails, produce auditions and leave it pending rather than assuming it is inaudible.

Primary diagnostic workload: `line16th-robot`.

### B — Stop permanently silent aspiration sources

Determine the final nonzero **effective** aspiration gain using the same transform and adjusted scheduling times as automation.

If a following zero point exists, stop the noise source at that point. If no following zero exists, retain its original lifetime. Already entirely silent branches remain omitted.

Keep downstream nodes connected so existing filter state can decay. Do not stop across an internal silent gap followed by another aspiration segment.

Implement lifetime ownership explicitly:

- Keep this source in the DSP handle’s owned source collection and earliest-stop map.
- All subsequent stops must pass through `cut`; none may extend its booked stop.
- Add an optional internal `stopSources(at)` callback to JMJR held-note records.
- In the rack’s ordinary held-note release and panic paths, invoke that callback instead of directly iterating raw sources when it is present.
- For sung notes, the callback calls `handle.stop(at)` and `ending.stop(at)` when an ending exists. For SPEAK, it calls its render handle’s `stop(at)`.
- Preserve the rack’s existing envelope fades, shared-modulator accounting and ordinary source iteration for other synths.

Do not solve this merely by hiding aspiration in `brief`: future aspiration in a SPEAK phrase must remain reachable by panic.

Primary diagnostic workload: `line16th-robot`. Start under `unchanged` policy.

### C — Trial four formants

Remove only the F5 parallel filter/gain branch. Retain F1–F4, nasal processing, consonants and existing level controls.

Declare `held8-aah` as the target. Require at least 10% incremental render improvement and acceptable full-bank auditions. Do not compensate loudness in production during this experiment.

Check bright vowels, high pitches, hums and morphs. If unsuccessful, reverse only this candidate’s edits. Do not proceed to removing F4.

### D — Trial factory-preset reductions separately

| Stage | Sole preset change | Required render target |
|---|---|---|
| `robot-breath` | Robot Chant BREATH → `0` | `line16th-robot` |
| `aah-unison` | Choir Aah UNISON `4 → 3` | `held8-aah` |
| `ooh-unison` | Choir Ooh UNISON `3 → 2` | `pad4-ooh` |

Keep all other preset controls unchanged, including syllables, spread and release.

Each candidate needs its own 10% incremental improvement and audition decision. Update descriptions only for retained changes. Archive original complete presets.

Keep a separate explicit unison-four stress fixture: revising Choir Aah must not silently turn the existing sixteen-note stress test into a three-oscillator test. Label factory-preset and fixed-configuration workloads accurately.

For any sound-changing candidate awaiting Peter, save its exact snapshot, patch, results and auditions; reverse its production hunks and continue independent experiments from the last accepted state. Do not stack unapproved changes.

## 4. Tests, sound decisions and commands

### Required behavioural coverage

- Constant curves; rise-then-hold; fall-then-hold; internal hold followed by movement; transformed values; duplicate adjusted times; nonzero note starts.
- Retarget/cancel before and after the removed terminal point, including scheduled morphs.
- Aspiration ending early, ending at the note boundary, never reaching zero, and multiple separated bursts.
- Held release, scheduled release, rapid retrigger, panic before a future burst, SPEAK phrase/word playback, and ending consonants.
- Assert every source’s final stop is no later than its previously booked stop.
- Finite output, unchanged accepted/refused notes, frame counts and complete release tails.

Run full-buffer sound comparisons at 44.1 and 48 kHz. Preserve the `1e-5` maximum absolute difference gate at production gain for unchanged candidates.

Treat Arcade Chorus’s documented crusher nondeterminism separately: report it, compare its pre-crusher signal, and do not exclude other failures.

For changed sound, generate production-gain and loudness-matched A/B WAVs with recipes and hashes. Judge vowel identity, consonant clarity, choir fullness, clicks, instability and tails. Loudness matching is for listening only.

If numerical parity fails, Peter may classify the difference as effectively unchanged, slightly changed or unacceptable. Apply the corresponding performance gate; never infer that classification from error magnitude alone.

### Command contract

These commands describe the extended harness to implement. Use the selected run directory consistently:

```sh
node work/local/jmjr4-perf.mjs snapshot \
  --run work/local/jmjr4-perf-round2-2026-09-07

node work/local/jmjr4-perf.mjs compare \
  --run work/local/jmjr4-perf-round2-2026-09-07 \
  --candidate baseline --stage self --pairs 7 --policy unchanged
```

For each stage:

```sh
node work/local/jmjr4-perf.mjs compare \
  --run <run-dir> --candidate current \
  --stage <unique-stage> --pairs 7 \
  --policy <unchanged-or-audible> --target <target-id> \
  --rates 48000,44100 --wav
```

For the single permitted targeted confirmation:

```sh
node work/local/jmjr4-perf.mjs compare \
  --run <run-dir> --candidate current \
  --stage <unique-stage-confirm> --pairs 15 \
  --case <target-id> --rerun-of <full-result.json> \
  --policy <unchanged-or-audible> --target <target-id>
```

Acceptance:

```sh
node work/local/jmjr4-perf.mjs accept \
  --run <run-dir> --result <full-result.json>
```

Acceptance must verify linked confirmation evidence, required audition evidence and the tested candidate hash. Refuse incomplete, failing or inconclusive evidence.

Final verification:

```sh
node tests/jmjr4-data.js
node tests/jmjr4-compile.js
node tests/jmjr4-syllables.js
node tests/jmjr4-text.js
node tests/jmjr4-render.js
node tests/jmjr4-performance.js
npm test
npm run test:all
npm run build
git diff --check
```

Run focused checks per stage and broad checks after the final accepted combination. Separate unrelated existing failures from scoped regressions.

## 5. Final validation and delivery

Repeat the full comparison for the accepted combination against the fresh round-two baseline. Preserve incremental results; do not sum percentages.

Verify the served Mixer contains the accepted code. Use an isolated server on a free port if needed; record its PID and stop only that process. Request narrowly scoped execution escalation if Chromium encounters the known sandbox launch failure.

Perform live Desktop Mixer checks with rapid Robot Chant and dense choir chords. Record browser, device, sample rate and measurement method. Check playback stability, editing during playback and release/panic behaviour. If live CPU or listening evidence is unavailable, say so; offline rendering is not live CPU proof.

Deliver:

- A stage-by-stage keep/drop/pending table with reasons.
- Baseline/final and incremental build/render measurements.
- Sound-error results and Peter’s recorded audition decisions.
- Exact snapshots, patches, original presets and audition paths.
- Test/build/browser outcomes and unrelated failures.
- Updated handover documentation and remaining bottlenecks.

No unmeasured percentage promises, no silent acceptance of changed sounds, and no unapproved candidate left in the production tree.
