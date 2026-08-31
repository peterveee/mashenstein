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

// FIXED MELODIES, MOVING HARMONY.  That is the whole design, and it was the
// original song's design before it was anyone's intention: the first version of
// this file played one C arpeggio, unchanged, over a bass that walked I-IV-V
// underneath.  A long detour re-pitched the melody to chase every chord, and
// what came back sounded like homework.  The figure staying put while the ground
// moves under it is what an ear can hold onto for ninety seconds — so now it is
// the stated architecture rather than a happy accident.
//
// TWO FIGURES, SIXTEEN BARS EACH.  Cycle one is the song's ORIGINAL lead,
// verbatim — the arpeggio the coin fills were authored against.  Cycle two is
// the Popcorn hook: six staccato eighths and a beat of nothing, our own pitches,
// on the cabinet whose entire joke is that it owns the rights to rhythm and will
// invoice you per jump.  Each figure bends exactly once, in the last bar of its
// cycle — the arp grows a scale-wise climbing tail, the hook fills its rest with
// two pickup eighths — and snaps back for the next.
//
// THE BED IS A DOO-WOP TURNAROUND IN C, one chord per half-bar, chosen by ear
// from three rendered options:
//
//     A cell   C  Am  F  G       I  vi  IV  V   — the turnaround itself
//     B cell   C  Am  Dm G       I  vi  ii  V   — the ii variant
//     C cell   F  F   G  G       IV IV  V   V   — the pre-cadence climb
//     D cell   F  G   C  C       IV V   I   I   — the arrival
//
//     sixteen bars: A A B A | A B C D
//
// The chart loops every four bars, so its passes land on different cells and the
// same actions never sit on the same harmony twice running — which was the
// original complaint about this cabinet, answered in the bed rather than in the
// tune.
//
// EVERY CHORD IS SAFE UNDER BOTH FIGURES, BY CONSTRUCTION.  The pool is C, Am,
// F, G and Dm because those five are consonant under both melodies — the arp
// reads as C6, Am7, Fmaj9, G9sus-colour and Dm9 against them; the hook as
// 13-5-3-9, root-b7-5-11, 3-9-maj7-13, 9-root-13-5 and 5-11-9-root.  Em fails
// under the arp and E major needs the G# this song no longer contains, so
// neither appears in any cell.  Sevenths with the plain triad saved for the V —
// three rich chords then one open one that pulls home — is the shop themes'
// signature and is kept here.
//
// THE BASS RUNS STRAIGHT EIGHTHS, low root then the octave above it, changing
// root when the chord changes and never a beat before it.  With nothing in the
// line but the sounding chord's root in two octaves, there is no arrangement of
// it that can drift out of key.  It briefly tried to be a 3-3-2 tresillo; the
// melodies live entirely on even sixteenths and a tresillo's signature hits are
// odd, so the two only ever blurred.  Straight eighths land under every melody
// note and keep driving through the Popcorn bar's rest.
//
// THE ORGAN IS A BED, AND IT IS MEANT TO BE PLAIN.  One sustained chord per
// half-bar, struck where the chord changes, held for as long as the chord lasts.
// What this lane DOES beyond stating the harmony belongs to the desk, not to the
// file — a syncopation baked into the composition is one that has to be undone
// before anything else can be tried.
//
// THE FLOOR STAYS PUT.  beatchart.js reads `bpm` and nothing else — no drum lane
// is referenced anywhere in it — so the kick could be syncopated freely.  It is
// not: with the melody and bass carrying the motion, the four-on-the-floor kick
// and the on-beat closed hat are the player's audible quarter-note grid, and
// this is the cabinet where a fatal jump is timed to it.
export const bank = {
  bpm: 124,
  musicTrim: 1.05,
  // The riser and the crash arrive at their engine defaults 31 and 8 dB under the
  // clap — `b.sweepGain ?? 0.013` and `b.crashGain ?? 0.15` (audio.js:6275, :6646).
  // The desk's faders stop at +6, so the distance is made up here, where the lane's
  // own trim lives. Measured against the clap, not guessed: see work/local.
  crashGain: 0.48,
  sweepGain: 0.34,
  bass: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
  lead: seq('C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . . | C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . .'),
  kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
  hats: seq('C1 . . . C1 . . . C1 . . . C1 C1 . C1 | C1 . . . C1 . . . C1 . . . C1 C1 . C1').map((v) => !!v),
  ohats: seq('. . C1 . . . C1 . . . C1 . . . C1 . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
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
// slots are one coin on the line, the eighths play every loop, the sixteenths
// every other one, and a 32nd is an `every: 4` event — eight coins in three
// quarters of a beat, a handful of times a stage.  `every` counts loop passes
// rather than drawing from the RNG, so a fill arrives on a schedule and can be
// learned, which is the same argument the charts themselves are built on.
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
      { slot: 1, action: 'coin', ...eighth },
      { slot: 2, action: 'jump', type: 'beatBar' }, { slot: 3, action: 'coin' },
      // In the empty bar, where the ear has room for one, and answered by the
      // bar you jump on the beat after it.
      { slot: 4, action: 'coin' }, { slot: 5, action: 'coin', ...sixteenth, every: 2 },
      { slot: 6, action: 'jump', type: 'beatBar' }, { slot: 7, action: 'coin' },
      { slot: 8, action: 'coin' }, { slot: 9, action: 'coin' },
      { slot: 10, action: 'pit' }, { slot: 11, action: 'coin' },
      { slot: 12, action: 'pit' }, { slot: 13, action: 'coin' },
      { slot: 14, action: 'coin' },
      { slot: 15, action: 'coin', ...thirtysecond, every: 4 },
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
      { slot: 0, action: 'coin', ...eighth }, { slot: 1, action: 'duck', type: 'drone' },
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
      { slot: 1, action: 'coin', ...eighth },
      { slot: 2, action: 'duck', type: 'drone' }, { slot: 3, action: 'duck', type: 'drone' },
      { slot: 4, action: 'jump', type: 'beatBar' },
      { slot: 5, action: 'coin', ...sixteenth, every: 2 },
      { slot: 6, action: 'duck', type: 'drone' }, { slot: 7, action: 'coin' },
      { slot: 8, action: 'pit' }, { slot: 9, action: 'coin' },
      { slot: 10, action: 'pit' }, { slot: 11, action: 'coin' },
      { slot: 12, action: 'pit' }, { slot: 13, action: 'coin' },
      { slot: 14, action: 'pit' },
      { slot: 15, action: 'coin', ...thirtysecond, every: 4 },
    ],
  },
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -1,
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }],
  layers: [{ key: "bass3", from: "bass", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead2", independent: true }, { key: "lead8", from: "lead3", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "tom2", from: "tom", independent: true }, { key: "rim2", from: "rim", independent: true }, { key: "lead7", from: "lead", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","rim2","tom2","bass","bass3","lead","lead2","lead3","lead4","lead5","lead6","sweeps"],
  voice: {"kickVoice":"kickMegamix","snareVoice":"gameBoySnare","clapVoice":"bigRoomClap","hatsVoice":"hatEngine","bassVoice":"simpleSawtooth","lead2Voice":"addDrawbarPerc","ohatsVoice":"ohatEngine","crashVoice":"crashEngine","lead3Voice":"fmKeys","leadVoice":"toneSquare","bass3Voice":"simpleSawtooth","lead4Voice":"bestPwmStrings","lead5Voice":"toyPiano","lead6Voice":"monoBright","tom2Voice":"cb808Unclamped","rim2Voice":"clvRosewood","lead7Voice":"tngrBlueCathedral","lead8Voice":"fmKeys"},
  voiceParams: {"bassVoice":{"label":"Simple Sawtooth","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Sawtooth through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"pwm"},"envelope":{"attack":0.001,"decay":0.302,"sustain":0.88,"release":0.087},"filter":{"type":"lowpass","Q":2.6,"rolloff":-12},"filterEnvelope":{"attack":0.002,"decay":0.895,"sustain":0.4,"release":0.25,"baseFrequency":325,"octaves":3}},"starter":false,"mode":"poly","kind":"tone","level":0.13633238925868216,"peak":1.091973818664629,"songOrigin":"library","songSourceId":"bassVoice"},"bass2Voice":{"label":"Simple Sawtooth","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Sawtooth through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0.043,"sustain":0.88,"release":0.005},"filter":{"type":"lowpass","Q":0.1,"rolloff":-12},"filterEnvelope":{"attack":0.002,"decay":0.12,"sustain":0.4,"release":0.25,"baseFrequency":930,"octaves":0.6}},"starter":false,"mode":"mono","kind":"tone","level":0.11415044023969972,"peak":0.75553464308426,"songOrigin":"library","songSourceId":"bass2Voice"},"lead2Voice":{"label":"Drawbar + Percussion","category":"Organ","homeLane":"organChords","synth":"WNDR-9","dur":7.2,"note":"Bright registration with a third-harmonic pip on the key attack, kept dry so repeated off-beat stabs stay crisp.","additive":{"bars":[0.13,0.21,0.87,0.78,0.48,0.3,0,0.16,0.23],"attack":0.016,"decay":7.2,"perc":{"ratio":4,"gain":0.72,"attack":0.002,"decay":0.078},"stretch":0,"damp":0.3,"type":"triangle"},"starter":false,"chorus":{"mix":0.16},"humanize":{"pitch":0.0011559128538236596},"drive":0,"kind":"tone","level":0.25300510329855075,"peak":1.0584188721238628,"songOrigin":"library","songSourceId":"lead2Voice"},"hatsVoice":{"label":"= Engine Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.02664,"peak":0.8382},"ohatsVoice":{"label":"= Engine Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The game’s own open hat: the same noise a thousand hertz lower, left to sizzle for a fifth of a second.","noise":{"type":"highpass","freq":4200,"Q":1,"decay":0.513,"gain":1.41,"hold":0.011,"color":"blue"},"starter":false,"kind":"drum","level":0.10717629044962945,"peak":1.4846358331639646,"songOrigin":"library","songSourceId":"ohatsVoice"},"crashVoice":{"label":"= Engine Crash","category":"Crash","homeLane":"crash","dur":5,"note":"The game’s own crash: bright on the transient and darkening as it falls, a lowpass closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays off the 2.5-second buffer rather than looping the short one.","noise":{"type":"lowpass","freq":7405,"to":1100,"sweep":1.25,"Q":0.7,"attack":0.005,"decay":1.5743,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"starter":false,"kind":"drum","level":0.06859811349559872,"peak":0.8072301179173565,"songOrigin":"library","songSourceId":"crashVoice"},"lead3Voice":{"label":"FM Keys","category":"Keys","synth":"RMND-2","dur":2.6,"note":"Struck keys, percussive enough to keep a stab from smearing into the next bar.","options":{"harmonicity":4,"modulationIndex":23.1,"oscillator":{"type":"triangle"},"modulation":{"type":"triangle"},"envelope":{"attack":0.006,"decay":2.804,"sustain":0.15,"release":0.8},"modulationEnvelope":{"attack":0.002,"decay":0.142,"sustain":0.1,"release":0.205}},"starter":false,"vibrato":{"depth":0.03},"kind":"tone","level":0.02600204458123549,"peak":0.21778041797154252,"songOrigin":"library","songSourceId":"lead3Voice"},"leadVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.39,"trim":0.4,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"starter":false,"chorus":{"mix":0.34},"filter":{"type":"lowpass","slope":-12,"freq":5815,"to":4000,"Q":2.85,"sweep":0.12,"env":{"attack":0.008}},"drive":0.58,"drivePlace":"pre","kind":"tone","level":0.05088550179402542,"peak":1.1259287753340848,"songOrigin":"library","songSourceId":"leadVoice"},"kickVoice":{"label":"= Megamix Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The hardest front of the three and the shortest tail — it has to cut through every other cabinet playing at once.","osc":{"type":"sine","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.198,"curve":"exp","gain":1.09},"knock":0.48,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.78,"color":"blue"},"trim":-1.15,"starter":false,"kind":"drum","level":0.034087021435833295,"peak":0.8841664834934272,"songOrigin":"library","songSourceId":"kickVoice"},"bass3Voice":{"label":"Simple Sawtooth","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Sawtooth through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.001,"decay":0.091,"sustain":0.88,"release":0.023},"filter":{"type":"lowpass","Q":4.25,"rolloff":-12},"filterEnvelope":{"attack":0.002,"decay":0.528,"sustain":0.4,"release":0.25,"baseFrequency":400,"octaves":4.8}},"starter":false,"mode":"mono","trim":0.7,"transpose":-12,"kind":"tone","level":0.05793865444756241,"peak":0.6820709505835476,"songOrigin":"library","songSourceId":"bassVoice"},"lead4Voice":{"label":"BEST PWM Strings","category":"Orch","synth":"MRDR-3","dur":8,"note":"The string machine. Two pulses whose widths drift at 0.28 and 0.37 Hz — rates chosen not to line up — over a clean saw sub. The shimmer is the two widths passing through each other, which is why they must never share a rate.","layer":{"osc1":{"type":"pulse","width":0.5,"ratio":1,"gain":0.5,"attack":0.136667,"decay":2,"sustain":0.85,"release":1.2,"attackCurve":"lin","unison":2,"spread":9,"stereo":0.85,"pwm":{"type":"sine","rate":0.28,"depth":0.62,"delay":0}},"osc2":{"type":"pulse","width":0.46,"ratio":1,"detune":-7,"gain":0.42,"attack":0.164,"decay":2.2,"sustain":0.82,"release":1.3,"attackCurve":"lin","unison":2,"spread":13,"stereo":0.7,"pwm":{"type":"sine","rate":0.37,"depth":0.58,"delay":0}},"osc3":{"type":"sawtooth","ratio":0.5,"gain":0.2,"attack":0.123,"decay":2.4,"sustain":0.9,"release":1.2,"attackCurve":"lin"}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":3050,"Q":0.55,"track":0.3,"env":{"octaves":1.4,"attack":0.8,"decay":2.4,"sustain":0.6,"release":1}},"vca":{"attack":0.150333,"decay":2.4,"sustain":0.9,"release":1.5,"attackCurve":"lin"}},"vibrato":{"depth":0.07,"rate":4.2,"delay":1.4,"spread":0.11},"starter":false,"chorus":{"mix":0.09},"kind":"tone","level":0.12620082459038015,"peak":0.6694024633631674,"songOrigin":"library","songSourceId":"lead4Voice"},"lead6Voice":{"label":"Bright Mono","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Square through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.004,"decay":0.15,"sustain":0.6,"release":0.2},"filter":{"type":"lowpass","Q":2,"rolloff":-12},"filterEnvelope":{"attack":0.002,"decay":0.12,"sustain":0.4,"release":0.25,"baseFrequency":600,"octaves":3.2}},"starter":false,"transpose":-12,"kind":"tone","level":0.07051105064254232,"peak":0.8377062429278156,"songOrigin":"library","songSourceId":"lead6Voice"},"snareVoice":{"label":"Game Boy Snare","category":"Snare","dur":0.5,"note":"Pink-noise crack with a square body dropping 2.3k to 80 — the handheld backbeat, chokeable against the other arcade drums.","osc":{"type":"square","from":2345,"to":80,"sweep":0.37,"decay":0.37,"gain":1.02},"noise":{"type":"bandpass","freq":3710,"Q":2.85,"decay":0.905,"gain":1.98,"color":"pink"},"trim":1.9,"monoGroup":"1","starter":false,"id":"gameBoySnare","kind":"drum","user":true,"level":0.086707,"peak":1.1273},"clapVoice":{"label":"Big Room Clap","category":"Clap","dur":1,"note":"Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants space in the arrangement.","noise":{"type":"bandpass","freq":1500,"Q":0.9,"decay":0.355,"gain":0.88},"taps":[0,0.014,0.028,0.048],"tapFalloff":0.82,"tapDetune":0.94,"tapTone":0.97,"starter":false,"trim":3,"id":"bigRoomClap","kind":"drum","user":true,"level":0.018317,"peak":0.354},"lead5Voice":{"label":"Toy Piano","category":"Bells","synth":"RMND-2","dur":2,"note":"Inharmonic and small, with a knock in the attack. Cardboard Kingdom material.","options":{"harmonicity":4.02,"modulationIndex":6,"oscillator":{"type":"triangle"},"modulation":{"type":"square"},"envelope":{"attack":0.001,"decay":0.5,"sustain":0.02,"release":0.5},"modulationEnvelope":{"attack":0.001,"decay":0.1,"sustain":0,"release":0.1}},"id":"toyPiano","kind":"tone","factory":true,"level":0.013277,"peak":0.2149},"tom2Voice":{"label":"Cowbell · 808 Unclamped","category":"Perc","homeLane":"tom","dur":2,"note":"The actual TR-808 topology — 540 and 800 Hz squares through a 1.3 kHz bandpass at Q4 — with the 200 ms hardware gate taken off. Same front as the factory bell, three and a half times the ring, with a controlled resonant tail.","metal":{"wave":"square","freq":540,"ratios":[1,1.481481],"count":2,"spread":1,"filter":"bandpass","hp":1300,"Q":4,"slope":-12,"attack":0,"decay":0.88,"sag":0.34,"sagAt":0.03,"gain":1,"resonator":{"feedback":0.95,"drive":1.35,"leak":0.0004}},"drive":0.1,"id":"cb808Unclamped","kind":"drum","factory":true,"level":0.031196,"peak":0.5527},"rim2Voice":{"label":"Clave · Rosewood","category":"Perc","homeLane":"rim","dur":0.5,"note":"A lower, rounder pair of sticks: the body drops to 1.85 kHz for the wood and a narrow resonator at 2.5 kHz puts the snap back on top of it. Warmer than the 808 and closer to the thing being hit.","osc":{"type":"triangle","from":1900,"to":1790,"sweep":0.016,"curve":"exp","attack":0.0006,"decay":0.075,"gain":0.9},"ring":{"freq":2500,"Q":70,"hit":0.001,"decay":0.045,"gain":0.6},"tone":{"type":"lowpass","freq":5200,"Q":0.7},"id":"clvRosewood","kind":"drum","factory":true,"level":0.018292,"peak":0.6126},"lead7Voice":{"label":"Blue Cathedral","category":"Pad","synth":"TNGR-2","dur":8,"note":"A long organ-shift and octave-cascade pad with a dignified release.","tngr2":{"oscA":{"table":"vowelAEIOU","position":0.12,"envAmount":0.5,"level":0.74,"unison":2,"spread":8,"stereo":0.26},"oscB":{"table":"choirBreath","position":0.18,"envAmount":0.41,"level":0.22,"unison":1,"spread":11,"interval":-12},"amp":{"attack":0.023,"decay":3.612,"sustain":1,"release":0.023},"positionEnv":{"attack":1.8,"decay":3.8,"sustain":0.5},"filter":{"type":"lowpass","cutoff":2490,"resonance":1.68},"filterEnv":{"amount":0.7,"attack":1,"decay":3.353,"sustain":0.54},"master":{"gain":0.52},"lfo1":{"rate":0.01}},"starter":false,"vibrato":{"depth":0.01,"delay":0.007},"mode":"legato","portamento":0.117,"kind":"tone","level":0.043193,"peak":0.1636,"songOrigin":"library","songSourceId":"lead7Voice"},"lead8Voice":{"label":"FM Keys","category":"Keys","synth":"RMND-2","dur":2.6,"note":"Struck keys, percussive enough to keep a stab from smearing into the next bar.","options":{"harmonicity":4,"modulationIndex":23.1,"oscillator":{"type":"triangle"},"modulation":{"type":"triangle"},"envelope":{"attack":0.006,"decay":2.804,"sustain":0.15,"release":0.8},"modulationEnvelope":{"attack":0.002,"decay":0.142,"sustain":0.1,"release":0.205}},"starter":false,"vibrato":{"depth":0.03},"kind":"tone","level":0.02600204458123549,"peak":0.21778041797154252,"songOrigin":"library","songSourceId":"lead3Voice"}},
  lanes: {
    lead: { gain: -6.08, send: { delay: 0.033, reverb: 0.446 }, effects: [{ id: "compressor", params: { inputGain: 0, threshold: -24, ratio: 5, attack: 0.008, release: 0.12, outputGain: 0 } }, { id: "chorus2", params: { width: 0.38 } }, { id: "autopanner", params: { rateDivision: 32, depth: 0.54 } }] },
    bass: { gain: -4.8 },
    lead2: { gain: -9.84, pan: 0.26, send: { delay: 0.28, reverb: 0.121 } },
    snare: { gain: 3.6, send: { reverb: 0.024 }, eq: { high: 5.7 } },
    hats: { gain: 3.2, pan: -0.401, send: { reverb: 0.225 } },
    ohats: { gain: 6, pan: -0.403, send: { reverb: 0.3 }, eq: { high: 1.1 } },
    clap: { pan: 0.201, send: { reverb: 0.577 } },
    kick: { gain: 2.544, send: { reverb: 0.034 }, eq: { low: 1.5 }, effects: [{ id: "compressor", params: { inputGain: 0, threshold: -24, ratio: 5, attack: 0.008, release: 0.12, outputGain: 0 } }] },
    crash: { gain: 0.624, pan: 0.657, send: { delay: 0.489, reverb: 0.5 } },
    sweeps: { send: { delay: 0.24, reverb: 0.4 } },
    lead3: { gain: -3.04, pan: -0.255, eq: { low: -12.6, mid: -4.8, high: 3.4 }, effects: [{ id: "pingpong", params: { division: 0.25 } }, { id: "rhythmgate", params: { attack: 0.001, decay: 0.06, gateLength: 0.54 } }], noteFx: {"strum":{"enabled":false,"direction":"up","gapMs":18},"arp":{"enabled":true,"direction":"diverge","rate":1,"octaves":3,"limit":0,"rangeLimit":false,"rangeLo":48,"rangeHi":72,"repeat":true,"gate":80,"retrigger":"chord","latch":false}} },
    bass3: { gain: -4.72 },
    lead4: { gain: -4.48, effects: [{ id: "doubler" }] },
    lead5: { gain: -4.48, eq: { high: 4.7 }, effects: [{ id: "pingpong", params: { feedback: 0.39, division: 1 } }], noteFx: {"strum":{"enabled":false,"direction":"up","gapMs":18},"arp":{"enabled":true,"direction":"up","rate":0.5,"octaves":4,"limit":0,"rangeLimit":false,"rangeLo":48,"rangeHi":72,"repeat":false,"gate":80,"retrigger":"chord","latch":false}} },
    lead6: { gain: 1.6, send: { delay: 0.197, reverb: 0.187 }, eq: { low: -4 }, effects: [{ id: "autopanner", params: { rateDivision: 2 } }] },
    tom2: { gain: -7, pan: 0.382, send: { reverb: 0.119 }, eq: { high: 1.9 } },
    rim2: { gain: -8.3, pan: 0.646, send: { reverb: 0.202 }, eq: { high: 2.3 } },
    lead7: { gain: 4.368, send: { delay: 0.726, reverb: 0.473 }, eq: { high: 3.9 } },
    lead8: { gain: 0.768, pan: -0.303, eq: { low: -12.6, mid: -4.8, high: 3.4 }, effects: [{ id: "pingpong", params: { division: 0.25 } }, { id: "rhythmgate", params: { attack: 0.001, decay: 0.06, gateLength: 0.54 } }, { id: "autopanner" }], noteFx: {"strum":{"enabled":false,"direction":"up","gapMs":18},"arp":{"enabled":true,"direction":"diverge","rate":1,"octaves":3,"limit":0,"rangeLimit":false,"rangeLo":48,"rangeHi":72,"repeat":true,"gate":80,"retrigger":"chord","latch":false}} },
  },
};

