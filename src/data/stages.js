import { CABINETS } from './cabinets.js';

// 27 campaign stages: mission, optional challenge, appliance placement.
// Fast & furious: Act I stages ~1 minute, ramping to ~2 minutes by Act III.
// Appliance spots are FIXED per stage (fraction of stage distance + height),
// so memory and guides work; connective obstacle runs are seeded per attempt.

// Grouped by act. Rhythm is the one cabinet that does not take its act's
// length: its stages are charted against the song (songs/rhythm.js lays holes
// and bars on the grid for the whole run), so a 60-second lap would cut the
// chart short. It closes Act I long, which also gives the act's boss stage a
// step up in scale rather than a step sideways.
const CAB_DURATION = {
  plumber: 60, speed: 60, rhythm: 90,
  frost: 90, crypt: 90, neon: 90,
  gravity: 84, office: 100, surge: 110,
};

// Player-facing episode names; save keys remain independent of display copy.
const STAGE_NAMES = {
  plumber: ['PLUG AND PLAY', 'CRATE EXPECTATIONS', 'ALPHABET SPAGHETTI'],
  speed: ['ZOOM SERVICE', 'TIME FLIES', 'AIR MAIL'],
  rhythm: ['BOP TILL YOU DROP', 'COMBO MAMBO', 'BONK TO THE BEAT'],
  frost: ['ICE TO MEET YOU', 'SNOW PROBLEM', 'ALPHABET SLUSH'],
  crypt: ['DEAD QUIET', 'TOMB SERVICE', 'BOO, AGAIN'],
  neon: ['FARE GAME', 'LETTER EXPRESS', 'AIR FARE'],
  gravity: ['WRONG SIDE UP', 'DUST BUSTED', 'SPACE INVADED'],
  office: ['PLEASE SIGN IN', 'MEETING CANCELLED', 'UNSAFE SAVINGS'],
  surge: ['YOU AGAIN', 'SECOND HELPING', 'ONE LAST MASH'],
};

export function stageCode(stage) {
  const cabinetNumber = CABINETS.findIndex((cab) => cab.id === stage.cabinet) + 1;
  return `${cabinetNumber}-${stage.index}`;
}

export function stageLabel(stage) {
  return `${stageCode(stage)} ${stage.name}`;
}

