// Gallery-only banana studies. Six answers to one question — what shape should
// the banana-peel hazard be — drawn to the same seam the shipped prop uses (a
// painter filling a normalized w-by-h box, standing on the box floor) so the
// winner is ported by copying its body into sprites/props.js and nothing else.
//
// None of these is a registered entity. The peel that IS registered lives in
// props.js as `bananaPeel`, and it is candidate G — ported after this bake-off
// settled it. Candidate A is the shape that was shipped BEFORE, kept so the
// comparison still shows what was replaced rather than judging six survivors
// against a memory of it. When G is confirmed, this whole file and the gallery
// section that reads it come out.
//
// WHAT THE BAKE-OFF IS ACTUALLY ABOUT. The reference is the Mario Kart 8 item,
// and the shipped pass followed it closely: a peel standing up, four skins off
// one root. It reads, and it was still not right, which means the question is
// not fidelity to the reference — it is which of several honest bananas holds
// up as a 14x12 hazard in a lane the player is reading at speed. So the six
// split along the two axes that actually change that answer:
//
//   STANDING or LYING. A standing peel has a silhouette above the ground line,
//     which is what every other ground hazard in this game has and what makes a
//     thing jumpable at a glance. A lying one is the truthful picture of
//     something dropped on a road and gives the lane a low, wide mark instead.
//   FRUIT or PEEL. A whole banana is the most legible yellow shape there is and
//     is not, strictly, the hazard. A peeled one is the hazard and costs
//     silhouette to say so. Half-peeled tries to have both.
//
// Cross those and add one built for legibility over fidelity (E), and the six
// below cover the field. Delete this file when one wins — see the gallery's own
// note about settled bake-offs.

const TAU = Math.PI * 2;

function fill(ctx, color, u, pathFn, ink = 'rgba(26,16,40,0.32)', scale = 0.018) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.2, scale * u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function flat(ctx, color, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = color;
  ctx.fill();
}

function line(ctx, color, width, pathFn) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// The shared palette. Every candidate draws from it so the bake-off turns on
// SHAPE — which is the whole question — rather than on one study having been
// given a nicer yellow than its neighbours.
const PAL = {
  yel: '#f2e42c',
  hi: '#f8ef6e',
  lo: '#d9c31d',
  deep: '#c4ac16',
  grn: '#cfdc26',
  tip: '#8a4a24',
  flesh: '#fbf2c8',
  ink: 'rgba(26,16,40,0.32)',
};

// A SKIN, built from a centreline offset along its own normal rather than from
// two hand-placed edge curves. Hand-placed edges do not hold their relationship
// as a curve bends — a skin comes out plank-thick through the middle and blunt
// at the end — so every candidate that needs a tapered strip of peel uses this.
//
// `half` peaks nearer the root than the middle because a peeled skin is widest
// where it is still attached and narrows the whole way out.
function skin(rx, ry, kx, ky, tx, ty, halfMax, capBack = 2, floor = 0) {
  const N = 14;
  const top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, mt = 1 - t;
    const x = mt * mt * rx + 2 * mt * t * kx + t * t * tx;
    const y = mt * mt * ry + 2 * mt * t * ky + t * t * ty;
    const dx = 2 * mt * (kx - rx) + 2 * t * (tx - kx);
    const dy = 2 * mt * (ky - ry) + 2 * t * (ty - ky);
    const len = Math.hypot(dx, dy) || 1;
    // `floor` holds the strip open at both ends instead of closing it to a
    // point. A fan skin wants a point (floor 0); a skin that RISES out of the
    // pile and carries the stalk wants a band — closed to a point it becomes a
    // needle with a brick balanced on it.
    const half = halfMax * Math.max(floor, Math.sin(Math.PI * Math.pow(t, 0.62)));
    top.push([x - dy / len * half, y + dx / len * half]);
    bot.push([x + dy / len * half, y - dx / len * half]);
  }
  return {
    path: (c) => {
      c.moveTo(top[0][0], top[0][1]);
      for (const [x, y] of top) c.lineTo(x, y);
      for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
      c.closePath();
    },
    cap: (c) => {
      const m = N - capBack;
      c.moveTo(tx, ty);
      c.lineTo(top[m][0], top[m][1]);
      c.quadraticCurveTo((top[m][0] + bot[m][0]) / 2, (top[m][1] + bot[m][1]) / 2,
        bot[m][0], bot[m][1]);
      c.closePath();
    },
  };
}

