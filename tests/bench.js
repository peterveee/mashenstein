// The preset library's BENCH: a preset heard with no channel under it.
//
// The library edits sounds that belong to no song, so there is no strip to play one
// through — and borrowing whichever channel happened to be selected would mean
// auditioning a preset through that channel's EQ, inserts, sends, fader, mute and solo.
// The bench is the absence of all of that: the note goes straight to the music bus, on
// the path the engine already takes when there is no mixer at all.
//
// Which makes this file's job the three claims that path rests on, because everything
// downstream is the sequencer, tested next door in tests/preview.js:
//
//   1. The lane is the one the preset's LEVEL was measured on, so what you hear and
//      what its peak claims are the same statement.
//   2. The bank names the preset and nothing else — no song, no gain override, and
//      nothing that would opt the lane into the echo.
//   3. The borrow is put back. `benchPlay` nulls `Audio.mixer` for one synchronous
//      call; if it ever failed to restore it, every channel strip in the song would
//      quietly leave the graph, which is a bug you would blame on anything but the
//      keyboard.
import { benchLane, benchBank, benchRoot, benchIsKit, benchPlay, benchReset, createPatternPlayer,
  BENCH_NOTE, PATTERNS, PATTERN_RATES, PATTERN_GATE, SCALES, snapToScale, inScale,
  PITCH_CLASSES } from '../tools/mixer-voice-library.js';
import { VOICES, VOICE_CATEGORIES, KIT_CATEGORIES, PERCUSSION_LANES, seamFor } from '../src/data/voices.js';
import { laneUsesEcho, soloBank, effectiveStepLen } from '../src/engine/lanes.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const voice = (id) => VOICES[id];

// ---- the lane a preset is heard on -----------------------------------------
//
// `bass` for anything pitched. That is the lane tools/mixer.js renders a preset on to
// measure its peak (MEASURE_BANK), and every preset's level in the game is that lane's
// target divided by that peak — so auditioning anywhere else is auditioning at a level
// the number was not taken at.
assert(benchLane(voice('roundMono')) === 'bass', 'a pitched preset is heard on the bass lane — the one it was measured on');
assert(benchLane(undefined) === 'bass', 'and so is nothing at all, rather than throwing');
for (const c of VOICE_CATEGORIES.filter((x) => !KIT_CATEGORIES.includes(x))) {
  assert(benchLane({ category: c }) === 'bass', `${c} is pitched, so it goes to the bass lane`);
}

// A drum goes on a percussion lane because that is the only kind carrying `noteKey` —
// the pitch a drum is struck at. On a melodic lane it has no note and does not sound.
const KIT_EXPECT = {
  Kick: 'kick', Snare: 'snare', Hats: 'hats', Clap: 'clap',
  Tom: 'tom', Crash: 'crash', Perc: 'hats',
};
for (const [cat, lane] of Object.entries(KIT_EXPECT)) {
  assert(benchLane({ category: cat }) === lane, `${cat} is heard on the ${lane} lane`);
  assert(PERCUSSION_LANES.includes(lane), `${lane} is a percussion lane, so it carries a note key`);
  assert(!!seamFor(lane).noteKey, `${lane} has a note key for the pitch to land in`);
}
for (const cat of KIT_CATEGORIES) {
  assert(cat in KIT_EXPECT, `${cat} has a bench lane — a kit category with none would fall to bass and never sound`);
}

// `rim` is the one kit lane that ALWAYS taps the echo bus rather than opting in (see
// ECHO_OPT_IN in src/engine/lanes.js), so a bench on it would arrive wearing whatever
// delay the loaded song is set to.
assert(!Object.values(KIT_EXPECT).includes('rim'), 'rim is never a bench lane — it always taps the echo');

// ---- the bank ---------------------------------------------------------------
const bank = benchBank('roundMono', 132);
assert(bank.bassVoice === 'roundMono', 'the bank names the preset on its bench lane');
assert(bank.bpm === 132, 'and carries the tempo — a preset’s dur is in steps, not seconds');
assert(benchBank('roundMono').bpm === 120, 'with a sane default when the desk has no song');
// No gain key, deliberately. tools/mixer.js sets `bassGain: 1` when it MEASURES,
// because a measurement wants the synth at unity; an audition wants `voiceGain`, which
// is the level the preset will really play at — and is what makes two presets
// comparable here, since both arrive scaled to the same lane target.
assert(!('bassGain' in bank), 'no gain override — the preset plays at the level voiceGain gives it');
assert(!('bassDur' in bank), 'no length override — the preset’s own dur stands');
// Nothing of any song is in it. This is the claim that makes the bench a bench.
assert(Object.keys(bank).length === 2, `the bank holds the tempo and the preset and nothing else (got ${Object.keys(bank).join(', ')})`);

