// Gallery-only FROST FORTRESS OBSTACLE concepts — ten things that stand, roll,
// lie or fly in the lane of the snowfields, drawn in Frost's cut-paper hand.
//
// THE COMPLAINT (12 Oct 2026). Peter, after the office sheet: "can you examine
// obstacles in other cabinets … and recommend new items or replacements that fit
// in more with their style". Frost is half there already. Its own four were drawn
// for it — the snowman in his scarf and glasses, the ice crystal cluster, the
// 45° bear trap and the frozen switch — and they are the best-fitting bank in
// Act II. Everything else it deals is borrowed, and on a snowfield it shows:
//
//   * ICE_PATTERNS (data/cabinets.js) clones BASE_PATTERNS and swaps only the
//     cactus, so the shared WOODEN CRATE (stacked two high), the ROLLING WOODEN
//     BARREL, the purple ROTOR DRONE and the orange SONGBIRD all come through
//     unchanged — four of the commonest cells in the bank;
//   * the POP SPIKES are grey machine cones over a yellow-and-black hazard lip,
//     the one striped industrial mark on a cabinet the ski gate was taken off for
//     exactly that reason ("the one thing in the bank that could have come from
//     anywhere");
//   * the CAMPFIRE is already in the backdrop: frost-3's wolves sit round one
//     (stylePacks/frostWildlife.js, wolvesFire) — same ring of stones, same
//     crossed logs — and Peter's rule is that an obstacle is never something the
//     scenery already owns.
//
// THE BRIEF. Ten cold-world objects, each in a slot the lane already deals so a
// winner is a swap and not a new mechanic. Replacements for the six misfits
// first (two offers for the stack and the floor, one for each of the others),
// then two that would enrich the bank: an upright glider for the chair's ROLL
// slot, and Frost's own SHORT HURDLE to give back the slot the ski gate left.
// Nothing here repeats the backdrop — no pine, rock, glacier, keep, cabin or its
// woodpile, igloo, dog sled, groomer, beacon tower, chair lift, campfire or any
// animal (those have their own bake-offs).
//
// THE HAND. Frost's scenery is cut paper (frostWildlife.js, frostLandmarks.js):
// flat pieces, each over a hazy paper shadow a hair down and back, under a
// crayon sky (frostCrayon/) whose strokes rise to the right at HAND. A hazard has
// to self-outline where the scenery does not, so every piece here is that paper
// plus one slate ink (#26344d) at one weight: flat fill, a flat lit sliver, a
// flat shade band hatched in the crayon's direction, then the contour. No
// gradients, no blur.
//
// THE READ. What stands behind the lane is not the pale sky but the near hills:
// #84a3bf by day and #59668b at dusk (sampled off the real frame). Pale things —
// snow, frosted ice — stand off both; mid-blue ice vanishes into them, and dark
// slate vanishes at dusk. So ice here is drawn PALE with deep-blue shade, the
// dark materials are warm (bark, iron-red) rather than slate, and every candidate
// that can carries the guide's RED somewhere on it.
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units
// (obstacle-bakeoff-kit.js slotEnvelope: box x 4/3 x PROP_TALL x
// PROP_VISUAL_SCALE) with the ground line at y = h, and quantises `t` to its own
// frame ring. Porting is a 3/4 scale into sprites/props.js (its painters receive
// the box-x-tall size and the run stretches by 4/3), an OBSTACLES/DEBRIS/
// PROP_FRAMES/PROP_TALL entry, SELF_OUTLINED_PROPS (every one inks itself), and a
// swap in ICE_PATTERNS beside the cactus -> snowman one.
//
// MOTION IN THE PORT. The snowball is the one roller that SHOULD spin: draw.js's
// roll branch turns the whole raster, which is right for a ball, so its port
// draws one still frame and lets the run rotate it. The curling stone must not
// cartwheel — it glides upright, the office chair's case. The ice bolt flies
// level: its port drops the drone's bob and drift, which a quarrel in flight does
// not have. The parcels' tag, the saucer's spin and the rest are the painter's
// own frame ring.
//
// Nothing here is registered in any gameplay registry.
import { frameOf } from './obstacle-bakeoff-kit.js';

const TAU = Math.PI * 2;
// The crayon pack's hatch angle (stylePacks/frostCrayon/crayon.js): strokes rise to the right.
const HAND = 1.08;

// ------------------------------------------------------------------ palette
const INK = '#26344d'; // frostLandmarks' slate ink, at full strength
const LW = 0.55; // outline
const LWI = 0.32; // interior line
const LWF = 0.2; // fine line
const PAPER_SHADOW = 'rgba(52,74,98,0.3)'; // frostWildlife's SHADOW, a touch firmer at lane size
const SNOW = '#f7fbff', SNOW_SH = '#c9def0', SNOW_DK = '#9dbcd8';
const ICE = '#d3f0fd', ICE_LT = '#f4fcff', ICE_MID = '#a9d8f1', ICE_DK = '#6aa7d2', ICE_DEEP = '#3a77aa';
const RED = '#d8383c', RED_DK = '#9f2632', RED_LT = '#ff7f74'; // the snowman's scarf, a stop hotter
const LIFT = '#e8503a', LIFT_DK = '#b0362a', LIFT_LT = '#ff9274'; // the gondola cabins' red
const GOLD = '#f6c23c', GOLD_DK = '#c48d1a', GOLD_LT = '#fde79e'; // the gondola cabins' yellow
const BARK = '#6e4a38', BARK_DK = '#4a2f24';
const STEEL = '#c3d3de', STEEL_DK = '#7b93a5', STEEL_LT = '#eef6fb';
const GRANITE = '#b4bcc8', GRANITE_DK = '#7f8999', GRANITE_LT = '#dfe4ea';
const LATH = '#e0533d', LATH_DK = '#a83a2c', LATH_LT = '#ff8c70'; // snow-fence red
const WIRE = '#3b3f4a';
const IRON = '#8a4634', IRON_DK = '#5e2e24', IRON_LT = '#c27a5c'; // rusted iron, warm so it stands off the dusk slate
const PINE_NEEDLE = '#2f5d62'; // FROST_SCENERY_PALETTE's pine, for the needles in the snowball

