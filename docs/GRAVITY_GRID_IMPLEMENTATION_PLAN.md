# Gravity Grid: three-level implementation handoff

> Levels 2 and 3 below are superseded by [the low-gravity and maintenance rebuild](GRAVITY_LEVELS_2_3.md). The release and beam-selector objectives have been removed.

Date: 2026-10-12  
Status: gameplay and campaign integration implemented; playtest corrections applied; rendered/device acceptance remains pending  
Implementation owner: Codex; original handoff prepared for Luna Max

The campaign now launches through the production Gravity Grid controller. Playtest corrections keep both running rails flat, restore a spike field behind every transfer gate, and simplify the level-two and level-three instructions. Exterior and background art belongs to the parallel art work; final served-frame and device review has not been completed.

## 1. Goal and non-negotiable constraints

Replace the three Cardboard Kingdom campaign levels with three space/gravity levels. Preserve their position in Act III and their progression economy. Give each level a different objective and a different recurring player decision.

| Campaign slot | Display title | Primary objective | Recurring decision |
| --- | --- | --- | --- |
| cardboard-1 | WRONG SIDE UP | Reach the airlock | Transfer now or after the next obstacle? |
| cardboard-2 | PLEASE REMAIN ATTACHED | Disconnect three machine assemblies | Where can I safely leave the assembly? |
| cardboard-3 | RETURN TO SENDER | Complete a beam-return circuit and destroy the cannon | Which surface selects the useful beam path? |

The user is developing art direction in another chat. This task owns gameplay and integration, not the final visual style. Use functional placeholders and existing assets until that work is available. Do not replace or overwrite concurrent art changes.

Rules:

- Automatic forward running throughout live gameplay. No stopping, reversing, free flight, steering, aiming, interactions menu, or fourth button.
- Jump, duck, and existing forward shoot/ability input only. Do not change hero weapon kits or auto-aim.
- Every primary objective and bonus challenge is achievable without firing. Shooting may remove ordinary optional hazards, but cannot activate or alter mission machinery.
- No carry/fuse, NPC escort, villain pursuit, collection quota, rhythm judgement, or boss-health-bar objective.
- Only level 1 is a finish-line mission. Levels 2 and 3 succeed because the world has changed; the shared finishing animation may still deliver normal results.
- Preserve the gravity demo's rule: an arrow establishes a destination surface; walking past it does not transfer; a jump activates that direction. An airborne arrival can activate the zone using the existing behavior.
- Never require ducking or firing during a gravity transfer. The current controller suppresses those inputs during transfer.
- No acceleration for spectacle and no rotating camera. Ducking changes clearance, not speed or arrival time.

## 2. Verified starting points and implementation boundaries

Implementation record: existing Gravity code and the parallel art work were preserved; the production campaign now uses these modules.

- `src/game/gravity/state.js`, `player.js`, `model.js`, `encounters.js`: production controller, shared coordinate contract, fixed corridor constants, stage validation and reversible encounter state.
- `src/data/gravity-stages.js`: immutable gate, spike/hazard, assembly and chamber records. Duration and checkpoints remain in the generated layout.
- `src/data/cabinets.js`, `src/data/stages.js`: preserved cabinet/stage save IDs and progression; gravity identity, missions and power bans now replace the cardboard content.
- `src/data/stage-layouts.js`: generated layout source of truth; duration, checkpoints and optional appliance placements were updated through the targeted writer and validator.
- `src/game/run.js`, `src/game/layout.js`: shared results/checkpoints plus exact fixed-speed distance for beat and gravity stages.
- `src/main.js`, `src/dev/menus.js`: campaign, retries and development stage selector use the same production controller. `?goto=gravity&level=1|2|3` selects a stage.
- `src/game/hud.js`, `src/data/briefings.js`: mission labels and stage copy describe the new objectives.
- `tests/gravity-level.js`: full-cast level-one run, simulated full routes for levels two and three, encounter counters, first-route persistence, checkpoint and rewind coverage.

