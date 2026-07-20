# MASHENSTEIN: THE UNPLUGGENING — THE SCRIPT

*Assembled from the game as it currently stands. Every quoted line is verbatim from source.*

**Voice rule, stated in [jokes.js](src/data/jokes.js):** *absolute deadpan sincerity. Jokes never replace usable information.* Everything is uppercase in-game.

**Cast:** eight heroes + Eggshell + Gary + the Dust Devil.
**Runtime shape:** 4 intro panels → 3 acts / 9 cabinets / 27 stages → 3 bosses → 9 finale beats.

---

## DRAMATIS PERSONAE

| Character | Full name | Tagline | The running joke |
|---|---|---|---|
| LORENZO | LORENZO "WRENCHES" BRACCIANO | "STANDARD PLUMBING PROCEDURE." | Produces increasingly inappropriate plumbing tools. |
| GNASH | GNASH THE NEEDLEMOUSE | "ALREADY THERE. WAITING." | Arrives too early and waits for reality to catch up. |
| FERNWICK | FERNWICK, HERO OF THYME | "THE RECEIPT FORETOLD THIS." | His sacred prophecy is printed on a faded supermarket receipt. |
| B-33P | UNIT B-33P "BLASTBOT" | "LOW ON CYAN." | Constantly reports low on cyan. Regardless of context. |
| MOCHI | MOCHI | "PROBABLY NOT A COSMIC ENTITY." | Adorable. The stars bend slightly toward Mochi. |
| MISS CHOMP | MISS CHOMP | "APPETITE WITH EXCELLENT POSTURE." | Occasionally eats HUD elements and returns them with a thank-you note. |
| RAY M'N | RAY M'N, APPENDAGE-OPTIONAL | "LIMBS WERE OUT OF BUDGET." | The insurance form requires a limb count. He keeps writing "OPTIONAL." |
| GRUMPOS | GRUMPOS, DAD OF BOY | "BOY." | Throws his axe majestically. Occasionally fails to catch it. |

**DON K. EGGSHELL, PHD** — antagonist. A giant egg-shaped ape with a magnificent red mustache, tiny science goggles, and a spiky shell. Lost to heroes for 40 straight years. Never appears as a fair fight; appears as a grievance.

**GARY** — deceased pawn-shop clerk. No hero entry; exists only as an NPC, a shop, and an avatar. Resolves the plot by accident.

**DUST DEVIL 9000** — a haunted vacuum. Cleans something impossible in the background of every act. Becomes a boss. Prints a certificate.

---

## COLD OPEN — ATTRACT MODE

*Plays when the title screen idles 60s. Cycle: CAST ROLL, DEMO, DEMO.*

**TITLE CARD.** `MASHENSTEIN` in gold, stitched with six visible seams, flickering, a live power cord dangling off the last letter. Below: `THE UNPLUGGENING`.

A tagline rotates underneath — the arcade talking to itself:

> NOW WITH 40% MORE UNPLUGGING
> THE ARCADE SMELLS LIKE VICTORY AND OLD NACHOS
> NO REFUNDS. THE MACHINE ATE YOUR QUARTER HONESTLY
> RATED E FOR EGGSHELL
> CONTAINS TRACE AMOUNTS OF PLUMBER
> THE TOASTER IS NOT A METAPHOR
> A HEDGEHOG LAWYER REVIEWED THIS TITLE SCREEN
> BATTERIES NOT INCLUDED. BATTERIES ARE THE PLOT
> THE CLOUD IS LAUGHING AT YOU SPECIFICALLY
> ESTABLISHED 198X. RENOVATED NEVER
> FLOOR MOPPED HOURLY BY A HAUNTED VACUUM
> EVERY PIXEL LOVINGLY REPLACED WITH MATH

**MEET THE CAST.** The arcade, dark. One spotlight. Each hero steps into it for 5.2 seconds, does a signature beat — *wave, jump, roll, aim, float, chomp, assemble, flex* — and states their tagline. Then the card lists what they can do, and one gray line of dossier footnote that undercuts it.

*The music is described in source as "Plumber Panic remembered from an empty arcade down the hall."*

