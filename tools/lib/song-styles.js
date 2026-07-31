// The style packs a scratch song is generated from.
//
// Why this file exists: the New Song generator used to hold one vocabulary — four
// kicks, four hats, four A-minor progressions, four scale-wiggle motifs — and every
// song it made came out at 120 BPM in A minor, on the engine's default square lead,
// with an unbroken eighth-note melody over a chord every half-bar. That is one song
// with 768 spellings, and it always sounded like the same poppy electropop.
//
// A pack is the whole character of a generated song in one object: its tempo, its
// key and mode, its harmony, its kit, its melodic grammar, which LANES it uses at
// all, and — the part that was missing entirely — which VOICES those lanes play. A
// song with no drums and a music box on the melody is not the same song at another
// tempo, which is what the seed was choosing between before.
//
// Data only, and deliberately: this module is imported by the desk's browser bundle
// for the style picker as well as by the generator, so it may not touch node:fs.
// Everything it holds is a small musical vocabulary, and the generator in
// new-song.js is the only thing that turns it into notes.
import { n, noteName } from '../../src/engine/notes.js';

/**
 * The modes, as semitones above the root, with the name a person would use.
 *
 * A pack names one and writes its harmony and melody as DEGREES into it, so both
 * transpose together: the same pack in D reads D minor rather than a D-flavoured
 * version of A minor. Only the modes the packs actually use are here — an unused
 * mode is a row of numbers nothing can be heard through.
 */
export const MODES = {
  aeolian: { label: 'minor', steps: [0, 2, 3, 5, 7, 8, 10] },
  dorian: { label: 'dorian', steps: [0, 2, 3, 5, 7, 9, 10] },
  ionian: { label: 'major', steps: [0, 2, 4, 5, 7, 9, 11] },
  harmonicMinor: { label: 'harmonic minor', steps: [0, 2, 3, 5, 7, 8, 11] },
  // The flat second is the whole reason this one is here: a i–II stab in phrygian is
  // a sound none of the other modes can make, and it is what techno does with one chord.
  phrygian: { label: 'phrygian', steps: [0, 1, 3, 5, 7, 8, 10] },
};

/** `A2` -> `A`. A pitch class on its own, which is how a pack names its roots. */
export const pitchClass = (name) => String(name).replace(/\d+$/, '');

/** The same note `semis` away, by name — `shift('A4', 3)` is `C5`. */
export const shift = (name, semis) => noteName(n(name) * Math.pow(2, semis / 12));

/**
 * A pitch class placed in the octave that puts it at or above `floor`.
 *
 * This is what keeps a transposed song in the register it was written for. Every
 * lane names a floor rather than an octave — the bass floor is `E2`, so A becomes
 * `A2` and C becomes `C3` instead of a `C2` nothing can hear. It is also exactly
 * what the hand-picked tables it replaced were doing: the original bass roots put
 * A, E, F and G in octave 2 and C and D in octave 3, which is `E2` said as a rule.
 */
export function inRegister(pc, floor) {
  const oct = Number(/(\d)$/.exec(floor)[1]);
  // Within a hair of the floor counts as on it — these are equal-temperament floats.
  return n(`${pc}${oct}`) >= n(floor) - 1e-9 ? `${pc}${oct}` : `${pc}${oct + 1}`;
}

/** Semitones from `a` up to `b`. Rounded: both come out of equal temperament. */
const semisBetween = (a, b) => Math.round(12 * Math.log2(n(b) / n(a)));

/**
 * A pitch class placed in the octave NEAREST a centre, up to six semitones either way.
 *
 * A melody has a centre rather than a floor, and the difference is audible: put a
 * tune in F above a floor of A4 and it starts on F5, a fourth higher than the same
 * tune in A, which is a shrill reed lead in one key and a comfortable one in the
 * next. Nearest-octave keeps every key inside the same half-octave band — and
 * because two lanes measuring from centres an octave apart both round the same way,
 * a twinkle line written above a lead stays above it in all twelve keys.
 */
export function nearRegister(pc, centre) {
  const oct = Number(/(\d)$/.exec(centre)[1]);
  const low = `${pc}${oct}`;
  return semisBetween(centre, low) < -6 ? `${pc}${oct + 1}` : low;
}

/** The pitch class a mode degree lands on, from a root pitch class. */
export function degreePitch(root, mode, degree) {
  const steps = MODES[mode].steps;
  const semis = steps[degree % steps.length] + 12 * Math.floor(degree / steps.length);
  return pitchClass(shift(`${root}4`, semis));
}

/**
 * A melodic degree as a note name, counted UP from the lane's centre.
 *
 * A melody ladder is not register-wrapped like a chord root: degree 7 has to be an
 * octave above degree 0 or the line folds back on itself half way through a phrase.
 */
