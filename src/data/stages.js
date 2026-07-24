// 27 campaign stages: mission, optional challenge, appliance placement.
// Fast & furious: Act I stages ~1 minute, ramping to ~2 minutes by Act III.
// Appliance spots are FIXED per stage (fraction of stage distance + height),
// so memory and guides work; connective obstacle runs are seeded per attempt.

const CAB_DURATION = {
  plumber: 60, speed: 60, neon: 60,
  frost: 90, crypt: 90, rhythm: 90,
  cardboard: 120, office: 120, surge: 120,
};

const S = (cab, idx, mission, challenge, opts = {}) => ({
  id: `${cab}-${idx}`,
  cabinet: cab,
  index: idx,
  mission,             // {type, n?, desc}
  challenge,           // {type, n, desc}
  durationSec: opts.durationSec || CAB_DURATION[cab],
  applianceAt: opts.applianceAt ?? (0.55 + 0.1 * ((idx * 7) % 3)), // fraction of distance
  applianceHigh: opts.applianceHigh ?? (idx % 2 === 0),
  // Two separate openers, because they are two different events and a stage may
  // have both. `act` is the full-screen milestone card: it freezes the world for
  // two seconds before the run starts. `intro` is a speech bubble that rides the
  // first four seconds of actual running.
  //
  // These used to be one field, with run.js deciding which it was by testing
  // whether the string began with 'ACT ' — so the difference between a frozen
  // two-second card and a line of banter was a prefix, invisible here, and a
  // stage could not have one of each.
  act: opts.act || null,
  intro: opts.intro || null,
  introBy: opts.introBy || null,   // speaker id for the intro bubble; null = narrator
  speedMult: opts.speedMult ?? 1,  // per-stage speed override (1 = 100% of cabinet speed)
});

