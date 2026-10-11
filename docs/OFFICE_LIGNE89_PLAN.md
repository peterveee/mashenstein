# Corporate Kombat → LIGNE ’89: implementation plan

Status, 11 Oct 2026: **implemented in the working tree; physical-device acceptance pending.** Peter's pick from the office backdrop
bake-off: "i think the new ligne 89 is the way to go". The card is `LIGNE ’89 — lit`
(`src/dev/office-styles/ligne89lit.js`). Background on how the pick was made is in
`docs/BACKDROP_STYLES.md` under "The second bake-off".

The goal is to make Corporate Kombat ship as THE CLIMB in the lit Ligne ’89 hand:
- **8-1** is the lobby (G) in the morning.
- **8-2** is floor 23 at noon.
- **8-3** is floor 88 at dusk.

The game's lane, hazards, patterns, missions and music stay exactly as they are. Only the
world behind the lane changes, plus the slab under it.

## Starting point (before implementation)

- **The shipped look.** `office` names `style: 'doodle'` in `src/data/cabinets.js`. `doodlePack`
  (`src/engine/stylePacks/index.js`) is graph paper held still (`bgPan: 0`, `lightBg: true`),
  `drawOfficeScenery`, a biro ground line, and a biro underline drawn under each hazard through
  `decorate`.
- **The candidate.** `ligne89lit.js` (~3,700 lines) exports `STYLE.paint(ctx, frame)` and
  `paintFront(ctx, frame)`. Both read an `officeFrame(floor, camX, t)` from
  `src/dev/office-styles/plan.js`. The candidate:
  - bakes its static layers into 512 px tiles (~15–30 ms first frame);
  - costs about 2 ms a frame at 2x, flushed;
  - is landscape only;
  - draws at the resting zoom only;
  - assumes the crane never moves;
  - has no pits.
- **The plan.** `plan.js` holds the content: three floors, layer factors, item positions,
  skylines and animation clocks. It lives in `src/dev/`, which nothing in the run imports.

## Implementation defaults (authorised 11 Oct 2026)

1. **Which stage is which floor.** The proposal is stage 1 = lobby, 2 = floor 23, 3 = floor 88,
   picked by `backgroundContext.stageIndex`. Overtime and the endless modes would stay on the
   stage's own floor.
2. **The time of day.** The proposal is to keep morning, noon and dusk as baked off. The
   "climb later" idea (late afternoon, dusk, night) is a later option, not part of this job.
3. **The front pass.** That's the pillar sweeping past in front, and the plants and chair backs
   rising from the bottom edge. Ship plants and chair backs after readability checks. Pillars are off initially; a later
   change must protect the whole reaction window, coins and pit edges (see phase 6).
4. **The hazards' biro underline.** It goes, because it belongs to paper. The new pack has no
   `decorate`.
5. **The Surge.** The proposal is that `SURGE_CYCLE` swaps `doodle` for the new pack, so the
   Surge flashes the new office. Peter could instead keep doodle as a Surge-only memory.
6. **Doodle stays registered** (house rule: replaced packs are kept). It is used by the lab and
   possibly by an unlockable later.

## First gate: camera, clock and floor contract

Before adapting the detailed painter, prove a simple room/floor/slab join under the actual
background and world transforms: landscape, portrait, phone resting zoom, full crane and
pull-back. `bgPan: 1` does not weld the room to the lane: the shared background follows
anchor movement at `BG_FOLLOW = 0.42`, while the world moves by the full camera transform.
Portrait additionally magnifies the backdrop independently. The office adapter must explicitly
reconcile these transforms without changing camera physics or other packs.

Resolve the stage floor when constructing the pack, before scene glow reads `lightBg`, and
pass the Surge stage to its child packs too. `lightBg` is a style-pack property. The adapter
uses one scenery clock and one frame contract for background and foreground; do not retain
the run or live analyser objects.

## Phase 1: promote the code out of `src/dev/` (no visible change)

