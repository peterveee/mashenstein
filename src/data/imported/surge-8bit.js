// THE SURGE 8-BIT — one song: what it plays, how it is arranged, how it sounds.
//
// THE SURGE as the results screen plays it: every part on the 8-Bit Sound Set, every
// fader where tools/chip-results-levels.js measured the 8-bit part should sit against the
// one it replaces, no reverb. Mix it here: Save, and the game's copy (src/game/results-chip-mixes.js)
// follows — what the results screens switch to and what SETTINGS ▸ SOUNDTRACK: 8-BIT plays.
// The music below is THE SURGE's, copied as it stood (an alternate of surge).
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "surge-8bit";
export const title = "THE SURGE 8-BIT";
export const slug = "surge-8bit";
export const group = "alternate";
export const alternateOf = "surge";

export const bank = {
  bpm: 132,
  musicTrim: 0.7,
  bass: seq('A1 A2 . A1 . A2 A1 . F1 F2 . F1 . F2 F1 . | G1 G2 . G1 . G2 G1 . E2 . E2 E2 . B2 . .'),
  lead: seq('A5 G5 E5 . A5 . G5 E5 D5 . E5 . C5 . E5 . | A5 G5 E5 . A5 . G5 E5 D5 . E5 . C5 . E5 .'),
  leadType: "sawtooth",
  kick: seq('C1 . C1 C1 . C1 C1 . C1 . C1 C1 . C1 C1 . | C1 . C1 C1 . C1 C1 . C1 . C1 C1 . C1 C1 .').map((v) => !!v),
  hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . C1 . . C1 . . . . C1 . . . | . . . . C1 . . C1 . . . . C1 . . .').map((v) => !!v),
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: 1.7,
  voice: {"kickVoice":"sdsKick","snareVoice":"gameBoySnare","clapVoice":"snareEngine","hatsVoice":"hatEngine","bassVoice":"toneTriangle","leadVoice":"toneSquare","chordsVoice":"squareTone2","rimVoice":"vl1Sha","ohatsVoice":"ohatEngine","crashVoice":"crashEngine","tomVoice":"tomEngine"},
  lanes: {
    lead: { gain: -7.8, send: { delay: 0.28 } },
    bass: { gain: 2.4 },
    kick: { gain: -0.5 },
    snare: { gain: -5.3 },
    clap: { gain: 3.2 },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
