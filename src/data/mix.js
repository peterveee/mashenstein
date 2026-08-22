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
//         send: { delay: 1, reverb: 0.15 },   // absolute: 1 sends the whole channel, and
                                            // sends the same amount whichever lane it is
//         insert: { division: 0.5, feedback: 0.3, tone: 4000, mix: 0.25, pan: 0.8 },
//                                             // this channel's OWN delay; mix 0 = off
//         eq: { low: 2, mid: 0, high: -3 },   // dB at 250Hz / 1.2kHz / 4kHz
//       },
//     },
//     voice: { bassType: 'sawtooth' },        // bank-key overrides from the sound picker
//     layers: [{ key: 'bass2', from: 'bass' }],  // duplicated tracks — the same notes
//                                             // on a second strip, so `bass2Voice` can
//                                             // put a different sound under the part.
//                                             // The key is its source plus an ordinal.
//     off: ['crash'],                         // tracks deleted from THIS song on the
//                                             // desk. The bank keeps its notes; the
//                                             // lane simply is not part of this mix.
//     labels: { bass: 'Sub Bass' },            // optional display names for tracks;
//                                             // lane keys and playback stay unchanged
//     fx: {                                   // the shared sends the lanes feed
//       delay:  { division: 0.75,             // beats: 1=1/4, 0.75=dotted 1/8, 0.5=1/8...
//                 feedback: 0.35, tone: 2800, // repeats, and their damping in Hz
//                 level: 1 },                 // how loud the return comes back
//       reverb: { decay: 2.2, preDelay: 0.012 },
//     },
//   }
//
// Solo is deliberately not persisted: it is a monitoring state, not a mix decision.
// Assembled from src/data/songs/ — one file per song, each carrying its own mix
// under the line the desk writes below. This export is kept because the game, the
// engine and every render tool ask for `MIX` and should not have to care where it
// is kept; there is no longer a single file holding thirty-four songs' balances.
import { MIX_BY_ID, VARIANTS_BY_ID } from './songs/index.js';

export const MIX = MIX_BY_ID;

// Alternate presentations of a song — the same composition, the same clock, heard
// another way. So far there is one kind: `select`, what a cabinet's theme sounds like
// on the stage-select screen before the level opens it up.
//
//   variants: {
//     select: [                          // ordered; first `when` that matches wins, and
//       {                                // anything unmatched plays the saved mix as-is
//         when: 'level1',                // 'level1'|'level2'|'level3'|'boss'|'cleared'|'always'
//         loop: { fromBar: 1, toBar: 4 },// 1-based, inclusive; null = the whole form
//         patch: { lanes: { lead: { mute: true } } },   // FIELD-level over this song's mix:
//                                        // named fields change, everything else stands
//         exit: { quantize: 'bar', crossfadeBars: 1, loopRelease: 'atTransition' },
//       },
//     ],
//   }
//
// A patch may move faders, pans, widths, mutes, EQ, sends, aux return level/pan/EQ,
// the master trim and pan, and both the PARAMETERS and the MUTE of an effect both sides
// already have. It may not add or remove an effect, bypass one, change a reverb's decay,
// retune the shared delay, switch the limiter, or touch `layers`/`off`/`voice` — those
// are graph or bank changes, and there is no audio time you can schedule one for.
//
// The mute is how a screen carries an effect the level does not want. Both chains hold
// the same links in the same order; the level keeps its phaser muted and the cabinet
// screen unmutes it, and the change is a pair of gains crossfading on the bar line. It
// costs the effect's CPU in the level even while silent — the alternative, `treatment`
// below, costs a duplicate of the whole master path instead but nothing in the level.
// Bypass is neither: it unwires the link, which no bar line can be aimed at.
// See Audio.rampMix and mixer.setMute.
export const VARIANTS = VARIANTS_BY_ID;
/* Legacy aggregate snapshot retained as a comment for recovery; the generated
   per-song files above are now authoritative. */
