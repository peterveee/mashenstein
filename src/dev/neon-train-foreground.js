// TERMINAL VELOCITY — the train as the FOREGROUND. Gallery mock-up only.
//
// This is docs/NEON_TRAIN_CARRIAGE_HANDOFF.md drawn, against the six-layer city
// that shipped this week. Nothing here is registered with the neon pack, no
// carriage is a collision surface, and no gap here is a hazard: the mock takes
// the run's OWN gap obstacles and dresses them, which is the whole argument —
// the train explains the level, it does not author it.
//
// THE ROOF IS THE GROUNDLINE. Every carriage top is GROUND_Y, exactly where the
// lane already is, so the runner physics, the hero's mark, the spawner's
// fairness contracts and every existing hitbox are untouched. What changes is
// what the player is told they are standing on.
//
// YOU ARE ON THE ROOF, SO YOU CANNOT SEE THE TRAIN. That is the whole problem,
// and the first cut walked straight into it: it drew a carriage SIDE — body,
// window strip, skirt — into the 19 world px the camera leaves below the
// groundline, and a row of lit windows under a fence rail is a building, not a
// train. From on top of your own train you can see none of that. You cannot
// see its windows, its livery, its wheels or its shape.
//
// So the train is told by the four things a roof CAN show, and the mock is
// built out of exactly those:
//
//   1. THE DECK, in perspective. The 19px below the lane is not a wall, it is
//      the roof receding toward the camera: walkway strips, panel joins, a
//      cable run down the spine, and the near roof edge with its grab rail.
//   2. THE GANGWAY HOODS at every carriage join. The one piece of rolling
//      stock that stands proud of a roof, and the mark that makes a consist
//      read as carriages rather than as one long deck.
//   3. THE OVERHEAD. Catenary masts passing at the near layer with a lit
//      contact wire strung between them, and a pantograph on the roof reaching
//      up to it. Nothing else in this game is under a wire.
//   4. THE TRAIN YOU ARE NOT ON. A whole one, cab and all, crossing the middle
//      distance — because the quickest way to tell someone what they are
//      standing on is to show them one of it from the outside.
//
// What is left below the lane is the one honest sight of a carriage's side:
// the END WALLS at a coupler gap, with the track flying past underneath.
import { ZOOM, GROUND_Y } from '../engine/camera.js';
import { H, W } from '../engine/renderer.js';
import { __testing as bg } from '../engine/stylePacks/index.js';
import { drawTronTrain, TRON_PALETTE } from './neon-tron-train.js';

const { backgroundPaintCoverage } = bg;

// Neon runs at BASE_SPEED 160 with a speedBonus of 0.3, so 208 world px/s at
// the start line and up to 333 at the ramp's cap. The handoff authors carriage
// length as TIME — the player experiences a runway, not a sprite — so these are
// its seconds resolved against the opening speed. At the cap the same carriage
// is worth 0.62 of the time it is worth here, which is the check the handoff
// asks for before any of this is real.
const NEON_SPEED = 160 * 1.3;
const secs = (s) => Math.round(NEON_SPEED * s);

export const NEON_CARRIAGES = Object.freeze({
  // "Roughly 0.8–1.3 seconds of uninterrupted running."
  long: Object.freeze({ id: 'long', len: secs(1.05), name: 'LONG PASSENGER', windows: 7 }),
  // "Roughly 0.5–0.9 seconds."
  standard: Object.freeze({ id: 'standard', len: secs(0.7), name: 'STANDARD', windows: 5 }),
  // "Roughly 0.25–0.45 seconds before its gap."
  short: Object.freeze({ id: 'short', len: secs(0.35), name: 'SHORT SERVICE', windows: 2 }),
  // Not a passenger car: a flatbed whose playable top is still the roof line.
  cargo: Object.freeze({ id: 'cargo', len: secs(0.6), name: 'CARGO / POWER', windows: 0 }),
});

const ORDER = ['long', 'standard', 'cargo', 'standard', 'short'];

const BODY = '#140f33';
const BODY_LIT = '#1d1748';
const SKIRT = '#0a0722';
// The roof, in three bands: the far edge catches the city, the near edge is
// turning away from it.
const DECK_FAR = '#221b55';
const DECK = '#1a1442';
const DECK_NEAR = '#120e30';
const DECK_SEAM = '#2b2266';
const DECK_RIB = '#241c58';
const WALKWAY = '#2e2670';
// The bellows between two carriages. Lighter than the deck so it stands proud.
const HOOD = '#2a2160';
const HOOD_RIB = '#161038';
// Bare metal: brighter than the body it is bolted to, and NOT cyan — the one
// ink reserved for lit horizontals at lane height is the roof's.
const LADDER = '#9a90e8';
const LADDER_LIT = '#e0dbff';
const EDGE = '#38d8f8';
const WINDOW = '#f6d33c';
const TRIM = '#e838f8';
const UNDER = '#05040f';

