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
// Everything else is the SHIPPED painter. Every candidate is the same humanoid
// rig Lorenzo and Gary run on — same gait, same ink, same light, same two-bone
// limbs — differing only in the flags the rig already reads plus the gear
// pieces added alongside them. That is deliberate: the question a bake-off
// answers is "which look", and it can only answer it if the answer is not also
// contaminated by "which rig".
//
// When one wins: move its spec into TOON_SPECS, its palette into HERO_SPRITES
// (palette ONLY — no pixel grid; the grids in sprites/heroes.js are vestigial
// and nothing reads them, see the note above HERO_SPRITES.kiko), add the
// HEROES row, and delete it from here. When the question is settled the
// section comes out of the gallery too — the painter stays, the bake-off does
// not.

// ---------------------------------------------------------------------------
// THE RAIDER used to be worked out here. SETTLED, and shipped as CLARA VAULT:
// her spec is TOON_SPECS.clara, her palette HERO_SPRITES.clara, her row is in
// HEROES (she took Mochi's slot — Mochi retired to the same held-for-a-cameo
// standing as Miss Chomp). A candidate list for a decision that has been made
// is a second source of truth for her costume, which is exactly the drift this
// file exists to avoid.
//
// What shipped, what each cut beat on the way (B/C/D, then E, then the A
// family down to A3, then the hairline rounds — the pulled cut, the swept-back
// fringe, the forelock that lost, the two wisps that won), and her whole
// persona are written up in docs/notes/clara-persona.md. The painter pieces
// the bake-off built all stay live in toons.js: the pulled HAIR_CUT, the
// swept-back/swept-wisps FRINGES, the numeric tendril counts, the pistol and
// its holsters, and the braid.

// ---------------------------------------------------------------------------
// The martial-artist candidates used to live here too. SETTLED: Kiko shipped —
// she is in HEROES, TOON_SPECS and HERO_SPRITES, drawn by the same painter and
// enumerated by every production section like any other hero. Her power move —
// palms forward, ball of ki — is the `kiblast` branch in drawArms, and the
// reason she fits a runner at all: every other signature that character has is
// a kick, and a kick needs the hero to reach a hazard.
//
// KIKO's head was worked out here as well. What shipped, and what each field
// beat, is written up in docs/notes/kiko-persona.md — including the
// constructions that failed on the way, which are the part worth not
// repeating: a lock placed near the fringe rather than cut into it reads as a
// sideburn; a narrow spike drawn as its own shape gets eaten by the rim
// shading and comes out hollow; and a fringe walked as one out-and-back
// polygon self-intersects and comes out a scribble.

// ---------------------------------------------------------------------------
// THE BRIEF: an animal to take the speedster slot off Gnash.
//
// Gnash is the one hero in the cast who is a costume clone rather than a
// parody. GNASH THE NEEDLEMOUSE is Sonic's own working title, and under it sit
// cobalt fur, red hi-tops, a smirk, a crown of quills, SPEED BOOST and SPIN
// DASH. Everyone else stands a whole abstraction away from their source — Kiko
// parodies a bureaucracy, Grumpos a register — and this project treats legal
// distance as part of the joke (docs/CREDITS.md even names the hedgehog). So
// the slot gets an animal instead, and the leading proposal is a RED PANDA,
// played for the adorableness the real animal has.
//
// Two things make that cheap, and they are worth stating because they are why
// this is a look bake-off and not a rig one:
//
//   1. GNASH IS ALREADY AN ANIMAL. His spec is the shortest in the cast —
//      { rig:'humanoid', head:'jackal', mouth:'smirk', tail:true, armDepth:true,
//      limbStyle:'snap' } — and the shipped painter already draws ears, a
//      front-facing muzzle, a fur-filled skull and a wagging tail on the same
//      two-bone humanoid rig Lorenzo runs on. Every candidate below is that
//      rig, unchanged. What was added beside it is a table (ANIMAL_HEADS in
//      sprites/toons.js) and two tail kinds — the gear-pieces-alongside rule
//      this file's header sets out, not a second painter.
//   2. HIS ART ALREADY CONTRADICTS HIS NAME. The spec says jackal, the ears say
//      jackal, toons.js says "Gnash still reads jackal-like" — and the name says
//      mouse. Nothing reconciles them, so re-speccing the head settles an
//      existing inconsistency rather than opening one.
//
// SETTLED SO FAR (2 Sep 2026): ROW 1 went to the RED PANDA. The fennec was
// the runner-up on pure silhouette and lost on grounds nothing in a tile could
// show: Sonic 2 shipped a fox sidekick, so a fox in the speedster slot is the
// one species MORE on the nose than the hedgehog it replaces. ROW 2 went to
// MID — the shipped cast proportion — over both the giant head and the slim
// cut. Both rows stay below as the record until the persona doc is written;
// their gallery sections are retired (HIDDEN_GALLERY_SECTIONS). The open round
// is the FACE — PANDA_FACE_CANDIDATES at the bottom of this file.
//
// TWO ROWS, because there are two questions and they are not the same question.
//
// ROW 1 — WHICH ANIMAL. Held constant: proportions, pose, costume, palette
// weight. Only the head kind, the tail kind and the hue move, so the row cannot
// answer anything except the species. It deliberately spans the cute-to-fast
// axis rather than offering four cute options: the red panda is the brief, the
// fennec is the one whose silhouette is strongest at hero size, the hare is the
// only animal in the row whose anatomy IS the speed read, and the stoat is the
// fast end taken to its limit.
//
// The STOAT is expected to lose and is in the row anyway. A stoat's whole
// charm is a long low body, and a long low body is exactly what a biped rig
// cannot do — so what it measures is the ceiling on "darting", which is a
// number worth having before anyone argues the panda is too round. That is how
// the raider row was run too: B's value rule and D's twin pistols both shipped
// out of cuts that lost (docs/notes/clara-persona.md).
//
// PALETTE. Gnash owns saturated blue on this roster — B-33P's hull was held off
// blue specifically for him (sprites/heroes.js). Every candidate here vacates
// it, so the "beside the cast" tile is checking two things at once: that no new
// colour collides, and that the freed blue is not now a hole in the line-up.
//
// THE BIT is still open and is not what this row is for, but it shapes the
// costume, so: the strongest replacement for Sonic is not another mascot but
// the CATEGORY — the focus-grouped 1990s platformer also-ran, the animal
// visibly designed by a marketing department to be merchandisable. It clears
// the trademark screen outright, and it makes the adorableness the joke instead
// of a liability: he is cute on purpose, because a committee made him that way.
// Hence gloves and hi-tops on every cut and nothing else — mascot merch, not
// attitude. Name and kit get settled once a face wins.

const INK = '#1a1028';
const CREAM = '#f6e7d2';        // muzzle, tail tip, inner ear
const WHITE = '#ffffff';        // gloves, face markings
const MOUTH = '#a0403c';

// Shared by every cut: this is one proposal in four species, not four
// characters. Same eyes, same mouth, same gloves, same ink.
const face = {
  e: INK, m: MOUTH, w: WHITE, hand: WHITE, mask: WHITE, ear: CREAM, s: CREAM,
};

// Held identical across row 1 so the row is a species test and nothing else.
const BODY = {
  rig: 'humanoid', mouth: 'smile', armDepth: true, limbStyle: 'snap',
  hands: true, gloves: true,
};

