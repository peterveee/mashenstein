// Gallery-only CRYPT SHIFT OBSTACLE concepts — ten graveyard things that stand,
// roll, lie or fly in the lane of the gouache night, drawn in the backdrop's hand.
//
// THE COMPLAINT (12 Oct 2026). Peter, after the office sheet: "can you examine
// obstacles in other cabinets (except cardboard) and recommend new items or
// replacements that fit in more with their style". Crypt's own cast was drawn
// for this lane and stays — the slab headstone and the three zombies
// (sprites/crypt-enemies.js, settings.cryptEnemyArt) and the curated animals.
// What the bank borrows from the generic set does not belong to it:
//
//   * popSpikes — steel cones over a yellow-and-black hazard stripe, a factory
//     floor in a churchyard. Four crypt patterns deal it, tier 1 and 2.
//   * barrel — a brown wooden cask from the shared props, rolling at you in the
//     open lane (BASE_PATTERNS tier 2, so crypt-2 and crypt-3) and the very
//     barrel you KICK INTO A ZOMBIE in the catacomb (cabinets.js barrelPairs).
//   * crate — the generic wooden box, excluded outright by all three crypt
//     stages (data/stage-layouts.js, "animals over props"). The upshot is that
//     the bank's stack shapes — the double wall, the low-then-high two-beat,
//     the coin stair into a crate — never play here at all.
//   * brazier — fits the world (a dungeon fire in a graveyard) and is the
//     mechanic: "the only hazard that is also a light source". Kept; drawn in
//     the generic props hand, so G offers a graveyard version of the same job.
//   * no flyer at all: cactus/drone/buzzbird are remapped to stone, zombie and
//     cat, so crypt is the one cabinet with nothing to slide under and nothing
//     overhead. I and J are offered as new, not as replacements.
//
// WHAT IS ALREADY BEHIND THE LANE, so none of it comes forward (cryptGouache.js
// SCENE and cryptLife.js): headstones, crosses, mausoleums, the abbey, bare
// trees, gas lamps, iron railings with gates, grass, bats in the sky and at the
// belfry, crows on the railing, the owl, ghosts, wisps, the black cat, the
// witch, the clown, the zombie procession, crypt-2's pumpkin patch and crypt-3's
// cauldron. Already seen and not picked for the lane: the jack-o'-lantern,
// cauldron, scarecrow and spider web (crypt-halloween-bakeoff.js), the coffin
// crawler, bone hound and funeral moth (crypt-enemy-candidates.js), the twelve
// movie-night props incl. the squeaky bat (crypt-movie-bakeoff.js). A hand out
// of the hill was offered twice as SCENERY (cryptLife/mid.js, the halloween
// sheet) and passed over; A is the first time it is offered as a lane hazard.
//
// THE HAND. The backdrop's gouache: an opaque body laid from its paint down to
// its dark, dabbed with its own tones, and a scumbled MOONLIT RIM on every edge
// that faces the moon (upper right) — the same three moves cryptGouache.js's
// massSprite makes, done here in vector on the canvas so a port needs no
// sprite cache. Then what the backdrop never has and the lane cast always does:
// one dark ink contour round each mass (the slab headstone's weight), because
// "a backdrop stone never reads as an obstacle" (cryptGouache.js STONE) only
// works if the lane's things are lighter, warmer and outlined. Stone is the
// lane headstone's own blue-grey; the one warm note is the lamp gold; RED marks
// what bites (roses, eyes, lacquer, the outer flame) because the guide teaches
// RED = AVOID. Self-outlined, so a port joins SELF_OUTLINED_PROPS.
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units —
// box x 4/3, height x PROP_TALL (x PROP_VISUAL_SCALE for flyers), the size
// drawWorldEntity draws a prop at — with the ground line at y = h; bedded
// plates keep everything above h - 2, where the road cuts them. slotEnvelope()
// in the kit derives it. Porting means copying a body into sprites/props.js
// under ctx.scale(w / W, h / H) (props.js painters receive the box-x-tall size
// and the run stretches by 4/3), and `t` is quantised to each candidate's own
// frame ring, as the shipped prop ring would be.
//
// ROLLERS. C rides UPRIGHT on its truck's wheel — a port adds an upright glide
// beside the barrel's spin (the office sheet asks the same for its chairs). D
// is round and wants the barrel's spin as is; its painter turns the spokes for
// the sheet only, since the run would turn the whole sprite.
//
// Nothing here is registered in any gameplay registry.
import { GOUACHE_KIT as K } from '../engine/stylePacks/cryptGouache.js';
import { frameOf } from './obstacle-bakeoff-kit.js';

const { css, mix, shade, rng } = K;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
// The lane cast's ink (the slab headstone's #3a354e, a step darker so it holds
// on the violet road) at the weights the office sheet settled on, a touch lighter.
const INK = '#262034';
const LW = 0.46; // outline
const LWI = 0.28; // interior line
const LWF = 0.18; // fine line

// Gouache paints, as the pack writes them: [r, g, b] body, dark and lit.
const PAINT = {
  // The lane headstone's own stone (crypt-enemies.js style B: #b3c4d9 / #748da9 / #ede9f4).
  stone: { body: [179, 196, 217], dark: [112, 136, 166], lit: [242, 240, 250], seed: 5 },
  bone: { body: [228, 220, 192], dark: [158, 150, 160], lit: [255, 252, 236], seed: 3 },
  soil: { body: [92, 70, 92], dark: [44, 32, 50], lit: [150, 128, 160], seed: 13 },
  rosewood: { body: [150, 82, 72], dark: [78, 42, 58], lit: [226, 160, 128], seed: 7, grain: Math.PI / 2 },
  pine: { body: [196, 150, 104], dark: [120, 82, 70], lit: [246, 214, 160], seed: 17, grain: 0 },
  oak: { body: [134, 100, 84], dark: [70, 52, 62], lit: [204, 168, 132], seed: 19, grain: 0 },
  iron: { body: [80, 86, 124], dark: [38, 40, 66], lit: [160, 174, 214], seed: 9 },
  brass: { body: [222, 176, 98], dark: [140, 100, 62], lit: [255, 234, 166], seed: 11 },
  lacquer: { body: [176, 46, 60], dark: [96, 24, 46], lit: [246, 120, 120], seed: 15 },
  leaf: { body: [104, 136, 108], dark: [54, 74, 72], lit: [170, 204, 168], seed: 21 },
  briar: { body: [122, 108, 100], dark: [66, 54, 64], lit: [206, 192, 176], seed: 23 },
  rose: { body: [212, 46, 62], dark: [124, 22, 48], lit: [255, 132, 132], seed: 25 },
  wax: { body: [242, 232, 208], dark: [200, 182, 164], lit: [255, 253, 244], seed: 27 },
  wing: { body: [160, 162, 200], dark: [92, 92, 136], lit: [228, 230, 252], seed: 29 },
};
const BONE = css(PAINT.bone.body), BONE_LT = css(PAINT.bone.lit), BONE_DK = css(PAINT.bone.dark);
const STONE_DK = css(PAINT.stone.dark);
const BRASS = css(PAINT.brass.body), BRASS_LT = css(PAINT.brass.lit), BRASS_DK = css(PAINT.brass.dark);
const RED = '#e0384c', RED_DK = '#8e1c34';
const HOLLOW = '#120e1c'; // inside a skull, a coffin, a chest: darker than the night
const WARM = K.C.warm; // the lamp gold, [255, 196, 112]
const GOLD = css(WARM), FLAME = css(K.C.flame), ORANGE = '#ff9246', EMBER = '#ec5a3c';