export function melodyNote(root, mode, centre, degree) {
  const steps = MODES[mode].steps;
  const semis = steps[degree % steps.length] + 12 * Math.floor(degree / steps.length);
  return shift(nearRegister(root, centre), semis);
}

// Shared rhythm shorthand. Spelled once here because a pack that writes its own
// sixteen eighth-notes out by hand is a pack you have to read to see it is ordinary.
const EIGHTHS = Array.from({ length: 16 }, (_, i) => i * 2);
const SIXTEENTHS = Array.from({ length: 32 }, (_, i) => i);
const QUARTERS = [0, 4, 8, 12, 16, 20, 24, 28];
const BACKBEAT = [4, 12, 20, 28];
const OFFBEATS = [2, 6, 10, 14, 18, 22, 26, 30];

/**
 * ---- What a pack holds -------------------------------------------------------
 *
 * `bpm`          the tempo it is written at. The New Song dialog's BPM field
 *                overrides it; left empty, this is what the song gets.
 * `mode`, `roots`  the key. The seed picks one root; the first is the pack's home
 *                key, and seed 0 takes it, which is what keeps the canonical
 *                examples in the tests fixed.
 * `registers`    the floor the bass and the chords sit on. See inRegister; a
 *                melody's own `register` is a centre instead — see nearRegister.
 * `progressions` `[degree, quality]` pairs. Quality is explicit rather than built
 *                from the mode because the useful chords are not all diatonic — a
 *                surf progression wants a major V in a minor key, and a diatonic
 *                triad builder would hand back a diminished chord that
 *                notes.js cannot even spell.
 * `chordHits`    offsets WITHIN one chord's block. A progression of four spreads
 *                over 32 steps as four blocks of eight, so `[0]` is a chord every
 *                half bar and `[2, 6]` is an offbeat skank.
 * `bassRhythms`  absolute steps. The bass follows whichever chord its step sits under.
 * `bassLift`     steps where `step % 8` equals this jump an octave — an octave
 *                bass figure, off by default.
 * `melodies`     one entry per pitched lane the pack plays, each with its own
 *                register, rhythms and contours. Rhythm × contour is the whole
 *                melodic grammar: the steps that are not in the rhythm are RESTS,
 *                which is what the old fixed eighth-note grid could never have.
 * `drums`        step lists per percussion lane.
 * `lanes`        which lanes the Beat and Full Band starters use. A pack may have
 *                no drums at all, or no chord lane; nothing downstream assumes a
 *                fixed set.
 * `bank`         bank keys merged into the song: the voice per lane, the trims, and
 *                anything else that is part of the sound rather than the notes.
 *                These live in the bank — the composed half of the song file —
 *                because the instrument a song is written for is part of the
 *                composition, and because the desk rewrites only the half below
 *                its marker. Choosing a voice on a strip still overrides it.
 *
 * ---- Why the packs carry a drumGain and a musicTrim -------------------------
 *
 * Two measured numbers, doing two different jobs, and both re-derived whenever the
 * voice library is re-levelled — see tools/measure-voices.js, and `voiceGain` in
 * src/data/voices.js for what a preset's level now means.
 *
 * `drumGain` sets the pack's KIT against its instruments. It reaches presets as well
 * as the hand-written voices, because `laneTrim` multiplies it into the derived level
 * — which is the only way a drum lane can be balanced at all, since a drum lane has no
 * gain key of its own. Every pack is aimed at the kit sitting 0.8 LU under the music,
 * which is what the electropop starter measured when it played the engine's own
 * voices, and so the balance every pack was originally written against. Techno is the
 * one exception and says so where it states its numbers.
 *
 * `musicTrim` sets where the whole song LANDS. It scales the song bus, so it moves a
 * pack's level without touching the balance `drumGain` just set — and the packs need
 * it: left alone, a pad-and-celeste song with no kit in it measured 9 LU quieter than
 * a house track, which is a style picker that shouts at you every third choice. Each
 * one is set so the pack lands on -22.0 LUFS, where four of the game's own cabinet
 * songs measure. Boom Bap is the one pack that stops short of it, at -22.3: its kick
 * reaches the ceiling first, and a pack does not go through -1 dBFS to make a target.
 *
 * There is no melodic bus to turn down instead of the song bus. A melodic lane's own
 * gain key is deliberately NOT set, because the engine reads `b[gainKey] ??
 * voiceGain(...)` and naming one REPLACES the derived level with a hand-picked
 * absolute — the preset normalisation would stop applying to that lane.
 *
 * Re-measurable, and re-measure them after any change to the library's levels: render
 * each pack's full-band starter, then its kit lanes and its pitched lanes separately,
 * with no mix at all — every fader at 0 dB, as a new scratch song is — and move
 * `drumGain` by the error in kit-minus-music and `musicTrim` by the error in the full
 * mix. Two rounds converge, because the two interact through the sum.
 *
 * One constraint on the voices themselves: a pack may only name TONE, NOISE or DRUM
 * presets, never an `eng*` one. An engine preset is a bundle of bank keys that
 * `withVoices` expands — and `withVoices` returns early when a song has no mix, which
 * every generated song does. Named here, an engine preset would silently do nothing.
 */
