// SPACE 4C — OXYGEN × FROST FORTRESS — one song: what it plays, how it is arranged, how it sounds.
//
// OXYGEN DRIFT carrying FROST FORTRESS: the frost figure up a fourth into G minor, as an
// ice-bell ostinato on every chord and augmented into the slow vibrato lead.
// G minor, 88 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-4c-oxygen-frost";
export const title = "SPACE 4C — OXYGEN × FROST FORTRESS";
export const slug = "space-theme-4c-oxygen-frost";
export const group = "imported";

export const bank = {
  bpm: 88,
  musicTrim: 1,
  sections: [
    {
      bass: seq('G1 . . . . . . . . . G1 . . . . . | G1 . . . . . . . . . G1 . . . . .'),
      lead: seq('G4 . . . A#4 . . . D5 . . . A#4 . . . | G4 . . . . . . . F4 . . . A4 . . .'),
      twinkle: seq('G4 . A#4 . D5 . A#4 . G4 . . . F5 . A#4 . | G4 . A#4 . D5 . A#4 . G4 . . . F5 . A#4 .'),
      chords: [[195.99771799087463,233.08188075904496,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076,349.2282314330039],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      leadLen: [4.3,null,null,null,4.3,null,null,null,4.3,null,null,null,4.3,null,null,null,8.3,null,null,null,null,null,null,null,4.3,null,null,null,4.3,null,null,null],
      twinkleLen: [2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('D#1 . . . . . . . . . D#1 . . . . . | D#1 . . . . . . . . . D#1 . . . . .'),
      lead: seq('G4 . . . A#4 . . . D#5 . . . A#4 . . . | G4 . . . . . . . F4 . . . D4 . . .'),
      twinkle: seq('D#4 . G4 . A#4 . G4 . D#4 . . . D5 . G4 . | D#4 . G4 . A#4 . G4 . D#4 . . . D5 . G4 .'),
      chords: [[155.56349186104046,195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      leadLen: [4.3,null,null,null,4.3,null,null,null,4.3,null,null,null,4.3,null,null,null,8.3,null,null,null,null,null,null,null,4.3,null,null,null,4.3,null,null,null],
      twinkleLen: [2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('C2 . . . . . . . . . C2 . . . . . | C2 . . . . . . . . . C2 . . . . .'),
      lead: seq('D#4 . . . G4 . . . C5 . . . G4 . . . | D#4 . . . . . . . D4 . . . C4 . . .'),
      twinkle: seq('C4 . D#4 . G4 . D#4 . C4 . . . A#4 . D#4 . | C4 . D#4 . G4 . D#4 . C4 . . . A#4 . D#4 .'),
      chords: [[130.8127826502993,155.56349186104046,195.99771799087463,233.08188075904496],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[130.8127826502993,155.56349186104046,195.99771799087463,233.08188075904496],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      leadLen: [4.3,null,null,null,4.3,null,null,null,4.3,null,null,null,4.3,null,null,null,8.3,null,null,null,null,null,null,null,4.3,null,null,null,4.3,null,null,null],
      twinkleLen: [2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('D2 . . . . . . . . . D2 . . . . . | D2 . . . . . . . . . D2 . . . . .'),
      lead: seq('D4 . . . F#4 . . . A4 . . . C5 . . . | A4 . . . . . . . F#4 . . . . . . .'),
      twinkle: seq('D4 . F#4 . A4 . F#4 . D4 . . . C5 . F#4 . | D4 . F#4 . A4 . F#4 . D4 . . . C5 . F#4 .'),
      chords: [[146.8323839587038,184.9972113558172,220,261.6255653005986],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[146.8323839587038,184.9972113558172,220,261.6255653005986],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      leadLen: [4.3,null,null,null,4.3,null,null,null,4.3,null,null,null,4.3,null,null,null,8.3,null,null,null,null,null,null,null,8.3,null,null,null,null,null,null,null],
      twinkleLen: [2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"layerLoungeBass","leadVoice":"vibratoLead","chordsVoice":"bestPwmPadWide","kickVoice":"cr78Kick","rimVoice":"cr78Rim","hatsVoice":"cr78Hat","twinkleVoice":"tngrIceBell"},
  fx: { delay: { feedback: 0.42, tone: 2600 }, reverb: { decay: 4.5, preDelay: 0.03 } },
  lanes: {
    bass: { gain: -1 },
    lead: { gain: -0.5, send: { delay: 0.4, reverb: 0.5 } },
    twinkle: { gain: -5, pan: -0.3, send: { delay: 0.45, reverb: 0.4 } },
    chords: { gain: -19, send: { reverb: 0.6 } },
    kick: { gain: -6.5 },
    rim: { gain: 9.5, pan: 0.2, send: { reverb: 0.3 } },
    hats: { gain: -4.5, pan: 0.3 },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
