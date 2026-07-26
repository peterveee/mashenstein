# MANDATORY TRAINING — script

The running record of what the tutorial says and does, beat by beat, so the
writing can be finessed without reading `src/game/tutorial.js` to find out what
is currently in it. **This file and that file have to agree** — change a line
here and change it there, in the same commit.

Two rules hold the whole screen together, and every beat below obeys them:

1. **It never stops.** Instructions arrive as a speech panel and stay up until
   Gary replaces them while the world keeps scrolling. Nothing is modal, nothing
   waits for a keypress, the hero never freezes mid-stride.
2. **It draws nothing of its own.** Crates, drones, coins, capsules, portals and
   heroes all go through the painters a real run composes. The only authored art
   is the backdrop — a bare lane, overhead lighting, scroll ticks.

Gary is the coach because MANDATORY TRAINING is an HR artifact and he is the
employee HR still has on the roster. He did not volunteer. The module is a form
he is working through, each section is a section of it, and a miss is an
*unclosed section* rather than a player failure.

---

## Staging

| | |
|---|---|
| Lane speed | **112** (a run proper is 160). The master timing dial: every distance in the file is world px, so raising it shortens the spawn lead, the retry lead, the ladder pitch and the payout stretch at once and in proportion |
| Spawn distance | just beyond the right edge — a challenge arrives in roughly 2.5s after Gary starts talking |
| Spawn distance on a **retry** | just off the right edge, roughly 1.8s. A retry does not buy the reading time again: you already know what is coming and what you did wrong, so the empty lane that bought the first read is only a queue |
| Speech hold | Gary's line stays until he replaces it; timed payout lines use 5.5s holds |
| Whole module | ~54s for all nine sections played clean, ~79s including the epilogue read at full pace. Was ~2m25s, then ~77s, then ~87s once the epilogue grew. Figures computed from the constants in this table at perfect play, not stopwatched |
| Settle between sections | 1.0s — dead lane, nine times over, so it buys the pass floatie landing and nothing after it. An optional section gets 3.0, because the line Gary has just said is the whole content of it |
| Opening beat | Gary walks in from left at ~5.5× zoom (~0.7s); idle at centre with card + "— PRESS ANY KEY TO START" appended; on input: zoom eases to 2× as Gary bolts right; once Gary is fully off screen Lorenzo enters from left, section 1 brief fires; Lorenzo settles as lane starts |
| Reopens before he concedes | 3 |
| Room label | `MANDATORY TRAINING` bottom-left, gold, the food court's and trophy room's exact treatment; `SECTION n/9` rides the same midline beside it — rendered from the length of the section table, so it cannot drift |
| Gary's card | pale plate at 88% opacity, as high as it goes (desktop y 10, touch y 18), wrap 324 / 312 at 1.15x — out of the band a held jump travels through. `GARY` appears on the opening card only; later cards retain his portrait but reclaim that header row. Touch takes the bigger type, its own wrap and its own anchor as one set. Gary appears IN PERSON for the opening beat only — centre-screen, idle, then bolts right — before being reduced to a portrait for the rest of the module |
| Card width | as wide as what is beside it allows, because a wider card is a **shorter** one and the lines it saves are lines of lane it is not standing in. Desktop plate x 58–422, clearing the coin pill (ends 48, even at four digits) and the FPS readout (starts 442) by ~10px each. Touch is capped at 368 by the coin pill on its left |
| Touch controls | **outside the canvas**, in the black margin, wherever the device has room — the same chrome layout a run uses, re-synced when the first tap lands or the phone rotates. Only screens too close to 16:9 fall back to discs on the art. Pausing takes them out of the margin too: the pause plates are in-canvas and a live JUMP disc outside a paused game is a control that looks pressable and is not |
| Card z-order | **under the hero.** It is the biggest opaque object on screen and it is up almost continuously, so with it on top a tall jump put the character you are steering behind a menu. Everything else on this screen is a readout, and a readout can wait behind the person jumping |
| Lighting | warm overhead cones every 108px with a hot core and a floor pool; the fixtures are above frame and never drawn |
| Pause | 20% scrim, and Gary's card stays up at full strength — including the *last* thing he said if the live line has expired |

## Sections

Nine sections. `requires` is what makes this Gary's screen rather than a
checklist: clearing the obstacle is not the same as completing the section.
Jump the drone instead of ducking it and you are past the hazard but the section
is still open, because the section specifies ducking.

