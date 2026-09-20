# Intro action and timing plan for Luna

> **20 September, later: the hero section was re-cut and this section of the
> document is now history.** The film is **30.73s**. The entrance runs on THE
> SURGE's bar grid (132bpm, downbeat on the door cut): launch on bar two,
> target cabinet into frame on bar four, takeoff on bar five, glass crossing a
> beat and a half later, the pack pulling up together on the 'and' of two in
> bar six. Runners are integrated velocity curves rather than position
> interpolations — the old Hermites sagged mid-runway because their endpoint
> speeds exceeded the mean speed their span allowed. The camera through the run
> is welded to Lorenzo and leads him in proportion to his speed, so the room
> streams at his pace instead of the old 24 u/s. The cabinet bank moved to
> x=700..1140 to give the run real distance. The closing shot now eases out to
> 560 world units, which reverses the earlier "no closing pull-back" rule on
> Peter's instruction. The power strip and vacuum no longer appear in any
> arcade-row shot, and posters hang one per bay on the cabinet pitch.

Status: implemented action pass, 20 September 2026. The numeric block below is now live in `src/game/intro.js` and `src/data/jokes.js`; the current runtime is 30.73 seconds, with the shortened socket insert paying for the longer shutdown hold. Captions remain in the source for later reading-time review, and alternate music selection remains a separate pass.

The final-cabinet wall constraint is explicit: the establishment frame has no conduit or loose wire dressing beside the last cabinet. Cabinet feeds leave from cabinet sides, drop to the floor before the next cabinet, and continue along the floor to the board.

## Implemented action-pass checkpoints

- Physical hand-to-rocker contact: **12.00s**. The switch is thrown by Eggshell's visible hand; the floor board and plugged-in vacuum stay in the separate service-room shot.
- Separate socket insert: **8.50–13.50s**. MCGFN-1 starts with all sixteen cells lit, empties last-to-first, and shares no frame with a cabinet.
- Cabinet brownout begins: **13.60s**. The cabinet row fails left-to-right after the socket is visibly empty.
- Door and run: **18.00s** door cut; the leaves finish opening at **18.42s** and reveal Lorenzo already idle. He holds the budget line until **19.37s**, starts first, and the followers enter closely from **19.55–20.27s**.
- Cabinet-free runway: the last follower clears the door at **20.27s**; the first cabinet remains outside the moving frame until **25.57s**.
- Lorenzo's early jump: launch at **26.45s**, flight **0.70s**, visible in-screen run **0.90s**, complete at **28.05s**. Followers keep moving and settle individually; they may pass once he is visibly inside.
- Final hold: **29.00–32.20s**, live first PLUMBER PANIC cabinet, reacting heroes, stable camera, no closing zoom-out. The close prompt appears at the end while the hero idle/celebration clock continues.

The action-only browser preview is available at `?goto=intro&introAction=1`. Actual-asset landscape and portrait stills are in [work/mockups/intro-film-geography/luna-action-pass](../work/mockups/intro-film-geography/luna-action-pass/).

## Approved direction

The black centre-parting service door opens fully to reveal Lorenzo already in an idle pose. He holds the budget line for roughly one second, then starts running. The other seven enter closely after his first steps; “EIGHT HEROES. ONE SOCKET. A RELAY BEGINS.” carries the shared runway. The dive beat is left visually clean so Lorenzo’s jump and screen run can read without another caption. Track the cast across the extended cabinet-free floor while every hero accelerates from their first visible step. Lorenzo is slightly faster, pulls ahead, and jumps up and forward from approximately one cabinet width away, entering the screen quickly without stopping, squatting, or using the normal hub windup. The others keep advancing and surround the machine. They may pass its centre once Lorenzo is visibly inside its screen, even while he is running off inside it. No artificial waiting zone or enforced empty ring. Keep the screen readable through composition and draw order. Each follower slows only at their final position, then reacts and idles; the close prompt does not stop those final idle/celebration motions.

