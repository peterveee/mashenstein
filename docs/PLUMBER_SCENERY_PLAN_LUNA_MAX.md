# Plumber’s Panic scenery — implementation handover for Luna Max

Date: 2026-09-13
Repository: `/Users/Peter/mashenstein`
Status: proposed implementation plan; no scenery changes have been made by this handover.

## Brief

Make the Plumber levels feel more inhabited and interesting by adding small handmade scenery clusters to the existing green hills. Preserve the open blue sky, rounded green hills, snow-capped mountains, volcano, smiling cloud, and paper-cutout identity. The reference screenshot shows plenty of open green space where a few deliberate details would help.

Build simple Canvas 2D shapes, cached at appropriate resolution. No generated raster assets are needed. These are decorative background objects: no collision, pickups, triggers, sounds, mission changes, or new gameplay rules.

Implement in two passes:

1. Establish flowers/grass, bushes, short fences, and small plumbing vignettes. Verify their composition in landscape and portrait.
2. Add sparse houses, pinwheels, butterflies, and short hillside paths/bridges using the same system. Keep their frequency low. Complete both passes, adjusting density after visual review rather than treating every available object as something every screen must contain.

The intended impression is an occasional little scene: a leaking elbow pipe watering daisies beside a crooked fence, followed by a quiet stretch of countryside.

## Working rules and current source map

Read any applicable AGENTS.md before implementation. Inspect `git status --short` and preserve pre-existing changes. At handover time, `src/engine/stylePacks/index.js`, `src/engine/paper-material.js`, and the paper handover already contain unrelated edits. Re-read current source rather than replacing these files from an older revision.

Relevant current entry points:

- `src/engine/stylePacks/index.js`: `pixelPack(settings)` owns the Plumber background. Its near hills use `nearAmp = 34`, wavelength `50`, parallax factor `0.35`, and a layout-derived `nearBaseY`.
- `parallaxHills()`: caches repeated hill tiles and existing ridge trees. Its current near-hill period is `round(PI * 50)`, about 157 logical pixels. Do not repeat an entire new village at that short interval.
- `ridgeYAt()`: samples the actual drawn ridge, including camera phase and `coverageLeft`. Use it rather than an independently approximated sine curve.
- `backgroundPaintCoverage()` / `backgroundCoverage()`: visible background bounds, including shifted portrait coverage. Do not assume the visible band is `0..W`.
- `portraitSceneryOffset()`, `sceneryRidgeBaseY()`, and `backgroundY()`: existing vertical composition. New scenery must travel with its owning hill layer.
- `clearPresentationCaches()` and `bakeSS()`: presentation refresh and bake density integration.
- `src/engine/paper-material.js`: existing material recipes and cache infrastructure.
- `src/engine/scenery-layout.js` and `src/engine/composition-profile.js`: read to understand layout; change only if the new scenery demonstrates a specific shared-layout need.
- `docs/PLUMBER_PAPER_RENDERING_HANDOVER.md`: current art/material decisions. The live source and this handover currently select `cardstockClear`; preserve current selection and settings.
- `tests/pixel-background.js`: existing draw probes and portrait setup. It installs `tests/dom-stub.js` before importing the style pack.

Keep the feature gated to `cab.id === 'plumber'`. Support paper mode and the existing `paper=off` comparison: the same props remain visible in flat colours when paper is disabled, with paper finish/shadows omitted.

## Composition and visual hierarchy

All dimensions below are starting values in renderer logical pixels, not screenshot pixels or CSS pixels. Tune against the existing ridge trees, which are currently roughly 9–14 logical pixels tall. Bake using the existing density helper; aim for at least 2x authored detail without overriding the project's density policy blindly.

Use these rules:

- Place objects on or just inside the green background hills. Let the existing foreground terrain naturally cover their bases where it overlaps.
- Keep upright props upright; sample the hillside under each foot/post instead of rotating a whole house or pipe to match a slope.
- Use restrained colours and small silhouettes. Bright gold, warning symbols, heavy black outlines, and crate-like block shapes would compete with gameplay cues.
- Keep the existing cloud face as the principal scenery character. Do not put faces on flowers, houses, pipes, or bushes.
- Keep the upper sky clear. New movement belongs close to its flower or pinwheel cluster.
- Aim for approximately 1–2 substantial clusters per 480 logical pixels, plus 2–4 tiny vegetation accents. These are tuning targets, not a promise that every viewport contains that many.
- Leave approximately half the hillside frontage visually quiet. A narrow portrait crop may contain only one small cluster or part of a larger one.
- Limit a substantial cluster to approximately 28–60 logical pixels wide. Separate major cluster anchors by at least 100 logical pixels; use more spacing for houses.
- Reuse nearby existing trees as part of a scene. Do not indiscriminately stack every new prop over a tree crown.

