// PLUMBER lane obstacles picked from the 12 Oct 2026 bake-off (15 Oct 2026; see
// src/dev/plumber-obstacle-candidates.js for the sheet and the ones not picked). Moved here
// verbatim from the candidate module, which now imports its palette and helpers back.
// Every painter is authored in its PAINTED ENVELOPE in world units — box x 4/3 x
// PROP_TALL x PROP_VISUAL_SCALE — with the ground at y = h, on a clock `t` it quantises
// to its own ring; the registry below hands it frame/fps and scales the envelope onto
// the raster props.js gives it. Like officeProps.js, nothing here imports props.js.

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
const INK = '#2a1a16';
const LW = 0.55; // outline
const LWI = 0.34; // interior line
const LWF = 0.2; // fine line
const RED = '#d8352a', RED_DK = '#9c2219', RED_LT = '#f4705c';
const STRAW = '#dcae48', STRAW_DK = '#b0822a', STRAW_LT = '#f4d784', STRAW_INK = '#8a5e1c';
const HONEY = '#ffd23a', HONEY_DK = '#d9a514';
const CREAM = '#f6f0e0', CREAM_DK = '#d4c8ae';
const TIMBER = '#a8743f', TIMBER_DK = '#6e4824', TIMBER_LT = '#c99a5e';
const STEEL = '#b4bec4', STEEL_DK = '#7d878e', STEEL_LT = '#e6ecef';
const DENIM = '#3f63a8', DENIM_DK = '#2c4680', DENIM_LT = '#6f8fce';
const SACK = '#d9b77a', SACK_DK = '#b08e52';
const FELT = '#6b4a2e', FELT_DK = '#4a321e';
const CHAR = '#3a3634', CHAR_DK = '#262220';
const SOIL = '#6b4426'; // cabinets.js plumber.soil
const SKYBLUE = '#3f8fd8';
const ORANGE = '#ff8a2a', LEMON = '#ffe25a';
const SMOKE = '#a49d98', SMOKE_LT = '#d8d2cc';
const LEAF_RUST = '#c0642a';
const WHITE = '#ffffff';