export const ANIMAL_HERO_CANDIDATES = [
  {
    id: 'anml-panda',
    name: 'A — RED PANDA',
    note: 'The brief. Round ears, a white brow-and-cheek mask, a three-lobe cheek ruff swept DOWN '
      + 'and out, and the ringed plume. The ruff is the lever: the same fan swept up and back is '
      + 'literally Gnash\'s quills, so which way the fur falls is most of the difference between '
      + 'adorable and attitude. The tail is doing double duty — rust-and-cream banding is what makes '
      + 'the species unmistakable at 24u, AND on a run the rings read as a motion trail, which is how '
      + 'a round body gets to keep a speed cue it would otherwise need spines for.',
    spec: { ...BODY, faceSeed: 0.7, head: 'redpanda', tail: 'bushy' },
    pal: {
      ...face,
      h: '#c65a2c',       // rust coat
      b: '#c65a2c',
      p: '#8e3c1c',       // darker rust: legs, and the ruff's shadow side
      furDark: '#8e3c1c', // tail rings
      f: '#2f3a52',       // navy hi-tops — deliberately NOT Gnash's red
      a: '#f0c07a',
    },
  },
  {
    id: 'anml-fennec',
    name: 'B — FENNEC FOX',
    note: 'The silhouette candidate. The ears are oversized past anatomy on purpose, because at hero '
      + 'size they are the only feature big enough to carry a read on their own — everything the face '
      + 'does is under two pixels. Sand and cream, which is the widest value gap in the row and the '
      + 'easiest to pick out against a dark lane; the risk is the opposite one, that a pale hero goes '
      + 'flat against the sky on the high routes. Brush tail, no rings: this cut is arguing that the '
      + 'ears should be the only thing anyone remembers.',
    spec: { ...BODY, faceSeed: 1.4, head: 'fennec', tail: 'brush' },
    pal: {
      ...face,
      h: '#d9a05b',
      b: '#d9a05b',
      p: '#a8703a',
      furDark: '#a8703a',
      f: '#3f4a63',
      a: '#f0c07a',
    },
  },
  {
    id: 'anml-hare',
    name: 'C — HARE',
    note: 'The only animal in the row whose real anatomy is the speed read, so it is the one cut that '
      + 'does not have to argue for the slot. Long upright blades barely splayed, a stub puff instead '
      + 'of a plume. What it gives up is the tail: nothing trails, so there is no motion cue behind '
      + 'him and the gait has to carry all of it. Watch it in the lane tile rather than at study size '
      + '— a hare standing still and a hare at 24px running are close to two different judgements.',
    spec: { ...BODY, faceSeed: 2.2, head: 'hare', tail: 'stub' },
    pal: {
      ...face,
      h: '#b8a58c',
      b: '#b8a58c',
      p: '#8a7761',
      furDark: '#8a7761',
      f: '#4a5a3e',
      a: '#e8d8b8',
    },
  },
  {
    id: 'anml-stoat',
    name: 'D — STOAT',
    note: 'The fast end, taken as far as the rig allows — and the cut expected to lose. A stoat reads '
      + 'as speed because it is long and low, and long and low is the one thing a biped rig cannot be, '
      + 'so what survives the translation is a small round-eared head with a bandit band and not much '
      + 'else. It is here to put a number on the ceiling: if D still reads faster than A, the problem '
      + 'is the panda\'s proportions and row 2 can fix it; if it does not, the bushy tail is doing more '
      + 'work than the body shape is and A can afford to be rounder still.',
    spec: { ...BODY, faceSeed: 3.1, head: 'stoat', tail: 'taper', slim: true, taper: 0.88 },
    pal: {
      ...face,
      h: '#a8703c',
      b: '#a8703c',
      p: '#6a4423',
      furDark: '#3a2a1e',
      f: '#5a4030',
      a: '#e0c090',
    },
  },
];

// ROW 2 — HOW CUTE. One species, one palette, one costume; only the build dials
// move. Cuteness comes from a big head on short limbs and speed comes from
// length and lean, so these two genuinely fight and this row is where that gets
// priced.
//
// The dials are the rig's own — headScale, tall, legLength, stout/slim, taper
// (drawHumanoid resolves them together). NOT figureScaleX/figureScaleY, which
// drawToon marks gallery-only and no production spec sets: a winner tuned on
// those would not transfer into TOON_SPECS, which would make this row a study
// of something unshippable.
//
// MID is the shipped cast proportion — the same build Gnash and Lorenzo have,
// with only the species changed. It has to be in the row or the other two are
// being judged against nothing, and whichever wins would come out looking like
// it wandered in from a different game the moment it stood next to Lorenzo.

// Exported: the gallery's alternation section and the motion sheets draw the
// settled hero directly and need his palette by name.
export const PANDA_PAL = ANIMAL_HERO_CANDIDATES[0].pal;

export const PANDA_BUILD_CANDIDATES = [
  {
    id: 'anml-panda-chibi',
    name: 'CHIBI — 3 heads',
    note: 'Peak adorable: head up 30%, body and legs down, barrel build. This is the cut that most '
      + 'looks like the reference photographs everyone has in mind. The risk is not that it is ugly, '
      + 'it is that he stops reading as the FAST one — and he has to hold that read against a 1.15 '
      + 'speed multiplier and an invincible dash, or the kit and the body are telling different stories.',
    spec: {
      ...BODY, faceSeed: 0.7, head: 'redpanda', tail: 'bushy',
      headScale: 1.3, tall: 0.86, legLength: 0.8, stout: true,
    },
    pal: PANDA_PAL,
  },
  {
    id: 'anml-panda-mid',
    name: 'MID — cast proportion',
    note: 'The control, and the honest one: the shipped build every other hero has, with nothing '
      + 'touched but the species. Judge the other two against THIS rather than against each other — '
      + 'the question is not which is cutest in isolation, it is which one still belongs in the line-up '
      + 'in the "beside the cast" tile.',
    spec: { ...BODY, faceSeed: 0.7, head: 'redpanda', tail: 'bushy' },
    pal: PANDA_PAL,
  },
  {
    id: 'anml-panda-lean',
    name: 'LEAN — 4.5 heads',
    note: 'Athletic: smaller head, longer legs, waist taken in a seventh. Reads quickest of the three '
      + 'and is the safest fit beside Grumpos — but it spends the exact quality that motivated '
      + 'replacing Gnash in the first place, so if this one wins it is worth asking whether the answer '
      + 'was a different animal rather than a thinner one.',
    spec: {
      ...BODY, faceSeed: 0.7, head: 'redpanda', tail: 'bushy',
      headScale: 0.88, tall: 1.1, legLength: 1.12, slim: true, taper: 0.86,
    },
    pal: PANDA_PAL,
  },
];


// ---------------------------------------------------------------------------
// ROUND 3 — THE FACE. Species and build are settled (red panda, cast
// proportion); what is open is the head. Five cuts, every one the winning body
// with only the face construction moved, so the row answers "which face" and
// nothing else.
//
// The axis this time is HOW the cuteness is made, because there are two
// competing recipes and they do not mix by default:
//
//   - The WHITE-AND-PUPIL eye is the cast's house eye — expressive, browed,
//     reads "character".
//   - MOCHI'S eye — the solid dark oval with a glint, `eyeStyle: 'pika'` — is
//     the anime recipe: bigger, wider-set, browless. It is the single largest
//     cuteness lever the painter owns, and it was built for the one hero whose
//     whole design is "adorable puffball".
//   - BABY SCHEMA is the other recipe: features clustered LOW on a big
//     forehead (eyeLift down, muzzle shrunk). It is why infant faces of every
//     species read cute, and it works with either eye.
//
// F1 is the control. F2 and F3 each take ONE recipe. F4 goes naturalistic
// instead — the real animal's tear-track markings, which nobody remembers red
// pandas have and everybody recognises once drawn. F5 stacks every lever at
// once and is EXPECTED TO OVERSHOOT: it is in the row so the answer has a far
// edge, the same job the stoat did in round 1.

const PANDA_SPEC = { ...BODY, head: 'redpanda', tail: 'bushy' };

export const PANDA_FACE_CANDIDATES = [
  {
    id: 'pface-ascut',
    name: 'F1 — AS CUT',
    note: 'The face that won round 1, unchanged: house eyes with brows, the full mask, the scallop '
      + 'ruff. The control every other cut is judged against.',
    spec: { ...PANDA_SPEC, faceSeed: 0.7 },
    pal: PANDA_PAL,
  },
  {
    id: 'pface-saucer',
    name: 'F2 — SAUCER',
    note: 'Mochi\'s eye on the panda head: solid dark ovals with a glint, wider-set, and browless — '
      + 'pikaEyes is a flag, not a copy, so her blink and her ^ ^ delight come along free. This is the '
      + 'straight answer to "would anime eyes read cuter". What it spends is expression range: no brows '
      + 'means no glare, no focus, no cocky — on a solid eye the glint is the entire gaze.',
    spec: { ...PANDA_SPEC, faceSeed: 1.3, eyeStyle: 'pika' },
    pal: PANDA_PAL,
  },
  {
    id: 'pface-cub',
    name: 'F3 — CUB',
    note: 'Baby schema with the house eye: the whole mask — eyes, markings, muzzle, mouth — dropped '
      + 'down the skull onto a taller forehead, and the muzzle taken in a fifth. This is the recipe '
      + 'that makes infants of every species read cute, and it keeps the brows, so he can still pull '
      + 'every face the cast can. The Fernwick trick, pushed one notch further.',
    spec: { ...PANDA_SPEC, faceSeed: 2.1, eyeLift: -0.035, muzzleScale: 0.8 },
    pal: PANDA_PAL,
  },
  {
    id: 'pface-tracks',
    name: 'F4 — TEAR TRACKS',
    note: 'Naturalistic: the rust streaks a real red panda wears from eye to jaw, drawn down the white '
      + 'cheek patches. Nobody remembers these until they see them, then they read as THE species mark. '
      + 'The bet this cut makes is that specificity is cuter than roundness — that looking like a real '
      + 'red panda beats looking like a plush of one.',
    spec: { ...PANDA_SPEC, faceSeed: 2.8, tearTracks: true },
    pal: PANDA_PAL,
  },
  {
    id: 'pface-moshi',
    name: 'F5 — MOSHI',
    note: 'Every lever at once: saucer eyes, baby schema, shrunk muzzle, blush dots. Expected to '
      + 'overshoot into mascot-costume territory — it is in the row so the answer has a far edge, the '
      + 'job the stoat did in round 1. If it somehow wins, the "focus-grouped mascot" bit just became '
      + 'literal and the persona doc writes itself.',
    spec: {
      ...PANDA_SPEC, faceSeed: 3.6, eyeStyle: 'pika',
      eyeLift: -0.028, muzzleScale: 0.78, blush: true,
    },
    pal: PANDA_PAL,
  },
];


