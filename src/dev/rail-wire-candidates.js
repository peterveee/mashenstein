// Gallery-only: THE LIVE WIRE, style bake-off (14 Oct 2026). Peter, of the wrong rail's
// wires: "prefer they not be joined like this... gaps.. can we try a few different
// styles of these in a bake off btw, with the thing holding them in place different
// and possibly alternate version of the live wire". Each tile is level 1's corridor
// at in-run size with three wires laid end to end as the run lays them (150 long at
// most, a 24 gap between), the hero on the floor for scale. PICKED C, tesla studs
// (14 Oct); the run draws it (sprites/gravity-encounters.js railStyle).
import { SPACE_LOOKS, drawSpaceRoom } from './space-look-candidates.js';
import { setRailStyle, drawGravityHazard } from '../sprites/gravity-encounters.js';
import { GROUND_Y, applyWorld, screenYFor } from '../engine/camera.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X } from '../game/player.js';

export const RAIL_WIRE_CANDIDATES = [
  { id: 'now', letter: 'NOW', name: 'purple zigzag, round nodes', note: 'As it plays, with the gap widened to 24 so neighbours no longer join.' },
  { id: 'insulator', letter: 'A', name: 'INSULATORS', note: 'Ceramic insulator stacks on stubby steel posts; the purple wire strung between their tops.' },
  { id: 'clamp', letter: 'B', name: 'CLAMPS, BLUE CURRENT', note: 'Slate clamp blocks bolted to the rail with a blinking amber lamp; the current electric blue.' },
  { id: 'tesla', letter: 'C', name: 'TESLA STUDS', note: 'Copper coil studs with glowing balls; between them a jagged white-blue arc that re-forms several times a second.' },
  { id: 'laser', letter: 'D', name: 'LASER TRIP', note: 'Hazard-taped emitter boxes and a red beam; the kinks are bright pulses running along it.' },
  { id: 'plasma', letter: 'E', name: 'PLASMA TUBE', note: 'A glass tube on saddle feet with a pink plasma band rolling inside it.' },
  { id: 'leak', letter: 'F', name: 'LEAKING PLASMA TUBE', note: 'E made dangerous: hot orange-white plasma, two cracks in the glass spitting sparks, sparks out of the open ends, hazard tape on the feet, and now and then the whole tube flares as if about to blow. (Added 14 Oct: E "doesn\'t scream keep off".)' },
];

const LOOK = SPACE_LOOKS['plateau-occasional'];
const Z = 1.6, LEN = 84 * 120;
export function drawRailWireTile(ctx, t, style) {
  setRailStyle(style);
  const view = 480 / Z, floor = screenYFor(GROUND_Y, Z), cam = 1800 + (t * 60) % 600;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, 480, 270); ctx.clip();
  ctx.fillStyle = LOOK.bg; ctx.fillRect(0, 0, 480, 270);
  applyWorld(ctx, Z, 0);
  ctx.save(); ctx.translate(0, GROUND_Y);
  drawSpaceRoom(ctx, LOOK, { cam, view: view + 60, top: -floor / Z - 20, bottom: (270 - floor) / Z + 20, time: t,
    gates: [], length: LEN, stage: 1 });
  ctx.restore();
  for (const [x, w] of [[96, 70], [190, 120], [334, 90]]) {
    drawGravityHazard(ctx, { type: 'railPulse', x: cam + x, w, h: 7, alt: 0, def: {} }, x, GROUND_Y, t);
  }
  drawToon(ctx, 'lorenzo', { kind: 'run', phase: t * 1.6 % 1, time: t, grounded: true, facing: 1 }, PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  setRailStyle('tesla');
}