### 0 — opening (no section number)

Gary walks in from the left at ~5.5× zoom — a tight shot where he fills most of
the frame. He arrives centre-screen and settles into idle pose. His card appears:

> HR ASSIGNED ME THE TRAINING MODULE. I AM DECEASED. THE FORM DID NOT ASK.

A prompt is appended to the card itself — ** PRESS ANY KEY TO START** (desktop)
or **— TAP ANYWHERE TO START** (touch) — appearing as a second line in the same
pale plate. The scene holds here — nothing moves, nothing scrolls — until the
player acknowledges it.

On that press/tap the camera begins a slow, smooth zoom-out to the standard 2×
zoom while Gary bolts off the right edge. Once Gary is fully off screen, Lorenzo
enters from the left at a run and the section 1 brief replaces the intro card.
Lorenzo settles into the standard player position as the lane begins scrolling.

### 1 — JUMP · Lorenzo · one crate

- **Brief:** CRATES. HOLD SPACE TO JUMP. I DID NOT WRITE SECTION ONE.
- **Touch:** CRATES. HOLD THE LEFT OF THE SCREEN. I DID NOT WRITE SECTION ONE.
- **Again:** YOU TAPPED IT. HOLD IT DOWN. THE CRATE COMES BACK. *(touch: YOU FLICKED IT…)*
- The old brief opened `SECTION ONE:`, which the room label at the bottom of the
  screen was already saying. Dropping it lets the callback land on a shorter line
  — and let the touch variant, which had no joke in it at all, have the same one.
- HOLD, not PRESS: every hero has a variable jump, so a flicked key clamps to a
  2px hop and eats the crate. Teaching the tap first taught the failure first.

### 2 — VARIABLE JUMP · Lorenzo · stacks of 1, 2, 3

- **Brief:** THREE STACKS, EACH TALLER. HOLD LONGER FOR EACH. THE MANUAL CALLS THIS INTUITIVE.
- **Again:** TALLER THAN THE LAST ONE. HOLD LONGER. I AM NOT PAID FOR RETAKES.
- 91px apart — tight enough that the ladder reads as one shape but with room
  to land between rungs. At 112 px/s the gaps are 0.81s against Lorenzo's 0.82s
  airtime, so a clean landing is possible between each stack while the ladder
  still reads as a single sequence rather than three unrelated crates.

### 3 — COINS · Lorenzo · a coin arc, then a ! box

- **Brief:** RUN THROUGH THE COINS. THE BOX BREAKS OPEN FROM UNDERNEATH — COINS, MOSTLY. SOMETIMES BETTER.
- **Again:** THE BOX IS STILL FULL. FROM UNDERNEATH. ANOTHER ONE IS COMING.
- **Requires:** the box actually opened. Missing a coin or two is not worth
  reopening a section over; the box is.
- The copy has three jobs, in this order: the box *breaks open*, you break it
  from *underneath*, and what falls out is usually coins **but not always** — a
  real ! crate is a quarter chance of something better than money, and a player
  told it is a coin dispenser has no reason to go out of their way for one.
- The box floats at alt 60 rather than the usual 40 — just under Lorenzo's apex,
  where the jump lingers, which turns an 0.07s strike window into 0.4s.

**On pass — the payout stretch.** The lane fills: a coin arc every 76px, the
floor paved at 13px, a high band at the top of a held jump, and a ! box every
118px, over ~700px of lane — about six seconds of free play. The frame is never without coins in it at three
heights. Nothing here can hurt you and nothing can fail you, boxes pop on
contact, and the stretch runs until the last of it is behind the hero plus a
beat — never on a stopwatch that expires mid-arc.

Gary sells it, twice, because the reclaim in the epilogue is the punchline and
this is the setup:

> COINS BUY UPGRADES. DOLORES RUNS THAT COUNTER AND DOLORES DOES NOT NEGOTIATE.

…then about six seconds later:

> TAKE ALL OF THEM. THIS IS THE PART PEOPLE REMEMBER.

**The coins are NOT taken here**, and they are never wiped by a section
boundary either: a coin still in the air or still ahead of the hero is carried
into the next section as a *stray* — collectible, drawn and scrolling normally,
but excluded from every section's judgement, so an old coin can never reopen a
later section. It is swept only once it is behind the hero and off the frame.

