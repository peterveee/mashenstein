// THE BOBCAT — Speed Zone's lane closer, in the bruiser dog's place. Shipped 28 Sep 2026
// from the desert cat bake-off (src/dev/desert-cat-candidates.js, gallery-only): Peter
// asked for "a new dog style similar to the existing ones but relevant for a desert,
// like a cougar or bobcat? the style should be the lane style, NOT MCM", picked the
// bobcat ("i like B"), then the sleek STREAK build of him ("i am leaning towards streak")
// and, since the streak read small in the bruiser's box, the 1.35x size on its own box
// ("L2 please"). The bake-off and every losing take stay in the lab file, which imports
// its rig from here.
//
// THE KENNEL'S HAND (sprites/dogs.js). ONE silhouette: every visible part — tail, torso,
// neck, cheek ruff, head, jaw, open mouth, near legs, near ear — is stroked ONCE as a
// single path at twice the line and then filled, so the only ink is the outside of the
// animal; the far legs and far ear are a second, darker silhouette behind. Flat tones
// and the bobcat's own markings are clipped inside.
//
// THE DOGS' GALLOP, AS A CAT. The same eight keys (extended flight -> fore lead lands ->
// fores carry -> fores push -> GATHERED flight -> hinds land -> hinds carry -> hinds
// drive off) through a periodic Catmull-Rom, with two-bone IK on a fixed bend side per
// joint. What makes it a cat: the spine shortens and the back rounds hard as he gathers
// and stretches flat as he extends; the rump rides high on longer hinds; the head stays
// level while the body pumps under it. The STREAK build carries all of that long and
// low: the belly near the road, the head thrust forward on the line of the back, ears
// half back, a long reaching stride with little bounce.
//
// ON ITS OWN BOX. The bruiser's 15x10 box could only hold this cat by shrinking him, so
// he has his own (BOBCAT_BOX, 29x13) that covers his head and body over the whole
// stride; the tail, ear tufts and reaching legs overhang it, as a dog's legs do. The art
// is laid out CENTRED on that box — the head-and-body centre on the raster's centre
// line, the tail in the spare room behind — because drawWorldEntity centres a prop's
// art on its box. BOBCAT_VISUAL / BOBCAT_TALL are the table numbers that size the art
// round it.
//
// Authored FACING RIGHT in world units, feet on y 0, then mirrored: obstacles arrive
// from the right, and world props are never flipped at draw time. Deterministic: every
// pose is a function of the frame index only.

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
const FRAMES = 8;

// The kennel's contour and mouth colours (sprites/dogs.js), unchanged.
const LINE = 0.26;
const INK = 'rgba(26,16,40,0.52)';
const MOUTH = '#5a1422';
const TONGUE = '#e2607a';
const TOOTH = '#fbf6ec';

// --------------------------------------------------------------- the gallop
// Feet relative to the shoulder (fore) or hip (hind), in units of the leg length L; y is
// lift above the ground. Angles are the lowest segment's direction — fore: carpus ->
// foot, hind: foot -> hock — in degrees, canvas convention. The dogs' keys exactly.
const GAIT = {
  foreX: [0.60, 0.46, 0.06, -0.32, -0.46, -0.14, 0.24, 0.54],
  foreY: [0.26, 0.00, 0.00, 0.03, 0.42, 0.62, 0.55, 0.40],
  foreA: [72, 84, 92, 116, 196, 238, 160, 96],
  hindX: [-0.64, -0.50, -0.26, 0.12, 0.42, 0.42, 0.04, -0.40],
  hindY: [0.28, 0.52, 0.62, 0.46, 0.22, 0.00, 0.00, 0.03],
  hindA: [-38, -5, 25, -55, -98, -104, -96, -62],
  lift: [0.10, 0.03, -0.06, 0.00, 0.09, 0.01, -0.05, 0.03],
  pitch: [0.00, -0.05, -0.08, -0.03, 0.03, 0.07, 0.05, 0.02],
  flex: [0.00, 0.15, 0.42, 0.78, 1.00, 0.80, 0.48, 0.14],
  gape: [1.00, 0.80, 0.30, 0.12, 0.40, 0.70, 0.85, 0.95],
  nod: [0.00, 0.35, 0.80, 0.45, -0.20, -0.55, -0.35, -0.10],
};
// Periodic Catmull-Rom through the keys: a continuous phase passes through every key.
function cyc(keys, p) {
  const n = keys.length;
  const x = (((p % 1) + 1) % 1) * n;
  const i = Math.floor(x), f = x - i;
  const k0 = keys[(i - 1 + n) % n], k1 = keys[i % n], k2 = keys[(i + 1) % n], k3 = keys[(i + 2) % n];
  return 0.5 * ((2 * k1) + (-k0 + k2) * f + (2 * k0 - 5 * k1 + 4 * k2 - k3) * f * f
    + (-k0 + 3 * k1 - 3 * k2 + k3) * f * f * f);
}
// Two-bone IK with a FIXED bend side: +1 puts the joint on the left of a->b.
function ik(ax, ay, bx, by, l1, l2, side) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.hypot(dx, dy) || 1e-4;
  const dd = Math.min(d, (l1 + l2) * 0.998);
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d, uy = dy / d;
  return { x: ax + ux * a + uy * h * side, y: ay + uy * a - ux * h * side };
}

