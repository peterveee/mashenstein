// Cues placed on the song. Audio.sfx's `inBeats` has to put EVERY node of a cue
// at the scheduled start, on every cue in the sheet: a builder that still reads
// ctx.currentTime would drop its half of the cue back onto "now" and split the
// sound in two. Also the arithmetic itself: output latency comes off the start,
// and a start already past clamps to now rather than throwing or going backwards.
import { installDom } from './dom-stub.js';
installDom();

const { Audio, CUE_ONSET_LEAD, MAX_CUE_LEAD } = await import('../src/engine/audio.js');
const { readFileSync } = await import('node:fs');
const { fileURLToPath } = await import('node:url');
const { join, dirname } = await import('node:path');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// A context that records when things start and otherwise says yes to everything.
const starts = [];
const param = () => new Proxy({ value: 0 }, {
  get: (o, k) => (k in o ? o[k] : () => o),
  set: (o, k, v) => { o[k] = v; return true; },
});
const PARAMS = new Set(['gain', 'frequency', 'Q', 'detune', 'pan', 'playbackRate', 'offset', 'delayTime',
  'threshold', 'knee', 'ratio', 'attack', 'release']);
const node = () => {
  const store = {};
  return new Proxy(store, {
    get: (o, k) => {
      if (k in o) return o[k];
      if (PARAMS.has(k)) return (o[k] = param());
      if (k === 'start') return (t) => { starts.push(t ?? ctx.currentTime); };
      if (k === 'connect') return (dest) => dest;
      if (k === 'getChannelData') return () => new Float32Array(1024);
      return () => undefined;
    },
    set: (o, k, v) => { o[k] = v; return true; },
  });
};
const ctx = new Proxy({ currentTime: 10, sampleRate: 44100, state: 'running', outputLatency: 0.2, baseLatency: 0.01 }, {
  get: (o, k) => {
    if (k in o) return o[k];
    if (k === 'destination') return node();
    if (typeof k === 'string' && k.startsWith('create')) return () => node();
    return () => undefined;
  },
  set: (o, k, v) => { o[k] = v; return true; },
});
Audio.ctx = ctx;
Audio.master = node(); Audio.sfxGain = node(); Audio.musicGain = node();
Audio.noiseBuf = node(); Audio.crashBuf = node();
Audio.bpm = 120; Audio.tempo = 1; Audio.panicked = false;

// Arithmetic. 120bpm, latency 0.2s, and the cue brought forward far enough that
// what is HEARD lands on the note rather than the silent foot of its 8ms ramp.
const LEAD = 0.008 * 0.9 - 0.002;
const SCHED = 10.3 - LEAD;
// A CUE WHOSE AUDIBLE EDGE IS NOT ITS RAMP gets its own lead, so its nodes start
// earlier than the generic SCHED by exactly the table's margin. See
// CUE_ONSET_LEAD: the boom's weight blooms 37ms after its ramp finishes, and
// placing it on the generic lead put it that far behind the note it burst on.
const schedFor = (name) => 10.3 - (CUE_ONSET_LEAD[name] ?? LEAD);
assert(Math.abs(Audio.cueTimeInBeats(1) - SCHED) < 1e-9,
  'a beat ahead starts a beat from now, less the output latency and the perceptual lead');
assert(Audio.cueTimeInBeats(1) < 10.3, 'the cue starts BEFORE its note, so the sound arrives on it');
assert(Audio.cueTimeInBeats(0.1) === 10, 'a beat closer than the output latency clamps to now, not the past');
assert(Audio.cueTimeInBeats(-3) === 10, 'a beat already heard clamps to now');
assert(Audio.cueTimeInBeats(NaN) === 10, 'no beat means now');
// THE WIDEST lead in the sheet, not the generic one. This is the number a caller
// uses to decide when to ask, and a caller that asked only the generic lead ahead
// would hand the one cue with a wider lead a start time already in the past —
// which clamps to now and plays late, the exact fault the table exists to fix.
assert(Math.abs(Audio.cueLeadBeats() - (0.2 + MAX_CUE_LEAD + 0.1) * 2) < 1e-9,
  'the lead a caller must give is latency plus the WIDEST cue lead plus a tenth, in beats');
assert(MAX_CUE_LEAD >= LEAD, 'and the widest lead is never narrower than the generic one');
assert(Audio.cueAt() === 10 && Audio.cueStart === null, 'outside a firing cueAt() is the live clock');

// AUDIO SYNC. The player's offset stacks on what the browser reports, and every
// "when is this heard" answer has to move by the same amount or the lane, the
// judge and the cues stop agreeing about where the music is.
assert(Audio.reportedLatencySec() === 0.2 && Audio.heardLatencySec() === 0.2,
  'with no offset set, the heard latency is exactly what the device reports');
