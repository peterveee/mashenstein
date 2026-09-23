// CHECKOUT PROMENADE — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "shop";
export const title = "CHECKOUT PROMENADE";
export const slug = "shop-theme";
export const group = "theme";

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
  masterEffects: [{ id: "mbCompN" }, { id: "exciter", params: { tune: 6000, drive: 0.35, timbre: 0.7, mix: 0.25 } }],
  layers: [{ key: "chords2", from: "chords", independent: true }, { key: "bass2", from: "bass", independent: true }],
  voice: {"kickVoice":"kickShop","snareVoice":"sdsSnare","clapVoice":"clapEngine","hatsVoice":"hatFoilOpen","chordsVoice":"tpTiny","chords2Voice":"tpTiny","bass2Voice":"toneSine","organChordsVoice":"addShopOrgan"},
  voiceParams: {"snareVoice":{"label":"Simmons · Snare","category":"Snare","homeLane":"snare","dur":1,"note":"The one everybody means by \"Simmons\": the noise-tone balance right over toward noise, a four-pole band at 2.2 kHz running nearly three hundred milliseconds, and just enough bent triangle underneath to give it a pitch.","osc":{"type":"triangle","from":330,"to":210,"sweep":0.05,"pitchCurve":"snap","attack":0.0008,"decay":0.15085714285714283,"curve":"exp","gain":0.5},"noise":{"type":"bandpass","freq":2200,"Q":0.9,"slope":-24,"decay":0.38399999999999995,"sag":0.3,"sagAt":0.007,"gain":1},"drive":0.2,"starter":false,"trim":1.8,"kind":"drum","level":0.023431957560267388,"peak":0.6372676134941955,"songOrigin":"library","songSourceId":"snareVoice"},"clapVoice":{"label":"= Engine Clap","category":"Clap","homeLane":"clap","dur":1,"note":"The game’s own clap: three highpassed bursts twelve milliseconds apart, the LAST of them the loudest and four times as long — two slaps, then the room.","noise":{"type":"highpass","freq":1500,"Q":1,"decay":0.0544,"gain":2},"taps":[0,0.012,0.024],"tapGains":[1,1,1.625],"tapDecays":[0.0544,0.0544,0.2092],"starter":false,"trim":6,"kind":"drum","level":0.10108581972319532,"peak":2.1238420413995205,"songOrigin":"library","songSourceId":"clapVoice"},"chordsVoice":{"label":"Tiny","category":"Keys","synth":"RMND-2","dur":1.6,"note":"A tiny detuned AM sine. Small, clean and easy to place under anything.","origin":"Tonejs/Presets AMSynth/Tiny","options":{"harmonicity":2,"oscillator":{"type":"amsine2","modulationType":"sine","harmonicity":1.01},"envelope":{"attack":0.006,"decay":5.41,"sustain":0.04,"release":3.908},"modulation":{"volume":13,"type":"amsine2","modulationType":"sine","harmonicity":12},"modulationEnvelope":{"attack":0.006,"decay":0.107,"sustain":0.35,"release":0.156},"modulationIndex":10},"starter":false,"transpose":12,"kind":"tone","level":0.019041837004394973,"peak":0.20721048756145416,"songOrigin":"library","songSourceId":"chordsVoice"},"chords2Voice":{"label":"Tiny","category":"Keys","synth":"RMND-2","dur":1.6,"note":"A tiny detuned AM sine. Small, clean and easy to place under anything.","origin":"Tonejs/Presets AMSynth/Tiny","options":{"harmonicity":2,"oscillator":{"type":"amsine2","modulationType":"sine","harmonicity":1.01},"envelope":{"attack":0.006,"decay":5.41,"sustain":0.04,"release":3.908},"modulation":{"volume":13,"type":"amsine2","modulationType":"sine","harmonicity":12},"modulationEnvelope":{"attack":0.006,"decay":0.107,"sustain":0.35,"release":0.156}},"starter":false,"transpose":0,"bypassed":{"options.modulationIndex":10},"kind":"tone","level":0.009731797300076962,"peak":0.15335737472265748,"songOrigin":"library","songSourceId":"chordsVoice"},"bass2Voice":{"label":"Sine Tone","category":"Keys","synth":"KNDO-5","dur":1.2,"note":"A direct single-oscillator sine replacement for the engine voice.","fixedLength":0.063,"waveform":"sawtooth","attack":0.01,"release":0.015,"trim":0,"starter":false,"filter":{"type":"lowpass","slope":-12,"freq":135,"to":4000,"Q":2.35,"sweep":0.12,"env":{"decay":0.115,"octaves":0.4,"attack":0}},"kind":"tone","level":0.020867128268036245,"peak":0.7175161676532132,"songOrigin":"library","songSourceId":"bass2Voice"},"organChordsVoice":{"label":"Shop Organ","category":"Organ","homeLane":"organChords","synth":"WNDR-9","dur":1.02,"note":"The shop theme’s own: bright, percussive, short and dry — comping rather than holding, so it sits under the lead instead of over it.","additive":{"bars":[0,0,1,0.78,0.48,0.3,0.1,0.59,0.43],"attack":0.001,"decay":0.1,"echo":false,"type":"triangle","release":0.006,"sustain":0.66,"damp":0.3},"starter":false,"bypassed":{"additive.perc":{"ratio":3,"gain":0.26,"attack":0.001,"decay":0.017}},"kind":"tone","level":0.08035792353663676,"peak":1.2146634311586588,"songOrigin":"library","songSourceId":"organChordsVoice"},"kickVoice":{"label":"= Shop Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The engine kick as the shop and the Gary themes tune it: the sub ring cut short and the knock halved, so a busy bar does not become one long boom.","osc":{"type":"sine","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.2287,"curve":"exp","gain":1},"knock":0.202,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.31},"trim":-0.42,"id":"kickShop","kind":"drum","factory":true,"level":0.030652,"peak":0.7085},"hatsVoice":{"label":"= Foil Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The Foil hat unclamped: the same band a shade lower, ringing for a quarter of a second, with the ping stretched to match.","osc":{"type":"square","from":3100,"to":2600,"sweep":0.05,"decay":0.05,"gain":0.045},"noise":{"type":"highpass","freq":8400,"Q":0.9,"decay":0.27,"gain":1.3900000000000001,"color":"blue"},"starter":false,"kind":"drum","level":0.06974208283649458,"peak":1.181579158571391,"songOrigin":"library","songSourceId":"hatsVoice"}},
  fx: { delay: { level: 0.692 } },
  lanes: {
    kick: { gain: 0.6, eq: { low: 3.2, mid: 4.5, high: -3.8 } },
    hats: { gain: 0.6, pan: -0.521, send: { reverb: 0.15 }, eq: { high: 11.6 } },
    clap: { gain: -1.8, pan: 0.694, send: { reverb: 0.412 } },
    lead: { gain: 2.4, pan: -0.164, send: { reverb: 0.156 }, effects: [{ id: "bell", params: { frequency: 3000, gain: 4, q: 1 } }, { id: "pingpong", params: { wet: 0.2 } }] },
    leadHarm: { gain: 6, pan: 0.342, send: { delay: 0.156 }, eq: { high: 18 } },
    twinkle: { gain: 6, send: { delay: 0.2 }, eq: { high: 7.4 }, effects: [{ id: "autopanner", params: { rateDivision: 8 } }] },
    chords: { gain: -3, pan: -0.238, send: { delay: 0.005, reverb: 0.157 }, effects: [{ id: "doubler" }] },
    organChords: { gain: -6.9, pan: 0.603, send: { delay: 0.004, reverb: 0.489 }, eq: { low: -11 } },
    organGliss: { pan: -0.249, send: { delay: 0.2 }, eq: { low: -8.1 }, effects: [{ id: "bell", params: { frequency: 3765.275, gain: 6, q: 0.7 } }] },
    organSwoop: { pan: 0.454, send: { delay: 0.2, reverb: 0.687 }, eq: { high: 5.1 } },
    snare: { gain: -2.8, send: { delay: 0.013, reverb: 0.446 }, eq: { high: 11.2 } },
    chords2: { gain: -19.4, pan: -0.153, send: { delay: 0.005, reverb: 0.157 } },
    bass: { gain: 3.4, eq: { low: -0.7 } },
    bass2: { gain: 0.912, eq: { low: -0.7 } },
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
