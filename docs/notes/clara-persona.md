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

- **The shoulders** (2026-08-31): the singlet lost. Two narrow straps over a
  scooped armhole is a garment the sprite cannot hold — the torso is 0.3u
  across, so the strap came out at a pixel or two and the skin either side of
  it won, leaving a pale wedge on each shoulder that changed shape with the
  arm and read as a bite out of her top on every airborne frame. The top now
  covers the shoulder whole and the ARMHOLE IS THE ARM: her arms are bare
  skin rooted at the shoulder, so the shirt's edge meets them exactly where a
  real armhole would. A shallow wide-strap cut was tried in the same pass and
  rejected — identical at lane size, but it chipped the shirt's shoulder on
  the run and the celebrate. The V throat is the only cut left in the top.

  The front-on `shoulderCap` then had to go too, and this is the part worth
  remembering: with the shoulder covered there is no seam left for it to bury,
  only one for it to break. It is a disc straddling the shirt/skin boundary,
  so whatever colour it takes it prints the wrong half onto the other side —
  in skin, a bare lobe rising out of the shirt over her shoulder (what Peter
  caught); in olive, a green bite out of the top of her arm. Drawing it under
  the arm instead of over it does not help, because the bite is the cap
  showing where the arm is NOT. The limb's own round root closes the shoulder
  at exactly the right gauge and reads as the armhole's edge. The cap is
  skipped for `spec.tank` front-on only; TURNED still gets it, where it is
  stroked and IS the shoulder's contour.

  Last in the sequence, the corner itself: `shoulderSoft: 0.75`, up from the
  taper path's default 0.5. With no sleeve to break it, the shirt's own edge
  IS her shoulder, and the shipped corner came out square — "a box with a head
  on it". 0.62 barely reads, 0.88 starts losing the shoulder line, and by 1.0
  the flat top is gone entirely and the torso is a bell that reads as hunched.
  It is a per-spec dial, not a change to the shared path: Kiko and Grumpos are
  on the same taper and keep 0.5, verified by pixel-diffing both against HEAD
  across idle/run/jump/duck (1 byte of 13.9M, delta 1 — rasteriser noise).
  Settled at **0.75**, after a look at 0.62 in place.

- **The V drifts right in a run** (2026-08-31): the neckline is cut on the
  torso's true centre, which is right at rest and looks hung off-square in
  motion — not because the V moves but because the shirt around it does. The
  depth rig roots the near arm wide and swings it across her chest, so most of
  the shirt's left half is behind an arm for most of the cycle, and a V on the
  true centre sits near the left edge of what is left to read. The run fakes
  it: **+0.015u** toward the side still showing. Standing is untouched — the
  whole shirt is visible there and the true centre is the right one. It was
  first tuned to 0.02u; retuned once the head nudge below came out, because
  half of what the V was chasing turned out to be the HEAD being off-centre
  rather than the shirt.

- **She was undressed on the ground** (2026-08-31): the crouch and the reclined
  poses had no V, no midriff, no belt and no holster — everything that makes
  her waist read was gated off. Two separate causes. The standing rig gates
  `tank`, `crop` and `gearBelt` behind `!duck`, which cost her the lot in a
  crouch; all three flags are hers alone, so ungating them touches nobody else.
  And `duckTorsoCapsule`, which the slide, dive and tuck share, claimed in its
  own comment to dress the capsule "the way the STANDING rig dresses it" but
  only ever implemented shirt, trousers and Lorenzo's suspenders — the belt was
  inside the `spec.straps` branch, so every other hero who wears one lost it the
  moment they went to ground. The capsule now paints the same band stack the
  standing torso does (shirt, midriff from the cropped hem, trousers from the
  belt) with the V read along its axis and the belt on the colour seam.

  `thighHolster` came out of `drawHumanoid` to module scope as
  `thighHolsterAt`, taking the KNEE as a point rather than solving for it, so
  the standing rig (which has run the IK) and the reclined poses (which have
  not) can share it. The reclined ones pass a smaller `t`: 0.74 of a folded
  thigh parks the pouch on the kneecap and it reads as a knee pad.

  Two retunes after the first pass, both from Peter: the belt was sized off
  `rHip` and stopped short of the sides, because it does not sit at the hip end
  — it sits a quarter of the way up a capsule that widens from rHip to rSh, so
  the body under it is wider than the number it was measured against. It runs
  full width now and is CLIPPED to the capsule, which is the truer read anyway:
  a belt on a body lying down wraps out of sight rather than stopping. And the
  V is drawn deliberately BIGGER than the standing cut (0.26w x 0.42L against
  0.16w x 0.3L) — the capsule is a foreshortened trunk, so a neckline at its
  true proportion reads across the shape's short axis and comes out a hint;
  and the chest is the only part of her these poses show at any size, so the V
  carries the whole "tank top" read alone and has to be legible doing it. It
  survives to the 44px lane. And it is cut under her CHIN, not down the trunk's
  centre line: `axisOffset` projects wherever the pose put its head onto the
  capsule's own cross-axis and the collar slides to meet it, so changing where
  the head goes moves the collar with it. Only halfway, though
  (`V_FOLLOWS_FACE`) — the head is a long way off the axis in these poses, and
  following it the whole way puts the collar out on her flank with the cut
  running down toward the belt.

  Not done: the TUCK is a curled ball with nowhere for a waistline to sit, and
  the belt's pouch is not quoted onto the capsule — the buckle is the mark that
  carries at lane size.

- **The cast-wide head lead** (2026-08-31, found while chasing the V): every
  humanoid's head was drawn at `0.01 * u + torsoCx`, unconditional, in every
  pose, with nothing anywhere saying why — and it turned out to be doing two
  different jobs. It was zeroed cast-wide first, and Peter caught the loss
  immediately: "by centering the head in motion the face looks slightly off."
  He was right. STANDING it was simply an error — every face in the cast sat a
  little right of the body under it (Lorenzo's moustache, Gnash's nose, Clara's
  neckline, all off their own centre line at rest, under a pixel in a lane,
  which is how it survived and why it is plain at portrait scale). MOVING it
  was real work: the whole cast is drawn facing +x, and a head carried a touch
  ahead of the shoulders is what looking where you are going looks like;
  centred, a runner's face reads planted and the perspective goes flat.
  Shipped as `stand ? 0 : 0.01 * u` — the same number it always was, given only
  to the poses that travel. The yaw term beside it is untouched, being a real
  three-quarter offset. Worth remembering as a method note: a constant nobody
  documented was still carrying an intention, and the cheap test (zero it, look
  at every hero at three sizes) found the half that was wrong but needed a
  human eye to find the half that was right.

  Per-hero impact of the zeroing measured at 64/96/200px idle: confined to the
  head and everything pinned to it (caps, spikes, antenna, buns, beard all
  travel with it), 9k-24k pixels per hero, nothing detached.

- **The cameo had no arms** (2026-08-31): `transitionCameoAction('clara')` is
  a STANDING pose, and standing puts both arms behind the body — right for arms
  at rest, wrong for a draw. Both pistols floated clear of a silhouette they
  were not attached to. Fixed by setting `armsReachFront` in the pistol/aim
  branch, exactly as Kiko's ki-press does two branches above and for the same
  reason. It is the ordinary depth split, not both arms forward: the far arm
  stays behind the torso, the near one comes over it.

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