---

## ACT ZERO — THE INTRO

*Four panels. Typewriter, 40 chars/sec. Plays once, on a new file, after difficulty select.*

**PANEL 1** — *six colored cabinet fronts, all lit*

> THE ARCADE. 11:58 PM. EVERY CABINET DREAMING ITS LITTLE ELECTRIC DREAM.

**PANEL 2** — *Eggshell*

> DON K. EGGSHELL, PHD, UNPLUGS THE MASTER POWER STRIP. "IF I CANNOT WIN... NOBODY PLAYS." HIS VACUUM IS ALSO CHARGING. PRIORITIES.

**PANEL 3** — *all eight heroes, idling*

> DUE TO BUDGET CUTS, THE ARCADE CAN ONLY RENDER ONE HERO AT A TIME. THE HEROES ACCEPT THIS WITH GRACE. AND ONE FORM COMPLAINT.

**PANEL 4** — *all eight heroes*

> EIGHT HEROES. ONE SOCKET. A RELAY BEGINS. THIS IS THE MOST IMPORTANT CRISIS IN HISTORY. EVERYONE AGREES.

> **The load-bearing joke.** Panel 3 is the entire design justified as a budget constraint. One hero renders at a time — so the game is a *relay*, not a party. Every mechanic descends from this: portals, tag lines, the Relay Blast. The How-To-Play screen restates it flatly: `ONE HERO RENDERS AT A TIME. BUDGET CUTS. RUN ANYWAY.`

**DIFFICULTY SELECT** *(precedes the intro)*

> SELECT DIFFICULTY
> *(THE PAUSE MENU WILL ALWAYS TELL YOU THE TRUTH)*

| | | |
|---|---|---|
| 1 | BREEZY | FOR RELAXING. |
| 2 | SPICY | FOR THE BOLD. |
| 3 | SERIOUS BUSINESS | WE CAN NO LONGER BE RESPONSIBLE. |
| 4 | ULTRA MAXIMUM DELUXE | PLEASE SIGN THE WAIVER. |
| 5 | UNPLUGGED | NO. GENUINELY. NO. |

*A small `:)` sits next to SERIOUS BUSINESS. Choosing UNPLUGGED prompts:*

> ARE YOU SURE?
> *(WE ARE NOT.)*
> ENTER: YES   ESC: WISDOM

*Modes 1–4 are byte-identical, asserted by automated test. The joke is load-bearing.*

---

## THE STANDING SET — THE LAST FUNCTIONING FOOD COURT

*The hub. Side-scrolling walk-around. Returned to between every stage.*

Nine cabinets in a row, most of them dark. Then: `REPAIR BENCH`, `GARY'S LEGALLY DISTINCT PAWN SHOP`, `ARCADE CORNER`, `TROPHY SHELF`.

The ceiling lights come on three at a time, one bank per act. The DUST DEVIL cleans in the background — and what it is cleaning escalates with the act:

- **Act I:** THE FLOOR
- **Act II:** THE CEILING
- **Act III:** THE INSIDE OF A CRT

The seven heroes you are not currently playing loiter here, wandering and hopping. Press DOWN to talk. Lines cycle in order.

**LORENZO**
> THE PIPES HERE ARE DECORATIVE. IT DISGUSTS ME.
> I BROUGHT A TROMBONE. FOR PLUMBING.
> THE PRETZEL STAND SERVES ONLY SOUP NOW. I RESPECT THE PIVOT.

**GNASH**
> I FINISHED TALKING TO YOU YESTERDAY. YOU ARE JUST NOW ARRIVING.
> THE SODA MACHINE DISPENSED ONE PERFECT GRAPE. I DRANK IT.
> RUN FASTER. OR AT ALL. EITHER IS FINE.

**FERNWICK**
> MY PROPHECY MENTIONS A "BUY ONE GET ONE" EVENT. DARK TIMES.
> THE RECEIPT FADES FURTHER EVERY DAY. AS DO WE ALL.
> I HAVE PREPARED FOR THIS. THE RECEIPT SAID TO.