// ---------------------------------------------------------------------------
// ROUND 4 — POINTED EARS AND THE BUTTON SNOUT, from Peter's reference art
// (2 Sep 2026). The verdict on round 3's eye question: the giant anime eyes
// DO NOT fit — the house white-and-pupil eye stays. What the reference showed
// instead: a real red panda's ears are POINTED triangles full of white fluff,
// not discs, and its nose and mouth pack close together low on a small snout.
//
// A ladder rather than a field, Clara A -> A2 -> A3 style: each cut adds ONE
// change to the one before it, so whichever rung wins says exactly which
// changes earned their place.
//
// The dials: `earShape: 'point'` swaps the ellipse ear for the wide-based soft
// triangle (the table default stays round until this round settles);
// `noseTuck` slides the nose down INTO the muzzle while the muzzle stays put,
// and the nose scales with `muzzleScale` so a button snout gets a button nose.

export const PANDA_EAR_CANDIDATES = [
  {
    id: 'pear-round',
    name: 'G1 — ROUND (as cut)',
    note: 'The round 1 winner unchanged: disc ears, nose on top of the snout, mouth on the rig\'s '
      + 'default line. The control.',
    spec: { ...PANDA_SPEC, faceSeed: 0.7 },
    pal: PANDA_PAL,
  },
  {
    id: 'pear-point',
    name: 'G2 — POINTED EARS',
    note: 'One change: the ears. Wide-based soft triangles, tips up-and-out, the cream inner filling '
      + 'most of each the way real ear-fluff does. Everything below the ear line is G1.',
    spec: { ...PANDA_SPEC, faceSeed: 1.3, earShape: 'point' },
    pal: PANDA_PAL,
  },
  {
    id: 'pear-button',
    name: 'G3 — + BUTTON SNOUT',
    note: 'G2 plus the compact lower face: muzzle taken in a fifth, nose tucked a third of the way '
      + 'down into it, mouth raised to sit just under the nose. This is the reference\'s read — the '
      + 'features pack together instead of laddering down the face.',
    spec: {
      ...PANDA_SPEC, faceSeed: 2.1, earShape: 'point',
      muzzleScale: 0.8, noseTuck: 0.35, mouthLift: 0.02,
    },
    pal: PANDA_PAL,
  },
  {
    id: 'pear-cubbed',
    name: 'G4 — + CUB DROP',
    note: 'G3 with round 3\'s baby-schema drop on top: the whole packed face slides down the skull '
      + 'onto a taller forehead. The mouth rides down with it (the lift nets out), so the packing '
      + 'holds. The maximal cut of this ladder — if the forehead reads as too much bare fur, G3 is '
      + 'the answer.',
    spec: {
      ...PANDA_SPEC, faceSeed: 2.8, earShape: 'point',
      muzzleScale: 0.8, noseTuck: 0.35, eyeLift: -0.03, mouthLift: -0.01,
    },
    pal: PANDA_PAL,
  },
];


// ---------------------------------------------------------------------------
// ROUND 5 — THE HEAD SHAPE (2 Sep 2026). G2 won round 4: pointed ears, and
// the standard snout over the button snout — but its cheek scallop still reads
// as Gnash's quills. The diagnosis: it is not the lobes' roundness, it is that
// ANY sideways fan off a round skull reads as quills. So this round moves the
// fluff into the head itself.
//
// New seams: `headShape: 'cheeks'` swaps the circular skull for a round crown
// that flares at the cheekbones and tucks to a soft chin (the blockHead
// precedent — Grumpos already owns a non-circular skull); `ruff` overrides the
// species table per cut ('none', 'tuft' — down-swept jaw fluff — or the
// original 'scallop').

const G2_SPEC = { ...PANDA_SPEC, earShape: 'point' };

export const PANDA_HEAD_CANDIDATES = [
  {
    id: 'phead-ascut',
    name: 'H1 — AS CUT (G2)',
    note: 'Round 4\'s winner unchanged: pointed ears, round skull, sideways scallop ruff. The control '
      + '— and the cut carrying the quill problem this round exists to solve.',
    spec: { ...G2_SPEC, faceSeed: 1.3 },
    pal: PANDA_PAL,
  },
  {
    id: 'phead-clean',
    name: 'H2 — CLEAN',
    note: 'The ruff deleted, nothing added. A plain round head under pointed ears. The floor of the '
      + 'row: if this wins, the fluff was never earning its pixels and every other cut is decoration.',
    spec: { ...G2_SPEC, faceSeed: 2.0, ruff: 'none' },
    pal: PANDA_PAL,
  },
  {
    id: 'phead-cheeks',
    name: 'H3 — WIDE CHEEKS',
    note: 'The head-shape answer: fluff built INTO the skull. A round crown that flares at the '
      + 'cheekbones — widest well below the eye line — and tucks to a soft chin. A bulge in the '
      + 'head\'s own outline reads as a fluffy face; the same area added as separate lobes reads as '
      + 'quills. No ruff pieces at all.',
    spec: { ...G2_SPEC, faceSeed: 2.7, ruff: 'none', headShape: 'cheeks' },
    pal: PANDA_PAL,
  },
  {
    id: 'phead-tufts',
    name: 'H4 — JAW TUFTS',
    note: 'Round skull, but the fluff moved DOWN: two soft tufts per side rooted at the jaw and '
      + 'falling past the chin — neck fluff, not a quill fan. Direction was the tell all along: '
      + 'Gnash\'s quills sweep up and back, so fur that falls reads as anything but him.',
    spec: { ...G2_SPEC, faceSeed: 3.4, ruff: 'tuft' },
    pal: PANDA_PAL,
  },
  {
    id: 'phead-full',
    name: 'H5 — CHEEKS + TUFTS',
    note: 'H3\'s wide-cheek skull with H4\'s falling tufts under it — the full reference read, and '
      + 'the fluffiest legal construction. Watch it at 24px: two soft ideas that both read alone can '
      + 'merge into one shapeless blob together.',
    spec: { ...G2_SPEC, faceSeed: 4.1, ruff: 'tuft', headShape: 'cheeks' },
    pal: PANDA_PAL,
  },
];


// ---------------------------------------------------------------------------
// ROUND 6 — EAR SIZE (2 Sep 2026). H5 took round 5: the wide-cheek skull plus
// the falling jaw tufts — fluff in the silhouette, nothing projecting
// sideways. Open question: Peter wants the pointed ears a touch bigger.
//
// `earSize` on the pointed ear scales the triangle about its BASE midpoint,
// so a bigger ear grows up-and-out while staying rooted on the same patch of
// skull. Same spec key as the shared human ear's dial, on purpose. A short
// ladder around "slightly larger": if the answer is off one end, the dial is
// continuous and the shipping value need not be a rung.

const H5_SPEC = {
  ...PANDA_SPEC, earShape: 'point', ruff: 'tuft', headShape: 'cheeks',
};

