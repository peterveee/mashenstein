// THE AUDIO CANARY — a test song for the audio engine's sleep, trim and warm-up paths
// (Peter, 22 Oct 2026: "could we not create a simple test song that deliberately does these
// things so we can easily listen/test for any future regressions?"). In the jukebox on a dev
// build as AUDIO CANARY; played by tests/audio-canary.js on every run of the browser suites.
//
// A kick on every beat throughout, as the clock: anything missing against it is a gap you can
// hear. Over it, in every section of both songs, THE BAND (23 Oct 2026; Peter: "can we add a
// simple bass and lead"): a one-bar bass and lead in plain CRLS-1 voices (Round Bass, Simple
// Square), so there is a tune to hear go late, crackle or drop out. On lanes of their own —
// bass2 and lead2 here, layers of bass and lead, so the tested lanes still fall silent and
// sleep in sections 3–4; plain bass and lead in the load song, which DEEP relief keeps.
// Twenty-four seconds, six sections of two bars:
//
//   1  ALL IN      every tested lane plays on its first step — the TNGR-2 worklet lane
//                  (lead, through a delay insert), a legato MRDR-3 theremin (bass, through
//                  vibrato and a compressor, the shape that lost Crypt's opening), a CRLS-1
//                  pool with a four-note chord (chords, through a chorus), and a hand-written
//                  engine voice (twinkle)
//   2  SINGLES     the chords lane alone, one note at a time: its pool no longer needs five
//   3–4 QUIET      the kick alone for eight seconds: idle strips sleep (2 s), quiet insert
//                  chains sleep, the pool trims back to what the singles needed (8 s)
//   5  ALL BACK    section 1 again — every lane's first note out of sleep, the chord
//                  rebuilding its pool
//   6  SPOT FX     section 1 again under a lowpass Spot FX section on the whole mix
// THE LOAD STAIRCASE is a second song in the same file, `load` below (AUDIO CANARY: LOAD in the
// jukebox), so the functional checks above never start under its weight — it builds every lane
// and Spot FX chain it needs when it starts:
//
//   1  QUIET       two bars of kick
//   2–9 STAIRCASE  load, on purpose, until something gives (Peter: "make it as heavy as you
//                  need it to be. It will at least give us a limit"). Sustained four-note chords
//                  on more and more lanes, the families in turn — MRDR-3's Synth Choir Aah,
//                  JMJR-4's choir at HIGH with a tract per singer (its heaviest), TNGR-2's Warm
//                  Strings — then Spot FX on every one of those lanes, then the whole mix:
//                     2  bars  3–4    2 lanes
//                     3  bars  5–6    4 lanes
//                     4  bars  7–8    8 lanes
//                     5  bars  9–10   8 lanes, each through a Spot FX reverb + chorus
//                     6  bars 11–12  12 lanes, the same
//                     7  bars 13–14  16 lanes, the same
//                     8  bars 15–16  24 lanes, reverb + chorus + phaser, and a stutter and a
//                                    highpass Spot FX section over the whole mix
//                     9  bars 17–18  32 lanes, all of that
//                  The glitch log names the bar a device tips at: that bar is its limit in song
//                  terms, the guard's relief is heard doing its work, and the Mac harness has a
//                  fixed load curve to hold the engine to.
//   10 QUIET       the kick alone: what recovery sounds like
//
// Then it loops, which is a song restart for the lanes; and played after another song in the
// jukebox it is the song-change case too (Neon then Crypt, 22 Oct). Listen for: every lane on
// the first beat of sections 1, 5 and 6, a full four-note chord each time, and the lowpass
// opening and closing cleanly on section 6.

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
import { VOICES } from './voices.js';

// The staircase's lanes: organChords and its independent copies.
const CHOIRS = ['organChords', ...Array.from({ length: 31 }, (_, i) => `organChords${i + 2}`)];
const rest = () => new Array(16).fill(null);
const beats = () => new Array(16).fill(false).map((_, i) => i % 2 === 0);

