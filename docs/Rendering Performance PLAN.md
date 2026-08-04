# Gameplay Rendering Performance Plan

*Revised 2026-08-05 after a full re-verification of every premise against the current code. Since the original plan: the rewind system was reworked (most of the old phase 4 is done), a frame-hitch counter and render-side profiling were added, the default desktop zoom changed from 2 to 1.6 and became live-tunable, and the in-flight art work (boost pad, flags, portals) added many new animated props — which makes the artwork warm-up phase more urgent, not less.*

## Summary

Make gameplay as smooth and reliable as possible by removing frame hitches first, allocation pressure second, and steady-state upload cost last. Implement the phases separately, in order, profiling after each one. Preserve the fixed 60 Hz gameplay, visuals, hitboxes, procedural generation, desktop rewind length, title bloom, and sharp hero/HUD rendering.

0. Update-side profiler timing (small — the render side and hitch counter now exist).
1. Quick wins: touch rewind guard, HUD `shadowBlur`, uncached gradients.
2. Pre-build animated artwork before it appears, plus canvas-memory management. **The headline smoothness work.**
3. Stop drawing outside the visible camera, with bounds derived live from the interpolated zoom.
4. Rewind recording — **largely complete** in the current code; only cleanup notes remain.
5. Remove the second full-screen gameplay upload (a measured experiment, not a commitment).

## Current status of the old plan's premises

| Area | Status |
|---|---|
| Rewind circular buffer, pooled snapshots, 15 Hz capture | **Done** (`RewindRing` at `run.js:180`, `writeRewindSnapshot` at `run.js:2877`, test `tests/rewind-pooling.js`) |
| Touch rewind guard | **Done 2026-08-05** — `Input.rewindAvailable()`; verified 0 snapshots and 0 records allocated on a coarse-pointer profile, 41 on desktop |
| Hitch counter | **Done** — `frameHealth()` in `src/engine/loop.js` (hitches, worst, stalls), shown in the FPS readout and bench |
| Render-side profiling | **Done** — paint/submit/display timing + upload/megapixel counters (`gameplay-profile.js`, `glfx.profile`) |
| Update-side profiling | **Done 2026-08-05** — `src/engine/update-profile.js`, UPD/U95 columns + rewind/spawn split in the report |
| HUD panel `shadowBlur` | **Done 2026-08-05** — blur replaced by a flat 1px offset at alpha 0.10, approved; ~78% cheaper. A bitmap cache was tried first and reverted (regressed at high density) |
| Per-frame gradients | **Done 2026-08-05** — gold tick and blackout cached; star aura deliberately left alone |
| Art warm-up / spritesheets / eviction | **Not done** — cache still unbounded and lazy; new props made it worse |
| Camera-derived culling | **Not done** — stale ±40/520 cull only (`draw.js:327-328`) |
| Overlay second upload | Premise confirmed, and now **measured at ~2 uploads/frame in gameplay** — see phase 5 |

### First reading from the new profiler (2026-08-05, headless Chromium, WebGL 2.5×)

```
          FPS   UPD   U95   DRAW  BLIT  PAINT  SUBM  UPLOAD
WINDOW 1   47   0.0   0.1   0.1   6.6   0.5    6.1   284 / 230.0M
WINDOW 2   48   0.1   0.2   0.2   6.8   0.4    6.4   286 / 231.7M
WINDOW 3   43   0.1   0.2   0.2   7.3   0.4    6.9   262 / 212.2M
WORST 0.3ms   REWIND 0.02ms   SPAWN 0.00ms
```

Read with care — headless Chromium rasterizes WebGL in software, so the absolute
submit/upload costs are inflated relative to real hardware. Two conclusions
survive that caveat:

- **The simulation half is not the problem.** 0.1 ms average, 0.3 ms worst,
  with rewind capture at 0.02 ms. Whatever causes a hitch in this game, it is
  not the update tick — which retires the remaining phase 4 work for good and
  means phase 2's hitches must come from rasterization inside the draw.
- **~2 uploads per presented frame** (284 uploads / ~141 frames), which is the
  double-upload phase 5 targets, confirmed by counter rather than by reading
  the code. The count is hardware-independent even though its cost is not.
