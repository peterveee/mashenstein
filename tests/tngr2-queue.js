/*
 * A key pressed on a TNGR-2 lane that does not exist yet.
 *
 * Registering a worklet module is asynchronous and a scheduling pass is not, so the first
 * notes on a lane are queued and posted the moment the lane resolves. A HELD note — a key
 * down under the editor's keyboard — has no note-off of its own, and a queued one has no
 * lane or event id for a note-off to name. Left alone that is a note-off with nothing to
 * find, and a note that comes back sounding when the lane arrives with no finger on it and
 * nothing that can ever release it.
 *
 * Browserless on purpose: the bug is in the RACK's bookkeeping, not in the worklet, and a
 * test that needed an AudioWorklet to prove it would not run in the default suite.
 */
import { readFileSync } from 'node:fs';
import { VoiceRack } from '../src/engine/voices.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

// A rack with just the parts the queue touches. `_playTngr2Node` is the thing the flush
// calls, so it is the spy: what it is handed is what would have been played.
const harness = () => {
  const rack = Object.create(VoiceRack.prototype);
  rack.ctx = { currentTime: 0 };
  rack._heldNative = new Map();
  rack._activePreviews = new Map();
  rack._tngr2Pending = new Map();
  rack.played = [];
  rack.warms = [];
  rack.warmTngr2Lane = () => new Promise((resolve) => { rack.warms.push(resolve); });
  rack._playTngr2Node = (v, note) => { rack.played.push(note); return true; };
  return rack;
};
const voice = { id: 'tngrBlueCathedral', synth: 'TNGR-2' };
const note = (freq, hold) => ({ freq, time: 0, dur: 0.5, gain: 0.8, hold });

// ---- a glide while the lane builds -------------------------------------------
{
  const rack = harness();
  // Eight keys pressed and released in turn, all inside the build window — a glide.
  const keys = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440];
  for (const hz of keys) {
    rack._queueTngr2(voice, 'bass', note(hz, true));
    rack._releasePreview(`bass|${hz.toFixed(2)}`);
  }
  assert(rack._heldNative.size === 0,
    `every key that came up is out of the books (${rack._heldNative.size} left)`);
  rack.warms[0](true);
  await Promise.resolve(); await Promise.resolve();
  assert(rack.played.length === 0,
    `and a lane that arrives afterwards plays none of them (${rack.played.length} played)`);
}

// ---- the key still down when the lane arrives --------------------------------
{
  const rack = harness();
  rack._queueTngr2(voice, 'bass', note(220, true));
  rack._releasePreview('bass|220.00');
  rack._queueTngr2(voice, 'bass', note(330, true));   // this one is still held
  rack.warms[0](true);
  await Promise.resolve(); await Promise.resolve();
  assert(rack.played.length === 1 && rack.played[0].freq === 330,
    `the note whose key is still down is the one that plays (${JSON.stringify(rack.played.map((p) => p.freq))})`);
  assert(rack._heldNative.has('bass|330.00'),
    'and it is still in the books, so lifting the key can still release it');
}

// ---- a scheduled note is not a held one --------------------------------------
{
  const rack = harness();
  rack._queueTngr2(voice, 'bass', note(220, false));
  assert(rack._heldNative.size === 0,
    'a scheduled note carries its own note-off and never enters the held books');
  rack.warms[0](true);
  await Promise.resolve(); await Promise.resolve();
  assert(rack.played.length === 1, 'and it plays when the lane arrives');
}

// ---- a lane that never builds ------------------------------------------------
{
  const rack = harness();
  rack._queueTngr2(voice, 'bass', note(220, true));
  rack.warms[0](false);
  await Promise.resolve(); await Promise.resolve();
  assert(rack.played.length === 0, 'a lane that fails to build plays nothing');
}

// ---- event ids survive the hand-over -----------------------------------------
//
// The offline schedule is handed to a lane a stretch at a time, and the bookings are
// emptied at every hand-over. An event id is a note's IDENTITY inside the processor — a
// note-off names the note-on it ends, and `findVoice` returns the first ACTIVE voice
// holding that id. So a counter living on the booking restarted at 1 for each stretch,
// the second stretch's notes wore the first stretch's names, and a note-off went to the
// wrong voice: one note released early and the other left sounding for good.
//
// Measured on barber-96 before this: three ids reused while still sounding, the first at
// 51.8 seconds — a French Horn drone from just under a minute in, thickening as the song
// went on. Zero after.
{
  const rack = harness();
  rack.ctx = { sampleRate: 44100 };
  const voice = { id: 'tngrBrassSection', synth: 'TNGR-2' };
  const collect = (hz, time) => rack._collectTngr2(voice, {
    freq: [hz], time, dur: 3, gain: 0.8, laneKey: 'chords',
  });
  const idsIn = (rack2) => [...rack2._tngr2Offline.values()]
    .flatMap((b) => b.events.filter((e) => e.type === 'noteOn').map((e) => e.eventId));

  collect(220, 0); collect(277, 0.5);
  const first = idsIn(rack);
  // The hand-over: exactly what `flushTngr2Offline` does to the books.
  rack._tngr2Offline = new Map();
  collect(330, 4); collect(392, 4.5);
  const second = idsIn(rack);
  assert(first.length === 2 && second.length === 2, 'both stretches booked their notes');
  assert(!second.some((id) => first.includes(id)),
    `the second stretch takes fresh event ids (${first.join(',')} then ${second.join(',')}) —`
    + ' a repeated id sends a note-off to a note that is still sounding');
}

// ---- and the same promise on the LIVE path -----------------------------------
//
// The offline drone above had a twin. Live notes took an id hashed from the note's time
// and pitch — `ms * 131 + round(hz) * 17 + index` — which is a LINEAR combination, so any
// two notes with 131*dms == 17*dhz wore the same name. A C4 and a C3 seventeen
// milliseconds apart is the smallest case; a part that plays the same note twice at once
// collided exactly. Either way both note-offs went to whichever voice `findVoice` reached
// first and the other note was never released at all.
//
// `_playTngr2Node` needs a real lane to spy on, so this pins the source instead: what
// matters is that the identity cannot be computed from the note, because two notes can be
// the same note.
{
  const source = readFileSync(new URL('../src/engine/voices.js', import.meta.url), 'utf8');
  assert(!/Math\.round\(time \* 1000\) \* 131/.test(source),
    'the live event id is not a linear hash of the note time and pitch any more');
  assert(source.includes('const eventId = (lane.nextEventId = (lane.nextEventId || 0) + 1);'),
    'a live note takes its identity from a per-lane counter, which cannot collide');
  // A held note is the only kind with no ending of its own, and every way of ending one —
  // a key coming up, a cancelled pointer, a hidden tab, a MIDI note-off — can fail to
  // arrive. The backstop is booked with the note so nothing has to remember it later.
  assert(source.includes('tngr2NoteOff(lane, { at: time + HOLD_SECONDS, eventId });'),
    'every held TNGR-2 note books a HOLD_SECONDS release it cannot outlive');
}

console.log(failed ? `\nTNGR-2 QUEUE: ${failed} FAILED` : '\nTNGR-2 QUEUE: PASSED');
process.exit(failed ? 1 : 0);