1. **Move the plan.** `src/dev/office-styles/plan.js` becomes `src/engine/stylePacks/officeClimb.js`:
   the composition, `OFFICE_FLOORS`, `OFFICE_KINDS` and `officeFrame()`.
   - It keeps the content byte for byte. The lab's `plan.js` becomes a one-line re-export shim, so
     every bake-off card keeps working (the Speed MCM precedent).
   - The bake-off's tuning goes in with it: the lowered skylines, the exec sun at x 150 and the
     heli at u 140.
2. **Move the painter.** `src/dev/office-styles/ligne89lit.js` becomes
   `src/engine/stylePacks/officeLigne.js`, with a re-export shim left behind in the same way. Split
   it as it moves, so no file is a 3,700-line wall:
   - `officeLigne/line.js`: the shared line kit. That's the stroke helpers, the hand-built
     single-stroke font, the palette and the flat-light helpers (halo rings, wedges, pools,
     reflections).
   - `officeLigne/outside.js`: the sky, the skylines, the street, traffic, flyers, city lights and
     the banded sun.
   - `officeLigne/wall.js`: the bays, glass, columns, lifts, signs, posters, the portrait and the
     cradle.
   - `officeLigne/room.js`: the ceiling, lights, floor plane, slab and mid furniture.
   - `officeLigne/front.js`: the front pass.
   - `officeLigne/index.js`: the bake cache, the tiles, and `paint` / `paintFront`.
3. **Check nothing moved.** A pixel-identical render of all three floors at t 0/4/8, before and
   after, using `tools/office-style-shot.js`. Include camera positions near wrap seams as well as
   t 0/4/8. Do this before any behaviour changes.

## Phase 2: the pack (`officePack` in `stylePacks/index.js`)

Register it under a new name, `office`. A style pack names its hand, and the cabinet will be
the only user. Wire it like `mcmPack` and `gouachePack`:

| Pack hook | What it does |
|---|---|
| `bg(ctx, t, camX, cab, totalDist, scene, bgShift, bc)` | Builds `officeFrame(floorFor(bc), camX, t)` and calls `paint`, minus the slab and the hero lane. Coverage comes from `backgroundPaintCoverage(ctx)`, so portrait's wider view is filled. |
| `ground(ctx, camX, cab, obstacles, overhangs, t, viewW, portraitViewW)` | The slab under the lane, in world space (see phase 4), with pits cut out. |
| `post(ctx, t)` | `paintFront`, using the same resolved camera, floor and scenery clock as `bg()`. Plants/chairs are scene objects, so explicitly restore the room transform; they are not frame chrome. |
| `decorate` | None. |
| `bgPan` | **1** (the default), not doodle's 0. The room is a real place, so the crane has to move it (phase 5). |
| `lightBg` | Per floor: true for the lobby and floor 23, false for floor 88 (deep violet). `lightBg` is read as a plain property (`draw.js` backdrop veil, `run.js` `setSceneGlow`), initialise the pack with the floor before either call site. A getter must not depend on the last `bg()` call. Surge children need the stage at construction too. |
| `dark` | False, except on floor 88. Check what `dark` drives before setting it. |
| `heroLight()` | Optional. A faint pink cast on the hero at dusk under the lamp pools, as MCM's `laneTint` does. Not needed to ship. |

Then:
- **Cabinet.** Change `office` to `style: 'office'` in `src/data/cabinets.js`, and the legacy
  `sky` / `ground` / `far` / `hills` colours to the lit palette (menus and the hub's cabinet art
  read them). Check what else reads `cab.ground` for this cabinet.
- **The Surge.** Swap `SURGE_CYCLE` from `'doodle'` to `'office'` (decision 5).
  `tests/surge-cycle.js` fails until that's done. Under the Surge, `floorFor()` uses the Surge's
  own stage index.

## Phase 3: one moving clock

The card ran on gallery time `t`. In the run:
- **Clocks follow the existing background clock.** Lift doors, heads, the cooler, the copier, the flicker, clocks,
  the cradle, nods, the pendulum, traffic, the flyer, the sign's buzz and the city's windows all
  take `backgroundT`. The run currently passes this to `bg()`, but passes gameplay time to
  `ground()` and `post()`: the office must explicitly share the scenery clock across passes.
  It continues during opening and finish, and freezes on pause. Animation never uses
  `performance.now()` (measurement may).
