// Gallery-only GRAVITY GRID OBSTACLE concepts — ten things for the space
// station's floor and ceiling, drawn in the station's own flat-shaded hand.
//
// THE ASK (13 Oct 2026). Peter, after the six cabinet sheets of 12 Oct: "we did a
// bunch of fantastic obstacles yesterday for all levels. can we create a bunch of
// the gravity levels too and put them into the gallery/lab?"
//
// WHAT THE GRAVITY LEVELS DEAL (data/gravity-stages.js). Five types and nothing
// random — every hazard is authored:
//
//   * POP SPIKES — the field behind every gate, on the rail just left. The commonest
//     thing in all three levels, and the one hazard the mechanic is built round.
//   * the wooden X CRATE — level 1's first obstacle and level 3's shutter seal; a
//     western warehouse crate on a space station.
//   * MAG CARGO and the OXYGEN RACK — the two space props the playtest drew
//     (sprites/gravity.js), flat plates; the rack's white tanks also sit close to
//     the white silos the plateaus now stand outside the windows.
//   * the SERVICE LASER — the duck-under, a grey bar with a pink beam.
//
// Peter's rule from the office sheet: an obstacle must not be something already in
// that level's background — so no silo, dome, mast, rover, satellite, astronaut or
// shuttle here (space-life.js owns all of those outside the glass).
//
// THE HAND. The room is low-poly: faceted ridges and planets, each face its own flat
// shade; mint-chrome rails with amber lamps; dark slate panels. So: faceted bodies
// (lit face / mid face / shade face), a dark slate ink round each silhouette so it
// stands off the pale rails and the jade sky, amber for status lamps (the rails'
// own), and hot orange-red for whatever hurts. Jade is the sky's and never carries
// a read.
//
// BOTH RAILS. Everything here also runs on the ceiling, mirrored (draw.js reflects a
// gravityCeiling entity about the corridor), so steam that rises on the floor falls
// toward the floor on the ceiling — the station's gravity, not the camera's. Each
// lane tile shows the candidate on both rails.
//
// THE COORDINATES. As obstacle-bakeoff-kit.js: each painter fills its PAINTED
// ENVELOPE in world units with the ground at y = h, `t` quantised to its own frame
// ring. Porting is a 3/4 scale into sprites/gravity.js.
//
// Nothing here is registered in any gameplay registry.
import { SLOTS, placeCandidate, slotEnvelope, slotOf } from './obstacle-bakeoff-kit.js';
import { SPACE_LOOKS, drawSpaceRoom } from './space-look-candidates.js';
import { GRAVITY_LEVEL as L } from './gravity/model.js';
import { GROUND_Y, applyWorld, screenYFor } from '../engine/camera.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity, HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X } from '../game/player.js';

import { foilCrate, specimenCase, fuelCell, maintenanceBot, coolantRadiator, valveManifold,
  weldingDrone, looseToolkit, plasmaVents, magClamps } from '../sprites/gravityProps.js';
// The painters moved to sprites/gravityProps.js when all ten shipped (13 Oct 2026).

// ================================================================ the slots
// The gravity lane's own boxes (data/gravity-stages.js deals only these): the two
// space props carry their sizes from game/entities.js; crate and pop spikes are the
// shared slots.
const CARGO_SLOT = { box: [12, 11], tall: 1, name: 'CARGO', was: 'magCargo — 12x11, jump' };
const RACK_SLOT = { box: [13, 14], tall: 1.25, name: 'TALL RACK', was: 'oxygenRack — 13x14, jump, armoured' };
const LASER_SLOT = { ...SLOTS.low, name: 'DUCK UNDER', was: 'serviceLaser — 12x7 at alt 13, slide, armoured' };
const CRATE_SLOT = { ...SLOTS.stack, stack: false, name: 'CRATE', was: 'crate — 12x11, jump (single in these stages)' };
const SPIKE_SLOT = { ...SLOTS.floor, name: 'THE GATE FIELD', was: 'popSpikes — 15x7 bedded plate, behind every gate' };

// ================================================================ the lane
// One whole landscape frame at the run's framing (zoom 1.6, the playtest's
// ZOOM_NORMAL): the production look's room scrolling, no gates in shot, Lorenzo on
// the floor rail, and the thing on both rails — the floor ahead of him and the
// ceiling further on, mirrored as draw.js mirrors a gravityCeiling entity.
const LOOK = SPACE_LOOKS['plateau-occasional'];
const Z = 1.6, VIEW = 480 / Z, SCROLL = 120;
export const LANE_W = 480, LANE_H = 270;