## Element recipes

### 1. Flowers and grass — most common accent

**Appearance:** small irregular groups of three daisies, with occasional pink flowers and folded grass leaves. Clusters are approximately 10–18 wide and 5–9 tall.

**Build:**

1. Draw 2–3 narrow green stems, varying their height by about 20%.
2. Add one pointed leaf polygon on one side of each stem. A second, darker half gives a folded-paper cue where it remains legible.
3. Build a flower head from five small cream petal ellipses around a muted ochre centre. At the smallest size, simplify the petals into one scalloped silhouette.
4. Vary head position and stem lean slightly; make one flower lower than its neighbours.
5. Build grass as three tapered triangular blades, not many thin strokes. Use two greens.

Starting colours: stem `#4f8650`, leaf `#6d9c55`, petals `#eee4bf`, centre `#bd9546`, occasional pink `#cf8d9c`. Adjust toward the existing scene palette during review. These are proposals, not replacements for global palette values.

Bake 3–4 finite variants. Do not animate every flower. Plant bases 1–2 pixels inside the ridge so stems cannot hover.

### 2. Rounded bushes — small supporting shapes

**Appearance:** squat overlapping paper lobes, approximately 10–18 wide and 5–9 tall. Broader and shorter than existing trees, with no visible trunk.

**Build:** merge three overlapping circles/ellipses into a silhouette, flatten or bury the bottom, and add a smaller overlapping green lobe. Optional blossom variant gets only 2–3 tiny muted pink marks. Avoid glossy spherical highlights.

Use a mid green near `#4d8e54` and a lighter panel near `#70a15b`; tune for separation from the particular hill colour. Put one bush at a fence end or beside a house, occasionally alone. Avoid a continuous hedge band.

### 3. Short wonky fences — common structural accent

**Appearance:** 2–3 warm cream timber posts and two narrow rails. Approximately 18–30 wide and 7–11 tall; softly crooked, not ruined or hazardous.

**Build:** use tapered four-point polygons for posts, with at most 3–6 degrees of lean. Draw rails behind posts. Sample the ridge separately beneath each post; connect rails using those post heights. One darker side strip is enough to suggest layered card. Omit tiny woodgrain and nail details that disappear at gameplay scale.

Starting colours: timber `#c9b78b`, shaded edge `#a18b65`. Partly bury post bottoms and tuck a bush or flowers near one end. A gap or one lower rail is sufficient variation; avoid arrows or signs implying a route choice.

### 4. Small plumbing vignettes — signature detail

**Appearance:** a little elbow pipe emerging from the hill, sometimes with a muted red valve wheel, occasionally watering flowers. Pipe approximately 8–14 wide and 8–14 tall; combined scene approximately 24–40 wide.

**Build:**

1. Draw a short vertical stalk and right-angle outlet as a single broad silhouette, using rounded corners or a short curved elbow.
2. Add one flat darker side band and a small outlet ellipse. Keep the opening visibly horizontal, unlike a large playable pipe entrance.
3. Add a collar rectangle where sections meet. No reflective chrome gradient.
4. Optional valve: 3–4 pixel diameter muted red ring, centre dot, and three spokes. Simplify if the spokes become noise.
5. Place the outlet above a small flower clump. An optional droplet travels only 3–5 pixels downward and vanishes inside the greenery.

Starting colours: body `#7d9992`, side `#607e79`, valve `#b77466`, droplet `#a4c5ce`. Keep droplets low contrast and below the outlet. Use one repeating droplet at most per visible watering scene, about once every 1.5–2.5 seconds; no particle emitter or splash simulation. Reduced motion uses a fixed attached bead or no droplet.

Variants: elbow only; elbow plus valve; watering elbow plus three daisies. Avoid tall green cylinders, glowing contents, or prominent rims that suggest interactive platform pipes.

### 5. Tiny hilltop houses — rare landmarks

**Appearance:** approximately 15–23 wide and 17–25 tall, only modestly larger than the existing trees. Warm wall, irregular pitched roof, tiny chimney, and one round window.

**Build:** a slightly uneven wall quadrilateral, triangular/trapezoidal roof with a small overhang, short chimney behind the roof, and one dark muted circular window with a cream surround. A small doorway is optional if it remains readable. Use flat panels and one restrained roof edge shadow.

Starting colours: wall `#d0c39f`, roof `#ad7969` or `#7e959a`, window `#697970`. Select a broad, low-slope ridge location. Bury the lower wall behind a bush or the hillside. No smoke needed; the volcano already supplies a major smoke feature.

