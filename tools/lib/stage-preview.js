// A PICTURE OF THE WHOLE LEVEL, painted with the game's own art.
//
// The level editor's lanes say where everything is. This says what it LOOKS
// like: the cabinet's ground, its roads, its holes and their fill, and every
// obstacle the seed deals, drawn by the painters the run itself draws with.
// Nothing here re-implements any of them, which is the same rule the rest of
// the editor keeps — and the asset gallery proved it possible first
// (tools/gallery-entry.js's route tiles), because terrain and routes are
// modules rather than methods on RunState.
//
// TILES AT 1:1, BLITTED DOWN, and that is not a style choice. drawRoutes and
// drawTerrain both clamp their right edge to W — 480 CONTEXT units — so one
// call can never paint more than a screen of stage however wide you say the
// view is. A whole stage is therefore a loop of screens no matter what, and
// once it is a loop, painting each screen at 1:1 into one scratch canvas and
// letting drawImage shrink it beats scaling the context down: every painter and
// every prop raster was drawn for that box, and at half scale their hairlines
// land between pixels. This way the map looks like the game seen from far
// away, which is what a map should look like.
import { getStylePack, drawPitFills } from '../../src/engine/stylePacks/index.js';
import {
  drawTerrain, drawRoutes, drawSubsoil, tunnelOverhangs, terrainGroundY,
} from '../../src/game/terrain.js';
import { routeRise, tunnelOpenings } from '../../src/game/routes.js';
import { makeObstacle, makePickup, OBSTACLES, PICKUPS } from '../../src/game/entities.js';
import { drawWorldEntity, buildAllSprites } from '../../src/game/draw.js';
import { GROUND_Y } from '../../src/engine/camera.js';
import { W } from '../../src/engine/renderer.js';
import { LOOP, loopCoinSpots } from '../../src/game/loop.js';
import { pitClearance, worstAirtime, REACT_FLOOR } from '../../src/game/spawner.js';
import { FINISH_CLEAR } from '../../src/game/layout.js';
import { PLAYER_X } from '../../src/game/player.js';

// One screen of stage per painter call, and 16px of it thrown away at each end.
// The overlap is context: a hill, a soil seam or a road that a painter begins at
// the left edge of its own view begins it off the crop, so the seam between two
// tiles is not a line anybody can see.
const TILE = W;
const OVERLAP = 16;
const STEP = TILE - OVERLAP * 2;

// ------------------------------------------------------------------ scene ----

/**
 * Everything a paint needs, built once per repaint from the editor's own model
 * and its forecast. `m` is model(); `fc` is forecast(m, seed) or null on a
 * beat-charted stage, which deals no obstacles of its own.
 */