// ------------------------------------------------------------------ helpers
// A deterministic 0..1 jitter, so hand-made irregularity holds still frame to frame.
const jit = (seed, i) => {
  const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

function pen(c, col, lw) {
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.lineJoin = 'round';
  c.lineCap = 'round';
}
function line(c, x0, y0, x1, y1, col, lw) {
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  pen(c, col, lw);
  c.stroke();
}
function fillStroke(c, fill, ink = null, lw = LWI) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink) { pen(c, ink, lw); c.stroke(); }
}
function box(c, x, y, w, h, fill, ink = null, lw = LWI) {
  c.beginPath();
  c.rect(x, y, w, h);
  fillStroke(c, fill, ink, lw);
}
function circ(c, x, y, r, fill, ink = null, lw = LWI) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  fillStroke(c, fill, ink, lw);
}
function ell(c, x, y, rx, ry, fill, ink = null, lw = LWI, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
  fillStroke(c, fill, ink, lw);
}
function poly(c, pts, fill, ink = null, lw = LWI) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  fillStroke(c, fill, ink, lw);
}

const rect = (x, y, w, h) => (p) => p.rect(x, y, w, h);
const shape = (pts) => (p) => {
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  p.closePath();
};
function rrPath(p, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  p.moveTo(x + k, y);
  p.lineTo(x + w - k, y); p.quadraticCurveTo(x + w, y, x + w, y + k);
  p.lineTo(x + w, y + h - k); p.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  p.lineTo(x + k, y + h); p.quadraticCurveTo(x, y + h, x, y + h - k);
  p.lineTo(x, y + k); p.quadraticCurveTo(x, y, x + k, y);
  p.closePath();
}
const rr = (x, y, w, h, r) => (p) => rrPath(p, x, y, w, h, r);

// A cut piece, the one move every object on this sheet makes: its paper shadow a
// hair down and back (Frost's paper-shadow move), the flat fill, the lit and
// shade bands clipped inside it, then the slate ink over all of it.
function piece(c, path, fill, inner = null, { ink = INK, lw = LW, shadow = true } = {}) {
  if (shadow) {
    c.save();
    c.translate(-0.35, 0.45);
    c.beginPath();
    path(c);
    c.fillStyle = PAPER_SHADOW;
    c.fill();
    c.restore();
  }
  c.save();
  c.beginPath();
  path(c);
  c.fillStyle = fill;
  c.fill();
  if (inner) { c.clip(); inner(c); }
  c.restore();
  if (ink) {
    c.beginPath();
    path(c);
    pen(c, ink, lw);
    c.stroke();
  }
}

// Crayon hatching over a box: short strokes at HAND, `gap` apart, each broken a
// little at its ends. The caller clips — this is how a shade band is laid in.
function hatch(c, x0, y0, x1, y1, col, gap = 1.1, lw = 0.22, seed = 1) {
  const cs = Math.cos(HAND), sn = Math.sin(HAND);
  const run = (y1 - y0) / sn;
  const step = gap / sn;
  c.beginPath();
  let i = 0;
  for (let x = x0 - (y1 - y0) * cs / sn; x < x1 + step; x += step, i++) {
    const a = 0.04 + jit(seed, i) * 0.22;
    const b = 0.96 - jit(seed + 7, i) * 0.22;
    c.moveTo(x + cs * run * a, y1 - sn * run * a);
    c.lineTo(x + cs * run * b, y1 - sn * run * b);
  }
  pen(c, col, lw);
  c.stroke();
}

// The four-point glint the crystals and the snowman's catch-lights use.
function glint(c, x, y, s, col = '#ffffff') {
  if (s <= 0) return;
  poly(c, [x, y - s, x + s * 0.26, y - s * 0.26, x + s, y, x + s * 0.26, y + s * 0.26,
    x, y + s, x - s * 0.26, y + s * 0.26, x - s, y, x - s * 0.26, y - s * 0.26], col);
}

// One icicle hanging from (x, y): pale ice, a white streak down its lit side, inked.
function icicle(c, x, y, len, half = 0.75) {
  poly(c, [x - half, y, x + half, y, x + 0.1, y + len], ICE, INK, LWF);
  poly(c, [x - half * 0.55, y + 0.2, x - half * 0.05, y + 0.2, x - 0.02, y + len * 0.7], ICE_LT);
  line(c, x + half * 0.45, y + 0.3, x + 0.12, y + len * 0.8, ICE_DK, 0.16);
}

// A lumpy cap of snow lying along a top edge from x0 to x1 at y, `thick` deep:
// the white slab, the blue shade under its lip, inked.
function snowCap(c, x0, x1, y, thick, seed = 1, overhang = 0.6) {
  const n = Math.max(3, Math.round((x1 - x0) / 2.2));
  const top = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * (i / n);
    top.push(x, y - thick * (0.55 + 0.45 * Math.sin(Math.PI * i / n)) - jit(seed, i) * 0.35);
  }
  const path = (p) => {
    p.moveTo(x0 - overhang, y + 0.3);
    for (let i = 0; i < top.length; i += 2) p.lineTo(top[i], top[i + 1]);
    p.lineTo(x1 + overhang, y + 0.3);
    p.quadraticCurveTo((x0 + x1) / 2, y + 0.9, x0 - overhang, y + 0.3);
    p.closePath();
  };
  piece(c, path, SNOW, (p) => {
    box(p, x0 - 2, y - 0.2, x1 - x0 + 4, 2, SNOW_SH);
  }, { lw: LWI, shadow: false });
}

// ================================================================ painters
// All in world units inside the envelope, ground at y = h.

