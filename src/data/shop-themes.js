// Original procedural retail-lounge themes and their audition variants. The
// approved counter bank below is imported by the live counter screens and
// jukebox; no rendered audio asset is required or shipped.
import { seq, chordSeq } from '../engine/audio.js';

const beats = (pattern) => seq(pattern).map((v) => !!v);
const KICK_LIGHT = beats('C1 . . . . . . . C1 . . . . . . .');
const KICK_WALK = beats('C1 . . . . . C1 . C1 . . . . . C1 .');
const HATS_EIGHTHS = beats('. . C1 . . . C1 .');
const HATS_OFFBEAT = beats('. . C1 . . . C1 . . . C1 . . . C1 .');
const BRUSH_BACKBEAT = beats('. . . . C1 . . . . . . . C1 . . .');
const RIM_POLITE = beats('. . . C1 . . . . . . C1 . . . . .');

function counterPair({ id, name, bpm, bass, lead, reply, chords, liftBass, liftLead, liftReply, liftChords }) {
  const shared = {
    bpm,
    bass: seq(bass),
    lead: seq(lead),
    chords: chordSeq(chords),
    sections: [
      {},
      { bass: seq(liftBass), lead: seq(liftLead), leadHarm: seq(liftReply), chords: chordSeq(liftChords) },
    ],
    order: [0, 0, 1, 1],
  };
  return {
    id,
    name,
    dolores: {
      ...shared,
      leadType: 'triangle', leadGain: 0.052, leadDur: 0.82, leadAttack: 0.006,
      harmType: 'sine', harmGain: 0.018, harmDur: 0.72,
      bassType: 'triangle', bassGain: 0.075, bassDur: 1.25,
      chordType: 'triangle', chordGain: 0.027, chordDur: 0.82, chordAttack: 0.008,
      kick: KICK_LIGHT, kickGain: 0.34, kickTail: 0.12, kickKnock: 0.38,
      rim: RIM_POLITE, rimGain: 0.085, rimEcho: 0.04,
      hats: beats('. . . . . . C1 .'),
      echoLevel: 0.12,
    },
    gary: {
      ...shared,
      leadType: 'triangle', leadGain: 0.058, leadDur: 1.55, leadAttack: 0.012,
      leadHarm: seq(reply), harmType: 'sine', harmGain: 0.026, harmDur: 1.35,
      bassType: 'sine', bassGain: 0.105, bassDur: 1.85,
      bassRepeat: 3, bassRepeatGain: 0.22, bassRepeatDur: 0.55,
      chordType: 'triangle', chordGain: 0.038, chordDur: 1.75, chordAttack: 0.02,
      kick: KICK_WALK, kickGain: 0.45, kickTail: 0.15, kickKnock: 0.5,
      hats: HATS_EIGHTHS, snare: BRUSH_BACKBEAT,
      twinkle: seq('. . . . . . . . G5 . . . . . . . . . . . . . . . C6 . . . . . . .'),
      twinkleGain: 0.011, twinkleDur: 2.4,
      echoLevel: 0.2,
    },
  };
}

const checkout = counterPair({
  id: 'checkout-promenade',
  name: 'CHECKOUT PROMENADE',
  bpm: 108,
  bass: 'C2 . G2 . A2 . E2 . D2 . A2 . G2 . D2 . C2 . G2 . A2 . E2 . F2 . G2 . G2 . B2 .',
  lead: 'E4 . G4 . A4 G4 . E4 . D4 . F4 A4 . G4 . . . E4 G4 . C5 . B4 G4 . F4 . D4 F4 . G4 . . .',
  reply: '. . . . C4 . E4 . . . . . D4 . F4 . . . . . E4 . G4 . . . . . D4 . B3 .',
  chords: 'C3maj7 . . . . . . . A2min7 . . . . . . . D3min7 . . . . . . . G2maj . . . G29 . . .',
  liftBass: 'F2 . C3 . E2 . B2 . A2 . E3 . D2 . A2 . F2 . C3 . E2 . B2 . D2 . G2 . G2 . B2 .',
  liftLead: 'A4 . C5 . E5 . C5 A4 . G4 . B4 . D5 B4 . A4 . . . C5 B4 . A4 . E5 . D5 B4 . A4 . G4 . E4 .',
  liftReply: '. . . . F4 . A4 . . . . . G4 . B4 . . . . . A4 . C5 . . . . . G4 . D4 .',
  liftChords: 'F3maj7 . . . . . . . E3min7 . . . . . . . A2min7 . . . . . . . D3min7 . . . G29 . . .',
});

