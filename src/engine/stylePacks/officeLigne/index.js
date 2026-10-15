import { paintOfficeCleaners } from './cleanerPlacement.js';
// Corporate Kombat: LIGNE ’89 index painter. Shared with the preserved bake-off.
import { OFFICE_FLOORS, WALL_BASE, FACTORS, MID_BASE } from '../officeClimb.js';
import { PAL, bakeStrip, drawStrip, W, box, line } from './line.js';
import { paintFar, paintNear, cloudShape, sky, stars, sun, clouds, cityLights, towerLights, vehicle, flyer, cradle } from './outside.js';
import { paintWall, upperWall, liftDoors, clockHands, revolvingDoor, signNeon, floorLights, noonWall, sunShafts, noonShafts, glints } from './wall.js';
import { paintMid, ceiling, ceilingLights, floorPlane, slab, midActors, midDevices, lampSheen, lights } from './room.js';
import { OFFICE_ZOOM as ZOOM } from '../officeClimb.js';
import { paintFront } from './front.js';
import { OFFICE_CORRIDORS, officeFurnitureCuts, paintOfficeLandmarks, paintOfficeWallSections, officeLiftSpans, warmOfficeWallSections } from './progression.js';
import { paintOfficeArtwork, warmOfficeArtwork, officeArtworkBytes } from './artwork.js';
import { officeMonthBoard, paintMonthBoardOnWall, paintCoolerZombie, zombieFurnitureCuts, zombieWallClear } from './zombies.js';

const CACHE = new Map();
const PRODUCTION_CACHE = new Map();

// A bake-off's extra people (src/dev), painted live into the room: (ctx, f, P, pass), where pass
// is 'wall' (on the back wall, behind the furniture), 'desk' (in the cubicles, behind their
// partitions) or 'front' (standing in front of the furniture row). Null in the game.
let MID_EXTRA = null;
export function setOfficeMidExtra(fn) { const was = MID_EXTRA; MID_EXTRA = fn || null; return was; }

function bakeFor(floor, k, cache = CACHE) {
  const key = `${floor}@${k}`;
  let B = cache.get(key);
  if (B) return B;
  const F = cache === PRODUCTION_CACHE ? OFFICE_CORRIDORS[floor] : OFFICE_FLOORS[floor];
  const P = PAL[floor];
  const G = F.glass;
  const gy0 = Math.floor(G.top / 2) * 2 - 2;
  const gy1 = Math.ceil(G.bottom / 2) * 2 + 2;
  const hasCubicles = F.mid.items.some((it) => it.kind === 'cubicles');
  B = {
    far: bakeStrip(1400, gy0, gy1, k, (g, u0, u1) => paintFar(g, F, P, u0, u1)),
    near: bakeStrip(F.outside.nearPeriod ?? 1200, gy0, gy1, k, (g, u0, u1) => paintNear(g, F, P, u0, u1)),
    // Thin wall outlines need finer sampling than the furniture, especially
    // when portrait zoom magnifies them during fractional camera movement.
    wall: bakeStrip(F.wall.period, F.ceilingY, WALL_BASE + 2,
      cache === PRODUCTION_CACHE ? OFFICE_WALL_BAKE_SCALE : k,
      (g, u0, u1) => paintWall(g, F, P, u0, u1), true),
    midBack: floor === 'lobby' ? null : bakeStrip(F.mid.period, 132, 216, k, (g, u0, u1) => paintMid(g, F, P, u0, u1, 'back', 'other')),
    midFront: bakeStrip(F.mid.period, 132, 216, k, (g, u0, u1) => paintMid(g, F, P, u0, u1, 'front', 'other')),
    midCubiclesBack: hasCubicles ? bakeStrip(F.mid.period, 132, 216, k, (g, u0, u1) => paintMid(g, F, P, u0, u1, 'back', 'cubicles')) : null,
    midCubiclesFront: hasCubicles ? bakeStrip(F.mid.period, 132, 216, k, (g, u0, u1) => paintMid(g, F, P, u0, u1, 'front', 'cubicles')) : null,
    clouds: F.outside.clouds.map((c, i) => cloudShape(c, i, floor)),
  };
  cache.set(key, B);
  return B;
}