const kickBank = benchBank('kickDeep', 120);
assert(kickBank.kickVoice === 'kickDeep', 'a drum preset is named on its own lane’s voice key');

// ...except for the one thing the PATTERN PLAYER knows and a finger does not: how long
// the note lasts. A figure's note lasts one step of its rate, and a rate is already
// written in sixteenths — the same unit a lane's `…Dur` key holds.
const gated = benchBank('roundMono', 132, 2);
assert(gated.bassDur === 2, 'a gated bench note carries its length on the lane’s own dur key');
assert(Object.keys(gated).length === 3, 'and adds nothing else to the bank');
assert(!('bassDur' in benchBank('roundMono', 132, 0)),
  'a gate of nothing is no gate at all — the preset’s own dur stands');

// ---- it is dry ---------------------------------------------------------------
//
// Not by muting anything: every bench lane is echo-OPT-IN, and the bench bank opts
// none of them in. So the note never reaches the delay bus in the first place, which
// is why the bench needs no access to the echo at all.
for (const lane of new Set(['bass', ...Object.values(KIT_EXPECT)])) {
  const b = { bpm: 120, [seamFor(lane).voiceKey]: 'roundMono' };
  assert(!laneUsesEcho(b, lane), `the ${lane} bench never reaches the delay — nothing opts it in`);
}

// ---- the note it opens on ----------------------------------------------------
assert(BENCH_NOTE === 110, 'the bench opens at A2 — the note tools/mixer.js measures at');
assert(benchRoot(voice('roundMono')) === 110, 'a pitched preset is struck at A2');
assert(benchRoot(voice('kickDeep')) === seamFor('kick').note,
  'a drum is struck at its lane’s own note — the answer to “what does this kick sound like” is the kick');
assert(benchRoot(null) === 110, 'and nothing at all still gives a note rather than NaN');
assert(benchIsKit(voice('kickDeep')) && !benchIsKit(voice('roundMono')),
  'kit and pitched are told apart by category, which is what the bench lane is chosen from');
assert(benchLane(voice('tom')) === 'tom' && benchLane(voice('crashEngine')) === 'crash',
  'actual Tom and Crash presets bench on their own lanes');
assert(benchIsKit(voice('ds808Cowbell')) && benchLane(voice('ds808Cowbell')) === 'tom',
  'Perc cowbell remains a kit preset on its technical tom lane');
assert(!benchIsKit(voice('dsZap')) && benchLane(voice('dsZap')) === 'bass',
  'FX zap remains non-drum on the bench');

// ---- the borrow is put back --------------------------------------------------
benchReset();   // the high-water mark is module state; each block starts from nothing
const SENTINEL = { iAmTheDesk: true };
let sawInside;
const stub = {
  ctx: { currentTime: 0 },
  mixer: SENTINEL,
  previewNote() { sawInside = stub.mixer; return true; },
};
assert(benchPlay(stub, 'roundMono', 110) === true, 'a bench note reports that it sounded');
assert(sawInside === null, 'the sequencer runs with no mixer — which is what takes the channel strip out of the path');
assert(stub.mixer === SENTINEL, 'and the desk gets its strips back');

// The case that matters, because it is the one nobody would notice: a throw inside
// scheduleStep that left `mixer` null would silently take every channel strip out of
// the SONG, not just out of the preview.
const thrower = {
  ctx: { currentTime: 0 },
  mixer: SENTINEL,
  previewNote() { throw new Error('boom'); },
};
let threw = false;
try { benchPlay(thrower, 'roundMono', 110); } catch { threw = true; }
assert(threw, 'a failure inside the engine is not swallowed');
assert(thrower.mixer === SENTINEL, 'and the desk STILL gets its strips back');

