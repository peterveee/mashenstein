// Mid-air slide-kick contracts: the Down edge commits a real jump to a fast
// descent, then hands the ordinary grounded slide/kick collision path back.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { Player, PLAYER_H, SLIDE_SLAM_VY, SLIDE_KICK_T } = await import('../src/game/player.js');
const { poseFromPlayer } = await import('../src/sprites/toons.js');
const { RunState } = await import('../src/game/run.js');
const { makeObstacle } = await import('../src/game/entities.js');
const { save } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const idle = { held: () => false };
const p = new Player('lorenzo');
p.jumpPressed();
p.y = 35; p.vy = 120; p.jumps = 1;
assert(p.slidePressed(), 'a real airborne jump accepts the slide-kick edge');
assert(p.slideSlamming && p.vy === SLIDE_SLAM_VY, 'the edge commits an immediate downward slam');
assert(p.hitH === PLAYER_H, 'the aerial pose keeps the standing collision height');
const airPose = poseFromPlayer(p, 0);
assert(airPose.airSlideKick && airPose.kind === 'duck' && !airPose.grounded,
  'the aerial slide-kick has its own visual pose without becoming a stomp');

let landing = null;
for (let i = 0; i < 120 && !landing; i++) {
  const result = p.update(1 / 60, idle, { speed: 160 });
  if (result.landed) landing = result;
}
assert(landing?.landed && landing.slideKickLand && !landing.stompLand,
  'the slam reports a slide-kick landing, not a stomp landing');
assert(p.grounded && p.ducking && p.duckAmount === 1 && p.slideKickT === SLIDE_KICK_T,
  'landing starts a full grounded kick even after Down is released');

const held = new Player('gnash');
held.jumpPressed(); held.y = 28; held.vy = -80; held.jumps = 1;
assert(held.slidePressed(), 'a second hero can commit the same universal move');
let heldLanding = null;
for (let i = 0; i < 120 && !heldLanding; i++) {
  const result = held.update(1 / 60, { held: action => action === 'duck' }, { speed: 160 });
  if (result.landed) heldLanding = result;
}
held.update(1 / 60, { held: action => action === 'duck' }, { speed: 160 });
assert(heldLanding?.slideKickLand && held.ducking && held.duckHoldT > 0,
  'holding Down continues the landing kick as a normal fresh slide');

const spring = new Player('lorenzo');
spring.launch(300);
assert(!spring.slidePressed() && !spring.slideSlamming,
  'a spring-only launch does not accept the slide-kick edge');
const ledge = new Player('lorenzo');
ledge.grounded = false; ledge.jumps = 0; ledge.y = 12; ledge.vy = -30;
assert(!ledge.slidePressed() && !ledge.slideSlamming,
  'an ordinary ledge fall does not accept the slide-kick edge');
ledge.jumpPressed();
assert(ledge.slidePressed() && ledge.slideSlamming,
  'an actual air-jump taken after a ledge fall does accept it');

save.load();
save.newSlot(0, 0);
const stage = {
  id: 'mid-air-slide-kick', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 99, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5,
};
const run = new RunState({ stage, save, seed: 77, difficulty: 1, skipRunIn: true, onEnd: () => {} });
run.enter();
run.player.grounded = false;
run.player.jumps = 1;
run.player.y = 3;
run.player.vy = -100;
assert(run.player.slidePressed(), 'the run uses the shared Player slide entry point');
const crate = makeObstacle('crate', run.playerWorldX());
run.obstacles = [crate];
let stompBreaks = 0;
run.stompBreak = () => { stompBreaks++; };
const result = run.player.update(1 / 60, idle, { speed: run.speed });
assert(result.landed && result.slideKickLand, 'run physics reaches the landing-kick state');
run.collide();
assert(!crate.live && stompBreaks === 0, 'landing kick breaks a crate without invoking stompBreak');

run.player.grounded = false; run.player.jumps = 1; run.player.y = 18; run.player.vy = -60;
run.player.slidePressed();
const checkpoint = run.makeSnapshot();
const rewindRecord = {};
run.writeRewindSnapshot(rewindRecord);
assert(checkpoint.playerMotion.slideSlamming && rewindRecord.player.slideSlamming,
  'checkpoint and rewind records carry the aerial slide state');
run.player.slideSlamming = false; run.player.landingSlideT = 0;
run.restoreSnapshot(checkpoint);
assert(run.player.slideSlamming && run.player.y === checkpoint.playerMotion.y,
  'checkpoint restore returns the player to the recorded slam');
run.exit();

console.log(failed ? 'MID-AIR SLIDE KICK: FAILED' : 'MID-AIR SLIDE KICK: PASSED');
process.exit(failed ? 1 : 0);
