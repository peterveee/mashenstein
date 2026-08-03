// Star power (unpeel): the music layer swaps on/off with the power-up and the
// hero draws its aura without blowing up on any hero rig.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { Audio } = await import('../src/engine/audio.js');
const { save } = await import('../src/engine/save.js');
const { HEROES } = await import('../src/data/heroes.js');
const { drawHeroSprite } = await import('../src/game/draw.js');
const { Player } = await import('../src/game/player.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);
const stage = { id: 'star-1', cabinet: 'plumber', index: 1, mission: { type: 'reach', desc: 'TEST' }, challenge: { type: 'coins', n: 99, desc: 'TEST' }, durationSec: 40, applianceAt: 0.5 };
const run = new RunState({ stage, save, seed: 7, difficulty: 1, skipRunIn: true, onEnd: () => {} });
run.enter();

assert(!Audio.starMode, 'star layer is off at the top of a run');

run.powerups.grab('unpeel');
run.update(1 / 60);
assert(Audio.starMode, 'grabbing unpeel brings the star layer up');
assert(Audio.detune > 1, `invincibility winds the song up (detune ${Audio.detune})`);

// Nothing drags the tempo any more: invincibility moves tempo and key together.
assert(Audio.tempo === 1.08, `invincibility winds the tempo up with the key (tempo ${Audio.tempo.toFixed(3)})`);

run.powerups.active.unpeel.t = 0.001;
run.update(1 / 60);
assert(!Audio.starMode, 'the star layer drops when unpeel expires');

// Leaving the run must not strand the music ducked under a silent star bus.
run.powerups.grab('unpeel');
run.update(1 / 60);
run.exit();
assert(!Audio.starMode, 'exiting a run clears the star layer');

// ---- the speed burst warps the clock, not the key -------------------------
const warpRun = new RunState({ stage, save, seed: 11, difficulty: 1, skipRunIn: true, onEnd: () => {} });
warpRun.enter();
const restDelay = Audio.delayTimeSeconds();

warpRun.powerups.grab('speed');
warpRun.update(1 / 60);
assert(Audio.tempo > 1, `a speed burst leans the song forward (tempo ${Audio.tempo.toFixed(3)})`);
assert(Audio.detune === 1, `a speed burst leaves the key where it was (detune ${Audio.detune})`);
// The whole point of the warp being tempo-only: the two powerups are different
// sensations, and one must not quietly become the other.
assert(Audio.tempo !== 1.08, 'a speed burst is not just the star by another name');

// The echo has to follow the warped clock. Left at the written tempo, a dotted
// eighth lands a third of a 16th late on the first repeat and compounds from
// there, which is heard as flamming rather than as a delay.
const warpedDelay = Audio.delayTimeSeconds();
const wanted = restDelay / Audio.tempo;
assert(Math.abs(warpedDelay - wanted) < 1e-9,
  `the echo retimes to the warp (${(warpedDelay * 1000).toFixed(1)}ms, wanted ${(wanted * 1000).toFixed(1)}ms)`);

// Two ticks, not one: the warp is written at the top of update() and the powerup
// timers run further down, so the frame a burst expires on still carries its tempo.
warpRun.powerups.active.speed.t = 0.001;
warpRun.update(1 / 60);
warpRun.update(1 / 60);
assert(Audio.tempo === 1, 'the tempo drops back when the burst runs out');
assert(Math.abs(Audio.delayTimeSeconds() - restDelay) < 1e-9, 'and the echo goes back with it');
warpRun.exit();

// Aura + afterimages + additive pass render for every hero rig.
const ctx = document.createElement('canvas').getContext('2d');
for (const hero of HEROES) {
  const player = new Player(hero.id);
  let threw = null;
  try {
    drawHeroSprite(ctx, player, hero.id, 1.25, 0, false, { flat: true, invincible: 6, settings: save.settings });
    drawHeroSprite(ctx, player, hero.id, 1.25, 0, false, { flat: true, invincible: 1, settings: save.settings }); // strobing tail
    drawHeroSprite(ctx, player, hero.id, 1.25, 0, false, { flat: true, invincible: 6, settings: { reducedMotion: true } });
  } catch (e) { threw = e; }
  assert(!threw, `${hero.id} draws under star power${threw ? ` (${threw.message})` : ''}`);
}

// The i-frame flicker must not hide a hero who is currently untouchable.
let toons = 0;
const counting = Object.create(ctx);          // only drawToon translates
counting.translate = () => { toons++; };
const flickerPlayer = new Player(HEROES[0].id);
flickerPlayer.iframes = 1;
const blinkT = 0; // Math.floor(t * 14) % 2 === 0: the invisible half of the blink
drawHeroSprite(counting, flickerPlayer, HEROES[0].id, blinkT, 0, false, { flat: true, settings: save.settings });
assert(toons === 0, 'a hurt hero flickers out on the off half of the blink');
drawHeroSprite(counting, flickerPlayer, HEROES[0].id, blinkT, 0, false, { flat: true, invincible: 6, settings: save.settings });
assert(toons > 0, 'star power overrides the i-frame blink');

// ---- breaking an overhead !-box announces itself, coins and all -----------
const { makeObstacle } = await import('../src/game/entities.js');
const heard = [];
const realSfx = Audio.sfx.bind(Audio);
Audio.sfx = (name, opt) => { heard.push({ name, opt }); realSfx(name, opt); };

const box = makeObstacle('qcrate', 500);
const boxRun = new RunState({ stage, save, seed: 3, difficulty: 1, skipRunIn: true, onEnd: () => {} });
boxRun.enter();
boxRun.fxRng.chance = () => false;   // coins, not a prize capsule
boxRun.breakObstacle(box);
assert(heard.some((s) => s.name === 'blockBreak'), 'a !-box break gets its own cue, not the generic crunch');
const spray = heard.find((s) => s.name === 'coinSpray');
assert(spray, 'the coins spilling out are audible');
assert(spray && spray.opt.count === 3, `the spray knows how many coins it is scattering (${spray && spray.opt.count})`);

// Several boxes popped on one frame must not stack into mush.
heard.length = 0;
boxRun.tRun += 1;                     // a fresh moment, then four boxes at once
for (let i = 0; i < 4; i++) boxRun.breakObstacle(makeObstacle('qcrate', 600 + i * 20));
assert(heard.filter((s) => s.name === 'coinSpray').length === 1, 'same-frame payouts share one spray');

// A silenced break (screen clears pop many at once) stays silent.
heard.length = 0;
boxRun.breakObstacle(makeObstacle('qcrate', 800), true);
assert(heard.length === 0, 'a silent break makes no sound at all');
Audio.sfx = realSfx;

console.log(failed ? 'STAR POWER: FAILED' : 'STAR POWER: PASSED');
process.exit(failed ? 1 : 0);
