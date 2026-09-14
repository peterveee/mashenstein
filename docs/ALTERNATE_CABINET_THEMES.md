# Alternate Cabinet Themes

Status: Proposed  
Scope: Replacement candidates for the later MASHENSTEIN cabinets  
Date: 2026-09-14

## The problem

The first six cabinets have clear identities:

- Plumber Panic: !-crates, pipes, and route choices.
- Speed Zone: boost pads, racing furniture, and the loop.
- Rhythm Bankruptcy: a beat-locked road.
- Frost Fortress: slippery landings, icicles, and frozen switches.
- Crypt Shift: darkness, light radius, and cursed shortcuts.
- Neon Blasters: shooting, targets, and airborne threats.

The later three are readable, but their differences are less fundamental:

- Cardboard Kingdom changes the scenery and adds collapse-behind-you dressing.
- Corporate Kombat changes the props and enemy cast around an office joke.
- The Surge is a remix of the existing cabinets rather than a new cabinet rule.

The replacement candidates below are designed around a stronger question:

> What does the player do differently every few seconds because this cabinet
> exists?

A new cabinet should not be another ordinary runner with a new palette. It
should have one memorable rule, three or more obstacle families that express
that rule, a set piece that only belongs to it, and a style that makes the rule
visible at lane scale.

## Design rules

1. **One sentence of explanation.** If the mechanic needs a paragraph before it
   becomes useful, it is too complicated for a running stage.
2. **Forward flow remains sacred.** No waiting for traffic, external cycles, or
   a platform to become available. Every challenge must resolve while moving.
3. **The rule must be visible before it is dangerous.** The player should see
   the surface, signal, current, rail, or polarity state that explains the
   next action.
4. **The cabinet changes decisions, not only scenery.** A palette, prop family,
   and soundtrack are necessary but not sufficient.
5. **Do not use speed as the identity.** The current slower campaign curve gives
   later cabinets room to be strange without making them harder by default.
6. **Portrait must survive.** The rule needs to read in a narrow viewport with
   less warning runway and without relying on tiny distant details.

## Shortlist

| Candidate | Best replacement | Core player verb | Visual language | Distinctness | Cost |
| --- | --- | --- | --- | --- | --- |
| **GRAVITY GRID** | Corporate Kombat | Transfer between floor and ceiling | Vector space station / phosphor CRT | Very high | High |
| **VOLCANO VAULT** | Cardboard Kingdom | Climb ahead of heat and eruptions | Thermal cel animation / basalt | High | Medium |
| **PINBALL PANIC** | The Surge or Cardboard Kingdom | Bank, bounce, and redirect | Chrome glass / score lamps | Very high | High |
| **TIDAL TANGLE** | Cardboard Kingdom | Read currents and buoyant arcs | Aquarium CRT / saturated aqua | High | Medium-high |
| **SKYLINE STORM** | Corporate Kombat | Read wind and lightning telegraphs | Rainy sodium night / inked sky | Medium-high | Medium |
| **LAST TRAIN OUT** | Cardboard Kingdom | Cross car couplers and signal gates | 90s rail shooter / painted steel | High | Medium-high |
| **CARNIVAL CRASH** | The Surge | Use elastic rides and moving masks | Marquee paint / saturated midway | Medium-high | Medium |
| **JUNKYARD JOLT** | Corporate Kombat | Exploit magnetic pull and scrap walls | Rusted two-tone screenprint | Medium-high | Medium |

My strongest first pass is **VOLCANO VAULT → GRAVITY GRID → THE SURGE**:

- Volcano introduces a readable environmental pressure mechanic.
- Gravity then changes the meaning of the road itself.
- Surge remains useful as the final remix cabinet, where earlier rules can
  deliberately return in combination.

If Surge also needs replacing, use **Pinball Panic** as the finale rather than
another remix cabinet.

## 1. GRAVITY GRID

**Arcade label:** GRAVITY GRID  
**Alternate names:** POLARITY PANIC, ORBIT OUT, ZERO-GO  
**Suggested replacement:** Corporate Kombat  
**Genre:** Sci-fi platformer / mechanical puzzle runner  
**Style:** Vector CRT. Deep navy-black space, pale phosphor grid lines, warning
orange, cold white station lamps, and occasional green diagnostic glow. Floors
and ceilings should share a visual grid so a transfer is instantly legible.

### Cabinet rule

Magnetic gates change which surface is the road. A marked transfer sends the
hero from floor to ceiling or back again; hazards and pickups are authored on
both surfaces. The hero is still running forward, but “jump” now often means
choosing when to transfer rather than only clearing a ground object.

