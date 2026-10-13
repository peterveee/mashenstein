// Shared movement constants and cabinet identity for the production Gravity
// Grid controller. Stage geometry lives in data/gravity-stages.js.
import { CABINET_BY_ID } from '../../data/cabinets.js';
import { bank as GRAVITY_THEME } from '../../data/songs/gravity.js';

export const GRAVITY_LEVEL = Object.freeze({
  speed: 120,
  gravity: 0.65,
  corridor: 137,
  // Keep the ceiling rail almost touching the second top HUD row in landscape.
  landscapeZoomCap: 1.36,
  arrowLeftOffset: 14,
});

export const GRAVITY_CABINET = Object.freeze({
  ...CABINET_BY_ID.gravity,
  music: GRAVITY_THEME,
  id: 'gravity',
  name: 'GRAVITY GRID',
  act: 3,
  mechanic: 'gravity',
  speedBonus: -0.25,
  sky: ['#07131e', '#162935'],
  ground: '#1a3546',
  groundDark: '#0b1723',
  far: '#293441',
  patterns: [{ tier: 0, cells: [] }],
  bannedPowers: ['capSpeed', 'capLowGrav', 'capAirJump'],
  taunt: 'THE FLOOR IS A MATTER OF OPINION.',
});
