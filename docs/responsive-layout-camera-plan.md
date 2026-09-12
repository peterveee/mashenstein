# Luna Max handover: compose the whole portrait screen, with consistent layout and natural camera movement

## 1. Overall goal

Make portrait gameplay look deliberately composed for a tall screen. Distribute the hero, terrain, scenery, sky objects and interface across the available height so the screen feels balanced and populated, with no large accidental stretches of empty sky.

A successful portrait view must look like a scene designed for that shape. Enlarging the canvas, moving the ground down and exposing more plain sky does not achieve the goal.

The placement system must support different viewport shapes while providing:

- A large, readable hero and clear upcoming action.
- Clouds, celestial objects, mountains, buildings and other scenery distributed through the portrait frame.
- Distinct foreground, middle-distance and distant layers.
- Stable, readable HUD, objectives, bonus, messages and controls.
- Convincing depth when the camera follows jumps, islands and underground routes.
- Explicit rules that future elements can follow.

Landscape already works reasonably well. Use it as the visual reference and apply the same underlying rules, with mode-specific composition.

Preserve character identity, physics, collisions, route geometry, musical timing and cabinet art direction.

The checkout contains substantial uncommitted work. Record its status and inspect relevant diffs before editing. Work from the current checkout and preserve unrelated changes. The uncommitted run.js hunk that latches the tunnel pan (one entry pan, one exit pan, no re-pan on ordinary underground jumps) and its portrait-lab test are the baseline: build on them, do not re-derive them.

### Implementation status — 2026-09-11

The first implementation pass is in the checkout, uncommitted. It adds a shared portrait geometry resolver (src/engine/portrait-geometry.js), a scenery composition resolver with normalized bands and one depth number per layer (src/engine/scenery-layout.js), a lower portrait message shelf, high-path reframing, and depth-aware background transforms in all nine packs. It also carries a compact-shelf branch and a short-phone policy that the supported-phone floor above makes unnecessary; the rework handover removes them. Landscape keeps its existing crane-then-zoom camera policy.

The current camera pass also contains two visibility corrections from rendered review: the portrait upper camera boundary is the actual HUD bottom plus a small gap rather than the whole decorative scenery gap, and tunnel framing performs a bounded hero-body visibility correction. Ordinary surface jumps therefore use the spare sky, while a deep tunnel jump cannot leave the hero above the frame in either orientation. These are camera-only corrections; world geometry and the parked tunnel composition remain unchanged.

`npm test`, `npm run build` and `git diff --check` pass. That is necessary, not sufficient: the suites check band arithmetic, not what the packs draw. A rendered review of the pass found defects that make it not ready to commit. The rework is a separate handover: docs/responsive-layout-rework.md. This plan stays the spec; that file says what to change in the checkout.

### Scope

- Supported phones are iPhone 11-class and newer: the smallest portrait viewport this plan designs for is 375x812 CSS px with a 44/34 safe inset. Smaller and shorter phones cannot run the game and are out of scope; no layout rule, test or capture targets them.
- Portrait gameplay stays behind the existing presentation flag (the phone-portrait mode the renderer exposes as an opt-in). Nothing here decides when it ships; that decision is Peter's and is out of scope.
- The run screen only. Hub, food court, minigames, title, attract and menus keep whatever portrait handling they have today and are not touched.
- Landscape behaviour is a baseline to protect, not a second target to redesign. Every landscape change this plan makes is listed explicitly below; anything not listed is a regression.

## 2. Composition comes first

### Design order

Resolve the portrait scene in this order:

1. Reserve readable interface and usable touch controls.
2. Establish hero size, horizontal runway and the main ground position.
3. Compose scenery throughout the remaining height.
4. Position messages without forcing the hero lower.
5. Validate jumps, route changes and camera travel against that composition.

Do not allow layout calculations to leave an unexplained gap and then accept it as extra sky.

### Four coordinate spaces

| Space | Elements | Rule |
|---|---|---|
| World | Hero, enemies, obstacles, pickups, ground, pits, islands, tunnels | Preserve world geometry; use the gameplay camera |
| Scenery | Mountains, buildings, vegetation, decorative birds and weather | Compose for the viewport; move according to depth |
| Sky | Gradient, sun, moon, stars | Compose for the viewport; independent of camera translation |
| Screen | Timeline, HUD, objectives, bonus, messages, controls | Anchor to the safe presentation rectangle |

