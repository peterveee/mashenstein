import { createNoteFxProcessor, orderedTones, resolveNoteFx } from '../src/engine/note-fx.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const json = (value) => JSON.stringify(value);

const chord = [440, 220, 330];
assert(json(orderedTones(chord, 'up')) === '[220,330,440]', 'up orders low to high');
assert(json(orderedTones(chord, 'down')) === '[440,330,220]', 'down orders high to low');
assert(json(orderedTones(chord, 'updown')) === '[220,330,440,330]', 'up/down avoids doubled endpoints');
assert(json(orderedTones(chord, 'random', 'same')) === json(orderedTones(chord, 'random', 'same')),
  'random order is deterministic for the same song position');

const inherited = { strum: { enabled: true, gapMs: 12 }, arp: { enabled: false } };
assert(resolveNoteFx(inherited, { noteFx: { chords: { mode: 'inherit' } } }, 'chords') === inherited,
  'inherit uses the track Note FX unchanged');
assert(json(resolveNoteFx(inherited, { noteFx: { chords: { mode: 'off' } } }, 'chords')) === '{}',
  'a bar can turn track Note FX off');
assert(resolveNoteFx(inherited, { noteFx: { chords: { mode: 'on', strum: { gapMs: 30 } } } }, 'chords')
  .strum.gapMs === 30, 'a bar override merges over its track default');

const p = createNoteFxProcessor();
const strummed = p.process({ laneKey: 'chords', value: chord, len: [2, 3, 4], step: 0,
  spb: 0.1, barIndex: 0, config: { strum: { enabled: true, direction: 'up', gapMs: 20 } } });
assert(json(strummed.map((e) => e.freq)) === '[220,330,440]', 'strum follows its selected pitch direction');
assert(json(strummed.map((e) => e.delay)) === '[0,0.02,0.04]', 'strum gap is scheduled in seconds');
assert(json(strummed.map((e) => e.len).sort()) === '[2,3,4]',
  'delaying strummed notes does not shorten their full source lengths');

const singleBar = createNoteFxProcessor();
const trackFx = {};
const affectedBar = { noteFx: { chords: { mode: 'on',
  strum: { enabled: true, direction: 'up', gapMs: 20 } } } };
const adjacentBar = {};
const affectedEvents = singleBar.process({ laneKey: 'chords', value: chord, len: 1, step: 0,
  spb: 0.1, barIndex: 0, config: resolveNoteFx(trackFx, affectedBar, 'chords') });
const adjacentEvents = singleBar.process({ laneKey: 'chords', value: chord, len: 1, step: 0,
  spb: 0.1, barIndex: 1, config: resolveNoteFx(trackFx, adjacentBar, 'chords') });
assert(json(affectedEvents.map((e) => e.delay)) === '[0,0.02,0.04]'
  && json(adjacentEvents.map((e) => e.delay)) === '[0,0,0]',
  'a one-bar strum override affects that bar and leaves its adjacent bar unchanged');

p.reset();
const arp = { arp: { enabled: true, direction: 'up', rate: 0.5, octaves: 2,
  gate: 80, retrigger: 'chord', latch: false } };
const arpEvents = [];
for (let step = 0; step <= 2; step += 0.5) {
  arpEvents.push(...p.process({ laneKey: 'chords', value: step === 0 ? [220, 330] : null,
    len: 2, step, spb: 0.1, barIndex: 0, config: arp }));
}
assert(json(arpEvents.map((e) => e.freq)) === '[220,330,440,660,220]',
  'arpeggiator expands octaves and advances once per selected rate');
assert(arpEvents.every((e) => Math.abs(e.len - 0.4) < 1e-9),
  'arpeggiator gate is a percentage of its musical rate');

const oneShot = createNoteFxProcessor();
const oneShotFx = { arp: { enabled: true, direction: 'up', rate: 0.5, octaves: 4,
  repeat: false, gate: 80, retrigger: 'continuous', latch: false } };
const oneShotEvents = [];
for (let step = 0; step <= 2.5; step += 0.5) {
  oneShotEvents.push(...oneShot.process({ laneKey: 'lead', value: step === 0 ? 220 : null,
    len: 0.5, step, spb: 0.1, barIndex: 0, config: oneShotFx }));
}
assert(json(oneShotEvents.map((e) => e.freq)) === '[220,440,880,1760]',
  'a non-repeating arpeggiator completes one four-octave pass and then stops');
const retriggered = oneShot.process({ laneKey: 'lead', value: 330, len: 0.5,
  step: 3, spb: 0.1, barIndex: 0, config: oneShotFx });
assert(retriggered[0]?.freq === 330,
  'the next chord retriggers a completed one-shot even in continuous mode');

p.reset();
const latched = { arp: { enabled: true, direction: 'down', rate: 1, octaves: 1,
  gate: 100, retrigger: 'continuous', latch: true } };
const first = p.process({ laneKey: 'lead', value: [220, 440], len: 1, step: 0,
  spb: 0.1, barIndex: 0, config: latched });
const later = p.process({ laneKey: 'lead', value: null, len: null, step: 4,
  spb: 0.1, barIndex: 1, config: latched });
assert(first[0]?.freq === 440 && later[0]?.freq === 220,
  'continuous latch retains the chord across bars and advances its pattern');

console.log(failed ? '\nNOTE FX: FAILED' : '\nNOTE FX: PASSED');
process.exit(failed ? 1 : 0);
