// TERMINAL VELOCITY lane obstacles picked from the 12 Oct 2026 bake-off (27 Oct 2026; see
// src/dev/neon-obstacle-candidates.js for the sheet and the ones not picked). Moved here
// verbatim from the candidate module, which now imports its palette and helpers back.
// Every painter is authored in its PAINTED ENVELOPE in world units — box x 4/3 x
// PROP_TALL x PROP_VISUAL_SCALE — with the ground at y = h, on a clock `t` it quantises
// to its own ring; the registry below hands it frame/fps and scales the envelope onto
// the raster props.js gives it. Like officeProps.js, nothing here imports props.js.
//   Peter, 27 Oct 2026: barrels -> RUNAWAY WHEELS, floor saws -> LASER FANS, fire barrels
//   and the cactus slot -> JACOB'S LADDER / RISING BOLLARDS.

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
const INK = '#0b0920';
const LW = 0.55;  // outline
const LWI = 0.32; // interior line
const LWF = 0.2;  // fine line
// The hazard light, and its filament pushed toward white.
const RED = '#ff2e4d', RED_DK = '#a8122e', RED_HOT = '#ffd0d8';
// The pack's own inks, for details only (stylePacks/index.js NEON_*).
const CYAN = '#38d8f8';
const LAMP = '#ff5a7a';
const WHITE = '#ffffff';
// Bodies.
const CAB = '#1d1a33', CAB_LT = '#36315a', CAB_DK = '#100e20';
const HULL = '#262257', HULL_LT = '#524c9e', HULL_DK = '#161337';
const STEEL = '#aab1d0', STEEL_LT = '#e2e6f6', STEEL_DK = '#6b7299';
const SLATE = '#4c5488', SLATE_LT = '#6d76b0', SLATE_DK = '#343a68';
const TYRE = '#17142a', TYRE_LT = '#2f2a50';
const CREAM = '#e4e2ee', CREAM_LT = '#f8f7fc', CREAM_DK = '#b4b2c8';
const ARC = '#a99bff'; // an arc's own violet-white, not the hazard red

// ------------------------------------------------------------------ helpers
function pen(c, col, lw) {
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.lineJoin = 'round';
  c.lineCap = 'round';
}
function fillStroke(c, fill, ink = INK, lw = LW) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink && lw > 0) { pen(c, ink, lw); c.stroke(); }
}
function box(c, x, y, w, h, fill, ink = null, lw = LW) {
  c.beginPath(); c.rect(x, y, w, h); fillStroke(c, fill, ink, lw);
}
function rbox(c, x, y, w, h, r, fill, ink = null, lw = LW) {
  c.beginPath(); c.roundRect(x, y, w, h, r); fillStroke(c, fill, ink, lw);
}
function circ(c, x, y, r, fill, ink = null, lw = LW) {
  c.beginPath(); c.arc(x, y, r, 0, TAU); fillStroke(c, fill, ink, lw);
}
function ell(c, x, y, rx, ry, fill, ink = null, lw = LW) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); fillStroke(c, fill, ink, lw);
}
function poly(c, pts, fill, ink = null, lw = LW) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  fillStroke(c, fill, ink, lw);
}
function line(c, x0, y0, x1, y1, col, lw) {
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); pen(c, col, lw); c.stroke();
}

const rr = (x, y, w, h, r) => (p) => p.roundRect(x, y, w, h, r);
const disc = (x, y, r) => (p) => p.arc(x, y, r, 0, TAU);

// A flat body: fill the path, its lit sliver and shade band clipped inside it,
// then the ink over both — the one move every solid on this sheet makes.
function body(c, path, fill, inner = null, ink = INK, lw = LW) {
  c.save();
  c.beginPath();
  path(c);
  c.fillStyle = fill;
  c.fill();
  if (inner) { c.clip(); inner(c); }
  c.restore();
  c.beginPath();
  path(c);
  pen(c, ink, lw);
  c.stroke();
}