// The towers above the resting windows, prepared during warmup so the first
// camera pull-back does not allocate and paint city textures during play.
function upperCity(B, F, P) {
  if (B.up !== undefined) return B.up;
  const top = Math.min(...F.outside.far.map((b) => b.top), ...F.outside.near.map((b) => b.top)) - 50;
  const G = F.glass;
  if (top >= G.top - 4) return (B.up = null);
  const y0 = Math.floor(top / 2) * 2, y1 = Math.floor(G.top / 2) * 2 + 2;
  B.up = {
    far: bakeStrip(1400, y0, y1, 1, (g, u0, u1) => paintFar(g, F, P, u0, u1)),
    near: bakeStrip(F.outside.nearPeriod ?? 1200, y0, y1, 1, (g, u0, u1) => paintNear(g, F, P, u0, u1)),
  };
  return B.up;
}

function scaleOf(ctx) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const k = m ? Math.hypot(m.a, m.b) : 1;
  return Math.min(4, Math.max(1, Math.round(k * 4) / 4));
}

// Production uses fixed detail scales, independent of camera dolly and
// renderer rungs: 2x scenery, 4x fine wall lines. Keep only the active floor warm.
export const OFFICE_BAKE_SCALE = 2;
export const OFFICE_WALL_BAKE_SCALE = 4;
// The founder's pictures are painted once and drawn as images; at 2x they were visibly soft
// and stepped on a phone, where the room is drawn at 3x-4x. A handful per floor, so 4x is cheap.
export const OFFICE_ART_BAKE_SCALE = 4;
export function officeWarmJobs(floor) {
  return [() => {
    const keep = `${floor}@${OFFICE_BAKE_SCALE}`;
    for (const key of PRODUCTION_CACHE.keys()) if (key !== keep) PRODUCTION_CACHE.delete(key);
    const B = bakeFor(floor, OFFICE_BAKE_SCALE, PRODUCTION_CACHE);
    upperCity(B, OFFICE_CORRIDORS[floor], PAL[floor]);
    warmOfficeArtwork(floor, OFFICE_ART_BAKE_SCALE);
  }];
}
export function officeCacheStats() {
  let bytes = 0;
  for (const b of PRODUCTION_CACHE.values()) for (const strip of [b.far, b.near, b.wall, b.midBack, b.midFront, b.midCubiclesBack, b.midCubiclesFront, b.up?.far, b.up?.near]) {
    if (strip?.image) bytes += strip.image.width * strip.image.height * 4;
    for (const tile of strip?.tiles || []) bytes += tile.c.width * tile.c.height * 4;
  }
  return { entries: PRODUCTION_CACHE.size, residentBytes: bytes + officeArtworkBytes() };
}

function upperRoom(ctx, f, P, part = 'wall') {
  // the production corridor's own definition: its windows sit lower than the bake-off's
  const original = OFFICE_CORRIDORS[f.floor];
  if (f.ceilingY >= original.ceilingY) return;
  const top = f.ceilingY;
  // the trim along the top goes on last, over the named places' wall sections, so it runs unbroken
  if (part === 'trim') {
    box(ctx, f.coverage.left - 2, top, f.W - f.coverage.left + 4, 7, P.ceilDk, P.ink, 0.6);
    line(ctx, f.coverage.left - 2, top + 5, f.W + 2, top + 5, f.floor === 'exec' ? P.neonB : P.chrome, 1);
    return;
  }
  const bottom = original.glass.top;
  // A taller room, not taller furniture: the native cornice becomes a transom.
  for (const bay of f.wall.bays) {
    const x = bay.x0;
    const w = bay.x1 - bay.x0;
    if (bay.type === 'wall') {
      box(ctx, x, top, w, bottom - top, P.wall || P.wallShade || P.ceil);
      upperWall(ctx, f.floor, P, x, x + w, top + 7, original.ceilingY, x + f.wall.shift, f.glass.top, bottom);
    }
    else if (bay.type === 'glass') {
      // the window's own mullions carried up, at the same pitch as below, a frame along its head
      // and a transom bar every 90
      const gt = f.glass.top, n = Math.max(1, Math.round(w / original.glass.mullion)), pitch = w / n;
      for (let i = 0; i <= n; i++) box(ctx, x + i * pitch - 1, gt, 2, bottom - gt, P.frame, P.ink, 0.3);
      for (let y = bottom - 90; y > gt + 8; y -= 90) box(ctx, x, y - 0.8, w, 1.6, P.frame, P.ink, 0.3);
      box(ctx, x, gt, w, 1.6, P.frame, P.ink, 0.3);
    }
  }
  for (const c of f.wall.columns) box(ctx, c.x, top, c.w, bottom - top, P.column || P.ceilDk, P.ink, 0.6);
}

