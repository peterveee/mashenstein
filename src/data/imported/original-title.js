// EMPTY ARCADE — ORIGINAL. Read-only.
//
// The song as it first existed: the first TITLE_THEME (659b55e, 19 Jul 2026), copied verbatim from
// git history. Kept so the original can always be heard on the desk next to the song it
// grew into. There is deliberately no desk-save section in this file, so the desk opens
// it read-only; to work on it, use Save a copy.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "original-title";
export const title = "EMPTY ARCADE (ORIGINAL)";
export const slug = "original-title";
export const group = "original";

export const bank = {
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
  sweepGain: 0.022, sweepDur: 10,
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
