import { createNoteFxProcessor, orderedTones, resolveNoteFx, noteFxRange, foldTonesToRange,
  noteFxLimit, NOTE_FX_LIMIT_MAX } from '../src/engine/note-fx.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const json = (value) => JSON.stringify(value);

// MIDI note numbers in the file's spelling: 48 is C3, an octave below the desk's C3.
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const midiOf = (freq) => Math.round(12 * Math.log2(freq / 440) + 69);

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

// ---- the note limit ---------------------------------------------------------------------
//
// Octaves says how tall the stack is; the limit says where to stop climbing it. The whole
// point is the shapes BETWEEN the octave counts — five notes of a two-octave seventh is
// neither one octave nor two.
assert(noteFxLimit({}) === 0 && noteFxLimit({ limit: 0 }) === 0 && noteFxLimit({ limit: -3 }) === 0,
  'no limit unless a positive count is set');
assert(noteFxLimit({ limit: 5 }) === 5 && noteFxLimit({ limit: 999 }) === NOTE_FX_LIMIT_MAX,
  'a limit is a whole count of notes, capped where the stack itself runs out');

const capped = createNoteFxProcessor();
const cappedFx = { arp: { enabled: true, direction: 'up', rate: 0.5, octaves: 2,
  limit: 5, repeat: false, gate: 80, retrigger: 'chord', latch: false } };
const cappedEvents = [];
for (let step = 0; step <= 3.5; step += 0.5) {
  cappedEvents.push(...capped.process({ laneKey: 'chords',
    value: step === 0 ? [220, 275, 330, 415] : null,
    len: 0.5, step, spb: 0.1, barIndex: 0, config: cappedFx }));
}
assert(json(cappedEvents.map((e) => e.freq)) === '[220,275,330,415,440]',
  'a seventh over two octaves cut to five plays the chord and then its root an octave up');

const cyclic = createNoteFxProcessor();
const cyclicEvents = [];
for (let step = 0; step <= 3; step += 0.5) {
  cyclicEvents.push(...cyclic.process({ laneKey: 'chords',
    value: step === 0 ? [220, 330] : null, len: 4, step, spb: 0.1, barIndex: 0,
    config: { arp: { ...cappedFx.arp, limit: 3, repeat: true } } }));
}
assert(json(cyclicEvents.map((e) => e.freq)) === '[220,330,440,220,330,440,220]',
  'a repeating arpeggiator cycles the limited notes rather than stopping at them');

const foldedLimit = createNoteFxProcessor();
const foldedEvents = [];
for (let step = 0; step <= 1.5; step += 0.5) {
  foldedEvents.push(...foldedLimit.process({ laneKey: 'chords',
    value: step === 0 ? [hz(60), hz(64), hz(67)] : null, len: 0.5, step, spb: 0.1, barIndex: 0,
    config: { arp: { enabled: true, direction: 'up', rate: 0.5, octaves: 4, limit: 4,
      repeat: false, gate: 80, retrigger: 'chord', latch: false,
      rangeLimit: true, rangeLo: 60, rangeHi: 72 } } }));
}
assert(json(foldedEvents.map((e) => midiOf(e.freq))) === '[60,64,67,72]',
  'the limit is counted after the fold, so duplicates the window removed do not eat into it');
const downLimited = createNoteFxProcessor();
const downEvents = [];
for (let step = 0; step <= 1; step += 0.5) {
  downEvents.push(...downLimited.process({ laneKey: 'chords',
    value: step === 0 ? [220, 330] : null, len: 0.5, step, spb: 0.1, barIndex: 0,
    config: { arp: { ...cappedFx.arp, direction: 'down', limit: 3 } } }));
}
assert(json(downEvents.map((e) => e.freq)) === '[440,330,220]',
  'the limit trims the top of the stack whichever direction the pattern then runs');

p.reset();
const latched = { arp: { enabled: true, direction: 'down', rate: 1, octaves: 1,
  gate: 100, retrigger: 'continuous', latch: true } };
const first = p.process({ laneKey: 'lead', value: [220, 440], len: 1, step: 0,
  spb: 0.1, barIndex: 0, config: latched });
const later = p.process({ laneKey: 'lead', value: null, len: null, step: 4,
  spb: 0.1, barIndex: 1, config: latched });