// ------------------------------------------------------------------ the build
// World units, facing right, ground at y 0 (the dogs' BREEDS keys where they mean the
// same thing). The bake-off's bobcat (B), redrawn (B+), in the STREAK build (S3):
//   hipUp   the rump carried higher than the withers; hindK hind leg over fore length
//   flexK   how much the spine shortens gathered; flexArch how far the back rounds
//   low     the body carried nearer the road (fraction of L)
//   liftK / pitchK / nodK   the bounce, the rock and the head's nod, against the dogs'
//   earBack the ears pinned back (0 up .. 1 flat); gape0 / gapeK the mouth
//   bobAng / bobLen   the bob's carry and length; spotK the coat's spot size
export const BOBCAT_BUILD = {
  L: 6.2, spine: 9.6, cx: -0.5, low: 0.12,
  chestUp: 2.15, chestDown: 2.2, chestRx: 2.35,
  rumpUp: 2.2, rumpDown: 1.65, rumpRx: 2.5, tuck: 1.0, pouch: 0.1, arch: 0.15,
  flexArch: 1.25, flexK: 0.22, hipUp: 0.35, hindK: 1.12, stride: 1.18,
  liftK: 0.55, pitchK: 0.6, nodK: 0.5,
  neckLen: 2.7, neckAng: -12, neckW: 2.7, headR: 2.15, muzzle: 1.05, muzzleH: 1.7,
  ear: 'tufted', earLen: 1.95, earBack: 0.55, tail: 'bob', bobAng: -2.55, ruff: 1,
  legW: [1.8, 1.0, 0.85], pawR: 0.92, teeth: 1.0, gape0: 0.0, gapeK: 1.0, spotK: 0.9,
  pal: {
    coat: '#c29a68', far: '#7e6043', shade: '#a07c52', saddle: '#b08758',
    mark: '#f7f0e2', markShade: '#ddd1bb', dark: '#211712', ear: '#2a1d16',
    spot: '#4e3322', nose: '#c06e62', eye: '#e8c43c',
  },
  marks: 'bobcat', rev: 2,
};

// ------------------------------------------------------------------- the pose
function pose(B, phase) {
  const G = B.gait || GAIT;
  const L = B.L;
  const g = (k) => cyc(G[k], phase);
  const lift = g('lift') * (B.liftK ?? 1);
  const flex = g('flex');
  const pitch = g('pitch') * (B.pitchK ?? 1);
  // The spine shortens as the cat gathers; the back rounds (arch) as it does.
  const spine = B.spine * (1 - (B.flexK ?? 0.14) * flex);
  const arch = B.arch + flex * B.flexArch;
  const baseY = -(L * (0.96 - (B.low || 0)) + lift * L);
  const half = spine / 2;
  const S0 = { x: B.cx + half * Math.cos(pitch), y: baseY - half * Math.sin(pitch) };
  const H0 = { x: B.cx - half * Math.cos(pitch), y: baseY + half * Math.sin(pitch) - (B.hipUp || 0) };
  const leg = (root, isFore, off) => {
    const p = phase + off;
    const fx = root.x + (isFore ? cyc(G.foreX, p) : cyc(G.hindX, p)) * L * (B.stride || 1);
    const fy = -Math.max(0, isFore ? cyc(G.foreY, p) : cyc(G.hindY, p)) * L;
    const ang = isFore ? cyc(G.foreA, p) : cyc(G.hindA, p);
    if (isFore) {
      const a3 = L * 0.17, a1 = L * 0.47, a2 = L * 0.44;
      // carpus -> foot points along `ang`; the elbow breaks toward the tail.
      const C = { x: fx - Math.cos(ang * DEG) * a3, y: fy - Math.sin(ang * DEG) * a3 };
      const E = ik(root.x, root.y, C.x, C.y, a1, a2, -1);
      return { root, mid: E, low: C, foot: { x: fx, y: fy }, fore: true };
    }
    const hk = B.hindK || 1;
    const b3 = L * 0.34 * hk, b1 = L * 0.50 * hk, b2 = L * 0.50 * hk;
    // foot -> hock points along `ang`; the stifle breaks toward the nose.
    const Hk = { x: fx + Math.cos(ang * DEG) * b3, y: fy + Math.sin(ang * DEG) * b3 };
    const K = ik(root.x, root.y, Hk.x, Hk.y, b1, b2, 1);
    return { root, mid: K, low: Hk, foot: { x: fx, y: fy }, fore: false };
  };
  // A cat's head rides level while the body pumps under it: the nod is damped.
  const nod = g('nod') * (B.nodK ?? 0.5);
  const neckAng = (B.neckAng + nod * 6) * DEG - pitch;
  const Hc = {
    x: S0.x + Math.cos(neckAng) * B.neckLen,
    y: S0.y + Math.sin(neckAng) * B.neckLen + nod * 0.3,
  };
  const gape = clamp01((B.gape0 || 0) + (B.gapeK ?? 1) * g('gape') * (1 - (B.gape0 || 0)));
  return {
    L, S: S0, Hp: H0, pitch, flex, lift, spine, arch,
    fore: leg({ x: S0.x, y: S0.y }, true, 0), foreFar: leg({ x: S0.x - 0.2, y: S0.y }, true, B.pairF ?? 0.085),
    hind: leg({ x: H0.x, y: H0.y }, false, 0), hindFar: leg({ x: H0.x - 0.2, y: H0.y }, false, B.pairH ?? 0.085),
    Hc, headR: B.headR, tilt: (B.tilt0 || 0) - 0.04 + nod * 0.06 - pitch * 0.5, gape,
    // The tail swings once a stride, lagging the body: a counterweight, not a wag.
    swing: Math.sin(phase * TAU - 1.1),
    phase,
  };
}

