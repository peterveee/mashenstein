// Dev-only authored stage; runtime, HUD and lifecycle belong to RunState.
import { CABINET_BY_ID } from '../../data/cabinets.js';
import { bank as GRAVITY_THEME } from '../../data/songs/gravity.js';
export const GRAVITY_LEVEL = Object.freeze({ speed: 120, gravity: 0.65, corridor: 137, length: 4680, gateStart: 438.75, gateSpacing: 390, arrowLeftOffset: 14 });
export const GATES = Array.from({ length: 10 }, (_, i) => ({ x: GRAVITY_LEVEL.gateStart + i * GRAVITY_LEVEL.gateSpacing, lane: (i + 1) % 2 }));
export const HAZARDS = [
  { x: 230, lane: 0, type: 'crate' },
  ...GATES.map((g, i) => ({ x: g.x + 235, lane: g.lane, type: ['magCargo', 'drone', 'oxygenRack', 'serviceLaser', 'crate', 'magCargo', 'serviceLaser', 'oxygenRack', 'drone', 'magCargo'][i] })),
];
export const GRAVITY_CABINET = {
  ...CABINET_BY_ID.office, music: GRAVITY_THEME,
  id: 'gravity', name: 'GRAVITY GRID', act: 1, mechanic: 'gravity', speedBonus: -0.25,
  sky: ['#07131e', '#162935'], ground: '#1a3546', groundDark: '#0b1723',
  far: '#293441', hills: '#626875',
  patterns: [{ tier: 0, cells: [] }],
  taunt: 'THE FLOOR IS A MATTER OF OPINION.',
};
export const GRAVITY_STAGE = {
  id: 'gravity-1', cabinet: 'gravity', index: 1,
  durationSec: GRAVITY_LEVEL.length / (GRAVITY_LEVEL.speed * 1.05),
  mission: { type: 'reach', desc: 'REACH THE AIRLOCK' },
  challenge: { type: 'noDamage', desc: 'TAKE NO DAMAGE' },
  applianceAt: 0.9, applianceHigh: false,
  intro: 'JUMP AFTER THE ARROWS TO FLIP GRAVITY.',
};
export const GRAVITY_LAYOUT = {
  checkpoints: [1420 / GRAVITY_LEVEL.length, 2980 / GRAVITY_LEVEL.length],
  routes: [], pits: [], finishDog: false,
};
