# Gravity cabinet — design handover

**Prepared:** 2026-09-23 (Australia/Sydney)
**Project:** `/Users/Peter/mashenstein`
**Status:** Design settled in parts, open in others. Nothing is wired into the game. Every picture referenced here is a mock-up painter in `src/dev/space-cabinet-candidates.js`, drawn in the lab gallery (`npm run gallery` → `dist/gallery-lab.html`).

This takes the **GRAVITY GRID** proposal from [Alternate cabinet themes](ALTERNATE_CABINET_THEMES.md) — a cabinet where the hero runs on the floor *and* the ceiling of a corridor — and narrows it to a buildable design. It was worked out over 22–23 Sep 2026 against drawn mock-ups and numbers from the game's own constants.

## The cabinet in one paragraph

An observation deck on a lunar station. The hero runs along a corridor whose back wall is a row of large windows onto the moon: regolith plain, three ranges of hills, a small ringed planet, comets. The corridor's floor and ceiling are both lanes. **Polarity gates** — two orange posts with a column of green chevrons — invert gravity, and the hero *falls* to the other surface, turning a somersault on the way. Gravity is low throughout, so every jump floats. The cabinet's verb is **crossing**, not jumping.

## Decisions

| Question | Decision | Status |
| --- | --- | --- |
| Front half (lane, rails, gate) | Card A, *GRAVITY GRID*: vector-CRT rails top and bottom, phosphor cyan, warning orange, diagnostic green | **Chosen** |
| Background | Observation-deck window wall onto the moon | **Chosen** |
| Window shape | Rounded rectangles, 94 world px wide, 3.5 px gap, radius 4.5 | **Chosen** |
| Glass | Bands only (card N): cold tint, two leaning specular bands, one Fresnel ramp, edge + bevel. No reflected room | **Chosen** |
| Hero reflection in the glass | Card O: mirrored, faded, offset downstream | Offered, not confirmed |
| How the hero crosses | Card R: the somersault | **Settled** |
| Gate glyph | Thick flowing chevrons, full corridor height | **Chosen** |
| Gravity | ~0.65 g | Proposed |
| Run speed | 120 world px/s | Proposed |
| Camera | Zoom 1.6 (`ZOOM_NORMAL`), corridor 137 world px | Recommended, not confirmed |
| Double jumps reaching the ceiling | Ceiling landable only inside a gate's column; saws elsewhere | Recommended, not confirmed |
| Portrait frame fill | Card i: gate pylons + grated sub-floor + signage band, metal roof | **Peter's pick** |

## The crossing

**It is a fall, not a jump.** The gate inverts gravity and the hero drops toward the other surface. There is no new input and no new physics: the existing integrator runs with the sign of gravity flipped. Across a 108 world px corridor at 0.65 g that is 0.61 s; at 137 px it is 0.68 s.

**The somersault needs a trick, and the trick is not optional.** The hero runs right and must still run right upside down, so the crossing has to end *mirrored* top-to-bottom. A rotation has determinant +1 and a mirror has −1, so **no continuous rotation can ever end mirrored**. Rotated 180°, he always faces left.

That leaves exactly three designs, and all three were drawn:

- **P — instant flip.** He mirrors on the frame he enters the gate. VVVVVV does this. Parked.
- **Q — card flip.** Vertical scale runs 1 → 0 → −1. Keeps facing, but passes through a one-frame pancake. Parked.
- **R — somersault.** He turns 180° readable the whole way, and the facing is **snapped on the touchdown frame, underneath the arrival spark burst**. One frame at 24 fps. **This is the one.**

Two implementation rules for R:

1. **The snap must stay tied to the landing effect.** Without the burst over it, the facing swap is visible.
2. **The turn is eased with a smoothstep, not linear.** The hero is 18 wide and 24 tall, so a rotated body is up to 30 px end to end, worst at 37°. Position across the corridor goes as *u²*. A linear turn reached 37° while he was still a body-length off the deck, and cut 1.8 px into the plate he had just left. Smoothstep puts the fast part of the turn mid-corridor, where he is furthest from both surfaces. Measured incursion: 0.0 px.

A tucked roll was tried first and rejected: the roll pose renders as an unrecognisable disc.

P and Q stay drawable as `XFER_STYLES_PARKED`.

## Gravity, speed and the camera

These three numbers are coupled, and the coupling is the main thing to understand before changing any of them.

### What portrait actually is

Portrait keeps the 480 px logical width and takes its **height** from the handset. A 393×852 phone gets a **480 × 1041** frame. At portrait's 3.5 zoom that is a world view of **137 × 297 px**, against landscape's **240 × 135**.

So portrait is **narrower but more than twice as tall**. Two consequences:

- **Portrait's cost is runway, not height.** There are 133 world px ahead of the hero's mark in portrait, against 181 in landscape — 73 %.
- **The corridor's height is capped by landscape, not portrait.** Landscape sees 135 world px of height. Portrait sees 297.

(An earlier reading of this in the working session was wrong: it passed `presentationMode` to `frameForViewport`, whose parameter is `mode`, and got the landscape frame back. The numbers above come from the correct call.)

### Airtime against runway

