# The opening film: staging, script and the switch throw — handover

> **20 September, evening: the switch throw is now a SIT.** The grey reach with
> the pincer is gone. Eggshell drops onto the switch end of the power strip and
> the tub's own weight throws the rocker (option F of a seven-way bake-off);
> he gloats once he is on it, sparks squirt out from under both ends of the
> hull on the cut, and a held-back `copterBonk` lands a hair ahead of the
> existing `stripThrow`. The MCGFN-1 plate is now 49x32 — his tub's width, not
> wider. `IntroFilm.copterAt` returns `seat`/`drift`/`tilt` instead of `reach`.

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

> **20 September: action-first pass implemented.** See
> [Intro action and timing plan for Luna](INTRO_ACTION_PLAN_LUNA.md) for the
> authoritative 32.20-second timing and current staging. It supersedes the
> entrance timing, normal cabinet-dive behavior, and forced follower spacing
> described in the historical notes below. Followers may pass once Lorenzo is
> visible inside the cabinet screen, while his in-screen run-off remains clearly
> visible. The establishment wall beside the final cabinet is intentionally
> clean: no conduit or loose wire dressing appears there; cabinet cables drop
> to the floor and run to the board.

**Date:** 2026-09-20
**Area:** `src/game/intro.js` (the eleven-shot opening film), its shot data in
`src/data/jokes.js`, the centre-parting service door, the cabinet dive ending, floor
reflections, and a new `stripThrow` sound cue.

## Executive summary

Peter reviewed the rebuilt opening film and raised a set of staging corrections.
The core staging, script, switch cue, terminal treatment, and deterministic seek coverage are now
implemented. The remaining separate pass is the opening music sweep.

The film still runs on one seekable clock and every change preserves that: the
whole picture is a function of `t`, so `seek(t)` lands on the right frame. That
contract is the thing most at risk in any further work here — see **Do not break
this** below.

The implemented action pass is **32.20s**. The centre-parting doors open to
reveal Lorenzo already in an idle pose. He holds a clear beat under the budget
line, starts first, and the full cast follows closely on a long accelerating
runway before he breaks ahead. The first PLUMBER PANIC cabinet
stays beyond the last hero mark. The duration gate is 32–34s
(`tests/intro-sequence.js`); the action timing spends its time on readable
running, the physical switch, the socket reveal and the dive rather than a
static lineup. Older 38.474s references below are historical notes.

The previous action pass reported `node tests/run-all.js` → **ALL SUITES PASSED**;
the runner intentionally skipped 38 optional browser suites that require a
separately installed Chromium. This timing revision updates the focused intro
contract; verification is pending the end-of-pass review.

## Polish pass — shot sheet and implementation status

The current source has eleven shots. The shot-level script and durations are now
also recorded in [`docs/SCRIPT.md`](SCRIPT.md), so the production script and
`INTRO_SHOTS` no longer describe different films.

The final pass keeps the dedicated 1.80-second terminal insert before the
cabinet brownout: the socket bank empties first, then the cabinet row dies in a
frame centred on the six-machine bank in both orientations.
The authoritative shot lengths are second-based: doors 2.10s, rollcall 4.80s,
lineup 1.10s, dive 3.00s and wide 3.20s, for 32.20s total. Captions and music
are scheduled from that same clock.

The MCGFN-1 destination is now a larger wide yellow Type B terminal in a
dedicated far-right insert, with one white receptacle and a 4x4 bank that is
fully filled on the cut. Its cells empty deterministically from the last cell
back to the first while the board, vacuum branch, and floor cords stay in frame;
no cabinet is visible in that shot. The closing shot stays on the first PLUMBER
PANIC cabinet and the reacting heroes instead of zooming out to the terminal.
Lorenzo now has a deliberate reveal beat: the black centre-parting door opens
fully onto him already idle under the budget line. He starts running first; the
other seven enter closely behind him and `EIGHT HEROES. ONE SOCKET. A RELAY BEGINS.` runs over
the shared runway. The dive beat stays caption-free so the jump and screen
run-off read clearly. Every runner accelerates from their first visible step.
Lorenzo is slightly faster and dives into the first cabinet; the other
seven keep moving through the jump and run-off, then gather on staggered
film-time legs with a deliberate gap around the target, whose screen stays fully
live through the final hold. The light from
the centre-parting door is a centred downward wedge, so it reads as light from
the doorway rather than a diagonal spotlight.

