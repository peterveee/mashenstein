// THE TRAIN. A minimalist vector bullet train — Tron by way of Shinkansen —
// drawn as the surface Neon's lane runs along.
//
// Promoted out of src/dev on 22 Sep 2026, when the train stopped being a
// mock-up and became terrain: Neon 1 and Neon 2 author their train sections as
// ISLAND ROUTES in src/data/stage-layouts.js, and drawRoutes asks this file to
// paint them. The dev copy stays where it is as the record of the bake-off it
// came out of; this is the one the game draws.
//
// Everything is a pure function of (ctx, geometry, options): no module state,
// nothing measured off the DOM. A car is 96 world px and a set is uniform cars
// between two tapers, because a high-speed set is streamlined at both ends —
// and the two tapers facing each other are what frame the leap from one train
// to the next.
//
// NO WHEELS. The spec offered glowing hubs and they lost: a Shinkansen skirts
// its bogies and a Tron machine rides light, so the hull skirts to a hair above
// the rail with a soft line of light beneath it. `wheels: true` still draws
// them, for the gallery's comparison tile and nothing else.
//
// THE GLOW IS TWO STROKES, NOT shadowBlur. The spec asked for shadowBlur and
// the gallery uses it; the run cannot afford it per frame, so `glow: false`
// switches to the wide-faint-plus-thin-bright pass the neon pack already uses
// everywhere. The run always passes false.