Use actual game assets and the final food court's wall, floor, ceiling fixtures and poster vocabulary. Keep the black centre-parting service entrance: two leaves open from the middle outward. Omit drips and extra scenery; never show the repair counter. Eggshell is in a separate room with downward light. Socket and cabinets never share a shot. Each cabinet cable arcs from its side, drops before the next cabinet and continues along the floor to the board. Vacuum plugs into the floor board. Socket starts full, empties last-to-first before cabinets die. PLUMBER PANIC stays on at the end.

## Complete action sheet — implemented 32.20 seconds

Times are seconds from the first frame. Overlapping rows are intentional. Do not serialize overlapping actions or add waits at shot boundaries. No caption duration controls this pass.

| Time | Duration | Action and camera |
|---|---:|---|
| 0.00–4.00 | 4.00 | Establish the lit cabinet bank on the left and truck right across it. Real attract games animate, lights hum/flicker subtly, floor reflections follow subjects. No socket or counter. |
| 4.00 | cut | Hard cut to Eggshell's separate service room. No machines in view. |
| 4.00–6.50 | 2.50 | Eggshell flies into position; camera gently meets him. Rotor and hover continue. Overhead light points down. |
| 6.50–8.50 | 2.00 | Close locked camera for his threat; restrained expression change, continuing hover. |
| 8.50 | cut | Cut directly to hand/rocker framing. No pan down from his face. Floor board and subordinate vacuum establish physical contact geography. |
| 8.50–9.20 | 0.70 | Establish the powered rocker and approaching hand. |
| 9.20–11.30 | 2.10 | Bent arm reaches down; hand approaches the rocker continuously. No projectile, beam or remote trigger. |
| 11.30–11.85 | 0.55 | Fingers make contact and grip. Keep the rocker visible. |
| 11.85–12.10 | 0.25 | Hand physically presses the rocker through its throw. Snap at 12.00; strip light extinguishes on contact. |
| 12.10–12.50 | 0.40 | Brief readable contact follow-through on the now-off board. |
| 8.50 | cut | Separate socket insert, no cabinets. All 16 bank cells initially filled. |
| 8.50–8.58 | 0.08 | Establish the full bank, socket, vacuum branch and floor board before the first removal click. |
| 8.50–9.05 | 0.55 | Empty cells 16 through 1 in a rapid reverse cascade, one every 0.03 seconds, with a short socketDrop contact sound on each removal. |
| 9.05–13.50 | 4.45 | Hold the completely empty bank before cutting away. |
| 13.50 | cut | Return to the cabinet row, initially still lit, centred on the six-machine bank. No terminal in frame. |
| 13.60–14.34 | 0.74 | Six cabinets fail at 13.60, 13.72, 13.84, 13.96, 14.08, 14.20; each brief flash decays over 0.14 seconds. |
| 13.60–14.40 | 0.80 | Ceiling emission fades with cabinet shutdown; retain enough ambient light to read the room. |
| 14.40–18.00 | 3.60 | Dead-room callback beat with sparse screen static; no new action. The longer hold gives the blackout caption room to land before the door cut. |
| 18.00 | cut | Black centre-parting service door and empty runway. No cabinets. Hero sequence starts. |
| 18.00–18.42 | 0.42 | Two door leaves part from the centre and reveal Lorenzo already waiting in an idle pose. |
| 18.42–19.37 | 0.95 | Lorenzo holds the budget line in a readable idle beat. Keep the corridor light and his full silhouette visible. |
| 19.37–19.55 | 0.18 | Lorenzo starts running from the doorway. The followers have not crossed yet, so his lead reads immediately. |
| 19.55–20.27 | 0.72 | Seven followers cross the doorway closely behind him, already accelerating. The budget line carries through the doors shot; EIGHT HEROES. ONE SOCKET. A RELAY BEGINS. takes over at 20.10 and follows the run. |
| 20.27–25.57 | 5.30 | Full cast runs across the extended clear floor together. No part of any cabinet is visible. Track alongside them; do not zoom out to fit every trailing hero. Preserve individual separation and let every runner build pace from the first step. |
| 23.80–26.45 | 2.65 | Lorenzo's speed rises through the long approach and he pulls ahead without the followers slowing down. |
| 25.57–26.00 | 0.43 | First PLUMBER PANIC cabinet enters naturally from the right. Same continuous tracking shot. Camera begins easing its tracking toward the cabinet composition. |
| 26.10–26.45 | 0.35 | Target cabinet wakes into a fully lit playable screen, ready for Lorenzo's entry. It stays powered thereafter. |
| 26.45 | takeoff | Lorenzo launches from approximately one cabinet width before the screen. Preserve forward velocity. This is the quick jump-up-and-forward dive; no squat, stop, joystick grab or hub windup. |
| 26.45–27.15 | 0.70 | One rising forward jump into the screen, with perspective shrink concentrated near the glass. Camera settles on the target without a jump cut or zoom-out. |
| 27.15 | crossing | Lorenzo hands from outside to inside on the glass-crossing frame; the same dive object immediately becomes a running screen figure. Keep the caption area clear so the entry and run-off read. Passing the cabinet becomes permissible here. |
| 27.15–28.05 | 0.90 | Lorenzo visibly runs across the cabinet game screen and clears its right edge. There is no standing landing pose or extra hold. |
| 26.45–28.90 | overlapping | All followers continue toward their final positions during the leap, in-screen run and aftermath. Nobody waits for a cue or oscillates on a holding mark. |
| 27.15–28.90 | staggered | Individual final approaches, decelerations and settlements below. Followers routed to the right cross the cabinet only after the screen entry is visible. |
| 28.20–29.60 | staggered | Short individual reactions after settling; no synchronized celebration. |
| 29.00–32.20 | 3.20 | Quiet animated idle and small celebration around the live PLUMBER PANIC cabinet: breathing, blinking, looks and gestures continue. Camera remains on this composition; after 32.20 the close prompt is shown without freezing the heroes. |

