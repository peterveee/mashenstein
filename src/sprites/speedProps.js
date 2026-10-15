// SPEED lane obstacles picked from the 12 Oct 2026 bake-off (15 Oct 2026; see
// src/dev/speed-obstacle-candidates.js for the sheet and the ones not picked). Moved here
// verbatim from the candidate module, which now imports its palette and helpers back.
// Every painter is authored in its PAINTED ENVELOPE in world units — box x 4/3 x
// PROP_TALL x PROP_VISUAL_SCALE — with the ground at y = h, on a clock `t` it quantises
// to its own ring; the registry below hands it frame/fps and scales the envelope onto
// the raster props.js gives it. Like officeProps.js, nothing here imports props.js.
import { MCM_KIT, MCM_PALETTES, arcPalette, actU } from '../engine/stylePacks/speedMcm.js';

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;

const TAU = Math.PI * 2;
const { burst } = MCM_KIT;

// ------------------------------------------------------------------ palette
// The backdrop's warm ink, and the period's hazard set.
const INK = '#2a1d1e';
const TOMATO = '#e2412c', TOMATO_DK = '#a8291f', TOMATO_LT = '#ff7c5c';
const MUSTARD = '#f0b12a', MUSTARD_DK = '#b97d14', MUSTARD_LT = '#ffe08a';
const CREAM = '#fbf1d6', CREAM_DK = '#dcc79d';
const SPARK = '#fff6d6';
const CHROME = '#dfe7e2', CHROME_DK = '#98aaa6', CHROME_LT = '#ffffff';
const REFLECT = '#86d2c8'; // the sky in the chrome: a flat turquoise band
const TEAL = '#23928e', TEAL_DK = '#17605f';
const GLASS = '#8fe1d6', GLASS_DK = '#4fb4ab';
const BLACK = '#2c2627', BLACK_LT = '#5a5662', BLACK_DK = '#171314';
const CACTUS = '#3f9a5a', CACTUS_DK = '#286c43', CACTUS_LT = '#86d38c';
const FRUIT = '#dc2f55', FRUIT_DK = '#981d3b', FRUIT_LT = '#ff8a9a';
const FLAME = ['#e8452c', '#f6962c', '#ffe08a', '#fff6d6'];
const FUSE = '#7a4a3a';

// The key plate: how far the ink silhouette slips (world units; the coyote's
// ~1 px up and right, doubled for the run's zoom) and how much it grows.
const SLIP_X = 0.42, SLIP_Y = -0.34, GROW = 0.42;
// The loose interior rule, slipped the same way but less.
const LWI = 0.32;
const REG_IN = [0.28, -0.22];

// ------------------------------------------------------------------ helpers
// Path builders, so one shape serves the key plate, its colour plate and its clip.
const oval = (x, y, rx, ry, rot = 0) => (p) => p.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
const rect = (x, y, w, h) => (p) => p.rect(x, y, w, h);
const rrect = (x, y, w, h, r) => (p) => p.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
const poly = (pts) => (p) => {
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  p.closePath();
};

// The print's first pass: every silhouette part filled and stroked in ink, grown
// by GROW and slipped up-right. The colour plates go over it. `k` scales the slip
// and growth for thin parts (a spike, a leg), which at full slip print as a black
// twin beside themselves — the backdrop slips its small things less for the same
// reason (REG_SMALL).
function keyAt(c, k, paths) {
  c.save();
  c.translate(SLIP_X * k, SLIP_Y * k);
  c.fillStyle = INK;
  c.strokeStyle = INK;
  c.lineWidth = GROW * 2 * Math.min(1, k + 0.25);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  for (const path of paths) {
    c.beginPath();
    path(c);
    c.fill();
    c.stroke();
  }
  c.restore();
}
const key = (c, ...paths) => keyAt(c, 1, paths);
const keyFine = (c, ...paths) => keyAt(c, 0.45, paths);

// A flat colour plate, with its shade band, sliver and grain clipped inside it.
function plate(c, path, fill, inner = null) {
  c.save();
  c.beginPath();
  path(c);
  c.fillStyle = fill;
  c.fill();
  if (inner) {
    c.clip();
    inner(c);
  }
  c.restore();
}

function fill(c, path, col, a = 1) {
  c.beginPath();
  path(c);
  c.globalAlpha = a;
  c.fillStyle = col;
  c.fill();
  c.globalAlpha = 1;
}