Airtime goes as 1/√g, and ground covered goes with it. The table uses the portrait runway of 133 world px.

| Setting | A jump covers | × portrait runway |
| --- | --- | --- |
| Shipped: 1.0 g at Neon's 208 px/s | 148 px | **1.12×** |
| 0.65 g at 208 px/s | 228 px | 1.72× |
| 0.65 g at 120 px/s | 131 px | 0.99× |
| 0.75 g at 120 px/s | 114 px | 0.86× |

The first row matters: **portrait already ships jumps that land past the edge of what the player can see**, at Neon speed and normal gravity. Low gravity does not create the problem; it multiplies it. So gravity and speed have to move together. At 0.65 g the run slows to 120 px/s.

### The corridor's height is a camera setting

The frame pins the groundline at y 232, so the world visible *above the floor* is 232 ÷ zoom. Pull the camera back and the corridor grows, with no distortion.

| Zoom | Corridor (8 px margin) | Hero on screen | Current jump (head 112) |
| --- | --- | --- | --- |
| 2.0 (`ZOOM_CLOSE`) | 108 | 48 px | **hits the ceiling** |
| 1.8 | 120 | 43 px | clears by 8 |
| **1.6 (`ZOOM_NORMAL`)** | **137** | **38 px** | **clears by 25** |
| 1.4 | 157 | 34 px | clears by 45 |

**Recommendation: zoom 1.6, corridor 137.** It is a tier the game already ships (`ZOOM_NORMAL` in `src/game/run.js`), so it is a setting rather than new machinery. The corridor is 27 % taller, the current jump clears it, and the hero is still clearly himself at 38 px. The cost is that everything is 20 % smaller on screen in landscape; check it at the phone rung before committing.

At zoom 1.6 the jump does not need to be cut. At zoom 2 it would: the proposal there was `BASE_JUMP_V` 210 instead of 320 (head at 62).

**Do not stretch Y more than X.** The codebase keeps one uniform XY scale deliberately, and a vertical stretch would make the cast a different shape in one cabinet.

The crane is not a constraint here: `PAN_MAX` is 206 screen px at zoom 2.

## Double jumps and the ceiling

**No corridor can be built tall enough for a double jump.** There are three independent sources of extra jumps:

- **Kiko** ships with `maxJumps: 2` (`src/data/heroes.js`).
- The **cape** mod adds a jump to anyone.
- The **AIR JUMP** capsule adds more.

Head height at 0.65 g:

| Hero | Single | Double | + cape |
| --- | --- | --- | --- |
| B33P | 103 | 160 | 217 |
| Typical | 112 | 175 | 238 |
| Clara | 120 | 190 | 259 |
| Kiko | 98 | 152 | 206 |

The tallest corridor rung is 157. So the ceiling has to be either a landing or a hazard.

**Why "just let them land on the ceiling" is not enough.** If the ceiling is landable anywhere, a player can be on the ceiling before reaching a gate. Three things break:

1. **The arrow lies.** An up-gate reached while already up either does nothing or sends you down.
2. **The chart loses track of which surface the player is on.** The gate being the only crossing is what lets a level author know the player's surface at every x. That certainty is what makes a two-surface chart writable. Without it, every pattern must be survivable on both surfaces.
3. **The fairness sim doubles.** It would have to check both surfaces and every crossing.

**Recommendation: the ceiling is landable only inside a gate's column, and lined with saws everywhere else.**

- A double jump *at* a gate lands you on the ceiling early. That is harmless, because the gate was sending you up anyway. The surface is the same either way, so the chart keeps its certainty and the arrows stay honest.
- A double jump *away* from a gate meets a saw. This is an authored hazard rather than an engine bonk, and it reads from a distance.
- Kiko's double jump becomes a timing expression — crossing a beat early — rather than a chart-breaker.

The engine change is one rule: *the ceiling is solid within gate zones.* The drawn landable span is ±26 world px either side of the gate.

The alternative — the gate as a **toggle** that swaps whichever surface you are on, drawn with a double-headed glyph — is also in the gallery. It keeps the arrow honest but gives up the chart's certainty. Choose it only if free movement between surfaces is the point of the cabinet.

Other options considered and not recommended:

- Banning the extras in this cabinet works for the capsule (the beat stages already ban capsules), but it cannot ban Kiko's own ability.
- A per-cabinet `jumpScale` clamp is cheap, but it silently breaks the jump height a hero's select card promises.

## The deck: architecture rules

**Everything in the room moves together.** The window wall, the rails and the gates are one structure, so they scroll at 1:1 with the lane. An early mock scrolled the wall at 0.6, and the gate slid along its own wall. Only the view *outside* has parallax.

**Gates sit on the window grid.** One gate every 390 world px — exactly four panes — offset by half a pane, so a gate always stands in the middle of a window. At 120 px/s that is a gate every 3.3 s.

**Panes are measured in world units.** A pane is 94 world px wide in both orientations. An early portrait mock wrote the pane in screen px, which would have made the same window a third smaller on a phone. Portrait shows about one and a half panes across.

