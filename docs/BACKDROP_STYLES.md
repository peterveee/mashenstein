# Backdrop styles

Status, 28 Sep 2026: **Crypt Shift ships the gouache backdrop, and Speed Zone ships mid-century
modern** (see "Decisions" below). Everything else is exploration.
Scope: whole-backdrop art styles, and which cabinet each might suit.

The question: do the cabinets keep sharing one look (three of them are cut paper today),
or does each cabinet get a backdrop style of its own? This doc records the first style
bake-off, compares its favourites with paper, suggests where each might fit, and lists
what has to change if a cabinet switches style.

## Decisions

- **Crypt Shift → gouache, shipped 25 Sep 2026.** Peter: "gauche would be amazing for crypt …
  a huge improvment on what we have now … please make that happen now". It is the new
  `gouache` pack, painted in `src/engine/stylePacks/cryptGouache.js`. It is the bake-off
  card's hand over a longer country: each layer's period is two to three times the
  card's, with four tombs, a second ruin, more trees, railings and lamps, and each stage
  opening on its own stretch. It is portrait-aware, and it is baked during the briefing
  (`game/art-warmup.js`) in 2048 px tiles. The `vhs` pack is kept for the lab's crypt-style
  cards; since 1 Oct the Surge cycles the gouache night instead.
- **The brown-out is underground only.** Peter: "at present we present low light, but
  perhaps we park that and only do that on the underground sections". Crypt-1 and crypt-3's
  blackout missions now darken only the catacomb, following its depth (`brownOutLevel` in
  `run.js`); the surface shows the painting.
- **Crypt's graveyard life, shipped 26 Sep 2026** (`stylePacks/cryptLife.js`): Peter's
  picks from the lab bake-off (belfry bats, far storm, sheet ghosts in groups of 1–3, owl,
  crows, black cat, will-o'-wisps), spread along each layer. The bake-off section keeps all
  fourteen ideas ("keep bakeoff items"). Baked textures are budgeted: past ~50 MB the GPU
  cache thrashed (0.2 → 5 ms a frame), so the bake is capped at 2x and the sky and moon
  glow bake at half that.
- **Speed Zone → mid-century modern, shipped 28 Sep 2026.** These are Peter's picks from the lab
  bake-offs:
  - **The light** is the afternoon arc: midday at speed-1's opening to dusk at speed-3's finish,
    each stage opening in the light the last one closed in (`arcPalette`, five authored
    keyframes blended in OKLab).
  - **The coyote** is the Chuck Jones one (B of the coyote bake-off). It was given the
    lying-down doze, the chorus with a pup and a square-on wink, so it plays every show the
    paper coyote did.
  - **Every backdrop object** ships as the object sheet painted it.
  - **The road keeps its paper finish.** It and the hero take the late light: a warm cast from
    golden hour, then a violet veil into dusk.

  It is the new `mcm` pack (stylePacks/index.js `mcmPack`), painted in `speedMcm.js`,
  `speedMcmObjects.js` and `speedMcmCoyote.js`. The pack is the paper desert's composition
  with another hand. It uses the same layer offsets, bases and portrait bands, and it places
  everything with the paper desert's own placement code. `drawDesertLife` takes the MCM
  painters through a seam, so the coyotes, devils, tumbleweeds, pumpjacks, speed trap and jet
  keep all their latches and clocks. The textures are baked during the briefing
  (`game/art-warmup.js`), and the sky's still part is cached as a bitmap. The `faux3d` pack
  is kept whole: its road is this pack's road. Since 1 Oct the Surge cycles `mcm`, not
  `faux3d`. The lab's bake-off files now draw with
  the shipped painters; the shipped look is in the lab section *SPEED ZONE — mid-century
  modern, as shipped*.
- **Frost's sky → wax crayon on white paper, shipped 29 Sep 2026; the rest of Frost stays
  paper.** These are Peter's picks from the lab sections *FROST FORTRESS — crayon* and
  *crayon sky in the snow*:
  - **The full crayon world** was tried and turned down: "i am not in love with it... but
    i DO like the way the sky looks".
  - **The crayon sky over the paper world**, on white paper rather than blue-grey.
  - **The paper aurora back**, not the crayon one: "not so much for the aurora, could that
    be the other way?"
  - **The aurora brighter**, because the crayon navy swallowed it. It is 2.4× on frost-3
    only; by day and in the afternoon 2.4× was a green wash, so frost-1 and frost-2 stay
    at 1×.

  The painter is the bake-off's (`stylePacks/frostCrayon/`, with the lab files kept as
  re-export shims). The watercolor pack hands it the whole sky pass through
  `backgroundContext.frostSkyPainter`, and `null` still draws the cut-paper sky. The sky
  bakes once, at a fixed 2.5× scale, with its geometry taken with the portrait crane at
  rest, because the render-scale ladder and the crane both used to force re-bakes
  mid-run. It is warmed in `RunState.enter`, before the song starts.