The fingerprint now includes displayed hero positions, the observer gathering,
and the dive's position/inside/flash state. Tests also assert that the target is
beyond the last mark and that its wake remains fully live through the final hold.

## What was wrong, and what was done

### 1. The close prompt was cut off in landscape — fixed

`PRESS ENTER OR CLICK TO CLOSE` was drawn at `gate.capBottom + 12`. In landscape
`introGate()` returned `capBottom = H - 14` with `H = 270`, so the prompt sat at
y=268 and its ink ran to ~274.8 — below the frame. The landscape branch also
ignored `frame.safeRect` entirely, while portrait honoured it *and* reserved room.

Both branches now publish a `promptY`, landscape reserves a `PROMPT_BAND` (14) and
reads `safeRect.bottom`, and the draw call uses `gate.promptY`. A landscape phone
has a home indicator too, which is why this is not simply `H - 14`.

### 2. Heroes now arrive through a centre-parting door — done

The intro uses a dedicated `DOOR_PALETTES.service` centre-parting door in
`src/sprites/arcade.js` — `variant: 'split'`, with two leaves that retract
from the centre seam. Its `icon: 'none'` sign colour stays unlit, while the
centred sensor and corridor light make the opening legible. The shared door
painter now supports this mechanism without changing ordinary hub doors.

### 3. They run together instead of popping or lining up — done

Previously each hero popped at a fixed `heroX(i)`: alpha up, a scale bulge, a
14-unit rise. Now the entrance is a set of **legs** (`HERO_LEGS`), each a start
time, a start and end x, and a duration:

- The black centre-parting door opens fully to reveal Lorenzo already idle. He
  holds the budget caption for roughly one second, starts running, and the
  seven followers enter closely after his first steps.
- The other seven run in separated lanes behind him. Each begins at full running
  speed on its visible doorway crossing and accelerates to a faster pace
  from its first on-screen steps. Their first leg ends behind Lorenzo's launch
  point, so none can read as the leader before the jump; they fan out into
  their final marks only after his screen crossing is visible.
  The camera is wide enough to let trailing heroes fall off the frame rather
  than crowding the group.
- They keep advancing through the runway and Lorenzo's complete dive/run-off.
  Their stride reference stays continuous through the final approach. Only at
  their final marks do their feet settle and their standing reactions begin.

`heroPosAt(t, i)` walks a hero's legs and returns `{ x, moving, ref, since }`.
Stride phase is driven by **distance travelled** (`gaitOf`), not by the clock —
driven by time the feet slide, because the same cycle covers a different number of
units for every hero. Walking and running are both `kind: 'run'`; only the
distance-per-second differs, so the walk's legs turn over slower for free.

A hero still inside the doorway is clipped in x to the near side of
`openingEdge(...)` (imported from `hub/door-walk.js` — that function is pure; the
`makeDoorEntry` *driver* is stateful and deliberately not used). He is never
scaled: walking through a door is an occlusion, not a perspective trick.

The running entrance has no stationary `popSmall` arrival cues. The relay is
carried by continuous footsteps and the authored door/jump/cabinet cues.

### 4. Floor reflections were dead code — fixed, and extended

**This is the one to know about.** `intro.js` called
`addFloorReflection(band, heroSubjects)` with a bare *function*. That API
destructures `{ draw, height, lift }` from a subject object and returns early when
`draw` is not a function (`reflections.js:193`), so **the film had been rendering
no reflections at all**. Peter asked for floor reflections; they were already
wired, just silently doing nothing.

Fixed to the object form, and the single band now also takes the cabinets and the
copter. Order in a band is depth — later is nearer — so it goes row, copter, cast.
The copter states a `lift` because it never touches the floor. The `cam.zoom < 3`
gate is unchanged and load-bearing: the band sizes a scratch canvas off device
pixels and the `reach` shot reaches 5x on a frame with no floor in it.

### 5. The ending is now a cabinet dive — done

