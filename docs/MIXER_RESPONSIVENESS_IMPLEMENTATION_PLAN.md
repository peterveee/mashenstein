# Mixing desk responsiveness — implementation plan

Written 21 October 2026. Intended executor: Luna Max.

## Objective

Make editing, scrolling, opening panels, and operating the Song Mixer feel responsive
while music plays. Reduce unnecessary main-thread work without changing the music,
weakening recovery, breaking undo, or increasing audible control latency.

This is an implementation specification, not a report of measured improvements. The
source observations below were inspected on 21 October; recheck them before editing.
The user requested this plan, not implementation in the planning session.

Related documents:

- [Audio audit](AUDIO_SYNTH_AUDIT_PLAN.md).
- [Audit supplement](AUDIO_SYNTH_AUDIT_SUPPLEMENT.md).
- [Synth candidates](SYNTH_OPTIMISATION_CANDIDATES.md).

## Instructions for the implementing agent

1. Read applicable `AGENTS.md` files and inspect `git status --short` first. Preserve all
   existing unrelated changes. Never reset, clean, or overwrite the working tree.
2. Implement in the stage order below. Inspect callers before changing a shared helper.
3. Complete and validate each stage before widening scope. Do not combine a persistence
   migration, an undo redesign, and an audio graph change into one unreviewable patch.
4. Keep existing musical, save, and interaction semantics unless a specific change below
   requires otherwise. Avoid new dependencies and framework conversions.
5. Treat proposed helper names and APIs as designs, not existing exports. Verify source
   symbols with `rg`; line numbers from a previous session are not authoritative.
6. For conditional stages, collect evidence and implement only the narrow change justified
   by it. Record a reason if an optimisation is already present or has no measurable value.
7. Do not claim browser, listening, or device acceptance from source tests or a build.
8. Do not spawn additional agents unless the user or applicable repository instructions
   explicitly authorise delegation.

## Current architecture and verified starting points

| Area | File / symbols | Observation and consequence |
| --- | --- | --- |
| Desk state | `tools/mixer-entry.js`: `editMix`, `mixFor`, `draft` | `editMix` clones the current mix, mutates it, serialises all drafts to localStorage, reconciles frozen state, and updates status. Trace which high-frequency inputs use it. |
| Desk undo | `mixer-entry.js`: `pushUndo`, `undoStack`, restore path | Whole mix/arrangement snapshots, 200-entry limit, same-tag edits coalesced within 700 ms. This is not the generic voice-editor history. |
| Voice-editor undo | `tools/mixer-undo.js`: `createUndoHistory` | Explicit gestures already group undo entries, but `touch()` still captures after every change. Preserve all current consumers. |
| Dirty/status UI | `mixer-entry.js`: `isDirty`, `updateStatus` | Mix/arrangement/variant comparisons and multiple UI updates occur here. Saved-file state and browser recovery state are distinct. |
| Engine application | `mixer-entry.js`: `applyToEngine`, `editFx`, `editGroup` | Both broad application and direct parameter paths exist. Do not assume every slider rebuilds the graph. |
| Playback UI | `mixer-entry.js`: `tick`, `followArrangementVisual` | Labels and playhead are written each frame; highlight selection queries DOM before its existing same-step/result early return. |
| Arrangement scroll | `tools/mixer-scroll.js`; integration in `mixer-entry.js` | Geometry caching already exists. Preserve and audit invalidation; do not implement a duplicate cache. |
| Metering | `mixer-entry.js`: `METER_INTERVAL_MS`, visibility/relief gates | Normal interval is already 33 ms. Hidden-meter skipping, reuse of lane reads, and pressure relief already exist. |
| Grids | `tools/mixer-bar-grid.js` | Row and horizontal windowing support already exists. Verify actual caller configuration before proposing virtualisation. |
| Visualiser | `tools/mixer-visualiser.js` | Desk drawing already pauses behind the full-screen visualiser. |
| Diagnostics | `tools/mixer-perf-diag.js`, frame/loop diagnostics in entry | Extend existing bounded diagnostics instead of adding another perpetual telemetry loop. |
| Recovery | Entry: `persistLocalSongs`, `persistLocalSave`, `persistFrozenIntent` | Multiple stores have different ownership. Draft recovery is not the same as explicit Save. |

## Non-negotiable behaviour

- A fader responds visually immediately and reaches the live audio parameter promptly.
- Playback timing, output latency settings, lookahead, and quality do not change merely
  to hide UI stalls. Transport uses the existing audio/heard clock, never an accumulated
  animation-frame counter.
