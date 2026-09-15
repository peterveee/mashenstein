// Gallery-only COUNTRYSIDE HAZARD concepts — what stands in the lane on
// Plumber Panic instead of a saguaro.
//
// THE COMPLAINT. The cactus is not Plumber's prop. It lives in BASE_PATTERNS
// (data/cabinets.js), which every cabinet inherits, and only Frost escapes it —
// ICE_PATTERNS clones the base list and swaps cactus -> snowman so the shared
// spacing, tiers and coins stay the source of truth. Plumber's turf is #3a9c48
// under a sky of cottages, timber fences, flowers and bushes, and a desert
// plant standing in it is the one prop on screen that came from somewhere else.
//
// THE CONSTRAINTS, which are not taste. The shipped painter's own note in
// sprites/props.js states them and they bind every candidate here:
//
//   * 13x12, and a 17x14 big brother (OBSTACLES.cactus / cactusBig).
//   * It STANDS UP. Plumber's ground game is silhouettes you read against the
//     sky; the floor hazards (popSpikes, floorSaw) are the other half of that
//     argument and already shipped. This slot is the standing half.
//   * breakable, action 'jump'. It has to look like a thing that shatters.
//   * NOT GREEN. The guide teaches RED = AVOID, and the turf is a mid green —
//     a green hazard vanishes into the exact ground it spawns on. Every body
//     below is warm, dark or saturated away from #3a9c48 for that one reason.
//
// Each painter fills a local 0..w by 0..h box with the ground line at y = h, so
// the gallery places one by translation exactly as drawWorldEntity would. `t`
// is seconds; every candidate quantises it to the shipped cadence (6 frames at
// 11fps, the cactus's own ring) rather than swaying continuously, so a sway
// that only works at 60fps cannot flatter itself here.
//
// Nothing here is registered in any gameplay registry. Port a winner by copying
// one painter body into sprites/props.js and adding the four small entries the
// prop needs: OBSTACLES def, DEBRIS colours, PROP_FRAMES, and the guide card in
// game/menus.js. Delete this file when the sheet is settled — a settled
// bake-off leaves the gallery.

const TAU = Math.PI * 2;
const FRAMES = 6;
const FPS = 11;

// ------------------------------------------------------------------ palettes
const INK = '#2a1a16';          // warm dark, not the blue-black of the machines
const BONE = '#f4dcc0';         // the pale point every thorn on this sheet uses
const TIMBER = '#8a5a35';
const TIMBER_DARK = '#5b3a22';
const RUST = '#b4482c';
const RUST_DARK = '#7e2c18';
const STEEL = '#c8ccd4';
const SOIL = '#6b4426';         // cabinets.js plumber.soil — the mound colour

// ------------------------------------------------------------------- helpers
function path(c, fill, ink, lw, fn) {
  c.beginPath();
  fn(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink) {
    c.strokeStyle = ink; c.lineWidth = lw;
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.stroke();
  }
}

function line(c, color, lw, fn) { path(c, null, color, lw, fn); }

function dot(c, x, y, r, fill, ink = null, lw = 0.4) {
  path(c, fill, ink, lw, (p) => p.arc(x, y, Math.max(0.05, r), 0, TAU));
}

// The shipped cactus grows out of a little mound so it does not read as
// standing ON the turf. Every candidate gets the same treatment, in soil rather
// than in the cactus's desert red, and OUTSIDE any sway transform — the ground
// does not dance.
function mound(c, w, h, color = SOIL) {
  path(c, color, null, 0, (p) => p.ellipse(w * 0.5, h * 0.985, w * 0.34, h * 0.045, 0, 0, TAU));
}

// The shared sway: body shears about its planted base, so the feet never lift.
// `amt` is the shear at full swing; `phase` offsets a part off the main cycle.
function sway(c, w, h, k) {
  c.transform(1, 0, -k, 1, k * (h * 0.995), 0);
}

function frameOf(t) { return Math.floor(t * FPS) % FRAMES; }
function phaseOf(t) { return (frameOf(t) / FRAMES) * TAU; }

