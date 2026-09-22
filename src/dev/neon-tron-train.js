// TRON SHINKANSEN — a minimalist vector bullet train. Gallery mock-up only.
//
// Built to Peter's spec (22 Sep 2026): dark matte slate hull with a crisp cyan
// stroke, a straight row of small rounded windows glowing steadily, clean
// horizontal circuit lines along the lower hull, simple glowing hubs for
// wheels, no couplers, no cityscape in the spec's own view. Modular — a consist
// is a list of car descriptors, so cars can be added or removed by data. Faces
// LEFT TO RIGHT: the nose is on the right, the way this game's lane runs.
//
// Two adjustments for our purposes, both deliberate:
//
//   - The glow is ctx.shadowBlur here because the spec asks for it and this is
//     a gallery mock, where fill rate is free. It is NOT free in the run — the
//     shipped neon pack draws every tube as two strokes (a wide faint one and a
//     thin bright one, see neonTube) for exactly that reason. `glow: false`
//     switches this painter to the same two-stroke trick so the port can be
//     judged against the spec before anything moves.
//   - The palette is a parameter. The spec's #00f0ff is a touch bluer than the
//     cabinet's own cyan (#38d8f8); both are here, and the gallery draws the
//     spec's first so the design is seen as written.
//
// Everything is a pure function of (ctx, geometry, options): no module state,
// nothing measured off the DOM, nothing that needs the page. That is what makes
// it liftable into a game loop.

export const TRON_PALETTE = Object.freeze({
  // The spec, verbatim.
  spec: Object.freeze({
    bg: '#0a0c10', hull: '#1e222b', line: '#00f0ff', glass: '#00f0ff', dim: 'rgba(0,240,255,0.35)',
  }),
  // The cabinet's own inks, for the tiles drawn over the shipped city.
  neon: Object.freeze({
    bg: '#0a0a2a', hull: '#16123a', line: '#38d8f8', glass: '#38d8f8', dim: 'rgba(56,216,248,0.35)',
  }),
});

// The consist the spec asks for: one engine, two passenger cars. A car is
// {kind, len}; `len` is optional and defaults per kind, so the common case is
// just a list of kinds.
export const TRON_SPEC_CONSIST = Object.freeze([
  { kind: 'car' }, { kind: 'car' }, { kind: 'engine' },
]);

// A WHOLE TRAIN: tapered at BOTH ends, uniform cars between them.
//
// Peter's conceit, 22 Sep: the hero is fast enough to leave one train and catch
// another, several times a level. That settles two things at once. The train no
// longer has to be absurdly long — six cars is a train, ninety is a conveyor
// belt — and the carriages can all be the SAME LENGTH, which is what a real
// train looks like and what the varying-length version was only doing to buy
// rhythm. The rhythm now comes from the transitions between trains instead.
//
// A high-speed set is streamlined at both ends because it runs both ways, so
// 'tail' is the nose mirrored. That is not a detail: the tail and the nose are
// what frame the jump between trains, and two tapers facing each other across a
// gap is the whole reason the beat reads.
export const TRON_TRAIN = Object.freeze([
  { kind: 'tail' }, { kind: 'car' }, { kind: 'car' }, { kind: 'car' }, { kind: 'car' }, { kind: 'engine' },
]);

const DEFAULT_LEN = Object.freeze({ car: 96, engine: 118, tail: 118 });
const GAP = 3;            // the un-drawn coupler between cars
const CORNER = 4;         // roof/underframe corner radius on a passenger car

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

// A stroke with the glow the spec wants, or the two-stroke stand-in the run
// can afford. Both take a path-building callback so the geometry is written
// once.
function glowStroke(ctx, color, width, glow, draw) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  if (glow) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = width;
    ctx.beginPath(); draw(ctx); ctx.stroke();
    ctx.restore();
    return;
  }
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * 0.22;
  ctx.lineWidth = width * 4;
  ctx.beginPath(); draw(ctx); ctx.stroke();
  ctx.globalAlpha = a;
  ctx.lineWidth = width;
  ctx.beginPath(); draw(ctx); ctx.stroke();
}

function glowFill(ctx, color, glow, draw) {
  ctx.fillStyle = color;
  if (glow) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath(); draw(ctx); ctx.fill();
    ctx.restore();
    return;
  }
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * 0.35;
  ctx.beginPath(); draw(ctx); ctx.fill();
  ctx.globalAlpha = a;
  ctx.beginPath(); draw(ctx); ctx.fill();
}

