// SPACE / GRAVITY CABINET — four mock-ups. GALLERY ONLY.
//
// docs/ALTERNATE_CABINET_THEMES.md proposes GRAVITY GRID as a replacement for
// one of the later cabinets: a station where magnetic gates transfer the hero
// between floor and ceiling. That document is prose. This file is the same
// question drawn — the GRID as written, and three other ways a space cabinet
// could look, so the choice is made between pictures rather than between
// paragraphs.
//
// Every candidate is a COMPLETE FRAME: its own sky, an ordered stack of
// backdrop layers each at its own scroll factor, and its own lane treatment,
// with B33P on his real mark drawn through the run's camera. Hazards are LOOKS,
// not hitboxes — a saw hanging from a ceiling here says "this is the read the
// cabinet would ask for", it is not an obstacle the spawner knows about. Coins
// and the drone are the real entities through drawWorldEntity, because those
// already exist and would be dealt as-is.
//
// Nothing here is registered with any pack. A winner gets a pack of its own
// in src/engine/stylePacks/index.js and a cabinet in src/data/cabinets.js, and
// this file goes.
import { ZOOM, GROUND_Y, VIEW_W, applyWorld, worldYForScreenY } from '../engine/camera.js';
import { W, H } from '../engine/renderer.js';
import { __testing as bg } from '../engine/stylePacks/index.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H, drawWorldEntity } from '../game/draw.js';
import { makeObstacle, makePickup } from '../game/entities.js';
import { PLAYER_X, GRAVITY, BASE_JUMP_V } from '../game/player.js';

const { backgroundPaintCoverage } = bg;

// Deterministic per-index noise, so a card comes back the same on every reload.
function hash(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function pose(kind, t, extra = {}) {
  return {
    kind, phase: (t * 1.6) % 1, time: t, vy: kind === 'jump' ? -160 : 0,
    grounded: kind !== 'jump', squash: 0, lean: 0, roll: false, float: false,
    stomp: false, headless: false, facing: 1, ...extra,
  };
}

function skyFill(ctx, c0, c1) {
  const cov = backgroundPaintCoverage(ctx);
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.fillRect(cov.left - 60, -80, cov.width + 120, H + 160);
}

// A starfield that wraps into the visible band. `twinkle` is a rate; airless
// skies pass none and the stars hold still, which is half of what says vacuum.
function stars(ctx, shift, { seed = 1, count = 60, top = 4, bottom = 160, color = '#dfe8ff', size = 1, twinkle = 0, t = 0 } = {}) {
  const cov = backgroundPaintCoverage(ctx);
  const span = cov.width + 80;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const bx = hash(seed + i * 3) * span;
    const x = cov.left - 40 + (((bx - shift) % span) + span) % span;
    const y = top + hash(seed + i * 3 + 1) * (bottom - top);
    const a = 0.35 + 0.65 * hash(seed + i * 3 + 2);
    ctx.globalAlpha = twinkle ? a * (0.7 + 0.3 * Math.sin(t * twinkle + i)) : a;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
  }
  ctx.globalAlpha = 1;
}

// Call fn(x, k) for every k-th repeat of `period` that lands in view after
// `shift`. k is stable per object, so hash(k) dresses each one the same way
// every frame.
function repeat(ctx, shift, period, fn, margin = 80) {
  const cov = backgroundPaintCoverage(ctx);
  const first = Math.floor((cov.left - margin + shift) / period);
  for (let k = first; k * period - shift < cov.right + margin; k++) fn(k * period - shift, k);
}

// A NEON LINE IS TWO STROKES: a wide faint one for the light and a thin bright
// one for the glass. Same trick the neon candidates use.
function tube(ctx, color, width, glow, draw) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  if (glow > 0) {
    ctx.globalAlpha = glow;
    ctx.lineWidth = width * 4;
    ctx.beginPath(); draw(); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = width;
  ctx.beginPath(); draw(); ctx.stroke();
}

function hero(ctx, kind, t, x = PLAYER_X, feetY = GROUND_Y, extra = {}) {
  drawToon(ctx, 'b33p', pose(kind, t, extra), x, feetY, HERO_DRAW_H);
}

// The hero with his feet on a CEILING at world y `ceil`: the same painter,
// flipped about the ceiling line. Facing is untouched — he still runs right.
function ceilingHero(ctx, t, x, ceil) {
  ctx.save();
  ctx.translate(0, ceil * 2);
  ctx.scale(1, -1);
  hero(ctx, 'run', t, x, ceil);
  ctx.restore();
}

function coinArc(ctx, camX, t, pack, from, to, n, peak, base = 8) {
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    const alt = base + Math.sin(u * Math.PI) * peak;
    drawWorldEntity(ctx, makePickup('coin', camX + from + (to - from) * u, alt), camX, t, pack, {});
  }
}

function scanlines(ctx, alpha = 0.1) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
}

// ---------------------------------------------------------------- A. GRAVITY GRID
// The document's proposal, drawn. Vector CRT: navy-black, pale phosphor
// lines, warning orange at the thing that changes the rules, green for
// diagnostics. Floor AND ceiling are lane — the ceiling is the same rail
// treatment mirrored — and a polarity gate stands between them. A second B33P
// runs the ceiling to show what a transfer leaves you doing.
const GG = {
  ink: '#9ff0ff', dim: 'rgba(159,240,255,0.30)', orange: '#ff9a2e', green: '#5cff8a',
  wall: '#05061a',
};
// The ceiling line, in world units: 16 screen px below the top of the frame.
const GG_CEIL = () => worldYForScreenY(16, ZOOM);

// THE DECK'S ARCHITECTURE, IN ONE PLACE.
//
// The window wall used to scroll at 0.6 of the camera while the gate — bolted
// to the floor and ceiling of the same corridor — scrolled at 1, so the gate
// slid along the wall as the player ran. That is exactly what a fixture cannot
// do: there is no parallax between two things in the same room.
//
// So the wall is welded to the lane at 1, and the only parallax left is the
// view OUTSIDE it. The gates then sit on a whole number of panes, offset half
// a pane, so a gate always stands in the middle of a window instead of
// wandering across the mullions. The deck looks built.
//
// AND EVERYTHING IS SLOWER, because this is a sixth of a g. The run is 120
// world px/s rather than Neon's 208, which puts a gate every 3.3s and gives
// the hills time to be scenery instead of a blur.
const PANE_W = 188, PANE_GAP = 7, PANE_RADIUS = 9;
const PANE_PERIOD = PANE_W + PANE_GAP;                        // screen px
const GATE_SPACING = (PANE_PERIOD * 4) / ZOOM;                // world px: 390
const GATE_PHASE = PANE_PERIOD / 2 / ZOOM;                    // half a pane
const LUNAR_SPEED = 120;                                      // world px/s