// ------------------------------------------------------------ path helpers
function capsule(p, ax, ay, bx, by, ra, rb) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.hypot(dx, dy) || 1e-4;
  const nx = -dy / d, ny = dx / d;
  const a0 = Math.atan2(ny, nx);
  p.moveTo(ax + nx * ra, ay + ny * ra);
  p.lineTo(bx + nx * rb, by + ny * rb);
  // Both caps bulge OUTWARD, or they bite a notch into every joint.
  p.arc(bx, by, rb, a0, a0 - Math.PI, true);
  p.lineTo(ax - nx * ra, ay - ny * ra);
  p.arc(ax, ay, ra, a0 - Math.PI, a0 - TAU, true);
  p.closePath();
}
// A smooth closed curve through points (Catmull-Rom as cubic Beziers).
function smoothClosed(p, pts, k = 1) {
  const n = pts.length;
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const t = k / 6;
    p.bezierCurveTo(p1.x + (p2.x - p0.x) * t, p1.y + (p2.y - p0.y) * t,
      p2.x - (p3.x - p1.x) * t, p2.y - (p3.y - p1.y) * t, p2.x, p2.y);
  }
  p.closePath();
}
const P2 = (fn) => { const p = new Path2D(); fn(p); return p; };
const pt = (x, y) => ({ x, y });
// Points along a cubic, for the tail's centreline.
function bez(a, b, c, d, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, r = 1 - s;
    out.push(pt(r * r * r * a.x + 3 * r * r * s * b.x + 3 * r * s * s * c.x + s * s * s * d.x,
      r * r * r * a.y + 3 * r * r * s * b.y + 3 * r * s * s * c.y + s * s * s * d.y));
  }
  return out;
}
// A tapering ribbon round a centreline, with a round cap at the tip.
function ribbon(p, pts, w0, w1) {
  const n = pts.length, Lf = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
    const nx = -dy / d, ny = dx / d;
    const s = i / (n - 1);
    const w = lerp(w0, w1, s * s * 0.4 + s * 0.6) / 2;
    Lf.push(pt(pts[i].x + nx * w, pts[i].y + ny * w));
    Rt.push(pt(pts[i].x - nx * w, pts[i].y - ny * w));
  }
  const e = pts[n - 1], e0 = pts[n - 2];
  const dx = e.x - e0.x, dy = e.y - e0.y, d = Math.hypot(dx, dy) || 1e-4;
  const cap = pt(e.x + (dx / d) * w1 * 0.55, e.y + (dy / d) * w1 * 0.55);
  smoothClosed(p, [...Lf, cap, ...Rt.reverse()], 1);
}

// ------------------------------------------------------------------ the parts
// A leg as capsules plus a paw. The forearm is heavy all the way to a thick wrist; the
// hind shank carries its width down to the paw, so the hock reads as a cat's long foot
// rather than a bone with a knob on the end. The paws sit flat and under the leg. The
// paw is wound the same way as the capsules, or the nonzero fill punches it out where
// it overlaps the leg and it reads as a ring.
function legPath(lg, B, k) {
  const [w0, w1, w2] = B.legW.map((v) => v * k * 0.5);
  const pr = B.pawR * k;
  const p = new Path2D();
  const { root, mid, low, foot } = lg;
  if (lg.fore) {
    capsule(p, root.x, root.y, mid.x, mid.y, w0 * 1.3, w1 * 1.12);
    capsule(p, mid.x, mid.y, low.x, low.y, w1 * 1.12, w2 * 1.0);
    capsule(p, low.x, low.y, foot.x, foot.y, w2 * 1.0, w2 * 0.9);
  } else {
    capsule(p, root.x, root.y + w0 * 0.3, mid.x, mid.y, w0 * 1.45, w1 * 1.15);
    capsule(p, mid.x, mid.y, low.x, low.y, w1 * 1.0, w2 * 0.95);
    capsule(p, low.x, low.y, foot.x, foot.y, w2 * 0.95, w2 * 0.9);
  }
  const a = Math.atan2(foot.y - low.y, foot.x - low.x);
  const px = foot.x + Math.cos(a) * pr * 0.05 + pr * 0.22, py = foot.y - pr * 0.34;
  p.moveTo(px + pr * 0.95, py);
  p.ellipse(px, py, pr * 0.95, pr * 0.6, 0, TAU, 0, true);
  return p;
}

// Long and low: a high scapula over the shoulder, the back dipping behind it and then
// rounding up over the loin as the cat gathers, the high croup, and a belly line that
// hangs a little (the primordial pouch in front of the hind leg). `dx`/`dy` shift every
// point — the saddle band cuts the torso with a copy of itself moved down.
function torsoPath(B, P, dx = 0, dy = 0) {
  const { S: Sh, Hp, arch } = P;
  const mid = { x: (Sh.x + Hp.x) / 2, y: (Sh.y + Hp.y) / 2 };
  const q = (x, y) => pt(x + dx, y + dy);
  const pts = [
    q(Sh.x + B.chestRx * 0.95, Sh.y + 0.15),                        // point of the shoulder
    q(Sh.x + B.chestRx * 0.45, Sh.y - B.chestUp * 0.78),            // front of the scapula
    q(Sh.x - 0.35, Sh.y - B.chestUp * 1.02 - arch * 0.15),           // top of the scapula
    q(mid.x + 0.9, mid.y - B.chestUp * 0.8 - arch * 0.75),           // the back
    q(Hp.x + 1.3, Hp.y - B.rumpUp * 0.98 - arch * 0.55),             // loin
    q(Hp.x - B.rumpRx * 0.55, Hp.y - B.rumpUp * 0.85),               // croup
    q(Hp.x - B.rumpRx * 0.95, Hp.y - B.rumpUp * 0.3),                // tail set
    q(Hp.x - B.rumpRx * 0.9, Hp.y + 0.45),                           // buttock
    q(Hp.x - B.rumpRx * 0.1, Hp.y + B.rumpDown),                     // under the rump
    q(mid.x - 1.4, mid.y + B.chestDown - B.tuck + B.pouch),          // the pouch
    q(Sh.x - 1.0, Sh.y + B.chestDown * 1.05),                        // brisket
    q(Sh.x + B.chestRx * 0.62, Sh.y + B.chestDown * 0.68),           // front of chest
  ];
  return P2((p) => smoothClosed(p, pts, 1));
}

function neckPath(B, P) {
  const { S: Sh, Hc, headR } = P;
  const nw = B.neckW;
  const ang = Math.atan2(Hc.y - Sh.y, Hc.x - Sh.x);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const top0 = pt(Sh.x - 0.9, Sh.y - B.chestUp * 0.95);
  const top1 = pt(Hc.x - nx * headR * 0.55 - Math.cos(ang) * headR * 0.45, Hc.y - ny * headR * 0.55);
  const bot1 = pt(Hc.x + nx * headR * 0.62 - Math.cos(ang) * headR * 0.1, Hc.y + ny * headR * 0.62);
  const bot0 = pt(Sh.x + B.chestRx * 0.85, Sh.y + 0.5);
  const midTop = pt((top0.x + top1.x) / 2 - nx * nw * 0.22, (top0.y + top1.y) / 2 - ny * nw * 0.22);
  const midBot = pt((bot0.x + bot1.x) / 2 + nx * nw * 0.22, (bot0.y + bot1.y) / 2 + ny * nw * 0.22);
  return P2((p) => smoothClosed(p, [top0, midTop, top1, bot1, midBot, bot0], 0.9));
}

