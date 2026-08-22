/*
 * A lane that comes back from silence plays the note it is given — not the ones it missed.
 *
 * ---- why this is its own suite -----------------------------------------------------
 *
 * A live MRDR-3 lane is a persistent AudioWorkletNode fed a quarter-second ahead, and a
 * worklet has one failure the pooled path cannot have: A DISCONNECTED NODE IS NOT
 * RENDERED. Nothing pulls it, so `process()` is never called, so `applyDue` never runs —
 * while the main thread goes on posting notes into a queue nobody is draining. Everything
 * else about the lane looks healthy: the port answers, no fault is raised, and `late`,
 * `steals` and `groups` sit perfectly still because they are only touched inside
 * `process`. The desk's own diagnostics caught one at `awQueued` 1300.
 *
 * The engine now fixes the strand itself — the rack releases its lanes (see
 * `VoiceRack.dispose`) and a note whose destination has moved re-points the lane (see
 * `_playMrdr3Aw`) — which leaves the question this suite asks: what should the core do
 * with the backlog when the pull comes back?
 *
 * NOT PLAY IT. A group is started at the CURRENT frame, so a stale note-on is not played
 * late, it is played NOW at its full written length. A queue of them empties as one
 * chord — every bar the lane missed, arriving together, stealing groups from each other
 * on the way — which is louder and stranger than the silence it replaced. So the core
 * drops a note-on staler than MRDR3_STALE_SECONDS and counts it, and the lane rejoins the
 * music at the note it was actually given.
 *
 * The threshold has to separate two things that are both "late": an ordinary live note a
 * few tens of milliseconds behind (a warming lane, a stalled main thread) which must
 * still play, and a note owed to a moment that is gone, which must not.
 *
 * Note-offs and panics are never dropped however stale, because a dropped note-off leaves
 * a held note ringing with nothing left that can release it.
 *
 * Browserless: the core takes its rate as an argument and is handed its frame, so this is
 * the same string the worklet runs.
 */
import { VOICES } from '../src/data/voices.js';
import { compileMrdr3, mrdr3Colours } from '../src/engine/mrdr3/compile.js';
import { renderMrdr3, frameAt, Mrdr3Core } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables } from '../src/engine/mrdr3/tables.js';
import { mrdr3NoiseSet } from '../src/engine/mrdr3/noise.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const SR = 44100;
const TABLES = mrdr3Tables();
const NOISE = mrdr3NoiseSet(SR, mrdr3Colours(VOICES));
const { patch } = compileMrdr3(VOICES.initSaw);

const rms = (data, from, to) => {
  let sum = 0;
  const a = Math.max(0, Math.floor(from));
  const b = Math.min(data.length, Math.floor(to));
  for (let i = a; i < b; i++) sum += data[i] * data[i];
  return b > a ? Math.sqrt(sum / (b - a)) : 0;
};

const noteOn = (atSeconds, eventId = 1) => ({
  type: 'noteOn', frame: frameAt(atSeconds, SR), eventId,
  hz: [220], durFrames: frameAt(0.4, SR), velocity: 0.9,
});

/**
 * One second of render that BEGINS at `offsetSeconds` on the transport.
 *
 * `frameOffset` is how a lane rejoining the graph is expressed here: the events were
 * stamped for a moment the render never covers, exactly as they are when a node sat
 * unpulled while the queue filled behind it.
 */
const render = (events, offsetSeconds = 0) => renderMrdr3({
  events, seconds: 1, sampleRate: SR, channels: 2, patch, tables: TABLES, noise: NOISE,
  frameOffset: frameAt(offsetSeconds, SR),
});

// ---- the baseline: the same note, on time -------------------------------------------
const onTime = render([noteOn(0.05)]);
assert(rms(onTime.channels[0], 0.1 * SR, 0.4 * SR) > 0.01,
  'a note at its own frame sounds — the baseline the rest of this is measured against');
assert(onTime.health.dropped === 0, 'and nothing was dropped to make that happen');

// ---- a note a whole transport-minute old is not played ------------------------------
const stale = render([noteOn(0.05)], 60);
assert(rms(stale.channels[0], 0, SR) === 0,
  'a note-on stale by a minute is silent: the moment it belonged to is gone');
assert(stale.health.dropped === 1, 'and the core says so, once, in its own counters');
assert(stale.health.late === 1,
  'while still counting it late — dropping it is a decision about the note, not a way of'
  + ' hiding that the lane was not being pulled');