// A TOGGLE, NOT A DIRECTION. When you can arrive at a gate on either surface
// an up-arrow is wrong half the time, so this glyph claims a SWAP instead:
// two columns of chevrons leaving the middle of the corridor, one climbing and
// one falling, so the eye reads "these two ends exchange" rather than "go up".
function toggleChevrons(ctx, gx, ceil, t) {
  const mid = (ceil + GROUND_Y) / 2;
  const STEP = 15, HALF = 7, RISE = 5, THICK = 3.5;
  ctx.save();
  ctx.beginPath(); ctx.rect(gx - 14, ceil + 1, 28, GROUND_Y - ceil - 2); ctx.clip();
  for (const dir of [-1, 1]) {
    const flow = ((t * 34) % STEP) * dir;
    for (let i = 0; i < 5; i++) {
      const y = mid + dir * (i * STEP + 6) + flow;
      const u = Math.min(1, (i * STEP) / ((GROUND_Y - ceil) / 2));
      const a = 0.9 - u * 0.55;
      const py = y + dir * RISE;
      ctx.fillStyle = `rgba(92,255,138,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(gx, py);
      ctx.lineTo(gx + HALF, y);
      ctx.lineTo(gx + HALF, y + dir * THICK);
      ctx.lineTo(gx, py + dir * THICK);
      ctx.lineTo(gx - HALF, y + dir * THICK);
      ctx.lineTo(gx - HALF, y);
      ctx.closePath(); ctx.fill();
    }
  }
  // The waist: a bar across the middle where the two runs meet, so the glyph
  // has a centre and does not read as two unrelated arrows.
  ctx.fillStyle = 'rgba(210,255,225,0.8)';
  ctx.fillRect(gx - 9, mid - 1, 18, 2);
  ctx.restore();
}

// THE GATE'S ARROWS. Not a polite little marker in the middle: a COLUMN of
// thick chevrons running the whole corridor, floor to ceiling, streaming the
// way the gate throws you. This is the only thing on screen that tells the
// player which surface they are about to be standing on, so it is allowed to
// be the loudest mark in the frame.
//
// They FLOW rather than blink — each chevron slides toward the destination and
// the stack scrolls, which reads as direction even in a still frame. They are
// brightest at the end they point to and fade out at the end they leave, so
// the column itself is an arrow.
function gateChevrons(ctx, gx, ceil, t, up) {
  const span = GROUND_Y - ceil;
  const STEP = 15;           // world px between chevrons
  const HALF = 8;            // half-width
  const RISE = 6;            // how far the point leads the shoulders
  const THICK = 4;           // the bar's own thickness
  const dir = up ? -1 : 1;   // screen direction of travel
  const flow = ((t * 38) % STEP) * dir;
  ctx.save();
  ctx.beginPath(); ctx.rect(gx - 14, ceil + 1, 28, span - 2); ctx.clip();
  for (let i = -1; i <= span / STEP + 1; i++) {
    const y = up ? GROUND_Y - i * STEP + flow : ceil + i * STEP + flow;
    // u is 0 at the surface it leaves, 1 at the surface it points to.
    const u = up ? (GROUND_Y - y) / span : (y - ceil) / span;
    if (u < -0.2 || u > 1.2) continue;
    const a = Math.max(0, Math.min(1, u)) * 0.85 + 0.12;
    // A filled chevron: point leading, two shoulders behind, drawn as a thick
    // bar rather than a stroke so it holds its weight at any zoom.
    const py = y + dir * RISE;
    ctx.fillStyle = `rgba(92,255,138,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(gx, py);
    ctx.lineTo(gx + HALF, y);
    ctx.lineTo(gx + HALF, y + dir * THICK);
    ctx.lineTo(gx, py + dir * THICK);
    ctx.lineTo(gx - HALF, y + dir * THICK);
    ctx.lineTo(gx - HALF, y);
    ctx.closePath();
    ctx.fill();
    // A hot core down the middle of the leading edge.
    ctx.fillStyle = `rgba(210,255,225,${(a * 0.5).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(gx, py);
    ctx.lineTo(gx + HALF * 0.55, y + dir * RISE * 0.45);
    ctx.lineTo(gx, py + dir * 1.4);
    ctx.lineTo(gx - HALF * 0.55, y + dir * RISE * 0.45);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// A's lane — floor and ceiling rails, the polarity gate, the crate, the saw,
// the ceiling runner — as one painter, so every card that keeps this front
// half keeps exactly it.
function gridLane(ctx, camX, t, pack) {
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  const ceil = GG_CEIL();
  const rail = (y, dir) => {
    ctx.fillStyle = GG.wall;
    if (dir > 0) ctx.fillRect(-20, y, VIEW_W + 40, 60); else ctx.fillRect(-20, y - 60, VIEW_W + 40, 60);
    tube(ctx, GG.ink, 1, 0.18, () => { ctx.moveTo(-20, y + 0.5 * dir); ctx.lineTo(VIEW_W + 20, y + 0.5 * dir); });
    ctx.strokeStyle = GG.dim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-20, y + 7 * dir + 0.5); ctx.lineTo(VIEW_W + 20, y + 7 * dir + 0.5); ctx.stroke();
    for (let x = -(camX % 24); x < VIEW_W + 24; x += 24) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + 7 * dir); ctx.stroke();
    }
  };
  rail(GROUND_Y, 1);
  rail(ceil, -1);
  // THE POLARITY GATE. It has to be BOLTED TO THE DECK, not laid over it.
  //
  // The first cut drew each post with tube(), which uses a round line cap, so
  // the glow pass ended in a soft disc four world px PAST the rail at each end
  // — two orange blobs sitting on top of the floor and ceiling lines, with the
  // rail's own highlight running through them. The gate looked pasted on.
  //
  // Three fixes, all about the join: the whole gate is CLIPPED to the corridor
  // so nothing can spill onto a rail; the posts are butt-capped and stop a
  // couple of px short; and each end gets a SOCKET — a housing seated on the
  // rail with a lit lip and a shadow under it — drawn after the post, so the
  // post visibly enters the deck rather than touching it.
  // ON THE GRID, not at a fixed screen x: a gate pinned to the frame would
  // slide along a wall that is now welded to the lane.
  const gk = Math.round((camX + VIEW_W * 0.62 - GATE_PHASE) / GATE_SPACING);
  const gx = gk * GATE_SPACING + GATE_PHASE - camX;
  ctx.save();
  ctx.beginPath(); ctx.rect(gx - 30, ceil, 60, GROUND_Y - ceil); ctx.clip();
  // The field, fading out at both ends so it never hard-edges against a rail.
  const fieldG = ctx.createLinearGradient(0, ceil, 0, GROUND_Y);
  fieldG.addColorStop(0, 'rgba(255,154,46,0.02)');
  fieldG.addColorStop(0.2, 'rgba(255,154,46,0.11)');
  fieldG.addColorStop(0.8, 'rgba(255,154,46,0.11)');
  fieldG.addColorStop(1, 'rgba(255,154,46,0.02)');
  ctx.fillStyle = fieldG;
  ctx.fillRect(gx - 9, ceil, 18, GROUND_Y - ceil);
  // The posts. Glow then core, both butt-capped and held 2px clear of each
  // rail so the socket can cover the join.
  const pTop = ceil + 2, pBot = GROUND_Y - 2;
  ctx.lineCap = 'butt';
  for (const px of [gx - 11, gx + 9]) {
    ctx.strokeStyle = GG.orange;
    ctx.globalAlpha = 0.25; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(px, pTop); ctx.lineTo(px, pBot); ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, pTop); ctx.lineTo(px, pBot); ctx.stroke();
    // A hot filament up the middle of the post.
    ctx.strokeStyle = 'rgba(255,226,180,0.75)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(px, pTop + 3); ctx.lineTo(px, pBot - 3); ctx.stroke();
  }
  ctx.restore();
  // THE SOCKETS, on the deck side of the rail at both ends of both posts.
  for (const px of [gx - 11, gx + 9]) {
    for (const [sy, dir] of [[GROUND_Y, 1], [ceil, -1]]) {
      // The shadow the housing throws along the rail.
      ctx.fillStyle = 'rgba(0,0,10,0.45)';
      ctx.fillRect(px - 6, sy - dir * 0.5, 12, dir * 1.5);
      // The housing: a shallow trapezoid, wider where it meets the deck.
      ctx.fillStyle = '#0d1230';
      ctx.beginPath();
      ctx.moveTo(px - 5.5, sy);
      ctx.lineTo(px + 5.5, sy);
      ctx.lineTo(px + 3, sy - dir * 4);
      ctx.lineTo(px - 3, sy - dir * 4);
      ctx.closePath(); ctx.fill();
      // Its lit lip, facing the deck's own light, and two bolts.
      ctx.strokeStyle = 'rgba(159,240,255,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px - 3, sy - dir * 4); ctx.lineTo(px + 3, sy - dir * 4); ctx.stroke();
      ctx.fillStyle = 'rgba(255,154,46,0.85)';
      ctx.fillRect(px - 4.5, sy - dir * 2.5, 1.5, dir * 1.5);
      ctx.fillRect(px + 3, sy - dir * 2.5, 1.5, dir * 1.5);
      // The light the post spills into its own socket.
      const sg = ctx.createRadialGradient(px, sy - dir * 2, 0, px, sy - dir * 2, 9);
      sg.addColorStop(0, 'rgba(255,154,46,0.35)');
      sg.addColorStop(1, 'rgba(255,154,46,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(px - 9, dir > 0 ? sy - 9 : sy, 18, 9);
    }
  }
  gateChevrons(ctx, gx, ceil, t, true);
  // A magnetic crate on the floor and a saw on the ceiling, in the read band.
  ctx.fillStyle = GG.wall; ctx.strokeStyle = GG.orange; ctx.lineWidth = 1;
  ctx.fillRect(104, GROUND_Y - 12, 12, 12); ctx.strokeRect(104.5, GROUND_Y - 11.5, 11, 11);
  ctx.fillStyle = GG.green; ctx.fillRect(109, GROUND_Y - 7, 2, 2);
  ctx.save();
  ctx.translate(205, ceil + 7);
  ctx.rotate(t * 6);
  ctx.fillStyle = GG.orange;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI * 2, a1 = ((i + 0.5) / 10) * Math.PI * 2;
    ctx.lineTo(Math.cos(a0) * 6, Math.sin(a0) * 6);
    ctx.lineTo(Math.cos(a1) * 4.5, Math.sin(a1) * 4.5);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = GG.wall; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = GG.dim; ctx.fillRect(204, ceil, 2, 4);
  coinArc(ctx, camX, t, pack, 120, 190, 5, 18);
  hero(ctx, 'run', t);
  ceilingHero(ctx, t, 172, ceil);
  ctx.restore();
  scanlines(ctx, 0.12);
}

// A gas giant: banded, limb-darkened, optionally ringed. Static — a planet does
// not move for a runner. `rings` draws the back half before the disc and the
// front half after it, so the ring passes behind the planet.
function gasGiant(ctx, gx, gy, gr, t, { rings = false, tilt = -0.14 } = {}) {
  // THE RINGS ARE NOT ONE HOOP. Seven concentric bands of different width,
  // brightness and tone, with the Cassini division — the black gap — cut
  // between the two brightest. Each band is drawn as a half ellipse twice:
  // the back half before the planet, the front half after it, so the ring
  // passes behind the disc the way it actually does.
  //
  // THE ANIMATION IS THE OPENING ANGLE, NOT A SPIN. A ring is azimuthally
  // featureless, so spinning it shows nothing; what reads is the system
  // slowly tipping — the ellipse opening and closing — plus a shimmer
  // travelling outward through the bands as ice catches the sun. Both are
  // very slow: this is a planet, not a prop.
  // ONLY THE RINGS MOVE, AND ONLY A LITTLE.
  //
  // Three cuts to get here. The first was 70-second drift nobody could see;
  // the second rocked the whole body, which read as the planet wobbling on its
  // axis — wrong, and busy enough to pull the eye off the lane. A planet at
  // this size in the corner of a window should be still.
  //
  // So the body is FIXED — no tip, no belt drift, no storm bob — and the only
  // thing that moves is the ring plane, opening and closing about 9% on an
  // 18-second breath. You notice it if you look at it and never otherwise,
  // which is exactly the weight a backdrop should carry.
  const open = 1 + Math.sin(t * 0.35) * 0.09;        // ring plane, breathing
  const tip = tilt;                                  // the body does not move
  // WIDER: the outermost band now reaches 2.9 planet radii rather than 2.1,
  // which is close to Saturn's real A-ring edge and reads as a proper ring
  // SYSTEM rather than a hoop sitting on the planet. The inner edge stays put
  // — rings do not touch the body — so the extra width all goes outward, and
  // the gaps between bands widen with it so the structure is still legible at
  // this size.
  const BANDS = [
    [1.32, 0.11, 'rgba(196,170,142,', 0.22],
    [1.52, 0.14, 'rgba(232,210,180,', 0.5],
    [1.74, 0.05, 'rgba(90,78,66,', 0.55],     // Cassini: dark, narrow
    [1.90, 0.18, 'rgba(244,228,198,', 0.62],
    [2.18, 0.10, 'rgba(210,188,158,', 0.42],
    [2.40, 0.06, 'rgba(180,160,136,', 0.26],
    [2.58, 0.05, 'rgba(160,145,125,', 0.16],
    [2.76, 0.03, 'rgba(150,138,120,', 0.10],
  ];
  const ringHalf = (front) => {
    for (let i = 0; i < BANDS.length; i++) {
      const [rad, wid, rgb, a] = BANDS[i];
      // The shimmer: a bright pulse creeping outward through the bands.
      // The shimmer: a pulse creeping outward through the bands as ice catches
      // the sun. Halved from the first cut — it is the rings' only other life.
      const wave = 0.5 + 0.5 * Math.sin(t * 0.5 - i * 0.9);
      ctx.strokeStyle = `${rgb}${(a * (0.9 + wave * 0.15)).toFixed(3)})`;
      ctx.lineWidth = Math.max(0.8, gr * wid);
      ctx.beginPath();
      ctx.ellipse(gx, gy, gr * rad, gr * rad * 0.2 * open, tip,
        front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.stroke();
    }
  };
  if (rings) { ctx.save(); ringHalf(false); ctx.restore(); }
  ctx.save();
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.clip();
  ctx.translate(gx, gy); ctx.rotate(tip); ctx.translate(-gx, -gy);
  const bands = ['#c98a5e', '#e6b283', '#a86a58', '#d9a070', '#8c4f52', '#d7955f'];
  const bh = gr * 0.1;
  // The belts are STILL. They drifted in the previous cut and it made the disc
  // crawl; a gas giant seen from a window shows no motion at all at this size.
  for (let i = -14; i < 14; i++) {
    ctx.fillStyle = bands[((i % bands.length) + bands.length) % bands.length];
    ctx.fillRect(gx - gr - 40, gy + i * bh, gr * 2 + 80, bh);
  }
  // THE STORMS ARE THE ONLY THING ON THE BODY THAT MOVES — and they move by
  // ROTATING WITH THE PLANET rather than bobbing in place, which is what the
  // first cut did and what nothing on a planet does.
  //
  // Each carries a longitude. It crosses the face, foreshortens as it nears
  // the limb, fades out as it goes round the back and comes up the other side.
  // Because the belts themselves are featureless, a spot is the only cue that
  // the body is turning at all — so two small ellipses buy the whole rotation
  // for nothing, without making the bands crawl.
  //
  // TWO OF THEM, HALF A TURN APART, so one is always on the face: a single
  // spot is behind the planet for half of every rotation, and a backdrop whose
  // only animation disappears for twenty seconds at a time is a backdrop with
  // no animation. Jupiter has dozens; two is not a cheat.
  const SPOTS = [
    { phase: 0, lat: -0.2, rx: 0.18, ry: 0.078, ink: '#f0c9a0', eye: '#fbe6c8', wake: true },
    { phase: Math.PI, lat: 0.26, rx: 0.12, ry: 0.052, ink: '#e0aa86', eye: '#f4d3ae', wake: false },
  ];
  for (const spot of SPOTS) {
    const lam = (t * 0.2 + spot.phase) % (Math.PI * 2);
    const face = Math.cos(lam);
    if (face <= 0) continue;
    const sx = gx + Math.sin(lam) * gr * 0.82;
    const sy = gy + gr * spot.lat;
    // Foreshortening: a circle seen off-axis narrows by cos, and the last
    // sliver before the limb is dim as well as thin.
    const squash = Math.max(0.08, face);
    const edge = Math.min(1, face / 0.3);
    ctx.globalAlpha = edge;
    ctx.fillStyle = spot.ink;
    ctx.beginPath();
    ctx.ellipse(sx, sy, gr * spot.rx * squash, gr * spot.ry, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = spot.eye;
    ctx.beginPath();
    ctx.ellipse(sx, sy, gr * spot.rx * 0.38 * squash, gr * spot.ry * 0.38, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // The wake the big one drags along its belt behind it.
    if (spot.wake) {
      ctx.globalAlpha = edge * 0.45;
      ctx.fillStyle = '#e8bd94';
      ctx.beginPath();
      ctx.ellipse(sx - gr * 0.26 * squash, sy + gr * 0.015, gr * 0.12 * squash, gr * 0.035, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.clip();
  const lim = ctx.createRadialGradient(gx - gr * 0.3, gy - gr * 0.3, gr * 0.3, gx, gy, gr);
  lim.addColorStop(0, 'rgba(0,0,10,0)'); lim.addColorStop(1, 'rgba(0,0,10,0.8)');
  ctx.fillStyle = lim; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  // The ring's SHADOW on the planet: one dark band across the disc, on the far
  // side of the ring plane. Without it the rings look pasted on.
  if (rings) {
    ctx.save();
    ctx.translate(gx, gy); ctx.rotate(tip); ctx.translate(-gx, -gy);
    ctx.fillStyle = 'rgba(20,10,6,0.34)';
    ctx.fillRect(gx - gr - 10, gy + gr * 0.05 * open, gr * 2 + 20, Math.max(1.2, gr * 0.26 * open));
    ctx.restore();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(230,180,130,0.28)'; ctx.lineWidth = Math.max(1, gr * 0.025);
  ctx.beginPath(); ctx.arc(gx, gy, gr + 1, 0, Math.PI * 2); ctx.stroke();
  if (rings) { ctx.save(); ringHalf(true); ctx.restore(); }
}

// EVERYTHING OUTSIDE THE WINDOW. One stack, back to front, each at its own
// rate: nebula and planet static, then the far things at the slow rates.
// Painted edge to edge — the wall in front of it decides what is seen.
function spaceView(ctx, shift, t) {
  skyFill(ctx, '#02020c', '#070826');
  const cov = backgroundPaintCoverage(ctx);
  // Nebula: two soft washes, so the black is not one flat black.
  for (const [x, y, r, c] of [[160, 100, 150, 'rgba(96,40,150,0.32)'], [330, 30, 110, 'rgba(30,120,140,0.26)'], [60, 200, 90, 'rgba(150,50,90,0.2)']]) {
    const g = ctx.createRadialGradient(cov.left + x, y, 0, cov.left + x, y, r);
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(cov.left + x - r, y - r, r * 2, r * 2);
  }
  stars(ctx, shift * 0.012, { seed: 41, count: 140, top: 0, bottom: H, color: '#ffffff', twinkle: 1.5, t });
  stars(ctx, shift * 0.02, { seed: 43, count: 12, top: 0, bottom: H, color: '#cfe0ff', size: 2, twinkle: 1, t });
  gasGiant(ctx, cov.left + 368, 138, 96, t, { rings: true, tilt: -0.3 });
  // A moon, cratered, drifting at the far rate.
  const mx = cov.left + (((104 - shift * 0.02) % (cov.width + 120)) + cov.width + 120) % (cov.width + 120) - 60;
  const my = 74;
  ctx.fillStyle = '#b9bccb'; ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8f93a6';
  for (const [dx, dy, r] of [[-5, -3, 3.5], [4, 5, 2.5], [5, -6, 2], [-3, 7, 1.5]]) { ctx.beginPath(); ctx.arc(mx + dx, my + dy, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,10,0.7)'; ctx.beginPath(); ctx.arc(mx + 9, my - 2, 14, 0, Math.PI * 2); ctx.fill();
  // A comet, static, leaving.
  const cx0 = cov.left + 250, cy0 = 40;
  const cg = ctx.createLinearGradient(cx0, cy0, cx0 + 70, cy0 - 26);
  cg.addColorStop(0, 'rgba(200,230,255,0.9)'); cg.addColorStop(1, 'rgba(200,230,255,0)');
  ctx.strokeStyle = cg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + 70, cy0 - 26); ctx.stroke();
  ctx.fillStyle = '#e8f4ff'; ctx.beginPath(); ctx.arc(cx0, cy0, 2, 0, Math.PI * 2); ctx.fill();
  // The far fleet.
  repeat(ctx, shift * 0.04, 230, (x, k) => {
    const y = 120 + hash(k) * 60;
    ctx.fillStyle = '#4a5068'; ctx.fillRect(x, y, 16, 3); ctx.fillRect(x + 4, y - 2, 6, 2);
    ctx.fillStyle = '#ffb347'; ctx.fillRect(x + 15, y + 1, 1, 1);
    ctx.fillStyle = '#3bd9ff'; ctx.fillRect(x, y + 1, 1, 1);
  });
  // Another station — a torus edge-on with its hub, lit.
  repeat(ctx, shift * 0.06, 520, (x, k) => {
    const y = 150 + hash(k) * 20;
    ctx.strokeStyle = '#3a4058'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(x, y, 42, 11, 0.1, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#2a3044'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * 0.15; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 42, y + Math.sin(a) * 11); ctx.stroke(); }
    ctx.fillStyle = '#5a6280'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfe8ff';
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + t * 0.15; if ((Math.floor(t * 2) + i) % 3) ctx.fillRect(x + Math.cos(a) * 42 - 0.5, y + Math.sin(a) * 11 - 0.5, 1.5, 1.5); }
  });
  // A satellite tumbling past at the mid rate.
  repeat(ctx, shift * 0.09, 360, (x, k) => {
    const y = 90 + hash(k) * 70;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.4 + k);
    ctx.fillStyle = '#2f5e9a'; ctx.fillRect(-26, -3, 18, 6); ctx.fillRect(8, -3, 18, 6);
    ctx.fillStyle = '#5f8fd0'; for (let i = 0; i < 3; i++) { ctx.fillRect(-25 + i * 6, -2, 1, 4); ctx.fillRect(9 + i * 6, -2, 1, 4); }
    ctx.fillStyle = '#9aa2b8'; ctx.fillRect(-6, -5, 12, 10);
    ctx.fillStyle = '#c8d0e0'; ctx.beginPath(); ctx.arc(0, -8, 4, Math.PI, 0); ctx.fill();
    ctx.restore();
  });
}

// THE STATION WALL, with the windows cut out of it. Panes are barrel-shaped —
// the top and bottom edges bow outward — which is the cheapest thing that
// says "this glass is curved" at 2x, and each carries one soft reflection arc.
// The wall scrolls at the near rate: it is the thing you are running along.
//   top/bot   the pane's vertical extent, screen px
//   paneW/gap the rhythm along the wall
//   bulge     how far the barrel edges bow beyond top/bot
//   struts    'mullion' (a dark bar with a phosphor edge) or 'thin' (one line)
function stationWindows(ctx, shift, { top = 34, bot = 214, paneW = 96, gap = 8, bulge = 6, struts = 'mullion', t = 0 } = {}) {
  const cov = backgroundPaintCoverage(ctx);
  const period = paneW + gap;
  const panePath = (x) => {
    const x0 = x + gap / 2, x1 = x + gap / 2 + paneW, cx = (x0 + x1) / 2;
    ctx.moveTo(x0, top);
    ctx.quadraticCurveTo(cx, top - bulge * 2, x1, top);
    ctx.lineTo(x1, bot);
    ctx.quadraticCurveTo(cx, bot + bulge * 2, x0, bot);
    ctx.closePath();
  };
  // The wall: one rectangle with every pane cut out.
  ctx.fillStyle = GG.wall;
  ctx.beginPath();
  ctx.rect(cov.left - 80, -80, cov.width + 160, H + 160);
  repeat(ctx, shift, period, (x) => panePath(x));
  ctx.fill('evenodd');
  // Rails along the wall's top and bottom, where the panes end.
  ctx.strokeStyle = GG.dim; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cov.left - 80, top - bulge - 2.5); ctx.lineTo(cov.right + 80, top - bulge - 2.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cov.left - 80, bot + bulge + 2.5); ctx.lineTo(cov.right + 80, bot + bulge + 2.5); ctx.stroke();
  repeat(ctx, shift, period, (x, k) => {
    const x0 = x + gap / 2, x1 = x0 + paneW;
    // Glass: a faint cold tint and one reflection arc, both barely there.
    ctx.save();
    ctx.beginPath(); panePath(x); ctx.clip();
    ctx.fillStyle = 'rgba(120,200,255,0.05)'; ctx.fillRect(x0, top - bulge * 2, paneW, bot - top + bulge * 4);
    ctx.strokeStyle = 'rgba(200,240,255,0.16)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x0 + paneW * 0.12, top + 14); ctx.quadraticCurveTo(x0 + paneW * 0.5, top + 4, x0 + paneW * 0.9, top + 30); ctx.stroke();
    ctx.restore();
    // The pane edge.
    ctx.strokeStyle = 'rgba(159,240,255,0.42)'; ctx.lineWidth = 1;
    ctx.beginPath(); panePath(x); ctx.stroke();
    // The strut between panes.
    if (struts === 'mullion') {
      ctx.fillStyle = '#0d1230'; ctx.fillRect(x1, top - bulge - 2, gap, bot - top + bulge * 2 + 4);
      ctx.fillStyle = GG.dim; ctx.fillRect(x1 + gap / 2 - 0.5, top - bulge - 2, 1, bot - top + bulge * 2 + 4);
      // A green readout on every strut: this is a station, someone is watching numbers.
      ctx.fillStyle = GG.green; ctx.globalAlpha = 0.8;
      for (let i = 0; i < 4; i++) if (hash(k * 9 + i + Math.floor(t * 2)) > 0.5) ctx.fillRect(x1 + gap / 2 - 1, 112 + i * 4, 2, 2);
      ctx.globalAlpha = 1;
    } else {
      tube(ctx, GG.ink, 1, 0.14, () => { ctx.moveTo(x1 + gap / 2, top - bulge - 2); ctx.lineTo(x1 + gap / 2, bot + bulge + 2); });
    }
  });
}

const gravityGrid = {
  letter: 'A', name: 'GRAVITY GRID',
  note: 'The doc as written. Vector CRT station: a corridor that flies past, polarity gate in warning orange, '
    + 'the ceiling is a second lane. Second B33P is on the ceiling; the saw hangs from it.',
  draw(ctx, { camX, t, pack }) {
    skyFill(ctx, '#03041a', '#0a0e34');
    const cov = backgroundPaintCoverage(ctx);
    const shift = camX * ZOOM;
    // Stars, through the tunnel's far end only: it is a station, not a view.
    ctx.save();
    ctx.beginPath(); ctx.rect(cov.left + 150, 60, 180, 128); ctx.clip();
    stars(ctx, shift * 0.02, { seed: 11, count: 40, top: 60, bottom: 188, color: GG.ink });
    ctx.restore();
    // The corridor: nested rectangles converging on a vanishing point, sliding
    // outward with the camera. This is the vector-cabinet idiom for "moving
    // forward" and it costs nine strokes.
    const VP = { x: cov.left + cov.width / 2, y: 124 };
    const rungs = 8;
    ctx.strokeStyle = GG.dim;
    ctx.lineWidth = 1;
    for (let k = 0; k < rungs; k++) {
      const u = (((k / rungs) + shift * 0.0009) % 1 + 1) % 1;
      const s = Math.pow(u, 2.2);
      ctx.globalAlpha = 0.15 + 0.85 * s;
      const hw = 250 * s, hh = 110 * s;
      ctx.strokeRect(VP.x - hw, VP.y - hh, hw * 2, hh * 2);
    }
    ctx.globalAlpha = 1;
    // Corner rails, and lamps flying down them.
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.strokeStyle = 'rgba(159,240,255,0.16)';
      ctx.beginPath(); ctx.moveTo(VP.x, VP.y); ctx.lineTo(VP.x + sx * 250, VP.y + sy * 110); ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const u = (((k / 4) + shift * 0.0009) % 1 + 1) % 1;
        const s = Math.pow(u, 2.2);
        ctx.fillStyle = '#eef6ff';
        ctx.globalAlpha = 0.2 + 0.8 * s;
        const r = 0.5 + 1.5 * s;
        ctx.fillRect(VP.x + sx * 250 * s - r, VP.y + sy * 110 * s - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }
    // The diagnostic panel at the end of the corridor.
    ctx.fillStyle = 'rgba(92,255,138,0.12)';
    ctx.fillRect(VP.x - 22, VP.y - 9, 44, 18);
    ctx.strokeStyle = GG.green; ctx.globalAlpha = 0.6;
    ctx.strokeRect(VP.x - 22.5, VP.y - 9.5, 45, 19);
    ctx.fillStyle = GG.green;
    for (let i = 0; i < 6; i++) {
      const on = hash(i + Math.floor(t * 3)) > 0.4;
      if (on) ctx.fillRect(VP.x - 18 + i * 6, VP.y - 4, 4, 2 + Math.round(hash(i * 7 + Math.floor(t * 2)) * 6));
    }
    ctx.globalAlpha = 1;

    gridLane(ctx, camX, t, pack);
  },
};

// ---------------------------------------------------------------- B. MOONBASE
// Low gravity on the surface, not a gate mechanic: the hero is simply in the
// air for longer and higher, and the chart is shaped to it. Airless sky,
// steady stars, the Earth as the one thing in the picture with colour, and a
// grey regolith lane with a rille (a pit dressed as a crack) to cross.
const moonbase = {
  letter: 'B', name: 'MOONBASE',
  note: 'Low-G on the lunar surface. No new verb: jumps go higher and hang, so charts get tall. Earth is the '
    + 'only colour; stars hold still (no air). The rille is the stage\'s own pit, dressed.',
  draw(ctx, { camX, t, pack }) {
    skyFill(ctx, '#000004', '#07071c');
    const cov = backgroundPaintCoverage(ctx);
    const shift = camX * ZOOM;
    stars(ctx, shift * 0.01, { seed: 5, count: 110, top: 2, bottom: 190, color: '#ffffff' });
    // The Earth, static: it does not move for a runner.
    const ex = cov.left + 392, ey = 62, er = 30;
    ctx.save();
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#2b6fd6'; ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
    ctx.fillStyle = '#3aa25a';
    ctx.beginPath(); ctx.ellipse(ex - 8, ey - 6, 11, 8, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex + 9, ey + 10, 7, 10, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(240,248,255,0.9)';
    for (const [dx, dy, rx, ry, a] of [[-14, -14, 9, 3, -0.5], [-6, 4, 12, 3.5, -0.3], [-16, 14, 7, 2.5, 0.2], [4, -18, 6, 2, -0.6]]) {
      ctx.beginPath(); ctx.ellipse(ex + dx, ey + dy, rx, ry, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,10,0.86)';
    ctx.beginPath(); ctx.arc(ex + 20, ey, er + 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(159,209,255,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ex, ey, er + 0.5, 0, Math.PI * 2); ctx.stroke();
    // Far ridge.
    ctx.fillStyle = '#23232e';
    ctx.beginPath();
    ctx.moveTo(cov.left - 80, GROUND_Y);
    repeat(ctx, shift * 0.05, 26, (x, k) => { ctx.lineTo(x, 200 - hash(k) * 34); }, 100);
    ctx.lineTo(cov.right + 80, GROUND_Y);
    ctx.closePath(); ctx.fill();
    // The base: a dome, a lander, a mast.
    repeat(ctx, shift * 0.12, 300, (x, k) => {
      const base = 208;
      ctx.fillStyle = '#50505f';
      ctx.beginPath(); ctx.arc(x, base, 22, Math.PI, 0); ctx.fill();
      ctx.fillRect(x - 26, base - 2, 52, 3);
      ctx.strokeStyle = '#3bd9ff'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(x, base, 15, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.globalAlpha = 1;
      // Lander on four legs.
      const lx = x + 95;
      ctx.fillStyle = '#6c6c7a';
      ctx.fillRect(lx - 9, base - 20, 18, 11);
      ctx.fillStyle = '#8b8b98'; ctx.fillRect(lx - 6, base - 27, 12, 7);
      ctx.strokeStyle = '#6c6c7a'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(lx + s * 8, base - 10); ctx.lineTo(lx + s * 15, base); ctx.stroke();
      }
      // Mast with a lamp.
      const mx = x + 180;
      ctx.beginPath(); ctx.moveTo(mx, base); ctx.lineTo(mx, base - 46); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx - 8, base - 40); ctx.lineTo(mx + 8, base - 40); ctx.stroke();
      ctx.fillStyle = (Math.floor(t * 1.5 + k) % 2) ? '#ff3b3b' : '#5a1414';
      ctx.fillRect(mx - 1.5, base - 49, 3, 3);
    });
    // Near crater rims, right above the lane.
    ctx.strokeStyle = '#7e7e8e'; ctx.lineWidth = 1.5;
    repeat(ctx, shift * 0.25, 190, (x, k) => {
      const w = 26 + hash(k) * 30;
      ctx.beginPath(); ctx.ellipse(x, 226, w, 5, 0, Math.PI, 0); ctx.stroke();
    });

    ctx.save();
    applyWorld(ctx, ZOOM, 0, GROUND_Y);
    ctx.fillStyle = '#9a9aa6';
    ctx.fillRect(-20, GROUND_Y, VIEW_W + 40, 60);
    ctx.fillStyle = '#c9c9d2'; ctx.fillRect(-20, GROUND_Y, VIEW_W + 40, 1);
    ctx.fillStyle = '#6f6f7c';
    for (let x = -(camX % 9); x < VIEW_W + 9; x += 9) ctx.fillRect(x, GROUND_Y + 3, 2, 1);
    for (let x = -(camX % 70); x < VIEW_W + 70; x += 70) {
      const k = Math.floor((x + camX) / 70);
      const cy = GROUND_Y + 9 + hash(k) * 10, rx = 5 + hash(k + 1) * 5;
      ctx.fillStyle = '#86869a'; ctx.beginPath(); ctx.ellipse(x, cy, rx, rx * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6f6f7c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, cy, rx, rx * 0.35, 0, Math.PI, 0); ctx.stroke();
    }
    // The rille: the stage's own pit, dressed as a crack in the surface.
    const rx0 = 150, rw = 52;
    ctx.fillStyle = '#000';
    ctx.fillRect(rx0, GROUND_Y, rw, 60);
    ctx.fillStyle = '#d9d9e2'; ctx.fillRect(rx0 - 2, GROUND_Y, 2, 1); ctx.fillRect(rx0 + rw, GROUND_Y, 2, 1);
    ctx.fillStyle = '#5a5a68';
    ctx.fillRect(rx0, GROUND_Y + 1, 3, 20); ctx.fillRect(rx0 + rw - 3, GROUND_Y + 1, 3, 14);
    // A boulder on the far side.
    ctx.fillStyle = '#7d7d8c'; ctx.beginPath(); ctx.arc(224, GROUND_Y - 5, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a5a5b3'; ctx.beginPath(); ctx.arc(222, GROUND_Y - 7, 3, 0, Math.PI * 2); ctx.fill();
    // Dust hangs where he took off — slow to fall, like everything here.
    ctx.fillStyle = 'rgba(200,200,212,0.5)';
    for (let i = 0; i < 5; i++) {
      const u = ((t * 0.5 + i * 0.2) % 1);
      ctx.beginPath(); ctx.arc(PLAYER_X - 30 - i * 4 - u * 6, GROUND_Y - 2 - u * 10, 1.5 + u, 0, Math.PI * 2); ctx.fill();
    }
    coinArc(ctx, camX, t, pack, 40, 200, 9, 46);
    // The hero HIGH, and hanging: this is the whole pitch.
    const alt = 30 + Math.sin(t * 1.2) * 6;
    hero(ctx, 'jump', t, PLAYER_X, GROUND_Y - alt, { vy: -40 });
    ctx.restore();
  },
};

// ---------------------------------------------------------------- C. HULL RUN
// Outside, on the skin of a ship. Solid-body rather than vector: plated steel
// lane, amber running lights, the ship's own superstructure behind you and a
// gas giant filling the corner of the sky. Hazards are what a hull has: a
// hatch that opens under you, a vent that blows.
const hullRun = {
  letter: 'C', name: 'HULL RUN',
  note: 'Running the outside of a starship. Steel plates for a lane, amber running lights, superstructure '
    + 'behind, a gas giant in the corner. Hatch = jump, vent jet = jump; the drone is the real one.',
  draw(ctx, { camX, t, pack }) {
    skyFill(ctx, '#03030e', '#0a0a22');
    const cov = backgroundPaintCoverage(ctx);
    const shift = camX * ZOOM;
    stars(ctx, shift * 0.015, { seed: 23, count: 70, top: 2, bottom: 170, twinkle: 2, t });
    gasGiant(ctx, cov.left + 430, 330, 220, t);
    // A far fleet.
    repeat(ctx, shift * 0.04, 210, (x, k) => {
      const y = 132 + hash(k) * 34;
      ctx.fillStyle = '#353a4e'; ctx.fillRect(x, y, 14, 3);
      ctx.fillStyle = '#ffb347'; ctx.fillRect(x + 13, y + 1, 1, 1);
    });
    // Superstructure on the hull horizon.
    repeat(ctx, shift * 0.18, 170, (x, k) => {
      const base = 204;
      const kind = k % 3;
      ctx.fillStyle = '#262b3a'; ctx.strokeStyle = '#3c4256'; ctx.lineWidth = 1.5;
      if (kind === 0) {
        // Radar dish on a mast.
        ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - 30); ctx.stroke();
        ctx.save(); ctx.translate(x, base - 32); ctx.rotate(Math.sin(t * 0.6 + k) * 0.5);
        ctx.fillStyle = '#3c4256'; ctx.beginPath(); ctx.arc(0, 0, 12, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
        ctx.restore();
      } else if (kind === 1) {
        // Fuel tank.
        ctx.fillStyle = '#2c3242';
        ctx.beginPath(); ctx.roundRect(x - 18, base - 22, 36, 22, 8); ctx.fill();
        ctx.fillStyle = '#3c4256'; ctx.fillRect(x - 18, base - 16, 36, 2);
      } else {
        // Comms tower, red lamp.
        ctx.beginPath(); ctx.moveTo(x - 4, base); ctx.lineTo(x, base - 44); ctx.lineTo(x + 4, base); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 6, base - 20); ctx.lineTo(x + 6, base - 20); ctx.stroke();
        ctx.fillStyle = (Math.floor(t * 2 + k) % 2) ? '#ff3b3b' : '#4a1414';
        ctx.fillRect(x - 1.5, base - 47, 3, 3);
      }
      ctx.fillStyle = '#ffb347'; ctx.globalAlpha = 0.9;
      ctx.fillRect(x + 20, base - 6, 2, 2); ctx.fillRect(x - 24, base - 4, 2, 2);
      ctx.globalAlpha = 1;
    });
    // Gantry arches, near, silhouette.
    repeat(ctx, shift * 0.35, 150, (x) => {
      ctx.fillStyle = '#121624';
      ctx.fillRect(x, 118, 4, GROUND_Y - 118); ctx.fillRect(x + 66, 118, 4, GROUND_Y - 118);
      ctx.fillRect(x, 118, 70, 4);
      ctx.fillStyle = 'rgba(255,179,71,0.7)'; ctx.fillRect(x + 33, 122, 4, 2);
    });

    ctx.save();
    applyWorld(ctx, ZOOM, 0, GROUND_Y);
    // The hull.
    ctx.fillStyle = '#3b4254'; ctx.fillRect(-20, GROUND_Y, VIEW_W + 40, 60);
    ctx.fillStyle = '#6f7890'; ctx.fillRect(-20, GROUND_Y, VIEW_W + 40, 1);
    ctx.fillStyle = '#1e2230'; ctx.fillRect(-20, GROUND_Y + 14, VIEW_W + 40, 60);
    ctx.fillStyle = 'rgba(56,216,248,0.55)'; ctx.fillRect(-20, GROUND_Y + 18, VIEW_W + 40, 1);
    for (let x = -(camX % 40); x < VIEW_W + 40; x += 40) {
      const k = Math.floor((x + camX) / 40);
      ctx.fillStyle = '#232838'; ctx.fillRect(x, GROUND_Y, 1, 14);
      ctx.fillStyle = '#4c546a'; ctx.fillRect(x + 6, GROUND_Y + 4, 1, 1); ctx.fillRect(x + 33, GROUND_Y + 9, 1, 1);
      if (k % 2 === 0) {
        const on = ((t * 2 + k * 0.5) % 2) < 1;
        ctx.fillStyle = on ? '#ffb347' : '#6a4a20';
        ctx.fillRect(x + 18, GROUND_Y + 3, 4, 2);
      }
    }
    // The hatch, open.
    const hx = 150;
    ctx.fillStyle = '#000'; ctx.fillRect(hx, GROUND_Y, 16, 5);
    ctx.save(); ctx.translate(hx, GROUND_Y); ctx.rotate(-1.05);
    ctx.fillStyle = '#5a6478'; ctx.fillRect(0, -4, 16, 4);
    ctx.fillStyle = '#8c96ac'; ctx.fillRect(0, -4, 16, 1);
    ctx.fillStyle = '#ff3b3b'; ctx.fillRect(13, -3, 2, 2);
    ctx.restore();
    ctx.fillStyle = '#8c96ac'; ctx.fillRect(hx - 1, GROUND_Y - 2, 2, 2);
    // The vent, blowing.
    const vx = 206;
    ctx.fillStyle = '#232838'; ctx.fillRect(vx - 5, GROUND_Y - 2, 10, 2);
    ctx.fillStyle = 'rgba(240,244,255,0.32)';
    const jet = 22 + Math.sin(t * 9) * 4;
    ctx.beginPath(); ctx.moveTo(vx - 3, GROUND_Y - 2); ctx.lineTo(vx - 8, GROUND_Y - jet); ctx.lineTo(vx + 8, GROUND_Y - jet); ctx.lineTo(vx + 3, GROUND_Y - 2); ctx.closePath(); ctx.fill();
    const drone = makeObstacle('drone', camX + 186);
    drawWorldEntity(ctx, drone, camX, t, pack, {});
    coinArc(ctx, camX, t, pack, 95, 140, 4, 12);
    hero(ctx, 'run', t);
    ctx.restore();
    ctx.fillStyle = 'rgba(20,30,60,0.08)'; ctx.fillRect(0, 0, W, H);
  },
};

// ---------------------------------------------------------------- D. RING STATION
// Inside a rotating ring. The read is architectural: the floor ahead curves
// UP and comes back over your head as the far side of the ring, with its own
// windows and blocks hanging inward. Gravity is the spin. Clean interior
// palette — white panels, a green guide strip, one warm sun-tube along the
// ring's spine.
const ringStation = {
  letter: 'D', name: 'RING STATION',
  note: 'Inside a spinning ring: the floor curves up and over, the far side of the ring is the ceiling, with '
    + 'windows and blocks hanging from it (and a tiny B33P running it). Clean white interior; the spin is the '
    + 'gravity.',
  draw(ctx, { camX, t, pack }) {
    skyFill(ctx, '#0b0d16', '#161a2c');
    const cov = backgroundPaintCoverage(ctx);
    const shift = camX * ZOOM;
    // The far side of the ring: an annulus band arcing over the top of the
    // frame. Panel seams radiate from the ring's centre and turn with the spin.
    const C = { x: cov.left + cov.width / 2, y: 330 };
    const R0 = 288, R1 = 322;
    ctx.save();
    ctx.beginPath(); ctx.arc(C.x, C.y, R1, 0, Math.PI * 2); ctx.arc(C.x, C.y, R0, 0, Math.PI * 2, true); ctx.clip();
    ctx.fillStyle = '#8e95a8'; ctx.fillRect(cov.left - 80, -80, cov.width + 160, H + 160);
    const seam = 6 * Math.PI / 180;
    const rot = shift * 0.0007;
    for (let i = 0; i < 60; i++) {
      const a = i * seam - rot;
      const ca = Math.cos(a), sa = Math.sin(a);
      ctx.strokeStyle = '#5c6478'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(C.x + ca * R0, C.y + sa * R0); ctx.lineTo(C.x + ca * R1, C.y + sa * R1); ctx.stroke();
      // Every third panel is a window: stars behind it.
      if (i % 3 === 1) {
        const a1 = a + seam * 0.85;
        ctx.fillStyle = '#0a1024';
        ctx.beginPath();
        ctx.arc(C.x, C.y, R0 + 6, a + seam * 0.15, a1);
        ctx.arc(C.x, C.y, R0 + 24, a1, a + seam * 0.15, true);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#cfe0ff';
        for (let s = 0; s < 3; s++) {
          const am = a + seam * (0.25 + 0.2 * s), rm = R0 + 9 + hash(i * 5 + s) * 12;
          ctx.fillRect(C.x + Math.cos(am) * rm, C.y + Math.sin(am) * rm, 1, 1);
        }
      }
      // Blocks hanging inward from the far floor.
      if (i % 5 === 0) {
        const h = 6 + hash(i) * 8;
        ctx.fillStyle = '#6e7690';
        ctx.beginPath();
        ctx.arc(C.x, C.y, R0 - h, a + seam * 0.2, a + seam * 0.8);
        ctx.arc(C.x, C.y, R0, a + seam * 0.8, a + seam * 0.2, true);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#57e39a';
        const am = a + seam * 0.5, rm = R0 - h + 2;
        ctx.fillRect(C.x + Math.cos(am) * rm, C.y + Math.sin(am) * rm, 1.5, 1.5);
      }
    }
    ctx.restore();
    // The inner rim: a thin bright edge where the far floor meets the interior,
    // and the sun-tube along the spine of the ring.
    ctx.strokeStyle = '#d6dcea'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(C.x, C.y, R0 + 0.5, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    tube(ctx, '#fff0c4', 1.5, 0.22, () => { ctx.arc(C.x, C.y, R0 - 40, Math.PI * 1.2, Math.PI * 1.8); });
    // A tiny B33P on the far floor, running upside down: the whole read in one.
    ctx.save();
    const fx = C.x + Math.cos(-Math.PI / 2 + Math.sin(t * 0.1) * 0.05) * R0;
    const fy = C.y + Math.sin(-Math.PI / 2 + Math.sin(t * 0.1) * 0.05) * R0;
    ctx.translate(fx, fy); ctx.scale(1, -1);
    drawToon(ctx, 'b33p', pose('run', t), 0, 0, 10);
    ctx.restore();
    // Hab modules on the near floor's far side.
    repeat(ctx, shift * 0.12, 140, (x, k) => {
      const w = 40 + hash(k) * 30, h = 18 + hash(k + 1) * 12, base = 232;
      ctx.fillStyle = '#c3c8d6';
      ctx.beginPath(); ctx.roundRect(x, base - h, w, h, 4); ctx.fill();
      ctx.fillStyle = '#9aa2b6'; ctx.fillRect(x, base - h + 4, w, 1);
      ctx.fillStyle = '#57e39a'; ctx.fillRect(x + 5, base - 6, 3, 2);
      ctx.fillStyle = '#2a3244'; ctx.fillRect(x + w - 14, base - h + 7, 9, 5);
    });

    ctx.save();
    applyWorld(ctx, ZOOM, 0, GROUND_Y);
    ctx.fillStyle = '#aab0c0'; ctx.fillRect(-20, GROUND_Y, VIEW_W + 40, 60);
    ctx.fillStyle = '#e4e8f0'; ctx.fillRect(-20, GROUND_Y, VIEW_W + 40, 1);
    ctx.fillStyle = 'rgba(87,227,154,0.85)'; ctx.fillRect(-20, GROUND_Y + 5, VIEW_W + 40, 1);
    ctx.fillStyle = '#7c8496';
    for (let x = -(camX % 32); x < VIEW_W + 32; x += 32) ctx.fillRect(x, GROUND_Y + 1, 1, 12);
    ctx.fillStyle = '#8a92a6'; ctx.fillRect(-20, GROUND_Y + 13, VIEW_W + 40, 1);
    // A coolant pipe across the floor, banded, with hazard chevrons either side.
    const px = 150;
    ctx.fillStyle = '#f2c530';
    for (let i = 0; i < 3; i++) { ctx.fillRect(px - 12 + i * 3, GROUND_Y + 2, 1.5, 2); ctx.fillRect(px + 18 + i * 3, GROUND_Y + 2, 1.5, 2); }
    ctx.fillStyle = '#6f7890'; ctx.beginPath(); ctx.roundRect(px - 8, GROUND_Y - 8, 24, 8, 4); ctx.fill();
    ctx.fillStyle = '#3bb0ff'; ctx.fillRect(px - 2, GROUND_Y - 8, 3, 8); ctx.fillRect(px + 8, GROUND_Y - 8, 3, 8);
    // A cargo pod rolling at you.
    ctx.save(); ctx.translate(212, GROUND_Y - 8); ctx.rotate(-t * 4);
    ctx.fillStyle = '#e8ecf4'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a3244'; ctx.fillRect(-8, -1.5, 16, 3);
    ctx.restore();
    coinArc(ctx, camX, t, pack, 100, 190, 6, 14);
    hero(ctx, 'run', t);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,240,220,0.05)'; ctx.fillRect(0, 0, W, H);
  },
};

// THE SECOND VIEW: the station is ON THE MOON. A regolith plain with craters
// runs under the glass to a ridge, one small ringed planet hangs in the sky,
// comets cross it. Far fewer things than spaceView, on purpose — a window
// full of hardware stops being a view.
function comet(ctx, x, y, len, ang, bright = 1) {
  const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
  const g = ctx.createLinearGradient(x, y, tx, ty);
  g.addColorStop(0, `rgba(210,235,255,${0.95 * bright})`); g.addColorStop(1, 'rgba(210,235,255,0)');
  ctx.strokeStyle = g; ctx.lineCap = 'round';
  ctx.lineWidth = 3 * bright; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.fillStyle = '#f2f8ff'; ctx.beginPath(); ctx.arc(x, y, 1.6 * bright, 0, Math.PI * 2); ctx.fill();
}

function lunarView(ctx, shift, t) {
  skyFill(ctx, '#000004', '#06061a');
  const cov = backgroundPaintCoverage(ctx);
  stars(ctx, shift * 0.01, { seed: 5, count: 120, top: 0, bottom: 200, color: '#ffffff' });
  gasGiant(ctx, cov.left + 150, 62, 19, t, { rings: true, tilt: -0.34 });
  // Comets: three, drifting a touch faster than the stars so they are seen to
  // move, tails all away from the same sun.
  const span = cov.width + 200;
  for (const [i, bx, y, len, br] of [[0, 300, 40, 70, 1], [1, 60, 110, 44, 0.7], [2, 420, 150, 30, 0.5]]) {
    const x = cov.left - 100 + ((((bx - shift * 0.03 - t * (4 + i * 2)) % span) + span) % span);
    comet(ctx, x, y, len, -0.42, br);
  }
  // THE GROUND FIRST, then the hills standing on it. The first cut drew the
  // ranges and laid the plain over their feet, which cut every mountain off
  // against a straight bright rule — they read as a painted flat behind a wall
  // rather than as landscape the station is standing in.
  //
  // So: the regolith goes down first, its horizon is a SOFT band rather than a
  // line, and each range is planted with its feet BELOW that horizon. The
  // nearest range is drawn after the plain, well in front of the horizon, with
  // the shadow it throws pooled at its base — that one is unambiguously
  // standing on the ground.
  const plainY = 186;
  const pg = ctx.createLinearGradient(0, plainY, 0, H);
  pg.addColorStop(0, '#31323f'); pg.addColorStop(0.35, '#4c4d5e'); pg.addColorStop(1, '#6e6f80');
  ctx.fillStyle = pg; ctx.fillRect(cov.left - 80, plainY, cov.width + 160, H + 80 - plainY);
  const hz = ctx.createLinearGradient(0, plainY - 3, 0, plainY + 9);
  hz.addColorStop(0, 'rgba(150,152,170,0)');
  hz.addColorStop(0.35, 'rgba(150,152,170,0.5)');
  hz.addColorStop(1, 'rgba(150,152,170,0)');
  ctx.fillStyle = hz; ctx.fillRect(cov.left - 80, plainY - 3, cov.width + 160, 12);

  // Three ranges rather than one sawtooth, each at its own rate and tone.
  // Lunar hills are ERODED — no atmosphere to cut them, only four billion
  // years of impacts — so the far and near ranges are round-shouldered and
  // only the mid one keeps its points. `foot` is how far below its base line a
  // range fills, which is what plants it instead of floating it.
  // EVERY PIECE OF THIS IS ON THE GROUND, and the way that is guaranteed is
  // that the lit faces are CLIPPED TO THE HILL rather than drawn as their own
  // shapes.
  //
  // The first cut drew each sunward face as a separate triangle built from the
  // straight-line vertices — which only match the path when `round` is false.
  // On the two rounded ranges the triangles landed near the hills instead of
  // on them, and the result was wedges of rock hanging in the sky with nothing
  // under them. Tracing the range once and reusing that exact path as a clip
  // makes a floating piece impossible by construction.
  const range = (f, period, baseY, amp, fill, round, lit, foot) => {
    const peak = (k) => amp * (0.35 + hash(k * 3) * 0.65);
    const wide = (k) => period * (0.5 + hash(k * 3 + 1) * 0.5);
    const trace = () => {
      ctx.moveTo(cov.left - 100, baseY + foot);
      ctx.lineTo(cov.left - 100, baseY);
      repeat(ctx, shift * f, period, (x, k) => {
        const hgt = peak(k), w = wide(k);
        if (round) {
          ctx.quadraticCurveTo(x - w * 0.3, baseY - hgt * 1.3, x, baseY - hgt);
          ctx.quadraticCurveTo(x + w * 0.3, baseY - hgt * 1.25, x + w * 0.7, baseY - hgt * 0.2);
        } else {
          ctx.lineTo(x - w * 0.32, baseY - hgt * 0.45);
          ctx.lineTo(x, baseY - hgt);
          ctx.lineTo(x + w * 0.42, baseY - hgt * 0.28);
        }
        ctx.lineTo(x + w * 0.85, baseY - hgt * 0.06);
      }, 160);
      ctx.lineTo(cov.right + 100, baseY);
      ctx.lineTo(cov.right + 100, baseY + foot);
      ctx.closePath();
    };
    ctx.fillStyle = fill;
    ctx.beginPath(); trace(); ctx.fill();
    if (!lit) return;
    // The sun is low and to the left for the whole picture, hills and craters
    // alike. Inside the hill's own silhouette, brighten the left flank of each
    // peak — a gradient, so the terminator is a soft edge rather than a seam.
    ctx.save();
    ctx.beginPath(); trace(); ctx.clip();
    repeat(ctx, shift * f, period, (x, k) => {
      const hgt = peak(k), w = wide(k);
      const g = ctx.createLinearGradient(x - w * 0.55, 0, x + w * 0.06, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.45, lit);
      g.addColorStop(1, lit);
      ctx.fillStyle = g;
      ctx.fillRect(x - w * 0.55, baseY - hgt * 1.35, w * 0.62, hgt * 1.4 + foot);
    }, 160);
    ctx.restore();
  };
  range(0.03, 150, plainY + 2, 46, '#1b1e2c', true, '#262a3b', 8);
  range(0.05, 96, plainY + 6, 34, '#14161f', false, '#1e212d', 10);
  ctx.fillStyle = 'rgba(10,10,18,0.32)';
  repeat(ctx, shift * 0.08, 62, (x) => {
    ctx.beginPath(); ctx.ellipse(x + 8, plainY + 27, 40, 6, 0, 0, Math.PI * 2); ctx.fill();
  }, 160);
  range(0.08, 62, plainY + 25, 22, '#0d0e15', true, '#171926', 34);

  // Craters, larger the nearer they are; a dome and a lander far off.
  repeat(ctx, shift * 0.12, 240, (x, k) => {
    ctx.fillStyle = '#4a4a58';
    ctx.beginPath(); ctx.arc(x, plainY + 2, 13, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#3bd9ff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(x, plainY + 2, 8, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.globalAlpha = 1;
    const lx = x + 110 + hash(k) * 60;
    ctx.fillStyle = '#5a5a68'; ctx.fillRect(lx - 5, plainY - 9, 10, 6); ctx.fillRect(lx - 3, plainY - 13, 6, 4);
    ctx.strokeStyle = '#5a5a68'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx - 4, plainY - 4); ctx.lineTo(lx - 8, plainY + 1); ctx.moveTo(lx + 4, plainY - 4); ctx.lineTo(lx + 8, plainY + 1); ctx.stroke();
  });
  for (const [f, period, y0, rx, seed] of [[0.18, 90, 224, 9, 3], [0.32, 140, 240, 18, 7]]) {
    repeat(ctx, shift * f, period, (x, k) => {
      const w = rx * (0.7 + hash(k + seed) * 0.6), y = y0 + hash(k + seed + 1) * 12;
      ctx.fillStyle = '#5a5a68'; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a8a8b6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 1, w, w * 0.3, 0, Math.PI, 0); ctx.stroke();
    });
  }
}

// THE GLASS. Five things, all faint, that together say "there is a sheet here":
// a cool tint that is lighter at the top than the bottom; one broad diagonal
// specular sheet with a sharp leading edge; a Fresnel rim — the pane brightens
// toward its own edge; the lane's phosphor rails reflected inside the pane,
// top and bottom; and a 1px inset bevel. None of it is allowed to hide what is
// outside — every alpha here is under 0.2.
function glassStylised(ctx, panePath, x, x0, paneW, top, bot, t = 0, k = 0) {
  const h = bot - top;
  const x1 = x0 + paneW;
  ctx.save();
  ctx.beginPath(); panePath(x); ctx.clip();

  // 1. THE TINT. Glass is not neutral: it is cold, and denser at the bottom of
  // the sheet where it is reflecting the deck rather than the sky.
  const tint = ctx.createLinearGradient(0, top, 0, bot);
  tint.addColorStop(0, 'rgba(150,215,255,0.10)');
  tint.addColorStop(0.45, 'rgba(90,150,210,0.025)');
  tint.addColorStop(1, 'rgba(40,90,150,0.10)');
  ctx.fillStyle = tint; ctx.fillRect(x0, top, paneW, h);

  // 2. THE SPECULAR SHEET, two bands with a sharp leading edge, LEANING across
  // the pane — the lean is what makes it read as reflected light rather than a
  // painted stripe.
  const lean = paneW * 0.42;
  const band = (ox, w, a0, a1) => {
    const g = ctx.createLinearGradient(x0 + ox, top, x0 + ox + w, top);
    g.addColorStop(0, `rgba(235,248,255,${a0})`);
    g.addColorStop(0.3, `rgba(235,248,255,${a1})`);
    g.addColorStop(1, 'rgba(235,248,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 + ox, top); ctx.lineTo(x0 + ox + w, top);
    ctx.lineTo(x0 + ox + w + lean, bot); ctx.lineTo(x0 + ox + lean, bot);
    ctx.closePath(); ctx.fill();
  };
  band(paneW * 0.06, paneW * 0.30, 0.15, 0.06);
  band(paneW * 0.52, paneW * 0.10, 0.10, 0.03);
  ctx.strokeStyle = 'rgba(245,252,255,0.26)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0 + paneW * 0.06, top); ctx.lineTo(x0 + paneW * 0.06 + lean, bot); ctx.stroke();
  ctx.strokeStyle = 'rgba(245,252,255,0.12)';
  ctx.beginPath(); ctx.moveTo(x0 + paneW * 0.52, top); ctx.lineTo(x0 + paneW * 0.52 + lean, bot); ctx.stroke();

  // 3. THE CAUSTIC. Light pools where the sheets meet the curved top corner —
  // one soft blob, the thing a flat gradient can never give you.
  const pool = ctx.createRadialGradient(x0 + paneW * 0.2, top + h * 0.13, 0, x0 + paneW * 0.2, top + h * 0.13, paneW * 0.4);
  pool.addColorStop(0, 'rgba(255,255,255,0.12)');
  pool.addColorStop(0.5, 'rgba(210,240,255,0.045)');
  pool.addColorStop(1, 'rgba(210,240,255,0)');
  ctx.fillStyle = pool; ctx.fillRect(x0, top, paneW, h);

  // 4. THE DEFECTS, which are what stop a pane looking like an empty hole.
  // Stable per pane: a smear someone wiped, a chip with a short radial crack,
  // and dust settled along the bottom seal.
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(220,240,255,0.055)'; ctx.lineWidth = 7;
  const smx = x0 + paneW * (0.55 + hash(k) * 0.25), smy = top + h * (0.3 + hash(k + 1) * 0.4);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(smx - 18, smy + i * 7);
    ctx.quadraticCurveTo(smx, smy + i * 7 - 5, smx + 18, smy + i * 7 + 2);
    ctx.stroke();
  }
  const chx = x0 + paneW * (0.2 + hash(k + 3) * 0.6), chy = top + h * (0.2 + hash(k + 4) * 0.55);
  ctx.strokeStyle = 'rgba(235,250,255,0.45)'; ctx.lineWidth = 0.75;
  for (let i = 0; i < 4; i++) {
    const a = hash(k * 7 + i) * Math.PI * 2, r = 2 + hash(k * 7 + i + 1) * 5;
    ctx.beginPath(); ctx.moveTo(chx, chy); ctx.lineTo(chx + Math.cos(a) * r, chy + Math.sin(a) * r); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(chx, chy, 1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(200,220,240,0.2)';
  for (let i = 0; i < 16; i++) ctx.fillRect(x0 + hash(k * 13 + i) * paneW, bot - 3 - hash(k * 13 + i + 1) * 5, 1, 1);

  // 5. THE REFLECTED DECK. The lane's own phosphor rails show up faintly IN the
  // glass — the strongest single cue that this is a surface and not a hole —
  // plus a deck lamp sliding slowly along the pane.
  for (const [ry, dir] of [[top + 6, 1], [bot - 6, -1]]) {
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(159,240,255,${0.16 - i * 0.045})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, ry + i * dir * 1.6 + 0.5); ctx.lineTo(x1, ry + i * dir * 1.6 + 0.5); ctx.stroke();
    }
  }
  const lampU = ((t * 0.11 + hash(k)) % 1);
  const lg = ctx.createLinearGradient(x0 + lampU * paneW - 30, 0, x0 + lampU * paneW + 30, 0);
  lg.addColorStop(0, 'rgba(255,240,200,0)');
  lg.addColorStop(0.5, 'rgba(255,240,200,0.06)');
  lg.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = lg; ctx.fillRect(x0, top, paneW, h);

  // 6. FRESNEL. A pane is brightest where you see it most obliquely — its own
  // edge. Three clipped strokes of falling width give that ramp.
  ctx.strokeStyle = 'rgba(190,235,255,0.085)'; ctx.lineWidth = 16;
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,240,255,0.14)'; ctx.lineWidth = 7;
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.strokeStyle = 'rgba(225,248,255,0.28)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.restore();

  // 7. THE FRAME. The edge line, then a bevel — light where the deck lamps are,
  // a dark seal opposite — which is what gives the pane thickness. Four bolts:
  // the glass is held in, not floating.
  ctx.strokeStyle = 'rgba(159,240,255,0.55)'; ctx.lineWidth = 1;
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.save();
  ctx.translate(-1.5, -1.5); ctx.strokeStyle = 'rgba(225,248,255,0.20)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.translate(3, 3); ctx.strokeStyle = 'rgba(0,0,12,0.55)';
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(120,180,210,0.5)';
  for (const [bx, by] of [[x0 + 8, top + 8], [x1 - 8, top + 8], [x0 + 8, bot - 8], [x1 - 8, bot - 8]]) {
    ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, Math.PI * 2); ctx.fill();
  }
}


// ---------------------------------------------------------------- GLASS, FOR REAL
// The stylised pane above is a set of nice marks. These two are an attempt at
// the actual optics, because at this size the thing that sells glass is not
// prettiness — it is that the pane REFLECTS THE ROOM YOU ARE STANDING IN. Four
// facts drive everything below.
//
// 1. FRESNEL. Reflectance is near zero looking straight through and rises
//    steeply toward grazing angles. On a flat pane seen from the middle of the
//    deck that means the LEFT AND RIGHT EDGES are mirrors and the centre is a
//    window. It is a horizontal ramp, not a border.
// 2. THE REFLECTION IS THE INTERIOR, UPSIDE DOWN-ISH. What is behind the
//    viewer — the deck's two phosphor rails, the gate's orange column, the
//    hero himself — appears IN the glass, mirrored about the pane, dimmer than
//    the real thing and never sharper.
// 3. GLASS IS GREEN. Iron in float glass tints it, and the tint is deepest
//    where the light path through it is longest: at the edges. An AR coating
//    adds the opposite — a faint magenta bloom — which is why real spacecraft
//    windows have coloured edges.
// 4. IT IS NEVER CLEAN. Micro-scratches catch the light in arcs, dust settles
//    in the bottom corners, and somebody's glove touched it.
function glassRealistic(ctx, panePath, x, x0, paneW, top, bot, t = 0, k = 0, { doubleGlazed = false } = {}) {
  const h = bot - top, w = paneW, x1 = x0 + w;
  const cx = x0 + w / 2;
  ctx.save();
  ctx.beginPath(); panePath(x); ctx.clip();

  // --- the body tint: green, deepest at the edges where the path is longest
  const iron = ctx.createLinearGradient(x0, 0, x1, 0);
  iron.addColorStop(0, 'rgba(90,150,130,0.16)');
  iron.addColorStop(0.5, 'rgba(120,180,170,0.02)');
  iron.addColorStop(1, 'rgba(90,150,130,0.16)');
  ctx.fillStyle = iron; ctx.fillRect(x0, top, w, h);

  // --- FRESNEL as a horizontal ramp. This is the whole illusion: the pane is
  // a mirror at its edges and a window in the middle.
  const fres = ctx.createLinearGradient(x0, 0, x1, 0);
  fres.addColorStop(0, 'rgba(150,190,225,0.30)');
  fres.addColorStop(0.16, 'rgba(150,190,225,0.06)');
  fres.addColorStop(0.5, 'rgba(150,190,225,0)');
  fres.addColorStop(0.84, 'rgba(150,190,225,0.06)');
  fres.addColorStop(1, 'rgba(150,190,225,0.30)');
  ctx.fillStyle = fres; ctx.fillRect(x0, top, w, h);

  // --- THE REFLECTED INTERIOR. Everything here is the deck, mirrored into the
  // glass and modulated by that same Fresnel ramp, so it is strong at the
  // pane's edges and almost gone in the middle — exactly where you want to be
  // able to see out.
  const reflect = (draw, strength) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = strength;
    draw();
    ctx.restore();
  };
  // The two phosphor rails, reflected: they appear as horizontal bars inside
  // the pane, pulled toward its middle by the reflection geometry.
  for (const ry of [top + h * 0.13, bot - h * 0.11]) {
    reflect(() => {
      const g = ctx.createLinearGradient(x0, ry - 5, x0, ry + 5);
      g.addColorStop(0, 'rgba(56,216,248,0)');
      g.addColorStop(0.5, 'rgba(56,216,248,0.5)');
      g.addColorStop(1, 'rgba(56,216,248,0)');
      ctx.fillStyle = g;
      // Modulated by Fresnel: brightest at the pane's edges.
      ctx.fillRect(x0, ry - 5, w * 0.22, 10);
      ctx.fillRect(x1 - w * 0.22, ry - 5, w * 0.22, 10);
      ctx.globalAlpha *= 0.28;
      ctx.fillRect(x0, ry - 5, w, 10);
    }, 0.5);
  }
  // The polarity gate's orange column, reflected — a soft vertical smear that
  // drifts as the deck slides past.
  const gu = ((t * 0.07 + hash(k) * 0.9) % 1.4) - 0.2;
  if (gu > 0 && gu < 1) {
    reflect(() => {
      const g = ctx.createLinearGradient(x0 + gu * w - 9, 0, x0 + gu * w + 9, 0);
      g.addColorStop(0, 'rgba(255,154,46,0)');
      g.addColorStop(0.5, 'rgba(255,154,46,0.30)');
      g.addColorStop(1, 'rgba(255,154,46,0)');
      ctx.fillStyle = g; ctx.fillRect(x0, top, w, h);
    }, 0.55);
  }
  // A ceiling lamp, reflected: one small bright lozenge with a vertical streak
  // under it. The single most convincing mark on the pane.
  const lx = x0 + w * (0.24 + hash(k + 2) * 0.5), ly = top + h * 0.22;
  reflect(() => {
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 26);
    g.addColorStop(0, 'rgba(255,248,230,0.55)');
    g.addColorStop(0.3, 'rgba(255,245,220,0.14)');
    g.addColorStop(1, 'rgba(255,245,220,0)');
    ctx.fillStyle = g; ctx.fillRect(lx - 30, ly - 30, 60, 60);
    const v = ctx.createLinearGradient(lx, ly, lx, bot);
    v.addColorStop(0, 'rgba(255,248,230,0.16)');
    v.addColorStop(1, 'rgba(255,248,230,0)');
    ctx.fillStyle = v; ctx.fillRect(lx - 2.5, ly, 5, bot - ly);
  }, 1);

  if (doubleGlazed) {
    // TWO SHEETS, so every reflection arrives twice: once off the inner
    // surface and again, offset and dimmer, off the outer one. The offset is
    // the gap between the panes. This is the cue that says SPACECRAFT rather
    // than shop window.
    const dx = 5, dy = 3;
    reflect(() => {
      const g = ctx.createRadialGradient(lx + dx, ly + dy, 0, lx + dx, ly + dy, 22);
      g.addColorStop(0, 'rgba(210,235,255,0.26)');
      g.addColorStop(1, 'rgba(210,235,255,0)');
      ctx.fillStyle = g; ctx.fillRect(lx - 30, ly - 30, 70, 70);
    }, 1);
    // Interference: where the two sheets are closest the reflection goes
    // faintly coloured, warm on one side of the pane and cold on the other.
    const iri = ctx.createLinearGradient(x0, top, x1, bot);
    iri.addColorStop(0, 'rgba(120,90,200,0.07)');
    iri.addColorStop(0.45, 'rgba(60,200,180,0.035)');
    iri.addColorStop(1, 'rgba(200,110,150,0.07)');
    ctx.fillStyle = iri; ctx.fillRect(x0, top, w, h);
    // The inner pane's own edge, a hair inside the frame.
    ctx.strokeStyle = 'rgba(190,225,240,0.22)'; ctx.lineWidth = 1;
    ctx.save(); ctx.translate(2.5, 2); ctx.beginPath(); panePath(x); ctx.stroke(); ctx.restore();
  }

  // --- WEAR. Micro-scratches first: fine arcs that only exist where the light
  // hits them, which is why they cluster in the lamp's quadrant.
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = hash(k * 31 + i), b = hash(k * 31 + i + 1);
    const sx = x0 + w * (0.1 + a * 0.8), sy = top + h * (0.15 + b * 0.7);
    const len = 8 + a * 26, bow = (b - 0.5) * 14;
    const near = 1 - Math.min(1, Math.hypot(sx - lx, sy - ly) / (w * 0.6));
    ctx.strokeStyle = `rgba(235,248,255,${(0.05 + near * 0.16).toFixed(3)})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + len * 0.5, sy + bow, sx + len, sy + bow * 0.3);
    ctx.stroke();
  }
  // A glove print: three or four soft ovals, low on the pane.
  const px0 = x0 + w * (0.6 + hash(k + 5) * 0.25), py0 = bot - h * (0.2 + hash(k + 6) * 0.15);
  ctx.fillStyle = 'rgba(210,230,245,0.045)';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(px0 + i * 4.5, py0 + Math.sin(i) * 3, 3.4, 4.6, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Dust, settled into the bottom corners rather than sprinkled evenly.
  for (const [dx0, dir] of [[x0, 1], [x1, -1]]) {
    const g = ctx.createRadialGradient(dx0 + dir * 12, bot - 10, 0, dx0 + dir * 12, bot - 10, 34);
    g.addColorStop(0, 'rgba(180,195,215,0.10)');
    g.addColorStop(1, 'rgba(180,195,215,0)');
    ctx.fillStyle = g; ctx.fillRect(x0, top, w, h);
  }
  ctx.fillStyle = 'rgba(205,220,240,0.22)';
  for (let i = 0; i < 20; i++) {
    const u = hash(k * 17 + i);
    ctx.fillRect(x0 + u * w, bot - 2 - hash(k * 17 + i + 1) * 7, 1, 1);
  }
  ctx.restore();

  // --- THE FRAME. A deep, seated bevel: the glass is recessed into the wall,
  // so the top-left of the reveal is lit and the bottom-right is in shadow —
  // the opposite of the pane's own highlight, which is what gives it depth.
  ctx.save();
  ctx.strokeStyle = 'rgba(10,14,32,0.85)'; ctx.lineWidth = 4;
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.translate(-1.5, -1.5);
  ctx.strokeStyle = 'rgba(200,225,245,0.30)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.translate(3, 3);
  ctx.strokeStyle = 'rgba(0,0,10,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.restore();
  // The glass's own edge, green where it is thickest.
  ctx.strokeStyle = 'rgba(130,215,200,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); panePath(x); ctx.stroke();
  // Retaining bolts, sunk: a dark hole with a lit upper lip.
  for (const [bx, by] of [[x0 + 9, top + 9], [x1 - 9, top + 9], [x0 + 9, bot - 9], [x1 - 9, bot - 9]]) {
    ctx.fillStyle = 'rgba(8,12,26,0.9)'; ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(170,205,230,0.5)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(bx, by, 2.2, Math.PI * 1.15, Math.PI * 1.95); ctx.stroke();
  }
}

// The quiet one: no reflected room at all, just the body tint, one Fresnel
// ramp and the edge. Here to prove how much of the effect above is the
// reflections doing the work.
function glassClean(ctx, panePath, x, x0, paneW, top, bot) {
  ctx.save();
  ctx.beginPath(); panePath(x); ctx.clip();
  const g = ctx.createLinearGradient(x0, top, x0 + paneW, bot);
  g.addColorStop(0, 'rgba(150,200,235,0.10)');
  g.addColorStop(0.55, 'rgba(120,170,210,0.02)');
  g.addColorStop(1, 'rgba(90,140,190,0.09)');
  ctx.fillStyle = g; ctx.fillRect(x0, top, paneW, bot - top);
  ctx.strokeStyle = 'rgba(190,230,255,0.13)'; ctx.lineWidth = 9;
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(159,240,255,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); panePath(x); ctx.stroke();
}


// THE BANDS ON THEIR OWN. M's restraint — body tint, one Fresnel ramp, the
// edge — plus the leaning specular sheet from the stylised pane, and nothing
// else. No reflected room, no lamp, no chip, no dust. The sheet is the only
// mark, which is the point: it says "there is a surface here" without putting
// a picture of the deck on it.
function glassBands(ctx, panePath, x, x0, paneW, top, bot) {
  const h = bot - top, x1 = x0 + paneW;
  ctx.save();
  ctx.beginPath(); panePath(x); ctx.clip();
  // The body: cold, and slightly denser at the bottom where the sheet is
  // reflecting deck rather than sky.
  const tint = ctx.createLinearGradient(0, top, 0, bot);
  tint.addColorStop(0, 'rgba(150,215,255,0.09)');
  tint.addColorStop(0.5, 'rgba(100,160,215,0.02)');
  tint.addColorStop(1, 'rgba(50,100,160,0.09)');
  ctx.fillStyle = tint; ctx.fillRect(x0, top, paneW, h);
  // THE SHEET, leaning across the pane. Two bands of different width with a
  // sharp leading edge on each; the lean is what makes it read as light
  // arriving at an angle rather than a painted stripe.
  const lean = paneW * 0.42;
  const band = (ox, w, a0, a1) => {
    const g = ctx.createLinearGradient(x0 + ox, top, x0 + ox + w, top);
    g.addColorStop(0, `rgba(235,248,255,${a0})`);
    g.addColorStop(0.3, `rgba(235,248,255,${a1})`);
    g.addColorStop(1, 'rgba(235,248,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 + ox, top); ctx.lineTo(x0 + ox + w, top);
    ctx.lineTo(x0 + ox + w + lean, bot); ctx.lineTo(x0 + ox + lean, bot);
    ctx.closePath(); ctx.fill();
  };
  band(paneW * 0.06, paneW * 0.30, 0.15, 0.06);
  band(paneW * 0.52, paneW * 0.10, 0.10, 0.03);
  ctx.strokeStyle = 'rgba(245,252,255,0.26)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0 + paneW * 0.06, top); ctx.lineTo(x0 + paneW * 0.06 + lean, bot); ctx.stroke();
  ctx.strokeStyle = 'rgba(245,252,255,0.12)';
  ctx.beginPath(); ctx.moveTo(x0 + paneW * 0.52, top); ctx.lineTo(x0 + paneW * 0.52 + lean, bot); ctx.stroke();
  // One Fresnel ramp, and that is the lot.
  const fres = ctx.createLinearGradient(x0, 0, x1, 0);
  fres.addColorStop(0, 'rgba(170,215,245,0.22)');
  fres.addColorStop(0.18, 'rgba(170,215,245,0.04)');
  fres.addColorStop(0.5, 'rgba(170,215,245,0)');
  fres.addColorStop(0.82, 'rgba(170,215,245,0.04)');
  fres.addColorStop(1, 'rgba(170,215,245,0.22)');
  ctx.fillStyle = fres; ctx.fillRect(x0, top, paneW, h);
  ctx.restore();
  // The edge and a shallow bevel: enough to seat the glass in the wall.
  ctx.strokeStyle = 'rgba(159,240,255,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.save();
  ctx.translate(-1.2, -1.2); ctx.strokeStyle = 'rgba(215,242,255,0.16)';
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.translate(2.4, 2.4); ctx.strokeStyle = 'rgba(0,0,12,0.45)';
  ctx.beginPath(); panePath(x); ctx.stroke();
  ctx.restore();
}

// A GLIMPSE OF THE HERO, AND ONLY A GLIMPSE.
//
// The geometry is free: the hero runs on his mark at PLAYER_X and the glass is
// the wall behind him, so his reflection is the same painter drawn at the same
// screen position, MIRRORED left-to-right — he is facing right, his reflection
// faces left — set back a little and very dim.
//
// What makes it a glimpse rather than a second hero is where the pane ENDS.
// The panes stop at screen y 222 and his feet are at 232, so the bottom of the
// reflection is cut off by the frame: what survives is a head and a shoulder
// low in the glass, which is exactly what you catch out of the corner of your
// eye walking past a window. No extra clipping needed — the wall does it.
function heroGhost(ctx, panePath, x, t, { alpha = 0.17, lift = 2, setBack = 0.93, shift = 34 } = {}) {
  // THE OFFSET IS THE WHOLE TRICK. A pane square-on to the camera puts his
  // reflection exactly where he is standing, and the real hero — drawn after
  // the glass — covers every pixel of it. Nothing was visible.
  //
  // So the wall is taken to sit at a slight angle to the lane, which is what
  // an observation deck's glass does anyway: it displaces the reflected image
  // DOWNSTREAM. He now sees himself a little ahead of where he is, which is
  // both correct for angled glass and the only arrangement where the glimpse
  // survives being drawn under him.
  const rx = PLAYER_X * ZOOM + shift;
  const feet = GROUND_Y + lift;
  const h = HERO_DRAW_H * ZOOM;
  const head = feet - h;
  // AND IT FADES DOWNWARD. At one flat alpha he read as a second, greyer hero
  // standing behind the first. A reflection off a pane this dim is strongest
  // where the specular is — high in the glass — and gone by the bottom, so the
  // figure is painted in four bands of falling opacity. What is left is a head
  // and a shoulder: a glimpse, which is what was asked for.
  const BANDS = 4;
  for (let i = 0; i < BANDS; i++) {
    const y0 = head + (h * i) / BANDS, y1 = head + (h * (i + 1)) / BANDS;
    ctx.save();
    ctx.beginPath(); panePath(x); ctx.clip();
    ctx.beginPath(); ctx.rect(rx - h, y0, h * 2, y1 - y0); ctx.clip();
    ctx.globalAlpha = alpha * (1 - i / BANDS) ** 1.6;
    // Mirrored — he faces right, his reflection faces left — and a hair
    // smaller, because the reflected image is further away than he is.
    ctx.translate(rx, feet);
    ctx.scale(-setBack, setBack);
    ctx.translate(-rx, -feet);
    drawToon(ctx, 'b33p', pose('run', t), rx, feet, h);
    ctx.restore();
  }
}

const GLASS_STYLES = {
  stylised: (c, pp, x, x0, w, tp, bt, t, k) => glassStylised(c, pp, x, x0, w, tp, bt, t, k),
  realistic: (c, pp, x, x0, w, tp, bt, t, k) => glassRealistic(c, pp, x, x0, w, tp, bt, t, k),
  double: (c, pp, x, x0, w, tp, bt, t, k) => glassRealistic(c, pp, x, x0, w, tp, bt, t, k, { doubleGlazed: true }),
  clean: (c, pp, x, x0, w, tp, bt) => glassClean(c, pp, x, x0, w, tp, bt),
  bands: (c, pp, x, x0, w, tp, bt) => glassBands(c, pp, x, x0, w, tp, bt),
};

// ROUNDED PANES. No struts: the wall between the panes is the divider, and
// the pane edge is one thin phosphor line. Same reflection arc as the others.
function roundedWindows(ctx, shift, { top = 26, bot = 222, paneW = PANE_W, gap = PANE_GAP, radius = PANE_RADIUS, t = 0, style = 'stylised', ghost = false } = {}) {
  const cov = backgroundPaintCoverage(ctx);
  const period = paneW + gap;
  const panePath = (x) => { ctx.roundRect(x + gap / 2, top, paneW, bot - top, radius); };
  ctx.fillStyle = GG.wall;
  ctx.beginPath();
  ctx.rect(cov.left - 80, -80, cov.width + 160, H + 160);
  repeat(ctx, shift, period, (x) => { panePath(x); });
  ctx.fill('evenodd');
  repeat(ctx, shift, period, (x, k) => {
    const x0 = x + gap / 2;
    // The reflection goes UNDER the glass: it is behind the surface, so the
    // sheet and the Fresnel ramp pass over it like they pass over the view.
    if (ghost) heroGhost(ctx, panePath, x, t);
    (GLASS_STYLES[style] || GLASS_STYLES.stylised)(ctx, panePath, x, x0, paneW, top, bot, t, k);
  });
}

// ---------------------------------------------------------------- E/F/G. OBSERVATION DECK
// A's lane, with the corridor swapped for the outer wall of a station: giant
// curved panes running along it, thin struts between, and the whole of space
// outside — gas giant with rings, a moon, a nebula, another station, a fleet,
// a satellite. Three cuts of the same picture that differ only in the glass:
// how tall the panes are and what stands between them.
const deckNote = 'A\'s front half. Behind it the station\'s outer wall: curved panes, struts between, and the view — '
  + 'ringed gas giant, moon, nebula, a second station, a fleet, a tumbling satellite, all at their own rates. ';
const observationDeck = (letter, name, note, windows) => ({
  letter, name, note: deckNote + note,
  draw(ctx, { camX, t, pack }) {
    const shift = camX * ZOOM;
    spaceView(ctx, shift, t);
    stationWindows(ctx, shift * 0.6, { ...windows, t });
    gridLane(ctx, camX, t, pack);
  },
});
const deckPanes = observationDeck('E', 'OBSERVATION DECK — tall panes',
  'Panes most of the way to the rails, 8px mullions with a readout on each.',
  { top: 34, bot: 214, paneW: 96, gap: 8, bulge: 6, struts: 'mullion' });
const deckFull = observationDeck('F', 'OBSERVATION DECK — rail to rail',
  'The glass runs the whole height between the rails; the mullions are all that is left of the wall.',
  { top: 26, bot: 222, paneW: 112, gap: 8, bulge: 3, struts: 'mullion' });
const deckViewport = observationDeck('G', 'OBSERVATION DECK — one viewport',
  'Wider, more bowed panes with only a line between them: closer to a single continuous viewport.',
  { top: 40, bot: 208, paneW: 150, gap: 6, bulge: 10, struts: 'thin' });

// H. The round of notes on E–G: rounded panes, nothing between them but wall,
// and a calmer view — the station stands on the moon.
const lunarDeck = (letter, name, style, note, ghost = false) => ({
  letter, name, note,
  draw(ctx, { camX: _gallery, t, pack }) {
    // The deck's own pace, not the gallery's default drift: everything in this
    // picture is on one clock and that clock is the moon's.
    const camX = t * LUNAR_SPEED;
    const shift = camX * ZOOM;
    lunarView(ctx, shift, t);
    roundedWindows(ctx, shift, { t, style, ghost });
    gridLane(ctx, camX, t, pack);
  },
});

const DECK_BLURB = 'A\'s front half. Rounded panes, 188 wide with a 7px wall between them; outside, the lunar '
  + 'hills standing on the regolith, a small ringed planet rocking in the sky, comets crossing it. ';
const deckLunar = lunarDeck('H', 'OBSERVATION DECK — stylised glass', 'stylised',
  DECK_BLURB + 'GLASS: the drawn version — leaning specular bands, a caustic in the top corner, a chip and a '
  + 'smear, the rails reflected as flat lines. Marks that read as glass rather than optics that are.');
const deckRealistic = lunarDeck('K', 'OBSERVATION DECK — real optics', 'realistic',
  DECK_BLURB + 'GLASS: the physics. Fresnel as a HORIZONTAL ramp, so the pane is a mirror at its left and right '
  + 'edges and a window in the middle; the deck reflected IN it — both phosphor rails, the gate\'s orange column '
  + 'drifting past, a ceiling lamp with its vertical streak; the green iron tint of float glass, deepest at the '
  + 'edges; micro-scratches that only catch light near the lamp, a glove print and dust in the corners.');
const deckDouble = lunarDeck('L', 'OBSERVATION DECK — double-glazed', 'double',
  DECK_BLURB + 'GLASS: as K, plus the second sheet. Every reflection arrives TWICE — once off the inner surface '
  + 'and again offset and dimmer off the outer — with a faint interference colour across the pane and the inner '
  + 'pane\'s own edge visible inside the frame. This is the one that reads as a spacecraft window rather than a '
  + 'shop front.');
const deckBands = lunarDeck('N', 'OBSERVATION DECK — bands only', 'bands',
  DECK_BLURB + 'GLASS: M\'s restraint with H\'s sheet. Body tint, the two leaning specular bands with their '
  + 'sharp leading edges, one Fresnel ramp, the edge. No reflected room, no lamp, no chip, no dust — the sheet '
  + 'is the only mark on the pane.');
const deckGhost = lunarDeck('O', 'OBSERVATION DECK — bands + a glimpse of him', 'bands',
  DECK_BLURB + 'GLASS: N, plus ONE reflection — his. Same painter, same mark, mirrored left-to-right and set '
  + 'back, at 16%. The panes stop at y222 and his feet are at 232, so the frame cuts the reflection off at the '
  + 'shoulder: what survives is a head low in the glass, which is what you actually catch walking past a window. '
  + 'It sits UNDER the sheet, so the specular passes over it, and a little ahead of him: square-on glass would put the reflection exactly where he is standing and he would cover it.', true);
const deckClean = lunarDeck('M', 'OBSERVATION DECK — no reflections', 'clean',
  DECK_BLURB + 'GLASS: the control. Body tint, one Fresnel ramp, the edge, and nothing else — no reflected room '
  + 'at all. Here to show how much of K and L is the reflections doing the work.');

// ---------------------------------------------------------------- LOW-G: THE ARC, MEASURED
// The question the deck raises: if the station is ON the moon, should the
// cabinet's gravity say so? These two tiles are the same jump under two
// gravities, drawn from the game's OWN constants — GRAVITY 900, BASE_JUMP_V
// 320 — integrated the way run.js integrates them, rather than described.
//
// REAL LUNAR GRAVITY IS NOT A CANDIDATE. At 0.165 the apex is 345px, which is
// off the top of a 270px frame, and the airtime is 4.3s covering 896px —
// nearly four screen-widths of committed flight with no control. 0.65 is the
// setting where every jump visibly floats and the arc still fits the picture.
//
// THE COST IS NOT THE CONSTANT. spawner.js sizes its reaction runway off
// worstAirtime, and fairGap/crossingLayout read these globals; a per-cabinet
// gravity means those read a multiplier too. The same coupling is why
// per-cabinet gravity was rejected for the beat stages (docs/rhythm-beat-sync-plan.md).
const LOWG_SPEED = 208;   // Neon's opening speed, world px/s

function lowGravityShot(mult, label) {
  return {
    letter: 'J', name: label, note: '', mult,
    draw(ctx, { camX, t, pack }) {
      const g = GRAVITY * mult;
      const v = BASE_JUMP_V;
      const air = (2 * v) / g;
      const apex = (v * v) / (2 * g);
      const reach = air * LOWG_SPEED;
      // The loop: one jump, then a beat of running before the next.
      const period = air + 0.5;
      const tau = t % period;
      const flying = tau < air;
      const alt = flying ? v * tau - 0.5 * g * tau * tau : 0;
      const vy = flying ? v - g * tau : 0;

      const shift = camX * ZOOM;
      lunarView(ctx, shift, t);
      roundedWindows(ctx, shift, { t });

      ctx.save();
      applyWorld(ctx, ZOOM, 0, GROUND_Y);
      const ceil = GG_CEIL();
      // Rails only — no gate, no saw: the arc is the subject.
      const rail = (y, dir) => {
        ctx.fillStyle = GG.wall;
        if (dir > 0) ctx.fillRect(-20, y, VIEW_W + 40, 60); else ctx.fillRect(-20, y - 60, VIEW_W + 40, 60);
        tube(ctx, GG.ink, 1, 0.18, () => { ctx.moveTo(-20, y + 0.5 * dir); ctx.lineTo(VIEW_W + 20, y + 0.5 * dir); });
        ctx.strokeStyle = GG.dim; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-20, y + 7 * dir + 0.5); ctx.lineTo(VIEW_W + 20, y + 7 * dir + 0.5); ctx.stroke();
        for (let x = -(camX % 24); x < VIEW_W + 24; x += 24) {
          ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + 7 * dir); ctx.stroke();
        }
      };
      rail(GROUND_Y, 1);
      rail(ceil, -1);

      // THE WHOLE ARC, anchored at the takeoff point. The hero holds his mark
      // at PLAYER_X while the world slides, so the takeoff recedes to the left
      // at the lane speed and the arc slides with it — which is exactly what
      // the player sees.
      const originX = PLAYER_X - (flying ? tau : 0) * LOWG_SPEED;
      ctx.strokeStyle = 'rgba(92,255,138,0.55)'; ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const s2 = (i / 40) * air;
        const ax = originX + s2 * LOWG_SPEED;
        const ay = GROUND_Y - (v * s2 - 0.5 * g * s2 * s2);
        if (i === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // Takeoff and landing marks, and the apex height as a bar.
      ctx.strokeStyle = GG.orange; ctx.lineWidth = 1;
      for (const mx of [originX, originX + reach]) {
        ctx.beginPath(); ctx.moveTo(mx, GROUND_Y - 4); ctx.lineTo(mx, GROUND_Y); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,154,46,0.45)';
      ctx.beginPath(); ctx.moveTo(originX, GROUND_Y - 1.5); ctx.lineTo(originX + reach, GROUND_Y - 1.5); ctx.stroke();
      const apexX = originX + reach / 2;
      ctx.strokeStyle = 'rgba(92,255,138,0.35)';
      ctx.beginPath(); ctx.moveTo(apexX, GROUND_Y); ctx.lineTo(apexX, GROUND_Y - apex); ctx.stroke();

      hero(ctx, flying ? 'jump' : 'run', t, PLAYER_X, GROUND_Y - alt, { vy: -vy });
      ctx.restore();

      // THE NUMBERS, ON THE PICTURE. A sweep would report these; drawn here
      // they are checkable against the arc above them.
      ctx.font = '8px ui-monospace, monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(5,6,26,0.72)';
      ctx.fillRect(6, 6, 116, 40);
      ctx.strokeStyle = 'rgba(159,240,255,0.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(6.5, 6.5, 115, 39);
      ctx.fillStyle = GG.ink;
      ctx.fillText(`gravity  ${mult.toFixed(2)}x  (${Math.round(g)})`, 12, 11);
      ctx.fillStyle = GG.green;
      ctx.fillText(`apex     ${apex.toFixed(0)} px`, 12, 21);
      ctx.fillText(`airtime  ${air.toFixed(2)} s`, 12, 31);
      ctx.fillStyle = GG.orange;
      ctx.fillText(`${reach.toFixed(0)} px`, 86, 21);
      ctx.fillText(`${(reach / VIEW_W).toFixed(2)} scr`, 86, 31);
      scanlines(ctx, 0.12);
    },
  };
}

const lowGNow = lowGravityShot(1, 'LOW-G — today (1.00x)');
const lowGMoon = lowGravityShot(0.65, 'LOW-G — moon (0.65x)');
lowGNow.letter = 'I'; lowGNow.note = 'The cabinet\'s gravity as it ships, on the deck, from GRAVITY 900 and BASE_JUMP_V 320. '
  + 'Dashed line is the whole arc, anchored at the takeoff mark; the green upright is the apex, the orange bar the ground covered.';
lowGMoon.letter = 'J'; lowGMoon.note = 'The same jump at 0.65x. Every leap visibly floats and the arc still fits the frame — real lunar 0.165x '
  + 'would put the apex 345px up, off the top of a 270px picture, with 4.3s of committed flight. The spawner\'s runway (worstAirtime, '
  + 'fairGap, crossingLayout) reads the globals, so this is a plumbing change, not a constant.';


// ---------------------------------------------------------------- THE TRANSFER
// HOW DOES HE GET TO THE CEILING? The gate is drawn in every mock above and
// nothing has ever shown the move itself, which is the cabinet's whole verb.
// Three treatments here, each the complete loop — run the floor, cross, run
// the ceiling, cross back — so the question is answered by watching rather
// than by argument.
//
// THE CROSSING IS A FALL, NOT A JUMP. That is the idea in one line: the gate
// inverts gravity and he drops the other way. No new input, no new physics,
// one sign flip on the same integrator the game already runs. From rest across
// the 108 world px of corridor at GRAVITY 900 that is 0.49s, arriving at
// 440px/s — quick enough to read as being SEIZED rather than floating up.
//
// THE HARD PART IS NOT THE PATH, IT IS THE FACING. He runs right and must
// still run right when he lands overhead, so the move has to end mirrored
// about the horizontal — and a 2D figure rotated a full 180 degrees comes out
// facing LEFT. That single fact rules out the obvious "just tumble him", and
// is why the three below differ only in how they get around it.
const XFER_SPEED = LUNAR_SPEED;   // world px/s — the moon's slower run
const XFER_GAP = GATE_SPACING;    // world px — the pane grid, 390
// Flight time at 0.65g across the corridor's 108 world px: sqrt(2*108/585).
const XFER_T = 0.61;              // seconds in flight

// Where he is at time t: which surface, and how far through a crossing.
function transferState(t) {
  const camX = t * XFER_SPEED;
  const k = Math.floor((camX + PLAYER_X - GATE_PHASE) / XFER_GAP);
  const tGate = (k * XFER_GAP + GATE_PHASE - PLAYER_X) / XFER_SPEED;
  const u = (t - tGate) / XFER_T;
  // Even gates send him up, odd ones bring him back down.
  const up = k % 2 === 0;
  return { camX, k, u: u >= 0 && u <= 1 ? u : null, up, onCeiling: up ? u > 1 : u < 0 };
}

// The corridor, with the gates in it. No crate, no saw: the move is the subject.
function transferLane(ctx, camX, t, ceil) {
  const rail = (y, dir) => {
    ctx.fillStyle = GG.wall;
    if (dir > 0) ctx.fillRect(-20, y, VIEW_W + 40, 60); else ctx.fillRect(-20, y - 60, VIEW_W + 40, 60);
    tube(ctx, GG.ink, 1, 0.18, () => { ctx.moveTo(-20, y + 0.5 * dir); ctx.lineTo(VIEW_W + 20, y + 0.5 * dir); });
    ctx.strokeStyle = GG.dim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-20, y + 7 * dir + 0.5); ctx.lineTo(VIEW_W + 20, y + 7 * dir + 0.5); ctx.stroke();
    for (let x = -(camX % 24); x < VIEW_W + 24; x += 24) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + 7 * dir); ctx.stroke();
    }
  };
  rail(GROUND_Y, 1);
  rail(ceil, -1);
  // Every gate in view, with its chevrons pointing the way it sends you.
  const first = Math.floor(camX / XFER_GAP) - 1;
  for (let k = first; k * XFER_GAP + GATE_PHASE - camX < VIEW_W + 40; k++) {
    const gx = k * XFER_GAP + GATE_PHASE - camX;
    if (gx < -40) continue;
    const up = k % 2 === 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(gx - 30, ceil, 60, GROUND_Y - ceil); ctx.clip();
    const fg = ctx.createLinearGradient(0, ceil, 0, GROUND_Y);
    fg.addColorStop(0, 'rgba(255,154,46,0.02)');
    fg.addColorStop(0.2, 'rgba(255,154,46,0.11)');
    fg.addColorStop(0.8, 'rgba(255,154,46,0.11)');
    fg.addColorStop(1, 'rgba(255,154,46,0.02)');
    ctx.fillStyle = fg; ctx.fillRect(gx - 9, ceil, 18, GROUND_Y - ceil);
    ctx.lineCap = 'butt';
    for (const px of [gx - 11, gx + 9]) {
      ctx.strokeStyle = GG.orange;
      ctx.globalAlpha = 0.25; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(px, ceil + 2); ctx.lineTo(px, GROUND_Y - 2); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, ceil + 2); ctx.lineTo(px, GROUND_Y - 2); ctx.stroke();
    }
    ctx.restore();
    for (const px of [gx - 11, gx + 9]) {
      for (const [sy, dir] of [[GROUND_Y, 1], [ceil, -1]]) {
        ctx.fillStyle = '#0d1230';
        ctx.beginPath();
        ctx.moveTo(px - 5.5, sy); ctx.lineTo(px + 5.5, sy);
        ctx.lineTo(px + 3, sy - dir * 4); ctx.lineTo(px - 3, sy - dir * 4);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(159,240,255,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px - 3, sy - dir * 4); ctx.lineTo(px + 3, sy - dir * 4); ctx.stroke();
      }
    }
    // The arrows point at the surface this gate throws you to.
    gateChevrons(ctx, gx, ceil, t, up);
  }
}

