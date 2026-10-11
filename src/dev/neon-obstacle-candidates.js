// Gallery-only TERMINAL VELOCITY OBSTACLE concepts — ten things that stand, roll,
// hover or rise in the neon lane, drawn in the city's own hand.
//
// THE COMPLAINT (12 Oct 2026). Peter, after the office sheet: "can you examine
// obstacles in other cabinets (except cardboard) and recommend new items or
// replacements that fit in more with their style".
//
// WHAT NEON DEALS. The cabinet already swaps the worst of the shared bank
// (data/cabinets.js, `swaps`): no cactus ever reaches this road — it comes down as
// the road-works panda, frog or monkey, a crate, a spike plate or a cone — and no
// songbird reaches this sky; it is a drone or a target. What is left:
//
//   * the wooden X CRATE — the commonest ground read here (four BASE patterns plus
//     the cactus fallbacks), out of a western warehouse;
//   * the wooden BARREL (tier 2) and the rusty oil-drum FIRE BARREL — a hobo fire
//     on a viaduct of glass and light;
//   * the grey SPIKE PLATE, FLOOR SAW and RAZOR HURDLE — Plumber's and Speed's
//     factory floor, steel-grey on a violet night;
//   * the red-and-white archery BULLSEYE in the air — the very thing neon-1's
//     DESTROY 5 TARGETS mission is about, and a fairground prop;
//   * the purple capsule DRONE and its armed twin — half of every neon level's
//     hazards, generic, and purple on purple.
//
// What fits stays: the traffic cone and the three road-works animals (Peter's picks,
// 24 Sep, src/dev/neon-street-candidates.js) are a Tokyo street, and the animals
// have their own sheet. Not re-proposed: the vending machine and the red lantern
// (turned down in that round), and the Tokyo ideas sheet's daruma, lucky cat,
// crossing arm, tanuki, paper crane and lantern ghost (neon-japan-ideas.js).
//
// THE HAND. Everything behind the lane is neon tube — wireframe towers, the moon,
// Tokyo Tower — and the one foreground object the cabinet drew for itself, the
// train (sprites/train.js), is a dark hull with a tube contour and a white-hot
// core. So: flat bodies in one ink at one weight with one lit sliver and one shade
// band — the street barriers' hand — and the LIGHT on each thing is tube: a faint
// wide stroke, the colour, a white-hot core. The light that says danger is RED:
// the backdrop owns cyan, magenta and the coin amber (the scenery sheet's rule: "a
// fourth hue in the backdrop is a hue the player has to learn is not a pickup"),
// and the guide teaches RED = AVOID. Cyan appears only as a small detail (a fan
// ring, a card reader) and never carries the read.
//
// TWO SKIES. neon-1 opens in cut-paper GOLDEN HOUR — peach, bright, the tube glow
// switched off — and turns to night on the strike; obstacles are rasters and do
// not change with it. So every body is dark-inked to stand off the peach, and
// every one carries enough lit red to stand off the night. The three strips are
// that day (the city still arriving: Fuji and the far mass), the night it turns
// into, and neon-3's night under Tokyo Tower.
//
// THE COORDINATES. See obstacle-bakeoff-kit.js: each painter fills its PAINTED
// ENVELOPE in world units with the ground at y = h, `t` quantised to its own frame
// ring. Porting is a 3/4 scale into sprites/props.js. No glow here composites with
// 'lighter': a prop is rastered onto a transparent canvas, where an additive pass
// comes out as plain alpha, so the sheet paints what the run would. The run also
// lays the pack's magenta bloom round every prop (neonPack.decorate); the sheet
// leaves it off, as the control does. All self-outlined: a port joins
// SELF_OUTLINED_PROPS and skips the shared hazard rim.
//
// Nothing here is registered in any gameplay registry.
import { frameOf } from './obstacle-bakeoff-kit.js';
import { NEON_GOLDEN_MOOD, neonNightMood } from '../engine/stylePacks/index.js';

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

