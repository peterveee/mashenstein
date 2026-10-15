// FROST lane obstacles picked from the 12 Oct 2026 bake-off (15 Oct 2026; see
// src/dev/frost-obstacle-candidates.js for the sheet and the ones not picked). Moved here
// verbatim from the candidate module, which now imports its palette and helpers back.
// Every painter is authored in its PAINTED ENVELOPE in world units — box x 4/3 x
// PROP_TALL x PROP_VISUAL_SCALE — with the ground at y = h, on a clock `t` it quantises
// to its own ring; the registry below hands it frame/fps and scales the envelope onto
// the raster props.js gives it. Like officeProps.js, nothing here imports props.js.

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;

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
  // FLAT and front-on (Peter, 15 Oct 2026: "they should be flat"): the face only, no
  // top or side going back.
  const X0 = 0.8, X1 = 15.2, TOP = 3.0;
  // The face: clear ice, deeper and bluer toward the foot, the saw's
  // striations across it, bubbles frozen in trails, and one crack.
  piece(c, rect(X0, TOP, X1 - X0, g - TOP), ICE, (p) => {
    box(p, X0, g - 3.4, X1 - X0, 3.4, ICE_MID);
    box(p, X0, g - 1.2, X1 - X0, 1.2, ICE_DK);
    box(p, X0 + 0.6, TOP + 0.8, 0.8, g - TOP - 4.6, ICE_LT);
    for (const y of [TOP + 3.0, TOP + 5.6]) line(p, X0, y, X1, y + 0.3, 'rgba(58,119,170,0.35)', 0.22);
    // Bubble trails: each bubble steps up a little on the ring, the column stays put.
    const TRAILS = [[4.6, 0], [8.8, 3], [12.6, 6]];
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
  // A crust of snow along the top edge.
  snowCap(c, X0 + 0.6, X1 - 0.6, TOP, 1.2, 4, 0.2);
  // The cut catches the light.
  const s = [0, 0, 0, 0.6, 1.4, 1.0, 0.4, 0, 0, 0, 0, 0][f];
  glint(c, X0 + 1.2, TOP + 0.6, s);
}


// B — PARCELS: the presents that fell off the sleigh (stack 16x15)
function parcel(c, w, h, t) {
  // FLAT and front-on (Peter, 15 Oct 2026: "they should be flat"): box and lid seen
  // square-on, the bow standing up off the lid's top edge.
  const f = frameOf(t, 8, 6), g = h - 0.2;
  const X0 = 1.2, X1 = 14.8, BTOP = 7.0;
  const LTOP = 4.8, LX0 = 0.6, LX1 = 15.4;
  const RX = 7.1, RW = 1.8; // the ribbon
  const sw = Math.sin((f / 8) * TAU);
  // The box: red paper printed with snowflakes, a gold ribbon down the middle.
  piece(c, rect(X0, BTOP, X1 - X0, g - BTOP), RED, (p) => {
    box(p, X0, g - 1.4, X1 - X0, 1.4, RED_DK);
    box(p, X0 + 0.6, BTOP + 0.6, 0.8, g - BTOP - 2.4, RED_LT);
    for (const [sx, sy] of [[3.2, 9.4], [12.0, 9.2], [4.0, 12.6], [11.2, 12.8]]) {
      p.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI;
        p.moveTo(sx - Math.cos(a) * 0.7, sy - Math.sin(a) * 0.7);
        p.lineTo(sx + Math.cos(a) * 0.7, sy + Math.sin(a) * 0.7);
      }
      pen(p, '#ffe8e4', 0.2);
      p.stroke();
    }
    box(p, RX, 0, RW, h, GOLD);
    box(p, RX, 0, 0.5, h, GOLD_LT);
  });
  // The lid, proud of the box both sides.
  piece(c, rect(LX0, LTOP, LX1 - LX0, 2.4), RED, (p) => {
    box(p, LX0, LTOP, LX1 - LX0, 0.6, RED_LT);
    box(p, LX0, LTOP + 1.6, LX1 - LX0, 0.8, RED_DK);
    box(p, RX - 0.1, 0, RW + 0.2, h, GOLD);
  }, { lw: LWI });
  // A dusting of snow on the lid where it fell.
  ell(c, 3.6, LTOP - 0.2, 1.9, 0.45, SNOW, INK, LWF);
  ell(c, 12.6, LTOP - 0.2, 1.5, 0.4, SNOW, INK, LWF);
  // The bow: two loops and two tails standing on the lid.
  const bx = RX + RW / 2, by = LTOP - 0.4;
  ell(c, bx - 2.0, by - 1.3, 2.0, 1.15, GOLD, INK, LWI, -0.45);
  ell(c, bx + 2.0, by - 1.3, 2.0, 1.15, GOLD, INK, LWI, 0.45);
  ell(c, bx - 2.2, by - 1.4, 0.8, 0.4, GOLD_DK, null, 0, -0.45);
  ell(c, bx + 2.2, by - 1.4, 0.8, 0.4, GOLD_DK, null, 0, 0.45);
  circ(c, bx, by - 0.6, 0.85, GOLD, INK, LWI);
  // The gift tag on its string, turning in the wind.
  c.beginPath();
  c.moveTo(bx - 0.6, by - 0.2);
  c.quadraticCurveTo(bx - 3.4, by + 1.8, 3.6 + sw * 0.5, LTOP + 3.6);
  pen(c, INK, 0.16);
  c.stroke();
  c.save();
  c.translate(3.6 + sw * 0.5, LTOP + 3.6);
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

// The candidate sheet (src/dev) paints the rest of its line-up with these.
export {
  TAU, HAND, INK, LW, LWI, LWF, PAPER_SHADOW, SNOW, SNOW_SH, SNOW_DK, ICE, ICE_LT, ICE_MID, ICE_DK, ICE_DEEP, RED, RED_DK, RED_LT, LIFT, LIFT_DK, LIFT_LT, GOLD, GOLD_DK, GOLD_LT, BARK, BARK_DK, STEEL, STEEL_DK, STEEL_LT, GRANITE, GRANITE_DK, GRANITE_LT, LATH, LATH_DK, LATH_LT, WIRE, IRON, IRON_DK, IRON_LT, PINE_NEEDLE, jit, pen, line, fillStroke, box, circ, ell, poly, rect, shape, rrPath, rr, piece, hatch, glint, icicle, snowCap, iceBlock, parcel, giantSnowball, crampons, caltrops,
};

// ------------------------------------------------------------------ registry
// type id -> box (the slot's), PROP_TALL, the painter's own frame ring.
export const FROST_PROP_SPECS = {
  iceBlocks: { box: [12, 11], frames: 12, fps: 8, paint: iceBlock },
  parcels: { box: [12, 11], frames: 8, fps: 6, paint: parcel },
  giantSnowball: { box: [13, 13], frames: 8, fps: 8, paint: giantSnowball },
  crampons: { box: [15, 7], tall: 1.75, frames: 9, fps: 9, paint: crampons },
  caltrops: { box: [15, 7], tall: 1.75, frames: 9, fps: 9, paint: caltrops },
};