// The release: a ring of sparks off the surface he just left, and the streak
// he pulls behind him. Both are what make an instant flip legible rather than
// a glitch — the eye is told WHERE the change happened.
function transferFx(ctx, u, up, ceil, cx, landing = false) {
  const from = up ? GROUND_Y : ceil;
  const to = up ? ceil : GROUND_Y;
  const D = Math.abs(GROUND_Y - ceil);
  const y = up ? GROUND_Y - D * u * u : ceil + D * u * u;
  // The streak he pulls behind him: three fading lines back to the surface he
  // left, so the eye can see where the crossing began.
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(159,240,255,${(0.3 - i * 0.08).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx + (i - 1) * 4, from); ctx.lineTo(cx + (i - 1) * 4, y); ctx.stroke();
  }
  // The release burst, on the surface he left: a half-fan of sparks thrown
  // away from it, fading over the first third of the crossing.
  if (u < 0.35) {
    const a = 1 - u / 0.35;
    const away = up ? -1 : 1;
    ctx.strokeStyle = `rgba(255,190,110,${(a * 0.9).toFixed(3)})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const ang = (i / 8) * Math.PI;
      const r0 = 3 + (1 - a) * 8, r1 = r0 + 5 + (1 - a) * 12;
      const dx = Math.cos(ang), dy = Math.sin(ang) * away;
      ctx.beginPath();
      ctx.moveTo(cx + dx * r0, from + dy * r0);
      ctx.lineTo(cx + dx * r1, from + dy * r1);
      ctx.stroke();
    }
  }
  // The arrival: a flat shock across the surface he is about to hit, thrown
  // outward along it. This is also what hides the facing snap in R.
  if (landing && u > 0.8) {
    const a = (u - 0.8) / 0.2;
    ctx.strokeStyle = `rgba(255,220,170,${(a * 0.85).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    const w = 6 + a * 18;
    const off = up ? 3 : -3;
    ctx.beginPath(); ctx.moveTo(cx - w, to + off); ctx.lineTo(cx - 4, to + off); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 4, to + off); ctx.lineTo(cx + w, to + off); ctx.stroke();
  }
}

// THE THREE TREATMENTS. Each is handed the contact point — where his feet are
// — and has to deliver him upside down at the far end, still facing right.
const TRANSFER_STYLES = {
  // 1. INSTANT. Gravity flips on the frame he enters the gate and so does he:
  // feet point at the destination for the whole crossing. VVVVVV does exactly
  // this and it is the cheapest thing that can possibly work — no rotation
  // code at all, one mirror. The spark ring carries the moment.
  instant(ctx, cx, contact, u, up, t) {
    ctx.save();
    ctx.translate(0, contact * 2); ctx.scale(1, -1);
    drawToon(ctx, 'b33p', pose('jump', t, { vy: -200 }), cx, contact, HERO_DRAW_H);
    ctx.restore();
  },
  // 2. CARD FLIP. He turns over about his own waistline — vertical scale runs
  // 1 to -1 through zero — which keeps his facing because nothing is ever
  // mirrored left-to-right. The pass through zero is hidden by being fast and
  // happening at the middle of the corridor, where he is furthest from both
  // surfaces and moving quickest.
  cardflip(ctx, cx, contact, u, up, t) {
    const sy = Math.cos(Math.PI * u);
    ctx.save();
    ctx.translate(0, contact); ctx.scale(1, sy); ctx.translate(0, -contact);
    drawToon(ctx, 'b33p', pose('jump', t, { vy: -200 }), cx, contact, HERO_DRAW_H);
    ctx.restore();
  },
  // 3. SOMERSAULT, with the snap hidden. He stays himself the whole way — no
  // ball, no pancake — and turns a full 180 degrees.
  //
  // WHY THIS ONE NEEDS A TRICK AT ALL: a rotation matrix has determinant +1
  // and a mirror has determinant -1, so NO continuous rotation can ever end in
  // a mirrored figure. He comes out of the somersault facing left, always.
  // The fix is to let him, and to snap the facing on the frame he touches
  // down, underneath the arrival shock — a one-frame swap at the exact moment
  // the eye is on a burst of sparks. That is the standard platformer dodge and
  // it is invisible at 24fps.
  somersault(ctx, cx, contact, u, up, t) {
    const h = HERO_DRAW_H;
    const dirSign = up ? 1 : -1;
    // THE TURN IS EASED, and that is a clearance fix rather than a flourish.
    //
    // He is 18 wide and 24 tall, so a rotated body is up to 30px from end to
    // end — six more than standing, worst at 37 degrees. Turning LINEARLY he
    // reached that angle while still a body-length off the deck (position goes
    // as u-squared, angle went as u), and the measurement says he cut 1.8px
    // into the plate he had just left. A smoothstep puts the fast part of the
    // turn in the middle of the corridor, where he is furthest from both
    // surfaces: deepest incursion 0.0px.
    const turn = u * u * (3 - 2 * u);
    const cy = contact - (h / 2) * Math.cos(Math.PI * turn);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(Math.PI * turn * dirSign); ctx.translate(-cx, -cy);
    drawToon(ctx, 'b33p', pose('jump', t, { vy: -200 }), cx, cy + h / 2, h);
    ctx.restore();
  },
};

function transferShot(letter, name, style, note) {
  return {
    letter, name, note,
    draw(ctx, { camX: _ignored, t, pack }) {
      const st = transferState(t);
      const camX = st.camX;
      const shift = camX * ZOOM;
      lunarView(ctx, shift, t);
      roundedWindows(ctx, shift, { t, style: 'bands' });
      ctx.save();
      applyWorld(ctx, ZOOM, 0, GROUND_Y);
      const ceil = GG_CEIL();
      transferLane(ctx, camX, t, ceil);
      const D = GROUND_Y - ceil;
      if (st.u === null) {
        if (st.onCeiling) {
          ctx.save();
          ctx.translate(0, ceil * 2); ctx.scale(1, -1);
          hero(ctx, 'run', t, PLAYER_X, ceil);
          ctx.restore();
        } else {
          hero(ctx, 'run', t);
        }
      } else {
        const contact = st.up ? GROUND_Y - D * st.u * st.u : ceil + D * st.u * st.u;
        transferFx(ctx, st.u, st.up, ceil, PLAYER_X);
        TRANSFER_STYLES[style](ctx, PLAYER_X, contact, st.u, st.up, t);
        if (style === 'somersault') transferFx(ctx, st.u, st.up, ceil, PLAYER_X, true);
      }
      ctx.restore();
      scanlines(ctx, 0.12);
    },
  };
}

const XFER_BLURB = 'The complete loop at the real numbers. A gate every 390 world px — exactly four windows, so '
  + 'one always stands mid-pane — at the slower 120px/s lunar run, which is a crossing every 3.3s. Gravity '
  + 'inverts at the gate and he FALLS the other way: no new input, no new physics, one sign flip. At 0.65g that '
  + 'fall takes 0.61s across the corridor. The window wall is welded to the lane at 1:1 — a gate is bolted to '
  + 'this room and cannot slide along its own wall. ';
// SETTLED 22 Sep 2026: the SOMERSAULT (R) is the transfer. P and Q stay
// drawable and are exported parked below — the design space is provably only
// these three, so the losers are the record of why R won — but they are off
// the page.
const xferInstant = transferShot('P', 'TRANSFER — instant flip', 'instant',
  XFER_BLURB + 'He flips on the frame he enters the gate and falls feet-first at the ceiling, VVVVVV-style. One '
  + 'mirror, no rotation code, and the spark ring is what makes it read as a decision rather than a dropped frame. '
  + 'Cheapest thing that can possibly work.');
const xferCard = transferShot('Q', 'TRANSFER — card flip', 'cardflip',
  XFER_BLURB + 'He turns over about his waist, vertical scale running 1 to -1 through zero. Keeps his facing for '
  + 'free because nothing is ever mirrored left-to-right; the pass through zero lands mid-corridor where he is '
  + 'moving fastest and furthest from both surfaces.');
const xferSomersault = transferShot('R', 'TRANSFER — somersault (SETTLED)', 'somersault',
  'SETTLED 22 Sep 2026 — this is the transfer. ' + XFER_BLURB + 'A full 180-degree somersault with him readable the whole way. THE CONSTRAINT WORTH KNOWING: a '
  + 'rotation has determinant +1 and a mirror has -1, so no continuous rotation can ever end mirrored — he comes '
  + 'out of the turn facing LEFT, always. So the facing is snapped on the touchdown frame, under the arrival '
  + 'shock. One frame, on a burst of sparks, at 24fps. These three WERE the whole design space: mirror instantly '
  + '(P), scale through zero (Q), or rotate and hide the snap (R). P and Q are off the page now, parked in source '
  + 'as XFER_STYLES_PARKED.');

// Kept drawable, off the page: the transfer's two losers (P, Q) and the first
// three window treatments (E–G). Not dead code nobody chose — the record that
// the transfer's design space was provably three wide, and that the panes were
// judged against struts and bulge before rounded-and-close won.

// ---------------------------------------------------------------- PORTRAIT
// THE CORRIDOR ON A PHONE HELD UPRIGHT.
//
// WHAT PORTRAIT IS HERE. The logical frame keeps the 480px world width and
// derives its HEIGHT from the handset, so a 393x852 phone gets a 480x1041
// frame — at portrait's 3.5 zoom that is a world view of 137 x 297 px against
// landscape's 240 x 135. Portrait is NARROWER and more than twice as TALL.
//
// WHICH MEANS THE PANES HAVE TO BE MEASURED IN WORLD UNITS. The landscape mock
// wrote them in screen px, and screen px are not a size: 188 of them is 94
// world px at landscape's 2x zoom and only 54 at portrait's 3.5. Drawn that
// way the same window is a third smaller on the phone — architecture that
// shrinks when you rotate the handset. So the pane is 94 world px wide,
// full stop, and each orientation multiplies by its own zoom. Portrait then
// shows about a pane and a half across, which is the honest answer: on a phone
// you are looking through ONE big window at a time.
const PORTRAIT_Z = 3.5;
const PORTRAIT_H = 1041;        // 480-wide logical frame on a 393x852 handset
const PORTRAIT_GROUND_SY = 765; // where that frame puts the authored groundline
const PANE_W_WORLD = PANE_W / ZOOM;       // 94 world px
const PANE_GAP_WORLD = PANE_GAP / ZOOM;   // 3.5
const PANE_R_WORLD = PANE_RADIUS / ZOOM;  // 4.5
const HORIZON_ABOVE_DECK = 23;  // world px from the deck floor to the lunar horizon

// THE VIEW OUTSIDE, drawn into any band of the frame. Split out of the
// corridor painter so a GLAZED ROOF can show the same sky through the same
// glass — one place that knows where the moon is, rather than two that have to
// agree. The horizon is a fixed 23 world px above the deck floor in every
// orientation and every band, because it is a real place and not a fraction of
// a frame.
function portraitOutside(ctx, { camX, t, viewW, top, bottom }) {
  const hz = GROUND_Y - HORIZON_ABOVE_DECK;
  ctx.save();
  ctx.beginPath(); ctx.rect(-20, top, viewW + 40, bottom - top); ctx.clip();
  for (let i = 0; i < 140; i++) {
    const span = viewW + 40;
    const bx = hash(i * 3) * span;
    const x = ((bx - camX * 0.01) % span + span) % span - 20;
    ctx.globalAlpha = 0.3 + 0.7 * hash(i * 3 + 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, top + hash(i * 3 + 1) * Math.max(1, hz - top), 0.4, 0.4);
  }
  ctx.globalAlpha = 1;
  gasGiant(ctx, viewW * 0.62, GG_CEIL() + 22, 11, t, { rings: true, tilt: -0.34 });
  for (const [f, period, amp, fill, lit, base] of [
    [0.03, 75, 23, '#1b1e2c', '#262a3b', hz + 1],
    [0.06, 48, 17, '#14161f', '#1e212d', hz + 3],
  ]) {
    const trace = () => {
      ctx.moveTo(-20, base + 30); ctx.lineTo(-20, base);
      repeat(ctx, camX * f, period, (x, k) => {
        const hgt = amp * (0.35 + hash(k * 3) * 0.65), w = period * (0.5 + hash(k * 3 + 1) * 0.5);
        ctx.quadraticCurveTo(x - w * 0.3, base - hgt * 1.3, x, base - hgt);
        ctx.quadraticCurveTo(x + w * 0.3, base - hgt * 1.25, x + w * 0.7, base - hgt * 0.2);
        ctx.lineTo(x + w * 0.85, base - hgt * 0.06);
      }, 80);
      ctx.lineTo(viewW + 20, base); ctx.lineTo(viewW + 20, base + 30); ctx.closePath();
    };
    ctx.fillStyle = fill; ctx.beginPath(); trace(); ctx.fill();
    ctx.save(); ctx.beginPath(); trace(); ctx.clip();
    repeat(ctx, camX * f, period, (x, k) => {
      const hgt = amp * (0.35 + hash(k * 3) * 0.65), w = period * (0.5 + hash(k * 3 + 1) * 0.5);
      const lg = ctx.createLinearGradient(x - w * 0.55, 0, x + w * 0.06, 0);
      lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.45, lit); lg.addColorStop(1, lit);
      ctx.fillStyle = lg; ctx.fillRect(x - w * 0.55, base - hgt * 1.35, w * 0.62, hgt * 1.4 + 30);
    }, 80);
    ctx.restore();
  }
  const pg = ctx.createLinearGradient(0, hz + 4, 0, GROUND_Y);
  pg.addColorStop(0, '#31323f'); pg.addColorStop(1, '#5a5b6c');
  ctx.fillStyle = pg; ctx.fillRect(-20, hz + 4, viewW + 40, GROUND_Y - hz);
  ctx.restore();
}