// ------------------------------------------------------------------ the hand
// A gouache mass: the body laid from its paint at the top to its dark at the
// foot, dabbed in its own tones, then the moonlit rim — the shape minus itself
// shifted down-left, which leaves exactly the edges facing the moon — broken
// with a few dry-brush dabs; `detail` paints on top, clipped to the mass; and
// the lane's ink contour round the outside. `path(p)` adds one closed shape (no
// beginPath; a ring's two circles count as one); `box` is [x, y, w, h] around it.
function mass(c, box, path, st, detail = null, lw = LW) {
  const [bx, by, bw, bh] = box;
  const R = rng(st.seed ?? 1);
  c.save();
  c.beginPath();
  path(c);
  const gr = c.createLinearGradient(0, by + bh * 0.08, 0, by + bh);
  gr.addColorStop(0, css(st.body));
  gr.addColorStop(1, css(st.dark));
  c.fillStyle = gr;
  c.fill();
  c.clip();
  const tones = [shade(st.body, 0.08), shade(st.dark, -0.1), mix(st.body, st.lit, 0.35), shade(st.body, -0.08)];
  const nd = Math.round(bw * bh * (st.dabs ?? 0.4));
  // Wood takes its dabs as long strokes along `grain` (an angle); everything else
  // as the pack's short, tilted ones.
  const grain = st.grain != null;
  for (let i = 0; i < nd; i++) {
    c.globalAlpha = 0.16 + R() * 0.28;
    c.fillStyle = css(tones[(R() * tones.length) | 0]);
    const rx = (st.dab ?? 0.8) * (0.5 + R() * 0.9) * (grain ? 1.8 : 1);
    const ry = rx * (grain ? 0.1 + R() * 0.08 : 0.3 + R() * 0.3);
    const rot = grain ? st.grain + (R() - 0.5) * 0.1 : -0.5 + (R() - 0.5) * 0.7;
    c.beginPath();
    c.ellipse(bx + R() * bw, by + R() * bh, rx, ry, rot, 0, TAU);
    c.fill();
  }
  const d = st.rim ?? 0.6;
  c.globalAlpha = st.rimA ?? 0.85;
  c.fillStyle = css(st.lit);
  c.beginPath();
  path(c);
  c.translate(-d * 0.7, d);
  path(c);
  c.translate(d * 0.7, -d);
  c.fill('evenodd');
  // Dry-brush breaks: the body's own paint dragged back over the rim here and there.
  c.fillStyle = css(st.body);
  const nb = Math.round(bw * bh * 0.04);
  for (let i = 0; i < nb; i++) {
    c.globalAlpha = 0.3 + R() * 0.4;
    const rx = 0.3 + R() * 0.6;
    c.beginPath();
    c.ellipse(bx + R() * bw, by + R() * bh, rx, rx * 0.45, -0.5 + (R() - 0.5) * 0.8, 0, TAU);
    c.fill();
  }
  c.globalAlpha = 1;
  if (detail) detail(c, R);
  c.restore();
  c.beginPath();
  path(c);
  c.lineJoin = 'round';
  c.strokeStyle = INK;
  c.lineWidth = lw;
  c.stroke();
}

// Path builders for mass(): each adds one closed subpath.
const shape = (pts) => (p) => {
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  p.closePath();
};
const oval = (x, y, rx, ry, rot = 0) => (p) => {
  p.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  p.ellipse(x, y, rx, ry, rot, 0, TAU);
  p.closePath();
};
const rrect = (x, y, w, h, r) => (p) => {
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
};
const boxOf = (pts) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
    y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
  }
  return [x0, y0, x1 - x0, y1 - y0];
};
const massPoly = (c, pts, st, detail, lw) => mass(c, boxOf(pts), shape(pts), st, detail, lw);

// Flat marks on top of a mass, no gouache: a filled shape with an optional ink.
function fillShape(c, path, fill, ink = null, lw = LWI) {
  c.beginPath();
  path(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink) { c.lineJoin = 'round'; c.strokeStyle = ink; c.lineWidth = lw; c.stroke(); }
}
function stroke(c, pts, col, w, cap = 'round') {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.lineCap = cap;
  c.lineJoin = 'round';
  c.strokeStyle = col;
  c.lineWidth = w;
  c.stroke();
}
function curveStroke(c, build, col, w) {
  c.beginPath();
  build(c);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = col;
  c.lineWidth = w;
  c.stroke();
}
// A limb as the lane cast draws one (crypt-enemies.js `limb`): ink laid wide, the paint on it.
function limb(c, pts, col, w) {
  stroke(c, pts, INK, w + LW * 2);
  stroke(c, pts, col, w);
}
function dot(c, x, y, r, fill, ink = null, lw = LWF) {
  fillShape(c, oval(x, y, r, r), fill, ink, lw);
}

// A pool of lamp light, the pack's warm wash: what a lit thing throws on the
// night. An ellipse, sized by its caller to die out INSIDE the envelope — the
// prop raster would cut it with a hard edge anywhere it reached the boundary.
function glow(c, x, y, rx, ry, a) {
  c.save();
  c.translate(x, y);
  c.scale(rx, ry);
  const g = c.createRadialGradient(0, 0, 0.05, 0, 0, 1);
  g.addColorStop(0, css(WARM, a));
  g.addColorStop(0.5, css(WARM, a * 0.35));
  g.addColorStop(1, css(WARM, 0));
  c.fillStyle = g;
  c.fillRect(-1, -1, 2, 2);
  c.restore();
}

