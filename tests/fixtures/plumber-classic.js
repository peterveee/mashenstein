// TEST FIXTURE — the plumber cabinet's song as it was until 30 Sep 2026, frozen.
//
// Several tests used "the plumber song" as their known small, layer-free example (six
// sections, the classic lane order, a cabinet-screen treatment with a filter, a gap and a
// swell). On 30 Sep 2026 HARVEST OPUS became the plumber song, so those tests read this
// copy instead of the live one. Do not edit it to follow the game: it is here precisely
// so that it does not change. (The playable copy is src/data/imported/field-service-original.js.)
//
// FIELD SERVICE (ORIGINAL VERSION) — one song: what it plays, how it is arranged, how it sounds.
//
// The plumber cabinet's song until 30 Sep 2026 — the 112 BPM FIELD SERVICE theme (formerly
// PLUMBER PANIC), exactly as it shipped: its music, the desk mix and arrangement, and the
// cabinet-screen treatment. HARVEST OPUS replaced it that day; this keeps it playable and
// selectable as an alternate.
// 
// TO GO BACK: restore src/data/songs/plumber.js from git (or from the work/mix-history
// snapshot taken at the swap). The desk's "Save over" cannot do it from here: HARVEST OPUS
// replaced the music as well as the mix, and Save over only carries a mix and an arrangement.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../src/engine/notes.js';

export const id = "field-service-original";
export const title = "FIELD SERVICE (ORIGINAL VERSION)";
export const slug = "field-service-original";
export const group = "alternate";
export const alternateOf = "plumber";

export const bank = {
  bpm: 112,
  musicTrim: 0.93,
  bass: seq('A2 . A2 . F2 . F2 . C3 . C3 . G2 . G2 . | A2 . A2 . F2 . F2 . C3 . C3 . G2 . G2 .'),
  lead: seq('A4 . C5 E5 . A4 . . F4 A4 C5 . E5 . D5 C5 | A4 . C5 E5 . G5 . . F5 E5 D5 . C5 . B4 A4'),
  leadHarm: seq('F4 . A4 C5 . F4 . . D4 F4 A4 . C5 . B4 A4 | F4 . A4 C5 . E5 . . D5 C5 B4 . A4 . G4 F4'),
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
  hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
  ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  sections: [
    {
      leadHarm: null,
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      echoLevel: 0,
    },
    {
      leadHarm: null,
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      echoLevel: 0.08,
      lead: seq('E5 . C5 A4 . E5 . . G5 E5 C5 . D5 . B4 D5 | E5 . C5 A4 . A5 . . G5 F5 E5 . D5 . C5 B4'),
    },
    {
      echoLevel: 0.14,
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . E5 . . .'),
      keyGlissGain: 0.035,
      shout: seq('. . . . . . . . . . . . . . . . | A3 . . . . . . . . . . . . . . .'),
      shoutGain: 0.35,
      chords: chordSeq('. . . A3min7 . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      lead: seq('A5 . E5 C5 . A4 . . G4 C5 E5 . D5 . D5 B4 | A5 . E5 C5 . C5 . . G4 C5 E5 . B4 . G4 A4'),
      leadHarm: seq('F5 . C5 A4 . F4 . . E4 A4 C5 . B4 . B4 G4 | F5 . C5 A4 . A4 . . E4 A4 C5 . G4 . E4 F4'),
      echoLevel: 0.2,
      chords: chordSeq('. . . A3min7 . . . . . . . . . . . . | . . . . . . . F3maj7 . . . . . . . .'),
    },
    {
      lead: seq('E5 . C5 A4 . E5 . . G5 E5 C5 . D5 . B4 D5 | E5 . C5 A4 . A5 . . G5 F5 E5 . D5 . C5 B4'),
      leadHarm: seq('C5 . A4 F4 . C5 . . E5 C5 A4 . B4 . G4 B4 | C5 . A4 F4 . F5 . . E5 D5 C5 . B4 . A4 G4'),
      echoLevel: 0.27,
      keyGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . A5 . . .'),
      keyGlissGain: 0.035,
      chords: chordSeq('. . . A3min7 . . . . . . . C4maj7 . . . . | . . . A3min7 . . . . . . . C4maj7 . . . .'),
    },
    {
      echoLevel: 0.35,
      shout: seq('A3 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      shoutGain: 0.35,
      chords: chordSeq('. . . A3min7 . . . F3maj7 . . . C4maj7 . . . G3 | . . . A3min7 . . . F3maj7 . . . C4maj7 . . . G3'),
    },
  ],
  order: [0,0,1,1,2,3,4,5],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -1.1,
  voice: {"snareVoice":"dsCrackSnare2","kickVoice":"kickEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine","ohatsVoice":"ohatEngine"},
  lanes: {
    kick: { gain: 3.2 },
    snare: { gain: 2, send: { reverb: 0.37 } },
    ohats: { eq: { high: 11 } },
  },
};

export const arrangement = {
  order: [{"s":9,"bars":1},{"s":6,"bars":1,"from":1},{"s":9,"bars":1},{"s":10,"bars":1,"from":1},{"s":7,"bars":1},{"s":8,"bars":1,"from":1},{"s":7,"bars":1},{"s":13,"bars":1,"from":1},2,3,{"s":12,"bars":1},{"s":11,"bars":1,"from":1},5],
  sections: [
    {
      base: 0,
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      base: 1,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
    },
    {
      base: 7,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
    },
    {
      base: 6,
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      base: 6,
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
    },
    {
      base: 4,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
    },
    {
      base: 4,
      hats: seq('. C1 . C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      base: 7,
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 C1 . C1').map((v) => !!v),
    },
  ],
};

export const variants = {
  select: [
    {
      when: "always",
      loop: { fromBar: 1, toBar: 4 },
      treatment: [{ id: "filter", params: { type: "highpass", frequency: 520, Q: 0.9 } }],
      gap: 0.15,
      patch: {
        fx: { reverb: { level: 1.4 } },
        lanes: {
          lead: { mute: true },
          leadHarm: { mute: true },
          bass: { send: { reverb: 0.32 } },
          kick: { send: { reverb: 0.26 } },
          snare: { send: { reverb: 0.6 } },
          hats: { send: { reverb: 0.18 } },
          ohats: { send: { reverb: 0.18 } },
          clap: { send: { reverb: 0.3 } },
        },
      },
      exit: { quantize: "beat", crossfadeBars: 0, loopRelease: "atTransition", swellBars: 0.5, swellTo: 2.8, treatBars: 1.5 },
    },
  ],
};

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