// Pushes a #rrggbb toward white: the filament of a tube reads white, and only the
// light thrown round it carries the colour (sprites/train.js, whiteHot).
const hotCache = new Map();
function whiteHot(hex, amt = 0.55) {
  const key = hex + amt;
  if (!hotCache.has(key)) {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    hotCache.set(key, `rgb(${v.map((ch) => Math.round(ch + (255 - ch) * amt)).join(',')})`);
  }
  return hotCache.get(key);
}

// A NEON LINE: a faint wide stroke for the light the tube throws, the colour, and a
// white-hot core — the pack's neonTube plus the train's filament, source-over.
// `lit` dims the whole tube (a blink, a pulse) without changing its shape.
function tube(c, color, width, path, lit = 1, glow = 0.24) {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const a = c.globalAlpha;
  c.globalAlpha = a * glow * lit;
  c.strokeStyle = color;
  c.lineWidth = width * 3;
  c.beginPath(); path(c); c.stroke();
  c.globalAlpha = a * (0.25 + 0.75 * lit);
  c.lineWidth = width;
  c.beginPath(); path(c); c.stroke();
  c.globalAlpha = a * lit;
  c.strokeStyle = whiteHot(color);
  c.lineWidth = width * 0.42;
  c.beginPath(); path(c); c.stroke();
  c.restore();
}

