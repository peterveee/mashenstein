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
      faceSeed: 0.9, rig: 'humanoid', head: 'braid', mouth: 'smile', slim: true, taper: 0.9,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      bareArms: true, bust: true, gloves: true, gearBelt: true, holster: 'thigh', boots: 0.5,
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
    note: 'A, with the belt worn on the HIPS instead of the waist and the top hem held where it '
      + 'was — so a sliver of midriff opens between them without turning into D. About one and a '
      + 'quarter pixels of skin at hero size, which is the whole point: it is a hint at this scale '
      + 'and a statement at menu scale, and those are two different judgements. The trouser fill '
      + 'drops with the belt, because the belt is there to cover that colour seam.',
    spec: {
      faceSeed: 1.2, rig: 'humanoid', head: 'braid', mouth: 'smile', slim: true, taper: 0.9,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      bareArms: true, bust: true, crop: 0.78, beltDrop: 0.035, gloves: true,
      gearBelt: true, holster: 'thigh', boots: 0.5,
      pistol: true,
    },
    pal: {
      s: SKIN, e: INK, m: LIP, w: '#7a4f2c',
      hair: HAIR, hairDark: HAIR_DARK, hand: SKIN, a: BRASS, gunmetal: GUNMETAL,
      b: '#1f8f8a',
      p: '#a98757',
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
    note: 'The geared-up one. Half-up hair — knotted at the nape with the length left to fall down '
      + 'her back — an open tan jacket over an oxblood tee, a climbing harness over that, and the '
      + 'twin thigh rig kept. No slim flag: the jacket is bulk and pretending otherwise puts a coat '
      + 'on a twig. Most character on screen and the most to lose — three garments and two straps '
      + 'is a lot of marks on a 0.3u torso, so check this one at phone scale first.',
    spec: {
      faceSeed: 3.7, rig: 'humanoid', head: 'bun', mouth: 'smirk', slim: true, taper: 0.88,
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
      faceSeed: 1.6, rig: 'humanoid', head: 'braid', mouth: 'smirk', slim: true, legLength: 0.88, taper: 0.92,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      bareArms: true, bust: true, crop: 0.45, shorts: 0.4, gloves: true,
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
      faceSeed: 3.1, rig: 'humanoid', head: 'pony', mouth: 'flat', slim: true, taper: 0.86,
      armDepth: true, hands: true, limbStyle: 'snap', pants: true,
      bareArms: true, bust: true, crop: 0.88, gloves: true,
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

// ---------------------------------------------------------------------------
// THE SECOND BRIEF: a martial-artist heroine whose power move is a ki blast.
//
// Same arrangement, different character — she is not a cut of the raider, so
// she gets her own list and her own gallery section. The reference is the
// street-fighter one: ox-horn buns wrapped in ribbon, blue qipao with gold
// piping over dark tights, spiked bracers, white boots.
//
// Her power move is the KIKOKEN — palms thrust forward, ball of energy — which
// is the reason she fits this game at all. Every other signature that character
// has is a kick, and a kick is a melee move: it needs the hero to reach a
// hazard, and MASHENSTEIN's runner never lets them. A projectile is the same
// shape of ability B-33P already has, so she lands on the existing `shoot` hook
// and the existing cooldown with nothing invented for her.
//
// The two cuts differ on ONE thing, because there is only one open question
// about her: the ribbons. They are most of what makes the silhouette hers, and
// they are also two long pale streamers on a lane full of other art. F flies
// them; G ties them short. Everything else is identical between the two.
// ---------------------------------------------------------------------------

const fighterFace = {
  s: '#f2c9a0', e: '#1f1626', m: '#a8465c', w: '#fff',
  hair: '#6b4326', hairDark: '#402513', hand: '#f2c9a0',
  a: '#f2c14e',            // gold piping and the bands at the bun
  ribbon: '#f4f1e6',       // the wrapped buns, their tails, and the bracers
  ki: '#8fe4ff',           // the blast
  iris: '#6b4a34',         // warm brown, for the big-eye cut
};

export const FIGHTER_CANDIDATES = [
  {
    id: 'fighter-f',
    name: 'F — CLASSIC',
    note: 'The reference: ox-horn buns with the ribbons flying, blue qipao with gold piping and a '
      + 'side slit, sash at the waist, puffed sleeves, spiked bracers, dark tights into white boots. '
      + 'The buns are the silhouette — the one hairstyle on the roster that is symmetric and '
      + 'outboard, which is why it survives being two pixels wide where a single tail would not.',
    spec: {
      faceSeed: 2.9, rig: 'humanoid', head: 'buns', mouth: 'smile', taper: 0.9,
      armDepth: true, limbStyle: 'snap', bareArms: true,
      puffs: true, dress: true, bracers: true, boots: 0.5,
      kiblast: true,
    },
    pal: {
      ...fighterFace,
      b: '#2f6fd0',        // the qipao — a blue no cabinet or hero owns
      p: '#4a3226',        // tights
      f: '#f4f1e6',        // white boots
      w: '#f4f1e6',
      sash: '#9fd8e8',     // pale sash, so the waist breaks the blue
    },
  },
  {
    id: 'fighter-g',
    name: 'G — COMPACT',
    note: 'Identical to F except the ribbons are tied short. The question is whether two long pale '
      + 'streamers survive a lane that already has portals, coins and flying obstacles in it, or '
      + 'whether they just add two more moving bright shapes. Compare these two at in-run size and '
      + 'nowhere else — at study scale the flying ribbons win every time.',
    spec: {
      faceSeed: 4.4, rig: 'humanoid', head: 'buns', shortRibbons: true, mouth: 'smile', taper: 0.9,
      armDepth: true, limbStyle: 'snap', bareArms: true,
      puffs: true, dress: true, bracers: true, boots: 0.5,
      kiblast: true,
    },
    pal: {
      ...fighterFace,
      b: '#2f6fd0',
      p: '#4a3226',
      f: '#f4f1e6',
      w: '#f4f1e6',
      sash: '#9fd8e8',
    },
  },
];

export const RAIDER_BY_ID = Object.fromEntries(RAIDER_CANDIDATES.map((c) => [c.id, c]));

// H is F with ONE thing changed, and it is a change to the shared face rather
// than to her costume — so it is the cut that asks whether this cast can carry
// a second eye style at all, not just whether she can.
FIGHTER_CANDIDATES.push({
  id: 'fighter-h',
  name: 'H — BIG EYES',
  note: 'F exactly, with the anime eye instead of the cast\'s. Not the shipped eye enlarged — that '
    + 'is a bigger white oval with the same small pupil rattling inside it, and it reads as startled. '
    + 'This is the drawing: iris nearly filling the sclera so the eye is mostly dark, a sliver of '
    + 'white left along the top lid, a heavy lash cap, two highlights of very different sizes, and '
    + 'brows set close over the top. Wider apart too — at this size the shipped spacing puts the two '
    + 'eyes in contact. The real question it asks is not about her: it is whether ONE hero can carry '
    + 'a different eye style than the other ten without looking like she wandered in from another '
    + 'game. Judge it on the beside-the-cast tile.',
  spec: {
    faceSeed: 1.1, rig: 'humanoid', head: 'buns', mouth: 'smile', taper: 0.9,
    armDepth: true, limbStyle: 'snap', bareArms: true, anime: 'big',
    puffs: true, dress: true, bracers: true, boots: 0.5,
    kiblast: true,
  },
  pal: {
    ...fighterFace,
    b: '#2f6fd0',
    p: '#4a3226',
    f: '#f4f1e6',
    w: '#f4f1e6',
    sash: '#9fd8e8',
  },
});


// J is the SOFT drawn eye — the one between H's full build and the cast's own.
FIGHTER_CANDIDATES.push({
  id: 'fighter-j',
  name: 'J — SOFT EYES',
  note: 'F with the drawn eye at a size the cast can live with. Barely larger than the shipped eye, '
    + 'and the budget goes somewhere else: more white around a smaller iris, one gentle highlight '
    + 'instead of two, a hairline lash instead of a heavy cap, and a near-level brow. Those four '
    + 'together are the whole difference between expressive and staring — H\'s dark mass, hard lash '
    + 'cap and down-angled brow are the exact ingredients of a glare, which is why it reads as '
    + 'intense even standing still. Both builds are round; nothing about either is doing anything '
    + 'with eye shape.',
  spec: {
    faceSeed: 3.5, rig: 'humanoid', head: 'buns', mouth: 'smile', taper: 0.9,
    armDepth: true, limbStyle: 'snap', bareArms: true, anime: 'soft',
    puffs: true, dress: true, bracers: true, boots: 0.5,
    kiblast: true,
  },
  pal: {
    ...fighterFace,
    b: '#2f6fd0',
    p: '#4a3226',
    f: '#f4f1e6',
    w: '#f4f1e6',
    sash: '#9fd8e8',
  },
});

export const FIGHTER_BY_ID = Object.fromEntries(FIGHTER_CANDIDATES.map((c) => [c.id, c]));