// ------------------------------------------------------------------ helpers
function pen(c, ink, lw) {
  c.strokeStyle = ink;
  c.lineWidth = lw;
  c.lineJoin = 'round';
  c.lineCap = 'round';
}
function fs(c, fill, ink, lw) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink && lw > 0) { pen(c, ink, lw); c.stroke(); }
}
function box(c, x, y, w, h, fill, ink, lw) { c.beginPath(); c.rect(x, y, w, h); fs(c, fill, ink, lw); }
function poly(c, pts, fill, ink, lw, close = true) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  if (close) c.closePath();
  fs(c, fill, ink, lw);
}
function line(c, x0, y0, x1, y1, ink, lw) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); pen(c, ink, lw); c.stroke(); }
function lines(c, segs, ink, lw) {
  c.beginPath();
  for (let i = 0; i < segs.length; i += 4) { c.moveTo(segs[i], segs[i + 1]); c.lineTo(segs[i + 2], segs[i + 3]); }
  pen(c, ink, lw);
  c.stroke();
}
function circ(c, x, y, r, fill, ink, lw) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); fs(c, fill, ink, lw); }
function ell(c, x, y, rx, ry, fill, ink, lw, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  fs(c, fill, ink, lw);
}
function rrPath(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function rbox(c, x, y, w, h, r, fill, ink, lw) { c.beginPath(); rrPath(c, x, y, w, h, r); fs(c, fill, ink, lw); }

// A flat body: fill the path, lay its light and shade bands clipped inside it,
// then ink the outline over both — the one move every object on this sheet makes.
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
const rect = (x, y, w, h) => (p) => p.rect(x, y, w, h);
const shape = (pts) => (p) => {
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  p.closePath();
};

// A honeybee side-on, `dir` -1 facing left: striped body, dark head, a wing
// that is up or down on alternate frames — the buzz, at the run's frame rate.
function bee(c, x, y, dir, s, wingUp) {
  c.save();
  c.translate(x, y);
  c.scale(dir * s, s);
  ell(c, 0.25, wingUp ? -0.95 : -0.55, 0.62, wingUp ? 0.5 : 0.36, 'rgba(255,255,255,0.9)', INK, LWF, wingUp ? 0.5 : 0.15);
  ell(c, 0, 0, 1.15, 0.78, HONEY, INK, LWF * 1.4);
  c.save();
  c.beginPath();
  c.ellipse(0, 0, 1.15, 0.78, 0, 0, TAU);
  c.clip();
  box(c, -0.18, -1, 0.42, 2, INK);
  box(c, 0.55, -1, 0.34, 2, INK);
  c.restore();
  circ(c, -1.1, -0.05, 0.5, INK);
  c.restore();
}

// Flat-shape flames: outlined red tongues, then orange and lemon cores with no ink.
function flames(c, cx, base, f, n, scale) {
  const p = (f / n) * TAU;
  const tongue = (x, w, hgt, ph, fill, ink) => {
    const tip = cx + (x + Math.sin(p * 2 + ph) * 1.1) * scale;
    const hh = hgt * scale * (0.82 + 0.18 * Math.sin(p * 3 + ph * 1.7));
    const x0 = cx + (x - w) * scale, x1 = cx + (x + w) * scale;
    c.beginPath();
    c.moveTo(x0, base);
    c.quadraticCurveTo(x0 + w * 0.15 * scale, base - hh * 0.62, tip, base - hh);
    c.quadraticCurveTo(x1 - w * 0.15 * scale, base - hh * 0.62, x1, base);
    c.closePath();
    fs(c, fill, ink, ink ? LWI : 0);
  };
  tongue(-3.2, 2.4, 7.4, 0.0, RED, INK);
  tongue(3.0, 2.4, 8.2, 1.3, RED, INK);
  tongue(0, 3.3, 12.0, 2.4, RED, INK);
  tongue(-2.0, 1.7, 5.0, 0.8, ORANGE);
  tongue(1.8, 1.8, 6.2, 2.0, ORANGE);
  tongue(-0.1, 2.2, 8.4, 3.1, ORANGE);
  tongue(0.1, 1.3, 4.6, 1.7, LEMON);
}

// A puff of smoke: an outlined lumpy cloud, three circles under one ink.
function puff(c, x, y, r, fill = SMOKE) {
  c.beginPath();
  c.arc(x - r * 0.55, y + r * 0.15, r * 0.7, 0, TAU);
  c.arc(x + r * 0.5, y + r * 0.2, r * 0.62, 0, TAU);
  c.arc(x, y - r * 0.25, r * 0.8, 0, TAU);
  pen(c, INK, LWF * 1.3);
  c.stroke();
  c.fillStyle = fill;
  c.fill();
}

// ================================================================ painters
// All in world units inside the envelope, ground at y = h.

// A — BEEHIVE, a white cottage-garden hive with a red roof (stand 17x25)

function beehive(c, w, h, t) {
  const f = frameOf(t, 8, 10), g = h - 0.3;
  // Five bees on one loop round the hive's waist, a fifth of the loop apart, so
  // the ring repeats; the back of the loop passes behind the hive.
  const BEES = 5;
  const bees = [];
  for (let k = 0; k < BEES; k++) {
    const a = (f / 8) * (TAU / BEES) + (k / BEES) * TAU;
    bees.push({ x: 8.5 + Math.cos(a) * 8.0, y: 11.6 + Math.sin(a) * 3.4 - Math.cos(a * 2) * 0.6, dir: Math.sin(a) > 0 ? 1 : -1, back: Math.sin(a) < -0.35, k });
  }
  for (const b of bees) if (b.back) bee(c, b.x, b.y, b.dir, 1.05, (f + b.k) % 2 === 0);
  // The stand: two legs and a plinth board.
  box(c, 4.4, g - 2.8, 1.4, 2.8, TIMBER_DK, INK, LWI);
  box(c, 11.2, g - 2.8, 1.4, 2.8, TIMBER_DK, INK, LWI);
  body(c, rect(2.6, g - 3.8, 11.8, 1.2), TIMBER, (p) => box(p, 2.6, g - 3.0, 11.8, 0.4, TIMBER_DK));
  // Three lifts, each flared at its foot the way a cottage hive's are.
  const LIFTS = [[g - 9.6, g - 3.8], [g - 14.8, g - 9.6], [g - 19.4, g - 14.8]];
  for (const [y0, y1] of LIFTS) {
    body(c, shape([4.0, y0, 13.0, y0, 13.0, y1 - 1.4, 13.9, y1, 3.1, y1, 4.0, y1 - 1.4]), CREAM, (p) => {
      box(p, 11.2, 0, 4, h, CREAM_DK);
      box(p, 4.6, y0 + 0.5, 0.8, y1 - y0 - 2.2, WHITE);
      box(p, 0, y1 - 1.4, 17, 0.5, CREAM_DK);
    });
  }
  // The entrance and its landing board, a bee on the step.
  box(c, 5.2, g - 5.2, 6.6, 0.9, CHAR_DK, INK, LWF);
  poly(c, [4.0, g - 4.3, 13.0, g - 4.3, 13.0, g - 3.8, 2.6, g - 3.8], TIMBER_LT, INK, LWF);
  bee(c, 6.2 + (f % 4) * 0.5, g - 5.0, -1, 0.7, f % 2 === 0);
  // The roof: red, its right slope in shade, a little vent under the ridge.
  body(c, shape([1.4, g - 18.8, 8.5, g - 24.2, 15.6, g - 18.8, 15.6, g - 18.0, 1.4, g - 18.0]), RED, (p) => {
    poly(p, [8.5, g - 25, 16, g - 19.4, 16, g - 17.6, 8.5, g - 17.6], RED_DK);
    line(p, 2.6, g - 18.9, 8.2, g - 23.2, RED_LT, 0.5);
  });
  poly(c, [7.4, g - 19.6, 8.5, g - 20.6, 9.6, g - 19.6], CHAR_DK, INK, LWF);
  for (const b of bees) if (!b.back) bee(c, b.x, b.y, b.dir, 1.05, (f + b.k) % 2 === 0);
}


// B — SCARECROW in a red check shirt, sleeves flapping (big 23x26)
function scarecrow(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 0.2;
  const p8 = (f / 8) * TAU;
  const flapL = Math.sin(p8) * 0.7, flapR = Math.sin(p8 + 2.2) * 0.7;
  // The soil the post is driven into, and the post.
  ell(c, 11.5, g - 0.3, 3.6, 0.7, SOIL, INK, LWF);
  body(c, rect(10.8, 3.0, 1.6, g - 3.2), TIMBER, (p) => box(p, 11.8, 0, 1, h, TIMBER_DK));
  // Trousers on the post: denim, one patched knee, straw out of both cuffs.
  const strawTuft = (x, y, dir, n, ph) => {
    const segs = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.32 + Math.sin(p8 + ph + i) * 0.12;
      segs.push(x + (i - (n - 1) / 2) * 0.5, y, x + (i - (n - 1) / 2) * 0.5 + Math.cos(a) * 1.6 * dir, y + Math.sin(a) * 1.6);
    }
    lines(c, segs, STRAW_INK, 0.62);
    lines(c, segs, STRAW, 0.36);
  };
  strawTuft(9.4, 22.6, 1, 4, 0);
  strawTuft(13.8, 22.6, 1, 4, 1.4);
  body(c, shape([7.6, 15.2, 15.6, 15.2, 15.6, 22.8, 12.4, 22.8, 11.7, 18.2, 10.9, 22.8, 7.6, 22.8]), DENIM, (p) => {
    box(p, 13.8, 14, 3, 10, DENIM_DK);
    box(p, 8.2, 16.0, 0.7, 6, DENIM_LT);
  });
  box(c, 8.4, 19.0, 2.0, 1.9, RED, INK, LWF);
  // The shirt: torso and both sleeves along the crossbar, flapping at the ends.
  const shirt = (p) => {
    p.moveTo(7.2, 16.0);
    p.lineTo(7.4, 10.8);
    p.lineTo(2.2, 10.6 + flapL);
    p.lineTo(1.6, 7.4 + flapL);
    p.lineTo(8.0, 7.2);
    p.lineTo(15.0, 7.2);
    p.lineTo(21.4, 7.4 + flapR);
    p.lineTo(20.8, 10.6 + flapR);
    p.lineTo(15.6, 10.8);
    p.lineTo(15.8, 16.0);
    p.closePath();
  };
  body(c, shirt, RED, (p) => {
    // The check, as two crossing sets of darker bars.
    p.beginPath();
    for (let x = 0; x < 23; x += 1.9) p.rect(x, 0, 0.55, h);
    for (let y = 6; y < 17; y += 1.9) p.rect(0, y, 23, 0.55);
    p.fillStyle = RED_DK;
    p.fill();
    box(p, 14.2, 10.6, 3, 6, 'rgba(90,16,12,0.35)');
    box(p, 0, 7.2, 23, 0.6, RED_LT);
  });
  // Straw out of the sleeve ends and the collar.
  const cuff = (x, y, dir, ph) => {
    const segs = [];
    for (let i = 0; i < 4; i++) {
      const yy = y + i * 0.8;
      const reach = 1.4 + ((i + f + ph) % 3) * 0.35;
      segs.push(x, yy, x + reach * dir, yy + (i - 1.5) * 0.35);
    }
    lines(c, segs, STRAW_INK, 0.62);
    lines(c, segs, STRAW, 0.36);
  };
  cuff(1.9, 7.8 + flapL, -1, 0);
  cuff(21.1, 7.8 + flapR, 1, 1);
  // The rope belt.
  line(c, 7.4, 15.6, 15.7, 15.6, STRAW_DK, 0.8);
  // The head: a sack tied at the neck, a stitched face.
  lines(c, [10.0, 7.6, 9.4, 8.8, 11.5, 7.6, 11.5, 9.0, 13.0, 7.6, 13.6, 8.8], STRAW_INK, 0.55);
  body(c, (p) => p.ellipse(11.6, 4.6, 3.0, 2.9, 0, 0, TAU), SACK, (p) => {
    box(p, 12.8, 0, 3, 8, SACK_DK);
  });
  line(c, 10.0, 7.1, 13.2, 7.1, STRAW_DK, 0.55);
  lines(c, [9.9, 3.9, 10.9, 4.9, 10.9, 3.9, 9.9, 4.9, 12.3, 3.9, 13.3, 4.9, 13.3, 3.9, 12.3, 4.9], INK, 0.32);
  c.beginPath();
  c.moveTo(9.9, 5.9);
  c.quadraticCurveTo(11.6, 6.9, 13.3, 5.9);
  pen(c, INK, 0.3);
  c.stroke();
  lines(c, [10.5, 5.8, 10.5, 6.6, 11.6, 6.0, 11.6, 6.9, 12.7, 5.8, 12.7, 6.6], INK, 0.18);
  // The hat, tipped to one side and lifting on the gust.
  c.save();
  const tip = -0.12 + (f >= 2 && f <= 4 ? -0.08 : 0);
  c.translate(11.6, 2.4);
  c.rotate(tip);
  poly(c, [-4.6, 0.3, 4.6, 0.3, 4.2, -0.6, -4.4, -0.6], FELT, INK, LWI);
  body(c, shape([-2.6, -0.4, -2.2, -2.4, 0, -2.0, 2.0, -2.5, 2.6, -0.4]), FELT, (p) => box(p, 1.0, -3, 2, 3, FELT_DK), INK, LWI);
  box(c, -2.5, -1.0, 5.0, 0.6, SKYBLUE);
  c.restore();
  // A straw blown off downwind, toward the hero.
  const k = f / 8;
  c.save();
  c.translate(3.6 - k * 3.2, 13.0 + Math.sin(k * TAU) * 0.8);
  c.rotate(k * 4);
  line(c, -0.8, 0, 0.8, 0, STRAW_INK, 0.55);
  line(c, -0.8, 0, 0.8, 0, STRAW, 0.3);
  c.restore();
}


