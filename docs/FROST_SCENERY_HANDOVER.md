# Frost scenery, shadows, and grounded hazards — handover

**Prepared:** 2026-09-15 (Australia/Sydney)  
**Project:** `/Users/Peter/mashenstein`  
**Status:** Implemented and source-validated; browser/device acceptance remains.

## Outcome

Frost now has a denser, raised paper scenery stack that works in both portrait
and landscape. The main gameplay hills are opaque and seam-free, while a
separate translucent foreground hill supplies depth without becoming a
collision surface.

Trees are larger, planted against the deepest point of their ridge footprint,
and retain a visible trunk. Their lower trunk has a small intentional planting
bite (`FROST_PINE_EMBED = 1.25`); it is not a cast shadow.

## Shadow decision

**Superseded 15 Sep 2026: nothing on the Frost ridges casts a paper shadow.**

The rule below applied the exemption to pines only, on the grounds that larger
features could carry cardstock depth. In the game they could not. An offset copy
behind a fortress or a rock is the one mark in the picture that says "sheet
lying on a sheet", and it fights what the ridges are for, which is distance — a
drop shadow is a claim about how close a thing is to the surface behind it, and
a peak on the far ridge is kilometres from it. `frostSceneryUsesPaperShadow()`
now returns false for every kind; it is kept as a named predicate so the rule
stays one decision in one place, and `tests/pixel-background.js` pins it.

Blending was the other half of the same complaint, and it is now aerial
perspective: every scenery colour is mixed toward what is actually behind that
layer (the sky for the far ridge, the far ridge for the near one) at
`FROST_ATMOSPHERE`, which keeps the palette's internal order while moving the
whole set into the family of its surroundings. `FROST_HAZE_BY_KIND` then
adjusts per feature, because one sheet carries two opposite jobs: a glacier is a
mountain on the horizon and takes 1.6x the layer's haze, while the fortress on
that same sheet is the level's landmark and takes 0.8x.

The superseded rule, for the record:

- Frost pines: no independent paper drop shadow.
- Frost rocks, fortresses, glaciers, and snowbanks: retain the cardstock depth
  treatment.
- Grounded gameplay hazards: use the shared soft contact shadow where a contact
  shadow is appropriate.
- Airborne hazards: no detached landing shadow.

This matches the comparison point: Plumber trees are baked into the hill sheet
and do not receive a separate tree shadow; Speed has no comparable tree pass.

## Grounding and hazard fixes

- Wide Frost features are planted from the deepest point across their full
  footprint, preventing a flat base from sticking out on a sloped hill.
- Frost scenery is painted after its support ridge, so fortress and rock bases
  meet the snow cleanly while the later near ridge can still occlude far art.
- The Frost foreground hill is decorative only and owns no hitbox.
- The old detached airborne shadow path was removed so drones and falling
  icicles cannot leave invisible-looking damage sources.
- The slope clip pivot for bedded floor props now uses the local screen-space
  x coordinate, keeping spike plates visible on sloped ridges.
- Bedded floor plates (spike plate, floor saw) no longer paint the red ground
  tick. It was drawn on the flat lane line, so on a Frost ridge it detached
  from the plate and read as a red underline lying in the snow below it; on
  level ground it had always been hidden behind the plate's own art. The road
  clipped over the foot of the plate is the contact.
- The bear trap keeps its cold contact shadow — it lies on the snow rather than
  being cut into it — but that shadow now rides the same sampled surface line
  the burial clip uses, so it stays under the trap on a slope.
- Falling icicle hazards were replaced with grounded bear traps.
- Bear traps use the dedicated, louder `trapSnap` cue; the generic `hit` sound
  is not layered over it, and invulnerability prevents retrigger spam.
- Drones use their normal shared purple/yellow colours.

## Light decision — day to dusk, 15 Sep 2026

Frost runs one light per stage: Frost 1 is a flat white afternoon (the shipped
cabinet palette, unchanged — the ramp starts from the picture that was already
signed off), Frost 2 has the sun low and off to one side, Frost 3 is twilight.
`FROST_STAGE_LIGHT` holds it and `frostStageLight(stageIndex)` reads it.

