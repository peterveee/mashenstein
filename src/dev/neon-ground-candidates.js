// TERMINAL VELOCITY — what the road is made of. GALLERY ONLY.
//
// SETTLED 22 Sep 2026 on E (STREAK), which is in neonPack.ground() now and is
// called back through from this file rather than copied into it. The sheet
// stays up at Peter's request in case the verdict changes.
//
// What shipped before was a dark slab (#0c0c20), a 1px cyan lit edge, and one
// texture: parallel diagonals every 40 world px raking left as they fall. It is
// the cheapest possible "this is a neon grid" and it read as wallpaper — the
// lines never converged, never moved relative to each other, and said nothing
// about speed, which is the one thing this cabinet is named after.
//
// NINETEEN WORLD PIXELS is the whole design budget, and it is the reason every
// obvious answer is wrong. The frame is 270 tall, the groundline is 232, and
// the lane is drawn through the run's 2x camera — so the apron below the lit
// edge is 38 SCREEN px and about 19 WORLD px before it runs off the bottom.
// A vanishing-point floor, a perspective checker, a reflection of the skyline:
// none of them have the depth to be what they are. What fits in 19px is a
// TEXTURE WITH A DIRECTION and, better, one that MOVES relative to the lane,
// because motion is the only depth cue a strip this shallow can carry.
//
// So each candidate is judged on three things, in this order:
//   1. Does it say SPEED at 208 world px/s, the cabinet's opening rate?
//   2. Does it stay under the hazard band? Drones sit at world alt 13 and
//      targets at 40 — bright ink down here competes with the things that
//      kill you, and this road already spends its brightness on one cyan rule.
//   3. Does the CUT FACE still read? A pit on this cabinet has no fill
//      (pitFill: 'none'); the hole is told entirely by the two vertical faces
//      either side of it. A texture that fights those faces has lost.
//
// Each painter here fills ONE solid run, already clipped, between GROUND_Y and
// H. The frame around it — the runs, the lit edge, the cut faces, the pit
// fills — is shared, because that part is not what is being asked. The loser
// painters live here and nowhere else; the winner lives in the pack.
import { GROUND_Y, ZOOM } from '../engine/camera.js';
import { H, W } from '../engine/renderer.js';
import { drawPitFills, drawNeonSpeedStreaks, __testing as packs } from '../engine/stylePacks/index.js';

const { apronRuns } = packs;

// The cabinet's inks, the same three the backdrop is allowed.
const CYAN = '#38d8f8';
const AMBER = '#f6d33c';
// The slab every candidate sits on. Changing it is a different question.
const SLAB = '#0c0c20';

// How deep the apron is in world units, and how much of that the run's own
// camera actually shows. Painters cover DEPTH so a crane or a portrait zoom
// never exposes bare canvas; they COMPOSE for VISIBLE.
const DEPTH = H - GROUND_Y;
const VISIBLE = Math.round(DEPTH / ZOOM);

// Deterministic per-index noise, the same recipe the backdrop uses: the road
// has to come back identical on a retry, so nothing down here is random.
function hash(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ------------------------------------------------------------- A: RETIRED
// What shipped until 22 Sep 2026, kept as the thing the others were measured
// against. This is now the only copy of it: neonPack.ground() draws E.
function liveDiagonals(ctx, { camX, drawW }) {
  ctx.strokeStyle = 'rgba(56,216,248,0.35)';
  ctx.lineWidth = 1;
  for (let x = -(camX % 40); x < drawW; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x - 20, H);
    ctx.stroke();
  }
}