// ------------------------------------------------------------ B — BRAMBLE
// The countryside's own answer to "pale points on a dark mass", which is the
// thesis the cactus is already built on — so this is the smallest possible move
// away from the desert while keeping the read intact. Wine-dark body, not
// green: a bramble in leaf would be the one thing that disappears into turf.
//
// Three canes arch out of a low tangle. The canes are what makes it a
// silhouette at 13x12 — a ball of thorns alone is a smudge, and the arcs give
// the eye something with a top to clear.
function drawBramble(c, w, h, t) {
  const p = phaseOf(t);
  const u = Math.max(w, h);
  const lw = Math.max(0.45, u * 0.05);
  mound(c, w, h);
  c.save();
  sway(c, w, h, 0.05 * Math.sin(p));

  // the tangle: an irregular low mass, three lobes so it is not a dome
  path(c, '#7a2438', INK, lw, (k) => {
    k.moveTo(w * 0.08, h);
    k.lineTo(w * 0.08, h * 0.72);
    k.arc(w * 0.24, h * 0.72, w * 0.16, Math.PI, TAU);
    k.arc(w * 0.52, h * 0.62, w * 0.14, Math.PI, TAU);
    k.arc(w * 0.78, h * 0.74, w * 0.14, Math.PI, TAU);
    k.lineTo(w * 0.92, h);
    k.closePath();
  });
  // one lighter lobe so the mass has a top plane and is not a flat cut-out
  path(c, '#98304a', null, 0, (k) => {
    k.arc(w * 0.5, h * 0.64, w * 0.12, Math.PI, TAU); k.closePath();
  });

  // three canes, each bobbing on its own offset of the one cycle
  const canes = [
    [0.2, 0.7, -0.14, 0.2, 1.1],
    [0.5, 0.6, 0.06, 0.1, 3.9],
    [0.78, 0.72, 0.2, 0.26, 2.4],
  ];
  for (const [x0, y0, dx, rise, off] of canes) {
    const bob = h * 0.03 * Math.sin(p + off);
    line(c, '#5a162a', lw * 1.3, (k) => {
      k.moveTo(w * x0, h * y0);
      k.quadraticCurveTo(w * (x0 + dx * 0.4), h * (y0 - rise - 0.1) + bob,
        w * (x0 + dx), h * (y0 - rise) + bob);
    });
  }

  // the thorns: short bone ticks off the canes and the crown of the mass
  line(c, BONE, Math.max(0.4, u * 0.038), (k) => {
    const ticks = [
      [0.14, 0.62, -0.8, -0.6], [0.28, 0.58, 0.5, -0.9],
      [0.46, 0.5, -0.4, -1], [0.6, 0.52, 0.7, -0.7],
      [0.74, 0.6, -0.6, -0.8], [0.88, 0.64, 0.8, -0.5],
      [0.1, 0.8, -1, 0.1], [0.9, 0.82, 1, 0.1],
      [0.36, 0.72, -0.2, 0.9], [0.66, 0.76, 0.3, 0.8],
    ];
    for (const [tx, ty, ddx, ddy] of ticks) {
      k.moveTo(w * tx, h * ty);
      k.lineTo(w * (tx + ddx * 0.075), h * (ty + ddy * 0.075));
    }
  });
  // two berries — the one warm-dark note that says bramble and not wire
  dot(c, w * 0.3, h * 0.66, u * 0.045, '#2e0c1e');
  dot(c, w * 0.68, h * 0.7, u * 0.04, '#2e0c1e');
  c.restore();
}