// Nothing to play is not an error either way.
assert(benchPlay({ ctx: null, mixer: SENTINEL }, 'roundMono', 110) === false, 'no audio context, no note');
assert(benchPlay(stub, 'noSuchPreset', 110) === false, 'no preset, no note');
assert(stub.mixer === SENTINEL, 'and neither refusal leaves the mixer borrowed');

// ---- the patterns ------------------------------------------------------------
//
// A pattern is a CELL read at a rate, which is what keeps the list short: `repeat` at a
// quarter is four-to-the-floor and at a sixteenth is a hat pattern. The invariant is
// that every cell is playable — a cell of nothing but rests is a play button that does
// nothing, and a semitone that is not a number is a frequency of NaN.
for (const p of PATTERNS) {
  assert(Array.isArray(p.cell) && p.cell.length > 0, `${p.id} has a cell`);
  assert(p.cell.some((s) => s && s.length), `${p.id} sounds at least once — a cell of rests is a silent play button`);
  for (const step of p.cell) {
    assert(step === null || step.every((n) => Number.isFinite(n)),
      `${p.id} holds rests or real semitones, never anything that would make a frequency NaN`);
  }
}
assert(new Set(PATTERNS.map((p) => p.id)).size === PATTERNS.length, 'the patterns have distinct ids');
for (const r of PATTERN_RATES) {
  assert(Number.isInteger(r.steps) && r.steps > 0, `the ${r.label} rate is a whole number of 16ths`);
}
// Slowest first, so the dropdown reads down from a bar to a sixteenth rather than
// jumping about — and so "slower than" is a comparison on one axis.
assert(PATTERN_RATES.every((r, i) => i === 0 || r.steps < PATTERN_RATES[i - 1].steps),
  'the rates run slowest to fastest');
assert(PATTERN_RATES.some((r) => r.steps === 4), 'a quarter-note rate is offered');
assert(PATTERN_RATES.some((r) => r.steps === 16), 'and a whole bar, which is what a progression needs');
assert(PATTERN_GATE.min === 50 && PATTERN_GATE.max === 150 && PATTERN_GATE.default === 80,
  'autoplay gate runs from 50% to 150% and defaults to 80%');

// ---- the progressions --------------------------------------------------------
//
// A preset that sounds right on one chord can still be wrong on three, which is the
// whole reason these exist: the root moves under the filter and the release.
{
  const progs = PATTERNS.filter((p) => p.slow);
  assert(progs.map((p) => p.id).join(' ')
    === 'I-IV-V-IV I-V-vi-IV I-I-ii-iii I-V-bVII-bVII ii-V-I-I',
    'every progression is offered, in the order the menu reads them');
  const byId = Object.fromEntries(PATTERNS.map((p) => [p.id, p]));

  // Eight bars, two to a chord. A chord that lasts one bar at this rate is gone before
  // a long release has said anything, which is the one thing these are here to hear.
  assert(progs.every((p) => p.cell.length === 8), 'each of them eight bars long');
  assert(progs.every((p) => p.cell.every((c) => c && c.length === 3)), 'every bar a triad');
  assert(progs.every((p) => p.cell.every((c) => c[1] - c[0] === 4 && c[2] - c[0] === 7)),
    'and every triad major — a third and a fifth above its own root, spelled into the'
    + ' chosen key by the quantiser');
  assert(progs.every((p) => p.cell.every((c, i) => i % 2 === 0 || c[0] === p.cell[i - 1][0])),
    'held two bars each, so the harmony moves under the filter slowly enough to judge');

  const rock = byId['I-IV-V-IV'];
  assert(!!rock, 'I – IV – V – IV is in the list');
  // Degrees, as semitones from the root: tonic, fourth, fifth, and back to the fourth.
  assert(rock.cell.map((c) => c[0]).join(',') === '0,0,5,5,7,7,5,5',
    'rooted on I, IV, V and IV again — the rock staple, not a I – IV – V that stops'
    + ' on the dominant');

  const flatSeven = byId['I-V-bVII-bVII'];
  assert(!!flatSeven, 'I – V – ♭VII – ♭VII is in the list');
  assert(flatSeven.cell.map((c) => c[0]).join(',') === '0,0,7,7,10,10,10,10',
    'rooted on I, V and the FLAT seven — ten semitones, the rock cadence, not the'
    + ' diminished triad on the major seventh — held for four bars');

  // A progression at a sixteenth is eight chords in two beats, which is a strum.
  // Choosing one takes the rate down with it — but only downward, and only past 1/2.
  const p = createPatternPlayer({ Audio: { ctx: null }, bpm: () => 120, root: () => 110 });
  p.setRate('16');
  p.setPattern('I-IV-V-IV');
  assert(p.rate.steps === 16, 'picking a progression at 1/16 gives it room — a bar per cell,'
    + ' which is what makes a chord written twice last two bars');
  p.setRate('2');
  p.setPattern('I-V-bVII-bVII');
  assert(p.rate.id === '2', 'a rate already slow enough is a deliberate choice, and is left alone');
  p.setRate('1');
  p.setPattern('I-IV-V-IV');
  assert(p.rate.id === '1', 'and so is one slower still — the nudge never speeds anything up');
  p.setRate('16');
  p.setPattern('repeat');
  assert(p.rate.id === '16', 'a figure that is not a progression leaves the rate exactly where it was');
  const kept = createPatternPlayer({
    Audio: { ctx: null }, bpm: () => 120, root: () => 110, adjustSlowRate: false,
  });
  kept.setRate('16');
  kept.setPattern('I-IV-V-IV');
  assert(kept.rate.id === '16', 'a standalone-style player can keep the selected rate for a progression');
  p.setGate(150);
  assert(p.gate === 150, 'the autoplay player accepts the full 150% overlap gate');
  p.setGate(999);
  assert(p.gate === 150, 'gate is clamped at its 150% ceiling');
  p.setGate(0);
  assert(p.gate === 50, 'gate is clamped at its 50% floor');
  p.reset();
  assert(p.pattern.id === 'repeat' && p.rate.id === '8' && p.gate === 80 && !p.running(),
    'a song change resets the transient audition pattern, 80% gate and playback');
}

