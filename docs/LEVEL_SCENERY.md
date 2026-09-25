# Level scenery: what moves, where, how often

A living list of every **animated item** in the levels of the first six cabinets:
background scenery, obstacles and flyers, with the levels each one appears on and how
often. Update it whenever scenery or a pattern bank changes, and mark new items with the
date.

Items added on 24 Sep 2026 are marked **new**. A static item appears only when it is new
or specific to its cabinet, and it is marked *static*.

**Units.** A "screen" is 300 world px, the desktop frame (`W` 480 ÷ `ZOOM_NORMAL` 1.6).
At zoom 2 (tablet or zoom-in) a screen is 240 px. Background layers scroll at
`factor × ZOOM` of the camera, so anything placed by parallax tile lands at slightly
different stage fractions on different zooms. Items driven by `camX` sit at the same world
positions on every stage of a cabinet, because `camX` restarts at 0 each run.

**Obstacle counts** are averages over seeds 101/202/303/404 of
`node tests/lib/capture-ledger.js <stage> <seed>`, written as `L1 / L2 / L3`. A drone
column counts each drone. Rhythm lays its obstacles off the beat charts, which the
headless ledger cannot run, so its counts come from the charts themselves.

| Cabinet | Stage length | Screens |
| --- | --- | --- |
| PLUMBER PANIC | 60 s — 9072 / 9576 / 10080 px | ≈30–34 |
| SPEED ZONE | 60 s — 11340 px | ≈38 |
| RHYTHM BANKRUPTCY | 90 s — 18720 px | ≈62 |
| FROST FORTRESS | 90 s — 18144 px | ≈60 |
| CRYPT SHIFT | 90 s — 18900 px | ≈63 |
| TERMINAL VELOCITY | 90 s — 19656 px | ≈65 |

---

## PLUMBER PANIC (plumber-1..3) — pack `pixel`

### Background

