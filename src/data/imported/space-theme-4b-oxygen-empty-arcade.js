// SPACE 4B — OXYGEN × EMPTY ARCADE — one song: what it plays, how it is arranged, how it sounds.
//
// OXYGEN DRIFT carrying EMPTY ARCADE: the title-screen broken-chord tune down a tone into
// G minor, chords turning on the half bar as the title's do, a crystal pluck an octave up on
// the strong beats. G minor, 80 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-4b-oxygen-empty-arcade";
export const title = "SPACE 4B — OXYGEN × EMPTY ARCADE";
export const slug = "space-theme-4b-oxygen-empty-arcade";
export const group = "imported";

export const bank = {
  bpm: 80,
  musicTrim: 1,
  sections: [
    {
      bass: seq('G1 . . . . . . . G1 . . . . . . . | D2 . . . . . . . D2 . . . . . . .'),
      lead: seq('G4 . . A#4 . . D5 . D#4 . . G4 . . A#4 . | D5 . . F5 . . D5 . C5 . . A#4 . . . G4'),
      twinkle: seq('G5 . . . . . . . D#5 . . . . . . . | D6 . . . . . . . C6 . . . . . . .'),
      chords: [[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,[155.56349186104046,195.99771799087463,233.08188075904496],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,233.08188075904496],null,null,null,null,null,null,null,[130.8127826502993,155.56349186104046,195.99771799087463],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null],
      leadLen: [3.3,null,null,3.3,null,null,2.3,null,3.3,null,null,3.3,null,null,2.3,null,3.3,null,null,3.3,null,null,2.3,null,3.3,null,null,4.3,null,null,null,1.3],
      twinkleLen: [3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      bass: seq('G1 . . . . . . . G1 . . . . . . . | C2 . . . . . . . C2 . . . . . . .'),
      lead: seq('G4 . . A#4 . . D5 . D#4 . . G4 . . C5 . | D#5 . . G5 . . F5 . D5 . . C5 . . . D5'),
      twinkle: seq('G5 . . . . . . . D#5 . . . . . . . | D#6 . . . . . . . D6 . . . . . . .'),
      chords: [[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,[155.56349186104046,195.99771799087463,233.08188075904496],null,null,null,null,null,null,null,[130.8127826502993,155.56349186104046,195.99771799087463],null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null],
      leadLen: [3.3,null,null,3.3,null,null,2.3,null,3.3,null,null,3.3,null,null,2.3,null,3.3,null,null,3.3,null,null,2.3,null,3.3,null,null,4.3,null,null,null,1.3],
      twinkleLen: [3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      bass: seq('G1 . . . . . . . G1 . . . . . . . | D2 . . . . . . . D2 . . . . . . .'),
      lead: seq('G4 . . A#4 . . D5 . D#4 . . G4 . . A#4 . | D5 . . F5 . . A5 . G5 . . F5 . . . D5'),
      twinkle: seq('G5 . . . . . . . D#5 . . . . . . . | D6 . . . . . . . G6 . . . . . . .'),
      chords: [[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,[155.56349186104046,195.99771799087463,233.08188075904496],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,233.08188075904496],null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null],
      leadLen: [3.3,null,null,3.3,null,null,2.3,null,3.3,null,null,3.3,null,null,2.3,null,3.3,null,null,3.3,null,null,2.3,null,3.3,null,null,4.3,null,null,null,1.3],
      twinkleLen: [3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      bass: seq('C2 . . . . . . . C2 . . . . . . . | D2 . . . . . . . D2 . . . . . . .'),
      lead: seq('C5 . . D#5 . . G5 . A4 . . C5 . . D5 . | F#4 . . A4 . . C5 . D5 . . . . . . .'),
      twinkle: seq('C6 . . . . . . . A5 . . . . . . . | F#5 . . . . . . . D6 . . . . . . .'),
      chords: [[130.8127826502993,155.56349186104046,195.99771799087463],null,null,null,null,null,null,null,[174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[130.8127826502993,146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null,7,null,null,null,null,null,null,null],
      leadLen: [3.3,null,null,3.3,null,null,2.3,null,3.3,null,null,3.3,null,null,2.3,null,3.3,null,null,3.3,null,null,2.3,null,8.3,null,null,null,null,null,null,null],
      twinkleLen: [3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null,3,null,null,null,null,null,null,null],
      chordsLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"layerLoungeBass","leadVoice":"vibratoLead","chordsVoice":"bestPwmPadWide","kickVoice":"cr78Kick","rimVoice":"cr78Rim","hatsVoice":"cr78Hat","twinkleVoice":"tngrCrystalTrigger"},
  fx: { delay: { feedback: 0.42, tone: 2600 }, reverb: { decay: 4.5, preDelay: 0.03 } },
  lanes: {
    bass: { gain: -0.5 },
    lead: { gain: -1, send: { delay: 0.4, reverb: 0.5 } },
    twinkle: { gain: -4, pan: -0.3, send: { delay: 0.45, reverb: 0.4 } },
    chords: { gain: -14.5, send: { reverb: 0.6 } },
    kick: { gain: -5.5 },
    rim: { gain: 7, pan: 0.2, send: { reverb: 0.3 } },
    hats: { gain: -3, pan: 0.3 },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