// A — ICE BLOCKS: blocks of lake ice cut with a saw and stacked (stack 16x15)
function iceBlock(c, w, h, t) {
  const f = frameOf(t, 12, 8), g = h - 0.2;
  const X0 = 0.8, X1 = 12.6, TOP = 4.6, DX = 2.8, DY = -2.2;
  // The side face, going back in the cold shade, hatched.
  piece(c, shape([X1, TOP, X1 + DX, TOP + DY, X1 + DX, g + DY, X1, g]), ICE_DK, (p) => {
    hatch(p, X1, TOP + DY, X1 + DX, g, ICE_DEEP, 0.85, 0.24, 3);
  });
  // The top face, the palest thing on the block.
  piece(c, shape([X0, TOP, X1, TOP, X1 + DX, TOP + DY, X0 + DX, TOP + DY]), ICE_LT, null, { lw: LWI, shadow: false });
  // The front face: clear ice, deeper and bluer toward the foot, the saw's
  // striations across it, bubbles frozen in trails, and one crack.
  piece(c, rect(X0, TOP, X1 - X0, g - TOP), ICE, (p) => {
    box(p, X0, g - 3.4, X1 - X0, 3.4, ICE_MID);
    box(p, X0, g - 1.2, X1 - X0, 1.2, ICE_DK);
    box(p, X0 + 0.6, TOP + 0.8, 0.8, g - TOP - 4.6, ICE_LT);
    for (const y of [TOP + 3.0, TOP + 5.6]) line(p, X0, y, X1, y + 0.3, 'rgba(58,119,170,0.35)', 0.22);
    // Bubble trails: each bubble steps up a little on the ring, the column stays put.
    const TRAILS = [[4.2, 0], [7.6, 3], [10.4, 6]];
    for (const [bx, ph] of TRAILS) {
      for (let k = 0; k < 4; k++) {
        const y = g - 2.0 - k * 2.0 - (((f + ph) % 12) / 12) * 2.0;
        if (y < TOP + 1) continue;
        circ(p, bx + jit(bx, k) * 0.8, y, 0.28 + k * 0.06, ICE_LT, ICE_DK, 0.12);
      }
    }
    p.beginPath();
    p.moveTo(X0 + 2.2, TOP);
    p.lineTo(X0 + 3.4, TOP + 2.4);
    p.lineTo(X0 + 2.8, TOP + 3.6);
    p.lineTo(X0 + 4.4, TOP + 6.2);
    pen(p, ICE_DEEP, 0.24);
    p.stroke();
    line(p, X0 + 3.4, TOP + 2.4, X0 + 4.8, TOP + 2.0, ICE_DEEP, 0.18);
  });
  // Frost along the front top edge, and a crust of snow on the back of the lid.
  snowCap(c, X0 + 3.6, X1 + 1.6, TOP + DY * 0.55, 1.2, 4, 0.2);
  // The cut catches the light.
  const s = [0, 0, 0, 0.6, 1.4, 1.0, 0.4, 0, 0, 0, 0, 0][f];
  glint(c, X0 + 1.2, TOP + 0.6, s);
}

// B — PARCELS: the presents that fell off the sleigh (stack 16x15)
function parcel(c, w, h, t) {
  const f = frameOf(t, 8, 6), g = h - 0.2;
  const X0 = 1.0, X1 = 12.2, BTOP = 7.0, DX = 2.6, DY = -1.8;
  const LTOP = 4.8, LX0 = 0.4, LX1 = 12.8;
  const sw = Math.sin((f / 8) * TAU);
  // The box: red paper, the far side in shade, a gold ribbon round it.
  piece(c, shape([X1, BTOP, X1 + DX, BTOP + DY, X1 + DX, g + DY, X1, g]), RED_DK, (p) => {
    hatch(p, X1, BTOP + DY, X1 + DX, g, '#7a1c28', 0.85, 0.24, 5);
    box(p, X1, BTOP + 3.0, DX, 1.6, GOLD_DK);
  });
  piece(c, rect(X0, BTOP, X1 - X0, g - BTOP), RED, (p) => {
    box(p, X0, g - 1.4, X1 - X0, 1.4, RED_DK);
    box(p, X0 + 0.6, BTOP + 0.6, 0.8, g - BTOP - 2.4, RED_LT);
    // Paper printed with small white snowflakes.
    for (const [sx, sy] of [[2.6, 9.4], [10.0, 9.0], [3.4, 12.6], [9.2, 12.8]]) {
      p.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI;
        p.moveTo(sx - Math.cos(a) * 0.7, sy - Math.sin(a) * 0.7);
        p.lineTo(sx + Math.cos(a) * 0.7, sy + Math.sin(a) * 0.7);
      }
      pen(p, '#ffe8e4', 0.2);
      p.stroke();
    }
    box(p, 5.8, 0, 1.8, h, GOLD);
    box(p, 5.8, 0, 0.5, h, GOLD_LT);
  });
  // The lid, proud of the box all round.
  piece(c, shape([LX1, LTOP, LX1 + DX, LTOP + DY, LX1 + DX, LTOP + DY + 2.4, LX1, LTOP + 2.4]), RED_DK, (p) => {
    box(p, LX1, 0, 1.0, h, '#7a1c28');
  }, { lw: LWI });
  piece(c, shape([LX0, LTOP, LX1, LTOP, LX1 + DX, LTOP + DY, LX0 + DX, LTOP + DY]), RED_LT, (p) => {
    poly(p, [5.5, LTOP, 7.9, LTOP, 7.9 + DX, LTOP + DY, 5.5 + DX, LTOP + DY], GOLD);
  }, { lw: LWI, shadow: false });
  piece(c, rect(LX0, LTOP, LX1 - LX0, 2.4), RED, (p) => {
    box(p, LX0, LTOP + 1.6, LX1 - LX0, 0.8, RED_DK);
    box(p, 5.6, 0, 2.0, h, GOLD);
  }, { lw: LWI });
  // A dusting of snow on the lid where it fell.
  ell(c, 3.4, LTOP - 0.7, 1.9, 0.55, SNOW, INK, LWF);
  ell(c, 11.4, LTOP - 1.2, 1.5, 0.45, SNOW, INK, LWF);
  // The bow: two loops and two tails on top of the lid.
  const bx = 7.9, by = LTOP - 0.9;
  ell(c, bx - 2.0, by - 1.3, 2.0, 1.15, GOLD, INK, LWI, -0.45);
  ell(c, bx + 2.0, by - 1.3, 2.0, 1.15, GOLD, INK, LWI, 0.45);
  ell(c, bx - 2.2, by - 1.4, 0.8, 0.4, GOLD_DK, null, 0, -0.45);
  ell(c, bx + 2.2, by - 1.4, 0.8, 0.4, GOLD_DK, null, 0, 0.45);
  circ(c, bx, by - 0.6, 0.85, GOLD, INK, LWI);
  // The gift tag on its string, turning in the wind.
  c.beginPath();
  c.moveTo(bx - 0.6, by - 0.2);
  c.quadraticCurveTo(bx - 3.4, by + 1.8, 3.4 + sw * 0.5, LTOP + 3.6);
  pen(c, INK, 0.16);
  c.stroke();
  c.save();
  c.translate(3.4 + sw * 0.5, LTOP + 3.6);
  c.rotate(0.35 + sw * 0.3);
  poly(c, [-0.2, 0, 1.6, -0.2, 2.2, 0.9, 1.6, 2.0, -0.2, 1.8], '#fffaf0', INK, LWF);
  circ(c, 0.5, 0.9, 0.22, INK);
  c.restore();
}