// Written out rather than calling ctx.roundRect: the gallery, the tests and the
// game all run this through different canvas implementations, and a corner
// radius is not worth a capability check.
function roundRectPath(ctx, x, y, w, h, r) {
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

function hash(i) {
  const x = Math.sin(i * 91.7 + 47.3) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * THE CONSIST IS DERIVED FROM THE LEVEL, NOT THE OTHER WAY ROUND.
 *
 * Every live gap in view is a coupler gap — that is the dressing this mock
 * exists to try. The solid spans between them are then filled with carriages,
 * and the one that ends at a gap is grown to at least a long car wherever the
 * span allows it, because the handoff's hardest rule is that a long roof
 * normally precedes a gap: the player has to see the edge coming.
 *
 * Returns carriages in world x, left to right, each {x0, x1, kind, endsAtGap}.
 */
export function neonTrainConsist(fromX, toX, gaps = [], lengthScale = 1) {
  const cuts = [...gaps]
    .filter((g) => Number.isFinite(g.x) && Number.isFinite(g.w))
    .sort((a, b) => a.x - b.x);
  const spans = [];
  let cursor = fromX;
  for (const gap of cuts) {
    if (gap.x > cursor) spans.push([cursor, gap.x, true]);
    cursor = Math.max(cursor, gap.x + gap.w);
  }
  if (cursor < toX) spans.push([cursor, toX, false]);

  const out = [];
  for (const [x0, x1, endsAtGap] of spans) {
    // Lay from a GRID rather than from the span's own left edge: a span that
    // begins off the left of the screen must not re-phase its carriages as the
    // camera moves, or the whole train shuffles while you look at it.
    const anchor = Math.floor(x0 / 64) * 64;
    let x = anchor;
    let i = Math.abs(Math.round(anchor / 64));
    const cars = [];
    while (x < x1) {
      const base = NEON_CARRIAGES[ORDER[i % ORDER.length]];
      // HOW OFTEN A JOIN COMES ROUND IS THE RHYTHM. At the handoff's own
      // lengths a long carriage is 218 world px and the camera shows 240, so
      // the player sees ONE join at a time and the consist reads as a strip
      // with an occasional notch. Shortening the cars puts two or three
      // verticals in every frame — and costs runway, which is a pacing
      // decision rather than a painting one.
      const kind = lengthScale === 1
        ? base : { ...base, len: Math.max(28, Math.round(base.len * lengthScale)) };
      // CLAMP BOTH ENDS TO THE SPAN. Clamping only the right-hand end let the
      // first carriage of a span start at the grid anchor BEHIND the gap that
      // opened the span — so a carriage was drawn straight across the hole it
      // was supposed to end at, windows and all.
      const from = Math.max(x, x0);
      const to = Math.min(x1, x + kind.len);
      if (to > from) cars.push({ x0: from, x1: to, kind, endsAtGap: false });
      x += kind.len;
      i += 1;
    }
    if (cars.length && endsAtGap) {
      const last = cars[cars.length - 1];
      last.endsAtGap = true;
      // A stub of a carriage against a coupler is a seam, not a car. Swallow
      // anything under a short car's length into its neighbour.
      if (last.x1 - last.x0 < NEON_CARRIAGES.short.len * 0.8 && cars.length > 1) {
        cars.splice(cars.length - 1, 1);
        cars[cars.length - 1].x1 = last.x1;
        cars[cars.length - 1].endsAtGap = true;
      }
    }
    for (const car of cars) if (car.x1 > car.x0) out.push(car);
  }
  return out;
}

// The rails under the train, seen only through a gap. They run at more than the
// train's own rate because that is what ground does when you look straight down
// at it from something moving — the handoff's "dark space below" is the one
// place this cabinet can show speed rather than state it.
function drawUnderTrain(ctx, camX, x0, x1, t) {
  const depth = H - GROUND_Y;
  ctx.fillStyle = UNDER;
  ctx.fillRect(x0 - camX, GROUND_Y, x1 - x0, depth);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - camX, GROUND_Y, x1 - x0, depth);
  ctx.clip();
  // Sleepers. 1.7x the lane's own scroll, and they are the only thing in the
  // picture allowed to strobe.
  ctx.fillStyle = '#1b1640';
  const pitch = 13;
  const drift = (camX * 1.7) % pitch;
  for (let x = x0 - camX - drift - pitch; x < x1 - camX + pitch; x += pitch) {
    ctx.fillRect(Math.round(x), GROUND_Y + 13, 7, 4);
  }
  // NO LIT HORIZONTAL LINES IN THE HOLE. NONE.
  //
  // This is the mistake that made the gap stop reading as a gap, and it was not
  // subtle once seen: the rails were drawn in the lane's own cyan, at the same
  // height as the carriage's underframe line, so they continued that line
  // straight across the opening. The eye follows an unbroken horizontal before
  // it reads anything else, and what it read was ground.
  //
  // THE ONLY LIT HORIZONTAL AT LANE HEIGHT IS THE ROOF, and it stops dead at
  // each lip. Everything in the hole is darker than the train and carries no
  // cyan: the rails are a shade off the dark, the sleepers strobe across them,
  // and the lit verticals on the two end walls are what frame it.
  ctx.fillStyle = '#120d30';
  ctx.fillRect(x0 - camX, GROUND_Y + 13, x1 - x0, 1);
  ctx.fillStyle = '#0d0924';
  ctx.fillRect(x0 - camX, GROUND_Y + 17, x1 - x0, 1);
  ctx.restore();
  void t;
}

// The end wall of a carriage where it meets a gap. This is the ONE place the
// side of a carriage is legitimately visible from the roof, so it carries what
// the rest of the train cannot: the corrugated end, the gangway, the buffers
// and the coupler reaching into the hole.
function drawCarriageEnd(ctx, x, dir, M) {
  // dir = +1 for a wall facing right (the take-off lip), -1 for the landing.
  const face = dir > 0 ? x - 4 : x;
  ctx.fillStyle = BODY;
  ctx.fillRect(face, GROUND_Y, 4, M.sideBottom);
  ctx.fillStyle = SKIRT;
  ctx.fillRect(face, GROUND_Y + 2, 4, M.sideBottom - 4);
  // The end keeps the rectangle's own two lit edges, or the box falls open
  // exactly where the player is about to look hardest.
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = EDGE;
  ctx.fillRect(face, GROUND_Y + M.sideTop, 4, 1);
  ctx.fillRect(face, GROUND_Y + M.sideBottom, 4, 1);
  ctx.globalAlpha = 1;
  // THE VERTICAL AT THE HOLE, full depth and brighter than a join: this edge is
  // the one the player is about to jump off, so it gets the strongest line on
  // the lane.
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = dir > 0 ? '#fff' : EDGE;
  ctx.fillRect(dir > 0 ? face + 3 : face, GROUND_Y, 1, M.underH);
  ctx.globalAlpha = 1;
  // The gangway hood, cut in half by the coupler: a ribbed bellows standing
  // proud of the deck. Half a hood on each side of a gap says "these two
  // things were joined" better than any amount of paint.
  ctx.fillStyle = HOOD;
  ctx.fillRect(dir > 0 ? x - 5 : x, GROUND_Y - 6, 5, 7);
  ctx.fillStyle = HOOD_RIB;
  for (let k = 0; k < 2; k++) {
    ctx.fillRect(dir > 0 ? x - 4 + k * 2 : x + 1 + k * 2, GROUND_Y - 5, 1, 5);
  }
  // THE LIP IS THE TELEGRAPH, and on the take-off side it is the brightest
  // mark on the lane. Three hazard chevrons on the deck lead into it.
  if (dir > 0) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 2, GROUND_Y - 1, 3, 2);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = WINDOW;
    for (let k = 0; k < 3; k++) ctx.fillRect(x - 10 - k * 5, GROUND_Y + 1, 3, 2);
    ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = EDGE;
    ctx.fillRect(x, GROUND_Y - 1, 3, 2);
    ctx.globalAlpha = 1;
  }
  // THE END LADDER. Every carriage has one, it is the most carriage-shaped
  // thing there is after the window, and — the reason it earns its place here —
  // it is a VERTICAL mark inside the hole. Two stiles and four rungs on the
  // face that looks into the gap, on both ends, so the opening is framed by
  // something with a purpose rather than by two blank walls.
  //
  // DRAWN FLAT ON PURPOSE. A side-on version was tried — one stile down the
  // wall with the rungs projecting into the gap, which is what you would
  // actually see of a ladder on a wall being viewed edge-on — and it lost on
  // Peter's call: the pair of stiles is what makes the shape say LADDER at this
  // size, and side-on there is only one of them. Being right about the
  // projection is worth nothing if the mark stops reading.
  const lx = dir > 0 ? x - 8 : x + 3;
  // A shadow behind it first, so bare metal reads against a lit window row as
  // well as against the dark of the hole.
  ctx.fillStyle = UNDER;
  ctx.fillRect(lx - 1, GROUND_Y - 1, 9, M.sideBottom + 4);
  ctx.fillStyle = LADDER;
  ctx.fillRect(lx, GROUND_Y + 1, 2, M.sideBottom + 1);
  ctx.fillRect(lx + 5, GROUND_Y + 1, 2, M.sideBottom + 1);
  for (let k = 0; k < 4; k++) {
    const ry = GROUND_Y + 3 + k * Math.max(3, Math.round((M.sideBottom - 3) / 4));
    if (ry > GROUND_Y + M.sideBottom) break;
    ctx.fillRect(lx, ry, 7, 1);
  }
  // The grab iron standing proud of the roof, which is what a ladder is FOR:
  // it says this edge is climbed, so it is an edge.
  ctx.fillStyle = LADDER_LIT;
  ctx.fillRect(lx, GROUND_Y - 4, 2, 5);
  ctx.fillRect(lx + 5, GROUND_Y - 4, 2, 5);
  ctx.fillRect(lx, GROUND_Y - 4, 7, 1);
  // Buffers and the coupler shaft, at buffer height in the hole.
  ctx.fillStyle = '#2a2160';
  ctx.fillRect(dir > 0 ? x : x - 9, GROUND_Y + 9, 9, 3);
  for (const by of [GROUND_Y + 6, GROUND_Y + 13]) {
    ctx.fillRect(dir > 0 ? x : x - 4, by, 4, 2);
  }
  ctx.fillStyle = TRIM;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(dir > 0 ? x + 7 : x - 9, GROUND_Y + 9, 2, 3);
  ctx.globalAlpha = 1;
}