**B-33P**
> STATUS: OPERATIONAL. CYAN: LOW. MORALE: ADEQUATE.
> THE VACUUM CLEANED MY BOOT SECTOR. I FEEL SEEN.
> UPDATE AVAILABLE. IT WILL NOT INSTALL. THIS IS FINE.

**MOCHI**
> POYO.
> POYO. (THE STARS LEAN CLOSER.)
> POYO?

**MISS CHOMP**
> I ATE THE MENU. THE SPECIALS WERE DELICIOUS.
> THE FOOD COURT IS MY HOMELAND. I AM ITS QUEEN.
> I TRIED TO EAT THE SCORE COUNTER AGAIN. IT IS CHEWY, DARLING.

**GARY**
> HR SAYS BEING DECEASED IS NOT APPROVED LEAVE. I HAVE APPEALED.
> MY COWORKERS SENT A FAREWELL CARD. IT SAYS "SEE YOU MONDAY."
> THE PAWN SHOP IS LEGALLY DISTINCT. FROM WHAT? EXACTLY.

**RAY M'N**
> THE LIMB INSPECTOR LEFT WITHOUT COMPLETING THE FORM.
> MY HAND IS SELF-EMPLOYED. WE HAVE A PROFESSIONAL ARRANGEMENT.
> THE SHOES DO MOST OF THE RUNNING. I PROVIDE LEADERSHIP.

**GRUMPOS**
> BOY.
> THE AXE RETURNS. USUALLY. TODAY IT RETURNED.
> I THREW LORENZO EARLIER. HE CALLED IT STANDARD PROCEDURE.

**Set dressing that speaks:**

- Locked cabinet — `NEEDS n PLUGS. YOU HAVE m. THE MATH IS SINCERE.`
- Trophy shelf — `TOASTERS: n/27. S RANKS: m. DEATHS: d. THE SHELF IS PROUD-ADJACENT.`
- Gary's, on entry — `EVERYTHING IS GENTLY HAUNTED. PRICES REFLECT THIS.` / `NO REFUNDS. THE ITEMS REFUSE TO LEAVE ANYWAY.` / `I ALSO WORK HERE. NOBODY QUESTIONS THIS.`
- An unidentified mastery item — `A MASTERY SIDEGRADE. IT KNOWS WHAT IT DID.`
- Arcade corner — `REPLAY BREAKER-BOX GAMES. WIN: +100 COINS.`
- At 25 plugs, a door appears: **THE BACK ROOM (YOU DID NOT SEE THIS DOOR)**

---

## THE RECURRING BIT — POWERING ON A CABINET

*First time you open any cabinet, a breaker-box minigame runs.*

> BREAKER BOX: *(one of)* BLOCK SURGE · REWIRE · CODE INJECT · PADDLE WAR · MASH INVADERS · BRICK BONK · TURDLE

Each is a parody with a legal disclaimer built in:

- **BLOCK SURGE** — falling five-cell pieces, deliberately not the classic seven. Marginal note: `THESE ARE NOT THE / SHAPES YOU KNOW. / LEGALLY.`
- **PADDLE WAR** — one-point Pong against Eggshell. `FIRST POINT WINS. HIS PADDLE IS HIS SHELL.` A blinking sign reads `"I INVENTED PONG." - EGGSHELL`
- **BRICK BONK** — Breakout, except the wall is Eggshell's mustache. `SMASH 40% OF THE MUSTACHE`
- **CODE INJECT** — `WATCH. THE CODE IS WATCHING BACK.`
- **TURDLE** — `4 LETTERS. 4 GUESSES. THE TURTLE WAITS.` The turtle offers `...`, and after three guesses, `HM.`
- **MASH INVADERS** — `CLEAR THE WAVE OF DUST DEVILS.`
- **REWIRE** — `ROUTE THE CURRENT. ROTATE TILES.`

**Outcomes:**
> **Win** — POWER RESTORED · BONUS: *<POWERUP>* ON YOUR NEXT RUN
> **Skip** — SKIPPED. THE BREAKER SHRUGS. · FINE. WE WILL POWER IT THE BORING WAY.
> **Lose** — THE BREAKER REMAINS UNIMPRESSED · A CHILD COULD REWIRE THAT. A CHILD.