export const TRON_PALETTE = Object.freeze({
  // The spec, verbatim.
  spec: Object.freeze({
    bg: '#0a0c10', hull: '#1e222b', line: '#00f0ff', glass: '#00f0ff', dim: 'rgba(0,240,255,0.35)',
    cabin: '#ffd9a0',
  }),
  // The cabinet's own inks, for the tiles drawn over the shipped city.
  neon: Object.freeze({
    bg: '#0a0a2a', hull: '#16123a', line: '#38d8f8', glass: '#38d8f8', dim: 'rgba(56,216,248,0.35)',
    // CABIN LIGHT IS WARM, and it is the one thing on this train that is not
    // the tube colour. Peter, 22 Sep: "should the windows be outlines to be
    // more neon-ish and or/ different colours?"
    //
    // Outlines: no. A pane is 6x5 px and a 1px stroke round it leaves a 4x3
    // core, so the outline becomes most of the mark and a row of them mushes
    // into a dotted line the moment the train moves. The bloom in glowFill is
    // the neon read at this size, and it works because it puts light OUTSIDE
    // the pane rather than a border on it.
    //
    // Colours: yes. Everything on this hull was one cyan, so the windows were
    // the same light as the tubing and the side read as one stripe. Warm glass
    // against a cyan tube is what the city towers already do (NEON_AMBER in the
    // style pack) and it buys the one thing the train could not say before —
    // that there is an INSIDE, lit, with people in it. The windscreen stays
    // cyan: that is glass you see through, not a room.
    cabin: '#ffce7a',
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
// A BOARDABLE train wants a wider one. At 3px the cars read as one extruded
// tube: nothing says where one ends and the next begins, and a roof you are
// meant to run along is exactly where that matters. Widened it is a coupler —
// visible from the lane, and still far too narrow to fall down, which is the
// brief. Callers pass it; the spec sheet keeps 3.
export const TRON_BOARD_GAP = 8;
const CORNER = 4;         // roof/underframe corner radius on a passenger car
// ONE DOOR PER CAR, WIDE, AT THE REAR (Peter, 23 Sep: "just a single wider
// door at the rear of each car"). Two narrow pairs per car made the side busy
// and symmetrical, and symmetry is the one thing that stops a side-on vehicle
// saying which way it is pointing. One door, at the back, is also what the
// player's eye needs: it is the end he arrives at.
const DOOR_W = 17;        // a single leaf, and it slides
const DOOR_INSET = 11;    // from the car's rear end
const DOOR_CLEAR = 7;     // hull between the door and the nearest window

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
// A GLOW IS A FALLOFF, NOT A BAND (Peter, 22 Sep: "it seems like we only have
// like the main colour and a muted translucent thick border not a real neon
// glow.. finer lines?"). He is describing exactly what the old two-pass stand-in
// drew: ONE skirt at four times the width and a flat 0.22, then a solid core at
// full width. Two hard edges and nothing between them — a stripe with a wider
// stripe behind it.
//
// Real neon is a thin, very bright filament with light falling off around it,
// so this is three passes with the widths and alphas both stepping down, and
// the halo passes composited ADDITIVELY. Light adds; that is the whole
// difference between a tube glowing on a dark street and a sticker of one.
// Additive also means overlapping strokes brighten where they cross, which is
// what corners and joins do in real tubing.
//
// AND THE CORE IS THINNER than the nominal width, not equal to it. The width a
// caller passes is now the width of the whole MARK — filament plus glow — which
// is what a caller is actually judging when it picks 1.3 for a hull edge.
// THREE HALO STOPS, not two, and a WHITE-HOT CORE.
//
// The falloff was already better than the old flat band, but it was still the
// tube colour all the way through, and that is the thing that stops a painted
// glow looking like a lit one: a real neon tube is so bright at the filament
// that it reads WHITE, and only the light thrown around it carries the colour.
// Same trick the cabinet's own neonTube uses on the city.
//
// The extra stop costs one stroke per path and buys the smooth shoulder
// between core and halo that two stops step across.
const GLOW_HALO = Object.freeze([[9, 0.045], [4.4, 0.085], [2, 0.16]]);
const GLOW_CORE = 0.64;
const GLOW_CORE_WHITE = 0.55;      // how far the filament is pushed to white

// Pushes a #rgb/#rrggbb toward white. Cached: the palettes are frozen and the
// same handful of inks are asked for on every stroke of every frame.
const whiteHotCache = new Map();
function whiteHot(color, amt = GLOW_CORE_WHITE) {
  const key = color + amt;
  const hit = whiteHotCache.get(key);
  if (hit) return hit;
  let out = color;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (m) {
    const hex = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
    const ch = [0, 2, 4].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16);
      return Math.round(v + (255 - v) * amt);
    });
    out = `rgb(${ch[0]},${ch[1]},${ch[2]})`;
  }
  whiteHotCache.set(key, out);
  return out;
}
// A filled pane has no skirt of its own, and the old code filled it twice —
// once at 0.35 and once opaque — which is just an opaque fill with an extra
// pass. To bleed, it has to put light OUTSIDE its own edge, so the pane is
// stroked on its own outline before it is filled.
// GENTLER THAN IT WAS. A pane is 6x5, so a 4.2px additive stroke covers the
// whole thing and then some — twice — and the warm cabin ink came back beige
// because the bloom was adding more light than the pane itself carried.
const GLOW_BLEED = Object.freeze([[3, 0.07], [1.4, 0.12]]);

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
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (const [mult, al] of GLOW_HALO) {
    ctx.globalAlpha = a * al;
    ctx.lineWidth = width * mult;
    ctx.beginPath(); draw(ctx); ctx.stroke();
  }
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = a;
  ctx.strokeStyle = whiteHot(color);
  ctx.lineWidth = Math.max(0.5, width * GLOW_CORE);
  ctx.beginPath(); draw(ctx); ctx.stroke();
  ctx.strokeStyle = color;
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
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [w, al] of GLOW_BLEED) {
    ctx.globalAlpha = a * al;
    ctx.lineWidth = w;
    ctx.beginPath(); draw(ctx); ctx.stroke();
  }
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = a;
  // Barely whitened. A STROKE's filament is a hairline and wants to burn out;
  // a filled pane is a surface, and pushing a 6x5 rectangle that far to white
  // just desaturates it — the warm cabin ink came back beige.
  ctx.fillStyle = whiteHot(color, 0.12);
  ctx.beginPath(); draw(ctx); ctx.fill();
  ctx.fillStyle = color;
}

/**
 * Total length of a consist, so a caller can centre it or park its nose.
 */
