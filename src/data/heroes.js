// The eight heroes: stats + ability hooks consumed by one shared controller.
//
// `jumpMult` IS THE HEIGHT, and it is the only stat here that had to be told so
// twice. It scales apex directly — x1.10 clears 10% more than the 57px base and
// nothing more subtle than that — because player.js solves the launch speed
// back out of it (jumpV). It used to BE the launch speed, and apex goes as v²,
// so every number in this column meant something like double what it said: the
// x0.90-to-x1.10 band you can read here spanned 46px to 69px in the air, a 1.51x
// spread wearing a 1.22x label. If a new hero wants a taller jump, the number to
// move is this one and the height moves with it.
//
// `heavy` costs AIRTIME, not height. Grumpos' ×1.25 gravity is compensated in
// the launch, so his x1.00 reaches the same 57px everyone else's does and he
// spends 0.64s in the air against their 0.71s. It used to come out of his apex
// instead, which made him the shortest jumper in the game behind a stat line
// that said average.
//
// THE CARD DOES NOT QUOTE THIS NUMBER, and that is deliberate rather than a
// drift. `skillDesc` advertises CLEARANCE — the air left over the tallest thing
// in the game you actually jump, an 18px bollard — so Clara's x1.10 reads
// "JUMPS 15% HIGHER" and Lorenzo's x1.08 reads 12%. The first 18px of every
// jump is spent getting level with the obstacle and buys nothing; only what is
// above it is the stat the player feels, so a 5.7px gain is a bigger share of a
// smaller and more honest number. tests/cast.js recomputes both strings from
// OBSTACLES and the shipped physics, so neither can go stale the way the old
// "JUMPS 15% HIGHER" did when Clara came down from x1.15 to x1.10.
export const HEROES = [
  {
    id: 'lorenzo', name: 'LORENZO "WRENCHES" BRACCIANO', short: 'LORENZO', showFullName: true,
    tagline: 'STANDARD PLUMBING PROCEDURE.',
    speedMult: 1.0, scoreMult: 1.0, jumpMult: 1.08, maxJumps: 1, canFloat: false,
    startShield: 0, magnetRadius: 0, variableJump: true,
    ability: { type: 'stomp', cooldown: 2.5, label: 'STOMP / SMASH', callout: 'STOMP + SMASH' }, stomp: true,
    joke: 'PRODUCES INCREASINGLY INAPPROPRIATE PLUMBING TOOLS.',
    skillLabel: 'HIGH JUMP',
    skillDesc: 'JUMPS 12% HIGHER',
    powerDesc: 'STOMPS OR SMASHES GROUND HAZARDS',
    abilityDesc: 'AIR STOMP OR GROUNDED WRENCH SMASH.',
    sidegrades: [
      { id: 'shockwave', name: 'SHOCK STOMP', desc: 'STOMP SHOCKWAVE BREAKS NEARBY OBSTACLES BUT SCATTERS NEARBY COINS.' },
    ],
  },
  {
    id: 'gnash', name: 'GNASH THE NEEDLEMOUSE', short: 'GNASH',
    tagline: 'ALREADY THERE. WAITING.',
    speedMult: 1.15, scoreMult: 1.0, jumpMult: 1.06, maxJumps: 1, canFloat: false,
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
    // The cliffhanger jump is Lorenzo's trade taken further — x1.10 against
    // his x1.08 — and the difference lives in data the same way the three
    // shooters differ by shotSpeed/shotSize rather than by id checks. Both came
    // down when jumpMult stopped scaling launch speed: the pair used to read
    // 1.15/1.10 and BUY 75px/69px, which is the overstatement jumpV was
    // inverted to end.
    id: 'clara', name: 'CLARA VAULT, MALL RAIDER', short: 'CLARA', subtitle: 'MALL RAIDER',
    tagline: 'CHAPTER ONE: SHE ARRIVED.',
    speedMult: 1.0, scoreMult: 1.0, jumpMult: 1.10, maxJumps: 1, canFloat: false,
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
    //
    // x0.85 IS WHAT THE SECOND JUMP COSTS, and it is the lowest single hop in
    // the cast on purpose. At x1.00 she reached 98u against Clara's 63 — the
    // best vertical in the game, in a column where her card asked for nothing —
    // so the double was pure upside and every hop was free. At x0.85 her first
    // jump clears 48u, eight under B-33P's, and the pair still stack to 83u:
    // she keeps the highest ceiling in the cast by 21u and now has to spend
    // something to reach it. The second jump is a TOOL rather than a bonus,
    // which is the shape "JUMPS TWICE" was always describing.
    //
    // The floor was checked, not guessed. The tallest thing anyone jumps OVER
    // is the 18px bollard (tests/cast.js), and the spawner's declared worst
    // case is a deliberately pessimistic 37u apex nobody in the cast is; 48u
    // clears both with room. Her airtime lands at 0.656s, still above Grumpos'
    // 0.636s, so the shortest jumper is not also the worst hang time.
    id: 'kiko', name: 'KIKO, JURISDICTION PENDING', short: 'KIKO', subtitle: 'JURISDICTION PENDING',
    tagline: 'NOBODY REPORTED IT. I NOTICED.',
    speedMult: 1.0, scoreMult: 1.0, jumpMult: 0.85, maxJumps: 2, canFloat: false,
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
    speedMult: 0.95, scoreMult: 1.0, jumpMult: 1.04, maxJumps: 1, canFloat: false,
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

// WHO CAN ANSWER A THING AT A DISTANCE.
//
// Four of the eight, and the beat cabinet's shootable card box (see
// OBSTACLES.cardBox) is laid for those four and nobody else — a prop whose only
// answer is a weapon half the cast does not carry is not a rhythm figure, it is
// a hero check, so the lane simply does not deal one to a hero who cannot play
// it (BeatSpawner.canShoot).
//
// By ABILITY TYPE rather than by id, which is the same rule the three shooters
// already follow for shotSpeed/shotSize: 'shoot' is Clara's pistols, B-33P's
// lemon and Kiko's warning shot, and 'axe' is Grumpos' — a thrown weapon that
// comes back, but one that reaches.
//
// THE ROCKET FIST IS IN HERE since the box moved to a beat out. It was kept out
// on range: a thrown weapon parks where it stopped mattering (see
// updateProjectiles) — the axe at 0.55s of flight, the fist at 0.42 — and
// against a box standing 2.4 beats down the road (230px at RHYTHM BANKRUPTCY's
// 208px/s) the fist stopped fifty-four px short, which would have had it
// visibly hang in mid-air in front of a box it had just opened. The box now
// stands 1.05 beats out (BOX_LEAD_BEATS, ~94px) and the fist's 176px covers it
// with room, so Ray M'N is dealt the box like the other four.
export const RANGED_ABILITY_TYPES = new Set(['shoot', 'axe', 'fist']);

/** Can this hero destroy something in front of them without touching it? */
export function heroShoots(id) {
  return RANGED_ABILITY_TYPES.has(HERO_BY_ID[id]?.ability?.type);
}