---

## THE RECURRING BIT — THE RELAY

*Mid-stage, a portal spawns every ~18 seconds. Run through it and the hero changes. This is the budget cut, dramatized.*

The outgoing hero leaves. The incoming hero announces themselves:

| | |
|---|---|
| LORENZO | STANDARD PROCEDURE. |
| GNASH | FINALLY. |
| FERNWICK | THE RECEIPT FORETOLD THIS. |
| B-33P | LOW ON CYAN. |
| MOCHI | POYO. |
| MISS CHOMP | WAKA, DARLING. |
| RAY M'N | HANDS OFF. LITERALLY. |
| GRUMPOS | BOY. |

Every third switch, the screen clears itself — `RELAY BLAST` — automatically, without being asked.

*Taught once, then never mentioned again:*
> RUN THROUGH THE PORTAL TO CHANGE HERO.
> SWITCH 3 TIMES FOR A RELAY BLAST.
> RELAY BLAST: EVERY 3RD SWITCH. AUTOMATIC.

---

## THE RECURRING BIT — EGGSHELL INTERRUPTS

*A red-bordered speech bubble, first at 30 seconds into a run, then every 55–75 seconds. He is not present. He is commenting.*

> YOU ARE DOING VERY ADEQUATELY. I HAVE MADE A NOTE.
> MY IQ IS 300 AND YOURS IS A HIGH SCORE.
> I HAVE FILED A FORM DISPUTING THAT LAST JUMP.
> THIS COPTER IS FINE. THE BEEPING IS DECORATIVE.
> A CHILD COULD DO THIS. A CHILD DID. I FIRED HIM.
> THE FOURTH HEALTH BAR IS REAL. PROBABLY.

---

# ACT I — THE ARCADE GOES DARK

*Three cabinets. 60-second stages. The lights are mostly off.*

## CABINET 1 — PLUMBER PANIC
*Platformer parody. Pixel. Unlocks at 0 plugs.*

> **OPENING TITLE:** THE FIRST CABINET FLICKERS. LORENZO SAYS THE PIPES "KNOW HIM."

| Stage | Mission | Challenge |
|---|---|---|
| 1 | REACH THE BREAKER. FLIP IT. SAVE EVERYTHING. | COLLECT 20 COINS |
| 2 | BREAK 6 ?-CRATES. THE ? IS RHETORICAL. | TAKE NO DAMAGE |
| 3 | CARRY THE FRAGILE FUSE. IT IS VERY FRAGILE. IT KNOWS. | COLLECT 25 COINS |

*If the fuse survives:* `THE FUSE SURVIVED. BARELY. IT SAW EVERYTHING.`

## CABINET 2 — SPEED ZONE
*Racing parody. Faux-3D. Unlocks at 2 plugs.*

> **OPENING TITLE:** GNASH HAS ALREADY FINISHED THIS LEVEL. HE IS WAITING AT THE END. SMUG.

| Stage | Mission | Challenge |
|---|---|---|
| 1 | REACH THE EXIT BEFORE THE ROAD FILES FOR COLLAPSE. | HIT 4 BOOST PADS |
| 2 | CATCH THE CLOWN-COPTER 2 TIMES. IT IS UNDERINSURED. | COLLECT 25 COINS |
| 3 | FINISH THE LAP. GNASH HAS OPINIONS ABOUT YOUR PACE. | HIT 5 BOOST PADS |

*Catching the copter:* `CAUGHT n/N. IT FILED A COMPLAINT.`

## CABINET 3 — NEON BLASTERS
*Shmup parody. Neon vector. Unlocks at 5 plugs.*

> **OPENING TITLE:** B-33P FEELS AT HOME HERE. HE IS STILL LOW ON CYAN.