const receipt = counterPair({
  id: 'receipt-printer-rhumba',
  name: 'RECEIPT PRINTER RHUMBA',
  bpm: 116,
  bass: 'D#2 . A#2 . C3 . G2 . F2 . C3 . A#2 . F2 . D#2 . A#2 . C3 . G2 . G#2 . A#2 . A#2 . D3 .',
  lead: 'G4 . A#4 G4 . D#5 . C5 A#4 . G4 . F4 G4 . A#4 . . D#5 . D5 A#4 . G4 . F4 G4 A#4 . G4 . D#4 .',
  reply: '. A#3 . . . G4 . . . . D#4 . . F4 . . . . A#4 . . . G4 . . . D#4 . . F4 . .',
  chords: 'D#3maj7 . . . . . . . C3min7 . . . . . . . F3min7 . . . . . . . A#2maj . . . A#29 . . .',
  liftBass: 'G#2 . D#3 . G2 . D3 . C3 . G3 . F2 . C3 . G#2 . D#3 . G2 . D3 . F2 . A#2 . A#2 . D3 .',
  liftLead: 'C5 . D#5 . G5 D#5 . C5 . A#4 . D5 . F5 D5 . C5 . . . D#5 D5 . C5 . G5 . F5 D#5 . C5 . A#4 G4 .',
  liftReply: '. D#4 . . . C5 . . . . G4 . . A#4 . . . . D#5 . . . C5 . . . G4 . . A#4 . .',
  liftChords: 'G#3maj7 . . . . . . . G3min7 . . . . . . . C3min7 . . . . . . . F3min7 . . . A#29 . . .',
});
// The Gary version gets the concept's busier off-beat counter rhythm.
receipt.gary.hats = HATS_OFFBEAT;
receipt.gary.rim = RIM_POLITE;
receipt.gary.rimGain = 0.1;

const layaway = counterPair({
  id: 'after-hours-layaway',
  name: 'AFTER-HOURS LAYAWAY',
  bpm: 96,
  bass: 'D2 . . A2 . . B2 . F#2 . . G2 . . D2 . A2 . . D2 . . A2 . . B2 . F#2 . . G2 . A2 . . .',
  lead: 'F#4 . . A4 . D5 . . C#5 . A4 . . E4 F#4 . . . A4 . . B4 . F#4 . . E4 . D4 . . .',
  reply: '. . A3 . . F#4 . . . . E4 . . C#4 . . . . F#4 . . D4 . . . . C#4 . . A3 . .',
  chords: 'D3maj7 . . . . . . . B2min7 . . . . . . . G2maj7 . . . . . . . A2maj . . . A29 . . .',
  liftBass: 'G2 . . D3 . . F#2 . C#3 . . B2 . . F#2 . E2 . . G2 . . D3 . . F#2 . C#3 . . E2 . A2 . . .',
  liftLead: 'B4 . . D5 . F#5 . . E5 . D5 . . A4 B4 . . . D5 . . E5 . B4 . . A4 . F#4 . . .',
  liftReply: '. . D4 . . B4 . . . . A4 . . F#4 . . . . B4 . . G4 . . . . F#4 . . D4 . .',
  liftChords: 'G3maj7 . . . . . . . F#3min7 . . . . . . . B2min7 . . . . . . . E3min7 . . . A29 . . .',
});
layaway.dolores.hats = beats('. . . . . . . . . . C1 . . . . .');
layaway.gary.ohats = beats('. . . . . . C1 .');

export const SHOP_THEME_CANDIDATES = [checkout, receipt, layaway];

