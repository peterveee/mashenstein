# Gameplay Rendering Performance Plan

## Summary

Make gameplay as smooth and reliable as possible by removing frame hitches first, allocation pressure second, and steady-state upload cost last. Implement the phases separately, in the order below, profiling after each one. Preserve the fixed 60 Hz gameplay, visuals, hitboxes, procedural generation, desktop rewind length, title bloom, and sharp hero/HUD rendering.

Phases are ordered by certainty-of-payoff over risk:

0. Profiling foundation (prerequisite — the current profiler cannot see half of the problems).
1. Quick wins: touch rewind guard, HUD `shadowBlur`, uncached gradients.
2. Pre-build animated artwork before it appears, plus canvas-memory management.
3. Stop drawing outside the visible camera, plus draw-loop allocation cleanup.
4. Make rewind recording lighter (cheap parts unconditional; the slot-reuse rework gated on measurement).
5. Remove the second full-screen gameplay upload (a measured experiment, not a commitment).

Phases 2 and 3 attack *hitches* — the thing that actually reads as "not smooth". Phase 4 attacks amortized GC pressure. Phase 5 has the highest risk-to-certainty ratio and is gated on numbers the phase 0 profiler will already report.

## Phase 0 — Profiling foundation

The existing gameplay profiler (`src/engine/gameplay-profile.js`, armed via `?gameplayProfile`) measures only the render side: FPS, drawMs, blitMs, paint/submit/display, WebGL upload count and megapixels. **There is no instrumentation at all for the update half of the frame**, so snapshot-capture cost, spawner cost, and GC pauses are currently invisible. Before changing behaviour:

- Extend the profiler to report average, 95th-percentile, and worst-frame times for four buckets: update, world drawing, overlay painting, and final display/upload.
- Add a **hitch counter**: number of frames exceeding ~10 ms in each 3-second window. Three-second p95 windows can miss exactly the rare spikes phase 2 fixes; the hitch count is the primary smoothness metric.
- Add dev counters that later phases will feed: prop-cache creations, cache hits, visible-draw cache misses, rewind capture time, rewind slots allocated/reused.
- Use a fixed seed so before/after runs are comparable.
- Record the second overlay upload's cost explicitly (the profiler already reports upload megapixels) — this number decides whether phase 5 happens at all.

## Phase 1 — Quick wins

Small, isolated changes with clear payoff; ship before the structural work.

- **Touch rewind guard.** Rewind is triggered only by keyboard/gamepad `left`; touch input has no rewind binding, and rewind audio already checks for coarse pointers (`src/engine/audio.js` ~717: "Rewind is unavailable on touch screens"). But the visual/state history has no equivalent guard: `recordRewindFrame` runs unconditionally every frame (`src/game/run.js:969` → `:2146`), so touch devices pay full 30 Hz snapshot cost and hold 300 snapshots resident for a feature they can never invoke.
  - Introduce one shared `Input.rewindAvailable()` capability and use it for both rewind history and rewind-audio capture. Return false on touch devices.
  - When unavailable: allocate no history, do not call the snapshot recorder, do not start rewind audio or visual effects.
- **HUD panel `shadowBlur`.** `drawPanel` in `src/sprites/sprites.js:407` runs `shadowBlur = 3` fills for essentially every HUD panel, every frame (PANEL, PANEL_GOLD, pause, death, tutorial panels). `shadowBlur` is among the most expensive Canvas2D operations and this is hot on the forced-Canvas2D iPad path. Cache the panel (background + shadow) to a canvas keyed on size/style, or fake the shadow with an offset darker fill. Pixel output must match; verify on the light themes too.
- **Uncached per-frame gradients.** Build once and cache, keyed on the parameters that actually vary:
  - `drawGoldTick` linear gradient, `src/game/hud.js:220` (every frame while the gold bar shows).
  - Star-aura radial gradient, `src/game/draw.js:144`.
  - Blackout-mission radial gradient, `src/game/run.js:3088`.
  - (The hero shading gradients in `toons.js` are already cached per shade scope; leave them.)

