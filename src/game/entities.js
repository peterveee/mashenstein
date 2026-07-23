// Obstacle/pickup type registry. All hitboxes are style-independent.
// alt = altitude of the entity's BOTTOM above ground (flyers); ground types sit on it.
// Action classes drive fairness: 'jump' | 'duck' | 'none' (avoidable by running).

export const OBSTACLES = {
  cactus:      { w: 13, h: 12, sprite: 'cactus', ground: true, breakable: true, action: 'jump' },
  cactusBig:   { w: 17, h: 14, sprite: 'cactusBig', ground: true, breakable: true, action: 'jump' },
  snowman:     { w: 13, h: 12, sprite: 'snowman', ground: true, breakable: true, action: 'jump' },
  snowmanBig:  { w: 17, h: 14, sprite: 'snowmanBig', ground: true, breakable: true, action: 'jump' },
  crate:      { w: 12, h: 11, sprite: 'crate', ground: true, breakable: true, action: 'jump', stack: true },
  barrel:     { w: 13, h: 13, sprite: 'barrel', ground: true, breakable: true, action: 'jump', vx: -40, roll: true },
  drone:      { w: 12, h: 7,  sprite: 'drone', alt: 11, armored: true, action: 'duck', bob: true },
  buzzbird:   { w: 12, h: 7,  sprite: 'buzzbird', alt: 34, armored: false, action: 'none', bob: true },
  shooterDrone: { w: 12, h: 7, sprite: 'drone', alt: 44, armored: true, action: 'none', shoots: true, bob: true },
  target:     { w: 8, h: 8,   sprite: 'capStar', alt: 40, breakable: true, action: 'none', isTarget: true, bob: true },
  icicle:     { w: 8, h: 8,   sprite: 'icicle', alt: 70, falls: true, action: 'jump', telegraph: 0.7 },
  qcrate:     { w: 12, h: 11, sprite: 'crate', alt: 40, breakable: true, action: 'none', bonusCoins: 3, isTarget: true, qbox: true, prizeChance: 0.25 },
  pipe:       { w: 14, h: 18, sprite: 'crate', ground: true, breakable: false, action: 'jump', tall: true },
  gap:        { w: 56, h: 20, sprite: null, ground: true, isGap: true, action: 'jump' },
  boostPad:   { w: 14, h: 4,  sprite: 'boostPad', ground: true, isBoost: true, action: 'none' },
  switch:     { w: 8, h: 8,   sprite: 'battery', alt: 46, breakable: true, action: 'none', isSwitch: true, bob: true },
  tombstone:  { w: 11, h: 8,  sprite: 'tombstone', ground: true, breakable: true, action: 'jump' },
  zombie:     { w: 10, h: 14, sprite: 'zombieWalk', ground: true, breakable: true, action: 'jump', vx: -14, shamble: true },
  beatBar:    { w: 8, h: 10,  sprite: null, ground: true, breakable: false, action: 'jump', beatSync: true },
  cardboardMonster: { w: 12, h: 9, sprite: 'cardboardMonster', ground: true, breakable: true, action: 'jump' },
  chair:      { w: 12, h: 10, sprite: 'chair', ground: true, breakable: true, action: 'jump', vx: -34, roll: true },
  printer:    { w: 12, h: 7,  sprite: 'printer', ground: true, breakable: true, action: 'jump', shoots: true, isTarget: true },
  paperwork:  { w: 8, h: 6,   sprite: null, alt: 12, armored: false, action: 'duck', paper: true, bob: true },
};