Production module arrangement:

- `src/game/gravity/state.js`: production GravityRunState; accepts the normal campaign options and resolves data for the selected legacy stage ID.
- `src/game/gravity/player.js`: production GravityPlayer; retain the existing working coordinate contract.
- `src/game/gravity/encounters.js`: pure encounter state transitions and collision/trigger helpers.
- `src/data/gravity-stages.js`: authored geometry, encounter definitions, safety windows and support metadata for all three levels.
- Keep rendering behind a small adapter taking current encounter state. Initially delegate to the existing gravity scene and add placeholder machinery. The art chat can replace that adapter without changing gameplay.
- Keep `?goto=gravity` as a development alias for level 1. The `stage` and `level` parameters select levels 2/3; invalid values select level 1. The campaign and dev menu use the production controller.

Do not build a general-purpose mission editor or refactor unrelated cabinets. Use a small campaign-run factory to select GravityRunState for `cabinet.mechanic === 'gravity'`; reuse it anywhere campaign stages are launched or simulated. Ordinary RunState remains the default for other mechanics and overtime.

## 3. Shared movement, authoring and readability contract

### Coordinates and timing

Use lane 0 = floor and lane 1 = ceiling, retaining the current world-coordinate convention. Corridor height is initially 137 and gravity scale initially 0.65. Cap landscape camera zoom at 1.25 so the ceiling rail stays clear of the top HUD; portrait keeps its portrait-fit zoom. Use the demo cabinet speed bonus of -0.25, giving 120 world units/second at normal assist speed. Keep inherited assist-speed and maxspeed-corruption adjustments; do not apply the ordinary speed ramp or hero-specific horizontal speed differences.

Author positions in nominal travel seconds. At run creation resolve `x = stageOriginX + timeSec * run.baseSpeed()`. Use that single conversion for gates, encounters, hazards, checkpoints and finish. Stage durations below mean actual travel time, excluding intro/death/finish animations. For gravity only, resolve total distance without the ordinary 1.05 multiplier. Keep layout/editor forecasts consistent with that exception.

Initial durations: level 1 = 84 seconds; level 2 = 96 seconds; level 3 = 100 seconds. These are initial authoring targets, not permission to fill dead time with random obstacles. After controller validation, timing adjustments of up to 10% are permitted to satisfy the safety constraints; record final values and why they changed.

Required mandatory-input windows must accept at least 0.8 seconds of launch variation. Pressure selectors are at least 0.8 seconds of travel wide. Allow at least 1.5 seconds between landing and the next mandatory input. No required input during the entry animation or within 1.5 seconds of checkpoint restoration.

Do not guess transfer duration: measure the slowest relevant full-cast transfer with real controller tests, including supported modifiers. Let `T` be that maximum plus 0.35 seconds. Space transfer-dependent geometry using T, not a hard-coded assumed jump arc. A required landing region must accommodate the full tested launch window.

### Surface and gate behavior

Both running rails are flat, continuous and level. Do not add lane slopes, pits, missing-floor sections or surface-break records.

Keep directional gates persistent until the next gate, as today. Do not change them into frame-perfect toggle rings. Walking past an arrow does not transfer; a jump during its active direction crosses to the destination rail. Each gate has a pop-spike field on the rail left behind, 1.25 seconds after the gate. Jumping that field activates the persistent gate direction, so the hazard teaches and motivates the transfer while the rail itself remains level.

For level-three beam chambers, line the correct rail up with the preceding gate and selector interval. The player reads a direct `JUMP TO CEILING` or `JUMP TO FLOOR` cue and uses the existing jump control; no route menu, aiming or extra control is added. Keep the dangerous beam lane opposite the safe rail named by the cue.

### Powerups, relay and optional rewards

