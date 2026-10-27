# Mixer Stage 6 follow-up — 27 October 2026

This pass reduces the remaining density-change and panel rendering cost, and halves the
remaining effect-paste handler work. It does not claim that all UI stalls are gone.

## Changes retained

- `#arrgrid` now has its own stacking context (`isolation: isolate`). The large collection
  of note marks no longer shares stacking work with the rest of the workspace.
- `.arrbars` stops inheriting the two row/header height variables. These variables size
  row containers and headers; note marks do not consume them. Density changes still resize
  the bars through their parent layout, but no longer invalidate every note's inherited style.
- Effect paste/removal/reordering and insert bypass refresh only the affected insert-slot
  block. Shared slot reservations still follow the longest visible chain, and master sizing
  remains independent. Faders, meters, selection and unrelated strip listeners remain mounted.
  The selected channel panel refreshes through its existing cleanup/build path.

Browser-only experiments were run before changing production CSS. Per-row
`content-visibility: auto` did not materially improve density cost and was rejected.
Adding layout/paint containment to grid isolation gave no meaningful additional benefit
and was also rejected. No rows are hidden/unmounted or manually virtualised by these changes.

The isolated grid plus scoped sizing variables reduced density style-recalculation time
from roughly 217 ms to 35 ms in the traced probe. Trace overhead means that figure is
mechanism evidence, not the final acceptance measurement.

## Repeated unprofiled comparison

Three baseline/current pairs, with the second pair reversed, using Super Mario World
(33 strips, 65 bars), Chromium 149.0.7827.55, 1440×900, fresh browser storage and the same
captured fixture. The baseline is the preceding Stage 6 version, not the original Mixer.
Entry/shell snapshots and all remaining dependency hashes were stable across the set.

| Measure | Previous Stage 6 | This pass |
| --- | --- | --- |
| Density frame p95 | 33.4–34.2 ms | 10.2–10.3 ms |
| Largest density long task | 116–118 ms | 59–61 ms |
| Scroll frame p95 | 23.5–24.7 ms | 8.9–15.4 ms |
| Scroll long tasks | 0 | 0 |
| Effect-paste handler | 51.3–51.8 ms | 25.1–27.6 ms |
| Rack rebuilds for effect paste | 1 | 0 |
| Panel-open frame p95 | 17.4–18.5 ms | 9.3–16.6 ms |
| Largest panel-open long task | 67 ms | 51–52 ms |

Ranges show the three runs, not confidence intervals. All six runs passed the no-new-
scheduler-dropout check. Input, scroll and density gestures are scripted; these are not
physical input-to-presented-frame or input-to-speaker measurements. Density still produced
six long tasks in each probe, and panel transitions still produced two. Their costs were
reduced, not eliminated.

The final 30-second playback run with diagnostic wrappers disabled passed, including
real TNGR-2/MRDR-3/FRPP-6 selection, editor open/change/edit/Undo and controlled warmup races.
It recorded 8.5 ms scroll frame p95 with no scroll long tasks, and 8.9 ms density frame
p95 with six long tasks up to 60 ms. Panel-open long-task maximum was 67 ms in that run,
so the lower repeated-pair values are not a guarantee for every transition.

## Correctness checks

- Paste, bypass, clear and Undo for track, group, aux and master targets.
- Insert reservations expand/shrink with the longest visible chain; master keeps its own
  insert block. Replaced controls work after repeated refreshes.
- Existing strip/fader/meter nodes remain connected after effect paste and bypass.
- Ruler/rail alignment at start, middle and end in both density modes.
- Note bars and headers retain the full row height in both density modes despite the
  scoped CSS variables. Bars remain selectable.
- The real bar editor remains above the isolated arrangement, verified through browser
  hit testing and inspection of a rendered screenshot.
- Bounded channel callbacks/listeners and gain/pan Undo's effect-link preservation remain covered.

All 11 selected regression suites passed: mixer-scroll, mixer-channel-edits,
mixer-channel-sync, mixer-level-undo, mixer-layout, mixer-undo, mixer-metering,
mixer-loop, arrangement, mixer-session and mixer-freeze-restore. The latter two ran
against a temporary read-only server built from the final entry and shell. Expanded
stopped-song slot checks also passed with diagnostic wrappers disabled. The full repository
suite was not run.

One initial overlay check incorrectly expected `#ctxmenu`: right-clicking a bar opens
`#regionedit`. The screenshot showed the correct editor. The harness selector was corrected
and that failed run retained as `menu-selector-failure/`; no product workaround was made.

## Evidence and reproduction

Artifacts are under `work/audit/mixer-responsiveness/stage6-followup/`:

- `baseline/`, `before-{1,2,3}/`, `after-{1,2,3}/`, `summary.json`.
- `row-experiment/`, `isolation-experiment/`, `grid-containment-experiment/`,
  `density-experiment/`: temporary CSS experiments and timeline traces.
- `slots-final/`, `final-slots-uninstrumented/`, `final-uninstrumented/`.
- Per-suite regression logs and fixture-server reload/freeze results.

The comparison baseline uses `--entry-file` and `--shell-file` pointing at the saved
snapshots. `--ui-css` loads a stylesheet only into the test page for experiments and records
its hash. No experimental stylesheet or diagnostic wrapper is imported by production.

Every browser run served a freshly bundled current page or an explicit baseline snapshot.
Read-only fixture servers avoided the Mixer builder's source/index writes. The final shell
was visually inspected after rebuilding the served test page; unrelated existing shell and
song edits were preserved.

## Still pending

Density changes and panel transitions retain shorter long tasks. Further reduction needs
more evidence before changing the layout/painting architecture. Real listening, target-device
and physical-drag testing, piano-roll zoom and a longer soak remain acceptance gates.
These improvements do not constitute full-plan sign-off.