Peter's call: **the dive replaces the static lineup**. `lineup` carries a
1.10-second moving relay continuation; the `dive` shot runs 3.00 seconds;
`wide` stays on the reaction for 3.20 seconds.

Inside the `dive` shot: the line breaks, Lorenzo runs the length of the dead row
and leaps into a machine, and the seven he leaves behind watch him go. It reuses
`makeCabinetDive` from `hub/cabinet-dive.js` — standalone, clock-driven and
seekable. It is **built once** (keyed on `presentationFrame().revision`, because
the screen geometry it solves reads the live `H`) and never ticked: `diveAt(t)`
calls `seek(t - DIVE_AT)` and hands it back, the same shape as `copterAt(t)`.

It is constructed **silent** — `sfx`, `voiceSfx`, `voiceReverse` and `shake` are
all null. Its own cue firing is high-water-mark with a cursor `IntroState.seek`
cannot re-arm, so the leap's sounds are authored on the shot's cue sheet with
everything else in the film.

Two things that were not obvious and are worth keeping:

- **The Plumber's Panic machine wakes through a brownout and stays live.** He
  cannot dive into a dead cabinet: the interior the dive paints is tinted to the
  dead screen's near-black (`#101018`) and is simply not there. `diveCabWakeAt(t)`
  ramps the target as he runs at it, and the post-dive branch keeps the fully
  live cabinet on through the final reaction instead of reverting to dead glass.
- **He does not come back.** After `DIVE_AT` hero 0 is skipped in the line and in
  the contact-shadow pass. He is inside; the film does not get him back.

The seven track him as he passes — each is facing *left*, back down the row he is
coming along, until he draws level, then right after him — `faceSurprised` while
he is on the floor and `faceJoy` once the glass takes him. They keep running
behind him through the complete exit/run-off phase, then gather in staggered
beats and keep reacting around the live machine through the final `wide` shot
rather than reverting to neutral.

He is drawn **last** while breaking, so he passes downstage of the line. In index
order the seven he runs past each painted over him in turn.

### 6. Script — the motive, and the line nobody understood

**The motive.** The forty-year grudge is canon everywhere else in the game — the
1-1 briefing, three taunts, `docs/CAST.md`, `docs/GAME_BIBLE.md`, and
`tests/story-beats.js:387` — and the intro was the one place that skipped it, so
"IF HE CANNOT WIN... NOBODY PLAYS" arrived as a whim. `docs/SCRIPT.md:622` admits
the gap outright. The `arrival` caption is now:

> DON K. EGGSHELL, PHD.
> FORTY YEARS OF DEFEAT BY PLUMBERS.
> NEVER ON TOP.

The `threat` lock-off is unchanged — it is quoted in CAST.md and GAME_BIBLE, and
it now lands as the end of a grievance rather than a whim.

**The blackout line.** The static callback was not landing as a joke. The new
line gives Eggshell a dry, self-awarded victory:

> THE ARCADE GOES DARK.
> EGGSHELL TAKES THE CREDIT.

Caption length is not a timing constraint: captions cascade per line at 0.07s
stagger and `fitProse` steps the type down to fit the band.

### 7. The switch throw — new cue and a spark

The rocker fired `clickHard`, which is three layers with no body, no sweep and no
tail — and which is *also* the run's finish plunger, so per the house rule the
recipe was not the thing to edit. New cue **`stripThrow`** in `audio.js`, modelled
on `switchFlick` but darker and heavier, and one gesture: every layer lands inside
16ms, because the shot's own note says two ticks read as a fumble. No bright
"circuit" answer — nothing good happens next, and `powerDown` is already scheduled
behind it with the whole sweep.

Measured through the real graph:

| cue | length | peak | RMS |
|---|---|---|---|
| `stripThrow` | 0.22s | -5.8 | -26.3 |
| `switchFlick` | 0.30s | -7.2 | -27.2 |
| `clickHard` | 0.05s | -7.9 | -31.5 |

Levelled against `switchFlick`, its opposite number, per the RMS rule.

The rocker itself still snaps: the strip painter branches hard on live/dead and it
is the hub's painter, not the film's. The throw gets its moment from a contact
spark at `ROCKER_X/ROCKER_Y` on the cut frame instead.

