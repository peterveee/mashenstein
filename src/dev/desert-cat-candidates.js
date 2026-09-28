// SPEED ZONE — a desert cat for the bruiser's slot (bake-off, gallery-only, 28 Sep 2026).
//
// Peter, 28 Sep 2026: "could we bake off a new dog style similar to the existing ones but
// relevant for a desert, like a cougar or bobcat? the style should be the lane style, NOT
// MCM...". The bruiser dog (dogBruiser, sprites/dogs.js) is Speed Zone's closer: it
// charges the hero at vx -38 on a keyed eight-frame gallop. These are big cats for that
// slot, drawn in the LANE hand — the clean-line kennel, not the mid-century backdrop.
//
// NOTHING HERE IS WIRED INTO THE GAME. Card 0 is the shipped bruiser through its real
// painter (the close-up) and the real drawWorldEntity (the lane).
//
// THE KENNEL'S RULES, KEPT. Every take is the dogs' own construction (sprites/dogs.js
// header): ONE silhouette stroked once at twice the line and then filled, so the only
// ink is the outside of the animal; the far legs and far ear a second, darker silhouette
// behind; two flat tones and the animal's own markings clipped inside. The rig is the
// dogs' rig — the keyed rotary gallop through a periodic Catmull-Rom, two-bone IK with a
// fixed bend side — reshaped for a cat: a longer, lower body whose back ROUNDS as it
// gathers (the spine is where a cat's stride comes from), a high rump on longer hinds,
// a small round head with no stop, a whisker pad, big round paws, and the tail.
//
// DROP-IN SIZE. Each take obeys the painter contract of DOG_PAINTERS — (ctx, w, h,
// frame), eight frames, authored facing right and mirrored so it runs LEFT at the hero —
// and is fitted, as the dogs are, so the union of its ink over all eight frames fills
// the bruiser's art box (15x10 box, TALL 1.0, VISUAL 1.16, detail 2). The lane cards
// rasterize it exactly as propSprite does, so a winner could take the bruiser's place
// with no hitbox, footprint or table changed (the fps is the one number a take may ask
// to move, listed on each card).
//
// Deterministic: every pose is a function of the frame index (or t) only.
import { GROUND_Y, ZOOM, VIEW_W, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { CABINETS } from '../data/cabinets.js';
import { drawWorldEntity, HERO_DRAW_H } from '../game/draw.js';
import { makeObstacle } from '../game/entities.js';
import { PLAYER_X } from '../game/player.js';
import { drawToon } from '../sprites/toons.js';
import { DOG_PAINTERS } from '../sprites/dogs.js';
import { BOBCAT_RIG, paintBobcat } from '../sprites/bobcat.js';
import { drawSoftContactShadow } from '../engine/shadows.js';

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const FRAMES = 8;
const SS = 8;                                   // props.js rasterize() supersample

// The bruiser's slot (game/entities.js dogBruiser, sprites/animals.js tables).
const SLOT = { box: [15, 10], tall: 1.0, vis: 1.16, detail: 2, fps: 18 };

// THE RIG LIVES IN sprites/bobcat.js (28 Sep 2026): the shipped bobcat is this lab's
// L2, so the gait, the IK, the path helpers and every part the takes share are imported
// from there — the lab and the game draw with the same code. What stays here is only
// what the losing takes need on top: the cougars' round ears and rope tail, round 1's
// legs, bob and coat, the bounder's gait, and the measuring pass.
const {
  GAIT, LINE, MOUTH, capsule, smoothClosed, P2, pt, bez, ribbon,
  pose, torsoPath, neckPath, headPaths, ruffPath, silhouette, coatBands, bodyAt, face,
} = BOBCAT_RIG;

// --------------------------------------------------------------- the gallop
// The dogs' keyed rotary gallop (sprites/dogs.js GAIT): k0 extended flight, k1 fore
// lead lands, k2 fores carry, k3 fores push, k4 GATHERED flight, k5 hinds land, k6
// hinds carry, k7 hinds drive off. The cats run the same keys; what makes it a cat is
// in the breed numbers below — more spine flex (the back rounds hard at k4 and flattens
// long at k0), a steadier head, and for the bounders the far legs paired with the near.
// The half-bound (D): both hinds come down together and drive together, the fores
// land one after the other, and the whole cat rocks — nose down landing on the fores,
// rump down landing on the hinds — with a real hang in the gathered flight.
const BOUND = {
  ...GAIT,
  foreY: [0.34, 0.00, 0.00, 0.06, 0.55, 0.72, 0.62, 0.48],
  hindY: [0.40, 0.62, 0.70, 0.52, 0.26, 0.00, 0.00, 0.06],
  lift: [0.22, 0.02, -0.08, 0.02, 0.24, 0.02, -0.07, 0.06],
  pitch: [0.02, -0.10, -0.15, -0.05, 0.06, 0.13, 0.08, 0.04],
};

// ------------------------------------------------------------------- the cats
// World units, facing right, ground at y 0, like the dogs' BREEDS (the painter fits
// each to the slot). The dogs' keys where they mean the same thing, plus:
//   hipUp   the rump carried higher than the withers (a cat's hinds are longer)
//   hindK   hind leg length over the fore's
//   flexK   how much the spine shortens gathered; flexArch how far the back rounds
//   low     the body carried nearer the road (fraction of L)
//   liftK / pitchK / nodK   the bounce, the rock and the head's nod, against the dogs'
//   pairF / pairH   phase lag of the far fore / far hind (the dogs' 0.085; small = paired)
//   earBack the ears pinned back (0 up .. 1 flat), gape0/gapeK the mouth
//   tail    'rope' (cougar), 'bob' (bobcat); tailUp lifts the rope's J, tailLen its reach
const CATS = {
  cougar: {
    L: 7.2, spine: 9.0, cx: -0.4, chestUp: 2.45, chestDown: 2.65, chestRx: 2.6,
    rumpUp: 2.2, rumpDown: 1.8, rumpRx: 2.3, tuck: 0.75, pouch: 0.35, arch: 0.05, flexArch: 1.3,
    hipUp: 0.45, hindK: 1.08, flexK: 0.18, stride: 1.0,
    neckLen: 2.9, neckAng: -24, neckW: 2.9, headR: 2.0, muzzle: 1.25, muzzleH: 1.7,
    ear: 'round', earLen: 1.5, earBack: 0.35, tail: 'rope', tailLen: 7.8, tailUp: 1.0, tailW: 1.0,
    legW: [2.1, 1.15, 0.92], pawR: 0.95, teeth: 1.0, gape0: 0.0, gapeK: 1.0, nodK: 0.45,
    pal: {
      coat: '#c98c4e', far: '#8c5a2e', shade: '#a8713b', saddle: '#b37a41',
      mark: '#f6ead4', markShade: '#dcc9aa', dark: '#2b1d18', ear: '#4a3226',
      nose: '#b8645a', eye: '#f2b632',
    },
    marks: 'cougar',
  },
  bobcat: {
    L: 6.2, spine: 7.6, cx: -0.5, chestUp: 2.35, chestDown: 2.5, chestRx: 2.55,
    rumpUp: 2.45, rumpDown: 2.0, rumpRx: 2.5, tuck: 0.6, pouch: 0.25, arch: 0.15, flexArch: 1.1,
    hipUp: 0.55, hindK: 1.12, flexK: 0.16, stride: 1.0,
    neckLen: 2.5, neckAng: -30, neckW: 3.0, headR: 2.15, muzzle: 1.05, muzzleH: 1.7,
    ear: 'tufted', earLen: 1.95, earBack: 0.15, tail: 'bob', ruff: 1,
    legW: [2.0, 1.15, 0.92], pawR: 0.92, teeth: 1.0, gape0: 0.0, gapeK: 1.0, nodK: 0.5,
    pal: {
      coat: '#c29a68', far: '#7e6043', shade: '#a07c52', saddle: '#b08758',
      mark: '#f7f0e2', markShade: '#ddd1bb', dark: '#211712', ear: '#2a1d16',
      spot: '#4e3322', nose: '#c06e62', eye: '#e8c43c',
    },
    marks: 'bobcat',
  },
};
// The variations: each is a cat above with a few numbers changed (and its own gait).
const VARIANTS = {
  cougar: CATS.cougar,
  bobcat: CATS.bobcat,
  // C: the stalker. Belly skimming the road, head held under the line of the back,
  // ears pinned, tail straight out low: one long flat stride, all reach, no bounce.
  cougarLow: {
    ...CATS.cougar, low: 0.2, liftK: 0.35, pitchK: 0.6, nodK: 0.2, stride: 1.06,
    neckAng: 4, neckLen: 3.0, flexArch: 1.0, earBack: 0.95, tailUp: -0.25, tailLen: 7.4,
    gape0: 0.18, gapeK: 0.55, tilt0: 0.1,
  },
  // D: the bounder. The bobcat's half-bound: hinds paired, a big hang in the air, the
  // back balling up; hissing wide, the bob tail up.
  bobcatBound: {
    ...CATS.bobcat, gait: BOUND, pairH: 0.012, pairF: 0.05, flexK: 0.22, flexArch: 1.7,
    liftK: 1.0, pitchK: 1.0, gape0: 0.35, gapeK: 0.65, earBack: 0.6, tailCock: 1,
  },
  // E: the old tom. A heavier cougar with a bigger head, ears flat back and the mouth
  // held wide all cycle; a cooler, dustier coat so he stands off the warm road.
  cougarTom: {
    ...CATS.cougar, spine: 8.8, chestUp: 2.65, chestDown: 2.85, chestRx: 2.85, neckW: 3.3,
    headR: 2.3, muzzle: 1.35, muzzleH: 1.95, legW: [2.3, 1.28, 1.0], pawR: 1.08,
    earBack: 1.0, gape0: 0.6, gapeK: 0.4, teeth: 1.25, tailLen: 7.4,
    pal: {
      coat: '#a88464', far: '#6a4f3a', shade: '#8a6a4e', saddle: '#8e6c50',
      mark: '#f2e8da', markShade: '#d6c8b4', dark: '#261a16', ear: '#3a2a22',
      nose: '#a85a52', eye: '#f4c030',
    },
  },
  // F: the red cougar. A's cat in a deeper rust coat with a heavier dark face, to see
  // whether colour alone is what makes him pop off the sand.
  cougarRed: {
    ...CATS.cougar, heavyFace: 1,
    pal: {
      coat: '#b8683a', far: '#743c1e', shade: '#94522c', saddle: '#9e5a30',
      mark: '#f8ecd8', markShade: '#e0cbad', dark: '#22140f', ear: '#2c1a14',
      nose: '#a8544a', eye: '#f4c030',
    },
  },
};

// ROUND 2 (28 Sep 2026): Peter, "i like B, can we refine him further and have some
// variations on body shape to be a bit sleeker". B+ is B redrawn (rev 2: the shank,
// paws, coat, throat, facial lines and bob — now sprites/bobcat.js's parts) with a
// back that rounds harder as he gathers. S1–S5 are B+ in five sleeker bodies; the face
// and markings are B+'s throughout, so the cards compare body shape only.
const BOB2 = { ...CATS.bobcat, rev: 2, flexArch: 1.6, flexK: 0.18 };
Object.assign(VARIANTS, {
  bobcat2: BOB2,
  // S1 LEAN: a longer barrel, a shallower chest, the waist tucked up under the loin.
  bobLean: {
    ...BOB2, spine: 9.4, chestUp: 2.1, chestDown: 2.15, chestRx: 2.25, rumpUp: 2.15, rumpDown: 1.5, rumpRx: 2.15,
    tuck: 1.45, pouch: 0, neckW: 2.55, legW: [1.75, 0.98, 0.84], spotK: 0.9, belly: 0.65,
  },
  // S2 LEGGY: up on longer legs, a longer reach and a touch more hang — cursorial.
  bobLeggy: {
    ...BOB2, L: 7.9, spine: 8.2, chestUp: 2.15, chestDown: 2.25, chestRx: 2.35, rumpUp: 2.25, rumpDown: 1.7,
    tuck: 1.1, pouch: 0.08, neckW: 2.7, legW: [1.7, 0.92, 0.78], pawR: 0.84, stride: 1.06, liftK: 1.1, spotK: 0.9,
  },
  // S3 STREAK: long and low and flat out — the body stretched along the road, head
  // thrust forward on the line of the back, ears half back, the stride all reach.
  bobStreak: {
    ...BOB2, spine: 9.6, low: 0.12, chestUp: 2.15, chestDown: 2.2, chestRx: 2.35, rumpUp: 2.2, rumpDown: 1.65,
    tuck: 1.0, pouch: 0.1, hipUp: 0.35, neckAng: -12, neckLen: 2.7, neckW: 2.7, earBack: 0.55,
    stride: 1.18, liftK: 0.55, pitchK: 0.6, flexK: 0.22, flexArch: 1.25, bobAng: -2.55, legW: [1.8, 1.0, 0.85], spotK: 0.9,
  },
  // S4 SMALL HEAD: B+'s frame slimmed, with a head a size smaller for the body — the
  // proportions of the real animal rather than the kennel's.
  bobSmallHead: {
    ...BOB2, spine: 8.4, chestUp: 2.2, chestDown: 2.25, chestRx: 2.35, rumpUp: 2.3, rumpDown: 1.75, tuck: 0.95,
    pouch: 0.12, headR: 1.62, muzzle: 0.85, muzzleH: 1.35, earLen: 1.6, neckLen: 2.85, neckW: 2.4,
    legW: [1.8, 1.02, 0.86], spotK: 0.9,
  },
  // S5 LONGER BOB: sleek like S1 but less drawn-in, with a longer bob carried out behind.
  bobLongTail: {
    ...BOB2, spine: 8.5, chestUp: 2.2, chestDown: 2.3, chestRx: 2.4, rumpUp: 2.3, rumpDown: 1.75, tuck: 0.95,
    pouch: 0.14, neckW: 2.75, legW: [1.85, 1.05, 0.88], bobLen: 3.9, bobAng: -2.65, spotK: 0.94,
  },
});

// ------------------------------------------------------------------ the parts
// The pose, the path helpers, torso, neck, head, ruff, coat bands, silhouette and face
// are sprites/bobcat.js's (BOBCAT_RIG). The parts below branch for the takes that did
// not ship; every round-2/3 bobcat (rev 2) is drawn by the shipped part.
function legPath(lg, B, k) {
  if (B.rev === 2) return BOBCAT_RIG.legPath(lg, B, k);
  const [w0, w1, w2] = B.legW.map((v) => v * k * 0.5);
  const pr = B.pawR * k;
  const p = new Path2D();
  const { root, mid, low, foot } = lg;
  if (lg.fore) {
    // A cat's forearm is heavy all the way to a thick wrist: it holds its prey with it.
    capsule(p, root.x, root.y, mid.x, mid.y, w0 * 1.3, w1 * 1.12);
    capsule(p, mid.x, mid.y, low.x, low.y, w1 * 1.12, w2 * 1.0);
    capsule(p, low.x, low.y, foot.x, foot.y, w2 * 1.0, w2 * 0.9);
  } else {
    capsule(p, root.x, root.y + w0 * 0.3, mid.x, mid.y, w0 * 1.45, w1 * 1.2);
    capsule(p, mid.x, mid.y, low.x, low.y, w1 * 1.05, w2 * 0.8);
    capsule(p, low.x, low.y, foot.x, foot.y, w2 * 0.8, w2 * 0.82);
  }
  // Round paws — bigger and rounder than a dog's, toes forward.
  const a = Math.atan2(foot.y - low.y, foot.x - low.x);
  const px = foot.x + Math.cos(a) * pr * 0.15 + pr * 0.3, py = foot.y - pr * 0.3;
  p.moveTo(px + pr, py);
  // Wound the same way as the capsules, or the nonzero fill punches the paw out
  // where it overlaps the leg and it reads as a ring.
  p.ellipse(px, py, pr, pr * 0.72, 0, TAU, 0, true);
  return p;
}


// The ears: the bobcat's tall tufted ones are the shipped part; the cougars' are round,
// dark-backed and untufted. `earBack` pins them flat, rotating the ear back about its base.
function earPath(B, P, far) {
  if (B.ear !== 'round') return BOBCAT_RIG.earPath(B, P, far);
  const R = P.headR, L = B.earLen * (far ? 0.92 : 1);
  const E = BOBCAT_RIG.earFrame(B, P, far);
  const p = new Path2D();
  smoothClosed(p, [E(R * 0.42, R * 0.2), E(R * 0.22, -L * 0.72), E(-L * 0.1, -L * 1.0),
    E(-L * 0.5, -L * 0.7), E(-R * 0.4, R * 0.25)], 0.95);
  return p;
}
function earDetail(ctx, B, P, path, far) {
  if (B.ear === 'tufted') { BOBCAT_RIG.earDetail(ctx, B, P, path, far); return; }
  const pal = B.pal;
  const R = P.headR, L = B.earLen * (far ? 0.92 : 1);
  const E = BOBCAT_RIG.earFrame(B, P, far);
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = far ? 'rgba(20,12,10,0.55)' : pal.ear;
  ctx.beginPath();
  const a = E(R * 0.5, -L * 0.3), b = E(-L * 0.2, -L * 1.3), c = E(-L * 0.8, -L * 0.5);
  ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(b.x, b.y, c.x, c.y);
  const d = E(-L * 0.2, -L * 0.42);
  ctx.quadraticCurveTo(d.x, d.y - 0.1, a.x, a.y);
  ctx.fill();
  ctx.restore();
}

// The tails. A cougar's is the length of its body and heavy to the end: it streams
// out low behind the charge and curls UP into a J at the dark tip, swinging once a
// stride as the counterweight. A bobcat's is a bob, cocked up, black on top at the tip.
function tailSpec(B, P) {
  const { Hp } = P;
  const t0 = pt(Hp.x - B.rumpRx * 0.8, Hp.y - B.rumpUp * 0.5);
  const sw = P.swing;
  if (B.tail === 'rope') {
    const Lt = B.tailLen, up = B.tailUp;
    // Down off the rump, back, and hooked up: the J keeps the reach behind short.
    const pts = bez(t0,
      pt(t0.x - Lt * 0.3, t0.y + 1.5 - up * 0.1 + sw * 0.35),
      pt(t0.x - Lt * 0.7, t0.y + 1.6 - up * 0.7 + sw * 0.7),
      pt(t0.x - Lt * 0.56, t0.y - 0.4 - up * 2.2 + sw * 1.0), 14);
    return { pts, w0: 1.35, w1: 0.95 * (B.tailW || 1) };
  }
  // Round 2's bob (rev 2) is the shipped part.
  if (B.rev === 2) return BOBCAT_RIG.tailSpec(B, P);
  // Round 1's bob: short and cocked, higher when bounding
  const a = (-2.15 - (B.tailCock ? 0.45 : 0) + sw * 0.12);
  const pts = bez(t0, pt(t0.x - 0.8, t0.y - 0.2), pt(t0.x + Math.cos(a) * 1.6, t0.y + Math.sin(a) * 1.6),
    pt(t0.x + Math.cos(a) * 2.5, t0.y + Math.sin(a) * 2.5), 6);
  return { pts, w0: 1.35, w1: 1.05 };
}
function tailPath(B, P) {
  const s = tailSpec(B, P);
  return P2((p) => ribbon(p, s.pts, s.w0, s.w1));
}

// Round 1's bobcat spots, as (s, v, size): scattered, bigger and blotchier on the flank.
const SPOTS = [
  [0.08, 0.22, 0.34], [0.2, 0.45, 0.42], [0.1, 0.62, 0.36], [0.3, 0.2, 0.3], [0.36, 0.52, 0.44],
  [0.26, 0.78, 0.34], [0.48, 0.3, 0.36], [0.55, 0.6, 0.42], [0.44, 0.84, 0.3], [0.66, 0.36, 0.34],
  [0.74, 0.62, 0.38], [0.84, 0.3, 0.3], [0.9, 0.55, 0.32], [0.62, 0.12, 0.26], [0.18, 0.05, 0.26],
];

function markings(ctx, B, P, hd, parts, nearLegs, torso, neck, ruff) {
  const { T, J, R, noseX, lipY, mh, M } = hd;
  const pal = B.pal;
  const clipTo = (paths, fn) => {
    ctx.save();
    const c = new Path2D(); for (const q of paths) c.addPath(q);
    ctx.clip(c); fn(); ctx.restore();
  };
  const skull = parts.find((q) => q.id === 'skull').path;
  const jaw = parts.find((q) => q.id === 'jaw').path;
  const tail = parts.find((q) => q.id === 'tail').path;
  const fillP = (col, fn) => { ctx.fillStyle = col; ctx.beginPath(); fn(ctx); ctx.fill(); };

  // The pale throat, running down into the chest's pale band. Round 2's (rev 2) is the
  // shipped soft oval; round 1's wedge read as a napkin with a corner.
  if (B.rev === 2) BOBCAT_RIG.throatBib(ctx, B, P, torso, neck);
  else clipTo([neck, torso], () => {
    const a = pt(P.S.x + B.chestRx * 0.7, P.S.y + 0.6), b = pt(P.Hc.x + 0.2, P.Hc.y + P.headR * 0.75);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const nx = Math.sin(ang), ny = -Math.cos(ang);
    const w = B.neckW * 0.32;
    const m = pt((a.x + b.x) / 2 - nx * w * 0.55, (a.y + b.y) / 2 - ny * w * 0.55);
    fillP(pal.markShade, (c) => smoothClosed(c, [pt(a.x - nx * w * 0.2, a.y - ny * w * 0.2), m, pt(b.x - nx * w * 0.6, b.y - ny * w * 0.6),
      pt(b.x + nx * 2, b.y + ny * 2), pt(a.x + nx * 3, a.y + ny * 3), pt(P.S.x - 1.2, P.S.y + B.chestDown + 1)], 0.8));
  });
  // Muzzle, chin and the lip line pale; the spots over and under the eye. (The shipped
  // bobcat's copy of this is sprites/bobcat.js muzzleMarks, without the red cougar's
  // heavier face.)
  clipTo([skull, jaw], () => {
    fillP(pal.mark, (c) => smoothClosed(c, [T(R * 0.7, -R * 0.12), T(noseX - 0.1, -R * 0.06), T(noseX + 0.3, lipY + 0.2),
      T(noseX, lipY + 2.5), T(R * 0.0, R * 1.2), T(-R * 0.3, R * 0.62), T(R * 0.4, R * 0.22)], 0.7));
    ctx.fillStyle = pal.mark;
    ctx.beginPath(); const a = T(R * 0.52, -R * 0.62); ctx.ellipse(a.x, a.y, R * 0.2, R * 0.1, P.tilt - 0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); const b = T(R * 0.3, -R * 0.02); ctx.ellipse(b.x, b.y, R * 0.24, R * 0.12, P.tilt - 0.2, 0, TAU); ctx.fill();
    // THE MOUSTACHE: the dark patch at the back of the whisker pad that is the whole of
    // a cougar's face — and the bobcat's cheek bars start from the same place.
    const heavy = B.heavyFace ? 1.25 : 1;
    fillP(pal.dark, (c) => smoothClosed(c, [T(R * 0.78, -R * 0.02), T(R * 1.02, R * 0.06),
      T(noseX - M * 0.35, lipY + 0.1), T(noseX - M * 0.55, lipY + 0.42 * heavy), T(R * 0.55, lipY + 0.35 * heavy)], 0.8));
    // The chin's dark edge on the jaw, under the lip.
    const j0 = J(R * 0.45, lipY + mh * 0.18), j1 = J(noseX - M * 0.55, lipY + mh * 0.2);
    ctx.strokeStyle = pal.dark; ctx.lineWidth = 0.28 * heavy;
    ctx.beginPath(); ctx.moveTo(j0.x, j0.y); ctx.lineTo(j1.x, j1.y); ctx.stroke();
  });
  if (B.marks === 'bobcat' && B.rev === 2) {
    BOBCAT_RIG.bobcatCoat(ctx, B, P, hd, parts, nearLegs, torso, neck, ruff);
  } else if (B.marks === 'bobcat') {
    // Spots over the body, the neck and the near legs; black bars on the forearm.
    clipTo([torso], () => {
      for (const [s, v, r] of SPOTS) {
        const q = bodyAt(B, P, s, v);
        fillP(pal.spot, (c) => c.ellipse(q.x, q.y, r * 1.25, r * 0.8, -P.pitch + (s - 0.5) * 0.4, 0, TAU));
      }
    });
    clipTo([neck], () => {
      for (const [a, b] of [[0.35, -0.4], [0.55, 0.3], [0.2, 0.6]]) {
        const q = pt(lerp(P.S.x, P.Hc.x, a) + b * 0.6, lerp(P.S.y, P.Hc.y, a) + b);
        fillP(pal.spot, (c) => c.ellipse(q.x, q.y, 0.34, 0.26, 0, 0, TAU));
      }
    });
    const [nearHind, nearFore] = nearLegs;
    clipTo([nearFore], () => {
      const lg = P.fore;
      ctx.strokeStyle = pal.dark; ctx.lineWidth = 0.42;
      // Across the back of the forearm, just under the elbow: not over the chest.
      const a = Math.atan2(lg.low.y - lg.mid.y, lg.low.x - lg.mid.x) + Math.PI / 2;
      for (const k of [0.2, 0.45]) {
        const x = lerp(lg.mid.x, lg.low.x, k), y = lerp(lg.mid.y, lg.low.y, k);
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x - Math.cos(a) * 0.9, y - Math.sin(a) * 0.9); ctx.stroke();
      }
    });
    clipTo([nearHind], () => {
      const lg = P.hind;
      for (const [k, o] of [[0.3, 0.3], [0.65, -0.3], [0.5, 0.9]]) {
        const x = lerp(lg.root.x, lg.mid.x, k) + o * 0.5, y = lerp(lg.root.y, lg.mid.y, k) + o;
        fillP(pal.spot, (c) => c.ellipse(x, y, 0.4, 0.3, 0.3, 0, TAU));
      }
    });
    // Cheek bars on the ruff.
    if (ruff) {
      clipTo([ruff, skull], () => {
        ctx.strokeStyle = pal.dark; ctx.lineWidth = 0.22;
        for (const [a, b] of [[0.28, 0.1], [0.42, 0.32]]) {
          const s0 = T(R * a, R * b), s1 = T(-R * 0.35, R * (b + 0.22)), s2 = T(-R * 0.95, R * (b + 0.55));
          ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.quadraticCurveTo(s1.x, s1.y, s2.x, s2.y); ctx.stroke();
        }
      });
    }
    // The bob's black top at the tip, white under.
    clipTo([tail], () => {
      const s = tailSpec(B, P), e = s.pts[s.pts.length - 1];
      fillP(pal.markShade, (c) => c.ellipse(e.x + 0.55, e.y + 0.75, 0.8, 0.5, 0.6, 0, TAU));
      fillP(pal.dark, (c) => c.ellipse(e.x - 0.3, e.y - 0.35, 0.9, 0.7, 0.6, 0, TAU));
    });
  } else {
    // The cougar's black tail tip.
    clipTo([tail], () => {
      const s = tailSpec(B, P), e = s.pts[s.pts.length - 1];
      fillP(pal.dark, (c) => c.arc(e.x, e.y, 1.65, 0, TAU));
    });
  }
}

