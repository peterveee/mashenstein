// 27 campaign stages: mission, optional challenge, appliance placement.
// Fast & furious: Act I stages ~1 minute, ramping to ~2 minutes by Act III.
// Appliance spots are FIXED per stage (fraction of stage distance + height),
// so memory and guides work; connective obstacle runs are seeded per attempt.

const CAB_DURATION = {
  plumber: 60, speed: 60, rhythm: 60,
  frost: 90, crypt: 90, neon: 90,
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
  // WHERE A FATAL HOLE MAY STAND, and it is the one rule every `pits` entry on
  // this page obeys.
  //
  // A pit kills, and a death goes back to the last checkpoint — which is at a
  // third and two thirds of the stage and nowhere else. So the real cost of a
  // hole is not the hole, it is the stretch of level you replay to get back to
  // it, and that stretch is `at` minus whichever checkpoint is behind it, in
  // SECONDS of play. Twelve of these were authored on gut feel and the worst of
  // them (cardboard-3 at 0.55) charged twenty-six seconds a death: you lose to
  // a hole and then run a third of the level again to reach it.
  //
  //   at least 1.5s after the checkpoint — the restore drops you running, and a
  //                 hole immediately in front of you is not a hazard you read,
  //                 it is one you land in.
  //   at most 10s after it — one honest run-up. Past that a death stops being a
  //                 setback and starts being an errand.
  //
  // Holes before the FIRST checkpoint replay from the start of the stage, so
  // their budget is measured from zero: 0.06 of a two-minute stage is seven
  // seconds, and 0.25 of one is thirty. tests/spike-crossing.js checks all of
  // this, every stage, every pit.
  //
  // Scripted pits: [{at, w}], `at` a fraction of stage distance the way
  // applianceAt is. The spawner may still lay a gap of its own from the
  // cabinet's pattern list; these are the ones a stage GUARANTEES, in the order
  // and the places its author chose. See RunState.spawnScriptedPits.
  //
  // A pit that names `jumps` instead of `w` is a CROSSING: a break too wide to
  // clear, with stones standing in it, taken in that many jumps. Its width is
  // derived rather than authored — the hops and the stones are sized in seconds
  // of lane travel against the speed the run will be doing when it gets there
  // (see crossingLayout in game/routes.js), so `{ at: 0.7, jumps: 5 }` is the
  // same five jumps in world 1 and on UNPLUGGED, and there is no width here to
  // fall out of step with the geometry.
  //
  // `fill` names what is at the bottom of it — 'spikes' by default, 'gears' for
  // the works — and it overrides the cabinet's own material either way, because
  // the fill is the only thing that says the sequence is fatal before the first
  // hop. The road rises over every crossing whatever is in it (see
  // CROSSING_ROAD_RISE), so the break has real depth on screen.
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
  // THE WORKS. Plumber's underground section used to run from 0.18 to 0.38 —
  // twelve seconds of it — and half of that is now a crossing over the gearbox
  // instead: the tunnel is cut to six seconds (see cabinets.js) and this takes
  // the ground it gave up. The two read as one idea rather than two, which is
  // the point of putting them back to back: you go UNDER the floor, come up,
  // and then the floor is missing and you can see what was down there.
  //
  // At 0.36 rather than at the tunnel's own 0.18 for the reason every hole on
  // this page is placed where it is: just past a checkpoint (1/3), so learning
  // it costs a second and a half of replay rather than a third of the stage.
  //
  // FOUR jumps and not five, and the number is the cabinet's rather than a
  // taste: plumber is a busy stage — a staircase at 0.46, a fork at 0.58, the
  // tunnel in front of it — and a crossing owns a clear lane either side of
  // itself. Five jumps here reached far enough to swallow the four-step
  // staircase whole (see buildRoutes' overlap guard), which trades a set piece
  // for a set piece. Four fits in the gap the tunnel gave up with both of its
  // neighbours intact, and being the smallest crossing in the game suits the
  // one in Act I.
  S('plumber', 2,
    { type: 'targets', n: 6, targetType: 'qcrate', desc: 'BREAK 6 !-CRATES. THE ! MEANS HIT IT.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { speedMult: 0.95, rewindAt: 0.15, pits: [{ at: 0.36, jumps: 4, fill: 'gears' }] }),
  // THREE TAR PITS, at fixed fractions of the stage. `pits` is a scripted
  // placement, not a pattern: a cabinet's pattern list is shuffled by the
  // spawner, so a gap added there turns up wherever the dice fall and might
  // never turn up at all — and the first one has to be EARLY, before the fuse
  // run has settled into a rhythm, or it is not teaching anything.
  //
  // 0.12 / 0.45 / 0.78 puts one in each third, each of them a run-up past the
  // checkpoint behind it — seven seconds of replay apiece, which is the budget
  // the header above describes. These three were already inside it when that
  // rule was written down; most of the game's holes were not.
  //
  // Stage 3 and not 1 or 2 for the ordinary reason act I ramps: this is the
  // stage that already carries the fuse, and a fatal hazard belongs on the run
  // that is already asking you to be careful.
  S('plumber', 3,
    { type: 'fuse', desc: 'CARRY THE FRAGILE FUSE. IT IS VERY FRAGILE. IT KNOWS.' },
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' },
    { speedMult: 1.0, pits: [{ at: 0.12, w: 52 }, { at: 0.45, w: 58 }, { at: 0.78, w: 64 }] }),
  S('speed', 1,
    { type: 'reach', desc: 'REACH THE EXIT BEFORE THE ROAD FILES FOR COLLAPSE.' },
    { type: 'boosts', n: 4, desc: 'HIT 4 BOOST PADS' },
    { introBy: 'gnash', intro: 'ALREADY FINISHED THIS ONE. I AM WAITING AT THE END. TAKE YOUR TIME.' }),
  // The collapsing road finally collapses. Both holes clear the loop set piece
  // at 0.55 (see LOOP.at) by a third of the stage or more, so neither can be
  // laid inside its guard lane — and 0.14 rather than the 0.25 this used to be,
  // which charged fifteen seconds of replay for a hole in the opening third.
  S('speed', 2,
    { type: 'chase', n: 2, desc: 'CATCH THE CLOWN-COPTER 2 TIMES. IT IS UNDERINSURED.' },
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' },
    { pits: [{ at: 0.14, w: 52 }, { at: 0.72, w: 56 }] }),
  // THE THIRD CROSSING, and the one the cabinet's own furniture argues for: a
  // road that files for collapse should have a stretch where it has actually
  // collapsed. At 0.70 it is clear of the loop-de-loop at 0.55 by 0.15 of the
  // stage — the same distance the pit it replaces kept — and two seconds past
  // the second checkpoint.
  //
  // It REPLACES the 0.80 pit rather than joining it. That hole was doing the
  // same job in the same third of the stage, and a 60-second lap carrying a
  // loop, a crossing and two ordinary holes is a stage with no lane left in it.
  S('speed', 3,
    { type: 'reach', desc: 'FINISH THE LAP. GNASH HAS OPINIONS ABOUT YOUR PACE.' },
    { type: 'boosts', n: 5, desc: 'HIT 5 BOOST PADS' },
    { pits: [{ at: 0.38, w: 60 }, { at: 0.70, jumps: 5 }] }),
  S('rhythm', 1,
    { type: 'reach', desc: 'RUN TO THE BEAT. OR NEAR THE BEAT. THE BEAT IS FLEXIBLE.' },
    { type: 'onbeat', n: 10, desc: '10 ON-BEAT ACTIONS' },
    { intro: 'THIS CABINET OWES MONEY TO EVERY OTHER CABINET.' }),
  // THE ACT I CROSSING. Four jumps over a spiked break on three stones, at 0.70
  // — just past the second checkpoint (2/3), which is the whole of why it is
  // there rather than in the middle: a set piece that can take several attempts
  // to read has to hand back a short replay, or the cost of learning it is the
  // stage before it.
  //
  // The third crossing in the game and the last of Act I, after plumber-2 and
  // speed-3: those two teach the shape on ordinary ground, and a beat cabinet
  // is the honest home for the version where the jumps are timed. Neither of
  // the Act II cabinets could hold it — crypt runs its levels in a light radius
  // (a fatal hole you cannot see coming is a wall) and frost is ice, where a
  // landing you do not choose the end of is not a landing.
  S('rhythm', 2,
    { type: 'reach', desc: 'SURVIVE THE CHORUS. THE BAND IS IN DEBT.' },
    { type: 'onbeat', n: 14, desc: '14 ON-BEAT ACTIONS' },
    // ONLY THE CROSSING. The 0.37 hole that used to stand here was authored when
    // the beat lane cut none of its own; the chart now lays two pairs of holes
    // every sixteen beats (songs/rhythm.js), so a single scripted pit at a fixed
    // fraction is one more of a thing the stage is already full of. What it
    // cannot lay is a break too wide to jump, and that is what is left here.
    { pits: [{ at: 0.70, jumps: 5 }] }),
  // No scripted pits: this stage's chart spends a whole bar of every loop on
  // holes — four of them, one every other beat — and two more at fixed
  // fractions would be indistinguishable from the eight the loop already cut by
  // the time the player reached them.
  S('rhythm', 3,
    { type: 'chase', n: 2, desc: 'CHASE THE COPTER. IT IS SOMEHOW ON BEAT.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
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
    { pits: [{ at: 0.37, w: 60 }, { at: 0.74, w: 64 }] }),
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
  S('neon', 1,
    { type: 'targets', n: 5, targetType: 'target', desc: 'DESTROY 5 TARGETS. THEY ARE VERY DESTROYABLE.' },
    { type: 'coins', n: 20, desc: 'COLLECT 20 COINS' },
    { introBy: 'b33p', intro: 'I FEEL AT HOME HERE. I AM ALSO STILL LOW ON CYAN.' }),
  S('neon', 2,
    { type: 'cords', n: 4, desc: 'RECOVER 4 EXTENSION CORD PIECES. THE CORD WAS SHREDDED. RUDELY.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' }),
  // Neon has no routes and no loop, so the only geometry these two dodge is the
  // finishing straight — 0.70 is well clear of it. Both sit a couple of seconds
  // past a checkpoint, which is where the replay budget wants them.
  S('neon', 3,
    { type: 'reach', desc: 'REACH THE END. SOMETHING ANGRY AND AIRBORNE AWAITS.' },
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' },
    { pits: [{ at: 0.37, w: 56 }, { at: 0.70, w: 60 }] }),
  // ACT III -------------------------------------------------------------------
  S('cardboard', 1,
    { type: 'reach', desc: 'CROSS THE KINGDOM BEFORE IT FINISHES COLLAPSING.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' },
    { act: 'ACT III. THE OUTLET AT THE END OF EVERYTHING. THE CASTLE IS FOUR INCHES TALL.' }),
  // Act III's tierMax is 2 on every stage, so the bags cannot ramp — the pits
  // are the progression instead: none on cardboard-1, two on -2, three on -3.
  // On a two-minute stage the replay budget is tight (a tenth of the stage is
  // twelve seconds), which is why these sit at 0.06 / 0.40 / 0.72 rather than
  // spread on feel: 0.55 used to cost twenty-six seconds a death.
  S('cardboard', 2,
    { type: 'escape', desc: 'ESCAPE THE FOLDING WAVE. DO NOT BECOME A FLAP.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' },
    { pits: [{ at: 0.37, w: 56 }, { at: 0.70, w: 60 }] }),
  S('cardboard', 3,
    { type: 'chase', n: 3, desc: 'CATCH THE COPTER. IT IS HELD UP BY A VISIBLE HAND.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' },
    { pits: [{ at: 0.06, w: 60 }, { at: 0.40, w: 64 }, { at: 0.72, w: 68 }] }),
  S('office', 1,
    { type: 'reach', desc: 'GET THROUGH THE OFFICE. AVOID EYE CONTACT WITH MEETINGS.' },
    { type: 'coins', n: 35, desc: 'COLLECT 35 COINS' },
    { intro: 'THE PRINTERS SMELL FEAR. AND TONER. MOSTLY TONER.',
      pits: [{ at: 0.38, w: 52 }] }),
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
    { pits: [{ at: 0.38, w: 60 }, { at: 0.70, jumps: 6 }] }),
  // The finale finally has ground that gives way under it — "everything at
  // once" was 116 patterns on a road with no holes.
  S('surge', 3,
    { type: 'escape', desc: 'OUTRUN THE UNPLUGGENING ITSELF. THE SOCKET IS CLOSE.' },
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { pits: [{ at: 0.07, w: 60 }, { at: 0.40, w: 64 }, { at: 0.72, w: 68 }] }),
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));
export function stagesForCabinet(cabId) { return STAGES.filter((s) => s.cabinet === cabId); }

// Plug thresholds (from the spec).
export const UNLOCKS = {
  speed: 2, rhythm: 5, frost: 12, crypt: 16, neon: 20,
  cardboard: 28, office: 34, surge: 40, finale: 45,
};