- Caveat on the DRAW column: it brackets `drawState()`, which only *queues*
  canvas commands, so it under-reports. BLIT is where the queued work is
  actually paid for. Worth fixing if DRAW is ever used to judge a phase.

## Phase 0 — Update-side profiler timing — DONE

Built in `src/engine/update-profile.js` and wired through `loop.js`,
`gameplay-profile.js`, and two call sites in `run.js`:

- The `update(TICK)` block in `loop.js` is now timed per presented frame.
  Callbacks that ran **zero** simulation steps are not sampled — on a 120 Hz
  panel half of them do no work, and folding those zeroes in would make the
  percentile describe the display's cadence instead of the cost of the work.
- Report gains `UPD` (average) and `U95` (95th percentile) columns, tinted
  apart from the render columns, plus a summary line carrying worst-frame,
  rewind-capture and spawner cost. Percentile is nearest-rank over the window's
  samples, so it never reports a duration that was not observed.
- Sub-buckets are marked with an allocation-free `mark`/`add` pair rather than
  the renderer's closure-wrapper `profileTimed`, because these sites sit inside
  the per-tick simulation and a closure per call per frame is exactly the
  garbage this profiler exists to find. Off, a mark is one branch.

Still outstanding, and better placed with phase 2 since that is what they
measure: prop-cache creations, cache hits, **visible-draw cache misses** (a
rasterize that happened inside the visible draw loop), and resident cache bytes.

## Phase 1 — Quick wins

- **Touch rewind guard.** The one remaining piece of the rewind work. Rewind is only reachable via `Input.held('left')` (`run.js:1253`) and touch never binds `left`; rewind *audio* capture is already disabled on coarse pointers (`main.js:497-499`, `audio.js:717-727`), but the simulation half is not — `recordRewindFrame` runs unconditionally (`run.js:1409`), so touch devices pay full 15 Hz capture and hold 150 pooled snapshots for a feature they cannot invoke.
  - Add `Input.rewindAvailable()` (false on touch), use it for history, capture, and rewind FX. When unavailable: no ring allocation, no capture calls.
  - Keep `?norewind` as the diagnostic override.