const LEGACY_MIX = {
  "after-hours-layaway-dolores": {
    master: 9.3,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "after-hours-layaway-dolores-organ": {
    master: 6.8,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "after-hours-layaway-dolores-v2": {
    master: 5.4,
    lanes: {
      lead: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      electroFx: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "after-hours-layaway-gary": {
    master: 3.1,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
    },
  },
  "after-hours-layaway-gary-organ": {
    master: 2.1,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
    },
  },
  "after-hours-layaway-gary-v2": {
    master: 3.2,
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
    master: 5.8,
    voice: {"chordsVoice":"hornSwell"},
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { gain: 6, send: { delay: 1, reverb: 1.295 }, eq: { high: 9.4 } },
      organChords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "basket-bounce-gary": {
    master: 1,
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
    master: -0.1,
    lanes: {
      lead: { send: { delay: 1 } },
    },
  },
  "checkout-promenade-dolores": {
    master: 6.6,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "checkout-promenade-dolores-bright-organ": {
    master: 4.8,
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
    master: 1.7,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
    },
  },
  "checkout-promenade-gary-bright-organ": {
    master: 1.7,
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
    master: -5.3,
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
    master: 1.3,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
    },
  },
  "coupon-carousel-dolores": {
    master: 5.5,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "coupon-carousel-gary": {
    master: -1.7,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
    },
  },
  "crypt": {
    master: -0.2,
    lanes: {
      lead: { send: { delay: 1 } },
    },
  },
  "finale": {
    master: -0.5,
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
    master: -0.7,
    lanes: {
      lead: { send: { delay: 1 } },
    },
  },
  "hub": {
    master: -0.7,
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
    master: 1.9,
    voice: {"clapVoice":"clapRoom","rimVoice":"blipZap"},
    fx: { reverb: { decay: 1.5 } },
    lanes: {
      lead: { gain: -10.4, send: { delay: 1, reverb: 0.575 }, eq: { high: 7.8 }, effects: [{ id: "doubler", bypass: true, params: { delayMs: 11, dryPan: -1, wetPan: 1, frequency: 0.48, depth: 0.26, width: 0.2 } }] },
      leadHarm: { gain: -3.1, send: { delay: 1 } },
      chords: { gain: -18.7, send: { delay: 0.64, reverb: 0.265 }, eq: { low: -1.7, mid: 5.1, high: 9.4 }, effects: [{ id: "doubler", params: { dryPan: -1, wetPan: 1, delayMs: 11, wet: 0.44, width: 1, frequency: 0.27, depth: 0.2 } }] },
      organSwoop: { gain: -9.5, send: { delay: 1 } },
      keyGliss: { gain: -8.1, send: { delay: 1 }, eq: { high: 2.3 }, effects: [{ id: "exciter", params: { drive: 0.57, timbre: 0.66, mix: 0.47 } }, { id: "pingpong" }] },
      gliss: { gain: -14.2, send: { delay: 0.69, reverb: 0.59 } },
      electroFx: { send: { delay: 1 } },
      sweeps: { send: { delay: 1 } },
      rim: { gain: -2.7, pan: 0.248, send: { delay: 1, reverb: 0.38 }, effects: [{ id: "delay", params: { sync: 1, division: 0.5, feedback: 0.08, wet: 0.2 } }] },
      hats: { gain: -3, pan: -0.313, effects: [{ id: "exciter" }, { id: "delay", params: { division: 0.25 } }] },
      kick: { gain: 0.2, send: { reverb: 0.11 }, eq: { low: 3.2 } },
      snare: { send: { reverb: 0.255 }, eq: { high: 3.6 } },
      ohats: { gain: -6.2, pan: -0.318, eq: { high: 3.5 } },
      clap: { gain: -0.5, pan: 0.159, send: { delay: 0.235 }, effects: [{ id: "reverb" }] },
    },
  },
  "neon": {
    master: 1.1,
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
  "receipt-printer-rhumba-dolores": {
    master: 7.5,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "receipt-printer-rhumba-gary": {
    master: 1.8,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      twinkle: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "rhythm": {
    master: -1,
    lanes: {
      lead: { send: { delay: 1 } },
    },
  },
  "service-bell-stroll-dolores": {
    master: 5.3,
    lanes: {
      lead: { send: { delay: 1 } },
      leadHarm: { send: { delay: 1 } },
      chords: { send: { delay: 1 } },
      organChords: { send: { delay: 1 } },
      rim: { send: { delay: 1 } },
    },
  },
  "service-bell-stroll-gary": {
    master: 0.4,
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
    master: -2.3,
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
    master: 0.7,
    lanes: {
      bass: { send: { delay: 1 } },
      lead: { send: { delay: 1 } },
      keyGliss: { send: { delay: 1 } },
    },
  },
  "surge": {
    master: 0.9,
    lanes: {
      lead: { send: { delay: 1 } },
    },
  },
  "title": {
    master: -19.4,
    limiter: true,
    masterEffects: [{ id: "compressor", bypass: true, params: { threshold: -12, ratio: 2, attack: 0.03, release: 0.25 } }, { id: "reverb", params: { decay: 7, wet: 0.36, preDelay: 0.034 } }],
    layers: [{ key: "bass2", from: "bass" }],
    voice: {"bass2Voice":"tpAlienChorus"},
    lanes: {
      sweeps: { gain: -1.2, pan: 0.923, send: { delay: 1.555, reverb: 0.475 }, eq: { mid: 3.3, high: 5.4 } },
      bass: { gain: 3.7, pan: -0.211, send: { delay: 0.595 } },
      leadHarm: { pan: 0.07, send: { delay: 1.015 }, eq: { high: 5.7 } },
      twinkle: { pan: 0.24, send: { delay: 1.765 }, eq: { low: -2.6, mid: -4.4, high: 3.9 } },
      keyGliss: { gain: 3.6, pan: -0.326, send: { delay: 2 } },
      chords: { gain: -2.8, send: { delay: 1.69, reverb: 0.61 }, effects: [{ id: "vibrato", params: { wet: 0.71 } }, { id: "autopanner", params: { rateSync: 1, rateDivision: 8, wet: 0.74, depth: 0.49 } }] },
      lead: { pan: -0.169, send: { delay: 1.335 } },
      bass2: { gain: -9, pan: 0.42, send: { delay: 0.595 } },
    },
  },
};
void LEGACY_MIX;

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