// C — GIANT SNOWBALL rolling at you, a red scarf wound into it on the way (barrel 17x17)
function giantSnowball(c, w, h, t) {
  const f = frameOf(t, 8, 8);
  // Rolling left, toward the hero: anticlockwise, one turn per ring.
  const spin = -(f / 8) * TAU;
  const cx = w / 2, cy = h / 2, R = w / 2 - 1.0;
  // A rolled ball is lumpy, and the lumps turn with it — so even the silhouette rolls.
  const rim = (p) => {
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU;
      const q = a - spin;
      const r = R - 0.3 + 0.32 * Math.sin(3 * q + 0.6) + 0.22 * Math.sin(7 * q + 2.1);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
    }
    p.closePath();
  };
  // What it picked up, drawn in the ball's own frame so it rides round with it.
  const inBall = (p, draw) => {
    p.save();
    p.translate(cx, cy);
    p.rotate(spin);
    draw(p);
    p.restore();
  };
  const SCARF = { r: 4.0, a0: 0.7, a1: 2.7 };
  const scarfEnd = (p) => {
    // Out of the snow at a1 and trailing back along the surface, against the turn.
    const ex = Math.cos(SCARF.a1) * SCARF.r, ey = Math.sin(SCARF.a1) * SCARF.r;
    const ox = Math.cos(SCARF.a1 + 0.35) * (R + 0.2), oy = Math.sin(SCARF.a1 + 0.35) * (R + 0.2);
    const tx = Math.cos(SCARF.a1 + 0.85) * (R + 0.4), ty = Math.sin(SCARF.a1 + 0.85) * (R + 0.4);
    p.beginPath();
    p.moveTo(ex, ey);
    p.quadraticCurveTo(ox, oy, tx, ty);
    pen(p, INK, 2.1);
    p.stroke();
    pen(p, RED, 1.5);
    p.stroke();
    // Its fringe.
    const na = SCARF.a1 + 0.85 + Math.PI / 2;
    for (let k = -1; k <= 1; k++) {
      const bx = tx + Math.cos(SCARF.a1 + 0.85) * k * 0.45, by = ty + Math.sin(SCARF.a1 + 0.85) * k * 0.45;
      line(p, bx, by, bx + Math.cos(na) * 1.2, by + Math.sin(na) * 1.2, RED_DK, 0.32);
    }
  };
  piece(c, rim, SNOW_SH, (p) => {
    hatch(p, cx - R, cy - R, cx + R, cy + R, SNOW_DK, 1.15, 0.24, 9);
    // The lit side, up and back toward the low sun.
    circ(p, cx - 1.5, cy - 1.7, R - 1.2, SNOW);
    // Contour strokes that follow the ball, as the crayon shades its hills.
    p.beginPath();
    p.arc(cx, cy, R - 1.1, -0.1, 1.75);
    p.moveTo(cx + Math.cos(0.35) * (R - 2.4), cy + Math.sin(0.35) * (R - 2.4));
    p.arc(cx, cy, R - 2.4, 0.35, 1.45);
    pen(p, SNOW_DK, 0.26);
    p.stroke();
    inBall(p, (q) => {
      // A few pine needles — nothing round and dark, which would make it a face.
      for (let i = 0; i < 3; i++) {
        const b = 5.6 + 0.6 + i * 0.5, x = Math.cos(5.6) * 2.4, y = Math.sin(5.6) * 2.4;
        line(q, x, y, x + Math.cos(b) * 1.5, y + Math.sin(b) * 1.5, PINE_NEEDLE, 0.26);
      }
      // The scarf, wound in: a red band with white stripes across it.
      q.beginPath();
      q.arc(0, 0, SCARF.r, SCARF.a0, SCARF.a1);
      pen(q, INK, 2.1);
      q.stroke();
      pen(q, RED, 1.5);
      q.stroke();
      for (let a = SCARF.a0 + 0.35; a < SCARF.a1; a += 0.42) {
        line(q, Math.cos(a) * (SCARF.r - 0.6), Math.sin(a) * (SCARF.r - 0.6),
          Math.cos(a) * (SCARF.r + 0.6), Math.sin(a) * (SCARF.r + 0.6), '#fff4ee', 0.3);
      }
      // Snow packed back over where it goes in.
      ell(q, Math.cos(SCARF.a0) * SCARF.r, Math.sin(SCARF.a0) * SCARF.r, 1.1, 0.8, SNOW, null, 0, SCARF.a0);
    });
  });
  // The loose end, flapping out past the rim — the clearest mark of the turn.
  inBall(c, scarfEnd);
}

// D — CRAMPONS: a dropped pair lying points-up in the snow (floor 20x16, bedded)
function crampons(c, w, h, t) {
  // Bedded: the run sinks the art 2u and cuts it at the road, so all of it sits above h - 2.
  const f = frameOf(t, 9, 9), gy = h - 2;
  const bar = gy - 1.0;
  // The far crampon of the pair, behind and a stop darker: its points only.
  for (const [x, ht] of [[6.0, 4.6], [9.0, 5.2], [12.0, 5.0], [15.0, 4.4], [18.0, 3.8]]) {
    poly(c, [x - 0.8, bar, x + 0.8, bar, x + 0.4, bar - ht], STEEL_DK, INK, LWF);
  }
  // The red strap, lying tangled across the snow and looped over the frame.
  c.beginPath();
  c.moveTo(0.6, gy - 0.3);
  c.quadraticCurveTo(3.6, gy - 0.6, 5.8, gy - 2.2);
  c.quadraticCurveTo(8.6, gy - 7.8, 11.6, gy - 4.0);
  c.quadraticCurveTo(13.0, gy - 1.6, 15.8, gy - 0.8);
  pen(c, INK, 1.55);
  c.stroke();
  pen(c, RED, 1.0);
  c.stroke();
  c.beginPath();
  c.moveTo(6.2, gy - 2.6);
  c.quadraticCurveTo(8.6, gy - 7.2, 11.0, gy - 4.4);
  pen(c, RED_LT, 0.28);
  c.stroke();
  // The buckle, on the strap's loose end.
  box(c, 0.4, gy - 1.3, 1.4, 1.1, STEEL, INK, LWF);
  // The near crampon: the frame lying on its back, its front points raking
  // forward at the hero, the rest standing straight up.
  piece(c, rr(2.6, bar - 0.6, 15.4, 1.6, 0.6), STEEL_DK, (p) => box(p, 2.6, bar - 0.6, 15.4, 0.5, STEEL), { lw: LWI });
  const PTS = [[4.6, 6.4], [7.4, 7.2], [10.4, 7.6], [13.4, 7.2], [16.4, 6.2]];
  PTS.forEach(([x, ht], i) => {
    poly(c, [x - 0.95, bar - 0.4, x + 0.95, bar - 0.4, x + 0.15, bar - 0.4 - ht], STEEL, INK, LWF);
    poly(c, [x - 0.7, bar - 0.5, x - 0.1, bar - 0.5, x + 0.1, bar - ht + 0.4], STEEL_LT);
    if (f === i * 2) glint(c, x + 0.15, bar - 0.4 - ht, 1.4);
  });
  // The two front points, raked forward toward the hero.
  for (const [x, dx, ht] of [[3.2, -3.0, 5.0], [2.6, -2.2, 3.2]]) {
    poly(c, [x - 0.8, bar - 0.2, x + 0.9, bar - 0.6, x + dx, bar - ht], STEEL, INK, LWF);
  }
  // The heel bail, a steel loop standing at the back end.
  c.beginPath();
  c.moveTo(17.6, bar - 0.4);
  c.quadraticCurveTo(19.6, bar - 3.6, 18.8, bar - 4.6);
  pen(c, INK, 0.75);
  c.stroke();
  pen(c, STEEL, 0.38);
  c.stroke();
}