// Second audition set: the retail-jazz reference is pushed harder through
// bright syncopated keyboard phrases, compact ii/V-like loops, a walking bass
// answer on nearly every beat and a light brushed kit. The melodies and exact
// harmonic movement remain original rather than tracing an existing tune.
const basket = counterPair({
  id: 'basket-bounce',
  name: 'BASKET BOUNCE',
  bpm: 114,
  bass: 'F2 . C3 . D2 A2 . D2 . G2 . D3 . C2 G2 . C2 . F2 . C3 . D2 A2 . D2 . G2 . C3 . C2 E2 . C2 .',
  lead: 'A4 . C5 D5 . C5 A4 . G4 . A4 C5 . A4 . F4 . G4 A4 . C5 . A4 G4 . E4 . G4 A4 . G4 . C5 .',
  reply: '. . . . F4 . A4 . . . E4 . . G4 . . . . A4 . . F4 . . . . E4 . G4 . . .',
  chords: 'F3maj7 . . . . . . . D3min7 . . . . . . . G3min7 . . . . . . . C3maj . . . C39 . . .',
  liftBass: 'A2 . E3 . D2 A2 . D2 . G2 . D3 . C2 G2 . C2 . A2 . E3 . D2 A2 . D2 . G2 . C3 . C2 E2 . C2 .',
  liftLead: 'C5 . E5 F5 . E5 C5 . A4 . C5 E5 . C5 . A4 . A#4 C5 . E5 . C5 A4 . G4 . A4 C5 . A4 . E5 .',
  liftReply: '. . . . A4 . C5 . . . G4 . . A#4 . . . . C5 . . A4 . . . . G4 . A#4 . . .',
  liftChords: 'A3min7 . . . . . . . D3min7 . . . . . . . G3min7 . . . . . . . C3maj . . . C39 . . .',
});
basket.gary.hats = HATS_OFFBEAT;
basket.gary.rim = RIM_POLITE;
basket.gary.rimGain = 0.075;

const coupon = counterPair({
  id: 'coupon-carousel',
  name: 'COUPON CAROUSEL',
  bpm: 110,
  bass: 'A2 . E3 . F#2 C#3 . F#2 . B2 . F#3 . E2 B2 . E2 . A2 . E3 . F#2 C#3 . F#2 . B2 . E3 . E2 G#2 . E2 .',
  lead: 'C#5 . E5 F#5 . E5 C#5 . B4 . C#5 E5 . C#5 . A4 . B4 C#5 . E5 . C#5 B4 . G#4 . B4 C#5 . B4 . E5 .',
  reply: '. . . . A4 . C#5 . . . G#4 . . B4 . . . . C#5 . . A4 . . . . G#4 . B4 . . .',
  chords: 'A3maj7 . . . . . . . F#3min7 . . . . . . . B3min7 . . . . . . . E3maj . . . E39 . . .',
  liftBass: 'D2 . A2 . C#3 G#2 . C#3 . F#2 . C#3 . B2 F#2 . B2 . D2 . A2 . C#3 G#2 . C#3 . F#2 . B2 . E2 G#2 . E2 .',
  liftLead: 'F#4 . A4 C#5 . A4 F#4 . E4 . F#4 A4 . B4 . D5 . C#5 B4 . A4 . F#4 E4 . G#4 . B4 C#5 . B4 . E5 .',
  liftReply: '. . . . D4 . F#4 . . . C#4 . . E4 . . . . F#4 . . D4 . . . . C#4 . E4 . . .',
  liftChords: 'D3maj7 . . . . . . . C#3min7 . . . . . . . F#3min7 . . . . . . . B3min7 . . . E39 . . .',
});
coupon.dolores.rim = RIM_POLITE;
coupon.dolores.rimGain = 0.06;
coupon.gary.ohats = beats('. . . . . . C1 .');

const serviceBell = counterPair({
  id: 'service-bell-stroll',
  name: 'SERVICE BELL STROLL',
  bpm: 118,
  bass: 'G2 . D3 . E2 B2 . E2 . A2 . E3 . D2 A2 . D2 . G2 . D3 . E2 B2 . E2 . A2 . D3 . D2 F#2 . D2 .',
  lead: 'B4 D5 . E5 . D5 B4 . A4 B4 . D5 B4 . G4 . A4 B4 . D5 . B4 A4 . F#4 A4 . B4 A4 . D5 . . .',
  reply: '. . G4 . . . B4 . . F#4 . . A4 . . . . . B4 . . . G4 . . . F#4 . A4 . . .',
  chords: 'G3maj7 . . . . . . . E3min7 . . . . . . . A3min7 . . . . . . . D3maj . . . D39 . . .',
  liftBass: 'C3 . G3 . B2 F#3 . B2 . E2 . B2 . A2 E3 . A2 . C3 . G3 . B2 F#3 . B2 . E2 . A2 . D2 F#2 . D2 .',
  liftLead: 'E5 G5 . B5 . G5 E5 . D5 E5 . G5 E5 . C5 . D5 E5 . G5 . E5 D5 . B4 D5 . E5 D5 . A5 . . .',
  liftReply: '. . C5 . . . E5 . . B4 . . D5 . . . . . E5 . . . C5 . . . B4 . D5 . . .',
  liftChords: 'C4maj7 . . . . . . . B3min7 . . . . . . . E3min7 . . . . . . . A3min7 . . . D39 . . .',
});
serviceBell.dolores.hats = HATS_EIGHTHS;
serviceBell.gary.hats = beats('. C1 . C1');
serviceBell.gary.rim = beats('. . . C1 . . C1 .');
serviceBell.gary.rimGain = 0.07;