All proportions refer to the usable game rectangle after safe insets. Account for letterbox offsets before applying physical safe insets.

Scale discrete artwork uniformly. Procedural mountain profiles, scenery distribution and layer spacing may adapt to the available height.

### Shared layout resolver

Build one pure resolver from the existing frame and portrait-layout seams.

Inputs:

- Viewport dimensions and CSS scale.
- Safe insets.
- Presentation orientation and touch capability.
- Stage presentation requirements, including rhythm mode.
- Cabinet scenery profile.

Outputs:

- Safe rectangle.
- Timeline, primary HUD and rhythm rectangles.
- Gameplay rectangle.
- Message shelf, controls and lower-status rectangles.
- Resting ground and hero anchors.
- Outdoor scenery rectangle and layer placement bands.
- Layout revision and fit diagnostics.

HUD painters, touch hit testing, camera constraints and scenery composition must consume this geometry.

Use CSS pixels for minimum text sizes, controls and gutters. Use normalized positions for scene composition. Measure actual panel bounds before allocating subsequent regions.

### Portrait interface and gameplay anchors

Use these as initial targets:

| Region | Initial target |
|---|---|
| Progress and primary HUD | Progress/status plus an objective group in the upper safe band; GOAL/BONUS start expanded, then share one compact row |
| Pause disc | Top right, inside the primary HUD group; the status/goal rows must yield its column |
| Rhythm ribbon | Optional overlay just below the objective group; it does not reserve a layout row |
| Main groundline | Approximately 73% of safe height, capped by the message shelf |
| Chat and notifications | Below the active world view, above controls; portrait cards may use nearly the full safe width with only a 4px CSS side gutter |
| Controls and lower status | Bottom shelf sized from actual controls |

Resolve constraints in this order:

1. Preserve the existing 28 CSS px top clearance and 8px progress rail.
2. Measure status, objective and bonus with at least 12px visible text.
3. Do not reserve the optional rhythm row; draw it over the top of the scenery rectangle.
4. Reserve the existing 100px jump/slide and 88px ability controls, with a 4px authored bottom gutter and measured lower-status labels.
5. Reserve a 64px message shelf above controls with an 8px gap.
6. Keep gameplay at least 12px above the message shelf.
7. Place resting ground at the smaller of 73% safe height and 24px above the gameplay bottom.
8. Keep required gameplay content at least 12px below the measured objective-group bottom; rhythm is decorative overlay and does not move this boundary.
9. In portrait, a tap in the main playfield is JUMP; a downward swipe is SLIDE and a rightward swipe is the hero POWER. The explicit lower controls remain available as the precision targets.

These constraints take precedence over approximate percentages.

Moving speech from the top band to the bottom shelf frees roughly the same height under the HUD that the shelf spends above the controls, so the resting ground moves up, not down. Relocate the speech channel and the floatie band together; do not leave the old top band reserved as well.

### Active high-path framing

The resting ground anchor is not a universal vertical anchor. When the hero is standing on a materially raised route (48 or more logical world pixels above the base lane), portrait switches to a high-path composition. A route that is only being overlapped during an airborne jump does not claim that composition; the camera keeps the normal jump framing until the hero lands. The active route floor is placed at 56% of the gameplay rectangle, leaving approximately 10–18% of that rectangle above the hero while retaining route and landing context below. The transition must use the existing eased pan (k=12 out, 7 back) for its whole duration, then park through ordinary jumps; leaving the route eases back to the lower base-lane composition the same way. Low islands and short ramps below the threshold retain the resting composition.

This rule prevents a high route from producing the large empty-sky region that a fixed 73% base-ground anchor creates. It applies to the camera target only: HUD, controls, message shelf, celestial stability, physics and route geometry remain unchanged.

### Upper-sky density

The portrait scenery profile deliberately fills from the top of the scenery rectangle. Celestial objects occupy 0–14%, upper clouds 10–27% with overlap, middle clouds 32–48%, and lower clouds 50–62%. Far landmark crests occupy 24–44%, middle scenery 48–68%, and near scenery 60–82%. This puts the sun and first cloud group immediately below the objective HUD, raises the distant and near scenery, and keeps the lower route visible without a featureless sky block.

