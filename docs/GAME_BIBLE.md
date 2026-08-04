# MASHENSTEIN: THE UNPLUGGENING — Game Bible

*The canonical reference for story, characters, gameplay, visual style, audio, and tone. This document describes the game as-implemented; proposed changes belong in separate spec files.*

---

## 1. PREMISE

Don K. Eggshell, PhD — a giant egg-shaped ape with a magnificent red mustache, tiny science goggles, and a spiky shell — has unplugged the arcade's master power strip after losing to the heroes for 40 straight fiscal years. Due to budget cuts, the arcade can only render ONE hero at a time, so eight parody heroes must relay-run through nine dying arcade cabinets to reach THE SOCKET and restore power.

**Tagline:** *"A game stitched together from parts of other games."*

**The load-bearing joke:** The entire design is justified as a budget constraint. One hero renders at a time — so the game is a *relay*, not a party. Every mechanic descends from this: portals, switch lines, the automatic Relay Blast. The How-To-Play screen restates it: `ONE HERO RENDERS AT A TIME. BUDGET CUTS. RUN ANYWAY.`

---

## 2. CAST OF CHARACTERS

### 2.1 The Eight Heroes

All eight are available in every normal stage. Portals switch between them automatically; a hero never immediately repeats.

| # | Hero | Full Name | Tagline | Skill | Ability |
|---|---|---|---|---|---|
| 1 | **LORENZO** | Lorenzo "Wrenches" Bracciano | "STANDARD PLUMBING PROCEDURE." | High Jump (15% higher) | STOMP / SMASH — air stomp or grounded wrench smash |
| 2 | **GNASH** | Gnash the Needlemouse | "ALREADY THERE. WAITING." | Speed Boost (15% faster) | SPIN DASH — invincible burst that smashes breakables |
| 3 | **FERNWICK** | Fernwick, Hero of Thyme | "THE RECEIPT FORETOLD THIS." | Starting Shield | SHIELD ROLL — short, finite roll that breaks ground hazards |
| 4 | **B-33P** | Unit B-33P "Blastbot" | "LOW ON CYAN." | Battery Efficient (25% faster recharge) | LEMON CANNON — fires a shot that destroys ground obstacles |
| 5 | **MOCHI** | Mochi | "PROBABLY NOT A COSMIC ENTITY." | Cosmic Float (double jump + float) | COSMIC SQUISH — shrinks temporarily and falls slowly |
| 6 | **MISS CHOMP** | Miss Chomp | "APPETITE WITH EXCELLENT POSTURE." | Coin Magnet (attracts coins, +25%) | HAZARD BITE — eats a nearby breakable hazard |
| 7 | **RAY M'N** | Ray M'n, Appendage-Optional | "LIMBS WERE OUT OF BUDGET." | Loose Assembly (survives one fatal hit) | ROCKET FIST — throws a fist that returns |
| 8 | **GRUMPOS** | Grumpos, Dad of Boy | "BOY." | Legendary Presence (+20% score) | RETURNING AXE — throws an axe; ground + air hazards |

**Tag-in lines** (spoken when entering via portal):
- LORENZO: "STANDARD PROCEDURE."
- GNASH: "FINALLY."
- FERNWICK: "THE RECEIPT FORETOLD THIS."
- B-33P: "LOW ON CYAN."
- MOCHI: "POYO."
- MISS CHOMP: "WAKA, DARLING."
- RAY M'N: "HANDS OFF. LITERALLY."
- GRUMPOS: "BOY."

**Running jokes** (one comedic bit per hero, hammered repeatedly):
- Lorenzo produces increasingly inappropriate plumbing tools.
- Gnash arrives too early and waits for reality to catch up.
- Fernwick's sacred prophecy is printed on a faded supermarket receipt.
- B-33P constantly reports low on cyan, regardless of context.
- Mochi is adorable; the stars bend slightly toward her.
- Miss Chomp occasionally eats HUD elements and returns them with a thank-you note.
- Ray M'n's insurance form requires a limb count. He keeps writing "OPTIONAL."
- Grumpos throws his axe majestically. Occasionally fails to catch it.

**Authored portal hand-offs** (scripted exchanges between specific pairs):
| Outgoing → Incoming | Lines |
|---|---|
| LORENZO → GNASH | "APPLYING INDUSTRIAL THREAD SEALANT." → "TOO SLOW. I ALREADY PASSED THE VALVE." |
| GNASH → FERNWICK | "ALREADY AT THE NEXT CORNER. SPEED UP." → "THE RECEIPT EXPRESSLY FORBIDS RUNNING." |
| FERNWICK → B-33P | "THE PROPHECY FORETOLD A METALLIC CHASSIS." → "CHASSIS OPERATIONAL. CYAN LEVEL: CRITICAL." |
| B-33P → MOCHI | "PORTAL ENGAGED. SCANNING EXTRA-DIMENSIONAL SPECIMEN." → "POYO. (THE PIXELS WARP SLIGHTLY.)" |
| MOCHI → MISS CHOMP | "POYO?" → "YOU LOOK DELICIOUS, DARLING, BUT I HAVE POSTURE TO MAINTAIN." |
| MISS CHOMP → RAY M'N | "I ATE THE SCORE COUNTER. IT WAS CHEWY." → "DID IT CONTAIN MY MISSING ARM VALUE?" |
| RAY M'N → GRUMPOS | "HANDS OFF. LITERALLY. THEY ARE UNSECURED." → "BOY. FETCH THE SPARE APPENDAGES." |
| GRUMPOS → LORENZO | "PREPARE FOR BALLISTIC DISPATCH, PLUMBER." → "STANDARD PROCEDURE. AIM FOR THE DUCTWORK." |