The opening preserves a deliberate grievance/switch/socket sequence while the hero section now takes 14.20 seconds. Total 32.20 seconds leaves Lorenzo a clear idle beat, the ensemble a longer accelerating runway, and the final hold enough time to read the reactions. Tighten it later only after playback demonstrates dead air.

## Individual hero cues

Entrance means crossing the visible doorway threshold, not starting an offscreen animation. These implemented routes distribute heroes to both sides without forcing them into a crowded row. Final locations use the current hub-scale footprints and leave a readable gap around the cabinet rather than a fixed artificial ring.

| Hero | Door crossing | Final side | Deceleration | Settled | Small reaction | Idle begins |
|---|---:|---|---|---:|---|---:|
| Lorenzo | 18.42 | Inside cabinet | None before takeoff | n/a | Runs off inside at 28.05 | n/a |
| Rusty | 19.55 | Right, outer, x680 | 27.15–28.20 | 28.20 | Quick glance back / pleased nod, 28.20–28.65 | 28.65 |
| Fernwick | 19.67 | Right, middle, x635 | 27.15–28.50 | 28.50 | Small relieved response, 28.50–29.00 | 29.00 |
| B-33P | 19.79 | Right, near, x600 | 27.15–28.90 | 28.90 | Brief head/antenna response, 28.90–29.60 | 29.60 |
| Clara | 19.91 | Left, near, x520 | 27.15–28.30 | 28.30 | Looks up at the game, 28.30–28.75 | 28.75 |
| Kiko | 20.03 | Left, middle-near, x480 | 27.15–28.60 | 28.60 | Tracks Lorenzo inside screen, 28.60–29.05 | 29.05 |
| Ramon | 20.15 | Left, middle-far, x440 | 27.15–28.70 | 28.70 | Small hand response, 28.70–29.15 | 29.15 |
| Grumpos | 20.27 | Left, outer, x400 | 27.15–28.40 | 28.40 | Restrained nod, 28.40–28.85 | 28.85 |