// E — CALTROPS: the fortress's iron, strewn across the road and rimed with frost
// (floor 20x16, bedded)
function caltrops(c, w, h, t) {
  const f = frameOf(t, 9, 9), gy = h - 2;
  // However a caltrop lands, one point stands straight up and three brace it.
  // Each: [x, up-point height, its lean, which way it lies].
  const LIE = [[3.8, 7.6, -0.5, 1], [10.2, 8.4, 0.3, -1], [16.4, 7.2, 0.5, 1]];
  LIE.forEach(([x, ht, lean, dir], i) => {
    const cy = gy - 2.0;
    const spike = (tx, ty, half, fill) => {
      const a = Math.atan2(ty - cy, tx - x) + Math.PI / 2;
      poly(c, [x + Math.cos(a) * half, cy + Math.sin(a) * half, x - Math.cos(a) * half, cy - Math.sin(a) * half, tx, ty], fill, INK, LWF);
    };
    // The far point first, then the two along the road, then the one toward us.
    spike(x + dir * 1.2, gy - 0.6, 0.9, IRON_DK);
    spike(x - dir * 4.0, gy + 0.6, 1.25, IRON);
    spike(x + dir * 3.8, gy + 0.2, 1.25, IRON_DK);
    // The one standing up: lit down its left, a line of rime along that edge.
    poly(c, [x - 1.35, cy + 0.6, x + 1.35, cy + 0.6, x + lean, cy - ht + 2], IRON, INK, LWF);
    poly(c, [x - 0.95, cy + 0.3, x - 0.25, cy + 0.3, x + lean - 0.05, cy - ht + 3.2], IRON_LT);
    line(c, x - 1.0, cy + 0.1, x + lean * 0.5 - 0.5, cy - ht * 0.45 + 1, ICE_LT, 0.3);
    spike(x - dir * 0.6, gy + 1.4, 1.1, IRON);
    circ(c, x, cy, 0.95, IRON_DK, INK, LWF);
    // Frost glints off the points in turn.
    if (f === i * 3 + 1) glint(c, x + lean, cy - ht + 2, 1.4);
  });
}

// F — THE HEATING HE UNPLUGGED: an oil-filled radiator left out in the snow,
// frozen solid, its plug lying in a drift (campfire 19x17)
function unpluggedHeater(c, w, h, t) {
  const f = frameOf(t, 8, 6), g = h - 0.2;
  const FIN_TOP = 4.0, FIN_BOT = 13.2;
  // The flex, out of the control box and round the front to the plug.
  c.beginPath();
  c.moveTo(16.6, 12.2);
  c.quadraticCurveTo(18.6, g - 0.4, 12.0, g - 0.5);
  c.lineTo(5.0, g - 0.6);
  c.quadraticCurveTo(3.6, g - 0.7, 3.2, g - 1.4);
  pen(c, INK, 0.9);
  c.stroke();
  pen(c, '#efe8dc', 0.48);
  c.stroke();
  // The feet: an H-foot under each end, on castors.
  for (const x of [4.6, 13.0]) {
    box(c, x - 1.6, FIN_BOT + 0.6, 3.2, 0.8, '#3c3f4a', INK, LWF);
    circ(c, x - 1.1, g - 0.8, 0.75, INK);
    circ(c, x + 1.1, g - 0.8, 0.75, INK);
    circ(c, x - 1.1, g - 0.8, 0.28, '#8e95a4');
    circ(c, x + 1.1, g - 0.8, 0.28, '#8e95a4');
  }
  // The handle over the top.
  c.beginPath();
  c.moveTo(4.4, FIN_TOP + 0.4);
  c.lineTo(4.4, 2.0);
  c.lineTo(12.6, 2.0);
  c.lineTo(12.6, FIN_TOP + 0.4);
  pen(c, INK, 1.0);
  c.stroke();
  pen(c, '#55596a', 0.5);
  c.stroke();
  // Seven fins, side on, red enamel: each a rounded column, lit down its left.
  for (let i = 0; i < 7; i++) {
    const x = 2.2 + i * 1.82;
    piece(c, rr(x, FIN_TOP, 1.7, FIN_BOT - FIN_TOP, 0.85), LIFT, (p) => {
      box(p, x + 1.05, FIN_TOP, 0.7, FIN_BOT - FIN_TOP, LIFT_DK);
      box(p, x + 0.3, FIN_TOP + 1.0, 0.4, FIN_BOT - FIN_TOP - 2.2, LIFT_LT);
    }, { lw: LWI, shadow: i === 0 });
  }
  // The control box on the end: a dial turned to the snowflake, and a dead lamp.
  piece(c, rr(14.6, 4.8, 3.0, 8.2, 0.6), '#efe8dc', (p) => {
    box(p, 16.6, 4.8, 1.2, 8.4, '#c9c0b0');
    hatch(p, 16.6, 4.8, 17.8, 13.0, '#a89f90', 0.8, 0.2, 21);
  }, { lw: LWI });
  circ(c, 16.0, 7.2, 1.0, '#ffffff', INK, LWF);
  line(c, 16.0, 7.2, 15.5, 6.5, INK, 0.26);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    line(c, 16.0 - Math.cos(a) * 0.55, 9.6 - Math.sin(a) * 0.55, 16.0 + Math.cos(a) * 0.55, 9.6 + Math.sin(a) * 0.55, ICE_DEEP, 0.18);
  }
  // The lamp tries, now and then, and there is nothing behind it.
  circ(c, 16.0, 11.6, 0.45, f === 3 || f === 4 ? RED : '#6a2a2a', INK, 0.14);
  // Frost on every fin top, and icicles off the bottom where it thawed once.
  snowCap(c, 2.4, 14.6, FIN_TOP + 0.4, 1.0, 7, 0.4);
  ell(c, 16.1, 4.6, 1.6, 0.5, SNOW, INK, LWF);
  const ICICLES = [[3.0, 1.6], [5.0, 2.4], [6.8, 1.2], [8.6, 2.0], [10.5, 1.5], [12.4, 2.3]];
  for (const [x, len] of ICICLES) icicle(c, x, FIN_BOT, len, 0.55);
  // A drip off the longest one on the ring.
  if (f >= 4) circ(c, 5.0, FIN_BOT + 2.4 + (f - 4) * 0.5, 0.3, ICE, ICE_DEEP, 0.12);
  // The plug, face down in the snow with its pins at the hero.
  piece(c, rr(1.2, g - 3.0, 2.4, 2.2, 0.5), '#efe8dc', (p) => box(p, 1.2, g - 1.4, 2.4, 0.8, '#c9c0b0'), { lw: LWI });
  for (const y of [g - 2.5, g - 1.3]) box(c, 0.1, y, 1.2, 0.42, STEEL, INK, 0.12);
  ell(c, 2.6, g - 0.2, 2.6, 0.7, SNOW, INK, LWF);
}

