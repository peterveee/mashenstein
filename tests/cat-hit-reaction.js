import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();

const { CAT_HIT_T, CAT_IFRAMES_T, CAT_HIT_KNOCKBACK_FRACTION,
  catSwipeActive, catHitScreenOffset, catHitPose, catHitFlickerAlpha } = await import('../src/game/cat-hit.js');
const { RunState } = await import('../src/game/run.js');
const { makeObstacle } = await import('../src/game/entities.js');
const { save } = await import('../src/engine/save.js');
const { Player, PLAYER_X } = await import('../src/game/player.js');
const { HEROES } = await import('../src/data/heroes.js');
const { drawHeroSprite, HERO_CENTER_OFF } = await import('../src/game/draw.js');

assert.equal(catSwipeActive(0.19), false, 'the cat cannot hit while the paw is winding up');
assert.equal(catSwipeActive(0.2), false, 'the hitbox waits until the paw actually starts moving');
assert.equal(catSwipeActive(0.3), true, 'the cat hitbox opens when the paw reaches out');
assert.equal(catSwipeActive(0.49), false, 'the cat hitbox closes as the paw pulls back');
assert.equal(catHitScreenOffset(CAT_HIT_T, 200), -200 * CAT_HIT_KNOCKBACK_FRACTION,
  'the drawn hero steps back by 12% of the viewport at contact');
assert.ok(catHitScreenOffset(0.4, 200) < 0 && catHitScreenOffset(0.4, 200) > -24,
  'the drawn hero eases toward the ordinary running anchor');
assert.equal(catHitScreenOffset(0, 200), 0, 'the draw-only recoil ends at the running anchor');
const runPose = catHitPose({ kind: 'run', phase: 0.1, lean: 0 }, 0);
assert.ok(runPose.lean < 0 && runPose.faceSurprised && runPose.phase !== 0.1,
  'the contact pose recoils and throws the stride out of phase');
assert.equal(catHitPose({ kind: 'run', phase: 0.1 }, 0.2).phase, 0.1,
  'the stumble pose yields back to the current run pose');
assert.equal(catHitFlickerAlpha(0.01, CAT_IFRAMES_T), 0.3, 'cat i-frames keep the hero at least 30% visible');
assert.equal(catHitFlickerAlpha(0.06, CAT_IFRAMES_T), 1, 'cat i-frames alternate to full opacity');
assert.equal(catHitFlickerAlpha(0.01, 0), 1, 'ordinary rendering is unchanged outside cat i-frames');
{
  const hero = new Player(HEROES[0].id, {});
  hero.grounded = true;
  hero.catHitT = CAT_HIT_T;
  hero.catIframesT = CAT_IFRAMES_T;
  hero.iframes = CAT_IFRAMES_T;
  const raw = document.createElement('canvas').getContext('2d');
  const translations = [], alphas = [], inks = [], clawStarts = [];
  let activeStrokeStyle = '';
  const ctx = new Proxy(raw, {
    get(target, key) {
      if (key === 'translate') return (x, y) => { translations.push([x, y]); };
      if (key === 'moveTo') return (x, y) => {
        if (activeStrokeStyle === '#e14863') clawStarts.push([x, y]);
        return target.moveTo(x, y);
      };
      return Reflect.get(target, key, target);
    },
    set(target, key, value) {
      if (key === 'globalAlpha') alphas.push(value);
      if (key === 'strokeStyle') inks.push(value);
      if (key === 'strokeStyle') activeStrokeStyle = value;
      return Reflect.set(target, key, value, target);
    },
  });
  drawHeroSprite(ctx, hero, HEROES[0].id, 0.01, 0, false,
    { flat: true, screenX: 35, groundY: 232, specialOrb: false });
  assert.ok(translations.some(([x]) => x === 35 + HERO_CENTER_OFF), 'the draw path places the hero at the supplied recoil column');
  assert.ok(alphas.includes(0.3), 'the draw path applies the 30% cat-i-frame opacity');
  assert.ok(inks.includes('#fff4f8'), 'the draw path paints the bright contact claw overlay');

  hero.catHitT = 0;
  hero.catIframesT = 0.2;
  hero.iframes = 0.2;
  inks.length = 0;
  drawHeroSprite(ctx, hero, HEROES[0].id, 1.0, 0, false,
    { flat: true, screenX: 35, groundY: 232, specialOrb: false });
  assert.ok(inks.includes('#e14863'), 'the cheek scratches remain after recoil ends while cat i-frames are active');
  assert.equal(clawStarts.length, 2, 'the cheek marks are drawn as separate strokes in the face painter');
  assert.ok(clawStarts.every(([x, y]) => x > 2 && x < 6 && y < -15 && y > -22),
    'the persistent cuts use head-local cheek coordinates rather than screen-space offsets');

  hero.catIframesT = 0;
  hero.iframes = 0;
  inks.length = 0;
  clawStarts.length = 0;
  drawHeroSprite(ctx, hero, HEROES[0].id, 1.3, 0, false,
    { flat: true, screenX: 35, groundY: 232, specialOrb: false });
  assert.ok(!inks.includes('#e14863'), 'the cheek scratches disappear when cat i-frames end');
}

save.load();
save.newSlot(0, 0);
const stage = {
  id: 'cat-hit-test', cabinet: 'neon', index: 1,
  mission: { type: 'reach', desc: 'TEST' }, challenge: { type: 'coins', n: 99, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5, applianceHigh: false,
};
const run = new RunState({ stage, save, seed: 414, difficulty: 1, skipRunIn: true, onEnd() {} });
run.enter();
run.battery = 3;
run.player.grounded = true;
run.player.y = 0;
run.player.iframes = 0;
run.powerups.shieldStack = 0;
const cat = makeObstacle('catPythagoras', run.camX + PLAYER_X);
cat.strikeT = 0.1;
run.obstacles = [cat];
const initialX = run.playerWorldX();
const initialBattery = run.battery;
run.collide();
assert.equal(run.battery, initialBattery, 'a body touch during the wind-up does not deal damage');

cat.strikeT = 0.3;
run.collide();
assert.equal(run.battery, initialBattery - 1, 'an extended cat swipe removes one battery cell');
assert.equal(run.player.catHitT, CAT_HIT_T, 'a landed swipe starts the 0.8 second drawn recoil');
assert.equal(run.player.catIframesT, CAT_IFRAMES_T, 'a landed swipe starts 1.2 seconds of cat-specific i-frames');
assert.equal(run.player.iframes, CAT_IFRAMES_T, 'collision immunity uses the same 1.2 second window');
assert.equal(run.hitstop, 0, 'a cat swipe does not freeze the run');
assert.equal(run.player.stumbleT, 0, 'the art reaction does not apply a movement stumble');
assert.equal(run.player.jumpPressed({ sfx() {} }), true, 'jump remains available through the reaction');
assert.equal(run.playerWorldX(), initialX, 'the reaction does not move the player in world space');
const afterHit = run.battery;
run.collide();
assert.equal(run.battery, afterHit, 'the active paw cannot deal repeated damage during i-frames');

run.player.iframes = 0;
run.player.catIframesT = 0;
run.player.catHitT = 0;
cat.strikeT = 0.6;
run.collide();
assert.equal(run.battery, afterHit, 'touching the cat after the swipe window is harmless');
cat.strikeT = 0.3;
run.collide();
assert.equal(run.battery, afterHit - 1, 'cat collision is active again once i-frames expire during an active swipe');

console.log('ok: cat swipe window, damage, recovery presentation and input remain independent');