### Obstacle vocabulary

- Polarity gates: the readable transfer cue.
- Ceiling saws and hanging cable bundles: threats on the opposite surface.
- Repulsor plates: launch the hero away from one surface toward the other.
- Loose satellites: passive objects that drift across the transfer line.
- Magnetic crates: safe on one polarity, hazardous when the field changes.

### Set pieces

- A rotating maintenance corridor where the visible floor rolls to the wall.
- A reactor chamber with two usable surfaces and a central dead zone.
- A final polarity cascade where the safe surface changes in a predictable
  sequence, ending before the finish line.

### Why it earns a cabinet

This changes the player’s relationship with the entire frame. It is not just
“space scenery”: the road can be above the hero, and the same obstacle has a
different meaning after a transfer.

### Main risk

This is the most expensive candidate. Camera anchoring, route floors, collision,
portrait composition, rewind, and death recovery all need a clean floor/ceiling
contract. It should be implemented as a bounded two-surface lane, not free
six-direction movement.

## 2. VOLCANO VAULT

**Arcade label:** VOLCANO VAULT  
**Alternate names:** MAGMA RUN, ERUPTION STATION, BASALT BREAKOUT  
**Suggested replacement:** Cardboard Kingdom  
**Genre:** Disaster platformer  
**Style:** Thermal cel animation. Black basalt, chalky ash, red-orange lava,
yellow-white vents, and mineral blue used only for rewards. The background
should pulse with heat, but the actionable surface remains high contrast.

### Cabinet rule

Heat pressure rises through the stage. Vents telegraph before they erupt, some
basalt shelves become unsafe, and the player chooses between the low route and
short raised escapes. The road never waits: the pressure is a forward-moving
deadline that makes route choices matter.

### Obstacle vocabulary

- Pressure vents: ground eruptions with a clear pre-flare.
- Cracking basalt: a surface that gives way after a visible warning.
- Lava curtains: vertical hazards that leave a jumpable opening.
- Falling slag: overhead threats that ask for slide or lane timing.
- Obsidian ramps: safe raised routes with a visible reward tradeoff.

### Set pieces

- A lava lift that raises a whole section of road while the hero runs across it.
- A bridge that cracks in three authored stages, never randomly underfoot.
- A vault door opening onto a short, bright eruption sprint before the tape.

### Why it earns a cabinet

It replaces “the set collapses behind you” with pressure coming from below and
ahead. The player learns to read warning states and route height rather than
just react to another ground prop.

### Main risk

Speed Zone already has lava-filled pits. Volcano must make the rising pressure,
vent timing, and changing surface the identity; changing the pit colour alone
would not justify the cabinet.

## 3. PINBALL PANIC

**Arcade label:** PINBALL PANIC  
**Alternate names:** MULTIBALL MAYHEM, TILT CITY, BALLISTIC BOULEVARD  
**Suggested replacement:** The Surge, or a brighter replacement for Cardboard
Kingdom  
**Genre:** Pinball action / score attack  
**Style:** Black cabinet glass, chrome rails, red and gold lamps, segmented
score displays, rubber bumpers, and reflective highlights. It should feel like
the hero has entered the inside of an arcade machine.

### Cabinet rule

The lane contains authored bumpers and rails that redirect the hero or hazards
in bounded, readable arcs. The player chooses when to jump into a bumper, slide
under a rail, or stay on the main lane. Bounces are deterministic enough to
learn, never loose physics that turns the runner into a simulation.

### Obstacle vocabulary

- Rubber bumpers: short, visible bounce events.
- One-way gates: passable in one direction, dangerous from the wrong approach.
- Spinner bars: rotating hazards with a fixed readable phase.
- Drain lanes: brief lower routes that return to the main road.
- Jackpot targets: ability or projectile targets that reward a risky line.

### Set pieces

- A plunger launch into the first playable lane.
- A multiball section where several harmless balls make the dangerous ball
  readable by colour and trail.
- A drain escape that returns the hero to the road instead of killing them,
  then closes behind them.

### Why it earns a cabinet

This gives the runner a strong arcade-native identity: the question is not only
“jump or duck?” but “which surface will redirect me, and what will it expose?”
It also gives score missions a natural home.

### Main risk

Unbounded bounce physics would destroy fairness and portrait readability. Keep
all redirections authored as route pieces with known entry and exit windows.

## 4. TIDAL TANGLE

