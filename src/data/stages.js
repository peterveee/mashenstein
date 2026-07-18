// 27 campaign stages: mission, optional challenge, appliance placement.
// Fast & furious: Act I stages ~2 minutes, ramping to ~3 minutes by Act III.
// Appliance spots are FIXED per stage (fraction of stage distance + height),
// so memory and guides work; connective obstacle runs are seeded per attempt.

const CAB_DURATION = {
  plumber: 120, speed: 120, neon: 120,
  frost: 150, crypt: 150, rhythm: 150,
  cardboard: 180, office: 180, surge: 180,
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
  intro: opts.intro || null,
});

export const STAGES = [
  // ACT I ---------------------------------------------------------------------
  S('plumber', 1,
    { type: 'reach', desc: 'REACH THE BREAKER. FLIP IT. SAVE EVERYTHING.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' },
    { intro: 'THE FIRST CABINET FLICKERS. LORENZO SAYS THE PIPES "KNOW HIM."' }),
  S('plumber', 2,
    { type: 'targets', n: 8, targetType: 'qcrate', desc: 'BREAK 8 ?-CRATES. THE ? IS RHETORICAL.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  S('plumber', 3,
    { type: 'fuse', desc: 'CARRY THE FRAGILE FUSE. IT IS VERY FRAGILE. IT KNOWS.' },
    { type: 'tags', n: 4, desc: 'TAG 4 TIMES' }),
  S('speed', 1,
    { type: 'reach', desc: 'REACH THE EXIT BEFORE THE ROAD FILES FOR COLLAPSE.' },
    { type: 'boosts', n: 6, desc: 'HIT 6 BOOST PADS' },
    { intro: 'GNASH HAS ALREADY FINISHED THIS LEVEL. HE IS WAITING AT THE END. SMUG.' }),
  S('speed', 2,
    { type: 'chase', n: 2, desc: 'CATCH THE CLOWN-COPTER 2 TIMES. IT IS UNDERINSURED.' },
    { type: 'coins', n: 45, desc: 'COLLECT 45 COINS' }),
  S('speed', 3,
    { type: 'combo', n: 5, desc: 'KEEP A RELAY COMBO OF 5. TEAMWORK, BUT FAST.' },
    { type: 'perfects', n: 2, desc: '2 PERFECT TAGS' }),
  S('neon', 1,
    { type: 'targets', n: 7, targetType: 'target', desc: 'DESTROY 7 TARGETS. THEY ARE VERY DESTROYABLE.' },
    { type: 'coins', n: 40, desc: 'COLLECT 40 COINS' },
    { intro: 'B-33P FEELS AT HOME HERE. HE IS STILL LOW ON CYAN.' }),
  S('neon', 2,
    { type: 'cords', n: 4, desc: 'RECOVER 4 EXTENSION CORD PIECES. THE CORD WAS SHREDDED. RUDELY.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  S('neon', 3,
    { type: 'reach', desc: 'REACH THE END. SOMETHING ANGRY AND AIRBORNE AWAITS.' },
    { type: 'tags', n: 5, desc: 'TAG 5 TIMES' }),
  // ACT II --------------------------------------------------------------------
  S('frost', 1,
    { type: 'reach', desc: 'CROSS THE ICE. THE ICE IS NOT YOUR FRIEND. IT TOLD US.' },
    { type: 'coins', n: 45, desc: 'COLLECT 45 COINS' },
    { intro: 'ACT II. THE EXTENSION CRISIS. EVERYONE IS COLD AND BRAVE.' }),
  S('frost', 2,
    { type: 'cords', n: 4, desc: 'RECOVER 4 CORD PIECES FROZEN IN THE FORTRESS.' },
    { type: 'perfects', n: 2, desc: '2 PERFECT TAGS' }),
  S('frost', 3,
    { type: 'fuse', desc: 'CARRY THE FUSE ACROSS THE ICE. YES. THE SLIPPERY ICE.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  S('crypt', 1,
    { type: 'blackout', desc: 'SURVIVE THE BLACKOUT. THE DARK IS BUDGETARY.' },
    { type: 'coins', n: 40, desc: 'COLLECT 40 COINS' },
    { intro: 'GARY\'S FORMER COWORKERS WAVE. HE OWES SEVERAL OF THEM SHIFTS.' }),
  S('crypt', 2,
    { type: 'rescue', n: 3, desc: 'ESCORT 3 CONFUSED CABINET RESIDENTS TO SAFETY.' },
    { type: 'tags', n: 5, desc: 'TAG 5 TIMES' }),
  S('crypt', 3,
    { type: 'blackout', desc: 'SURVIVE A LONGER BLACKOUT. THE BUDGET GOT WORSE.' },
    { type: 'perfects', n: 3, desc: '3 PERFECT TAGS' }),
  S('rhythm', 1,
    { type: 'reach', desc: 'RUN TO THE BEAT. OR NEAR THE BEAT. THE BEAT IS FLEXIBLE.' },
    { type: 'onbeat', n: 12, desc: '12 ON-BEAT ACTIONS' },
    { intro: 'THIS CABINET OWES MONEY TO EVERY OTHER CABINET.' }),
  S('rhythm', 2,
    { type: 'combo', n: 6, desc: 'HOLD A RELAY COMBO OF 6. MUSICALLY.' },
    { type: 'onbeat', n: 18, desc: '18 ON-BEAT ACTIONS' }),
  S('rhythm', 3,
    { type: 'chase', n: 2, desc: 'CHASE THE COPTER. IT IS SOMEHOW ON BEAT.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  // ACT III -------------------------------------------------------------------
  S('cardboard', 1,
    { type: 'reach', desc: 'CROSS THE KINGDOM BEFORE IT FINISHES COLLAPSING.' },
    { type: 'coins', n: 50, desc: 'COLLECT 50 COINS' },
    { intro: 'ACT III. THE OUTLET AT THE END OF EVERYTHING. THE CASTLE IS FOUR INCHES TALL.' }),
  S('cardboard', 2,
    { type: 'escape', desc: 'ESCAPE THE FOLDING WAVE. DO NOT BECOME A FLAP.' },
    { type: 'tags', n: 6, desc: 'TAG 6 TIMES' }),
  S('cardboard', 3,
    { type: 'chase', n: 3, desc: 'CATCH THE COPTER. IT IS HELD UP BY A VISIBLE HAND.' },
    { type: 'perfects', n: 3, desc: '3 PERFECT TAGS' }),
  S('office', 1,
    { type: 'reach', desc: 'GET THROUGH THE OFFICE. AVOID EYE CONTACT WITH MEETINGS.' },
    { type: 'coins', n: 50, desc: 'COLLECT 50 COINS' },
    { intro: 'THE PRINTERS SMELL FEAR. AND TONER. MOSTLY TONER.' }),
  S('office', 2,
    { type: 'targets', n: 7, targetType: 'printer', desc: 'DESTROY 7 HOSTILE PRINTERS. HR HAS APPROVED THIS.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  S('office', 3,
    { type: 'rescue', n: 4, desc: 'ESCORT 4 CABINET RESIDENTS OUT OF A MANDATORY MEETING.' },
    { type: 'tags', n: 6, desc: 'TAG 6 TIMES' }),
  S('surge', 1,
    { type: 'reach', desc: 'EVERYTHING AT ONCE. KEEP RUNNING.' },
    { type: 'coins', n: 55, desc: 'COLLECT 55 COINS' },
    { intro: 'THE CABINETS ARE BLEEDING TOGETHER. NOBODY IS ADDRESSING THIS.' }),
  S('surge', 2,
    { type: 'cords', n: 6, desc: 'RECOVER THE FINAL 6 CORD PIECES. THE CORD IS ALMOST WHOLE.' },
    { type: 'perfects', n: 3, desc: '3 PERFECT TAGS' }),
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