- **Plumber keeps paper**; Peter agrees it is a good fit.
- **Styles may repeat across cabinets.** Peter: "We don't necessary HAVE to have a
  completely different style for every single level.. some can repeat if it makes sense …
  eg., paper x 2, mcm x 2, gouache, lcd, neon". The aim is four or five styles spread over
  the nine cabinets, instead of the four paper cabinets there are today.
- **Voxel moved to B level** (Peter).

## Could styles be unlocked?

Peter asked: "theoretically we could unlock these styles? so we don't lose the work we've
done on paper already". Yes. Each style is a pack, and a cabinet names its pack in
`src/data/cabinets.js`, so a setting could pick an unlocked alternative per cabinet (for
example, crypt: gouache or the old VHS tape). The catch is upkeep: every new piece of
scenery for that cabinet has to be painted in every style it can be played in, or the
older style goes stale. It is cheapest for a style that is frozen once it is replaced
(keep it exactly as it was, and add nothing to it).

## The first bake-off: Crypt Shift, 25 Sep 2026

Thirteen styles painted one Crypt Shift composition, with the shipped VHS backdrop as the
control. Only the **world** was on trial. The lane (ground, hazards, hero) is the shipped
one in every card: "only the background will change our game lane remains as is".

- **Gallery:** lab page, sections *CRYPT SHIFT — backdrop styles, A level* and *…, B level
  (reference)*. Snapshot: `galleries/2026-09-25-44d12b3-lab.html`.
- **Scene:** a ruined abbey whose spire crosses the moon, on the far ridge; a graveyard
  hill with two mausoleums, headstones, crosses and dead trees; a near bank with gnarled
  trees, iron railings, a gate and a gas lamp; two fog bands; stars, clouds and bats. Two
  screens per style (the abbey, and four screens on at the second tomb), on an 8-second
  loop so the parallax shows.
- **Code:**
  - `src/dev/crypt-styles/plan.js`: the shared composition. It holds four depth layers
    (sky, bg, mid, fg), their parallax rates, ridge lines and item positions, and resolves
    them into a frame for a style to paint.
  - `src/dev/crypt-styles/scene.js`: the card. It draws the style, then the shipped vhs
    lane, crypt hazards and the hero on top.
  - `src/dev/crypt-styles/<style>.js`: one file per style, each exporting
    `STYLE = { id, name, note, paint(ctx, frame) }`.
  - `src/dev/crypt-style-candidates.js`: the A and B lists.
- **Render one style headless:**
  `node work/local/crypt-styles/shot.mjs src/dev/crypt-styles/<id>.js [times] [scale]`.
  It writes PNGs to `work/local/crypt-styles/out/`. It lives in `work/`, so it is
  disposable: promote it to `tools/` when the next bake-off starts.

### A level: Peter's favourites

**A1 Gouache Night** (`gouache.js`)
- **Look:** an opaque, painted storybook night, like 1950s Disney background painting or
  Cartoon Saloon. No outlines; dry-brush sky; a broken moonlit rim on every edge that faces
  the moon; fog in washes; paper tooth over everything. The far ridge is paler, bluer and
  softer.
- **Strengths:** mood and light. It handles night, dusk and weather better than anything
  else in the set.
- **Risks:** it bakes to bitmaps, so it is the costliest to set up and hold in memory. The
  soft far layer looks slightly stepped when magnified.

**A2 Wax Crayon** (`crayon.js`)
- **Look:** pale wax crayon on black construction paper. Every fill is hatching broken by
  the paper's tooth, and the outlines wobble. Far hills are sparse strokes; near things are
  pressed hard. The lamp is the only orange.
- **Strengths:** warm, hand-made, charming. The strokes are seeded per item, so nothing
  crawls as the camera moves.
- **Risks:** the busiest texture of the five. It needs a calm band above the lane, and the
  graveyard headstones read ghostly in the fog.

