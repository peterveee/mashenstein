// NOTHING MOVES THE HERO THAT THE PLAYER DID NOT ASK TO MOVE.
//
// Gravity can only ever LOWER vy. So any frame where vy rises is something in
// the game launching the hero, and there is a short, closed list of things
// allowed to do that:
//
//   the SPRING PAD    — the only way onto the high road, and it fires on contact
//                       by design; refusing it is what jumping over it is for.
//   a STOMP LANDING   — you came down on a crate with weight, and the weight goes
//                       somewhere. It costs an ability press to set up.
//   a STOMP THROUGH   — a stomping hero smashing a crate in mid-air rebounds off
//                       it. Same press, same move, resolved in collide instead.
//   a LOOP BAIL       — leaving the ring, a pixel of it.
//
// Anything else is the game jumping for you, and it has now been two different
// bugs wearing the same face: invulnerability throwing the hero 38px out of a
// pit, and a portal tag-in bouncing him 22px because clearing the space he
// arrives in shared a function with landing on a crate. Both looked identical
// from the sofa — the air pose, no button, and no fall face on the way down
// because he was RISING — and both were reported as "it auto-jumped off the end
// of the island". So the real invariant is pinned here as a sweep rather than as
// one more special case, because the next one will wear the same face too.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { PLAYER_X } = await import('../src/game/player.js');
const { STAGES } = await import('../src/data/stages.js');
const { Input } = await import('../src/engine/input.js');
const { DemoBot } = await import('../src/game/bot.js');
const { Player } = await import('../src/game/player.js');
const { HERO_BY_ID } = await import('../src/data/heroes.js');

// A real button press is the one launch that needs no defending, so it is
// detected at the source rather than inferred from a velocity.
let jumpedThisFrame = false;
const origJumpPressed = Player.prototype.jumpPressed;
Player.prototype.jumpPressed = function jumpPressed(audio) {
  const ok = origJumpPressed.call(this, audio);
  if (ok) jumpedThisFrame = true;
  return ok;
};

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);
const TICK = 1 / 60;

// ---- the sweep: every unpressed launch in the game is a sanctioned one ----------
// The test that would have caught both bugs on the frame they were written. Each
// launcher is named by patching it, so an unattributed rise fails loudly instead
// of being forgiven by a height threshold that happens to cover it.
{
  let unexplained = 0;
  let spring = 0;
  let stompLanding = 0;
  let stompThrough = 0;
  let bail = 0;
  const worst = [];
  for (const stage of STAGES.slice(0, 12)) {
    for (let s = 1; s <= 3; s++) {
      const run = new RunState({
        stage, team: ['lorenzo', 'mochi', 'grumpos'], save, seed: s * 7919,
        difficulty: 1, devInvuln: true, onEnd: () => {},
      });
      run.enter();
      const bot = new DemoBot(run);
      let cause = null;
      const origSpring = run.springLaunch.bind(run);
      run.springLaunch = (ob) => { cause = 'spring'; return origSpring(ob); };
      const origBail = run.bailLoop.bind(run);
      run.bailLoop = (...a) => { cause = 'bail'; return origBail(...a); };
      const origStomp = run.stompBreak.bind(run);
      // A relay tag-in passes {bounce:false} and must never be a launcher; only a
      // landing's call may be.
      run.stompBreak = (...a) => {
        cause = (a[0] && a[0].bounce === false) ? 'tag-in' : 'stompLanding';
        return origStomp(...a);
      };
      let t = 0;
      while (!run.finished && !run.dead && t < 60 * 200) {
        cause = null;
        jumpedThisFrame = false;
        // Stomping is an ability press already made; a rebound off whatever he
        // smashes on the way down is that move finishing, wherever it resolves.
        const wasStomping = run.player.stomping;
        const before = run.player.vy;
        bot.update(TICK);
        run.update(TICK);
        if (run.player.vy > 0 && run.player.vy > before + 0.01 && !jumpedThisFrame) {
          if (cause === 'spring') spring++;
          else if (cause === 'stompLanding') stompLanding++;
          else if (cause === 'bail') bail++;
          else if (wasStomping) stompThrough++;
          else {
            unexplained++;
            if (worst.length < 5) {
              worst.push(`${stage.id} seed=${s * 7919} x=${run.playerWorldX().toFixed(0)} `
                + `vy ${before.toFixed(0)}->${run.player.vy.toFixed(0)} cause=${cause || 'none'}`);
            }
          }
        }
        t++;
      }
      bot.releaseAll();
      Input.endFrame();
    }
  }
  assert(unexplained === 0,
    `every upward launch in the game is a sanctioned one (${unexplained} unexplained`
    + `${worst.length ? ': ' + worst.join(' | ') : ''})`);
  assert(spring > 0, `the spring pad is still a launcher, because it is meant to be (${spring})`);
  console.log(`     (sanctioned: ${spring} spring, ${stompLanding} stomp landings, `
    + `${stompThrough} stomp-throughs, ${bail} loop bails)`);
}

