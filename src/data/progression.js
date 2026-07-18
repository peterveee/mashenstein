// Progression & economy data: Repair Bench, Hero Mastery, Cabinet Mods, duo moves.

export const BENCH_UPGRADES = [
  { id: 'shield', name: 'SHIELD', levels: [0, 800, 2400], max: 3, desc: ['ABSORBS 1 HIT. STACKS TO 2.', 'STACKS TO 3.', 'BREAKING EMITS A SHOCKWAVE THAT CLEARS THE NEAREST OBSTACLE.'] },
  { id: 'magnet', name: 'MAGNET', levels: [0, 800, 2400], max: 3, desc: ['PULLS COINS. 8 SECONDS.', '12 SECONDS. BIGGER PULL.', '16 SECONDS. COINS HAVE NO CHANCE.'] },
  { id: 'star', name: 'SCORE STAR', levels: [0, 800, 2400], max: 3, desc: ['2X SCORE. 10 SECONDS.', '2.5X SCORE.', '3X SCORE.'] },
  { id: 'slowmo', name: 'SLOW-MO', levels: [0, 800, 2400], max: 3, desc: ['WORLD AT 65%. 6 SECONDS.', '8 SECONDS.', '10 SECONDS AT 55%.'] },
  { id: 'tuneup', name: 'HERO TUNE-UP', levels: [1000, 2000, 3000], max: 3, desc: ['ABILITY COOLDOWNS -10%.', '-20%.', '-30%.'] },
  { id: 'tagWindow', name: 'PERFECT TAG WINDOW', levels: [1500], max: 1, desc: ['PERFECT TAG WINDOW +50%.'] },
  { id: 'meterRate', name: 'RELAY METER', levels: [1200, 2400], max: 2, desc: ['METER CHARGES +25% FASTER.', '+50% FASTER.'] },
  { id: 'exhaustRec', name: 'EXHAUSTION RECOVERY', levels: [1200, 2400], max: 2, desc: ['HEROES RECOVER +25% FASTER.', '+50% FASTER.'] },
];

export const MODS = [
  { id: 'storebrand', name: 'STORE-BRAND BATTERIES', desc: '+1 BATTERY CELL. POWER-UPS 20% SHORTER.', source: 'shop', price: 1200 },
  { id: 'cape', name: 'LEGALLY DISTINCT CAPE', desc: 'ONE EXTRA AIR-JUMP FOR EVERYONE. EXHAUSTION +20%.', source: 'shop', price: 1500 },
  { id: 'osha', name: 'OSHA COMPLIANCE BINDER', desc: 'CHECKPOINTS RESTORE +1 CELL. RANKS DISPLAY A SMALL DISAPPOINTED ASTERISK.', source: 'shop', price: 900 },
  { id: 'crayon', name: "EGGSHELL'S CRAYON", desc: 'SCORE POPUPS ONE RANK MORE ENTHUSIASTIC. ACTUAL SCORE -5%. WE ARE BEING HONEST WITH YOU.', source: 'shop', price: 400 },
  { id: 'coupon', name: 'HAUNTED COUPON', desc: 'PAWN SHOP PRICES -25%. GARY\'S HEAD FOLLOWS YOU IN THE HUB.', source: 'shop', price: 600 },
  { id: 'thirdslot', name: 'A THIRD POCKET', desc: 'EQUIP A THIRD MOD. THE POCKET WAS THERE ALL ALONG.', source: 'shop', price: 2500 },
  { id: 'shockwave', name: 'SHOCK STOMP', hero: 'lorenzo', source: 'mastery' },
  { id: 'tagspeed', name: 'MOMENTUM GUY', hero: 'gnash', source: 'mastery' },
  { id: 'bash', name: 'SHIELD BASH', hero: 'fernwick', source: 'mastery' },
  { id: 'charge', name: 'CHARGE SHOT', hero: 'b33p', source: 'mastery' },
  { id: 'wide', name: 'EXTRA FULL OF AIR', hero: 'mochi', source: 'mastery' },
  { id: 'eat', name: 'HAZARD DIET', hero: 'chompo', source: 'mastery' },
  { id: 'head', name: 'INDEPENDENT HEAD', hero: 'gary', source: 'mastery' },
  { id: 'ricochet', name: 'RICOCHET AXE', hero: 'grumpos', source: 'mastery' },
];

export const MOD_BY_ID = Object.fromEntries(MODS.map((m) => [m.id, m]));

// Mastery: XP thresholds for levels 1-5.
export const MASTERY_LEVELS = [0, 100, 300, 700, 1400];

export const DUO_MOVES = [
  {
    id: 'headlaunch', pair: ['gary', 'chompo'], name: 'HEAD DELIVERY',
    desc: 'GARY THROWS HIS HEAD. CHOMPO EATS AND LAUNCHES IT. THE HEAD APOLOGIZES TO EACH OBSTACLE.',
    effect: 'pierce',
  },
  {
    id: 'plumberthrow', pair: ['grumpos', 'lorenzo'], name: 'STANDARD PROCEDURE',
    desc: 'GRUMPOS THROWS LORENZO. LORENZO INSISTS THIS IS STANDARD PLUMBING PROCEDURE.',
    effect: 'smash',
  },
  {
    id: 'inhale', pair: ['mochi', 'b33p'], name: 'TECHNICAL DIFFICULTIES',
    desc: 'MOCHI INHALES B-33P\'S PROJECTILE AND PRODUCES SOMETHING DEEPLY INCORRECT.',
    effect: 'screenclear',
  },
  {
    id: 'prophecy', pair: ['gnash', 'fernwick'], name: 'PROPHECY UPDATE',
    desc: 'GNASH RUNS CIRCLES AROUND FERNWICK FAST ENOUGH TO UPDATE HIS SACRED PROPHECY.',
    effect: 'reroll',
  },
];

// Coin rewards.
export const REWARDS = {
  stageClear: 250, bossClear: 500, challengeBonus: 100, applianceBonus: 150,
  corruptedClear: 400, minigameWin: 300, perfectTagCoin: 5,
};