// -------------------------------------------------- C — BARBED WIRE COIL
// The thorn read in the wrong material, on purpose: a low rusted mass with pale
// points, which is structurally the cactus and semantically a farm. The post is
// the argument — Plumber's scenery already paints timber fences behind the
// lane, so this hazard looks like a piece of the world it is standing in rather
// than a prop dropped into it.
//
// Rust red carries RED = AVOID honestly rather than by convention: this is what
// the colour means on a real object.
function drawBarbedCoil(c, w, h, t) {
  const p = phaseOf(t);
  const u = Math.max(w, h);
  const lw = Math.max(0.45, u * 0.048);
  mound(c, w, h);

  // the broken post: leaning, splintered at the top, planted and still
  path(c, TIMBER, INK, lw, (k) => {
    k.moveTo(w * 0.62, h);
    k.lineTo(w * 0.58, h * 0.34);
    k.lineTo(w * 0.66, h * 0.22);   // the split
    k.lineTo(w * 0.72, h * 0.36);
    k.lineTo(w * 0.78, h);
    k.closePath();
  });
  line(c, TIMBER_DARK, lw * 0.8, (k) => {
    k.moveTo(w * 0.68, h * 0.4); k.lineTo(w * 0.7, h * 0.92);
  });

  // the coil: three loops of wire, each a squashed ellipse, the top one riding
  // the sway so the whole thing has a wobble a rigid prop would not
  const bob = h * 0.02 * Math.sin(p);
  const loops = [
    [0.42, 0.88, 0.3, 0.075, 0],
    [0.46, 0.72, 0.34, 0.085, bob * 0.5],
    [0.5, 0.55, 0.28, 0.075, bob],
  ];
  for (const [cx, cy, rx, ry, dy] of loops) {
    path(c, null, RUST, lw * 1.15, (k) => {
      k.ellipse(w * cx, h * cy + dy, w * rx, h * ry, 0.12, 0, TAU);
    });
  }
  // a shade pass on the underside of each loop so the coil has depth
  for (const [cx, cy, rx, ry, dy] of loops) {
    path(c, null, RUST_DARK, lw * 0.7, (k) => {
      k.ellipse(w * cx, h * cy + dy, w * rx, h * ry, 0.12, 0.15, Math.PI - 0.15);
    });
  }

  // the barbs: paired ticks crossing the wire, which is what makes it barbed
  // rather than a hose. Four of them, spread round the coil so at least two are
  // on the silhouette from any read.
  line(c, BONE, Math.max(0.4, u * 0.036), (k) => {
    const barbs = [
      [0.16, 0.85], [0.78, 0.9], [0.14, 0.7], [0.8, 0.72], [0.28, 0.5], [0.72, 0.53],
    ];
    for (const [bx, by] of barbs) {
      k.moveTo(w * (bx - 0.07), h * (by - 0.06));
      k.lineTo(w * (bx + 0.07), h * (by + 0.06));
      k.moveTo(w * (bx + 0.07), h * (by - 0.06));
      k.lineTo(w * (bx - 0.07), h * (by + 0.06));
    }
  });
  // one loose end springing off the top: the tell that it is under tension
  line(c, RUST, lw, (k) => {
    k.moveTo(w * 0.5, h * 0.48 + bob);
    k.quadraticCurveTo(w * 0.34, h * 0.3 + bob, w * 0.42, h * 0.16 + bob);
  });
}

// ----------------------------------------------------------- D — THISTLE
// The honest botanical answer: the countryside's actual thorn, and a colour no
// other prop in the game owns. The magenta head is the whole read — it is the
// one part above the turf line that cannot be confused with scenery, and the
// silver spine fan gives it a top edge to jump.
//
// The stem IS green, which the brief forbids for a BODY. It survives because it
// is a stalk, not the mass: two units wide against a head three times its
// width, and taken to an olive well below the turf so it reads as the thing
// holding the head up rather than as the hazard.
function drawThistle(c, w, h, t) {
  const p = phaseOf(t);
  const u = Math.max(w, h);
  const lw = Math.max(0.45, u * 0.045);
  mound(c, w, h);
  c.save();
  sway(c, w, h, 0.06 * Math.sin(p));

  // stem and two spined leaves
  line(c, '#2e4420', lw * 1.5, (k) => {
    k.moveTo(w * 0.5, h); k.lineTo(w * 0.5, h * 0.42);
  });
  path(c, '#39521f', INK, lw * 0.7, (k) => {
    k.moveTo(w * 0.48, h * 0.78);
    k.lineTo(w * 0.2, h * 0.68); k.lineTo(w * 0.3, h * 0.74);
    k.lineTo(w * 0.14, h * 0.78); k.lineTo(w * 0.32, h * 0.82);
    k.closePath();
    k.moveTo(w * 0.52, h * 0.66);
    k.lineTo(w * 0.82, h * 0.56); k.lineTo(w * 0.7, h * 0.63);
    k.lineTo(w * 0.88, h * 0.66); k.lineTo(w * 0.66, h * 0.72);
    k.closePath();
  });

  // the bud: a hatched cup the head sits in
  path(c, '#4a5c2a', INK, lw * 0.8, (k) => {
    k.moveTo(w * 0.36, h * 0.44);
    k.quadraticCurveTo(w * 0.5, h * 0.54, w * 0.64, h * 0.44);
    k.lineTo(w * 0.6, h * 0.3); k.lineTo(w * 0.4, h * 0.3);
    k.closePath();
  });
  line(c, '#2e4420', lw * 0.55, (k) => {
    k.moveTo(w * 0.42, h * 0.32); k.lineTo(w * 0.46, h * 0.48);
    k.moveTo(w * 0.54, h * 0.32); k.lineTo(w * 0.5, h * 0.48);
  });

  // the head: a magenta mass with a silver spine fan off the crown
  path(c, '#c03a86', INK, lw * 0.8, (k) => {
    k.moveTo(w * 0.38, h * 0.32);
    k.quadraticCurveTo(w * 0.5, h * 0.36, w * 0.62, h * 0.32);
    k.lineTo(w * 0.58, h * 0.16); k.lineTo(w * 0.42, h * 0.16);
    k.closePath();
  });
  const bob = h * 0.015 * Math.sin(p + 2.1);
  line(c, '#e05aa0', Math.max(0.38, u * 0.032), (k) => {
    for (const [sx, dxv] of [[0.4, -0.9], [0.45, -0.4], [0.5, 0], [0.55, 0.4], [0.6, 0.9]]) {
      k.moveTo(w * sx, h * 0.2);
      k.lineTo(w * (sx + dxv * 0.09), h * 0.04 + bob);
    }
  });
  line(c, '#efe4f4', Math.max(0.34, u * 0.026), (k) => {
    for (const [sx, dxv] of [[0.43, -0.7], [0.5, -0.15], [0.57, 0.6]]) {
      k.moveTo(w * sx, h * 0.19);
      k.lineTo(w * (sx + dxv * 0.1), h * 0.02 + bob);
    }
  });
  c.restore();
}