// Everything sits on a shared contact smear rather than each study inventing
// its own, so a candidate cannot win on having drawn a better shadow.
function ground(ctx, w, h, gy, spread = 0.38) {
  flat(ctx, 'rgba(8,6,12,0.16)', (c) => {
    c.ellipse(w * 0.5, gy - h * 0.005, w * spread, h * 0.026, 0, 0, TAU);
  });
}

// --------------------------------------------------------------- A — UPRIGHT
// The shipped prop, copied here unchanged so the field includes the incumbent.
// Four skins off one root, three on the floor and one standing. Closest to the
// Mario Kart reference and the tallest silhouette in the bake-off.
function drawUpright(ctx, w, h) {
  const u = Math.max(w, h);
  const gy = h * 0.95;
  const rx = w * 0.47, ry = gy - h * 0.06;
  ground(ctx, w, h, gy);
  for (const [kx, ky, tx, ty, hm, col] of [
    [w * 0.22, gy + h * 0.030, w * 0.045, gy - h * 0.150, h * 0.075, PAL.lo],
    [w * 0.76, gy + h * 0.026, w * 0.955, gy - h * 0.185, h * 0.070, PAL.yel],
    [w * 0.63, gy + h * 0.034, w * 0.775, gy - h * 0.020, h * 0.058, PAL.hi],
  ]) {
    const sk = skin(rx, ry, kx, ky, tx, ty, hm);
    fill(ctx, col, u, sk.path);
    flat(ctx, PAL.tip, sk.cap);
  }
  const up = skin(rx, ry, rx - w * 0.052, gy - h * 0.42, rx + w * 0.028, gy - h * 0.86, w * 0.074, 1);
  fill(ctx, PAL.yel, u, up.path);
  ctx.save();
  ctx.beginPath(); up.path(ctx); ctx.clip();
  flat(ctx, PAL.grn, (c) => {
    c.moveTo(rx - w * 0.25, gy - h * 0.58);
    c.quadraticCurveTo(rx, gy - h * 0.51, rx + w * 0.25, gy - h * 0.565);
    c.lineTo(rx + w * 0.25, gy - h * 0.95);
    c.lineTo(rx - w * 0.25, gy - h * 0.95);
    c.closePath();
  });
  line(ctx, 'rgba(120,90,20,0.16)', Math.max(0.35, w * 0.038), (c) => {
    c.moveTo(rx + w * 0.050, gy - h * 0.18);
    c.quadraticCurveTo(rx + w * 0.040, gy - h * 0.46, rx + w * 0.030, gy - h * 0.70);
  });
  line(ctx, 'rgba(255,255,255,0.34)', Math.max(0.3, w * 0.030), (c) => {
    c.moveTo(rx - w * 0.052, gy - h * 0.22);
    c.quadraticCurveTo(rx - w * 0.072, gy - h * 0.46, rx - w * 0.040, gy - h * 0.68);
  });
  ctx.restore();
  flat(ctx, PAL.tip, up.cap);
}

