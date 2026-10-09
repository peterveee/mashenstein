// CHECKOUT PROMENADE 8-BIT — one song: what it plays, how it is arranged, how it sounds.
//
// CHECKOUT PROMENADE as the results screen plays it: every part on the 8-Bit Sound Set, every
// fader where tools/chip-results-levels.js measured the 8-bit part should sit against the
// one it replaces, no reverb. Mix it here: Save, and the game's copy (src/game/results-chip-mixes.js)
// follows — what the results screens switch to and what SETTINGS ▸ SOUNDTRACK: 8-BIT plays.
// The music below is CHECKOUT PROMENADE's, copied as it stood (an alternate of shop).
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "shop-8bit";
export const title = "CHECKOUT PROMENADE 8-BIT";
export const slug = "shop-8bit";
export const group = "alternate";
export const alternateOf = "shop";

export const bank = {
  bpm: 108,
  bass: seq('C2 . . G2 A2 . . E2 D2 . . A2 G2 . . D2 | C2 . . G2 A2 . . E2 F2 . . G2 G2 . . B2'),
  lead: seq('E4 . G4 . A4 G4 . E4 . D4 . F4 A4 . G4 . | . . E4 G4 . C5 . B4 G4 . F4 . D4 F4 . G4'),
  chords: [[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,null,[0,0,0],null,null,null],
  sections: [
    {
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarm: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organSwoop: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      bass: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organChords: [null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,[0,0,0],null,[0,0,0]],
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarm: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organSwoop: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      bass: seq('C2 . . G2 A2 . . E2 D2 . . A2 G2 . . D2 | C2 . . G2 A2 . . E2 F2 . . G2 G2 . . B2'),
      chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organChords: [null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,[0,0,0],null,[0,0,0]],
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarm: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organSwoop: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C6 . . .'),
      bass: seq('C2 . . G2 A2 . . E2 D2 . . A2 G2 . . D2 | C2 . . G2 A2 . . E2 F2 . . G2 G2 . . B2'),
      chords: [[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,null,[0,0,0],null,null,null],
      organChords: [null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,[0,0,0],null,[0,0,0]],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      organChords: [null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,[0,0,0],null,[0,0,0]],
      organGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      bass: seq('C2 . . G2 A2 . . E2 D2 . . A2 G2 . . D2 | C2 . . G2 A2 . . E2 F2 . . G2 G2 . . B2'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      organChords: [null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,[0,0,0],null,[0,0,0]],
      organGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . G5 .'),
      bass: seq('C2 . . G2 A2 . . E2 D2 . . A2 G2 . . D2 | C2 . . G2 A2 . . E2 F2 . . G2 G2 . . B2'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('F2 . . C3 E2 . . B2 A2 . . E3 D2 . . A2 | F2 . . C3 E2 . . B2 D2 . . G2 G2 . . B2'),
      lead: seq('A4 . C5 . E5 . C5 A4 . G4 . B4 . D5 B4 . | A4 . . . C5 B4 . A4 . E5 . D5 B4 . A4 .'),
      leadHarm: seq('. . . . F4 . A4 . . . . . G4 . B4 . | . . . . A4 . C5 . . . . . G4 . D4 .'),
      chords: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,[0,0,0],null,null,null],
      organChords: [null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[0,0,0],null,[0,0,0]],
      organGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('F2 . . C3 E2 . . B2 A2 . . E3 D2 . . A2 | F2 . . C3 E2 . . B2 D2 . . G2 G2 . . B2'),
      lead: seq('A4 . C5 . E5 . C5 A4 . G4 . B4 . D5 B4 . | A4 . . . C5 B4 . A4 . E5 . D5 B4 . A4 .'),
      leadHarm: seq('. . . . F4 . A4 . . . . . G4 . B4 . | . . . . A4 . C5 . . . . . G4 . D4 .'),
      chords: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,[0,0,0],null,null,null],
      organChords: [null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[0,0,0],null,[0,0,0]],
      organGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . G5 .'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarm: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organSwoop: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      bass: seq('C2 . . G2 A2 . . E2 D2 . . A2 G2 . . D2 | C2 . . G2 A2 . . E2 F2 . . G2 G2 . . B2'),
      chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organChords: [null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,[0,0,0],null,[0,0,0]],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      hats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      rimEcho: 0,
    },
    {
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      leadHarm: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      twinkle: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organSwoop: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C6 . . .'),
      bass: seq('F2 . . C3 E2 . . B2 A2 . . E3 D2 . . A2 | F2 . . C3 E2 . . B2 D2 . . G2 G2 . . B2'),
      chords: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      organChords: [null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[0,0,0],null,[0,0,0]],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      hats: seq('. . . . . . C1 . . . . . . . C1 . | . . . . . . C1 . . . . . . . C1 .').map((v) => !!v),
      ohats: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      rim: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      rimEcho: 0,
    },
  ],
  order: [0,1,2,3,4,5,6,3,4,5,6,7,7,8,8,3,4,5,6,3,4,5,6],
  leadType: "triangle",
  leadGain: 0.0693,
  leadDur: 1.55,
  leadAttack: 0.012,
  leadHarm: seq('. . . . C4 . E4 . . . . . D4 . F4 . | . . . . E4 . G4 . . . . . D4 . B3 .'),
  harmType: "sine",
  harmGain: 0.026,
  harmDur: 1.35,
  bassType: "sine",
  bassGain: 0.1115775,
  bassDur: 1.08,
  bassRepeat: 0,
  bassRepeatGain: 0.22,
  bassRepeatDur: 0.55,
  chordType: "triangle",
  chordGain: 0.038,
  chordDur: 1.75,
  chordAttack: 0.02,
  kick: seq('C1 . . . . . C1 . C1 . . . . . C1 . | C1 . . . . . C1 . C1 . . . . . C1 .').map((v) => !!v),
  kickGain: 0.45,
  kickTail: 0.15,
  kickKnock: 0.5,
  hats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  twinkle: seq('. . . . G5 . . . . . . . . . . . | E6 . . . . . . . . . . D6 . . . .'),
  twinkleGain: 0.015,
  twinkleDur: 0.62,
  echoLevel: 0.2,
  organChords: [null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,[0,0,0],null,[0,0,0]],
  organGain: 0.0205,
  organDur: 1.02,
  organAttack: 0.004,
  organEcho: false,
  organBright: true,
  organPercussion: true,
  organPercussionDur: 0.52,
  organPercussionGain: 0.9,
  organGliss: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
  organGlissGain: 0.013,
  organGlissSpan: 2.7,
  organGlissAttack: 0.002,
  bass80s: false,
  bassAttack: 0.003,
  twinkleAttack: 0.003,
  musicTrim: 2.22,
  bassFilteredSaw: true,
  bassEcho: false,
  bassFilterOpen: 1100,
  bassFilterClose: 310,
  bassFilterQ: 1.1,
  bassFilteredSawSubGain: 0.22,
  leadBright: true,
  leadBrightGain: 0.16,
  drumGain: 0.68,
  clapGain: 0.323,
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -2.3,
  masterEffects: [{ id: "mbCompN" }, { id: "exciter", params: { tune: 6000, drive: 0.35, timbre: 0.7, mix: 0.25 } }, { id: "gain", params: { gain: -7.3 } }],
  layers: [{ key: "chords2", from: "chords", independent: true }, { key: "bass2", from: "bass", independent: true }],
  voice: {"kickVoice":"sdsKick","snareVoice":"snareCrisp","clapVoice":"snareEngine","hatsVoice":"hatEngine","chordsVoice":"squareOrgan","chords2Voice":"squareOrgan","bass2Voice":"toneSine","organChordsVoice":"squareOrgan","bassVoice":"toneSquare","leadVoice":"toneSquare","rimVoice":"vl1Sha","ohatsVoice":"ohatEngine","crashVoice":"crashEngine","tomVoice":"tomEngine"},
  voiceParams: {"kickVoice":{"label":"Simmons · Kick","category":"Kick","homeLane":"kick","dur":2,"note":"The SDS-V bass module: triangle VCO bending 190 to 48, the noise pot low and the click pot up — which is `noise.sag` here, a spike that falls to a fifth of itself in four milliseconds and carries on as body.","osc":{"type":"triangle","from":190,"to":48,"sweep":0.07,"pitchCurve":"snap","attack":0.001,"decay":0.111,"curve":"exp","gain":1},"knock":0.35,"noise":{"type":"lowpass","freq":1400,"Q":0.7,"decay":0.02,"sag":0.2,"sagAt":0.004,"gain":0.3},"drive":0.18184267,"starter":false,"kind":"drum","level":0.02038039787,"peak":0.7144052356,"songOrigin":"library","songSourceId":"kickVoice"},"organChordsVoice":{"label":"Square Organ","category":"Organ","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.463,"waveform":"square","attack":0.008,"release":0.086,"trim":0.8,"vibrato":{"depth":0,"rate":5},"mono":false,"portamento":0,"starter":false,"filter":{"type":"lowpass","slope":-12,"freq":1420,"Q":3.4,"env":{"octaves":2.9,"attack":0,"decay":0.12,"sustain":0,"release":0.015}},"kind":"tone","level":0.10112986146387905,"peak":0.9518973530730414,"songOrigin":"library","songSourceId":"organChordsVoice"},"snareVoice":{"label":"Crisp Snare","category":"Snare","dur":1,"note":"The engine’s own snare as a preset: a bright noise band, a short decay and a hint of body. The one every song already uses.","osc":{"type":"triangle","from":210,"to":140,"sweep":0.06,"decay":0.06,"gain":0.375},"noise":{"type":"bandpass","freq":2600,"Q":0.7,"decay":0.09},"id":"snareCrisp","kind":"drum","factory":true,"level":0.012488,"peak":0.4825},"clapVoice":{"label":"= Arcade Snare","category":"Snare","homeLane":"snare","dur":1,"note":"The game’s own snare: a 2.6 kHz band of noise with a triangle body falling 210 to 140 Hz under it. The backbeat every song was balanced against.","osc":{"type":"triangle","from":210,"to":140,"sweep":0.05,"decay":0.1031,"curve":"exp","gain":0.375},"noise":{"type":"bandpass","freq":2600,"Q":0.7,"decay":0.1437,"gain":1},"id":"snareEngine","kind":"drum","factory":true,"level":0.015394,"peak":0.5414},"hatsVoice":{"label":"= Arcade Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.02664,"peak":0.8382},"chordsVoice":{"label":"Square Organ","category":"Organ","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.463,"waveform":"square","attack":0.011,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":5},"mono":false,"portamento":0,"starter":false,"filter":{"type":"lowpass","slope":-12,"freq":1420,"Q":3.4,"env":{"octaves":2.9,"attack":0,"decay":0.12,"sustain":0,"release":0.015}},"id":"squareOrgan","kind":"tone","factory":true,"level":0.10094,"peak":0.9585},"chords2Voice":{"label":"Square Organ","category":"Organ","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.463,"waveform":"square","attack":0.011,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":5},"mono":false,"portamento":0,"starter":false,"filter":{"type":"lowpass","slope":-12,"freq":1420,"Q":3.4,"env":{"octaves":2.9,"attack":0,"decay":0.12,"sustain":0,"release":0.015}},"id":"squareOrgan","kind":"tone","factory":true,"level":0.10094,"peak":0.9585},"bass2Voice":{"label":"Sine Tone","category":"Keys","synth":"KNDO-5","dur":1.2,"note":"A direct single-oscillator sine replacement for the engine voice.","fixedLength":0.063,"waveform":"sine","attack":0.01,"release":0.015,"trim":0,"id":"toneSine","kind":"tone","factory":true,"level":0.027794,"peak":0.661},"bassVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"id":"toneSquare","kind":"tone","factory":true,"level":0.055714,"peak":0.6468},"leadVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.089,"trim":0.8,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"id":"toneSquare","kind":"tone","factory":true,"level":0.055714,"peak":0.6468},"rimVoice":{"label":"Toy Shaker","category":"Blip","homeLane":"rim","dur":0.5,"note":"The VL-1’s longer shhh: seeded white noise through a high-pass filter, with a clean one-hundred-sixty-millisecond decay.","noise":{"type":"highpass","freq":3000,"Q":0.7,"decay":0.16,"gain":1},"id":"vl1Sha","kind":"drum","factory":true,"level":0.034957,"peak":0.8505},"ohatsVoice":{"label":"= Arcade Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The game’s own open hat: the same noise a thousand hertz lower, left to sizzle for a fifth of a second.","noise":{"type":"highpass","freq":4200,"Q":1,"decay":0.4232,"gain":1},"id":"ohatEngine","kind":"drum","factory":true,"level":0.056556,"peak":0.9765},"crashVoice":{"label":"= Arcade Crash","category":"Crash","homeLane":"crash","dur":5,"note":"The game’s own crash: bright on the transient and darkening as it falls, a lowpass closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays off the 2.5-second buffer rather than looping the short one.","noise":{"type":"lowpass","freq":9000,"to":1100,"sweep":1.25,"Q":0.7,"attack":0.005,"decay":1.5743,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"id":"crashEngine","kind":"drum","factory":true,"level":0.074854,"peak":0.8242},"tomVoice":{"label":"= Arcade Tom","category":"Tom","homeLane":"tom","dur":1,"note":"The game’s own tom: a triangle falling most of an octave onto the lane’s own note. Tuned by the lane, the way the engine tunes it.","osc":{"type":"triangle","from":234,"to":130,"sweep":0.08,"attack":0.004,"decay":0.4606,"curve":"exp","gain":1},"id":"tomEngine","kind":"drum","factory":true,"level":0.036372,"peak":0.6757}},
  fx: { delay: { level: 0.692 } },
  lanes: {
    kick: { gain: 0.5, eq: { low: 3.2, mid: 4.5, high: -3.8 } },
    hats: { gain: 2.5, pan: -0.521, eq: { high: 11.6 } },
    clap: { gain: 4.2, pan: 0.694 },
    lead: { gain: 2.1, pan: -0.164, effects: [{ id: "bell", params: { frequency: 3000, gain: 4, q: 1 } }, { id: "pingpong", params: { wet: 0.2 } }] },
    leadHarm: { gain: 6, pan: 0.342, send: { delay: 0.156 }, eq: { high: 18 } },
    twinkle: { gain: 6, send: { delay: 0.2 }, eq: { high: 7.4 }, effects: [{ id: "autopanner", params: { rateDivision: 8 } }] },
    chords: { gain: -18, pan: -0.238, send: { delay: 0.005 }, effects: [{ id: "doubler" }] },
    organChords: { gain: -6, pan: 0.603, send: { delay: 0.004 }, eq: { low: -11, high: 2.7 } },
    organGliss: { pan: -0.249, send: { delay: 0.2 }, eq: { low: -8.1 }, effects: [{ id: "bell", params: { frequency: 3765.275, gain: 6, q: 0.7 } }] },
    organSwoop: { pan: 0.454, send: { delay: 0.2 }, eq: { high: 5.1 } },
    snare: { gain: -2.88, send: { delay: 0.013 }, eq: { high: 11.2 } },
    chords2: { gain: -25.9, pan: -0.153, send: { delay: 0.005 } },
    bass: { gain: -0.8, eq: { low: -2.6 } },
    bass2: { gain: -7.76, eq: { low: -0.7 } },
  },
};

