// THE BOSS FIGHT PLAYS THE SAME GAME AT EVERY FRAMING.
//
// The same bug tests/copter-fairness.js was written for, in two more places.
//
// A boss hovers at a FRACTION OF THE VIEW — that part is composition, and it
// has to be, or the boss sits off the right edge of a narrow frame and is
// never seen. But its drops were placed off that same x, so the distance the
// player got to react to a falling barrel was a function of the camera:
//
//   desktop 1.6   drop lands 71..223 ahead of the hero   0.49s of warning
//   close 2.0                41..179                     0.28s
//   phone land 2.2           30..162                     0.21s  (under REACT_FLOOR)
//   portrait 3.5            -10..102                     none — BEHIND him
//
// And a shooting obstacle opened fire on entering the picture, so the zoom
// decided how much road each shot had to cross: 281 world units of engagement
// on desktop against 109 in portrait.
//
// Both now quote WORLD distances from the hero. This suite asserts the two
// things a player would call fair, at every framing the game ships: a drop can
// never land inside the reaction floor, and a shooter opens fire at the same
// distance whatever the camera is doing.
import { installDom } from './dom-stub.js';
installDom();

const { BossState } = await import('../src/game/boss.js');
const { RunState, ZOOM_NORMAL, ZOOM_CLOSE, ZOOM_PHONE } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { PLAYER_X } = await import('../src/game/player.js');
const { PORTRAIT_LAB_DEFAULTS } = await import('../src/dev/portrait-lab.js');
const { W } = await import('../src/engine/renderer.js');
const { REACT_FLOOR } = await import('../src/game/spawner.js');
const { bossDropNearLip, BOSS_DROP_MIN_AHEAD, BOSS_DROP_SPREAD } = await import('../src/game/boss.js');
const { SHOOTER_RANGE_AHEAD, shooterMayFire } = await import('../src/game/run.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);

// Every resting magnification the game ships, narrowest view last. Portrait is
// the one that matters: it is half the world width of desktop NORMAL.
const FRAMINGS = [
  ['desktop NORMAL', ZOOM_NORMAL],
  ['desktop CLOSE / tablet', ZOOM_CLOSE],
  ['phone landscape', ZOOM_PHONE],
  ['phone portrait', PORTRAIT_LAB_DEFAULTS.worldZoom],
];

// ---------------------------------------------------------------- boss drops
//
// The placement rule is checked DIRECTLY rather than by imposing a zoom on a
// live fight: RunState re-applies the device's framing every frame, so a test
// that set the camera and stepped would be quietly overruled and pass for the
// wrong reason. bossDropNearLip is the rule, so the rule is what is asserted —
// fed the bossX each framing's 0.62/0.12 composition actually produces.
const TICK = 1 / 60;
const SPEED = 160;   // BASE_SPEED; the ramp only ever makes the gap larger

for (const [label, zoom] of FRAMINGS) {
  const viewW = W / zoom;
  const heroWorldX = PLAYER_X;   // camX 0, so world x and gap are the same number
  let min = Infinity, max = -Infinity;
  // Sweep the hover's whole cycle: the sway is what used to carry the boss —
  // and so the drop — closest to the hero on a narrow view.
  for (let phase = 0; phase < Math.PI * 2; phase += Math.PI / 180) {
    const bossX = viewW * 0.62 + Math.sin(phase) * viewW * 0.12;
    const lip = bossDropNearLip(bossX, heroWorldX);
    min = Math.min(min, lip - heroWorldX);
    max = Math.max(max, lip - heroWorldX + BOSS_DROP_SPREAD);
  }
  assert(min >= BOSS_DROP_MIN_AHEAD - 1e-9,
    `${label}: nearest drop is ${min.toFixed(1)} wu ahead of the hero (floor ${BOSS_DROP_MIN_AHEAD})`);
  assert(min / SPEED > REACT_FLOOR,
    `${label}: that is ${(min / SPEED).toFixed(2)}s, clear of the lane's REACT_FLOOR (${REACT_FLOOR}s)`);
  assert(max - min >= BOSS_DROP_SPREAD,
    `${label}: drops keep a usable spread (${min.toFixed(0)}..${max.toFixed(0)} wu)`);
  console.log(`     ${label}: view ${viewW.toFixed(0)} wu, drops ${min.toFixed(0)}..${max.toFixed(0)} ahead`);
}

// Desktop NORMAL is the framing the fight was authored in, so the floor must
// not be reaching into it: there the boss's own trailing edge still leads.
{
  const viewW = W / ZOOM_NORMAL;
  const bossLip = viewW * 0.62 - viewW * 0.12 - 20;
  assert(bossLip >= PLAYER_X + BOSS_DROP_MIN_AHEAD - 2,
    `desktop NORMAL keeps its authored placement (boss lip ${bossLip.toFixed(0)} vs floor ${PLAYER_X + BOSS_DROP_MIN_AHEAD})`);
}

// And one real fight, so the rule is actually the one on the drop path.
{
  const boss = new BossState({
    bossCab: 'neon', team: ['lorenzo', 'grumpos', 'b33p'],
    save, seed: 99, difficulty: 1, onEnd: () => {},
  });
  boss.enter();
  const seen = new Set();
  let worst = Infinity, count = 0;
  for (let i = 0; i < 60 * 120; i++) {
    boss.update(TICK);
    for (const ob of boss.obstacles) {
      if (!ob.fromBoss || seen.has(ob)) continue;
      seen.add(ob);
      count++;
      worst = Math.min(worst, ob.x - (boss.camX + PLAYER_X));
    }
  }
  assert(count > 0, `a live fight dropped something (${count})`);
  assert(worst >= BOSS_DROP_MIN_AHEAD - 1e-9,
    `live fight's nearest drop is ${worst.toFixed(1)} wu ahead (floor ${BOSS_DROP_MIN_AHEAD})`);
}

// ------------------------------------------------------------------ shooters
//
// Read off a live RunState so this follows the shipped expression rather than
// restating it. Corporate Kombat's printers are its tier-0 ground read, so a
// short run is enough to see several open fire.
const { STAGES } = await import('../src/data/stages.js');
const { DemoBot } = await import('../src/game/bot.js');

const shooterStage = STAGES.find((s) => s.cabinet === 'office');

function firingGaps(stage, zoomIn, seed) {
  save.settings.zoomIn = zoomIn;
  let result = null;
  const run = new RunState({
    stage, team: ['lorenzo', 'clara', 'b33p'], save, seed, difficulty: 1,
    onEnd: (r) => { result = r; },
  });
  run.enter();
  const bot = new DemoBot(run);
  const gaps = [];
  const seen = new Set();
  for (let i = 0; !result && i < 60 * 300; i++) {
    bot.update(TICK); run.update(TICK);
    for (const pr of run.projectiles) {
      if (pr.type !== 'enemyShot' || seen.has(pr)) continue;
      seen.add(pr);
      gaps.push(pr.x - run.playerWorldX());
    }
  }
  return gaps;
}

// The window itself, at every framing. It takes no camera, so this is a guard
// against a view term coming back rather than a measurement — which is exactly
// what was needed the first time.
let firstWindow = null;
for (const [label, zoom] of FRAMINGS) {
  const viewW = W / zoom;
  const hero = PLAYER_X;
  const opens = [];
  for (let gap = 0; gap <= 400; gap++) if (shooterMayFire(hero + gap, hero)) opens.push(gap);
  const window = [Math.min(...opens), Math.max(...opens)];
  assert(window[1] >= SHOOTER_RANGE_AHEAD - 2,
    `${label}: engagement still reaches ${SHOOTER_RANGE_AHEAD} wu (got ${window[1]})`);
  if (firstWindow === null) firstWindow = window;
  else assert(window[0] === firstWindow[0] && window[1] === firstWindow[1],
    `${label}: same window as desktop NORMAL (${window} vs ${firstWindow})`);
  console.log(`     ${label}: view ${viewW.toFixed(0)} wu, fires between ${window[0]} and ${window[1]} wu ahead`);
}

// And the live path, at both framings the headless runner can actually select:
// no shot may be born outside the window, whatever the level did.
if (!shooterStage) {
  assert(false, 'a stage with shooting obstacles exists to measure');
} else {
  let total = 0;
  for (const zoomIn of [false, true]) {
    const gaps = firingGaps(shooterStage, zoomIn, 4242);
    total += gaps.length;
    if (!gaps.length) continue;
    const worst = Math.max(...gaps);
    assert(worst <= SHOOTER_RANGE_AHEAD + 1,
      `zoomIn=${zoomIn}: furthest live shot ${worst.toFixed(1)} wu is inside the window`);
    assert(Math.min(...gaps) >= 60 - 1,
      `zoomIn=${zoomIn}: nearest live shot ${Math.min(...gaps).toFixed(1)} wu is outside the muzzle`);
  }
  assert(total > 0, `shooters opened fire at all (${total} shots)`);
}

process.exit(failed ? 1 : 0);