export const PANDA_EARSIZE_CANDIDATES = [
  {
    id: 'psize-100',
    name: 'I1 — 1.00 (as cut)',
    note: 'H5 unchanged. The control.',
    spec: { ...H5_SPEC, faceSeed: 0.7 },
    pal: PANDA_PAL,
  },
  {
    id: 'psize-112',
    name: 'I2 — 1.12',
    note: 'The "slightly larger" of the brief, taken literally: enough that the pair reads taller at '
      + 'a glance, not enough to move where the silhouette balances.',
    spec: { ...H5_SPEC, faceSeed: 1.4, earSize: 1.12 },
    pal: PANDA_PAL,
  },
  {
    id: 'psize-125',
    name: 'I3 — 1.25',
    note: 'A quarter up. The ears start competing with the tail for second-biggest shape on him — '
      + 'which may be exactly right: the fennec row showed ears carry a silhouette at hero size '
      + 'better than any other feature.',
    spec: { ...H5_SPEC, faceSeed: 2.2, earSize: 1.25 },
    pal: PANDA_PAL,
  },
  {
    id: 'psize-140',
    name: 'I4 — 1.40',
    note: 'The far edge. At this size the ears are the first thing read in every pose, and the risk '
      + 'is drift: a red panda with fennec ears is a fox again, and the fox lost round 1 off-canvas.',
    spec: { ...H5_SPEC, faceSeed: 3.0, earSize: 1.4 },
    pal: PANDA_PAL,
  },
];


// ---------------------------------------------------------------------------
// ROUND 7 — EAR SEATING (2 Sep 2026). Round 6's sizes all shared a fault Peter
// caught: the ears stood too straight and did not look attached.
//
// Both were the same bug. The pointed ear's three corners were placed BY HAND,
// which put the outer base corner at 1.06R — outboard of the skull, so nothing
// cropped it and the ear sat ON the head rather than growing out of it (and
// earSize scaled that corner further out: 1.17R at 1.40). It also left the
// ear's outer edge running x 1.0 -> 0.94, dead vertical, which is the "straight
// up" read.
//
// The ear is now built FROM the skull instead: its base midpoint sits on a
// circle of radius 0.8R with the corners along that circle's tangent, which
// lands both at 0.89-0.93R — inside the head at every size, always cropped —
// and the ear points RADIALLY outward from its root, so it cannot read as
// vertical. `earAngle` is where on the crown it roots, in radians off
// vertical, and it is now the only thing this round varies.

export const PANDA_EARSEAT_CANDIDATES = [
  {
    id: 'pseat-050',
    name: 'J1 — 0.50 rad (29 deg)',
    note: 'Rooted high on the crown, close to upright. The nearest of the four to the old look, but '
      + 'attached properly — worth having as the control for "was it only ever the seating?"',
    spec: { ...H5_SPEC, faceSeed: 0.7, earSize: 1.25, earAngle: 0.5 },
    pal: PANDA_PAL,
  },
  {
    id: 'pseat-062',
    name: 'J2 — 0.62 rad (36 deg)',
    note: 'The new default. Roots on the shoulder of the crown and stands out at about 44 degrees '
      + 'once the tip lean is added — angled without splaying.',
    spec: { ...H5_SPEC, faceSeed: 1.4, earSize: 1.25, earAngle: 0.62 },
    pal: PANDA_PAL,
  },
  {
    id: 'pseat-075',
    name: 'J3 — 0.75 rad (43 deg)',
    note: 'Rooted lower and wider. The gap between the pair opens across the top of the head, which '
      + 'is the real animal\'s proportion — its ears sit well apart, not side by side on the crown.',
    spec: { ...H5_SPEC, faceSeed: 2.2, earSize: 1.25, earAngle: 0.75 },
    pal: PANDA_PAL,
  },
  {
    id: 'pseat-090',
    name: 'J4 — 0.90 rad (52 deg)',
    note: 'The far edge: rooted almost at the temple, splayed wide. Watch the tips against the tail '
      + 'in the run tile and the ear-to-eye distance in the HUD crop — past here the ears stop '
      + 'reading as being on TOP of the head at all.',
    spec: { ...H5_SPEC, faceSeed: 3.0, earSize: 1.25, earAngle: 0.9 },
    pal: PANDA_PAL,
  },
];


// ---------------------------------------------------------------------------
// ROUND 8 — THE ANGLE x SIZE GRID (2 Sep 2026). Round 7 narrowed the seating
// to somewhere between J2 (0.62 rad) and J3 (0.75), and the ask is to try
// larger ears at the same time.
//
// Two variables, so this is a GRID and not a ladder: four angles across the
// J2-J3 span, three sizes from round 7's held 1.25 upward. Twelve cuts is a
// lot, but the alternative — settling the angle at one size and then the size
// at one angle — assumes the two do not interact, and they plainly do: a
// bigger ear rooted at the same angle reaches further outboard, so the wider
// roots need less size to splay and the narrow roots can carry more.
//
// Both dials stay continuous. The winner is a POINT ON THE GRID to steer by,
// not necessarily a rung — name any pair and it becomes the spec.
//
// Generated rather than hand-written: twelve near-identical literals is where
// a transcription slip hides, and the note is per-axis anyway.

const EARSEAT_ANGLES = [0.62, 0.66, 0.7, 0.75];
const EARSEAT_SIZES = [1.25, 1.35, 1.45];

export const PANDA_EARGRID_CANDIDATES = EARSEAT_SIZES.flatMap((size, si) =>
  EARSEAT_ANGLES.map((angle, ai) => ({
    id: `pgrid-${String(size).replace('.', '')}-${String(angle).replace('.', '')}`,
    name: `K${si + 1}${ai + 1} — ${size.toFixed(2)} @ ${angle.toFixed(2)}`,
    note: `Ear size ${size.toFixed(2)}, rooted ${(angle * 180 / Math.PI).toFixed(0)} degrees off `
      + `vertical.${size === 1.25 ? ' Round 7\'s size, as the row\'s control.' : ''}`
      + `${angle === 0.62 ? ' J2\'s angle.' : angle === 0.75 ? ' J3\'s angle.' : ' Between J2 and J3.'}`,
    // faceSeed spread across the grid so no two cuts blink together — an
    // unregistered id has no seed of its own and comes out eyes-shut.
    spec: { ...H5_SPEC, faceSeed: 0.5 + si * 1.7 + ai * 0.37, earSize: size, earAngle: angle },
    pal: PANDA_PAL,
  })));


// ---------------------------------------------------------------------------
// ROUND 9 — EAR WIDTH (2 Sep 2026). Round 8's grid pointed at a bigger ear,
// but the ask that came back was WIDER AT THE BASE, not longer.
//
// Those were one dial until now: `earSize` drove the half-width (as sqrt) and
// the length together, so there was no way to ask for a broad stubby ear. They
// are split — `earWidth` widens the base alone — and the distinction turns out
// to be the species line itself: a red panda's ear is broad-based and short, a
// fox's is narrow-based and long. Round 1 lost the fox on a naming problem;
// this is where the panda stops being able to drift back into one.
//
// The painter had to change to allow it. A wider base cannot just be wider —
// the corners sit at sqrt(rootR^2 + halfW^2), and past 0.6 halfW that escapes
// R and the ear detaches exactly the way the hand-placed version did in round
// 7. So the ear now ROOTS DEEPER as it widens, rootR solved to hold the
// corners on a 0.95R circle. A broad ear sitting lower on the head is also
// what the reference shows, so the constraint and the drawing agree.
//
// Held at angle 0.68 (between round 7's J2 and J3) and size 1.35 throughout,
// so only the base width moves. L4 is the exception and the interesting one:
// wide AND shortened, the read furthest from a fox.

