// The eight heroes: stats + ability hooks consumed by one shared controller.
export const HEROES = [
  {
    id: 'lorenzo', name: 'LORENZO "WRENCHES" BRACCIANO', short: 'LORENZO', showFullName: true,
    tagline: 'STANDARD PLUMBING PROCEDURE.',
    speedMult: 1.0, scoreMult: 1.0, jumpMult: 1.10, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, variableJump: true,
    ability: { type: 'stomp', cooldown: 2.5, label: 'STOMP / SMASH', callout: 'STOMP + SMASH' }, stomp: true,
    joke: 'PRODUCES INCREASINGLY INAPPROPRIATE PLUMBING TOOLS.',
    skillLabel: 'HIGH JUMP',
    skillDesc: 'JUMPS 10% HIGHER',
    powerDesc: 'STOMPS OR SMASHES GROUND HAZARDS',
    abilityDesc: 'AIR STOMP OR GROUNDED WRENCH SMASH.',
    sidegrades: [
      { id: 'shockwave', name: 'SHOCK STOMP', desc: 'STOMP SHOCKWAVE BREAKS NEARBY OBSTACLES BUT SCATTERS NEARBY COINS.' },
    ],
  },
  {
    id: 'gnash', name: 'GNASH THE NEEDLEMOUSE', short: 'GNASH',
    tagline: 'ALREADY THERE. WAITING.',
    speedMult: 1.15, scoreMult: 1.0, jumpMult: 1.05, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, variableJump: true,
    ability: { type: 'dash', cooldown: 3.5, label: 'SPIN DASH', callout: 'SPIN DASH' }, stomp: false,
    joke: 'ARRIVES TOO EARLY AND WAITS FOR REALITY TO CATCH UP.',
    skillLabel: 'SPEED BOOST',
    skillDesc: 'RUNS 15% FASTER',
    powerDesc: 'INVINCIBLE BURST THAT SMASHES HAZARDS',
    abilityDesc: 'INVINCIBLE BURST OF SPEED THAT SMASHES BREAKABLES.',
    sidegrades: [
      { id: 'tagspeed', name: 'MOMENTUM GUY', desc: '+SPEED AFTER EVERY PERFECT TAG. STACKING. INCLUDING DANGEROUSLY.' },
    ],
  },
  {
    id: 'fernwick', name: 'FERNWICK, HERO OF THYME', short: 'FERNWICK', showFullName: true,
    tagline: 'THE RECEIPT FORETOLD THIS.',
    speedMult: 1.0, scoreMult: 0.95, jumpMult: 1.0, maxJumps: 1, canFloat: false,
    startShield: 1, magnetRadius: 0, variableJump: true,
    ability: { type: 'roll', cooldown: 3, label: 'SHIELD ROLL', callout: 'SHIELD ROLL' }, stomp: false,
    joke: 'HIS SACRED PROPHECY IS PRINTED ON A FADED SUPERMARKET RECEIPT.',
    skillLabel: 'STARTING SHIELD',
    skillDesc: 'STARTS NEW LEVELS WITH A SHIELD',
    powerDesc: 'SHIELDED ROLL BREAKS GROUND HAZARDS',
    abilityDesc: 'SHORT, FINITE ROLL THAT BREAKS GROUND HAZARDS.',
    sidegrades: [
      { id: 'bash', name: 'SHIELD BASH', desc: 'ROLL BREAKS CRATES BUT BRIEFLY RINGS HIS EARS.' },
    ],
  },
  {
    id: 'b33p', name: 'UNIT B-33P "BLASTBOT"', short: 'B-33P',
    tagline: 'LOW ON CYAN.',
    speedMult: 1.0, scoreMult: 1.0, jumpMult: 0.9, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, duckIsRoll: false, variableJump: true,
    ability: { type: 'shoot', cooldown: 1.8, cooldownMult: 0.75, label: 'LEMON CANNON', callout: 'SHOOT' }, stomp: false,
    joke: 'CONSTANTLY REPORTS LOW ON CYAN. REGARDLESS OF CONTEXT.',
    skillLabel: 'BATTERY EFFICIENT',
    skillDesc: 'POWER MOVE RECHARGES 25% FASTER',
    powerDesc: 'FIRES A LEMON SHOT',
    abilityDesc: 'FIRES A LEMON SHOT THAT DESTROYS GROUND OBSTACLES.',
    sidegrades: [
      { id: 'charge', name: 'CHARGE SHOT', desc: 'PELLETS PIERCE EVERYTHING. DISPLAYS A FAKE SOFTWARE UPDATE BAR.' },
    ],
  },
  {
    // Clara takes Mochi's slot the way Kiko took Miss Chomp's: the roster
    // stays at eight and EIGHT HEROES. ONE SOCKET. stays true. Mochi is not
    // deleted — her rig, palette and lines all survive, held for a cameo —
    // she is simply off every surface that enumerates this array. The double
    // jump did NOT come across (Kiko already carries it, and hosts the
    // tutorial lesson now); the float retired with her.
    //
    // The cliffhanger jump is Lorenzo's trade taken further — 1.15 against
    // his 1.10 — and the difference lives in data the same way the three
    // shooters differ by shotSpeed/shotSize rather than by id checks.
    id: 'clara', name: 'CLARA VAULT, MALL RAIDER', short: 'CLARA', subtitle: 'MALL RAIDER',
    tagline: 'CHAPTER ONE: SHE ARRIVED.',
    speedMult: 1.0, scoreMult: 1.0, jumpMult: 1.15, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, variableJump: true,
    // The third shooter, and not the same weapon as either of the others:
    // B-33P is small and fast on a 1.35s recharge, Kiko fat and slow on 3.5s.
    // Clara carries TWO pistols, and `shotBurst: 2` is that fact as gameplay:
    // every trigger pull is a pair of slugs a short gap apart — the fastest
    // and smallest rounds of the three shooters — on a middle cooldown.
    ability: { type: 'shoot', cooldown: 3.0, label: 'PLOT HOLE', callout: 'PLOT HOLE' }, stomp: false,
    shotSpeed: 340, shotSize: 0.85, shotBurst: 2,
    joke: 'NARRATES HER OWN LUNCH. IN THE PAST TENSE.',
    skillLabel: 'CLIFFHANGER',
    skillDesc: 'JUMPS 15% HIGHER',
    powerDesc: 'FIRES BOTH PISTOLS',
    abilityDesc: 'FIRES A QUICK PAIR OF SLUGS THAT DESTROY GROUND OBSTACLES.',
    sidegrades: [
      // NOT 'wide' or 'force' — sidegrade ids are one global namespace
      // (modIds.includes). Rides the same shotSpeed/shotSize pair REASONABLE
      // FORCE does, traded the other way.
      { id: 'serial', name: 'SERIALIZED', desc: 'THE SHOT IS FASTER BUT SMALLER. THE AUDIENCE GASPS.' },
    ],
  },
  {
    // Kiko takes this slot in place, which is what keeps the roster at eight and
    // leaves EIGHT HEROES. ONE SOCKET. true. Miss Chomp is not deleted — she
    // steps back to the food court as an NPC (see game/cast.js).
    //
    // maxJumps 2 was Mochi's, and only the JUMP came across: canFloat stays
    // false. The second jump is her wall kick; the hover is somebody else's.
    id: 'kiko', name: 'KIKO, JURISDICTION PENDING', short: 'KIKO', subtitle: 'JURISDICTION PENDING',
    tagline: 'NOBODY REPORTED IT. I NOTICED.',
    speedMult: 1.0, scoreMult: 1.0, jumpMult: 1.0, maxJumps: 2, canFloat: false,
    startShield: 0, magnetRadius: 0, variableJump: true,
    // Slower and fatter than B-33P's lemon, and on twice his cooldown — his
    // recharge is his whole skill, so the two shooters are not the same weapon.
    ability: { type: 'shoot', cooldown: 3.5, label: 'WARNING SHOT', callout: 'WARNING SHOT' }, stomp: false,
    shotSpeed: 170, shotSize: 1.5,
    joke: 'MAINTAINS A CASE FILE ON EVERY OBJECT IN THIS BUILDING.',
    skillLabel: 'FOOT PURSUIT',
    skillDesc: 'JUMPS TWICE',
    powerDesc: 'FIRES A BALL OF ENERGY',
    abilityDesc: 'FIRES A SLOW BALL OF ENERGY THAT DESTROYS GROUND OBSTACLES.',
    sidegrades: [
      // NOT id 'wide' — that is Mochi's, and sidegrade ids are one global
      // namespace (modIds.includes).
      { id: 'force', name: 'REASONABLE FORCE', desc: 'THE WARNING SHOT IS WIDER BUT TRAVELS SLOWER.' },
    ],
  },
  {
    id: 'raymn', name: "RAY M'N, APPENDAGE-OPTIONAL", short: "RAY M'N",
    tagline: 'LIMBS WERE OUT OF BUDGET.',
    speedMult: 0.95, scoreMult: 1.0, jumpMult: 1.03, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, variableJump: true,
    ability: { type: 'fist', cooldown: 3, label: 'ROCKET FIST', callout: 'ROCKET FIST' }, stomp: false, assemblyGrace: true,
    joke: 'THE INSURANCE FORM REQUIRES A LIMB COUNT. HE KEEPS WRITING "OPTIONAL."',
    skillLabel: 'LOOSE ASSEMBLY',
    skillDesc: 'SURVIVES ONE FATAL HIT',
    powerDesc: 'THROWS A RETURNING FIST',
    abilityDesc: 'THROWS A ROCKET FIST THAT RETURNS TO HIM.',
    sidegrades: [
      { id: 'head', name: 'FREELANCE FIST', desc: 'THE ROCKET FIST COLLECTS COINS BEFORE RETURNING.' },
    ],
  },
  {
    id: 'grumpos', name: 'GRUMPOS, DAD OF BOY', short: 'GRUMPOS', subtitle: 'DAD OF BOY',
    tagline: 'BOY.',
    speedMult: 1.0, scoreMult: 1.2, jumpMult: 1.0, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, variableJump: true,
    ability: { type: 'axe', cooldown: 2.8, label: 'RETURNING AXE', callout: 'THROW AXE' }, stomp: false, heavy: true,
    joke: 'THROWS HIS AXE MAJESTICALLY. OCCASIONALLY FAILS TO CATCH IT.',
    skillLabel: 'LEGENDARY PRESENCE',
    skillDesc: 'EARNS 20% MORE SCORE',
    powerDesc: 'AXE HITS GROUND AND AIR HAZARDS',
    abilityDesc: 'THROWS AN AXE THAT DESTROYS GROUND OR FLYING OBSTACLES.',
    sidegrades: [
      { id: 'ricochet', name: 'RICOCHET AXE', desc: 'AXE HITS A SECOND TARGET BUT IS HARDER TO CATCH.' },
    ],
  },
];

export const HERO_BY_ID = Object.fromEntries(HEROES.map((h) => [h.id, h]));
