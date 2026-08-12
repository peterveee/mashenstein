# KIKO — Persona

The martial-artist hero, written. This is her character brief: the bit, the rule
that protects it, and every line she has.

**She is cast.** Candidate N (split skirt, blue) won, and the swap has run: she
holds slot 6 in `HEROES`, in place of Miss Chomp, who stepped back to the food
court rather than being deleted. Every string below is now live in `heroes.js`
and `jokes.js`.

Her weapon cue is settled: `31-kiko-warning-shot-crack` going out and
`35-contact-kiko-ki-burst` landing. All four launches stay rendered in
`work/weapons/` in case the pick is reopened.

The launch set has been through two passes. The first four (swell / focus /
chime / thrum) were rejected as too soft, and measuring them said why: it was
never level. Every cue in `weapon-sfx.js` is peak-normalised to 0.88, so gains
there are relative and nothing can be made louder by turning it up — two of
those four were already among the loudest in the file by RMS. They were the
DULLEST, at 0.008-0.017 of high-frequency energy where everything punchy sits at
0.06-0.13, because all four were sine and triangle over noise lowpassed to
620-900Hz. That is rumble, not noise. The second pass (crack / sizzle / surge /
blast) keeps the loudness and buys brightness with saw and square bodies and
audible highpassed noise. CRACK was chosen by ear — surge measured louder and
brighter, but those numbers were only ever a proxy for the complaint.

The CONTACT was then noised to match, because it had the same fault the first
launches did: 0.022 of high-frequency energy, sine and triangle over a
1500Hz-lowpassed bed, so a bright crack going out was landing on a dull thump.
It is deliberately the smaller half of the exchange (0.055 against the launch's
0.069) — a contact that competes with its own launch flattens the shot into one
undifferentiated noise.

---

## The bit

**Jurisdiction.** She is conducting a criminal investigation nobody authorised, in
a privately-owned building where her badge means nothing. She is completely
serious about it. She never once acknowledges that no one deputised her, that the
arcade is not a jurisdiction, or that the perpetrator has already confessed at
length and in public.

One bit, hammered, per `jokes.js:135` and `GAME_BIBLE.md:575`. Every line she ever
gets is a fresh variation on this and not a new trait.

**The tournament is her motive, not her bit.** She came for a world tournament
that the blackout cancelled, which is why a fighter is standing in an arcade at
all. It appears in her bio and in exactly one hub line. It is never a second joke
engine — that would split the pool and break rule 4.

### The Gary test — apply to every line written from here on

Gary's bit is employment paperwork. Ray M'n's texture is insurance forms. Kiko is
the third character in the bureaucratic register, and the risk of the three
blurring together is the single biggest threat to her.

The defence is lexical. **Her vocabulary is _criminal_ procedure** — warrant,
custody, evidence, scene, rights, suspect, canvass, prints, discharge, person of
interest. Gary and Ray M'n never touch those words. Note that Gary already owns
"FORM" in both its senses (`tutorial.js:555`, "THE FORM REQUIRES BOTH"), so
form-words are his and she stays off them.

> **Take any KIKO line and swap its nouns for HR nouns. If it still works, it is
> Gary's line and not hers. Cut it.**

---

## Identity

```
name:  KIKO, JURISDICTION PENDING
short: KIKO
id:    kiko
```

`JURISDICTION PENDING` is the grammar the two staff subtitles already run —
`GARY, STILL ON THE CLOCK`, `DOLORES, NOT YET RELIEVED` (`src/game/cast.js:59-76`)
— and the same deflating-epithet shape as `RAY M'N, APPENDAGE-OPTIONAL`. Alternate
held in reserve if it reads too administrative: `KIKO, STRONGEST WOMAN IN THIS
BUILDING`, her canonical title deflated by scope.

**On the name.** Its root is 気功 / qigong, a generic term for the practice, so it
stands on its own and never depended on what her power move is called. The move
was renamed off the reference; the name did not have to move with it.