## Phase 2 — Pre-build animated artwork before it appears

### Why this is the biggest smoothness win

All prop art is rasterized lazily on first draw (`src/sprites/props.js:2291` `rasterize`), at 8× supersample, cache-keyed on `name|WxH|detail|frame`. A hazard prop that is not self-outlined builds **five** canvases on first sight of each frame (sprite + two tint silhouettes + two rim pairs). Misses are correlated in time: a newly visible 96-frame appliance rasterizes a fresh ~352×288 canvas on ~96 consecutive frames at 24 fps — a **four-second tail of per-frame hitches** every time one first appears. The title screen only warms a *different* size (40×33 vs the in-run 22×18), so warm-up jobs must target exact drawn sizes.

### Warm-up queue

- Add a cooperative artwork warm-up queue around the existing prop cache. Each job represents one exact sprite frame, size, tint, rim, glow, or spark variant — the same derived keys the draw path would create (`propSprite`, `propTinted`, `propRimPair`, `glowSprite`, `sparkSprite`, `drawApplianceFinish`).
- Build a stage-specific job list containing:
  - Props used by the selected cabinet's obstacle patterns.
  - Mission-specific objects.
  - Normal pickups and power capsules.
  - Cabinet specials such as portals, beat bars, paperwork, fuses, and appliances.
  - All possible source-cabinet objects for Surge stages.
- Prioritise jobs in this order:
  1. Frame zero for every possible object.
  2. Objects in the stage's early patterns.
  3. Hazard rims and short six-frame animations.
  4. Longer animations such as the 36-frame crate and 96-frame appliance.
- Start the queue when `BriefingState` opens. Continue it during the transition, ACT banner, zone card, and run-in. Direct developer launches that skip the briefing must create the same queue when `RunState` enters.
- Process jobs incrementally:
  - Use browser idle time during menus and briefing.
  - During non-interactive run introductions, use a maximum two-millisecond slice per frame.
  - During live play, process at most one job and only when the previous frame has at least four milliseconds of spare frame budget.
  - Never generate artwork from inside the visible drawing loop.
- When an object is spawned offscreen, move its outstanding jobs to the front of the queue.
- If a required animation frame is unexpectedly still missing when the object becomes visible, temporarily use its nearest cached frame — normally frame zero — and keep the missing frame queued. This is preferable to freezing the frame while constructing a canvas.
- Keep the existing global cache so warmed artwork is reused by retries and later stages. Do not change logical object dimensions or hitboxes.
- Feed the phase 0 diagnostics: pending jobs, cache creations, cache hits, visible-draw cache misses.

### Canvas-memory management (reliability)

Eager warming makes an existing problem worse: the prop cache has **no eviction, no size cap, and no clear() anywhere**. One appliance size is ~39 MB of canvas backing store; the title screen's 40×33 set is ~130 MB and stays resident into gameplay; `drawApplianceFinish` mints a whole new 96-frame set per finish id. The code already documents iOS canvas-memory exhaustion as a real failure mode (`src/game/menus.js:638`). "Reliable" means not getting the page's canvases purged by iOS mid-run.

- **Spritesheet strips.** Bake all frames of an animation into one wide canvas per `(name, size, variant)` instead of one canvas per frame, and draw with a source rect. Same pixels, far fewer canvas objects and GPU textures, dramatically better iOS behaviour. Do this for the frame-heavy props first (appliance 96, qcrate 36, droneEye 16, portals 12).
- **Eviction on state change.** When leaving the title or finishing a stage, drop cache entries whose size/variant is not in the upcoming stage's job list. Track resident canvas bytes in the dev diagnostics.
- Warm only frames actually reachable in the selected stage; "all possible Surge objects" still respects the memory budget — prefer frame-zero-plus-strips over exhaustive per-frame warming when the budget is tight.
- The glyph cache flushes whenever the density rung crosses a `Math.ceil` boundary (`src/sprites/sprites.js:281`), which means the adaptive controller dropping density *because frames are slow* immediately triggers a full glyph re-rasterize — a hitch at the worst possible moment. After a rung change, re-warm the HUD glyph set through the same warm-up queue instead of letting it fault in.

