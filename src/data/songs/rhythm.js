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
// PAIRS ARE THE GROUND, not quarters.  This read the other way round for a long
// time — most slots one coin on the line, the fills rationed by `every` — and
// what that produced was a lane of lone pickups with a burst in it now and
// then: a coin on its own is not a figure, it is a tick, and a stage made of
// ticks pays about as much attention as it asks for.  So the floor is a PAIR
// (`...eighth`), and the only single coins left in these three charts are the
// ones physics insists on, below.
//
// AND A RUN INTO AN ACTION IS A COUNT-IN.  A slot whose next line is a jump or
// a duck takes the `...sixteenth` — four coins closing on the beat you have to
// answer, which is the oldest way a rhythm game has of telling you where the
// one is, and it plays as a fill rather than as a warning.  Slots that lead to
// another coin stay a pair; the 32nd is the flourish and arrives on a schedule
// (`every` counts loop passes rather than drawing from the RNG, so it can be
// learned — the same argument the charts themselves are built on).
//
// FILLS MAY ABUT.  The old rule was that the slot after a fill may not be a
// coin — the last sixteenth sits a quarter-beat from the next line, so a coin
// there is the fifth note of an even run.  Which is true, and is the point: two
// pairs back to back is a bar of eighths, and a bar of eighths is a phrase.  A
// burst that must be followed by silence is a burst you can only ever deal one
// of.
//
// WHAT THEY MAY NOT DO, ever, is stand in front of a hole.  The validator
// refuses that outright (COIN_RUN_PIT_CLEAR_SEC), because a row of pickups
// running up to a lip is a lure toward the one hazard here that kills — and it
// is the whole of why single coins still exist in these charts.  Every slot on
// the beat before a pit is one coin on the line and can be nothing else: a pair
// puts its second coin half a beat later, which is inside the clearance.
export const beatCharts = {
  1: {
    // TEACH IT IN THAT ORDER: three bars on the beat, a bar of nothing, then the
    // first two holes.  The first half is the old chart's lesson (this is where
    // the beat is), the second half spends it.
    loopBeats: 16,
    events: [
      { slot: 0, action: 'jump', type: 'beatBar' },
      { slot: 1, action: 'coin', ...sixteenth },
      { slot: 2, action: 'jump', type: 'beatBar' }, { slot: 3, action: 'coin', ...eighth },
      // In the empty bar, where the ear has room for one, and answered by the
      // bar you jump on the beat after it.
      { slot: 4, action: 'coin', ...eighth }, { slot: 5, action: 'coin', ...sixteenth },
      { slot: 6, action: 'jump', type: 'beatBar' },
      // THE CARD BOX IS TAUGHT HERE, in the calmest slot the cabinet owns: a
      // bar you jump on 6, then two empty beats, then the stage's first hole on
      // 10.  Shoot on 7 and the box opens on 9 (BOX_BURST_BEATS), which leaves a
      // whole beat of road between the explosion and the lip — so the lesson is
      // never taught over the top of the other one.
      //
      // `every: 3` is the whole of "occasional".  Three passes of a 16-beat loop
      // at 124bpm is 23 seconds, so a 90-second stage deals about four of these;
      // and half the cast never sees one at all, since the lane only lays a box
      // for a hero who can answer it (BeatSpawner.canShoot).
      { slot: 7, action: 'ability', type: 'cardBox', every: 3 },
      { slot: 8, action: 'coin', ...eighth }, { slot: 9, action: 'coin' },
      { slot: 10, action: 'pit' }, { slot: 11, action: 'coin' },
      { slot: 12, action: 'pit' }, { slot: 13, action: 'coin', ...eighth },
      { slot: 14, action: 'coin', ...eighth },
      { slot: 15, action: 'coin', ...thirtysecond, every: 3 },
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
      // A BARREL OPENS THE LOOP, AND ONLY EVERY THIRD TIME ROUND. This is the
      // stage that teaches the kick, and teaching is all it does here: `every:
      // 3` deals three of them across the stage. One a loop was eleven, seven
      // seconds apart, and read as the mechanic rather than as an introduction
      // to it — the player needs enough to learn the timing and few enough that
      // each one is still an event, and this cabinet is not a barrel cabinet.
      //
      // Three rather than the four the cadence suggests: the pass that lands on
      // beat 0 falls in the lane's action-free runway and the one near the end
      // lands on the crossing, which owns its whole phrase. Both are dropped by
      // the lane rather than by the chart, and the judge is told (it asks the
      // lane what it laid, not the chart — RunState.rhythmRequiredAt), so a
      // dropped one is a beat nobody is scored against.
      //
      // It holds slot 0 for the same reason the two-rung drone column used to
      // hold slot 1: this is where being wrong has to cost the beat rather
      // than the run. A barrel is 13 tall and every hero in the cast can hop
      // it, so a player who answers with the jump button clears it and loses
      // only the combo. It rolls AT him, so it is the one hazard on this
      // cabinet you can watch arrive, and the boot sends it back the way it
      // came (OBSTACLES.barrel, and the punt window in beatchart.js). The
      // drone slide is still taught — slot 9 is the full three-rung column,
      // now the only duck here that cannot be jumped at all.
      //
      // Slot 0 rather than 1 because of the spacing table, not taste: a kick
      // wants two beats before the jump on 2 (see REQUIRED_GAP_BEATS), and the
      // hole on 14 wants two before the kick. Nought is the only line in this
      // bar with both. The eighth fill it displaced moves to 1, where the rest
      // after a fill is a jump rather than another coin.
      { slot: 0, action: 'duck', type: 'barrel', every: 3 },
      { slot: 1, action: 'coin', ...sixteenth },
      { slot: 2, action: 'jump', type: 'beatBar' },
      // Duck, bar, SHOOT — and the box goes on 4, half a beat in front of the
      // hero (BOX_LEAD_BEATS), with the first hole a beat behind it on 5. The
      // holes used to sit on 4 and 6, with the round fired across the first
      // gap and the box opening on 5 between them; a box standing 1.5 beats
      // past its shot stands in a hole cut on the next line (the validator
      // refuses it), so both holes moved a beat later. Slot 4 is the single
      // coin physics insists on before a hole, and so is 6 between them.
      { slot: 3, action: 'ability', type: 'cardBox', every: 3 },
      { slot: 4, action: 'coin' }, { slot: 5, action: 'pit' },
      { slot: 6, action: 'coin' }, { slot: 7, action: 'pit' },
      // AND THE SECOND STRIDE SPENDS IT. Slot 0 above is a barrel and can be
      // jumped; this one is the full three rungs, stacked to 50 and over the
      // worst jump in the cast — so the same INPUT comes back half a loop later
      // with the jump-button escape taken off it. Two objects, one button, and
      // the second one is the one that means it.
      // Two beats out of the second hole to the column (pitDuck: 2) — the
      // hero lands from 7 with 8 to get his feet back. A pair rather than the
      // count-in it used to be: the loop's one sixteenth is on 1, into the
      // bar, and with 7 now a hole the pairs need this slot to stay the ground.
      { slot: 8, action: 'coin', ...eighth },
      { slot: 9, action: 'duck', type: 'drone', column: 4 },
      { slot: 10, action: 'jump', type: 'beatBar' }, { slot: 11, action: 'coin' },
      { slot: 12, action: 'pit' }, { slot: 13, action: 'coin' },
      { slot: 14, action: 'pit' }, { slot: 15, action: 'coin', ...eighth },
    ],
  },
  3: {
    // The finale states both halves plainly: a bar of ducking — two drone
    // columns with one of stage 2's barrels between them, two beats apart
    // because a kick needs a fresh press — then a whole bar of holes, four of
    // them, one every other beat, which is the fastest a jump may be asked for
    // twice.  Nothing new is introduced here; the stage is the three things
    // this cabinet taught, at length, and the barrel that came every third loop
    // there comes every second one here.
    loopBeats: 16,
    events: [
      // THE BAR IS GONE FROM THE FINALE, and it is the card box that took it.
      // The four holes used to run 8-10-12-14 with the box shot on 7 and its
      // hole on 8; a box standing 1.5 beats past its shot stands in that hole,
      // so the four holes moved to 9-11-13-15 — and a hole on 15 puts the jump
      // that stood on 0 one beat after a landing, which is a jump asked twice
      // in a beat (pitJump: 2). So 0 is the flourish, landed on, and the loop
      // spends every jump it has on the holes, which is what this stage was
      // always about. The bar is still taught on the two stages before it.
      { slot: 0, action: 'coin', ...thirtysecond, every: 2 },
      { slot: 1, action: 'coin', ...sixteenth },
      // THE BAR OF DUCKING, AND IT IS TWO OBJECTS. Nothing new is introduced on
      // the finale and neither of these is: the column is the stage-2 figure
      // with the jump-button escape taken off it, and the barrel is the thing
      // stage 2 opened with. What IS new is having to read which is which at
      // speed — a drone hangs still and a barrel comes at you. The barrel comes
      // twice as often here as on the stage that taught it and no oftener than
      // that: `every: 2` is one about every fifteen seconds, six across the
      // stage. Every loop was eleven of them, which made the finale read as the
      // barrel stage rather than as the stage where the barrel is one of three
      // things being asked at once.
      //
      // TWO BEATS BETWEEN THEM, and the table insists on it (REQUIRED_GAP_BEATS
      // duckPunt / puntDuck). This bar was drone-barrel-jump on 2-3-4 and it
      // could not be played: the kick needs a FRESH duck press and a player
      // still holding the one that took the drone has a hold time past the punt
      // window before the barrel arrives. Drone on 2, barrel on 4, column on 6
      // is the same figure with room to let go of the button between its
      // halves, and what it cost is the bar that used to stand on 4 — the loop
      // keeps the one on 0 and spends the rest of its jumps on the four holes,
      // which is what this stage was always about.
      { slot: 2, action: 'duck', type: 'drone', column: 4 },
      { slot: 3, action: 'coin', ...eighth },
      { slot: 4, action: 'duck', type: 'barrel', every: 2 },
      { slot: 5, action: 'coin', ...eighth },
      { slot: 6, action: 'duck', type: 'drone', column: 4 },
      // The finale's one card box, and it is the tightest the cabinet asks for:
      // duck on 6, shoot on 7, and the box goes on 8 half a beat ahead of the
      // hero, with the first of the four holes a beat behind it on 9.  It is
      // also the cheapest thing on the stage to decline — a missed box costs
      // the combo and nothing else, and running through one costs not even
      // that (OBSTACLES.cardBox is `pushover`), so the difficulty here is
      // opt-in in a way none of the holes are. Slot 8 is the single coin
      // physics insists on before a hole, and so are 10, 12 and 14.
      { slot: 7, action: 'ability', type: 'cardBox', every: 3 },
      { slot: 8, action: 'coin' }, { slot: 9, action: 'pit' },
      { slot: 10, action: 'coin' }, { slot: 11, action: 'pit' },
      { slot: 12, action: 'coin' }, { slot: 13, action: 'pit' },
      { slot: 14, action: 'coin' }, { slot: 15, action: 'pit' },
    ],
  },
};