export const SHOP_THEME_RETAIL_JAZZ_CANDIDATES = [basket, coupon, serviceBell];
for (const candidate of SHOP_THEME_RETAIL_JAZZ_CANDIDATES) {
  candidate.dolores = withOrgan(candidate.dolores);
  candidate.gary = withOrgan(candidate.gary);
}

function withOrgan(bank) {
  return {
    ...bank,
    organChords: bank.chords,
    // Strong enough to read as a featured drawbar accompaniment, while the
    // original electric-keyboard stabs and melody remain plainly audible.
    organGain: 0.015,
    organDur: 7.4,
    organAttack: 0.045,
    organEcho: true,
    sections: bank.sections.map((section) => ({
      ...section,
      organChords: section.chords || bank.chords,
    })),
  };
}

function syncopatedOrganChords(chords) {
  let harmony = null;
  return chords.map((chord, step) => {
    if (chord) harmony = chord;
    // Three uneven off-beat jabs per eight-step harmony cell: the first lands
    // on the &, the second anticipates the next beat, the third is a quick
    // answer before the chord changes. No downbeat pad remains underneath.
    return [2, 5, 7].includes(step % 8) ? harmony : null;
  });
}

function withSyncopatedOrgan(bank) {
  const organ = withOrgan(bank);
  return {
    ...organ,
    organChords: syncopatedOrganChords(organ.organChords),
    organGain: 0.017,
    organDur: 1.18,
    organAttack: 0.004,
    organEcho: false,
    organBright: true,
    organPercussion: true,
    organPercussionDur: 0.52,
    organPercussionGain: 0.78,
    sections: organ.sections.map((section) => ({
      ...section,
      organChords: syncopatedOrganChords(section.organChords),
    })),
  };
}

function withBrightOrganAndBells(bank, character) {
  const bright = withSyncopatedOrgan(bank);
  const dolores = character === 'dolores';
  const noGliss = seq('.');
  const finalGliss = seq('. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . G5 .');
  const [baseSection, liftSection] = bright.sections;
  return {
    ...bright,
    organGain: dolores ? 0.0175 : 0.0205,
    organDur: dolores ? 0.86 : 1.02,
    organPercussionGain: 0.9,
    organGliss: noGliss,
    organGlissGain: dolores ? 0.0105 : 0.013,
    organGlissSpan: 2.7,
    organGlissAttack: 0.002,
    // Replace the rejected bouncing/ghost-note bass with one compact analog-
    // style 1980s voice. The engine layers square body, sine sub and a tiny
    // octave attack; bassRepeat=0 explicitly removes the old boing response.
    bass80s: true,
    bassGain: dolores ? 0.112 : 0.128,
    bassDur: dolores ? 0.94 : 1.08,
    bassAttack: 0.003,
    bassRepeat: 0,
    twinkle: seq('. . . . G5 . . . . . . . . . . . E6 . . . . . . . . . . D6 . . . .'),
    twinkleGain: dolores ? 0.012 : 0.015,
    twinkleDur: 0.62,
    twinkleAttack: 0.003,
    // Four explicit blocks preserve the original base/base/lift/lift form. A
    // gliss announces the halfway move into the lift, then another turns the
    // end of the full eight-bar loop back toward its opening harmony.
    sections: [
      { ...baseSection, organGliss: noGliss },
      { ...baseSection, organGliss: finalGliss },
      { ...liftSection, organGliss: noGliss },
      { ...liftSection, organGliss: finalGliss },
    ],
    order: [0, 1, 2, 3],
  };
}

function syncopatedOrganChordsV2(chords, alternate = false) {
  let harmony = null;
  return chords.map((chord, step) => {
    if (chord) harmony = chord;
    // Alternate two off-kilter three-stab figures from bar to bar. The short
    // duration below leaves clear air between each jab, even at Layaway's
    // relaxed tempo.
    const evenCell = alternate ? [1, 4, 7] : [2, 4, 7];
    const oddCell = alternate ? [2, 5, 7] : [1, 5, 6];
    return ((Math.floor(step / 8) % 2 ? oddCell : evenCell).includes(step % 8)) ? harmony : null;
  });
}