// The backdrop's dry-brush bake laid into the current clip, at its on-screen grain
// (the pack draws it at half scale in screen px; the world is at zoom 2).
function grain(c, alpha, kind = 'dryD') {
  const pat = MCM_KIT.pats(c, MCM_PALETTES.midday)[kind];
  if (!pat) return;
  if (pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([0.25, 0, 0, 0.25, 0, 0]));
  c.globalAlpha = alpha;
  c.fillStyle = pat;
  c.fillRect(-40, -40, 120, 120);
  c.globalAlpha = 1;
}

// The loose rule: an open line in ink, slipped off its colour.
function rule(c, pts, w = LWI, col = INK, a = 0.9, reg = REG_IN) {
  c.beginPath();
  c.moveTo(pts[0] + reg[0], pts[1] + reg[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i] + reg[0], pts[i + 1] + reg[1]);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = col;
  c.lineWidth = w;
  c.globalAlpha = a;
  c.stroke();
  c.globalAlpha = 1;
}

// A slipped contour round a shape already painted: the seam between two plates.
function contour(c, path, w = LWI, a = 0.85) {
  c.save();
  c.translate(REG_IN[0], REG_IN[1]);
  c.beginPath();
  path(c);
  c.strokeStyle = INK;
  c.lineWidth = w;
  c.globalAlpha = a;
  c.lineJoin = 'round';
  c.stroke();
  c.restore();
}

// A point on a rotated ellipse, at angle `th` in its own frame (-PI/2 is its top).
function rim(cx, cy, rx, ry, rot, th) {
  const x = Math.cos(th) * rx, y = Math.sin(th) * ry;
  return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
}

// A glint: the backdrop's lamp — a flat halo disc and a starburst round a white dot.
function glint(c, x, y, r, col = SPARK) {
  if (r <= 0) return;
  fill(c, oval(x, y, r * 0.75, r * 0.75), col, 0.32);
  burst(c, x, y, r, 0.3, col, Math.max(0.18, r * 0.12), 8);
  fill(c, oval(x, y, r * 0.22, r * 0.22), '#ffffff');
}

// ================================================================ painters
// All in world units inside the envelope, ground at y = h.

// A — PRICKLY PEAR (stand 17x25). Paddle ovals, the shade a hard split down each
// pad as the backdrop splits its saguaros, cream areoles, tomato-magenta fruit.
const PEAR_PADS = [
  { x: 4.6, y: 11.4, rx: 3.0, ry: 4.2, rot: -0.5, fruit: [-2.0, -1.35] },
  { x: 11.4, y: 9.0, rx: 3.6, ry: 4.9, rot: 0.26, fruit: [-1.95, -1.4, -0.95] },
  { x: 7.8, y: 18.8, rx: 4.9, ry: 6.0, rot: -0.05, fruit: [] },
];
const AREOLES = [[-0.45, -0.45], [0.3, -0.6], [0.02, -0.08], [-0.5, 0.32], [0.48, 0.18], [0.05, 0.62]];

