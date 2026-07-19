// The nine arcade cabinets: palettes, style packs, mechanics, pattern banks,
// music banks. Patterns are data: cells of {t: obstacleType, dx, y?, n?}.
// dx is px from pattern origin; the spawner enforces fairness gaps between
// action-required cells at spawn time, so patterns describe intent, not exact spacing.
import { seq } from '../engine/audio.js';

// Shared pattern helpers -----------------------------------------------------
const P = (tier, cells, opts = {}) => ({ tier, cells, ...opts });
const coinArc = (dx, n = 4) => ({ t: 'coinArc', dx, n });

const BASE_PATTERNS = [
  P(0, [{ t: 'shrub', dx: 0 }]),
  P(0, [{ t: 'shrub', dx: 0 }, coinArc(60)]),
  P(0, [{ t: 'crate', dx: 0 }]),
  P(0, [coinArc(0, 5)]),
  P(1, [{ t: 'shrub', dx: 0 }, { t: 'shrub', dx: 26 }]),
  P(1, [{ t: 'shrubBig', dx: 0 }, coinArc(80)]),
  P(1, [{ t: 'buzzbird', dx: 0, y: 60 }]),
  P(1, [{ t: 'drone', dx: 0, y: 26 }]), // low flyer: duck under
  P(2, [{ t: 'crate', dx: 0, n: 2 }, coinArc(70)]),
  P(2, [{ t: 'shrub', dx: 0 }, { t: 'drone', dx: 90, y: 26 }]),
  P(2, [{ t: 'barrel', dx: 0 }]),
  P(2, [{ t: 'shrubBig', dx: 0 }, { t: 'shrub', dx: 100 }, coinArc(50)]),
];