| Stage | Mission | Challenge |
|---|---|---|
| 1 | DESTROY 5 TARGETS. THEY ARE VERY DESTROYABLE. | COLLECT 20 COINS |
| 2 | RECOVER 4 EXTENSION CORD PIECES. THE CORD WAS SHREDDED. RUDELY. | TAKE NO DAMAGE |
| 3 | REACH THE END. SOMETHING ANGRY AND AIRBORNE AWAITS. | COLLECT 25 COINS |

### ⚡ BOSS — THE UNDERINSURED CLOWN-COPTER
*6 HP.*

> **EGGSHELL:** IT HAS FIVE HEALTH BARS. FOUR ARE LABELED "PRESENTATION ERROR".

*(Four of them are, in fact, labeled `PRESENTATION ERROR`. On UNPLUGGED difficulty they are relabeled `REAL NOW`.)*

*At half health, everything freezes. The screen reads `LOW BATTERY` and, below it, `(THE BOSS FIGHT WILL RESUME SHORTLY)`:*

> LOW BATTERY. THE COPTER PAUSES. EGGSHELL DISPUTES ALL DAMAGE SO FAR.

*Landing a hit reads `DIRECT HIT` — or, 35% of the time:* `FORM 27-B: DAMAGE DISPUTE. DENIED.`
*Redirecting a thrown object reads `REDIRECTED` — or, 30% of the time:* `THAT ONE DIDN'T COUNT. - EGGSHELL`

---

# ACT II — THE EXTENSION CRISIS

*Three cabinets. 90-second stages. Second bank of ceiling lights comes on.*

## CABINET 4 — FROST FORTRESS
*Ice adventure parody. Watercolor. Unlocks at 12 plugs.*

> **OPENING TITLE:** ACT II. THE EXTENSION CRISIS. EVERYONE IS COLD AND BRAVE.

| Stage | Mission | Challenge |
|---|---|---|
| 1 | CROSS THE ICE. THE ICE IS NOT YOUR FRIEND. IT TOLD US. | COLLECT 30 COINS |
| 2 | RECOVER 4 CORD PIECES FROZEN IN THE FORTRESS. | TAKE NO DAMAGE |
| 3 | CARRY THE FUSE ACROSS THE ICE. YES. THE SLIPPERY ICE. | TAKE NO DAMAGE |

*Hitting a frozen switch:* `BRIDGE. YOU EARNED IT.`

## CABINET 5 — CRYPT SHIFT
*Horror parody. VHS. Unlocks at 16 plugs.*

> **OPENING TITLE:** GARY'S FORMER COWORKERS WAVE. HE OWES SEVERAL OF THEM SHIFTS.

| Stage | Mission | Challenge |
|---|---|---|
| 1 | SURVIVE THE BLACKOUT. THE DARK IS BUDGETARY. | COLLECT 25 COINS |
| 2 | ESCORT 3 CONFUSED CABINET RESIDENTS TO SAFETY. | COLLECT 25 COINS |
| 3 | SURVIVE A LONGER BLACKOUT. THE BUDGET GOT WORSE. | COLLECT 30 COINS |

*Picking up a resident:* `A RESIDENT FOLLOWS YOU. CONFUSED BUT GAME.`
*Delivering one:* `RESIDENTS DELIVERED: n/N`

## CABINET 6 — RHYTHM BANKRUPTCY
*Rhythm parody. LCD handheld. Unlocks at 20 plugs.*

> **OPENING TITLE:** THIS CABINET OWES MONEY TO EVERY OTHER CABINET.

| Stage | Mission | Challenge |
|---|---|---|
| 1 | RUN TO THE BEAT. OR NEAR THE BEAT. THE BEAT IS FLEXIBLE. | 10 ON-BEAT ACTIONS |
| 2 | SURVIVE THE CHORUS. THE BAND IS IN DEBT. | 14 ON-BEAT ACTIONS |
| 3 | CHASE THE COPTER. IT IS SOMEHOW ON BEAT. | TAKE NO DAMAGE |

### ⚡ BOSS — DUST DEVIL 9000 — DEEP CLEAN MODE
*8 HP. It pulls you toward it.*

> **EGGSHELL:** IT IS SET TO DEEP CLEAN. IT IS SO SORRY ABOUT THIS.

*At half health:*