- Ban capSpeed, capLowGrav and capAirJump in these authored stages through the existing stage ban system, including starting bonuses and scripted pickups. Their advertised effects would conflict with fixed-speed and tightly bounded transfer geometry.
- Retain rewind, shields, magnet and other compatible powers. Invulnerability may absorb ordinary damage but cannot complete machinery objectives, choose a receiver, or turn a missing rail into ground.
- Preserve hero changes, normal appliance rewards and incidental coins. Park relay portals, capsules and appliances in explicit quiet spans on a supported surface, never inside selectors, release zones or beam telegraphs.
- Each level has one appliance in a safe post-encounter reward span. Appliance collection is optional and unrelated to the primary objective.
- Start with deterministic authored hazards. Do not inject random bags into puzzle or transfer windows. Optional enemy dressing belongs only in marked connector spans.

### On-screen teaching

Use world-space symbols and short local text. Show destination arrows, actual safe surfaces and machine state before commitment. Color must not be the only distinction: use shape, line pattern and motion state as well.

On portrait, do not shrink a room-wide puzzle until it is illegible. A compact local circuit diagram may preview the reflector and both receivers; draw actual beam geometry when it enters view. The diagram must show the same state as the physical encounter, not a separate puzzle UI requiring input.

Before implementation expansion, demonstrate that the earliest required cue provides at least 1.5 seconds of visible warning on the narrowest supported portrait viewport at the fastest supported speed. If it does not, move the cue earlier or simplify the encounter; do not silently zoom out or accelerate the player.

## 4. Level 1: WRONG SIDE UP

Mission text: REACH THE AIRLOCK. Bonus: TAKE NO DAMAGE.

### Sequence

| Nominal time | Section | Authored gameplay |
| --- | --- | --- |
| 0–18 | Observation deck | Teach the persistent arrows with floor/ceiling gates and spike fields on the rail left behind. Mix in one crate and a low laser. |
| 18–42 | Outer hull | Transfer around the oxygen rack and cargo, then return through the service corridor. |
| 42–68 | Dish framework | Alternate rails around crate, rack and laser hazards; each gate leaves a spike field behind. |
| 68–84 | Return spine and airlock | Take the final two gates, clear the last cargo and finish at the airlock. |

The level has ten authored transfers. Checkpoints are at 12, 28, 44, 60 and 76 seconds, all on clear approach spans. Every transfer is followed by a spike field on the abandoned rail before the next gate.

Scenery may show observation windows, exterior hull and a dish framework. Those are location requirements, not an art-style mandate. The gameplay camera never rotates with the dish.

## 5. Level 2: PLEASE REMAIN ATTACHED

Mission type: `separate`, n = 3. Text: DISCONNECT THE THREE ASSEMBLIES. HUD label: ASSEMBLIES.

Bonus type: `cleanSeparation`, n = 3. Text: RELEASE ALL THREE WITHOUT RETRYING AN ASSEMBLY.

### What physically happens

Each assembly is a removable machine module with a housing that blocks the onward passage. At its marked gate, one jump to the opposite rail releases the module when the player lands. The housing disappears with it, opening the passage ahead. There is no separate clamp-arming action: one clear jump is the whole interaction.

No free-floating debris collides with the player. Detached geometry is removed from collision atomically. Render its departure from stored animation state.

### Per-assembly state machine

`idle -> committed -> detached -> cleared`

- `idle`: the module is attached and its housing blocks the passage. Show the one-step jump instruction during the marked departure window.
- `committed`: a transfer starts from the assembly's lane while the player's world position lies inside its departure band. The gate's left marker is included in that band so the earliest legal jump counts.
- `detached`: player lands on the permanent opposite rail. Remove assembly collision, start departure animation, open its associated obstruction, and credit this unique assembly once.
- `cleared`: player passes the opened passage. No additional mission credit.
- Failure: the player passes the departure deadline without the marked transfer, misses the opposite-rail landing, or dies during the encounter. Use normal death/recovery with a short explanation. Do not continue to a distant locked finish.

If committed but still airborne at the nominal deadline, do not fail merely because the deadline passed. The validated landing envelope owns that trajectory; collision or exiting its valid bounds can still fail it.

### Encounter sequence

