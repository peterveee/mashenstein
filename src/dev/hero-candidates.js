// Cast candidates — characters being designed, before anyone has picked one.
//
// A candidate is NOT cast. It has no entry in HEROES, TOON_SPECS or
// HERO_SPRITES, and nothing in a build imports this file: the gallery does, and
// the gallery is a dev page. That separation is the whole reason this module
// exists. Registering a proposal in TOON_SPECS would put it in every production
// section of the gallery, on the hub wall, in the design handoff and in the
// roster the tests count — a look that has not been chosen yet, quoted
// everywhere as though it had. So a candidate carries its own spec and its own
// palette and is handed to drawToon through opts, which is the one seam added
// for it (see drawToon's `opts.spec` / `opts.pal`).
//
// Everything else is the SHIPPED painter. Every candidate below is the same
// humanoid rig Lorenzo and Gary run on — same gait, same ink, same light, same
// two-bone limbs — differing only in the flags the rig already reads plus the
// gear pieces added alongside them. That is deliberate: the question a bake-off
// answers is "which look", and it can only answer it if the answer is not also
// contaminated by "which rig".
//
// When one wins: move its spec into TOON_SPECS, its palette into HERO_SPRITES
// (with a pixel grid, like every other hero has), add the HEROES row, and
// delete it from here. When the question is settled the section comes out of
// the gallery too — the painter stays, the bake-off does not.

// ---------------------------------------------------------------------------
// THE BRIEF: a raider-archaeologist heroine whose power move is a pistol shot.
//
// Five cuts, in two groups, because the brief moved once and the record of that
// is worth keeping.
//
// A / B / C came first, and they are the COVERED reads. They were drawn on an
// assumption — that the reference's shorts-and-tank could not survive this cast
// — and the assumption was overruled: Peter asked for the reference look, tank
// top and midriff and thigh included, and that is the right call to follow. It
// is his character. What the original argument was actually about is still
// true and is now a thing to WATCH rather than a thing to avoid: at hero size a
// bare leg and a trouser leg differ by one colour, so the skin builds have to
// earn their lower silhouette from the boot line and the shorts hem, and the
// belt has to be big enough to break the column of skin down the figure's
// middle. That is why D carries a 1.35x buckle and a hard hem line.
//
// D / E came second, one from each reference Peter sent:
//
//   D — the 3D chibi figurine: turquoise crop tank, brown shorts, bare thigh,
//   plait, twin holsters, big brass buckle, chunky boots. Squat proportions,
//   per the third reference ("blocky and short and squat"), so it runs `stout`
//   rather than `slim` — and twin pistols, which that reference carries and
//   which is the strongest single read the character has.
//
//   E — the 2D vector Lara: charcoal sleeveless tank, crossed harness straps,
//   wide belt, olive cargo trousers, knee-high boots, streaming ponytail. The
//   sleeveless-but-covered middle ground between the two groups.
//
// The other standing constraint is the TURQUOISE. It is the most recognisable
// note in the reference and three heroes already carry it: Lorenzo's overalls
// (#2ea8a0), Ray M'n (#28a8a0) and Dolores' uniform (#6fa89c). A fourth is a
// collision, not a homage — in a relay the tag would read as a costume change.
// Each candidate answers differently and the answers are part of what is being
// judged: A takes it pushed deep and cool, D takes it head-on at reference
// strength, B goes field olive, C oxblood, E charcoal. The "beside the cast"
// tile in the gallery is where that gets decided, not this file.
//
// ARMS: every cut runs `armLift: 0.014`, which sockets them a little higher on
// the shoulder instead of slung under it. It started at 0.028 and came back
// half way: past about 0.015 the poses that RAISE the arm — the shot and the
// jump — root it at or above the shoulder line, and an arm leaving the body
// above its own socket reads as detached. It is a per-spec dial rather than a
// change to the rig, because armY is the root every pose measures its hands
// from — moving it globally would re-pose the whole shipped cast.
//
// HEIGHT: every cut runs `tall: 1.07`, which lifts the head, shoulders, torso
// top and legs off the feet together — proportions held, height changed. It
// reads as more than 7% because the HEAD is deliberately left out of it: the
// same 0.21u skull on a longer body is what the eye actually measures height
// by, so a small dial buys a lot. D keeps its squat build on top of that, from
// a lower base.
//
// PROPORTIONS: every cut runs `slim`, which is the rig's thin build — a 0.148u
// torso half-width against the 0.17u the men get, with the arms and legs
// narrowed to match. She is meant to read as thinner than the male cast and
// that is the lever for it. D is squat as well as thin, and it gets there
// through `legLength` rather than through girth: shortening the legs lowers the
// whole figure and keeps the blocky read the third reference has, where a
// `stout` torso would have made her the WIDEST hero on the roster.
//
// What all the cuts keep, because this is one character in several and not
// several characters: her face, her skin, her auburn hair, brass hardware,
// boots, and a gun on her hip.
// ---------------------------------------------------------------------------