// ---- the pattern player schedules forwards, always ---------------------------
//
// The bug this is here for: a preset's voices are pooled per (lane, voice), so two
// notes of one preset can land on the same oscillator — and Tone asserts that every
// start time is strictly greater than the last that oscillator was given. Ask for two
// at one instant and it throws inside scheduleStep rather than playing a chord.
//
// Two things ask for exactly that. A chord cell IS several notes at one time. And a
// catch-up — a backgrounded tab, a desk busy repainting — drags every overdue step up
// to the same "now". Both were live: the second filled the console the first time the
// player was left running.
{
  const times = [];
  let now = 100;
  const fakeAudio = {
    ctx: { get currentTime() { return now; } },
    mixer: {},
    previewNote(lane, freq, { at }) { times.push(Number((now + at).toFixed(6))); return true; },
  };
  // Every note the bench sounds, as the engine was asked for it — see the gate block
  // at the end, which is about the OPTIONS rather than the times.
  const asked = [];
  fakeAudio.previewNote = (lane, freq, opts) => {
    asked.push({ lane, freq, ...opts });
    times.push(Number((now + opts.at).toFixed(6)));
    return true;
  };
  let previewCuts = 0;
  fakeAudio.stopPreview = () => { previewCuts++; };
  const player = createPatternPlayer({
    Audio: fakeAudio, bpm: () => 120, root: () => 110,
  });

  const strictlyIncreasing = (list) => list.every((t, i) => i === 0 || t > list[i - 1]);
  // The player tops itself up on a 25ms timer, so the clock has to actually run for it
  // to schedule more than its first lookahead — a cell beginning with a rest (off-beat)
  // schedules nothing at all in one window, which is correct and is why this drives the
  // real scheduler rather than calling it once.
  const runFor = async (ms, tickSeconds = 0.02) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      await new Promise((r) => { setTimeout(r, 20); });
      now += tickSeconds;
    }
  };

  for (const p of PATTERNS) {
    times.length = 0;
    benchReset();
    now = 100;
    player.setPattern(p.id);
    player.setRate('16');           // the tightest grid, where a collision is likeliest
    player.start('roundMono');
    await runFor(200);
    player.stop();
    assert(times.length > 0, `${p.id} schedules something`);
    assert(strictlyIncreasing(times),
      `${p.id} schedules strictly forwards — two notes at one instant is a thrown assert, not a chord`);
    assert(times.every((t) => t >= 100), `${p.id} never schedules into the past`);
  }

  // A running figure keeps its beat, but switching presets must cut the old bench
  // output before the next pump schedules the new voice. Re-pointing at that same
  // voice is not a switch and must not keep clearing it.
  now = 280;
  player.start('roundMono');
  // From here, not from the top of the block: `stop()` cuts the bench too, and the loop
  // above stopped the player once per figure. What is being counted is what SETVOICE
  // does, so the count starts where that question does.
  previewCuts = 0;
  player.setVoice('kickDeep');
  assert(previewCuts === 1, 'switching an active audition cuts the old preset once');
  player.setVoice('kickDeep');
  assert(previewCuts === 1, 'pointing at the already-playing preset does not cut it again');
  player.stop();

  // A native control can cut the current audition without stopping the scheduler. This
  // is the boundary used by the standalone BASE KEY, FIGURE, and RATE selectors.
  times.length = 0;
  benchReset();
  previewCuts = 0;
  now = 340;
  player.setPattern('repeat');
  player.setRate('16');
  player.start('roundMono');
  const wasRunning = player.running();
  player.silence();
  assert(wasRunning && player.running(),
    'silencing a running figure keeps its scheduler playing');
  assert(previewCuts === 1, 'silencing a running figure cuts its queued audition notes');
  player.stop();

  // The scheduler still supports an explicit prime for other native-control callers.
  times.length = 0;
  benchReset();
  now = 340;
  player.setPattern('repeat');
  player.setRate('16');
  player.start('roundMono');
  player.prime(0.8);
  assert(times.some((t) => t >= 340.6),
    'a running pattern can prime audio ahead before a blocking native control opens');
  player.stop();

  // The catch-up: a tab that was away, so every overdue step wants the same "now".
  // Before MIN_GAP this filled the console with Tone's strictly-greater assert.
  times.length = 0;
  now = 300;
  player.setPattern('repeat');
  player.setRate('16');
  player.start('roundMono');
  await runFor(60);
  now = 400;                        // gone for a hundred seconds
  await runFor(150);
  player.stop();
  assert(strictlyIncreasing(times), 'and still strictly forwards after the clock jumps past it');
  assert(times.every((t) => t >= 300), 'with nothing scheduled into the past to catch up');

  // The chord is the other sharp case: several notes, one step, one pooled voice.
  times.length = 0;
  now = 500;
  player.setPattern('chord');
  player.start('roundMono');
  await runFor(60);
  player.stop();
  assert(times.length >= 3, 'a chord cell sounds every note in it');
  assert(strictlyIncreasing(times.slice(0, 3)), 'and spreads them so the pool will take all three');
  assert(times[2] - times[0] < 0.01,
    'by a hair — a millisecond apart is a chord, ten would be an arpeggio');

  // ---- and the case that actually bit: a key pressed while a pattern runs.
  //
  // The pattern, the keys and the `hit` button all land on ONE pool — keyed
  // `lane|voiceId|echo`, two slots deep for a single note. A running pattern has notes
  // queued into the future; a key asks for now-plus-twenty-milliseconds, which is
  // BEHIND them, and Tone refuses a time earlier than one already on that slot.
  //
  // So the rule cannot live in the pattern player: it has to live in the one function
  // all three go through.
  // Asserted on benchPlay directly rather than by racing the player. A pattern's queue
  // is only briefly non-empty — the lookahead is 60ms and a sixteenth at 120bpm is
  // 125ms, so most of the time there is nothing pending and a key has no latency added
  // at all. The collision is real but intermittent, and an intermittent bug wants a
  // deterministic test.
  times.length = 0;
  benchReset();
  now = 700;
  benchPlay(fakeAudio, 'roundMono', 110, { at: 0.5 });   // a note queued well ahead
  const queuedAhead = times[times.length - 1];
  assert(queuedAhead > now, 'a note can be queued into the future');
  benchPlay(fakeAudio, 'roundMono', 220, { at: 0.02 });  // a key press, asking behind it
  const key = times[times.length - 1];
  assert(key >= queuedAhead,
    'a key pressed while something is queued is not scheduled behind it — that is the'
    + ' assert Tone throws, since both land on the same two-slot pool');

  // ...and once the figure is stopped, the next key is immediate again rather than
  // waiting out the tail of something that is no longer playing.
  times.length = 0;
  now = 800;
  benchPlay(fakeAudio, 'roundMono', 220, { at: 0.02 });
  assert(Math.abs(times[0] - 800.02) < 1e-6,
    'with no pattern running a key sounds when it was asked for, with no latency added');

  // ---- locking to a running song ---------------------------------------------
  //
  // Started against a song, the figure joins the song's grid instead of beginning the
  // instant the button was pressed. Otherwise you are auditioning the preset against a
  // phase accident, and nothing tells you whether what sounds wrong is the sound or the
  // fact that it is a thirty-second late.
  {
    const SPB = 0.125;                       // a 16th at 120bpm
    const ORIGIN = 1000;                     // where this fake sequencer's grid starts
    let clock = ORIGIN;
    // A sequencer, simulated: `stepTime` is the ctx time of its next step and `step`
    // the index of that step, and both advance as the clock passes them. Started at 5,
    // deliberately mid-bar — a grid that happened to begin on a beat would let a broken
    // implementation pass by landing on one accidentally.
    let stepTime = ORIGIN + 0.03;
    let stepIx = 5;
    const seq = () => {
      while (stepTime < clock) { stepTime += SPB; stepIx += 1; }
      return { time: stepTime, step: stepIx, spb: SPB };
    };
    const synced = {
      ctx: { get currentTime() { return clock; } },
      mixer: {},
      previewNote(lane, freq, { at }) { times.push(Number((clock + at).toFixed(6))); return true; },
    };
    const p = createPatternPlayer({
      Audio: synced, bpm: () => 120, root: () => 110, sync: seq,
    });
    // The clock has to actually run for the player to reach past its first lookahead.
    const runClock = async (ms) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        await new Promise((r) => { setTimeout(r, 20); });
        clock += 0.02;
      }
    };

    for (const rate of ['4', '8', '16']) {
      times.length = 0;
      benchReset();
      clock = ORIGIN; stepTime = ORIGIN + 0.03; stepIx = 5;
      p.setPattern('repeat');
      p.setRate(rate);
      p.start('roundMono');
      // Long enough for the SLOWEST rate to reach its first grid step and the one after
      // it: at 1/4 that is half a second per hit, plus up to three 16ths of waiting for
      // the grid. A window sized for 1/16 would pass by never scheduling anything.
      await runClock(900);
      p.stop();
      const per = Number(rate) === 16 ? 1 : Number(rate) === 8 ? 2 : 4;
      assert(times.length > 0, `at 1/${rate} it sounds`);
      // Every hit must sit exactly on a grid step, and on one this rate falls on.
      const onGrid = times.every((t) => {
        const k = (t - (ORIGIN + 0.03)) / SPB;
        return Math.abs(k - Math.round(k)) < 1e-6 && ((5 + Math.round(k)) % per + per) % per === 0;
      });
      assert(onGrid,
        `at 1/${rate} every hit is on the song's grid, on a step that rate falls on`);
      assert(times.every((t) => t >= ORIGIN), `at 1/${rate} nothing lands in the past`);
    }

    // Nothing playing: no grid to join, so it starts straight away rather than waiting
    // for a beat that is never coming.
    times.length = 0;
    benchReset();
    clock = ORIGIN;
    const solo = createPatternPlayer({ Audio: synced, bpm: () => 120, root: () => 110 });
    solo.setRate('16');
    solo.start('roundMono');
    await runClock(80);
    solo.stop();
    assert(times.length && times[0] < ORIGIN + 0.12,
      'with nothing playing the bench starts immediately rather than waiting for a beat');
  }

  // A different preset is a different pool, so it inherits neither the constraint nor
  // the latency: switching mid-pattern must not hold the new sound back.
  times.length = 0;
  benchReset();
  now = 900;
  player.setRate('16');
  player.start('roundMono');
  await runFor(120);
  now = 900;
  benchPlay(fakeAudio, 'kickDeep', 55, { at: 0.02 });
  assert(Math.abs(times[times.length - 1] - 900.02) < 1e-6,
    'another preset starts clean — its pool has nothing queued on it');
  player.stop();

  // ---- the note stops when its step does --------------------------------------
  //
  // A preview is HELD by default: it sounds until a note-off, which is what a key press
  // is. A figure has no finger — and the player knows each note's length before it
  // sounds — so it asks for the ordinary gate instead. Held, a sustaining preset had
  // every note of the figure still open at its sustain level, ringing on to the rack's
  // thirty-second safety stop: eight notes a bar, none of them ever ending.
  // EVERY figure at EVERY rate, because the fault is in the note rather than in the
  // cell: one held note per step is one held note per step whether the cell is a
  // repeat, an arpeggio, a chord or a progression.
  for (const p of PATTERNS) {
    for (const rate of PATTERN_RATES) {
      asked.length = 0;
      times.length = 0;
      benchReset();
      now = 1200;
      player.setRate(rate.id);
      player.setPattern(p.id);          // a progression may take the rate down with it
      const steps = player.rate.steps;
      player.start('roundMono');
      // The fake clock moves half a STEP per tick, so a slow rate is covered in the same
      // handful of ticks a fast one is — off-beat at 1/1 rests for a whole bar before it
      // sounds anything, and a window sized for 1/16 would call that silence.
      await runFor(200, Math.max(0.02, (0.125 * steps) / 2));
      player.stop();
      assert(asked.length > 0, `${p.id} at 1/${rate.id} sounds something`);
      assert(asked.every((a) => a.hold === false),
        `${p.id} at 1/${rate.id} holds nothing open — no finger is on it`);
      assert(asked.every((a) => Math.abs(a.bank.bassDur - steps * 0.8) < 1e-9),
        `${p.id} at 1/${rate.id} gates every note to 80% of its interval (${steps * 0.8} sixteenths)`);
    }
  }

  // The gate is proportional to the chosen interval, including intentional overlap.
  for (const percent of [50, 80, 100, 150]) {
    asked.length = 0;
    times.length = 0;
    benchReset();
    now = 1280;
    player.setPattern('chord');
    player.setRate('8');
    player.setGate(percent);
    player.start('roundMono');
    await runFor(80);
    player.stop();
    assert(asked.length >= 3 && asked.every((a) => Math.abs(a.bank.bassDur - 2 * percent / 100) < 1e-9),
      `a 1/8 chord at ${percent}% gives every tone a ${2 * percent / 100}-sixteenth gate`);
  }

  // ...and the gate SURVIVES the trip to the rack, which is the half a bank key cannot
  // state on its own. Three things downstream have an opinion about a note's length and
  // any of them would quietly win: `soloBank` strips the per-note lengths (a preview
  // happens at no step of the song, so there is nothing for one to be the length OF),
  // `legacyLaneLength` falls back to the preset's own `dur` when the bank names none,
  // and a preset carrying `fixedLength` overrides every one of them in seconds.
  //
  // So the claim is the ratio rather than the number: at 100% a note lasts exactly its
  // interval, at every rate. That is what "a fraction of the selected interval" means,
  // and it is the sentence to check against when a figure sounds shorter than it reads.
  for (const rate of PATTERN_RATES) {
    const gateSteps = rate.steps;                       // 100%
    const one = soloBank(benchBank('roundMono', 120, gateSteps), 'bass', 220, 1);
    const reaching = effectiveStepLen(one, 'bass', 1);
    assert(Math.abs(reaching - rate.steps) < 1e-9,
      `a 100% gate at 1/${rate.id} reaches the rack as the whole interval`
      + ` (${rate.steps} sixteenths), not the preset’s own dur`);
  }
  assert(!VOICES.roundMono.fixedLength,
    'and no bench preset may carry fixedLength, which would override the gate in seconds');

  // The keys are the other half of the same claim: a note played by a finger has no
  // length until the finger says so, and must still be held.
  asked.length = 0;
  benchReset();
  now = 1300;
  benchPlay(fakeAudio, 'roundMono', 110);
  assert(asked[0].hold !== false, 'a key press is still held until it is released');
  assert(!('bassDur' in asked[0].bank), 'and carries no length — the finger is the length');

  // And the Hit button is the third case: nothing is coming to release it, so it takes
  // the preset's own length rather than the rack's thirty-second safety stop.
  asked.length = 0;
  benchReset();
  benchPlay(fakeAudio, 'roundMono', 110, { hold: false });
  assert(asked[0].hold === false, 'sounding a preset ONCE is not a held note');
  assert(!('bassDur' in asked[0].bank),
    'and takes no gate either — “once” is the preset’s own dur, not a step of some rate');
}

