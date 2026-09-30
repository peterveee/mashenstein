// A CHECKPOINT THAT LANDS PART-WAY ALONG A ROAD GIVES THE REST OF THE ROAD BACK.
//
// plumber-1's first checkpoint sits on its tunnel's span, and a restore there came back
// with the tunnel empty: the road starts behind the hero, so its one-shot `sprung` stayed
// set and nothing re-laid it (Peter, 30 Sep 2026). Now a restore re-arms it with a resume
// point, and the entry pass lays what stands past it off the route's own named stream.
//
// Checked here with the harshest version — a snapshot taken INSIDE the tunnel's chamber:
// everything the first pass laid past the resume point comes back, where it was; nothing
// comes back between the hero's feet and the end of his reaction runway.
import { installDom } from './dom-stub.js';
installDom();

const { save } = await import('../src/engine/save.js');
const { RunState } = await import('../src/game/run.js');
const { STAGES } = await import('../src/data/stages.js');
const { PLAYER_X } = await import('../src/game/player.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);
const stage = STAGES.find((s) => s.id === 'plumber-1');
const run = new RunState({ stage, save, seed: 101, difficulty: 1, skipRunIn: true, onEnd() {} });
run.enter();
run.collide = () => {};
const tunnel = run.routes.find((r) => r.kind === 'tunnel');
assert(!!tunnel, 'plumber-1 has its tunnel');
const inside = tunnel.x + (tunnel.bodyW ?? tunnel.w) * 0.3;
const furniture = () => run.obstacles.filter((o) => o.live && o.route === tunnel)
  .map((o) => `${o.type}@${Math.round(o.x)}`).sort();

for (let i = 0; i < 60 * 90 && run.camX < inside; i++) run.update(1 / 60);
const snap = run.makeSnapshot();
const resumeFrom = snap.camX + PLAYER_X + run.spawner.react * run.baseSpeed();
const firstAhead = furniture().filter((k) => +k.split('@')[1] >= resumeFrom);
assert(firstAhead.length > 0, `the first pass has furniture past the resume point (${firstAhead.join(' ')})`);

for (let i = 0; i < 60 * 90 && run.camX < tunnel.x + tunnel.w + 200; i++) run.update(1 / 60);
run.restoreSnapshot(snap);
for (let i = 0; i < 3; i++) run.update(1 / 60);

const after = furniture();
assert(tunnel.sprung, 'the road is re-entered after the restore');
// Same type, near where it was: some furniture moves — a drone hovers, a barrel rolls — so
// the first count caught it a little along from where the restore lays it again.
const near = (k) => after.some((a) => a.split('@')[0] === k.split('@')[0]
  && Math.abs(+a.split('@')[1] - +k.split('@')[1]) <= 64);
assert(firstAhead.every(near),
  `everything past the resume point came back, where it was (${after.join(' ') || 'nothing'})`);
const underHim = after.filter((k) => +k.split('@')[1] < resumeFrom);
assert(underHim.length === 0, `nothing laid between his feet and the runway's end (${underHim.join(' ') || 'none'})`);

if (failed) { console.error('CHECKPOINT MID-ROUTE: FAILED'); process.exit(1); }
console.log('CHECKPOINT MID-ROUTE: PASSED');
