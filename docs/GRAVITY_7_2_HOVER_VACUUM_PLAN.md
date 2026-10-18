# Gravity Grid 7-2: hover vacuum implementation handoff

Date: 18 October 2026  
For: Luna Max  
Status: implemented; focused Gravity Grid checks and production build pass
Reference: [desktop hover-vacuum mockup](../work/mockups/gravity-7-2-cleaner-options/01c-hover-through.png)

## Intended encounter

Replace the cleaner's moving arm with a free-hovering vacuum that stays ahead of the automatic runner. It takes a loose canister or machine part from one running surface, pulls it through its body, and shoots it **horizontally back toward the runner along the other surface**. The runner jumps over a low shot. The robot is the cause of the hazard, not a collidable enemy or a target that must be shot.

The exchange must work in both directions:

| Runner's current gravity | Debris starts on | Suction direction | Shot travels on |
| --- | --- | --- | --- |
| Floor (lane 0) | Ceiling (lane 1) | Down from ceiling into vacuum | Floor, left toward runner |
| Ceiling (lane 1) | Floor (lane 0) | Up from floor into vacuum | Ceiling, left toward inverted runner |

The ceiling case is a key beat: visibly lift a piece **from the floor up to the hovering machine**, then launch it along the ceiling where the player is running. The floor case mirrors it. Do not make all pickups originate from the ceiling, or hide the cross-corridor suction inside an effect. The mockup establishes the hovering silhouette, colors, and straight outgoing shot; the final animation needs the source and destination surfaces above.

Use one readable path per attack: source object at rest on its rail → colored suction stream and object crossing the corridor → brief containment in a transparent or lit body tube → warning flash at the outlet → a tangible low projectile travelling left on the runner's rail. No articulated arm, overhead carriage, or up-and-down tool swing. The robot can ease vertically to line up its outlet with the selected rail, but should never teleport or obscure the hero. Keep its body out of the collision system; its launched debris alone is hazardous.

## Scope and existing level contract

Keep stage ID `gravity-2`, MAINTENANCE MAYHEM, its 100-second route, six gravity gates at 18/28/49/61/80/90 seconds, three cleaning cycles ending at 33/66/94.5 seconds, checkpoints, rewards, no-damage bonus, and normal finish. Preserve the auto-run and existing jump, duck and forward-shoot controls. Firing stays optional; every required encounter is clearable without it. Ceiling encounters must ask for a jump, never a duck.

At the time this plan was written, `src/data/gravity-stages.js` scripted `maintenancePulse` and `maintenanceBrush` at 5, 11, 24, 38, 43, 55, 58, 70, 74, 85 and 87 seconds, while six `maintenanceRollers` occupied the rail abandoned at each gate. The implementation outcome below records their replacement and the spacing checks.

Update the existing briefing in `src/data/briefings.js` so it describes suction, the low shots, jumping, and transfers. Remove instructions to duck a brush if no brush remains. Keep the short in-world intro and cycle-count HUD coherent with the final encounter.

## Attack data and simulation

Make the encounter authored data, not animation that invents collisions. A small attack record should have a stable ID, release or impact time in stage-travel seconds, target lane, source lane (normally `1 - targetLane`), debris skin, and any deliberate recovery grouping. Reuse the stage's seconds-to-world conversion (`gravityWorldX` and `baseSpeed`) and the resolved corridor. A shot should have one authoritative world position and hitbox; visual effects read that state.

Suggested phases: `waiting → suction → loaded → telegraph → launched → spent`. Use route/game time so pause freezes the whole exchange. During `waiting` show a clearly separate, non-colliding source piece on the opposite rail. During `suction` animate that exact piece along a curved path into the intake, including the floor-to-ceiling lift. During `loaded` make it visible in the body. During `telegraph` show the outlet direction and the target rail. At `launched`, create or activate the single collision entity and move it left at a fixed world-space velocity. After it passes the player or leaves the corridor view, mark it spent. Draw the projectile and its collision at the same computed coordinates; avoid a decorative shot that races ahead of an old stationary obstacle.

