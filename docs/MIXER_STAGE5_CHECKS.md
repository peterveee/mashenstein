# Mixer Stage 5 checks

The opt-in harness `tools/mixer-stage5-check.js` builds the current Mixer entry and
injects audit hooks into that build only. Production Mixer imports no diagnostic
module and incurs no wrapper or sampling overhead.

## What can run on a busy machine

```sh
node tests/mixer-channel-edits.js
node tests/mixer-edit-diagnostics.js
node tools/mixer-stage5-check.js --out=work/audit/mixer-responsiveness/stage5-check
node tools/mixer-stage5-check.js --no-diagnostics --fixture=work/audit/mixer-responsiveness/stage5-check/fixture.json --out=work/audit/mixer-responsiveness/stage5-check-uninstrumented
```

The default browser run is stopped-song correctness, with muted audio and a fresh
profile. It checks delayed Modify Track commits, panel replacement, interrupted range
gestures, a song switch with a deliberately slow file read, effect paste, the stopped
voice-copy handler, and a short synthetic pan gesture. Direct hook calls exercise the
production handlers; this is not a complete click-through of their menus.

The harness serves only its HTML and bundle on a temporary loopback server. It
intercepts song reads with a captured fixture, aborts all write requests, and blocks
other resources. It never runs the Mixer server or regenerates imported indexes.
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
panel, whole-mix or graph-reset operations. Mirror refresh batching and broad arrangement
rebuilds remain measurement candidates. Busy-machine durations are exploratory only.

Raw runs and screenshots are under `work/audit/mixer-responsiveness/2026-10-25/`.
No playback benchmark, listening acceptance or device check was completed in this pass.