### 2.2 The Villain

**DON K. EGGSHELL, PHD** — *"A GRIEVANCE INTENSIFIES."*

A giant egg-shaped ape with a mustache, tiny science goggles, and a spiky shell. Pompous, disputes damage via bureaucratic paperwork. Lost to heroes for 40 straight fiscal years. Never appears as a fair fight; appears as a grievance.

- Taunt pool rotates every 55–75 seconds during runs, plus each cabinet has one bespoke taunt.
- Appears as the Act I boss (Clown-Copter) and Act III final boss (Eggshell & The Absolutely Final Power Strip).
- In the ending: "SO THIS IS THE WARMTH I NEVER GOT" — the game's one stab at pathos for him.

### 2.3 NPCs

**GARY (DECEASED)** — *"PHYSICAL JURISDICTION RETAINED."*
Deceased pawn-shop clerk. Runs GARY'S LEGALLY DISTINCT PAWN SHOP from behind his counter in the food court. The only entity with real hands; resolves the plot by casually flipping a physical toggle switch in the finale. Deadpan office-drone jokes about being dead.

**DOLORES (ON BREAK)** — *"NEXT."*
Food court counter staff, still on shift. Runs DOLORES' REPAIR COUNTER — her steam table, where power-up repairs are priced and portioned like lunch. Never acknowledges the arcade is dead; her shift has not ended. Calls NEXT to an empty concourse. The menu board reads NOW SERVING 0.

**DUST DEVIL 9000** — *"DEEP CLEAN ENGAGED."*
A haunted vacuum cleaner. Running background gag across acts:
- Act I: cleans the floor
- Act II: cleans the ceiling
- Act III: cleans the inside of a CRT
Becomes the Act II boss. The only antagonist with a conscience — apologizes for hitting you.

---

## 3. STORY STRUCTURE

**Runtime shape:** 4 intro panels → 3 acts / 9 cabinets / 27 stages → 3 bosses → 9 finale beats.

### 3.1 Cold Open (Intro Panels)

Four typewriter panels at 40 chars/sec, played once on a new file after difficulty select:

1. "THE ARCADE. 11:58 PM. EVERY CABINET DREAMING ITS LITTLE ELECTRIC DREAM."
2. Eggshell unplugs the master power strip. "IF I CANNOT WIN... NOBODY PLAYS."
3. "DUE TO BUDGET CUTS, THE ARCADE CAN ONLY RENDER ONE HERO AT A TIME."
4. "EIGHT HEROES. ONE SOCKET. A RELAY BEGINS."

### 3.2 The Hub — The Last Functioning Food Court

Side-scrolling walk-around returned to between every stage. Contains:
- Nine arcade cabinets in a row (most dark, unlocked with plugs)
- DOLORES' REPAIR COUNTER (steam table, power-up upgrades)
- GARY'S LEGALLY DISTINCT PAWN SHOP (mod purchases)
- ARCADE CORNER (replay breaker-box minigames)
- TROPHY SHELF (toaster and death count display)
- THE BACK ROOM (appears at 25 plugs — "YOU DID NOT SEE THIS DOOR")

Unplayed heroes loiter in the concourse, wandering and hopping. Press DOWN to talk; lines cycle in order.

### 3.3 Acts & Stages

| Act | Cabinet | Style | Genre | Stages | Boss |
|---|---|---|---|---|---|
| I | PLUMBER PANIC | pixel | Platformer | 3 | Clown-Copter (end of Act I) |
| I | SPEED ZONE | faux-3D | Racing | 3 | — |
| I | NEON BLASTERS | neon vector | SHMUP | 3 | — |
| II | FROST FORTRESS | watercolor | Ice Adventure | 3 | Dust Devil 9000 (end of Act II) |
| II | CRYPT SHIFT | VHS | Horror | 3 | — |
| II | RHYTHM BANKRUPTCY | LCD handheld | Rhythm | 3 | — |
| III | CARDBOARD KINGDOM | cardboard | Fake-o-rama | 3 | Eggshell & The Power Strip (end of Act III) |
| III | CORPORATE KOMBAT | doodle | Office Action | 3 | — |
| III | THE SURGE | mashup | Everything | 3 | — |

