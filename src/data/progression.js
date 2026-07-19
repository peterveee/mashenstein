// Progression & economy data: Repair Bench, Hero Mastery, Cabinet Mods.

export const BENCH_UPGRADES = [
  { id: 'shield', name: 'SHIELD', levels: [0, 800, 2400], max: 3, desc: ['ABSORBS 1 HIT. STACKS TO 2.', 'STACKS TO 3.', 'BREAKING EMITS A SHOCKWAVE THAT CLEARS THE NEAREST OBSTACLE.'] },
  { id: 'magnet', name: 'MAGNET', levels: [0, 800, 2400], max: 3, desc: ['PULLS COINS. 8 SECONDS.', '12 SECONDS. BIGGER PULL.', '16 SECONDS. COINS HAVE NO CHANCE.'] },
  { id: 'star', name: 'SCORE STAR', levels: [0, 800, 2400], max: 3, desc: ['2X SCORE. 10 SECONDS.', '2.5X SCORE.', '3X SCORE.'] },
  { id: 'slowmo', name: 'SLOW-MO', levels: [0, 800, 2400], max: 3, desc: ['WORLD AT 65%. 6 SECONDS.', '8 SECONDS.', '10 SECONDS AT 55%.'] },
  { id: 'tuneup', name: 'HERO TUNE-UP', levels: [1000, 2000, 3000], max: 3, desc: ['ABILITY COOLDOWNS -10%.', '-20%.', '-30%.'] },
];

export const MODS = [
  { id: 'storebrand', name: 'STORE-BRAND BATTERIES', desc: '+1 BATTERY CELL. POWER-UPS 20% SHORTER.', source: 'shop', price: 1200 },
  { id: 'cape', name: 'LEGALLY DISTINCT CAPE', desc: 'ONE EXTRA AIR-JUMP FOR EVERYONE.', source: 'shop', price: 1500 },
  { id: 'osha', name: 'OSHA COMPLIANCE BINDER', desc: 'CHECKPOINTS RESTORE +1 CELL. RANKS DISPLAY A SMALL DISAPPOINTED ASTERISK.', source: 'shop', price: 900 },
  { id: 'crayon', name: "EGGSHELL'S CRAYON", desc: 'SCORE POPUPS ONE RANK MORE ENTHUSIASTIC. ACTUAL SCORE -5%. WE ARE BEING HONEST WITH YOU.', source: 'shop', price: 400 },
  { id: 'coupon', name: 'HAUNTED COUPON', desc: 'PAWN SHOP PRICES -25%. GARY\'S HEAD FOLLOWS YOU IN THE HUB.', source: 'shop', price: 600 },
  { id: 'thirdslot', name: 'A THIRD POCKET', desc: 'EQUIP A THIRD MOD. THE POCKET WAS THERE ALL ALONG.', source: 'shop', price: 2500 },
  { id: 'shockwave', name: 'SHOCK STOMP', hero: 'lorenzo', source: 'mastery', desc: 'STOMP SHOCKWAVE BREAKS NEARBY OBSTACLES BUT SCATTERS NEARBY COINS.' },
  { id: 'tagspeed', name: 'MOMENTUM GUY', hero: 'gnash', source: 'mastery', desc: 'GNASH GAINS STACKING SPEED AFTER EVERY TAG.' },
  { id: 'bash', name: 'SHIELD BASH', hero: 'fernwick', source: 'mastery', desc: 'ROLL BREAKS ONE GROUND HAZARD BUT ENDS IN A BRIEF STUMBLE.' },
  { id: 'charge', name: 'CHARGE SHOT', hero: 'b33p', source: 'mastery', desc: 'PELLETS PIERCE GROUND AND FLYING OBSTACLES.' },
  { id: 'wide', name: 'EXTRA FULL OF AIR', hero: 'mochi', source: 'mastery', desc: 'FLOATS MORE SLOWLY BUT BECOMES WIDER WHILE FLOATING.' },
  { id: 'eat', name: 'HAZARD DIET', hero: 'chompo', source: 'mastery', desc: 'THE FIRST HAZARD BITE EACH STAGE HAS NO COOLDOWN.' },
  { id: 'head', name: 'INDEPENDENT HEAD', hero: 'gary', source: 'mastery', desc: 'THE THROWN HEAD COLLECTS COINS BEFORE RETURNING.' },
  { id: 'ricochet', name: 'RICOCHET AXE', hero: 'grumpos', source: 'mastery', desc: 'THE AXE CAN HIT A SECOND TARGET BEFORE RETURNING.' },
];

export const MOD_BY_ID = Object.fromEntries(MODS.map((m) => [m.id, m]));

// Mastery: XP thresholds for levels 1-5.
export const MASTERY_LEVELS = [0, 100, 300, 700, 1400];

// (Duo Moves retired with the relay simplification.)

// Coin rewards.
export const REWARDS = {
  stageClear: 250, bossClear: 500, challengeBonus: 100, applianceBonus: 150,
  corruptedClear: 400, minigameWin: 300,
};
