# Gameplay Messages Reference

Every distinct string shown to the player during an active run, and the exact
condition that causes it to appear. This is a catalog for anyone auditing tone,
adding a new hero/boss, or checking for duplicate/missing lines — it is not
itself game logic, so it will drift from source over time; re-derive from code
rather than trusting it blindly for anything load-bearing.

Source of truth is primarily [src/data/jokes.js](../src/data/jokes.js), with
triggers wired up in [src/game/run.js](../src/game/run.js),
[src/game/boss.js](../src/game/boss.js), [src/game/hud.js](../src/game/hud.js),
[src/game/tutorial.js](../src/game/tutorial.js),
[src/data/briefings.js](../src/data/briefings.js), and
[src/game/minigames/index.js](../src/game/minigames/index.js).

**Display mechanics**: "Floaties" are short-lived action feedback that stack
vertically over the hero (~2.4–3.2s). "Speech bubbles" are Gary/character-style
cards that persist until replaced. Color is a rough semantic code: gold
`#f6d33c` = achievement/positive action, teal/cyan `#48e0c8`/`#72d8f0` = mission
progress, light blue `#a8e6ff` = shield/defense, green `#7ce8a0`/`#8ddd8d` =
rewind/checkpoint, red `#e04848` = death/failure, pink `#ffb8d8` = Miss Chomp.

**Copy-review scope**: section 17 distinguishes flavour (which may be strange)
from feedback and instruction (which must say what happened or what to do).
Its suggestions are proposals only; this review does not change live game copy.

---

## 1. Fail / death messages