It is a LIGHT, not a wash over the finished frame. A wash greys the aurora and
the snow together, and the whole point of going down is that as the sky darkens
the aurora comes up. So the table drives the sky gradient, both ridge fills, the
foreground sheet, the lane, the blizzard's haze colour, and the stage tint that
`frostAtmosphericPalette()` applies to the scenery palette before aerial
perspective hazes it toward that stage's own sky.

The lane is in the table on purpose. Snow is the brightest thing in the picture
because of what is falling on it, so a dusk sky over a noon road reads as a lit
stage set rather than an evening.

Two things never move, and both are pinned in `tests/frost-weather.js`:

- the fortress's lit windows (`warm`), because they are emitting rather than
  reflecting — by Frost 3 they are the only warm mark left in the frame;
- the bear trap's read. Frost is the cabinet you slide into things on and a trap
  is 16x8, so the suite checks the lane stays clear of the trap ink by a margin
  at every stage, and that snow stays brighter than the hills behind it.

## Feet decision — 15 Sep 2026

Ridge features used to be planted from the DEEPEST point of their whole
footprint and drawn flat on top of the hill. That guaranteed nothing hung in the
air, and paid for it with the thing everyone actually saw: a perfectly
horizontal line under the fortress, the rocks and the snow banks, in a picture
with no other horizontals in it — and on a curved ridge, a feature standing as
much as thirty pixels down the slope from the ground under its own middle.

The foot is now solved instead of hidden:

1. plant at the highest ground inside the footprint, so the contour can never
   cut into the art;
2. carry a skirt down to the lowest ground inside it — the feature's OWN
   silhouette, filled a few times on the way down, so the foot keeps the edges
   the art had. A rectangle was tried first and is what a rock outcrop looks
   like when it has gone wrong; tapering the rectangle is worse again, because
   the clip already removes everything below the snow, so the taper only pulls
   the sides in ABOVE the snow line and puts the flat base straight back;
3. clip every pass to the sampled ridge contour, so the snow line itself is the
   bottom edge.

Before any of that, a feature that LIES ON the hill takes the hill's angle:
`FROST_FEATURE_FOOTPRINTS[kind].lean` tilts rocks and snow banks to the ridge
tangent, and pines, the fortress and the glacier stay upright — a tree grows
vertically, a fortress is built level whatever it is built on, and a glacier is
a mountain rather than something resting on one. The lean is not decoration: the
lift and the skirt are both measured against the line the base actually lies on,
so once a rock is tilted the linear part of the slope has gone into the tilt and
only the ridge's curvature is left for them to cover. A leaning silhouette also
reaches wider than the width it is planted on, which is what `FROST_LEAN_MARGIN`
adds to the sampled contour.

A snow bank is the exception to the lift and the skirt, and takes neither
(`FROST_FEATURE_FOOTPRINTS.snowbank.drift`). Everything else on these ridges is
a hard thing with a foot, and the sweep is what makes that foot read; a drift is
already snow, so the same treatment shows up as a pale straight edge running off
down the slope — the one shape a drift cannot have. It plants on the ground
under its own middle and lets the contour bury its uphill side.

The contour and the foot scan both run `FROST_FEATURE_MARGIN` past the
footprint: a silhouette can be slightly wider than the width it is planted on,
and a clip that ends inside the art is a vertical cut, which is the same crime
as the horizontal one.

## Relevant implementation