function drawRoom(ctx, t, world, { hero = true } = {}) {
  const cam = 1500 + (t * SCROLL) % 6000;
  const floor = screenYFor(GROUND_Y, Z);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, LANE_W, LANE_H); ctx.clip();
  ctx.fillStyle = LOOK.bg; ctx.fillRect(0, 0, LANE_W, LANE_H);
  applyWorld(ctx, Z, 0);
  ctx.save(); ctx.translate(0, GROUND_Y);
  drawSpaceRoom(ctx, LOOK, { cam, view: VIEW + 60, top: -floor / Z - 20, bottom: (LANE_H - floor) / Z + 20, time: t, gates: [], length: L.length });
  ctx.restore();
  world(ctx, t);
  if (hero) drawToon(ctx, 'lorenzo', { kind: 'run', phase: t * 1.6 % 1, time: t, grounded: true, facing: 1 }, PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
}
const onCeiling = (ctx, fn) => {
  ctx.save(); ctx.translate(0, 2 * GROUND_Y - L.corridor); ctx.scale(1, -1); fn(); ctx.restore();
};
function labelsAt(ctx, xs, letters) {
  ctx.save();
  ctx.font = '700 5px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  const y = GROUND_Y - L.corridor / 2 + 2;
  xs.forEach((x, i) => {
    ctx.fillStyle = 'rgba(16,14,22,0.78)';
    ctx.fillRect(x - 4, y - 5, 8, 7);
    ctx.fillStyle = '#f6d33c';
    ctx.fillText(letters[i], x, y);
  });
  ctx.restore();
}

export const FLOOR_X = 132, CEIL_X = 222;
export function drawGravityCandidateLane(ctx, t, cand) {
  drawRoom(ctx, t, (c, tt) => {
    placeCandidate(c, cand, FLOOR_X, tt, 1);
    onCeiling(c, () => placeCandidate(c, cand, CEIL_X, tt, 1));
  });
}

const columns = (n) => {
  const left = 10, right = VIEW - 10, wcol = (right - left) / Math.max(n, 10);
  const x0 = (left + right) / 2 - (wcol * n) / 2;
  return Array.from({ length: n }, (_, i) => x0 + wcol * (i + 0.5));
};
const controlSets = new Map();
export function drawGravityControlLineup(ctx, t, types) {
  const key = types.join(',');
  if (!controlSets.has(key)) {
    const xs = columns(types.length);
    controlSets.set(key, { xs, list: types.flatMap((type, i) => {
      const w = makeObstacle(type, 0).w;
      const floor = makeObstacle(type, xs[i] - w / 2);
      const ceil = makeObstacle(type, xs[i] - w / 2);
      ceil.alt = L.corridor - ceil.alt - ceil.h; ceil.gravityCeiling = L.corridor;
      return [floor, ceil];
    }) });
  }
  drawRoom(ctx, t, (c, tt) => {
    for (const e of controlSets.get(key).list) drawWorldEntity(c, e, 0, tt, null);
  }, { hero: false });
}
export function drawGravityCandidateLineup(ctx, t, candidates) {
  const xs = columns(candidates.length);
  drawRoom(ctx, t, (c, tt) => {
    candidates.forEach((cand, i) => {
      const x = xs[i] - slotEnvelope(cand).bw / 2;
      placeCandidate(c, cand, x, tt, 1);
      onCeiling(c, () => placeCandidate(c, cand, x, tt, 1));
    });
    labelsAt(c, xs, candidates.map((cand) => cand.letter));
  }, { hero: false });
}

export function gravityCandidateCaption(cand) {
  const slot = slotOf(cand);
  const env = slotEnvelope(cand);
  return `${slot.name} · in place of ${slot.was} · art ${env.w}x${env.h}u over a ${env.bw}x${env.bh} box<br>${cand.note}`;
}

