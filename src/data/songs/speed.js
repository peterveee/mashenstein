// SPEED ZONE — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "speed";
export const title = "SPEED ZONE";
export const slug = "speed-panic";
export const group = "cabinet";

export const bank = {
  bpm: 128,
  musicTrim: 0.87,
  bass: seq('E2 E2 . E2 . E2 . . G2 G2 . G2 . G2 . . | A2 A2 . A2 . A2 . . B2 . D3 . B2 . G2 .'),
  lead: seq('E5 . . B4 . E5 . G5 . E5 . B4 . A4 . B4 | E5 . . B4 . E5 . G5 . E5 . B4 . A4 . B4'),
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
  hats: seq('C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 | C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
  echoLevel: 0.16,
  bassEcho: true,
  sections: [
    {

    },
    {
      bass: seq('A1 A1 . A1 . A1 . . C2 C2 . C2 . C2 . . | D2 D2 . D2 . D2 . . E2 . G2 . E2 . C2 .'),
      lead: seq('A5 . . E5 . A5 . C6 . A5 . E5 . D5 . E5 | A5 . . E5 . A5 . C6 . A5 . E5 . D5 . E5'),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      echoLevel: 0.2,
    },
    {
      bass: seq('B1 B1 . B1 . B1 . . D2 D2 . D2 . D2 . . | E2 E2 . E2 . E2 . . F#2 . A2 . F#2 . D2 .'),
      lead: seq('B5 . . F#5 . B5 . D6 . B5 . F#5 . E5 . F#5 | B5 . . F#5 . B5 . D6 . B5 . F#5 . E5 . F#5'),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      echoLevel: 0.2,
    },
    {
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . A5 . . .'),
      keyGlissGain: 0.035,
    },
    {
      bass: seq('A1 A1 . A1 . A1 . . C2 C2 . C2 . C2 . . | D2 D2 . D2 . D2 . . E2 . G2 . E2 . C2 .'),
      lead: seq('A5 . . E5 . A5 . C6 . A5 . E5 . D5 . E5 | A5 . . E5 . A5 . C6 . A5 . E5 . D5 . E5'),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      echoLevel: 0.2,
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . B5 . . .'),
      keyGlissGain: 0.035,
    },
    {
      bass: seq('B1 B1 . B1 . B1 . . D2 D2 . D2 . D2 . . | E2 E2 . E2 . E2 . . F#2 . A2 . F#2 . D2 .'),
      lead: seq('B5 . . F#5 . B5 . D6 . B5 . F#5 . E5 . F#5 | B5 . . F#5 . B5 . D6 . B5 . F#5 . E5 . F#5'),
      ohats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      echoLevel: 0.2,
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . E5 . . .'),
      keyGlissGain: 0.035,
    },
  ],
  order: [0,0,0,0,0,0,0,3,1,4,2,5],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: 0.7,
  voice: {"kickVoice":"kickEngine","snareVoice":"snareEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine","ohatsVoice":"ohatEngine"},
  lanes: {
    bass: { send: { delay: 0.16 } },
    lead: { send: { delay: 0.16 } },
    keyGliss: { send: { delay: 0.16 } },
  },
};

export const arrangement = null;
