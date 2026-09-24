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
| **new** Sheep (9, including 2 lambs) and a working collie that runs out and back and crouches; sheep turn to watch it and scurry | background | all | About one near summit in seventeen: every 10th summit tile, 60% of them filled by hash, never within 2 tiles of the barn or mill. That is ≈2 flocks a stage, at the same world positions on every plumber stage | `drawPlumberLife` → `drawPlumberSheep` |
| Pit fill: tar with bubbles and sheen | terrain | all | In every hole. Scripted pits: p1 0.725; p2 0.112; p3 0.119/0.139/0.16/0.45/0.78 | `game/pitFill.js` `tar` |
| Pit fill: gear train turning | terrain | plumber-2 | The 4-jump crossing at 0.242 | `pitFill.js` `gears`; `stage-layouts.js` |

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
| Finish dog: waits at the tape, then charges | obstacle (scripted) | all | plumber-1 always; plumber-2/3 at 45% (`FINISH_DOG_CHANCE`). Preceded by a *static* BEWARE OF DOG sign | `finishDog`, `RunState.spawnFinishDog`, `layout.js` |
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
| Satellite dishes: bowls sweep ±0.34 rad, with signal links | background | all | Horizon slots 1 and 4 of a 6-slot cycle. One slot per ≈3770 world px, so ≈1 dish cluster per stage (≈26–52% in) | `drawSatelliteDishes`, `desertHorizonPropKind` |
| Wind turbines: 3-blade rotors, 2.6 s per turn | background | all | Horizon slot 3, so at most one farm a stage, near the end (≈91–100% at zoom 1.6) | `drawWindTurbines` |
| **new** Pumpjacks ×2: real linkage, pumping out of step | background | speed-1 | Once, on the middle tile nearest `DESERT_LANDMARK_AT` = 0.45 (`DESERT_PUMP_AT` 0.49 of the tile). On screen ≈36–62% | `drawDesertLife` → `drawDesertPumpjacks` (desertLandmarks.js) |
| **new** Speed trap, the SMILE! speed camera: shows SMILE! until the camera pole is 100 px ahead of the hero (`DESERT_TRAP_FIRE_LEAD`) — in portrait, as soon as the whole board is in view, played 2.2× faster (`DESERT_TRAP_PORTRAIT_PACE`) — flashes once, then holds a **mugshot of the current hero** with GOTCHA! and a $1987 fine while it scrolls off; the patrol car's light bar starts at the flash. Rewinding before it re-arms it | background | speed-2 | Once, pinned to a distance: `DESERT_TRAP_AT_PX` = 320 world px, so mid-picture about 3 s in (before the copter arrives) and gone by ≈10% | `drawDesertSpeedTrap(…, heroId, since)`, `desertTrapLatch` |
| **new** Jet: fighter goes supersonic with a vapour cone, shock ring and lingering contrail; flies at y 104 in landscape, on the portrait layout's top cloud band (`upperCloud`) in portrait | background (flypast) | speed-3 | Once, over `camX` from 0.45 of the stage for `DESERT_JET_PASS` = 1600 world px (≈45–59%) | `drawDesertJet` |
| **new** Coyote on a ledge: howls every 5 s | background | all | Only on bare near summits (every 3rd tile), half of those by hash, never within 3 tiles of the speed trap. About one per ≈5000 world px (≈17 screens); the hash puts them late in the stage (≈75–83% and at the very end) | `drawDesertCoyote` |
| **new** Dust devils: swaying, winding column with debris, wandering ±30 px | background | all | On **fewer than half** the middle tiles (hash ≤ 0.42), skipped next to the pumpjacks. A devil **fades out** within 110–170 px of the smoke, dishes, turbines or a coyote. Roughly one per ≈4250 world px, fewer after fading | `drawDesertDustDevil`, `desertBusyXs` |
| **new** Tumbleweeds: bouncing, spinning, blown right by the wind | background | all | A slot every `DESERT_WEED_SPACING` 640 near-layer px (≈1140 world px), 3 in 5 filled, drifting at `DESERT_WEED_WIND` 26 px/s. ≈5 a stage | `drawDesertTumbleweed` |
| Pit fill: lava with glow, surface ripple and embers | terrain | speed-2, speed-3 (plus any bag pit) | Scripted pits: s2 0.14 / 0.715 / 0.736; s3 0.38 and the 5-jump crossing at 0.665 | `pitFill.js` `lava` |

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
| Bruiser dog: charges (vx −38) | obstacle (closer) | speed-2, speed-3 | 0 / 1.0 / 1.3 | `ANIMALS.speed` |
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
| **new** Reindeer herd: 5 deer galloping along the far crest, overtaking the run | background | frost-2 | Once, crossing over `FROST_HERD_WINDOW` = 0.78–0.95 of the stage (≈16 s) | `drawFrostReindeer` |
| Aurora curtains: slow drift and breathing opacity | background | all | Always. 2 curtains on frost-1, 3 on frost-2/3, with gain 0.74 / 1 / 1.3 | `drawFrostAurora`, `FROST_AURORA_STAGE_CURTAINS` / `_GAIN` |
| Blizzard: 3 layers of wind-blown streaks plus a haze veil, gusting | weather | all | One storm across the act, one step up per checkpoint (eases in over 4 s). frost-1 is clear until the 1/3 checkpoint, then 0.27 → 0.45; frost-2 runs 0.45 → 1.02; frost-3 runs 1.02 → 1.5 | `drawFrostBlizzard`, `frostBlizzardRung`, `FROST_BLIZZARD_LADDER` |
| Fortress windows: 3 warm windows blink on their own clocks | background | all (fortress shape differs per stage) | A fortress on every other far tile, so one per ≈4250 world px (≈14 screens), each on screen ≈10 screens | `frostWindows`, `frostLandmarkShape` |
| Sleigh flypast: 4 reindeer, blinking nose lamp, sparkle trail, arcing over the finish pole | flyer (flypast) | frost-3 | Once, armed 2.4 s of running before the finish (`FROST_FLYPAST_LEAD`). The flight takes ≈4.9 s | `armFlypast` (`run.js`), `sprites/sleigh.js` `FROST_FLYPAST_*`, `frostFlypastArc` |
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
| Feral dog: charges (vx −68) | obstacle (closer) | all | 2.8 / 2.8 / 2.8 | `ANIMALS.crypt` |
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
| Lightning strike: bolt crawls across the sky, 4 restrikes with flashes; on neon-1 the first strike turns day to night | background | all | On beats 56 and 176 (bars 15 and 45) of the song, and again on every song loop; each lasts 2.4 s (`NEON_STRIKE_SECONDS`). Tied to the song, not to progress | `neonMoods.js` `NEON_STRIKE_BEATS`, `neonTurnStep`, `drawNeonBolt`; `run.js` `updateNeonSky` |
| Warning flickers: 2 pale flashes | background | all | One beat before each strike | `neonPreFlicker` |
| Aurora: 3 curtains ripple and breathe | background | all | neon-1 fades in from `NEON_AURORA_AT` 0.35 over 0.05; neon-2/3 have it from the start | `neonAuroraStrength`, `neonAurora` |
| Starfield: 96 stars pulse and drift slightly | background | all (hidden in golden) | Always at night | `neonStarfield` |
| Comets | background | all | 3 a stage, at `NEON_COMET_AT` 0.19 / 0.52 / 0.81. Each lasts ≈1000 world px (≈4 s) | `neonComet` |
| Moon: tube flicker, halo breathes; waxes across the act; eclipse on neon-3 | background | all (night) | Always at night. Phase from `neonMoonPhase`; eclipse bites half a radius (`NEON_ECLIPSE_DEEPEST`) | `neonMoon`, `neonMoonEclipse` |
| City arrival: far mass, then mid wires, then near wires fade in | background | neon-1 | `NEON_CITY_ARRIVALS`: 0.07–0.15, 0.12–0.20, 0.19–0.27 | `neonCityReveal` |
| Window lights: staggered on/off (11.4 s cycles) | background | all | Always, on the mid and near tower rows | `neonWireRow` |
| Mast aviation lamps blink red | background | all | 2.9 s cycle, on the tallest towers | `neonWireRow` |
| Blade signs (kana), front and back rows | background, *static* (scroll only; they do not flicker) | all | Front: one every ≈4.6 screens. Back: one every ≈9.2 screens. neon-1 shows them only once their row has arrived | `neonBladeSigns`, `kana.js` |
| **new** Tokyo Tower: red antenna lamp blinks (0.5 s in every 1.6 s); the lattice is static | background | neon-2, neon-3 | Once, centred at `NEON_TOWER_AT` 0.5 (parallax 0.05). Visible ≈32–68% of the stage | `NEON_TOWER_AT`, `NEON_TOWER_FACTOR` |
| Road speed streaks (day ink on neon-1 before the strike is new) | terrain | all | Always | neon road apron |
| Bullet trains: fly in as a ghost, land, doors open; take off after the hero passes; LED station board scrolls (**new**) | set piece (rideable) | neon-1 (0.10 / 0.30 / 0.55 / 0.80 / 0.967), neon-2 (0.46 / 0.94) | 5 on neon-1, 2 on neon-2, none on neon-3. The flight starts 1200 px ahead (`TRAIN_FLIGHT_LEAD`) | `terrain.js` `trainArrival`, `TRAIN_*`; `stage-layouts.js` routes |
| Train flypast: a train that is only flying over, in day livery | flyer (flypast) | neon-1 | The 0.10 train, before the song turns | `terrain.js` `trainFlypast`, `drawNeonFlypast` |