- [`src/engine/stylePacks/index.js`](../src/engine/stylePacks/index.js)
  - Frost ridge lifts and portrait/landscape placement.
  - Feature planting and feet: `frostEmbeddedBaseY()` plants at the HIGHEST
    ground under the footprint, `frostFeatureFoot()` measures how far the
    ground falls away inside it, `frostFeatureSurface()` samples the snow
    contour and `frostClipToSnow()` clips every pass to it, and the skirt
    sweeps `frostFeatureSilhouette()` down that far in `FROST_SKIRT_COLORS`'
    base colour at `FROST_SKIRT_STEP`. See "Feet decision" below.
  - Opaque main hills plus translucent foreground sheet.
  - `frostSceneryUsesPaperShadow()` gates independent paper shadows (now always
    false).
  - `frostAtmosphericPalette()` / `FROST_ATMOSPHERE` / `FROST_HAZE_BY_KIND` —
    aerial perspective per layer and per feature kind.
  - `drawFrostAurora()` — the sky curtains, baked per curtain and blurred in the
    bake; `scene.auroraGain` dials or removes them.
  - `drawFrostBlizzard()` — the weather overlay, painted from the pack's
    `weather(ctx, t)` hook, which the run queues onto the OVERLAY layer after
    the hero and before the HUD. It cannot live in `post()`: `post()` paints
    into the backbuffer and the hero composites on top of it, so snow drawn
    there is snow behind the player. It CLIMBS AT THE CHECKPOINTS:
    `FROST_BLIZZARD_LADDER` is one strength per checkpoint crossed since the act
    opened (`[0, 0.27, 0.45, 0.72, 1.02, 1.32, 1.5]` — clear until the first line
    of Frost 1, worst at the last line of Frost 3 and held from there to the
    tape). The ceiling is `FROST_BLIZZARD_MAX` = 1.5, half again past the
    strength the pass was originally dialled at: the whole ladder was lifted
    rather than the top rung alone, so the act climbs to it. Above 1 it is the
    same veil and the same three layers — the veil still gives up by the lane,
    and at 1.5 the layer alphas are 0.45 / 0.60 / 0.75.

    `frostBlizzardRung()` reads it for a stage and a count of lines behind the
    player, and `frostBlizzardRamp()` samples the same ladder continuously for
    the runs that bank nothing (ONE-HIT, overtime) and for every static preview.
    `run.js` counts the lines (`blizzardTarget`), eases the live value toward the
    rung over several seconds (`blizzardStep`, `BLIZZARD_EASE`) so a crossing is
    never a cut, snaps it on a checkpoint restore, and publishes it as
    `scene.blizzard` on the background context. `scene.blizzard` still overrides
    the lot, which is the gallery's seam.
- [`src/engine/shadows.js`](../src/engine/shadows.js) — shared radial contact
  shadow painter.
- [`src/game/draw.js`](../src/game/draw.js) — grounded-object shadows, bedded
  hazard art, and slope-aware clipping.
- [`src/game/run.js`](../src/game/run.js) — bear-trap contact and hazard flow.
- [`src/engine/audio.js`](../src/engine/audio.js) — procedural `trapSnap` cue.
- [`tests/pixel-background.js`](../tests/pixel-background.js) — ridge
  attachment, orientation density, hill alpha, the no-shadow contract, and the
  aerial-perspective ordering.
- [`tests/frost-aurora.js`](../tests/frost-aurora.js) — curtain counts per
  stage, the gain-to-zero seam, the inked extent against the ridge line and the
  frame top, and the portrait rectangle.
- [`tests/frost-weather.js`](../tests/frost-weather.js) — the blizzard ladder
  (clear until the first checkpoint, a higher rung at every checkpoint after it,
  each level opening on the sky the last one closed under, the odometer fallback
  meeting the ladder at the boundaries) and the feet contract (planted high, skirted to the deepest ground, contour sampled past
  the footprint).
- [`tests/object-shadows.js`](../tests/object-shadows.js) — detached-shadow,
  slope-clip, bear-trap, and soft-shadow regressions.

## Validation completed

Passed:

- `node tests/pixel-background.js`
- `node tests/object-shadows.js`
- `npm test`
- `npm run build`
- `git diff --check`

Paper renders were also inspected with local headless Chromium at both
landscape and portrait sizes. The worktree was already dirty; these changes
remain uncommitted and must not be isolated by resetting unrelated files.

## Handoff checks

Before judging the result in the game, reload the level/page so the scenery and
`parallaxHills` caches are rebuilt. Then check Frost-1/2/3 in portrait and
landscape, especially a large fortress, a wide ice rock, and each pine on a
strongly sloped ridge.

The fast project gate is green. `npm run test:all` / physical-phone review has
not been used as acceptance for this pass, so viewport-specific browser and
device presentation still need a final check.
