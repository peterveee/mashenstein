// The nine arcade cabinets: palettes, style packs, mechanics, pattern banks,
// music banks. Patterns are data: cells of {t: obstacleType, dx, y?, n?}.
// dx is px from pattern origin; the spawner enforces fairness gaps between
// action-required cells at spawn time, so patterns describe intent, not exact spacing.
import { seq, chordSeq } from '../engine/notes.js';
// The music. Each song is one file in src/data/songs/ — its notes, its
// arrangement and its mix together — and a cabinet refers to one rather than
// carrying it, so there is exactly one copy of every song in the game.
import * as PLUMBER from './songs/plumber.js';
import * as SPEED from './songs/speed.js';
import * as NEON from './songs/neon.js';
import * as FROST from './songs/frost.js';
import * as CRYPT from './songs/crypt.js';
import * as RHYTHM from './songs/rhythm.js';
import * as CARDBOARD from './songs/cardboard.js';
import * as OFFICE from './songs/office.js';
import * as SURGE from './songs/surge.js';
import * as HUB from './songs/hub.js';
import * as TITLE from './songs/title.js';
import * as FINALE from './songs/finale.js';

// Shared pattern helpers -----------------------------------------------------
const P = (tier, cells, opts = {}) => ({ tier, cells, ...opts });
// Coin formations. The spawner owns the geometry and the reachability clamp;
// these just name the shape. The arc is a sine hump sampled at n points, so n
// IS its shape — four coins sample it at 0/.87/.87/0 and read as a flat-topped
// triangle, five as a tent. Seven is the first count that reads as a curve, and
// that is the look the tutorial has always had.
const coinArc = (dx, n = 7) => ({ t: 'coins', shape: 'arc', dx, n });
const coinBlock = (dx, cols = 3, rows = 3) => ({ t: 'coins', shape: 'block', dx, cols, rows });
const coinLine = (dx, n = 6) => ({ t: 'coins', shape: 'line', dx, n });
const coinStair = (dx, n = 5) => ({ t: 'coins', shape: 'stair', dx, n });
const PERC_OFF = seq('.').map((v) => !!v); // silent percussion lane (section override)

// ONE BANANA PEEL, AT MOST, PER RUN — `once` plus `onceGroup: 'peel'`, honoured
// by Spawner.pickPattern.
//
// The cap IS the design rather than a limitation of it: the peel's whole joke
// is that you did not expect it, and a gag stops being one the third time it
// happens. Left in the ordinary rotation it turned up every few hundred metres
// and became just another thing to jump.
//
// The peel is back in more than one SHAPE, though — a bare cell here, and two
// authored contexts below (Plumber's crate-plow, Speed's cone row) that place
// it exactly where the game has just invited a held slide, which is the one
// habit the peel exists to punish. `onceGroup` is what lets the shapes coexist
// with the cap: every peel pattern names the same group, so laying any one of
// them down spends the peel for the whole run — Surge's union bank included,
// which is also why the group key survives what object identity alone could
// not (three distinct pattern objects would otherwise be three peels).
//
// TIER 0 on this bare cell, and that is not a difficulty judgement — it is the
// only tier that makes the peel reachable at all in the stage most people play.
//
// `tierMax` is min(2, (stage.index - 1) + (act - 1)), so stage 1 of every act-1
// cabinet runs at tierMax 0. Sitting at tier 1 the peel simply did not exist in
// Plumber-1 or Speed-1 — the pattern was in the bank, the cap worked, the tests
// passed, and no player on the first stage of either cabinet could ever meet
// one. Tier 0 costs nothing: it is one jump cell, the fairness sim budgets it
// like any other, and the `once` flag is what keeps it rare rather than the
// tier. Rarity and reachability are different knobs and this is the wrong one to
// spend on rarity.
const PEEL_ONCE = P(0, [{ t: 'bananaPeel', dx: 0 }], { once: true, onceGroup: 'peel' });

// The animal hazards, grouped by the cabinet each belongs to. Gathered here
// rather than scattered through the cabinet list so the whole feature is one
// block to read and one line to spread per cabinet — see sprites/animals.js for
// the art and game/entities.js for the boxes and closing speeds.
//
// These are the only ground hazards that come TO you, so they are paced apart
// from whatever shares their pattern: a dog spawned on top of a second jump is
// two jumps in the runway of one. Each is given its lane and a coin arc to jump
// through, or a companion far enough away to be a separate decision.
const ANIMALS = {
  // No plumber entry. Plumber's dog is not dealt from the bag at all: it is
  // the scripted finish-line dog (see RunState.spawnFinishDog and the
  // `finishDog` def in game/entities.js), so on that cabinet a dog appears
  // exactly once, at the very end, guarding the tape.
  //
  // The bruiser is the slow closer — the one you can out-think — and at -38 he
  // is milder than the barrel (-40) that already rolls through every cabinet's
  // tier-2 lane, so even Act I speeds read him comfortably. Speed gets him from
  // stage 2; Neon meets him once, at tier 2, where a cabinet about shooting
  // finally deals a ground target that shoots back by closing; Cardboard's is
  // the kingdom's guard dog, and the one animal in Act III that is not on
  // Corporate's payroll.
  speed: [
    P(1, [{ t: 'dogBruiser', dx: 0 }]),
    P(2, [{ t: 'dogBruiser', dx: 0 }, coinArc(130)]),
  ],
  neon: [
    P(2, [{ t: 'dogBruiser', dx: 0 }, coinArc(120)]),
  ],
  cardboard: [
    P(1, [{ t: 'dogBruiser', dx: 0 }]),
    P(2, [{ t: 'dogBruiser', dx: 0 }, { t: 'cardboardMonster', dx: 150 }]),
  ],
  // Feral and cat together: a lean starving thing and the cat that is not
  // fleeing it. The cat is the fastest closer in the game and the smallest box,
  // so it is a tier-2 spawn everywhere it appears.
  crypt: [
    P(1, [{ t: 'dogFeral', dx: 0 }]),
    P(2, [{ t: 'dogFeral', dx: 0 }, coinArc(120)]),
    P(2, [{ t: 'catFury', dx: 0 }, { t: 'tombstone', dx: 140 }]),
  ],
  // Corporate security, on four legs and wearing a collar someone expensed.
  office: [
    P(1, [{ t: 'dogSnarler', dx: 0 }]),
    P(2, [{ t: 'dogSnarler', dx: 0 }, { t: 'chair', dx: 145 }]),
    P(2, [{ t: 'catFury', dx: 0 }, coinArc(110)]),
  ],
};