// ---- THE DESK WRITES BELOW HERE ----------------------------------------------
// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.

export const mix = {
  master: -1,
  masterEffects: [{ id: "mbCompN", params: { lowFrequency: 180, highFrequency: 1800, "low.threshold": -26, "low.ratio": 4, "low.attack": 0.06, "low.release": 0.22, "low.knee": 8, "mid.threshold": -22, "mid.ratio": 3.5, "mid.attack": 0.018, "mid.release": 0.08, "mid.knee": 12, "high.threshold": -26, "high.ratio": 2.5, "high.attack": 0.01, "high.release": 0.06, "high.knee": 10 } }],
  layers: [{ key: "bass3", from: "bass", independent: true }, { key: "lead2", from: "lead", independent: true }, { key: "lead3", from: "lead2", independent: true }, { key: "lead8", from: "lead3", independent: true }, { key: "lead4", from: "lead", independent: true }, { key: "lead12", from: "lead4", independent: true }, { key: "lead5", from: "lead", independent: true }, { key: "lead6", from: "lead", independent: true }, { key: "lead7", from: "lead", independent: true }, { key: "lead9", from: "lead", independent: true }, { key: "lead10", from: "lead", independent: true }, { key: "lead11", from: "lead", independent: true }, { key: "crash2", from: "crash", independent: true }],
  order: ["kick","snare","clap","hats","ohats","crash","bass","bass3","lead10","lead","lead11","lead2","lead3","lead8","lead4","lead5","lead9","lead6","lead7","sweeps"],
  labels: {"lead":"LEAD Square Tone","bass":"BASSSawtooth","bass3":"BASS TRI","crash2":"Hi Crash"},
  voice: {"kickVoice":"kickMegamix","snareVoice":"gameBoySnare","hatsVoice":"hatEngine","bassVoice":"simpleSawtooth","lead2Voice":"addDrawbarPerc","ohatsVoice":"ohatEngine","crashVoice":"crashEngine","lead3Voice":"fmKeys","leadVoice":"toneSquare","bass3Voice":"simpleSawtooth","lead4Voice":"bestPwmStrings","lead5Voice":"toyPiano","lead6Voice":"monoBright","lead7Voice":"tngrBlueCathedral","lead8Voice":"fmKeys","lead9Voice":"tpTreeTrunk","lead10Voice":"squareTone2","lead11Voice":"amHollow","lead12Voice":"simpleStrings","crash2Voice":"engineCrash"},
  voiceParams: {"bassVoice":{"label":"Simple Sawtooth","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Sawtooth through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"pwm"},"envelope":{"attack":0.001,"decay":0.02,"sustain":0.64,"release":0.018},"filter":{"type":"lowpass","Q":2.6,"rolloff":-12},"filterEnvelope":{"attack":0.002,"decay":0.895,"sustain":0.4,"release":0.25,"baseFrequency":325,"octaves":3}},"starter":false,"mode":"mono","kind":"tone","level":0.09837990430505203,"peak":0.8508517455504696,"songOrigin":"library","songSourceId":"bassVoice"},"bass2Voice":{"label":"Simple Sawtooth","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Sawtooth through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0.043,"sustain":0.88,"release":0.005},"filter":{"type":"lowpass","Q":0.1,"rolloff":-12},"filterEnvelope":{"attack":0.002,"decay":0.12,"sustain":0.4,"release":0.25,"baseFrequency":930,"octaves":0.6}},"starter":false,"mode":"mono","kind":"tone","level":0.11415044023969972,"peak":0.75553464308426,"songOrigin":"library","songSourceId":"bass2Voice"},"lead2Voice":{"label":"Drawbar + Percussion","category":"Organ","homeLane":"organChords","synth":"WNDR-9","dur":7.2,"note":"Bright registration with a third-harmonic pip on the key attack, kept dry so repeated off-beat stabs stay crisp.","additive":{"bars":[0.13,0.21,0.87,0.78,0.48,0.3,0,0.16,0.23],"attack":0.016,"decay":7.2,"perc":{"ratio":4,"gain":0.72,"attack":0.002,"decay":0.078},"stretch":0,"damp":0.3,"type":"triangle"},"starter":false,"chorus":{"mix":0.16},"humanize":{"pitch":0.0011559128538236596},"drive":0,"kind":"tone","level":0.25300510329855075,"peak":1.0584188721238628,"songOrigin":"library","songSourceId":"lead2Voice"},"hatsVoice":{"label":"= Engine Hat","category":"Hats","homeLane":"hats","dur":0.5,"note":"The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty milliseconds. The tick under two thirds of the soundtrack.","noise":{"type":"highpass","freq":5200,"Q":1,"decay":0.0932,"gain":1},"id":"hatEngine","kind":"drum","factory":true,"level":0.02664,"peak":0.8382},"ohatsVoice":{"label":"= Engine Open Hat","category":"Hats","homeLane":"ohats","dur":2,"note":"The game’s own open hat: the same noise a thousand hertz lower, left to sizzle for a fifth of a second.","noise":{"type":"highpass","freq":4200,"Q":1,"decay":0.513,"gain":1.41,"hold":0.011,"color":"blue"},"starter":false,"kind":"drum","level":0.10717629044962945,"peak":1.4846358331639646,"songOrigin":"library","songSourceId":"ohatsVoice"},"crashVoice":{"label":"= Engine Crash","category":"Crash","homeLane":"crash","dur":5,"note":"The game’s own crash: bright on the transient and darkening as it falls, a lowpass closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays off the 2.5-second buffer rather than looping the short one.","noise":{"type":"lowpass","freq":7405,"to":1100,"sweep":1.25,"Q":0.7,"attack":0.005,"decay":1.5743,"gain":1},"tone":{"type":"highpass","freq":1200,"Q":1},"starter":false,"kind":"drum","level":0.06859811349559872,"peak":0.8072301179173565,"songOrigin":"library","songSourceId":"crashVoice"},"lead3Voice":{"label":"FM Keys","category":"Keys","synth":"RMND-2","dur":2.6,"note":"Struck keys, percussive enough to keep a stab from smearing into the next bar.","options":{"harmonicity":4,"modulationIndex":23.1,"oscillator":{"type":"triangle"},"modulation":{"type":"triangle"},"envelope":{"attack":0.006,"decay":2.804,"sustain":0.15,"release":0.8},"modulationEnvelope":{"attack":0.002,"decay":0.142,"sustain":0.1,"release":0.205}},"starter":false,"vibrato":{"depth":0.03},"kind":"tone","level":0.02600204458123549,"peak":0.21778041797154252,"songOrigin":"library","songSourceId":"lead3Voice"},"leadVoice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.144,"waveform":"square","attack":0.001,"release":0.39,"trim":0.4,"vibrato":{"depth":0.04,"rate":10.9,"delay":0.015},"mono":false,"portamento":0,"starter":false,"chorus":{"mix":0},"filter":{"type":"lowpass","slope":-12,"freq":5170,"to":4000,"Q":2.85,"sweep":0.12,"env":{"attack":0.008},"track":0.53},"drive":0.52,"drivePlace":"pre","kind":"tone","level":0.06648570369696345,"peak":1.0680523013388217,"songOrigin":"library","songSourceId":"leadVoice"},"kickVoice":{"label":"= Megamix Kick","category":"Kick","homeLane":"kick","dur":1,"note":"The hardest front of the three and the shortest tail — it has to cut through every other cabinet playing at once.","osc":{"type":"sine","from":165,"to":48,"sweep":0.05,"attack":0.006,"decay":0.198,"curve":"exp","gain":1.09},"knock":0.48,"noise":{"type":"highpass","freq":1900,"Q":1,"decay":0.0198,"gain":0.78,"color":"blue"},"trim":-1.15,"starter":false,"kind":"drum","level":0.034087021435833295,"peak":0.8841664834934272,"songOrigin":"library","songSourceId":"kickVoice"},"bass3Voice":{"label":"Simple Sawtooth","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Sawtooth through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"triangle"},"envelope":{"attack":0.001,"decay":0.016,"sustain":0.62,"release":0.149},"filter":{"type":"lowpass","Q":4.25,"rolloff":-12},"filterEnvelope":{"attack":0.001,"decay":0.528,"sustain":0.4,"release":0.25,"baseFrequency":400,"octaves":4.8}},"starter":false,"mode":"mono","trim":0.7,"transpose":-12,"kind":"tone","level":0.04103923950132841,"peak":0.5144104421308311,"songOrigin":"library","songSourceId":"bassVoice"},"lead4Voice":{"label":"BEST PWM Strings","category":"Orch","synth":"MRDR-3","dur":8,"note":"The string machine. Two pulses whose widths drift at 0.28 and 0.37 Hz — rates chosen not to line up — over a clean saw sub. The shimmer is the two widths passing through each other, which is why they must never share a rate.","layer":{"osc1":{"type":"pulse","width":0.5,"ratio":1,"gain":0.5,"attack":0.136667,"decay":2,"sustain":0.85,"release":1.2,"attackCurve":"lin","unison":2,"spread":9,"stereo":0.85,"pwm":{"type":"sine","rate":0.28,"depth":0.62,"delay":0}},"osc2":{"type":"pulse","width":0.46,"ratio":1,"detune":-7,"gain":0.42,"attack":0.164,"decay":2.2,"sustain":0.82,"release":1.3,"attackCurve":"lin","unison":2,"spread":13,"stereo":0.7,"pwm":{"type":"sine","rate":0.37,"depth":0.58,"delay":0}},"osc3":{"type":"sawtooth","ratio":0.5,"gain":0.2,"attack":0.123,"decay":2.4,"sustain":0.9,"release":1.2,"attackCurve":"lin"}},"global":{"filter":{"type":"lowpass","slope":-12,"freq":3050,"Q":0.55,"track":0.3,"env":{"octaves":1.4,"attack":0.8,"decay":2.4,"sustain":0.6,"release":1}},"vca":{"attack":0.150333,"decay":2.4,"sustain":0.9,"release":1.5,"attackCurve":"lin"}},"vibrato":{"depth":0.07,"rate":4.2,"delay":1.4,"spread":0},"starter":false,"chorus":{"mix":0.09,"width":0.73},"kind":"tone","level":0.1265866416198358,"peak":0.670031805693217,"songOrigin":"library","songSourceId":"lead4Voice"},"lead6Voice":{"label":"Bright Mono","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Square through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.004,"decay":0.15,"sustain":0.6,"release":0.2},"filter":{"type":"lowpass","Q":2,"rolloff":-12},"filterEnvelope":{"attack":0.002,"decay":0.12,"sustain":0.4,"release":0.25,"baseFrequency":600,"octaves":3.2}},"starter":false,"transpose":-12,"kind":"tone","level":0.07051105064254232,"peak":0.8377062429278156,"songOrigin":"library","songSourceId":"lead6Voice"},"snareVoice":{"label":"Game Boy Snare","category":"Snare","dur":0.5,"note":"Pink-noise crack with a square body dropping 2.3k to 80 — the handheld backbeat, chokeable against the other arcade drums.","osc":{"type":"square","from":2345,"to":80,"sweep":0.37,"decay":0.37,"gain":1.02},"noise":{"type":"bandpass","freq":3710,"Q":2.85,"decay":0.905,"gain":1.98,"color":"pink"},"trim":1.9,"monoGroup":"1","starter":false,"id":"gameBoySnare","kind":"drum","user":true,"level":0.086707,"peak":1.1273},"clapVoice":{"label":"Big Room Clap","category":"Clap","dur":1,"note":"Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants space in the arrangement.","noise":{"type":"bandpass","freq":1500,"Q":0.9,"decay":0.355,"gain":0.88},"taps":[0,0.014,0.028,0.048],"tapFalloff":0.82,"tapDetune":0.94,"tapTone":0.97,"starter":false,"trim":3,"id":"bigRoomClap","kind":"drum","user":true,"level":0.018317,"peak":0.354},"lead5Voice":{"label":"Toy Piano","category":"Bells","synth":"RMND-2","dur":2,"note":"Inharmonic and small, with a knock in the attack. Cardboard Kingdom material.","options":{"harmonicity":4.02,"modulationIndex":6,"oscillator":{"type":"triangle"},"modulation":{"type":"square"},"envelope":{"attack":0.001,"decay":0.5,"sustain":0.02,"release":0.5},"modulationEnvelope":{"attack":0.001,"decay":0.1,"sustain":0,"release":0.1}},"id":"toyPiano","kind":"tone","factory":true,"level":0.013277,"peak":0.2149},"tom2Voice":{"label":"Cowbell · 808 Unclamped","category":"Perc","homeLane":"tom","dur":2,"note":"The actual TR-808 topology — 540 and 800 Hz squares through a 1.3 kHz bandpass at Q4 — with the 200 ms hardware gate taken off. Same front as the factory bell, three and a half times the ring, with a controlled resonant tail.","metal":{"wave":"square","freq":540,"ratios":[1,1.481481],"count":2,"spread":1,"filter":"bandpass","hp":1300,"Q":4,"slope":-12,"attack":0,"decay":0.88,"sag":0.34,"sagAt":0.03,"gain":1,"resonator":{"feedback":0.95,"drive":1.35,"leak":0.0004}},"drive":0.1,"id":"cb808Unclamped","kind":"drum","factory":true,"level":0.031196,"peak":0.5527},"rim2Voice":{"label":"Clave · Rosewood","category":"Perc","homeLane":"rim","dur":0.5,"note":"A lower, rounder pair of sticks: the body drops to 1.85 kHz for the wood and a narrow resonator at 2.5 kHz puts the snap back on top of it. Warmer than the 808 and closer to the thing being hit.","osc":{"type":"triangle","from":1900,"to":1790,"sweep":0.016,"curve":"exp","attack":0.0006,"decay":0.075,"gain":0.9},"ring":{"freq":2500,"Q":70,"hit":0.001,"decay":0.045,"gain":0.6},"tone":{"type":"lowpass","freq":5200,"Q":0.7},"id":"clvRosewood","kind":"drum","factory":true,"level":0.018292,"peak":0.6126},"lead7Voice":{"label":"Blue Cathedral","category":"Pad","synth":"TNGR-2","dur":8,"note":"A long organ-shift and octave-cascade pad with a dignified release.","tngr2":{"oscA":{"table":"vowelAEIOU","position":0.12,"envAmount":0.5,"level":0.74,"unison":2,"spread":8,"stereo":0.26},"oscB":{"table":"choirBreath","position":0.18,"envAmount":0.41,"level":0.22,"unison":1,"spread":11,"interval":-12},"amp":{"attack":0.023,"decay":3.612,"sustain":1,"release":0.023},"positionEnv":{"attack":1.8,"decay":3.8,"sustain":0.5},"filter":{"type":"lowpass","cutoff":2490,"resonance":1.68},"filterEnv":{"amount":0.7,"attack":1,"decay":3.353,"sustain":0.54},"master":{"gain":0.52},"lfo1":{"rate":0.01}},"starter":false,"vibrato":{"depth":0.01,"delay":0.007},"mode":"legato","portamento":0.117,"kind":"tone","level":0.043193,"peak":0.1636,"songOrigin":"library","songSourceId":"lead7Voice"},"lead8Voice":{"label":"FM Keys","category":"Keys","synth":"RMND-2","dur":2.6,"note":"Struck keys, percussive enough to keep a stab from smearing into the next bar.","options":{"harmonicity":4,"modulationIndex":23.1,"oscillator":{"type":"triangle"},"modulation":{"type":"triangle"},"envelope":{"attack":0.006,"decay":2.804,"sustain":0.15,"release":0.8},"modulationEnvelope":{"attack":0.002,"decay":0.142,"sustain":0.1,"release":0.205}},"starter":false,"vibrato":{"depth":0.03},"transpose":12,"kind":"tone","level":0.02840807250251848,"peak":0.21392679601116235,"songOrigin":"library","songSourceId":"lead3Voice"},"lead9Voice":{"label":"Tree Trunk","category":"Pluck","synth":"CRLS-1","dur":1,"note":"A short sine knock with a little sustain behind it. Hollow and wooden.","origin":"Tonejs/Presets Synth/TreeTrunk","options":{"oscillator":{"type":"sine"},"envelope":{"attack":0.001,"decay":0.1,"sustain":0.1,"release":1.2}},"starter":false,"transpose":12,"kind":"tone","level":0.03150432399257167,"peak":0.6941501817472355,"songOrigin":"library","songSourceId":"lead9Voice"},"lead10Voice":{"label":"Square Tone","category":"Lead","synth":"KNDO-5","dur":1,"note":"A direct single-oscillator square-wave replacement for the engine voice.","options":{"oscillator":{"type":"square"},"envelope":{"attack":0.001,"decay":0,"sustain":1,"release":0.01,"attackCurve":"exponential"}},"fixedLength":0.132,"waveform":"triangle","attack":0.001,"release":0.008,"trim":0,"vibrato":{"depth":0,"rate":10.9},"mono":false,"portamento":0,"starter":false,"transpose":12,"kind":"tone","level":0.03795465416337589,"peak":0.659832166934868,"songOrigin":"library","songSourceId":"lead10Voice"},"lead11Voice":{"label":"AM Hollow","category":"Lead","synth":"RMND-2","dur":1.2,"note":"Ring-modulated and slightly out of tune with itself. Reads as a voice rather than a synth.","options":{"harmonicity":1,"oscillator":{"type":"triangle"},"modulation":{"type":"pwm"},"envelope":{"attack":0.001,"decay":0.514,"sustain":0.31,"release":1.164},"modulationEnvelope":{"attack":0.004,"decay":2.563,"sustain":0.7,"release":0.3}},"starter":false,"bypassed":{"options.modulationIndex":10},"kind":"tone","level":0.00607079265574354,"peak":0.13228452199413662,"songOrigin":"library","songSourceId":"lead11Voice"},"lead12Voice":{"label":"Simple Strings","category":"Lead","synth":"CRLS-1","dur":1.2,"note":"Cheap stringlike sound","options":{"oscillator":{"type":"fatsawtooth","spread":19,"count":2},"envelope":{"attack":0.006,"decay":0.15,"sustain":0.88,"release":0.367},"filter":{"type":"lowpass","Q":1.6,"rolloff":-12},"filterEnvelope":{"attack":0.007,"decay":0.12,"sustain":0.4,"release":0.25,"baseFrequency":3170,"octaves":1.2}},"starter":false,"vibrato":{"depth":0.03},"id":"simpleStrings","kind":"tone","level":0.0321,"peak":0.3617,"user":true},"crash2Voice":{"label":"= Engine Crash","category":"Crash","homeLane":"crash","dur":5,"note":"The game’s own crash: bright on the transient and darkening as it falls, a lowpass closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays off the 2.5-second buffer rather than looping the short one.","noise":{"type":"lowpass","freq":7370,"to":430,"sweep":2.055,"Q":16.05,"attack":0.0001,"decay":3.078,"gain":1.01,"hold":0.112,"sag":0.23,"color":"violet","sagAt":0.132,"slope":-12},"drive":0,"shape":"crush","tone":{"type":"highpass","freq":20,"Q":0.7},"humanize":{"gain":0,"filter":0,"pitch":0},"starter":false,"trim":0,"bypassed":{"metal":{"wave":"square","freq":800,"spread":1,"count":6,"hp":3000,"Q":0.7,"decay":0.2,"gain":1},"osc":{"type":"sine","from":190,"to":52,"sweep":0.07,"decay":1.324,"curve":"exp","gain":1},"ring":{"type":"bandpass","freq":3885,"Q":40,"hit":0.0185,"decay":0.25,"curve":"exp","gain":1,"sag":0.48,"to":3960}},"knock":0,"mode":"mono","tune":0,"kind":"drum","level":0.14090677576068622,"peak":1.364051558397801,"songOrigin":"library","songSourceId":"crash2Voice"}},
  fx: { reverb: { decay: 0.599 } },
  lanes: {
    lead: { gain: -4.7, send: { delay: 0.033, reverb: 0.446 }, eq: { high: 2.9 }, effects: [{ id: "compressor", params: { inputGain: 0, threshold: -24, ratio: 5, attack: 0.008, release: 0.12, outputGain: 0 } }, { id: "chorus2", params: { width: 0.38, tone: 9296.517 } }, { id: "autopanner", params: { rateDivision: 32, depth: 0.54 } }] },
    bass: { gain: -3.84 },
    lead2: { gain: -12.3, pan: 0.26, send: { delay: 0.28, reverb: 0.121 } },
    snare: { gain: 3.6, send: { reverb: 0.024 }, eq: { high: 5.7 } },
    hats: { gain: 3.2, pan: -0.401, send: { reverb: 0.225 } },
    ohats: { gain: 6, pan: -0.403, send: { reverb: 0.3 }, eq: { high: 1.1 } },
    kick: { gain: 2.544, send: { reverb: 0.034 }, eq: { low: 1.5 }, effects: [{ id: "compressor", params: { inputGain: 0, threshold: -24, ratio: 5, attack: 0.008, release: 0.12, outputGain: 0 } }] },
    crash: { gain: -0.72, pan: 0.657, send: { delay: 0.489, reverb: 0.5 } },
    sweeps: { send: { delay: 0.24, reverb: 0.4 } },
    lead3: { gain: -5.5, pan: -0.255, eq: { low: -12.6, mid: -4.8, high: 3.4 }, effects: [{ id: "pingpong", params: { division: 0.25 } }, { id: "rhythmgate", params: { attack: 0.001, decay: 0.06, gateLength: 0.54 } }], noteFx: {"strum":{"enabled":false,"direction":"up","gapMs":18},"arp":{"enabled":true,"direction":"diverge","rate":1,"octaves":3,"limit":0,"rangeLimit":false,"rangeLo":48,"rangeHi":72,"repeat":true,"gate":80,"retrigger":"chord","latch":false}} },
    bass3: { gain: -4.72, eq: { low: -4.6 } },
    lead4: { gain: -8.4, pan: -0.24, effects: [{ id: "doubler" }] },
    lead5: { gain: -6.72, eq: { high: 4.7 }, effects: [{ id: "pingpong", params: { feedback: 0.39, division: 1 } }], noteFx: {"strum":{"enabled":false,"direction":"up","gapMs":18},"arp":{"enabled":true,"direction":"up","rate":0.5,"octaves":4,"limit":0,"rangeLimit":false,"rangeLo":48,"rangeHi":72,"repeat":false,"gate":80,"retrigger":"chord","latch":false}} },
    lead6: { gain: -0.3, send: { delay: 0.197, reverb: 0.187 }, eq: { low: -4 }, effects: [{ id: "autopanner", params: { rateDivision: 2 } }] },
    lead7: { gain: 1.8, send: { delay: 0.726, reverb: 0.473 }, eq: { high: 3.9 } },
    lead8: { gain: 3.168, pan: -0.303, eq: { low: -12.6, mid: -4.8, high: 3.4 }, effects: [{ id: "pingpong", params: { division: 0.25 } }, { id: "rhythmgate", params: { attack: 0.001, decay: 0.06, gateLength: 0.54 } }, { id: "autopanner" }], noteFx: {"strum":{"enabled":false,"direction":"up","gapMs":18},"arp":{"enabled":true,"direction":"diverge","rate":1,"octaves":3,"limit":0,"rangeLimit":false,"rangeLo":48,"rangeHi":72,"repeat":true,"gate":80,"retrigger":"chord","latch":false}} },
    lead9: { gain: -3.12, pan: -0.621, send: { delay: 0.201 }, eq: { low: -4.4, high: 8.2 } },
    lead11: { gain: -5.84, send: { reverb: 0.05 } },
    lead12: { gain: -19, pan: 0.46, effects: [{ id: "chorus2" }] },
    crash2: { gain: -12.6, pan: 0.691, send: { delay: 0.05, reverb: 0.169 }, eq: { low: -7.8, high: 2.3 }, effects: [{ id: "spring" }] },
  },
};

