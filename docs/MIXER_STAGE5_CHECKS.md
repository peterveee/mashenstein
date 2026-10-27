# Mixer Stage 5 checks

The opt-in harness `tools/mixer-stage5-check.js` builds the current Mixer entry and
injects audit hooks into that build only. Production Mixer imports no diagnostic
module and incurs no wrapper or sampling overhead.

## What can run on a busy machine

```sh
node tests/mixer-channel-edits.js
node tests/mixer-edit-diagnostics.js
node tests/mixer-channel-sync.js
node tests/mixer-level-undo.js
node tests/mixer-preset-races.js
node tests/mixer-voice-window.js
node tools/mixer-stage5-check.js --out=work/audit/mixer-responsiveness/stage5-check
node tools/mixer-stage5-check.js --no-diagnostics --fixture=work/audit/mixer-responsiveness/stage5-check/fixture.json --out=work/audit/mixer-responsiveness/stage5-check-uninstrumented
```

The default browser run is stopped-song correctness, with muted audio and a fresh
profile. It checks delayed Modify Track commits, panel replacement, interrupted range
gestures, a song switch with a deliberately slow file read, effect paste, the stopped
voice-copy handler, and a short synthetic pan gesture. Direct hook calls exercise the
production handlers; this is not a complete click-through of their menus.

The harness serves only its HTML and bundle on a temporary loopback server. It
intercepts song reads with a captured fixture, acknowledges `/diagnostics-log` POSTs
in memory without writing them, aborts other write requests, and blocks other resources. It never runs the Mixer server or regenerates imported indexes.
It closes its browser context and fixture server when done.

Artifacts: `report.json`, `fixture.json`, and `channel-panel.png` (or `failure.png`).
Reports identify the source entry, bundle, fixture, browser, viewport, settings from
existing health diagnostics, song, strip count and bar count. A failed run exits nonzero.

## Bounded diagnostics

`tools/lib/mixer-edit-diagnostics.js` counts these synchronous operations:

- Whole-mix application, re-banking and arrangement installation.
- The engine graph-application entry point and actual mixer reset calls.
- Rack, arrangement and channel-panel builds, plus channel-control mirroring.
- Effect-chain edits and arrangement-edit commits.

Each of at most 32 named counters retains at most 256 duration samples. Counts, total
and maximum cover the current scenario; percentile values describe the retained tail.
Nested durations overlap and must not be added together. Returned promises are left
unchanged: measured time stops when the synchronous invocation returns. These are not
input-to-presented-frame or input-to-heard-audio measurements. Graph reset counts do not
count every individual node allocation or every targeted effect-chain rebuild.

Playback probes reuse the existing performance-health snapshot for scheduler margin,
work and dropout fields. The bounded probe retains up to 4096 frame intervals and 256
long tasks, samples health roughly once per second, and disconnects on completion.
No new perpetual sampler is installed.

## Quiet-window comparisons

Use the same checkout dependencies, fixture, browser, viewport, cache preferences and
machine for both variants. Pause competing work. Alternate baseline and current runs
at least three times for each of `hub`, `megamix` and `super-mario-world`, giving every
run a unique output directory. The entry-only baseline is deliberately explicit:

```sh
node tools/mixer-stage5-check.js --playback --seconds=30 --song=hub --entry-ref=0bb55b05 --fixture=work/audit/mixer-responsiveness/stage5-check/fixture.json --out=work/audit/mixer-responsiveness/stage5-hub-before-1
node tools/mixer-stage5-check.js --playback --seconds=30 --song=hub --fixture=work/audit/mixer-responsiveness/stage5-check/fixture.json --out=work/audit/mixer-responsiveness/stage5-hub-after-1
```

`--entry-ref` overlays only `tools/mixer-entry.js`; all other dependencies remain the
current checkout. It is a controlled entry-file comparison, not a historical whole-repo
benchmark. Both variants receive identical diagnostic hooks. Compare report hashes and
song dimensions before interpreting numbers. Use `--no-diagnostics` for a separate
uninstrumented confirmation; it has no wrapper counters, so graph-count assertions are
skipped. Default stopped-song runs remain useful when no quiet window is available.

The playback scenario warms for two seconds, performs a 150-event channel-pan drag,
then samples until the requested interval ends (1–60 seconds). It subsequently checks
effect paste and the voice-copy handler while playing. It is not a full interaction
soak. Full preset-picker browsing, worklet-family changes, long-song scrolling/zoom,
solo and effect-tail preservation, physical drags and listening still need dedicated
checks. In particular the current editor accepts `saveToSong` but does not call it;
the voice-copy probe invokes that legacy handler directly and is not evidence of a
currently reachable editor interaction.

## Results on 25 October 2026

Stopped-song browser runs passed with and without diagnostic wrappers. The slow-read
scenario exposed a pending edit committing to the old song after a switch was requested;
cancellation now happens at the start of `selectSong`, before paint/fetch awaits.

Effect paste previously built the selected panel twice; the explicit second build was
removed because `buildRack` already calls `selectLane`, which builds the panel. The final
instrumented check recorded one panel build, zero whole-mix applies and zero graph resets.
Twenty channel-pan inputs caused twenty mirror refreshes and zero rack, arrangement,
panel, whole-mix or graph-reset operations. This was before the batching follow-up below;
broad arrangement rebuilds remain a measurement candidate. Busy-machine durations are exploratory only.

