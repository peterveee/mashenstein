# Neon Blasters train carriages — design handoff

**Prepared:** 2026-09-22 (Australia/Sydney)  
**Project:** `/Users/Peter/mashenstein`  
**Status:** Proposed design handoff. No train geometry, missions or collision code are implemented by this document.

This handoff narrows the train idea from [Crypt and Neon mechanic ideas](CRYPT_NEON_MECHANIC_IDEAS.md). The train is a new ground treatment for Neon Blasters. It does not become a vehicle-control game, and it does not require a new movement verb.

## Core decision

The player runs continuously to the right across the roofs of a moving train. The train is the ground. The skyline, rails and passing trains supply the motion; the gameplay train can remain a stable sequence of ground spans under the existing camera and runner physics.

The main passenger-car roofs stay at one consistent gameplay height. A carriage gap is a pit with a train-shaped explanation: the player sees the coupler, the dark space below and the landing roof ahead, then jumps it. The gap is familiar runner language dressed as a physical railway transition.

The train earns its place through carriage rhythm and machinery around the roof:

- long roofs create recovery and setup time;
- short roofs create a deliberate jump beat;
- roof equipment creates jump or slide reads;
- signal gantries and tunnel mouths create overhead reads;
- a rival train provides visible targets and moving pressure;
- shooting a power unit or coupling changes what the next carriage does.

## Non-negotiable rules

- Keep the existing continuous forward runner: jump, slide and hero ability remain the player verbs.
- Keep ordinary passenger-car roofs level. Do not make a mixed train of arbitrary platform heights the default layout.
- Treat every carriage gap as a pit-style hazard with the existing warning, collision, death and retry expectations.
- A gap must be visible as a gap before it becomes a reaction. Do not hide it behind a rival train, bloom, smoke or a foreground prop.
- A long carriage must normally precede a gap so the player has time to see the edge and choose the jump.
- Do not put a mandatory roof hazard on the lip or immediate landing side of a gap.
- The lowest-jump hero in the relay bag must be able to clear every ordinary gap at the cabinet's late-stage speed.
- The train spectacle must not shorten the reaction window. Background motion can be fast; gameplay geometry remains readable.
- Any unusual car is a one-off authored set piece with a clear entrance and exit. It must not silently change the floor rule halfway through a random pattern.

## Carriage as level geometry

Each carriage is a horizontal gameplay span with a visual body attached to it. Normal cars share one `roofY`/surface line. The implementation can choose its own data shape, but the design needs these concepts:

| Concept | Meaning |
|---|---|
| Carriage kind | Passenger, short service, cargo/power, security or engine set piece. |
| Runway length | How long the player can run before the next transition. Author this as a timing intention and resolve it against current stage speed; do not rely on one fixed pixel width at every speed tier. |
| Roof surface | The collision span the player can run on. Normal cars use the same surface height. |
| Transition after | A coupler gap, a seamless join, or a scripted machinery transition. |
| Roof treatment | Empty roof, vent, hatch, cargo stack, turret or signal telegraph. It owns the normal jump/slide action, if any. |
| Side interaction | Optional rival-train target, power cable, window, crane or background detail. It must not obscure the next landing. |
| Clear landing | The guaranteed open roof after a jump or scripted transition. |

The carriage body, roof collision and gap should be separate concerns. A train can be redrawn, damaged or left behind without changing the collision surface that the player has already committed to.

## Carriage vocabulary

### Long passenger carriage — the rest

This is the default safe span. It has a broad, level roof, a few vents or roof lights and no mandatory action. It gives the player time to read the next carriage, recover from a relay switch and enjoy the city passing behind them.

Use it before the first gap in a stage, after a demanding set piece and between short-car sequences. Coins can form a shallow line along it, but the coin route must never lure the player toward the next gap's lip.

The long car is not dead space. Its job is to establish the train as the floor and reset the player's timing.

### Standard passenger carriage — the common beat

This is the normal repeating unit: level roof, windows, vents and one readable roof event at most. A low vent or signal box can ask for a jump; an overhead cable or low gantry can ask for a slide. It should not ask for both at the same time on the first pass.

Standard cars may be chained, but a chain needs a clear phrase: event, empty runway, transition. Avoid a wall of identical cars with no visual landmarks.

### Short service carriage — the gap setup

This is a visually shorter car used to make the next coupler feel close and intentional. It still has the normal roof surface. It should not contain a mandatory roof obstacle on its first introduction; the player is learning that its short length predicts a transition.

Short cars are useful in pairs later in a stage, but they should not produce an unbroken sequence of blind gaps. After one short car and one gap, return to a longer roof before introducing another special read.

### Cargo or power carriage — a special silhouette on the same route

Use a flatbed, container car or power wagon to make the consist feel less like an endless passenger train. Keep its playable top aligned to the normal roof line for the first implementation. Its cargo can be a low jump obstacle, a tall slide-under read, or a glowing power node on the side.

The car's visual bulk should explain why the player is jumping or sliding. The collision must remain a simple, honest roof span plus the explicitly authored obstacle. Do not make the player discover a lower deck through an untelegraphed fall.

### Armoured security carriage — the shooting beat

This is the rival train's equivalent of a standard car. It carries a turret, shielded panel or cable junction that can be hit by the proposed shared forward cannon. The player can still clear it by jumping or sliding if the shot is missed; shooting changes the next section rather than being the only way to survive.

The target belongs to the adjacent train or a carriage-mounted machine, not to a tiny decoration on the roof. It needs a strong silhouette, a visible shot lane and a clear result: turret folds, cable sparks, armour drops or the car falls behind.

### Engine and final car — the destination