Make the attack state deterministic from authored data and route time where possible. If a mutable state is necessary (for collision, absorbed shots, or one-shot cues), give each record a stable ID and include its phase, release, and spent/cleared state in checkpoint and rewind snapshots. Rewinding must not duplicate a launched piece, replay a cycle credit, or jump the projectile to a different position. Preserve the current `gravityMissionState` cycle ledger. Give the projectile a distinct obstacle type rather than reusing `maintenancePulse` if it has different width, speed, art, or behavior; keep the hitbox small enough that a normal jump visibly clears it. Make the debris armored/nonessential to shoot, as the current Gravity hazards are, unless shooting it is deliberately offered as an optional convenience across the whole hero roster.

Do not use the existing `positionGravityHazards()` pulse drift as the new shot path without reworking it: it currently nudges a pulse around an authored X rather than representing an object emitted from the robot. The cleaner drawing should read the attack state, not search the nearest live obstacle and swing toward it. Use the project's current gravity coordinate convention: lane 0 floor, lane 1 ceiling; `gravityCeiling` and `corridor` must determine the mirrored hitbox and art.

## Encounter pacing

Build three escalating cycles while retaining the level's survival objective:

1. **Cycle 1, 2–33 s:** one isolated floor shot, a second with a different lead-in, then one ceiling shot after the 18 s transfer. Teach the complete intake–fire–jump loop with generous warning and empty landing space.
2. **Cycle 2, 35–66 s:** repeat floor shots, then floor-to-ceiling suction on the ceiling leg after 49 s. Vary the delay between intake and firing, but keep shot speed and visual language consistent. Leave clear space around the 61 s return gate.
3. **Cycle 3, 68–94.5 s:** a readable, quicker sequence of floor and ceiling shots around the 80/90 s transfers. Increase cadence with shorter gaps, not faster projectiles or surprise midair reversals. Keep the final 90–94.5 s section and floor return clear enough to finish.

Use the existing attack times as candidate beats, not immutable fire frames: the robot needs time to pick up and warn before each projectile arrives. Author the shot arrival at the player's position, or derive it from a release time and travel speed, then measure the actual input window. The robot's world X should remain predictably ahead of the player during each exchange. Let it drift between attacks and ease vertically during quiet intervals; tie its position to the active attack so the visible outlet aligns with the actual trajectory. If the source item is on the unused rail, make it a distinct loose part, visually separate from the wrong-rail live wire and rollers. Never imply that the vacuum consumes an unrelated existing collision hazard while that hazard remains active.

The first visual cue must be readable on the narrowest supported portrait view before the player must jump; target at least 1.5 seconds of warning at the fastest supported speed. Ensure the shortest and longest hero jumps have a forgiving clear window. A missed gravity transfer may still be punished by the existing wrong-rail bed, but a correct transfer must not land the player directly in a shot. Avoid mandatory jump input during transfer or immediately after checkpoint restoration. Make colors redundant with shape/motion: source object, suction stream, loaded tube, flashing outlet, and flying piece must read without relying on cyan/orange alone.

## Art, animation and sound

- Draw the vacuum at the game's current smooth, desktop-resolution art standard. Preserve readable outlines and consistent object scale with other Gravity Grid hazards. The body should visibly hover with restrained fan/jet motion and light bob, without an arm or ceiling tether.
- Show the intake on the **source** side and the outlet on the **target** side. The fired piece exits on a level line just above the active running surface. For an inverted runner, mirror both the outlet height and projectile orientation. The source-to-intake travel may be vertical/curved; the **outgoing** shot stays straight.
- Give the floor-to-ceiling lift enough duration to read the object's journey. Use a short contained pause before firing, a distinct pre-shot flash, and a brief recoil. Do not let continuous suction glow fill the whole corridor or cover the player and gate arrows.
- Make the moving canister/part a real object with a clear outline and minimal trail. A single recognizable object should remain visible across source, tube, and projectile phases; avoid spawning a visually unrelated piece at the muzzle.
- Add restrained suction, load, and discharge sounds using existing audio conventions. Keep repeated shots tolerable over three cycles and support reduced motion by reducing bob, trail and recoil while preserving the gameplay cues.
- Preserve the station's windows, rails, HUD, and exterior scene. Keep visual effects clipped to the playable corridor and check both landscape and portrait framing.