Raw runs and screenshots are under `work/audit/mixer-responsiveness/2026-10-25/`.
No playback benchmark, listening acceptance or device check was completed in this pass.


## Extended checks and follow-up through 26 October 2026

```sh
node tools/mixer-stage5-check.js --extended --out=work/audit/mixer-responsiveness/stage5-extended
node tools/mixer-stage5-check.js --playback --extended --seconds=1 --out=work/audit/mixer-responsiveness/stage5-playback-smoke
```

The short playback smoke still runs the full 150-event drag (about five seconds), plus
warmup and follow-up actions. `--seconds=1` skips an additional soak; it is not a one-second
entire test. It remains muted and uses fresh browser storage.

Extended stopped-song checks cover track/group/aux/master effect paste, empty chains,
undo, preset choice/undo, twelve panel close/open cycles, repeated/interrupted effect-card
drags, and a synchronous burst of twenty pan edits. The latter verifies immediate model
and live engine updates, a single deferred mirror flush, and a matching rack pan display.
Spaced events can still require one flush per event; batching saves repeated work within
one frame, not across arbitrary time intervals.

Extended playback checks exercise the actual song-owned editor opening, switching a
preset while it is open, a real editor control input and its Undo button, plus controlled
warmup races. The race test temporarily defers `warmLaneVoice` using explicit promises;
it checks the production selection logic during real muted playback without creating
expensive worklet warmups. It does not establish real worklet startup speed or cleanup.

Fixes and evidence:

- Pending preset choices are tracked per lane, rather than one global latest choice.
  Different channels can finish independently; undo and song changes clear pending work.
- Panel rebuilding no longer accumulates drag-over listeners on its persistent root.
  Mouse-up listeners are registered only while a card drag is armed and aborted on rebuild.
  The pre-fix twelve-cycle check grew from 25 to 37 drag-over listeners; the fixed check
  stayed at one. Tested callback/syncer/meter counts also remained bounded. This is not a
  whole-heap leak proof.
- Channel mirroring now coalesces by lane/song until the next frame, scopes lookups to
  the mounted strip, and cancels obsolete work on rack/song replacement. The rack's pan
  knob now follows edits made in the channel panel. Control and live audio writes remain
  synchronous. A twenty-event same-task burst produced one mirror flush.
- The active editor window still called whole-mix apply after creating a song-local copy.
  Opening it during playback reproduced one graph reset. Both initial opening and
  open-editor preset replacement now re-bank only while playing, retaining whole-mix apply
  for the stopped audition bank. The final browser checks record zero graph resets for
  opening, replacing, editing and undoing the song-owned preset.

Expanded stopped-song checks and muted playback checks passed. The latter also passed
with diagnostic wrappers disabled. Focused Node suites cover callback lifecycle, bounded
mirroring, preset races, editor-window playback/stopped behavior, undo, draft persistence,
save ordering, diagnostics and layout contracts. Only the isolated bundle was rebuilt;
no shared server or unrelated dirty files were changed.

Evidence is under `work/audit/mixer-responsiveness/2026-10-25/extended-batched/` and
`work/audit/mixer-responsiveness/2026-10-26/playback-editor-final/` (instrumented) and
`playback-uninstrumented-final/`. Earlier failures are retained beside the successful runs.

## Quiet-machine completion pass — 26 October 2026

See [the quiet-machine results](MIXER_STAGE5_RESULTS_2026-10-26.md) for the 18-run
controlled comparison, measured follow-up fixes, regression results and remaining acceptance.
Pan-handler p95 improved across all three songs; effect paste avoids a graph reset.
The follow-up also removes unnecessary graph resets from existing-lane gain/pan Undo and
protects effect-paste UI reconstruction with the existing scheduler prefill.

```sh
node tools/mixer-stage5-check.js --playback --extended --interactions --seconds=30 --song=super-mario-world --out=work/audit/mixer-responsiveness/stage5-interactions
```

`--interactions` requires playback and is a quiet-machine check. It covers parameter Undo,
long-song scrolling, row-density switching, panel transitions and real TNGR-2/MRDR-3/FRPP-6
selections; it rejects new reported scheduler dropouts across that sequence. The controls
remain synthetic, and density switching is not a piano-roll zoom test. The existing
controlled warmup-race checks remain separate from actual worklet selection.

Reports now include input-handler samples, scheduler health during the drag, and a hash
of every bundled dependency plus the shell. This makes changes from other chats visible
when comparing runs. No diagnostic wrapper is imported into the production Mixer.

Automated coverage has advanced; listening, target-device/physical drags, piano-roll zoom
and longer soak acceptance remain. Stage 6 has measured UI candidates: long-song scrolling,
row-density changes and effect-paste rack/arrangement reconstruction. Worker changes still
need evidence that the expensive work is transferable pure computation.

## Stage 6 follow-up

The measured scrolling and effect-paste UI changes, repeated comparisons and remaining
limits are recorded in [Stage 6 results](MIXER_STAGE6_RESULTS_2026-10-27.md). The same
harness now checks ruler/rail alignment and preserves the mounted arrangement on effect
paste. `--entry-file` and `--scroll-file` provide explicit source snapshots for comparisons;
`--profile-ui` and `--trace-ui` are opt-in profiling modes with their own timing overhead.