- **Pausing freezes everything,** because the pack's `t` stops.
- **The neon buzz can go on the beat** later if wanted, via `Audio.songBeat()` the way crypt's
  music beat is read. It is not needed to ship.

## Phase 4: the slab under the lane, pits and the ground line

- **Level office floor.** Corporate Kombat has no rolling terrain profile. The room,
  slab, collision floor and grounded props share the same straight ground line.
- The card painted the slab in screen space under y 232. In the run it moves into `ground()`, in
  world units, inside `applyWorld`:
  - its stripes, nosing and panels repeat in world px;
  - nothing in it is rounded, because the backbuffer is scaled about 2x (the LCD lesson).
- **Pits.** Corporate Kombat has none in its pattern bank today, but stage layouts can carry
  them. Check with `node tests/lib/capture-ledger.js office-1 101` (and seeds 202/303/404, stages
  2 and 3). Either way, `ground()` uses `drawGapsAwareGround` / `solidRuns` like the other packs,
  so a pit is a hole in the slab and the floor plane, with a dark shaft. The doodle's annotated
  rectangle goes.
- **Overhangs and ceiling props** come through `ground()` as in the other packs. Check what
  `overhangs` the office deals.

## Phase 5: camera (zoom, crane, portrait)

This is the biggest piece. The card assumed one camera.

- **Resting zoom and phone zoom.** Everything in the frame is in screen px of a 480x270 frame at
  `ZOOM` 2. On the phone (`ZOOM_PHONE` 2.2) and under the render-scale ladder, check that:
  - the wall and the lane still meet at y 232;
  - the bake re-keys on device scale. Like crypt, it bakes once at a fixed scale with the crane
    at rest; it does not chase every zoom step.