// Deterministic per-index noise — the pack's neonHash, so a sheet redraw is the same
// picture.
function hash(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Sparks: short white-hot streaks with an orange-red skirt, fanned from (x, y) at
// angle `dir` ± `spread`, re-dealt on every frame of the ring.
function sparks(c, x, y, f, seed, { n = 4, dir = -0.5, spread = 0.7, len = 3 } = {}) {
  for (let i = 0; i < n; i++) {
    const r = hash(seed * 31 + f * 7 + i);
    const a = dir + (r - 0.5) * 2 * spread;
    const d0 = 0.6 + hash(seed * 17 + f * 3 + i) * 1.6;
    const d1 = d0 + len * (0.5 + 0.5 * hash(seed * 13 + f * 11 + i));
    const x0 = x + Math.cos(a) * d0, y0 = y + Math.sin(a) * d0;
    const x1 = x + Math.cos(a) * d1, y1 = y + Math.sin(a) * d1;
    line(c, x0, y0, x1, y1, 'rgba(255,106,60,0.55)', 0.75);
    line(c, x0, y0, x1, y1, '#fff4d8', 0.3);
  }
}

// ================================================================ painters
// All in world units inside the envelope, ground at y = h.

// B — RUNAWAY WHEEL (barrel 17x17). A wheel off a light-bike: black tyre, a red
// light ring in the rim, five spokes and a white-hot hub, sparks thrown off the back
// of the contact patch. Round, so the run's barrel spin (roll: true) is exactly right
// for it — a port draws it still and lets the roll turn it; here it turns itself.
function runawayWheel(c, w, h, t, still = false) {
  const f = frameOf(t, 8, 16);
  const R = 8.2, cx = w / 2, cy = h - 0.1 - R;
  // Rolls left at the hero, so the contact patch throws its sparks back and up.
  if (!still) sparks(c, cx + 1.6, h - 0.5, f, 3, { n: 4, dir: -0.35, spread: 0.45, len: 3.6 });
  const spin = still ? 0 : -(f / 8) * (TAU / 5);
  circ(c, cx, cy, R, TYRE, INK, LW);
  for (let k = 0; k < 10; k++) {
    const a = spin + (k / 10) * TAU;
    line(c, cx + Math.cos(a) * (R - 0.45), cy + Math.sin(a) * (R - 0.45),
      cx + Math.cos(a) * (R - 1.25), cy + Math.sin(a) * (R - 1.25), TYRE_LT, 0.95);
  }
  tube(c, RED, 0.85, (p) => p.arc(cx, cy, R - 1.95, 0, TAU), 1, 0.3);
  body(c, disc(cx, cy, R - 2.7), HULL, (p) => {
    circ(p, cx - 1.6, cy - 1.6, R - 3.2, HULL_LT);
    circ(p, cx + 0.5, cy + 0.5, R - 3.1, HULL);
  }, INK, LWI);
  for (let k = 0; k < 5; k++) {
    const a = spin + (k / 5) * TAU;
    line(c, cx + Math.cos(a) * 1.4, cy + Math.sin(a) * 1.4,
      cx + Math.cos(a) * (R - 2.9), cy + Math.sin(a) * (R - 2.9), INK, 1.1);
    line(c, cx + Math.cos(a) * 1.4, cy + Math.sin(a) * 1.4,
      cx + Math.cos(a) * (R - 2.9), cy + Math.sin(a) * (R - 2.9), STEEL_DK, 0.5);
  }
  circ(c, cx, cy, 1.75, STEEL, INK, LWI);
  circ(c, cx, cy, 0.75, WHITE);
}

// C — JACOB'S LADDER on a junction box (fire 17x29). The warm one, made live: a
// roadside power cabinet with a red HIGH VOLTAGE plate, its vents glowing, and on its
// roof two rods in a V with an arc CLIMBING them — up the ladder, snap at the top,
// back to the bottom. Electricity is this city's fire: the strike blows its signs.
// The arc is overdraw above the 13x13 box, like a fire barrel's flame.
function jacobsLadder(c, w, h, t) {
  const f = frameOf(t, 8, 12);
  const g = h - 0.2;
  const TOP = 13.0;
  // The rods: out of the bushings, splaying up to the top of the envelope.
  const L0 = [5.4, TOP - 3.4], L1 = [2.0, 1.0];
  const R0 = [11.6, TOP - 3.4], R1 = [15.0, 1.0];
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  for (const [a, b] of [[L0, L1], [R0, R1]]) {
    line(c, a[0], a[1], b[0], b[1], INK, 1.05);
    line(c, a[0], a[1], b[0], b[1], STEEL, 0.5);
  }
  // The arc: six frames climbing, then two of it breaking at the top — wisps off the
  // rod tips — so the loop reads as one rung of fire going up and starting over.
  if (f < 6) {
    const k = 0.08 + f * 0.17;
    const a = lerp(L0, L1, k), b = lerp(R0, R1, k);
    const pts = [a];
    const N = 6;
    for (let i = 1; i < N; i++) {
      const u = i / N;
      const bow = Math.sin(u * Math.PI) * (1.0 + k * 1.4);
      pts.push([a[0] + (b[0] - a[0]) * u + (hash(f * 13 + i) - 0.5) * 0.8,
        a[1] + (b[1] - a[1]) * u - bow + (hash(f * 29 + i * 3) - 0.5) * 1.6]);
    }
    pts.push(b);
    const path = (p) => { p.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) p.lineTo(q[0], q[1]); };
    tube(c, ARC, 0.8, path, 1, 0.35);
    // A fork off the hottest point, on alternate frames.
    if (f % 2 === 0) {
      const m = pts[3];
      tube(c, ARC, 0.45, (p) => { p.moveTo(m[0], m[1]); p.lineTo(m[0] + 1.2, m[1] - 1.6); p.lineTo(m[0] + 0.6, m[1] - 2.6); }, 1, 0.3);
    }
  } else {
    for (const [tip, s] of [[L1, 1], [R1, -1]]) {
      const k = f - 6;
      tube(c, ARC, 0.4, (p) => {
        p.moveTo(tip[0] + s * 0.3, tip[1] + 0.6);
        p.lineTo(tip[0] + s * (1.0 + k * 0.6), tip[1] + 0.2 - k * 0.3);
        p.lineTo(tip[0] + s * (1.6 + k * 0.6), tip[1] + 1.0 - k * 0.4);
      }, 0.8 - k * 0.3, 0.3);
    }
  }
  // Sparks dropping off the rung onto the roof.
  if (f < 6) sparks(c, 8.5, TOP - 4.2 - f * 1.2, f, 7, { n: 3, dir: Math.PI / 2, spread: 0.9, len: 2.2 });
  // The bushings: stacked porcelain sheds under each rod.
  for (const x of [L0[0], R0[0]]) {
    box(c, x - 0.35, TOP - 3.6, 0.7, 3.6, STEEL_DK, INK, LWF);
    for (let i = 0; i < 3; i++) ell(c, x, TOP - 0.8 - i * 1.1, 1.25, 0.42, CREAM, INK, LWF);
  }
  // The cabinet.
  body(c, rr(2.2, TOP, 12.6, g - TOP, 0.5), SLATE, (p) => {
    box(p, 12.9, 0, 2, h, SLATE_DK);
    box(p, 2.8, TOP + 1.0, 0.7, g - TOP - 2.6, SLATE_LT);
    box(p, 2.2, g - 1.4, 12.6, 1.4, SLATE_DK);
  });
  line(c, 2.2, g - 1.4, 14.8, g - 1.4, INK, LWF);
  // A roof lip.
  rbox(c, 1.6, TOP - 0.6, 13.8, 1.2, 0.4, SLATE_DK, INK, LWI);
  // Vents, lit from inside: it is burning in there too.
  const heat = [0.55, 0.8, 1, 0.7, 0.5, 0.9, 0.65, 0.8][f];
  for (let i = 0; i < 3; i++) {
    rbox(c, 4.0, TOP + 1.6 + i * 1.3, 4.2, 0.65, 0.3, `rgba(255,${90 + 60 * heat},${60 + 30 * heat},1)`, INK, LWF);
  }
  // HIGH VOLTAGE: a white triangle in a red border, the bolt in black.
  poly(c, [11.2, TOP + 1.3, 13.9, TOP + 5.9, 8.5, TOP + 5.9], WHITE, RED, 0.7);
  poly(c, [11.6, TOP + 2.5, 10.4, TOP + 4.2, 11.3, TOP + 4.2, 10.7, TOP + 5.4, 12.1, TOP + 3.6, 11.2, TOP + 3.6], INK);
  // The door seam, its handle and the red fault lamp.
  line(c, 8.6, TOP + 7.2, 8.6, g - 1.6, INK, LWF);
  box(c, 7.6, TOP + 9.0, 0.6, 2.0, STEEL, INK, LWF);
  circ(c, 12.4, TOP + 8.2, 0.7, f % 4 < 2 ? RED : RED_DK, INK, LWF);
  if (f % 4 < 2) circ(c, 12.4, TOP + 8.2, 1.5, 'rgba(255,46,77,0.28)');
}

