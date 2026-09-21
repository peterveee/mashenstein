# Crypt Shift and Neon Blasters — Mechanic Ideas

**Status: Proposed concepts.** These ideas are for discussion and prototyping; none is approved or implied to be implemented by this document.

Design references: [Game Bible](GAME_BIBLE.md) and [Story / Script](SCRIPT.md). The script contains some older cabinet ordering; current cabinet and stage data should determine implementation placement.

## Direction and shared controls

**Crypt makes you manipulate the haunting; Neon makes you dismantle the machinery.** Each cabinet should give the player a new rule to learn and then get clever with.

Crypt already has darkness, catacombs and Gary's stranded coworkers. Neon has shooting targets and drones. These are useful foundations, with room for stronger identities. The ten candidates below are alternatives to choose from, rather than ten features to cram in. Existing islands, pits and tunnels can provide familiar ground between distinctive encounters, subject to visibility and fairness.

- Preserve continuous forward running, jump, slide and hero ability controls. No stopping or reversing is required by these concepts.
- Keep warnings, action windows and routes readable in portrait as well as landscape. Darkness must not conceal a mandatory reaction until it is too late.
- For shooting-heavy Neon concepts, propose a cabinet-provided **automatic forward cannon available to every hero**, with hero abilities retained separately. Jumping and sliding set its firing height. Shooting becomes a movement challenge, and mandatory targets do not depend on which hero happens to arrive.
- Introduce each new rule in a safe, readable encounter before combining it with existing hazards.

## Crypt Shift

### 1. Your shadow is the platform

*Potential signature mechanic.*

Huge inspection lamps cast shadows from gravestones and crooked machinery onto the crypt wall. Those shadows become solid ledges you can jump onto. A moving lamp slowly tilts a shadow into a ramp; a swinging chandelier sweeps one across a gap.

The distinctive moment: running up the enormous shadow of a tiny object. Familiar platforming, but suddenly the **position of the light determines the architecture**. Introduce it above safe ground before using it for crossings.

> STRUCTURAL INTEGRITY: THEORETICAL.

### 2. The Night Watchman only checks standing employees

A spectral supervisor sweeps a torch across the corridor. Slide below its clearly marked beam and you pass unnoticed. Get spotted and it stamps your position; after a visible warning, a filing-cabinet-sized tombstone drops there.

Later encounters put tempting airborne coins inside the beam: stay low and safe, or jump, attract attention, and dodge the consequence. Detection creates a second action rather than instantly costing health.

> IF YOU CAN STAND, YOU CAN WORK.

### 3. The dead are asleep. Mind the floorboards

Marked creaky flooring runs beneath sleeping coffins. Sliding across it stays quiet; running or landing on it wakes the occupants. The coffins visibly rattle before their residents emerge farther ahead.

You can jump an entire short patch, slide across a longer one, or deliberately wake a resident guarding a bonus route. This gives slide a fresh purpose and makes **where you land** matter.

> PLEASE DO NOT DISTURB THE PERMANENT STAFF.

### 4. A ghost records your last jump—and performs it ahead of you

*Experimental alternative; audition the basic feel before building a cabinet around it.*

Pass through a VHS recording arch and a ghostly trace records a short section of your movement. In the next chamber, it replays that movement on a visible parallel track: jumping onto a spectral pressure plate, lifting a portcullis while you run beneath it.

Early rooms make the recording action obvious with a coin arc. Later rooms offer different rewards for recording a jump or a slide. It's a short “do something now that helps you next” mechanic, with no stopping or reversing.

Use a cheap ghost outline rather than a second rendered hero. The budget joke survives.

> PREVIOUS SHIFT STILL IN ATTENDANCE.

### 5. Rescued coworkers become a moving haunted staircase

Give the existing rescue mission an active payoff. At marked locations, your ghost coworkers float ahead and hold enormous spectral timecards at staggered heights. These become temporary platforms leading to an upper exit or bonus cache.

You rescue someone, then immediately see them help you. Across the stage, the growing group can form increasingly ambitious routes. Their formation is automatic; your job is to jump through it.

