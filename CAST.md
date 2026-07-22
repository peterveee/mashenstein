# MASHENSTEIN: The Full Cast

**Premise:** Don K. Eggshell, PhD unplugs the arcade's master power strip after losing to the heroes for 40 years straight ("IF I CANNOT WIN... NOBODY PLAYS."). Because of "budget cuts," only one hero can render at a time, so all eight relay-run through 9 dying cabinets toward THE SOCKET.

Source of truth for narrative content is [SCRIPT.md](SCRIPT.md); character data lives in [src/data/heroes.js](src/data/heroes.js), [src/data/jokes.js](src/data/jokes.js), [src/game/boss.js](src/game/boss.js), and sprites in [src/sprites/heroes.js](src/sprites/heroes.js), [src/sprites/props.js](src/sprites/props.js), [src/sprites/world.js](src/sprites/world.js).

## The Eight Heroes

*(defined in [src/data/heroes.js](src/data/heroes.js), taglines in [src/data/jokes.js](src/data/jokes.js))*

1. **Lorenzo "Wrenches" Bracciano** — gruff plumber parody. Ability: Stomp/Smash. "STANDARD PLUMBING PROCEDURE."
2. **Gnash the Needlemouse** — smug speedster who's always already finished the level before you arrive. Ability: Spin Dash.
3. **Fernwick, Hero of Thyme** — a prophecy-hero whose "sacred text" is a faded grocery receipt. Ability: Shield Roll.
4. **Unit B-33P "Blastbot"** — malfunctioning robot, perpetually "low on cyan." Ability: Lemon Cannon.
5. **Mochi** — pink puffball who only says "POYO," implying unstated cosmic significance. Ability: float/double-jump + Cosmic Squish.
6. **Miss Chomp** — regal, food-court-obsessed glutton (Pac-Man parody, but with legs). Ability: coin magnet + Hazard Bite.
7. **Ray M'n, Appendage-Optional** — Mega Man riff whose limbs are contractually/insurance-wise "optional." Ability: reassembles after one fatal hit; Rocket Fist.
8. **Grumpos, Dad of Boy** — God of War parody who communicates almost entirely via "BOY." Ability: returning axe.

Hero-to-hero interaction: Grumpos' hub line about throwing Lorenzo ("he called it standard procedure"), plus eight authored relay hand-off exchanges — one per link in the canonical cycle — that play when a portal swap matches a scripted pair (see `PORTAL_BANTER` in [src/data/jokes.js](src/data/jokes.js)).

## The Villain

**Don K. Eggshell, PhD** — "A GRIEVANCE INTENSIFIES." A giant egg-shaped ape with a mustache, tiny goggles, and a spiky shell. Pompous, disputes damage via bureaucratic paperwork ("I HAVE FILED A FORM DISPUTING THAT LAST JUMP"). His 40-year losing streak anchors the stage-1 briefing and two taunts ("I HAVE BEEN LOSING TO PLUMBERS SINCE 1986..."). Boss fights: the Clown-Copter (Act I) and Eggshell & The Absolutely Final Power Strip (Act III final boss). In the ending he's finally warmed by the wall socket's electricity: "SO THIS IS THE WARMTH I NEVER GOT" — the game's one stab at pathos for him.

## NPCs

- **Dolores** — "NEXT." The food court's lunch counter staff, still on shift. Runs DOLORES' REPAIR COUNTER, the food court's own serving line (see `drawCounter` in [src/sprites/arcade.js](src/sprites/arcade.js)), portioning out shield levels off a steam table that used to do nachos. Her rule is that she **never acknowledges the arcade is dead** — not as denial, but as a shift that has not ended: the lunch rush is at noon, everything is portioned, she has not been relieved. That is deliberately a different lane from the room's other two staff — Gary is deceased and knows it, the Dust Devil is haunted and enjoys it, Dolores is simply still on. The menu board on the wall above her (with its NOW SERVING readout stuck on 0) is her board, and she calls NEXT to a queue that has not existed in years. Miss Chomp has a tab.
- **Gary** — "PHYSICAL JURISDICTION RETAINED." A deceased pawn-shop clerk (zombie, detachable head) who runs the hub shop — now from behind his own counter beside Dolores's, the pawn variant of the same food-court unit, rather than the doorway he used to stand next to. Deadpan office-drone jokes about being dead. Structurally important: in the finale, *Gary* is the one who casually flips the switch that resolves the whole crisis — planted by the crypt-1 briefing's compliance note (he is the only entity with real hands) and two hub lines about physical toggle switches.
- **Dust Devil 9000** — "DEEP CLEAN ENGAGED." A haunted vacuum cleaner that's a running background gag (mops the hub floor → ceiling → a CRT across the three acts, with the briefings tracking each posting) before becoming the Act II boss. It's the only antagonist with a conscience — it apologizes for hitting you.
- **Unnamed roles**: "cabinet residents" (generic escortable NPCs), zombies (a palette-swapped reuse of Gary's sprite, functioning as a hazard not a character), and the Turtle from the Wordle-parody minigame TURDLE ("wearing Eggshell's spare shell," speaks only "..." and "HM.").

That's the complete named roster per the game's own script doc — eight heroes, one villain, and three real NPCs (Gary, Dolores, Dust Devil), everything else is unnamed set dressing.