### Obstacles and flyers

| Item | Kind | Levels | How often (L1 / L2 / L3) | Code |
| --- | --- | --- | --- | --- |
| Drone, including the stacks of 2 and 3 (**new**) and every buzzbird (swapped to drones, **new**) | flyer | all | 39.5 / 48.5 / 49.0 drones | `drone` with `column`, `swaps.buzzbird` |
| Shooter drone: fires | flyer | all | 2.8 / 7.0 / 7.5 | `shooterDrone` |
| Target: bobbing star | flyer | all | 13.0 / 9.3 / 9.5 | `target` |
| **new** Road-works panda / frog / monkey barriers, swapped in for the cactus | obstacle, *static* | all | panda 6.5 / 3.0 / 3.5; frog 1.0 / 1.3 / 0.8; monkey 1.5 / 0.8 / 0.5 | `swaps.cactus` (cabinets.js) |
| Fire barrel: flames | obstacle | all | 2.5 / 5.5 / 5.5 | `fireBarrel` |
| Barrel: rolls | obstacle | neon-2, neon-3 | 0 / 3.8 / 3.8 | `barrel` |
| Bruiser dog: charges | obstacle (closer) | neon-2, neon-3 | 0 / 2.3 / 2.3 | `ANIMALS.neon` |
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