// The red of eyes in the dark, thrown faintly on what is round them.
function glow2(c, x, y, r, a) {
  const g = c.createRadialGradient(x, y, 0.3, x, y, r);
  g.addColorStop(0, `rgba(224,56,76,${(0.4 * a).toFixed(3)})`);
  g.addColorStop(1, 'rgba(224,56,76,0)');
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

// Gouache flame: an ember-red outer tongue with a fine ink edge (the RED that
// says avoid), then orange and lamp-gold cores with no ink. `p` is the phase.
function flame(c, cx, base, w, hgt, p, ph = 0) {
  const tongue = (dx, hw, hh, k, fill, ink) => {
    const sway = Math.sin(p * 2 + ph + k) * hw * 0.5;
    const tall = hh * (0.84 + 0.16 * Math.sin(p * 3 + ph * 1.7 + k));
    const x0 = cx + dx - hw, x1 = cx + dx + hw;
    c.beginPath();
    c.moveTo(x0, base);
    c.quadraticCurveTo(x0 - hw * 0.1, base - tall * 0.55, cx + dx + sway, base - tall);
    c.quadraticCurveTo(x1 + hw * 0.1, base - tall * 0.55, x1, base);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (ink) { c.lineJoin = 'round'; c.strokeStyle = ink; c.lineWidth = LWF; c.stroke(); }
  };
  tongue(-w * 0.22, w * 0.3, hgt * 0.62, 0.0, EMBER, INK);
  tongue(w * 0.2, w * 0.3, hgt * 0.7, 1.3, EMBER, INK);
  tongue(0, w * 0.42, hgt, 2.4, EMBER, INK);
  tongue(-w * 0.12, w * 0.24, hgt * 0.5, 0.8, ORANGE);
  tongue(w * 0.12, w * 0.24, hgt * 0.56, 2.0, ORANGE);
  tongue(0, w * 0.28, hgt * 0.72, 3.1, ORANGE);
  tongue(0, w * 0.16, hgt * 0.42, 1.7, FLAME);
}

// A skull, front on, in the lane hand: cranium and cheeks as one bone mass,
// hollow sockets with a red light far back in them, a nose notch, and a jaw
// that drops by `jaw`. Centred on (x, y), `s` units across the cranium.
function skull(c, x, y, s, jaw = 0, eye = 1) {
  const k = s / 8;
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  // The jaw first, so the cranium's cheekbones overlap it.
  mass(c, [-2.8, 1.6, 5.6, 3.8 + jaw], rrect(-2.7, 1.6 + jaw, 5.4, 3.4, 1.2), PAINT.bone, (p) => {
    for (let i = -2; i <= 2; i++) stroke(p, [[i * 1.0, 1.7 + jaw], [i * 1.0, 3.1 + jaw]], INK, LWF / k);
  }, LW / k);
  mass(c, [-4, -4.4, 8, 7.6], (p) => {
    p.moveTo(-3.9, -0.6);
    p.bezierCurveTo(-4.3, -4.8, 4.3, -4.8, 3.9, -0.6);
    p.quadraticCurveTo(3.8, 1.4, 2.8, 2.0);
    p.lineTo(2.4, 3.0);
    p.lineTo(-2.4, 3.0);
    p.lineTo(-2.8, 2.0);
    p.quadraticCurveTo(-3.8, 1.4, -3.9, -0.6);
    p.closePath();
  }, PAINT.bone, (p) => {
    // Sockets, nose, the upper teeth's line.
    for (const sx of [-1.55, 1.55]) {
      fillShape(p, oval(sx, -0.2, 1.25, 1.1), HOLLOW);
      if (eye > 0) dot(p, sx + 0.15, -0.1, 0.42 * eye, RED);
      if (eye > 0.5) dot(p, sx + 0.25, -0.25, 0.16, '#ffd0c0');
    }
    fillShape(p, shape([0, 1.0, 0.55, 2.1, -0.55, 2.1]), HOLLOW);
    stroke(p, [[-2.4, 3.0], [2.4, 3.0]], INK, LWF / k);
  }, LW / k);
  c.restore();
}

// ================================================================ painters
// All in world units inside the envelope, ground at y = h.

// A — GRAVE HANDS, skeletal, out of a fresh grave (floor 20x16, bedded)
// Two bony hands clawing up out of turned soil and closing on the air where
// your foot goes. Pale bone over the violet road is the strongest contrast the
// lane can give a floor hazard; the claw hooks toward the hero.
// The grab, 0 fingers spread .. 1 a hooked claw — never a fist, so the hand
// keeps its spiky silhouette in every frame.
const GRAB = [0.05, 0.25, 0.5, 0.75, 0.75, 0.6, 0.35, 0.15];
function boneHand(c, x, wristY, s, curl, seed) {
  c.save();
  c.translate(x, wristY);
  c.scale(s, s);
  const W = 0.5; // a bone's width
  // Forearm: radius and ulna, out of the soil.
  limb(c, [[-0.5, 3], [-0.42, -2.3]], BONE_DK, W);
  limb(c, [[0.5, 3], [0.45, -2.3]], BONE, W + 0.08);
  // Metacarpals fanning from the wrist to the knuckles, then two phalanges a
  // finger, the claw bending the tips over toward the hero (-x).
  const FINGERS = [[-1.45, 2.4, -0.36], [-0.5, 2.9, -0.1], [0.45, 2.8, 0.1], [1.35, 2.2, 0.34]];
  const joints = [];
  for (const [kx, len, fan] of FINGERS) {
    const k = [kx, -5.5 + Math.abs(kx) * 0.3];
    limb(c, [[kx * 0.35, -3.2], k], BONE, W);
    const a1 = -Math.PI / 2 + fan * (1 - curl * 0.4) - curl * 0.35;
    const m = [k[0] + Math.cos(a1) * len * 0.55, k[1] + Math.sin(a1) * len * 0.55];
    const a2 = a1 - curl * 1.25;
    const e = [m[0] + Math.cos(a2) * len * 0.5, m[1] + Math.sin(a2) * len * 0.5];
    limb(c, [k, m, e], BONE, W);
    joints.push(k, m);
  }
  // Thumb, off the wrist's left.
  const ta = -Math.PI * 0.8 + curl * 0.45;
  const tb = [-0.9, -3.0];
  const tm = [tb[0] + Math.cos(ta) * 1.6, tb[1] + Math.sin(ta) * 1.6];
  limb(c, [tb, tm, [tm[0] + Math.cos(ta + curl * 0.9) * 1.2, tm[1] + Math.sin(ta + curl * 0.9) * 1.2]], BONE, W);
  // The wrist: carpals as one small bone mass over the roots.
  mass(c, [-1.4, -3.9, 2.8, 2.0], oval(0, -2.9, 1.25, 0.85), { ...PAINT.bone, seed, rim: 0.4, dabs: 0.3 }, null, LW / s);
  // Knuckles, catching the moon.
  for (const [jx, jy] of joints) dot(c, jx, jy, 0.3, BONE_LT, INK, LWF / s);
  c.restore();
}
function graveHands(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 2;
  // The dark of the opened grave behind the hands.
  fillShape(c, oval(10, g + 0.4, 8.6, 1.9), HOLLOW);
  boneHand(c, 6.2, g + 0.4, 1.32, GRAB[f], 41);
  boneHand(c, 14.4, g + 0.6, 1.12, GRAB[(f + 3) % 8], 43);
  // Turned soil: a heap either side, banked over both wrists.
  massPoly(c, [0.4, g + 2, 1.4, g - 1.2, 3.2, g - 2.1, 5.0, g - 1.0, 5.8, g - 0.2, 7.6, g - 0.6, 9.2, g - 1.6, 11.0, g - 0.8,
    12.6, g - 0.4, 14.4, g - 1.4, 16.4, g - 1.9, 18.4, g - 0.9, 19.6, g + 2], PAINT.soil);
  // Clods kicked up by the grab, falling back on the ring.
  if (f >= 2 && f <= 5) {
    const k = f - 2;
    dot(c, 4.2 - k * 0.3, g - 4.2 + k * 1.1, 0.42, css(PAINT.soil.body), INK, LWF);
    dot(c, 16.4 + k * 0.3, g - 3.6 + k * 1.0, 0.36, css(PAINT.soil.body), INK, LWF);
  }
}

// B — GRAVE ROSES gone to briar (floor 20x16, bedded)
// A grave's rose bush run wild across the path: hooked thorns on pale,
// moonlit canes and three blood-red roses — the floor's RED. Bedded like the
// spike plate; the thorns are the teeth.
function thornyCane(c, pts) {
  // The cane: ink, then its paint, then thorns hooked back along it.
  curveStroke(c, (q) => { q.moveTo(pts[0], pts[1]); q.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); }, INK, 1.5);
  curveStroke(c, (q) => { q.moveTo(pts[0], pts[1]); q.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); }, css(PAINT.briar.body), 0.66);
  curveStroke(c, (q) => { q.moveTo(pts[0] + 0.15, pts[1] - 0.2); q.quadraticCurveTo(pts[2] + 0.15, pts[3] - 0.25, pts[4] + 0.1, pts[5] - 0.15); }, css(PAINT.briar.lit), 0.2);
  for (let i = 1; i <= 4; i++) {
    const u = i / 5;
    const x = (1 - u) * (1 - u) * pts[0] + 2 * u * (1 - u) * pts[2] + u * u * pts[4];
    const y = (1 - u) * (1 - u) * pts[1] + 2 * u * (1 - u) * pts[3] + u * u * pts[5];
    const tx = 2 * (1 - u) * (pts[2] - pts[0]) + 2 * u * (pts[4] - pts[2]);
    const ty = 2 * (1 - u) * (pts[3] - pts[1]) + 2 * u * (pts[5] - pts[3]);
    const tl = Math.hypot(tx, ty) || 1;
    const side = i % 2 ? 1 : -1;
    const nx = (-ty / tl) * side, ny = (tx / tl) * side;
    const bx = tx / tl, by = ty / tl;
    // A hooked thorn: wide at the cane, its point swept back down the cane.
    fillShape(c, shape([x - bx * 0.5, y - by * 0.5, x + bx * 0.45, y + by * 0.45,
      x + nx * 1.35 - bx * 0.55, y + ny * 1.35 - by * 0.55]), BONE_LT, INK, LWF);
  }
}
function rose(c, x, y, r, open, tilt) {
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  // Sepals, then the bloom: a cup of petals with the spiral wound into it.
  fillShape(c, shape([-r * 0.9, r * 0.5, -r * 0.2, r * 1.3, 0, r * 0.6, r * 0.2, r * 1.3, r * 0.9, r * 0.5]), css(PAINT.leaf.dark), INK, LWF);
  mass(c, [-r, -r, r * 2, r * 2], (p) => {
    p.moveTo(-r, 0);
    p.bezierCurveTo(-r, -r * (0.8 + open * 0.3), -r * 0.3, -r * 1.05, 0, -r * 0.7);
    p.bezierCurveTo(r * 0.3, -r * 1.05, r, -r * (0.8 + open * 0.3), r, 0);
    p.bezierCurveTo(r, r * 0.8, -r, r * 0.8, -r, 0);
    p.closePath();
  }, { ...PAINT.rose, rim: 0.35, dabs: 0.6, dab: 0.35 }, (p) => {
    curveStroke(p, (q) => {
      q.moveTo(-r * 0.5, -r * 0.1);
      q.quadraticCurveTo(0, -r * 0.6, r * 0.45, -r * 0.15);
      q.quadraticCurveTo(r * 0.2, r * 0.35, -r * 0.15, r * 0.05);
    }, RED_DK, 0.26);
  }, LWI + 0.06);
  c.restore();
}
function graveRoses(c, w, h, t) {
  const f = frameOf(t, 8, 6), g = h - 2;
  const nod = Math.sin((f / 8) * TAU);
  // Leaves first, behind the canes.
  for (const [x, y, a] of [[5.6, g - 4.6, -2.4], [13.6, g - 6.4, -0.7], [9.2, g - 2.6, -2.9], [16.6, g - 3.2, -0.3]]) {
    mass(c, [x - 1.6, y - 1.6, 3.2, 3.2], oval(x, y, 1.45, 0.72, a), { ...PAINT.leaf, rim: 0.3, dabs: 0.3 }, null, LWI);
  }
  // The canes: arching up out of the road and back down into it.
  thornyCane(c, [0.6, g + 1, 3.0 + nod * 0.2, g - 13.6, 9.6, g - 4.6]);
  thornyCane(c, [6.4, g + 1, 11.2, g - 15.4 + nod * 0.3, 19.6, g - 1.0]);
  thornyCane(c, [10.6, g + 1, 13.6, g - 7.4, 15.8, g + 1]);
  thornyCane(c, [3.4, g + 1, 6.4, g - 5.6, 8.4, g + 1]);
  // The roses: one open on each long cane, a bud on the short one, nodding.
  rose(c, 4.9 + nod * 0.25, g - 8.6, 1.9, 1, -0.25 + nod * 0.06);
  rose(c, 12.4 + nod * 0.3, g - 9.4, 2.15, 1, 0.2 + nod * 0.08);
  rose(c, 16.0, g - 4.0, 1.3, 0, 0.5);
  // A petal let go, drifting down on the back half of the ring.
  if (f >= 4) {
    const k = (f - 4) / 4;
    c.save();
    c.translate(13.6 + k * 2.4, g - 8.0 + k * 5.2);
    c.rotate(k * 2.4);
    fillShape(c, oval(0, 0, 0.62, 0.34), RED, INK, LWF);
    c.restore();
  }
}