assert(first[0]?.freq === 440 && later[0]?.freq === 220,
  'continuous latch retains the chord across bars and advances its pattern');

// ---- the pitch window -------------------------------------------------------------------
//
// The point of a range is that the SOURCE stops deciding the register. These read in MIDI
// note numbers, the file's spelling: 48 is C3, an octave below the desk's C3.
assert(json(foldTonesToRange([hz(84), hz(88), hz(91)], 48, 72).map(midiOf)) === '[72,64,67]',
  'a chord written above the window folds down into it by whole octaves');
assert(json(foldTonesToRange([hz(24), hz(28)], 48, 72).map(midiOf)) === '[48,52]',
  'a chord written below the window folds up into it');
assert(json(foldTonesToRange([hz(55), hz(64)], 48, 72).map(midiOf)) === '[55,64]',
  'notes already inside the window keep the octave they were written in');
assert(json(foldTonesToRange([hz(48), hz(60), hz(72), hz(84)], 48, 60).map(midiOf)) === '[48,60]',
  'an octave stack taller than the window folds back in and drops the duplicates');
assert(noteFxRange({ rangeLimit: true, rangeLo: 48, rangeHi: 52 })?.hi === 60,
  'a window shorter than an octave is read as a whole octave, which is the least the fold needs');
assert(noteFxRange({ rangeLo: 48, rangeHi: 72 }) === null
  && noteFxRange({ rangeLimit: true }) === null,
  'no window unless the limit is on and both ends are set');

const ranged = createNoteFxProcessor();
const rangedFx = { arp: { enabled: true, direction: 'up', rate: 1, octaves: 2, gate: 80,
  retrigger: 'chord', latch: false, rangeLimit: true, rangeLo: 48, rangeHi: 72 } };
const rangedEvents = [];
for (let step = 0; step <= 3; step += 1) {
  rangedEvents.push(...ranged.process({ laneKey: 'chords',
    value: step === 0 ? [hz(84), hz(88), hz(91)] : null,
    len: 4, step, spb: 0.1, barIndex: 0, config: rangedFx }));
}
assert(json(rangedEvents.map((e) => midiOf(e.freq))) === '[64,67,72,64]',
  'a high chord arpeggiates inside the window, its second octave folded back into the pattern');
assert(rangedEvents.every((e) => midiOf(e.freq) >= 48 && midiOf(e.freq) <= 72),
  'no arpeggiated note sounds outside the window');

// ---- and the scheduler survives it ------------------------------------------------------
//
// Everything above is the processor in isolation. This is the shape that took the desk
// down: an arpeggiator hands `at()` ONE event per tick, `at()` collapses a one-event
// plan to a bare frequency, and the hand-written chord bodies were written for arrays.
// With no voice preset on the lane — the default — the rack declines the note and the
// fallback body is exactly what runs. Rendered through the real engine because no
// processor-level assertion can see which body the frequency lands in; a regression
// here throws inside scheduleStep and the render rejects.
{
  const { openRenderer } = await import('../tools/lib/render-bank-browser.js');
  const rest = new Array(31).fill(null);
  const bank = {
    bpm: 120,
    sections: [{ chords: [[220, 277, 330], ...rest], organChords: [[220, 330], ...rest] }],
    order: [{
      s: 0,
      noteFx: {
        chords: { mode: 'on', arp: { enabled: true, rate: 0.5, direction: 'up',
          retrigger: 'chord', gate: 80, octaves: 1 } },
        organChords: { mode: 'on', arp: { enabled: true, rate: 0.5, direction: 'up',
          retrigger: 'chord', gate: 80, octaves: 1 } },
      },
    }],
  };
  const renderer = await openRenderer();
  try {
    const r = await renderer.render(bank, { repeat: 1, mix: null, trackId: null });
    assert(r.peak > 0.001,
      'an arpeggiated chord lane with no voice preset renders sound through the'
      + ` hand-written bodies (peak ${r.peak.toFixed(4)})`);
  } catch (err) {
    assert(false, `an arpeggiated chord lane must not kill the scheduler: ${err.message}`);
  } finally {
    await renderer.close();
  }
}

console.log(failed ? '\nNOTE FX: FAILED' : '\nNOTE FX: PASSED');
process.exit(failed ? 1 : 0);