// G — ICE BOLT: a crossbow quarrel with a head of ice and red flights, loosed
// from the fortress walls, at head height (low 22x13)
function iceBolt(c, w, h, t) {
  const f = frameOf(t, 8, 12), g = h;
  // The art's foot is the slide's headroom (artLift), so the bolt flies along it.
  const y = g - 3.4;
  // Rime streaming off it, back along the line it came.
  for (let i = 0; i < 4; i++) {
    const k = ((f + i * 2) % 8) / 8;
    circ(c, 15.0 + k * 6.4, y - 0.4 + (i % 2 ? 0.9 : -0.7) * k, 0.4 + k * 0.6, `rgba(247,251,255,${0.95 - k * 0.7})`, INK, 0.1);
  }
  // The flights: three red vanes, turning on the shaft as it spins. The ones
  // turned away are drawn first, in shade; there are always two to see.
  const spin = (f / 8) * TAU;
  const vane = (a, near) => {
    const tip = Math.sin(a) * 2.8;
    poly(c, [14.6, y, 17.6, y + tip * 0.8, 20.4, y + tip, 20.6, y + tip * 0.2, 19.0, y],
      near ? RED : RED_DK, INK, LWF);
    if (near) line(c, 15.4, y + tip * 0.2, 19.6, y + tip * 0.75, RED_LT, 0.2);
  };
  const vanes = [0, 1, 2].map((k) => spin + (k / 3) * TAU);
  for (const a of vanes) if (Math.cos(a) < 0) vane(a, false);
  // The shaft, ash with a dark wrap at each end.
  line(c, 4.6, y, 21.0, y, INK, 1.5);
  line(c, 4.6, y, 21.0, y, '#d9b98a', 0.9);
  line(c, 4.6, y - 0.18, 21.0, y - 0.18, '#f2dcb4', 0.2);
  for (const x of [5.6, 14.0]) box(c, x, y - 0.55, 0.9, 1.1, BARK_DK);
  box(c, 20.6, y - 0.5, 0.8, 1.0, RED_DK, INK, 0.12);
  for (const a of vanes) if (Math.cos(a) >= 0) vane(a, true);
  // The head: a long faceted point of ice, lit face up, cold face under, a ridge.
  piece(c, shape([0.2, y, 3.2, y - 2.0, 7.4, y - 1.2, 7.4, y + 1.2, 3.2, y + 2.0]), ICE, (p) => {
    poly(p, [0.2, y, 3.2, y + 2.0, 7.4, y + 1.2, 7.4, y], ICE_MID);
    hatch(p, 0, y, 7, y + 2, ICE_DK, 0.7, 0.18, 31);
    line(p, 0.6, y - 0.05, 6.6, y - 0.05, ICE_LT, 0.3);
  }, { lw: LWI });
  // The point glints as it turns.
  if (f === 2 || f === 6) glint(c, 0.6, y, 1.3);
}

// H — SNOW SAUCER: a red plastic sledging dish, flung off a slope, spinning in (high 22x13)
function snowSaucer(c, w, h, t) {
  const f = frameOf(t, 8, 12);
  const spin = (f / 8) * TAU;
  // It wobbles as it flies, like any flung disc, and shows us its dish.
  const tilt = -0.2 + 0.08 * Math.sin(spin);
  const cx = 10.4, cy = 6.0, RX = 8.2, RY = 4.0;
  // Powder thrown off its rim, trailing back the way it came.
  for (let i = 0; i < 4; i++) {
    const k = ((f + i * 2) % 8) / 8;
    circ(c, cx + RX + 0.4 + k * 3.2, cy + 1.6 - i * 0.8 + k * 0.5, 0.5 + k * 0.7, `rgba(247,251,255,${0.95 - k * 0.6})`, INK, 0.12);
  }
  // A rope handle at angle a on the rim: a loop standing proud of it.
  const handle = (a) => {
    const x = Math.cos(a) * (RX + 0.2), y = Math.sin(a) * RY;
    c.save();
    c.translate(x, y);
    c.rotate(Math.atan2(Math.sin(a) * RY, Math.cos(a) * RX));
    c.beginPath();
    c.ellipse(0.6, 0, 1.3, 0.75, 0, 0, TAU);
    pen(c, INK, 0.75);
    c.stroke();
    pen(c, GOLD, 0.36);
    c.stroke();
    c.restore();
  };
  c.save();
  c.translate(cx, cy);
  c.rotate(tilt);
  // The handles on the far side of the rim go behind the dish.
  for (const a of [spin, spin + Math.PI]) if (Math.sin(a) < 0) handle(a);
  // The disc's thickness, in shade under the rim.
  ell(c, 0, 1.1, RX, RY, LIFT_DK, INK, LW);
  // The flat rim, then the dish sunk inside it: its far wall in shadow, its floor
  // lit, a little powder caught in the bottom.
  piece(c, (p) => p.ellipse(0, 0, RX, RY, 0, 0, TAU), LIFT, (p) => {
    ell(p, 0.2, 0.3, RX * 0.74, RY * 0.7, LIFT_DK, INK, LWF);
    ell(p, 0.2, 0.95, RX * 0.68, RY * 0.52, LIFT);
    hatch(p, -RX, -RY, RX, RY * 0.2, '#8f2a20', 1.1, 0.2, 17);
    ell(p, 0.2, 0.95, RX * 0.6, RY * 0.4, LIFT);
    ell(p, 1.6, 1.4, 2.0, 0.65, SNOW, INK, 0.12);
    // The sheen on the near rim, going round with the spin.
    const a = spin;
    p.beginPath();
    p.ellipse(0, 0, RX - 0.5, RY - 0.4, 0, Math.PI * 0.15 + a * 0.25, Math.PI * 0.55 + a * 0.25);
    pen(p, LIFT_LT, 0.55);
    p.stroke();
  }, { lw: LW, shadow: false });
  for (const a of [spin, spin + Math.PI]) if (Math.sin(a) >= 0) handle(a);
  c.restore();
  // Two speed strokes behind it.
  for (let i = 0; i < 2; i++) {
    const k = ((f + i * 4) % 8) / 8;
    const y = 3.4 + i * 5.6;
    line(c, 19.4 + k * 1.4, y, 21.6 + k * 1.4, y, 'rgba(38,52,77,0.55)', 0.3);
  }
}