export const PANDA_EARWIDTH_CANDIDATES = [
  {
    id: 'pwide-100',
    name: 'L1 — 1.00 (as cut)',
    note: 'Round 8\'s ear at the midpoint angle. The control — nothing about the base has moved yet.',
    spec: { ...H5_SPEC, faceSeed: 0.7, earSize: 1.35, earAngle: 0.68, earWidth: 1 },
    pal: PANDA_PAL,
  },
  {
    id: 'pwide-118',
    name: 'L2 — 1.18 wide',
    note: 'Base out by a fifth, length untouched. The ear roots a little deeper to keep its corners '
      + 'inside the skull, which reads as the ear sitting INTO the head rather than on it — the same '
      + 'quality round 7 was chasing, arriving here for free.',
    spec: { ...H5_SPEC, faceSeed: 1.4, earSize: 1.35, earAngle: 0.68, earWidth: 1.18 },
    pal: PANDA_PAL,
  },
  {
    id: 'pwide-135',
    name: 'L3 — 1.35 wide',
    note: 'A third wider at the base. The triangle is now clearly broader than it is tall above the '
      + 'root, which is the real animal\'s proportion. Watch the gap between the pair across the '
      + 'crown — a wide base eats it faster than a wide ANGLE does.',
    spec: { ...H5_SPEC, faceSeed: 2.2, earSize: 1.35, earAngle: 0.68, earWidth: 1.35 },
    pal: PANDA_PAL,
  },
  {
    id: 'pwide-short',
    name: 'L4 — 1.35 wide, shorter',
    note: 'L3 with the length pulled back to 1.15 — broad and STUBBY, the read furthest from a fox '
      + 'and the one that is hardest to mistake for anything but a red panda. If wide-at-the-base was '
      + 'the instinct, this is that instinct taken all the way: the width is doing the work and the '
      + 'length has stopped competing with it.',
    spec: { ...H5_SPEC, faceSeed: 3.0, earSize: 1.15, earAngle: 0.68, earWidth: 1.35 },
    pal: PANDA_PAL,
  },
];


// ---------------------------------------------------------------------------
// THE LOOK IS SETTLED (2 Sep 2026). L4 won: broad-based, shortened, pointed
// ears on the wide-cheek skull. Nine rounds, and the whole record is above.
// What each round decided, in order:
//
//   1  SPECIES   red panda. The fennec was runner-up on silhouette and lost
//                off-canvas: Sonic 2 ships a fox sidekick, so a fox in the
//                speedster slot is more on the nose than the hedgehog it
//                replaces. The stoat proved the ceiling on "darting" — a long
//                low body is what a biped rig cannot be.
//   2  BUILD     MID, the shipped cast proportion. Not the giant head, not the
//                slim cut.
//   3  EYES      the house white-and-pupil eye. Mochi's saucer eye was tried
//                and rejected: it does not fit this cast, and it costs the
//                brows every other expression is built on.
//   4  EARS      pointed, from reference art. The button snout and the cub
//                drop both lost.
//   5  CHEEKS    the wide-cheek SKULL plus falling jaw tufts. The sideways
//                scallop is retired for good — any fan projecting sideways off
//                a round skull reads as Gnash's quills, whatever its lobes.
//   6  SIZE      void; judged on a broken ear (see 7).
//   7  SEATING   the ear is built FROM the skull — base midpoint on a circle,
//                corners along its tangent, tip pointing radially outward.
//                The hand-placed version put the outer corner at 1.06R,
//                outboard of the head, which is why the ears looked stuck on
//                and stood straight up.
//   8  ANGLE     ~0.68 rad, between J2 and J3.
//   9  WIDTH     broad base, shortened length. Width and length were one dial
//                and are now two, because that is the species line: a red
//                panda's ear is broad and short, a fox's is narrow and long.
//
// This is the spec that ships. It stays here, in dev, until it has a NAME and
// a KIT — those are the two open questions, and a hero cannot enter HEROES
// without both. On the way in it becomes TOON_SPECS.<id>, its palette becomes
// HERO_SPRITES.<id> (palette ONLY — no pixel grid), and this file keeps only a
// tombstone pointing at docs/notes/<name>-persona.md.

export const PANDA_SETTLED = {
  spec: {
    rig: 'humanoid', head: 'redpanda', mouth: 'smile',
    headShape: 'cheeks', ruff: 'tuft',
    earShape: 'point', earSize: 1.15, earAngle: 0.68, earWidth: 1.35,
    tail: 'bushy', armDepth: true, limbStyle: 'snap', hands: true, gloves: true,
    faceSeed: 3,
  },
  pal: PANDA_PAL,
};


// ---------------------------------------------------------------------------
// ROUND 11 — THE BROWS (2 Sep 2026). From reference art again. The complaint:
// his brow marks are not distinct, they are part of one white patch AROUND the
// eyes.
//
// That is exactly what the geometry was doing. The brow teardrop sat at -0.30R
// and the cheek patch at +0.26R with a 0.30R radius, so the two touched just
// under the eye and merged into a single white field with an eye floating in
// it. No amount of restyling the brow alone fixes that — the cheek has to get
// out of the way. So the marks are three independent dials now (browMark,
// cheekPatch, eyePatch) and the row moves them together.
//
// The reference's own construction is worth naming, because it inverts ours:
// there the DARK is the mask — a dark patch around each eye — and the small
// white spots read against that dark rather than against rust fur. That is N3,
// and it is the only cut here where the brow spot has real contrast behind it.

const RUSTY_FACE = PANDA_SETTLED.spec;

// ROUND 12 — the brow SHAPE. N3's construction won (dark eye patch, white
// spots on it) but the spots read as circles rather than brows. A brow is
// WIDER THAN TALL; at 0.17 x 0.15 R that mark was 1.13:1, which is a dot. The
// spot now takes an explicit aspect from `browSquash` (the ry multiplier), so
// the row can flatten it without moving anything else.
export const RUSTY_BROW_CANDIDATES = [
  {
    id: 'nbrow-ascut',
    name: 'N1 — AS CUT',
    note: 'The settled face. Teardrop brow, wide cheek patch — and the two touching under the eye, '
      + 'which is the thing being fixed. The control.',
    spec: { ...RUSTY_FACE, faceSeed: 0.7 },
    pal: PANDA_PAL,
  },
  {
    id: 'nbrow-spot',
    name: 'N2 — SPOT + LOW CHEEK',
    note: 'The minimum change that actually works: the brow becomes a small round dot placed high, '
      + 'and the cheek patch drops clear of the eye. Fur now shows BETWEEN the two, which is the only '
      + 'reason a brow reads as a brow rather than as the top of a patch.',
    spec: { ...RUSTY_FACE, faceSeed: 1.4, browMark: 'spot', cheekPatch: 'low' },
    pal: PANDA_PAL,
  },
  {
    id: 'nbrow-ref',
    name: 'N3 — REFERENCE (dark mask)',
    note: 'The reference\'s own construction, inverted from ours: a DARK patch around each eye, with '
      + 'the small white spots read against that dark instead of against rust. The only cut where the '
      + 'brow has real contrast behind it — and the one that most looks like the photo everyone has '
      + 'in mind. Watch it at 24px: dark-on-rust is a narrower value gap than white-on-rust.',
    spec: { ...RUSTY_FACE, faceSeed: 2.2, browMark: 'spot', cheekPatch: 'low', eyePatch: true },
    pal: PANDA_PAL,
  },
  {
    id: 'nbrow-bar',
    name: 'N4 — BARS',
    note: 'Short angled bars instead of dots. The most eyebrow-LIKE mark, and the only one whose '
      + 'slope could carry an expression — but it competes with the rig\'s real ink brows, which are '
      + 'drawn on top of it whenever he is annoyed or focused. Two brows on one face is the risk.',
    spec: { ...RUSTY_FACE, faceSeed: 2.9, browMark: 'bar', cheekPatch: 'low' },
    pal: PANDA_PAL,
  },
  {
    id: 'nbrow-none',
    name: 'N5 — BROWS ONLY',
    note: 'The cheek patch deleted outright, brow spots alone on the coat. The cleanest face in the '
      + 'row and the least red-panda — it gives up the marking that made the species obvious in round '
      + '1. Here as the floor: if it wins, the cheek patch was doing nothing.',
    spec: { ...RUSTY_FACE, faceSeed: 3.6, browMark: 'spot', cheekPatch: 'none' },
    pal: PANDA_PAL,
  },
];


const RUSTY_N3 = {
  ...PANDA_SETTLED.spec, browMark: 'spot', cheekPatch: 'low', eyePatch: true,
};