export const arrangement = {
  order: [
    {
      s: 73,
      bars: 1,
      off: ["bass","bass3","lead","lead2","lead3","lead8"],
    },
    {
      s: 30,
      bars: 1,
      from: 1,
      off: ["bass","bass3","lead","lead2","lead3","lead8"],
      inlineFx: {
        clap: [
          {
            id: "pingpong",
            params: {
              sync: 1,
              division: 0.5,
              delayMs: 250,
              feedback: 0.3,
              wet: 0.35,
            },
          },
        ],
      },
      gain: {
        crash: -7.5,
      },
      pan: {
        crash: -100,
      },
    },
    {
      s: 26,
      bars: 1,
      off: ["bass","bass3","lead","lead2","lead3","lead8"],
      gain: {
        crash: -7.5,
      },
      pan: {
        crash: -100,
      },
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
      off: ["bass","bass3","lead"],
      inlineFx: {
        lead2: [
          {
            id: "doubler",
            params: {
              delayMs: 11,
              frequency: 0.91,
              depth: 0.4,
              width: 0.8,
              dryPan: -1,
              wetPan: 1,
              wet: 0.5,
            },
          },
        ],
      },
      gain: {
        lead2: 4,
      },
    },
    {
      s: 31,
      bars: 1,
      from: 1,
      off: ["bass","bass3","lead"],
      inlineFx: {
        lead2: [
          {
            id: "doubler",
            params: {
              delayMs: 11,
              frequency: 0.91,
              depth: 0.4,
              width: 0.8,
              dryPan: -1,
              wetPan: 1,
              wet: 0.5,
            },
          },
        ],
      },
      gain: {
        lead2: 4,
      },
    },
    {
      s: 28,
      bars: 1,
      off: ["bass","bass3","lead"],
      inlineFx: {
        lead2: [
          {
            id: "doubler",
            params: {
              delayMs: 11,
              frequency: 0.91,
              depth: 0.4,
              width: 0.8,
              dryPan: -1,
              wetPan: 1,
              wet: 0.5,
            },
          },
        ],
      },
      transpose: {
        lead8: -12,
      },
      gain: {
        lead2: 4,
        lead8: 3,
        lead12: -4,
      },
      pan: {
        lead12: -25,
      },
    },
    {
      s: 29,
      bars: 1,
      from: 1,
      off: ["bass","bass3","lead"],
      inlineFx: {
        lead2: [
          {
            id: "doubler",
            params: {
              delayMs: 11,
              frequency: 0.91,
              depth: 0.4,
              width: 0.8,
              dryPan: -1,
              wetPan: 1,
              wet: 0.5,
            },
          },
        ],
      },
      transpose: {
        lead8: -12,
      },
      gain: {
        lead2: 4,
        lead8: 3,
        lead12: -4,
      },
      pan: {
        lead12: -25,
      },
    },
    {
      s: 21,
      bars: 1,
      off: ["lead","lead2"],
      gain: {
        lead3: 3.5,
      },
    },
    {
      s: 3,
      bars: 1,
      from: 1,
      off: ["lead","lead2"],
      gain: {
        lead3: 3.5,
      },
    },
    {
      s: 60,
      bars: 1,
      off: ["lead","lead2"],
      gain: {
        lead3: 3.5,
      },
    },
    {
      s: 25,
      bars: 1,
      from: 1,
      off: ["lead","lead2"],
      gain: {
        lead3: 3.5,
      },
    },
    {
      s: 19,
      bars: 1,
      off: ["lead","lead3","lead8"],
      gain: {
        lead2: 3,
      },
    },
    {
      s: 1,
      bars: 1,
      from: 1,
      off: ["lead","lead3","lead8"],
      gain: {
        lead2: 3,
      },
    },
    {
      s: 18,
      bars: 1,
      off: ["lead"],
      gain: {
        lead2: 3,
        lead8: -1,
      },
    },
    {
      s: 32,
      bars: 1,
      from: 1,
      off: ["lead"],
      gain: {
        lead2: 3,
        lead8: -1,
      },
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
        lead10: 2,
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
      s: 63,
      bars: 1,
      pan: {
        lead11: -55,
      },
    },
    {
      s: 71,
      bars: 1,
      from: 1,
      pan: {
        lead11: 40,
      },
    },
    {
      s: 72,
      bars: 1,
      transpose: {
        bass: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        bass3: 2,
        lead8: 2,
        lead11: 2,
      },
      pan: {
        lead11: -55,
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
        lead11: 2,
      },
      pan: {
        lead11: 40,
      },
    },
    {
      s: 20,
      bars: 1,
      off: ["lead7"],
    },
    {
      s: 61,
      bars: 1,
      from: 1,
      off: ["lead7"],
    },
    {
      s: 70,
      bars: 1,
      gain: {
        lead4: -5,
        lead12: -5,
      },
    },
    {
      s: 10,
      bars: 1,
      from: 1,
      inlineFx: {
        lead7: [
          {
            id: "vibrato",
            params: {
              rateSync: 0,
              rateDivision: 1,
              frequency: 5,
              depth: 0.1,
              wet: 1,
            },
          },
        ],
      },
      gain: {
        lead5: -7.5,
      },
    },
    {
      s: 13,
      bars: 1,
      gain: {
        lead5: -7.5,
      },
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
      gain: {
        lead4: -6,
        lead12: -6,
      },
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
    {
      s: 74,
      bars: 1,
      off: ["lead3"],
      transpose: {
        bass: 2,
        bass3: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        lead8: -10,
        lead4: 2,
        lead5: 2,
        lead6: 2,
        lead7: 2,
        lead12: 2,
      },
    },
    {
      s: 75,
      bars: 1,
      from: 1,
      off: ["lead3"],
      transpose: {
        bass: 2,
        bass3: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        lead8: -10,
        lead4: 2,
        lead5: 2,
        lead6: 2,
        lead7: 2,
        lead12: 2,
      },
    },
    {
      s: 76,
      bars: 1,
      off: ["lead3"],
      transpose: {
        bass: 2,
        bass3: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        lead8: -10,
        lead4: 2,
        lead5: 2,
        lead6: 2,
        lead7: 2,
        lead12: 2,
      },
    },
    {
      s: 77,
      bars: 1,
      from: 1,
      off: ["lead3"],
      transpose: {
        bass: 2,
        bass3: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        lead8: -10,
        lead4: 2,
        lead5: 2,
        lead6: 2,
        lead7: 2,
        lead12: 2,
      },
    },
    {
      s: 63,
      bars: 1,
      transpose: {
        bass: 2,
        bass3: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        lead8: 2,
        lead4: 2,
        lead5: 2,
        lead6: 2,
        lead7: 2,
        lead11: 2,
        lead12: 2,
      },
    },
    {
      s: 64,
      bars: 1,
      from: 1,
      transpose: {
        bass: 2,
        bass3: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        lead8: 2,
        lead4: 2,
        lead5: 2,
        lead6: 2,
        lead7: 2,
        lead11: 2,
        lead12: 2,
      },
    },
    {
      s: 65,
      bars: 1,
      transpose: {
        bass: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        bass3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead11: 4,
        lead12: 4,
      },
    },
    {
      s: 62,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        bass3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead11: 4,
        lead12: 4,
      },
    },
    {
      s: 20,
      bars: 1,
      off: ["lead7"],
      transpose: {
        bass: 2,
        bass3: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        lead8: 2,
        lead4: 2,
        lead5: 2,
        lead6: 2,
        lead7: 2,
        lead12: 2,
      },
    },
    {
      s: 2,
      bars: 1,
      from: 1,
      off: ["lead7"],
      transpose: {
        bass: 2,
        bass3: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        lead8: 2,
        lead4: 2,
        lead5: 2,
        lead6: 2,
        lead7: 2,
        lead12: 2,
      },
    },
    {
      s: 4,
      bars: 1,
      transpose: {
        bass: 2,
        bass3: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        lead8: 2,
        lead4: 2,
        lead5: 2,
        lead6: 2,
        lead7: 2,
        lead12: 2,
      },
    },
    {
      s: 43,
      bars: 1,
      from: 1,
      transpose: {
        bass: 2,
        bass3: 2,
        lead: 2,
        lead2: 2,
        lead3: 2,
        lead8: 2,
        lead4: 2,
        lead5: 2,
        lead6: 2,
        lead7: 2,
        lead9: 2,
        lead12: 2,
      },
      gain: {
        lead5: -5,
        lead11: 5.5,
        lead6: -3,
      },
    },
    {
      s: 44,
      bars: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead9: 4,
      },
      gain: {
        lead5: -5,
        lead11: 5.5,
        lead4: -9,
        lead12: -9,
      },
    },
    {
      s: 46,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
    },
    {
      s: 47,
      bars: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
    },
    {
      s: 50,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
      gain: {
        lead6: -2.5,
      },
    },
    {
      s: 48,
      bars: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
      gain: {
        lead6: -2.5,
      },
    },
    {
      s: 49,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
      gain: {
        lead6: -2.5,
      },
    },
    {
      s: 52,
      bars: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
      gain: {
        lead4: -5.5,
        lead6: -2.5,
        lead12: -5.5,
      },
    },
    {
      s: 53,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
      gain: {
        lead6: -2.5,
      },
    },
    {
      s: 51,
      bars: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
      gain: {
        lead6: -2.5,
      },
    },
    {
      s: 45,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
      gain: {
        lead5: -4,
        lead6: -2.5,
      },
    },
    {
      s: 54,
      bars: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
      gain: {
        lead6: -2.5,
      },
    },
    {
      s: 55,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
    },
    {
      s: 56,
      bars: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
    },
    {
      s: 67,
      bars: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
    },
    {
      s: 69,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
    },
    {
      s: 68,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
    },
    {
      s: 66,
      bars: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
    },
    {
      s: 57,
      bars: 1,
      from: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
    },
    {
      s: 58,
      bars: 1,
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
    },
    {
      s: 59,
      bars: 1,
      from: 1,
      off: ["hats","ohats","snare"],
      inlineFx: {
        clap: [
          {
            id: "reverb",
            params: {
              decay: 4,
              preDelay: 0.009916216226115456,
              low: 0,
              mid: 0,
              high: 3,
              width: 2,
              wet: 0.49,
            },
          },
        ],
      },
      transpose: {
        bass: 4,
        bass3: 4,
        lead: 4,
        lead2: 4,
        lead3: 4,
        lead8: 4,
        lead4: 4,
        lead5: 4,
        lead6: 4,
        lead7: 4,
        lead12: 4,
      },
      gain: {
        clap: 8,
      },
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
      bass: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 G3 G2 . G3 G3'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1],
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
      lead3: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 G3 G2 . G3 G3'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1],
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
      bass: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 G3 G2 . G3 G3'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1],
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . E5 . A4 . . . E5 G5 A5 B5'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,2,null,null,null,1,1,1,1],
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
      bass: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 G3 G2 . G3 G3'),
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . A5 . . . . . A5 . G5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.469105,null],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .'),
      lead4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[15.951527,15.951527,15.951527],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1],
      lead12: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[15.951527,15.951527,15.951527],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      bass: seq('. . . . . . . . . . . . . . . . | C2 . C3 . C2 . C3 . C2 C2 C3 C3 C2 C2 C3 C3'),
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
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1],
      lead12: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[164.81377845643496,261.6255653005986],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[15.912642,15.794567],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      lead5: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[987.7666025122483]],
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1]],
    },
    {
      lead: seq('A5 . E5 . D5 . E5 . A4 . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,2,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . E5 . A4 . . . E5 G5 A5 B5'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,2,null,null,null,1,1,1,1],
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
      lead5: [null,null,[987.7666025122483],[987.7666025122483],null,null,[987.7666025122483],[987.7666025122483],null,[987.7666025122483],[987.7666025122483],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5Len: [null,null,[1],[1],null,null,[1],[1],null,[1],[1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . E5 . D5 . E5 . A4 . . . A5 . B5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,2,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead12: chordSeq('F3maj7 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead12Len: [[15.822443,15.822443,15.822443,15.822443],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 . | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . E5 . D5 . A5 . . . G5 . A5 . B5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,1.760121,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('F3maj7 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 C1 . C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: chordSeq('F3maj7 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 . | . . . . . . . . . . . . . . . .'),
      lead4: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [8,null,null,null,null,null,null,null,[23.769886,23.751953,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead12: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12Len: [8,null,null,null,null,null,null,null,[23.769886,23.751953,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 G3 G2 . G3 G3'),
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . A5 . . . . . A5 . G5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1],
    },
    {
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1,1.563388,1.563388,null,1,1.563388,null,1.563388,1,1.563388,1,1.563388,null,1],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . C1 . C1 . C1 . C1 .').map((v) => !!v),
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      lead: seq('. . . . . . . . . . . . . . . . | C5 . E5 G5 C5 . E5 G5 . A4 G#5 C5 C6 E5 . E6'),
      lead3: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 G3 G2 . G3 G3'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1],
    },
    {
      bass: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      clap: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      crash: seq('. . . . C1 . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      crash2: seq('. . . . . . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . C1 . C1 . C1 . C1 C1').map((v) => !!v),
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
    },
    {
      bass: seq('F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('F3maj7 . . . . . . . F3maj7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass3: seq('F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 . | . . . . . . . . . . . . . . . .'),
      lead8: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead8Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12: chordSeq('F3maj7 . . . . . . . F3maj7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead12Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      bass3: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .'),
      lead8: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead12: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead12Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . C1 . . .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . C1').map((v) => !!v),
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
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,2,null,null,null,1,1,1,1],
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
      lead3: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead: seq('. . . . . . . . . . . . . . . . | C5 . . . G5 . . G4 . A4 . E5 . E5 . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,null,null,1.563388,null,null,2.272727,null,3.269058,null,1.675781,null,1.789595,null,null],
      lead11: seq('. . . . . . . . . . . . . . . . | C5 . . . G5 . . G4 . A4 . . E5 . . .'),
      lead11Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,null,null,1.563388,null,null,2.272727,null,3.269058,null,null,3.378433,null,null,null],
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . C1 C1').map((v) => !!v),
    },
    {
      lead: seq('A5 . E5 . D5 . E5 . A4 . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,2,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead4: [[523.2511306011972,783.9908719634985],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [[31,15.45206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12: [[523.2511306011972,783.9908719634985],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12Len: [[31,15.45206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
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
      leadLen: [1.563388,null,null,null,1.563388,null,null,1.563388,null,1.563388,null,null,3.8129729999999995,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('C5 . . . G5 . . G4 . A4 . . E5 . . . | . . . . . . . . . . . . . . . .'),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,null,null,1.563388,null,null,2.272727,null,3.269058,null,null,3.378433,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      lead: seq('. . . . . . . . . . . . . . . . | C5 . . . G5 . . G4 . A4 . . E5 . . .'),
      lead5: chordSeq('. . . . . . . . . . . . . . . . | . . . . . . . . . A4min . . . . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6.809837,6.809837,6.809837],null,null,null,null,null,null],
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead10: seq('. . . . . . . . . . . . . . . . | . . . . . . . . A4 A4 A4 A4 C5 C5 E5 E5'),
      lead10Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.04285,1,1,1,1.563388,1,1.563388,1],
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
    {
      bass: seq('. . . . . . . . . . . . . . . . | C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .'),
      lead: seq('. . . . . . . . . . . . . . . . | C5 . E5 G5 C5 . E5 G5 . G4 A4 B4 C5 D5 E5 G5'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | C4maj7 . . . . . . . C4maj7 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      sweeps: seq('. . . . . . . . . . . . . . . . | C1 . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . C1 . C1 . C1 .').map((v) => !!v),
      lead3: chordSeq('. . . . . . . . . . . . . . . . | C4maj7 . . . . . . . C4maj7 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .'),
      lead6: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . G4 A4 B4 C5 D5 E5 G5'),
      lead6Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,1.563388,1.563388,1.563388,1.563388,1.563388,1.563388],
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . C1 . C1 . C1 .').map((v) => !!v),
      lead7: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[2093.004522404789],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead7Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[16.939453],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead5: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . A5'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1],
      lead9: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . G4 A4 B4 C5 D5 E5 G5'),
      lead9Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,1.563388,1.563388,1.563388,1.563388,1.563388,1.563388],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,1.563388,1.563388,1.563388,1.563388,1.563388,1.563388],
      lead11: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[987.7666025122483,1975.533205024496],[1046.5022612023945,2093.004522404789]],
      lead11Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[1,1],[1,1]],
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . C1 .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . C1 . C1 . C1 .').map((v) => !!v),
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
      lead5: seq('A5 . A5 A5 . . A5 A5 . A5 A5 . A5 . . A5 | . . . . . . . . . . . . . . . .'),
      lead5Len: [1,null,1,1,null,null,1,1,null,1,1,null,1,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('C2 . C3 . C2 . C3 C3 A2 . A3 A3 A2 . A3 A3 | . . . . . . . . . . . . . . . .'),
      bassLen: [null,null,null,null,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead11: [[1108.7305239074883,2217.4610478149766],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead11Len: [[1,1],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4: [[554.3652619537442,1108.7305239074883],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [[10,10],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead9: seq('A5 . E5 . D5 . A5 . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead9Len: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12: [[554.3652619537442,1108.7305239074883],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12Len: [[10,10],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      lead5: chordSeq('. . . . . . . . . . . . . . . . | . . . . . . . . . A4min . . . . . .'),
      lead5Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[6.809837,6.809837,6.809837],null,null,null,null,null,null],
      bass: seq('. . . . . . . . . . . . . . . . | F2 . F3 F3 F2 . F3 F3 G2 . G3 G3 G2 . G3 G3'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1],
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
      bass: seq('. . . . . . . . . . . . . . . . | F2 . F3 F3 F2 . F3 F3 G2 . G3 G3 G2 . G3 G3'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1],
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
      bass: seq('C2 . C3 C3 C2 . C3 C3 A2 . A3 A3 A2 . A3 A3 | . . . . . . . . . . . . . . . .'),
      bassLen: [null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('C2 . C3 C3 C2 . C3 C3 A2 . A3 A3 A2 . A3 A3 | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . E5 . D5 . A5 . . . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 D3 D2 . D3 D3 G2 . G3 G3 G2 . G3 G3'),
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . A5 . . . . . A5 . G5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1],
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
      bass: seq('. . . . . . . . . . . . . . . . | F2 . F3 F3 F2 . F3 F3 G2 . G3 G3 G2 . G3 G3'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1],
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
      bass: seq('C2 . C3 C3 C2 . C3 C3 A2 . A3 A3 A2 . C3 C3 | . . . . . . . . . . . . . . . .'),
      bassLen: [null,null,null,1,null,null,null,1,null,null,null,1,null,null,1,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead: seq('A5 . E5 . D5 . E5 . A4 . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,2.945313,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead4: [[523.2511306011972,783.9908719634985],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [[31,15.45206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass: seq('C2 . C3 C3 C2 . C3 C3 A2 . A3 A3 A2 . A3 A3 | . . . . . . . . . . . . . . . .'),
      bassLen: [null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12: [[523.2511306011972,783.9908719634985],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12Len: [[31,15.45206],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      bass: seq('. . . . . . . . . . . . . . . . | F2 . F3 F3 F2 . F3 F3 G2 . G3 G3 G2 . G3 G3'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1],
    },
    {
      bass: seq('C2 . C3 C3 C2 . C3 C3 A2 . A3 A3 A2 . A3 A3 | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . E5 . D5 . E5 . A4 . . . A5 . B5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,2.945313,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 D3 D2 . D3 D3 G2 . G3 G3 G2 G2 G2 G2'),
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
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1,null,null,null,1,null,1,1,1],
    },
    {
      bass: seq('F2 F2 F3 F3 F2 F2 F3 F3 F2 F2 F3 F3 F2 F2 F3 F3 | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . E5 . D5 . A5 . . . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('F3maj7 . . . . . . . F3maj7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('F3maj7 . . . . . . . F3maj7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 . | . . . . . . . . . . . . . . . .'),
      lead4: chordSeq('F3maj7 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead4Len: [[31.753729,31.753729,31.753729,31.753729],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12: chordSeq('F3maj7 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead12Len: [[31.753729,31.753729,31.753729,31.753729],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | G2 G2 G3 G3 G2 G2 G3 G3 G2 G2 G3 G3 G2 G2 G3 G3'),
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
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1],
      lead12: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[15.951527,15.951527,15.951527],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('F2 F2 F3 F3 F2 F2 F3 F3 G2 G2 G3 G3 G2 G2 G3 G3 | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . E5 . D5 . A5 . . . G5 . A5 . B5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,1.793146,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('F3maj7 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 C1 . C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead3: chordSeq('F3maj7 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 . | . . . . . . . . . . . . . . . .'),
      lead4: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [8,null,null,null,null,null,null,null,[23.769886,23.751953,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bassLen: [null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12: [[174.61411571650194,220,261.6255653005986,329.6275569128699],null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174075],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12Len: [8,null,null,null,null,null,null,null,[23.769886,23.751953,8],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | C2 C2 C3 C3 C2 C2 C3 C3 C2 C2 C3 C3 C2 C2 C3 C3'),
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
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . . . . .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 C1 C1 C1 C1 C1 C1 C1').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1],
      lead12: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[164.81377845643496,261.6255653005986],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[15.912642,15.794567],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 G2 G3 G3 G2 G2 G3 G3'),
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
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1],
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 G3 G2 . G3 G3'),
      lead2: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | D2 . D3 . D2 . D3 . G2 . G3 . G2 . G3 .'),
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1],
      lead: seq('. . . . . . . . . . . . . . . . | C5 . . . G5 . . G4 . A4 . . E5 . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,null,null,1.563388,null,null,2.272727,null,3.269058,null,null,3.378433,null,null,null],
      lead11: seq('. . . . . . . . . . . . . . . . | C5 . . . G5 . . G4 . A4 . . E5 . . .'),
      lead11Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,null,null,1.563388,null,null,2.272727,null,3.269058,null,null,3.378433,null,null,null],
    },
    {
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('C5 . . . G5 . . G4 . A4 . E5 . . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,null,null,2.082623,null,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead11: seq('C5 . . . G5 . . G4 . A4 . E5 . . . . | . . . . . . . . . . . . . . . .'),
      lead11Len: [1.563388,null,null,null,2.082623,null,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      bass: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 G3 G2 . G3 G3'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1],
      lead: seq('. . . . . . . . . . . . . . . . | C5 . . . G5 . . G4 . A4 . E5 . E5 . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,null,null,2.082623,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      lead11: seq('. . . . . . . . . . . . . . . . | C5 . . . G5 . . G4 . A4 . E5 . E5 . .'),
      lead11Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,null,null,2.082623,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
    },
    {
      bass: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('C5 . . . G5 . . G4 . A4 . . E5 . . . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,null,null,1.563388,null,null,1.563388,null,1.563388,null,null,3.8129729999999995,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead11: seq('C5 . . . G5 . . G4 . A4 . . E5 . . . | . . . . . . . . . . . . . . . .'),
      lead11Len: [1.563388,null,null,null,1.563388,null,null,1.563388,null,1.563388,null,null,3.8129729999999995,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('F2 F2 F3 F3 F2 F2 F3 F3 F2 F2 F3 F3 F2 F2 F3 F3 | . . . . . . . . . . . . . . . .'),
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
      bassLen: [null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12: chordSeq('F3maj7 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead12Len: [[15.822443,15.822443,15.822443,15.822443],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      bass: seq('F2 F2 F3 F3 F2 F2 F3 F3 F2 F2 F3 F3 F2 F2 F3 F3 | . . . . . . . . . . . . . . . .'),
      lead: seq('A5 . E5 . D5 . A5 . . . . . A5 . G5 . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead2: chordSeq('F3maj7 . . . . . . . F3maj7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('F3maj7 . . . . . . . F3maj7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 . | . . . . . . . . . . . . . . . .'),
      clap: seq('. . . . C1 . . . . . . . C1 . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      snare: seq('. . . . C1 . . . . . . . C1 . C1 . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bassLen: [null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | G2 G2 G3 G3 G2 G2 G3 G3 G2 G2 G3 G3 G2 G2 G3 G3'),
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . A5 . . . . . A5 . G5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .'),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 C1 C1 .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1],
      snare: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 C1 C1 .').map((v) => !!v),
    },
    {
      bass: seq('. . . . . . . . . . . . . . . . | G2 G2 G3 G3 G2 G2 G3 G3 G2 G2 G3 G3 G2 G2 G3 G3'),
      lead: seq('. . . . . . . . . . . . . . . . | A5 . E5 . D5 . A5 . . . . . A5 . B5 .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,1.563388,null,1.563388,null],
      lead2: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | G3 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .'),
      lead4: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[31.853516,31.853516,31.853516],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,1,null,1,null,1,null,1,null,1,null,1,null,1],
      lead12: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[195.99771799087463,246.94165062806206,293.6647679174076],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[31.853516,31.853516,31.853516],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      bass: seq('F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 . | . . . . . . . . . . . . . . . .'),
      lead: seq('C5 . E5 G5 C5 . E5 G5 . A4 E5 C5 . E5 . . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('F3maj7 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      sweeps: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      hats: seq('C1 . . . C1 . . . C1 . . . C1 C1 . C1 | . . . . . . . . . . . . . . . .').map((v) => !!v),
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.790128,1.563388,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('F3maj7 . . . . . . . G3 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 . | . . . . . . . . . . . . . . . .'),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead4: [null,null,null,null,null,null,null,null,[987.7666025122483,1975.533205024496],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead4Len: [null,null,null,null,null,null,null,null,[8,7.898793],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12: [null,null,null,null,null,null,null,null,[987.7666025122483,1975.533205024496],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead12Len: [null,null,null,null,null,null,null,null,[8,7.898793],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      bass: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 G3 G2 . G3 G3'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1],
      lead: seq('. . . . . . . . . . . . . . . . | C5 . . . G5 . . G4 . A4 . E5 . . . .'),
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,null,null,2.082623,null,null,1.563388,null,1.563388,null,1.563388,null,null,null,null],
      lead11: seq('. . . . . . . . . . . . . . . . | C5 . . . G5 . . G4 . A4 . E5 . E5 . .'),
      lead11Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,null,null,2.082623,null,null,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
    },
    {
      bass: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead3: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead3Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
      snare: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . C1 . . . . . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      lead: seq('C5 . . . G5 . . G4 . A4 . E5 . E5 . . | . . . . . . . . . . . . . . . .'),
      leadLen: [1.563388,null,null,null,1.563388,null,null,1.563388,null,1.563388,null,1.759943,null,1.754972,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      lead11: seq('C5 . . . G5 . . G4 . A4 . . E5 . . . | . . . . . . . . . . . . . . . .'),
      lead11Len: [1.563388,null,null,null,1.563388,null,null,1.563388,null,1.563388,null,null,3.8129729999999995,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
    },
    {
      lead2: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead2Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      leadLen: [1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      kick: seq('C1 . . . C1 . . . C1 . . . C1 . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
      bass3: seq('C2 . C3 . C2 . C3 . A2 . A3 . A2 . A3 . | . . . . . . . . . . . . . . . .'),
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
      lead8: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead8Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
      crash2: seq('C1 . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .').map((v) => !!v),
    },
    {
      lead2: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead2Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      leadLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1.563388,null,1.563388,1.563388,1.563388,null,1.563388,1.563388,null,1.563388,null,1.563388,null,1.563388,null,null],
      lead3: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead3Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
      bass3: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      clap: seq('. . . . . . . . . . . . . . . . | . . . . C1 . . . . . . . C1 . . .').map((v) => !!v),
      kick: seq('. . . . . . . . . . . . . . . . | C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v),
      bass: seq('. . . . . . . . . . . . . . . . | F2 . F3 . F2 . F3 . G2 . G3 G3 G2 . G3 G3'),
      bassLen: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,null,null,null,1],
      lead8: chordSeq('. . . . . . . . . . . . . . . . | F3maj7 . . . . . . . G3 . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
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
      lead8: chordSeq('C4maj7 . . . . . . . A3min7 . . . . . . . | . . . . . . . . . . . . . . . .'),
      lead8Len: [8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
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
      lead8: chordSeq('. . . . . . . . . . . . . . . . | D3min7 . . . . . . . G3 . . . . . . .'),
      lead8Len: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null,8,null,null,null,null,null,null,null],
    },
  ],
  choke: {
    hats: "ohats",
  },
  loop: {
    fromBar: 21,
    toBar: 80,
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