function pricklyPear(c, w, h, t) {
  const f = frameOf(t, 9, 6);
  const fruitAt = (pad, th) => {
    const [x, y] = rim(pad.x, pad.y, pad.rx * 1.02, pad.ry * 1.02, pad.rot, th);
    const n = th + Math.PI / 2;
    return { x, y, rot: pad.rot + n * 0.6 };
  };
  const fruits = PEAR_PADS.flatMap((pad) => pad.fruit.map((th) => fruitAt(pad, th)));
  key(c, ...PEAR_PADS.map((p) => oval(p.x, p.y, p.rx, p.ry, p.rot)), ...fruits.map((q) => oval(q.x, q.y, 1.2, 1.55, q.rot)));
  let n = 0;
  for (const pad of PEAR_PADS) {
    const shape = oval(pad.x, pad.y, pad.rx, pad.ry, pad.rot);
    plate(c, shape, CACTUS, (p) => {
      p.translate(pad.x, pad.y);
      p.rotate(pad.rot);
      p.fillStyle = CACTUS_DK;
      p.fillRect(-pad.rx - 1, -pad.ry - 1, pad.rx * 0.92, pad.ry * 2 + 2);
      fill(p, oval(pad.rx * 0.6, -pad.ry * 0.12, pad.rx * 0.18, pad.ry * 0.58), CACTUS_LT);
      grain(p, 0.16);
    });
    contour(c, shape);
    // Areoles: a cream dot and three spines each; one at a time catches the sun.
    for (const [u, v] of AREOLES) {
      const [x, y] = rim(pad.x, pad.y, pad.rx * Math.hypot(u, v) * 1.4, pad.ry * Math.hypot(u, v) * 1.4, pad.rot, Math.atan2(v, u));
      const dot = pad.rx * 0.11;
      fill(c, oval(x, y, dot, dot), CREAM);
      rule(c, [x - 0.9, y - 0.6, x, y, x + 0.2, y - 1.1, x, y, x + 1.0, y - 0.45], 0.2, CREAM, 0.95, [0, 0]);
      // One areole a frame, every other one in turn round the plant.
      if (n++ === f * 2) glint(c, x, y - 0.3, 1.5);
    }
  }
  for (const q of fruits) {
    const shape = oval(q.x, q.y, 1.2, 1.55, q.rot);
    plate(c, shape, FRUIT, (p) => {
      p.translate(q.x, q.y);
      p.rotate(q.rot);
      p.fillStyle = FRUIT_DK;
      p.fillRect(-2, -2, 1.2, 4);
      fill(p, oval(0.55, -0.4, 0.28, 0.6), FRUIT_LT);
    });
    const [tx, ty] = rim(q.x, q.y, 1.2, 1.55, q.rot, -Math.PI / 2);
    fill(c, oval(tx, ty + 0.25, 0.42, 0.28, q.rot), INK);
  }
}


// B — DYNAMITE, the coyote's bundle left in the road (stand 17x25). Five tomato
// sticks in black tape; the fuse curls up and fizzes a starburst.
// FLAT and front-on (Peter, 15 Oct 2026: "they should be flat"): three sticks side by
// side at one height, no second row behind and no ends seen from above.
const STICKS = [
  { x: 5.0, top: 11.6 },
  { x: 8.3, top: 11.6 },
  { x: 11.6, top: 11.6 },
];
const STICK_W = 3.3;
function dynamite(c, w, h, t) {
  const f = frameOf(t, 6, 12), g = h - 0.3;
  const stick = (s) => rrect(s.x - STICK_W / 2, s.top, STICK_W, g - s.top, 0.9);
  const TAPES = [15.4, 21.0];
  const tape = (y) => rrect(3.0, y, 10.6, 1.7, 0.5);
  // The fuse: out of the middle stick's end, a loop, up to the spark.
  const FX = 10.4, FY = 4.6;
  const fuse = (p) => {
    p.moveTo(8.5, 11.8);
    p.bezierCurveTo(8.3, 8.6, 4.8, 8.8, 5.8, 6.4);
    p.bezierCurveTo(6.6, 4.6, 9.6, 6.6, FX, FY);
  };
  c.save();
  c.translate(SLIP_X, SLIP_Y);
  c.beginPath();
  fuse(c);
  c.strokeStyle = INK;
  c.lineWidth = 1.2;
  c.lineCap = 'round';
  c.stroke();
  c.restore();
  key(c, ...STICKS.map(stick), ...TAPES.map(tape));
  c.beginPath();
  fuse(c);
  c.strokeStyle = FUSE;
  c.lineWidth = 0.55;
  c.lineCap = 'round';
  c.stroke();
  for (const s of STICKS) {
    const shape = stick(s);
    plate(c, shape, s.back ? TOMATO_DK : TOMATO, (p) => {
      p.fillStyle = s.back ? '#7e1f18' : TOMATO_DK;
      p.fillRect(s.x - STICK_W / 2, 0, 1.0, h);
      if (!s.back) {
        p.fillStyle = TOMATO_LT;
        p.fillRect(s.x + STICK_W / 2 - 0.85, s.top + 1.2, 0.45, g - s.top - 2);
        grain(p, 0.14);
      }
      // The paper end, crimped: a flat band, seen side-on.
      p.fillStyle = '#f6c7a8';
      p.fillRect(s.x - STICK_W / 2, s.top, STICK_W, 0.9);
    });
    contour(c, shape, 0.28, 0.8);
  }
  for (const y of TAPES) {
    plate(c, tape(y), BLACK, (p) => {
      p.fillStyle = BLACK_LT;
      p.fillRect(3.0, y + 0.25, 10.6, 0.35);
    });
  }
  // The spark: a fizzing starburst at the fuse's end, embers flying off it.
  const R = [3.0, 3.7, 2.6, 3.4, 2.8, 3.9][f];
  fill(c, oval(FX, FY, R * 0.7, R * 0.7), MUSTARD_LT, 0.45);
  burst(c, FX, FY, R, f * 0.45, MUSTARD_LT, 0.5, 10);
  burst(c, FX, FY, R * 0.62, -f * 0.3 + 0.2, SPARK, 0.4, 8);
  fill(c, oval(FX, FY, 0.8, 0.8), '#ffffff');
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 2) % 6) / 6;
    const a = -0.6 + i * 1.1;
    fill(c, oval(FX + Math.cos(a) * (1.6 + k * 3.4), FY + Math.sin(a) * (1.6 + k * 3.4) - k * 0.8, 0.38, 0.38), i === 1 ? TOMATO_LT : MUSTARD_LT);
  }
}


