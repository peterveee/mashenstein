# Mixer Stage 5 — quiet-machine results, 26 October 2026

The automated Stage 5 checks passed for the measured controls. Channel pan input work is
smaller, effect paste avoids a whole-graph reset, and gain/pan Undo now uses the existing
strip setters. This is desktop Chromium evidence, not listening or physical-device acceptance.

## Controlled comparison

Ran 18 sequential muted browser sessions: three baseline/current pairs for each song,
with the second pair's order reversed. Every session used fresh storage, a 1440×900 viewport,
Chromium 149.0.7827.55, Smooth playback, 250 ms read-ahead and the same captured song fixture.
Each measurement covered a 150-event synthetic pan gesture and a 30-second playback window.

The baseline overlays only `mixer-entry.js` from `0bb55b05`. Both variants use current
supporting modules, including other chats' audio/effects changes. Dependency, shell and
fixture hashes matched across all 18 sessions. This is not a historical whole-repo comparison.

| Song | Strips / bars | Baseline input-handler p95 | Current input-handler p95 | Baseline frame p95 | Current frame p95 |
| --- | --- | --- | --- | --- | --- |
| Hub | 21 / 28 | 1.4–1.6 ms | 0.3 ms | 8.5–8.7 ms | 8.4–8.6 ms |
| Megamix | 23 / 64 | 2.3–2.4 ms | 0.3 ms | 8.4 ms | 8.4 ms |
| Super Mario World | 33 / 65 | 3.3–3.4 ms | 0.4 ms | 17.1–25.0 ms | 17.0 ms |

Ranges show the three runs, not confidence intervals. Input duration is synchronous handler
work; deferred mirror work happens later. These figures do not measure input-to-speaker or
input-to-presented-frame latency. The large-song frame result is encouraging but not a
separate proven frame-rate improvement. The previous busy-machine ~33 ms observation is
not a comparable baseline.

All pan windows had zero observed long tasks, zero graph/rack/arrangement rebuilds, and zero
new reported scheduler dropouts. Minimum sampled scheduler margin was 195.5 ms across the
set. Small worklet late-note counts occurred on the long song in both variants; no worklet
fault was reported. Existing health long-task fields can include startup; the bounded
PerformanceObserver data covers the measurement window specifically.

Effect paste performed one graph reset in every baseline run and zero in every current run.
The repeated comparison predates the two follow-up fixes below; its entry hashes are in
`work/audit/mixer-responsiveness/2026-10-26/quiet-summary.json`.

## Issues found and fixed during this pass

1. **Gain/pan Undo rebuilt the graph.** Reproduced one reset after a pan gesture. Added a
   conservative classifier that accepts only gain/pan differences on existing lanes,
   with every other mix field unchanged. The live path uses existing strip setters and
   only writes the parameter that changed, preserving automation on the other parameter.
   Stopped playback, changed topology, effects, routing, voices and other settings retain
   their existing full-apply path. The rack still repaints.
2. **Effect paste could exhaust the scheduler queue.** On the long song, targeted audio
   installation was followed by approximately 192 ms of rack/arrangement rebuilding and
   a reported dropout. `setEffects` now uses the existing one-second prefill before that
   work, as `rebuildForShape` already does. This protects playback; it does not make the UI
   rebuild cheap. Follow-up runs with and without diagnostic wrappers reported zero new
   scheduler dropouts across the measured interaction sequence.

No shared audio-engine implementation was changed in this pass. The earlier preset-editor
fix remains: opening/copying a song-owned preset during playback re-banks without resetting
the mixer graph.

## Remaining whole-mix callers reviewed

- Parameter edits: channel gain/pan/send/EQ and effect parameters already use direct setters.
  Existing-lane gain/pan Undo now follows that rule; other Undo differences use the fallback.
- Voice replacement: preset selection, song-local copy and open-editor replacement re-bank
  while playing; stopped audition still uses whole apply. Voice-only shape Undo follows this rule.