// ---------------------------------------------------- E — VALVE MANIFOLD
// The most on-theme object on the sheet: the cabinet is named after plumbing
// and already owns `pipe`, the tall unbreakable one. This is its little
// brother — a capped stub with a handwheel, farm irrigation, which is a real
// thing to find standing in a green field.
//
// Red-painted iron is the only candidate here whose colour needs no argument at
// all: valve gear IS painted red, so RED = AVOID is being read off the object
// rather than taught onto it.
function drawValveStub(c, w, h, t) {
  const p = phaseOf(t);
  const u = Math.max(w, h);
  const lw = Math.max(0.45, u * 0.05);
  mound(c, w, h);

  // the stub: a fat vertical body with a flange at the collar
  path(c, '#c43a28', INK, lw, (k) => {
    k.moveTo(w * 0.36, h);
    k.lineTo(w * 0.36, h * 0.42);
    k.lineTo(w * 0.64, h * 0.42);
    k.lineTo(w * 0.64, h);
    k.closePath();
  });
  line(c, '#92241a', lw * 0.9, (k) => {
    k.moveTo(w * 0.58, h * 0.46); k.lineTo(w * 0.58, h * 0.94);
  });
  // flange: the wide plate that says this is a joint and not a post
  path(c, '#d8452e', INK, lw * 0.8, (k) => {
    k.moveTo(w * 0.28, h * 0.42); k.lineTo(w * 0.72, h * 0.42);
    k.lineTo(w * 0.72, h * 0.32); k.lineTo(w * 0.28, h * 0.32);
    k.closePath();
  });
  dot(c, w * 0.34, h * 0.37, u * 0.028, STEEL);
  dot(c, w * 0.66, h * 0.37, u * 0.028, STEEL);

  // the handwheel, turning a notch per frame — the one moving part, and the
  // reason this silhouette is not just a box
  const spin = p * 0.5;
  c.save();
  c.translate(w * 0.5, h * 0.22);
  c.rotate(spin);
  path(c, null, '#d8452e', lw * 1.1, (k) => {
    k.ellipse(0, 0, w * 0.2, h * 0.09, 0, 0, TAU);
  });
  line(c, '#92241a', lw * 0.8, (k) => {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      k.moveTo(-Math.cos(a) * w * 0.2, -Math.sin(a) * h * 0.09);
      k.lineTo(Math.cos(a) * w * 0.2, Math.sin(a) * h * 0.09);
    }
  });
  c.restore();
  dot(c, w * 0.5, h * 0.22, u * 0.04, STEEL, INK, lw * 0.6);
  // a bead of escaping water, which is the joke and the hazard cue at once
  const drip = (frameOf(t) % 3) / 3;
  dot(c, w * 0.72, h * (0.3 + drip * 0.5), u * 0.03, '#6fd0f4');
}

