// COSMIC LULLABY — one song: what it plays, how it is arranged, how it sounds.
//
// Created in the Song Mixer as a blank starter.
// Parade March — 120 BPM in D major. Major, brass and strings, snare on every beat and a taiko on the turn.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';

export const id = "cosmic-lullaby";
export const title = "COSMIC LULLABY";
export const slug = "cosmic-lullaby";
export const group = "scratch";
export const seed = 2564991391;

export const bank = {
  bpm: 120,
  musicTrim: 0.978,
  drumGain: 1.097,
  leadVoice: "stReedLead",
  starterLanes: ["lead"],
  sections: [
    {
      lead: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
  ],
  order: [0],
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  layers: [{ key: "tom2", from: "tom", independent: true }, { key: "tom3", from: "tom", independent: true }, { key: "tom4", from: "tom", independent: true }, { key: "tom5", from: "tom", independent: true }, { key: "tom6", from: "tom", independent: true }, { key: "tom7", from: "tom", independent: true }, { key: "tom8", from: "tom", independent: true }, { key: "tom9", from: "tom", independent: true }],
  off: ["lead"],
  voice: {"tom2Voice":"hat808","tom3Voice":"hat808Open","tom4Voice":"hatGrit","tom5Voice":"hatGritOpen","tom6Voice":"hatFoil","tom7Voice":"hatFoilOpen","tom8Voice":"hatSnap","tom9Voice":"hatSnapOpen"},
  voiceParams: {"tom8Voice":{"label":"= Snap Hat","category":"Hats","dur":0.5,"note":"The cutoff climbs an octave as it decays, so the tick opens rather than just stopping — a chirp too fast to hear as one. Driven a little to keep the front edge.","noise":{"type":"highpass","freq":6200,"to":11000,"sweep":0.028,"Q":1.6,"decay":0.03,"gain":1},"drive":0.3,"id":"hatSnap","kind":"drum","level":0.031197,"peak":0.7},"tom2Voice":{"label":"= 808 Hat","category":"Hats","synth":"MetalSynth","dur":0.5,"note":"The drum-machine closed hat: six detuned squares through a high resonance, gone in forty milliseconds. Metallic in a way no filtered noise gets to.","options":{"harmonicity":5.1,"modulationIndex":32,"resonance":7200,"octaves":1.2,"envelope":{"attack":0.001,"decay":0.04,"release":0.02}},"id":"hat808","kind":"tone","level":0.024918,"peak":0.9311},"tom3Voice":{"label":"= 808 Open Hat","category":"Hats","synth":"MetalSynth","dur":2,"note":"The same six partials left to ring for half a second. The open hat that answers = 808 Hat — use them as a pair or neither.","options":{"harmonicity":5.1,"modulationIndex":32,"resonance":7200,"octaves":1.2,"envelope":{"attack":0.001,"decay":0.44,"release":0.32}},"id":"hat808Open","kind":"tone","level":0.073498,"peak":1.1697},"tom4Voice":{"label":"= Grit Hat","category":"Hats","dur":0.5,"note":"A resonant band with a square oscillator sitting in it, pushed hard into the shaper. Dirty and mid-forward — the hat for a mix where the bright ones vanish.","osc":{"type":"square","from":3900,"to":1950,"sweep":0.006,"decay":0.028,"curve":"lin","gain":0.16},"noise":{"type":"bandpass","freq":5600,"to":3600,"sweep":0.05,"Q":4.5,"decay":0.038,"gain":1},"drive":0.5,"id":"hatGrit","kind":"drum","level":0.045446,"peak":0.6977},"tom5Voice":{"label":"= Grit Open Hat","category":"Hats","dur":2,"note":"The Grit hat let go: half a second of resonant sizzle falling away to a low band, with the square knock still on the front.","osc":{"type":"square","from":3900,"to":1950,"sweep":0.01,"decay":0.055,"curve":"lin","gain":0.13},"noise":{"type":"bandpass","freq":5600,"to":2600,"sweep":0.45,"Q":4.2,"decay":0.5,"gain":1},"drive":0.5,"id":"hatGritOpen","kind":"drum","level":0.090448,"peak":0.6988},"tom6Voice":{"label":"= Foil Hat","category":"Hats","dur":0.5,"note":"Thinner and brighter than the plain closed hat, with a barely-there metallic ping under the air. Sixteenths of it sit above a mix rather than in it.","noise":{"type":"highpass","freq":9200,"Q":0.9,"decay":0.021},"body":{"type":"square","from":1150,"to":980,"decay":0.014,"gain":0.045},"id":"hatFoil","kind":"noise","level":0.01105,"peak":0.6241},"tom7Voice":{"label":"= Foil Open Hat","category":"Hats","dur":2,"note":"The Foil hat unclamped: the same band a shade lower, ringing for a quarter of a second, with the ping stretched to match.","noise":{"type":"highpass","freq":8400,"Q":0.9,"decay":0.27},"body":{"type":"square","from":3100,"to":2600,"decay":0.05,"gain":0.045},"id":"hatFoilOpen","kind":"noise","level":0.04902,"peak":0.8115},"tom9Voice":{"label":"= Snap Open Hat","category":"Hats","dur":2,"note":"The same hat held open: the sweep runs the other way over four tenths of a second, so the wash goes dull as it dies the way a real cymbal does.","noise":{"type":"highpass","freq":8000,"to":5200,"sweep":0.4,"Q":1.2,"decay":0.42,"gain":1},"drive":0.25,"id":"hatSnapOpen","kind":"drum","level":0.094985,"peak":0.7}},
};

export const arrangement = {
  order: [
    {
      s: 1,
      bars: 1,
    },
    {
      s: 2,
      bars: 1,
      from: 1,
    },
  ],
  sections: [
    {
      base: 0,
      tom2: seq('C1 C1 C1 C1 . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom3: seq('. . . . C1 C1 C1 C1 . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom4: seq('. . . . . . . . C1 C1 C1 C1 . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      tom5: seq('. . . . . . . . . . . . C1 C1 C1 C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      base: 0,
      tom6: seq('. . . . . . . . . . . . . . . . | C1 C1 C1 C1 . . . . . . . . . . . .').map((v) => !!v),
      tom7: seq('. . . . . . . . . . . . . . . . | . . . . C1 C1 C1 C1 . . . . . . . .').map((v) => !!v),
      tom8: seq('. . . . . . . . . . . . . . . . | . . . . . . . . C1 C1 C1 C1 . . . .').map((v) => !!v),
      tom9: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 C1 C1 C1').map((v) => !!v),
    },
  ],
};