### Generic death
Trigger: player dies with no more specific cause available.
Random pick from `FAIL_MESSAGES` in [jokes.js](../src/data/jokes.js#L5-L12):
- "DEFEATED BY GEOMETRY"
- "TOO HEROIC FOR CURRENT RAM"
- "GRAVITY REMAINS UNDEFEATED"
- "UNPLUGGED FOR SCHEDULED MAINTENANCE"
- "THE FLOOR FILED A COMPLAINT"
- "RUNNING WAS THE EASY PART"
- "THE ARCADE REGRETS THIS OUTCOME"

### Pit fall
Trigger: player falls into an empty pit/gap.
Random pick from `PIT_FAIL_MESSAGES` ([jokes.js](../src/data/jokes.js#L27-L35)):
- "GRAVITY REMAINS UNDEFEATED"
- "THE FLOOR WAS NOT THERE. IT HAD NEVER BEEN THERE."
- "DOWN IS THE ONE DIRECTION THAT ALWAYS WORKS"
- "A HOLE. WORKING EXACTLY AS INTENDED."
- "PLUMBING FAILURE. YOURS."
- "THAT WAS A GAP. IT REMAINS A GAP."
- "NO NOTES. TEXTBOOK DESCENT."

### Hazard-specific death
Trigger: death cause was a specific hazard type, keyed in `HAZARD_FAIL_MESSAGES`
([jokes.js](../src/data/jokes.js#L17-L20)):
- Barrel / fire barrel: "A BARREL HAS WON THE ARGUMENT"

### Pit fill material death
Trigger: player dies in a pit that has been filled with a hazardous material
(keyed by fill id from `game/pitFill.js`), `FILL_FAIL_MESSAGES` ([jokes.js](../src/data/jokes.js#L45-L60)):
- **Tar**: "THE TAR ACCEPTS ALL APPLICANTS" / "THE TAR IS NOT A FLOOR. IT WAS NEVER A FLOOR."
- **Lava**: "THE FLOOR WAS WARMER THAN ADVERTISED" / "MOLTEN. BRIEFLY YOURS."
- **Slush**: "THE WATER WAS COLD AND UNIMPRESSED" / "BLACK ICE. NO NOTES."
- **Spikes**: "THE SPIKES WERE LOAD-BEARING. YOU WERE NOT." / "EVERY TOOTH FOUND SOMETHING TO DO" / "THAT PLATE HAS BEEN WAITING ALL SHIFT"
- **Gears**: "THE GEARBOX ACCEPTS ALL DEPOSITS" / "MAINTENANCE WILL NOTE THE OBSTRUCTION" / "THE MACHINE DID NOT NOTICE YOU"

---

## 2. Boss messages

### Boss hit floatie
Trigger: a projectile/attack lands on the boss. Short line 90% of the time,
long line 10% of the time. From [jokes.js](../src/data/jokes.js#L175-L206).
- Short: "DIRECT HIT" / "OUCH." / "OW." / "NOTED." / "THAT COUNTED." / "FELT THAT."
- Long (10%): "FORM 27-B: DAMAGE DISPUTE. DENIED."

### Boss-return damage
Trigger: the player breaks a hazard thrown by the boss. That destruction also
removes one boss health point; it is not a literal projectile deflection.
- Short: "REDIRECTED" / "SENT BACK." / "RETURNED TO SENDER." / "OOF." / "THAT ALSO COUNTED."
- Long (10%): "THAT ONE DIDN'T COUNT. - EGGSHELL"

### Boss joke-phase lines
Trigger: boss health crosses a scripted threshold (`jokeAt`/`joke2At` in
[boss.js](../src/game/boss.js#L20-L51)). Shown as a speech bubble.
- **Boss 1 (Eggshell / Clown-Copter), 50% HP**: "LOW BATTERY. THE COPTER PAUSES. EGGSHELL DISPUTES ALL DAMAGE SO FAR."
- **Boss 2 (Dust Devil), 50% HP**: "IT STOPS TO EMPTY ITS BAG. IT IS VISIBLY ASHAMED. IT APOLOGIZES VIA LED."
- **Boss 3 (Eggshell & Power Strip), 60% HP**: "THE CRAYON IQ CERTIFICATE DEPLOYS AS A SHIELD. IT ABSORBS NOTHING."
- **Boss 3, 25% HP**: "HIS SHELL IS STUCK IN THE COPTER DOOR. HE INSISTS THIS IS PHASE FIVE."

### Boss intro lines
Trigger: boss encounter begins; shown as a ~4s speech bubble before the fight.
- **Boss 1**: "IT HAS FIVE HEALTH BARS. FOUR ARE LABELED \"PRESENTATION ERROR\"."
- **Boss 2**: "IT IS SET TO DEEP CLEAN. IT IS SO SORRY ABOUT THIS." — subtitle: "HE HAS MOPPED THE CEILING. HE HAS POLISHED THE INSIDE OF A GLASS TUBE. NOW, HE HAS TO CLEAN YOU. HE IS NOT HAPPY ABOUT IT."
- **Boss 3**: "THE STRIP HAS ONE MORE SWITCH THAN PHYSICALLY POSSIBLE. DO NOT COUNT THEM."

### Boss taunts (UNPLUGGED difficulty)
Trigger: random during the boss fight, only on the "UNPLUGGED" difficulty tier.
From [jokes.js](../src/data/jokes.js#L93-L112):
- "YOU ARE DOING VERY ADEQUATELY. I HAVE MADE A NOTE."
- "MY IQ IS 300 AND YOURS IS A HIGH SCORE."
- "I HAVE FILED A FORM DISPUTING THAT LAST JUMP."
- "THIS COPTER IS FINE. THE BEEPING IS DECORATIVE."
- "A CHILD COULD DO THIS. A CHILD DID. I FIRED HIM."
- "THE FOURTH HEALTH BAR IS REAL. PROBABLY."
- "I HAVE BEEN LOSING TO PLUMBERS SINCE 1986."
- "MY DOCTORATE IS IN STATISTICS. IT HAS NEVER ONCE HELPED."
- "FOUR DECADES IN THIS SEAT. THE ERGONOMICS ARE ATROCIOUS."

### Eggshell narration (corrupted/UNPLUGGED mode)
Trigger: random ambient observation lines during corrupted-mode gameplay.
From [jokes.js](../src/data/jokes.js#L164-L172):
- "HE JUMPS. HE DOES NOT. I AM NOT WATCHING."
- "THE HERO TRIPS. MAGNIFICENTLY. I ASSUME."
- "NOTHING IS HAPPENING. NOTHING HAS EVER HAPPENED."
- "A BARREL APPROACHES. OR A DUCK. MY NOTES ARE BAD."
- "THIS IS THE PART WHERE THEY LOSE. ANY MOMENT NOW."

---

## 3. Power-up pickup messages

Trigger: picking up the corresponding capsule ([run.js](../src/game/run.js#L7083-L7101)).
- Plain timed power pickup: no floatie. The active-power row identifies the pickup and shows its remaining time.
- **Rewind, first pickup only**: "REWIND ARMED: YOUR NEXT MISTAKE UNDOES ITSELF" (mint green `#7ce8a0`)
- **Duplicate pickup of an already-held power**: "OVERCHARGED"
- **Toaster/appliance**: "THE HIGHLY NECESSARY GOLDEN APPLIANCE. IT IS A TOASTER."
- **Breaker-box minigame win reward**: "BREAKER BONUS: [POWER NAME]" e.g. "BREAKER BONUS: SHIELD"
- **Rewind consumed**: "REWIND SPENT" (mint green, ~2.4s), triggered when the stored rewind is actually used.

---

## 4. Combo & beat-lock messages

- **On-beat combo** ([run.js](../src/game/run.js#L4961)): trigger is every 4th consecutive on-beat hit in a rhythm-locked stage. Message: "ON BEAT x[N]" e.g. "ON BEAT x4", "ON BEAT x8". Gold.
- **Full loop** ([run.js](../src/game/run.js#L5046)): trigger is completing an entire rhythm pattern without a miss. Message: "FULL LOOP." Gold.

---

## 5. Hero ability activation messages

Trigger: the hero fires/uses their unique ability. Generic fallback is the
hero's `ability.label` ([run.js](../src/game/run.js#L3442)), but several heroes
override with charged/uncharged variants:

| Hero | Uncharged | Charged | Notes |
| --- | --- | --- | --- |
| Lorenzo (Plumber) | "WRENCH FLURRY" | "WRENCH SMASH" | charged hits a ground target |
| Gnash (Needlemouse) | "BURST" | — | invincible burst |
| Fernwick (Prophecy) | "SHIELD BASH. EARS RINGING." | — | only with bash mod equipped, cyan `#a8e6ff` |
| B-33P (Robot) | "PEW" / "FULL CYAN" | "FULL CYAN" | lemon cannon shots |
| Mochi (Cloud) | "PROBABLY NORMAL PHYSICS" | "DEFINITELY NOT NORMAL PHYSICS" | pink `#ffb7c3` |
| Kiko (Detective) | "WARNED" | "FORMALLY WARNED" | light blue `#8fe4ff` |
| Clara (Adventurer) | "SHE FIRED. TWICE." | "SHE FIRED. GENEROUSLY." | gold/orange `#ffd27a` |
| Ray M'n (Disembodied) | "DEFLECTED" | — | on fist projectile return, cyan `#a8e6ff`; also "RAY M'N SCATTERED. REASSEMBLY IS IN PROGRESS." when the ability ends |
| Grumpos (Caveman) | "BOY." (25% chance) | — | tan `#ecc3a1`; also "THE AXE LODGED IN THE SCENERY. INTENDED." (15% chance) |
| Miss Chomp (Eating Cloud) | "MISS CHOMP ATE IT. POLITELY." | "MISS CHOMP ATE ALL OF IT. POLITELY." | miss: "NOTHING ON THE MENU."; air-target miss: "AIR: SURPRISINGLY LOW CALORIE." |

**Miss Chomp return floatie** (eaten projectile returns to player), random pick, pink `#ffb8d8`:
- "MWAH. — DARLING"
- "RETURNED WITH A NOTE. XOXO"
- "WAKA, DARLING."
- "DEE-LIGHTFUL. THANK YOU."

---

## 6. Mission / goal messages

- **Goal met** ([run.js](../src/game/run.js#L4767)): a counted primary objective completes. "GOAL MET. GET TO THE FINISH LINE." Displayed ~2.4s in the goal toast panel. Reach, fuse, blackout, and escape missions instead complete at the finish/end sequence.
- **Bonus/challenge complete** ([run.js](../src/game/run.js#L4760)): optional challenge finished. Format "BONUS: [CHALLENGE DESCRIPTION]", e.g.:
  - "BONUS: COLLECT 20 COINS"
  - "BONUS: TAKE NO DAMAGE"
  - "BONUS: BREAK 6 !-CRATES. THE ! MEANS HIT IT."
  - "BONUS: HIT 4 BOOST PADS"
  - "BONUS: BONK THE CLOWN-COPTER FROM BELOW, 3 TIMES. IT IS UNDERINSURED."
  - "BONUS: DESTROY 5 TARGETS. THEY ARE VERY DESTROYABLE."
  - "BONUS: RECOVER 4 EXTENSION CORD PIECES. THE CORD WAS SHREDDED. RUDELY."
  - "BONUS: RUN TO THE BEAT. OR NEAR THE BEAT. THE BEAT IS FLEXIBLE."
  - "BONUS: SURVIVE THE BLACKOUT. THE DARK IS BUDGETARY."
  - "BONUS: ESCORT 3 CONFUSED CABINET RESIDENTS TO SAFETY."
  - "BONUS: DESTROY 5 HOSTILE PRINTERS. HR HAS APPROVED THIS."
- **Appliance bonus** ([run.js](../src/game/run.js#L7093)): collecting the optional golden toaster. "BONUS: THE GOLDEN APPLIANCE" (shown silently, no toast sound).
- **Bench upgrade announcement** ([run.js](../src/game/run.js#L1708)): once per run, if the player starts with purchased power-up bench upgrades. Format "[UPGRADE NAME] + [RANK]" e.g. "SHIELD I".

---

## 7. Mission counter updates

- **Target progress floatie** ([run.js](../src/game/run.js#L3912)): breaking a mission target. Current format is bare "[CURRENT]/[TOTAL]", e.g. "2/6". Teal `#48e0c8`.
- **Chase progress**: format "CAUGHT [COUNT]/[TOTAL]. IT FILED A COMPLAINT." Gold.
- **Checkpoint** ([run.js](../src/game/run.js#L6053)): touching a checkpoint restores battery. Format "CHECKPOINT. +[N] BATTERY." when a cell actually lands; at full battery nothing is restored and it reads "CHECKPOINT. THE ARCADE REMEMBERS THIS SPOT." Green `#8ddd8d`.
- **Bridge earned**: completing a challenge that unlocks a gap-crossing bridge. "BRIDGE. YOU EARNED IT." Light blue `#b8e0f8`.
- **Residents delivered** ([run.js](../src/game/run.js#L6059)): escort-mission progress. Format "RESIDENTS DELIVERED: [CURRENT]/[TOTAL]". Teal.
- **Escape mission start**: mission description shown when an escape/wave mission begins (from `stages.js`), e.g. "OUTRUN THE UNPLUGGENING ITSELF. THE SOCKET IS CLOSE." / "ESCAPE THE FOLDING WAVE. DO NOT BECOME A FLAP."

---

## 8. Stage / act introduction messages

### Act banner
Trigger: the first stage of a new act begins (authored in
[stages.js](../src/data/stages.js), rendered by [hud.js](../src/game/hud.js#L1055-L1098));
full-screen glitch/dim effect, ~4.0s (`ACT_BANNER_TIME`), two-part "HEAD. TAIL"
format.
- **Act I**: "ACT I. THE ARCADE GOES DARK. THE EMERGENCY LIGHTING IS ALSO UNPLUGGED."
- **Act II**: "ACT II. THE EXTENSION CRISIS. EVERYONE IS COLD AND BRAVE."
- **Act III**: "ACT III. THE OUTLET AT THE END OF EVERYTHING. THE CASTLE IS FOUR INCHES TALL."

### Briefing panels
Trigger: stage briefing screen shown before a stage starts, memo/letterhead
style, multiple stacked panels per stage ([briefings.js](../src/data/briefings.js#L8-L67)).
E.g. stage `plumber-1`: "INTERRUPTION BY DON K. EGGSHELL, PHD: 'MY IQ IS 300 AND YOURS IS A HIGH SCORE. I HAVE SYSTEMATICALLY DISCONNECTED THE PRIMARY POWER GRID...'"; stage `plumber-2`: "NOTIFICATION FROM INTERNAL MAINTENANCE: DUST DEVIL 9000 IS CURRENTLY OPERATIONAL..."

### Opening story panels
Trigger: shown once on a new save / game start ([jokes.js](../src/data/jokes.js#L389-L404)):
1. "THE ARCADE. 11:58 PM. EVERY CABINET DREAMING ITS LITTLE ELECTRIC DREAM."
2. "DON K. EGGSHELL, PHD, UNPLUGS THE MASTER POWER STRIP. 'IF I CANNOT WIN... NOBODY PLAYS.' HIS VACUUM IS ALSO CHARGING. PRIORITIES."
3. "DUE TO BUDGET CUTS, THE ARCADE CAN ONLY RENDER ONE HERO AT A TIME. THE HEROES ACCEPT THIS WITH GRACE. AND ONE FORM COMPLAINT."
4. "EIGHT HEROES. ONE SOCKET. A RELAY BEGINS. THIS IS THE MOST IMPORTANT CRISIS IN HISTORY. EVERYONE AGREES."

---

## 9. Relay / hero-tag messages

### Exit line
Trigger: the *first* time each hero tags out through a relay portal in a run
(subsequent tags for the same hero are silent). ~1.8s speech bubble.
From [jokes.js](../src/data/jokes.js#L116-L162), wired in [run.js](../src/game/run.js#L4135-L4143).

| Hero | Lines |
| --- | --- |
| Lorenzo | "THE VALVE IS SEALED. THE REST IS YOUR PROBLEM." / "APPLYING INDUSTRIAL THREAD SEALANT AND LEAVING." / "I AM CLOCKING OUT. THE DUCTWORK KNOWS WHAT IT DID." |
| Gnash | "ALREADY AT THE NEXT CORNER. CATCH UP." / "TOO SLOW. I ALREADY PASSED THE VALVE." / "I FINISHED THIS SHIFT BEFORE IT STARTED." |
| Fernwick | "THE RECEIPT SAYS SOMEONE ELSE HANDLES THIS PART." / "MY PROPHECY ENDS HERE. IT WAS A SHORT PROPHECY." / "THE RECEIPT EXPRESSLY FORBIDS RUNNING. I GO." |
| B-33P | "CHASSIS POWERING DOWN. CYAN LEVEL: CRITICAL." / "HANDING OFF. LOGGING THIS AS A SUCCESS. IT WAS NOT." / "SHIFT COMPLETE. UPDATE STILL WILL NOT INSTALL." |
| Mochi | "POYO. (THE PIXELS WARP SLIGHTLY.)" / "POYO." / "POYO? (IT IS A GOODBYE. PROBABLY.)" |
| Clara | "SHE LEFT THE WAY SHE ARRIVED: DRAMATICALLY, AND MID-SENTENCE." / "TO BE CONTINUED." / "OUR HEROINE VANISHED. THE CROWD GASPED. (THE CROWD WAS A VENDING MACHINE.)" |
| Kiko | "THE FILE STAYS OPEN. SO DOES THE DOOR." / "I HAVE LEFT MY CARD WITH THE BARREL." / "I AM NOT LEAVING. I AM CANVASSING." |
| Ray M'n | "HANDS OFF. LITERALLY. THEY ARE UNSECURED." / "MY HAND IS SELF-EMPLOYED. IT LEAVES WHEN IT WANTS." / "THE SHOES DID MOST OF THAT. I PROVIDED LEADERSHIP." |
| Grumpos | "BOY. TAKE THE FIELD." / "PREPARE FOR BALLISTIC DISPATCH. I AM LEAVING." / "THE AXE STAYS WITH ME. BOY." |

### Tag line (stage complete)
Trigger: stage completes with that hero active; shown on the results screen.
One line per hero, from [jokes.js](../src/data/jokes.js#L81-L91):
Lorenzo "STANDARD PROCEDURE." · Gnash "FINALLY." · Fernwick "THE RECEIPT FORETOLD THIS." · B-33P "LOW ON CYAN." · Mochi "POYO." · Clara "SUDDENLY: CLARA VAULT." · Kiko "THIS IS A CRIME SCENE." · Ray M'n "HANDS OFF. LITERALLY." · Grumpos "BOY."

---

## 10. Rank / grade messages

Trigger: stage completion, rank computed from score. Shown on the results
screen ([jokes.js](../src/data/jokes.js#L73-L80)):
- **C**: "C. A RANK. TECHNICALLY."
- **B**: "B. THE ARCADE NODS SLOWLY."
- **A**: "A. GENUINELY GOOD. DO NOT LET IT CHANGE YOU."
- **S**: "S. THE ARCADE IS PROUD. THE ARCADE IS A BUILDING."
- **CONCERNING** (very low score): "CONCERNING. WE HAVE QUESTIONS. WE WILL NOT ASK THEM."

---

## 11. Tutorial messages

Trigger: each training section begins/ends during the tutorial run
([tutorial.js](../src/game/tutorial.js#L363-L655)); Gary's card stays up until
he speaks again. Keyboard/touch have separate phrasing where an input differs.

| Section | Message |
| --- | --- |
| JUMP | "CRATES. HOLD SPACE TO JUMP. I DID NOT WRITE SECTION ONE." (kb) / "CRATES. HOLD THE LEFT OF THE SCREEN. I DID NOT WRITE SECTION ONE." (touch) |
| JUMP retry | "YOU TAPPED IT. HOLD IT DOWN. THE CRATE COMES BACK." (kb) / "YOU FLICKED IT. HOLD IT DOWN. THE CRATE COMES BACK." (touch) |
| VARIABLE JUMP | "THREE STACKS, EACH TALLER. HOLD LONGER FOR EACH. THE MANUAL CALLS THIS INTUITIVE." |
| COINS | "RUN THROUGH THE COINS. THE BOX BREAKS OPEN FROM UNDERNEATH — COINS, MOSTLY. SOMETIMES BETTER." |
| POWER SLIDE | "POWER SLIDE. HOLD DOWN OR S, JUST BEFORE THE CONE. KICK IT. IT IS NOT LOAD-BEARING." (kb) / "POWER SLIDE. SWIPE DOWN AND HOLD, JUST BEFORE THE CONE. KICK IT. IT IS NOT LOAD-BEARING." (touch) |
| SHIELD | "SHIELD CAPSULE. TAKES ONE HIT FOR YOU. PROTECTIVE EQUIPMENT ARRIVES AFTER THE HAZARDS. THAT IS PROCUREMENT." |
| TOASTER | "THAT IS A TOASTER. EVERY CABINET HAS ONE HIDDEN IN IT. IT IS OPTIONAL, SO IT IS NOT MY DEPARTMENT." |
| PORTAL TAG | "RUN THROUGH THE PORTAL. DO NOT JUMP IT. SOMEONE JUMPED ONE ONCE. THERE WAS PAPERWORK." |
| DOUBLE JUMP | "KIKO JUMPS TWICE. JUMP AGAIN IN MID-AIR. THE FORM REQUIRES BOTH." (kb) / "KIKO JUMPS TWICE. TAP AGAIN IN MID-AIR. THE FORM REQUIRES BOTH." (touch) |
| HERO POWER | "EVERY HERO HAS A POWER. B-33P SHOOTS. PRESS RIGHT OR D. THE CANNON IS COMPANY PROPERTY." (kb) / "...TAP THE RIGHT STRIP, OR THE USE DISC. THE CANNON IS COMPANY PROPERTY." (touch) |

### Retry/fail messages
Trigger: player fails a section requirement.
- "YOU FLICKED IT. HOLD IT DOWN. THE CRATE COMES BACK." (incomplete jump hold)
- "INCOMPLETE. SLIDE AT THE CONE, NOT BEFORE IT. THE BOOT EXPIRES." (mistimed slide)
- "YOU AVOIDED IT. COMMENDABLE. NOT THE SECTION. SHOOT THE NEXT ONE." (wrong action taken)

### Completion tally
Trigger: each section is completed or explicitly skipped. Format
"[STEP LABEL] — LOGGED" or "[STEP LABEL] — NOT TAKEN", grey `#a8a8a8`, e.g.
"JUMP — LOGGED", "DOUBLE JUMP — NOT TAKEN".

### Outro sequence
Trigger: after all training sections complete ([tutorial.js](../src/game/tutorial.js#L682-L733)):
1. "THAT IS THE MODULE. INCLUDING THE PARTS I DISAGREE WITH."
2. "PAYROLL HAS RECLAIMED THOSE. TRAINING COINS ARE NOT LEGAL TENDER."
3. "I DID ASK. I ASKED TWICE. THE SECOND TIME IN WRITING."
4. "YOU ARE CERTIFIED. READ THE SMALL PRINT. IT IS ALL SMALL PRINT."
5. "THERE IS A CELEBRATION STEP. I HAVE LOGGED IT AS COMPLETED."
6. "THAT IS THE CELEBRATION. THE STREAMERS ARE FROM STORES. THEY GO BACK."
7. "RIGHT. I HAVE A SHOP TO HAUNT, AND ONLY DURING BUSINESS HOURS. IT IS POLICY."

### Misc tutorial floaties
- "SHIELD BROKE. IT DID ITS JOB." (shield breaks during tutorial)
- "PEW" (cannon fires)
- "SHIELD" (shield picked up/used)
- "THE HIGHLY NECESSARY GOLDEN APPLIANCE. IT IS A TOASTER." (toaster found)

---

## 12. Minigame results

Trigger: breaker-box minigame ends ([minigames/index.js](../src/game/minigames/index.js#L80-L95)):
- **Success**: title "POWER RESTORED" (green `#48c848`), optional bonus subtitle in gold depending on modifier.
- **Failure**: title "THE BREAKER REMAINS UNIMPRESSED" (red `#e04848`), subtitle "A CHILD COULD REWIRE THAT. A CHILD."
- **Skipped**: title "SKIPPED. THE BREAKER SHRUGS." (gold), subtitle "FINE. WE WILL POWER IT THE BORING WAY."

---

## 13. Hub / food court character lines

Trigger: player visits the food court hub and interacts with a character;
each interaction cycles to the next line in that character's pool (one line
per visit). Speech bubble, Gary-style card. From [jokes.js](../src/data/jokes.js#L208-L387).
Representative examples per character (each has 7–12 lines in the pool):
- **Lorenzo** (plumbing/food court): "THE PIPES HERE ARE DECORATIVE. IT DISGUSTS ME." · "I BROUGHT A TROMBONE. FOR PLUMBING."
- **Gnash** (speed/impatience): "I FINISHED TALKING TO YOU YESTERDAY. YOU ARE JUST NOW ARRIVING." · "THE SODA MACHINE IS STILL DISPENSING MY DRINK. I FINISHED IT TEN MINUTES AGO."
- **Fernwick** (receipts/fate): "MY PROPHECY MENTIONS A 'BUY ONE GET ONE' EVENT. DARK TIMES." · "THE RECEIPT FADES FURTHER EVERY DAY. AS DO WE ALL."
- **B-33P** (cyan/status): "STATUS: OPERATIONAL. CYAN: LOW. MORALE: ADEQUATE." · "THE VACUUM CLEANED MY BOOT SECTOR. I FEEL SEEN."
- **Mochi** (POYO variations): "POYO." · "POYO. (THE STARS LEAN CLOSER.)" · "POYO?"
- **Clara** (narration prose): "CHAPTER ONE: THE FOOD COURT. ANCIENT. ABANDONED. THE PRETZEL STAND WAS STILL WARM. SHE PRESSED ON." · "SHE RAISED THE NAPKIN DISPENSER ALOFT. PRICELESS. MUSEUMS WOULD GO TO WAR FOR THIS. SHE KEPT IT."
- **Kiko** (investigation): "THE SOCKET IS A CRIME SCENE. I HAVE TAPED IT OFF. NOBODY HAS RESPECTED THE TAPE." · "I READ THE VENDING MACHINE ITS RIGHTS. IT WAIVED THEM."
- **Ray M'n** (limbs/shoes): "THE LIMB INSPECTOR LEFT WITHOUT COMPLETING THE FORM." · "MY HAND IS SELF-EMPLOYED. WE HAVE A PROFESSIONAL ARRANGEMENT."
- **Grumpos** (axe/"BOY"): "BOY." · "THE AXE RETURNS. USUALLY. TODAY IT RETURNED."
- **Miss Chomp** (consumption): "I ATE THE MENU. THE SPECIALS WERE DELICIOUS." · "THE FOOD COURT IS MY HOMELAND. I AM ITS QUEEN."
- **Gary** (HR/death): "HR SAYS BEING DECEASED IS NOT APPROVED LEAVE. I HAVE APPEALED." · "MY COWORKERS SENT A FAREWELL CARD. IT SAYS 'SEE YOU MONDAY.'"
- **Dolores** (register): "NEXT." · "TAKE A NUMBER. THE DISPENSER IS EMPTY. TAKE ONE ANYWAY."

(See [jokes.js](../src/data/jokes.js#L208-L387) for each character's full line pool.)

---

## 14. Other action/event messages

- **Hazard chain resolved**: punting/kicking the same hazard type repeatedly. Format "[OBSTACLE TYPE] CHAIN x[COUNT] — HAZARD RESOLVED", gold. E.g. "CONE CHAIN x3 — HAZARD RESOLVED".
- **Banana pickup**: "BANANA. CLASSIC." (gold)
- **Unpeelable active**: "UNPEELABLE." (very light grey `#e8e8f0`)
- **Shield breaks**: "SHIELD BROKE. IT DID ITS JOB." (cyan `#a8e6ff`)
- **Fuse survives a hit**: "THE FUSE SURVIVED. BARELY. IT SAW EVERYTHING." (red `#e04848`, solid/opaque floatie)
- **Ray M'n reassembly**: "RAY M'N SCATTERED. REASSEMBLY IS IN PROGRESS." (teal `#48e0c8`)
- **Resident picked up (escort start)**: "A RESIDENT FOLLOWS YOU. CONFUSED BUT GAME." (green `#b2d3b2`)

---

## 15. Finale & game completion messages

Trigger: campaign completion (surge-3 boss defeated), story panel sequence
([jokes.js](../src/data/jokes.js#L396-L411)):
1. "THE HEROES REACH THE SOCKET."
2. "EGGSHELL BLOCKS IT WITH HIS ENTIRE BODY. HE BEGINS HIS ULTIMATE MONOLOGUE. IT AUTOSCROLLS."
3. "THE HEROES PLUG THE EXTENSION CORD INTO HIS CLOWN-COPTER."
4. "NOTHING HAPPENS. THE WALL SWITCH IS OFF."
5. "GARY CASUALLY FLIPS THE SWITCH. HR WILL CITE HIM FOR UNAUTHORIZED INITIATIVE."
6. "EGGSHELL, WARMED BY WALL-SOCKET ELECTRICITY: 'SO THIS IS THE WARMTH I NEVER GOT.'"
7. "DUST DEVIL 9000 PRINTS AN EMPLOYEE OF THE MONTH CERTIFICATE FROM SOMEWHERE IT SHOULD NOT CONTAIN A PRINTER."
8. "THE POWER STRIP WAS PLUGGED INTO ITSELF THE ENTIRE TIME. NOBODY ADDRESSES THIS."
9. "THE LIGHTS GO OFF. THE POWER STRIP DOES NOT."

**Coda** (fine print disclaimer): "HR HAS APPROVED NOTHING THAT HAPPENS FROM HERE ON."

**Credits** ([jokes.js](../src/data/jokes.js#L421-L433)): title "THANK YOU FOR PLAYING"; body "THE ENTIRE CAST THANKS YOU FOR YOUR PATRONAGE. YOU ARE WELCOME HERE ANY NIGHT."; signoff "HR APPROVED THE GRATITUDE. ONLY THE GRATITUDE."

---

## 16. Difficulty selection descriptions

Trigger: shown on the difficulty-select screen next to each option
([jokes.js](../src/data/jokes.js#L435-L441)):

---

## 17. Copy clarity audit -- recommendations

Reviewed against the live triggers on 2026-08-31. The overall voice is strong:
mission descriptions lead with a playable verb, the tutorial normally states

not flatten death pools, character chatter, briefings, boss introductions, or
result-screen lines just because they are surreal. Their surrounding state
already explains the event, so their job is flavour rather than instruction.

### Change first

1. **Boss-return rare bark** -- Current: "THAT ONE DIDN'T COUNT. - EGGSHELL"
  Trigger: breaking a boss-thrown hazard, immediately after
  [boss.js](../src/game/boss.js) removes a boss health point. Replace with:
  "DAMAGE CONFIRMED. EGGSHELL OBJECTS." The current joke directly contradicts
  the visible health change; the proposal keeps Eggshell's denial while
  confirming that the player discovered a valid attack.

2. **Boss-return short pool** -- In `BOSS_DEFLECT_SHORT`, replace "OOF." with
  "THROWN BACK." and "THAT ALSO COUNTED." with "BOSS HIT." The other entries
  can remain. These barks occur at high speed, so each should explain that
  destroying the thrown hazard hurt the boss.

3. **Mission target counter** -- Current: bare "[CURRENT]/[TOTAL]", e.g.
  "2/6". Trigger: a target, !-crate, or printer is destroyed for a targets
  mission in [run.js](../src/game/run.js). Use a type-aware label instead:
  "TARGETS 2/5", "!-CRATES 2/6", or "PRINTERS 2/5". A floating fraction alone
  is easy to lose once the objective card has faded.

4. **Tutorial !-box instruction** -- Current: "RUN THROUGH THE COINS. THE BOX
  BREAKS OPEN FROM UNDERNEATH — COINS, MOSTLY. SOMETIMES BETTER." Replace
  with: "RUN THROUGH THE COINS. JUMP INTO THE BOX FROM BELOW. COINS, MOSTLY.
  SOMETIMES BETTER." This names the required action rather than asking the
  player to infer it from "from underneath." It fits the live three-line
  speech card in [tutorial.js](../src/game/tutorial.js).

5. **Tutorial shield-break explanation** -- Current: "THE EQUIPMENT PERFORMED
  AS SPECIFIED. YOU DID NOT." Replace with: "SHIELD SPENT. THE EQUIPMENT
  PERFORMED AS SPECIFIED." The first clause teaches that the shield is gone;
  the second retains Gary's voice without blaming a player who used the item
  correctly.

6. **Fuse-hit feedback** -- Current: "THE FUSE SURVIVED. BARELY. IT SAW
  EVERYTHING." Replace with: "FUSE INTACT. YOU TOOK THE HIT. IT SAW
  EVERYTHING." A fuse run is the one moment where it matters to distinguish
  "the item survived" from "I did not take damage." The proposal fits the
  live floatie in [run.js](../src/game/run.js).

7. **Bridge switch feedback** -- Current: "BRIDGE. YOU EARNED IT." Replace
  with: "BRIDGE DEPLOYED. YOU EARNED IT." The player receives the same joke,
  but the action caused by the switch is explicit before the bridge is fully
  visible.

### Strong secondary improvements

1. **Duplicate power-up pickup** -- Current: "OVERCHARGED" Trigger: picking
  up an already-active timed power, which raises it by one temporary level in
  [powerups.js](../src/game/powerups.js). Replace with: "OVERCHARGED: +1 POWER
  LEVEL." This is especially useful because ordinary power pickups deliberately
  do not generate floaties.

2. **Miss Chomp's empty bite** -- Keep the food joke, but state the miss first.
  Replace "AIR: SURPRISINGLY LOW CALORIE." with "NO TARGET. AIR:
  SURPRISINGLY LOW CALORIE." Replace charged "NOTHING ON THE MENU." with
  "NO TARGET. NOTHING ON THE MENU." The cooldown can otherwise feel spent
  without an explanation in a busy lane.

3. **Resident pickup** -- Current: "A RESIDENT FOLLOWS YOU. CONFUSED BUT
  GAME." Replace with: "A RESIDENT FOLLOWS YOU. CONFUSED, BUT WILLING."
  "Game" is a valid idiom, but it is needlessly opaque in the line that first
  establishes escort behaviour.

4. **Bench affordability response** -- Some randomized affordability gags are
  funny but indirect, e.g. "A BOLD PURCHASE. THE COINS DISAGREE." Prefix every
  insufficient-funds notice in [hub/index.js](../src/game/hub/index.js) with
  "NOT ENOUGH COINS." and retain the selected gag after it. The price and
  balance remain visible, but a fixed literal result makes failure immediate.

5. **Pawn-shop failure feedback** -- The pawn shop currently gives only a bad
  sound when the player cannot afford a mod or has no free mod slot. Add a
  compact response plate with "NOT ENOUGH COINS. NO SALE." and "MOD SLOTS
  FULL. UNEQUIP ONE FIRST." This is a missing explanation, not merely a copy
  rewrite.

### Candidate additions for pools

Use these only if the relevant pool is expanded; they preserve the existing
register while keeping the actionable noun or outcome in view.

- `BOSS_DEFLECT_SHORT`: "BOSS HIT.", "THROWN BACK.", "DAMAGE CONFIRMED."
- `BENCH_AFFORDABILITY_GAGS`: "NOT ENOUGH COINS. THE TILL REMAINS CLOSED.",
  "COINS REQUIRED. AMBITION IS NOT LEGAL TENDER.",
  "SHORT ON COINS. THE UPGRADE WILL WAIT."
- Miss Chomp no-target variants: "NO TARGET. NOTHING ON THE MENU.",
  "NO TARGET. AIR IS NOT A MEAL."

### Keep as written

- Death messages can remain oblique because the death banner and the hazard on
  screen already make the result unambiguous; source-specific pools add useful
  cause information where it matters.
- Goal, checkpoint, cord, resident-delivery, chase, beat, rewind, and portal
  teaching messages already name a concrete state change or action.
- Character exits, hub chatter, stage briefings, boss phase dialogue, story
  panels, and rank comments are non-interactive flavour shown in calm or
  already-explained contexts; their strangeness is an asset, not a clarity bug.