- **Crane.** The camera cranes up for tall jumps, and `bgShift` arrives as `pan * bgPan +
  climb * BG_FOLLOW`.
  - The interior has to move with the actual lane camera as one room: the ceiling, wall, floor plane and slab
    translate together, and the outside view parallaxes less (it's far away).
  - Proposal: everything in the room takes the full shift, and the outside takes a fraction
    (about 0.3). The craned frame shows more ceiling at the top, so author ~60 px of extra
    ceiling above y 0 (more tiles, light fittings and ducts) so it never runs out.
- **Portrait.** `bc.sceneryLayout` is set and the frame is about 3.4x taller relative to the
  lane.
  - A room can't stretch the way terrain bands do. The approach: keep the wall's foot, floor
    plane and slab locked to the lane exactly as in landscape, and grow the room upward. The
    windows get taller (more storeys of the city), and the ceiling sits higher, with a bulkhead
    and lighting track filling the top.
  - The HUD bands from `resolveSceneryLayout` say where the ceiling must stay calm.
  - Floor 88's horizon and city carpet anchor to the glass bottom, not to a band.
  - Derive the numbers from the landscape frame (memory: portrait scenery bands), and check on
    the rotated phone, not letterboxed: `tools/portrait-preview-entry.js`, then the real phone.
- **Coverage.** `backgroundPaintCoverage(ctx)` can be wider than 480 (portrait offsets, wide
  phones). Every strip already tiles, so painting `cov.left..cov.right` is enough. The frame's
  `instances()` margin (140) needs to follow `cov`.

## Phase 6: legibility and the front pass in real runs

- **Check every hazard Corporate Kombat deals**, not just the card's: the chair, printer,
  paperwork, fire barrel, boom barrier, banana peel, the dog snarler, the fury cat, the base
  patterns (cactus/crate/drone/buzzbird/barrel) and the coins. Check them against all three
  floors and at every point in each floor's wall period (1440 px of wall = 3,000 world px), using
  the screens gallery and a run recording. The card only met six hazards.
- **The front pillar.** Gate it so it never crosses the hero while a hazard is inside the reaction
  window. The run knows the next obstacle's x, so the pack can ask through `backgroundContext`
  (the crypt-gate `gateMaySlam` pattern), or simply skip a pillar whose sweep would overlap one.
  If that's fiddly, ship plants and chair backs only (they stay under y 240) and leave pillars
  off.
- **Hazard skins.** The printer (pale grey) on floor 23's pale floor, and the dog (near-black)
  on floor 88's lacquer, were the two closest calls in the bake-off. Confirm them in-game at
  phone size (iPhone rung, 1.4x).
- **The HUD.** The status pill and objective panels have veil logic for light and dark packs
  (`hud.js` ~3410). Check pill contrast on each floor: lobby light, 88 dark.

## Phase 7: performance and warming

- **Warm it before the song starts.** Add `officeWarmJobs()` to `src/game/art-warmup.js`, as
  crypt and speed do. Bake the current floor during the briefing, so the first frame never pays a
  bake after the song starts. The Surge's warm list gets it too if decision 5 holds.
- **Budget.** Bake one floor at a time and release obsolete floor/scale/layout variants. Retain the
  current floor while Surge switches away and back; never evict it on every cut. Warm-up and
  painting must agree on cache keys, so
  resident texture stays under the ~50 MB thrash line. Fine wall outlines now bake at
  4x to reduce shimmer during fractional scrolling; the other scenery stays at 2x.
  Measured resident caches are about 32–38 MiB per floor, bounded below 40 MiB.
- **Measure in the real game**, not the shot tool, which undercounts:
  - wrap `__mash_cur.style.bg` and `post` with `performance.now`;
  - compare against Plumber and `mcm`, on M3 and on the iPhone in both orientations;
  - aspirational target: no worse than `mcm` (0.5–0.6 ms CPU a frame on M3), measured with
    the same instrumentation. Also record frame-time spikes and resident canvas bytes; the
    shot-tool timing is not directly comparable to this figure;
  - run `work/local/_start-check.mjs` on office-1/2/3 to check the song start gap.
- **Per-frame live layers.** The live layers (neon halos, the buzzing sign, lamp pools, city
  windows, glints) stay cheap, flat fills only. No `shadowBlur` and no filters, especially in
  portrait, which costs about 3x.

## Phase 8: everything else that shows a backdrop

- **The gallery.** Add a production section "CORPORATE KOMBAT — the climb, as shipped" before
  `beginLab()`, covering the three floors and portrait. Mark the lab bake-off sections settled
  (the date and the pick in the note); keep them, don't delete them.
- **The screens gallery and reels.** Re-render them (`tools/build-screens-gallery.js` and the
  feature and scenery reels) and any promo render that shows office.
- **Tests:**
  - `surge-cycle` (phase 2);
  - any test pinning `doodle` for office: grep `tests/` for `doodle` and `'office'`;
  - `portrait-layout` and `portrait-framing`;
  - `record-background` (the plate run-in);
  - `background-wrap`, which the new strips should be added to;
  - `region-style-effects`.
- **New tests:**
  - `tests/office-climb.js`: `officeFrame` is deterministic; each floor's strips wrap
    seamlessly at their periods; stage index maps to floor; the slab and floor plane meet the
    lane at `GROUND_Y` in landscape and portrait.
  - The plan's sizes match `OFFICE_KINDS`.
- **Docs:**
  - `docs/BACKDROP_STYLES.md`: add the decision and move office in the "Which style where"
    table.
  - `docs/LEVEL_SCENERY.md`: a Corporate Kombat section listing every animated item per floor
    and how often (lifts, heads, cradle, blimp, heli, cars, sign buzz, city windows, the front
    pass), each with the constant that controls it.
  - `docs/GAME_BIBLE.md`: the style table (`doodle` → office / clear line) and the cabinet's
    one-line look.
  - `docs/SCRIPT.md`: optionally, briefings that mention floors ("FLOOR 23. THE PRINTERS ARE
    UNIONISED.").

## Phase 9: verify, then hand to Peter

1. Run the full suite (`npm test`). Preserve any failing routes seed and establish whether
   the failure exists before this change. A passing rerun does not explain a failure.
2. Play office-1/2/3 in landscape and portrait on desktop and on the iPhone (Home Screen
   install). Record a dev-menu gameplay video of each floor into `work/video/`, and step through
   the Surge.
3. Regenerate and archive the gallery.
4. Leave it in the tree; Peter commits.

## Size and order

The camera contract is the first gate. Source promotion can then preserve the candidate
exactly; production adaptation follows with pillars off. Suggested order:

1. Prove landscape/portrait/crane joins with a simple room.
2. Promote and split the painter, with identical bake-off captures.
3. Integrate the minimal production pack and verify actual run frames.
4. Settle cache keys, warm-up and measured performance.
5. Complete readability checks, gallery coverage, tests and documentation.

Phone/device and subjective visual acceptance remain separate from source/build checks.

Things this plan does **not** change: patterns, hazards, missions, the boss/cutscenes, music,
the briefings' wording (unless Peter asks), and the doodle pack itself.

## Follow-ups worth keeping in view

- **"Climb later":** late afternoon, then dusk, then night, so two floors carry neon. A
  one-table change in `officeClimb.js` once the time of day is a parameter.
- **Office-specific scenery gags** now the room exists: the copter seen through the glass on 88
  before the finale, a meeting-room door slamming (crypt-gate style), Gary's pawn shop sign
  across the street.
- **Hazard art** to match the clear line, if the slate chair and pale printer look like visitors
  from another game once the room is drawn. Ask before restyling lane art.

## Implementation record, 11 Oct 2026

- Floor-contact correction: removed the independent quarter-speed scenery experiment.
  Furniture and landmark motion now matches the floor projection exactly at their
  feet; wall movement matches the back edge. Wider boardroom and CEO scenes
  provide additional viewing time through layout.

- Set pieces stand further back than the furniture (11 Oct, Peter: "the comic set pieces should be
  further back so they stay on screen longer", then "make them slower", then "the furniture and
  office workers can be mid level and move faster, it's the set pieces with gags that need to be
  slower"): the named rooms (mailroom, canteen, boardroom...) have their feet on the wall's foot
  line, y 204. The latest depth adjustment moves the whole backdrop farther back:
  walls and rooms use factor 0.16, furniture and workers stand at y 208 with factor 0.28.
  The horizon, floor and ceiling perspective now derive from the wall factor; floor
  contact stays exact while the scenery scrolls about a third slower. City and foreground
  layers also move more slowly. Cached strips and wall art share continuous coordinates
  with filtered sampling. A nearer, faster group would sail across a room's face, so a whole group is left
  out when its place in the world is where it could cross a room that is on screen
  (`officeFurnitureCuts`); it is fixed in the world, so groups neither slice nor pop. The lift is
  applied when the rooms are painted, so the lab cards are untouched.
- More of the founder on the walls (11 Oct, Peter: "more artwork of the professor, different styles/poses"):
  ten retained framed pieces in `officeLigne/professorArt.js`, each its own style and pose: comic panel
  (shouting, fist up), engraved stamp (profile), 80s one-sheet (hands on hips), recruitment poster
  (pointing), blueprint (the thinker), constructivist (profile, arm raised), banknote engraving,
  8-bit sprite, gilt oil portrait (hand in his cape) and a dusk silhouette. The childlike crayon
  portrait has since been removed; the Warhol four-panel face print replaces it in the lobby and
  floor 23 rotations. About two pictures in five on a wall are one of them, picked per floor
  (`PROFESSOR_BY_FLOOR`), never the same one twice running. They are baked once per floor and
  blitted (`artwork.js`), warmed with the floor. `professorBody`/`professorHead` in `wall.js` are
  the old `professor()` split in two, with mouth/look/skinFx options, so a piece can pose him.
  Review sheet: `node work/local/_prof-sheet.mjs [ids] --scale 6` (a one-off, not tracked).
- Variety/readability follow-up: expanded to six lobby rooms and five rooms on
  each upper floor, including meeting rooms, HR, training, mail, a central floor-23
  canteen with eating workers, and an executive lounge. Room/furniture scenery
  now moves at one quarter of its former speed, with slower wall parallax behind
  it. All landmarks remain unique and the final destinations remain at 94%.
  Actual game motion captures cover the canteen, boardroom and CEO entrance.
- Follow-up progression correction: production's repeatable corridor definitions omit
  receptions, CEO doors, founder portraits, trophies and boardrooms. Each floor has
  three finite, distance-anchored landmarks and one elaborate destination at 94%:
  grand reception, operations lift lobby, executive suite. Whole furniture groups
  make room for them. The gallery's production tour now covers the whole floor;
  historical comparison cards retain the old composition. Review captures are in
  `work/mockups/office-ligne89/progression/`; reproduce with
  `node tools/office-landmark-review.js`.
- Promoted the composition and split painter; the selected bake-off remains byte-identical
  in the nine landscape t 0/4/8 captures after the initial adaptation. The subsequent
  worker correction below intentionally changes the shared painter's peek poses.
- Follow-up visual correction: removed Corporate Kombat's inherited rolling terrain
  profile so its office floor and physics stay level. Extended peeking workers' shirts
  behind the cubicle fronts, preventing disconnected torsos at the animation's apex.
  Rebuilt game/gallery and recaptured all three floors in landscape and portrait.
- Registered `office`, selected it for Corporate Kombat and Surge, removed the biro
  underline, and kept doodle and all lab candidates.
- Added a lane-aligned room transform, taller portrait architecture, one shared scenery
  clock, world-space slab, pit cutouts and a dark shaft. Pillars are off; foreground plants
  and chairs remain below the lane and clear pits.
- Warmed the selected floor during briefing/run-in. Production uses fixed 2× raster detail
  and retains one floor (about 15.3–20.1 MiB); the multi-floor production gallery explicitly
  retains its three review floors, with no per-frame rebaking.
- The twelve office stage/seed ledgers (101/202/303/404) match before/after exactly.
- Real-run landscape, portrait, crane, pit and hazard/coin captures are in
  `work/mockups/office-ligne89/`; gameplay review videos are in `work/video/office-ligne89/`.
  `tools/office-run-review.js` and `tools/office-readability-review.js` reproduce the captures.
- Added the production gallery section and preserved/marked the lab sections settled.
  The uncommitted gallery pair is archived with the review artifacts; the commit-named
  historical archive should be generated after Peter commits, so it does not mislabel or
  overwrite an older committed snapshot.
- Physical iPhone/Home Screen play, rotation and listening acceptance are still Peter's
  final check. No hazard art, briefing copy, missions or musical arrangements were changed.

### Verification outcome

Build, focused office/Surge/wrap/portrait/warm-up/recording checks and the nine original
card comparisons passed. All twelve office spawn ledgers are unchanged. Real-run
landscape/portrait/crane/pit and hazard/coin captures have no browser errors.
The matched desktop Chromium backdrop comparison measured office at 0.36–0.40 ms mean
versus MCM at 0.63–0.66 ms (84–91 frames each); this is CPU timing, not physical iPhone QA.

`npm test` completed with two failing suites: Desk's process-inspection permission
error passed when rerun outside the sandbox; rewind-pooling remains seed-dependent.
The audit substituted the original HEAD versions of only the office-touched source files
inside esbuild, preserving unrelated dirty work. Seed 675984743 fails the same auto-rewind
camera assertion with both original and current source (3550.218 → 4329.871), and seed
675974487 fails the same spent-charge assertion in both. The original full-suite manual
rewind failure did not log its Date-derived seed; do not call the entire suite green.
The normal runner also skips its 56 designated browser suites.

The screens gallery rebuilt: office and Surge captures succeeded in both orientations;
the two Sound Test captures timed out. The cabinet promo reel was regenerated in
`work/video/office-ligne89/cabinet-reel.mp4`; feature/scenery reels contain no office shots.