// ---- an ordinarily late note IS played ----------------------------------------------
//
// The lookahead is a quarter of a second and a warming lane can spend most of it
// registering a module, so this is the case that must NOT be swept up with the backlog.
const slightlyLate = render([noteOn(0.05)], 0.3);
assert(rms(slightlyLate.channels[0], 0.3 * SR, 0.6 * SR) > 0.01,
  'a note a third of a second late still sounds — that is a lane warming up, not a strand');
assert(slightlyLate.health.dropped === 0, 'and is not counted as dropped');

// ---- the note the lane was actually given survives the backlog -----------------------
//
// The whole point. A lane rejoining the graph has the bar it missed AND the note that
// woke it in the same queue, and only the second of those is music.
const backlog = [];
for (let i = 0; i < 24; i++) backlog.push(noteOn(0.05 + i * 0.05, i + 1));
const woken = render([...backlog, noteOn(60.1, 99)], 60);
assert(woken.health.dropped === 24, 'every stale note in a full backlog is dropped');
assert(rms(woken.channels[0], 0, 0.05 * SR) === 0,
  'and the backlog does not empty itself into the block that ended the strand');
assert(rms(woken.channels[0], 0.15 * SR, 0.45 * SR) > 0.01,
  'while the note the lane came back FOR plays normally');

// ---- staleness drops NOTE-ONS and nothing else --------------------------------------
//
// A note-off is what ends something that may still be sounding — a note begun before the
// strand and held right through it — and one dropped for being old leaves that note
// ringing with nothing left in the queue that could ever release it. Same for a panic,
// which is the transport saying the lane owes the past nothing.
//
// So the rule is asserted on the counters rather than on a sound: both arrive as late as
// the dropped note-ons above and neither is dropped. (What a panic then does is
// tests/mrdr3-controller.js, which has a lane sounding to clear.)
const staleOff = render([{ type: 'noteOff', frame: frameAt(1, SR), eventId: 5 }], 60);
assert(staleOff.health.late === 1 && staleOff.health.dropped === 0,
  'a note-off stale by a minute is applied, not dropped — dropping one leaves a held note'
  + ' ringing with nothing left that could release it');
const stalePanic = render([{ type: 'panic', frame: frameAt(1, SR) }], 60);
assert(stalePanic.health.late === 1 && stalePanic.health.dropped === 0,
  'and so is a panic, however old: it is the transport saying the queue is owed nothing');

// ---- A PANIC CLEARS WHAT THE TRANSPORT HAD BOOKED, NOT WHAT COMES AFTER --------------
//
// The same moment from the other side. A re-bank on the desk is a rack dispose — which
// panics every lane, so no lane comes back owing the last song — followed immediately by
// a scheduling pass for the new one. Those first notes are posted while the panic is
// still travelling to the frame it names, and clearing the queue outright ate them: the
// song came in a quarter of a second late, for a reason nothing in the desk could show.
//
// Frame order cannot separate the two. The notes that must survive are FURTHER AHEAD than
// the panic, which is exactly why they sit behind it in a queue sorted by frame. So the
// core stamps each event with when it was BOOKED and a panic clears only what was booked
// before it. A whole schedule handed over at construction is one booking, which is what
// keeps `mrdr3Panic` inside an offline render meaning what it always meant — see
// tests/mrdr3-controller.js.
{
  const core = new Mrdr3Core({ rate: SR, maxGroups: 12, maxTones: 4 });
  core.installTables(TABLES);
  core.installNoise(NOISE);
  core.installPatch(patch);
  // Posted in the order the desk posts them: the old song's note, the panic that ends the
  // old song, and then the new song's note — which is FURTHER AHEAD than the panic.
  core.schedule({ ...noteOn(0.30, 1), durFrames: frameAt(0.15, SR) });
  core.schedule({ type: 'panic', frame: frameAt(0.10, SR) });
  core.schedule({ ...noteOn(0.55, 2), durFrames: frameAt(0.30, SR) });
  const out = [new Float32Array(SR), new Float32Array(SR)];
  for (let start = 0; start < SR; start += 128) {
    core.process(out, start, Math.min(128, SR - start), start);
  }
  assert(rms(out[0], 0.30 * SR, 0.45 * SR) === 0,
    'a panic still clears the note the stopped transport had already booked');
  assert(rms(out[0], 0.60 * SR, 0.80 * SR) > 0.01,
    'and the note booked AFTER it survives — that is the new song\'s first bar, and the'
    + ' only thing separating the two is which was booked first');
}

console.log(failed ? `\nMRDR-3 STALE: ${failed} FAILED` : '\nMRDR-3 STALE: OK');
process.exit(failed ? 1 : 0);
