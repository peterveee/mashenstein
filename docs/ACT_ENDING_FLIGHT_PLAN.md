# Act-ending flight encounters

Status: all three act endings (3-3, 6-3, 9-3 with BACKUP POWER) implemented for playtest; the separate boss fights are out of the campaign.
Date: 28 October 2026; updated 1 November 2026.

### All three acts, live transition — 1 November 2026

Peter played the 29 Oct build: the fight was "ok", the transition "needs to be much smoother and better animated". The staged boarding scene below is gone. What replaced it, and what was added:

- **The run never stops.** On an act's last stage (src/game/flight/acts.js) the camera does not park at the finish: the hero keeps his column, his pace and his size and runs through the tape, which is the fight's checkpoint (the marker throws as he passes; `CHECKPOINT. AFTER HIM.`). The runner result is written then (RunState.flightTape -> onFlightTape -> campaign.pendingFlights[stageId]); nothing is paid yet.
- **Boarding is his own jump.** The tub waits past the marker and glides in (a Hermite from the road's speed to rest) to arrive under him as he comes down; the hop is his real take-off speed and gravity, on the first beat at least 0.45 s past the tape. He lands, the tub gives under him, and on the next beat it lifts toward where the flight flies him. Eggshell, who no longer flies off at the tape, eases to his flight position.
- **The camera leaves the screen sideways.** The whole screen (backdrop, world, HUD, chatter) slides left, the inside camera giving way so the road keeps its speed; behind it comes the cabinet's own edge (drawCabinetEdge: glass edge, recessed bezel, casing, seam, moulding, in that cabinet's palette) and then the passage. The edge band is opaque and passes over each actor; the moment it covers him, the run's picture of him becomes the flight's (door-walk rule: occlusion does the work). When the passage fills the frame the run hands over (onFlightHandoff) and CampaignFlightState continues the same picture (scroll, speed, clocks), easing to cruise.
- **6-3** keeps the kaiju before the tape; it now travels on with its street when the camera does not park (stylePacks finish.runsOn). Its second half is a slow three-shot fan. One bank is already lit in the passage; its win lights the second.
- **9-3** is the balloon (Peter, 1 Nov: "Ok" to balloon then machine): Eggshell's striped clown balloon arrives at the tape; pellets hit the envelope, which gets patched as his bar drops; halfway deploys coils and a column attack with one gap near him. At zero the balloon pops and he drops out of the frame (the false defeat), then `BACKUP. POWER.` — the lit banks go dark from the right and the machine rises: his tub on a cabinet-armour body with a cooling fan, a cannon level with the core, thrusters and cables. Its own bar (BACKUP POWER) and checkpoint (2). Cycle: a charged beam that warns its band then fills it, or a slow surge column with a gap; after each the armour vents and only the open core takes damage. Its defeat brings all three banks on, then Results and, the first time, the finale.
- **Controls are the run's.** JUMP/SLIDE discs (or keys) climb/drop; PAUSE/Escape/P/Start pause (Escape never leaves); the pause card is the run's (RESUME / EXIT / RESTART); VEHICLE DOWN offers RETRY / EXIT; gamepad works on both cards. EXIT keeps the saved fight; RESTART replays the stage from the runner and drops the saved fight.
- **Rulings (Peter, 1 Nov):** Dust Devil retired as a boss (Act I relic is now the SIDE PANEL); bonks are not required to board; UNPLUGGED is one hit in the flight too (one hit ends the attempt as a failed run); the boss-checkpoint contract stays (retries from checkpoints, nothing pays until the win, replays include the flight).