**Beat revision for the power-off moment:** this is a dedicated close insert
rather than Eggshell apparently sending a shock through the socket. Cut tight
to his hand throwing the physical rocker on the power strip, with the switch's
two-state snap clearly visible. Land `stripThrow` on that gesture. Then cut to
the separate far-right MCGFN-1 insert: the fully filled 4x4 bank empties from
last to first while the floor board, vacuum branch, and cords remain readable.
Only after that insert does `powerDown` travel through the room and the cabinet
row fail. The terminal never shares a frame with the cabinets. The
cause-and-effect order is: hand, rocker, power strip, terminal response, arcade
brownout.

The insert must remain part of the same seekable clock: its framing, bent hand
pose, rocker state, socket progress, spark, and light falloff all derive from
shot time rather than an accumulated switch state. A separate actual-asset still
study also compares the alternate action of pulling the plugs from MCGFN-1, with
no projectile or beam, before that option is selected for production.

Two registrations are **enforced by test** and were easy to miss — a new cue needs
a row in `tools/sfx-desk-entry.js` and an entry in `src/data/sfx-birthdays.js`
(`node tools/sfx-birthdays.js`). The date stays `null` until the cue is committed,
because it is derived from `git log -S`.

### 8. The name — decided, no work

Peter's call: **keep DON K. EGGSHELL, PHD exactly as is.** Three jokes in four
words, the art is literally an eggshell, and the credits sequel sting is built on
it. For the record, a rename would have been cheap — ~40 player-visible strings,
~200 identifiers, and **nothing touches saves** (`src/engine/save.js` has zero
hits). `docs/` has the full candidate list if it comes back up.

## Still open separately

1. **The opening music selection — audition pass rendered; selection still open.**
   Peter asked to trial new opening themes rather than reusing THE SURGE, or
   remixes of it. The film opens on
   `TITLE_THEME` and hard-cuts to `SURGE_THEME` at the `doors` boundary, after
   the dark and separate terminal inserts.
   Follow the shop-theme precedent exactly: one song module per candidate in
   `src/data/songs/` with `group: "audition"`, a registry like
   `src/data/shop-themes.js`, and a sweep runner modelled on
   `tools/render-shop-theme-auditions.js` writing to `work/auditions/opening-theme/`.
   Surge is A-minor at 132bpm with only ~27 hand-authored lines, so it remixes
   easily. Five audition-only WAVs are rendered under
   `work/auditions/opening-theme/` (no production registration and no selection
   made): nocturne, four-note ostinato, attract loop, marquee curdle, and static
   ostinato. Listening and the final choice remain a separate pass.

## Possible improvements — implementation status

The following visual and staging recommendations are now implemented in the
intro pass. They preserve the one-clock, seekable presentation.

### Entrance geography decision

The entrance is the real black centre-parting service door on the left. Its two
leaves open from the middle onto Lorenzo already idle. He holds the budget line,
starts first, and the other seven follow in spaced lanes; every runner
accelerates from their first visible step. The door and its light wedge stay part of the
intro; no alternate porthole or offscreen entrance is used in the production
shot.

### 1. Re-stage the arcade power cords

**Implemented.**

The cords should originate around the middle of each arcade cabinet rather than
appearing to grow out of the floor. From that cabinet anchor they should hang in
a visible arc before dropping toward the floor, so the cable has weight and a
clear physical relationship to the machine. The arcs should vary slightly with
the cabinet position and camera view; identical curves on every cabinet will
read as a repeated graphic rather than a bundle of real cords.

The cabinet anchor, the lowest part of the sag, and the point where the cable
meets the floor should remain legible during the camera moves. Each feed then
continues along the floor to the powerboard; it must never run behind the next
cabinet or stop short of the board. A small contact shadow or darkening where the
cable reaches the floor would help sell the new height, provided it does not make
the row visually noisy.

### 2. Redesign the socket and give it a separate off-row insert

**Implemented in the intro.**

The socket needs to become a designed story object, not a yellow rectangle. After
the blackout, cut to a location well off screen from the machines and reveal a
substantial wall-mounted socket: a dark industrial plate, a visible recess,
proper edge depth, fixing screws or bolts, a cable strain relief, and enough
surrounding wall to establish scale. It should feel like an old piece of arcade
infrastructure that has been given a specific purpose, not a generic UI symbol
enlarged into scenery.

