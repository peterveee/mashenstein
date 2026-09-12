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
- Each peaked mountain/hill range is split into individual paper sheets at its
  natural valleys.
- The hero keeps its separate, more dramatic gameplay contact shadow.
- Scenery cutout shadows are intentionally much softer than the hero shadow.

## Important source locations

- [`src/engine/stylePacks/index.js`](/Users/Peter/mashenstein/src/engine/stylePacks/index.js)
  - Paper texture generation and caches.
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
  - Still contains the existing slab/tunnel dirt gradients; see follow-up work.

## Current paper tuning

### Surface and grain

```text
PAPER_TEXTURE_SIZE       200px tile
PAPER_GRAIN_CELL         3px coarse grain cell
PAPER_TEXTURE_OPACITY    0.08
PAPER_GRAIN_ALPHA        0.75
PAPER_SURFACE_ALPHA      0.68
PAPER_SKY_SURFACE_ALPHA  0.42
```

The sky texture is baked once and drawn in base logical space, so it remains
static while the hills and clouds move. The coarse interpolated component is
intentional: single-pixel noise read as grain/static instead of cardstock.

### Scenery shadows

The current scenery values are deliberately restrained:

```text
PAPER_DEEP_OFFSET          x: 2,     y: 4
PAPER_CONTACT_OFFSET       x: 0.75, y: 1.5
PAPER_DEEP_COLOR           rgba(15,23,36,0.10)
PAPER_CONTACT_COLOR        rgba(0,0,0,0.04)
PAPER_LANDMARK_DEEP_COLOR  rgba(15,23,36,0.15)
PAPER_LANDMARK_CONTACT     rgba(0,0,0,0.06)
```

The deep scenery shadow was reduced from the earlier `4x8` / `18%` treatment
because clouds read as a second large cloud rather than a subtle paper lift.
The landmark values remain slightly stronger than cloud values so mountains and
hills retain sheet separation.

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

## Follow-up decisions

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
