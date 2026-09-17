// CAPSULES STAND CLEAR, AND THEY DO NOT REPEAT THEMSELVES.
//
// Three things a player should never see, checked against real runs rather than
// against the placers in isolation — because the bug in every one of these cases
// was not inside a placer, it was between two of them:
//
//   1. A capsule or a cell sharing pixels with an obstacle. The drip drops into
//      a lane the pattern spawner filled seconds earlier and knew nothing about
//      it; the fix is DripSpawner.settle and spawner.js clearOfHazards.
//
//   2. Two capsules inside one screen. POWER_MIN_GAP has always said so, but it
//      only bound the sources that reported to the ledger, and a fork's own
//      lowPrize — standing on the LANE, not up on the road — never did. That put
//      an authored capsule and a dripped one five pixels apart.
//
//   3. A capsule following its own kind. The roll used to reroll once and accept
//      the second answer, which on the shipped ladder repeated about one capsule
//      in six.
//
// Deliberately NOT checked: two capsules close in x on DIFFERENT roads. A fork
// pays out on both sides on purpose — that is the decision it exists to pose —
// so only capsules standing on the lane are compared with each other.
import { installDom } from './dom-stub.js';
installDom();

const { save } = await import('../src/engine/save.js');
const { RunState } = await import('../src/game/run.js');
const { STAGES } = await import('../src/data/stages.js');
const { POWER_MIN_GAP } = await import('../src/game/spawner.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);

const overlaps = [], crowded = [], repeats = [];
let capsules = 0, drops = 0;

for (const stage of STAGES.filter((s) => s.index >= 1)) {
  for (const seed of [101, 202, 303]) {
    const run = new RunState({ stage, save, seed, difficulty: 1, skipRunIn: true, onEnd() {} });
    run.enter();
    // Keep the probe on the placement branch: a hazard reaction adds hitstop
    // and a death would restart the lane, neither of which this is about.
    run.collide = () => {};
    const seen = new Set();
    const lane = [];
    for (let i = 0; i < 60 * 70 && !run.ended; i++) {
      run.update(1 / 60);
      // JUDGED WHEN IT REACHES THE SCREEN, not when it is created. A drop is
      // laid hundreds of pixels beyond the right edge and the lane keeps moving
      // underneath it: it can be withdrawn again before anybody sees it (a
      // dripped capsule gives way to a gated prize the fill lays afterwards —
      // makeRoomForGatedPrize), and a capsule that was never on screen is not a
      // capsule the player was shown two of. The frame it crosses the edge is
      // the first frame the complaint could be made, so that is where it counts.
      const edge = run.viewRightX();
      for (const p of run.pickups) {
        // A prize is still in the air until it settles; where it lands is what
        // the rule is about, and it is checked on the frame it comes to rest.
        if (!p.live || p.toss || seen.has(p.id) || p.x > edge) continue;
        if (!p.def.power && p.type !== 'battery') continue;
        seen.add(p.id);
        drops++;
        for (const ob of run.obstacles) {
          // A tunnel mouth wears isGap and is a ROAD, not a hole — see the
          // inBand note in spawner.js. Gaps are excluded here for the same
          // reason: a pickup's relationship with a hole is about lures and
          // landings, which clearOfHazards owns; this is about shared pixels.
          if (!ob.live || ob.def.isGap) continue;
          if (p.x < ob.x + ob.w && p.x + p.w > ob.x
            && p.alt < ob.alt + ob.h && p.alt + p.h > ob.alt) {
            overlaps.push(`${stage.id}:${seed} ${p.type}@${p.x.toFixed(0)}/${p.alt} inside ${ob.type}@${ob.x.toFixed(0)}/${ob.alt}`);
          }
        }
        // `road` is the tag the route prizes set on anything standing ON a
        // branch; everything without it is on the lane the drip deals to.
        if (p.def.power && !p.road) { capsules++; lane.push({ x: p.x, type: p.type }); }
      }
    }
    lane.sort((a, b) => a.x - b.x);
    for (let i = 1; i < lane.length; i++) {
      const a = lane[i - 1], b = lane[i];
      const gap = b.x - a.x;
      if (gap < POWER_MIN_GAP) {
        crowded.push(`${stage.id}:${seed} ${a.type}@${a.x.toFixed(0)} and ${b.type}@${b.x.toFixed(0)} — ${gap.toFixed(0)}px apart`);
      }
      // Neighbours in SPACE with nothing between them: two of a kind a screen
      // and a half apart is the table dealing, two adjacent is it stuttering.
      if (a.type === b.type && gap < POWER_MIN_GAP * 2) {
        repeats.push(`${stage.id}:${seed} two ${a.type} — ${a.x.toFixed(0)} and ${b.x.toFixed(0)}`);
      }
    }
  }
}

assert(drops > 300 && capsules > 200, `the sweep saw a real sample (${drops} drops, ${capsules} lane capsules)`);
assert(overlaps.length === 0,
  `no capsule or cell shares pixels with an obstacle (${overlaps.length})\n  ${overlaps.slice(0, 5).join('\n  ')}`);
assert(crowded.length === 0,
  `no two lane capsules inside one screen (${crowded.length})\n  ${crowded.slice(0, 5).join('\n  ')}`);
assert(repeats.length === 0,
  `no capsule stands near another of its own kind (${repeats.length})\n  ${repeats.slice(0, 5).join('\n  ')}`);

console.log(failed ? 'CAPSULE-CLEARANCE: FAILED' : 'CAPSULE-CLEARANCE: PASSED');
process.exit(failed ? 1 : 0);