The plate should carry a small, slightly worn label reading **MCGFN-1** — the
short form of **Macguffin 1**. The label is the quiet story clue: legible in the
insert, but not large enough to turn the shot into an explanation. The
typography should feel stencilled, stamped, or service-marked rather than like a
clean yellow warning sign. The socket's shape, cable entry, and label should all
survive the brownout lighting.

The socket should be clearly separated from the cabinets in space and in edit.
The insert keeps the feed cord, powerboard, and vacuum branch on screen so the
electrical layout remains continuous without ever putting the socket and a
cabinet in the same shot. Check it in both orientations so the terminal and
`MCGFN-1` remain readable on a phone.

**Placement decision:** use the finalized Type B MCGFN-1 terminal in the intro
film as the readable destination of the dedicated off-row insert. A later copy may also
appear on the far wall of the Trophy Room, after the other displays, as a
post-campaign world detail. Keep the locked door as a separate nearby feature,
so the socket reads as the completed electrical objective and the door remains
an unresolved destination rather than two versions of the same object.

The Trophy Room copy remains optional until that room's final composition is
settled. If it is used, its progress display can reflect the campaign state;
the intro version should stay focused on the socket, plate, and the single
readable 4x4 bank.

**Terminology decision: keep these as plugs, not fuses.** Fuses already have a
separate gameplay meaning as carried stage objects, while plugs are the campaign
collectible and preserve the game's *Unpluggening* language. More importantly,
the finale depends on the electrical chain staying legible: the heroes plug the
extension cord into the socket, and the end gag reveals that the power strip was
plugged into itself the entire time. `MCGFN-1` can receive or display the
collected plugs without replacing that plug, cord, and socket logic with fuse
terminology.

**Styling direction for `MCGFN-1`:** keep calling it **the socket**, but design
it as a strange arcade-wide master terminal rather than an ordinary wall outlet.
The settled gallery direction is a wide yellow faceplate with one prominent
white Type B receptacle and a compact bank of aligned coral plug markers. Do
not model 50+ literal holes or suggest that every collected plug has to fit into
the same opening. The plugs are recovered power or authorization tokens
gathered by the terminal; the physical display summarizes that accumulation
while remaining readable at hub scale. The finale must still read cleanly as
heroes reaching the socket, connecting the cord, and discovering that the power
strip was plugged into itself.

The original yellow should remain part of the visual identity. Prefer it as a
yellow faceplate, socket core, warning band, or active progress signal inside the
darker terminal housing, so the audience still recognises the object while the
redesign gives it physical depth and a reason to exist.

**Physical plug progress:** show a small representative bank of aligned rounded
square markers in the terminal, not all 81 literal plugs. They are a visual
abstraction of the collected plugs, not miniature hardware. Empty positions are
solid dark rounded squares with no slashes, damage marks, or extra symbols;
filled positions are plain coral rounded squares. The state must be intuitive:
zero collected means an empty matrix, and 81 collected means a full matrix. A
  hub view may add a numeric counter for exact progress, but the trailer should
omit the counter entirely. The trailer read can show the bank filling as plugs
are recovered. In this intro, the shot explicitly establishes reverse removal:
after the rocker throws, the filled bank empties last-to-first. For the yellow-
core study, make the whole terminal a wide, simple yellow plate:
one large round white Type B socket with two black, slightly rounded blade
slots and an exaggerated frown-shaped ground contact with a flat bottom beneath
them on the left, followed
by a neat tight 4x4 plug matrix on the right. The empty squares should be dark
and the filled squares should be coral: it contrasts with the yellow plate
without implying that the socket is powered or online. Remove dividers,
counters, status lights, and extra decorative lines so the socket and matrix
are the only readable elements. Keep a vertical alternative in the gallery as
well, with the Type B socket above the 4x4 coral grid, so the final mounting
shape can be judged against the horizontal version.

### 3. Let the full cast run before Lorenzo breaks

**Implemented.**

