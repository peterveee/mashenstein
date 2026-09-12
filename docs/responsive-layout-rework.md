# Luna Max rework: responsive layout and camera, first pass

Review of the uncommitted implementation of docs/responsive-layout-camera-plan.md, rendered on 2026-09-11 from the portrait preview at 390x844 (captures in work/local/responsive-layout/review-*.png). The plan is the spec and is unchanged by this document except where it says so; this document is the list of changes to make to the checkout before the pass can be committed.

`npm test`, `npm run build` and `git diff --check` pass on the current tree. Keep them passing; they are not the acceptance test for any item below. Each item names the check that closes it, and every check is a rendered capture or a tick-by-tick test, because the suites check band arithmetic, not what the packs draw.

The tree is shared with other workstreams. Do not stash, check out, or `git add -A`; Peter commits.

## Portrait layout amendment — 2026-09-11

The objective/scenery boundary now follows the requested two-state HUD rule:

- At level start, GOAL and BONUS are both expanded and stacked so the player can read both instructions.
- BONUS then collapses on its existing row and docks as a smaller chip beside GOAL. The scenery rectangle moves up only after that reflow, reclaiming the stacked row without a jump cut.
- Rhythm is an optional overlay in the upper scenery band. It is no longer reserved as a permanent HUD row.
- Celestial art begins at the top of the scenery rectangle, upper clouds overlap just below it, far landmarks and near scenery are raised, and the portrait ground anchor is now 73% of the usable safe height where the shelf permits.
- Touch controls retain their fixed hit sizes but use a 4px authored bottom gutter, leaving the extra lower height to the world and the tiny action-label strip. In portrait, a tap in the main playfield jumps; a downward swipe slides and a rightward swipe uses the hero power.
- Portrait chat cards use nearly the full safe width, keeping only a 4px CSS gutter on each side instead of the ordinary HUD margin.

The diagnostic overlay reports the live objective state (`bonus row`, `HUD group bottom` and `scenery top`) so expanded and compact captures can be compared directly.

## Stage 2 camera amendment — 2026-09-11

The high-path camera rule now distinguishes route entry from an airborne jump:

- A materially raised route is not allowed to claim the high-path composition
  merely because the hero overlaps it while jumping.
- The reframe begins only once the hero is grounded on that route, then the
  explicit eased transition parks the high-path composition through ordinary
  hops.
- If the hero is airborne after the route has already been claimed, the claim
  is retained until the route is actually left. This prevents the camera from
  bouncing between the low-ground and high-path compositions mid-route.
- The independent visible-body edge correction remains available when the hero
  would genuinely cross the HUD or action-shelf gameplay boundary.

The regression coverage includes an airborne high-route overlap, a grounded
high-path entry, the eased transition, and the return to the base lane.

## Required fixes, ordered by severity

1. **Layout diagnostic overlay, toggled by double-tapping the top HUD.** Build this first; every other item is judged through it. A double-tap (or double-click) anywhere on the top HUD group — the rail, status, goal and bonus rows — toggles an overlay drawn as the last pass, above the HUD, the touch chrome and the pause screen, so Peter can pause and read it. Wherever the portrait presentation runs (lab, preview and the flagged production path), in both orientations, and it is the empty-space diagnostic from section 3 of the plan as well: do not build that separately.

   Draw a horizontal line for every limit and range the resolver produces, each with a small label (10 CSS px minimum, on a dark plate so it reads over any cabinet): the name, the value in CSS px from the safe top, and the percentage of the rectangle it belongs to. At least: safe rectangle, top clearance, progress rail, status/goal/bonus rows, rhythm overlay row, HUD-group bottom, scenery top, every scenery band (celestial, upper/middle/lower cloud, birds, far landmark, middle, near) as a shaded range with its normalized span, resting ground, 73% line, gameplay top and bottom, message shelf top and bottom, control tops, high-path target feet line and the 48px rise threshold when a route is live, and the edge-pan bounds. Add the hero's visible body box with its 8px clearance, and a corner readout of frame size, scale, zoom, current pan, camera floor, high-path state and the largest full-width sky-only gap as a percentage (flag it red above 20%). Colour by coordinate space: world, scenery, sky, screen.

   The overlay is read-only and must not change layout, camera or timing when on, and the double-tap must not fire jump, slide or pause: it lands in the HUD region, above the thumb zones, and the HUD hit test consumes it. The toggle persists for the session. Check: with the overlay on, every line matches the resolver value to the pixel on a 390x844 capture, and pausing with it on leaves it readable.


