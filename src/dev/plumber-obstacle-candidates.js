// Gallery-only FIELD SERVICE OBSTACLE concepts — ten things that stand, roll,
// hang or lie in the lane of the green hills, drawn in the countryside hand.
//
// THE COMPLAINT (12 Oct 2026). Peter, after the office sheet: "can you examine
// obstacles in other cabinets (except cardboard) and recommend new items or
// replacements that fit in more with their style". FIELD SERVICE runs past a red
// barn and silo, a windmill, sheep, cottages and a patchwork of fields, all in
// cut paper (stylePacks/plumberLandmarks.js, plumberHouses.js, plumberBushes.js).
// What it deals in front of that:
//
//   * FITS — the thistle (it won src/dev/countryside-hazard-candidates.js), the
//     rake and the goose (the 24 Sep ideas picks), the !-crate (the cabinet's
//     mechanic), the campfire. These stay.
//   * WRONG WORLD — half the cactus patterns are still the desert cactus
//     (PLUMBER_PATTERNS swaps every other one), and the big one with them; the
//     fire barrel is an oil drum; the razor hurdle is grey steel and teeth;
//     the spike plate and the floor saw are factory plant with yellow-and-black
//     lips inlaid in the turf; the drone is a purple rotor drone in a game set
//     in the late ’80s.
//   * WRONG HAND — the crate and the rolling barrel are the generic platformer
//     box and barrel, and the songbird is a soft orange blob with no contour
//     among props that all carry one.
//
// THE BRIEF. One countryside answer per misfit, each in a slot the lane already
// deals, so a winner is a swap rather than a new mechanic: the cactus slot is
// still a 13x12 jump, the crate slot still stacks, the drone slot is still a
// slide. Peter's own words for the place (24 Sep, rejecting the first, "super
// Mario ish" plumber round): sheep, barns, hay bales, geese — theme it by the
// hills the hero is running through, not by the cabinet's name. So no pipes,
// valves or plumbing gags here (Peter took the pipe out of this cabinet on 30
// Sep; the valve manifold lost the hazard round). Nothing on this sheet appears
// in the backdrop, which already owns a milk churn, a water butt, a garden gate,
// timber and picket fences and a washing line (those are out); its hay is only
// ever a heap at the barn door, and the wheat-field scarecrow and the kites of
// the 24 Sep ideas round were never shipped. Animals have their own bake-offs;
// the bees are here as a hazard (a hive, a swarm), not as a cast member.
//
// THE HAND. The lane's own, as the shipped thistle and rake draw it: one warm
// dark ink (#2a1a16, the countryside sheet's) at one weight for outlines, flat
// fills, one flat lit sliver and one flat shade band per body, no gradients.
// Hazards are SATURATED where the paper backdrop is muted — barn red taken up a
// stop, honey, denim, galvanised steel — because the lane runs in front of the
// near hills (#48a050), under a pale sky (#a8e0f8) and on turf (#3a9c48), and
// a hazard has to stand off all three. NOT GREEN, for the reason the thistle's
// note gives: a green body vanishes into the ground it spawns on. Self-outlined,
// so a port joins SELF_OUTLINED_PROPS and skips the shared hazard rim.
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units (box
// x 4/3 x PROP_TALL x PROP_VISUAL_SCALE, ground at y = h; see slotEnvelope in
// obstacle-bakeoff-kit.js). Porting means copying a body into sprites/props.js
// under ctx.scale(w / W, h / H), adding OBSTACLES / DEBRIS / PROP_FRAMES and the
// guide card, and swapping it into PLUMBER_PATTERNS beside the thistle. The two
// floor plates are drawn so everything that must show stands above h - 3.5, the
// run's real road line for a bedded prop (BED_SINK plus drawAtGround's seat); a
// port drops their inlaid hazard lip (drawFloorLip) and the spike plate's
// `lurks` — a harrow lies in plain view, it does not spring. `t` is quantised to
// each candidate's own frame ring, so nothing flatters itself with 60fps motion.
//
// Nothing here is registered in any gameplay registry.
import { frameOf } from './obstacle-bakeoff-kit.js';

import {
  TAU, INK, LW, LWI, LWF, RED, RED_DK, RED_LT, STRAW, STRAW_DK, STRAW_LT, STRAW_INK, HONEY, HONEY_DK, CREAM, CREAM_DK, TIMBER, TIMBER_DK, TIMBER_LT, STEEL, STEEL_DK, STEEL_LT, DENIM, DENIM_DK, DENIM_LT, SACK, SACK_DK, FELT, FELT_DK, CHAR, CHAR_DK, SOIL, SKYBLUE, ORANGE, LEMON, SMOKE, SMOKE_LT, LEAF_RUST, WHITE, pen, fs, box, poly, line, lines, circ, ell, rrPath, rbox, body, rect, shape, bee, flames, puff, beehive, scarecrow, hayBale,
} from '../sprites/plumberProps.js';

// D — CART WHEEL, come off the hay wagon and bowling down the hill (barrel 17x17)
// A cheese wheel was tried here first and lost on sight: a yellow disc with a
// slice out of it, turning, is the arcade's most famous mouth — in the cabinet
// that opens inside an arcade machine — and without the slice it is a coin.
function cartWheel(c, w, h, t) {
  const f = frameOf(t, 8, 10);
  const cx = 8.5, R = 7.9, cy = h - 0.2 - R;
  // Rolling left: anticlockwise on screen, a full turn a ring. Ten spokes at a
  // full turn alias to a ninth of a spoke forward each frame, never backward.
  const a = -(f / 8) * TAU;
  const SPOKES = 10, HUB = 2.2, RIM_IN = R - 2.4;
  // Dust kicked up behind it.
  for (let i = 0; i < 2; i++) {
    const k = ((f + i * 4) % 8) / 8;
    puff(c, cx + R - 1.8 + k * 2.0, h - 1.2 - k * 1.6, 0.6 + k * 0.5, SMOKE_LT);
  }
  // The spokes, tapered from the hub out, red paint lit along one edge.
  for (let k = 0; k < SPOKES; k++) {
    const sa = a + (k / SPOKES) * TAU;
    c.save();
    c.translate(cx, cy);
    c.rotate(sa);
    body(c, shape([HUB - 0.4, -0.55, RIM_IN + 0.3, -0.38, RIM_IN + 0.3, 0.38, HUB - 0.4, 0.55]), RED,
      (p) => box(p, 0, 0.05, R, 0.6, RED_DK), INK, LWF * 1.4);
    c.restore();
  }
  // A twist of straw caught in the spokes, going round with them.
  // Three strands laid along a spoke, so it reads as a wisp and not a mark.
  const wisp = [];
  for (const [r0, r1, off] of [[2.6, 5.4, -0.35], [3.0, 5.8, 0.1], [2.8, 4.9, 0.45]]) {
    const wa = a + 0.9 + off * 0.18;
    wisp.push(cx + Math.cos(wa) * r0, cy + Math.sin(wa) * r0, cx + Math.cos(wa + 0.12) * r1, cy + Math.sin(wa + 0.12) * r1);
  }
  lines(c, wisp, STRAW_INK, 0.55);
  lines(c, wisp, STRAW_LT, 0.3);
  // The felloe — the wooden rim — inside its iron tyre.
  const ring = (r0, r1) => (p) => {
    p.arc(cx, cy, r1, 0, TAU);
    p.moveTo(cx + r0, cy);
    p.arc(cx, cy, r0, 0, TAU, true);
  };
  body(c, ring(RIM_IN, R - 0.9), RED, (p) => {
    p.beginPath();
    p.moveTo(cx, cy);
    p.arc(cx, cy, R, Math.PI * 0.05, Math.PI * 0.8);
    p.closePath();
    p.fillStyle = RED_DK;
    p.fill();
    p.beginPath();
    p.arc(cx, cy, R - 1.6, Math.PI * 1.08, Math.PI * 1.45);
    pen(p, RED_LT, 0.45);
    p.stroke();
    // The joints between the felloe's five pieces.
    for (let k = 0; k < 5; k++) {
      const ja = a + 0.31 + (k / 5) * TAU;
      line(p, cx + Math.cos(ja) * RIM_IN, cy + Math.sin(ja) * RIM_IN, cx + Math.cos(ja) * (R - 0.9), cy + Math.sin(ja) * (R - 0.9), INK, LWF);
    }
  }, INK, LWI);
  body(c, ring(R - 0.9, R), CHAR, (p) => {
    p.beginPath();
    p.arc(cx, cy, R - 0.45, Math.PI * 1.1, Math.PI * 1.4);
    pen(p, STEEL, 0.35);
    p.stroke();
  }, INK, LWI);
  // Rivets in the tyre, turning.
  for (let k = 0; k < 5; k++) {
    const ra = a + (k / 5) * TAU;
    circ(c, cx + Math.cos(ra) * (R - 0.45), cy + Math.sin(ra) * (R - 0.45), 0.22, STEEL_LT);
  }
  // The hub: a fat timber nave in an iron band, the axle hole, one bolt.
  circ(c, cx, cy, HUB, TIMBER, INK, LWI);
  circ(c, cx, cy, HUB - 0.55, null, CHAR, 0.45);
  circ(c, cx, cy, 0.75, CHAR_DK, INK, LWF);
  circ(c, cx + Math.cos(a) * 1.25, cy + Math.sin(a) * 1.25, 0.25, STEEL_LT);
}

// E — GARDEN INCINERATOR, the galvanised bin burning leaves (fire 17x29)
function incinerator(c, w, h, t) {
  const f = frameOf(t, 8, 12), g = h - 0.3;
  const TOP = 13.2;
  // Smoke out of the stack, leaning downwind toward the hero.
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 8 / 3) % 8) / 8;
    puff(c, 7.6 - k * 5.4, 3.6 - k * 2.6, 0.9 + k * 1.3);
  }
  // Flames out of the chimney.
  flames(c, 8.6, 5.6, f, 8, 0.45);
  // Fallen leaves round its foot.
  for (const [x, y, r, col] of [[1.6, g - 0.5, -0.4, LEAF_RUST], [15.0, g - 0.4, 0.5, '#9a5a24'], [2.9, g - 0.3, 0.9, '#d98a3a']]) {
    ell(c, x, y, 1.1, 0.5, col, INK, LWF, r);
  }
  // Feet and the bin.
  box(c, 4.2, g - 1.6, 1.3, 1.6, STEEL_DK, INK, LWF);
  box(c, 11.5, g - 1.6, 1.3, 1.6, STEEL_DK, INK, LWF);
  body(c, shape([3.2, TOP, 13.8, TOP, 13.2, g - 1.4, 3.8, g - 1.4]), STEEL, (p) => {
    box(p, 11.0, 0, 4, h, STEEL_DK);
    box(p, 4.2, TOP + 1.0, 0.8, 12, STEEL_LT);
    // Soot where the heat comes out under the lid.
    box(p, 0, TOP, 17, 1.4, '#5c5652');
    // Two corrugation ribs.
    for (const y of [TOP + 4.4, TOP + 8.8]) {
      line(p, 2, y, 15, y, STEEL_DK, 0.5);
      line(p, 2, y + 0.55, 15, y + 0.55, STEEL_LT, 0.3);
    }
  });
  // The draught holes round the bottom: fire showing through, flickering.
  const VENTS = [4.6, 7.2, 9.8, 12.2];
  VENTS.forEach((x, i) => {
    const hot = (f + i) % 3 === 0 ? LEMON : ORANGE;
    poly(c, [x - 1.0, g - 2.4, x + 1.0, g - 2.4, x, g - 4.6], hot, INK, LWF);
  });
  // The conical lid and its chimney.
  body(c, shape([2.4, TOP + 0.4, 14.6, TOP + 0.4, 10.4, 9.8, 6.8, 9.8]), STEEL_DK, (p) => {
    poly(p, [8.6, 9, 15, 14, 15, 9], '#5e676d');
    line(p, 3.6, TOP - 0.2, 7.0, 10.4, STEEL, 0.45);
  });
  body(c, rect(7.2, 5.6, 2.8, 4.4), STEEL_DK, (p) => box(p, 9.0, 0, 2, 10, '#5e676d'));
  box(c, 6.8, 5.2, 3.6, 0.8, CHAR, INK, LWI);
  // A burning leaf lifting off on the heat.
  const k = f / 8;
  c.save();
  c.translate(11.0 + k * 2.4, 4.6 - k * 4.0);
  c.rotate(k * 3.4);
  ell(c, 0, 0, 0.8, 0.4, LEAF_RUST, INK, LWF);
  box(c, -0.1, -0.4, 0.6, 0.8, ORANGE);
  c.restore();
}