### 4 — DUCK · Lorenzo · one drone

- **Brief:** DUCK. HOLD DOWN OR S. THE DRONE HAS RIGHT OF WAY, APPARENTLY.
- **Touch:** DUCK. SWIPE DOWN AND HOLD. …
- **Again:** INCOMPLETE. THE DRONE IS FILED UNDER DUCK.
- **Wrong way:** OVER IT. THE SECTION SPECIFIES UNDER. I DO NOT MAKE THE SECTIONS.
- **Requires:** a real duck. Lorenzo clears the drone with an ordinary jump, so
  clearing it is not what the section asks for.

### 5 — SHIELD · Lorenzo · one capsule

- **Brief:** SHIELD CAPSULE. TAKES ONE HIT FOR YOU. PROTECTIVE EQUIPMENT ARRIVES AFTER THE HAZARDS. THAT IS PROCUREMENT.
- **Again:** IT WENT PAST. I WILL REQUISITION ANOTHER. THAT IS A FORM. I HAVE ALREADY FILED IT.
- If it later eats a hit: THE EQUIPMENT PERFORMED AS SPECIFIED. YOU DID NOT.

### 6 — GOLDEN APPLIANCE · Lorenzo · one toaster *(optional)*

- **Brief:** THAT IS A TOASTER. EVERY CABINET HAS ONE HIDDEN IN IT. IT IS OPTIONAL, SO IT IS NOT MY DEPARTMENT.
- **Took it:** YOU TOOK THE TOASTER. IT DOES NOTHING AND IT IS WORTH A FORTUNE. BOTH ARE ON RECORD.
- **Missed it:** YOU LEFT THE TOASTER. I CANNOT MARK YOU DOWN FOR IT. I AM SIMPLY GOING TO REMEMBER IT.
- The only section that closes either way — it never reopens, only the
  commentary forks. At alt 44 against Lorenzo's 89px jump it is a decision, not
  a skill check.
- It keeps its own section rather than sharing the capsule's lane. The two were
  merged into one `STORES` beat and it read as a crowded lane with two unrelated
  pickups in it and one line trying to cover both — the ~4s saved was not worth
  either joke landing worse. The settle here is 3.0 rather than 1.0 for the same
  reason: the line Gary has just said is the entire content of the section.

### 7 — PORTAL TAG · Lorenzo → Mochi

- **Brief:** RUN THROUGH THE PORTAL. DO NOT JUMP IT. SOMEONE JUMPED ONE ONCE. THERE WAS PAPERWORK.
- **Again:** OVER IT IS NOT THROUGH IT. I AM REOPENING THE SECTION.

### 8 — DOUBLE JUMP · Mochi · a stack of five, then a portal to B-33P

- **Brief:** MOCHI JUMPS TWICE, AND NOT VERY HIGH. JUMP AGAIN IN MID-AIR. THE FORM REQUIRES BOTH.
- **Touch:** … TAP AGAIN IN MID-AIR. THE FORM REQUIRES BOTH.
- **Again:** INCOMPLETE. TWICE. IN THE AIR. THE FORM IS SPECIFIC.
- **Wrong way:** YOU GOT OVER IT ON ONE. THE SECTION SPECIFIES TWO.
- **Requires:** a second jump in the air. Mochi is here because she jumps LOW —
  56.9px against Lorenzo's 89 — so a stack this tall is one Lorenzo would have
  strolled over.
- **Five crates, not six.** Six (66px) was a wall a beginner had to time the
  second jump well to clear; five (55px) leaves room to be sloppy with it. That
  sits a whisker under Mochi's 56.9px single-jump apex, so a frame-perfect
  single is *just* possible — and the section says so out loud when it happens
  rather than passing silently for the move it is not teaching.
- **On pass:** a portal to B-33P spawns just ahead in the lane. Gary's line
  replaces the brief — the body swap is the reward for clearing the stack, not a
  separate task:
  > ANOTHER PORTAL, ANOTHER BODY. NORMAL HERE. STRAIGHT THROUGH.
- The portal sits ~90px ahead, close enough to reach during the settle gap
  between sections — the player runs through it naturally rather than as a
  separate challenge. The old layout had this as a section of its own, which
  cost a full spawn lead and settle for a portal the player was going to run
  through regardless.