- Undo restores the complete intended edit, including arrangement state where applicable.
- M8TRX, desk, and voice-editor histories remain correctly scoped. No cross-song undo.
- Save captures the current intended song state, including an unfinished control gesture.
- Changes after a Save snapshot remain dirty; a late acknowledgement cannot mark them saved.
- Reload recovery and explicit Save retain their existing meanings and storage formats
  in the initial implementation.
- No accidental song source writes during automated testing. Use isolated browser storage
  and test/scratch fixtures; intercept save requests when testing request contents.
- Frozen playback cannot remain stale after an edit that changes its sound.
- Closing or changing panels releases pending UI work and retained detached DOM references.

## Stage 0 — baseline, dependency map, and reproducible scenarios

### Read and map

Inspect `tools/mixer-entry.js`, `tools/mixer-undo.js`, `tools/mixer-scroll.js`,
`tools/mixer-bar-grid.js`, `tools/mixer-select.js`, `tools/mixer-voice-editor.js`,
`tools/mixer-banger.js`, and relevant tests before choosing extraction boundaries.

Find all calls to `editMix`, `pushUndo`, `applyToEngine`, `updateStatus`, localStorage
writes for draft/arrangement/variant data, and the generic undo history. Create a small
table in the implementation report: caller, state mutated, live audio operation,
persisted key, undo owner, and refresh work. Include restore/reset/import/delete paths,
not only ordinary control inputs.

### Baseline scenarios

Use the same browser build, viewport, device, song, settings, and cache state for A/B.
Select a normal cabinet song, a dense multitrack song, and a long imported/scratch song
already available in the checkout. Record IDs, lane/bar counts, and source revision.

Run each scenario at least three times after a consistent warm-up:

1. Play for 30 seconds with no interaction.
2. Drag one lane gain continuously for five seconds, release, then undo.
3. Drag a group control and a voice-editor control similarly.
4. Scroll the arrangement horizontally and vertically during playback.
5. Open/close the voice editor and effects panel, then switch selected lanes.
6. Edit, switch songs, return, and reload to check recovery.
7. Edit during playback, Save through an intercepted test route, edit again before its
   acknowledgement, and verify dirty state remains correct.

Measure input-handler duration, next presented-frame latency where observable, frame
intervals, long tasks, scheduler lateness/margin, storage serialisation/write duration,
undo capture count, and graph rebuild count. Record p50/p95 and worst observations;
small samples are descriptive, not statistically precise percentiles.

For audible responsiveness, distinguish calling an audio setter from hearing the change.
Use existing render/capture facilities or an explicit listening check for the latter.
Do not label handler-to-setter timing as end-to-end audio latency.

### Instrumentation rules

Use development-only counters and bounded sample buffers. Avoid console logging on every
input or animation frame. Feature-detect optional browser performance APIs. Export reports
under `work/audit/mixer-responsiveness/<run-id>/`; include instrumentation overhead and a
lightweight uninstrumented confirmation. No new always-on user-facing diagnostics.

**Exit:** a baseline report and a verified caller map, with the first bottleneck identified.

## Stage 1 — separate persistence from continuous editing

### Design

Create a small testable persistence coordinator, for example
`tools/mixer-draft-persistence.js`. Keep the current localStorage schema initially.
It should accept injected storage, timers, and error reporting so tests need no browser.

Suggested responsibilities:

```text
markDirty(storageKey)   mark a registered store revision dirty and schedule a checkpoint
flush(storageKey?)      synchronously write latest dirty state; return success/failure
hasPending()           report dirty stores, not merely whether a timer exists
dispose()              cancel callbacks; caller explicitly decides whether to flush first
```

Register a serializer/provider per store. It must read the latest state for that store,
not a captured `trackId` or a stale object. Increment a revision whenever it is dirtied.
Only clear the revision successfully persisted. On quota/security/serialisation failure,
retain dirty state and report through the existing action/error UI without repeated spam.

Start with a short trailing delay (150–250 ms) and a maximum checkpoint delay of 1 second
under continuous input. These are initial tuning values, not guarantees that timers run
on time in a suspended page. Flush at gesture end and before state-destructive operations.

### Integration sequence

1. Route only `editMix` draft persistence through the coordinator first. Keep its in-memory
   mutation and live audio semantics synchronous.
2. Audit every other writer to that same storage key. Ensure undo, reset, deletion, and
   restore either use the coordinator or explicitly invalidate pending writes. Otherwise
   an old callback can resurrect deleted/reset data.
