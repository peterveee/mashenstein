// Gallery-only SPEED ZONE OBSTACLE concepts — ten things that stand, roll, burn,
// lie or fly in the lane of the mid-century road, drawn in the backdrop's own hand.
//
// THE COMPLAINT (12 Oct 2026). Peter, after the office sheet: "can you examine
// obstacles in other cabinets … and recommend new items or replacements that fit
// in more with their style". Speed Zone has shipped in mid-century modern since
// 28 Sep (stylePacks/speedMcm.js): the Road Runner desert as the 1950s layout men
// painted it — flat colour plates, banded mesas, capsule saguaros, starburst
// agaves, boomerang vultures, atomic-age signs, a test range on the mesas, and a
// loose ink line printed out of register over all of it. What stands in front of
// it was drawn for every cabinet at once, in the props hand (soft gloss, hairline
// contour, a shared hazard rim):
//
//   * the red cartoon CACTUS and its big brother are saguaros — the one plant the
//     backdrop already stands on every near dune, in sage capsules — redrawn red
//     and spiny in another hand. The thing behind the lane is in front of it too;
//   * the wooden CRATE and wooden BARREL are warehouse and saloon stock, the oil-
//     drum FIRE BARREL is a city alley, the floor SAW and the spike PLATE are a
//     factory floor, the RAZOR HURDLE is a prison fence. None of them is a road;
//   * the SONGBIRD and the purple quad-rotor DRONE are this century's sky, on a
//     test range whose sky is jets, rockets and a radio telescope listening for
//     saucers.
//
//   What fits: the TRAFFIC CONE (the most-dealt hazard here, and road furniture),
//   the CAMPFIRE (the backdrop's own smoke rises from one behind the dunes), and
//   the rattlesnake and bobcat, which are animals and have their own bake-offs.
//
// THE BRIEF. Ten objects of the 1950s desert road — roadworks, a lost wheel, the
// coyote's dynamite, the cactus that is NOT a saguaro, the test range's visitors
// — each assigned to a slot the lane already deals, so a winner is a swap rather
// than a new mechanic. Every slot keeps its box and its answer; only the drawing
// is on trial. Two candidates share the cactus slot (A, B) so the sheet can choose
// between a plant and a gag for the most-dealt standing jump.
//
// NOT ON THIS SHEET, because the backdrop already owns them (Peter's office rule:
// an obstacle must not be something the scenery shows): saguaros, agave, yucca,
// rocks, tumbleweeds, vultures, road signs of every kind, telegraph poles, the
// police cruiser and its camera, pumpjacks, the water tower, the wind pump, the
// rocket and the jet.
//
// THE HAND. speedMcmCoyote.js's print, at lane scale: every silhouette part is
// first printed in ink a hair larger than itself and slipped up and right (the
// KEY PLATE), then the flat colour plates are laid over it — so the outline is
// the misregistered key that only shows along the figure's own edge, heavier on
// the top and right, and every hazard is self-outlined against both the dunes
// and the road. Flat fills; one hard-edged shade band on the LEFT, because the
// backdrop's sun is on the right (the saguaros split the same way); one lit
// sliver on the right; a whisper of the backdrop's own dry-brush bake in the
// big fields; starbursts wherever something sparks, glints or blinks. Interior
// lines are the backdrop's loose slipped rule. Colours are the period's hazard
// set — tomato, mustard, cream, chrome, teal, black — saturated where the
// afternoon is dusty, so one skin holds from the turquoise midday of speed-1
// through the golden hour to the violet dusk at speed-3's finish (hazards are
// not tinted by laneTint; the road and the hero are).
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units — box
// x 4/3, height x PROP_TALL (x PROP_VISUAL_SCALE for the fliers) — with the
// ground at y = h; obstacle-bakeoff-kit.js's slotEnvelope() derives it, and art
// outside it does not exist in the game. Bedded plates (H) sink 2u, so nothing
// that must show sits below h - 2. `t` is quantised to each candidate's own frame
// ring (frameOf), as the shipped prop ring would be.
//
// PORTING. Copy a painter into sprites/props.js under ctx.scale(w / W, h / H)
// (props.js painters receive the box-x-tall size and the run stretches by 4/3),
// add it to SELF_OUTLINED_PROPS (it carries its own key plate) and PROP_DETAIL_SCALE
// 2, give it PROP_FRAMES / PROP_FPS from its ring, DEBRIS colours from its plates,
// and deal it from Speed's pattern bank in place of the prop it replaces (the
// shared BASE_PATTERNS cactus and crate become a Speed-only skin, the way Frost
// swaps cactus for snowman). The dry-brush grain comes from the pack's baked
// textures (MCM_KIT.pats), so a port keeps the import. D is the one roller: the
// barrel's roll branch turns the whole drawing, which a wheel is the one object
// it is right for — a port drops the painter's own spin.
//
// Nothing here is registered in any gameplay registry.
import { frameOf } from './obstacle-bakeoff-kit.js';
import { MCM_KIT, MCM_PALETTES, arcPalette, actU } from '../engine/stylePacks/speedMcm.js';

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
const STICKS = [
  { x: 6.9, top: 9.8, back: true },
  { x: 10.1, top: 10.4, back: true },
  { x: 5.3, top: 12.5 },
  { x: 8.5, top: 11.5 },
  { x: 11.7, top: 12.8 },
];
const STICK_W = 3.3;
function dynamite(c, w, h, t) {
  const f = frameOf(t, 6, 12), g = h - 0.3;
  const stick = (s) => rrect(s.x - STICK_W / 2, s.top, STICK_W, g - s.top, 0.9);
  const TAPES = [15.4, 21.0];
  const tape = (y) => rrect(3.2, y, 10.6, 1.7, 0.5);
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
      // The paper end, crimped.
      fill(p, oval(s.x, s.top + 0.6, STICK_W / 2 - 0.25, 0.75), s.back ? '#d9a48a' : '#f6c7a8');
    });
    contour(c, shape, 0.28, 0.8);
  }
  for (const y of TAPES) {
    plate(c, tape(y), BLACK, (p) => {
      p.fillStyle = BLACK_LT;
      p.fillRect(3.2, y + 0.25, 10.6, 0.35);
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

// D — WHITEWALL TYRE, off something fast and rolling at you (barrel 17x17). Black
// rubber, a cream whitewall, a chrome cap with the sky in it and a tomato boss.
function whitewall(c, w, h, t) {
  const f = frameOf(t, 8, 16), g = h - 0.2;
  const R = 8.0, cx = 8.5, cy = g - R;
  // Rolling LEFT, so it turns anticlockwise. A quarter turn per ring: the 16
  // treads, 8 slots and 8-ray star all land back on themselves.
  const a = -(f / 8) * (TAU / 4);
  key(c, oval(cx, cy, R, R));
  plate(c, oval(cx, cy, R, R), BLACK, (p) => {
    // The lit sidewall: a crescent on the sun's side.
    p.fillStyle = BLACK_LT;
    p.fillRect(0, 0, w, h);
    fill(p, oval(cx - 0.9, cy, R - 0.2, R - 0.2), BLACK);
    // Treads: notches in the shoulder, turning.
    for (let k = 0; k < 16; k++) {
      const q = a + (k / 16) * TAU;
      p.save();
      p.translate(cx + Math.cos(q) * (R - 0.45), cy + Math.sin(q) * (R - 0.45));
      p.rotate(q);
      p.fillStyle = BLACK_DK;
      p.fillRect(-0.55, -0.45, 1.1, 0.9);
      p.restore();
    }
  });
  // The whitewall, its shade crescent on the left.
  plate(c, oval(cx, cy, 5.8, 5.8), CREAM_DK, (p) => fill(p, oval(cx + 0.7, cy, 5.6, 5.6), CREAM));
  // The cap: chrome, shade on the left, the sky's flat turquoise band across it.
  plate(c, oval(cx, cy, 4.3, 4.3), CHROME, (p) => {
    fill(p, poly([cx - 6, cy + 0.6, cx + 6, cy - 2.8, cx + 6, cy - 1.2, cx - 6, cy + 2.2]), REFLECT);
    p.fillStyle = CHROME_DK;
    p.fillRect(cx - 5, cy - 5, 2.0, 10);
  });
  contour(c, oval(cx, cy, 4.3, 4.3), 0.3, 0.9);
  for (let k = 0; k < 8; k++) {
    const q = a + (k / 8) * TAU;
    c.save();
    c.translate(cx, cy);
    c.rotate(q);
    fill(c, rrect(2.2, -0.42, 1.7, 0.84, 0.4), BLACK_LT);
    c.restore();
  }
  fill(c, oval(cx, cy, 1.75, 1.75), TOMATO);
  burst(c, cx, cy, 1.55, a, CREAM, 0.28, 8);
  fill(c, oval(cx, cy, 0.4, 0.4), CREAM);
  if (f === 2 || f === 3) glint(c, cx + 2.6, cy - 2.6, f === 2 ? 1.6 : 2.2);
}

// E — JERRY CANS, two high (stack 16x15). Tomato steel, the pressed X, three
// handles and a mustard cap; the petrol shimmers off the spout.
function jerryCan(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 0.2;
  const BX = 1.2, BY = 3.6, BW = 12.2, BH = g - BY;
  const body = rrect(BX, BY, BW, BH, 1.1);
  const HANDLE_BAR = rect(2.4, 0.9, 7.4, 0.95);
  const posts = [2.4, 4.6, 6.8, 9.0].map((x) => rect(x, 0.9, 0.8, 2.9));
  const cap = rrect(10.6, 0.7, 2.7, 3.2, 0.55);
  key(c, body, HANDLE_BAR, ...posts, cap);
  for (const post of posts) plate(c, post, TOMATO_DK);
  plate(c, HANDLE_BAR, TOMATO);
  plate(c, cap, MUSTARD, (p) => {
    p.fillStyle = MUSTARD_DK;
    p.fillRect(10.6, 0, 0.9, 5);
    p.fillStyle = MUSTARD_LT;
    p.fillRect(12.4, 1.2, 0.4, 2.2);
  });
  rule(c, [11.0, 2.4, 9.8, 3.4], 0.45, INK, 0.9, [0, 0]);
  plate(c, body, TOMATO, (p) => {
    p.fillStyle = TOMATO_DK;
    p.fillRect(BX, BY, 1.7, BH);
    p.fillStyle = TOMATO_LT;
    p.fillRect(BX + BW - 1.15, BY + 1.0, 0.45, BH - 2.0);
    grain(p, 0.16);
  });
  // The pressed X and the frame round it: a shade line with a lit one beside it.
  const X0 = BX + 1.9, X1 = BX + BW - 1.9, Y0 = BY + 1.6, Y1 = g - 1.6;
  rule(c, [X0, Y0, X1, Y1], 0.85, TOMATO_DK, 1, [0, 0]);
  rule(c, [X1, Y0, X0, Y1], 0.85, TOMATO_DK, 1, [0, 0]);
  rule(c, [X0 + 0.35, Y0 - 0.3, X1 + 0.35, Y1 - 0.3], 0.3, TOMATO_LT, 1, [0, 0]);
  rule(c, [X1 + 0.35, Y0 - 0.3, X0 + 0.35, Y1 - 0.3], 0.3, TOMATO_LT, 1, [0, 0]);
  c.beginPath();
  c.roundRect(BX + 0.9, BY + 0.9, BW - 1.8, BH - 1.8, 0.6);
  c.strokeStyle = TOMATO_DK;
  c.lineWidth = 0.35;
  c.stroke();
  // Fumes: two cartoon wiggles rising off the cap, chasing.
  for (let i = 0; i < 2; i++) {
    const ph = ((f + i * 4) % 8) / 8;
    const x0 = 13.9 + i * 1.2;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const y = 3.4 - k * 0.55 - ph * 0.6;
      pts.push(x0 + Math.sin(k * 1.4 + ph * TAU) * 0.45, y);
    }
    rule(c, pts, 0.28, INK, 0.55 * (1 - ph * 0.6), [0, 0]);
  }
  if (f === 5) glint(c, 12.6, 1.4, 1.5);
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

// H — SPIKE STRIP across the road (floor 20x16, bedded). A tomato-and-cream
// chevron bar laid on the kerb line, a row of raked steel spikes, a glint
// running along the points.
function spikeStrip(c, w, h, t) {
  // Bedded: the run sinks the art 2u and the road cuts it there.
  const f = frameOf(t, 10, 9), g = h - 2.0;
  const BAR_T = g - 2.8;
  const bar = rrect(0.4, BAR_T, 19.2, 3.2, 1.0);
  // Six stubby steel teeth, raked toward the hero, split light and shade like the
  // mesas' faces.
  const SPIKES = [7.0, 7.8, 7.2, 7.9, 7.1, 7.6].map((L, i) => {
    const x = 2.4 + i * 3.04;
    return { x, tip: [x - 0.7, BAR_T - L], path: poly([x - 1.25, BAR_T + 0.2, x + 1.25, BAR_T + 0.2, x - 0.7, BAR_T - L]) };
  });
  key(c, bar);
  keyFine(c, ...SPIKES.map((s) => s.path));
  for (const s of SPIKES) {
    plate(c, s.path, CHROME, (p) => {
      fill(p, poly([s.x - 1.4, BAR_T + 0.4, s.x - 0.1, BAR_T + 0.4, s.tip[0], s.tip[1]]), CHROME_DK);
      fill(p, poly([s.x + 0.45, BAR_T, s.x + 0.85, BAR_T, s.tip[0] + 0.1, s.tip[1] + 1.2]), CHROME_LT);
    });
  }
  plate(c, bar, CREAM, (p) => {
    p.beginPath();
    for (let x = -2; x < 22; x += 3.0) {
      p.moveTo(x, BAR_T);
      p.lineTo(x + 1.5, BAR_T);
      p.lineTo(x + 2.6, g + 0.4);
      p.lineTo(x + 1.1, g + 0.4);
      p.closePath();
    }
    p.fillStyle = TOMATO;
    p.fill();
    p.fillStyle = 'rgba(80,20,20,0.25)';
    p.fillRect(0, BAR_T + 2.0, w, 2);
  });
  // The collars the spikes sit in.
  for (const s of SPIKES) fill(c, oval(s.x, BAR_T + 0.1, 1.45, 0.45), BLACK);
  if (f < SPIKES.length) {
    const [tx, ty] = SPIKES[f].tip;
    glint(c, tx, ty + 0.4, 1.8);
  }
}

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

// J — HUBCAP, spun off and skimming at slide height (low 22x13). Chrome face-on,
// eight slots and a tomato boss turning, wobbling on its axis, speed lines behind.
function hubcap(c, w, h, t) {
  const f = frameOf(t, 8, 16);
  const a = -(f / 8) * (TAU / 4);
  const sx = 0.84 + 0.16 * Math.cos((f / 8) * TAU);
  const cx = 9.6, cy = 6.5, R = 6.1;
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 3) % 8) / 8;
    const y = 3.6 + i * 3.0;
    rule(c, [15.6 + k * 2.4, y, 18.6 + k * 2.4, y], 0.36, INK, 0.6, [0, 0]);
  }
  c.save();
  c.translate(cx, cy);
  c.scale(sx, 1);
  const face = oval(0, 0, R, R);
  key(c, face);
  plate(c, face, CHROME, (p) => {
    fill(p, poly([-7, 2.0, 7, -2.6, 7, -0.6, -7, 4.0]), REFLECT);
    p.fillStyle = CHROME_DK;
    p.fillRect(-7, -7, 2.7, 14);
    grain(p, 0.1);
  });
  // The rolled lip, then the slots and the boss, turning.
  c.beginPath();
  c.arc(0, 0, R - 0.9, 0, TAU);
  c.strokeStyle = CHROME_DK;
  c.lineWidth = 0.4;
  c.stroke();
  for (let k = 0; k < 8; k++) {
    c.save();
    c.rotate(a + (k / 8) * TAU);
    fill(c, rrect(2.5, -0.55, 2.3, 1.1, 0.55), BLACK);
    c.restore();
  }
  fill(c, oval(0, 0, 2.3, 2.3), TOMATO);
  burst(c, 0, 0, 2.0, a, CREAM, 0.32, 8);
  fill(c, oval(0, 0, 0.5, 0.5), CREAM);
  c.restore();
  if (f === 1 || f === 2) glint(c, cx + 2.8 * sx, cy - 3.2, f === 1 ? 1.7 : 2.4);
}