// Shared across all five, so a viewer comparing them is comparing the CUT.
const SKIN = '#f0c49a';
const HAIR = '#8f4a22';
const HAIR_DARK = '#5a2c12';
const INK = '#1a1028';
const LIP = '#a8465c';
const BRASS = '#e0b24a';
const GUNMETAL = '#4c5360';

const face = {
  s: SKIN, e: INK, m: LIP, w: '#fff',
  hair: HAIR, hairDark: HAIR_DARK, hand: SKIN,
  a: BRASS, gunmetal: GUNMETAL,
};

export const RAIDER_CANDIDATES = [
  {
    id: 'raider-a',
    name: 'A — EXPEDITION',
    note: 'Covered. Plait, sleeveless, twin thigh rig, and the borrowed teal held deep and cool so '
      + 'it is a fourth teal on the roster rather than Lorenzo\'s. Bare arms cost nothing at this '
      + 'size — skin against a coloured torso is MORE contrast than a sleeve gives, not less. The '
      + 'trousers are the risk: khaki against skin is a narrow value gap, so watch the hip line.',
    spec: {
      faceSeed: 0.9, rig: 'humanoid', armLift: 0.014, tall: 1.07, head: 'braid', mouth: 'smile', slim: true, taper: 0.9,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      bareArms: true, gloves: true, gearBelt: true, holster: 'thigh', boots: 0.5,
      pistol: true,
    },
    pal: {
      ...face,
      b: '#1f8f8a',        // deep turquoise tank — the borrowed note, pushed cool
      p: '#a98757',        // khaki climbing trousers
      f: '#5c3a22',        // brown boots
      w: '#7a4f2c',        // leather: belt, holsters, cuffs
      gunGrip: '#6b4324',
    },
  },
  {
    id: 'raider-a2',
    name: 'A2 — EXPEDITION, LOW BELT',
    note: 'A cut as a TANK TOP — V at the throat, armholes scooped out of each shoulder — in olive '
      + 'rather than A\'s teal, which puts a whole hue between her and Lorenzo\'s overalls and buys '
      + 'more separation than adjusting the teal ever could. The belt is worn on the HIPS instead of '
      + 'the waist with the hem held where it was, so a sliver of midriff opens between them without '
      + 'turning into D: about a pixel and a quarter of skin at hero size, a hint here and a statement '
      + 'at menu scale, which are two different judgements. Note what a tank top CANNOT have at this '
      + 'size: the bare shoulder outboard of the strap is half a pixel wide, so the cut-away happens '
      + 'inboard instead — same shape from the front, and the part the eye actually gets.',
    spec: {
      faceSeed: 1.2, rig: 'humanoid', armLift: 0.014, tall: 1.07, head: 'braid', mouth: 'smile', slim: true, taper: 0.9,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      bareArms: true, tank: true, crop: 0.78, beltDrop: 0.035, gloves: true,
      gearBelt: true, holster: 'thigh', boots: 0.5,
      pistol: true,
    },
    pal: {
      s: SKIN, e: INK, m: LIP, w: '#7a4f2c',
      hair: HAIR, hairDark: HAIR_DARK, hand: SKIN, a: BRASS, gunmetal: GUNMETAL,
      // Olive rather than the teal A wears: it is the same garment cut
      // differently, and putting it a whole hue away from Lorenzo's overalls
      // buys more separation than any amount of adjusting the teal could.
      b: '#6a7340',
      p: '#a98757',
      f: '#5c3a22',
      gunGrip: '#6b4324',
    },
  },
  {
    id: 'raider-a3',
    name: 'A3 — A2, WAISTED',
    note: 'A2 with the waist taken in — taper 0.78 against A2\'s 0.9, so the body narrows by a fifth '
      + 'between the shoulder line and the belt. It is one number and nothing else moves: same '
      + 'singlet, same olive, same belt height, same gear, so what is being judged is the FIGURE '
      + 'rather than a redraw. The taper is the rig\'s own dial (Grumpos uses it the other way, to '
      + 'read as muscle instead of belly), and it is worth knowing it does not touch the hips — the '
      + 'legs root at a fixed half-separation — so this reads as a waist rather than as an hourglass. '
      + 'It also flushed out a real bug: the belt was sized off the SHOULDER line, so on a nipped '
      + 'waist it hung past the body on both sides. It measures at its own height now, the way '
      + 'Grumpos\'s always has.',
    spec: {
      faceSeed: 2.7, rig: 'humanoid', armLift: 0.014, tall: 1.07, head: 'braid', mouth: 'smile', slim: true, taper: 0.78,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      bareArms: true, tank: true, crop: 0.78, beltDrop: 0.035, gloves: true,
      gearBelt: true, holster: 'thigh', boots: 0.5,
      pistol: true,
    },
    pal: {
      s: SKIN, e: INK, m: LIP, w: '#7a4f2c',
      hair: HAIR, hairDark: HAIR_DARK, hand: SKIN, a: BRASS, gunmetal: GUNMETAL,
      // Olive rather than the teal A wears: it is the same garment cut
      // differently, and putting it a whole hue away from Lorenzo's overalls
      // buys more separation than any amount of adjusting the teal could.
      b: '#6a7340',
      p: '#a98757',
      f: '#5c3a22',
      gunGrip: '#6b4324',
    },
  },
  {
    id: 'raider-a4',
    name: 'A4 — A3, SHORTS',
    note: 'A3 with the trouser leg cut to SHORTS. Two things had to move before it read as one. The '
      + 'HOLSTER sits at 0.74 down the thigh, which is exactly where the bare band wants to be — so '
      + 'the hem comes up to 0.42 and the boot drops to 0.38, putting skin both above the holster and '
      + 'below it instead of one strip the pouch covers. And the shorts are a DEEPER khaki than A3\'s: '
      + 'a garment edge landing on bare leg has to pay for itself in value, and #a98757 against skin '
      + 'at #f0c49a is barely a step — the cut was there and simply could not be seen. Built like the '
      + 'top, the limb drawn in skin with a short second stroke putting the garment back on, so the '
      + 'hem cannot slide off the leg when the knee folds.',
    spec: {
      faceSeed: 3.9, rig: 'humanoid', armLift: 0.014, tall: 1.07, head: 'braid', mouth: 'smile', slim: true, taper: 0.78,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      bareArms: true, tank: true, crop: 0.78, beltDrop: 0.035, gloves: true, shorts: 0.24,
      gearBelt: true, holster: 'hip', boots: 0.3,
      pistol: true,
    },
    pal: {
      s: SKIN, e: INK, m: LIP, w: '#7a4f2c',
      hair: HAIR, hairDark: HAIR_DARK, hand: SKIN, a: BRASS, gunmetal: GUNMETAL,
      // Olive rather than the teal A wears: it is the same garment cut
      // differently, and putting it a whole hue away from Lorenzo's overalls
      // buys more separation than any amount of adjusting the teal could.
      b: '#6a7340',
      // Deeper than A3's khaki: the shorts hem lands against SKIN, and khaki
      // (#a98757) against skin (#f0c49a) is barely a value step — the cut was
      // there and simply could not be seen. A garment edge on bare leg has to
      // pay for itself in value, not in hue.
      p: '#7d6236',
      f: '#5c3a22',
      gunGrip: '#6b4324',
    },
  },
  {
    id: 'raider-b',
    name: 'B — FIELD',
    note: 'The working one. Ponytail under a headband — long, falling down her back at rest and '
      + 'streaming level only when she moves — sleeves on, bandolier across the chest and a pack on '
      + 'her back, so the gear rides the TORSO where the silhouette is widest. Gives up the teal '
      + 'entirely for field olive, which no hero owns, and gives up the twin-holster read with it: '
      + 'one gun, worn at the belt.',
    spec: {
      faceSeed: 2.3, rig: 'humanoid', armLift: 0.014, tall: 1.07, head: 'pony', headband: true, mouth: 'flat', slim: true, taper: 0.92,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      gearBelt: true, bandolier: true, back: 'pack', holster: 'hip', boots: 0.55,
      pistol: true,
    },
    pal: {
      ...face,
      b: '#6f7a44',        // olive field shirt
      // Cargo trousers, held ABOVE the boot in value. The first cut had them at
      // #3f4436, which at in-run size merged with the boots into one dark block
      // and cost her both legs — the same failure B-33P's three greys had.
      p: '#5a5f44',
      f: '#4a3320',
      w: '#6b4324',
      gunGrip: '#3a2a1c',
    },
  },
  {
    id: 'raider-c',
    name: 'C — RELIC',
    note: 'The geared-up one. Half-up hair — knotted at the nape with the length left to fall down '
      + 'her back — an open tan jacket over an oxblood tee, a climbing harness over that, and the '
      + 'twin thigh rig kept. No slim flag: the jacket is bulk and pretending otherwise puts a coat '
      + 'on a twig. Most character on screen and the most to lose — three garments and two straps '
      + 'is a lot of marks on a 0.3u torso, so check this one at phone scale first.',
    spec: {
      faceSeed: 3.7, rig: 'humanoid', armLift: 0.014, tall: 1.07, head: 'bun', mouth: 'smirk', slim: true, taper: 0.88,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      jacket: true, harness: true, gearBelt: true, gloves: true,
      holster: 'thigh', boots: 0.45, pistol: true,
    },
    pal: {
      ...face,
      b: '#9c3b52',        // oxblood tee, showing between the jacket panels
      coat: '#8a6a3f',     // tan canvas jacket
      p: '#6a6252',        // stone trousers — light enough to separate from the boot
      f: '#3a2a1c',
      w: '#5e3d22',
      gunGrip: '#5e3d22',
    },
  },
  {
    id: 'raider-d',
    name: 'D — CLASSIC',
    note: 'The reference, taken head-on: turquoise crop tank, bare midriff, brown shorts, bare '
      + 'thigh, plait, twin holsters, chunky boots — and TWIN PISTOLS on the power move, which is '
      + 'the strongest single read this character has. Squat and blocky rather than slim, per the '
      + 'third reference — but squat by LEG LENGTH rather than by girth, since she has to stay '
      + 'thinner than the men. The two things to check: whether the buckle and the hem line are enough '
      + 'to break the column of skin down her middle, and whether the turquoise can live one '
      + 'cabinet away from Lorenzo.',
    spec: {
      faceSeed: 1.6, rig: 'humanoid', armLift: 0.014, tall: 1.07, head: 'braid', mouth: 'smirk', slim: true, legLength: 0.9, taper: 0.92,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      bareArms: true, crop: 0.45, shorts: 0.4, gloves: true,
      gearBelt: true, buckle: 1.35, holster: 'thigh', boots: 0.58,
      pistol: 'twin',
    },
    pal: {
      ...face,
      b: '#2aa39a',        // the reference turquoise, at reference strength
      p: '#8a5c36',        // brown shorts, lifted clear of the belt below
      f: '#5a3a22',        // chunky brown boots
      w: '#5e3a20',        // belt and holsters, DARKER than the shorts — matched,
                           // the belt disappeared and left the buckle floating
      gunGrip: '#4a3320',
    },
  },
  {
    id: 'raider-e',
    name: 'E — SURVIVOR',
    note: 'The 2D reference: charcoal sleeveless tank with a sliver of midriff, crossed harness '
      + 'straps, wide belt, olive cargo trousers and knee-high boots. Sleeveless but covered — the '
      + 'middle ground between the two groups, and the only candidate whose top colour is a '
      + 'neutral, so the palette lands on the leather and the brass instead of on a shirt.',
    spec: {
      faceSeed: 3.1, rig: 'humanoid', armLift: 0.014, tall: 1.07, head: 'pony', mouth: 'flat', slim: true, taper: 0.86,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      bareArms: true, crop: 0.88, gloves: true,
      bandolier: 'cross', gearBelt: true, buckle: 1.15, holster: 'thigh', boots: 0.62,
      pistol: true,
    },
    pal: {
      ...face,
      b: '#4a4f57',        // charcoal tank
      p: '#6b6a4a',        // olive cargo trousers
      f: '#4a3320',        // knee-high boots
      w: '#5e4028',
      gunGrip: '#33281c',
    },
  },
];