Portrait ridge painters must use these bands for their crest positions, not merely translate a landscape ridge upward from the authored groundline. Their bodies may continue below the crest and behind the near layers. Landscape retains the authored groundline-based ridge coordinates.

The stack closes on every supported phone. With the shipped frame, HUD and control code plus the shelf and gaps above, the headroom above the resting ground and the height a hero plus one base jump needs are:

| Phone | Headroom above ground | Hero + base jump apex |
|---|---:|---:|
| 375x812 | ~304 CSS px | ~237 CSS px |
| 390x844 | ~313 | ~246 |
| 414x896 | ~363 | ~262 |
| 430x932 | ~365 | ~272 |

So ordinary jumps stay camera-still on the whole supported range, and no short-height policy, compact shelf or one-row HUD is needed. The resolver keeps one set of rules for every device; if a future phone falls below 375x812 it is unsupported, not a new tier.

Resolve band heights from reserved rows, never from live content: objective wording changes mid-stage and must not move the scenery rectangle. Measure actual panel bounds only for diagnostics and the fit report. Re-resolve on stage entry, orientation change and viewport change; decide explicitly whether a browser-chrome height change (the iOS URL bar collapsing, which bumps the frame revision today) reflows the composition live or is deferred to the next stage, because a live reflow is a visible jump.

Keep the message shelf reserved while empty. Do not relocate it when entering a tunnel. Decorative soil can continue behind it; required hazards, route choices and landing surfaces cannot.


### Landscape

Retain the current landscape baseline:

- 480x270 fitted presentation.
- Ground anchor at 232/270.
- Status upper left; objective and bonus upper right.
- Existing rhythm and central speech channels.
- Ability name and power timers below ground.
- Current platform-specific hero framing.

Touch controls use the side arrangement, with drawn bounds plus a 12px gutter included in visibility checks. Use surrounding margins when available.

Retain existing desktop/tablet presentation routing. Full-height portrait gameplay remains phone scope for this implementation.

## 3. Fill the portrait scene deliberately

### Scenery composition rectangle

Define the outdoor scenery rectangle from below the primary HUD/rhythm group to the resting ground anchor.

Its height must drive placement, scenery dimensions and distribution. Replace portrait-specific pixel nudges such as fixed cloud/sun offsets with positions derived from this rectangle.

The background may extend behind HUD panels, but important scenery features must remain visible outside their bounds.

Use the following initial profile. Percentages below are relative to the scenery rectangle, not the whole screen:

| Element | Resting placement |
|---|---|
| Sun/moon centre | Upper 0–14%, respecting its full visible radius |
| Upper cloud group | Centres at 10–27%, overlapping the celestial band |
| Middle cloud group | Centres at 32–48% |
| Lower/distant cloud group | Centres at 50–62%, partly occluded where appropriate |
| Decorative birds | Flight envelopes within 25–50% |
| Far mountain/landmark crests | 24–44% |
| Middle hills/building tops | 48–68% |
| Near scenery crests | 60–82% |
| Scenery bases | Extend beneath the resting ground anchor |

These ranges intentionally overlap because the scene has depth. They are not horizontal strips that every object must fill.

### Distribution rules

- Use vertically staggered and horizontally offset placements. Avoid putting every cloud or landmark on one line.
- In cloud-bearing outdoor cabinets, distribute the visible cloud population across at least two height groups.
- Prefer repositioning existing scenery first, then adjusting its size, then adding instances if a substantial gap remains.
- Placement is deterministic. Nothing in the packs is seeded today: cloud positions are literal arrays, index formulas or authored panel data. Keep them authored and express them as normalized positions inside the scenery rectangle rather than introducing an RNG; add a seed only where a pack genuinely generates instances. Scenery must not reshuffle when the HUD changes, the camera pans or a message appears.
- Preserve wind and independent animation. Wrap cloud groups at their own heights, with staggered timing so they do not all leave the screen together.
- Keep object sizes readable but subordinate to the hero and hazards.
- Do not stretch discrete artwork vertically to occupy space.
- Procedural ridges may use viewport-dependent amplitude and spacing to occupy their assigned bands.
- Fill large gaps with appropriate scene structure: a higher distant ridge, an existing landmark, or another cloud group. Do not rely on additional gradient fill alone.

