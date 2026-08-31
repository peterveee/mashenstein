// RHYTHM BANKRUPTCY — one song: what it plays, how it is arranged, how it sounds.
//
// Frozen from the counterPair factory it used to be built by, so this song is
// now its own: editing it changes nothing else.
//
// The music below is the composition. Everything under THE DESK WRITES BELOW HERE
// is written by `npm run mixer` and will be rewritten on every save — put notes
// about the song up here, where they survive.
import { seq, chordSeq } from '../../engine/notes.js';
import { COIN_FILLS } from '../../game/beatchart.js';

const { eighth, sixteenth, thirtysecond } = COIN_FILLS;

export const id = "rhythm";
export const title = "RHYTHM BANKRUPTCY";
export const slug = "rhythm-panic";
export const group = "cabinet";

export const bank = {
  bpm: 124,
  musicTrim: 1.05,
  bass: seq('C2 . C2 . G2 . E2 . C2 . C2 . A2 . G2 . | F2 . F2 . C2 . A1 . G1 . G2 . B2 . D3 .'),
  lead: seq('C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . . | C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . .'),
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
  hats: seq('. . C1 . . . C1 . . . C1 . . C1 . C1 | . . C1 . . . C1 . . . C1 . . C1 . C1').map((v) => !!v),
  snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
  clap: seq('. . . . C1 . . . . . . . C1 . C1 . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
};

// Gameplay is authored against the heard beat, rather than inferred from the
// drum lanes.  The kick/snare parts overlap on this song, and choosing one lane
// at runtime would make the playable pattern change when the mix changes.
// Slots are quarter-note beats; coin entries are intentional rests for the
// action chart.
//
// SIXTEEN BEATS ON ALL THREE, and every loop is a phrase rather than a tic.
//
// These used to be eight beats of jump-coin-jump-coin, which is one bar of one
// idea repeated for ninety seconds: an action on every even beat, forever, and
// the only thing the cabinet ever asked was "again".  A loop as long as the
// song's own two-bar phrase can have a QUESTION and an ANSWER — bars in the
// first half, holes in the second — and rests in it, which the eight-beat
// version had no room for at all.
//
// AND THE ANSWER IS A HOLE.  `pit` is the beat lane cutting its own break in
// the floor, sized in beats and centred in the jump that clears it (pitLayout
// in game/beatchart.js), so the chart's holes repeat with the song the way its
// bars do.  It is the one hazard here that is fatal, and that is the point: a
// beat cabinet is the honest home for a timed jump, because the timing is being
// played to you.  The margin either side of the beat is wider than the window
// the same jump is SCORED in — the validator refuses a chart where it is not —
// so a jump good enough to keep the combo is a jump that lands.
//
// The stages ramp in holes rather than in speed: two, then four, then four with
// the ducks still running underneath.  See stages.js for the crossing, which is
// a different animal — a break too wide to jump, taken on stones.
//
// AND A COIN SLOT MAY BE A FILL.  A spread of `...eighth`, `...sixteenth` or
// `...thirtysecond` lays that many coins across the beat instead of one on the
// line, and because the coin sting climbs a step per coin off the running
// combo, taking one plays the figure in the song's own time.
//
// QUARTERS ARE THE GROUND, and the shorter the note the rarer it is: most coin
// slots are one coin on the line, the eighths come round every other loop, the
// sixteenths less often than that, and a 32nd is a `every: 8` event — eight
// coins in three quarters of a beat, twice in a stage.  `every` counts loop
// passes rather than drawing from the RNG, so a fill arrives on a schedule and
// can be learned, which is the same argument the charts themselves are built on.
//
// A FILL IS FOLLOWED BY A REST, and that is what makes it four notes rather
// than five.  The slot after a fill may not be a coin: the last sixteenth is a
// quarter-beat from the next slot line, so a coin standing there is the fifth
// note of an even run and the figure stops being the burst it was authored as.
// That is most of what decides where these can go, along with the rule they may
// not break at all — never in front of a hole.  The validator refuses that one
// outright (COIN_RUN_PIT_CLEAR_SEC), because a row of pickups running up to a
// lip is a lure toward the one hazard here that kills, and between the two
// there is exactly one legal slot in some bars and none in others.
export const beatCharts = {
  1: {
    // TEACH IT IN THAT ORDER: three bars on the beat, a bar of nothing, then the
    // first two holes.  The first half is the old chart's lesson (this is where
    // the beat is), the second half spends it.
    loopBeats: 16,
    events: [
      { slot: 0, action: 'jump', type: 'beatBar' },
      { slot: 1, action: 'coin', ...eighth, every: 2 },
      { slot: 2, action: 'jump', type: 'beatBar' }, { slot: 3, action: 'coin' },
      // In the empty bar, where the ear has room for one, and answered by the
      // bar you jump on the beat after it.
      { slot: 4, action: 'coin' }, { slot: 5, action: 'coin', ...sixteenth, every: 2 },
      { slot: 6, action: 'jump', type: 'beatBar' }, { slot: 7, action: 'coin' },
      { slot: 8, action: 'coin' }, { slot: 9, action: 'coin' },
      { slot: 10, action: 'pit' }, { slot: 11, action: 'coin' },
      { slot: 12, action: 'pit' }, { slot: 13, action: 'coin' },
      { slot: 14, action: 'coin' },
      { slot: 15, action: 'coin', ...thirtysecond, every: 8 },
    ],
  },
  2: {
    // The duck arrives, and each half now ends in a pair of holes: duck, bar,
    // hole, hole.  Two strides of the same figure per loop, which is what makes
    // the stage's crossing at 0.70 read as the extension of a phrase the player
    // already knows rather than as a new mechanic in the last third.
    loopBeats: 16,
    events: [
      // The holes on 4, 6, 12 and 14 own every bar end on this stage, so both
      // fills go where a bar OPENS instead — a flourish rather than a pickup.
      { slot: 0, action: 'coin', ...eighth, every: 2 }, { slot: 1, action: 'duck', type: 'drone' },
      { slot: 2, action: 'jump', type: 'beatBar' }, { slot: 3, action: 'coin' },
      { slot: 4, action: 'pit' }, { slot: 5, action: 'coin' },
      { slot: 6, action: 'pit' }, { slot: 7, action: 'coin' },
      { slot: 8, action: 'coin', ...sixteenth, every: 2 }, { slot: 9, action: 'duck', type: 'drone' },
      { slot: 10, action: 'jump', type: 'beatBar' }, { slot: 11, action: 'coin' },
      { slot: 12, action: 'pit' }, { slot: 13, action: 'coin' },
      { slot: 14, action: 'pit' }, { slot: 15, action: 'coin' },
    ],
  },
  3: {
    // The finale states both halves plainly: a bar of ducking under the drones,
    // then a whole bar of holes — four of them, one every other beat, which is
    // the fastest a jump may be asked for twice.  Nothing new is introduced
    // here; the stage is the two things this cabinet taught, at length.
    loopBeats: 16,
    events: [
      { slot: 0, action: 'jump', type: 'beatBar' },
      { slot: 1, action: 'coin', ...eighth, every: 2 },
      { slot: 2, action: 'duck', type: 'drone' }, { slot: 3, action: 'duck', type: 'drone' },
      { slot: 4, action: 'jump', type: 'beatBar' },
      { slot: 5, action: 'coin', ...sixteenth, every: 4 },
      { slot: 6, action: 'duck', type: 'drone' }, { slot: 7, action: 'coin' },
      { slot: 8, action: 'pit' }, { slot: 9, action: 'coin' },
      { slot: 10, action: 'pit' }, { slot: 11, action: 'coin' },
      { slot: 12, action: 'pit' }, { slot: 13, action: 'coin' },
      { slot: 14, action: 'pit' },
      { slot: 15, action: 'coin', ...thirtysecond, every: 8 },
    ],
  },
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -1,
  layers: [{ key: "bass2", from: "bass", independent: true }, { key: "lead2", from: "lead", independent: true }],
  voice: {"kickVoice":"kickEngine","snareVoice":"snareEngine","clapVoice":"clapEngine","hatsVoice":"hatEngine","bassVoice":"simpleSawtooth","bass2Voice":"simpleSawtooth","lead2Voice":"addDrawbarPerc"},
  voiceParams: {"bassVoice":{"label":"Simple Sawtooth","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Sawtooth through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"pwm"},"envelope":{"attack":0.001,"decay":0.302,"sustain":0.88,"release":0.087},"filter":{"type":"lowpass","Q":2.6,"rolloff":-12},"filterEnvelope":{"attack":0.002,"decay":0.895,"sustain":0.4,"release":0.25,"baseFrequency":325,"octaves":3}},"starter":false,"mode":"mono","kind":"tone","level":0.13633238925868216,"peak":1.091973818664629,"songOrigin":"library","songSourceId":"bassVoice"},"bass2Voice":{"label":"Simple Sawtooth","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Sawtooth through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0.043,"sustain":0.88,"release":0.005},"filter":{"type":"lowpass","Q":0.1,"rolloff":-12},"filterEnvelope":{"attack":0.002,"decay":0.12,"sustain":0.4,"release":0.25,"baseFrequency":930,"octaves":0.6}},"starter":false,"mode":"mono","kind":"tone","level":0.11415044023969972,"peak":0.75553464308426,"songOrigin":"library","songSourceId":"bass2Voice"},"lead2Voice":{"label":"Drawbar + Percussion","category":"Organ","homeLane":"organChords","synth":"WNDR-9","dur":7.2,"note":"Bright registration with a third-harmonic pip on the key attack, kept dry so repeated off-beat stabs stay crisp.","additive":{"bars":[0.19,0.32,1,0.78,0.48,0.3,0,0.16,0.1],"attack":0.016,"decay":7.2,"perc":{"ratio":4,"gain":0.72,"attack":0.002,"decay":0.078},"stretch":0,"damp":0.3,"type":"triangle"},"starter":false,"chorus":{"mix":0.16},"humanize":{"pitch":0.0011559128538236596},"kind":"tone","level":0.2674833931135649,"peak":1.1764952849832027,"songOrigin":"library","songSourceId":"lead2Voice"},"kickVoice":{"label":"= Engine Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short highpassed beater click and the 300 Hz knock that lets it read on a phone.","osc":{"type":"sine","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.305,"curve":"exp","gain":1},"knock":0.4,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.31},"id":"kickEngine","kind":"drum","factory":true,"level":0.03437,"peak":0.7966},"snareVoice":{"label":"= Engine Snare","category":"Snare","homeLane":"snare","dur":1,"note":"The game’s own snare: a 2.6 kHz band of noise with a triangle body falling 210 to 140 Hz under it. The backbeat every song was balanced against.","osc":{"type":"triangle","from":210,"to":140,"sweep":0.05,"decay":0.1031,"curve":"exp","gain":0.375},"noise":{"type":"bandpass","freq":2600,"Q":0.7,"decay":0.1437,"gain":1},"id":"snareEngine","kind":"drum","factory":true,"level":0.015394,"peak":0.5414},"clapVoice":{"label":"= Engine Clap","category":"Clap","homeLane":"clap","dur":1,"note":"The game’s own clap: three highpassed bursts twelve milliseconds apart, the LAST of them the loudest and four times as long — two slaps, then the room.","noise":{"type":"highpass","freq":1500,"Q":1,"decay":0.0544,"gain":1},"taps":[0,0.012,0.024],"tapGains":[1,1,1.625],"tapDecays":[0.0544,0.0544,0.2092],"id":"clapEngine","kind":"drum","factory":true,"level":0.052286,"peak":1.0679},"hatsVoice":{"label":"= Engine Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.02664,"peak":0.8382}},
  lanes: {
    lead: { gain: -2.6, send: { delay: 0.28, reverb: 0.446 }, effects: [{ id: "chorus2", params: { width: 0.38 } }, { id: "autopanner", params: { rateDivision: 32, depth: 0.54 } }] },
    bass: { gain: -4.32 },
    bass2: { gain: -4.88 },
    lead2: { gain: -6.4, send: { delay: 0.28, reverb: 0.121 } },
    snare: { gain: 2.112, send: { reverb: 0.65 } },
    hats: { gain: 2.592, pan: -0.301, send: { reverb: 0.225 } },
    clap: { pan: 0.201, send: { reverb: 0.615 } },
    kick: { send: { reverb: 0.391 } },
  },
};

