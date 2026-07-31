// VELVET KITTEN — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a blank starter.
// Motorik Driver — 120 BPM in D dorian. One chord, straight eighths, 168 BPM. A pad, a detuned bass, no let-up.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "velvet-kitten";
export const title = "VELVET KITTEN";
export const slug = "velvet-kitten";
export const group = "scratch";
export const seed = 594898452;

export const bank = {
  bpm: 120,
  musicTrim: 1.214,
  drumGain: 0.736,
  leadVoice: "stDuoDetune",
  starterLanes: ["lead"],
  sections: [
    {
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited,
// and nothing above it is ever touched by the desk.

export const mix = null;

export const arrangement = null;
