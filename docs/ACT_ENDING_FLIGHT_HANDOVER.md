# Act-ending flight encounters — handover

Updated: 1 November 2026. Workspace: `/Users/Peter/mashenstein`.

## Start here

All three acts now end in Eggshell's flight: **3-3** (rhythm), **6-3** (neon) and **9-3** (surge, with the balloon, the false defeat and BACKUP POWER). The separate boss fights are out of the campaign. The 3-3 transition was rebuilt on 1 Nov after Peter played the first build ("the fight is ok, the transition needs to be much smoother and better animated"): the staged 7-second boarding scene is gone, and the run itself carries on past the tape into the flight. None of this has been played by Peter yet; it needs a phone playtest of all three endings.

Read [ACT_ENDING_FLIGHT_PLAN.md](ACT_ENDING_FLIGHT_PLAN.md) — its 1 Nov section is the current design; the rest is the original plan and still holds where it doesn't contradict that section.

## Decisions to preserve

- Boss fights are the last stage of each act carried on past its tape, not separate levels. The tape is the fight's checkpoint; nothing is paid until the fight is won; replays of the stage include the fight. EXIT keeps the saved fight; RESTART replays the stage and drops it.
- The run never stops at an act's tape: the hero keeps his column, pace and size; the tub comes to him; he boards with his own jump, on the beat; the camera leaves the screen sideways past the cabinet's own edge, which occludes each actor while his picture swaps to the flight's (door-walk rule). Don't reintroduce a cut or a staged scene.
- Controls are the runner's: JUMP rises, SLIDE descends, the tub fires by itself; the run's discs, pause card and keys. No horizontal steering. Escape pauses, never leaves.
- Portrait spacing hero 14% / Eggshell 86% (landscape 22/79) — approved 28 Oct.
- Rulings of 1 Nov (memory: act-ending-flight-decisions.md): Dust Devil retired (Act I relic is the SIDE PANEL); bonks never required to board; UNPLUGGED is one hit in flight and one hit ends the attempt; 9-3 is the balloon, then the machine; the 6-3 kaiju keeps its beat before the tape.
- BACKUP POWER and the false defeat are 9-3 only.

## What exists

| File | What it is |
| --- | --- |
| `src/game/flight/acts.js` | The one table naming act endings: stage → cabinet, act, HUD title, bank texts, bank number, vehicle, finale. |
| `src/game/flight/model.js` | Pure 120 Hz sim. Per-act patterns (single / pair / fan / column), act III phases `first → midpoint → second → fall → final → won`, checkpoints 0/1/2, BACKUP POWER cycle (charge → beam → vent, surge → vent; only the vented core takes damage), UNPLUGGED hull 1. |
| `src/game/flight/scene.js` | Painters shared by the run and the flight: passage with power-bank lamps, hero tub, flight hero/Eggshell, cabinet edge band, balloon (+ patches, burst, basket), BACKUP POWER machine, run-scale balloon. |
| `src/game/flight/state.js` | FlightPrototypeState (`?goto=flight`): discs, pause/down cards, gamepad, HUD, arrival from the run, act III drawing. |
| `src/game/flight/campaign.js` | CampaignFlightState: checkpoint callbacks, resume warm-up (song tables, tempo, prefill, worklets), victory/escape per act, UNPLUGGED fail. |
| `src/game/flight/checkpoint.js` | `campaign.pendingFlights[stageId]` (legacy `pendingFlight` still read); begin / midpoint(+2) / progress / finish / abandon. |
| `src/game/run.js` | `flightExitArmed`, `armFlightExit`, `updateFlightExit` (approach → tape → board → slide → handover), `flightTape`, `planFlightBoarding`, `stepFlightHero`, `stepCopterEscape`, `startFlightSlide`, `handFlightOver`, `paintFlightTub`; drawFrame hooks marked "ACT-ENDING FLIGHT"; `runResult` split out of `endRun`. |
| `src/main.js` | `Flow.startActFlight` (EXIT/RESTART/fail/midpoint/complete, finale on the first act III win), `launchStage` wiring, `startBoss` redirect. |
| `src/engine/input.js` | Flight exempt from the landscape actionless-touch release; menu-key flip doesn't re-press held pad buttons; `carryHeld`/`restoreHeld` for the handover. |

Boss retirement: `bossAvailable` is always false (no BOSS row); rhythm and neon removed from `BOSSES`; surge kept only for the dev menu's bot runs; attract has no boss demos; Act I trophy relic is the SIDE PANEL; the rhythm/neon/surge trophies are earned by the flights (`bossesDown`).

## How to try it

Dev server (watch build) on **8001**; phones: `http://MBP14.local:8001`, and `https://MBP14.local:8002` to listen.

- `?goto=stage&stage=3-3&finish=4&invuln&seed=7` — and `6-3`, `9-3`. A saved fight for that stage resumes instead (use a fresh browser profile to see the transition again).
- `?goto=flight&hero=lorenzo&seed=7` — the bare fight (act I).

## Validation

- `node tests/flight-prototype.js` — bounds, input, fixed step, phase latch, restore, resize, completion in both layouts; act III through every phase; a death in BACKUP POWER restores BACKUP POWER.
- `node tests/flight-checkpoint.js` — durable midpoint, deferred rewards, legacy record, one-time completion.
- `node tests/flight-exit.js` — the handover through the real RunState in portrait and landscape: one checkpoint, never ended, phases in order, nothing reaches him, Eggshell escaping not flying off, his column/height never jump, road speed constant through the slide, the tub never runs into him, the hop on a beat line for early/mid/late tapes, demos keep the pole.
- Browser captures (silent): `work/local/_flight-transition-capture.mjs`, `_flight-transition-video.mjs`, `_flight-panels-capture.mjs`, `_flight-act3-capture.mjs` — all three endings in both orientations, pause/down cards, escape, results, and the finale after 9-3.

Not yet verified: real phone touch and feel, human difficulty (every pilot in the tests is invulnerable), listening, sustained performance on a phone, all-hero seating.

## Open questions for Peter

- 9-3's bonus is still TAKE NO DAMAGE (the plan had a bonk setup; not made).
- Act II/III halfway lines are placeholders (`THAT COPTER WAS A RENTAL.`, `FINE. THE COILS.`).
- The finale plays after the first 9-3 win without the 48-plug check THE SOCKET applies (the old Surge boss did the same).
- Doc text naming the old Neon/Surge boss fights (GAME_BIBLE, SCRIPT, CAST, README, site) still needs the same treatment the Dust Devil's got.