| Time | Content |
| --- | --- |
| 0–18 | Reintroduce the gravity arrows and preview the first module. |
| 18–27 | Cargo cradle: jump UP at 18.5 to free it; spike field follows on the floor, and the floor housing clears after landing on the ceiling. |
| 27–47 | Connector run toward the processing drum; duck under its low service laser. |
| 47–56 | Processing drum: jump DOWN at 47.3; the ceiling spike field follows, then the housing clears after landing on the floor. |
| 56–78 | Connector run toward the reactor jacket; duck under its low service laser. |
| 78–96 | Reactor jacket: jump UP at 78.3; the floor spike field follows, then the housing clears after landing on the ceiling. Appliance reward at approximately 91 seconds and normal finish/results flow. |

Encounter checkpoints are at 12, 40.5 and 71.5 seconds. Departure windows are 18.25–20.6, 47.05–49.4 and 78.05–80.4 seconds. The panel shows one explicit jump instruction at each module; there is no clamp-arming step.

Opening or closing an unrelated enemy hitbox cannot arm or detach machinery. The three assemblies have stable authored IDs; repeated callbacks, rewind and restored entities must not double-credit them.

The bonus is per encounter. A death after its approach checkpoint and before its `cleared` state permanently disqualifies that assembly for the current attempt, including after checkpoint restoration or rewind. Other assemblies can still earn their clean credit. Full stage retry resets this record. Do not fail this bonus for a later death in an unrelated connector.

## 6. Level 3: RETURN TO SENDER

Mission type: `returnBeam`, n = 3. Text: TURN THE CANNON AGAINST ITSELF. HUD label: CIRCUIT.

Bonus type: `firstRoute`, n = 3. Text: CHOOSE EVERY CORRECT ROUTE FIRST TIME.

### Selector and beam contract

Each chamber presents one explicit safe-rail instruction before the selector: jump to the ceiling or jump to the floor. The gate, selector lane and beam danger lane agree with that instruction. The player follows the cue with the normal jump control; no diagram puzzle or separate route-selection input is required.

The first grounded overlap with a selector strip latches the current rail. The wrong rail is visibly dim; the correct rail is outlined, and the instruction card remains legible through the decision. An airborne pass touching neither strip is not an answer and fails locally when the selection window closes. There is no second-choice mechanic.

State machine: `preview -> selected -> telegraph -> firing -> resolved`.

- The instruction card previews the safe rail; the in-world selector highlights the same lane. Show the active beam segment at firing.
- Close the selection region and begin the beam telegraph after the choice is recorded. The danger lane is opposite the correct lane, so the instruction identifies the safe surface.
- At firing, the correct route activates its receiver. A wrong rail causes local objective failure and recovery; do not disguise this as a sudden unrelated hit.
- The player stays on the selected safe rail through firing. Receiver activation credits the encounter and opens its linked obstruction.
- Each fire pulse lasts 0.6 seconds in simulation time. Telegraph for at least 1.5 seconds. Pause, death and rewind stop/restore these timers; never use wall-clock timers.
- Beam collision uses explicit authored line segments with thickness, clipped to the visible playable corridor. The visual beam and collision segments share the same resolved data.
- Shots, melee abilities, shields and auto-aim cannot change the reflector. Shields can absorb beam damage under ordinary damage rules but cannot make a wrong circuit succeed.

### Three chambers

| Time | Chamber | Correct choice and outcome |
| --- | --- | --- |
| 0–17.4 | Approach | Teach gravity gates and preview the first direct jump cue. |
| 17.4–30.9 | Open the shutter | Jump UP to the ceiling selector. The safe ceiling rail lets the beam open the shutter and remove its floor seal. |
| 30.9–44.4 | Recovery and second approach | Travel on the ceiling to the next direct cue. |
| 44.4–58.1 | Cross the discharge | Jump DOWN to the floor selector. Stay on the safe floor rail through firing to open the connector. |
| 58.1–81.4 | Recovery and final approach | Travel on the floor to the final jump cue. |
| 81.4–94.6 | Complete the return | Jump UP to the ceiling selector and stay there through firing. The receiver destroys the cannon and removes its body obstruction. |
| 94.6–100 | Resolution | Clear finish/result span; no post-victory hazard. |