export const arrangement = {
  order: [
    {
      s: 3,
      bars: 1,
      off: ["bass","bass2","lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      off: ["bass","bass2","lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      off: ["bass","bass2","lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 2,
      bars: 1,
      from: 1,
      off: ["bass","bass2","lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 3,
      bars: 1,
      off: ["bass2","lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 2,
      bars: 1,
      from: 1,
      off: ["bass2","lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 3,
      bars: 1,
      off: ["bass2","lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 4,
      bars: 1,
      from: 1,
      off: ["bass2","lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      off: ["lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 5,
      bars: 1,
      from: 1,
      off: ["lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      off: ["lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      off: ["lead","lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      off: ["lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      off: ["lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      off: ["lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      off: ["lead2"],
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      transpose: {
        bass: 3,
        bass2: 3,
        lead: 3,
        lead2: 3,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      transpose: {
        bass: 3,
        bass2: 3,
        lead: 3,
        lead2: 3,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      transpose: {
        bass: 3,
        bass2: 3,
        lead: 3,
        lead2: 3,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      transpose: {
        bass: 3,
        bass2: 3,
        lead: 3,
        lead2: 3,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      transpose: {
        bass: 6,
        bass2: 6,
        lead: 6,
        lead2: 6,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      transpose: {
        bass: 6,
        bass2: 6,
        lead: 6,
        lead2: 6,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      transpose: {
        bass: 6,
        bass2: 6,
        lead: 6,
        lead2: 6,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      transpose: {
        bass: 6,
        bass2: 6,
        lead: 6,
        lead2: 6,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      transpose: {
        bass: -3,
        bass2: -3,
        lead: -3,
        lead2: -3,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      transpose: {
        bass: -3,
        bass2: -3,
        lead: -3,
        lead2: -3,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      transpose: {
        bass: -3,
        bass2: -3,
        lead: -3,
        lead2: -3,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      transpose: {
        bass: -3,
        bass2: -3,
        lead: -3,
        lead2: -3,
      },
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 1,
      bars: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
    {
      s: 0,
      bars: 1,
      from: 1,
      offset: {
        bass2: 2,
        lead2: 4,
      },
    },
  ],
  sections: [
    {
      bass2: seq('. . . . . . . . . . . . . . . . | F2 . F2 . C2 . A1 . G1 . G2 . B2 . D3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | C5 . . . C5 . . . . A4min . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[null,1,1],null,null,null,[null,1,1],null,null,null,null,[null,1,1],null,null,null,null,null,null],
    },
    {
      bass2: seq('C2 . C2 . G2 . E2 . C2 . C2 . A2 . G2 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('C5 . . . C5 . . . . A4min . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [[null,1,1],null,null,null,[null,1,1],null,null,null,null,[null,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass2: seq('. . . . . . . . . . . . . . . . | F2 . F2 . C2 . A1 . G1 . G2 . B2 . D3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | C5 . . . C5 . . . . A4min . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[null,1,1],null,null,null,[null,1,1],null,null,null,null,[null,1,1],null,null,null,null,null,null],
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass2: seq('C2 . C2 . G2 . E2 . C2 . C2 . A2 . G2 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('C5 . . . C5 . . . . A4min . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [[null,1,1],null,null,null,[null,1,1],null,null,null,null,[null,1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass2: seq('. . . . . . . . . . . . . . . . | F2 . F2 . C2 . A1 . G1 . G2 . B2 . D3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | C5 . . . C5 . . . . A4min . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[null,1,1],null,null,null,[null,1,1],null,null,null,null,[null,1,1],null,null,null,null,null,null],
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
    },
    {
      bass2: seq('. . . . . . . . . . . . . . . . | F2 . F2 . C2 . A1 . G1 . G2 . B2 . D3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | C5 . . . C5 . . . . A4min . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[null,1,1],null,null,null,[null,1,1],null,null,null,null,[null,1,1],null,null,null,null,null,null],
      hats: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . C1 C1 C1 C1').map((v) => !!v),
    },
  ],
  loop: {
    startBar: 9,
    fromBar: 9,
    toBar: 40,
  },
};

export const variants = null;

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