**A3 Shadow Puppetry** (`puppet.js`)
- **Look:** Lotte Reiniger cut-paper silhouettes with pierced tracery, hooked thorns and
  scrollwork, over glowing teal-to-amber paper. Depth comes from stacked screens: the far
  ridge is a hazy rose cut-out, and only the near bank is true black.
- **Strengths:** the most atmospheric of the five, and the silhouettes are very clear.
- **Risks:** it needs a backlight, so it is a dusk or night style, not a daytime one. Black
  cut-outs right behind the lane would swallow dark hazards, so the strip above the lane has
  to glow. The painter, not the bake-off, has to guarantee that.

**A4 Mid-Century Modern** (`midcentury.js`)
- **Look:** 1958 UPA and Mary Blair. Flat kidney, triangle and lollipop shapes in teal,
  coral, mustard and olive; a thin loose ink line printed out of register over them;
  dry-brush in the fields; starburst stars.
- **Strengths:** a strong period voice, and flat enough to stay legible. It is the closest
  of the five to paper in how it reads.
- **Risks:** the hero's teal shirt shares a hue with the teal far ridge (fine at crypt's
  darkness; check it in daylight), and railings lose their colour on dark ground.

### B level: kept for reference

- **B1 16-bit pixel art:** a late-SNES graveyard on 16 colours, drawn at half resolution
  with Bayer dithering.
- **B2 Clean ink line:** flat fills with one outline weight. This is the reference
  implementation of the plan.
- **B3 Plasticine:** Aardman-style clay, lit per pixel from a height field, with
  thumbprints. It has the heaviest one-off bake (about 0.4 s).
- **B4 Voxel diorama:** everything built from shaded cubes, drawn as crisp vectors, with
  ridges stepping in whole blocks. Peter first put it in the A level, then moved it here
  the same day. It is still worth a look for Frost's ice (see below).
- **B5 Blueprint:** a cyanotype architectural elevation with dimension strings. Its title
  block and north arrow sit where the HUD goes.
- **B6 Red Wedge (constructivism):** red, black and cream on hard diagonals. Loud behind
  the hero's head.
- **B7 Pop art comic:** Ben-Day dots, heavy outlines and a magenta ridge. The loudest card.
- **B8 Riso print:** three ink plates overprinting on cream stock, with halftone screens
  and misregistration.
- **B9 Hybrid Vector:** Peter's brief. Voxel and blueprint structure, mid-century shapes,
  constructivist rays, halftone, and four inks (navy, crimson, cream, ochre) printed off
  register. B4–B8 are the brief's other ingredients on their own; mid-century modern and
  shadow puppetry are A level.

## Compared with our paper

Paper is the house style of the first two acts: Plumber, Speed and Frost all share
`paper-material.js`, with cut layers, a hazy drop shadow a hair down and back, the
`cardstockClear` fibre and a soft rim. What it does well:

- **Daylight.** Bright, clean, even colour is where paper is strongest, and where most of
  the A level is weakest (gouache, crayon and puppet were all judged at night).
- **Legibility.** Flat pieces with a thin shadow are the easiest backdrop to read the
  clean-line cast and hazards against.
- **Cheap to extend.** A new landmark is a few `cut()`/`tone()` calls, and it matches
  everything already painted. The scenery added on 24 and 25 Sep (sheep, cottages, wolves,
  igloo, fortresses) shows how fast that goes.

What the A level has that paper doesn't:

| | Paper | Gouache | Crayon | Puppet | Mid-century |
|---|---|---|---|---|---|
| Light and mood | even, daylit | **best**: glow, haze, rim light | lamp and moon glow | **backlight is the look** | flat, stylised |
| Texture | fine fibre | brush and paper tooth | **heaviest** | paper grain in the glow | dry-brush in the fields |
| Line | none | none | wobbly crayon | none (silhouette) | loose, off register |
| Shape language | soft cut shapes | painted masses | hand-drawn | filigree cut-outs | kidneys, triangles |
| Reads by day? | **yes** | yes | on white paper, untested | no | yes |
| Distinct from the cast | close match | close | medium | medium | close |

In one line: paper is the best **daylight house style**, and the A level is where the
**character** is. Giving each cabinet its own style buys variety at the cost of that shared
finish, plus a full scenery repaint per cabinet (see below).

Of the three paper cabinets, to my eye:

- **Plumber** is the one where paper fits best. It is a toy-theatre countryside, and the
  most complete (barn, windmill, balloons, sheep and collie, four cottages, three kinds of
  bush, the volcano, the cloud pal).
- **Frost** fits paper well (cut-paper snow is a classic), and it has had the most new
  paper scenery of all in the last two days.
- **Speed** is the weakest paper fit. The desert already reads as flat graphic colour
  (strata, mesas, sunset gradient), so the paper finish adds little. That makes it the
  natural one to convert.

## Which style where: suggestions, not decisions

| Cabinet | Today | Suggestion | Why |
|---|---|---|---|
| Plumber Panic | paper (`pixel`) | **keep paper** | Paper's best fit and the most finished. If anything, test gouache or crayon-on-white in daylight only to confirm paper holds. |
| Speed Zone | **mid-century modern (shipped 28 Sep)** | — | The Road Runner desert (Maurice Noble's layouts) *is* mid-century modern: mesas, stylised cacti, a coyote on a ledge, dust devils, tumbleweed. Speed already had all of those. |
| Rhythm Bankruptcy | LCD | keep | Already a distinct, finished identity. |
| Frost Fortress | paper (`watercolor`) | **keep paper for now**; bake off voxel and gouache | Voxel is on the nose for ice: the igloo, the ice-block bridge, the crystal citadel and the fortress are blocks already. Gouache handles the day → low sun → dusk light. Paper has just had a lot of new work, so any switch needs to clearly beat it. |
| Crypt Shift | **gouache (shipped 25 Sep)** | — | The thinnest backdrop in the game, so the biggest gain. The scanlines went with the tape. Puppet was the runner-up. |
| Terminal Velocity | neon | keep | Already distinct. |
| Cardboard Kingdom | `cardboard` | **crayon** (or voxel) | A kids' craft world: crayon on construction paper or card fits the theme, and today's pack is very thin. Voxel reads as boxes. |
| Corporate Kombat | `doodle` (graph paper) | keep doodle | Already a sketchbook look; crayon would be too close to it. |
| The Surge | cycles every cabinet's shipped pack, glitching | keep `SURGE_CYCLE` in step | The cycle is a list in `stylePacks/index.js` (`SURGE_CYCLE`), not derived. When a cabinet changes style, swap its entry; `tests/surge-cycle.js` fails until you do. Since 1 Oct the look changes on the Surge song's bar line (four bars a look, each stage opening three looks on), with a random move each change, and glitches between, worse each stage and reaching the lane from surge-2: `stylePacks/surgeCut.js`, picked in the lab sections *surge-look-changes* and *surge-glitching*. Each pack paints with the Surge's colours and stage index, so cabinet-gated extras (Frost's crayon sky, the plumber sun) stay off unless the pack opts the Surge in, as `mcm` does. |

Where the rest of the A level could go:

- **Shadow puppetry** needs a backlit dusk or night: Crypt (runner-up), Frost-3's dusk
  against the aurora, or the intro film and cutscenes.
- **Voxel** could be Frost's challenger, or the look of a future act-3 cabinet (see
  `ALTERNATE_CABINET_THEMES.md`: Gravity Grid or Pinball Panic).

## What changes if a cabinet gets its own style

The engine already supports this: each cabinet names its pack (`style:` in
`src/data/cabinets.js`), and a pack's `bg()` is the backdrop. A new style is a new pack,
or a new `bg()` for an existing one. The lane's `ground()`, the hazards and the cast stay
as they are. What still has to happen:

1. **Repaint the cabinet's scenery.** A style isn't a filter: every animated and static
   scenery item has to be redrawn in it. `LEVEL_SCENERY.md` is the inventory; Speed has
   about 12 background items plus mesas and horizon props, and Frost about 16. The
   placement code (stage fractions, cells, summits, show timings) can stay: only the
   painters change.
2. **Stages and light.** Each cabinet has three stages, often with different landmarks
   and light (Frost's day, low sun and dusk; Speed's sun bearing). A style has to take
   those lighting inputs. The bake-off painted one stage at one time of day.
3. **Portrait and camera.** The shipped packs read `backgroundContext`: the portrait
   scenery bands at zoom 3.5, the crane's own depth table, and `BG_FOLLOW` on sky roads.
   The bake-off styles are landscape-only and ignore all of it.
4. **Bloom.** Bright skies need `lightBg: true` to opt out of the GPU bloom, which clips
   pale backgrounds to white. A daylight mid-century Speed would need it.