// ------------------------------------------------------------- B: CONVERGE
// The shipped idea, done properly. The diagonals are the raked half of a
// perspective grid with the other half missing, and they rake by a CONSTANT
// -20 — so they are parallel, which is the one thing lines on a receding plane
// are not. Here they fan from a vanishing point on the groundline, and the
// transverse rungs that make it a grid are put back, bunching toward the
// horizon and sliding DOWN out of the frame as the run advances.
//
// This is the candidate that invents nothing: if the answer is "the grid was
// fine, it was just drawn wrong", this is what that looks like.
const CONVERGE_PITCH = 26;
function converge(ctx, { camX, drawW, t }) {
  const vx = drawW / 2;
  // Rungs. A constant world pitch mapped through 1/(1+d) so the spacing opens
  // up as it comes toward you — the only perspective cue available in 19px.
  const K = 2.6;
  const phase = (camX / CONVERGE_PITCH) % 1;
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    const d = i + 1 - phase;
    const y = GROUND_Y + DEPTH * (1 - 1 / (1 + d / K));
    if (y > H) break;
    const u = (y - GROUND_Y) / DEPTH;
    ctx.strokeStyle = `rgba(56,216,248,${(0.10 + 0.34 * u).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(drawW, Math.round(y) + 0.5);
    ctx.stroke();
  }
  // The fan. Anchored on the groundline, spreading as it falls.
  ctx.strokeStyle = 'rgba(56,216,248,0.24)';
  for (let x = -(camX % 40); x < drawW + 200; x += 40) {
    const spread = (x - vx) * 2.8;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(vx + spread, H);
    ctx.stroke();
  }
  void t;
}

// -------------------------------------------------------------- C: CIRCUIT
// The road as a board. Orthogonal traces on three lanes with 45-degree elbows,
// solder pads where they turn, and one trace in five carrying a magenta pulse
// that runs along it. Flat-on rather than receding, which is honest about the
// 19px: it stops pretending to be a floor in perspective and becomes a surface
// you are looking straight down at.
//
// It also answers the speed question differently from everything else here —
// the texture itself does not move faster than the lane, but the pulses do.
const CIRCUIT_CELL = 64;
function circuit(ctx, { camX, drawW, t }) {
  const lanes = [5, 11, 17].map((v) => GROUND_Y + v);
  const first = Math.floor(camX / CIRCUIT_CELL) - 1;
  const last = Math.ceil((camX + drawW) / CIRCUIT_CELL) + 1;
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';
  for (let c = first; c <= last; c++) {
    const x0 = c * CIRCUIT_CELL - camX;
    const a = Math.floor(hash(c * 3 + 1) * 3);
    const b = Math.floor(hash(c * 5 + 7) * 3);
    const ya = lanes[a];
    const yb = lanes[b];
    const jog = x0 + 18 + Math.floor(hash(c * 7 + 3) * 20);
    const live = hash(c * 11 + 5) < 0.2;
    ctx.strokeStyle = live ? 'rgba(232,56,248,0.45)' : 'rgba(56,216,248,0.30)';
    ctx.beginPath();
    ctx.moveTo(x0, ya + 0.5);
    ctx.lineTo(jog, ya + 0.5);
    ctx.lineTo(jog + Math.abs(yb - ya), yb + 0.5);
    ctx.lineTo(x0 + CIRCUIT_CELL, yb + 0.5);
    ctx.stroke();
    // A pad at the turn, and a via on the lane it left.
    ctx.fillStyle = live ? 'rgba(232,56,248,0.55)' : 'rgba(56,216,248,0.38)';
    ctx.fillRect(jog - 1, ya - 1, 3, 3);
    if (hash(c * 13 + 2) < 0.4) ctx.fillRect(x0 + 6, lanes[(a + 1) % 3] - 1, 2, 2);
    // THE PULSE is the only bright thing down here, and it is two pixels.
    if (!live) continue;
    const u = ((t * 0.9 + hash(c)) % 1);
    const px = x0 + u * CIRCUIT_CELL;
    const py = px < jog ? ya : yb;
    ctx.fillStyle = AMBER;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(Math.round(px), py - 1, 3, 2);
    ctx.globalAlpha = 1;
  }
}

// --------------------------------------------------------------- D: MAGLEV
// You are on a track. Two guide rails and a sleeper pitch give the strip a
// rhythm the diagonals never had — sleepers tick past at a countable rate, so
// the eye can measure the speed instead of just being told about it — and a
// magenta live rail runs the third line with a charge travelling down it.
//
// This is also the only candidate that agrees with what the cabinet already
// says elsewhere: the finish is a train, the overtakes are trains, and the
// handoff doc wants the lane to BE a train. A railbed under the lane is the
// cheap half of that idea.
const SLEEPER_PITCH = 16;
function maglev(ctx, { camX, drawW, t }) {
  // The bed: a touch lighter than the slab so the rails have something to sit
  // on rather than floating on black.
  ctx.fillStyle = '#141433';
  ctx.fillRect(0, GROUND_Y + 2, drawW, 15);
  // Sleepers first, so the rails cross over them.
  ctx.fillStyle = 'rgba(56,216,248,0.22)';
  for (let x = -(camX % SLEEPER_PITCH); x < drawW; x += SLEEPER_PITCH) {
    ctx.fillRect(Math.round(x), GROUND_Y + 3, 2, 13);
  }
  // Two guide rails, the near one brighter because it is nearer.
  ctx.fillStyle = 'rgba(56,216,248,0.30)';
  ctx.fillRect(0, GROUND_Y + 4, drawW, 1);
  ctx.fillStyle = 'rgba(56,216,248,0.50)';
  ctx.fillRect(0, GROUND_Y + 15, drawW, 1);
  // The live rail, and the charge on it. One charge in view at a time: a strip
  // of chasing lights is a fairground, not a maglev.
  ctx.fillStyle = 'rgba(232,56,248,0.35)';
  ctx.fillRect(0, GROUND_Y + 10, drawW, 1);
  const span = drawW + 160;
  const cx = span - ((camX * 1.8 + t * 150) % span);
  const grad = ctx.createLinearGradient(cx - 90, 0, cx + 10, 0);
  grad.addColorStop(0, 'rgba(232,56,248,0)');
  grad.addColorStop(0.78, 'rgba(232,56,248,0.55)');
  grad.addColorStop(1, 'rgba(255,220,255,0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - 90, GROUND_Y + 9, 100, 2);
}

// ---------------------------------------------------------------- E: STREAK
// SHIPPED 22 Sep 2026. Terminal velocity, drawn literally: the apron is void,
// and what crosses it is motion blur at three rates, the fastest of them
// passing the lane itself, lengths and brightness scaling with rate. Nothing
// here is structure — there is no grid to notice, so nothing to notice
// repeating.
//
// The risk this card existed to test was that a road with no surface reads as a
// hole rather than as ground, and the hero ends up running on a lit wire over
// nothing. It does not: the 1px cyan edge is the road, and the two cut faces at
// a pit still say fatal because nothing else down there is bright enough to
// compete with them.
//
// This card is now THE SHIPPING PAINTER, called through. The sheet stays up at
// Peter's request in case the verdict changes, and a card that kept its own
// copy of a shipped painter would start lying the first time the real one was
// touched.
function streak(ctx, { camX, drawW }) {
  drawNeonSpeedStreaks(ctx, { camX, viewW: drawW, zoom: ZOOM });
}

// ------------------------------------------------------------- F: DATARAIN
// The void under the road is made of data. Columns of dashes falling at their
// own rates, mostly dim cyan with an occasional amber cell, drifting sideways
// with the run. Unlike everything else here the dominant motion is VERTICAL,
// which is the one direction nothing else in this cabinet moves — so the road
// separates from the city behind it without spending any brightness.
const RAIN_PITCH = 9;
function datarain(ctx, { camX, t }) {
  const first = Math.floor(camX / RAIN_PITCH) - 1;
  const cols = Math.ceil(W / RAIN_PITCH) + 3;
  for (let i = 0; i < cols; i++) {
    const c = first + i;
    // Two columns in five are dark. A rain with no gaps in it is static.
    if (hash(c * 17 + 3) < 0.4) continue;
    const x = c * RAIN_PITCH - camX;
    const speed = 14 + hash(c * 3) * 30;
    const span = VISIBLE + 10;
    const phase = (t * speed + hash(c * 5) * span) % span;
    // A trail, not a dotted line: the head is the bright cell and everything
    // behind it fades, which is what makes the column read as falling.
    for (let d = 0; d < 4; d++) {
      const y = GROUND_Y + phase - d * 5;
      if (y < GROUND_Y + 1 || y > GROUND_Y + VISIBLE - 1) continue;
      const head = d === 0;
      const warm = head && hash(c * 7 + Math.floor(phase)) < 0.12;
      ctx.fillStyle = warm ? AMBER : CYAN;
      ctx.globalAlpha = head ? 0.7 : 0.26 - d * 0.06;
      ctx.fillRect(Math.round(x), Math.round(y), 2, head ? 4 : 4);
    }
  }
  ctx.globalAlpha = 1;
}

// ----------------------------------------------------------------- G: SCAN
// The road as a screen. A dim hex mesh holds the surface together and a bright
// wave travels through it left to right, lighting the cells it crosses — so the
// texture is constant and the EVENT is what moves. It is the only candidate
// whose speed cue is independent of camX, which makes it the one that still
// reads when the lane is stopped (a retry, a death, the moment before the
// stage opens).
const HEX_R = 6;
function scanmesh(ctx, { camX, drawW, t }) {
  const stepX = HEX_R * 1.5;
  const stepY = HEX_R * Math.sqrt(3);
  const wave = ((t * 0.55) % 1.6) * (drawW + 240) - 120;
  const first = Math.floor(camX / stepX) - 1;
  const cols = Math.ceil(drawW / stepX) + 3;
  ctx.lineWidth = 1;
  for (let i = 0; i < cols; i++) {
    const c = first + i;
    const x = c * stepX - camX;
    for (let row = 0; row < 3; row++) {
      const cy = GROUND_Y + 3 + row * stepY + (c % 2 ? stepY / 2 : 0);
      if (cy - HEX_R > GROUND_Y + VISIBLE + 2) continue;
      const d = Math.abs(x - wave);
      const lit = d < 46 ? (1 - d / 46) ** 2 : 0;
      ctx.strokeStyle = lit > 0.02
        ? `rgba(232,56,248,${(0.18 + lit * 0.62).toFixed(3)})`
        : 'rgba(56,216,248,0.16)';
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k;
        const px = x + Math.cos(a) * HEX_R;
        const py = cy + Math.sin(a) * HEX_R;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
}

// ----------------------------------------------------------------- H: GLASS
// Wet chrome. The deck is a mirror: the city's tubes come back as vertical
// smears that fade as they fall, broken by horizontal ripple bands that wobble
// on their own clock. The smears are hashed off the WORLD x, so they scroll
// with the lane the way a reflection would, and they are the only candidate
// that puts magenta and cyan down here together — which is the point, because
// a reflection is the one excuse for the backdrop's colours appearing below the
// groundline at all.
function glass(ctx, { camX, drawW, t }) {
  // The sheen: brightest right under the lit edge, gone by the bottom.
  const sheen = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + VISIBLE);
  sheen.addColorStop(0, 'rgba(56,216,248,0.30)');
  sheen.addColorStop(0.5, 'rgba(40,40,110,0.16)');
  sheen.addColorStop(1, 'rgba(12,12,32,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, GROUND_Y, drawW, VISIBLE);
  // The tubes, coming back up at us. Width and hue hashed off a 24px world
  // cell so the same tower reflects the same way every time past it.
  const CELL = 24;
  const first = Math.floor(camX / CELL) - 1;
  const cols = Math.ceil(drawW / CELL) + 3;
  for (let i = 0; i < cols; i++) {
    const c = first + i;
    const h0 = hash(c * 3 + 5);
    if (h0 < 0.22) continue;
    const x = c * CELL - camX + hash(c * 7) * CELL;
    const w = 1 + Math.floor(hash(c * 11) * 3);
    const depth = 6 + hash(c * 13) * (VISIBLE - 6);
    const col = hash(c * 17) < 0.35 ? '232,56,248' : '56,216,248';
    const g = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + depth);
    g.addColorStop(0, `rgba(${col},${(0.28 + h0 * 0.42).toFixed(3)})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(Math.round(x), GROUND_Y, w, depth);
  }
  // Ripples. Three dark rows that breathe, which is what stops the smears
  // reading as a picket fence.
  for (let k = 0; k < 3; k++) {
    const y = GROUND_Y + 4 + k * 5 + Math.sin(t * 1.3 + k * 2.1 + camX * 0.01) * 1.2;
    ctx.fillStyle = 'rgba(8,8,24,0.45)';
    ctx.fillRect(0, Math.round(y), drawW, 1);
  }
}