export function buildScene(m, fc) {
  buildAllSprites();
  const cab = m.cab;
  const style = getStylePack(cab.style, {});
  const groundAt = (wx) => terrainGroundY(cab, wx);
  // Exactly RunState.routeGroundY, inlined — the same one-liner the gallery
  // inlines, and the only thing either page needs a RunState for.
  const topAt = (wx, r) => (r.kind === 'island' ? r.topY : groundAt(wx) - routeRise(wx, r));
  const routes = m.routeError ? [] : m.routes;
  const laneCuts = tunnelOverhangs(routes);
  const hillDepth = routes.reduce((d, r) => (r.kind === 'tunnel' ? Math.max(d, r.rise) : d), 0);
  const wall = m.totalDist - FINISH_CLEAR;
  const finishX = m.totalDist + PLAYER_X;

  // ---- the holes ----
  // A tunnel's mouth is a gap in the lane, laid the way spawnRouteEntries lays
  // it; both terrain painters carve their holes from gap obstacles, so without
  // these the map draws an entrance with no way in.
  const gaps = [];
  for (const r of routes) {
    if (r.kind !== 'tunnel') continue;
    // Everything a tunnel opens — the mouth, the mid-span holes and the gap
    // where the road above it ends — from the function spawnRouteEntries asks.
    // Listing the mouth and the holes by hand, as the gallery still does, draws
    // a road above a tunnel with no way off the top of it.
    for (const sp of tunnelOpenings(r)) {
      const hole = makeObstacle('gap', sp.x, {});
      hole.w = sp.w;
      hole.tunnel = r;
      gaps.push(hole);
    }
  }
  // The scripted pits, with the run's own two refusals kept: a hole that would
  // land in the finishing straight is never dug (spawnScriptedPits), and a
  // crossing carries its own fill while an ordinary pit takes the cabinet's.
  const pits = [];
  for (const p of m.pits) {
    if (p.x + p.w + 200 > finishX) continue;
    const hole = makeObstacle('gap', p.x, {});
    hole.w = p.w;
    hole.fill = p.crossing ? (p.fill || 'spikes') : cab.pitFill;
    hole.crossing = p.crossing || null;
    gaps.push(hole);
    pits.push({ ...p, hole });
  }

  // ---- what stands on the lane ----
  const entities = [];
  if (fc) entities.push(...fc.obstacles, ...fc.pickups);
  // A HOLE EMPTIES ITS OWN RUN-UP. The run kills everything the dice dealt
  // inside a pit's clearance, and a crossing takes the longest jump in the cast
  // instead of the ordinary reaction runway. Applied with the run's own
  // pitClearance rather than a number of this file's own, because a picture
  // that left those hazards standing would be showing lane the game empties.
  for (const p of pits) {
    const sp = m.speedAt(p.at);
    const clear = p.crossing
      ? Math.max(pitClearance(REACT_FLOOR, sp), worstAirtime() * sp * 1.15)
      : pitClearance(REACT_FLOOR, sp);
    for (const e of entities) {
      if (e.route || e.tunnel) continue;
      if (e.x + e.w > p.x - clear && e.x < p.x + p.w + clear) e.live = false;
    }
  }

  // The two pinned rewards. Neither stands at its own fraction: both spawn a
  // screen past it and then hunt for room, so this is where the run STARTS
  // looking, which is the honest answer a still can give.
  const app = m.L.appliance;
  entities.push(makePickup('appliance',
    Math.min(app.at * m.totalDist + W, wall - PICKUPS.appliance.w),
    app.high ? 52 : 44));
  if (m.L.rewindAt != null) {
    entities.push(makePickup('capRewind',
      Math.min(m.L.rewindAt * m.totalDist + W, wall - PICKUPS.capRewind.w), 34));
  }
  // The ring, planted by its pad exactly as spawnLoopSetPiece plants it — the
  // pad carries the road's colours because it is the one prop that has to look
  // like it was built into this cabinet rather than parked on it.
  if (m.loopAt != null) {
    const at = m.loopAt * m.totalDist;
    if (at + LOOP.r + 120 <= finishX) {
      const pad = makeObstacle('loopPad', at - OBSTACLES.loopPad.w / 2, {});
      pad.groundCol = cab.ground;
      pad.groundDark = cab.groundDark;
      entities.push(pad);
      for (const c of loopCoinSpots(at)) entities.push(makePickup('coin', c.x, c.alt));
    }
  }

  const live = entities.filter((e) => e.live !== false);
  live.sort((a, b) => a.x - b.x);

  return {
    cab, style, groundAt, topAt, routes, laneCuts, hillDepth, gaps,
    entities: live, totalDist: m.totalDist, band: bandFor(routes, live, groundAt, topAt),
  };
}

// HOW MUCH SKY AND HOW MUCH DIRT, in world y. The lane is not the whole level:
// a sky road stands eighty px over it and a tunnel runs fifty under, and a
// window that showed only the lane would crop the two things a road exists to
// be. Measured off the stage's own roads rather than fixed, so a cabinet with
// nothing but flat ground does not get a band of empty air.
function bandFor(routes, entities, groundAt, topAt) {
  let top = GROUND_Y - 84;
  // Without a tunnel there is nothing under the lane but its own apron — the
  // 38px the packs paint and no more — so the band stops just past it rather
  // than showing a strip of nothing under every stage.
  let bottom = GROUND_Y + 42;
  for (const r of routes) {
    if (r.kind === 'tunnel') {
      bottom = Math.max(bottom, groundAt(r.x + r.w / 2) + r.rise + 34);
      continue;
    }
    if (r.kind === 'island') { top = Math.min(top, r.topY - 22); continue; }
    // A fork reaches its peak somewhere inside its hold rather than at its
    // middle, so the span is sampled the way drawRoutes samples it.
    for (let k = 0; k <= 1.0001; k += 0.05) {
      top = Math.min(top, topAt(r.x + r.w * k, r) - 22);
    }
  }
  for (const e of entities) {
    // A loop's art is not its box: drawLoopRing paints a full ring of 2r above
    // the lane off a pad an entity-height tall, so the crown is cropped by any
    // band that only reads the box.
    if (e.def && e.def.isLoop) top = Math.min(top, GROUND_Y - LOOP.r * 2 - 12);
    top = Math.min(top, GROUND_Y - (e.alt || 0) - e.h - 10);
  }
  return { top: Math.round(top), bottom: Math.round(bottom), h: Math.round(bottom - top) };
}

// ------------------------------------------------------------------ paint ----

// One scratch canvas for every tile of every row, because bakedFill in the
// style packs re-bakes a full-canvas layer whenever the context it is handed
// changes size. One size, one bake.
let scratch = null;
function scratchFor(h) {
  if (!scratch) scratch = document.createElement('canvas');
  if (scratch.width !== TILE || scratch.height !== h) { scratch.width = TILE; scratch.height = h; }
  return scratch;
}