// C — RUNAWAY COFFIN on an undertaker's truck (barrel 17x23, tall 1.35)
// Stood on end on a two-wheeled sack truck and coming at you upright, leaning
// back on its wheel the way a loaded truck runs; the lid works open a crack and
// something inside has red eyes. Kick it into a zombie, as the barrel was.
const LID_OPEN = [0, 0, 0, 0, 0, 0, 0.4, 1, 1, 1, 0.6, 0];
function coffinTruck(c, w, h, t) {
  const f = frameOf(t, 12, 10), g = h - 0.2;
  const open = LID_OPEN[f];
  const rock = [0, 0.3, 0, -0.2, 0, 0.25, 0, -0.15, 0, 0.3, 0, -0.2][f];
  const WX = 12.6, WR = 2.5, WY = g - WR;
  c.save();
  // The whole rig sits a step left in its envelope: the lean carries the grips right.
  c.translate(-1.6, 0);
  c.save();
  // Lean back about the wheel's contact point, plus a jolt on the bumps.
  c.translate(WX, g);
  c.rotate(0.12 + rock * 0.03);
  c.translate(-WX, -g);
  // The truck: two rails rising behind the coffin to the grips, a toe plate under its foot.
  limb(c, [[13.0, g - 2.6], [14.6, 1.4]], css(PAINT.iron.body), 0.7);
  fillShape(c, rrect(13.6, 0.2, 2.4, 1.2, 0.5), css(PAINT.oak.dark), INK, LWI);
  // The coffin's depth on its moonlit side, then the inside it opens onto.
  const FACE = [5.0, 1.2, 10.2, 1.2, 12.2, 5.8, 10.6, 19.6, 4.6, 19.6, 3.0, 5.8];
  massPoly(c, [10.2, 1.2, 11.6, 0.5, 13.6, 5.1, 12.0, 18.9, 10.6, 19.6, 12.2, 5.8], { ...PAINT.rosewood, body: [112, 60, 62] });
  fillShape(c, shape(FACE), HOLLOW, INK, LWI);
  if (open > 0) {
    // Eyes in the gap the lid leaves on its free (right-hand) edge.
    dot(c, 11.15, 6.3, 0.42 * open, RED);
    dot(c, 12.05, 6.5, 0.38 * open, RED);
  }
  // The lid, swung open on its left-hand hinge by `open`.
  c.save();
  c.translate(-1.6 * open, 0);
  massPoly(c, FACE, PAINT.rosewood, (p) => {
    // Raised panel, brass cross, a plate.
    fillShape(p, shape([5.6, 3.0, 9.6, 3.0, 10.9, 6.2, 9.7, 17.8, 5.5, 17.8, 4.3, 6.2]), null, css(PAINT.rosewood.dark), 0.34);
    fillShape(p, (q) => { q.rect(7.05, 4.6, 1.1, 8.2); q.rect(5.4, 6.6, 4.4, 1.1); }, BRASS, INK, LWF);
    fillShape(p, rrect(6.2, 14.4, 2.8, 1.5, 0.4), BRASS_LT, INK, LWF);
  });
  c.restore();
  // Toe plate and the wheel at the back.
  fillShape(c, rrect(3.4, g - 3.2, 10.2, 0.9, 0.3), css(PAINT.iron.body), INK, LWI);
  c.restore();
  // The wheel turns under the lean, so it is drawn upright and on the ground.
  dot(c, WX, WY, WR, css(PAINT.iron.dark), INK, LW);
  dot(c, WX, WY, WR * 0.55, css(PAINT.iron.body));
  const a = (f / 12) * TAU;
  for (let k = 0; k < 3; k++) {
    const b = a + (k * TAU) / 3;
    stroke(c, [[WX, WY], [WX + Math.cos(b) * WR * 0.8, WY + Math.sin(b) * WR * 0.8]], css(PAINT.iron.lit), 0.32);
  }
  dot(c, WX, WY, 0.5, BRASS, INK, LWF);
  c.restore();
}