// F — SHOW JUMP, a pony-club fence of striped poles on white wings (hurdle 21x12)
function showJump(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 0.2;
  // The top pole has just been clipped: it rattles in its cups and settles.
  const rattle = [0.55, -0.25, 0.3, -0.1, 0.1, 0, 0, 0][f];
  const WINGS = [[2.6, -1], [18.4, 1]];
  for (const [px, side] of WINGS) {
    // Foot strut out to the side, the upright, its cap.
    poly(c, [px, g - 3.8, px + side * 2.2, g, px + side * 1.2, g, px, g - 2.2], CREAM_DK, INK, LWF);
    body(c, rect(px - 0.9, 1.4, 1.8, g - 1.4), CREAM, (p) => box(p, px + 0.25, 0, 1, h, CREAM_DK));
    poly(c, [px - 1.2, 1.6, px, 0.2, px + 1.2, 1.6], RED, INK, LWI);
    // Its painted band.
    box(c, px - 0.9, 6.0, 1.8, 1.0, RED, INK, LWF);
  }
  // A rosette on the near wing, its tails fluttering.
  const fl = Math.sin((f / 8) * TAU) * 0.5;
  poly(c, [1.7, 4.4, 1.0 + fl, 7.6, 1.8, 7.0], SKYBLUE, INK, LWF);
  poly(c, [2.4, 4.4, 2.6 - fl, 7.8, 3.2, 7.1], SKYBLUE, INK, LWF);
  circ(c, 2.1, 4.0, 1.25, SKYBLUE, INK, LWI);
  circ(c, 2.1, 4.0, 0.55, LEMON, INK, LWF);
  // A striped pole between two cups; `lift` raises the right end.
  const pole = (y, lift, offset) => {
    const x0 = 3.0, x1 = 18.0, th = 1.5;
    const pts = [x0, y, x1, y - lift, x1, y - lift + th, x0, y + th];
    c.save();
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath();
    c.fillStyle = CREAM;
    c.fill();
    c.clip();
    for (let k = 0; k < 4; k++) {
      const sx = x0 + (k * 2 + offset) * (x1 - x0) / 8;
      poly(c, [sx, 0, sx + (x1 - x0) / 8, 0, sx + (x1 - x0) / 8, h, sx, h], RED);
    }
    box(c, 0, y - 2, 21, 0.4 + 2 - lift * 0.5, 'rgba(255,255,255,0.5)');
    c.restore();
    poly(c, pts, null, INK, LWI);
    for (const [x, dy] of [[x0 - 0.2, 0], [x1 + 0.2, -lift]]) box(c, x - 0.6, y + dy + th - 0.3, 1.2, 0.9, CHAR, INK, LWF);
  };
  pole(7.6, 0, 1);
  pole(3.4, rattle, 0);
}

