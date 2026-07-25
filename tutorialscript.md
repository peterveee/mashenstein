# MANDATORY TRAINING — script

The running record of what the tutorial says and does, beat by beat, so the
writing can be finessed without reading `src/game/tutorial.js` to find out what
is currently in it. **This file and that file have to agree** — change a line
here and change it there, in the same commit.

Two rules hold the whole screen together, and every beat below obeys them:

1. **It never stops.** Instructions arrive as a speech panel and expire on their
   own a few seconds later while the world keeps scrolling. Nothing is modal,
   nothing waits for a keypress, the hero never freezes mid-stride.
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
| Lane speed | 90 (a run proper is 160) |
| Spawn distance | a screen and a half ahead — a challenge arrives ~3.5s after Gary starts talking |
| Spawn distance on a **retry** | just off the right edge, ~2.3s. A retry does not buy the reading time again: you already know what is coming and what you did wrong, so the empty lane that bought the first read is only a queue |
| Speech hold | 5s, two rows, unhurried |
| Settle between sections | 1.6s |
| Opening beat | 4.5s over an empty lane |
| Reopens before he concedes | 4 |
| Room label | `MANDATORY TRAINING` bottom-left, gold, the food court's and trophy room's exact treatment; `SECTION n/11` rides the same midline beside it |
| Gary's card | pale plate at 88% opacity, as high as it goes (desktop y 10, touch y 18), wrap 324 / 312 at 1.35x — out of the band a held jump travels through. Touch takes the bigger type, its own wrap and its own anchor as one set |
| Card width | as wide as what is beside it allows, because a wider card is a **shorter** one and the lines it saves are lines of lane it is not standing in. Desktop plate x 58–422, clearing the coin pill (ends 48, even at four digits) and the FPS readout (starts 442) by ~10px each. Touch is capped at 368 by the coin pill on its left |
| Touch controls | **outside the canvas**, in the black margin, wherever the device has room — the same chrome layout a run uses, re-synced when the first tap lands or the phone rotates. Only screens too close to 16:9 fall back to discs on the art. Pausing takes them out of the margin too: the pause plates are in-canvas and a live JUMP disc outside a paused game is a control that looks pressable and is not |
| Card z-order | **under the hero.** It is the biggest opaque object on screen and it is up almost continuously, so with it on top a tall jump put the character you are steering behind a menu. Everything else on this screen is a readout, and a readout can wait behind the person jumping |
| Lighting | warm overhead cones every 108px with a hot core and a floor pool; the fixtures are above frame and never drawn |
| Pause | 20% scrim, and Gary's card stays up at full strength — including the *last* thing he said if the live line has expired |

## Sections

Eleven sections. `requires` is what makes this Gary's screen rather than a
checklist: clearing the obstacle is not the same as completing the section.
Jump the drone instead of ducking it and you are past the hazard but the section
is still open, because the section specifies ducking.

### 0 — opening (no section number)

> HR ASSIGNED ME THE TRAINING MODULE. I AM DECEASED. THE FORM DID NOT ASK.

Empty lane, 4.5s.

### 1 — JUMP · Lorenzo · one crate

- **Brief:** SECTION ONE: CRATES. HOLD SPACE TO JUMP. I DID NOT WRITE SECTION ONE.
- **Touch:** SECTION ONE: CRATES. TOUCH AND HOLD THE LEFT OF THE SCREEN TO JUMP.
- **Again:** YOU TAPPED IT. HOLD IT DOWN. THE CRATE COMES BACK. *(touch: YOU FLICKED IT…)*
- HOLD, not PRESS: every hero has a variable jump, so a flicked key clamps to a
  2px hop and eats the crate. Teaching the tap first taught the failure first.

### 2 — VARIABLE JUMP · Lorenzo · stacks of 1, 2, 3

- **Brief:** THREE STACKS, EACH TALLER. HOLD THE JUMP LONGER FOR EACH ONE. THE MANUAL CALLS THIS INTUITIVE.
- **Again:** THAT ONE WAS TALLER THAN THE LAST. HOLD IT LONGER. I AM NOT PAID FOR RETAKES.
- 140px apart, still comfortably above the spawner's own fairness floor (~103).
  At 200 the previous stack was off the back of the screen before the next
  appeared at the front, so the comparison the section is built on — *this one
  is taller than the last one* — had to be remembered instead of seen. At 140
  two rungs are in frame together and the ladder is a shape rather than a
  sequence.

### 3 — COINS · Lorenzo · a coin arc, then a ! box

- **Brief:** COINS. RUN THROUGH THEM. THE BOX BREAKS OPEN FROM UNDERNEATH — COINS, MOSTLY. SOMETIMES SOMETHING BETTER.
- **Again:** THE BOX IS STILL FULL. BREAK IT OPEN FROM UNDERNEATH. ANOTHER ONE IS COMING.
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
118px, over ~1180px of lane. The frame is never without coins in it at three
heights. Nothing here can hurt you and nothing can fail you, boxes pop on
contact, and the stretch runs until the last of it is behind the hero plus a
beat — never on a stopwatch that expires mid-arc.