**Arcade label:** TIDAL TANGLE  
**Alternate names:** AQUA BREAKOUT, FLOODLIGHT FRENZY, DEEP END  
**Suggested replacement:** Cardboard Kingdom  
**Genre:** Underwater adventure runner  
**Style:** Saturated aquarium CRT: deep teal water, electric cyan bubbles,
coral red, warm treasure gold, and broad caustic bands. Avoid the soft frozen
look of Frost Fortress; the motion should feel wet, bright, and alive.

### Cabinet rule

Currents change the shape of jumps and move loose hazards through the lane.
Current arrows and bubble columns are visible before the hero enters them.
Some sections give extra hang time; others pull the hero toward a lower route.

### Obstacle vocabulary

- Current gates: horizontal pushes with clear arrow bands.
- Bubble columns: vertical lift zones that create optional high routes.
- Jellyfish: bobbing slide/jump threats with bright silhouettes.
- Tidal shutters: closing vertical windows that are always timed to the run.
- Anchor chains: low hazards that invite a jump but punish a late landing.

### Set pieces

- A broken aquarium tunnel with water rushing from one side to the other.
- A whale-shadow pass that obscures the background but never the actionable
  lane.
- A treasure lift that carries the optional route above a school of hazards.

### Why it earns a cabinet

The same jump input has a different result depending on the current. That is a
real gameplay identity, not merely an ocean palette.

### Main risk

Frost already owns altered landing behaviour and low-gravity rewards. Tidal
Tangle needs horizontal current and visible water flow to stay distinct from
ice physics.

## 5. SKYLINE STORM

**Arcade label:** SKYLINE STORM  
**Alternate names:** THUNDER RUN, ROOFTOP RELAY, LIGHTNING SHIFT  
**Suggested replacement:** Corporate Kombat  
**Genre:** Rooftop chase / weather action  
**Style:** Rainy sodium night. Inked building silhouettes, warm windows,
cyan-white lightning, reflective asphalt, red aircraft lights, and thin rain
streaks that move with the camera. It should be more atmospheric than Neon,
with less magenta and more black, amber, and electric white.

### Cabinet rule

Wind lanes and lightning telegraphs alter the safe timing of jumps and slides.
Wind is shown as broad moving bands, not invisible force. Lightning marks the
ground first, then strikes on a predictable beat, so the player acts while
running rather than waiting for weather cycles.

### Obstacle vocabulary

- Wind bands: visible regions that push airborne objects and loose props.
- Lightning marks: ground warnings that become short-lived hazards.
- Rooftop vents: gust-producing obstacles that can be jumped or slid under.
- Radio masts: tall silhouettes that force a quick jump decision.
- Loose signs: passive swinging scenery that occasionally becomes a readable
  low hazard.

### Set pieces

- A rooftop gap crossed while a gust pushes rain and debris across the frame.
- A lightning grid where marked roof tiles strike in a fixed forward sequence.
- A crane ride that moves the road briefly without stopping the hero.

### Main risk

Wind can easily become invisible difficulty. The bands must be large, slow, and
visually obvious, and the cabinet should not rely on precise air-control
simulation.

## 6. LAST TRAIN OUT

**Arcade label:** LAST TRAIN OUT  
**Alternate names:** RAIL RAID, EXPRESS PANIC, NIGHT LINE  
**Suggested replacement:** Cardboard Kingdom  
**Genre:** Rail shooter / train-top runner  
**Style:** Painted 1990s rail-shooter art: steel blue, dirty cream, signal red,
window yellow, sparks, rivets, and large destination boards. The train should
feel like a physical machine, not a generic faux-3D road.

### Cabinet rule

The road is a sequence of train cars. Couplers, signal gates, and roof levels
create authored transitions between cars. A low route may pass through a door;
a high route may cross a roof; the player is always moving toward the engine.

### Obstacle vocabulary

- Coupler gaps: short, readable jumps between cars.
- Signal arms: rising and falling hazards with bright red states.
- Tunnel mouths: duck reads with a clear roof silhouette.
- Cargo stacks: movable-looking but authored obstacles with stable hitboxes.
- Trackside signs: large side threats that sell speed without hiding the lane.

### Set pieces

- A car-to-car sprint through a tunnel, with the roof route closing behind.
- A junction where the player chooses roof or interior for one section.
- The locomotive approach, with the final three cars acting as a short chase.

### Why it earns a cabinet

It gives the campaign a strong physical journey and makes route transitions
feel like entering a new object rather than passing another scenery band.

### Main risk