// The whole portrait picture. `overlay` adds the measuring marks; without it
// this is just the corridor, drawn.
function portraitScene(ctx, t, { overlay = false, fill = {} } = {}) {
  const Z = PORTRAIT_Z, FH = PORTRAIT_H;
  const camY = GROUND_Y - PORTRAIT_GROUND_SY / Z;
  const sy = (wy) => (wy - camY) * Z;
  const ceil = GG_CEIL();
  const camX = t * LUNAR_SPEED;
  const viewW = 480 / Z;                    // 137 world px
  const HX = 16 / Z;                        // heroAnchorX 16, in world px

  // --- sky over the whole tall frame, and the stars in it
  const g = ctx.createLinearGradient(0, 0, 0, FH);
  g.addColorStop(0, '#000004'); g.addColorStop(0.5, '#05061a'); g.addColorStop(1, '#02030c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 480, FH);

  ctx.save();
  ctx.translate(0, -camY * Z); ctx.scale(Z, Z);

  // --- THE VIEW OUTSIDE, in the corridor's band
  portraitOutside(ctx, { camX, t, viewW, top: ceil - 40, bottom: GROUND_Y + 40 });

  // --- THE WINDOW WALL, in world units: a 94px pane, the same window the
  // landscape deck has. Portrait sees about one and a half of them.
  const paneTop = ceil + 4, paneBot = GROUND_Y - 4;
  const period = PANE_W_WORLD + PANE_GAP_WORLD;
  const wallShift = ((camX % period) + period) % period;
  ctx.save();
  ctx.fillStyle = GG.wall;
  ctx.beginPath();
  ctx.rect(-20, ceil, viewW + 40, GROUND_Y - ceil);
  for (let k = -1; k * period - wallShift < viewW + period; k++) {
    ctx.roundRect(k * period - wallShift + PANE_GAP_WORLD / 2, paneTop, PANE_W_WORLD, paneBot - paneTop, PANE_R_WORLD);
  }
  ctx.fill('evenodd');
  ctx.restore();
  for (let k = -1; k * period - wallShift < viewW + period; k++) {
    const x0 = k * period - wallShift + PANE_GAP_WORLD / 2;
    const pp = () => ctx.roundRect(x0, paneTop, PANE_W_WORLD, paneBot - paneTop, PANE_R_WORLD);
    glassBands(ctx, () => pp(), 0, x0, PANE_W_WORLD, paneTop, paneBot);
  }

  // --- the deck: rails top and bottom, and the structure under the floor
  // THE RAIL PLATE IS SHALLOW HERE. Landscape fills 60-90 world px into the
  // deck because the frame ends a few px later and nobody ever sees the far
  // side of it. Portrait shows 110 world px above the ceiling, so that same
  // fill was a black slab burying the whole hull. 12 is the plate; everything
  // past it is structure that gets drawn.
  const rail = (y, dir) => {
    ctx.fillStyle = GG.wall;
    if (dir > 0) ctx.fillRect(-20, y, viewW + 40, 12); else ctx.fillRect(-20, y - 12, viewW + 40, 12);
    tube(ctx, GG.ink, 1, 0.18, () => { ctx.moveTo(-20, y + 0.5 * dir); ctx.lineTo(viewW + 20, y + 0.5 * dir); });
    ctx.strokeStyle = GG.dim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-20, y + 7 * dir + 0.5); ctx.lineTo(viewW + 20, y + 7 * dir + 0.5); ctx.stroke();
    for (let x = -(camX % 24); x < viewW + 24; x += 24) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + 7 * dir); ctx.stroke();
    }
  };
  rail(GROUND_Y, 1);
  rail(ceil, -1);
  // --- ABOVE THE CEILING: 110 world px that landscape never has to answer
  // for. What goes here is the question this section exists to settle; every
  // treatment below keeps its bright ink out of the read band.
  const hullTop = camY - 10;
  const hullBot = ceil - 12;
  if (fill.glazed) {
    // THE STATION IS A TUBE, SO GLAZE THE ROOF. The same window grid, above
    // the ceiling lane: the top third becomes sky instead of metal, and the
    // ceiling reads as a LANE rather than a lid — which is the cabinet's whole
    // premise. Nothing here is gameplay, and nothing here is opaque.
    ctx.fillStyle = '#0a0c1c';
    ctx.fillRect(-20, hullTop, viewW + 40, hullBot - hullTop + 1);
    const rTop = hullTop + 14, rBot = hullBot - 6;
    const rper = PANE_W_WORLD + PANE_GAP_WORLD;
    const rshift = ((camX % rper) + rper) % rper;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, hullTop, viewW + 40, hullBot - hullTop + 1);
    for (let k = -1; k * rper - rshift < viewW + rper; k++) {
      ctx.roundRect(k * rper - rshift + PANE_GAP_WORLD / 2, rTop, PANE_W_WORLD, rBot - rTop, PANE_R_WORLD);
    }
    ctx.clip('evenodd');
    // Behind the roof glass: the same sky, and the tops of the same hills.
    portraitOutside(ctx, { camX, t, viewW, top: hullTop - 20, bottom: hullBot + 20 });
    ctx.restore();
    // The frames between the roof lights, and the glass on them.
    for (let k = -1; k * rper - rshift < viewW + rper; k++) {
      const x0 = k * rper - rshift + PANE_GAP_WORLD / 2;
      const pp = () => ctx.roundRect(x0, rTop, PANE_W_WORLD, rBot - rTop, PANE_R_WORLD);
      glassBands(ctx, () => pp(), 0, x0, PANE_W_WORLD, rTop, rBot);
    }
    ctx.fillStyle = GG.wall;
    ctx.fillRect(-20, hullTop, viewW + 40, 14);
  } else {
    // The plain hull: ribs, a service run and a lamp strip.
    ctx.fillStyle = '#080a16';
    ctx.fillRect(-20, hullTop, viewW + 40, hullBot - hullTop + 1);
    const hg = ctx.createLinearGradient(0, hullTop, 0, hullBot);
    hg.addColorStop(0, 'rgba(5,6,15,1)'); hg.addColorStop(1, 'rgba(18,22,46,1)');
    ctx.fillStyle = hg; ctx.fillRect(-20, hullTop, viewW + 40, hullBot - hullTop + 1);
    // THE RIBS RUN THE WHOLE HULL. They used to stop 64 world px up and leave
    // a stub hanging in the dark with nothing holding it — a line that ends
    // for no reason reads as an unfinished drawing, not as structure. A rib
    // either goes from the ceiling plate to the top of the frame or it is not
    // a rib.
    const ribH = hullBot - hullTop;
    repeat(ctx, camX, 48, (x) => {
      ctx.fillStyle = '#161a33'; ctx.fillRect(x, hullTop, 5, ribH);
      ctx.fillStyle = 'rgba(159,240,255,0.16)'; ctx.fillRect(x, hullTop, 0.8, ribH);
      // Cross-members tying them together, spaced up the whole run.
      for (let cy = hullBot - 34; cy > hullTop + 6; cy -= 38) {
        ctx.fillStyle = '#0d1030'; ctx.fillRect(x - 15, cy, 30, 2.5);
      }
    }, 60);
    for (const [yOff, wdt, col] of [[17, 2.5, '#1b2140'], [21.5, 1.5, '#141834'], [12, 1.2, '#1b2140']]) {
      ctx.fillStyle = col; ctx.fillRect(-20, hullBot - yOff, viewW + 40, wdt);
    }
    ctx.fillStyle = 'rgba(255,154,46,0.5)';
    repeat(ctx, camX, 30, (x) => ctx.fillRect(x, hullBot - 6, 4, 1), 40);
    ctx.fillStyle = 'rgba(159,240,255,0.3)'; ctx.fillRect(-20, hullBot - 1, viewW + 40, 0.5);
  }

  if (fill.deck2) {
    // A SECOND CORRIDOR OVERHEAD, seen through the structure: someone else's
    // shift, a cargo tram, a lit doorway. Most atmosphere per pixel and the
    // most risk — so it is dim, slow, and every figure is silhouette only.
    const dTop = hullTop + 16, dBot = hullTop + 62;
    ctx.fillStyle = '#0b0e20'; ctx.fillRect(-20, dTop, viewW + 40, dBot - dTop);
    ctx.fillStyle = 'rgba(159,240,255,0.14)'; ctx.fillRect(-20, dBot - 1, viewW + 40, 0.8);
    ctx.fillStyle = 'rgba(255,214,150,0.10)';
    repeat(ctx, camX * 0.85, 64, (x) => ctx.fillRect(x, dTop + 6, 22, dBot - dTop - 12), 70);
    // The tram, crossing slower than the lane because it is further away.
    const tram = ((camX * 0.5 + 40) % 320) - 60;
    ctx.fillStyle = '#1a2040'; ctx.fillRect(tram, dBot - 20, 46, 17);
    ctx.fillStyle = 'rgba(255,214,150,0.35)';
    for (let i = 0; i < 4; i++) ctx.fillRect(tram + 5 + i * 11, dBot - 16, 6, 5);
    // Two of the staff, walking the other way.
    ctx.fillStyle = '#05060f';
    for (const [off, ph] of [[0, 0], [23, 1.7]]) {
      const fx = ((camX * 0.55 + off * 7) % 200) - 20;
      const bob = Math.abs(Math.sin(t * 3 + ph)) * 1.2;
      ctx.fillRect(fx, dBot - 13 - bob, 3.4, 10 + bob);
      ctx.beginPath(); ctx.arc(fx + 1.7, dBot - 15 - bob, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  if (fill.signage) {
    // DIEGETIC SIGNAGE on the ceiling rail: station markers and the distance
    // to the next gate. Information rather than decoration, and it sits on
    // structure that is already there.
    const sTop = hullBot - 11;
    ctx.fillStyle = '#0b0f26'; ctx.fillRect(-20, sTop, viewW + 40, 10);
    ctx.fillStyle = 'rgba(159,240,255,0.25)'; ctx.fillRect(-20, sTop, viewW + 40, 0.6);
    repeat(ctx, camX, 64, (x, k) => {
      // A hazard stencil, then a marker plate with a number on it.
      ctx.fillStyle = 'rgba(246,211,60,0.5)';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 3, sTop + 3, 1.6, 5);
      ctx.fillStyle = '#12183a'; ctx.fillRect(x + 16, sTop + 2, 26, 7);
      ctx.fillStyle = 'rgba(92,255,138,0.75)';
      const n = ((k % 4) + 4) % 4 + 1;
      for (let i = 0; i < n; i++) ctx.fillRect(x + 19 + i * 5, sTop + 4, 3, 3);
    }, 70);
  }

  // --- BELOW THE FLOOR: 79 world px, and the same question.
  const deckBot = camY + FH / Z;
  if (fill.grated) {
    // SEE THROUGH THE DECK. The service level under the corridor: pipes, the
    // extension cord being routed along it — the thing the whole game is
    // about — and lamps. A pit then reads as a hole into a real place rather
    // than a black rectangle.
    ctx.fillStyle = '#06080f'; ctx.fillRect(-20, GROUND_Y + 7, viewW + 40, deckBot - GROUND_Y);
    // Machinery down there, at its own slower rate: this level is further away.
    repeat(ctx, camX * 0.82, 70, (x, k) => {
      const hgt = 14 + hash(k) * 16;
      ctx.fillStyle = '#0d1226'; ctx.fillRect(x, GROUND_Y + 40 - hgt * 0.4, 34, hgt);
      ctx.fillStyle = 'rgba(92,255,138,0.35)'; ctx.fillRect(x + 4, GROUND_Y + 44 - hgt * 0.4, 3, 2);
      ctx.fillStyle = 'rgba(255,154,46,0.3)'; ctx.fillRect(x + 11, GROUND_Y + 44 - hgt * 0.4, 3, 2);
    }, 80);
    // THE CORD. Slung between brackets, sagging between them.
    ctx.strokeStyle = '#d8823c'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    const cy0 = GROUND_Y + 30;
    for (let k = -1; k * 40 - (camX % 40) < viewW + 40; k++) {
      const x = k * 40 - (camX % 40);
      ctx.moveTo(x, cy0);
      ctx.quadraticCurveTo(x + 20, cy0 + 7, x + 40, cy0);
    }
    ctx.stroke();
    ctx.fillStyle = '#2a3150';
    repeat(ctx, camX, 40, (x) => ctx.fillRect(x - 2, cy0 - 3, 4, 5), 50);
    // The grating itself, over all of it: bars you see between.
    ctx.fillStyle = 'rgba(12,16,34,0.72)';
    for (let x = -(camX % 4); x < viewW + 4; x += 4) ctx.fillRect(x, GROUND_Y + 7, 2.2, deckBot - GROUND_Y);
    ctx.fillStyle = '#10142c'; ctx.fillRect(-20, GROUND_Y + 7, viewW + 40, 2);
    ctx.fillStyle = 'rgba(159,240,255,0.18)'; ctx.fillRect(-20, GROUND_Y + 7, viewW + 40, 0.6);
  } else {
    ctx.fillStyle = '#070912'; ctx.fillRect(-20, GROUND_Y + 7, viewW + 40, deckBot - GROUND_Y);
    repeat(ctx, camX, 48, (x) => {
      ctx.fillStyle = '#10132a'; ctx.fillRect(x, GROUND_Y + 7, 4, deckBot - GROUND_Y);
      ctx.fillStyle = 'rgba(159,240,255,0.10)'; ctx.fillRect(x, GROUND_Y + 7, 0.7, deckBot - GROUND_Y);
    }, 60);
    ctx.fillStyle = '#0c0f22'; ctx.fillRect(-20, GROUND_Y + 26, viewW + 40, 3);
    ctx.fillStyle = 'rgba(255,154,46,0.35)';
    repeat(ctx, camX, 36, (x) => ctx.fillRect(x, GROUND_Y + 27, 5, 1), 40);
  }

  // --- the gate, on the pane grid, ahead of him
  const gk = Math.round((camX + viewW * 0.72 - GATE_PHASE) / GATE_SPACING);
  const gx = gk * GATE_SPACING + GATE_PHASE - camX;
  ctx.save();
  ctx.beginPath(); ctx.rect(gx - 30, ceil, 60, GROUND_Y - ceil); ctx.clip();
  const fg = ctx.createLinearGradient(0, ceil, 0, GROUND_Y);
  fg.addColorStop(0, 'rgba(255,154,46,0.02)'); fg.addColorStop(0.2, 'rgba(255,154,46,0.11)');
  fg.addColorStop(0.8, 'rgba(255,154,46,0.11)'); fg.addColorStop(1, 'rgba(255,154,46,0.02)');
  ctx.fillStyle = fg; ctx.fillRect(gx - 9, ceil, 18, GROUND_Y - ceil);
  ctx.lineCap = 'butt';
  for (const px of [gx - 11, gx + 9]) {
    ctx.strokeStyle = GG.orange;
    ctx.globalAlpha = 0.25; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(px, ceil + 2); ctx.lineTo(px, GROUND_Y - 2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, ceil + 2); ctx.lineTo(px, GROUND_Y - 2); ctx.stroke();
  }
  ctx.restore();
  for (const px of [gx - 11, gx + 9]) {
    for (const [syy, dir] of [[GROUND_Y, 1], [ceil, -1]]) {
      ctx.fillStyle = '#0d1230';
      ctx.beginPath();
      ctx.moveTo(px - 5.5, syy); ctx.lineTo(px + 5.5, syy);
      ctx.lineTo(px + 3, syy - dir * 4); ctx.lineTo(px - 3, syy - dir * 4);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(159,240,255,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px - 3, syy - dir * 4); ctx.lineTo(px + 3, syy - dir * 4); ctx.stroke();
    }
  }
  gateChevrons(ctx, gx, ceil, t, true);

  if (fill.pylons) {
    // THE GATE, FULL HEIGHT. A mast above the ceiling and a machinery block
    // below the floor: transformer, cabling, a warning lamp. The frame's dead
    // thirds then carry the one thing that is actually gameplay, and a gate
    // becomes a landmark visible from much further out — which is worth real
    // money in portrait, where the runway is 73% of landscape's.
    const top = camY - 10, bot = camY + FH / Z;
    // The mast: a lattice narrowing as it rises.
    ctx.strokeStyle = '#2a3150'; ctx.lineWidth = 1.4;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(gx + sgn * 10, ceil - 12);
      ctx.lineTo(gx + sgn * 4, top + 26);
      ctx.stroke();
    }
    for (let y = ceil - 16; y > top + 28; y -= 9) {
      const u = (y - (top + 26)) / ((ceil - 12) - (top + 26));
      const hw = 4 + 6 * u;
      ctx.beginPath(); ctx.moveTo(gx - hw, y); ctx.lineTo(gx + hw, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx - hw, y); ctx.lineTo(gx + hw * 0.6, y - 9); ctx.stroke();
    }
    // The transformer at the head, and its lamp.
    ctx.fillStyle = '#141a38'; ctx.fillRect(gx - 9, top + 14, 18, 14);
    ctx.fillStyle = '#1e2750'; ctx.fillRect(gx - 9, top + 14, 18, 2.5);
    ctx.strokeStyle = 'rgba(255,154,46,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx - 6, top + 20); ctx.lineTo(gx + 6, top + 20); ctx.stroke();
    const blink = (Math.floor(t * 2) % 2) === 0;
    ctx.fillStyle = blink ? '#ff5a3c' : '#4a1a12';
    ctx.fillRect(gx - 1.5, top + 10, 3, 4);
    if (blink) {
      const lg = ctx.createRadialGradient(gx, top + 12, 0, gx, top + 12, 16);
      lg.addColorStop(0, 'rgba(255,90,60,0.35)'); lg.addColorStop(1, 'rgba(255,90,60,0)');
      ctx.fillStyle = lg; ctx.fillRect(gx - 18, top - 6, 36, 36);
    }
    // Cable, slung from the mast off to the side.
    ctx.strokeStyle = 'rgba(40,48,86,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx - 9, top + 22);
    ctx.quadraticCurveTo(gx - 40, top + 34, gx - 70, top + 24);
    ctx.stroke();
    // Below the floor: the machinery that drives it.
    ctx.fillStyle = '#0e1330'; ctx.fillRect(gx - 16, GROUND_Y + 9, 32, 40);
    ctx.fillStyle = '#172048'; ctx.fillRect(gx - 16, GROUND_Y + 9, 32, 3);
    ctx.fillStyle = 'rgba(255,154,46,0.5)';
    for (let i = 0; i < 3; i++) ctx.fillRect(gx - 10 + i * 8, GROUND_Y + 16, 5, 2);
    ctx.strokeStyle = '#2a3150'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(gx, GROUND_Y + 49); ctx.lineTo(gx, bot); ctx.stroke();
    ctx.fillStyle = 'rgba(92,255,138,0.4)';
    ctx.fillRect(gx - 12, GROUND_Y + 40, 4, 2);
  }

  // --- him, and one on the ceiling so both surfaces read
  hero(ctx, 'run', t, HX, GROUND_Y);
  ctx.save();
  ctx.translate(0, ceil * 2); ctx.scale(1, -1);
  hero(ctx, 'run', t, HX + 54, ceil);
  ctx.restore();

  if (overlay) {
    // Two arcs from his mark, both integrated at 0.65g from the game's own
    // constants: the launch he has now, and the proposal.
    const gLow = GRAVITY * 0.65;
    const arc = (v, color, dash) => {
      const air = (2 * v) / gLow;
      ctx.strokeStyle = color; ctx.lineWidth = 0.9; ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const tau = (i / 48) * air;
        const ax = HX + tau * LUNAR_SPEED;
        const ay = GROUND_Y - (v * tau - 0.5 * gLow * tau * tau);
        if (i === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
      }
      ctx.stroke(); ctx.setLineDash([]);
      return { air, apex: (v * v) / (2 * gLow), reach: ((2 * v) / gLow) * LUNAR_SPEED };
    };
    const now = arc(BASE_JUMP_V, 'rgba(255,90,90,0.95)', [3, 3]);
    const prop = arc(210, 'rgba(92,255,138,0.95)', []);
    for (const [m, color] of [[now, 'rgba(255,90,90,0.9)'], [prop, 'rgba(92,255,138,0.9)']]) {
      const hx = HX + m.reach / 2;
      ctx.strokeStyle = color; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(hx - 4, GROUND_Y - m.apex - HERO_DRAW_H);
      ctx.lineTo(hx + 4, GROUND_Y - m.apex - HERO_DRAW_H);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(159,240,255,0.8)'; ctx.lineWidth = 0.8;
    const ry = GROUND_Y - 3;
    ctx.beginPath(); ctx.moveTo(HX, ry); ctx.lineTo(viewW, ry); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(viewW - 0.5, ry - 3); ctx.lineTo(viewW - 0.5, ry + 3); ctx.stroke();
    ctx.restore();
    const rows = [
      ['portrait frame', '480 x 1041', GG.ink],
      ['world view', '137 x 297 px', GG.ink],
      ['runway ahead', '133 px  (181 landscape)', GG.ink],
      ['above the ceiling', '110 px of visible world', '#f6d33c'],
      ['', '', null],
      ['NOW  v=320 @0.65g', '', '#ff5a5a'],
      ['  apex / head', `${now.apex.toFixed(0)} / ${(now.apex + HERO_DRAW_H).toFixed(0)} px  ceiling 108`, '#ff5a5a'],
      ['  reach', `${now.reach.toFixed(0)} px = ${(now.reach / 133).toFixed(2)}x runway`, '#ff5a5a'],
      ['PROPOSED v=210 @0.65g', '', '#5cff8a'],
      ['  apex / head', `${prop.apex.toFixed(0)} / ${(prop.apex + HERO_DRAW_H).toFixed(0)} px  ceiling 108`, '#5cff8a'],
      ['  reach', `${prop.reach.toFixed(0)} px = ${(prop.reach / 133).toFixed(2)}x runway`, '#5cff8a'],
      ['  airtime', `${prop.air.toFixed(2)} s`, '#5cff8a'],
    ];
    ctx.font = '11px ui-monospace, monospace';
    ctx.textBaseline = 'top';
    const bx = 14, by = 16, bw = 452, bh = rows.length * 14 + 14;
    ctx.fillStyle = 'rgba(5,6,26,0.82)'; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(159,240,255,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    rows.forEach(([k, v, c], i) => {
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillText(k, bx + 8, by + 8 + i * 14);
      ctx.fillText(v, bx + 210, by + 8 + i * 14);
    });
    return;
  }
  ctx.restore();
  scanlines(ctx, 0.1);
}

// THE VARIANTS. 110 world px above the ceiling and 79 below it are frame that
// landscape never has to fill; these are the ways to fill them. The floor
// anchor never moves — it matches every other portrait stage — so nothing here
// re-centres the picture.

// ---------------------------------------------------------------- HOW TALL CAN THE CORRIDOR BE?
// THE CORRIDOR IS 108 WORLD PX BECAUSE THE CAMERA IS AT ZOOM 2, not because
// anything physical says so. The camera pins the groundline at frame y 232, so
// the world visible ABOVE the floor is 232/zoom — 116px at zoom 2, of which
// the corridor takes 108 and the margin takes the rest. Pull the camera back
// and the corridor grows, with no distortion anywhere.
//
// THE POINT OF THE LADDER IS THE COST, NOT THE GAIN. Every rung buys height by
// making everything smaller: the hero is 24 world px, so he is 48 screen px
// tall at zoom 2 and 34 at 1.4. The gain is arithmetic and the loss is
// legibility, and only one of those can be judged by looking.
//
// 1.6 IS NOT A NEW NUMBER — it is ZOOM_NORMAL, already in run.js, with 2 as
// ZOOM_CLOSE. So the middle rung is a setting rather than new machinery.
//
// The arc on every rung is the CURRENT jump — BASE_JUMP_V 320 at 0.65g, apex
// 88, head at 112 — because the question a taller corridor really answers is
// whether the launch still has to be cut. At 108 it does not fit; from 120 up
// it does.
function corridorAt(ctx, t, { zoom, corridor, rule = null, camOffset = 0 }) {
  const z = zoom, D = corridor;
  const camY = GROUND_Y - 232 / z;
  const ceil = GROUND_Y - D;
  const viewW = W / z;
  // A card can slide the camera along the gate grid without changing anything
  // else, which is how the same jump is shown at a gate and away from one.
  const camX = t * LUNAR_SPEED + camOffset;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#000004'); sky.addColorStop(1, '#05061a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(0, -camY * z); ctx.scale(z, z);

  // The view outside, in the corridor's band. Same world sizes at every rung:
  // that is the whole point — only the camera changes.
  const hz = GROUND_Y - HORIZON_ABOVE_DECK;
  ctx.save();
  ctx.beginPath(); ctx.rect(-20, ceil, viewW + 40, D); ctx.clip();
  for (let i = 0; i < 90; i++) {
    const span = viewW + 40;
    const bx = hash(i * 3) * span;
    const x = ((bx - camX * 0.01) % span + span) % span - 20;
    ctx.globalAlpha = 0.3 + 0.7 * hash(i * 3 + 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, ceil + hash(i * 3 + 1) * Math.max(1, hz - ceil), 0.4, 0.4);
  }
  ctx.globalAlpha = 1;
  gasGiant(ctx, viewW * 0.66, ceil + (hz - ceil) * 0.3, 11, t, { rings: true, tilt: -0.34 });
  for (const [f, period, amp, fill, base] of [
    [0.03, 75, 23, '#1b1e2c', hz + 1], [0.06, 48, 17, '#14161f', hz + 3],
  ]) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-20, base + 30); ctx.lineTo(-20, base);
    repeat(ctx, camX * f, period, (x, k) => {
      const hgt = amp * (0.35 + hash(k * 3) * 0.65), w = period * (0.5 + hash(k * 3 + 1) * 0.5);
      ctx.quadraticCurveTo(x - w * 0.3, base - hgt * 1.3, x, base - hgt);
      ctx.quadraticCurveTo(x + w * 0.3, base - hgt * 1.25, x + w * 0.7, base - hgt * 0.2);
      ctx.lineTo(x + w * 0.85, base - hgt * 0.06);
    }, 80);
    ctx.lineTo(viewW + 20, base); ctx.lineTo(viewW + 20, base + 30);
    ctx.closePath(); ctx.fill();
  }
  const pg = ctx.createLinearGradient(0, hz + 4, 0, GROUND_Y);
  pg.addColorStop(0, '#31323f'); pg.addColorStop(1, '#5a5b6c');
  ctx.fillStyle = pg; ctx.fillRect(-20, hz + 4, viewW + 40, GROUND_Y - hz);
  ctx.restore();

  // The wall, in world units — a 94px pane at every rung.
  const paneTop = ceil + 4, paneBot = GROUND_Y - 4;
  const per = PANE_W_WORLD + PANE_GAP_WORLD;
  const wshift = ((camX % per) + per) % per;
  ctx.save();
  ctx.fillStyle = GG.wall;
  ctx.beginPath();
  ctx.rect(-20, ceil, viewW + 40, D);
  for (let k = -1; k * per - wshift < viewW + per; k++) {
    ctx.roundRect(k * per - wshift + PANE_GAP_WORLD / 2, paneTop, PANE_W_WORLD, paneBot - paneTop, PANE_R_WORLD);
  }
  ctx.fill('evenodd');
  ctx.restore();
  for (let k = -1; k * per - wshift < viewW + per; k++) {
    const x0 = k * per - wshift + PANE_GAP_WORLD / 2;
    const pp = () => ctx.roundRect(x0, paneTop, PANE_W_WORLD, paneBot - paneTop, PANE_R_WORLD);
    glassBands(ctx, () => pp(), 0, x0, PANE_W_WORLD, paneTop, paneBot);
  }

  const rail = (y, dir) => {
    ctx.fillStyle = GG.wall;
    if (dir > 0) ctx.fillRect(-20, y, viewW + 40, 12); else ctx.fillRect(-20, y - 12, viewW + 40, 12);
    tube(ctx, GG.ink, 1, 0.18, () => { ctx.moveTo(-20, y + 0.5 * dir); ctx.lineTo(viewW + 20, y + 0.5 * dir); });
    ctx.strokeStyle = GG.dim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-20, y + 7 * dir + 0.5); ctx.lineTo(viewW + 20, y + 7 * dir + 0.5); ctx.stroke();
    for (let x = -(camX % 24); x < viewW + 24; x += 24) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + 7 * dir); ctx.stroke();
    }
  };
  rail(GROUND_Y, 1); rail(ceil, -1);
  // What little hull is visible above the ceiling at this zoom.
  const top = camY - 4;
  ctx.fillStyle = '#080a16'; ctx.fillRect(-20, top, viewW + 40, (ceil - 12) - top);
  repeat(ctx, camX, 48, (x) => {
    ctx.fillStyle = '#161a33'; ctx.fillRect(x, top, 5, (ceil - 12) - top);
    ctx.fillStyle = 'rgba(159,240,255,0.16)'; ctx.fillRect(x, top, 0.8, (ceil - 12) - top);
  }, 60);
  ctx.fillStyle = '#070912'; ctx.fillRect(-20, GROUND_Y + 7, viewW + 40, (camY + H / z) - GROUND_Y);

  // A gate, and the hero on both surfaces.
  const gk = Math.round((camX + viewW * 0.62 - GATE_PHASE) / GATE_SPACING);
  const gx = gk * GATE_SPACING + GATE_PHASE - camX;
  ctx.save();
  ctx.beginPath(); ctx.rect(gx - 30, ceil, 60, D); ctx.clip();
  ctx.lineCap = 'butt';
  for (const px of [gx - 11, gx + 9]) {
    ctx.strokeStyle = GG.orange;
    ctx.globalAlpha = 0.25; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(px, ceil + 2); ctx.lineTo(px, GROUND_Y - 2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, ceil + 2); ctx.lineTo(px, GROUND_Y - 2); ctx.stroke();
  }
  ctx.restore();
  if (rule === 'toggle') {
    // A TOGGLE READS BOTH WAYS. If you can already be on either surface when
    // you reach a gate, an up-arrow is a lie half the time — so the glyph
    // stops claiming a direction and claims a SWAP: two columns of chevrons
    // leaving the middle, one up and one down.
    toggleChevrons(ctx, gx, ceil, t);
  } else {
    gateChevrons(ctx, gx, ceil, t, true);
  }

  if (rule === 'gatezone' || rule === 'punish') {
    // THE CEILING BRISTLES EVERYWHERE EXCEPT AT A GATE. This is the whole
    // proposal in one line of art: the ceiling IS a surface, but only a gate's
    // column is a place you can stand on it. Everywhere else is saws, which is
    // an AUTHORED punishment for going high in a corridor rather than an
    // engine bonk — and it reads from a distance, which a bonk never does.
    const ZONE = 26;                       // the landable span, either side of a gate
    repeat(ctx, camX, 34, (x, k) => {
      if (Math.abs(x - gx) < ZONE) return; // the gate's own clear span
      ctx.save();
      ctx.translate(x, ceil + 7);
      ctx.rotate(t * 5 + k);
      ctx.fillStyle = GG.orange;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a0 = (i / 10) * Math.PI * 2, a1 = ((i + 0.5) / 10) * Math.PI * 2;
        ctx.lineTo(Math.cos(a0) * 6, Math.sin(a0) * 6);
        ctx.lineTo(Math.cos(a1) * 4.5, Math.sin(a1) * 4.5);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = GG.wall; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = GG.dim; ctx.fillRect(x - 1, ceil, 2, 3);
    }, 50);
    // The clear span over the gate, called out: this is where you may land.
    ctx.strokeStyle = 'rgba(92,255,138,0.55)'; ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(gx - ZONE, ceil + 3); ctx.lineTo(gx + ZONE, ceil + 3);
    ctx.stroke(); ctx.setLineDash([]);
  }

  const gLow = GRAVITY * 0.65, v = BASE_JUMP_V;
  if (rule) {
    // THE DOUBLE JUMP, integrated properly: the ground launch, then a second
    // at the apex scaled by AIR_JUMP_SCALE. This is what no corridor survives
    // — and under this proposal it is not a failure, it is an arrival.
    const v2 = v * 0.85;
    const apex1 = (v * v) / (2 * gLow);
    const t1 = v / gLow;
    // Where his crown meets the ceiling, on the way up from the second jump.
    const need = corridor - HERO_DRAW_H - apex1;   // still to climb
    const tHit = need > 0 && need < (v2 * v2) / (2 * gLow)
      ? (v2 - Math.sqrt(v2 * v2 - 2 * gLow * need)) / gLow : null;
    const hitX = PLAYER_X + (t1 + (tHit ?? 0)) * LUNAR_SPEED;
    const lands = tHit != null && (rule === 'toggle' || Math.abs(hitX - gx) < 26);
    ctx.strokeStyle = lands ? 'rgba(92,255,138,0.95)' : 'rgba(255,90,90,0.95)';
    ctx.lineWidth = 1; ctx.setLineDash(lands ? [] : [3, 3]);
    ctx.beginPath();
    const tEnd = tHit != null ? t1 + tHit : t1 * 2;
    for (let i = 0; i <= 56; i++) {
      const tau = (i / 56) * tEnd;
      const alt = tau <= t1
        ? v * tau - 0.5 * gLow * tau * tau
        : apex1 + v2 * (tau - t1) - 0.5 * gLow * (tau - t1) * (tau - t1);
      const ax = PLAYER_X + tau * LUNAR_SPEED;
      if (i === 0) ctx.moveTo(ax, GROUND_Y - alt); else ctx.lineTo(ax, GROUND_Y - alt);
    }
    ctx.stroke(); ctx.setLineDash([]);
    // The second launch, marked: the moment the arc kicks again.
    ctx.fillStyle = '#72d8f0';
    ctx.beginPath();
    ctx.arc(PLAYER_X + t1 * LUNAR_SPEED, GROUND_Y - apex1, 2, 0, Math.PI * 2);
    ctx.fill();
    if (tHit != null) {
      // Him, arriving on the ceiling — or hitting it.
      ctx.save();
      ctx.translate(0, ceil * 2); ctx.scale(1, -1);
      hero(ctx, lands ? 'run' : 'jump', t, hitX, ceil, lands ? {} : { vy: -120 });
      ctx.restore();
      if (!lands) {
        ctx.strokeStyle = 'rgba(255,90,90,0.9)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.4;
          ctx.beginPath();
          ctx.moveTo(hitX + Math.cos(a) * 7, ceil + 7 + Math.sin(a) * 7 * -1);
          ctx.lineTo(hitX + Math.cos(a) * 13, ceil + 13 + Math.sin(a) * 13 * -1);
          ctx.stroke();
        }
      }
    }
    hero(ctx, 'run', t);
    ctx.restore();
    ctx.font = '8px ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(5,6,26,0.78)'; ctx.fillRect(6, 6, 218, 36);
    ctx.strokeStyle = 'rgba(159,240,255,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(6.5, 6.5, 217, 35);
    ctx.fillStyle = GG.ink;
    ctx.fillText(`double jump — head ${(apex1 + (v2 * v2) / (2 * gLow) + HERO_DRAW_H).toFixed(0)} px, corridor ${corridor}`, 12, 11);
    ctx.fillStyle = lands ? '#5cff8a' : '#ff5a5a';
    ctx.fillText(lands ? 'lands on the ceiling' : 'meets the ceiling off a gate', 12, 21);
    ctx.fillStyle = GG.dim;
    ctx.fillText(rule === 'toggle' ? 'gate is a TOGGLE — swaps whichever surface' : 'ceiling landable only in the gate column', 12, 31);
    scanlines(ctx, 0.1);
    return;
  }
  // THE CURRENT JUMP, at 0.65g: apex 88, head at 112. Green where his head
  // clears the ceiling, red where it does not.
  const air = (2 * v) / gLow, apex = (v * v) / (2 * gLow);
  const clears = apex + HERO_DRAW_H <= D;
  ctx.strokeStyle = clears ? 'rgba(92,255,138,0.9)' : 'rgba(255,90,90,0.95)';
  ctx.lineWidth = 0.9; ctx.setLineDash(clears ? [] : [3, 3]);
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const tau = (i / 48) * air;
    const ax = PLAYER_X + tau * LUNAR_SPEED;
    const ay = GROUND_Y - (v * tau - 0.5 * gLow * tau * tau);
    if (i === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
  }
  ctx.stroke(); ctx.setLineDash([]);
  // His crown at the apex, which is the line that has to clear.
  ctx.beginPath();
  ctx.moveTo(PLAYER_X + air * LUNAR_SPEED / 2 - 5, GROUND_Y - apex - HERO_DRAW_H);
  ctx.lineTo(PLAYER_X + air * LUNAR_SPEED / 2 + 5, GROUND_Y - apex - HERO_DRAW_H);
  ctx.stroke();

  hero(ctx, 'run', t);
  ctx.save();
  ctx.translate(0, ceil * 2); ctx.scale(1, -1);
  hero(ctx, 'run', t, PLAYER_X + 78, ceil);
  ctx.restore();
  ctx.restore();

  // The readout: the gain on the left, the cost on the right.
  ctx.font = '8px ui-monospace, monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(5,6,26,0.75)'; ctx.fillRect(6, 6, 190, 46);
  ctx.strokeStyle = 'rgba(159,240,255,0.3)'; ctx.lineWidth = 1;
  ctx.strokeRect(6.5, 6.5, 189, 45);
  ctx.fillStyle = GG.ink;
  ctx.fillText(`zoom ${z.toFixed(1)}${z === 1.6 ? '  (ZOOM_NORMAL)' : z === 2 ? '  (ZOOM_CLOSE)' : ''}`, 12, 11);
  ctx.fillText(`corridor  ${D} world px`, 12, 21);
  ctx.fillStyle = '#f6d33c';
  ctx.fillText(`hero on screen  ${(HERO_DRAW_H * z).toFixed(0)} px`, 12, 31);
  ctx.fillStyle = clears ? '#5cff8a' : '#ff5a5a';
  ctx.fillText(clears ? `jump clears by ${(D - apex - HERO_DRAW_H).toFixed(0)} px` : `jump head ${(apex + HERO_DRAW_H).toFixed(0)} — BONKS`, 12, 41);
  scanlines(ctx, 0.1);
}