// G — SPIKE HARROW, lying tines-up in the grass (floor 20x16, bedded)
function spikeHarrow(c, w, h, t) {
  // Bedded: the run's road line is 3.5 up from the art's foot, so everything
  // that has to show stands above that.
  const f = frameOf(t, 12, 9), road = h - 3.5;
  // A harrow is a grid, so its tines come in staggered rows: the back row,
  // further off, is shorter, darker and seated a step higher, and shows in the
  // gaps of the front one. Few and fat rather than many and thin — a dense
  // fringe at this size is a bed of nails, which is the factory plate again.
  const BACK = [4.2, 9.6, 15.0];
  for (const x of BACK) poly(c, [x - 0.75, road - 2.4, x + 0.75, road - 2.4, x - 0.2, road - 7.6], STEEL_DK, INK, LWF * 1.3);
  // The frame: a back rail, zigzag struts, the front rail, all in red paint.
  box(c, 1.6, road - 3.0, 17.0, 1.0, RED_DK, INK, LWF);
  for (let i = 0; i < 4; i++) {
    const x = 2.2 + i * 4.3;
    poly(c, [x, road - 2.0, x + 1.0, road - 2.0, x + 3.4, road - 0.6, x + 2.4, road - 0.6], RED_DK, INK, LWF);
  }
  body(c, rect(0.6, road - 1.0, 18.4, 2.4), RED, (p) => {
    box(p, 0.6, road - 1.0, 18.4, 0.6, RED_LT);
    box(p, 0.6, road + 0.6, 18.4, 1, RED_DK);
  }, INK, LWI);
  // The drawbar ring at the right-hand end.
  circ(c, 19.2, road - 0.5, 0.9, null, INK, 0.75);
  circ(c, 19.2, road - 0.5, 0.9, null, STEEL_DK, 0.35);
  // The front row: four tall steel tines, lit on their left, leaning a touch
  // forward, a glint walking along them and off the end.
  const FRONT = [1.6, 6.9, 12.3, 17.6];
  FRONT.forEach((x, i) => {
    const tip = road - 10.2 + (i % 2) * 0.9;
    poly(c, [x - 0.95, road - 0.9, x + 0.95, road - 0.9, x - 0.35, tip], STEEL, INK, 0.3);
    poly(c, [x - 0.75, road - 1.0, x - 0.1, road - 1.0, x - 0.38, tip + 0.7], STEEL_LT);
    if (f === i * 2) {
      const s = 1.3, gx = x - 0.35;
      poly(c, [gx, tip - s, gx + s * 0.25, tip - 0.25 * s, gx + s, tip, gx + s * 0.25, tip + s * 0.25,
        gx, tip + s, gx - s * 0.25, tip + s * 0.25, gx - s, tip, gx - s * 0.25, tip - s * 0.25], WHITE);
    }
  });
}

