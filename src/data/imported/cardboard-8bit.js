// CARDBOARD KINGDOM 8-BIT — one song: what it plays, how it is arranged, how it sounds.
//
// CARDBOARD KINGDOM as the results screen plays it: every part on the 8-Bit Sound Set, every
// fader where tools/chip-results-levels.js measured the 8-bit part should sit against the
// one it replaces, no reverb. Mix it here: Save, and the game's copy (src/game/results-chip-mixes.js)
// follows — what the results screens switch to and what SETTINGS ▸ SOUNDTRACK: 8-BIT plays.
// The music below is CARDBOARD KINGDOM's, copied as it stood (an alternate of cardboard).
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "cardboard-8bit";
export const title = "CARDBOARD KINGDOM 8-BIT";
export const slug = "cardboard-8bit";
export const group = "alternate";
export const alternateOf = "cardboard";

export const bank = {
  bpm: 108,
  musicTrim: 1.18,
  bass: seq('C2 . G1 . C2 . G1 . F1 . C2 . F1 . C2 . | G1 . D2 . G1 . D2 . C2 . E2 . G2 . C3 .'),
  lead: seq('E5 D5 C5 . . G4 . . E5 D5 C5 . D5 . . . | E5 D5 C5 . . G4 . . E5 D5 C5 . D5 . . .'),
  leadType: "triangle",
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
  hats: seq('. C1 . . . C1 . C1 . C1 . . . C1 . C1 | . C1 . . . C1 . C1 . C1 . . . C1 . C1').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: 0.4,
  voice: {"kickVoice":"sdsKick","snareVoice":"gameBoySnare","hatsVoice":"hatEngine","bassVoice":"toneTriangle","leadVoice":"toneSquare","chordsVoice":"squareTone2","clapVoice":"snareEngine","rimVoice":"vl1Sha","ohatsVoice":"ohatEngine","crashVoice":"crashEngine","tomVoice":"tomEngine"},
  lanes: {
    lead: { gain: -6.3, send: { delay: 0.28 } },
    bass: { gain: 3.2 },
    kick: { gain: -0.3 },
    snare: { gain: -4.9 },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