export const RUSTY_BROWSHAPE_CANDIDATES = [
  {
    id: 'obrow-round',
    name: 'O1 — ROUND (N3 as cut)',
    note: 'N3 unchanged: 0.17 x 0.15R, an aspect of 1.13:1. That is a dot, and the row exists '
      + 'because a dot is not a brow.',
    spec: { ...RUSTY_N3, faceSeed: 0.7 },
    pal: PANDA_PAL,
  },
  {
    id: 'obrow-070',
    name: 'O2 — squash 0.70',
    note: 'Wider than tall at about 1.6:1, and wider overall so flattening does not also shrink it. '
      + 'The first rung where the mark has a long axis, which is the whole of what makes a shape read '
      + 'as a brow rather than as a spot.',
    spec: { ...RUSTY_N3, faceSeed: 1.4, browSquash: 0.7 },
    pal: PANDA_PAL,
  },
  {
    id: 'obrow-052',
    name: 'O3 — squash 0.52',
    note: 'About 2.2:1 — a rounded lozenge. Still soft at the ends (nothing here is a hard bar), but '
      + 'unmistakably horizontal.',
    spec: { ...RUSTY_N3, faceSeed: 2.2, browSquash: 0.52 },
    pal: PANDA_PAL,
  },
  {
    id: 'obrow-038',
    name: 'O4 — squash 0.38',
    note: 'About 3:1, the far edge. Watch the HUD crop rather than the figure: at 44px a mark this '
      + 'thin is close to the ink brows the rig draws over it, and two horizontal lines above one eye '
      + 'is the failure this round can produce.',
    spec: { ...RUSTY_N3, faceSeed: 3.0, browSquash: 0.38 },
    pal: PANDA_PAL,
  },
  {
    id: 'obrow-tilt',
    name: 'O5 — squash 0.52, tilted',
    note: 'O3 with the pair tilted down toward the nose. A brow that is not level reads as an '
      + 'EXPRESSION rather than a marking — worth seeing once, but the risk is that a permanently '
      + 'sceptical face fights every pose he is in.',
    spec: { ...RUSTY_N3, faceSeed: 3.8, browSquash: 0.52, browTilt: 0.3 },
    pal: PANDA_PAL,
  },
];

// ---------------------------------------------------------------------------
// ROUND 14 — BROW ANGLE (2 Sep 2026). O2 won round 12: squash 0.70, about
// 1.6:1. Held there; only the tilt moves.
//
// `browTilt` rotates each mark by side * tilt, so the pair stays mirrored.
// Which way it leans is the whole read, and the two directions are opposite
// characters: inner end DOWN is a furrow (determined, cross), inner end UP is
// a plea (worried, hopeful). A level brow is a MARKING and reads as anatomy; a
// tilted one is an EXPRESSION and reads as a mood he is permanently in — that
// is the risk on every rung below except Q1, because it plays under every pose
// and every real ink brow the rig draws on top.

const RUSTY_O2 = {
  ...PANDA_SETTLED.spec,
  browMark: 'spot', cheekPatch: 'low', eyePatch: true, browSquash: 0.7,
};

export const RUSTY_BROWANGLE_CANDIDATES = [
  {
    id: 'qbrow-level',
    name: 'Q1 — LEVEL (O2 as cut)',
    note: 'No tilt. The mark is anatomy, not mood — it says red panda and stays out of the way of '
      + 'whatever the face is actually doing. The control, and the safe answer.',
    spec: { ...RUSTY_O2, faceSeed: 0.7 },
    pal: PANDA_PAL,
  },
  {
    id: 'qbrow-up14',
    name: 'Q2 — 0.14 up-and-out',
    note: 'Outer ends lifted a touch. Barely a mood — it opens the face slightly, the way a raised '
      + 'brow does, without committing to an expression. The gentlest thing that is not Q1.',
    spec: { ...RUSTY_O2, faceSeed: 1.4, browTilt: -0.14 },
    pal: PANDA_PAL,
  },
  {
    id: 'qbrow-up28',
    name: 'Q3 — 0.28 up-and-out',
    note: 'The plea: inner ends high, outer ends dropped. Reads hopeful and a bit anxious — which is '
      + 'arguably RUSTY\'s whole bit, a mascot who needs you to like him. The most characterful cut '
      + 'and the one most likely to wear thin.',
    spec: { ...RUSTY_O2, faceSeed: 2.2, browTilt: -0.28 },
    pal: PANDA_PAL,
  },
  {
    id: 'qbrow-dn18',
    name: 'Q4 — 0.18 down-and-in',
    note: 'The other direction: inner ends dropped toward the nose. A light furrow — determined '
      + 'rather than cross at this angle. It fights the rig\'s own ink brows hardest, because both '
      + 'now slope the same way and can read as one thick brow.',
    spec: { ...RUSTY_O2, faceSeed: 2.9, browTilt: 0.18 },
    pal: PANDA_PAL,
  },
  {
    id: 'qbrow-dn34',
    name: 'Q5 — 0.34 down-and-in',
    note: 'The far edge of the furrow. Permanently cross — worth seeing so the row has a limit, but '
      + 'this is Gnash\'s register rather than his, and giving it away was half the point of '
      + 'replacing him.',
    spec: { ...RUSTY_O2, faceSeed: 3.6, browTilt: 0.34 },
    pal: PANDA_PAL,
  },
];

// ---------------------------------------------------------------------------
// ROUND 15 — SNOUT SIZE. `muzzleScale` shrinks or grows the snout about its
// TOP edge, where the nose sits, so the nose does not float off it — that
// anchoring is why the dial exists rather than a plain radius. The nose scales
// with the muzzle, so a button snout gets a button nose.
//
// What is actually being traded: the muzzle is the pale mass in the middle of
// the face, so its size sets how much CREAM there is against the rust, and the
// distance from eyes to nose. A small snout reads younger (that is the baby
// schema again, arriving through a different door); a large one reads more
// like the animal and less like a mascot.

export const RUSTY_SNOUT_CANDIDATES = [0.75, 0.88, 1, 1.14, 1.3].map((m, i) => ({
  id: `rsnout-${String(m).replace('.', '')}`,
  name: `R${i + 1} — muzzle ${m.toFixed(2)}`,
  note: m === 1
    ? 'The settled snout. The control — judge the others against this, not against each other.'
    : m < 1
      ? `Snout in by ${Math.round((1 - m) * 100)}%. Less cream in the middle of the face and a `
        + 'shorter eye-to-nose distance, which is the baby-schema read arriving through a different '
        + 'door than round 3 used. Watch that the muzzle does not shrink inside the white cheek '
        + 'patches and leave the nose sitting on a field of them.'
      : `Snout out by ${Math.round((m - 1) * 100)}%. More animal, less mascot: a longer lower face `
        + 'reads older and closer to the reference photographs. Watch the muzzle against the jaw '
        + 'tufts — grown far enough it reaches them and the whole lower face becomes one pale shape.',
  spec: { ...RUSTY_O2, faceSeed: 0.5 + i * 1.3, browTilt: 0, muzzleScale: m },
  pal: PANDA_PAL,
}));


// ---------------------------------------------------------------------------
// ROUND 16 — MOUTH HEIGHT (2 Sep 2026). Snout settled at 0.90; the mouth needs
// to come up on it.
//
// `mouthLift` is the rig's own per-face dial, in u, subtracted from the mouth's
// skull-ratio position (Kiko carries 0.014 for the same reason — a short lower
// face is what makes a chibi read young). Nothing new is needed for this; the
// only reason it looks wrong today is that Rusty has never set it.
//
// Where the marks actually sit, so the rungs mean something: at muzzle 0.90 the
// snout spans roughly 0.06R to 0.78R below the head centre and its own centre
// is at about 0.42R. The mouth's default lands at 0.52R — BELOW the middle of
// the snout, which is what reads as a long droopy lower face. A lift of 0.022u
// is about 0.105R and puts it on the snout's centre line.

const RUSTY_SNOUT_09 = { ...RUSTY_O2, browTilt: 0, muzzleScale: 0.9 };

export const RUSTY_MOUTH_CANDIDATES = [0, 0.015, 0.028, 0.042, 0.055].map((m, i) => ({
  id: `smouth-${String(m).replace('.', '')}`,
  name: m === 0 ? 'S1 — 0 (as cut)' : `S${i + 1} — lift ${m.toFixed(3)}u`,
  note: m === 0
    ? 'The rig default, which is what looks wrong: the mouth lands at about 0.52R, below the middle '
      + 'of a snout whose centre is at 0.42R. That gap is the droop.'
    : `Up ${(m / 0.21).toFixed(2)}R. `
      + (m <= 0.015
        ? 'The smallest move that closes the gap at all — worth having so the row has a floor.'
        : m <= 0.028
          ? 'Lands the mouth on the snout\'s own centre line, which is where a muzzle\'s mouth '
            + 'belongs. The rung to beat.'
          : m <= 0.042
            ? 'Above centre: the lower face gets short and the read goes young. Watch the gap to the '
              + 'nose — the two can start to touch.'
            : 'The far edge. Mouth crowded under the nose and most of the snout empty below it, '
              + 'which trades one imbalance for the opposite one.'),
  spec: { ...RUSTY_SNOUT_09, faceSeed: 0.6 + i * 1.4, mouthLift: m },
  pal: PANDA_PAL,
}));


