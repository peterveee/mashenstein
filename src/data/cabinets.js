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
const coinArc = (dx, n = 4) => ({ t: 'coinArc', dx, n });
const PERC_OFF = seq('.').map((v) => !!v); // silent percussion lane (section override)

const BASE_PATTERNS = [
  P(0, [{ t: 'cactus', dx: 0 }]),
  P(0, [{ t: 'cactus', dx: 0 }, coinArc(60)]),
  P(0, [{ t: 'crate', dx: 0 }]),
  P(0, [{ t: 'crate', dx: 0, n: 2 }]), // a double stack reads as a real wall even at tier 0
  P(0, [coinArc(0, 5)]),
  P(1, [{ t: 'cactus', dx: 0 }, { t: 'cactus', dx: 26 }]),
  P(1, [{ t: 'cactusBig', dx: 0 }, coinArc(80)]),
  P(1, [{ t: 'crate', dx: 0 }, { t: 'crate', dx: 40, n: 2 }]), // low then high: a two-beat read
  P(1, [{ t: 'buzzbird', dx: 0, y: 60 }]),
  P(1, [{ t: 'drone', dx: 0, y: 26 }]), // low flyer: duck under
  P(2, [{ t: 'crate', dx: 0, n: 2 }, coinArc(70)]),
  P(2, [{ t: 'cactus', dx: 0 }, { t: 'drone', dx: 90, y: 26 }]),
  P(2, [{ t: 'barrel', dx: 0 }]),
  P(2, [{ t: 'cactusBig', dx: 0 }, { t: 'cactus', dx: 100 }, coinArc(50)]),
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
      P(0, [{ t: 'boostPad', dx: 0 }, coinArc(60, 6)]),
      P(0, [{ t: 'trafficCone', dx: 0 }]),
      P(1, [{ t: 'boostPad', dx: 0 }, { t: 'cactus', dx: 120 }]),
      P(1, [{ t: 'trafficCone', dx: 0 }, { t: 'trafficCone', dx: 40 }]),
      P(2, [{ t: 'gap', dx: 0, w: 56 }]),           // collapsing road: a pit
      P(2, [{ t: 'boostPad', dx: 0 }, { t: 'gap', dx: 90, w: 72 }, coinArc(100, 5)]),
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