// ---------------------------------------------------------- B — WHOLE BANANA
// Not a peel at all: one curved banana lying on the road with its tips up.
//
// The argument for it is that it is the most legible yellow shape in existence
// and the player has to classify this thing in a fraction of a second. A
// crescent with two dark tips is read as "banana" by everybody alive, at any
// size, against any ground colour, with no second glance — and none of the
// peeled candidates can claim that. The argument against is that a whole banana
// is litter rather than a hazard, and the joke is specifically about the peel.
function drawWhole(ctx, w, h) {
  const u = Math.max(w, h);
  const gy = h * 0.93;
  ground(ctx, w, h, gy, 0.42);
  // The body: a fat crescent, thickest in the middle, tapering into both tips.
  const body = (c) => {
    c.moveTo(w * 0.06, gy - h * 0.38);
    c.quadraticCurveTo(w * 0.48, gy + h * 0.30, w * 0.94, gy - h * 0.34);
    c.quadraticCurveTo(w * 0.50, gy - h * 0.62, w * 0.06, gy - h * 0.38);
    c.closePath();
  };
  fill(ctx, PAL.yel, u, body);
  ctx.save();
  ctx.beginPath(); body(ctx); ctx.clip();
  // A ridge along the top, which is the one piece of anatomy that says banana
  // rather than crescent moon — the fruit is faceted, not round.
  line(ctx, PAL.hi, Math.max(0.4, h * 0.10), (c) => {
    c.moveTo(w * 0.16, gy - h * 0.40);
    c.quadraticCurveTo(w * 0.50, gy - h * 0.54, w * 0.86, gy - h * 0.36);
  });
  line(ctx, PAL.deep, Math.max(0.35, h * 0.07), (c) => {
    c.moveTo(w * 0.14, gy - h * 0.28);
    c.quadraticCurveTo(w * 0.50, gy + h * 0.16, w * 0.88, gy - h * 0.24);
  });
  ctx.restore();
  // Both ends browned: the stalk end squared off, the flower end a point.
  flat(ctx, PAL.tip, (c) => {
    c.moveTo(w * 0.03, gy - h * 0.50);
    c.lineTo(w * 0.11, gy - h * 0.40);
    c.lineTo(w * 0.07, gy - h * 0.29);
    c.closePath();
  });
  flat(ctx, PAL.tip, (c) => {
    c.ellipse(w * 0.93, gy - h * 0.33, w * 0.035, h * 0.05, 0.4, 0, TAU);
  });
}

// ----------------------------------------------------------- C — DRAPED PEEL
// The cartoon peel seen from the side: an emptied skin collapsed on the road
// with its strips flopping forward over themselves.
//
// This is the picture in everybody's head of the thing you slip on, and it is
// the only candidate that shows the PALE INNER FACE of the skin, which is the
// single most peel-specific mark available — no whole banana has one. It is
// also the lowest silhouette here after the star, which is the cost.
function drawDraped(ctx, w, h) {
  const u = Math.max(w, h);
  const gy = h * 0.94;
  ground(ctx, w, h, gy, 0.44);
  // The collapsed body, low and humped, sitting slightly right of centre.
  fill(ctx, PAL.lo, u, (c) => {
    c.moveTo(w * 0.30, gy - h * 0.04);
    c.quadraticCurveTo(w * 0.36, gy - h * 0.46, w * 0.62, gy - h * 0.44);
    c.quadraticCurveTo(w * 0.82, gy - h * 0.42, w * 0.80, gy - h * 0.04);
    c.closePath();
  });
  // Two strips flopping forward and one back. Each gets a pale inner face along
  // its underside, because a skin that has been turned over shows its lining.
  const strip = (kx, ky, tx, ty, hm, col) => {
    const sk = skin(w * 0.56, gy - h * 0.40, kx, ky, tx, ty, hm);
    fill(ctx, col, u, sk.path);
    ctx.save();
    ctx.beginPath(); sk.path(ctx); ctx.clip();
    line(ctx, PAL.flesh, Math.max(0.4, h * 0.09), (c) => {
      c.moveTo(w * 0.56, gy - h * 0.36);
      c.quadraticCurveTo(kx, ky + h * 0.05, tx, ty + h * 0.03);
    });
    ctx.restore();
    flat(ctx, PAL.tip, sk.cap);
  };
  strip(w * 0.30, gy - h * 0.16, w * 0.05, gy - h * 0.10, h * 0.085, PAL.yel);
  strip(w * 0.80, gy - h * 0.14, w * 0.96, gy - h * 0.16, h * 0.075, PAL.hi);
  strip(w * 0.44, gy + h * 0.02, w * 0.26, gy - h * 0.02, h * 0.060, PAL.lo);
  // The stub of stalk still standing on the body — the only thing above the
  // mound, and what stops this reading as a spilled omelette.
  fill(ctx, PAL.tip, u, (c) => {
    c.moveTo(w * 0.55, gy - h * 0.42);
    c.lineTo(w * 0.57, gy - h * 0.66);
    c.quadraticCurveTo(w * 0.60, gy - h * 0.71, w * 0.63, gy - h * 0.65);
    c.lineTo(w * 0.63, gy - h * 0.41);
    c.closePath();
  });
}