// One cat at `phase` (0..1), in world units, FACING LEFT, feet on y 0.
// `core`: fill only the head and body (torso, neck, ruff, skull, jaw) in one flat tone,
// ink included — for measuring the collision box a bigger cat would need (round 3).
function paintCat(ctx, B, phase, core = false) {
  const P = pose(B, phase);
  const pal = B.pal;
  ctx.save();
  ctx.scale(-1, 1);          // authored facing right; obstacles face left
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // The far pair and the far ear: their own darker silhouette, behind.
  const farEar = earPath(B, P, true);
  const back = [P.hindFar, P.foreFar].map((lg) => ({ path: legPath(lg, B, 0.9), fill: pal.far }));
  back.push({ path: farEar, fill: pal.far });
  silhouette(ctx, back);
  earDetail(ctx, B, P, farEar, true);
  // The near silhouette.
  const parts = [];
  const tail = tailPath(B, P);
  parts.push({ path: tail, fill: pal.coat, id: 'tail' });
  const torso = torsoPath(B, P);
  parts.push({ path: torso, fill: pal.coat, id: 'torso' });
  const neck = neckPath(B, P);
  parts.push({ path: neck, fill: pal.coat, id: 'neck' });
  const hd = headPaths(B, P);
  const ruff = B.ruff ? ruffPath(B, P, hd) : null;
  if (ruff) parts.push({ path: ruff, fill: pal.coat, id: 'ruff' });
  parts.push({ path: hd.mouth, fill: MOUTH, id: 'mouth' });
  parts.push({ path: hd.jaw, fill: pal.coat, id: 'jaw' });
  parts.push({ path: hd.skull, fill: pal.coat, id: 'skull' });
  if (core) {
    const all = new Path2D();
    for (const q of parts) if (q.id !== 'tail' && q.id !== 'mouth') all.addPath(q.path);
    ctx.strokeStyle = '#000'; ctx.lineWidth = LINE * 2; ctx.stroke(all);
    ctx.fillStyle = '#000'; ctx.fill(all);
    ctx.restore();
    return;
  }
  const nearLegs = [P.hind, P.fore].map((lg) => legPath(lg, B, 1));
  for (const lp of nearLegs) parts.push({ path: lp, fill: pal.coat, id: 'leg' });
  const nearEar = earPath(B, P, false);
  parts.push({ path: nearEar, fill: pal.coat, id: 'ear' });
  silhouette(ctx, parts);
  coatBands(ctx, torso, pal, B, P);
  markings(ctx, B, P, hd, parts, nearLegs, torso, neck, ruff);
  face(ctx, B, P, hd);
  earDetail(ctx, B, P, nearEar, false);
  ctx.restore();
}

