// RHYTHM BANKRUPTCY — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "rhythm";
export const title = "RHYTHM BANKRUPTCY";
export const slug = "rhythm-panic";
export const group = "cabinet";

export const bank = {
  bpm: 124,
  musicTrim: 1.05,
  bass: seq('C2 . C2 . G2 . E2 . C2 . C2 . A2 . G2 . | F2 . F2 . C2 . A1 . G1 . G2 . B2 . D3 .'),
  lead: seq('C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . . | C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . .'),
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
  hats: seq('. . C1 . . . C1 . . . C1 . . C1 . C1 | . . C1 . . . C1 . . . C1 . . C1 . C1').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . C1 . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
};

// Gameplay is authored against the heard beat, rather than inferred from the
// drum lanes.  The kick/snare parts overlap on this song, and choosing one lane
// at runtime would make the playable pattern change when the mix changes.
// Slots are quarter-note beats; coin entries are intentional rests for the
// action chart.  The longer third-stage phrase gives the cabinet a clear finale
// without ever relying on a random pattern draw.
export const beatCharts = {
  1: {
    loopBeats: 8,
    events: [
      { slot: 0, action: 'jump', type: 'beatBar' }, { slot: 1, action: 'coin' },
      { slot: 2, action: 'jump', type: 'beatBar' }, { slot: 3, action: 'coin' },
      { slot: 4, action: 'jump', type: 'beatBar' }, { slot: 5, action: 'coin' },
      { slot: 6, action: 'jump', type: 'beatBar' }, { slot: 7, action: 'coin' },
    ],
  },
  2: {
    loopBeats: 8,
    events: [
      { slot: 0, action: 'coin' }, { slot: 1, action: 'duck', type: 'drone' },
      { slot: 2, action: 'jump', type: 'beatBar' }, { slot: 3, action: 'coin' },
      { slot: 4, action: 'coin' }, { slot: 5, action: 'duck', type: 'drone' },
      { slot: 6, action: 'jump', type: 'beatBar' }, { slot: 7, action: 'coin' },
    ],
  },
  3: {
    loopBeats: 16,
    events: [
      { slot: 0, action: 'jump', type: 'beatBar' }, { slot: 1, action: 'coin' },
      { slot: 2, action: 'duck', type: 'drone' }, { slot: 3, action: 'duck', type: 'drone' },
      { slot: 4, action: 'jump', type: 'beatBar' }, { slot: 5, action: 'coin' },
      { slot: 6, action: 'duck', type: 'drone' }, { slot: 7, action: 'duck', type: 'drone' },
      { slot: 8, action: 'coin' }, { slot: 9, action: 'duck', type: 'drone' },
      { slot: 10, action: 'jump', type: 'beatBar' }, { slot: 11, action: 'coin' },
      { slot: 12, action: 'duck', type: 'drone' }, { slot: 13, action: 'duck', type: 'drone' },
      { slot: 14, action: 'jump', type: 'beatBar' }, { slot: 15, action: 'coin' },
    ],
  },
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -1,
  voice: {"kickVoice":"kickEngine","snareVoice":"snareEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine"},
  lanes: {
    lead: { send: { delay: 0.28 } },
  },
};

export const arrangement = null;
