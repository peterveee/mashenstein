# Plumber's Panic Paper Rendering Handover

Date: 2026-09-12  
Project: `/Users/Peter/mashenstein`  
Status: Active in the normal Plumber game path for visual evaluation

## Summary

Plumber's Panic now uses the Canvas 2D paper-cutout treatment by default while
the style is being evaluated. The treatment is cached and draw-only: it does
not use CSS filters, SVG DOM elements, or real-time SVG turbulence.

The current visual direction is:

- Static, coarse cardstock grain in the sky and scenery.
- Paper finish on clouds, mountains, hills, floating islands, and foreground
  scenery.
- Cloud and sun grain is baked onto each moving cutout, so it stays still on
  the object like the cached mountain paper rather than swimming through it.
- Each peaked mountain/hill range is split into individual paper sheets at its
  natural valleys.
- The hero keeps its separate, more dramatic gameplay contact shadow.
- Scenery cutout shadows are intentionally much softer than the hero shadow.

## Important source locations

- [`src/engine/stylePacks/index.js`](/Users/Peter/mashenstein/src/engine/stylePacks/index.js)
  - Paper scenery painters and material selection.
  - Cloud, sun, mountain, hill, and scenery paper passes.
  - Plumber paper style enablement.
- [`src/game/run.js`](/Users/Peter/mashenstein/src/game/run.js)
  - Plumber paper backdrop handling.
  - Phone backdrop veil exemption so the paper colours are not washed toward
    cream.
  - Existing gameplay render flow and hero contact-shadow call.
- [`src/game/draw.js`](/Users/Peter/mashenstein/src/game/draw.js)
  - Shared hero contact shadow. This was restored to the stronger treatment and
    should not be confused with the scenery paper shadows.
- [`src/game/terrain.js`](/Users/Peter/mashenstein/src/game/terrain.js)
  - Island, slab, tunnel, and underground material rendering.
  - Flat paper slab/tunnel bodies, underside strips, finish and shadows.

- [`src/engine/paper-material.js`](/Users/Peter/mashenstein/src/engine/paper-material.js)
  - Shared deterministic source tiles and per-context pattern caches.

## Current paper tuning

Peter selected **Fine pressed, quarter-step** (pressed amount `0.25`).
The renderer now uses the approved seeded fibre strokes rather than interpolated
mottle or canvas weave. The [approved comparison](../work/mockups/paper-materials/fibre-study/quarter-step.html)
remains a standalone reference.
The active shipped paper material is now `cardstockClear`, selected after the
Speed and Plumber level bakeoff.

### Selected material

- 1024px transparent tile, displayed at 512 logical pixels (2x authored detail).
- Seed 23571; 100,000 irregular fibre pairs per tile, baked once and cached.
- Fibre length 0.625–3 source pixels; width 0.5–1.3 source pixels.
- Dark stroke alpha 0.035–0.09; light stroke alpha multiplied by 1.3,
  offset upwards 0.7 source pixels.
- Source-over compositing at full material strength, matching the study.
- Sky and standard scenery share the selected recipe. Sky is screen-fixed;
  terrain patterns translate by negative camera displacement and retain 0.5 scale.
- `cardstockClear` is the active material: it keeps the selected fibre recipe
  but reduces the dark impression to 82%, lifting warm colours slightly without
  changing density or scale.
- `cardstockSoft` remains the full-contrast comparison reference; `cardstockQuiet`
  remains a quieter preview alternative with fibre alpha at 75%.
- The lower hillside finish is restricted to its painted area to avoid adding
  another fibre pass over the already-finished upper ground.
- Other cabinets still require explicit preview/preset activation.

[Speed vs Plumber clear-fibre bakeoff](../work/mockups/paper-materials/clear-fibre-bakeoff/index.html)
uses the same seeded `speed-1` and `plumber-1` level start for the soft
reference and selected material comparison.

### Selected-material verification

`paper-material`, `pixel-background`, `renderer`, `portrait-layout`, and `routes`
pass, as do the production build and `git diff --check`. No layout baselines
were regenerated. Browser captures at 960×540 and emulated 390×844 loaded
without page errors. The cached transparent sheet differs from direct fibre
painting by less than 0.3 mean channel levels (out of 255) on tested blue,
white and dark-green palettes; this is raster compositing rounding.