Audio.setSyncOffset(50);
assert(Audio.reportedLatencySec() === 0.2 && Math.abs(Audio.heardLatencySec() - 0.25) < 1e-9,
  'a +50ms offset is added to the reported latency, and leaves the reported figure alone');
assert(Math.abs(Audio.cueTimeInBeats(1) - (10.5 - 0.25 - LEAD)) < 1e-9,
  'a cue is brought forward by the offset too, so it still lands on its note');
assert(Math.abs(Audio.cueLeadBeats() - (0.25 + MAX_CUE_LEAD + 0.1) * 2) < 1e-9,
  'and the lead a caller must give grows with it');
Audio.setSyncOffset(-100);
assert(Math.abs(Audio.heardLatencySec() - 0.1) < 1e-9, 'a negative offset leans the other way');
Audio.setSyncOffset(NaN);
assert(Audio.heardLatencySec() === 0.2, 'a nonsense offset is no offset, not a broken clock');
Audio.setSyncOffset(0);

// The metronome, which the calibration screen schedules its clicks with. It
// hands back the exact times it used: a tap test that recomputed them from a
// bpm would be measuring its own arithmetic as much as the audio.
starts.length = 0;
const metro = Audio.metronome(4, 20, 120);
assert(metro.times.length === 4 && starts.length === 4,
  'the metronome schedules every click it was asked for');
assert(metro.times.every((t, i) => Math.abs(t - (20 + i * 0.5)) < 1e-9),
  'the times it reports are the times it used');
assert(metro.times.every((t, i) => Math.abs(t - starts[i]) < 1e-9),
  'and the oscillators start on exactly those times');
Audio.cueGain = 7;   // stale from some earlier sfx(); must not reach the clicks
assert(Audio.metronome(2, 30, 120).times.length === 2, 'a second run replaces the first');
Audio.cueGain = 1;
assert(Audio.metronome(0, 30, 120).times.length === 0
  && Audio.metronome(4, NaN, 120).times.length === 0,
  'a nonsense request schedules nothing rather than throwing');
Audio.metronome(4, 40, 120).cancel();
assert(Audio._countInSources.length === 0, 'cancelling drops every scheduled click');

// Every cue on the sheet, placed a beat ahead: nothing may start before SCHED and
// something must start exactly there.
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '../src/engine/audio.js'), 'utf8');
const body = src.slice(src.indexOf('  buildCue(name, opt) {'));
const names = [...new Set([...body.matchAll(/^\s+case '([a-zA-Z0-9]+)':/gm)].map((m) => m[1]))];
assert(names.length > 40, `the sheet was read (${names.length} cues)`);
const late = [], early = [], silent = [];
for (const name of names) {
  starts.length = 0;
  try { Audio.sfx(name, { inBeats: 1, count: 3, dur: 0.5 }); }
  catch (e) { failed = true; console.error('FAIL: cue threw', name, e.message); continue; }
  if (!starts.length) { silent.push(name); continue; }
  const min = Math.min(...starts);
  const want = schedFor(name);
  if (min < want - 1e-9) early.push(`${name}@${min.toFixed(3)}`);
  else if (min > want + 1e-9) late.push(`${name}@${min.toFixed(3)}`);
  assert(Audio.cueStart === null, `${name} left no scheduled start behind`);
}
assert(early.length === 0, `no cue starts a node before its scheduled time: ${early.join(' ') || 'none'}`);
// A volley or a spray holds its first shot back on purpose; a builder still on
// the live clock would be a whole cue length out, not a few frames.
const adrift = late.filter((s) => Number(s.split('@')[1]) > schedFor(s.split('@')[0]) + 0.5);
assert(adrift.length === 0, `every cue starts within half a second of its scheduled time: ${adrift.join(' ') || 'none'}`);
console.log('cues that lead in late by design:', late.join(' ') || 'none');
console.log('cues with no start on this stub:', silent.join(' ') || 'none');

// The table is only worth having if it MOVES the cue it names. Asserted rather
// than assumed, because a typo'd key would fail silently as "no entry, use the
// generic lead" — which is the bug the table was added to fix, restored.
for (const [name, lead] of Object.entries(CUE_ONSET_LEAD)) {
  assert(lead > LEAD, `${name}'s own lead is wider than the generic one, or it need not be in the table`);
  starts.length = 0;
  Audio.sfx(name, { inBeats: 1 });
  assert(starts.length > 0 && Math.abs(Math.min(...starts) - (10.3 - lead)) < 1e-9,
    `${name} is placed by its own lead, not the generic one`);
}

// Unscheduled after scheduled: the start is not inherited.
starts.length = 0;
Audio.sfx('coin');
assert(starts.length && Math.min(...starts) === 10, 'an unscheduled cue after a scheduled one starts now');

if (failed) process.exit(1);
