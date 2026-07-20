// Obstacle/pickup type registry. All hitboxes are style-independent.
// alt = altitude of the entity's BOTTOM above ground (flyers); ground types sit on it.
// Action classes drive fairness: 'jump' | 'duck' | 'none' (avoidable by running).

export const OBSTACLES = {
  cactus:      { w: 13, h: 12, sprite: 'cactus', ground: true, breakable: true, action: 'jump' },
  cactusBig:   { w: 17, h: 14, sprite: 'cactusBig', ground: true, breakable: true, action: 'jump' },
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

export const PICKUPS = {
  coin:      { w: 8, h: 8, sprite: 'coin', score: 50, coin: true },
  battery:   { w: 8, h: 8, sprite: 'battery', heal: 1 },
  capShield: { w: 8, h: 8, sprite: 'capShield', power: 'shield' },
  capMagnet: { w: 8, h: 8, sprite: 'capMagnet', power: 'magnet' },
  capStar:   { w: 8, h: 8, sprite: 'capStar', power: 'star' },
  capSlow:   { w: 8, h: 8, sprite: 'capSlow', power: 'slowmo' },
  capAirJump:{ w: 8, h: 8, sprite: 'capAirJump', power: 'airjump' },
  capSpeed:  { w: 8, h: 8, sprite: 'capSpeed', power: 'speed' },
  capLowGrav:{ w: 8, h: 8, sprite: 'capLowGrav', power: 'lowgrav' },
  capUnpeel: { w: 8, h: 8, sprite: 'capUnpeel', power: 'unpeel' },
  appliance: { w: 12, h: 8, sprite: 'appliance', appliance: true },
  cord:      { w: 8, h: 6, sprite: 'fuse', cord: true },
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