// D — RISING BOLLARDS (floor 20x16, bedded). The spike plate's answer in this city:
// three security bollards pumping up out of the road like pistons, a beat apart, red
// LED crowns and a reflective band. Never below the box — always out, always lethal,
// always moving, as the plate's teeth are. The road clip cuts them at the surface.
function risingBollards(c, w, h, t) {
  const f = frameOf(t, 8, 9);
  const POSTS = [4.2, 10.0, 15.8];
  const PW = 3.6;
  POSTS.forEach((x, i) => {
    const p = (((f + i * 3) % 8) / 8) * TAU;
    // A quick shove up and a slower settle (popSpikes' curve, normalised 0..1).
    const up = (Math.sin(p) + 0.25 * Math.sin(2 * p) + 0.15 * Math.cos(p) + 1.052) / 2.214;
    const top = 5.4 - 4.6 * up;
    body(c, (q) => q.roundRect(x - PW / 2, top, PW, h + 6 - top, [1.4, 1.4, 0, 0]), STEEL, (q) => {
      box(q, x + PW / 2 - 1.1, 0, 2, h + 6, STEEL_DK);
      box(q, x - PW / 2 + 0.45, top + 1.6, 0.55, h, STEEL_LT);
      box(q, x - PW / 2, top + 3.0, PW, 1.2, WHITE);
      box(q, x - PW / 2, top + 4.2, PW, 1.2, RED);
    });
    // The crown: a red LED cap, brightest at the top of the stroke.
    c.save();
    c.beginPath();
    c.roundRect(x - PW / 2, top, PW, 1.5, [1.4, 1.4, 0, 0]);
    c.fillStyle = RED;
    c.fill();
    c.restore();
    tube(c, RED, 0.55, (q) => { q.moveTo(x - PW / 2 + 0.7, top + 0.75); q.lineTo(x + PW / 2 - 0.7, top + 0.75); }, 0.55 + 0.45 * up, 0.4);
    c.beginPath();
    c.roundRect(x - PW / 2, top, PW, h + 6 - top, [1.4, 1.4, 0, 0]);
    pen(c, INK, LW);
    c.stroke();
  });
}