// C — BARREL CACTUS with its pup (big 23x26). Ribs as the mesas' bands stood on
// end, red fishhook spines in starbursts down every rib, a mustard crown.
const RIBS = [-1, -0.92, -0.71, -0.38, 0, 0.38, 0.71, 0.92, 1];
// `glintAt` names the one spine cluster that catches the sun this frame.
function barrelBody(c, cx, cy, rx, ry, glintAt = -1, spines = true) {
  const xAt = (s, y) => cx + rx * s * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
  const band = (s0, s1) => (p) => {
    const N = 14;
    for (let i = 0; i <= N; i++) {
      const y = cy - ry + (2 * ry * i) / N;
      if (i === 0) p.moveTo(xAt(s0, y), y);
      else p.lineTo(xAt(s0, y), y);
    }
    for (let i = N; i >= 0; i--) {
      const y = cy - ry + (2 * ry * i) / N;
      p.lineTo(xAt(s1, y), y);
    }
    p.closePath();
  };
  plate(c, oval(cx, cy, rx, ry), CACTUS, (p) => {
    // The two left bands in shade, every other band a step darker: stripes.
    for (let k = 0; k < RIBS.length - 1; k++) {
      if (k < 2) fill(p, band(RIBS[k], RIBS[k + 1]), CACTUS_DK);
      else if (k % 2 === 1) fill(p, band(RIBS[k], RIBS[k + 1]), '#33824e');
    }
    fill(p, band(0.71, 0.84), CACTUS_LT);
    grain(p, 0.16);
  });
  for (let k = 1; k < RIBS.length - 1; k++) {
    const pts = [];
    for (let i = 1; i < 12; i++) {
      const y = cy - ry + (2 * ry * i) / 12;
      pts.push(xAt(RIBS[k], y), y);
    }
    rule(c, pts, 0.24, INK, 0.55);
  }
  if (!spines) return;
  // Spine clusters: a tomato starburst and a hooked central spine on each rib.
  let n = 0;
  for (let k = 1; k < RIBS.length - 1; k++) {
    for (let y = cy - ry + 2.6 + (k % 2) * 1.7; y < cy + ry - 1.8; y += 3.6) {
      const x = xAt(RIBS[k], y);
      burst(c, x, y, 1.1, k * 0.5, TOMATO, 0.28, 6);
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x - 0.9, y - 0.5, x - 0.7, y + 0.3);
      c.strokeStyle = TOMATO_DK;
      c.lineWidth = 0.32;
      c.stroke();
      if (n++ === glintAt) glint(c, x, y, 1.6);
    }
  }
}
function barrelCactus(c, w, h, t) {
  const f = frameOf(t, 11, 6), g = h - 0.3;
  const M = { x: 13.2, y: g - 9.4, rx: 7.8, ry: 9.4 };
  const P = { x: 4.6, y: g - 3.9, rx: 3.6, ry: 3.9 };
  // The crown: mustard petals in a ring on the top, tomato hearts.
  const PETALS = [-2.5, -1.95, -1.4, -0.85];
  const petal = (a, cx = M.x, cy = M.y - M.ry + 0.9) => oval(cx + Math.cos(a) * 1.7, cy + Math.sin(a) * 1.5, 0.85, 1.6, a + Math.PI / 2);
  key(c, oval(M.x, M.y, M.rx, M.ry), oval(P.x, P.y, P.rx, P.ry), ...PETALS.map((a) => petal(a)));
  barrelBody(c, P.x, P.y, P.rx, P.ry, -1, false);
  for (const [dx, dy] of [[-1.2, -1.6], [1.4, -0.6], [-0.4, 1.4], [1.8, 1.8]]) burst(c, P.x + dx, P.y + dy, 0.9, dx, TOMATO, 0.24, 6);
  barrelBody(c, M.x, M.y, M.rx, M.ry, (f * 7) % 23);
  for (const a of PETALS) {
    plate(c, petal(a), MUSTARD, (p) => fill(p, oval(M.x - 3, M.y - M.ry, 2.2, 3), MUSTARD_DK));
    contour(c, petal(a), 0.24, 0.7);
  }
  fill(c, oval(M.x, M.y - M.ry + 0.9, 1.3, 0.8), TOMATO);
  fill(c, oval(M.x + 0.4, M.y - M.ry + 0.7, 0.4, 0.3), MUSTARD_LT);
}