// --------------------------------------------------------- F — TOADSTOOL
// ON THE SHEET SO THE ARGUMENT AGAINST IT CAN BE SEEN. Red with white spots is
// the most legible hazard colour there is at 13x12 and it belongs in a green
// field without any explaining — on silhouette and palette alone this wins.
//
// The objection is semantic and it is not small: in a PLUMBER level a red
// mushroom reads as a POWER-UP. The game would be fighting that association for
// its whole life, and no amount of ink weight argues a player out of it. Judge
// this one on whether the spots and the fat stem are enough to break the
// reference — if there is a flicker of "collect it", it is dead.
function drawToadstool(c, w, h, t) {
  const p = phaseOf(t);
  const u = Math.max(w, h);
  const lw = Math.max(0.45, u * 0.05);
  mound(c, w, h);
  c.save();
  sway(c, w, h, 0.035 * Math.sin(p));

  // the small one first, so the big cap overlaps it
  path(c, '#f2f0e0', INK, lw * 0.7, (k) => {
    k.moveTo(w * 0.14, h); k.lineTo(w * 0.16, h * 0.76);
    k.lineTo(w * 0.26, h * 0.76); k.lineTo(w * 0.28, h);
    k.closePath();
  });
  path(c, '#a8241c', INK, lw * 0.7, (k) => {
    k.moveTo(w * 0.06, h * 0.78);
    k.quadraticCurveTo(w * 0.21, h * 0.58, w * 0.36, h * 0.78);
    k.closePath();
  });

  // the big one: fat stem with a skirt, domed cap
  path(c, '#f2f0e0', INK, lw * 0.8, (k) => {
    k.moveTo(w * 0.42, h); k.lineTo(w * 0.44, h * 0.5);
    k.lineTo(w * 0.64, h * 0.5); k.lineTo(w * 0.66, h);
    k.closePath();
  });
  path(c, '#ded8c0', INK, lw * 0.6, (k) => {
    k.moveTo(w * 0.38, h * 0.56); k.lineTo(w * 0.7, h * 0.56);
    k.lineTo(w * 0.66, h * 0.62); k.lineTo(w * 0.42, h * 0.62);
    k.closePath();
  });
  path(c, '#c8281e', INK, lw * 0.9, (k) => {
    k.moveTo(w * 0.26, h * 0.52);
    k.quadraticCurveTo(w * 0.54, h * 0.14, w * 0.84, h * 0.52);
    k.closePath();
  });
  // the spots — three on the crown, one clipped by the rim
  for (const [sx, sy, r] of [[0.42, 0.38, 0.055], [0.58, 0.32, 0.065], [0.72, 0.44, 0.045]]) {
    dot(c, w * sx, h * sy, u * r, '#f4f0e2');
  }
  c.restore();
}

const DRAW = {
  bramble: drawBramble,
  barbedCoil: drawBarbedCoil,
  thistle: drawThistle,
  valveStub: drawValveStub,
  toadstool: drawToadstool,
};

// `shipped` marks the control: the gallery draws it through the REAL painter in
// sprites/props.js rather than a copy, so the thing being argued against is the
// thing actually in the game.
export const COUNTRYSIDE_HAZARD_CANDIDATES = [
  {
    letter: 'A', id: 'cactus', name: 'THORN CACTUS', shipped: true,
    note: 'the control — what ships today, in the lane it is being questioned in',
  },
  {
    letter: 'B', id: 'bramble', name: 'BRAMBLE',
    note: 'wine-dark tangle, bone thorns, three arching canes for a top edge',
  },
  {
    letter: 'C', id: 'barbedCoil', name: 'BARBED WIRE COIL',
    note: 'rusted coil on a split fence post — the fence is already in the scenery',
  },
  {
    letter: 'D', id: 'thistle', name: 'THISTLE',
    note: 'the real countryside thorn; magenta head is a colour nothing else owns',
  },
  {
    letter: 'E', id: 'valveStub', name: 'VALVE MANIFOLD',
    note: 'the cabinet is named after plumbing; red iron needs no colour argument',
  },
  {
    letter: 'F', id: 'toadstool', name: 'TOADSTOOL',
    note: 'best silhouette on the sheet — and in a plumber level it reads POWER-UP',
  },
];

export function drawCountrysideHazard(ctx, id, w, h, t = 0) {
  const draw = DRAW[id];
  if (!draw) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, w, h, t);
  ctx.restore();
}

export { FRAMES as COUNTRYSIDE_FRAMES, FPS as COUNTRYSIDE_FPS };