3. Add explicit flush boundaries for Save, Save Copy, song change, relevant reset/import,
   and a controlled reload. Use `visibilitychange` to hidden and `pagehide` as best-effort
   final checkpoints; do not rely on `beforeunload` or asynchronous unload writes.
4. Extend to other high-frequency stores only after mapping their ownership. Do not
   indiscriminately delay small preference writes or explicit saves.
5. Keep explicit Save based on authoritative in-memory state. A pending browser checkpoint
   must not cause Save to send an old version.

Deferring persistence introduces a bounded crash-loss window between checkpoints. Document
it honestly. If retaining every input event is required, this stage needs a different
durability design. Do not claim asynchronous IndexedDB alone removes that window.

### Tests and acceptance

- Hundreds of updates within one short gesture produce the final value and coalesced
  writes; advancing the fake clock during a long drag produces bounded checkpoints.
- Flush writes the latest value exactly once when nothing changes afterward.
- Edits to song A followed immediately by song B do not lose or misattribute either edit.
- Undo/reset/delete cannot be overwritten by a delayed checkpoint.
- A failing write retains pending state; a later successful retry clears it.
- Save during a gesture sends current data, and reload after release restores it.
- Normal drag input handlers no longer synchronously serialise all drafts on every event.

Do not move all storage to IndexedDB in this stage. Consider that separately only if the
remaining checkpoint pauses are measured to be material.

## Stage 2 — make gesture and undo work bounded

### Two histories, two changes

Desk undo already snapshots only when its 700 ms tag coalescing opens a new step. Do not
claim it snapshots every pointer event. Trace long drags, where gaps can currently split
a gesture, and preserve non-pointer behaviour before introducing explicit transactions.

The generic voice-editor helper captures state on every `touch()`, even inside a gesture.
That is a separate optimisation target.

### Generic helper implementation

Preserve the public API unless all callers are migrated together. Define transaction state
explicitly: before snapshot, whether a mutation was reported, and whether committed.
`begin()` retains the prior stable snapshot once. During a transaction, `touch()` marks
change without repeated full captures. `end()` captures once, compares final state to
before, and records one entry only for a net change. An implicit click transaction still
captures and commits immediately.

`undo()` must finalise any active transaction before undoing it. Define `canUndo()` during
an active gesture: allow an undo action when a mutation is pending, but a net-zero gesture
must not leave a phantom entry. Inspect callers of `sync()` and `reset()` and preserve
their baseline semantics; never discard a pending edit accidentally.

### Desk transaction integration

If baseline evidence justifies it, add explicit begin/end gesture support to the desk's
existing stack rather than replacing it with the voice-editor history. Wire shared fader
builders first. Support pointerup, pointercancel, lost capture, blur, keyboard edits,
double-click reset, and panel closure. Preserve current cancellation semantics: a browser
pointer cancellation must not silently roll back a value already heard unless that is
the existing control contract.

One snapshot per meaningful gesture; no 700 ms split within a continuous drag. Keep a
documented fallback coalescing path for controls not yet migrated. Song identity belongs
to the transaction, not a mutable global read at completion. Finalise before switching.

### Tests and acceptance

Extend `tests/mixer-undo.js` with behavioural tests, including capture-call counts:

- A 500-touch explicit gesture uses a bounded number of captures, not 500 snapshots.
- Multiple gestures undo separately; click, keyboard, and reset edits remain undoable.
- Returning to the original value creates no new completed undo entry.
- Undo during a gesture restores its before state; later pointerup adds nothing stale.
- Reset/preset switch cannot restore another preset's state.
- M8TRX and desk histories remain separate; arrangement snapshots still restore correctly.

Do not implement field-level undo patches or persistent immutable data structures in this
stage. They are larger changes than required to remove repeated captures.

## Stage 3 — coalesce secondary edit work

### Keep immediate work immediate

In each high-frequency path, keep the control's own visual value, authoritative state,
live AudioParam update, and correctness-critical frozen invalidation synchronous.
Coalesce duplicate UI work into one frame: mirrored labels, dirty/status UI, and derived
panel refreshes. Deduplicate tasks by purpose and song/revision.

Investigate splitting frozen handling into immediate invalidation and deferred presentation
only if its current semantics permit it. Do not defer a stale frozen buffer continuing to
play just because `reconcileFrozen()` is expensive.

### Dirty-state comparisons