- Jumping it costs nothing: section 9 declares B-33P as its hero, and a section
  sets its hero as it opens. A merged portal never needs a reopen for that
  reason.

### 9 — HERO POWER · B-33P · one drone, then a gallery, then home

- **Brief:** EVERY HERO HAS A POWER. B-33P SHOOTS. PRESS RIGHT OR D. THE CANNON IS COMPANY PROPERTY.
- **Touch:** … TAP THE RIGHT STRIP, OR THE USE DISC. …
- **Again:** IT GOT PAST. SHOOT THE NEXT ONE. THE CANNON IS SIGNED OUT TO YOU.
- **Wrong way:** YOU AVOIDED IT. COMMENDABLE. NOT THE SECTION. SHOOT THE NEXT ONE.
- **Requires:** the drone shot down.
- **The cooldown, on the first shot** — not in the brief, because until you have
  fired once the orb has nothing to report:
  > THE ORB IS THE RECHARGE. IT REFILLS ON ITS OWN. YOU CANNOT HURRY IT. I HAVE ASKED.
- The readiness orb beside the hero appears **only here**, with the power it
  belongs to — for the eight sections before this it was a meter for a control
  the player did not have. Same rule as the USE disc.
- **On pass:** the shoot gallery — drones at five altitudes, two buzzbirds, two
  crate stacks, a target — and then the way home at the end of it.

**The last portal, at the end of the gallery.** It used to be section 10 of 10:
a spawn lead and a settle for a doorway with nothing to get wrong in it. It now
sits past the last target, 660px into the gallery, and the line arrives 1.2s in:

> LAST PORTAL. BACK INTO THE BODY YOU CLOCKED IN WITH. HR IS FIRM ON THAT ONE.

The free-play stretch runs until the last thing in the lane is behind the hero,
and the portal counts as part of the lane for that measurement — otherwise the
settle would expire on the last crate and sweep the doorway away before it could
be reached.

The module borrowed two bodies to teach two things and hands the first one back
before the paperwork. The certificate is made out to whoever is standing there at
the end — so a **jumped** last portal hands the body back anyway, on the way into
the epilogue, and the line that used to reopen the section says the true thing
there instead. It rides the silent walk-on and is replaced by the first beat:

> THROUGH IT. YOU CANNOT SIGN THE FORM AS SOMEBODY ELSE. I HAVE TRIED.

### Conceding

After three reopens of the same section:

> I AM MARKING THIS ONE SATISFACTORY. NOBODY AUDITS ME.

---

## Epilogue

The lane winds down to a stop over two seconds (the hero's run cycle is driven
by world speed, so his legs wind down with it), the camera pushes in to 3.2x,
and Gary walks on from the right — up the track, against the direction
everything has been travelling all day. He stops about half a body from the
hero: a two-shot, not two dots in a lane. He does not talk and walk; he is not
paid for two things.

**They close the distance together.** He enters from just off the right edge of
the current frame and covers the ground briskly, and the lane is still winding
down while he does — so the hero is still running toward him and they arrive at
the same moment, about two seconds in. The old pairing (a start well outside the
pushed-in frame, at a stroll) was four seconds of a stationary hero watching an
empty lane before the ending began.

Every beat is skippable — one press advances — so an impatient player taps
through in seconds and a reader gets the whole bit. The holds are reading time
for one or two rows plus a beat to look up, and nothing more: they had drifted
to 4.6 and 5.2 apiece, which across seven beats is most of a minute of waiting
for a man to finish. They are now 3.0 / 5.0 / 2.4 / 3.0 / 3.2 / 3.0 / 3.4 —
**23.0s of holds, down from 28.6** — with each line cut to what the hold pays
for. Beat 2 keeps the longest because the coin drain plays underneath it, and
beat 5 cannot go below 2.8s or the sweep arrives before the streamers have landed
and there is nothing on the floor to take back.

The form's order, not a storyteller's: deductions are processed before awards,
so payroll takes the coins back and *then* he certifies you.

