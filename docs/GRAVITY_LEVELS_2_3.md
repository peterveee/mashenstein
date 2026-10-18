# Gravity Grid: low gravity and maintenance

Implemented 13 October 2026 after the two-panel concept review. Replaces the rejected assembly-release and beam-selector missions. Level 1 retains its authored gravity-switch route. Controls remain jump, duck and forward shoot; neither new level requires shooting.

## Level 2: Low Gravity

- 96 seconds, continuous flat floor, no polarity gates or release zones.
- Gravity scale 0.14; launch velocity boosted 1.34 times after ordinary gravity scaling. Fully held jumps reach roughly 86–109 world pixels (previously about 57 for Lorenzo) and stay airborne for more than 2.4 seconds for Lorenzo.
- Coin trails follow the actual held-jump curve: a full rise and fall before and across the first long crossing, then five shorter trails at later crossings. Stages 1 and 3 already award three coins after each gravity gate.
- Level 2's eleven capsule reward anchors sit 84–92 world pixels above the floor. Each comes shortly before a long crossing, so a held jump can collect it and carry through the hazard while a tap stays too low.
- Hold to keep the long ascent; release brakes upward momentum smoothly using stronger upward deceleration, then normal gentle gravity handles descent. Applies to every hero; no new input or persistent movement state.
- Eleven major crossings, 1.15–1.85 seconds wide (138–222 world pixels at base speed), alternate floor lasers, spikes and combinations of cargo and exposed grinders. Eleven duck obstacles follow the landing stretches. 31 hazard entities total.
- Checkpoints and reward/relay anchors moved to clear ground between crossings.
- Small background bolts and hex nuts have parallax, varied tumbling and wandering vertical/horizontal drift, at about 2.6 times the original density. They are painted scenery, never collectible or collidable entities.
- Reach the end; optional no-damage bonus. Capsules and relay portals park in authored clear stretches.

## Level 3: Maintenance Mayhem

- 100 seconds, ordinary cabinet gravity, three cleaning cycles ending at 33, 66 and 94.5 seconds.
- A yellow hover-vacuum tracks ahead of the runner. It pulls one loose canister from the opposite rail through a visible intake stream, holds it in the lit body, then fires it horizontally back along the runner's rail. Ten canisters are timed across the three cleaning cycles; the player jumps over each one. The robot is visual only; the launched canister is the hazard.
- The canister source alternates with gravity: floor runners see debris pulled down from the ceiling, while ceiling runners see a part lifted from the floor. The six exposed, toothed roller beds remain on the rail abandoned at each polarity switch.
- Six switches alternate floor/ceiling. Rollers extend 2.6 seconds along the abandoned rail, making the other surface necessary. Early attacks are isolated; later cycles mirror and combine familiar attacks with recovery space between them.
- Survive all three cycles; optional no-damage bonus. Cycle credit is part of checkpoint/rewind state, and progress cannot be counted twice by rewinding. Robot exits after cycle three; final approach is on the floor.

## Ownership and checks

- `src/data/gravity-stages.js`: authored hazards, rewards, cycles, gravity scale.
- `src/game/gravity/`: production controller, shared player and data validation.
- `src/sprites/gravity-encounters.js`: hover-vacuum, canister, and floating-hardware art.
- `src/dev/gravity/state.js`: compatibility re-export of the production controller.
- The existing station/exterior painting and `src/dev/space-look-candidates.js` are unchanged by this rebuild.

`node tests/gravity-level.js` covers all heroes, no-input damage, low-gravity airtime/height, floor/ceiling canister collisions, vacuum phase timing, cycle credit, wide-field checkpoint reconstruction, projectile rewind, floor finish return, and existing level-one progression.

Local previews: `/?goto=gravity&stage=2&seed=42` and `/?goto=gravity&stage=3&seed=42`. Render-check artifacts are in `work/space-level-rebuild/`. Browser screenshots are visual checks, not physical-device or human difficulty sign-off.