// A — SPEAKER STACK (stack 16x15). Black PA cabinets with a red LED ring round the
// woofer: the cone kicks on every beat (two to the ring, 150 bpm, the neon song's
// tempo) and the ring flares with it. Stacks two high like a sound system.
const KICK = [1, 0.5, 0.18, 0, 1, 0.5, 0.18, 0];
function speakerStack(c, w, h, t) {
  const f = frameOf(t, 8, 10);
  const kick = KICK[f];
  const g = h - 0.2;
  const X0 = 1.0, X1 = 15.0, Y0 = 0.6;
  body(c, rr(X0, Y0, X1 - X0, g - Y0, 0.9), CAB, (p) => {
    box(p, X1 - 1.7, 0, 2, h, CAB_DK);
    box(p, X0, Y0, X1 - X0, 0.9, CAB_LT);
    box(p, X0 + 0.5, Y0 + 1.2, 0.7, g - Y0 - 2.4, CAB_LT);
  });
  // Steel corner guards, the road-case kind.
  for (const [x, y, sx, sy] of [[X0, Y0, 1, 1], [X1, Y0, -1, 1], [X0, g, 1, -1], [X1, g, -1, -1]]) {
    poly(c, [x, y, x + 2.3 * sx, y, x + 2.3 * sx, y + 0.8 * sy, x + 0.8 * sx, y + 0.8 * sy,
      x + 0.8 * sx, y + 2.3 * sy, x, y + 2.3 * sy], STEEL, INK, LWF);
  }
  // The horn tweeter, and the power lamp.
  rbox(c, 4.2, 2.0, 7.6, 2.8, 1.3, '#2c2848', INK, LWI);
  line(c, 5.6, 3.4, 10.4, 3.4, INK, 0.5);
  circ(c, 13.0, 2.6, 0.55, kick > 0.4 ? LAMP : RED_DK, INK, LWF);
  // The woofer: surround, the LED ring outside it, the cone and the dust cap.
  const cx = 8, cy = 9.6;
  circ(c, cx, cy, 4.5, '#0a0916', INK, LWI);
  tube(c, RED, 0.85, (p) => p.arc(cx, cy, 4.75, 0, TAU), 0.45 + 0.55 * kick, 0.3);
  const rc = 3.5 * (1 + 0.08 * kick);
  body(c, disc(cx, cy, rc), '#3b3760', (p) => {
    circ(p, cx - rc * 0.35, cy - rc * 0.35, rc * 0.8, '#57527f');
    circ(p, cx + rc * 0.1, cy + rc * 0.1, rc * 0.78, '#3b3760');
  }, INK, LWI);
  circ(c, cx, cy, 1.35 * (1 + 0.12 * kick), '#1b1930', INK, LWF);
  circ(c, cx - 0.45, cy - 0.45, 0.35, 'rgba(255,255,255,0.55)');
}