> IT STOPS TO EMPTY ITS BAG. IT IS VISIBLY ASHAMED. IT APOLOGIZES VIA LED.

> **Note:** this is the same vacuum that has been quietly mopping the food court since Act I, and the same one that was charging in intro panel 2 — "HIS VACUUM IS ALSO CHARGING. PRIORITIES." It is the only antagonist in the game with a conscience.

---

# ACT III — THE OUTLET AT THE END OF EVERYTHING

*Three cabinets. 120-second stages. All lights on.*

## CABINET 7 — CARDBOARD KINGDOM
*Fake-o-rama. Cardboard. Unlocks at 28 plugs.*

> **OPENING TITLE:** ACT III. THE OUTLET AT THE END OF EVERYTHING. THE CASTLE IS FOUR INCHES TALL.

| Stage | Mission | Challenge |
|---|---|---|
| 1 | CROSS THE KINGDOM BEFORE IT FINISHES COLLAPSING. | COLLECT 35 COINS |
| 2 | ESCAPE THE FOLDING WAVE. DO NOT BECOME A FLAP. | COLLECT 35 COINS |
| 3 | CATCH THE COPTER. IT IS HELD UP BY A VISIBLE HAND. | COLLECT 35 COINS |

## CABINET 8 — CORPORATE KOMBAT
*Office action parody. Notebook doodle. Unlocks at 34 plugs.*

> **OPENING TITLE:** THE PRINTERS SMELL FEAR. AND TONER. MOSTLY TONER.

| Stage | Mission | Challenge |
|---|---|---|
| 1 | GET THROUGH THE OFFICE. AVOID EYE CONTACT WITH MEETINGS. | COLLECT 35 COINS |
| 2 | DESTROY 5 HOSTILE PRINTERS. HR HAS APPROVED THIS. | TAKE NO DAMAGE |
| 3 | ESCORT 4 CABINET RESIDENTS OUT OF A MANDATORY MEETING. | COLLECT 35 COINS |

## CABINET 9 — THE SURGE
*Everything at once. All eight styles bleeding together. Unlocks at 40 plugs.*

> **OPENING TITLE:** THE CABINETS ARE BLEEDING TOGETHER. NOBODY IS ADDRESSING THIS.

| Stage | Mission | Challenge |
|---|---|---|
| 1 | EVERYTHING AT ONCE. KEEP RUNNING. | COLLECT 40 COINS |
| 2 | RECOVER THE FINAL 6 CORD PIECES. THE CORD IS ALMOST WHOLE. | TAKE NO DAMAGE |
| 3 | OUTRUN THE UNPLUGGENING ITSELF. THE SOCKET IS CLOSE. | TAKE NO DAMAGE |

### ⚡ FINAL BOSS — EGGSHELL & THE ABSOLUTELY FINAL POWER STRIP
*12 HP. Two scripted collapses.*

> **EGGSHELL:** THE STRIP HAS ONE MORE SWITCH THAN PHYSICALLY POSSIBLE. DO NOT COUNT THEM.

*At 60% health:*
> THE CRAYON IQ CERTIFICATE DEPLOYS AS A SHIELD. IT ABSORBS NOTHING.

*At 25% health:*
> HIS SHELL IS STUCK IN THE COPTER DOOR. HE INSISTS THIS IS PHASE FIVE.

---

# THE FINALE

*Nine beats. Typewriter, 34 chars/sec. Triggered by clearing THE SURGE, or by walking into THE SOCKET in the hub.*

**1.** *(Eggshell)*
> THE HEROES REACH THE SOCKET.

**2.** *(Eggshell)*
> EGGSHELL BLOCKS IT WITH HIS ENTIRE BODY. HE BEGINS HIS ULTIMATE MONOLOGUE. IT AUTOSCROLLS.

**3.** *(Eggshell)*
> THE HEROES PLUG THE EXTENSION CORD INTO HIS CLOWN-COPTER.

**4.** *(Eggshell)*
> NOTHING HAPPENS. THE WALL SWITCH IS OFF.