const BASE_PATTERNS = [
  P(0, [{ t: 'cactus', dx: 0 }]),
  P(0, [{ t: 'cactus', dx: 0 }, coinArc(60)]),
  P(0, [{ t: 'crate', dx: 0 }]),
  P(0, [{ t: 'crate', dx: 0, n: 2 }]), // a double stack reads as a real wall even at tier 0
  // The flat run is the breather beat. Tier 1 so the cabinets that drop tier 0
  // (Crypt, Corporate) keep it — every cabinet should own all four shapes.
  P(1, [coinLine(0, 7)]),
  P(1, [{ t: 'cactus', dx: 0 }, { t: 'cactus', dx: 26 }]),
  P(1, [{ t: 'cactusBig', dx: 0 }]),
  P(1, [{ t: 'crate', dx: 0 }, { t: 'crate', dx: 40, n: 2 }]), // low then high: a two-beat read
  P(1, [{ t: 'buzzbird', dx: 0 }]),
  P(1, [{ t: 'drone', dx: 0 }]), // low flyer: duck under
  P(1, [{ t: 'cactus', dx: 0 }, coinBlock(64)]),                // punch up through the slab
  P(1, [coinStair(0), { t: 'crate', dx: 84 }]),                 // the ramp telegraphs the crate
  P(2, [{ t: 'crate', dx: 0, n: 2 }, coinArc(70)]),
  P(2, [{ t: 'cactus', dx: 0 }, { t: 'drone', dx: 90 }]),
  P(2, [{ t: 'barrel', dx: 0 }]),
  P(2, [{ t: 'cactusBig', dx: 0 }, { t: 'cactus', dx: 100 }]),
];

// Frost Fortress keeps the shared jump timing and difficulty curve, but wears
// its own ground enemy. Clone only the cells that change so the base patterns
// remain the source of truth for spacing, tiers, coins, and mixed hazards.
const ICE_PATTERNS = BASE_PATTERNS.map((pattern) => ({
  ...pattern,
  cells: pattern.cells.map((cell) => {
    if (cell.t === 'cactus') return { ...cell, t: 'snowman' };
    if (cell.t === 'cactusBig') return { ...cell, t: 'snowmanBig' };
    return cell;
  }),
}));