// What a thing is made of, for when it stops being a thing. Colours are pulled
// from each prop painter so the chunks read as pieces of the sprite that just
// left; `mat` picks the timbre of the scatter they make when they land.
export const DEBRIS = {
  cactus:      { colors: ['#a83020', '#d84828', '#f8d0a0'], size: 2.6, mat: 'soft' },
  cactusBig:   { colors: ['#a83020', '#d84828', '#f8d0a0'], size: 3.2, count: 14, mat: 'soft' },
  snowman:     { colors: ['#eaf6ff', '#b9d9ee', '#d84848'], size: 2.6, mat: 'soft' },
  snowmanBig:  { colors: ['#eaf6ff', '#b9d9ee', '#d84848'], size: 3.2, count: 14, mat: 'soft' },
  crate:       { colors: ['#c89858', '#8a6432', '#5a4020'], size: 3, mat: 'wood' },
  qcrate:      { colors: ['#f6d33c', '#c89858', '#8a6432'], size: 3, mat: 'gold' },
  barrel:      { colors: ['#b07840', '#7a4c22', '#d09858'], size: 3.2, mat: 'wood' },
  tombstone:   { colors: ['#9a9ab0', '#6a6a80'], size: 3, mat: 'stone' },
  cardboardMonster: { colors: ['#c8a068', '#8a6a3a', '#fff'], size: 3, mat: 'soft' },
  chair:       { colors: ['#4a5a6c', '#3a4a5a', '#2a3542'], size: 2.8, mat: 'wood' },
  printer:     { colors: ['#b0b0c0', '#fff', '#48e0c8'], size: 2.6, mat: 'metal' },
  zombie:      { colors: ['#9ec89e', '#5a6a8a', '#4a6a4a'], size: 2.4, count: 12, mat: 'soft' },
  drone:       { colors: ['#8858c8', '#5a3890', '#c8b8e8'], size: 2.4, spark: '#f6d33c', mat: 'metal' },
  shooterDrone:{ colors: ['#8858c8', '#5a3890', '#e04848'], size: 2.4, spark: '#f6d33c', mat: 'metal' },
  buzzbird:    { colors: ['#f0a860', '#d87830', '#f6d33c'], size: 2.2, grav: 190, mat: 'soft' },
  icicle:      { colors: ['#b8e0f8', '#fff', '#8ab8d8'], size: 2.6, mat: 'stone' },
  target:      { colors: ['#f6d33c', '#fff8d0'], size: 2.4, mat: 'metal' },
  switch:      { colors: ['#48e0c8', '#f6d33c', '#3a4a5a'], size: 2.4, mat: 'metal' },
  paperwork:   { colors: ['#fff', '#e8e8f0'], size: 3, grav: 60, count: 10, mat: 'soft' },
};

export const DEBRIS_DEFAULT = { colors: ['#c8a068', '#8a6432'], size: 2.8, mat: 'wood' };

export const PICKUPS = {
  coin:      { w: 8, h: 8, sprite: 'coin', score: 50, coin: true },
  battery:   { w: 8, h: 8, sprite: 'battery', heal: 1 },
  capShield: { w: 8, h: 8, sprite: 'capShield', power: 'shield' },
  capMagnet: { w: 8, h: 8, sprite: 'capMagnet', power: 'magnet' },
  capStar:   { w: 8, h: 8, sprite: 'capStar', power: 'star' },
  capAirJump:{ w: 8, h: 8, sprite: 'capAirJump', power: 'airjump' },
  capSpeed:  { w: 8, h: 8, sprite: 'capSpeed', power: 'speed' },
  capLowGrav:{ w: 8, h: 8, sprite: 'capLowGrav', power: 'lowgrav' },
  capUnpeel: { w: 8, h: 8, sprite: 'capUnpeel', power: 'unpeel' },
  // Not a timed power: banks one supercharged ability, so it carries its own
  // flag instead of a `power` the Powerups clock would try to run down.
  capRelay:  { w: 8, h: 8, sprite: 'capRelay', relayCharge: true },
  appliance: { w: 22, h: 18, sprite: 'appliance', appliance: true, bob: true },
  cord:      { w: 14, h: 9, sprite: 'cord', cord: true },
  resident:  { w: 10, h: 12, sprite: 'resident', resident: true, shamble: true },
};

let idCounter = 1;

export function makeObstacle(type, worldX, opts = {}) {
  const def = OBSTACLES[type];
  const n = opts.n || 1;
  return {
    id: idCounter++, kind: 'obstacle', type, def,
    x: worldX,
    alt: def.ground ? 0 : (def.alt || 12),
    w: def.w, h: def.h * (def.stack ? n : 1),
    n, vx: def.vx || 0,
    live: true, broken: false,
    fallT: def.falls ? (def.telegraph || 0.7) : 0, fell: !def.falls,
    shootT: def.shoots ? 1.2 : 0,
    hp: opts.hp || 1,
    bobPhase: (worldX * 0.05) % (Math.PI * 2),
    gait: (worldX * 0.11) % (Math.PI * 2), // shamblers step out of lockstep with each other
  };
}

export function makePickup(type, worldX, alt) {
  const def = PICKUPS[type];
  return {
    id: idCounter++, kind: 'pickup', type, def,
    x: worldX, alt: alt ?? 8, w: def.w, h: def.h,
    live: true, vx: 0, vy: 0, magnetized: false,
    bobPhase: (worldX * 0.07) % (Math.PI * 2),
  };
}

// AABB in world space. Entities measured from ground: box bottom = ground - alt.
export function entityBox(e, groundY) {
  const bottom = groundY - e.alt;
  return { x: e.x, y: bottom - e.h, w: e.w, h: e.h };
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