const S = (cab, idx, mission, challenge, opts = {}) => ({
  id: `${cab}-${idx}`,
  cabinet: cab,
  index: idx,
  name: STAGE_NAMES[cab][idx - 1],
  mission,             // {type, n?, desc}
  challenge,           // {type, n, desc, note?} — desc is the HUD line, note the
                       // second line it shows briefly under it at the start
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
  // An intro that TELLS you something (office-2's alarms, office-3's safes) holds
  // longer than the four seconds a flavour line gets, so it can be read.
  introSec: opts.introSec || null,
  // QUIET: no ambient chat on a stage busy enough already — no Eggshell taunts or narration, no
  // parting shots on a tag swap (Peter, 15 Oct 2026: "less random chat bubbles in level 2,
  // there's a lot happening, extra gags from eggshell just clutter things up ... perhaps no chat
  // bubbles in this one"). The intro, the one-time teaching prompts and lines tied to something
  // on screen (the Martians' ACKs, the neon platform calls) still speak.
  quiet: !!opts.quiet,
  // THE BROWN-OUT (crypt-1 and -3): the screen edges dim hard underground. Was
  // the `blackout` mission type until every mission became the finish line.
  blackout: !!opts.blackout,
  // Steps this stage outside its clock tier (TIME_TIERS below), in seconds.
  timeLimit: opts.timeLimit || null,
  speedMult: opts.speedMult ?? 1,  // per-stage speed override (1 = 100% of cabinet speed)
  // Optional renderer-only material selection. Most non-Plumber cabinets leave
  // this unset; a cabinet can opt its authored stages into the shared paper
  // surface without changing gameplay or its style vocabulary.
  paperPreset: opts.paperPreset || null,
  // HOW MUCH THIS STAGE'S TEMPO CLIMBS AT EACH CHECKPOINT, in bpm. 0 = it does
  // not, which is every stage but one.
  //
  // Only the beat cabinet can use it — the rest of the cast's stages have no
  // clock cut into their road, so a tempo change there is just the music going
  // faster — and run.js ignores it off the beat lane whatever is written here.
  // It lives on the STAGE rather than on the cabinet on purpose: a beat cabinet
  // whose every stage accelerates is a cabinet with a gimmick, while one stage
  // that does it is that stage's own idea, and its two neighbours stay the
  // fixed-tempo lanes that teach the marks.
  bpmRamp: opts.bpmRamp ?? 0,
  // WHERE A FATAL HOLE MAY STAND, and it is the one rule every `pits` entry on
  // this page obeys.
  //
  // A pit kills, and a death goes back to the last checkpoint. So the real cost
  // of a hole is the stretch you replay to reach it: `at` minus whichever
  // checkpoint is behind it, measured in seconds of play.
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
  // WHERE THE TRAINS ARE, for the cabinets whose lane is a train roof.
  //
  // `trains: [{at, cars}]`, `at` a fraction of stage distance like applianceAt
  // and naming where that train's TAIL begins. One entry is one train; a run of
  // them is authored as consecutive entries with air between, and that air is
  // the leap from the back of one to the nose of the next.
  //
  // WHAT A TRAIN COSTS, because it is not what you would guess. A car is 96
  // world px and a six-car set with its two tapers is 635 — which at neon's
  // opening speed of 208 px/s is THREE SECONDS. A 90-second stage is 19,656
  // world px, so one standard train is 3% of it. A train section that reads as
  // a section rather than a blink wants three or four of them.
  //
  // NOTHING READS THIS YET. The painters exist (src/dev/neon-tron-train.js) and
  // the gallery draws every beat of it, but the lane does not: a train roof is
  // a ground treatment plus a boarding rise plus a camera pan, and none of the
  // three is built. This field is the authored level design sitting in the repo
  // ahead of the implementation, so the plan and the pictures cannot drift, and
  // so whoever builds the terrain has the placements rather than a paragraph.
  // The gallery's stage-plan tiles read THIS, not their own copy of it.
  trains: opts.trains || null,
  // Scripted rewind capsule, a fraction of stage distance like applianceAt.
  // The power-up's guaranteed introduction on every device — the drip can
  // also deal one anywhere, but only the dice say when.
  rewindAt: opts.rewindAt ?? null,
  // Scripted slow-down capsule, a fraction of stage distance like rewindAt.
  // Hand-placed ahead of a stretch where less speed helps the player rather
  // than hurts — never dealt by the random drip, and never on a beat stage
  // (run.js's beatLock short-circuits the world-speed and music-tempo chains
  // it feeds, so it would be a no-op there anyway).
  slowAt: opts.slowAt ?? null,
  // CAPSULES THIS ONE STAGE NEVER DEALS, on top of any its cabinet bans
  // (cabinets.js `bannedPowers`). run.js merges the two into the one set every
  // spawner, the lane sweep, the pickup itself and the breaker-box starting power
  // consult, so a ban here means none from any source. An AUTHORED route prize is
  // data, not dice: swap it in stage-layouts.js too, or the lane sweep removes it
  // and leaves that road paying nothing.
  bannedPowers: opts.bannedPowers || null,
  // CAPSULES THIS STAGE DEALS AS SOMETHING ELSE, { capsule: pickup }. Where a ban
  // falls back to whatever the dice had next, a swap names the replacement. It is
  // applied after the roll, so the seeded streams draw exactly what they always
  // did, and at the lane sweep, so it holds for every source a ban does — plus
  // the breaker box, which refuses a starting power whose capsule is swapped.
  powerSwaps: opts.powerSwaps || null,
  // OPENS INSIDE THE ARCADE CABINET: the backdrop is an 8-bit picture on a CRT for as
  // long as the stage's own song is in its chiptune bars, and the tube switches off on
  // the power-down (src/engine/arcadeIntro.js, run.js arcadeIntroResolve). The song has
  // to be written for it — bars 1-4 chiptune, the power-down on bar 4's last beat.
  arcadeIntro: !!opts.arcadeIntro,
});

// EVERY STAGE'S MISSION IS THE FINISH LINE (Peter, 17 Oct 2026). What used to
// be a stage's mission — the letters, the copter, the crates, the safes — is now
// its one BONUS, and the clock (run.js TIME_LIMIT_MULT) is what a run can fail
// on. `desc` here is not shown; the HUD and the briefing describe the bonus.
const REACH = { type: 'reach', desc: 'REACH THE FINISH LINE.' };