The implemented right-side centre crossings occur only after the 27.15 screen entry. They are reached by continuous accelerating and decelerating paths; no position is clamped at the cabinet. Before that crossing each follower remains on a continuous trailing leg behind Lorenzo's launch point. Left-side heroes settle naturally while Lorenzo is still running inside, after the screen becomes visible.

The speed profile is explicit: Lorenzo launches at 76 world units per second,
accelerates to 120 on the long approach, then carries 120–148 through the
pre-dive leg. Followers enter in their run pose at 36–42 world units per
second, accelerate to 72–92 on a continuous
trailing leg that ends behind Lorenzo's launch point, then begin their
controlled final approaches at the 27.15 screen crossing; they remain in
motion through Lorenzo's screen run.

## Camera and motion implementation

- Rebuild the entrance-to-settlement as one overlapping sequence. Existing `doors`, `rollcall`, `lineup`, and `dive` caption boundaries must not create camera cuts, speed resets or waiting marks. The service door is a centre-parting pair, not a one-sided pocket door.
- Solve world positions and camera framing together. Size the empty runway so no cabinet pixels enter either orientation before 25.57. The cabinet bank now starts at x560, with the original cabinet pitch preserved.
- Use matched positions and velocities at movement joins. Grounded stride phase derives from cumulative travelled distance across every segment, including the final approach. A `moving: true` flag alone is insufficient proof of motion.
- Followers travel right continuously until their own final deceleration. Each follower starts at full running speed on its own doorway crossing and accelerates to a clearly faster pace from its first visible steps; the ramp is not hidden until the whole group is on screen. Their continuous pre-dive leg ends behind Lorenzo's launch point, then the final approach begins once his screen crossing is visible. No sine-wave holding paths, teleports, arrival poses or early ease-to-zero. Lorenzo launches first and is faster during the pull-ahead, without forcing followers to crawl.
- Keep running bodies facing their direction of travel; use eye/head changes to watch the cabinet. Turn toward the screen only when settling, where appropriate.
- Implement an explicit intro-only jump-entry configuration or adapter for `makeCabinetDive`. The normal hub entry retains its windup, timings and interaction. The intro uses no windup or set pause, an early start position, 0.70-second flight and 0.90-second readable run-off. Do not globally alter `DIVE_PHASES` or depend on capture-only query overrides.
- Keep all motion, camera, screen state and transitions deterministic from film time. Keep the target live after the dive object finishes.
- Prefer a stable final camera scale that can show the screen runner and the approaching cast. Occlusion should be solved with framing and depth, not by freezing characters or opening a conspicuous empty ring.

## Sound cue plan (timing only; no song selected)

- 0.00 onward: restrained live arcade ambience.
- 4.00: restrained Eggshell arrival cue.
- 12.00: physical rocker click exactly with contact; opening music cuts here.
- 12.58–13.03: sixteen rapid socketDrop clicks, last cell to first, synchronized to the disappearing plugs.
- 13.60: cabinet power-down begins; sparse static follows the cabinet failures through the 18.00 door cut.
- 18.00: door cue and energetic music entry; the doors finish opening at 18.42 with Lorenzo already idle, he starts at 19.37, and the followers begin 0.18 seconds later.
- 19.37–28.90: footsteps follow actual footfalls, with Lorenzo's takeoff first and the accelerating ensemble entering 0.18 seconds later. Remove rollcall 'pop' accents if they suggest stationary introductions.
- 26.45: jump takeoff cue. 27.15: screen-entry cue. 27.15–28.05: restrained in-screen running cues if readable.
- No automatic generic crowd-cheer bed at an old caption boundary. Final reactions should remain small.
- Alternate opening songs remain a separate audition/selection pass.

