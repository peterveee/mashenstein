// The AUDIO SYNC tap test: what it measures, what it refuses to measure, and
// what it does to the game when it is applied.
//
// The screen exists because the browser's own latency figure is a guess on
// Bluetooth, and the rhythm lane is placed on a clock that trusts it. Every
// assertion below is really about one thing — a number arrived at by a person
// tapping must end up on Audio's clock and in the save file, and must never end
// up there when the taps did not support it.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { Input } = await import('../src/engine/input.js');
const { Audio } = await import('../src/engine/audio.js');
const { defaultSettings } = await import('../src/engine/save.js');
const {
  CalibrateState, calibrationResult, assignTaps, correlateClocks, tapCtxTime,
  CAL_COUNT, CAL_COUNT_IN, CAL_BPM, CAL_LEAD_SEC,
} = await import('../src/game/calibrate.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// ---- the arithmetic, with no screen involved -------------------------------

// A median, not a mean: one tap missed and recovered late is worth eight
// milliseconds on a mean of twelve, and would quietly bias every player's
// setting in the same direction.
const steady = Array.from({ length: 12 }, (_, i) => 0.18 + (i % 3 - 1) * 0.005);
const r = calibrationResult(steady);
assert(Math.abs(r.medianMs - 180) < 1e-6, 'twelve steady taps read as their median');
assert(r.suggestedMs === 180, 'the suggestion is the median, rounded to the step the setting moves by');
assert(r.enough && !r.unsteady, 'and twelve tight taps are enough, and steady');

const withOutlier = [...steady.slice(0, 11), 0.9];
assert(Math.abs(calibrationResult(withOutlier).medianMs - r.medianMs) < 6,
  'one wild tap barely moves the reading, which is the whole reason for a median');

assert(calibrationResult(steady.slice(0, 7)).enough === false,
  'seven answered clicks is not a measurement');
assert(calibrationResult([0.02, 0.05, 0.2, 0.02, 0.3, 0.06, 0.25, 0.31, 0.04, 0.28]).unsteady,
  'scattered taps are flagged unsteady rather than averaged into a confident wrong answer');

assert(calibrationResult(new Array(10).fill(0.9)).suggestedMs === 500
  && calibrationResult(new Array(10).fill(-0.3)).suggestedMs === -100,
'the suggestion is clamped to the range the setting allows');

// ---- matching taps to clicks ----------------------------------------------

const clicks = Array.from({ length: CAL_COUNT }, (_, i) => 100 + i * 0.5);
const REPORTED = 0.2;
const perfect = clicks.map((c) => c + REPORTED + 0.18);
assert(assignTaps(perfect, clicks, REPORTED).length === CAL_COUNT - CAL_COUNT_IN,
  'a tap on every click scores every click but the count-in');
assert(assignTaps(perfect, clicks, REPORTED).every((x) => Math.abs(x - 0.18) < 1e-9),
  'and each residual is how late that tap was, with the reported latency already taken out');

// Inside the run every moment is within a quarter second of some click, which is
// the point: an early tap belongs to the click it was early FOR. The window's
// real job is at the ends, where a stray press before the count-in or long after
// the last click is not an answer to anything.
assert(assignTaps([clicks[8] + REPORTED + 0.4], clicks, REPORTED).length === 1,
  'a tap between two clicks belongs to the nearer one, early or late');
assert(assignTaps([clicks[CAL_COUNT - 1] + REPORTED + 1.2], clicks, REPORTED).length === 0
  && assignTaps([clicks[0] + REPORTED - 1.2], clicks, REPORTED).length === 0,
'a press outside the run answers no click at all');
assert(assignTaps([clicks[8] + REPORTED + 0.05, clicks[8] + REPORTED + 0.09], clicks, REPORTED).length === 1,
  'a double tap counts once: the correction is not the reaction being measured');
assert(assignTaps([clicks[0] + REPORTED, clicks[1] + REPORTED], clicks, REPORTED).length === 0,
  'taps on the count-in are matched and then thrown away, so they cannot be stolen by a scored click');

// ---- the two clocks --------------------------------------------------------

const clockCtx = { currentTime: 50 };
const corr = correlateClocks(clockCtx);
assert(Math.abs(tapCtxTime(corr, dom.now()) - 50) < 1e-6,
  'a tap at the moment of correlation maps to the audio clock reading there');
assert(Math.abs(tapCtxTime(corr, dom.now() + 250) - 50.25) < 1e-6,
  'and a quarter second later maps a quarter second on: the two clocks are never otherwise related');

// ---- the screen ------------------------------------------------------------

const starts = [];
const param = () => new Proxy({ value: 0 }, {
  get: (o, k) => (k in o ? o[k] : () => o),
  set: (o, k, v) => { o[k] = v; return true; },
});
const PARAMS = new Set(['gain', 'frequency', 'Q', 'detune', 'pan', 'playbackRate']);
const node = () => new Proxy({}, {
  get: (o, k) => {
    if (k in o) return o[k];
    if (PARAMS.has(k)) return (o[k] = param());
    if (k === 'start') return (t) => { starts.push(t); };
    if (k === 'connect') return (dest) => dest;
    return () => undefined;
  },
  set: (o, k, v) => { o[k] = v; return true; },
});
const ctx = new Proxy({ currentTime: 100, sampleRate: 44100, state: 'running', outputLatency: REPORTED }, {
  get: (o, k) => {
    if (k in o) return o[k];
    if (k === 'destination') return node();
    if (typeof k === 'string' && k.startsWith('create')) return () => node();
    return () => undefined;
  },
  set: (o, k, v) => { o[k] = v; return true; },
});
Audio.ctx = ctx;
Audio.sfxGain = node(); Audio.master = node(); Audio.musicGain = node();
Audio.ensure = () => {};
Audio.sfx = () => {};
const banked = [];
Audio.setBank = (bank, mix, arr) => { banked.push([bank, mix, arr]); Audio.sourceBank = bank; };

let persisted = 0;
let done = null;
const save = { settings: defaultSettings(), persist() { persisted++; } };

const SONG = { id: 'rhythm' };
Audio.sourceBank = SONG;
Audio.mixEntry = { id: 'mix' };
Audio.arrangement = { id: 'arr' };

const cal = new CalibrateState({ save, onDone: (applied) => { done = applied; } });
cal.enter();
assert(Audio.sourceBank === null, 'entering silences the song: the clicks must be the only thing in the room');

// Silence would measure nothing, so the screen says so rather than running a
// test whose every click is inaudible.
save.settings.volumes.sfx = 0;
cal.start();
assert(cal.phase === 'ready' && /SFX VOLUME/.test(cal.notice || ''),
  'a muted SFX bus stops the test instead of measuring silence');
save.settings.volumes.sfx = 0.9;

const press = (action, at, state = cal) => {
  Input.press(action, at);
  state.update(1 / 60);
  Input.release(action);
  Input.endFrame();
};

press('confirm');
assert(cal.phase === 'tapping', 'confirming starts the run');
assert(cal.clicks.length === CAL_COUNT && starts.length === CAL_COUNT,
  'every click is scheduled up front, so the run cannot drift as it goes');
assert(cal.clicks.every((t, i) => Math.abs(t - (100 + CAL_LEAD_SEC + i * (60 / CAL_BPM))) < 1e-9),
  'and they are laid on the audio clock at the tempo, after a lead-in');

// Tap 180ms after each click is HEARD — the case this whole screen exists for:
// a device reporting 200ms that is really 380ms behind.
const TRUE_EXTRA = 0.18;
for (let i = 0; i < CAL_COUNT; i++) {
  const heard = cal.clicks[i] + REPORTED + TRUE_EXTRA;
  ctx.currentTime = heard;
  dom.frame((heard - cal.corr.ctx0) * 1000 - (dom.now() - cal.corr.perf0));
  press('pointer', dom.now());
}
assert(cal.taps.length === CAL_COUNT, 'every tap is recorded');

ctx.currentTime = cal.clicks[CAL_COUNT - 1] + 2;
cal.update(1 / 60);
Input.endFrame();
assert(cal.phase === 'result', 'the run ends on its own once the last click has been given time to land');
assert(Math.abs(cal.result.medianMs - 180) < 2,
  `the reading is the delay the device did not admit to (${cal.result.medianMs.toFixed(1)}ms)`);
assert(cal.result.suggestedMs === 180, 'and the suggestion is that, rounded to the step');

const drawCtx = document.createElement('canvas').getContext('2d');
cal.draw(drawCtx);
assert(true, 'the result screen renders safely');

press('confirm');
assert(save.settings.audioSyncMs === 180, 'APPLY writes the measured offset');
assert(Math.abs(Audio.syncOffsetSec - 0.18) < 1e-9, 'and puts it on the audio clock at once');
assert(save.settings.audioSyncReportedMs === 200,
  'what the browser claimed at the time is kept, so a later change of headphones can be noticed');
assert(save.settings.audioSyncAsked === true, 'and the briefing will not ask again');
assert(persisted === 1 && done === true, 'the save is written once and the screen reports back');

cal.exit();
assert(Audio.sourceBank === SONG, 'leaving restores the song');
const restored = banked[banked.length - 1];
assert(restored[1] && restored[1].id === 'mix' && restored[2] && restored[2].id === 'arr',
  'with the mix and arrangement it went away with, not a bare bank');

// A second calibration measures the chain afresh rather than correcting its own
// correction: the residuals are taken against what the browser reports, never
// against the offset already applied.
const cal2 = new CalibrateState({ save, onDone: () => {} });
cal2.enter();
ctx.currentTime = 300;
starts.length = 0;
press('confirm', undefined, cal2);
assert(cal2.phase === 'tapping' && starts.length === CAL_COUNT, 'the second run schedules its own clicks');
assert(cal2.reportedSec === REPORTED,
  'the second run measures against the device figure, so applying it replaces rather than accumulates');

// Backing out abandons the clicks. A run left scheduled would click over
// whatever screen the player went to next.
Input.press('back');
cal2.update(1 / 60);
Input.release('back');
Input.endFrame();
assert(Audio._countInSources.length === 0, 'BACK cancels every scheduled click');
cal2.exit();

// Not enough taps is not a small offset, it is no measurement, and the screen
// must not offer to apply one.
const cal3 = new CalibrateState({ save, onDone: () => {} });
cal3.enter();
cal3.result = calibrationResult([0.1, 0.1, 0.1]);
cal3.phase = 'result';
cal3.reportedSec = REPORTED;
assert(!cal3.resultRows().includes('APPLY'),
  'a run with too few taps offers only RETRY and CANCEL');
cal3.draw(drawCtx);
cal3.exit();

// ---- the briefing offer ----------------------------------------------------

const { BriefingState } = await import('../src/game/menus.js');
const stage = { id: 'rhythm-1', index: 1, mission: { desc: 'MEET THE QUOTA' } };
const makeBriefing = () => {
  let played = 0;
  let calibrate = 0;
  const b = new BriefingState({
    cab: { id: 'rhythm' }, stage, askCalibrate: true,
    onDone: () => { played++; },
    onCalibrate: () => { calibrate++; },
  });
  b.enter();
  b.reveal = 999;   // the memo has landed
  return { b, plays: () => played, calibrates: () => calibrate };
};

// The offer is on EVERY rhythm briefing, not just the first: headphones change
// between sessions, and a reading taken on the laptop speaker is the wrong
// number on the bus.
const already = { ...save.settings, audioSyncAsked: true, audioSyncMs: 180 };
const repeat = new BriefingState({
  cab: { id: 'rhythm' }, stage, askCalibrate: true, settings: already,
  onDone() {}, onCalibrate() {},
});
repeat.enter();
assert(repeat.askCalibrate === true, 'a player who has already calibrated is still offered it');
assert(/\+180 MS/.test(repeat.calibrateLabel()),
  'and the row shows the figure in force, so the briefing doubles as the readout');
assert(/CALIBRATE AUDIO SYNC/.test(new BriefingState({
  cab: { id: 'rhythm' }, stage, askCalibrate: true, settings: defaultSettings(),
  onDone() {}, onCalibrate() {},
}).calibrateLabel()), 'before a first calibration it names itself instead');

const straight = makeBriefing();
Input.press('confirm');
straight.b.update(1 / 60);
Input.release('confirm');
Input.endFrame();
assert(straight.plays() === 1 && straight.calibrates() === 0,
  'a player who taps straight through gets the stage, not a screen they did not ask for');

const picky = makeBriefing();
Input.press('up');
picky.b.update(1 / 60);
Input.release('up');
Input.endFrame();
Input.press('confirm');
picky.b.update(1 / 60);
Input.release('confirm');
Input.endFrame();
assert(picky.calibrates() === 1 && picky.plays() === 0, 'and moving up to the offer takes it');

const escaped = makeBriefing();
Input.press('back');
escaped.b.update(1 / 60);
Input.release('back');
Input.endFrame();
assert(escaped.plays() === 1, 'BACK is a way past the question, and the way past it is to play');

const plain = new BriefingState({ cab: { id: 'plumber' }, stage, onDone() {} });
plain.enter();
plain.reveal = 999;
plain.draw(drawCtx);
assert(plain.askCalibrate === false,
  'every other cabinet gets the briefing it always had: only rhythm scores presses against the beat');

// ---- the pause-screen nudge ------------------------------------------------
//
// On a beat stage the offset is a gameplay control, so it is reachable from the
// screen the player is already on when they notice they need it.
const { RunState } = await import('../src/game/run.js');
const pauseSave = { settings: defaultSettings(), persist() { pausePersisted++; } };
let pausePersisted = 0;
const fakeRun = Object.create(RunState.prototype);
fakeRun.save = pauseSave;
fakeRun.beatLock = true;
fakeRun.nudgeAudioSync(1);
fakeRun.nudgeAudioSync(1);
assert(pauseSave.settings.audioSyncMs === 20, 'the pause nudge moves the offset in tens');
assert(Math.abs(Audio.syncOffsetSec - 0.02) < 1e-9, 'and puts it on the audio clock at once');
assert(pausePersisted === 2,
  'and saves on the spot: a run that ends in a quit must not take the correction with it');
for (let i = 0; i < 60; i++) fakeRun.nudgeAudioSync(1);
assert(pauseSave.settings.audioSyncMs === 500, 'it clamps rather than running away');
for (let i = 0; i < 200; i++) fakeRun.nudgeAudioSync(-1);
assert(pauseSave.settings.audioSyncMs === -100, 'at both ends');
Audio.setSyncOffset(0);

Input.clearAll();
console.log(failed ? 'CALIBRATE: FAILED' : 'CALIBRATE: PASSED');
process.exit(failed ? 1 : 0);
