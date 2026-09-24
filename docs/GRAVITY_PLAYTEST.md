# Gravity Grid playable level

Launch **DEV MENU → GRAVITY GRID — PLAYTEST**, or open
`http://localhost:8001/?goto=gravity` in the local dev build.
`&hero=kiko` (or another hero ID) selects a hero; the menu uses the current hero.

## Normal level integration

`GravityRunState` extends the real `RunState`. It inherits the ordinary draw
path, HUD, safe-area portrait layout, controls,
pause menu, battery damage, powers, mods, scoring, finish and death handling.
There is no separate HUD or retry screen. A normal death plays the standard
reaction and automatically restores the last checkpoint, including polarity.
UNPLUGGED retains its ordinary no-checkpoint rule.

The scenery is a world-space style treatment: it uses the camera transform
used by the shared renderer. Gravity deliberately parks the camera: portrait
uses the shared portrait framing; landscape caps zoom at the normal 1.6 tier
to keep both surfaces visible. Jumping, landing and polarity changes never
trigger the hero-follow crane or zoom spring.
The three new props are registered with the regular obstacle/prop tables and
rendered through `drawWorldEntity`, including standard visual scale and
supersampled detail. Ceiling props reflect that same rendering pipeline.

## Level

- Approximately 39 seconds of running, ten jump-activated polarity switches.
- 120 world px/s at normal assist speed, 0.65 gravity, 137px corridor.
- Magnetic cargo, oxygen racks and service lasers, plus familiar crates and drones.
- Ordinary coins and an appliance bonus; reach-the-end mission and no-damage challenge.
- Two authored checkpoints in clear stretches. Death and rewind restore surface state.
- Jump and slide use the shared Player controller in lane-local coordinates;
  the camera, collisions, weapons and snapshots receive world coordinates.
- Cross the left bar while jumping to transfer immediately, even when the
  jump started before the marker. Jumping anywhere after it also transfers, until the next
  arrow changes that direction. Jumping on the destination surface stays local.
  The arrow marker is open on the right to show that the zone continues. Running through keeps
  the current surface; standard animated pop-spikes and saw cogs guard the
  wrong rail after a clear departure zone.
- After two fatal missed transfers at a switch, a local JUMP sign appears on
  later approaches. Counts survive automatic restarts and checkpoint restores.
- The somersault uses a smoothstep turn, with the facing snap under the arrival burst.
- The lunar window wall, rails and gate pylons scroll together at world speed.
  Windows have rounded frames inset 10 world px from both rails, with 8px between panes. Saturn drifts
  slowly right-to-left with level progress. Joined, round-ended chevrons sit
  over glass shading that is strongest on the left and fades rightward.

Normal capsule selection and cadence are restored, with drops placed on the
intended surface in clear reward stretches. Normal relay portals are parked
in clear floor stretches, providing two hero swaps in a clean run.
The dev level does not replace a campaign cabinet or award campaign progress.
The fixed slow speed and low gravity are the handover's prototype tuning values.

## Validation

`node tests/gravity-level.js` runs all eight heroes through the actual RunState
update/collision/finish pipeline, checks clean clears with no hidden retries,
and tests checkpoint recovery, ceiling hitboxes, rewind polarity, powerup
collection, both portal swaps, missed-switch damage and adaptive hint persistence. It also
asserts that drawing and death recovery are inherited, while corridor framing
stays fixed at different jump heights and velocities.

Checked alongside the existing run-completion, hero-kit, standing-hazard,
camera-framing, portrait-framing/layout, render-culling and dev-URL suites.
Browser inspection covers landscape/portrait rendering and a real fatal hit
followed by automatic checkpoint recovery without input. Screenshots:
`work/mockups/gravity-level/shared-landscape.png` and `shared-portrait.png`.
Physical-phone acceptance remains unverified.

## Music

**POLARITY DRIVE** (`src/data/songs/gravity.js`) is a 32-bar, 120 BPM theme,
about 64 seconds before its seamless repeat. Bars 1–8 establish D minor and
relative F major; 9–16 move to G minor; 17–24 open into a quieter B-flat /
E-flat bridge; 25–32 return with pickups and a dominant turnaround.
Rounded bass and pulse lead retain the Rhythm/Speed family, with glassy FM
arpeggios, stereo PWM strings, restrained echoes and changing drum fills.
It is registered as `gravity` for the mixer and sound tools, and plays in
Gravity Grid only. The megamix is unchanged.

Reference bounce: `work/auditions/gravity/polarity-drive.wav` (66 seconds
including release tail), rendered at unity through the game audio engine.

Revision 2 uses close triad inversions, corrects the middle-section harmony
to match its transposed melody, removes the string sub layer, and shortens
releases to avoid chord tails spilling into the next harmony. The FM orbit
is softer and uses triad tones. Reference: `work/auditions/gravity/polarity-drive-v2.wav`.

Revision 3 changes the sonic direction to retro-futurist space: a sustained
sine whistle, FM telemetry bells, an airy sine/triangle pad, and a half-time
reactor pulse. It retains V2 harmony corrections and the full 32-bar form.
Reference: `work/auditions/gravity/polarity-drive-v3.wav`. Earlier versions
remain in the audition folder for comparison.

Saturn uses filled rings in one projected plane, with the near half in front
of the shaded globe. Occasional rotating asteroids cross the sky in brief
fly-bys (roughly eight seconds apart), clipped behind the window frames.
Their timing is deterministic and they are background decoration only.