// C — HAY BALES, square, red twine, the crate as the field stacks it (stack 16x15).
// FLAT and front-on like everything else in the lane (Peter, 15 Oct 2026: "they should
// be flat"): the long side only — no top, no cut end receding behind it.
function hayBale(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 0.2;
  const TOP = 2.2, X0 = 0.8, X1 = 15.2;
  // A bale is pressed straw, not a box: every edge is ragged, so the outline
  // wanders a fraction either side of the line and straw ends stick out of it.
  // Without that, gold with two red bands reads as a wrapped present.
  const ragged = (x0, y0, x1, y1, n, amp, seed) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, j = Math.sin(seed + i * 2.7) * amp * (i && i < n ? 1 : 0);
      pts.push(x0 + (x1 - x0) * u + (y1 - y0 ? j : 0), y0 + (y1 - y0) * u + (x1 - x0 ? j : 0));
    }
    return pts;
  };
  const FRONT = [
    ...ragged(X0, TOP, X1, TOP, 8, 0.25, 1), ...ragged(X1, TOP, X1, g, 6, 0.25, 2).slice(2),
    ...ragged(X1, g, X0, g, 6, 0.0, 3).slice(2), ...ragged(X0, g, X0, TOP, 6, 0.3, 4).slice(2, -2),
  ];
  // The flakes it was pressed in, a lit band along the top, a shade band at the foot.
  body(c, shape(FRONT), STRAW, (p) => {
    box(p, 0, TOP, 16, 1.4, STRAW_LT);
    box(p, 0, g - 1.9, 16, 2, STRAW_DK);
    lines(p, [5.2, TOP, 5.0, g, 10.4, TOP, 10.7, g], STRAW_DK, 0.4);
    p.beginPath();
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 7; i++) {
        const x = 1.6 + i * 1.95 + (row % 2) * 0.9, y = TOP + 2.2 + row * 2.4 + (i % 2) * 0.4;
        p.moveTo(x, y); p.lineTo(x + 1.2, y + (i % 3 - 1) * 0.35);
      }
    }
    pen(p, STRAW_INK, 0.28);
    p.stroke();
  });
  // Straw ends poking out of both ends and along the foot.
  lines(c, [0.9, 5.2, -0.4, 4.7, 0.9, 8.6, -0.3, 9.0, 0.9, 11.8, -0.2, 11.4,
    15.1, 6.0, 16.3, 5.6, 15.1, 10.4, 16.2, 10.8,
    3.2, g, 2.6, g + 0.6, 12.4, g, 13.2, g + 0.6], STRAW_INK, 0.36);
  // Two strands of baler twine: thin cord, not ribbon.
  for (const x of [4.0, 12.0]) {
    lines(c, [x, TOP + 0.1, x + 0.1, g - 0.1], RED_DK, 0.8);
    lines(c, [x, TOP + 0.1, x + 0.1, g - 0.1], RED, 0.42);
  }
  // Stray straws off the top, stirring.
  const STRAYS = [[2.4, TOP, -0.9], [6.8, TOP, -0.3], [10.6, TOP, 0.5], [14.0, TOP, 0.9]];
  STRAYS.forEach(([x, y, lean], i) => {
    const a = -Math.PI / 2 + lean + Math.sin((f / 8) * TAU + i * 2.1) * 0.3;
    line(c, x, y, x + Math.cos(a) * 1.9, y + Math.sin(a) * 1.9, STRAW_INK, 0.55);
    line(c, x, y, x + Math.cos(a) * 1.9, y + Math.sin(a) * 1.9, STRAW_LT, 0.3);
  });
  // And a bit of chaff blowing off the near end.
  const k = f / 8;
  line(c, 0.8 - k * 0.6, 5.0 - k * 3.4, 1.8 - k * 0.6, 4.6 - k * 3.4, STRAW_INK, 0.42);
}