// D — RUNAWAY HEARSE WHEEL (barrel 17x17)
// Off the back of the hearse and rolling at you on its own: oxblood lacquer
// spokes and felloe with a gold line, an iron tyre catching the moon, a brass
// hub. Round, so the barrel's spin is right for it as shipped.
function hearseWheel(c, w, h, t) {
  const f = frameOf(t, 8, 14), g = h - 0.2;
  const cx = w / 2, R = 7.9, cy = g - R;
  const a = -(f / 8) * (TAU / 12); // one spoke-step per ring, rolling left
  // The iron tyre: a gouache mass ring.
  mass(c, [cx - R, cy - R, R * 2, R * 2], (p) => {
    p.moveTo(cx + R, cy);
    p.arc(cx, cy, R, 0, TAU);
    p.moveTo(cx + R - 1.1, cy);
    p.arc(cx, cy, R - 1.1, 0, -TAU, true);
    p.closePath();
  }, { ...PAINT.iron, rim: 0.45 });
  // The felloe, oxblood with its gold line.
  c.beginPath();
  c.arc(cx, cy, R - 1.8, 0, TAU);
  c.strokeStyle = INK; c.lineWidth = 1.9; c.stroke();
  c.strokeStyle = css(PAINT.lacquer.body); c.lineWidth = 1.2; c.stroke();
  c.beginPath();
  c.arc(cx, cy, R - 1.8, -1.6, 0.2);
  c.strokeStyle = css(PAINT.lacquer.lit); c.lineWidth = 0.35; c.stroke();
  c.beginPath();
  c.arc(cx, cy, R - 2.35, 0, TAU);
  c.strokeStyle = GOLD; c.lineWidth = 0.16; c.stroke();
  // Twelve spokes, tapering to the hub.
  for (let k = 0; k < 12; k++) {
    const b = a + (k * TAU) / 12;
    const ex = cx + Math.cos(b) * (R - 2.4), ey = cy + Math.sin(b) * (R - 2.4);
    stroke(c, [[cx, cy], [ex, ey]], INK, 1.15);
    stroke(c, [[cx, cy], [ex, ey]], css(k % 2 ? PAINT.lacquer.body : PAINT.lacquer.dark), 0.62);
  }
  // Hub and cap.
  dot(c, cx, cy, 2.0, BRASS_DK, INK, LWI);
  dot(c, cx, cy, 1.35, BRASS, INK, LWF);
  dot(c, cx + 0.35, cy - 0.35, 0.45, BRASS_LT);
  // Grit kicked up behind it where it bites the road.
  for (let i = 0; i < 2; i++) {
    const k = ((f + i * 4) % 8) / 8;
    dot(c, cx + 2.4 + k * 4.6, g - 0.6 - k * 2.2, 0.38 * (1 - k * 0.5), css(PAINT.soil.lit), INK, LWF);
  }
}

// E — PINE COFFINS, the undertaker's stock (stack 16x15)
// A plain pine coffin seen from above the lid, so its six-sided shape is the
// silhouette, with the white satin lining frilled out under the lid and brass
// handles down its side: the crate's job, and two high it is the coffin wall
// the crypt has never had. Now and then something inside knocks and the lid jumps.
const KNOCK = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0.6, 0, 0, 0, 0];
function pineCoffin(c, w, h, t) {
  const f = frameOf(t, 16, 8);
  const up = KNOCK[f];
  // The lid's outline: head toward the hero, shoulders a third along, the long taper to the foot.
  const HX = 1.0, SX = 5.0, FX = 15.2, YC = 6.4;
  const near = [HX, YC + 2.1, SX, YC + 4.0, FX, YC + 2.4];
  // The near side panel under the lid's near edge, three brass handles on it.
  const D = 4.2;
  massPoly(c, [...near, FX, YC + 2.4 + D, SX, YC + 4.0 + D, HX, YC + 2.1 + D], { ...PAINT.pine, body: [176, 128, 92], dark: [106, 70, 62], dabs: 0.25 }, (p) => {
    for (const [hx, hy] of [[3.0, 11.0], [8.2, 11.9], [12.8, 11.3]]) {
      fillShape(p, rrect(hx - 0.95, hy - 0.42, 1.9, 0.84, 0.42), BRASS, INK, LWF);
    }
  });
  // The satin lining, frilled out along the seam (it shows more when the lid jumps).
  c.beginPath();
  c.moveTo(near[0], near[1]);
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const x = HX + (FX - HX) * u;
    const y = x < SX ? near[1] + (near[3] - near[1]) * ((x - HX) / (SX - HX)) : near[3] + (near[5] - near[3]) * ((x - SX) / (FX - SX));
    c.lineTo(x, y + 0.55 + up * 0.6 + (i % 2 ? 0.35 : 0));
  }
  c.lineTo(FX, near[5] - 0.4);
  c.lineTo(HX, near[1] - 0.4);
  c.closePath();
  c.fillStyle = '#f4eef6';
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = LWF;
  c.stroke();
  // The lid.
  c.save();
  c.translate(0, -up);
  const LID = [HX, YC - 2.1, SX, YC - 4.0, FX, YC - 2.4, ...near.slice(4, 6), ...near.slice(2, 4), ...near.slice(0, 2)];
  massPoly(c, LID, { ...PAINT.pine, dabs: 0.25 }, (p) => {
    // A darker raised border, a plank seam, and the cross burnt in the lid.
    const INSET = [HX + 1.2, YC - 1.3, SX + 0.2, YC - 2.9, FX - 1.0, YC - 1.5, FX - 1.0, YC + 1.5, SX + 0.2, YC + 2.9, HX + 1.2, YC + 1.3];
    fillShape(p, shape(INSET), null, css(PAINT.pine.dark), 0.3);
    fillShape(p, (q) => { q.rect(8.6, YC - 0.45, 4.2, 0.9); q.rect(9.6, YC - 2.0, 0.9, 4.0); }, '#5a3a34', null);
  });
  c.restore();
  // The knock itself: two little ticks off the lid.
  if (up) {
    stroke(c, [[9.4, 1.9], [9.0, 0.7]], INK, 0.3);
    stroke(c, [[11.4, 1.9], [11.8, 0.7]], INK, 0.3);
  }
}