- Lane topology/full lane state: lane paste/reset and non-voice shape changes retain whole apply.
- Note scheduling: track Note FX installation/restoration retains the current apply path;
  arrangement edits use `setArrangement` live and whole apply only for stopped audition.
  No new scheduling setter was introduced without an automation/rescheduling contract.
- Whole-song/mix replacement: song load, transport start/stop, saved/draft A/B, cabinet
  mix open/close/save/audition retain whole apply.

The captured caller listing is `quiet-stopped/apply-callers.txt`. This review does not
claim that every broad action is cheap; it distinguishes actions that replace mix/scheduling
state from the measured parameter-only paths.

## Interaction and regression evidence

The final long-song probes exercised:

- Gain and pan gestures followed by Undo: correct restored values, zero graph resets,
  unchanged effect-link identities, and no setter call for the untouched parameter.
- Effect paste and legacy voice-copy handler during playback.
- Panel open/closed, real vertical/horizontal arrangement scrolling, and row density
  switching. Density is the current arrangement size control; this is not a piano-roll zoom test.
- Six actual preset changes: TNGR-2 → MRDR-3 → FRPP-6, twice. Final uninstrumented request-to-
  selection times were 314/65/111 ms for the first pass and 68/99/83 ms for the second.
  These include automation round trips and UI work, not just worklet construction or heard response.
- Actual song-owned editor opening, preset replacement, a control edit and editor Undo.
- Controlled out-of-order warmup races, independent channels, Undo cancellation and song-return cancellation.

The earlier apparent cold-worklet dropout was already present after effect paste; it is
not evidence that TNGR-2 caused that event. Final instrumented and uninstrumented worklet
sequences reported no new scheduler dropouts or worklet faults.

All 21 selected regression suites passed: 15 Node suites covering Mixer lifecycle,
Undo, persistence, layout, automation, scheduling, groups and arrangement; six browser/audio
suites covering chain reapply, mix automation, groups, song switching, voice editing and
WebKit worklet-lane races. Chain reapply retained its rendered output and links; the worklet
race suite confirmed duplicate/stale nodes are stopped. The full repository suite was not run.

Stopped-song expanded checks also passed: delayed edits, slow song switches, interrupted
controls, effect paste/clear/undo for track/group/aux/master, and bounded panel listeners.

Artifacts live under `work/audit/mixer-responsiveness/2026-10-26/`:

- `quiet-stopped/`, `quiet-{song}-{before|after}-{1|2|3}/`, `quiet-summary.json`.
- `quiet-interactions-repeat/`: retained reproduction of the pan-Undo graph reset.
- `quiet-final-parameter-undo/`: final instrumented output/automation checks.
- `quiet-final-uninstrumented/`: final no-wrapper confirmation, 0.4 ms pan-handler p95.
- Per-suite logs and `node-test-results.json` / `browser-test-results.json`.

All harness sessions used isolated storage and blocked song writes. Source song files and
other chats' changes were preserved. Source hashes distinguish the follow-up snapshots.

## Remaining work and Stage 6 decision

Long-song scrolling is now a measured candidate for Stage 6. The final uninstrumented
scroll probe had 66.7 ms frame p95 and 29 long tasks, up to 105 ms. Row-density switching
had 33.4 ms frame p95 and six long tasks, up to 124 ms. Panel transitions also produced
long tasks. None reported a scheduler dropout in the final sequence.

Next: profile those UI tasks to separate layout/paint from JavaScript and narrow row/rack
reconstruction where evidence supports it. Do not introduce a worker merely because the
song is large: these measurements include DOM/layout work that cannot move to a worker.
The expensive effect-paste UI rebuild is another concrete candidate.

Still required for user-facing acceptance: real listening with sustained notes, solo and
effect tails; physical drags and the target device/browser; a longer playback soak; and
piano-roll zoom if that interaction is being signed off. Existing rendered audio regression
checks support engine continuity but do not replace that listening pass. No full repository
suite or physical-device performance claim is made.