[Desktop gameplay](../work/mockups/paper-materials/fibre-study/selected-desktop.png)
· [Portrait gameplay](../work/mockups/paper-materials/fibre-study/selected-portrait.png).
These captures verify the 2D browser path, not physical-phone acceptance or a
full performance comparison. The selected texture is now active for Plumber.

### Scenery shadows

The current scenery values are deliberately restrained:

```text
PAPER_DEEP_OFFSET          x: 2,     y: 4
PAPER_CONTACT_OFFSET       x: 0.75, y: 1.5
PAPER_DEEP_COLOR           rgba(15,23,36,0.10)
PAPER_CONTACT_COLOR        rgba(0,0,0,0.04)
PAPER_SUBTLE_DEEP_OFFSET   x: 1,     y: 2
PAPER_SUBTLE_CONTACT       x: 0.35,  y: 0.75
PAPER_SUBTLE_DEEP_COLOR    rgba(15,23,36,0.055)
PAPER_SUBTLE_CONTACT_COLOR rgba(0,0,0,0.018)
PAPER_LANDMARK_DEEP_COLOR  rgba(15,23,36,0.15)
PAPER_LANDMARK_CONTACT     rgba(0,0,0,0.06)
```

Clouds and islands use the subtle pair so their shadow stays close to the sheet
edge. Upper paths and tunnel roofs retain the standard pair, while landmark
values remain slightly stronger so mountains and hills retain sheet separation.

### Hero shadow

The hero contact shadow is separate from the scenery paper shadow and is
intentionally stronger for gameplay readability. Current shared values in
`src/game/draw.js` include:

```text
a:       0.26
rx:      0.56
ry:      0.105
airGain: 1.3
```

Do not reduce these when tuning cloud/island shadows. The hero shadow stays on
the ground while the hero rises and provides a useful landing/altitude cue.

## Enablement and comparison seams

The normal Plumber pixel style has the paper treatment enabled. The explicit
comparison seams remain available:

- `settings.paperCutout: false`
- URL query `?paper=off`

These are useful for side-by-side visual comparisons without reverting source.

## Verification completed

The following checks passed after the latest scenery-shadow adjustment:

```bash
node --check src/engine/stylePacks/index.js
node tests/pixel-background.js
node tests/renderer.js
npm run build
git diff --check -- src/engine/stylePacks/index.js src/game/draw.js
```

A live desktop preview was checked through the local development server at:

```text
http://localhost:8002/?goto=stage&cab=plumber&stage=plumber-1&invuln&startAt=7
```

The live preview confirmed the cloud shadows are now small and low-contrast,
while the hero shadow remains available as a stronger gameplay cue. This is
browser visual evidence only; no physical-device acceptance has been recorded.

## Historical follow-up decisions (superseded by the implementation below)

1. Re-evaluate the paper treatment at normal desktop gameplay scale, especially
   large clouds and the underside of floating islands.
2. Decide whether the remaining smooth dirt gradients in `terrain.js` should be
   replaced in Plumber paper mode with flat cardstock colour plus a restrained
   darker underside band. The deep underground earth is already rendered as
   layered strata rather than one continuous gradient.
3. Keep the sky texture static and avoid reintroducing a full-frame phone veil
   for the Plumber paper study.
4. If the visual direction is approved, retain the cached pattern/tile approach
   and avoid moving texture generation or repeated hill tracing into the frame
   loop.

## Worktree note

The checkout contains other pre-existing dirty files and unrelated ongoing
changes. This handover does not claim ownership of or clean those changes.

## Historical implementation notes (superseded material tuning)

The paper pass now uses the shared [`src/engine/paper-material.js`](/Users/Peter/mashenstein/src/engine/paper-material.js)
material cache. `skySmooth`, `cardstockClear`, `cardstockSoft`, and `cardstockQuiet` use deterministic
256px seamless multi-scale tiles with constant low alpha; per-pixel alpha and
fine static noise are no longer generated.