Each stage opens on a briefing screen (typewriter, 70 chars/sec) stating the mission objective, a memo block for comedy, and a cabinet-specific validation prompt. One input completes the text; a second proceeds.

**Stage duration:** Act I ~60s, Act II ~90s, Act III ~120s.

### 3.4 The Finale

After THE SURGE: nine finale beats. Gary flips the physical switch. Eggshell is warmed by the wall socket.

### 3.5 Overtime (Post-Game)

Endless one-hit mode with daily seeds. Cleared cabinets gain corrupted stage modifiers.

---

## 4. GAMEPLAY MECHANICS

### 4.1 Core Loop

An automatic runner. The hero runs right continuously at a speed that ramps across the stage (1.0× → 1.6×, up to 2.4× in overtime). The player controls jump, duck, and their hero's ability while dodging or breaking obstacles.

### 4.2 The Relay System

- All eight heroes are available in every normal stage via a shuffled bag.
- Portals spawn ~every 18 seconds. Running through one switches heroes.
- A hero never immediately repeats. Every hero must appear once before the bag reshuffles.
- Every third switch automatically triggers **RELAY BLAST** — a screen-clearing burst that destroys breakable on-screen hazards and resets the counter.
- There is no manual tag button. The relay is fully automatic.

**One-time tutor prompts:**
1. "RUN THROUGH THE PORTAL TO CHANGE HERO."
2. "SWITCH 3 TIMES FOR A RELAY BLAST."
3. "RELAY BLAST: EVERY 3RD SWITCH. AUTOMATIC."

### 4.3 Health & Battery

- 4 battery cells (max). Each hazard hit costs 1 cell.
- Checkpoints restore health to full (or full + 1 with the OSHA Compliance Binder mod).
- Death at 0 cells ends the run. UNPLUGGED difficulty: one hit = dead.

### 4.4 Abilities

Each hero has a unique ability on a cooldown (1.8–3.5 seconds). An in-world circular cooldown orb follows the hero at head height, filling from bottom to top. The charge colour progresses from slate → blue → cyan → green → violet → bright magenta at full charge.

**Close-range heroes** (melee / screen-range actions):

- **Stomp / Smash** (Lorenzo, 2.5s, held jump = 15% higher): In the air, stomps downward to break ground obstacles beneath him. On the ground, swings a wrench forward to smash a single nearby obstacle. A banked Relay Blast charge clears the whole screen.

- **Spin Dash** (Gnash, 3.5s, passive +15% speed): Invincible horizontal burst forward; smashes every breakable in his path. A charged Relay Blast version runs much longer.

- **Shield Roll** (Fernwick, 3s, starts stages with one shield): Short rolling dash that breaks ground hazards in contact and deflects one enemy shot. A charged Relay Blast version plows through without ringing his ears.

- **Cosmic Squish** (Mochi, 3.5s, double jump + float): Shrinks temporarily and falls slowly — escape, not attack. A charged Relay Blast version extends the shrink duration considerably.

- **Hazard Bite** (Miss Chomp, 3.5s, coin magnet +25% earnings): Eats the nearest breakable hazard with a full gape-hold-snap bite cycle. A charged Relay Blast version clears every breakable on screen (politely).

**Thrown-projectile heroes** (weapons leave the body and return):

- **Lemon Cannon** (B-33P, 1.35s effective, 0.75× cooldown multiplier): Fires a forward pellet that destroys ground obstacles. A charged Relay Blast spreads three piercing pellets.