export const SONG_STYLES = [
  {
    id: 'electropop',
    label: 'Electropop',
    note: 'Four-on-the-floor, eighth-note melody, the engine\'s own square lead.',
    bpm: 120,
    mode: 'aeolian',
    roots: ['A', 'C', 'D', 'E', 'G'],
    registers: { bass: 'E2', chord: 'C3' },
    progressions: [
      [[0, 'min'], [5, 'maj'], [2, 'maj'], [6, 'maj']],
      [[0, 'min'], [6, 'maj'], [5, 'maj'], [4, 'maj']],
      [[0, 'min'], [3, 'min'], [6, 'maj'], [0, 'min']],
      [[0, 'min'], [2, 'maj'], [5, 'maj'], [6, 'maj']],
    ],
    chordHits: [[0], [0, 4], [0, 3, 6]],
    bassRhythms: [[0, 8, 16, 24], QUARTERS, [0, 8, 12, 16, 24, 28]],
    bassLift: 4,
    melodies: [{
      lane: 'lead',
      register: 'A4',
      rhythms: [
        EIGHTHS,
        [0, 2, 4, 7, 8, 10, 12, 15, 16, 18, 20, 23, 24, 26, 28, 31],
        [0, 4, 6, 8, 12, 14, 16, 20, 22, 24, 28, 30],
      ],
      contours: [
        [0, 2, 4, 2, 0, 2, 5, 4, 0, 2, 3, 5, 4, 3, 2, 0],
        [0, 2, 4, 5, 4, 2, 1, 2, 4, 5, 7, 5, 4, 2, 1, 0],
        [4, 4, 2, 0, 2, 4, 5, 4, 2, 0, 2, 3, 5, 4, 2, 0],
        [0, 0, 2, 4, 5, 4, 2, 0, 4, 2, 0, 2, 3, 2, 0, 0],
      ],
    }],
    drums: {
      kick: [
        QUARTERS,
        [0, 4, 7, 8, 12, 16, 20, 23, 24, 28],
        [0, 3, 6, 8, 12, 14, 16, 20, 24, 27, 28],
        [0, 4, 8, 10, 12, 16, 20, 24, 26, 28],
      ],
      snare: [BACKBEAT, [4, 12, 20, 26, 28], [4, 12, 14, 20, 28]],
      hats: [EIGHTHS, SIXTEENTHS, [0, 2, 4, 6, 8, 10, 14, 16, 18, 20, 22, 24, 26, 30]],
    },
    lanes: {
      beat: ['kick', 'snare', 'hats'],
      band: ['kick', 'snare', 'hats', 'bass', 'chords', 'lead'],
    },
    bank: {
      musicTrim: 1.147, drumGain: 0.926,
      kickVoice: 'stKickPunch', snareVoice: 'stSnareCrisp', hatsVoice: 'stHatTick',
      bassVoice: 'stRoundMono', chordsVoice: 'stFmKeys', leadVoice: 'stMonoBright',
    },
  },

  {
    id: 'dirge',
    label: 'Half-time Dirge',
    note: 'Half the tempo and half the backbeat: reed organ, sub bass, a taiko.',
    bpm: 72,
    mode: 'aeolian',
    roots: ['D', 'A', 'E', 'G', 'C'],
    registers: { bass: 'D2', chord: 'C3' },
    progressions: [
      [[0, 'min'], [5, 'maj']],
      [[0, 'min'], [6, 'maj'], [5, 'maj'], [0, 'min']],
      [[0, 'min7'], [4, 'min7']],
    ],
    chordHits: [[0], [0, 8]],
    bassRhythms: [[0, 16], [0, 8, 16, 24], [0, 14, 16, 30]],
    melodies: [{
      lane: 'lead',
      register: 'A4',
      rhythms: [[0, 8, 12, 16, 24, 28], [0, 6, 16, 22], [0, 4, 8, 16, 20, 24]],
      contours: [
        [0, 2, 1, 0, 4, 2],
        [4, 4, 2, 0, 1, 0],
        [0, 1, 2, 4, 2, 0],
      ],
    }],
    drums: {
      kick: [[0, 16], [0, 12, 16, 28], [0, 16, 22]],
      snare: [[8, 24], [8, 24, 30], [12, 28]],
      tom: [[0, 8, 16, 24], [14, 30], [0, 4, 16, 20]],
    },
    lanes: {
      beat: ['kick', 'snare', 'tom'],
      band: ['kick', 'snare', 'tom', 'bass', 'organChords', 'lead'],
    },
    bank: {
      musicTrim: 2.018, drumGain: 0.691,
      kickVoice: 'stKickDeep', snareVoice: 'stSnareBrush', tomVoice: 'stTaiko',
      bassVoice: 'stSubSine', organChordsVoice: 'stReedOrgan', leadVoice: 'stVibratoLead',
    },
  },

  {
    id: 'surf',
    label: 'Surf Spy',
    note: 'Harmonic minor at speed — plucked lead, clave, a bass that jumps octaves.',
    bpm: 152,
    mode: 'harmonicMinor',
    roots: ['E', 'A', 'D', 'B'],
    registers: { bass: 'E2', chord: 'C3' },
    progressions: [
      [[0, 'min'], [5, 'maj'], [4, 'maj'], [0, 'min']],
      [[0, 'min'], [4, 'maj'], [0, 'min'], [4, 'maj']],
      [[0, 'min'], [3, 'min'], [4, 'maj'], [0, 'min']],
    ],
    chordHits: [[0], [0, 4], [2, 6]],
    bassRhythms: [
      EIGHTHS,
      [0, 4, 6, 8, 12, 16, 20, 22, 24, 28],
      [0, 2, 6, 8, 10, 14, 16, 18, 22, 24, 26, 30],
    ],
    bassLift: 4,
    melodies: [{
      lane: 'lead',
      register: 'A4',
      rhythms: [
        EIGHTHS,
        [0, 1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30],
        [0, 2, 3, 4, 6, 8, 12, 16, 18, 19, 20, 22, 24, 28],
      ],
      contours: [
        [0, 1, 2, 4, 2, 1, 0, 6, 0, 1, 2, 4, 5, 4, 2, 1, 0, 6, 0, 0],
        [4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0, 0],
        [0, 0, 1, 2, 1, 0, 4, 4, 3, 2, 1, 0, 2, 1, 0, 6, 0, 1, 2, 0],
      ],
    }],
    drums: {
      kick: [QUARTERS, [0, 6, 8, 14, 16, 22, 24, 30], [0, 4, 8, 10, 16, 20, 24, 26]],
      snare: [BACKBEAT, [4, 10, 12, 20, 26, 28]],
      hats: [SIXTEENTHS, EIGHTHS, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 29, 30, 31]],
      rim: [OFFBEATS, [14, 30], [6, 14, 22, 30]],
    },
    lanes: {
      beat: ['kick', 'snare', 'hats', 'rim'],
      band: ['kick', 'snare', 'hats', 'rim', 'bass', 'chords', 'lead'],
    },
    bank: {
      musicTrim: 0.689, drumGain: 1.283,
      kickVoice: 'stKickTight', snareVoice: 'stSnareRim', hatsVoice: 'stHatTick', rimVoice: 'stClave',
      bassVoice: 'stTpBassGuitar', chordsVoice: 'stClav', leadVoice: 'stSynthPluck',
    },
  },

  {
    id: 'boombap',
    label: 'Boom Bap',
    note: 'Dorian sevenths at 88 — thud kick, fat snare, electric piano, celeste.',
    bpm: 88,
    mode: 'dorian',
    roots: ['C', 'F', 'G', 'A', 'D'],
    // Lower than the pop floor on purpose: the bass IS the record here.
    registers: { bass: 'C2', chord: 'C3' },
    progressions: [
      [[0, 'min7'], [3, 'min7']],
      [[0, 'min7'], [6, 'maj7'], [0, 'min7'], [3, 'min7']],
      [[0, 'min7'], [5, 'maj7'], [1, 'min7'], [6, 'maj']],
    ],
    chordHits: [[0], [0, 6], [2, 6]],
    bassRhythms: [[0, 6, 8, 14, 16, 22, 24, 30], [0, 8, 11, 16, 24, 27], [0, 3, 8, 16, 19, 24]],
    melodies: [{
      lane: 'lead',
      register: 'A4',
      rhythms: [
        [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30],
        [0, 6, 8, 14, 16, 22, 24, 30],
        [2, 4, 7, 10, 12, 18, 20, 23, 26, 28],
      ],
      contours: [
        [0, 2, 4, 2, 1, 0, 4, 5, 4, 2, 1, 0],
        [4, 2, 0, 2, 4, 5, 4, 2, 0, 1, 2, 0],
        [0, 4, 5, 4, 2, 0, 1, 0, 2, 4, 2, 0],
      ],
    }],
    drums: {
      kick: [[0, 7, 10, 16, 23, 26], [0, 10, 16, 20, 26], [0, 6, 8, 16, 22, 24]],
      snare: [BACKBEAT, [4, 12, 20, 26], [4, 14, 20, 28]],
      hats: [
        EIGHTHS,
        [0, 2, 3, 6, 8, 10, 11, 14, 16, 18, 19, 22, 24, 26, 27, 30],
        OFFBEATS,
      ],
      rim: [[7, 15, 23, 31], [11, 27], [3, 7, 19, 23]],
    },
    lanes: {
      beat: ['kick', 'snare', 'hats', 'rim'],
      band: ['kick', 'snare', 'hats', 'rim', 'bass', 'chords', 'lead'],
    },
    bank: {
      musicTrim: 1.249, drumGain: 1.086,
      kickVoice: 'stKickThud', snareVoice: 'stSnareFat', hatsVoice: 'stHatPedal', rimVoice: 'stDsRim',
      bassVoice: 'stRubberBass', chordsVoice: 'stEpiano', leadVoice: 'stCeleste',
    },
  },

  {
    id: 'motorik',
    label: 'Motorik Driver',
    note: 'One chord, straight eighths, 168 BPM. A pad, a detuned bass, no let-up.',
    bpm: 168,
    mode: 'dorian',
    roots: ['D', 'A', 'E'],
    registers: { bass: 'D2', chord: 'C3' },
    progressions: [
      [[0, 'min']],
      [[0, 'min'], [6, 'maj']],
    ],
    chordHits: [[0], [0, 16]],
    bassRhythms: [EIGHTHS, [0, 2, 4, 6, 7, 8, 10, 12, 14, 15, 16, 18, 20, 22, 23, 24, 26, 28, 30, 31]],
    melodies: [{
      lane: 'lead',
      register: 'A4',
      rhythms: [[0, 12, 16, 28], [0, 8, 16, 20, 24], [0, 2, 12, 16, 18, 28]],
      contours: [
        [0, 4, 2, 0, 4, 2],
        [4, 2, 0, 1, 2, 0],
        [0, 0, 4, 4, 2, 2],
      ],
    }],
    drums: {
      kick: [QUARTERS, [0, 4, 8, 12, 14, 16, 20, 24, 28, 30]],
      snare: [BACKBEAT, [4, 12, 20, 28, 30], [14, 30]],
      hats: [SIXTEENTHS, EIGHTHS],
      ohats: [[6, 14, 22, 30], [14, 30], [2, 10, 18, 26]],
    },
    lanes: {
      beat: ['kick', 'snare', 'hats', 'ohats'],
      band: ['kick', 'snare', 'hats', 'ohats', 'bass', 'chords', 'lead'],
    },
    bank: {
      musicTrim: 1.214, drumGain: 0.736,
      kickVoice: 'stKickTight', snareVoice: 'stSnareCrisp', hatsVoice: 'stHatClosed', ohatsVoice: 'stHatOpen',
      bassVoice: 'stDetuneBass', chordsVoice: 'stWarmPad', leadVoice: 'stDuoDetune',
    },
  },

  {
    id: 'bellbox',
    label: 'Bell Box',
    note: 'No drums anywhere: music box, celeste, glass pad and a sub underneath.',
    bpm: 96,
    mode: 'ionian',
    roots: ['C', 'F', 'G', 'D', 'A'],
    registers: { bass: 'E2', chord: 'C3' },
    progressions: [
      [[0, 'maj'], [4, 'maj'], [5, 'min'], [3, 'maj']],
      [[0, 'maj'], [5, 'min'], [3, 'maj'], [4, 'maj']],
      [[0, 'maj7'], [3, 'maj7']],
    ],
    chordHits: [[0], [0, 4]],
    bassRhythms: [[0, 8, 16, 24], [0, 16], [0, 8, 12, 16, 24, 28]],
    melodies: [
      {
        lane: 'lead',
        register: 'A4',
        rhythms: [
          QUARTERS,
          [0, 2, 4, 8, 10, 12, 16, 18, 20, 24, 26, 28],
          [0, 6, 8, 12, 16, 22, 24, 28],
        ],
        contours: [
          [0, 2, 4, 2, 0, 4, 5, 4, 2, 1, 0, 0],
          [4, 4, 2, 0, 2, 4, 7, 5, 4, 2, 0, 0],
          [0, 1, 2, 4, 5, 4, 2, 0, 1, 2, 0, 0],
        ],
      },
      // The second pitched line is what a pack with no kit has instead of a hat: it
      // is the part that keeps time, an octave above the melody and off its beats.
      {
        lane: 'twinkle',
        register: 'A5',
        rhythms: [OFFBEATS, [6, 14, 22, 30], [0, 10, 16, 26]],
        contours: [
          [4, 2, 0, 2, 4, 5, 4, 2],
          [7, 5, 4, 2, 4, 5, 7, 4],
          [0, 4, 2, 4, 0, 4, 2, 4],
        ],
      },
    ],
    // A kit only the Beat starter uses — a wood block and a ding, because a pack
    // whose Full Band has no drums still has to answer "give me a beat" with
    // something in its own voice rather than with the electropop kit.
    drums: {
      rim: [[0, 8, 16, 24], BACKBEAT, [0, 6, 16, 22]],
      tom: [[14, 30], [6, 22], [12, 28]],
    },
    lanes: {
      beat: ['rim', 'tom'],
      band: ['bass', 'chords', 'twinkle', 'lead'],
    },
    bank: {
      musicTrim: 1.506,
      rimVoice: 'stWoodBlock', tomVoice: 'stTriangleDing',
      bassVoice: 'stSubSine', chordsVoice: 'stGlassPad', twinkleVoice: 'stCeleste', leadVoice: 'stMusicBox',
    },
  },

  {
    id: 'march',
    label: 'Parade March',
    note: 'Major, brass and strings, snare on every beat and a taiko on the turn.',
    bpm: 112,
    mode: 'ionian',
    roots: ['C', 'F', 'G', 'D'],
    registers: { bass: 'E2', chord: 'C3' },
    progressions: [
      [[0, 'maj'], [3, 'maj'], [4, 'maj'], [0, 'maj']],
      [[0, 'maj'], [4, 'maj'], [0, 'maj'], [3, 'maj']],
      [[0, 'maj'], [3, 'maj'], [0, 'maj'], [4, 'maj']],
    ],
    chordHits: [[0], [0, 4], [0, 2, 4, 6]],
    bassRhythms: [QUARTERS, [0, 4, 8, 10, 16, 20, 24, 26], [0, 8, 16, 24]],
    bassLift: 4,
    melodies: [{
      lane: 'lead',
      register: 'A4',
      rhythms: [
        [0, 4, 6, 8, 12, 16, 20, 22, 24, 28],
        [0, 2, 4, 8, 12, 14, 16, 20, 24, 28],
        [0, 4, 8, 10, 12, 16, 20, 24, 26, 28],
      ],
      contours: [
        [0, 2, 4, 4, 2, 0, 4, 5, 4, 0],
        [4, 4, 2, 0, 4, 7, 5, 4, 2, 0],
        [0, 4, 2, 4, 5, 7, 5, 4, 2, 0],
      ],
    }],
    drums: {
      kick: [QUARTERS, [0, 4, 8, 12, 14, 16, 20, 24, 28, 30]],
      snare: [
        [0, 2, 4, 8, 10, 12, 16, 18, 20, 24, 26, 28],
        [0, 1, 2, 4, 8, 9, 10, 12, 16, 17, 18, 20, 24, 25, 26, 28],
        BACKBEAT,
      ],
      tom: [[14, 15, 30, 31], [6, 7, 22, 23], [12, 13, 28, 29]],
    },
    lanes: {
      beat: ['kick', 'snare', 'tom'],
      band: ['kick', 'snare', 'tom', 'bass', 'chords', 'lead'],
    },
    bank: {
      musicTrim: 0.978, drumGain: 1.097,
      kickVoice: 'stKickThud', snareVoice: 'stSnareFlam', tomVoice: 'stTaiko',
      bassVoice: 'stRoundMono', chordsVoice: 'stSynthStrings', leadVoice: 'stReedLead',
    },
  },

  {
    id: 'dub',
    label: 'Dub Chamber',
    note: 'One drop at 76, organ on the offbeat, and everything in the echo.',
    bpm: 76,
    mode: 'aeolian',
    roots: ['A', 'D', 'E', 'G'],
    registers: { bass: 'D2', chord: 'C3' },
    progressions: [
      [[0, 'min'], [3, 'min']],
      [[0, 'min7'], [6, 'maj7']],
      [[0, 'min'], [5, 'maj'], [0, 'min'], [6, 'maj']],
    ],
    chordHits: [[2, 6], [2], [6]],
    bassRhythms: [[0, 6, 8, 16, 22, 24], [0, 10, 16, 26], [0, 6, 8, 10, 16, 22, 24, 26]],
    melodies: [{
      lane: 'lead',
      register: 'A4',
      rhythms: [[0, 10, 16, 26], [6, 8, 22, 24], [0, 6, 12, 16, 22, 28]],
      contours: [
        [0, 2, 4, 2, 1, 0],
        [4, 2, 0, 4, 2, 0],
        [0, 4, 5, 4, 2, 0],
      ],
    }],
    drums: {
      // The one drop: nothing on beat one, kick and snare together on beat three.
      kick: [[8, 24], [8, 24, 30], [0, 8, 16, 24]],
      snare: [[8, 24], [8, 22, 24], [10, 26]],
      hats: [OFFBEATS, [6, 14, 22, 30], [2, 6, 10, 14, 18, 22, 26, 28, 30]],
    },
    lanes: {
      beat: ['kick', 'snare', 'hats'],
      band: ['kick', 'snare', 'hats', 'bass', 'organChords', 'lead'],
    },
    bank: {
      // The one drop is the sparsest kit here — two hits a bar — and it is measured
      // like every other pack: the gate the loudness runs through drops the silence
      // between the hits, so what this balances is how the kit sits WHEN it plays.
      musicTrim: 1.552, drumGain: 1.488,
      // The echo is the instrument here, so the bank turns it up and lets the bass
      // into it — the two keys speed.js uses for the same reason.
      echoLevel: 0.5, bassEcho: true,
      kickVoice: 'stKickDeep', snareVoice: 'stSnareCrisp', hatsVoice: 'stHatSizzle',
      bassVoice: 'stFmGrowl', organChordsVoice: 'stAmOrgan', leadVoice: 'stGlassLead',
    },
  },

  {
    id: 'house',
    label: 'House',
    note: 'Four-to-the-floor at 124: clap on the backbeat, open hat off it, piano stabs.',
    bpm: 124,
    mode: 'dorian',
    roots: ['A', 'C', 'F', 'G', 'D'],
    registers: { bass: 'E2', chord: 'C3' },
    // Sevenths throughout. A house chord is not a triad, and the stab is the hook.
    progressions: [
      [[0, 'min7'], [3, 'min7']],
      [[0, 'min7'], [5, 'maj7'], [3, 'min7'], [4, 'min7']],
      [[0, 'min7'], [6, 'maj7']],
    ],
    // Never on the beat: the chord answers the kick rather than landing with it.
    chordHits: [[2, 6], [6], [2]],
    bassRhythms: [[0, 6, 8, 14, 16, 22, 24, 30], OFFBEATS, EIGHTHS],
    bassLift: 4,
    melodies: [{
      lane: 'lead',
      register: 'A4',
      rhythms: [[0, 8, 16, 24], [6, 14, 22, 30], [0, 6, 12, 16, 22, 28]],
      contours: [
        [0, 2, 4, 2, 1, 0],
        [4, 4, 2, 0, 2, 4],
        [0, 4, 5, 4, 2, 0],
      ],
    }],
    drums: {
      kick: [QUARTERS, [0, 4, 8, 12, 14, 16, 20, 24, 28, 30]],
      // A clap, not a snare — and the one pack that uses that lane.
      clap: [BACKBEAT, [12, 28], [12, 28, 30]],
      hats: [SIXTEENTHS, EIGHTHS, [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 17, 18, 20, 22, 24, 26, 28, 30]],
      // The open hat on the offbeat IS house. Everything else here is arrangement.
      ohats: [OFFBEATS, [6, 14, 22, 30], [2, 10, 18, 26]],
    },
    lanes: {
      beat: ['kick', 'clap', 'hats', 'ohats'],
      band: ['kick', 'clap', 'hats', 'ohats', 'bass', 'chords', 'lead'],
    },
    bank: {
      musicTrim: 0.859, drumGain: 1.181,
      kickVoice: 'stKickPunch', clapVoice: 'stClapRoom', hatsVoice: 'stHatTick', ohatsVoice: 'stHatOpen',
      bassVoice: 'stTpBassy', chordsVoice: 'stTpPianoetta', leadVoice: 'stTpBah',
    },
  },

  {
    id: 'techno',
    label: 'Techno',
    note: 'Phrygian at 136: dirty kick, cowbell, acid bass rolling under one dark chord.',
    bpm: 136,
    mode: 'phrygian',
    roots: ['A', 'D', 'F', 'C'],
    // The lowest floor of any pack: all four of its roots land in octave two, so a
    // rolling acid line is the same weight whichever key the seed picks.
    registers: { bass: 'C2', chord: 'C3' },
    // One chord, or one chord and the flat second above it. Techno's harmony is a
    // colour rather than a journey, and phrygian is the darkest one on offer.
    progressions: [
      [[0, 'min']],
      [[0, 'min'], [1, 'maj']],
      [[0, 'min'], [4, 'min']],
    ],
    chordHits: [[6], [2, 10], [0]],
    bassRhythms: [
      OFFBEATS,
      [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30],
      [2, 3, 6, 7, 10, 11, 14, 15, 18, 19, 22, 23, 26, 27, 30, 31],
    ],
    melodies: [{
      lane: 'lead',
      register: 'A4',
      // Bleeps, not tunes: four notes or fewer, and long gaps between them.
      rhythms: [[0, 16], [6, 22], [0, 6, 16, 22]],
      contours: [
        [0, 4, 1, 0],
        [1, 0, 4, 1],
        [4, 1, 0, 4],
      ],
    }],
    drums: {
      kick: [QUARTERS, [0, 4, 8, 12, 15, 16, 20, 24, 28, 31]],
      clap: [[12, 28], BACKBEAT, [10, 26]],
      hats: [SIXTEENTHS, EIGHTHS, [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]],
      // The cowbell on the rim lane: the one piece of kit that says 909 out loud.
      rim: [[0, 3, 8, 11, 16, 19, 24, 27], [6, 14, 22, 30], [2, 10, 18, 26]],
    },
    lanes: {
      beat: ['kick', 'clap', 'hats', 'rim'],
      band: ['kick', 'clap', 'hats', 'rim', 'bass', 'chords', 'lead'],
    },
    bank: {
      // The one pack whose kit is MEANT to lead, and the only one aimed at a balance
      // other than electropop's: sparse bleeps and one pad against relentless
      // sixteenths is techno, right up to the point where the bass and the chord stop
      // being audible. So the kit leads by 1.5 LU rather than by whatever it happens
      // to land on — see BALANCE_BY_ID in the note above.
      musicTrim: 1.021, drumGain: 1.034,
      kickVoice: 'stKickDirty', clapVoice: 'stClapTight', hatsVoice: 'stMetalHatClosed', rimVoice: 'stCowbell',
      bassVoice: 'stAcidSquelch', chordsVoice: 'stBreathPad', leadVoice: 'stTpLectric',
    },
  },

  {
    id: 'electro',
    label: 'Electro',
    note: 'Robot pop at 126: a sequenced bell arpeggio, handclaps, hollow vocoder lead.',
    bpm: 126,
    mode: 'aeolian',
    roots: ['C', 'A', 'F', 'G', 'D'],
    registers: { bass: 'E2', chord: 'C3' },
    // Two chords at most, held for a bar each. The interest is in the sequencer, not
    // in the harmony — which is the whole trick of the records this is after.
    progressions: [
      [[0, 'min'], [5, 'maj']],
      [[0, 'min']],
      [[0, 'min7'], [5, 'maj7']],
    ],
    // Per BAR, not per beat: with a one-chord progression the block is the whole loop,
    // so `[0, 8]` would have struck twice in bar one and left bar two empty.
    chordHits: [[0], [0, 16]],
    bassRhythms: [EIGHTHS, [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30], [0, 8, 16, 24]],
    // The octave jump on the fifth sixteenth of every half bar: a sequenced bass line
    // rather than a played one.
    bassLift: 4,
    melodies: [
      {
        lane: 'lead',
        register: 'A4',
        rhythms: [[0, 8, 16, 24], [0, 12, 16, 28], [0, 4, 8, 16, 20, 24]],
        contours: [
          [0, 2, 4, 2, 1, 0],
          [4, 4, 2, 0, 2, 0],
          [0, 0, 4, 2, 1, 0],
        ],
      },
      // THE arpeggio. Four chord tones cycled over a sixteenth grid is a step
      // sequencer running, and it is the one part of this pack that has to be there:
      // a contour shorter than its rhythm repeats, which is what makes it a loop
      // rather than a tune.
      {
        lane: 'twinkle',
        register: 'A5',
        rhythms: [SIXTEENTHS, EIGHTHS, OFFBEATS],
        contours: [
          [0, 2, 4, 2],
          [0, 2, 4, 7],
          [4, 2, 0, 2],
        ],
      },
    ],
    drums: {
      kick: [QUARTERS, [0, 6, 8, 14, 16, 22, 24, 30], [0, 4, 8, 12, 16, 20, 24, 26, 28]],
      // Handclaps where the snare would be. A machine kit with a snare in it is a
      // different decade.
      clap: [BACKBEAT, [12, 28], [8, 24]],
      hats: [EIGHTHS, SIXTEENTHS, OFFBEATS],
      // One electronic blip on the turnaround, on the rim lane.
      rim: [[14, 30], [7, 15, 23, 31], [6, 22]],
    },
    lanes: {
      beat: ['kick', 'clap', 'hats', 'rim'],
      band: ['kick', 'clap', 'hats', 'rim', 'bass', 'chords', 'twinkle', 'lead'],
    },
    bank: {
      // Measured like every other pack bar Techno: a machine kit is reserved by design
      // here, so the sequencer and the bass carry the record rather than the drums.
      musicTrim: 0.81, drumGain: 1.288,
      kickVoice: 'stKickClick', clapVoice: 'stClap808', hatsVoice: 'stDsHatClosed', rimVoice: 'stZap',
      bassVoice: 'stRoundMono', chordsVoice: 'stPadTriangle', twinkleVoice: 'stFmBell', leadVoice: 'stAmHollow',
    },
  },
];

export const STYLE_IDS = SONG_STYLES.map((s) => s.id);
export const STYLE_BY_ID = Object.fromEntries(SONG_STYLES.map((s) => [s.id, s]));

/** The pack the seed picks with no style named. `auto` in the dialog. */
export const AUTO_STYLE = 'auto';

/** A one-line description of what a generated song came out as, for the file header. */
export function styleSummary(style, root, bpm) {
  return `${style.label} — ${bpm} BPM in ${root} ${MODES[style.mode].label}. ${style.note}`;
}
