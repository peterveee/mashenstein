# Title-screen rendering and mobile performance plan

## Objective

Make the iPhone 17 Pro title screen look richer while sustaining 58–60 fps at
3× WebGL density. Preserve the current visual hierarchy: crisp title/menu
copy, sharp parade characters, readable cards, animated toasters, and a deep
animated sky.

## Progress

- Completed: WebGL attribute/uniform locations are cached instead of resolved
  in the frame loop.
- Completed: canvas upload pixel-store state is configured once at initialization.
- Completed: the procedural title sky now renders into a lazy half-resolution
  GPU target and refreshes every other presented frame.
- Completed: the title merges its full-density foreground into the backbuffer,
  so WebGL uploads one combined frame instead of a world texture plus a second
  full-size overlay texture. Existing title bloom remains enabled.
- Next: split title glow into a small selective mask, then cache the parade
  animation frames.

This is a title-first performance project. It should produce a visible result
quickly and establish renderer pieces that can later be reused by gameplay.

## Current diagnosis

The present WebGL path is a hybrid renderer:

1. The complete title scene is painted into a full-density Canvas2D backbuffer.
2. The parade, menu UI and toasters are painted into a second full-density
   overlay canvas.
3. The backbuffer is uploaded to WebGL with `texSubImage2D`.
4. The overlay is uploaded to a second WebGL texture.
5. Bloom and the final composite run on the GPU.

At 3×, each 1440×810 RGBA canvas is about 4.7 MB. Two full-frame uploads are
therefore about 9.3 MB per presented frame, before Canvas2D rasterization,
conversion, GPU writes, bloom and compositing.

The relevant paths are:

- [menus.js](/Users/Peter/mashenstein/src/game/menus.js:751) — title scene and
  GPU sky selection.
- [menus.js](/Users/Peter/mashenstein/src/game/menus.js:1582) — parade, menu and
  toasters queued into the overlay.
- [renderer.js](/Users/Peter/mashenstein/src/engine/renderer.js:449) —
  density-sized backbuffer and overlay allocation.
- [renderer.js](/Users/Peter/mashenstein/src/engine/renderer.js:777) — overlay
  painting and backend dispatch.
- [glfx.js](/Users/Peter/mashenstein/src/engine/glfx.js:280) — full-canvas
  texture uploads and final passes.

The title is an excellent first target because its scene is predictable and its
layers are already conceptually separated. The title can be improved without
changing gameplay mechanics or collision behavior.

## Phase 0 — honest title profiling

Add a hidden `PROFILE TITLE 3X` diagnostic run. Do not draw a changing report
through the WebGL overlay while measuring. Store the results and show them only
after the run, or display them in the portrait diagnostics panel.

Run the title at a fixed 3× density through these controlled cases:

| Case | Canvas painting | Uploads | Effects | Purpose |
|---|---:|---:|---:|---|
| rAF baseline | none | none | none | Establish presentation ceiling |
| static final | none | none after setup | final pass | Measure shader/compositor |
| world upload | frozen source | world only | simple copy | Measure the primary upload |
| full world | live world | world only | simple copy | Add Canvas2D scene cost |
| overlay upload | world + overlay | two full frames | simple copy | Measure second upload |
| bloom | world + overlay | two full frames | bloom + final | Measure bloom cost |
| sky | world + overlay | two full frames | procedural sky | Measure sky cost |
| title baseline | everything | normal | normal | Confirm real title result |

Record median and 95th-percentile frame interval, presented fps, world paint
time, overlay paint time, upload count, canvas dimensions, drawing-buffer
dimensions, and first-30-seconds versus five-minute performance.

The physical-device acceptance for this phase is three runs with less than 3
fps variance. This prevents choosing an optimization based on one unusually
cold or warm launch.

## Phase 1 — cheap WebGL cleanups

Apply these independently so the profiler can show their value:

### Remove avoidable upload conversions

Test the combinations of `UNPACK_FLIP_Y_WEBGL` and
`UNPACK_PREMULTIPLY_ALPHA_WEBGL` on the physical iPhone while checking toon
and text edges for bright fringes. Move the vertical flip into shader UVs if
the visual comparison passes. Set pixel-store state once instead of before
every upload.

### Cache WebGL locations and state

Cache attribute and uniform locations during program creation. Reuse texture,
framebuffer and bind helpers. Avoid per-frame closures and redundant
`useProgram`, texture and framebuffer changes.