Use cabinet-appropriate content. Do not add clouds to an enclosed scene or generic birds to every cabinet. Each cabinet must supply its own composition profile.

For LCD/city scenes, preserve building-to-rooftop relationships and arrange existing skyline groups to use the available height. If the authored panel cannot expand convincingly, extend its existing visual vocabulary rather than stretching the complete panel.

### Protect the action

A populated scene must still make gameplay clear:

- Keep the strongest outlines, contrast and motion emphasis on the hero and hazards.
- Reduce background contrast around the immediate action corridor.
- Avoid sun/cloud faces, decorative birds or strong landmark edges directly behind the resting hero.
- Decorative birds must remain visually distinct from hostile birds.
- Background motion must not resemble an incoming hazard.
- Keep foreground terrain opaque where it should occlude scenery.

### Empty-space diagnostic

Add a preview overlay dividing the scenery rectangle into six horizontal bands and showing the visible bounds of major scenery features.

Flag a continuous, full-width interior gap exceeding 20% of the scenery rectangle height when it contains only the sky fill. Treat this as a review signal, not a runtime requirement to spawn objects.

Review both resting frames and timed sequences. A scene must not repeatedly become empty because all decorative objects have drifted offscreen.

Intentional negative space is allowed where it serves the cabinet composition, but Luna Max must identify it in the review artifacts. The default outcome is a balanced, visibly occupied portrait frame.

## 4. Natural camera movement and depth

### One camera displacement

The current background expression treats jump pan and route tracking differently: the call site in run.js builds one bodily translate from the interpolated pan at full rate plus the anchor re-pin at BG_FOLLOW (0.42), scaled by the pack's bgPan, and the painters never see the camera at all. Replace it with movement derived from the final rendered camera origin.

Today no painter receives zoom, frame, ground y or viewport height. Six of the nine packs take only (ctx, t, camX, cab, totalDist) and all read the module globals W, H, GROUND_Y and PAN_MAX. Giving every painter a resolved scene description is therefore a signature change across all nine packs plus those globals; budget Stage B for that, not for a handful of "applicable" painters.

Separate:

- Resting viewport composition.
- Camera displacement from that reference.
- Independent wind, day-cycle and scenery animation.

Equivalent camera positions must produce equivalent scenery positions regardless of whether the camera arrived there through a jump, hill or tunnel.

Use the interpolated render camera for both actors and scenery. Keep the scenery reference stable across route ownership changes.

### Vertical parallax defaults

| Layer | Share of foreground camera displacement |
|---|---:|
| Sky, sun, moon, stars | 0 |
| Distant clouds | 0.03 |
| Nearer clouds | 0.08 |
| Far mountains/landmarks | 0.12 |
| Middle hills/buildings | 0.25 |
| Near scenery | 0.42 |
| Terrain and gameplay actors | 1 |

When the camera rises, terrain moves down strongly and distant scenery moves down slightly. Celestial objects remain stationary.

These coefficients are initial tuning values. Give each layer ONE depth number from which both its horizontal and its vertical share derive, rather than a second vertical table beside the existing horizontal rates; two tables drift. Existing horizontal rates (0.05 stars, 0.09 volcano and butte, 0.12–0.15 far, 0.20 clouds, 0.22–0.35 mid and near, 0.40 castle) are the starting depths.

Preserve existing horizontal rates except where the attachment rule below demands a change, and list every such change. Remove the stale module-load zoom snapshots: PLX = ZOOM and VOLCANO_PLX in stylePacks/index.js freeze the parallax at import-time zoom while setRestingZoom rewrites ZOOM later.

Resting placement ranges must not clamp scenery during camera travel. Mountains may sink and clouds may move beyond their initial bands. Provide sufficient offscreen coverage to avoid exposed edges.

Remove sun compensation hacks once celestial painting no longer inherits the scenery transform. Only one exists, in the pixel/Plumber pack (the sun subtracts bgShift). The desert sun has no access to the shift and moves with the scenery today, and the Plumber cloud faces and flock are not compensated either; those are separations to add, not hacks to delete.

### Connected scenery

Keep attached objects in one transform group:

- Vegetation and its ridge.
- Buildings, windows, rooftop figures and machinery.
- Dust devils and their landscape plane.
- Landmarks and attached emission points.