Cache expensive dirty comparisons by explicit mix/arrangement/variant revisions. Every
mutation, undo, restore, Save acknowledgement, and reset must invalidate the relevant
cache. If complete mutation coverage cannot be demonstrated, retain the authoritative
comparison and merely call it less often. A missed invalidation that disables Save is
worse than the existing cost.

Keep `updateCpu()` and diagnostic refresh out of each edit-driven status refresh if the
existing diagnostic cadence can supply them. Avoid repeated DOM writes when text/classes
already match. Cache mirrored control references only with clear rebuild/disposal hooks.

### Optional narrow copy reduction

After the above, measure `editMix` cloning separately. If it remains significant, introduce
specialised immutable updates for simple gain/pan/EQ fields: copy only changed containers
and retain untouched branches. Audit mutation ownership first. Preserve a safe full-copy
fallback for arbitrary mutator callbacks. Do not globally replace cloning with in-place
mutation while undo or saved baselines may share references.

**Acceptance:** live controls remain immediate, secondary refresh occurs at most once per
frame, Save is always correct, and edited/undo/saved objects cannot corrupt one another.

## Stage 4 — reduce playback UI work

### Arrangement highlighting

`followArrangementVisual()` currently does DOM discovery before its same-result return.
Move a semantic early-out ahead of DOM queries. Its key must include more than the step:

- Current displayed/arrangement step and relevant transport discontinuity generation.
- Song/view identity, selected lane, and grid generation.
- Recording/content generation and visual preference changes.

A same-step edit or selection change must still update highlights. Invalidate on row
rebuild, recording marks, fold/zoom/view changes, stop, seek, and restoration as applicable.
Do not share one cache key across independent arrangement/M8TRX views.

Then consider storing cell/attack references when building rows. Retain only mounted
elements and clear indexes at rebuild/disposal. Limit work to visible rows where existing
visibility infrastructure permits. Avoid a second full-song DOM index that defeats
virtualisation.

### Labels and playheads

Compute and write time/bar labels only when the displayed strings change. Keep playhead
position smooth and derived from the heard clock. Evaluate transform-based movement only
after inspecting the CSS containing block: `translateX(100%)` means the playhead's own
width, not the timeline width. Use measured track geometry or a suitable full-width wrapper.
Preserve zoom, resize, seeking, loop wrap, and pinned headers.

### Geometry and frame ordering

Use the existing `mixer-scroll.js` geometry cache. Verify invalidation for resize, panel
drag, row rebuild, density, fonts, zoom, and visibility changes. Do not mark it dirty every
frame. Batch necessary reads before style writes where possible. Read current scroll
position rather than assuming the user has not scrolled.

Keep transport synchronisation above drawing gates in `tick()`. Do not stop the entire
animation loop simply because visual work is idle: it currently participates in seek/loop
synchronisation. Decoupling that is a separate transport change, outside this stage.

### Tests and acceptance

- Repeated frames within one step and unchanged generation perform no highlight queries.
- Changing selection or recording a note within that same step refreshes correctly.
- Seek, stop, loop wrap, and switching views clear stale classes and echoes.
- Long-song scrolling, resizing, and zooming retain alignment and manual scroll behaviour.
- Detached rows are not retained through caches/timers.
- Labels avoid redundant writes; playheads remain smooth and correctly placed.
- Browser traces show reduced relevant work, not merely a relocated unmeasured callback.

## Stage 5 — incremental engine updates, only where needed

Classify every `applyToEngine()` caller as parameter-only, lane topology, arrangement,
or whole-song replacement. Existing direct setters should remain the preferred route.

For a proven unnecessarily broad caller, use an existing engine setter if one exists.
Only add a narrow setter when ownership and automation behaviour are understood. Preserve
effective gain scaling, group routing, master defaults, solo, and already-scheduled notes.
Do not rebuild the song for a fader change, but do not bypass required arrangement
rescheduling for a note edit.

Count graph/rack rebuilds in diagnostics during a five-second control drag. Verify audio
changes with rendered/captured output where practical. Test active effect tails, undo,
and quick parameter changes around preset replacement.

**Exit:** parameter-only interactions do not cause unnecessary full graph rebuilds.
If this is already true for the measured controls, record it and make no engine change.

## Stage 6 — expensive jobs and editor opening, evidence-gated

### Background preparation

Choose one measured long task: Banger calculation, arrangement transformation, export
preparation, or an equivalent pure-data operation. Establish its inputs and outputs first.

For a worker candidate, send an immutable input snapshot plus job ID, song ID, and source
revision. Accept results only if all identities still match. A newer job invalidates the
older job immediately. Terminate obsolete dedicated work or add cooperative cancellation
where feasible; discarding a result alone does not stop its CPU use.