// ----------------------------------------------------------- D — SPLAYED STAR
// The plan view: four skins radiating from a centre, seen from the high angle
// this game's camera actually has. Foreshortened vertically, so the two skins
// pointing "away" are shorter and darker than the two coming toward the viewer.
//
// This is the most honest drawing of a peel lying on a road that a runner is
// about to tread on, and it is the widest, lowest mark in the bake-off. Its
// risk is the one the first pass of the shipped prop actually hit: splayed
// blades around a stub read as a plant sprouting out of the tarmac.
function drawStar(ctx, w, h) {
  const u = Math.max(w, h);
  const gy = h * 0.96;
  const cx = w * 0.5, cy = gy - h * 0.16;
  ground(ctx, w, h, gy, 0.46);
  // Back pair first and darker: depth, on a drawing with no other cue for it.
  for (const [kx, ky, tx, ty, hm, col] of [
    [w * 0.30, cy - h * 0.16, w * 0.11, cy - h * 0.30, h * 0.070, PAL.deep],
    [w * 0.72, cy - h * 0.17, w * 0.90, cy - h * 0.32, h * 0.066, PAL.lo],
    [w * 0.22, cy + h * 0.10, w * 0.03, cy + h * 0.08, h * 0.085, PAL.yel],
    [w * 0.78, cy + h * 0.12, w * 0.97, cy + h * 0.06, h * 0.080, PAL.hi],
  ]) {
    const sk = skin(cx, cy, kx, ky, tx, ty, hm);
    fill(ctx, col, u, sk.path);
    flat(ctx, PAL.tip, sk.cap);
  }
  // The centre: the collapsed neck the four skins are still joined at, with the
  // stalk standing off it. Without the stalk this is a starfish.
  fill(ctx, PAL.hi, u, (c) => {
    c.ellipse(cx, cy, w * 0.10, h * 0.085, 0, 0, TAU);
  });
  fill(ctx, PAL.tip, u, (c) => {
    c.moveTo(cx - w * 0.026, cy - h * 0.02);
    c.lineTo(cx - w * 0.020, cy - h * 0.38);
    c.quadraticCurveTo(cx, cy - h * 0.44, cx + w * 0.022, cy - h * 0.37);
    c.lineTo(cx + w * 0.030, cy - h * 0.01);
    c.closePath();
  });
}