// F — OSSUARY CHEST, a box of the old bones (stack 16x15)
// Iron-strapped oak with a domed lid it can't shut: a femur and a rib stick out
// from under it, and through the grille a skull's eyes catch the light. The
// crate's box, the crypt's contents.
function ossuaryChest(c, w, h, t) {
  const f = frameOf(t, 12, 8), g = h - 0.2;
  // Bones jammed under the lid, behind it.
  limb(c, [[11.6, 4.6], [15.2, 0.9]], BONE, 1.0);
  dot(c, 15.2, 0.9, 0.85, BONE, INK, LWF);
  dot(c, 14.4, 0.6, 0.7, BONE, INK, LWF);
  curveStroke(c, (q) => { q.moveTo(2.4, 4.6); q.quadraticCurveTo(1.4, 1.4, 4.4, 0.9); }, INK, 1.1);
  curveStroke(c, (q) => { q.moveTo(2.4, 4.6); q.quadraticCurveTo(1.4, 1.4, 4.4, 0.9); }, BONE, 0.5);
  // The chest.
  massPoly(c, [0.8, 5.0, 15.2, 5.0, 15.2, g, 0.8, g], PAINT.oak, (p) => {
    stroke(p, [[0.8, 9.6], [15.2, 9.6]], css(PAINT.oak.dark), 0.24);
    // The grille, and the skull behind it.
    fillShape(p, rrect(4.9, 6.3, 6.2, 5.8, 0.6), HOLLOW, INK, LWI);
  });
  const lit = [1, 1, 0.8, 1, 1, 0.3, 0, 0.6, 1, 1, 0.9, 1][f];
  skull(c, 8.0, 9.3, 4.2, 0, lit);
  for (const bx of [6.0, 8.0, 10.0]) stroke(c, [[bx, 6.3], [bx, 12.1]], css(PAINT.iron.body), 0.42);
  // Iron straps over the oak.
  for (const sx of [2.2, 12.6]) {
    fillShape(c, (p) => p.rect(sx, 5.0, 1.3, g - 5.0), css(PAINT.iron.body), INK, LWI);
    for (const ry of [6.4, g - 1.4]) dot(c, sx + 0.65, ry, 0.28, css(PAINT.iron.lit));
  }
  // The domed lid, sitting proud on the bones.
  mass(c, [0.3, 1.8, 15.6, 3.8], (p) => {
    p.moveTo(0.3, 5.4);
    p.lineTo(0.3, 3.4);
    p.quadraticCurveTo(8, 0.9, 15.7, 3.4);
    p.lineTo(15.7, 5.4);
    p.closePath();
  }, PAINT.oak, (p) => {
    // The straps carry on over the dome.
    p.fillStyle = css(PAINT.iron.body);
    for (const sx of [2.2, 12.6]) p.fillRect(sx, 0, 1.3, 6);
  });
  // The hasp and its padlock.
  fillShape(c, rrect(7.3, 4.4, 1.4, 1.8, 0.3), BRASS, INK, LWF);
}

// G — ETERNAL FLAME, the memorial urn (brazier 16x29)
// The brazier's job in the graveyard's own furniture: a stone tazza on a
// plinth in the lane headstone's stone, ivy up its side, the flame in the bowl
// lighting the stone from above. Still the one hazard that is also a light.
function eternalFlame(c, w, h, t) {
  const f = frameOf(t, 8, 12), g = h - 0.2;
  const p = (f / 8) * TAU;
  const bowl = 12.8;
  glow(c, 8, bowl - 3, 7.8, 9.6, 0.34);
  // The plinth: base moulding, shaft, cap.
  massPoly(c, [2.4, g, 2.6, g - 2.0, 13.4, g - 2.0, 13.6, g], PAINT.stone);
  massPoly(c, [3.6, g - 2.0, 3.6, 18.4, 12.4, 18.4, 12.4, g - 2.0], PAINT.stone, (q) => {
    // The plaque, and the light from the fire running down the shaft's face.
    fillShape(q, rrect(5.4, 20.6, 5.2, 3.4, 0.4), BRASS_DK, INK, LWF);
    stroke(q, [[6.2, 21.8], [9.8, 21.8]], BRASS_LT, 0.26);
    stroke(q, [[6.2, 23.0], [9.0, 23.0]], BRASS_LT, 0.2);
    q.fillStyle = css(WARM, 0.22);
    q.fillRect(3.6, 18.4, 8.8, 1.6);
  });
  massPoly(c, [2.8, 18.6, 2.8, 17.0, 13.2, 17.0, 13.2, 18.6], PAINT.stone, (q) => {
    q.fillStyle = css(WARM, 0.45);
    q.fillRect(2.8, 17.0, 10.4, 0.6);
  });
  // Ivy up the left of the shaft.
  curveStroke(c, (q) => { q.moveTo(4.2, g - 1.8); q.bezierCurveTo(2.8, 24, 5.0, 21.6, 3.8, 18.8); }, css(PAINT.leaf.dark), 0.3);
  for (const [x, y, a] of [[3.6, 25.4, -2.6], [4.6, 22.6, -0.6], [3.4, 20.2, -2.8], [5.0, 26.6, -0.4]]) {
    mass(c, [x - 1.2, y - 1.2, 2.4, 2.4], oval(x, y, 1.05, 0.6, a), { ...PAINT.leaf, rim: 0.25, dabs: 0.2 }, null, LWF + 0.06);
  }
  // The tazza: stem and bowl.
  massPoly(c, [6.6, 17.0, 7.0, 15.4, 9.0, 15.4, 9.4, 17.0], PAINT.stone, null, LWI);
  mass(c, [1.8, bowl - 1.0, 12.4, 3.6], (q) => {
    q.moveTo(1.8, bowl);
    q.lineTo(14.2, bowl);
    q.quadraticCurveTo(13.2, bowl + 2.8, 9.0, 15.6);
    q.lineTo(7.0, 15.6);
    q.quadraticCurveTo(2.8, bowl + 2.8, 1.8, bowl);
    q.closePath();
  }, PAINT.stone, (q) => {
    q.fillStyle = css(WARM, 0.35);
    q.fillRect(1.8, bowl, 12.4, 0.9);
  });
  // The coals in the bowl's mouth, then the fire on them.
  fillShape(c, oval(8, bowl, 6.0, 0.9), '#3a1c22', INK, LWI);
  for (let i = 0; i < 4; i++) {
    const heat = 0.5 + 0.5 * Math.sin(p * 2 + i * 1.6);
    dot(c, 4.6 + i * 2.25, bowl - 0.1, 0.55, heat > 0.6 ? GOLD : EMBER);
  }
  flame(c, 8, bowl - 0.2, 9.4, 11.4, p, 0);
  // Sparks going up out of it.
  for (let i = 0; i < 2; i++) {
    const k = ((f + i * 4) % 8) / 8;
    dot(c, 8 + Math.sin(k * 5 + i * 2) * 2.4, bowl - 9 - k * 3.4, 0.32 * (1 - k * 0.6), FLAME);
  }
}