## Phase 3 — Stop drawing outside the visible camera

### Why

The only existing cull is late and wrong for the current camera: `drawWorldEntity` rejects at `x < -40 || x > 520` in **pre-zoom units** (`src/game/draw.js:278`), but the visible band at the resting zoom 2 is only `480 / 2 = 240` world units (`camera.js` `VIEW_W`). So the cull admits **more than twice the visible width**, and it runs *after* `drawAtGround` has already paid 1–3 terrain samples, a closure allocation, and a save/translate per entity — for every off-screen entity, every frame. `drawTerrain` walks a fixed 480 units (`src/game/terrain.js:26`), so at zoom 2 roughly half its 241 fill columns land off-screen, and its gap test calls `gaps.some()` 482 times per frame over a freshly `filter()`-ed array.

### Changes

- Calculate render-only world bounds once per frame after interpolating the camera and zoom:
  - Visible width: `480 / interpolatedZoom`.
  - Left bound: `cameraX - margin`. Right bound: `cameraX + visibleWidth + margin`.
  - **Derive the margin** from the largest prop half-width plus rim padding (rim pairs pad by `2 × detail × 8` supersampled px per axis) plus max shake amplitude, and assert it in a test — do not hardcode a magic 48. Document the derived value.
- Keep these bounds completely separate from simulation, collisions, spawning, missions, and rewind.
- Build reusable visible-entity arrays each frame without allocating new arrays:
  - Pickups and obstacles.
  - Projectiles.
  - Chomp-bite animations.
  - Portal, copter, finish marker, and other special actors.
- Perform the visibility check **before** `drawAtGround()`. This avoids terrain sampling, transforms, closures, and sprite work for objects that will eventually be rejected.
- Update `drawWorldEntity()` to accept the current visible width as a final safety guard. Existing tutorial and hub callers retain the current 480-wide fallback.
- Pass an optional render-view object to each style pack's `ground()` function. Ground gaps receive only relevant visible obstacles, precomputed once — eliminate the per-frame `filter()` and the 482 `gaps.some()` closure invocations in `drawTerrain`.
- Update `drawTerrain()` to iterate across `visibleWidth + overscan`, instead of always processing 480 world units inside a zoomed transform. Apply the same fix to the fixed-`W` loops in the style packs' ground renderers (`stylePacks/index.js:1033`, `:1066`, `:1131`, `:191`).
- Keep backgrounds screen-sized because they are deliberately drawn in screen space.
- Use the interpolated zoom rather than the normal fixed zoom so pulled-back camera moments (down to zoom 1.3, visible width ~369) do not make objects disappear.
- Apply culling before and after LCD-style post-processing in the same way, preserving the `actorsAbovePost` layering contract.
- Keep mirroring as a final canvas transform; calculate world visibility before mirroring so both directions use identical bounds.

### Allocation cleanup (same loops, same phase)

While touching these loops, remove the per-frame allocations in the draw path:

- The fresh arrow closure per entity per frame passed to `drawAtGround` (`src/game/run.js:2943-2944`) — restructure so the callback is a stable function receiving the entity as an argument.
- The per-call `draw1` closure in `drawWorldEntity` (`src/game/draw.js:344`).
- Literal arrays allocated inside per-frame style-pack loops (`stylePacks/index.js:823`, `:988`, `:1177`).
- (Optional, minor) The template-literal cache-key string built on every prop draw *hit* (`props.js:2312`) — a per-prop array of per-frame keys, or the spritesheet-strip change in phase 2, removes it.

