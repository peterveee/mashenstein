// Broad, deterministic foreground hills for selected cabinets. Heights stay
// modest so obstacle spacing and jump timing remain familiar.
import { W } from '../engine/renderer.js';
import { roadAt } from '../game/routes.js';

const PROFILES = {
  plumber:   { amp: 16, period: 430, phase: 0 },
  speed:     { amp: 10, period: 560, phase: 120 },
  frost:     { amp: 14, period: 500, phase: 250 },
  cardboard: { amp: 18, period: 460, phase: 80 },
  office:    { amp: 9, period: 620, phase: 310 },
};

export function terrainHeight(cabinet, worldX) {
  const p = cabinet && PROFILES[cabinet.id];
  if (!p) return 0;
  const wave = (Math.sin(((worldX + p.phase) / p.period) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  const rounded = wave * wave * (3 - 2 * wave);
  const intro = Math.min(1, Math.max(0, worldX / 280));
  return p.amp * rounded * intro;
}

export function terrainGroundY(cabinet, worldX, baseY = 232) {
  return baseY - terrainHeight(cabinet, worldX);
}

// `viewW` is the world width actually on screen this frame. It runs inside the
// zoomed world transform, so W here was never the visible width — at the
// resting 1.6 the frame shows 300 units and this walked 480, painting a third
// of its columns past the right edge; on a phone at 2.2 it showed 218 and still
// walked 480. Callers that have no camera to ask (tutorial, hub) keep W.
/**
 * How thick a slab's SOIL body is drawn, under its turf cap.
 *
 * The one number the art and the fairness sweep both have to agree on, which is
 * why it lives here and `clearRouteHazards` reads it rather than keeping its
 * own. It used to be 6 while the art drew 6, and then the art grew a proper
 * cross-section and the sweep went on clearing hazards against a slab 5px
 * thinner than the one on screen — so a two-crate stack that "cleared" the
 * underside was drawn straight through the platform.
 *
 * The gap it leaves is load-bearing too: at the 29px ceiling islands are capped
 * at, 9px of body plus 3px of turf leaves 17px of clearance against a 14px
 * standing hitbox (PLAYER_H), so the lane really does run underneath — a hero
 * who does not jump passes below the island rather than being blocked by it.
 */
export const ISLAND_THICKNESS = 9;

/**
 * Floating islands: flat slabs hanging over the lane.
 *
 * Drawn with the cabinet's own ground colours rather than a palette of their
 * own, because a slab is a piece of the floor that happens to be up in the air —
 * a differently-coloured one reads as a prop you can pass through, which is
 * exactly the wrong thing to tell the player about a surface they can stand on.
 *
 * The underside gets the dark fill and a lit top edge, the same two-tone the
 * ground line uses, so the side you can land on is the side that is lit.
 */
export function drawRoutes(ctx, camX, cabinet, routes, topAt, viewW = W, opts = {}) {
  const right = Math.min(W, Math.ceil(viewW) + 2);
  const groundAt = opts.groundAt || ((wx) => terrainGroundY(cabinet, wx));
  const cloudFrom = opts.cloudFrom ?? 74;
  const cloudTo = opts.cloudTo ?? 128;
  const bottomY = opts.bottomY ?? (GROUND_BASE + 160);
  for (const r of routes) {
    const sx = r.x - camX;
    if (sx > right || sx + r.w < 0) continue;
    // Walked in columns rather than drawn as a rect, because a road is not
    // level: it holds its entry height, climbs, holds again and then eases back
    // down to meet the ground, and every one of those changes is something the
    // player is meant to read coming. An island's surface is flat, so the same
    // walk draws it as a straight slab without needing to know the difference.
    // Rounded INWARD at both ends. Rounding out puts a column a pixel outside
    // the span, where the road does not exist and its height reads as zero —
    // which draws a spike down to the ground at the mouth and again at the
    // merge, and the one at the mouth looks like a wall in the hero's path.
    const from = Math.max(0, Math.ceil(sx));
    // Strictly INSIDE the span at both ends. `Math.floor(sx + r.w)` can land
    // exactly on the last column, where `camX + x` equals `r.x + r.w` — and
    // there `routeRise` correctly reports nothing, because the road has ended.
    // The path then draws a spike from the road's height straight down to the
    // ground: a vertical green streak at the end of every sky road, at whatever
    // camera x happened to make the arithmetic come out whole.
    const to = Math.min(right, Math.ceil(sx + r.w) - 1);
    if (r.kind === 'tunnel') { drawTunnel(ctx, camX, cabinet, r, topAt, groundAt, from, to, bottomY); continue; }
    // A sky road stops being made of ground somewhere on the way up. Which
    // columns have crossed over is decided per COLUMN rather than per road,
    // because the road climbs through the transition — the same slab is dirt at
    // its mouth and weather at its peak, and a single verdict for the whole
    // span would have to be wrong at one end of it.
    const asCloud = (wx) => (r.sky ? cloudMix(groundAt(wx) - topAt(wx, r), cloudFrom, cloudTo) : 0);
    drawSlab(ctx, camX, cabinet, r, topAt, from, to, asCloud);
    if (r.sky) drawCloudRoad(ctx, camX, r, topAt, groundAt, from, to, cloudFrom, cloudTo);
  }
}

/**
 * The body of a slab or a road: what you are standing on, seen from the side.
 *
 * It used to be a 6px bar of flat `groundDark` with a lit line along the top,
 * and at any size that is a green rectangle. What it is MADE of was never
 * drawn, and a platform in a platformer is the one prop the player looks at
 * longest — it is under them the whole time they are up there.
 *
 * So it has a cross-section now, in the order earth actually stacks:
 *
 *   ── turf cap, the lit surface, overhanging both ends
 *   ── a bright rim under the turf where the light stops
 *   ── soil, warm at the top and cooling into shadow at the bottom
 *   ── a scalloped underside, because a torn-out chunk of ground does not
 *      have a straight bottom edge
 *   ── roots, on a slab that is hanging in the air with nothing under it
 *
 * All of it follows the SAME profile the collision does, so a road that climbs
 * carries its own cross-section up with it and an island stays flat. The ends
 * are rounded on an island (it is an object) and left square on a road (it is
 * a stretch of ground that happens to be up here).
 */
function drawSlab(ctx, camX, cabinet, r, topAt, from, to, asCloud) {
  const soil = soilOf(cabinet);
  const island = r.kind === 'island';
  const CAP = 3;                              // turf
  const BODY = island ? ISLAND_THICKNESS : 8; // soil under it
  const lip = island ? 2 : 0;                 // the turf's overhang at the ends
  // A break in the road ends a run exactly as a switch to cloud does — there is
  // nothing there either way, and the run-splitting below already knows how to
  // draw around nothing.
  const solid = (wx) => roadAt(wx, r) && asCloud(wx) < 1;
  // Walked as PATHS, not columns. A per-column fill steps the silhouette by the
  // sampling stride, which the camera then magnifies into a visible staircase
  // on every sloping edge.
  const runs = [];
  let run = null;
  for (let x = from; x <= to; x += 2) {
    if (solid(camX + x)) { if (!run) { run = [x, x]; runs.push(run); } else run[1] = x; }
    else run = null;
  }
  for (const [a, b] of runs) {
    if (b - a < 1) continue;
    const y = (x) => topAt(camX + x, r);
    // ---- soil body, with the scalloped underside ---------------------------
    ctx.beginPath();
    ctx.moveTo(a, y(a));
    for (let x = a; x <= b; x += 3) ctx.lineTo(x, y(x));
    ctx.lineTo(b, y(b));
    // Back along the bottom, wobbling. The WALK is snapped to a world grid, not
    // just the wobble it feeds — and that distinction is the whole bug. Reading
    // `camX + x` at screen columns changes the set of world positions sampled
    // every time the camera moves a fraction of a pixel, so the teeth crawl
    // along the underside instead of belonging to it. On a world grid each tooth
    // has one permanent home and the camera simply carries it past.
    //
    // The two corners are added explicitly at zero bite so the path closes on
    // the slab's real edges whatever the grid happens to land on.
    const BITE = 4;
    ctx.lineTo(b, y(b) + BODY);
    for (let wx = Math.floor((camX + b) / BITE) * BITE; wx > camX + a; wx -= BITE) {
      const x = wx - camX;
      if (x <= a || x >= b) continue;
      ctx.lineTo(x, y(x) + BODY
        + 1.2 + Math.sin(wx * 0.55) * 0.8 + Math.sin(wx * 0.21) * 1.1);
    }
    ctx.lineTo(a, y(a) + BODY);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y(a) + CAP, 0, y(a) + BODY + 3);
    g.addColorStop(0, soil);
    g.addColorStop(1, darken(soil, 0.55));
    ctx.fillStyle = g;
    ctx.fill();
    // ---- a couple of stones, and now and then a skeleton --------------------
    // THIS is the band worth looking into, on a road and on an island alike: a
    // slab seen edge-on is the only place in the game the ground is cut open,
    // turf on top and soil beneath, and that cross-section is the one picture
    // that says what the level is made of. An island earns it as much as a road
    // does — more, since it is the piece the hero stands still on.
    //
    // Sparse on purpose: `SLAB_STONE_STRIDE` apart on a fixed WORLD grid with
    // most slots skipped, so a frame holds two or three rather than a row, and
    // each one keeps its place as the camera carries it past.
    drawStones(ctx, camX, soil, a + 4, b - 4,
      (x) => y(x) + CAP + 1, (x) => y(x) + BODY - 0.5, SLAB_STONE_STRIDE, island ? 0.68 : 0.62);
    // NO fossil here. It was on the slab and it was wrong: a skeleton buried in
    // a floating island is a skeleton hanging in mid-air, which is a joke about
    // geology rather than a piece of one. The mark exists to say "this was here
    // before you were", and a slab currently two hundred feet up cannot say it.
    // It lives in `drawSubsoil` now — real ground, seen in the one cutaway the
    // game ever offers.
    // No roots. They were here, and they were the last of the same mistake the
    // cave stones were: walked along SCREEN columns reading `camX + x`, so the
    // set of world positions being sampled changed every time the camera moved a
    // fraction of a pixel and the whole fringe flickered. Redrawn on the world
    // grid they would have been stable — but they were also just straight dark
    // sticks, and the scalloped underside above already says the slab was torn
    // out of the ground. One mark doing the job beats two.
    // ---- turf cap, and the rim where the light stops ------------------------
    ctx.beginPath();
    ctx.moveTo(a - lip, y(a));
    for (let x = a; x <= b; x += 3) ctx.lineTo(x, y(x));
    ctx.lineTo(b + lip, y(b));
    ctx.lineTo(b + lip, y(b) + CAP);
    for (let x = b; x >= a; x -= 3) ctx.lineTo(x, y(x) + CAP);
    ctx.lineTo(a - lip, y(a) + CAP);
    ctx.closePath();
    ctx.fillStyle = cabinet.ground;
    ctx.fill();
    ctx.strokeStyle = cabinet.groundDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = a; x <= b; x += 3) {
      if (x === a) ctx.moveTo(x - lip, y(x) + CAP); else ctx.lineTo(x, y(x) + CAP);
    }
    ctx.lineTo(b + lip, y(b) + CAP);
    ctx.stroke();
    // The lit edge along the very top, which is the line that says "land here".
    ctx.strokeStyle = lighten(cabinet.ground, 0.42);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = a; x <= b; x += 3) {
      if (x === a) ctx.moveTo(x - lip, y(x) + 0.75); else ctx.lineTo(x, y(x) + 0.75);
    }
    ctx.lineTo(b + lip, y(b) + 0.75);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

// How far apart stone SLOTS sit, in world px, before most of them are skipped.
// The ground below the lane is the wide open band and gets the looser spacing;
// a road's 8px cut face is a sliver by comparison and would look bare at that
// rate, so it packs its handful a little closer.
const GROUND_STONE_STRIDE = 52;
// How deep the stone-and-bone band reaches below the topsoil, in world px.
//
// A CONSTANT, and that is the entire point of it. It used to be `bottomY` — the
// world y of the bottom edge of the FRAME — which moves with the camera anchor,
// so every stone's depth was a fraction of a quantity that changed as the hero
// descended and the whole field slid vertically with him. A stone is at a place
// in the ground; nothing about where the camera happens to be looking may enter
// into where it is. Deep enough to cover the deepest tunnel plus a frame under
// it, and anything below the visible edge is simply skipped.
// The world y the lane runs along. terrain.js is handed `baseY` per call and the
// engine's GROUND_Y is the same number; kept local so this module does not
// import the camera to draw dirt.
const GROUND_BASE = 232;
const SUBSOIL_DEPTH = 210;
// How far apart a buried skeleton may be. Very wide on purpose: it is a thing
// you notice on the second run through a stage, and one every few hundred pixels
// is wallpaper.
const FOSSIL_STRIDE = 1400;
const SLAB_STONE_STRIDE = 21;

/**
 * Stones in earth, on a fixed WORLD grid.
 *
 * The grid is the entire point, and it is what the first version got wrong.
 * Walking SCREEN columns and reading `camX + x` at each one re-rolls every
 * stone's noise the instant the camera moves a fraction of a pixel: the set of
 * world positions being sampled changes every frame, so the stones boil and
 * swim in place instead of scrolling past. It looks animated because it IS
 * animated — by the camera, once per frame, which is nobody's intention.
 *
 * Snapping the walk to a multiple of `stride` in world space gives every stone
 * one permanent home. The camera then carries it across the frame exactly as it
 * carries the slab it is buried in, and it sits still relative to the ground the
 * way a stone in the ground does.
 *
 * `topAt`/`botAt` are functions of screen x rather than numbers so the same
 * painter serves a flat band under the lane and a road that climbs — the stones
 * ride the profile up with everything else.
 *
 * Each one is an ellipse with a lit crown and NO bottom edge: outlining the
 * whole thing draws a pebble sitting on the soil instead of one set into it.
 * Deeper stones are bigger and darker, which is what gives a band depth rather
 * than a sprinkle of identical pebbles.
 */
function drawStones(ctx, camX, soil, fromX, toX, topAt, botAt, stride, skipBelow, opts = {}) {
  if (toX <= fromX) return;
  // How many stones a surviving slot is worth, and how big the biggest may get.
  // A deep band wants BOTH — spread the slots further apart so they never read
  // as a measured row, then put two or three stones of different sizes in each
  // survivor. One stone per slot in a hundred-pixel band of earth is a gradient
  // with a pebble in it; a cluster of three at different depths and sizes is
  // ground. A thin band (a slab's 9px cut face) still wants exactly one.
  const perSlot = opts.perSlot ?? 1;
  const maxR = opts.maxR ?? 3.5;
  // Everything below the frame's bottom edge is skipped rather than clamped
  // into view. Clamping would drag the deep stones up against the edge as the
  // camera moved, which is the sliding this whole band was just cured of.
  const clipY = opts.clipY ?? Infinity;
  const first = Math.floor((camX + fromX) / stride) * stride;
  for (let wx = first; wx <= camX + toX; wx += stride) {
    const n = ((wx * 0.61803398875) % 1 + 1) % 1;
    if (n < skipBelow) continue;
    for (let k = 0; k < perSlot; k++) {
      // Each stone in a cluster gets its own irrational offset, so they differ
      // from each other as much as they differ from the next cluster along —
      // three copies of one roll would be a row of triplets.
      const key = wx + k * 137;
      const m = ((key * 0.7548776662) % 1 + 1) % 1;
      const q = ((key * 0.38196601125) % 1 + 1) % 1;
      const p = ((key * 0.54368901269) % 1 + 1) % 1;
      // Only the first of a cluster is guaranteed; the rest thin out, so a slot
      // holds one, two or three and the count itself varies down the run.
      if (k > 0 && p < 0.34 + k * 0.12) continue;
      // Jittered off the slot so the survivors do not read as a measured row.
      const x = wx - camX + (m - 0.5) * stride * 0.8;
      if (x < fromX || x > toX) continue;
      const top = topAt(x);
      const band = botAt(x) - top;
      if (band < 3) continue;
      const depth = 0.12 + q * 0.84;
      // Size spread is deliberately wide — p cubed, so most are small and the
      // occasional one is a boulder. An even spread gives stones that are all
      // roughly the same and reads as texture rather than as rock.
      const grade = 0.28 + p * p * p * 2.2;
      const rx = Math.min(0.9 + depth * 1.6 * grade + grade, maxR, band * 0.42);
      const ry = rx * (0.58 + n * 0.36);
      const cy = top + ry + depth * (band - ry * 2);
      if (cy - ry > clipY) continue;
      const tilt = (q - 0.5) * 1.3;
      ctx.beginPath();
      ctx.ellipse(x, cy, rx, ry, tilt, 0, Math.PI * 2);
      ctx.fillStyle = darken(soil, 0.6 - q * 0.13);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, cy, rx * 0.8, ry * 0.8, tilt, Math.PI * 1.12, Math.PI * 1.98);
      ctx.strokeStyle = lighten(soil, 0.28);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
  ctx.lineWidth = 1;
}

/**
 * Something older than the level, buried in the side of it.
 *
 * A cross-section of ground can say one thing a surface never can: this was here
 * before you were. That is the whole reason it is drawn into the soil band and
 * not onto the turf — it is a fossil, so it has to be IN the earth, and the only
 * place the earth is ever visible edge-on is the side of a slab the hero has
 * climbed above.
 *
 * Small on purpose. The soil band is eight or nine pixels and the camera is what
 * makes it legible, so this is about thirteen units across and five tall: at the
 * zoom the game actually runs at that is a clear little skeleton, and at any
 * bigger it stops being a detail and becomes a decal on the platform.
 *
 * Bone-coloured rather than white, and slightly transparent, so the soil shows
 * through it and it reads as set into the ground rather than laid on top. The
 * skull carries the whole read at this size — one blunt head with one dark
 * socket — and the ribs are what makes the shape scan as a skeleton rather than
 * as a stone with a highlight.
 *
 * Placed and tilted deterministically by the caller from the ROUTE's own world
 * x, like the stones above: a slab is redrawn every frame and does not move, so
 * anything rolled per frame boils.
 */
function drawFossil(ctx, cx, cy, soil) {
  ctx.save();
  ctx.translate(cx, cy);
  // Settled, not laid out. A skeleton lying dead level reads as a diagram.
  ctx.rotate(-0.13);
  const bone = 'rgba(233,228,209,0.9)';
  ctx.strokeStyle = bone;
  ctx.lineCap = 'round';
  // Spine.
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-1, 0);
  ctx.lineTo(6.4, 0.6);
  ctx.stroke();
  // Ribs, longest at the chest and shortening toward the tail, curving back the
  // way a ribcage does rather than sticking out square.
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + i * 1.6;
    const h = 1.9 - i * 0.32;
    for (const s of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(x, -0.2);
      ctx.quadraticCurveTo(x + 0.5, h * s, x - 0.25, (h + 0.3) * s);
      ctx.stroke();
    }
  }
  // Skull, and the socket that does the work.
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.ellipse(-2.5, -0.1, 2.1, 1.6, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = darken(soil, 0.35);
  ctx.beginPath();
  ctx.ellipse(-3.05, -0.3, 0.62, 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';
}

// How much of the way a column is from being ground to being cloud. Nothing
// below `from`, everything above `to`, smoothstepped between so the changeover
// happens over a stretch of road rather than at one column — a hard line would
// be a visible seam across the middle of the thing the hero is standing on.
function cloudMix(rise, from, to) {
  const k = Math.max(0, Math.min(1, (rise - from) / (to - from)));
  return k * k * (3 - 2 * k);
}

/**
 * The top of a sky road: cloud instead of dirt.
 *
 * Drawn as overlapping discs along the road's own profile, with a bright crown
 * and a shaded belly, so it reads as weather with a walkable top rather than as
 * a white platform. Alpha ramps in over the transition band so the road appears
 * to become cloud as it climbs out of reach of the ground, which is exactly
 * what the player is being told: you are not on the level any more.
 *
 * The puffs are a deterministic function of world x, not a random scatter. A
 * road is drawn afresh every frame and it does not move, so anything rolled per
 * frame boils; anything keyed to the screen swims as the camera scrolls.
 */
function drawCloudRoad(ctx, camX, r, topAt, groundAt, from, to, cloudFrom, cloudTo) {
  const STEP = 7;
  // Snapped to a world grid for the same reason the stones and the scallop are:
  // stepping in SCREEN space resamples different world positions every frame, so
  // the puffs swim along the road rather than scrolling with it.
  for (let wx = Math.floor((camX + from - STEP) / STEP) * STEP;
    wx <= camX + to + STEP; wx += STEP) {
    const x = wx - camX;
    if (wx < r.x || wx > r.x + r.w || !roadAt(wx, r)) continue;
    const y = topAt(wx, r);
    const a = cloudMix(groundAt(wx) - y, cloudFrom, cloudTo);
    if (a <= 0.01) continue;
    // A stable per-puff wobble: the fractional part of a large irrational
    // multiple of the puff's own world position. Same puff, same shape, every
    // frame, and no state to carry.
    const n = ((wx * 0.61803398875) % 1 + 1) % 1;
    const rad = 5 + n * 3.5;
    const lift = n * 2;
    ctx.globalAlpha = a * 0.92;
    ctx.fillStyle = 'rgba(198,214,236,1)';
    ctx.beginPath();
    ctx.arc(x, y + 3.5, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y + 1.5 - lift * 0.4, rad * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Mix a hex colour toward black. Factors above 1 brighten, clamped, which is
// how the lit edges are derived from the same one colour a cabinet declares
// rather than from a second colour it would have to keep in step.
function darken(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
// Blend two hex colours. `t` is how much of `b` ends up in the result.
function mix(a, b, t) {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const c = (sh) => Math.round((((na >> sh) & 255) * (1 - t)) + (((nb >> sh) & 255) * t));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}
// Toward white rather than simply up: scaling a colour that is already near a
// channel ceiling only shifts its hue, and a lit grass edge wants to look like
// sunlight on grass rather than like a different, yellower grass.
function lighten(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.round(v + (255 - v) * f);
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/**
 * The earth under the lane.
 *
 * The default is a real brown rather than the cabinet's own ground colour taken
 * down a few stops. Darkening the surface was the tidy answer and it was the
 * wrong one: plumber's floor is grass green, so its underside came out as dark
 * green and read as the inside of a hill rather than as being IN the ground.
 * Soil is not grass with the lights off. A cabinet can still name its own with
 * `soil`, which is what the ice and neon stages will want.
 */
export const DEFAULT_SOIL = '#5c3b22';
export function soilOf(cabinet) { return (cabinet && cabinet.soil) || DEFAULT_SOIL; }

// Where the topsoil ends and the subsoil begins, below GROUND_Y. Exactly the
// apron the style packs already fill, so the brown starts where the green they
// paint runs out and there is no double-drawn band between them.
const APRON = 38;

/**
 * Everything below the topsoil, across the WHOLE visible width.
 *
 * Full width and not merely the tunnel's own span, which is the fix for seeing
 * sky and parallax hills through the floor. The packs fill 38px below the
 * groundline and nothing fills below THAT, so as soon as the camera drops to
 * follow a hero underground the frame showed background under the world. It is
 * one rect between two constants, so it also cannot be jagged.
 *
 * `bottomY` is the world y at the bottom edge of the frame, which the caller
 * has and this does not — it depends on the zoom and on where the camera is
 * anchored, both of which move.
 */
// Where one soil band gives way to the next, in world px below the groundline.
// Two seams, so the earth reads as three layers: the worked topsoil you can see
// roots in, the packed subsoil under it, and the cold stuff below that.
const SOIL_SEAM_1 = 44;
const SOIL_SEAM_2 = 112;

// The seams WOBBLE, and it is the wobble that stops them reading as a stack of
// coloured rectangles. Two sines an octave apart, keyed to world x so a seam is
// a place in the ground and scrolls past like one.
function seamWobble(wx) {
  return Math.sin(wx / 67) * 3.4 + Math.sin(wx / 23) * 1.5;
}
function seamY(wx, base) { return base + seamWobble(wx); }

// Fill everything below a wobbling seam. Traced on a world grid, like every
// other mark down here, so the crest of a wave keeps its place as the camera
// carries it across the frame.
function fillBelowSeam(ctx, camX, right, base, bottomY, colour) {
  const STEP = 6;
  ctx.beginPath();
  ctx.moveTo(-2, bottomY);
  const first = Math.floor((camX - STEP) / STEP) * STEP;
  for (let wx = first; wx <= camX + right + STEP * 2; wx += STEP) {
    ctx.lineTo(wx - camX, seamY(wx, base));
  }
  ctx.lineTo(right + 4, bottomY);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

/**
 * The odd big boulder.
 *
 * Rare on purpose — one every few hundred pixels at most — because the whole
 * point of it is that it is not one of the pebbles. A band of evenly-sized
 * stones is a texture; one stone four times the size of its neighbours is the
 * thing that makes the band read as ground with things buried in it.
 *
 * Sits ACROSS a seam where it can, which is the other half of the read: a rock
 * that respects the layer boundary is a decal, and one that interrupts it was
 * there before the layers were.
 */
function drawBoulders(ctx, camX, soil, fromX, toX, surfaceY, bottomY) {
  const STRIDE = 260;
  const first = Math.floor(fromX / STRIDE) * STRIDE;
  for (let wx = first; wx <= toX + STRIDE; wx += STRIDE) {
    const n = ((wx * 0.61803398875) % 1 + 1) % 1;
    if (n < 0.55) continue;
    const m = ((wx * 0.7548776662) % 1 + 1) % 1;
    const q = ((wx * 0.38196601125) % 1 + 1) % 1;
    const cx = wx + (m - 0.5) * STRIDE * 0.7;
    if (cx < fromX || cx > toX) continue;
    // Straddling one seam or the other, chosen by the roll rather than always
    // the same one — a rock that respects a layer boundary is a decal, and one
    // that interrupts it was there before the layers were.
    const base = q > 0.5 ? SOIL_SEAM_1 : SOIL_SEAM_2;
    const cy = surfaceY(cx) + base + seamWobble(cx) + (m - 0.5) * 14;
    const rx = 6.5 + q * 4.5;
    const ry = rx * (0.62 + n * 0.26);
    if (cy - ry > bottomY) continue;
    const x = cx - camX;
    const tilt = (n - 0.5) * 0.9;
    ctx.beginPath();
    ctx.ellipse(x, cy, rx, ry, tilt, 0, Math.PI * 2);
    ctx.fillStyle = darken(soil, 0.52);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, cy, rx * 0.82, ry * 0.82, tilt, Math.PI * 1.1, Math.PI * 1.98);
    ctx.strokeStyle = lighten(soil, 0.3);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - rx * 0.45, cy - ry * 0.1);
    ctx.lineTo(x - rx * 0.05, cy + ry * 0.2);
    ctx.lineTo(x + rx * 0.5, cy - ry * 0.05);
    ctx.strokeStyle = darken(soil, 0.34);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

/**
 * The earth under the lane, in BANDS.
 *
 * A single gradient was the first attempt and it read as a brown wash — which
 * is what a gradient is. Ground in section is layered: a thin worked topsoil,
 * packed subsoil under it, colder stuff below that, and the boundaries between
 * them wander. Three flat bands with wobbling seams, pebbles set through all of
 * them and the occasional boulder straddling a seam, is what says "cut earth"
 * where a vertical fade says "fill".
 *
 * Full frame width and not merely the tunnel's own span, which is the fix for
 * seeing sky and parallax hills through the floor: the packs fill 38px below
 * the groundline and nothing filled below THAT.
 */
/**
 * Earth, from a surface down to the bottom of the frame.
 *
 * `surfaceY` is where the ground is at a given world x, so the same painter
 * serves the lane and the floor of a lower route: the layers are measured DOWN
 * FROM THE SURFACE rather than from a fixed world line, which is both how soil
 * actually works and what lets a second area below the first look like the same
 * planet rather than like a different rendering.
 *
 * `runs` are world-x spans to fill. Everything outside them is left alone,
 * which is how an overhang gets open air under it instead of a hundred pixels
 * of packed brown.
 */
function drawEarth(ctx, cabinet, camX, runs, surfaceY, bottomY) {
  const soil = soilOf(cabinet);
  const dark = cabinet.groundDark || '#2a7038';
  const STEP = 4;
  const band = (from, to, offset, colour, height) => {
    ctx.beginPath();
    ctx.moveTo(from - camX, surfaceY(from) + offset(from));
    for (let wx = Math.ceil(from / STEP) * STEP; wx < to; wx += STEP) {
      ctx.lineTo(wx - camX, surfaceY(wx) + offset(wx));
    }
    ctx.lineTo(to - camX, surfaceY(to) + offset(to));
    ctx.lineTo(to - camX, height);
    ctx.lineTo(from - camX, height);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
  };
  for (const [from, to] of runs) {
    if (to <= from) continue;
    const s0 = surfaceY((from + to) / 2);
    // Root zone, thin, fading into the soil below it.
    const rz = ctx.createLinearGradient(0, s0 + 5, 0, s0 + 18);
    rz.addColorStop(0, dark);
    rz.addColorStop(1, mix(dark, soil, 1));
    band(from, to, () => 5, rz, bottomY);
    band(from, to, () => 18, soil, bottomY);
    // Two bedding seams, wobbling, measured down from the surface so they ride
    // the terrain instead of cutting across it.
    band(from, to, (wx) => SOIL_SEAM_1 + seamWobble(wx), darken(soil, 0.78), bottomY);
    band(from, to, (wx) => SOIL_SEAM_2 + seamWobble(wx), darken(soil, 0.58), bottomY);
    // Pebbles and the odd boulder through the lot.
    drawStones(ctx, camX, soil, from - camX, to - camX,
      (x) => surfaceY(camX + x) + 20, (x) => surfaceY(camX + x) + SUBSOIL_DEPTH,
      GROUND_STONE_STRIDE, 0.4, { perSlot: 3, maxR: 6, clipY: bottomY });
    drawBoulders(ctx, camX, soil, from, to, surfaceY, bottomY);
  }
}

/**
 * The earth under the lane.
 *
 * `overhangs` are spans where the lane has another route running UNDER it. The
 * fill stops there, because what is under the lane in those places is not more
 * earth — it is air, with a whole second area at the bottom of it. That is the
 * difference between a level with a high road and a low road and a level with a
 * cave in it, and it is entirely a question of what you decline to draw.
 */
export function drawSubsoil(ctx, cabinet, right, bottomY, camX = 0, overhangs = []) {
  const runs = [];
  let open = camX - 8;
  for (const sp of [...overhangs].sort((a, b) => a.x - b.x)) {
    if (sp.x > open) runs.push([open, Math.min(sp.x, camX + right + 8)]);
    open = Math.max(open, sp.x + sp.w);
  }
  if (open < camX + right + 8) runs.push([open, camX + right + 8]);
  drawEarth(ctx, cabinet, camX, runs, () => GROUND_BASE, bottomY);
}

// Walk a profile as a PATH rather than as a column of rects.
//
// This is the answer to jagged edges. Filling per column steps the silhouette by
// the sampling stride — 2px in world space, which the camera then magnifies to
// three or four on screen — so every sloping edge came out as a staircase. A
// path is one continuous line whatever the stride, and the stride only controls
// how closely it follows the curve.
//
// `breaks` are world x's the walk must sample EXACTLY. A sampled walk lands
// wherever it lands relative to a sharp turn, so an edge gets drawn between
// whichever two samples straddle it and shifts every time the camera moves.
function traceProfile(ctx, camX, from, to, yAt, reverse = false, breaks = []) {
  const STEP = 3;
  const pts = [];
  for (const b of breaks) {
    if (b > camX + from && b < camX + to) pts.push(b);
  }
  const xs = [camX + from];
  for (let x = from + STEP; x < to; x += STEP) xs.push(camX + x);
  xs.push(camX + to, ...pts);
  xs.sort((a, b) => a - b);
  if (reverse) xs.reverse();
  for (const wx of xs) ctx.lineTo(wx - camX, yAt(wx));
}

/**
 * The turf rolling over the edge of an opening.
 *
 * The problem this solves is legibility, not decoration. A hole cut straight
 * down out of a flat lane has no shoulders, so from the approach it reads as a
 * dark patch ON the ground rather than a hole IN it — and a player who cannot
 * see a hole cannot see that jumping it is an option. Rolling the grass over
 * the lip is the oldest fix in the genre and it works because it puts the
 * silhouette of an edge where the edge is.
 *
 * ADDITIVE, and that is what makes it safe. Dipping the lane's own surface
 * would mean erasing ground the packs have already painted, and there is
 * nothing to erase it to; a tongue drawn DOWN INTO the void needs no such
 * thing. It is also drawing only — `groundYAt` is the floor for every entity in
 * the game and does not move, so the hero runs level right to the brink.
 */
function drawOpeningLips(ctx, camX, cabinet, spans, groundAt) {
  const REACH = 7;
  const DROP = 9;
  ctx.fillStyle = cabinet.ground;
  for (const sp of spans) {
    for (const [edge, dir] of [[sp.x, 1], [sp.x + sp.w, -1]]) {
      const ex = edge - camX;
      const gy = groundAt(edge);
      // Never longer than the hole is wide, or two curls meet in the middle and
      // close up the very thing they are describing.
      const reach = Math.min(REACH, sp.w * 0.3) * dir;
      // ONE shape: the turf band, carried over the edge and tapering to a point.
      // The first version drew a curl, a soil wedge under it and a lit stroke
      // along it — three marks inside ten pixels, which at the size this is
      // actually seen resolves to a smudge with a bright edge. A platformer lip
      // is a silhouette. It only has to say "there is an edge here", and one
      // shape of the lane's own green says it.
      ctx.beginPath();
      ctx.moveTo(ex, gy);
      ctx.quadraticCurveTo(ex + reach * 0.9, gy + DROP * 0.15, ex + reach * 0.62, gy + DROP);
      ctx.quadraticCurveTo(ex + reach * 0.34, gy + DROP * 0.3, ex, gy + 3.4);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/**
 * A tunnel: the low road, running under the lane.
 *
 * The earth is already there — `drawSubsoil` laid it across the frame — so all
 * this does is CARVE, which is the right way round: a tunnel is an absence, and
 * drawing it as an absence is what stops it reading as a green slab with a man
 * on it.
 *
 * The chamber is one filled path between the roof and the floor, unlit at the
 * top and warming toward the floor, so the space has a direction: the light in
 * here comes off the ground you are standing on, not from the rock overhead.
 * Both edges then get a lit rim, and both are strokes along the same path the
 * fill used, so neither can step away from the other.
 */
function drawTunnel(ctx, camX, cabinet, r, topAt, groundAt, from, to, bottomY) {
  const soil = soilOf(cabinet);
  const floorAt = (wx) => topAt(wx, r);
  const openings = [...(r.ramp ? [] : [{ x: r.x, w: r.mouthW }]), ...(r.holes || [])];
  const a = camX + from;
  const b = camX + to;
  // Runs of INTACT lane over the top of the route — everything but the ways in.
  const lane = [];
  {
    let open = a;
    for (const sp of [...openings].sort((x, y) => x.x - y.x)) {
      if (sp.x > open) lane.push([open, Math.min(sp.x, b)]);
      open = Math.max(open, sp.x + sp.w);
    }
    if (open < b) lane.push([open, b]);
  }

  // ---- the lane above, as a SLAB -----------------------------------------
  //
  // This is the whole difference between a low road and a cave, and it is a
  // question of what is NOT drawn. The first version filled everything between
  // the lane and the floor with dark earth and called it a chamber, which is
  // why it read as a black hole cut into a bright cartoon: the hero was inside
  // the ground rather than underneath it.
  //
  // A platformer with a high route and a low route does not do that. The upper
  // path is a SLAB with a thickness and an underside, and what is beneath it is
  // AIR — the same sky and the same parallax hills that are behind everything
  // else, which is exactly why the two levels look like one place. So the lane
  // gets an underside here and the space below it gets nothing at all.
  const UNDER = 26;
  const underAt = (wx) => groundAt(wx) + UNDER;
  for (const [f, t] of lane) {
    if (t <= f) continue;
    ctx.beginPath();
    ctx.moveTo(f - camX, groundAt(f));
    for (let wx = f; wx <= t; wx += 4) ctx.lineTo(wx - camX, groundAt(wx));
    ctx.lineTo(t - camX, groundAt(t));
    // Back along the underside, bitten, on a world grid so the teeth belong to
    // the slab rather than crawling along it.
    const BITE = 5;
    ctx.lineTo(t - camX, underAt(t));
    for (let wx = Math.floor(t / BITE) * BITE; wx > f; wx -= BITE) {
      ctx.lineTo(wx - camX, underAt(wx)
        + 1.4 + Math.sin(wx * 0.5) * 1.1 + Math.sin(wx * 0.19) * 1.5);
    }
    ctx.lineTo(f - camX, underAt(f));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, groundAt((f + t) / 2), 0, underAt((f + t) / 2));
    g.addColorStop(0, mix(cabinet.groundDark || '#2a7038', soil, 0.55));
    g.addColorStop(1, darken(soil, 0.66));
    ctx.fillStyle = g;
    ctx.fill();
    // A couple of stones in the cut face, the same as any other soil band.
    drawStones(ctx, camX, soil, f - camX, t - camX,
      (x) => groundAt(camX + x) + 7, (x) => underAt(camX + x) - 2,
      SLAB_STONE_STRIDE, 0.68);
  }

  // ---- the area below, which is just more ground --------------------------
  drawEarth(ctx, cabinet, camX, [[a, b]], floorAt, bottomY);
  // Its surface keeps the cabinet's own lit ground line, because it IS ground —
  // the same stuff the lane is made of, further down.
  ctx.strokeStyle = cabinet.ground;
  ctx.lineWidth = 2;
  ctx.beginPath();
  traceProfile(ctx, camX, from, to, floorAt);
  ctx.stroke();
  ctx.lineWidth = 1;

  // ---- something older than the level, under the lower floor --------------
  for (let wx = Math.floor(a / FOSSIL_STRIDE) * FOSSIL_STRIDE; wx <= b; wx += FOSSIL_STRIDE) {
    const f = ((wx * 0.7548776662) % 1 + 1) % 1;
    if (f < 0.5) continue;
    if (wx < r.x + r.w * 0.08 || wx > r.x + r.w * 0.92) continue;
    const x = wx - camX + (f - 0.5) * FOSSIL_STRIDE * 0.5;
    if (x < from + 10 || x > to - 10) continue;
    drawFossil(ctx, x, floorAt(camX + x) + 30 + f * 10, soil);
  }

  // Last, over the edges: the turf rolling over every way in.
  drawOpeningLips(ctx, camX, cabinet, openings, groundAt);
}

export function drawTerrain(ctx, camX, cabinet, obstacles, baseY = 232, viewW = W) {
  if (!PROFILES[cabinet && cabinet.id]) return;
  // Overscan one step so the line's last segment still leaves the frame rather
  // than stopping visibly short of it.
  const right = Math.min(W, Math.ceil(viewW) + 2);
  // Gaps used to be re-filtered into a new array every frame, and the closure
  // below was invoked once per column per pass — 482 calls a frame against a
  // list that is almost always empty. Narrowed to the columns being drawn and
  // hoisted out of the loop.
  const gaps = [];
  for (const ob of obstacles || []) {
    if (!ob.live || !ob.def || !ob.def.isGap) continue;
    if (ob.x + ob.w < camX || ob.x > camX + right) continue;
    gaps.push(ob);
  }

  // The walk is snapped to a WORLD grid, and the gap edges are exact.
  //
  // Both halves of that matter and both were wrong. Stepping `x` from 0 in
  // SCREEN space samples a different set of world positions every time the
  // camera moves a fraction of a pixel, so the fill columns crawl; and deciding
  // in-or-out per sampled column quantises the edge of a hole to the 2px step,
  // so the sides of a gap jump about by a couple of pixels as it scrolls past
  // while the ground either side of it slides smoothly. That mismatch is the
  // jerk — the hole and the ground it is a hole in were moving on different
  // grids. Snapping the walk fixes the crawl; cutting the runs at the gap's
  // true world x fixes the edge.
  const STEP = 2;
  const first = Math.floor(camX / STEP) * STEP;
  const last = camX + right;
  // Solid runs of ground, in WORLD x, with the gaps taken out of them exactly.
  const runs = [];
  let open = camX - STEP;
  const sorted = gaps.slice().sort((a, b) => a.x - b.x);
  for (const g of sorted) {
    if (g.x > open) runs.push([open, Math.min(g.x, last)]);
    open = Math.max(open, g.x + g.w);
  }
  if (open < last + STEP) runs.push([open, last + STEP]);

  ctx.fillStyle = cabinet.groundDark;
  for (const [a, b] of runs) {
    if (b <= a) continue;
    for (let wx = Math.max(first, Math.floor(a / STEP) * STEP); wx <= b; wx += STEP) {
      const cx = Math.max(a, Math.min(b, wx));
      const y = terrainGroundY(cabinet, cx, baseY);
      // Clipped to the run so a column never paints past the edge of a hole.
      const w = Math.min(3, b - cx);
      if (w > 0) ctx.fillRect(cx - camX, y, w, baseY - y + 4);
    }
  }

  ctx.strokeStyle = cabinet.ground;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [a, b] of runs) {
    if (b <= a) continue;
    ctx.moveTo(a - camX, terrainGroundY(cabinet, a, baseY));
    for (let wx = Math.ceil(a / STEP) * STEP; wx < b; wx += STEP) {
      ctx.lineTo(wx - camX, terrainGroundY(cabinet, wx, baseY));
    }
    ctx.lineTo(b - camX, terrainGroundY(cabinet, b, baseY));
  }
  ctx.stroke();
  ctx.lineWidth = 1;
}
