# Act-ending transitions — beyond the cabinet

Date: 1 November 2026.

Status: design write-up following the animated concept demo. The demo exists; the dramatic treatment described here has not been integrated into the campaign. This document specifies presentation changes to the existing continuous handoff, not a replacement encounter system.

## Intent

Make leaving 3-3, 6-3 and 9-3 feel like escaping the game into the physical machinery behind the arcade cabinets. The emotional progression is discovery, pursuit, then confrontation.

The transition should have anticipation, a tangible threshold, and a reveal. Preserve continuous forward movement: Eggshell escapes first, the hero boards the tub, and the camera travels sideways through the cabinet casing into the service passage. Darkness and foreground structure briefly conceal the crossing; light and sound establish the larger space beyond it.

Target roughly four to five seconds from the finish tape to a readable, playable chase. Timing should follow existing movement and beat-aware boarding rather than forcing every hero into an identical canned animation.

## References

- [Animated demo](http://localhost:8001/act-ending-drama.html)
- [Standalone demo HTML](../work/mockups/act-ending-drama/index.html)
- [Demo source](../work/mockups/act-ending-drama/demo.js)
- [Existing flight handover and invariants](ACT_ENDING_FLIGHT_HANDOVER.md)
- [Existing encounter plan](ACT_ENDING_FLIGHT_PLAN.md)

Rebuild the standalone demo from the repository root with:

```sh
node work/mockups/act-ending-drama/build.mjs
```

This writes the saved HTML and `dist/act-ending-drama.html`. The demo offers act selection, replay, pause, scrubbing and optional synthesized sound cues.

## Shared sequence

Times below describe the demo's approximate dramatic beats, measured from its opening. Production timing must be fitted to the real finish tape, hero jump and camera travel.

| Approximate time | Picture | Purpose |
| --- | --- | --- |
| 0–0.65 s | Eggshell accelerates towards the edge of the game and disappears beyond the casing. The hero keeps moving. | Establish that the villain knows a route outside the screen. |
| 0.65–1.4 s | The tub arrives beneath the hero's existing jump; landing gives the hull a small settling motion and thrust builds. | Make boarding physically convincing and keep momentum. |
| 1.4–3.25 s | The glowing glass edge passes, followed by a recessed bezel, dark internal boards, cables and a close structural brace. | Give the cabinet thickness and briefly conceal the change of rendering space. |
| 3.25–4.6 s | The act-specific reveal resolves. Headlights, room lighting and one large electrical fitting establish depth and scale. | Give each act a distinct dramatic payoff. |
| From about 4.6 s | Hero and Eggshell are clearly visible in their flight positions; normal chase presentation takes over. | Make the return to player control readable. |

The demo continues to six seconds to show the resulting composition. That extra hold is a review aid, not a requirement to delay gameplay.

### Cabinet crossing

Use the actual cabinet's palette and edge treatment. Show a short, readable slice of its interior: one board, a few hanging wires and one substantial brace. The hero and Eggshell must each pass behind opaque casing when their run and flight renderers exchange ownership. Preserve apparent size, position and velocity across that occlusion.

Avoid a full-screen fade, a camera stop or a separate boarding scene. The dark interval belongs to a real object passing in front of the camera. Keep enough visual information to understand travel direction.

### Scale and lighting

One oversized mains plug, trailing cable or ventilation fan should provide the dominant scale cue. Cabinet backs remain the supporting background. Use restrained parallax: close structure moves fastest, cabinet backs more slowly.

A soft tub headlight beam can reveal a cable or cabinet back before the passage is fully visible. Keep the hero and route readable throughout. Lamps should ramp on or dim once; no repeated flashing or strobing.

## 3-3 — discovery

Eggshell slips through the cabinet edge. Inside the machine, the colourful runner world gives way to dark boards and ventilation gaps. The tub's headlights catch a nearby cable and then the first cabinet back.

Overhead service lamps illuminate in a short sequence ahead, revealing the passage's length and Eggshell farther along it. Allow a brief readable view of this unexpected space before combat begins.

The feeling is: “There is a whole place behind these games.”

These reveal lamps are local service lighting. They must not imply that the first power bank has already been restored; bank restoration remains the reward for winning the fight.

## 6-3 — pursuit

The hero recognises the route. Previously restored power-bank lamps remain lit according to actual saved progress. Eggshell's escape is more urgent: he triggers a maintenance shutter behind him.

The shutter starts descending while the hero approaches, but remains safely above the tub until the whole vehicle clears its plane. It slams shut behind the hero with one short metallic impact. Keep the structure moving past the camera so the chase never appears to halt.

The feeling is: “He is trying to shut us out.”

This is automatic choreography, with no collision, timed input or surprise damage. Validate full tub and hero clearance rather than judging only their centres. The demo's shutter is a rough timing silhouette; production art and clearance still need work.

## 9-3 — final confrontation

Eggshell escapes in his established balloon. The passage initially shows the power restored by earlier victories. As the hero emerges, nearby service lighting dims in sequence towards the balloon; a restrained electrical cue suggests Eggshell is drawing power.

The room becomes quiet and ominous. The balloon's silhouette reads first, then Eggshell and the basket become clear in the headlight spill. The flight begins with the villain dominating the space ahead.

The feeling is: “He has been waiting for us here.”

Treat this as a temporary visual load or local lighting disturbance. Do not remove earned power-bank progress, award the third bank early or trigger BACKUP POWER. The balloon fight, false defeat and later machine phase retain their existing order and checkpoint rules. Keep the entrance electrical cue distinct from the later BACKUP POWER sequence.

## Sound direction

As the camera leaves the game, briefly narrow and soften the music so it feels as though it is coming from a cabinet speaker behind the hero. Bring the tub engine, ventilation hum and room sound forward. Restore the chase mix as the passage opens.

- **3-3:** a few restrained lamp/relay clicks and the sense of a larger room opening up.
- **6-3:** shutter motor, one solid impact and a short metallic decay.
- **9-3:** a descending electrical hum and a brief reduction in musical density before the confrontation settles.

Keep authored song tempo, beat phase and hurry behaviour intact. Do not restart the song to hit the reveal. Use the existing audio scheduling and lifecycle; avoid creating a second playback engine or expensive per-frame audio work. Remove temporary filtering and stop transition sounds on handoff, exit, restart and interruption.

The demo's oscillator tones only indicate cue placement. It does not demonstrate the proposed cabinet-speaker filtering, production engine sound, reverberation or final musical treatment. Listening approval remains outstanding.

## Implementation boundaries

The repository had concurrent flight changes when this write-up was prepared. Inspect the current diff and coordinate ownership before editing shared files.

| Area | Expected responsibility |
| --- | --- |
| `src/game/flight/acts.js` | Small declarative per-act presentation choices if needed; retain the existing stage mapping and progress-based bank calculation. |
| `src/game/run.js` | Extend the existing approach/board/slide path; retain beat-aware boarding and continuous motion. Coordinate new reveal cues with `startFlightSlide` and `handFlightOver`. |
| `src/game/flight/scene.js` | Shared cabinet interior, foreground fitting, shutter and lighting painters. Both sides of the handoff must draw the same scene. |
| `src/game/flight/state.js` | Continue any unfinished presentation clock or light ramp seamlessly after handoff. Enable normal encounter presentation at the appropriate point. |
| Existing audio integration | Schedule the temporary sound treatment and guarantee cleanup. |

Use the current presentation frame and portrait layout rather than the demo's fixed 480×270 staging. Keep portrait actor spacing and the existing input handover. A held JUMP must retain its current documented behaviour.

Preserve finish-tape checkpoint creation, deferred rewards, retry seed, saved-flight resume, EXIT/RESTART semantics and all encounter mechanics. Saved-flight resumes should follow the existing resume path without replaying the cabinet escape.

Bake static board/casing detail and reuse existing caches. Author new raster-backed detail at the project's normal supersampled resolution without changing logical footprints. Keep dynamic lighting to a few inexpensive shapes; avoid full-frame blur, live shadow filters, unbounded particles and new per-frame allocations. Measure transition cost against the current version before accepting it.

For reduced motion, remove optional shake and abrupt acceleration effects; retain the necessary continuous crossing with gentler lighting ramps. The demo starts paused when reduced motion is requested, but that is a review-page behaviour, not the campaign accessibility design.

## Review and acceptance

1. Record all three real stage exits, showing the finish approach through the first playable chase seconds. Review landscape and phone portrait at normal speed.
2. Check boarding, cabinet occlusion and the handoff frame by frame: no duplicate actors, disappearing tubs, scale jumps, exposed background gaps or sudden speed changes.
3. Confirm the shutter closes only after full clearance; confirm 9-3 lighting leaves the hero and villain readable.
4. Exercise pause/resume, held input, resize/orientation changes, restart and saved-flight resume. Verify that no cue repeats or temporary audio treatment leaks.
5. Verify power-bank lighting from actual saved victories, including replaying stages with different progress states.
6. Run the relevant existing flight-exit, flight-prototype and flight-checkpoint checks, plus the build. Compare frame-time and audio behaviour on a representative phone.
7. Obtain motion/feel and listening review in the real game. Demo rendering and source checks do not establish campaign, device, performance or audio acceptance.

The present demo establishes the visual direction and rough timing. Its simplified stage backdrop, fixed hero, lighting shapes, shutter, electrical line and synthesized tones remain concept material. Production work should reuse the existing seamless handoff and refine these elements within it.