## Luna deliverables and review gates

1. Before editing animation, inspect current `src/game/intro.js`, `src/data/jokes.js`, `src/game/hub/cabinet-dive.js`, the final food court painters/layout, and local instructions. Preserve unrelated dirty work. Treat this document as newer than conflicting historical handover descriptions.
2. Produce actual-asset staging frames at doorway, full running group before cabinet reveal, early takeoff, visible screen runner with followers nearby, and final group. Include landscape and portrait. No generated substitutes.
3. Implement and render the continuous action-only cut with captions hidden for review. Supply the playable preview and actual final cue timings, noting any deliberate deviations from this sheet. Do not declare movement approved from stills alone.
4. Test continuous positive displacement and advancing stride for each visible runner until their final deceleration; no early idle. Verify the first cabinet is absent before reveal, right-side crossing happens after visible screen entry, inside Lorenzo remains readable, and target stays live. Compare seeking with stepped playback around entrance, takeoff, glass crossing, in-screen run-off and settlements.
5. Review complete landscape and portrait playback at normal speed. Report source tests, browser visual review, listening and physical-phone verification separately. Runtime-only browser success is not visual approval.
6. After action approval, restore/re-time captions, review reading time, synchronize production script and duration tests, and select music in its separate pass. Do not slow running or add poses merely to accommodate text.

## Implementation contract: what is fixed and what may be tuned

**Fixed user decisions:** action order; Lorenzo's entrance, stop and idle beat before the followers; followers stream out promptly; an extended shared run on cabinet-free floor with every runner accelerating from first visible steps; continuous tracking reveal; early upward/forward jump; no squat; no follower waiting zone; passage allowed once Lorenzo is visibly in the screen; readable in-screen run-off; live final cabinet; food court visual identity; no repair counter. Preserve the exact established character identities and real art.

**Blocking targets, not independent hard constraints:** individual follower crossing/settlement times, exact speed ratio, exact cabinet reveal second, final left/right assignments, and the 32.20-second total. These must be solved together. If geometry makes the table impossible at natural running speed, adjust these targets and publish the revised table. Never meet a timestamp by teleporting, crawling, sliding feet, compressing the cast, or pausing them. Keep Lorenzo's flight in the agreed 0.6–0.8-second range and preserve the 5.30-second full-group floor run used by the current blocking. If a material staging change is needed, describe the conflict before changing the user decisions.

The old requirement to wait until the entire in-screen run-off ends is superseded. Right-side followers may pass from visible screen entry onward. Some left-side followers may reach their final spots during that run-off and watch it. None idles before reaching their own final spot; quiet idle starts after Lorenzo's run-off. A settled hero can have a small attentive reaction during the run-off.

### First solve the travel, then the camera

1. Read the current hub's cabinet dimensions, hero draw scale, floor line and cabinet pitch. Use these world proportions; do not scale up the first cabinet to fill the shot. Establish a new intro-local coordinate origin at the door threshold. Keep hub gameplay geometry unchanged.
2. Measure representative running-pose widths for all eight heroes, including hands/attachments. At a shared speed `v`, a 0.12-second entrance separation produces only `v * 0.12` world units of longitudinal space. Check this against actual silhouettes before accepting the entrance table. Mild staggered depth and slight speed differences are allowed, but feet must remain grounded and the silhouettes individually readable. If needed, widen the follower stream to 0.8 seconds and adjust downstream blocking by that small difference. Do not solve overlap by shrinking heroes.
3. Author a positive velocity curve for each runner and integrate it into position. The current pass accelerates every grounded runner from the doorway across the long runway, then uses a monotonic Hermite segment for final deceleration. Match position and velocity at joins, ending at zero velocity exactly at each final mark. Check for overshoot before accepting the curve.
4. Calculate Lorenzo's launch position from the chosen door position and integrated velocity at takeoff. Place the target glass roughly one cabinet width ahead of that launch point. The cabinet is stationary; camera movement reveals it. Place the remaining cabinets at hub-like pitch after it, and the terminal well beyond that row.
5. Solve follower destinations and crossing times from these same velocities. First three followers can use the right side; the later four remain left. If a right-side destination would require an unnatural speed change, shift its final mark or arrival time. No positional cap linked to `DIVE_AT`, no hold at a runway mark, no release when a boolean changes.
6. Maintain one cumulative distance value per hero for stride through entrance, cruise and gathering. The phase must continue across segment boundaries; avoid setting the stride origin to the current position on each frame. Stop foot travel only as actual speed reaches zero.
7. Publish a numeric blocking table in the delivered handover: door x, cabinet x/width, each hero's entry time, cruise speed, launch/centre-crossing time, final x, deceleration start and settlement time. Include world units and seconds. Do not leave those as unreported constants in code.

