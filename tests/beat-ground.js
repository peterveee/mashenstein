// The chart's asks painted on the road: which events earn a mark, where they
// stand, and the swell they ride. Pure arithmetic — the painter itself needs a
// canvas, but everything it decides is exported and checked here without one.
import { installDom } from './dom-stub.js';
installDom();

const { beatSwell, beatGroundMarks } = await import('../src/game/beatground.js');

const speed = 232, bpm = 124, pxPerBeat = speed * 60 / bpm;
let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// --------------------------------------------------------------- the swell
// The ribbon's own curve, because the strip and the road are showing the same
// event: 25% over on the beat, back to its own size by the end of it.
const playerWorldX = 4000, beat = 37.4;
assert(Math.abs(beatSwell(12) - 1.25) < 1e-9, 'a mark stands 25% over on the beat');
assert(Math.abs(beatSwell(12.999) - 1) < 1e-6, 'and is back to its own size by the next one');
assert(beatSwell(12.25) > beatSwell(12.5) && beatSwell(12.5) > beatSwell(12.75),
  'the swell decays across the beat');
assert(beatSwell(-0.5) === beatSwell(0.5),
  'a negative beat phases the same way — the clock unwraps below zero on a retry');
for (const bad of [null, NaN, undefined, 'x']) {
  assert(beatSwell(bad) === 1, `a ${String(bad)} clock leaves the mark its own size`);
}

// ---------------------------------------------------------------- the marks
// The lane is the authority, not the chart: a mark is drawn where something was
// actually laid, at the actionX the spawner already stamped on it.
const run = {
  obstacles: [
    { live: true, chartAction: 'jump', actionX: 4100, type: 'beatBar' },
    { live: true, chartAction: 'duck', actionX: 4200, type: 'barrel' },
    { live: false, chartAction: 'jump', actionX: 4300, type: 'beatBar' },
    { live: true, actionX: 4400, type: 'crate' },
  ],
  pickups: [{ live: true, chartAction: 'coin', actionX: 4150, type: 'coin' }],
  spawner: {
    beatEpoch: 0,
    eventInstances: [
      { live: true, chartAction: 'ability', actionX: 4250 },
      { live: true, chartAction: 'coin', actionX: 4700 },
      { live: true, chartAction: 'duck', actionX: 4999 },
    ],
  },
  rhythmSetEvents: [{ beat: 41, action: 'jump' }],
};
const marks = beatGroundMarks(run, beat, playerWorldX, pxPerBeat);
const at = (x) => marks.find((m) => Math.abs(m.worldX - x) < 0.5);

assert(at(4100)?.action === 'jump', 'a laid jump is marked at its action point');
assert(at(4200)?.prop === 'barrel', 'a barrel keeps its own identity for colouring');
assert(!at(4150), 'a coin is not marked — it asks for no button');
assert(at(4250)?.action === 'ability', 'ability slots come off the event instances');
assert(!at(4300), 'a dead entity is not marked');
assert(!at(4400), 'an entity the chart never authored is not marked');
assert(!at(4700), 'a coin instance is skipped as well as a coin pickup');
assert(!at(4999), 'a duck is read off the obstacles, not off the event instances');
assert(marks.every((m) => ['jump', 'duck', 'ability'].includes(m.action)),
  'the road only ever speaks about jump, duck and shoot');

// A crossing whose ask is not one of the three verbs stays off the road too.
assert(beatGroundMarks({ rhythmSetEvents: [{ beat: 41, action: 'coin' }] },
  beat, playerWorldX, pxPerBeat).length === 0, 'a non-verb set event is not marked');

// A crossing's ask lives on a route stone and has only a beat, so it is placed
// off the same origin the grid uses — the line the stone was snapped to.
assert(at(playerWorldX + (41 - beat) * pxPerBeat)?.action === 'jump',
  'a crossing set-piece is placed off the grid origin');

// Two events resolving to one spot on the road are one stripe.
const dupes = beatGroundMarks({
  obstacles: [
    { live: true, chartAction: 'jump', actionX: 4100, type: 'beatBar' },
    { live: true, chartAction: 'jump', actionX: 4100.2, type: 'beatBar' },
  ],
}, beat, playerWorldX, pxPerBeat);
assert(dupes.length === 1, 'marks landing on the same pixel collapse to one');

assert(beatGroundMarks({}, beat, playerWorldX, pxPerBeat).length === 0,
  'a run with no lane yet marks nothing');

console.log(failed ? 'BEAT-GROUND: FAILED' : 'BEAT-GROUND: PASSED');
process.exit(failed ? 1 : 0);
