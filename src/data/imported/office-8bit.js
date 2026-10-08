// CORPORATE KOMBAT 8-BIT — one song: what it plays, how it is arranged, how it sounds.
//
// CORPORATE KOMBAT as the results screen plays it: every part on the 8-Bit Sound Set, every
// fader where tools/chip-results-levels.js measured the 8-bit part should sit against the
// one it replaces, no reverb. Mix it here: Save, and the game's copy (src/game/results-chip-mixes.js)
// follows — what the results screens switch to and what SETTINGS ▸ SOUNDTRACK: 8-BIT plays.
// The music below is CORPORATE KOMBAT's, copied as it stood (an alternate of office).
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "office-8bit";
export const title = "CORPORATE KOMBAT 8-BIT";
export const slug = "office-8bit";
export const group = "alternate";
export const alternateOf = "office";

export const bank = {
  bpm: 116,
  musicTrim: 0.93,
  bass: seq('G1 . G1 . B1 . B1 . C2 . C2 . D2 . D2 . | E2 . E2 . C2 . C2 . D2 . B1 . G1 . . .'),
  lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 . | G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 .'),
  kick: seq('C1 . . C1 . . C1 . C1 . . C1 . . C1 . | C1 . . C1 . . C1 . C1 . . C1 . . C1 .').map((v) => !!v),
  hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: 0.9,
  voice: {"kickVoice":"sdsKick","clapVoice":"snareEngine","hatsVoice":"hatEngine","bassVoice":"toneTriangle","leadVoice":"toneSquare","chordsVoice":"squareTone2","snareVoice":"gameBoySnare","rimVoice":"vl1Sha","ohatsVoice":"ohatEngine","crashVoice":"crashEngine","tomVoice":"tomEngine"},
  lanes: {
    lead: { gain: -2.8, send: { delay: 0.28 } },
    bass: { gain: 3.1 },
    kick: { gain: -0.5 },
    clap: { gain: 3.1 },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
