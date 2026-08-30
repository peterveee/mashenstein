// NOTHING VANISHES IN PLAIN VIEW — the rule several sweeps state in comments,
// enforced here as one invariant over real play: an obstacle or pickup that is
// on screen may only leave the world by an event the player can see (broken,
// punted away, eaten, collected) or by scrolling off the left edge. Anything
// else is a pop-out, and a pop-out is a bug wherever it comes from — a route
// sweep, a scripted pit cut, a portal clearing its lane, the finish arming.
//
// The bot plays real campaign stages end to end and every frame the previous
// frame's visible entities are checked against the current world. "Visible" is
// measured the way the renderer measures it: the live camera band at the
// frame's own zoom, gated by the finish wall the draw loop refuses to paint
// past. Excused disappearances are exactly the visible events:
//
//   broken/popped   — ob.broken is set by every break path (weapons, stomp,
//                     qbox, shockwave), and the debris burst is the picture.
//   punted          — a punt is a launch the player caused and watches.
//   eaten           — Chompo's bites keep the snapshot flying to his mouth.
//   at the player   — collection, breaking and stomping all happen on contact;
//                     a small window around the hero covers them.
//   death / rewind  — the world is rebuilt wholesale and the transition is the
//                     picture; tracking restarts from scratch.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { DemoBot } = await import('../src/game/bot.js');
const { W } = await import('../src/engine/renderer.js');
const { STAGES } = await import('../src/data/stages.js');

save.load();
save.newSlot(0, 0);

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// A spread of the campaign: every cabinet's mechanics, every set piece the
// sweeps interact with — crossings (plumber-2, speed-3, cardboard-3, surge-2),
// the loop (speed-2/3), tunnels and darkness (crypt), routes everywhere.
// Rhythm is excluded: its lane is beat-locked to an audio clock the node
// harness does not run, so the spawner never fills and there is nothing to
// watch. Its resync sweeps are covered by tests/beat-chart.js.
const PLAY = ['plumber-1', 'plumber-2', 'plumber-3', 'speed-2', 'speed-3',
  'neon-2', 'frost-2', 'crypt-2', 'cardboard-3', 'office-2', 'surge-2'];
const TICK = 1 / 60;

for (const stageId of PLAY) {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) { assert(false, `stage ${stageId} exists`); continue; }
  for (const seed of [4242, 90210]) {
    let result = null;
    const run = new RunState({
      stage,
      team: ['lorenzo', 'gnash', 'clara'],
      save,
      seed,
      difficulty: 1,
      onEnd: (r) => { result = r; },
    });
    run.enter();
    const bot = new DemoBot(run);

    // id -> {x, w, type} of everything that was visible last frame.
    let prevObs = new Map();
    let prevPicks = new Map();
    const reported = new Set();
    let popouts = 0;
    let ticks = 0;
    const MAX_TICKS = 60 * 60 * 8;

    const visibleBand = () => ({
      // Inset a couple of px so an entity exactly on the edge line is not
      // counted — the sim's camX/camZoom and the renderer's interpolated pair
      // differ by less than that within a frame.
      left: run.camX + 2,
      right: run.camX + W / run.camZoom - 2,
      finishX: run.overtime ? Infinity : run.finishWorldX(),
    });
    const snapshot = () => {
      const { left, right, finishX } = visibleBand();
      prevObs = new Map();
      prevPicks = new Map();
      for (const ob of run.obstacles) {
        if (ob.live === false || ob.x >= finishX) continue;
        if (ob.x + ob.w > left && ob.x < right) {
          // The object itself is kept: a broken obstacle is filtered out of
          // the array the same frame, and `broken` has to be readable after.
          prevObs.set(ob.id, { x: ob.x, w: ob.w, type: ob.type, ref: ob });
        }
      }
      for (const p of run.pickups) {
        if (!p.live || p.x >= finishX) continue;
        if (p.x + p.w > left && p.x < right) {
          prevPicks.set(p.id, { x: p.x, w: p.w, type: p.type, ref: p });
        }
      }
    };
    // playerWorldX, not camX + PLAYER_X: during the finish run the hero
    // detaches from his anchor and sprints ahead of the camera to the breaker,
    // collecting coins the whole way — contact events follow HIM.
    const excusedOb = (was) => {
      const ob = was.ref;
      if (ob.broken || ob.punted || ob.rolledOut) return true;
      if (run.chompBites.some((b) => b.ob === ob)) return true;
      const px = run.playerWorldX();
      // Contact events: stomp, kick, walking a switch.
      return was.x < px + 90 && was.x + was.w > px - 60;
    };
    const excusedPick = (was) => {
      const p = was.ref;
      if (p.following || p.magnetized) return true;
      const px = run.playerWorldX();
      return was.x < px + 90 && was.x + was.w > px - 60;
    };

    snapshot();
    while (!result && ticks < MAX_TICKS) {
      ticks++;
      bot.update(TICK);
      const camBefore = run.camX;
      run.update(TICK);
      // Death restore and rewind rebuild the entity lists wholesale behind a
      // transition the player watches; start tracking over.
      if (run.dead || run.rewinding || run.rewindPlayFrames > 0 || run.camX < camBefore) {
        snapshot();
        continue;
      }
      for (const [id, was] of prevObs) {
        if (was.ref.live !== false) continue;
        if (excusedOb(was)) continue;
        if (!reported.has(id)) {
          reported.add(id);
          popouts++;
          console.error(`  POP-OUT ${stage.id} seed ${seed} t=${(ticks / 60).toFixed(1)}s: ` +
            `${was.type} at x=${Math.round(was.x)} w=${Math.round(was.w)} vanished on screen ` +
            `(camX=${Math.round(run.camX)}, view=${Math.round(W / run.camZoom)}px)`);
        }
      }
      for (const [id, was] of prevPicks) {
        if (was.ref.live) continue;
        if (excusedPick(was)) continue;
        if (!reported.has(id)) {
          reported.add(id);
          popouts++;
          console.error(`  POP-OUT ${stage.id} seed ${seed} t=${(ticks / 60).toFixed(1)}s: ` +
            `pickup ${was.type} at x=${Math.round(was.x)} vanished on screen ` +
            `(camX=${Math.round(run.camX)})`);
        }
      }
      snapshot();
    }
    bot.releaseAll();
    Input.endFrame();
    assert(result != null, `${stage.id} seed ${seed}: run ended (${(ticks / 60).toFixed(0)}s sim)`);
    assert(popouts === 0, `${stage.id} seed ${seed}: nothing visible vanished (${popouts} pop-outs)`);
  }
}

dom.cleanup?.();
process.exit(failed ? 1 : 0);
