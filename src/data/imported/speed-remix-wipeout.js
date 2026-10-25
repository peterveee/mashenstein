// SPEED ZONE — WIPEOUT — one song: what it plays, how it is arranged, how it sounds.
//
// SPEED ZONE as a 1962 surf instrumental — Dick Dale, the Ventures, Link Wray. A game alternate
// of speed, selectable from the dev menu (GAME ALTERNATES) and on the desk. Nothing replaces the
// live song.
// 
// Peter: "a bunch of remixes of cabinet songs that take advantage of the new guitar presets…
// something different."
// 
// THE RIFF (speed.js lead2: E5 . . B4 . E5 . G5 . E5 . B4 . A4 . B4) is the head, TREMOLO-PICKED at
// its own pitch on the FRPP-6 bridge-pickup electric — every note re-picked on every sixteenth from
// its onset to the next, 11 picks a second — over the cabinet's own bass line, | Em G | Am G/B |,
// through the cabinet's gears: E minor ×8, A minor ×4, B minor ×4. THE SYNTH LEAD (lead4, HORIZON
// LINES' melody) is the verse, tremolo-picked, the riff two octaves down under it on the second
// guitar. THE BRIDGE is the cabinet's middle eight (G D Em C | Am D C B), a tremolo tune drawn from
// its runs and the Farfisa, ending on a stop and the runs' own Phrygian climb to D#6.
// THE DROP — Dick Dale's tremolo glissando down the neck — is its own strip: the same guitar in MONO
// with a one-sixteenth glide, so each pick slides from the last pick's pitch to its own.
// THE WIPEOUT: the drop falls to the low E, the band hits, "WIPE OUT!", and the drummer takes the
// Surfaris' break round the toms. A C#7 lifts the band a whole tone: THE CLIMAX in F# minor, the
// synth lead's whole phrase with the Farfisa an octave over it, then the riff in F#; B minor → B7
// brings it HOME to E minor (the coyote's key), the riff single-picked an octave down.
// 
//   1–4    PADDLE OUT — the drop down the neck; the riff on the low strings, the floor tom; the bass in; a B7 turnaround (the cabinet screen loops these four)
//   5–12   THE RIFF, tremolo-picked at its own pitch: chugs, driving bass, the floor-tom beat; stabs from 9
//   13–16  second gear — the riff in A minor
//   17–20  third gear — the riff in B minor; bar 20 drops down the neck into
//   21–24  THE SYNTH LEAD, tremolo-picked; the riff two octaves down, palm-muted, on the second guitar; the ride
//   25–28  the synth lead in A minor
//   29–32  the synth lead in B minor, the Farfisa in; D into
//   33–40  THE MIDDLE EIGHT (the cabinet's G D Em C | Am D C B): a tremolo tune, clean strums, the Farfisa; bar 40 stops for the cabinet's Phrygian run and the drop
//   41–44  THE WIPEOUT — the band hits E minor, "WIPE OUT!", the drum break; the riff and the bass back in, C#7 and the drop up into
//   45–52  F# MINOR — the synth lead's whole phrase a tone up, the Farfisa an octave over it, the riff on the low strings
//   53–56  the riff in F#, chugs and stabs; Bm → B7 and the drop home
//   57–60  E MINOR — the riff single-picked an octave down, staccato; the B7 turnaround back to bar 5
// 
// Sounds: FRPP-6 bridge-pickup electric (frppElectricBridge) through a spring tank with its drip up
// (the lead, and its MONO + glide copy for the drop); the second guitar on the FRPP-6 palm-muted
// electric (frppPalmMuted: the low riff and the eighth-note chugs, down-strokes) and the clean
// electric (frppCleanElectric: stabs and strums, down); the FRPP-6 neck-pickup bass (frppBassNeck);
// a Farfisa (song-local MRDR-3: square 8′ and 4′, a 2′ saw, highpassed, vibrato); the breakbeat
// kit with a song-local floor tom, its rack tom, a ride; the JMJR-4 announcer saying "wipe out".
// Every guitar chord is a real shape, one note per string (checked against FRPP-6's string rule):
//   Em 022000 · G 320003 · Am x02210 · G/B x20033 · Bm7 x24232 · C x32010 · C/E 032010 · Dm xx0231 · Bm x24432 · D xx0232 · D7 xx0212 · D/F# 2x0232 · F#m 244222 · A x02220 · A/C# x4222x · C#m x46654 · C#7 x46464 · B7 x21202 · B7b9 x2121x
// 
// Lane gains set by reasoning against the remix targets (kick ≈ lead, bass 1–3 under, snare
// 3–6 under, pads 6–10 under, hats 12–16 under), then by solo measurement.
// Trailing master gain -6.2 dB.
// 60 bars at 168 (the cabinet plays at 128), straight, 86 s; the loop 5–60 is 80 s.
// E minor at home, as the coyote's cues want; the climax in F# minor comes home before the loop.
// Written by work/local/_speed-remix-wipeout.mjs, which self-checks chord tones on the beats and
// on every tremolo pick, semitone clashes, one note per string, down-strokes, the loop wrap, the
// drops' landings and the landmarks; re-running it rewrites this file.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "speed-remix-wipeout";
export const title = "SPEED ZONE — WIPEOUT";
export const slug = "speed-remix-wipeout";
export const group = "alternate";
export const alternateOf = "speed";

