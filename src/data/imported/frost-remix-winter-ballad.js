// FROST FORTRESS — WINTER BALLAD — one song: what it plays, how it is arranged, how it sounds.
//
// FROST FORTRESS as Celtic chamber-folk: a winter ballad that builds into a reel — a
// fireside session in a snowbound castle. A game alternate of frost, selectable from the
// dev menu (GAME ALTERNATES) and on the desk. Nothing replaces the live song.
// 
// Every pitched part is FRPP-6: a DADGAD guitar (nylon picked, steel strummed), a bowed
// fiddle, a concert harp, a mandolin, a cello and a string section; the bodhrán is three
// song-local drum strips (boom, tipper, ghosts). One tempo, 112: the air is the theme at
// half speed, the reel the theme's eighths with sixteenths between, as a fiddler fills them.
// 
// The theme, as frost.js plays it: D5 F5 A5 F5 D5 . C5 E5 over the D dorian vamp Dm | G,
// the bass walking D A B F | G D G A, a major-third lift to F# minor. All three are kept:
// the tune note for note on the eighths of every reel bar, the vamp and the theme's bass
// line under the tune and the reel, and the lift as the reel's B part.
// 
//   1–4    intro — the DADGAD nylon guitar alone on Dm | G, the cello, the harp's chimes;
//          the harp's C E pickup (the cabinet-screen loop)
//   5–12   THE AIR — the FIDDLE on the theme at half speed, | Dm | G Am | Dm | G C |, then
//          its answer a third up over | Dm7 | F C | Dm | G Am |; picked guitar, cello roots;
//          at the answer the harp rolls the chords, the mandolin tremolos a guide-tone
//          line, the bodhrán's heartbeat
//   13–16  THE TUNE — the HARP on the theme at its own pace over the theme's own bass line
//          (cello, a beat each), a fiddle descant; the guitar rolls sixteenths then strums;
//          the bodhrán finds the pulse; a beat's break and the fiddle runs into the reel
//   17–24  THE REEL — the fiddle on the reel, the mandolin in unison from 21; steel DADGAD
//          strum in eighths, harp chords on one and three, the cello driving, the bodhrán's
//          reel; a beat's break and the fiddle climbs into F#
//   25–28  THE LIFT — frost's major third, F# dorian: the reel up, the STRING SECTION
//          swelling under it; a beat's break and the fiddle runs home, C# into D
//   29–36  THE CLIMAX — both speeds at once: the reel on fiddle and mandolin, the string
//          section singing the AIR under it; harp and cello in eighths
//   37–44  THE RETURN — the fiddle on the air once more, strings and harp under it, the
//          heartbeat fading; then the HARP has the answer alone over the mandolin's tremolo
//   45–48  coda — the intro again, its pickup back into the air (the loop is 5–48)
// 
// Mix, measured (solo LUFS against the fiddle, _remix-bounce --lanes --range): in the
// reel the mandolin and the strings' air 4–5 dB under, the strum 5, the cello 3, the
// bodhrán boom 2, its tipper 9, ghosts 15, shaker 17; a sine sub an octave under the cello
// (13–36) for the floor. Bar gains in the arrangement where one fader cannot do two jobs:
// the held ballad cello −8, the fiddle's descant −5 and the guitar's rolling sixteenths
// −4 under the harp's tune (13–16), the lift's fretted strum +3, the harp's lone air +3.
// Glides short (Peter, 25 Oct): air fiddle 30 ms, reel fiddle 20 ms, the cello poly (none).
// Trailing master gain 0 dB: −21.0 LUFS integrated, peak −5 dBFS.
// 
// Sleigh carol kept (frost-3): it takes its key from the first bass note of the section
// it lands in, so every bar pair's cello starts on the tonic — D, and F# in the lift.
// The generator asserts it, with chord tones on the strong beats, no semitone clash
// between sounding parts, one note a string on the DADGAD guitars, the strum's
// down/up parity, and a clean loop seam (bar 48 is bar 4).
// 
// 48 bars at 112, 103 s. Written by work/local/_frost-remix-winter-ballad.mjs
// through work/local/_remix-lib.mjs; re-running it rewrites this file.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "frost-remix-winter-ballad";
export const title = "FROST FORTRESS — WINTER BALLAD";
export const slug = "frost-remix-winter-ballad";
export const group = "alternate";
export const alternateOf = "frost";