| Field | Line |
| --- | --- |
| `tagline` (attract screen) | `NOBODY REPORTED IT. I NOTICED.` |
| `TAG_LINES` (portal tag-in) | `THIS IS A CRIME SCENE.` |
| `joke` (dossier one-liner) | `MAINTAINS A CASE FILE ON EVERY OBJECT IN THIS BUILDING.` |

The tag line deliberately avoids the word *procedure* — Lorenzo owns `STANDARD
PROCEDURE.` (`jokes.js:25`). It does echo hub line 1, which is intended: Miss
Chomp's `WAKA, DARLING.` is likewise both her tag line and part of her flourish
pool.

---

## Kit

```
speedMult 1.0  scoreMult 1.0  jumpMult 1.0  maxJumps 2  canFloat false
startShield 0  magnetRadius 0  variableJump true
ability: { type: 'shoot', cooldown: 3.5,
           label: 'WARNING SHOT', callout: 'WARNING SHOT' }
skillLabel:  'FOOT PURSUIT'
skillDesc:   'JUMPS TWICE'
powerDesc:   'FIRES A BALL OF ENERGY'
abilityDesc: 'FIRES A SLOW BALL OF ENERGY THAT DESTROYS GROUND OBSTACLES.'
sidegrade:   { id: 'force', name: 'REASONABLE FORCE',
               desc: 'THE WARNING SHOT IS WIDER BUT TRAVELS SLOWER.' }
```

**The second jump, not the float.** `maxJumps: 2` and `canFloat: true` are separate
flags and Mochi holds both (`heroes.js:66`); she is the only hero with either.
Kiko takes the second jump — the wall/triangle jump is that character's canonical
air mobility — and the hover, which is Kirby's, retires with Mochi.

`FOOT PURSUIT` is the police term, and the joke is that a *foot* pursuit is the
thing that gets her off the ground. `skillDesc` carries the mechanic plainly, so
rule 2 holds. It sits in the same flavoured-but-informative band as `COSMIC
FLOAT`, `LOOSE ASSEMBLY` and `BATTERY EFFICIENT`.

**Both the ability and the sidegrade are named out of her bit rather than off the
reference** — `WARNING SHOT` and `REASONABLE FORCE` are review-board language, one
bit, which is the point. `WARNING SHOT` sits in the same oblique-but-readable band
as `LEMON CANNON`, and `powerDesc` / `abilityDesc` carry the literal truth. The
joke is that her warning shots are not warnings.

`REASONABLE FORCE` is a genuine trade, matching the shape of every other
sidegrade. It avoids `CHARGE SHOT` (B-33P owns pierce, `heroes.js:60`) and
`HAZARD DIET` (first-use-free). Its id is `force` and **not** `wide` — `wide` is
Mochi's EXTRA FULL OF AIR, and sidegrade ids are one global namespace that
`modIds.includes()` reads.

**This is not a like-for-like swap.** Miss Chomp's kit was a coin magnet plus
`pickupBonus: 1.25`. Kiko's is the strongest passive on the roster, so she is a
straightforwardly better hero than the one she replaces. Sim before and after.

### What the warning shot does, mechanically

Verified against `src/game/run.js`, because the copy has to be accurate.

Fire-and-forget, like B-33P's lemon — **not** a returning weapon like the axe or
the rocket fist. `shoot` pushes a `pellet` with no `returning`, `hover` or `t`
field, and the
entire return-and-catch block at `:2669-2707` is gated on `pr.type === 'axe' ||
pr.type === 'fist'`. A pellet cannot come back. It ends by leaving the screen
(`:2705`) or on its first break (`:2739`).

Destruction runs through the same shared path as the axe and the fist — one block
at `:2708-2742` — but the **target sets differ**, and her copy has to respect it:

| | Can hit |
| --- | --- |
| `axe` / `fist` | `canHit = true` — everything, ground and air, armored included |
| `pellet` | `(ob.def.ground \|\| ob.def.isTarget) && !ob.def.armored` — **ground only**, and it pings off armored flyers with an impact VFX (`:2717-2721`) |

So she is ground-only and one-hit, exactly like B-33P. `abilityDesc` says so.

**Two shooters is survivable.** B-33P runs `cooldown: 1.8, cooldownMult: 0.75`
(`heroes.js:53`) — a fast recharge *is* his skill — so Kiko on a plain 3.5 is
already close to half his rate.

**How the two shooters are kept apart.** `shoot` used to hardcode the projectile's
speed and size, so the hero row now carries `shotSpeed` (170 against B-33P's 260)
and `shotSize` (1.5). The same two fields are what `REASONABLE FORCE` moves —
"wider but slower" is one trade in numbers the projectile already has, not a third
special case — and each shot carries `contactHero`, which is what routes its
impact to her ki burst instead of his orb pop.

**The look.** `drawPellet` (`engine/sprites.js`) paints both shots and is the only
place the look is decided. B-33P's small hard lemon is the default; a palette
carrying a `ki` token opts into the orb instead, so he has nothing to opt out of.
Off the reference, four things carry it at sprite size: a **shell** rather than a
disc (bright rim, thin middle, so it reads as a sphere), a **tail** of streaks
converging back toward the palm, a **white-hot core**, and one **warm fleck** in
that core — her own piping gold `a`, because the reference keeps gold in the
middle of all that blue and it is what stops the orb reading as generic. Both
colours come off her palette; no hex is duplicated in the renderer. The firing
pose was already built (`kiblast`, `toons.js`).

---

## `EXIT_LINES`

Three, each standing alone — no setup waiting for a punchline (rule 5).

```
THE FILE STAYS OPEN. SO DOES THE DOOR.
I HAVE LEFT MY CARD WITH THE BARREL.
I AM NOT LEAVING. I AM CANVASSING.
```

---

## `HUB_LINES`

Twelve. The joke type is named against each one because that is the constraint
that governs the pool — `jokes.js:136`, no two lines in one hero's pool may share
a type. **Anyone adding a thirteenth line has to name its type and find it absent
from this list.**

| # | Line | Joke type |
| --- | --- | --- |
| 1 | `THE SOCKET IS A CRIME SCENE. I HAVE TAPED IT OFF. NOBODY HAS RESPECTED THE TAPE.` | the scene |
| 2 | `I READ THE VENDING MACHINE ITS RIGHTS. IT WAIVED THEM.` | rights |
| 3 | `MY BADGE IS VALID IN A HUNDRED AND NINETY COUNTRIES. THIS IS A BUILDING.` | scope deflation |
| 4 | `I CAME FOR A TOURNAMENT. I FOUND A FELONY. I AM ADAPTABLE.` | the motive |
| 5 | `I HAVE OPENED A FILE ON THE VACUUM. IT IS A THICK FILE.` | the suspect |
| 6 | `I FIRED A WARNING SHOT. THE BARREL HAD ALREADY BEEN WARNED. TWICE.` | use of force |
| 7 | `I ASKED DOLORES WHERE SHE WAS THAT NIGHT. SHE SAID "NEXT."` | witness interview |
| 8 | `GARY IS A PERSON OF INTEREST AND ALSO A PERSON WHO IS DECEASED. BOTH ARE TRUE.` | contradiction |
| 9 | `THE SUSPECT FLED VERTICALLY. I AM TRAINED FOR THAT.` | pursuit |
| 10 | `I DUSTED THE POWER STRIP FOR PRINTS. IT HAD FORTY YEARS OF THEM.` | forensics |
| 11 | `NO ONE IN THIS BUILDING HAS ASKED TO SEE A WARRANT. I FIND THAT CONCERNING.` | absence of procedure |
| 12 | `I HAVE A SUSPECT, A MOTIVE AND A CONFESSION. I STILL HAVE TO DO THE PAPERWORK.` | the plot |

All under the ~110-character wrap limit. No fourth-wall breaks — the food court,
HR and the arcade are fair game; "the player" and "the game" are not.

**Two lines pay rent on her kit**, which is the principle a discarded draft got
wrong by inventing an "EVIDENCE MAGNET" skill purely to justify a joke: line 6
motivates the **ability**, line 9 motivates the **double jump**. The mechanic
comes first and the line explains it, never the reverse.

Line 4 is the tournament, appearing exactly once. Lines 7 and 8 hook Dolores' and
Gary's existing bits without borrowing them — 7 lands on her real refusal line
(`jokes.js:248`), 8 on his real predicament.

---

## Remaining copy

| Surface | Line |
| --- | --- |
| `stages.js` `intro` | `I HAVE WALKED THIS CABINET TWICE. I AM NOW WALKING IT A THIRD TIME. FOR THE RECORD.` |
| `backwall.js` `POSTER_COPY.office` | `['KIKO', 'STILL ASKING']` — 12 chars, inside the marquee cap noted at `backwall.js:619` |
| `credits.js` FACILITIES → HUMAN RESOURCES handoff | `EVERY ONE OF THEM IS A PERSON OF INTEREST.` — she receives the last baton in the crawl, in place of Gary |

She takes the crawl's final handoff because **Gary cannot introduce Human
Resources**: that department is the joke at his expense, from the module he
delivers to his own thick file in Deceased Staff. Kiko can, having no standing
in the building at all. The reply passes the Gary test — *person of interest* is
criminal procedure, and swapping it for an HR noun kills it — and the scope
joke is that the studio's largest department, every one of whom is about to
scroll past by name, has just become her suspect pool.

### Tutorial

Section 8 — the double-jump lesson — currently teaches on Mochi
(`tutorial.js:528-575`, scripted at `tutorialscript.md:157-182`). It becomes
Kiko's when Mochi retires. **The line stays in Gary's voice**; he narrates the
whole module and never hands the microphone over:

```
was:  MOCHI JUMPS TWICE, AND NOT VERY HIGH. JUMP AGAIN IN MID-AIR. THE FORM REQUIRES BOTH.
now:  KIKO JUMPS TWICE. JUMP AGAIN IN MID-AIR. THE FORM REQUIRES BOTH.
```

"AND NOT VERY HIGH" comes out because it described a hero who *floats*, and Kiko
does not — which is also the real risk in that move. The section's hand-placed
stack of five and its portal spacing were tuned around the hover and will need
re-checking; the coins re-fit themselves, since `coinArc()` derives from
`jumpHeightFor()` (`tutorial.js:342-343`).

`tutorialscript.md` is the source Peter edits — the rewrite lands there first and
is ported into `tutorial.js` after, not the other way round.

---

## Her head — SHIPPED

Her costume was settled long before her head was. Four references and eight passes
later, all of it is in `TOON_SPECS.kiko` and `HERO_SPRITES.kiko.pal`, so every
production surface draws it and the gallery has no lab section for her. This table
is the record of what shipped; the sections below are the record of what it beat and
of three constructions that do not work, which is the part worth not repeating.

| Part | Value | Painter |
| --- | --- | --- |
| Hair length | `hairCut: 'jaw'` — level just above the jaw | `HAIR_CUTS` |
| Hairline | `fringe: 'twin-pile'` — back 0.15R, a lopsided W cut into the edge, 0.09R piled on the crown | `FRINGES` |
| Bun ribbons | `bunStubs: 'pair'` — two cut ends per bun, **beside** the long tails | `BUN_STUBS` |
| The join | `bunJoin: 'band'` — thin gold ribbon, 4 and 8 o'clock | last block of the `longHair` branch |
| Ears | `ears: true, earStud: true` | `spec.ears` — **Lorenzo's own ear piece** |
| Brows | `pal.browCol` — her own dark hair, not the face ink | `drawEyes`, `BROW_L_SCALE` |

### What each of those beat

- **Hair length**: the shipped chin-length mass lost because it lands on both
  shoulders and takes the qipao's collar and yoke with it — the top third of the one
  garment that says who she is. `crop` (to the ear) and `up` (nothing at the nape)
  were built and lost the other way; both needed two loose temple wisps to keep a
  bare nape reading as hair.
- **Hairline**: two other fringe SHAPES were built and lost — `parted` (a centre part
  meeting in a point between the brows) and `choppy` (a row of clumps at alternating
  depths, in straight lines because a curve rounds off the corners that are the whole
  read). The swept fringe with a W cut into it does what `choppy` was for.
- **Bun ribbons**: two longer ends, and three staggered at mixed lengths, both lost.
  Three long marks stop a bun reading as one shape.
- **The join**: approved as five gold BEADS in that position, then thinned to a band
  — five outlined discs on an arc that short read as busy.

All of the losers are gone from the painter rather than parked. Each was a second
copy of a path or a table entry that the winner's construction would now have to be
maintained alongside, and a table listing shapes nothing draws is a second source of
truth for a decision that has been made.

### The W

Three teeth cut into the fringe's lower edge, sharing their roots, lopsided on
purpose:

| | Base | Tip |
| --- | --- | --- |
| front | `+0.54R..+0.13R` | `-0.58R` — a wide shallow slope, barely dropped |
| middle | `+0.13R..-0.20R` | `-0.51R` — the POINT: a 0.33R base against a 0.26R drop |
| tail | `-0.20R..-0.30R` | `-0.63R` — the fine stray behind it, 0.10R of base |

**Pointiness is the ratio of base to drop**, not size, which is why sharpening the
middle tooth means narrowing its base *and* deepening its drop; doing only the first
makes a smaller tooth of the same shape. Its base has been to 0.20R (too narrow) and
back out through 0.25R to 0.33R. **Matched halves read as trim, not hair** — a
symmetric zigzag on a head that already carries a symmetric pair of buns is one
symmetry too many, so the front half is the wide shallow one and the W sits right of
centre, its shared front/middle root at `+0.13R` rather than on the axis. The tail
hangs off the middle tooth's own outer root, so it cannot be lost by moving anything.

**The W is solved against the brow, and that is what lets it be wide.** A brow spans
`|x| = 0.14R..0.68R` with its top at `-0.633R`, and brows paint *after* hair. The W's
roots sit high on the hairline, above the brow top, so it can reach out over a brow's
inner half without touching it; its tips converge inward to `|x| ≈ 0.12R`, inside the
0.27R channel between the brows, the only place a lock may hang below brow level with
nothing under it. **Wide where it is high, narrow where it is low.** The same
measurement caps the hairline setback at 0.2R.

A tooth's height on the head is set by the hairline it is cut into; only its *depth*
is the drop. So raising the W is not a matter of trimming drops — the front tooth is
0.035R deep and taking it toward zero deletes it. Raising it means moving the
hairline, which carries every root and tip with it.

### Three constructions that do not work

Each of these was built, shipped to a gallery tile, and rejected on sight. They are
the reason every lock is now CUT INTO the fringe's lower edge as one boundary walk —
the same construction as Lorenzo's cap tufts, which build the band and all its locks
in a single path for exactly this reason.

1. **A lock placed at hand-chosen coordinates near the fringe** reads as a wedge of
   hair floating on her cheek. A sideburn, not a tuft.
2. **A narrow spike added as its own subpath inside the fringe's `outlined()` call**
   comes out HOLLOW. It is filled, and then the shading eats it: every shape in this
   file gets a rim stroked just *inside* its contour, and on a spike 0.2R wide by
   0.26R deep that band covers nearly the whole tooth, leaving a pale outline of a
   lock. **Any narrow spike drawn as its own shape in this file will do this.** The
   temple wisps survive only because they are longer and fatter.
3. **The fringe walked as one out-and-back polygon** — teeth along the bottom,
   hairline back along the top — comes out a SCRIBBLE. The return leg was sampled at
   `s` values that missed the roots the outbound leg used, so the legs genuinely
   crossed and a nonzero fill cancelled the lobes.

### The rest of the head

**The join band is centred on the wrap circle's own radius**, because the visible
boundary between white ribbon and brown hair *is* that circle's edge — so half the
band falls either side of it and it sits exactly on the join rather than just
outboard of it, on white. And it is **painted last, after the fringe**: the join is
on the inboard side of each bun, behind both skull and fringe, so drawn with the buns
it was painted and immediately buried. Jewellery sits on top of hair.

**The ears are Lorenzo's**, opted into by flag rather than drawn twice, and they stay
in front of the behind-head hair. Moved earlier so a long cut would cover them the
way real hair does, they vanished at every length: her rim stands 1.16R proud even
cropped. In front of the hair and cropped by the skull is also what the chibi
references draw.

**Her brows are her own dark hair**, not the face ink. A near-black brow under a
brown fringe is a third colour on a head that has two, and hers is the only face on
the roster where the fringe comes down far enough for the two to be read against
each other. She joins Gary in `BROW_L_SCALE` for the related reason: that dial
lightens toward *white*, so a brow already at mid-brown goes chalky at the full 0.3.

**Only the SHORT cut ends are quiet, not the long tails.** The tails keep their full
width and swing; thinning and calming was tried on them first and it was the wrong
piece. The stubs are half as wide as they were, longer than they have ever been, and
flutter at a tenth of the wave. Width and length pull in opposite directions and only
their RATIO matters — a long thin cut end is ribbon, a short fat one is a paddle —
and their SAG scales with their length, because cloth is heavy and one fixed sag
across mixed lengths reads as a fan of straight spokes. The stubs went spiky, then
flag-like, before they settled: nothing points above ~50°, every one droops at the
tip and tapers hard, and length only worked once those two existed.

**The long hanging tails never shorten.** A pass did that and it was wrong: the
streamer and the cut ends are two pieces of the same ribbon, and the reference has
both. The stubs are additive.

Two marks on this head are honestly not hero-size art: the gold band and the ear
stud are both well under a pixel at 24px and are `!lod`, so they exist in the hub,
the menus and the HUD portrait and nowhere else.

## Still open

- **Her roll-call card shows from boot**, while she is only *in the hub* from Act 2. That is Miss Chomp's card, not Kiko's, and it is inconsistent — gating it means turning `CAST_HEROES` from a const into a function, which is seven call sites plus `tests/cast.js`.

  **No pixel grid was needed**, despite what `hero-candidates.js:20-21` and
  `gallery-entry.js:3081` both say. Heroes are procedurally animated vector toons
  (`draw.js:219-220`); the grids in `heroes.js` are vestigial. `buildSprite()`
  (`engine/sprites.js:7`) is the only thing that turns a grid into something
  drawable and it is called exactly twice (`draw.js:50-52`) — once over
  `WORLD_SPRITES`, and once on `HERO_SPRITES.gary.run1` recoloured into the zombie
  enemy. That is the sole consumer of any hero grid in the codebase. Every hero's
  grid except Gary's is already unread. What is live on those objects is the
  `.pal`, which `toons.js:244-245` and `tools/design-handoff-entry.js:38` read.
- **Miss Chomp's retirement.** She steps back to a food-court NPC rather than being deleted, and does not appear until Act 2 at the earliest. Her ten hub lines, `drawDisc` and her credits handoff all survive.
- **The float has no owner** once Mochi goes, and **the coin magnet has no owner** once Miss Chomp steps back. Both may simply retire; neither is Kiko's to carry.