// H — TABLE TOMB, a slab on two legs across the path (hurdle 21x12)
// The old ledger stone raised on balusters, which is a hurdle already: open
// underneath, and in the dark under it a pair of red eyes that blink and follow
// you over. The razor hurdle's jump, made of churchyard.
const PEEK = [0, 0, 0.3, 0.6, 0.8, 1, 1, 1, 0.4, 1, 1, 1, 0.9, 0.7, 0.4, 0.1];
const BLINK = [1, 1, 1, 1, 1, 1, 1, 1, 0.15, 1, 1, 1, 1, 1, 1, 1];
function tableTomb(c, w, h, t) {
  const f = frameOf(t, 16, 8), g = h - 0.2;
  // The dark under the slab: deepest at the top, open to the road below.
  const sh = c.createLinearGradient(0, 5.6, 0, g);
  sh.addColorStop(0, 'rgba(14,10,24,0.96)');
  sh.addColorStop(0.7, 'rgba(14,10,24,0.7)');
  sh.addColorStop(1, 'rgba(14,10,24,0.3)');
  c.fillStyle = sh;
  c.fillRect(4.6, 5.6, 11.8, g - 5.6);
  // Eyes in it, sliding round to watch the hero go over.
  const ex = 11.4 - PEEK[f] * 2.6, ey = 8.4, op = BLINK[f];
  glow2(c, ex + 1.3, ey, 3.2, op);
  fillShape(c, oval(ex, ey, 1.05, 0.8 * op, -0.15), RED);
  fillShape(c, oval(ex + 2.6, ey + 0.1, 0.98, 0.74 * op, 0.15), RED);
  if (op > 0.5) { dot(c, ex - 0.25, ey - 0.2, 0.24, '#ffd8c8'); dot(c, ex + 2.35, ey - 0.1, 0.22, '#ffd8c8'); }
  // The two balusters, each on its block.
  for (const lx of [3.6, 17.4]) {
    massPoly(c, [lx - 2.2, g, lx - 2.0, g - 1.8, lx + 2.0, g - 1.8, lx + 2.2, g], PAINT.stone, null, LWI + 0.08);
    mass(c, [lx - 1.7, 5.6, 3.4, g - 7.4], (q) => {
      q.moveTo(lx - 1.2, 5.8);
      q.lineTo(lx + 1.2, 5.8);
      q.quadraticCurveTo(lx + 0.4, 7.0, lx + 1.6, 8.8);
      q.quadraticCurveTo(lx + 1.4, 10.0, lx + 1.2, g - 1.8);
      q.lineTo(lx - 1.2, g - 1.8);
      q.quadraticCurveTo(lx - 1.4, 10.0, lx - 1.6, 8.8);
      q.quadraticCurveTo(lx - 0.4, 7.0, lx - 1.2, 5.8);
      q.closePath();
    }, PAINT.stone, null, LWI + 0.08);
  }
  // The slab: a moulded lip over a deep front, its inscription either side of a
  // carved death's head, moss along the top.
  massPoly(c, [0.6, 2.4, 20.4, 2.4, 20.0, 6.0, 1.0, 6.0], PAINT.stone, (q) => {
    stroke(q, [[3.4, 3.8], [7.8, 3.8]], STONE_DK, 0.3);
    stroke(q, [[3.4, 4.9], [6.8, 4.9]], STONE_DK, 0.3);
    stroke(q, [[13.2, 3.8], [17.6, 3.8]], STONE_DK, 0.3);
    stroke(q, [[14.2, 4.9], [17.6, 4.9]], STONE_DK, 0.3);
  });
  skull(c, 10.5, 4.3, 2.8, 0, 1);
  massPoly(c, [0.2, 1.0, 20.8, 1.0, 20.8, 2.4, 0.2, 2.4], PAINT.stone, null, LWI + 0.08);
  for (let i = 0; i < 7; i++) {
    const mx = 1.6 + i * 2.9 + (i % 2) * 0.6;
    fillShape(c, oval(mx, 1.0, 1.0 + (i % 3) * 0.25, 0.42), css(i % 2 ? PAINT.leaf.body : PAINT.leaf.dark), INK, LWF);
  }
}

// I — HAUNTED CANDELABRA, floating at head height (low 22x21, tall 1.7)
// Three candles on a brass candelabrum that nobody is holding, adrift in the
// dark where the drone would hang: slide under the flames. It lights itself,
// so it reads before the lane round it does. Wax drips; a ghost-trail under it.
function candelabra(c, w, h, t) {
  const f = frameOf(t, 8, 12), g = h;
  const p = (f / 8) * TAU;
  const sway = Math.sin(p) * 0.05;
  // The trail it floats on: a pale wisp off the foot, fading back and down.
  const tr = c.createLinearGradient(0, g - 1.6, 0, g);
  tr.addColorStop(0, 'rgba(206,214,246,0.45)');
  tr.addColorStop(1, 'rgba(206,214,246,0)');
  c.fillStyle = tr;
  c.beginPath();
  c.moveTo(9.6, g - 1.6);
  c.quadraticCurveTo(11.6 + Math.sin(p) * 1.0, g - 0.6, 16.4 + Math.sin(p + 1) * 0.8, g);
  c.lineTo(12.0, g);
  c.quadraticCurveTo(11.4, g - 0.8, 12.4, g - 1.6);
  c.closePath();
  c.fill();
  c.save();
  c.translate(11, g - 2);
  c.rotate(sway);
  c.translate(-11, -(g - 2));
  glow(c, 11, 7.6, 10.2, 6.8, 0.32);
  // The candelabrum: foot, stem with a knop, two arms swept up to the cups.
  const Y = g - 1.5; // the underside of the foot: the lowest ink, where the drone's would be
  mass(c, [7.6, Y - 2.6, 6.8, 2.8], (q) => {
    q.moveTo(7.8, Y);
    q.quadraticCurveTo(8.6, Y - 2.4, 11, Y - 2.6);
    q.quadraticCurveTo(13.4, Y - 2.4, 14.2, Y);
    q.closePath();
  }, PAINT.brass, null, LWI + 0.08);
  limb(c, [[11, Y - 2.4], [11, 9.6]], BRASS, 0.9);
  fillShape(c, oval(11, Y - 4.6, 1.2, 0.8), BRASS, INK, LWI);
  for (const s of [-1, 1]) {
    curveStroke(c, (q) => { q.moveTo(11, 12.4); q.bezierCurveTo(11 + s * 2.4, 15.2, 11 + s * 7.2, 14.6, 11 + s * 7.2, 9.8); }, INK, 1.5);
    curveStroke(c, (q) => { q.moveTo(11, 12.4); q.bezierCurveTo(11 + s * 2.4, 15.2, 11 + s * 7.2, 14.6, 11 + s * 7.2, 9.8); }, BRASS, 0.75);
    curveStroke(c, (q) => { q.moveTo(11.3, 12.1); q.bezierCurveTo(11 + s * 2.4, 14.6, 11 + s * 6.8, 14.0, 11.3 + s * 7.0, 10.2); }, BRASS_LT, 0.2);
  }
  // Drip cups and candles: the middle one tallest.
  for (const [x, top] of [[3.8, 6.4], [11, 5.0], [18.2, 6.8]]) {
    fillShape(c, rrect(x - 1.7, 9.4, 3.4, 1.0, 0.4), BRASS, INK, LWI);
    mass(c, [x - 1.0, top, 2.0, 9.6 - top], rrect(x - 1.0, top, 2.0, 9.6 - top, 0.3), { ...PAINT.wax, rim: 0.35, dabs: 0.2 }, (q) => {
      fillShape(q, (r) => { r.moveTo(x - 1.1, top + 0.2); r.lineTo(x - 0.2, top + 0.2); r.quadraticCurveTo(x - 0.4, top + 2.4, x - 0.7, top + 2.0); r.closePath(); }, css(PAINT.wax.lit));
    }, LWI + 0.06);
    stroke(c, [[x, top], [x, top - 0.7]], INK, 0.22);
    flame(c, x, top - 0.4, 2.2, 4.4, p, x);
  }
  // A drip leaving the left candle's cup on the ring.
  if (f >= 3 && f <= 6) dot(c, 2.4, 10.6 + (f - 3) * 1.6, 0.34, css(PAINT.wax.body), INK, LWF);
  c.restore();
}