// A CARRIAGE IS A RECTANGLE WITH LIT WINDOWS IN IT, and the deck-only version
// was wrong about what this drawing is for.
//
// The physics were right — from on top of your own train you cannot see its
// windows — and the picture was still unreadable, because the thing being drawn
// is not a train, it is a SIGN THAT SAYS TRAIN. Four sides and a row of lit
// glass is the whole vocabulary; a roof in perspective with no bottom edge and
// no windows is a floor, and a floor is what everything else in this game
// already is.
//
// So the carriage is boxed. The roof keeps a thin band at the top, where the
// hero's feet are, and below it the side gets what it needs: body, a bright
// window row, and an UNDERFRAME LINE — the bottom edge is what turns a strip
// into a rectangle. Under that, dark, with the bogies in it.
// THE ONE NUMBER THAT DECIDES WHETHER THIS READS AS A TRAIN, and it is not an
// art decision — it is the camera's. The frame is 270 tall, the groundline is
// at 232 and the lane is drawn through the run's 2x camera, so there are
// NINETEEN WORLD PIXELS below the roof and that is the whole carriage.
//
// A rectangle needs four sides and room for the glass to sit inside them.
// Nineteen buys a roof, a window and a bottom edge with nothing between them,
// which is why the version of this drawn at the shipped groundline reads as a
// lit band however the marks are arranged — while the train on the VIADUCT in
// the same frame, which has its whole box on screen, reads instantly.
//
// So the depth is a parameter, and the sheet draws the same carriage at the
// apron the cabinet has today and at the one it would have if Neon's lane sat
// higher in the frame. That is a camera change, not a paint change, and it is
// Peter's call — this file just shows both.
export const NEON_APRON_SHIPPED = 19;
const ROOF_H = 4;         // the deck itself, where the feet land

function carriageMetrics(apron) {
  const depth = Math.max(12, apron);
  return {
    roofH: ROOF_H,
    sideTop: ROOF_H,
    // The side takes what is left after the roof and the dark under the train,
    // which keeps its share honest at any depth.
    sideBottom: Math.round(ROOF_H + (depth - ROOF_H) * 0.68),
    underH: depth,
  };
}