> ADDITIONAL DUTIES. NO ADDITIONAL PAY.

## Neon Blasters

The shooting concepts below assume the proposed shared automatic cannon described above, with hero abilities retained separately.

### 6. Shoot the circuit; watch the level shut down

*Strongest recommended Neon mechanic.*

Every major hazard has a visible power cable leading to a shootable node. Jump to hit the upper node and an overhead laser folds away. Stay low to break another circuit and a conveyor changes direction or a crusher locks open.

The payoff is immediate and physical: sparks race down the cable, machinery winds down, and the route changes. Early encounters have one node; later ones offer a choice between disabling danger and opening a richer route.

> WARRANTY VOID. ACCESS GRANTED.

### 7. The Return-to-Sender shield

Some drones fire one large, clearly signalled energy ball. A brief shield at the start of a slide reflects it back into their armour. Holding slide still gets you underneath, but a well-timed slide destroys the attacker.

That gives us a satisfying optional skill: **dodge safely, or turn defence into an attack**. Later, reflected shots can smash machinery ordinary pellets cannot penetrate. No new button needed.

> DELIVERY REFUSED.

### 8. Invader formations with a removable keystone

Drones assemble into big, readable shapes: an arch, a staircase, a wall with a low opening. One conspicuous command drone holds the formation together.

Shoot that drone and the formation disassembles into harmless tumbling parts and coins. Miss it and navigate the intact shape by jumping or sliding. The target's height changes your approach, while both outcomes remain playable.

This makes enemies act as **moving level geometry**, with the pleasure of collapsing a whole formation through one good alignment.

> MANAGEMENT POSITION ELIMINATED.

### 9. Magnetic boots: the floor bends up the wall

*Ambitious movement alternative; audition the basic feel before building a cabinet around it.*

Clearly marked magnetic strips carry the runner onto the ceiling through a short, automatic transfer. The camera stays upright. Jump pushes away from the current surface; slide keeps you close to it.

Ceiling sections let you shoot the exposed tops of machines that were armoured from below, before another strip returns you to the floor. Use bounded sequences with clear entrances and exits, so this feels like a deliberate stunt.

> PLEASE RETAIN CONTACT WITH COMPANY PROPERTY.

### 10. The Midnight Express: dismantle a train while running on it

*The big set piece.*

Run across carriage roofs while a security locomotive pulls alongside. Shoot exposed couplings and power units to peel away its armour carriage by carriage. Duck signal gantries, jump between roofs, then break the engine's final connection before the junction.

The train's destruction changes the encounter: a disabled gun carriage falls behind; a broken crane swings into a new crossing. Background motion supplies the speed and spectacle without making the player's reaction window shorter.

This develops the train-chase direction from earlier design discussion. It remains a proposal rather than an implemented feature.

> THE EXPRESS SERVICE WILL NO LONGER BE STOPPING. OR CONTINUING.

## Recommended shortlist and possible progression

**Lead with shadow platforms for Crypt and destructible circuits for Neon.** Each is strong enough to become the feature someone remembers about its cabinet.

Pair Crypt's shadows with the Night Watchman and helpful ghost coworkers. Pair Neon's circuits with drone formations and make the train the third-stage payoff. The following is a possible progression, not a committed replacement for the existing missions:

| Cabinet | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|
| Crypt Shift | Learn the haunting: introduce solid shadows and moving light above safe ground. | Rescue the staff: introduce helpful coworker platforms and the Night Watchman's inspection beam. | Escape using their help: combine shadow routes, inspections and the rescued coworkers' formations. |
| Neon Blasters | Learn to dismantle machinery: introduce the shared cannon, firing height and visible power circuits. | Break the formations: combine circuit choices with command drones and navigable enemy formations. | The Midnight Express: apply shooting and movement skills to dismantling the rival train. |

Creaky floorboards and Return-to-Sender remain additional candidates if the selected mechanics leave room for another encounter type. The VHS echo and magnetic boots are the experimental alternatives: prototype their basic feel before committing to their broader design.

Selection and playable prototypes should precede detailed implementation specifications. This document changes no game behaviour or canonical story.