// H — ROTAVATOR, left running in the furrow, churning (saw 20x15, bedded)
function rotavator(c, w, h, t) {
  const f = frameOf(t, 8, 20), road = h - 3.5;
  // The rotor rides high in its furrow — two thirds of it above the road line —
  // because the turning tines ARE the hazard, and a rotor sunk to its axle
  // shows nothing but a mudguard.
  const cx = 7.4, cy = road - 2.4, R = 4.8;
  // The handlebars, back up to the right, and the grip.
  lines(c, [13.6, 5.0, 19.0, 0.8], INK, 1.15);
  lines(c, [13.6, 5.0, 19.0, 0.8], STEEL_DK, 0.5);
  rbox(c, 18.0, 0.0, 2.0, 1.6, 0.6, CHAR, INK, LWF);
  // Turned earth heaped round the rotor's foot.
  ell(c, cx + 0.6, road + 0.2, 7.4, 1.6, SOIL, INK, LWF);
  // The tines: six hooked blades a sixth of a turn per ring, so it loops,
  // turning so the front ones dig toward the hero.
  for (let k = 0; k < 6; k++) {
    const a = -(f / 8) * (TAU / 6) + k * (TAU / 6);
    c.save();
    c.translate(cx, cy);
    c.rotate(a);
    body(c, (p) => {
      p.moveTo(0.6, -0.7);
      p.lineTo(R - 1.4, -0.8);
      p.quadraticCurveTo(R + 0.3, -0.8, R + 0.1, 1.2);
      p.lineTo(R - 1.0, 0.7);
      p.lineTo(0.6, 0.7);
      p.closePath();
    }, STEEL_LT, (p) => box(p, 0, 0.15, R + 1, 1, STEEL), INK, LWF * 1.5);
    c.restore();
  }
  circ(c, cx, cy, 1.3, CHAR, INK, LWI);
  circ(c, cx, cy, 0.45, STEEL);
  // The red guard over the rotor's top and back; the front is open.
  body(c, (p) => {
    p.arc(cx, cy, R + 1.8, Math.PI * 1.3, Math.PI * 2.08);
    p.arc(cx, cy, R + 0.5, Math.PI * 2.08, Math.PI * 1.3, true);
    p.closePath();
  }, RED, (p) => {
    p.beginPath();
    p.arc(cx, cy, R + 1.35, Math.PI * 1.36, Math.PI * 1.62);
    pen(p, RED_LT, 0.45);
    p.stroke();
  });
  // The engine behind the guard, its red tank, the pull-start.
  body(c, rect(11.0, 4.2, 4.4, 3.4), CHAR, (p) => box(p, 14.0, 0, 2, 9, CHAR_DK), INK, LWI);
  body(c, (p) => rrPath(p, 11.0, 2.4, 3.8, 2.0, 0.8), RED, (p) => box(p, 13.4, 2, 2, 3, RED_DK), INK, LWI);
  // Exhaust: a puff every other beat.
  if (f % 4 < 2) puff(c, 16.8 + (f % 4) * 0.6, 4.2 - (f % 4) * 0.8, 0.7 + (f % 4) * 0.3);
  // Clods of soil flung forward at the hero, on an arc out of the front.
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 8 / 3) % 8) / 8;
    const x = cx - R - 0.4 - k * 6.0;
    const y = cy - Math.sin(k * Math.PI) * 4.0 + k * 2.4;
    circ(c, x, y, 0.85 - k * 0.2, SOIL, INK, LWF);
  }
}