**5.** *(Eggshell)*
> GARY CASUALLY FLIPS THE SWITCH. HR WILL CITE HIM FOR UNAUTHORIZED INITIATIVE.

**6.** *(Dust Devil)*
> EGGSHELL, WARMED BY WALL-SOCKET ELECTRICITY: "SO THIS IS THE WARMTH I NEVER GOT."

**7.**
> DUST DEVIL 9000 PRINTS AN EMPLOYEE OF THE MONTH CERTIFICATE FROM SOMEWHERE IT SHOULD NOT CONTAIN A PRINTER.

**8.** *(overlaid: `OVERTIME UNLOCKED`)*
> THE POWER STRIP WAS PLUGGED INTO ITSELF THE ENTIRE TIME. NOBODY ADDRESSES THIS.

**9.**
> CANON DEPARTMENT HAS GONE HOME.

> **The shape of the ending.** The heroes do not win the fight — they complete a *task*, and the task turns out to have been mis-specified. The villain is defeated by warmth, the plot is resolved by an unauthorized employee, the central object was self-referential the whole time, and the game signs off by admitting nobody was minding continuity. Every beat is an institutional failure played as a happy ending.

**After the finale:** THE SOCKET in the hub is replaced by the **OVERTIME CABINET**. `OVERTIME (ENDLESS)` appears on the title menu. Its mission text is:

> RUN. FOREVER. THAT IS THE WHOLE DEAL.

Cleared cabinets also unlock **corrupted modifiers** — the game degrading on purpose:

| | |
|---|---|
| NO JUMPING | THE JUMP BUTTON IS ON STRIKE. IT PROVIDES A CONTRACTUAL MINIMUM HOP. |
| MAXIMUM SPEED | EVERYTHING IS FASTER. NOTHING IS CALMER. |
| RANDOM SWAPS | PORTALS ARRIVE TWICE AS OFTEN. NOBODY ASKED. |
| INACCURATE NARRATION | EGGSHELL DESCRIBES A DIFFERENT GAME. |

Under INACCURATE NARRATION, Eggshell commentates a game he is not watching:

> HE JUMPS. HE DOES NOT. I AM NOT WATCHING.
> THE HERO TRIPS. MAGNIFICENTLY. I ASSUME.
> NOTHING IS HAPPENING. NOTHING HAS EVER HAPPENED.
> A BARREL APPROACHES. OR A DUCK. MY NOTES ARE BAD.
> THIS IS THE PART WHERE THEY LOSE. ANY MOMENT NOW.

---

## THE CHORUS — DEATH AND JUDGEMENT

*Because you will see these more than anything else in the game, they carry more tone than the cutscenes do.*

**Cause of death**, stated plainly: `THE UNPLUGGENING CAUGHT UP` · `SHOT BY A DRONE WITH A GRUDGE` · `GRAVITY REMAINS UNDEFEATED` · `MISSION INCOMPLETE`

**Then the results screen editorializes:**
> DEFEATED BY GEOMETRY
> TOO HEROIC FOR CURRENT RAM
> GRAVITY REMAINS UNDEFEATED
> A BARREL HAS WON THE ARGUMENT
> UNPLUGGED FOR SCHEDULED MAINTENANCE
> THE FLOOR FILED A COMPLAINT
> RUNNING WAS THE EASY PART
> THE ARCADE REGRETS THIS OUTCOME

**And grades you:**

| C | C. A RANK. TECHNICALLY. |
|---|---|
| **B** | B. THE ARCADE NODS SLOWLY. |
| **A** | A. GENUINELY GOOD. DO NOT LET IT CHANGE YOU. |
| **S** | S. THE ARCADE IS PROUD. THE ARCADE IS A BUILDING. |
| **CONCERNING** | CONCERNING. WE HAVE QUESTIONS. WE WILL NOT ASK THEM. |

*Two characters can save you from a death, and each says so:*
> **Any shield:** SHIELD BROKE. IT DID ITS JOB.
> **Ray M'N:** RAY M'N SCATTERED. REASSEMBLY IS IN PROGRESS.
> **Unpeelable:** UNPEELABLE.

