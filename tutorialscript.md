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
| Spawn distance | a screen and a half ahead — a challenge arrives ~3.8s after Gary starts talking |
| Speech hold | 5s, two rows, unhurried |
| Settle between sections | 1.6s |
| Opening beat | 4.5s over an empty lane |
| Reopens before he concedes | 4 |
| Room label | `MANDATORY TRAINING` bottom-left, gold, the food court's and trophy room's exact treatment; `SECTION n/10` rides the same midline beside it |
| Gary's card | pale plate, high (y 18), narrow wrap (296) — out of the band a held jump travels through |
| Lighting | warm overhead cones every 108px with a hot core and a floor pool; the fixtures are above frame and never drawn |
| Pause | 20% scrim, and Gary's card stays up at full strength — including the *last* thing he said if the live line has expired |

## Sections

Ten sections. `requires` is what makes this Gary's screen rather than a
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
- 200px apart — roughly double the spawner's own fairness floor, on purpose. The
  player has to SEE the next rung and decide, not clear it on reflex.

### 3 — COINS · Lorenzo · a coin arc, then a ! box

- **Brief:** COINS. RUN THROUGH THEM. THE BOX AFTER THEM IS ALSO COINS — JUMP UP INTO IT.
- **Again:** THE BOX IS STILL FULL. HIT IT FROM UNDERNEATH. ANOTHER ONE IS COMING.
- **Requires:** the box actually opened. Missing a coin or two is not worth
  reopening a section over; the box is.
- The box floats at alt 60 rather than the usual 40 — just under Lorenzo's apex,
  where the jump lingers, which turns an 0.07s strike window into 0.4s.
- **On pass:** the playground — five coin arcs, five ! boxes, a scatter of ground
  coins, five seconds of free play, then the lane clears.
- **The coins are NOT taken here.** They stay on the counter for the rest of the
  module. Gary reclaims them in the epilogue, in person.

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

### 6 — PORTAL TAG · Lorenzo → Mochi

- **Brief:** RUN THROUGH THE PORTAL. DO NOT JUMP IT. SOMEONE JUMPED IT ONCE. THERE WAS PAPERWORK.
- **Again:** OVER IT IS NOT THROUGH IT. I AM REOPENING THE SECTION.

### 7 — DOUBLE JUMP · Mochi · a stack of six

- **Brief:** MOCHI JUMPS TWICE AND NOT VERY HIGH. PRESS JUMP AGAIN IN MID-AIR. ONE JUMP WILL NOT CLEAR THAT.
- **Touch:** … TAP AGAIN IN MID-AIR. …
- **Again:** INCOMPLETE. TWICE. IN THE AIR. THE FORM IS SPECIFIC.
- **Wrong way:** YOU GOT OVER IT ON ONE. THE SECTION SPECIFIES TWO.
- **Requires:** a second jump in the air. Mochi is here because she jumps LOW —
  57px against Lorenzo's 89 — so a stack this tall can only be cleared by the
  thing being taught.

### 8 — PORTAL TAG · Mochi → B-33P

- **Brief:** ANOTHER PORTAL, ANOTHER BODY. THIS IS NORMAL HERE. STRAIGHT THROUGH.
- **Again:** THROUGH IT. I HAVE SAID THIS ONCE ALREADY TODAY.

### 9 — HERO POWER · B-33P · one drone, then a gallery

- **Brief:** EVERY HERO HAS A POWER. B-33P SHOOTS. PRESS RIGHT OR D. THE CANNON IS COMPANY PROPERTY.
- **Touch:** … TAP THE RIGHT STRIP, OR THE USE DISC. …
- **Again:** IT GOT PAST. SHOOT THE NEXT ONE. THE CANNON IS ALREADY SIGNED OUT TO YOU.
- **Wrong way:** YOU AVOIDED IT. COMMENDABLE. NOT THE SECTION. SHOOT THE NEXT ONE.
- **Requires:** the drone shot down.
- **Touch only — the zone card.** The canvas has been a two-button surface since
  section one and nothing has said so: left 70% JUMP, right 30% POWER. Both
  halves wash (shading only one reads as "this half is disabled"), a dashed seam
  between them, up for as long as the brief and dismissed early by the first
  shot. It shows *here* because this is the first control that lives in the
  right-hand strip.
- **On pass:** the shoot gallery — drones at five altitudes, two buzzbirds, two
  crate stacks, a target.

### 10 — PORTAL TAG · B-33P → Lorenzo

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

| Beat | Line | Hero |
|---|---|---|
| arrival | *(silent walk-on)* | stands, then waves hello |
| 1 | THAT IS THE MODULE. ALL OF IT. INCLUDING THE PARTS I DISAGREE WITH. | idle |
| 2 | YOU ARE CERTIFIED. THE CERTIFICATE IS NON-BINDING AND EXPIRES ON CONTACT WITH AN ACTUAL CABINET. | idle |
| 3 | PAYROLL HAS RECLAIMED THOSE. THEY WERE TRAINING COINS. TRAINING COINS ARE NOT LEGAL TENDER. | **scowls** — the counter drains to zero under this line, one coin and one blip per tick, pitch falling as it goes |
| 4 | I DID ASK. I ASKED TWICE. THE SECOND TIME IN WRITING. | still sour |
| 5 | RIGHT. I HAVE A SHOP TO HAUNT, AND I HAUNT IT DURING BUSINESS HOURS ONLY. IT IS POLICY. | idle |
| card | SIGNED, GARY. STILL ON THE CLOCK. STILL NOT PAID EXTRA. | **celebrates** |

The reclaim is the honest thing as well as the gag: nothing earned in here was
ever going into the save file, so the counter is walked back to zero in front of
you rather than having quietly vanished eight sections ago. The readout stays on
screen at zero — that is where the joke lives.

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
- **N** — dev builds only (`npm run dev`), wired in `src/dev/index.js` — closes
  the current section on the spot and moves to the next. A skipped portal still
  hands the body over, so the epilogue is reached as the right hero. Reviewing a
  ten-section module by playing all ten of them every time is how the last
  section ends up unreviewed.