5. **Performance.** Gouache, crayon, plasticine and voxel bake bitmaps on the first frame
   (up to about 0.2 s) and hold 10–25 MB. That has to be warmed in `RunState.enter` before
   the song starts (see the first-draw note in the memory index), and budgeted for portrait,
   which costs about 3x the pixels. Per-frame costs are all fine (table below), with one
   trap found shipping Crypt: slice any wide bake into tiles (2048 px). An 11,000 px strip
   blitted on a slow path at 3.2 ms a frame; tiled, the whole backdrop costs 0.1 ms, the
   same as the paper packs.
6. **The lane next to the new world.** Plumber's lane slab has a paper finish; Crypt's
   has VHS scanlines. Decide per cabinet whether the lane keeps them. Check every hazard
   and the hero against the new backdrop (the legibility rule), and on Crypt, under the
   brown-out missions.
7. **Everything that shows a backdrop:** the gallery's production background sections,
   the screens gallery, the feature and scenery reels, promo renders, and tests that pin
   paper (`paper-material`, `pixel-background`, `portrait-layout`). Then update
   `LEVEL_SCENERY.md`.

## Vector or bitmap?

No style loads a picture: every pixel is computed from code. But only B2 ink is pure vector
all the way to the screen.

| How it draws | Styles |
|---|---|
| Pure vector every frame | ink |
| Vector shapes plus small generated texture tiles (dots, grain) | mid-century, hybrid, pop art, constructivist, blueprint, riso |
| Vector drawn once, then cached as a bitmap at the screen's scale | gouache, crayon, voxel, puppet (sky), plasticine (lit per pixel) |
| Pixel by design (240×135, scaled 2x) | 16-bit pixel |

A cached bitmap is re-baked for each screen scale; at a scale it wasn't baked for, it is
resampled and goes slightly soft.

## Cost, measured headless at 2x

| Style | Per frame | First-frame bake | Style | Per frame | First-frame bake |
|---|---|---|---|---|---|
| gouache | ~5 ms | ~165 ms, ~18 MB | pixel | ~0.6 ms | — |
| crayon | ~2.2 ms | ~185 ms, ~11 MB | ink | ~2.4 ms | — |
| voxel | ~6.1 ms | sprites as they appear | plasticine | ~2.9 ms | ~400 ms |
| puppet | ~6.4 ms | ~22 ms | blueprint | ~4.5 ms | ~30 ms |
| mid-century | ~4.2 ms | — | pop art / red wedge / riso / hybrid | 1–4 ms | ≤ 90 ms |

These are desktop headless numbers for the backdrop alone. A phone in portrait pays
roughly 3x.

**Speed Zone's shipped `mcm` pack**, measured 28 Sep:
- **Headless software canvas at 2x:** 3.4 ms a frame against the paper desert's 2.6.
- **Desktop GPU (Metal, 2x):** 0.8 ms against 0.4.
- **In the running game (M3, GPU):** the backdrop pass takes 0.5–0.6 ms of CPU a frame in
  either orientation, against Plumber's 0.1–0.2, and frames held 120 Hz.
- **What it took to get there:** the sky's still part is cached as a bitmap, laid down at
  whole device pixels. The dunes' clip and dry brush stop 40 px under each layer's ground
  line, and below that the hill is one plain rect. The dunes are now most of what is left.

## Next bake-offs: converting existing level art

Each should reuse the crypt method: one shared composition with that cabinet's own real
scenery, one file per style, the shipped lane on top, and the shipped look as the control.

1. **Speed Zone in mid-century modern: shipped, 28 Sep** (above). The bake-offs that led to
   it are still in the lab: the two-screen card, the coyote, every object, and the light
   across the act.
2. **Crypt in gouache: shipped** (above). What would expand it further: a landmark of its
   own per stage (the abbey, a castle keep, a lych-gate); life in the graveyard (an owl,
   will-o'-wisps, a ghost between the stones, crows on the railings); a moon phase per
   stage.
3. **Frost Fortress: paper vs voxel vs gouache,** at frost-1 day and frost-3 dusk, using
   the fortress, the igloo and the wolves' ledge.
4. **Plumber Panic: paper vs gouache (day) vs crayon on white.** Mostly to confirm that
   paper holds.
5. **Cardboard Kingdom: crayon vs voxel,** since today's pack is thin.
