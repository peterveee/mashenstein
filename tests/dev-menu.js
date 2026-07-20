// Dev menu + crash test.
//
// The load-bearing assertion here is the production gate: a published bundle
// must never expose window.__mash_dev, no matter what keys are pressed. The
// rest covers the crash-test invariants — collide with everything, survive
// everything, still reach the finish.
import esbuild from 'esbuild';
import { installDom } from './dom-stub.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const { outputFiles } = await esbuild.build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true, format: 'iife', write: false, target: ['es2022'], logLevel: 'silent',
});
const bundle = outputFiles[0].text;

// --------------------------------------------------------------- gate: off
// No __MASH_BUILD__ (i.e. `npm run build`): the menu must be unreachable.
{
  const dom = installDom();
  new Function(bundle)();
  const frames = (n) => { for (let i = 0; i < n; i++) dom.frame(16.7); };
  frames(5);
  dom.key('Backquote');
  frames(10);
  assert(globalThis.window.__mash_dev === undefined,
    'production build exposes no __mash_dev');
  const before = globalThis.window.__mash_state;
  dom.key('Backquote'); frames(10);
  assert(globalThis.window.__mash_state === before,
    'backquote is inert in a production build');
}

// ---------------------------------------------------------------- gate: on
{
  const dom = installDom();
  globalThis.window.__MASH_BUILD__ = 'test-build';
  new Function(bundle)();
  const frames = (n) => { for (let i = 0; i < n; i++) dom.frame(16.7); };
  frames(5);

  const dev = globalThis.window.__mash_dev;
  assert(!!dev && dev.enabled, 'dev build exposes an enabled __mash_dev');

  dom.key('Backquote'); frames(4);
  assert(dev.open, 'backquote opens the dev menu');

  // The underlying state must be frozen while the menu is up.
  const stateBefore = globalThis.window.__mash_state;
  frames(30);
  assert(globalThis.window.__mash_state === stateBefore,
    'game state frozen while the dev menu is open');

  dom.key('Backquote'); frames(4);
  assert(!dev.open, 'backquote closes the dev menu again');
}

// ------------------------------------------------------------- crash test
// Direct RunState construction — much faster than driving the bundle, and it
// is the same code path the menu's CRASH TEST entry uses.
{
  const { RunState } = await import('../src/game/run.js');
  const { save } = await import('../src/engine/save.js');
  const { STAGE_BY_ID } = await import('../src/data/stages.js');
  save.load();
  save.newSlot(0, 0);
  const ctx = globalThis.document.createElement('canvas').getContext('2d');

  const crash = (id, extra = {}) => {
    const stage = STAGE_BY_ID[id];
    let result = null;
    const run = new RunState({
      stage, save, seed: 777, difficulty: 1,
      devInvuln: true, devForceMission: true,
      onEnd: (r) => { result = r; },
      ...extra,
    });
    run.enter();
    let t = 0;
    while (!result && t < 60 * 400) { t++; run.update(1 / 60); run.draw(ctx); }
    return { run, result };
  };

  // 'reach' stage: plain survival.
  {
    const { run, result } = crash('plumber-1');
    assert(result && result.success, 'crash test reaches the finish (plumber-1)');
    assert(run.battery === run.maxBattery(),
      `crash test ends at full battery (${run.battery}/${run.maxBattery()})`);
    assert(!run.dead, 'crash test never dies');
    // If an invincibility change ever starts SKIPPING collisions instead of
    // absorbing them, this is what catches it: a silent clean run.
    assert(run.devHits.length > 5,
      `crash test actually collided (${run.devHits.length} hits)`);
  }

  // 'targets' stage: cannot satisfy its mission without shooting, so it proves
  // devForceMission is what carries an unpiloted hero across the line.
  {
    const { result } = crash('neon-1');
    assert(result && result.success,
      'devForceMission carries an objective stage to the finish (neon-1)');
  }

  // Without the force, the same unpiloted run must fail at the line — this is
  // the control that shows the flag is doing the work.
  {
    const { result } = crash('neon-1', { devForceMission: false });
    assert(result && !result.success,
      'objective stage still fails unpiloted when the mission is not forced');
  }

  // Iframe clamp. The normal 1.4s of post-hit mercy would ghost the hero
  // through most of a dense level. Re-run an identical seed with the mercy
  // restored and compare: the clamp should surface substantially more hazards.
  // Measured at 1.6x (plumber-1) to 1.96x (surge-1) when this was written.
  {
    const withClamp = crash('office-1').run.devHits.length;
    let result = null;
    const run = new RunState({
      stage: STAGE_BY_ID['office-1'], save, seed: 777, difficulty: 1,
      devInvuln: true, devForceMission: true, onEnd: (r) => { result = r; },
    });
    run.enter();
    const orig = run.takeHit.bind(run);
    run.takeHit = (m, p, s) => {
      const n = run.devHits.length;
      orig(m, p, s);
      if (run.devHits.length > n) run.player.iframes = 1.4;
    };
    let t = 0;
    while (!result && t < 60 * 400) { t++; run.update(1 / 60); run.draw(ctx); }
    assert(withClamp > run.devHits.length * 1.3,
      `iframe clamp surfaces far more hazards (${withClamp} vs ${run.devHits.length} with 1.4s mercy)`);
  }

  {
    const { run } = crash('frost-2');
    assert(Object.keys(run.devHitTally()).length > 1,
      `tally distinguishes hazard types (${JSON.stringify(run.devHitTally())})`);
  }
}

// --------------------------------------------------------------- seed lock
// Runs are deterministic given a seed, which is what makes the dev menu's seed
// lock useful — a bad spawn becomes replayable.
{
  const { RunState } = await import('../src/game/run.js');
  const { save } = await import('../src/engine/save.js');
  const { STAGE_BY_ID } = await import('../src/data/stages.js');
  const ctx = globalThis.document.createElement('canvas').getContext('2d');

  const sample = () => {
    const run = new RunState({
      stage: STAGE_BY_ID['plumber-2'], save, seed: 4242, difficulty: 1,
      devInvuln: true, devForceMission: true, onEnd: () => {},
    });
    run.enter();
    for (let i = 0; i < 600; i++) { run.update(1 / 60); run.draw(ctx); }
    return run.obstacles.map((o) => `${o.type}@${Math.round(o.x)}`).join(',');
  };
  assert(sample() === sample(), 'a fixed seed reproduces the same obstacle layout');
}

console.log(failed ? 'DEV MENU: FAILED' : 'DEV MENU: PASSED');
process.exit(failed ? 1 : 0);