### Camera contract

- Hard cuts occur at the row-to-Eggshell room, threat close-up, hand insert, terminal insert, dead row and door reveal. From door opening through final group, use one continuous camera path. Caption/shot IDs must not reset that path.
- Track with Lorenzo approximately in the right half of the picture and followers trailing across the middle/left. Once the last follower emerges, provide at least one clear full-cast view during the shared run. It is acceptable for a trailing hero to leave the frame later. Do not keep all eight visible by crowding them or continually zooming out.
- Use normal hub-like character/cabinet scale as the starting point. A gentle push toward the target is allowed during its reveal and the early jump, completed by visible screen entry. No camera change may make the cabinet appear to grow independently of the room.
- Hold the door reveal on a wider box (landscape world width 320, portrait 260) so more of the accelerating pack is visible before the camera begins to travel. Keep that opening composition until the last follower has crossed; then track through the long runway into the cabinet reveal (runway widths 400/340). As Lorenzo crosses into PLUMBER PANIC, ease the camera toward the cabinet centre over `PULL_OUT_SEC` (six beats), then stop the pan and hold that centre through the reactions.
- Before cabinet reveal, compute the visible world interval from the actual picture gate and zoom. The leftmost rendered cabinet extent, including protruding marquee or reflection, must remain outside that interval. At reveal it crosses the right edge naturally. Do not suppress cabinet drawing with a time flag while its location is visibly inside the shot.
- Keep the socket outside every cabinet frame, including reflections. Never draw a repair counter, its staff, sign or reflection in the film.
- The camera settles without a velocity jump by screen entry. The cabinet-centred framing is reached during the group gather, then remains fixed for the final reaction hold; do not add another pan or zoom after it.
- Landscape and portrait use the same world paths and action times. Camera boxes may differ. Test the actual portrait picture gate, not just viewport aspect ratio. Do not shrink the cast to force the landscape composition into portrait.
- If portrait cannot show the screen runner legibly while retaining every follower, prioritize Lorenzo and nearby followers; trailing characters can move outside the frame. Keep the cabinet fixed and readable while they arrive.

### Intro-only jump dive: specific code hazard and required fix

Current code to inspect: `CabinetDive.seek()` in `src/game/hub/cabinet-dive.js`. The leap branch interpolates from `this.cabX` to `this.glassCx`; `startX` affects the preceding windup only. Therefore passing a distant `startX` and skipping windup via `DIVE_LEAP_AT` alone WILL teleport Lorenzo to the cabinet. Do not use that as the solution.

Preferred approach: add an explicit optional entry trajectory/phase configuration to the shared dive, with unchanged defaults for every normal hub caller. Alternatively use an intro adapter that owns the outside flight and hands off into the existing clipped screen rendering at a matched seam. In either approach:

