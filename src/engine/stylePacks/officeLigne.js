// Corporate Kombat's production adapter. The painter uses authored 2x scene
// pixels; this boundary reconciles them with the run's independent bg/world passes.
import { W, H } from '../renderer.js';
import { GROUND_Y, screenYFor } from '../camera.js';
import { officeFrame, OFFICE_FLOORS, OFFICE_ZOOM, WALL_BASE, FACTORS } from './officeClimb.js';
import { STYLE, officeWarmJobs as warm, officeCacheStats } from './officeLigne/index.js';
import { PAL } from './officeLigne/line.js';
import { slab } from './officeLigne/room.js';
import { apronRuns } from './groundRuns.js';
import { OFFICE_CORRIDORS, OFFICE_FURNITURE_BASE, officeLandmarks, officeFounderPlan } from './officeLigne/progression.js';

export const OFFICE_FRONT_CLEARANCE = 8;
export const OFFICE_HELI_PASS = [0.4, 0.5];
export const OFFICE_OUTSIDE_FOLLOW = 0.3;
export const OFFICE_CEILING_SCREEN_Y = 100;
export const OFFICE_COVERAGE_MARGIN = 64;
export const officeFloorFor = (stageIndex = 1) => ['lobby', 'open', 'exec'][Math.max(0, Math.min(2, Math.trunc(Number(stageIndex) || 1) - 1))];
export const officeWarmJobs = (stageIndex = 1) => warm(officeFloorFor(stageIndex));
export { officeCacheStats };

// Geometry-only contract, usable by the run and by the production gallery.
export function officeCameraFrame(bc = {}, width = W, height = H) {
  const zoom = Number.isFinite(bc.worldZoom) ? bc.worldZoom : OFFICE_ZOOM;
  const pan = Number.isFinite(bc.worldPan) ? bc.worldPan : 0;
  const floorY = Number.isFinite(bc.worldFloorY) ? bc.worldFloorY : GROUND_Y;
  const xOffset = Number(bc.worldXOffset) || 0;
  const scale = zoom / OFFICE_ZOOM;
  const laneY = screenYFor(GROUND_Y, zoom, pan, floorY);
  const top = GROUND_Y - laneY / scale;
  return {
    scale, laneY, xOffset, top, height,
    coverage: { left: -xOffset / scale - OFFICE_COVERAGE_MARGIN,
      right: (width - xOffset) / scale + OFFICE_COVERAGE_MARGIN },
    bottom: GROUND_Y + (height - laneY) / scale,
  };
}

function enterRoom(ctx, camera) {
  ctx.translate(camera.xOffset, camera.laneY);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(0, -GROUND_Y);
}

function gapPath(ctx, frame, gaps, bottom) {
  for (const gap of gaps) {
    const a = (gap.x - frame.camX) * OFFICE_ZOOM;
    const b = a + gap.w * OFFICE_ZOOM;
    const backA = 240 + (a - 240) * FACTORS.wall;
    const backB = 240 + (b - 240) * FACTORS.wall;
    ctx.moveTo(backA, WALL_BASE);
    ctx.lineTo(backB, WALL_BASE);
    ctx.lineTo(b, GROUND_Y);
    ctx.lineTo(b, bottom);
    ctx.lineTo(a, bottom);
    ctx.lineTo(a, GROUND_Y);
    ctx.closePath();
  }
}

