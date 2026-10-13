// Shared movement constants and cabinet identity for the production Gravity
// Grid controller. Stage geometry lives in data/gravity-stages.js.
import { CABINET_BY_ID } from '../../data/cabinets.js';
import { bank as GRAVITY_THEME } from '../../data/songs/gravity.js';

export const GRAVITY_LEVEL = Object.freeze({
  speed: 120,
  gravity: 0.65,
  // 86 since 13 Oct 2026 (Peter: "the same size as the other levels" on a
  // phone): the room was 137 high and needed zoom 1.36 to fit both rails; at 86
  // it fits at the phone's 2.2. ROOM_SCALE redraws the 137-high station art at
  // this size, and JUMP_SCALE scales jumps and gravity to match (gravity.js).
  corridor: 86,
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

// The station art is authored for a 137-high corridor; the room is drawn at
// this scale so it fits the playing corridor exactly.
export const ROOM_SCALE = GRAVITY_LEVEL.corridor / 137;
// Jump heights and the pull scale with the corridor; airtime stays the same,
// so every authored spacing in seconds still holds. Height ∝ jumpScale², airtime
// ∝ jumpScale / √gravity, hence √k on the launch and k on gravity.
export const GEOMETRY_K = ROOM_SCALE, JUMP_SCALE = Math.sqrt(ROOM_SCALE);