export const STYLE = {
  id: 'ligne89lit',
  name: 'LIGNE ’89 — lit',
  note: 'LIGNE ’89 with the lights on, all of it in flat shapes: neon glowing in stepped halo rings and buzzing, the '
    + 'EGGCORP sign washing its wall pink and streaking a polished floor that mirrors the columns, lifts and furniture '
    + 'under clean horizontal cuts. The lobby gets a crisp morning of sun shafts and long flat shadows, floor 23 noon '
    + 'through the vertical blinds in striped shafts. Floor 88 is a hot pink-to-violet dusk with a banded sun cut by '
    + 'bars, rim-lit towers whose windows and neon come on and go off, and a deep violet room lit by pink lamp wedges '
    + 'and pools, a glowing trophy case and a teal cornice tube.',
  paint(ctx, f, options = {}) {
    ctx.save();
    // The office is detailed line art. Filter its cached layers at fractional
    // camera positions instead of inheriting the game's pixel-art sampling.
    // Plain bilinear, not 'high' (or 'medium'): the layers are baked at 2x-4x, close to
    // the size they are drawn, so mipmapped resampling buys nothing visible, and it cost
    // ~20 ms a frame on the full-width wall strip (38 -> 15 ms a frame on a phone, 12 Oct).
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    const k = options.production ? OFFICE_BAKE_SCALE : scaleOf(ctx);
    const F = options.production ? OFFICE_CORRIDORS[f.floor] : OFFICE_FLOORS[f.floor];
    const P = PAL[f.floor];
    const cache = options.production ? PRODUCTION_CACHE : CACHE;
    if (options.production && !options.keepFloors) {
      for (const key of cache.keys()) if (key !== `${f.floor}@${k}`) cache.delete(key);
    }
    const B = bakeFor(f.floor, k, cache);
    // floor 23's zombies (zombies.js): the clerk's EMPLOYEE OF THE MONTH bay, and the wall they keep
    // clear of prints
    f.monthBoard = options.production ? officeMonthBoard(f) : null;
    f.wallClear = options.production ? zombieWallClear(f) : null;
    if(options.production)warmOfficeWallSections(f);
    const farShift = f.camX * FACTORS.cityFar * ZOOM;
    const nearShift = f.camX * (F.outside.nearFactor ?? FACTORS.cityNear) * ZOOM;
    // The furniture row may stand further back up the floor than the card's MID_BASE.
    const drop = MID_BASE - (f.midBase ?? MID_BASE);

    // 1. outside, seen only through the glass; at dusk the towers rim-lit, their windows and
    // neon coming on and going off
    ctx.save();
    ctx.beginPath();
    for (const b of f.wall.bays) if (b.type === 'glass') ctx.rect(b.x0 - 1, f.glass.top - 1, b.x1 - b.x0 + 2, f.glass.bottom - f.glass.top + 2);
    ctx.clip();
    ctx.save();
    if (options.outsideShiftY) ctx.translate(0, options.outsideShiftY);
    sky(ctx, f, P);
    stars(ctx, f, P);
    sun(ctx, f, P);
    clouds(ctx, f, P, B.clouds);
    const up = f.glass.top < F.glass.top - 1 ? upperCity(B, F, P) : null;
    if (up) drawStrip(ctx, up.far, farShift);
    drawStrip(ctx, B.far, farShift);
    cityLights(ctx, f, P);
    if (up) drawStrip(ctx, up.near, nearShift);
    drawStrip(ctx, B.near, nearShift);
    if (f.floor === 'exec') {
      ctx.save();
      towerLights(ctx, f, P);
      ctx.restore();
    }
    for (const c of f.outside.cars) vehicle(ctx, c, P);
    flyer(ctx, f, P);
    ctx.restore();
    ctx.save();
    if (options.windowPreview) options.windowPreview(ctx, f, P);
    else if (options.production) paintOfficeCleaners(ctx, f);
    else cradle(ctx, f, P);
    ctx.restore();
    ctx.restore();

    // 2. the wall, then what moves and glows on it
    upperRoom(ctx, f, P);
    drawStrip(ctx, B.wall, f.wall.shift);
    ctx.save();
    // windows cleared to plain wall for the named places, then what hangs on the wall
    if (f.landmarks) paintOfficeWallSections(ctx, f);
    upperRoom(ctx, f, P, 'trim');
    if (options.artworkPreview) options.artworkPreview(ctx, f, P);
    else if(options.production)paintOfficeArtwork(ctx,f,P,OFFICE_ART_BAKE_SCALE);
    if (f.monthBoard) paintMonthBoardOnWall(ctx, f, P);
    liftDoors(ctx, f, P);
    clockHands(ctx, f, P);
    revolvingDoor(ctx, f, P);
    signNeon(ctx, f, P);
    ctx.restore();

    // Corridor furniture is left out wherever it would cross a named place (step 5).
    const cuts = [...(f.landmarks?.length ? officeFurnitureCuts(f, f.landmarks) : []),
      ...(options.production ? zombieFurnitureCuts(f) : [])].sort((a, b) => a[0] - b[0]);
    // Daylight only comes in through windows that are still windows: a wall section has
    // replaced the glass it stands on.
    const walled = (f.landmarks || []).filter((l) => l.section && !l.section.glass).map((l) => {
      const span = l.section.u1 - l.section.u0, a = l.x + l.w / 2 - span / 2;
      return [a, a + span];
    });
    const fin = f.founderPlan?.finish;
    if (fin) walled.push([fin.u0 - f.wall.shift, fin.u1 - f.wall.shift]);
    const lit = walled.length ? { ...f, wall: { ...f.wall,
      bays: f.wall.bays.filter((b) => b.type !== 'glass' || !walled.some(([a, c]) => b.x1 > a + 1 && b.x0 < c - 1)) } } : f;
    const clipCuts = () => {
      if (!cuts.length) return;
      ctx.beginPath();
      let left = f.coverage.left - 64;
      for (const [a, b] of cuts) {
        if (a > left) ctx.rect(left, -40, a - left, 320);
        left = Math.max(left, b);
      }
      if (left < f.W + 64) ctx.rect(left, -40, f.W + 64 - left, 320);
      ctx.clip();
    };

    // 3. ceiling; 4. floor, its reflections and the light lying on it, the slab
    f.noLights = officeLiftSpans(f);
    ceiling(ctx, f, P);
    floorPlane(ctx, lit, P, 0);
    if (f.floor === 'lobby') {
      // polished terrazzo: the wall and the furniture mirrored in flat, darker shapes, cut
      // off by clean horizontal streaks
      ctx.save();
      ctx.beginPath();
      for (const [y, h] of [[204.4, 4.4], [210, 3.2], [214.4, 2], [217.8, 1.1], [220.6, 0.6]]) ctx.rect(-2, y, f.W + 4, h);
      ctx.clip();
      ctx.globalAlpha = 0.2;
      ctx.translate(0, 2 * WALL_BASE);
      ctx.scale(1, -1);
      drawStrip(ctx, B.wall, f.wall.shift);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      for (const [y, h] of [[213.4, 3.6], [218.2, 2.4], [222, 1.4], [225, 0.7]]) ctx.rect(-2, y, f.W + 4, h);
      ctx.clip();
      clipCuts();
      ctx.globalAlpha = 0.15;
      ctx.translate(0, -drop);
      ctx.translate(0, 2 * MID_BASE);
      ctx.scale(1, -1);
      drawStrip(ctx, B.midFront, f.mid.shift);
      ctx.restore();
    }
    ctx.save();
    floorLights(ctx, f, P);
    if (f.floor === 'open') noonWall(ctx, lit);
    ctx.restore();
    if (options.slab !== false) slab(ctx, f, P);
    // floor 88's corridor downlights, behind every room and lift lobby
    ctx.save();
    ceilingLights(ctx, f);
    ctx.restore();

    // Wall-side landmarks sit behind the corridor furniture. The canteen is
    // readable as a room at the back of the hallway, with desks and people
    // remaining in the foreground.
    if (f.landmarks?.some(l => l.kind === 'canteen')) {
      ctx.save();
      paintOfficeLandmarks(ctx, f, f.landmarks, 'back');
      ctx.restore();
    }

    // Wall sections and rooms. Furniture never crosses them (officeFurnitureCuts).
    if (f.landmarks) {
      ctx.save();
      paintOfficeLandmarks(ctx, f, f.landmarks);
      ctx.restore();
    }
    if (MID_EXTRA) { ctx.save(); MID_EXTRA(ctx, f, P, 'wall'); ctx.restore(); }

    // Shafts of daylight fall across the room behind the furniture and the workers, which
    // stand in them rather than under a glaze.
    if (f.floor === 'lobby' || f.floor === 'open') {
      ctx.save();
      if (f.floor === 'lobby') sunShafts(ctx, lit); else noonShafts(ctx, lit);
      ctx.restore();
    } else {
      ctx.save();
      lights(ctx, f, P, 'glow');
      ctx.restore();
    }

    // 5. Corridor furniture. Every whole piece that would ever be seen across a room, lift
    // or wall section is left out, fixed in the furniture's own coordinates, so nothing
    // slides behind them and nothing is sliced or pops (officeFurnitureCuts).
    const cubicleFrame = { ...f, mid: { ...f.mid, items: f.mid.items.filter((it) => it.kind === 'cubicles') } };
    // One clip for the whole furniture row: a many-rect clip is costly to set up.
    ctx.save();
    clipCuts();
    ctx.translate(0, -drop);
    const layer = (draw) => { ctx.save(); draw(); ctx.restore(); };
    if (B.midBack) drawStrip(ctx, B.midBack, f.mid.shift);
    if (B.midCubiclesBack) drawStrip(ctx, B.midCubiclesBack, f.mid.shift);
    layer(() => midActors(ctx, cubicleFrame, P));
    if (MID_EXTRA) layer(() => MID_EXTRA(ctx, f, P, 'desk'));
    drawStrip(ctx, B.midFront, f.mid.shift);
    if (B.midCubiclesFront) drawStrip(ctx, B.midCubiclesFront, f.mid.shift);
    layer(() => midDevices(ctx, f, P));
    if (MID_EXTRA) layer(() => MID_EXTRA(ctx, f, P, 'front'));
    if (f.floor === 'exec') layer(() => lampSheen(ctx, f));
    ctx.restore();
    // the zombie clerk at his cooler stands where furniture was cut away for him, so outside the cut
    if (options.production) { ctx.save(); ctx.translate(0, -drop); paintCoolerZombie(ctx, f, P); ctx.restore(); }
    if (f.floor !== 'exec') {
      ctx.save();
      lights(ctx, f, P);
      ctx.restore();
    }
    // Floor 88's pendant shades hang in front of all the scenery (the front pass is clipped to
    // the strip under the lane, so they are painted here, last).
    if (f.floor === 'exec') {
      ctx.save();
      lights(ctx, f, P, 'lamp');
      ctx.restore();
    }
    ctx.save();
    glints(ctx, f);
    ctx.restore();
    ctx.restore();
  },
  paintFront(ctx, f) {
    paintFront(ctx, f, PAL[f.floor]);
  },
};

export { CACHE, bakeFor, scaleOf };