Use these initial local timings, adjusted together if measured T requires more clearance:

| Chamber | Preview begins | Checkpoint | Selector interval | Safe rail | Fire begins | Resolution |
| --- | --- | --- | --- | --- | --- | --- |
| Shutter | 17.4 | 21.2 | 22.4–26 | Ceiling | 30.3 | 30.9 |
| Discharge | 44.4 | 48.2 | 49.4–53 | Floor | 57.5 | 58.1 |
| Return | 81.4 | 85.9 | 86.4–90 | Ceiling | 94 | 94.6 |

All values are nominal travel seconds. Resolve the selector approach gate no later than `selectorStart - T - 0.8`; keep its checkpoint before the required launch. Fire positions advance with world travel; once activated, pulse duration uses simulation dt. Never fire solely because a wall clock has elapsed while the player is paused or dead.

Add quiet connector checkpoints if ordinary hazards require them. Failure must replay at most ten seconds of approach. The section budgets include traversal, preview and recovery, not twenty seconds of waiting for a laser. Keep the useful receiver/dump diagram visible from preview through selection even if the physical reflector is initially off-screen.

The shutter beam threatens the floor, the discharge beam threatens the ceiling, and the return beam threatens the floor. Only the authored live segment damages; the instruction and safe rail must agree with the collision lane for the full-cast roster.

A chamber's third mission credit is granted only when the final emitter is actually destroyed, not when its selector is touched. Intermediate credits correspond to receivers activating. Do not permit a finish-line call to fill missing mission count.

For the first-route bonus, record the first closed selection per chamber across checkpoint retries and rewind. Correct on first selection earns that chamber's credit even if a later dodge fails. Wrong or no selection disqualifies it for the attempt. Stage retry resets the record.

## 7. Data, simulation and persistence interfaces

Keep authored data immutable and runtime state separate. Suggested minimum contract (names may follow project conventions; behavior is fixed):

```js
gravityStage = {
  gates: [{ at, lane }],
  hazards: [{ id, at, lane, type }],
  assemblies: [{ id, label, lane, depart: [start, end], landBy, exit, obstruction }],
  chambers: [{ id, label, preview, selector: [start, end], correctLane, fire, resolve,
    opens, dangerLane, finalEmitter }],
};
```

Layout duration, checkpoints, appliance placement and ordinary layout properties remain in the existing layout system. Special encounter data lives in gravity-stages.js. Do not create two competing sources for the same values.

Runtime records store current phase, chosen lane, resolved status, simulation timer, assembly departure progress and counted IDs. Derive collision availability from this state plus authored ownership; do not separately toggle untracked renderer and physics flags.

Use swept crossing/overlap tests between previous and current player positions so a long simulation step cannot skip a strip or fire boundary. Ground contact must be evaluated at the crossing, not inferred from the player's lane number while mid-transfer. Split a step at a relevant boundary if necessary. Process simultaneous boundaries in authored order.

Integrate encounter simulation into the normal update pipeline: after player movement, before relevant collision/mission/finish evaluation, with snapshots recorded after those updates. Do not append objective changes after super.update() has already captured rewind or finished the stage. Introduce narrowly scoped no-op hooks in RunState where needed rather than copying its update loop.

Checkpoint and rewind snapshots must include all reversible encounter state and gravity state. Deep-copy mutable data or use the existing snapshot-reuse conventions; never retain live references in historical frames. Rebuild only entities that should exist at the restored state. Removed assemblies stay removed after later checkpoints; rewind to before release restores them. Collected rewards must not respawn for duplicate payout.

Attempt-history records for the two first-attempt bonuses intentionally live outside reversible snapshots. Keep this exception small and documented. Fresh stage start clears them; local death recovery does not. Their HUD/result state must be recomputed after restore.