The earlier no-pose entrance was replaced with the requested beat. Lorenzo exits
first, reaches a mark, stops and idles for roughly one second under the budget
line. The other seven then enter over 0.72 seconds as the EIGHT HEROES. ONE
SOCKET. caption begins. The dive beat stays caption-free so the full cast shares a
5.30-second accelerating cabinet-free runway; Lorenzo gets ahead and dives into
the first PLUMBER PANIC cabinet while the others keep moving. The extra duration
is assigned to the idle beat, shared run and dive so the action can be read at
playback speed.

### 4. Push the dive farther down the row

**Implemented.**

The first cabinet Lorenzo dives into is the first PLUMBER PANIC machine, placed
far enough right that it still sits more than 150 world units beyond the last
hero mark. The marks run from x=64 through x=302; the target is at x=560. Give
the camera a little forward travel to establish that runway, then let Lorenzo
run into and leap through that named machine.

As he makes the jump, the other heroes should gather around the target area and
follow the action rather than remain as a straight frozen line. Their movement
can begin as a response to Lorenzo passing them, then tighten into a loose group
around the cabinet as the machine wakes. This should make the dive feel like a
shared discovery while keeping Lorenzo's trajectory readable.

### 5. Keep the remaining heroes alive at the ending

**Implemented.**

The final heroes keep moving after Lorenzo is inside: they run in, turn, point
and celebrate on staggered film-time beats around the live cabinet. The final
wide shot gives them room to react and settle, but the close prompt does not
freeze them: after the film reaches its end, the idle/celebration clock keeps
animating while PRESS ENTER OR CLICK TO CLOSE is displayed.

Any running, gathering, or celebration needs to be derived from film time just
like the existing run-in and dive. It should be possible to seek directly to a
reaction moment and get the same positions, facing directions, and poses as
playing forward to it.

### Further improvements worth considering

- Treat the cords, powerboard, terminal, and lit target cabinet as one continuous
  piece of geography. The dedicated terminal insert keeps that relationship
  legible without sharing a frame with the cabinet row.
- Give the seven observers distinct reaction beats, even if the differences are
  small. A staggered look, point, step, or celebratory pose will keep the group
  from reading as one duplicated actor.
- Let the sound design mark the spatial story: a clear plug contact and a
  separate reaction beat when the Plumber's Panic cabinet reaches brownout.
  These should support the picture without competing with `stripThrow` or
  `powerDown`.
- Hold the final live-cabinet composition for a deliberate moment after the
  gathering settles. That gives the new activity a payoff and leaves the viewer
  with the game's central image: Plumber's Panic fully powered while the other
  cabinets remain dark, without previewing the terminal again.

## Do not break this

**Everything in the picture is `f(t)`.** `seek(t)` drops the projector at any
moment and must produce the frame that playing to `t` would produce. Particles are
the one sanctioned exception and are therefore garnish, never structure. If you
add an actor here, give it a function of `t` in the style of `heroPosAt`,
`copterAt`, `doorOpenAt`, `diveCabWakeAt` — not a field you advance in `update`.

The dive is the sharp edge: it is a stateful object, and it stays honest only
because it is re-`seek`ed from film time every frame and never ticked.

## Verifying

```
node tests/intro-sequence.js      # focused intro timing, staging, purity and seek cases
node tests/run-all.js             # full suite
node tools/render-cues.js stripThrow clickHard switchFlick
```

In a browser, `?goto=intro`, in both orientations. To inspect a frame, freeze the
projector first — otherwise the film runs on while you are screenshotting:

```js
const s = window.__mash_cur;
s.update = () => {};   // freeze
s.seek(31.2);          // the runners gather around the live target
```

Useful times: **12.6–13.05** the socket bank empties · **14.4** the cabinet row
brownout begins · **18.42** the doors reveal Lorenzo idle · **19.37** Lorenzo
starts running · **19.55–20.27** the followers enter · **20.27–25.57** the full
cast shares the clear runway · **26.45** Lorenzo jumps · **27.15** he crosses
the glass · **28.05** his in-screen run-off ends · **29.0** the live target and
reacting heroes settle into the final hold.

Shots from this pass are in `work/mockups/intro-film-geography/`. A backup of `intro.js` and
`jokes.js` as they stood before the work is in `work/local/intro-backup/`.