Use a bounded queue, normally one active job and one latest replacement. Do not transfer
ownership of buffers still used by playback. Measure structured-clone cost and peak memory
before declaring a worker faster. Keep DOM and live AudioContext operations on their
existing owners. Preserve offline rendering's separate timing/initialisation contracts.

If workers add more cost than they save, use bounded main-thread chunks with real yields
and cancellation checks. A chain of resolved promises does not reliably give rendering
and input a turn. Show pending state before beginning work; retain the previous valid
song until a replacement succeeds.

### Incremental editors

Measure panel opening before modifying it. For expensive panels, create a usable shell
and visible controls first, defer hidden graphs/sections, and render them on first reveal.
Attach a generation token to each deferred callback; cancel it on close, song/preset
switch, or replacement. Restore focus/scroll intentionally. Avoid layout jumps, duplicate
listeners, and stale callbacks writing into a reopened panel.

Audit existing grid virtualisation configuration before adding it to another view. Test
selection, drag destinations, keyboard navigation, and accessibility when rows/bars are
not mounted. Do not virtualise a view merely because it has many DOM nodes if no measured
cost justifies the added interaction complexity.

**Exit:** the chosen operation no longer blocks interaction materially, stale results cannot
apply, and repeated open/close/cancel sequences leave bounded resources.

## Test execution and browser verification

Read test prerequisites before running them. Relevant existing suites include:

```sh
node tests/mixer-undo.js
node tests/mixer-session.js
node tests/mixer-freeze-restore.js
node tests/mixer-loop.js
node tests/mixer-metering.js
node tests/mixer-layout.js
node tests/mixer-export.js
node tests/arrangement.js
```

Run the subset appropriate to each change. Register new persistence/gesture behavioural
tests in `tests/run-all.js` following its browser-suite rules. Use fake timers and injected
storage for deterministic coordinator tests; use a real browser for layout, interaction,
and audible scheduling claims. Avoid tests that only search source strings for new names.

Verify the Mixer build and served bundle, not only the game build. `npm run mixer` starts
the dedicated service; read its current startup output for address/options. Inspect the
running process first and do not start a duplicate service or kill an unrelated one.
Restart the owning server after builder/template changes when required, and confirm the
served page contains the current implementation. `npm run build` alone is not proof that
the dedicated Mixer page was rebuilt.

Automated playback must use the established silent audio-test setup. Manual listening
acceptance is separate. Never change the user's real browser drafts or song files as test
cleanup. Use an isolated browser profile and record environmental launch failures plainly.

## Acceptance targets and reporting

These are initial desktop targets to validate against the baseline, not universal device
promises:

- Typical fader input handler p95 below 8 ms, with visual response within two presented
  frames under the reference workload.
- No repeated 50 ms+ main-thread tasks attributable to continuous control editing.
- No added delay to live audio parameter application and no worsening scheduler lateness.
- Storage writes and undo captures scale with gestures/checkpoints, not pointer events.
- Highlight updates scale with meaningful state changes, not display refresh rate.
- Repeated editor open/close and worker cancellation leave no growing pending work or
  detached-element retention attributable to these changes.

If the baseline already meets a target, require reduced work or a demonstrated larger-song
benefit before adding complexity. Report median/range across repeated A/B runs and explain
noise. A failure of a target is a finding to investigate, not permission to weaken sound,
undo, or saving semantics.

Write a completion report under `work/audit/mixer-responsiveness/` with:

1. Implemented stages and deliberately deferred candidates with reasons.
2. File-level change summary and relevant revision/settings identity.
3. Before/after numbers for each affected interaction, including worst cases.
4. Persistence, undo, freeze, and song-switch correctness results.
5. Tests/builds passed, browser/listening/device checks performed, and explicit omissions.
6. Remaining risks, especially the checkpoint crash-loss window and any unsupported browser
   performance measurements.

## Suggested reviewable implementation slices

1. Baseline and bounded diagnostic additions.
2. Draft checkpoint coordinator and recovery tests.
3. Generic undo capture reduction and gesture edge cases.
4. Desk gesture integration and secondary refresh coalescing.
5. Playback highlight/label invalidation and geometry verification.
6. Any justified narrow engine-update correction.
7. One justified background job or incremental panel improvement.

Keep each slice independently reviewable. Do not commit or publish unless separately
authorised. The core priorities are stages 1–4; later stages should earn their complexity
through measurement.
