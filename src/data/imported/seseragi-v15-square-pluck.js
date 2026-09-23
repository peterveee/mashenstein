// SESERAGI v15 SQUARE PLUCK — one song: what it plays, how it is arranged, how it sounds.
//
// A candidate theme for TERMINAL VELOCITY (the neon cabinet), parked here in the
// desk and NOT wired to the level: nothing in the game plays this file.
// 
// VERSION 15 — the ice-bell CHIME (the sound that plays the JR theme at the
// start) leads throughout, including the dark half. The background line under
// it is a soft square pluck with no sustain (squareVSMono: struck, decays,
// released), very low and panned right. Pews on the downbeats of bars 21, 45
// and 53; the breakdown lift repeats bars 47–48 in E♭ minor.
// 
// The breakdown (bars 45–52) is built on the SHIBUYA melody from
// work/tracks/shibuya3.mid, moved to start on C: bars 1–2 in C minor, bars 3–4
// in E♭ minor, bars 1–2 again with the dark lead and Tron bass back, then bars
// 3–4 once more under the snare roll as the LIFT into bar 53 — the main theme in
// D minor. The melody is doubled on a neon reed so it carries.
// 
// IT STARTS AS SESERAGI AND TURNS. Bars 1–14 are the JR East Yamanote departure
// melody quoted at pitch, in C major, bright: the sweep, the G-pedal figure over C
// and G, the cadence. Bars 15–20 play the SAME figure on the SAME chime flipped to
// C minor (E→E♭, A→A♭, and an A♭ over the G chord — a flat ninth), while a Tron
// sixteenth-note bass comes in underneath and the cadence lands on A♭ instead of
// home. From there it is dark: the minor figure on the chime over an ostinato,
// a second theme with brass stabs, a breakdown, and the lot again a whole step up
// in D minor. Ends on one held D minor chord. 82 bars at 150, about 2:11.
// 
// SOURCE: work/tracks/yamonote.mid (Peter's Logic export, 23 Sep 2026). Bars 1–7
// are Seseragi. The dark section's ostinato is the shape of the file's bars 8–19
// (5 3 2 1 2 3 5 3, re-voiced per chord) and its second theme is bars 20–21,
// moved into C minor. Those two are other Yamanote melodies — not identified.
// work/tracks/shibuya.mid is byte-identical to it bar the tempo, so there is no
// separate Shibuya melody in here yet. It is JR East copyright material: if the
// game ships with it, it needs clearing.
// 
// The voices split with the halves: ice bell, alloy-chime octaves, koto, warm
// strings and an 80s bass for the bright opening; a soft background square pluck, crystal
// pluck ostinato, brass stabs, a sequenced Tron bass and a burnt-horizon pad for
// the dark. The chime is the thread — it carries the minor turn and comes back
// for the outro.
// 
// Written by work/local/_seseragi-v15.mjs through tools/lib/song-source.js — the
// music above the marker is that script's; the desk owns everything below it.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "seseragi-v15-square-pluck";
export const title = "SESERAGI v15 SQUARE PLUCK";
export const slug = "seseragi-v15-square-pluck";
export const group = "imported";