export const STAGES = [
  // ACT I ---------------------------------------------------------------------
  S('plumber', 1,
    REACH,
    { type: 'coins', n: 50, desc: 'COLLECT 50 COINS' },
    { act: 'ACT I. THE ARCADE GOES DARK. THE EMERGENCY LIGHTING IS ALSO UNPLUGGED.',
      introBy: 'lorenzo', intro: 'THESE PIPES KNOW ME. WE HAVE HISTORY. MOST OF IT IS LEGAL.',
      speedMult: 0.9,
      // No SPEED on the first stage of the game (Peter, 30 Sep 2026). Its two
      // authored speed prizes — the fork's and the tunnel's low roads — are
      // AIR JUMP in stage-layouts.js.
      bannedPowers: ['capSpeed'],
      // No INVINCIBILITY either (Peter, 1 Oct 2026: "it's the intro so lets keep
      // it easy breezy for a newcomer"). UNPEELABLE — and the legacy star capsule
      // stale data can still deal — comes up as a battery cell instead, or a
      // shield when the meter is full or another cell is on screen (run.js
      // dealtPickupType).
      powerSwaps: { capUnpeel: 'battery', capStar: 'battery' },
      // The hero has just jumped into the cabinet (Peter, 30 Sep 2026).
      arcadeIntro: true }),
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
    REACH,
    { type: 'targets', n: 6, targetType: 'qcrate', desc: 'BREAK 6 !-CRATES', note: 'THE ! MEANS HIT IT.' },
    { speedMult: 0.95, rewindAt: 0.15, pits: [{ at: 0.36, jumps: 4, fill: 'gears' }] }),
  // THREE TAR PITS, at fixed fractions of the stage. `pits` is a scripted
  // placement, not a pattern: a cabinet's pattern list is shuffled by the
  // spawner, so a gap added there turns up wherever the dice fall and might
  // never turn up at all — and the first one has to be EARLY, before the run
  // has settled into a rhythm, or it is not teaching anything.
  //
  // 0.12 / 0.45 / 0.78 puts one in each third, each of them a run-up past the
  // checkpoint behind it — seven seconds of replay apiece, which is the budget
  // the header above describes. These three were already inside it when that
  // rule was written down; most of the game's holes were not.
  //
  // Stage 3 and not 1 or 2 for the ordinary reason act I ramps: this is the
  // stage that already asks the most of you, and a fatal hazard belongs on it.
  //
  // M-A-S-H, which replaced the fuse here on 15 Oct 2026 (Peter: "our weakest
  // challenge"). Four letters at fixed spots, left to right, each on a road
  // you have to choose: M on top of the opening island, A on the tunnel floor,
  // S on top of the staircase, H on the sky road's plateau past its second
  // break. You cannot run back for one, so a letter is BANKED the moment it is
  // taken, kept on a failed run, and the stage clears on the run that finishes
  // with all four banked; all four in one run is a score bonus on top.
  //
  // `at` is in letter order and in fractions of the stage like applianceAt. A
  // spot that lands on a road puts the letter on that road; the four here are
  // checked against the built roads on every difficulty by tests/mash-letters.js.
  S('plumber', 3,
    REACH,
    { type: 'mash', n: 4, at: [0.090, 0.235, 0.508, 0.662],
      desc: 'COLLECT M-A-S-H', note: 'A LETTER YOU TAKE STAYS TAKEN.' },
    { speedMult: 1.0, pits: [{ at: 0.12, w: 52 }, { at: 0.45, w: 58 }, { at: 0.78, w: 64 }] }),
  // The slow-down capsule's guaranteed introduction, and this stage on
  // purpose: SPEED ZONE already teaches boost pads, so its own cabinet
  // handing out the opposite knob reads as the same lesson from both ends.
  // 0.2 is early and there is no hazard to pair it with yet — the capsule is
  // the whole lesson here, same instinct as plumber-2's rewind at 0.15.
  S('speed', 1,
    REACH,
    { type: 'boosts', n: 4, desc: 'HIT 4 BOOST PADS' },
    { introBy: 'rusty', intro: 'ALREADY FINISHED THIS ONE. I AM WAITING AT THE END. TAKE YOUR TIME.',
      paperPreset: 'cardstockClear', slowAt: 0.2 }),
  // The collapsing road finally collapses. Both holes clear the loop set piece
  // at 0.55 (see LOOP.at) by a third of the stage or more, so neither can be
  // laid inside its guard lane — and 0.14 rather than the 0.25 this used to be,
  // which charged fifteen seconds of replay for a hole in the opening third.
  S('speed', 2,
    REACH,
    { type: 'finishUnder', seconds: 60, desc: 'FINISH UNDER 60 SECONDS', note: 'REPLAYED GROUND COSTS TIME.' },
    { pits: [{ at: 0.14, w: 52 }, { at: 0.72, w: 56 }], paperPreset: 'cardstockClear' }),
  // THE THIRD CROSSING, and the one the cabinet's own furniture argues for: a
  // road that files for collapse should have a stretch where it has actually
  // collapsed. At 0.70 it is clear of the loop-de-loop at 0.55 by 0.15 of the
  // stage — the same distance the pit it replaces kept — and two seconds past
  // the second checkpoint.
  //
  // It REPLACES the 0.80 pit rather than joining it. That hole was doing the
  // same job in the same third of the stage, and a 60-second lap carrying a
  // loop, a crossing and two ordinary holes is a stage with no lane left in it.
  // M-A-S-H ON A STAGE WITH NO ROADS (15 Oct 2026), so every letter is a jump
  // rather than a choice of road, and each asks for a different one: M on top of
  // a small two-step island near the start (Peter: "a small island for Speed 3 so
  // it's not so basic" — it was a plain hop on bare lane); A hung over the spikes in the
  // gap between the crossing's first two stones, in a clean hop's arc (moved off
  // the tar pit, Peter: "put it between islands so it's a bit more precarious"); S on
  // the third stone of the spike crossing; H past the end of the one short
  // island, 81 up — out of every hero's reach from the lane (the highest
  // jumper's head stops at 77), so it takes a jump onto the island and a second
  // one off its end (Peter, 15 Oct: "it's super easy to get all 4", then "the
  // island ends before the letter so they have to jump for it"). A double jump
  // or low gravity can still reach it from the lane — that is jumping twice. All four are in shot a full screen ahead, so
  // none of them gets an edge marker.
  S('speed', 3,
    REACH,
    { type: 'mash', n: 4,
      // M is lifted 26 off the top step (Peter: "this is in reach by a single
      // jump" — resting on the step, a strong jumper took it from the lane): at
      // ~88 up no head reaches it from the lane (the highest stops near 77), and
      // a jump from either step does.
      // A back over the tar pit and S on the crossing's last stone, ~20s apart:
      // with both in the crossing they read as one set piece with two letters
      // (Peter: "A & S are too close", twice).
      at: [{ at: 0.167, lift: 26 }, { pit: 0 }, { pit: 1, stone: 3 }, { after: 0.84, dx: 50, alt: 81 }],
      desc: 'COLLECT M-A-S-H', note: 'ON THE LAP. A LETTER YOU TAKE STAYS TAKEN.' },
    { pits: [{ at: 0.38, w: 60 }, { at: 0.70, jumps: 5 }], paperPreset: 'cardstockClear' }),
  S('rhythm', 1,
    REACH,
    { type: 'onbeat', n: 30, desc: '30 ON-BEAT ACTIONS' },
    { intro: 'THE BEAT IS EASY TO FOLLOW. THE CABINET IS HARD TO PLEASE.' }),
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
    REACH,
    { type: 'combo', n: 10, desc: '10 COMBO', note: 'HIT 10 ARROWS ON THE BEAT IN A ROW. YOUR BEST STREAK COUNTS.' },
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
  //
  // AND THE ONE STAGE THAT SPEEDS UP. A beat stage banks five restore points
  // (run.js BEAT_RESTORE_POINTS), so a step of 1 carries RHYTHM BANKRUPTCY's
  // 124bpm to 129 by the tape — four per cent, spread over five moments, which
  // is a chase that tightens under the player rather than one that changes
  // gear. It belongs to THIS stage of the three: 3-1 teaches the marks and 3-2
  // asks for the crossing, and neither can afford a floor that is also moving.
  // A stage whose mission is to catch something is the one that can.
  //
  // The step is the whole dial. At 0.5 the same five checkpoints land on 126.5;
  // the cost of raising it is that the four holes on beats 9/11/13/15 come two
  // beats apart in a shortening beat, and the longest arc in the cast (0.746s)
  // is airborne for 1.60 of those beats at 129 against 1.54 at 124 — so the
  // ground between two of them, with a late press on one and an early press on
  // the next, falls from about 48ms to about 13ms. That is the number that runs
  // out first, at around 132bpm.
  S('rhythm', 3,
    REACH,
    { type: 'chase', n: 3, desc: 'BONK CLOWN-COPTER', note: '3 TIMES. IT IS SOMEHOW ON BEAT.' },
    { bpmRamp: 1 }),
  // ACT II --------------------------------------------------------------------
  S('frost', 1,
    REACH,
    { type: 'finishUnder', seconds: 90, desc: 'FINISH UNDER 90 SECONDS', note: 'REPLAYED GROUND COSTS TIME.' },
    { act: 'ACT II. THE EXTENSION CRISIS. EVERYONE IS COLD AND BRAVE.',
      paperPreset: 'cardstockClear' }),
  // Act II/III pits, and which stages get NONE, on purpose: the blackout
  // stages (crypt-1/3 — a fatal hole inside a light radius is a wall, not a
  // read) and the old escort layouts (crypt-2, office-3). Their resident
  // pathing constraints remain until those roads are deliberately reauthored.
  // Every cabinet's stage 1 stays pit-free except
  // office-1, whose act runs at tierMax 2 from the first stage anyway.
  // BUILD THE BRIDGES: five switched pits, four asked for, and the mission
  // never says there is a spare (Peter, 15 Oct). Any bridge counts, the lane's
  // own switch patterns included. Each within ten seconds' replay of the start
  // or a checkpoint (tests/spike-crossing.js), clear of the berg stairs at 0.08
  // and the sky road at 0.55.
  S('frost', 2,
    REACH,
    { type: 'bridges', n: 4, label: 'BRIDGES', desc: 'BUILD 4 BRIDGES', note: 'THE ICE WILL NOT DO IT FOR YOU.' },
    { pits: [{ at: 0.04, w: 56, switch: true }, { at: 0.36, w: 56, switch: true }, { at: 0.42, w: 60, switch: true }, { at: 0.70, w: 60, switch: true }, { at: 0.76, w: 64, switch: true }], paperPreset: 'cardstockClear' }),
  // Was the fuse run over holes, on ice — plumber-3's design graduated.
  //
  // M-A-S-H here too since 15 Oct 2026 (Peter: "we can place the letters in pits
  // that can only be collected by flicking the switch before the pits"). Four
  // switched pits, each with its letter IN the hole at deck height: hit the
  // switch and the bridge carries you through the letter; jump the hole and you
  // sail over it. Two pits sit in each of the first and second thirds' replay
  // windows (1.5..10s past a checkpoint) — 0.105 (clear of the opening island), 0.37, 0.43, 0.74.
  S('frost', 3,
    // S went up onto the sky road instead (Peter: "frost 3 has a spring pad path,
    // perhaps one of the letters goes up there?"): its flat top at 168, just past
    // the one break. The third switched pit keeps its switch and bridge, no letter.
    // And M went up onto the opening two-step island (Peter: "we have islands
    // near the start, perhaps put a letter there?"), on its top step past the
    // shield. The first and third switched pits keep switch and bridge, no letter.
    REACH,
    { type: 'mash', n: 4, at: [0.0935, { pit: 1 }, 0.591, { pit: 3 }],
      desc: 'COLLECT M-A-S-H', note: 'LOOK HIGH AND LOW.' },
    { pits: [{ at: 0.105, w: 60, switch: true }, { at: 0.37, w: 60, switch: true },
      { at: 0.43, w: 64, switch: true }, { at: 0.74, w: 64, switch: true }],
      paperPreset: 'cardstockClear' }),
  S('crypt', 1,
    REACH,
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' },
    { blackout: true, introBy: 'gary', intro: 'MY FORMER COWORKERS ARE WAVING. I OWE SEVERAL OF THEM SHIFTS.' }),
  S('crypt', 2,
    REACH,
    { type: 'coins', n: 25, desc: 'COLLECT 25 COINS' }),
  S('crypt', 3,
    REACH,
    // M-A-S-H on the lane (Peter, 28 Oct), in place of the coins. S stands on the ground ABOVE
    // the catacomb (0.40-0.55), between its mouth and its roof gap, so a hero who dropped in
    // misses it; the other three are on the lane.
    { type: 'mash', n: 4, at: [0.12, 0.28, { at: 0.475, surface: true }, 0.82],
      desc: 'COLLECT M-A-S-H', note: 'A LETTER YOU TAKE STAYS TAKEN.' },
    { blackout: true }),
  // THE TRAINS OPEN THE CABINET. Three of them back to back from the start
  // line, which is where they have to be if the arrival cut scene is going to
  // make sense: you watch a train pull in, you are on it, and the stage begins.
  // Put the same section half way through and the cut scene is a flashback.
  //
  // Three sets is 2,205 world px — about eleven seconds, an eighth of the
  // stage. That is the difference between a section and the three-second blink
  // one train would have been. It also means the player meets both sizes of
  // jump in the first ten seconds: the coupler gaps inside a set, and the two
  // leaps between them.
  //
  // Everything after 0.12 is ordinary Neon: the cabinet's own pattern bag deals
  // the drones, targets and buzzbirds exactly as it does today, and the two
  // scripted pits below are the holes this stage guarantees. Both sit just past
  // a checkpoint, which is the rule every pit on this page obeys.
  // A slow-down capsule at 0.30, a comfortable run-up ahead of the 0.37 pit —
  // TERMINAL VELOCITY is the first of the higher-speed cabinets (speedBonus
  // 0.3), and this is the kind of spot the capsule is for: more road to read
  // the gap on, right before it is needed.
  S('neon', 1,
    REACH,
    { type: 'targets', n: 5, targetType: 'target', desc: 'DESTROY 5 TARGETS', note: 'THEY ARE VERY DESTROYABLE.' },
    { introBy: 'b33p', intro: 'I FEEL AT HOME HERE. I AM ALSO STILL LOW ON CYAN.',
      trains: [{ at: 0.000, cars: 6 }, { at: 0.040, cars: 6 }, { at: 0.080, cars: 6 }],
      pits: [{ at: 0.37, w: 52 }, { at: 0.71, w: 56 }], slowAt: 0.3 }),
  // ONE TRAIN, MID-STAGE, and deliberately less than Neon 1 had. The opening
  // cabinet spends its trains teaching the idea; this stage is mostly ground,
  // and the single set at 0.46 is the callback — long enough to board, cross a
  // couple of couplers and come off the nose, with no leap in it at all.
  //
  // It sits between the checkpoints on purpose. A train section straddling one
  // would mean a death sending the player back to a boarding they have already
  // done, which is an errand rather than a setback.
  S('neon', 2,
    REACH,
    // M over the first pit, A on the first train's roof, S INSIDE the second train
    // in the door you step in at, and H on the finish train's roof. Both trains fly in over the hero carrying
    // their letters, which is the telegraph; no edge markers (Peter, 15 Oct).
    { type: 'mash', n: 4, markers: false,
      // S on the roof of a SECOND mid-stage train at 0.58, added for it (Peter, 15
      // Oct: "can we not add another train then? ... gives the trains a purpose"),
      // ~11s after A and ~30s before H — never two in quick succession. Trains are
      // indexed in stage order, so the finish train is now 2.
      // A on the first train's roof and S inside the second at its rear door —
      // swapped from door-then-roof (Peter, 15 Oct).
      // A at 0.7, clear of the roof's battery (a third along) and its high capsule
      // (over the middle) — at 0.3 it sat on the battery.
      at: [{ pit: 0 }, { train: 0, along: 0.7 }, { train: 1, door: 'rear' }, { train: 2, along: 0.25 }],
      desc: 'COLLECT M-A-S-H', note: 'A LETTER YOU TAKE STAYS TAKEN.' },
    { trains: [{ at: 0.46, cars: 6 }, { at: 0.58, cars: 6 }],
      pits: [{ at: 0.36, w: 52 }, { at: 0.70, w: 56 }] }),
  // Neon has no routes and no loop, so the only geometry these two dodge is the
  // finishing straight — 0.70 is well clear of it. Both sit a couple of seconds
  // past a checkpoint, which is where the replay budget wants them.
  S('neon', 3,
    REACH,
    { type: 'chase', n: 3, desc: 'BONK CLOWN-COPTER', note: 'FROM BELOW, 3 TIMES. IT IS UNDERINSURED.' },
    { pits: [{ at: 0.37, w: 56 }, { at: 0.70, w: 60 }] }),
  // ACT III -------------------------------------------------------------------
  S('gravity', 1,
    REACH,
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { durationSec: 84, bannedPowers: ['capSpeed', 'capLowGrav', 'capAirJump'],
      act: 'ACT III. THE PLACE WHERE DOWN IS UP. FOLLOW THE ARROWS.',
      intro: 'THE STATION HAS TWO FLOORS. THE CEILING IS ONE OF THEM.' }),
  // Levels 2 and 3 swapped their gameplay on 13 Oct 2026 (Peter): the cleaner
  // is level 2; low gravity — the station's gravity giving out — is level 3,
  // where the Martian invasion fills the windows.
  S('gravity', 2,
    REACH,
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { intro: 'THE CLEANER HAS MISTAKEN YOU FOR DEBRIS.', durationSec: 100, bannedPowers: ['capSpeed', 'capLowGrav', 'capAirJump'], quiet: true, timeLimit: 160 }),
  S('gravity', 3,
    REACH,
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { intro: 'LOW GRAVITY. LONG JUMPS. LOOSE HARDWARE.', durationSec: 96, bannedPowers: ['capSpeed', 'capLowGrav', 'capAirJump'], quiet: true, timeLimit: 160 }),
  S('office', 1,
    REACH,
    { type: 'finishUnder', seconds: 95, desc: 'FINISH UNDER 95 SECONDS', note: 'REPLAYED GROUND COSTS TIME.' },
    { intro: 'THE PRINTERS SMELL FEAR. AND TONER. MOSTLY TONER.', timeLimit: 180 }),
  S('office', 2,
    REACH,
    // FOUR ALARMS ON THE WALL, THREE ASKED FOR (Peter, 15 Oct): one before the
    // first checkpoint, one well after it, and the last two close together just
    // before the interview room (0.9) as the last chance — so the third can never
    // come early, the room it clears is the next one you pass, and the fire exit
    // at the line follows close behind. The wall's own
    // DO NOT HIT THE FIRE ALARMS sign introduces them (officeClimb.js).
    { type: 'targets', n: 3, targetType: 'fireAlarm', label: 'ALARMS', at: [0.15, 0.45, 0.82, 0.855],
      desc: 'PULL 3 FIRE ALARMS', note: 'THE MEETING IS CANCELLED.' },
    // No slow-down capsule on any CORPORATE KOMBAT floor (Peter, 26 Oct). This one had a capsule at
    // 0.73, ahead of the two alarms sitting close together at 0.82 and 0.855.
    { quiet: true, introBy: 'eggshell', introSec: 7,
      intro: 'DO NOT TOUCH MY FIRE ALARMS. THE MEETING ENDS WHEN I SAY.', timeLimit: 180 }),
  // CRACK THE SAFES (Peter, 15 Oct): four double-height safes placed on floor 88,
  // three asked for, and one SHOT opens each (Run.crackSafe). Replaced the
  // retired escort bonus.
  S('office', 3,
    REACH,
    { type: 'targets', n: 3, targetType: 'vaultSafe', label: 'SAFES', at: [0.2, 0.4, 0.58, 0.8],
      // Met, and a giant pile of money waits by the exit (Peter, 15 Oct).
      payoff: {
        prop: 'moneyPile', dx: -150, w: 64, h: 35,
        pickups: [
          { type: 'coin', dx: 4, alt: 5 }, { type: 'coin', dx: 14, alt: 5 },
          { type: 'coin', dx: 24, alt: 5 }, { type: 'coin', dx: 34, alt: 5 },
          { type: 'coin', dx: 44, alt: 5 }, { type: 'coin', dx: 54, alt: 5 },
          { type: 'banknote', dx: 8, alt: 9 }, { type: 'banknote', dx: 20, alt: 9 },
          { type: 'banknote', dx: 32, alt: 9 }, { type: 'banknote', dx: 44, alt: 9 },
          { type: 'coin', dx: 24, alt: 16 }, { type: 'coin', dx: 36, alt: 16 },
        ],
      },
      desc: 'CRACK 3 SAFES', note: 'SHOOT THE LOCK. TAKE THE MONEY.' },
    // Eggshell introduces the safes himself, by forbidding them (Peter, 15 Oct).
    { introBy: 'eggshell', intro: 'DO NOT SHOOT MY SAFES. THAT MONEY IS FOR TAXES. I AM NOT PAYING THEM.', introSec: 7, timeLimit: 180 }),
  S('surge', 1,
    REACH,
    { type: 'coins', n: 40, desc: 'COLLECT 40 COINS' },
    { intro: 'THE CABINETS ARE BLEEDING TOGETHER. NOBODY IS ADDRESSING THIS.' }),
  // The crossing again, on the cabinet that is everything at once — and again
  // just past a checkpoint, at 0.70. Twice in the game and both times in the
  // second half of a stage: it is a set piece, and a set piece that turns up
  // every other level is furniture.
  // A slow-down capsule at 0.60, ahead of the six-jump crossing at 0.70 — the
  // widest crossing in the game, on the cabinet with the highest speedBonus
  // (0.35). The run-up is exactly where the capsule earns its keep.
  S('surge', 2,
    REACH,
    { type: 'cords', n: 6, desc: 'RECOVER 6 CORD PIECES', note: 'THE SOCKET IS WAITING.' },
    { pits: [{ at: 0.38, w: 60 }, { at: 0.70, jumps: 6 }], slowAt: 0.6 }),
  // The finale finally has ground that gives way under it — "everything at
  // once" was 116 patterns on a road with no holes.
  S('surge', 3,
    REACH,
    { type: 'noDamage', n: 1, desc: 'TAKE NO DAMAGE' },
    { pits: [{ at: 0.07, w: 60 }, { at: 0.40, w: 64 }, { at: 0.72, w: 68 }] }),
];