Routes and forks already exist. The train version should focus on car identity,
coupler transitions, and overhead reads instead of becoming another generic
branching level.

## 7. CARNIVAL CRASH

**Arcade label:** CARNIVAL CRASH  
**Alternate names:** BIG TOP BREAKOUT, MIDWAY MELTDOWN, PRIZE FIGHT  
**Suggested replacement:** The Surge  
**Genre:** Circus action / elastic platformer  
**Style:** Painted marquee bulbs, red-and-cream canvas, cobalt shadows,
mustard gold, hand-lettered signs, and exaggerated silhouette art. Keep the
palette theatrical rather than cardboard or office-pastel.

### Cabinet rule

The midway is made of elastic surfaces. Some floors rebound the hero, some
curtains conceal a harmless shortcut, and some ride pieces swing across the
lane. Every bounce has a marked landing zone so it feels like a move, not a
loss of control.

### Obstacle vocabulary

- Trampoline floors: vertical bounce with a visible rebound mark.
- Swinging ride arms: broad, timed slide/jump reads.
- Prize wheels: rotating hazards with one safe window.
- Clown mouths: short tunnels with a clear entrance and exit.
- Balloon clusters: overhead hazards that burst when shot or jumped through.

### Main risk

Springs and loops already exist in Speed Zone. Carnival needs the elastic
surface grammar and theatrical timing to be present throughout the stage, not
one spring pad in a new costume.

## 8. JUNKYARD JOLT

**Arcade label:** JUNKYARD JOLT  
**Alternate names:** MAGNET MAYHEM, SCRAP SHIFT, SALVAGE RUN  
**Suggested replacement:** Corporate Kombat  
**Genre:** Industrial action runner  
**Style:** Rusted two-tone screenprint: oxidized orange, oily teal, cream
paper labels, black conveyor belts, and bright welding sparks. It should feel
hand-printed and mechanical rather than like another office doodle cabinet.

### Cabinet rule

Magnet cranes periodically pull marked scrap toward or away from the lane.
Large objects form temporary walls, low roofs, or optional raised routes. The
player reads the crane light and chooses jump, slide, or the open side.

### Obstacle vocabulary

- Magnet cones: visible pull regions with a short lead-in.
- Scrap walls: broad, stable jump targets.
- Hanging engines: low slide threats.
- Conveyor belts: short floor bands that change object travel, not hero speed.
- Welding arcs: bright, stationary timing hazards.

### Main risk

Magnetism can feel like Gravity Grid without the floor/ceiling identity. Keep
the hero on one road and make the magnet move objects around that road; do not
invert the whole world.

## Suggested campaign replacements

### Safest strong refresh

Replace the two weakest late identities and keep the finale:

1. **Cardboard Kingdom → Volcano Vault**
2. **Corporate Kombat → Gravity Grid**
3. **The Surge remains the final remix cabinet**

This gives Act III three distinct beats:

- environmental pressure from below,
- a road whose surface can change,
- then a deliberate return of earlier cabinet rules.

### More arcade-native

1. **Cardboard Kingdom → Pinball Panic**
2. **Corporate Kombat → Carnival Crash**
3. **The Surge → Last Train Out**

This is visually loud and playful, but it has more overlap with existing pads,
loops, routes, and moving set pieces.

### More atmospheric

1. **Cardboard Kingdom → Tidal Tangle**
2. **Corporate Kombat → Skyline Storm**
3. **The Surge remains the finale**

This is the easiest tonal shift, but Frost and Neon would need especially strong
colour and mechanic separation so the middle of the campaign does not become a
series of blue/bright environmental cabinets.

## Acceptance checklist for a replacement

Before registering a new cabinet in production, it should have:

- one sentence that explains its player-facing rule;
- three distinct obstacle families using that rule;
- one signature set piece that cannot be moved to another cabinet unchanged;
- a mission and challenge that ask for cabinet-specific actions;
- a readable warning at desktop and portrait viewport widths;
- no waiting, invisible forces, or unsynchronised random cycles;
- fair route geometry at the current slower campaign speeds;
- a style-pack treatment that remains legible beside the real 24px hero;
- a clear answer to what happens during rewind, death, and checkpoint restore.

## Recommendation

Start with **Volcano Vault** and **Gravity Grid** as the serious replacements.
They create the biggest separation from the current later-cabinet problem:
one changes pressure on the road, and the other changes which surface counts as
the road. Keep **The Surge** until those two are proven; its remix role is more
valuable as a finale once the campaign has stronger rules to remix.