// I — CURLING STONE gliding in over the ice, red handle up, turning slowly (roll 16x13)
function curlingStone(c, w, h, t) {
  const f = frameOf(t, 16, 8), g = h - 0.2;
  // The curl: the stone turns over the ring — the flecks go round and the handle
  // swings — because a stone that is not turning is not curling.
  const turn = (f / 16) * TAU;
  const TOP = g - 7.6;
  // Its reflection in the ice, and the shavings off the running band.
  ell(c, 8.0, g - 0.1, 7.2, 0.7, 'rgba(255,255,255,0.55)');
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 5) % 16) / 16;
    circ(c, 1.6 - k * 1.6, g - 0.6 - k * 1.8 + i * 0.3, 0.34 + k * 0.2, ICE_LT, INK, 0.1);
  }
  // The body: a squat polished granite round — domed top, the widest part a dark
  // striking band, rounding under to the running band.
  const body = (p) => {
    p.moveTo(4.0, g);
    p.quadraticCurveTo(0.2, g - 0.2, 0.3, g - 3.4);
    p.quadraticCurveTo(0.4, TOP + 0.8, 4.6, TOP);
    p.quadraticCurveTo(8.0, TOP - 0.7, 11.4, TOP);
    p.quadraticCurveTo(15.6, TOP + 0.8, 15.7, g - 3.4);
    p.quadraticCurveTo(15.8, g - 0.2, 12.0, g);
    p.closePath();
  };
  piece(c, body, GRANITE, (p) => {
    box(p, 0, g - 4.4, 16, 1.6, GRANITE_DK);
    box(p, 0, g - 1.2, 16, 1.4, GRANITE_DK);
    hatch(p, 12.0, TOP, 16, g, '#69727f', 0.9, 0.22, 23);
    p.beginPath();
    p.moveTo(2.4, TOP + 1.4);
    p.quadraticCurveTo(5.0, TOP + 0.2, 9.0, TOP + 0.4);
    pen(p, GRANITE_LT, 0.8);
    p.stroke();
    // A few flecks in the granite, turning with the stone.
    for (let i = 0; i < 6; i++) {
      const a = turn + i * 2.4;
      circ(p, 8 + Math.cos(a) * (2.6 + (i % 3) * 2.0), TOP + 2.4 + (i % 3) * 1.4, 0.2, i % 2 ? '#6d7684' : '#eef1f5');
    }
  });
  // The handle: a red gooseneck on its bolt, swung round by the curl — a few
  // degrees either way, so it is never seen end-on and the red never goes.
  const reach = 3.8 * Math.cos(0.55 * Math.sin(turn));
  const dir = 1;
  const hx = 8.0, hy = TOP - 2.6;
  ell(c, hx, TOP - 0.2, 2.0, 0.55, '#3d4452', INK, LWF);
  box(c, hx - 0.7, hy, 1.4, TOP - hy, RED_DK, INK, LWF);
  c.beginPath();
  c.moveTo(hx + 0.4 * dir, hy + 0.3);
  c.lineTo(hx - reach, hy);
  c.quadraticCurveTo(hx - reach - 1.1 * dir, hy + 0.2, hx - reach - 0.9 * dir, hy + 1.8);
  pen(c, INK, 2.0);
  c.stroke();
  pen(c, RED, 1.3);
  c.stroke();
  c.beginPath();
  c.moveTo(hx, hy - 0.25);
  c.lineTo(hx - reach * 0.9, hy - 0.35);
  pen(c, RED_LT, 0.32);
  c.stroke();
  // Speed strokes on the ice behind it.
  for (let i = 0; i < 2; i++) {
    const k = ((f + i * 8) % 16) / 16;
    line(c, 15.0 + k * 0.6, g - 1.6 - i * 2.4, 16.0, g - 1.6 - i * 2.4, 'rgba(38,52,77,0.5)', 0.3);
  }
}

// J — SNOW FENCE: a run of red lath snow fence on two stakes, drifted up on the
// windward side (hurdle 21x12)
function snowFence(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 0.2;
  // The split feet are box x 2 and 14; the box sits 2.5 in from the envelope.
  const P0 = 4.5, P1 = 16.5;
  const TOPW = 2.6, BOTW = 7.6; // the two runs of twisted wire
  // The drift banked against the far (windward) side, behind the laths.
  c.beginPath();
  c.moveTo(P0 + 1, g);
  c.quadraticCurveTo(10.5, g - 6.6, P1 + 4.0, g);
  c.closePath();
  fillStroke(c, SNOW_SH, INK, LWF);
  // The laths: thin, uneven, painted red, the paint worn off some tops.
  for (let i = 0; i < 9; i++) {
    const x = P0 + 0.5 + i * 1.32;
    const top = 2.6 + jit(3, i) * 1.2;
    piece(c, (p) => {
      p.moveTo(x, g);
      p.lineTo(x, top + 0.5);
      p.lineTo(x + 0.45, top);
      p.lineTo(x + 0.9, top + 0.5);
      p.lineTo(x + 0.9, g);
      p.closePath();
    }, i % 3 === 1 ? LATH_DK : LATH, (p) => {
      box(p, x, top, 0.3, g, LATH_LT);
      if (i % 4 === 2) box(p, x, top, 1, 1.4, '#e9d7c0');
    }, { lw: LWF, shadow: false });
  }
  // The twisted wire binding the laths, run between the stakes.
  for (const y of [TOPW, BOTW]) {
    c.beginPath();
    c.moveTo(P0, y + 0.2);
    c.lineTo(P1, y);
    pen(c, WIRE, 0.42);
    c.stroke();
    c.beginPath();
    for (let x = P0 + 0.4; x < P1; x += 0.9) {
      c.moveTo(x, y - 0.25);
      c.lineTo(x + 0.45, y + 0.35);
    }
    pen(c, '#8e95a4', 0.16);
    c.stroke();
  }
  // The two stakes, taller than the fence, hammered in.
  for (const x of [P0, P1]) {
    piece(c, rect(x - 0.8, 0.6, 1.6, g - 0.6), BARK, (p) => box(p, x + 0.2, 0, 0.6, h, BARK_DK), { lw: LWI });
    snowCap(c, x - 0.7, x + 0.7, 0.9, 0.7, x, 0.3);
  }
  // Snow on the near side, drifted against the foot.
  c.beginPath();
  c.moveTo(0.2, g);
  c.quadraticCurveTo(3.4, g - 2.0, 9.0, g);
  c.closePath();
  fillStroke(c, SNOW, INK, LWF);
  // Spindrift blowing through the gaps toward the hero.
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 3) % 8) / 8;
    const y = 4.0 + i * 2.0;
    const x = P0 + 6 - k * 9;
    line(c, x, y, x + 1.4, y, 'rgba(247,251,255,0.95)', 0.42);
    line(c, x, y + 0.3, x + 1.4, y + 0.3, 'rgba(38,52,77,0.25)', 0.16);
  }
}

