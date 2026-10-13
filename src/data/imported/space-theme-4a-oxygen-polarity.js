// SPACE 4A — OXYGEN × POLARITY DRIVE — one song: what it plays, how it is arranged, how it sounds.
//
// OXYGEN DRIFT carrying POLARITY DRIVE (the Gravity Grid theme it would replace): its call up a
// fourth into G minor, where its harmony is Oxygen's own; a new answer in bars 5-8.
// Eighth-note pluck arpeggio, rhythm box. G minor, 84 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-4a-oxygen-polarity";
export const title = "SPACE 4A — OXYGEN × POLARITY DRIVE";
export const slug = "space-theme-4a-oxygen-polarity";
export const group = "imported";

export const bank = {
  bpm: 84,
  musicTrim: 1,
  sections: [
    {
      bass: seq('G1 . . . . . . . . . G1 . . . . . | D#1 . . . . . . . . . D#1 . . . . .'),
      lead: seq('G5 . . . . . A#5 . . . G5 . . . D5 . | A#5 . . . . . F5 . . . G5 . . . . .'),
      twinkle: seq('G4 . A#4 . D5 . A#4 . G4 . A#4 . D5 . A#4 . | D#4 . G4 . A#4 . G4 . D#4 . G4 . A#4 . G4 .'),
      chords: [[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      leadLen: [6.3,null,null,null,null,null,4.3,null,null,null,4.3,null,null,null,2.3,null,6.3,null,null,null,null,null,4.3,null,null,null,6.3,null,null,null,null,null],
      twinkleLen: [1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('C2 . . . . . . . . . C2 . . . . . | D2 . . . . . . . . . D2 . . . . .'),
      lead: seq('C5 . . . . . D6 . . . A#5 . . . . . | A5 . . . . . D5 . . . F#5 . . . . .'),
      twinkle: seq('C4 . D#4 . G4 . D#4 . C4 . D#4 . G4 . D#4 . | D4 . F#4 . A4 . F#4 . D4 . F#4 . A4 . F#4 .'),
      chords: [[130.8127826502993,155.56349186104046,195.99771799087463,233.08188075904496],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      leadLen: [6.3,null,null,null,null,null,4.3,null,null,null,6.3,null,null,null,null,null,6.3,null,null,null,null,null,4.3,null,null,null,6.3,null,null,null,null,null],
      twinkleLen: [1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('G1 . . . . . . . . . G1 . . . . . | D#1 . . . . . . . . . D#1 . . . . .'),
      lead: seq('D6 . . . . . A#5 . . . G5 . . . D5 . | D#5 . . . . . G5 . . . A#5 . . . . .'),
      twinkle: seq('G4 . A#4 . D5 . A#4 . G4 . A#4 . D5 . A#4 . | D#4 . G4 . A#4 . G4 . D#4 . G4 . A#4 . G4 .'),
      chords: [[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      leadLen: [6.3,null,null,null,null,null,4.3,null,null,null,4.3,null,null,null,2.3,null,6.3,null,null,null,null,null,4.3,null,null,null,6.3,null,null,null,null,null],
      twinkleLen: [1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('C2 . . . . . . . . . C2 . . . . . | D2 . . . . . . . . . D2 . . . . .'),
      lead: seq('A5 . . . . . G5 . . . D#5 . . . C5 . | D5 . . . . . . . . . . . F#5 . A5 .'),
      twinkle: seq('C4 . D#4 . G4 . D#4 . C4 . D#4 . G4 . D#4 . | C4 . D4 . F#4 . D4 . C4 . D4 . F#4 . D4 .'),
      chords: [[130.8127826502993,155.56349186104046,195.99771799087463,233.08188075904496],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[130.8127826502993,146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      leadLen: [6.3,null,null,null,null,null,4.3,null,null,null,4.3,null,null,null,2.3,null,12.3,null,null,null,null,null,null,null,null,null,null,null,2.3,null,2.3,null],
      twinkleLen: [1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null,1.5,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"layerLoungeBass","leadVoice":"vibratoLead","chordsVoice":"bestPwmPadWide","kickVoice":"cr78Kick","rimVoice":"cr78Rim","hatsVoice":"cr78Hat","twinkleVoice":"synthPluck"},
  fx: { delay: { feedback: 0.42, tone: 2600 }, reverb: { decay: 4.5, preDelay: 0.03 } },
  lanes: {
    bass: { gain: -0.5 },
    lead: { gain: -2, send: { delay: 0.4, reverb: 0.5 } },
    twinkle: { gain: -4.5, pan: -0.3, send: { delay: 0.45, reverb: 0.4 } },
    chords: { gain: -18.5, send: { reverb: 0.6 } },
    kick: { gain: -6 },
    rim: { gain: 12, pan: 0.2, send: { reverb: 0.3 } },
    hats: { gain: -3, pan: 0.3 },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