**The gate is bolted to the deck.** The posts are clipped to the corridor, butt-capped and stop 2 px short of each rail. Each end sits in a socket with a lit lip and a shadow. An early version used round line caps, and the glow spilled as orange blobs over the rails.

**Rail plates are 12 world px deep.** Landscape can fill 60–90 px into the deck because the frame ends soon after. Portrait shows 110 world px above the ceiling, and a deep plate buries everything drawn there.

**The horizon is 23 world px above the deck floor**, in both orientations.

**Terrain is grounded by construction.** Each hill range is traced once and that path is reused as the clip for its lighting. An earlier version drew the lit faces as separate triangles, and on rounded ranges they floated in the sky.

## The view outside

- **Regolith plain** with a soft horizon band (not a line), and craters.
- **Three hill ranges**, eroded and round-shouldered except the middle range. Far and mid are planted a few px into the regolith. The near range is drawn in front of the plain, with a pooled contact shadow.
- **Saturn**, small, top of the sky, body fixed. Eight ring bands reaching 2.9 planet radii, with the Cassini division, drawn behind the disc and then in front of it, and a ring shadow on the disc. **Only the rings animate:** the ring plane opens and closes about 9 % over 18 s, with a faint shimmer through the bands. **Two storms** ride the disc on longitudes half a turn apart, so one is always visible; each foreshortens toward the limb. Rotation takes about 31 s.
- **Three comets** drifting slightly faster than the stars.

## Portrait: filling the frame

With the floor anchored where every other portrait stage puts it, portrait has **about 110 world px above the ceiling and 79 below the floor** that landscape never shows. Eight treatments were drawn. **Peter's pick is card i:**

- **Gate pylons, full height.** Each gate grows a lattice mast with a transformer, a blinking warning lamp and a slung cable above the ceiling, and its drive machinery below the floor. This puts gameplay in the empty thirds, and a gate becomes visible from much further away, which matters when portrait runway is 73 % of landscape's.
- **Grated sub-floor.** Through the deck you see the service level: machinery at its own slower rate, lamps, and the extension cord slung between brackets. A pit then reads as a hole into a real place.
- **Diegetic signage** on the ceiling rail: hazard stencils and a plate counting down to the next gate.
- **Metal roof** above, with ribs running the full height of the hull. An earlier version stopped the ribs partway and left stubs.

Also drawn and not picked: a glazed roof, a second deck overhead with staff and a cargo tram, and all five together.

## Open questions

1. **Camera:** confirm zoom 1.6 after checking the hero at the phone rung.
2. **Ceiling rule:** confirm gate-column landing plus saws over the toggle.
3. **Gravity and speed:** confirm 0.65 g at 120 px/s. 0.75 g at 120 px/s is the safer fallback.
4. **Capsules:** decide whether AIR JUMP and LOW GRAVITY are banned in this cabinet. LOW GRAVITY stacked on 0.65 g gives 0.33 g.
5. **Hero reflection** in the glass (card O): keep or drop.
6. **Which cabinet it replaces.** [Alternate cabinet themes](ALTERNATE_CABINET_THEMES.md) suggests Corporate Kombat.
7. **Hazard vocabulary** beyond the ceiling saws and magnetic crate: not designed yet.

## Implementation notes

- **Spawner and fairness.** `worstAirtime()`, `fairGap` and `crossingLayout` in `src/game/spawner.js` read the global `GRAVITY`. A per-cabinet gravity means these read a multiplier. This same coupling is why per-cabinet gravity was rejected for the beat stages ([rhythm beat-sync plan](rhythm-beat-sync-plan.md), decision D2). It is the real cost of the cabinet, not the constant.
- **The fairness sim** has to learn the crossing and the ceiling lane.
- **Gate zones** are the only new collision rule: the ceiling is solid inside a gate's column.
- **Portrait must be checked for every gameplay change** in this cabinet.
- The mock-up painters (`corridorAt`, `portraitScene`, `gridLane`, `gasGiant`, `glassBands`, `gateChevrons`) are reference art. They were written for the gallery and are not structured as a style pack. A real pack would be written fresh in `src/engine/stylePacks/index.js`, with a cabinet entry in `src/data/cabinets.js`.

## Where the pictures are

All in `dist/gallery-lab.html`, from `src/dev/space-cabinet-candidates.js`.

| Section | Anchor | What it holds |
| --- | --- | --- |
| SPACE CABINET — four mock-ups | `#h-space-cabinet-bakeoff` | Cards A–D, the deck glass variants H–O, the settled somersault R, the gravity comparison I/J, the portrait corridor S and its measured version T |
| How tall can the corridor be? | `#h-space-corridor-height` | The zoom ladder: 2.0 / 1.8 / 1.6 / 1.4 |
| Can you take the ceiling early? | `#h-space-ceiling-rule` | Gate-column landing, the same jump away from a gate, and the toggle |
| Filling the portrait frame | `#h-space-portrait-frame` | Cards a–i; **i** is the pick |

Parked and still drawable: `XFER_STYLES_PARKED` (P, Q) and `DECK_VARIANTS_PARKED` (the first three window treatments, E–G).

The settled somersault is also recorded in memory as *gravity-transfer-somersault*.