*The heroes talk while they play — the closest thing to in-run characterization:*

| LORENZO | WRENCH SMASH / CLANG *(on a whiff)* |
|---|---|
| **B-33P** | PEW |
| **MOCHI** | PROBABLY NORMAL PHYSICS |
| **MISS CHOMP** | MISS CHOMP ATE IT. POLITELY. / AIR: SURPRISINGLY LOW CALORIE. |
| **GRUMPOS** | BOY. / THE AXE LODGED IN THE SCENERY. INTENDED. |

*And the toaster — the third plug in every stage, all 27 of them:*
> THE HIGHLY NECESSARY GOLDEN APPLIANCE. IT IS A TOASTER.

---

## APPENDIX A — WRITTEN BUT NEVER SPOKEN

Each cabinet in [cabinets.js](src/data/cabinets.js) carries a `taunt` field — a bespoke Eggshell line per zone. **Nothing in `src/` reads it.** During runs, Eggshell pulls from the generic `EGGSHELL_TAUNTS` pool instead, so these nine never appear:

| Cabinet | Unused taunt |
|---|---|
| PLUMBER PANIC | MY IQ IS 300 AND YOURS IS A HIGH SCORE. *(duplicated into the generic pool)* |
| SPEED ZONE | I INVENTED SPEED. IN 1987. NO ONE THANKED ME. |
| NEON BLASTERS | THOSE LASERS COST ME A FORTUNE. DODGE THEM RESPECTFULLY. |
| FROST FORTRESS | I UNPLUGGED THE HEATING TOO. FOR DRAMA. |
| CRYPT SHIFT | THE DARKNESS IS A COST-SAVING MEASURE. THE SPOOKINESS IS FREE. |
| RHYTHM BANKRUPTCY | I OWN THE RIGHTS TO RHYTHM. YOU OWE ME ROYALTIES PER JUMP. |
| CARDBOARD KINGDOM | THAT CASTLE IS FOUR INCHES TALL. LIKE MY PATIENCE. |
| CORPORATE KOMBAT | THIS MEETING COULD HAVE BEEN AN EMAIL. THE EMAIL IS ALSO A TRAP. |
| THE SURGE | BEHOLD. EVERY GAME AT ONCE. MY MASTERPIECE. MY MASHTERPIECE. |

This is the single biggest piece of finished writing not currently reaching players — and it is per-zone, which is exactly what the mid-run taunts lack.

---

## APPENDIX B — WHERE THE STORY IS THIN

An honest read of the narrative as it stands:

1. **Acts II and III have no act-break beats.** Act I gets four intro panels; the finale gets nine. Acts II and III are announced only by a single line buried in a stage intro (`ACT II. THE EXTENSION CRISIS.` / `ACT III. THE OUTLET AT THE END OF EVERYTHING.`). The middle of the game has no narrative punctuation at all.

2. **Gary is the protagonist of the ending and a stranger everywhere else.** He resolves the plot in beat 5. Before that he is a shop, three hub lines, and an unlockable avatar. He is never established as someone who *could* flip the switch — which is either the joke, or a setup that never got planted.

3. **The Dust Devil has the best arc and no one points at it.** Charging in panel 2 → mopping the floor → mopping the ceiling → mopping the inside of a CRT → becoming a boss that apologizes → printing itself a certificate. That's a complete character journey told entirely in background props, and nothing in the script acknowledges it.

4. **Six generic taunts cover a 27-stage campaign** while nine bespoke per-zone ones sit unused. See Appendix A.

5. **The heroes never talk to each other.** They have hub lines (monologues at the player), tag lines (announcements), and float text (barks). Only one line in the entire game is hero-to-hero: Grumpos' `I THREW LORENZO EARLIER. HE CALLED IT STANDARD PROCEDURE.` — and it's the funniest character beat in the file. There is no relay banter, despite the relay being the game's central conceit.

6. **The 40-year grudge is stated once and never dramatized.** Eggshell's motive — losing to heroes for 40 straight years — appears in the README but never in the game. He is petty in the moment, but never sympathetic, until beat 6 asks you to feel for him with no groundwork laid.