## Phase 4 — Make rewind recording lighter

The touch guard already shipped in phase 1. What remains, in two stages:

### 4a — Cheap structural fixes (unconditional)

- Replace the growing array and `shift()` operation (`run.js:2150-2151` — an O(n) dequeue on a 300-element array every capture once full) with a fixed circular `RewindHistory`:
  - Capacity remains 300 snapshots; capture remains 30 per second; desktop/controller players retain exactly ten seconds of rewind.
  - `popNewest()` preserves the existing newest-to-oldest rewind order.
- Replace the mission/challenge `JSON.parse(JSON.stringify())` round trips (two per capture at 30 Hz, `run.js:2241-2242`, and two more per restore, `run.js:2346-2347`) with a reusable plain-object/array deep copier.

### 4b — Slot reuse (gated on phase 0 numbers)

This is the most intricate, bug-prone item in the plan — rewind state-fidelity bugs are subtle and surface weeks later. Capture currently allocates roughly 60–150 objects/Sets per snapshot (~2,000–4,500 allocations per second of play): three `filter().map()` spread-clone passes, per-entity `Set` clones, an `Object.entries()` powerup loop, and a ~35-field player object. That is real GC pressure, but it is *amortized* at 30 Hz, not a hitch source. **Do 4b only if the update-side profiler still shows capture as a top cost after 4a.**

- Reuse snapshot slots when the circular buffer wraps rather than constructing another complete object tree every capture.
- Implement reusable copy helpers for player state, entities, projectiles, powerups, sets, mission data, challenge data, spawner state, and RNG counters:
  - Preserve immutable definitions such as entity `def` objects by reference.
  - Copy sets into reusable arrays inside the history and recreate sets when restoring.
  - Reset and refill existing arrays instead of using `filter().map()`.
  - Delete stale optional keys when a slot is reused.
- Keep restoration behaviour conservative: restore into live gameplay objects using the current semantics (hybrid in-place mutation for referenced objects, replacement for collections) so object references relied upon elsewhere are not unexpectedly broken. Restore runs only during actual rewind, not on the hot path — do not rework it beyond the JSON-copier swap.
- Equivalence test: run N seeded frames capturing through both the old and new implementations in parallel, deep-compare every snapshot, then restore from both and deep-compare live state.
- Expose development counters for capture time, slots allocated, slots reused, and unexpected slot growth.

## Phase 5 — Remove the second full-screen gameplay upload (measured experiment)

### Gate first

Gameplay always has overlay content (hero + HUD push every frame), so WebGL pays a second full-resolution `texSubImage2D` every frame (`src/engine/glfx.js:387`) and Canvas2D pays a full-screen `drawImage(overlayLayer, …)` composite (`renderer.js:1063`). The saving is real but bounded — on iPhone at 3× density it roughly halves upload bandwidth (~140 → ~70 Mpx/s). **Before building anything, read the phase 0 upload-megapixel numbers on the actual iPhone. If the second upload is not a meaningful share of frame time there, skip this phase entirely.** Every earlier phase is prerequisite; this one is optional.

### Known hazards (why this is last)