// `pitFill` — what lies at the bottom of a hole on this cabinet. Nothing here
// names one yet: every pit in the game is tar, which is the default in
// engine/stylePacks (drawPitFills) and the cheapest fill on the bake-off sheet
// (src/dev/pit-candidates.js — it throws no light, so it costs a bright cabinet
// nothing). Name one per cabinet as the sheet is settled; 'none' opts a cabinet
// back out to an open break.
export const CABINETS = [
  {
    id: 'plumber', name: 'PLUMBER PANIC', act: 1, style: 'pixel',
    genre: 'PLATFORMER', unlockPlugs: 0,
    mechanic: 'qcrates', // breakable !-crates, pipes as secret routes
    sky: ['#78c8f0', '#a8e0f8'], ground: '#3a9c48', groundDark: '#2a7038',
    far: '#5ab060', hills: '#48a050',
    // What the ground is made of UNDER the turf — the cutaway you see inside a
    // tunnel and along the underside of every raised road. A real brown rather
    // than the green taken down a few stops: soil is not grass with the lights
    // off, and darkening `groundDark` gave an underground that read as the
    // inside of a hill instead of as being in the earth.
    soil: '#6b4426',
    // Floating islands — the "secret routes" the mechanic line above has always
    // promised. `at` is a fraction of the stage, the same convention
    // stage.applianceAt uses; `dwell` is SECONDS, converted against this stage's
    // own base speed so the beat is the same length in world 1 and on UNPLUGGED
    // (a fixed pixel width would be one jump at the start of the game and half
    // a jump by the end).
    //
    // A STAIRCASE rather than one slab. `steps` expands this into that many
    // islands, each `step` px above the one before and with a gap you jump
    // across, so height is climbed instead of hopped onto — a slab one hop up
    // is a slab you are barely above, and being on it does not feel like
    // anything. Four steps of 27 tops out at 110, well past anything a single
    // jump off the lane could reach. `topPrize` pays out on the last one only: everything below it is on
    // the way, and paying on the way removes the reason to keep going up.
    //
    // Missing a step costs the climb and nothing else. There is no fall damage
    // anywhere in this game, which is exactly what makes a stack worth trying.
    islands: [
      // The warm-up, and the shape every stack here follows: ONE short foothold
      // just off the lane, then up to a longer run with the coins on it. A low
      // slab as long as a high one is a road running a few pixels above the
      // ground, which is neither a platform nor a lane — the bottom step is a
      // stride, and the reward is two steps up.
      { at: 0.07, dwell: 1.8, steps: 2, rise: 29, step: 33, topPrize: 'capShield' },
      { at: 0.45, dwell: 4.0, steps: 4, rise: 29, step: 33, topPrize: 'capMagnet' },
    ],
    // Converging forks: a road that leaves the lane, runs somewhere else for a
    // while, and eases back down to meet it. `prize` rides the high road and
    // `lowPrize` the low, deliberately different KINDS rather than different
    // amounts: coins up against a power-up down means the answer depends on
    // what you need at that moment, where "one road simply pays better" would
    // be solved once and stop being a choice thereafter.
    //
    // The span is described by three fractions, each the point at which the
    // road changes what it is doing: `lip` (flat at `entry`, the landing),
    // `climb` (rising to `peak`), and `hold` (where the descent begins). A road
    // with no `peak` is flat at `entry` for its whole length, which is what the
    // first one here is and what every fork used to be.
    //
    // `end` is the height the descent settles at, and it is the difference
    // between a road that ENDS and a road you merely walk off. Easing all the
    // way to 0 put the hero back on the lane still running and the whole
    // excursion finished with a shrug; stopping in the air finishes it with a
    // drop. Falling injures nobody here, so the only thing it costs is the one
    // beat of the ride whose timing the player does not choose.
    forks: [
      // THE HIGH ROAD. `spring` puts a pad on the ground before the mouth and
      // that pad is the only way up — 96px is three times a jump — so taking it
      // is a decision made once, on the approach, by NOT jumping over the pad.
      // Then it climbs to 168 with the hills below you, and there is no coming
      // back to the lane until the road brings you back. That is the whole
      // point of the numbers: at the old 29px the two roads were one hop apart,
      // so missing the turn cost nothing and taking it committed you to
      // nothing.
      //
      // 168 was picked as CLOUD_TO (run.js), back when the top of the road was
      // painted as weather. It is no longer — a high road is an island that
      // climbs, drawn out of this cabinet's own ground the whole way — but the
      // height stays, because what it buys is the separation from the lane, and
      // that was always the part doing the work. It is not higher either: it
      // used to climb to 210, and the extra forty pixels were all paid for on
      // the way down. Missing one of the breaks up here dropped you a screen
      // and a half, and a fall you cannot see the bottom of is a fall you do
      // not get to place.
      //
      // AND THEN IT RIDES BACK DOWN. `hold` at 0.70 gives the descent the last
      // thirty per cent of the span — about 120px of height over 360px of
      // travel, which is a slope you walk rather than a lip you step off. It
      // used to hold full height to 0.82 and stop dead at 96, so the ending was
      // a 96px plunge with no warning in the geometry that it was coming.
      //
      // `end: 48` is what is left to fall, a third of a frame, and it is not
      // zero on purpose: a road that eases all the way onto the lane has no
      // ending and the whole excursion finishes with a shrug. It is not smaller
      // than 48 either, and that is `clearRouteHazards` talking rather than
      // taste — it retires anything on the lane whose top reaches within 12px
      // of this road's underside, so a road that comes down to 24 sweeps every
      // cactus, barrel and drone out of the lane beneath the merge. At 48 only
      // the flyers that would genuinely be inside the road go.
      {
        at: 0.58, dwell: 7.5, spring: true, sky: true,
        entry: 96, peak: 168, lip: 0.2, climb: 0.34, hold: 0.70, end: 48,
        // Breaks in the road, so being up here asks something of you between
        // the two ends of it. Fractions along the span; `gapSec` is their width
        // in SECONDS, which is a third of a jump at any speed — clearable
        // without a run-up, and not clearable by accident.
        gaps: [0.42, 0.6, 0.75], gapSec: 0.3,
        prize: 'coins', lowPrize: 'capSpeed',
      },
    ],
    // And the low road: a whole underground SECTION, not a shortcut. A hole in
    // the lane you either clear or drop into; once you are in it the only way
    // out is the far end, where it climbs back up and hands you to the ground
    // still running. `mouth` is how much of the span is that open hole — the
    // rest runs under solid ground, so the choice is made at the entrance and
    // then it is made.
    //
    // EARLY and LONG, both deliberately. Early because the underground is the
    // stage's most distinctive thing and burying it at 78% means most players
    // meet it once and tired; twelve seconds because at four it was a held
    // breath — you chose at the mouth and then nothing happened until the exit.
    // It is now the longest single stretch on the stage, and it has to earn
    // that with `hazards`, which is what makes it somewhere you are playing
    // rather than somewhere you are being conveyed.
    //
    // 96px of depth is not a taste number. There is no ceiling collision in
    // this engine and there should not be one — the whole route mechanism works
    // because there is only ever ONE floor — so what keeps a hero in a tunnel
    // is the tunnel being deeper than he can jump. The best jumper in the cast
    // apexes at 69, and 96 leaves that clearance under the roof rather than
    // putting his head through it, and headroom to fight in besides.
    tunnels: [
      {
        // A GAP you can see and jump, leading to a steep slope rather than a
        // vertical drop. The ramped version — level with the lane, nothing cut
        // out of it — read as ground that simply went down, and gave the player
        // nothing to aim a jump at: there was no visible hole, so there was no
        // visible way to refuse. `entry: 18` puts a real notch in the lane, and
        // a short `climb` runs it down to full depth fast enough to feel like a
        // slide and slow enough not to be a fall.
        at: 0.18, dwell: 12, depth: 96, entry: 18, lip: 0.012, climb: 0.16, hold: 0.88,
        // Plumber's own furniture, minus the cactus — a desert plant is the one
        // thing in the set that cannot be underground. The pipe earns its place
        // twice over: it is tall enough to be a real jump and it is the thing
        // this cabinet is named after.
        hazards: ['crate', 'barrel', 'pipe', 'drone'],
        prize: 'coins', bonus: 'capShield', lowPrize: 'capSpeed',
      },
    ],
    // ONE harmonic bed (the original A-F-C-G loop) for the whole song — no
    // section-to-section progressions. Movement comes from melodic variations
    // that keep the exact same rhythm with different notes, and from chords
    // creeping in gradually. Arc: main melody alone for 8 bars (v1 then v2),
    // then 1 stab -> 2 stabs -> 4 -> stabs on every beat with full echo, and
    // the wrap drops back to the lone melody.
    music: PLUMBER.bank,
    patterns: [
      ...BASE_PATTERNS,
      P(0, [{ t: 'qcrate', dx: 0 }]),
      P(0, [{ t: 'crate', dx: 0, n: 2 }, { t: 'qcrate', dx: 0 }]), // the stack under the prize makes the ram a two-step
      P(1, [{ t: 'crate', dx: 0, n: 2 }, coinArc(70)]),
      P(1, [{ t: 'qcrate', dx: 0 }, { t: 'qcrate', dx: 16 }, { t: 'cactus', dx: 90 }]),
      P(2, [{ t: 'pipe', dx: 0 }, coinArc(60)]),
      P(2, [{ t: 'qcrate', dx: 0 }, { t: 'qcrate', dx: 16 }, { t: 'qcrate', dx: 32 }]),
      // THE PEEL IS BENCHED. Everything below used to be the banana peel lane —
      // eight patterns across two cabinets, built to give Plumber a hazard you
      // read by looking DOWN at the road. The peel itself is untouched: the
      // prop, the entity, the slip and the gallery bake-off all still exist, and
      // putting it back is re-adding these cells. It is out of the spawn bag
      // while its shape is still an open question.
      //
      // What replaces it here is the other half of that same argument. Plumber's
      // ground game was a cactus and a box — two silhouettes that stand UP — and
      // these are the platformer's own answer to that: a trap in the floor and a
      // blade in the floor, neither of which can be broken, punted or slid past.
      //
      // Tier 0, alone, on clear ground: a plate of teeth is a thing you have to
      // be taught to see once, exactly as the peel was.
      P(0, [{ t: 'popSpikes', dx: 0 }]),
      // The coins are the instruction. A seven-coin hump laid down first and the
      // plate under its crest: the player jumps for the arc and clears the
      // spikes as a by-product, which is how this reads as a rule and not a hit.
      P(0, [coinArc(0), { t: 'popSpikes', dx: 42 }]),
      // Up then down, a beat apart: the crate is a silhouette to clear and the
      // plate is a mark on the floor. Two different LOOKS at the same lane is
      // the whole reason for putting a floor hazard in this cabinet.
      P(1, [{ t: 'crate', dx: 0 }, { t: 'popSpikes', dx: 56 }]),
      P(1, [{ t: 'floorSaw', dx: 0 }]),
      P(1, [{ t: 'campfire', dx: 0 }, coinArc(70)]),
      // The pipe is tall enough to hide what is behind it until you are on it,
      // and the saw is in the floor. Tier 2 for that reason: it is a read you
      // can only make early, and early is a skill.
      P(2, [{ t: 'pipe', dx: 0 }, { t: 'floorSaw', dx: 60 }]),
      // Prize box overhead, teeth underfoot. Jumping for the !-crate is what
      // carries you over the plate — take the prize and the hazard is free.
      P(2, [{ t: 'popSpikes', dx: 0 }, { t: 'qcrate', dx: 0 }]),
      P(2, [{ t: 'floorSaw', dx: 0 }, { t: 'popSpikes', dx: 70 }]),
      // Plumber's ground furniture was two props deep, and both of them were
      // things that stand up. The barrel rolls AT you and the double stack is a
      // wall — the cabinet already owned both through BASE_PATTERNS, at tier 2
      // only, which is late enough that most of a first run never met them.
      P(1, [{ t: 'barrel', dx: 0 }, coinArc(90)]),
      P(1, [{ t: 'pipe', dx: 0 }]),
      // Spread from Speed: the drum fire, unbootable and already burning, so
      // Plumber's floor game is not the only thing here that refuses the punt.
      P(1, [{ t: 'fireBarrel', dx: 0 }]),
      // The buzzbird had exactly one berth in Act I (a lone BASE tier-1 cell).
      // Behind a cactus it is a second read at a second height, far enough on
      // to be its own decision.
      P(2, [{ t: 'cactus', dx: 0 }, { t: 'buzzbird', dx: 80 }]),
      // A bag-dealt pit. Only plumber-3 can draw it, and plumber-3 is the stage
      // that teaches pits with three scripted ones — this is the pop quiz.
      P(2, [{ t: 'gap', dx: 0, w: 56 }]),
      P(2, [{ t: 'boomBarrier', dx: 0 }, coinArc(60)]),
      PEEL_ONCE,
      // The peel in context (see PEEL_ONCE for the cap and the group): a crate
      // invites the slide-plow, and the peel behind it is what riding the slide
      // out costs. Same group, so a run meets one peel however it is dressed.
      P(1, [{ t: 'crate', dx: 0 }, { t: 'bananaPeel', dx: 70 }, coinArc(130)],
        { once: true, onceGroup: 'peel' }),
    ],
    taunt: 'MY IQ IS 300 AND YOURS IS A HIGH SCORE.',
  },
  {
    id: 'speed', name: 'SPEED ZONE', act: 1, style: 'faux3d',
    genre: 'RACING', unlockPlugs: 2, speedBonus: 0.15,
    mechanic: 'boost',
    sky: ['#f08048', '#f8c060'], ground: '#c88848', groundDark: '#a06830',
    far: '#d09858', hills: '#b07840',
    // MOLTEN CHANNEL under the collapsing road (pitFill.js candidate B): the
    // one fill that throws light, so a speed-zone pit announces itself by glow
    // before the mouth is in frame — worth having on the cabinet where you
    // have the least time to read anything.
    pitFill: 'lava',
    // The original E-minor lap, unchanged note-for-note, played eight times —
    // then the same lap walked through a I-IV-V at the key level: two blocks
    // in A minor (IV), two in B minor (V), and the wrap resolves V back to I.
    // Modulating the whole lap rather than reharmonising inside it keeps the
    // tune identical in all three keys, so the progression is heard as the
    // track changing gear rather than as a new section.
    //
    // The open hats are held back to arrive with the first modulation: the key
    // going up and the hi-hat opening are one gear change, not two.
    //
    // One mix change underneath: the kick is on quarters rather than eighths
    // (at 128bpm it was landing on top of every bass note and the low end
    // never breathed). The bass lane itself is untouched.
    music: SPEED.bank,
    patterns: [
      ...BASE_PATTERNS,
      ...ANIMALS.speed,
      P(0, [{ t: 'boostPad', dx: 0 }, coinArc(60)]),
      P(0, [{ t: 'trafficCone', dx: 0 }]),
      // The buzzbird at tier 0: speed-1 was all silhouettes on the road, and
      // this is the one thing on it the road never carried.
      P(0, [{ t: 'buzzbird', dx: 0 }]),
      // Cone rather than cactus after the pad — the cabinet's own furniture,
      // and one fewer cactus sighting per stage (BASE already deals plenty).
      P(1, [{ t: 'boostPad', dx: 0 }, { t: 'trafficCone', dx: 120 }]),
      P(1, [{ t: 'trafficCone', dx: 0 }, { t: 'trafficCone', dx: 40 }]),
      P(2, [{ t: 'gap', dx: 0, w: 56 }]),           // collapsing road: a pit
      P(2, [{ t: 'boostPad', dx: 0 }, { t: 'gap', dx: 90, w: 72 }, coinArc(100)]),
      P(2, [{ t: 'barrel', dx: 0 }, { t: 'barrel', dx: 140 }]),
      P(2, [{ t: 'trafficCone', dx: 0 }, { t: 'trafficCone', dx: 30 }, { t: 'trafficCone', dx: 60 }]),
      PEEL_ONCE,
      // The peel in context (see PEEL_ONCE): the cone rows are the game's
      // standing invitation to hold the slide and punt through, and the peel at
      // the end of one is the counter-argument — the one hazard a slide cannot
      // take. Shares the peel group, so a run still meets at most one.
      P(2, [{ t: 'trafficCone', dx: 0 }, { t: 'trafficCone', dx: 30 }, { t: 'bananaPeel', dx: 96 }],
        { once: true, onceGroup: 'peel' }),
      // The drum fire makes the same argument every frame: a roadside barrel
      // that is already burning, cannot be booted, and only goes away if you
      // shoot it.
      P(1, [{ t: 'fireBarrel', dx: 0 }]),
      P(1, [{ t: 'trafficCone', dx: 0 }, { t: 'fireBarrel', dx: 50 }]),
      P(2, [{ t: 'trafficCone', dx: 0 }, { t: 'trafficCone', dx: 30 }, { t: 'fireBarrel', dx: 76 }]),
      // Off a boost pad. The barrel does not move, but you are arriving at it a
      // third faster, and it is the one thing on this stage that a punt cannot
      // clear out of the way first.
      P(2, [{ t: 'boostPad', dx: 0 }, { t: 'fireBarrel', dx: 120 }]),
      // Spread from Plumber: the two floor plates, so Speed's road can lie to
      // you at ankle height too. The saw off a boost pad is the same argument
      // as the fireBarrel above it — same hazard, a third less time to read it.
      P(1, [{ t: 'popSpikes', dx: 0 }]),
      P(2, [{ t: 'boostPad', dx: 0 }, { t: 'floorSaw', dx: 110 }]),
      // The campfire's second home (it had exactly one berth in the game), and
      // a barrel slot below tier 2 so the rolling read arrives before stage 3.
      P(1, [{ t: 'campfire', dx: 0 }, coinArc(70)]),
      P(1, [{ t: 'barrel', dx: 0 }, coinArc(90)]),
      // The boom barrier — roadwork on a racing stage, and the road's first
      // ground-anchored duck (see OBSTACLES.boomBarrier).
      P(1, [{ t: 'boomBarrier', dx: 0 }]),
      P(2, [{ t: 'boomBarrier', dx: 0 }, { t: 'trafficCone', dx: 110 }]),
    ],
    taunt: 'I INVENTED SPEED. IN 1987. NO ONE THANKED ME.',
  },
  {
    id: 'neon', name: 'NEON BLASTERS', act: 1, style: 'neon',
    genre: 'SHMUP', unlockPlugs: 5, speedBonus: 0.3,
    mechanic: 'pellets',
    sky: ['#0a0a2a', '#1a1048'], ground: '#282858', groundDark: '#181838',
    far: '#302868', hills: '#282050',
    music: NEON.bank,
    patterns: [
      // Tier-0 BASE stays filtered out — no cactus-and-crate opener here; the
      // cabinet's identity is the air. But identity is not a two-pattern bag:
      // neon-1 used to hold ONLY the lone drone and the lone target, and the
      // anti-repeat nudge in pickPattern turned its whole sixty seconds into a
      // strict drone/target alternation. The tier-0 rows below are the fix —
      // flyer-majority, one ground read, seven ways to open.
      ...BASE_PATTERNS.filter((p) => p.tier > 0),
      ...ANIMALS.neon,
      P(0, [{ t: 'drone', dx: 0 }]),
      P(0, [{ t: 'target', dx: 0 }, coinArc(40)]),
      P(0, [{ t: 'buzzbird', dx: 0 }]),
      P(0, [{ t: 'drone', dx: 0 }, coinLine(60)]),
      // Two targets far enough apart to be two shots, not one composite — this
      // pair used to sit at tier 1 with dx 30, which was one decision wearing
      // two sprites. Demoted respaced: it feeds neon-1's 5-target mission.
      P(0, [{ t: 'target', dx: 0 }, { t: 'target', dx: 110 }]),
      P(0, [{ t: 'target', dx: 0 }, coinStair(30)]),
      // The one tier-0 ground read, taught solo on clear ground — the same
      // convention Plumber opened the spike plate with.
      P(0, [{ t: 'popSpikes', dx: 0 }]),
      P(1, [{ t: 'shooterDrone', dx: 0 }]),
      // The security gate: a cabinet about the air finally asks for the duck
      // at ground level (see OBSTACLES.boomBarrier).
      P(1, [{ t: 'boomBarrier', dx: 0 }, coinLine(40)]),
      // Spread from Plumber/Speed: a glowing blade and a burning drum belong
      // under this sky as much as any lane's.
      P(1, [{ t: 'floorSaw', dx: 0 }]),
      P(1, [{ t: 'fireBarrel', dx: 0 }, coinArc(70)]),
      P(2, [{ t: 'shooterDrone', dx: 0 }, { t: 'drone', dx: 110 }]),
      // Was a cactus behind the shooter — the one desert prop in the bag's own
      // rows. The drum fire keeps the ground threat and drops the sagebrush.
      P(2, [{ t: 'shooterDrone', dx: 0 }, { t: 'fireBarrel', dx: 130 }]),
      P(2, [{ t: 'shooterDrone', dx: 0 }, { t: 'boomBarrier', dx: 120 }]),
      P(2, [{ t: 'gap', dx: 0, w: 56 }]),
    ],
    taunt: 'THOSE LASERS COST ME A FORTUNE. DODGE THEM RESPECTFULLY.',
  },
  {
    id: 'frost', name: 'FROST FORTRESS', act: 2, style: 'watercolor',
    genre: 'ICE ADVENTURE', unlockPlugs: 12, speedBonus: 0.45,
    mechanic: 'ice', // slidey landings + icicles + frozen switches
    sky: ['#b8d8f0', '#e0ecf8'], ground: '#c8e0f0', groundDark: '#98b8d8',
    far: '#a8c8e8', hills: '#88a8c8',
    // Frozen till under the ice, not the default warm brown — the underside of
    // a raised road and the walls of any cut have to read as the same cold
    // world the surface does (see `soil` on plumber for what this field is).
    soil: '#6f8fae',
    // Black water with pale floes at the bottom of every break (pitFill.js,
    // ported from the bake-off's candidate H). Frost is the cabinet whose gap
    // patterns and scripted pits both existed with nothing at the bottom.
    pitFill: 'slush',
    // A berg staircase early, and one sky road: same grammar as plumber's
    // routes (that entry carries the full field commentary), placed clear of
    // frost-2's pit at 0.40 and frost-3's at 0.28/0.74, and of both
    // checkpoints. The high road pays coins; the lane below it holds LOW GRAV,
    // which on the slidey cabinet is the one capsule that changes how landing
    // works — different KINDS up and down, per the fork rule.
    islands: [
      { at: 0.08, dwell: 1.8, steps: 2, rise: 29, step: 33, topPrize: 'capShield' },
    ],
    forks: [
      {
        at: 0.55, dwell: 6, spring: true, sky: true,
        entry: 96, peak: 168, lip: 0.2, climb: 0.34, hold: 0.70, end: 48,
        gaps: [0.5], gapSec: 0.3,
        prize: 'coins', lowPrize: 'capLowGrav',
      },
    ],
    music: FROST.bank,
    patterns: [
      ...ICE_PATTERNS,
      P(0, [{ t: 'icicle', dx: 0 }]),
      P(1, [{ t: 'icicle', dx: 0 }, { t: 'icicle', dx: 60 }]),
      P(1, [{ t: 'switch', dx: 0 }, { t: 'gap', dx: 60, w: 60 }]), // hit switch -> bridge
      P(2, [{ t: 'icicle', dx: 0 }, { t: 'snowman', dx: 70 }, coinArc(120)]),
      P(2, [{ t: 'gap', dx: 0, w: 64 }, { t: 'icicle', dx: 120 }]),
      // The heating is unplugged (see the taunt), so the campfire is the one
      // warm thing on the ice — same argument as Corporate's bin fire, and it
      // breaks up a lane that was 60% snowman-or-crate at stage 1.
      P(0, [{ t: 'campfire', dx: 0 }, coinArc(70)]),
      // Ice spikes and a ski gate: the floor read and the duck read, both of
      // which this cabinet had none of (its whole duck game was one shared
      // drone row).
      P(1, [{ t: 'popSpikes', dx: 0 }]),
      P(1, [{ t: 'boomBarrier', dx: 0 }]),
      P(2, [{ t: 'snowmanBig', dx: 0 }, { t: 'icicle', dx: 90 }]),
      P(2, [{ t: 'boomBarrier', dx: 0 }, { t: 'snowman', dx: 120 }]),
      // The switch's second shape — the frozen-switch mechanic lived in exactly
      // ONE pattern game-wide before this. A wider hole and an icicle past the
      // far lip, so making the bridge is the start of the read, not the end.
      P(2, [{ t: 'switch', dx: 0 }, { t: 'gap', dx: 60, w: 72 }, { t: 'icicle', dx: 190 }]),
    ],
    taunt: 'I UNPLUGGED THE HEATING TOO. FOR DRAMA.',
  },
  {
    id: 'crypt', name: 'CRYPT SHIFT', act: 2, style: 'vhs',
    genre: 'HORROR', unlockPlugs: 16, speedBonus: 0.45,
    mechanic: 'darkness', // light radius; cursed shortcuts
    sky: ['#181020', '#281830'], ground: '#3a3048', groundDark: '#281c30',
    far: '#302040', hills: '#282038',
    // The earth of a graveyard: near-black violet, so the catacomb's walls are
    // darker than the lane above them rather than warmer.
    soil: '#1f1628',
    // The catacomb — the "cursed shortcuts" the mechanic line has always
    // promised, and the one cabinet where going underground is the THEME
    // rather than a route. Ten seconds under the graveyard, and the hazard
    // list ends in the brazier on purpose: it is the game's only hazard that
    // is also a light source, and down here in the brown-out it is the
    // furniture you steer by. Placed clear of both checkpoints (a restore
    // inside a tunnel would put the hero back underground); crypt has no
    // scripted pits to dodge, by the blackout rule in stages.js.
    tunnels: [
      {
        at: 0.40, dwell: 10, depth: 96, entry: 18, lip: 0.012, climb: 0.16, hold: 0.88,
        hazards: ['tombstone', 'zombie', 'brazier'],
      },
    ],
    music: CRYPT.bank,
    patterns: [
      ...ANIMALS.crypt,
      ...BASE_PATTERNS.filter((p) => p.tier > 0),
      P(0, [{ t: 'tombstone', dx: 0 }]),
      P(0, [{ t: 'tombstone', dx: 0 }, coinArc(60)]),
      P(1, [{ t: 'zombie', dx: 0 }]),
      P(1, [{ t: 'zombie', dx: 0 }, { t: 'tombstone', dx: 80 }]),
      P(2, [{ t: 'zombie', dx: 0 }, { t: 'zombie', dx: 40 }, coinArc(110)]),
      P(2, [{ t: 'tombstone', dx: 0 }, { t: 'drone', dx: 90 }]),
      // FIRE IN THE DARK CABINET. Crypt's mechanic is a light radius, which
      // makes it the one stage where a burning hazard pays you something back:
      // the brazier is lit before you can see the lane it stands in, so it
      // doubles as the only landmark in the pattern it belongs to.
      //
      // Tier 0 alone, then earning company — the same introduction the
      // tombstone gets, because a chest-height fire is a new shape here.
      P(0, [{ t: 'brazier', dx: 0 }]),
      P(0, [{ t: 'campfire', dx: 0 }, coinArc(60)]),
      P(1, [{ t: 'brazier', dx: 0 }, { t: 'tombstone', dx: 80 }]),
      // A dungeon trap under a grave marker. The tombstone is the silhouette
      // that hides it: at this light radius the plate is inside the stone's
      // shadow until you are nearly on it.
      P(1, [{ t: 'tombstone', dx: 0 }, { t: 'popSpikes', dx: 62 }]),
      P(1, [{ t: 'campfire', dx: 0 }, { t: 'zombie', dx: 84 }]),
      P(2, [{ t: 'popSpikes', dx: 0 }, { t: 'brazier', dx: 88 }, coinArc(140)]),
      // The dungeon's own blade. Crypt already owns the spike plate; the saw
      // completes the trap-floor pair here the way it does in Plumber.
      P(1, [{ t: 'floorSaw', dx: 0 }]),
      P(2, [{ t: 'floorSaw', dx: 0 }, { t: 'tombstone', dx: 84 }]),
    ],
    taunt: 'THE DARKNESS IS A COST-SAVING MEASURE. THE SPOOKINESS IS FREE.',
  },
  {
    id: 'rhythm', name: 'RHYTHM BANKRUPTCY', act: 2, style: 'lcd',
    genre: 'RHYTHM', unlockPlugs: 20, speedBonus: 0.45,
    mechanic: 'beat', // obstacles quantized to the beat; on-beat bonus
    sky: ['#202018', '#383828'], ground: '#484838', groundDark: '#303024',
    far: '#404030', hills: '#383828',
    music: RHYTHM.bank,
    patterns: [
      // Full BASE. This bank used to filter `tier < 2`, which quietly made
      // Rhythm the only cabinet in the game that never dealt a barrel and left
      // its stage-2→3 escalation at exactly three patterns. No comment ever
      // defended the filter, and a rolling barrel is the most beat-readable
      // hazard the shared set owns.
      ...BASE_PATTERNS,
      // The signature, taught at stage 1: rhythm-1 runs at tierMax 1, and the
      // beat prop used to be one tier-1 pattern in a bag of thirteen — 69% of
      // which was cactus-or-crate. Tier 0 solo first, then in company.
      P(0, [{ t: 'beatBar', dx: 0 }]),
      P(0, [{ t: 'beatBar', dx: 0 }, coinArc(60)]),
      P(1, [{ t: 'beatBar', dx: 0 }, { t: 'beatBar', dx: 72 }]),
      P(2, [{ t: 'beatBar', dx: 0 }, { t: 'beatBar', dx: 90 }]),
      P(2, [{ t: 'beatBar', dx: 0 }, { t: 'drone', dx: 100 }]),
      P(2, [{ t: 'cactus', dx: 0 }, { t: 'beatBar', dx: 80 }, coinArc(140)]),
      // Three pops in a row is the cabinet's thesis stated as a lane: the bars
      // rise quantized to the song, so this reads as a drum fill you jump.
      P(2, [{ t: 'beatBar', dx: 0 }, { t: 'beatBar', dx: 80 }, { t: 'beatBar', dx: 160 }]),
      // Spread from Act I: the saw spins on its own clock against the bars'
      // beat, the spikes are the off-beat floor read, and the crossing gate is
      // this cabinet's first duck that is not the shared drone row.
      P(1, [{ t: 'floorSaw', dx: 0 }]),
      P(1, [{ t: 'boomBarrier', dx: 0 }]),
      P(2, [{ t: 'popSpikes', dx: 0 }, { t: 'beatBar', dx: 70 }]),
      P(2, [{ t: 'beatBar', dx: 0 }, { t: 'boomBarrier', dx: 110 }]),
    ],
    taunt: 'I OWN THE RIGHTS TO RHYTHM. YOU OWE ME ROYALTIES PER JUMP.',
  },
  {
    id: 'cardboard', name: 'CARDBOARD KINGDOM', act: 3, style: 'cardboard',
    genre: 'FAKE-O-RAMA', unlockPlugs: 28, speedBonus: 0.55,
    mechanic: 'collapse', // scenery collapses behind; fake perspective props
    sky: ['#d8c8a8', '#e8dcc0'], ground: '#c8a068', groundDark: '#9a7848',
    far: '#b89058', hills: '#a88448',
    // Corrugated brown, declared rather than defaulted, so the cut edge of a
    // raised road reads as the inside of the cardboard it claims to be.
    soil: '#7a5c34',
    // OPEN AIR at the bottom of every hole (pitFill.js candidate A — free):
    // a kingdom whose castle is four inches tall gets pits that are honestly
    // just holes cut out of the set, with grit still crumbling off the edges.
    pitFill: 'void',
    // Stacked boxes to climb — the most box-shaped set piece the routes system
    // makes, on the most box-shaped cabinet. Both stacks sit clear of every
    // scripted pit on cardboard-2 (0.30/0.70) and -3 (0.25/0.55/0.80) and of
    // both checkpoints; the second one tops out at AIR JUMP, which is the
    // capsule that makes the next stack easier — the climb teaches its own
    // reward.
    islands: [
      { at: 0.10, dwell: 1.8, steps: 2, rise: 29, step: 33, topPrize: 'capStar' },
      { at: 0.62, dwell: 3.0, steps: 3, rise: 29, step: 33, topPrize: 'capAirJump' },
    ],
    music: CARDBOARD.bank,
    patterns: [
      ...BASE_PATTERNS,
      ...ANIMALS.cardboard,
      P(0, [{ t: 'cardboardMonster', dx: 0 }]),
      P(1, [{ t: 'cardboardMonster', dx: 0 }, coinArc(70)]),
      P(1, [{ t: 'gap', dx: 0, w: 56 }]),
      P(2, [{ t: 'cardboardMonster', dx: 0 }, { t: 'gap', dx: 90, w: 64 }]),
      P(2, [{ t: 'cardboardMonster', dx: 0 }, { t: 'buzzbird', dx: 100 }]),
      // The kingdom's own cast, doubled up: before this, 81% of Cardboard was
      // shared desert furniture and the cabinet's ONLY unique prop appeared in
      // four patterns of twenty-one.
      P(1, [{ t: 'cardboardMonster', dx: 0 }, { t: 'cardboardMonster', dx: 90 }]),
      P(2, [{ t: 'cardboardMonster', dx: 0 }, { t: 'drone', dx: 100 }]),
      // Spread from Act I, each one a cardboard joke that is also a real read:
      // the box cutter in the floor, an open flame in a kingdom made of
      // kindling, and a toll gate into the castle.
      P(1, [{ t: 'floorSaw', dx: 0 }]),
      P(1, [{ t: 'campfire', dx: 0 }, coinArc(70)]),
      P(2, [{ t: 'boomBarrier', dx: 0 }, coinArc(60)]),
    ],
    taunt: 'THAT CASTLE IS FOUR INCHES TALL. LIKE MY PATIENCE.',
  },
  {
    id: 'office', name: 'CORPORATE KOMBAT', act: 3, style: 'doodle',
    genre: 'OFFICE ACTION', unlockPlugs: 34, speedBonus: 0.55,
    mechanic: 'meetings', // printers, chairs, paperwork
    sky: ['#e8e8f0', '#f4f4f8'], ground: '#b0b0c0', groundDark: '#8a8a98',
    far: '#c8c8d8', hills: '#b8b8c8',
    music: OFFICE.bank,
    patterns: [
      ...ANIMALS.office,
      ...BASE_PATTERNS.filter((p) => p.tier > 0),
      P(0, [{ t: 'chair', dx: 0 }]),
      P(0, [{ t: 'printer', dx: 0 }]),
      P(1, [{ t: 'chair', dx: 0 }, { t: 'printer', dx: 110 }]),
      P(1, [{ t: 'paperwork', dx: 0 }]),
      P(2, [{ t: 'printer', dx: 0 }, { t: 'paperwork', dx: 90 }, coinArc(140)]),
      P(2, [{ t: 'chair', dx: 0 }, { t: 'chair', dx: 120 }]),
      // A bin fire in the office, which is the joke and also the read: Corporate
      // Kombat's lane is all pale greys, and this is the only warm thing in it.
      P(1, [{ t: 'fireBarrel', dx: 0 }]),
      P(2, [{ t: 'fireBarrel', dx: 0 }, { t: 'paperwork', dx: 90 }]),
      // Printer supply: office-2's mission is DESTROY 5 PRINTERS, and it was
      // running off a three-pattern stock. Two more berths keep the mission's
      // clock honest without the spawner needing to know about it.
      P(1, [{ t: 'printer', dx: 0 }, coinLine(50)]),
      P(2, [{ t: 'printer', dx: 0 }, { t: 'printer', dx: 130 }]),
      // The parking barrier — the office finally guards its own car park, and
      // Act III gets the ground-anchored duck (see OBSTACLES.boomBarrier).
      P(1, [{ t: 'boomBarrier', dx: 0 }]),
      P(2, [{ t: 'boomBarrier', dx: 0 }, { t: 'chair', dx: 130 }]),
      // The peel in the cafeteria (see PEEL_ONCE for the cap and the group):
      // its one Act III shape, so the gag can land in the back third of the
      // campaign without waiting for Surge's union.
      P(1, [{ t: 'chair', dx: 0 }, { t: 'bananaPeel', dx: 76 }], { once: true, onceGroup: 'peel' }),
    ],
    taunt: 'THIS MEETING COULD HAVE BEEN AN EMAIL. THE EMAIL IS ALSO A TRAP.',
  },
  {
    id: 'surge', name: 'THE SURGE', act: 3, style: 'surge',
    genre: 'EVERYTHING', unlockPlugs: 40, speedBonus: 0.65,
    mechanic: 'remix', // segments sample other cabinets
    sky: ['#181828', '#282838'], ground: '#484858', groundDark: '#303040',
    far: '#404050', hills: '#383848',
    music: SURGE.bank,
    patterns: [], // filled at runtime by the remix engine from cabinets 1-8
    taunt: 'BEHOLD. EVERY GAME AT ONCE. MY MASTERPIECE. MY MASHTERPIECE.',
  },
];