- **HUD panel `shadowBlur` — RESOLVED 2026-08-05: replaced with a flat 1px offset,
  `UI_PANEL_LIFT = rgba(0,0,0,0.10)`. Approved by Peter after checking the
  tutorial (the pale-card case) and the alpha ladder.** The blurred shadow, and
  the three now-vestigial shadow-reset lines that guarded the border from it,
  are gone from `src/engine/sprites.js`.

  The approved state is pinned by `work/local/hud-lift-alpha-ladder.png` — that
  ladder, at native size over real frames, is the spec for this value.

  Measured on the real status pill over bright sky: the old blurred shadow was
  **12% darker than the scene at its darkest and gone within 1.25 logical px**.
  The shipped replacement lands at **10.5%**, gone by 1 px — marginally lighter
  than what the game shipped with, and indistinguishable at native size (see
  `work/local/hud-lift-before-after.png`, captured at 0.15 before the final drop).

  Two things the ladder settled, worth not re-litigating: on dark scenes every
  alpha from 0.15 down to none looks the same, because black at 10% has nothing
  to darken against a near-black background — the hairline border carries the
  separation there, so this value is purely a bright-scene decision. And below
  about 0.06 the lift stops registering at all, at which point deleting it
  outright would be the honest choice.

  Cost, same ten-panel benchmark (measured at 0.15; alpha does not change it):

  | density | blurred | flat offset | shadow removed entirely |
  |---|---|---|---|
  | 2× | 0.204 ms | 0.073 ms (−64%) | 0.055 ms (−73%) |
  | 3× | 0.339 ms | 0.100 ms (−71%) | 0.072 ms (−79%) |
  | 5.33× | 0.874 ms | 0.188 ms (**−78%**) | 0.129 ms (−85%) |

  The flat variant costs one extra fill rather than none, so it gives up a few
  points against deleting the lift outright — worth it to keep the authored look.

  **A caution worth keeping.** The first bake-off, rendered at 2× and magnified
  6×, made the blurred shadow look like a deliberate design element and led to a
  recommendation to keep it at low density. Peter looked at the game and said it
  seemed barely present; measuring the actual pixels proved him right. Magnify to
  compare *shapes*, never to judge *how noticeable* something is, and measure the
  real frame before recommending anything on the strength of a picture.

  Superseded detail from the first attempt, kept because it rules out the obvious
  alternative:
  `drawPanel` (`src/engine/sprites.js`, shadow block at `:405-409`) runs `shadowBlur = 3` fills for
  every shadowed HUD panel, every frame. Caching each distinct panel to a bitmap
  and blitting it was implemented and benchmarked against the real panel shape
  at three densities (10 panels/frame, Chromium, one pixel read back per frame
  to force rasterization rather than timing command submission):

  | density | live | cached | shadow removed |
  |---|---|---|---|
  | 2× | 0.190 ms | 0.029 ms (**−85%**) | 0.054 ms (−71%) |
  | 3× | 0.333 ms | 0.051 ms (**−85%**) | 0.073 ms (−78%) |
  | 5.33× | 0.851 ms | 1.119 ms (**+32%**) | 0.132 ms (−85%) |

  The cache is a large win at 2–3× and a **regression at 5.33×** — which is the
  iPad, the forced-Canvas2D device this item existed to help. Baking at the
  exact render density instead of a whole supersample made no difference
  (1.121 ms), so it is the blit area itself, not the minification. It also made
  panel geometry unobservable to callers and broke a tutorial test that measures
  card height from the panel's path calls. Reverted under the acceptance gate.

  What the numbers *do* say is that **the blur is ~85% of panel cost at every
  density** — removing it outright beats caching everywhere and is the only
  option that wins on the iPad. That is a visual decision, not a technical one,
  so it needs Peter: options are a flat offset shadow (no blur), a weaker blur,
  or leaving it as authored. Do not change it unilaterally.
- **Uncached per-frame gradients.** Two cached, one deliberately left alone:
  - Gold-tick linear gradient (`hud.js`) — **done**. Built in local space and
    positioned by the transform, so the same object serves every position.
  - Blackout-mission radial gradient (`run.js`) — **done**, same technique.
    Verified on crypt-1: the vignette still tracks the hero and hazards stay
    readable.
  - Star-aura radial gradient (`draw.js:159`) — **deliberately not cached.** Its
    colour stops are hue-cycled every frame, so there is nothing stable to
    cache; it is also built once per frame, not per entity. The original plan
    overstated this one.