// ============================================================== the sheet
export const BAKEOFF = {
  cabinet: 'gravity',
  title: 'GRAVITY GRID — obstacles for the station (bake-off)',
  note: 'SHIPPED ALL TEN, 13 Oct 2026 ("replace all existing ones with the new ones... spread throughout"). '
    + 'The three gravity levels deal five things, all authored: the pop-spike field behind every gate (the commonest by far), '
    + 'a wooden X crate, the playtest\'s mag cargo and oxygen rack, and the service laser you duck. The crate is a western warehouse '
    + 'on a space station; the rest are flat placeholder plates, and the rack\'s white tanks sit close to the white silos now standing '
    + 'outside the windows. Ten replacements in the station\'s faceted hand — lit face, mid face, shade face, slate ink, amber lamps, '
    + 'hot orange for what hurts — two per thing the levels deal. Nothing outside the glass is re-used (no silo, dome, mast, rover, '
    + 'satellite, astronaut). Every frame shows the thing on both rails: the floor ahead of Lorenzo and the ceiling further on, '
    + 'mirrored as the run mirrors it. Pick letters.',
  control: ['popSpikes', 'crate', 'magCargo', 'oxygenRack', 'serviceLaser'],
  candidates: [
    { letter: 'A', id: 'foilCrate', name: 'FOIL CRATE', slot: CRATE_SLOT, paint: foilCrate,
      note: 'The crate in gold thermal blanket, as satellites wear it: crumpled facets (the room\'s own low-poly), black tie-down straps, a white manifest tag; one facet catches the light a ring. Replaces the wooden crate.' },
    { letter: 'B', id: 'specimenCase', name: 'SPECIMEN CASE', slot: CRATE_SLOT, paint: specimenCase,
      note: 'A chamfered chrome cube with a porthole; inside, in green gel, something small with two eyes bobs and blinks. Amber lamp on the corner. Replaces the wooden crate.' },
    { letter: 'C', id: 'fuelCell', name: 'FUEL CELL', slot: CARGO_SLOT, paint: fuelCell,
      note: 'A faceted canister on a taped foot, an orange charge band round its waist that pulses, a red flammable diamond. Replaces the mag cargo.' },
    { letter: 'D', id: 'maintenanceBot', name: 'MAINTENANCE BOT', slot: CARGO_SLOT, paint: maintenanceBot,
      note: 'An amber station robot parked across the rail on two tread pods: dome head, a red visor eye scanning, antenna lamp, wrench arm raised at you. Replaces the mag cargo.' },
    { letter: 'E', id: 'coolantRadiator', name: 'COOLANT RADIATOR', slot: RACK_SLOT, paint: coolantRadiator,
      note: 'A stack of ice-blue fins with a glowing core seam, frost at the foot and a cold plume off the top (it falls toward the floor on the ceiling). Fins, not tanks, so it is no silo. Replaces the oxygen rack.' },
    { letter: 'F', id: 'valveManifold', name: 'VALVE MANIFOLD', slot: RACK_SLOT, paint: valveManifold,
      note: 'Three pipes out of the deck into a header, amber flanges, a red valve wheel turning, a pressure gauge shaking in the red and steam spitting from a joint. Replaces the oxygen rack.' },
    { letter: 'G', id: 'weldingDrone', name: 'WELDING DRONE', slot: LASER_SLOT, paint: weldingDrone,
      note: 'A flat faceted service drone on two thrusters, its weld arm forward with a white-hot tip spraying sparks. Duck under. Drawn at the drone\'s 1.35 (the service laser is at 1). Replaces the service laser.' },
    { letter: 'H', id: 'looseToolkit', name: 'LOOSE TOOLKIT', slot: LASER_SLOT, paint: looseToolkit,
      note: 'Somebody\'s tool roll adrift at head height, turning slowly, a spanner and three bolts in orbit round it. Duck under. Replaces the service laser.' },
    { letter: 'I', id: 'plasmaVents', name: 'PLASMA VENTS', slot: SPIKE_SLOT, paint: plasmaVents,
      note: 'A taped grate in the rail with three nozzles firing short orange-white jets on a stagger — never all down, never below the box. Replaces the pop spikes in the gate fields.' },
    { letter: 'J', id: 'magClamps', name: 'MAG CLAMPS', slot: SPIKE_SLOT, paint: magClamps,
      note: 'Three red horseshoe magnets pumping up out of the rail a beat apart, chrome crowns, a crackle of field over them — the gravity station\'s own trap. Replaces the pop spikes in the gate fields.' },
  ],
};