export const STAGES = [
  // ACT I ---------------------------------------------------------------------
  S('plumber', 1,
    { type: 'reach', desc: 'REACH THE BREAKER. FLIP IT. SAVE EVERYTHING.' },
    { type: 'coins', n: 20, desc: 'COLLECT 20 COINS' },
    { act: 'ACT I. THE ARCADE GOES DARK. THE EMERGENCY LIGHTING IS ALSO UNPLUGGED.',
      introBy: 'lorenzo', intro: 'THESE PIPES KNOW ME. WE HAVE HISTORY. MOST OF IT IS LEGAL.',
      speedMult: 0.9 }),
  S('plumber', 2,
    { type: 'targets', n: 6, targetType: 'qcrate', desc: 'BREAK 6 !-CRATES. THE ! MEANS HIT IT.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { speedMult: 0.95 }),
  S('plumber', 3,
    { type: 'fuse', desc: 'CARRY THE FRAGILE FUSE. IT IS VERY FRAGILE. IT KNOWS.' },
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' },
    { speedMult: 1.0 }),
  S('speed', 1,
    { type: 'reach', desc: 'REACH THE EXIT BEFORE THE ROAD FILES FOR COLLAPSE.' },
    { type: 'boosts', n: 4, desc: 'HIT 4 BOOST PADS' },
    { introBy: 'gnash', intro: 'ALREADY FINISHED THIS ONE. I AM WAITING AT THE END. TAKE YOUR TIME.' }),
  S('speed', 2,
    { type: 'chase', n: 2, desc: 'CATCH THE CLOWN-COPTER 2 TIMES. IT IS UNDERINSURED.' },
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' }),
  S('speed', 3,
    { type: 'reach', desc: 'FINISH THE LAP. GNASH HAS OPINIONS ABOUT YOUR PACE.' },
    { type: 'boosts', n: 5, desc: 'HIT 5 BOOST PADS' }),
  S('neon', 1,
    { type: 'targets', n: 5, targetType: 'target', desc: 'DESTROY 5 TARGETS. THEY ARE VERY DESTROYABLE.' },
    { type: 'coins', n: 20, desc: 'COLLECT 20 COINS' },
    { introBy: 'b33p', intro: 'I FEEL AT HOME HERE. I AM ALSO STILL LOW ON CYAN.' }),
  S('neon', 2,
    { type: 'cords', n: 4, desc: 'RECOVER 4 EXTENSION CORD PIECES. THE CORD WAS SHREDDED. RUDELY.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  S('neon', 3,
    { type: 'reach', desc: 'REACH THE END. SOMETHING ANGRY AND AIRBORNE AWAITS.' },
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' }),
  // ACT II --------------------------------------------------------------------
  S('frost', 1,
    { type: 'reach', desc: 'CROSS THE ICE. THE ICE IS NOT YOUR FRIEND. IT TOLD US.' },
    { type: 'coins', n: 30, desc: 'COLLECT 30 COINS' },
    { act: 'ACT II. THE EXTENSION CRISIS. EVERYONE IS COLD AND BRAVE.' }),
  S('frost', 2,
    { type: 'cords', n: 4, desc: 'RECOVER 4 CORD PIECES FROZEN IN THE FORTRESS.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  S('frost', 3,
    { type: 'fuse', desc: 'CARRY THE FUSE ACROSS THE ICE. YES. THE SLIPPERY ICE.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  S('crypt', 1,
    { type: 'blackout', desc: 'SURVIVE THE BLACKOUT. THE DARK IS BUDGETARY.' },
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' },
    { introBy: 'gary', intro: 'MY FORMER COWORKERS ARE WAVING. I OWE SEVERAL OF THEM SHIFTS.' }),
  S('crypt', 2,
    { type: 'rescue', n: 3, desc: 'ESCORT 3 CONFUSED CABINET RESIDENTS TO SAFETY.' },
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' }),
  S('crypt', 3,
    { type: 'blackout', desc: 'SURVIVE A LONGER BLACKOUT. THE BUDGET GOT WORSE.' },
    { type: 'coins', n: 30, desc: 'COLLECT 30 COINS' }),
  S('rhythm', 1,
    { type: 'reach', desc: 'RUN TO THE BEAT. OR NEAR THE BEAT. THE BEAT IS FLEXIBLE.' },
    { type: 'onbeat', n: 10, desc: '10 ON-BEAT ACTIONS' },
    { intro: 'THIS CABINET OWES MONEY TO EVERY OTHER CABINET.' }),
  S('rhythm', 2,
    { type: 'reach', desc: 'SURVIVE THE CHORUS. THE BAND IS IN DEBT.' },
    { type: 'onbeat', n: 14, desc: '14 ON-BEAT ACTIONS' }),
  S('rhythm', 3,
    { type: 'chase', n: 2, desc: 'CHASE THE COPTER. IT IS SOMEHOW ON BEAT.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  // ACT III -------------------------------------------------------------------
  S('cardboard', 1,
    { type: 'reach', desc: 'CROSS THE KINGDOM BEFORE IT FINISHES COLLAPSING.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' },
    { act: 'ACT III. THE OUTLET AT THE END OF EVERYTHING. THE CASTLE IS FOUR INCHES TALL.' }),
  S('cardboard', 2,
    { type: 'escape', desc: 'ESCAPE THE FOLDING WAVE. DO NOT BECOME A FLAP.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' }),
  S('cardboard', 3,
    { type: 'chase', n: 3, desc: 'CATCH THE COPTER. IT IS HELD UP BY A VISIBLE HAND.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' }),
  S('office', 1,
    { type: 'reach', desc: 'GET THROUGH THE OFFICE. AVOID EYE CONTACT WITH MEETINGS.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' },
    { intro: 'THE PRINTERS SMELL FEAR. AND TONER. MOSTLY TONER.' }),
  S('office', 2,
    { type: 'targets', n: 5, targetType: 'printer', desc: 'DESTROY 5 HOSTILE PRINTERS. HR HAS APPROVED THIS.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  S('office', 3,
    { type: 'rescue', n: 4, desc: 'ESCORT 4 CABINET RESIDENTS OUT OF A MANDATORY MEETING.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' }),
  S('surge', 1,
    { type: 'reach', desc: 'EVERYTHING AT ONCE. KEEP RUNNING.' },
    { type: 'coins', n: 40, desc: 'COLLECT 40 COINS' },
    { intro: 'THE CABINETS ARE BLEEDING TOGETHER. NOBODY IS ADDRESSING THIS.' }),
  S('surge', 2,
    { type: 'cords', n: 6, desc: 'RECOVER THE FINAL 6 CORD PIECES. THE CORD IS ALMOST WHOLE.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  S('surge', 3,
    { type: 'escape', desc: 'OUTRUN THE UNPLUGGENING ITSELF. THE SOCKET IS CLOSE.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));
export function stagesForCabinet(cabId) { return STAGES.filter((s) => s.cabinet === cabId); }

// Plug thresholds (from the spec).
export const UNLOCKS = {
  speed: 2, neon: 5, frost: 12, crypt: 16, rhythm: 20,
  cardboard: 28, office: 34, surge: 40, finale: 45,
};