// ---- the key ------------------------------------------------------------------
//
// A scale is a filter over a chromatic keyboard, plus a quantiser for the figures. The
// quantiser is the part that can be quietly wrong: it is what makes one set of cells
// serve every key, so a triad written 0/4/7 has to come out minor in Minor without
// anybody having written a minor triad down anywhere.
{
  const byId = Object.fromEntries(SCALES.map((s) => [s.id, s]));
  assert(byId.chromatic.steps === null, 'chromatic has no step list — every note belongs');
  assert(snapToScale(7, null) === 7, 'and nothing is moved when there is no scale');
  for (const s of SCALES.filter((x) => x.steps)) {
    assert(s.steps[0] === 0, `${s.id} starts on its root`);
    assert(s.steps.every((n, i) => i === 0 || n > s.steps[i - 1]), `${s.id} is in order`);
    assert(s.steps.every((n) => n >= 0 && n < 12), `${s.id} stays inside one octave`);
  }
  assert(byId.major.steps.length === 7 && byId.minor.steps.length === 7, 'the scales have seven notes');
  assert(byId.majorPent.steps.length === 5 && byId.minorPent.steps.length === 5, 'the pentatonics have five');

  // The claim the whole design rests on: the SAME cell, spelled by the scale.
  const triad = [0, 4, 7];
  const spell = (steps) => triad.map((n) => snapToScale(n, steps));
  assert(spell(byId.major.steps).join(',') === '0,4,7', 'a major triad in Major is a major triad');
  assert(spell(byId.minor.steps).join(',') === '0,3,7',
    'and the same cell in Minor is a MINOR triad — the third moves, nothing else does');
  assert(spell(byId.minorPent.steps).join(',') === '0,3,7', 'and in minor pentatonic too');

  // Intervals every scale here contains must never move, or `octaves` and `fifths` would
  // wander about depending on the key.
  for (const s of SCALES.filter((x) => x.steps)) {
    assert(snapToScale(0, s.steps) === 0, `${s.id} leaves the root alone`);
    assert(snapToScale(7, s.steps) === 7, `${s.id} leaves the fifth alone`);
    assert(snapToScale(12, s.steps) === 12, `${s.id} leaves the octave alone`);
    assert(snapToScale(-12, s.steps) === -12, `${s.id} leaves the octave BELOW alone`);
  }
  // A note near the top of the octave has the next root as a candidate, and it can be
  // the nearest one — a pentatonic topping out at 10 is two semitones from 11 and one
  // from 12. Getting this wrong drops the note an octave, audibly.
  // Major pentatonic tops out at 9, so 11 is two semitones from the highest step and one
  // from the octave — a strictly nearer answer that is not in the list at all.
  assert(snapToScale(11, byId.majorPent.steps) === 12,
    'a note nearer the octave than any step in the list snaps UP to it, not down the octave');
  // Minor pentatonic tops out at 10, so 11 is equidistant from 10 and 12. Ties go down,
  // which is the documented rule — what matters is that it is the SAME answer every
  // time, or a repeating figure would spell itself differently on alternate passes.
  assert(snapToScale(11, byId.minorPent.steps) === 10,
    'and a tie resolves downward, consistently');
  for (const s of SCALES.filter((x) => x.steps)) {
    for (let n = -24; n <= 24; n++) {
      const out = snapToScale(n, s.steps);
      assert(Math.abs(out - n) <= 2, `${s.id} never moves ${n} more than two semitones`);
      const pc = ((out % 12) + 12) % 12;
      assert(s.steps.includes(pc), `${s.id} always lands ON the scale (${n} → ${out})`);
    }
  }

  // Membership, which is what dims a key.
  assert(inScale(60, 0, null), 'with no scale every note belongs');
  assert(inScale(60, 0, byId.major.steps) && !inScale(61, 0, byId.major.steps),
    'C is in C major and C# is not');
  assert(inScale(61, 1, byId.major.steps), 'and C# is in C# major — the root moves the whole set');
  assert(inScale(48, 0, byId.major.steps), 'membership is by pitch class, whatever the octave');
  assert(PITCH_CLASSES.length === 12 && PITCH_CLASSES[0] === 'C' && PITCH_CLASSES[9] === 'A',
    'the twelve pitch classes are named from C');
}

console.log(failed ? '\nBENCH: FAILED' : '\nBENCH: PASSED');
process.exit(failed ? 1 : 0);