Target roughly one house per 900–1400 logical pixels of scenery distance. No rows of houses and no prominent route leading toward a doorway.

### 6. Paper pinwheels — sparse local motion

**Appearance:** thin stalk, four folded triangular blades, and a small centre pin. Approximately 10–14 tall, rotor 6–9 across.

**Build:** bake the stalk/base separately from the rotor. Draw four simple triangular blades around the origin, with alternating muted terracotta, cream, dusty blue, and sage faces. Keep the rotor centre aligned to the stalk tip.

Rotate the cached rotor once every 12–20 seconds using the supplied game time and a stable per-instance phase. Never use wall-clock time or accumulate rotation frame by frame. Reduced motion freezes at a pleasing diagonal angle. Start with at most one visible pinwheel.

### 7. Butterflies — rare flower-associated motion

**Appearance:** tiny pair of wing lobes and a short body, approximately 3–5 wide and 2–3 tall. Muted peach or lavender; never gold or flashing white.

**Build:** cache open/partly closed wing poses, or transform cached wings gently. Move within a small local loop 6–10 pixels wide and 3–5 high, directly above its flowers. Use continuous low-amplitude movement and slow wing changes rather than flickering visibility. Start with one butterfly; permit a pair only if the scene remains quiet.

Use deterministic time/phase and no gameplay entities. Reduced motion draws a resting butterfly on a flower. Do not let its path wander into the upper sky or wrap independently across the screen.

### 8. Hillside path and tiny bridge — rare static vignette

**Appearance:** a short cream path curving over the face of a background hill, tapering toward the ridge. A miniature bridge can cross an implied shallow hollow within that same hill. Entire vignette approximately 25–45 wide and 12–22 tall; bridge 12–18 wide.

**Build:** draw the path as a filled tapered curved ribbon and clip it strictly to the existing hill silhouette. Avoid a constant-width stroked line. Fade it through geometry/occlusion behind a bush or hill edge rather than an alpha gradient. For the bridge, use a shallow arch or narrow deck polygon, two tiny posts, and one muted rail. A short darker green hollow beneath can imply a crossing without introducing a bright water stripe.

This is background illustration, not a road extension. Keep the path diagonal or winding and wholly behind foreground terrain. Never line it up with a pit lip, suspended route, finish runway, or playable bridge. If this cannot be made unambiguous at actual gameplay size, retain the short hill path and omit the bridge variant, documenting the visual reason.

## Placement and rendering architecture

Prefer a small dedicated scenery module for pure recipes/layout helpers if that keeps the large style-pack file manageable. Keep integration local to the Plumber near-hill background pass. Do not build a generic scene editor or new entity system.

Recommended approach:

1. Define a compact finite catalogue of prop and cluster recipes. A cluster holds local offsets, sprite variants, an anchor, approximate bounds, and optional animation metadata.
2. Generate placements from integer scenery cells with a small deterministic hash and a constant Plumber scenery seed. Do not consume gameplay RNG. Use an existing stable stage identifier only if the render context already provides one conveniently; stage variation is optional.
3. Work in scenery-layer coordinates. At factor `0.35`, camera travel is `camX * 0.35 * ZOOM`. Match the existing coverage origin, hill phase, and vertical transform exactly. Account for `coverage.left` when using `ridgeYAt()`; pass it as `coverageLeft`.
4. Enumerate cells overlapping visible background coverage plus the largest cluster overhang. Derive cell bounds directly from camera travel, with correct floor/modulo behaviour for negative coordinates. Do not maintain a growing world list.
5. Anchor static and animated parts to the same cluster position. Sample the actual ridge for each independent foot or root. Evaluate wide footprints before selecting a house or fence site; choose a deterministic alternate position or simpler cluster when the slope is unsuitable.
6. Paint new hillside details after the near hill fill, inside the same near-layer transform and before the existing `paintClouds()` call. Preserve the current cloud ordering. Face-of-hill paths need a local ridge clip; upright props must be allowed to rise above that clip.
7. Keep static props in a bounded sprite/cluster cache. Animation only transforms already baked art. Use finite variant keys, material/strength, paper mode, and bake density; never include time or camera position in raster cache keys.
8. Register cache clearing with the existing presentation refresh. Rebuild at the settled density/layout change, preserving gameplay state. Pad cached bounds for protruding petals, chimney, rotor, and shadows.

Important: existing hill trees repeat in a short tile. Avoid putting all new props into that same tile. A separate deterministic cell sequence gives longer visual variation while retaining the correct ridge anchor. Resolve crowding with existing trees using their actual placement recipe or a shared small helper; do not duplicate a subtly different tree-position formula. Avoid redesigning the tree renderer just to add flowers.