// ---------------------------------------------------------- E — CHUNKY MASCOT
// Built for the lane rather than for the fruit. One fat rounded body, two stubby
// flaps, a heavy contour, and two tones — no gradient, no flesh, no ridge.
//
// This is how the crate and the cone are actually drawn, and the reason to try
// it is that every other candidate here is a good drawing of a banana at study
// size that then has to survive being fourteen pixels wide with a hero, a HUD
// and scrolling scenery competing for the same glance. Fewer, bigger marks
// survive that better than more, finer ones. The cost is charm: this reads as
// an icon of a banana rather than as a banana.
function drawChunky(ctx, w, h) {
  const u = Math.max(w, h);
  const gy = h * 0.93;
  const INK = 'rgba(26,16,40,0.55)';   // deliberately heavier than the shared ink
  ground(ctx, w, h, gy, 0.40);
  // Two stubby flaps, drawn first so the body caps their roots.
  for (const [x0, x1, y1, col] of [
    [w * 0.34, w * 0.06, gy - h * 0.30, PAL.lo],
    [w * 0.66, w * 0.94, gy - h * 0.26, PAL.yel],
  ]) {
    fill(ctx, col, u, (c) => {
      c.moveTo(x0, gy - h * 0.30);
      c.quadraticCurveTo((x0 + x1) / 2, gy - h * 0.52, x1, y1);
      c.quadraticCurveTo((x0 + x1) / 2, gy - h * 0.06, x0, gy - h * 0.06);
      c.closePath();
    }, INK, 0.03);
  }
  // The body: a rounded wedge, wide at the floor and domed on top.
  fill(ctx, PAL.yel, u, (c) => {
    c.moveTo(w * 0.28, gy - h * 0.04);
    c.quadraticCurveTo(w * 0.26, gy - h * 0.60, w * 0.44, gy - h * 0.74);
    c.quadraticCurveTo(w * 0.56, gy - h * 0.82, w * 0.66, gy - h * 0.66);
    c.quadraticCurveTo(w * 0.76, gy - h * 0.48, w * 0.74, gy - h * 0.04);
    c.closePath();
  }, INK, 0.03);
  // One bold highlight, one bold shadow. Two marks, both readable at lane size.
  flat(ctx, PAL.hi, (c) => {
    c.moveTo(w * 0.34, gy - h * 0.16);
    c.quadraticCurveTo(w * 0.33, gy - h * 0.56, w * 0.45, gy - h * 0.66);
    c.quadraticCurveTo(w * 0.44, gy - h * 0.40, w * 0.45, gy - h * 0.16);
    c.closePath();
  });
  flat(ctx, PAL.deep, (c) => {
    c.moveTo(w * 0.66, gy - h * 0.10);
    c.quadraticCurveTo(w * 0.70, gy - h * 0.42, w * 0.64, gy - h * 0.66);
    c.quadraticCurveTo(w * 0.74, gy - h * 0.46, w * 0.73, gy - h * 0.10);
    c.closePath();
  });
  // The stalk, as chunky as everything else.
  fill(ctx, PAL.tip, u, (c) => {
    c.moveTo(w * 0.47, gy - h * 0.72);
    c.lineTo(w * 0.48, gy - h * 0.94);
    c.quadraticCurveTo(w * 0.53, gy - h * 0.99, w * 0.57, gy - h * 0.93);
    c.lineTo(w * 0.60, gy - h * 0.70);
    c.closePath();
  }, INK, 0.03);
}