// B — RUNAWAY WHEEL (barrel 17x17). A wheel off a light-bike: black tyre, a red
// light ring in the rim, five spokes and a white-hot hub, sparks thrown off the back
// of the contact patch. Round, so the run's barrel spin (roll: true) is exactly right
// for it — a port draws it still and lets the roll turn it; here it turns itself.
function runawayWheel(c, w, h, t) {
  const f = frameOf(t, 8, 16);
  const R = 8.2, cx = w / 2, cy = h - 0.1 - R;
  // Rolls left at the hero, so the contact patch throws its sparks back and up.
  sparks(c, cx + 1.6, h - 0.5, f, 3, { n: 4, dir: -0.35, spread: 0.45, len: 3.6 });
  const spin = -(f / 8) * (TAU / 5);
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

// F — LASER TRIPWIRE (hurdle 21x12). Two chrome emitter posts and two red beams
// strung between them — the security fence of a city that can afford lasers. A
// pulse runs down each beam from the emitter to the catcher, and the cap lamps blink.
// Armoured, as the razor hurdle is: you clear it, you do not shoot it.
function laserTripwire(c, w, h, t) {
  const f = frameOf(t, 8, 12);
  const g = h - 0.2;
  const PX = [2.6, 18.4];
  const BEAMS = [3.6, 7.2];
  const x0 = PX[0] + 1.2, x1 = PX[1] - 1.2;
  for (const px of PX) {
    rbox(c, px - 2.3, g - 1.1, 4.6, 1.1, 0.4, CAB, INK, LWI);
    body(c, rr(px - 1.2, 1.0, 2.4, g - 1.0 - 1.0, 0.6), STEEL, (p) => {
      box(p, px + 0.3, 0, 1.2, h, STEEL_DK);
      box(p, px - 0.9, 1.6, 0.5, g - 3.2, STEEL_LT);
    });
    rbox(c, px - 1.5, 0.4, 3.0, 1.4, 0.5, CAB, INK, LWI);
    circ(c, px, 1.1, 0.42, (f + (px > 10 ? 4 : 0)) % 8 < 2 ? LAMP : RED_DK);
  }
  // The beams, then the pulse riding each one.
  for (const [i, y] of BEAMS.entries()) {
    tube(c, RED, 0.6, (p) => { p.moveTo(x0, y); p.lineTo(x1, y); }, 1, 0.34);
    const u = ((f + i * 4) % 8) / 8;
    const px = x0 + (x1 - x0) * u;
    line(c, Math.max(x0, px - 1.6), y, Math.min(x1, px + 0.6), y, RED_HOT, 0.75);
  }
  // The lens housings, facing in.
  for (const [px, s] of [[PX[0], 1], [PX[1], -1]]) {
    for (const y of BEAMS) {
      rbox(c, px + s * 0.6 - (s < 0 ? 1.1 : 0), y - 0.85, 1.1, 1.7, 0.3, CAB, INK, LWF);
      circ(c, px + s * 1.2, y, 0.5, RED, INK, 0.15);
    }
  }
}

// G — TICKET GATE (hurdle 21x12, a solid cabinet — no split feet). The station
// barrier every Tokyo commuter has walked into: seen three-quarter, the near
// cabinet, the far one behind it, a blue card reader on top. The entry lamp flips
// from a cyan arrow to a red X and the red flaps SLAM shut across the passage, hold,
// and drop. This is TERMINAL VELOCITY: the hero does not have a ticket.
const GATE_SLOT = Object.freeze({ box: [16, 9], tall: 1, name: 'SHORT HURDLE (solid)', was: 'boomBarrier — 16x9, jump, armoured' });
function ticketGate(c, w, h, t) {
  const f = frameOf(t, 12, 8);
  const shut = [0, 0, 0, 0.6, 1, 1, 1, 1, 1, 0.55, 0.15, 0][f];
  const g = h - 0.2;
  const DX = 2.6, DY = -2.8;           // the passage: the far cabinet's offset into depth
  const X0 = 0.4, X1 = 17.6, TOP = 5.4;
  // The far cabinet: only its wall over the passage and its roof show above the near one.
  poly(c, [X0 + DX, TOP + DY, X1 + DX, TOP + DY, X1 + DX, g + DY, X0 + DX, g + DY], CREAM_DK, INK, LWI);
  box(c, X0 + DX, TOP + DY, X1 - X0, 1.2, CREAM, INK, LWF);
  // The flaps: a wing out of each cabinet's wall, rising out of the passage and
  // leaning in until they meet over it — the far one darker, set back. Seen side-on
  // a real flap is edge-on and invisible, so these are turned to face the camera.
  if (shut > 0) {
    const lift = 2.7 * shut;
    for (const [x, y, lean, fill] of [[14.6, TOP - 1.3, -0.14, RED_DK], [11.0, TOP + 0.3, 0.14, RED]]) {
      c.save();
      c.translate(x, y);
      c.rotate(lean);
      rbox(c, -2.0, -lift, 4.0, lift + 2.2, [1.4, 1.4, 0, 0], fill, INK, LWI);
      line(c, -1.3, -lift + 0.6, 1.3, -lift + 0.6, WHITE, 0.45);
      c.restore();
    }
  }
  // The near cabinet.
  body(c, rr(X0, TOP, X1 - X0, g - TOP, 0.6), CREAM, (p) => {
    box(p, X0, g - 1.6, X1 - X0, 1.6, CREAM_DK);
    box(p, X0 + 0.6, TOP + 1.2, X1 - X0 - 1.2, 0.6, CREAM_LT);
    box(p, X1 - 1.2, 0, 2, h, CREAM_DK);
  });
  // The blue panel down its side.
  rbox(c, 6.0, TOP + 2.2, 8.4, 2.0, 0.4, '#2f4fb8', INK, LWF);
  line(c, 7.0, TOP + 3.2, 13.4, TOP + 3.2, '#7d95f2', 0.3);
  // The card reader on the roof at the entry end, lit.
  poly(c, [1.4, TOP, 2.2, TOP - 1.6, 6.4, TOP - 1.6, 6.0, TOP], '#20203c', INK, LWI);
  tube(c, CYAN, 0.45, (p) => { p.moveTo(2.6, TOP - 0.9); p.lineTo(5.6, TOP - 0.9); }, 0.7, 0.3);
  // The entry lamp, on the end facing the hero: arrow while open, red X when shut.
  rbox(c, 1.2, TOP + 1.0, 3.6, 3.0, 0.4, INK, INK, LWF);
  if (shut > 0.5) {
    tube(c, RED, 0.5, (p) => {
      p.moveTo(2.2, TOP + 1.7); p.lineTo(3.8, TOP + 3.3);
      p.moveTo(3.8, TOP + 1.7); p.lineTo(2.2, TOP + 3.3);
    }, 1, 0.35);
  } else {
    tube(c, CYAN, 0.45, (p) => {
      p.moveTo(2.0, TOP + 2.5); p.lineTo(4.0, TOP + 2.5);
      p.moveTo(3.2, TOP + 1.8); p.lineTo(4.0, TOP + 2.5); p.lineTo(3.2, TOP + 3.2);
    }, 0.8, 0.3);
  }
}

// H — HOLO TARGET (skyTarget 16x15 at alt 40). The bullseye as this city would
// float one: a dark disc of glass with red and white tube rings, a reticle whose
// four ticks turn, scanlines falling through it, and the little projector puck under
// it throwing the cone of light that holds it up. One frame in eight it glitches.
function holoTarget(c, w, h, t) {
  const f = frameOf(t, 8, 10);
  const cx = w / 2, cy = 5.9, R = 5.2;
  const glitch = f === 5 ? 0.7 : 0;
  // The projector's cone, from the puck's lens up into the disc.
  const lens = h - 2.3;
  poly(c, [cx - 0.7, lens, cx + 0.7, lens, cx + 3.6, cy + 2.4, cx - 3.6, cy + 2.4], 'rgba(255,90,122,0.3)');
  for (const s of [-1, 1]) line(c, cx + s * 0.7, lens, cx + s * 3.6, cy + 2.4, 'rgba(255,160,180,0.55)', 0.22);
  // The puck.
  ell(c, cx, h - 1.3, 2.7, 0.95, CAB, INK, LWI);
  box(c, cx - 2.1, h - 1.3, 4.2, 0.45, CAB_DK);
  circ(c, cx, lens, 0.5, LAMP, INK, LWF);
  c.save();
  c.translate(glitch, 0);
  // The disc of glass, so the rings stand off a peach sky as well as a night one.
  circ(c, cx, cy, R, 'rgba(26,12,44,0.82)', INK, LWI);
  c.save();
  c.beginPath();
  c.arc(cx, cy, R, 0, TAU);
  c.clip();
  for (let y = cy - R + ((f * 0.5) % 1.5); y < cy + R; y += 1.5) line(c, cx - R, y, cx + R, y, 'rgba(255,208,216,0.12)', 0.35);
  c.restore();
  tube(c, RED, 0.85, (p) => p.arc(cx, cy, R - 0.9, 0, TAU), glitch ? 0.6 : 1, 0.3);
  tube(c, '#ffe8ec', 0.6, (p) => p.arc(cx, cy, R - 2.5, 0, TAU), glitch ? 0.5 : 0.9, 0.25);
  tube(c, RED, 0.75, (p) => p.arc(cx, cy, R - 3.9, 0, TAU), 1, 0.3);
  circ(c, cx, cy, 0.75, WHITE);
  // The reticle's four ticks, a sixteenth of a turn to the ring.
  const spin = (f / 8) * (TAU / 4);
  for (let k = 0; k < 4; k++) {
    const a = spin + (k / 4) * TAU;
    tube(c, RED, 0.5, (p) => {
      p.moveTo(cx + Math.cos(a) * (R - 0.2), cy + Math.sin(a) * (R - 0.2));
      p.lineTo(cx + Math.cos(a) * (R + 0.6), cy + Math.sin(a) * (R + 0.6));
    }, 1, 0.3);
  }
  c.restore();
}

// I — SCANNER DRONE (low 22x13). The workhorse redrawn in the train's hull: a flat
// black-violet body, two ducted fans with cyan blur, a red underglow, and across its
// face the red scanner bar — a light that runs left and right and leaves a tail. The
// machine LOOKS for you. Slide under it.
function droneHull(c, f) {
  // Fans: a duct seen edge-on at each shoulder, its blur turning.
  for (const x of [5.0, 17.0]) {
    ell(c, x, 3.4, 3.6, 1.05, CAB, INK, LWI);
    const k = (f % 4) / 4;
    line(c, x - 2.8 + k * 1.4, 3.2, x + 0.4 + k * 1.4, 3.2, 'rgba(56,216,248,0.9)', 0.45);
    tube(c, CYAN, 0.35, (p) => p.ellipse(x, 3.4, 3.6, 1.05, 0, 0, TAU), 0.55, 0.2);
    box(c, x - 0.45, 4.2, 0.9, 1.4, CAB_DK, INK, LWF);
  }
  // The body.
  body(c, (p) => {
    p.moveTo(2.4, 6.8);
    p.lineTo(4.4, 5.2);
    p.lineTo(17.6, 5.2);
    p.lineTo(19.6, 6.8);
    p.lineTo(18.2, 10.6);
    p.lineTo(3.8, 10.6);
    p.closePath();
  }, HULL, (p) => {
    box(p, 0, 5.2, 22, 1.2, HULL_LT);
    box(p, 0, 9.4, 22, 1.4, HULL_DK);
  });
  // The underglow: a red tube along the belly and the light it throws down, which
  // is what lifts a dark hull off a dark city — and says it is hovering.
  ell(c, 11, 11.9, 6.6, 1.0, 'rgba(255,46,77,0.2)');
  tube(c, RED, 0.5, (p) => { p.moveTo(4.6, 10.75); p.lineTo(17.4, 10.75); }, 0.9, 0.35);
}
function scannerBar(c, f, n) {
  // A ping-pong across the bar, with a two-step tail.
  const pos = (k) => {
    const m = ((k % (2 * n - 2)) + (2 * n - 2)) % (2 * n - 2);
    return m < n ? m : 2 * n - 2 - m;
  };
  const X0 = 5.0, X1 = 17.0, Y = 7.9;
  rbox(c, X0 - 0.6, Y - 1.0, X1 - X0 + 1.2, 2.0, 0.9, '#0c0618', INK, LWF);
  const cell = (X1 - X0) / (n - 1);
  for (let k = 0; k < n; k++) box(c, X0 + k * cell - 0.5, Y - 0.35, 1.0, 0.7, RED_DK);
  for (const [lag, a] of [[2, 0.3], [1, 0.6], [0, 1]]) {
    const x = X0 + pos(f - lag) * cell;
    tube(c, RED, 0.95, (p) => { p.moveTo(x - 0.5, Y); p.lineTo(x + 0.5, Y); }, a, 0.35);
  }
}
function scannerDrone(c, w, h, t) {
  const f = frameOf(t, 12, 14);
  droneHull(c, f);
  scannerBar(c, f, 7);
}

// J — SCANNER GUNSHIP (shooter 22x13 at alt 44). I armed, by construction, the way
// the shipped shooter is the workhorse with a muzzle: the same hull and scanner, a
// red patrol beacon turning on its back and a ball turret slung under it, its
// barrel tracking down toward the lane.
const GUNSHIP_RISE = 1.6;
function scannerGunship(c, w, h, t) {
  const f = frameOf(t, 12, 14);
  c.save();
  c.translate(0, -GUNSHIP_RISE);
  // The turret, slung under the hull, its barrel tracking down to the left.
  const a = Math.PI * 0.64 + Math.sin((f / 12) * TAU) * 0.16;
  const TX = 11, TY = 10.9, BL = 3.4;
  const mx = TX + Math.cos(a) * BL, my = TY + Math.sin(a) * BL;
  line(c, TX, TY, mx, my, INK, 1.35);
  line(c, TX, TY, mx, my, STEEL, 0.6);
  droneHull(c, f);
  body(c, disc(TX, TY, 1.8), CAB, (p) => circ(p, TX - 0.6, TY - 0.6, 1.1, CAB_LT), INK, LWI);
  circ(c, TX - 0.5, TY + 0.2, 0.45, RED, INK, 0.15);
  circ(c, mx, my, 0.5, f % 6 === 0 ? RED_HOT : RED, INK, 0.15);
  scannerBar(c, f, 7);
  // The beacon on its back, between the fans: a red dome, its beam swinging round.
  const sw = Math.cos((f / 12) * TAU);
  if (Math.abs(sw) > 0.3) {
    poly(c, [11 + sw * 0.6, 3.9, 11 + sw * 5.2, 2.2, 11 + sw * 5.2, 5.0], 'rgba(255,46,77,0.38)');
  }
  rbox(c, 9.7, 3.0, 2.6, 2.2, [1.3, 1.3, 0, 0], RED, INK, LWI);
  circ(c, 11 + sw * 0.6, 3.9, 0.5, RED_HOT);
  c.restore();
}

// ============================================================== the sheet
export const BAKEOFF = {
  cabinet: 'neon',
  title: 'TERMINAL VELOCITY — obstacles for the neon city (bake-off)',
  note: 'Neon already swaps out the cactus and the songbird; what is left is the shared factory bank — a wooden X crate (the commonest thing on this road), a wooden barrel, an oil-drum fire, the grey spike plate, saw and razor hurdle — plus a fairground bullseye for the cabinet\'s own target mission and a generic purple drone on a purple night. '
    + 'The cone and the road-works animals fit and stay. '
    + 'Ten replacements in the city\'s hand — inked flat bodies, red tube light, white-hot cores — so each stands off neon-1\'s golden paper sky and the night it turns into. Pick letters.',
  // One strip of the real frame per entry. neon-1 opens in the golden hour (the city
  // still arriving behind Fuji) and turns to night on the strike; neon-3 is the
  // aurora night (the curtains hang above the lane crop) with Tokyo Tower centre
  // stage. Progress is pinned so the scroll does not walk a strip through the
  // arrival or past the tower.
  strips: [
    { label: 'TERMINAL VELOCITY 1 · GOLDEN HOUR', stageIndex: 1, camX: 300, bc: { neonMood: NEON_GOLDEN_MOOD, progress: 0.09 } },
    { label: 'TERMINAL VELOCITY 1 · NIGHT', stageIndex: 1, camX: 1800, bc: { progress: 0.3 } },
    { label: 'TERMINAL VELOCITY 3 · TOWER', stageIndex: 3, camX: 2950, bc: { neonMood: neonNightMood(1), progress: 0.5 } },
  ],
  // The detail row's panels: golden hour's lane sky, the night, and the road.
  swatches: [
    { sky: '#ffd49a', ground: '#fff0c8', under: '#2a1e3a', ink: 'rgba(20,16,30,.55)' },
    { sky: '#1a1048', ground: '#38d8f8', under: '#0c0c20' },
    { sky: '#0a0a2a', ground: '#38d8f8', under: '#0c0c20' },
  ],
  // What the cabinet actually deals today (after its swaps), through the real run
  // painter: [type, x]. The hero runs at x 50..72.
  control: [['crate', 2], ['popSpikes', 18], ['trafficCone', 36], ['barrel', 78], ['boomBarrier', 96],
    ['floorSaw', 118], ['fireBarrel', 138], ['pandaBarrier', 158], ['crate', 178],
    ['drone', 120], ['target', 150], ['shooterDrone', 196]],
  candidates: [
    { letter: 'A', id: 'speakerStack', name: 'SPEAKER STACK', slot: 'stack', paint: speakerStack,
      note: 'Black PA cabinets in road-case corners, a red LED ring round each woofer. The cone kicks twice a ring — 150 bpm, the song\'s tempo — and the ring flares with it. Replaces the wooden crate; stacks two high.' },
    { letter: 'B', id: 'runawayWheel', name: 'RUNAWAY WHEEL', slot: 'barrel', paint: runawayWheel,
      note: 'A wheel off a light-bike: black tyre, a red light ring in the rim, white-hot hub, sparks off the contact patch. Round, so the barrel\'s roll spin is exactly right for it. Replaces the wooden barrel.' },
    { letter: 'C', id: 'jacobsLadder', name: 'JACOB\'S LADDER', slot: 'fire', paint: jacobsLadder,
      note: 'The warm one, made live: a roadside power cabinet with a HIGH VOLTAGE plate and glowing vents, and an arc climbing the V of rods on its roof, snapping at the top. Shootable. Replaces the oil-drum fire.' },
    { letter: 'D', id: 'risingBollards', name: 'RISING BOLLARDS', slot: 'floor', paint: risingBollards,
      note: 'Three security bollards pumping up out of the road a beat apart, red LED crowns, reflective bands — never below the box. Replaces the spike plate (and could take the saw\'s turns too).' },
    { letter: 'E', id: 'laserFan', name: 'LASER FAN', slot: 'saw', paint: laserFan,
      note: 'The saw\'s half-disc made of light: an emitter dome in the road throwing a fan of red beams that sweeps a ray a ring. The boss\'s lasers, finally on the floor. Replaces the floor saw.' },
    { letter: 'F', id: 'laserTripwire', name: 'LASER TRIPWIRE', slot: 'hurdle', paint: laserTripwire,
      note: 'Two chrome emitter posts and two red beams between them, a pulse running down each, cap lamps blinking. Armoured, as the razor hurdle is. Replaces the razor hurdle.' },
    { letter: 'G', id: 'ticketGate', name: 'TICKET GATE', slot: GATE_SLOT, paint: ticketGate,
      note: 'The station barrier, three-quarter on: cream cabinets, a blue card reader, and the entry lamp flips to a red X as the red flaps slam shut, hold and drop. The hero has no ticket. Replaces the razor hurdle; solid, so no split feet.' },
    { letter: 'H', id: 'holoTarget', name: 'HOLO TARGET', slot: 'skyTarget', paint: holoTarget,
      note: 'The bullseye as this city floats one: a dark glass disc with red and white tube rings, a turning reticle, falling scanlines, and the projector puck underneath holding it up. Glitches one frame in eight. Replaces the archery target.' },
    { letter: 'I', id: 'scannerDrone', name: 'SCANNER DRONE', slot: 'low', paint: scannerDrone,
      note: 'The workhorse in the train\'s hull: flat black-violet body, two ducted fans, a red underglow, and a red scanner light running across its face with a tail. Slide under. Replaces the purple drone.' },
    { letter: 'J', id: 'scannerGunship', name: 'SCANNER GUNSHIP', slot: 'shooter', paint: scannerGunship,
      note: 'I, armed — as the shipped shooter is the workhorse with a muzzle: a red patrol beacon turning on its back and a ball turret whose barrel tracks down at the lane. Replaces the shooter drone.' },
  ],
};

export { frameOf };