/**
 * Total length of a consist, so a caller can centre it or park its nose.
 */
export function tronConsistLength(consist = TRON_SPEC_CONSIST) {
  return consist.reduce((sum, car, i) => sum + (car.len || DEFAULT_LEN[car.kind] || DEFAULT_LEN.car)
    + (i ? GAP : 0), 0);
}

/**
 * THE NOSE. A Shinkansen profile in one closed path: the roof runs flat to
 * about the half-way point, then a long shallow curve carries it down and a
 * tighter one turns it into the tip, which sits LOW — nearer the underframe
 * than the roof — and returns along the bottom. `x` is the car's left edge,
 * `right` its right-most point.
 */
function nosePath(ctx, x, right, top, bottom, h) {
  const r = CORNER;
  const shoulder = x + (right - x) * 0.46;     // where the roof starts to fall
  ctx.moveTo(x, top + r);
  ctx.quadraticCurveTo(x, top, x + r, top);
  ctx.lineTo(shoulder, top);
  // Long shallow fall, then the tight turn into the tip.
  ctx.bezierCurveTo(right - (right - shoulder) * 0.42, top + h * 0.02,
    right - (right - shoulder) * 0.12, top + h * 0.34,
    right, top + h * 0.74);
  ctx.quadraticCurveTo(right, bottom, right - 6, bottom);
  ctx.lineTo(x + r, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - r);
  ctx.closePath();
}

/**
 * One car. `x` is its left edge in the caller's space, `railY` the top of the
 * rail (where the hubs sit), `h` the hull height above it. Returns the car's
 * length so the consist painter can walk forward.
 */
export function drawTronCar(ctx, car, x, railY, h, {
  palette = TRON_PALETTE.spec, glow = true, lit = 0.9, t = 0, wheels = false,
} = {}) {
  const len = car.len || DEFAULT_LEN[car.kind] || DEFAULT_LEN.car;
  const top = railY - h;
  const bottom = railY - 3;         // hull clears the rail by the hub radius
  const right = x + len;
  const engine = car.kind === 'engine';
  const tail = car.kind === 'tail';
  const taper = engine || tail;

  // HULL: matte slate with a crisp cyan outline. One path each way. A tail is
  // the nose mirrored about the car's own centre — same curve, drawn once.
  const hull = (c) => {
    if (!taper) return roundRect(c, x, top, len, bottom - top, CORNER);
    if (engine) return nosePath(c, x, right, top, bottom, h);
    c.save();
    c.translate(x + right, 0);
    c.scale(-1, 1);
    nosePath(c, x, right, top, bottom, h);
    c.restore();
    return undefined;
  };
  ctx.fillStyle = palette.hull;
  ctx.beginPath(); hull(ctx); ctx.fill();
  glowStroke(ctx, palette.line, 1.3, glow, hull);

  // WINDOWS: a perfectly straight row, small rounded rectangles, steady glow.
  // On the engine the row stops where the roof starts to fall, and one longer
  // pane at the shoulder is the driver's windscreen.
  const WW = 6;
  const WH = 5;
  const PITCH = 11;
  const wy = top + h * 0.28;
  const rowEnd = engine ? x + (right - x) * 0.46 - 4 : right - 8;
  const rowStart = tail ? x + (right - x) * 0.54 + 4 : x + 8;
  const n = Math.max(0, Math.floor((rowEnd - rowStart - WW) / PITCH) + 1);
  const rowW = n > 0 ? (n - 1) * PITCH + WW : 0;
  const left = rowStart + (rowEnd - rowStart - rowW) / 2;
  ctx.globalAlpha = lit;
  for (let i = 0; i < n; i++) {
    const wx = left + i * PITCH;
    glowFill(ctx, palette.glass, glow, (c) => roundRect(c, wx, wy, WW, WH, 1.6));
  }
  if (taper) {
    // The windscreen: raked with the taper, a single pane. On a tail it is the
    // rear cab's — a set that runs both ways has a driver at each end.
    const dir = engine ? 1 : -1;
    const sx = x + (right - x) * 0.5;
    glowFill(ctx, palette.glass, glow, (c) => {
      c.moveTo(sx, wy - 1);
      c.lineTo(sx + dir * 26, wy + 1);
      c.lineTo(sx + dir * 21, wy + WH + 2);
      c.lineTo(sx, wy + WH + 2);
      c.closePath();
    });
  }
  ctx.globalAlpha = 1;

  // CIRCUIT ACCENTS: two clean horizontal lines on the lower hull. The upper
  // one is continuous; the lower is broken into segments so the two are not
  // one thick stripe. On the engine both follow the nose down and stop.
  const y1 = top + h * 0.64;
  const y2 = top + h * 0.80;
  const trimEnd = engine ? right - 14 : right - 6;
  const trimStart = tail ? x + 14 : x + 6;
  glowStroke(ctx, palette.line, 1, glow, (c) => {
    c.moveTo(trimStart, y1);
    c.lineTo(trimEnd, y1);
  });
  ctx.strokeStyle = palette.dim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let sx = trimStart; sx < trimEnd - 10; sx += 22) {
    ctx.moveTo(sx, y2);
    ctx.lineTo(Math.min(sx + 14, trimEnd - 8), y2);
  }
  ctx.stroke();

  // WHEELS ARE OFF BY DEFAULT, and the question of whether to have them at all
  // is Peter's (22 Sep): the spec offered glowing hubs, the answer is no. A
  // Shinkansen skirts its bogies and a Tron machine rides light — hubs under a
  // hull this clean are a cartoon of a train, not a fast one. So the hull
  // skirts to a hair above the rail and the ride is a soft line of light
  // beneath it, the cushion it is floating on. `wheels: true` keeps the hubs
  // for the comparison tile and nothing else.
  if (wheels) {
    for (const f of [0.2, 0.8]) {
      const hx = x + len * f;
      glowStroke(ctx, palette.line, 1, glow, (c) => c.arc(hx, railY - 2.5, 2.5, 0, Math.PI * 2));
    }
  } else {
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * 0.55;
    glowStroke(ctx, palette.line, 1, glow, (c) => {
      c.moveTo(x + (tail ? 14 : 8), railY - 1);
      c.lineTo(right - (engine ? 14 : 8), railY - 1);
    });
    ctx.globalAlpha = a;
  }
  void t;
  return len;
}

