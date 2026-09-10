// SLOPE TRACKING. The rig draws foot targets in figure space and plants soles
// on a horizontal line, which was correct for exactly as long as the cast wore
// ellipses: a shape with no flat sole and no defined "down" reads the same at
// any angle, so nothing showed. Real soles made it visible — one foot floating
// over a hill and the other cutting into it.
//
// `pose.groundDelta(dx)` fixes it, and this file is here because the fix is
// invisible on flat ground and therefore free to rot. It asserts the two
// things it buys, by MEASURING the drawn silhouette rather than by trusting
// the arithmetic: feet at different heights on a hill, and shoe ink that
// actually moves when the slope does.
import { installDom } from './dom-stub.js';
installDom();

const { TOON_SPECS, drawToon, soleTilt, slopeLean, SLOPE_LEAN, SLOPE_LEAN_MAX } = await import('../src/sprites/toons.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// A recording context: every path point that is asked for, in canvas space.
// Enough to bound what a draw actually put on screen, which is all this needs.
function recorder() {
  const pts = [];
  // A FULL 2x3 MATRIX, not a translate/scale pair. The first cut tracked only
  // those two and every rotated piece — the wrench, a rolled shoe — landed at
  // coordinates it was never drawn at, which put stray points a thousand units
  // below the figure and made "the lowest thing on this side" meaningless. A
  // measurement is only worth as much as its transform.
  let m = [1, 0, 0, 1, 0, 0];
  // CLIPPED GEOMETRY IS NOT DRAWN, and a recorder that does not know it will
  // measure things the screen never showed. The sole band is deliberately laid
  // down oversize and clipped to the shoe's silhouette; recorded raw, its
  // corners swung out to a third of a body-width as soon as the shoe tilted and
  // became "the lowest point on that side" — the whole reason this test was
  // reading feet that were not there. Anything inside a clip is skipped, which
  // leaves exactly the outlines, which is exactly the silhouette.
  let clipped = 0;
  const stack = [];
  const put = (x, y) => {
    if (clipped || !Number.isFinite(x) || !Number.isFinite(y)) return;
    pts.push([m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
  };
  const mul = (n) => {
    m = [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
    ];
  };
  const noop = () => {};
  const ctx = {
    pts,
    save() { stack.push([m.slice(), clipped]); },
    restore() { const s = stack.pop(); if (s) { [m, clipped] = s; } },
    translate(x, y) { mul([1, 0, 0, 1, x, y]); },
    scale(x, y) { mul([x, 0, 0, y, 0, 0]); },
    rotate(a) { const c = Math.cos(a), s2 = Math.sin(a); mul([c, s2, -s2, c, 0, 0]); },
    transform(a, b, c, d, e, f) { mul([a, b, c, d, e, f]); },
    setTransform(a, b, c, d, e, f) { m = [a, b, c, d, e, f]; },
    beginPath: noop, closePath: noop, fill: noop, stroke: noop,
    clip() { clipped += 1; },
    moveTo: put, lineTo: put,
    quadraticCurveTo(cx, cy, x, y) { put(cx, cy); put(x, y); },
    bezierCurveTo(ax, ay, bx, by, x, y) { put(ax, ay); put(bx, by); put(x, y); },
    arcTo(ax, ay, x, y) { put(ax, ay); put(x, y); },
    arc(x, y, r) { put(x - r, y - r); put(x + r, y + r); },
    ellipse(x, y, rx, ry) { put(x - rx, y - ry); put(x + rx, y + ry); },
    rect(x, y, w, h) { put(x, y); put(x + w, y + h); },
    fillRect(x, y, w, h) { put(x, y); put(x + w, y + h); },
    strokeRect(x, y, w, h) { put(x, y); put(x + w, y + h); },
    clearRect: noop,
    drawImage: noop, fillText: noop, strokeText: noop, measureText: () => ({ width: 0 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null, setLineDash: noop, getLineDash: () => [],
    canvas: { width: 480, height: 270 },
  };
  for (const k of ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin',
    'globalAlpha', 'globalCompositeOperation', 'font', 'textAlign', 'textBaseline',
    'shadowBlur', 'shadowColor', 'imageSmoothingEnabled', 'filter', 'miterLimit']) ctx[k] = 0;
  return ctx;
}

const U = 96;
const PHASES = [0, 0.12, 0.25, 0.42, 0.5, 0.75];
const pose = (ph, extra = {}) => ({
  kind: 'run', phase: ph, time: 0.42, grounded: true, squash: 0, lean: 0,
  roll: false, float: false, stomp: false, headless: false, facing: 1, vy: 0, ...extra,
});
const draw = (id, p) => {
  const ctx = recorder();
  drawToon(ctx, id, p, 0, 0, U, { spec: TOON_SPECS[id] });
  return ctx.pts;
};

// ---- the arithmetic, where the answer is unambiguous ----------------------
{
  const ramp = (m) => (dx) => dx * m;
  assert(soleTilt(null, 0, 10) === 0, 'no terrain is no tilt');
  assert(soleTilt(ramp(0), 0, 10) === 0, 'flat ground is no tilt');
  for (const m of [0.1, 0.3, 0.6]) {
    const up = soleTilt(ramp(m), 0, 10), down = soleTilt(ramp(-m), 0, 10);
    assert(Math.abs(up - Math.atan(m)) < 1e-9, `a ${m} ramp tilts the sole by atan(${m})`);
    assert(Math.abs(up + down) < 1e-9, `an uphill and a downhill of ${m} are equal and opposite`);
  }
  assert(soleTilt(ramp(0.6), 0, 10) > soleTilt(ramp(0.3), 0, 10),
    'a steeper hill tilts the sole further');
  // Measured ACROSS THE SHOE: a hill that turns over inside the foot's own
  // length is read as the average under it, not as the gradient at a point.
  const crest = (dx) => -Math.abs(dx);
  assert(Math.abs(soleTilt(crest, 0, 10)) < 1e-9,
    'a crest under the middle of the foot reads level, which is what standing on one is');
  assert(soleTilt(ramp(0.3), 0, 4) === soleTilt(ramp(0.3), 0, 40),
    'a straight ramp reads the same to a small foot and a big one');
}

// ---- the body's lean, which is the same arithmetic pointed at the torso ----
{
  const U2 = 96;
  const ramp = (m) => (dx) => dx * m;
  const grounded = (extra) => ({ grounded: true, ...extra });
  assert(slopeLean(grounded({ groundDelta: ramp(0) }), U2) === 0, 'flat ground leans nobody');
  assert(slopeLean(grounded({}), U2) === 0, 'no terrain leans nobody');
  assert(slopeLean({ grounded: false, groundDelta: ramp(0.3) }, U2) === 0,
    'a hero in the air has nothing to lean against');
  const up = slopeLean(grounded({ groundDelta: ramp(-0.3) }), U2);
  const down = slopeLean(grounded({ groundDelta: ramp(0.3) }), U2);
  assert(up > 0 && down < 0, 'uphill pitches forward and downhill sits back');
  assert(Math.abs(up + down) < 1e-9, 'the two are equal and opposite');
  // ZERO IS AN ANSWER, not an absent value: the lab sweeps this field and has
  // to be able to ask for the upright figure without getting the default back.
  assert(slopeLean(grounded({ groundDelta: ramp(0.3), slopeLean: 0 }), U2) === 0,
    'an explicit zero means upright, not "use the default"');
  assert(Math.abs(slopeLean(grounded({ groundDelta: ramp(0.3), slopeLean: SLOPE_LEAN }), U2) - down) < 1e-9,
    `an absent value takes the shipped ${SLOPE_LEAN}`);
  // THE CEILING. A step is a discontinuity, not a gradient: measured across it
  // the ground reads near-vertical, and 0.4 of near-vertical is a hero lying
  // down. The cap must not touch the hills the game actually has.
  // WHERE THE CAP TAKES OVER is a design statement, so it is asserted rather
  // than left to drift. It has come down twice, both times on "still too much
  // on the steep stuff", and at 0.085 it governs everything from a fairly
  // gentle hill upward — the proportional part is only really in charge of the
  // shallow ground. A gentle slope must still be proportional (or the lean is
  // just a constant with extra steps); anything at a real hill or beyond sits
  // on the cap.
  const gentle = Math.abs(slopeLean(grounded({ groundDelta: ramp(0.08) }), U2));
  assert(gentle < SLOPE_LEAN_MAX - 1e-6,
    `a gentle 0.08 slope is proportional at ${(gentle * 57.3).toFixed(1)} deg, under the cap`);
  const hill = Math.abs(slopeLean(grounded({ groundDelta: ramp(0.28) }), U2));
  assert(Math.abs(hill - SLOPE_LEAN_MAX) < 1e-9,
    `a real hill (0.28) is already ON the cap at ${(hill * 57.3).toFixed(1)} deg`);
  for (const step of [1, 4, 40]) {
    const l = Math.abs(slopeLean(grounded({ groundDelta: ramp(step) }), U2));
    assert(l <= SLOPE_LEAN_MAX + 1e-9, `a ${step}:1 step is capped at ${SLOPE_LEAN_MAX}, not obeyed`);
  }
  // A wall is the limit case and must not produce a NaN or a flipped sign.
  const wall = slopeLean(grounded({ groundDelta: (dx) => (dx > 0 ? -1e6 : 0) }), U2);
  assert(Number.isFinite(wall) && wall > 0 && wall <= SLOPE_LEAN_MAX + 1e-9,
    'a sheer wall ahead leans forward by the cap and no further');
}

// ---- and the end-to-end properties that survive any gait phase ------------
for (const id of ['lorenzo', 'grumpos', 'clara', 'b33p']) {
  let moved = 0, differed = 0;
  for (const ph of PHASES) {
    const flat = draw(id, pose(ph));
    const up = draw(id, pose(ph, { groundDelta: (dx) => dx * 0.3 }));
    const down = draw(id, pose(ph, { groundDelta: (dx) => dx * -0.3 }));
    const none = draw(id, pose(ph, { groundDelta: null }));

    assert(JSON.stringify(none) === JSON.stringify(flat),
      `${id} @${ph}: no terrain draws exactly what a flat groundDelta draws`);
    assert(up.length === flat.length && down.length === flat.length,
      `${id} @${ph}: a slope changes where the rig draws, not how much of it`);
    if (JSON.stringify(up) !== JSON.stringify(flat)) moved += 1;
    if (JSON.stringify(up) !== JSON.stringify(down)) differed += 1;
  }
  assert(moved === PHASES.length, `${id}: a hill moves the figure at every phase of the stride`);
  assert(differed === PHASES.length, `${id}: uphill and downhill are never the same drawing`);

  // A CLIFF MUST NOT TEAR THE FIGURE APART. Terrain can fall faster than legs
  // can span: on a 45-degree face the ground drops a whole stride across one
  // stride, and a foot that chases it drags the body down between two targets
  // it cannot reach. The chase is capped at a third of the leg, so a figure on
  // a 4:1 face has to stay about the size it is on the flat.
  const box = (pts) => {
    let lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) {
      if (Math.abs(x) > U * 2 || Math.abs(y) > U * 2) continue;
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
    return hi - lo;
  };
  const flatH = box(draw(id, pose(0.42)));
  for (const m of [1, 4, 20]) {
    const steepH = box(draw(id, pose(0.42, { groundDelta: (dx) => dx * m })));
    assert(Number.isFinite(steepH) && steepH < flatH * 1.5,
      `${id}: a ${m}:1 face leaves the figure its own size (${flatH.toFixed(1)} -> ${steepH.toFixed(1)})`);
  }
}

console.log(failed ? 'SHOE SLOPE: FAILED' : 'SHOE SLOPE: PASSED');
process.exit(failed ? 1 : 0);