// ------------------------------------------------------- F — HALF-PEELED, UP
// The fruit still sitting in its skin with three strips folded down and out.
//
// The one candidate that tries to have both halves: the whole banana's legible
// yellow mass up the middle for the silhouette, and unmistakable peeled strips
// around its foot for the joke. It is also the only one where the hazard is
// visibly OPEN — a thing in the process of having been dropped rather than a
// thing that has settled.
function drawHalfPeeled(ctx, w, h) {
  const u = Math.max(w, h);
  const gy = h * 0.95;
  const rx = w * 0.49, ry = gy - h * 0.36;
  ground(ctx, w, h, gy, 0.38);
  // Three strips folded DOWN from the fruit's waist, hugging it on the way and
  // then flaring out along the floor. Folded rather than radiating is the whole
  // difference between this and the star: the fold is what says the skin is
  // still attached to something.
  for (const [kx, ky, tx, ty, hm, col] of [
    [w * 0.26, gy - h * 0.22, w * 0.08, gy - h * 0.05, h * 0.075, PAL.lo],
    [w * 0.74, gy - h * 0.20, w * 0.93, gy - h * 0.07, h * 0.070, PAL.yel],
    [w * 0.60, gy - h * 0.10, w * 0.70, gy - h * 0.02, h * 0.055, PAL.hi],
  ]) {
    const sk = skin(rx, ry, kx, ky, tx, ty, hm);
    fill(ctx, col, u, sk.path);
    flat(ctx, PAL.tip, sk.cap);
  }
  // The fruit: a plump column leaning right, pale rather than saturated because
  // it is the flesh, not the skin.
  const fruit = (c) => {
    c.moveTo(rx - w * 0.105, gy - h * 0.30);
    c.bezierCurveTo(
      rx - w * 0.125, gy - h * 0.56,
      rx - w * 0.098, gy - h * 0.74,
      rx - w * 0.040, gy - h * 0.855,
    );
    c.quadraticCurveTo(rx - w * 0.006, gy - h * 0.905, rx + w * 0.034, gy - h * 0.850);
    c.bezierCurveTo(
      rx + w * 0.098, gy - h * 0.72,
      rx + w * 0.122, gy - h * 0.55,
      rx + w * 0.108, gy - h * 0.29,
    );
    c.closePath();
  };
  fill(ctx, PAL.flesh, u, fruit);
  ctx.save();
  ctx.beginPath(); fruit(ctx); ctx.clip();
  // A soft shadow down the right so the column has volume, and a yellow collar
  // at the waist where the skin has not come away yet.
  line(ctx, 'rgba(150,120,40,0.18)', Math.max(0.4, w * 0.05), (c) => {
    c.moveTo(rx + w * 0.070, gy - h * 0.32);
    c.quadraticCurveTo(rx + w * 0.062, gy - h * 0.58, rx + w * 0.024, gy - h * 0.78);
  });
  flat(ctx, PAL.yel, (c) => {
    c.moveTo(rx - w * 0.2, gy - h * 0.44);
    c.quadraticCurveTo(rx, gy - h * 0.36, rx + w * 0.2, gy - h * 0.43);
    c.lineTo(rx + w * 0.2, gy - h * 0.10);
    c.lineTo(rx - w * 0.2, gy - h * 0.10);
    c.closePath();
  });
  ctx.restore();
  // Browned crown, where it was snapped off the bunch.
  flat(ctx, PAL.tip, (c) => {
    c.moveTo(rx - w * 0.040, gy - h * 0.855);
    c.quadraticCurveTo(rx - w * 0.004, gy - h * 0.905, rx + w * 0.034, gy - h * 0.850);
    c.quadraticCurveTo(rx - w * 0.002, gy - h * 0.825, rx - w * 0.040, gy - h * 0.855);
    c.closePath();
  });
}


// ------------------------------------------------------------ G — FLAT VECTOR
// Drawn from the flat-vector peel Peter brought in, which is a better drawing
// than anything above it and worth saying why.
//
// It differs from the six earlier candidates on three counts, and all three are
// the reason it looks better rather than incidental:
//
//   NO CONTOUR. Every study above is outlined, because every prop in this game
//     is. This one separates its shapes with TONE alone — four warm values from
//     cream to deep orange — and the absence of the dark hairline is most of
//     why it reads as clean instead of as busy. The risk is real: an unoutlined
//     prop can vanish against a ground of similar value, and Speed Zone's road
//     is #c88848, which is the peel's own orange. The version that ships keeps a
//     whisper of contour for that reason; this study is the reference as drawn.
//   WARM, NOT LEMON. Golds and oranges rather than the #f2e42c yellow the other
//     studies share. Against turf it separates better, and it stops reading as
//     the same yellow as a coin.
//   ONE TALL ARC. Not a fan of equal skins around a stub — a single sweeping
//     skin rises from the pile and carries the stalk at its top, and everything
//     else lies down around it. That is what gives the shape its silhouette AND
//     keeps it low: it has a peak without being a tower.
function drawFlatVector(ctx, w, h) {
  const gy = h * 0.97;
  const P = {
    deep: '#efa02a',   // the long skin sweeping right — furthest from the light
    mid: '#f9b233',    // the skin hooking left behind the arc
    gold: '#fbc94b',   // the arc itself
    pale: '#fce3a0',   // the skin lying flat in front, inner face up
    stalk: '#6e4a20',
  };
  ground(ctx, w, h, gy, 0.42);
  // Every skin here is a SICKLE — the same centreline-offset construction the
  // other candidates use, filled with no contour. Hand-authored beziers were the
  // first attempt at this reference and every one of them came out a rounded
  // lump: the drawing's whole character is long tapered strips with points on
  // them, and a point is the one thing two hand-placed edge curves will not give
  // you reliably. Order matters — right, left, the flat one in front, then the
  // arc over all three, which is the overlap the reference has.
  for (const [rx, ry, kx, ky, tx, ty, hm, fl, col] of [
    // The right skin lies LOW and long, and is THIN for its length. Fattened to
    // fill the same span it stops tapering and becomes a rounded lump — which is
    // the one thing the reference never does.
    [w * 0.52, gy - h * 0.130, w * 0.79, gy - h * 0.120, w * 0.985, gy - h * 0.020, h * 0.084, 0, P.deep],
    // The left one hooks rather than points. Steeper, it was a shark fin.
    [w * 0.50, gy - h * 0.190, w * 0.34, gy - h * 0.315, w * 0.200, gy - h * 0.295, h * 0.078, 0, P.mid],
    [w * 0.50, gy - h * 0.075, w * 0.28, gy - h * 0.120, w * 0.075, gy - h * 0.035, h * 0.078, 0, P.pale],
    // The arc keeps 44% of its width at the top, so the stalk sits on a neck
    // rather than on a needle.
    [w * 0.430, gy - h * 0.030, w * 0.320, gy - h * 0.500, w * 0.585, gy - h * 0.865, w * 0.084, 0.44, P.gold],
  ]) {
    flat(ctx, col, skin(rx, ry, kx, ky, tx, ty, hm, 2, fl).path);
  }
  // The stalk: a chunky rounded block sitting on the arc's point, not a taper.
  // In the reference it is a single dark square and it is doing a lot — it is
  // the only non-warm mark in the drawing and it sits at the top of the
  // silhouette, which is where the eye lands first.
  flat(ctx, P.stalk, (c) => {
    const bw = w * 0.088, bh = h * 0.115, r = w * 0.020;
    const x = w * 0.575 - bw * 0.5, y = gy - h * 0.95;
    c.moveTo(x + r, y);
    c.arcTo(x + bw, y, x + bw, y + bh, r);
    c.arcTo(x + bw, y + bh, x, y + bh, r);
    c.arcTo(x, y + bh, x, y, r);
    c.arcTo(x, y, x + bw, y, r);
    c.closePath();
  });
}

