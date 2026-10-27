# Mixer Stage 6 results — 27 October 2026

Later density, panel-rendering and targeted-rack improvements are recorded in
[the Stage 6 follow-up](MIXER_STAGE6_FOLLOWUP_2026-10-27.md). The measurements below
describe the first Stage 6 pass.

Implemented two measured UI improvements: scrolling now updates only the ruler's CSS
variables, and effect-chain edits update the arrangement's FX shortcut without rebuilding
its notes. The remaining row-density and panel-transition stalls are not claimed resolved.

## Evidence and decisions

A Chromium CPU/style profile identified 1,782 ms of style recalculation during the long-song
scroll probe. `syncArrangementScroll` wrote `--arr-scroll` on `#upperwork`, so every note
cell inherited the changed variable even though only `#barsarea` consumed it. The variable
and ruler width now live on `#barsarea`; vertical-only scroll events also avoid redundant
writes. The same profiled probe then spent 27 ms in style recalculation.

CPU profiling itself disturbed playback and both CPU-profile sessions failed the strict
no-new-dropout assertion. Those failures are retained under `profile-before/` and
`profile-scroll-fixed/`; they identify costs and are not playback acceptance runs.
A separate timeline-trace run passed. It showed the remaining scrolling/density cost
concentrated in painting/compositing rather than a transferable pure-data computation.
No worker or grid virtualisation was introduced on that evidence.

Effect paste spent about 183–190 ms synchronously, including a complete arrangement build.
The track/group insert chain changes the arrangement header's FX shortcut, not its note
content. `syncArrangementEffectShortcut` now adds/removes that shortcut in place. Undo
refreshes it too, fixing a stale shortcut after restoring an empty/nonempty chain. Header
signature tracking records this separately, so a later note refresh sees the current
shortcut state. The rack and selected channel panel still refresh through their existing path.

## Repeated comparison

Three sequential baseline/current pairs on Super Mario World (33 strips, 65 bars), with
pair two reversed. Baseline entry and scroll-module snapshots were captured immediately
before Stage 6. Both variants used identical remaining dependencies, shell, fixture,
Chromium 149.0.7827.55 and 1440×900 viewport. Source hashes are recorded per report.

| Measure | Baseline, three runs | Current, three runs |
| --- | --- | --- |
| Scroll frame p95 | 75 / 75 / 75 ms | 24.5 / 24.9 / 25 ms |
| Scroll long tasks | 44 / 44 / 44 | 0 / 0 / 0 |
| Effect-paste synchronous handler | 183.3 / 182.9 / 189.8 ms | 50.9 / 50.5 / 47.4 ms |
| Effect-paste arrangement builds | 1 / 1 / 1 | 0 / 0 / 0 |
| Arrangement nodes retained by paste | no / no / no | yes / yes / yes |

All six unprofiled runs passed, with no new reported scheduler dropouts across the
interaction sequence. These are synthetic browser controls, not physical input or
input-to-speaker measurements. Frame p95 around 25 ms is an improvement, not a claim of
sustained 60 fps. The three-second scroll sequence moves through large fractions of the
grid; it is a repeatable stress probe rather than a recording of ordinary hand movement.

The final run with diagnostic wrappers disabled also passed: scroll frame p95 25 ms,
zero scroll long tasks and no new reported scheduler dropout. It included actual
TNGR-2/MRDR-3/FRPP-6 selections, song-owned editor open/change/edit/Undo and controlled
warmup races, in addition to the UI checks.

## Correctness and validation

- Ruler and horizontal scrollbar match the grid at start, middle and end in compact
  and full-height modes. Rows remain mounted; bar click selection still works.
- Effect paste/clear/Undo works on track/group/aux/master. Track/group FX shortcuts
  correctly appear/disappear and restore on Undo.
- Repeated panel rebuilds retain bounded callbacks/listeners. Gain/pan Undo preserves
  effect-link identities and only writes the parameter that changed.
- The new browserless scrolling regression covers bidirectional rail sync, playhead
  paging, fitting/reset, listener bounds and avoiding ancestor CSS writes.
- The final rendered screenshot was inspected: ruler, track columns, selected bar,
  channel panel and rack remain aligned.
- Focused suites: scrolling, channel edits/sync, level Undo, layout, Undo, metering,
  loop and arrangement passed. Workspace/session and freeze-restore require a running
  page; their first attempts failed because port 8010 was not serving. They were rerun
  against a temporary read-only fixture server using the current entry and shell; both
  passed. All 11 selected suites passed after those prerequisites were supplied.

The test server acknowledges diagnostic POSTs in memory, rejects other writes, and serves
only its bundle, HTML and captured mix data. Freeze-bundle test writes are confined to
its fresh browser profile's origin-private filesystem. No song source/index was regenerated;
unrelated working-tree changes were preserved. No production diagnostics were installed.

## Reproducing and reading artifacts

Artifacts: `work/audit/mixer-responsiveness/stage6/`:

- `baseline/`: entry, scroll module and shell snapshots.
- `before-{1,2,3}/`, `after-{1,2,3}/`, `summary.json`.
- `profile-before/`, `profile-scroll-fixed/`: CPU profiles and metrics, with profiling failures retained.
- `trace-scroll-fixed/`: timeline traces and a passing interaction report.
- `stopped-final/`, `final-uninstrumented/`: final browser checks/screenshots.
- Per-suite logs, `test-results.json`, and the fixture-server rerun results.

Current run:

```sh
node tools/mixer-stage5-check.js --playback --interactions --seconds=1 --song=super-mario-world --fixture=work/audit/mixer-responsiveness/2026-10-26/quiet-stopped/fixture.json --out=work/audit/mixer-responsiveness/stage6/current
```

For the paired baseline, additionally pass
`--entry-file=work/audit/mixer-responsiveness/stage6/baseline/mixer-entry.js` and
`--scroll-file=work/audit/mixer-responsiveness/stage6/baseline/mixer-scroll.js`.
`--profile-ui` records CPU profiles/metrics; `--trace-ui` records rendering timeline
traces/metrics. Neither is suitable as an uninstrumented acceptance result.

## Remaining work

Row-density changes are still expensive: current frame p95 33.4–33.6 ms, six long tasks
per probe and maxima of 117–119 ms. Panel transitions retain roughly two long tasks each.
The rack portion of effect paste still costs approximately 50 ms. Further work should
investigate rendering boundaries and narrower rack updates, with visual and interaction
checks before considering more complex virtualisation. No hidden/offscreen rows were
removed or made inaccessible in this pass.

Final acceptance still needs a longer soak, real listening with sustained notes/solo/effect
tails, physical dragging, target-device/browser testing and piano-roll zoom. The measured
scrolling and effect-paste improvements are verified; the entire responsiveness plan is
not yet signed off.