export const CORRIDOR_LADDER = [
  { zoom: 2, corridor: 108, name: 'zoom 2.0 — today', note: 'ZOOM_CLOSE, what the mocks have been drawn at. The hero is 48 screen px tall — the most legible rung, and the only one where the current jump puts his head through the ceiling.' },
  { zoom: 1.8, corridor: 120, name: 'zoom 1.8 — +12px', note: 'The smallest pull-back that makes the current jump fit, with 8px to spare. Hero 43px. Not an existing tier.' },
  { zoom: 1.6, corridor: 137, name: 'zoom 1.6 — +29px (ZOOM_NORMAL)', note: 'A tier the game already ships. A quarter more corridor, the jump clears by 25px, and the hero is 38 screen px — 20% smaller than today. This is the rung to argue about.' },
  { zoom: 1.4, corridor: 157, name: 'zoom 1.4 — +49px', note: 'Nearly half again as much corridor and the hero is down to 34 screen px, close to ZOOM_MIN 1.3. Here to show where the trade stops being worth it.' },
];

export function drawCorridorRung(ctx, rung, t) { corridorAt(ctx, t, rung); }

// CAN YOU TAKE THE CEILING EARLY? Option 2 drawn two ways, plus the case it
// has to punish. All at the recommended rung: zoom 1.6, corridor 137.
export const CEILING_RULES = [
  { zoom: 1.6, corridor: 137, rule: 'gatezone', name: 'the gate column is the landing',
    note: 'The ceiling IS a surface, but only a gate\'s column is a place you can stand on it — everywhere else '
      + 'it bristles with saws. A double jump at a gate puts you up EARLY, which is harmless because the gate was '
      + 'sending you up anyway: same surface either way, so the chart still knows where you are. The dashed green '
      + 'span is the landable width. The arrows stay directional and stay honest.' },
  { zoom: 1.6, corridor: 137, rule: 'punish', camOffset: 168, name: 'the same jump, away from a gate',
    note: 'The identical double jump taken mid-lane. It meets a saw — an AUTHORED punishment for going high in a '
      + 'corridor rather than an engine bonk, and one that READS from a distance, which a bonk never does. This '
      + 'is the card that makes the rule above fair.' },
  { zoom: 1.6, corridor: 137, rule: 'toggle', name: 'free roam — the gate is a toggle',
    note: 'The other reading: the ceiling is landable anywhere and the gate SWAPS whichever surface you are on, '
      + 'so the glyph stops claiming a direction — two runs of chevrons leaving a waist. Costs the thing that '
      + 'makes a two-surface chart authorable: the author no longer knows which surface you are on at any x, so '
      + 'every pattern has to be survivable on both, and the fairness sim doubles.' },
];