// ---------------------------------------------------------------------------
// ROUND 17 — EXPRESSIVE BROWS + the centred nose (2 Sep 2026).
//
// TWO FIXES AND ONE NEW IDEA.
//
// THE NOSE WAS OFF CENTRE, and it was a real bug rather than a taste call.
// drawEyes and drawMouth are both called at `hx + 0.01 * u` — the rig carries
// the whole face a hair ahead of the skull so a runner reads as looking where
// he is going — but the animal marks were built on plain `hx`. That put the
// muzzle, the nose and the entire mask about 0.048R LEFT of the eyes and mouth
// they belong to. Everything on the face now shares one centre line; the
// skull, ears and ruff stay on hx, because they are the head rather than the
// face, which is the split the rig already makes.
//
// THE BROW MARKS ARE NOW HIS EYEBROWS. Every other hero gets a hairline ink
// stroke painted over the brow when a mood calls for one — but on a face that
// already carries two white marks in exactly that place, a third horizontal
// line is one brow too many. So the marks take the expression themselves and
// `brow: 'none'` stops the ink pair being drawn at all.
//
// On which direction is CUDDLY, since that was the question: inner ends UP is
// the soft read — open, appealing, faintly worried — and inner ends DOWN is
// the furrow. Cuddliness lives entirely on the up side, and neutral reads as
// anatomy rather than mood. So his resting range is neutral-to-up and the
// furrow is reserved for moods that earn it. The mapping:
//
//     annoyed / hmph / gruff   +0.34  furrow, and dropped a touch
//     focus (running, sliding) +0.18  a light furrow — he is concentrating
//     surprise / browRaise     -0.30  up and lifted, the open face
//     joy / cheer              -0.22  up, softer than surprise
//     everything else            0    level: a marking, not a mood
//
// The marks also RISE on the open moods and DROP on the furrow, because a brow
// that only rotates in place reads as a dial rather than as a face.
//
// T1 vs T2 is the question this round actually asks: is the expressive brow
// better than a fixed one? T3 is the control that proves the ink brow had to
// go.

const RUSTY_R16 = {
  ...RUSTY_O2, browTilt: 0, muzzleScale: 0.9, mouthLift: 0.028,
};

export const RUSTY_EXPRESSIVE_CANDIDATES = [
  {
    id: 'texp-live',
    name: 'T1 — EXPRESSIVE (ink brow off)',
    note: 'The marks carry the mood and the rig draws no ink brow. Look across the poses rather than '
      + 'at any one: idle is level, run is a light focus furrow, jump is the open surprised face, '
      + 'celebrate is the soft joy tilt. One vocabulary, four readings.',
    spec: { ...RUSTY_R16, brow: 'none', faceSeed: 0.7 },
    pal: PANDA_PAL,
  },
  {
    id: 'texp-fixed',
    name: 'T2 — FIXED LEVEL (ink brow off)',
    note: 'The same face with the marks frozen level — no ink brow either. This is the honest '
      + 'comparison: if T1 does not beat this clearly across the poses, the expression system is '
      + 'costing complexity for nothing and a plain marking is the better answer.',
    spec: { ...RUSTY_R16, brow: 'none', browExpressive: false, faceSeed: 1.5 },
    pal: PANDA_PAL,
  },
  {
    id: 'texp-ink',
    name: 'T3 — INK BROW ON (was)',
    note: 'What he had: white marks AND the rig\'s ink brow stroked over them whenever a mood fires. '
      + 'The control, and the reason for the change — watch the run and slide columns, where two '
      + 'horizontal lines stack above each eye.',
    spec: { ...RUSTY_R16, browExpressive: false, faceSeed: 2.3 },
    pal: PANDA_PAL,
  },
];


// ---------------------------------------------------------------------------
// ROUND 18 — THE OPEN-MOOD BROW: how high, and which way (2 Sep 2026).
//
// T1 won round 17, so the marks carry the expression. Open question: on joy
// and surprise should they sit HIGHER, and should they angle in or out?
//
// A grid, because those are two variables and they interact — a steeply
// angled brow already reads as "raised" at its high end, so it needs less lift
// than a level one to say the same thing. Held identical: everything else on
// the face, and the furrow moods, which are not what this round is about.
//
// ON THE SIGN — established by RENDERING it, not by reading the rotation, and
// worth writing down because it was got backwards once already. The mark is
// rotated by `side * tilt`, mirrored across the face, and canvas y points down,
// which is where the intuition fails.
//
//   tilt NEGATIVE  outer ends UP, inner ends DOWN toward the nose.
//                  That is the STERN direction — determined, intense.
//   tilt POSITIVE  inner ends UP, outer ends DOWN.
//                  That is the SOFT direction — surprised, pleading, open.
//
// Which matters more than a label, because T1 currently ships NEGATIVE on
// surprise and joy: the open moods are wearing the stern brow. If the cuddly
// read is wanted on those, the sign has to flip.
//
// Rise is in R. 0.06 is what T1 ships; 0.16 is roughly a third of the way from
// the brow's resting line to the crown, which is about as far as it can go
// before it detaches from the eye it belongs to and reads as a mark on the
// forehead instead.

// THE FACE AS IT STANDS (2 Sep 2026): T1's expressive brows on the settled
// snout and mouth, ink brow off. Exported so the motion sheets and the
// eventual TOON_SPECS hand-off read one definition rather than re-deriving it.
export const RUSTY_T1 = {
  ...RUSTY_R16, brow: 'none', faceSeed: 0.7,
  // Arms flung wide on the big beat. An unregistered id used to fall through
  // to 'hop' — fists overhead, tight together — with no seam to ask for
  // anything else; `celebrate` on the spec is that seam. The body still bounds
  // (spread keeps hop's motion), only the arms change.
  celebrate: 'spread',
  // He CARRIES his weapon. The ranged move is thrown and caught (the axe's
  // cycle), so the stick is in his near hand in every pose but the throw
  // itself — which is what answers where an endless supply comes from: there
  // is no supply, there is one stick.
  stick: true,
};

const OPEN_TILTS = [-0.3, 0, 0.3];
const OPEN_RISES = [0.06, 0.16];

export const RUSTY_OPENBROW_CANDIDATES = OPEN_RISES.flatMap((rise, ri) =>
  OPEN_TILTS.map((tilt, ti) => ({
    id: `uopen-${ri}${ti}`,
    name: `U${ri + 1}${ti + 1} — rise ${rise.toFixed(2)}, tilt ${tilt.toFixed(2)}`,
    note: `${rise === 0.06 ? 'T1\'s rise' : 'lifted'}, `
      + (tilt < 0 ? 'outer ends UP (the plea / wince)'
        : tilt > 0 ? 'inner ends UP (the "oh")'
          : 'level — the rise alone carries it'),
    spec: { ...RUSTY_T1, faceSeed: 0.6 + ri * 2.1 + ti * 0.7, browOpenRise: rise, browOpenTilt: tilt },
    pal: PANDA_PAL,
  })));


// ---------------------------------------------------------------------------
// ROUND 20 — WHERE THE BAMBOO LIVES (5 Sep 2026). The carried cane answered
// "where does an endless supply come from" by making the supply one stick he
// owns. Peter's better answer: he wears a BUNDLE and pulls one out, which is
// exactly what Fernwick does with the quiver — `back: 'quiver'` plus the
// arrows standing in it, so the ammunition visibly has a source.
//
// It also buys a beat the carried version never had. Reaching back for a cane
// IS the wind-up, so the throw stops needing an abstract cock-and-whip and
// starts explaining itself: hand to the hip, cane out, throw.
//
// Two questions, so two things vary and the row is read as a grid of one:
//   WHERE  `bundle` — 'back' (high behind the shoulder, Fernwick's placement),
//          'hip' (on the back of the belt), 'sling' (low, on a cross-strap).
//   WHETHER he also keeps one in hand at rest (`stick`), or goes empty-handed
//          until he draws — which is the real difference in feel, and the
//          reason the row is not just three positions.

const RUSTY_BUNDLE_BASE = { ...RUSTY_T1, stick: false };