// ---- a portal tag-in clears the ground without throwing the hero off it ----------
// The bug in the second screenshot. A stomp hero arriving at a portal has the space
// around him cleared so he cannot materialise inside a barrel — and that used to
// call the LANDING stomp, rebound and all, so he appeared already 22px in the air
// with no button behind it.
//
// Driven through `doSwitch`, the real relay, and not through stompBreak itself.
// Testing the function instead of the call site is what let the first version of
// this suite pass with the bug restored: the whole defect is WHICH call the relay
// makes, so a test that makes the call for it can never see it.
{
  const { makeObstacle } = await import('../src/game/entities.js');
  const run = new RunState({
    stage: STAGES[0], team: ['mochi', 'lorenzo'], save, seed: 7919,
    difficulty: 1, devInvuln: true, onEnd: () => {},
  });
  run.enter();
  for (let i = 0; i < 60 * 10 && run.introRunning; i++) run.update(TICK);
  // A breakable right where he stands is the trigger: the rebound only ever fired
  // when the sweep actually found something to smash.
  // Which hero the relay hands you is the relay's business, so switch until it
  // produces a stomp hero and test THAT tag-in. The crate is laid fresh before
  // each switch, because the rebound only fires when the sweep finds something.
  let taggedStomp = false;
  for (let i = 0; i < 10 && !taggedStomp; i++) {
    const c = makeObstacle('crate', run.camX + PLAYER_X, {});
    run.obstacles.push(c);
    run.player.y = 0;
    run.player.vy = 0;
    run.player.grounded = true;
    run.doSwitch();
    if (!HERO_BY_ID[run.relay.current].stomp) continue;
    taggedStomp = true;
    assert(!c.live, 'the tag-in still clears the crate he would have arrived inside');
    assert(run.player.vy <= 0.01 && run.player.grounded,
      `and leaves him standing on the ground (vy ${run.player.vy.toFixed(0)}, was 200 before)`);
  }
  assert(taggedStomp, 'the relay tagged in a stomp hero, which is the case that bounced');

  // The same sweep as a LANDING keeps its rebound: that one is the move working.
  const crate2 = makeObstacle('crate', run.camX + PLAYER_X, {});
  run.obstacles.push(crate2);
  run.player.vy = 0;
  run.player.grounded = true;
  run.stompBreak();
  assert(!crate2.live && run.player.vy > 0,
    `a real stomp landing still bounces off what it broke (vy ${run.player.vy.toFixed(0)})`);
}

// ---- invulnerability makes the floor there, it does not launch him out of a hole --
// The bug in the first screenshot. A pit is fatal in real play; with devInvuln the
// hole simply does not open under him, so the crash sweep reaches the next hazard
// without anything throwing him at it.
const PIT_AT = 0.5;
const stageWithPit = () => ({
  id: 'unpressed-pit-test', cabinet: 'rhythm', index: 2,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 90, applianceAt: 0.2, applianceHigh: false,
  pits: [{ at: PIT_AT, w: 60 }],
});

function newPitRun(devInvuln) {
  const run = new RunState({
    stage: stageWithPit(), team: ['lorenzo'], save, seed: 4242,
    difficulty: 1, devInvuln, onEnd: () => {},
  });
  run.enter();
  return run;
}