export function drawCeilingRule(ctx, v, t) { corridorAt(ctx, t, v); }

export const PORTRAIT_FRAME_VARIANTS = [
  { letter: 'a', name: 'as it stands', fill: {},
    note: 'The baseline: a plain metal hull above and a plate deck below. Both regions are structure with '
      + 'nothing in them, which is the complaint.' },
  { letter: 'b', name: 'glazed roof', fill: { glazed: true },
    note: 'The station is a TUBE, so the roof is glass too — the same 94px window grid above the ceiling lane. '
      + 'The top third becomes sky, Saturn and hilltops instead of metal, and the ceiling reads as a LANE rather '
      + 'than a lid, which is the cabinet\'s whole premise. No gameplay, nothing opaque.' },
  { letter: 'c', name: 'gate pylons, full height', fill: { pylons: true },
    note: 'Each gate grows a lattice mast with a transformer and a warning lamp above the ceiling, and its '
      + 'machinery below the floor. The dead thirds then carry the one thing that IS gameplay, and a gate becomes '
      + 'a landmark visible much further out — worth real money in portrait, where the runway is 73% of '
      + 'landscape\'s.' },
  { letter: 'd', name: 'grated sub-floor', fill: { grated: true },
    note: 'You see THROUGH the deck into the service level: machinery at its own slower rate, lamps, and the '
      + 'extension cord slung between brackets — the thing the whole game is about. A pit then reads as a hole '
      + 'into a real place rather than a black rectangle.' },
  { letter: 'e', name: 'second deck overhead', fill: { deck2: true },
    note: 'Someone else\'s shift, glimpsed through the structure: a cargo tram and two of the staff walking the '
      + 'other way. Most atmosphere per pixel and the most risk of competing with the lane, so everything is '
      + 'silhouette, dim, and slower than the camera.' },
  { letter: 'f', name: 'diegetic signage', fill: { signage: true },
    note: 'A marker band on the ceiling rail: hazard stencils and a plate counting down to the next gate. '
      + 'Information rather than decoration, on structure that is already there.' },
  { letter: 'g', name: 'glazed + pylons + grating', fill: { glazed: true, pylons: true, grated: true },
    note: 'THE RECOMMENDATION. Everything added is either view or gameplay-relevant, and none of it puts moving '
      + 'bright ink near the read band. The second deck is left out unless the station wants populating.' },
  { letter: 'i', name: 'pylons + grating + signage', fill: { pylons: true, grated: true, signage: true },
    note: 'PETER\'S PICK, 22 Sep 2026: d for the floor, plus c and f. The roof stays metal — ribs now running the '
      + 'full hull rather than stopping partway — and the height is carried by the gate masts, with the marker '
      + 'band on the ceiling rail and the service level visible under the deck. Everything in the frame is '
      + 'either gameplay or information.' },
  { letter: 'h', name: 'everything at once', fill: { glazed: true, pylons: true, grated: true, deck2: true, signage: true },
    note: 'All five, to see where it tips into noise. The honest use of this card is to find what to REMOVE.' },
];