// I — KITE, broken loose, diving at head height (high 22x13)
function kite(c, w, h, t) {
  const f = frameOf(t, 8, 10);
  const p8 = (f / 8) * TAU;
  // The tail: a string of bows trailing back, a wave running down it.
  const tail = (u) => [9.8 + u * 11.6, 10.2 + Math.sin(p8 - u * 6.0) * 1.3 * u + u * 0.6];
  c.beginPath();
  for (let i = 0; i <= 12; i++) {
    const [x, y] = tail(i / 12);
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  }
  pen(c, INK, 0.3);
  c.stroke();
  const BOWS = [[0.3, LEMON], [0.58, SKYBLUE], [0.86, RED]];
  for (const [u, col] of BOWS) {
    const [x, y] = tail(u);
    poly(c, [x - 1.1, y - 0.8, x, y, x - 1.1, y + 0.8], col, INK, LWF);
    poly(c, [x + 1.1, y - 0.8, x, y, x + 1.1, y + 0.8], col, INK, LWF);
  }
  // The kite itself, pitching as it dives: nose up-left toward the hero.
  c.save();
  c.translate(8.6, 6.0);
  c.rotate(-0.55 + Math.sin(p8) * 0.08);
  const T = [0, -6.6], L = [-4.4, -1.6], B = [0, 5.4], Rt = [4.4, -1.6];
  poly(c, [...T, ...L, 0, -1.6], RED);
  poly(c, [...T, ...Rt, 0, -1.6], RED_DK);
  poly(c, [...L, ...B, 0, -1.6], LEMON);
  poly(c, [...Rt, ...B, 0, -1.6], HONEY_DK);
  // The spars, then the outline in full ink.
  lines(c, [0, -6.4, 0, 5.2, -4.2, -1.6, 4.2, -1.6], TIMBER_DK, 0.35);
  poly(c, [...T, ...L, ...B, ...Rt], null, INK, LW);
  // The snapped flying line, trailing off its belly.
  c.beginPath();
  c.moveTo(0, 0.2);
  c.quadraticCurveTo(2.4, 4.0, 1.2 + Math.sin(p8) * 0.6, 7.6);
  pen(c, INK, 0.22);
  c.stroke();
  c.restore();
  // Swoosh lines off the nose side: it is coming at you.
  for (let i = 0; i < 2; i++) {
    const k = ((f + i * 4) % 8) / 8;
    line(c, 13.4 + k * 1.6, 2.4 + i * 2.6, 15.0 + k * 1.6, 2.4 + i * 2.6, 'rgba(42,26,22,0.55)', 0.3);
  }
}