Local objective failure uses ordinary death/recovery, marks its failure once, and cannot be prevented by shield/invulnerability. In one-hit mode preserve the game's established full-attempt failure behavior; do not secretly enable checkpoints. Development invulnerability may bypass damage but must not auto-satisfy objectives unless the explicit existing devForceMission option is used.

## 8. Campaign, results and art integration

Keep cabinet ID `cardboard` and stage IDs `cardboard-1/2/3` as legacy storage keys. Change display name to GRAVITY GRID, mechanic to gravity, and stage titles/copy to this document. Preserve cabinet order, unlock threshold, saved plugs, ranks, scores, appliance ownership and completion flags. Existing earned rewards remain earned even though the content has changed.

Replace Cardboard routes, scripted pits, collapse behavior, chase entities and mission descriptions in these three slots. Do not delete reusable Cardboard assets or old music solely because they become unused here. Do not bulk-rename identifiers or migrate saves.

Use the existing gravity music bank, already registered as the gravity track. Ensure music resolution uses content identity rather than accidentally selecting the old Cardboard tune through the preserved cabinet ID. Verify the game's original/8-bit soundtrack and results transition use the matching gravity content. Preserve any intentional user song override. No composition or mix redesign in this task.

Add friendly HUD labels for both new mission types and bonus types in landscape, portrait, briefing and results. Keep mission.count synchronized with the unique completed encounter IDs so existing generic counted-mission presentation works. Success is gated on the actual final machine state, not only a displayed number.

Keep normal three-plug reward structure: primary mission, optional challenge, appliance. Do not add a fourth boss or change progression thresholds. The cannon encounter is level 3's finale, not a new campaign boss registration.

The shared finishing animation can remain, but place it on a clear floor span after mission resolution. No final dog or unrelated boss. The cannon sequence has no damaging post-victory section.

Hub/cabinet artwork, sprites and backgrounds should use the art chat's output when available. Until then, use a neutral functional space presentation. For Surge's style cycle, replace its Cardboard-themed presentation with the space presentation when the new style is integrated, but do not inject two-surface mechanics or these objectives into Surge. Keep its ordinary floor-only gameplay readable. This is a presentation compatibility task, not a Surge redesign.

Render adapter inputs should expose: flat support rails, gate direction, spike placement, encounter phase, the direct jump instruction, selected/safe lane, active beam lane, assembly departure progress and final-emitter state. Render code must not advance timers, award objectives or change collisions. Final palette, materials, character treatment, machinery silhouettes and decorative animation belong to the other chat.

## 9. Implementation status and handoff for Luna Max

The implementation is complete through campaign integration and headless simulation. The production campaign and development stage selector share `GravityRunState`; all three objectives, flat continuous rails, gate-linked spikes, checkpoints, retry rules and authored stage timings are in place. Level two uses one jump per module; level three gives the safe rail directly. The old Cardboard save IDs remain intact. Space-look rendering is wired through `SPACE_LOOKS` as an optional adapter.

Verified in this change: `node tests/gravity-level.js` simulates all three stages, every hero on level 1, and levels 2–3 across the full hero roster without shooting. It also checks separation and beam outcomes, mission bonuses, persistence, gravity movement and ceiling collision. `node tests/layout-parity.js` passes after recapturing only the intentionally replaced `cardboard-2` layout ledger. `node tests/surge-cycle.js` and `npm run build` pass.

Remaining acceptance work for Luna Max / the project owner:

1. Run the built game in a served browser and inspect gameplay in portrait and landscape: floor and ceiling runs, transfers, each release, each selector preview and firing pulse, failure, checkpoint restore and completion. The task container refused the local server bind and the existing browser session was occupied, so rendered-frame review remains pending; do not treat the build or headless tests as visual acceptance.
2. Review the working art direction from the parallel art chat in those gameplay moments. Adjust render adapter and stage cues only where real frames show a readability problem; keep mechanics, hitboxes and authored timing owned by the production controller/data.
3. Verify normal campaign unlock, retry, results, save continuity, keyboard/touch and reduced-motion behavior. Listen to the selected stage music and completion handoff; those checks have not been claimed here.
4. Expand runtime trajectory coverage to the supported assist extremes, one-hit mode and any hero/mod combinations not exercised by the current roster simulation. Preserve the focused test and build gates while resolving any issues found.

