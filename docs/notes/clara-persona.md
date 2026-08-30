# Clara Vault — persona, kit, look, and the road here

The eighth hero as of 2026-08-30: **CLARA VAULT, MALL RAIDER** (`id: 'clara'`),
a raider-archaeologist who took Mochi's roster slot the way Kiko took Miss
Chomp's. Mochi is not deleted — rig, palette and lines all survive, held for a
cameo — she is simply off every surface that enumerates `HEROES`, and this doc
records where the hand-edited ones were.

## The name

A Lara Croft / Tomb Raider play, by request. The road: PITA / PETRA / AMBER /
SABLE (rejected — Peter wanted the Croft parody direct), then LARA CRAFT /
CLARA LOFT / LARA CROQUE / TARA TOMB, then LARA VAULT / LARA CRUFT / TOMBOLA /
LARA CROISSANT. TOMBOLA won a round and was overturned by Peter's own
"Clara Vault?" — which is the better parody: Clara≈Lara, and VAULT is the tomb
she robs, the bank of treasure, and the jump she is famous for, which is also
her passive. Subtitle **MALL RAIDER**, following the `name + subtitle` grammar
of KIKO, JURISDICTION PENDING and GRUMPOS, DAD OF BOY.

## The bit: pulp narration

She lives inside a pulp adventure serial and reads it out — breathless third
person, past tense, chapter numbers — while standing in a food court doing
nothing of the kind.

**The rule protecting it: the narrator is always sincere.** The gap between
the prose and the premises is the joke, and the moment she winks at it the
register collapses into sarcasm, which Gnash already owns. She is not a
fourth-wall break: the serial is real to her, the way Fernwick's receipt is
real to him.