// The head in its own rotated frame (u forward, v down). A cat's skull is a ball with a
// short muzzle set on the front of it and NO stop: the forehead runs straight down the
// bridge to the nose in one convex line — the opposite of the dogs' one telling corner.
// The whisker pad swells under the nose; the jaw is short with a small round chin.
function headPaths(B, P) {
  const R = P.headR;
  const M = B.muzzle;
  const mh = B.muzzleH;
  const th = P.tilt, cs = Math.cos(th), sn = Math.sin(th);
  const T = (u, v) => pt(P.Hc.x + u * cs - v * sn, P.Hc.y + u * sn + v * cs);
  const gape = P.gape;
  const hinge = { u: -R * 0.05, v: R * 0.38 };
  const ja = gape * 0.62;
  const J = (u, v) => {
    const du = u - hinge.u, dv = v - hinge.v;
    return T(hinge.u + du * Math.cos(ja) - dv * Math.sin(ja), hinge.v + du * Math.sin(ja) + dv * Math.cos(ja));
  };
  const noseX = R * 0.9 + M;
  const lipY = R * 0.3;
  const skull = P2((p) => smoothClosed(p, [
    T(-R * 0.98, R * 0.1), T(-R * 0.78, -R * 0.62), T(-R * 0.1, -R * 1.0), T(R * 0.6, -R * 0.8),
    T(R * 1.05, -R * 0.45),                 // the bridge — one line, no stop
    T(noseX - 0.12, -R * 0.2), T(noseX + 0.08, R * 0.0),
    T(noseX - 0.05, lipY - 0.05),           // under the nose, the pad
    T(noseX - M * 0.55, lipY + 0.22), T(R * 0.5, lipY + 0.12),
    T(R * 0.05, R * 0.66), T(-R * 0.6, R * 0.72),
  ], 0.9));
  const jaw = P2((p) => smoothClosed(p, [
    J(-R * 0.35, R * 0.4), J(R * 0.5, lipY + 0.05), J(noseX - M * 0.45, lipY + 0.1),
    J(noseX - M * 0.5, lipY + mh * 0.42), J(R * 0.45, lipY + mh * 0.62), J(-R * 0.25, R * 0.86),
  ], 0.85));
  const mouth = P2((p) => {
    const a = T(R * 0.15, lipY), b = T(noseX - M * 0.35, lipY + 0.1);
    const c = J(noseX - M * 0.5, lipY + 0.2), d = J(R * 0.25, lipY + 0.15);
    p.moveTo(a.x, a.y); p.lineTo(b.x, b.y); p.lineTo(c.x, c.y); p.lineTo(d.x, d.y); p.closePath();
  });
  return { skull, jaw, mouth, T, J, R, M, noseX, lipY, mh, gape };
}

// The ears: set far back on the skull, tall and pointed. `earBack` pins them, rotating
// the whole ear back about its base — a cat about to hit something lays them down.
function earFrame(B, P, far) {
  const R = P.headR;
  const th = P.tilt, cs = Math.cos(th), sn = Math.sin(th);
  const o = far ? R * 0.28 : 0;
  const base = { u: -R * 0.3 + o, v: -R * 0.78 };
  const rb = -(B.earBack || 0) * 0.95;
  const cb = Math.cos(rb), sb = Math.sin(rb);
  // (du, dv) off the base, rotated back, then into the head's frame.
  return (du, dv) => {
    const u = base.u + du * cb - dv * sb, v = base.v + du * sb + dv * cb;
    return pt(P.Hc.x + u * cs - v * sn, P.Hc.y + u * sn + v * cs);
  };
}
function earPath(B, P, far) {
  const R = P.headR, L = B.earLen * (far ? 0.92 : 1);
  const E = earFrame(B, P, far);
  const p = new Path2D();
  smoothClosed(p, [E(R * 0.42, R * 0.22), E(R * 0.05, -L * 0.62), E(-L * 0.2, -L * 1.0),
    E(-L * 0.42, -L * 0.55), E(-R * 0.4, R * 0.3)], 0.45);
  return p;
}
// The back of the ear is black, and the near tip grows the black tuft. (A real bobcat's
// ear has a white spot on the back; at lane size it read as a second eye, so it is off.)
function earDetail(ctx, B, P, path, far) {
  const pal = B.pal;
  const R = P.headR, L = B.earLen * (far ? 0.92 : 1);
  const E = earFrame(B, P, far);
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
  if (!far) {
    const a = E(-L * 0.08, -L * 0.9), b = E(-L * 0.32, -L * 0.9), tip = E(-L * 0.3, -L * 1.55);
    ctx.fillStyle = pal.dark;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(tip.x + 0.1, tip.y + 0.3, tip.x, tip.y);
    ctx.quadraticCurveTo(b.x, b.y - 0.2, b.x, b.y); ctx.closePath(); ctx.fill();
  }
}

// The bob: it leaves the croup going BACK, then turns up — a stub with a root, not a
// cone stuck on the rump — swinging a little once a stride.
function tailSpec(B, P) {
  const { Hp } = P;
  const t0 = pt(Hp.x - B.rumpRx * 0.8, Hp.y - B.rumpUp * 0.5);
  const len = B.bobLen ?? 2.7, a = (B.bobAng ?? -2.3) + P.swing * 0.14;
  const d = pt(Math.cos(a), Math.sin(a));
  const pts = bez(t0, pt(t0.x - len * 0.32, t0.y + 0.15), pt(t0.x + d.x * len * 0.7 - 0.2, t0.y + d.y * len * 0.7),
    pt(t0.x + d.x * len, t0.y + d.y * len), 8);
  return { pts, w0: 1.5, w1: 1.12 };
}
function tailPath(B, P) {
  const s = tailSpec(B, P);
  return P2((p) => ribbon(p, s.pts, s.w0, s.w1));
}