function drawCarriage(ctx, camX, car, t, M) {
  const x = car.x0 - camX;
  const w = car.x1 - car.x0;
  const { kind } = car;
  // Everything under the carriage first, so the box is drawn onto a dark
  // ground rather than over the sky.
  ctx.fillStyle = UNDER;
  ctx.fillRect(x, GROUND_Y + M.sideBottom, w, M.underH - M.sideBottom);
  // The roof, still in perspective — two bands, because it is only four px and
  // three was a gradient nobody could see.
  ctx.fillStyle = DECK_FAR;
  ctx.fillRect(x, GROUND_Y, w, 2);
  ctx.fillStyle = DECK;
  ctx.fillRect(x, GROUND_Y + 2, w, 2);
  // THE CANTRAIL: the lit line where roof meets side. This is the top edge of
  // the rectangle and it is the brightest thing on the carriage after the
  // glass.
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = EDGE;
  ctx.fillRect(x, GROUND_Y + M.sideTop, w, 1);
  ctx.globalAlpha = 1;
  // The side.
  ctx.fillStyle = BODY;
  ctx.fillRect(x, GROUND_Y + M.sideTop + 1, w, M.sideBottom - M.sideTop - 1);
  // THE WINDOWS, and they are the point. Big enough to count from across the
  // frame: seven wide, six tall, on an eleven px pitch, in a frame that is
  // lighter than the body so the glass has a surround even when it is dark.
  // DOORS FIRST UP HERE TOO, and the windows in what is left between them —
  // same rule, same reason: the end window was landing a pixel from the
  // doorframe and the row read as five windows of two different sizes.
  const DW = 12;
  const dTop = GROUND_Y + M.sideTop + 1;
  const dBot = GROUND_Y + M.sideBottom - 1;
  const doors = kind.windows && w > 70 ? [x + 8, x + w - 8 - DW] : [];
  for (const dx0 of doors) {
    const dx = Math.round(dx0);
    // The recess, not a pane: darker than the body, edged once round the
    // opening rather than lined down every vertical.
    ctx.fillStyle = UNDER;
    ctx.fillRect(dx, dTop, DW, dBot - dTop);
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = EDGE;
    ctx.fillRect(dx, dTop, DW, 1);
    ctx.fillRect(dx, dTop, 1, dBot - dTop);
    ctx.fillRect(dx + DW - 1, dTop, 1, dBot - dTop);
    ctx.globalAlpha = 1;
    ctx.fillStyle = SKIRT;
    ctx.fillRect(dx + 2, dTop + 1, DW - 4, dBot - dTop - 2);
    ctx.fillStyle = UNDER;
    ctx.fillRect(dx + DW / 2 - 0.5, dTop + 1, 1, dBot - dTop - 2);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#bfe8ff';
    for (const leaf of [0, 1]) {
      roundRectPath(ctx, dx + 3 + leaf * (DW / 2 - 1), dTop + 2, DW / 2 - 4, 4, 1.2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = WINDOW;
    ctx.fillRect(dx + 1, dBot - 2, DW - 2, 1);
    ctx.globalAlpha = 1;
  }
  if (kind.windows) {
    // THE SAME SLEEK LANGUAGE AS THE SIDE-ON SET, at a fifth of the size: a
    // continuous dark glazing band with thin dividers, not a row of separate
    // panes. Up here it does a second job — a band runs THROUGH the carriage
    // and stops at the join, so the full-depth vertical at each join has
    // something to interrupt.
    const gTop = GROUND_Y + M.sideTop + 2;
    const gH = Math.max(4, M.sideBottom - M.sideTop - 5);
    const CLEAR = 8;
    const bayFrom = doors.length ? doors[0] + DW + CLEAR : x + 10;
    const bayTo = doors.length ? doors[1] - CLEAR : x + w - 10;
    if (bayTo > bayFrom) {
      ctx.fillStyle = '#0d0a24';
      ctx.fillRect(bayFrom, gTop, bayTo - bayFrom, gH);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = EDGE;
      ctx.fillRect(bayFrom, gTop, bayTo - bayFrom, 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = BODY;
      for (let sx = bayFrom + 15; sx < bayTo - 6; sx += 15) {
        ctx.fillRect(Math.round(sx), gTop, 2, gH);
      }
      // A third of the bays lit, warm, on the carriage's own seed.
      for (let i = 0; bayFrom + 2 + i * 15 < bayTo - 14; i++) {
        if (hash(car.x0 * 0.17 + i) > 0.36) continue;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = WINDOW;
        ctx.fillRect(Math.round(bayFrom + 2 + i * 15), gTop + 1, 12, gH - 2);
        ctx.globalAlpha = 1;
      }
    }
  } else {
    // Cargo: a ribbed flank instead of glass, so the silhouette differs at a
    // glance without the roof line moving a pixel.
    ctx.fillStyle = BODY_LIT;
    for (let i = 0; i < Math.round(w / 12); i++) {
      ctx.fillRect(Math.round(x + 8 + i * 12), GROUND_Y + M.sideTop + 2, 5, 8);
    }
  }
  // THE UNDERFRAME: the bottom edge, and the line that makes the rectangle a
  // rectangle. Lit, because an unlit bottom edge is just where the dark starts.
  ctx.fillStyle = SKIRT;
  ctx.fillRect(x, GROUND_Y + M.sideBottom - 2, w, 2);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = EDGE;
  ctx.fillRect(x, GROUND_Y + M.sideBottom, w, 1);
  ctx.globalAlpha = 1;
  // Bogies, hanging below the underframe in the dark.
  ctx.fillStyle = SKIRT;
  for (const f of [0.18, 0.82]) {
    const bx = Math.round(x + w * f);
    ctx.fillRect(bx - 8, GROUND_Y + M.sideBottom + 1, 16, 2);
  }
  // Roof equipment: low, and only on the four px of roof there is.
  const blisters = kind.id === 'cargo' ? 0 : Math.max(1, Math.round(w / 100));
  for (let i = 0; i < blisters; i++) {
    const bx = Math.round(x + w * ((i + 0.5) / blisters)) - 10;
    ctx.fillStyle = BODY_LIT;
    ctx.fillRect(bx, GROUND_Y + 1, 20, 3);
  }
  if (kind.id === 'cargo') {
    const bx = Math.round(x + w * 0.35);
    ctx.fillStyle = BODY_LIT;
    ctx.fillRect(bx, GROUND_Y, 28, 4);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = TRIM;
    ctx.fillRect(bx, GROUND_Y - 1, 28, 1);
    ctx.globalAlpha = 1;
  }
  // THE JOIN. Two ends and a gangway, drawn as one dark column with the hood
  // proud of the roof: the vertical that closes this rectangle and opens the
  // next one.
  if (!car.endsAtGap) {
    const j = Math.round(x + w);
    // THE JOIN IS A VERTICAL LINE, AND IT RUNS ALL THE WAY DOWN. Contained
    // inside the window band it was a dark notch between two rows of glass and
    // the consist still read as one long lit strip — the eye needs a line that
    // crosses the whole carriage, top to bottom, to accept that one thing has
    // ended and another has begun. This is the mark that turns a band into
    // carriages, so it is the strongest one down here.
    ctx.fillStyle = UNDER;
    ctx.fillRect(j - 4, GROUND_Y, 8, M.underH);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = EDGE;
    ctx.fillRect(j - 5, GROUND_Y, 1, M.underH);
    ctx.fillRect(j + 4, GROUND_Y, 1, M.underH);
    ctx.globalAlpha = 1;
    ctx.fillStyle = HOOD;
    ctx.fillRect(j - 5, GROUND_Y - 5, 10, 8);
    ctx.fillStyle = HOOD_RIB;
    for (let k = 0; k < 4; k++) ctx.fillRect(j - 4 + k * 2, GROUND_Y - 4, 1, 6);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = EDGE;
    ctx.fillRect(j - 5, GROUND_Y - 6, 10, 1);
    ctx.globalAlpha = 1;
  }
  void t;
}

/**
 * The whole foreground, in place of neonPack.ground(). Signature deliberately
 * matches the pack's so a winner ports across without a new seam.
 */
export function drawNeonTrainGround(ctx, camX, cab, obstacles = [], overhangs = [],
  t = 0, viewW = W, apron = NEON_APRON_SHIPPED, lengthScale = 1) {
  const cov = backgroundPaintCoverage(ctx);
  // World x range the lane pass has to cover, with a carriage of margin so no
  // carriage or coupler is born inside the picture.
  const fromX = camX + (cov.left / ZOOM) - NEON_CARRIAGES.long.len;
  const toX = camX + Math.max(viewW, cov.width / ZOOM) + NEON_CARRIAGES.long.len;
  const gaps = (obstacles || [])
    .filter((ob) => ob && ob.live && ob.def && ob.def.isGap)
    .map((ob) => ({ x: ob.x, w: ob.w }));

  // The hole first: everything else is drawn over it, so a carriage can never
  // leave a seam across a gap it is supposed to end at.
  ctx.fillStyle = UNDER;
  ctx.fillRect(cov.left, GROUND_Y, cov.width, H - GROUND_Y);
  for (const gap of gaps) drawUnderTrain(ctx, camX, gap.x, gap.x + gap.w, t);

  const M = carriageMetrics(apron);
  for (const car of neonTrainConsist(fromX, toX, gaps, lengthScale)) {
    drawCarriage(ctx, camX, car, t, M);
  }
  // Couplers and lips last, so they sit over both carriages they belong to.
  for (const gap of gaps) {
    drawCarriageEnd(ctx, gap.x - camX, 1, M);
    drawCarriageEnd(ctx, gap.x + gap.w - camX, -1, M);
  }
  // The roof's own lit edge — the same cyan rule the cabinet already draws at
  // the groundline, kept because it is the line the player's feet read.
  ctx.fillStyle = EDGE;
  for (const car of neonTrainConsist(fromX, toX, gaps, lengthScale)) {
    ctx.fillRect(car.x0 - camX, GROUND_Y - 1, car.x1 - car.x0, 1);
  }
  void cab;
  void overhangs;
}

/**
 * Roof furniture, for the mock only. In the game these are OBSTACLES — they
 * have boxes, the spawner deals them and the fairness sim judges them — so this
 * paints the LOOK of a roof event and nothing else, to answer one question:
 * does a vent read as a jump and a gantry as a slide, on a roof, at this size?
 */
export function drawNeonRoofFurniture(ctx, camX, kind, worldX) {
  const x = Math.round(worldX - camX);
  if (kind === 'vent') {
    ctx.fillStyle = BODY;
    ctx.fillRect(x - 7, GROUND_Y - 9, 14, 9);
    ctx.fillStyle = DECK_RIB;
    for (let i = 0; i < 3; i++) ctx.fillRect(x - 5 + i * 4, GROUND_Y - 7, 2, 5);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = EDGE;
    ctx.fillRect(x - 7, GROUND_Y - 10, 14, 1);
    ctx.globalAlpha = 1;
    return;
  }
  if (kind === 'hatch') {
    ctx.fillStyle = BODY;
    ctx.fillRect(x - 9, GROUND_Y - 5, 18, 5);
    ctx.fillStyle = WINDOW;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x - 6, GROUND_Y - 4, 12, 2);
    ctx.globalAlpha = 1;
    return;
  }
  if (kind === 'gantry') {
    // A signal gantry spanning the track: legs outside the lane, and the bar
    // the player slides under is the only part at hero height.
    ctx.fillStyle = UNDER;
    ctx.fillRect(x - 26, GROUND_Y - 44, 4, 44);
    ctx.fillRect(x + 22, GROUND_Y - 44, 4, 44);
    ctx.fillRect(x - 26, GROUND_Y - 24, 52, 4);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = EDGE;
    ctx.fillRect(x - 26, GROUND_Y - 20, 52, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#5ce07d';
    ctx.fillRect(x - 2, GROUND_Y - 31, 3, 3);
  }
}

/**
 * THE OVERHEAD LINE. Masts passing at the near layer with a lit contact wire
 * strung between them, and the registration arms that hold it over the track.
 *
 * This is the cheapest "train" in the whole mock and probably the strongest:
 * nothing else in this game happens under a wire. It is drawn ABOVE the lane,
 * so it lives in the background pass rather than the ground pass, and it is
 * held clear of the hazard band — a target's crown is at screen y 130 and the
 * wire sits at 74, with the masts as near-black silhouette either side.
 */
export function drawNeonCatenary(ctx, camX, t, { wireY = 74, span = 168 } = {}) {
  const cov = backgroundPaintCoverage(ctx);
  const fromX = camX + cov.left / ZOOM - span;
  const first = Math.floor(fromX / span) * span;
  const toX = camX + cov.width / ZOOM + span;
  ctx.save();
  for (let wx = first; wx < toX; wx += span) {
    const x = Math.round(wx - camX);
    // The mast. THIN, and its foot behind the train: a catenary mast stands
    // beside the track, so the consist passes in front of its base. Drawn at 3
    // px over the top of everything it was a black bar down the middle of the
    // picture — the caller draws this pass BEFORE the roof for that reason.
    ctx.fillStyle = UNDER;
    ctx.fillRect(x, wireY - 16, 2, GROUND_Y - wireY + 24);
    // The registration arm reaching out over the track.
    ctx.fillRect(x, wireY - 16, 26, 2);
    ctx.fillRect(x + 24, wireY - 16, 2, 10);
    // A dim lit edge down the mast, so it reads against the darkest sky
    // without becoming a second tube.
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = EDGE;
    ctx.fillRect(x, wireY - 16, 1, GROUND_Y - wireY + 24);
    ctx.globalAlpha = 1;
    // A lamp on the mast head, on the same slow blink as the city's.
    ctx.fillStyle = Math.sin(t * 1.9 + wx * 0.01) > 0 ? '#5ce07d' : 'rgba(92,224,125,0.2)';
    ctx.fillRect(x, wireY - 20, 2, 2);
  }
  // THE CONTACT WIRE, in one pass across the whole view: a catenary sags
  // between its masts and the contact wire under it runs level, which is the
  // silhouette everyone knows even if nobody can name it.
  const sagAt = (worldX) => {
    const phase = ((worldX % span) + span) % span / span;
    return wireY - 12 + Math.sin(phase * Math.PI) * -5;
  };
  ctx.strokeStyle = 'rgba(56,216,248,0.30)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let wx = first; wx <= toX; wx += 8) {
    const x = wx - camX;
    if (wx === first) ctx.moveTo(x, sagAt(wx)); else ctx.lineTo(x, sagAt(wx));
  }
  ctx.stroke();
  // The contact wire itself: level, brighter, and the thing the pantograph
  // actually touches.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = EDGE;
  ctx.fillRect(cov.left, wireY, cov.width, 1);
  ctx.globalAlpha = 1;
  // Droppers between the two.
  ctx.strokeStyle = 'rgba(56,216,248,0.18)';
  ctx.beginPath();
  for (let wx = first; wx <= toX; wx += 21) {
    const x = Math.round(wx - camX) + 0.5;
    ctx.moveTo(x, sagAt(wx));
    ctx.lineTo(x, wireY);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * The pantograph on the player's own roof, reaching up to that wire. Drawn as
 * roof furniture rather than as part of a carriage, because where it goes is a
 * level decision — it must never stand where a hazard read wants to be.
 */
export function drawNeonPantograph(ctx, camX, worldX, { wireY = 74 } = {}) {
  const x = Math.round(worldX - camX);
  const baseY = GROUND_Y + 2;
  ctx.save();
  ctx.strokeStyle = '#2a2160';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  // The classic single-arm: up, back, and the pan across the top.
  ctx.beginPath();
  ctx.moveTo(x - 7, baseY);
  ctx.lineTo(x + 5, wireY + 16);
  ctx.lineTo(x - 4, wireY + 3);
  ctx.stroke();
  ctx.fillStyle = UNDER;
  ctx.fillRect(x - 12, baseY - 2, 24, 3);
  // The pan, and the spark where it meets the wire — the one place this
  // cabinet gets to put a live electrical contact on screen.
  ctx.fillStyle = '#3a2f7a';
  ctx.fillRect(x - 11, wireY + 1, 16, 2);
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#d8f8ff';
  ctx.fillRect(x - 5, wireY - 1, 4, 2);
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * THE TRAIN YOU ARE NOT ON: a whole one, cab and all, on a viaduct across the
 * middle distance. The quickest way to tell a player what they are standing on
 * is to show them one of it from the outside — everything else in this mock is
 * a detail of a thing they cannot see.
 *
 * It sits above the hazard band and behind the smog, so it belongs to the city
 * rather than to the lane. `factor` is its parallax; the default is the rate
 * the shipped near wireframe row runs at, so it reads as part of the city.
 */
export function drawNeonParallelTrain(ctx, camX, t, { deckY = GROUND_Y - 104, factor = 0.3 } = {}) {
  const cov = backgroundPaintCoverage(ctx);
  const shift = camX * factor;
  ctx.save();
  // The viaduct it runs on, with piers marching off into the city.
  ctx.fillStyle = '#140e38';
  ctx.fillRect(cov.left, deckY + 8, cov.width, 4);
  const pierSpan = 88;
  for (let i = -1; i < cov.width / pierSpan + 3; i++) {
    const raw = i * pierSpan - shift;
    const x = cov.left + (((raw % (cov.width + pierSpan * 3)) + cov.width + pierSpan * 3)
      % (cov.width + pierSpan * 3)) - pierSpan;
    ctx.fillRect(Math.round(x), deckY + 12, 6, 30);
  }
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = EDGE;
  ctx.fillRect(cov.left, deckY + 7, cov.width, 1);
  ctx.globalAlpha = 1;
  // THE SAME TRAIN, FAR AWAY. drawTronTrain at a third of the height, in the
  // cabinet's ink, no wheels — the distant one has to be recognisably the one
  // you are standing on, or the opening shot is showing you a different train.
  const period = 13;
  const phase = (t % period) / period;
  const far = [{ kind: 'car', len: 34 }, { kind: 'car', len: 34 }, { kind: 'car', len: 34 }, { kind: 'engine', len: 44 }];
  const len = far.reduce((n, c) => n + c.len + 3, -3);
  const tx = cov.left - len + phase * (cov.width + len * 2) - shift * 0.12;
  drawTronTrain(ctx, tx, deckY + 8, {
    consist: far, h: 12, palette: TRON_PALETTE.neon, glow: false, lit: 0.7, t,
  });
  ctx.restore();
}

// ------------------------------------------------ boarding and arriving
//
// THE LANE IS AT GROUND_Y AND THE CAMERA PINS IT THERE. So "climbing onto the
// train" cannot mean the roof is higher than the lane — after boarding, the
// roof IS the lane. What a boarding shows is the OTHER side of that: the
// platform the stage starts on sits a little below the roof it hands you to,
// and the rise between them is the moment.
//
// Ten world px, which is half the apron the camera allows and about two thirds
// of the game's own level-crossing rise (CROSSING_RISE is 14). Small enough to
// be a step up rather than a climb, big enough to see.
export const NEON_PLATFORM_DROP = 10;

const PLATFORM = '#1a1442';
const PLATFORM_EDGE = '#f6d33c';
const CANOPY = '#120d30';

/**
 * A station platform: deck, the yellow edge line every platform in the world
 * has, canopy on posts, and a lamp between each pair. `roofY` is the lane the
 * train's roofs are on; the platform sits NEON_PLATFORM_DROP below it unless
 * told otherwise, which is what makes the boarding a step up and the arrival a
 * step down.
 */
export function drawNeonPlatform(ctx, camX, x0, x1, {
  drop = NEON_PLATFORM_DROP, canopy = true, t = 0,
} = {}) {
  const y = GROUND_Y + drop;
  const w = x1 - x0;
  const x = x0 - camX;
  ctx.fillStyle = PLATFORM;
  ctx.fillRect(x, y, w, H - y);
  // THE EDGE LINE. Amber, because it is the one thing on a platform that is
  // always the same colour, and because nothing else down here is.
  ctx.fillStyle = PLATFORM_EDGE;
  ctx.fillRect(x, y, w, 1);
  ctx.globalAlpha = 0.35;
  ctx.fillRect(x, y + 2, w, 1);
  ctx.globalAlpha = 1;
  // Tactile paving: the studs along the edge, which is the detail that says
  // platform rather than pavement.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#3a3080';
  for (let sx = 4; sx < w - 3; sx += 6) ctx.fillRect(Math.round(x + sx), y + 4, 2, 2);
  ctx.globalAlpha = 1;
  if (!canopy) return;
  // The canopy, its posts, and a lamp under each bay. Held high enough to clear
  // a jumping hero and everything the lane can throw at him.
  const capY = GROUND_Y - 74;
  ctx.fillStyle = CANOPY;
  ctx.fillRect(x, capY, w, 5);
  for (let px = 18; px < w - 10; px += 76) {
    ctx.fillRect(Math.round(x + px), capY + 5, 3, y - capY - 5);
    // The lamp: warm, and the only warm light on the lane.
    const lampX = Math.round(x + px + 38);
    ctx.fillStyle = CANOPY;
    ctx.fillRect(lampX - 4, capY + 5, 8, 2);
    const glow = ctx.createRadialGradient(lampX, capY + 9, 0, lampX, capY + 9, 26);
    glow.addColorStop(0, 'rgba(246,211,60,0.30)');
    glow.addColorStop(1, 'rgba(246,211,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lampX - 26, capY + 5, 52, 34);
    ctx.fillStyle = '#fff2c0';
    ctx.fillRect(lampX - 2, capY + 7, 4, 2);
    ctx.fillStyle = CANOPY;
  }
  void t;
}

/**
 * The steps up from the platform to the first carriage roof. Four treads over
 * the drop, with a handrail — the handrail is what stops it reading as a
 * staircase-shaped piece of scenery and starts it reading as a way up.
 */
export function drawNeonBoardingSteps(ctx, camX, worldX, { drop = NEON_PLATFORM_DROP } = {}) {
  const x = Math.round(worldX - camX);
  const treads = 4;
  const rise = drop / treads;
  const run = 7;
  ctx.fillStyle = '#241c58';
  for (let i = 0; i < treads; i++) {
    const ty = GROUND_Y + drop - (i + 1) * rise;
    ctx.fillRect(x + i * run, ty, run + 1, drop - i * rise);
    ctx.fillStyle = '#38d8f8';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x + i * run, ty, run + 1, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#241c58';
  }
  // Handrail, climbing with the treads.
  ctx.strokeStyle = '#9a90e8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, GROUND_Y + drop - 11);
  ctx.lineTo(x + treads * run, GROUND_Y - 11);
  ctx.stroke();
  for (let i = 0; i <= treads; i += 2) {
    const px = x + i * run;
    const py = GROUND_Y + drop - i * rise;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - 11);
    ctx.stroke();
  }
}

/**
 * THE OPTION THAT LOST (22 Sep 2026). Kept as the record; nothing draws it.
 *
 * The other way up: the game's own spring pad, on the platform, with the arc it
 * throws. `springPad` is a shipped obstacle (16x6, isSpring) with a contract
 * the lane already understands — run over it and it pays out — so this costs no
 * new mechanic at all, which is most of its argument.
 */
export function drawNeonBoardingSpring(ctx, camX, worldX, {
  drop = NEON_PLATFORM_DROP, arc = true,
} = {}) {
  const x = Math.round(worldX - camX);
  const y = GROUND_Y + drop;
  // The pad, at the shipped 16x6.
  ctx.fillStyle = '#2a2160';
  ctx.fillRect(x - 8, y - 6, 16, 6);
  ctx.fillStyle = '#5ce07d';
  ctx.fillRect(x - 8, y - 7, 16, 2);
  ctx.globalAlpha = 0.5;
  ctx.fillRect(x - 6, y - 4, 12, 1);
  ctx.globalAlpha = 1;
  // The coil, so it reads as sprung rather than as a step.
  ctx.strokeStyle = '#9a90e8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(x - 5, y - 1 - i);
    ctx.lineTo(x + 5, y - 1.6 - i);
  }
  ctx.stroke();
  if (!arc) return;
  // The trajectory, as a dotted guide — mock only, and the reason the card
  // exists: the launch has to clear the drop AND land on roof, and that is a
  // number the fairness sim decides, not a painter.
  ctx.fillStyle = 'rgba(92,224,125,0.55)';
  for (let i = 1; i < 14; i++) {
    const u = i / 14;
    const ax = x + u * 54;
    const ay = y - 6 - (Math.sin(u * Math.PI) * 42 + u * drop);
    ctx.fillRect(Math.round(ax), Math.round(ay), 2, 2);
  }
}

// ---------------------------------------------------- the opening, and steps
//
// THE OPENING SHOT IS THE ONE PLACE THE WHOLE TRAIN FITS, and the reason is the
// same camera fact that has fought every other part of this: the lane is at
// GROUND_Y and there are only 19 world px below it. But there are a hundred and
// sixteen ABOVE it. So if the stage OPENS with the lane on the PLATFORM, the
// train is above the lane rather than below it, and its whole side — roof,
// glass, doors, underframe, bogies — is in frame with room to spare.
//
// Then the hero climbs, the camera pans up by the carriage's own height, and
// the roof becomes the lane for the rest of the stage. One pan, at the start,
// held to the tape. Everything the roof view cannot say gets said in the first
// four seconds, by showing it.
export const NEON_CARRIAGE_HEIGHT = 34;

/**
 * Carriages seen from the platform: the whole rectangle. Same vocabulary as the
 * roof view — window row, doors, underframe, gangway between cars — at the size
 * it was always meant to be read at. `railY` is the top of the rail; the body
 * sits on it and the roof lands NEON_CARRIAGE_HEIGHT above.
 */
export function drawNeonTrainSideOn(ctx, camX, fromX, toX, {
  railY = GROUND_Y, height = NEON_CARRIAGE_HEIGHT, lengthScale = 1, t = 0,
} = {}) {
  // SLEEK MEANS FEWER LINES, LONGER ONES, AND A DARK BODY.
  //
  // The first cut was a commuter coach: square corners, a row of separate
  // portholes, bogies and wheels hanging out underneath, a different edge on
  // every part. What replaced it is the shape this cabinet should have been all
  // along — a high-speed set, seen the way this game draws light:
  //
  //   - the body is DARK and the light is the drawing. One continuous line
  //     along the waist, running the whole consist and crossing the gangways,
  //     is what the eye follows; everything else is quieter than it.
  //   - the glass is a BAND, not a row of holes. A continuous dark strip with
  //     thin dividers reads as one long window and as speed; separate rounded
  //     rectangles read as a bus.
  //   - the roof is RADIUSED and the underframe is SKIRTED. No square corners,
  //     no wheels on show — a skirt to the rail is most of what makes a modern
  //     train look fast standing still.
  const roofY = railY - height;
  const cars = neonTrainConsist(fromX, toX, [], lengthScale);
  const R = 5;                 // roof corner radius
  const waistY = roofY + height * 0.62;
  for (const car of cars) {
    const x = car.x0 - camX;
    const w = car.x1 - car.x0;
    // The shell: radiused roof corners, skirt tucked in at the bottom.
    ctx.fillStyle = BODY;
    ctx.beginPath();
    ctx.moveTo(x, roofY + R);
    ctx.quadraticCurveTo(x, roofY, x + R, roofY);
    ctx.lineTo(x + w - R, roofY);
    ctx.quadraticCurveTo(x + w, roofY, x + w, roofY + R);
    ctx.lineTo(x + w, railY - 5);
    ctx.quadraticCurveTo(x + w, railY - 2, x + w - 3, railY - 2);
    ctx.lineTo(x + 3, railY - 2);
    ctx.quadraticCurveTo(x, railY - 2, x, railY - 5);
    ctx.closePath();
    ctx.fill();
    // The cantrail: a quiet line where the roof turns over.
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = EDGE;
    ctx.fillRect(x + 2, roofY + 4, w - 4, 1);
    ctx.globalAlpha = 1;
  }
  // THE GLAZING BAND and THE LIGHT LINE, drawn across the WHOLE CONSIST rather
  // than per carriage — that continuity is the entire effect. A line that stops
  // at every gangway is a row of coaches; a line that runs through them is a
  // train.
  const first = cars[0];
  const last = cars[cars.length - 1];
  if (!first) return;
  const x0 = first.x0 - camX;
  const x1 = last.x1 - camX;
  const glassTop = roofY + 8;
  const glassH = 10;
  // The band itself: dark glass, with a soft light along its top edge.
  ctx.fillStyle = '#0d0a24';
  ctx.fillRect(x0 + 6, glassTop, x1 - x0 - 12, glassH);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = EDGE;
  ctx.fillRect(x0 + 6, glassTop, x1 - x0 - 12, 1);
  ctx.globalAlpha = 1;
  for (const car of cars) {
    const x = car.x0 - camX;
    const w = car.x1 - car.x0;
    // Dividers: thin, body-coloured, on a long pitch. These are the only marks
    // inside the band, and they are what stop it reading as a fluorescent tube.
    ctx.fillStyle = BODY;
    for (let sx = 26; sx < w - 26; sx += 26) {
      ctx.fillRect(Math.round(x + sx), glassTop, 2, glassH);
    }
    // A few bays lit from inside, warm, and never more than a third of them.
    for (let i = 0; i * 26 < w - 52; i++) {
      if (hash(car.x0 * 0.17 + i) > 0.34) continue;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = WINDOW;
      ctx.fillRect(Math.round(x + 28 + i * 26), glassTop + 2, 22, glassH - 4);
      ctx.globalAlpha = 1;
    }
    // DOORS: a recess that breaks the band, with a threshold. Set well in from
    // the ends so there is body between a door and the glass either side.
    const DW = 15;
    if (w > 100) {
      for (const dx0 of [x + 16, x + w - 16 - DW]) {
        const dx = Math.round(dx0);
        ctx.fillStyle = UNDER;
        ctx.fillRect(dx, roofY + 5, DW, railY - roofY - 9);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = EDGE;
        ctx.fillRect(dx, roofY + 5, 1, railY - roofY - 9);
        ctx.fillRect(dx + DW - 1, roofY + 5, 1, railY - roofY - 9);
        ctx.globalAlpha = 1;
        // Its own glass, set into the leaf and shorter than the band, so a door
        // is never mistaken for more window.
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#bfe8ff';
        roundRectPath(ctx, dx + 3, glassTop + 1, DW - 6, glassH - 1, 1.6);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = UNDER;
        ctx.fillRect(dx + DW / 2 - 0.5, roofY + 6, 1, railY - roofY - 11);
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = WINDOW;
        ctx.fillRect(dx + 1, railY - 6, DW - 2, 1);
        ctx.globalAlpha = 1;
      }
    }
    // The gangway: a narrow dark waist between cars, and nothing else. At this
    // scale a bellows drawn with ribs is just noise.
    if (!car.endsAtGap) {
      const j = Math.round(x + w);
      ctx.fillStyle = UNDER;
      ctx.fillRect(j - 3, roofY + 4, 6, railY - roofY - 8);
    }
  }
  // THE LIGHT LINE. One unbroken run down the whole set, brightest thing on it,
  // with a wider soft pass under it for the light it throws on its own paint.
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = EDGE;
  ctx.fillRect(x0, waistY - 2, x1 - x0, 5);
  ctx.globalAlpha = 0.95;
  ctx.fillRect(x0, waistY, x1 - x0, 1);
  ctx.globalAlpha = 1;
  // The skirt: one dark sweep to the rail, hiding the running gear. No wheels.
  ctx.fillStyle = SKIRT;
  ctx.fillRect(x0, railY - 6, x1 - x0, 4);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = EDGE;
  ctx.fillRect(x0, railY - 6, x1 - x0, 1);
  ctx.globalAlpha = 1;
  void t;
}

/**
 * STEPS, AND NOT ONLY FOR THIS. A flight of treads that raises the lane by
 * `rise` over `treads` steps, with a handrail.
 *
 * Peter's note, and it is the reason this is parameterised rather than hard
 * coded to a carriage: steps are wanted as general vocabulary — somewhere to go
 * when a lane has to gain height and a gently rising hill would be absurd.
 * Every cabinet after Act I is built, not grown: a food court, an office, a
 * city, a train. None of them has a hill in it. This is what they use instead.
 *
 * The contract is the same one a rise already has: the lane goes up by `rise`
 * over the run of the flight, and the player simply runs up it.
 */
export function drawNeonSteps(ctx, camX, worldX, {
  rise = NEON_PLATFORM_DROP, treads = 4, run = 7, handrail = true, descend = false,
  tread = '#2b2266', riser = '#1a1442', lit = '#38d8f8', rail = '#9a90e8',
} = {}) {
  // A FLIGHT RUNS BOTH WAYS. `descend` mirrors it about its own start so the
  // lane LEAVES `rise` lower — which is the ending, coming down off the nose
  // onto the platform. Mirroring is a transform, not a second painter: a
  // staircase drawn twice is a staircase that drifts apart.
  if (descend) {
    ctx.save();
    ctx.translate(Math.round(worldX - camX) * 2 + treads * run, 0);
    ctx.scale(-1, 1);
    drawNeonSteps(ctx, camX, worldX, {
      rise, treads, run, handrail, descend: false, tread, riser, lit, rail,
    });
    ctx.restore();
    return;
  }
  // THE CONTRACT IS THE LANE'S: the flight ENTERS at GROUND_Y and LEAVES `rise`
  // higher, exactly as a rising hill would.
  //
  // EVERY FACE GETS ITS OWN VALUE AND ITS OWN LINE. A flight drawn as one tone
  // with a line along each nosing is a zigzag; what makes steps read as steps is
  // that the going and the riser are turned to the light differently — the
  // going is lit from above, the riser is in its own shadow — and that each has
  // an edge of its own. Two values, two highlights, per step.
  const x = Math.round(worldX - camX);
  const step = rise / treads;
  for (let i = 0; i < treads; i++) {
    const top = GROUND_Y - (i + 1) * step;      // the going of this step
    const prev = GROUND_Y - i * step;           // the going of the one below
    const gx = x + i * run;
    // THE RISER: the vertical face, darker, with a lit edge down its leading
    // side so the step has a corner rather than a smudge.
    ctx.fillStyle = riser;
    ctx.fillRect(gx, top, run + 1, prev - top);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = lit;
    ctx.fillRect(gx, top, 1, prev - top);
    ctx.globalAlpha = 1;
    // THE GOING: the horizontal face, lighter, with its nosing lit brightest —
    // this is the edge a foot lands on and the one the eye counts.
    ctx.fillStyle = tread;
    ctx.fillRect(gx, top, run + 1, Math.max(2, step * 0.42));
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = lit;
    ctx.fillRect(gx, top, run + 1, 1);
    ctx.globalAlpha = 1;
    // And the shadow the nosing casts on the riser below it, which is what
    // stops the two faces reading as one panel.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = UNDER;
    ctx.fillRect(gx, top + Math.max(2, step * 0.42), run + 1, 1);
    ctx.globalAlpha = 1;
  }
  // The stringer: the solid side of the flight, filled to the lane so it is a
  // staircase rather than a set of floating slabs.
  ctx.fillStyle = riser;
  ctx.beginPath();
  ctx.moveTo(x, GROUND_Y + 2);
  ctx.lineTo(x, GROUND_Y);
  for (let i = 0; i < treads; i++) {
    ctx.lineTo(x + i * run, GROUND_Y - (i + 1) * step);
    ctx.lineTo(x + (i + 1) * run, GROUND_Y - (i + 1) * step);
  }
  ctx.lineTo(x + treads * run, GROUND_Y + 2);
  ctx.closePath();
  ctx.globalAlpha = 0.45;
  ctx.fill();
  ctx.globalAlpha = 1;
  if (!handrail) return;
  ctx.strokeStyle = rail;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, GROUND_Y - 13);
  ctx.lineTo(x + treads * run, GROUND_Y - rise - 13);
  ctx.stroke();
  for (let i = 0; i <= treads; i += 2) {
    const px = x + i * run;
    const py = GROUND_Y - i * step;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - 13);
    ctx.stroke();
  }
}

/**
 * THE CAB. The nose of the thing you have been running along the top of, and
 * the reason the ending wants a step DOWN rather than a level walk-off: coming
 * off the front means the last thing the stage shows you is the front of the
 * train, raked, lit, standing at the platform.
 *
 * `facing` is +1 for a nose pointing right (the way the train is going).
 */
export function drawNeonCab(ctx, camX, worldX, {
  railY = GROUND_Y, height = NEON_CARRIAGE_HEIGHT, facing = 1, len = 86, t = 0,
} = {}) {
  // A LONG NOSE IS THE WHOLE THING. A 52px wedge is a tram; the rake wants to be
  // two and a half times the car's height and to come down almost to the rail,
  // with the light line sweeping up into it. Everything else — the dark body,
  // the glazing band, the skirt — is the same language as the carriages, which
  // is what makes the cab the front OF something.
  const roofY = railY - height;
  const x = Math.round(worldX - camX);
  const nose = facing > 0 ? x + len : x - len;
  const waistY = roofY + height * 0.62;
  const tipY = railY - 9;
  // The shell: roof, a long curve down the rake, and the skirt back along the
  // bottom. One path, so the silhouette is one shape.
  const shell = (c) => {
    c.moveTo(x, roofY + 5);
    c.quadraticCurveTo(x, roofY, x + facing * 6, roofY);
    c.lineTo(nose - facing * len * 0.46, roofY + 1);
    // The rake, as two curves: a long shallow one off the roof and a tighter
    // one into the tip. A single quadratic gives a shark fin, not a nose.
    c.quadraticCurveTo(nose - facing * len * 0.16, roofY + 4, nose - facing * 8, waistY - 3);
    c.quadraticCurveTo(nose, waistY + 4, nose, tipY);
    c.lineTo(x, tipY);
    c.closePath();
  };
  ctx.fillStyle = BODY;
  ctx.beginPath(); shell(ctx); ctx.fill();
  // The contour, dim: at this value the body is nearly the sky, and the rake is
  // the one line that says which end this is.
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#8fd8f8';
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';
  ctx.beginPath(); shell(ctx); ctx.stroke();
  ctx.globalAlpha = 1;
  // THE WINDSCREEN: one long raked pane following the nose, dark with a lit
  // upper edge — the same glass the band is made of, not a grey wedge.
  const wsBack = nose - facing * len * 0.42;
  ctx.fillStyle = '#0d0a24';
  ctx.beginPath();
  ctx.moveTo(wsBack, roofY + 8);
  ctx.quadraticCurveTo(nose - facing * len * 0.16, roofY + 9, nose - facing * 12, waistY - 4);
  ctx.lineTo(wsBack, waistY - 4);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = EDGE;
  ctx.beginPath();
  ctx.moveTo(wsBack, roofY + 8);
  ctx.quadraticCurveTo(nose - facing * len * 0.16, roofY + 9, nose - facing * 12, waistY - 4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // THE LIGHT LINE, sweeping up the rake — the cab's version of the line that
  // runs the length of the train, and the mark that ties it to the set.
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = EDGE;
  ctx.fillRect(Math.min(x, nose - facing * 14), waistY - 2, Math.abs(nose - facing * 14 - x), 5);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(x, waistY);
  ctx.lineTo(nose - facing * 20, waistY);
  ctx.quadraticCurveTo(nose - facing * 7, waistY, nose - facing * 3, waistY - 6);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // The headlight: a slim strip low in the nose, not a pair of dots, and the
  // beam it lays down the platform.
  const hx = nose - facing * 9;
  const beam = ctx.createLinearGradient(nose, railY, nose + facing * 78, railY);
  beam.addColorStop(0, 'rgba(210,240,255,0.22)');
  beam.addColorStop(1, 'rgba(210,240,255,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(hx, waistY + 1);
  ctx.lineTo(nose + facing * 78, waistY - 8);
  ctx.lineTo(nose + facing * 78, railY + 2);
  ctx.lineTo(hx, tipY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#eaf7ff';
  ctx.fillRect(Math.min(hx, hx + facing * 7), waistY + 2, 7, 2);
  // Skirt to the rail, as on the carriages.
  ctx.fillStyle = SKIRT;
  ctx.fillRect(Math.min(x, nose - facing * 6), railY - 6, Math.abs(nose - facing * 6 - x), 4);
  void t;
}