/**
 * The whole consist, walked left to right from `x`. The last car in the list
 * is the front of the train, so the spec's [car, car, engine] puts the nose on
 * the right.
 */
export function drawTronTrain(ctx, x, railY, {
  consist = TRON_SPEC_CONSIST, h = 34, palette = TRON_PALETTE.spec, glow = true, lit = 0.9, t = 0,
  wheels = false,
} = {}) {
  let cx = x;
  for (const car of consist) {
    cx += drawTronCar(ctx, car, cx, railY, h, { palette, glow, lit, t, wheels }) + GAP;
  }
  return cx - GAP - x;
}

/**
 * THE ROOF VIEW of the same train: what the lane pass draws once the roof IS
 * the lane. The camera leaves `apron` world px below the groundline, so this
 * is the top slice of a car — the hull's stroke along the roof edge, the row
 * of windows, the upper circuit line — cut off where the frame ends. Same
 * palette, same window pitch, same line weights as the side-on painter, so
 * the pan from one to the other is a camera move and not a costume change.
 *
 * `x0..x1` is the span to cover in the caller's space; joins fall on
 * `carLen` from `phase`, and `gaps` (in the same space) are left open.
 */
export function drawTronRoofView(ctx, x0, x1, roofY, {
  apron = 19, carLen = 96, phase = 0, gaps = [], palette = TRON_PALETTE.neon, glow = false, lit = 0.9,
} = {}) {
  const bottom = roofY + apron;
  // Solid spans between gaps.
  const cuts = [...gaps].sort((a, b) => a.x - b.x);
  const spans = [];
  let cursor = x0;
  for (const g of cuts) {
    if (g.x > cursor) spans.push([cursor, g.x]);
    cursor = Math.max(cursor, g.x + g.w);
  }
  if (cursor < x1) spans.push([cursor, x1]);
  for (const [sx, ex] of spans) {
    // The hull slice, and its roof-edge stroke — the line the feet read.
    ctx.fillStyle = palette.hull;
    ctx.fillRect(sx, roofY, ex - sx, bottom - roofY);
    glowStroke(ctx, palette.line, 1.3, glow, (c) => {
      c.moveTo(sx, roofY + 0.5);
      c.lineTo(ex, roofY + 0.5);
    });
    // The window row, at the same height below the roof as the side-on car
    // puts it (0.28 of the hull), so the pan lands on the same glass.
    const WW = 6;
    const WH = 5;
    const PITCH = 11;
    const wy = roofY + 34 * 0.28 - 2;
    if (wy + WH < bottom) {
      ctx.globalAlpha = lit;
      const first = Math.floor((sx - phase) / PITCH) * PITCH + phase;
      for (let wx = first; wx < ex - WW; wx += PITCH) {
        if (wx < sx + 4) continue;
        // Skip the window that would straddle a join.
        const j = ((wx - phase) % carLen + carLen) % carLen;
        if (j < 8 || j > carLen - 8 - WW) continue;
        glowFill(ctx, palette.glass, glow, (c) => roundRect(c, wx, wy, WW, WH, 1.6));
      }
      ctx.globalAlpha = 1;
    }
    // The upper circuit line, if the apron reaches it.
    const y1 = roofY + 34 * 0.64 - 2;
    if (y1 < bottom) {
      glowStroke(ctx, palette.line, 1, glow, (c) => {
        c.moveTo(sx + 4, y1);
        c.lineTo(ex - 4, y1);
      });
    }
    // Joins: the un-drawn coupler, as a dark break in the hull with the roof
    // stroke stopping either side of it.
    const firstJoin = Math.floor((sx - phase) / carLen) * carLen + phase;
    for (let jx = firstJoin; jx < ex; jx += carLen) {
      if (jx <= sx + 2 || jx >= ex - 2) continue;
      ctx.fillStyle = palette.bg;
      ctx.fillRect(jx - 1.5, roofY - 1, 3, bottom - roofY + 1);
    }
  }
}