- Start the outside jump at the exact last running position, scale, stride and forward speed. Use the jump pose immediately; no standing crouch or foot shuffle. Flight rises toward the CRT rather than hovering over the cabinet roof.
- Aim at an entry point within the screen, left of centre if this gives a clearer rightward run-off. Do not aim at the cabinet base or joystick. Keep all screen coordinates derived from `cabinetScreenRect` / `cabinetScreenGeometry` rather than guessed pixel offsets.
- The 0.70-second flight ends on the visible glass crossing. The current pass launches at 26.45, crosses at 27.15, then runs inside for 0.90 seconds to 28.05. No windup, landing hold or separate standing set phase.
- Define a named `screenVisibleAt` milestone: Lorenzo is visibly rendered within the CRT clip by this time. It governs follower passage, not the end of the dive and not merely an internal `inside` flag set before the pixels become visible.
- Exactly one Lorenzo is drawn across the seam. Match outside/inside position and apparent size at handoff. The CRT's bezel, scanlines and gloss continue to overlay the inside figure correctly.
- Keep impact flash short and restrained so it does not mask the beginning of the run-off. Give the miniature hero enough contrast against the real PLUMBER PANIC attract scene to track his legs and direction. Start him far enough left to traverse a useful visible distance; do not let most of the 0.90 seconds occur behind the bezel.
- This intro's in-screen finish is a clear rightward run off the screen edge. The normal module currently adds a late runoff jump; disable that for this intro configuration if it sends him through the top or abbreviates the visible run. Normal hub behavior remains unchanged.
- Let followers pass nearby in the room without covering Lorenzo's head/body for the entire screen run. Adjust composition, body depth or final positions; do not open a conspicuous empty ring. Keep normal physical cabinet/hero scale.
- Derive cues from the configured phase milestones. Intro scheduling owns sounds once; the silent dive object must not fire duplicate cues. Backward seeking fires no skipped sound.

### Food court set: precise reuse boundaries

Inspect `HubState.ceilingFixtures()`, the food court draw path using `drawPoster`, `posterLook`, `drawCeilingLight`, the shared wall painters, and `drawFoodCourtFloor` in `src/game/hub/index.js` and its imported sprite modules. Use the actual final food court as the reference, not the older intro wall-bay arrangement.

- Posters belong above cabinets; strip fixtures occupy the gaps between posters/cabinets at the same repeated pitch. Continue that wall/lighting vocabulary through the empty runway without adding cabinets as decoration.
- Match wall palette, poster proportions/material, fixture housing, floor trim, floor tiles and restrained reflections. Preserve a readable ambient fill after shutdown.
- Keep lighting fixtures anchored in world space; they must not slide with the camera. The ceiling-light helper's `viewX` is a view-relative fixture position for beam lean, not the absolute left world boundary. Inspect current callers before passing arguments. Eggshell's separate room uses a centred downward beam.
- Omit drip emitters, puddle effects and unrelated clutter. Avoid importing the whole interactive hub state just to obtain scenery; use/extract pure painters as needed.
- No station UI, interaction prompts, repair counter or shop service area. Keep the story's terminal far right in its dedicated insert only. Cable geography remains continuous even where it is offscreen; cables drop from cabinet sides to the floor, and the wall beside the final cabinet carries no wire or conduit dressing.

### Caption-free review and timing ownership

Provide an explicit dev preview option to hide captions without changing the film clock or action. Retain the authored captions in source for the later text pass. Keep skip/back usable during review. Label preview outputs as action blocking. Do not silently replace the production narrative with permanently missing captions.

The existing `INTRO_SHOTS` beat counts currently own timing. For this pass, make the agreed second-based milestones authoritative: either introduce explicit seconds with a backward-compatible resolver, or derive data consistently from one action timeline. Do not maintain independent copies of milestone numbers in camera, sound and hero code. Music follows the action timing; it must not pull a 0.50-second entrance delay onto a different beat grid. Update the focused runtime expectation when implementing the new cut; do not preserve 38–40 seconds as a test requirement.

## Verification specification and delivery package

### Automated checks that demonstrate the behavior