export function officePack(settings = {}) {
  let floor = officeFloorFor(settings.stageIndex);
  // Which of a lift bank's two doors stands open: a fresh draw each run (the gallery keeps one)
  const liftSeed = settings.gallery === true ? 0 : Math.random();
  let frontFrame = null;
  let frontMatrix = null;
  let frontGaps = [];
  return {
    name: 'office', bgPan: 1,
    get lightBg() { return floor !== 'exec'; },
    bg(ctx, t, camX, cab, totalDist, scene = null, bgShift = 0, bc = null) {
      const facts = bc || {};
      floor = officeFloorFor(facts.stageIndex ?? scene?.stageIndex ?? settings.stageIndex);
      const camera = officeCameraFrame(facts);
      const frame = officeFrame(floor, camX, t, camera.coverage, OFFICE_CORRIDORS[floor]);
      frame.landmarks = officeLandmarks(floor, camX, totalDist);
      frame.founderPlan = officeFounderPlan(floor, totalDist);
      frame.liftSeed = liftSeed;
      // The Gravity Grid's Martian rides the lobby lift once the player has met the Martians
      // (run.js sets it: Gravity Grid level 3 played, or any dev build); the gallery always shows him.
      frame.liftMartian = settings.gallery === true || settings.liftMartian === true;
      // Floor 88's helicopter is a single fly-past part-way along the stage, not a fixture.
      // Floor 23's blimp drifts through complete passes, with no progress cutoff.
      const heli = OFFICE_CORRIDORS.exec.outside.flyer;
      if (floor === 'exec' && heli) {
        const pass = Number.isFinite(totalDist) && totalDist > 0
          ? (camX - totalDist * OFFICE_HELI_PASS[0]) / (totalDist * (OFFICE_HELI_PASS[1] - OFFICE_HELI_PASS[0])) : -1;
        if (pass < 0 || pass > 1) frame.outside.flyer = null;
        else {
          const { left, right } = camera.coverage;
          frame.outside.flyer = { kind: heli.kind, label: '', slogan: heli.slogan, dir: 1,
            x: left - 90 + pass * (right - left + 180), y: heli.y + Math.sin(t * 0.7) * 2, phase: (t * 9) % 1 };
        }
      }
      frame.midBase = OFFICE_FURNITURE_BASE;
      frame.roomTop = camera.top - OFFICE_COVERAGE_MARGIN;
      // Pulled out, the room grows taller rather than the ceiling: the ceiling band keeps the
      // screen height it has at the resting zoom (portrait: a fixed band under the HUD).
      {
        const rest = officeCameraFrame({ ...facts, worldZoom: OFFICE_ZOOM, worldPan: 0 });
        const band = facts.portrait ? OFFICE_CEILING_SCREEN_Y : (OFFICE_FLOORS[floor].ceilingY - rest.top) * rest.scale;
        frame.ceilingY = Math.min(frame.ceilingY, camera.top + band / camera.scale);
        // the windows grow with the room, their head shrinking to the trim's depth so the extra
        // height is sky rather than a blank band
        const def = OFFICE_CORRIDORS[floor], raised = def.ceilingY - frame.ceilingY;
        frame.glass.top = frame.ceilingY + Math.max(7, def.glass.top - def.ceilingY - raised);
      }
      frontGaps = (facts.roadGaps || []).map(g => ({ x: g.x, w: g.w }));
      ctx.save();
      // Undo only the shared background framing, retaining the renderer/mirror
      // transform, then apply the room's lane-aligned scene transform.
      ctx.translate(-(Number(facts.backgroundXOffset) || 0), 0);
      const bgZoom = Number(facts.backgroundZoom) || 1;
      ctx.translate(W / 2, GROUND_Y);
      ctx.scale(1 / bgZoom, 1 / bgZoom);
      ctx.translate(-W / 2, -GROUND_Y);
      ctx.translate(0, -(Number(facts.frameShiftY) || 0) - bgShift);
      enterRoom(ctx, camera);
      frontMatrix = ctx.getTransform?.();
      const previousCoverage = ctx.__officeCoverage;
      ctx.__officeCoverage = camera.coverage;
      const palette = PAL[floor];
      ctx.fillStyle = palette.ceil;
      ctx.fillRect(camera.coverage.left, frame.roomTop, camera.coverage.right - camera.coverage.left, camera.bottom - frame.roomTop + 8);
      ctx.fillStyle = palette.ink;
      ctx.beginPath();
      gapPath(ctx, frame, frontGaps, camera.bottom + 8);
      ctx.fill();
      ctx.save();
      if (frontGaps.length) {
        ctx.beginPath();
        ctx.rect(camera.coverage.left, frame.roomTop, camera.coverage.right - camera.coverage.left, camera.bottom - frame.roomTop + 8);
        gapPath(ctx, frame, frontGaps, camera.bottom + 8);
        ctx.clip('evenodd');
      }
      // The glass opening follows the room; the distant view moves less.
      const nominalLane = GROUND_Y + (Number(facts.frameShiftY) || 0);
      STYLE.paint(ctx, frame, { production: true, keepFloors: settings.gallery === true, slab: false,
        outsideShiftY: -(camera.laneY - nominalLane) * (1 - OFFICE_OUTSIDE_FOLLOW) / camera.scale });
      ctx.restore();
      ctx.__officeCoverage = previousCoverage;
      ctx.restore();
      frontFrame = frame;
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null, worldContext = null, bodyBottomY = H) {
      const drawW = Math.max(viewW, portraitViewW || 0);
      const bottom = Math.max(GROUND_Y + 20, bodyBottomY);
      ctx.save();
      ctx.beginPath();
      for (const [a, b] of apronRuns(camX, obstacles, overhangs, drawW)) ctx.rect(a, GROUND_Y, b - a, bottom - GROUND_Y);
      ctx.clip();
      ctx.fillStyle = PAL[floor].slab;
      ctx.fillRect(0, GROUND_Y, drawW, bottom - GROUND_Y);
      // The slab's authored detail is twice its world size, just like the room.
      ctx.translate(0, GROUND_Y);
      ctx.scale(1 / OFFICE_ZOOM, 1 / OFFICE_ZOOM);
      ctx.translate(0, -GROUND_Y);
      const frame = officeFrame(floor, camX, frontFrame?.t ?? t, { left: 0, right: drawW * OFFICE_ZOOM });
      slab(ctx, frame, PAL[floor]);
      ctx.restore();
    },
    post(ctx) {
      if (!frontFrame || !frontMatrix) return;
      ctx.save();
      const m = frontMatrix;
      ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
      ctx.beginPath();
      ctx.rect(frontFrame.coverage.left, GROUND_Y + OFFICE_FRONT_CLEARANCE,
        frontFrame.coverage.right - frontFrame.coverage.left, H * OFFICE_ZOOM);
      ctx.clip();
      const front = frontFrame.front.filter(it => it.kind !== 'pillar' && !frontGaps.some(g => {
        const a = (g.x - frontFrame.camX) * OFFICE_ZOOM;
        return it.x + 35 > a && it.x - 35 < a + g.w * OFFICE_ZOOM;
      }));
      STYLE.paintFront(ctx, { ...frontFrame, front });
      ctx.restore();
    },
  };
}