Open: 9-3 keeps TAKE NO DAMAGE as its bonus (the plan's bonk setup for 9-3 was not made); attack timings, HP and the edge band's look need a phone playtest; act II/III halfway lines are placeholders.

### Integrated 3-3 milestone — 29 October 2026

3-3 now hands off at the finish marker to a seven-second boarding/launch sequence using the LCD background painter and the active hero. A moving opaque bezel hides the switch to the arcade passage. The existing flight gameplay follows, then a power-bank restoration beat and the normal stage results. Eggshell escapes after defeat; Rhythm's boss flag is set by this integrated ending, and its old separate boss menu entry is removed. Legacy Rhythm boss links route through 3-3.

The runner result is held in `campaign.pendingFlight` until victory. The finish-line and halfway checkpoints persist with the original seed and hero. Reopening 3-3 resumes the saved fight directly and skips the briefing/boarding. Mid-fight death restores the current checkpoint without paying rewards; successful completion removes the pending record and persists the boss flag and normal stage rewards together. The runner's remaining-clock bonus is retained at the handoff. Flight damage contributes to the final run's damage total. Replays after a completed encounter start the runner again.

Fast development entry: `http://localhost:8001/?goto=stage&stage=3-3&finish=2&invuln&seed=7`. An existing pending flight takes precedence and resumes it. The standalone `?goto=flight` remains available without campaign completion writes.

Verification: isolated-browser run crossed the tape into flight, persisted halfway, reloaded into the second half at 50% with boarding skipped, then reached Results with Rhythm's boss defeated and no pending record. No browser exceptions. `flight-checkpoint`, `flight-prototype`, `portrait-finish`, and `difficulty-identity` passed; the flight suites are registered in `tests/run-all.js`. Rendered portrait boarding, launch, and restoration frames are under `work/mockups/act-ending-flight/3-3-*.png`. The native transition is an initial staging pass and still needs Peter's motion/feel review; physical-device and listening acceptance remain open. The runner song continues through the first handoff; a resumed encounter starts the same cabinet music through MusicDirector.

### First playable milestone — 28 October 2026

Open the development game at `http://localhost:8001/?goto=flight` (requires the dev server). Optional `&hero=lorenzo` selects an existing hero; `&seed=7` sets the deterministic movement offset.

Implemented in `src/game/flight/`: a fixed-step simulation, continuously scrolling cabinet backs, actual hero/Eggshell artwork, a cyan hero tub, automatic pellets, telegraphed aimed shots, four-hit vehicle health, bounded vertical control, a three-second midpoint vignette, second-half paired shots, and an in-session halfway checkpoint. Hold Up/Space to rise and Down/S to descend, or hold the visible touch buttons. Release to hover, P to pause, Enter or the retry panel to retry, and Escape to leave. The prototype does not complete or unlock campaign stages.

At this first milestone, boarding, bezel transitions, and durable saves were outstanding; these are now implemented by the integrated milestone above. Act II/III patterns, BACKUP POWER, final scenery/art refinement, and bespoke encounter audio remain outstanding. Backgrounds are lightweight native canvas studies; generated concept images are not used as gameplay textures.

Validation: `node tests/flight-prototype.js` covers movement bounds, simultaneous input, frame-rate-independent motion, phase latching, checkpoint restoration, resize safety, and completion through pellet collisions in both layouts. Browser checks exercised keyboard movement, simulated touch holds, midpoint transition, halfway retry, pause, portrait/landscape resize, and rendered screenshots. Real-device feel, listening, and performance acceptance remain open. Screenshots are saved under `work/mockups/act-ending-flight/prototype-{portrait,landscape}.png`.

This document replaces the separate-boss-level design direction in `BOSS_REDESIGN_PLAN.md`. That older document remains historical reference; its proposed mechanics, architecture, line numbers, and bug claims must not be treated as current requirements. Inspect current code before implementation.

## 1. Purpose and scope

End each act with a short aerial pursuit of Eggshell, attached to the last normal stage: 3-3, 6-3, and 9-3. The player bonks him during the runner section, crosses the finish line, boards a flying vehicle, and follows him out of the cabinet into the physical space behind the arcade machines.

The player continues travelling automatically. Jump and duck now control vertical flight; the vehicle fires automatically. Eggshell remains ahead, changing altitude and returning fire. This adds one understandable gameplay variation while retaining the game's forward-moving identity.

The fight is part of its parent stage, not another selectable campaign level. The finish line is a durable encounter checkpoint. Failure in flight never repeats the runner section. Halfway checkpoints and a separate final-transformation checkpoint bound later replay.

Scope includes the three stage endings, a shared flight system, one shared arcade backdrop with progressive power states, midpoint vignettes, the final transformation, input/HUD adaptation, checkpoint integration, and campaign progression changes. No free horizontal flight, aiming controls, equipment system, branching routes, or new playable hero is required.

## 2. Agreed direction and proposed tuning

Agreed: appended encounters; bonk setup; current hero in a small flying tub; up/down-only flight; automatic pellets; Eggshell's substantial health bar; enemy projectiles; normal arcade art behind the cabinets; a bezel-occluded transition out of each game style; midpoint damage vignette and escalation; phase checkpoints; 9-3 apparent defeat followed by BACKUP POWER and a larger arcade-hardware machine; portrait-specific composition.

The durations, health totals, shot rates, movement speeds, damage allowances, exact copy, geometry, and pattern spacing below are prototype targets. They require playtesting, particularly in portrait. The robot in the mockups is an example occupant, not a fixed pilot.

## 3. Current checkout and migration

Verified in `src/data/stages.js` while writing this plan:

| Stage | Current name | Current objective | Required change |
| --- | --- | --- | --- |
| 3-3 / rhythm-3 | BONK TO THE BEAT | Reach the finish; bonus: bonk clown-copter three times | Retain; append flight |
| 6-3 / neon-3 | AIR FARE | Reach the finish; bonus: bonk clown-copter three times | Retain; append flight |
| 9-3 / surge-3 | ONE LAST MASH | Reach the finish; bonus: take no damage | Kept as is for now; flight and final form appended |

(Corrected 1 Nov 2026: since 17 Oct every mission is "reach the finish" and the bonk is the stage's one bonus. Bonks never gate boarding.)

Do not assume completing the bonk count currently leaves Eggshell at the finish. Author his departure so he is visibly present there even when the player completes the objective earlier. Preserve earned objective progress; do not demand an unannounced extra bonk to board.

Current `src/game/boss.js` contains a separate boss encounter built on `RunState`. Reuse suitable art and low-level utilities, but inspect routing, unlocks, saves, and lifecycle before choosing how much code to retain. Existing standalone boss entries must stop appearing in the normal campaign once their replacements are active. Preserve compatibility for old saves and intentional developer entry points.

## 4. Whole encounter sequence

1. Play the normal runner stage with its bonk objective.
2. Validate the objective and cross the finish line. Save runner completion and the flight-entry checkpoint atomically. This is not yet the act-complete/results screen.
3. Keep running briefly as Eggshell escapes toward an opening in the scenery.
4. Automatically jump into a waiting flying tub; the current hero stays visible inside it. Boarding is a staged animation, not a missable precision jump.
5. Launch and pass through the cabinet boundary, with a moving bezel hiding the art-style change.
6. Give a safe flying lead-in and concise control hint.
7. Fight Eggshell from full health to halfway.
8. Play the short damage vignette, commit the halfway checkpoint, then resume with the new attack pattern.
9. At zero health, resolve the encounter. In acts I and II, Eggshell escapes and one more power bank comes online. In act III, begin the apparent defeat and BACKUP POWER transformation instead.
10. Defeat the final form, return stolen power to the arcade, and complete the act/campaign through the existing progression flow.

Results, rewards, unlocks, and final completion must run exactly once. Crossing the runner finish must not prematurely advance the campaign or strand the flight sequence behind a results overlay.

## 5. Leaving the LCD, Neon, and Surge worlds

Keep each cabinet's existing style intact up to its physical boundary. For 3-3, the world remains LCD until the exit; do not gradually morph LCD art into normal cartoon art.

At the right edge of the game world, a torn/broken opening exposes darkness and chunky cables. Eggshell goes through first. After boarding, the hero follows. A substantial screen bezel or cabinet frame sweeps across the camera and briefly covers the scene. Change background/style while occluded, then reveal the normal arcade service space. Rightward motion continues so the sequence reads as one pursuit rather than a menu transition.

The player and vehicle use the appropriate presentation on either side of the occlusion. The exact transformation of their rendering is hidden by the bezel. The reveal should make the cabinet exit visually legible without implying that the physical space is another cabinet game.

Reuse the same transition structure in all three acts. Neon leads into it from its own city environment. Surge may briefly settle to the blank background associated with its opening before exposing the exit: an optional visual callback, not a fourth environment or a mandatory extended cutscene. Verify the current Surge opening before matching it.

On retry, start already seated in the vehicle. Do not replay the runner, boarding, or full transition.

## 6. Shared setting and art direction

Use the normal arcade/hub cartoon style for the physical space behind the machines. The reference image is a composition study; its glossy science-fiction finish should be reduced in production.

Recognisable ingredients: cabinet backs, screws, vent slots, access panels, bundled power cords, plugs, chunky power boxes, and restrained indicator lights. Avoid an anonymous futuristic server room. Suggest cramped surrounding machinery while preserving a generous, uncluttered flight corridor in the centre.

Keep background edges and lighting quieter than vehicles and projectiles. Frame hazards through shape, motion, and contrast, not colour alone. Use a small number of repeating background layers; light-state variants should do most of the work between acts.

| Visit | Power state | Narrative payoff |
| --- | --- | --- |
| After 3-3 | Mostly dark; first bank wakes after victory | First tangible restoration |
| After 6-3 | Earlier bank remains lit; another comes online | Progress accumulates |
| After 9-3 | Main power is nearly restored; Eggshell steals it for his final form | Final victory returns it to the whole arcade |

Do not introduce distant machinery that looks like a collision hazard. Keep active projectiles and damaging effects in a consistent foreground layer. Reuse the established hero and Eggshell art language. Author new raster details at sufficient resolution without changing logical hitboxes to accommodate texture size.

## 7. Flight controls and combat fundamentals

- Automatic forward motion and fixed horizontal separation establish the pursuit. Neither character needs to traverse the screen horizontally during ordinary combat.
- Hold jump to rise; hold duck to descend. Release both to hold altitude after brief, controlled damping. Proposed simultaneous-input rule: neutral vertical movement.
- Clamp the whole vehicle's collision footprint inside the usable flight area. Top and bottom are safe limits, not damaging walls. Do not allow accumulated velocity to cause an unexpected rebound.
- Use modest acceleration and braking for a floating feel, without sluggishness that makes narrow escapes unreliable.
- Fire small pellets straight ahead automatically. No ammunition, firing button, directional aiming, or dependence on the hero's normal weapon kit.
- The tub grants the same combat capability to every current hero. Hero identity remains visual; existing hero abilities must not accidentally grant extra shots, break flight, or become necessary to win.
- Eggshell follows authored altitude movements with readable settles. He must leave opportunities to align and land several hits; do not continuously evade the player's exact height.
- Ordinary phases allow hits on a clearly defined tub target. Reserve the exposed-core vulnerability cycle for the final form so the basic fight stays easy to understand.
- Use distinct shapes for small player pellets and larger incoming attacks. Keep streams sparse enough to read at phone scale.

Prototype ordinary fights around 40–60 seconds of competent play, then tune for pace. This is a target rather than a timer: damage and accuracy determine completion. Choose HP and shot cadence together; a large health bar should communicate sustained pursuit without creating a damage sponge.

Start with a forgiving vehicle damage allowance and brief post-hit invulnerability. Exact hits-to-fail remain a tuning decision. Show its condition clearly using the existing HUD language. Do not silently combine vehicle damage, runner battery drain, and a continuing stage deadline into three competing failure systems. Proposed default: suspend the runner clock in flight and use vehicle damage as the flight failure condition; audit existing mode rules before integration.

## 8. Midpoint vignette and escalation

At the first crossing of 50% health, latch the phase change so multiple pellets cannot retrigger it or skip the second half. Clamp to the midpoint while staging the transition.

Both vehicles continue travelling with the background. Clear incoming hazards, suspend damage and automatic fire, and guide them into readable staging positions. Eggshell's tub sputters and drops slightly; a side panel falls away, exposing dodgy wiring. He looks at the damage and snaps, provisionally: “DO YOU KNOW WHAT THAT COST?”

He thumps the dashboard, a concealed weapon unfolds, and the engine recovers. The entire beat should take about three seconds. It is a short animated performance, not a dialogue screen requiring a button press.

Commit the stable second-half checkpoint once the weapon is deployed. Resume after an obvious wind-up and safe lead-in. Speech stays out of the player's path and appears only while Eggshell is visible. Midpoint dialogue and animation play once per successful phase transition, not on every retry.

| Encounter | First-half pattern | New second-half behaviour |
| --- | --- | --- |
| 3-3 | Slow, clearly warned single shots; generous altitude settles | Two spaced shots aimed at the player's last recorded height; move away, then return to line up pellets |
| 6-3 | Familiar aimed shots with a different movement rhythm | Slow three-shot fan with vertically reachable gaps |
| 9-3 | Combines already taught attacks without simultaneous overload | Exposed coils power up; alternates familiar attacks with a clearly warned electrical burst |

Lock aimed shots to a sampled position before release; do not secretly track during the dodge. For fans, prove that a safe path exists under vertical-only control. Avoid adding a new pattern and a large global speed increase at the same moment.

## 9. 9-3 BACKUP POWER transformation

Only the final act uses a false defeat. At ordinary-form zero health, clear hazards and stop damage. The rotor stalls and the tub drops out of view. Leave a short beat of apparent victory, but do not award results, unlocks, or an interactive victory screen yet.

Eggshell declares “BACKUP. POWER.” A cable snaps taut below the screen. Background lights dim as he draws power from the arcade. He rises in an enlarged machine assembled from arcade hardware, with his original red-striped tub visibly serving as the cockpit.

Visual components:

- Cabinet panels unfold into armour around the original cockpit.
- Large cooling fans replace the small rotor.
- A bright power core sits beneath Eggshell.
- Cables and exposed coils explain the stolen power.
- His hair stands further on end; the same small, furious scientist remains the focal point.

This is an upgrade to his familiar contraption, not an unrelated monster. Keep the effect comic and threatening. The machine must not become so large that it hides projectiles, the safe flight area, or its own core.

Give the final form a separate health bar labelled BACKUP POWER. Proposed duration: roughly 20–30 seconds of successful play. Do not simply refill the original fight to full length.

Final attack cycle:

1. Telegraph a charged horizontal blast with a clear line/band marking the height that will become dangerous. Lock the band early enough to escape.
2. On a later cycle, send a few slow power-surge projectiles with a clear vertical gap. Avoid unavoidable full-height walls.
3. After an attack, the machine overheats. Armour opens and exposes the core; automatic pellets can deal concentrated damage during this opening.
4. Close the armour, reposition predictably, and repeat with enough recovery time to understand the pattern.

Outside an opening, pellets get quiet shield feedback rather than ambiguous apparent hits. During an opening, use clear hit feedback and a satisfying visible health reduction. Ensure the core's height is reachable by the player's firing line in every layout.

At defeat, return the stolen power along the cables and light the cabinet banks. This provides the direct visual payoff for restoring the arcade. Integrate with the existing ending rather than adding a second contradictory restoration sequence.

## 10. Checkpoints, death, and restart contract

| Checkpoint | Saved boss state | Retry presentation |
| --- | --- | --- |
| Runner finish / flight entry | Ordinary form, full health; bonk and runner progress secured | Seated in tub, safe combat lead-in; no boarding replay |
| Midpoint | Ordinary form at 50%; second-half weapon/pattern enabled | Vehicle restored; vignette already completed; clear first telegraph |
| Final transformation, 9-3 only | Final form at full BACKUP POWER health | Final form already assembled; safe lead-in; no false-defeat replay |

On death, reset boss health to the checkpoint value, not the last damaged value. Restore the player's vehicle to its checkpoint health allowance. Clear all projectiles, collision grace timers, transient effects, and partial attacks before restarting. Failed attempts must not accumulate damage against the boss.

Retain the same encounter seed and deterministic pattern setup on retry. Snapshot phase, checkpoint identity, hero, encounter seed/RNG state, relevant progression state, and presentation flags. Restore into a canonical safe phase start rather than a lethal mid-projectile frame. Midpoint and transformation flags must prevent duplicate transitions and rewards.

Implement checkpoint changes atomically. A death, pause, exit, or orientation change during a vignette must not leave an inconsistent half-deployed boss. Default fallback before commitment is the preceding stable checkpoint. If campaign resume supports leaving the game, persist these checkpoints through that same save path.

Audit special modes, including any no-checkpoint/one-hit rules, before shipping. The agreed standard campaign experience always protects completed runner sections; do not inherit conflicting legacy boss semantics accidentally. Any special-mode exception needs an explicit product decision.

## 11. Portrait is the primary layout test

Do not crop the landscape mockups. Compose portrait independently: hero near the left edge, Eggshell near the right, smaller vehicles where necessary, and a clear horizontal projectile corridor. Use the extra vertical room as the main dodge space.

Reserve the top area for boss health and the lower touch-control area for controls. Derive the usable flight rectangle from safe-area insets and actual HUD/control bounds. Clamp vehicle footprints within that rectangle, not the raw canvas bounds. Taunts may sit beneath the health bar only when they do not conceal combat.

The final machine should be tall and compact: vertically arranged fans and armour rather than broad shoulders spanning the phone. Prefer one portrait-safe core design that can also work in landscape; only add layout-specific attachment poses if required. Keep cockpit, weak point, telegraph, and escape route visible simultaneously.

Tune enemy shot speed from available travel distance and required reaction time. A short phone corridor must not deliver faster effective attacks merely because its width is smaller. Telegraph time and shot travel time both contribute to the usable response window. Verify the actual collision geometry and fastest required vertical escape; do not accept a nominal timing number without playtesting.

Normal shots may slow down in portrait to preserve warning time. Horizontal blast telegraphs need enough time to clear the full dangerous band. Patterns must never require moving left/right. Keep the boss core within reachable shot heights, especially at flight limits.

On resize or device rotation, recompute bounds and safely remap/clamp positions. Avoid teleporting live hazards into the player; a short safe re-entry is preferable if geometry changes during combat. Verify physical touch input, simultaneous touches, releases, and pause/resume as well as keyboard input.

## 12. Implementation structure and lifecycle

Inspect current routing and save ownership first. Proposed structure: a dedicated flight encounter controller/state with shared rendering/input helpers, launched as a continuation of the parent run. It should not depend on ground obstacles or runner physics just to reuse a superclass. Retain the parent stage identity and a single completion transaction across the handoff.

Use explicit states such as runner, boarding, cabinet-exit, flight-intro, ordinary-first-half, midpoint, ordinary-second-half, false-defeat, transformation, backup-power, defeat, and complete. Only the last encounter uses the false-defeat/transformation branch. State transitions own one-time effects and checkpoint writes.

Separate shared flight movement, damage, projectiles, checkpoints, and HUD from act-specific pattern data. Keep attacks deterministic and bounded. Clear stale callbacks/listeners and stop encounter effects on retry, exit, and state disposal. Avoid repeated music-engine creation or duplicated audio playback during handoffs.

Reuse Eggshell's existing copter art where suitable and extend its damaged/deployed poses. Add a hero tub that seats the active hero without altering the playable roster. Use small authored animation poses rather than a general transformation framework.

Keep rendering CPU-safe: cached/repeating background layers, bounded pooled projectiles/effects where appropriate, no per-frame sprite rasterisation, no unbounded particles, and no new expensive full-screen filters. Do not claim performance acceptance from code inspection alone.

## 13. Audio, accessibility, and presentation

Keep the runner track's authored tempo intact. Choose a deliberate musical handoff into the encounter; the exact shared cue or act-specific arrangement is an open audio decision. A small accent can mark halfway; a brief pause/stall followed by a stronger entrance can sell BACKUP POWER. Avoid repeatedly restarting music on every state boundary.

Projectile/impact sounds should remain sparse and controlled despite automatic firing. Audit voice/effect cleanup and concurrent playback limits. Listening is required for acceptance.

Respect reduced motion: limit shake, sudden zoom, and rapid flashing; preserve telegraphs with stable shapes and contrast. Avoid requiring speech to understand a new attack. No action is required while a vignette takes control. Tutorials should be short and repeatable on demand without replaying the whole transition.

## 14. Delivery sequence

1. Audit current stages, boss routing, completion, save/retry, input, HUD, art, and audio lifecycle. Record existing unrelated changes before editing.
2. Build an isolated portrait-first flight prototype with the current hero, Eggshell, vertical controls, automatic pellets, one aimed attack, bounded flight, and health bars.
3. Validate phone spacing and reaction time, then add landscape layout. Do not finalise large-machine art before these bounds are proven.
4. Implement stable entry/midpoint checkpoints and deterministic retries, then the midpoint vignette and 3-3 escalation.
5. Build the shared arcade backdrop and LCD/bezel transition; connect 3-3 end-to-end without the old separate boss routing.
6. Add 6-3 fan behaviour and second power state using the shared system.
7. Replace 9-3's objective, add its ordinary encounter, transformation, final attack/recovery loop, checkpoint, and restoration payoff.
8. Migrate progression/save compatibility and developer entry points; remove obsolete campaign links after their replacements are verified.
9. Complete physical-input, orientation, visual, performance, audio, and campaign regression review.

The first reviewable milestone is a playable portrait fight, not a polished landscape animation. Continue only after basic control, readability, and dodging feel credible.

## 15. Verification and acceptance

Automated checks should target behaviours: bounded movement for the full hitbox; neutral simultaneous input; consistent projectile cadence across frame rates; one-time phase transitions under multiple hits; deterministic restore; correct HP reset; no stale hazards on retry; one-time completion/rewards; stage identity and old-save routing; no unsupported hero ability leakage.

Validate pattern reachability and reaction time at representative portrait/landscape sizes. Test death before, during, and after midpoint and transformation transitions. Exercise pause/resume, stage exit/re-entry, rotation, and repeated retries for stale timers, audio, or growing entity counts.

Manual acceptance requires:

- A complete 3-3 LCD exit that clearly becomes the normal physical arcade.
- Both orientations with legible vehicles, boss HP, player damage, projectiles, and taunts.
- Real touch and keyboard control, including quick reversals and boundary movement.
- Fair, readable attack patterns with up/down movement alone.
- Every hero seated recognisably with equal vehicle combat behaviour.
- No repeated runner section, boarding, or already-completed vignette after a flight death.
- Final form with visible core and safe gaps on the narrowest supported layout.
- Sustained gameplay/performance measurements and real audio listening.
- Correct completion, power-restoration story, unlocks, and return to campaign flow.

Builds and unit tests support these checks but do not establish rendered, device, listening, or gameplay acceptance.

## 16. Reference mockups and remaining decisions

Concept images generated with the built-in imagegen tool, not game-engine screenshots:

- [Neon continuation](../work/mockups/act-ending-flight/01-neon-continuation.png): useful for horizontal chase composition; the selected setting moves behind the arcade after a brief in-world launch.
- [Arcade power corridor](../work/mockups/act-ending-flight/02-arcade-power-corridor.png): location/power-state study; production art should be simpler, less glossy, and closer to the normal hub.
- [Generation prompts](../work/mockups/act-ending-flight/prompts.md).

Remaining prototype decisions: exact tub/core dimensions, vehicle damage allowance, health totals and shot cadence, encounter durations, final-form silhouette, music handoff, taunt copy, special-mode rules, and the precise integration with existing campaign ending/saves. These do not reopen the agreed encounter concept; resolve them through the staged implementation and review above.