// ------------------------------------------------------------------- the fit
// The union of a cat's ink over all eight frames (after the mirror), measured once
// off an unclipped render — the dogs' DOG_BOUNDS, measured live — and the painter
// that seats it in a w x h box, feet on the floor.
const bounds = new Map();
function catBounds(id, core = false) {
  const key = core ? id + '|core' : id;
  let b = bounds.get(key);
  if (b) return b;
  const PX = 8, CW = 640, CH = 360, OX = 320, OY = 330;
  const c = document.createElement('canvas');
  c.width = CW; c.height = CH;
  const g = c.getContext('2d', { willReadFrequently: true });
  for (let f = 0; f < FRAMES; f++) {
    g.setTransform(PX, 0, 0, PX, OX, OY);
    paintCat(g, VARIANTS[id], f / FRAMES, core);
  }
  const d = g.getImageData(0, 0, CW, CH).data;
  let x0 = CW, x1 = 0, y0 = CH;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    if (d[(y * CW + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
  }
  b = { minX: (x0 - OX) / PX, maxX: (x1 + 1 - OX) / PX, minY: (y0 - OY) / PX };
  bounds.set(key, b);
  return b;
}
// Exported for re-measuring, as the dogs' DOG_BOUNDS were off dogFitInfo: a winner
// ships with its measured bounds baked in, like the dogs.
export { catBounds as desertCatBounds };

// The DOG_PAINTERS contract: (ctx, w, h, frame), fitted to the box.
function painter(id) {
  return (ctx, w, h, frame = 0) => {
    const b = catBounds(id);
    const k = Math.min((w * 0.97) / (b.maxX - b.minX), (h * 0.975) / -b.minY);
    ctx.save();
    ctx.translate(w / 2, h);
    ctx.scale(k, k);
    ctx.translate(-(b.minX + b.maxX) / 2, 0);
    paintCat(ctx, VARIANTS[id], (frame % FRAMES) / FRAMES);
    ctx.restore();
  };
}

// ---------------------------------------------------------------- candidates
export const DESERT_CAT_CANDIDATES = [
  { id: '0', name: 'NOW — the bruiser dog', control: true, fps: 18,
    paint: DOG_PAINTERS.dogBruiser,
    note: 'The shipped dogBruiser (sprites/dogs.js), the control: the slot every cat below is fitted to — 15x10 box, drawn 1.16x, 18 fps.' },
  { id: 'A', name: 'COUGAR', fps: 16, paint: painter('cougar'),
    note: 'The mountain lion: long and low, plain tawny with a darker back and pale belly, a small round head with round dark-backed ears, the white muzzle and black moustache, and a body-length rope tail that trails low and curls up into a black tip. Rotary gallop with the back rounding as it gathers; the fangs bare on the stride. 16 fps.' },
  { id: 'B', name: 'BOBCAT', fps: 18, paint: painter('bobcat'),
    note: 'Stockier and higher at the rump, on longer hinds: tall pointed ears with black tufts, a flared cheek ruff with dark bars, a spotted buff coat with black bars on the forearm, and a cocked bob tail, black on top. The bruiser\'s 18 fps.' },
  { id: 'C', name: 'COUGAR, SLINKING', fps: 15, paint: painter('cougarLow'),
    note: 'A\'s cougar as a stalker: belly skimming the road, head held low under the line of the shoulders, ears pinned flat, tail straight out behind. One long, flat reaching stride with almost no bounce — reads as a thing hunting you rather than running at you. 15 fps.' },
  { id: 'D', name: 'BOBCAT, BOUNDING', fps: 16, paint: painter('bobcatBound'),
    note: 'B\'s bobcat in a half-bound: the hinds land and drive together, the fores come down one after the other, and the cat rocks nose-down, rump-down with a real hang in the air, balling up in the gathered flight. Hissing wide, ears back, bob cocked up. 16 fps.' },
  { id: 'E', name: 'COUGAR, OLD TOM', fps: 16, paint: painter('cougarTom'),
    note: 'A heavier cougar with a bigger head and paws, ears laid flat and the mouth held wide on long fangs the whole stride; a cooler, dustier coat so he stands off the warm road. 16 fps.' },
  { id: 'F', name: 'COUGAR, RED', fps: 16, paint: painter('cougarRed'),
    note: 'A\'s cougar in a deep rust coat with a heavier dark moustache — the colour test: does a redder cat read against the sand better than the true tawny one? 16 fps.' },
];

// ROUND 2: the bobcat refined, and sleeker. B is round 1's card as it was, the control.
const ROUND1_B = DESERT_CAT_CANDIDATES.find((c) => c.id === 'B');
export const BOBCAT_ROUND2 = [
  { ...ROUND1_B, id: 'B', name: 'BOBCAT — round 1, as picked', label: 'B ROUND 1',
    note: 'Round 1\'s B, unchanged: the control for this round. 18 fps.' },
  { id: 'B+', name: 'BOBCAT, REFINED', label: 'B+ REFINED', fps: 18, paint: painter('bobcat2'),
    note: 'B redrawn: the hind shank carries its width to a flatter paw set under the leg (no knob at the hock); the back rounds harder as he gathers; the coat is streaks down the spine, scattered flank spots and black spots on the white belly instead of a polka-dot grid; the forearm bars sit below the elbow; two facial lines sweep from the eye into the ruff; a soft throat bib; the bob is coat-coloured with bars, black on top at the tip, white under. 18 fps.' },
  { id: 'S1', name: 'SLEEK — LEAN', label: 'S1 LEAN', fps: 18, paint: painter('bobLean'),
    note: 'B+ with a longer barrel, a shallower chest and the waist tucked up under the loin. 18 fps.' },
  { id: 'S2', name: 'SLEEK — LEGGY', label: 'S2 LEGGY', fps: 17, paint: painter('bobLeggy'),
    note: 'B+ up on longer, finer legs with a longer reach and a little more hang in the air: the runner. 17 fps.' },
  { id: 'S3', name: 'SLEEK — STREAK', label: 'S3 STREAK', fps: 16, paint: painter('bobStreak'),
    note: 'Long, low and flat out: the body stretched along the road, head thrust forward on the line of the back, ears half back, the bob streaming, a long reaching stride with little bounce. 16 fps.' },
  { id: 'S4', name: 'SLEEK — SMALL HEAD', label: 'S4 SMALL HEAD', fps: 18, paint: painter('bobSmallHead'),
    note: 'B+ slimmed, with a head a size smaller for the body — the real animal\'s proportions rather than the kennel\'s big-headed ones. 18 fps.' },
  { id: 'S5', name: 'SLEEK — LONGER BOB', label: 'S5 LONGER BOB', fps: 18, paint: painter('bobLongTail'),
    note: 'Sleek like S1 but less drawn-in, with a longer bob carried out behind rather than cocked up. 18 fps.' },
];

// ROUND 3 (28 Sep 2026): Peter picked S3, "i am leaning towards streak", but "he needs
// to be a bit bigger overall though". S3 came out smallest because the fit squeezes
// his long, low 8-frame union into the bruiser's 15x10 box. These are the same art,
// fps and markings at 1.2x, 1.35x and 1.5x his round-2 size on screen — and since
// growing the art past the collision box would make hits look unfair, each carries a
// PROPOSED collision box that covers his head and body over the whole cycle (ground to
// the top of the back or head; the tail and the ear tufts may overhang, as the legs
// do). His art is laid out centred on that box, so the game's draw path (art centred
// on the box, box x 4/3 x VISUAL wide, TALL above) takes it with only the table
// numbers changed: each note gives the box, ANIMAL_VISUAL and ANIMAL_TALL.
const STREAK = 'bobStreak';
// Round 2's S3 in the bruiser's slot: world px per cat unit, as fitted.
function streakK0() {
  const b = catBounds(STREAK);
  const aw = SLOT.box[0] * 4 / 3 * SLOT.vis, ah = SLOT.box[1] * 4 / 3 * SLOT.tall * SLOT.vis;
  return Math.min((aw * 0.97) / (b.maxX - b.minX), (ah * 0.975) / -b.minY);
}
// The head-and-body box of S3 at `scale` times his round-2 size, in world px.
function coreBox(scale) {
  const c = catBounds(STREAK, true), k = streakK0() * scale;
  return { w: (c.maxX - c.minX) * k, h: -c.minY * k, cc: (c.minX + c.maxX) / 2, k };
}
// Everything about one bigger size: the box (whole px, rounded up so it never falls
// short of the body), the art box centred on it, and the table numbers that give it.
const geoms = new Map();
function bigGeom(cand) {
  let G = geoms.get(cand.id);
  if (G) return G;
  const b = catBounds(STREAK);
  const cb = coreBox(cand.big);
  const box = [Math.ceil(cb.w - 0.25), Math.ceil(cb.h - 0.25)];
  const half = Math.max(cb.cc - b.minX, b.maxX - cb.cc);
  const artW = (2 * half * cb.k) / 0.97, artH = (-b.minY * cb.k) / 0.975;
  const vis = artW / (box[0] * 4 / 3);
  const tall = artH / (box[1] * 4 / 3 * vis);
  G = { box, artW, artH, vis, tall, k: cb.k, cc: cb.cc, minY: b.minY };
  geoms.set(cand.id, G);
  return G;
}
// The DOG_PAINTERS contract again, (ctx, w, h, frame), but laid out on the box: the
// head-and-body centre sits on the raster's centre line, the tail in the spare room.
function bigPainter(cand) {
  return (ctx, w, h, frame = 0) => {
    const G = bigGeom(cand);
    const kk = (w / G.artW) * G.k;
    ctx.save();
    ctx.translate(w / 2, h);
    ctx.scale(kk, kk);
    ctx.translate(-G.cc, 0);
    paintCat(ctx, VARIANTS[STREAK], (frame % FRAMES) / FRAMES);
    ctx.restore();
  };
}
// The run's real jump against a box: how long the takeoff window is (the span of
// takeoff moments that clear it), at speed-2's opening closing speed. A full jump is
// BASE_JUMP_V 320 against GRAVITY 900 — 57 px high, 0.71 s — and the lane closes at
// BASE_SPEED 160 x 1.125 (Speed's speedBonus) + the cat's 38 = 218 px/s; the hero's
// box is PLAYER_W 8 wide. The window is the airtime spent above the box minus the time
// it takes to pass over it.
const JUMP = { v: 320, g: 900, closing: 160 * 1.125 + 38, heroW: 8 };
function takeoffWindow(box) {
  const peak = (JUMP.v * JUMP.v) / (2 * JUMP.g), air = (2 * JUMP.v) / JUMP.g;
  return air * Math.sqrt(Math.max(0, 1 - box[1] / peak)) - (box[0] + JUMP.heroW) / JUMP.closing;
}
// The card's hop for a box: the stylised 22 px / 0.36 s hop unless the box needs more,
// then tall and long enough to keep the hero's feet 2 px over it the whole way across.
function hopFor(box) {
  const height = Math.max(HOP_H, box[1] + 12);
  const win = (box[0] + JUMP.heroW) / 2 / (SCROLL + 38);
  const half = Math.max(HOP, win / Math.sqrt(1 - (box[1] + 2) / height) + 0.04);
  return { half, height };
}
// A lab-only dashed outline of a collision box, feet on `floor`.
function boxOutline(ctx, x, floor, w, h, lw) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = lw;
  ctx.setLineDash([lw * 3, lw * 2.4]);
  ctx.strokeRect(x + lw / 2, floor - h + lw / 2, w - lw, h - lw);
  ctx.restore();
}
const S3 = BOBCAT_ROUND2.find((c) => c.id === 'S3');
const fmtMs = (s) => `${Math.round(s * 1000)} ms`;
function bigCandidate(id, scale) {
  const cand = { id, name: `STREAK × ${scale}`, label: `${id} ×${scale}`, fps: S3.fps, big: scale };
  // L2 SHIPPED (28 Sep 2026, "L2 please"): its card draws the game's own painter,
  // sprites/bobcat.js paintBobcat, whose baked fit is this one's.
  cand.paint = scale === 1.35 ? paintBobcat : bigPainter(cand);
  Object.defineProperty(cand, 'note', {
    enumerable: true,
    get() {
      const G = bigGeom(cand);
      const hop = hopFor(G.box);
      // Only worth a word when the card needs a noticeably longer hop, not a taller one.
      const longer = hop.half > HOP * 1.03;
      return `S3 at ${scale}x his round-2 size, same art and ${S3.fps} fps. Proposed box ${G.box[0]}x${G.box[1]} `
        + `(the bruiser's is 15x10) covering head and body over the cycle; drawn with ANIMAL_VISUAL ${G.vis.toFixed(2)}, `
        + `ANIMAL_TALL ${G.tall.toFixed(2)}. Takeoff window on a full jump at speed-2's pace: ${fmtMs(takeoffWindow(G.box))} `
        + `(the bruiser: ${fmtMs(takeoffWindow(SLOT.box))}).`
        + (longer ? ` The card's hop is ${hop.height.toFixed(0)} px over ${(hop.half * 2).toFixed(2)} s (the others: 22 px, 0.72 s) to clear it.` : '');
    },
  });
  return cand;
}
export const BOBCAT_ROUND3 = [
  { ...S3, id: 'S3', name: 'STREAK — round 2, as picked', label: 'S3 ×1', showBox: true,
    get note() {
      const c = coreBox(1);
      return `Round 2's S3, unchanged: the control. Fitted into the bruiser's 15x10 box (the dashed outline), his head and `
        + `body span only ${c.w.toFixed(1)}x${c.h.toFixed(1)} world px, which is why he reads small. ${S3.fps} fps.`;
    } },
  bigCandidate('L1', 1.2),
  bigCandidate('L2', 1.35),
  bigCandidate('L3', 1.5),
];
// Round 3's lineup: the four sizes side by side, each over its box.
export function drawStreakLineup(ctx, t, W = 480, H = 270) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, ROAD.sky0); g.addColorStop(1, ROAD.sky1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const z = ZOOM * 1.5;
  const rows = [Math.round(H * 0.44), Math.round(H * 0.9)];
  BOBCAT_ROUND3.forEach((cand, i) => {
    const G = cand.big ? bigGeom(cand) : null;
    const aw = G ? G.artW : SLOT.box[0] * 4 / 3 * SLOT.vis, ah = G ? G.artH : SLOT.box[1] * 4 / 3 * SLOT.tall * SLOT.vis;
    const box = G ? G.box : SLOT.box;
    const cx = (W / 2) * ((i % 2) + 0.5), floor = rows[i >> 1];
    ctx.fillStyle = ROAD.road; ctx.fillRect(cx - W / 4 + 4, floor, W / 2 - 8, 6);
    drawSoftContactShadow(ctx, cx, floor + 1, aw * z * 0.34, 4, { alpha: 0.3 });
    ctx.save();
    ctx.translate(cx - (aw * z) / 2, floor - ah * z);
    cand.paint(ctx, aw * z, ah * z, frameOf(t, cand));
    ctx.restore();
    boxOutline(ctx, cx - (box[0] * z) / 2, floor, box[0] * z, box[1] * z, 1);
    ctx.fillStyle = 'rgba(40,26,20,0.75)';
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${cand.label}  box ${box[0]}x${box[1]}`, cx, floor + 17);
  });
  ctx.textAlign = 'start';
}

// --------------------------------------------------------------- rasterizing
// Exactly propSprite's resample: painted at box x detail logical px, SS-supersampled.
const rasters = new Map();
function slotRaster(cand, frame) {
  const key = `${cand.id}|${frame}`;
  let c = rasters.get(key);
  if (c) return c;
  const [bw, bh] = SLOT.box;
  const rw = bw * SLOT.detail, rh = bh * SLOT.tall * SLOT.detail;
  c = document.createElement('canvas');
  c.width = Math.round(rw * SS); c.height = Math.round(rh * SS);
  const g = c.getContext('2d');
  g.scale(SS, SS);
  g.lineJoin = 'round'; g.lineCap = 'round';
  cand.paint(g, rw, rh, frame);
  rasters.set(key, c);
  return c;
}
const frameOf = (t, cand) => Math.floor(t * cand.fps) % FRAMES;

// Mirrors drawWorldEntity for a self-outlined ground animal: contact shadow, the red
// AVOID tick, then the art (box x 4/3 x VISUAL, bottom-anchored). The control draws
// through drawWorldEntity itself.
function drawCatEntity(ctx, cand, worldX, camX, t, pack) {
  if (cand.control) {
    const e = makeObstacle('dogBruiser', worldX);
    e.bobPhase = 0;
    drawWorldEntity(ctx, e, camX, t, pack, { smoothMotion: true });
    return;
  }
  if (cand.big) { drawBigEntity(ctx, cand, worldX - camX, t); return; }
  const [bw, bh] = SLOT.box;
  const x = worldX - camX;
  drawSoftContactShadow(ctx, x + bw / 2, GROUND_Y - 1, Math.max(5, bw * 0.68), 2.4, { alpha: 0.34 });
  ctx.fillStyle = 'rgba(224,72,72,0.32)';
  ctx.fillRect(x, GROUND_Y - 1, bw, 1);
  const w0 = Math.round(bw * 4 / 3 * SLOT.vis), h0 = Math.round(bh * 4 / 3 * SLOT.tall * SLOT.vis);
  const ox = x - Math.floor((w0 - bw) / 2);
  const oy = GROUND_Y - h0;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(slotRaster(cand, frameOf(t, cand)), ox, oy, w0, h0);
  ctx.imageSmoothingEnabled = prev;
}

// Round 3's bigger cats: drawWorldEntity's arithmetic on the PROPOSED box — contact
// shadow and red tick across it, the raster (box x detail, SS-supersampled) drawn
// box x 4/3 x VISUAL wide, TALL above, centred on the box.
function bigRaster(cand, frame) {
  const key = `${cand.id}|big|${frame}`;
  let c = rasters.get(key);
  if (c) return c;
  const G = bigGeom(cand);
  const rw = G.box[0] * SLOT.detail, rh = G.box[1] * G.tall * SLOT.detail;
  c = document.createElement('canvas');
  c.width = Math.round(rw * SS); c.height = Math.round(rh * SS);
  const g = c.getContext('2d');
  g.scale(SS, SS);
  g.lineJoin = 'round'; g.lineCap = 'round';
  cand.paint(g, rw, rh, frame);
  rasters.set(key, c);
  return c;
}
function drawBigEntity(ctx, cand, x, t) {
  const G = bigGeom(cand);
  const [bw, bh] = G.box;
  drawSoftContactShadow(ctx, x + bw / 2, GROUND_Y - 1, Math.max(5, bw * 0.68), 2.4, { alpha: 0.34 });
  ctx.fillStyle = 'rgba(224,72,72,0.32)';
  ctx.fillRect(x, GROUND_Y - 1, bw, 1);
  const w0 = Math.round(bw * 4 / 3 * G.vis), h0 = Math.round(bh * 4 / 3 * G.tall * G.vis);
  const ox = x - Math.floor((w0 - bw) / 2);
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bigRaster(cand, frameOf(t, cand)), ox, GROUND_Y - h0, w0, h0);
  ctx.imageSmoothingEnabled = prev;
}

// ------------------------------------------------------------- the close-up
// The candidate large, running in place over a plain strip of road, the road's dashes
// streaming under it at its closing speed. CLOSE_Z frame px per world unit (the game
// draws at ZOOM, 2): 4x the size it has in the lane.
export const CLOSE_Z = 8;
const ROAD = { sky0: '#f4e6c8', sky1: '#ecd3a6', road: '#b9a58a', edge: '#8c7a64', dash: '#efe4cc', sand: '#e2c48e' };
export function drawDesertCatTile(ctx, t, cand, W = 480, H = 270) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, ROAD.sky0); g.addColorStop(1, ROAD.sky1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const floor = Math.round(H * 0.8);
  ctx.fillStyle = ROAD.sand; ctx.fillRect(0, floor - 26, W, 26);
  ctx.fillStyle = ROAD.road; ctx.fillRect(0, floor, W, H - floor);
  ctx.fillStyle = ROAD.edge; ctx.fillRect(0, floor, W, 3);
  // Dashes at the closing speed (the run's ~60 plus the bruiser's 38), in close-up px.
  const off = ((t * 98 * CLOSE_Z) % 120 + 120) % 120;
  ctx.fillStyle = ROAD.dash;
  for (let x = -120 + off; x < W + 120; x += 120) ctx.fillRect(Math.round(x), floor + 20, 56, 5);
  const [bw, bh] = SLOT.box;
  // Round 3's bigger cats carry their own art box (and collision box).
  const G = cand.big ? bigGeom(cand) : null;
  const aw = G ? G.artW : bw * 4 / 3 * SLOT.vis, ah = G ? G.artH : bh * 4 / 3 * SLOT.tall * SLOT.vis;
  const w = aw * CLOSE_Z, h = ah * CLOSE_Z;
  const cx = W / 2;
  drawSoftContactShadow(ctx, cx, floor + 1, w * 0.36, 8, { alpha: 0.3 });
  ctx.save();
  ctx.translate(Math.round(cx - w / 2), floor - h);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  cand.paint(ctx, w, h, frameOf(t, cand));
  ctx.restore();
  const box = G ? G.box : cand.showBox ? SLOT.box : null;
  if (box) boxOutline(ctx, cx - (box[0] * CLOSE_Z) / 2, floor, box[0] * CLOSE_Z, box[1] * CLOSE_Z, 1.5);
}

// ------------------------------------------------------------------ the lane
// The real Speed Zone, speed-2 halfway, as the run draws it: the shipped pack's
// backdrop and road, the candidate coming down the lane at the bruiser's closing
// speed, and the hero hopping it. The hero takes the pack's light as run.js does.
const LEN = 11340;
const SCROLL = 60;                      // world px/s
const LOOP = 3.2;                       // one approach, s
const HOP = 0.36, HOP_H = 22;
let lanePack = null;
let speedCab = null;
function lane() {
  if (!lanePack) {
    speedCab = CABINETS.find((cab) => cab.id === 'speed');
    lanePack = getStylePack(speedCab.style, { paperCabinet: 'speed', paperPreset: 'cardstockClear' });
  }
  return lanePack;
}
const heroPose = (t, airborne) => ({
  kind: airborne ? 'jump' : 'run', phase: (t * 1.6) % 1, time: t,
  vy: airborne ? -160 : 0, grounded: !airborne, squash: 0, lean: 0,
  roll: false, float: false, stomp: false, headless: false, facing: 1,
});
const layers = new WeakMap();
function heroLit(ctx, t, lift, veil) {
  let c = layers.get(ctx);
  if (!c || c.width !== ctx.canvas.width || c.height !== ctx.canvas.height) {
    c = document.createElement('canvas');
    c.width = ctx.canvas.width;
    c.height = ctx.canvas.height;
    layers.set(ctx, c);
  }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.setTransform(ctx.getTransform());
  applyWorld(g, ZOOM, 0, GROUND_Y);
  drawToon(g, 'lorenzo', heroPose(t, lift > 0), PLAYER_X, GROUND_Y - lift, HERO_DRAW_H);
  if (veil) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = veil;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}
// Where the candidate is `lt` seconds into its approach, world px ahead of the hero:
// it enters past the frame's right edge and closes at SCROLL + 38.
const AHEAD0 = 190;
const aheadAt = (lt) => AHEAD0 - lt * (SCROLL + 38);
export function drawDesertCatInLane(ctx, t, cand, W = 480, H = 270) {
  const pack = lane();
  const lt = ((t % LOOP) + LOOP) % LOOP;
  const camX = LEN * 0.5 + t * SCROLL;
  ctx.save();
  if (W !== 480 || H !== 270) ctx.scale(W / 480, H / 270);
  pack.bg(ctx, t, camX, speedCab, LEN, null, 0, { stageIndex: 2, progress: camX / LEN, heroFrac: 0.3 });
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, speedCab, [], [], t * 60, VIEW_W);
  const ahead = aheadAt(lt);
  drawCatEntity(ctx, cand, camX + PLAYER_X + ahead, camX, t, pack);
  // Round 3: the collision box, as a lab-only dashed outline.
  const G = cand.big ? bigGeom(cand) : null;
  const box = G ? G.box : cand.showBox ? SLOT.box : null;
  if (box) boxOutline(ctx, PLAYER_X + ahead, GROUND_Y, box[0], box[1], 0.5);
  ctx.restore();
  // The hero hops as it arrives under him (its box centre crossing his x). Round 3's
  // cards hop each size's own box (hopFor); rounds 1 and 2 keep the one hop.
  const bw = box ? box[0] : SLOT.box[0];
  const arrive = (AHEAD0 + bw * 0.5 - 6) / (SCROLL + 38);
  const hop = box ? hopFor(box) : { half: HOP, height: HOP_H };
  const d = (lt - arrive) / hop.half;
  const lift = Math.abs(d) < 1 ? hop.height * (1 - d * d) : 0;
  heroLit(ctx, t, lift, pack.heroLight ? pack.heroLight() : null);
  ctx.restore();
}

// ---------------------------------------------------------------- the lineup
// Every candidate side by side on the plain road at 2x their lane size, all on one
// clock — the one card for comparing size, colour and stride at a glance.
export function drawDesertCatLineup(ctx, t, W = 480, H = 270) {
  lineup(ctx, t, W, H, DESERT_CAT_CANDIDATES);
}
// Round 2's lineup: the bobcats, same layout.
export function drawBobcatLineup(ctx, t, W = 480, H = 270) {
  lineup(ctx, t, W, H, BOBCAT_ROUND2);
}
function lineup(ctx, t, W, H, list) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, ROAD.sky0); g.addColorStop(1, ROAD.sky1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const [bw, bh] = SLOT.box;
  const aw = bw * 4 / 3 * SLOT.vis, ah = bh * 4 / 3 * SLOT.tall * SLOT.vis;
  const z = ZOOM * 2;
  const cols = 4, rowsY = [Math.round(H * 0.45), Math.round(H * 0.92)];
  list.forEach((cand, i) => {
    const row = i < cols ? 0 : 1, col = row ? i - cols : i;
    const n = row ? list.length - cols : cols;
    const cx = (W / n) * (col + 0.5);
    const floor = rowsY[row];
    ctx.fillStyle = ROAD.road; ctx.fillRect(cx - W / n / 2 + 4, floor, W / n - 8, 6);
    drawSoftContactShadow(ctx, cx, floor + 1, aw * z * 0.34, 4, { alpha: 0.3 });
    ctx.save();
    ctx.translate(cx - (aw * z) / 2, floor - ah * z);
    cand.paint(ctx, aw * z, ah * z, frameOf(t, cand));
    ctx.restore();
    ctx.fillStyle = 'rgba(40,26,20,0.75)';
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(cand.label || `${cand.id} ${cand.name.split(' — ')[0]}`, cx, floor + 17);
  });
  ctx.textAlign = 'start';
}
