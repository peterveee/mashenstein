// Character rendering contract: playable heroes stay on the native-density
// overlay in every run state, while their shield geometry is finite and stable.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { Player } = await import('../src/game/player.js');
const { HEROES } = await import('../src/data/heroes.js');
const { TOON_SPECS, toonEffectEllipse } = await import('../src/sprites/toons.js');
const { initRenderer, blit, bctx, pendingOverlayDrawCount } = await import('../src/engine/renderer.js');
const { save } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);
initRenderer();

const stage = {
  id: 'character-render-1', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 99, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5,
};
const run = new RunState({ stage, save, seed: 17, difficulty: 1, onEnd: () => {} });
run.enter();

function queuedFor(hero, state) {
  // Drain the previous sample. blit() also exercises callback execution, so a
  // broken mirror/camera transform fails the test instead of merely queueing.
  blit();
  run.relay.current = hero.id;
  run.player = new Player(hero.id);
  run.paused = state === 'paused';
  run.dead = state === 'dead';
  run.mirror = state === 'mirrored';
  run.draw(bctx);
  const queued = pendingOverlayDrawCount();
  blit();
  return queued;
}

for (const hero of HEROES) {
  const normal = queuedFor(hero, 'normal');
  const paused = queuedFor(hero, 'paused');
  const dead = queuedFor(hero, 'dead');
  const mirrored = queuedFor(hero, 'mirrored');
  // A live frame queues hero then HUD. Pause/death each add their covering
  // callback after those two; mirroring changes transforms, not layer count.
  assert(normal === 2, `${hero.id} normal queues hero + HUD at native density`);
  assert(paused === 3, `${hero.id} pause cover is queued after hero + HUD`);
  assert(dead === 3, `${hero.id} death cover is queued after hero + HUD`);
  assert(mirrored === 2, `${hero.id} mirrored hero remains on the overlay path`);
}

for (const hero of HEROES) {
  const a = toonEffectEllipse(hero.id);
  const b = toonEffectEllipse(hero.id);
  const values = [a.cx, a.cy, a.rx, a.ry];
  assert(a === b, `${hero.id} reuses one shield envelope across frames`);
  assert(Object.isFrozen(a), `${hero.id} shield envelope cannot be mutated`);
  assert(values.every(Number.isFinite), `${hero.id} shield envelope is finite`);
  assert(a.rx > 0.5 && a.ry > 0.6, `${hero.id} shield envelope keeps a padded air gap`);
}

assert(Object.keys(TOON_SPECS).length === 10, 'head-yaw gallery roster still contains all ten toons');

console.log(failed ? 'CHARACTER RENDERING: FAILED' : 'CHARACTER RENDERING: PASSED');
process.exit(failed ? 1 : 0);