// E — LASER FAN (saw 20x15, bedded). The floor saw's half-disc made of light: an
// emitter dome in the road throws a fan of red beams that sweeps round — one ray's
// spacing to the ring, so it turns like the blade did and never strobes back. THOSE
// LASERS COST ME A FORTUNE, says the boss. The road clip cuts it at the surface.
function laserFan(c, w, h, t) {
  const f = frameOf(t, 8, 16);
  const road = h - 2, cx = w / 2, R = 8.6;
  const N = 7, step = Math.PI / (N - 1);
  const off = (f / 8) * step;
  // The swept disc, faint, so the fan has a silhouette as well as rays.
  c.beginPath();
  c.moveTo(cx, road);
  c.arc(cx, road - 0.8, R, Math.PI, TAU);
  c.closePath();
  c.fillStyle = 'rgba(255,46,77,0.2)';
  c.fill();
  for (let k = 0; k < N; k++) {
    const a = Math.PI + off + k * step;
    if (a > TAU - 0.12) continue;
    const ex = cx + Math.cos(a) * R, ey = road - 0.8 + Math.sin(a) * R;
    tube(c, RED, 0.62, (p) => { p.moveTo(cx, road - 0.8); p.lineTo(ex, ey); }, 1, 0.32);
    circ(c, ex, ey, 0.42, RED_HOT);
  }
  // The emitter: a dark dome in a steel collar, the lens white-hot.
  c.beginPath();
  c.moveTo(cx - 3.4, road + 0.4);
  c.quadraticCurveTo(cx - 3.2, road - 2.6, cx, road - 2.8);
  c.quadraticCurveTo(cx + 3.2, road - 2.6, cx + 3.4, road + 0.4);
  c.closePath();
  fillStroke(c, CAB, INK, LWI);
  box(c, cx - 4.4, road - 0.6, 8.8, 1.4, STEEL, INK, LWI);
  circ(c, cx, road - 1.6, 0.85, RED, INK, LWF);
  circ(c, cx, road - 1.6, 0.4, WHITE);
}

export {
  TAU, INK, LW, LWI, LWF, RED, RED_DK, RED_HOT, CYAN, LAMP, WHITE, CAB, CAB_LT, CAB_DK, HULL, HULL_LT, HULL_DK, STEEL, STEEL_LT, STEEL_DK, SLATE, SLATE_LT, SLATE_DK, TYRE, TYRE_LT, CREAM, CREAM_LT, CREAM_DK, ARC, pen, fillStroke, box, rbox, circ, ell, poly, line, rr, disc, body, whiteHot, tube, hash, sparks,
  frameOf, runawayWheel, jacobsLadder, risingBollards, laserFan,
};

// ------------------------------------------------------------------ registry
// type id -> box (the slot's), PROP_TALL, the painter's own frame ring. The wheel is drawn
// still: the barrel's roll branch (draw.js) turns the whole drawing, which is exactly right
// for a wheel, and sparks thrown off one fixed point would only spin with it.
export const NEON_PROP_SPECS = {
  runawayWheel: { box: [13, 13], frames: 1, fps: 1, paint: (c, w, h, t) => runawayWheel(c, w, h, t, true) },
  jacobsLadder: { box: [13, 13], tall: 1.7, frames: 8, fps: 12, paint: jacobsLadder },
  risingBollards: { box: [15, 7], tall: 1.75, frames: 8, fps: 9, paint: risingBollards },
  laserFan: { box: [15, 8], tall: 1.45, frames: 8, fps: 16, paint: laserFan },
};
