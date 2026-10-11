# Office Scenery Handover

**Updated:** 11 Oct 2026  
**Status:** Placement rework done 11 Oct (late): three-depth model below. Rendered and checked
at every landmark crossing (`work/local/_office-pos.mjs`), not yet seen by Peter.

## Depth model (current)

- **Wall sections** — entrance, reception, coffee shop, canteen, exec lounge, library,
  assistant, CEO suite, and the rooms and lifts below. Each takes over one whole window run
  (snapped in `officePlaces`, progression.js), painted with the floor's own solid-wall bay so it
  is flush with the wall and scrolls exactly with it; the place sits in the middle of it. No
  window, sill, radiator, picture or clock is ever cut part-way.
- **Glass rooms** are frameless: no back wall of their own (the building's windows show
  through), a slim ceiling track, bright pane edges and butt joints, long diagonal sheens
  (`glassMeetingRoom`, rooms.js); their window runs are not cleared to wall.
- **Finish founder** — on the lobby and floor 23 the last planned piece hangs alone on the
  window run in view at the finish line, cleared to wall (`officeFinishWall`).
- **Rooms and lift bays** — meeting, training, HR review (replaced the records archive),
  boardroom and the lifts hang on the wall and scroll exactly with it. `standOut()` gives
  each a shallow return on the side facing the vanishing point and a contact shadow, so it
  looks a little proud of the wall. The lobby's waiting area stands on the furniture line.
- **Founder art** — the approved pieces only (ten originals, Art Deco, Gouache
  and the Warhol), each once in the building, evenly spread along its floor
  (`PROFESSOR_FLOORS`, professorArt.js; `assignFounder`, artwork.js), never behind a section.
  The rest are Lab-gallery candidates; Dusk is out, and no picture hangs beside the
  CEO suite's own founder portrait. Floor 23's walls also carry the office's motivational
  posters (TEAMWORK, SUCCESS, LEADERSHIP, two HANG IN THERE kittens), each once in turn on
  the bays with desks in front (`OFFICE_POSTERS`, `assignPosters`); founder pieces favour the
  bays beside the lifts. Lifts have a pot plant either side and a brushed-steel bin, and their doors stand open
  and close as the hero approaches.
- **Light** — sun and noon shafts, and floor 88's pendant glow, are painted behind the
  furniture and workers; only floor 88's lamp shades hang in front of everything (painted last in the backdrop pass, since the front pass is clipped below the lane).
- **Frame cost** — layers draw with `imageSmoothingQuality = 'low'`; 'high' cost ~20 ms a
  frame on the wall strip (office 35-39 → 15-17 ms, `node tools/frame-report.js office`).
- **Wall sections are baked** once per floor/width/phase at the strip's 4x detail and drawn as
  images (`wallSectionCanvas`), so they sample and move exactly like the wall strip.
- **Floor 88's wall** — wall and windows share one header (the cornice tube runs straight
  through), one rail on the window sill and one 60px-pitch wainscot (`execHeader`, wall.js).
- **Corridor furniture** is culled in its own absolute coordinates (`officeFurnitureCuts`):
  every whole piece that would be seen across a landmark while it crosses the middle of the
  view (`OFFICE_CLEAR_VIEW`) is never drawn; near the edges furniture may pass in front, so nothing moves behind a lift or room, nothing is sliced, nothing pops.
- Upper floors: every window and wall edge on the 60px panel grid — floor 23 glass 300 / wall
  180, floor 88 glass 360 / wall 120 (no columns); those stretches carry the founder posters and prints.

## What the user wants

The office should read as a believable hallway with simple, mostly flat architecture. Keep the floor treatment. On the upper levels, remove the prominent column rhythm so the windows read as broad groups separated by gaps. Keep the scenery present: workers, furniture and plants should not disappear just because a room or lift passes through the view.

Place the named areas with a clear depth order:

- The staff canteen belongs at the back of the hallway.
- Meeting rooms sit forward, with compact rooms and freestanding whiteboards separated from their walls. Use large, bold, high contrast text that is readable at gameplay scale. The board can carry its meeting title; there should not be a separate room title such as “Executive Alignment.”
- Keep desks and their workers well clear of all forward rooms and lift bays. Do not slice a desk, sofa, plant or worker in half at a set-piece boundary.
- Archive/records and the small lifts are forward. A lift needs only doors, call buttons and a floor number, with a wall bay from floor to ceiling behind it. Nothing should show through or draw behind that bay. Put a lift near the start and another near the middle of levels 2 and 3.
- Level 3 hanging lights should draw in front of the scenery.
- Keep the ground floor quiet: building names and artwork, reception, the coffee shop, lifts and seating areas. Avoid a corridor full of gag rooms, repeated air conditioners or other repeated novelty props.
- Reception is the immediate unresolved issue: make it part of the wall and flush with it. It must not be a foreground facade laid over the wall, artwork, clock, or other objects. Do not crowd or cover the painting and clock.
- The user asked to see the relative z order of all items. A clear z-order diagnostic/legend is still needed so future overlap reports can be tied to the painter passes.

## Current source state

The production painter is split across `src/engine/stylePacks/officeLigne/`. `officeLigne/index.js` paints the broad scenery passes in this order:

1. Exterior through the windows.
2. Wall and attached details, including production artwork, lift-door detail, clock hands and signage.
3. Ceiling, floor plane, reflections and slab.
4. Back-layer canteen landmark.
5. Other named rooms and lift bays.
6. Mid-level corridor props, workers and devices. Furniture cuts now apply only to cubicles and their workers; baked sofa/plant props draw whole.
7. Glints and other effects. The level 3 light pass is called again from `paintFront()` after the ordinary foreground props.

This makes the immediate reception defect understandable: landmarks are painted after the wall and its artwork. The reception branch first calls the generic `facade()`, then adds a large logo, plaque, counter, directory panels and plants. It therefore behaves as a wall-covering set piece even though its landmark depth defaults to the wall plane. The reception currently occupies a 340 px itinerary span, and founder-art placement avoids that entire span. The code must change both the draw treatment and the overly broad reservation; changing only its depth number will not satisfy the user's instruction.

Upper-room expansion also continues to draw the base floor's columns in `upperRoom()` (`officeLigne/index.js`, around line 87). That conflicts with the request for broad window groups with gaps instead of columns and remains unresolved.

The whiteboard helper in `officeLigne/rooms.js` now uses a 144 by 86 board and bold, high contrast sans text. Its actual readability, vertical placement and fit in the small meeting rooms have not been confirmed in a gameplay frame.

## Reception handoff: next implementation

Treat reception as a shallow wall fixture with a compact counter integrated into the wall plane. Keep the counter wholly inside its own clear wall bay. Preserve nearby wall-mounted items by positioning the fixture in an empty span or by reserving only the exact fixture footprint; never paint an opaque reception panel over artwork or the clock. Remove the full-height ceremonial pilasters and broad facade behavior from reception. Simplify the extra directory/plant/signage clutter to match the quieter lobby direction.

Review the wall artwork and clock layout as part of this change. The existing artwork painter runs with the wall pass before the landmarks, and the founder plan currently avoids every named landmark span with an added 30 px margin. Make those exclusions reflect the compact fixture rather than a 340 px reception zone. Do not solve overlap by hiding the painting or clock.

## Relevant code

- `src/engine/stylePacks/officeLigne/index.js` — painter order, upper-room extension, cubicle-only clipping, final foreground light pass.
- `src/engine/stylePacks/officeLigne/progression.js` — room itinerary, landmark depths, furniture clearance, facade and reception drawing.
- `src/engine/stylePacks/officeLigne/artwork.js` — wall-art placement and founder-art avoidance around landmarks.
- `src/engine/stylePacks/officeLigne/room.js` — corridor furniture, including the mid-layer reception desk painter.
- `src/engine/stylePacks/officeClimb.js` — original floor bays, columns, wall hangings and base scenery.
- `docs/OFFICE_LIGNE89_PLAN.md` — the broader implementation plan and original camera/scene constraints.

## Working-tree and review notes

This repository already has a large dirty working tree, including unrelated game, docs, gallery and test changes. Preserve it; do not reset, clean, or revert files as part of the handoff. The office source files and recent layer/clipping changes are uncommitted/untracked within that broader work.

No tests or build were run for this handover. More importantly, the latest painter changes were not checked in an actual rendered gameplay frame, so the source order above is not proof that the scenery now looks correct. When continuing, render the production office view at the reception crossing and at a forward lift/meeting-room crossing. Inspect those frames for wall-art visibility, full props/workers, desk clearance, lift occlusion and board readability before calling the visual work done. Also check the upper-level window groups after removing columns. Do not claim visual acceptance from source inspection alone.