Suggested cluster catalogue:

- Tiny flowers or grass: frequent standalone accent.
- Fence + low bush + flowers: common.
- Watering pipe + daisies: occasional signature scene.
- Valve elbow + grass: occasional.
- Pinwheel + flowers: uncommon.
- House + bush + short fence: rare.
- Path + bush, optionally miniature bridge: rare.
- Quiet cell: frequent and explicit.

Centralize sizes, cell spacing, weights, colours, and animation periods in a concise configuration area. Enforce minimum separation deterministically using neighbouring cells or reserved slots, so appearance does not depend on draw order or which viewport was visited first.

## Paper treatment and performance

Use current material helpers and the selected material; do not generate a new fibre recipe. Texture must stay attached to each prop. Apply finish to the prop silhouette during baking, not as another rectangular sheet over the finished sky/hill. Avoid double-texturing overlapping silhouettes.

Use restrained existing scenery shadow values. At flower scale, a subtle offset edge or no shadow is preferable to a blurry halo. Do not alter the hero contact shadow or global paper settings.

After warm-up, scrolling should produce cached image draws and a small bounded amount of placement arithmetic. No per-frame canvases, grain generation, full-hill retracing, image-data operations, or unbounded caches. Overtime with infinite distance must work without a finite level length. Animation caps are viewport-aware and deterministic; camera movement must not visibly restart an animation.

## Implementation sequence

1. Inspect current source, applicable instructions, existing dirty work, and available preview tools. Record baseline screenshots before edits.
2. Add deterministic layout helpers and static recipes for pass one. Wire them into the Plumber near-hill layer using the existing transform and coverage contract.
3. Make a small review sheet showing each static prop at authored size and enlarged, plus assembled clusters. Save it and screenshots under `work/mockups/plumber-scenery/` with readable names. Gameplay screenshots are the authority for size and density.
4. Review landscape and portrait. Adjust spacing, palette, and ridge grounding before adding more objects.
5. Add pass-two recipes and their restrained animation. Verify reduced motion immediately.
6. Complete focused validation, build, and current served-game review. If the dev server needs restarting to serve current builder/template output, handle it; do not kill unrelated watchers.
7. Deliver changed-file summary, screenshot links, executed check results, and any unverified physical-device/performance observations. No commit or deployment is required by this plan.

## Verification and acceptance

Add focused behavioural coverage for deterministic placement, correct ridge anchoring across camera phase/wrap and shifted coverage, bounded enumeration/cache growth, reduced-motion stability, and Plumber-only gating. Extend existing tests where appropriate. Do not snapshot every petal coordinate or write tests that merely restate constant values.

Exercise the real background draw path with the DOM stub installed, including a fresh cache. This catches missing context methods, invalid draw order, or uninitialized variables that pure layout tests miss.

Run relevant existing checks:

```bash
node tests/pixel-background.js
node tests/paper-material.js
node tests/renderer.js
node tests/portrait-layout.js
npm run build
git diff --check
```

Run any added focused test and syntax checks for changed JS files. If unrelated dirty-work failures occur, identify them precisely; do not silently fix unrelated systems or claim a fully passing suite.

Browser review matrix:

- Landscape at 960×540, plus the current desktop portrait presentation.
- Emulated phone portrait around 390×844, using the actual game composition.
- All Plumber stages: beginning, middle, and later portions; verify actual stage IDs in current data.
- Several fractional camera positions and cell boundaries, long scroll, and an overtime/infinite-distance draw probe.
- Elevated routes, pits, tunnel sections, and the volcano area: decorative paths/pipes must remain clearly background.
- Reduced motion, paper off, and an orientation change that refreshes presentation caches.
- At least one other cabinet to verify feature gating.

Use the existing stage-preview query convention, for example `?goto=stage&cab=plumber&stage=plumber-1&invuln&startAt=7`, on the actual running server. Confirm current query semantics before choosing sampling positions; do not assume the server port or fractional `startAt` meaning.

Acceptance criteria:

- Flowers, short fences, and plumbing details provide visible interest at normal gameplay scale.
- Houses and animated accents remain sparse, with substantial quiet space.
- Every root/post/base stays attached to its hill during scrolling and portrait changes.
- No clipped rotor/chimney/shadow, tile-edge cuts, obvious short repeating scene, or popping at viewport boundaries.
- Decorative props do not look collectible, dangerous, or traversable.
- Existing paper materials, sky/cloud composition, gameplay, and other cabinets retain their behaviour.
- Cache behaviour remains bounded and static art is baked outside the steady-state frame path.
- Screenshots demonstrate landscape and portrait results. Browser emulation is not physical-phone acceptance; source and cache checks alone are not live frame-time measurements.