/**
 * LIGHT STREAMS under the train, moving backward: the minimalist stand-in for
 * speed the spec asks for. Deterministic per index so the field is the same
 * on every frame of a given `t`.
 */
export function drawTronSpeedStreaks(ctx, x0, x1, y, t, {
  palette = TRON_PALETTE.spec, count = 18, speed = 260, band = 22, glow = true,
} = {}) {
  const span = x1 - x0;
  for (let i = 0; i < count; i++) {
    const seed = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const s = Math.abs(seed);
    const len = 14 + s * 46;
    const sy = y + (i / count) * band + (s * 3 - 1.5);
    // Backward: a stream born at the right edge and swept off the left.
    const raw = (x1 - ((t * speed * (0.7 + s * 0.6)) + i * (span / count))) ;
    const sx = x0 + ((((raw - x0) % span) + span) % span);
    ctx.globalAlpha = 0.25 + s * 0.55;
    glowStroke(ctx, palette.line, 1, glow, (c) => {
      c.moveTo(sx, sy);
      c.lineTo(sx + len, sy);
    });
  }
  ctx.globalAlpha = 1;
}

// WHERE THE FLAT ROOF ENDS ON A TAPERED CAR, as a fraction of its length. The
// nose starts falling at 0.46, so a lane that stays flat has to stop there —
// and the mirror of it is where a tail's flat roof begins. These are exported
// because a level authoring a train-to-train jump needs them: the gap it can
// offer is measured from the end of one flat roof to the landing point on the
// next taper, not from tip to tip.
export const TRON_TAPER_SHOULDER = 0.46;

/**
 * The flat, runnable span of a car in the caller's space, given the car and its
 * left edge. Returns null for a car with no flat roof worth standing on.
 */
export function tronFlatRoof(car, x) {
  const len = car.len || DEFAULT_LEN[car.kind] || DEFAULT_LEN.car;
  if (car.kind === 'engine') return { x0: x, x1: x + len * TRON_TAPER_SHOULDER };
  if (car.kind === 'tail') return { x0: x + len * (1 - TRON_TAPER_SHOULDER), x1: x + len };
  return { x0: x, x1: x + len };
}

/**
 * THE LEVEL AS A LIST OF TRAINS. Lays `count` trains from `x`, each the same
 * uniform consist, separated by `gap` of open air — the jump between them.
 * Returns [{x, len, consist}], which is everything a caller needs to draw them
 * and everything a level needs to place its obstacles against.
 */
export function tronTrainRun(x, count, { consist = TRON_TRAIN, gap = 150 } = {}) {
  const len = tronConsistLength(consist);
  const out = [];
  for (let i = 0; i < count; i++) out.push({ x: x + i * (len + gap), len, consist });
  return out;
}