In Plumber paper mode the sky is a flat first-stop colour plus a screen-pinned
`skySmooth` sheet. Portrait and high-route gradient prefills are skipped. Ground,
apron, islands, upper paths, tunnel roofs, cloud roads, staged exits and subsoil
receive the shared cardstock finish; suspended slabs and cloud-road puffs receive
the existing restrained deep/contact shadow pair. Paper-mode slab and tunnel
bodies use flat soil colour with a two-pixel underside strip instead of vertical
lighting gradients. The hero contact shadow is unchanged.

For motion review, the dev-only `paperSpeed` query scales the paper pattern's
camera anchor on Plumber and Speed ground surfaces. The shipped global default
is `0.5`; `paperSpeed=1` is the full-speed comparison reference. The value
slows only the paper impression while leaving the camera, terrain, collision,
and authored object motion unchanged. See the motion bakeoff in
[`work/mockups/paper-materials/paper-motion-bakeoff/index.html`](../work/mockups/paper-materials/paper-motion-bakeoff/index.html).

The paper pass also has dev-only surface-strength seams: `paperStrength` is a
master multiplier, while `paperSkyStrength`, `paperSceneryStrength`, and
`paperGroundStrength` address the sky sheet, scenery silhouettes, and ground
surfaces independently. The approved shipped defaults are sky `0.8`, scenery
`1`, and ground/foreground `0.2`; the master remains `1`. The surface-strength
bakeoff compares alternate quieter balances at the selected 50% motion speed.
See
[`work/mockups/paper-materials/paper-strength-bakeoff/index.html`](../work/mockups/paper-materials/paper-strength-bakeoff/index.html).

`paperPreset` is an optional stage presentation field. `?paper=cardstockClear`,
`?paper=cardstockSoft`, or `?paper=cardstockQuiet` previews a supported preset on
the selected cabinet in a development/watch build;
`?paper=off` and `settings.paperCutout:false` remain explicit opt-outs. Frost and
Cardboard are preview-only and have no shipped stage opt-in. See
[`work/mockups/paper-materials/README.md`](/Users/Peter/mashenstein/work/mockups/paper-materials/README.md)
for deterministic review links.

Focused checks completed after this pass:

```bash
node tests/pixel-background.js
node tests/paper-material.js
node tests/renderer.js
node tests/routes.js
node tests/portrait-layout.js
npm run build
git diff --check
```

The pixel-background suite now asserts that paper Plumber avoids sky gradients
while paper-off retains the ordinary gradient. Browser smoke inspection covered
Plumber, Speed, Frost and Cardboard at desktop and a 390x844 portrait viewport;
physical-phone acceptance remains outstanding.

Following review feedback that the texture pass read as absent while the
outlines still read as paper, then as compression/moire after a broad
directional weave, the material uses a balanced overlay. `skySmooth` uses
alpha `0.18`, contrast `0.72`, neutral bias `128`, fibre weight `0.32` and
smooth mottle weight `0.80` with no regular weave; `cardstockSoft` uses smooth
mottle weight `0.48` at alpha `0.14` and contrast `0.56`, with quiet at alpha
`0.10`, mottle weight `0.40` and contrast `0.45`. All three materials therefore
share the same non-directional paper family and cannot introduce a canvas
crosshatch.
The sky remains pinned to the viewport and does not add animation, gradient
lighting or frame-loop texture generation. The fibre cells now divide the 256px
tile evenly, and periodic smooth value-noise interpolation carries each field
across the tile boundary without a copied edge strip or a tonal/derivative seam.

`npm test` also completes all later suites but currently reports the repository's
pre-existing `tests/layout-parity.js` fixture drift (route lengths/spawn ledgers
for Plumber-3, Frost-2 and Crypt-2). This paper pass does not change stage layout
data or regenerate those baselines.

The latest seam pass removes the duplicated terminal control row from the paper
tile and uses periodic quintic interpolation instead, so a repeat joins with a
continuous slope rather than a flat compression-like strip. Tunnel cutaway
joins now receive a one-world-pixel opaque overlap in paper mode; the overlap is
inside the tunnel silhouette and does not paint route gaps. The route merge scan
also skips the exact-zero endpoint and treats the final sub-pixel of descent as
merged, keeping the apron and cave on one surface.