The engine is reserved for a stage endpoint or chase beat. It should be visually larger and more strongly lit than a normal carriage, but it should not introduce a new floor height during an ordinary run. The last roof needs a clear finishing runway before the goal or boss transition.

## Length and rhythm targets

Carriage length is a pacing tool. It should be authored in relation to the current stage speed, then checked at the late-stage ramp rather than chosen only by how large the sprite looks.

Initial tuning targets for a prototype:

- **Long car:** roughly 0.8–1.3 seconds of uninterrupted running.
- **Standard car:** roughly 0.5–0.9 seconds.
- **Short service car:** roughly 0.25–0.45 seconds before its gap.
- **Ordinary coupler gap:** begin at or below the current standard gap width (`56` world px in `OBSTACLES.gap`) and only widen after a fairness pass.
- **Landing runway:** leave a visibly usable roof after the gap before the next mandatory action. A clean landing should never be immediately punished by a vent, turret or second gap.

These are starting targets, not new constants. The existing player physics are the authority: the base jump is approximately 57 px high with approximately 0.71 seconds of airtime, and the spawner's fairness contracts are expressed in speed-scaled time. A carriage prototype should be tested with the lowest-jump hero and the cabinet's fastest ordinary stage speed.

The intended phrase is:

```text
long roof → readable edge → jump → clean landing → short roof or roof event → long roof
```

The train should feel like a sequence of phrases rather than an endless row of identical pits.

## How a gap reads

Every ordinary transition should have the same visual grammar:

1. The current roof ends with a bright edge marker and a visible coupler.
2. The track, darkness or city lights are visible beneath the gap.
3. The landing roof is broad enough to read before the player reaches the lip.
4. A small coin arc or warning light may trace the jump, but coins never replace the physical read.
5. The landing side is empty until the player has completed the jump.

The gap should look like a pit in the first frame, not like a missing sprite or a narrow seam. A missed jump may use the existing pit fall/death treatment; no new train-specific death state is needed for the basic transition.

## Overhead and roof obstacles

Since ordinary roof height stays constant, variation comes from the things mounted around that roof.

- **Roof vents and hatches:** low, solid jump reads. Use one at a time while teaching the roof.
- **Signal gantries:** tall structures spanning the track. Their horizontal bar is a slide-under read; the approach should show the bar and its clearance well in advance.
- **Tunnel mouths:** a broad dark silhouette with a clearly open lower lane. Do not combine the first tunnel with a gap.
- **Pantographs and cable arcs:** animated scenery that can become a hitbox only when deliberately telegraphed. A glowing warning state should precede any active sweep.
- **Cargo stacks:** visually chunky boxes on a cargo car. They are ordinary jump obstacles, not alternate floors.
- **Side cranes:** background or side-lane machinery that can swing after a power node is shot. The swing must not erase the player's landing roof.

The first Neon prototype should use only one roof obstacle family at a time. Add mixed jump/slide phrases after the carriage rhythm is comfortable.

## The rival train

The rival train is a second moving layer, not a second playable route. It can run alongside the player's train, fall behind when damaged, or cross a distant bridge. Its purpose is to make the cannon visibly matter.

Recommended interactions:

- Shoot a turret to stop its firing cycle.
- Shoot a power unit to make a laser gate fold away on the player's train.
- Shoot a coupling to drop one armoured car behind the chase.
- Miss the shot and continue with a jump or slide around the resulting obstacle.

The adjacent train should never hide the player's next coupler. Keep its motion in the background or above the gameplay horizon unless the target is deliberately presented as the next readable action.

## Three-stage progression

This is the recommended Neon train arc. It replaces the train's old “reach the end” vagueness with a visible escalation while retaining the existing runner structure.

### Neon 1 — Boarding run

Teach the train as ground. Use long and standard passenger cars, one isolated short service car and one ordinary coupler gap. Add the shared forward cannon against large, stationary targets on a nearby train, but do not require simultaneous shooting and jumping.

The player should finish this stage understanding: “I run on roofs, and I jump the couplers.”

### Neon 2 — Parallel pursuit

Introduce the armoured security carriage and one overhead signal or tunnel read. The rival train moves beside the player and exposes power units at different heights, but each shot window is still separate from the landing decision.

Use a long-car reset after every compound encounter. A successful shot should remove or simplify the next machine; a missed shot should leave a readable jump/slide route.

### Neon 3 — Last stop

Use the train as a set piece: shorter cars, a clear sequence of couplers, the rival engine alongside and a final coupling or power unit that changes the finish. The player still runs and jumps; the spectacle comes from cars dropping behind, signals changing and the engine drawing level.

Do not make the final sequence a random pit gauntlet. Author the last three or four transitions as a clear cadence with a long setup roof before the final jump.

## Fairness and acceptance checks

Before implementation is considered ready for a playable prototype:

- A still frame makes the next carriage and its gap unmistakable.
- The first gap has a long run-up and no competing roof hazard.
- The lowest-jump hero clears every ordinary gap at Neon’s late-stage speed.
- The landing roof is clear until the player has landed and had a readable recovery window.
- No gap is placed inside a portal handoff, checkpoint restore, death camera hold or other scripted transition.
- Portrait framing still shows the current roof edge, the gap and the landing roof together; camera motion must not crop the only telegraph.
- Long cars visibly reset the rhythm between short cars and machinery encounters.
- The rival train changes the scene when shot, but a missed shot never creates an unavoidable hit.
- The engine remains a destination and set piece, not a surprise change to the floor height.

The first implementation should validate one long passenger car, one standard car, one short service car, one coupler gap and one adjacent security target. Expand the vocabulary only after that sequence reads correctly in an actual run.

