// GRAVITY GRID's look as an ordinary floor-only style pack, for THE SURGE's cycle.
//
// The gravity levels never use a style pack: GravityRunState paints its corridor
// itself (dev/space-look-candidates.js drawSpaceRoom, look P5). So the Surge's
// 'gravity' slot used to fall through to a copy of the LCD pack — Rhythm's city
// twice over, and nothing of the station (Peter, 13 Oct 2026: "some look like
// earlier prototypes (space and crypt at least)").
//
// This paints the same room — windows, the jade world outside, its director's
// passers-by — behind the Surge's ordinary lane. No gates and no ceiling mechanics
// (the plan's rule: "do not inject two-surface mechanics … into Surge"). The room is
// drawn at the gravity run's own framing in the backdrop, everything above the
// floor; the floor rail itself is drawn in ground() in world space, only where the
// lane is solid, so a Surge pit opens onto the void under the deck rather than a
// rail painted across the hole.
import { GROUND_Y, applyWorld } from '../camera.js';
import { W, H } from '../renderer.js';
import { solidRuns } from './groundRuns.js';
import { SPACE_LOOKS, drawSpaceRoom } from '../../dev/space-look-candidates.js';

const LOOK_ID = 'plateau-occasional';
const ROOM_ZOOM = 1.6; // the gravity run's landscape framing
const VOID = '#04100c';

function coverage(ctx) {
  const c = ctx.__mashBackgroundCoverage;
  return c && Number.isFinite(c.left) ? c : { left: 0, width: W };
}

export function spaceStationPack() {
  const look = SPACE_LOOKS[LOOK_ID];
  return {
    name: 'gravity',
    dark: true,
    bg(ctx, t, camX, cab, totalDist, scene = null, bgShift = 0, bc = null) {
      const cov = coverage(ctx);
      ctx.fillStyle = look.bg;
      ctx.fillRect(cov.left - 20, -400, cov.width + 40, H + 800);
      ctx.save();
      ctx.translate(cov.left, 0);
      applyWorld(ctx, ROOM_ZOOM, 0);
      ctx.translate(0, GROUND_Y);
      const view = cov.width / ROOM_ZOOM;
      // Above the deck only: the rail is ground()'s, in world space.
      ctx.beginPath(); ctx.rect(-40, -600, view + 80, 600); ctx.clip();
      drawSpaceRoom(ctx, look, {
        cam: camX + cov.left / ROOM_ZOOM, view: view + 60, top: -600, bottom: 0, time: t, gates: [],
        progress: Number.isFinite(bc?.progress) ? bc.progress : null,
        length: Number.isFinite(totalDist) && totalDist > 0 ? totalDist : undefined,
      });
      ctx.restore();
      // Under the deck: the void a pit opens onto.
      ctx.fillStyle = VOID;
      ctx.fillRect(cov.left - 20, GROUND_Y, cov.width + 40, H + 400);
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W, portraitViewW = null) {
      const drawW = Number.isFinite(portraitViewW) ? portraitViewW : viewW;
      const runs = solidRuns(camX, obstacles, drawW);
      if (!runs.length) return;
      ctx.save();
      ctx.beginPath();
      for (const [a, b] of runs) ctx.rect(a, GROUND_Y - 1, b - a, 400);
      ctx.clip();
      ctx.translate(0, GROUND_Y);
      drawSpaceRoom(ctx, look, { cam: camX, view: drawW + 60, top: -1, bottom: 400, time: t, gates: [] });
      ctx.restore();
    },
    post() {},
  };
}