// F — SMUDGE POT, the roadworks flare (fire 17x29). A black bomb of kerosene on a
// foot ring, a wick tube, and a flat tomato-mustard flame springing from the wick.
// The flame's quantised ring: height, lean of the tip, and the two side licks.
const WICK_H = [1, 0.9, 1.04, 0.86, 0.97, 1.06, 0.9, 0.95];
const WICK_SWAY = [0.6, -0.5, 0.9, -0.9, 0.2, 1.0, -0.6, 0.3];
const LICK_L = [1.2, 2.0, 0.6, 1.6, 2.2, 0.8, 1.4, 1.9];
const LICK_R = [1.8, 0.8, 2.2, 1.2, 0.6, 2.0, 1.6, 1.0];
function wickFlame(c, cx, base, f) {
  const H = 11.6 * WICK_H[f], sway = WICK_SWAY[f];
  // `k` scales the teardrop about its root on the wick: 1 is the outer flame,
  // then the orange, mustard and cream hearts inside it.
  const drop = (k) => (p) => {
    const X = (dx) => cx + dx * k, Y = (dy) => base - dy * k;
    p.moveTo(X(-1.1), Y(0));
    p.bezierCurveTo(X(-4.8), Y(2.4), X(-3.4 + sway * 0.4), Y(7.6), X(sway), Y(H));
    p.bezierCurveTo(X(3.4 + sway * 0.4), Y(7.2), X(4.9), Y(2.4), X(1.1), Y(0));
    p.quadraticCurveTo(X(0), Y(-0.9), X(-1.1), Y(0));
    p.closePath();
  };
  const lick = (side, len) => (p) => {
    p.moveTo(cx + side * 2.6, base - 2.0);
    p.quadraticCurveTo(cx + side * 5.0, base - 4.0, cx + side * (4.4 + len * 0.3), base - 5.8 - len);
    p.quadraticCurveTo(cx + side * 3.8, base - 4.4, cx + side * 1.8, base - 4.4);
    p.closePath();
  };
  const outer = [drop(1), lick(-1, LICK_L[f]), lick(1, LICK_R[f])];
  key(c, ...outer);
  for (const path of outer) fill(c, path, FLAME[0]);
  fill(c, drop(0.7), FLAME[1]);
  fill(c, drop(0.42), FLAME[2]);
  fill(c, drop(0.2), FLAME[3]);
}
function smudgePot(c, w, h, t) {
  const f = frameOf(t, 8, 14), g = h - 0.3;
  const BCY = g - 6.9;
  const foot = rrect(3.6, g - 1.7, 9.8, 1.7, 0.6);
  const bomb = oval(8.5, BCY, 6.1, 5.4);
  const neck = rect(6.9, BCY - 7.0, 3.2, 2.2);
  const tube = rect(7.8, BCY - 8.8, 1.4, 2.0);
  // The flame is laid first, so the tube swallows its root.
  wickFlame(c, 8.5, BCY - 8.6, f);
  key(c, foot, bomb, neck, tube);
  plate(c, tube, CHROME_DK);
  plate(c, neck, BLACK, (p) => {
    p.fillStyle = BLACK_LT;
    p.fillRect(9.4, 0, 0.5, h);
  });
  plate(c, foot, BLACK);
  plate(c, bomb, BLACK, (p) => {
    // The sun's side lit as a flat crescent, then a hard sliver of steel blue.
    p.fillStyle = BLACK_LT;
    p.fillRect(0, 0, w, h);
    fill(p, oval(7.6, BCY + 0.2, 6.0, 5.6), BLACK);
    fill(p, oval(12.2, BCY - 1.6, 0.5, 2.0, 0.35), '#8f96aa');
    grain(p, 0.08, 'dryL');
  });
  rule(c, [3.2, BCY + 0.4, 13.8, BCY + 0.4], 0.3, BLACK_DK, 0.9, [0, 0]);
  // The filler cap on the shoulder.
  fill(c, oval(4.9, BCY - 3.3, 1.05, 0.75, -0.5), MUSTARD);
  contour(c, oval(4.9, BCY - 3.3, 1.05, 0.75, -0.5), 0.26, 0.9);
}


