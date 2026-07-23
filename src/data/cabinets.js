// The nine arcade cabinets: palettes, style packs, mechanics, pattern banks,
// music banks. Patterns are data: cells of {t: obstacleType, dx, y?, n?}.
// dx is px from pattern origin; the spawner enforces fairness gaps between
// action-required cells at spawn time, so patterns describe intent, not exact spacing.
import { seq, chordSeq } from '../engine/audio.js';

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
    music: {
      bpm: 112,
      bass: seq('A2 . A2 . F2 . F2 . C3 . C3 . G2 . G2 .'),
      lead: seq('A4 . C5 E5 . A4 . . F4 A4 C5 . E5 . D5 C5 | A4 . C5 E5 . G5 . . F5 E5 D5 . C5 . B4 A4'),
      leadHarm: seq('F4 . A4 C5 . F4 . . D4 F4 A4 . C5 . B4 A4 | F4 . A4 C5 . E5 . . D5 C5 B4 . A4 . G4 F4'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('. C1 . C1').map((v) => !!v),
      ohats: seq('. . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      sections: [
        { leadHarm: null, snare: PERC_OFF, clap: PERC_OFF, ohats: PERC_OFF, echoLevel: 0 }, // 1: main melody alone, bone dry
        { leadHarm: null, clap: PERC_OFF, echoLevel: 0.08, // 2: melody variation (same rhythm, new notes), snare in
          lead: seq('E5 . C5 A4 . E5 . . G5 E5 C5 . D5 . B4 D5 | E5 . C5 A4 . A5 . . G5 F5 E5 . D5 . C5 B4') },
        { echoLevel: 0.14, // 3: harmony + first stab, quiet keyboard run at the turn
          keyGliss: seq('. . . . . . . . . . . . . . . . . . . . . . . . . . . . E5 . . .'),
          keyGlissGain: 0.035,
          shout: seq('. . . . . . . . . . . . . . . . A3 . . . . . . . . . . . . . . .'),
          shoutGain: 0.35,
          chords: chordSeq('. . . A3min7 . . . . . . . . . . . . . . . . . . . . . . . . . . . .') },
        { lead: seq('A5 . E5 C5 . A4 . . G4 C5 E5 . D5 . D5 B4 | A5 . E5 C5 . C5 . . G4 C5 E5 . B4 . G4 A4'),
          leadHarm: seq('F5 . C5 A4 . F4 . . E4 A4 C5 . B4 . B4 G4 | F5 . C5 A4 . A4 . . E4 A4 C5 . G4 . E4 F4'),
          echoLevel: 0.2, // 4: high variation, two stabs
          chords: chordSeq('. . . A3min7 . . . . . . . . . . . . . . . . . . . F3maj7 . . . . . . . .') },
        { lead: seq('E5 . C5 A4 . E5 . . G5 E5 C5 . D5 . B4 D5 | E5 . C5 A4 . A5 . . G5 F5 E5 . D5 . C5 B4'),
          leadHarm: seq('C5 . A4 F4 . C5 . . E5 C5 A4 . B4 . G4 B4 | C5 . A4 F4 . F5 . . E5 D5 C5 . B4 . A4 G4'),
          echoLevel: 0.27, // 5: stabs every half-bar, keyboard run lifts into the payoff
          keyGliss: seq('. . . . . . . . . . . . . . . . . . . . . . . . . . . . A5 . . .'),
          keyGlissGain: 0.035,
          chords: chordSeq('. . . A3min7 . . . . . . . C4maj7 . . . . . . . A3min7 . . . . . . . C4maj7 . . . .') },
        { echoLevel: 0.35, // 6: home melody + echoing stabs, opening shout
          shout: seq('A3 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .'),
          shoutGain: 0.35,
          chords: chordSeq('. . . A3min7 . . . F3maj7 . . . C4maj7 . . . G3maj') },
      ],
      order: [0, 0, 1, 1, 2, 3, 4, 5],
    },
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
    music: { bpm: 128, bass: seq('E2 E2 . E2 . E2 . . G2 G2 . G2 . G2 . . A2 A2 . A2 . A2 . . B2 . D3 . B2 . G2 .'), lead: seq('E5 . . B4 . E5 . G5 . E5 . B4 . A4 . B4'), kick: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v), hats: seq('C1 C1 . C1 C1 C1 . C1').map((v) => !!v), snare: seq('. . . . C1 . . . . . . . C1 . . .').map((v) => !!v), clap: seq('. . . . . . . . . . . . C1 . . .').map((v) => !!v) },
    patterns: [
      ...BASE_PATTERNS,
      P(0, [{ t: 'boostPad', dx: 0 }, coinArc(60, 6)]),
      P(1, [{ t: 'boostPad', dx: 0 }, { t: 'cactus', dx: 120 }]),
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
    music: { bpm: 120, bass: seq('A2 . E2 . A2 . E2 . F2 . C2 . F2 . C2 . D2 . A1 . D2 . A1 . E2 . E2 . G2 . B2 .'), lead: seq('A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5'), leadType: 'sawtooth', kick: seq('C1 . . C1 . . C1 .').map((v) => !!v), hats: seq('. C1 . C1').map((v) => !!v), clap: seq('. . . . C1 . . . . . . . C1 . . .').map((v) => !!v) },
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
    music: { bpm: 100, bass: seq('D2 . . . A2 . . . B1 . . . F2 . . . G1 . . . D2 . . . G2 . . . A2 . . .'), lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 .'), leadType: 'triangle', kick: seq('C1 . . . . . . . C1 . . . . . . .').map((v) => !!v), hats: seq('. . C1 . C1 . . .').map((v) => !!v), snare: seq('. . . . . . . . C1 . . . . . . .').map((v) => !!v) },
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
    music: { bpm: 90, bass: seq('A1 . . . A1 . . . A1 . . . C2 . B1 . A1 . . . A1 . . . F1 . . . E1 . . .'), lead: seq('A4 . . . . . C5 . . . B4 . . . . .'), leadType: 'triangle', kick: seq('C1 . . . . . . .').map((v) => !!v), hats: seq('. . . C1').map((v) => !!v), clap: seq('. . . . . . . . . . . . C1 . . .').map((v) => !!v) },
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
    music: { bpm: 124, bass: seq('C2 . C2 . G2 . E2 . C2 . C2 . A2 . G2 . F2 . F2 . C2 . A1 . G1 . G2 . B2 . D3 .'), lead: seq('C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . .'), kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v), hats: seq('. . C1 . . . C1 . . . C1 . . C1 . C1').map((v) => !!v), snare: seq('. . . . C1 . . . . . . . C1 . . .').map((v) => !!v), clap: seq('. . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v) },
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
    music: { bpm: 108, bass: seq('C2 . G1 . C2 . G1 . F1 . C2 . F1 . C2 . G1 . D2 . G1 . D2 . C2 . E2 . G2 . C3 .'), lead: seq('E5 D5 C5 . . G4 . . E5 D5 C5 . D5 . . .'), leadType: 'triangle', kick: seq('C1 . . . C1 . . .').map((v) => !!v), hats: seq('. C1 . . . C1 . C1').map((v) => !!v), snare: seq('. . . . C1 . . . . . . . C1 . . .').map((v) => !!v) },
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
    music: { bpm: 116, bass: seq('G1 . G1 . B1 . B1 . C2 . C2 . D2 . D2 . E2 . E2 . C2 . C2 . D2 . B1 . G1 . . .'), lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 .'), kick: seq('C1 . . C1 . . C1 .').map((v) => !!v), hats: seq('C1 . C1 . C1 . C1 .').map((v) => !!v), clap: seq('. . . . C1 . . . . . . . C1 . . .').map((v) => !!v) },
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
    music: { bpm: 132, bass: seq('A1 A2 . A1 . A2 A1 . F1 F2 . F1 . F2 F1 . G1 G2 . G1 . G2 G1 . E2 . E2 E2 . B2 . .'), lead: seq('A5 G5 E5 . A5 . G5 E5 D5 . E5 . C5 . E5 .'), leadType: 'sawtooth', kick: seq('C1 . C1 C1 . C1 C1 .').map((v) => !!v), hats: seq('C1 C1 C1 C1').map((v) => !!v), snare: seq('. . . . C1 . . . . . . . C1 . . .').map((v) => !!v), clap: seq('. . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v) },
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
export const HUB_THEME = {
  bpm: 90,
  echoEverything: true, // the original mix: a light echo wash on (almost) everything, claps and vox included, not just the melodic lanes
  bass: seq('A2 . . . E2 . . . G2 . . . D2 . . . A2 . . . E2 . . . G2 . . . B2 . . .'),
  kick: seq('C1 . . . . . . .').map((v) => !!v),
  hats: seq('. . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . . . . . . . . . C1 . . .').map((v) => !!v),
  sections: [
    {}, // 1: bare loiter groove
    { kick: HT_KICK4, hats: HT_HATS_OFF }, // 2: the pulse firms up
    { kick: HT_KICK4, hats: HT_HATS_OFF, snare: HT_SNARE,
      ohats: seq('. . . . . . C1 .').map((v) => !!v),
      keyGliss: seq('. . . . . . . . . . . . . . . . . . . . . . . . . . . . A4 . . .') }, // 3: backbeat arrives, keyboard run announces the arp
    { kick: HT_KICK4, hats: HT_HATS_OFF, snare: HT_SNARE,
      ohats: seq('. . . . . . C1 .').map((v) => !!v), lead: HT_ARP }, // 4: arpeggio in
    { kick: HT_KICK4, hats: HT_HATS_OFF, snare: HT_SNARE,
      ohats: HT_HATS_OFF, lead: HT_ARP,
      gliss: seq('. . . . . . . . . . . . . . . . . . . . . . . . . . . . E5 . . .'),
      chords: chordSeq('A3min7 . . . . . . . G3maj7 . . . . . . . A3min7 . . . . . . . G3maj7 . . . . . . .') }, // 5: stabs join, gliss lifts into the grit
    { kick: HT_KICK4, hats: seq('C1 .').map((v) => !!v), snare: HT_SNARE,
      ohats: HT_HATS_OFF, lead: HT_ARP, bassType: 'sawtooth',
      clap: HT_SNARE,
      vox: seq('. . . . . . A3 . . . . . . . . .'),
      chords: chordSeq('A3min7 . . . . . . . G3maj7 . . . . . . . A3min7 . . . . . . . G3maj7 . . . . . . .') }, // 6: grit, doubled claps, first "hey!"
    { kick: seq('C1 . . . C1 . C1 .').map((v) => !!v), hats: seq('C1 .').map((v) => !!v),
      snare: HT_SNARE,
      ohats: HT_HATS_OFF, lead: HT_ARP_HI, leadHarm: HT_ARP, bassType: 'sawtooth',
      clap: HT_SNARE,
      vox: seq('. . . . A3 . . . . . C4 . . . . . | . . . . A3 . . . . . E4 . . . . .'), // rising vocal hits
      shout: seq('. . . . . . . . . . . . . . . . A3 . . . . . . . . . . . . . . .'), // "yeah!" mid-peak
      gliss: seq('A5 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .'), // announce the peak
      chords: chordSeq('A3min7 . . . E3min7 . . . G3maj7 . . . D3maj . . . A3min7 . . . E3min7 . . . G3maj7 . . . E37 . . .') }, // 7: crescendo, E7 pulls home
    { kick: seq('C1 . . . C1 . C1 .').map((v) => !!v), hats: seq('C1 .').map((v) => !!v),
      snare: HT_SNARE.map((v, i) => v || i >= 26), // 8: crescendo tail — roll into the drop
      ohats: HT_HATS_OFF, lead: HT_ARP_HI, leadHarm: HT_ARP, bassType: 'sawtooth',
      clap: HT_SNARE,
      vox: seq('. . . . A3 . . . . . C4 . . . . . | . . . . A3 . . . . . E4 . . . . .'),
      keyGliss: seq('. . . . . . . . . . . . . . . . . . . . . . . . A5 . . . . . . .'), // final keyboard sweep into the drop
      chords: chordSeq('A3min7 . . . E3min7 . . . G3maj7 . . . D3maj . . . A3min7 . . . E3min7 . . . G3maj7 . . . E37 . . .') },
  ],
  // each build stage holds for 4 bars (two 2-bar blocks); the roll variant is
  // its own final block so the snare roll only fires right before the drop
  order: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7],
};

// Main-menu nocturne: Plumber Panic remembered from an empty arcade down the
// hall. It keeps that track's A-F-C-G bed and fragments of its A-C-E melody,
// but leaves percussion out entirely and lets each tone dissolve into echo.
export const TITLE_THEME = {
  bpm: 56,
  bass: seq('A2 . . . . . . . F2 . . . . . . . C3 . . . . . . . G2 . . . . . . .'),
  bassType: 'sine', bassGain: 0.045, bassDur: 7.4, bassAttack: 0.18,
  lead: seq('A4 . . C5 . . E5 . F4 . . A4 . . C5 . E5 . . G5 . . E5 . D5 . . C5 . . .'),
  leadType: 'sine', leadGain: 0.035, leadDur: 5.5, leadAttack: 0.16,
  leadHarm: seq('E4 . . . . . C5 . C4 . . . . . A4 . G4 . . . . . C5 . B4 . . . . . G4 .'),
  harmType: 'triangle', harmGain: 0.016, harmDur: 6.2, harmAttack: 0.28,
  twinkle: seq('. . . . E6 . . . . . . . . . . . . . G6 . . . . . . . . . . . . .'),
  twinkleGain: 0.012, twinkleDur: 7, twinkleAttack: 0.06,
  keyGlissGain: 0.008,
  sweeps: seq('. . . . . . . . . . . . C1 . . . . . . . . . . . . . . . . . . .').map((v) => !!v),
  sweepGain: 0.013, sweepDur: 10,
  chords: chordSeq('A3min7 . . . . . . . F3maj7 . . . . . . . C4maj7 . . . . . . . G3maj . . . . . . .'),
  chordType: 'triangle', chordGain: 0.018, chordDur: 7.6, chordAttack: 0.35,
  echoLevel: 0.52,
  sections: [
    {}, // distant: two isolated lights in the whole phrase
    { twinkle: seq('. . E6 . . . . . . C6 . . . . . . . . G6 . . . . . . E6 . . . . . .'),
      keyGliss: seq('. . . . . . . . . . . . . . . . . . . . . . . . . . . . E6 . . .'),
      sweeps: seq('. . . . . . . . C1 . . . . . . . . . . . . . . . . . . . . . . .').map((v) => !!v) },
    { twinkle: seq('. E6 . . . C6 . . . . E6 . . G6 . . . C7 . . . E6 . . G6 . . . C6 . .'),
      keyGliss: seq('. . . . . . . . . . . . C6 . . . . . . . . . . . . . . . G6 . . .'),
      sweeps: seq('. . . . . . . . . . . . . . . . . . . . C1 . . . . . . . . . . .').map((v) => !!v) },
    { twinkle: seq('E6 . C6 . . E6 . G6 . . C7 . . G6 . E6 . . C6 E6 . . G6 . C7 . . E6 . G6 .'),
      keyGliss: seq('. . . . . . . . . . E6 . . . . . . . . . . . . . . . . . C7 . . .'),
      sweeps: seq('. . . . C1 . . . . . . . . . . . . . . . . . . . C1 . . . . . . .').map((v) => !!v) },
  ],
  // Each density holds for two phrases, so the sparkle gathers almost
  // imperceptibly over about a minute before the nocturne breathes out again.
  order: [0, 0, 1, 1, 2, 2, 3, 3],
};

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
export const FINALE_THEME = {
  bpm: 126,
  // The intro/build "clav": a short square stab that reads as plucked
  // percussion rather than a bassline. Near-instant attack keeps the
  // transient crisp, with enough decay to ring; it carries the groove
  // alone before the kit fills in.
  bassType: 'square', bassDur: 0.95, bassGain: 0.2, bassAttack: 0.001,
  chordType: 'square', chordDur: 0.32, chordGain: 0.09, chordAttack: 0.005,
  twinkle: FT_ONE, twinkleGain: 0.05, twinkleDur: 0.22, twinkleAttack: 0.004,
  // echoBus (src/engine/audio.js) only carries melodic lanes (lead/chords/
  // twinkle) — kick/hats/clap/vox are structurally dry, so this can run at
  // a normal level throughout instead of being suppressed to hide the claps.
  echoLevel: 0.22,
  bass: FT_BASS,
  kick: HT_KICK4,
  hats: FT_CHAT,
  sections: [
    { rim: FT_RIM }, // 1: intro — bare pulse: kick, hats, the clav stab and the rimshot counter-rhythm
    // The clav hands the harmony over to the chords: once the stabs arrive it
    // has nothing left to say, so bass: null clears it rather than doubling
    // the progression underneath them.
    { bass: null, rim: FT_RIM, ohats: FT_OHAT, clap: HT_SNARE, chords: FT_CHORDS }, // 2: build — offbeat hats, backbeat clap, stab chords lock in
    { bass: null, kick: FT_SILENT, hats: FT_OHAT, chords: FT_CHORDS,
      chordType: 'triangle', chordDur: 3.2, chordGain: 0.05, echoLevel: 0.55,
      gliss: FT_RISER }, // 3: breakdown — kick drops out, pad swells, riser builds into the drop
    { ...FT_DROP_BASE }, // 4: drop lands — solid bass locks in with the full house stack, no hook yet
    { ...FT_DROP_BASE, lead: FT_LEAD, leadType: 'sawtooth', leadDur: 1.7, leadGain: 0.08, leadAttack: 0.006 }, // 5: the hook enters solo, sitting back over the bass
    { ...FT_DROP_BASE, lead: FT_LEAD, leadType: 'sawtooth', leadDur: 1.7, leadGain: 0.08, leadAttack: 0.006, vox: FT_VOX }, // 6: vocal hits layer in under it
    { ...FT_DROP_BASE, lead: FT_LEAD_HI, leadType: 'sawtooth', leadDur: 1.7, leadGain: 0.09, leadAttack: 0.006, vox: FT_VOX }, // 7: peak — hook jumps an octave
    { kick: FT_SILENT, hats: FT_CHAT, sweeps: FT_SWEEP }, // 8: outro — strip back to just the bassline as the strip powers down
    // 9/10: the four-bar count-in. Drums and rimshot only — bass: null drops
    // the clav out of the base bank, so the pitched line is held back until
    // the arrangement proper starts. The second pair of bars adds the sweep.
    { bass: null, rim: FT_RIM },
    { bass: null, rim: FT_RIM, crash: FT_CRASH_IN, crashDur: 7, crashGain: 0.1, crashEcho: true },
    // 11: the pre-build. Open hats and the backbeat clap arrive first and the
    // clav keeps running underneath them, so the groove thickens a stage
    // before the harmony changes hands.
    { rim: FT_RIM, ohats: FT_OHAT, clap: HT_SNARE },
    // 12: the second breakdown's back half — same pad chords and riser, but
    // the kit returns in full underneath (kick and closed hats inherited from
    // the base bank, plus open hats, clap and rim), so the drums come back
    // before the drop rather than at it.
    { bass: null, chords: FT_CHORDS, chordType: 'triangle', chordDur: 3.2, chordGain: 0.05,
      echoLevel: 0.55, gliss: FT_RISER, ohats: FT_OHAT, clap: HT_SNARE, rim: FT_RIM },
  ],
  // Four bars per stage on the way in, each adding one layer:
  //   1-4   count-in — drums and rim, crash on the last beat
  //   5-8   clav over the drums
  //   9-12  open hats and clap thicken under it
  //   13-20 breakdown — drums drop out, clav stops, pad chords and the riser
  //         carry it alone (section 2, not the drummed build at 1)
  //   21-36 the drop: new bass and arpeggio, sixteen bars building
  //         hook -> hook+vox -> octave-up peak -> back through both
  //   37-40 breakdown again — drops back to chords and sweeps
  //   41-44 same, but the full kit comes back in under the pad
  //   45-60 the drop a second time, same sixteen-bar build
  //   61-68 third breakdown, drums returning again for its back half
  //   69-84 final drop, weighted to the octave-up peak
  //   85-88 outro, powering down into the loop
  // Three breakdown/drop cycles put the loop around 2:48 — the finale is nine
  // click-through screens, so it needs to outlast a slow read rather than
  // wrapping back to the count-in partway through.
  order: [8, 9, 0, 0, 10, 10, 2, 2, 2, 2, 4, 4, 5, 5, 6, 6, 5, 6,
    2, 2, 11, 11, 4, 4, 5, 5, 6, 6, 5, 6,
    2, 2, 11, 11, 4, 4, 5, 5, 6, 6, 6, 6, 7, 0],
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