// The cheek ruff: the fur flares back and down in a point below the ear.
function ruffPath(B, P, hd) {
  const { T, R } = hd;
  return P2((p) => smoothClosed(p, [
    T(-R * 0.2, R * 0.2), T(-R * 0.8, R * 0.28), T(-R * 1.2, R * 0.72), T(-R * 0.82, R * 0.9),
    T(-R * 1.0, R * 1.2), T(-R * 0.35, R * 1.05), T(R * 0.3, R * 0.8),
  ], 0.6));
}

// ------------------------------------------------------------------ the paint
// Stroke every part once as ONE path at twice the line, then fill each part.
function silhouette(ctx, parts) {
  const all = new Path2D();
  for (const q of parts) all.addPath(q.path);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 2;
  ctx.stroke(all);
  for (const q of parts) { ctx.fillStyle = q.fill; ctx.fill(q.path); }
}

// The coat in four bands that all follow the body's own curves: the pale belly, the
// dogs' cel shade above it (each the torso minus itself shifted up — sprites/dogs.js
// shadeBody), the coat, and a darker saddle along the back (the torso minus a copy of
// itself shifted DOWN). A cat's underside is pale from chin to groin.
function coatBands(ctx, torso, pal, B, P) {
  ctx.save();
  ctx.clip(torso);
  ctx.fillStyle = pal.markShade;
  ctx.fill(torso);
  ctx.save();
  ctx.translate(0.2, -(B.belly ?? 0.8));
  ctx.fillStyle = pal.shade;
  ctx.fill(torso);
  ctx.translate(0.25, -(B.chestDown * 0.42));
  ctx.fillStyle = pal.coat;
  ctx.fill(torso);
  ctx.restore();
  const m = new Path2D();
  m.rect(-60, -60, 120, 120);
  m.addPath(torsoPath(B, P, -0.2, B.saddleW ?? 0.9));
  ctx.clip(m, 'evenodd');
  ctx.fillStyle = pal.saddle;
  ctx.fill(torso);
  ctx.restore();
}

// A point on the body: `s` 0 at the hip .. 1 at the shoulder, `v` 0 on the back line
// .. 1 on the belly line. The spots ride the pumping spine with it.
function bodyAt(B, P, s, v) {
  const x = lerp(P.Hp.x, P.S.x, s), y = lerp(P.Hp.y, P.S.y, s);
  const up = lerp(B.rumpUp, B.chestUp, s) * 0.92 + P.arch * (1 - Math.abs(s - 0.55) * 1.6) * 0.7;
  const dn = lerp(B.rumpDown, B.chestDown, s) * 0.9;
  return pt(x, y - up + (up + dn) * v);
}
// The coat, as (s, v, size, stretch): short dark streaks down the back that run with the
// spine, mid-sized spots scattered over the flank (never on a grid), and the small black
// spots on the white belly that are a bobcat's surest mark.
const SPOTS = [
  // back streaks
  [0.1, 0.1, 0.24, 2.2], [0.28, 0.06, 0.22, 2.4], [0.46, 0.09, 0.24, 2.4], [0.64, 0.07, 0.22, 2.2], [0.82, 0.12, 0.2, 2.0],
  [0.2, 0.2, 0.2, 1.8], [0.55, 0.22, 0.2, 1.8],
  // flank
  [0.05, 0.36, 0.3, 1.2], [0.16, 0.5, 0.34, 1.3], [0.3, 0.34, 0.28, 1.4], [0.34, 0.58, 0.32, 1.1], [0.47, 0.42, 0.3, 1.3],
  [0.58, 0.6, 0.28, 1.2], [0.66, 0.36, 0.26, 1.4], [0.76, 0.52, 0.28, 1.2], [0.88, 0.4, 0.24, 1.2], [0.22, 0.7, 0.26, 1.1],
  [0.48, 0.72, 0.24, 1.0], [0.9, 0.66, 0.22, 1.0],
  // belly, on the white
  [0.14, 0.9, 0.2, 1.0], [0.32, 0.93, 0.22, 1.0], [0.52, 0.9, 0.2, 1.0], [0.7, 0.88, 0.2, 1.0],
];

const clipTo = (ctx, paths, fn) => {
  ctx.save();
  const c = new Path2D(); for (const q of paths) c.addPath(q);
  ctx.clip(c); fn(); ctx.restore();
};
const fillP = (ctx, col, fn) => { ctx.fillStyle = col; ctx.beginPath(); fn(ctx); ctx.fill(); };

// The pale throat: a soft oval along the neck's underside, running into the chest.
function throatBib(ctx, B, P, torso, neck) {
  const pal = B.pal;
  clipTo(ctx, [neck, torso], () => {
    const ang = Math.atan2(P.Hc.y - P.S.y, P.Hc.x - P.S.x);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const len = Math.hypot(P.Hc.x - P.S.x, P.Hc.y - P.S.y);
    const c = pt(lerp(P.S.x, P.Hc.x, 0.5) + nx * B.neckW * 0.55 + 0.3, lerp(P.S.y, P.Hc.y, 0.5) + ny * B.neckW * 0.55);
    fillP(ctx, pal.markShade, (g) => g.ellipse(c.x, c.y, len * 0.75, B.neckW * 0.5, ang, 0, TAU));
    fillP(ctx, pal.markShade, (g) => g.ellipse(P.S.x + B.chestRx * 0.3, P.S.y + B.chestDown * 0.8, B.chestRx * 0.7, B.chestDown * 0.42, 0.35, 0, TAU));
  });
}