// G — SAWHORSE BARRICADE with a flasher (hurdle 21x18). Cream A-frames at each
// end, the tomato-striped rail across, an amber lamp blinking on the left post.
function sawhorse(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 0.2;
  const APEX_Y = 8.0;
  const leg = (x0, x1) => poly([x0 - 0.6, APEX_Y, x0 + 0.6, APEX_Y, x1 + 0.6, g, x1 - 0.6, g]);
  const LEGS = [leg(4.6, 2.6), leg(4.6, 6.6), leg(16.4, 14.4), leg(16.4, 18.4)];
  const braces = [rect(3.0, 13.4, 3.2, 0.8), rect(14.8, 13.4, 3.2, 0.8)];
  const rail = rrect(0.6, 8.6, 19.8, 3.6, 0.4);
  const LX = 4.6, LY = 4.3;
  const stem = rect(LX - 0.4, LY + 1.6, 0.8, 2.6);
  const lamp = oval(LX, LY, 2.05, 2.05);
  keyFine(c, ...LEGS, ...braces, stem);
  key(c, rail, lamp);
  for (const L of [...LEGS, ...braces]) {
    plate(c, L, CREAM, (p) => {
      p.fillStyle = CREAM_DK;
      p.fillRect(0, 0, w, 13.4);
    });
  }
  plate(c, rail, CREAM, (p) => {
    // The stripes, flat bands at 45 degrees, raking down toward the road.
    p.beginPath();
    for (let x = -6; x < 26; x += 4.2) {
      p.moveTo(x, 8.6);
      p.lineTo(x + 2.1, 8.6);
      p.lineTo(x + 2.1 + 3.6, 12.2);
      p.lineTo(x + 3.6, 12.2);
      p.closePath();
    }
    p.fillStyle = TOMATO;
    p.fill();
    p.fillStyle = 'rgba(80,20,20,0.22)';
    p.fillRect(0, 11.2, w, 1.2);
    grain(p, 0.14);
  });
  plate(c, stem, BLACK);
  // The flasher: amber lens on, with the backdrop's lamp burst; dim when off.
  const on = f < 3;
  plate(c, lamp, MUSTARD_DK, (p) => fill(p, oval(LX + 0.35, LY - 0.2, 1.45, 1.45), on ? MUSTARD_LT : '#c98f1e'));
  if (on) {
    fill(c, oval(LX, LY, 3.3, 3.3), MUSTARD_LT, [0.32, 0.4, 0.28][f]);
    burst(c, LX, LY, [4.0, 4.4, 3.6][f], 0.3, '#fff2b0', 0.42, 12);
    fill(c, oval(LX + 0.3, LY - 0.4, 0.55, 0.55), '#ffffff');
  }
}