- **Shake sync.** Shake is applied three different ways today: CPU `translate(Math.round(shakeX))` per overlay callback (`renderer.js:996-1003`), a **negated-Y UV offset** on the world texture in the WebGL shader (`glfx.js:469`), and a baked transform in merged mode. Two separate DOM canvases can be presented a frame apart by Safari's compositor — the hero desyncing from the world for one frame on *every hit* is precisely the jank this plan exists to remove. The overlay canvas's shake must match the shader's rounding and sign exactly, and desync must be checked on-device, not just in desktop Chrome.
- **Layout mirroring surface.** `resize()` sets eight properties on `#game` across three layout modes (letterbox, `coverFit` fullscreen visualizer, `portraitFill` jukebox/dev). Mode toggles at `setVisualizerFullscreen`, `setJukeboxPortrait`, `setDevPortraitFill`, `setDensityPin`, and every adaptive-density rung change each call it. `freshCanvasAfterWebglFailure()` clones and replaces `#game` — the sibling overlay's DOM position and z-order must survive that. Resizing a canvas resets its context transform and `imageSmoothingEnabled`.
- **Captures beyond `saveScreenshot`.** The verify skill screenshots `page.locator('#game')` directly, and the gallery/video tools (`tools/render-video.js`, `tools/gallery-entry.js`) do their own `toDataURL` — all would silently lose the hero and HUD. Every capture path must composite `#game` + `#game-overlay`.

### Changes (if the gate passes)

- Add a transparent visible `#game-overlay` canvas directly above `#game`:
  - Same backing resolution, CSS position, object-fit mode, object-position, and adaptive density — mirrored inside `resize()` itself so every caller is covered automatically.
  - `pointer-events: none`, so gameplay input still reaches `#game` (input binds `pointerdown` on `#game`; `#chrome` deliberately sits *behind* for the same reason).
  - Explicit stacking order: chrome, world canvas, gameplay overlay, then dialogs/system overlays.
  - Add to the template's touch-action/user-select block (`build/template.html:41`).
- Gameplay hero, HUD, banners, pause, and death overlays render directly into this visible overlay canvas.
- Preserve `setOverlayMerge(true)`:
  - Title and other merged scenes continue drawing overlays into the main backbuffer; their authored bloom behaviour and single-upload path remain unchanged.
  - Switching to a merged scene clears any stale gameplay overlay pixels.
- Remove the WebGL gameplay overlay texture, sampler, and full-frame `texSubImage2D` upload, so WebGL uploads only the world backbuffer.
- **Delete the selective-glow path outright** rather than preserving it: `setSelectiveGlow` and `pushGlowDraw` have zero callers anywhere in `src/`, so `glowLayer`, `gctx`, `texGlow`, `paintGlow()` and the `bloomTex` branch are dead code.
- For the Canvas2D backend, remove the full-screen `drawImage(overlayLayer, …)` composite. The browser displays the transparent overlay canvas directly above the world.
- Extend `pushOverlayDraw()` with an optional logical dirty rectangle:
  - Sprite overlays derive their bounds automatically.
  - Hero and HUD callers provide accurate bounds.
  - Full-screen pause/death overlays declare the full frame.
  - Unknown callers safely fall back to the full canvas.
- Track the union of the previous and current dirty rectangles. Clear that union before repainting so removed or moving overlays leave no stale pixels. Expand dirty rectangles for screen shake and a small safety margin.
- Preserve the current logical shake transform so the world, hero, and HUD remain aligned.
- Update `saveScreenshot`, the verify skill's capture, and the gallery/video tools to composite `#game` and `#game-overlay` before producing the PNG.
- Synchronise the overlay with all special canvas layouts, including fullscreen visualizers, portrait jukebox mode, developer portrait fill, resize, density changes, backend changes, and WebGL-failure canvas replacement.

## Internal Interface Changes

- Add stage artwork warm-up functions such as `beginStageRenderWarmup()`, `prioritiseEntityArt()`, and `stepRenderWarmup()`.
- Add spritesheet-strip support and eviction hooks to the prop cache, with resident-bytes diagnostics.
- Add a testable `RewindHistory` circular-buffer class and `Input.rewindAvailable()`.
- Add a render-view structure containing `camX`, `zoom`, `width`, `left`, `right`, and `overscan` (margin derived, not hardcoded).
- Append the render-view argument to the internal ground/terrain drawing contract (core terrain and style packs).
- Change `pushOverlayDraw(draw, bounds?)` so overlay damage can be bounded (phase 5 only).
- Add `#game-overlay` to the generated game shell (phase 5 only).
- No save-data, stage-data, player-facing control, or public web API changes are required.