export function tronConsistLength(consist = TRON_SPEC_CONSIST, gap = GAP) {
  return consist.reduce((sum, car, i) => sum + (car.len || DEFAULT_LEN[car.kind] || DEFAULT_LEN.car)
    + (i ? gap : 0), 0);
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
  palette = TRON_PALETTE.spec, glow = true, lit = 0.9, t = 0, wheels = false, open = 0,
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

  // SLIDING DOORS, one at each end of a passenger car and one on the flat end
  // of a cab. They are the third attempt: the first pair were vertical lines
  // on the hull and read as narrow windows, the second were plain recesses and
  // read as hatches. What makes a door a SLIDING door is the pair of leaves —
  // a centre split with a pane in each leaf — and what makes it a door rather
  // than a window is that it runs the FULL height of the body, from under the
  // roof to the skirt, while a window is a small mark in the upper third.
  //
  // Drawn in the darker background ink so it reads as a recess the leaves sit
  // in, outlined dim rather than lit: a door is not a light source, and at
  // this size a bright outline anywhere near the window row turns the whole
  // side into a stripe.
  // The rear of a car is its LEFT end, since the set faces right. On a tail
  // that end is the taper, so the door stands just inside the shoulder where
  // the body is full height again.
  const doorX = tail ? x + len * (1 - TRON_TAPER_SHOULDER) + 5 : x + DOOR_INSET;
  const doorTop = top + h * 0.15;
  const doorBot = bottom - 1.5;
  const doorH = doorBot - doorTop;
  // AND IT SLIDES. `open` is 0 shut, 1 fully back; the leaf retracts into the
  // wall behind it (a pocket door) rather than travelling along the outside,
  // which at this size would just be a rectangle sitting on the livery.
  const openW = DOOR_W * Math.max(0, Math.min(1, open));
  const leafW = DOOR_W - openW;
  // The doorway itself: dark, and once it is open the cabin light falls out of
  // it. That spill is the whole reason the doors open at all — it is the only
  // moment this train says there is somebody inside.
  ctx.fillStyle = palette.bg;
  ctx.beginPath(); roundRect(ctx, doorX, doorTop, DOOR_W, doorH, 2); ctx.fill();
  if (openW > 0.6) {
    // AN OPENING IS MOSTLY DARK. Two goes at filling the doorway with light —
    // flat, then a gradient — both produced a slab the size of five windows,
    // and a slab is cargo, not a door you can walk through. What actually says
    // "open" is the dark hole plus the two places light lands in one: a strip
    // along the ceiling and a pool on the floor just inside. Everything between
    // them stays the interior's own dark, which is what gives it depth.
    const a0 = ctx.globalAlpha;
    const gx = doorX + leafW + 0.5;
    const gw = openW - 1;
    const warm = palette.cabin || palette.glass;
    ctx.globalAlpha = a0 * lit;
    ctx.fillStyle = warm;
    ctx.fillRect(gx, doorTop + 2, gw, 1.2);
    // The pool: brightest at the threshold, gone a third of the way up.
    const pool = ctx.createLinearGradient(0, doorBot - doorH * 0.34, 0, doorBot - 1.5);
    pool.addColorStop(0, 'rgba(0,0,0,0)');
    pool.addColorStop(1, warm);
    ctx.globalAlpha = a0 * lit * 0.5;
    ctx.fillStyle = pool;
    ctx.fillRect(gx, doorBot - doorH * 0.34, gw, doorH * 0.34 - 1.5);
    ctx.globalAlpha = a0;
  }
  ctx.strokeStyle = palette.dim;
  ctx.lineWidth = 1;
  ctx.beginPath(); roundRect(ctx, doorX + 0.5, doorTop + 0.5, DOOR_W - 1, doorH - 1, 2);
  ctx.stroke();
  // The leaf, with its own pane level with the cabin row.
  if (leafW > 1.5) {
    ctx.fillStyle = palette.hull;
    ctx.beginPath(); roundRect(ctx, doorX, doorTop, leafW, doorH, 2); ctx.fill();
    ctx.strokeStyle = palette.dim;
    ctx.beginPath(); roundRect(ctx, doorX + 0.5, doorTop + 0.5, leafW - 1, doorH - 1, 2);
    ctx.stroke();
    if (leafW > 6) {
      glowFill(ctx, palette.cabin || palette.glass, glow,
        (c) => roundRect(c, doorX + 2, top + h * 0.28, leafW - 4, 5, 1.2));
    }
  }

  // WINDOWS: a perfectly straight row, small rounded rectangles, steady glow.
  // On the engine the row stops where the roof starts to fall, and one longer
  // pane at the shoulder is the driver's windscreen.
  const WW = 6;
  const WH = 5;
  const PITCH = 11;
  const wy = top + h * 0.28;
  // CLEAR OF THE DOORS at both ends (Peter, 22 Sep: "make sure there is
  // distance between the doors and the nearest window"). A cab's own door is
  // on its flat end, so the taper limit still owns the other side.
  // Clear of the ONE door, which is always at the rear (Peter, 22 Sep: "make
  // sure there is distance between the doors and the nearest window"). The far
  // end is now free, so a car's glass runs almost its whole length — which is
  // what a high-speed set actually looks like.
  const rowEnd = engine ? x + (right - x) * 0.46 - 4 : right - 8;
  const rowStart = doorX + DOOR_W + DOOR_CLEAR;
  const n = Math.max(0, Math.floor((rowEnd - rowStart - WW) / PITCH) + 1);
  const rowW = n > 0 ? (n - 1) * PITCH + WW : 0;
  const left = rowStart + (rowEnd - rowStart - rowW) / 2;
  const cabin = palette.cabin || palette.glass;
  ctx.globalAlpha = lit;
  for (let i = 0; i < n; i++) {
    const wx = left + i * PITCH;
    glowFill(ctx, cabin, glow, (c) => roundRect(c, wx, wy, WW, WH, 1.6));
  }
  if (taper) {
    // THE DRIVER'S WINDOW. It was a flat slab of the tube colour — the single
    // brightest, flattest shape on the train, and the one place a hard fill is
    // most obviously wrong, because glass is the thing you see THROUGH.
    //
    // So it is built the way the real thing reads: a raked pane wrapped round
    // the nose, DARK at the bottom where you see into the cab and bright along
    // the top where the sky is on it, a crisp lit frame around the whole
    // aperture, and one diagonal catch-light across it. The catch-light is what
    // sells it as a curved surface — a flat pane has no reason to have one.
    const dir = engine ? 1 : -1;
    const sx = x + (right - x) * 0.5;
    const wTop = wy - 2.5;
    const wBot = wy + WH + 2.5;
    const pane = (c) => {
      c.moveTo(sx, wTop + 1.5);
      c.lineTo(sx + dir * 27, wTop);          // up into the shoulder
      c.lineTo(sx + dir * 22, wBot);          // raked back along the nose
      c.lineTo(sx + dir * 1.5, wBot);
      c.closePath();
    };
    const g = ctx.createLinearGradient(0, wTop, 0, wBot);
    g.addColorStop(0, whiteHot(palette.glass, 0.5));
    g.addColorStop(0.45, palette.glass);
    g.addColorStop(1, palette.bg);
    const a0 = ctx.globalAlpha;
    ctx.fillStyle = g;
    ctx.beginPath(); pane(ctx); ctx.fill();
    // The catch-light: a sliver along the top rake, not a full pane's worth.
    ctx.globalAlpha = a0 * 0.75;
    ctx.fillStyle = whiteHot(palette.glass, 0.7);
    ctx.beginPath();
    ctx.moveTo(sx + dir * 3, wTop + 2.2);
    ctx.lineTo(sx + dir * 25, wTop + 1.2);
    ctx.lineTo(sx + dir * 24, wTop + 2.6);
    ctx.lineTo(sx + dir * 3, wTop + 3.6);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = a0;
    // The aperture frame, lit — the one part of a window that IS a tube.
    glowStroke(ctx, palette.line, 0.9, glow, pane);
  }
  ctx.globalAlpha = 1;

  // CIRCUIT ACCENTS: two clean horizontal lines on the lower hull. The upper
  // one is continuous; the lower is broken into segments so the two are not
  // one thick stripe. On the engine both follow the nose down and stop.
  const y1 = top + h * 0.64;
  const y2 = top + h * 0.80;
  const trimEnd = engine ? right - 14 : right - 6;
  const trimStart = tail ? x + 14 : x + 6;
  // ...AND THEY STOP AT THE DOOR. Both ran straight across the doorway, so the
  // one shape on the side that is meant to be a hole through the bodywork had a
  // lit rule drawn over it — which is exactly what stopped it reading as a hole.
  // A real train's livery breaks at a door for the same reason: the door moves.
  const skip0 = doorX - 2.5;
  const skip1 = doorX + DOOR_W + 2.5;
  const runs = [[trimStart, Math.min(skip0, trimEnd)], [Math.max(skip1, trimStart), trimEnd]]
    .filter(([a, b]) => b - a > 3);
  glowStroke(ctx, palette.line, 1, glow, (c) => {
    for (const [a, b] of runs) { c.moveTo(a, y1); c.lineTo(b, y1); }
  });
  ctx.strokeStyle = palette.dim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [a, b] of runs) {
    for (let sx = a; sx < b - 6; sx += 22) {
      ctx.moveTo(sx, y2);
      ctx.lineTo(Math.min(sx + 14, b - 2), y2);
    }
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
 * THE GANGWAY between two cars. Widening the coupler so the cars read as cars
 * left them reading as separate pods flying in formation — the gap was sky, and
 * nothing crossed it (Peter, 22 Sep: "do we need to join the cars together
 * somehow?").
 *
 * A bellows, then: hull-coloured, inset from both the roof and the skirt so it
 * is a sleeve BETWEEN two bodies rather than a continuation of either, with
 * concertina ribs across it. It overlaps a couple of pixels into each car and
 * is drawn BEFORE them, so the hull outlines close over its ends and there is
 * no seam to line up.
 */
function drawTronGangway(ctx, x, w, railY, h, { palette }) {
  // SIMPLER (Peter, 23 Sep). The first one was a ribbed bellows — two edge
  // lines and two concertina ribs — and at eight pixels wide that is four
  // marks in a space with room for one. It read as clutter between the cars
  // rather than as a join, which is the opposite of the job.
  //
  // So: a plain dark sleeve, inset top and bottom so it is narrower than both
  // bodies, and nothing drawn on it at all. What says "joined" is that the gap
  // is no longer sky; it does not need explaining twice.
  const top = railY - h;
  const bottom = railY - 3;
  ctx.fillStyle = palette.hull;
  ctx.fillRect(x - 2, top + h * 0.30, w + 4, (bottom - h * 0.14) - (top + h * 0.30));
}

/**
 * The whole consist, walked left to right from `x`. The last car in the list
 * is the front of the train, so the spec's [car, car, engine] puts the nose on
 * the right.
 */
export function drawTronTrain(ctx, x, railY, {
  consist = TRON_SPEC_CONSIST, h = 34, palette = TRON_PALETTE.spec, glow = true, lit = 0.9, t = 0,
  wheels = false, gap = GAP, open = 0,
} = {}) {
  const lenOf = (car) => car.len || DEFAULT_LEN[car.kind] || DEFAULT_LEN.car;
  // Gangways first — see drawTronGangway.
  let gx = x;
  for (let i = 0; i < consist.length - 1; i++) {
    gx += lenOf(consist[i]);
    drawTronGangway(ctx, gx, gap, railY, h, { palette });
    gx += gap;
  }
  let cx = x;
  for (const car of consist) {
    cx += drawTronCar(ctx, car, cx, railY, h, { palette, glow, lit, t, wheels, open }) + gap;
  }
  return cx - gap - x;
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
        // The CABIN ink, same as the side-on painter: this is the same carriage
        // seen from above, and the pan between the two views is a camera move,
        // not a costume change. The gallery's train section is what caught it
        // — side-on warm, roof-on cyan, one train.
        glowFill(ctx, palette.cabin || palette.glass, glow,
          (c) => roundRect(c, wx, wy, WW, WH, 1.6));
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
