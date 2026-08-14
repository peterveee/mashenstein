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
  P(1, [{ t: 'buzzbird', dx: 0, y: 60 }]),
  P(1, [{ t: 'drone', dx: 0, y: 26 }]), // low flyer: duck under
  P(1, [{ t: 'cactus', dx: 0 }, coinBlock(64)]),                // punch up through the slab
  P(1, [coinStair(0), { t: 'crate', dx: 84 }]),                 // the ramp telegraphs the crate
  P(2, [{ t: 'crate', dx: 0, n: 2 }, coinArc(70)]),
  P(2, [{ t: 'cactus', dx: 0 }, { t: 'drone', dx: 90, y: 26 }]),
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
      { at: 0.07, dwell: 1.8, steps: 2, rise: 29, step: 27, topPrize: 'capShield' },
      { at: 0.45, dwell: 4.0, steps: 4, rise: 29, step: 27, topPrize: 'capMagnet' },
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
      // Then it climbs to 210 and you are in the clouds with the hills below
      // you, and there is no coming back to the lane until the road brings you
      // back. That is the whole point of the numbers: at the old 29px the two
      // roads were one hop apart, so missing the turn cost nothing and taking
      // it committed you to nothing.
      //
      // It comes down to 96 and stops there — the height the spring threw you
      // to. You leave the road exactly as far above the lane as you were when
      // you joined it, and you get there the same way you would have without
      // the pad: by falling. The descent is short (`hold` at 0.82) so the last
      // stretch is a drop off the end of the clouds rather than a long ramp
      // walked back down to where you started.
      {
        at: 0.58, dwell: 7.5, spring: true, sky: true,
        entry: 96, peak: 210, lip: 0.2, climb: 0.34, hold: 0.82, end: 96,
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
        at: 0.18, dwell: 12, depth: 96, entry: 18, lip: 0.012, climb: 0.06, hold: 0.88,
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
      P(0, [{ t: 'qcrate', dx: 0, y: 54 }]),
      P(0, [{ t: 'crate', dx: 0, n: 2 }, { t: 'qcrate', dx: 0, y: 54 }]), // stack as a stepping stone to the prize
      P(1, [{ t: 'crate', dx: 0, n: 2 }, coinArc(70)]),
      P(1, [{ t: 'qcrate', dx: 0, y: 54 }, { t: 'qcrate', dx: 16, y: 54 }, { t: 'cactus', dx: 90 }]),
      P(2, [{ t: 'pipe', dx: 0 }, coinArc(60)]),
      P(2, [{ t: 'qcrate', dx: 0, y: 70 }, { t: 'qcrate', dx: 16, y: 70 }, { t: 'qcrate', dx: 32, y: 70 }]),
    ],
    taunt: 'MY IQ IS 300 AND YOURS IS A HIGH SCORE.',
  },
  {
    id: 'speed', name: 'SPEED ZONE', act: 1, style: 'faux3d',
    genre: 'RACING', unlockPlugs: 2, speedBonus: 0.15,
    mechanic: 'boost',
    sky: ['#f08048', '#f8c060'], ground: '#c88848', groundDark: '#a06830',
    far: '#d09858', hills: '#b07840',
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
      P(0, [{ t: 'boostPad', dx: 0 }, coinArc(60)]),
      P(0, [{ t: 'trafficCone', dx: 0 }]),
      P(1, [{ t: 'boostPad', dx: 0 }, { t: 'cactus', dx: 120 }]),
      P(1, [{ t: 'trafficCone', dx: 0 }, { t: 'trafficCone', dx: 40 }]),
      P(2, [{ t: 'gap', dx: 0, w: 56 }]),           // collapsing road: a pit
      P(2, [{ t: 'boostPad', dx: 0 }, { t: 'gap', dx: 90, w: 72 }, coinArc(100)]),
      P(2, [{ t: 'barrel', dx: 0 }, { t: 'barrel', dx: 140 }]),
      P(2, [{ t: 'trafficCone', dx: 0 }, { t: 'trafficCone', dx: 30 }, { t: 'trafficCone', dx: 60 }]),
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
      ...BASE_PATTERNS.filter((p) => p.tier > 0),
      P(0, [{ t: 'drone', dx: 0, y: 26 }]),
      P(0, [{ t: 'target', dx: 0, y: 50 }, coinArc(40)]),
      P(1, [{ t: 'shooterDrone', dx: 0, y: 60 }]),
      P(1, [{ t: 'target', dx: 0, y: 50 }, { t: 'target', dx: 30, y: 70 }]),
      P(2, [{ t: 'shooterDrone', dx: 0, y: 60 }, { t: 'drone', dx: 110, y: 26 }]),
      P(2, [{ t: 'shooterDrone', dx: 0, y: 44 }, { t: 'cactus', dx: 130 }]),
    ],
    taunt: 'THOSE LASERS COST ME A FORTUNE. DODGE THEM RESPECTFULLY.',
  },
  {
    id: 'frost', name: 'FROST FORTRESS', act: 2, style: 'watercolor',
    genre: 'ICE ADVENTURE', unlockPlugs: 12, speedBonus: 0.45,
    mechanic: 'ice', // slidey landings + icicles + frozen switches
    sky: ['#b8d8f0', '#e0ecf8'], ground: '#c8e0f0', groundDark: '#98b8d8',
    far: '#a8c8e8', hills: '#88a8c8',
    music: FROST.bank,
    patterns: [
      ...ICE_PATTERNS,
      P(0, [{ t: 'icicle', dx: 0 }]),
      P(1, [{ t: 'icicle', dx: 0 }, { t: 'icicle', dx: 60 }]),
      P(1, [{ t: 'switch', dx: 0, y: 50 }, { t: 'gap', dx: 60, w: 60 }]), // hit switch -> bridge
      P(2, [{ t: 'icicle', dx: 0 }, { t: 'snowman', dx: 70 }, coinArc(120)]),
      P(2, [{ t: 'gap', dx: 0, w: 64 }, { t: 'icicle', dx: 120 }]),
    ],
    taunt: 'I UNPLUGGED THE HEATING TOO. FOR DRAMA.',
  },
  {
    id: 'crypt', name: 'CRYPT SHIFT', act: 2, style: 'vhs',
    genre: 'HORROR', unlockPlugs: 16, speedBonus: 0.45,
    mechanic: 'darkness', // light radius; cursed shortcuts
    sky: ['#181020', '#281830'], ground: '#3a3048', groundDark: '#281c30',
    far: '#302040', hills: '#282038',
    music: CRYPT.bank,
    patterns: [
      ...BASE_PATTERNS.filter((p) => p.tier > 0),
      P(0, [{ t: 'tombstone', dx: 0 }]),
      P(0, [{ t: 'tombstone', dx: 0 }, coinArc(60)]),
      P(1, [{ t: 'zombie', dx: 0 }]),
      P(1, [{ t: 'zombie', dx: 0 }, { t: 'tombstone', dx: 80 }]),
      P(2, [{ t: 'zombie', dx: 0 }, { t: 'zombie', dx: 40 }, coinArc(110)]),
      P(2, [{ t: 'tombstone', dx: 0 }, { t: 'drone', dx: 90, y: 26 }]),
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
      ...BASE_PATTERNS.filter((p) => p.tier < 2),
      P(1, [{ t: 'beatBar', dx: 0 }]),
      P(2, [{ t: 'beatBar', dx: 0 }, { t: 'beatBar', dx: 90 }]),
      P(2, [{ t: 'beatBar', dx: 0 }, { t: 'drone', dx: 100, y: 26 }]),
      P(2, [{ t: 'cactus', dx: 0 }, { t: 'beatBar', dx: 80 }, coinArc(140)]),
    ],
    taunt: 'I OWN THE RIGHTS TO RHYTHM. YOU OWE ME ROYALTIES PER JUMP.',
  },
  {
    id: 'cardboard', name: 'CARDBOARD KINGDOM', act: 3, style: 'cardboard',
    genre: 'FAKE-O-RAMA', unlockPlugs: 28, speedBonus: 0.55,
    mechanic: 'collapse', // scenery collapses behind; fake perspective props
    sky: ['#d8c8a8', '#e8dcc0'], ground: '#c8a068', groundDark: '#9a7848',
    far: '#b89058', hills: '#a88448',
    music: CARDBOARD.bank,
    patterns: [
      ...BASE_PATTERNS,
      P(0, [{ t: 'cardboardMonster', dx: 0 }]),
      P(1, [{ t: 'cardboardMonster', dx: 0 }, coinArc(70)]),
      P(1, [{ t: 'gap', dx: 0, w: 56 }]),
      P(2, [{ t: 'cardboardMonster', dx: 0 }, { t: 'gap', dx: 90, w: 64 }]),
      P(2, [{ t: 'cardboardMonster', dx: 0 }, { t: 'buzzbird', dx: 100, y: 60 }]),
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
      ...BASE_PATTERNS.filter((p) => p.tier > 0),
      P(0, [{ t: 'chair', dx: 0 }]),
      P(0, [{ t: 'printer', dx: 0 }]),
      P(1, [{ t: 'chair', dx: 0 }, { t: 'printer', dx: 110 }]),
      P(1, [{ t: 'paperwork', dx: 0, y: 40 }]),
      P(2, [{ t: 'printer', dx: 0 }, { t: 'paperwork', dx: 90, y: 50 }, coinArc(140)]),
      P(2, [{ t: 'chair', dx: 0 }, { t: 'chair', dx: 120 }]),
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
CABINET_BY_ID.surge.patterns = [
  ...BASE_PATTERNS,
  ...CABINETS.filter((c) => c.id !== 'surge')
    .flatMap((c) => c.patterns.filter((p) => !BASE_PATTERNS.includes(p))),
];