// ============================================================== the bake-off
export const BAKEOFF = {
  cabinet: 'frost',
  title: 'FROST FORTRESS — obstacles for the snow (bake-off)',
  note: 'Frost’s own four fit — the snowman, the ice crystals, the bear trap and the frozen switch were drawn for it. '
    + 'Everything else is borrowed: the wooden crate, the rolling barrel, the purple rotor drone and the orange songbird '
    + 'come straight through BASE_PATTERNS, the pop spikes are grey machine cones over a hazard stripe, and the campfire '
    + 'is already in the backdrop, where frost-3’s wolves sit round one. Ten cold-world objects in Frost’s cut paper: '
    + 'a replacement for each misfit (two for the stack and the floor), then a glider and a hurdle the snow has never had. '
    + 'Pick letters.',
  // One strip of the real frame per entry; stageIndex and camX pick the scenery.
  // Day, the low sun, and dusk: the three lights a hazard has to stand off.
  strips: [
    { label: 'FROST FORTRESS 1 · DAY', stageIndex: 1, camX: 600 },
    { label: 'FROST FORTRESS 2 · LOW SUN', stageIndex: 2, camX: 1400 },
    { label: 'FROST FORTRESS 3 · DUSK', stageIndex: 3, camX: 2200 },
  ],
  // The detail row's panels: what is behind a lane hazard (the near hills, not
  // the sky — sampled off the real frame), the road, and what is under it.
  swatches: [
    { sky: '#84a3bf', ground: '#cae1ef', under: '#9dbbd9' },
    { sky: '#7d99bf', ground: '#c3d8ea', under: '#92aecd' },
    { sky: '#59668b', ground: '#9fadca', under: '#7382a5' },
  ],
  // What the cabinet deals today, through the real run painter: [type, x].
  control: [['snowman', 4], ['bearTrap', 24], ['crate', 78], ['snowmanBig', 96], ['iceCrystals', 120], ['switch', 120],
    ['drone', 142], ['barrel', 160], ['campfire', 182], ['buzzbird', 186], ['popSpikes', 208]],
  candidates: [
    { letter: 'A', id: 'iceBlocks', name: 'ICE BLOCKS', slot: 'stack', paint: iceBlock,
      note: 'Blocks of lake ice cut with a saw — striations, bubbles rising in trails, a crack, frost on the top edge. '
        + 'The crate, in the cabinet’s own material; shatters like the crystals. Shown single and two high.' },
    { letter: 'B', id: 'parcels', name: 'SLEIGH PARCELS', slot: 'stack', paint: parcel,
      note: 'The presents that fell off frost-3’s sleigh: red paper printed with snowflakes, a gold ribbon and bow, '
        + 'a tag turning in the wind. Red = AVOID for free. The risk: a present can read as a prize.' },
    { letter: 'C', id: 'giantSnowball', name: 'GIANT SNOWBALL', slot: 'barrel', paint: giantSnowball,
      note: 'Rolls at you with what it picked up — pine needles, and a red scarf wound in with its fringed end '
        + 'flapping out. The one roller whose spin is RIGHT: the run already turns the barrel’s raster, so the port is one still frame.' },
    { letter: 'D', id: 'crampons', name: 'CRAMPONS', slot: 'floor', paint: crampons,
      note: 'A dropped pair lying points-up, front points raking at the hero, a red strap tangled over the frame and '
        + 'a glint running along the points. Frost’s spike plate, with a reason to be on a mountain.' },
    { letter: 'E', id: 'caltrops', name: 'CALTROPS', slot: 'floor', paint: caltrops,
      note: 'The fortress’s own floor hazard: four iron caltrops strewn across the road, rusted red, one point always '
        + 'up, rime on the shoulders, frost glinting off the tips in turn. Spikes with a reason to be outside a keep.' },
    { letter: 'F', id: 'unpluggedHeater', name: 'THE HEATING', slot: 'campfire', paint: unpluggedHeater,
      note: 'The taunt’s punchline — I UNPLUGGED THE HEATING TOO: a red oil-filled radiator out in the snow, frozen, '
        + 'icicles off its fins, the dial on the snowflake, its plug face down in a drift. The cold one, where the fire was.' },
    { letter: 'G', id: 'iceBolt', name: 'ICE BOLT', slot: 'low', paint: iceBolt,
      note: 'A crossbow quarrel loosed from the fortress walls: a long head of faceted ice, red flights spinning on '
        + 'the shaft, rime streaming behind. At head height, pointed at you — slide under. Replaces the rotor drone.' },
    { letter: 'H', id: 'snowSaucer', name: 'SNOW SAUCER', slot: 'high', paint: snowSaucer,
      note: 'A red plastic sledging dish flung off a slope, spinning and wobbling in over the jump, rope handles going '
        + 'round, powder off its rim. Replaces the songbird: not an animal, and red on every sky.' },
    { letter: 'I', id: 'curlingStone', name: 'CURLING STONE', slot: 'roll', paint: curlingStone,
      note: 'The ice mechanic’s own heavy: polished granite, red gooseneck handle, gliding in UPRIGHT and curling as '
        + 'it comes, shavings off the running band. NEW to frost — the chair’s ROLL slot (12x10, vx −34), with an upright glide.' },
    { letter: 'J', id: 'snowFence', name: 'SNOW FENCE', slot: 'hurdle', paint: snowFence,
      note: 'A run of red lath fence wired between two stakes, drifted up on the far side, spindrift blowing through. '
        + 'Gives back the short hurdle the ski gate took with it — in the snow’s own hand.' },
  ],
};

export { frameOf };
