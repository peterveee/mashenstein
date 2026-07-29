// Procedural jukebox-only mash-up. Every existing jukebox melody is moved into
// the same A-minor/C-major neighbourhood, then DJ-mixed over one 120 BPM house
// rhythm section. No WAV asset is loaded or shipped.
import { seq, chordSeq } from '../engine/notes.js';
import { CABINETS, HUB_THEME, TITLE_THEME, FINALE_THEME } from './cabinets.js';
import { COUNTER_DANCE_MIX_THEME } from './shop-themes.js';
import { SONGS } from './songs/index.js';

const silence = seq('.');
const chordSilence = chordSeq('.');
const beats = (pattern) => seq(pattern).map((note) => !!note);
const transpose = (lane, semitones) => (lane || silence)
  .map((note) => note == null ? null : note * Math.pow(2, semitones / 12));
const secondBar = (lane) => lane.map((note, step) => step >= 16 ? note : null);

// One authored level and envelope for every imported hook. The lead is now a
// clear foreground voice, but still leaves the raised bass and stabs in front
// of the transition effects.
export const MEGAMIX_LEAD_GAIN = 0.064;

export const MEGAMIX_SOURCE_TRACKS = [
  { name: 'EMPTY ARCADE (TITLE THEME)', bank: TITLE_THEME },
  { name: 'THE FOOD COURT (HUB THEME)', bank: HUB_THEME },
  { name: 'CHECKOUT PROMENADE (SHOPPING)', bank: COUNTER_DANCE_MIX_THEME },
  ...CABINETS.map((cabinet) => ({ name: `${cabinet.name} (${cabinet.genre})`, bank: cabinet.music })),
  { name: 'ONE MORE SWITCH (FINALE THEME)', bank: FINALE_THEME },
];

// Hand-authored DJ key moves. Themes already living around A minor/C major
// stay put; E- and D-centred hooks are shifted into A minor, and a few very
// high parts are dropped an octave so the combined hooks share one register.
export const MEGAMIX_KEY_SHIFTS = [0, 12, 0, 0, 5, -12, -5, 0, 0, 0, 0, -12, -12];

function sourceMelody(track, semitones) {
  const bank = track.bank;
  const order = bank.order || (bank.sections ? bank.sections.map((_, i) => i) : [0]);
  let merged = bank;
  for (const sectionIndex of order) {
    const candidate = bank.sections ? { ...bank, ...bank.sections[sectionIndex] } : bank;
    if (candidate.lead?.some(Boolean) || candidate.twinkle?.some(Boolean)) {
      merged = candidate;
      break;
    }
  }
  const primary = merged.lead?.some(Boolean) ? merged.lead : merged.twinkle;
  return {
    sourceName: track.name,
    primary: transpose(primary, semitones),
  };
}

const melodies = MEGAMIX_SOURCE_TRACKS
  .map((track, index) => sourceMelody(track, MEGAMIX_KEY_SHIFTS[index]));

const HOUSE_KICK = beats('C1 . . .');
const HOUSE_HATS = beats('. . C1 .');
const HOUSE_OHATS = beats('. . . . . . C1 .');
const HOUSE_BACKBEAT = beats('. . . . C1 . . . . . . . C1 . . .');
const HOUSE_FILL = beats('. . . . C1 . . . . . . . C1 . C1 C1');
const HOUSE_TWO_BAR_CLAP = beats(
  '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .',
);
const INTRO_FINAL_FILL = beats(
  '. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 C1',
);
const HOUSE_RIM_OFF = beats('. . . C1 . . . . . . C1 . . . . .');
const HOUSE_RIM_FILL = beats('. . . . . . . . . . . . . C1 C1 C1');
const CRASH_DOWNBEAT = beats('C1 . . . . . . . . . . . . . . .');
const HOUSE_BASS = seq('A2 . . A2 . E2 G2 . C3 . . C3 . G2 A2 . | G2 . . G2 . D2 E2 . F2 . . F2 . C3 E2 .');
const HOUSE_CHORDS = chordSeq('A3min7 . . . . . . . C4maj7 . . . . . . . G3maj7 . . . . . . . F3maj7 . . . . . . .');
const LIFT_SWEEP = beats('. . . . . . . . . . . . . . . . . . . . . . . . C1 . . . . . . .');
const FX_BLIPS_UP = seq('. . . . . . E6 . . . . . . . . . | . . . . . . . . . . . G6 . . . .');
const FX_BLIPS_DOWN = seq('. . . . . . . . . D6 . . . . . . | . . . . . . . . A5 . . . . . . .');
const FX_SWOOP_A = seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . A5 . . .');
const FX_SWOOP_C = seq('. . . . . . . . . . . . . . . . | . . . . . . . . C6 . . . . . . .');
const FX_GLISS_E = seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . E6 . . .');
const FX_KEY_RUN = seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . A5 . . .');

const sharedMusic = {
  bass: HOUSE_BASS,
  bassFilteredSaw: true,
  bassEcho: false,
  bassGain: 0.07,
  bassFilterOpen: 820,
  bassFilterClose: 260,
  bassFilterQ: 0.9,
  bassFilteredSawSubGain: 0.21,
  chords: HOUSE_CHORDS,
  chordType: 'triangle',
  chordGain: 0.045,
  chordDur: 1.65,
  chordAttack: 0.025,
};

// Handoff embellishments: these now live on transition blocks rather than
// constantly changing underneath every hook. The listener gets two stable
// bars, then a recognisable fill into the next record.
function percussionFor(songIndex) {
  switch (songIndex % 4) {
    case 1: return { rim: HOUSE_RIM_OFF, rimGain: 0.065 };
    case 2: return { rim: HOUSE_RIM_FILL, rimGain: 0.07 };
    case 3: return { crash: CRASH_DOWNBEAT, crashGain: 0.05 };
    default: return {};
  }
}