/**
 * One horizontal range of the stage, into `ctx` at (dx, dy), `scale` px per
 * world px. The whole renderer: a row of the map is one call, and so is a
 * single ribbon if the map ever wants to be one.
 */
export function paintRange(ctx, scene, { fromX, toX, scale, dx, dy }) {
  const { band } = scene;
  const s = scratchFor(band.h);
  const sctx = s.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  for (let x = fromX; x < toX; x += STEP) {
    const camX = x - OVERLAP;
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    // A flat sky, not pack.bg(). A background is drawn in SCREEN space against
    // a 480x270 frame and the run calls it OUTSIDE the world transform, so one
    // painted inside a tile's own window puts the horizon somewhere the game
    // never puts it. Everything below this line is world space and is exactly
    // what the run draws.
    sctx.fillStyle = (scene.cab.sky && scene.cab.sky[1]) || '#a8e0f8';
    sctx.fillRect(0, 0, TILE, band.h);
    sctx.translate(0, -band.top);
    sctx.lineJoin = 'round';
    sctx.lineCap = 'round';

    const { cab, style, gaps, routes, laneCuts, hillDepth, groundAt, topAt } = scene;
    if (style.ground) style.ground(sctx, camX, cab, gaps, laneCuts, 0);
    // The second pass: holes that name their own material — a crossing's teeth
    // — which the packs never draw because three of the nine lay their own
    // ground and never call this at all.
    drawPitFills(sctx, camX, cab, gaps, 0, true, null);
    drawTerrain(sctx, camX, cab, gaps, GROUND_Y, TILE, laneCuts);
    // THE EARTH IS ONLY PAINTED WHERE A ROAD GOES UNDER IT, which is the run's
    // own condition (RunState.drawFrame) and not a saving. drawEarth knows
    // nothing about holes: it lays soil from the terrain line to the bottom of
    // the view across the whole width, so on a stage with no tunnel it fills
    // every pit and crossing back in — which is exactly what this map did until
    // the lane's own 38px apron was allowed to be the whole story.
    if (hillDepth > 0) drawSubsoil(sctx, cab, TILE, band.bottom, camX, laneCuts, hillDepth);
    if (routes.length) {
      drawRoutes(sctx, camX, cab, routes, topAt, TILE, {
        groundAt, bottomY: band.bottom, hillDepth,
      });
    }
    // Everything touching this tile, including the halves of whatever straddles
    // its edges: the crop lands mid-entity and the two halves meet exactly,
    // because each tile is blitted at its own world offset.
    for (const e of scene.entities) {
      if (e.x + e.w < camX || e.x > camX + TILE) continue;
      drawWorldEntity(sctx, e, camX, 0, style, { reducedMotion: true });
    }

    const cropW = Math.min(STEP, toX - x);
    ctx.drawImage(s, OVERLAP, 0, cropW, band.h,
      dx + (x - fromX) * scale, dy, cropW * scale, band.h * scale);
  }
}

/**
 * The stage, wrapped: rows as wide as the canvas, as many as the stage needs.
 * Sizes the canvas, paints it, and hands back what each row covers so the page
 * can label them. `scale` is px per world px — 0.5 is the default because it is
 * the coarsest scale at which a crate is still a crate.
 */
export function paintMap(canvas, scene, { scale = 0.5, width, dpr = 2, gap = 6 } = {}) {
  const { band, totalDist } = scene;
  const perRow = Math.max(TILE, Math.floor(width / scale));
  const rowH = Math.round(band.h * scale);
  const rows = [];
  for (let x = 0; x < totalDist; x += perRow) {
    rows.push({ fromX: x, toX: Math.min(totalDist, x + perRow), top: rows.length * (rowH + gap) });
  }
  const h = rows.length * (rowH + gap) - gap;
  // A long stage at a close scale is a tall canvas, and a tall canvas at device
  // resolution is tens of megabytes of backing store. Density gives way before
  // the map does.
  dpr = Math.max(1, Math.min(dpr, 8000 / h));

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, h);

  for (const row of rows) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, row.top, (row.toX - row.fromX) * scale, rowH);
    ctx.clip();
    // A painter that throws costs its own row and nothing else. The gallery
    // does the same per tile, and for the same reason: half a map is more use
    // than a stack trace.
    try {
      paintRange(ctx, scene, { fromX: row.fromX, toX: row.toX, scale, dx: 0, dy: row.top });
    } catch (err) {
      row.error = err.message;
    }
    ctx.restore();
  }
  return { rows, rowH, height: h, perRow };
}