export const bank = {
  bpm: 112,
  musicTrim: 0.93,
  chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  leadHarm: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  tom4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  tom: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  tom3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  bass2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords2: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  chords4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  lead3: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
  lead4: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  sections: [
    {
      chords: seq('D2 . . . A3 . D4 . F3 . . . G3 . A3 . | G2 . . . A3 . D4 . D3 . . . G3 . A3 .'),
      chordsLen: [16,null,null,null,10,null,10,null,8,null,null,null,4,null,2,null,16,null,null,null,10,null,10,null,8,null,null,null,4,null,2,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | G2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . A5 . . . D6 . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      chords: seq('D2 . . . A3 . D4 . F3 . . . G3 . A3 . | G2 . . . A3 . D4 . D3 . . . G3 . A3 .'),
      chordsLen: [16,null,null,null,10,null,10,null,8,null,null,null,4,null,2,null,16,null,null,null,10,null,10,null,8,null,null,null,4,null,2,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | G2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C5 . E5 .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,2,null],
    },
    {
      chords: seq('D2 . F3 . A3 . D4 . G3 . A3 . F3 . A3 . | G2 . D3 . A3 . D4 . A2 . C4 . E3 . C4 .'),
      chordsLen: [16,null,10,null,6,null,10,null,8,null,4,null,4,null,2,null,8,null,6,null,4,null,2,null,8,null,4,null,4,null,2,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | G2 . . . . . . . A2 . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      chords: seq('D2 . F3 . A3 . D4 . G3 . A3 . F3 . A3 . | G2 . D3 . A3 . D4 . C3 . C4 . E3 . C4 .'),
      chordsLen: [16,null,10,null,6,null,10,null,8,null,4,null,4,null,2,null,8,null,6,null,4,null,2,null,8,null,4,null,4,null,2,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | G2 . . . . . . . C2 . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . E5 D5 C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,1,1,4,null,null,null,4,null,null,null],
    },
    {
      chords: seq('D2 . A2 . C4 . D4 . F3 . C4 . A2 . C4 . | F2 . C3 . A3 . F4 . C3 . C4 . E3 . C4 .'),
      chordsLen: [16,null,10,null,6,null,10,null,8,null,4,null,4,null,2,null,8,null,6,null,4,null,2,null,8,null,4,null,4,null,2,null],
      bass: seq('D2 . . . . . . . F2 . . . . . . . | F2 . . . . . . . C2 . . . . . . .'),
      bassLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead: seq('F5 . . . A5 . . . C6 . . . A5 . . . | F5 . . . . . . . E5 . . . G5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords3: [[146.8323839587038,220,261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,220,261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null,[174.61411571650194,261.6255653005986,349.2282314330039,440],null,null,null,null,null,null,null,[130.8127826502993,195.99771799087463,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chords3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadHarm: seq('C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 | A4 A4 A4 A4 A4 A4 A4 A4 G4 G4 G4 G4 G4 G4 G4 G4'),
      leadHarmLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      tom4: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
    },
    {
      chords: seq('D2 . F3 . A3 . D4 . G3 . A3 . F3 . A3 . | G2 . D3 . A3 . D4 . A2 . C4 . E3 . C4 .'),
      chordsLen: [16,null,10,null,6,null,10,null,8,null,4,null,4,null,2,null,8,null,6,null,4,null,2,null,8,null,4,null,4,null,2,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | G2 . . . . . . . A2 . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords3: [[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,null,null,null,null,null],
      chords3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadHarm: seq('A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 | B4 B4 B4 B4 B4 B4 B4 B4 C5 C5 C5 C5 C5 C5 C5 C5'),
      leadHarmLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      tom4: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
    },
    {
      chords: seq('D2 F3 G3 A3 D4 A3 G3 F3 A2 F3 G3 A3 D4 A3 G3 F3 | G2 D3 G3 A3 D4 A3 G3 D3 G2 D3 G3 A3 D4 A3 G3 D3'),
      chordsLen: [16,6,4,2,8,6,4,2,8,6,4,2,4,3,2,1,8,6,4,2,8,6,4,2,8,6,4,2,4,3,2,1],
      bass: seq('D2 . . . A2 . . . B2 . . . F2 . . . | G2 . . . D2 . . . G2 . . . A2 . . .'),
      bassLen: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      lead: seq('A5 . . . . . . . . . . . . . . . | G5 . . . . . . . . . . . . . . .'),
      leadLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . F5 . A5 . F5 . D5 . . . C5 . E5 .'),
      lead2Len: [2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null],
      tom: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . . . . .').map((v) => !!v),
      tom2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      tom3: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      bass2: seq('D1 . . . A1 . . . B1 . . . F1 . . . | G1 . . . D1 . . . G1 . . . A1 . . .'),
      bass2Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
    },
    {
      bass: seq('D2 . . . A2 . . . B2 . . . F2 . . . | G2 . . . D2 . . . G2 . . . . . . .'),
      bassLen: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null],
      lead: seq('A5 . . . . . . . D6 . . . . . . . | B5 . . . . . . . . . . . . . . .'),
      leadLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 . | D5 . F5 . A5 . F5 . D5 . . . . . . .'),
      lead2Len: [2,null,2,null,2,null,2,null,2,null,null,null,2,null,2,null,2,null,2,null,2,null,2,null,4,null,null,null,null,null,null,null],
      tom: seq('C1 . . . . . . . C1 . . . . . . . | C1 . . . . . . . C1 . . . C1 . C1 .').map((v) => !!v),
      tom2: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . C1 . C1 . C1 C1 C1 C1 C1 C1').map((v) => !!v),
      tom3: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . . . . . . .').map((v) => !!v),
      bass2: seq('D1 . . . A1 . . . B1 . . . F1 . . . | G1 . . . D1 . . . G1 . . . . . . .'),
      bass2Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null],
      chords2: [[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,null,null,null,null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,null,null,null,null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,null,null,null,null],
      chords2Len: [8,null,null,null,null,null,2,null,8,null,null,null,null,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,null,null,null,null],
      chords4: [[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . G4 A4 B4 C5'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,1,1,1],
    },
    {
      bass: seq('D2 . . . A2 . . . B2 . . . F2 . . . | G2 . . . D2 . . . G2 . . . A2 . . .'),
      bassLen: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      chords3: [[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null],
      chords3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      tom: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
      tom3: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      bass2: seq('D1 . . . A1 . . . B1 . . . F1 . . . | G1 . . . D1 . . . G1 . . . A1 . . .'),
      bass2Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      chords2: [[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null],
      chords2Len: [4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null],
      lead5: seq('D5 A4 F5 A4 A5 A4 F5 A4 D5 E5 F5 D5 C5 D5 E5 C5 | D5 E5 F5 G5 A5 G5 F5 E5 D5 B4 G4 B4 C5 D5 E5 C5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    },
    {
      bass: seq('D2 . . . A2 . . . B2 . . . F2 . . . | G2 . . . D2 . . . G2 . . . A2 . . .'),
      bassLen: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      chords3: [[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null],
      chords3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      tom: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      tom3: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . . . .').map((v) => !!v),
      bass2: seq('D1 . . . A1 . . . B1 . . . F1 . . . | G1 . . . D1 . . . G1 . . . A1 . . .'),
      bass2Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      chords2: [[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,null,null,null,null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null],
      chords2Len: [4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,8,null,null,null,null,null,2,null,4,null,2,null],
      lead5: seq('D5 C5 F5 D5 A5 D5 F5 A5 D6 A5 F5 D5 C5 A4 E5 G5 | D5 G4 F5 G4 A5 G4 F5 G4 D5 G4 B4 G4 C5 D5 E5 C5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    },
    {
      bass: seq('D2 . . . A2 . . . B2 . . . F2 . . . | G2 . . . D2 . . . G2 . . . A2 . . .'),
      bassLen: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      chords3: [[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null],
      chords3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      tom: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
      tom3: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      bass2: seq('D1 . . . A1 . . . B1 . . . F1 . . . | G1 . . . D1 . . . G1 . . . A1 . . .'),
      bass2Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      chords2: [[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null],
      chords2Len: [4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null],
      lead5: seq('D5 A4 F5 A4 A5 A4 F5 A4 D5 E5 F5 D5 C5 D5 E5 C5 | D5 E5 F5 G5 A5 G5 F5 E5 D5 B4 G4 B4 C5 D5 E5 C5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('D5 A4 F5 A4 A5 A4 F5 A4 D5 E5 F5 D5 C5 D5 E5 C5 | D5 E5 F5 G5 A5 G5 F5 E5 D5 B4 G4 B4 C5 D5 E5 C5'),
      lead3Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      bass: seq('D2 . . . A2 . . . B2 . . . F2 . . . | G2 . . . D2 . . . G2 . . . . . . .'),
      bassLen: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null],
      chords3: [[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null],
      chords3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      tom: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      tom3: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . . . .').map((v) => !!v),
      bass2: seq('D1 . . . A1 . . . B1 . . . F1 . . . | G1 . . . D1 . . . G1 . . . . . . .'),
      bass2Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null],
      chords2: [[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,null,null,null,null],
      chords2Len: [4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,null,null,null,null],
      lead5: seq('D5 C5 F5 D5 A5 D5 F5 A5 D6 A5 F5 D5 C5 A4 E5 G5 | D5 E5 F5 G5 A5 G5 F5 E5 D5 B4 G4 A4 B4 C#5 D#5 E5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('D5 C5 F5 D5 A5 D5 F5 A5 D6 A5 F5 D5 C5 A4 E5 G5 | D5 E5 F5 G5 A5 G5 F5 E5 D5 B4 G4 A4 B4 C#5 D#5 E5'),
      lead3Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      bass: seq('F#2 . . . C#3 . . . D#2 . . . A2 . . . | B2 . . . F#2 . . . B2 . . . C#3 . . .'),
      bassLen: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      chords3: [[184.9972113558172,277.1826309768721,369.9944227116344,440,554.3652619537442],null,null,null,null,null,null,null,[184.9972113558172,277.1826309768721,369.9944227116344,440,554.3652619537442],null,null,null,null,null,null,null,[123.47082531403103,184.9972113558172,246.94165062806206,277.1826309768721,369.9944227116344],null,null,null,null,null,null,null,[123.47082531403103,184.9972113558172,246.94165062806206,277.1826309768721,369.9944227116344],null,null,null,null,null,null,null],
      chords3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      tom: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
      tom3: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      bass2: seq('F#1 . . . C#2 . . . D#1 . . . A1 . . . | B1 . . . F#1 . . . B1 . . . C#2 . . .'),
      bass2Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null],
      chords2: [[92.4986056779086,138.59131548843604,184.9972113558172,220,369.9944227116344],null,[138.59131548843604,184.9972113558172,220,369.9944227116344],null,[92.4986056779086,138.59131548843604,184.9972113558172,220,369.9944227116344],null,[138.59131548843604,184.9972113558172,220,369.9944227116344],null,[92.4986056779086,138.59131548843604,184.9972113558172,220,369.9944227116344],null,[138.59131548843604,184.9972113558172,220,369.9944227116344],null,[92.4986056779086,138.59131548843604,184.9972113558172,220,369.9944227116344],null,[138.59131548843604,184.9972113558172,220,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null],
      chords2Len: [4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null],
      chords4: [[184.9972113558172,277.1826309768721,369.9944227116344,440,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[184.9972113558172,246.94165062806206,277.1826309768721,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('F#5 C#5 A5 C#5 C#6 C#5 A5 C#5 F#5 G#5 A5 F#5 E5 F#5 G#5 E5 | F#5 G#5 A5 B5 C#6 B5 A5 G#5 F#5 D#5 B4 D#5 E5 F#5 G#5 E5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('F#5 C#5 A5 C#5 C#6 C#5 A5 C#5 F#5 G#5 A5 F#5 E5 F#5 G#5 E5 | F#5 G#5 A5 B5 C#6 B5 A5 G#5 F#5 D#5 B4 D#5 E5 F#5 G#5 E5'),
      lead3Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      bass: seq('F#2 . . . C#3 . . . D#2 . . . A2 . . . | B2 . . . F#2 . . . B2 . . . . . . .'),
      bassLen: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null],
      chords3: [[184.9972113558172,277.1826309768721,369.9944227116344,440,554.3652619537442],null,null,null,null,null,null,null,[184.9972113558172,277.1826309768721,369.9944227116344,440,554.3652619537442],null,null,null,null,null,null,null,[123.47082531403103,184.9972113558172,246.94165062806206,277.1826309768721,369.9944227116344],null,null,null,null,null,null,null,[123.47082531403103,184.9972113558172,246.94165062806206,277.1826309768721,369.9944227116344],null,null,null,null,null,null,null],
      chords3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,null,null,null,null],
      tom: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      tom3: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . . . .').map((v) => !!v),
      bass2: seq('F#1 . . . C#2 . . . D#1 . . . A1 . . . | B1 . . . F#1 . . . B1 . . . . . . .'),
      bass2Len: [3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,3,null,null,null,null,null,null,null],
      chords2: [[92.4986056779086,138.59131548843604,184.9972113558172,220,369.9944227116344],null,[138.59131548843604,184.9972113558172,220,369.9944227116344],null,[92.4986056779086,138.59131548843604,184.9972113558172,220,369.9944227116344],null,[138.59131548843604,184.9972113558172,220,369.9944227116344],null,[92.4986056779086,138.59131548843604,184.9972113558172,220,369.9944227116344],null,[138.59131548843604,184.9972113558172,220,369.9944227116344],null,[92.4986056779086,138.59131548843604,184.9972113558172,220,369.9944227116344],null,[138.59131548843604,184.9972113558172,220,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,[123.47082531403103,184.9972113558172,277.1826309768721,369.9944227116344],null,null,null,null,null],
      chords2Len: [4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,null,null,null,null],
      chords4: [[184.9972113558172,277.1826309768721,369.9944227116344,440,554.3652619537442],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[184.9972113558172,246.94165062806206,277.1826309768721,369.9944227116344,493.8833012561241],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      chords4Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,12,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('F#5 C#5 A5 C#5 C#6 C#5 A5 C#5 F#5 G#5 A5 F#5 E5 F#5 G#5 E5 | F#5 G#5 A5 B5 C#6 B5 A5 G#5 F#5 C#5 A4 F#4 G#4 A4 B4 C#5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('F#5 C#5 A5 C#5 C#6 C#5 A5 C#5 F#5 G#5 A5 F#5 E5 F#5 G#5 E5 | F#5 G#5 A5 B5 C#6 B5 A5 G#5 F#5 C#5 A4 F#4 G#4 A4 B4 C#5'),
      lead3Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
    },
    {
      bass: seq('D2 . D2 . A2 . A2 . B2 . B2 . F2 . F2 . | G2 . G2 . D2 . D2 . G2 . G2 . A2 . A2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords3: seq('D3 . A3 . D4 . F4 . A4 . F4 . D4 . A3 . | D3 . G3 . D4 . G4 . A4 . G4 . D4 . G3 .'),
      chords3Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      tom: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
      tom3: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      bass2: seq('D1 . D1 . A1 . A1 . B1 . B1 . F1 . F1 . | G1 . G1 . D1 . D1 . G1 . G1 . A1 . A1 .'),
      bass2Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords2: [[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null],
      chords2Len: [4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null],
      lead5: seq('D5 A4 F5 A4 A5 A4 F5 A4 D5 E5 F5 D5 C5 D5 E5 C5 | D5 E5 F5 G5 A5 G5 F5 E5 D5 B4 G4 B4 C5 D5 E5 C5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('D5 A4 F5 A4 A5 A4 F5 A4 D5 E5 F5 D5 C5 D5 E5 C5 | D5 E5 F5 G5 A5 G5 F5 E5 D5 B4 G4 B4 C5 D5 E5 C5'),
      lead3Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead4: seq('D4 . . . F4 . . . A4 . . . F4 . . . | D4 . . . . . . . C4 . . . E4 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      bass: seq('D2 . D2 . A2 . A2 . B2 . B2 . F2 . F2 . | G2 . G2 . D2 . D2 . G2 . G2 . A2 . A2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords3: seq('D3 . A3 . D4 . F4 . A4 . F4 . D4 . A3 . | D3 . G3 . D4 . G4 . A4 . G4 . D4 . G3 .'),
      chords3Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      tom: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . C1 C1 C1 C1').map((v) => !!v),
      tom3: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . . . .').map((v) => !!v),
      bass2: seq('D1 . D1 . A1 . A1 . B1 . B1 . F1 . F1 . | G1 . G1 . D1 . D1 . G1 . G1 . A1 . A1 .'),
      bass2Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords2: [[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,null,null,null,null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null],
      chords2Len: [4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,8,null,null,null,null,null,2,null,4,null,2,null],
      lead5: seq('D5 C5 F5 D5 A5 D5 F5 A5 D6 A5 F5 D5 C5 A4 E5 G5 | D5 G4 F5 G4 A5 G4 F5 G4 D5 G4 B4 G4 C5 D5 E5 C5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('D5 C5 F5 D5 A5 D5 F5 A5 D6 A5 F5 D5 C5 A4 E5 G5 | D5 G4 F5 G4 A5 G4 F5 G4 D5 G4 B4 G4 C5 D5 E5 C5'),
      lead3Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead4: seq('D4 . . . F4 . . . A4 . . . F4 . . . | D4 . . . . . . . C4 . . . E4 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      bass: seq('D2 . D2 . A2 . A2 . B2 . B2 . F2 . F2 . | G2 . G2 . D2 . D2 . G2 . G2 . A2 . A2 .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords3: seq('D3 . A3 . D4 . F4 . A4 . F4 . D4 . A3 . | D3 . G3 . D4 . G4 . A4 . G4 . D4 . G3 .'),
      chords3Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      tom: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
      tom2: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . C1 . . .').map((v) => !!v),
      tom3: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1').map((v) => !!v),
      bass2: seq('D1 . D1 . A1 . A1 . B1 . B1 . F1 . F1 . | G1 . G1 . D1 . D1 . G1 . G1 . A1 . A1 .'),
      bass2Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null],
      chords2: [[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null],
      chords2Len: [4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null],
      lead5: seq('D5 A4 F5 A4 A5 A4 F5 A4 D5 E5 F5 D5 C5 D5 E5 C5 | D5 E5 F5 G5 A5 G5 F5 E5 D5 B4 G4 B4 C5 D5 E5 C5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('D5 A4 F5 A4 A5 A4 F5 A4 D5 E5 F5 D5 C5 D5 E5 C5 | D5 E5 F5 G5 A5 G5 F5 E5 D5 B4 G4 B4 C5 D5 E5 C5'),
      lead3Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead4: seq('D4 . . . F4 . . . A4 . . . F4 . . . | D4 . . . . . . . C4 . . . E4 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      bass: seq('D2 . D2 . A2 . A2 . B2 . B2 . F2 . F2 . | G2 . G2 . D2 . D2 . G2 . G2 . . . . .'),
      bassLen: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null],
      chords3: seq('D3 . A3 . D4 . F4 . A4 . F4 . D4 . A3 . | D3 . G3 . D4 . G4 . A4 . G4 . . . . .'),
      chords3Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null],
      tom: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . C1 . . .').map((v) => !!v),
      tom2: seq('. . C1 . C1 . . . . . C1 . C1 . . . | . . C1 . C1 . . . . . C1 . . . . .').map((v) => !!v),
      tom3: seq('. C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 | . C1 . C1 . C1 . C1 . C1 . . . . . .').map((v) => !!v),
      bass2: seq('D1 . D1 . A1 . A1 . B1 . B1 . F1 . F1 . | G1 . G1 . D1 . D1 . G1 . G1 . . . . .'),
      bass2Len: [2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,2,null,null,null,null,null],
      chords2: [[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[73.41619197935188,110,174.61411571650194,195.99771799087463,220,293.6647679174076],null,[174.61411571650194,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,[97.99885899543733,146.8323839587038,195.99771799087463,220,293.6647679174076],null,[146.8323839587038,195.99771799087463,220,293.6647679174076],null,null,null,null,null],
      chords2Len: [4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,4,null,2,null,null,null,null,null],
      lead5: seq('D5 C5 F5 D5 A5 D5 F5 A5 D6 A5 F5 D5 C5 A4 E5 G5 | D5 E5 F5 G5 A5 G5 F5 E5 D5 C5 B4 A4 G4 A4 B4 C5'),
      lead5Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead3: seq('D5 C5 F5 D5 A5 D5 F5 A5 D6 A5 F5 D5 C5 A4 E5 G5 | D5 E5 F5 G5 A5 G5 F5 E5 D5 C5 B4 A4 G4 A4 B4 C5'),
      lead3Len: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      rim: seq('C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 | C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      lead4: seq('D4 . . . F4 . . . A4 . . . F4 . . . | D4 . . . . . . . C4 . . . E4 . . .'),
      lead4Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      chords: seq('D2 . F3 . A3 . D4 . G3 . A3 . F3 . A3 . | G2 . D3 . A3 . D4 . A2 . C4 . E3 . C4 .'),
      chordsLen: [16,null,10,null,6,null,10,null,8,null,4,null,4,null,2,null,8,null,6,null,4,null,2,null,8,null,4,null,4,null,2,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | G2 . . . . . . . A2 . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
      chords3: [[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null,[220,261.6255653005986,329.6275569128699,391.99543598174927,440],null,null,null,null,null,null,null],
      chords3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      tom4: seq('C1 . . . . . . . . . C1 . . . . . | C1 . . . . . . . . . C1 . . . . .').map((v) => !!v),
      chords4: [[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null,[164.81377845643496,220,261.6255653005986,329.6275569128699,440],null,null,null,null,null,null,null],
      chords4Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      chords: seq('D2 . F3 . A3 . D4 . G3 . A3 . F3 . A3 . | G2 . D3 . A3 . D4 . C3 . C4 . E3 . C4 .'),
      chordsLen: [16,null,10,null,6,null,10,null,8,null,4,null,4,null,2,null,8,null,6,null,4,null,2,null,8,null,4,null,4,null,2,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | G2 . . . . . . . C2 . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . E5 D5 C5 . . . E5 . . .'),
      leadLen: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,6,null,null,null,null,null,1,1,4,null,null,null,4,null,null,null],
      chords3: [[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null,[130.8127826502993,195.99771799087463,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chords3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      chords4: [[146.8323839587038,220,293.6647679174076,349.2282314330039,440],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[146.8323839587038,195.99771799087463,293.6647679174076,391.99543598174927,440],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,261.6255653005986,329.6275569128699,391.99543598174927],null,null,null,null,null,null,null],
      chords4Len: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      chords: seq('D2 . A2 . C4 . D4 . F3 . C4 . A2 . C4 . | F2 . C3 . A3 . F4 . C3 . C4 . E3 . C4 .'),
      chordsLen: [16,null,10,null,6,null,10,null,8,null,4,null,4,null,2,null,8,null,6,null,4,null,2,null,8,null,4,null,4,null,2,null],
      bass: seq('D2 . . . . . . . F2 . . . . . . . | F2 . . . . . . . C2 . . . . . . .'),
      bassLen: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadHarm: seq('C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 C5 | A4 A4 A4 A4 A4 A4 A4 A4 G4 G4 G4 G4 G4 G4 G4 G4'),
      leadHarmLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('F5 . . . A5 . . . C6 . . . A5 . . . | F5 . . . . . . . E5 . . . G5 . . .'),
      lead2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      chords: seq('D2 . F3 . A3 . D4 . G3 . A3 . F3 . A3 . | G2 . D3 . A3 . D4 . A2 . C4 . E3 . C4 .'),
      chordsLen: [16,null,10,null,6,null,10,null,8,null,4,null,4,null,2,null,8,null,6,null,4,null,2,null,8,null,4,null,4,null,2,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | G2 . . . . . . . A2 . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadHarm: seq('A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 | B4 B4 B4 B4 B4 B4 B4 B4 C5 C5 C5 C5 C5 C5 C5 C5'),
      leadHarmLen: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      lead2: seq('D5 . . . F5 . . . A5 . . . F5 . . . | D5 . . . . . . . C5 . . . E5 . . .'),
      lead2Len: [4,null,null,null,4,null,null,null,4,null,null,null,4,null,null,null,8,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      chords: seq('D2 . . . A3 . D4 . F3 . . . G3 . A3 . | G2 . . . A3 . D4 . D3 . . . G3 . A3 .'),
      chordsLen: [16,null,null,null,10,null,10,null,8,null,null,null,4,null,2,null,16,null,null,null,10,null,10,null,8,null,null,null,4,null,2,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | G2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . A5 . . . D6 . . .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,4,null,null,null,4,null,null,null],
    },
    {
      chords: seq('D2 . . . A3 . D4 . F3 . . . G3 . A3 . | G2 . . . A3 . D4 . D3 . . . G3 . A3 .'),
      chordsLen: [16,null,null,null,10,null,10,null,8,null,null,null,4,null,2,null,16,null,null,null,10,null,10,null,8,null,null,null,4,null,2,null],
      bass: seq('D2 . . . . . . . . . . . . . . . | G2 . . . . . . . . . . . . . . .'),
      bassLen: [16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C5 . E5 .'),
      twinkleLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,null,2,null],
    },
  ],
  order: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 3, "low.attack": 0.06, "low.release": 0.25, "low.knee": 10, "mid.threshold": -22, "mid.ratio": 2.5, "mid.attack": 0.02, "mid.release": 0.12, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2, "high.attack": 0.01, "high.release": 0.08, "high.knee": 10 } }, { id: "gain", params: { gain: 0 } }],
  layers: [{ key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "chords2", from: "chords", independent: true }, { key: "chords3", from: "chords", independent: true }, { key: "chords4", from: "chords", independent: true }, { key: "bass2", from: "bass", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "tom3", from: "tom", independent: true }, { key: "tom4", from: "tom", independent: true }],
  order: ["tom","tom2","tom3","tom4","rim","bass","bass2","chords","chords2","chords3","chords4","lead","lead5","lead2","lead3","leadHarm","lead4","twinkle"],
  labels: {"lead":"FIDDLE The Air","lead5":"FIDDLE The Reel","lead2":"HARP Tune","lead3":"MANDOLIN Unison","leadHarm":"MANDOLIN Tremolo","lead4":"STRINGS The Air","twinkle":"HARP Chimes","chords":"GUITAR DADGAD Picked","chords2":"GUITAR DADGAD Strum","chords3":"HARP Chords","chords4":"STRINGS Swell","bass":"CELLO","bass2":"SUB Under the Cello","tom":"BODHRÁN Boom","tom2":"BODHRÁN Tipper","tom3":"BODHRÁN Ghosts","tom4":"BODHRÁN Heartbeat","rim":"SHAKER"},
  voice: {"lead2Voice":"frppHarpShimmer","lead3Voice":"frppMandolin","leadHarmVoice":"frppMandolin","lead4Voice":"frppStringSection","twinkleVoice":"frppHarpShimmer","chords4Voice":"frppStringSection","bass2Voice":"toneSine","rimVoice":"shaker"},
  voiceParams: {"leadVoice":{"label":"Bowed Violin · Air","category":"Orch","synth":"FRPP-6","dur":3,"note":"A bowed violin: the bow drives the string for as long as the key is down, a delayed vibrato, legato slides between notes, and a small bright box. Song-local: the glide cut to 30 ms.","mode":"legato","portamento":0.03,"vibrato":{"depth":0.2,"rate":5.5,"delay":0.3},"frpp6":{"exciter":{"type":"bow","pressure":0.55,"speed":0.6,"noise":0.12,"position":0.12},"string":{"decay":0.6,"damp":0.5},"amp":{"attack":0.08,"release":0.15},"strings":{"tuning":"free","tension":0},"body":{"type":"violin","mix":0.7}},"kind":"tone","level":0.016847,"peak":0.1645},"lead5Voice":{"label":"Bowed Violin · Reel","category":"Orch","synth":"FRPP-6","dur":3,"note":"A bowed violin: the bow drives the string for as long as the key is down, a delayed vibrato, legato slides between notes, and a small bright box. Song-local: a 25 ms bow and a 20 ms glide, so sixteenths speak.","mode":"legato","portamento":0.02,"vibrato":{"depth":0.2,"rate":5.5,"delay":0.3},"frpp6":{"exciter":{"type":"bow","pressure":0.55,"speed":0.6,"noise":0.12,"position":0.12},"string":{"decay":0.6,"damp":0.5},"amp":{"attack":0.025,"release":0.08},"strings":{"tuning":"free","tension":0},"body":{"type":"violin","mix":0.7}},"kind":"tone","level":0.016847,"peak":0.1645},"bassVoice":{"label":"Bowed Cello · Bass","category":"Orch","synth":"FRPP-6","dur":3,"note":"A bowed cello: slower bow, a deep box, and the same legato and vibrato as the violin. Song-local: played poly, so every bass note is bowed clean, with no slide.","mode":"poly","vibrato":{"depth":0.18,"rate":5,"delay":0.35},"frpp6":{"exciter":{"type":"bow","pressure":0.6,"speed":0.45,"noise":0.15,"position":0.1},"string":{"decay":0.8,"damp":0.4},"amp":{"attack":0.12,"release":0.2},"strings":{"tuning":"free","tension":0},"body":{"type":"cello","mix":0.75}},"kind":"tone","level":0.008561,"peak":0.0955},"chordsVoice":{"label":"Nylon classical · DADGAD","category":"Pluck","synth":"FRPP-6","dur":3,"note":"A classical guitar under the fingertip: a soft, round pluck on nylon strings, darker at the top and warmer in the box. Song-local: tuned DADGAD.","frpp6":{"exciter":{"hardness":0.25,"position":0.15,"mix":0.1},"string":{"decay":3,"damp":0.15,"stiffness":0.05},"body":{"type":"nylon","mix":0.85},"strings":{"tuning":"dadgad"}},"kind":"tone","level":0.040023,"peak":0.4389},"chords2Voice":{"label":"Steel acoustic · DADGAD","category":"Pluck","synth":"FRPP-6","dur":3,"note":"A steel-string dreadnought, picked: a waveguide string with the box folded into the pluck, so every note rings through twenty-one body resonances. Song-local: tuned DADGAD.","frpp6":{"strings":{"tuning":"dadgad"}},"kind":"tone","level":0.019166,"peak":0.2991},"chords3Voice":{"label":"Concert Harp · Damped","category":"Pluck","synth":"FRPP-6","dur":4,"note":"A concert harp: soft fingers, free strings and a soundboard, ringing on after each note is let go. Song-local: a 1.2 s release, so a chord is damped at the next.","frpp6":{"exciter":{"hardness":0.3,"position":0.3,"mix":0},"string":{"decay":5,"damp":0.25,"stiffness":0.1,"detune":0},"amp":{"release":1.2},"body":{"type":"harp","mix":0.8},"strings":{"tuning":"free","tension":3}},"kind":"tone","level":0.028807,"peak":0.3246},"tomVoice":{"label":"Bodhrán · Boom","category":"Perc","homeLane":"tom","kind":"drum","dur":1,"note":"A bodhrán's open stroke: the tipper's head on goatskin near the rim, a warm thump falling 120 to 78 Hz with the skin's overtone over it.","osc":{"type":"sine","from":120,"to":78,"sweep":0.04,"attack":0.002,"decay":0.32,"curve":"exp","gain":1},"osc2":{"type":"triangle","from":235,"to":195,"sweep":0.03,"attack":0.001,"decay":0.08,"curve":"exp","gain":0.22},"noise":{"type":"lowpass","freq":1400,"Q":0.7,"color":"pink","attack":0.001,"decay":0.03,"gain":0.35},"drive":0.1,"humanize":{"gain":0.05},"level":0.034,"peak":0.7},"tom2Voice":{"label":"Bodhrán · Tipper","category":"Perc","homeLane":"tom","kind":"drum","dur":1,"note":"The top end: the hand pressing the skin from behind, so the stroke is higher, shorter and drier.","osc":{"type":"triangle","from":265,"to":210,"sweep":0.02,"attack":0.001,"decay":0.07,"curve":"exp","gain":0.7},"noise":{"type":"bandpass","freq":1800,"Q":0.8,"color":"pink","attack":0.001,"decay":0.035,"gain":0.55},"drive":0.1,"humanize":{"gain":0.05},"level":0.02,"peak":0.55},"tom3Voice":{"label":"Bodhrán · Ghosts","category":"Perc","homeLane":"tom","kind":"drum","dur":1,"note":"The tipper's light return strokes, brushing the skin between the beats.","osc":{"type":"triangle","from":225,"to":190,"sweep":0.02,"attack":0.001,"decay":0.04,"curve":"exp","gain":0.35},"noise":{"type":"bandpass","freq":2400,"Q":0.9,"attack":0.001,"decay":0.025,"gain":0.5},"humanize":{"gain":0.05},"level":0.012,"peak":0.4},"tom4Voice":{"label":"Bodhrán · Boom","category":"Perc","homeLane":"tom","kind":"drum","dur":1,"note":"A bodhrán's open stroke: the tipper's head on goatskin near the rim, a warm thump falling 120 to 78 Hz with the skin's overtone over it.","osc":{"type":"sine","from":120,"to":78,"sweep":0.04,"attack":0.002,"decay":0.32,"curve":"exp","gain":1},"osc2":{"type":"triangle","from":235,"to":195,"sweep":0.03,"attack":0.001,"decay":0.08,"curve":"exp","gain":0.22},"noise":{"type":"lowpass","freq":1400,"Q":0.7,"color":"pink","attack":0.001,"decay":0.03,"gain":0.35},"drive":0.1,"humanize":{"gain":0.05},"level":0.034,"peak":0.7}},
  lanes: {
    lead: { pan: -0.1, send: { delay: 0.12, reverb: 0.4 }, eq: { high: 2.5 }, effects: [{ id: "exciter", params: { tune: 2500, drive: 0.5, timbre: 0.4, mix: 0.3 } }] },
    lead5: { pan: -0.08, send: { delay: 0.06, reverb: 0.28 }, eq: { high: 2.5 }, effects: [{ id: "exciter", params: { tune: 2500, drive: 0.5, timbre: 0.4, mix: 0.3 } }] },
    lead2: { pan: 0.18, send: { delay: 0.1, reverb: 0.45 }, eq: { high: 3 } },
    lead3: { gain: -5.5, pan: 0.32, send: { reverb: 0.25 }, eq: { high: 2 } },
    leadHarm: { gain: -5.5, pan: 0.32, send: { reverb: 0.35 }, eq: { high: 2 } },
    lead4: { gain: -2, send: { reverb: 0.5 }, eq: { high: 2.5 } },
    twinkle: { gain: -8, pan: 0.3, send: { delay: 0.3, reverb: 0.6 }, eq: { high: 2 } },
    chords: { gain: -6, pan: -0.28, send: { reverb: 0.3 }, eq: { low: -2, high: 3.5 } },
    chords2: { gain: -16, pan: 0.24, send: { reverb: 0.2 }, eq: { low: -3, high: 3.5 }, effects: [{ id: "exciter", params: { tune: 2500, drive: 0.5, timbre: 0.4, mix: 0.2 } }], noteFx: {"strum":{"enabled":true,"direction":"alternate-down","gapMs":10,"downDb":0,"upDb":-4}} },
    chords3: { gain: -10, pan: 0.38, send: { reverb: 0.45 }, eq: { low: -2, high: 3 }, noteFx: {"strum":{"enabled":true,"direction":"up","gapMs":35}} },
    chords4: { gain: -10, pan: -0.05, send: { reverb: 0.55 }, eq: { low: -2, high: 2 } },
    bass: { gain: -5.5, send: { reverb: 0.15 }, eq: { low: 3, mid: -1.5 } },
    bass2: { gain: -10 },
    tom: { gain: -4, pan: 0.05, send: { reverb: 0.25 } },
    tom2: { gain: 3.5, pan: 0.08, send: { reverb: 0.2 } },
    tom3: { gain: -4, pan: 0.1, send: { reverb: 0.15 } },
    tom4: { gain: -12, pan: 0.05, send: { reverb: 0.4 } },
    rim: { gain: -17, pan: -0.3, send: { reverb: 0.15 } },
  },
};

export const arrangement = {
  order: [{"s":0,"gain":{"bass":-8}},{"s":1,"gain":{"bass":-8}},{"s":2,"gain":{"bass":-8}},{"s":3,"gain":{"bass":-8}},{"s":4,"gain":{"bass":-8}},{"s":5,"gain":{"bass":-8}},{"s":6,"gain":{"lead":-5,"chords":-4}},{"s":7,"gain":{"lead":-5}},8,9,10,11,{"s":12,"gain":{"chords2":3}},{"s":13,"gain":{"chords2":3}},14,15,16,17,{"s":18,"gain":{"bass":-8}},{"s":19,"gain":{"bass":-8}},{"s":20,"gain":{"bass":-8,"lead2":3}},{"s":21,"gain":{"bass":-8,"lead2":3}},{"s":22,"gain":{"bass":-8}},{"s":23,"gain":{"bass":-8}}],
  loop: {
    fromBar: 5,
    toBar: 48,
  },
};

export const variants = {
  select: [
    {
      when: "always",
      loop: { fromBar: 1, toBar: 4 },
      treatment: [{ id: "filter", params: { type: "lowpass", frequency: 3200, Q: 0.7 } }],
      patch: {
        fx: { reverb: { level: 1.3 } },
      },
      exit: { quantize: "bar", crossfadeBars: 0, loopRelease: "atTransition", treatBars: 1 },
    },
  ],
};

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