// The sheet, in the order the tiles are drawn. `letter` is what a verdict names.
export const NEON_GROUND_CANDIDATES = [
  {
    letter: 'A',
    name: 'RETIRED — raked diagonals',
    note: 'What shipped until 22 Sep 2026. Parallel, constant rake, no relative motion — the strip slid sideways as one sheet.',
    paint: liveDiagonals,
  },
  {
    letter: 'B',
    name: 'CONVERGE — the grid, done properly',
    note: 'The shipped idea with its missing half: a fan off a vanishing point plus transverse rungs bunching toward the horizon.',
    paint: converge,
  },
  {
    letter: 'C',
    name: 'CIRCUIT — the road is a board',
    note: 'Traces on three lanes with 45° elbows and pads; one trace in five carries an amber pulse. Flat-on, not receding.',
    paint: circuit,
  },
  {
    letter: 'D',
    name: 'MAGLEV — you are on a track',
    note: 'Sleepers at a countable pitch, two guide rails, a magenta live rail with a charge running down it.',
    paint: maglev,
  },
  {
    letter: 'E',
    name: 'SHIPPED — terminal velocity, literally',
    note: 'No surface at all: three rates of motion blur, the fastest passing the lane. This card calls the real painter in neonPack.ground().',
    paint: streak,
  },
  {
    letter: 'F',
    name: 'DATARAIN — the void is data',
    note: 'Columns falling at their own rates under a lane that scrolls sideways. The only vertical motion in the cabinet.',
    paint: datarain,
  },
  {
    letter: 'G',
    name: 'SCAN — a wave through a mesh',
    note: 'Dim hex mesh, bright wave crossing it on its own clock — the one candidate that still moves when the lane is stopped.',
    paint: scanmesh,
  },
  {
    letter: 'H',
    name: 'GLASS — wet chrome deck',
    note: 'The city reflected: hashed vertical smears fading down, broken by three breathing ripple rows.',
    paint: glass,
  },
];