export const RUSTY_BUNDLE_CANDIDATES = [
  {
    id: 'vbun-quiver',
    name: 'W1 — QUIVER',
    note: 'Fernwick\'s construction, borrowed straight: a tube worn high behind the shoulder with the '
      + 'canes STANDING UP out of it. Upright is the whole trick — a quiver reads as stowed because '
      + 'every arrow crosses the mouth on the same line; canes at a lean read as spilling.',
    spec: { ...RUSTY_BUNDLE_BASE, bundle: 'quiver' },
    pal: PANDA_PAL,
  },
  {
    id: 'vbun-belt',
    name: 'W2 — TOOL BELT + POUCH',
    note: 'A band across the hips with the tube hung on it. The belt is doing real work: a pouch with '
      + 'nothing holding it up reads as stuck to his side, and one strap is the difference between kit '
      + 'and a sticker. Shortest draw of the three — the hand falls straight onto it.',
    spec: { ...RUSTY_BUNDLE_BASE, bundle: 'belt' },
    pal: PANDA_PAL,
  },
  {
    id: 'vbun-dispenser',
    name: 'W3 — BELT DISPENSER',
    note: 'The same belt, tube canted back off the hip like a holster, so the canes present their ends '
      + 'toward the drawing hand rather than straight up. Most tool-like of the three and the most '
      + 'compact against the body; the cant is the one thing here that is not upright, and it is the '
      + 'tube, never the canes.',
    spec: { ...RUSTY_BUNDLE_BASE, bundle: 'dispenser' },
    pal: PANDA_PAL,
  },
  {
    id: 'vbun-tilt',
    name: 'W3b — BELT, SLIGHT ANGLE',
    note: 'Between W2 upright and W3 fully canted: the tube tilted about half as far. Upright is the '
      + 'tidiest and the cant is the most tool-like, so this is the reading that keeps the canes '
      + 'presenting toward the hand without the pouch looking like it is sliding off the belt.',
    spec: { ...RUSTY_BUNDLE_BASE, bundle: 'tilt' },
    pal: PANDA_PAL,
  },
  {
    id: 'vbun-pack',
    name: 'W4 — BACKPACK',
    note: 'A pack square on his back with the canes standing out of the top, and — the part that '
      + 'makes it read — SHOULDER STRAPS crossing the chest with a sternum band. The pack is a '
      + 'back-pass piece and the straps a front-pass one, because a pack whose straps are hidden '
      + 'behind the torso is just a box floating behind a hero. Biggest silhouette change of the four.',
    spec: { ...RUSTY_BUNDLE_BASE, bundle: 'backpack' },
    pal: PANDA_PAL,
  },
  {
    id: 'vbun-none',
    name: 'W5 — NO BAG (carried cane)',
    note: 'The control: no bag at all, one cane carried, as it stands today. Worth keeping in the row '
      + 'so the bag has to EARN its place in the silhouette rather than just answering a question '
      + 'nobody sees while playing.',
    spec: { ...RUSTY_T1 },
    pal: PANDA_PAL,
  },
];


// ---------------------------------------------------------------------------
// ROUND 20 SETTLED (6 Sep 2026): W3b — the tool belt on the waist with the
// canister slung on the left hip, tube canted a little, canes along its axis,
// drawn body / leg / pouch / arm / hand. The quiver, the upright pouch, the
// full cant, the backpack and the no-bag control all lost to it.
// ROUNDS 10 AND 13 ARE GONE (6 Sep 2026): the three-way ranged-move and the
// three launch gestures (overarm / flick / tail fling) were superseded by the
// pouch. There is ONE throw now — reach, pull, whip, through, drawn from the
// canister with the alternating cane — and it lives in toons.js under
// `throwQ`, not in a candidate list.
export const RUSTY_W3B = {
  ...RUSTY_T1, stick: false, bundle: 'tilt',
  // ROUND 21 SETTLED (6 Sep 2026): X3 — two canes, gapped and STAGGERED. The
  // stagger is what sells two separate sticks; the pair stays parallel to the
  // bag. And it turned into a mechanic: the long and short canes ALTERNATE
  // slots every throw, the thrown piece is the one he pulled (right-hand slot,
  // always), and the projectile is sized to match via caneScale(parity). The
  // pouch is stateful — it visibly changes after every throw.
  canes: { n: 2, gap: 0.045, stagger: 0.03 },
  // ROUNDS 22-24 SETTLED (7 Sep 2026): Z2c — a triangular head with the cheek
  // patch back up past its pre-taper size. Three dials, one face:
  //   faceTrim 0.2   the lower face narrowed a little — flare, jaw and tufts
  //   faceTaper 0.35 the WIDTH moved up to the temples, so the mass reads at
  //                  the cheekbones instead of hanging at the jaw. This is the
  //                  one that answered "his head looks bigger than everyone's",
  //                  which measurement had already shown was false: at one
  //                  figure height his head is 149x132 against Lorenzo's
  //                  153x140 and Gnash's 152x148, and he carries no headScale.
  //                  It was never size, it was where the width sat.
  //   cheekScale 1.05 the white patch a touch FULLER than it started, because
  //                  a tapered jaw under the original patch read as bony.
  // Stronger tapers (0.6+) were real options and lost: past halfway the ears
  // take over the silhouette and he starts reading fox. Fuller cheeks (1.15+)
  // lost to the jaw tufts, which they crowd.
  faceTrim: 0.2, faceTaper: 0.35, cheekScale: 1.05,
};

// ROUND 21 — THE CANES IN THE MOUTH. On W3b the two canes read as ONE THICK
// CANE: 0.032u apart and each about 0.03u wide, they touch along their whole
// length and fuse. Every cut here is W3b with only `canes` changed — what
// separates two sticks into two is the question, and there are four honest
// answers plus a control.
export const RUSTY_CANE_CANDIDATES = [
  {
    id: 'xcane-ascut',
    name: 'X1 — AS CUT',
    note: 'Two canes at 0.032u, touching. The control, and the thing being fixed.',
    spec: { ...RUSTY_W3B, faceSeed: 0.7, canes: { n: 2, gap: 0.032 } },
    pal: PANDA_PAL,
  },
  {
    id: 'xcane-gap',
    name: 'X2 — GAPPED',
    note: 'Spacing opened to 0.05u so a sliver of tube shows between the shafts. The smallest change '
      + 'that works: two things with a visible seam between them are two things.',
    spec: { ...RUSTY_W3B, faceSeed: 1.4, canes: { n: 2, gap: 0.05 } },
    pal: PANDA_PAL,
  },
  {
    id: 'xcane-stagger',
    name: 'X3 — STAGGERED',
    note: 'Same spacing as X2, one cane standing 0.03u taller. The tops no longer line up, which is '
      + 'what a bunch of anything actually looks like — nobody cuts two canes to the same length.',
    spec: { ...RUSTY_W3B, faceSeed: 2.1, canes: { n: 2, gap: 0.045, stagger: 0.03 } },
    pal: PANDA_PAL,
  },
  {
    id: 'xcane-splay',
    name: 'X4 — SPLAYED',
    note: 'Bases bunched in the tube, tips fanned by a few degrees each. Still along the bag\'s axis '
      + 'on average, but the pair diverges toward the top — the way canes lean apart in a holder '
      + 'that is wider at the mouth than they are.',
    spec: { ...RUSTY_W3B, faceSeed: 2.8, canes: { n: 2, gap: 0.03, splay: 0.11 } },
    pal: PANDA_PAL,
  },
  {
    id: 'xcane-thin3',
    name: 'X5 — THREE, THINNER',
    note: 'Three canes at a smaller scale with gaps between. More sticks, less bulk: the bundle reads '
      + 'as a bundle because you can count it. The risk is that the thinner canes stop matching the '
      + 'one he throws.',
    spec: { ...RUSTY_W3B, faceSeed: 3.5, canes: { n: 3, gap: 0.036, size: 66, stagger: 0.02 } },
    pal: PANDA_PAL,
  },
];

// ---------------------------------------------------------------------------
// ROUNDS 22, 23 AND 24 ARE GONE (7 Sep 2026): the face trim (Y), the triangular
// head (Z) and the cheek size (Z2a-e) all settled into RUSTY_W3B above as
// faceTrim / faceTaper / cheekScale. The dials stay in toons.js — they are how
// the shape is expressed, and every other animal head still reads 0 for all
// three. The candidate rows do not: once a question is decided the section
// comes out and the painter keeps the answer.
//
// One fix rode in with them and is NOT a dial: the chin now leans onto the
// FACE axis. The rig centres the face on hx + 0.01u while the skull, ears and
// ruff stay on hx; a round jaw hid that, and a tapered one pointed straight at
// it. toons.js ramps the lean by depth — nothing at the temples, full at the
// chin apex.