## Test and Acceptance Plan

- Profiler tests (phase 0):
  - Update, world-draw, overlay, and display buckets each report avg/p95/worst.
  - Hitch counter increments exactly on frames over threshold.
  - Fixed-seed runs are reproducible.
- Quick-win tests (phase 1):
  - Touch runs create and capture no rewind history; desktop runs are unchanged.
  - Cached panels/gradients are pixel-identical to the live-drawn versions, including on light themes.
- Warm-up tests (phase 2):
  - Every known stage object resolves to a warm-up job.
  - Surge includes all objects it can remix.
  - Work respects its time/job budget.
  - Drawing representative visible objects produces zero new cache creations.
  - Fast briefing dismissal and direct developer launch use the safe cached-frame fallback.
  - Spritesheet strips are pixel-identical to per-frame canvases.
  - Eviction removes only entries absent from the upcoming stage's job list; resident-bytes counter falls accordingly.
- Culling tests (phase 3):
  - Objects outside the normal 2× camera are skipped; the margin assertion covers the widest prop plus rim padding plus shake.
  - Objects visible during the 1.3× pulled-back camera are retained.
  - Oversized and glowing objects are not clipped at either edge.
  - Mirrored, smooth-motion, finish, portal, copter, projectile, and LCD cases remain correct.
  - Simulation arrays and collision outcomes are unchanged.
  - Terrain operation counts scale with actual visible world width.
  - The draw path performs zero per-entity closure/array allocations (spot-check via allocation counting in a dev build).
- Rewind tests (phase 4):
  - Desktop history contains exactly ten seconds at 30 Hz.
  - Circular wrapping and rewind order are correct.
  - Old/new capture equivalence: N seeded frames captured through both implementations deep-compare equal, and restores from both produce identical live state.
  - Mission, challenge, RNG, hero changes, entities, powerups, checkpoints, and sets round-trip correctly.
  - After the buffer reaches capacity, normal captures reuse containers rather than continually allocating them (4b).
- Overlay tests (phase 5, if built):
  - Gameplay with hero/HUD performs one full-size WebGL texture upload.
  - Canvas2D no longer performs a full-screen overlay `drawImage`.
  - Dirty rectangles clear moving and disappearing overlays.
  - Frames without overlays clear the previous overlay once and then do no work.
  - Title merge still uses one upload and retains bloom.
  - Screenshot output — in-app, verify skill, and gallery/video tools — contains both world and overlay.
  - Overlay geometry and input pass-through remain correct after every resize mode and after WebGL-failure canvas replacement.
  - Shake alignment between world and overlay verified frame-by-frame on-device.
- Profile three fixed-seed runs before and after each phase on WebGL 3× and forced Canvas2D. **A phase is kept only if its median 95th-percentile frame time or its hitch count measurably improves on a target device; a phase that regresses either by more than 5%, or that changes nothing while adding complexity, is reverted.** Run this gate on the iPhone and iPad, not only desktop — desktop numbers do not transfer.
- Manually inspect representative appliance, frost, office, plumber, and Surge stages. Include normal play, a full rewind buffer, pulled-back zoom, pause/death, screen shake, mirrored mode, title return, and screenshots.
- Treat automated tests and profiles as source/runtime evidence only. Final confirmation requires browser and target-device play, especially iPhone WebGL and iPad Canvas2D.

## Assumptions

- Implement the changes in phase order, with each phase independently testable and reversible.
- Preserve the fixed 480×270 logical render space and fixed 60 Hz simulation.
- Preserve desktop/controller rewind behaviour exactly; touch rewind remains unavailable.
- Preserve the crisp hero/HUD layer and keep it outside gameplay world post-processing.
- Do not introduce PixiJS, a scene graph, workers, or a new rendering framework.
- Existing unrelated worktree changes must be preserved.