export const arrangement = {
  order: [0,{"s":14,"bars":1},{"s":17,"bars":1,"from":1},9,10,11,12,13,10,11,12,13,15,15,16,16,10,11,12,13,10,11,12,13],
  sections: [
    {
      base: 2,
      chords2: [[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,null,[0,0,0],null,null,null],
      bass2: seq('C2 . . G2 A2 . . E2 D2 . . A2 G2 . . D2 | C2 . . G2 A2 . . E2 F2 . . G2 G2 . . B2'),
    },
    {
      base: 3,
      chords2: [[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,null,[0,0,0],null,null,null],
      bass2: seq('C2 . . G2 A2 . . E2 D2 . . A2 G2 . . D2 | C2 . . G2 A2 . . E2 F2 . . G2 G2 . . B2'),
    },
    {
      base: 4,
      chords2: [[130.8127826502993,164.81377845643496,195.99771799087463,246.94165062806204],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,null,null,null,null,[97.99885899543733,123.47082531403105,146.8323839587038],null,null,null,[0,0,0],null,null,null],
      bass2: seq('C2 . . G2 A2 . . E2 D2 . . A2 G2 . . D2 | C2 . . G2 A2 . . E2 F2 . . G2 G2 . . B2'),
    },
    {
      base: 5,
      chords2: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,[0,0,0],null,null,null],
      bass2: seq('F2 . . C3 E2 . . B2 A2 . . E3 D2 . . A2 | F2 . . C3 E2 . . B2 D2 . . G2 G2 . . B2'),
    },
    {
      base: 6,
      chords2: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[164.81377845643496,195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,[110,130.8127826502993,164.81377845643496,195.99771799087463],null,null,null,null,null,null,null,[146.8323839587038,174.61411571650194,220,261.6255653005986],null,null,null,[0,0,0],null,null,null],
      bass2: seq('F2 . . C3 E2 . . B2 A2 . . E3 D2 . . A2 | F2 . . C3 E2 . . B2 D2 . . G2 G2 . . B2'),
    },
    {
      base: 1,
      bass2: seq('C2 . . G2 A2 . . E2 D2 . . A2 G2 . . D2 | . . . . . . . . . . . . . . . .'),
    },
    {
      base: 7,
      bass2: seq('C2 . . G2 A2 . . E2 D2 . . A2 G2 . . D2 | C2 . . G2 A2 . . E2 F2 . . G2 G2 . . B2'),
    },
    {
      base: 8,
      bass2: seq('F2 . . C3 E2 . . B2 A2 . . E3 D2 . . A2 | F2 . . C3 E2 . . B2 D2 . . G2 G2 . . B2'),
    },
    {
      base: 1,
      bass2: seq('. . . . . . . . . . . . . . . . | C2 . . G2 A2 . . E2 F2 . . G2 G2 . . B2'),
      hats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
    },
  ],
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