// Planned DJ moments rather than an effect in every block. Their positions are
// asymmetric enough to feel spontaneous, while the long quiet gaps make each
// gesture read as part of the arrangement instead of constant decoration.
function transitionFx(songIndex) {
  const moments = {
    0: { electroFx: FX_BLIPS_UP, electroFxGain: 0.016 },
    2: { organSwoop: FX_SWOOP_A, organSwoopGain: 0.014, organSwoopFromSemitones: -7 },
    4: { sweeps: LIFT_SWEEP, sweepGain: 0.025, sweepDur: 8 },
    6: { gliss: FX_GLISS_E, glissGain: 0.018 },
    9: { electroFx: FX_BLIPS_DOWN, electroFxGain: 0.015 },
    11: { keyGliss: FX_KEY_RUN, keyGlissGain: 0.018 },
    12: { organSwoop: FX_SWOOP_C, organSwoopGain: 0.013, organSwoopFromSemitones: 5 },
  };
  return moments[songIndex] || {};
}

const introBase = {
  sourceName: 'FOUR-BAR DRUM INTRO',
  bass: silence, chords: chordSilence,
  lead: silence, leadHarm: silence, twinkle: silence,
  clap: silence, ohats: silence, rim: silence, crash: silence,
  sweeps: silence, electroFx: silence, organSwoop: silence,
  gliss: silence, keyGliss: silence,
};
const introSections = [
  { ...introBase, phase: 'intro-1', snare: silence },
  { ...introBase, phase: 'intro-2', snare: INTRO_FINAL_FILL },
];

function resetSections(act) {
  const bassAndChordsOnly = {
    ...sharedMusic,
    sourceName: 'BASS + CHORD RESET',
    lead: silence, leadHarm: silence, twinkle: silence,
    kick: silence, hats: silence, ohats: silence,
    clap: silence, snare: silence, rim: silence, crash: silence,
    sweeps: silence, electroFx: silence, organSwoop: silence,
    gliss: silence, keyGliss: silence,
  };
  return [
    { ...bassAndChordsOnly, phase: `act-${act}-reset-1` },
    { ...bassAndChordsOnly, phase: `act-${act}-reset-2` },
  ];
}

const mashSections = melodies.flatMap((melody, index) => {
  const next = melodies[(index + 1) % melodies.length];
  const actBoundary = index === 3 || index === 8;
  const finalClose = index === melodies.length - 1;
  const cleanClose = actBoundary || finalClose;
  const common = {
    ...sharedMusic,
    sourceName: melody.sourceName,
    keyShift: MEGAMIX_KEY_SHIFTS[index],
    lead: melody.primary,
    // The note patterns identify the source songs; one shared triangle voice
    // makes their perceived level far more consistent than inheriting a mix of
    // sine, square and saw waves at the same numeric gain.
    leadType: 'triangle',
    leadGain: MEGAMIX_LEAD_GAIN,
    leadDur: 1.25,
    leadAttack: 0.008,
    // Strip source-specific harmony and twinkle layers. Previously those made
    // dense songs sound hotter even though the main lead gain was identical.
    twinkle: silence,
    // The first act stays uncluttered. After its reset, one clap on the final
    // beat of every two-bar block becomes a steady long-phrase marker.
    clap: index >= 4 ? HOUSE_TWO_BAR_CLAP : silence,
  };
  return [
    {
      ...common,
      phase: 'hook',
      leadHarm: silence,
      harmType: 'triangle',
      harmGain: 0.022,
      harmDur: 1.1,
    },
    {
      ...common,
      phase: finalClose ? 'final-close' : actBoundary ? 'act-close' : 'transition',
      ...percussionFor(index),
      ...transitionFx(index),
      // The next record leaks in during the last bar. It is already key- and
      // register-matched, so the handoff reads as a mash-up rather than a cut.
      // At an act boundary, finish the current hook cleanly. The next melody
      // waits until after the bass-and-chord reset instead of leaking through.
      leadHarm: cleanClose ? silence : secondBar(next.primary),
      harmType: 'triangle',
      harmGain: 0.026,
      harmDur: 1.1,
      snare: HOUSE_FILL,
    },
    ...(index === 3 ? resetSections(1) : index === 8 ? resetSections(2) : []),
  ];
});

// How the mash-up was BUILT. Kept because it is the recipe — which hook came from
// where, in what key, over which house rhythm — and because re-deriving it is the
// only way to pick up new cabinet melodies.
//
// It is no longer what plays. The song was frozen into src/data/songs/megamix.js
// (see tools/migrate-songs.js), so megamix has a file of its own like every other
// song and no longer changes underneath you when a cabinet's melody is edited.
export const MEGAMIX_COMPUTED = {
  bpm: 120,
  // Match the established jukebox loudness with one final bank-level trim.
  musicTrim: 2.24,
  ...sharedMusic,
  lead: silence,
  leadHarm: silence,
  twinkle: silence,
  kick: HOUSE_KICK,
  hats: HOUSE_HATS,
  ohats: HOUSE_OHATS,
  clap: silence,
  snare: HOUSE_BACKBEAT,
  kickGain: 0.8,
  kickTail: 0.13,
  kickKnock: 0.56,
  drumGain: 0.53,
  clapGain: 0.26,
  sweepGain: 0.035,
  echoLevel: 0.18,
  sections: [...introSections, ...mashSections],
  order: [...introSections, ...mashSections].map((_, index) => index),
};

// What plays: the frozen song, one file like all the others.
export const MEGAMIX_THEME = SONGS.megamix.bank;