// The martial-artist candidates used to live here. SETTLED: Kiko shipped — she
// is in HEROES, TOON_SPECS and HERO_SPRITES now, drawn by the same painter and
// enumerated by every production section like any other hero. A candidate list
// for a character who exists is a second source of truth for her costume, which
// is exactly the drift this file was written to avoid, so the cuts are gone and
// her chosen one lives in the roster. Her power move — palms forward, ball of
// ki — is the `kiblast` branch in drawArms, and the reason she fits a runner at
// all: every other signature that character has is a kick, and a kick needs the
// hero to reach a hazard.

export const RAIDER_BY_ID = Object.fromEntries(RAIDER_CANDIDATES.map((c) => [c.id, c]));

// ---------------------------------------------------------------------------
// KIKO's head used to be worked out here. SETTLED, and shipped: the winners are
// in TOON_SPECS.kiko, so she is drawn by every production section of the gallery
// like any other hero and there is nothing left to compare. A candidate list for
// a decision that has been made is a second source of truth for her costume,
// which is exactly the drift this file exists to avoid.
//
// What shipped, and what each field beat, is written up in
// docs/notes/kiko-persona.md — including the constructions that failed on the way,
// which are the part worth not repeating: a lock placed near the fringe rather than
// cut into it reads as a sideburn; a narrow spike drawn as its own shape gets eaten
// by the rim shading and comes out hollow; and a fringe walked as one out-and-back
// polygon self-intersects and comes out a scribble.