- **Rocket Fist** (Ray M'n, 3s, survives one fatal hit): Throws his detachable fist. The fist streaks forward, hits one obstacle or unbreakable, then hovers above the action — dim, spinning, out of the combat lane — and flies back to him when the cooldown resets. A charged Relay Blast fist pierces everything and returns faster.

- **Returning Axe** (Grumpos, 2.8s, +20% score): Throws his axe forward through ground and air hazards alike. After its hits are spent, the axe hovers above the action — dim, spinning — then flies back when the cooldown resets. A charged Relay Blast axe works the whole screen before returning.

**Cooldown tuning:** B-33P's cooldown has a built-in 0.75× multiplier. The Repair Counter's Tune-Up upgrade reduces all cooldowns by 10–20%.

**Relay Blast:** Every third portal switch charges a golden banked shot that ignores cooldown entirely. The ability label and orb both pulse gold until it is spent.

### 4.5 Power-ups

Collected during runs; timers drain in real-time. Stackable levels (1–4):
- **Shield** — absorbs one hit per charge (cap: 2, upgraded to 3 at Repair Counter)
- **Magnet** — pulls coins toward the player (8s, upgraded to 12s/16s)
- **Star** — score multiplier (2×, 2.5×, 3×, 3.5×)
- **Speed** — run faster (1.25×, upgraded to 1.4×)
- **Low Grav** — reduced gravity (0.65×, upgraded to 0.5×)
- **Unpeelable** — temporary invincibility

### 4.6 Missions & Challenges

**Mission types:** reach, targets, fragile fuse, chase, relay combo, cord recovery, blackout, rescue, escape.

Each stage has one mission (required to clear) and one challenge (optional bonus). Completing both awards plugs.

**Plugs** (3 per stage: mission, challenge, toaster) unlock cabinets, acts, and the finale. The toaster is the GOLDEN APPLIANCE — hidden in every stage at a fixed fraction of the distance.

### 4.7 Breaker-Box Minigames

Played when first opening each cabinet. All replayable at the Arcade Corner (50 coins per play; win nets +200). Touch devices bypass minigames entirely.

- **BLOCK SURGE** — falling five-cell pieces (legally distinct from the seven you know)
- **REWIRE** — rotate tiles to route current
- **CODE INJECT** — "THE CODE IS WATCHING BACK"
- **PADDLE WAR** — one-point Pong against Eggshell's shell
- **MASH INVADERS** — clear Dust Devils
- **BRICK BONK** — Breakout against Eggshell's mustache
- **TURDLE** — 4 letters, 4 guesses; the turtle is not impressed

### 4.8 Scoring

- Base points for obstacles broken, coins collected, and stage clear (250).
- Boss clear: 500. Challenge bonus: 100. Appliance bonus: 150.
- Miss Chomp has a passive +25% coin pickup bonus.
- Grumpos has a passive +20% to all score.

### 4.9 Obstacles & Objects

**Breakable hazards** (ground floor): crates, barrels, cacti, snowmen, cardboard scenery, office furniture. Heroes can jump over them, duck under rolling barrels, or break them with an ability. Breaking a hazard produces material-appropriate debris particles (wood, stone, metal, soft, gold), a brief screen shake, and a burst of coins that arcs forward into the hero's path.

**! Crates** (`qcrate`): gold-rimmed objective boxes. When broken they pop with a gold flash, white shards, and a harder kick — visually distinct from a standard crate. They always drop coins or a power-up capsule. On target missions each one counts toward the objective; the HUD floatie reports `TARGETS N/M` immediately without interrupting the run.

**Coins:** small gold pickups worth 1 coin apiece and 50 score × current multiplier. Breaking any obstacle sprays coins forward so they land in the hero's path roughly 30–140 px ahead and get run through about half a second later — the run never stops for a pickup. Coins are pulled toward Miss Chomp at up to 40 px. A coin combo counter (up to 12×) resets after one second without a pickup; higher combos produce a brighter chime.

**Power-up capsules:** occasionally drop from broken obstacles or drip-spawners. They arc higher than coins so the player sees them coming. Each capsule carries a coloured glow matching its power-up type. Touch pickups trigger the corresponding timer immediately; no menu, no pause.

**Feedbacks are instantaneous:** every obstacle break, coin grab, and mission milestone fires a floatie text above the hero and keeps the run moving. There is no results screen mid-stage — only the running and the feedback.

---

## 5. DIFFICULTY

| Mode | Name | Description |
|---|---|---|
| 1 | BREEZY | For relaxing. |
| 2 | SPICY | For the bold. |
| 3 | SERIOUS BUSINESS | We can no longer be responsible. `:)` |
| 4 | ULTRA MAXIMUM DELUXE | Please sign the waiver. |
| 5 | UNPLUGGED | No. Genuinely. No. |

**Modes 1–4 are byte-identical** — asserted by automated test. The joke is load-bearing.

Choosing UNPLUGGED prompts: "ARE YOU SURE? (WE ARE NOT.) ENTER: YES / ESC: WISDOM"

---

## 6. PROGRESSION & ECONOMY

### 6.1 Plug Unlocks

| Plugs | Unlocks |
|---|---|
| 0 | PLUMBER PANIC |
| 2 | SPEED ZONE |
| 5 | NEON BLASTERS |
| 12 | FROST FORTRESS (Act II) |
| 16 | CRYPT SHIFT |
| 20 | RHYTHM BANKRUPTCY |
| 25 | THE BACK ROOM appears |
| 28 | CARDBOARD KINGDOM (Act III) |
| 34 | CORPORATE KOMBAT |
| 40 | THE SURGE |
| 45 | Finale gate (inside the 81-plug ceiling) |

Total campaign: 81 plugs (27 stages × 3).

### 6.2 Repair Counter (Dolores)

| Upgrade | Base | Levels | Max | Costs |
|---|---|---|---|---|
| EXTRA SHIELD CAPACITY | 1 | 2 | 3 charges | 1500, 4000 |
| SUPER MAGNET DURATION | 1 | 2 | 16 seconds | 1500, 4000 |
| HERO REFIRE RATE | 0 | 2 | -20% cooldowns | 1800, 4000 |

All prices include the Food Court Surcharge (8.73–12.47%).

### 6.3 Pawn Shop (Gary)

| Mod | Cost | Effect |
|---|---|---|
| STORE-BRAND BATTERIES | 1200 | +1 battery cell. Power-ups 20% shorter. |
| LEGALLY DISTINCT CAPE | 1500 | One extra air-jump for everyone. |
| OSHA COMPLIANCE BINDER | 900 | Checkpoints restore +1 cell. |
| EGGSHELL'S CRAYON | 400 | Score popups one rank more enthusiastic. Actual score -5%. |
| HAUNTED COUPON | 600 | Pawn shop prices -25%. Gary's head follows you. |
| A THIRD POCKET | 2500 | Equip a third mod. |

### 6.4 Hero Mastery

XP thresholds: 100, 300, 700, 1400 (levels 1–5). Each hero has one sidegrade with a comic drawback:

| Hero | Sidegrade | Effect |
|---|---|---|
| Lorenzo | SHOCK STOMP | Shockwave breaks nearby obstacles, scatters nearby coins |
| Gnash | MOMENTUM GUY | Stacking speed after every tag |
| Fernwick | SHIELD BASH | Roll breaks hazards, ends in brief stumble |
| B-33P | CHARGE SHOT | Pellets pierce ground and flying obstacles |
| Mochi | EXTRA FULL OF AIR | Floats longer but becomes wider |
| Miss Chomp | HAZARD DIET | First bite each stage has no cooldown |
| Ray M'n | FREELANCE FIST | Rocket fist collects coins before returning |
| Grumpos | RICOCHET AXE | Axe hits a second target, harder to catch |

---

## 7. VISUAL STYLE

### 7.1 The Fundamental Contrast

Heroes are **procedural vector toons** composited at device resolution with bilinear smoothing. The world is deliberately **low-resolution and pixel-influenced**. This contrast — pin-sharp heroes over chunky, style-pack-aware worlds — is the game's visual identity.

### 7.2 Canvas Architecture

- **Logical resolution:** 480×270 (all game code draws in this space)
- **Back buffer:** variable device-pixel density (adaptive; see below)
- **Overlay layer:** same density as back buffer, for heroes and banners
- **Chrome canvas:** separate full-viewport canvas behind #game, for margin touch controls
- **WebGL post-pipeline:** optional bloom + vignette on the final composite (when Glow Effects is on)

### 7.3 Adaptive Render Density

Every display starts at **3× density** (1440×810 backing pixels). The renderer measures frame timing and can step down (to 2.5×, 2×, 1.5×, 1×) under sustained load, or climb back up after sustained headroom. A locked rung (two failed attempts at a quality tier) releases after 30 seconds of clean 60 FPS.

Two protections prevent thrashing:
- A throttle guard detects OS rAF caps (Low Power Mode) and reverts futile drops.
- A freeze stops adaptation entirely after two futile drops in one session.

Bloom is suppressed at 1.5× density and below. Touch chrome is capped at 2× device-pixel ratio.

### 7.4 Cabinet Style Packs

Each cabinet has a distinct visual identity — palette, ground/enemy art, sky color, and post-processing feel:

| Cabinet | Style | Palettes | Distinctive Elements |
|---|---|---|---|
| PLUMBER PANIC | pixel | Green ground, blue sky | !-crates, pipes, cacti |
| SPEED ZONE | faux-3D | Orange/warm ground | Boost pads, traffic cones, road gaps |
| NEON BLASTERS | neon vector | Dark navy/purple | Drones, shooters, targets, pellet trails |
| FROST FORTRESS | watercolor | Pale blue/white | Snowmen, icicles, frozen switches, slide physics |
| CRYPT SHIFT | VHS | Dark purple/grey | Tombstones, zombies, darkness radius |
| RHYTHM BANKRUPTCY | LCD handheld | Olive/muted green | Beat-synced bars, on-beat bonus |
| CARDBOARD KINGDOM | cardboard | Warm tan/brown | Collapsing scenery, fake perspective props |
| CORPORATE KOMBAT | doodle | Light grey/white | Chairs, printers, paperwork obstacles |
| THE SURGE | mashup | Dark everything | Remixes elements from all eight previous cabinets |

### 7.5 Sprite System

- **Heroes:** `src/sprites/toons.js` — procedural vector renderer; draws humanoid figures from geometry primitives
- **World/props:** `src/sprites/props.js` + `src/sprites/world.js` — pixel-influenced rendered props
- **Legacy sprites:** string-grid pixel sources for specific world art and palettes
- **Hero sprites:** `src/sprites/heroes.js` — per-hero toon rig definitions

---

## 8. AUDIO & MUSIC

### 8.1 Audio Architecture

- **Engine:** Web Audio API with a lookahead step-sequencer
- **SFX:** fully procedural — no external audio assets. All cues synthesised from oscillators and noise buffers at init.
- **Weapon contact/launch cues:** synthesised into buffers at init from `src/engine/weapon-sfx.js`
- **Music:** per-cabinet pattern banks (bass, lead, percussion, chord, and echo lanes) played through a YMCK-style dotted-eighth echo bus
- **Lazy init:** audio context created on first user gesture; resumes on every gesture (iOS requirement)

### 8.2 Music Tracks

Each cabinet has a fully authored step-sequenced song with its own BPM, instrumentation, and section progression:

| Cabinet | BPM | Character |
|---|---|---|
| PLUMBER PANIC | 112 | A-F-C-G loop with melodic variations, building chord stabs |
| SPEED ZONE | 128 | E minor lap that modulates I→IV→V like gear changes |
| NEON BLASTERS | 120 | Sawtooth lead, driving percussion |
| FROST FORTRESS | 100 | Triangle lead, sparse, spacious |
| CRYPT SHIFT | 90 | Triangle lead, sparse kick, dark |
| RHYTHM BANKRUPTCY | 124 | Dense percussion, on-beat accents |
| CARDBOARD KINGDOM | 108 | Triangle lead, warm and slightly off |
| CORPORATE KOMBAT | 116 | Driving hats, work-drone feel |
| THE SURGE | 132 | Sawtooth, remix engine, everything at once |

**Hub theme:** 90 BPM loiter groove (Am-Em-G-D) that builds from bare bass to double-arpeggio crescendo over 8 sections. Also plays from the Sound Test menu.

**Title theme:** 56 BPM nocturne — Plumber Panic's bed remembered from an empty arcade, percussion-free, dissolving into echo.

**Finale theme:** surge's remix engine reworks the hub theme into a house arrangement.

### 8.3 Sound Design Rules

- All SFX are procedural — the game ships zero audio files.
- Weapon cues are synthesised from recipes; each hero has a distinct launch and contact sound.
- Debris materials (wood, stone, metal, soft, gold) have distinct timbral profiles.
- Master trim for attack cues sits at 0.25×; individual SFX have per-cue volume trims to balance perceived loudness.

### 8.4 The Mixing Desk

Every lane runs through a channel strip (`src/engine/mixer.js`) rather than straight
into a shared bus: fader, pan, three-band EQ, one send per aux, and up to six insert
effects. Two shared sends — the engine's original tempo-synced Delay and a
convolution Reverb — and a master bus, each built from the same parts as a channel.
`npm run mixer` opens the desk on the game's own engine; "Save to game" writes
`src/data/mix.js`, which the game and every render tool then read.

**At defaults a strip is a pass-through, and this is load-bearing.** Every song was
balanced by ear against the engine as it was before the desk existed, so:

- Pan is a native `StereoPannerNode` fed **explicit stereo**, never `Tone.Channel`
  (which downmixes to mono: 0.7071 at centre against native's 1.0000).
- EQ is three serial biquads, never `Tone.EQ3` (a crossover splitter, not
  transparent even flat).
- The master limiter is **off by default** — a `DynamicsCompressorNode` carries 6ms
  of lookahead that cannot be switched off, so merely having it in the path delays
  everything.
- **The reverb's impulse response is seeded** (`makeReverb` in `effects.js`), not
  Tone's. `Tone.Reverb` fills its IR from `Math.random`, so every render of every
  song carrying reverb was a different file — measured 1.2e-1 apart between two
  renders of the same track, against a 5e-6 tolerance. Stems stopped summing to
  their mix and no baseline could match. Anything added to the catalogue that
  generates a buffer needs the same check.
- `tests/null-test.js` renders the engine offline and compares it sample-for-sample
  against reference dumps (`npm run baseline`, 5e-6 tolerance). It runs in `npm test`.

**Stereo:** lanes are mono into the strip, made explicit stereo at the input so pan
is unity at centre; `sweeps` and `gliss` build their own panners per voice and are
left alone. Mid/side width is available per strip and is exactly transparent at 1.

**Values in `mix.js` are relative trims in dB**, laid on top of whatever the bank and
its sections computed — banks vary their own lanes per section, and an absolute value
would flatten variation that was written on purpose.

**A save is scoped, and the version it replaces is kept.** The desk posts only the
songs a save is about and the server merges them into the file as it stands, so a tab
left open since the morning cannot write its stale copy of the other songs back over
what has landed since. Every write first copies the file into `work/mix-history/`
(gitignored, last 300, named for the song and stamped to the second); **⋯ → Restore a
previous save** loads one back into the desk as an unsaved draft. Undo covers the
desk, git covers what has been committed, and this is what sits between them.

**One render path.** `tools/lib/render-bank-browser.js` runs `src/engine/audio.js`
in headless Chromium under an `OfflineAudioContext`; every WAV, stem, MP4 and the
desk's own audition come from it. The hand-written JS mirror it replaced generated
naive (non-band-limited) waveforms and could not see `mix.js`, so everything it made
was brighter than the game and unmixed. Nothing renders audio any other way.

**Headroom:** no track peaks above full scale. Where one did, the fix was per-lane
and measured — render each lane as a stem, read its signed value at the peak sample,
and trim what is actually there (shop was kick + hats; its clap, despite the higher
solo peak, contributed nothing at that sample).

### 8.5 The Voice Library

Every sound in the game is a branch in `scheduleStep()` — thirteen lines of
oscillator, filter and envelope per bass flavour, in a function that must stay
sample-identical for every song already balanced against it.
[`src/data/voices.js`](../src/data/voices.js) is the other way to add one: a hundred
and fifty-odd presets in a table, of four kinds.

- **Engine presets** are the game's own hand-written voices, named. `bassFilteredSaw`,
  `bass80s`, `leadBright`, the drawbar organ and the plain waveforms were reachable
  only by typing a key into a bank. A preset *is* that set of keys: `applyMix` expands
  it onto the bank and `scheduleStep` reads exactly what it always read, so they cost
  no engine code at all.
- **Tone presets** are synths built from `options`, played by
  [`src/engine/voices.js`](../src/engine/voices.js). Nothing in the engine branches on
  which one.
- **Noise presets** are native nodes on the engine's own seeded noise buffer — a
  filtered burst, an optional pitched body, optional taps. The snares, claps and hats
  Tone could not provide (see the offline rule below).
- **Drum-synth presets** (`ds` ids) are the Microtonic construction on the same seeded
  buffer: an oscillator with a pitch envelope and a filtered noise source, each with
  its own attack/decay/curve envelope, summed into a tanh drive. Either half can be
  left out — a tom is all oscillator, a clap all noise. `_playDrum` in
  `src/engine/voices.js` plays them; `tools/render-drum-auditions.js` writes one WAV
  per preset and a kit demo.

Rules the design turns on:

- **Opt-in, per lane, by a bank key.** `bassVoice`, `kickVoice` and the rest name a
  preset — on a bank, a section, or a song's `voice` block in `mix.js`. All three
  already merge before the sequencer runs. Unset is inert: `playVoice` returns before
  constructing anything, so a game whose songs name no presets renders exactly as it
  always did. Nothing in the game uses one today.
- **Thirteen lanes**: six melodic and all seven drums. Percussion holds hits rather
  than notes, so a preset is struck at the lane's own pitch.
- **Presets are not tied to a lane.** Category describes the sound; a bass preset on
  the lead is a lead. The only exceptions are engine presets that are lane-specific
  code paths, and they say so.
- **A preset replaces the lane, it does not layer over it.** `bassRepeat`'s ghost note
  is restated on the same preset; `leadBright`'s octave sine belongs to the engine's
  lead and goes with it.
- **The offline rule applies here too.** Tone's `PluckSynth` renders silent (an
  AudioWorklet comb filter, like Freeverb) and `PolySynth` renders silent unless its
  first trigger is at exactly t=0 — so polyphony is a pool of monophonic synths that
  grows to the widest chord asked of it. Nothing uses `Tone.Noise`, which seeds from
  `Math.random` and would stop two renders matching: every noisy preset — the noise
  kind and the drum synth alike — is built on the engine's seeded buffer, so renders
  stay sample-deterministic and stems sum to the mix. `tests/voices.js` renders every
  preset, fails on a silent one, and checks a drum-synth render twice for identity.
- **Levels are measured at both ends.** `tools/measure-voices.js` renders one note of
  each lane's own voice and one note of each preset at unity, and writes both tables
  back into the library; the engine divides one by the other. Melodic lanes land
  within 0.1dB of the voice they replace. Re-run it after editing any preset's
  options.

---

## 9. CONTROLS

### 9.1 Keyboard

| Action | Keys |
|---|---|
| Jump (hold = higher) | Space / W / Up |
| Duck (hold) | S / Down |
| Hero power (ability) | Right / D (X / Shift also) |
| Pause / Quit | P / Esc (Esc again quits) |
| Mute | M |
| Menus | Arrows + Enter |
| Debug overlay | ` (backtick, dev builds only) |

### 9.2 Mouse (Desktop)

| Action | Input | Notes |
|---|---|---|
| Jump | Left click, left 70% of canvas | Tap or hold for height |
| Hero power | Right click, right 30% of canvas | Same split as touch |
| Pause menus | Left click plates | CONTINUE / EXIT TO FOOD COURT |

The canvas is split horizontally: the left 70% is jump territory and the right 30% fires the hero's special. This is the same split touch uses, so a player moving between devices never needs to re-learn where the buttons are. Menus and the hub ignore this split — clicks there use their own tap targets.

### 9.3 Touch

| Action | Gesture / Button |
|---|---|
| Jump | Tap left 70% of canvas (or JUMP button) |
| Duck | Swipe down (hold) |
| Hero power | Tap right 30% of canvas (or USE button) |
| Pause | ⏸ button (top-right or margin) |
| Walk in hub | Left/Right canvas zones |

### 9.4 Touch Chrome (iPad / Wide Screens)

When the viewport has enough margin outside the 480×270 game rectangle, controls move into the black margin as circular buttons on a separate canvas. This keeps the play field clear. The ability-name plate (e.g. "STOMP / SMASH") sits above the USE button in landscape mode.

### 9.5 Gamepad

Standard gamepad mapping: face buttons for jump/duck/ability, shoulder buttons for ability, Start for pause. D-pad / left stick for menus.

---

## 10. TONE RULES

From `src/data/jokes.js` — these govern all in-game text:

1. **Absolute deadpan sincerity.** Every line is delivered completely straight.
2. **Jokes never replace usable information.** A joke may run alongside a mechanic, never over it.
3. **Everything is uppercase in-game.** No lowercase text appears on screen.
4. **Each hero has ONE comedic bit** hammered repeatedly. Depth through repetition, not novelty.
5. **Exit lines stand alone** — no setups waiting for a punchline.
6. **Eggshell is never funny on purpose.** He is funny because he is absolutely serious.
7. **The game is honest about itself.** Difficulty modes admit the joke. Prices are upfront. The crayon tells you it reduces your score.

---

## 11. PLATFORM BEHAVIOR

### 11.1 Desktop

Full WebGL + bloom. Keyboard primary; mouse uses the same 70/30 canvas split as touch — left 70% is jump, right 30% is the hero's special, right-click is always special. Fullscreen available.

### 11.2 iPad

Playable in Safari and fullscreen. Touch chrome controls in the margin. Adaptive render density starts at 3×. WebGL with tier-gated bloom (suppressed below 1.5×).

### 11.3 iPhone

Install-gated: Safari loads only an install screen with Home Screen instructions. The game bundle is not requested until launched from the Home Screen. Portrait orientation pauses gameplay with a rotate-to-landscape dialog. Installed copies self-update via service worker (network-first, cache as offline fallback).

### 11.4 Lifecycle

All platforms pause audio, input, rendering, and the game loop when the page/app is hidden or the device is locked.

---

## 12. TECHNICAL ARCHITECTURE

### 12.1 Build

- **Bundler:** esbuild (dev-time only — no runtime dependencies)
- **Build command:** `npm run build` → `dist/index.html` (install gate) + `dist/game.js` (deferred bundle)
- **Dev command:** `npm run dev` → watch + server at `http://localhost:8001/`, and `http://MBP14.local:8001/` from a phone on the same wifi
- **Archived releases:** versioned copies in `dist/v{N}/` for GitHub Pages history
- **Minification:** production builds are minified; dev builds are not

### 12.2 Source Layout

| Directory | Purpose |
|---|---|
| `src/engine/` | Loop, renderer, input, audio, RNG, save, sprites, glfx |
| `src/game/` | Run state, relay, spawner, bosses, minigames, hub, menus, HUD |
| `src/data/` | Heroes, cabinets, stages, dialogue, jokes, progression, words |
| `src/sprites/` | Toon renderer, vector props, world art, hero rigs |
| `build/` | Build script, service worker, HTML template, icons |
| `tests/` | Test suites (migration, difficulty, renderer, density, reliability, boss, story, etc.) |
| `tools/` | Gallery builder, release archiver, fairness/economy simulators, icon renderer |
| `docs/` | Design specs, command history, listening indexes |
| `dist/` | Build output — the published site. Gitignored |
| `work/` | Everything else generated: renders, baselines, throwaway shots and scripts, mixer history. Gitignored, always safe to delete |

### 12.3 Testing

`npm test` runs: migration, difficulty-identity, bot-plays-a-stage, minigames, bosses, full-flow smoke, fairness + economy sims, renderer contracts, adaptive density controller, touch smoke, build shell validation.

`npm run sim` runs the fairness simulator (validates obstacle spacing is survivable).

`npm run sim:economy` validates campaign coin income covers the core upgrade track.

---

## 13. KEY DESIGN PRINCIPLES

1. **No external assets.** Every sprite, sound, and music note is procedural math. The game ships as two text files.
2. **One hero at a time.** The budget-cut premise is the design constraint. The relay is the game.
3. **Runners, not fighters.** Bosses are dodged and outlasted using runner verbs only.
4. **The joke is load-bearing.** Difficulty modes are byte-identical. The premise is a budget joke. The toaster is not a metaphor.
5. **Teach once, then get out of the way.** Tutor prompts are brief, in-flow, and never repeat.
6. **Be honest with the player.** The crayon admits it hurts your score. Difficulty describes itself truthfully. Prices are what they say.
7. **Vector heroes over pixel worlds.** The contrast is the visual signature.
8. **Every cabinet is its own genre parody** — different obstacles, music, palette, and feel. THE SURGE mashes all eight.

---

*This bible is the canonical reference. Source-of-truth files: `SCRIPT.md` (dialogue/story), `src/data/heroes.js` (character stats), `src/data/cabinets.js` (cabinet configs), `src/data/progression.js` (economy), `src/engine/renderer.js` (visual pipeline), `src/engine/audio.js` (sound system).*