const DRAW = {
  upright: drawUpright,
  whole: drawWhole,
  draped: drawDraped,
  star: drawStar,
  chunky: drawChunky,
  halfPeeled: drawHalfPeeled,
  flatVector: drawFlatVector,
};

// `box` is the art envelope each shape wants, as w/h in game units. It is NOT a
// decided hitbox — the shipped prop is 14x12 and a winner that wants to be wider
// and lower says so here, and the registry follows when it is ported.
export const BANANA_CANDIDATES = [
  ['upright', 'A', 'UPRIGHT PEEL', [14, 12],
    'SHIPPED. Four skins off one root, one standing. Closest to the MK8 item; tallest silhouette here.'],
  ['whole', 'B', 'WHOLE BANANA', [15, 8],
    'Not a peel. The most instantly legible yellow shape there is — and litter rather than a hazard.'],
  ['draped', 'C', 'DRAPED PEEL', [15, 9],
    'The cartoon peel, side on. The only one showing the pale inner lining, which nothing else can fake.'],
  ['star', 'D', 'SPLAYED STAR', [16, 8],
    'Plan view from the camera we actually have. Widest and lowest; risks reading as a sprouting plant.'],
  ['chunky', 'E', 'CHUNKY ICON', [13, 11],
    'Drawn like the crate and the cone: fewer, bigger marks and a heavy contour. Survives the glance, loses the charm.'],
  ['halfPeeled', 'F', 'HALF-PEELED', [14, 13],
    'Fruit still in the skin, strips folded down. Buys the whole banana’s silhouette and keeps the joke.'],
  ['flatVector', 'G', 'FLAT VECTOR', [15, 11],
    'Warm-gold reference. Superseded by the lemon-yellow one now shipped — see props.js bananaPeel.'],
].map(([id, letter, name, box, note]) => ({ id, letter, name, box, note }));

export function drawBananaCandidate(ctx, id, w, h) {
  const draw = DRAW[id];
  if (!draw) return;
  ctx.save();
  draw(ctx, w, h);
  ctx.restore();
}