| Beat | Hold | Line | Hero | Gary |
|---|---|---|---|---|
| arrival | 2.0 | *(silent walk-on)* | stands, then waves hello | walks on, stands |
| 1 | 3.0 | THAT IS THE MODULE. INCLUDING THE PARTS I DISAGREE WITH. | idle | idle |
| 2 | 5.0 | PAYROLL HAS RECLAIMED THOSE. TRAINING COINS ARE NOT LEGAL TENDER. | **scowls** | the counter drains to zero under this line, one coin and one blip per tick, pitch falling as it goes. Starts 1.2s in — read the total, *then* watch it go |
| 3 | 2.4 | I DID ASK. I ASKED TWICE. THE SECOND TIME IN WRITING. | still sour | idle |
| 4 | 3.0 | YOU ARE CERTIFIED. READ THE SMALL PRINT. IT IS ALL SMALL PRINT. | idle | idle |
| 5 | 3.2 | THERE IS A CELEBRATION STEP. I HAVE LOGGED IT AS COMPLETED. | **celebrates** | **rolls his eyes** — streamers and confetti rain for 2.8s |
| 6 | 3.0 | THAT IS THE CELEBRATION. THE STREAMERS ARE FROM STORES. THEY GO BACK. | **eyeroll** — celebration stops immediately, replaced by an arched-brow "give me a break" look | everything on the floor vanishes on the coin-reclaim cue |
| 7 | 3.4 | RIGHT. I HAVE A SHOP TO HAUNT, AND ONLY DURING BUSINESS HOURS. IT IS POLICY. | idle | idle |
| card | — | *(speech card clears — Gary walks off in silence)* | **celebrates** | **walks off right** — his shift is over, he exits the way he came |

**Gary never celebrates.** Everything else he does is compliance under protest —
he appeals to HR, he files forms, he reclaims coins on a technicality — so a
Gary who is genuinely pleased for you undoes the joke the module rests on. The
form celebrates on his behalf: the step is logged as completed, the streamers
fire, and he stands in them rolling his eyes. Then he takes them back, because
that is what Stores does. And then he walks off — shift over.

The reclaim is the honest thing as well as the gag: nothing earned in here was
ever going into the save file, so the counter is walked back to zero in front of
you rather than having quietly vanished eight sections ago. The readout stays on
screen at zero — that is where the joke lives.

Streamers are ribbons and confetti in the arcade's own accent colours (coin
gold, relay teal, portal magenta, pass green) rather than a fresh party palette,
so they read as this game's confetti. They outlive the step deliberately: what
lands has to still be lying there at beat 6, or the sweep has nothing to take
back. Reduced motion suppresses them.

### The certificate

A printed document, not an announcement — pale plate, dark ink, engraved double
rule, a gold HR seal with ribbon tails bottom-right. It deliberately does NOT
use the ACT banner: that card is a mistracked tape whose glitch says "the
hardware is failing", which is a sentence about the arcade and not about the
player having passed a training module.

```
CERTIFICATE OF COMPLETION
    MANDATORY TRAINING
─────────────────────────────
    AWARDED TO <HERO>            (seal)
NON-BINDING. EXPIRES ON CONTACT WITH A CABINET.
```

It sits in the band between Gary's card and the pair's heads, and it does not
dim the scene: the whole point of the ending is watching the two of them stand
there.

Beat 4 used to read *THE CERTIFICATE IS NON-BINDING AND EXPIRES ON CONTACT WITH
AN ACTUAL CABINET* — which is the last line of the card, on screen underneath him
as he says it. Gary reading the document out is a beat that costs four seconds to
tell you something you can see. `READ THE SMALL PRINT. IT IS ALL SMALL PRINT.`
gets a laugh off the card instead of repeating it, in two rows instead of three.

Finishing marks `firstPortal` and `firstAbility` as taught, so the first real
run does not teach them again.

---

## Controls, and the dev shortcut

- **ESC** pauses. It is the *pause screen* that offers the way out — the key
  legend says PAUSE for that reason.
- The dev status strip sits one row **above** the room label, not on it — a
  development readout is not allowed to obscure production UI.
- **N** or the **forward arrow** — dev builds only (`npm run dev`), wired in
  `src/dev/index.js` — closes the current section on the spot and moves to the
  next. A skipped portal still hands the body over, so the epilogue is reached
  as the right hero. Reviewing a nine-section module by playing all nine of them
  every time is how the last section ends up unreviewed.
  - The forward arrow is *also* the ability key, so while the hero is holding a
    live power — B-33P in section 9 — the arrow stays the cannon and
    only **N** skips. Otherwise the section that teaches shooting could not be
    tested in the build it is being reviewed in.