## Implementation order

1. Read the current 7-2 stage data, `GravityRunState` lifecycle, obstacle rendering/collision, checkpoint/rewind hooks, and the reference image. Record the active lane at each candidate attack time; correct any proposed target lane that disagrees with the real route.
2. Author the attack records and pure timing/position helpers. Decide the projectile speed and final hitbox from the actual runner speed and jump arcs. Preserve the existing three-cycle progress and rollers.
3. Integrate one floor shot and one ceiling shot with live collision, deterministic restore, and pause behavior. Make the ceiling shot visibly pull its source from the floor. Confirm the same state drives source, suction, tube, muzzle, projectile and hitbox.
4. Replace the arm renderer with the hover vacuum; then fill out the remaining attack beats and tune spacing around transfers, checkpoint locations, rewards, and all-cast jump windows. Update briefing and short cues.
5. Review the served gameplay at desktop resolution and portrait size, including each phase and both source directions. Tune source visibility, shot warning, outlines and travel speed from the actual rendered frames.

## Acceptance checklist for Luna Max

- A floor-running pass shows ceiling debris sucked down and fired along the floor; a ceiling-running pass shows floor debris sucked up and fired along the ceiling.
- Every projectile has a visible lead-in, travels horizontally toward the auto-running hero, and can be cleared by a normal jump without shooting. The vacuum itself causes no contact damage.
- The player can finish all three cycles using jump and gravity transfers only. No ceiling duck, new aiming control, forced shot, or unavoidable collision after a correct transfer.
- The 100-second route, three unique cycle credits, six gate/roller decisions, checkpoints, rewind, rewards, bonus and final floor finish still work. Restoring mid-attack preserves the phase and projectile position without duplicate objects or credits.
- The old arm motion and obsolete brush/pulse instructions are gone. The hover, intake from each opposite rail, contained piece, warning, discharge and straight flight are legible at gameplay scale in desktop and portrait captures.

For implementation evidence, use focused Gravity Grid checks and a production build, then inspect served gameplay frames for the actual attack phases and collision alignment. Report those separately from human difficulty approval. Avoid changing unrelated Gravity levels or the concurrent art work elsewhere in the tree.

## Implementation outcome — 18 October 2026

- Replaced the ten old brush/pulse beats with ten authored vacuum launch beats, keeping the six gate rollers, three cleaning cycles, checkpoint/reward route and finish.
- The source part appears one second before intake. Suction lasts 1.5 seconds, containment 0.4 seconds and the outlet warning 0.55 seconds. Launch speed is 32 world units per second; the runner-relative launch offset follows the visible robot and contracts in portrait so the machine and source stay inside the narrower view.
- Floor attacks pull from the ceiling and fire along the floor. Ceiling attacks lift from the floor and fire along the ceiling. Canister art is shared across source, body and collision projectile; the robot has no collision.
- Added quiet suction, load and discharge cues. Route-time position and checkpoint/rewind reconstruction keep collision, art and sound state deterministic. The robot bob and loose-part spin reduce under `prefers-reduced-motion`.
- Replaced the old briefing and updated `docs/GRAVITY_LEVELS_2_3.md`.
- `node tests/gravity-level.js` and `npm run build` pass. The served desktop view was reviewed at full game scale. Portrait framing keeps the vacuum visible; the browser preview exposes the full 1080×1920 viewport, although the screenshot returned by the inspection surface truncates the lower part of tall portrait captures. Physical-device and human difficulty review remain separate.