**The register check** (her equivalent of Kiko's Gary test): her vocabulary is
EXPEDITION prose — chapter, temple, artifact, cursed, ancient, our heroine, to
be continued. Swap her nouns for HR nouns and every line dies, which keeps her
off Gary's turf; take away the narration frame and the line should stop
working, which keeps her off everyone else's.

Her lines live in `src/data/jokes.js`: one TAG_LINE (`SUDDENLY: CLARA
VAULT.`), three EXIT_LINES (each standing alone, per the file's rule), and
twelve HUB_LINES — one per named joke type, in order: the ruin / the artifact
/ the peril / the leap / the pistol / the cliffhanger / the tense slipping /
the guardian / the cursed treasure / the map / the franchise / the
scholarship. Two pay rent on the kit. Anyone adding a thirteenth line has to
name its type.

Other copy in her voice: the cast card (`tagline: 'CHAPTER ONE: SHE
ARRIVED.'`, `joke: 'NARRATES HER OWN LUNCH. IN THE PAST TENSE.'`), the firing
float text (`SHE FIRED. TWICE.` / charged `SHE FIRED. GENEROUSLY.` —
run.js keeps the count honest, see the kit), and the credits: she holds the
AUDIO→CAST handoff Mochi used to (`Chapter one: the credits.`) and the
FACILITIES→HR baton pass to Kiko.

## The kit

- **CLIFFHANGER** — `jumpMult: 1.15, maxJumps: 1, variableJump: true`. One
  huge dramatic leap; second jumps are for people with doubts. It is
  Lorenzo's trade taken further (his 1.10 was the roster's top), and the
  difference lives in data, the same way the shooters differ. **It moved the
  camera budget**: `MAX_HERO_ALT` in engine/camera.js went 168 → 185, because
  her stack (1.15 with capsule + cape air jumps) measures 184.0px against the
  old ceiling's 168.3. The crane is sized off that one number, so PAN_MAX
  followed; tests/camera-framing.js and tests/tune-store.js carry the same
  literal. The double jump did NOT come across from Mochi — Kiko already
  carries it — and the float retired with her.
- **PLOT HOLE** — `type: 'shoot', cooldown: 3.0, shotSpeed: 340, shotSize:
  0.85, shotBurst: 2`. The third shooter, and not the same weapon as either
  of the others: B-33P small and fast on a 1.35s recharge, Kiko fat and slow
  on 3.5s, Clara the fastest and smallest rounds on a middle cooldown — and
  TWO of them per pull. `shotBurst` is her twin pistols as gameplay: each
  trigger pull is a pair of slugs at a fixed 16px stagger, same vx so the gap
  holds in flight and reads as a double-tap. Data on the row; nothing
  downstream knows who fired. Her `pal.ki` (`#ffd27a`, brass) is what colours
  the slug — without it the renderer falls through to B-33P's lemon.
- **Sidegrade: SERIALIZED** (`id: 'serial'`) — the shot faster but smaller,
  REASONABLE FORCE's trade run the other way, riding the same
  shotSpeed/shotSize pair in the shoot branch.

## The sound

`37-clara-pistol-pew.wav` — PEW PEW, by request: two classic arcade pews
~100ms apart (fast falling square sweep, saw an octave under, tick of
highpassed noise), the second a hair lower in pitch so it reads as two guns
rather than one gun echoing. Matches the double-tap on screen. Contact is
`38-contact-clara-ricochet.wav` — a glancing zing, not energy giving way
(that is Kiko's pair). Gains in audio.js start at launch 0.62 / contact 0.78
on the bright-reads-loud logic that has B-33P trimmed hardest; RMS measured
at 0.277/0.173 against Kiko's 0.233/0.277, landing her effective launch just
under Kiko's. Render candidates with `node tools/generate-weapon-sfx.js`.

## The look (the bake-off record)

The full field, in order of elimination:

- **B (FIELD)** — olive shirt, pack, headband pony. **C (RELIC)** — open tan
  jacket, harness, half-up bun. **D (CLASSIC)** — the 3D chibi figurine taken
  head-on: turquoise crop tank, bare midriff, squat by legLength, twin
  pistols. Cut first; Peter kept the A family. What they proved survives:
  B's trousers-above-the-boot value rule is in the shipped palette, and D's
  finding that a garment edge on skin pays for itself in VALUE (not hue) is
  the rule if shorts ever return. D's twin pistols came back at the end as
  the shipped power move.
- **E (SURVIVOR)** — the 2D vector Lara: charcoal tank, crossed straps,
  streaming pony. The only neutral top in the field — worth remembering if
  the palette ever fights.
- **A → A2 → A3 → A4**: teal waist-belt original; olive tank + hip belt
  (`beltDrop: 0.035`) opening a sliver of midriff; the waist taken in
  (`taper: 0.78` — which flushed out the belt-sized-off-the-shoulder bug);
  shorts. **A3 won** ("close to perfect"); A4's shorts are the value-rule
  note above.
- **The hair rounds**: the default long-hair rim (1.45R proud, falling past
  the jaw) read as a bob AND a plait — two hairstyles on one head — so the
  `pulled` HAIR_CUT was built (fall 0.42 / flare 0.35, tightened once from
  0.5/0.55) and the hairline swept back 0.16R off the brow (`swept-back`
  FRINGE). Then a forelock was tried and CUT ("don't like the forelock"),
  and the wisp ladder (2/4/6, numeric `tendrils` — pairs stepping inboard
  and shallower because the brows cap the depth) settled on **two wisps**:
  one strand escaping in front of each ear, everything else obeying the
  plait. The plait itself was right from the first cut and never changed.

All the painter pieces stay live in toons.js: the pulled cut, both swept
fringes, the numeric tendril counts, `drawPistol` + thigh/hip holsters with
`holsterDrawn` gating, and the braid. Her spec is `TOON_SPECS.clara`
(`pistol: 'twin'`); her `faceSeed` 2.7 lives in the FACE_SEED table.

## Where Mochi went

Off `HEROES` (Clara has her slot), which automatically clears her from the
relay pool, hub crowd, curtain call, cast roll, dev PLAY-AS and the `?hero=`
door. Hand-edited: HERO_PARADE and the intro-panel line-up (menus.js),
TRANSITION_HEROES (states.js), the jukebox reel (visualisers.js), the rhythm
poster (backwall.js — Clara fronts the CRYPT now, the obvious casting, which
moved Grumpos to rhythm as BOY BAND), both credits rows, the air-jump capsule
copy (now names Kiko), and tutorial sections 7–8 (Kiko teaches the double
jump — her line was pre-written in kiko-persona.md; same 56.9px numbers, so
the five-crate stack still works). Left in place: her TOON_SPECS/pika rig,
HERO_SPRITES palette, all her lines, the compress branch, the `wide`
sidegrade row, her SFX, and every per-hero tuning table entry. Unlike
Chompo she has no NPC cast card — zero presence, per the brief. When the
cameo comes, start at the cast.js gate and this list.