function allIn() {
  const lead = rest(), leadLen = rest();
  [[0, 76], [3, 79], [6, 83]].forEach(([s, m]) => { lead[s] = hz(m); leadLen[s] = 2; });
  const bass = rest(), bassLen = rest();
  bass[0] = hz(57); bassLen[0] = 10.15;      // overlaps the next: a legato takeover, as Crypt's
  bass[10] = hz(59); bassLen[10] = 4;
  const chords = rest(), chordsLen = rest();
  chords[0] = [60, 64, 67, 71].map(hz); chordsLen[0] = 6;
  chords[8] = [62, 65, 69, 72].map(hz); chordsLen[8] = 6;
  const twinkle = rest();
  twinkle[0] = hz(88); twinkle[4] = hz(91);
  return { kick: beats(), lead, leadLen, bass, bassLen, chords, chordsLen, twinkle };
}

function singles() {
  const chords = rest(), chordsLen = rest();
  [0, 4, 8, 12].forEach((s, i) => { chords[s] = hz([60, 64, 67, 64][i]); chordsLen[s] = 2; });
  return { kick: beats(), lead: rest(), bass: rest(), chords, chordsLen, twinkle: rest() };
}

function quiet() {
  return { kick: beats(), lead: rest(), bass: rest(), chords: rest(), twinkle: rest() };
}

/**
 * THE BAND: a bar of bass and lead on the given lanes, over the Cmaj7 / Dm7 the canary's
 * chords play (C then D in the bass, a four-note line above). Every section of both songs.
 */
function band(bassKey, leadKey) {
  const bass = rest(), bassLen = rest(), lead = rest(), leadLen = rest();
  [[0, 36], [4, 36], [8, 38], [12, 38]].forEach(([s, m]) => { bass[s] = hz(m); bassLen[s] = 3; });
  [[0, 72], [4, 76], [8, 74], [12, 77]].forEach(([s, m]) => { lead[s] = hz(m); leadLen[s] = 3; });
  return { [bassKey]: bass, [`${bassKey}Len`]: bassLen, [leadKey]: lead, [`${leadKey}Len`]: leadLen };
}
const canaryBand = () => band('bass2', 'lead2');
const loadBand = () => band('bass', 'lead');
const BAND_VOICES = (bassKey, leadKey) => ({ [`${bassKey}Voice`]: 'roundBass', [`${leadKey}Voice`]: 'simpleSquare' });
const BAND_LANES = (bassKey, leadKey) => ({ [bassKey]: { gain: -8 }, [leadKey]: { gain: -6 } });

/** A staircase step: `n` choir lanes holding four-note chords, each a little apart in pitch. */
function choirs(n) {
  const out = quiet();
  CHOIRS.forEach((key, i) => {
    const notes = rest(), lens = rest();
    if (i < n) {
      const root = 48 + (i % 4) * 3;
      notes[0] = [root, root + 4, root + 7, root + 11].map(hz); lens[0] = 8;
      notes[8] = [root + 2, root + 5, root + 9, root + 12].map(hz); lens[8] = 8;
    }
    out[key] = notes; out[`${key}Len`] = lens;
  });
  return out;
}

export const id = 'audio-canary';
export const title = 'AUDIO CANARY';

export const bank = {
  bpm: 120,
  ...allIn(),
  ...canaryBand(),
  sections: [allIn(), singles(), quiet(), quiet(), allIn(), allIn()].map((s) => ({ ...s, ...canaryBand() })),
  order: [0, 1, 2, 3, 4, 5],
};

// Crypt's theremin, the voice that lost its first note after Neon (22 Oct 2026).
const THEREMIN = {
  label: 'Canary Theremin', category: 'Lead', synth: 'MRDR-3', dur: 2.8, kind: 'tone', mode: 'legato',
  layer: {
    osc1: { type: 'triangle', ratio: 1, gain: 0.9, attack: 0.09, decay: 0.3, sustain: 0.85, release: 0.3, unison: 1 },
    osc2: { type: 'triangle', ratio: 2, gain: 0.06, attack: 0.09, decay: 0.4, sustain: 0.65, release: 0.28 },
  },
  vibrato: { depth: 0.56, rate: 5.3, delay: 0.445 },
  portamento: 0.11, global: {}, drive: 0.27, drivePlace: 'pre', level: 0.13, peak: 0.5,
};