// The arcade hub's loitering theme (also playable from the SOUND TEST menu).
// A slow build: starts as the bare loiter groove and adds a layer every two
// bars — firmer pulse, backbeat, arpeggio, chord stabs, grit — peaking in a
// double-arp crescendo with a snare roll, then wrapping back to the bare
// start. Harmony: Am Em G D | Am Em G B-dim/E7, which pulls home to Am.
const HT_KICK4 = seq('C1 . . .').map((v) => !!v);
const HT_HATS_OFF = seq('. . C1 .').map((v) => !!v);
const HT_SNARE = seq('. . . . C1 . . . . . . . C1 . . .').map((v) => !!v);
const HT_ARP = seq('A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 D3 F#3 A3 F#3 | A3 C4 E4 C4 E3 G3 B3 G3 G3 B3 D4 B3 B2 D3 F3 D3');
const HT_ARP_HI = seq('A4 C5 E5 C5 E4 G4 B4 G4 G4 B4 D5 B4 D4 F#4 A4 F#4 | A4 C5 E5 C5 E4 G4 B4 G4 G4 B4 D5 B4 B3 D4 F4 D4');
export const HUB_THEME = HUB.bank;

// Main-menu nocturne: Plumber Panic remembered from an empty arcade down the
// hall. It keeps that track's A-F-C-G bed and fragments of its A-C-E melody,
// but leaves percussion out entirely and lets each tone dissolve into echo.
export const TITLE_THEME = TITLE.bank;