Gary sells it, twice, because the reclaim in the epilogue is the punchline and
this is the setup:

> COINS ARE GOOD. COINS BUY UPGRADES. DOLORES RUNS THAT COUNTER AND DOLORES DOES NOT NEGOTIATE.

…then about six seconds later:

> TAKE ALL OF THEM. EVERY ONE. THIS IS THE PART OF THE MODULE PEOPLE REMEMBER.

**The coins are NOT taken here**, and they are never wiped by a section
boundary either: a coin still in the air or still ahead of the hero is carried
into the next section as a *stray* — collectible, drawn and scrolling normally,
but excluded from every section's judgement, so an old coin can never reopen a
later section. It is swept only once it is behind the hero and off the frame.

### 4 — DUCK · Lorenzo · one drone

- **Brief:** DUCK. HOLD DOWN OR S. THE DRONE HAS RIGHT OF WAY, APPARENTLY.
- **Touch:** DUCK. SWIPE DOWN AND HOLD. …
- **Again:** INCOMPLETE. THE DRONE IS FILED UNDER DUCK.
- **Wrong way:** YOU WENT OVER IT. THE SECTION SPECIFIES UNDER. I DO NOT MAKE THE SECTIONS.
- **Requires:** a real duck. Lorenzo clears the drone with an ordinary jump, so
  clearing it is not what the section asks for.

### 5 — SHIELD · Lorenzo · one capsule

- **Brief:** SHIELD CAPSULE. IT TAKES ONE HIT FOR YOU. PROTECTIVE EQUIPMENT ARRIVES AFTER THE HAZARDS. THAT IS PROCUREMENT.
- **Again:** IT WENT PAST. I WILL REQUISITION ANOTHER. THAT IS A FORM. I HAVE ALREADY FILED IT.
- If it later eats a hit: THE EQUIPMENT PERFORMED AS SPECIFIED. YOU DID NOT.

### 6 — GOLDEN APPLIANCE · Lorenzo · one toaster *(optional)*

- **Brief:** THAT IS A TOASTER. EVERY CABINET HAS ONE HIDDEN IN IT. IT IS OPTIONAL, SO IT IS NOT MY DEPARTMENT.
- **Took it:** YOU TOOK THE TOASTER. IT DOES NOTHING AND IT IS WORTH A GREAT DEAL. BOTH OF THOSE ARE ON RECORD.
- **Missed it:** YOU LEFT THE TOASTER. IT WAS RIGHT THERE. I CANNOT MARK YOU DOWN FOR IT. I AM SIMPLY GOING TO REMEMBER IT.
- The only section that closes either way — it never reopens, only the
  commentary forks. At alt 44 against Lorenzo's 89px jump it is a decision, not
  a skill check.

### 7 — PORTAL TAG · Lorenzo → Mochi

- **Brief:** RUN THROUGH THE PORTAL. DO NOT JUMP IT. SOMEONE JUMPED IT ONCE. THERE WAS PAPERWORK.
- **Again:** OVER IT IS NOT THROUGH IT. I AM REOPENING THE SECTION.

### 8 — DOUBLE JUMP · Mochi · a stack of five

- **Brief:** MOCHI JUMPS TWICE AND NOT VERY HIGH. PRESS JUMP AGAIN IN MID-AIR. ONE JUMP WILL NOT CLEAR THAT.
- **Touch:** … TAP AGAIN IN MID-AIR. …
- **Again:** INCOMPLETE. TWICE. IN THE AIR. THE FORM IS SPECIFIC.
- **Wrong way:** YOU GOT OVER IT ON ONE. THE SECTION SPECIFIES TWO.
- **Requires:** a second jump in the air. Mochi is here because she jumps LOW —
  56.9px against Lorenzo's 75 — so a stack this tall is one Lorenzo would have
  strolled over.
- **Five crates, not six.** Six (66px) was a wall a beginner had to time the
  second jump well to clear; five (55px) leaves room to be sloppy with it. That
  sits a whisker under Mochi's 56.9px single-jump apex, so a frame-perfect
  single is *just* possible — and the section says so out loud when it happens
  rather than passing silently for the move it is not teaching.

### 9 — PORTAL TAG · Mochi → B-33P

- **Brief:** ANOTHER PORTAL, ANOTHER BODY. THIS IS NORMAL HERE. STRAIGHT THROUGH.
- **Again:** THROUGH IT. I HAVE SAID THIS ONCE ALREADY TODAY.

### 10 — HERO POWER · B-33P · one drone, then a gallery

- **Brief:** EVERY HERO HAS A POWER. B-33P SHOOTS. PRESS RIGHT OR D. THE CANNON IS COMPANY PROPERTY.
- **Touch:** … TAP THE RIGHT STRIP, OR THE USE DISC. …
- **Again:** IT GOT PAST. SHOOT THE NEXT ONE. THE CANNON IS ALREADY SIGNED OUT TO YOU.
- **Wrong way:** YOU AVOIDED IT. COMMENDABLE. NOT THE SECTION. SHOOT THE NEXT ONE.
- **Requires:** the drone shot down.
- **The cooldown, on the first shot** — not in the brief, because until you have
  fired once the orb has nothing to report:
  > THE ORB BY YOUR HEAD IS THE RECHARGE. IT FILLS BACK UP ON ITS OWN. YOU CANNOT HURRY IT. I HAVE ASKED.