// The opening run-in has to be spent first: until the hero reaches his mark the
// world is parked and `collide` never runs at all, so a hero teleported into a
// hole during it stands in mid-air unbothered and every assertion below would
// pass for the wrong reason.
function standInTheHole(run) {
  for (let i = 0; i < 60 * 10 && run.introRunning; i++) run.update(TICK);
  const plan = run.pitPlan[0];
  run.camX = plan.x - 700;
  run.spawnScriptedPits();
  const hole = run.obstacles.find((ob) => ob.live && ob.def.isGap && !ob.tunnel);
  run.camX = hole.x + hole.w / 2 - PLAYER_X;
  run.route = null;
  run.player.y = 0;
  run.player.vy = 0;
  run.player.grounded = true;
  return hole;
}

{
  const run = newPitRun(true);
  assert(typeof run.hopOutOfPit === 'undefined',
    'nothing on the run can launch a hero out of a hole any more');
}
{
  const run = newPitRun(false);
  const hole = standInTheHole(run);
  assert(!!hole, 'the stage cuts an ordinary hole in the lane');
  run.update(TICK);
  assert(run.dead && !!run.pitDeath, 'standing in it is a pit death, exactly as before');
}
{
  const run = newPitRun(true);
  const hole = standInTheHole(run);
  const startY = run.player.y;
  let maxVy = -Infinity;
  let leftTheGround = false;
  for (let i = 0; i < 40; i++) {
    run.update(TICK);
    maxVy = Math.max(maxVy, run.player.vy);
    if (!run.player.grounded) leftTheGround = true;
  }
  assert(!run.dead, 'invulnerable, the hole does not kill him');
  assert(maxVy <= 0.01,
    `and never throws him upward (peak vy ${maxVy.toFixed(1)}, was 260 before)`);
  assert(!leftTheGround, 'he keeps his feet for the whole width of it');
  assert(Math.abs(run.player.y - startY) < 0.001,
    'and his altitude is exactly what it was — the floor is simply there');
  assert(hole.live, 'the hole itself is untouched; it is the hero who is immune');
  const pits = run.devHits.filter((h) => h.type === 'pit');
  assert(pits.length === 1,
    `the sweep records the hazard once, not once a frame (${pits.length})`);
}

// ---- and walking off a ledge is a FALL, for every hero on every island ------------
// The claim the first two screenshots were really about. No input at all: step off
// the end and the only thing that may happen is gravity.
{
  let checked = 0;
  const bad = [];
  const { HEROES } = await import('../src/data/heroes.js');
  for (const stage of STAGES.slice(0, 6)) {
    for (const hero of Object.values(HEROES)) {
      const run = new RunState({
        stage, team: [hero.id], save, seed: 7919, difficulty: 1, onEnd: () => {},
      });
      run.enter();
      for (const isl of run.routes.filter((r) => r.kind === 'island')) {
        run.route = isl;
        run.camX = isl.x + isl.w - 12 - PLAYER_X;
        run.distance = run.camX;
        run.player.y = 0;
        run.player.vy = 0;
        run.player.grounded = true;
        run.player.jumps = 0;
        checked++;
        let left = false;
        let maxVy = -Infinity;
        for (let i = 0; i < 60 && !run.dead; i++) {
          const wasIsland = run.route === isl;
          run.update(TICK);
          if (wasIsland && run.route !== isl) left = true;
          if (left) maxVy = Math.max(maxVy, run.player.vy);
        }
        if (left && maxVy > 0.01) bad.push(`${stage.id}/${hero.id}@${isl.x.toFixed(0)} rose ${maxVy.toFixed(0)}`);
      }
    }
  }
  assert(checked > 100, `enough island ends to mean something (${checked})`);
  assert(bad.length === 0,
    `walking off an island is a fall, every time (${bad.slice(0, 3).join(', ') || 'no exceptions'})`);
}

dom.reset?.();
console.log(failed ? 'UNPRESSED LAUNCHES: FAILED' : 'UNPRESSED LAUNCHES: PASSED');
process.exit(failed ? 1 : 0);