2. **Double ridge shift in faux3d, vhs and cardboard.** Those packs translate the layer by `baseY - GROUND_Y` and then also pass `baseY` as the hill base, so the ridge moves twice. The pixel pack does only the latter and is the reference. The desert render shows the consequence: mesa crest behind GOAL/BONUS, sun hidden behind the HUD, vultures off frame. Fix: one mechanism per layer, the pixel pack's. Check: the desert crest, sun and vultures all sit inside their bands in a 390x844 capture.
3. **High-path and reflow transitions snap.** `smoothFrameReflow` in run.js is true for exactly one tick because `portraitFrameFitState` is rewritten every tick, so the pan eases for one frame and then jumps to the target (traced: 0 → 57 → 315 logical px). Fix: carry an explicit transition state (target, start value, active flag) that persists until the eased value reaches the target, then park. Check: a test that steps tick by tick after a sky-route entry and asserts every step is bounded by the k=12 response, not only the position after 120 ticks.
4. **Rhythm/LCD scene is not composed.** The city panel stays at landscape size and leaves a continuous empty band of about 57% of the scenery rectangle. Fix per section 3: extend the panel's own vocabulary (taller building groups, more rooftop rows, cloud rows in the upper bands) rather than stretching it. Also confirm the rhythm ribbon row is drawn in the reserved band. Check: the empty-space diagnostic flags no interior gap over 20% on rhythm-1 at 390x844.
5. **Unlisted landscape change.** `cameraShiftY` is now passed in every orientation and every `backgroundY()` call applies depth, so landscape jumps move far layers at their depth instead of with the crane. This may be the intended end state, but it changed nine cabinets with no baseline. Fix: capture the per-cabinet landscape baselines from HEAD first (Stage A), then either gate depth to portrait until the landscape change is approved, or present the before/after captures for approval and add the change to the landscape change list. Check: landscape captures diffed against HEAD per cabinet, with the differences enumerated.
6. **Scenery profile.** The requested amendment now intentionally replaces the old profile: celestial 0–14%, upper cloud 10–27% with overlap, far landmark 24–44% and near scenery 60–82%. Validate those ranges in the new plumber captures; they are the current implementation target because the overall goal is to fill portrait height without a dead sky block.
7. **Two-line speech cap and the compact shelf.** `speechChannel` sets `maxLines: 2` for every portrait shelf, so longer tutorial lines are truncated with no paging. Fix: three lines, and page text that still does not fit with the existing advance rule rather than truncating. Remove the compact 48px shelf branch and its `compact` flag from portrait-geometry.js, portrait-layout.js and hud.js entirely: the supported-phone floor (375x812, see the plan's Scope) never triggers it, and a branch nothing exercises is a place for the next regression to hide.
8. **Lab nudges still ship.** The old cloud/sun/scenery offsets are still sent in the production portrait context as a "fallback"; the packs zero them only when `sceneryLayout` is present. Remove them from the production path so the preview, gallery and production cannot diverge.
9. **Gameplay gap above the shelf** is 8 CSS px in portrait-geometry.js; section 2 says 12.
10. **Desert loop rings** stay at the authored groundline while their layer's base moves, so they detach in portrait. Move them with the layer's base like the other landmarks.
11. **Hero never enters the shelf.** A 320x568 render (now out of scope) showed the hero's feet inside the message shelf band under a raised road, which means the bounded edge correction does not treat the shelf as a hard floor. Even on supported phones the same correction runs, so make the shelf top part of the edge-pan bounds. Check: a tick-by-tick test on the flat and raised scenes at 375x812 that the hero's feet never cross the shelf top.

Not required for commit, but open: browser captures for all four scenes at three portrait sizes, physical-device touch and performance checks, and visual approval of both orientations.

## Handover

When the eleven items are closed, redo the captures for all four scenes (plumber, desert, city, underground) at 375x812, 390x844 and 430x932, plus the per-cabinet landscape diffs from item 5, with the overlay from item 1 on in every capture, and put them in work/local/responsive-layout/. Report unresolved fit cases separately. Physical-device touch and performance checks stay open until Peter runs them.