Some of these are already mismatched today: dust devils run at 0.19/0.15 under a ridge at 0.22, the butte at 0.09 under far mesas at 0.12, and the saguaros re-derive their ridge by arithmetic instead of sharing its transform. Grouping them changes their horizontal rate; that is intended, and each such change goes in the landscape change list with a before/after capture.

Preserve cabinet-specific depth ordering. Clouds can cross in front of distant terrain where intended, but remain behind gameplay actors and terrain.

Intentionally flat display-style packs may keep a screen-fixed scenery plane. This is an explicit style policy; their portrait composition still must use the screen effectively.

Tunnel terrain should occlude the outdoor scene naturally. Entirely enclosed scenes omit celestial objects and fill the available scene with their own ceiling, walls and depth layers.

### Camera policy

Use one policy in both orientations, constrained by the resolved gameplay rectangle. Landscape today cranes to PAN_MAX first and then zooms out toward ZOOM_MIN (1.3) on tall jumps; portrait already holds zoom fixed. Constant zoom would remove the landscape zoom-out, which is a visible baseline change. Landscape keeps its crane-then-zoom framing unless Peter approves the change from a side-by-side capture; portrait uses constant zoom. The shared policy is the target definition, easing and reset rules below, not the zoom behaviour.

- Ordinary surface jumps remain camera-still while the hero is below the actual HUD edge; the decorative gap below the HUD is available sky, not an additional camera wall.
- Tunnel entry still establishes one lower-route composition and ordinary tunnel hops keep it parked, but a genuinely tall underground jump may apply a bounded body-edge correction so the hero remains fully visible.
- Keep zoom constant during running and jumps in portrait.
- Ease upward with exponential response k=12 and return with k=7 (these are the existing easePan constants; keep them).
- Optional, to be justified by a capture before it stays: predict upward motion 0.15 seconds ahead, hold ascent framing 0.12 seconds around the apex, and ignore small target changes during ascent so the pan cannot reverse. None of these exist today; drop any that a recording does not show earning its place.
- Apply a final bounds correction only when needed to keep the hero visible.
- During substantial falls, target the hero’s feet at 45% of gameplay height so the landing area is visible.
- Preserve the existing fall-follow speed guard and tunnel lookahead, adapted to resolved gameplay bounds.
- Reset transition state coherently after checkpoint restore, rewind, stage entry and orientation changes. Today checkpoint restore restores only camFloorY (pan and zoom are left as they were), rewind restores all four, and orientation has no reset at all.

Fit against the hero’s visible body with an 8px CSS clearance and the locally relevant route/hazard envelope. Floaties, particles and distant unused routes must not move the camera.

### Zoom and runway

Use current platform zoom settings as preferred starting values.

At stage entry and viewport changes:

- Calculate effective visible runway, including hero presentation offsets and control occlusion.
- Check warning time against the existing spawner’s reaction requirements.
- Include moving enemies and speed boosts.
- Reduce zoom only as necessary to satisfy visibility requirements.
- Keep the result fixed until the next stage or viewport change.

Use one effective camera rectangle for rendering, render culling and finish-tape placement only. Enemy activation, fire gates, wake margins and projectile lifetimes already read the live camera width (run.js around lines 6476, 6659, 7439–7547), so at portrait zoom the view is 128 world px against 218 on a landscape phone and 240 on desktop, and those gates fire at roughly half the distance. Move them to fixed world units so every tier plays the same game; the camera rectangle is then used only to assert that what must be visible is visible.

Report scenarios where required hero, hazard and landing information cannot fit. Do not hide the problem by altering physics, deleting hazards or accepting clipping.

## 5. Messages, implementation stages and acceptance

### Message and power rules

- Dialogue and tutorial speech use the fixed message shelf in portrait.
- Long checkpoint, reward and status messages use that shelf and queue.
- Tutorial/required instructions outrank status notifications, which outrank optional banter.
- Show one large message at a time; coalesce repeated score notifications.
- Brief impact words remain near the event but yield when they obscure action.
- Never move the camera to accommodate a floatie.
- Preserve hero-side cooldown and touch ability readiness feedback.
- Lower HUD retains the ability name and active power timers, including remaining-time information.

### Stage A: baseline and composition preview

Before broad migration:

- Record current geometry, hero size and runway.
- Capture fixed-seed baseline scenes, including one landscape frame per cabinet at 480x270 that Stage B is diffed against.
- Implement the shared layout/scenery resolver.
- Build portrait compositions for an outdoor mountain scene, desert scene, city scene and underground scene.
- Show short and tall portrait examples beside the landscape reference.
- Establish that the screen is well composed before tuning jump motion.

Use the shipped characters and painters. Save review comparisons under work/local/responsive-layout/; a composition Peter approves is committed to docs/shots/responsive-layout/ as the spec.

### Stage B: camera and scenery integration

- Introduce the shared rendered-camera description.
- Implement common movement and depth transforms.
- Migrate every applicable sky/scenery painter.
- Audit attachments, occlusion, cached backgrounds and style transitions.
- Include layout revision and relevant composition inputs in cache keys. The hill tile cache is keyed on amplitude and wavelength already; the sky gradient cache is built from 0 to GROUND_Y and filled from -PAN_MAX, so it must grow with the portrait sky.
- Preserve connected artwork when adapting scenery to portrait height.
- Gate every painter change on the per-cabinet landscape diff from Stage A. A landscape pixel change that is not on the explicit change list fails the stage.
- Measure frame time on the phone tier before and after. Per-layer vertical translates break the single background translate and can defeat the tile caches; set a budget from the before measurement and hold it.

Primary ownership lies in the existing frame/layout seam, camera integration in src/game/run.js, and scenery painters in src/engine/stylePacks/index.js.

### Stage C: review tooling

Extend the existing preview with:

- Before/after at identical dimensions.
- Fixed seeds and recorded inputs.
- Flat terrain, pits, islands, high routes and tunnels.
- Single, double and maximum supported jumps.
- Normal and mirrored travel.
- Layout and scenery-distribution overlays.
- Camera position, zoom, hero size, runway and fit diagnostics.

Supply still frames for composition and motion captures for camera assessment.

### Stage D: production activation

Prepare and verify the complete preview implementation before visual review.

Following approval:

- Activate the shared composition and camera system in production.
- Remove obsolete fixed portrait offsets and duplicate placement calculations.
- Update comments and tests that intentionally reference superseded geometry.
- Add a permanent element-placement guide covering coordinate spaces, composition ranges, depth, attachments and visibility requirements.

Do not deploy or publish as part of this task.

### Verification matrix

Test:

- Portrait phones: 375x812, 390x844, 414x896, 430x932. Ordinary jumps are camera-still on all four.
- Landscape phones: 812x375, 844x390, 896x414, 932x430.
- Desktop: 1280x720, 1920x1080 and ultrawide 2560x1080.
- Tablets: 768x1024 and 1024x768 using existing routing.
- Safe insets and browser-height changes.
- Rotation during a jump, message, tunnel transition and pause.

Automated tests must verify:

- Safe layout and control/message separation.
- Minimum text size and complete numeric counters.
- Celestial stability under camera translation.
- Correct depth fractions using final composed screen coordinates.
- Equivalent camera positions producing equivalent scenery positions.
- Attachment integrity.
- Stable ordinary jumps and smooth tall-jump transitions.
- Similar rendered camera motion at 30, 60 and 120Hz display rates. The sim tick is fixed at 60Hz, so this tests the render interpolation (prevCam mix), not the easing constants.
- Landing and hazard visibility.
- Effective bounds including presentation offsets.
- Correct restore/rotation state.
- Full background coverage throughout camera travel.

Run the relevant existing camera, portrait, tunnel, background, touch, lifecycle, route and spike-crossing suites, followed by:

    npm run build
    npm test
    git diff --check

Restart the development server after preview/build changes, respecting unrelated listeners, and verify the served preview.

### Completion criteria

The leading acceptance criterion is visual:

Portrait must feel composed across its full height, with appropriately distributed scenery and no large accidental empty sky regions.

Also require:

- Clear hero and incoming action.
- Recognisable cabinet identity.
- Stable interface placement.
- Natural depth during camera travel.
- Readable pits, route choices and landing surfaces.
- No scenery detachment, stretched artwork, abrupt camera corrections or exposed edges.
- Landscape remaining visually consistent with its baseline.

Luna Max’s handover must include before/after composition images, jump recordings, test results, unresolved fit cases and production activation status. Report physical-device touch and performance testing separately from browser and automated verification.