Keep section 10 as the acceptance checklist. Do not call the cabinet visually complete until real served gameplay has been inspected and the other chat's art has been reviewed in context.

## 10. Test and acceptance matrix

### Controller and fairness tests

- Run each level through the actual runtime with every hero, shooting disabled. Assert completion, correct mission state and no hidden automatic restarts on the intended clean route.
- Test early/late edges of every accepted launch window and correct/incorrect lane choices. Assert the minimum 0.8-second usable window, not a single perfect bot timing.
- Cover held jump, pre-zone airborne arrival, ceiling duck, ordinary jump outside release band, unarmed release attempt, and a long frame crossing an entire trigger boundary.
- Test normal assist, minimum/maximum supported assist settings, maxspeed corruption, one-hit mode and supported hero/mod combinations affecting jump/size. Use runtime-measured trajectories; no teleporting to solve encounters in the primary completion tests.
- Explicitly test forbidden powerups cannot arrive from starting bonuses, random drops or authored rewards.

### Machinery and restoration tests

- Every assembly is armed/committed/detached only once; its blocking part and owned hazards disappear together. Early non-qualifying jumps do not detach it.
- Both reflector options work as drawn. No contact, wrong choice and correct choice have distinct expected outcomes. Firing while ducking or midair never selects machinery.
- Rewind across arming, commitment, landing, detachment, selection, lock, beam firing and final destruction. Compare objective state, geometry and timers before/after replay.
- Die before and after each encounter checkpoint. Verify local retries, correct ceiling footing, no duplicated coins/appliances, no resurrected detached hazards and no stale beam damage.
- Pause during telegraph/departure; verify nothing advances. Test exit/retry and fresh attempt reset.
- Test attempt-history bonuses separately from reversible mission state. Rewind cannot erase a recorded wrong first choice or assembly retry.
- Finish cannot succeed with incomplete assembly/circuit state, except explicit devForceMission tooling. Final destruction credits the circuit exactly once.

### Integration and presentation

- Load an existing save containing all Cardboard plugs/ranks/scores and a partially completed save. Verify unchanged unlocks/rewards and correct new cabinet labels.
- Launch from hub, dev menu, gravity URL alias and results retry. Confirm the same production class, correct stage index and expected music.
- Verify both HUD layouts, mission/challenge result awards, appliance collection and normal completion transition.
- Inspect real served frames during floor running, ceiling running, transfer, release, selector preview, beam telegraph, firing, failure and restored play. Verify support/collision matches drawing.
- Test keyboard and touch. Inspect narrow portrait, standard landscape and reduced-motion settings. Gameplay information must survive reduced decorative motion.
- Listen to stage music and results handoff under both soundtrack settings; report whether this was actually done.

Extend the existing gravity controller suite and add focused encounter and campaign integration suites to tests/run-all.js. Run those first, then relevant layout/save/progression/power-ban tests, then npm test and npm run build. Update only intentional changed-stage baseline expectations; do not regenerate unrelated baselines to hide failures. Record unrelated pre-existing failures separately with evidence.

Rebuild/restart the served app when required by builder/template changes and inspect that actual running build. A successful build or a mocked draw call is not visual acceptance.

### Definition of done

All three campaign slots are playable through normal progression; all mandatory gameplay works without shooting; each objective visibly changes play as described; checkpoints/rewind/saves/results are correct; focused tests and build pass; rendered portrait/landscape gameplay has been inspected. Final art acceptance is a separate explicit item until the other chat's assets are integrated. Peter remains the final judge of whether the three levels feel different and enjoyable.