### Split the final shader into variants

Create explicit programs for:

- world-only copy;
- world plus overlay;
- aberration/vignette;
- bloom composite;
- sky composite.

The current shader samples the world three times and samples the bloom texture
even when the effect is disabled. Variants ensure disabled effects cost
nothing.

## Phase 2 — title sky redesign

Keep the sky GPU-generated, but stop evaluating all of it at full output
resolution.

### Soft nebula

Render the drifting nebula at half or quarter resolution. Update it at 30 fps
and upscale it during the final composite. The nebula is intentionally soft,
so this should be visually harmless and may make it feel more atmospheric.

### Crisp stars

Render stars separately as inexpensive points or tiny textured sprites at full
resolution. Keep their twinkle and parallax, but remove the expensive full-
screen noise work from the star calculation.

### Shooting star

Render the shooting star as a small GPU quad or line rather than deriving its
entire streak procedurally for every pixel.

Target result: a more layered sky with sharper stars and lower full-screen
shader cost.

## Phase 3 — one full-size title upload

This is the first major performance win.

Combine the title floor, invader, parade, menu cards, logo, footer and toasters
into one full-density foreground canvas. Upload that canvas once per frame.

Do not simply feed that combined canvas through the existing world bloom pass,
because bright menu text and character highlights would bloom incorrectly.

Instead, create a small quarter-resolution glow mask containing only elements
that should glow. The title then becomes:

```text
half-resolution nebula       GPU-local texture
full-resolution crisp stars  GPU-local points/sprites
3× title foreground          one full upload
quarter-resolution glow mask small upload
final composite               one screen pass
```

This preserves crisp text and characters while removing the second full-size
overlay upload.

The title should retain these visual features:

- sharp parade characters;
- bright marquee/logo treatment;
- selected-card glow;
- toaster highlights;
- animated stars and nebula;
- shooting star;
- controlled bloom only on intended light sources.

## Phase 4 — cache the parade

The title currently retraces multiple procedural toon characters every frame.
Pre-render a small atlas for each title hero:

- run cycle;
- idle/entrance pose;
- knock-out pose;
- jump or personality pose where needed.

Start with 12–16 frames per cycle at 3×. Keep unusual hit and attack moments
procedural until the normal parade is proven.

The title then spends Canvas2D time blitting cached sprites instead of tracing
each toon’s vector anatomy repeatedly. These atlases can later become the
first assets for a retained WebGL gameplay renderer.

## Phase 5 — reusable bounded layers

Replace the title’s generic `pushOverlayDraw(callback)` path with commands that
declare a layer and bounds, conceptually:

```js
pushOverlayDraw({ layer: 'hero', bounds, paint });
```

That enables future bounded uploads for gameplay:

- hero region;
- HUD strip;
- dialogue/banner strip;
- exceptional full-screen transitions.

The title implementation can initially use one combined foreground, while the
bounded interface prevents future screens from silently returning to a
full-screen overlay upload.

## Quality policy

Do not reduce title art density first. Degrade effects in this order:

1. reduce nebula resolution;
2. reduce nebula update frequency;
3. reduce bloom resolution;
4. disable bloom only if necessary;
5. simplify exceptional parade effects;
6. reduce title density from 3× only as a last resort.

This keeps the parts players actually inspect—the logo, text, outlines and
characters—sharp.

## Acceptance criteria

On an iPhone 17 Pro installed PWA:

- title holds 58–60 fps at 3× for five minutes;
- no sustained 40/30 fps cadence;
- at least 95% of frames are under 20 ms;
- text, logo and toon outlines remain sharp;
- selective glow remains visible without making the menu bloom;
- no context loss after rotation, suspend/resume or repeated title entry;
- cold launch and warm performance are both recorded.

On the M1 iPad, leave the current native 2D default unchanged until the new
title WebGL path beats it in an equivalent physical-device run. Then enable the
GPU title path independently before changing the general iPad backend policy.

## Implementation order

1. Add non-perturbing title profiling.
2. Cache WebGL locations/state and test upload conversion flags.
3. Split the sky into low-resolution nebula and crisp stars.
4. Combine the title foreground into one full-size upload.
5. Add the small selective glow mask.
6. Cache the parade animation frames.
7. Verify 3× on the iPhone 17 Pro cold and warm.
8. Generalize bounded layers for gameplay.

The title work should be treated as the first vertical slice of the larger
renderer rewrite, not as a separate throwaway optimization.