/**
 * Draw one candidate as the neon pack's ground pass.
 *
 * The frame is the shipped one to the pixel — apronRuns for the solid spans,
 * the slab, the 1px cyan lit edge, the two cut faces at 55%, then the cabinet's
 * pit fill. Only the texture inside a run comes from the candidate, because the
 * rest of it is settled and a bake-off that re-litigates it is a bake-off whose
 * cards differ in more than one thing.
 *
 * Deliberately NOT drawing the overtake or the finish train: those are lane
 * furniture the ground pass happens to own, and they would sit on top of the
 * one thing each card exists to show.
 */
export function drawNeonGroundCandidate(ctx, candidate, {
  camX = 0, cab = null, obstacles = [], overhangs = [], t = 0, drawW = W,
} = {}) {
  for (const [a, b] of apronRuns(camX, obstacles, overhangs, drawW)) {
    if (b <= a) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(a, GROUND_Y, b - a, DEPTH);
    ctx.clip();
    ctx.fillStyle = SLAB;
    ctx.fillRect(a, GROUND_Y, b - a, DEPTH);
    candidate.paint(ctx, { camX, t, drawW, a, b });
    ctx.restore();
    ctx.fillStyle = CYAN;
    ctx.fillRect(a, GROUND_Y, b - a, 1);
    ctx.globalAlpha = 0.55;
    // A face means a hole, not the end of the draw window — see the long note
    // on the same two lines in neonPack.ground().
    if (a > 0.5) ctx.fillRect(a, GROUND_Y, 1, DEPTH);
    if (b < drawW - 0.5) ctx.fillRect(b - 1, GROUND_Y, 1, DEPTH);
    ctx.globalAlpha = 1;
  }
  if (cab) drawPitFills(ctx, camX, cab, obstacles, t, false, null, drawW, SLAB);
}

// The strip on its own, magnified, with no lane furniture over it — 19 world px
// is small enough that a full-frame card shows the IDEA and hides the DRAWING.
export function drawNeonGroundStrip(ctx, candidate, { camX = 0, t = 0, w = W } = {}) {
  ctx.save();
  ctx.translate(0, -GROUND_Y);
  ctx.fillStyle = SLAB;
  ctx.fillRect(0, GROUND_Y, w, VISIBLE + 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, GROUND_Y, w, VISIBLE + 1);
  ctx.clip();
  candidate.paint(ctx, { camX, t, drawW: w, a: 0, b: w });
  ctx.restore();
  ctx.fillStyle = CYAN;
  ctx.fillRect(0, GROUND_Y, w, 1);
  ctx.restore();
}

export const NEON_GROUND_VISIBLE = VISIBLE;