// The pale muzzle, chin and lip line, the pale spots over and under the eye, the dark
// moustache at the back of the whisker pad, and the chin's dark edge.
function muzzleMarks(ctx, B, P, hd, skull, jaw) {
  const { T, J, R, noseX, lipY, mh, M } = hd;
  const pal = B.pal;
  clipTo(ctx, [skull, jaw], () => {
    fillP(ctx, pal.mark, (c) => smoothClosed(c, [T(R * 0.7, -R * 0.12), T(noseX - 0.1, -R * 0.06), T(noseX + 0.3, lipY + 0.2),
      T(noseX, lipY + 2.5), T(R * 0.0, R * 1.2), T(-R * 0.3, R * 0.62), T(R * 0.4, R * 0.22)], 0.7));
    ctx.fillStyle = pal.mark;
    ctx.beginPath(); const a = T(R * 0.52, -R * 0.62); ctx.ellipse(a.x, a.y, R * 0.2, R * 0.1, P.tilt - 0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); const b = T(R * 0.3, -R * 0.02); ctx.ellipse(b.x, b.y, R * 0.24, R * 0.12, P.tilt - 0.2, 0, TAU); ctx.fill();
    fillP(ctx, pal.dark, (c) => smoothClosed(c, [T(R * 0.78, -R * 0.02), T(R * 1.02, R * 0.06),
      T(noseX - M * 0.35, lipY + 0.1), T(noseX - M * 0.55, lipY + 0.42), T(R * 0.55, lipY + 0.35)], 0.8));
    const j0 = J(R * 0.45, lipY + mh * 0.18), j1 = J(noseX - M * 0.55, lipY + mh * 0.2);
    ctx.strokeStyle = pal.dark; ctx.lineWidth = 0.28;
    ctx.beginPath(); ctx.moveTo(j0.x, j0.y); ctx.lineTo(j1.x, j1.y); ctx.stroke();
  });
}