// J — BEE SWARM, a cloud of them at head height (low 22x13)
function beeSwarm(c, w, h, t) {
  const f = frameOf(t, 8, 12);
  const p8 = (f / 8) * TAU;
  // The swarm's body: a flat haze, darker where they are thickest.
  ell(c, 11.0, 6.8, 9.6, 5.2, 'rgba(42,26,22,0.12)');
  ell(c, 10.6, 6.6, 6.2, 3.6, 'rgba(42,26,22,0.12)');
  // Eleven bees, each on its own little loop inside the cloud, mostly facing
  // the hero; the loops share the ring so the cloud breathes rather than drifts.
  const SWARM = [
    [4.2, 6.6, 1.4, 1.0, 0.0], [7.0, 3.6, 1.6, 0.8, 1.1], [7.6, 9.2, 1.2, 1.0, 2.3],
    [10.2, 6.2, 1.8, 1.2, 3.0], [11.8, 2.8, 1.4, 0.8, 4.2], [12.6, 9.6, 1.6, 0.9, 5.1],
    [14.6, 5.6, 1.4, 1.1, 0.7], [16.8, 8.4, 1.2, 0.8, 1.9], [17.6, 3.8, 1.2, 0.9, 2.8],
    [9.0, 11.0, 1.0, 0.6, 3.7], [19.6, 6.4, 1.0, 0.8, 4.6],
  ];
  SWARM.forEach(([x, y, rx, ry, ph], i) => {
    const a = p8 + ph;
    const bx = x + Math.cos(a) * rx, by = y + Math.sin(a * (i % 2 ? 1 : -1)) * ry;
    const dir = Math.sin(a) > 0.55 ? 1 : -1;
    // A buzz trail behind the four at the front of the cloud.
    if (i % 3 === 0) {
      c.beginPath();
      c.arc(x, y, Math.max(rx, 0.6), a + 0.4, a + 1.4);
      pen(c, 'rgba(42,26,22,0.45)', 0.22);
      c.stroke();
    }
    bee(c, bx, by, dir, 1.15, (f + i) % 2 === 0);
  });
}