- The readiness orb beside the hero appears **only here**, with the power it
  belongs to — for the nine sections before this it was a meter for a control
  the player did not have. Same rule as the USE disc.
- **Touch only — the zone card.** The canvas has been a two-button surface since
  section one and nothing has said so: left 70% JUMP, right 30% POWER. Both
  halves wash (shading only one reads as "this half is disabled"), with a dashed
  seam between them. It shows *here* because this is the first control that
  lives in the right-hand strip.
  - Three rows a side — what it does, **how you do it**, and how much of the
    screen it is — under a `THE WHOLE SCREEN IS TWO BUTTONS` header. The
    percentage alone was a statistic; `TAP AND HOLD / ANYWHERE ON THIS SIDE` is
    the instruction, and the instruction is the new information: the discs in
    the corners had everyone believing the buttons were the only places that
    worked.
  - **7 seconds**, not the 5 of a speech line. It has to survive the gap between
    being read and the drone it is about actually arriving (~3.8s after the
    brief starts). The first shot fades it early.
- **On pass:** the shoot gallery — drones at five altitudes, two buzzbirds, two
  crate stacks, a target.

### 11 — PORTAL TAG · B-33P → Lorenzo

- **Brief:** LAST PORTAL. IT PUTS YOU BACK IN THE BODY YOU CLOCKED IN WITH. HR IS FIRM ON THAT ONE.
- **Again:** THROUGH IT. YOU CANNOT SIGN THE FORM AS SOMEBODY ELSE. I HAVE TRIED.
- The module borrowed two bodies to teach two things and hands the first one
  back before the paperwork. The certificate is made out to whoever is standing
  there at the end.

### Conceding

After four reopens of the same section:

> I AM MARKING THIS ONE SATISFACTORY. NOBODY AUDITS ME.

---

## Epilogue

The lane winds down to a stop (the hero's run cycle is driven by world speed, so
his legs wind down with it), the camera pushes in to 3.2x, and Gary walks on
from the right — up the track, against the direction everything has been
travelling all day. He stops about half a body from the hero: a two-shot, not
two dots in a lane. He does not talk and walk; he is not paid for two things.

Every beat is skippable — one press advances — so an impatient player taps
through in seconds and a reader gets the whole bit.

The form's order, not a storyteller's: deductions are processed before awards,
so payroll takes the coins back and *then* he certifies you.

| Beat | Line | Hero | Gary |
|---|---|---|---|
| arrival | *(silent walk-on)* | stands, then waves hello | walks on, stands |
| 1 | THAT IS THE MODULE. ALL OF IT. INCLUDING THE PARTS I DISAGREE WITH. | idle | idle |
| 2 | PAYROLL HAS RECLAIMED THOSE. THEY WERE TRAINING COINS. TRAINING COINS ARE NOT LEGAL TENDER. | **scowls** | the counter drains to zero under this line, one coin and one blip per tick, pitch falling as it goes |
| 3 | I DID ASK. I ASKED TWICE. THE SECOND TIME IN WRITING. | still sour | idle |
| 4 | YOU ARE CERTIFIED. THE CERTIFICATE IS NON-BINDING AND EXPIRES ON CONTACT WITH AN ACTUAL CABINET. | idle | idle |
| 5 | THERE IS A CELEBRATION STEP. SECTION ELEVEN. I HAVE ALREADY LOGGED IT AS COMPLETED. | **celebrates** | **rolls his eyes** — streamers and confetti rain for 2.8s |
| 6 | THAT IS THE CELEBRATION. THE STREAMERS ARE FROM STORES. THEY ARE COMING BACK. | back to idle | everything on the floor vanishes on the coin-reclaim cue |
| 7 | RIGHT. I HAVE A SHOP TO HAUNT, AND I HAUNT IT DURING BUSINESS HOURS ONLY. IT IS POLICY. | idle | idle |
| card | SIGNED, GARY. STILL ON THE CLOCK. STILL NOT PAID EXTRA. | **celebrates** | idle |

**Gary never celebrates.** Everything else he does is compliance under protest —
he appeals to HR, he files forms, he reclaims coins on a technicality — so a
Gary who is genuinely pleased for you undoes the joke the module rests on. The
form celebrates on his behalf: the step is logged as completed, the streamers
fire, and he stands in them rolling his eyes. Then he takes them back, because
Stores is the department on his own signature line.

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
    G. — STORES & PHYSICAL SWITCHES
```

It sits in the band between Gary's card and the pair's heads, and it does not
dim the scene: the whole point of the ending is watching the two of them stand
there.

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
  as the right hero. Reviewing an eleven-section module by playing all eleven of them
  every time is how the last section ends up unreviewed.
  - The forward arrow is *also* the ability key, so while the hero is holding a
    live power — B-33P in sections 9 and 10 — the arrow stays the cannon and
    only **N** skips. Otherwise the section that teaches shooting could not be
    tested in the build it is being reviewed in.