// In place of the rotor drone AND the songbird since 16 Oct 2026 (Peter: "replace birds and
// drones in field service with bees"): one swarm at both heights.
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

// The candidate sheet (src/dev) paints the rest of its line-up with these.
export {
  beeSwarm, TAU, INK, LW, LWI, LWF, RED, RED_DK, RED_LT, STRAW, STRAW_DK, STRAW_LT, STRAW_INK, HONEY, HONEY_DK, CREAM, CREAM_DK, TIMBER, TIMBER_DK, TIMBER_LT, STEEL, STEEL_DK, STEEL_LT, DENIM, DENIM_DK, DENIM_LT, SACK, SACK_DK, FELT, FELT_DK, CHAR, CHAR_DK, SOIL, SKYBLUE, ORANGE, LEMON, SMOKE, SMOKE_LT, LEAF_RUST, WHITE, pen, fs, box, poly, line, lines, circ, ell, rrPath, rbox, body, rect, shape, bee, flames, puff, beehive, scarecrow, hayBale,
};

// ------------------------------------------------------------------ registry
// type id -> box (the slot's), PROP_TALL, the painter's own frame ring.
export const PLUMBER_PROP_SPECS = {
  beehive: { box: [13, 12], tall: 1.55, frames: 8, fps: 10, paint: beehive },
  scarecrow: { box: [17, 14], tall: 1.4, frames: 8, fps: 8, paint: scarecrow },
  hayBale: { box: [12, 11], frames: 8, fps: 8, paint: hayBale },
  beeSwarm: { box: [12, 7], visual: 1.35, frames: 8, fps: 12, paint: beeSwarm },
  beeSwarmHigh: { box: [12, 7], visual: 1.35, frames: 8, fps: 12, paint: beeSwarm },
};