function withLayawayV2(bank, character) {
  const dolores = character === 'dolores';
  const [liftSection] = bank.sections;
  const baseFxA = seq('. . . . . E6 . . . . . . C#6 . . . . . . . . . . . . . . . . . . .');
  const baseFxB = seq('. . . . . . . . . . A5 . . . . . . . . . . . D6 . . . . . . . . .');
  const liftFxA = seq('. . . G6 . . . . . . . . . . . . . . . . E6 . . . . . . . . . . .');
  const liftFxB = seq('. . . . . . . . . B5 . . . . . . . . . . . . . . . . F#6 . . . . .');
  const section = (source, fx, alternate) => ({
    ...source,
    organChords: syncopatedOrganChordsV2(source.chords || bank.chords, alternate),
    electroFx: fx,
  });
  return {
    ...bank,
    organBright: true,
    organPercussion: true,
    organEcho: false,
    organGain: dolores ? 0.0185 : 0.0215,
    organDur: dolores ? 0.58 : 0.68,
    organAttack: 0.002,
    organPercussionDur: 0.34,
    organPercussionGain: dolores ? 0.82 : 0.94,
    // Pull the retro bass bed behind the brighter v2 organ. Gary's original
    // arrangement is fuller, so his reduction is fractionally stronger.
    bassGain: dolores ? 0.064 : 0.087,
    // Keep the sparse machine gestures clearly audible over the organ stabs;
    // Gary remains fractionally louder and warmer than Dolores.
    electroFxGain: dolores ? 0.016 : 0.0195,
    electroFxDur: dolores ? 0.78 : 0.92,
    sections: [
      section({}, baseFxA, false),
      section({}, baseFxB, true),
      section(liftSection, liftFxA, false),
      section(liftSection, liftFxB, true),
    ],
    order: [0, 1, 2, 3],
  };
}

export const SHOP_THEME_ORGAN_VARIANTS = [
  {
    id: 'checkout-promenade-gary-organ',
    name: 'CHECKOUT PROMENADE - GARY + ORGAN',
    bank: withSyncopatedOrgan(checkout.gary),
  },
  {
    id: 'after-hours-layaway-dolores-organ',
    name: 'AFTER-HOURS LAYAWAY - DOLORES + ORGAN',
    bank: withOrgan(layaway.dolores),
  },
  {
    id: 'after-hours-layaway-gary-organ',
    name: 'AFTER-HOURS LAYAWAY - GARY + ORGAN',
    bank: withOrgan(layaway.gary),
  },
];

export const SHOP_THEME_BRIGHT_ORGAN_VARIANTS = [
  {
    id: 'checkout-promenade-dolores-bright-organ',
    name: 'CHECKOUT PROMENADE - DOLORES + BRIGHT ORGAN',
    bank: withBrightOrganAndBells(checkout.dolores, 'dolores'),
  },
  {
    id: 'checkout-promenade-gary-bright-organ',
    name: 'CHECKOUT PROMENADE - GARY + BRIGHT ORGAN',
    bank: withBrightOrganAndBells(checkout.gary, 'gary'),
  },
];