| Item | Kind | Levels | How often | Code |
| --- | --- | --- | --- | --- |
| Sun: rays turn, disc breathes, creeps right to left | background | all | Always. Enters from the right about 6 s in and wraps every ~197 s, so it never reaches mid-sky within a stage | `drawStaticSun` (index.js) |
| Cloud flock (8 faceless clouds) drifting left | background | all | Always on screen. Wind 4 px/s plus 0.2 parallax | `paintClouds` in `pixelPack.bg` |
| Cloud pal: face that bobs, looks about, blinks, giggles or dozes; laughs or gasps when the hero is hit | background | all | Crosses left to right at 13 px/s. On screen about 44 s in every 51.5 s cycle | `drawCloudPal`, `sunShock` |
| Volcano with smoke puffs (7.7 s cycle); a lava glint when paper is off | background | all | One volcano per stage, pinned at **0.5 of the stage**. Visible over roughly 30–70% (parallax 0.09) | `drawVolcano`, `drawVolcanoSmoke`, `VOLCANO_PLX` |
| **new** Barn and silo: rooster vane swings, hoist rope swings, 3 hens peck | background | plumber-1 | Once, near the start. `PLUMBER_BARN_AT_PX` = 700 world px (on the nearest near summit), so on screen ≈3–12% of the stage | `drawPlumberLife` → `drawPlumberBarn` (plumberLandmarks.js) |
| **new** Patchwork fields: tractor ploughs a field every 12 s with 3 gulls behind it; cloud shadows slide | background | plumber-1 | **Land that ramps up** — nothing animates: a slope in the country itself, anchored in each band's parallax plane. Its toe enters at the right edge at `PLUMBER_FIELDS_AT` = 0.7 of the stage and full relief is `PLUMBER_FIELDS_RAMP` = 320 screen px behind it (`opts.heightAt`); the fields become visible as the run travels onto the higher ground, then stay to the finish | `drawPlumberPatchwork`, `ploughAndGulls` |
| **new** Hot-air balloons ×2: burner fires every 3.4 s, passenger waves, balloon sways | background | plumber-2 | Two single crossings, centred at `PLUMBER_BALLOONS_AT` = 0.22 and 0.66 (parallax `PLUMBER_BALLOON_FACTOR` 0.1). Each is on screen ≈18 s; never both at once | `drawPlumberBalloon` |
| **new** Windmill: sails turn (7.4 s per revolution) and billow, pennant flies | background | plumber-3 | Once, on the near summit nearest `PLUMBER_MILL_AT` = 0.35 of the stage (≈32–40% on screen) | `drawPlumberWindmill` |
| **new** Sheep (9, including 2 lambs) and a working collie that runs out and back and crouches (still the cut-paper collie, to match the sheep; the kennel's clean-line collie was tried 24 Sep and reverted); sheep turn to watch it and scurry | background | all | About one near summit in seventeen: every 10th summit tile, 60% of them filled by hash, never within 2 tiles of the barn or mill. That is ≈2 flocks a stage, at the same world positions on every plumber stage | `drawPlumberLife` → `drawPlumberSheep` |
| **new** Near-ridge bushes, three kinds mixed: hedgerow clump and gorse (*static*, baked), and a hedge with a robin — every 8 s the robin pops out on top, looks about, hops twice and ducks back in; the front leaves shiver as it goes through and four loose leaves flutter in the gusts | background | all | One bush in every 'bush' cell (10% of placement cells) and every 'fence' cell (5%), cells `PLUMBER_SCENERY_SPACING` = 122 screen px apart at parallax 0.35 — ≈6–8 a stage at zoom 2, at the same positions on every stage. The kind is `plumberBushTypeForCell`: bushes are counted within each 48-cell house band and take hedgerow / gorse / robin in rotation from a hashed start (forwards or backwards per band), so it is a third each and neighbours differ except, 1 time in 3, across a band edge. Each robin runs on its own clock (seed from its cell) | `plumberSceneryPlacements` (`prop.bush`), `drawPlumberBush` (index.js); art in `plumberBushes.js` (`paintPlumberBushLayer`, `drawPlumberRobinHedge`) |
| **new** Cottage on the near ridge, four kinds: rose cottage (smoke, a cabbage white at the roses), pink cottage (gate swings, Labrador wags, 2 hens peck, sunflowers nod, smoke), stone farmhouse (washing flaps, a lamp goes room to room upstairs, smoke), shepherd's hut (lamplight flickers, stovepipe smoke, a lamb grazes). Each brings its own garden; the old separate bush and fence are gone | background | all | One house cell per 48 (`PLUMBER_SCENERY_HOUSE_BLOCK`), at cell 28 and cell 70. A house never stands in a sheep flock: `plumberHouseCellForBand` steps a band's hashed cell right until no possible flock summit (`plumberFlockTile`) is within `PLUMBER_HOUSE_FLOCK_CLEAR` = 110 near-plane px, which moved band 1's house off cell 69 (18 px from a flock) to cell 70 (140 px clear; cell 28 is 274 px clear). Barn (≤1180 px) and mill (2280–4630 px) stay well away from both at zoom 1.6 / 2 / 3.5; the balloons fly in the cloud band. Landscape (zoom 1.6–2) only reaches cell 28, mid-picture at ≈50% of the stage at zoom 2 (≈60% at 1.6): **plumber-1 rose, plumber-2 pink, plumber-3 farm**. Portrait (zoom 3.5) also reaches cell 70, about three quarters in: plumber-1 hut, plumber-2 rose, plumber-3 pink — so the hut shows only in portrait. `plumberHouseTypeFor(cell, stage)` = `PLUMBER_HOUSE_TYPES[(stage − 1 + 3 × band) mod 4]` | `drawPlumberHouse` (index.js); art in `plumberHouses.js` (`paintPlumberHouseBody`, `drawPlumberHouseLive`) |
| Pit fill: tar with bubbles and sheen | terrain | all | In every hole. Scripted pits: p1 0.725; p2 0.112; p3 0.119/0.139/0.16/0.45/0.78 | `game/pitFill.js` `tar` |
| **new** Pit fill: gear works, mixed per bay — MESHED TRAIN (spur gears meshing at the true ratio, spoke windows, brass hubs) and THE GRINDER (a side-on drum rolling hooked teeth over its crest, throwing chips) | terrain | plumber-2 | The 4-jump crossing at 0.242, cut into 4 bays at the stones' middles: grinder / meshed / grinder / meshed. Always turning | `pitFillHard.js` `gears` (`gearsMeshed`, `gearsGrinder`); `stage-layouts.js` |

### Obstacles and flyers

| Item | Kind | Levels | How often (per run, L1 / L2 / L3) | Code |
| --- | --- | --- | --- | --- |
| !-crate: floats, shimmers, bumps when hit | obstacle | all | 9.8 / 7.8 / 6.3 | `qcrate` (entities.js), 36 frames |
| Thistle / big thistle: sways | obstacle | all | 3.3 / 4.5 / 5.0 + big 0 / 0 / 1.0 | `PLUMBER_PATTERNS` swap (cabinets.js) |
| Cactus / big cactus: sways | obstacle | all | 5.0 / 3.5 / 2.8 + big 0 / 1.5 / 0.5 | `BASE_PATTERNS` |
| Pop spikes: teeth breathe | obstacle | all | 6.3 / 2.3 / 4.8 | `popSpikes` |
| **new** Rake: handle swings up into a grounded hero's face 0.12 s before he arrives (not if he jumps) | obstacle | all | 3.0 / 1.3 / 1.0 | `rake`; `RAKE_SWING_LEAD` / `RAKE_FRAMES` (props.js); trigger in `run.js` update |
| **new** Goose: charges and honks (vx −50) | obstacle (closer) | plumber-2, plumber-3 | 0 / 1.3 / 1.3 (tier 1, so not on plumber-1) | `goose` (animals.js) |
| Barrel: rolls at the hero | obstacle | all | 1.5 / 0.8 / 2.0 | `barrel` (vx −40) |
| Pipe: cap lifts and settles | obstacle | all | 2.3 / 1.0 / 4.3 (includes tunnel hazards) | `pipe` |
| Drone: rotor, bob, drift | flyer | all | 1.5 / 1.3 / 4.8 | `drone` |
| Buzzbird: flaps and approaches | flyer | plumber-2, plumber-3 | 0 / 2.5 / 0.5 | `buzzbird` |
| Floor saw: spins | obstacle | plumber-2, plumber-3 | 0 / 1.8 / 1.8 | `floorSaw` |
| Fire barrel / campfire: flames | obstacle | plumber-2, plumber-3 | fire barrel 0 / 1.5 / 0; campfire 0 / 0.8 / 0.8 | `fireBarrel`, `campfire` |
| Razor hurdle: beacon breathes | obstacle | plumber-3 | 0 / 0 / 0.5 | `boomBarrier` |
| Spring pad | pad | all | 1 per stage (the high-road fork) | `springPad` |
| Finish dog: waits at the tape, then charges at a keyed 8-frame gallop (one of three skins, long tail; redrawn 24 Sep, `sprites/dogs.js`) | obstacle (scripted) | all | plumber-1 always; plumber-2/3 at 45% (`FINISH_DOG_CHANCE`). Preceded by a *static* BEWARE OF DOG sign — a red disc with a white paw print and a bite out of its edge (24 Sep) | `finishDog`, `RunState.spawnFinishDog`, `layout.js`, `dogSign` |
| Banana peel | obstacle, *static* | all | At most 1 per run (`onceGroup: 'peel'`) | `PEEL_ONCE` |

---

## SPEED ZONE (speed-1..3) — pack `faux3d` (desert)

The wildlife and horizon props are `camX`-driven, so all three stages get them at the same
points; only the landmark differs. Positions below are for desktop zoom 1.6.

### Background

| Item | Kind | Levels | How often | Code |
| --- | --- | --- | --- | --- |
| Vultures: 2 thermals (3 + 2 birds) circling and banking, with brief flaps | background | all | Nearly always at least one thermal on screen. They come round every ≈2350 and ≈4450 world px | `drawVultures`, `DESERT_THERMALS` |
| Campfire smoke: one plume of puffs, swaying, drifting on its own wind | background | all | One plume, then about 3 screens of nothing. It recurs every ≈5700 world px (≈19 screens, ≈32 s), so ≈2 per stage | `drawCampfireSmoke`, `DESERT_SMOKE_PLUMES` |
| **new** Big ear: one large radio telescope that re-aims in step-and-hold moves, with a blinking feed lamp (replaced the three-dish cluster) | background | all | Horizon slot 1 of a 6-slot cycle (and 4, only reached in overtime). One slot per ≈3770 world px, so once a stage (≈26–52% in) | `drawDesertLandmarkProps`, `desertHorizonPropKind` (desertHorizonProps.js) |
| **new** Opening landmark, one per stage: speed-1 wind pump over a stock tank (wheel turns, rod strokes); speed-2 fire lookout (flag flaps, windows glint as the sun's bearing passes); speed-3 rocket on a launch pad beside its gantry, which **launches**: vents on the pad, ignites as the pad passes 62% across the picture (arms swing back, smoke billows along the pad), lifts 1.6 s later and climbs off the top leaving a drifting trail | background | one each | Horizon slot 0 (≈0–25% in), once a stage. The launch clock is the pad's scroll (`DESERT_ROCKET_LAUNCH_AT`, `DESERT_ROCKET_SCROLL`), so rewinds replay it | `DESERT_HORIZON_STAGE_PROPS`, `desertRocketLaunchClock` |
| **new** Radio mast: guyed lattice mast with microwave drums and blinking beacons | background | speed-2 | Replaces speed-2's water tower on the lower mesa (slot 2, ≈55–80%), so it appears once in the cabinet | `DESERT_HORIZON_STAGE_PROPS`, `DESERT_LOWER_MESA_PROPS` |
| Wind turbines: 3-blade rotors, 2.6 s per turn | background | all | Horizon slot 3, so at most one farm a stage, near the end (≈91–100% at zoom 1.6) | `drawWindTurbines` |
| **new** Pumpjacks ×2: real linkage, pumping out of step | background | speed-1 | Once, on the middle tile nearest `DESERT_LANDMARK_AT` = 0.45 (`DESERT_PUMP_AT` 0.49 of the tile). On screen ≈36–62% | `drawDesertLife` → `drawDesertPumpjacks` (desertLandmarks.js) |
| **new** Speed trap, the SMILE! speed camera: shows SMILE! until the camera pole is 100 px ahead of the hero (`DESERT_TRAP_FIRE_LEAD`) — in portrait, as soon as the whole board is in view, played 2.2× faster (`DESERT_TRAP_PORTRAIT_PACE`) — flashes once, then holds a **mugshot of the current hero** with GOTCHA! and a $1986 fine while it scrolls off; the patrol car's light bar starts at the flash. Rewinding before it re-arms it. The SPEED LIMIT sign the hero passes before it always reads 67 (`DESERT_TRAP_SPEED_LIMIT`; every other one is random). The stage's one early speed ramp is pinned in the opening, before that sign (`TRAP_RAMP_X` in run.js), and no other ramp is dealt before world x 800 (`TRAP_RAMP_FREE_UNTIL`) so nothing talks over the shutter | background | speed-2 | Once, pinned to a distance: `DESERT_TRAP_AT_PX` = 320 world px, so mid-picture about 3 s in (before the copter arrives) and gone by ≈10% | `drawDesertSpeedTrap(…, heroId, since)`, `desertTrapLatch` |
| **new** Jet: fighter goes supersonic with a vapour cone, shock ring and lingering contrail; flies at y 104 in landscape, on the portrait layout's top cloud band (`upperCloud`) in portrait | background (flypast) | speed-3 | Once, over `camX` from 0.45 of the stage for `DESERT_JET_PASS` = 1600 world px (≈45–59%) | `drawDesertJet` |
| **new** Coyote on a ledge, facing right (at the sun) or left — about half each, hashed per summit and stage — and each one a **show** (coyote bake-off, 24 Sep): the **howl** (every 5 s, the default); **yawn and settle** (a yawn, down on the ledge dozing with Z's, back up, a howl, round again); the **chorus** (a pup on the ledge yips, then howls with it, side-on); the **wink** (sat square to the camera from the start — never turns — cocks a brow, winks with a star twinkle, grins). Non-howl shows start as the ledge comes into view (1.5× pace in portrait) | background | all | Only on bare near summits (every 3rd tile), half of those by hash, never within 3 tiles of the speed trap. A 60 s lap passes two: near tiles 11 and 14, ≈63% and ≈81%. Dealt by order in the stage: **speed-1** howl → yawn, **speed-2** chorus → howl, **speed-3** yawn → chorus. Overtime repeats the stage's pair. **speed-3's winker is at the finish** (25 Sep): it only blinks until the hero lands on the finish pad, then brows, winks and grins once (`winkWait`, from the run's `finishPadT`); its own coyote, seated by the tape in the frame the camera parks on (a little behind it in landscape, left of the pole in portrait), on the nearest spot clear of saguaros — sometimes a valley, not a summit; hashed coyotes within a tile of it stand down (`desertFinishWinkL`, from the run's `backgroundContext.finish`) | `drawDesertCoyote(…, facing, { mode, since, pace })`, `DESERT_COYOTE_SHOWS`, `desertCoyoteLatch` |
| **new** Dust devils: swaying, winding column with debris, wandering ±30 px | background | all | On **fewer than half** the middle tiles (hash ≤ 0.42), skipped next to the pumpjacks. A devil **fades out** within 110–170 px of the smoke, dishes, turbines or a coyote. Roughly one per ≈4250 world px, fewer after fading | `drawDesertDustDevil`, `desertBusyXs` |
| **new** Tumbleweeds: bouncing, spinning, blown right by the wind | background | all | A slot every `DESERT_WEED_SPACING` 640 near-layer px (≈1140 world px), 3 in 5 filled, drifting at `DESERT_WEED_WIND` 26 px/s. ≈5 a stage | `drawDesertTumbleweed` |
| Pit fill: lava with glow, surface ripple and embers | terrain | speed-2, speed-3 (plus any bag pit) | Scripted pits: s2 0.14 / 0.715 / 0.736; s3 0.38 | `pitFill.js` `lava` |
| **new** Pit fill: RUSTED STAKES — leaning rust stakes with filed bright points, sagging barbed wire that sways, skulls and bones | terrain | speed-3 | The 5-jump crossing at 0.665, the whole width (SPEED ZONE's spikes are always stakes. The only other spike pit drawn in the game is surge-2's 6-jump crossing at 0.70, which mixes STAGGERED STEEL / RUSTED STAKES / PISTON BED per bay: steel, stakes, piston, steel, stakes, piston — the piston rams fire on the song's beat. RHYTHM's spike holes are drawn by the LCD pack's own cogs) | `pitFillHard.js` `spikes` (`spikesStakes`, `HOUSE_SPIKES`) |

### Obstacles and flyers

| Item | Kind | Levels | How often (L1 / L2 / L3) | Code |
| --- | --- | --- | --- | --- |
| **new** Rattlesnake: coiled with the rattle buzzing; **strikes once, 0.5 s before the hero arrives** | obstacle | all | 3.0 / 2.3 / 2.0 | `rattlesnake`; `SNAKE_STRIKE_LEAD` / `SNAKE_STRIKE_T` (animals.js); trigger in `run.js` |
| Cactus / big cactus: sways | obstacle | all | 9.3 / 3.8 / 5.8 + big 0 / 1.3 / 1.0 | `BASE_PATTERNS` |
| Buzzbird: flaps and approaches | flyer | all | 3.0 / 4.0 / 0.8 | `buzzbird` |
| Boost pad: chevrons run | pad | all | 5.0 / 1.3 / 2.0 | `boostPad` |
| Loop-de-loop | set piece | all | 1 per stage, at 0.559 (s1) or 0.55 (s2, s3) | `loopPad`, `LOOP.at` (loop.js) |
| Fire barrel / campfire: flames | obstacle | speed-2, speed-3 | fire barrel 0 / 2.0 / 2.3; campfire 0 / 0.5 / 0.3 | `fireBarrel`, `campfire` |
| Barrel: rolls | obstacle | speed-2, speed-3 | 0 / 1.5 / 1.3 | `barrel` |
| Drone | flyer | speed-2, speed-3 | 0 / 1.3 / 2.3 | `drone` |
| Bruiser dog: charges (vx −38), keyed 8-frame gallop (redrawn 24 Sep, `sprites/dogs.js`) | obstacle (closer) | speed-2, speed-3 | 0 / 1.0 / 1.3 | `ANIMALS.speed` |
| Razor hurdle / pop spikes / floor saw | obstacle | speed-2, speed-3 | hurdle 0 / 1.0 / 0.8; spikes 0 / 0.3 / 0; saw 0 / 0 / 0.3 | cabinets.js speed bank |
| Clown-copter (Eggshell): flies in 2 bars after the start, hovers over the hero, drops barrels, 3 bonk windows | flyer (mission) | speed-2 | Whole stage | `run.js` `mission.type === 'chase'`, `COPTER_*` |
| Traffic cone | obstacle, *static* (puntable) | all | 4.3 / 6.5 / 10.5 | `trafficCone` |

---

## RHYTHM BANKRUPTCY (rhythm-1..3) — pack `lcd`

The city is fixed to the screen (no parallax), so everything here is timed to the song:
124 bpm (rhythm-3 ramps to ≈129), one bar ≈1.94 s, one 16-beat loop ≈7.7 s, ≈11 loops a
stage. Scene data is `LCD_CITY_SCENES[stage]`; phones use
`LCD_PORTRAIT_STAGE_1/2/3`, which have fewer structures.

### Background

| Item | Kind | Levels | How often | Code |
| --- | --- | --- | --- | --- |
| City walk-on: buildings rise into place one per beat | background | all | Once per run, over the first ≈10 beats | `lcdArrival`, `LCD_ARRIVE` |
| Sky colour steps warmer | background | all | Once per quarter of the run (`LCD_PHASES` 4) | `LCD_SKY_PHASES` |
| Lit windows step on the beat, and double as a volume meter | background | all | Every beat. The pattern differs per stage | `lcdWindowGridLit` |
| Combo board / verb sign: control signs flash, then the streak count | background | all | Signs from opening beat 4, one per bar; then the count, which flashes gold every 8th clean beat | `lcdVerbSign`, `lcdComboBoard` |
| Clouds: step-drift and bob on the beat | background | all | Always. Stages 1 and 3 drift and wrap; stage 2 sways ±24 px in the top corners | `lcdCloudLayer`, `LCD_CLOUD_DRIFT` |
| Clock tower: hand steps once per beat | background | rhythm-1 | Always | `lcdClockHand` |
| Transmitter: rings walk outward on the beat; treble adds rings | background | rhythm-1, rhythm-3 | Every bar | `lcdTransmitter` |
| Smokestacks: 3–4 puffs following the music's loudness | background | rhythm-1, rhythm-3 | Always | `lcdSmokestack`, `LCD_PUFFS` |
| Billboards: invader swaps every 2 beats; boards flash on loud drums | background | rhythm-1 (chart, invader, burger, cassette), rhythm-2 (chart, chase), rhythm-3 (chart) | Always | `lcdBillboard` |
| Maze-chase board: scrolls 1 cell per beat, chomps | background | rhythm-2 | Repeats every 48 beats (12 bars) | `lcdChaseGrid`, `LCD_CHASE_LEN` |
| Banner plane: climbs across 14 px per beat; tail wags; tows INSERT COIN / GG / ♥♥♥ (rhythm-1) or HIGH SCORE / ONE MORE GO / PRESS START (rhythm-3) | background (flypast) | rhythm-1, rhythm-3 | One pass every 64 beats (≈31 s), 44 beats on screen, so ≈3 passes a stage. rhythm-1 has one KEY CHANGE pass centred on bar 61. rhythm-3 shows SURRENDER DOROTHY on 1 attempt in 3 (`SKY_OMEN_CHANCE`) | `lcdPlane`, `LCD_PLANE_CYCLE` |
| Plane hits the gorilla's barrel: star, debris, then a gap in the tower chain | background | rhythm-1 | About 1 pass in 3, ≈once a stage | `lcdBarrelStrikeAt`; `run.js` `advanceCityAccident` |
| Game & Watch tower: 4 barrels roll down 1 cell per beat; a runner climbs and is hit on loop A, escapes on loop B | background | rhythm-1 | Always (32-beat loop) | `lcdGameWatch` |
| Rooftop gorilla: 4-pose throw per bar; gaze and mood changes; watches the plane | background | rhythm-1 (tower), rhythm-3 (building 6) | Always. On rhythm-3 the swing is timed to the lane's barrels, and he waves at the end | `lcdRooftopGorilla`, `lcdSwingPhase` |
| Barrel chute: a lit barrel steps down 4 cells per beat; the rim flashes when a real lane barrel is 1–4 beats out | background (feeds gameplay) | rhythm-3 | Always. Lane barrels are handed over 7 beats ahead (`LCD_CHUTE_LEAD_BEATS`) | chute drawing in `lcdPack`; `run.js` `updateBarrelArrivals` |
| Monorail: 4 cars cross right to left, wait, return; one car per beat; lamps blink, a passenger walks | background | rhythm-2 | Crossing 24 beats, wait 8 beats (`LCD_TRAIN_WAIT`), lap 64 beats (≈31 s). On screen 75% of the time from beat 0. No station | `lcdTrainRun`, `lcdTrain`, `LCD_TRAIN_CAR` |
| Searchlights ×2: 8 angles, one step per beat, sweeping | background | rhythm-2 | A full sweep every 8 beats; the two are half a sweep apart | `lcdSearchlight`, `LCD_BEAM_ANGLES` |
| Window washer: cradle steps down a row per beat; tips over in the last quarter | background | rhythm-2 | 16-beat cycle | `lcdWasher` |
| Rooftop equaliser banks follow the music spectrum | background | rhythm-2 | Always, on 4 roofs | `lcdEqualizer` |
| Roof antennas and lamp caps blink | background | rhythm-3 | Antenna tip about every 5 beats; cap lamps on alternate beats | `lcdAntenna` |
| Road dashes; pit gears turn as the camera moves | terrain | all | Every hole | `lcdPack.ground`, `lcdGear` |
| Screen shimmer (very faint) | post | all | Always (≈1 s cycle) | `lcdPack.post` |

### Obstacles and flyers (from the beat charts, `songs/rhythm.js` `beatCharts`)

| Item | Kind | Levels | How often | Code |
| --- | --- | --- | --- | --- |
| Beat bar: pops up on the beat | obstacle | rhythm-1, rhythm-2 | r1 3 per loop (≈33 a stage); r2 2 per loop (≈22) | `beatBar` (`beatSync`) |
| Drone column: 4 drones, slide under | flyer | rhythm-2, rhythm-3 | r2 1 per loop (≈11 columns); r3 2 per loop (≈22) | chart `column: 4` |
| Barrel from the gorilla's chute: rolls; kicked on the beat | obstacle | rhythm-2, rhythm-3 | r2 every 3rd loop (≈4); r3 every 2nd loop (≈6) | chart `type: 'barrel'`, `beatPunt` |
| Card box: shot on the beat, bursts on the beat | obstacle | all | Every 3rd loop (≈4 a stage), only for a hero who can shoot | `cardBox`, `BOX_BURST_BEATS` |
| Beat holes (spike fill) | terrain | all | r1 2 per loop; r2 and r3 4 per loop; plus scripted pits (r2 0.37 and the 6-jump crossing at 0.703; r3 0.37 / 0.75) | chart `action: 'pit'` |
| Clown-copter: flies in under the gorilla, roams, bonk windows every 4.5 bars | flyer (mission) | rhythm-3 | Whole stage | `run.js` chase, `COPTER_*` |

---

## FROST FORTRESS (frost-1..3) — pack `watercolor`

The light goes from day to dusk across the three stages (`FROST_STAGE_LIGHT`). The
lighting is fixed per stage, not animated.

### Background

| Item | Kind | Levels | How often | Code |
| --- | --- | --- | --- | --- |
| **new** Chair lift (gondola): 12 cabins swaying, riding down out of the sky from the left **into the hills** on the right | background | frost-1 | Once, near the start. `FROST_LIFT_AT_PX` = 700 world px (mid-picture ≈3.6 s in); already in frame at the start line and gone by ≈2000 px. A cabin reaches the hill every ≈8.3 s | `drawFrostChairLift`, `frostLiftX`, `LIFT` (frostLandmarks.js) |
| **new** Reindeer herd: 5 cut-paper caribou (pale mane, dark muzzle and nose, strip antlers) galloping along the far crest, overtaking the run; they pass behind the ridge's rocks and fortresses, hidden right down to the snow line | background | frost-2 | Once, crossing over `FROST_HERD_WINDOW` = 0.78–0.95 of the stage (≈16 s) | `drawFrostReindeer` |
| **new** Arctic fox (blue morph, slate): trots in along the near crest, stops, cocks its head, leaps and dives head-first into the snow, tail wagging, then backs out with a shake | background | frost-1 | Once, at 21% (clear air). It dives once per pass, then stands and looks about. Its show starts as it comes into view (1.5× pace in portrait); on screen ≈4 s | `FROST_WILDLIFE`, `paintFox` (frostWildlife.js) |
| **new** Polar bear and cub: ambling along the near crest with the run, slower than the camera; pass behind the ridge's rocks | background | frost-1 | Once, at 44% (light snow) | `paintPolarBears` |
| **new** Three wolves on an ice-capped ledge set into a near hilltop, built like the Speed Zone coyote: the leader howls and the other two join one after another (song rings), then they look about, flick ears, twitch tails. Recurs like the coyote, turned the other way on frost-2 | background | frost-1, frost-2, frost-3 | Once a stage: frost-1 at 29%, frost-2 at 21% (group mirrored), frost-3 at 21% (before the storm's first step up; nearer the start a fortress stood behind them) **round a campfire** instead of on the ledge: dark firelit silhouettes with a warm rim, the leader and one wolf on the left and one on the right with the fire in the open between them (25 Sep bake-off, F), sparks and a smoke column blowing downwind (at dusk the day wolves' grey matched the ridge and dissolved). The chorus starts as they come into view | `paintWolves`, `paintWolvesFire` |
| **new** Igloo set into a near hilltop: cut snow blocks, glowing doorway, steam from the vent, a husky by the door that howls now and then | background | frost-1 | Once, at 86%, past the high path (the blizzard is at its frost-1 high of 0.45 by then; a white dome is the first thing it hides) | `paintIgloo` |
| **new** Beacon tower set into a near hilltop: timber watchtower, cross-braced, ladder, snow on the deck, pennant streaming downwind, and a signal fire in an iron basket on the platform — flickering, sparks and smoke blown downwind, its glow lighting the tops of the legs | background | frost-3 | Once, at 37%, in the storm | `paintBeaconTower` |
| **new** Snow groomer: red cab on long tracks crawling along the near crest with the run, blade up front, tiller combing corduroy behind, two headlight beams reaching ahead through the snow, amber beacon turning on the roof, exhaust | background | frost-3 | Once, at 69%, just past the high path, in the heaviest snow | `paintSnowGroomer` |
| **new** Log cabin set into a near hilltop: gable end and long wall, snow slab and icicles, stone chimney smoking downwind, lit windows and door lamp, woodpile | background | frost-2 | Once, at 5% (low sun, moderate snow) | `paintCabin` |
| **new** Husky sled team: three pairs at a gallop on the gangline, each dog with the igloo husky's ice-blue eye (25 Sep), sled under a red tarp, musher in a fur-hooded parka with a streaming scarf, snow off the runners; runs with the hero, slower than the camera | background | frost-2, frost-3 | frost-2 at 40%, before the high path; frost-3 at 78% **with a lantern** swinging off the bow, its warm glow the thing that reads in the heaviest snow of the act (heavier snow; dark, moving shapes read through it) | `paintDogSled` |
| Aurora curtains: slow drift and breathing opacity | background | all | Always. 2 curtains on frost-1, 3 on frost-2/3, with gain 0.74 / 1 / 1.3 | `drawFrostAurora`, `FROST_AURORA_STAGE_CURTAINS` / `_GAIN` |
| Blizzard: 3 layers of wind-blown streaks plus a haze veil, gusting | weather | all | One storm across the act, one step up per checkpoint (eases in over 4 s). frost-1 is clear until the 1/3 checkpoint, then 0.27 → 0.45; frost-2 runs 0.45 → 1.02; frost-3 runs 1.02 → 1.5 | `drawFrostBlizzard`, `frostBlizzardRung`, `FROST_BLIZZARD_LADDER` |
| Fortresses on the far ridge, redrawn (25 Sep): frost-1's crown keep (snow on the ledges, icicles, arched lit windows with snow sills, lit gate, banner on the point), frost-2's broken ruin (snow on the broken tops, a frozen waterfall through the break, rubble) alternating with the ruin it always had, frost-3's lone tower (no chevron; a lit slit high on the spire, a banner down the front). 3 warm windows on each blink on their own clocks | background | all (shape differs per stage) | A fortress on every other far tile, so one per ≈4250 world px (≈14 screens), each on screen ≈10 screens | `frostFortresses.js` `FROST_FORTRESS_SHAPES`, `frostFortressVariant`; the original ruin is `frostLandmarkShape` |
| **new** Crystal Citadel: a cluster of great hexagonal ice crystals, lit, mid and shaded facets, snow on the points, warm light blinking inside the biggest | background | all | In place of a fortress at every fifth site, offset per stage so each stage meets one at a different point (frost-1 its 4th fortress, frost-2 its 3rd, frost-3 its 2nd) and never two near each other | `frostFortressVariant`, `FROST_FORTRESS_SHAPES.citadel` |
| Sleigh flypast (25 Sep): Santa and the full team — Rudolph leading, blinking nose, eight behind in four pairs (the frost-2 herd's paper deer, red harness, gold bells), a red lacquered sleigh on gold runners with a sack of presents, Santa in red and white facing us (dot eyes, a smile, his hat's tip streaming back), waving — trailing twinkling stardust. Every pair, the sleigh and the dust fly ON the arc (follow the leader, each tipped a little up the curve), in colour, behind the snow (the blizzard crosses it) | flyer (flypast) | frost-3 | Once, armed 2.4 s of running before the finish (`FROST_FLYPAST_LEAD`). The flight takes ≈5 s at `FROST_FLYPAST_SPEED` 160 | `armFlypast` (`run.js`), `sprites/sleigh.js` `FROST_FLYPAST` = `paper-santa-front`, `flypastPathY`, `frostFlypastArc` |
| Pit fill: slush with floes, surface ripple | terrain | all | Every hole. Scripted pits: f1 0.046; f2 0.40; f3 0.37 / 0.74; plus switch gaps and bag gaps | `pitFill.js` `slush` |
| Ice-block bridge: cubes rise left to right when a switch is hit | terrain | all | With every hit switch (0.2 s, `BRIDGE_LAY_T`) | `drawBridgeDecks` |

### Obstacles and flyers

| Item | Kind | Levels | How often (L1 / L2 / L3) | Code |
| --- | --- | --- | --- | --- |
| Snowman / big snowman: sways | obstacle | all | 9.8 / 16.3 / 16.3 + big 3.5 / 4.0 / 4.0 | `ICE_PATTERNS` |
| Bear trap: idle, and snaps shut when shot | obstacle | all | 10.5 / 12.5 / 12.5 | `bearTrap`, `TRAP_FRAMES` |
| **new** Ice crystals | obstacle, *static* | all | 4.5 / 2.3 / 2.3 | `iceCrystals` |
| Frozen switch (coin block): bump and throw animation, lays the bridge | obstacle | all | 5.0 / 6.0 / 6.0 | `switch`, `SWITCH_BONK_T` |
| Drone | flyer | all | 3.0 / 6.5 / 6.5 | `drone` |
| Buzzbird | flyer | all | 3.3 / 1.0 / 1.0 | `buzzbird` |
| Campfire: flames | obstacle | all | 2.3 / 1.3 / 1.3 | `campfire` |
| Barrel: rolls | obstacle | frost-2, frost-3 | 0 / 2.0 / 2.0 | `barrel` |
| Pop spikes | obstacle | all | 0.8 / 1.3 / 1.3 | `popSpikes` |
| Spring pad | pad | all | 1 per stage (the sky-road fork at 0.55) | `springPad` |

---

## CRYPT SHIFT (crypt-1..3) — pack `vhs`

The pack ignores the stage, so all three crypt stages have the same background. Nothing
changed on 24 Sep.

### Background

| Item | Kind | Levels | How often | Code |
| --- | --- | --- | --- | --- |
| VHS tracking band: a pale bar rolls down the screen | post | all | Every 7.5 s | `vhsPack.post` |
| Brown-out light radius: dark vignette following the hero | overlay (mission) | crypt-1, crypt-3 (blackout missions) | Whole stage | `run.js` blackout overlay, `blackoutGradient` |
| Dead trees and headstones | background, *static* (parallax only) | all | Far ridge: one prop per ≈1300 world px. Near ridge: about one per screen, alternating | `drawCryptScenery`, `CRYPT_SCENERY_FEATURES` |
| Pit fill: tar with bubbles | terrain | all | Tunnel mouth only (no scripted pits on crypt) | `pitFill.js` `tar` |

### Obstacles and flyers

| Item | Kind | Levels | How often (L1 / L2 / L3) | Code |
| --- | --- | --- | --- | --- |
| Zombie: shambles toward the hero (vx −14) | obstacle | all | 13.8 / 14.0 / 14.0 | `zombie` (`shamble`) |
| Brazier: flame, and a light source in the dark | obstacle | all | 6.0 / 6.5 / 6.5 | `brazier` |
| Campfire: flames | obstacle | all | 5.3 / 2.3 / 2.3 | `campfire` |
| Cactus / big cactus: sways (dealt through `BASE_PATTERNS`) | obstacle | all | 12.0 / 11.5 / 11.5 + big 3.0 | `BASE_PATTERNS` |
| Feral dog: charges (vx −68), keyed 8-frame gallop (redrawn 24 Sep, `sprites/dogs.js`) | obstacle (closer) | all | 2.8 / 2.8 / 2.8 | `ANIMALS.crypt` |
| Cat: fastest closer (vx −78) | obstacle (closer) | crypt-2, crypt-3 | 0 / 1.8 / 1.8 | `catFury` |
| Drone | flyer | all | 3.8 / 6.3 / 6.3 | `drone` |
| Buzzbird | flyer | all | 3.3 / 1.0 / 1.0 | `buzzbird` |
| Floor saw / pop spikes | obstacle | all | saw 2.3 / 3.0 / 3.0; spikes 3.3 | crypt bank |
| Barrel: rolls | obstacle | crypt-2, crypt-3 | 0 / 2.0 / 2.0 | `barrel` |
| Tombstone | obstacle, *static* | all | ≈18.5 | `tombstone` |
| Down sign at the catacomb mouth | sign, *static* | all | 1 (tunnel at 0.40) | `downSign` |

---

## TERMINAL VELOCITY (neon-1..3) — pack `neon` (Tokyo)

`trains` in `stages.js` is **not read in play**; only the gallery's stage-plan tiles use
it. The trains that actually run come from `stage-layouts.js` `routes.islands`.

### Background

| Item | Kind | Levels | How often | Code |
| --- | --- | --- | --- | --- |
| Golden-hour sun rays: 24 rays turning and breathing | background | neon-1 (until the strike) | Only while the golden mood lasts | `neonGoldenSky`, `NEON_GOLDEN_MOOD` |
| **new** Mt Fuji | background, *static* (fades) | neon-1 (day only) | Fades out over `NEON_FUJI.fade` = 0.03–0.2 of the stage; the strike removes it with the sun | `NEON_FUJI`, `neonFujiAlpha` |
| Lightning strike: bolt crawls across the sky, 4 restrikes with flashes; on neon-1 the first strike turns day to night. **White-hot** since 25 Sep (bolt bake-off C): a fine fractured channel with forks down to hairlines, a white core that swells on each stroke in cyan and magenta bloom, the skyline lit where it lands, cooling to violet between strokes with the first bolt burned in as an afterimage, out of E's lit cloud deck, forks thinned along the sky (`drawNeonBolt`). In landscape the sky bolt runs along the top edge on neon-1's turn (bake-off M) and above the frame on every night strike (N), so the strike drops in from out of the picture; portrait keeps its own. **It hits a building** (bake-off L, 25 Sep): 16 beats before each strike the run places a low sign tower in the near row, aimed from the song clock and the camera's speed to be 60% across (72% in portrait) on the beat; the bolt lands on its roof, the tower flares, its sign overloads, sparks, stutters and stays dead as it scrolls away, and the row's own front sign stands down meanwhile. If the Tokyo Tower will be in view it takes the strike instead (neon-2/3); if the placed tower missed the picture, the nearest middle-row mast flares (`neonStruckTower`, `neonStrikeTarget`) | background | all | On beats 56 and 176 (bars 15 and 45) of the song, and again on every song loop; each lasts 2.4 s (`NEON_STRIKE_SECONDS`). Tied to the song, not to progress | `neonMoods.js` `NEON_STRIKE_BEATS`, `neonTurnStep`, `drawNeonBolt`; `run.js` `updateNeonSky` |
| Warning flickers: 2 pale flashes | background | all | One beat before each strike | `neonPreFlicker` |
| Aurora: 3 curtains ripple and breathe | background | all | neon-1 fades in from `NEON_AURORA_AT` 0.35 over 0.05; neon-2/3 have it from the start | `neonAuroraStrength`, `neonAurora` |
| Starfield: 96 stars pulse and drift slightly | background | all (hidden in golden) | Always at night | `neonStarfield` |
| Comets | background | all | 3 a stage, at `NEON_COMET_AT` 0.19 / 0.52 / 0.81. Each lasts ≈1000 world px (≈4 s) | `neonComet` |
| Moon: tube flicker, halo breathes; waxes across neon-1 and 2, full through neon-3 (the neon-3 eclipse was retired 25 Sep) | background | all (night) | Always at night. Phase from `neonMoonPhase`; `neonMoonEclipse` now always 0 | `neonMoon`, `neonMoonEclipse` |
| City arrival: far mass, then mid wires, then near wires fade in | background | neon-1 | `NEON_CITY_ARRIVALS`: 0.07–0.15, 0.12–0.20, 0.19–0.27 | `neonCityReveal` |
| Window lights: staggered on/off (11.4 s cycles) | background | all | Always, on the mid and near tower rows | `neonWireRow` |
| Mast aviation lamps blink red | background | all | 2.9 s cycle, on the tallest towers | `neonWireRow` |
| Blade signs (kana), front and back rows. **One front sign a stage has a faulty tube** (25 Sep): the one on the street 30–70% of the way in (hashed per stage); every couple of seconds, not every time, it stutters to dark glass for half a second (`neonSignFlicker`) | background, static except that one | all | Front: one every ≈4.6 screens. Back: one every ≈9.2 screens. neon-1 shows them only once their row has arrived | `neonBladeSigns`, `kana.js` |
| **new** Tokyo Tower: red antenna lamp blinks (0.5 s in every 1.6 s); the lattice is static | background | neon-2, neon-3 | Once, centred at `NEON_TOWER_AT` 0.5 (parallax 0.05). Visible ≈32–68% of the stage | `NEON_TOWER_AT`, `NEON_TOWER_FACTOR` |
| Road speed streaks (day ink on neon-1 before the strike is new) | terrain | all | Always | neon road apron |
| Bullet trains: fly in as a ghost, land, doors open; take off after the hero passes; LED station board scrolls (**new**) | set piece (rideable) | neon-1 (0.10 / 0.30 / 0.55 / 0.80 / 0.967), neon-2 (0.46 / 0.94) | 5 on neon-1, 2 on neon-2, none on neon-3. The flight starts 1200 px ahead (`TRAIN_FLIGHT_LEAD`) | `terrain.js` `trainArrival`, `TRAIN_*`; `stage-layouts.js` routes |
| Train flypast: a train that is only flying over, in day livery | flyer (flypast) | neon-1 | The 0.10 train, before the song turns | `terrain.js` `trainFlypast`, `drawNeonFlypast` |

### Obstacles and flyers

| Item | Kind | Levels | How often (L1 / L2 / L3) | Code |
| --- | --- | --- | --- | --- |
| Drone, including the stacks of 2 and 3 (**new**; one column pattern at tiers 0 and 1) and half of the buzzbirds (**new**; the other half become targets) | flyer | all | 7 / 10 / 11.5 drone encounters (a column counts once) — about a third of all hazards | `drone` with `column`, `swaps.buzzbird` |
| Shooter drone: fires | flyer | all | 2.8 / 7.0 / 7.5 | `shooterDrone` |
| Target: bobbing star | flyer | all | 13.0 / 9.3 / 9.5 | `target` |
| **new** Road-works panda / frog / monkey barriers, swapped in for the cactus (the rest of the cactus slots: crates, spike plates, cones) | obstacle, *static* | all | panda 1.5 / 1.0 / 0.8; frog 0.8 / 1.0 / 0.5; monkey 0.8 / 0.8 / 0.8 — never the same animal within 900 world px (≈3 screens) of the last | `swaps.cactus`, `swapSpacing` (cabinets.js) |
| Fire barrel: flames | obstacle | all | 2.5 / 5.5 / 5.5 | `fireBarrel` |
| Barrel: rolls | obstacle | neon-2, neon-3 | 0 / 3.8 / 3.8 | `barrel` |
| Bruiser dog: charges, keyed 8-frame gallop (redrawn 24 Sep, `sprites/dogs.js`) | obstacle (closer) | neon-2, neon-3 | 0 / 2.3 / 2.3 | `ANIMALS.neon` |
| Floor saw / pop spikes / razor hurdle | obstacle | all | saw 3.5 / 1.0 / 1.3; spikes 0.5 / 2.5 / 2.5; hurdle 4.3 / 1.3 / 1.5 | neon bank |
| Traffic cone | obstacle, *static* (puntable) | all | 2.0 / 1.8 / 1.5 | `trafficCone` |
| Pits: open, no fill | terrain | all | Scripted pits at 0.37 / 0.71 (n1), 0.36 / 0.70 (n2), 0.37 / 0.70 (n3) | `pitFill: 'none'` |

---

## How to update

- **Background constants** live in `src/engine/stylePacks/index.js`. Grep for the cabinet:
  - Plumber: `PLUMBER_*`, `drawPlumberLife`
  - Speed: `DESERT_*`, `drawDesertLife`
  - Rhythm: `LCD_CITY_SCENES`, `LCD_*`
  - Frost: `FROST_*`
  - Crypt: `CRYPT_*`, `vhsPack`
  - Neon: `NEON_*`, `neonPack`
- **24 Sep art** is in `plumberLandmarks.js`, `desertLandmarks.js`, `frostLandmarks.js` and `neonMoods.js` beside it.
- **Frost's near-ridge wildlife** (25 Sep) is in `frostWildlife.js`: `FROST_WILDLIFE` is the schedule, one entry per stage fraction. Each item's spot is settled once per slot (never re-snapped while it crosses): a crown flat enough for it, with no tree or rock across its whole span (walkers: no tree across their path). Nothing passes during the spring-pad high path (≈52–66% of every stage), where the camera is up on the sky road and the ridge is out of sight, nor over the chair lift, the herd or the sleigh; a stage's items stay at least 6% (≈5 s) apart. The percentages in the table are at zoom 2 (the gallery's); the device's zoom (1.6 desktop, 2.2 phone, portrait) moves the ridge under each point, so in a run an item passes up to a few percent either side. The fractions were nudged so each foot is in the open and nothing big stands behind it; the lane's terrain still raises the foreground hills over them at times.
- **Neon sky timing** (strike and flypast) is in `src/game/run.js` `updateNeonSky`. Neon trains are in `src/game/terrain.js`. The frost sleigh is in `src/sprites/sleigh.js`.
- **Obstacle banks** are in `src/data/cabinets.js`: `patterns`, `BASE_PATTERNS`, `ANIMALS`, `swaps`. Boxes and motion flags are in `src/game/entities.js`. Frame counts and rates are in `PROP_FRAMES` / `PROP_FPS` (`src/sprites/props.js`) and `ANIMAL_FRAMES` / `ANIMAL_FPS` (`src/sprites/animals.js`).
- **Pinned stage events** are in `src/data/stage-layouts.js`: pits, crossings, routes, trains, loop, finish dog.
- **To re-measure obstacle counts,** run `node tests/lib/capture-ledger.js <stage> <seed>` for seeds 101 202 303 404 and average the `['o', type, …]` spawns. Keep the output under `work/local/`.

## What the slide kick does

Settled 24 Sep 2026. A timed power slide into an obstacle does one of three things;
anything not listed hurts. Nothing alive can be kicked.

| Kick | Obstacles | Code |
| --- | --- | --- |
| Breaks it | crate, !-crate, snowman, big snowman, ice crystals | `SLIDE_PLOWABLE` (run.js) |
| Punts it | traffic cone, barrel (heavy), road-works panda / frog / monkey, office chair, printer, cardboard monster | `punt` on the def (entities.js) |
| Nothing — you take the hit | everything else, including every animal, the rake, cacti and thistles, tombstones, fire, floor traps and blades, the pipe, razor hurdle and beat bar | — |