export const CABINETS = [
  {
    id: 'plumber', name: 'PLUMBER PANIC', act: 1, style: 'pixel',
    genre: 'PLATFORMER', unlockPlugs: 0,
    mechanic: 'qcrates', // breakable ?-crates, pipes as secret routes
    sky: ['#78c8f0', '#a8e0f8'], ground: '#3a9c48', groundDark: '#2a7038',
    far: '#5ab060', hills: '#48a050',
    music: { bpm: 112, bass: seq('A2 . A2 . F2 . F2 . C3 . C3 . G2 . G2 .'), lead: seq('A4 . C5 E5 . A4 . . F4 A4 C5 . E5 . D5 C5 | A4 . C5 E5 . G5 . . F5 E5 D5 . C5 . B4 A4'), kick: seq('C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v), hats: seq('. . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v) },
    patterns: [
      ...BASE_PATTERNS,
      P(0, [{ t: 'qcrate', dx: 0, y: 54 }]),
      P(1, [{ t: 'qcrate', dx: 0, y: 54 }, { t: 'qcrate', dx: 16, y: 54 }, { t: 'shrub', dx: 90 }]),
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
    music: { bpm: 128, bass: seq('E2 E2 . E2 . E2 . . G2 G2 . G2 . G2 . . A2 A2 . A2 . A2 . . B2 . D3 . B2 . G2 .'), lead: seq('E5 . . B4 . E5 . G5 . E5 . B4 . A4 . B4'), kick: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v), hats: seq('C1 C1 . C1 C1 C1 . C1').map((v) => !!v) },
    patterns: [
      ...BASE_PATTERNS,
      P(0, [{ t: 'boostPad', dx: 0 }, coinArc(60, 6)]),
      P(1, [{ t: 'boostPad', dx: 0 }, { t: 'shrub', dx: 120 }]),
      P(2, [{ t: 'gap', dx: 0, w: 56 }]),           // collapsing road: a pit
      P(2, [{ t: 'boostPad', dx: 0 }, { t: 'gap', dx: 90, w: 72 }, coinArc(100, 5)]),
      P(2, [{ t: 'barrel', dx: 0 }, { t: 'barrel', dx: 140 }]),
    ],
    taunt: 'I INVENTED SPEED. IN 1987. NO ONE THANKED ME.',
  },
  {
    id: 'neon', name: 'NEON BLASTERS', act: 1, style: 'neon',
    genre: 'SHMUP', unlockPlugs: 5, speedBonus: 0.3,
    mechanic: 'pellets',
    sky: ['#0a0a2a', '#1a1048'], ground: '#282858', groundDark: '#181838',
    far: '#302868', hills: '#282050',
    music: { bpm: 120, bass: seq('A2 . E2 . A2 . E2 . F2 . C2 . F2 . C2 . D2 . A1 . D2 . A1 . E2 . E2 . G2 . B2 .'), lead: seq('A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5'), leadType: 'sawtooth', kick: seq('C1 . . C1 . . C1 .').map((v) => !!v), hats: seq('. C1 . C1').map((v) => !!v) },
    patterns: [
      ...BASE_PATTERNS.filter((p) => p.tier > 0),
      P(0, [{ t: 'drone', dx: 0, y: 26 }]),
      P(0, [{ t: 'target', dx: 0, y: 50 }, coinArc(40)]),
      P(1, [{ t: 'shooterDrone', dx: 0, y: 60 }]),
      P(1, [{ t: 'target', dx: 0, y: 50 }, { t: 'target', dx: 30, y: 70 }]),
      P(2, [{ t: 'shooterDrone', dx: 0, y: 60 }, { t: 'drone', dx: 110, y: 26 }]),
      P(2, [{ t: 'shooterDrone', dx: 0, y: 44 }, { t: 'shrub', dx: 130 }]),
    ],
    taunt: 'THOSE LASERS COST ME A FORTUNE. DODGE THEM RESPECTFULLY.',
  },
  {
    id: 'frost', name: 'FROST FORTRESS', act: 2, style: 'watercolor',
    genre: 'ICE ADVENTURE', unlockPlugs: 12, speedBonus: 0.45,
    mechanic: 'ice', // slidey landings + icicles + frozen switches
    sky: ['#b8d8f0', '#e0ecf8'], ground: '#c8e0f0', groundDark: '#98b8d8',
    far: '#a8c8e8', hills: '#88a8c8',
    music: { bpm: 100, bass: seq('D2 . . . A2 . . . B1 . . . F2 . . . G1 . . . D2 . . . G2 . . . A2 . . .'), lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 .'), leadType: 'triangle', kick: seq('C1 . . . . . . . C1 . . . . . . .').map((v) => !!v), hats: seq('. . C1 . C1 . . .').map((v) => !!v) },
    patterns: [
      ...BASE_PATTERNS,
      P(0, [{ t: 'icicle', dx: 0 }]),
      P(1, [{ t: 'icicle', dx: 0 }, { t: 'icicle', dx: 60 }]),
      P(1, [{ t: 'switch', dx: 0, y: 50 }, { t: 'gap', dx: 60, w: 60 }]), // hit switch -> bridge
      P(2, [{ t: 'icicle', dx: 0 }, { t: 'shrub', dx: 70 }, coinArc(120)]),
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
    music: { bpm: 90, bass: seq('A1 . . . A1 . . . A1 . . . C2 . B1 . A1 . . . A1 . . . F1 . . . E1 . . .'), lead: seq('A4 . . . . . C5 . . . B4 . . . . .'), leadType: 'triangle', kick: seq('C1 . . . . . . .').map((v) => !!v), hats: seq('. . . C1').map((v) => !!v) },
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
    music: { bpm: 124, bass: seq('C2 . C2 . G2 . E2 . C2 . C2 . A2 . G2 . F2 . F2 . C2 . A1 . G1 . G2 . B2 . D3 .'), lead: seq('C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . .'), kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v), hats: seq('. . C1 . . . C1 . . . C1 . . C1 . C1').map((v) => !!v) },
    patterns: [
      ...BASE_PATTERNS.filter((p) => p.tier < 2),
      P(1, [{ t: 'beatBar', dx: 0 }]),
      P(2, [{ t: 'beatBar', dx: 0 }, { t: 'beatBar', dx: 90 }]),
      P(2, [{ t: 'beatBar', dx: 0 }, { t: 'drone', dx: 100, y: 26 }]),
      P(2, [{ t: 'shrub', dx: 0 }, { t: 'beatBar', dx: 80 }, coinArc(140)]),
    ],
    taunt: 'I OWN THE RIGHTS TO RHYTHM. YOU OWE ME ROYALTIES PER JUMP.',
  },
  {
    id: 'cardboard', name: 'CARDBOARD KINGDOM', act: 3, style: 'cardboard',
    genre: 'FAKE-O-RAMA', unlockPlugs: 28, speedBonus: 0.55,
    mechanic: 'collapse', // scenery collapses behind; fake perspective props
    sky: ['#d8c8a8', '#e8dcc0'], ground: '#c8a068', groundDark: '#9a7848',
    far: '#b89058', hills: '#a88448',
    music: { bpm: 108, bass: seq('C2 . G1 . C2 . G1 . F1 . C2 . F1 . C2 . G1 . D2 . G1 . D2 . C2 . E2 . G2 . C3 .'), lead: seq('E5 D5 C5 . . G4 . . E5 D5 C5 . D5 . . .'), leadType: 'triangle', kick: seq('C1 . . . C1 . . .').map((v) => !!v), hats: seq('. C1 . . . C1 . C1').map((v) => !!v) },
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
    music: { bpm: 116, bass: seq('G1 . G1 . B1 . B1 . C2 . C2 . D2 . D2 . E2 . E2 . C2 . C2 . D2 . B1 . G1 . . .'), lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 .'), kick: seq('C1 . . C1 . . C1 .').map((v) => !!v), hats: seq('C1 . C1 . C1 . C1 .').map((v) => !!v) },
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
    music: { bpm: 132, bass: seq('A1 A2 . A1 . A2 A1 . F1 F2 . F1 . F2 F1 . G1 G2 . G1 . G2 G1 . E2 . E2 E2 . B2 . .'), lead: seq('A5 G5 E5 . A5 . G5 E5 D5 . E5 . C5 . E5 .'), leadType: 'sawtooth', kick: seq('C1 . C1 C1 . C1 C1 .').map((v) => !!v), hats: seq('C1 C1 C1 C1').map((v) => !!v) },
    patterns: [], // filled at runtime by the remix engine from cabinets 1-8
    taunt: 'BEHOLD. EVERY GAME AT ONCE. MY MASTERPIECE. MY MASHTERPIECE.',
  },
];

// The arcade hub's loitering theme (also playable from the SOUND TEST menu).
export const HUB_THEME = {
  bpm: 90,
  bass: [110, null, null, null, 82, null, null, null, 98, null, null, null, 73, null, null, null, 110, null, null, null, 82, null, null, null, 98, null, null, null, 123, null, null, null],
  kick: Array.from({ length: 32 }, (_, i) => i % 8 === 0),
  hats: Array.from({ length: 32 }, (_, i) => i % 8 === 4),
};

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