export const arrangement = {
  order: [
    {
      s: 24,
      bars: 1,
      off: ["bass","bass3","lead","lead2","lead3","lead8"],
    },
    {
      s: 30,
      bars: 1,
      from: 1,
      off: ["bass","bass3","lead","lead2","lead3","lead8"],
    },
    {
      s: 26,
      bars: 1,
      off: ["bass","bass3","lead","lead2","lead3","lead8"],
    },
    {
      s: 27,
      bars: 1,
      from: 1,
      off: ["bass","bass3","lead","lead2","lead3","lead8"],
    },
    {
      s: 24,
      bars: 1,
      off: ["lead","lead2"],
    },
    {
      s: 31,
      bars: 1,
      from: 1,
      off: ["lead","lead2"],
    },
    {
      s: 28,
      bars: 1,
      off: ["lead","lead2"],
    },
    {
      s: 29,
      bars: 1,
      from: 1,
      off: ["lead","lead2"],
    },
    {
      s: 21,
      bars: 1,
      off: ["lead2","lead3","lead8"],
    },
    {
      s: 3,
      bars: 1,
      from: 1,
      off: ["lead2","lead3","lead8"],
    },
    {
      s: 24,
      bars: 1,
      off: ["lead2","lead3","lead8"],
    },
    {
      s: 25,
      bars: 1,
      from: 1,
      off: ["lead2","lead3","lead8"],
    },
    {
      s: 19,
      bars: 1,
      off: ["lead","lead3","lead8"],
    },
    {
      s: 1,
      bars: 1,
      from: 1,
      off: ["lead","lead3","lead8"],
    },
    {
      s: 18,
      bars: 1,
      off: ["lead"],
    },
    {
      s: 32,
      bars: 1,
      from: 1,
      off: ["lead"],
    },
    {
      s: 38,
      bars: 1,
      off: ["lead3","lead8"],
    },
    {
      s: 39,
      bars: 1,
      from: 1,
      off: ["lead3","lead8"],
    },
    {
      s: 40,
      bars: 1,
      off: ["lead3","lead8"],
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        bass3: 2,
        lead8: 2,
      },
    },
    {
      s: 41,
      bars: 1,
      from: 1,
      off: ["lead3","lead8"],
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        bass3: 2,
        lead8: 2,
      },
    },
    {
      s: 34,
      bars: 1,
    },
    {
      s: 0,
      bars: 1,
      from: 1,
    },
    {
      s: 35,
      bars: 1,
    },
    {
      s: 42,
      bars: 1,
      from: 1,
    },
    {
      s: 34,
      bars: 1,
    },
    {
      s: 0,
      bars: 1,
      from: 1,
    },
    {
      s: 35,
      bars: 1,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        bass3: 2,
        lead8: 2,
      },
    },
    {
      s: 36,
      bars: 1,
      from: 1,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        bass3: 2,
        lead8: 2,
      },
    },
    {
      s: 20,
      bars: 1,
      off: ["lead7"],
    },
    {
      s: 2,
      bars: 1,
      from: 1,
      off: ["lead7"],
    },
    {
      s: 4,
      bars: 1,
    },
    {
      s: 10,
      bars: 1,
      from: 1,
    },
    {
      s: 13,
      bars: 1,
    },
    {
      s: 8,
      bars: 1,
      from: 1,
    },
    {
      s: 11,
      bars: 1,
    },
    {
      s: 12,
      bars: 1,
      from: 1,
    },
    {
      s: 22,
      bars: 1,
    },
    {
      s: 23,
      bars: 1,
      from: 1,
    },
    {
      s: 37,
      bars: 1,
    },
    {
      s: 33,
      bars: 1,
      from: 1,
    },
    {
      s: 15,
      bars: 1,
    },
    {
      s: 5,
      bars: 1,
      from: 1,
    },
    {
      s: 14,
      bars: 1,
    },
    {
      s: 6,
      bars: 1,
      from: 1,
    },
    {
      s: 16,
      bars: 1,
    },
    {
      s: 7,
      bars: 1,
      from: 1,
    },
    {
      s: 17,
      bars: 1,
    },
    {
      s: 9,
      bars: 1,
      from: 1,
    },
  ],
  sections: [
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .'),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      lead7: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2093.004522404789],null,null,null,null,null,null,null,[1975.533205024496],null,null,null,null,null,null,null],
      lead7Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[9.975497],null,null,null,null,null,null,null,[11.389205],null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
    },
    {
      bass: seq('F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 . | . . . . . . . . . . . . . . . .'),
      lead: seq('C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('F3maj7 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 C1 . C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('F3maj7 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 . | . . . . . . . . . . . . . . . .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead7: [[2093.004522404789],null,null,null,null,null,null,null,[1975.533205024496],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [[9.81907],null,null,null,null,null,null,null,[9.912997],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . A5 . . . . . A5 . G5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . E5 . A4 . . . E5 G5 A5 B5'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,3.5633879999999998,null,null,null,1,1,1,1],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead6: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[987.7666025122483,1975.533205024496],[880,1760],[783.9908719634985,1567.981743926997],[659.2551138257398,1318.5102276514797]],
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1.423473,1.423473],[1.423473,1.423473],[1.423473,1.423473],[1.423473,1.423473]],
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .'),
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . A5 . . . . . A5 . G5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .'),
      lead4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[15.951527,15.951527,15.951527],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . A5 . . . . . A5 . G5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .'),
      lead: seq('. . . . . . . . . . . . . . . . | A5 . G5 . A5 . E5 . D5 . A5 . D5 . E5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | C4maj7 . . . . . . . C4maj7 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      sweeps: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      lead3: chordSeq('. . . . . . . . . . . . . . . . | C4maj7 . . . . . . . C4maj7 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .'),
      lead4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[164.81377845643496,261.6255653005986],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[15.912642,15.794567],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . C1 C1').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .'),
      lead: seq('. . . . . . . . . . . . . . . . | C5 . E5 G5 C5 . E5 G5 . G4 A4 B4 C5 D5 E5 G5'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | C4maj7 . . . . . . . C4maj7 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      sweeps: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . C1 . C1 C1 C1 C1').map((v) => !!v),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,1.563388,1.563388,1.563388,1.563388,1.563388,1.563388],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | C4maj7 . . . . . . . C4maj7 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .'),
      lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . G4 A4 B4 C5 D5 E5 G5'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,1.563388,1.563388,1.563388,1.563388,1.563388,1.563388],
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 C1 C1 C1').map((v) => !!v),
      lead7: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2093.004522404789],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[16.939453],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A5 . E5 . D5 . E5 . A4 . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,2.945313,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . E5 . A4 . . . E5 G5 A5 B5'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,3.5633879999999998,null,null,null,1,1,1,1],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      lead6: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[659.2551138257398,1318.5102276514797],[783.9908719634985,1567.981743926997],[880,1760],[987.7666025122483,1975.533205024496]],
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1.423473,1.423473],[1.423473,1.423473],[1.423473,1.423473],[1.423473,1.423473]],
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
    },
    {
      lead: seq('A5 . E5 . D5 . A5 . . . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . E5 . D5 . E5 . A4 . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,2.945313,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('A5 . E5 . D5 . A5 . . . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 . | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . E5 . D5 . A5 . . . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('F3maj7 . . . . . . . F3maj7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('F3maj7 . . . . . . . F3maj7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 . | . . . . . . . . . . . . . . . .'),
      lead4: chordSeq('F3maj7 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [[15.822443,15.822443,15.822443,15.822443],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 . | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . E5 . D5 . A5 . . . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('F3maj7 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 C1 . C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: chordSeq('F3maj7 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 . | . . . . . . . . . . . . . . . .'),
      lead4: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [8,null,null,null,null,null,null,null,[23.769886,23.751953,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead8: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead8Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('F3maj7 . . . . . . . F3maj7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('F3maj7 . . . . . . . F3maj7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 . | . . . . . . . . . . . . . . . .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead7: [[2093.004522404789],null,null,null,null,null,null,null,[1975.533205024496],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [[9.5625],null,null,null,null,null,null,null,[9.300604],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . E5 . D5 . A5 . . . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . A5 . . . . . A5 . G5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1,1.563388,1.563388,null,1,1.563388,null,1.563388,1,1.563388,1,1.563388,null,1],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . C1 . C1 . C1 .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . C1 . C1 . C1 . C1 .').map((v) => !!v),
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      lead: seq('. . . . . . . . . . . . . . . . | C5 . E5 G5 C5 . E5 G5 . A4 G#5 C5 C6 E5 . E6'),
    },
    {
      bass: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      tom2: seq('. . . . . . . . . . . . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      rim2: seq('. . . . . . C1 . . . C1 . . . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      tom2: seq('. . . . . . . . . . . . . . . . | C1 . . C1 C1 . C1 C1 . . . . C1 C1 . C1').map((v) => !!v),
      rim2: seq('. . . . . . . . . . . . . . . . | . . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 .').map((v) => !!v),
    },
    {
      bass: seq('F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('F3maj7 . . . . . . . F3maj7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass3: seq('F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 . | . . . . . . . . . . . . . . . .'),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      bass3: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .'),
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      lead5: chordSeq('. . . . . . . . . . . . . . . . | . . . . . . . . . A4min . . . . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6.809837,6.809837,6.809837],null,null,null,null,null,null],
      lead8: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . E5 . A4 . . . E5 G5 A5 B5'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,3.5633879999999998,null,null,null,1,1,1,1],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      lead6: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[659.2551138257398,1318.5102276514797],[783.9908719634985,1567.981743926997],[880,1760],[987.7666025122483,1975.533205024496]],
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1.423473,1.423473],[1.423473,1.423473],[1.423473,1.423473],[1.423473,1.423473]],
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
    },
    {
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      lead: seq('A5 . E5 . D5 . E5 . A4 . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,2.945313,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      kick: seq('C1 . . . C1 . . . C1 . C1 . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead4: [[523.2511306011972,783.9908719634985],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [[31,15.45206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,null,null,2.082623,null,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('C5 . . . G5 . . G4 . A4 . E5 . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      lead: seq('. . . . . . . . . . . . . . . . | C5 . . . G5 . . G4 . A4 . E5 . E5 . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,null,null,2.082623,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
    },
    {
      bass: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,null,0.727154,1.563388,null,null,1.563388,null,1.563388,null,null,3.8129729999999995,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('C5 . . G5 G5 . . G4 . A4 . . E5 . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,null,1.563388,1.563388,null,null,1.104995,1.04285,null,1,1,1.563388,1,1.563388,1],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead: seq('. . . . . . . . . . . . . . . . | C5 . . G5 G5 . . G4 A4 . A4 A4 C5 C5 E5 E5'),
      lead5: chordSeq('. . . . . . . . . . . . . . . . | . . . . . . . . . A4min . . . . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6.809837,6.809837,6.809837],null,null,null,null,null,null],
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead5: chordSeq('. . . . . . . . . . . . . . . . | . . . . . . . . . A4min . . . . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6.809837,6.809837,6.809837],null,null,null,null,null,null],
    },
  ],
  choke: {
    hats: "ohats",
  },
  loop: {
    fromBar: 21,
    toBar: 48,
  },
};

export const variants = {
  select: [
    {
      when: "always",
      loop: { fromBar: 1, toBar: 4 },
      treatment: [{ id: "rhythmgate", params: { division: 0.25, gateLength: 0.4, decay: 0.054 } }],
      patch: {
        master: 3.1,
      },
      exit: { quantize: "bar", crossfadeBars: 0, loopRelease: "atTransition" },
    },
  ],
};

// M8TRX is a Mixer-only parked recipe. It is intentionally not a game alternate.
export const m8trx = null;
