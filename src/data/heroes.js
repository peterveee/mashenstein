// The eight heroes: stats + ability hooks consumed by one shared controller.
export const HEROES = [
  {
    id: 'lorenzo', name: 'LORENZO "WRENCHES" BRACCIANO', short: 'LORENZO',
    tagline: 'STANDARD PLUMBING PROCEDURE.',
    speedMult: 1.0, scoreMult: 1.0, jumpMult: 1.25, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, variableJump: true,
    ability: { type: 'stomp', cooldown: 3.5, label: 'STOMP / SMASH', callout: 'STOMP + SMASH' }, stomp: true,
    joke: 'PRODUCES INCREASINGLY INAPPROPRIATE PLUMBING TOOLS.',
    abilityDesc: 'POWER: AIR STOMP OR GROUNDED WRENCH SMASH.',
    sidegrades: [
      { id: 'shockwave', name: 'SHOCK STOMP', desc: 'STOMP SHOCKWAVE BREAKS NEARBY OBSTACLES BUT SCATTERS NEARBY COINS.' },
      { id: 'trombone', name: 'TROMBONE WRENCH', desc: 'STOMPS ARE LOUDER. THIS DOES NOTHING. IT IS A TROMBONE.' },
    ],
  },
  {
    id: 'gnash', name: 'GNASH THE NEEDLEMOUSE', short: 'GNASH',
    tagline: 'ALREADY THERE. WAITING.',
    speedMult: 1.15, scoreMult: 1.5, jumpMult: 1.0, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, variableJump: true,
    ability: { type: 'dash', cooldown: 5, label: 'SPIN DASH', callout: 'SPIN DASH' }, stomp: false,
    joke: 'ARRIVES TOO EARLY AND WAITS FOR REALITY TO CATCH UP.',
    abilityDesc: 'SPIN-DASH: A BURST OF INVINCIBLE SPEED.',
    sidegrades: [
      { id: 'tagspeed', name: 'MOMENTUM GUY', desc: '+SPEED AFTER EVERY PERFECT TAG. STACKING. INCLUDING DANGEROUSLY.' },
      { id: 'longdash', name: 'EXTREMELY GONE', desc: 'DASH LASTS LONGER BUT ENDS IN A BRIEF STUMBLE.' },
    ],
  },
  {
    id: 'fernwick', name: 'FERNWICK, HERO OF THYME', short: 'FERNWICK',
    tagline: 'THE RECEIPT FORETOLD THIS.',
    speedMult: 1.0, scoreMult: 0.95, jumpMult: 1.0, maxJumps: 1, canFloat: false,
    startShield: 1, magnetRadius: 0, variableJump: true,
    ability: { type: 'roll', cooldown: 4.5, label: 'SHIELD ROLL', callout: 'SHIELD ROLL' }, stomp: false,
    joke: 'HIS SACRED PROPHECY IS PRINTED ON A FADED SUPERMARKET RECEIPT.',
    abilityDesc: 'STARTS SHIELDED. POWER: A SHORT, FINITE SHIELD ROLL.',
    sidegrades: [
      { id: 'bash', name: 'SHIELD BASH', desc: 'ROLL BREAKS CRATES BUT BRIEFLY RINGS HIS EARS.' },
      { id: 'coupon', name: 'PROPHECY COUPON', desc: 'SHIELDS RESTORE +50 COINS ON BREAK. THE RECEIPT KNEW.' },
    ],
  },
  {
    id: 'b33p', name: 'UNIT B-33P "BLASTBOT"', short: 'B-33P',
    tagline: 'LOW ON CYAN.',
    speedMult: 1.0, scoreMult: 1.0, jumpMult: 0.9, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, duckIsRoll: false, variableJump: true,
    ability: { type: 'shoot', cooldown: 2.5, label: 'LEMON CANNON', callout: 'SHOOT' }, stomp: false,
    joke: 'CONSTANTLY REPORTS LOW ON CYAN. REGARDLESS OF CONTEXT.',
    abilityDesc: 'LEMON CANNON: PELLET DESTROYS GROUND OBSTACLES.',
    sidegrades: [
      { id: 'charge', name: 'CHARGE SHOT', desc: 'PELLETS PIERCE EVERYTHING. DISPLAYS A FAKE SOFTWARE UPDATE BAR.' },
      { id: 'toner', name: 'TONER SAVER', desc: 'COOLDOWN -30% BUT EVERY 5TH SHOT PRINTS A TEST PAGE INSTEAD.' },
    ],
  },
  {
    id: 'mochi', name: 'MOCHI', short: 'MOCHI',
    tagline: 'PROBABLY NOT A COSMIC ENTITY.',
    speedMult: 1.0, scoreMult: 0.85, jumpMult: 1.0, maxJumps: 2, canFloat: true,
    startShield: 0, magnetRadius: 0, variableJump: true,
    ability: { type: 'compress', cooldown: 5, label: 'COSMIC SQUISH', callout: 'COSMIC SQUISH' }, stomp: false,
    joke: 'ADORABLE. THE STARS BEND SLIGHTLY TOWARD MOCHI.',
    abilityDesc: 'DOUBLE JUMP AND FLOAT. POWER: SHRINK AND FALL SLOWLY.',
    sidegrades: [
      { id: 'wide', name: 'EXTRA FULL OF AIR', desc: 'FLOATS LONGER BUT BECOMES PHYSICALLY WIDER.' },
      { id: 'triple', name: 'UNKNOWABLE HOP', desc: 'A THIRD JUMP. NOBODY KNOWS WHERE THE FORCE COMES FROM.' },
    ],
  },
  {
    id: 'chompo', name: 'CHOMPO', short: 'CHOMPO',
    tagline: 'INSATIABLE.',
    speedMult: 1.0, scoreMult: 1.0, jumpMult: 1.0, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 40, variableJump: true,
    ability: { type: 'eat', cooldown: 5.5, label: 'HAZARD BITE', callout: 'EAT HAZARD' }, stomp: false, pickupBonus: 1.25,
    joke: 'OCCASIONALLY EATS HUD ELEMENTS AND SPITS THEM BACK. DENTED.',
    abilityDesc: 'COIN MAGNET. POWER: EAT A NEARBY BREAKABLE HAZARD.',
    sidegrades: [
      { id: 'eat', name: 'HAZARD DIET', desc: 'THE FIRST HAZARD BITE EACH STAGE HAS NO COOLDOWN.' },
      { id: 'bigmagnet', name: 'GRAVITATIONAL APPETITE', desc: 'MAGNET RADIUS DOUBLED. COINS LOOK NERVOUS.' },
    ],
  },
  {
    id: 'gary', name: 'GARY THE RECENTLY DECEASED', short: 'GARY',
    tagline: 'BEING DECEASED IS NOT APPROVED LEAVE.',
    speedMult: 0.95, scoreMult: 1.0, jumpMult: 1.0, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, variableJump: true,
    ability: { type: 'head', cooldown: 4.5, label: 'HEAD TOSS', callout: 'THROW HEAD' }, stomp: false, headGrace: true,
    joke: 'RECEIVES HR REMINDERS ABOUT HIS ONGOING DEADNESS.',
    abilityDesc: 'SURVIVES ONE FATAL HIT. POWER: THROW RETURNING HEAD.',
    sidegrades: [
      { id: 'head', name: 'INDEPENDENT HEAD', desc: 'DETACHED HEAD COLLECTS COINS. MAY RETURN LATE.' },
      { id: 'union', name: 'ZOMBIE UNION REP', desc: 'HEAD GRACE TWICE PER STAGE. HR HAS BEEN NOTIFIED.' },
    ],
  },
  {
    id: 'grumpos', name: 'GRUMPOS, DAD OF BOY', short: 'GRUMPOS',
    tagline: 'BOY.',
    speedMult: 1.0, scoreMult: 1.1, jumpMult: 1.0, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, variableJump: true,
    ability: { type: 'axe', cooldown: 4, label: 'RETURNING AXE', callout: 'THROW AXE' }, stomp: false, heavy: true,
    joke: 'THROWS HIS AXE MAJESTICALLY. OCCASIONALLY FAILS TO CATCH IT.',
    abilityDesc: 'RETURNING AXE DESTROYS GROUND OR FLYING OBSTACLES.',
    sidegrades: [
      { id: 'ricochet', name: 'RICOCHET AXE', desc: 'AXE HITS A SECOND TARGET BUT IS HARDER TO CATCH.' },
      { id: 'boy', name: 'PARENTAL GUIDANCE', desc: 'SAYING "BOY." NOW CLEARS THE NEAREST OBSTACLE. ONCE PER STAGE.' },
    ],
  },
];

export const HERO_BY_ID = Object.fromEntries(HEROES.map((h) => [h.id, h]));