// Replaces the songbird (Peter, 15 Oct 2026: "replace the bird with the flying saucer in speed").
// I — FLYING SAUCER at head height (high 22x13). Chrome hull with the sky in it, a
// glass dome, a tomato rim whose lights chase, a teal belly; it wobbles as it comes.
function saucer(c, w, h, t) {
  const f = frameOf(t, 8, 12);
  const tilt = Math.sin((f / 8) * TAU) * 0.07;
  c.save();
  c.translate(11, 7.6);
  c.rotate(tilt);
  const dome = (p) => {
    p.moveTo(-4.4, -1.1);
    p.ellipse(0, -1.1, 4.4, 4.2, 0, Math.PI, TAU);
    p.closePath();
  };
  const hull = poly([-10.2, 0.2, -6.8, -1.9, 0, -2.9, 6.8, -1.9, 10.2, 0.2]);
  const band = rrect(-10.6, -0.3, 21.2, 1.9, 0.95);
  const belly = (p) => {
    p.moveTo(-9.0, 1.4);
    p.quadraticCurveTo(0, 5.6, 9.0, 1.4);
    p.closePath();
  };
  const turret = oval(0, 4.2, 2.1, 0.9);
  const mast = rect(-0.25, -6.7, 0.5, 1.6);
  const ball = oval(0, -6.9, 0.65, 0.65);
  key(c, dome, hull, band, belly, turret, mast, ball);
  plate(c, mast, BLACK);
  plate(c, ball, TOMATO);
  plate(c, dome, GLASS, (p) => {
    p.fillStyle = GLASS_DK;
    p.fillRect(-5, -6, 3.0, 6);
    fill(p, oval(1.9, -3.4, 0.7, 1.4, 0.5), '#ffffff');
  });
  plate(c, belly, TEAL_DK, (p) => fill(p, oval(4, 1.4, 5, 1.6), TEAL));
  plate(c, turret, MUSTARD, (p) => {
    p.fillStyle = MUSTARD_DK;
    p.fillRect(-3, 3, 1.6, 3);
  });
  plate(c, hull, CHROME, (p) => {
    fill(p, poly([-11, -0.8, 11, -0.8, 11, -1.7, -11, -1.7]), REFLECT);
    p.fillStyle = CHROME_DK;
    p.fillRect(-11, -4, 4.4, 5);
    grain(p, 0.12);
  });
  plate(c, band, TOMATO, (p) => {
    p.fillStyle = TOMATO_DK;
    p.fillRect(-11, 0.9, 22, 1);
  });
  contour(c, dome, 0.28, 0.8);
  // The rim lights chase round: two lit at a time, travelling toward the hero.
  for (let i = 0; i < 7; i++) {
    const x = -7.8 + i * 2.6;
    const lit = (i + f) % 4 === 0;
    fill(c, oval(x, 0.65, 0.62, 0.62), lit ? MUSTARD_LT : TOMATO_DK);
    if (lit) fill(c, oval(x, 0.65, 1.3, 1.1), MUSTARD_LT, 0.35);
  }
  c.restore();
}

// The candidate sheet (src/dev) paints the rest of its line-up with these.
export {
  saucer, burst, TAU, INK, TOMATO, TOMATO_DK, TOMATO_LT, MUSTARD, MUSTARD_DK, MUSTARD_LT, CREAM, CREAM_DK, SPARK, CHROME, CHROME_DK, CHROME_LT, REFLECT, TEAL, TEAL_DK, GLASS, GLASS_DK, BLACK, BLACK_LT, BLACK_DK, CACTUS, CACTUS_DK, CACTUS_LT, FRUIT, FRUIT_DK, FRUIT_LT, FLAME, FUSE, SLIP_X, SLIP_Y, GROW, LWI, REG_IN, oval, rect, rrect, poly, keyAt, key, keyFine, plate, fill, grain, rule, contour, rim, glint, PEAR_PADS, AREOLES, pricklyPear, STICKS, STICK_W, dynamite, RIBS, barrelBody, barrelCactus, WICK_H, WICK_SWAY, LICK_L, LICK_R, wickFlame, smudgePot, sawhorse,
};

// ------------------------------------------------------------------ registry
// type id -> box (the slot's), PROP_TALL, the painter's own frame ring.
export const SPEED_PROP_SPECS = {
  pricklyPear: { box: [13, 12], tall: 1.55, frames: 9, fps: 6, paint: pricklyPear },
  dynamite: { box: [13, 12], tall: 1.55, frames: 6, fps: 12, paint: dynamite },
  barrelCactus: { box: [17, 14], tall: 1.4, frames: 11, fps: 6, paint: barrelCactus },
  smudgePot: { box: [13, 13], tall: 1.7, frames: 8, fps: 14, paint: smudgePot },
  sawhorse: { box: [16, 9], tall: 1.5, frames: 8, fps: 8, paint: sawhorse },
  saucer: { box: [12, 7], visual: 1.35, frames: 8, fps: 12, paint: saucer },
};
