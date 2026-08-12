import { freezeRenderSpan } from '../tools/lib/freeze-span.js';

let failed = false;
const assert = (condition, message) => {
  console.log(`${condition ? 'ok' : 'FAIL'}: ${message}`);
  if (!condition) failed = true;
};
const rests = () => new Array(32).fill(null);

const sparse = rests();
sparse[16] = 220; // bar 2
sparse[20] = 247;
const sparseNext = rests(); sparseNext[0] = 262; // bar 3
const sparseBank = {
  bpm: 120,
  sections: [{ bass: sparse }, { bass: sparseNext }, { bass: rests() }, { bass: rests() }],
  order: [0, 1, 2, 3], // eight bars; only bars 2 and 3 contain notes
};
const span = freezeRenderSpan(sparseBank, 'bass');
assert(span?.startStep === 0 && span.endStep === 48 && span.steps === 48,
  'a lane used only in bars 2–3 renders one preroll bar plus those active bars, not all eight bars');
assert(span?.steps < span?.formSteps / 2,
  'the sparse render walks materially less than the full song form');

const late = rests(); late[16] = 330;
const lateBank = {
  bpm: 120,
  sections: [{ bass: rests() }, { bass: rests() }, { bass: rests() }, { bass: late }],
  order: [0, 1, 2, 3],
};
const lateSpan = freezeRenderSpan(lateBank, 'bass');
assert(lateSpan?.startStep === 96 && lateSpan.endStep === 128,
  'a late sparse lane keeps its original step origin while rendering only the adjacent bars');

const empty = freezeRenderSpan({ bpm: 120, sections: [{ lead: rests() }], order: [0] }, 'lead');
assert(empty === null, 'a wholly empty lane remains eligible for the instant silent freeze');

const chord = rests(); chord[0] = [220, 277, 330, 440];
const latchedBank = {
  bpm: 120,
  sections: [{ chords: chord }, { chords: rests() }, { chords: rests() }],
  order: [0, 1, 2],
};
const latched = freezeRenderSpan(latchedBank, 'chords', {
  arp: { enabled: true, rate: 1, octaves: 1, gate: 80,
    retrigger: 'continuous', latch: true, repeat: true },
});
assert(latched?.endStep === latched?.formSteps,
  'a latched arpeggiator extends the active render through the end of the played form');

const long = rests(); const longLen = rests();
long[16] = 220; longLen[16] = 40;
const longBank = { bpm: 120, sections: [{ bass: long, bassLen: longLen }], order: [0] };
const longSpan = freezeRenderSpan(longBank, 'bass');
assert(longSpan?.tailSeconds > 2,
  'a written note extending beyond the final scheduled bar adds its gate to the release buffer');

const bounded = freezeRenderSpan(lateBank, 'bass', null, { playStartStep: 80, playEndStep: 128 });
assert(bounded?.startStep >= 80 && bounded.endStep <= 128,
  'song-loop playback bounds constrain the sparse render span');

console.log(failed ? '\nFREEZE SPAN: FAILED' : '\nFREEZE SPAN: PASSED');
process.exit(failed ? 1 : 0);
