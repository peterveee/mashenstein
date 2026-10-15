// CRYPT lane obstacles picked from the 12 Oct 2026 bake-off (15 Oct 2026; see
// src/dev/crypt-obstacle-candidates.js for the sheet and the ones not picked). Moved here
// verbatim from the candidate module, which now imports its palette and helpers back.
// Every painter is authored in its PAINTED ENVELOPE in world units — box x 4/3 x
// PROP_TALL x PROP_VISUAL_SCALE — with the ground at y = h, on a clock `t` it quantises
// to its own ring; the registry below hands it frame/fps and scales the envelope onto
// the raster props.js gives it. Like officeProps.js, nothing here imports props.js.
import { GOUACHE_KIT as K } from '../engine/stylePacks/cryptGouache.js';

const { css, mix, shade, rng } = K;

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;

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
  // The coals heaped over the rim, then the fire on them — side-on, not seen from
  // above (15 Oct 2026: everything in the lane is flat).
  fillShape(c, (q) => { q.moveTo(2.2, bowl); q.quadraticCurveTo(8, bowl - 1.6, 13.8, bowl); q.closePath(); }, '#3a1c22', INK, LWI);
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

// The candidate sheet (src/dev) paints the rest of its line-up with these.
export {
  TAU, INK, LW, LWI, LWF, PAINT, BONE, BONE_LT, BONE_DK, STONE_DK, BRASS, BRASS_LT, BRASS_DK, RED, RED_DK, HOLLOW, WARM, GOLD, FLAME, ORANGE, EMBER, mass, shape, oval, rrect, boxOf, massPoly, fillShape, stroke, curveStroke, limb, dot, glow, glow2, flame, skull, GRAB, boneHand, graveHands, thornyCane, rose, graveRoses, eternalFlame,
};

// ------------------------------------------------------------------ registry
// type id -> box (the slot's), PROP_TALL, the painter's own frame ring.
export const CRYPT_PROP_SPECS = {
  graveHands: { box: [15, 7], tall: 1.75, frames: 8, fps: 8, paint: graveHands },
  graveRoses: { box: [15, 7], tall: 1.75, frames: 8, fps: 6, paint: graveRoses },
  eternalFlame: { box: [12, 14], tall: 1.55, frames: 8, fps: 12, paint: eternalFlame },
};
