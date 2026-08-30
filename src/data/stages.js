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
  // Scripted pits: [{at, w}], `at` a fraction of stage distance the way
  // applianceAt is. The spawner may still lay a gap of its own from the
  // cabinet's pattern list; these are the ones a stage GUARANTEES, in the order
  // and the places its author chose. See RunState.spawnScriptedPits.
  //
  // A pit that names `jumps` instead of `w` is a CROSSING: a break too wide to
  // clear, with stones standing in it, taken in that many jumps. Its width is
  // derived rather than authored — the hops and the stones are sized in seconds
  // of lane travel against the speed the run will be doing when it gets there
  // (see crossingLayout in game/routes.js), so `{ at: 0.7, jumps: 4 }` is the
  // same four jumps in world 1 and on UNPLUGGED, and there is no width here to
  // fall out of step with the geometry. The fill is spikes whatever the cabinet
  // pours into its ordinary holes.
  pits: opts.pits || null,
  // Scripted rewind capsule, a fraction of stage distance like applianceAt.
  // The power-up's guaranteed introduction on every device — the drip can
  // also deal one anywhere, but only the dice say when.
  rewindAt: opts.rewindAt ?? null,
});

export const STAGES = [
  // ACT I ---------------------------------------------------------------------
  S('plumber', 1,
    { type: 'reach', desc: 'REACH THE BREAKER. FLIP IT. SAVE EVERYTHING.' },
    { type: 'coins', n: 20, desc: 'COLLECT 20 COINS' },
    { act: 'ACT I. THE ARCADE GOES DARK. THE EMERGENCY LIGHTING IS ALSO UNPLUGGED.',
      introBy: 'lorenzo', intro: 'THESE PIPES KNOW ME. WE HAVE HISTORY. MOST OF IT IS LEGAL.',
      speedMult: 0.9 }),
  // The rewind capsule's guaranteed introduction, and this stage on purpose:
  // its challenge is TAKE NO DAMAGE, which is the run where undoing three
  // seconds is worth the most and teaches itself. 0.15 is early — before the
  // run settles into a rhythm, the same instinct as plumber-3's first pit at
  // 0.12 — so the player meets it while nothing else is asking for attention.
  // Every device sees it, keyboard included: the banked one-shot is a
  // different move from holding Left, and the stage that teaches it should
  // not depend on what you are holding the game in.
  S('plumber', 2,
    { type: 'targets', n: 6, targetType: 'qcrate', desc: 'BREAK 6 !-CRATES. THE ! MEANS HIT IT.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { speedMult: 0.95, rewindAt: 0.15 }),
  // THREE TAR PITS, at fixed fractions of the stage. `pits` is a scripted
  // placement, not a pattern: a cabinet's pattern list is shuffled by the
  // spawner, so a gap added there turns up wherever the dice fall and might
  // never turn up at all — and the first one has to be EARLY, before the fuse
  // run has settled into a rhythm, or it is not teaching anything.
  //
  // 0.12 / 0.45 / 0.78 puts one in each third and straddles both checkpoints
  // (1/3 and 2/3), so a player who dies in the second or third pit does not
  // replay the first. The last sits well clear of the finishing straight.
  //
  // Stage 3 and not 1 or 2 for the ordinary reason act I ramps: this is the
  // stage that already carries the fuse, and a fatal hazard belongs on the run
  // that is already asking you to be careful.
  S('plumber', 3,
    { type: 'fuse', desc: 'CARRY THE FRAGILE FUSE. IT IS VERY FRAGILE. IT KNOWS.' },
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' },
    { speedMult: 1.0, pits: [{ at: 0.12, w: 52 }, { at: 0.45, w: 58 }, { at: 0.70, jumps: 4 }] }),
  S('speed', 1,
    { type: 'reach', desc: 'REACH THE EXIT BEFORE THE ROAD FILES FOR COLLAPSE.' },
    { type: 'boosts', n: 4, desc: 'HIT 4 BOOST PADS' },
    { introBy: 'gnash', intro: 'ALREADY FINISHED THIS ONE. I AM WAITING AT THE END. TAKE YOUR TIME.' }),
  // The collapsing road finally collapses. Both holes sit ≥0.15 of the stage
  // away from the loop set piece at 0.55 (see LOOP.at), which clears its guard
  // lane by a wide margin, and neither lands on a checkpoint (1/3, 2/3).
  S('speed', 2,
    { type: 'chase', n: 2, desc: 'CATCH THE CLOWN-COPTER 2 TIMES. IT IS UNDERINSURED.' },
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' },
    { pits: [{ at: 0.25, w: 52 }, { at: 0.72, w: 56 }] }),
  S('speed', 3,
    { type: 'reach', desc: 'FINISH THE LAP. GNASH HAS OPINIONS ABOUT YOUR PACE.' },
    { type: 'boosts', n: 5, desc: 'HIT 5 BOOST PADS' },
    { pits: [{ at: 0.30, w: 60 }, { at: 0.80, w: 64 }] }),
  S('neon', 1,
    { type: 'targets', n: 5, targetType: 'target', desc: 'DESTROY 5 TARGETS. THEY ARE VERY DESTROYABLE.' },
    { type: 'coins', n: 20, desc: 'COLLECT 20 COINS' },
    { introBy: 'b33p', intro: 'I FEEL AT HOME HERE. I AM ALSO STILL LOW ON CYAN.' }),
  S('neon', 2,
    { type: 'cords', n: 4, desc: 'RECOVER 4 EXTENSION CORD PIECES. THE CORD WAS SHREDDED. RUDELY.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  // Neon has no routes and no loop, so the only geometry these two dodge is
  // the finishing straight — and 0.70 is well clear of it.
  S('neon', 3,
    { type: 'reach', desc: 'REACH THE END. SOMETHING ANGRY AND AIRBORNE AWAITS.' },
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' },
    { pits: [{ at: 0.35, w: 56 }, { at: 0.70, w: 60 }] }),
  // ACT II --------------------------------------------------------------------
  S('frost', 1,
    { type: 'reach', desc: 'CROSS THE ICE. THE ICE IS NOT YOUR FRIEND. IT TOLD US.' },
    { type: 'coins', n: 30, desc: 'COLLECT 30 COINS' },
    { act: 'ACT II. THE EXTENSION CRISIS. EVERYONE IS COLD AND BRAVE.' }),
  // Act II/III pits, and which stages get NONE, on purpose: the blackout
  // stages (crypt-1/3 — a fatal hole inside a light radius is a wall, not a
  // read) and the escort stages (crypt-2, office-3 — the residents' pathing
  // has never met a hole). Every cabinet's stage 1 stays pit-free except
  // office-1, whose act runs at tierMax 2 from the first stage anyway.
  S('frost', 2,
    { type: 'cords', n: 4, desc: 'RECOVER 4 CORD PIECES FROZEN IN THE FORTRESS.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { pits: [{ at: 0.40, w: 56 }] }),
  // The fuse run over holes, on ice — plumber-3's design graduated. Both sit
  // clear of the checkpoints (1/3, 2/3) and the finishing straight.
  S('frost', 3,
    { type: 'fuse', desc: 'CARRY THE FUSE ACROSS THE ICE. YES. THE SLIPPERY ICE.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { pits: [{ at: 0.28, w: 60 }, { at: 0.74, w: 64 }] }),
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
  // THE FIRST CROSSING. Four jumps over a spiked break on three stones, at 0.70
  // — just past the second checkpoint (2/3), which is the whole of why it is
  // there rather than in the middle: a set piece that can take several attempts
  // to read has to hand back a short replay, or the cost of learning it is the
  // stage before it.
  //
  // Rhythm and not one of the Act II stages either side of it: crypt runs its
  // levels in a light radius (a fatal hole you cannot see coming is a wall) and
  // frost is ice, where a landing you do not choose the end of is not a landing.
  // A beat cabinet is the honest home for a sequence of four timed jumps.
  S('rhythm', 2,
    { type: 'reach', desc: 'SURVIVE THE CHORUS. THE BAND IS IN DEBT.' },
    { type: 'onbeat', n: 14, desc: '14 ON-BEAT ACTIONS' },
    { pits: [{ at: 0.35, w: 56 }, { at: 0.70, jumps: 4 }] }),
  S('rhythm', 3,
    { type: 'chase', n: 2, desc: 'CHASE THE COPTER. IT IS SOMEHOW ON BEAT.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { pits: [{ at: 0.30, w: 60 }, { at: 0.75, w: 64 }] }),
  // ACT III -------------------------------------------------------------------
  S('cardboard', 1,
    { type: 'reach', desc: 'CROSS THE KINGDOM BEFORE IT FINISHES COLLAPSING.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' },
    { act: 'ACT III. THE OUTLET AT THE END OF EVERYTHING. THE CASTLE IS FOUR INCHES TALL.' }),
  // Act III's tierMax is 2 on every stage, so the bags cannot ramp — the pits
  // are the progression instead: none on cardboard-1, two on -2, three on -3.
  S('cardboard', 2,
    { type: 'escape', desc: 'ESCAPE THE FOLDING WAVE. DO NOT BECOME A FLAP.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' },
    { pits: [{ at: 0.30, w: 56 }, { at: 0.70, w: 60 }] }),
  S('cardboard', 3,
    { type: 'chase', n: 3, desc: 'CATCH THE COPTER. IT IS HELD UP BY A VISIBLE HAND.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' },
    { pits: [{ at: 0.25, w: 60 }, { at: 0.55, w: 64 }, { at: 0.80, w: 68 }] }),
  S('office', 1,
    { type: 'reach', desc: 'GET THROUGH THE OFFICE. AVOID EYE CONTACT WITH MEETINGS.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' },
    { intro: 'THE PRINTERS SMELL FEAR. AND TONER. MOSTLY TONER.',
      pits: [{ at: 0.45, w: 52 }] }),
  S('office', 2,
    { type: 'targets', n: 5, targetType: 'printer', desc: 'DESTROY 5 HOSTILE PRINTERS. HR HAS APPROVED THIS.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { pits: [{ at: 0.40, w: 56 }] }),
  S('office', 3,
    { type: 'rescue', n: 4, desc: 'ESCORT 4 CABINET RESIDENTS OUT OF A MANDATORY MEETING.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' }),
  S('surge', 1,
    { type: 'reach', desc: 'EVERYTHING AT ONCE. KEEP RUNNING.' },
    { type: 'coins', n: 40, desc: 'COLLECT 40 COINS' },
    { intro: 'THE CABINETS ARE BLEEDING TOGETHER. NOBODY IS ADDRESSING THIS.' }),
  // The crossing again, on the cabinet that is everything at once — and again
  // just past a checkpoint, at 0.70. Twice in the game and both times in the
  // second half of a stage: it is a set piece, and a set piece that turns up
  // every other level is furniture.
  S('surge', 2,
    { type: 'cords', n: 6, desc: 'RECOVER THE FINAL 6 CORD PIECES. THE CORD IS ALMOST WHOLE.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { pits: [{ at: 0.45, w: 60 }, { at: 0.70, jumps: 4 }] }),
  // The finale finally has ground that gives way under it — "everything at
  // once" was 116 patterns on a road with no holes.
  S('surge', 3,
    { type: 'escape', desc: 'OUTRUN THE UNPLUGGENING ITSELF. THE SOCKET IS CLOSE.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { pits: [{ at: 0.25, w: 60 }, { at: 0.60, w: 64 }, { at: 0.82, w: 68 }] }),
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));
export function stagesForCabinet(cabId) { return STAGES.filter((s) => s.cabinet === cabId); }

// Plug thresholds (from the spec).
export const UNLOCKS = {
  speed: 2, neon: 5, frost: 12, crypt: 16, rhythm: 20,
  cardboard: 28, office: 34, surge: 40, finale: 45,
};