export const mix = {
  voice: {
    kickVoice: 'fatKick',
    leadVoice: 'tngrOrangeCurrent',
    chordsVoice: 'simpleStrings',
    ...BAND_VOICES('bass2', 'lead2'),
  },
  layers: [{ key: 'bass2', from: 'bass', independent: true }, { key: 'lead2', from: 'lead', independent: true }],
  voiceParams: { bassVoice: THEREMIN },
  lanes: {
    kick: { gain: -4 },
    lead: { gain: -8, effects: [{ id: 'delay' }] },
    bass: { gain: -6, effects: [{ id: 'vibrato', params: { depth: 0.12, wet: 0.87 } }, { id: 'compressor' }] },
    chords: { gain: -10, effects: [{ id: 'chorus' }] },
    twinkle: { gain: -6 },
    ...BAND_LANES('bass2', 'lead2'),
  },
};

// Section 6's lowpass over the whole mix (bars 11–12; two bars to a section).
export const arrangement = {
  automation: {
    __master: { fx: [{ from: [10, 0], to: [12, 0], chain: [{ id: 'filter', params: { type: 'lowpass', frequency: 700, Q: 0.7 } }] }] },
  },
};

// ---- THE LOAD STAIRCASE ---------------------------------------------------------------
const roomChorus = [{ id: 'reverb' }, { id: 'chorus' }];
const roomChorusPhaser = [{ id: 'reverb' }, { id: 'chorus' }, { id: 'phaser' }];
export const load = {
  id: 'audio-canary-load',
  title: 'AUDIO CANARY: LOAD',
  bank: {
    bpm: 120,
    ...quiet(),
    ...loadBand(),
    ...Object.fromEntries(CHOIRS.map((k) => [k, rest()])),
    sections: [quiet(), choirs(2), choirs(4), choirs(8), choirs(8), choirs(12), choirs(16), choirs(24), choirs(32), quiet()]
      .map((s) => ({ ...s, ...loadBand() })),
    order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  mix: {
    voice: {
      kickVoice: 'fatKick',
      ...BAND_VOICES('bass', 'lead'),
      // The families in turn, lane by lane: MRDR-3, JMJR-4 (below), TNGR-2.
      ...Object.fromEntries(CHOIRS.map((k, i) => [`${k}Voice`, ['bestChoirAah', 'jmjrChoirAah', 'tngrWarmStrings'][i % 3]])),
    },
    layers: CHOIRS.slice(1).map((key) => ({ key, from: 'organChords', independent: true })),
    // JMJR-4 at its heaviest: HIGH quality and a tract per singer, not one shared by the chord.
    voiceParams: Object.fromEntries(CHOIRS.filter((_, i) => i % 3 === 1).map((k) => [`${k}Voice`,
      { ...VOICES.jmjrChoirAah, jmjr4: { ...VOICES.jmjrChoirAah.jmjr4, quality: 'high', chordTract: 'separate' } }])),
    lanes: {
      kick: { gain: -4 },
      ...BAND_LANES('bass', 'lead'),
      ...Object.fromEntries(CHOIRS.map((k) => [k, { gain: -16 }])),
    },
  },
  // Spot FX on every staircase lane from bar 9, heavier from bar 15 with the whole mix too.
  arrangement: {
    automation: {
      __master: { fx: [{ from: [14, 0], to: [18, 0], chain: [{ id: 'stutter', params: { slice: 0.25, retrigger: 0, fade: -1 } }, { id: 'filter', params: { type: 'highpass', frequency: 300, Q: 0.7 } }] }] },
      ...Object.fromEntries(CHOIRS.map((k) => [k, { fx: [
        { from: [8, 0], to: [14, 0], chain: roomChorus },
        { from: [14, 0], to: [18, 0], chain: roomChorusPhaser },
      ] }])),
    },
  },
};