// The bobcat's coat. The spots ride the body (bodyAt) and are scaled with it; the
// forearm bars sit BELOW the elbow, where they can only be leg; the facial lines sweep
// from behind the eye back into the ruff; the bob is coat-coloured with bars on top,
// a black tip on its upper side and white under.
function bobcatCoat(ctx, B, P, hd, parts, nearLegs, torso, neck, ruff) {
  const { T, R } = hd;
  const pal = B.pal;
  const skull = parts.find((q) => q.id === 'skull').path;
  const jaw = parts.find((q) => q.id === 'jaw').path;
  const tail = parts.find((q) => q.id === 'tail').path;
  const k = B.spotK ?? 1;
  const back = Math.atan2(P.S.y - P.Hp.y, P.S.x - P.Hp.x);
  clipTo(ctx, [torso], () => {
    for (const [s, v, r, st] of SPOTS) {
      const q = bodyAt(B, P, s, v);
      // Streaks lie along the back line; flank spots tip a little with the barrel.
      const rot = back + (v < 0.25 ? 0 : (s - 0.5) * 0.5);
      fillP(ctx, pal.spot, (c) => c.ellipse(q.x, q.y, r * k * st * 0.85, r * k * 0.78, rot, 0, TAU));
    }
  });
  clipTo(ctx, [neck], () => {
    const ang = Math.atan2(P.Hc.y - P.S.y, P.Hc.x - P.S.x);
    for (const [a, o, r] of [[0.3, -0.55, 0.24], [0.5, -0.1, 0.22], [0.25, 0.3, 0.2], [0.62, -0.6, 0.2]]) {
      const q = pt(lerp(P.S.x, P.Hc.x, a) - Math.sin(ang) * o * B.neckW, lerp(P.S.y, P.Hc.y, a) + Math.cos(ang) * o * B.neckW);
      fillP(ctx, pal.spot, (c) => c.ellipse(q.x, q.y, r * k * 1.5, r * k, ang, 0, TAU));
    }
  });
  const [nearHind, nearFore] = nearLegs;
  clipTo(ctx, [nearFore], () => {
    const lg = P.fore;
    const a = Math.atan2(lg.low.y - lg.mid.y, lg.low.x - lg.mid.x) + Math.PI / 2;
    ctx.strokeStyle = pal.dark; ctx.lineWidth = 0.34; ctx.lineCap = 'butt';
    for (const f of [0.3, 0.56]) {
      const x = lerp(lg.mid.x, lg.low.x, f), y = lerp(lg.mid.y, lg.low.y, f);
      ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 1.2, y - Math.sin(a) * 1.2);
      ctx.lineTo(x + Math.cos(a) * 1.2, y + Math.sin(a) * 1.2); ctx.stroke();
    }
    ctx.lineCap = 'round';
  });
  clipTo(ctx, [nearHind], () => {
    const lg = P.hind;
    const ang = Math.atan2(lg.mid.y - lg.root.y, lg.mid.x - lg.root.x);
    for (const [f, o, r] of [[0.25, 0.25, 0.3], [0.5, -0.35, 0.28], [0.7, 0.3, 0.26], [0.45, 0.75, 0.22]]) {
      const x = lerp(lg.root.x, lg.mid.x, f) - Math.sin(ang) * o, y = lerp(lg.root.y, lg.mid.y, f) + Math.cos(ang) * o;
      fillP(ctx, pal.spot, (c) => c.ellipse(x, y, r * k * 1.3, r * k, ang, 0, TAU));
    }
    // Two bars across the back of the shank, above the hock.
    const b = Math.atan2(lg.low.y - lg.mid.y, lg.low.x - lg.mid.x) + Math.PI / 2;
    ctx.strokeStyle = pal.spot; ctx.lineWidth = 0.26;
    for (const f of [0.28, 0.5]) {
      const x = lerp(lg.mid.x, lg.low.x, f), y = lerp(lg.mid.y, lg.low.y, f);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(b) * 0.9, y - Math.sin(b) * 0.9); ctx.stroke();
    }
  });
  // The facial lines: two dark sweeps from behind the eye back into the ruff, and two
  // faint streaks over the crown.
  clipTo(ctx, [ruff || skull, skull, jaw], () => {
    ctx.strokeStyle = pal.dark; ctx.lineWidth = 0.2;
    const sweep = (a, b, c) => { const p0 = T(...a), p1 = T(...b), p2 = T(...c);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y); ctx.stroke(); };
    sweep([R * 0.18, -R * 0.2], [-R * 0.35, -R * 0.05], [-R * 1.0, R * 0.5]);
    sweep([R * 0.22, R * 0.14], [-R * 0.25, R * 0.4], [-R * 0.85, R * 0.95]);
    ctx.lineWidth = 0.13;
    ctx.globalAlpha = 0.7;
    for (const [u, v] of [[0.05, -0.8], [-0.22, -0.78]]) {
      const p0 = T(R * u, R * v), p1 = T(R * (u - 0.22), R * (v + 0.22));
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
  clipTo(ctx, [tail], () => {
    const s = tailSpec(B, P), n = s.pts.length, e = s.pts[n - 1], e0 = s.pts[n - 3];
    const dx = e.x - e0.x, dy = e.y - e0.y, d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    // (nx, ny) is the tail's UNDERSIDE: as it turns up and back, that side faces back
    // and down; the upper side (-n) faces the rump.
    const nx = uy, ny = -ux;
    fillP(ctx, pal.mark, (c) => c.ellipse(e.x + nx * 0.45 - ux * 0.3, e.y + ny * 0.45 - uy * 0.3, 1.1, 0.5, Math.atan2(uy, ux), 0, TAU));
    fillP(ctx, pal.dark, (c) => c.ellipse(e.x - nx * 0.3 + ux * 0.1, e.y - ny * 0.3 + uy * 0.1, 0.85, 0.62, Math.atan2(uy, ux), 0, TAU));
    ctx.strokeStyle = pal.spot; ctx.lineWidth = 0.24;
    for (const i of [Math.floor(n * 0.45), Math.floor(n * 0.68)]) {
      const q = s.pts[i];
      ctx.beginPath(); ctx.moveTo(q.x - nx * 0.8 - ux * 0.1, q.y - ny * 0.8 - uy * 0.1); ctx.lineTo(q.x - nx * 0.15, q.y - ny * 0.15); ctx.stroke();
    }
  });
}

// The face: amber eye under a hard brow with the dark line round it and the tear line
// running down to the moustache; a small pink nose; the long canines — a cat's teeth
// are two daggers, not a row.
function face(ctx, B, P, hd) {
  const { T, J, R, noseX, lipY, mh, M } = hd;
  const pal = B.pal;
  const tk = 0.36 * B.teeth;
  if (hd.gape > 0.3) {
    const t0 = J(R * 0.45, lipY + mh * 0.25), t1 = J(noseX - M * 0.75, lipY + mh * 0.2);
    ctx.fillStyle = TONGUE;
    ctx.beginPath(); ctx.moveTo(t0.x, t0.y); ctx.quadraticCurveTo((t0.x + t1.x) / 2, (t0.y + t1.y) / 2 + 0.4, t1.x, t1.y);
    ctx.lineTo(t1.x - 0.1, t1.y - 0.3); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = TOOTH;
  const fang = (a, dir, len) => {
    ctx.beginPath();
    ctx.moveTo(a.x - tk * 0.42, a.y); ctx.lineTo(a.x + tk * 0.42, a.y); ctx.lineTo(a.x + tk * 0.05, a.y + dir * tk * len);
    ctx.closePath(); ctx.fill();
  };
  fang(T(noseX - M * 0.62, lipY + 0.12), 1, 2.3 * (0.55 + 0.45 * hd.gape));
  fang(J(noseX - M * 0.75, lipY + 0.2), -1, 1.5 * (0.4 + 0.6 * hd.gape));
  // The nose: a small rounded triangle on the tip.
  const n = T(noseX - 0.18, -R * 0.1);
  ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(P.tilt);
  ctx.fillStyle = pal.nose;
  ctx.beginPath(); ctx.moveTo(-0.45, -0.28); ctx.lineTo(0.3, -0.3); ctx.quadraticCurveTo(0.35, 0.05, 0.05, 0.3);
  ctx.quadraticCurveTo(-0.3, 0.05, -0.45, -0.28); ctx.fill();
  ctx.fillStyle = 'rgba(30,14,16,0.55)'; ctx.fillRect(-0.45, -0.34, 0.8, 0.12);
  ctx.restore();
  // Whisker dots on the pad, and three fine whiskers (gone at game scale; the pad's
  // edge carries it there).
  ctx.fillStyle = 'rgba(40,24,20,0.5)';
  for (const [u, v] of [[-0.55, 0.12], [-0.3, 0.2], [-0.75, 0.28], [-0.5, 0.36]]) {
    const q = T(noseX + u * M, lipY + v - 0.3); ctx.beginPath(); ctx.arc(q.x, q.y, 0.07, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,250,240,0.7)'; ctx.lineWidth = 0.07;
  for (const [dv, bend] of [[-0.25, -0.5], [0.05, 0], [0.35, 0.5]]) {
    const a = T(noseX - M * 0.4, lipY - 0.1 + dv * 0.4), b = T(noseX + M * 1.3, lipY - 0.4 + dv * 1.8);
    const c = T(noseX + M * 0.6, lipY - 0.3 + dv + bend * 0.3);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y); ctx.stroke();
  }
  // The eye: big, set forward, almost all iris.
  const e = T(R * 0.48, -R * 0.36);
  const ew = R * 0.27, eh = R * 0.17 * (B.earBack > 0.8 ? 0.8 : 1);
  const rot = P.tilt - 0.28;
  ctx.fillStyle = pal.eye;
  ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, rot, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, rot, 0, TAU); ctx.clip();
  ctx.fillStyle = '#150f12'; ctx.beginPath(); ctx.ellipse(e.x + ew * 0.3, e.y, R * 0.06, R * 0.13, rot, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = pal.dark; ctx.lineWidth = R * 0.07;
  ctx.beginPath(); ctx.ellipse(e.x, e.y, ew, eh, rot, 0, TAU); ctx.stroke();
  // The tear line: from the eye's front corner down the side of the muzzle.
  const f0 = T(R * 0.72, -R * 0.3), f1 = T(R * 0.85, -R * 0.05), f2 = T(R * 0.86, R * 0.12);
  ctx.lineWidth = R * 0.075;
  ctx.beginPath(); ctx.moveTo(f0.x, f0.y); ctx.quadraticCurveTo(f1.x, f1.y, f2.x, f2.y); ctx.stroke();
  // The brow, hard down over the eye: the hazard's expression, as on the dogs.
  const b0 = T(R * 0.12, -R * 0.62), b1 = T(R * 0.8, -R * 0.44);
  ctx.strokeStyle = 'rgba(21,16,30,0.85)'; ctx.lineWidth = R * 0.12;
  ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
  // The snarl crease over the pad as the lip draws back.
  if (hd.gape > 0.25) {
    const w0 = T(R * 1.05, -R * 0.3), w1 = T(noseX - M * 0.3, -R * 0.05);
    ctx.strokeStyle = `rgba(21,16,30,${0.2 + 0.3 * hd.gape})`; ctx.lineWidth = LINE * 0.8;
    ctx.beginPath(); ctx.moveTo(w0.x, w0.y); ctx.quadraticCurveTo(w0.x + 0.3, w0.y + 0.1, w1.x, w1.y); ctx.stroke();
  }
}

// One bobcat at `phase` (0..1), in world units, FACING LEFT, feet on y 0.
function paintCat(ctx, B, phase) {
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
  const ruff = ruffPath(B, P, hd);
  parts.push({ path: ruff, fill: pal.coat, id: 'ruff' });
  parts.push({ path: hd.mouth, fill: MOUTH, id: 'mouth' });
  parts.push({ path: hd.jaw, fill: pal.coat, id: 'jaw' });
  parts.push({ path: hd.skull, fill: pal.coat, id: 'skull' });
  const nearLegs = [P.hind, P.fore].map((lg) => legPath(lg, B, 1));
  for (const lp of nearLegs) parts.push({ path: lp, fill: pal.coat, id: 'leg' });
  const nearEar = earPath(B, P, false);
  parts.push({ path: nearEar, fill: pal.coat, id: 'ear' });
  silhouette(ctx, parts);
  coatBands(ctx, torso, pal, B, P);
  throatBib(ctx, B, P, torso, neck);
  muzzleMarks(ctx, B, P, hd, hd.skull, hd.jaw);
  bobcatCoat(ctx, B, P, hd, parts, nearLegs, torso, neck, ruff);
  face(ctx, B, P, hd);
  earDetail(ctx, B, P, nearEar, false);
  ctx.restore();
}

// ------------------------------------------------------------------- the fit
// The union of the streak's ink over all eight frames, and of his head and body alone
// (torso, neck, ruff, skull, jaw), in his own world units after the mirror. Measured
// off the bake-off harness (src/dev/desert-cat-candidates.js, desertCatBounds('bobStreak')
// and its `core` pass) — re-measure there after any change to the build, the gait or a
// path, or the box will no longer cover him.
const STREAK_BOUNDS = { minX: -11.375, maxX: 11, minY: -10 };
const STREAK_CORE = { minX: -10.375, maxX: 10.625, minY: -9.5 };
// His size: 1.35x the size the bake-off's round 2 drew him at, fitted into the bruiser's
// art box (15x10 box x 4/3 x VISUAL 1.16) — Peter's "L2".
const BRUISER_ART = { w: 15 * 4 / 3 * 1.16, h: 10 * 4 / 3 * 1.0 * 1.16 };
const SIZE = 1.35;
const K = Math.min((BRUISER_ART.w * 0.97) / (STREAK_BOUNDS.maxX - STREAK_BOUNDS.minX),
  (BRUISER_ART.h * 0.975) / -STREAK_BOUNDS.minY) * SIZE;          // world px per unit
// The head-and-body centre, and the art box centred on it (the tail in the spare room).
const CORE_CX = (STREAK_CORE.minX + STREAK_CORE.maxX) / 2;
const HALF = Math.max(CORE_CX - STREAK_BOUNDS.minX, STREAK_BOUNDS.maxX - CORE_CX);
const ART_W = (2 * HALF * K) / 0.97;
const ART_H = (-STREAK_BOUNDS.minY * K) / 0.975;

// The collision box: the head and body over the whole stride (28.5 x 12.9 world px,
// rounded up), where the bruiser had 15x10.
export const BOBCAT_BOX = { w: 29, h: 13 };
// Art width and height as the tables express them: drawWorldEntity draws a prop
// box.w x 4/3 x VISUAL wide and box.h x 4/3 x TALL x VISUAL high. Exact: VISUAL
// 0.8326, TALL 0.9649; at these three-place values the drawn size is the same 32 x 14
// world px and the raster's height is within 0.01%.
export const BOBCAT_VISUAL = 0.833;
export const BOBCAT_TALL = 0.965;
// Eight keyed frames at 16 fps: the long stride cycles slower than the bruiser's 18.
export const BOBCAT_FRAMES = FRAMES;
export const BOBCAT_FPS = 16;
// Debris colours for the hit burst: coat, shade, pale belly.
export const BOBCAT_PARTICLE_COLORS = [BOBCAT_BUILD.pal.coat, BOBCAT_BUILD.pal.shade, BOBCAT_BUILD.pal.markShade];

// The ANIMAL_PAINTERS contract: paint frame `frame` (0..7) into a w x h raster, feet on
// the bottom edge, FACING LEFT, the head-and-body centred on the raster's centre line.
// Scaled off the width alone, so a table's TALL only sets the headroom.
export function paintBobcat(ctx, w, h, frame = 0) {
  const kk = (w / ART_W) * K;
  ctx.save();
  ctx.translate(w / 2, h);
  ctx.scale(kk, kk);
  ctx.translate(-CORE_CX, 0);
  paintCat(ctx, BOBCAT_BUILD, (frame % FRAMES) / FRAMES);
  ctx.restore();
}

// The rig, for the bake-off (src/dev/desert-cat-candidates.js), which draws every take
// with these same parts so the lab and the game cannot drift apart.
export const BOBCAT_RIG = {
  GAIT, LINE, INK, MOUTH, TONGUE, TOOTH,
  cyc, ik, capsule, smoothClosed, P2, pt, bez, ribbon,
  pose, legPath, torsoPath, neckPath, headPaths, earFrame, earPath, earDetail, tailSpec, ruffPath,
  silhouette, coatBands, bodyAt, throatBib, bobcatCoat, face,
};