- Sample each visible runner at 60 Hz from entry until final settlement. Assert positive forward displacement outside the final deceleration, continuous position at every join, no reversal or stationary interval, and advancing distance-based gait. Check the displayed pose, not only `moving` metadata.
- Confirm Lorenzo crosses first; the next crossing is 0.50 seconds later; all seven emerge within the agreed stream window. Validate visible doorway crossing, not spawn time behind the leaf.
- Check each right-side follower's leading body extent stays before the cabinet centre until `screenVisibleAt`. Report the actual crossing times. Allow natural proximity; assert no arbitrary minimum-radius gap.
- Validate cabinet projection bounds before and during reveal in both orientations, including reflections. Confirm cabinet and terminal never appear together and Eggshell shots contain no cabinet.
- Probe dive continuity at takeoff, start/end of crossing, landing and run-off. Verify no windup pose, continuous outside-to-inside scale/position, visible in-screen movement, exit via right edge, and a fully live target afterward.
- Compare a fresh `seek(t)` state with a state actually advanced through fixed steps plus a final fractional step to the same `t`. Include all segment boundaries ±1/60 second and midpoints. The current test's direct `fingerprint(t)` comparison alone does not prove seek-versus-play equivalence. Fingerprint displayed position, feet height, scale, pose/gait, camera, visibility, screen state and reaction state. Decorative particles may be excluded explicitly.
- If shared dive code changes, run its relevant existing tests and verify the ordinary hub jump-entry AND use-entry paths retain their behavior. Do not update unrelated goldens or weaken tests to get a pass.

### Visual review evidence

Save real game renders under `work/mockups/intro-film-geography/luna-action-pass/` with descriptive filenames. Deliver landscape and portrait videos (or an equivalent deterministic frame playback) of the whole film and the 18.00–32.20 hero section. Review at normal speed first, then frame-step the entry seam. Browser console success is only a runtime check.

Required stills: `01-door-first-runner`, `02-followers-emerging`, `03-all-running-no-cabinets`, `04-cabinet-entering-frame`, `05-early-airborne-jump`, `06-lorenzo-inside-followers-nearby`, `07-last-follower-settling`, `08-final-live-cabinet`. Add orientation suffixes. Capture from the implemented sequence; no separately staged fake composition.

For every acceptance item, record PASS / NEEDS ADJUSTMENT / NOT CHECKED:

1. Fast, fluid continuous chase with no intermediate poses or waits.
2. Clear 0.50-second entrance lead and readable follower stream.
3. Full-group run before any cabinet is visible.
4. Natural target reveal and early upward/forward jump.
5. Clearly visible Lorenzo running inside while others continue nearby.
6. Natural arrival spacing, individual settlement, no forced ring.
7. Food court visual match and all forbidden scenery absent.
8. Powered target and stable final camera.
9. Landscape browser review; portrait browser review.
10. Sound synchronization listening; physical-phone review (separate, never inferred from desktop emulation).

Deliver: updated timing script reflecting actual implementation, numeric path/camera parameters, videos and stills, focused test results, any shared-dive regression results, build status with unrelated failures identified, and a short remaining-issues list. Do not describe action as approved until Peter has reviewed the continuous result. Continue the authorized action implementation and validation without stopping for permission between routine steps; captions and music selection remain the later pass.

## Copyable instruction to start Luna

Read `docs/INTRO_ACTION_PLAN_LUNA.md` and applicable repository instructions, then implement its action-first intro revision. This document supersedes conflicting historical staging in `docs/INTRO_FILM_HANDOVER.md`. Preserve unrelated work. First solve the movement/camera geometry at real hub scale, then implement the continuous run and intro-only early jump dive. Provide actual-asset landscape/portrait playback and the full actual timing sheet for review. No captions-driven pauses, no forced follower gap, no changes to normal hub dive behavior, and no repair counter. Follow the verification and delivery checklist in this plan. Keep alternate music selection separate.