// ============================================================== the sheet
// The detail panels are the near dunes behind the lane at three points of the
// act's one afternoon (arcPalette), the kerb's yellow line, and the road.
const swatchAt = (stage, p) => ({ sky: arcPalette(actU(stage, p)).near.fill, ground: '#f6d33c', under: '#c4865b' });

export const BAKEOFF = {
  cabinet: 'speed',
  title: 'SPEED ZONE — obstacles for the mid-century road (bake-off)',
  note: 'Most of what Speed deals was drawn for every cabinet in the props hand: a red saguaro in front of the backdrop’s own sage ones, '
    + 'a warehouse crate and saloon barrel, an alley’s oil drum, a factory’s floor saw and spike plate, a prison-fence hurdle, a songbird and a '
    + 'quad-rotor drone over a 1950s test range. The cone and the campfire fit and stay. Ten replacements from the desert road of the period — '
    + 'a prickly pear or the coyote’s dynamite for the cactus, a barrel cactus, a whitewall tyre, jerry cans, a smudge pot, a sawhorse '
    + 'barricade, a spike strip, a flying saucer and a hubcap — printed as the backdrop is, flat plates over a slipped ink key. Pick letters.',
  // Three strips of the real frame, one per palette the act's afternoon runs through.
  strips: [
    { label: 'SPEED ZONE 1 · MIDDAY', stageIndex: 1, camX: 600, bc: { progress: 0.1 } },
    { label: 'SPEED ZONE 2 · GOLDEN HOUR', stageIndex: 2, camX: 1500, bc: { progress: 0.92 } },
    { label: 'SPEED ZONE 3 · DUSK', stageIndex: 3, camX: 2300, bc: { progress: 0.97 } },
  ],
  // The detail row's panels: the dunes behind the lane, the kerb line, the road.
  swatches: [swatchAt(1, 0.1), swatchAt(2, 0.92), swatchAt(3, 0.97)],
  // What the cabinet deals today, through the real run painter: [type, x].
  control: [
    ['trafficCone', 4], ['cactus', 22], ['crate', 80], ['barrel', 98], ['fireBarrel', 117], ['cactusBig', 136],
    ['campfire', 156], ['boomBarrier', 176], ['popSpikes', 199], ['floorSaw', 220], ['drone', 86], ['buzzbird', 190],
  ],
  candidates: [
    { letter: 'A', id: 'pricklyPear', name: 'PRICKLY PEAR', slot: 'stand', paint: pricklyPear,
      note: 'The desert’s other cactus — the one the backdrop does not already stand on every dune. Green paddles split light and shade like the saguaros behind, cream areoles that catch the sun one at a time, tomato-magenta fruit along the top. Replaces the red cactus.' },
    { letter: 'B', id: 'dynamite', name: 'DYNAMITE', slot: 'stand', paint: dynamite,
      note: 'The coyote’s bundle, left in the road: five tomato sticks in black tape, the fuse looping up to a fizzing starburst throwing embers. The same jump as the cactus; a boot snuffs it, it never goes off. Generic sticks, no brand on them.' },
    { letter: 'C', id: 'barrelCactus', name: 'BARREL CACTUS', slot: 'big', paint: barrelCactus,
      note: 'A fishhook barrel and its pup: the ribs are the mesas’ bands stood on end, every rib studded with red hooked spines in starbursts, a mustard crown on top. Red where it hurts. Replaces the big red cactus.' },
    { letter: 'D', id: 'whitewall', name: 'WHITEWALL TYRE', slot: 'barrel', paint: whitewall,
      note: 'A wheel off something fast, rolling at you: black rubber with treads, a cream whitewall, chrome cap with the sky in it and a tomato boss. The barrel’s roll branch spins the whole drawing — the one object that should spin. Replaces the wooden barrel.' },
    { letter: 'E', id: 'jerryCans', name: 'JERRY CANS', slot: 'stack', paint: jerryCan,
      note: 'Tomato steel cans with the pressed X, three handles and a mustard cap, petrol fumes wiggling off the spout; single and stacked two high. Replaces the wooden crate.' },
    { letter: 'F', id: 'smudgePot', name: 'SMUDGE POT', slot: 'fire', paint: smudgePot,
      note: 'The roadworks flare of the period: a black kerosene bomb on its foot ring, wick tube, a flat tomato-and-mustard flame licking up out of it. The warm one, from a road rather than an alley. Replaces the oil-drum fire barrel.' },
    { letter: 'G', id: 'sawhorse', name: 'SAWHORSE BARRICADE', slot: 'hurdle', tall: 1.5, paint: sawhorse,
      note: 'Two cream A-frames and a tomato-striped rail, an amber flasher blinking a starburst on the left post. Roadworks hurdle in place of the razor fence. Proposes PROP_TALL 1.5 for the lamp; the box is still the 16x9 rail.' },
    { letter: 'H', id: 'spikeStrip', name: 'SPIKE STRIP', slot: 'floor', paint: spikeStrip,
      note: 'The speed trap’s answer to the cabinet: a tomato-and-cream chevron bar across the kerb, seven raked steel spikes, a glint running along the points. Always armed (a port drops popSpikes’ lurk). Replaces the spike plate and the floor saw both.' },
    { letter: 'I', id: 'saucer', name: 'FLYING SAUCER', slot: 'high', paint: saucer,
      note: 'Something the radio telescope heard: a chrome saucer with a glass dome, a tomato rim whose lights chase, wobbling at head height. Replaces the songbird; still punishes the jump.' },
    { letter: 'J', id: 'hubcap', name: 'HUBCAP', slot: 'low', paint: hubcap,
      note: 'Spun off the tyre in D and skimming at slide height like a thrown blade: chrome face, eight slots and a tomato boss turning, wobbling on its axis, speed lines behind. Slide under. Replaces the rotor drone.' },
  ],
};

export { frameOf };