// ================================================================ candidates
const CANDIDATES = [
  { letter: 'A', id: 'beehive', name: 'BEEHIVE', slot: 'stand', paint: beehive,
    note: 'A white cottage-garden hive with a red roof, five bees circling its waist and one on the landing board. Replaces the desert cactus in the half of the cactus patterns the thistle does not take. Breaks into boards and a very cross cloud.' },
  { letter: 'B', id: 'scarecrow', name: 'SCARECROW', slot: 'big', paint: scarecrow,
    note: 'Red check shirt and patched denim on a post, sack head with stitched eyes, straw out of every cuff. The sleeves flap, the hat lifts on the gust and a straw blows off at you. Replaces the big cactus. Not in the backdrop (the wheat-field scarecrow was never shipped).' },
  { letter: 'C', id: 'hayBale', name: 'HAY BALES', slot: 'stack', paint: hayBale,
    note: 'Small square bales with two red twines and a stubbled cut end, stray straws stirring: the crate as the field stacks it — Peter named hay bales for these hills on 24 Sep. Straw ochre and red twine, never the !-crate lemon.' },
  { letter: 'D', id: 'cartWheel', name: 'CART WHEEL', slot: 'barrel', paint: cartWheel,
    note: 'A red-painted wagon wheel off the hay cart, iron tyre and straw caught in its spokes, bowling down off the hill at you. Replaces the platformer barrel. The run already spins the barrel’s sprite, which is exactly how a wheel rolls, so this one ports with no new motion.' },
  { letter: 'E', id: 'incinerator', name: 'GARDEN INCINERATOR', slot: 'fire', paint: incinerator,
    note: 'The galvanised bin every allotment burns its leaves in: fire through the draught holes, flames out of the stack, smoke leaning at you, a burning leaf lifting off. Replaces the oil drum.' },
  { letter: 'F', id: 'showJump', name: 'SHOW JUMP', slot: 'hurdle', paint: showJump,
    note: 'A pony-club fence: red and white poles on white wings, a blue rosette on the near one. The top pole has just been clipped and rattles in its cups. Replaces the steel razor hurdle — the one obstacle that says JUMP by being one.' },
  { letter: 'G', id: 'spikeHarrow', name: 'SPIKE HARROW', slot: 'floor', paint: spikeHarrow,
    note: 'A red harrow left lying upside down in the long grass, two rows of steel tines up, a glint running along them. The countryside’s spike plate, in place of the factory one. No hazard lip and no lurk: it lies in plain view.' },
  { letter: 'H', id: 'rotavator', name: 'ROTAVATOR', slot: 'saw', paint: rotavator,
    note: 'A garden rotavator left running in its furrow: hooked tines churning under a red guard, a red tank, exhaust puffing, clods of soil flung at the hero. The floor saw’s spinning blade, as a thing a smallholding owns.' },
  { letter: 'I', id: 'kite', name: 'KITE', slot: 'high', paint: kite,
    note: 'A red and yellow diamond kite broken off its line, diving at head height with its bow tail whipping behind. Replaces the songbird with something that is not an animal and reads against every sky.' },
  { letter: 'J', id: 'beeSwarm', name: 'BEE SWARM', slot: 'low', paint: beeSwarm,
    note: 'A cloud of eleven bees milling at head height, each on its own loop — slide under it. Replaces the rotor drone (a 2020s machine in a late-’80s field). Pairs with A: the hive and the swarm that left it.' },
];