export const bank = {
  bpm: 168,
  musicTrim: 0.93,
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  crash2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  chords3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  hats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  sections: [
    {
      lead2: seq('E5 E5 E5 E5 D#5 D5 C#5 B4 A#4 G#4 F#4 E4 D4 B3 A3 G3 | E3 . . . . . . . . . . . . . . .'),
      lead2Len: [1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15,3,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      tom: seq('. . . . . . . . C1 C1 C1 C1 C1 C1 C1 C1 | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      lead3: seq('. . . . . . . . . . . . . . . . | E3 . . B2 . E3 . G3 . E3 . B2 . A2 . B2'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1],
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      tom: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . . . . . C1 C1 C1 C1').map((v) => !!v),
      lead3: seq('E3 . . B2 . E3 . G3 . E3 . B2 . A2 . B2 | E3 . . B2 . E3 . G3 . . . . . . . .'),
      lead3Len: [1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1,1.3,null,null,1.3,null,1.3,null,1.3,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('E2 . . B1 . E2 . G2 . E2 . B1 . A1 . B1 | E2 . . B1 . E2 . G2 B1 . . . B1 . B1 .'),
      bassLen: [1,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,1,null,null,1,null,1,null,1,1.7,null,null,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[123.47082531403103,155.56349186104046,220,246.94165062806206,369.9944227116344],null,null,null,null,null,null,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2.8,null,null,null,null,null,null,null],
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . B4 B4 B4 B4 D#5 D#5 D#5 D#5'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1,1,1,1,1],
    },
    {
      tom: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('E1 . E1 . E1 . E1 . G1 . G1 . G1 . G1 . | A1 . A1 . A1 . A1 . B1 . B1 . B1 . B1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('E5 E5 E5 B4 B4 E5 E5 G5 G5 E5 E5 B4 B4 A4 A4 B4 | E5 E5 E5 B4 B4 E5 E5 G5 G5 E5 E5 B4 B4 A4 A4 B4'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      chords2: [[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null],
    },
    {
      tom: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('E1 . E1 . E1 . E1 . G1 . G1 . G1 . G1 . | A1 . A1 . A1 . A1 . B1 . B1 . B1 . B1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('E5 E5 E5 B4 B4 E5 E5 G5 G5 E5 E5 B4 B4 A4 A4 B4 | E5 E5 E5 B4 B4 E5 E5 G5 G5 E5 E5 B4 B4 A4 A4 B4'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      chords2: [[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null],
    },
    {
      tom: seq('. . . . . . . . . . . . C1 . C1 C1 | . . . . . . . . . . . . C1 . C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('E1 . E1 . E1 . E1 . G1 . G1 . G1 . G1 . | A1 . A1 . A1 . A1 . B1 . B1 . B1 . B1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,[97.99885899543733,123.47082531403103,146.8323839587038,195.99771799087463,246.94165062806206,391.99543598174927],null,null,null,[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,[123.47082531403103,146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927],null,null,null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null,2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null],
      lead: seq('E5 E5 E5 B4 B4 E5 E5 G5 G5 E5 E5 B4 B4 A4 A4 B4 | E5 E5 E5 B4 B4 E5 E5 G5 G5 E5 E5 B4 B4 A4 A4 B4'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      chords2: [[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
    },
    {
      tom: seq('. . . . . . . . . . . . C1 . C1 C1 | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('E1 . E1 . E1 . E1 . G1 . G1 . G1 . G1 . | A1 . A1 . A1 . A1 . B1 . B1 . B1 . B1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,[97.99885899543733,123.47082531403103,146.8323839587038,195.99771799087463,246.94165062806206,391.99543598174927],null,null,null,[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,[123.47082531403103,146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927],null,null,null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null,2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null],
      lead: seq('E5 E5 E5 B4 B4 E5 E5 G5 G5 E5 E5 B4 B4 A4 A4 B4 | E5 E5 E5 B4 B4 E5 E5 G5 G5 E5 E5 B4 B4 A4 A4 B4'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      chords2: [[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . . . | C1 . C1 . C1 . C1 . . . . . . . . .').map((v) => !!v),
    },
    {
      tom: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('A1 . A1 . A1 . A1 . C2 . C2 . C2 . C2 . | D2 . D2 . D2 . D2 . E1 . E1 . E1 . E1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null,null,null,[146.8323839587038,220,293.6647679174076,349.2282314330039],null,null,null,null,null,[146.8323839587038,220,293.6647679174076,349.2282314330039],null,null,null,null,null,[82.4068892282175,130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null,null,null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null,2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null],
      lead: seq('A5 A5 A5 E5 E5 A5 A5 C6 C6 A5 A5 E5 E5 D5 D5 E5 | A5 A5 A5 E5 E5 A5 A5 C6 C6 A5 A5 E5 E5 D5 D5 E5'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      chords2: [[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[130.8127826502993,195.99771799087463,261.6255653005986],null,[130.8127826502993,195.99771799087463,261.6255653005986],null,[130.8127826502993,195.99771799087463,261.6255653005986],null,[130.8127826502993,195.99771799087463,261.6255653005986],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[164.81377845643496,195.99771799087463,261.6255653005986],null,[164.81377845643496,195.99771799087463,261.6255653005986],null,[164.81377845643496,195.99771799087463,261.6255653005986],null,[164.81377845643496,195.99771799087463,261.6255653005986],null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null],
    },
    {
      tom: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      bass: seq('A1 . A1 . A1 . A1 . C2 . C2 . C2 . C2 . | D2 . D2 . D2 . D2 . E1 . E1 . E1 . E1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null,null,null,[146.8323839587038,220,293.6647679174076,349.2282314330039],null,null,null,null,null,[146.8323839587038,220,293.6647679174076,349.2282314330039],null,null,null,null,null,[82.4068892282175,130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null,null,null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null,2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null],
      lead: seq('A5 A5 A5 E5 E5 A5 A5 C6 C6 A5 A5 E5 E5 D5 D5 E5 | A5 A5 A5 E5 E5 A5 A5 C6 C6 A5 A5 E5 E5 D5 D5 E5'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      chords2: [[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[130.8127826502993,195.99771799087463,261.6255653005986],null,[130.8127826502993,195.99771799087463,261.6255653005986],null,[130.8127826502993,195.99771799087463,261.6255653005986],null,[130.8127826502993,195.99771799087463,261.6255653005986],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[164.81377845643496,195.99771799087463,261.6255653005986],null,[164.81377845643496,195.99771799087463,261.6255653005986],null,[164.81377845643496,195.99771799087463,261.6255653005986],null,[164.81377845643496,195.99771799087463,261.6255653005986],null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null],
    },
    {
      tom: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('B1 . B1 . B1 . B1 . D2 . D2 . D2 . D2 . | E1 . E1 . E1 . E1 . F#1 . F#1 . F#1 . F#1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      chords: [[123.47082531403103,184.9972113558172,246.94165062806206,293.6647679174076,369.9944227116344],null,null,null,null,null,[123.47082531403103,184.9972113558172,246.94165062806206,293.6647679174076,369.9944227116344],null,null,null,null,null,[146.8323839587038,220,293.6647679174076,369.9944227116344],null,null,null,[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,[92.4986056779086,146.8323839587038,220,293.6647679174076,369.9944227116344],null,null,null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null,2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null],
      lead: seq('B5 B5 B5 F#5 F#5 B5 B5 D6 D6 B5 B5 F#5 F#5 E5 E5 F#5 | B5 B5 B5 F#5 F#5 B5 B5 D6 D6 B5 B5 F#5 F#5 E5 E5 F#5'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      chords2: [[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[92.4986056779086,146.8323839587038,220],null,[92.4986056779086,146.8323839587038,220],null,[92.4986056779086,146.8323839587038,220],null,[92.4986056779086,146.8323839587038,220],null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null],
      crash2: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C#6 C6 A#5 G5 F5 D5 B4 G4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15],
      tom: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('B1 . B1 . B1 . B1 . D2 . D2 . D2 . D2 . | E1 . E1 . E1 . E1 . F#1 . . . . . . .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      chords: [[123.47082531403103,184.9972113558172,246.94165062806206,293.6647679174076,369.9944227116344],null,null,null,null,null,[123.47082531403103,184.9972113558172,246.94165062806206,293.6647679174076,369.9944227116344],null,null,null,null,null,[146.8323839587038,220,293.6647679174076,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,[92.4986056779086,146.8323839587038,220,293.6647679174076,369.9944227116344],null,null,null,null,null,null,null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null,null,null,null,null,null,null,null,null,3.8,null,null,null,null,null,null,null],
      lead: seq('B5 B5 B5 F#5 F#5 B5 B5 D6 D6 B5 B5 F#5 F#5 E5 E5 F#5 | B5 B5 B5 F#5 F#5 B5 B5 D6 . . . . . . . .'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null,null,null,null,null],
      chords2: [[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[146.8323839587038,220,293.6647679174076],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,null,null,null,null,null,null,null,null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,null,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . . . . . . . . .').map((v) => !!v),
    },
    {
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 C1').map((v) => !!v),
      lead3: seq('E3 . . B2 . E3 . G3 . E3 . B2 . A2 . B2 | E3 . . B2 . E3 . G3 . E3 . B2 . A2 . B2'),
      lead3Len: [1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('E1 . E1 . B1 . E1 . G1 . G1 . D2 . G1 . | A1 . A1 . E2 . A1 . B1 . B1 . F#2 . B1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('E4 E4 E4 E4 E4 E4 G4 G4 B4 B4 B4 B4 B4 B4 A4 A4 | G4 G4 G4 G4 G4 G4 G4 G4 F#4 F#4 F#4 F#4 E4 E4 E4 E4'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
    },
    {
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      lead3: seq('E3 . . B2 . E3 . G3 . E3 . B2 . A2 . B2 | E3 . . A2 . E3 . G3 . E3 . B2 . A2 . B2'),
      lead3Len: [1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('E1 . E1 . B1 . E1 . G1 . G1 . D2 . G1 . | A1 . A1 . E2 . A1 . B1 . B1 . F#2 . B1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('E4 E4 B4 B4 B4 B4 D5 D5 E5 E5 E5 E5 E5 E5 D5 D5 | C5 C5 C5 C5 C5 C5 B4 B4 B4 B4 A4 A4 A4 A4 B4 B4'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . . .').map((v) => !!v),
    },
    {
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 C1').map((v) => !!v),
      lead3: seq('A3 . . E3 . A3 . C4 . A3 . E3 . D3 . E3 | A3 . . E3 . A3 . C4 . A3 . E3 . D3 . E3'),
      lead3Len: [1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('A1 . A1 . E2 . A1 . C2 . C2 . G2 . C2 . | D2 . D2 . A2 . D2 . E1 . E1 . B1 . E1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('A4 A4 A4 A4 A4 A4 C5 C5 E5 E5 E5 E5 E5 E5 D5 D5 | C5 C5 C5 C5 C5 C5 C5 C5 B4 B4 B4 B4 A4 A4 A4 A4'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
    },
    {
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      lead3: seq('A3 . . E3 . A3 . C4 . A3 . E3 . D3 . E3 | A3 . . D3 . A3 . C4 . A3 . E3 . D3 . E3'),
      lead3Len: [1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('A1 . A1 . E2 . A1 . C2 . C2 . G2 . C2 . | D2 . D2 . A2 . D2 . E1 . E1 . B1 . E1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('A4 A4 E5 E5 E5 E5 G5 G5 A5 A5 A5 A5 A5 A5 G5 G5 | F5 F5 F5 F5 F5 F5 E5 E5 E5 E5 D5 D5 D5 D5 E5 E5'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . . . . . . . . .').map((v) => !!v),
    },
    {
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . C1 C1').map((v) => !!v),
      lead3: seq('B3 . . F#3 . B3 . D4 . B3 . F#3 . E3 . F#3 | B3 . . E3 . B3 . E4 . B3 . F#3 . E3 . F#3'),
      lead3Len: [1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('B1 . B1 . F#2 . B1 . D2 . D2 . A2 . D2 . | E1 . E1 . B1 . E1 . F#1 . F#1 . C#2 . F#1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('B4 B4 B4 B4 B4 B4 D5 D5 F#5 F#5 F#5 F#5 F#5 F#5 E5 E5 | D5 D5 D5 D5 D5 D5 D5 D5 C#5 C#5 C#5 C#5 B4 B4 B4 B4'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . . .').map((v) => !!v),
      chords3: [[184.9972113558172,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,[184.9972113558172,220,293.6647679174076],null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,null,null,[184.9972113558172,220,277.1826309768721],null,null,null,null,null,null,null],
      chords3Len: [7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null],
    },
    {
      lead3: seq('B3 . . F#3 . B3 . D4 . B3 . F#3 . E3 . F#3 | B3 . . E3 . B3 . D4 . B3 . F#3 . E3 . F#3'),
      lead3Len: [1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      bass: seq('B1 . B1 . F#2 . B1 . D2 . D2 . A2 . D2 . | E1 . E1 . B1 . E1 . D2 . D2 . A2 . D2 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('B4 B4 F#5 F#5 F#5 F#5 A5 A5 B5 B5 B5 B5 B5 B5 A5 A5 | G5 G5 G5 G5 G5 G5 F#5 F#5 F#5 F#5 E5 E5 E5 E5 F#5 F#5'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      crash2: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . . . . . . . . .').map((v) => !!v),
      chords3: [[184.9972113558172,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,[184.9972113558172,220,293.6647679174076],null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,null,null,[184.9972113558172,220,293.6647679174076],null,null,null,null,null,null,null],
      chords3Len: [7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null],
    },
    {
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('G1 . G1 . G2 . G1 . G1 . G1 . G2 . G1 . | D2 . D2 . D3 . D2 . D2 . D2 . D3 . D2 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      chords: [[97.99885899543733,123.47082531403103,146.8323839587038,195.99771799087463,246.94165062806206,391.99543598174927],null,null,null,null,null,[97.99885899543733,123.47082531403103,146.8323839587038,195.99771799087463,246.94165062806206,391.99543598174927],null,[97.99885899543733,123.47082531403103,146.8323839587038,195.99771799087463,246.94165062806206,391.99543598174927],null,null,null,null,null,[97.99885899543733,123.47082531403103,146.8323839587038,195.99771799087463,246.94165062806206,391.99543598174927],null,[146.8323839587038,220,293.6647679174076,369.9944227116344],null,null,null,null,null,[146.8323839587038,220,293.6647679174076,369.9944227116344],null,[146.8323839587038,220,293.6647679174076,369.9944227116344],null,null,null,null,null,[146.8323839587038,220,293.6647679174076,369.9944227116344],null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,2.8,null,null,null,null,null,1.8,null,2.8,null,null,null,null,null,1.8,null,2.8,null,null,null,null,null,1.8,null],
      lead: seq('G4 G4 G4 G4 B4 B4 B4 B4 D5 D5 D5 D5 D5 D5 E5 E5 | F#5 F#5 F#5 F#5 F#5 F#5 F#5 F#5 E5 E5 E5 E5 D5 D5 D5 D5'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      chords3: [[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[184.9972113558172,220,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [15.7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,15.7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('E1 . E1 . E2 . E1 . E1 . E1 . E2 . E1 . | C2 . C2 . C3 . C2 . C2 . C2 . C3 . C2 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      chords: [[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,[130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null,[130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,2.8,null,null,null,null,null,1.8,null,2.8,null,null,null,null,null,1.8,null,2.8,null,null,null,null,null,1.8,null],
      lead: seq('B4 B4 B4 B4 E5 E5 E5 E5 G5 G5 G5 G5 G5 G5 F#5 F#5 | E5 E5 E5 E5 E5 E5 E5 E5 C5 C5 C5 C5 G4 G4 G4 G4'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      chords3: [[195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [15.7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,15.7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . . . . .').map((v) => !!v),
    },
    {
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('A1 . A1 . A2 . A1 . A1 . A1 . A2 . A1 . | D2 . D2 . D3 . D2 . D2 . D2 . D3 . D2 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      chords: [[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,null,null,null,null,[110,164.81377845643496,220,261.6255653005986,329.6275569128699],null,[146.8323839587038,220,261.6255653005986,369.9944227116344],null,null,null,null,null,[146.8323839587038,220,261.6255653005986,369.9944227116344],null,[146.8323839587038,220,261.6255653005986,369.9944227116344],null,null,null,null,null,[146.8323839587038,220,261.6255653005986,369.9944227116344],null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,2.8,null,null,null,null,null,1.8,null,2.8,null,null,null,null,null,1.8,null,2.8,null,null,null,null,null,1.8,null],
      lead: seq('A4 A4 A4 A4 C5 C5 C5 C5 E5 E5 E5 E5 E5 E5 E5 E5 | F#5 F#5 F#5 F#5 A5 A5 A5 A5 C6 C6 C6 C6 C6 C6 A5 A5'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      chords3: [[220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[184.9972113558172,220,261.6255653005986],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [15.7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,15.7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
    },
    {
      lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C6 A#5 G5 D#5 B4 G4 D4 A3'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15],
      tom: seq('. . . . . . . . . . . . C1 C1 C1 C1 | . . . . . . . . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      crash: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('C2 . C2 . C3 . C2 . C2 . C2 . C3 . C2 . | B1 . . . . . . . . . . . . . . .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.5,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      tom2: seq('. . . . . . . . C1 C1 C1 C1 . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      chords: [[130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null,[130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null,null,null,null,null,[130.8127826502993,164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699],null,[123.47082531403103,155.56349186104046,220,261.6255653005986],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,2.8,null,null,null,null,null,1.8,null,1.5,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('G5 G5 G5 G5 G5 G5 G5 G5 E5 E5 E5 E5 C5 C5 C5 C5 | D#5 . E5 F#5 G5 A5 B5 D#6 . . . . . . . .'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,null,1,1,1,1,1,1,null,null,null,null,null,null,null,null],
      chords3: [[195.99771799087463,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords3Len: [15.7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      hats: seq('C1 . C1 . C1 . C1 . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead2: seq('E3 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [6,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      tom: seq('C1 . . . . . . . . . . . . . . . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('E1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      bassLen: [3,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . . . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . C1 C1 C1 C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      chords: [[82.4068892282175,123.47082531403103,164.81377845643496,195.99771799087463,246.94165062806206,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [3,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('. . . . A2 . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead5Len: [null,null,null,null,10,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C#6 C6 A#5 G#5 F#5 D#5 C5 A4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15],
      tom: seq('. . . . C1 C1 C1 C1 . . . . C1 C1 C1 C1 | C1 . C1 . C1 . C1 . . . . . . . . .').map((v) => !!v),
      lead3: seq('. . . . . . . . . . . . . . . . | E3 . . B2 . E3 . G3 . . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.3,null,null,1.3,null,1.3,null,1.3,null,null,null,null,null,null,null,null],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      bass: seq('E1 . E1 . E1 . E1 . E1 . E1 . E1 . E1 . | E2 . . B1 . E2 . G2 C#2 . C#2 . C#2 . C#2 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1,null,null,1,null,1,null,1,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('C1 C1 C1 C1 . . . . C1 C1 C1 C1 . . . . | . C1 . C1 . C1 . C1 . . . . . . . .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[138.59131548843604,207.65234878997256,246.94165062806206,349.2282314330039,415.3046975799451],null,null,null,null,null,null,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,3.5,null,null,null,null,null,null,null],
    },
    {
      tom: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      lead3: seq('F#3 . . C#3 . F#3 . A3 . F#3 . C#3 . B2 . C#3 | F#3 . . C#3 . F#3 . A3 . F#3 . C#3 . B2 . C#3'),
      lead3Len: [1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('F#1 . F#1 . F#2 . F#1 . A1 . A1 . A2 . A1 . | B1 . B1 . B2 . B1 . C#2 . C#2 . C#3 . C#2 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      chords: [[92.4986056779086,138.59131548843604,184.9972113558172,220,277.1826309768721,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('F#4 F#4 F#4 F#4 F#4 F#4 A4 A4 C#5 C#5 C#5 C#5 C#5 C#5 B4 B4 | A4 A4 A4 A4 A4 A4 A4 A4 G#4 G#4 G#4 G#4 F#4 F#4 F#4 F#4'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      crash2: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      lead4: seq('F#5 . . . . . A5 . C#6 . . . . . B5 . | A5 . . . . . . . G#5 . . . F#5 . . .'),
      lead4Len: [5.75,null,null,null,null,null,1.75,null,5.75,null,null,null,null,null,1.75,null,7.75,null,null,null,null,null,null,null,3.75,null,null,null,5.75,null,null,null],
    },
    {
      tom: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      lead3: seq('F#3 . . C#3 . F#3 . A3 . F#3 . C#3 . B2 . C#3 | F#3 . . B2 . F#3 . A3 . F#3 . C#3 . B2 . C#3'),
      lead3Len: [1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('F#1 . F#1 . F#2 . F#1 . A1 . A1 . A2 . A1 . | B1 . B1 . B2 . B1 . C#2 . C#2 . C#3 . C#2 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      lead: seq('F#4 F#4 C#5 C#5 C#5 C#5 E5 E5 F#5 F#5 F#5 F#5 F#5 F#5 E5 E5 | D5 D5 D5 D5 D5 D5 C#5 C#5 C#5 C#5 B4 B4 B4 B4 C#5 C#5'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      crash2: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . . . . .').map((v) => !!v),
      lead4: seq('. . C#6 . . . E6 . F#6 . . . . . E6 . | D6 . . . . . C#6 . . . B5 . . . C#6 .'),
      lead4Len: [null,null,3.75,null,null,null,1.75,null,5.75,null,null,null,null,null,1.75,null,5.75,null,null,null,null,null,3.75,null,null,null,3.75,null,null,null,1.75,null],
    },
    {
      tom: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      lead3: seq('F#3 . . C#3 . F#3 . A3 . F#3 . C#3 . B2 . C#3 | F#3 . . C#3 . F#3 . A3 . F#3 . C#3 . B2 . C#3'),
      lead3Len: [1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('F#1 . F#1 . F#2 . F#1 . A1 . A1 . A2 . A1 . | B1 . B1 . B2 . B1 . C#2 . C#2 . C#3 . C#2 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      chords: [[92.4986056779086,138.59131548843604,184.9972113558172,220,277.1826309768721,369.9944227116344],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chordsLen: [2.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead: seq('F#4 F#4 F#4 F#4 F#4 F#4 A4 A4 C#5 C#5 C#5 C#5 C#5 C#5 B4 B4 | A4 A4 A4 A4 A4 A4 A4 A4 G#4 G#4 G#4 G#4 F#4 F#4 F#4 F#4'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      crash2: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      lead4: seq('F#5 . . . . . A5 . C#6 . . . . . B5 . | A5 . . . . . . . G#5 . . . F#5 . . .'),
      lead4Len: [5.75,null,null,null,null,null,1.75,null,5.75,null,null,null,null,null,1.75,null,7.75,null,null,null,null,null,null,null,3.75,null,null,null,3.75,null,null,null],
    },
    {
      tom: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . . . . . C1 C1 C1 C1').map((v) => !!v),
      lead3: seq('F#3 . . C#3 . F#3 . A3 . F#3 . C#3 . B2 . C#3 | F#3 . . C#3 . F#3 . A3 . F#3 . C#3 . B2 . C#3'),
      lead3Len: [1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,1.3,null,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3,null,1.3],
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('F#1 . F#1 . F#2 . F#1 . A1 . A1 . A2 . A1 . | B1 . B1 . B2 . B1 . C#2 . C#2 . C#3 . C#2 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . C1 . C1 . . . . . . . | C1 . . . . . C1 . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 C1 C1 . . . .').map((v) => !!v),
      lead: seq('A4 A4 A4 A4 A4 A4 A4 A4 . . C#5 C#5 C#5 C#5 C#5 C#5 | B4 B4 B4 B4 B4 B4 B4 B4 . . . . C#5 C#5 C#5 C#5'),
      leadLen: [1,1,1,1,1,1,1,1,null,null,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null,1,1,1,1],
      crash2: seq('C1 . . . C1 . . . C1 . . . C1 . . . | C1 . . . C1 . . . . . . . . . . .').map((v) => !!v),
      lead4: seq('A5 . . . . . . . . . C#6 . . . . . | B5 . . . . . . . . . . . C#6 . . .'),
      lead4Len: [7.75,null,null,null,null,null,null,null,null,null,5.75,null,null,null,null,null,7.75,null,null,null,null,null,null,null,null,null,null,null,3.75,null,null,null],
    },
    {
      tom: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('F#1 . F#1 . F#2 . F#1 . A1 . A1 . A2 . A1 . | B1 . B1 . B2 . B1 . C#2 . C#2 . C#3 . C#2 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[92.4986056779086,138.59131548843604,184.9972113558172,220,277.1826309768721,369.9944227116344],null,null,null,null,null,[92.4986056779086,138.59131548843604,184.9972113558172,220,277.1826309768721,369.9944227116344],null,null,null,null,null,[110,164.81377845643496,220,277.1826309768721,329.6275569128699],null,null,null,[123.47082531403103,184.9972113558172,246.94165062806206,293.6647679174076,369.9944227116344],null,null,null,null,null,[123.47082531403103,184.9972113558172,246.94165062806206,293.6647679174076,369.9944227116344],null,null,null,null,null,[138.59131548843604,164.81377845643496,220,277.1826309768721],null,null,null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null,2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null],
      lead: seq('F#5 F#5 F#5 C#5 C#5 F#5 F#5 A5 A5 F#5 F#5 C#5 C#5 B4 B4 C#5 | F#5 F#5 F#5 C#5 C#5 F#5 F#5 A5 A5 F#5 F#5 C#5 C#5 B4 B4 C#5'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      chords2: [[92.4986056779086,138.59131548843604,184.9972113558172],null,[92.4986056779086,138.59131548843604,184.9972113558172],null,[92.4986056779086,138.59131548843604,184.9972113558172],null,[92.4986056779086,138.59131548843604,184.9972113558172],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[138.59131548843604,164.81377845643496,220],null,[138.59131548843604,164.81377845643496,220],null,[138.59131548843604,164.81377845643496,220],null,[138.59131548843604,164.81377845643496,220],null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null],
      chords3: [[184.9972113558172,220,277.1826309768721],null,null,null,null,null,null,null,[164.81377845643496,220,277.1826309768721],null,null,null,null,null,null,null,[184.9972113558172,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,[164.81377845643496,220,277.1826309768721],null,null,null,null,null,null,null],
      chords3Len: [7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null],
    },
    {
      lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . B5 A#5 G#5 F#5 E5 C#5 A#4 G4'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15],
      tom: seq('C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 C1 . C1 C1 | C1 . C1 C1 C1 . C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('F#1 . F#1 . F#2 . F#1 . A1 . A1 . A2 . A1 . | B1 . B1 . B1 . B1 . B1 . . . . . . .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,null,null,null,null,null,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      chords: [[92.4986056779086,138.59131548843604,184.9972113558172,220,277.1826309768721,369.9944227116344],null,null,null,null,null,[92.4986056779086,138.59131548843604,184.9972113558172,220,277.1826309768721,369.9944227116344],null,null,null,null,null,[110,164.81377845643496,220,277.1826309768721,329.6275569128699],null,null,null,null,null,null,null,null,null,null,null,[123.47082531403103,155.56349186104046,220,246.94165062806206,369.9944227116344],null,null,null,null,null,null,null],
      chordsLen: [2.8,null,null,null,null,null,1.8,null,null,null,null,null,2.8,null,null,null,null,null,null,null,null,null,null,null,3.8,null,null,null,null,null,null,null],
      lead: seq('F#5 F#5 F#5 C#5 C#5 F#5 F#5 A5 A5 F#5 F#5 C#5 C#5 B4 B4 C#5 | F#5 F#5 F#5 C#5 C#5 F#5 F#5 A5 . . . . . . . .'),
      leadLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,null,null,null,null,null,null,null,null],
      chords2: [[92.4986056779086,138.59131548843604,184.9972113558172],null,[92.4986056779086,138.59131548843604,184.9972113558172],null,[92.4986056779086,138.59131548843604,184.9972113558172],null,[92.4986056779086,138.59131548843604,184.9972113558172],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,[123.47082531403103,184.9972113558172,246.94165062806206],null,null,null,null,null,null,null,null,null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,null,null,null,null,null,null,null,null],
      chords3: [[184.9972113558172,220,277.1826309768721],null,null,null,null,null,null,null,[164.81377845643496,220,277.1826309768721],null,null,null,null,null,null,null,[184.9972113558172,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,[184.9972113558172,220,311.1269837220809],null,null,null,null,null,null,null],
      chords3Len: [7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null,7.7,null,null,null,null,null,null,null],
    },
    {
      tom: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass: seq('E1 . E1 . E1 . E1 . G1 . G1 . G1 . G1 . | A1 . A1 . A1 . A1 . B1 . B1 . B1 . B1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      lead: seq('E4 . . B3 . E4 . G4 . E4 . B3 . A3 . B3 | E4 . . B3 . E4 . G4 . E4 . B3 . A3 . B3'),
      leadLen: [1.4,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,1,1.4,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,1],
      chords2: [[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null,[123.47082531403103,146.8323839587038,195.99771799087463],null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null],
    },
    {
      tom: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 . | C1 . C1 . C1 . C1 . . . . . C1 C1 C1 C1').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      bass: seq('E1 . E1 . E1 . E1 . G1 . G1 . G1 . G1 . | A1 . A1 . A1 . A1 . B1 . . . B1 . B1 .'),
      bassLen: [1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,1.7,null,null,null,1.7,null,1.7,null],
      kick: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 C1 C1 . . . .').map((v) => !!v),
      chords: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[123.47082531403103,155.56349186104046,220,246.94165062806206,369.9944227116344],null,null,null,null,null,null,null],
      chordsLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,3.8,null,null,null,null,null,null,null],
      lead: seq('E4 . . B3 . E4 . G4 . E4 . B3 . A3 . B3 | E4 . . B3 . E4 . G4 B4 B4 B4 B4 D#5 D#5 D#5 D#5'),
      leadLen: [1.4,null,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,1.4,null,1,1.4,null,null,1.4,null,1.4,null,1.4,1,1,1,1,1,1,1,1],
      chords2: [[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[82.4068892282175,123.47082531403103,164.81377845643496],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[97.99885899543733,146.8323839587038,195.99771799087463],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,[110,164.81377845643496,220],null,null,null,null,null,null,null,null,null],
      chords2Len: [0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,0.9,null,null,null,null,null,null,null,null,null],
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 3, "low.attack": 0.06, "low.release": 0.25, "low.knee": 10, "mid.threshold": -22, "mid.ratio": 2.5, "mid.attack": 0.02, "mid.release": 0.12, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2, "high.attack": 0.01, "high.release": 0.08, "high.knee": 10 } }, { id: "gain", params: { gain: -6.2 } }],
  layers: [{ key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "chords3", from: "chords", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "crash2", from: "crash", independent: true }],
  order: ["kick","snare","tom","tom2","hats","crash2","crash","bass","chords2","chords","chords3","lead3","lead","lead2","lead4","lead5"],
  labels: {"lead":"LEAD Tremolo","lead2":"LEAD The Drop","lead3":"GUITAR 2 Low Riff","lead4":"FARFISA Tune 8va","lead5":"VOICE \"Wipe Out\"","chords":"GUITAR 2 Stabs","chords2":"GUITAR 2 Palm-muted","chords3":"FARFISA Chords","bass":"BASS","kick":"KICK","snare":"SNARE","tom":"FLOOR TOM","tom2":"RACK TOM","hats":"HATS","crash2":"RIDE","crash":"CRASH"},
  voice: {"leadVoice":"frppElectricBridge","lead3Voice":"frppPalmMuted","chordsVoice":"frppCleanElectric","chords2Voice":"frppPalmMuted","bassVoice":"frppBassNeck","kickVoice":"kit_breakbeat_kick","snareVoice":"kit_breakbeat_snare","tom2Voice":"kit_breakbeat_tom","hatsVoice":"kit_breakbeat_hats","crashVoice":"kit_breakbeat_crash","crash2Voice":"rideSosTwoPath"},
  voiceParams: {"lead2Voice":{"label":"Electric, bridge pickup · Drop","category":"Lead","synth":"FRPP-6","dur":3,"note":"The bridge-pickup electric in MONO with a glide one sixteenth long at 168: each pick starts at the last pick's pitch and slides to its own, so a tremolo-picked run down the neck is one continuous fall — Dick Dale's drop.","frpp6":{"exciter":{"hardness":0.85},"string":{"decay":4,"damp":0.3,"pickup":"bridge"},"body":{"type":"none","mix":0}},"kind":"tone","level":0.018485,"peak":0.2329,"mode":"mono","portamento":0.0893},"tomVoice":{"label":"Floor Tom","category":"Tom","homeLane":"tom","dur":1.5,"note":"A 16-inch floor tom: the breakbeat kit's rack tom tuned down to 100–80 Hz and let ring, a stick click on top.","osc":{"type":"sine","from":100,"to":80,"sweep":0.09,"decay":0.5,"curve":"exp","gain":1},"osc2":{"type":"triangle","from":170,"to":140,"sweep":0.06,"decay":0.09,"curve":"exp","gain":0.3},"noise":{"type":"lowpass","freq":2200,"Q":0.7,"decay":0.035,"gain":0.4},"drive":0.35,"tone":{"type":"lowpass","freq":9000},"kind":"drum","level":0.076006,"peak":0.8387},"chords3Voice":{"label":"Farfisa · Combo Organ","category":"Organ","synth":"MRDR-3","dur":2,"kind":"tone","note":"A 60s transistor combo organ: square 8′ and 4′ tabs and a thin 2′ saw, through a highpass that takes the body out and leaves the reed; gated like a key, with a fast, shallow vibrato.","layer":{"osc1":{"type":"square","ratio":1,"gain":0.55,"attack":0.004,"decay":0.05,"sustain":1,"release":0.05,"attackCurve":"lin"},"osc2":{"type":"square","ratio":2,"gain":0.3,"attack":0.004,"decay":0.05,"sustain":1,"release":0.05,"attackCurve":"lin"},"osc3":{"type":"sawtooth","ratio":4,"gain":0.08,"attack":0.004,"decay":0.05,"sustain":1,"release":0.04,"attackCurve":"lin"}},"global":{"filter":{"type":"highpass","slope":-12,"freq":420,"Q":0.9,"track":0.5}},"vibrato":{"depth":0.18,"rate":6.5},"level":0.12,"peak":0.8},"lead4Voice":{"label":"Farfisa · Combo Organ","category":"Organ","synth":"MRDR-3","dur":2,"kind":"tone","note":"A 60s transistor combo organ: square 8′ and 4′ tabs and a thin 2′ saw, through a highpass that takes the body out and leaves the reed; gated like a key, with a fast, shallow vibrato.","layer":{"osc1":{"type":"square","ratio":1,"gain":0.55,"attack":0.004,"decay":0.05,"sustain":1,"release":0.05,"attackCurve":"lin"},"osc2":{"type":"square","ratio":2,"gain":0.3,"attack":0.004,"decay":0.05,"sustain":1,"release":0.05,"attackCurve":"lin"},"osc3":{"type":"sawtooth","ratio":4,"gain":0.08,"attack":0.004,"decay":0.05,"sustain":1,"release":0.04,"attackCurve":"lin"}},"global":{"filter":{"type":"highpass","slope":-12,"freq":420,"Q":0.9,"track":0.5}},"vibrato":{"depth":0.18,"rate":6.5},"level":0.12,"peak":0.8},"lead5Voice":{"label":"Announcer: \"wipe out\"","category":"FX","synth":"JMJR-4","dur":2,"note":"Song-local: the jmjrAnnouncer preset saying \"wipe out\".","jmjr4":{"mode":"speak","voice":"announcer","phrase":"wipe out","ending":"fall","perKey":"phrase","pitchFollows":"fixed","speed":0.9,"pitchHz":175,"range":1.4,"press":0.7,"phraseIr":{"source":{"phrase":"wipe out","voice":"announcer","speed":0.9,"pitchHz":175,"range":1.4,"step":0,"ending":"fall","tract":1,"press":0.7,"tilt":0,"breath":0.35,"flutter":0,"sibilance":100,"buzz":40,"resonance":50},"ir":{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":34857,"total_seconds":0.79042,"seed":7,"formants":{"t":[0.03333,0.11167,0.15217,0.28042,0.33167,0.35167,0.42056,0.50389,0.53418,0.62462,0.65487,0.67487,0.77042],"f1":[320,700,700,350,350,200,200,700,700,320,320,200,200],"f2":[800,1200,1200,2100,2100,700,700,1100,1100,800,800,1800,1800],"f3":[2300,2500,2500,2700,2700,2300,2300,2500,2500,2300,2300,2600,2600]},"voicing":{"t":[0,0.012,0.05167,0.07867,0.33667,0.35167,0.44056,0.45722,0.48589,0.65987,0.67487,0.79042,0.79042],"v":[0,0.6,0.6,1,1,0,0,0.55,1,1,0,0,0]},"aspiration":{"t":[0,0.02,0.04667,0.08667,0.33167,0.35167,0.42056,0.42356,0.44056,0.44056,0.47389,0.49389,0.65487,0.67487,0.77042,0.77342,0.79042,0.79042],"v":[0,0,0,0,0,0,0,0.32,0,0,0,0,0,0,0,0.32,0,0]},"voicebar":{"t":[0,0.79042],"v":[0,0]},"nasal_zero":{"t":[0,0.79042],"v":[250,250],"active":false},"pitch":[[0,175],[0.035,175],[0.04,175.98553],[0.065,183.55605],[0.07,184.86283],[0.18,212.95001],[0.185,211.87617],[0.38,162.37878],[0.385,154.13175],[0.49,147.80959],[0.495,147.47975],[0.67,100.42414],[0.675,99.38496],[0.795,99.38496]],"extras":[{"start":18546,"samples":882,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.055,"voiced":false},{"start":33975,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.055,"voiced":false}],"controls":{"src":"glottal","oq":0.7,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"quality":"high","seed":7},"levels":{"vref":0.07588,"asp_gain":2.06743,"bar_gain":0.30627,"extra_gains":[0.0388,0.02187],"derived":"browser tables"}},"words":[{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":25631,"total_seconds":0.58122,"seed":7,"formants":{"t":[0.03333,0.11167,0.18637,0.36592,0.44567,0.46567,0.56122],"f1":[320,700,700,350,350,200,200],"f2":[800,1200,1200,2100,2100,700,700],"f3":[2300,2500,2500,2700,2700,2300,2300]},"voicing":{"t":[0,0.012,0.05167,0.07867,0.45067,0.46567,0.58122,0.58122],"v":[0,0.6,0.6,1,1,0,0,0]},"aspiration":{"t":[0,0.02,0.04667,0.08667,0.44567,0.46567,0.56122,0.56422,0.58122,0.58122],"v":[0,0,0,0,0,0,0,0.32,0,0]},"voicebar":{"t":[0,0.58122],"v":[0,0]},"nasal_zero":{"t":[0,0.58122],"v":[250,250],"active":false},"pitch":[[0,175],[0.035,175],[0.04,175.74799],[0.065,181.46081],[0.07,182.25571],[0.225,202.24833],[0.23,201.41901],[0.285,187.22722],[0.29,184.54503],[0.465,106.79727],[0.47,106.72317],[0.585,106.72317]],"extras":[{"start":24749,"samples":882,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.055,"voiced":false}],"controls":{"src":"glottal","oq":0.7,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"quality":"high","seed":7},"levels":{"vref":0.06813,"asp_gain":2.01317,"bar_gain":0.27498,"extra_gains":[0.03484],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":13959,"total_seconds":0.31653,"seed":7,"formants":{"t":[0.02,0.06029,0.15073,0.18098,0.20098,0.29653],"f1":[700,700,320,320,200,200],"f2":[1100,1100,800,800,1800,1800],"f3":[2500,2500,2300,2300,2600,2600]},"voicing":{"t":[0,0.012,0.18598,0.20098,0.31653,0.31653],"v":[0,1,1,0,0,0]},"aspiration":{"t":[0,0.02,0.18098,0.20098,0.29653,0.29953,0.31653,0.31653],"v":[0,0,0,0,0,0.32,0,0]},"voicebar":{"t":[0,0.31653],"v":[0,0]},"nasal_zero":{"t":[0,0.31653],"v":[250,250],"active":false},"pitch":[[0,175],[0.02,170.82572],[0.025,168.57491],[0.2,99.64892],[0.205,99.59169],[0.32,99.59169]],"extras":[{"start":13077,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.055,"voiced":false}],"controls":{"src":"glottal","oq":0.7,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"quality":"high","seed":7},"levels":{"vref":0.09139,"asp_gain":2.32196,"bar_gain":0.36884,"extra_gains":[0.02634],"derived":"browser tables"}}],"transcript":["wipe: W AY1 P","out: AW1 T"],"unknown":[]}},"id":"jmjrAnnouncer","kind":"tone","factory":true,"level":0.032643,"peak":0.1842}},
  lanes: {
    lead: { pan: -0.05, send: { delay: 0.06, reverb: 0.22 }, eq: { high: 2.5 }, effects: [{ id: "spring", params: { tension: 0.62, damping: 0.25, drip: 0.75, wet: 0.45 } }, { id: "exciter", params: { tune: 2500, drive: 0.5, timbre: 0.4, mix: 0.25 } }] },
    lead2: { pan: -0.05, send: { delay: 0.06, reverb: 0.3 }, eq: { high: 2.5 }, effects: [{ id: "spring", params: { tension: 0.62, damping: 0.25, drip: 0.75, wet: 0.5 } }, { id: "exciter", params: { tune: 2500, drive: 0.5, timbre: 0.4, mix: 0.25 } }] },
    lead3: { gain: -1, pan: 0.3, send: { reverb: 0.12 }, eq: { low: 1, high: 1.5 }, effects: [{ id: "spring", params: { tension: 0.62, damping: 0.25, drip: 0.75, wet: 0.3 } }] },
    lead4: { gain: -4, pan: -0.25, send: { reverb: 0.2 }, eq: { low: -2, high: 1 } },
    lead5: { gain: 13, send: { delay: 0.2, reverb: 0.3 }, eq: { low: -3, high: 3 } },
    chords: { gain: -6, pan: -0.32, send: { reverb: 0.2 }, eq: { high: 2 }, effects: [{ id: "spring", params: { tension: 0.62, damping: 0.25, drip: 0.75, wet: 0.35 } }], noteFx: {"strum":{"enabled":true,"direction":"down","gapMs":9}} },
    chords2: { gain: -5, pan: 0.3, send: { reverb: 0.08 }, eq: { low: 1, high: 1.5 }, effects: [{ id: "spring", params: { tension: 0.62, damping: 0.25, drip: 0.75, wet: 0.2 } }], noteFx: {"strum":{"enabled":true,"direction":"down","gapMs":4}} },
    chords3: { gain: -6.5, pan: -0.2, send: { reverb: 0.22 }, eq: { low: -2, high: 1 } },
    bass: { gain: -2.5, send: { reverb: 0.03 }, eq: { low: 2.5, high: 1 } },
    kick: { gain: -1.5, eq: { low: 2 } },
    snare: { gain: 5, pan: 0.05, send: { reverb: 0.22 }, eq: { low: 1.5, high: 3 } },
    tom: { gain: -7, pan: 0.18, send: { reverb: 0.25 }, eq: { low: 1.5 } },
    tom2: { gain: -7, pan: -0.15, send: { reverb: 0.25 } },
    hats: { gain: -8, pan: 0.25, eq: { high: 2 } },
    crash: { gain: -9, pan: -0.2, send: { reverb: 0.4 } },
    crash2: { gain: -12, pan: 0.25, send: { reverb: 0.15 } },
  },
};

export const arrangement = {
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29],
  loop: {
    fromBar: 5,
    toBar: 60,
  },
};

export const variants = {
  select: [
    {
      when: "always",
      loop: { fromBar: 1, toBar: 4 },
      patch: {
        fx: { reverb: { level: 1.3 } },
      },
      exit: { quantize: "bar", crossfadeBars: 0, loopRelease: "atTransition" },
    },
  ],
};

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