// J — DEATH'S HEAD, the winged skull off the old stones (high 22x13)
// The carving every old headstone wears, flown loose: a skull between two
// feathered wings, beating in at head height with its jaw chattering. A thing
// of the graveyard rather than another animal, and nothing like it flies here.
const FLAP = [-1, -0.6, 0, 0.6, 1, 0.6, 0, -0.6];
function deathsHead(c, w, h, t) {
  const f = frameOf(t, 8, 12);
  const up = FLAP[f]; // -1 wings up, 1 wings down
  const jaw = f % 2 ? 0.9 : 0;
  // Speed lines behind it, chasing away to the right.
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 3) % 8) / 8;
    stroke(c, [[18.6 + k * 2.4, 3.6 + i * 2.6], [20.4 + k * 2.4, 3.6 + i * 2.6]], 'rgba(226,230,252,0.55)', 0.3);
  }
  for (const s of [-1, 1]) {
    // A wing: a broad fan of four feathers from the shoulder at the skull's side,
    // the leading edge arched, the trailing edge sagging into scallops.
    const sx = 11 + s * 2.6, sy = 5.6;
    const tipX = 11 + s * 10.4, tipY = 5.0 + up * 4.2;
    const trail = (u) => {
      // From the tip (u = 0) back to the shoulder's underside (u = 1), sagging.
      const x = tipX + (sx - tipX) * u;
      const y = tipY + 0.4 + (sy + 2.6 - tipY - 0.4) * u + 2.6 * Math.sin(Math.PI * u);
      return [x, y];
    };
    mass(c, [Math.min(sx, tipX) - 1, 0, Math.abs(tipX - sx) + 2, 13], (q) => {
      q.moveTo(sx, sy - 1.8);
      q.quadraticCurveTo((sx + tipX) / 2, sy - 3.6 + up * 2.6, tipX, tipY - 0.6);
      const n = 4;
      for (let k = 1; k <= n; k++) {
        const [fx, fy] = trail(k / n);
        const [mx, my] = trail((k - 0.5) / n);
        q.quadraticCurveTo(mx - s * 0.3, my + 1.6, fx, fy);
      }
      q.closePath();
    }, PAINT.wing, (q) => {
      // The feather splits, and a band of darker coverts along the leading edge.
      for (let k = 1; k < 4; k++) {
        const [fx, fy] = trail(k / 4);
        stroke(q, [[sx + (tipX - sx) * 0.18, sy - 0.6], [fx, fy - 0.2]], css(PAINT.wing.dark), 0.26);
      }
    });
  }
  skull(c, 11, 6.0, 7.4, jaw, 1);
}

// ============================================================== the sheet
export const BAKEOFF = {
  cabinet: 'crypt',
  title: 'CRYPT SHIFT — obstacles for the graveyard (bake-off)',
  note: 'Crypt’s own cast stays — the slab headstone, the three zombies, the animals — and the brazier fits the world. '
    + 'What it borrows from the shared set does not: the industrial spike plate with its yellow-and-black stripe, the brown '
    + 'barrel (rolling at you in crypt-2/3 and the one you kick into a zombie in the catacomb), and the crate, which every '
    + 'crypt stage excludes, so the bank’s stack shapes never play here. Ten graveyard things in the backdrop’s gouache — '
    + 'dabbed body, moonlit rim — with the lane cast’s ink round each so they read as hazards, not scenery: replacements '
    + 'first, then a hurdle, a slide and a flyer the cabinet has never had. Pick letters.',
  // One strip of the real frame per entry; stageIndex and camX pick the scenery,
  // and `bc.progress` past 0.58 puts the third under the eclipse's night veil.
  strips: [
    { label: 'CRYPT SHIFT 1', stageIndex: 1, camX: 600 },
    { label: 'CRYPT SHIFT 2', stageIndex: 2, camX: 1400 },
    { label: 'CRYPT SHIFT 3 · ECLIPSE', stageIndex: 3, camX: 2200, bc: { progress: 0.7 } },
  ],
  // The detail row's panels: the fogged hill behind the lane, the dark near bank,
  // and the eclipse — over the lane's violet road and its soil.
  swatches: [
    { sky: '#5d6190', ground: '#3a3048', under: '#281c30' },
    { sky: '#251d3a', ground: '#3a3048', under: '#281c30' },
    { sky: '#141022', ground: '#241c2e', under: '#18111f' },
  ],
  // What the cabinet deals today, through the real run painter: [type, x]. No
  // crate — the crypt stages exclude it.
  control: [['tombstone', 8], ['zombie', 28], ['brazier', 80], ['popSpikes', 100], ['barrel', 124], ['dogFeral', 146], ['catFury', 178], ['cryptPanther', 204]],
  candidates: [
    { letter: 'A', id: 'graveHands', name: 'GRAVE HANDS', slot: 'floor', paint: graveHands,
      note: 'Two bony hands clawing up out of turned soil, closing on the air where your foot goes. Replaces the spike plate. A hand out of the hill was offered twice as scenery; this is its first time in the lane.' },
    { letter: 'B', id: 'graveRoses', name: 'GRAVE ROSES', slot: 'floor', paint: graveRoses,
      note: 'A grave’s rose bush run wild across the path: hooked thorns on moonlit canes, three blood-red roses, a petal falling. Replaces the spike plate; the thorns are the teeth.' },
    { letter: 'C', id: 'coffinTruck', name: 'RUNAWAY COFFIN', slot: 'barrel', tall: 1.35, paint: coffinTruck,
      note: 'A rosewood coffin stood on an undertaker’s sack truck, leaning back on its wheel; the lid works open and red eyes look out. Replaces the barrel, catacomb kicks included. Proposes tall 1.35; rides UPRIGHT (a port adds a glide).' },
    { letter: 'D', id: 'hearseWheel', name: 'HEARSE WHEEL', slot: 'barrel', paint: hearseWheel,
      note: 'Off the back of the hearse and rolling at you on its own: oxblood spokes with a gold line, an iron tyre, a brass hub. Replaces the barrel and keeps its spin as shipped — the one roller here that needs no port change.' },
    { letter: 'E', id: 'pineCoffin', name: 'PINE COFFINS', slot: 'stack', paint: pineCoffin,
      note: 'The undertaker’s plain stock, lid up, brass handles; now and then something knocks and the lid jumps. In place of the excluded crate, so the stack patterns come back — shown single and two high.' },
    { letter: 'F', id: 'ossuaryChest', name: 'OSSUARY CHEST', slot: 'stack', paint: ossuaryChest,
      note: 'Iron-strapped oak that won’t shut on its bones — a femur and a rib under the lid, a skull behind the grille whose eyes catch the light. The other stacker.' },
    { letter: 'G', id: 'eternalFlame', name: 'ETERNAL FLAME', slot: 'brazier', paint: eternalFlame,
      note: 'The brazier in the graveyard’s own furniture: a stone tazza on a plinth in the lane headstone’s stone, ivy, a brass plate, the fire lighting the stone from above. Still the light source.' },
    { letter: 'H', id: 'tableTomb', name: 'TABLE TOMB', slot: 'hurdle', paint: tableTomb,
      note: 'A ledger slab raised on two balusters, mossy on top — and under it, in the dark, red eyes that blink and follow you over. A hurdle the crypt has never dealt.' },
    { letter: 'I', id: 'candelabra', name: 'HAUNTED CANDELABRA', slot: 'low', tall: 1.7, paint: candelabra,
      note: 'Three lit candles on a brass candelabrum nobody holds, adrift at head height on a pale trail: slide under. Lights itself, so it reads in the dark. Proposes tall 1.7. New to crypt.' },
    { letter: 'J', id: 'deathsHead', name: 'DEATH’S HEAD', slot: 'high', paint: deathsHead,
      note: 'The winged skull carved on every old headstone, flown loose: feathered wings beating, jaw chattering, beating in at head height. A non-animal flyer; nothing flies in crypt today.' },
  ],
};

export { frameOf };
