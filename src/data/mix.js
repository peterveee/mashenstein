// The mixing desk's output — written by `npm run mixer`, read by the game and by
// every render tool.
//
// Values are RELATIVE trims, in dB, on top of whatever the bank and its sections
// already computed. That matters: banks vary their own lanes per section (Speed
// Zone changes echoLevel, Plumber changes keyGlissGain), and an absolute value
// would flatten variation that was written on purpose. A trim rides on top of it.
//
// It also keeps musicTrim untouched, so the per-bank values pinned by
// tests/sound-test-menu.js keep passing while the mix is being dialled in.
//
// Shape, per track id (see src/data/tracks.js for the ids):
//   {
//     master: -1.5,          // dB on top of bank.musicTrim
//     masterPan: 0,          // the whole bus, -1 left .. +1 right; 0 is a pass-through
//     limiter: false,        // costs 6ms of output latency when on — see mixer.js
//     lanes: {
//       bass: {
//         gain: -2.5,        // dB, 0 = as authored
//         pan: -0.1,         // -1 left .. +1 right
//         width: 1,          // stereo image: 1 as-is, 0 mono, 2 wide
//         mute: false,
//         send: { delay: 1, reverb: 0.15 },   // delay 1 = the echo the bank asked for
//         insert: { division: 0.5, feedback: 0.3, tone: 4000, mix: 0.25, pan: 0.8 },
//                                             // this channel's OWN delay; mix 0 = off
//         eq: { low: 2, mid: 0, high: -3 },   // dB at 250Hz / 1.2kHz / 4kHz
//       },
//     },
//     voice: { bassType: 'sawtooth' },        // bank-key overrides from the sound picker
//     fx: {                                   // the shared sends the lanes feed
//       delay:  { division: 0.75,             // beats: 1=1/4, 0.75=dotted 1/8, 0.5=1/8...
//                 feedback: 0.35, tone: 2800, // repeats, and their damping in Hz
//                 level: 1 },                 // SCALE on the bank's own echoLevel
//       reverb: { decay: 2.2, preDelay: 0.012 },
//     },
//   }
//
// Solo is deliberately not persisted: it is a monitoring state, not a mix decision.
export const MIX = {
  "after-hours-layaway-dolores": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "after-hours-layaway-dolores-organ": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "after-hours-layaway-dolores-v2": {
    lanes: {
      lead: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      electroFx: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "after-hours-layaway-gary": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
    },
  },
  "after-hours-layaway-gary-organ": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
    },
  },
  "after-hours-layaway-gary-v2": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      electroFx: { send: { delay: 1 } },
    },
  },
  "basket-bounce-dolores": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "basket-bounce-gary": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "cardboard": {
    lanes: {
      lead: { send: { delay: 1 } },
    },
  },
  "checkout-promenade-dolores": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "checkout-promenade-dolores-bright-organ": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      organGliss: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "checkout-promenade-gary": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
    },
  },
  "checkout-promenade-gary-bright-organ": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      organGliss: { send: { delay: 1 } },
    },
  },
  "checkout-promenade-gary-bright-organ-dance-mix": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      organGliss: { send: { delay: 1 } },
      organSwoop: { send: { delay: 1 } },
    },
  },
  "checkout-promenade-gary-organ": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
    },
  },
  "coupon-carousel-dolores": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "coupon-carousel-gary": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
    },
  },
  "crypt": {
    lanes: {
      lead: { send: { delay: 1 } },
    },
  },
  "finale": {
    lanes: {
      kick: { gain: -2 },
      clap: { gain: -2 },
      hats: { gain: -2 },
      lead: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      gliss: { send: { delay: 1 } },
      sweeps: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
      crash: { send: { delay: 1 } },
    },
  },
  "frost": {
    lanes: {
      lead: { send: { delay: 1 } },
    },
  },
  "hub": {
    lanes: {
      kick: { gain: -1, send: { delay: 1 } },
      clap: { gain: -1, send: { delay: 1 } },
      bass: { send: { delay: 1 } },
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      keyGliss: { send: { delay: 1 } },
      gliss: { send: { delay: 1 } },
      vox: { send: { delay: 1 } },
      shout: { send: { delay: 1 } },
      snare: { send: { delay: 1 } },
      hats: { send: { delay: 1 } },
      ohats: { send: { delay: 1 } },
    },
  },
  "megamix": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organSwoop: { send: { delay: 1 } },
      keyGliss: { send: { delay: 1 } },
      gliss: { send: { delay: 1 } },
      electroFx: { send: { delay: 1 } },
      sweeps: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "neon": {
    lanes: {
      kick: { eq: { high: 15 }, effects: [{ id: "reverb" }] },
      clap: { send: { delay: 1.24, reverb: 1.38 } },
      hats: { pan: -0.402, eq: { high: 8.9 } },
      bass: { eq: { low: -6.4, mid: -4.1, high: 5.6 } },
      lead: { send: { delay: 1 }, effects: [{ id: "pingpong", params: { wet: 0.39, feedback: 0.23 } }] },
    },
  },
  "office": {
    lanes: {
      lead: { send: { delay: 1 } },
    },
  },
  "plumber": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      keyGliss: { send: { delay: 1 } },
    },
  },
  "receipt-printer-rhumba-dolores": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "receipt-printer-rhumba-gary": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "rhythm": {
    lanes: {
      lead: { send: { delay: 1 } },
    },
  },
  "service-bell-stroll-dolores": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "service-bell-stroll-gary": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "shop": {
    lanes: {
      kick: { gain: -6 },
      hats: { gain: -6 },
      clap: { gain: -6 },
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      organGliss: { send: { delay: 1 } },
      organSwoop: { send: { delay: 1 } },
    },
  },
  "speed": {
    lanes: {
      bass: { send: { delay: 1 } },
      lead: { send: { delay: 1 } },
      keyGliss: { send: { delay: 1 } },
    },
  },
  "surge": {
    lanes: {
      lead: { send: { delay: 1 } },
    },
  },
  "title": {
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      keyGliss: { send: { delay: 1 } },
      sweeps: { send: { delay: 1 } },
    },
  },
};

export const LANE_DEFAULTS = {
  gain: 0,
  pan: 0,
  width: 1,
  mute: false,
  // Both sends start shut. The delay used to default to 1 for melodic lanes, which
  // is how a channel could echo with nothing in its entry saying so; each song's
  // echo is written out per channel instead — see the sends in MIX above.
  send: { delay: 0, reverb: 0 },
  eq: { low: 0, mid: 0, high: 0 },
};

/** Merge a stored lane entry over the defaults, so partial entries are legal. */
export function laneSettings(entry) {
  if (!entry) return LANE_DEFAULTS;
  return {
    ...LANE_DEFAULTS,
    ...entry,
    send: { ...LANE_DEFAULTS.send, ...(entry.send || {}) },
    eq: { ...LANE_DEFAULTS.eq, ...(entry.eq || {}) },
  };
}