export const BAKEOFF = {
  cabinet: 'plumber',
  title: 'FIELD SERVICE — obstacles that belong on the farm (bake-off)',
  note: 'Half the cactus patterns still deal the desert cactus, and the oil-drum fire, the steel razor hurdle, the spike plate and floor saw with their yellow-and-black lips, the rotor drone, the platformer crate and barrel and the outline-less songbird all came from other worlds. The thistle, the rake, the goose, the campfire and the !-crate fit and stay. Ten countryside replacements, one per misfit slot, in the lane’s own hand — warm ink, flat fills, saturated colour against the paper hills. Pick letters.',
  // One strip of the real frame per entry; stageIndex and camX pick the scenery.
  strips: [
    { label: 'FIELD SERVICE 1', stageIndex: 1, camX: 600 },
    { label: 'FIELD SERVICE 3', stageIndex: 3, camX: 2200 },
  ],
  // The detail row's panels: the pale sky, the deeper sky over the near ridge,
  // and the near hills themselves — most of the lane's hazards stand in front
  // of the hills, not the sky.
  swatches: [
    { sky: '#a8e0f8', ground: '#3a9c48', under: '#2a7038' },
    { sky: '#78c8f0', ground: '#3a9c48', under: '#6b4426' },
    { sky: '#48a050', ground: '#3a9c48', under: '#2a7038' },
  ],
  // What the cabinet deals today, through the real run painter: [type, x].
  control: [
    ['crate', 2], ['cactus', 22], ['qcrate', 30], ['thistle', 78], ['popSpikes', 96], ['floorSaw', 116],
    ['drone', 104], ['barrel', 140], ['fireBarrel', 158], ['buzzbird', 160], ['boomBarrier', 178],
    ['cactusBig', 200], ['campfire', 224],
  ],
  candidates: CANDIDATES,
};

export { frameOf };
