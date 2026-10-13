// SPACE THEME 4 — OXYGEN DRIFT — one song: what it plays, how it is arranged, how it sounds.
//
// Mid-70s French space-synth: wide PWM pads, a sixteenth arpeggio pluck, a wobbly vibrato
// lead and a rhythm-box beat. G minor (Dorian lift in bar 6), 96 BPM, 8 bars.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "space-theme-4-oxygen-drift";
export const title = "SPACE THEME 4 — OXYGEN DRIFT";
export const slug = "space-theme-4-oxygen-drift";
export const group = "imported";

export const bank = {
  bpm: 96,
  musicTrim: 1,
  sections: [
    {
      bass: seq('G1 . . . . . . . . . G1 . . . . . | G1 . . . . . . . . . G1 . . . . .'),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      lead: seq('D5 . . . . . . . . . . . A#4 . C5 . | D5 . . . . . . . G5 . . . F5 . . .'),
      leadLen: [12.3,null,null,null,null,null,null,null,null,null,null,null,2.3,null,2.3,null,8.3,null,null,null,null,null,null,null,4.3,null,null,null,4.3,null,null,null],
      twinkle: seq('G4 A#4 D5 G4 D5 A#4 G4 A#4 D5 G4 D5 A#4 G4 A#4 D5 G4 | G4 A#4 D5 G4 D5 A#4 G4 A#4 D5 G4 D5 A#4 G4 A#4 D5 G4'),
      twinkleLen: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      chords: [[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('D#1 . . . . . . . . . D#1 . . . . . | D#1 . . . . . . . . . D#1 . . . . .'),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      lead: seq('D#5 . . . . . . . . . . . D5 . C5 . | A#4 . . . . . . . . . . . . . . .'),
      leadLen: [12.3,null,null,null,null,null,null,null,null,null,null,null,2.3,null,2.3,null,16.3,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('D#4 G4 A#4 D5 A#4 G4 D#4 G4 A#4 D5 A#4 G4 D#4 G4 A#4 D5 | D#4 G4 A#4 D5 A#4 G4 D#4 G4 A#4 D5 A#4 G4 D#4 G4 A#4 D5'),
      twinkleLen: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      chords: [[155.56349186104046,195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[155.56349186104046,195.99771799087463,233.08188075904496,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('C2 . . . . . . . . . C2 . . . . . | C2 . . . . . . . . . C2 . . . . .'),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      lead: seq('C5 . . . . . . . D#5 . . . G5 . . . | A#5 . . . . . A5 . . . G5 . . . . .'),
      leadLen: [8.3,null,null,null,null,null,null,null,4.3,null,null,null,4.3,null,null,null,6.3,null,null,null,null,null,4.3,null,null,null,6.3,null,null,null,null,null],
      twinkle: seq('C4 D#4 G4 A#4 G4 D#4 C4 D#4 G4 A#4 G4 D#4 C4 D#4 G4 A#4 | C4 D#4 G4 A#4 G4 D#4 C4 D#4 G4 A#4 G4 D#4 C4 D#4 G4 A#4'),
      twinkleLen: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      chords: [[130.8127826502993,155.56349186104046,195.99771799087463,233.08188075904496],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[130.8127826502993,155.56349186104046,195.99771799087463,233.08188075904496],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      bass: seq('D2 . . . . . . . . . D2 . . . . . | D2 . . . . . . . . . D2 . . . . .'),
      bassLen: [9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null,9,null,null,null,null,null,null,null,null,null,9,null,null,null,null,null],
      lead: seq('F#5 . . . . . . . A5 . . . . . . . | C6 . . . . . A5 . . . F#5 . . . D5 .'),
      leadLen: [8.3,null,null,null,null,null,null,null,8.3,null,null,null,null,null,null,null,6.3,null,null,null,null,null,4.3,null,null,null,4.3,null,null,null,2.3,null],
      twinkle: seq('D4 F#4 A4 D4 A4 F#4 D4 F#4 A4 D4 A4 F#4 D4 F#4 A4 D4 | C4 D4 F#4 A4 F#4 D4 C4 D4 F#4 A4 F#4 D4 C4 D4 F#4 A4'),
      twinkleLen: [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
      chords: [[146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[130.8127826502993,146.8323839587038,184.9972113558172,220],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      rim: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
  ],
  order: [0,1,2,3],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -3,
  voice: {"bassVoice":"layerLoungeBass","leadVoice":"vibratoLead","twinkleVoice":"synthPluck","chordsVoice":"bestPwmPadWide","kickVoice":"cr78Kick","rimVoice":"cr78Rim","hatsVoice":"cr78Hat"},
  fx: { delay: { tone: 3000 }, reverb: { decay: 3, preDelay: 0.02 } },
  lanes: {
    bass: { gain: -1 },
    lead: { gain: -1, send: { delay: 0.35, reverb: 0.4 } },
    twinkle: { gain: -5, pan: -0.3, send: { delay: 0.4, reverb: 0.3 } },
    chords: { gain: -18, send: { reverb: 0.5 } },
    kick: { gain: -6 },
    rim: { gain: 8, pan: 0.2 },
    hats: { gain: -2, pan: 0.3 },
  },
};

export const arrangement = null;

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