// The finale: surge's remix engine reworks the food-court song into a house
// cut on the way out the door. Same Am7-Em7-Gmaj7-Dmaj bed as HUB_THEME, but
// rebuilt as an actual house arrangement — four-on-the-floor kick, offbeat
// open hats, a bouncing off-beat bassline, piano-style chord stabs — with a
// real breakdown-into-riser-into-drop arc rather than just a faster copy.
const FT_CHAT = seq('C1 .').map((v) => !!v); // closed hats, straight 8ths
const FT_OHAT = seq('. . C1 .').map((v) => !!v); // open hat on the off-beat of every beat
const FT_SILENT = seq('.').map((v) => !!v);
// The intro/build clav: an octave above where a bassline would sit, so it
// cuts through as a bright plucked hook rather than mud under the kick —
// which also leaves the low end empty until the drop's A1 bass lands.
// Rhythm is 1-1-2-3-3-4 rather than a flat 1-2-3-4: the first and third
// notes of each group double up an eighth apart, which gives the line a
// bounce instead of marching evenly through the bar.
const FT_BASS = seq('. . A3 . A3 . E3 . . . G3 . G3 . D3 . . . A3 . A3 . E3 . . . G3 . G3 . B3 .');
// Rimshot counter-rhythm: a 3-3-2 tresillo landing on 1, the "a" of 1, and
// the "&" of 3 — every hit falls in a gap the clav stab leaves open, so the
// two interlock into one groove instead of doubling each other.
const FT_RIM = seq('C1 . . C1 . . . . C1 . . C1 . . . .').map((v) => !!v);
const FT_CHORDS = chordSeq('A3min7 . . . . . . . E3min7 . . . . . . . G3maj7 . . . . . . . D3maj . . . . . . .'); // house piano stab, one per half-bar
const FT_RISER = seq('. . . . . . . . . . . . . . . . . . . . . . . . . . . . G5 . . .'); // filter-sweep riser into the drop
const FT_SWEEP = seq('C1 . . . . . . . . . . . . . . .').map((v) => !!v); // one filtered-noise swell per bar
// A single filtered crash on beat 4 of the last count-in bar — the wash that
// announces the clav. Step 28 is the downbeat of beat 4, so it rings across
// the bar line and decays under the entry.
const FT_CRASH_IN = seq('. . . . . . . . . . . . . . . . . . . . . . . . . . . . C1 . . .').map((v) => !!v);
// Vocals stay out of the whole opening — count-in and clav intro alike. With
// only drums and a single pitched line under them the shouts have nothing to
// sit in and read as stray noise; the drop's vox hits carry that job instead.
const FT_VOX = seq('. . . . . . A3 . . . . . . . . .');
// The drop's hook: a straight-8th-note broken-chord line (root-3rd-5th-3rd
// of each chord) landing squarely on the beat and the "&" — the same grid
// the bassline sits on, so it locks in instead of fighting it.
const FT_LEAD = seq('A4 . C5 . E5 . C5 . E4 . G4 . B4 . G4 . G4 . B4 . D5 . B4 . D4 . F#4 . A4 . F#4 .');
const FT_LEAD_HI = seq('A5 . C6 . E6 . C6 . E5 . G5 . B5 . G5 . G5 . B5 . D6 . B5 . D5 . F#5 . A5 . F#5 .'); // same hook, octave up for the peak
// A bright ding on the downbeat of every bar (step 0 and step 16) so "the 1"
// is always audible — nothing else in the arrangement marks it, since the
// kick is four-on-the-floor and the bass/hats patterns are all off-beat.
const FT_ONE = seq('E6 . . . . . . . . . . . . . . . E6 . . . . . . . . . . . . . . .');
// The drop's bassline: an octave lower than the intro/build for real weight,
// root on the downbeat then a syncopated push on the "and" of beat 2 (a
// dembow-ish 1 . . . . . & . shape) instead of sitting squarely on every
// beat — solid but with some bounce, anchoring the kick without going flat.
const FT_BASS_DROP = seq('A1 . . . . . A1 . E1 . . . . . E1 . G1 . . . . . G1 . D1 . . . . . D1 .');
const FT_DROP_BASE = {
  ohats: FT_OHAT, clap: HT_SNARE, chords: FT_CHORDS, chordType: 'sawtooth', chordDur: 0.28, chordGain: 0.1,
  // bassRepeat 3 = a single softer restatement a dotted-eighth later, landing
  // on the grid between the root and its syncopated push. Cleaner than the
  // echo send, which smeared a feedback tail across the whole drop.
  bass: FT_BASS_DROP, bassType: 'sawtooth', bassDur: 3.2, bassGain: 0.19,
  bassRepeat: 3, bassRepeatGain: 0.38, bassRepeatDur: 0.7,
  // A swell per bar under the bass and hook — the drop is dense enough that
  // this reads as air moving through it rather than as audible hiss.
  sweeps: FT_SWEEP, sweepDur: 12, sweepGain: 0.016,
};
// lead/bass/chord "Dur" fields are multiples of a 16th-note step, not
// seconds — at 126bpm a step is ~0.12s. FT_LEAD hits every 2 steps, so ~1.7
// rings each note out most of the way to the next without smearing into it.
export const FINALE_THEME = FINALE.bank;

export const CABINET_BY_ID = Object.fromEntries(CABINETS.map((c) => [c.id, c]));

// THE SURGE remixes every other cabinet: its bank is the union of all their
// patterns (BASE_PATTERNS included once, not nine times). Without this the
// bank stays empty and surge stages spawn no obstacles and no coins at all,
// which makes its coin challenge impossible.
// Deduped by IDENTITY, not just against BASE_PATTERNS. Cabinets may share a
// pattern object deliberately — PEEL_ONCE is shared precisely so its once-per-run
// cap holds everywhere — and without this the union would carry one copy per
// cabinet that references it, handing a Surge stage as many "once" hazards as
// there are cabinets carrying them. The peel's authored context patterns are
// DISTINCT objects and identity cannot dedupe them; their `onceGroup: 'peel'`
// is what keeps this union to one peel per run (see Spawner.pickPattern).
CABINET_BY_ID.surge.patterns = [...new Set([
  ...BASE_PATTERNS,
  ...CABINETS.filter((c) => c.id !== 'surge')
    .flatMap((c) => c.patterns.filter((p) => !BASE_PATTERNS.includes(p))),
])];