- **(Needs Peter's visual sign-off, not a silent change.)** `droneEye` is the only drone skin *not* in `SELF_OUTLINED_PROPS` (`props.js:2611-2615`), so it takes the 5-canvas-per-frame rim path across its 16 frames (~80 canvases on first sight). If the omission is an oversight, adding it is a one-liner that removes the most expensive first-sight case — but it drops the hazard rim, so compare screenshots first.

## Phase 2 — Pre-build animated artwork before it appears

### Why this is the headline smoothness win

All prop art is rasterized lazily on first draw (`rasterize`, `props.js:2636-2648`) at 8× supersample (plus a detail-2 multiplier for most props — a 256× pixel oversample vs logical size). A hazard prop that is not self-outlined builds **five** canvases on first sight of each frame (sprite + two tints + two rim pairs, `draw.js:452-461`). Misses are correlated: a newly visible 96-frame appliance mints a fresh ~352×288 canvas on ~96 consecutive frames — a **four-second tail of per-frame hitches** every time one first appears.

The recent art work raised the stakes: `PROP_FRAMES` grew from 10 entries to 27 (`props.js:2463-2479`) — the shipped boost pad went from 1 frame to 8 and it is a common lane prop; four portal variants at 12 frames plus spend/wilt strips; flags and ramp candidates at 8; ten new props on the detail-2 multiplier.

### Warm-up queue

- Add a cooperative artwork warm-up queue around the existing prop cache. Each job is one exact derived cache entry — the same keys the draw path would create (`propSprite`, `propTinted`, `propRimPair`, `glowSprite`, `sparkSprite`, `drawApplianceFinish`). Exact drawn sizes matter: the title warms the appliance at 40×33 while the run uses 22×18 — zero key overlap.
- Build a stage-specific job list: props in the selected cabinet's obstacle patterns, mission objects, pickups and capsules, cabinet specials (portals, beat bars, paperwork, fuses, appliances), and all possible source-cabinet objects for Surge stages.
- Priority order: (1) frame zero of everything, (2) early-pattern objects, (3) hazard rims and short animations, (4) the long strips (36-frame crate, 96-frame appliance).
- Start when `BriefingState` opens; continue through transition, ACT banner, zone card, and run-in. Direct dev launches that skip the briefing create the same queue on `RunState` enter.
- Processing budget: idle time in menus/briefing; ≤2 ms per frame during non-interactive intros; during live play at most one job and only with ≥4 ms spare; never rasterize inside the visible draw loop.
- When an object spawns offscreen, move its jobs to the front. If a frame is still missing when visible, draw the nearest cached frame (normally frame zero) and keep the job queued — never build a canvas mid-draw.
- Keep the existing global cache so warmed art is reused by retries and later stages. No changes to logical dimensions or hitboxes.
- Feed the phase 0 diagnostics: pending jobs, creations, hits, visible-draw misses.

### Canvas-memory management (reliability)

The cache (`props.js:2436`) is a module-private `Map` with **no eviction, no size cap, no clear() — and it is not exported, so nothing outside the file could evict even if it wanted to**. Eager warming makes this worse. Current worst case if a session touches every appliance surface: run 22×18 (~39 MB), title 40×33 (~130 MB), field guide 17×14 (~23 MB), visualizer 25×21 (~52 MB) plus a full extra 96-frame set per finish id (~155 MB more) — approaching **400 MB of unfreeable canvas**. iOS canvas-memory exhaustion is a documented real failure mode in this codebase (`menus.js:638-641`).

- **Spritesheet strips.** Bake all frames of an animation into one wide canvas per `(name, size, variant)` and draw with a source rect. Same pixels, ~1/96th the canvas objects for the appliance, dramatically better iOS behaviour. Do the frame-heavy props first (appliance 96, qcrate 36, droneEye 16, portals 12).
- **Eviction on state change.** When leaving the title or finishing a stage, drop entries whose size/variant is not in the upcoming stage's job list. Track resident bytes in the diagnostics.
- Consolidate duplicate sizes where authorship allows: the appliance exists at four sizes across four surfaces, the portal at three — each a full independent frame set. Where the art must stay per-surface, at least evict the unused surface's set.
- Warm only frames reachable in the selected stage; prefer frame-zero-plus-strips over exhaustive per-frame warming when the budget is tight.
- The glyph cache flushes on density-rung changes (`src/engine/sprites.js:283`), i.e. exactly when the adaptive controller is reacting to slow frames — re-warm the HUD glyph set through the same queue instead of letting it fault in.

## Phase 3 — Stop drawing outside the visible camera

### The current geometry (all changed since the original plan)

Zoom is now tiered and mutable: desktop resting **1.6** (`ZOOM_NORMAL`, `run.js:279`) → 300 world px visible; desktop "zoom in" and tablets **2.0** → 240; phones **2.2** → 218; pull-back floor **1.3** (`ZOOM_MIN`) → 369. `applyFraming` runs **every frame** (`run.js:578`) and `ZOOM`/`VIEW_W`/`VIEW_H` are live `let` bindings behind `setRestingZoom` (`camera.js:72-76`). In dev builds `ZOOM_NORMAL` is tunable 1–3 from the tune strip (`tools/lib/tunables.js:94`), so the resting zoom can change between any two frames.

The only cull is `if (x < -40 || x > 520) return;` in `drawWorldEntity` (`draw.js:327-328`) — written for a 480-px frame, it admits **560 world px against 218–369 visible**. Projectiles, chomp-bites, portal, and copter draws have **no cull at all** (`run.js:3672-3737`). The spawner keeps roughly `camX-80 … camX+680` alive. `drawTerrain` walks a fixed 480 px in two 241-column passes (`terrain.js:32,43`) — ~37% of columns are off-screen on desktop, over half on phones — and calls `gaps.some()` 482 times per frame over a freshly `filter()`-ed array (`terrain.js:28-29`). The style packs' ground renderers share the fixed-`W` assumption (`stylePacks/index.js:1047, 1076, 1148, 1320, 1398, 1510` and the gap loops at `:1085, 1152, 1321, 1516`).

### Changes

- Compute a render-view once per frame **from the frame's own interpolated values** — the `mix()`-ed `cam` and `z` in `RunState.draw` (`run.js:3565-3583`), never from `ZOOM`/`VIEW_W` or any module-load capture. (Cautionary tale: `PLX = ZOOM` at `stylePacks/index.js:22` froze at 2 on module eval and never saw the 1.6 change.)
  - Visible width: `480 / z`. Left: `camX - margin`. Right: `camX + 480/z + margin`.
  - **Derive the margin** from the largest prop draw width (including `PROP_TALL`/visual scale and rim padding) plus max shake — assert it in a test, don't hardcode. Worst-case static bound, if one is ever needed: 480 (`W / min(tunable zoom)` at zoom 1).
- Keep render bounds completely separate from simulation, collisions, spawning, missions, and rewind.
- Cull before `drawAtGround()` — it burns 1–3 terrain samples, a closure, and a save/translate per entity before the current late cull runs (`run.js:604-624`).
- The cull must live **inside `drawActors`** (`run.js:3614`), because the LCD pack defers the whole actor pass to after post-processing under a second `applyWorld` (`run.js:3832-3838`). Same bounds both times.
- **Exemptions and multipliers:**
  - Chomp-bites are deliberately drawn away from their world x while flying to the mouth (`run.js:3672-3694`) — cull them by their *drawn* position or not at all; a naive `e.x` cull clips them.
  - Velocity smear (`run.js:3624-3670`, `SMEAR_STEPS` tunable 0–24) multiplies obstacle draws up to 25× — culling must happen before the smear loop, where it pays off most.
  - Mirror mode flips in screen space (`run.js:3585`) and doesn't change the visible world range — a `camX`-relative cull is mirror-safe, but verify both directions.
- `drawWorldEntity()` keeps a bounds check as a final safety guard, now taking the live visible width; tutorial and hub callers keep a 480 fallback.
- Pass the render-view to the style packs' `ground()` and to `drawTerrain`: iterate `visibleWidth + overscan` instead of 480, precompute the gap list once (kill the per-frame `filter()` and the 482 `gaps.some()` calls), fix the fixed-`W` loops in the packs.
- Backgrounds stay screen-sized (deliberately screen-space).
- While in these loops, remove the per-frame closures: one arrow per pickup (`run.js:3616`), two per obstacle (`run.js:3644-3646`), and the per-call `draw1` in `drawWorldEntity`.

## Phase 4 — Rewind recording (largely complete)

Implemented in the current code: `RewindRing` fixed-capacity circular buffer (`run.js:180-207`) — no more `push`/`shift()`; `writeRewindSnapshot` writes into pooled records via `assignInto`/`copySetInto`/`copyArrayInto`/`copyEntitiesInto` (`run.js:119-170, 2877-2975`) — steady-state allocations per capture dropped from hundreds to 2–4; capture halved to **15 Hz / 150 slots** with playback 1 snapshot per tick (`REWIND_SPEED = 1`), so the player-visible rewind speed and ten-second desktop length are unchanged; pooling regression test at `tests/rewind-pooling.js`; `?norewind` diagnostic flag.

Deliberate tradeoffs to **keep**:
- The mission/challenge `JSON.parse(JSON.stringify())` on capture and restore (`run.js:2957-2961`, `:3072-3073`) is documented in-code as a correctness-over-allocation choice; at 15 Hz it is 30–60 small allocations/sec. Leave it.
- The restore path still allocates freely (`run.js:2980-3095`) — it runs only while the player holds rewind, and the fresh copies protect the ring's records from aliasing the live world. Leave it.

Remaining work: only the touch guard, which is in phase 1.

## Phase 5 — Remove the second full-screen gameplay upload (measured experiment)

### Gate first

Premises re-verified as still true: gameplay always queues overlay content (hero + HUD, every frame), so WebGL pays a second full-resolution `texSubImage2D` (`renderer.js:1068` → `glfx.js:383-386`) and Canvas2D a full-screen `drawImage(overlayLayer, …)` (`renderer.js:1087`). The empty-overlay 1×1 stand-in only helps menus. `setOverlayMerge` is still title-only.

The **1440p backing cap** (`MAX_BACKING_H`, `renderer.js:240`, applied in
`buildLadder` `:417-423`) weakens the payoff by bounding upload cost on
high-density screens.

Against that, the first profiler run (see above) counted **~2 uploads per
presented frame in gameplay** and put ~90% of frame time in BLIT/SUBMIT rather
than in the update half — so on a pipeline that is upload-bound, this phase is
the one that moves the number. That reading came from software-rasterized
headless Chromium, where uploads are far dearer than on real hardware, so it
raises the phase's priority without settling it.

**Before building anything, read the upload-megapixel numbers on the actual iPhone (WebGL, 3×) and iPad (Canvas2D). If the second upload is not a meaningful share of frame time there, skip this phase.** Every earlier phase is prerequisite; this one is optional.

### Known hazards (why this is last)

- **Shake sync.** Shake is applied as a CPU `translate(Math.round(shakeX))` per overlay callback (`renderer.js:1024`) but as a **negated-Y UV offset** on the world texture in the shader (`glfx.js:469`, consumed `:130`). Two separate DOM canvases can be presented a frame apart by Safari's compositor — the hero desyncing from the world for one frame on every hit is precisely the jank this plan exists to remove. Verify frame-by-frame on-device.
- **Layout mirroring surface — grew recently.** `resize()` (`renderer.js:574`) now has three modes (letterbox, `coverFit` visualizer fullscreen, `portraitFill` jukebox/dev), plus safe-area insets and separate input scale fields (`renderer.js:660-692`). Mode toggles: `setVisualizerFullscreen`, `setJukeboxPortrait`, `setDevPortraitFill`, `setDensityPin`, every density-rung change. `freshCanvasAfterWebglFailure()` clones and replaces `#game`; the sibling canvas must survive that. Mirror everything inside `resize()` itself so every caller is covered.
- **Captures beyond `saveScreenshot`.** The verify skill screenshots `page.locator('#game')` directly; the gallery/video tools do their own `toDataURL`. All would silently lose the hero and HUD; every capture path must composite both canvases.

### Changes (if the gate passes)

- Transparent `#game-overlay` canvas above `#game`: same backing resolution, CSS geometry, and density; `pointer-events: none` (input binds pointerdown on `#game`); stacking order chrome → world → gameplay overlay → dialogs; added to the template's touch-action block.
- Gameplay hero, HUD, banners, pause, and death overlays render into it directly. Title and merged scenes are untouched (`setOverlayMerge` semantics preserved; switching to a merged scene clears stale overlay pixels).
- WebGL then uploads only the world backbuffer. **Delete the selective-glow path outright** (`setSelectiveGlow`, `pushGlowDraw`, `glowLayer`, `texGlow`, `paintGlow`) — re-verified: zero callers anywhere; it is dead allocation today.
- Canvas2D drops the full-screen overlay composite; the browser composites the two canvases.
- `pushOverlayDraw(draw, bounds?)` gains an optional dirty rect (sprites derive bounds; hero/HUD provide them; pause/death declare full frame; unknown callers fall back to full canvas). Clear the union of previous + current rects, expanded for shake and a safety margin.
- Update `saveScreenshot`, the verify skill capture, and the gallery/video tools to composite both canvases.

## Internal Interface Changes

- Stage artwork warm-up: `beginStageRenderWarmup()`, `prioritiseEntityArt()`, `stepRenderWarmup()`; spritesheet-strip support, an eviction hook, and resident-bytes diagnostics on the prop cache (which must become externally reachable for eviction).
- `Input.rewindAvailable()`.
- A render-view structure `{ camX, z, width, left, right, overscan }` computed per frame from interpolated values; appended to the internal ground/terrain drawing contract (core terrain and style packs).
- Update-side profiler buckets and the cache/warm-up counters.
- Phase 5 only: `pushOverlayDraw(draw, bounds?)`, `#game-overlay` in the generated shell.
- No save-data, stage-data, player-facing control, or public web API changes.

## Test and Acceptance Plan

- Profiler (phase 0): update/sim buckets report avg/p95/worst; visible-draw-miss counter increments exactly when a rasterize happens inside the visible draw loop; fixed-seed runs reproducible.
- Quick wins (phase 1): touch runs allocate no ring and capture nothing; desktop runs unchanged; cached panels/gradients pixel-identical, including light themes.
- Warm-up (phase 2): every stage object resolves to a job; Surge covers all remixable objects; budgets respected; representative visible objects draw with **zero** cache creations; fast briefing dismissal and direct dev launch hit the cached-frame fallback; strips pixel-identical to per-frame canvases; eviction only removes entries absent from the upcoming job list and resident bytes fall accordingly.
- Culling (phase 3): objects outside the current-tier camera are skipped **at 1.6, 2.0, and 2.2 resting zooms**; retained through the 1.3 pull-back; margin assertion covers the widest prop + rim + shake; a dev-build test sweeps `ZOOM_NORMAL` live across 1–3 and confirms bounds follow within one frame; chomp-bites mid-flight are never clipped; smear-multiplied obstacles cull before the smear loop; mirrored, smooth-motion, finish, portal, copter, projectile, and LCD (`actorsAbovePost`) cases correct; simulation arrays and collision outcomes unchanged; terrain operation counts scale with the visible width per tier.
- Rewind (phase 4 — mostly regression now): ten seconds at **15 Hz / 150 slots**; wrap and order correct; recorded snapshots never alias the live world; recycled records carry no leftover fields (all covered by `tests/rewind-pooling.js` — keep it green); mission/challenge/RNG/entities round-trip.
- Overlay (phase 5, if built): one full-size WebGL upload in gameplay; no Canvas2D full-screen overlay composite; dirty rects clear moving/disappearing overlays; overlay-free frames clear once then do nothing; title merge unchanged with bloom; all three capture paths contain world + overlay; geometry and input pass-through survive every layout mode and the WebGL-failure canvas swap; shake alignment verified frame-by-frame on-device.
- Profile three fixed-seed runs before and after each phase on WebGL 3× and forced Canvas2D. **A phase is kept only if its p95 frame time or its hitch count (`frameHealth`) measurably improves on a target device; a phase that regresses either by more than 5%, or that changes nothing while adding complexity, is reverted.** Run the gate on the iPhone and iPad, not only desktop.
- Manually inspect representative appliance, frost, office, plumber, and Surge stages: normal play, full rewind buffer, pulled-back zoom, pause/death, shake, mirror, title return, screenshots.
- Automated tests and profiles are evidence only; final confirmation is browser and target-device play, especially iPhone WebGL and iPad Canvas2D.

## Open questions for Peter

- **Parallax constant frozen at old zoom:** `PLX = ZOOM` (`stylePacks/index.js:22`) captured 2 at module load and never saw the change to 1.6 — parallax rates are still computed for the old framing. Bug or now-preferred feel? Decide before phase 3 touches those files.
- **`droneEye` hazard rim:** intentional that it's excluded from `SELF_OUTLINED_PROPS` when the other drone skins are included? (Phase 1 note — needs visual sign-off.)

## Assumptions

- Phases implemented in order, each independently testable and reversible.
- Fixed 480×270 logical space and 60 Hz simulation preserved.
- Desktop/controller rewind behaviour preserved exactly (ten seconds, same visible speed); touch rewind remains unavailable.
- Crisp hero/HUD layer stays outside gameplay world post-processing.
- No PixiJS, scene graph, workers, or new rendering framework.
- The tunables system is dev-only; production bundles keep plain constants — but culling correctness must not depend on that (derive per frame regardless).
- Existing unrelated worktree changes must be preserved.
