// Progression & economy data: Repair Bench, Hero Mastery, Cabinet Mods.

// `base` is the level every save already owns for free. Shield and Magnet begin
// "owned" — you start a run holding charges / with a magnet — so their first
// purchase climbs from 1; refire rate starts from nothing at 0. Anything that
// counts what a player has actually bought reads `stored - base`, never the raw
// stored value (which would count the free base as a purchase).
export const BENCH_UPGRADES = [
  { id: 'shield', name: 'EXTRA SHIELD CAPACITY', base: 1, levels: [0, 1500, 4000], max: 3,
    currentDesc: ['HOLDS 2 SHIELD CHARGES.', 'HOLDS 3 SHIELD CHARGES.', 'SHIELD BREAKS WITH A SHOCKWAVE.'],
    desc: ['HOLDS 3 SHIELD CHARGES.', 'SHIELD BREAKS WITH A SHOCKWAVE.'] },
  { id: 'magnet', name: 'SUPER MAGNET DURATION', base: 1, levels: [0, 1500, 4000], max: 3,
    currentDesc: ['PULLS COINS FOR 8 SECONDS.', 'PULLS COINS FOR 12 SECONDS.', 'PULLS COINS FOR 16 SECONDS.'],
    desc: ['12 SECONDS. BIGGER PULL.', '16 SECONDS. COINS HAVE NO CHANCE.'] },
  { id: 'tuneup', name: 'HERO REFIRE RATE', base: 0, levels: [1800, 4000], max: 2,
    currentDesc: ['STANDARD POWER COOLDOWNS.', 'POWER COOLDOWNS -10%.', 'POWER COOLDOWNS -20%.'],
    desc: ['POWER COOLDOWNS -10%.', 'POWER COOLDOWNS -20%.'] },
];

export const BENCH_FOOD_COURT_SURCHARGES = [
  { rate: 8.73 / 100, name: 'STANDARD FOOD COURT SURCHARGE' },
  { rate: 10.31 / 100, name: 'PEAK SERVICE SURCHARGE' },
  { rate: 12.47 / 100, name: 'EQUIPMENT MAINTENANCE SURCHARGE' },
];

export const MODS = [
  { id: 'storebrand', name: 'STORE-BRAND BATTERIES', desc: '+1 BATTERY CELL. POWER-UPS 20% SHORTER.', source: 'shop', price: 1200 },
  { id: 'cape', name: 'LEGALLY DISTINCT CAPE', desc: 'ONE EXTRA AIR-JUMP FOR EVERYONE.', source: 'shop', price: 1500 },
  { id: 'osha', name: 'OSHA COMPLIANCE BINDER', desc: 'CHECKPOINTS RESTORE +1 CELL. RANKS DISPLAY A SMALL DISAPPOINTED ASTERISK.', source: 'shop', price: 900 },
  { id: 'crayon', name: "EGGSHELL'S CRAYON", desc: 'SCORE POPUPS ONE RANK MORE ENTHUSIASTIC. ACTUAL SCORE -5%. WE ARE BEING HONEST WITH YOU.', source: 'shop', price: 400 },
  { id: 'coupon', name: 'HAUNTED COUPON', desc: 'PAWN SHOP PRICES -25%. GARY\'S HEAD FOLLOWS YOU IN THE FOOD COURT.', source: 'shop', price: 600 },
  { id: 'thirdslot', name: 'A THIRD POCKET', desc: 'EQUIP A THIRD MOD. THE POCKET WAS THERE ALL ALONG.', source: 'shop', price: 2500 },
  { id: 'shockwave', name: 'SHOCK STOMP', hero: 'lorenzo', source: 'mastery', desc: 'STOMP SHOCKWAVE BREAKS NEARBY OBSTACLES BUT SCATTERS NEARBY COINS.' },
  { id: 'tagspeed', name: 'MOMENTUM GUY', hero: 'gnash', source: 'mastery', desc: 'GNASH GAINS STACKING SPEED AFTER EVERY TAG.' },
  { id: 'bash', name: 'SHIELD BASH', hero: 'fernwick', source: 'mastery', desc: 'ROLL BREAKS ONE GROUND HAZARD BUT ENDS IN A BRIEF STUMBLE.' },
  { id: 'charge', name: 'CHARGE SHOT', hero: 'b33p', source: 'mastery', desc: 'PELLETS PIERCE GROUND AND FLYING OBSTACLES.' },
  { id: 'wide', name: 'EXTRA FULL OF AIR', hero: 'mochi', source: 'mastery', desc: 'FLOATS MORE SLOWLY BUT BECOMES WIDER WHILE FLOATING.' },
  { id: 'eat', name: 'HAZARD DIET', hero: 'chompo', source: 'mastery', desc: 'THE FIRST HAZARD BITE EACH STAGE HAS NO COOLDOWN.' },
  { id: 'head', name: 'FREELANCE FIST', hero: 'raymn', source: 'mastery', desc: 'THE ROCKET FIST COLLECTS COINS BEFORE RETURNING.' },
  { id: 'ricochet', name: 'RICOCHET AXE', hero: 'grumpos', source: 'mastery', desc: 'THE AXE CAN HIT A SECOND TARGET BEFORE RETURNING.' },
];

export const MOD_BY_ID = Object.fromEntries(MODS.map((m) => [m.id, m]));

// Mastery: XP thresholds for levels 1-5.
export const MASTERY_LEVELS = [0, 100, 300, 700, 1400];

// (Duo Moves retired with the relay simplification.)

// Coin rewards.
export const REWARDS = {
  stageClear: 250, bossClear: 500, challengeBonus: 100, applianceBonus: 150,
  corruptedClear: 400, minigameWin: 300, arcadeWin: 200,
};

// Arcade Corner is opt-in: every breaker-box game is available from the start,
// but a play costs coins. Winning nets +150; losing is the price of curiosity.
export const ARCADE_PLAY_COST = 50;