export const bank = {
  bpm: 150,
  musicTrim: 0.95,
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  sections: [
    {
      lead: seq('E3 A3 E4 B4 E5 A5 G#5 G5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [6,6,6,6,6,3,3,24,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: chordSeq('C4 . . . . . . . . . . . . . . . | C4 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('. . . . . . . . . . . . . . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G5 . G4 . A4 . G4 . C5 . G4 . E5 . G4 . | G5 . G4 . A4 . G4 . C5 . G4 . E5 . G4 .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | G6 . . . . . . . . . . . . . . .'),
      chords: chordSeq('C4 . . . . . . . . . . . . . . . | C4 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G5 . G4 . A4 . G4 . B4 . G4 . D5 . G4 . | G5 . G4 . A4 . G4 . B4 . G4 . D5 . G4 .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | G6 . . . . . . . . . . . . . . .'),
      chords: chordSeq('G3 . . . . . . . . . . . . . . . | G3 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G4 . E4 . G4 . C5 . C5 . C5 . E5 . G5 . | C5 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('C6 . . . . . . . E6 . . . . . . . | C6 . . . . . . . . . . . . . . .'),
      twinkleLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords: chordSeq('C4 . . . . . . . . . . . . . . . | C4 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('G5 . G4 . A4 . G4 . C5 . G4 . E5 . G4 . | G5 . G4 . A4 . G4 . C5 . G4 . E5 . G4 .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | G6 . . . . . . . . . . . . . . .'),
      lead2: seq('C4 . G4 . C5 . G4 . C4 . G4 . C5 . G4 . | C4 . G4 . C5 . G4 . C4 . G4 . C5 . G4 .'),
      chords: chordSeq('C4 . . . . . . . . . . . . . . . | C4 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 . | C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G5 . G4 . A4 . G4 . B4 . G4 . D5 . G4 . | G5 . G4 . A4 . G4 . B4 . G4 . D5 . G4 .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | G6 . . . . . . . . . . . . . . .'),
      lead2: seq('G3 . D4 . G4 . D4 . G3 . D4 . G4 . D4 . | G3 . D4 . G4 . D4 . G3 . D4 . G4 . D4 .'),
      chords: chordSeq('G3 . . . . . . . . . . . . . . . | G3 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 . | G1 . G2 . G1 . G2 . G1 . G2 . G1 . G2 .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G4 . E4 . G4 . C5 . C5 . C5 . E5 . G5 . | C5 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('C6 . . . . . . . E6 . . . . . . . | C6 . . . . . . . . . . . . . . .'),
      twinkleLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('C4 . G4 . C5 . G4 . C4 . G4 . C5 . G4 . | C4 . G4 . C5 . G4 . E4 . G4 . C5 . G4 .'),
      chords: chordSeq('C4 . . . . . . . . . . . . . . . | C4 . . . . . . . . . . . . . . .'),
      chordsLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 . | C2 . . . . . . . C2 . C3 . C2 . C3 .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
    },
    {
      lead: seq('G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 . | G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 .'),
      chords2: chordSeq('C4min . . . . . . . . . . . . . . . | C4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 | C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2'),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('G5 . G4 . G#4 . G4 . B4 . G4 . D5 . G4 . | G5 . G4 . G#4 . G4 . B4 . G4 . D5 . G4 .'),
      lead3: seq('G4 . G3 . G#3 . G3 . B3 . G3 . D4 . G3 . | G4 . G3 . G#3 . G3 . B3 . G3 . D4 . G3 .'),
      chords2: chordSeq('G3 . . . . . . . . . . . . . . . | G3 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('G1 G1 G2 G1 G1 G1 G2 G1 G1 G1 G2 G1 G1 G1 G2 G1 | G1 G1 G2 G1 G1 G1 G2 G1 G1 G1 G2 G1 G1 G1 G2 G1'),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('G4 . D#4 . G4 . C5 . C5 . C5 . D#5 . G5 . | C5 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('G3 . D#3 . G3 . C4 . C4 . C4 . D#4 . G4 . | C4 . . . . . . . . . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: chordSeq('F3min . . . . . . . . . . . . . . . | G#3 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('F1 F1 F2 F1 F1 F1 F2 F1 F1 F1 F2 F1 F1 F1 F2 F1 | G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1'),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      sweeps: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .'),
    },
    {
      lead3: seq('G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 . | G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 .'),
      lead4: seq('G5 . D#5 . D5 . C5 . D5 . D#5 . G5 . D#5 . | D5 . C5 . D5 . D#5 . G5 . D#5 . D5 . C5 .'),
      bass2: seq('C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 | C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2'),
      chords2: chordSeq('C4min . . . . . . . . . . . . . . . | C4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 . | G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 .'),
    },
    {
      lead3: seq('G5 . G4 . G#4 . G4 . B4 . G4 . D5 . G4 . | G5 . G4 . G#4 . G4 . B4 . G4 . D5 . G4 .'),
      lead4: seq('D5 . B4 . G#4 . G4 . G#4 . B4 . D5 . B4 . | G#4 . G4 . G#4 . B4 . D5 . B4 . G#4 . G4 .'),
      bass2: seq('G1 G1 G2 G1 G1 G1 G2 G1 G1 G1 G2 G1 G1 G1 G2 G1 | G1 G1 G2 G1 G1 G1 G2 G1 G1 G1 G2 G1 G1 G1 G2 G1'),
      chords2: chordSeq('G3 . . . . . . . . . . . . . . . | G3 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead: seq('G5 . G4 . G#4 . G4 . B4 . G4 . D5 . G4 . | G5 . G4 . G#4 . G4 . B4 . G4 . D5 . G4 .'),
    },
    {
      lead3: seq('G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 . | G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 .'),
      lead4: seq('D#5 . C5 . A#4 . G#4 . A#4 . C5 . D#5 . C5 . | A#4 . G#4 . A#4 . C5 . D#5 . C5 . A#4 . G#4 .'),
      bass2: seq('G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 | G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1'),
      chords2: chordSeq('G#3 . . . . . . . . . . . . . . . | G#3 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead: seq('G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 . | G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 .'),
    },
    {
      lead3: seq('G4 . D#4 . G4 . C5 . C5 . C5 . D#5 . G5 . | C5 . . . . . . . . . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('C5 . G#4 . G4 . F4 . G4 . G#4 . C5 . G#4 . | D5 . C5 . D5 . D#5 . G5 . D#5 . D5 . C5 .'),
      bass2: seq('F1 F1 F2 F1 F1 F1 F2 F1 F1 F1 F2 F1 F1 F1 F2 F1 | C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2'),
      chords2: chordSeq('F3min . . . . . . . . . . . . . . . | C4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead5: chordSeq('F3min . . . . . . . . . F3min . . . . . | C4min . . . . . . . . . C4min . . . . .'),
      lead5Len: [3,null,null,null,null,null,null,null,null,null,3,null,null,null,null,null,3,null,null,null,null,null,null,null,null,null,3,null,null,null,null,null],
      lead: seq('G4 . D#4 . G4 . C5 . C5 . C5 . D#5 . G5 . | C5 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead3: seq('G5 . D#5 . C5 . B4 . C5 . D#5 . D#5 . G5 . | C6 . G5 . C6 . D6 . D#6 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('G5 . D#5 . D5 . C5 . D5 . D#5 . G5 . D#5 . | A#4 . G#4 . A#4 . C5 . D#5 . C5 . A#4 . G#4 .'),
      bass2: seq('C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 | G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1'),
      chords2: chordSeq('C4min . . . . . . . . . . . . . . . | G#3 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead5: chordSeq('C4min . . . . . . . . . C4min . . . . . | G#3 . . . . . . . . . G#3 . . . . .'),
      lead5Len: [3,null,null,null,null,null,null,null,null,null,3,null,null,null,null,null,3,null,null,null,null,null,null,null,null,null,3,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('G5 . D#5 . C5 . B4 . C5 . D#5 . D#5 . G5 . | C6 . G5 . C6 . D6 . D#6 . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead3: seq('F5 . D5 . A#4 . A4 . A#4 . D5 . D5 . F5 . | A#5 . F5 . A#5 . C6 . D6 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead4: seq('F5 . D5 . C5 . A#4 . C5 . D5 . F5 . D5 . | F5 . D#5 . F5 . G5 . A#5 . G5 . F5 . D#5 .'),
      bass2: seq('A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 | D#2 D#2 D#3 D#2 D#2 D#2 D#3 D#2 D#2 D#2 D#3 D#2 D#2 D#2 D#3 D#2'),
      chords2: chordSeq('A#3 . . . . . . . . . . . . . . . | D#4 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead5: chordSeq('A#3 . . . . . . . . . A#3 . . . . . | D#4 . . . . . . . . . D#4 . . . . .'),
      lead5Len: [3,null,null,null,null,null,null,null,null,null,3,null,null,null,null,null,3,null,null,null,null,null,null,null,null,null,3,null,null,null,null,null],
      lead: seq('F5 . D5 . A#4 . A4 . A#4 . D5 . D5 . F5 . | A#5 . F5 . A#5 . C6 . D6 . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead3: seq('G5 . D#5 . C5 . B4 . C5 . D#5 . D#5 . G5 . | C6 . G5 . C6 . D6 . D#6 . D6 . C6 . A#5 .'),
      lead4: seq('G5 . D#5 . D5 . C5 . D5 . D#5 . G5 . D#5 . | A#4 . G#4 . A#4 . C5 . D#5 . C5 . A#4 . G#4 .'),
      bass2: seq('C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 | G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1 G#1 G#1 G#2 G#1'),
      chords2: chordSeq('C4min . . . . . . . . . . . . . . . | G#3 . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead5: chordSeq('C4min . . . . . . . . . C4min . . . . . | G#3 . . . . . . . . . G#3 . . . . .'),
      lead5Len: [3,null,null,null,null,null,null,null,null,null,3,null,null,null,null,null,3,null,null,null,null,null,null,null,null,null,3,null,null,null,null,null],
      lead: seq('G5 . D#5 . C5 . B4 . C5 . D#5 . D#5 . G5 . | C6 . G5 . C6 . D6 . D#6 . D6 . C6 . A#5 .'),
    },
    {
      lead3: seq('G#5 . G5 . F5 . D#5 . D5 . D#5 . F5 . D5 . | C5 . . . . . . . . . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: seq('C5 . G#4 . G4 . F4 . G#4 . B4 . D5 . B4 . | D5 . C5 . D5 . D#5 . G5 . D#5 . D5 . C5 .'),
      bass2: seq('F1 F1 F2 F1 F1 F1 F2 F1 G1 G1 G2 G1 G1 G1 G2 G1 | C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2'),
      chords2: chordSeq('F3min . . . . . . . G3 . . . . . . . | C4min . . . . . . . . . . . . . . .'),
      chords2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      lead5: chordSeq('F3min . . . . . . . . . G3 . . . . . | C4min . . . . . . . . . C4min . . . . .'),
      lead5Len: [3,null,null,null,null,null,null,null,null,null,3,null,null,null,null,null,3,null,null,null,null,null,null,null,null,null,3,null,null,null,null,null],
      lead: seq('G#5 . G5 . F5 . D#5 . D5 . D#5 . F5 . D5 . | C5 . . . . . . . . . . . . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('C5 . B4 . G4 . D#4 . D4 . C4 . G3 . C4 . | . . D#4 . G4 . B4 . C5 . B4 . G4 . D#4 .'),
      lead6: seq('C5 . B4 . G4 . D#4 . D4 . C4 . G3 . C4 . | . . D#4 . G4 . B4 . C5 . B4 . G4 . D#4 .'),
      lead4: seq('C3 . G3 . D#4 . G3 . C3 . G3 . D#4 . G3 . | C3 . G3 . D#4 . G3 . C3 . G3 . D#4 . G3 .'),
      chords2: chordSeq('C4min . . . . . . . . . . . . . . . | C4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      tom: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . A#4 . F#4 . F4 . F4 . D#4 . A#3 . D#4 . | . . D5 . D#5 . D5 . D#5 . D5 . A#4 . F#4 .'),
      lead6: seq('D5 . A#4 . F#4 . F4 . F4 . D#4 . A#3 . D#4 . | . . D5 . D#5 . D5 . D#5 . D5 . A#4 . F#4 .'),
      lead4: seq('D#3 . A#3 . F#4 . A#3 . D#3 . A#3 . F#4 . A#3 . | D#3 . A#3 . F#4 . A#3 . D#3 . A#3 . F#4 . A#3 .'),
      chords2: chordSeq('D#4min . . . . . . . . . . . . . . . | D#4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('C5 . B4 . G4 . D#4 . D4 . C4 . G3 . C4 . | . . D#4 . G4 . B4 . C5 . B4 . G4 . D#4 .'),
      lead6: seq('C5 . B4 . G4 . D#4 . D4 . C4 . G3 . C4 . | . . D#4 . G4 . B4 . C5 . B4 . G4 . D#4 .'),
      lead3: seq('C4 . B3 . G3 . D#3 . D3 . C3 . G2 . C3 . | . . D#3 . G3 . B3 . C4 . B3 . G3 . D#3 .'),
      lead4: seq('C3 . G3 . D#4 . G3 . C3 . G3 . D#4 . G3 . | C3 . G3 . D#4 . G3 . C3 . G3 . D#4 . G3 .'),
      chords2: chordSeq('C4min . . . . . . . . . . . . . . . | C4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 | C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2'),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D5 . A#4 . F#4 . F4 . F4 . D#4 . A#3 . D#4 . | . . D5 . D#5 . D5 . D#5 . D5 . A#4 . F#4 .'),
      lead6: seq('D5 . A#4 . F#4 . F4 . F4 . D#4 . A#3 . D#4 . | . . D5 . D#5 . D5 . D#5 . D5 . A#4 . F#4 .'),
      lead3: seq('D4 . A#3 . F#3 . F3 . F3 . D#3 . A#2 . D#3 . | . . D4 . D#4 . D4 . D#4 . D4 . A#3 . F#3 .'),
      lead4: seq('D#3 . A#3 . F#4 . A#3 . D#3 . A#3 . F#4 . A#3 . | D#3 . A#3 . F#4 . A#3 . D#3 . A#3 . F#4 . A#3 .'),
      chords2: chordSeq('D#4min . . . . . . . . . . . . . . . | D#4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('D#2 D#2 D#3 D#2 D#2 D#2 D#3 D#2 D#2 D#2 D#3 D#2 D#2 D#2 D#3 D#2 | D#2 D#2 D#3 D#2 D#2 D#2 D#3 D#2 D#2 D#2 D#3 D#2 D#2 D#2 D#3 D#2'),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      sweeps: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .'),
    },
    {
      lead: seq('G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 . | G5 . G4 . G#4 . G4 . C5 . G4 . D#5 . G4 .'),
      lead3: seq('G4 . G3 . G#3 . G3 . C4 . G3 . D#4 . G3 . | G4 . G3 . G#3 . G3 . C4 . G3 . D#4 . G3 .'),
      lead4: seq('G5 . D#5 . D5 . C5 . D5 . D#5 . G5 . D#5 . | D5 . C5 . D5 . D#5 . G5 . D#5 . D5 . C5 .'),
      bass2: seq('C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 | C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2'),
      chords2: chordSeq('C4min . . . . . . . . . . . . . . . | C4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('D#3 G#3 D#4 A#4 D#5 G#5 . G5 . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [6,6,6,6,6,3,null,24,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: chordSeq('C4min . . . . . . . . . . . . . . . | C4min . . . . . . . . . . . . . . .'),
      chords2Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 | C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      hats: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      lead: seq('C6 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [32,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: seq('C5 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [32,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords2: chordSeq('C4min . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords2Len: [32,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass2: seq('C2 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      bass2Len: [32,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
  ],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: 2,
  limiter: true,
  masterEffects: [{ id: "mbCompN" }],
  layers: [{ key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "chords2", from: "chords", independent: true }],
  labels: {"lead":"CHIME Ice Bell","twinkle":"OCTAVES Alloy Chime","lead2":"KOTO","chords":"PAD Warm Strings","bass":"BASS 80s","lead3":"SQUARE PLUCK background","lead4":"OSTINATO Crystal","lead5":"BRASS Stabs","bass2":"BASS Tron Pulse","chords2":"DARK PAD Burnt Horizon","lead6":"SHIBUYA DOUBLE Neon Reed","tom":"SYNDRUM Pew"},
  voice: {"leadVoice":"tngrIceBell","twinkleVoice":"celeste2","lead2Voice":"koto","chordsVoice":"simpleStrings","bassVoice":"bass80sSynth","lead3Voice":"squareVSMono","lead4Voice":"toneSquare","lead5Voice":"jmjrChoirOoh","lead6Voice":"tngrNeonReed","bass2Voice":"tngrNightSequence","chords2Voice":"tngrBurntHorizon","tomVoice":"syn3PewLong","kickVoice":"kickMegamix","snareVoice":"ds909Snare","clapVoice":"clapEngine","hatsVoice":"hatEngine","ohatsVoice":"ohat909SixBit","crashVoice":"crashEngine","sweepsVoice":"sweepUp"},
  voiceParams: {"bass2Voice":{"label":"Night Sequence","category":"Bass","synth":"TNGR-2","dur":1,"note":"A tempo-synced spectral pulse for repeated sixteenth notes.","tngr2":{"oscA":{"table":"spectralPWM","position":0.22,"envAmount":0.08,"lfoAmount":0.8,"level":0.82},"oscB":{"table":"organShift","position":0.1,"envAmount":0.12,"level":0.18,"interval":-12},"amp":{"attack":0.002,"decay":0.119,"sustain":0.29,"release":0.017},"filter":{"type":"lowpass","cutoff":1985,"resonance":3.6},"positionEnv":{"attack":0.001,"decay":0.347,"sustain":0.15},"lfo1":{"shape":"triangle","sync":true,"division":"1/16","amount":0.55},"master":{"gain":0.66}},"starter":false,"kind":"tone","level":0.019071,"peak":0.2963,"songOrigin":"library","songSourceId":"bass2Voice"},"ohatsVoice":{"label":"Open Hat · 909 Six-Bit","category":"Hats","homeLane":"ohats","dur":3,"note":"The 909’s open hat is a six-bit sample, so this is the cluster quantised to six bits — `crush` at 0.6, which is exactly where this engine’s curve lands — under an 11 kHz lowpass standing in for the real anti-aliasing filter. Dirtier and flatter than the 808, which is the difference.","metal":{"wave":"square","freq":620,"count":6,"spread":1.06,"filter":"highpass","hp":6400,"Q":0.85,"slope":-24,"decay":0.55,"sag":0.42,"sagAt":0.045,"gain":0.95},"drive":0.6,"shape":"crush","tone":{"type":"lowpass","freq":11000,"Q":0.7},"humanize":{"gain":0.04},"id":"ohat909SixBit","kind":"drum","factory":true,"level":0.06495,"peak":1.0602},"hatsVoice":{"label":"= Engine Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1,"color":"blue"},"starter":false,"kind":"drum","level":0.028298246775718527,"peak":0.8220597347596907,"songOrigin":"library","songSourceId":"hatsVoice"},"lead6Voice":{"label":"Neon Reed","category":"Lead","synth":"TNGR-2","dur":1.3,"note":"A reed-to-wire scan with a focused bandpass edge.","tngr2":{"oscA":{"table":"reedWire","position":0.12,"envAmount":0.62,"level":0.75},"oscB":{"table":"vowelGlass","position":0.42,"envAmount":0.24,"level":0.2,"interval":12},"amp":{"attack":0.008,"decay":0.22,"sustain":0.76,"release":0.2},"filter":{"type":"bandpass","cutoff":3400,"resonance":2.16},"filterEnv":{"amount":1.5,"attack":0.002,"decay":0.3,"sustain":0.35},"positionEnv":{"attack":0.004,"decay":0.4,"sustain":0.25},"master":{"gain":0.6}},"starter":false,"kind":"tone","level":0.00125,"peak":0.0191,"songOrigin":"library","songSourceId":"lead6Voice"},"leadVoice":{"label":"Ice Bell","category":"Bells","synth":"TNGR-2","dur":3,"note":"Sparse crystal partials with a long decay and controlled high notes.","tngr2":{"oscA":{"table":"bellFold","position":0.84,"envAmount":-0.2,"level":0.76},"oscB":{"table":"crystal","position":0.65,"level":0.16,"interval":12},"amp":{"attack":0.001,"decay":1.7,"sustain":0.03,"release":0.694},"positionEnv":{"attack":0,"decay":1.1,"sustain":0.12},"filter":{"type":"lowpass","cutoff":9800,"resonance":1.2},"master":{"gain":0.5}},"starter":false,"kind":"tone","level":0.032051,"peak":0.422,"songOrigin":"library","songSourceId":"leadVoice"},"chordsVoice":{"label":"Simple Strings","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Cheap stringlike sound","options":{"oscillator":{"type":"fatsawtooth","spread":19,"count":2},"envelope":{"attack":0.006,"decay":0.15,"sustain":0.88,"release":0.367},"filter":{"type":"lowpass","Q":1.6,"rolloff":-12},"filterEnvelope":{"attack":0.007,"decay":0.12,"sustain":0.4,"release":0.25,"baseFrequency":3170,"octaves":1.2}},"starter":false,"vibrato":{"depth":0.03},"transpose":-12,"kind":"tone","level":0.029329030911379346,"peak":0.35498102536755416,"songOrigin":"user","songSourceId":"chordsVoice"},"twinkleVoice":{"label":"Celeste 2","category":"Bells","synth":"RMND-2","dur":4,"note":"Small, high and pure, with a very long tail. Made for the twinkle lane.","options":{"harmonicity":3.765,"modulationIndex":2.4,"oscillator":{"type":"square"},"modulation":{"type":"sine"},"envelope":{"attack":0.001,"decay":1.6,"sustain":0.01,"release":1.6},"modulationEnvelope":{"attack":0.001,"decay":0.4,"sustain":0,"release":0.4}},"starter":false,"transpose":0,"vibrato":{"depth":0.04},"trim":0,"kind":"tone","level":0.03035936557556754,"peak":0.19988926058112816,"songOrigin":"user","songSourceId":"twinkleVoice"},"kickVoice":{"label":"= Megamix Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The hardest front of the three and the shortest tail — it has to cut through every other cabinet playing at once.","osc":{"type":"sine","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.1982,"curve":"exp","gain":1},"knock":0.47,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.31},"trim":-1.15,"starter":false,"kind":"drum","level":0.029967936279935978,"peak":0.8080426245802523,"songOrigin":"library","songSourceId":"kickVoice"},"lead2Voice":{"label":"Koto","category":"Pluck","synth":"RMND-2","dur":1.6,"note":"Bright inharmonic pluck with a fast decay. Reads as a struck string.","options":{"harmonicity":2.51,"modulationIndex":9,"oscillator":{"type":"triangle"},"modulation":{"type":"sine"},"envelope":{"attack":0.001,"decay":0.5,"sustain":0.02,"release":0.4},"modulationEnvelope":{"attack":0.001,"decay":0.12,"sustain":0,"release":0.15}},"id":"koto","kind":"tone","factory":true,"level":0.013469,"peak":0.2181},"bassVoice":{"label":"=BASS 80s Synth","category":"Bass","synth":"CRLS-1","dur":1.6,"note":"A clean 80s synth bass with a pulse-like square tone, quick decay and a small release that keeps repeated eighth notes from becoming clicks.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.003,"decay":0.32,"sustain":0.28,"release":0.2}},"id":"bass80sSynth","kind":"tone","factory":true,"level":0.072658,"peak":0.6689},"lead3Voice":{"label":"Square VS Mono","category":"Bells","synth":"CRLS-1","dur":2,"note":"Odd partials only, struck and left to ring. Woodier than the FM marimba beside it.","origin":"Tonejs/Presets Synth/Marimba","options":{"oscillator":{"partials":[1,0,2,0,3],"type":"square"},"envelope":{"attack":0.001,"decay":0.2,"sustain":0,"release":0.3}},"id":"squareVSMono","kind":"tone","factory":true,"level":0.041441,"peak":0.6167},"lead4Voice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"id":"toneSquare","kind":"tone","factory":true,"level":0.055714,"peak":0.6468},"lead5Voice":{"label":"Choir Ooh","category":"Pad","synth":"JMJR-4","dur":8,"note":"Two singers on ooh, rounder and darker than the aah beside it.","jmjr4":{"voice":"announcer","line":"ooh","unison":2,"spread":20,"amp":{"attack":0.09,"decay":0.2,"sustain":1,"release":0.5}},"vibrato":{"depth":0.21,"rate":5,"delay":0.15},"id":"jmjrChoirOoh","kind":"tone","factory":true,"level":0.031107,"peak":0.2042},"chords2Voice":{"label":"Burnt Horizon","category":"Pad","synth":"TNGR-2","dur":8,"note":"A slow glass-and-vowel pad that opens across held chords.","tngr2":{"oscA":{"table":"vowelGlass","position":0.12,"envAmount":0.55,"lfoAmount":0.08,"lfo2Amount":0.05,"level":0.76,"unison":2,"spread":9,"stereo":0.6},"oscB":{"table":"darkToAir","position":0.3,"envAmount":0.25,"lfoAmount":-0.1,"lfo2Amount":-0.06,"level":0.38,"unison":2,"spread":7,"stereo":0.6,"interval":-12},"amp":{"attack":0.014,"decay":1.8,"sustain":0.78,"release":3.2},"positionEnv":{"attack":2.4,"decay":3.4,"sustain":0.5},"filter":{"type":"lowpass","cutoff":5200,"resonance":2.64},"filterEnv":{"amount":1.4,"attack":1.1,"decay":2.2,"sustain":0.55},"lfo1":{"shape":"sine","sync":true,"division":"1/2","amount":0.3},"lfo2":{"shape":"triangle","rate":0.11,"amount":0.2},"master":{"gain":0.56}},"id":"tngrBurntHorizon","kind":"tone","factory":true,"level":0.03929,"peak":0.2604},"tomVoice":{"label":"Synare · Long Pew","category":"Sweep","homeLane":"tom","dur":3,"note":"The disco hook: 2.4 kHz gliding evenly down to 120 over seven tenths of a second, on `exp` so the fall is constant in semitones and the ear hears a line rather than a drop. The one to reach for first.","osc":{"type":"sine","from":2400,"to":120,"sweep":0.7,"pitchCurve":"exp","attack":0.003,"hold":0.45,"decay":0.55,"curve":"lin","gain":1},"drive":0.1,"id":"syn3PewLong","kind":"drum","factory":true,"level":0.274815,"peak":0.7},"snareVoice":{"label":"=909 Snare","category":"Snare","homeLane":"snare","dur":1,"note":"A bright 909-style snare: a pitched shell under a wide, slightly metallic noise burst with enough decay to carry a backbeat.","osc":{"type":"triangle","from":135,"to":285,"sweep":0.03,"decay":0.165,"curve":"exp","gain":0.72,"hold":0},"knock":1,"noise":{"type":"bandpass","freq":1950,"Q":0.8,"decay":0.88,"gain":1.62,"hold":0.019,"attack":0.001,"color":"white","slope":-24,"sweep":0.155},"drive":0.42,"shape":"fold","trim":1.6,"id":"ds909Snare","kind":"drum","factory":true,"level":0.129815,"peak":0.7},"clapVoice":{"label":"= Engine Clap","category":"Clap","homeLane":"clap","dur":1,"note":"The game’s own clap: three highpassed bursts twelve milliseconds apart, the LAST of them the loudest and four times as long — two slaps, then the room.","noise":{"type":"highpass","freq":1500,"Q":1,"decay":0.0544,"gain":1},"taps":[0,0.012,0.024],"tapGains":[1,1,1.625],"tapDecays":[0.0544,0.0544,0.2092],"id":"clapEngine","kind":"drum","factory":true,"level":0.052286,"peak":1.0679},"crashVoice":{"label":"= Engine Crash","category":"Crash","homeLane":"crash","dur":5,"note":"The game’s own crash: bright on the transient and darkening as it falls, a lowpass closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays off the 2.5-second buffer rather than looping the short one.","noise":{"type":"lowpass","freq":9000,"to":1100,"sweep":1.25,"Q":0.7,"attack":0.005,"decay":1.5743,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"id":"crashEngine","kind":"drum","factory":true,"level":0.074854,"peak":0.8242},"sweepsVoice":{"label":"Sweep Up","category":"Sweep","homeLane":"tom","dur":3,"note":"Sweep Up SFX","osc":{"type":"square","from":39,"to":1527.62,"sweep":0.654,"pitchCurve":"snap","attack":0.017,"hold":0.468,"decay":0.003,"curve":"lin","gain":0.54},"osc2":{"type":"sawtooth","from":828,"to":20000,"sweep":0.375,"decay":1.835,"curve":"exp","gain":0.61,"attack":0.061,"hold":0.005},"ring":{"type":"bandpass","freq":611,"Q":40,"hit":0.05,"attack":0.068,"decay":0.027,"curve":"exp","gain":1,"to":6177},"metal":{"wave":"square","freq":800,"spread":1,"count":6,"hp":1090,"Q":0.7,"attack":0.124,"decay":0.011,"gain":0.96,"hpTo":1375},"drive":0,"taps":[0,0.042,0.084],"tapFalloff":0.78,"tapDecays":[0.6,2.437],"bypassed":{"noise":{"type":"bandpass","freq":1130,"Q":0.7,"decay":0.001,"gain":0.65,"color":"brown","to":440,"sweep":0.092,"attack":0.005,"hold":0,"slope":-12,"curve":"exp","sag":0.37,"sagAt":0.003},"metal.resonator":{"feedback":0.93,"drive":1.25,"leak":0.00035}},"starter":false,"id":"sweepUp","kind":"drum","user":true,"level":0.367341,"peak":5.391}},
  lanes: {
    lead: { gain: 1.9, send: { delay: 0.056, reverb: 0.305 }, eq: { mid: 1 } },
    twinkle: { gain: -1.04, pan: -0.2, send: { reverb: 2.095 }, eq: { low: 0.4 } },
    lead2: { gain: -7, pan: 0.32, send: { reverb: 0.22 } },
    chords: { gain: -25.4, send: { reverb: 0.171 }, eq: { low: -5.3 }, effects: [{ id: "chorus2" }] },
    bass: { gain: -6 },
    lead3: { gain: -15.4, pan: -0.47, send: { delay: 0.017, reverb: 0.087 } },
    lead4: { gain: -13.1, pan: 0.485, send: { delay: 0.006, reverb: 0.071 } },
    lead5: { gain: -3.3, pan: -0.15, send: { reverb: 1.205 }, eq: { low: -8.5, high: 4 } },
    lead6: { gain: -8.1, pan: 0.209, send: { delay: 0.12, reverb: 0.35 } },
    bass2: { gain: -5, effects: [{ id: "compressor" }] },
    chords2: { gain: -14, pan: 0.024, send: { reverb: 0.45 }, eq: { low: -3.6, high: 3.5 }, effects: [{ id: "doubler" }] },
    tom: { gain: -7.52, pan: 0.25, send: { reverb: 0.7 }, eq: { low: -6, high: 2 }, effects: [{ id: "pingpong", params: { sync: 1, division: 0.75, feedback: 0.64, wet: 0.5 } }] },
    snare: { gain: -3, send: { reverb: 0.08 } },
    clap: { gain: -4.8, pan: -0.415, send: { reverb: 0.2 } },
    hats: { gain: -9.1, pan: -0.3, eq: { high: 3.8 } },
    ohats: { gain: -9, pan: -0.3, eq: { high: 2.5 } },
    crash: { gain: -7, pan: 0.4, send: { reverb: 0.4 } },
    sweeps: { gain: -6, send: { reverb: 0.4 } },
  },
};

export const arrangement = {
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,{"s":10,"off":["tom"]},11,12,13,{"s":18,"gain":{"lead4":-6,"lead3":-9}},{"s":19,"gain":{"lead4":-6,"lead3":-9}},{"s":20,"gain":{"lead4":-6,"lead3":-9}},{"s":21,"gain":{"lead4":-6,"lead3":-9}},{"s":10,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":11,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":12,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":13,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":14,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":15,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":16,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":17,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":14,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":15,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":16,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":17,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":22,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2},"gain":{"lead3":-5}},{"s":23,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}},{"s":24,"transpose":{"bass":2,"bass2":2,"lead":2,"lead2":2,"lead3":2,"lead4":2,"lead5":2,"lead6":2,"twinkle":2,"chords":2,"chords2":2}}],
  loop: {
    fromBar: 9,
    toBar: 82,
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