// THE CLOCK's limits (run.js tickClock). Every mission is the finish line, and
// the clock is what a stage is failed on.
//
// THREE LIMITS, not a multiple (Peter: "i would prefer just a few different
// values"), picked by the stage's length: the minute-long Act I stages, the
// minute-and-a-half middle of the game, and the long ones. A stage can name its
// own `timeLimit` in stages.js to step outside its tier.
export const TIME_TIERS = [
  { upTo: 60, limit: 100 },        // plumber, speed
  { upTo: 96, limit: 150 },        // rhythm, frost, crypt, neon, gravity-1 and -3
  { upTo: Infinity, limit: 200 },  // office, gravity-2, surge
];
export function timeLimitFor(stage, durationSec) {
  if (stage?.timeLimit) return stage.timeLimit;
  return TIME_TIERS.find((t) => durationSec <= t.upTo).limit;
}
// The rank's TIME point: at the tape with at least this much of the clock left.
export const RANK_TIME_FRAC = 0.25;

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));
// The letters a `mash` mission spells, in the order they stand along the stage.
export const MASH_LETTERS = ['M', 'A', 'S', 'H'];
// The whole bonus in one sentence, for the places with room to say it — the
// briefing card and the pause screen. The HUD prints `desc` on its own and the
// note only briefly, underneath, at the start of the stage.
export function bonusSentence(c) { return c?.note ? `${c.desc}. ${c.note}` : c?.desc || ''; }
// The HUD line. A countable bonus prints its own count beside it (0/6), so the
// number comes out of the words: BREAK !-CRATES 0/6, not BREAK 6 !-CRATES 0/6
// (Peter, 17 Oct 2026). The briefing card and the pause screen keep the number.
export function bonusHudLine(c) {
  const desc = c?.desc || '';
  if (!(c?.n > 1)) return desc;
  return desc.split(' ').filter((w) => w !== String(c.n)).join(' ');
}
export function stagesForCabinet(cabId) { return STAGES.filter((s) => s.cabinet === cabId); }

// Plug thresholds (from the spec).
export const UNLOCKS = {
  speed: 3, rhythm: 6, frost: 12, crypt: 18, neon: 24,
  gravity: 30, office: 36, surge: 42, finale: 48,
};