export function drawPortraitFrameVariant(ctx, variant, t) {
  portraitScene(ctx, t, { overlay: false, fill: variant.fill });
}

const portraitArt = {
  letter: 'S', name: 'PORTRAIT — the corridor', portrait: true,
  note: 'The corridor as a phone actually presents it: a 480x1041 frame, 137 x 297 world px at 3.5 zoom. '
    + 'THE PANES ARE IN WORLD UNITS — 94px wide, the same window the landscape deck has — because screen px are '
    + 'not a size: written as 188 screen px the same window would be a third smaller on the phone, architecture '
    + 'that shrinks when you rotate the handset. Portrait shows about a pane and a half, so you look through ONE '
    + 'big window at a time. Above the ceiling is the station\'s outer hull (ribs, a service run, a lamp strip) '
    + 'and below the floor is more station — between them they answer the ~110 world px above the corridor and '
    + 'the 79 below, which landscape never has to.',
  draw(ctx, t) { portraitScene(ctx, t, { overlay: false }); },
};

const portraitCheck = {
  letter: 'T', name: 'PORTRAIT — measured', portrait: true,
  note: 'The same frame with the numbers on it. Two arcs from the game\'s own integrator: RED is the current '
    + 'launch at 0.65g, which puts his head through the ceiling AND lands at 0.99x the runway; GREEN is the '
    + 'proposal — same 0.65g float, launch cut to 210 — which clears the ceiling and lands at 0.65x with room to '
    + 'see it. In a corridor the GATE is the vertical verb, so a tall jump has nothing to reach. The corridor '
    + 'itself is capped by LANDSCAPE, not portrait: landscape sees 135 world px of height and the corridor is '
    + 'already 108 of them, where portrait sees 297.',
  draw(ctx, t) { portraitScene(ctx, t, { overlay: true }); },
};

export const XFER_STYLES_PARKED = [xferInstant, xferCard];
export const DECK_VARIANTS_PARKED = [deckPanes, deckFull, deckViewport];

export const SPACE_CABINET_CANDIDATES = [gravityGrid, moonbase, hullRun, ringStation,
  deckLunar, deckRealistic, deckDouble, deckClean, deckBands, deckGhost,
  xferSomersault, lowGNow, lowGMoon, portraitArt, portraitCheck];

export function drawSpaceCandidate(ctx, candidate, { camX = 0, t = 0, pack } = {}) {
  candidate.draw(ctx, { camX, t, pack });
}
