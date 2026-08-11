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
// The obvious reference wears a turquoise tank, brown shorts and twin thigh
// holsters. Two of those three do not survive contact with this cast:
//
//   The shorts. Nobody in MASHENSTEIN is dressed for the beach — the closest
//   thing to exposed skin on the roster is Grumpos, and he is a mythological
//   strongman. More to the point, at 24px a bare leg and a trouser leg differ
//   by one colour and the character loses their whole lower silhouette. So all
//   three candidates wear full-length trousers into tall boots, and the
//   athleticism has to come from the pose and the gear instead.
//
//   The turquoise. It is the single most recognisable note in the reference,
//   and three heroes already carry it: Lorenzo's overalls (#2ea8a0), Ray M'n
//   (#28a8a0) and Dolores' uniform (#6fa89c). A fourth is not a homage, it is a
//   collision — in a relay the tag would read as a costume change. Each
//   candidate answers this differently and the answers are part of what is
//   being judged: A takes the teal anyway, pushed deep and cool; B goes olive
//   and gives up the borrowed note entirely; C goes oxblood under tan canvas.
//
// What all three keep, because this is one character in three cuts and not
// three characters: her face, her skin, her auburn hair, the brass hardware,
// the boots, and a gun on her hip.
// ---------------------------------------------------------------------------

// Shared across the three, so a viewer comparing them is comparing the CUT.
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
    note: 'The recognisable one. Braid, sleeveless, twin thigh rig, and the borrowed teal — '
      + 'held deep and cool so it is a fourth teal on the roster rather than Lorenzo\'s. '
      + 'Sleeveless is the read the reference is actually built on, and it costs nothing here: '
      + 'bare arms are skin against a coloured torso, which is MORE contrast at 24px than a '
      + 'sleeve gives, not less. The trousers are the whole modesty change and they are also '
      + 'the risk — khaki against skin is a narrow value gap, so watch the hip line.',
    spec: {
      faceSeed: 0.9, rig: 'humanoid', head: 'braid', mouth: 'smile', slim: true, taper: 0.9,
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
    id: 'raider-b',
    name: 'B — FIELD',
    note: 'The working one. Ponytail under a headband, sleeves on, bandolier across the chest '
      + 'and a pack on her back — so the gear is on her TORSO where the silhouette is widest, '
      + 'not down at the thighs. Gives up the teal entirely for field olive, which no hero '
      + 'owns, and gives up the twin-holster read with it: one gun, worn at the belt. Least '
      + 'like the reference and the most likely to survive beside the rest of the cast.',
    spec: {
      faceSeed: 2.3, rig: 'humanoid', head: 'pony', headband: true, mouth: 'flat', slim: true, taper: 0.92,
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
    note: 'The geared-up one. Hair knotted out of the way, an open tan jacket over an oxblood '
      + 'tee, a climbing harness over that, and the twin thigh rig kept. No slim flag — the '
      + 'jacket is bulk and pretending otherwise would put a coat on a twig. The most '
      + 'character on screen and the most to lose: three garments and two straps is a lot of '
      + 'marks on a 0.3u-wide torso, so this is the candidate to check at phone scale first.',
    spec: {
      faceSeed: 3.7, rig: 'humanoid', head: 'bun', mouth: 'smirk', taper: 0.88,
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
];

export const RAIDER_BY_ID = Object.fromEntries(RAIDER_CANDIDATES.map((c) => [c.id, c]));