function withGaryDanceMix(bank) {
  const silence = seq('.');
  const chordSilence = chordSeq('.');
  const handClaps = beats('. . . . C1 . . . . . . . C1 . . .');
  const lightHiHats = beats('. . . . . . C1 . . . . . . . C1 .');
  const transitionSwoop = seq('. . . . . . . . . . . . . . . . . . . . . . . . . . . . C6 . . .');
  const syncopateBass = (line) => {
    const result = Array(32).fill(null);
    let noteIndex = 0;
    line.forEach((note, step) => {
      if (note != null) {
        // Alternate firm on-grid notes with sixteenth-note pushes. This keeps
        // the written pitches intact while breaking up the old straight pulse.
        result[Math.min(31, step + (noteIndex % 2))] = note;
        noteIndex++;
      }
    });
    return result;
  };
  const baseBass = syncopateBass(bank.bass);
  const muteMelody = {
    lead: silence,
    leadHarm: silence,
    twinkle: silence,
    organGliss: silence,
    organSwoop: silence,
  };
  const drumsOnly = {
    ...muteMelody,
    bass: silence,
    chords: chordSilence,
    organChords: chordSilence,
    clap: silence,
  };
  const drumsOrgan = {
    ...drumsOnly,
    organChords: bank.organChords,
  };
  const drumsOrganBass = {
    ...drumsOrgan,
    bass: baseBass,
  };
  const drumsOrganBassSynth = {
    ...drumsOrganBass,
    chords: bank.chords,
    clap: handClaps,
    organSwoop: transitionSwoop,
  };
  const full = bank.sections.map((section) => ({
    ...section,
    bass: syncopateBass(section.bass || bank.bass),
    clap: handClaps,
  }));
  const breakdownBase = {
    ...drumsOrganBass,
    kick: silence, hats: lightHiHats, ohats: silence, snare: silence,
    clap: handClaps, rim: silence, rimEcho: 0,
  };
  const breakdownLift = {
    ...breakdownBase,
    bass: syncopateBass(bank.sections[2].bass || bank.bass),
    organChords: bank.sections[2].organChords || bank.organChords,
    organSwoop: transitionSwoop,
  };
  return {
    ...bank,
    // Match the soundtrack's shared playback loudness without changing the
    // approved instrument balance inside the counter arrangement.
    musicTrim: 2.22,
    // Replace the earlier 1980s square/triangle stack with a resonant filtered
    // saw: more audible harmonic body, with the harsh top closing quickly.
    bass80s: false,
    bassFilteredSaw: true,
    bass: baseBass,
    bassEcho: false,
    bassFilterOpen: 1100,
    bassFilterClose: 310,
    bassFilterQ: 1.1,
    bassFilteredSawSubGain: 0.22,
    bassGain: 0.1115775,
    leadGain: 0.0693,
    leadBright: true,
    leadBrightGain: 0.16,
    drumGain: 0.68,
    clapGain: 0.323,
    // Each entry is a two-bar block: organ + softened drums, bass, then synth
    // + claps. The former drums-only opening block has been removed.
    // Two complete forms follow, then an eight-bar percussion/rebuild
    // breakdown and two final complete forms before the 46-bar mix loops.
    sections: [
      drumsOrgan, drumsOrganBass, drumsOrganBassSynth,
      ...full, breakdownBase, breakdownLift,
    ],
    order: [
      0, 1, 2,
      3, 4, 5, 6,
      3, 4, 5, 6,
      7, 7, 8, 8,
      3, 4, 5, 6,
      3, 4, 5, 6,
    ],
  };
}

export const SHOP_THEME_DANCE_MIX_VARIANTS = [
  {
    id: 'checkout-promenade-gary-bright-organ-dance-mix',
    name: 'CHECKOUT PROMENADE - GARY + BRIGHT ORGAN - SHOPPING',
    bank: withGaryDanceMix(SHOP_THEME_BRIGHT_ORGAN_VARIANTS[1].bank),
  },
];

// Peter-approved shared theme for Dolores's repair counter and Gary's pawn
// counter. Keep this as the exact bank used by the renderer audition so the
// game, jukebox and listening render cannot drift apart.
export const COUNTER_DANCE_MIX_THEME = SHOP_THEME_DANCE_MIX_VARIANTS[0].bank;

export const SHOP_THEME_LAYAWAY_V2_VARIANTS = [
  {
    id: 'after-hours-layaway-dolores-v2',
    name: 'AFTER-HOURS LAYAWAY - DOLORES V2',
    bank: withLayawayV2(layaway.dolores, 'dolores'),
  },
  {
    id: 'after-hours-layaway-gary-v2',
    name: 'AFTER-HOURS LAYAWAY - GARY V2',
    bank: withLayawayV2(layaway.gary, 'gary'),
  },
];

export const SHOP_THEME_BY_ID = Object.fromEntries([
  ...SHOP_THEME_CANDIDATES.flatMap((candidate) => [
  [`${candidate.id}-dolores`, candidate.dolores],
  [`${candidate.id}-gary`, candidate.gary],
  ]),
  ...SHOP_THEME_RETAIL_JAZZ_CANDIDATES.flatMap((candidate) => [
    [`${candidate.id}-dolores`, candidate.dolores],
    [`${candidate.id}-gary`, candidate.gary],
  ]),
  ...SHOP_THEME_ORGAN_VARIANTS.map((variant) => [variant.id, variant.bank]),
  ...SHOP_THEME_BRIGHT_ORGAN_VARIANTS.map((variant) => [variant.id, variant.bank]),
  ...SHOP_THEME_DANCE_MIX_VARIANTS.map((variant) => [variant.id, variant.bank]),
  ...SHOP_THEME_LAYAWAY_V2_VARIANTS.map((variant) => [variant.id, variant.bank]),
]);
